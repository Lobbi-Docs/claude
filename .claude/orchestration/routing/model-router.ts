/**
 * Model Router - Intelligent model selection based on task characteristics
 * Routes tasks to the most appropriate AI model based on complexity, cost, and quality requirements
 */

import {
  ModelProfile,
  ModelName,
  TaskDescriptor,
  RoutingDecision,
  RoutingScore,
  RoutingStats,
  RouterConfig,
  OutcomeRecord,
  TaskType,
  TaskComplexity,
} from './types';

import {
  TokenBudgetPredictor,
  BudgetPrediction,
} from '../../jira-orchestrator/lib/token-budget-predictor';

export class ModelRouter {
  private profiles: Map<ModelName, ModelProfile>;
  private config: RouterConfig;
  private outcomes: OutcomeRecord[] = [];
  private routingHistory: RoutingDecision[] = [];
  private decisionCache: Map<string, RoutingDecision> = new Map();
  private budgetPredictor: TokenBudgetPredictor;

  constructor(config: RouterConfig, budgetPredictorPath?: string) {
    this.config = config;
    this.profiles = new Map(config.models.map(m => [m.name, m]));
    this.budgetPredictor = new TokenBudgetPredictor(budgetPredictorPath);
  }

  /**
   * Route a task to the most appropriate model
   */
  route(task: TaskDescriptor): RoutingDecision {
    // Check cache first
    const cacheKey = this.getCacheKey(task);
    if (this.config.enableCache && this.decisionCache.has(cacheKey)) {
      const cached = this.decisionCache.get(cacheKey)!;
      console.log(`[Router] Cache hit for task type: ${task.type}`);
      return cached;
    }

    // Score all available models
    const scores = this.scoreModels(task);

    // Sort by weighted score
    scores.sort((a, b) => b.weightedScore - a.weightedScore);

    // Select top model
    const selected = scores[0];
    const alternatives = scores.slice(1, 4).map(s => ({
      model: s.model,
      score: s.weightedScore,
      reason: this.getScoreReason(s),
    }));

    // Build reasoning
    const reasoning = this.buildReasoning(selected, task);

    // Create fallback chain
    const fallbackChain = this.buildFallbackChain(scores, task);

    // Estimate cost and latency
    const estimatedCost = this.estimateCost(selected.model, task);
    const estimatedLatency = selected.model.latencyMs;

    const decision: RoutingDecision = {
      model: selected.model,
      confidence: selected.weightedScore,
      reasoning,
      alternatives,
      estimatedCost,
      estimatedLatency,
      fallbackChain,
      timestamp: new Date(),
    };

    // Cache decision
    if (this.config.enableCache) {
      this.decisionCache.set(cacheKey, decision);
      // Auto-clear cache after TTL
      setTimeout(() => this.decisionCache.delete(cacheKey), this.config.cacheTTL * 1000);
    }

    // Store in history
    this.routingHistory.push(decision);

    console.log(`[Router] Selected ${selected.model.name} for ${task.type} task (score: ${selected.weightedScore.toFixed(2)})`);

    return decision;
  }

  /**
   * Score all models against a task
   */
  private scoreModels(task: TaskDescriptor): RoutingScore[] {
    const scores: RoutingScore[] = [];

    for (const model of this.profiles.values()) {
      const capabilityMatch = this.scoreCapability(model, task);
      const costEfficiency = this.scoreCost(model, task);
      const latency = this.scoreLatency(model, task);
      const quality = this.scoreQuality(model, task);
      const historicalPerformance = this.scoreHistorical(model, task);

      const componentScores = {
        capabilityMatch,
        costEfficiency,
        latency,
        quality,
        historicalPerformance,
      };

      // Calculate weighted total
      const weightedScore =
        (capabilityMatch * this.config.weights.capability) +
        (costEfficiency * this.config.weights.cost) +
        (latency * this.config.weights.latency) +
        (quality * this.config.weights.quality) +
        (historicalPerformance * this.config.weights.historical);

      scores.push({
        model,
        totalScore: (capabilityMatch + costEfficiency + latency + quality + historicalPerformance) / 5,
        scores: componentScores,
        weightedScore,
      });
    }

    return scores;
  }

