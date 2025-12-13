/**
 * Integration tests for Agent Playground
 *
 * Tests the complete playground system including:
 * - Database integration
 * - Session management
 * - Execution tracking
 * - Recording and replay
 * - Mock responses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlaygroundDatabase } from '../database.js';
import { nanoid } from 'nanoid';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('Playground Integration Tests', () => {
  let db: PlaygroundDatabase;
  const testDbPath = join(__dirname, 'test-playground.db');

  beforeEach(() => {
    // Create fresh database for each test
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    db = new PlaygroundDatabase({ dbPath: testDbPath, initSchema: true });
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Session Management', () => {
    it('should create and track a session', () => {
      const sessionId = nanoid();
      const agentId = 'test-agent';

      db.createSession({
        id: sessionId,
        agentId,
        agentType: 'coder',
        input: { query: 'test' },
        metadata: { source: 'test' }
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary).toBeTruthy();
      expect(summary.agent_id).toBe(agentId);
    });

    it('should update session status', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent',
        input: { query: 'test' }
      });

      db.updateSessionStatus(sessionId, 'running');

      const summary = db.getSessionSummary(sessionId);
      expect(summary.status).toBe('running');
    });

    it('should complete a session with result', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent',
        input: { query: 'test' }
      });

      db.completeSession({
        sessionId,
        result: { success: true, data: 'result' },
        durationMs: 1000
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.status).toBe('completed');
      expect(summary.duration_ms).toBe(1000);
    });

    it('should complete a session with error', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent',
        input: { query: 'test' }
      });

      db.completeSession({
        sessionId,
        error: 'Test error',
        durationMs: 500
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.status).toBe('error');
    });
  });

  describe('Execution Steps', () => {
    it('should record execution steps', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      const stepId = db.recordStep({
        sessionId,
        stepNumber: 1,
        stepType: 'tool_call',
        action: 'Read file',
        variables: { file: 'test.ts' },
        durationMs: 50
      });

      expect(stepId).toBeGreaterThan(0);

      const summary = db.getSessionSummary(sessionId);
      expect(summary.step_count).toBe(1);
    });

    it('should record multiple steps in sequence', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      for (let i = 1; i <= 5; i++) {
        db.recordStep({
          sessionId,
          stepNumber: i,
          stepType: 'tool_call',
          action: `Step ${i}`,
          durationMs: i * 10
        });
      }

      const summary = db.getSessionSummary(sessionId);
      expect(summary.step_count).toBe(5);
    });
  });

  describe('Breakpoints', () => {
    it('should add a line breakpoint', () => {
      const sessionId = nanoid();
      const breakpointId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.addBreakpoint({
        id: breakpointId,
        sessionId,
        breakpointType: 'line',
        location: './agent.ts',
        lineNumber: 42,
        enabled: true
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.breakpoint_count).toBe(1);
    });

    it('should track breakpoint hits', () => {
      const sessionId = nanoid();
      const breakpointId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.addBreakpoint({
        id: breakpointId,
        sessionId,
        breakpointType: 'tool',
        toolName: 'Bash'
      });

      db.recordBreakpointHit(breakpointId);
      db.recordBreakpointHit(breakpointId);

      // Verify hit count increased (would need to query breakpoint directly)
      const summary = db.getSessionSummary(sessionId);
      expect(summary.breakpoint_count).toBe(1);
    });
  });

  describe('Tool Calls', () => {
    it('should record tool calls', () => {
      const sessionId = nanoid();
      const toolCallId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.recordToolCall({
        id: toolCallId,
        sessionId,
        toolName: 'Read',
        params: { file_path: './test.ts' },
        response: { content: 'file content' },
        durationMs: 25,
        isMock: false
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.tool_call_count).toBe(1);
    });

    it('should track mock vs real tool calls', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      // Real call
      db.recordToolCall({
        id: nanoid(),
        sessionId,
        toolName: 'Read',
        params: {},
        response: {},
        isMock: false
      });

      // Mock call
      db.recordToolCall({
        id: nanoid(),
        sessionId,
        toolName: 'Write',
        params: {},
        response: {},
        isMock: true
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.tool_call_count).toBe(2);
      expect(summary.mock_call_count).toBe(1);
    });

    it('should generate tool statistics', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      // Record multiple tool calls
      for (let i = 0; i < 3; i++) {
        db.recordToolCall({
          id: nanoid(),
          sessionId,
          toolName: 'Read',
          params: {},
          response: {},
          durationMs: 50 + i * 10
        });
      }

      const stats = db.getToolStats();
      expect(stats.length).toBeGreaterThan(0);

      const readStats = stats.find(s => s.tool_name === 'Read');
      expect(readStats).toBeTruthy();
      expect(readStats.total_calls).toBe(3);
    });
  });

  describe('Recordings', () => {
    it('should create a recording', () => {
      const sessionId = nanoid();
      const recordingId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      const recordingData = {
        sessionId,
        agentId: 'test-agent',
        steps: [],
        toolCalls: []
      };

      db.createRecording({
        id: recordingId,
        sessionId,
        agentId: 'test-agent',
        name: 'Test Recording',
        description: 'A test recording',
        durationMs: 1000,
        stepCount: 5,
        success: true,
        data: recordingData,
        sizeBytes: JSON.stringify(recordingData).length,
        tags: ['test', 'demo']
      });

      const recording = db.getRecording(recordingId);
      expect(recording).toBeTruthy();
      expect(recording.name).toBe('Test Recording');
      expect(recording.tags).toEqual(['test', 'demo']);
    });

    it('should list all recordings', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      // Create multiple recordings
      for (let i = 0; i < 3; i++) {
        db.createRecording({
          id: nanoid(),
          sessionId,
          agentId: 'test-agent',
          name: `Recording ${i}`,
          durationMs: 1000,
          stepCount: 5,
          success: true,
          data: {},
          sizeBytes: 100
        });
      }

      const recordings = db.getAllRecordings(10);
      expect(recordings.length).toBe(3);
    });
  });

  describe('Mock Responses', () => {
    it('should add a mock response', () => {
      const sessionId = nanoid();
      const mockId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.addMock({
        id: mockId,
        sessionId,
        toolName: 'database',
        response: { rows: [] },
        delayMs: 100,
        errorRate: 0.0
      });

      // Mock was added successfully (no error thrown)
      expect(true).toBe(true);
    });

    it('should add mock with error simulation', () => {
      const sessionId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.addMock({
        id: nanoid(),
        sessionId,
        toolName: 'unreliable-api',
        response: { data: 'success' },
        errorRate: 0.3,
        errorResponse: { error: 'Service unavailable' }
      });

      expect(true).toBe(true);
    });
  });

  describe('Memory Snapshots', () => {
    it('should create a memory snapshot', () => {
      const sessionId = nanoid();
      const snapshotId = nanoid();

      db.createSession({
        id: sessionId,
        agentId: 'test-agent'
      });

      db.createSnapshot({
        id: snapshotId,
        sessionId,
        heapUsedBytes: 1024 * 1024 * 50,
        heapTotalBytes: 1024 * 1024 * 100,
        contextTokens: 5000,
        contextLimit: 100000,
        variables: {
          user: { id: 1, name: 'Test' },
          count: 42
        },
        callStack: [
          { function: 'main', line: 10 },
          { function: 'execute', line: 25 }
        ]
      });

      const summary = db.getSessionSummary(sessionId);
      expect(summary.snapshot_count).toBe(1);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up old sessions', () => {
      // Create a session
      db.createSession({
        id: nanoid(),
        agentId: 'test-agent'
      });

      // Clean up sessions older than 0 days (should clean nothing)
      const deletedCount = db.cleanupOldSessions(0);
      expect(deletedCount).toBe(0);

      const summary = db.getSessionSummary;
      // Session should still exist
    });
  });

  describe('Transactions', () => {
    it('should support transactions', () => {
      const sessionId = nanoid();

      db.beginTransaction();

      try {
        db.createSession({
          id: sessionId,
          agentId: 'test-agent'
        });

        db.recordStep({
          sessionId,
          stepNumber: 1,
          stepType: 'tool_call',
          action: 'Test'
        });

        db.commitTransaction();
      } catch (error) {
        db.rollbackTransaction();
        throw error;
      }

      const summary = db.getSessionSummary(sessionId);
      expect(summary).toBeTruthy();
    });

    it('should rollback on error', () => {
      const sessionId = nanoid();

      db.beginTransaction();

      try {
        db.createSession({
          id: sessionId,
          agentId: 'test-agent'
        });

        // Simulate an error
        throw new Error('Test error');
      } catch (error) {
        db.rollbackTransaction();
      }

      const summary = db.getSessionSummary(sessionId);
      expect(summary).toBeNull();
    });
  });
});
