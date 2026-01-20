# Testing Implementation Guide
## Practical Setup and Template Library

**Document Version:** 1.0
**Status:** Implementation Ready

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Test Templates](#test-templates)
3. [Mock Implementations](#mock-implementations)
4. [Configuration Files](#configuration-files)
5. [Helper Utilities](#helper-utilities)
6. [CI/CD Setup](#cicd-setup)

---

## Project Setup

### Step 1: Install Testing Dependencies

```bash
# From project root
npm install --save-dev \
  vitest \
  @vitest/coverage-v8 \
  @vitest/ui \
  @vitest/reporter-junit \
  @testing-library/node \
  happy-dom \
  playwright
```

### Step 2: Create Test Structure

```bash
# Create directories
mkdir -p tests/{unit,integration,e2e,fixtures,mocks,helpers}
mkdir -p {tests,src}/__tests__

# Create configuration
touch vitest.config.ts
touch tests/setup.ts
touch tests/helpers/index.ts
```

### Step 3: Configure TypeScript for Tests

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@tests/*": ["tests/*"],
      "@mocks/*": ["tests/mocks/*"]
    },
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Test Templates

### Unit Test Template

```typescript
// tests/unit/agent-name.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentName } from '@/agents/agent-name';
import { createMockConfig, createMockLogger } from '@tests/mocks';

describe('AgentName', () => {
  let agent: AgentName;
  let mockConfig: ReturnType<typeof createMockConfig>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockLogger = createMockLogger();
    agent = new AgentName({ config: mockConfig, logger: mockLogger });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with provided config', () => {
      expect(agent.config).toEqual(mockConfig);
    });

    it('should set state to idle', () => {
      expect(agent.state).toBe('idle');
    });
  });

  describe('execute', () => {
    it('should execute task successfully', async () => {
      const task = { id: 'test-1', type: 'test' };
      const result = await agent.execute(task);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should handle execution errors', async () => {
      const task = { id: 'test-2', type: 'invalid' };
      const result = await agent.execute(task);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('state transitions', () => {
    it('should transition from idle to running', async () => {
      expect(agent.state).toBe('idle');

      const task = { id: 'test-3', type: 'test' };
      const execution = agent.execute(task);

      expect(agent.state).toBe('running');

      await execution;
      expect(agent.state).toBe('idle');
    });
  });
});
```

### Integration Test Template

```typescript
// tests/integration/agent-coordination.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentOrchestrator } from '@/orchestration/agent-orchestrator';
import { MessageBus } from '@/messaging/message-bus';
import { createTestDatabase } from '@tests/helpers/test-database';

describe('Agent Coordination', () => {
  let orchestrator: AgentOrchestrator;
  let messageBus: MessageBus;
  let testDb: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    testDb = createTestDatabase();
    messageBus = new MessageBus();
    orchestrator = new AgentOrchestrator({
      messageBus,
      database: testDb,
    });

    await orchestrator.initialize();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
    testDb.close();
  });

  describe('workflow execution', () => {
    it('should execute sequential workflow', async () => {
      const workflow = [
        { agentId: 'agent-1', task: 'parse' },
        { agentId: 'agent-2', task: 'enrich' },
        { agentId: 'agent-3', task: 'validate' },
      ];

      const result = await orchestrator.executeWorkflow(workflow, testData);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(3);
    });

    it('should handle agent communication via message bus', async () => {
      const messageReceived = new Promise(resolve => {
        messageBus.subscribe('agent.completed', (msg) => {
          resolve(msg);
        });
      });

      const workflow = [{ agentId: 'agent-1', task: 'test' }];
      await orchestrator.executeWorkflow(workflow, testData);

      const message = await messageReceived;
      expect(message).toBeDefined();
    });
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/issue-workflow.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { E2EContext } from '@tests/helpers/e2e-context';

describe('Issue Workflow E2E', () => {
  let context: E2EContext;

  beforeEach(async () => {
    context = new E2EContext();
    await context.setup();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('should complete full workflow from issue to PR', async () => {
    // Create test issue
    const issue = await context.jira.createIssue({
      summary: 'Implement feature X',
      description: 'Add new functionality',
    });

    // Execute /jira:work command
    const workResult = await context.executeCommand('jira:work', {
      issueKey: issue.key,
    });
    expect(workResult.status).toBe('started');

    // Wait for agent completion
    await context.waitForAgentCompletion('triage-agent');

    // Execute /jira:prepare
    const prepareResult = await context.executeCommand('jira:prepare', {
      issueKey: issue.key,
    });
    expect(prepareResult.subtasks).toHaveLength(3);

    // Complete subtasks
    for (const subtask of prepareResult.subtasks) {
      await context.jira.transitionIssue(subtask.key, 'Done');
    }

    // Execute /jira:commit
    const commitResult = await context.executeCommand('jira:commit', {
      issueKey: issue.key,
      message: prepareResult.commitMessage,
    });
    expect(commitResult.sha).toBeDefined();

    // Execute /jira:pr
    const prResult = await context.executeCommand('jira:pr', {
      issueKey: issue.key,
    });
    expect(prResult.url).toBeDefined();

    // Verify audit trail
    const auditLog = await context.getAuditLog(issue.key);
    expect(auditLog.events).toHaveLength(4);
  });
});
```

---

## Mock Implementations

### MessageBus Mock

```typescript
// tests/mocks/message-bus.mock.ts
import { vi } from 'vitest';
import type { IMessageBus, Message, Subscriber } from '@/types';

export class MockMessageBus implements IMessageBus {
  private messages: Message[] = [];
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  public publishDelay = 0;
  public shouldFail = false;
  public failureRate = 0;

  async publish(message: Message): Promise<{ success: boolean; messageId: string }> {
    // Simulate network delay
    if (this.publishDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.publishDelay));
    }

    // Simulate failures
    if (this.shouldFail || Math.random() < this.failureRate) {
      throw new Error('Message bus error');
    }

    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const enrichedMessage = {
      ...message,
      id: messageId,
      timestamp: Date.now(),
    };

    this.messages.push(enrichedMessage);

    // Notify subscribers asynchronously
    const subscribers = this.subscribers.get(message.type) || new Set();
    subscribers.forEach(subscriber => {
      setImmediate(() => subscriber(enrichedMessage));
    });

    return { success: true, messageId };
  }

  subscribe(messageType: string, subscriber: Subscriber): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }

    this.subscribers.get(messageType)!.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(messageType)?.delete(subscriber);
    };
  }

  // Test utilities
  getPublished(filter?: Partial<Message>): Message[] {
    return this.messages.filter(m => {
      if (!filter) return true;
      return Object.entries(filter).every(([key, value]) =>
        m[key as keyof Message] === value
      );
    });
  }

  getPublishedCount(): number {
    return this.messages.length;
  }

  reset(): void {
    this.messages = [];
    this.subscribers.clear();
  }

  spy(messageType: string) {
    return vi.fn();
  }
}
```

### Agent Mock

```typescript
// tests/mocks/agent.mock.ts
import { vi } from 'vitest';
import type { IAgent, AgentState, Task } from '@/types';

export class MockAgent implements IAgent {
  id: string;
  name: string;
  capabilities: string[];
  state: AgentState = 'idle';

  private executeHandler: ((task: Task) => Promise<any>) | null = null;
  private executionCalls: Task[] = [];

  constructor(config: {
    id?: string;
    name?: string;
    capabilities?: string[];
    executeHandler?: (task: Task) => Promise<any>;
  } = {}) {
    this.id = config.id || 'mock-agent';
    this.name = config.name || 'Mock Agent';
    this.capabilities = config.capabilities || ['test'];
    this.executeHandler = config.executeHandler || this.defaultExecuteHandler;
  }

  async execute(task: Task): Promise<any> {
    this.state = 'running';
    this.executionCalls.push(task);

    try {
      const result = await this.executeHandler!(task);
      this.state = 'idle';
      return result;
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  private async defaultExecuteHandler(task: Task): Promise<any> {
    return {
      status: 'completed',
      taskId: task.id,
      result: `Executed ${task.type}`,
    };
  }

  async getStatus(): Promise<AgentState> {
    return this.state;
  }

  // Test utilities
  getExecutionCalls(): Task[] {
    return this.executionCalls;
  }

  getExecutionCount(): number {
    return this.executionCalls.length;
  }

  reset(): void {
    this.executionCalls = [];
    this.state = 'idle';
  }

  setExecuteHandler(handler: (task: Task) => Promise<any>): void {
    this.executeHandler = handler;
  }
}
```

### Database Mock

```typescript
// tests/mocks/database.mock.ts
export class MockDatabase {
  private tables: Map<string, any[]> = new Map();
  private queries: { sql: string; params: any[] }[] = [];

  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.queries.push({ sql, params });

    // Simple mock implementation
    if (sql.includes('SELECT')) {
      const tableName = sql.match(/FROM\s+(\w+)/)?.[1];
      return this.tables.get(tableName || '') || [];
    }

    return [];
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    this.queries.push({ sql, params });

    if (sql.includes('INSERT')) {
      const tableName = sql.match(/INTO\s+(\w+)/)?.[1];
      const table = this.tables.get(tableName || '') || [];
      table.push(params);
      this.tables.set(tableName || '', table);
      return { changes: 1 };
    }

    if (sql.includes('DELETE')) {
      const tableName = sql.match(/FROM\s+(\w+)/)?.[1];
      const table = this.tables.get(tableName || '') || [];
      this.tables.set(tableName || '', []);
      return { changes: table.length };
    }

    return { changes: 0 };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  // Test utilities
  getQueries(): { sql: string; params: any[] }[] {
    return this.queries;
  }

  getTable(name: string): any[] {
    return this.tables.get(name) || [];
  }

  reset(): void {
    this.tables.clear();
    this.queries = [];
  }
}
```

---

## Configuration Files

### vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    include: [
      '**/__tests__/**/*.test.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.cache',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'junit'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
      perFile: true,
      skipFull: false,
      reportOnFailure: true,
    },

    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,

    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-results.html',
      json: './test-results.json',
      junit: './test-results.xml',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@mocks': path.resolve(__dirname, './tests/mocks'),
      '@helpers': path.resolve(__dirname, './tests/helpers'),
    },
  },
});
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:unit:watch": "vitest --watch tests/unit",
    "test:unit:coverage": "vitest run --coverage tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:integration:watch": "vitest --watch tests/integration",
    "test:integration:coverage": "vitest run --coverage tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:e2e:watch": "vitest --watch tests/e2e",
    "test:e2e:debug": "vitest --inspect-brk --inspect --single-thread tests/e2e",
    "test:performance": "vitest run tests/performance",
    "test:debug": "vitest --inspect-brk --inspect --single-thread",
    "coverage:report": "open coverage/index.html"
  }
}
```

---

## Helper Utilities

### Test Database Helper

```typescript
// tests/helpers/test-database.ts
import Database from 'better-sqlite3';
import type { DistributedDatabase } from '@/types';

