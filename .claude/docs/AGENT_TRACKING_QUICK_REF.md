# Agent Activity Tracking - Quick Reference

**Version:** 1.0.0 | **One-Page Cheat Sheet**

---

## Quick Start (30 Seconds)

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

with track_agent('coder', 'task-123') as agent_id:
    update_agent_phase(agent_id, 'code', 'Writing functions')
    log_checkpoint(agent_id, 'quality-check', {'tests': 10})
    # Auto-completes on exit
\`\`\`

---

## Common Commands

### Context Manager (Recommended)

\`\`\`python
with track_agent('agent_type', 'task-id') as agent_id:
    # Your agent code here
    pass  # Auto-logs start and completion
\`\`\`

### Phase Updates

\`\`\`python
update_agent_phase(agent_id, 'explore', 'Analyzing requirements')
update_agent_phase(agent_id, 'plan', 'Creating architecture')
update_agent_phase(agent_id, 'code', 'Implementing', files_modified=5)
update_agent_phase(agent_id, 'test', 'Running tests')
update_agent_phase(agent_id, 'fix', 'Fixing bugs')
update_agent_phase(agent_id, 'document', 'Writing docs')
\`\`\`

### Checkpoints

\`\`\`python
log_checkpoint(agent_id, 'start')           # Automatic
log_checkpoint(agent_id, 'planning')         # Planning phase begins
log_checkpoint(agent_id, 'post-plan')        # Ready to execute
log_checkpoint(agent_id, 'quality-check')    # Testing complete
log_checkpoint(agent_id, 'commit')           # Automatic on completion
\`\`\`

### Checkpoint with Metadata

\`\`\`python
log_checkpoint(agent_id, 'quality-check', {
    'tests_run': 25,
    'tests_passed': 23,
    'coverage': '92%'
})
\`\`\`

---

## Manual Tracking

\`\`\`python
from orchestration.agent_activity_logger import (
    generate_agent_id, log_agent_start, log_agent_complete
)

agent_id = generate_agent_id()
log_agent_start(agent_id, 'tester', 'task-456')

# ... work ...

log_agent_complete(agent_id, 'completed', errors=0, warnings=2)
\`\`\`

---

## Hierarchical Agents

\`\`\`python
# Parent
with track_agent('planner', 'sprint-01') as parent_id:
    # Child 1
    with track_agent('coder', 'feat-a', parent_task='sprint-01') as child1:
        update_agent_phase(child1, 'code', 'Feature A')

    # Child 2
    with track_agent('coder', 'feat-b', parent_task='sprint-01') as child2:
        update_agent_phase(child2, 'code', 'Feature B')
\`\`\`

---

## Dashboard Access

| Resource | Location |
|----------|----------|
| **Live Dashboard** | `C:\Users\MarkusAhling\obsidian\System\Agents\Agent-Dashboard.md` |
| **Activity Log** | `C:\Users\MarkusAhling\obsidian\System\Agents\Activity-Log.md` |
| **Queries** | `C:\Users\MarkusAhling\obsidian\System\Agents\Queries\` |
| **Fallback JSON** | `.claude\orchestration\db\agent-activity.json` |

---

## Valid Values

### Agent Phases
\`\`\`python
PHASES = ['explore', 'plan', 'code', 'test', 'fix', 'document']
\`\`\`

### Checkpoints
\`\`\`python
CHECKPOINTS = ['start', 'planning', 'post-plan', 'quality-check', 'commit']
\`\`\`

### Status
\`\`\`python
STATUS = ['in_progress', 'completed', 'failed']
\`\`\`

### Common Agent Types
\`\`\`python
AGENTS = [
    'coder', 'tester', 'reviewer', 'planner', 'debugger',
    'docs-writer', 'researcher', 'backend-dev', 'frontend-dev',
    'security-auditor', 'database-specialist', 'system-architect'
]
\`\`\`

---

## Troubleshooting

### MCP Not Available?
\`\`\`bash
# Check fallback JSON
ls -lh .claude/orchestration/db/agent-activity.json

# Sync to Obsidian when available
bash .claude/orchestration/activity-sync.sh
\`\`\`

### Missing Entries in Obsidian?
1. ✅ Obsidian running?
2. ✅ Local REST API plugin enabled?
3. ✅ Port 27123 accessible?
4. ✅ Run sync script

### Duplicate Entries?
\`\`\`python
# DON'T: Generate new ID each call
update_agent_phase(generate_agent_id(), 'code', 'Writing')  # WRONG

# DO: Reuse agent_id from context
with track_agent('coder', 'task-123') as agent_id:
    update_agent_phase(agent_id, 'code', 'Writing')  # CORRECT
\`\`\`

---

## TypeScript Query API

\`\`\`typescript
import { mcpClient } from './obsidian-mcp-client';

// Get active agents
const active = await mcpClient.getActiveAgents();

// Get agents for task
const taskAgents = await mcpClient.getTaskAgents('task-123');

// Query with filters
const results = await mcpClient.queryActivities({
  phase: 'test',
  status: 'in_progress'
});

// Get summary stats
const summary = await mcpClient.getSummary();
console.log(`Active: ${summary.activeAgents}, Errors: ${summary.totalErrors}`);
\`\`\`

---

## Performance Tips

1. **Use context managers:** Automatic duration calculation
2. **Batch checkpoints:** Log multiple together when possible
3. **Limit metadata:** Keep under 1KB per checkpoint
4. **Enable auto-archive:** Prevent unbounded growth
5. **Non-blocking:** All logging is fire-and-forget (<1ms overhead)

---

## Testing

\`\`\`bash
cd .claude/orchestration
python test_agent_tracking.py

# Expected: 3/3 tests pass, 137+ events logged
\`\`\`

---

## Configuration

Edit: `.claude/orchestration/config.json`

\`\`\`json
{
  "activity_logging": {
    "enabled": true,
    "obsidian_vault": "C:\\Users\\MarkusAhling\\obsidian",
    "retention_days": 30,
    "auto_archive": true
  }
}
\`\`\`

---

## Example: Full Agent Lifecycle

\`\`\`python
from orchestration.agent_activity_logger import track_agent, update_agent_phase, log_checkpoint

with track_agent('backend-dev', 'api-auth') as agent_id:
    # Phase 1: Explore
    update_agent_phase(agent_id, 'explore', 'Analyzing auth requirements')

    # Phase 2: Plan
    log_checkpoint(agent_id, 'planning', {'endpoints': 3})
    update_agent_phase(agent_id, 'plan', 'Designing API structure')

    # Phase 3: Code
    log_checkpoint(agent_id, 'post-plan', {'estimated_duration': 45})
    update_agent_phase(agent_id, 'code', 'Implementing endpoints', files_modified=8)

    # Phase 4: Test
    update_agent_phase(agent_id, 'test', 'Running integration tests')
    log_checkpoint(agent_id, 'quality-check', {
        'tests_run': 15,
        'tests_passed': 15,
        'coverage': '94%'
    })

    # Phase 6: Document
    update_agent_phase(agent_id, 'document', 'Writing API docs')

    # Auto-logs commit checkpoint and completion
\`\`\`

**Result:**
- ✅ 5 checkpoints logged
- ✅ Duration auto-calculated
- ✅ Status: completed
- ✅ Files modified: 8
- ✅ Tests tracked: 15/15 passed

---

## Dataview Queries (Obsidian)

### Show Active Agents
\`\`\`dataview
TABLE agent_type, phase, current_action, files_modified
FROM "System/Agents/Activity-Log"
WHERE status = "in_progress"
SORT start_time DESC
\`\`\`

### Performance Analysis
\`\`\`dataview
TABLE agent_type, AVG(duration) AS "Avg Duration", COUNT(agent_id) AS "Tasks"
FROM "System/Agents/Activity-Log"
WHERE status = "completed"
GROUP BY agent_type
SORT "Avg Duration" DESC
\`\`\`

### Error Tracking
\`\`\`dataview
TABLE agent_type, task_id, errors, warnings, current_action
FROM "System/Agents/Activity-Log"
WHERE errors > 0 OR warnings > 0
SORT start_time DESC
\`\`\`

---

## Integration with Orchestrator

Activity logging is **automatically enabled** in `orchestrator.py`. No manual calls needed.

\`\`\`python
# orchestrator.py automatically wraps agents with track_agent()
orchestrator.execute_agent('coder', 'task-123')
# ✅ Agent automatically logged with all checkpoints
\`\`\`

---

## See Also

- **Full Documentation:** [[AGENT_ACTIVITY_TRACKING.md]]
- **Obsidian README:** [[C:\Users\MarkusAhling\obsidian\System\Agents\README.md]]
- **Orchestration Protocol:** [[.claude/orchestration/PROTOCOL.md]]

---

**Quick Help:** For issues, check fallback JSON first: `.claude/orchestration/db/agent-activity.json`
**Performance:** <1ms overhead per log call, 50+ events/second throughput
**Storage:** ~240 bytes per event, 30-day retention (auto-archived)
