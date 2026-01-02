---
name: jira:events
description: Query event sourcing system for audit trails, time-travel debugging, and state reconstruction
arguments:
  - name: operation
    description: Operation (audit, time-travel, replay, query)
    required: true
  - name: issue_key
    description: Issue key to analyze
    required: false
  - name: timestamp
    description: Timestamp for time-travel (ISO 8601)
    required: false
version: 1.0.0
---

# Event Sourcing Operations

You are querying the **event sourcing system** for orchestration audit trails and debugging.

## Parameters

- **Operation:** ${operation}
- **Issue Key:** ${issue_key:-all}
- **Timestamp:** ${timestamp:-now}

---

## Available Operations

### 1. Audit Trail (`audit`)

Generate complete audit report for orchestration activities.

```
Invoke the `event-sourcing-orchestrator` agent with:
  - operation: "generate-audit-trail"
  - issue_key: ${issue_key}
  - from_date: {start_date}
  - to_date: {end_date}
  - format: "markdown"
```

**Output:**
```markdown
## 📋 Audit Trail: ${issue_key}

### Event Timeline
| Time | Event | Actor | Details |
|------|-------|-------|---------|
| 10:15:23 | OrchestrationStarted | user@company.com | Phase: EXPLORE |
| 10:15:45 | AgentSpawned | system | Agent: requirements-analyzer |
| 10:18:32 | PhaseCompleted | system | Phase: EXPLORE, Duration: 3m |
| ... | ... | ... | ... |

### Statistics
- Total Events: 47
- Duration: 2h 15m
- Agents Used: 8
- Phases Completed: 6/6
```

### 2. Time-Travel Debugging (`time-travel`)

View system state at any point in time.

```
Invoke the `event-sourcing-orchestrator` agent with:
  - operation: "time-travel-query"
  - issue_key: ${issue_key}
  - query_timestamp: ${timestamp}
```

**Output:**
```markdown
## ⏰ Time-Travel: ${timestamp}

### State at ${timestamp}
- **Orchestration:** In Progress
- **Current Phase:** CODE
- **Active Agents:** 3
  - code-architect (running)
  - test-writer-fixer (running)
  - documentation-writer (pending)

### Recent Events (±5 minutes)
| Time | Event | Details |
|------|-------|---------|
| -3m | AgentSpawned | code-architect |
| -1m | CommitCreated | abc123def |
| +0m | **YOU ARE HERE** | |
| +2m | AgentCompleted | code-architect |
| +4m | PhaseCompleted | CODE |

### Context at This Moment
- Files Changed: 12
- Tests Written: 8
- Coverage: 72%
- Open Gaps: 2
```

### 3. Event Replay (`replay`)

Replay events for recovery or testing.

```
Invoke the `event-sourcing-orchestrator` agent with:
  - operation: "replay-events"
  - issue_key: ${issue_key}
  - from_sequence: {sequence_number}
  - dry_run: true  # Set to false to actually execute
```

**Output:**
```markdown
## 🔄 Event Replay: ${issue_key}

### Replay Plan (Dry Run)
| Seq | Event | Action | Status |
|-----|-------|--------|--------|
| 45 | AgentSpawned | Spawn test-writer-fixer | ⏳ Pending |
| 46 | CommitCreated | Skip (non-idempotent) | ⏭️ Skip |
| 47 | PhaseCompleted | Mark TEST complete | ⏳ Pending |
| 48 | AgentSpawned | Spawn documentation-writer | ⏳ Pending |

### Replay Summary
- Events to replay: 4
- Events to skip: 1
- Estimated time: 15 minutes

### ⚠️ Warnings
- Commit events will be skipped (already applied)
- Run with dry_run=false to execute
```

### 4. Event Query (`query`)

Search and filter events.

```
Invoke the `event-sourcing-orchestrator` agent with:
  - operation: "query-events"
  - issue_key: ${issue_key}
  - event_types: ["AgentFailed", "GapIdentified", "ErrorOccurred"]
  - from_date: {start_date}
  - limit: 50
```

**Output:**
```markdown
## 🔍 Event Query Results

**Filter:** event_type IN (AgentFailed, GapIdentified, ErrorOccurred)
**Results:** 12 events

### Events Found
| Time | Issue | Event | Details |
|------|-------|-------|---------|
| Dec 20, 10:15 | PROJ-123 | AgentFailed | test-writer-fixer: timeout |
| Dec 20, 11:30 | PROJ-124 | GapIdentified | coverage < 80% |
| Dec 21, 09:45 | PROJ-123 | ErrorOccurred | Jira API rate limit |
| ... | ... | ... | ... |

### Patterns Detected
- 3 failures related to test-writer-fixer
- 5 coverage gaps in frontend code
- 2 API rate limit errors (cluster around 10am)
```

---

## Event Types Reference

### Orchestration Lifecycle
- `OrchestrationStarted`, `OrchestrationCompleted`, `OrchestrationFailed`
- `OrchestrationPaused`, `OrchestrationResumed`

### Phase Lifecycle
- `PhaseStarted`, `PhaseCompleted`, `PhaseFailed`

### Agent Lifecycle
- `AgentSpawned`, `AgentCompleted`, `AgentFailed`, `AgentBlocked`

### Gap Management
- `GapIdentified`, `GapResolved`, `GapEscalated`

### Git Operations
- `CommitCreated`, `PRCreated`, `PRMerged`, `PRClosed`

### Quality Assurance
- `TestRunStarted`, `TestRunCompleted`, `TestRunFailed`
- `QualityCheckStarted`, `QualityCheckCompleted`, `QualityCheckFailed`

---

## Example Usage

```bash
# Generate audit trail for an issue
/jira:events operation=audit issue_key=PROJ-123

# Time-travel to 2 hours ago
/jira:events operation=time-travel issue_key=PROJ-123 timestamp="2025-12-22T10:00:00Z"

# Replay events from sequence 50 (dry run)
/jira:events operation=replay issue_key=PROJ-123 from_sequence=50

# Query all failures in the last week
/jira:events operation=query event_types=AgentFailed,ErrorOccurred
```
