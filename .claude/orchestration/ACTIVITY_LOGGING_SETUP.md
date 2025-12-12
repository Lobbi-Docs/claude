# Agent Activity Logging - Setup and Automation

## Overview

Automated agent activity tracking integrated with Obsidian vault for centralized documentation.

## Components

### 1. Configuration (config.json)

\`\`\`json
{
  "activity_logging": {
    "enabled": true,
    "obsidian_vault": "C:\\Users\\MarkusAhling\\obsidian",
    "activity_log_path": "System/Agents/Activity-Log.md",
    "fallback_json": ".claude/orchestration/db/agent-activity.json",
    "checkpoints": ["start", "planning", "post-plan", "quality-check", "commit"],
    "retention_days": 30,
    "archive_path": "System/Agents/Archive/",
    "auto_archive": true,
    "daily_summary": true,
    "summary_path": "System/Agents/Daily-Summary.md",
    "error_threshold": 3,
    "alert_on_threshold": true
  }
}
\`\`\`

### 2. Orchestration Hooks (orchestration-hooks.sh)

New hooks added for agent activity tracking:

- `agent-start <type> <task_id> [parent]` - Log agent start
- `agent-phase <id> <phase> <action>` - Log phase transitions
- `agent-checkpoint <id> <checkpoint>` - Log checkpoints
- `agent-complete <id> <status> [errors] [warnings]` - Log completion
- `daily-summary` - Generate daily summary
- `log-rotation` - Archive old logs

### 3. Log Rotation Script (log-rotation.py)

Features:
- Archives entries older than `retention_days` (30 days)
- Moves archived entries to `System/Agents/Archive/YYYY-MM-archive.md`
- Generates daily summary reports with metrics
- Alerts when error rate exceeds threshold

Usage:
\`\`\`bash
# Archive old entries
python3 .claude/orchestration/log-rotation.py rotate

# Generate daily summary
python3 .claude/orchestration/log-rotation.py generate_summary
\`\`\`

### 4. Activity Sync Script (activity-sync.sh)

Features:
- Syncs fallback JSON logs to Obsidian when MCP available
- Clears fallback JSON after successful sync
- Gracefully handles missing MCP

Usage:
\`\`\`bash
bash .claude/orchestration/activity-sync.sh
\`\`\`

## Automation Setup

### Windows Task Scheduler

Since cron is not available on Windows, use Task Scheduler:

#### Daily Summary (Midnight)

1. Open Task Scheduler
2. Create Basic Task: "Agent Activity Daily Summary"
3. Trigger: Daily at 00:00
4. Action: Start a program
   - Program: `python3`
   - Arguments: `.claude/orchestration/log-rotation.py generate_summary`
   - Start in: `C:\Users\MarkusAhling\dev\new-alpa-1.4\Alpha-1.4`

#### Daily Sync (12:01 AM)

1. Create Basic Task: "Agent Activity Sync"
2. Trigger: Daily at 00:01
3. Action: Start a program
   - Program: `bash`
   - Arguments: `.claude/orchestration/activity-sync.sh`
   - Start in: `C:\Users\MarkusAhling\dev\new-alpa-1.4\Alpha-1.4`

#### Weekly Rotation (Sunday 2:00 AM)

1. Create Basic Task: "Agent Activity Log Rotation"
2. Trigger: Weekly, Sunday at 02:00
3. Action: Start a program
   - Program: `python3`
   - Arguments: `.claude/orchestration/log-rotation.py rotate`
   - Start in: `C:\Users\MarkusAhling\dev\new-alpa-1.4\Alpha-1.4`

### Linux/macOS Cron Jobs

Add to crontab (`crontab -e`):

\`\`\`bash
# Daily summary at midnight
0 0 * * * cd /path/to/project && python3 .claude/orchestration/log-rotation.py generate_summary

# Daily sync at 12:01 AM
1 0 * * * cd /path/to/project && bash .claude/orchestration/activity-sync.sh

# Weekly rotation (Sundays at 2 AM)
0 2 * * 0 cd /path/to/project && python3 .claude/orchestration/log-rotation.py rotate
\`\`\`

## Hook Integration

### From Python (agent_activity_logger.py)

\`\`\`python
from agent_activity_logger import AgentActivityLogger

logger = AgentActivityLogger()

# Log agent start
logger.log_activity(
    agent_type="coder",
    task_id="3.5",
    parent_task="3.0",
    action="started"
)

# Log checkpoint
logger.log_checkpoint(
    agent_id="agent-123",
    checkpoint="post-plan"
)

# Log completion
logger.log_completion(
    agent_id="agent-123",
    status="completed",
    errors=0,
    warnings=2
)
\`\`\`

### From Bash (orchestration-hooks.sh)

\`\`\`bash
# Call hooks directly
source .claude/hooks/orchestration-hooks.sh

# Agent start
.claude/hooks/orchestration-hooks.sh agent-start "coder" "3.5" "3.0"

# Phase transition
.claude/hooks/orchestration-hooks.sh agent-phase "agent-123" "code" "implementing"

# Checkpoint
.claude/hooks/orchestration-hooks.sh agent-checkpoint "agent-123" "post-plan"

# Completion
.claude/hooks/orchestration-hooks.sh agent-complete "agent-123" "completed" "0" "2"
\`\`\`

## Obsidian Vault Structure

\`\`\`
C:\Users\MarkusAhling\obsidian\
├── System/
│   └── Agents/
│       ├── Activity-Log.md          # Main activity log (last 30 days)
│       ├── Daily-Summary.md         # Daily metrics and insights
│       └── Archive/
│           ├── 2025-01-archive.md   # January 2025 archive
│           ├── 2025-02-archive.md   # February 2025 archive
│           └── ...
\`\`\`

## Daily Summary Format

\`\`\`markdown
---
title: Daily Agent Activity Summary
date: 2025-01-29
type: summary
---

# Agent Activity Summary - January 29, 2025

## Overview

- **Total Tasks:** 15
- **Completed:** 12
- **Failed:** 1
- **In Progress:** 2
- **Total Errors:** 3

## Agent Distribution

| Agent Type | Count |
|------------|-------|
| coder | 5 |
| tester | 4 |
| reviewer | 3 |
| debugger | 2 |
| docs-writer | 1 |

## Error Rate

- **Error Rate:** 2.0%
\`\`\`

## Metrics Tracked

- **Total Tasks:** Number of agents activated
- **Completed:** Successfully finished tasks
- **Failed:** Tasks that encountered errors
- **In Progress:** Currently active tasks
- **Total Errors:** Sum of all errors across tasks
- **Error Rate:** Percentage of tasks with errors
- **Agent Distribution:** Count by agent type

## Alert Thresholds

- **Error Threshold:** 3% (configurable in config.json)
- **When Exceeded:** Alert added to daily summary
- **Action:** Review agent activity log for patterns

## Testing

### Test Log Rotation

\`\`\`bash
# Generate test data (optional)
# Add some entries to Activity-Log.md with old dates

# Run rotation
python3 .claude/orchestration/log-rotation.py rotate

# Check results
# - Entries older than 30 days moved to Archive/
# - Current entries remain in Activity-Log.md
\`\`\`

### Test Daily Summary

\`\`\`bash
# Run summary generation
python3 .claude/orchestration/log-rotation.py generate_summary

# Check results
# - Daily-Summary.md created/updated
# - Metrics calculated for today's entries
\`\`\`

### Test Sync

\`\`\`bash
# Run sync (requires MCP setup)
bash .claude/orchestration/activity-sync.sh

# Check results
# - Fallback JSON entries synced to Obsidian
# - agent-activity.json cleared
\`\`\`

## Troubleshooting

### Log Rotation Not Working

1. Check file exists: `Activity-Log.md`
2. Verify config path in script
3. Check date parsing in entries
4. Ensure write permissions to Archive/

### Daily Summary Empty

1. Verify entries exist for today
2. Check date format in Activity-Log.md
3. Ensure `daily_summary: true` in config
4. Check write permissions

### Sync Failing

1. Verify tsx is installed: `tsx --version`
2. Check MCP client exists: `obsidian-mcp-client.ts`
3. Verify fallback JSON exists and has entries
4. Check Obsidian vault path in config

## Integration with Orchestration

The activity logging system integrates seamlessly with:

- **Phase Tracking:** Logs phase transitions
- **Checkpoints:** Records checkpoint creation
- **Error Handling:** Tracks errors and warnings
- **Task Completion:** Logs final status and metrics

All hooks are called automatically by the orchestration system when enabled in config.json.
