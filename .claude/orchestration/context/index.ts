/**
 * Context Window Optimization Engine - Main Export
 *
 * Provides unified access to all context optimization components.
 */

// Core components
export { TokenCounter, createTokenCounter, countTokens, countTokensBatch } from './token-counter';
export { ContextAnalyzer, createContextAnalyzer } from './context-analyzer';
export { Compressor, createCompressor } from './compressor';
export {
  BudgetManager,
  createBudgetManager,
  DEFAULT_BUDGET_CONFIG,
} from './budget-manager';
export { CheckpointManager, createCheckpointManager } from './checkpoint-manager';
export {
  ContextOptimizer,
  createOptimizer,
  DEFAULT_OPTIMIZER_CONFIG,
} from './optimizer';

// Types
export * from './types';

// Re-export default optimizer for convenience
export { default } from './optimizer';
