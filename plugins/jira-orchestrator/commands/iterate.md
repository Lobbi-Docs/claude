---
name: jira:iterate
description: Fix review feedback, update PR, and trigger re-review automatically
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: pr
    description: PR number (auto-detected from branch if omitted)
    required: false
  - name: repo
    description: Repository identifier (auto-detected if omitted)
    required: false
  - name: auto_review
    description: Trigger council review after fixes
    default: true
  - name: max_iterations
    description: Maximum fix attempts before escalation
    default: 3
version: 1.0.0
---

# Iterate Command - Fix, Update, Re-Review

**Issue:** ${issue_key}
**PR:** ${pr}
**Auto Review:** ${auto_review}
**Max Iterations:** ${max_iterations}

---

## Overview

After receiving review feedback (from council or human reviewers), this command:

1. **Gathers** all review comments and feedback
2. **Analyzes** what needs to be fixed
3. **Fixes** issues automatically
4. **Updates** the PR with fix commits
5. **Re-reviews** to verify fixes (if auto_review=true)

---

## Step 1: Gather Feedback

### 1.1: Detect PR

```yaml
detection_order:
  1. Use explicit --pr argument if provided
  2. Parse from current git branch: feature/PROJ-123-* → find open PR
  3. Query Jira issue for linked PRs
  4. Fail with helpful message if not found
```

### 1.2: Fetch Review Comments

**From Harness:**
```yaml
actions:
  - tool: harness_get_pull_request_activities
    params:
      repo_id: ${repo}
      pr_number: ${pr}

  - tool: harness_api_get_comments  # REST API for inline comments
    endpoint: /v1/repos/${repo}/pullreq/${pr}/comments
```

**From GitHub (fallback):**
```yaml
actions:
  - tool: mcp__github__list_pull_request_reviews
  - tool: mcp__github__list_review_comments
```

### 1.3: Categorize Feedback

```yaml
categories:
  critical:
    keywords: ["must fix", "blocking", "security", "vulnerability", "bug"]
    action: fix_immediately
    priority: 1

  warning:
    keywords: ["should fix", "code smell", "missing", "consider"]
    action: fix
    priority: 2

  suggestion:
    keywords: ["nit", "suggestion", "nice to have", "optional"]
    action: fix_if_easy
    priority: 3

  question:
    keywords: ["?", "why", "clarify", "explain"]
    action: respond_with_explanation
    priority: 2

  resolved:
    keywords: ["fixed", "addressed", "resolved", "done"]
    action: skip
    priority: 0

  praise:
    keywords: ["great", "lgtm", "nice", "good"]
    action: acknowledge
    priority: 0
```

### 1.4: Build Fix Plan

```yaml
output:
  unresolved_comments: [...]
  fix_plan:
    - id: FIX-001
      comment_id: "c123"
      file: "src/auth/login.ts"
      line: 42
      issue: "Missing null check"
      category: warning
      fix_strategy: "Add null check before access"

    - id: FIX-002
      comment_id: "c456"
      file: "src/api/users.ts"
      line: 78
      issue: "SQL injection vulnerability"
      category: critical
      fix_strategy: "Use parameterized query"
```

---

## Step 2: Analyze and Plan Fixes

### 2.1: Group Related Fixes

```yaml
grouping:
  by_file:
    "src/auth/login.ts": [FIX-001, FIX-003]
    "src/api/users.ts": [FIX-002]

  by_domain:
    security: [FIX-002]
    quality: [FIX-001, FIX-003]
```

### 2.2: Order by Dependency

```yaml
execution_order:
  1. Critical security fixes first
  2. Structural changes
  3. Quality improvements
  4. Suggestions (if time permits)
```

### 2.3: Select Agents

```yaml
agent_selection:
  FIX-002 (security):
    agent: security-specialist
    model: sonnet

  FIX-001 (quality):
    agent: code-reviewer  # Can also fix
    model: haiku
```

---

## Step 3: Implement Fixes

### 3.1: Execute Fix Plan

For each fix in order:

```yaml
fix_workflow:
  - Read current file content
  - Understand the specific issue
  - Apply fix using appropriate agent
  - Run affected tests
  - Verify fix doesn't break anything
```

### 3.2: Reply to Comments

After each fix, reply to the original comment:

```yaml
reply_template:
  fixed: |
    ✅ **Fixed** in commit `${sha}`:
    ${description_of_fix}

  wont_fix: |
    ℹ️ **Won't fix**: ${reason}
    ${alternative_approach_if_any}

  need_clarification: |
    ❓ **Need clarification**:
    ${question}
```

