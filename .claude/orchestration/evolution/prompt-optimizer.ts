/**
 * Prompt Optimizer
 *
 * Implements A/B testing and evolution of agent prompts using the UCB1 (Upper Confidence Bound)
 * multi-armed bandit algorithm for variant selection.
 */

import { Database } from 'better-sqlite3';
import {
  PromptVariant,
  PromptVersion,
  UCB1State,
  PromptMutation,
} from './types';

export class PromptOptimizer {
  private db: Database;
  private config: {
    explorationParameter: number; // c in UCB1 formula
    minTrialsBeforePromotion: number;
    confidenceLevel: number;
  };

  constructor(
    db: Database,
    config = {
      explorationParameter: 2.0,
      minTrialsBeforePromotion: 20,
      confidenceLevel: 0.95,
    }
  ) {
    this.db = db;
    this.config = config;
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_prompt_variants (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        trial_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        avg_duration REAL DEFAULT 0,
        avg_tokens REAL DEFAULT 0,
        ucb1_score REAL,
        exploration_bonus REAL,
        parent_variant_id TEXT,
        mutation_type TEXT,
        mutation_reason TEXT,
        status TEXT DEFAULT 'testing', -- testing, active, archived
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_variants_agent
        ON evolution_prompt_variants(agent_id, status);
      CREATE INDEX IF NOT EXISTS idx_variants_ucb1
        ON evolution_prompt_variants(ucb1_score DESC);

      CREATE TABLE IF NOT EXISTS evolution_prompt_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deactivated_at TIMESTAMP,
        total_tasks INTEGER DEFAULT 0,
        success_rate REAL,
        avg_duration REAL,
        token_efficiency REAL,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (variant_id) REFERENCES evolution_prompt_variants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_history_agent
        ON evolution_prompt_history(agent_id, activated_at DESC);
    `);
  }

  /**
   * Register a new prompt variant for testing
   */
  registerVariant(variant: Omit<PromptVariant, 'ucb1Score' | 'explorationBonus'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_prompt_variants (
        id, agent_id, version, prompt, system_prompt,
        trial_count, success_count, success_rate,
        avg_duration, avg_tokens, parent_variant_id,
        mutation_type, mutation_reason, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      variant.id,
      variant.agentId,
      variant.version,
      variant.prompt,
      variant.systemPrompt || null,
      variant.trialCount,
      variant.successCount,
      variant.successRate,
      variant.avgDuration,
      variant.avgTokens,
      variant.parentVariantId || null,
      variant.mutationType || null,
      variant.mutationReason || null,
      variant.createdAt.toISOString(),
      'testing'
    );
  }

  /**
   * Select best variant using UCB1 algorithm
   *
   * UCB1 formula: avg_reward + c * sqrt(ln(total_trials) / variant_trials)
   * This balances exploitation (choosing best performer) with exploration (trying untested variants)
   */
  selectVariant(agentId: string): PromptVariant | null {
    // Get all active variants for this agent
    const variants = this.db
      .prepare(
        `
      SELECT * FROM evolution_prompt_variants
      WHERE agent_id = ? AND status IN ('testing', 'active')
      ORDER BY version DESC
    `
      )
      .all(agentId) as any[];

    if (variants.length === 0) return null;

    // Calculate total trials across all variants
    const totalTrials = variants.reduce(
      (sum, v) => sum + (v.trial_count || 0),
      0
    );

    // If any variant has zero trials, select it (forced exploration)
    const untriedVariant = variants.find((v) => v.trial_count === 0);
    if (untriedVariant) {
      return this.mapToPromptVariant(untriedVariant);
    }

    // Calculate UCB1 scores
    const c = this.config.explorationParameter;
    const variantsWithScores = variants.map((v) => {
      const avgReward = v.success_rate || 0;
      const explorationBonus =
        c * Math.sqrt(Math.log(totalTrials) / (v.trial_count || 1));
      const ucb1Score = avgReward + explorationBonus;

      return {
        ...v,
        ucb1Score,
        explorationBonus,
      };
    });

    // Select variant with highest UCB1 score
    const selected = variantsWithScores.reduce((best, current) =>
      current.ucb1Score > best.ucb1Score ? current : best
    );

    // Update UCB1 scores in database
    this.db
      .prepare(
        `
      UPDATE evolution_prompt_variants
      SET ucb1_score = ?, exploration_bonus = ?
      WHERE id = ?
    `
      )
      .run(selected.ucb1Score, selected.explorationBonus, selected.id);

    return this.mapToPromptVariant(selected);
  }

  /**
   * Update variant performance after task completion
   */
  updatePerformance(
    variantId: string,
    success: boolean,
    duration: number,
    tokens: number
  ): void {
    const variant = this.db
      .prepare('SELECT * FROM evolution_prompt_variants WHERE id = ?')
      .get(variantId) as any;

    if (!variant) return;

    const newTrialCount = variant.trial_count + 1;
    const newSuccessCount = variant.success_count + (success ? 1 : 0);
    const newSuccessRate = newSuccessCount / newTrialCount;

    // Incremental average updates
    const newAvgDuration =
      (variant.avg_duration * variant.trial_count + duration) / newTrialCount;
    const newAvgTokens =
      (variant.avg_tokens * variant.trial_count + tokens) / newTrialCount;

    this.db
      .prepare(
        `
      UPDATE evolution_prompt_variants
      SET trial_count = ?,
          success_count = ?,
          success_rate = ?,
          avg_duration = ?,
          avg_tokens = ?
      WHERE id = ?
    `
      )
      .run(
        newTrialCount,
        newSuccessCount,
        newSuccessRate,
        newAvgDuration,
        newAvgTokens,
        variantId
      );

    // Check if variant is ready for promotion
    if (
      newTrialCount >= this.config.minTrialsBeforePromotion &&
      this.shouldPromoteVariant(variantId)
    ) {
      this.promoteVariant(variantId);
    }
  }

  /**
   * Determine if variant should be promoted to active
   */
  private shouldPromoteVariant(variantId: string): boolean {
    const variant = this.db
      .prepare('SELECT * FROM evolution_prompt_variants WHERE id = ?')
      .get(variantId) as any;

    if (!variant) return false;

    // Get current active variant for comparison
    const activeVariant = this.db
      .prepare(
        `
      SELECT * FROM evolution_prompt_variants
      WHERE agent_id = ? AND status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `
      )
      .get(variant.agent_id) as any;

    if (!activeVariant) return true; // No active variant, promote this one

    // Perform statistical comparison (simplified t-test approach)
    // In production, use proper statistical testing library
    const improvement = variant.success_rate - activeVariant.success_rate;
    const minImprovement = 0.05; // 5% improvement threshold

    return improvement > minImprovement;
  }

  /**
   * Promote variant to active status
   */
  private promoteVariant(variantId: string): void {
    const variant = this.db
      .prepare('SELECT * FROM evolution_prompt_variants WHERE id = ?')
      .get(variantId) as any;

    if (!variant) return;

    // Deactivate current active variant
    const activeVariant = this.db
      .prepare(
        `
      SELECT * FROM evolution_prompt_variants
      WHERE agent_id = ? AND status = 'active'
    `
      )
      .get(variant.agent_id) as any;

    if (activeVariant) {
      // Archive old variant
      this.db
        .prepare(
          `
        UPDATE evolution_prompt_variants
        SET status = 'archived'
        WHERE id = ?
      `
        )
        .run(activeVariant.id);

      // Record in history
      this.db
        .prepare(
          `
        UPDATE evolution_prompt_history
        SET deactivated_at = CURRENT_TIMESTAMP
        WHERE variant_id = ? AND deactivated_at IS NULL
      `
        )
        .run(activeVariant.id);
    }

    // Activate new variant
    this.db
      .prepare(
        `
      UPDATE evolution_prompt_variants
      SET status = 'active'
      WHERE id = ?
    `
      )
      .run(variantId);

    // Add to history
    this.db
      .prepare(
        `
      INSERT INTO evolution_prompt_history (
        agent_id, variant_id, version, total_tasks,
        success_rate, avg_duration, token_efficiency
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        variant.agent_id,
        variant.id,
        variant.version,
        variant.trial_count,
        variant.success_rate,
        variant.avg_duration,
        variant.success_count / (variant.avg_tokens || 1)
      );
  }

  /**
   * Auto-evolve prompt based on performance data
   */
  evolvePrompt(agentId: string): PromptVariant | null {
    const currentVariant = this.db
      .prepare(
        `
      SELECT * FROM evolution_prompt_variants
      WHERE agent_id = ? AND status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `
      )
      .get(agentId) as any;

    if (!currentVariant) return null;

    // Analyze failure patterns from performance data
    const mutations = this.suggestMutations(agentId);

    if (mutations.length === 0) return null;

    // Select best mutation
    const mutation = mutations[0];

    // Generate new variant
    const newPrompt = this.applyMutation(
      currentVariant.prompt,
      currentVariant.system_prompt,
      mutation
    );

    const newVariant: Omit<PromptVariant, 'ucb1Score' | 'explorationBonus'> = {
      id: `${agentId}-v${currentVariant.version + 1}`,
      agentId,
      version: currentVariant.version + 1,
      prompt: newPrompt.prompt,
      systemPrompt: newPrompt.systemPrompt,
      createdAt: new Date(),
      trialCount: 0,
      successCount: 0,
      successRate: 0,
      avgDuration: 0,
      avgTokens: 0,
      parentVariantId: currentVariant.id,
      mutationType: 'automated',
      mutationReason: mutation.description,
    };

    this.registerVariant(newVariant);

    return { ...newVariant, ucb1Score: 0, explorationBonus: 0 };
  }

  /**
   * Suggest mutations based on performance analysis
   */
  private suggestMutations(agentId: string): PromptMutation[] {
    // Analyze recent failures
    const failures = this.db
      .prepare(
        `
      SELECT error_type, COUNT(*) as count
      FROM evolution_task_failures
      WHERE agent_id = ?
        AND timestamp >= datetime('now', '-7 days')
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 5
    `
      )
      .all(agentId) as Array<{ error_type: string; count: number }>;

    const mutations: PromptMutation[] = [];

    // Generate mutations based on failure patterns
    for (const failure of failures) {
      if (failure.error_type.includes('timeout')) {
        mutations.push({
          type: 'add_constraint',
          target: 'system',
          description: 'Add time management and efficiency constraints',
          confidence: 0.7,
        });
      } else if (failure.error_type.includes('validation')) {
        mutations.push({
          type: 'clarify',
          target: 'user',
          description: 'Clarify output format requirements',
          confidence: 0.8,
        });
      } else if (failure.error_type.includes('capability')) {
        mutations.push({
          type: 'expand',
          target: 'both',
          description: 'Expand capability awareness and tool usage',
          confidence: 0.6,
        });
      }
    }

    return mutations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Apply mutation to prompt
   */
  private applyMutation(
    prompt: string,
    systemPrompt: string | null,
    mutation: PromptMutation
  ): { prompt: string; systemPrompt?: string } {
    // This is a simplified implementation
    // In production, use LLM-based prompt generation

    const result = {
      prompt,
      systemPrompt: systemPrompt || undefined,
    };

    switch (mutation.type) {
      case 'add_constraint':
        if (mutation.target === 'system' || mutation.target === 'both') {
          result.systemPrompt =
            (result.systemPrompt || '') +
            '\n\nConstraints: Be concise and efficient. Complete tasks quickly while maintaining quality.';
        }
        break;

      case 'clarify':
        if (mutation.target === 'user' || mutation.target === 'both') {
          result.prompt =
            prompt +
            '\n\nPlease ensure your output follows the specified format exactly.';
        }
        break;

      case 'expand':
        result.systemPrompt =
          (result.systemPrompt || '') +
          '\n\nYou have access to various tools and capabilities. Use them proactively to solve tasks.';
        break;
    }

    return result;
  }

  /**
   * Get prompt version history
   */
  getPromptHistory(agentId: string): PromptVersion[] {
    const history = this.db
      .prepare(
        `
      SELECT
        h.*,
        v.*
      FROM evolution_prompt_history h
      JOIN evolution_prompt_variants v ON h.variant_id = v.id
      WHERE h.agent_id = ?
      ORDER BY h.activated_at DESC
    `
      )
      .all(agentId) as any[];

    return history.map((row) => ({
      version: row.version,
      variant: this.mapToPromptVariant(row),
      activatedAt: new Date(row.activated_at),
      deactivatedAt: row.deactivated_at
        ? new Date(row.deactivated_at)
        : undefined,
      performanceSummary: {
        totalTasks: row.total_tasks,
        successRate: row.success_rate,
        avgDuration: row.avg_duration,
        tokenEfficiency: row.token_efficiency,
      },
    }));
  }

  /**
   * Map database row to PromptVariant
   */
  private mapToPromptVariant(row: any): PromptVariant {
    return {
      id: row.id,
      agentId: row.agent_id,
      version: row.version,
      prompt: row.prompt,
      systemPrompt: row.system_prompt,
      createdAt: new Date(row.created_at),
      trialCount: row.trial_count,
      successCount: row.success_count,
      successRate: row.success_rate,
      avgDuration: row.avg_duration,
      avgTokens: row.avg_tokens,
      ucb1Score: row.ucb1_score,
      explorationBonus: row.exploration_bonus,
      parentVariantId: row.parent_variant_id,
      mutationType: row.mutation_type,
      mutationReason: row.mutation_reason,
    };
  }
}
