/**
 * Context Window Optimizer - Main orchestration engine
 *
 * Integrates all optimization components:
 * - Token counting
 * - Context analysis
 * - Compression strategies
 * - Budget management
 * - Checkpointing
 *
 * Provides high-level API for context optimization.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { TokenCounter, createTokenCounter } from './token-counter';
import { ContextAnalyzer, createContextAnalyzer } from './context-analyzer';
import { Compressor, createCompressor } from './compressor';
import { BudgetManager, createBudgetManager, DEFAULT_BUDGET_CONFIG } from './budget-manager';
import { CheckpointManager, createCheckpointManager } from './checkpoint-manager';
import {
  OptimizerConfig,
  OptimizationResult,
  OptimizationStrategy,
  OptimizationEvent,
  OptimizationProgressCallback,
  ConversationContext,
  UsageReport,
  BudgetConfig,
  CheckpointId,
  CustomOptimizationConfig,
  CompressionAlgorithm,
} from './types';

/**
 * Default optimizer configuration
 */
export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
  db: {
    dbPath: './.claude/orchestration/db/orchestration.db',
  },
  defaultStrategy: 'balanced',
  defaultBudget: DEFAULT_BUDGET_CONFIG,
  autoCheckpoint: true,
  checkpointAtPhases: true,
  useCompressionCache: true,
  useReferenceDeDuplication: true,
};

/**
 * Context Window Optimizer class
 */
export class ContextOptimizer {
  private config: OptimizerConfig;
  private db: Database.Database;
  private tokenCounter: TokenCounter;
  private analyzer: ContextAnalyzer;
  private compressor: Compressor;
  private budgetManager: BudgetManager;
  private checkpointManager: CheckpointManager;
  private currentSessionId?: string;

  constructor(config?: Partial<OptimizerConfig>) {
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };

    // Initialize database
    this.db = new Database(this.config.db.dbPath);
    this.initializeDatabase();

