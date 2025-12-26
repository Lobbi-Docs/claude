# Plugin Ecosystem Testing Strategy
## Enterprise-Grade Quality Assurance for 5 Plugins, 78 Agents, 103 Commands

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Target Coverage:** 90%+ code coverage
**Status:** PRODUCTION READY

---

## Executive Summary

This document defines a comprehensive testing strategy for the Claude Code plugin ecosystem, encompassing:
- **5 Core Plugins**: jira-orchestrator, exec-automator, ahling-command-center, container-workflow, frontend-powerhouse
- **78 Specialized Agents**: Distributed across Forerunner, Promethean, and Spartan factions
- **103 Commands**: Slash commands for user interaction and automation
- **Message Bus Communication**: Inter-plugin event-driven architecture
- **Autonomous Operations**: Self-managed agent execution with validation

The testing pyramid balances rapid feedback (unit tests) with comprehensive validation (E2E tests), supported by infrastructure-as-code testing patterns and chaos engineering for resilience.

---

## Part 1: Test Pyramid Architecture

### 1.1 Test Pyramid Overview

```
                          ▲
                         / \
                        /   \  E2E Tests (10%)
                       /  E2E \
                      /________\
                     /          \
                    / Integration\  Integration Tests (25%)
                   /             \
                  /_____________\
                 /               \
                / Unit Tests (65%)\
               /_________________\
             Base: Speed, Isolation, Determinism
```

### 1.2 Unit Tests (65% - ~800 tests)

**Scope:** Individual functions, agents, commands, and utilities

**Framework:** Vitest (configured)

**Test Files Structure:**
```
plugin-name/
├── src/
│   ├── agents/
│   │   ├── agent-name.ts
│   │   └── agent-name.test.ts        # Unit tests (1:1 ratio)
│   ├── commands/
│   │   ├── command-name.ts
│   │   └── command-name.test.ts
│   ├── utils/
│   │   ├── utility.ts
│   │   └── utility.test.ts
│   └── services/
│       ├── service.ts
│       └── service.test.ts
└── tests/
    ├── unit/
    │   ├── setup.ts                 # Shared test setup
    │   ├── mocks.ts                 # Mock implementations
    │   └── fixtures.ts              # Test data
```

#### 1.2.1 Unit Test Categories

**A. Agent Logic Tests**
- Agent initialization and configuration
- State management and transitions
- Single agent behavior in isolation
- Error handling and recovery
- Input validation and sanitization
- Output generation and formatting

Example test suite:
```typescript
// jira-orchestrator/src/agents/triage-agent.test.ts
describe('TriageAgent', () => {
  let agent: TriageAgent;

  beforeEach(() => {
    agent = new TriageAgent({
      config: mockConfig,
      logger: mockLogger,
    });
  });

  describe('triageIssue', () => {
    it('should classify issue by complexity', async () => {
      const issue = createMockIssue({ complexity: 'high' });
      const result = await agent.triageIssue(issue);

      expect(result.priority).toBe('high');
      expect(result.assignedTeam).toBeDefined();
    });

    it('should handle malformed input gracefully', async () => {
      const result = await agent.triageIssue(null);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_INPUT');
    });
  });
});
```

**B. Command Handler Tests**
- Command parsing and validation
- Command option/flag processing
- Command execution flow
- Return value validation
- Exit codes and error states

**C. Utility Function Tests**
- Pure function outputs
- Edge case handling
- Performance characteristics
- Error conditions

**D. Configuration Tests**
- Default configurations
- Configuration merging
- Validation rules
- Environment variable handling

#### 1.2.2 Unit Test Coverage Targets

| Component Type | Coverage Target | Exemptions |
|---|---|---|
| Agent logic | 95% | Generated code, UI rendering |
| Commands | 90% | CLI formatting, terminal output |
| Services | 90% | External API mocks required |
| Utilities | 95% | Pure functions, no exemptions |
| Orchestration | 85% | Complex async patterns allowed |
| Configuration | 85% | Environment-specific configs |

#### 1.2.3 Mocking Strategy

**Critical Mocks Required:**
```typescript
// tests/unit/mocks.ts
export const mockConfig = {
  apiUrl: 'https://api.mock.test',
  timeout: 5000,
  retries: 2,
};

export const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

export const mockMessageBus = {
  publish: vi.fn().mockResolvedValue(true),
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  emit: vi.fn().mockResolvedValue(true),
};

export const mockDatabase = {
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
};

export const createMockAgent = (overrides = {}) => ({
  id: 'test-agent-123',
  name: 'test-agent',
  capabilities: ['test-capability'],
  state: 'idle',
  ...overrides,
});
```

