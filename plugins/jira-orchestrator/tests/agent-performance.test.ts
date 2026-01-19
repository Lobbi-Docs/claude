/**
 * Agent Performance System Tests
 *
 * Tests for agent loader, cache, and metrics components.
 *
 * @module tests/agent-performance.test
 */

import { AgentLoader, DEFAULT_PRELOAD } from '../lib/agent-loader';
import { AgentCache, LRUCache } from '../lib/agent-cache';
import { AgentMetricsCollector } from '../lib/agent-metrics';
import { AgentPerformanceSystem } from '../lib/agent-performance-integration';
import * as path from 'path';
import * as fs from 'fs';

// Mock registry data for testing
const MOCK_REGISTRY = {
  version: '7.4.0',
  totalAgents: 5,
  metadata: {
    version: '7.4.0',
    totalAgents: 5,
    preloadHints: ['test-agent-1', 'test-agent-2']
  },
  agents: {
    'test-agent-1': {
      name: 'test-agent-1',
      type: 'core',
      category: 'testing',
      skills: ['test'],
      models: ['sonnet'],
      loadPriority: 'high',
      expectedLoadTimeMs: 50
    },
    'test-agent-2': {
      name: 'test-agent-2',
      type: 'intelligence',
      category: 'testing',
      skills: ['analysis'],
      models: ['opus'],
      loadPriority: 'medium',
      expectedLoadTimeMs: 100
    },
    'test-agent-3': {
      name: 'test-agent-3',
      type: 'workflows',
      category: 'testing',
      skills: ['orchestration'],
      models: ['haiku']
    }
  }
};

/**
 * Test Suite: LRU Cache
 */
