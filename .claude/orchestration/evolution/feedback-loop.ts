/**
 * Feedback Loop
 *
 * Collects implicit and explicit feedback signals, applies exponential decay
 * weighting to recent feedback, generates evolution reports, and triggers
 * prompt updates when thresholds are reached.
 */

import { Database } from 'better-sqlite3';
import {
  EvolutionReport,
  DateRange,
  EvolutionConfig,
  EvolutionState,
} from './types';
import { PerformanceTracker } from './performance-tracker';
import { PromptOptimizer } from './prompt-optimizer';
import { CapabilityExpander } from './capability-expander';

interface PromptUpdate {
  agentId: string;
  currentVersion: number;
  reason: string;
  threshold: string;
  recommendedAction: 'evolve' | 'rollback' | 'ab_test';
}

export class FeedbackLoop {
  private db: Database;
  private config: EvolutionConfig;
  private performanceTracker: PerformanceTracker;
  private promptOptimizer: PromptOptimizer;
  private capabilityExpander: CapabilityExpander;

  constructor(
    db: Database,
    config?: Partial<EvolutionConfig>
  ) {
    this.db = db;
    this.config = {
      trackingEnabled: true,
      metricsRetentionDays: 90,
      abTestingEnabled: true,
      minTrialsBeforePromotion: 20,
      confidenceLevel: 0.95,
      explorationParameter: 2.0,
      autoEvolutionEnabled: true,
      evolutionThreshold: {
        minSuccessRateDrop: 10, // 10% drop
        minTaskCount: 10,
      },
      implicitFeedbackWeight: 0.3,
      feedbackDecayHalfLife: 7, // days
      reportFrequency: 'weekly',
      reportRetentionCount: 12,
      ...config,
    };

    this.performanceTracker = new PerformanceTracker(db, {
      retentionDays: this.config.metricsRetentionDays,
      feedbackDecayHalfLife: this.config.feedbackDecayHalfLife,
    });

    this.promptOptimizer = new PromptOptimizer(db, {
      explorationParameter: this.config.explorationParameter,
      minTrialsBeforePromotion: this.config.minTrialsBeforePromotion,
      confidenceLevel: this.config.confidenceLevel,
    });

    this.capabilityExpander = new CapabilityExpander(db);

    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_implicit_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL, -- retry, edit, abandon
        edit_type TEXT, -- minor, major, complete_rewrite
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_implicit_feedback_agent
        ON evolution_implicit_feedback(agent_id, timestamp DESC);

      CREATE TABLE IF NOT EXISTS evolution_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        report_data TEXT NOT NULL, -- JSON
        summary TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_reports_date
        ON evolution_reports(generated_at DESC);

      CREATE TABLE IF NOT EXISTS evolution_state (
        agent_id TEXT PRIMARY KEY,
        current_variant_id TEXT,
        total_trials INTEGER DEFAULT 0,
        last_evolution_at TIMESTAMP,
        performance_trend TEXT, -- improving, stable, declining
        next_review_at TIMESTAMP,
        auto_evolution_paused INTEGER DEFAULT 0,
        pause_reason TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
    `);
  }

  /**
   * Track retry attempt (implicit negative feedback)
   */
  trackRetry(taskId: string, agentId: string): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_implicit_feedback (
        task_id, agent_id, feedback_type
      ) VALUES (?, ?, 'retry')
    `
      )
      .run(taskId, agentId);

    // Record as negative feedback
    this.performanceTracker.recordFeedback({
      taskId,
      agentId,
      rating: 2, // Low rating for retry
      feedbackType: 'implicit',
      retry: true,
      timestamp: new Date(),
    });
  }