**Mock Verification Pattern:**
```typescript
it('should publish message on agent completion', async () => {
  await agent.execute(task);

  expect(mockMessageBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      event: 'agent.completed',
      agentId: agent.id,
      taskId: task.id,
    })
  );
});
```

#### 1.2.4 Unit Test Execution

**Run all unit tests:**
```bash
npm run test:unit
# or for specific plugin:
npm run test:unit -w @claude/jira-orchestrator
```

**Generate coverage report:**
```bash
npm run test:unit:coverage
# Outputs: coverage/
#   ├── index.html       (HTML report)
#   ├── coverage-final.json
#   └── lcov.info
```

**Continuous monitoring:**
```bash
npm run test:unit:watch
```

---

### 1.3 Integration Tests (25% - ~300 tests)

**Scope:** Multi-component interactions, plugins communicating via message bus, agent coordination

**Framework:** Vitest with custom test harness

#### 1.3.1 Integration Test Categories

**A. Inter-Plugin Communication Tests**

Test plugin-to-plugin communication through message bus:

```typescript
// tests/integration/plugins/plugin-communication.test.ts
describe('Plugin Communication via Message Bus', () => {
  let messageBus: MessageBus;
  let plugin1: JiraOrchestratorPlugin;
  let plugin2: ExecAutomatorPlugin;

  beforeEach(async () => {
    messageBus = new MessageBus();
    plugin1 = new JiraOrchestratorPlugin({ messageBus });
    plugin2 = new ExecAutomatorPlugin({ messageBus });

    await plugin1.initialize();
    await plugin2.initialize();
  });

  it('should forward issue completion event from jira to exec-automator', async () => {
    const listener = vi.fn();
    plugin2.on('issue.completed', listener);

    // Trigger issue completion in plugin1
    await plugin1.completeIssue(testIssue.id);

    // Wait for message propagation
    await waitFor(() => listener.mock.calls.length > 0);

    expect(listener).toHaveBeenCalledWith({
      issueId: testIssue.id,
      timestamp: expect.any(Number),
    });
  });

  it('should handle message routing to multiple subscribers', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    plugin1.on('task.created', listener1);
    plugin2.on('task.created', listener2);

    await plugin1.createTask({ name: 'test-task' });

    await waitFor(() => listener1.mock.calls.length > 0 && listener2.mock.calls.length > 0);

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should handle message bus failures with retry logic', async () => {
    const failingBus = new FailingMessageBus({ failureRate: 0.5 });
    plugin1.setMessageBus(failingBus);

    const result = await plugin1.sendMessage({
      target: 'exec-automator',
      type: 'task.execute',
      payload: testPayload,
    });

    expect(result.success).toBe(true);
    expect(result.retries).toBeGreaterThan(0);
  });
});
```

**B. Agent Coordination Tests**

Test multiple agents working together:

```typescript
// tests/integration/agents/multi-agent-coordination.test.ts
describe('Multi-Agent Coordination', () => {
  let orchestrator: AgentOrchestrator;
  let taskQueue: TaskQueue;
  let agents: Agent[];

  beforeEach(async () => {
    taskQueue = new TaskQueue(createDatabase(':memory:'));
    orchestrator = new AgentOrchestrator({ taskQueue });

    // Register test agents
    agents = [
      new TriageAgent(),
      new TaskEnricherAgent(),
      new CodeReviewerAgent(),
      new DocumentationWriterAgent(),
    ];

    agents.forEach(agent => orchestrator.registerAgent(agent));
  });

  it('should execute sequential agent workflow', async () => {
    const workflow = [
      { agentId: 'triage-agent', task: 'triage issue' },
      { agentId: 'enricher-agent', task: 'enrich task' },
      { agentId: 'reviewer-agent', task: 'review code' },
      { agentId: 'docs-agent', task: 'write docs' },
    ];

    const result = await orchestrator.executeWorkflow(workflow, testIssue);

    expect(result.status).toBe('completed');
    expect(result.agentResults).toHaveLength(4);
    result.agentResults.forEach((agentResult, idx) => {
      expect(agentResult.agentId).toBe(workflow[idx].agentId);
      expect(agentResult.status).toBe('completed');
    });
  });

  it('should handle agent failures with fallback agents', async () => {
    const workflow = [
      {
        agentId: 'primary-agent',
        fallback: 'secondary-agent'
      },
    ];

    // Make primary agent fail
    orchestrator.getAgent('primary-agent').setFailure(new Error('Primary failed'));

    const result = await orchestrator.executeWorkflow(workflow, testTask);

    expect(result.status).toBe('completed');
    expect(result.executedBy).toBe('secondary-agent');
  });

  it('should respect agent capability requirements', async () => {
    const task = {
      type: 'code-generation',
      requiredCapabilities: ['typescript', 'react'],
    };

    const result = await orchestrator.findSuitableAgent(task);

    expect(result.agent).toBeDefined();
    expect(result.agent.capabilities).toContain('typescript');
    expect(result.agent.capabilities).toContain('react');
  });

  it('should coordinate parallel agent execution', async () => {
    const parallelTasks = [
      { agentId: 'agent1', task: taskA },
      { agentId: 'agent2', task: taskB },
      { agentId: 'agent3', task: taskC },
    ];

    const startTime = Date.now();
    const result = await orchestrator.executeParallel(parallelTasks);
    const duration = Date.now() - startTime;

    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(3);

    // Should be faster than sequential execution
    expect(duration).toBeLessThan(orchestrator.sequentialEstimatedTime);
  });
});
```

