# Architecture Improvement Roadmap

**Document Type:** Implementation guide for architecture quality improvements
**Aligned with:** ARCHITECTURE_QUALITY_REVIEW.md
**Timeline:** 6 weeks (incremental delivery)
**Priority:** Critical (must complete before production deployment)

---

## Quick Reference: Priority Matrix

```
                 HIGH IMPACT
                     |
        CRITICAL     |     HIGH
        ┌────────────┼────────────┐
        │ DI Refactor│ Distrib MB │ <- Week 1-2
        │ Task Persist│ Consensus │ <- Week 3-4
      L │ Routing FB │ State Mgmt │ <- Week 5-6
      O ├────────────┼────────────┤
      W │   Docs     │   Tests    │
        │  Caching   │ Validation │
        └────────────┴────────────┘
        LOW EFFORT      HIGH EFFORT
```

---

## Phase 1: Dependency Injection Foundation (Week 1-2)

### Goal
Eliminate service locator anti-pattern and establish proper DI container.

### Changes Required

#### 1.1 Create DI Container

**File:** `.claude/core/di-container.ts`

```typescript
/**
 * Dependency Injection Container
 * Manages plugin instantiation and dependency resolution
 */

import type { MessageBus } from '../orchestration/messagebus';
import type { RoutingEngine } from '../orchestration/routing-engine';

interface ServiceProvider<T> {
  (container: DIContainer): T;
}

export class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceProvider<any>>();

  /**
   * Register a singleton service
   */
  registerSingleton<T>(key: string, factory: ServiceProvider<T>): void {
    const instance = factory(this);
    this.services.set(key, instance);
  }

  /**
   * Register a factory (creates new instance each time)
   */
  registerFactory<T>(key: string, factory: ServiceProvider<T>): void {
    this.factories.set(key, factory);
  }

  /**
   * Resolve a service
   */
  resolve<T>(key: string): T {
    // Check singleton first
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // Check factory
    if (this.factories.has(key)) {
      const factory = this.factories.get(key);
      return factory(this);
    }

    throw new Error(`Service not found: ${key}`);
  }

  /**
   * Register all core services
   */
  static createDefault(): DIContainer {
    const container = new DIContainer();

    // Register MessageBus singleton
    container.registerSingleton('messageBus', (c) => {
      return new MessageBus('default');
    });

    // Register RoutingEngine
    container.registerSingleton('routingEngine', (c) => {
      const messageBus = c.resolve<MessageBus>('messageBus');
      const classifier = c.resolve<RequestClassifier>('requestClassifier');
      return new RoutingEngine(messageBus, classifier);
    });

    // Register RequestClassifier
    container.registerSingleton('requestClassifier', () => {
      return new RequestClassifier();
    });

    // Register CircuitBreakerManager
    container.registerSingleton('circuitBreakerManager', () => {
      return new CircuitBreakerManager();
    });

    return container;
  }
}

// Export for application setup
export const globalContainer = DIContainer.createDefault();
```

#### 1.2 Remove Service Locator Functions

**Remove from:** `jira-orchestrator/lib/messagebus.ts`

```typescript
// DELETE THIS FUNCTION:
export function getMessageBus(pluginId: string): MessageBus {
  if (!globalBus) {
    globalBus = new MessageBus(pluginId);
  }
  return globalBus;
}

// DELETE THIS:
let globalBus: MessageBus | undefined;
```

#### 1.3 Update Routing Engine Constructor

**File:** `jira-orchestrator/lib/routing-engine.ts`

```typescript
// BEFORE:
export class RoutingEngine {
  private messageBus: MessageBus;

  constructor() {
    this.messageBus = getMessageBus('routing-engine'); // BAD
  }
}

// AFTER:
export class RoutingEngine {
  constructor(
    private messageBus: MessageBus,
    private classifier: RequestClassifier
  ) {}
}

// In application setup:
const container = DIContainer.createDefault();
const routingEngine = container.resolve<RoutingEngine>('routingEngine');
```

#### 1.4 Update Tests to Use DI

**File:** `.claude/core/__tests__/routing-engine.test.ts`

