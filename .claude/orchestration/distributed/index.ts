/**
 * Distributed Agent Execution System - Public API
 * Complete distributed task execution with worker pools, load balancing, and fault tolerance
 */

// Core components
export { DistributedDatabase, createDatabase, createDefaultDatabase, getDefaultDatabasePath } from './database.js';
export { TaskQueue } from './task-queue.js';
export { WorkerManager } from './worker-manager.js';
export { TaskDistributor } from './task-distributor.js';
export { Coordinator } from './coordinator.js';

// Types
export * from './types.js';

// Re-export for convenience
import { createDefaultDatabase } from './database.js';
import { Coordinator } from './coordinator.js';
import type { CoordinatorConfig } from './types.js';

/**
 * Create a coordinator with default configuration
 */
export function createDefaultCoordinator(
  config?: Partial<CoordinatorConfig>
): Coordinator {
  const db = createDefaultDatabase();
  return new Coordinator(db, config);
}

/**
 * Quick start guide (examples)
 */
export const examples = {
  /**
   * Example 1: Basic task submission
   */
  basicTaskSubmission: `
    import { createDefaultCoordinator } from '@claude/distributed-execution';

    const coordinator = createDefaultCoordinator();
    coordinator.start();

    // Register a worker
    const workerId = coordinator.getWorkerManager().register({
      name: 'worker-1',
      capabilities: ['code-generation', 'analysis'],
      maxLoad: 5,
    });

    // Submit a task
    const taskId = coordinator.submitTask({
      type: 'code-generation',
      payload: { prompt: 'Generate a TypeScript function' },
      priority: 'high',
      requiredCapabilities: ['code-generation'],
    });

    console.log('Task submitted:', taskId);
  `,

  /**
   * Example 2: Workflow execution
   */
  workflowExecution: `
    import { createDefaultCoordinator } from '@claude/distributed-execution';

    const coordinator = createDefaultCoordinator();
    coordinator.start();

    // Define workflow
    const workflow = {
      id: 'data-pipeline',
      name: 'Data Processing Pipeline',
      tasks: [
        {
          id: 'extract',
          type: 'data-extraction',
          payload: { source: 'api' },
        },
        {
          id: 'transform',
          type: 'data-transformation',
          payload: { rules: [...] },
          dependsOn: ['extract'],
        },
        {
          id: 'load',
          type: 'data-loading',
          payload: { destination: 'database' },
          dependsOn: ['transform'],
        },
      ],
      failFast: true,
    };

    // Execute workflow
    const execution = await coordinator.executeWorkflow(workflow);
    console.log('Workflow completed:', execution);
  `,

  /**
   * Example 3: Worker heartbeat
   */
  workerHeartbeat: `
    import { createDefaultCoordinator } from '@claude/distributed-execution';

    const coordinator = createDefaultCoordinator();
    const workerManager = coordinator.getWorkerManager();

    // Register worker
    const workerId = workerManager.register({
      name: 'worker-1',
      capabilities: ['analysis'],
    });

    // Send heartbeat every 30 seconds
    setInterval(() => {
      workerManager.heartbeat({
        workerId,
        status: 'idle',
        currentLoad: 0,
      });
    }, 30000);
  `,

  /**
   * Example 4: Task completion
   */
  taskCompletion: `
    import { createDefaultCoordinator } from '@claude/distributed-execution';

    const coordinator = createDefaultCoordinator();
    const distributor = coordinator.getDistributor();

    // Worker picks up task and completes it
    function processTask(taskId: string) {
      // Start task
      distributor.startTask(taskId);

      // Execute task logic
      try {
        const result = executeTaskLogic();

        // Complete successfully
        distributor.completeTask(
          taskId,
          true,
          result
        );
      } catch (error) {
        // Complete with error
        distributor.completeTask(
          taskId,
          false,
          undefined,
          error.message,
          error.stack
        );
      }
    }
  `,

  /**
   * Example 5: Monitoring and health checks
   */
  monitoring: `
    import { createDefaultCoordinator } from '@claude/distributed-execution';

    const coordinator = createDefaultCoordinator();
    coordinator.start();

    // Get system health
    const health = coordinator.getHealth();
    console.log('System Health:', {
      workers: {
        idle: health.idleWorkers,
        busy: health.busyWorkers,
        offline: health.offlineWorkers,
      },
      tasks: {
        pending: health.pendingTasks,
        running: health.runningTasks,
        completed: health.completedTasks,
        failed: health.failedTasks,
      },
      metrics: {
        avgLoadFactor: health.avgLoadFactor,
        avgTaskDuration: health.avgTaskDurationLastHour,
      },
    });

    // Get progress report
    const progress = coordinator.getProgress();
    console.log('Progress:', {
      total: progress.totalTasks,
      completed: progress.completedTasks,
      percentComplete: progress.percentComplete.toFixed(1) + '%',
    });
  `,
};

/**
 * Default export - create coordinator
 */
export default createDefaultCoordinator;