**C. Command Execution Tests**

Test commands operating across multiple agents:

```typescript
// tests/integration/commands/command-execution.test.ts
describe('Command Execution', () => {
  let commandExecutor: CommandExecutor;
  let messageBus: MessageBus;

  beforeEach(async () => {
    messageBus = new MessageBus();
    commandExecutor = new CommandExecutor({ messageBus });
    await commandExecutor.initialize();
  });

  it('should execute /jira:work command with full workflow', async () => {
    const context = {
      issueId: 'JIRA-123',
      userId: 'user-123',
      selectedAgents: ['triage-agent', 'task-enricher'],
    };

    const result = await commandExecutor.execute('jira:work', context);

    expect(result.status).toBe('success');
    expect(result.executedAgents).toHaveLength(2);
    expect(result.issueUpdated).toBe(true);
  });

  it('should handle command cancellation gracefully', async () => {
    const execution = commandExecutor.executeStream('jira:work', context);

    await delay(100);
    execution.cancel();

    const result = await execution.promise;
    expect(result.cancelled).toBe(true);
    expect(result.cleanedUp).toBe(true);
  });
});
```

**D. Data Flow Integration Tests**

Test data flowing through plugin pipeline:

```typescript
// tests/integration/data-flow/pipeline.test.ts
describe('Data Flow Pipeline', () => {
  it('should transform data through agent pipeline', async () => {
    const input = {
      rawIssue: createMockJiraIssue(),
    };

    const result = await pipeline.execute([
      { agent: 'parser-agent', transform: 'parseIssue' },
      { agent: 'enricher-agent', transform: 'enrichWithContext' },
      { agent: 'validator-agent', transform: 'validateData' },
    ], input);

    expect(result.data).toBeDefined();
    expect(result.data.parsed).toBe(true);
    expect(result.data.enriched).toBe(true);
    expect(result.data.valid).toBe(true);
  });
});
```

#### 1.3.2 Integration Test Infrastructure

**Test Harness Setup:**
```typescript
// tests/integration/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

let testEnvironment: TestEnvironment;

beforeAll(async () => {
  testEnvironment = new TestEnvironment();
  await testEnvironment.initialize({
    messageBus: 'in-memory',
    database: 'sqlite:memory',
    logLevel: 'debug',
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

export const getTestEnvironment = () => testEnvironment;
```

**Message Bus Test Double:**
```typescript
// tests/integration/doubles/test-message-bus.ts
export class TestMessageBus implements IMessageBus {
  private messages: Message[] = [];
  private subscribers: Map<string, Listener[]> = new Map();

  async publish(message: Message): Promise<void> {
    this.messages.push(message);
    const listeners = this.subscribers.get(message.type) || [];
    await Promise.all(listeners.map(l => l(message)));
  }

  subscribe(type: string, listener: Listener): Unsubscribe {
    const listeners = this.subscribers.get(type) || [];
    listeners.push(listener);
    this.subscribers.set(type, listeners);

    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  getMessages(filter?: Partial<Message>): Message[] {
    return this.messages.filter(m =>
      !filter || Object.entries(filter).every(([k, v]) => m[k] === v)
    );
  }

  clear(): void {
    this.messages = [];
    this.subscribers.clear();
  }
}
```

#### 1.3.3 Integration Test Execution

```bash
# Run all integration tests
npm run test:integration

# Run specific integration suite
npm run test:integration -- plugins/plugin-communication.test.ts

# Integration tests with coverage
npm run test:integration:coverage

# Watch integration tests
npm run test:integration:watch
```

---

### 1.4 End-to-End (E2E) Tests (10% - ~120 tests)

**Scope:** Complete user workflows from command invocation to completion

**Framework:** Vitest + playwright (for UI interactions) + custom orchestration harness

#### 1.4.1 E2E Test Scenarios

**A. Complete Issue Workflow E2E**

