/**
 * Model Routing System - Public API
 * Intelligent model selection, cost optimization, and fallback handling
 */

export * from './types';
export { ModelRouter } from './model-router';
export { TaskClassifier } from './task-classifier';
export { FallbackChain } from './fallback-chain';
export { CostOptimizer } from './cost-optimizer';

import { ModelRouter } from './model-router';
import { TaskClassifier } from './task-classifier';
import { FallbackChain } from './fallback-chain';
import { CostOptimizer } from './cost-optimizer';
import {
  ModelProfile,
  ModelName,
  RouterConfig,
  BudgetConfig,
  TaskDescriptor,
  RoutingDecision,
} from './types';

/**
 * Default model profiles based on Claude documentation
 * Updated as of January 2025
 */
export const DEFAULT_MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'claude-opus-4-5',
    name: 'opus',
    modelId: 'claude-opus-4-5-20251101',
    provider: 'anthropic',
    strengths: ['architecture', 'planning', 'analysis', 'code-review', 'creative'],
    costPer1kInputTokens: 0.015, // $15 per million
    costPer1kOutputTokens: 0.075, // $75 per million
    latencyMs: 3000,
    contextWindow: 200000,
    maxOutputTokens: 16384,
    qualityScore: 95,
    supportsExtendedThinking: true,
    supportsVision: true,
    supportsToolUse: true,
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'sonnet',
    modelId: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    strengths: ['code-generation', 'analysis', 'coordination', 'debugging', 'refactoring'],
    costPer1kInputTokens: 0.003, // $3 per million
    costPer1kOutputTokens: 0.015, // $15 per million
    latencyMs: 2000,
    contextWindow: 200000,
    maxOutputTokens: 16384,
    qualityScore: 90,
    supportsExtendedThinking: true,
    supportsVision: true,
    supportsToolUse: true,
  },
  {
    id: 'claude-haiku-4',
    name: 'haiku',
    modelId: 'claude-haiku-4-20250130',
    provider: 'anthropic',
    strengths: ['simple-task', 'documentation', 'factual', 'testing'],
    costPer1kInputTokens: 0.0008, // $0.80 per million
    costPer1kOutputTokens: 0.004, // $4 per million
    latencyMs: 800,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    qualityScore: 80,
    supportsExtendedThinking: false,
    supportsVision: true,
    supportsToolUse: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'gpt-4',
    modelId: 'gpt-4-turbo-2024-04-09',
    provider: 'openai',
    strengths: ['architecture', 'code-generation', 'creative', 'analysis'],
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    latencyMs: 2500,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    qualityScore: 92,
    supportsExtendedThinking: false,
    supportsVision: true,
    supportsToolUse: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'gpt-3.5',
    modelId: 'gpt-3.5-turbo',
    provider: 'openai',
    strengths: ['simple-task', 'documentation', 'factual'],
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    latencyMs: 1000,
    contextWindow: 16385,
    maxOutputTokens: 4096,
    qualityScore: 75,
    supportsExtendedThinking: false,
    supportsVision: false,
    supportsToolUse: true,
  },
  {
    id: 'gemini-pro-1.5',
    name: 'gemini-pro',
    modelId: 'gemini-1.5-pro',
    provider: 'google',
    strengths: ['analysis', 'code-generation', 'creative'],
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    latencyMs: 2000,
    contextWindow: 1000000, // 1M context!
    maxOutputTokens: 8192,
    qualityScore: 88,
    supportsExtendedThinking: false,
    supportsVision: true,
    supportsToolUse: true,
  },
  {
    id: 'gemini-flash-1.5',
    name: 'gemini-flash',
    modelId: 'gemini-1.5-flash',
    provider: 'google',
    strengths: ['simple-task', 'documentation', 'factual'],
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    latencyMs: 600,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    qualityScore: 78,
    supportsExtendedThinking: false,
    supportsVision: true,
    supportsToolUse: true,
  },
];

/**
 * Default routing configuration
 */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  models: DEFAULT_MODEL_PROFILES,
  defaultModel: 'sonnet',
  weights: {
    capability: 0.35,
    cost: 0.20,
    latency: 0.15,
    quality: 0.20,
    historical: 0.10,
  },
  enableLearning: true,
  enableCache: true,
  cacheTTL: 3600, // 1 hour
  fallback: {
    enabled: true,
    maxAttempts: 3,
    timeout: 60000,
  },
};