    // Initialize components
    this.tokenCounter = createTokenCounter();
    this.analyzer = createContextAnalyzer(this.tokenCounter);
    this.compressor = createCompressor(this.tokenCounter);
    this.budgetManager = createBudgetManager(this.config.defaultBudget, this.tokenCounter);
    this.checkpointManager = createCheckpointManager(this.db);
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    // Load and execute context.sql schema
    const schemaPath = this.config.db.dbPath.replace('orchestration.db', 'context.sql');
    try {
      const fs = require('fs');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } catch (error) {
      console.warn('Could not load context.sql schema:', error);
      // Schema might already exist, continue
    }
  }

  /**
   * Optimize conversation context
   */
  async optimize(
    context: ConversationContext,
    strategy?: OptimizationStrategy,
    progressCallback?: OptimizationProgressCallback
  ): Promise<OptimizationResult> {
    const runId = uuidv4();
    const startTime = Date.now();
    const activeStrategy = strategy || this.config.defaultStrategy;

    this.emitProgress(progressCallback, 'start', 'Starting optimization...', 0);

    // Analyze context
    this.emitProgress(progressCallback, 'progress', 'Analyzing context...', 10);
    const usageReport = this.analyzer.analyzeUsage(context, this.config.defaultBudget.total);

    // Track original tokens
    const originalTokens = context.totalTokens;

    // Apply optimization strategy
    this.emitProgress(progressCallback, 'progress', 'Applying optimization strategy...', 30);
    const optimizedContext = await this.applyOptimizationStrategy(
      context,
      activeStrategy,
      usageReport
    );

    // Calculate savings
    const optimizedTokens = this.calculateTotalTokens(optimizedContext);
    const savings = originalTokens - optimizedTokens;
    const savingsPercent = (savings / originalTokens) * 100;

    // Determine strategies applied
    const strategiesApplied = this.determineStrategiesApplied(activeStrategy);

    // Quality estimation
    const quality = this.estimateQuality(activeStrategy);

    // Collect warnings and errors
    const warnings: string[] = [];
    const errors: string[] = [];

    if (savingsPercent < 5) {
      warnings.push('Optimization achieved less than 5% savings');
    }

    if (optimizedTokens > this.config.defaultBudget.total * 0.9) {
      warnings.push('Optimized context still uses >90% of budget');
    }

    // Record optimization run
    this.recordOptimizationRun({
      runId,
      sessionId: this.currentSessionId,
      inputTokens: originalTokens,
      outputTokens: optimizedTokens,
      strategy: activeStrategy,
      strategiesApplied,
      quality,
      warnings,
      errors,
    });

    this.emitProgress(progressCallback, 'complete', 'Optimization complete', 100);

    const executionTimeMs = Date.now() - startTime;

    return {
      originalTokens,
      optimizedTokens,
      savings,
      savingsPercent,
      strategies: strategiesApplied,
      warnings,
      errors,
      quality,
      executionTimeMs,
      optimizedContext,
    };
  }

  /**
   * Analyze context usage
   */
  analyzeUsage(context: ConversationContext): UsageReport {
    // Update budget manager with current context
    this.budgetManager.analyzeContext(context);

    // Generate usage report
    return this.analyzer.analyzeUsage(context, this.config.defaultBudget.total);
  }

  /**
   * Set optimization strategy
   */
  setStrategy(strategy: OptimizationStrategy): void {
    this.config.defaultStrategy = strategy;
  }

  /**
   * Create checkpoint
   */
  async checkpoint(name: string, context: ConversationContext): Promise<CheckpointId> {
    return this.checkpointManager.checkpoint(name, context, {
      sessionId: this.currentSessionId,
      type: 'manual',
      phase: 'unknown',
    });
  }

  /**
   * Restore from checkpoint
   */
  async restore(checkpointId: CheckpointId): Promise<ConversationContext> {
    return this.checkpointManager.restore(checkpointId);
  }

  /**
   * Set current session ID
   */
  setSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Get budget allocation
   */
  getBudgetAllocation() {
    return this.budgetManager.getCurrentAllocation();
  }

  /**
   * Update budget configuration
   */
  updateBudget(config: Partial<BudgetConfig>): void {
    this.budgetManager.updateConfig(config);
  }

  /**
   * Apply custom optimization configuration
   */
  async applyCustomOptimization(
    context: ConversationContext,
    config: CustomOptimizationConfig
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalTokens = context.totalTokens;

    // Skip if below threshold
    if (config.skipIfTokensBelow && originalTokens < config.skipIfTokensBelow) {
      return {
        originalTokens,
        optimizedTokens: originalTokens,
        savings: 0,
        savingsPercent: 0,
        strategies: [],
        warnings: ['Skipped: Below token threshold'],
        errors: [],
        quality: 1.0,
        executionTimeMs: Date.now() - startTime,
        optimizedContext: context,
      };
    }

    // Apply algorithms in sequence
    let optimizedContext = { ...context };

    for (const algorithm of config.algorithms) {
      optimizedContext = await this.applyAlgorithmToContext(optimizedContext, algorithm);
    }

    const optimizedTokens = this.calculateTotalTokens(optimizedContext);
    const savings = originalTokens - optimizedTokens;
    const savingsPercent = (savings / originalTokens) * 100;

    return {
      originalTokens,
      optimizedTokens,
      savings,
      savingsPercent,
      strategies: config.algorithms,
      warnings: [],
      errors: [],
      quality: config.minQuality || 0.8,
      executionTimeMs: Date.now() - startTime,
      optimizedContext,
    };
  }

  /**
   * Close optimizer and cleanup
   */
  close(): void {
    this.db.close();
  }

  /**
   * Apply optimization strategy to context
   */
  private async applyOptimizationStrategy(
    context: ConversationContext,
    strategy: OptimizationStrategy,
    usageReport: UsageReport
  ): Promise<ConversationContext> {
    const optimizedContext = { ...context };

    // Apply compression to conversation turns
    if (optimizedContext.turns.length > 0) {
      const turnContents = optimizedContext.turns.map((t) => t.content);
      const result = await this.compressor.compressBatch(turnContents, strategy, [
        'conversation',
      ]);

      optimizedContext.turns = optimizedContext.turns.map((turn, i) => ({
        ...turn,
        content: result.results[i].compressed,
        tokens: result.results[i].compressedTokens,
      }));
    }

    // Apply compression to tool results
    if (optimizedContext.toolResults.length > 0) {
      for (const toolResult of optimizedContext.toolResults) {
        const resultStr = JSON.stringify(toolResult.result);
        const compressed = await this.compressor.compress(resultStr, 'minification', 'json');
        toolResult.result = JSON.parse(compressed.compressed);
        toolResult.tokens = compressed.compressedTokens;
      }
    }

    // Recalculate total tokens
    optimizedContext.totalTokens = this.calculateTotalTokens(optimizedContext);

    return optimizedContext;
  }

  /**
   * Apply single algorithm to context
   */
  private async applyAlgorithmToContext(
    context: ConversationContext,
    algorithm: CompressionAlgorithm
  ): Promise<ConversationContext> {
    const optimizedContext = { ...context };

    // Apply to conversation turns
    for (const turn of optimizedContext.turns) {
      const result = await this.compressor.compress(turn.content, algorithm, 'conversation');
      turn.content = result.compressed;
      turn.tokens = result.compressedTokens;
    }

    // Recalculate total
    optimizedContext.totalTokens = this.calculateTotalTokens(optimizedContext);

    return optimizedContext;
  }

  /**
   * Calculate total tokens in context
   */
  private calculateTotalTokens(context: ConversationContext): number {
    let total = 0;

    for (const section of context.sections) {
      total += section.tokens;
    }

    for (const turn of context.turns) {
      total += turn.tokens;
    }

    for (const file of context.files) {
      total += file.tokens;
    }

    for (const toolResult of context.toolResults) {
      total += toolResult.tokens;
    }

    return total;
  }

  /**
   * Determine which strategies were applied
   */
  private determineStrategiesApplied(strategy: OptimizationStrategy): CompressionAlgorithm[] {
    switch (strategy) {
      case 'aggressive':
        return ['minification', 'deduplication', 'truncation'];
      case 'balanced':
        return ['minification', 'deduplication'];
      case 'conservative':
        return ['minification'];
      default:
        return ['minification'];
    }
  }

  /**
   * Estimate quality score for strategy
   */
  private estimateQuality(strategy: OptimizationStrategy): number {
    switch (strategy) {
      case 'aggressive':
        return 0.6;
      case 'balanced':
        return 0.8;
      case 'conservative':
        return 0.95;
      default:
        return 0.8;
    }
  }

  /**
   * Record optimization run to database
   */
  private recordOptimizationRun(data: {
    runId: string;
    sessionId?: string;
    inputTokens: number;
    outputTokens: number;
    strategy: OptimizationStrategy;
    strategiesApplied: CompressionAlgorithm[];
    quality: number;
    warnings: string[];
    errors: string[];
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO optimization_runs (
        id, session_id, started_at, completed_at,
        input_tokens, output_tokens, tokens_saved, savings_percent,
        strategy, strategies_applied, quality_score,
        warnings, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tokensSaved = data.inputTokens - data.outputTokens;
    const savingsPercent = (tokensSaved / data.inputTokens) * 100;

    stmt.run(
      data.runId,
      data.sessionId || null,
      new Date().toISOString(),
      new Date().toISOString(),
      data.inputTokens,
      data.outputTokens,
      tokensSaved,
      savingsPercent,
      data.strategy,
      JSON.stringify(data.strategiesApplied),
      data.quality,
      JSON.stringify(data.warnings),
      JSON.stringify(data.errors)
    );
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    callback: OptimizationProgressCallback | undefined,
    type: OptimizationEvent['type'],
    message: string,
    progress?: number
  ): void {
    if (callback) {
      callback({
        type,
        message,
        progress,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Create a new optimizer instance
 */
export function createOptimizer(config?: Partial<OptimizerConfig>): ContextOptimizer {
  return new ContextOptimizer(config);
}

/**
 * Export default instance
 */
export default createOptimizer();