```typescript
// tests/e2e/workflows/complete-issue-workflow.test.ts
describe('Complete Issue Workflow E2E', () => {
  let context: E2EContext;

  beforeEach(async () => {
    context = new E2EContext();
    await context.setup();
  });

  it('should complete full /jira:work → /jira:prepare → /jira:commit → /jira:pr workflow', async () => {
    // 1. Trigger /jira:work command
    const workResult = await context.executeCommand('jira:work', {
      issueKey: 'TEST-123',
    });

    expect(workResult.status).toBe('started');
    await context.waitForAgentCompletion('triage-agent');

    // 2. Execute /jira:prepare to enrich task
    const prepareResult = await context.executeCommand('jira:prepare', {
      issueKey: 'TEST-123',
    });

    expect(prepareResult.enrichedIssue).toBeDefined();
    expect(prepareResult.subtasks).toHaveLength(3);

    // 3. Execute /jira:commit with generated message
    const commitResult = await context.executeCommand('jira:commit', {
      issueKey: 'TEST-123',
      message: prepareResult.suggestedMessage,
    });

    expect(commitResult.sha).toBeDefined();

    // 4. Create PR with /jira:pr
    const prResult = await context.executeCommand('jira:pr', {
      issueKey: 'TEST-123',
      baseBranch: 'main',
    });

    expect(prResult.prUrl).toBeDefined();
    expect(prResult.linkedToIssue).toBe(true);

    // Verify complete audit trail
    const auditLog = await context.getAuditLog('TEST-123');
    expect(auditLog.events).toHaveLength(4);
    expect(auditLog.events.map(e => e.command)).toEqual([
      'jira:work', 'jira:prepare', 'jira:commit', 'jira:pr'
    ]);
  });

  it('should handle /jira:work cancellation and cleanup', async () => {
    const workExecution = context.executeCommand('jira:work', {
      issueKey: 'TEST-124',
    });

    await context.waitMs(500);

    const cancelled = await workExecution.cancel();
    expect(cancelled).toBe(true);

    // Verify cleanup
    const tempFiles = await context.getTempFiles('TEST-124');
    expect(tempFiles).toHaveLength(0);
  });
});
```

**B. Multi-Plugin E2E Workflow**

```typescript
// tests/e2e/workflows/multi-plugin-workflow.test.ts
describe('Multi-Plugin E2E Workflow', () => {
  it('should coordinate jira-orchestrator and exec-automator across issue completion', async () => {
    // 1. Create issue and workflow in Jira
    const issue = await context.jira.createIssue({
      summary: 'Setup automation for product launch',
      description: 'Configure deployment scripts',
    });

    // 2. Trigger orchestration in jira-orchestrator
    await context.executeCommand('jira:work', {
      issueKey: issue.key,
      selectedAgents: ['task-enricher', 'documentation-writer'],
    });

    // 3. Listen for exec-automator trigger
    const automationTriggered = context.awaitEvent('automation:triggered');

    // 4. Complete issue which triggers automation
    await context.jira.transitionIssue(issue.key, 'Done');

    // 5. Verify exec-automator was triggered
    const automation = await automationTriggered;
    expect(automation.sourceIssue).toBe(issue.key);
    expect(automation.workflowId).toBeDefined();

    // 6. Monitor automation execution
    let automationStatus = await context.getAutomationStatus(automation.workflowId);
    while (automationStatus.status === 'running') {
      await context.waitMs(1000);
      automationStatus = await context.getAutomationStatus(automation.workflowId);
    }

    expect(automationStatus.status).toBe('completed');
    expect(automationStatus.executedSteps).toBeGreaterThan(0);
  });
});
```

**C. Error Recovery E2E**

```typescript
// tests/e2e/workflows/error-recovery.test.ts
describe('Error Recovery E2E', () => {
  it('should recover from transient API failures', async () => {
    // Setup Jira to fail initially
    context.jira.failNext(2, new Error('Service unavailable'));

    const result = await context.executeCommand('jira:work', {
      issueKey: 'TEST-125',
    });

    // Should succeed after retries
    expect(result.status).toBe('started');
    expect(result.retries).toBe(2);
  });

  it('should fallback to secondary agent on primary failure', async () => {
    context.disableAgent('primary-reviewer-agent');

    const result = await context.executeCommand('jira:review', {
      prUrl: 'https://github.com/org/repo/pull/123',
    });

    expect(result.status).toBe('completed');
    expect(result.executedBy).toBe('secondary-reviewer-agent');
  });
});
```

#### 1.4.2 E2E Test Infrastructure

