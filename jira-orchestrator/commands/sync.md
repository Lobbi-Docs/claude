---
name: jira:sync
description: Synchronize local progress with Jira - pull latest issue details, post progress updates, and handle bi-directional sync with conflict resolution
argument-hint: "[ISSUE-KEY]"
argument-help: "Optional Jira issue key (e.g., PROJ-123). If omitted, syncs all active issues"
allowed-tools: ["Read", "Write", "Bash", "Glob"]
category: "jira"
aliases: ["jira-sync"]
---

# Jira Sync Command

Synchronize local development progress with Jira issues. This command implements bi-directional sync to keep local state and Jira in harmony.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:sync - {duration}`

### Issue Key Detection Priority
1. Command argument (e.g., `${issue_key}`)
2. Git branch name (e.g., `feature/PROJ-123-desc`)
3. Environment variable `JIRA_ISSUE_KEY`
4. Current orchestration session

### Configuration
Time logging can be configured in `jira-orchestrator/config/time-logging.yml`:
- `enabled`: Toggle auto-logging (default: true)
- `threshold_seconds`: Minimum duration to log (default: 60)
- `format`: Worklog comment format (default: "[Claude] {command} - {duration}")

---

## Purpose

When working on Jira issues in local repository branches:
- **Pull** latest issue details from Jira (detect requirement/priority changes)
- **Push** local progress as comments and status updates to Jira
- **Sync** linked pull requests and branch references
- **Detect** and resolve conflicts gracefully
- **Log** all sync operations with timestamps for audit trail

## Execution Strategy

### Phase 1: Pre-Sync Validation

1. Verify Jira API credentials are configured
2. Parse the optional ISSUE-KEY argument
3. Build list of issues to sync:
   - If ISSUE-KEY provided: sync only that issue
   - If omitted: find all "active" issues (In Progress, To Do with assigned branches)

### Phase 2: Local State Detection

For each issue being synced:

1. Find corresponding branch in local repository
   - Search for branches matching pattern: `{jira-issue-key}-*` or `feature/{jira-issue-key}-*`
   - Use: `git branch -a | grep -i {issue-key}`

2. Gather local progress metrics:
   - Current git branch and commit hash
   - Uncommitted changes (staged and unstaged)
   - Local commits ahead of main
   - Linked PR status (if exists)
   - Last local update timestamp

3. Read local sync state file (if exists):
   - Path: `.claude/.jira-sync-state.json`
   - Contains: last sync timestamp, previous issue status, previous phase
   - Use to detect what has changed since last sync

### Phase 3: Remote Sync - Pull from Jira

For each issue:

1. **Fetch Latest Issue Details**
   - GET `/rest/api/3/issues/{issueKey}`
   - Extract:
     - Current status/state
     - Description and acceptance criteria
     - Priority, labels, components
     - Assignee and watchers
     - Sprint information
     - Due date changes
     - Recent activity timeline

2. **Check for Remote Changes**
   - Compare with cached issue state
   - Detect:
     - Description updates (requirements changed?)
     - Status changes (moved out of assigned phase?)
     - Priority changes (urgency increased?)
     - New comments from team members
     - Assignment changes
   - Flag significant changes to Claude for review

3. **Retrieve Linked Issues**
   - Get all linked issues (blocks, relates to, duplicates)
   - Update local tracking of dependencies

### Phase 4: Conflict Detection

Before pushing local changes, detect conflicts:

1. **Status Conflicts**
   - Local branch activity suggests Phase X
   - Jira issue is in different status/phase
   - Example: Local code changes exist but Jira shows "To Do"
   - Resolution: Ask Claude which is source of truth

2. **Change Conflicts**
   - Remote issue updated since last local sync
   - Local changes not yet synced
   - Example: Description changed remotely, have local commits
   - Resolution: Display both versions, suggest merge approach

3. **Branch Conflicts**
   - Local branch behind main (merge needed)
   - Linked PR has conflicts
   - Remote branch deleted (orphaned branch)
   - Resolution: Suggest rebase or cleanup

### Phase 5: Push to Jira - Update Issue

1. **Post Progress Comment**
   - Generate update comment with:
     ```
     Progress Update [TIMESTAMP]
     Branch: {branch-name}
     Commits: {count} new commits since last sync
     Status: {current-phase} (Exploring/Planning/Coding/Testing/Fixing/Documenting)

     Changes since last update:
     - {summarize significant local changes}

     Current PR Status: {linked-pr-status}
     ```
   - POST to `/rest/api/3/issues/{issueKey}/comments`

2. **Update Issue Status (if phase changed)**
   - Detect phase transition from local state:
     - Exploring → In Progress
     - Coding/Testing → In Progress (if moved from To Do)
     - Documenting/Done → In Review
   - PUT `/rest/api/3/issues/{issueKey}` with `transition` field
   - Only auto-transition if phase change is clear
   - Ask Claude if ambiguous

3. **Sync PR Information**
   - If PR found linked to issue:
     - Update issue's "Pull Request" field with PR URL
     - Add PR status as label (draft, open, review, merged)
   - If multiple PRs, list all in comment

4. **Update Custom Fields**
   - If plugin uses custom fields:
     - `Next Sync`: current timestamp
     - `Local Branch`: branch name
     - `Last Activity`: latest commit timestamp
     - `Sync Status`: "success" or error message

### Phase 6: Bi-Directional Merge

Merge remote + local state:

1. **If Remote Has Significant Updates**
   - Display summary of changes to Claude
   - Update local documentation/comments if descriptions changed
   - Flag updated acceptance criteria
   - Suggest Claude review requirements before continuing

2. **Update Local Sync State File**
   - Path: `.claude/.jira-sync-state.json`
   - Structure:
     ```json
     {
       "lastSyncTimestamp": "2025-12-17T14:30:00Z",
       "issues": {
         "PROJ-123": {
           "status": "In Progress",
           "phase": "Coding",
           "remoteSummary": "Issue updated 2 hours ago",
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
   - Write to `.claude/.jira-sync-state.json`

### Phase 7: Conflict Resolution & Reporting

1. **Report Any Detected Conflicts**
   - List conflict type, affected issue, recommendation
   - Example format:
     ```
     CONFLICT: Status Mismatch on PROJ-123
     - Jira Status: To Do
     - Local Phase: Coding (5 new commits)
     - Recommendation: Update Jira status to "In Progress" OR confirm local state is stale
     ```

2. **Provide Resolution Suggestions**
   - For each conflict, suggest Claude's options
   - Include: "Accept remote", "Keep local", "Manual merge", "Rebase"

3. **Create Sync Report**
   - Log detailed sync report to: `.claude/.jira-sync-report.log`
   - Include timestamp, issues synced, conflicts found, actions taken
   - Append to existing log (don't overwrite)

### Phase 8: Completion & Logging

1. **Summary Output**
   - Issues synced: count
   - New issues discovered: count
   - Conflicts detected: count
   - Status transitions: list
   - PR syncs: count
   - Timestamp: sync completion time

2. **Update Sync Timestamp**
   - Store in `.claude/.jira-sync-state.json`
   - Use for next sync to detect "what changed"

3. **Error Handling**
   - If Jira API fails: save local state, ask Claude to retry
   - If branch not found: warn about orphaned issue
   - If PR broken: report but don't fail sync
   - Log all errors to `.claude/.jira-sync-report.log`

## Implementation Details

### Environment Requirements

Expects these to be configured:
- `JIRA_HOST`: Jira instance URL (e.g., `https://company.atlassian.net`)
- `JIRA_EMAIL`: Jira API user email
- `JIRA_API_TOKEN`: Jira API token (store in `.env` or use secure vault)
- `GITHUB_TOKEN`: For PR sync (optional, if using GitHub)

### Local State Files

Creates/updates these files for tracking:

1. `.claude/.jira-sync-state.json` - Sync state snapshot
2. `.claude/.jira-sync-report.log` - Detailed audit log
3. `.claude/.jira-conflicts.json` - Active conflicts needing resolution

### Search Strategy for Issues

If no ISSUE-KEY provided, discover active issues:

```bash
# Find branches that look like Jira issues
git branch -a | grep -E '^[A-Z]+-[0-9]+'

# Or search issue tracking file if exists
ls -la .claude/.jira-sync-state.json

# Or ask Jira for user's assigned issues
GET /rest/api/3/search?jql=assignee=currentUser() AND status!="Done"
```

### Git Integration

Before pushing/pulling:

```bash
# Ensure branches are up to date
git fetch origin

# Check for local changes not yet committed
git status

# Get commit count ahead
git rev-list --count main..HEAD
```

## Execution Flow (for Claude)

When Claude runs this command:

1. **Ask clarification** if ISSUE-KEY is ambiguous
2. **Execute all phases** in sequence (cannot skip)
3. **Handle errors gracefully** - don't fail on one issue, continue others
4. **Report conflicts clearly** - list each one with options
5. **Ask permission** before auto-transitioning issues
6. **Save state** even if partially successful

## Example Scenarios

### Scenario 1: Sync Single Issue (provided)

```
User: /jira:sync PROJ-123
Claude:
  1. Find local branch PROJ-123-feature-name
  2. Pull latest from Jira (detect if requirements changed)
  3. Post comment: "5 commits pushed, now in Coding phase"
  4. Update Jira status to "In Progress"
  5. Sync linked PR #456
  6. Save sync state
  7. Report: "✓ Synced PROJ-123, no conflicts"
```

### Scenario 2: Sync All Active Issues (no argument)

```
User: /jira:sync
Claude:
  1. Query Jira for assigned "active" issues
  2. Find: PROJ-123, PROJ-125 (both In Progress)
  3. Sync each:
     - PROJ-123: 5 commits, Coding phase
     - PROJ-125: 2 commits, Testing phase
  4. Detect conflict on PROJ-123:
     - Remote requirement changed
     - Ask: "Review new requirements before continuing?"
  5. Report all syncs with conflicts flagged
```

### Scenario 3: Detect Conflict

```
Claude:
  Found Status Mismatch on PROJ-456:
  - Jira Status: To Do
  - Local Phase: Coding (3 new commits)
  - Options:
    A. Update Jira to "In Progress" (recommended)
    B. Keep Jira as "To Do" (mark local as stale)
    C. Manual review needed
  Which would you like?
```

## Notes for Implementation

- Always check `.claude/.jira-sync-state.json` first to understand last sync state
- Use timestamps to detect "what changed" since last sync
- Never lose local work - conflicts should suggest merge strategies, not overwrites
- If PR sync fails (API error), still complete issue sync
- Log everything to audit trail for debugging
- Support dry-run mode: show what would sync without making changes
- Cache Jira responses briefly to avoid rate limiting on quick retries

---

**Category:** jira | **Tags:** sync, orchestration, bi-directional, automation
