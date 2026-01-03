---
name: jira:sync
description: Bi-directional sync - pull Jira details, push local progress, detect & resolve conflicts
argument-hint: "[ISSUE-KEY]"
argument-help: "Optional (e.g., PROJ-123). Omit to sync all active issues"
allowed-tools: ["Read", "Write", "Bash", "Glob"]
category: "jira"
aliases: ["jira-sync"]
---

# Jira Sync Command

Synchronize local development progress with Jira: pull changes, push updates, resolve conflicts, log time.

## Purpose

- **Pull:** Latest issue details from Jira (detect requirement/priority changes)
- **Push:** Local progress as comments, status updates
- **Sync:** Linked PRs and branch references
- **Detect & Resolve:** Status, change, and branch conflicts
- **Log:** All sync operations with timestamps

## Core Workflow

| Phase | Action |
|-------|--------|
| 1. Validate | Verify API credentials, parse ISSUE-KEY, build sync list |
| 2. Local State | Find branch, gather metrics (commits, changes, PR status, sync timestamp) |
| 3. Pull from Jira | Fetch issue details, detect remote changes (description, status, priority, comments) |
| 4. Detect Conflicts | Status mismatches, change conflicts, branch conflicts |
| 5. Push to Jira | Post progress comment, update status/PR info, set custom fields |
| 6. Bi-Directional Merge | Merge remote+local state, update `.jira-sync-state.json` |
| 7. Report Conflicts | List conflicts with resolution options |
| 8. Complete | Summary output, update sync timestamp, error handling |

## Issue Detection Priority

1. Command argument (e.g., `PROJ-123`)
2. Git branch name (e.g., `feature/PROJ-123-desc`)
3. Environment variable `JIRA_ISSUE_KEY`
4. Query Jira for assigned active issues

## Conflict Types

**Status Conflict:** Jira status != local phase (Code exists, but Jira shows "To Do")

**Change Conflict:** Remote updated + local changes pending (Description changed remotely, have local commits)

**Branch Conflict:** Local behind main, PR has conflicts, remote branch deleted

## Progress Comment Template

```
Progress Update [TIMESTAMP]
Branch: {branch-name}
Commits: {count} new since last sync
Phase: {Exploring|Planning|Coding|Testing|Fixing|Documenting}

Changes:
- {summarize significant local changes}

PR Status: {linked-pr-status}
```

## State File: `.claude/.jira-sync-state.json`

```json
{
  "lastSyncTimestamp": "2025-12-17T14:30:00Z",
  "issues": {
    "PROJ-123": {
      "status": "In Progress",
      "phase": "Coding",
      "localBranch": "PROJ-123-feature-name",
      "lastLocalChange": "2025-12-17T14:15:00Z",
      "linkedPRs": ["#456"],
      "lastSyncHash": "abc123def456"
    }
  },
  "conflicts": [],
  "summary": "Synced 1 issue successfully"
}
```

## Auto Status Transitions

- Exploring → In Progress (when code added)
- Coding/Testing → In Progress (if from To Do)
- Documenting/Done → In Review
- Ask Claude if ambiguous

## Time Tracking (Auto)

If duration >= 60s AND issue key detected:
- Auto-posts worklog: `[Claude] /jira:sync - {duration}`
- Configure in `jira-orchestrator/config/time-logging.yml`

## Environment & Configuration

**Required:**
- `JIRA_HOST`: `https://company.atlassian.net`
- `JIRA_EMAIL`: API user email
- `JIRA_API_TOKEN`: API token (store in `.env`)
- `GITHUB_TOKEN`: Optional (for PR sync)

**Output Files:**
- `.claude/.jira-sync-state.json` - Sync state snapshot
- `.claude/.jira-sync-report.log` - Audit log
- `.claude/.jira-conflicts.json` - Active conflicts

## Usage

```bash
/jira:sync PROJ-123              # Single issue
/jira:sync                       # All active issues
/jira:sync PROJ-123 --dry-run    # Preview only
```

## Execution Rules

- Execute all phases sequentially
- Handle errors gracefully (don't stop on first failure)
- Ask permission before auto-transitioning
- Never lose local work (suggest merge strategies)
- Log everything for debugging
- Support dry-run mode
- Cache responses to avoid rate limiting

## Example Scenarios

**Scenario 1:** Single issue sync
- Find local branch → Pull latest from Jira → Post progress comment → Update status → Sync PR → Save state → Report

**Scenario 2:** All active issues
- Query Jira for assigned active → Sync each → Flag conflicts → Report all

**Scenario 3:** Detect conflict
- Status Mismatch on PROJ-456: Jira="To Do" vs Local="Coding (3 commits)"
- Options: Update to "In Progress" | Keep as "To Do" | Manual review

**⚓ Golden Armada** | *The Fleet Stands Ready*