**E2E Context Helper:**
```typescript
// tests/e2e/context.ts
export class E2EContext {
  private plugins: Map<string, Plugin>;
  private eventBus: EventBus;
  private auditLog: AuditLog;

  async setup(): Promise<void> {
    // Initialize all plugins
    this.plugins = await PluginRegistry.loadAll();
    this.eventBus = new EventBus();
    this.auditLog = new AuditLog();

    // Wire up message buses
    this.plugins.forEach(plugin => {
      plugin.setMessageBus(this.eventBus);
      plugin.setAuditLog(this.auditLog);
    });

    // Start all plugins
    await Promise.all(Array.from(this.plugins.values()).map(p => p.start()));
  }

  async executeCommand(commandName: string, context: any): Promise<any> {
    const command = this.plugins.get('command-registry').getCommand(commandName);
    return command.execute(context);
  }

  async waitForAgentCompletion(agentId: string, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), timeout);

      this.eventBus.on(`agent.${agentId}.completed`, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async getAuditLog(entityId: string): Promise<AuditLogEntry[]> {
    return this.auditLog.getEntries(entityId);
  }
}
```

#### 1.4.3 E2E Test Execution

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E workflow
npm run test:e2e -- workflows/complete-issue-workflow.test.ts

# E2E tests with debug logging
npm run test:e2e -- --reporter=verbose

