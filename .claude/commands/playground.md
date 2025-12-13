---
name: playground
description: Interactive WebSocket-based debugging environment for testing and developing agents
category: development
tags: [debugging, testing, agents, websocket, development]
model: sonnet
---

# Agent Playground Commands

Interactive debugging environment for testing Claude agents with real-time execution control, breakpoints, variable inspection, and session recording/replay.

## Quick Reference

```bash
/playground start [--port 8765]           # Start server
/playground stop                          # Stop server
/playground status                        # Check status
/playground execute <file> [options]      # Execute agent
/playground step [--session-id <id>]      # Step through code
/playground inspect <session> <var>       # Inspect variable
/playground replay <recording-id>         # Replay session
```

## Core Commands

### Server Management

#### `/playground start [options]`

Start the playground WebSocket server for interactive debugging.

**Options:**
- `--port <number>` - Server port (default: 8765)
- `--host <string>` - Server host (default: 0.0.0.0)
- `--max-connections <number>` - Maximum concurrent connections (default: 100)
- `--heartbeat-interval <number>` - Heartbeat interval in ms (default: 30000)
- `--no-cors` - Disable CORS
- `--daemon` - Run as background daemon
- `--db-path <string>` - Database path for recordings (default: .playground/recordings.db)

**Examples:**
```bash
# Start playground on default port
/playground start

# Start on custom port
/playground start --port 9000

# Start with external access
/playground start --host 0.0.0.0 --port 8765

# Run as daemon with custom database
/playground start --daemon --db-path ./data/playground.db
```

**Endpoints:**
- WebSocket: `ws://localhost:8765/ws`
- Health: `http://localhost:8765/health`
- Status: `http://localhost:8765/status`

#### `/playground stop`

Stop the running playground server.

#### `/playground status [options]`

Check the status of the playground server.

**Options:**
- `--port <number>` - Server port (default: 8765)
- `--host <string>` - Server host (default: localhost)
- `--verbose` - Show detailed statistics

### Agent Execution

#### `/playground execute <agent-file> [options]`

Execute an agent in the playground environment with debugging support.

**Options:**
- `--input <json>` - Input parameters as JSON string
- `--input-file <path>` - Load input from JSON file
- `--breakpoints <json>` - Breakpoints configuration as JSON
- `--mock <json>` - Mock tool responses as JSON
- `--record` - Record the execution session
- `--timeout <number>` - Execution timeout in ms (default: 300000)
- `--session-id <string>` - Resume existing session

**Examples:**
```bash
# Run agent in playground
/playground execute ./agents/keycloak-admin.ts --input '{"realm": "test"}'

# Run with input from file
/playground execute ./agents/coder.ts --input-file ./test-data.json --record

# Run with breakpoints
/playground execute ./agents/test-generator.ts \
  --breakpoints '[{"type": "tool", "toolName": "Bash"}]'

# Run with mock responses
/playground execute ./agents/service-orchestrator.ts \
  --mock '{"database": {"rows": []}}'
```

#### `/playground step [options]`

Step to the next execution point in a paused session.

**Options:**
- `--session-id <string>` - Session ID (required)
- `--mode <string>` - Step mode: `into`, `over`, `out` (default: into)

**Examples:**
```bash
/playground step --session-id abc123
/playground step --session-id abc123 --mode over
```

#### `/playground continue <session-id>`

Continue execution from a breakpoint.

**Examples:**
```bash
/playground continue abc123
```

### Variable Inspection & Debugging

#### `/playground inspect <session-id> <variable-path>`

Inspect a variable's value in a debugging session.

**Examples:**
```bash
# Inspect top-level context
/playground inspect abc123 context

# Inspect nested property
/playground inspect abc123 user.profile.name

# Inspect array element
/playground inspect abc123 toolCalls[0].response
```

#### `/playground watch <action> [options]`

Manage variable watches for debugging sessions.

**Actions:**
- `add` - Add a variable watch
- `remove` - Remove a watch
- `list` - List all watches

