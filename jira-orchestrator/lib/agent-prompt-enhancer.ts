/**
 * Agent Prompt Enhancer - Injects budget and reasoning information into agent prompts
 *
 * This module provides utilities to enhance agent prompts with token budget information,
 * budget reasoning, and usage guidance to help agents make optimal use of extended thinking.
 *
 * @module agent-prompt-enhancer
 */

import { BudgetPrediction } from './token-budget-predictor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface EnhancedPromptConfig {
  /** Base agent prompt */
  basePrompt: string;

  /** Budget prediction */
  budget: BudgetPrediction;

  /** Task complexity (0-100) */
  taskComplexity: number;

  /** Whether task is critical */
  isCritical: boolean;

  /** Model being used */
  model: string;

  /** Agent name */
  agentName?: string;
}

export interface BudgetGuidance {
  /** When to use more tokens */
  useMoreFor: string[];

  /** When to use fewer tokens */
  useFewerFor: string[];

  /** Phase-specific budgets */
  phaseAllocations: {
    thinking: number;
    planning: number;
    execution: number;
    reflection: number;
  };

  /** Real-time usage tips */
  tips: string[];
}

// ============================================================================
// Agent Prompt Enhancer Implementation
// ============================================================================

export class AgentPromptEnhancer {
  /**
   * Enhance agent prompt with budget information
   */
  static enhancePrompt(config: EnhancedPromptConfig): string {
    const budgetSection = this.generateBudgetSection(config);
    const guidanceSection = this.generateGuidanceSection(config);

    return `${config.basePrompt}

${budgetSection}

${guidanceSection}`;
  }

  /**
   * Generate budget information section
   */
  private static generateBudgetSection(config: EnhancedPromptConfig): string {
    const { budget, taskComplexity, isCritical } = config;

    const confidenceEmoji = budget.confidence > 0.8 ? '🎯' : budget.confidence > 0.6 ? '📊' : '⚠️';

    return `---

## 🧠 Extended Thinking Budget

You have been allocated **${budget.recommended.toLocaleString()} tokens** for extended thinking on this task.

**Budget Confidence**: ${confidenceEmoji} ${(budget.confidence * 100).toFixed(1)}%

**Budget Reasoning**:
${budget.reasoning}

**Estimated Phase Breakdown**:
${this.formatPhaseBreakdown(budget.breakdown)}

${this.formatAlternatives(budget.alternatives)}

${isCritical ? this.getCriticalTaskNote() : ''}`;
  }

  /**
   * Generate budget guidance section
   */
  private static generateGuidanceSection(config: EnhancedPromptConfig): string {
    const guidance = this.generateGuidance(config);

    return `## 💡 Budget Usage Guidance

**Use MORE tokens for**:
${guidance.useMoreFor.map(item => `- ${item}`).join('\n')}

**Use FEWER tokens for**:
${guidance.useFewerFor.map(item => `- ${item}`).join('\n')}

**Real-Time Usage Tips**:
${guidance.tips.map(tip => `- ${tip}`).join('\n')}

---`;
  }

  /**
   * Format phase breakdown
   */
  private static formatPhaseBreakdown(
    breakdown?: { thinking: number; planning: number; execution: number; reflection: number }
  ): string {
    if (!breakdown) {
      return '- No specific breakdown available';
    }

    return `- **Thinking**: ~${breakdown.thinking.toLocaleString()} tokens (deep analysis and problem exploration)
- **Planning**: ~${breakdown.planning.toLocaleString()} tokens (approach design and strategy)
- **Execution**: ~${breakdown.execution.toLocaleString()} tokens (implementation and coding)
- **Reflection**: ~${breakdown.reflection.toLocaleString()} tokens (quality check and improvement)`;
  }

  /**
   * Format alternative budgets
   */
  private static formatAlternatives(
    alternatives: Array<{ budget: number; tradeoff: string }>
  ): string {
    return `**Alternative Budget Options**:
${alternatives.map((alt, i) => `${i + 1}. **${alt.budget.toLocaleString()} tokens**: ${alt.tradeoff}`).join('\n')}`;
  }

  /**
   * Get critical task note
   */
  private static getCriticalTaskNote(): string {
    return `
**⚠️ CRITICAL TASK**:
This is a critical task. You have been allocated extra budget for thorough analysis.
Use extended thinking liberally to ensure correctness, security, and quality.`;
  }