```typescript
import { DIContainer } from '../di-container';
import type { MessageBus } from '../messagebus';
import { RoutingEngine } from '../routing-engine';

describe('RoutingEngine with DI', () => {
  let container: DIContainer;
  let messageBus: MessageBus;
  let routingEngine: RoutingEngine;

  beforeEach(() => {
    // Create container with test configuration
    container = new DIContainer();

    // Register mock MessageBus
    const mockMessageBus = {
      publish: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      request: jest.fn(),
    };
    container.registerSingleton('messageBus', () => mockMessageBus);

    // Register RequestClassifier
    container.registerSingleton('requestClassifier', () => new RequestClassifier());

    // Register RoutingEngine
    container.registerSingleton('routingEngine', (c) => {
      return new RoutingEngine(
        c.resolve('messageBus'),
        c.resolve('requestClassifier')
      );
    });

    messageBus = container.resolve('messageBus');
    routingEngine = container.resolve('routingEngine');
  });

  it('should route request through injected message bus', async () => {
    const decision = routingEngine.route({
      text: 'install plugin xyz',
      files: [],
    });

    expect(messageBus.publish).toHaveBeenCalled();
  });
});
```

#### 1.5 Update Documentation

**Create:** `.claude/docs/DEPENDENCY_INJECTION.md`

```markdown
# Dependency Injection Setup

## Overview
All plugins and core services use constructor-based dependency injection through the DI Container.

## Quick Start

### In Plugin Code
```typescript
// my-plugin/agents/my-agent.ts
import type { MessageBus } from '@claude/core';
import { DIContainer } from '@claude/core';

export class MyAgent {
  constructor(
    private messageBus: MessageBus,
    private config: PluginConfig
  ) {}

  async execute() {
    await this.messageBus.publish({
      topic: 'my-topic',
      payload: { /* ... */ },
    });
  }
}

// In plugin setup:
const container = DIContainer.createDefault();
const agent = new MyAgent(
  container.resolve('messageBus'),
  config
);
```

### Registering New Services
```typescript
// In your plugin's initialization
const container = DIContainer.createDefault();

container.registerSingleton('myService', (c) => {
  const dep1 = c.resolve('dependency1');
  const dep2 = c.resolve('dependency2');
  return new MyService(dep1, dep2);
});
```

## Best Practices
1. Always inject dependencies through constructor
2. Never use global getInstance() functions
3. Register services in plugin initialization
4. Use TypeScript interfaces for service contracts
```

### Checklist for Phase 1

- [ ] Create DIContainer class
- [ ] Remove all service locator functions
- [ ] Update all imports (routing-engine, coordinator, etc.)
- [ ] Add unit tests for DI container
- [ ] Update integration tests with mock DI setup
- [ ] Document DI patterns in DEPENDENCY_INJECTION.md
- [ ] Code review and approval
- [ ] Verify test coverage increase to >50%

**Estimated Effort:** 8-10 developer hours

---

## Phase 2: Distributed Message Broker (Week 2-3)

### Goal
Replace in-memory MessageBus with distributed pub/sub (Redis) for horizontal scaling.

### Changes Required

#### 2.1 Create Message Broker Abstraction

**File:** `.claude/core/message-broker.ts`

```typescript
/**
 * Message Broker Abstraction
 * Supports both in-memory and distributed implementations
 */

export interface IMessageBroker {
  /**
   * Publish a message to a topic
   */
  publish(message: Message): Promise<void>;

  /**
   * Subscribe to a topic pattern
   */
  subscribe(
    topicPattern: string,
    handler: (message: Message) => void | Promise<void>
  ): () => void; // Returns unsubscribe function

  /**
   * Publish and wait for response
   */
  request<T>(options: RequestOptions): Promise<T>;

  /**
   * Send a response to a request
   */
  respond(correlationId: string, response: any): Promise<void>;

  /**
   * Health check
   */
  isHealthy(): Promise<boolean>;
}

// Export for implementations
export type { Message, MessageType, PublishOptions, RequestOptions };
```

#### 2.2 Create Redis Implementation

**File:** `.claude/core/redis-message-broker.ts`