**Via Harness API:**
```python
client.create_comment(
    repo=repo,
    pr_number=pr,
    text=reply_text,
    parent_id=original_comment_id  # Creates thread reply
)
```

### 3.3: Handle Fix Failures

```yaml
failure_handling:
  test_failure:
    action: Debug and retry (max 2 attempts)
    escalate_after: 2 failures

  syntax_error:
    action: Auto-correct and retry
    escalate_after: 1 failure

  complex_refactor:
    action: Flag for human review
    escalate_immediately: true
```

---

## Step 4: Update PR

### 4.1: Stage Changes

```bash
git add -A
```

### 4.2: Create Fix Commit

```yaml
commit_message:
  format: "fix(${issue_key}): address review feedback"

  body: |
    Fixes applied:
    ${list_of_fixes}

    Resolved comments: ${resolved_count}
    Pending: ${pending_count}
```

### 4.3: Push to Branch

```bash
git push origin ${branch}
```

### 4.4: Update PR Description

Add iteration note to PR:

```yaml
pr_update:
  append_to_description: |

    ---
    ## Iteration ${iteration_number} - ${timestamp}

    **Fixes applied:** ${fix_count}
    **Comments resolved:** ${resolved_count}

    ### Changes
    ${fix_summary}
```

---

## Step 5: Re-Review (if auto_review=true)

### 5.1: Spawn Focused Council

Only review affected areas:

```yaml
focused_council:
  scope: ${changed_files_in_iteration}

  members:
    - code-reviewer  # Always
    - security-auditor  # If security fixes
    - test-strategist  # If test changes
```

### 5.2: Verify Fixes Address Concerns

```yaml
verification:
  for_each_fix:
    - Original issue resolved?
    - No new issues introduced?
    - Tests still passing?
```

### 5.3: Submit Updated Review

```yaml
review_decision:
  all_fixed_and_verified: "approved"
  some_remaining: "reviewed"  # Progress noted
  new_issues_found: "changereq"
```

---

## Step 6: Sync and Report

### 6.1: Update Jira

```yaml
jira_update:
  - tool: mcp__atlassian__jira_add_comment
    params:
      body: |
        ## Iteration ${iteration_number} Complete

        **Fixes Applied:** ${fix_count}
        **Comments Resolved:** ${resolved_count}

        ${fix_details}

        **Re-Review Result:** ${review_decision}
```

### 6.2: Resolve Comment Threads

```yaml
# Mark fixed comments as resolved (if API supports)
for_each_resolved_comment:
  - Update comment status to "resolved"
```

### 6.3: Output Summary

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  ITERATION COMPLETE: ${issue_key} (Iteration #${n})                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  PR: ${pr_url}                                                            ║
║                                                                           ║
║  Feedback Processed:                                                      ║
║  ├─ Critical: ${critical_count} → ${critical_fixed} fixed                 ║
║  ├─ Warnings: ${warning_count} → ${warning_fixed} fixed                   ║
║  └─ Suggestions: ${suggestion_count} → ${suggestion_fixed} fixed          ║
║                                                                           ║
║  Re-Review: ${review_decision}                                            ║
║  ${review_summary}                                                        ║
║                                                                           ║
║  Next: ${next_action}                                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Iteration Limits and Escalation

### Max Iterations

```yaml
limits:
  max_iterations: ${max_iterations}  # Default: 3

  escalation_triggers:
    - Same comment unfixed after 2 attempts
    - Critical issue count not decreasing
    - Test failures persisting
    - Iteration time exceeds 30 minutes
```

### Escalation Message

```
⚠️ ITERATION LIMIT REACHED

After ${max_iterations} iterations, the following issues remain unresolved:

${list_of_unresolved_issues}

Recommended Actions:
1. Review persistent issues manually
2. Clarify ambiguous requirements
3. Consider scope reduction
4. Pair with human developer

To force continue: /jira:iterate ${issue_key} --force
To get help: /jira:status ${issue_key} --verbose
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| PR not found | Clear message with detection help |
| No unresolved comments | Success - nothing to fix |
| API rate limit | Wait and retry with backoff |
| Merge conflict | Abort, ask user to resolve |
| Fix introduces new failures | Rollback fix, try alternative |

---

## Configuration

Override in `.jira/iterate-config.yaml`:

```yaml
iterate:
  max_iterations: 3
  auto_review: true

  fix_priorities:
    critical: always
    warning: always
    suggestion: if_time_permits

  reply_to_comments: true
  resolve_threads: true

  escalation:
    notify_slack: true
    channel: "#dev-alerts"
```

---

## Related Commands

- `/jira:ship` - Initial shipping with council review
- `/jira:council` - Standalone council review
- `/jira:review` - Manual AI code review
