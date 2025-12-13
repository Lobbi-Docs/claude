/**
 * Task Queue Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../database.js';
import { TaskQueue } from '../task-queue.js';
import type { DistributedDatabase } from '../database.js';

describe('TaskQueue', () => {
  let db: DistributedDatabase;
  let queue: TaskQueue;

  beforeEach(() => {
    db = createDatabase(':memory:');
    queue = new TaskQueue(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('enqueue', () => {
    it('should enqueue a task with default priority', () => {
      const taskId = queue.enqueue({
        type: 'test-task',
        payload: { data: 'test' },
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');

      const task = queue.get(taskId);
      expect(task).toBeDefined();
      expect(task?.type).toBe('test-task');
      expect(task?.priority).toBe('normal');
      expect(task?.status).toBe('pending');
    });

    it('should enqueue a task with high priority', () => {
      const taskId = queue.enqueue({
        type: 'urgent-task',
        payload: { data: 'urgent' },
        priority: 'urgent',
      });

      const task = queue.get(taskId);
      expect(task?.priority).toBe('urgent');
      expect(task?.priorityValue).toBe(4);
    });

    it('should enqueue a task with required capabilities', () => {
      const taskId = queue.enqueue({
        type: 'code-task',
        payload: { code: 'function() {}' },
        requiredCapabilities: ['code-generation', 'typescript'],
      });

      const task = queue.get(taskId);
      expect(task?.requiredCapabilities).toEqual(['code-generation', 'typescript']);
    });
  });

  describe('enqueueBatch', () => {
    it('should enqueue multiple tasks in a transaction', () => {
      const taskIds = queue.enqueueBatch([
        { type: 'task-1', payload: { id: 1 } },
        { type: 'task-2', payload: { id: 2 } },
        { type: 'task-3', payload: { id: 3 } },
      ]);

      expect(taskIds).toHaveLength(3);
      taskIds.forEach(id => {
        const task = queue.get(id);
        expect(task).toBeDefined();
      });
    });
  });

  describe('dequeue', () => {
    it('should dequeue tasks by priority', () => {
      const urgentId = queue.enqueue({
        type: 'urgent',
        payload: {},
        priority: 'urgent',
      });

      const normalId = queue.enqueue({
        type: 'normal',
        payload: {},
        priority: 'normal',
      });

      const highId = queue.enqueue({
        type: 'high',
        payload: {},
        priority: 'high',
      });

      // Should get urgent first
      const first = queue.dequeue();
      expect(first?.id).toBe(urgentId);

      // Then high
      const second = queue.dequeue();
      expect(second?.id).toBe(highId);

      // Then normal
      const third = queue.dequeue();
      expect(third?.id).toBe(normalId);
    });

    it('should return null when queue is empty', () => {
      const task = queue.dequeue();
      expect(task).toBeNull();
    });
  });

  describe('peek', () => {
    it('should peek at next task without removing it', () => {
      const taskId = queue.enqueue({
        type: 'test',
        payload: {},
      });

      const peeked = queue.peek();
      expect(peeked?.id).toBe(taskId);

      // Should still be there
      const peekedAgain = queue.peek();
      expect(peekedAgain?.id).toBe(taskId);
    });
  });

  describe('updateStatus', () => {
    it('should update task status', () => {
      const taskId = queue.enqueue({
        type: 'test',
        payload: {},
      });

      queue.updateStatus(taskId, 'running');

      const task = queue.get(taskId);
      expect(task?.status).toBe('running');
    });

    it('should update timestamps when status changes', () => {
      const taskId = queue.enqueue({
        type: 'test',
        payload: {},
      });

      queue.updateStatus(taskId, 'assigned');
      let task = queue.get(taskId);
      expect(task?.assignedAt).toBeDefined();

      queue.updateStatus(taskId, 'running');
      task = queue.get(taskId);
      expect(task?.startedAt).toBeDefined();

      queue.updateStatus(taskId, 'completed');
      task = queue.get(taskId);
      expect(task?.completedAt).toBeDefined();
    });
  });

  describe('assign', () => {
    it('should assign task to worker', () => {
      const taskId = queue.enqueue({
        type: 'test',
        payload: {},
      });

      queue.assign(taskId, 'worker-1');

      const task = queue.get(taskId);
      expect(task?.assignedWorker).toBe('worker-1');
      expect(task?.status).toBe('assigned');
    });
  });

  describe('requeue', () => {
    it('should requeue a failed task', () => {
      const taskId = queue.enqueue({
        type: 'test',
        payload: {},
      });

      queue.assign(taskId, 'worker-1');
      queue.updateStatus(taskId, 'failed', 'Error occurred');

      queue.requeue(taskId);

      const task = queue.get(taskId);
      expect(task?.status).toBe('pending');
      expect(task?.assignedWorker).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', () => {
      queue.enqueue({ type: 'test-1', payload: {} });
      queue.enqueue({ type: 'test-2', payload: {} });

      const taskId = queue.enqueue({ type: 'test-3', payload: {} });
      queue.updateStatus(taskId, 'completed');

      const stats = queue.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
    });
  });

  describe('purgeCompleted', () => {
    it('should purge old completed tasks', async () => {
      const taskId = queue.enqueue({ type: 'test', payload: {} });
      queue.updateStatus(taskId, 'completed');

      // Purge tasks older than 0ms (all completed tasks)
      const purged = queue.purgeCompleted(0);

      expect(purged).toBe(1);
      const task = queue.get(taskId);
      expect(task).toBeNull();
    });
  });
});