  /**
   * Score how well model capabilities match task requirements
   */
  private scoreCapability(model: ModelProfile, task: TaskDescriptor): number {
    let score = 0;

    // Check if model strengths match task type
    if (model.strengths.includes(task.type)) {
      score += 40;
    }

    // Extended thinking requirement
    if (task.requiresExtendedThinking && model.supportsExtendedThinking) {
      score += 20;
    } else if (task.requiresExtendedThinking && !model.supportsExtendedThinking) {
      score -= 30;
    }

    // Tool use requirement
    if (task.involvesCode && model.supportsToolUse) {
      score += 15;
    }

    // Context window check
    const totalTokens = task.estimatedInputTokens + task.estimatedOutputTokens;
    if (totalTokens > model.contextWindow) {
      score -= 50; // Severe penalty if context won't fit
    } else if (totalTokens > model.contextWindow * 0.9) {
      score -= 20; // Penalty for tight fit
    }

    // Output tokens check
    if (task.estimatedOutputTokens > model.maxOutputTokens) {
      score -= 50;
    }

    // Complexity matching
    const complexityScore = this.matchComplexity(model, task.complexity);
    score += complexityScore;

    return Math.max(0, Math.min(100, score + 50)); // Normalize to 0-100
  }

  /**
   * Match model to task complexity
   */
  private matchComplexity(model: ModelProfile, complexity: TaskComplexity): number {
    const complexityMapping: Record<TaskComplexity, ModelName[]> = {
      'simple': ['haiku', 'gpt-3.5', 'gemini-flash'],
      'medium': ['sonnet', 'gpt-4', 'gemini-pro'],
      'complex': ['sonnet', 'opus', 'gpt-4'],
      'critical': ['opus', 'gpt-4'],
    };

    const preferredModels = complexityMapping[complexity];
    return preferredModels.includes(model.name) ? 20 : 0;
  }

  /**
   * Score cost efficiency
   */
  private scoreCost(model: ModelProfile, task: TaskDescriptor): number {
    const estimatedCost = this.estimateCost(model, task);

    // Check against constraints
    if (task.constraints?.maxCost && estimatedCost > task.constraints.maxCost) {
      return 0; // Hard constraint violation
    }

    // Normalize cost score (lower cost = higher score)
    // Opus baseline ~$15 per million tokens, Haiku ~$0.25
    const maxCost = 0.015; // $15 per 1k tokens (very expensive)
    const normalizedCost = 1 - (estimatedCost / maxCost);

    return Math.max(0, Math.min(100, normalizedCost * 100));
  }

  /**
   * Score latency
   */
  private scoreLatency(model: ModelProfile, task: TaskDescriptor): number {
    // Check against constraints
    if (task.constraints?.maxLatency && model.latencyMs > task.constraints.maxLatency) {
      return 0; // Hard constraint violation
    }

    // Normalize latency score (lower latency = higher score)
    const maxLatency = 10000; // 10 seconds
    const normalizedLatency = 1 - (model.latencyMs / maxLatency);

    return Math.max(0, Math.min(100, normalizedLatency * 100));
  }

  /**
   * Score quality
   */
  private scoreQuality(model: ModelProfile, task: TaskDescriptor): number {
    // Check against constraints
    if (task.constraints?.minQuality && model.qualityScore < task.constraints.minQuality) {
      return 0; // Hard constraint violation
    }

    // Boost score for critical tasks
    if (task.complexity === 'critical' && model.qualityScore > 90) {
      return model.qualityScore + 10;
    }

    return model.qualityScore;
  }

