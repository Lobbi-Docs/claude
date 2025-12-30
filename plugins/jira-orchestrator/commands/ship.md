---
name: jira:ship
description: One command to ship - intelligent question gathering, prepare, code, PR, and council review
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
  - name: depth
    description: Review depth (quick, standard, deep)
    default: standard
  - name: resume
    description: Resume from last checkpoint
    default: false
  - name: dry_run
    description: Show what would happen without executing
    default: false
  - name: interactive
    description: Ask before each major phase
    default: false
  - name: wait_ci
    description: Wait for CI results before council review
    default: true
version: 2.0.0
---

# Ship Command v2.0 - Intelligent Orchestration

**Issue:** ${issue_key}
**Mode:** ${mode}
**Resume:** ${resume}
**Dry Run:** ${dry_run}

---

## Overview

This command executes the complete development lifecycle with **intelligent question gathering**:

```
QUESTIONS → PREPARE → BRANCH → CODE → TEST → PR → COUNCIL REVIEW → DONE
    ↑                                                                  ↑
    └────────── State Machine with Checkpoints & Resume ───────────────┘
```

**Key Features (v2.0):**
- 🧠 Question-First Mode - Asks ALL questions upfront
- 💾 State Machine - Resume from any checkpoint
- 🔍 Pre-flight Validation - Catches issues early
- 🏃 Dry-Run Mode - Preview without executing
- 🔄 CI Integration - Waits for pipeline results

---

## Phase 0: Pre-Flight Validation (NEW)

Before anything else, validate all requirements:

```yaml
preflight_checks:
  jira:
    - Can connect to Jira API
    - Issue ${issue_key} exists
    - Issue is not Done/Closed
    - User has permission to update

  git:
    - In a git repository
    - Working directory is clean (or --force)
    - Can push to remote

  harness:
    - API key configured
    - Repository detected
    - User has PR creation permission

  ci:
    - Pipeline exists for this repo
    - Can query pipeline status

on_failure:
  - List all failed checks
  - Provide remediation steps
  - Abort before any work begins
```

**Output:**
```
✅ Pre-flight checks passed

  Jira:    ✅ Connected, PROJ-123 found (Story, In Backlog)
  Git:     ✅ Clean repo, can push to origin
  Harness: ✅ API configured, my-service repo detected
  CI:      ✅ Pipeline found: build-test-deploy

Proceeding to Phase 1...
```

---

## Phase 1: Intelligent Question Gathering (NEW - CRITICAL)

**The most important phase.** Prevents wasted work by gathering ALL context upfront.

### Step 1.1: Deep Issue Analysis

```yaml
analysis_agents:
  - requirements-analyzer:
      task: "Extract requirements, constraints, acceptance criteria"
      output: requirements_doc

  - codebase-scanner:
      task: "Find related code, patterns, constraints"
      output: code_context

  - decision-identifier:
      task: "Identify technical decisions needed"
      output: decisions_needed
```

### Step 1.2: Question Generation

The system analyzes for:

```yaml
question_categories:
  technical_decisions:
    description: "Choices that affect implementation"
    examples:
      - "Database: Should we use PostgreSQL or MongoDB?"
      - "Auth: OAuth2 or API keys?"
      - "State: Redux, Context, or Zustand?"

  ambiguity_resolution:
    description: "Unclear requirements"
    examples:
      - "'Fast' - what's acceptable latency? (100ms? 1s?)"
      - "'Users' - which user roles have access?"
      - "'Mobile support' - required or nice-to-have?"

  missing_requirements:
    description: "Things not mentioned but needed"
    examples:
      - "No error messages defined - what should users see?"
      - "No pagination mentioned - expected data volume?"
      - "No rate limiting - is this a public API?"

  constraints_discovered:
    description: "Technical constraints from codebase"
    examples:
      - "Found existing auth using JWT - extend or replace?"
      - "This touches payment module (PCI compliance) - proceed?"
      - "Database already at 80% capacity - add caching?"

  risk_flags:
    description: "Potential issues detected"
    examples:
      - "Breaking change detected - migration plan needed?"
      - "Affects shared library used by 5 services"
      - "No tests exist for this module currently"
```