```typescript
/**
 * Redis-backed Message Broker
 * Enables horizontal scaling across multiple processes/nodes
 */

import Redis from 'ioredis';
import type { IMessageBroker, Message, PublishOptions } from './message-broker';

export class RedisMessageBroker implements IMessageBroker {
  private redis: Redis;
  private redisPub: Redis;
  private subscriptions = new Map<string, Set<Function>>();
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private config: {
      host: string;
      port: number;
      db: number;
      password?: string;
      keyPrefix?: string;
    }
  ) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      db: config.db,
      password: config.password,
      keyPrefix: config.keyPrefix || 'claude:',
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    // Separate connection for publishing to avoid blocking
    this.redisPub = new Redis({
      host: config.host,
      port: config.port,
      db: config.db,
      password: config.password,
    });

    // Subscribe to responses for this instance
    this.subscribeToResponses();
  }

  async publish(message: Message): Promise<void> {
    const channel = this.getChannelName(message.topic);
    const serialized = JSON.stringify(message);

    await this.redisPub.publish(channel, serialized);

    // Also store in a message log for debugging
    const logKey = `messages:log:${Date.now()}`;
    await this.redis.lpush(logKey, serialized);
    await this.redis.expire(logKey, 3600); // Keep for 1 hour
  }

  subscribe(
    topicPattern: string,
    handler: (message: Message) => void | Promise<void>
  ): () => void {
    const channel = this.getChannelName(topicPattern);

    // Store handler
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());

      // Only subscribe to Redis once per channel
      this.redis.subscribe(channel, (err) => {
        if (err) console.error(`Failed to subscribe to ${channel}:`, err);
      });
    }

    this.subscriptions.get(channel)!.add(handler);

    // Set up message listener
    this.redis.on('message', async (redisChannel, serialized) => {
      if (redisChannel !== channel) return;

      try {
        const message = JSON.parse(serialized);
        const handlers = this.subscriptions.get(channel) || new Set();

        for (const h of handlers) {
          await Promise.resolve(h(message));
        }
      } catch (error) {
        console.error(`Error handling message on ${channel}:`, error);
      }
    });

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.redis.unsubscribe(channel);
          this.subscriptions.delete(channel);
        }
      }
    };
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const correlationId = uuidv4();
    const timeout = options.timeout || 30000;

    const promise = new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });
    });

    // Send request
    await this.publish({
      messageId: uuidv4(),
      correlationId,
      timestamp: new Date().toISOString(),
      source: this.config.keyPrefix || 'default',
      destination: options.destination || '*',
      topic: options.topic,
      messageType: 'request',
      priority: options.priority || 5,
      headers: options.headers || {},
      payload: options.payload,
      metadata: options.metadata || {},
    });

    return promise;
  }

  async respond(correlationId: string, response: any): Promise<void> {
    const pending = this.pendingRequests.get(correlationId);
    if (!pending) {
      console.warn(`No pending request for correlation ID: ${correlationId}`);
      return;
    }

    clearTimeout(pending.timeout);
    pending.resolve(response);
    this.pendingRequests.delete(correlationId);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  private subscribeToResponses(): void {
    this.redis.subscribe('responses:*', (err) => {
      if (err) console.error('Failed to subscribe to responses:', err);
    });

    this.redis.on('message', (channel, serialized) => {
      if (!channel.startsWith('responses:')) return;

      const message = JSON.parse(serialized);
      this.respond(message.correlationId, message.response);
    });
  }

  private getChannelName(topic: string): string {
    return `messages:${topic}`;
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.disconnect(),
      this.redisPub.disconnect(),
    ]);
  }
}
```

#### 2.3 Update DI Container for Broker Selection

**File:** `.claude/core/di-container.ts` (update)

```typescript
export interface DIContainerConfig {
  messageBrokerType: 'memory' | 'redis';
  rediConfig?: {
    host: string;
    port: number;
    db: number;
    password?: string;
  };
}

export class DIContainer {
  // ... existing code ...

  static createDefault(config?: DIContainerConfig): DIContainer {
    const container = new DIContainer();
    const brokerConfig = config || { messageBrokerType: 'memory' };

    // Register appropriate message broker
    if (brokerConfig.messageBrokerType === 'redis') {
      if (!brokerConfig.rediConfig) {
        throw new Error('Redis config required for redis broker');
      }

      container.registerSingleton('messageBroker', () => {
        return new RedisMessageBroker(brokerConfig.rediConfig!);
      });
    } else {
      container.registerSingleton('messageBroker', () => {
        return new InMemoryMessageBroker('default');
      });
    }

    // Rest of registration...
    return container;
  }
}
```

#### 2.4 Update Configuration Files

**File:** `.claude/.env.template` (add)

```bash
# Message Broker Configuration
MESSAGE_BROKER_TYPE=redis # or 'memory' for testing
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# For multi-node setup
REDIS_CLUSTER_ENABLED=false
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
```