  /**
   * Score based on historical performance
   */
  private scoreHistorical(model: ModelProfile, task: TaskDescriptor): number {
    if (!this.config.enableLearning || this.outcomes.length === 0) {
      return 50; // Neutral score if no history
    }

    // Find relevant outcomes
    const relevantOutcomes = this.outcomes.filter(
      o => o.model === model.name &&
           o.task.type === task.type &&
           o.task.complexity === task.complexity
    );

    if (relevantOutcomes.length === 0) {
      return 50; // Neutral score if no matching history
    }

    // Calculate performance metrics
    const successRate = relevantOutcomes.filter(o => o.success).length / relevantOutcomes.length;
    const avgQuality = relevantOutcomes.reduce((sum, o) => sum + o.quality, 0) / relevantOutcomes.length;

    // Combine metrics
    const score = (successRate * 60) + (avgQuality * 0.4);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate cost for a task
   */
  private estimateCost(model: ModelProfile, task: TaskDescriptor): number {
    const inputCost = (task.estimatedInputTokens / 1000) * model.costPer1kInputTokens;
    const outputCost = (task.estimatedOutputTokens / 1000) * model.costPer1kOutputTokens;
    return inputCost + outputCost;
  }

  /**
   * Build fallback chain
   */
  private buildFallbackChain(scores: RoutingScore[], task: TaskDescriptor): ModelName[] {
    // Take top 3 models that meet minimum requirements
    const viable = scores.filter(s => s.weightedScore > 30);
    return viable.slice(0, 3).map(s => s.model.name);
  }

  /**
   * Build reasoning for decision
   */
  private buildReasoning(score: RoutingScore, task: TaskDescriptor): string[] {
    const reasoning: string[] = [];

    const s = score.scores;

    // Task matching
    if (s.capabilityMatch > 70) {
      reasoning.push(`Strong capability match for ${task.type} tasks`);
    }

    // Cost efficiency
    if (s.costEfficiency > 70) {
      reasoning.push('Cost-efficient option');
    } else if (s.costEfficiency < 30) {
      reasoning.push('Higher cost justified by quality/capability requirements');
    }

    // Quality
    if (s.quality > 90) {
      reasoning.push('Highest quality model for critical task');
    }

    // Latency
    if (s.latency > 80) {
      reasoning.push('Fast response time');
    }

    // Historical performance
    if (s.historicalPerformance > 70) {
      reasoning.push('Strong historical performance on similar tasks');
    }

    // Complexity match
    if (task.complexity === 'critical' && score.model.name === 'opus') {
      reasoning.push('Critical task requires most capable model');
    } else if (task.complexity === 'simple' && score.model.name === 'haiku') {
      reasoning.push('Simple task optimized for speed and cost');
    }

    return reasoning;
  }

  /**
   * Get reason for alternative score
   */
  private getScoreReason(score: RoutingScore): string {
    const top = Object.entries(score.scores).sort((a, b) => b[1] - a[1])[0];
    return `High ${top[0]} score (${top[1].toFixed(1)})`;
  }

  /**
   * Generate cache key for task
   */
  private getCacheKey(task: TaskDescriptor): string {
    return `${task.type}:${task.complexity}:${task.pattern}:${Math.floor(task.estimatedInputTokens / 1000)}k`;
  }

  /**
   * Record outcome for learning
   */
  recordOutcome(taskId: string, model: ModelName, success: boolean, quality: number, actualCost: number, actualLatency: number, tokensUsed: { input: number; output: number }): void {
    // Find corresponding routing decision
    const decision = this.routingHistory.find(d => d.model.name === model);

    const outcome: OutcomeRecord = {
      taskId,
      task: {} as TaskDescriptor, // Should be stored with task
      model,
      success,
      quality,
      actualCost,
      actualLatency,
      tokensUsed,
      usedFallback: false,
      timestamp: new Date(),
    };

    this.outcomes.push(outcome);

    console.log(`[Router] Recorded outcome: ${model} ${success ? 'succeeded' : 'failed'} (quality: ${quality})`);
  }

  /**
   * Get routing statistics
   */
  getStats(): RoutingStats {
    const stats: RoutingStats = {
      totalDecisions: this.routingHistory.length,
      byModel: {} as any,
      byTaskType: {} as any,
      byComplexity: {} as any,
      costs: {
        total: 0,
        byModel: {} as any,
        byDay: {},
        byMonth: {},
      },
      performance: {
        avgDecisionTime: 0,
        cacheHitRate: 0,
        fallbackRate: 0,
      },
    };

    // Aggregate by model
    for (const decision of this.routingHistory) {
      const modelName = decision.model.name;

      if (!stats.byModel[modelName]) {
        stats.byModel[modelName] = {
          count: 0,
          successRate: 0,
          avgQuality: 0,
          avgCost: 0,
          avgLatency: 0,
        };
      }

      stats.byModel[modelName].count++;
      stats.byModel[modelName].avgCost += decision.estimatedCost;
      stats.byModel[modelName].avgLatency += decision.estimatedLatency;
    }

    // Calculate averages
    for (const modelName in stats.byModel) {
      const data = stats.byModel[modelName as ModelName];
      data.avgCost /= data.count;
      data.avgLatency /= data.count;
    }

    // Aggregate outcomes
    for (const outcome of this.outcomes) {
      const modelName = outcome.model;

      if (stats.byModel[modelName]) {
        const relevantOutcomes = this.outcomes.filter(o => o.model === modelName);
        stats.byModel[modelName].successRate = relevantOutcomes.filter(o => o.success).length / relevantOutcomes.length;
        stats.byModel[modelName].avgQuality = relevantOutcomes.reduce((sum, o) => sum + o.quality, 0) / relevantOutcomes.length;
      }

      // Aggregate costs
      stats.costs.total += outcome.actualCost;

      if (!stats.costs.byModel[modelName]) {
        stats.costs.byModel[modelName] = 0;
      }
      stats.costs.byModel[modelName] += outcome.actualCost;
    }

    return stats;
  }

  /**
   * Get model profile
   */
  getModel(name: ModelName): ModelProfile | undefined {
    return this.profiles.get(name);
  }

  /**
   * Update model profile
   */
  updateModel(name: ModelName, updates: Partial<ModelProfile>): void {
    const model = this.profiles.get(name);
    if (model) {
      Object.assign(model, updates);
    }
  }

  /**
   * Clear routing cache
   */
  clearCache(): void {
    this.decisionCache.clear();
    console.log('[Router] Cache cleared');
  }

  /**
   * Select model and predict optimal token budget
   *
   * This method combines model selection with budget prediction for optimal
   * resource allocation. It returns both the routing decision and budget prediction.
   *
   * @param task Task descriptor
   * @param agent Agent name (optional)
   * @returns Combined model and budget configuration
   */
  async selectModelAndBudget(
    task: TaskDescriptor,
    agent?: string
  ): Promise<{
    routing: RoutingDecision;
    budget: BudgetPrediction;
    config: {
      model: ModelName;
      modelId: string;
      extended_thinking: boolean;
      thinking_budget: number;
      confidence: number;
      reasoning: string;
    };
  }> {
    // Select optimal model
    const routing = this.route(task);

    // Predict optimal budget
    const budget = await this.budgetPredictor.predictOptimalBudget(task, agent);

    // Determine if extended thinking should be enabled
    const extended_thinking = budget.recommended >= 5000 ||
                             task.requiresExtendedThinking ||
                             task.complexity === 'critical' ||
                             task.complexity === 'complex';

    // Build configuration object
    const config = {
      model: routing.model.name,
      modelId: routing.model.modelId,
      extended_thinking,
      thinking_budget: budget.recommended,
      confidence: budget.confidence,
      reasoning: this.buildBudgetReasoning(routing, budget),
    };

    console.log(
      `[Router] Selected ${config.model} with ${config.thinking_budget} token budget ` +
      `(confidence: ${(budget.confidence * 100).toFixed(1)}%)`
    );

    return { routing, budget, config };
  }

  /**
   * Build combined reasoning for model and budget selection
   */
  private buildBudgetReasoning(
    routing: RoutingDecision,
    budget: BudgetPrediction
  ): string {
    const modelReasoning = routing.reasoning.join('. ');
    const budgetReasoning = budget.reasoning;

    return `Model Selection: ${modelReasoning}\n\nBudget Allocation: ${budgetReasoning}`;
  }

  /**
   * Record outcome with budget tracking
   *
   * Enhanced version that also records budget usage for learning
   */
  async recordOutcomeWithBudget(
    taskId: string,
    task: TaskDescriptor,
    model: ModelName,
    success: boolean,
    quality: number,
    actualCost: number,
    actualLatency: number,
    tokensUsed: { input: number; output: number },
    thinkingTokensUsed: number,
    budgetAllocated: number,
    agent?: string
  ): Promise<void> {
    // Record in router
    this.recordOutcome(
      taskId,
      model,
      success,
      quality,
      actualCost,
      actualLatency,
      tokensUsed
    );

    // Record in budget predictor
    await this.budgetPredictor.recordBudgetUsage(
      taskId,
      task,
      budgetAllocated,
      thinkingTokensUsed,
      thinkingTokensUsed,
      {
        success,
        quality,
        completedInTime: true, // Could be enhanced with actual timing data
        requiredReflection: quality < 85, // Heuristic for reflection need
      },
      agent,
      model
    );
  }

  /**
   * Get budget predictor for direct access
   */
  getBudgetPredictor(): TokenBudgetPredictor {
    return this.budgetPredictor;
  }

  /**
   * Get budget efficiency report
   */
  getBudgetEfficiencyReport() {
    return this.budgetPredictor.generateEfficiencyReport();
  }
}