### Step 1.3: Ask ALL Questions At Once

```markdown
## 🧠 Questions Before We Begin

Based on analyzing PROJ-123 and the codebase, I need clarification on:

### Technical Decisions

**Q1: Authentication Method**
The issue mentions "secure API access" but doesn't specify the method.
Options:
  a) OAuth2 (most secure, complex)
  b) API Keys (simpler, less secure)
  c) JWT with refresh tokens (balanced)
  d) Use existing auth system (extends current JWT implementation)
→ Your choice: ___

**Q2: Database Storage**
User preferences need to be stored. Options:
  a) PostgreSQL (existing, relational)
  b) Redis (fast, but volatile)
  c) Both (Redis cache + PostgreSQL persistence)
→ Your choice: ___

### Ambiguity Resolution

**Q3: Performance Requirements**
"Should be fast" - what's acceptable?
  a) < 100ms (real-time feel)
  b) < 500ms (responsive)
  c) < 2s (acceptable for background operations)
→ Your choice: ___

**Q4: User Scope**
Which users should access this feature?
  a) All authenticated users
  b) Admin users only
  c) Users with specific permission
  d) Based on subscription tier
→ Your choice: ___

### Missing Requirements

**Q5: Error Handling**
How should errors be displayed?
  a) User-friendly messages only
  b) Technical details for debugging
  c) User-friendly with "show details" option
→ Your choice: ___

### Constraints Detected

**Q6: Existing Auth System**
Found JWT auth in `src/auth/`. Should I:
  a) Extend it with new endpoint
  b) Create separate auth for this feature
  c) Refactor existing to support both
→ Your choice: ___

---

Please provide your answers (e.g., "Q1: d, Q2: c, Q3: a, Q4: c, Q5: c, Q6: a")
```

### Step 1.4: Store Answers in State

```json
{
  "phase": "QUESTIONS_COMPLETE",
  "answers": {
    "Q1_auth_method": "d - Use existing auth system",
    "Q2_database": "c - Both Redis and PostgreSQL",
    "Q3_performance": "a - < 100ms",
    "Q4_user_scope": "c - Users with specific permission",
    "Q5_error_handling": "c - User-friendly with details option",
    "Q6_existing_auth": "a - Extend it"
  },
  "decisions_locked": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## State Machine (NEW)

### State Persistence

```yaml
state_location: "sessions/ship/${issue_key}/state.json"

states:
  - INITIALIZED
  - PREFLIGHT_PASSED
  - QUESTIONS_GATHERED       # ← Can resume from here
  - BRANCH_CREATED
  - EXPLORE_COMPLETE
  - PLAN_COMPLETE            # ← Checkpoint: user approval
  - CODE_COMPLETE            # ← Checkpoint: user approval
  - TESTS_PASSING
  - PR_CREATED
  - CI_COMPLETE
  - COUNCIL_COMPLETE
  - SHIPPED

checkpoints:
  after_questions:
    action: continue         # Auto-continue
    save: true

  after_plan:
    action: ask_user         # "Approve plan? [Y/n]"
    save: true

  after_code:
    action: ask_user         # "Review code before PR? [Y/n]"
    save: true

  after_pr:
    action: continue
    save: true

  after_council:
    action: continue
    save: true
```

### Resume Command

```bash
# Check current state
/jira:ship PROJ-123 --status

# Resume from last checkpoint
/jira:ship PROJ-123 --resume

