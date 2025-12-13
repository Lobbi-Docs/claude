/**
 * Coordinator Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../database.js';
import { Coordinator } from '../coordinator.js';
import type { DistributedDatabase } from '../database.js';

describe('Coordinator', () => {
  let db: DistributedDatabase;
  let coordinator: Coordinator;

  beforeEach(() => {
    db = createDatabase(':memory:');
    coordinator = new Coordinator(db);
  });

  afterEach(() => {
    coordinator.stop();
    db.close();
  });

  describe('start / stop', () => {
    it('should start coordinator successfully', () => {
      coordinator.start();
      // No error means success
      expect(coordinator).toBeDefined();
    });

    it('should stop coordinator successfully', () => {
      coordinator.start();
      coordinator.stop();
      // No error means success
      expect(coordinator).toBeDefined();
    });
  });

  describe('submitTask', () => {
    it('should submit a task', () => {
      coordinator.start();

      const taskId = coordinator.submitTask({
        type: 'test-task',
        payload: { data: 'test' },
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');

      const task = coordinator.getQueue().get(taskId);
      expect(task).toBeDefined();
      expect(task?.status).toBe('pending');
    });

    it('should emit task:enqueued event', (done) => {
      coordinator.start();

      coordinator.once('task:enqueued', (taskId) => {
        expect(taskId).toBeDefined();
        done();
      });

      coordinator.submitTask({
        type: 'test-task',
        payload: {},
      });
    });
  });

  describe('submitTasks', () => {
    it('should submit multiple tasks', () => {
      coordinator.start();

      const taskIds = coordinator.submitTasks([
        { type: 'task-1', payload: { id: 1 } },
        { type: 'task-2', payload: { id: 2 } },
        { type: 'task-3', payload: { id: 3 } },
      ]);

      expect(taskIds).toHaveLength(3);
      taskIds.forEach(id => {
        const task = coordinator.getQueue().get(id);
        expect(task).toBeDefined();
      });
    });
  });

  describe('processQueue', () => {
    it('should assign tasks to available workers', () => {
      coordinator.start();

      // Register a worker
      const workerId = coordinator.getWorkerManager().register({
        name: 'test-worker',
        capabilities: ['test'],
      });

      // Submit a task
      const taskId = coordinator.submitTask({
        type: 'test-task',
        payload: {},
        requiredCapabilities: ['test'],
      });

      // Process queue manually
      coordinator.processQueue();

      // Check if task was assigned
      const task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('assigned');
      expect(task?.assignedWorker).toBe(workerId);
    });

    it('should not assign tasks when no workers available', () => {
      coordinator.start();

      const taskId = coordinator.submitTask({
        type: 'test-task',
        payload: {},
      });

      coordinator.processQueue();

      const task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('pending');
    });
  });

  describe('getProgress', () => {
    it('should return progress report', () => {
      coordinator.start();

      // Submit some tasks
      coordinator.submitTasks([
        { type: 'task-1', payload: {} },
        { type: 'task-2', payload: {} },
      ]);

      const progress = coordinator.getProgress();
      expect(progress.totalTasks).toBeGreaterThan(0);
      expect(progress.pendingTasks).toBe(2);
      expect(progress.percentComplete).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return system health', () => {
      coordinator.start();

      coordinator.getWorkerManager().register({
        name: 'worker-1',
        capabilities: ['test'],
      });

      const health = coordinator.getHealth();
      expect(health).toBeDefined();
      expect(health.idleWorkers).toBe(1);
    });
  });

  describe('end-to-end task execution', () => {
    it('should execute a task from submission to completion', async () => {
      coordinator.start();

      // Register worker
      const workerId = coordinator.getWorkerManager().register({
        name: 'test-worker',
        capabilities: ['compute'],
      });

      // Submit task
      const taskId = coordinator.submitTask({
        type: 'compute',
        payload: { value: 42 },
        requiredCapabilities: ['compute'],
      });

      // Verify task is pending
      let task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('pending');

      // Process queue to assign task
      coordinator.processQueue();

      // Verify task is assigned
      task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('assigned');
      expect(task?.assignedWorker).toBe(workerId);

      // Worker starts task
      coordinator.getDistributor().startTask(taskId);

      // Verify task is running
      task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('running');

      // Worker completes task
      coordinator.getDistributor().completeTask(
        taskId,
        true,
        { result: 84 }
      );

      // Verify task is completed
      task = coordinator.getQueue().get(taskId);
      expect(task?.status).toBe('completed');

      // Verify result is stored
      const result = coordinator.getDistributor().getResult(taskId);
      expect(result?.success).toBe(true);
      expect(result?.result).toEqual({ result: 84 });
    });
  });
});
