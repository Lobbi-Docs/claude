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
    description: Use agent council for review (true|false)
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

**End-to-end workflow:** PREFLIGHT → QUESTIONS → PREP → EXPLORE/PLAN/CODE/TEST/FIX/DOCUMENT → COMMIT/PR → CI → COUNCIL → SHIPPED

**Features:** Question-first mode, state machine with resume, pre-flight validation, dry-run mode, CI integration, dynamic council selection

---

## Phase 0: Pre-Flight Validation

Validate all requirements before work begins:

**Checks:**
- Jira: API connection, issue exists, not Done/Closed, user has permissions
- Git: in repository, working directory clean, can push to remote
- Harness/CI: API configured, pipeline exists, user has PR permissions

**On failure:** List all failed checks with remediation steps, abort before any work

---

## Phase 1: Intelligent Questions (CRITICAL)

**Agents:** requirements-analyzer, codebase-scanner, decision-identifier

Generates questions upfront for:
- Technical decisions (auth method, database choice, state management)
- Ambiguity resolution (performance targets, user scope, mobile support)
- Missing requirements (error messages, pagination, rate limits)
- Constraints discovered (existing patterns, compliance, database capacity)
- Risk flags (breaking changes, shared libraries, test gaps)

**Outcome:** All answers gathered → decisions locked → stored in state.json

---

## Phase 2: Preparation

- **Branch:** Detect existing `*/${issue_key}-*` or create `{type}/{issue_key}-{slug}`
  - Types: feature (Story/Task), bugfix (Bug), hotfix (Hotfix)
  - Example: `feature/PROJ-123-oauth-integration`
- **Jira:** Transition issue to "In Progress"

---

## Phase 3: Implementation (6-Phase Protocol)

Uses answers + constraints + technical decisions

**EXPLORE:** triage-agent, task-enricher, agent-router → context, specialists, dependency graph

**PLAN:** code-architect → execution plan, task breakdown, risk mitigation + checkpoint (ask user approval)

**CODE:** Domain specialists + code-reviewer (continuous) → implementation, tests + checkpoint (show diff, ask review)
- Coding standards enforced: terraform (snake_case vars), python (PascalCase classes), TypeScript (camelCase functions), database (snake_case tables)

**TEST:** test-strategist, test-runner → all tests passing, coverage threshold met

**FIX:** debugger, fixer (max 3 iterations) → resolve failures, checkpoint if still failing

**DOCUMENT:** documentation-writer, confluence-manager → README, Confluence, API docs

---

## Phase 4: Delivery

**Commit:** Message format `{type}({issue_key}): {summary}` with body: decisions made, breaking changes, co-authors

**Push & PR:** Create PR with summary, technical decisions, auto-generated changes, test results, coverage, Jira link

---

## Phase 5: CI Integration

Monitor: build status, tests, coverage, security scan, lint

**On failure:**
- Build failed: attempt fix (1 retry)
- Tests failed: show failures, prompt `/jira:iterate`
- Security issues: flag for council review

Collect results: status, duration, coverage delta, security scan output

---

## Phase 6: Council Review

**Dynamic selection:** Auto-include based on files changed
- `src/auth/*` → security-auditor
- `src/api/*` → api-reviewer, security-auditor
- `*.tsx` → accessibility-expert
- `prisma/*` → database-reviewer
- `*.test.*` → test-strategist
- Always: code-reviewer

Context: PR diff, CI results, user answers, technical decisions

Finding format: what, why, evidence, impact, fix, verify

Actions: inline comments, decision vote, summary with recommendations

---

## Phase 7: Completion

- Update Jira: transition to "In Review", add shipping comment
- Output manifest: issue, branch, PR, duration, agents used, CI status, council decision
- Save state: `sessions/ship/${issue_key}/state.json`

---

## State Machine

**States:** INITIALIZED → PREFLIGHT_PASSED → QUESTIONS_GATHERED → BRANCH_CREATED → EXPLORE_COMPLETE → PLAN_COMPLETE → CODE_COMPLETE → TESTS_PASSING → PR_CREATED → CI_COMPLETE → COUNCIL_COMPLETE → SHIPPED

**Checkpoints:** after_plan (ask user), after_code (ask user), auto after PR/council

**Resume:**
```bash
/jira:ship PROJ-123 --status          # Check state
/jira:ship PROJ-123 --resume          # Resume from last checkpoint
/jira:ship PROJ-123 --resume --from=CODE_COMPLETE
```

---

## Commands

```bash
/jira:ship PROJ-123 --mode=auto --council=true --wait-ci=true
/jira:ship PROJ-123 --dry-run
/jira:ship PROJ-123 --resume
/jira:ship PROJ-123 --status
/jira:iterate PROJ-123              # Fix council feedback
/jira:council TARGET                # Standalone review
```

---

## Dry Run Output

Shows what WOULD happen: pre-flight checks, questions to ask (~4), branch name, files to modify (~8), estimated lines (300-500), tests to add (~15), PR creation, council members, estimated duration (15-25m), estimated agents (8-10)

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Pre-flight fails | List issues + remediation, abort |
| User abandons questions | State saved, resume later with --resume |
| Code phase fails | Checkpoint saved, can resume or rollback |
| Tests failing | Offer: continue, manual help, abort |
| CI fails | Offer: /jira:iterate to fix |
| Council rejects | Offer: /jira:iterate for feedback |

---

## Configuration

```yaml
ship:
  version: "2.0"
  preflight: {required: true, timeout: 30s}
  questions: {enabled: true, max_questions: 10}
  checkpoints: {after_plan: ask_user, after_code: ask_user, after_council: auto}
  ci: {wait_for_results: true, timeout: 600s, fail_on_security_critical: true}
  council: {default_preset: standard, dynamic_selection: true, explanation_engine: true, approval_threshold: 0.75}
  state: {persist: true, location: "sessions/ship/", retention_days: 30}
```

---

**Golden Armada** | End-to-End Ship Signature