export function createTestDatabase(): DistributedDatabase {
  const db = new Database(':memory:');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'idle',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      payload TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return {
    query: (sql: string, params: any[] = []) => {
      try {
        return db.prepare(sql).all(...params);
      } catch (error) {
        console.error('Query error:', sql, params, error);
        throw error;
      }
    },

    execute: (sql: string, params: any[] = []) => {
      try {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        return { changes: info.changes, lastID: info.lastInsertRowid };
      } catch (error) {
        console.error('Execute error:', sql, params, error);
        throw error;
      }
    },

    transaction: <T>(fn: () => T): T => {
      const transaction = db.transaction(fn);
      return transaction();
    },

    close: () => {
      db.close();
    },
  };
}

export function seedTestDatabase(db: DistributedDatabase): void {
  db.execute(`
    INSERT INTO agents (id, name, capabilities, state)
    VALUES (?, ?, ?, ?)
  `, ['agent-1', 'Test Agent 1', 'test,debug', 'idle']);

  db.execute(`
    INSERT INTO agents (id, name, capabilities, state)
    VALUES (?, ?, ?, ?)
  `, ['agent-2', 'Test Agent 2', 'test,deploy', 'idle']);
}
```

### E2E Context Helper

```typescript
// tests/helpers/e2e-context.ts
import { PluginRegistry } from '@/plugins/registry';
import { MessageBus } from '@/messaging/message-bus';
import { AuditLog } from '@/audit/audit-log';