**Options:**
- `--session-id <string>` - Session ID (required)
- `--path <string>` - Variable path (required for add)
- `--condition <string>` - Watch condition (optional)
- `--id <string>` - Watch ID (required for remove)

**Examples:**
```bash
/playground watch add --session-id abc123 --path "user.email"
/playground watch add --session-id abc123 --path "count" --condition "count > 100"
/playground watch list --session-id abc123
/playground watch remove --session-id abc123 --id watch-789
```

### Recording & Replay

#### `/playground replay <recording-id> [options]`

Replay a recorded execution session.

**Options:**
- `--speed <number>` - Playback speed multiplier (default: 1.0)
- `--from-step <number>` - Start from specific step
- `--to-step <number>` - End at specific step
- `--pause-at <number>` - Pause at specific step
- `--output <path>` - Export replay data to file

**Examples:**
```bash
# Replay at normal speed
/playground replay rec-12345

# Replay at 2x speed
/playground replay rec-12345 --speed 2.0

# Replay specific range
/playground replay rec-12345 --from-step 10 --to-step 50

# Replay and pause at step 25
/playground replay rec-12345 --pause-at 25

# Export replay data
/playground replay rec-12345 --output ./replay-data.json
```

#### `/playground recordings <action> [options]`

Manage session recordings.

**Actions:**
- `list` - List all recordings
- `show` - Show recording details
- `export` - Export recording to JSON
- `import` - Import recording from JSON
- `delete` - Delete a recording
- `annotate` - Add annotation to recording

**Options:**
- `--id <string>` - Recording ID (required for show/export/delete/annotate)
- `--file <path>` - File path (for export/import)
- `--text <string>` - Annotation text (for annotate)
- `--type <string>` - Annotation type: info, warning, error, highlight (for annotate)
- `--filter <string>` - Filter by agent/status (for list)
- `--limit <number>` - Limit results (default: 50)

**Examples:**
```bash
/playground recordings list
/playground recordings list --filter "agent:coder" --limit 10
/playground recordings show --id rec-12345
/playground recordings export --id rec-12345 --file ./recording.json
/playground recordings import --file ./recording.json
/playground recordings delete --id rec-12345
/playground recordings annotate --id rec-12345 --text "Critical path" --type highlight
```

### Mock Tool Responses

#### `/playground mock <action> [options]`

Manage mock tool responses for testing.

**Actions:**
- `add` - Add a mock response
- `remove` - Remove a mock
- `list` - List all mocks
- `enable` - Enable a mock
- `disable` - Disable a mock

**Options for `add`:**
- `--session-id <string>` - Session ID (required)
- `--tool <string>` - Tool name (required)
- `--response <json>` - Mock response as JSON (required)
- `--delay <number>` - Simulated latency in ms (default: 0)
- `--error-rate <number>` - Error probability 0-1 (default: 0)
- `--error <json>` - Error response as JSON
- `--pattern <json>` - Request pattern to match

**Examples:**
```bash
# Add simple mock
/playground mock add --session-id abc123 --tool database --response '{"rows": []}'

# Add mock with latency
/playground mock add --session-id abc123 --tool api --response '{"ok": true}' --delay 1000

# Add unreliable mock
/playground mock add --session-id abc123 \
  --tool unreliable \
  --response '{"data": 1}' \
  --error-rate 0.3 \
  --error '{"error": "Service unavailable"}'

# List all mocks
/playground mock list --session-id abc123

# Remove mock
/playground mock remove --session-id abc123 --id mock-xyz
```

## WebSocket Protocol

### Client → Server Messages

```typescript
// Execute agent
{
  type: 'execute',
  payload: {
    agentId: 'keycloak-admin',
    input: 'Create user john@example.com',
    breakpoints: ['tools/keycloak.ts:25']
  }
}

// Step execution
{
  type: 'step',
  payload: { sessionId: 'abc123' }
}

// Continue execution
{
  type: 'continue',
  payload: { sessionId: 'abc123' }
}

// Inspect variable
{
  type: 'inspect',
  payload: {
    sessionId: 'abc123',
    path: 'context.memory.episodes'
  }
}

// Provide mock response
{
  type: 'mock_response',
  payload: {
    sessionId: 'abc123',
    toolName: 'Bash',
    response: { stdout: 'mocked output', exitCode: 0 }
  }
}
```

