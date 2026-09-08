# Jira Orchestrator v5.0 - Improvement Proposal

## Executive Summary

Three new commands to dramatically simplify the Jira-to-Harness workflow:

| Command | Purpose | Complexity |
|---------|---------|------------|
| `/jira:ship` | One command: prepare → code → PR → council review | **Ultra-simple** |
| `/jira:iterate` | Fix review feedback → update PR → re-review | **Simple** |
| `/jira:council` | Agent council (blackboard) for comprehensive review | **Powerful** |

---

## Improvement 1: `/jira:ship` - One Command to Ship

### Vision

**Before (5+ commands):**
```bash
/jira:triage PROJ-123
/jira:prepare PROJ-123
/jira:branch PROJ-123
/jira:work PROJ-123
/jira:pr PROJ-123
/jira:review PROJ-123
/harness-review my-repo 42 --jira PROJ-123
```

**After (1 command):**
```bash
/jira:ship PROJ-123
```

### Command Specification

```yaml
name: jira:ship
description: Complete end-to-end: triage → prepare → branch → code → test → PR → council review
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: mode
    description: Execution mode (auto, guided, review-only)
    default: auto
  - name: council
    description: Use agent council for review (true/false)
    default: true
  - name: harness
    description: Use Harness for PR (true/false, auto-detects if false)
    default: auto
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           /jira:ship PROJ-123                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: PREPARATION (2-3 min)                                            │
│  ├─ Fetch issue from Jira                                                  │
│  ├─ Triage: classify complexity, type, required expertise                  │
│  ├─ Prepare: create subtasks if needed (optional based on complexity)      │
│  └─ Create branch: feature/PROJ-123-{slug}                                 │
│                                                                             │
│  Phase 2: IMPLEMENTATION (5-30 min based on complexity)                    │
│  ├─ EXPLORE: Gather context, analyze codebase                              │
│  ├─ PLAN: Create execution plan, assign domain experts                     │
│  ├─ CODE: Implement with parallel sub-agents                               │
│  ├─ TEST: Run tests, validate acceptance criteria                          │
│  ├─ FIX: Auto-fix any failures                                             │
│  └─ DOCUMENT: Create docs, sync to Confluence                              │
│                                                                             │
│  Phase 3: DELIVERY (2-5 min)                                               │
│  ├─ Commit: Smart commits with issue linking                               │
│  ├─ Push: To remote branch                                                 │
│  └─ Create PR: Via Harness or GitHub                                       │
│                                                                             │
│  Phase 4: COUNCIL REVIEW (3-5 min)                                         │
│  ├─ Spawn Agent Council (5-7 specialists)                                  │
│  ├─ Blackboard Pattern: Parallel analysis                                  │
│  ├─ Synthesize findings                                                    │
│  ├─ Vote on approval/changes needed                                        │
│  └─ Submit review with inline comments                                     │
│                                                                             │
│  Phase 5: COMPLETION                                                       │
│  ├─ Update Jira: Status → In Review                                       │
│  ├─ Post summary comment                                                   │
│  └─ Output: PR URL, review summary, next steps                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Council Integration

The council uses the **Blackboard Pattern** for comprehensive review:

```yaml
council_members:
  - code-reviewer:
      focus: "Code quality, patterns, maintainability"
      model: opus
      weight: 1.0

  - security-auditor:
      focus: "OWASP vulnerabilities, secrets, auth"
      model: sonnet
      weight: 0.9

  - test-strategist:
      focus: "Test coverage, edge cases, mocking"
      model: sonnet
      weight: 0.8

  - performance-analyst:
      focus: "Complexity, memory, N+1 queries"
      model: haiku
      weight: 0.7

  - accessibility-expert:
      focus: "WCAG compliance, keyboard nav, ARIA"
      model: haiku
      weight: 0.6
      condition: "frontend_changes_detected"

  - api-reviewer:
      focus: "REST conventions, backwards compat"
      model: haiku
      weight: 0.6
      condition: "api_changes_detected"

voting:
  approval_threshold: 0.75  # 75% weighted approval
  critical_veto: true       # Any critical issue blocks
  require_security: true    # Security must approve