  /**
   * Track edit to agent output (implicit negative feedback)
   */
  trackEdit(
    taskId: string,
    agentId: string,
    editType: 'minor' | 'major' | 'complete_rewrite'
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_implicit_feedback (
        task_id, agent_id, feedback_type, edit_type
      ) VALUES (?, ?, 'edit', ?)
    `
      )
      .run(taskId, agentId, editType);

    // Convert edit type to rating
    const ratingMap = {
      minor: 3,
      major: 2,
      complete_rewrite: 1,
    };

    this.performanceTracker.recordFeedback({
      taskId,
      agentId,
      rating: ratingMap[editType],
      feedbackType: 'implicit',
      edit: true,
      editType,
      timestamp: new Date(),
    });
  }

  /**
   * Track task abandonment (implicit negative feedback)
   */
  trackAbandon(taskId: string, agentId: string): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_implicit_feedback (
        task_id, agent_id, feedback_type
      ) VALUES (?, ?, 'abandon')
    `
      )
      .run(taskId, agentId);

    this.performanceTracker.recordFeedback({
      taskId,
      agentId,
      rating: 1, // Lowest rating for abandon
      feedbackType: 'implicit',
      abandoned: true,
      timestamp: new Date(),
    });
  }

  /**
   * Get weighted score combining explicit and implicit feedback
   */
  getWeightedScore(agentId: string): number {
    const explicitRating = this.performanceTracker.getWeightedRating(agentId);
    const implicitScore = this.calculateImplicitScore(agentId);

    const explicitWeight = 1 - this.config.implicitFeedbackWeight;
    const implicitWeight = this.config.implicitFeedbackWeight;

    return (
      explicitRating * explicitWeight + implicitScore * implicitWeight
    );
  }

  /**
   * Calculate implicit feedback score
   */
  private calculateImplicitScore(agentId: string): number {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.feedbackDecayHalfLife * 24 * 60 * 60 * 1000
    );

    const feedback = this.db
      .prepare(
        `
      SELECT feedback_type, edit_type, timestamp
      FROM evolution_implicit_feedback
      WHERE agent_id = ?
        AND timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 100
    `
      )
      .all(agentId, windowStart.toISOString()) as Array<{
      feedback_type: string;
      edit_type: string | null;
      timestamp: string;
    }>;

    if (feedback.length === 0) return 5; // Neutral score

    const halfLife =
      this.config.feedbackDecayHalfLife * 24 * 60 * 60 * 1000;
    let totalWeight = 0;
    let weightedSum = 0;

    for (const item of feedback) {
      const age = now.getTime() - new Date(item.timestamp).getTime();
      const weight = Math.exp((-age * Math.LN2) / halfLife);

      let score = 5; // Neutral
      if (item.feedback_type === 'retry') score = 2;
      else if (item.feedback_type === 'abandon') score = 1;
      else if (item.feedback_type === 'edit') {
        const editScores = {
          minor: 3,
          major: 2,
          complete_rewrite: 1,
        };
        score = editScores[item.edit_type as keyof typeof editScores] || 3;
      }

      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 5;
  }

  /**
   * Generate evolution report
   */
  generateReport(period?: DateRange): EvolutionReport {
    const now = new Date();
    const reportPeriod = period || {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: now,
    };

    // Get all agents
    const agents = this.db
      .prepare('SELECT id, name FROM agents')
      .all() as Array<{ id: string; name: string }>;

    // Generate summary
    const summary = this.generateSummary(reportPeriod);

    // Analyze agent performance
    const agentPerformance = agents.map((agent) => {
      const current = this.performanceTracker.getPerformanceSummary(
        agent.id,
        reportPeriod
      );
      const previous = this.performanceTracker.getPerformanceSummary(agent.id, {
        start: new Date(
          reportPeriod.start.getTime() - 7 * 24 * 60 * 60 * 1000
        ),
        end: reportPeriod.start,
      });

      return {
        agentId: agent.id,
        successRate: current.successRate,
        successRateChange: current.successRate - previous.successRate,
        taskCount: current.taskCount,
        avgDuration: current.avgDuration,
        tokenEfficiency: current.tokenEfficiency,
        userRating: current.weightedRating,
      };
    });

    // Get capability gaps and suggestions
    const failures = this.performanceTracker.getFailures(
      undefined,
      reportPeriod
    );
    const gaps = this.capabilityExpander.identifyGaps(failures);
    const suggestions = this.capabilityExpander.suggestSkills(gaps);

    // Get prompt updates
    const promptUpdates = this.getPromptUpdates(reportPeriod);

    // Compile improvements
    const improvements = this.compileImprovements(
      promptUpdates,
      suggestions
    );

    const report: EvolutionReport = {
      generatedAt: now,
      period: reportPeriod,
      summary,
      agentPerformance,
      improvements,
      gaps,
      suggestions,
      promptUpdates,
    };

    // Store report
    this.storeReport(report);

    return report;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(period: DateRange) {
    const stats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total_tasks,
        AVG(CAST(success AS REAL)) as success_rate,
        AVG(duration_ms) as avg_duration,
        SUM(token_count) as total_tokens
      FROM evolution_performance_metrics
      WHERE timestamp >= ? AND timestamp <= ?
    `
      )
      .get(period.start.toISOString(), period.end.toISOString()) as {
      total_tasks: number;
      success_rate: number;
      avg_duration: number;
      total_tokens: number;
    };

    return {
      totalTasks: stats.total_tasks || 0,
      overallSuccessRate: stats.success_rate || 0,
      avgDuration: stats.avg_duration || 0,
      totalTokens: stats.total_tokens || 0,
    };
  }

  /**
   * Get prompt updates in period
   */
  private getPromptUpdates(period: DateRange) {
    const updates = this.db
      .prepare(
        `
      SELECT
        h1.agent_id,
        h1.version as new_version,
        h2.version as old_version,
        v1.success_rate as new_success_rate,
        v2.success_rate as old_success_rate,
        v1.mutation_reason as reason
      FROM evolution_prompt_history h1
      LEFT JOIN evolution_prompt_history h2
        ON h1.agent_id = h2.agent_id
        AND h2.deactivated_at = h1.activated_at
      JOIN evolution_prompt_variants v1 ON h1.variant_id = v1.id
      LEFT JOIN evolution_prompt_variants v2 ON h2.variant_id = v2.id
      WHERE h1.activated_at >= ? AND h1.activated_at <= ?
    `
      )
      .all(period.start.toISOString(), period.end.toISOString()) as any[];

    return updates.map((u) => ({
      agentId: u.agent_id,
      oldVersion: u.old_version || 0,
      newVersion: u.new_version,
      reason: u.reason || 'Manual update',
      performanceImprovement:
        ((u.new_success_rate - (u.old_success_rate || 0)) / (u.old_success_rate || 1)) * 100,
    }));
  }

  /**
   * Compile improvements list
   */
  private compileImprovements(promptUpdates: any[], suggestions: any[]) {
    const improvements: any[] = [];

    // Add prompt updates
    for (const update of promptUpdates) {
      improvements.push({
        type: 'prompt_update',
        agentId: update.agentId,
        description: `Prompt updated to v${update.newVersion}`,
        expectedImpact: `${update.performanceImprovement.toFixed(1)}% improvement`,
        status: 'deployed',
      });
    }

    // Add skill suggestions
    for (const suggestion of suggestions) {
      improvements.push({
        type: 'new_skill',
        agentId: 'N/A',
        description: suggestion.description,
        expectedImpact: `${suggestion.estimatedImpact.estimatedSuccessRateImprovement}% improvement`,
        status: 'proposed',
      });
    }

    return improvements;
  }

  /**
   * Store report in database
   */
  private storeReport(report: EvolutionReport): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_reports (
        period_start, period_end, report_data, summary
      ) VALUES (?, ?, ?, ?)
    `
      )
      .run(
        report.period.start.toISOString(),
        report.period.end.toISOString(),
        JSON.stringify(report),
        JSON.stringify(report.summary)
      );

    // Clean up old reports
    this.db
      .prepare(
        `
      DELETE FROM evolution_reports
      WHERE id NOT IN (
        SELECT id FROM evolution_reports
        ORDER BY generated_at DESC
        LIMIT ?
      )
    `
      )
      .run(this.config.reportRetentionCount);
  }

  /**
   * Check thresholds and return prompt update recommendations
   */
  checkThresholds(): PromptUpdate[] {
    if (!this.config.autoEvolutionEnabled) return [];

    const updates: PromptUpdate[] = [];
    const agents = this.db
      .prepare('SELECT id FROM agents')
      .all() as Array<{ id: string }>;

    for (const agent of agents) {
      const state = this.getEvolutionState(agent.id);

      // Skip if auto-evolution is paused for this agent
      if (state.autoEvolutionPaused) continue;

      // Check if enough tasks have been completed
      const taskCount = this.performanceTracker.getTaskCount(agent.id);
      if (taskCount < this.config.evolutionThreshold.minTaskCount) continue;

      // Check performance trend
      const trend = this.performanceTracker.getPerformanceTrend(agent.id);

      if (trend === 'declining') {
        const currentRate = this.performanceTracker.getSuccessRate(agent.id);
        const previousRate = this.performanceTracker.getSuccessRate(agent.id, {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });

        const drop = ((previousRate - currentRate) / previousRate) * 100;

        if (drop >= this.config.evolutionThreshold.minSuccessRateDrop) {
          updates.push({
            agentId: agent.id,
            currentVersion: state.currentVariantId ? parseInt(state.currentVariantId.split('-v')[1]) : 0,
            reason: `Success rate dropped by ${drop.toFixed(1)}%`,
            threshold: 'success_rate_drop',
            recommendedAction: 'evolve',
          });
        }
      }
    }

    return updates;
  }

  /**
   * Get evolution state for agent
   */
  private getEvolutionState(agentId: string): EvolutionState {
    const row = this.db
      .prepare('SELECT * FROM evolution_state WHERE agent_id = ?')
      .get(agentId) as any;

    if (!row) {
      // Initialize state
      const newState: EvolutionState = {
        agentId,
        currentVariantId: `${agentId}-v1`,
        activeVariants: [],
        totalTrials: 0,
        lastEvolutionAt: new Date(),
        performanceTrend: 'stable',
        nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autoEvolutionPaused: false,
      };

      this.db
        .prepare(
          `
        INSERT INTO evolution_state (
          agent_id, current_variant_id, total_trials,
          last_evolution_at, performance_trend, next_review_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          newState.agentId,
          newState.currentVariantId,
          newState.totalTrials,
          newState.lastEvolutionAt.toISOString(),
          newState.performanceTrend,
          newState.nextReviewAt.toISOString()
        );

      return newState;
    }

    return {
      agentId: row.agent_id,
      currentVariantId: row.current_variant_id,
      activeVariants: [],
      totalTrials: row.total_trials,
      lastEvolutionAt: new Date(row.last_evolution_at),
      performanceTrend: row.performance_trend,
      nextReviewAt: new Date(row.next_review_at),
      autoEvolutionPaused: row.auto_evolution_paused === 1,
      pauseReason: row.pause_reason,
    };
  }

  /**
   * Update evolution state
   */
  updateEvolutionState(agentId: string, updates: Partial<EvolutionState>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.currentVariantId !== undefined) {
      fields.push('current_variant_id = ?');
      values.push(updates.currentVariantId);
    }
    if (updates.totalTrials !== undefined) {
      fields.push('total_trials = ?');
      values.push(updates.totalTrials);
    }
    if (updates.lastEvolutionAt !== undefined) {
      fields.push('last_evolution_at = ?');
      values.push(updates.lastEvolutionAt.toISOString());
    }
    if (updates.performanceTrend !== undefined) {
      fields.push('performance_trend = ?');
      values.push(updates.performanceTrend);
    }
    if (updates.nextReviewAt !== undefined) {
      fields.push('next_review_at = ?');
      values.push(updates.nextReviewAt.toISOString());
    }
    if (updates.autoEvolutionPaused !== undefined) {
      fields.push('auto_evolution_paused = ?');
      values.push(updates.autoEvolutionPaused ? 1 : 0);
    }
    if (updates.pauseReason !== undefined) {
      fields.push('pause_reason = ?');
      values.push(updates.pauseReason);
    }

    if (fields.length === 0) return;

    values.push(agentId);

    this.db
      .prepare(
        `
      UPDATE evolution_state
      SET ${fields.join(', ')}
      WHERE agent_id = ?
    `
      )
      .run(...values);
  }
}
