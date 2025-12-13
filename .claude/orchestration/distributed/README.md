# Distributed Agent Execution System

Production-ready distributed task execution system for Claude orchestration with worker pools, load balancing, and fault tolerance.

## Features

- **Priority Queue**: SQLite-backed persistent queue with priority ordering
- **Worker Pool Management**: Register workers with capabilities, heartbeat monitoring, automatic failover
- **Load Balancing**: Multiple strategies (least-loaded, round-robin, capability-match, random, weighted)
- **Fault Tolerance**: Automatic retries, dead letter queue, timeout handling
- **Workflow Execution**: DAG-based workflow with dependency tracking
- **Affinity Rules**: Task-to-worker affinity, same-worker-as, worker exclusion
- **Comprehensive Monitoring**: Real-time health metrics, performance stats, progress tracking
- **Full TypeScript**: Strict typing, complete type safety

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Coordinator                          │
│  - Central orchestration                                 │
│  - Workflow execution                                    │
│  - Progress tracking                                     │
└─────────────┬───────────────────────────────────────────┘
              │
    ┌─────────┼──────────┬──────────────┐
    │         │          │              │
┌───▼───┐ ┌──▼────┐ ┌───▼──────┐ ┌─────▼────┐
│ Task  │ │Worker │ │   Task   │ │ SQLite   │
│ Queue │ │Manager│ │Distributor│ │ Database │
└───────┘ └───────┘ └──────────┘ └──────────┘
```

## Installation

```bash
# Install dependencies (from .claude/core directory)
cd ../.claude/core
npm install

# Build TypeScript
cd ../orchestration/distributed
npm run build
```

## Quick Start

```typescript
import { createDefaultCoordinator } from './index.js';

// Create coordinator
const coordinator = createDefaultCoordinator();
coordinator.start();

// Register a worker
const workerId = coordinator.getWorkerManager().register({
  name: 'worker-1',
  capabilities: ['code-generation', 'analysis'],
  maxLoad: 5,
  modelName: 'sonnet',
});

// Submit a task
const taskId = coordinator.submitTask({
  type: 'code-generation',
  payload: { prompt: 'Generate a function' },
  priority: 'high',
  requiredCapabilities: ['code-generation'],
});

// Monitor progress
const progress = coordinator.getProgress();
console.log(`Progress: ${progress.percentComplete}%`);

// Graceful shutdown
await coordinator.shutdown();
```

## Usage Examples

### Worker Heartbeat

```typescript
// Send heartbeat every 30 seconds
setInterval(() => {
  coordinator.getWorkerManager().heartbeat({
    workerId: 'worker-1',
    status: 'idle',
    currentLoad: 0,
  });
}, 30000);
```

### Task Completion

```typescript
const distributor = coordinator.getDistributor();

// Worker picks up and executes task
distributor.startTask(taskId);

try {
  const result = await executeTask(task);
  distributor.completeTask(taskId, true, result);
} catch (error) {
  distributor.completeTask(taskId, false, undefined, error.message);
}
```

### Workflow Execution

```typescript
const workflow = {
  id: 'data-pipeline',
  name: 'Data Processing',
  tasks: [
    {
      id: 'extract',
      type: 'extraction',
      payload: { source: 'api' },
    },
    {
      id: 'transform',
      type: 'transformation',
      payload: { rules: [...] },
      dependsOn: ['extract'],
    },
    {
      id: 'load',
      type: 'loading',
      payload: { dest: 'db' },
      dependsOn: ['transform'],
    },
  ],
  failFast: true,
};

const execution = await coordinator.executeWorkflow(workflow);
```

### Affinity Rules

```typescript
// Require specific worker
coordinator.submitTask({
  type: 'analysis',
  payload: { data: [...] },
  affinity: {
    requiredWorker: 'worker-1',
  },
});

// Use same worker as another task
coordinator.submitTask({
  type: 'followup',
  payload: { taskId: 'previous-task' },
  affinity: {
    sameWorkerAs: 'previous-task',
  },
});

