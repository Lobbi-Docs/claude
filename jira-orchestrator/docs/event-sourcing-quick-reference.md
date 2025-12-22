# Event Sourcing Quick Reference

## Overview

The Event Sourcing Orchestrator provides complete audit trail and time-travel debugging capabilities for the jira-orchestrator plugin.

**Agent File**: `/home/user/claude/jira-orchestrator/agents/event-sourcing-orchestrator.md`

## Quick Start

### 1. Logging Events

Events are logged automatically by the orchestration system, but you can also log manually:

```python
# Import the agent (conceptual - actual implementation varies)
from event_sourcing_orchestrator import log_event

# Log an event
event_id = log_event(
    event_type="AgentSpawned",
    metadata={
        "agent_name": "react-component-architect",
        "agent_model": "sonnet",
        "assigned_task": "Create LoginForm component"
    },
    actor={
        "type": "system",
        "id": "orchestrator"
    }
)
```

### 2. Query Events

```python
# Get all events for an issue
events = query_events(issue_key="PROJ-123")

# Get events by type
failed_events = query_events(
    event_types=["AgentFailed", "PhaseFailed"]
)

# Get events in time range
events = query_events(
    from_timestamp="2025-12-22T10:00:00Z",
    to_timestamp="2025-12-22T12:00:00Z"
)
```

### 3. State Reconstruction

```python
# Current state
current_state = reconstruct_state("PROJ-123")

# State at specific time (time-travel)
past_state = reconstruct_state(
    "PROJ-123",
    at_timestamp="2025-12-22T14:00:00Z"
)
```

### 4. Time-Travel Debugging

```python
# Debug what happened at 2 PM
debug_info = time_travel_query(
    issue_key="PROJ-123",
    query_timestamp="2025-12-22T14:00:00Z"
)

# Returns:
# {
#   "query_timestamp": "2025-12-22T14:00:00Z",
#   "state": {...},
#   "surrounding_events": [...],
#   "state_summary": {
#     "current_phase": "CODE",
#     "active_agents": [...],
#     "completed_phases": [...]
#   }
# }
```

### 5. Event Replay

```python
# Replay events from checkpoint (dry-run)
replay_events(
    issue_key="PROJ-123",
    from_sequence=50,
    dry_run=True
)

# Replay for real (recovery)
replay_events(
    issue_key="PROJ-123",
    from_sequence=50,
    dry_run=False
)
```

### 6. Generate Audit Reports

```python
# Generate HTML report for specific issue
report_path = generate_audit_trail(
    issue_key="PROJ-123",
    format="html"
)

# Generate weekly report (all issues)
report_path = generate_audit_trail(
    from_date="2025-12-15",
    to_date="2025-12-22",
    format="json"
)
```

## Event Types Reference

### Orchestration Lifecycle (5)
- `OrchestrationStarted`
- `OrchestrationCompleted`
- `OrchestrationFailed`
- `OrchestrationPaused`
- `OrchestrationResumed`

### Phase Lifecycle (3)
- `PhaseStarted`
- `PhaseCompleted`
- `PhaseFailed`

### Agent Lifecycle (4)
- `AgentSpawned`
- `AgentCompleted`
- `AgentFailed`
- `AgentBlocked`

### Gap Management (3)
- `GapIdentified`
- `GapResolved`
- `GapEscalated`

### Git Operations (4)
- `CommitCreated`
- `PRCreated`
- `PRMerged`
- `PRClosed`

### Jira Integration (3)
- `IssueTransitioned`
- `CommentPosted`
- `WorklogAdded`

### Documentation (2)
- `DocumentationCreated`
- `ConfluencePageCreated`

### Quality Assurance (6)
- `QualityCheckStarted`
- `QualityCheckCompleted`
- `QualityCheckFailed`
- `TestRunStarted`
- `TestRunCompleted`
- `TestRunFailed`

### State Management (2)
- `CheckpointCreated`
- `CheckpointRestored`

### Error Recovery (4)
- `ErrorOccurred`
- `RecoveryAttempted`
- `RecoverySucceeded`
- `RecoveryFailed`

**Total: 37 event types**

## Common Use Cases

### Debug Failed Orchestration

```python
# 1. Find failure events
failures = query_events(
    issue_key="PROJ-456",
    event_types=["OrchestrationFailed", "PhaseFailed", "AgentFailed"]
)

# 2. Get failure timestamp
failure_time = failures[0]["timestamp"]

# 3. Reconstruct state at failure
state = reconstruct_state("PROJ-456", failure_time)

# 4. View timeline
timeline = time_travel_query("PROJ-456", failure_time)

# 5. Identify root cause from events
```