/**
 * Default budget configuration
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  dailyLimit: 10.0, // $10/day
  monthlyLimit: 250.0, // $250/month
  perRequestLimit: 1.0, // $1 per request max
  alerts: {
    dailyWarning: 75, // 75%
    monthlyWarning: 80, // 80%
  },
  timezone: 'UTC',
};

/**
 * Unified routing system - combines all components
 */
export class RoutingSystem {
  public readonly router: ModelRouter;
  public readonly classifier: TaskClassifier;
  public readonly fallback: FallbackChain;
  public readonly costOptimizer: CostOptimizer;

  constructor(
    routerConfig: RouterConfig = DEFAULT_ROUTER_CONFIG,
    budgetConfig: BudgetConfig = DEFAULT_BUDGET_CONFIG
  ) {
    this.classifier = new TaskClassifier();

    const modelMap = new Map(routerConfig.models.map(m => [m.name, m]));

    this.router = new ModelRouter(routerConfig);
    this.fallback = new FallbackChain();
    this.costOptimizer = new CostOptimizer(budgetConfig, modelMap);

    this.setupDefaultFallbacks();
  }

  /**
   * Route a task (high-level API)
   */
  async routeTask(task: string, context?: string): Promise<RoutingDecision> {
    // Classify task
    const descriptor = this.classifier.classify(task, context);

    // Get routing decision
    const decision = this.router.route(descriptor);

    console.log(`[RoutingSystem] Task classified as ${descriptor.type} (${descriptor.complexity})`);
    console.log(`[RoutingSystem] Routed to ${decision.model.name} with ${decision.confidence.toFixed(1)}% confidence`);

    return decision;
  }

  /**
   * Execute task with routing and fallback
   */
  async executeWithRouting<T>(
    task: string,
    executor: (model: ModelName) => Promise<T>,
    context?: string
  ): Promise<T> {
    const decision = await this.routeTask(task, context);

    const result = await this.fallback.executeWithFallback(
      executor,
      decision.fallbackChain
    );

    // Track cost
    // Note: actual cost should be calculated based on real token usage
    // This is a placeholder
    const estimatedTokens = {
      input: decision.estimatedCost * 1000 / decision.model.costPer1kInputTokens,
      output: decision.estimatedCost * 1000 / decision.model.costPer1kOutputTokens,
    };

    this.costOptimizer.trackUsage(
      result.model,
      this.classifier.classify(task).type,
      estimatedTokens,
      decision.estimatedCost
    );

    return result.value;
  }

  /**
   * Setup default fallback chains
   */
  private setupDefaultFallbacks(): void {
    // Opus -> Sonnet -> GPT-4
    this.fallback.defineFallbacks('opus', ['sonnet', 'gpt-4']);

    // Sonnet -> Haiku -> GPT-3.5
    this.fallback.defineFallbacks('sonnet', ['haiku', 'gpt-3.5']);

    // Haiku -> GPT-3.5 -> Gemini Flash
    this.fallback.defineFallbacks('haiku', ['gpt-3.5', 'gemini-flash']);

    // GPT-4 -> Sonnet -> Opus
    this.fallback.defineFallbacks('gpt-4', ['sonnet', 'opus']);

    // Gemini Pro -> Sonnet -> GPT-4
    this.fallback.defineFallbacks('gemini-pro', ['sonnet', 'gpt-4']);
  }

  /**
   * Get comprehensive status
   */
  getStatus(): {
    routing: any;
    budget: any;
    fallbacks: any;
  } {
    return {
      routing: this.router.getStats(),
      budget: this.costOptimizer.checkBudget(),
      fallbacks: this.fallback.getFallbackConfigs(),
    };
  }
}

/**
 * Create a routing system with custom config
 */
export function createRoutingSystem(
  routerConfig?: Partial<RouterConfig>,
  budgetConfig?: Partial<BudgetConfig>
): RoutingSystem {
  const fullRouterConfig: RouterConfig = {
    ...DEFAULT_ROUTER_CONFIG,
    ...routerConfig,
  };

  const fullBudgetConfig: BudgetConfig = {
    ...DEFAULT_BUDGET_CONFIG,
    ...budgetConfig,
  };

  return new RoutingSystem(fullRouterConfig, fullBudgetConfig);
}

/**
 * Quick start - create with defaults
 */
export function createDefaultRoutingSystem(): RoutingSystem {
  return new RoutingSystem();
}