# Resume from specific phase
/jira:ship PROJ-123 --resume --from=CODE_COMPLETE
```

### State File Structure

```json
{
  "issue_key": "PROJ-123",
  "version": "2.0.0",
  "current_state": "CODE_COMPLETE",
  "started_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:45:00Z",

  "phases": {
    "preflight": {
      "status": "complete",
      "checks_passed": 4,
      "duration": "2s"
    },
    "questions": {
      "status": "complete",
      "questions_asked": 6,
      "answers": {...},
      "duration": "user_input"
    },
    "branch": {
      "status": "complete",
      "branch_name": "feature/PROJ-123-oauth-integration",
      "duration": "1s"
    },
    "explore": {
      "status": "complete",
      "context_file": "sessions/ship/PROJ-123/explore-context.md",
      "agents_used": 3,
      "duration": "45s"
    },
    "plan": {
      "status": "complete",
      "plan_file": "sessions/ship/PROJ-123/execution-plan.md",
      "user_approved": true,
      "duration": "30s"
    },
    "code": {
      "status": "complete",
      "files_changed": 12,
      "lines_added": 450,
      "lines_removed": 23,
      "agents_used": 4,
      "duration": "8m 32s"
    },
    "test": {
      "status": "complete",
      "tests_passed": 45,
      "tests_failed": 0,
      "coverage": "86%",
      "duration": "1m 15s"
    },
    "pr": {
      "status": "pending",
      "pr_number": null
    }
  },

  "recovery_options": [
    "Resume from PR creation",
    "Re-run tests before PR",
    "Go back to code phase"
  ]
}
```

---

## Phase 2: Preparation

### Step 2.1: Create Branch (if not exists)

```yaml
branch_creation:
  check_existing:
    - Look for branch matching pattern: */${issue_key}-*
    - If found, checkout and continue
    - If not found, create new

  naming:
    pattern: "{type}/{issue_key}-{slug}"
    examples:
      - "feature/PROJ-123-oauth-integration"
      - "bugfix/PROJ-456-fix-null-pointer"
      - "hotfix/PROJ-789-security-patch"

  auto_type_detection:
    Bug: "bugfix"
    Story: "feature"
    Task: "feature"
    Hotfix: "hotfix"
```

### Step 2.2: Transition Issue

```yaml
- tool: mcp__atlassian__jira_transition_issue
  params:
    issue_key: ${issue_key}
    transition: "In Progress"
  skip_if: already_in_progress
```

---

## Phase 3: Implementation (6-Phase Protocol)

Execute with context from questions:

### EXPLORE Phase

```yaml
agents:
  - triage-agent
  - task-enricher
  - agent-router

context_includes:
  - User's answers from Phase 1
  - Detected constraints
  - Technical decisions made

output:
  - Rich context document
  - Selected specialists
  - Dependency graph
```

### PLAN Phase

```yaml
agents:
  - code-architect

inputs:
  - Questions answers (decisions locked in)
  - Explore context

output:
  - Detailed execution plan
  - Task breakdown
  - Risk mitigation steps

checkpoint:
  action: show_plan_and_ask
  prompt: |
    ## Execution Plan

    ${plan_summary}

    Estimated duration: ${estimate}
    Files to modify: ${file_count}
    Risk level: ${risk_level}

    Proceed with implementation? [Y/n/modify]
```

### CODE Phase

```yaml
agents:
  - Domain specialists (from agent-router)
  - code-reviewer (continuous)

execution:
  mode: parallel_where_possible
  use_decisions: ${questions.answers}

# MANDATORY: All code MUST follow coding standards
coding_standards:
  config: "config/coding-standards.yaml"
  enforce:
    terraform:
      variables: snake_case
      resources: "this (iterated) or main (primary)"
      tag_keys: PascalCase
      workspaces: "lowercase, no separators"
    python:
      classes: PascalCase
      interfaces: IPascalCase
      functions: "snake_case verbs"
      constants: SCREAMING_SNAKE_CASE
      api_routes: "/api/v{n}/{plural}"
      http_methods: "GET, POST, PATCH, DELETE (no PUT)"
      type_hints: required
      docstrings: Google style
    typescript:
      functions: camelCase
      classes: PascalCase
      components: PascalCase
      hooks: "use prefix"
    database:
      tables: "snake_case plural"
      columns: snake_case

output:
  - Implemented feature (standards-compliant)
  - Unit tests
  - Integration tests

checkpoint:
  action: show_diff_summary
  prompt: |
    ## Code Complete

    Files changed: ${file_count}
    Lines: +${added} -${removed}
    Standards violations: ${standards_violations}

    Review changes before creating PR? [Y/n/show-diff]
```

### TEST Phase

```yaml
agents:
  - test-strategist
  - test-runner

