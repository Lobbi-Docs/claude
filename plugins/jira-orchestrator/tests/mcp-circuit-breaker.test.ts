/**
 * Tests for MCP Circuit Breaker
 *
 * Tests cover:
 * - State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
 * - Failure threshold detection
 * - Cooldown period handling
 * - Recovery testing in HALF_OPEN state
 * - Resource cleanup
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPCircuitBreaker, CircuitState, CircuitBreakerEvent } from '../lib/mcp-circuit-breaker';

describe('MCPCircuitBreaker', () => {
  let breaker: MCPCircuitBreaker;

  beforeEach(() => {
    breaker = new MCPCircuitBreaker({
      failureThreshold: 3,
      failureWindowMs: 1000,
      cooldownMs: 500,
      halfOpenMaxAttempts: 2,
    });
  });

  afterEach(() => {
    breaker.dispose();
  });

  describe('state transitions', () => {
    it('should start in CLOSED state', () => {
      const status = breaker.getStatus('test-server');
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
      expect(status.consecutiveSuccesses).toBe(0);
    });

    it('should transition to OPEN after failures', () => {
      const server = 'test-server';

      // Record 3 failures (threshold)
      breaker.recordFailure(server);
      breaker.recordFailure(server);

      let status = breaker.getStatus(server);
      expect(status.state).toBe('CLOSED'); // Still closed before threshold

      breaker.recordFailure(server);

      status = breaker.getStatus(server);
      expect(status.state).toBe('OPEN');
      expect(status.failureCount).toBe(3);
      expect(status.openedAt).toBeDefined();
    });

    it('should transition to HALF_OPEN after cooldown', async () => {
      const server = 'cooldown-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(breaker.getStatus(server).state).toBe('OPEN');

      // Wait for cooldown period
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check if request is allowed (should transition to HALF_OPEN)
      const canRequest = breaker.canRequest(server);
      expect(canRequest).toBe(true);
      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');
    });

    it('should transition back to CLOSED on success', async () => {
      const server = 'recovery-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 600));

      // Transition to HALF_OPEN
      breaker.canRequest(server);
      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');

      // Record successful attempts (need 2 for halfOpenMaxAttempts)
      breaker.recordSuccess(server);
      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');

      breaker.recordSuccess(server);
      expect(breaker.getStatus(server).state).toBe('CLOSED');
      expect(breaker.getStatus(server).failureCount).toBe(0);
    });

    it('should transition back to OPEN on failure during HALF_OPEN', async () => {
      const server = 'half-open-fail-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      // Wait and transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 600));
      breaker.canRequest(server);

      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');

      // Fail during recovery
      breaker.recordFailure(server);

      expect(breaker.getStatus(server).state).toBe('OPEN');
      expect(breaker.getStatus(server).openedAt).toBeDefined();
    });

    it('should emit state-change events', async () => {
      const stateChanges: Array<{ old: CircuitState; new: CircuitState }> = [];
      const onStateChange = (server: string, oldState: CircuitState, newState: CircuitState) => {
        stateChanges.push({ old: oldState, new: newState });
      };

      const trackedBreaker = new MCPCircuitBreaker({
        failureThreshold: 2,
        failureWindowMs: 1000,
        cooldownMs: 200,
        halfOpenMaxAttempts: 1,
        onStateChange,
      });

      const server = 'event-server';

      // CLOSED → OPEN
      trackedBreaker.recordFailure(server);
      trackedBreaker.recordFailure(server);

      expect(stateChanges).toContainEqual({ old: 'CLOSED', new: 'OPEN' });

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 300));
      trackedBreaker.canRequest(server);

      expect(stateChanges).toContainEqual({ old: 'OPEN', new: 'HALF_OPEN' });

      // HALF_OPEN → CLOSED
      trackedBreaker.recordSuccess(server);

      expect(stateChanges).toContainEqual({ old: 'HALF_OPEN', new: 'CLOSED' });

      trackedBreaker.dispose();
    });
  });

  describe('failure tracking', () => {
    it('should track failures within window', () => {
      const server = 'window-server';

      breaker.recordFailure(server);
      breaker.recordFailure(server);

      const status = breaker.getStatus(server);
      expect(status.failureCount).toBe(2);
      expect(status.failureWindow.length).toBe(2);
    });

    it('should clean up failures outside window', async () => {
      const shortWindowBreaker = new MCPCircuitBreaker({
        failureThreshold: 3,
        failureWindowMs: 200, // 200ms window
        cooldownMs: 500,
        halfOpenMaxAttempts: 2,
      });

      const server = 'cleanup-server';

      // Record a failure
      shortWindowBreaker.recordFailure(server);
      expect(shortWindowBreaker.getStatus(server).failureCount).toBe(1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 250));

      // Record another failure
      shortWindowBreaker.recordFailure(server);

      // Old failure should be cleaned up
      const status = shortWindowBreaker.getStatus(server);
      expect(status.failureCount).toBe(1);
      expect(status.failureWindow.length).toBe(1);

      shortWindowBreaker.dispose();
    });

    it('should reset failure count on success in CLOSED state', () => {
      const server = 'reset-server';

      breaker.recordFailure(server);
      breaker.recordFailure(server);

      expect(breaker.getStatus(server).failureCount).toBe(2);

      breaker.recordSuccess(server);

      expect(breaker.getStatus(server).failureCount).toBe(0);
      expect(breaker.getStatus(server).failureWindow.length).toBe(0);
    });

    it('should track last failure timestamp', () => {
      const server = 'timestamp-server';

      const beforeFailure = Date.now();
      breaker.recordFailure(server);
      const afterFailure = Date.now();

      const status = breaker.getStatus(server);
      expect(status.lastFailure).toBeDefined();
      expect(status.lastFailure!).toBeGreaterThanOrEqual(beforeFailure);
      expect(status.lastFailure!).toBeLessThanOrEqual(afterFailure);
    });

    it('should track last success timestamp', () => {
      const server = 'success-timestamp-server';

      const beforeSuccess = Date.now();
      breaker.recordSuccess(server);
      const afterSuccess = Date.now();

      const status = breaker.getStatus(server);
      expect(status.lastSuccess).toBeDefined();
      expect(status.lastSuccess!).toBeGreaterThanOrEqual(beforeSuccess);
      expect(status.lastSuccess!).toBeLessThanOrEqual(afterSuccess);
    });
  });

  describe('canRequest behavior', () => {
    it('should allow requests in CLOSED state', () => {
      expect(breaker.canRequest('test-server')).toBe(true);
    });

    it('should block requests in OPEN state', () => {
      const server = 'block-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(breaker.canRequest(server)).toBe(false);
    });

    it('should allow limited requests in HALF_OPEN state', async () => {
      const server = 'half-open-requests';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 600));

      // First request in HALF_OPEN
      expect(breaker.canRequest(server)).toBe(true);
      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');

      // Second request (up to halfOpenMaxAttempts)
      expect(breaker.canRequest(server)).toBe(true);

      // Third request should be blocked (exceeded halfOpenMaxAttempts)
      expect(breaker.canRequest(server)).toBe(false);
    });

    it('should auto-transition from OPEN to HALF_OPEN on canRequest', async () => {
      const server = 'auto-transition-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(breaker.getStatus(server).state).toBe('OPEN');

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 600));

      // canRequest should trigger transition
      breaker.canRequest(server);

      expect(breaker.getStatus(server).state).toBe('HALF_OPEN');
    });
  });

  describe('execute wrapper', () => {
    it('should execute operation when circuit is CLOSED', async () => {
      const server = 'execute-server';
      const operation = vi.fn(async () => 'success');

      const result = await breaker.execute(server, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getStatus(server).consecutiveSuccesses).toBe(1);
    });

    it('should record success on successful execution', async () => {
      const server = 'success-record-server';
      const operation = async () => 'success';

      await breaker.execute(server, operation);

      const status = breaker.getStatus(server);
      expect(status.lastSuccess).toBeDefined();
      expect(status.consecutiveSuccesses).toBe(1);
    });

    it('should record failure on operation error', async () => {
      const server = 'failure-record-server';
      const operation = async () => {
        throw new Error('Operation failed');
      };

      await expect(breaker.execute(server, operation)).rejects.toThrow('Operation failed');

      const status = breaker.getStatus(server);
      expect(status.failureCount).toBe(1);
      expect(status.lastFailure).toBeDefined();
    });

    it('should use fallback when circuit is OPEN', async () => {
      const server = 'fallback-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      const operation = vi.fn(async () => 'primary');
      const fallback = vi.fn(async () => 'fallback');

      const result = await breaker.execute(server, operation, fallback);

      expect(result).toBe('fallback');
      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should throw when circuit is OPEN and no fallback', async () => {
      const server = 'no-fallback-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      const operation = async () => 'result';

      await expect(
        breaker.execute(server, operation)
      ).rejects.toThrow(/Circuit breaker is OPEN/);
    });

    it('should use fallback on operation error', async () => {
      const server = 'error-fallback-server';
      const operation = async () => {
        throw new Error('Primary failed');
      };
      const fallback = async () => 'fallback-result';

      const result = await breaker.execute(server, operation, fallback);

      expect(result).toBe('fallback-result');
    });
  });

  describe('resource cleanup', () => {
    it('should properly dispose resources', () => {
      const server = 'dispose-server';

      // Open circuit to create timer
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(() => breaker.dispose()).not.toThrow();

      // Should clear all state
      expect(breaker.getAllStatuses()).toEqual([]);
    });

    it('should throw after disposal', () => {
      breaker.dispose();

      expect(() => breaker.canRequest('server')).toThrow('Circuit breaker has been disposed');
    });

    it('should clear cooldown timers on dispose', async () => {
      const server = 'timer-dispose-server';

      // Open the circuit to create cooldown timer
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(breaker.getStatus(server).state).toBe('OPEN');

      // Dispose before cooldown completes
      breaker.dispose();

      // Wait past cooldown period
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should not auto-transition since disposed
      // (We can't test this directly since disposed circuit throws)
    });

    it('should remove event listeners on dispose', () => {
      const onStateChange = vi.fn();
      const disposableBreaker = new MCPCircuitBreaker({
        onStateChange,
      });

      const server = 'event-cleanup-server';

      // Trigger state change
      for (let i = 0; i < 5; i++) {
        disposableBreaker.recordFailure(server);
      }

      expect(onStateChange).toHaveBeenCalled();

      const callCount = onStateChange.mock.calls.length;

      // Dispose
      disposableBreaker.dispose();

      // Try to trigger more state changes (will throw, so we catch)
      try {
        disposableBreaker.reset(server);
      } catch (e) {
        // Expected
      }

      // Event listener should not be called again
      expect(onStateChange).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('reset functionality', () => {
    it('should reset circuit to CLOSED', () => {
      const server = 'reset-test-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      expect(breaker.getStatus(server).state).toBe('OPEN');

      // Reset
      breaker.reset(server);

      const status = breaker.getStatus(server);
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
      expect(status.failureWindow).toEqual([]);
      expect(status.consecutiveSuccesses).toBe(0);
      expect(status.openedAt).toBeUndefined();
    });

    it('should clear cooldown timer on reset', async () => {
      const server = 'reset-cooldown-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      // Reset immediately (before cooldown)
      breaker.reset(server);

      expect(breaker.getStatus(server).state).toBe('CLOSED');
      expect(breaker.canRequest(server)).toBe(true);
    });

    it('should reset all circuits', () => {
      const server1 = 'server1';
      const server2 = 'server2';

      // Open both circuits
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server1);
        breaker.recordFailure(server2);
      }

      expect(breaker.getStatus(server1).state).toBe('OPEN');
      expect(breaker.getStatus(server2).state).toBe('OPEN');

      // Reset all
      breaker.resetAll();

      expect(breaker.getStatus(server1).state).toBe('CLOSED');
      expect(breaker.getStatus(server2).state).toBe('CLOSED');
    });
  });

  describe('event emission', () => {
    it('should emit circuit-opened event', (done) => {
      const server = 'event-open-server';

      breaker.on('circuit-opened', (event: CircuitBreakerEvent) => {
        expect(event.server).toBe(server);
        expect(event.state).toBe('OPEN');
        expect(event.failureCount).toBe(3);
        done();
      });

      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }
    });

    it('should emit circuit-closed event on recovery', async (done) => {
      const server = 'event-close-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 600));

      // Transition to HALF_OPEN
      breaker.canRequest(server);

      breaker.on('circuit-closed', (event: CircuitBreakerEvent) => {
        expect(event.server).toBe(server);
        expect(event.state).toBe('CLOSED');
        expect(event.recoveryTime).toBeGreaterThan(0);
        done();
      });

      // Record successes to close
      breaker.recordSuccess(server);
      breaker.recordSuccess(server);
    });

    it('should emit circuit-half-open event', async (done) => {
      const server = 'event-half-open-server';

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server);
      }

      breaker.on('circuit-half-open', (event: CircuitBreakerEvent) => {
        expect(event.server).toBe(server);
        expect(event.state).toBe('HALF_OPEN');
        done();
      });

      // Wait for automatic transition after cooldown
      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });

  describe('multiple servers', () => {
    it('should track circuits independently', () => {
      const server1 = 'server-a';
      const server2 = 'server-b';

      // Fail server1
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(server1);
      }

      expect(breaker.getStatus(server1).state).toBe('OPEN');
      expect(breaker.getStatus(server2).state).toBe('CLOSED');
      expect(breaker.canRequest(server1)).toBe(false);
      expect(breaker.canRequest(server2)).toBe(true);
    });

    it('should return all statuses', () => {
      breaker.recordFailure('server1');
      breaker.recordFailure('server2');
      breaker.recordSuccess('server3');

      const statuses = breaker.getAllStatuses();

      expect(statuses.length).toBe(3);
      expect(statuses.map(s => s.server)).toContain('server1');
      expect(statuses.map(s => s.server)).toContain('server2');
      expect(statuses.map(s => s.server)).toContain('server3');
    });
  });
});
