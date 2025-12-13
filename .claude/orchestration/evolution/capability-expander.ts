/**
 * Capability Expander
 *
 * Identifies capability gaps from task failures and suggests improvements:
 * - New skills to add
 * - New tools to integrate
 * - Agent variants for specializations
 * - Agent compositions for complex tasks
 */

import { Database } from 'better-sqlite3';
import {
  CapabilityGap,
  SkillSuggestion,
  AgentVariant,
  AgentComposition,
  TaskFailure,
} from './types';

export class CapabilityExpander {
  private db: Database;
  private config: {
    minFailuresForGap: number;
    gapAnalysisWindowDays: number;
  };

  constructor(
    db: Database,
    config = {
      minFailuresForGap: 3,
      gapAnalysisWindowDays: 14,
    }
  ) {
    this.db = db;
    this.config = config;
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_capability_gaps (
        id TEXT PRIMARY KEY,
        identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        failure_count INTEGER DEFAULT 0,
        affected_tasks TEXT, -- JSON array
        error_patterns TEXT, -- JSON array
        severity TEXT NOT NULL,
        frequency REAL,
        status TEXT DEFAULT 'open', -- open, addressing, resolved
        resolution_date TIMESTAMP,
        resolution_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_gaps_category
        ON evolution_capability_gaps(category, status);
      CREATE INDEX IF NOT EXISTS idx_gaps_severity
        ON evolution_capability_gaps(severity, identified_at DESC);

      CREATE TABLE IF NOT EXISTS evolution_skill_suggestions (
        id TEXT PRIMARY KEY,
        skill_name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        addresses_gaps TEXT, -- JSON array of gap IDs
        estimated_impact TEXT, -- JSON object
        implementation_complexity TEXT NOT NULL,
        required_tools TEXT, -- JSON array
        required_training TEXT, -- JSON array
        status TEXT DEFAULT 'proposed', -- proposed, approved, implemented, rejected
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_skills_status
        ON evolution_skill_suggestions(status);

      CREATE TABLE IF NOT EXISTS evolution_agent_variants (
        id TEXT PRIMARY KEY,
        base_agent_id TEXT NOT NULL,
        name TEXT NOT NULL,
        specialization TEXT NOT NULL,
        prompt TEXT NOT NULL,
        system_prompt TEXT,
        model TEXT DEFAULT 'sonnet',
        temperature REAL,
        tools TEXT, -- JSON array
        skills TEXT, -- JSON array
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        trial_count INTEGER DEFAULT 0,
        success_rate REAL,
        avg_duration REAL,
        token_efficiency REAL,
        parent_variant_id TEXT,
        creation_reason TEXT,
        status TEXT DEFAULT 'testing', -- testing, active, archived
        FOREIGN KEY (base_agent_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_variants_base
        ON evolution_agent_variants(base_agent_id, status);
    `);
  }

  /**
   * Identify capability gaps from recent failures
   */
  identifyGaps(failures: TaskFailure[]): CapabilityGap[] {
    if (failures.length === 0) return [];

    // Group failures by error pattern
    const errorGroups = this.groupFailuresByPattern(failures);

    const gaps: CapabilityGap[] = [];

    for (const [pattern, groupFailures] of Object.entries(errorGroups)) {
      if (groupFailures.length < this.config.minFailuresForGap) continue;

      const gap = this.analyzeFailureGroup(pattern, groupFailures);
      if (gap) {
        gaps.push(gap);
        this.storeGap(gap);
      }
    }

    return gaps;
  }

  /**
   * Group failures by error pattern
   */
  private groupFailuresByPattern(
    failures: TaskFailure[]
  ): Record<string, TaskFailure[]> {
    const groups: Record<string, TaskFailure[]> = {};

    for (const failure of failures) {
      // Create pattern key from error type and required capabilities
      const capabilities = failure.context.requiredCapabilities.sort().join(',');
      const key = `${failure.errorType}::${capabilities}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(failure);
    }

    return groups;
  }

  /**
   * Analyze a group of similar failures to identify gap
   */
  private analyzeFailureGroup(
    pattern: string,
    failures: TaskFailure[]
  ): CapabilityGap | null {
    const [errorType, capabilitiesStr] = pattern.split('::');

    // Determine gap category
    let category: string;
    if (errorType.includes('tool')) {
      category = 'tool_limitation';
    } else if (errorType.includes('skill') || errorType.includes('capability')) {
      category = 'missing_skill';
    } else if (errorType.includes('knowledge') || errorType.includes('unknown')) {
      category = 'knowledge_gap';
    } else {
      category = 'pattern_failure';
    }

    // Determine severity based on failure frequency
    const daysSpan =
      (failures[failures.length - 1].timestamp.getTime() -
        failures[0].timestamp.getTime()) /
      (1000 * 60 * 60 * 24);
    const frequency = failures.length / Math.max(daysSpan, 1);

    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (frequency > 5) severity = 'critical';
    else if (frequency > 2) severity = 'high';
    else if (frequency > 0.5) severity = 'medium';
    else severity = 'low';

    // Extract error patterns
    const errorPatterns = Array.from(
      new Set(failures.map((f) => f.errorMessage))
    );

    return {
      id: `gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      identifiedAt: new Date(),
      category,
      description: this.generateGapDescription(errorType, failures),
      failureCount: failures.length,
      affectedTasks: failures.map((f) => f.taskId),
      errorPatterns,
      severity,
      frequency,
    };
  }

  /**
   * Generate human-readable gap description
   */
  private generateGapDescription(
    errorType: string,
    failures: TaskFailure[]
  ): string {
    const taskTypes = Array.from(
      new Set(failures.map((f) => f.context.taskType))
    );
    const capabilities = Array.from(
      new Set(
        failures.flatMap((f) => f.context.requiredCapabilities)
      )
    );

    return `Agent struggles with ${taskTypes.join(', ')} tasks requiring ${capabilities.join(', ')}. Error type: ${errorType}`;
  }

  /**
   * Store gap in database
   */
  private storeGap(gap: CapabilityGap): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_capability_gaps (
        id, category, description, failure_count,
        affected_tasks, error_patterns, severity, frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        gap.id,
        gap.category,
        gap.description,
        gap.failureCount,
        JSON.stringify(gap.affectedTasks),
        JSON.stringify(gap.errorPatterns),
        gap.severity,
        gap.frequency
      );
  }

  /**
   * Suggest new skills to address capability gaps
   */
  suggestSkills(gaps: CapabilityGap[]): SkillSuggestion[] {
    const suggestions: SkillSuggestion[] = [];

    for (const gap of gaps) {
      const skills = this.generateSkillSuggestions(gap);
      suggestions.push(...skills);
    }

    // Store suggestions
    for (const suggestion of suggestions) {
      this.storeSuggestion(suggestion);
    }

    return suggestions;
  }

  /**
   * Generate skill suggestions for a gap
   */
  private generateSkillSuggestions(gap: CapabilityGap): SkillSuggestion[] {
    const suggestions: SkillSuggestion[] = [];

    switch (gap.category) {
      case 'tool_limitation':
        suggestions.push({
          skillId: `skill-${Date.now()}`,
          name: 'Enhanced Tool Integration',
          description: `Add tool capabilities to handle ${gap.description}`,
          category: 'tool_usage',
          addressesGaps: [gap.id],
          estimatedImpact: {
            gapsClosed: 1,
            tasksUnblocked: gap.affectedTasks.length,
            estimatedSuccessRateImprovement: 15,
          },
          implementationComplexity: 'medium',
          requiredTools: this.inferRequiredTools(gap),
        });
        break;

      case 'missing_skill':
        suggestions.push({
          skillId: `skill-${Date.now()}`,
          name: 'Capability Enhancement',
          description: `Add specialized skill for ${gap.description}`,
          category: 'specialized_skill',
          addressesGaps: [gap.id],
          estimatedImpact: {
            gapsClosed: 1,
            tasksUnblocked: gap.affectedTasks.length,
            estimatedSuccessRateImprovement: 20,
          },
          implementationComplexity: 'high',
          requiredTraining: ['specialized_training'],
        });
        break;

      case 'knowledge_gap':
        suggestions.push({
          skillId: `skill-${Date.now()}`,
          name: 'Knowledge Base Expansion',
          description: `Expand knowledge base for ${gap.description}`,
          category: 'knowledge',
          addressesGaps: [gap.id],
          estimatedImpact: {
            gapsClosed: 1,
            tasksUnblocked: gap.affectedTasks.length,
            estimatedSuccessRateImprovement: 10,
          },
          implementationComplexity: 'low',
        });
        break;
    }

    return suggestions;
  }

  /**
   * Infer required tools from gap description
   */
  private inferRequiredTools(gap: CapabilityGap): string[] {
    const tools: string[] = [];

    if (gap.description.includes('database')) {
      tools.push('database-client');
    }
    if (gap.description.includes('API')) {
      tools.push('http-client');
    }
    if (gap.description.includes('file')) {
      tools.push('file-system');
    }

    return tools;
  }

  /**
   * Store skill suggestion in database
   */
  private storeSuggestion(suggestion: SkillSuggestion): void {
    this.db
      .prepare(
        `
      INSERT INTO evolution_skill_suggestions (
        id, skill_name, description, category,
        addresses_gaps, estimated_impact,
        implementation_complexity, required_tools,
        required_training
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        suggestion.skillId,
        suggestion.name,
        suggestion.description,
        suggestion.category,
        JSON.stringify(suggestion.addressesGaps),
        JSON.stringify(suggestion.estimatedImpact),
        suggestion.implementationComplexity,
        JSON.stringify(suggestion.requiredTools || []),
        JSON.stringify(suggestion.requiredTraining || [])
      );
  }

  /**
   * Generate agent variant for specialization
   */
  generateVariant(agentId: string, specialization: string): AgentVariant {
    const baseAgent = this.db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .get(agentId) as any;

    if (!baseAgent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const variant: AgentVariant = {
      id: `${agentId}-${specialization.toLowerCase().replace(/\s+/g, '-')}`,
      baseAgentId: agentId,
      name: `${baseAgent.name} (${specialization})`,
      specialization,
      prompt: this.generateSpecializedPrompt(baseAgent, specialization),
      systemPrompt: this.generateSpecializedSystemPrompt(specialization),
      model: baseAgent.model || 'sonnet',
      createdAt: new Date(),
      trialCount: 0,
      performance: {
        successRate: 0,
        avgDuration: 0,
        tokenEfficiency: 0,
      },
      creationReason: `Specialized for ${specialization}`,
      status: 'testing',
    };

    // Store variant
    this.db
      .prepare(
        `
      INSERT INTO evolution_agent_variants (
        id, base_agent_id, name, specialization,
        prompt, system_prompt, model, creation_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        variant.id,
        variant.baseAgentId,
        variant.name,
        variant.specialization,
        variant.prompt,
        variant.systemPrompt,
        variant.model,
        variant.creationReason,
        variant.status
      );

    return variant;
  }

  /**
   * Generate specialized prompt
   */
  private generateSpecializedPrompt(
    baseAgent: any,
    specialization: string
  ): string {
    return `You are a specialized agent focused on ${specialization}. ${baseAgent.description || ''}

Your primary expertise is in ${specialization}, and you should apply this specialization to all tasks.`;
  }

  /**
   * Generate specialized system prompt
   */
  private generateSpecializedSystemPrompt(specialization: string): string {
    return `System: This agent is specialized for ${specialization}. Prioritize ${specialization}-related approaches and solutions.`;
  }

  /**
   * Propose agent composition for complex task
   */
  proposeComposition(task: {
    description: string;
    complexity: number;
    requiredCapabilities: string[];
  }): AgentComposition {
    // Analyze task requirements
    const agents = this.selectAgentsForTask(task);

    // Determine coordination pattern
    const pattern = this.determinePattern(task.complexity, agents.length);

    // Estimate resources
    const estimatedDuration = this.estimateDuration(task.complexity, agents.length);
    const estimatedTokens = this.estimateTokens(task.complexity);

    return {
      taskId: `task-${Date.now()}`,
      taskComplexity: task.complexity,
      agents: agents.map((agent, index) => ({
        agentId: agent.id,
        role: agent.role,
        weight: agent.weight,
        order: pattern === 'sequential' ? index + 1 : undefined,
      })),
      pattern,
      estimatedDuration,
      estimatedTokens,
      confidence: this.calculateConfidence(task, agents),
    };
  }

  /**
   * Select best agents for task based on capabilities
   */
  private selectAgentsForTask(task: {
    requiredCapabilities: string[];
  }): Array<{ id: string; role: string; weight: number }> {
    // Simplified selection - in production, use more sophisticated matching
    const agents: Array<{ id: string; role: string; weight: number }> = [];

    if (task.requiredCapabilities.includes('coding')) {
      agents.push({ id: 'coder', role: 'implementation', weight: 0.5 });
    }
    if (task.requiredCapabilities.includes('testing')) {
      agents.push({ id: 'tester', role: 'validation', weight: 0.3 });
    }
    if (task.requiredCapabilities.includes('review')) {
      agents.push({ id: 'reviewer', role: 'quality_assurance', weight: 0.2 });
    }

    return agents;
  }

  /**
   * Determine coordination pattern
   */
  private determinePattern(
    complexity: number,
    agentCount: number
  ): 'sequential' | 'parallel' | 'hierarchical' | 'mesh' {
    if (agentCount === 1) return 'sequential';
    if (complexity > 7) return 'hierarchical';
    if (agentCount > 5) return 'mesh';
    return 'parallel';
  }

  /**
   * Estimate task duration
   */
  private estimateDuration(complexity: number, agentCount: number): number {
    // Base duration in milliseconds
    const baseDuration = complexity * 60000; // 1 minute per complexity point
    const parallelism = Math.max(1, agentCount - 1);
    return baseDuration / parallelism;
  }

  /**
   * Estimate token usage
   */
  private estimateTokens(complexity: number): number {
    return complexity * 1000; // 1000 tokens per complexity point
  }

  /**
   * Calculate composition confidence
   */
  private calculateConfidence(
    task: any,
    agents: any[]
  ): number {
    // Simplified confidence calculation
    const capabilityCoverage =
      agents.length / Math.max(task.requiredCapabilities.length, 1);
    return Math.min(capabilityCoverage, 1.0);
  }

  /**
   * Get all open capability gaps
   */
  getOpenGaps(): CapabilityGap[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM evolution_capability_gaps
      WHERE status = 'open'
      ORDER BY severity DESC, frequency DESC
    `
      )
      .all() as any[];

    return rows.map((row) => ({
      id: row.id,
      identifiedAt: new Date(row.identified_at),
      category: row.category,
      description: row.description,
      failureCount: row.failure_count,
      affectedTasks: JSON.parse(row.affected_tasks),
      errorPatterns: JSON.parse(row.error_patterns),
      severity: row.severity,
      frequency: row.frequency,
    }));
  }

  /**
   * Get pending skill suggestions
   */
  getPendingSuggestions(): SkillSuggestion[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM evolution_skill_suggestions
      WHERE status = 'proposed'
      ORDER BY created_at DESC
    `
      )
      .all() as any[];

    return rows.map((row) => ({
      skillId: row.id,
      name: row.skill_name,
      description: row.description,
      category: row.category,
      addressesGaps: JSON.parse(row.addresses_gaps),
      estimatedImpact: JSON.parse(row.estimated_impact),
      implementationComplexity: row.implementation_complexity,
      requiredTools: JSON.parse(row.required_tools || '[]'),
      requiredTraining: JSON.parse(row.required_training || '[]'),
    }));
  }
}
