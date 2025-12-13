# Agent Playground

Interactive WebSocket-based debugging environment for testing and debugging Claude agents.

## Features

- **WebSocket Server**: Real-time bidirectional communication for debugging
- **Session Management**: Isolated execution contexts with state tracking
- **Advanced Debugging**: Breakpoints, step-through execution, variable inspection
- **Tool Call Interception**: Mock responses and execution monitoring
- **Recording & Replay**: Record sessions for analysis and replay
- **Timeline & Memory Snapshots**: Track execution history and memory usage
- **Multi-Client Support**: Handle concurrent debugging sessions

## Installation

```bash
npm install @claude/agent-playground
```

## Quick Start

### CLI Usage

Start the playground server:

```bash
playground start --port 8765
```

Check server status:

```bash
playground status
```

Stop the server:

```bash
playground stop
```

### Programmatic Usage

```typescript
import { createPlayground } from '@claude/agent-playground';

const playground = createPlayground({
  server: {
    port: 8765,
    host: '0.0.0.0'
  }
});

// Start the server
await playground.start();

// Register an agent
playground.executor.registerAgent({
  id: 'my-agent',
  name: 'My Test Agent',
  execute: async (input, context) => {
    // Agent implementation
    const result = await context.callTool('someTool', { param: input });
    return result;
  }
});

// Register tools
playground.executor.registerTool({
  name: 'someTool',
  execute: async (params, context) => {
    return { success: true, data: params };
  }
});
```

## Architecture

### Components

1. **Server** (`server.ts`)
   - HTTP server with WebSocket upgrade
   - Session and client management
   - Message routing and queuing
   - Heartbeat/keepalive

2. **Session Manager** (`session-manager.ts`)
   - Create isolated execution contexts
   - Track session state and history
   - Breakpoint management
   - Variable inspection

3. **Debugger** (`debugger.ts`)
   - Breakpoint management (line, conditional, tool, phase)
   - Call stack inspection
   - Variable watch list
   - Execution timeline
   - Memory snapshots

4. **Executor** (`executor.ts`)
   - Safe agent loading and execution
   - Tool call interception
   - Mock tool responses
   - Timeout handling
   - Sandbox support (optional)

5. **Recorder** (`recorder.ts`)
   - Record all tool calls and responses
   - Export/import recordings
   - Annotation support
   - SQLite storage

6. **Protocol** (`protocol.ts`)
   - Type-safe WebSocket message protocol
   - Zod schema validation
   - Message builders

## WebSocket Protocol

### Client → Server Messages

#### Execute Agent
```typescript
{
  type: 'execute',
  payload: {
    agentId: string,
    input: any,
    breakpoints?: Breakpoint[],
    mockResponses?: Record<string, any>
  }
}
```

#### Step Execution
```typescript
{
  type: 'step',
  payload: { sessionId: string }
}
```

#### Continue Execution
```typescript
{
  type: 'continue',
  payload: { sessionId: string }
}
```

#### Inspect Variable
```typescript
{
  type: 'inspect',
  payload: {
    sessionId: string,
    variablePath: string
  }
}
```

#### Mock Tool Response
```typescript
{
  type: 'mock_response',
  payload: {
    sessionId: string,
    toolName: string,
    response: any
  }
}
```

### Server → Client Messages

#### Session Created
```typescript
{
  type: 'session_created',
  payload: {
    sessionId: string,
    agentId: string
  }
}
```

#### Breakpoint Hit
```typescript
{
  type: 'breakpoint_hit',
  payload: {
    sessionId: string,
    breakpoint: Breakpoint,
    location: string,
    stack: StackFrame[]
  }
}
```

#### Tool Call
```typescript
{
  type: 'tool_call',
  payload: {
    sessionId: string,
    toolCall: {
      id: string,
      tool: string,
      params: any,
      timestamp: string
    }
  }
}
```

#### Execution Complete
```typescript
{
  type: 'execution_complete',
  payload: {
    sessionId: string,
    result: any,
    duration: number
  }
}
```