  /**
   * Generate usage guidance
   */
  private static generateGuidance(config: EnhancedPromptConfig): BudgetGuidance {
    const { budget, taskComplexity, isCritical } = config;

    return {
      useMoreFor: this.getUseMoreList(taskComplexity, isCritical),
      useFewerFor: this.getUseFewerList(),
      phaseAllocations: budget.breakdown || {
        thinking: Math.round(budget.recommended * 0.25),
        planning: Math.round(budget.recommended * 0.20),
        execution: Math.round(budget.recommended * 0.40),
        reflection: Math.round(budget.recommended * 0.15),
      },
      tips: this.getUsageTips(budget),
    };
  }

  /**
   * Get "use more tokens" list
   */
  private static getUseMoreList(complexity: number, isCritical: boolean): string[] {
    const list = [
      'Complex algorithmic decisions requiring deep reasoning',
      'Security-critical code that needs thorough analysis',
      'Edge case exploration and validation',
      'Architectural decisions with long-term impact',
      'Performance optimization requiring trade-off analysis',
    ];

    if (complexity > 70) {
      list.push('Breaking down complex problems into manageable pieces');
      list.push('Exploring multiple solution approaches');
    }

    if (isCritical) {
      list.push('Triple-checking critical business logic');
      list.push('Comprehensive error handling analysis');
    }

    return list;
  }

  /**
   * Get "use fewer tokens" list
   */
  private static getUseFewerList(): string[] {
    return [
      'Simple, straightforward implementations',
      'Routine code following established patterns',
      'Well-defined tasks with clear requirements',
      'Minor refactoring or style improvements',
      'Documentation updates with clear instructions',
    ];
  }

  /**
   * Get usage tips
   */
  private static getUsageTips(budget: BudgetPrediction): string[] {
    const tips = [
      'You can see your token usage in real-time during execution',
      'Front-load thinking: use more budget early for planning and design',
      'Save budget for reflection: reserve 10-15% for quality checks',
      'Trust the budget: it\'s optimized based on similar historical tasks',
    ];

    if (budget.confidence < 0.6) {
      tips.push('⚠️ Low confidence prediction - monitor usage closely and adjust as needed');
    }

    if (budget.historicalBasis && budget.historicalBasis.length > 0) {
      tips.push(`Based on ${budget.historicalBasis.length} similar tasks with avg ${Math.round(budget.historicalBasis.reduce((sum, t) => sum + t.budgetUsed, 0) / budget.historicalBasis.length)} tokens used`);
    }

    return tips;
  }

  /**
   * Generate budget summary for logging
   */
  static generateBudgetSummary(
    budget: BudgetPrediction,
    actualUsed?: number
  ): string {
    let summary = `Budget: ${budget.recommended} tokens (${(budget.confidence * 100).toFixed(1)}% confidence)`;

    if (actualUsed) {
      const utilization = (actualUsed / budget.recommended) * 100;
      const utilizationEmoji = utilization >= 75 && utilization <= 85 ? '✓' :
                              utilization < 60 ? '⚠️ Over-allocated' :
                              utilization > 95 ? '⚠️ Under-allocated' : '○';

      summary += ` | Used: ${actualUsed} (${utilization.toFixed(1)}%) ${utilizationEmoji}`;
    }

    return summary;
  }

  /**
   * Create budget header for agent logs
   */
  static createBudgetHeader(
    agentName: string,
    budget: BudgetPrediction
  ): string {
    return `
╔═══════════════════════════════════════════════════════════════╗
║ Agent: ${agentName.padEnd(54)} ║
║ Budget: ${budget.recommended.toString().padEnd(53)} ║
║ Confidence: ${(budget.confidence * 100).toFixed(1)}%${' '.repeat(48)} ║
╚═══════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Create budget footer with utilization stats
   */
  static createBudgetFooter(
    allocated: number,
    used: number,
    outcome: 'success' | 'failure'
  ): string {
    const utilization = (used / allocated) * 100;
    const outcomeEmoji = outcome === 'success' ? '✓' : '✗';
    const efficiencyEmoji = utilization >= 75 && utilization <= 85 ? '🎯 Optimal' :
                           utilization < 60 ? '📉 Over-allocated' :
                           utilization > 95 ? '📈 Under-allocated' : '○ Acceptable';

    return `
╔═══════════════════════════════════════════════════════════════╗
║ Outcome: ${outcomeEmoji} ${outcome.padEnd(51)} ║
║ Budget Allocated: ${allocated.toString().padEnd(44)} ║
║ Budget Used: ${used.toString().padEnd(49)} ║
║ Utilization: ${utilization.toFixed(1)}%${' '.repeat(48)} ║
║ Efficiency: ${efficiencyEmoji.padEnd(51)} ║
╚═══════════════════════════════════════════════════════════════╝`;
  }
}