```

### Output Example

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  🚀 SHIPPED: PROJ-123                                                     ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  📋 Issue: Add user authentication via OAuth2                             ║
║  🌿 Branch: feature/PROJ-123-oauth2-auth                                  ║
║  📝 PR: https://app.harness.io/code/repo/my-service/pulls/42             ║
║                                                                           ║
║  ⏱️  Duration: 18m 32s                                                    ║
║  👥 Agents Used: 9 (triage, enricher, architect, 3x coders, tester, 2x reviewers)
║                                                                           ║
║  📊 Council Review: APPROVED ✅                                           ║
║  ├─ code-reviewer: ✅ Approved (quality: 92/100)                          ║
║  ├─ security-auditor: ✅ Approved (no vulnerabilities)                    ║
║  ├─ test-strategist: ⚠️ Approved with notes (coverage: 84%)              ║
║  └─ performance-analyst: ✅ Approved (no concerns)                        ║
║                                                                           ║
║  📌 Review Comments: 3 suggestions added inline                           ║
║                                                                           ║
║  🎯 Next: Awaiting human review → /jira:iterate PROJ-123 (if needed)     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Improvement 2: `/jira:iterate` - Fix & Re-Review

### Vision

After human or council review identifies issues, one command to:
1. Analyze all review comments
2. Fix issues automatically
3. Update the PR
4. Trigger a new review cycle

### Command Specification

```yaml
name: jira:iterate
description: Fix review feedback, update PR, re-review
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
    description: Maximum fix iterations before asking for human help
    default: 3
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         /jira:iterate PROJ-123                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: GATHER FEEDBACK                                                   │
│  ├─ Detect PR from branch or argument                                      │
│  ├─ Fetch all review comments (Harness/GitHub)                             │
│  ├─ Fetch inline code comments                                             │
│  ├─ Parse reviewer decisions (approved/changes requested)                  │
│  └─ Categorize: critical | warning | suggestion | resolved                 │
│                                                                             │
│  Step 2: ANALYZE & PLAN FIXES                                              │
│  ├─ For each unresolved comment:                                           │
│  │   ├─ Understand the issue                                               │
│  │   ├─ Locate affected code                                               │
│  │   └─ Determine fix strategy                                             │
│  ├─ Group related fixes                                                    │
│  ├─ Order by dependency                                                    │
│  └─ Estimate effort                                                        │
│                                                                             │
│  Step 3: IMPLEMENT FIXES                                                   │
│  ├─ Apply fixes using domain-appropriate agents                            │
│  ├─ Run affected tests                                                     │
│  ├─ Verify no regressions                                                  │
│  └─ Reply to comments with fix confirmation                                │
│                                                                             │
│  Step 4: UPDATE PR                                                         │
│  ├─ Stage all changes                                                      │
│  ├─ Create fix commit: "fix(PROJ-123): address review feedback"            │
│  ├─ Push to branch                                                         │
│  └─ Update PR description with iteration notes                             │
│                                                                             │
│  Step 5: RE-REVIEW (if auto_review=true)                                   │
│  ├─ Spawn focused council (only affected areas)                            │
│  ├─ Verify fixes address original concerns                                 │
│  ├─ Check for new issues introduced                                        │
│  └─ Submit updated review                                                  │
│                                                                             │
│  Step 6: SYNC & REPORT                                                     │
│  ├─ Update Jira with iteration summary                                     │
│  ├─ Resolve comment threads                                                │
│  └─ Report status                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comment Processing

```yaml
comment_processing:
  sources:
    - harness_pr_activities    # Via Harness MCP
    - harness_inline_comments  # Via REST API
    - github_pr_reviews        # If using GitHub
    - jira_comments            # Linked feedback

  categorization:
    critical:
      - "security vulnerability"
      - "data leak"
      - "authentication bypass"
      - "must fix"
      - "blocking"

    warning:
      - "should fix"
      - "code smell"
      - "missing error handling"
      - "performance concern"

    suggestion:
      - "consider"
      - "nice to have"
      - "suggestion"
      - "nit"

    already_resolved:
      - "fixed in"
      - "addressed"
      - "resolved"

  reply_templates:
    fixed: "✅ Fixed in commit {sha}: {description}"
    wont_fix: "ℹ️ Won't fix: {reason}"
    need_clarification: "❓ Need clarification: {question}"
```