export class E2EContext {
  private plugins: Map<string, any> = new Map();
  private messageBus: MessageBus;
  private auditLog: AuditLog;
  private eventPromises: Map<string, Promise<any>> = new Map();

  async setup(): Promise<void> {
    this.messageBus = new MessageBus();
    this.auditLog = new AuditLog();

    // Load all plugins
    const plugins = await PluginRegistry.loadAll();
    for (const plugin of plugins) {
      plugin.setMessageBus(this.messageBus);
      plugin.setAuditLog(this.auditLog);
      await plugin.initialize();
      this.plugins.set(plugin.name, plugin);
    }
  }

  async executeCommand(commandName: string, context: any): Promise<any> {
    const plugin = Array.from(this.plugins.values()).find(p =>
      p.commands?.some(c => c.name === commandName)
    );

    if (!plugin) {
      throw new Error(`Command not found: ${commandName}`);
    }

    return plugin.executeCommand(commandName, context);
  }

  async waitForAgentCompletion(
    agentId: string,
    timeout: number = 30000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Agent ${agentId} completion timeout`)),
        timeout
      );

      this.messageBus.subscribe(`agent.${agentId}.completed`, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  awaitEvent(eventType: string, timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Event ${eventType} timeout`)),
        timeout
      );

      this.messageBus.subscribe(eventType, (event) => {
        clearTimeout(timer);
        resolve(event);
      });
    });
  }

  async getAuditLog(entityId: string): Promise<any[]> {
    return this.auditLog.getEntries(entityId);
  }

  async cleanup(): Promise<void> {
    // Stop all plugins
    for (const plugin of this.plugins.values()) {
      await plugin.shutdown();
    }
    this.plugins.clear();
  }

  // Accessors for testing
  get jira() {
    return this.plugins.get('jira-orchestrator');
  }

  get executor() {
    return this.plugins.get('exec-automator');
  }

  waitMs(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Assertion Helpers

```typescript
// tests/helpers/assertions.ts
import { expect } from 'vitest';

export const assertAgentCompleted = (result: any) => {
  expect(result).toBeDefined();
  expect(result.status).toBe('completed');
  expect(result.error).toBeUndefined();
};

export const assertWorkflowSuccess = (result: any, expectedSteps: number) => {
  expect(result).toBeDefined();
  expect(result.status).toBe('completed');
  expect(result.steps).toHaveLength(expectedSteps);
  result.steps.forEach((step: any) => {
    expect(step.status).toBe('completed');
  });
};

export const assertMessagePublished = (
  messageBus: any,
  messageType: string,
  matcher?: (msg: any) => boolean
) => {
  const messages = messageBus.getPublished({ type: messageType });
  expect(messages.length).toBeGreaterThan(0);

  if (matcher) {
    expect(messages.some(matcher)).toBe(true);
  }
};

export const assertCoverageThreshold = (
  coverage: any,
  threshold: number = 90
) => {
  expect(coverage.lines).toBeGreaterThanOrEqual(threshold);
  expect(coverage.functions).toBeGreaterThanOrEqual(threshold);
  expect(coverage.branches).toBeGreaterThanOrEqual(threshold - 5);
};
```

---

## CI/CD Setup

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Run all tests with coverage
        run: npm run test:coverage -- --run

      - name: Check coverage thresholds
        run: node scripts/check-coverage.js

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: true
          verbose: true

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.node-version }}
          path: |
            test-results.html
            test-results.json
            coverage/

      - name: Comment PR with test results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const testResults = JSON.parse(fs.readFileSync('./test-results.json'));
            const comment = `
            ## Test Results

            ✅ **${testResults.numPassedTests}** passed
            ❌ **${testResults.numFailedTests}** failed
            ⏭️ **${testResults.numSkippedTests}** skipped

            **Coverage:** ${testResults.coverage.lines}%
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Pre-commit Hook

```bash
#!/usr/bin/env bash
# .husky/pre-commit

set -e

echo "Running tests on staged files..."
npm run test -- --run --changed

if [ $? -ne 0 ]; then
  echo "Tests failed. Aborting commit."
  exit 1
fi

echo "All tests passed!"
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, { timeout: 60000 });

// Or configure globally in vitest.config.ts
test: {
  testTimeout: 60000
}
```

#### Database Lock Errors

```typescript
// Use transactions for test isolation
beforeEach(async () => {
  await db.transaction(async () => {
    // Setup data
  });
});
```

#### Async/Await Issues

```typescript
// Always return promises
it('should handle async', () => {
  return promise; // or use async/await
});

// Wait for async operations
await waitFor(() => condition);
```

---

## Conclusion

This implementation guide provides practical templates and tools to establish a robust testing infrastructure for the plugin ecosystem. Reference these templates when:

- Creating new test files
- Setting up testing for new agents or commands
- Configuring CI/CD pipelines
- Troubleshooting test failures

For more details, refer to the main TEST_STRATEGY.md document.

