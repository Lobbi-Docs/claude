# Agent Orchestration Protocol v4.0.0

## Overview

This document defines the coordination protocol for multiple Claude instances working in parallel on the Golden Armada project. **All operations MUST follow the Mandatory Sub-Agent Orchestration Protocol.**

## Core Principles

1. **No Overlap**: Agents must acquire locks before modifying shared resources
2. **Communication First**: Agents should announce intentions before acting
3. **Checkpointing**: State must be saved at key milestones
4. **Graceful Degradation**: If coordination fails, fall back to sequential execution
5. **Mandatory Multi-Agent**: All tasks require 3-5 minimum, 13 maximum sub-agents
6. **Phase Discipline**: Must follow Explore → Plan → Code → Test → Fix → Document

---

## MANDATORY SUB-AGENT ORCHESTRATION PROTOCOL

**CRITICAL: All Claude operations MUST adhere to this protocol. No exceptions.**

### Sub-Agent Requirements

| Requirement | Value |
|-------------|-------|
| **Minimum Sub-Agents** | 3-5 per task |
| **Maximum Sub-Agents** | 13 per task |
| **Default Sub-Agents** | 5 per task |
| **Mandatory Pattern** | Explore → Plan → Code → Test → Fix → Document |
| **Context Persistence** | REQUIRED across all phases |
| **Next Steps Tracking** | REQUIRED for every phase |

### Mandatory Execution Phases

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: EXPLORE (2+ agents)                                           │
│  ├── researcher: Analyze requirements & codebase                        │
│  ├── code-analyzer: Review existing patterns                            │
│  └── system-architect: Identify dependencies                            │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: PLAN (1-2 agents)                                             │
│  ├── planner: Break down tasks, create TODO list                        │
│  └── system-architect: Design solution architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: CODE (2-4 agents based on scope)                              │
│  ├── coder: Implement primary features                                  │
│  ├── [language]-specialist: Language-specific expertise                 │
│  ├── backend-dev OR frontend-dev: Layer-specific work                   │
│  └── database-specialist: Data layer changes                            │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 4: TEST (2-3 agents)                                             │
│  ├── tester: Unit tests + integration tests                             │
│  ├── security-auditor: Security validation                              │
│  └── e2e-tester: End-to-end verification                                │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 5: FIX (1-2 agents, iterate until passing)                       │
│  ├── debugger: Fix identified issues                                    │
│  └── tester: Verify fixes                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 6: DOCUMENT (1-2 agents)                                         │
│  ├── docs-writer: Update documentation                                  │
│  └── reviewer: Final review                                             │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

### Phase Mapping

| Phase | Required Agents | Purpose |
|-------|-----------------|---------|
| `explore` | researcher, code-analyzer, system-architect | Understand requirements and codebase |
| `plan` | planner, system-architect | Design solution and create task breakdown |
| `code` | coder, backend-dev/frontend-dev, database-specialist | Implement features |
| `test` | tester, security-auditor, e2e-tester | Validate implementation |
| `fix` | debugger, tester | Resolve identified issues |
| `document` | docs-writer, reviewer | Update documentation and final review |

### Context Preservation

**ALWAYS maintain context between phases:**

