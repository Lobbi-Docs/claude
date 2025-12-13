/**
 * Context Window Optimizer - Test Suite
 *
 * Comprehensive tests for all optimization components.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

import { createTokenCounter } from '../token-counter';
import { createContextAnalyzer } from '../context-analyzer';
import { createCompressor } from '../compressor';
import { createBudgetManager } from '../budget-manager';
import { createOptimizer } from '../optimizer';
import {
  ConversationContext,
  ConversationTurn,
  ContextSection,
  FileContext,
  ToolResultContext,
} from '../types';

// Helper function to create test context
function createTestContext(options?: {
  turnCount?: number;
  fileCount?: number;
  toolResultCount?: number;
}): ConversationContext {
  const turnCount = options?.turnCount || 5;
  const fileCount = options?.fileCount || 2;
  const toolResultCount = options?.toolResultCount || 3;

  const turns: ConversationTurn[] = [];
  for (let i = 0; i < turnCount; i++) {
    turns.push({
      index: i,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `This is turn ${i} with some content that will take up tokens. `.repeat(20),
      tokens: 500,
      timestamp: new Date().toISOString(),
    });
  }

  const files: FileContext[] = [];
  for (let i = 0; i < fileCount; i++) {
    files.push({
      path: `/path/to/file${i}.ts`,
      content: `export function test${i}() {\n  console.log('test');\n}\n`.repeat(10),
      tokens: 300,
      hash: `hash${i}`,
      lastModified: new Date().toISOString(),
    });
  }

  const toolResults: ToolResultContext[] = [];
  for (let i = 0; i < toolResultCount; i++) {
    toolResults.push({
      tool: `tool${i}`,
      result: { data: `Result from tool ${i}`.repeat(50) },
      tokens: 400,
      timestamp: new Date().toISOString(),
    });
  }

  const sections: ContextSection[] = [
    {
      id: 'system',
      type: 'system',
      content: 'System instructions go here',
      tokens: 100,
      percentage: 1,
    },
    {
      id: 'conversation',
      type: 'conversation',
      content: turns.map((t) => t.content).join('\n'),
      tokens: turns.reduce((sum, t) => sum + t.tokens, 0),
      percentage: 50,
    },
  ];

  const totalTokens =
    sections.reduce((sum, s) => sum + s.tokens, 0) +
    files.reduce((sum, f) => sum + f.tokens, 0) +
    toolResults.reduce((sum, t) => sum + t.tokens, 0);

  return {
    sessionId: 'test-session',
    sections,
    totalTokens,
    turns,
    files,
    toolResults,
    timestamp: new Date().toISOString(),
  };
}

describe('TokenCounter', () => {
  it('should count tokens in text', () => {
    const counter = createTokenCounter();
    const result = counter.count('Hello world, this is a test.');

    expect(result.total).toBeGreaterThan(0);
    expect(result.characters).toBe(28);
    expect(result.encoding).toBe('cl100k_base');
  });

  it('should cache token counts', () => {
    const counter = createTokenCounter();
    const text = 'Hello world';

    const result1 = counter.count(text);
    const result2 = counter.count(text);

    expect(result1.total).toBe(result2.total);

    const stats = counter.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should count batch tokens', () => {
    const counter = createTokenCounter();
    const texts = ['Hello world', 'Goodbye world', 'Test message'];

    const result = counter.countBatch(texts);

    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBe(3);
    expect(result.average).toBeGreaterThan(0);
  });

  it('should handle different content types', () => {
    const counter = createTokenCounter();

    const code = 'function test() { return 42; }';
    const prose = 'This is a simple sentence.';
    const json = '{"key": "value", "number": 42}';

    const codeResult = counter.count(code, 'code');
    const proseResult = counter.count(prose, 'prose');
    const jsonResult = counter.count(json, 'json');

    expect(codeResult.total).toBeGreaterThan(0);
    expect(proseResult.total).toBeGreaterThan(0);
    expect(jsonResult.total).toBeGreaterThan(0);
  });
});

describe('ContextAnalyzer', () => {
  it('should analyze context usage', () => {
    const analyzer = createContextAnalyzer();
    const context = createTestContext();

    const report = analyzer.analyzeUsage(context, 100000);

    expect(report.totalTokens).toBeGreaterThan(0);
    expect(report.budgetLimit).toBe(100000);
    expect(report.budgetUsedPercent).toBeGreaterThan(0);
    expect(report.warningLevel).toBeDefined();
    expect(report.breakdown).toBeDefined();
  });

  it('should detect high-cost patterns', () => {
    const analyzer = createContextAnalyzer();
    const context = createTestContext({ turnCount: 20 });

    const report = analyzer.analyzeUsage(context, 100000);

    expect(report.highCostPatterns).toBeDefined();
    expect(Array.isArray(report.highCostPatterns)).toBe(true);
  });

  it('should generate recommendations', () => {
    const analyzer = createContextAnalyzer();
    const context = createTestContext();

    const report = analyzer.analyzeUsage(context, 5000); // Small budget to trigger warnings

    expect(report.recommendations).toBeDefined();
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should calculate information density', () => {
    const analyzer = createContextAnalyzer();
    const content = 'This is a test. This is only a test.';

    const density = analyzer.calculateDensity(content);

    expect(density.score).toBeGreaterThanOrEqual(0);
    expect(density.score).toBeLessThanOrEqual(1);
    expect(density.redundancy).toBeGreaterThanOrEqual(0);
    expect(density.compressibility).toBeGreaterThanOrEqual(0);
  });
});

describe('Compressor', () => {
  it('should compress content with minification', async () => {
    const compressor = createCompressor();
    const content = `
      // This is a comment
      function test() {
        return 42;
      }
    `;

    const result = await compressor.compress(content, 'minification', 'code');

    expect(result.compressedTokens).toBeLessThan(result.originalTokens);
    expect(result.tokensSaved).toBeGreaterThan(0);
    expect(result.quality).toBeGreaterThan(0.9);
  });

  it('should handle batch compression', async () => {
    const compressor = createCompressor();
    const contents = [
      'function a() { return 1; }',
      'function b() { return 2; }',
      'function c() { return 3; }',
    ];

    const result = await compressor.compressBatch(contents, 'minification', ['code', 'code', 'code']);

    expect(result.results.length).toBe(3);
    expect(result.totalTokensSaved).toBeGreaterThan(0);
    expect(result.averageQuality).toBeGreaterThan(0);
  });

  it('should apply different strategies', async () => {
    const compressor = createCompressor();
    const content = 'This is a test content. '.repeat(10);

    const aggressive = await compressor.applyStrategy(content, 'aggressive');
    const balanced = await compressor.applyStrategy(content, 'balanced');
    const conservative = await compressor.applyStrategy(content, 'conservative');

    expect(aggressive.quality).toBeLessThan(balanced.quality);
    expect(balanced.quality).toBeLessThan(conservative.quality);
    expect(aggressive.compressionRatio).toBeLessThan(conservative.compressionRatio);
  });

  it('should create and resolve references', async () => {
    const compressor = createCompressor();
    const content = 'This is reusable content';

    const result = await compressor.compress(content, 'reference');

    expect(result.compressed).toMatch(/^REF:/);

    const resolved = compressor.resolveReference(result.compressed);
    expect(resolved).toBe(content);
  });
});

describe('BudgetManager', () => {
  it('should track budget allocation', () => {
    const manager = createBudgetManager();
    const allocation = manager.getCurrentAllocation();

    expect(allocation.config.total).toBe(100000);
    expect(allocation.totalAvailable).toBe(100000);
    expect(allocation.warningLevel).toBe('safe');
  });

  it('should allocate and free tokens', () => {
    const manager = createBudgetManager();

    const allocated = manager.allocate('conversation', 1000);
    expect(allocated).toBe(true);

    const used = manager.getTotalUsed();
    expect(used).toBe(1000);

    manager.free('conversation', 500);
    const usedAfterFree = manager.getTotalUsed();
    expect(usedAfterFree).toBe(500);
  });

  it('should prevent over-allocation', () => {
    const manager = createBudgetManager();

    const canAllocate = manager.canAllocate('system', 10000);
    expect(canAllocate).toBe(false); // System budget is only 5000
  });

  it('should determine warning levels', () => {
    const manager = createBudgetManager();

    manager.updateUsage('conversation', 50000);
    manager.updateUsage('toolResults', 25000);

    const level = manager.getWarningLevel();
    expect(level).toBe('warning'); // 75K/100K = 75%
  });

  it('should visualize budget', () => {
    const manager = createBudgetManager();
    const visualization = manager.visualize();

    expect(visualization).toContain('Context Budget');
    expect(visualization).toContain('System Instructions');
    expect(visualization).toContain('Conversation History');
  });
});

describe('ContextOptimizer', () => {
  let dbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    // Create temporary database
    dbPath = join(tmpdir(), `test-optimizer-${Date.now()}.db`);
    db = new Database(dbPath);

    // Create minimal schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS optimization_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        tokens_saved INTEGER,
        savings_percent REAL,
        strategy TEXT,
        strategies_applied TEXT,
        quality_score REAL,
        warnings TEXT,
        errors TEXT
      );
    `);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  it('should create optimizer instance', () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    expect(optimizer).toBeDefined();
    optimizer.close();
  });

  it('should analyze context usage', () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const context = createTestContext();

    const report = optimizer.analyzeUsage(context);

    expect(report.totalTokens).toBeGreaterThan(0);
    expect(report.budgetLimit).toBe(100000);
    expect(report.breakdown).toBeDefined();

    optimizer.close();
  });

  it('should optimize context', async () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const context = createTestContext({ turnCount: 10 });

    const result = await optimizer.optimize(context, 'balanced');

    expect(result.originalTokens).toBeGreaterThan(0);
    expect(result.optimizedTokens).toBeLessThanOrEqual(result.originalTokens);
    expect(result.savings).toBeGreaterThanOrEqual(0);
    expect(result.strategies.length).toBeGreaterThan(0);

    optimizer.close();
  });

  it('should handle optimization progress callbacks', async () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const context = createTestContext();

    const events: string[] = [];

    await optimizer.optimize(context, 'balanced', (event) => {
      events.push(event.type);
    });

    expect(events).toContain('start');
    expect(events).toContain('progress');
    expect(events).toContain('complete');

    optimizer.close();
  });

  it('should support different optimization strategies', async () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const context = createTestContext();

    const aggressive = await optimizer.optimize(context, 'aggressive');
    const balanced = await optimizer.optimize(context, 'balanced');
    const conservative = await optimizer.optimize(context, 'conservative');

    expect(aggressive.savingsPercent).toBeGreaterThan(balanced.savingsPercent);
    expect(balanced.savingsPercent).toBeGreaterThan(conservative.savingsPercent);

    optimizer.close();
  });
});

describe('Integration Tests', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `test-integration-${Date.now()}.db`);
  });

  afterEach(() => {
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  it('should perform full optimization workflow', async () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const context = createTestContext({ turnCount: 15, fileCount: 5 });

    // 1. Analyze
    const report = optimizer.analyzeUsage(context);
    expect(report.totalTokens).toBeGreaterThan(0);

    // 2. Optimize
    const result = await optimizer.optimize(context, 'balanced');
    expect(result.savings).toBeGreaterThan(0);

    // 3. Check budget
    const allocation = optimizer.getBudgetAllocation();
    expect(allocation.totalAvailable).toBeGreaterThan(0);

    optimizer.close();
  });

  it('should handle large contexts efficiently', async () => {
    const optimizer = createOptimizer({ db: { dbPath } });
    const largeContext = createTestContext({
      turnCount: 50,
      fileCount: 10,
      toolResultCount: 20,
    });

    const startTime = Date.now();
    const result = await optimizer.optimize(largeContext, 'balanced');
    const duration = Date.now() - startTime;

    expect(result.savings).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

    optimizer.close();
  });
});