### Server → Client Messages

```typescript
// Execution started
{
  type: 'execution_started',
  payload: {
    sessionId: 'abc123',
    agentId: 'keycloak-admin',
    timestamp: '2024-12-12T10:00:00Z'
  }
}

// Breakpoint hit
{
  type: 'breakpoint_hit',
  payload: {
    sessionId: 'abc123',
    location: 'tools/keycloak.ts:25',
    stack: [...],
    variables: {...}
  }
}

// Tool call intercepted
{
  type: 'tool_call',
  payload: {
    sessionId: 'abc123',
    tool: 'Bash',
    params: { command: 'curl http://localhost:8080' },
    awaitingMock: true
  }
}

// Execution complete
{
  type: 'execution_complete',
  payload: {
    sessionId: 'abc123',
    result: {...},
    duration: 5432,
    toolCalls: 12
  }
}

// Error occurred
{
  type: 'error',
  payload: {
    sessionId: 'abc123',
    error: 'Tool timeout after 30s',
    stack: '...'
  }
}
```

## Session States

| State | Description | Transitions |
|-------|-------------|-------------|
| `idle` | Waiting for execution | → `running` |
| `running` | Agent actively executing | → `paused`, `completed`, `error` |
| `paused` | Hit breakpoint or step | → `running`, `stepping` |
| `stepping` | Single-step mode | → `paused`, `completed` |
| `completed` | Execution finished | → `idle` |
| `error` | Error occurred | → `idle` |

### Session Management

#### `/playground sessions <action> [options]`

Manage debugging sessions.

**Actions:**
- `list` - List all sessions
- `show` - Show session details
- `kill` - Terminate a session
- `cleanup` - Clean up old sessions

**Options:**
- `--id <string>` - Session ID (for show/kill)
- `--status <string>` - Filter by status (for list)
- `--age <number>` - Delete sessions older than N days (for cleanup)

**Examples:**
```bash
/playground sessions list
/playground sessions list --status running
/playground sessions show --id abc123
/playground sessions kill --id abc123
/playground sessions cleanup --age 7
```

### Memory Snapshots

#### `/playground snapshot <action> [options]`

Manage memory snapshots.

**Actions:**
- `create` - Create a memory snapshot
- `show` - Show snapshot details
- `compare` - Compare two snapshots
- `list` - List all snapshots

**Options:**
- `--session-id <string>` - Session ID (required for create)
- `--id <string>` - Snapshot ID (for show)
- `--id1 <string>` - First snapshot ID (for compare)
- `--id2 <string>` - Second snapshot ID (for compare)

**Examples:**
```bash
/playground snapshot create --session-id abc123
/playground snapshot show --id snap-456
/playground snapshot compare --id1 snap-456 --id2 snap-789
/playground snapshot list --session-id abc123
```

### Statistics & Logs

#### `/playground stats [options]`

Show playground statistics and analytics.

**Options:**
- `--session-id <string>` - Show stats for specific session
- `--agent-id <string>` - Show stats for specific agent
- `--period <string>` - Time period: day, week, month, all (default: all)
- `--format <string>` - Output format: table, json, csv (default: table)

**Examples:**
```bash
/playground stats
/playground stats --session-id abc123
/playground stats --agent-id coder --period week
/playground stats --format json
```

#### `/playground logs [options]`

Show playground server logs.

**Options:**
- `--follow` - Follow log output (tail -f mode)
- `--lines <number>` - Number of lines to show (default: 50)
- `--level <string>` - Filter by log level: debug, info, warn, error
- `--session-id <string>` - Filter by session ID