# Record E2E execution for debugging
npm run test:e2e -- --record
```

---

### 1.5 Contract Tests (API Compatibility)

**Scope:** Plugin APIs maintain backward compatibility

#### 1.5.1 Contract Test Implementation

```typescript
// tests/contracts/plugin-contracts.test.ts
describe('Plugin API Contracts', () => {
  describe('jira-orchestrator v4.0.0 contract', () => {
    it('should maintain IssueHandler interface', async () => {
      const handler = new IssueHandler();

      const contract = {
        methods: {
          'startWork(issueId: string)': 'Returns WorkContext',
          'completeIssue(issueId: string)': 'Returns CompletionResult',
          'enrichIssue(issueId: string, data: any)': 'Returns EnrichedIssue',
        },
        events: [
          'issue.started',
          'issue.completed',
          'issue.enriched',
        ],
      };

      // Verify all methods exist
      Object.keys(contract.methods).forEach(method => {
        const [name, ...args] = method.match(/(\w+)\((.*)\)/)?.[1] || '';
        expect(typeof handler[name]).toBe('function');
      });

      // Verify all events can be subscribed
      contract.events.forEach(event => {
        expect(() => handler.on(event, () => {})).not.toThrow();
      });
    });

    it('should maintain backward compatibility with v3.0 clients', async () => {
      const v3Client = createMockV3Client();
      const v4Plugin = new JiraOrchestratorV4();

      // v3 calls should still work
      const result = await v4Plugin.handleV3Request({
        command: 'work',
        issueId: 'TEST-1',
      });

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('Agent capability contracts', () => {
    it('should provide required capabilities in Agent interface', async () => {
      const agents = [
        new TriageAgent(),
        new TaskEnricherAgent(),
        new CodeReviewerAgent(),
      ];

      agents.forEach(agent => {
        expect(agent.id).toBeDefined();
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(typeof agent.execute).toBe('function');
        expect(typeof agent.getStatus).toBe('function');
      });
    });
  });
});
```

---

## Part 2: Testing Infrastructure

### 2.1 Test Framework Setup

**Core Testing Stack:**
- **Test Runner:** Vitest 1.1.0+
- **Assertion Library:** Vitest built-in (chai)
- **Mocking:** Vitest vi module
- **Coverage:** @vitest/coverage-v8
- **Browser Testing:** Playwright (for UI E2E)

#### 2.1.1 Root vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',
    globals: true,

    // Files and patterns
    include: [
      '**/__tests__/**/*.test.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
        '**/__mocks__/**',
      ],
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
      perFile: true,
    },

    // Performance
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,

    // Reporting
    reporters: ['verbose'],
    outputFile: {
      json: './test-results.json',
      html: './test-results.html',
    },

    // Concurrency
    threads: true,
    maxThreads: 4,
    minThreads: 1,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

### 2.2 Test Data Management

#### 2.2.1 Fixtures and Factories

```typescript
// tests/fixtures/issue-fixtures.ts
export const createMockJiraIssue = (overrides = {}): JiraIssue => ({
  key: 'TEST-123',
  id: 'test-123-id',
  summary: 'Test issue',
  description: 'Test description',
  status: 'To Do',
  assignee: null,
  priority: 'Medium',
  labels: [],
  components: [],
  created: new Date(),
  updated: new Date(),
  dueDate: null,
  ...overrides,
});

export const createMockAgent = (overrides = {}): Agent => ({
  id: 'test-agent',
  name: 'Test Agent',
  capabilities: ['test'],
  state: 'idle',
  execute: vi.fn(),
  getStatus: vi.fn(),
  ...overrides,
});

// Builder pattern for complex objects
export class IssueBuilder {
  private issue: Partial<JiraIssue> = createMockJiraIssue();

  withStatus(status: string): this {
    this.issue.status = status;
    return this;
  }

  withAssignee(assignee: string): this {
    this.issue.assignee = assignee;
    return this;
  }

  withLabels(labels: string[]): this {
    this.issue.labels = labels;
    return this;
  }

  build(): JiraIssue {
    return this.issue as JiraIssue;
  }
}
```

#### 2.2.2 Test Database

```typescript
// tests/setup/test-database.ts
import Database from 'better-sqlite3';

export function createTestDatabase(): DistributedDatabase {
  const db = new Database(':memory:');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      state TEXT NOT NULL
    );

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return new DistributedDatabase(db);
}

// Cleanup helper
export function cleanupTestDatabase(db: DistributedDatabase): void {
  db.execute('DELETE FROM messages');
  db.execute('DELETE FROM tasks');
  db.execute('DELETE FROM agents');
}
```

### 2.3 Mock Implementations

#### 2.3.1 Message Bus Mock

```typescript
// tests/mocks/message-bus-mock.ts
export class MockMessageBus implements IMessageBus {
  private published: Message[] = [];
  private subscribers: Map<string, Set<Function>> = new Map();
  public shouldFail = false;
  public failureRate = 0;

  async publish(message: Message): Promise<PublishResult> {
    if (this.shouldFail || Math.random() < this.failureRate) {
      throw new Error('Message bus failure');
    }

    this.published.push({
      ...message,
      timestamp: Date.now(),
    });

    const listeners = this.subscribers.get(message.type) || new Set();
    listeners.forEach(listener => {
      setImmediate(() => listener(message));
    });

    return {
      messageId: `msg-${Date.now()}`,
      success: true,
    };
  }

  subscribe(messageType: string, listener: Function): Function {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    this.subscribers.get(messageType)!.add(listener);

    return () => {
      this.subscribers.get(messageType)?.delete(listener);
    };
  }

  getPublished(filter?: Partial<Message>): Message[] {
    return this.published.filter(m => {
      if (!filter) return true;
      return Object.entries(filter).every(([k, v]) => m[k] === v);
    });
  }

  reset(): void {
    this.published = [];
    this.subscribers.clear();
  }
}
```

### 2.4 CI/CD Integration

#### 2.4.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Integration tests
        run: npm run test:integration -- --coverage

      - name: E2E tests
        run: npm run test:e2e
        timeout-minutes: 30

      - name: Upload coverage
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
            test-results.json
            test-results.html
            coverage/

  coverage-gates:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v3
      - name: Check coverage thresholds
        run: |
          node scripts/check-coverage.js
```

---

## Part 3: Quality Gates

### 3.1 Code Coverage Requirements

| Metric | Target | Threshold | Check |
|---|---|---|---|
| Overall | 90% | 85% | Fail if < 85% |
| Statements | 90% | 85% | Per-file enforcement |
| Branches | 85% | 80% | Critical paths |
| Functions | 90% | 85% | Public APIs |
| Lines | 90% | 85% | Executable code |

#### 3.1.1 Coverage Enforcement Script

```javascript
// scripts/check-coverage.js
const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  lines: 85,
  statements: 85,
  functions: 85,
  branches: 80,
};

const coverageSummary = JSON.parse(
  fs.readFileSync('./coverage/coverage-final.json', 'utf-8')
);

let hasFailed = false;

Object.entries(coverageSummary).forEach(([file, coverage]) => {
  const lineCoverage = coverage.lines.pct;
  const branchCoverage = coverage.branches.pct;
  const funcCoverage = coverage.functions.pct;

  if (lineCoverage < THRESHOLDS.lines) {
    console.error(`Line coverage too low in ${file}: ${lineCoverage}%`);
    hasFailed = true;
  }
  if (branchCoverage < THRESHOLDS.branches) {
    console.error(`Branch coverage too low in ${file}: ${branchCoverage}%`);
    hasFailed = true;
  }
  if (funcCoverage < THRESHOLDS.functions) {
    console.error(`Function coverage too low in ${file}: ${funcCoverage}%`);
    hasFailed = true;
  }
});

if (hasFailed) process.exit(1);
console.log('Coverage gates passed!');
```

### 3.2 Performance Benchmarks

#### 3.2.1 Performance Targets

| Operation | Target P50 | Target P95 | Target P99 | Target Throughput |
|---|---|---|---|---|
| Agent initialization | 50ms | 100ms | 200ms | - |
| Single task execution | 500ms | 1000ms | 2000ms | 10 tasks/sec |
| Message publish | 5ms | 10ms | 20ms | 10k msg/sec |
| Task dequeue | 3ms | 8ms | 15ms | 12k tasks/sec |
| Multi-agent coordination | 2000ms | 5000ms | 10000ms | 5 workflows/sec |

#### 3.2.2 Performance Test

```typescript
// tests/performance/performance.test.ts
describe('Performance Benchmarks', () => {
  it('should meet agent initialization target', async () => {
    const iterations = 100;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const agent = new TriageAgent();
      await agent.initialize();
      durations.push(performance.now() - start);
    }

    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(iterations * 0.5)];
    const p95 = sorted[Math.floor(iterations * 0.95)];
    const p99 = sorted[Math.floor(iterations * 0.99)];

    expect(p50).toBeLessThan(50);
    expect(p95).toBeLessThan(100);
    expect(p99).toBeLessThan(200);
  });

  it('should meet message publish throughput', async () => {
    const bus = new MessageBus();
    const messageCount = 10000;
    const start = performance.now();

    for (let i = 0; i < messageCount; i++) {
      await bus.publish({
        type: 'test.message',
        payload: { id: i },
      });
    }

    const duration = performance.now() - start;
    const throughput = (messageCount / duration) * 1000;

    expect(throughput).toBeGreaterThan(10000); // 10k msg/sec
  });
});
```

### 3.3 Security Scanning

#### 3.3.1 Dependency Security

```yaml
# .github/workflows/security.yml
name: Security Scans

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: SAST scan (SonarQube)
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

### 3.4 Approval Workflows

#### 3.4.1 Test Results in PR

```typescript
// scripts/post-pr-comment.js
const github = require('@actions/github');
const fs = require('fs');

async function postResults() {
  const testResults = JSON.parse(fs.readFileSync('./test-results.json'));
  const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-final.json'));

  const comment = `
## Test Results

✅ **${testResults.stats.tests}** tests passed
❌ **${testResults.stats.failures}** tests failed
⏭️ **${testResults.stats.skipped}** tests skipped

### Coverage Summary
- Lines: **${coverage.total.lines.pct}%**
- Branches: **${coverage.total.branches.pct}%**
- Functions: **${coverage.total.functions.pct}%**

${coverage.total.lines.pct >= 90 ? '✅ Coverage gates passed' : '❌ Coverage gates failed'}
  `;

  const client = github.getOctokit(process.env.GITHUB_TOKEN);
  await client.rest.issues.createComment({
    ...github.context.repo,
    issue_number: github.context.issue.number,
    body: comment,
  });
}

postResults();
```

---

## Part 4: Test Scenarios

### 4.1 Happy Path Scenarios

#### 4.1.1 Issue Completion Flow

**Scenario:** User completes a Jira issue using the full orchestration workflow

```gherkin
Feature: Issue Completion Workflow
  Scenario: Complete issue with full agent coordination
    Given an issue in "To Do" status
    When I execute /jira:work command
    And wait for triage-agent to complete
    And execute /jira:prepare
    And create subtasks
    And mark subtasks complete
    And execute /jira:commit
    Then issue transitions to "In Progress"
    And commit is linked to issue
    And /jira:pr creates pull request
    And pull request is linked to issue
```

**Test Implementation:**
```typescript
it('should complete happy path scenario', async () => {
  // Setup
  const issue = await jira.createIssue(testIssueData);

  // Triage
  const triageResult = await executeCommand('jira:work', { issue: issue.key });
  expect(triageResult.status).toBe('started');

  // Prepare
  const prepareResult = await executeCommand('jira:prepare', { issue: issue.key });
  expect(prepareResult.subtasks).toHaveLength(3);

  // Mark subtasks complete
  for (const subtask of prepareResult.subtasks) {
    await jira.transitionIssue(subtask.key, 'Done');
  }

  // Commit
  const commitResult = await executeCommand('jira:commit', {
    issue: issue.key,
    message: prepareResult.commitMessage,
  });
  expect(commitResult.sha).toBeDefined();

  // PR
  const prResult = await executeCommand('jira:pr', { issue: issue.key });
  expect(prResult.number).toBeDefined();

  // Verify end state
  const finalIssue = await jira.getIssue(issue.key);
  expect(finalIssue.status).toBe('Done');
  expect(finalIssue.linkedPullRequest).toBe(prResult.number);
});
```

### 4.2 Error Handling Scenarios

#### 4.2.1 Transient Failures with Retry

```typescript
it('should retry on transient API failures', async () => {
  const mockApi = new MockJiraAPI();
  mockApi.failNext(2, new Error('503 Service Unavailable'));

  const result = await executeCommand('jira:work', { issue: 'TEST-1' });

  expect(result.status).toBe('started');
  expect(mockApi.retryCount).toBe(2);
});
```

#### 4.2.2 Agent Fallback

```typescript
it('should fallback when agent unavailable', async () => {
  orchestrator.disableAgent('primary-reviewer');

  const result = await executeCommand('jira:review', {
    pullRequest: mockPR,
  });

  expect(result.status).toBe('completed');
  expect(result.executedBy).toBe('secondary-reviewer');
});
```

### 4.3 Edge Case Scenarios

#### 4.3.1 Concurrent Command Execution

```typescript
it('should handle concurrent command execution', async () => {
  const commands = [
    executeCommand('jira:work', { issue: 'TEST-1' }),
    executeCommand('jira:work', { issue: 'TEST-2' }),
    executeCommand('jira:work', { issue: 'TEST-3' }),
  ];

  const results = await Promise.all(commands);

  expect(results).toHaveLength(3);
  results.forEach(r => expect(r.status).toBe('started'));
});
```

#### 4.3.2 Large Batch Operations

```typescript
it('should handle batch of 1000 messages', async () => {
  const messages = Array.from({ length: 1000 }, (_, i) => ({
    type: 'batch.message',
    payload: { index: i },
  }));

  const start = performance.now();
  await messageBus.publishBatch(messages);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000);
});
```

### 4.4 Chaos Engineering Scenarios

#### 4.4.1 Network Partition Simulation

```typescript
// tests/chaos/network-partition.test.ts
describe('Network Partition Resilience', () => {
  it('should handle partial network partition', async () => {
    const partition = new NetworkPartition({
      failureRate: 0.3, // 30% of messages fail
      latency: 5000,    // 5 second delay
    });

    orchestrator.setNetworkSimulation(partition);

    const result = await orchestrator.executeWorkflow(workflow);

    expect(result.status).toBe('completed');
    expect(result.completionTime).toBeGreaterThan(5000);
  });
});
```

#### 4.4.2 Resource Exhaustion

```typescript
// tests/chaos/resource-exhaustion.test.ts
describe('Resource Exhaustion Resilience', () => {
  it('should gracefully degrade under memory pressure', async () => {
    const monitor = new ResourceMonitor();
    monitor.limitMemory(100 * 1024 * 1024); // 100MB limit

    const result = await orchestrator.executeWorkflow(largeWorkflow);

    expect(result.status).toBe('partial_completion' || 'completed');
    expect(monitor.peakMemory).toBeLessThan(100 * 1024 * 1024);
  });
});
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up vitest configuration across all plugins
- [ ] Create shared test utilities and fixtures
- [ ] Implement mock implementations (MessageBus, Database, Logger)
- [ ] Write unit tests for core agent logic (target: 300 tests)

### Phase 2: Integration (Weeks 3-4)
- [ ] Implement plugin communication tests
- [ ] Create integration test harness
- [ ] Write multi-agent coordination tests
- [ ] Set up CI/CD test pipeline

### Phase 3: E2E and Quality (Weeks 5-6)
- [ ] Implement E2E test scenarios
- [ ] Set up performance benchmarking
- [ ] Configure coverage gates
- [ ] Security scanning integration

### Phase 4: Documentation and Governance (Week 7)
- [ ] Document testing patterns
- [ ] Create testing best practices guide
- [ ] Setup test result dashboards
- [ ] Establish test maintenance process

---

## Part 6: Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test

# Run tests by type
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e              # E2E tests only

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Advanced Usage

```bash
# Run specific test file
npm run test -- path/to/test.test.ts

# Run tests matching pattern
npm run test -- --grep "Agent"

# Run with custom reporter
npm run test -- --reporter=junit

# Run with specific timeout
npm run test -- --testTimeout=60000

# Debug tests
npm run test:debug
```

---

## Part 7: Maintenance and Best Practices

### 7.1 Test Maintenance

- **Review coverage monthly** - Maintain 90%+ baseline
- **Update tests with features** - TDD-first approach
- **Refactor tests regularly** - Keep test code DRY
- **Archive old tests** - Remove obsolete test cases

### 7.2 Test Quality Principles

1. **Single Responsibility** - One assertion per test where possible
2. **Descriptive Naming** - Test names describe the scenario
3. **Proper Setup/Teardown** - No test interdependencies
4. **Meaningful Assertions** - Assert on behavior, not implementation
5. **Avoid Test Duplication** - Use shared fixtures and helpers

---

## Conclusion

This comprehensive testing strategy provides a framework for ensuring the Claude Code plugin ecosystem maintains high quality, reliability, and maintainability. The test pyramid approach balances speed with coverage, while the quality gates ensure standards are maintained throughout development.

Success metrics:
- 90%+ code coverage across all plugins
- 100% command coverage with happy path + error scenarios
- Sub-second unit test execution
- <5 minute E2E suite completion
- Zero critical security vulnerabilities
- 99.9%+ plugin reliability in production