// Exclude workers
coordinator.submitTask({
  type: 'compute',
  payload: {},
  affinity: {
    excludedWorkers: ['worker-slow', 'worker-error'],
  },
});
```

## Component API

### Coordinator

- `start()` - Start coordinator
- `stop()` - Stop coordinator
- `submitTask(submission)` - Submit single task
- `submitTasks(submissions)` - Submit multiple tasks
- `executeWorkflow(workflow)` - Execute DAG workflow
- `getProgress()` - Get progress report
- `getHealth()` - Get system health
- `shutdown()` - Graceful shutdown

### WorkerManager

- `register(registration)` - Register worker
- `unregister(workerId)` - Unregister worker
- `heartbeat(heartbeat)` - Process heartbeat
- `get(workerId)` - Get worker by ID
- `getActive()` - Get active workers
- `getWithCapabilities(caps)` - Filter by capabilities
- `selectWorker(strategy, caps?)` - Select using strategy
- `incrementLoad(workerId)` - Increment load
- `decrementLoad(workerId)` - Decrement load

### TaskQueue

- `enqueue(submission)` - Add task
- `enqueueBatch(submissions)` - Add multiple tasks
- `dequeue()` - Get next task
- `peek()` - Peek at next task
- `get(taskId)` - Get task by ID
- `updateStatus(taskId, status)` - Update status
- `getPending()` - Get pending tasks
- `getRunning()` - Get running tasks
- `getStats()` - Get queue stats

### TaskDistributor

- `assignNext()` - Assign next pending task
- `assign(taskId, workerId)` - Assign specific task
- `startTask(taskId)` - Mark task as started
- `completeTask(taskId, ...)` - Complete task
- `cancelTask(taskId)` - Cancel task
- `reassignTask(taskId, workerId)` - Reassign task
- `checkTimeouts()` - Check for timeouts
- `getResult(taskId)` - Get task result

## Database Schema

The system uses SQLite with the following tables:

- `workers` - Worker registry with capabilities and status
- `task_queue` - Priority queue with retry logic
- `task_results` - Completed task results
- `worker_assignments` - Assignment lifecycle tracking
- `distributed_state` - Shared state management
- `dead_letter_queue` - Failed tasks
- `task_dependencies` - Workflow dependencies
- `worker_metrics` - Performance metrics

Plus views for common queries:
- `v_active_workers` - Active workers with staleness
- `v_pending_tasks` - Pending tasks with wait times
- `v_system_health` - Overall system health
- `v_worker_performance` - Performance summaries

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Type check
npm run typecheck
```

## Configuration

```typescript
const coordinator = new Coordinator(db, {
  heartbeatCheckIntervalMs: 30000,
  timeoutCheckIntervalMs: 10000,
  deadWorkerThresholdMs: 90000,
  maxConcurrentTasks: 50,
  defaultTaskTimeoutMs: 300000,
  defaultRetryPolicy: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    backoffFactor: 2,
  },
  loadBalancer: {
    strategy: 'least-loaded',
    considerCapabilities: true,
    respectAffinity: true,
    maxLoadThreshold: 0.9,
  },
});
```

## Monitoring

```typescript
// System health
const health = coordinator.getHealth();
console.log({
  workers: health.idleWorkers + health.busyWorkers,
  tasks: health.runningTasks,
  avgLoad: health.avgLoadFactor,
});

// Worker performance
const perf = coordinator
  .getWorkerManager()
  .getPerformanceSummary();

perf.forEach(p => {
  console.log(`${p.name}: ${p.successRate * 100}% success, ${p.avgDurationMs}ms avg`);
});

// Queue stats
const stats = coordinator.getQueue().getStats();
console.log(`${stats.pending} pending, ${stats.running} running`);
```

## Error Handling

The system includes comprehensive error handling:

- **Automatic Retries**: Exponential backoff with configurable limits
- **Dead Letter Queue**: Failed tasks moved after max retries
- **Timeout Detection**: Automatic timeout monitoring
- **Worker Failover**: Tasks reassigned if worker dies
- **Optimistic Locking**: State updates with version checking

## Performance

- SQLite WAL mode for concurrent reads/writes
- Prepared statements for all queries
- Efficient indexes on all query paths
- In-memory caching where appropriate
- Batch operations for bulk processing

## License

MIT

## See Also

- [Database Schema](../db/distributed.sql)
- [Type Definitions](./types.ts)
- [Coordinator Implementation](./coordinator.ts)
