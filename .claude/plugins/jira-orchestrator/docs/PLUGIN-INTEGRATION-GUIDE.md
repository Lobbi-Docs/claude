# Plugin Integration Guide

Complete guide for integrating plugins with the Jira Orchestrator routing engine.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Setup](#plugin-setup)
3. [Message Bus Integration](#message-bus-integration)
4. [RPC Server Setup](#rpc-server-setup)
5. [State Management](#state-management)
6. [Circuit Breaker](#circuit-breaker)
7. [Complete Example](#complete-example)

---

## Quick Start

### 1. Install Dependencies

```bash
cd your-plugin
npm install --save @jira-orchestrator/messagebus
npm install --save @jira-orchestrator/state-manager
npm install --save @jira-orchestrator/circuit-breaker
```

### 2. Update Plugin Manifest

Add routing and communication configuration to `.claude-plugin/plugin.json`:

```json
{
  "name": "your-plugin",
  "version": "1.0.0",

  "capabilities": {
    "domains": ["backend", "api"],
    "contexts": ["python", "fastapi"],
    "patterns": ["rest-api"],
    "integrations": ["mongodb", "keycloak"]
  },

  "routing": {
    "priority": 100,
    "keywords": ["backend", "api", "fastapi"],
    "contextPatterns": ["**/*.py", "**/api/**/*"],
    "acceptsRoutingFrom": ["jira-orchestrator"],
    "canRouteTo": []
  },

  "communication": {
    "messagebus": {
      "enabled": true,
      "topics": [
        "plugin.your-plugin.request",
        "plugin.your-plugin.response",
        "plugin.your-plugin.events"
      ],
      "subscriptions": [
        "system.broadcast",
        "jira.orchestrator.commands"
      ]
    },
    "rpc": {
      "enabled": true,
      "endpoint": "plugin://your-plugin/rpc",
      "methods": ["execute_command", "query_agents", "get_status"]
    }
  },

  "errorHandling": {
    "circuitBreaker": {
      "enabled": true,
      "threshold": 5,
      "timeout": 60000,
      "halfOpenRetries": 3
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoff": "exponential",
      "initialDelay": 1000,
      "maxDelay": 10000
    }
  }
}
```

### 3. Create Plugin Entry Point

Create `lib/plugin-bootstrap.ts`:

```typescript
import { getMessageBus, RPCServer } from '@jira-orchestrator/messagebus';
import { CircuitBreaker } from '@jira-orchestrator/circuit-breaker';
import { PluginCommandHandler } from './command-handler';

export class YourPluginBootstrap {
  private messageBus: ReturnType<typeof getMessageBus>;
  private rpcServer: RPCServer;
  private commandHandler: PluginCommandHandler;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Initialize message bus
    this.messageBus = getMessageBus('your-plugin');

    // Initialize RPC server
    this.rpcServer = new RPCServer('plugin://your-plugin/rpc');

    // Initialize command handler
    this.commandHandler = new PluginCommandHandler(this.messageBus);

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker('your-plugin', {
      threshold: 5,
      timeout: 60000,
      halfOpenRetries: 3,
      monitoringWindow: 300000,
    });
  }

  async start(): Promise<void> {
    console.log('[YourPlugin] Starting...');

    // Setup message bus subscriptions
    this.setupMessageBusSubscriptions();

    // Setup RPC methods
    this.setupRPCMethods();

    // Announce plugin ready
    await this.announceReady();

    console.log('[YourPlugin] Ready!');
  }

  private setupMessageBusSubscriptions(): void {
    // Subscribe to requests
    this.messageBus.subscribe(
      'plugin/your-plugin/request',
      async (message) => {
        await this.circuitBreaker.execute(
          async () => {
            await this.commandHandler.handleRequest(message);
          },
          async () => {
            // Fallback: respond with error
            await this.messageBus.respond(message.correlationId!, {
              error: 'Plugin circuit breaker open',
              fallbackUsed: true,
            });
          }
        );
      }
    );

    // Subscribe to system broadcasts
    this.messageBus.subscribe('system/broadcast', async (message) => {
      console.log('[YourPlugin] Received broadcast:', message.payload);
    });

    // Subscribe to routing decisions
    this.messageBus.subscribe('routing/decision', async (message) => {
      const decision = message.payload;
      if (decision.primaryPlugin === 'your-plugin') {
        console.log('[YourPlugin] Selected as primary for:', decision.requestId);
      }
    });
  }

  private setupRPCMethods(): void {
    // Execute command
    this.rpcServer.register('execute_command', async (params) => {
      return await this.commandHandler.executeCommand(
        params.command,
        params.parameters
      );
    });

    // Query agents
    this.rpcServer.register('query_agents', async (params) => {
      return await this.commandHandler.queryAgents(params.criteria);
    });

    // Get status
    this.rpcServer.register('get_status', async () => {
      return {
        status: 'running',
        circuitBreakerState: this.circuitBreaker.getState(),
        activeRequests: this.commandHandler.getActiveRequestCount(),
      };
    });
  }

  private async announceReady(): Promise<void> {
    await this.messageBus.publish({
      topic: 'plugin/your-plugin/status',
      messageType: 'event' as any,
      payload: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async stop(): Promise<void> {
    console.log('[YourPlugin] Stopping...');

    // Clear message bus
    this.messageBus.clear();

    console.log('[YourPlugin] Stopped');
  }
}

// Start the plugin
if (require.main === module) {
  const plugin = new YourPluginBootstrap();
  plugin.start().catch((error) => {
    console.error('[YourPlugin] Failed to start:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await plugin.stop();
    process.exit(0);
  });
}
```

---

## Plugin Setup

### Directory Structure

```
your-plugin/
├── .claude-plugin/
│   ├── plugin.json
│   ├── routing-config.json
│   └── state.db
│
├── lib/
│   ├── plugin-bootstrap.ts       # Entry point
│   ├── command-handler.ts        # Command execution
│   ├── agent-registry.ts         # Agent management
│   ├── state-manager.ts          # State persistence
│   └── circuit-breaker-wrapper.ts
│
├── agents/
│   ├── agent-1.md
│   └── agent-2.md
│
└── package.json
```

---

## Message Bus Integration

### Subscribing to Topics

```typescript
import { getMessageBus, Message, MessageType } from '@jira-orchestrator/messagebus';

const messageBus = getMessageBus('your-plugin');

// Subscribe to plugin requests
messageBus.subscribe('plugin/your-plugin/request', async (message: Message) => {
  console.log('Received request:', message.payload);

  try {
    // Process request
    const result = await processRequest(message.payload);

    // Send response
    await messageBus.respond(message.correlationId!, {
      status: 'success',
      result,
    });
  } catch (error) {
    // Send error response
    await messageBus.respond(message.correlationId!, {
      status: 'error',
      error: error.message,
    });
  }
});

// Subscribe to all orchestration events
messageBus.subscribe('orchestration/*', async (message: Message) => {
  console.log('Orchestration event:', message.topic, message.payload);
});

// Subscribe with filter
messageBus.subscribe(
  'system/*',
  async (message: Message) => {
    console.log('High priority system message:', message.payload);
  },
  {
    filter: (msg) => msg.priority >= 8,
  }
);
```

### Publishing Messages

```typescript
// Publish event
await messageBus.publish({
  topic: 'plugin/your-plugin/events',
  messageType: MessageType.EVENT,
  payload: {
    eventType: 'task_completed',
    taskId: 'task_123',
    result: {...},
  },
});

// Publish with headers (for tracing)
await messageBus.publish({
  topic: 'orchestration/task-complete',
  messageType: MessageType.EVENT,
  headers: {
    traceId: 'trace_abc',
    spanId: 'span_123',
    userId: 'user_456',
  },
  payload: {
    taskId: 'task_123',
    duration: 5000,
    tokensUsed: 1500,
  },
});
```

### Request/Response Pattern

```typescript
// Send request to another plugin
const response = await messageBus.request({
  destination: 'lobbi-platform-manager',
  topic: 'plugin/lobbi-platform-manager/request',
  payload: {
    command: 'create_tenant',
    parameters: {
      tenantId: 'acme-corp',
    },
  },
  timeout: 30000,
});

console.log('Tenant created:', response.result);
```

---

## RPC Server Setup

### Registering RPC Methods

```typescript
import { RPCServer } from '@jira-orchestrator/messagebus';

const rpcServer = new RPCServer('plugin://your-plugin/rpc');

// Simple method
rpcServer.register('ping', async () => {
  return { message: 'pong', timestamp: Date.now() };
});

// Method with parameters
rpcServer.register('create_endpoint', async (params) => {
  const { path, method, authentication } = params;

  // Create endpoint
  const endpoint = await createEndpoint(path, method, authentication);

  return {
    endpointId: endpoint.id,
    url: endpoint.url,
    schemaId: endpoint.schemaId,
  };
});

// Method with validation
rpcServer.register('deploy_service', async (params) => {
  // Validate params
  if (!params.serviceName) {
    throw new Error('serviceName is required');
  }

  if (!params.environment) {
    throw new Error('environment is required');
  }

  // Deploy service
  const deployment = await deployService(
    params.serviceName,
    params.environment
  );

  return {
    deploymentId: deployment.id,
    status: deployment.status,
    url: deployment.url,
  };
});

// Async method with progress updates
rpcServer.register('analyze_codebase', async (params) => {
  const { directory, depth } = params;

  // Start analysis
  const analysisId = uuidv4();

  // Run in background
  analyzeCodebaseAsync(directory, depth, (progress) => {
    // Publish progress events
    messageBus.publish({
      topic: 'plugin/your-plugin/events',
      messageType: MessageType.EVENT,
      payload: {
        eventType: 'analysis_progress',
        analysisId,
        progress,
      },
    });
  });

  return {
    analysisId,
    status: 'started',
  };
});
```

### Calling RPC Methods

```typescript
import { RPCClient } from '@jira-orchestrator/messagebus';

// Create RPC client
const client = new RPCClient('plugin://your-plugin/rpc');

// Call method
const result = await client.call('create_endpoint', {
  path: '/api/users',
  method: 'POST',
  authentication: 'jwt',
});

console.log('Endpoint created:', result.endpointId);
```

---

## State Management

### Local State

```typescript
import { DistributedStateManager } from '@jira-orchestrator/state-manager';

const stateManager = new DistributedStateManager('your-plugin');

// Set register (last-write-wins)
stateManager.setRegister('current_config', {
  apiUrl: 'https://api.example.com',
  timeout: 30000,
});

// Get register
const config = stateManager.getRegister('current_config');

// Increment counter
stateManager.incrementCounter('requests_processed');
stateManager.incrementCounter('requests_processed', 5); // Increment by 5

// Get counter value
const totalRequests = stateManager.getCounter('requests_processed');

// Add to set
stateManager.addToSet('active_tasks', 'task_123');
stateManager.addToSet('active_tasks', 'task_456');

// Remove from set
stateManager.removeFromSet('active_tasks', 'task_123');

// Get set values
const activeTasks = stateManager.getSet('active_tasks');
```

### Shared State (Cross-Plugin)

```typescript
// Export state for other plugins
await stateManager.exportState('endpoint_definitions', {
  endpoints: [
    { path: '/api/users', method: 'GET' },
    { path: '/api/users', method: 'POST' },
  ],
  lastUpdated: new Date().toISOString(),
});

// Import state from another plugin
const jiraIssues = await stateManager.importState(
  'jira-orchestrator',
  'jira_issues'
);

// Use imported state
for (const issue of jiraIssues.issues) {
  console.log('Issue:', issue.key, issue.summary);
}
```

---

## Circuit Breaker

### Basic Usage

```typescript
import { CircuitBreaker } from '@jira-orchestrator/circuit-breaker';

const circuitBreaker = new CircuitBreaker('your-plugin', {
  threshold: 5,           // Open after 5 failures
  timeout: 60000,         // Try half-open after 60 seconds
  halfOpenRetries: 3,     // Close after 3 successful retries
  monitoringWindow: 300000, // 5 minute window
});

// Execute with circuit breaker
const result = await circuitBreaker.execute(
  // Primary operation
  async () => {
    return await callExternalService();
  },
  // Fallback (optional)
  async () => {
    return getCachedResult();
  }
);
```

### Monitoring Circuit State

```typescript
// Subscribe to circuit breaker events
messageBus.subscribe('plugin/your-plugin/circuit-breaker', (message) => {
  const { state, timestamp } = message.payload;

  if (state === 'open') {
    console.warn('[CircuitBreaker] OPEN - Using fallback');
    // Alert operations team
    sendAlert('Circuit breaker opened for your-plugin');
  } else if (state === 'closed') {
    console.log('[CircuitBreaker] CLOSED - Service recovered');
  }
});

// Check circuit state
if (circuitBreaker.getState() === 'open') {
  console.log('Circuit is open, using fallback strategy');
}
```

---

## Complete Example

### Full Plugin Implementation

```typescript
// lib/fastapi-backend-plugin.ts

import {
  getMessageBus,
  RPCServer,
  Message,
  MessageType,
} from '@jira-orchestrator/messagebus';
import { CircuitBreaker } from '@jira-orchestrator/circuit-breaker';
import { DistributedStateManager } from '@jira-orchestrator/state-manager';

export class FastAPIBackendPlugin {
  private pluginId = 'fastapi-backend';
  private messageBus: ReturnType<typeof getMessageBus>;
  private rpcServer: RPCServer;
  private circuitBreaker: CircuitBreaker;
  private stateManager: DistributedStateManager;

  constructor() {
    this.messageBus = getMessageBus(this.pluginId);
    this.rpcServer = new RPCServer(`plugin://${this.pluginId}/rpc`);
    this.circuitBreaker = new CircuitBreaker(this.pluginId, {
      threshold: 5,
      timeout: 60000,
      halfOpenRetries: 3,
      monitoringWindow: 300000,
    });
    this.stateManager = new DistributedStateManager(this.pluginId);
  }

  async start(): Promise<void> {
    console.log('[FastAPIBackend] Starting plugin...');

    this.setupMessageBusSubscriptions();
    this.setupRPCMethods();
    await this.announceReady();

    console.log('[FastAPIBackend] Plugin ready!');
  }

  private setupMessageBusSubscriptions(): void {
    // Handle incoming requests
    this.messageBus.subscribe(
      `plugin/${this.pluginId}/request`,
      async (message: Message) => {
        await this.circuitBreaker.execute(
          async () => {
            await this.handleRequest(message);
          },
          async () => {
            // Fallback: respond with cached result or error
            await this.messageBus.respond(message.correlationId!, {
              error: 'Service temporarily unavailable',
              fallback: true,
            });
          }
        );
      }
    );

    // Listen for routing decisions
    this.messageBus.subscribe('routing/decision', async (message: Message) => {
      const decision = message.payload;

      if (decision.primaryPlugin === this.pluginId) {
        console.log(
          `[FastAPIBackend] Selected as primary for request: ${decision.requestId}`
        );

        // Update state
        this.stateManager.incrementCounter('requests_routed');
      }
    });

    // System broadcasts
    this.messageBus.subscribe('system/broadcast', async (message: Message) => {
      console.log('[FastAPIBackend] System broadcast:', message.payload);
    });
  }

  private setupRPCMethods(): void {
    // Create endpoint
    this.rpcServer.register('create_endpoint', async (params) => {
      const { path, method, database } = params;

      console.log(`[FastAPIBackend] Creating endpoint: ${method} ${path}`);

      // Create FastAPI endpoint code
      const code = this.generateEndpointCode(path, method, database);

      // Save to file
      const filePath = await this.saveEndpoint(path, code);

      // Update state
      this.stateManager.addToSet('endpoints', { path, method });

      // Publish event
      await this.messageBus.publish({
        topic: `plugin/${this.pluginId}/events`,
        messageType: MessageType.EVENT,
        payload: {
          eventType: 'endpoint_created',
          endpoint: { path, method, filePath },
        },
      });

      return {
        filePath,
        code,
        schemaId: `schema_${Date.now()}`,
      };
    });

    // Get status
    this.rpcServer.register('get_status', async () => {
      return {
        status: 'running',
        circuitBreakerState: this.circuitBreaker.getState(),
        endpointCount: this.stateManager.getSet('endpoints').length,
        requestsProcessed: this.stateManager.getCounter('requests_processed'),
      };
    });

    // Health check
    this.rpcServer.register('health_check', async () => {
      return {
        status: 'healthy',
        latency: 25,
        errorRate: 0.01,
        timestamp: new Date().toISOString(),
      };
    });
  }

  private async handleRequest(message: Message): Promise<void> {
    const { command, parameters } = message.payload;

    console.log(`[FastAPIBackend] Executing command: ${command}`);

    try {
      let result: any;

      switch (command) {
        case 'create_endpoint':
          result = await this.createEndpoint(parameters);
          break;

        case 'create_model':
          result = await this.createModel(parameters);
          break;

        case 'setup_authentication':
          result = await this.setupAuthentication(parameters);
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }

      // Update metrics
      this.stateManager.incrementCounter('requests_processed');

      // Respond with success
      await this.messageBus.respond(message.correlationId!, {
        status: 'success',
        result,
      });

      // Publish completion event
      await this.messageBus.publish({
        topic: 'orchestration/task-complete',
        messageType: MessageType.EVENT,
        payload: {
          taskId: message.messageId,
          command,
          duration: 5000,
          tokensUsed: 1200,
        },
      });
    } catch (error: any) {
      console.error(`[FastAPIBackend] Error executing ${command}:`, error);

      // Respond with error
      await this.messageBus.respond(message.correlationId!, {
        status: 'error',
        error: error.message,
      });
    }
  }

  private async createEndpoint(params: any): Promise<any> {
    // Implementation
    const code = this.generateEndpointCode(
      params.path,
      params.method,
      params.database
    );

    const filePath = await this.saveEndpoint(params.path, code);

    return { filePath, code };
  }

  private async createModel(params: any): Promise<any> {
    // Implementation
    return { modelName: params.name, schemaId: 'schema_123' };
  }

  private async setupAuthentication(params: any): Promise<any> {
    // Implementation
    return { authConfigured: true, method: 'jwt' };
  }

  private generateEndpointCode(
    path: string,
    method: string,
    database: string
  ): string {
    // Generate FastAPI code
    return `
from fastapi import APIRouter, Depends
from app.models import UserModel
from app.auth import get_current_user

router = APIRouter()

@router.${method.toLowerCase()}("${path}")
async def ${this.pathToFunctionName(path)}(
    current_user: UserModel = Depends(get_current_user)
):
    # TODO: Implement endpoint logic
    return {"message": "Endpoint created"}
    `.trim();
  }

  private pathToFunctionName(path: string): string {
    return path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
  }

  private async saveEndpoint(path: string, code: string): Promise<string> {
    // Save to file system
    const filePath = `/app/routes${path.replace(/\//g, '_')}.py`;
    // TODO: Actually write file
    return filePath;
  }

  private async announceReady(): Promise<void> {
    await this.messageBus.publish({
      topic: `plugin/${this.pluginId}/status`,
      messageType: MessageType.EVENT,
      payload: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async stop(): Promise<void> {
    console.log('[FastAPIBackend] Stopping plugin...');
    this.messageBus.clear();
    console.log('[FastAPIBackend] Stopped');
  }
}

// Bootstrap
if (require.main === module) {
  const plugin = new FastAPIBackendPlugin();

  plugin.start().catch((error) => {
    console.error('[FastAPIBackend] Failed to start:', error);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await plugin.stop();
    process.exit(0);
  });
}
```

---

## Testing Your Plugin

### Unit Tests

```typescript
// test/plugin.test.ts

import { FastAPIBackendPlugin } from '../lib/fastapi-backend-plugin';
import { getMessageBus, resetMessageBus } from '@jira-orchestrator/messagebus';

describe('FastAPIBackendPlugin', () => {
  let plugin: FastAPIBackendPlugin;

  beforeEach(() => {
    resetMessageBus();
    plugin = new FastAPIBackendPlugin();
  });

  afterEach(async () => {
    await plugin.stop();
  });

  it('should start and announce ready', async () => {
    const messageBus = getMessageBus('test-subscriber');

    let readyReceived = false;
    messageBus.subscribe('plugin/fastapi-backend/status', (message) => {
      if (message.payload.status === 'ready') {
        readyReceived = true;
      }
    });

    await plugin.start();

    expect(readyReceived).toBe(true);
  });

  it('should handle RPC calls', async () => {
    await plugin.start();

    const client = new RPCClient('plugin://fastapi-backend/rpc');
    const result = await client.call('create_endpoint', {
      path: '/api/users',
      method: 'POST',
      database: 'mongodb',
    });

    expect(result.filePath).toBeDefined();
    expect(result.code).toContain('fastapi');
  });
});
```

---

**Version:** 1.0.0
**Last Updated:** 2025-12-26
**Author:** architect-supreme
