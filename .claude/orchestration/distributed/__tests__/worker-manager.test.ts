/**
 * Worker Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../database.js';
import { WorkerManager } from '../worker-manager.js';
import type { DistributedDatabase } from '../database.js';

describe('WorkerManager', () => {
  let db: DistributedDatabase;
  let manager: WorkerManager;

  beforeEach(() => {
    db = createDatabase(':memory:');
    manager = new WorkerManager(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('register', () => {
    it('should register a new worker', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['code-generation', 'analysis'],
      });

      expect(workerId).toBeDefined();
      expect(typeof workerId).toBe('string');

      const worker = manager.get(workerId);
      expect(worker).toBeDefined();
      expect(worker?.name).toBe('test-worker');
      expect(worker?.capabilities).toEqual(['code-generation', 'analysis']);
      expect(worker?.status).toBe('idle');
    });

    it('should register a worker with custom config', () => {
      const workerId = manager.register({
        name: 'custom-worker',
        capabilities: ['testing'],
        maxLoad: 10,
        heartbeatIntervalMs: 60000,
        modelName: 'opus',
      });

      const worker = manager.get(workerId);
      expect(worker?.maxLoad).toBe(10);
      expect(worker?.heartbeatIntervalMs).toBe(60000);
      expect(worker?.modelName).toBe('opus');
    });
  });

  describe('heartbeat', () => {
    it('should process worker heartbeat', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      const beforeHeartbeat = manager.get(workerId);
      const lastHeartbeatBefore = beforeHeartbeat?.lastHeartbeat.getTime();

      // Wait a bit
      setTimeout(() => {
        manager.heartbeat({ workerId });

        const afterHeartbeat = manager.get(workerId);
        const lastHeartbeatAfter = afterHeartbeat?.lastHeartbeat.getTime();

        expect(lastHeartbeatAfter).toBeGreaterThan(lastHeartbeatBefore!);
      }, 100);
    });

    it('should update worker status via heartbeat', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      manager.heartbeat({
        workerId,
        status: 'busy',
        currentLoad: 3,
      });

      const worker = manager.get(workerId);
      expect(worker?.status).toBe('busy');
      expect(worker?.currentLoad).toBe(3);
    });
  });

  describe('getActive', () => {
    it('should return only active workers', () => {
      const worker1 = manager.register({
        name: 'worker-1',
        capabilities: ['test'],
      });

      const worker2 = manager.register({
        name: 'worker-2',
        capabilities: ['test'],
      });

      manager.unregister(worker2);

      const active = manager.getActive();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(worker1);
    });
  });

  describe('getWithCapabilities', () => {
    it('should return workers with required capabilities', () => {
      manager.register({
        name: 'worker-1',
        capabilities: ['code-generation', 'typescript'],
      });

      manager.register({
        name: 'worker-2',
        capabilities: ['analysis', 'python'],
      });

      manager.register({
        name: 'worker-3',
        capabilities: ['code-generation', 'python', 'typescript'],
      });

      const workers = manager.getWithCapabilities(['code-generation', 'typescript']);
      expect(workers).toHaveLength(2);
      expect(workers.every(w => w.capabilities.includes('code-generation'))).toBe(true);
      expect(workers.every(w => w.capabilities.includes('typescript'))).toBe(true);
    });
  });

  describe('selectWorker', () => {
    it('should select worker using least-loaded strategy', () => {
      const worker1 = manager.register({
        name: 'worker-1',
        capabilities: ['test'],
        maxLoad: 5,
      });

      const worker2 = manager.register({
        name: 'worker-2',
        capabilities: ['test'],
        maxLoad: 5,
      });

      // Set different loads
      manager.heartbeat({ workerId: worker1, currentLoad: 3 });
      manager.heartbeat({ workerId: worker2, currentLoad: 1 });

      const selected = manager.selectWorker('least-loaded');
      expect(selected?.id).toBe(worker2); // Should select less loaded worker
    });

    it('should select worker using random strategy', () => {
      manager.register({ name: 'worker-1', capabilities: ['test'] });
      manager.register({ name: 'worker-2', capabilities: ['test'] });
      manager.register({ name: 'worker-3', capabilities: ['test'] });

      const selected = manager.selectWorker('random');
      expect(selected).toBeDefined();
    });
  });

  describe('incrementLoad / decrementLoad', () => {
    it('should increment worker load', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      manager.incrementLoad(workerId);
      manager.incrementLoad(workerId);

      const worker = manager.get(workerId);
      expect(worker?.currentLoad).toBe(2);
    });

    it('should decrement worker load', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      manager.incrementLoad(workerId);
      manager.incrementLoad(workerId);
      manager.decrementLoad(workerId);

      const worker = manager.get(workerId);
      expect(worker?.currentLoad).toBe(1);
    });

    it('should not allow negative load', () => {
      const workerId = manager.register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      manager.decrementLoad(workerId);

      const worker = manager.get(workerId);
      expect(worker?.currentLoad).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return worker statistics', () => {
      manager.register({ name: 'worker-1', capabilities: ['test'] });
      manager.register({ name: 'worker-2', capabilities: ['test'] });

      const worker3 = manager.register({ name: 'worker-3', capabilities: ['test'] });
      manager.unregister(worker3);

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.idle).toBe(2);
      expect(stats.offline).toBe(1);
    });
  });
});