## Session States

- `idle` - Waiting for execution
- `running` - Agent executing
- `paused` - Hit breakpoint
- `stepping` - Single-step mode
- `completed` - Execution finished
- `error` - Error occurred

## Breakpoint Types

### Line Breakpoint
Break at specific file and line number:

```typescript
debugger.createBreakpoint('line', {
  location: '/path/to/file.ts',
  line: 42
});
```

### Conditional Breakpoint
Break when condition is true:

```typescript
debugger.createBreakpoint('conditional', {
  condition: 'x > 10 && y < 5'
});
```

### Tool Breakpoint
Break on specific tool call:

```typescript
debugger.createBreakpoint('tool', {
  toolName: 'searchDatabase'
});
```

### Phase Breakpoint
Break on agent phase transition:

```typescript
debugger.createBreakpoint('phase', {
  phase: 'plan'
});
```

## Examples

### Example 1: Basic Agent Execution

```typescript
import { createPlayground } from '@claude/agent-playground';

const playground = await createPlayground();
await playground.start();

// Register agent
playground.executor.registerAgent({
  id: 'calculator',
  name: 'Calculator Agent',
  execute: async (input, context) => {
    const { operation, a, b } = input;

    if (operation === 'add') {
      return a + b;
    } else if (operation === 'multiply') {
      return a * b;
    }

    throw new Error('Unknown operation');
  }
});

// Client code (in browser or Node.js WebSocket client)
const ws = new WebSocket('ws://localhost:8765/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'execute',
    payload: {
      agentId: 'calculator',
      input: { operation: 'add', a: 5, b: 3 }
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Example 2: Debugging with Breakpoints

```typescript
const ws = new WebSocket('ws://localhost:8765/ws');

ws.onopen = () => {
  // Execute with breakpoints
  ws.send(JSON.stringify({
    type: 'execute',
    payload: {
      agentId: 'my-agent',
      input: { query: 'test' },
      breakpoints: [
        {
          id: 'bp1',
          type: 'tool',
          enabled: true,
          toolName: 'database'
        }
      ]
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'breakpoint_hit') {
    console.log('Breakpoint hit:', message.payload);

    // Inspect variable
    ws.send(JSON.stringify({
      type: 'inspect',
      payload: {
        sessionId: message.payload.sessionId,
        variablePath: 'query'
      }
    }));

    // Continue execution
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'continue',
        payload: { sessionId: message.payload.sessionId }
      }));
    }, 1000);
  }
};
```

### Example 3: Recording and Replay

```typescript
import { createRecorder } from '@claude/agent-playground';

const recorder = createRecorder({
  dbPath: './recordings.db'
});

// Get all recordings
const recordings = recorder.getAllRecordings();

// Export recording to JSON
const exported = recorder.exportRecording(recordings[0].id);
fs.writeFileSync('recording.json', JSON.stringify(exported, null, 2));

// Import recording
const imported = JSON.parse(fs.readFileSync('recording.json', 'utf-8'));
const newId = recorder.importRecording(imported);

// Add annotation
recorder.addAnnotation(newId, 'This is a critical execution path', 'warning');
```

### Example 4: Memory Snapshots

```typescript
const debugger = createDebugger({
  enableMemorySnapshots: true,
  snapshotInterval: 1000
});

// Create snapshot
const snapshot = debugger.createSnapshot(
  sessionId,
  variables,
  stack
);

