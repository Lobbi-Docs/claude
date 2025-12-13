/**
 * Agent Self-Improvement System
 *
 * A comprehensive system for tracking, analyzing, and evolving agent performance through:
 * - Performance tracking and metrics collection
 * - A/B testing with UCB1 multi-armed bandit algorithm
 * - Capability gap analysis and skill suggestions
 * - Feedback collection (explicit and implicit)
 * - Automated prompt evolution
 * - Evolution reporting
 *
 * @module evolution
 */

export * from './types';
export { PerformanceTracker } from './performance-tracker';
export { PromptOptimizer } from './prompt-optimizer';
export { CapabilityExpander } from './capability-expander';
export { FeedbackLoop } from './feedback-loop';

import { Database } from 'better-sqlite3';
import { PerformanceTracker } from './performance-tracker';
import { PromptOptimizer } from './prompt-optimizer';
import { CapabilityExpander } from './capability-expander';
import { FeedbackLoop } from './feedback-loop';
import { EvolutionConfig } from './types';

/**
 * Initialize the complete evolution system
 */
export function initializeEvolutionSystem(
  db: Database,
  config?: Partial<EvolutionConfig>
): {
  performanceTracker: PerformanceTracker;
  promptOptimizer: PromptOptimizer;
  capabilityExpander: CapabilityExpander;
  feedbackLoop: FeedbackLoop;
} {
  const performanceTracker = new PerformanceTracker(db);
  const promptOptimizer = new PromptOptimizer(db);
  const capabilityExpander = new CapabilityExpander(db);
  const feedbackLoop = new FeedbackLoop(db, config);

  return {
    performanceTracker,
    promptOptimizer,
    capabilityExpander,
    feedbackLoop,
  };
}

/**
 * Quick setup for evolution system with default configuration
 */
export class EvolutionSystem {
  public performanceTracker: PerformanceTracker;
  public promptOptimizer: PromptOptimizer;
  public capabilityExpander: CapabilityExpander;
  public feedbackLoop: FeedbackLoop;

  constructor(db: Database, config?: Partial<EvolutionConfig>) {
    const system = initializeEvolutionSystem(db, config);
    this.performanceTracker = system.performanceTracker;
    this.promptOptimizer = system.promptOptimizer;
    this.capabilityExpander = system.capabilityExpander;
    this.feedbackLoop = system.feedbackLoop;
  }

  /**
   * Track task completion with all metrics
   */
  async trackTaskCompletion(params: {
    agentId: string;
    taskId: string;
    variantId?: string;
    success: boolean;
    duration: number;
    tokens: number;
    userRating?: number;
    errorType?: string;
  }): Promise<void> {
    // Track in performance system
    this.performanceTracker.trackTask({
      agentId: params.agentId,
      taskId: params.taskId,
      success: params.success,
      duration: params.duration,
      tokenCount: params.tokens,
      userRating: params.userRating,
      timestamp: new Date(),
      errorType: params.errorType,
    });

    // Update prompt variant performance if variant ID provided
    if (params.variantId) {
      this.promptOptimizer.updatePerformance(
        params.variantId,
        params.success,
        params.duration,
        params.tokens
      );
    }

    // Check if evolution is needed
    const updates = this.feedbackLoop.checkThresholds();
    for (const update of updates) {
      if (update.recommendedAction === 'evolve') {
        await this.evolveAgent(update.agentId);
      }
    }
  }

  /**
   * Evolve an agent's prompts
   */
  async evolveAgent(agentId: string): Promise<void> {
    const newVariant = this.promptOptimizer.evolvePrompt(agentId);

    if (newVariant) {
      console.log(
        `Evolved agent ${agentId} to version ${newVariant.version}`
      );
    }
  }

  /**
   * Generate weekly evolution report
   */
  generateWeeklyReport() {
    return this.feedbackLoop.generateReport();
  }

  /**
   * Get agent performance summary
   */
  getAgentSummary(agentId: string) {
    return this.performanceTracker.getPerformanceSummary(agentId);
  }

  /**
   * Get capability gaps
   */
  getCapabilityGaps() {
    return this.capabilityExpander.getOpenGaps();
  }

  /**
   * Get skill suggestions
   */
  getSkillSuggestions() {
    return this.capabilityExpander.getPendingSuggestions();
  }
}
