/**
 * Tests for Hook Metrics Collector
 *
 * @module test_hook_metrics
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import {
  HookMetricsCollector,
  getGlobalCollector,
  resetGlobalCollector,
} from '../../lib/hook-metrics';

describe('Hook Metrics Collector', () => {
  let collector: HookMetricsCollector;
  const testMetricsDir = path.join(__dirname, '../tmp/metrics');

  beforeEach(() => {
    // Create fresh collector for each test
    collector = new HookMetricsCollector(testMetricsDir, { persist: false });
  });

  afterEach(() => {
    // Clean up test metrics
    if (fs.existsSync(testMetricsDir)) {
      const files = fs.readdirSync(testMetricsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testMetricsDir, file));
      });
      fs.rmdirSync(testMetricsDir, { recursive: true });
    }
  });

  describe('recordExecution', () => {
    it('should record successful execution', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);

      const metrics = collector.getMetrics('test-hook', 'UserPromptSubmit');
      assert.strictEqual(metrics.length, 1);
      assert.strictEqual(metrics[0].executionCount, 1);
      assert.strictEqual(metrics[0].successCount, 1);
      assert.strictEqual(metrics[0].failureCount, 0);
    });

    it('should record failed execution', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, false);

      const metrics = collector.getMetrics('test-hook', 'UserPromptSubmit');
      assert.strictEqual(metrics[0].failureCount, 1);
      assert.strictEqual(metrics[0].successCount, 0);
    });

    it('should record timeout', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 5000, false, true);

      const metrics = collector.getMetrics('test-hook', 'UserPromptSubmit');
      assert.strictEqual(metrics[0].timeoutCount, 1);
    });

    it('should track timing statistics', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);
      collector.recordExecution('test-hook', 'UserPromptSubmit', 200, true);
      collector.recordExecution('test-hook', 'UserPromptSubmit', 150, true);

      const metrics = collector.getMetrics('test-hook', 'UserPromptSubmit');
      assert.strictEqual(metrics[0].minDurationMs, 100);
      assert.strictEqual(metrics[0].maxDurationMs, 200);
      assert.strictEqual(metrics[0].avgDurationMs, 150); // (100+200+150)/3
    });

    it('should update lastExecuted timestamp', () => {
      const before = Date.now();
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);
      const after = Date.now();

      const metrics = collector.getMetrics('test-hook', 'UserPromptSubmit');
      assert.ok(metrics[0].lastExecuted >= before);
      assert.ok(metrics[0].lastExecuted <= after);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      collector.recordExecution('hook-a', 'UserPromptSubmit', 100, true);
      collector.recordExecution('hook-b', 'PostToolUse', 200, true);
      collector.recordExecution('hook-a', 'PostToolUse', 150, false);
    });

    it('should get all metrics when no filters provided', () => {
      const metrics = collector.getMetrics();
      assert.strictEqual(metrics.length, 3);
    });

    it('should filter by hook name', () => {
      const metrics = collector.getMetrics('hook-a');
      assert.strictEqual(metrics.length, 2);
      assert.ok(metrics.every(m => m.hookName === 'hook-a'));
    });

    it('should filter by event type', () => {
      const metrics = collector.getMetrics(undefined, 'PostToolUse');
      assert.strictEqual(metrics.length, 2);
      assert.ok(metrics.every(m => m.eventType === 'PostToolUse'));
    });

    it('should filter by both hook name and event type', () => {
      const metrics = collector.getMetrics('hook-a', 'PostToolUse');
      assert.strictEqual(metrics.length, 1);
      assert.strictEqual(metrics[0].hookName, 'hook-a');
      assert.strictEqual(metrics[0].eventType, 'PostToolUse');
    });
  });

  describe('getAggregateByEventType', () => {
    beforeEach(() => {
      collector.recordExecution('hook-a', 'UserPromptSubmit', 100, true);
      collector.recordExecution('hook-b', 'UserPromptSubmit', 200, true);
      collector.recordExecution('hook-c', 'UserPromptSubmit', 150, false);
      collector.recordExecution('hook-a', 'PostToolUse', 100, true);
    });

    it('should aggregate by event type', () => {
      const aggregate = collector.getAggregateByEventType();

      assert.ok(aggregate.UserPromptSubmit);
      assert.ok(aggregate.PostToolUse);

      assert.strictEqual(aggregate.UserPromptSubmit.totalExecutions, 3);
      assert.strictEqual(aggregate.UserPromptSubmit.totalSuccess, 2);
      assert.strictEqual(aggregate.UserPromptSubmit.totalFailures, 1);
    });

    it('should calculate success rate', () => {
      const aggregate = collector.getAggregateByEventType();

      // 2 success out of 3 executions = 66.67%
      assert.ok(aggregate.UserPromptSubmit.successRate > 66);
      assert.ok(aggregate.UserPromptSubmit.successRate < 67);
    });
  });

  describe('getAggregateByHookName', () => {
    beforeEach(() => {
      collector.recordExecution('hook-a', 'UserPromptSubmit', 100, true);
      collector.recordExecution('hook-a', 'PostToolUse', 200, true);
      collector.recordExecution('hook-b', 'UserPromptSubmit', 150, false);
    });

    it('should aggregate by hook name', () => {
      const aggregate = collector.getAggregateByHookName();

      assert.ok(aggregate['hook-a']);
      assert.ok(aggregate['hook-b']);

      assert.strictEqual(aggregate['hook-a'].totalExecutions, 2);
      assert.strictEqual(aggregate['hook-a'].totalSuccess, 2);
    });
  });

  describe('getGlobalAggregate', () => {
    beforeEach(() => {
      collector.recordExecution('hook-a', 'UserPromptSubmit', 100, true);
      collector.recordExecution('hook-b', 'PostToolUse', 200, false);
      collector.recordExecution('hook-c', 'PreToolUse', 150, true);
    });

    it('should provide global statistics', () => {
      const aggregate = collector.getGlobalAggregate();

      assert.strictEqual(aggregate.totalExecutions, 3);
      assert.strictEqual(aggregate.totalSuccess, 2);
      assert.strictEqual(aggregate.totalFailures, 1);
      assert.ok(aggregate.successRate > 66 && aggregate.successRate < 67);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);
      collector.recordExecution('test-hook', 'UserPromptSubmit', 200, false);

      const history = collector.getExecutionHistory('test-hook', 'UserPromptSubmit');

      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].durationMs, 100);
      assert.strictEqual(history[0].success, true);
      assert.strictEqual(history[1].durationMs, 200);
      assert.strictEqual(history[1].success, false);
    });

    it('should limit history results', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);
      }

      const history = collector.getExecutionHistory('test-hook', 'UserPromptSubmit', 5);
      assert.strictEqual(history.length, 5);
    });
  });

  describe('persist and load', () => {
    it('should persist metrics to disk', () => {
      const persistentCollector = new HookMetricsCollector(testMetricsDir, { persist: true });
      persistentCollector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);

      persistentCollector.persist();

      const metricsFile = path.join(testMetricsDir, 'hook-metrics.json');
      assert.ok(fs.existsSync(metricsFile));
    });

    it('should load persisted metrics', () => {
      // Create and persist
      const collector1 = new HookMetricsCollector(testMetricsDir, { persist: true });
      collector1.recordExecution('test-hook', 'UserPromptSubmit', 100, true);
      collector1.persist();

      // Load in new collector
      const collector2 = new HookMetricsCollector(testMetricsDir, { persist: true });
      const metrics = collector2.getMetrics('test-hook', 'UserPromptSubmit');

      assert.strictEqual(metrics.length, 1);
      assert.strictEqual(metrics[0].executionCount, 1);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      collector.recordExecution('test-hook', 'UserPromptSubmit', 100, true);

      assert.ok(collector.getMetrics().length > 0);

      collector.clear();

      assert.strictEqual(collector.getMetrics().length, 0);
    });
  });

  describe('generateReport', () => {
    it('should generate readable report', () => {
      collector.recordExecution('hook-a', 'UserPromptSubmit', 100, true);
      collector.recordExecution('hook-b', 'PostToolUse', 200, false);

      const report = collector.generateReport();

      assert.ok(report.includes('Hook Metrics Report'));
      assert.ok(report.includes('Global Statistics'));
      assert.ok(report.includes('UserPromptSubmit'));
      assert.ok(report.includes('PostToolUse'));
    });
  });

  describe('globalCollector', () => {
    afterEach(() => {
      resetGlobalCollector();
    });

    it('should provide singleton instance', () => {
      const collector1 = getGlobalCollector();
      const collector2 = getGlobalCollector();

      assert.strictEqual(collector1, collector2);
    });

    it('should reset singleton', () => {
      const collector1 = getGlobalCollector();
      resetGlobalCollector();
      const collector2 = getGlobalCollector();

      assert.notStrictEqual(collector1, collector2);
    });
  });
});