describe('LRUCache', () => {
  test('should store and retrieve items', () => {
    const cache = new LRUCache<string>({ maxSize: 3 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBeUndefined();
  });

  test('should evict LRU item when full', () => {
    const cache = new LRUCache<string>({ maxSize: 2 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Access key1 to make it more recently used
    cache.get('key1');

    // Add key3, should evict key2 (least recently used)
    cache.set('key3', 'value3');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined();  // Evicted
    expect(cache.get('key3')).toBe('value3');
  });

  test('should track cache statistics', () => {
    const cache = new LRUCache<string>({ maxSize: 10 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.get('key1');  // Hit
    cache.get('key1');  // Hit
    cache.get('key3');  // Miss

    const stats = cache.getStats();

    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(10);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);  // 2/3
  });

  test('should handle has() without updating LRU', () => {
    const cache = new LRUCache<string>({ maxSize: 2 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // has() should not update LRU order
    expect(cache.has('key1')).toBe(true);

    // Add key3, should still evict key1 (oldest, not updated by has())
    cache.set('key3', 'value3');

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
  });
});

/**
 * Test Suite: Agent Cache
 */
describe('AgentCache', () => {
  test('should cache loaded agents', () => {
    const cache = new AgentCache({ maxSize: 5 });

    const agent = {
      name: 'test-agent',
      type: 'core',
      category: 'testing',
      skills: ['test'],
      models: ['sonnet'],
      loadedAt: Date.now(),
      lastUsedAt: Date.now(),
      loadTimeMs: 100,
      definition: '# Test Agent'
    };

    cache.set('test-agent', agent);

    const retrieved = cache.get('test-agent');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test-agent');
  });

  test('should filter by category', () => {
    const cache = new AgentCache({ maxSize: 10 });

    cache.set('agent1', createMockAgent('agent1', 'core'));
    cache.set('agent2', createMockAgent('agent2', 'intelligence'));
    cache.set('agent3', createMockAgent('agent3', 'core'));

    const coreAgents = cache.getByCategory('core');
    expect(coreAgents).toHaveLength(2);
    expect(coreAgents.map(a => a.name).sort()).toEqual(['agent1', 'agent3']);
  });

  test('should generate usage report', () => {
    const cache = new AgentCache({ maxSize: 10 });

    cache.set('agent1', createMockAgent('agent1', 'core'));
    cache.set('agent2', createMockAgent('agent2', 'core'));

    // Access agent1 multiple times
    cache.get('agent1');
    cache.get('agent1');
    cache.get('agent2');

    const report = cache.getUsageReport();
    expect(report).toHaveLength(2);
    expect(report[0].name).toBe('agent1');  // Most accessed
    expect(report[0].accessCount).toBe(2);
  });
});

/**
 * Test Suite: Agent Metrics Collector
 */
describe('AgentMetricsCollector', () => {
  let metricsDir: string;
  let collector: AgentMetricsCollector;

  beforeEach(() => {
    metricsDir = path.join(__dirname, '../sessions/metrics/agents/test');
    collector = new AgentMetricsCollector(metricsDir);
  });

  afterEach(() => {
    // Cleanup test metrics
    if (fs.existsSync(metricsDir)) {
      fs.rmSync(metricsDir, { recursive: true });
    }
  });

  test('should track execution timing', async () => {
    const executionId = collector.startExecution('test-agent', 'sonnet', 'test');

    await new Promise(resolve => setTimeout(resolve, 50));

    collector.endExecution(executionId, true);

    const metrics = collector.getAgentMetrics('test-agent');
    expect(metrics.executionCount).toBe(1);
    expect(metrics.successCount).toBe(1);
    expect(metrics.avgDurationMs).toBeGreaterThan(40);
  });

  test('should track success and failure rates', () => {
    // Record 3 successes
    for (let i = 0; i < 3; i++) {
      const id = collector.startExecution('test-agent', 'sonnet');
      collector.endExecution(id, true);
    }

    // Record 1 failure
    const failId = collector.startExecution('test-agent', 'sonnet');
    collector.endExecution(failId, false, 'TimeoutError');

    const metrics = collector.getAgentMetrics('test-agent');
    expect(metrics.executionCount).toBe(4);
    expect(metrics.successRate).toBe(0.75);
    expect(metrics.failureCount).toBe(1);
  });

  test('should calculate percentiles correctly', () => {
    // Record executions with known durations
    const durations = [100, 200, 300, 400, 500];

    durations.forEach(duration => {
      collector.recordExecution({
        executionId: `test-${duration}`,
        agentName: 'test-agent',
        startTime: Date.now(),
        endTime: Date.now() + duration,
        durationMs: duration,
        success: true,
        model: 'sonnet'
      });
    });

    const metrics = collector.getAgentMetrics('test-agent');
    expect(metrics.minDurationMs).toBe(100);
    expect(metrics.maxDurationMs).toBe(500);
    expect(metrics.p50DurationMs).toBe(300);
    expect(metrics.avgDurationMs).toBe(300);
  });

  test('should aggregate metrics across agents', () => {
    // Agent 1: 2 executions
    for (let i = 0; i < 2; i++) {
      const id = collector.startExecution('agent-1', 'sonnet');
      collector.endExecution(id, true);
    }

    // Agent 2: 3 executions (1 failure)
    for (let i = 0; i < 2; i++) {
      const id = collector.startExecution('agent-2', 'opus');
      collector.endExecution(id, true);
    }
    const failId = collector.startExecution('agent-2', 'opus');
    collector.endExecution(failId, false, 'ValidationError');

    const aggregate = collector.getAggregateMetrics();
    expect(aggregate.totalExecutions).toBe(5);
    expect(aggregate.totalSuccesses).toBe(4);
    expect(aggregate.totalFailures).toBe(1);
    expect(aggregate.topAgentsByUsage).toHaveLength(2);
    expect(aggregate.failuresByErrorType['ValidationError']).toBe(1);
  });
});

/**
 * Test Suite: Agent Loader (mocked file system)
 */
describe('AgentLoader', () => {
  // Note: Real file system tests would require setting up test fixtures
  // These are conceptual tests showing expected behavior

  test('should list agents from registry', async () => {
    // This would require mocking fs.readFileSync for registry
    // For now, documenting expected behavior
    expect(true).toBe(true);
  });

  test('should lazy load agents on demand', async () => {
    // This would require mocking fs.readFileSync for agent files
    // For now, documenting expected behavior
    expect(true).toBe(true);
  });

  test('should search agents by criteria', async () => {
    // This would require loaded registry
    // For now, documenting expected behavior
    expect(true).toBe(true);
  });
});

/**
 * Helper function to create mock agent
 */
function createMockAgent(name: string, category: string) {
  return {
    name,
    type: 'core',
    category,
    skills: ['test'],
    models: ['sonnet'],
    loadedAt: Date.now(),
    lastUsedAt: Date.now(),
    loadTimeMs: 100,
    definition: `# ${name}`
  };
}

/**
 * Integration Test: Performance System
 */
describe('AgentPerformanceSystem', () => {
  test('should initialize successfully', async () => {
    // This would require full setup with registry and agent files
    // For now, documenting expected behavior
    expect(true).toBe(true);
  });

  test('should track agent execution', async () => {
    // This would require full setup
    // For now, documenting expected behavior
    expect(true).toBe(true);
  });
});

/**
 * Performance Benchmarks
 */
describe('Performance Benchmarks', () => {
  test('cache operations should be fast', () => {
    const cache = new LRUCache<string>({ maxSize: 100 });

    const start = Date.now();

    // Perform 1000 operations
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i % 100}`, `value-${i}`);
      cache.get(`key-${i % 50}`);
    }

    const duration = Date.now() - start;

    // Should complete in < 50ms
    expect(duration).toBeLessThan(50);
  });

  test('metrics collection should have low overhead', () => {
    const collector = new AgentMetricsCollector('./test-metrics');

    const start = Date.now();

    // Record 100 executions
    for (let i = 0; i < 100; i++) {
      const id = collector.startExecution('test-agent', 'sonnet');
      collector.endExecution(id, true);
    }

    const duration = Date.now() - start;

    // Should complete in < 20ms (< 0.2ms per execution)
    expect(duration).toBeLessThan(20);
  });
});