actions:
  - Run all tests
  - Check coverage threshold
  - Validate acceptance criteria from questions

output:
  - Test results
  - Coverage report
  - Acceptance criteria checklist
```

### FIX Phase (conditional)

```yaml
condition: tests_failing OR coverage_below_threshold

agents:
  - debugger
  - fixer

loop:
  max_iterations: 3
  on_max_reached:
    action: checkpoint
    prompt: |
      ⚠️ Tests still failing after 3 fix attempts.

      Failures:
      ${failure_summary}

      Options:
      1. Continue anyway (create PR with known issues)
      2. Manual intervention (pause for human help)
      3. Abort and rollback
```

### DOCUMENT Phase

```yaml
agents:
  - documentation-writer
  - confluence-manager

output:
  - Updated README
  - Confluence documentation
  - API docs (if applicable)
```

---

## Phase 4: Delivery

### Step 4.1: Smart Commit

```yaml
commit:
  message_format: "{type}({issue_key}): {summary}"

  body_includes:
    - Implementation summary
    - Technical decisions made
    - Breaking changes (if any)

  co_authors:
    - List all agents involved
```

### Step 4.2: Push & Create PR

```yaml
push:
  branch: ${current_branch}
  remote: origin

pr_creation:
  platform: auto_detect  # Harness or GitHub

  title: "${issue_key}: ${summary}"

  body: |
    ## Summary
    ${issue_description}

    ## Technical Decisions
    ${decisions_summary}

    ## Changes
    ${auto_generated_changes}

    ## Testing
    - Tests: ${test_count} passing
    - Coverage: ${coverage}%

    ## Jira
    Resolves: [${issue_key}](${jira_url})
```

---

## Phase 5: CI Integration (NEW)

### Step 5.1: Wait for CI (if --wait-ci)

```yaml
ci_wait:
  enabled: ${wait_ci}
  timeout: 600s  # 10 minutes max

  monitor:
    - Build status
    - Test results
    - Coverage report
    - Security scan
    - Lint results

  on_failure:
    build_failed:
      action: attempt_fix
      max_retries: 1

    tests_failed:
      action: show_failures
      prompt: "CI tests failed. Run /jira:iterate to fix?"

    security_issues:
      action: flag_for_council
      critical_threshold: 0
```

### Step 5.2: Collect CI Results

```yaml
ci_results:
  build:
    status: "success"
    duration: "2m 34s"

  tests:
    passed: 142
    failed: 0
    skipped: 3
    coverage: "84.2%"
    coverage_delta: "+2.1%"

  security:
    critical: 0
    high: 0
    medium: 2
    low: 5

  lint:
    errors: 0
    warnings: 5
```

---

## Phase 6: Council Review (Enhanced)

### Step 6.1: Dynamic Council Selection (NEW)

```yaml
dynamic_selection:
  analyze:
    - Files changed
    - Code patterns
    - Security sensitivity
    - Performance impact

  auto_include:
    "src/auth/*": [security-auditor]
    "src/api/*": [api-reviewer, security-auditor]
    "*.tsx": [accessibility-expert]
    "prisma/*": [database-reviewer]
    "*.test.*": [test-strategist]

  always_include:
    - code-reviewer

  selected_council:
    - code-reviewer (required)
    - security-auditor (matched: auth files)
    - api-reviewer (matched: API changes)
    - test-strategist (matched: test files)
```

### Step 6.2: CI-Informed Review (NEW)

```yaml
council_context:
  includes:
    - PR diff
    - CI results (tests, coverage, security scan)
    - User's answers from questions phase
    - Technical decisions made

  council_sees:
    build: "✅ Success (2m 34s)"
    tests: "✅ 142/142 passing"
    coverage: "84.2% (+2.1%)"
    security: "⚠️ 2 medium issues"
```

### Step 6.3: Parallel Analysis

```yaml
execution:
  mode: parallel
  timeout: 180s

  each_agent:
    - Review from specialty
    - Consider CI results
    - Post to blackboard
    - Vote
