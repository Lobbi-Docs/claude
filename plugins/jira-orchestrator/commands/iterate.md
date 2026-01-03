---
name: jira:iterate
description: Fix review feedback, update PR, and trigger re-review automatically
arguments:
  - name: issue_key
    description: Jira issue key (PROJ-123)
    required: true
  - name: pr
    description: PR number (auto-detected)
    required: false
  - name: auto_review
    description: Trigger council review after fixes
    default: true
  - name: max_iterations
    description: Max fix attempts before escalation
    default: 3
version: 1.0.0
---

# Iterate Command - Fix, Update, Re-Review

**Issue:** ${issue_key} | **PR:** ${pr} | **Auto-Review:** ${auto_review} | **Max Iterations:** ${max_iterations}

## Purpose
Gather review feedback, categorize issues, fix automatically, update PR, and re-review.

## Workflow

### 1. Gather & Categorize Feedback
- Detect PR (explicit arg → git branch → Jira link)
- Fetch comments from Harness/GitHub
- Categorize: critical (fix now), warning (fix), suggestion (if time), question, resolved, praise
- Build fix plan with strategies

### 2. Plan Fixes
- Group by file/domain
- Order by dependency (security → structural → quality)
- Enforce coding standards per language
- Select agents (security-specialist: sonnet | code-reviewer: haiku)

### 3. Implement Fixes
For each fix:
- Read file, understand issue
- Apply fix via appropriate agent
- Run affected tests
- Reply to original comment with status
- Handle failures (retry 2x, escalate if complex)

### 4. Update PR
- Stage changes: `git add -A`
- Commit: `fix(${issue_key}): address review feedback`
- Push: `git push origin ${branch}`
- Update PR description with iteration summary

### 5. Re-Review (if auto_review=true)
- Spawn focused council (code-reviewer + security/test specialists)
- Verify each fix addresses original concern
- No new issues introduced?
- Submit: approved | reviewed | changereq

### 6. Sync & Report
- Update Jira with iteration results
- Resolve comment threads
- Output summary (critical/warning/suggestion counts, review decision)

## Escalation
After ${max_iterations}:
- Same comment unfixed 2x → escalate
- Critical count not decreasing → escalate
- Test failures persisting → escalate
- Iteration > 30 min → escalate

## Error Handling
| Error | Action |
|-------|--------|
| PR not found | Clear message + detection help |
| No comments | Success, nothing to fix |
| Rate limit | Retry with backoff |
| Merge conflict | Abort, user resolves |
| Test failures | Rollback, try alternative |

## Config (`.jira/iterate-config.yaml`)
```yaml
iterate:
  max_iterations: 3
  auto_review: true
  fix_priorities: {critical: always, warning: always, suggestion: if_time_permits}
  reply_to_comments: true
  escalation: {notify_slack: true, channel: "#dev-alerts"}
```

## Related
- `/jira:ship` - Initial shipping with council
- `/jira:council` - Standalone review
- `/jira:review` - Manual code review

**⚓ Golden Armada** | *The Fleet Stands Ready*