**Examples:**
```bash
/playground logs
/playground logs --follow
/playground logs --lines 100 --level error
/playground logs --session-id abc123
```

## Debugging Features

### Breakpoints

#### `/playground breakpoint <action> [options]`

Manage breakpoints for debugging sessions.

**Actions:**
- `add` - Add a new breakpoint
- `remove` - Remove a breakpoint
- `list` - List all breakpoints
- `enable` - Enable a breakpoint
- `disable` - Disable a breakpoint

**Options for `add`:**
- `--session-id <string>` - Session ID (required)
- `--type <string>` - Breakpoint type: `line`, `conditional`, `tool`, `phase` (required)
- `--location <string>` - File path (for line breakpoints)
- `--line <number>` - Line number (for line breakpoints)
- `--condition <string>` - Expression (for conditional breakpoints)
- `--tool <string>` - Tool name (for tool breakpoints)
- `--phase <string>` - Phase name (for phase breakpoints)

**Examples:**
```bash
# Line breakpoint
/playground breakpoint add --session-id abc123 --type line \
  --location ./agent.ts --line 42

# Conditional breakpoint
/playground breakpoint add --session-id abc123 --type conditional \
  --condition "user.role === 'admin'"

# Tool call breakpoint
/playground breakpoint add --session-id abc123 --type tool --tool Bash

# Phase breakpoint
/playground breakpoint add --session-id abc123 --type phase --phase plan

# List breakpoints
/playground breakpoint list --session-id abc123

# Remove breakpoint
/playground breakpoint remove --session-id abc123 --id bp-456

# Disable breakpoint
/playground breakpoint disable --session-id abc123 --id bp-456
```

### Variable Inspection

```bash
# Inspect session context
/playground inspect context

# Inspect specific path
/playground inspect context.memory.episodes[0]

# Watch variable (auto-update on change)
/playground watch context.tools.lastResult

# Unwatch
/playground unwatch context.tools.lastResult
```

### Call Stack

```
Call Stack (3 frames)
══════════════════════════════════════════════════════════════
#0  handleToolCall (executor.ts:142)
    tool: "Bash"
    params: { command: "curl ..." }

#1  executeStep (session-manager.ts:89)
    step: 3
    state: "running"

#2  runAgent (server.ts:56)
    agentId: "keycloak-admin"
    sessionId: "abc123"
══════════════════════════════════════════════════════════════
```

## Recording Format

```json
{
  "version": "1.0",
  "sessionId": "abc123",
  "agentId": "keycloak-admin",
  "startTime": "2024-12-12T10:00:00Z",
  "endTime": "2024-12-12T10:00:05Z",
  "input": "Create user john@example.com",
  "events": [
    {
      "timestamp": "2024-12-12T10:00:01Z",
      "type": "tool_call",
      "tool": "Read",
      "params": { "file_path": "/etc/hosts" },
      "result": { "content": "..." },
      "duration": 45
    }
  ],
  "result": { "success": true },
  "annotations": []
}
```

## Performance Metrics

The playground tracks execution metrics:

```
Session Metrics
══════════════════════════════════════════════════════════════
Duration:        5.43s
Tool Calls:      12
  - Read:        4 (avg 23ms)
  - Write:       2 (avg 45ms)
  - Bash:        6 (avg 312ms)
Tokens Used:     8,432
Peak Memory:     124MB
Breakpoints Hit: 3
══════════════════════════════════════════════════════════════
```

## Common Workflows

### Workflow 1: Debugging an Agent with Breakpoints

1. Start the playground server:
   ```bash
   /playground start
   ```

2. Execute agent with breakpoints:
   ```bash
   /playground execute ./agents/my-agent.ts \
     --input '{"query": "test"}' \
     --breakpoints '[{"type": "tool", "toolName": "database"}]'
   ```

3. When breakpoint hits, inspect variables:
   ```bash
   /playground inspect <session-id> query
   /playground inspect <session-id> context.memory
   ```

4. Continue execution:
   ```bash
   /playground continue <session-id>
   ```

