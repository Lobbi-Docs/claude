---
name: jira:status
description: Monitor active Jira orchestration sessions and track sub-agent progress across all phases
argument-hint: "[ISSUE-KEY] [--format=dashboard] [--depth=detailed]"
---

# /jira:status

**Quick Usage:** `/jira:status [ISSUE-KEY] --format=dashboard --depth=detailed`

Monitor active Jira orchestration sessions and track sub-agent progress across EXPLORE, PLAN, CODE, TEST, FIX, and COMMIT phases.

## Core Parameters

| Parameter | Type | Purpose | Example |
|-----------|------|---------|---------|
| ISSUE-KEY | string | Issue to track (optional) | `GA-123`, `PLAT-456` |
| --format | select | Output format | `dashboard`, `table`, `json` |
| --depth | select | Detail level | `summary`, `detailed`, `comprehensive` |
| --filter | string | Filter sessions | `phase:CODE`, `status:active`, `blocker:true` |
| --follow | boolean | Real-time updates | `true`, `false` |

## Quick Examples

```bash
# Status of specific issue orchestration
/jira:status GA-123 --format=dashboard

# All active orchestration sessions
/jira:status --filter=status:active

# Deep dive into session with blockers
/jira:status GA-456 --depth=comprehensive

# Real-time follow of current session
/jira:status --follow=true
```

## What It Displays

### Dashboard Overview

```
╔════════════════════════════════════════════════════════╗
║     JIRA ORCHESTRATION STATUS                          ║
║     Updated: 2025-12-17 14:32:45 UTC                   ║
╠════════════════════════════════════════════════════════╣
║  Active Sessions: 3 | Total Issues: 7                   ║
╠════════════════════════════════════════════════════════╣
║  GA-123: Feature Enhancement                           ║
║  ├─ Phase: CODE [████████░░░░░░░░░░░░░] 40%           ║
║  ├─ Time Elapsed: 2h 15m                              ║
║  ├─ Active Sub-Agents: 3 (frontend-dev, backend-dev)   ║
║  └─ Blockers: 1 (Waiting for API spec)                 ║
║                                                        ║
║  PLAT-456: Bug Fix                                     ║
║  ├─ Phase: TEST [██████████████████░░] 85%            ║
║  ├─ Time Elapsed: 1h 32m                              ║
║  ├─ Active Sub-Agents: 2 (qa-tester, test-engineer)   ║
║  └─ Blockers: None                                     ║
║                                                        ║
║  INF-789: Infrastructure Setup                        ║
║  ├─ Phase: PLAN [████████░░░░░░░░░░░░] 35%            ║
║  ├─ Time Elapsed: 45m                                 ║
║  ├─ Active Sub-Agents: 2 (devops-architect)           ║
║  └─ Blockers: 1 (Approval pending from security)      ║
╚════════════════════════════════════════════════════════╝
```

### Detailed Issue View

For a specific ISSUE-KEY, display:

**Current Phase Metrics:**
- Phase name (EXPLORE | PLAN | CODE | TEST | FIX | COMMIT)
- Progress percentage (visual progress bar)
- Elapsed time in phase
- Estimated time to completion

**Active Sub-Agents:**
- Agent callsign and role
- Current task being executed
- Task completion percentage
- Time in current task
- Status (working, waiting, complete)

**Recent Activity Log:**
- Last 5-10 activities with timestamps
- Agent who performed action
- Summary of action taken
- Any state changes or milestones reached

**Blockers & Issues:**
- Current blockers (if any)
- Severity level (critical, high, medium, low)
- Time blocked
- Required action or dependency

**Session Statistics:**
- Total agents deployed
- Completed tasks
- Failed tasks (if any)
- Retry attempts
- Cost/token usage (if tracked)

## Output Formats

### Dashboard Format (default)
Compact summary view showing all active sessions with key metrics.

### Table Format
Structured table with one row per session:
| Issue | Phase | Progress | Blockers | Time | Status |
|-------|-------|----------|----------|------|--------|

### JSON Format
Machine-readable output with full session state:
```json
{
  "issue_key": "GA-123",
  "current_phase": "CODE",
  "progress_percentage": 40,
  "elapsed_seconds": 8100,
  "active_agents": ["frontend-dev", "backend-dev", "code-reviewer"],
  "blockers": [{"type": "dependency", "description": "Waiting for API spec", "severity": "high"}],
  "recent_activities": [...]
}
```

## Detail Levels

**Summary:** Single-line status per issue, key metrics only

**Detailed:** Full phase progression, active agents, recent activities (default)

**Comprehensive:** Everything plus full activity log, performance metrics, resource usage, retry history

## Filter Examples

```bash
# Only active sessions
--filter=status:active

# Sessions in CODE phase
--filter=phase:CODE

# Issues with blockers
--filter=blocker:true

# Sessions running longer than 2 hours
--filter=age:>2h

# Combine filters
--filter=status:active,phase:CODE,blocker:true
```

## Instructions for Claude

When executing this command:

1. **Gather Session State**
   - Read orchestration session logs from `.claude/sessions/` directory
   - Check active issue tracking in Jira API (if available)
   - Identify all currently active orchestration sessions

2. **Build Session Metrics**
   - Calculate current phase for each session
   - Compute progress percentage based on completed vs total tasks
   - Track elapsed time for session and per-phase
   - Identify active sub-agents by parsing session metadata

3. **Extract Activity History**
   - Read recent activity logs from session files
   - Parse timestamps and agent actions
   - Identify milestones and phase transitions
   - Note any errors or retries

4. **Detect Blockers**
   - Check for incomplete dependencies
   - Identify waiting states (pending approval, external service)
   - Extract blocker descriptions from session logs
   - Assess blocker severity and impact

5. **Format Output**
   - Use selected format (dashboard/table/json)
   - Apply depth filtering based on --depth parameter
   - Apply issue/status filters if specified
   - Add visual indicators (✓ complete, ⧗ waiting, ✗ blocked, ⚙ in-progress)

6. **Provide Recommendations** (if comprehensive)
   - Identify long-running sessions for potential intervention
   - Suggest priority adjustments based on blockers
   - Note agents that may need relief or support
   - Flag sessions at risk of timeout

## Data Sources

- **Session Metadata:** `.claude/sessions/{issue-key}/metadata.json`
- **Activity Logs:** `.claude/sessions/{issue-key}/activity.log`
- **Phase Progress:** `.claude/sessions/{issue-key}/phases/{phase-name}/status.json`
- **Agent Status:** `.claude/sessions/{issue-key}/agents/{agent-id}/state.json`
- **Jira Integration:** REST API queries (if configured)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | No | Jira instance URL (for real-time status) |
| `JIRA_API_TOKEN` | No | API token for Jira queries |
| `SESSIONS_DIR` | No | Custom sessions directory path |
| `ORCHESTRATION_TIMEOUT` | No | Session timeout threshold (default: 6h) |

## Related Commands

- `/jira:create` - Create new Jira issue for orchestration
- `/jira:transition` - Move issue through workflow
- `/orchestrate-complex` - Start new orchestration session
- `/context` - Check context/token usage
- `/project-status` - Overall project health

## References

- **Orchestration Protocol:** `.claude/CLAUDE.md` (Section: Mandatory Protocol)
- **Session Architecture:** `.claude/docs/orchestration-session-format.md`
- **Agent Categories:** `[[System/Claude-Instructions/Agent-Categories]]`
- **Status Metrics Guide:** `[[System/Claude-Instructions/Metrics-Guide]]`