```

### Step 6.4: Explanation Engine (NEW)

Each finding includes rich context:

```yaml
finding_format:
  what: "Description of issue"
  why: "Why this matters"
  evidence: "Proof (logs, similar bugs, patterns)"
  impact: "What happens if not fixed"
  fix: "How to fix it"
  verify: "How to verify the fix"
```

### Step 6.5: Submit Review

```yaml
actions:
  - Add inline comments (rich explanations)
  - Submit decision
  - Add summary with:
      - CI results
      - Council votes
      - Key findings
      - Recommendations
```

---

## Phase 7: Completion

### Step 7.1: Update Jira

```yaml
jira_update:
  transition: "In Review"
  comment: |
    ## 🚀 Shipped via /jira:ship v2.0

    **PR:** ${pr_url}
    **Branch:** ${branch}
    **Duration:** ${total_duration}

    ### Questions Answered
    ${questions_summary}

    ### Council Review: ${decision}
    ${council_summary}

    ### CI Results
    ${ci_summary}

    ### Next Steps
    ${next_steps}
```

### Step 7.2: Output Summary

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  🚀 SHIPPED: ${issue_key}                                                 ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  📋 Issue: ${summary}                                                     ║
║  🌿 Branch: ${branch}                                                     ║
║  📝 PR: ${pr_url}                                                         ║
║                                                                           ║
║  ⏱️  Total Duration: ${duration}                                          ║
║  🧠 Questions Asked: ${question_count}                                    ║
║  👥 Agents Used: ${agent_count}                                           ║
║                                                                           ║
║  🔄 CI Pipeline: ${ci_status}                                             ║
║  ├─ Build: ${build_status}                                                ║
║  ├─ Tests: ${test_summary}                                                ║
║  └─ Security: ${security_summary}                                         ║
║                                                                           ║
║  🏛️ Council Review: ${decision}                                           ║
║  ${council_breakdown}                                                     ║
║                                                                           ║
║  💾 State saved: sessions/ship/${issue_key}/                              ║
║                                                                           ║
║  🎯 Next: ${next_action}                                                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Dry Run Mode

```bash
/jira:ship PROJ-123 --dry-run
```

**Output:**
```
## Dry Run: /jira:ship PROJ-123

This is what WOULD happen:

1. ✅ Pre-flight: All checks would pass
2. 🧠 Questions: ~4 questions would be asked (auth, database, performance, scope)
3. 🌿 Branch: feature/PROJ-123-oauth-integration would be created
4. 📝 Plan: ~8 files would be modified
5. 💻 Code: Estimated 300-500 lines
6. 🧪 Tests: ~15 new tests would be added
7. 📤 PR: Would be created on Harness
8. 🏛️ Council: standard preset (4 members)

Estimated duration: 15-25 minutes
Estimated agents: 8-10

Run without --dry-run to execute.
```

---

## Error Handling & Recovery

| Error | Recovery |
|-------|----------|
| Pre-flight fails | List issues, provide fix instructions |
| User abandons questions | State saved, resume later with --resume |
| Code phase fails | Checkpoint saved, can resume or rollback |
| Tests won't pass | Offer: continue anyway, manual help, or abort |
| CI fails | Offer: /jira:iterate to fix |
| Council rejects | Offer: /jira:iterate to address feedback |

---

## Configuration

```yaml
# .jira/ship-config.yaml

ship:
  version: "2.0"

  preflight:
    required: true
    timeout: 30s

  questions:
    enabled: true
    max_questions: 10
    skip_if_clear: false  # Set true to skip if no ambiguity

  checkpoints:
    after_plan: ask_user
    after_code: ask_user
    after_council: auto

  ci:
    wait_for_results: true
    timeout: 600s
    fail_on_security_critical: true

  council:
    default_preset: standard
    dynamic_selection: true
    explanation_engine: true
    approval_threshold: 0.75

  state:
    persist: true
    location: "sessions/ship/"
    retention_days: 30
```

---

## Related Commands

- `/jira:ship PROJ-123 --status` - Check current state
- `/jira:ship PROJ-123 --resume` - Resume from checkpoint
- `/jira:iterate PROJ-123` - Fix review feedback
- `/jira:council TARGET` - Standalone council review
