---
name: jira:process-worklogs
description: Process pending worklogs and post them to Jira
arguments: []
---

# Process Pending Worklogs

This command processes any queued worklog entries and posts them to Jira.

## Overview

When Claude commands execute, execution time is tracked and queued to files in `.claude/orchestration/db/pending_worklogs/`. This command reads those files and posts them to Jira using the MCP API.

## Step 1: Find Pending Worklogs

```python
# Find all pending worklog files
pending_dir = Path(".claude/orchestration/db/pending_worklogs")
pending_files = list(pending_dir.glob("*.json"))

if not pending_files:
    print("No pending worklogs to process")
    return

print(f"Found {len(pending_files)} pending worklogs")
```

## Step 2: Process Each Worklog

For each pending worklog file:

### 2.1 Read Worklog Data
```json
{
  "issue_key": "PROJ-123",
  "time_spent_seconds": 323,
  "comment": "[Claude] /jira:work - 5m 23s",
  "adjust_estimate": "auto",
  "started": "2025-12-22T10:30:00.000Z",
  "source": "agent_activity_logger"
}
```

### 2.2 Post to Jira

Use MCP tool to add worklog:
```
mcp__atlassian__addWorklogToJiraIssue(
  issueIdOrKey: "{issue_key}",
  timeSpentSeconds: {time_spent_seconds},
  comment: "{comment}",
  started: "{started}"
)
```

### 2.3 Move to Processed

On success:
- Move file to `pending_worklogs/processed/`
- Log success message

On failure:
- Increment retry count
- If max retries reached, move to `pending_worklogs/failed/`

## Step 3: Report Results

```yaml
worklog_processing_results:
  total_pending: 5
  successfully_posted: 4
  failed: 1

  posted:
    - issue: PROJ-123
      time: "5m 23s"
      comment: "[Claude] /jira:work - 5m 23s"
    - issue: PROJ-124
      time: "2m 15s"
      comment: "[Claude] /jira:commit - 2m 15s"

  failed:
    - issue: PROJ-125
      error: "Issue not found"
```

## Usage

Run manually when you want to post queued worklogs:
```
/jira:process-worklogs
```

Or it will be triggered automatically at session end.

## MCP Tool Reference

The worklog is posted using:
- **Tool**: `mcp__atlassian__addWorklogToJiraIssue`
- **Parameters**:
  - `issueIdOrKey`: Jira issue key (e.g., "PROJ-123")
  - `timeSpentSeconds`: Time in seconds (integer)
  - `comment`: Worklog comment (includes [Claude] prefix)
  - `started`: ISO 8601 timestamp (optional)