#### 2.5 Add Integration Tests

**File:** `.claude/core/__tests__/distributed-messaging.test.ts`

```typescript
import { DIContainer } from '../di-container';
import { RedisMessageBroker } from '../redis-message-broker';
import type { IMessageBroker } from '../message-broker';

describe('Distributed Message Broker', () => {
  let messageBroker: IMessageBroker;

  beforeAll(async () => {
    const container = DIContainer.createDefault({
      messageBrokerType: 'redis',
      rediConfig: {
        host: 'localhost',
        port: 6379,
        db: 15, // Test database
      },
    });

    messageBroker = container.resolve('messageBroker');
    await messageBroker.isHealthy();
  });

  it('should publish and subscribe to messages', async () => {
    const messages: any[] = [];

    const unsubscribe = messageBroker.subscribe('test:*', (msg) => {
      messages.push(msg);
    });

    await messageBroker.publish({
      topic: 'test:hello',
      payload: { text: 'world' },
    });

    await new Promise(r => setTimeout(r, 100)); // Allow async processing

    expect(messages).toHaveLength(1);
    expect(messages[0].payload.text).toBe('world');

    unsubscribe();
  });

  it('should handle request/response patterns', async () => {
    messageBroker.subscribe('service:echo', async (msg) => {
      await messageBroker.respond(msg.correlationId, {
        echo: msg.payload.text,
      });
    });

    const response = await messageBroker.request({
      topic: 'service:echo',
      destination: 'service:echo',
      payload: { text: 'hello' },
      timeout: 5000,
    });

    expect(response.echo).toBe('hello');
  });

  it('should handle subscription patterns with wildcards', async () => {
    const messages: any[] = [];

    messageBroker.subscribe('events:*', (msg) => {
      messages.push(msg);
    });

    await messageBroker.publish({
      topic: 'events:user:created',
      payload: { userId: '123' },
    });

    await messageBroker.publish({
      topic: 'events:user:deleted',
      payload: { userId: '456' },
    });

    await new Promise(r => setTimeout(r, 100));

    expect(messages).toHaveLength(2);
  });

  it('should timeout on delayed responses', async () => {
    // Don't set up a responder
    const promise = messageBroker.request({
      topic: 'service:slow',
      destination: 'service:slow',
      payload: {},
      timeout: 100,
    });

    await expect(promise).rejects.toThrow('Request timeout');
  });
});
```

### Checklist for Phase 2

- [ ] Create IMessageBroker abstraction
- [ ] Implement RedisMessageBroker
- [ ] Update DIContainer for broker selection
- [ ] Add Redis configuration to .env
- [ ] Write integration tests
- [ ] Performance test: >10K msg/sec throughput
- [ ] Load test: 100+ concurrent messages
- [ ] Document distributed setup
- [ ] Deploy to staging environment
- [ ] Monitor Redis memory usage

**Estimated Effort:** 12-15 developer hours

---

## Phase 3: Task Persistence & Consensus (Week 3-4)

### Goal
Add persistent task queue and distributed consensus for fault tolerance.

### Changes Required

#### 3.1 Persistent Task Queue

**File:** `.claude/core/persistent-task-queue.ts`