### Workflow 2: Recording and Replaying Sessions

1. Execute with recording enabled:
   ```bash
   /playground execute ./agents/my-agent.ts \
     --input '{"query": "test"}' \
     --record
   ```

2. List recordings:
   ```bash
   /playground recordings list
   ```

3. Replay the session:
   ```bash
   /playground replay <recording-id> --speed 2.0
   ```

4. Export for analysis:
   ```bash
   /playground recordings export --id <recording-id> --file ./recording.json
   ```

### Workflow 3: Testing with Mock Responses

1. Execute agent with mocks:
   ```bash
   /playground execute ./agents/my-agent.ts \
     --input '{"query": "test"}' \
     --mock '{"database": {"rows": [{"id": 1, "name": "Test"}]}}'
   ```

2. Or add mocks during execution:
   ```bash
   /playground mock add --session-id <session-id> \
     --tool api \
     --response '{"status": "ok"}' \
     --delay 500
   ```

3. Monitor tool calls:
   ```bash
   /playground stats --session-id <session-id>
   ```

### Workflow 4: Comparing Execution Runs

1. Create snapshots at key points:
   ```bash
   /playground snapshot create --session-id <session-id>
   ```

2. Compare two snapshots:
   ```bash
   /playground snapshot compare --id1 <snap1> --id2 <snap2>
   ```

3. Analyze differences and optimize agent performance

## Database Schema

The playground uses SQLite for persistent storage. See `.claude/orchestration/db/playground.sql` for complete schema.

**Key Tables:**
- `playground_sessions` - Debugging sessions
- `playground_execution_steps` - Individual execution steps
- `playground_breakpoints` - Breakpoint configurations
- `playground_recordings` - Recorded sessions
- `playground_recording_annotations` - User annotations
- `playground_mocks` - Mock tool responses
- `playground_tool_calls` - Tool call history
- `playground_variable_watches` - Variable watches
- `playground_memory_snapshots` - Memory snapshots
- `playground_performance_metrics` - Performance data

## Integration with Orchestration System

The playground integrates with the Claude orchestration system:

- Sessions link to `agents` table via `agent_id`
- Tool calls can be traced back to agent activities
- Performance metrics feed into agent evolution system
- Recordings can inform prompt optimization

## Security Considerations

- WebSocket connections are not authenticated by default
- Enable authentication for production use
- Limit `--host` to `localhost` for local development
- Use `--max-connections` to prevent resource exhaustion
- Sanitize user input in mock responses
- Never expose sensitive data in recordings

## Troubleshooting

### Server won't start
- Check if port is already in use: `netstat -an | findstr 8765` (Windows) or `lsof -i :8765` (Unix)
- Try different port: `/playground start --port 9000`
- Check firewall settings

### Can't connect via WebSocket
- Verify server is running: `/playground status`
- Check WebSocket URL format: `ws://` not `wss://`
- Ensure CORS is enabled if connecting from browser

### Breakpoints not hitting
- Verify breakpoint is enabled: `/playground breakpoint list`
- Check breakpoint condition syntax
- Ensure agent execution reaches breakpoint location

### Out of memory
- Clean up old sessions: `/playground sessions cleanup --age 1`
- Reduce snapshot frequency
- Limit recording data retention

## Performance Tips

1. **Use targeted breakpoints** - Avoid breaking on every step
2. **Limit snapshot frequency** - Only create when needed
3. **Clean up regularly** - Remove old sessions and recordings
4. **Mock expensive operations** - Use mocks for slow external APIs
5. **Filter logs** - Use `--level` to reduce log noise

## See Also

- Main documentation: `.claude/tools/playground/README.md`
- Protocol specification: `.claude/tools/playground/src/protocol.ts`
- Database schema: `.claude/orchestration/db/playground.sql`
- Agent orchestration: `.claude/CLAUDE.md`
- `/plugin-validate` - Validate agent before playground testing
- `/telemetry` - View detailed execution telemetry
- `/memory query` - Query agent memory during debugging
