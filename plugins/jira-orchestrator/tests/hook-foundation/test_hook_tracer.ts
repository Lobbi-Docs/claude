/**
 * Tests for Hook Tracer
 *
 * @module test_hook_tracer
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { HookTracer, getGlobalTracer, resetGlobalTracer } from '../../lib/hook-tracer';

describe('Hook Tracer', () => {
  let tracer: HookTracer;
  const testTracesDir = path.join(__dirname, '../tmp/traces');

  beforeEach(() => {
    // Create fresh tracer for each test
    tracer = new HookTracer(testTracesDir);
  });

  afterEach(() => {
    // Clean up test traces
    if (fs.existsSync(testTracesDir)) {
      const files = fs.readdirSync(testTracesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testTracesDir, file));
      });
      fs.rmdirSync(testTracesDir, { recursive: true });
    }
  });

  describe('startTrace', () => {
    it('should create a new trace', () => {
      const trace = tracer.startTrace('test-hook', 'UserPromptSubmit', 'prompt');

      assert.ok(trace);
      assert.ok(trace.traceId);
      assert.ok(trace.spanId);
      assert.strictEqual(trace.hookName, 'test-hook');
      assert.strictEqual(trace.eventType, 'UserPromptSubmit');
      assert.strictEqual(trace.hookType, 'prompt');
      assert.strictEqual(trace.status, 'running');
      assert.ok(trace.startTime);
    });

    it('should create trace with parent span', () => {
      const parentTrace = tracer.startTrace('parent-hook', 'UserPromptSubmit', 'prompt');
      const childTrace = tracer.startTrace(
        'child-hook',
        'PostToolUse',
        'command',
        parentTrace.spanId
      );

      assert.strictEqual(childTrace.parentSpanId, parentTrace.spanId);
    });

    it('should create trace with metadata', () => {
      const metadata = { userId: 'test-user', sessionId: 'test-session' };
      const trace = tracer.startTrace(
        'test-hook',
        'UserPromptSubmit',
        'prompt',
        undefined,
        metadata
      );

      assert.deepStrictEqual(trace.metadata, metadata);
    });
  });

  describe('endTrace', () => {
    it('should end trace successfully', () => {
      const trace = tracer.startTrace('test-hook', 'UserPromptSubmit', 'prompt');

      // Wait a bit for duration
      setTimeout(() => {
        tracer.endTrace(trace, 'success');

        const retrieved = tracer.getTrace(trace.spanId);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.status, 'success');
        assert.ok(retrieved.endTime);
        assert.ok(retrieved.duration);
        assert.ok(retrieved.duration > 0);
      }, 10);
    });

    it('should end trace with error', () => {
      const trace = tracer.startTrace('test-hook', 'UserPromptSubmit', 'prompt');
      tracer.endTrace(trace, 'error', 'Test error message');

      const retrieved = tracer.getTrace(trace.spanId);
      assert.strictEqual(retrieved?.status, 'error');
      assert.strictEqual(retrieved?.error, 'Test error message');
    });

    it('should move trace to completed list', () => {
      const trace = tracer.startTrace('test-hook', 'UserPromptSubmit', 'prompt');

      assert.strictEqual(tracer.getActiveTraces().length, 1);
      assert.strictEqual(tracer.getCompletedTraces().length, 0);

      tracer.endTrace(trace, 'success');

      assert.strictEqual(tracer.getActiveTraces().length, 0);
      assert.strictEqual(tracer.getCompletedTraces().length, 1);
    });
  });

  describe('getTracesByHook', () => {
    it('should filter traces by hook name', () => {
      tracer.startTrace('hook-a', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('hook-b', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('hook-a', 'PostToolUse', 'command');

      const hookATraces = tracer.getTracesByHook('hook-a');
      assert.strictEqual(hookATraces.length, 2);
      assert.ok(hookATraces.every(t => t.hookName === 'hook-a'));
    });
  });

  describe('getTracesByEvent', () => {
    it('should filter traces by event type', () => {
      tracer.startTrace('hook-a', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('hook-b', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('hook-a', 'PostToolUse', 'command');

      const promptTraces = tracer.getTracesByEvent('UserPromptSubmit');
      assert.strictEqual(promptTraces.length, 2);
      assert.ok(promptTraces.every(t => t.eventType === 'UserPromptSubmit'));
    });
  });

  describe('exportTraces', () => {
    it('should export traces to JSON file', () => {
      tracer.startTrace('test-hook', 'UserPromptSubmit', 'prompt');

      const exportPath = tracer.exportTraces();

      assert.ok(fs.existsSync(exportPath));
      const content = fs.readFileSync(exportPath, 'utf-8');
      const traces = JSON.parse(content);

      assert.ok(Array.isArray(traces));
      assert.strictEqual(traces.length, 1);
    });

    it('should export traces in NDJSON format', () => {
      tracer.startTrace('test-hook-1', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('test-hook-2', 'PostToolUse', 'command');

      const exportPath = path.join(testTracesDir, 'test-ndjson.json');
      tracer.exportTraces(exportPath, { format: 'ndjson' });

      assert.ok(fs.existsSync(exportPath));
      const content = fs.readFileSync(exportPath, 'utf-8');
      const lines = content.trim().split('\n');

      assert.strictEqual(lines.length, 2);
      lines.forEach(line => {
        assert.doesNotThrow(() => JSON.parse(line));
      });
    });
  });

  describe('getStatistics', () => {
    it('should provide accurate statistics', () => {
      const trace1 = tracer.startTrace('hook-a', 'UserPromptSubmit', 'prompt');
      const trace2 = tracer.startTrace('hook-b', 'PostToolUse', 'command');
      tracer.endTrace(trace1, 'success');
      tracer.endTrace(trace2, 'error');

      const stats = tracer.getStatistics();

      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.active, 0);
      assert.strictEqual(stats.completed, 2);
      assert.strictEqual(stats.byStatus.success, 1);
      assert.strictEqual(stats.byStatus.error, 1);
    });
  });

  describe('clearAll', () => {
    it('should clear all traces', () => {
      tracer.startTrace('hook-a', 'UserPromptSubmit', 'prompt');
      tracer.startTrace('hook-b', 'PostToolUse', 'command');

      assert.ok(tracer.getAllTraces().length > 0);

      tracer.clearAll();

      assert.strictEqual(tracer.getAllTraces().length, 0);
    });
  });

  describe('globalTracer', () => {
    afterEach(() => {
      resetGlobalTracer();
    });

    it('should provide singleton instance', () => {
      const tracer1 = getGlobalTracer();
      const tracer2 = getGlobalTracer();

      assert.strictEqual(tracer1, tracer2);
    });

    it('should reset singleton', () => {
      const tracer1 = getGlobalTracer();
      resetGlobalTracer();
      const tracer2 = getGlobalTracer();

      assert.notStrictEqual(tracer1, tracer2);
    });
  });
});