\`\`\`markdown
## Current Context
- Phase: [EXPLORE|PLAN|CODE|TEST|FIX|DOCUMENT]
- Active Agents: [list of currently active agents]
- Completed: [summary of completed work]
- Pending: [remaining todo items]

## Next Steps
1. [Immediate next action]
2. [Following action]
3. [Subsequent action]

## Context to Preserve
- [Key decisions made]
- [Important file locations]
- [Dependencies identified]
- [Issues to address]
\`\`\`

### Validation Rules

1. **Cannot skip phases** - Must progress sequentially (except returning to "fix")
2. **Cannot mark done without testing** - Test phase is mandatory
3. **Cannot start coding without planning** - Plan phase must complete first
4. **Context must persist** - All context must be preserved across phases
5. **Next steps must be tracked** - Always maintain next steps list

### Orchestration Hooks

Use the orchestration hooks to enforce the protocol:

\`\`\`bash
# Validate sub-agent count
.claude/hooks/orchestration-hooks.sh validate-agents 5

# Initialize phase tracking
.claude/hooks/orchestration-hooks.sh init-phases

# Transition to next phase
.claude/hooks/orchestration-hooks.sh transition-phase plan "exploration_complete"

# Preserve context
.claude/hooks/orchestration-hooks.sh preserve-context '{"decisions": [...], "files": [...]}'

# Track next steps
.claude/hooks/orchestration-hooks.sh track-next-steps '["Step 1", "Step 2", "Step 3"]'

# Get orchestration status
.claude/hooks/orchestration-hooks.sh status
\`\`\`

---

## Agent Lifecycle

\`\`\`
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  REGISTER   │ ───► │    IDLE     │ ◄─── │   PAUSED    │
└─────────────┘      └──────┬──────┘      └──────▲──────┘
                            │                    │
                            ▼                    │
                     ┌─────────────┐             │
                     │   RUNNING   │ ────────────┘
                     └──────┬──────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       ┌─────────────┐             ┌─────────────┐
       │  COMPLETED  │             │    ERROR    │
       └─────────────┘             └─────────────┘
\`\`\`

### Registration

Every agent must register before performing work:

\`\`\`python
from orchestrator import Orchestrator, Agent

orch = Orchestrator()

# Register agent
agent = Agent(
    id="agent-uuid",
    name="coder-1",
    type="coder",
    category="core"
)
orch.agents.register(agent)
\`\`\`

---

## Resource Locking Protocol

### Lock Types

| Type | Scope | Use Case |
|------|-------|----------|
| `file` | Single file | Editing source code |
| `directory` | Directory tree | Bulk file operations |
| `task` | Task ID | Claiming a task |
| `api` | External API | Rate-limited resources |
| `database` | DB resource | Schema migrations |

### Acquiring Locks

\`\`\`python
# Try to acquire lock
if orch.locks.acquire("src/app.py", "file", agent_id):
    # Perform work
    edit_file("src/app.py")
    # Release lock
    orch.locks.release("src/app.py", agent_id)
else:
    # Resource is locked by another agent
    owner = orch.locks.get_owner("src/app.py")
    print(f"File locked by {owner}")
\`\`\`

### Context Manager (Recommended)

\`\`\`python
try:
    with orch.locks.lock("src/app.py", "file", agent_id):
        edit_file("src/app.py")
except ResourceLockedError:
    # Handle conflict
    pass
\`\`\`

### Lock Timeout

Locks automatically expire after 5 minutes (configurable). Always release locks explicitly when done.

---

## Inter-Agent Communication

### Channels

| Channel | Description | Use Case |
|---------|-------------|----------|
| `broadcast` | All agents receive | Announcements, status updates |
| `direct` | Point-to-point | Requests, responses |
| `task` | Task-scoped | Collaboration on specific task |

### Message Types

| Type | Description |
|------|-------------|
| `request` | Asking for something |
| `response` | Reply to request |
| `notification` | Informational update |
| `status` | Agent status change |
| `error` | Error notification |
| `handoff` | Task handoff to another agent |

### Broadcasting

\`\`\`python
# Announce start of work
orch.messages.broadcast(
    body="Starting implementation of auth module",
    sender_id=agent_id,
    message_type="status",
    subject="Work Started"
)
\`\`\`

### Direct Messages

\`\`\`python
# Request help from another agent
orch.messages.send_direct(
    recipient_id="reviewer-agent-id",
    body="Ready for code review on PR #123",
    sender_id=agent_id,
    message_type="request",
    subject="Review Request"
)
\`\`\`

### Receiving Messages

\`\`\`python
# Check for messages
messages = orch.messages.receive(agent_id)
for msg in messages:
    print(f"From {msg['sender_id']}: {msg['body']}")
    orch.messages.mark_read(msg['id'])
\`\`\`

---

## Checkpointing Protocol

### When to Checkpoint

1. **Task Start**: Before beginning work
2. **Task Complete**: After successful completion
3. **Before Risky Operations**: Before destructive changes
4. **On Error**: Capture state when errors occur
5. **Periodically**: Every 5 minutes for long tasks

### Creating Checkpoints

\`\`\`python
# Create checkpoint
checkpoint_id = orch.checkpoints.create(
    checkpoint_type="task_start",
    state={
        "task_id": task_id,
        "current_step": "implementing",
        "progress": 0.5,
        "context": {...}
    },
    session_id=session_id,
    task_id=task_id,
    agent_id=agent_id,
    files_snapshot=["src/app.py", "tests/test_app.py"]
)
\`\`\`

### Restoring from Checkpoint

\`\`\`python
# Get latest checkpoint
checkpoint = orch.checkpoints.get_latest(task_id=task_id)

if checkpoint:
    state = checkpoint['state']
    # Resume from saved state
    resume_task(state)
\`\`\`

---

## Task Coordination

### Task States

\`\`\`
PENDING ─► QUEUED ─► RUNNING ─► COMPLETED
                        │
                        ├─► FAILED
                        │
                        └─► CANCELLED
\`\`\`

### Claiming Tasks

\`\`\`python
# Get pending tasks
pending = orch.tasks.get_pending(limit=5)

for task in pending:
    # Try to claim by acquiring lock
    if orch.locks.acquire(f"task:{task['id']}", "task", agent_id):
        orch.tasks.assign(task['id'], agent_id)
        orch.tasks.update_status(task['id'], TaskStatus.RUNNING)

        # Do work
        result = execute_task(task)

        # Complete
        orch.tasks.update_status(task['id'], TaskStatus.COMPLETED, result=result)
        orch.locks.release(f"task:{task['id']}", agent_id)
        break
\`\`\`

### Task Dependencies

For tasks with dependencies, use parent_task_id:

\`\`\`python
# Create subtask
subtask = Task(
    id=str(uuid.uuid4()),
    title="Write unit tests",
    parent_task_id=main_task_id,
    agent_id=tester_agent_id
)
orch.tasks.create(subtask)
\`\`\`

---

## Parallel Execution Pattern

### Work Distribution

\`\`\`
                    ┌─────────────────┐
                    │   COORDINATOR   │
                    │ (Hierarchical)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ CODER-1 │    │ CODER-2 │    │ TESTER  │
        │  (API)  │    │  (UI)   │    │         │
        └─────────┘    └─────────┘    └─────────┘
\`\`\`

### Coordinator Protocol

1. **Decompose**: Break task into subtasks
2. **Assign**: Assign subtasks to appropriate agents
3. **Monitor**: Track progress via messages
4. **Aggregate**: Combine results when all complete

\`\`\`python
# Coordinator creates session
session_id = orch.start_session("Feature Implementation", pattern="hierarchical")

# Create subtasks
api_task = Task(id=str(uuid.uuid4()), title="Implement API", session_id=session_id)
ui_task = Task(id=str(uuid.uuid4()), title="Implement UI", session_id=session_id)
test_task = Task(id=str(uuid.uuid4()), title="Write Tests", session_id=session_id)

orch.tasks.create(api_task)
orch.tasks.create(ui_task)
orch.tasks.create(test_task)

# Broadcast to agents
orch.messages.broadcast(
    body=json.dumps({"tasks": [api_task.id, ui_task.id, test_task.id]}),
    sender_id=coordinator_id,
    message_type="request",
    subject="Task Assignment"
)
\`\`\`

---

## Conflict Resolution

### File Conflicts

1. Check lock before editing
2. If locked, wait up to 30 seconds
3. If still locked, skip or queue for later
4. Report conflict to coordinator

### Task Conflicts

1. Use task locks to prevent duplicate claims
2. Coordinator arbitrates if conflicts occur
3. Lower priority agent yields

### Resolution Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| `queue` | Wait in queue | Non-urgent, can wait |
| `skip` | Skip resource | Low priority, alternatives exist |
| `retry` | Retry with backoff | Transient conflicts |
| `escalate` | Ask coordinator | Critical conflicts |

---

## Activity Logging

### Log Levels

| Level | Use Case |
|-------|----------|
| `DEBUG` | Detailed debugging info |
| `INFO` | Normal operations |
| `WARN` | Potential issues |
| `ERROR` | Errors that need attention |

### Logging Actions

\`\`\`python
# Log activity
orch.logger.log(
    action="file_edit",
    message="Modified src/app.py - added auth middleware",
    agent_id=agent_id,
    session_id=session_id,
    task_id=task_id,
    category="task_execution",
    level=LogLevel.INFO,
    details={"file": "src/app.py", "lines_changed": 45}
)
\`\`\`

### Required Log Points

1. Task start/complete
2. File modifications
3. Lock acquire/release
4. Messages sent/received
5. Errors and exceptions
6. Checkpoints created

---

## Error Handling

### On Error

1. Log the error with full context
2. Create checkpoint with current state
3. Notify coordinator via message
4. Release all held locks
5. Update task status to FAILED

\`\`\`python
try:
    # Work
    pass
except Exception as e:
    # Log error
    orch.logger.log(
        action="error",
        message=str(e),
        agent_id=agent_id,
        level=LogLevel.ERROR,
        details={"traceback": traceback.format_exc()}
    )

    # Checkpoint
    orch.checkpoints.create(
        checkpoint_type="error",
        state={"error": str(e), "context": {...}},
        agent_id=agent_id
    )

    # Notify
    orch.messages.broadcast(
        body=f"Error in {agent_id}: {e}",
        sender_id=agent_id,
        message_type="error"
    )

    # Update task
    orch.tasks.update_status(task_id, TaskStatus.FAILED, error=str(e))
\`\`\`

---

## Best Practices

1. **Always register** before doing work
2. **Lock early, release promptly** - minimize lock duration
3. **Communicate intentions** - broadcast before major changes
4. **Checkpoint frequently** - especially before risky operations
5. **Handle errors gracefully** - always clean up resources
6. **Log everything** - future debugging depends on it
7. **Respect the coordinator** - follow task assignments
8. **Don't hoard locks** - release as soon as possible

---

## Orchestration Protocol Best Practices (v4.0.0)

### ALWAYS:
- Use 3-5 minimum sub-agents per task (max 13)
- Follow Explore → Plan → Code → Test → Fix → Document
- Track "Next Steps" for context continuity
- Use Context7 for library documentation
- Verify work before marking complete
- Preserve context across all phases

### NEVER:
- Start coding without exploration and planning
- Skip the testing phase
- Declare "done" without running tests
- Ignore failing tests
- Lose context between phases
- Use fewer than 3 sub-agents

### Quick Reference

\`\`\`bash
# Check orchestration status
.claude/hooks/orchestration-hooks.sh status

# Validate before starting work
.claude/hooks/orchestration-hooks.sh pre-check "Task description" 5 explore

# Transition phases
.claude/hooks/orchestration-hooks.sh transition-phase plan "exploration_complete"

# Preserve context for next phase
.claude/hooks/orchestration-hooks.sh preserve-context '{"key": "value"}'
\`\`\`

---

**Version:** 4.0.0
**Last Updated:** Auto-generated
**Optimized for:** Maximum orchestration, comprehensive coverage, zero context loss