### Iteration Limits

```yaml
iteration_control:
  max_iterations: 3

  escalation_triggers:
    - same_comment_unfixed_twice
    - critical_count_increasing
    - test_failures_not_reducing

  escalation_action: |
    ⚠️ Iteration limit reached. Human intervention recommended.

    Unresolved Issues:
    {list_of_unresolved}

    Suggested Actions:
    1. Review the persistent issues manually
    2. Clarify requirements if ambiguous
    3. Consider scope reduction

    Resume with: /jira:iterate PROJ-123 --force
```

---

## Improvement 3: `/jira:council` - Agent Council Review

### Vision

A standalone command for comprehensive agent council review that can be used:
1. On any PR (not just Jira-linked)
2. As part of `/jira:ship`
3. For re-review after iterations

### Command Specification

```yaml
name: jira:council
description: Agent council (blackboard pattern) for comprehensive PR review
arguments:
  - name: target
    description: PR URL, repo:pr_number, or issue_key
    required: true
  - name: council
    description: Council preset (standard, security, performance, full)
    default: standard
  - name: depth
    description: Review depth (quick, standard, deep)
    default: standard
  - name: output
    description: Output format (inline, summary, both)
    default: both
```

### Council Presets

```yaml
presets:
  quick:
    description: "Fast review for small changes"
    duration: "1-2 min"
    members:
      - code-reviewer
      - test-strategist
    depth: surface

  standard:
    description: "Balanced review for typical PRs"
    duration: "3-5 min"
    members:
      - code-reviewer
      - security-auditor
      - test-strategist
      - performance-analyst
    depth: standard

  security:
    description: "Security-focused review"
    duration: "5-8 min"
    members:
      - security-auditor (lead)
      - code-reviewer
      - api-reviewer
      - secrets-scanner
    depth: deep
    focus: ["auth", "injection", "secrets", "permissions"]

  performance:
    description: "Performance-focused review"
    duration: "5-8 min"
    members:
      - performance-analyst (lead)
      - code-reviewer
      - database-reviewer
      - caching-specialist
    depth: deep
    focus: ["complexity", "queries", "memory", "caching"]

  full:
    description: "Comprehensive enterprise review"
    duration: "8-15 min"
    members:
      - code-reviewer
      - security-auditor
      - test-strategist
      - performance-analyst
      - accessibility-expert
      - api-reviewer
      - documentation-reviewer
    depth: deep
```

### Blackboard Implementation

```yaml
blackboard_workflow:
  initialization:
    - Create shared blackboard with PR diff
    - Initialize knowledge space
    - Spawn council members in parallel

  contribution_phase:
    duration: "60-180 seconds based on depth"
    parallel: true
    activities:
      - Each agent analyzes from their specialty
      - Posts observations, concerns, approvals
      - Confidence scores (0-1) weight findings
      - Dependencies track related findings

  synthesis_phase:
    activities:
      - Monitor for consensus patterns
      - Identify conflicting views
      - Calculate aggregate confidence
      - Determine blocking issues

  voting_phase:
    mechanism: weighted_confidence
    thresholds:
      approve: 0.75           # 75% weighted approval
      request_changes: 0.50   # Below 50% = changes needed
    veto_power:
      - security_auditor      # Critical security issues
      - code_reviewer         # Critical bugs

  output_phase:
    inline_comments:
      - Add comments at specific code locations
      - Include severity, suggestion, rationale
    summary:
      - Aggregate findings by category
      - Overall recommendation
      - Confidence level
    decision:
      - "approved" | "changereq" | "reviewed"
```

### Integration with Harness

