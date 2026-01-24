# Event Sourcing System

## Overview

The Event Sourcing Orchestrator provides a complete, immutable audit trail of all orchestration activities in the jira-orchestrator plugin. Every action, decision, and state transition is captured as an event in an append-only log.

## Directory Structure

```
/home/user/claude/jira-orchestrator/sessions/events/
├── {YYYY-MM-DD}/              # Date-based partitions
│   ├── {ISSUE-KEY}/           # Issue-specific events
│   │   ├── events.jsonl       # Append-only event log
│   │   ├── snapshot-*.json    # State snapshots
│   │   └── metadata.json      # Session metadata
│   └── index.json             # Daily event index
├── global/                    # Cross-issue events
│   └── events.jsonl
├── schemas/                   # Event schemas
│   ├── orchestration-events.json
│   └── version-history.json
├── reports/                   # Generated audit reports
│   └── audit-*.{json,html,csv}
├── archive/                   # Archived events (90+ days)
└── README.md                  # This file
```

## Event Types

### Orchestration Lifecycle (5 types)
- `OrchestrationStarted` - Orchestration begins for a Jira issue
- `OrchestrationCompleted` - Orchestration successfully completes
- `OrchestrationFailed` - Orchestration fails with error details
- `OrchestrationPaused` - Orchestration paused (manual intervention needed)
- `OrchestrationResumed` - Orchestration resumed from pause

### Phase Lifecycle (3 types)
- `PhaseStarted` - New phase begins (EXPLORE, PLAN, CODE, TEST, FIX, DOCUMENT)
- `PhaseCompleted` - Phase completes successfully with outputs
- `PhaseFailed` - Phase fails with error details

### Agent Lifecycle (4 types)
- `AgentSpawned` - Agent spawned with assigned task
- `AgentCompleted` - Agent completes task successfully
- `AgentFailed` - Agent fails with error details
- `AgentBlocked` - Agent blocked waiting for dependency

### Gap Management (3 types)
- `GapIdentified` - Gap detected (missing tests, documentation, etc.)
- `GapResolved` - Gap successfully resolved
- `GapEscalated` - Gap escalated to human intervention

### Git Operations (4 types)
- `CommitCreated` - Git commit created
- `PRCreated` - Pull request created
- `PRMerged` - Pull request merged
- `PRClosed` - Pull request closed

### Jira Integration (3 types)
- `IssueTransitioned` - Jira issue status changed
- `CommentPosted` - Comment added to Jira issue
- `WorklogAdded` - Time logged to Jira issue

### Documentation (2 types)
- `DocumentationCreated` - Documentation file created
- `ConfluencePageCreated` - Confluence page created

### Quality Assurance (6 types)
- `QualityCheckStarted` - Quality check initiated
- `QualityCheckCompleted` - Quality check passed
- `QualityCheckFailed` - Quality check failed
- `TestRunStarted` - Test suite started
- `TestRunCompleted` - Tests completed
- `TestRunFailed` - Tests failed

### State Management (2 types)
- `CheckpointCreated` - State checkpoint created
- `CheckpointRestored` - State restored from checkpoint

### Summaries & Retention (2 types)
- `PhaseSummaryCreated` - Rolling summary of phase events
- `OrchestrationSummaryCreated` - Rolling summary of orchestration events

### Error Recovery (4 types)
- `ErrorOccurred` - Error occurred with details
- `RecoveryAttempted` - Recovery attempt initiated
- `RecoverySucceeded` - Recovery successful
- `RecoveryFailed` - Recovery failed

**Total: 39 event types**

## Event Structure

All events share this base structure:

```json
{
  "event_id": "uuid-v4",
  "event_type": "OrchestrationStarted",
  "event_version": "1.0.0",
  "timestamp": "2025-12-22T10:30:00.123Z",
  "event_sequence": 1,
  "issue_key": "PROJ-123",
  "session_id": "uuid-v4",
  "correlation_id": "uuid-v4",
  "causation_id": "uuid-v4",
  "actor": {
    "type": "user|system|agent",
    "id": "user@example.com",
    "model": "sonnet"
  },
  "metadata": {
    "...event-specific data..."
  },
  "git_sha": "abc123...",
  "branch": "feature/PROJ-123"
}
```

## Core Capabilities

### 1. Immutable Event Log
- Append-only writes (never modify or delete)
- Complete audit trail
- Tamper-proof history

### 2. State Reconstruction
Rebuild complete state from events:

```bash
# Reconstruct current state
reconstruct_state("PROJ-123")

# Reconstruct state at specific time
reconstruct_state("PROJ-123", "2025-12-22T14:00:00Z")
```

### 3. Time-Travel Debugging
View state at any point in time:

```bash
# What was happening at 2 PM?
time_travel_query("PROJ-123", "2025-12-22T14:00:00Z")

# Returns:
# - State at that moment
# - Events before/after
# - Active agents
# - Current phase
# - Pending tasks
```

### 4. Event Replay
Re-execute events for recovery or testing:

```bash
# Replay from specific sequence
replay_events("PROJ-123", from_sequence=50)

# Replay specific event types
replay_events("PROJ-123", event_filter=lambda e: e["event_type"] == "AgentSpawned")

# Dry-run mode (don't execute, just simulate)
replay_events("PROJ-123", dry_run=True)
```

### 5. Audit Trail Generation
Generate comprehensive audit reports:

```bash
# Generate audit report for specific issue
generate_audit_trail(issue_key="PROJ-123", format="html")

# Generate report for date range
generate_audit_trail(
    from_date="2025-12-15",
    to_date="2025-12-22",
    format="json"
)

# Filter by event types
generate_audit_trail(
    issue_key="PROJ-123",
    event_types=["CommitCreated", "PRCreated"],
    format="csv"
)
```

### 6. Event Querying
Fast lookups and searches:

```bash
# Find all events for issue
query_events(issue_key="PROJ-123")

# Find events by type
query_events(event_types=["AgentFailed", "PhaseFailed"])

# Find events by timestamp range
query_events(
    from_timestamp="2025-12-22T10:00:00Z",
    to_timestamp="2025-12-22T12:00:00Z"
)

# Find events by agent
query_events(agent_name="react-component-architect")

# Find events by phase
query_events(phase="CODE")
```

### 7. Snapshot Optimization
Periodic snapshots for fast reconstruction:

```bash
# Snapshots created automatically every 50 events
# Manual snapshot creation:
create_snapshot("PROJ-123", at_sequence=100)

# Snapshots stored in: {ISSUE-KEY}/snapshot-{sequence}.json
```

### 8. Summary Events & Retention
To keep context efficient while preserving traceability:

- Emit `PhaseSummaryCreated` every N events (default: 25) within a phase.
- Emit `OrchestrationSummaryCreated` every N events (default: 100) across the session.
- Retain summary events indefinitely; archive raw events after the retention window (default: 90 days).
- All summaries include references to source event ranges for audit tracebacks.

## Usage Examples

### Example 1: Log Orchestration Start

```python
from event_sourcing_orchestrator import log_event

log_event(
    event_type="OrchestrationStarted",
    metadata={
        "issue_key": "PROJ-123",
        "issue_summary": "Add authentication",
        "issue_type": "Story",
        "priority": "High",
        "labels": ["frontend", "backend"],
        "initial_phase": "EXPLORE"
    },
    actor={
        "type": "user",
        "id": "developer@company.com"
    }
)
```

### Example 2: Log Agent Spawned

```python
log_event(
    event_type="AgentSpawned",
    metadata={
        "agent_name": "react-component-architect",
        "agent_type": "code",
        "agent_model": "sonnet",
        "spawn_reason": "frontend changes detected",
        "assigned_task": "Create LoginForm component",
        "assigned_files": ["src/components/LoginForm.tsx"]
    },
    actor={
        "type": "system",
        "id": "orchestrator"
    }
)
```

### Example 3: Log Gap Identified

```python
log_event(
    event_type="GapIdentified",
    metadata={
        "gap_id": "gap-auth-123",
        "gap_type": "missing_tests",
        "severity": "high",
        "phase": "TEST",
        "description": "No integration tests for authentication",
        "affected_modules": ["auth/login", "auth/logout"],
        "recommended_actions": ["Create E2E test suite"],
        "blocking": True
    },
    actor={
        "type": "agent",
        "id": "test-strategist",
        "model": "sonnet"
    }
)
```

### Example 4: Debug Failed Orchestration

```python
# 1. Query all events for failed orchestration
events = query_events(
    issue_key="PROJ-456",
    event_types=["OrchestrationFailed", "PhaseFailed", "AgentFailed"]
)

# 2. Find when it failed
failure_event = events[0]
failure_time = failure_event["timestamp"]

# 3. Reconstruct state at failure
state_at_failure = reconstruct_state("PROJ-456", failure_time)

# 4. View surrounding events
timeline = time_travel_query("PROJ-456", failure_time)

# 5. Identify root cause
print(f"Failed in phase: {failure_event['metadata']['failure_phase']}")
print(f"Reason: {failure_event['metadata']['failure_reason']}")
print(f"Error: {failure_event['metadata']['error_message']}")
```

