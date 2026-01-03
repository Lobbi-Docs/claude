---
name: jira:work
description: Orchestrate Jira issue work - parallelize sub-issues, assign experts, execute 6-phase protocol, document via Harness
arguments:
  - name: issue_key
    description: Jira issue key (e.g., ABC-123)
    required: true
flags:
  global: [--verbose, --quiet, --json, --dry-run, --preset, --debug]
  orchestration: [--agents, --model, --parallel, --phases, --checkpoint, --resume]
  documentation: [--report, --report-to-confluence, --report-to-obsidian]
presets: [speed-run, thorough, enterprise, hotfix]
version: 2.2.0
---

# Jira Issue Orchestration

Orchestrate work on Jira issues: detect sub-issues, parallelize, assign experts, execute 6-phase protocol, document via Confluence, create PRs via Harness Code.

**Auto time logging:** All phases auto-log time to Jira worklog (via `jira-orchestrator/config/time-logging.yml`)

## Core Workflow

**Validate → Tag → Detect Sub-Issues → Assign Agents → Parallelize Subs → EXPLORE → PLAN (+TDD) → CODE (+Impl Notes) → TEST (+Test Plan) → FIX → DOCUMENT (+Runbook) → Confluence Hub → Commit & PR (with Doc Links) → Jira Comments → Summary**

## Confluence Documentation Integration

**MANDATORY:** Each phase creates/updates Confluence documentation. PRs include documentation links.

| Phase | Confluence Document | Content |
|-------|---------------------|---------|
| EXPLORE | TDD Draft | Initial requirements, scope, constraints |
| PLAN | Technical Design Document | Architecture, APIs, security, deployment |
| CODE | Implementation Notes | Code patterns, integrations, configurations |
| TEST | Test Plan & Results | Strategy, coverage, test results, sign-off |
| DOCUMENT | Runbook/Operations Guide | Deployment, monitoring, troubleshooting |

### Documentation Workflow Per Phase

```yaml
phase_completion:
  - Create/update Confluence page for phase
  - Link page to Jira issue (remote link + comment)
  - Include Confluence URL in phase completion milestone
  - Validate page exists before proceeding to next phase

pr_creation:
  - Include "## Documentation" section with all Confluence links
  - Add Confluence URLs to PR description
  - Post documentation summary to Jira comment
```

### Confluence Page Hierarchy

```
{Project Space}/Features/
└── {ISSUE-KEY} - {Feature Name}/     [Hub Page]
    ├── Technical Design               [PLAN phase]
    ├── Implementation Notes           [CODE phase]
    ├── Test Plan & Results            [TEST phase]
    └── Runbook                         [DOCUMENT phase]
```

## 6-Phase Protocol (per Issue)

| Phase | Purpose | Agents | Output | Confluence Page |
|-------|---------|--------|--------|-----------------|
| EXPLORE | Understand requirements, acceptance criteria | 2+ | Requirements doc | TDD Draft (created) |
| PLAN | Design solution, architecture, APIs | 1-2 | Technical design | Technical Design Document |
| CODE | Implement solution | 2-4 | Implementation + tests | Implementation Notes |
| TEST | Validate, coverage >= 80% | 2-3 | Test results | Test Plan & Results |
| FIX | Resolve failures, gaps | 1-2 | Fixed code | (Update existing pages) |
| DOCUMENT | Record decisions, architecture, runbook | 1-2 | Confluence docs | Runbook + Hub Page |

## Key Requirements

- All work via PRs (never direct commit to main)
- Test coverage >= 80% mandatory
- SOLID principles required
- Git worktrees for parallel sub-issues
- Sub-agents: 3-5 minimum per task
- 4+ Confluence pages required

## Tag Management (Auto-Created)

| Category | Prefix | Values |
|----------|--------|--------|
| Domain | `domain:` | frontend, backend, database, devops, testing, security |
| Status | `status:` | in-progress, completed, reviewed, tested, blocked |
| Type | `type:` | feature, bug, task, refactor, hotfix |