// Compare snapshots
const comparison = debugger.compareSnapshots(snapshot1.id, snapshot2.id);
console.log('Variables added:', comparison.variablesAdded);
console.log('Variables changed:', comparison.variablesChanged);
console.log('Heap delta:', comparison.heapDelta);
```

## API Reference

### PlaygroundServer

#### Constructor
```typescript
new PlaygroundServer(config?: ServerConfig)
```

#### Methods
- `start(): Promise<void>` - Start the server
- `stop(): Promise<void>` - Stop the server
- `getStatus()` - Get server status
- `getExecutor(): Executor` - Get executor instance
- `getSessionManager(): SessionManager` - Get session manager
- `getDebugger(): Debugger` - Get debugger instance
- `getRecorder(): Recorder` - Get recorder instance

### SessionManager

#### Methods
- `createSession(config): Session` - Create new session
- `getSession(id): Session` - Get session by ID
- `updateState(id, state): boolean` - Update session state
- `addBreakpoint(id, breakpoint): boolean` - Add breakpoint
- `shouldBreak(id, context): Breakpoint | null` - Check breakpoint
- `recordToolCall(id, toolCall): boolean` - Record tool call
- `getVariable(id, path): any` - Get variable value
- `setVariable(id, path, value): boolean` - Set variable value

### Debugger

#### Methods
- `createBreakpoint(type, options): Breakpoint` - Create breakpoint
- `addWatch(path, condition?): VariableWatch` - Add variable watch
- `addTimelineEvent(event): TimelineEvent` - Add timeline event
- `createSnapshot(sessionId, variables, stack): MemorySnapshot` - Create snapshot
- `compareSnapshots(id1, id2)` - Compare two snapshots

### Executor

#### Methods
- `registerAgent(agent): void` - Register agent
- `registerTool(tool): void` - Register tool
- `executeAgent(sessionId, agentId, input, options): Promise<ExecutionResult>` - Execute agent
- `stopExecution(sessionId): boolean` - Stop execution

### Recorder

#### Methods
- `startRecording(sessionId, agentId, input): string` - Start recording
- `recordEvent(sessionId, type, data): void` - Record event
- `finishRecording(sessionId, duration, success, result?, error?): boolean` - Finish recording
- `getRecording(id): RecordingMetadata` - Get recording
- `exportRecording(id)` - Export recording to JSON
- `importRecording(data): string` - Import recording from JSON
- `addAnnotation(recordingId, text, type, author?, eventId?): Annotation` - Add annotation

## Configuration

### Server Config

```typescript
interface ServerConfig {
  port?: number;              // Default: 8765
  host?: string;              // Default: '0.0.0.0'
  maxConnections?: number;    // Default: 100
  heartbeatInterval?: number; // Default: 30000
  messageQueueSize?: number;  // Default: 1000
  enableCors?: boolean;       // Default: true
}
```

### Session Config

```typescript
interface SessionConfig {
  maxSessions?: number;      // Default: 100
  defaultTimeout?: number;   // Default: 300000 (5 min)
}
```

### Debugger Config

```typescript
interface DebuggerConfig {
  enableTimeline?: boolean;        // Default: true
  enableMemorySnapshots?: boolean; // Default: true
  snapshotInterval?: number;       // Default: 1000
  maxTimelineEvents?: number;      // Default: 1000
  maxSnapshots?: number;           // Default: 100
}
```

### Recorder Config

```typescript
interface RecorderConfig {
  dbPath?: string;          // Default: '.playground/recordings.db'
  maxRecordings?: number;   // Default: 1000
  autoCleanup?: boolean;    // Default: true
}
```

## CLI Commands

```bash
# Start server
playground start [options]
  --port <port>              Server port (default: 8765)
  --host <host>              Server host (default: 0.0.0.0)
  --max-connections <n>      Max concurrent connections (default: 100)
  --heartbeat-interval <ms>  Heartbeat interval (default: 30000)
  --no-cors                  Disable CORS
  -d, --daemon               Run as daemon

# Stop server
playground stop

# Check status
playground status [options]
  --port <port>              Server port (default: 8765)
  --host <host>              Server host (default: localhost)

# Show logs
playground logs [options]
  -f, --follow               Follow log output
  -n, --lines <n>            Number of lines (default: 50)

# Show version
playground version
```

## HTTP Endpoints

- `GET /health` - Health check
- `GET /status` - Server status and statistics

## Development

### Build

```bash
npm run build
```

### Run in development mode

```bash
npm run dev
```

### Run tests

```bash
npm test
```

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository for guidelines.