### Track Agent Performance

```python
# Get all agent events
agent_events = query_events(
    event_types=["AgentSpawned", "AgentCompleted", "AgentFailed"]
)

# Project metrics
metrics = project_agent_metrics(agent_events)

# Returns:
# {
#   "react-component-architect": {
#     "spawned_at": "2025-12-22T10:00:00Z",
#     "completed_at": "2025-12-22T10:15:00Z",
#     "duration_seconds": 900,
#     "status": "completed",
#     "quality_score": 92
#   }
# }
```

### Generate Compliance Report

```python
# Generate full audit trail
report_path = generate_audit_trail(
    from_date="2025-01-01",
    to_date="2025-12-31",
    format="html"
)

# Report includes:
# - All orchestrations executed
# - All agents spawned
# - All commits/PRs created
# - All errors and recoveries
# - Timeline visualization
# - Performance metrics
```

### Recovery from Failure

```python
# 1. Find last good checkpoint
checkpoints = query_events(
    issue_key="PROJ-123",
    event_types=["CheckpointCreated"]
)
last_checkpoint = checkpoints[-1]

# 2. Restore to checkpoint
restore_checkpoint(
    issue_key="PROJ-123",
    checkpoint_id=last_checkpoint["metadata"]["checkpoint_id"]
)

# 3. Replay events after checkpoint
replay_events(
    issue_key="PROJ-123",
    from_sequence=last_checkpoint["event_sequence"] + 1
)
```

## File Locations

- **Agent**: `/home/user/claude/jira-orchestrator/agents/event-sourcing-orchestrator.md`
- **Config**: `/home/user/claude/jira-orchestrator/config/event-sourcing.yaml`
- **Events**: `/home/user/claude/jira-orchestrator/sessions/events/{YYYY-MM-DD}/{ISSUE-KEY}/events.jsonl`
- **Schemas**: `/home/user/claude/jira-orchestrator/sessions/events/schemas/orchestration-events.json`
- **Reports**: `/home/user/claude/jira-orchestrator/sessions/events/reports/`
- **README**: `/home/user/claude/jira-orchestrator/sessions/events/README.md`

## Configuration

Edit `/home/user/claude/jira-orchestrator/config/event-sourcing.yaml`:

```yaml
event_sourcing:
  storage:
    base_path: "/home/user/claude/jira-orchestrator/sessions/events"
    format: "jsonl"
  snapshots:
    enabled: true
    frequency: 50  # Every 50 events
  validation:
    strict_mode: true
    validate_on_write: true
  cleanup:
    archive_after_days: 90
    delete_after_days: 365
```

## Best Practices

### DO ✅
- Log every significant action
- Include complete context in metadata
- Use correlation IDs for related events
- Validate events against schemas
- Create snapshots for long runs
- Use time-travel for debugging

### DON'T ❌
- Never modify or delete events
- Never log sensitive data (passwords, tokens)
- Don't skip validation
- Don't assume event order (use sequence)
- Don't replay non-idempotent events in production

## Troubleshooting

### Problem: Can't find events for issue
```bash
# Check event file exists
ls -lh /home/user/claude/jira-orchestrator/sessions/events/2025-12-22/PROJ-123/

# Check events were written
cat /home/user/claude/jira-orchestrator/sessions/events/2025-12-22/PROJ-123/events.jsonl
```

### Problem: State reconstruction fails
```bash
# 1. Find latest snapshot
ls -lh /home/user/claude/jira-orchestrator/sessions/events/2025-12-22/PROJ-123/snapshot-*.json

# 2. Validate events
# Check for sequence gaps, invalid JSON, schema violations

# 3. Rebuild from snapshot
reconstruct_state("PROJ-123", use_snapshot=True)
```

### Problem: Events log growing too large
```bash
# Check size
du -sh /home/user/claude/jira-orchestrator/sessions/events/

# Enable compression in config
compression: true

# Archive old events
archive_after_days: 30
```

## Integration

Event sourcing is automatically integrated into:

- `/jira:work` - Logs orchestration start
- `/jira:commit` - Logs commits
- `/jira:pr` - Logs PRs
- All agents - Log lifecycle events
- All phases - Log transitions
- Gap detection - Log gaps
- Error handlers - Log errors/recovery

## Support

For detailed documentation, see:
- `/home/user/claude/jira-orchestrator/sessions/events/README.md`
- `/home/user/claude/jira-orchestrator/agents/event-sourcing-orchestrator.md`

---

**Version**: 1.0.0
**Last Updated**: 2025-12-22