### Example 5: Generate Weekly Report

```python
# Generate report for all orchestrations last week
report_path = generate_audit_trail(
    from_date="2025-12-15",
    to_date="2025-12-22",
    format="html"
)

# Report includes:
# - Total orchestrations started/completed
# - Success/failure rates
# - Average duration by phase
# - Agent utilization
# - Gap identification/resolution rates
# - Timeline visualization
# - Error analysis
```

## State Projections

The event store supports multiple projections from the same event stream:

### 1. Orchestration State
Current state of orchestration:
- Current phase
- Active agents
- Completed phases
- Commits created
- PRs created
- Identified gaps

### 2. Agent Metrics
Performance metrics per agent:
- Total spawned
- Success/failure rate
- Average duration
- Quality scores
- Output counts

### 3. Timeline View
Chronological view of all events with summaries

### 4. Quality Metrics
Aggregated quality and test metrics

## Configuration

Configuration in `/home/user/claude/jira-orchestrator/config/event-sourcing.yaml`:

- **Storage**: Path, format, compression
- **Snapshots**: Frequency, retention, cleanup
- **Validation**: Schema validation rules
- **Performance**: Caching, async writes
- **Cleanup**: Archival, deletion policies
- **Query**: Pagination, timeouts
- **Replay**: Dry-run, idempotency
- **Audit**: Report formats, retention

## Best Practices

### DO:
✅ Log every significant action as an event
✅ Include complete context in metadata
✅ Use correlation IDs to link related events
✅ Validate events against schemas
✅ Create snapshots for long-running orchestrations
✅ Use time-travel debugging for complex issues
✅ Generate audit reports regularly

### DON'T:
❌ Never modify or delete events
❌ Never log sensitive data (passwords, tokens)
❌ Don't skip event validation
❌ Don't assume events are in order (use event_sequence)
❌ Don't ignore schema version compatibility
❌ Don't replay non-idempotent events in production

## Troubleshooting

### Event Log Corrupted
1. Check latest snapshot
2. Validate event file integrity
3. Rebuild from snapshot + valid events
4. Report corruption for investigation

### State Reconstruction Fails
1. Verify all events have valid schemas
2. Check for missing events (sequence gaps)
3. Validate snapshot integrity
4. Review event application logic

### Query Performance Slow
1. Check index health
2. Use snapshots for reconstruction
3. Add caching for frequent queries
4. Partition data by date/issue

### Storage Growing Too Fast
1. Reduce snapshot frequency
2. Enable compression
3. Archive old events
4. Review retention policies

## Integration

The event sourcing orchestrator is automatically integrated into:

- `/jira:work` - Logs OrchestrationStarted
- `/jira:commit` - Logs CommitCreated
- `/jira:pr` - Logs PRCreated
- All agents - Log spawn/complete/fail events
- All phases - Log phase transitions
- Gap detection - Log gaps identified/resolved
- Error handlers - Log errors and recovery

## Metrics

Track these metrics for monitoring:

- **Event Throughput**: Events/second
- **Write Latency**: Time to append event
- **Read Latency**: Time to query events
- **Storage Size**: Total size of event store
- **Snapshot Count**: Active snapshots
- **Index Size**: Size of indexes
- **Cache Hit Rate**: Query cache effectiveness

## Compliance

For compliance-sensitive environments:

1. Enable `compliance_mode` in config
2. Events are cryptographically signed
3. Tamper detection on read
4. Audit reports include signatures
5. External backup recommended
6. Long retention periods (7+ years)

## Support

For issues or questions:

1. Check event validation errors
2. Review recent events for patterns
3. Use time-travel debugging
4. Generate audit report
5. Consult event-sourcing-orchestrator agent

## Schema Versioning

Current schema version: **1.0.0**

When schema changes:
1. Increment version (semver)
2. Document breaking changes
3. Provide migration path
4. Test backward compatibility
5. Update version history

## Future Enhancements

Planned features:
- Event streaming to external systems
- Real-time event subscriptions
- Advanced analytics and ML insights
- Cross-orchestration correlation
- Visual timeline explorer
- Event-driven automation triggers

---

**Last Updated**: 2025-12-22
**Maintained By**: event-sourcing-orchestrator agent
**Version**: 1.0.0