## Sub-Issue Detection & Parallelization

- Fetch all subtasks + linked issues (blocks, relates-to, duplicates)
- Build DAG (Directed Acyclic Graph) for parallel execution
- Parallelize independent subtasks using git worktrees
- Skip if no sub-issues found

## Agent Model Assignment

- **Opus:** Strategy, architecture, complex decisions
- **Sonnet:** Development, coding work
- **Haiku:** Documentation, status updates, simple tasks

## Phase-Specific Teams

| Phase | Primary Team | Members |
|-------|--------------|---------|
| EXPLORE | Documentation Guild | Archivist, Requirements Analyst |
| PLAN | Code Strike Team | Genesis, Architect |
| CODE | Code Strike + Domain Specialists | Dynamic per file types |
| TEST | Quality Council | Test Runner, Coverage Analyzer |
| FIX | Debug Squadron | Sleuth, Debugger |
| DOCUMENT | Documentation Guild | Archivist, Vault Syncer |

## Execution Steps

1. **Validate & Fetch** - Get issue from Jira
2. **Transition** - Set status to "In Progress"
3. **Tag Management** - Apply domain/status/type tags
4. **Sub-Issue Detection** - Find all subtasks/linked issues
5. **Expert Assignment** - Match specialists per domain
6. **Parallel Sub-Issues** - Execute independently with DAG
7. **Main Issue Orchestration** - Run 6-phase protocol
8. **Gap Analysis** - Complete any missing acceptance criteria
9. **Confluence Docs** - Create 4+ pages (design, implementation, tests, runbook)
10. **Commit & PR** - Smart commit with tracking
11. **Jira Comments** - Post milestones: start, sub-count, agents, phase completions, PR, transitions, summary
12. **Final Summary** - Audit trail with metrics

## Success Criteria

- All 6 phases executed
- Test coverage >= 80%
- All acceptance criteria met
- **Confluence docs: 4+ pages (TDD, Implementation, Test Plan, Runbook)**
- **Hub page created linking all documentation**
- **PR includes "## Documentation" section with Confluence links**
- All sub-items documented
- PR created and merged
- All issues transitioned to QA
- Gap analysis completed

## PR Documentation Section (Required)

PRs MUST include this section with Confluence links:

```markdown
## Documentation

### Confluence Pages
| Document | Link | Status |
|----------|------|--------|
| Technical Design | [View](confluence-url) | ✅ Complete |
| Implementation Notes | [View](confluence-url) | ✅ Complete |
| Test Plan & Results | [View](confluence-url) | ✅ Complete |
| Runbook | [View](confluence-url) | ✅ Complete |

### Hub Page
[{ISSUE-KEY} - {Feature Name}](confluence-hub-url)

### Related Documentation
- [Architecture Decision Record](confluence-url) (if applicable)
- [API Documentation](confluence-url) (if applicable)
```

## Documentation Output

| Phase | Document Type |
|-------|---------------|
| PLAN | Technical Design (architecture, APIs, decisions) |
| CODE | Implementation Notes (patterns, integrations) |
| TEST | Test Results (coverage, strategy) |
| DOCUMENT | Runbook (operations, troubleshooting) |

## Usage

```bash
/jira:work ABC-123                    # Work on issue
/jira:work PROJ-456 --preset thorough # With preset (speed-run|thorough|enterprise|hotfix)
/jira:work DEV-789 --dry-run          # Preview only
/jira:work EPIC-1 --parallel 5        # Max 5 parallel agents
/jira:work TASK-2 --checkpoint        # Save progress checkpoints
```

## Jira Milestones Posted

1. Start orchestration
2. Sub-issues detected (count)
3. Expert agents assigned
4. Each phase completion with Confluence links
5. PR created and linked
6. Sub-items documented
7. Items transitioned to QA
8. Final summary with metrics

**⚓ Golden Armada** | *You ask - The Fleet Ships*