```python
# Council submits review via Harness API
def submit_council_review(repo, pr_number, council_result):
    client = HarnessCodeAPI()

    # 1. Add inline comments from each council member
    for finding in council_result.findings:
        if finding.location:
            client.create_comment(
                repo=repo,
                pr_number=pr_number,
                text=format_finding(finding),
                path=finding.file,
                line_start=finding.line_start,
                line_end=finding.line_end
            )

    # 2. Submit overall review decision
    decision = "approved" if council_result.score >= 0.75 else "changereq"
    client.submit_review(
        repo=repo,
        pr_number=pr_number,
        commit_sha=council_result.commit_sha,
        decision=decision
    )

    # 3. Add summary comment
    client.create_comment(
        repo=repo,
        pr_number=pr_number,
        text=format_council_summary(council_result)
    )

    # 4. Sync to Jira
    if council_result.jira_key:
        sync_to_jira(council_result)
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

```yaml
tasks:
  - id: COUNCIL-001
    title: "Implement blackboard data structure"
    effort: 2 days
    files:
      - lib/blackboard-engine.ts
      - sessions/blackboard/

  - id: COUNCIL-002
    title: "Create council member agent spawning"
    effort: 1 day
    files:
      - agents/council-coordinator.md

  - id: COUNCIL-003
    title: "Implement voting and synthesis logic"
    effort: 1 day
    files:
      - lib/council-voting.ts
```

### Phase 2: Commands (Week 2)

```yaml
tasks:
  - id: SHIP-001
    title: "Create /jira:ship command"
    effort: 2 days
    files:
      - commands/ship.md
    dependencies: [COUNCIL-001, COUNCIL-002, COUNCIL-003]

  - id: ITERATE-001
    title: "Create /jira:iterate command"
    effort: 2 days
    files:
      - commands/iterate.md

  - id: COUNCIL-CMD-001
    title: "Create /jira:council command"
    effort: 1 day
    files:
      - commands/council.md
```

### Phase 3: Integration (Week 3)

```yaml
tasks:
  - id: HARNESS-INT-001
    title: "Integrate council with Harness review API"
    effort: 2 days
    files:
      - lib/harness_code_api.py (extend)
      - lib/council-harness-integration.ts

  - id: JIRA-INT-001
    title: "Add council results to Jira sync"
    effort: 1 day
    files:
      - agents/harness-jira-sync.md (extend)
```

### Phase 4: Testing & Docs (Week 4)

```yaml
tasks:
  - id: TEST-001
    title: "End-to-end tests for ship/iterate/council"
    effort: 2 days

  - id: DOCS-001
    title: "Update README and create usage guides"
    effort: 1 day

  - id: REGISTRY-001
    title: "Update registry indexes"
    effort: 0.5 days
```

---

## Usage Examples

### Example 1: Ship a Feature

```bash
# One command to do everything
/jira:ship PROJ-123

# With options
/jira:ship PROJ-123 --council=full --harness=true
```

### Example 2: Fix Review Feedback

```bash
# After receiving review feedback
/jira:iterate PROJ-123

# Specify PR explicitly
/jira:iterate PROJ-123 --pr 42 --repo my-service

# Skip auto-review
/jira:iterate PROJ-123 --auto_review=false
```

### Example 3: Standalone Council Review

```bash
# Review any PR with council
/jira:council my-service:42

# Security-focused review
/jira:council my-service:42 --council=security

# Deep review with all output
/jira:council PROJ-123 --council=full --depth=deep --output=both
```

### Example 4: Complete Workflow

```bash
# Day 1: Ship the feature
/jira:ship PROJ-123
# → PR created, council approves with 3 suggestions

# Day 1: Iterate on feedback
/jira:iterate PROJ-123
# → Fixes applied, new review: APPROVED ✅

# Day 2: Human merges PR
# → Harness pipeline triggers deployment
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Commands to ship feature | 5-7 | **1** |
| Time to PR creation | ~30 min manual | ~15 min auto |
| Review coverage | Variable | **100%** (council) |
| Fix iteration time | ~20 min manual | ~5 min auto |
| Context switches | Many | **Zero** |

---

## Conclusion

These three improvements transform the Jira-to-Harness workflow:

1. **`/jira:ship`**: Zero-friction shipping with built-in quality
2. **`/jira:iterate`**: Autonomous fix-and-review cycles
3. **`/jira:council`**: Enterprise-grade multi-agent review

The blackboard pattern ensures comprehensive coverage while parallel execution keeps velocity high.