```typescript
/**
 * Persistent Task Queue backed by PostgreSQL
 * Ensures no task loss even if coordinator crashes
 */

import type { Database } from './database';
import type { Task, TaskStatus } from './types';

export class PersistentTaskQueue {
  constructor(private db: Database) {}

  async enqueue(task: Task): Promise<void> {
    await this.db.query(`
      INSERT INTO tasks (
        id, type, status, priority, priority_value, payload,
        timeout_ms, created_at, retry_policy, affinity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      task.id,
      task.type,
      'pending',
      task.priority,
      this.getPriorityValue(task.priority),
      JSON.stringify(task.payload),
      task.timeoutMs,
      new Date(),
      JSON.stringify(task.retryPolicy),
      JSON.stringify(task.affinity),
    ]);
  }

  async dequeue(limit = 10): Promise<Task[]> {
    const rows = await this.db.query(`
      UPDATE tasks
      SET status = 'assigned', assigned_at = NOW()
      WHERE id IN (
        SELECT id FROM tasks
        WHERE status = 'pending'
        ORDER BY priority_value DESC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [limit]);

    return rows.map(this.rowToTask);
  }

  async markComplete(taskId: string, result: any): Promise<void> {
    await this.db.query(`
      UPDATE tasks
      SET status = 'completed', completed_at = NOW(), result = $2
      WHERE id = $1
    `, [taskId, JSON.stringify(result)]);
  }

  async markFailed(taskId: string, error: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;

    const shouldRetry = this.shouldRetry(task);

    if (shouldRetry) {
      const delay = this.getRetryDelay(task);
      await this.db.query(`
        UPDATE tasks
        SET
          status = 'pending',
          attempt_count = attempt_count + 1,
          last_error = $2,
          available_at = NOW() + INTERVAL '1 second' * $3
        WHERE id = $1
      `, [taskId, error, delay / 1000]);
    } else {
      await this.db.query(`
        UPDATE tasks
        SET status = 'failed', last_error = $2, completed_at = NOW()
        WHERE id = $1
      `, [taskId, error]);
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const rows = await this.db.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    return rows.length > 0 ? this.rowToTask(rows[0]) : null;
  }

  async getPendingTasks(): Promise<Task[]> {
    const rows = await this.db.query(`
      SELECT * FROM tasks
      WHERE status = 'pending'
      ORDER BY priority_value DESC, created_at ASC
    `);
    return rows.map(r => this.rowToTask(r));
  }

  private shouldRetry(task: Task): boolean {
    if (!task.retryPolicy) return false;
    return task.attemptCount < task.retryPolicy.maxRetries;
  }

  private getRetryDelay(task: Task): number {
    if (!task.retryPolicy) return 0;

    const { baseDelayMs, backoffFactor, maxDelayMs } = task.retryPolicy;
    const exponentialDelay = baseDelayMs * Math.pow(backoffFactor, task.attemptCount);

    return Math.min(exponentialDelay, maxDelayMs);
  }

  private getPriorityValue(priority: string): number {
    const map: Record<string, number> = {
      'urgent': 4,
      'high': 3,
      'normal': 2,
      'low': 1,
    };
    return map[priority] || 2;
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      priority: row.priority,
      priorityValue: row.priority_value,
      createdAt: new Date(row.created_at),
      timeoutMs: row.timeout_ms,
      status: row.status,
      assignedWorker: row.assigned_worker,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      attemptCount: row.attempt_count,
      maxRetries: row.max_retries,
      lastError: row.last_error,
      resultId: row.result_id,
      retryPolicy: row.retry_policy ? JSON.parse(row.retry_policy) : undefined,
      affinity: row.affinity ? JSON.parse(row.affinity) : undefined,
    };
  }
}
```

#### 3.2 Database Schema

**File:** `.claude/core/migrations/001_create_tasks_table.sql`

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  priority_value SMALLINT NOT NULL DEFAULT 2,
  payload JSONB NOT NULL,
  timeout_ms INTEGER NOT NULL DEFAULT 300000,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  result JSONB,
  assigned_worker UUID,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  retry_policy JSONB,
  affinity JSONB,
  result_id UUID,
  metadata JSONB,
  INDEX idx_status_priority (status, priority_value DESC, created_at ASC),
  INDEX idx_assigned_worker (assigned_worker),
  INDEX idx_created_at (created_at),
  CHECK (status IN ('pending', 'assigned', 'running', 'completed', 'failed', 'timeout', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS distributed_locks (
  key VARCHAR(255) PRIMARY KEY,
  owner_id UUID NOT NULL,
  acquired_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_distributed_locks_expires_at ON distributed_locks(expires_at);

CREATE TABLE IF NOT EXISTS workflow_checkpoints (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  phase VARCHAR(100) NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_workflow_id (workflow_id)
);
```

#### 3.3 Distributed Lock Manager

**File:** `.claude/core/distributed-lock.ts`

```typescript
/**
 * Distributed Lock Manager using database
 * Enables coordination across multiple processes
 */

import type { Database } from './database';

export class DistributedLockManager {
  constructor(private db: Database) {}

  async acquire(
    key: string,
    ownerId: string,
    ttlMs: number = 30000
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    const result = await this.db.query(`
      INSERT INTO distributed_locks (key, owner_id, acquired_at, expires_at)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    `, [key, ownerId, expiresAt]);

    return result.length > 0;
  }

  async release(key: string, ownerId: string): Promise<boolean> {
    const result = await this.db.query(`
      DELETE FROM distributed_locks
      WHERE key = $1 AND owner_id = $2
      RETURNING key
    `, [key, ownerId]);

    return result.length > 0;
  }

  async extend(key: string, ownerId: string, ttlMs: number): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    const result = await this.db.query(`
      UPDATE distributed_locks
      SET expires_at = $3
      WHERE key = $1 AND owner_id = $2
      RETURNING key
    `, [key, ownerId, expiresAt]);

    return result.length > 0;
  }

  async withLock<T>(
    key: string,
    ownerId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const acquired = await this.acquire(key, ownerId, 60000);
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key, ownerId);
    }
  }
}
```

#### 3.4 Workflow Checkpointing

**File:** `.claude/core/workflow-checkpoint.ts`

```typescript
/**
 * Workflow State Checkpointing
 * Enables recovery from failures
 */

import type { Database } from './database';
import type { WorkflowExecution } from './types';

export class WorkflowCheckpointManager {
  constructor(private db: Database) {}

  async checkpoint(
    workflowId: string,
    phase: string,
    state: any
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO workflow_checkpoints (id, workflow_id, phase, state)
      VALUES (gen_random_uuid(), $1, $2, $3)
    `, [workflowId, phase, JSON.stringify(state)]);
  }

  async getLastCheckpoint(workflowId: string): Promise<{
    phase: string;
    state: any;
  } | null> {
    const rows = await this.db.query(`
      SELECT phase, state
      FROM workflow_checkpoints
      WHERE workflow_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [workflowId]);

    if (rows.length === 0) return null;

    return {
      phase: rows[0].phase,
      state: JSON.parse(rows[0].state),
    };
  }

  async restoreWorkflow(workflowId: string): Promise<WorkflowExecution | null> {
    const checkpoint = await this.getLastCheckpoint(workflowId);
    if (!checkpoint) return null;

    return {
      id: workflowId,
      phase: checkpoint.phase,
      state: checkpoint.state,
      // ... other fields
    };
  }
}
```

### Checklist for Phase 3

- [ ] Create database schema (tasks table, locks, checkpoints)
- [ ] Implement PersistentTaskQueue
- [ ] Implement DistributedLockManager
- [ ] Implement WorkflowCheckpointManager
- [ ] Update DIContainer to use persistent queue
- [ ] Add migration framework
- [ ] Test task persistence on crash/restart
- [ ] Test distributed lock contention
- [ ] Test workflow recovery from checkpoint
- [ ] Performance test: queue throughput with persistence

**Estimated Effort:** 15-18 developer hours

---

## Phase 4: Routing Feedback Loop (Week 4-5)

### Goal
Implement feedback mechanism to learn from routing decisions over time.

### Implementation

**File:** `.claude/core/routing-feedback.ts`

```typescript
/**
 * Routing Feedback Loop
 * Collects metrics and improves routing decisions over time
 */

import type { Database } from './database';

export interface RoutingFeedback {
  requestId: string;
  plugin: string;
  success: boolean;
  latency: number;
  cost: number;
  timestamp: Date;
}

export interface PluginMetrics {
  plugin: string;
  successRate: number;
  avgLatency: number;
  avgCost: number;
  failureCount: number;
  lastFailure?: Date;
}

export class RoutingFeedbackCollector {
  constructor(private db: Database) {}

  async recordFeedback(feedback: RoutingFeedback): Promise<void> {
    await this.db.query(`
      INSERT INTO routing_feedback (
        request_id, plugin, success, latency, cost, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      feedback.requestId,
      feedback.plugin,
      feedback.success,
      feedback.latency,
      feedback.cost,
      feedback.timestamp,
    ]);
  }

  async getPluginMetrics(
    plugin: string,
    windowMs: number = 3600000 // 1 hour
  ): Promise<PluginMetrics> {
    const cutoff = new Date(Date.now() - windowMs);

    const rows = await this.db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
        AVG(latency) as avg_latency,
        AVG(cost) as avg_cost,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count,
        MAX(CASE WHEN NOT success THEN timestamp END) as last_failure
      FROM routing_feedback
      WHERE plugin = $1 AND timestamp > $2
    `, [plugin, cutoff]);

    if (rows.length === 0) {
      return {
        plugin,
        successRate: 1,
        avgLatency: 0,
        avgCost: 0,
        failureCount: 0,
      };
    }

    return {
      plugin,
      successRate: rows[0].success_rate || 1,
      avgLatency: rows[0].avg_latency || 0,
      avgCost: rows[0].avg_cost || 0,
      failureCount: rows[0].failure_count || 0,
      lastFailure: rows[0].last_failure ? new Date(rows[0].last_failure) : undefined,
    };
  }

  async getRecommendedPlugin(domain: string): Promise<string | null> {
    // Find plugin with highest success rate in domain
    const rows = await this.db.query(`
      SELECT plugin
      FROM (
        SELECT
          plugin,
          SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
          COUNT(*) as request_count
        FROM routing_feedback
        WHERE domain = $1 AND timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY plugin
      ) metrics
      WHERE request_count > 10
      ORDER BY success_rate DESC
      LIMIT 1
    `, [domain]);

    return rows.length > 0 ? rows[0].plugin : null;
  }
}
```

**Update RoutingEngine:**

```typescript
class IntelligentRoutingEngine extends ModelRouter {
  constructor(
    config: RouterConfig,
    private feedbackCollector: RoutingFeedbackCollector
  ) {
    super(config);
  }

  async routeWithLearning(task: TaskDescriptor): Promise<RoutingDecision> {
    // Try to get recommended plugin from past performance
    const recommendedPlugin = await this.feedbackCollector.getRecommendedPlugin(
      task.type
    );

    if (recommendedPlugin) {
      // Use recommended plugin as primary
      const decision = super.route(task);
      decision.primaryPlugin = recommendedPlugin;
      return decision;
    }

    // Fall back to standard routing
    return super.route(task);
  }
}
```

---

## Verification & Testing Strategy

### Unit Tests
```bash
npm test -- --coverage .claude/core/__tests__
# Target: 80% coverage
```

### Integration Tests
```bash
npm test -- --integration
# Tests against real Redis/PostgreSQL instances
```

### Load Tests
```bash
npm run load-test
# 10K+ msg/sec throughput
# <50ms p95 latency
```

### Chaos Tests
```bash
npm run chaos-test
# Coordinator failure recovery
# Worker crash handling
# Message loss scenarios
```

---

## Deployment Strategy

### Testing Environment
1. Deploy to staging with Redis + PostgreSQL
2. Run load tests for 24 hours
3. Monitor memory, CPU, network usage
4. Verify no message loss under failure conditions

### Production Rollout
1. **Week 1:** Deploy Phase 1 (DI) with feature flag
2. **Week 2:** Deploy Phase 2 (Redis) alongside in-memory
3. **Week 3:** Migrate traffic gradually to Redis broker
4. **Week 4:** Complete migration; retire in-memory broker
5. **Week 5:** Deploy Phase 3 (persistence); test recovery
6. **Week 6:** Deploy Phase 4 (feedback loop); monitor improvements

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Test Coverage | 35% | 80% | End Phase 1 |
| Message Throughput | 100 msg/s | 10K+ msg/s | End Phase 2 |
| Task Loss | High risk | Zero loss | End Phase 3 |
| Routing Latency | 50-100ms | <10ms cached | End Phase 4 |
| SOLID Score | 6/10 | 8.5/10 | All phases |

---

## Risk Mitigation

### Risk: Redis Single Point of Failure
**Mitigation:** Use Redis Sentinel for automatic failover
```yaml
# Redis Sentinel config
sentinel:
  quorum: 2
  failover-timeout: 3000
  monitors:
    - name: claude-messages
      host: localhost
      port: 6379
```

### Risk: Database Performance Degradation
**Mitigation:** Add indexes and connection pooling
```typescript
// Connection pooling
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
});
```

### Risk: Backward Compatibility
**Mitigation:** Run both systems in parallel during migration
```typescript
// Hybrid mode during transition
class HybridMessageBroker implements IMessageBroker {
  constructor(
    private inMemory: InMemoryMessageBroker,
    private redis: RedisMessageBroker
  ) {}

  async publish(message): Promise<void> {
    await Promise.all([
      this.inMemory.publish(message),
      this.redis.publish(message),
    ]);
  }
}
```

---

## Conclusion

This 6-week roadmap transforms the plugin architecture from **prototype-quality** to **production-ready** through incremental, testable improvements. Each phase is independent yet builds on previous work, allowing for parallel team efforts and continuous deployment.

**Total Effort:** ~50-60 developer hours
**Team Size:** 2-3 engineers
**Delivery:** Production-ready in 6 weeks with 2-3 engineer team
