---
name: jira:work
description: Start working on a Jira issue with full orchestration - processes sub-issues in parallel first, then main task, with expert agent assignment and comprehensive documentation
arguments:
  - name: issue_key
    description: The Jira issue key (e.g., ABC-123)
    required: true
flags:
  global: [--verbose, --quiet, --json, --dry-run, --interactive, --yes, --timeout, --config, --profile, --preset, --debug]
  orchestration: [--agents, --model, --model-strategy, --parallel, --sequential, --phases, --skip-phases, --checkpoint, --resume]
  jira: [--project, --assignee, --labels, --priority, --sprint, --epic]
  review: [--depth, --focus, --council, --council-size, --council-protocol, --min-coverage, --auto-fix]
  git: [--branch-prefix, --from-branch, --commit-style, --draft, --reviewers, --auto-merge]
  notification: [--notify, --slack-channel, --notify-on-complete]
  report: [--report, --report-format, --report-to-confluence, --report-to-obsidian]
presets: [speed-run, thorough, enterprise, hotfix, prototype, pair-programming, security-audit]
version: 2.1.0
---

> **📚 Flag Documentation:** See [FLAGS.md](../docs/FLAGS.md) for complete flag reference
>
> **⚡ Quick Presets:**
> - `--preset speed-run` - Fast execution for simple tasks
> - `--preset thorough` - Deep analysis with council review
> - `--preset enterprise` - Full compliance workflow
> - `--preset hotfix` - Emergency rapid deployment

# Jira Issue Orchestration (Enhanced v2.0)

You are initiating work on a **Jira issue** with full orchestration. This enhanced workflow:
1. **Detects sub-issues first** and works them before the main issue
2. **Applies tags** to issues and sub-issues for tracking
3. **Executes sub-issues in parallel** when they have no dependencies
4. **Uses expert agents** most viable for each sub-task domain
5. **Creates Confluence documentation** after sub-issues complete
6. **Posts commit tracking comments** on all issues with Confluence references

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:work - {duration}`

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

## Issue Details

**Issue Key:** ${issue_key}

---

## MANDATORY DEVELOPMENT STANDARDS

**CRITICAL:** All work MUST comply with [Development Standards](../docs/DEVELOPMENT-STANDARDS.md).

### PR-Only Workflow (ENFORCED)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ❌ DIRECT COMMITS TO MAIN ARE BLOCKED                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ALL changes MUST go through Pull Requests:                                │
│                                                                             │
│   1. Create feature branch: feature/${issue_key}-description                │
│   2. Make changes on feature branch                                         │
│   3. Create PR via /jira:pr command                                         │
│   4. Get approval (minimum 1 reviewer)                                      │
│   5. Merge via GitHub/Harness (squash preferred)                            │
│                                                                             │
│   ❌ NEVER: git push origin main                                            │
│   ✅ ALWAYS: Create PR, get approval, merge                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Quality Requirements

| Requirement | Standard | Enforcement |
|-------------|----------|-------------|
| SOLID Principles | MANDATORY | Code review |
| Test Coverage | >= 80% | CI/CD block |
| Clean Code | Required | Linting + review |
| Documentation | Required | PR template |

### Deployment Standards

| Environment | Method | Docker Compose |
|-------------|--------|----------------|
| Local Dev | Docker Compose | ✅ Allowed |
| Development | Helm + K8s | ❌ Forbidden |
| Staging | Helm + K8s | ❌ Forbidden |
| Production | Helm + K8s | ❌ Forbidden |

### Sub-Agent & Git Worktrees

For complex tasks (multiple sub-issues):
- **REQUIRED:** Use git worktrees for parallel development
- **REQUIRED:** Spawn sub-agents per worktree
- **MINIMUM:** 3-5 sub-agents per task

See [Development Standards](../docs/DEVELOPMENT-STANDARDS.md) for full requirements.

---

## ENHANCED WORKFLOW OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENHANCED WORK COMMAND v2.0                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: VALIDATE & FETCH          ─→  Validate issue, fetch details        │
│                  ↓                                                          │
│  Step 2: TRANSITION TO IN PROGRESS ─→  Update Jira status                   │
│                  ↓                                                          │
│  Step 2.5: TAG MANAGEMENT (NEW)    ─→  Apply domain/status/type tags        │
│                  ↓                                                          │
│  Step 2.6: SUB-ISSUE DETECTION     ─→  Discover all subtasks & linked       │
│                  ↓                                                          │
│  Step 2.7: EXPERT AGENT MATCHING   ─→  Select best experts per sub-issue    │
│                  ↓                                                          │
│  Step 2.8: PARALLEL SUB-ISSUE WORK ─→  Execute sub-issues (parallel DAG)    │
│                  ↓                                                          │
│  Step 3: MAIN ISSUE ORCHESTRATION  ─→  6-phase protocol on main task        │
│                  ↓                                                          │
│  Step 4-9: STANDARD PHASES         ─→  EXPLORE→PLAN→CODE→TEST→FIX→DOCUMENT  │
│                  ↓                                                          │
│  Step 10: COMPLETION FLOW (NEW)    ─→  Gap analysis, fix gaps               │
│                  ↓                                                          │
│  Step 11: CONFLUENCE DOCS (NEW)    ─→  Create full documentation            │
│                  ↓                                                          │
│  Step 12: COMMIT & PR              ─→  Smart commit with tracking           │
│                  ↓                                                          │
│  Step 13: ISSUE COMMENTS (NEW)     ─→  Post commit info + Confluence refs   │
│                  ↓                                                          │
│  Step 14: FINAL SUMMARY            ─→  Complete traceability report         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Validate and Fetch Issue

First, validate the issue key format and fetch the issue from Jira.

### Actions:
```
1. Validate issue key matches pattern: [A-Z]+-[0-9]+ (e.g., ABC-123, PROJ-456)
2. If invalid format, respond with error and exit
3. Use mcp__atlassian__jira_get_issue with issue_key parameter
4. Extract all relevant fields:
   - summary: Issue title
   - description: Full description
   - issuetype: Bug, Story, Task, Epic, etc.
   - status: Current status
   - priority: Issue priority
   - assignee: Assigned user
   - reporter: Reporter
   - labels: All labels
   - components: Components
   - fixVersions: Target versions
   - customfield_*: Story points, acceptance criteria, etc.
   - subtasks: All subtasks
   - parent: Parent issue if exists
5. If issue not found, respond with error and exit
```

## Step 2: Update Jira Status to "In Progress"

Before starting work, transition the issue to "In Progress".

### Actions:
```
1. Use mcp__atlassian__jira_transition_issue
2. Set status to "In Progress"
3. Add initial comment: "Starting orchestrated development with Claude Code"
```

---

## Step 2.5: Tag Management (NEW - MANDATORY)

**IMPORTANT:** Apply tags to the parent issue and all sub-issues for tracking. Tags that don't exist will be CREATED automatically.

### Actions:
```
1. FIRST: Initialize project tags if not already done
   - Check if project has standard tags initialized
   - If not, invoke tag-manager with operation: "initialize-project-tags"
   - This creates all standard domain/status/type tags in the project
   - Creates a "[System] Tag Management" reference issue to hold the tags

2. Invoke the `tag-manager` agent with:
   - issue_key: ${issue_key}
   - operation: "auto-detect-and-apply"
   - auto_create: true  # CREATE tags if they don't exist

3. The agent will:
   a. Analyze the issue description, acceptance criteria, and components
   b. Auto-detect relevant domain tags:
      - domain:frontend (if React, components, UI)
      - domain:backend (if API, services)
      - domain:database (if Prisma, migrations)
      - domain:testing (if test files involved)
      - domain:devops (if CI/CD, infrastructure)
      - domain:security (if auth, encryption)

   c. Apply status tags:
      - status:in-progress (initial)

   d. Apply type tags:
      - type:feature (for Stories)
      - type:bug (for Bugs)
      - type:task (for Tasks)
      - type:refactor (for Refactor tasks)

3. Sync tags to all sub-issues:
   - Domain tags propagate to children
   - Children inherit parent's type tags (if not set)
   - Status tags are independent per issue

4. Post comment: "Tags applied: [list of tags]"
```

### Tag Schema:
```yaml
tag_categories:
  domain:
    prefix: "domain:"
    values: [frontend, backend, database, devops, testing, docs, security, performance, api, infrastructure]
    propagate_to_children: true
    auto_create: true  # Create if doesn't exist

  status:
    prefix: "status:"
    values: [in-progress, completed, reviewed, tested, deployed, blocked, needs-review, sub-issues-complete]
    propagate_to_children: false
    auto_create: true

  type:
    prefix: "type:"
    values: [feature, bug, task, refactor, enhancement, hotfix, chore, documentation]
    propagate_to_children: true (if child has no type)
    auto_create: true

  custom:
    prefix: "custom:"
    values: []  # User-defined tags
    auto_create: true

tag_creation:
  enabled: true
  strategy: "reference-issue"  # Create tags by adding to reference issue
  reference_issue_title: "[System] Tag Management - DO NOT DELETE"
  initialize_on_first_use: true
```

---

## Step 2.6: Sub-Issue Detection (NEW - MANDATORY)

**IMPORTANT:** Discover all sub-issues before starting work. Sub-issues are worked FIRST.

### Actions:
```
1. Fetch subtasks from parent issue:
   - parent.fields.subtasks → array of subtask keys

2. Fetch linked issues:
   - Use JQL: issue in linkedIssues(${issue_key})
   - Filter by link types: "blocks", "is blocked by", "relates to"

3. Build sub-issue registry:
   {
     "parent_key": "${issue_key}",
     "sub_issues": [
       {
         "key": "PROJ-124",
         "summary": "Implement login form",
         "type": "Sub-task",
         "status": "To Do",
         "priority": "High",
         "labels": ["frontend", "auth"],
         "link_type": "subtask"
       },
       // ... more sub-issues
     ],
     "total_count": 5
   }

4. If sub-issues found → Proceed to Step 2.7 (Expert Agent Matching)
   If no sub-issues → Skip to Step 3 (Main Issue Orchestration)

5. Post comment: "Discovered {count} sub-issues to work first"
```

### Sub-Issue Priority:
```yaml
execution_priority:
  1. Subtasks (highest - direct children)
  2. "Blocks" linked issues (must complete first)
  3. "Is blocked by" issues (dependencies)
  4. "Relates to" issues (lowest - optional)
```

---

## Step 2.7: Expert Agent Matching (NEW - MANDATORY)

**IMPORTANT:** For each sub-issue, select the MOST VIABLE expert agents.

### Actions:
```
1. For each sub-issue, invoke the `expert-agent-matcher` agent:

   for sub_issue in sub_issues:
     expert_match = invoke_agent('expert-agent-matcher', {
       issue_key: sub_issue.key,
       issue_summary: sub_issue.summary,
       issue_labels: sub_issue.labels,
       planned_files: analyze_expected_files(sub_issue),
       required_capabilities: extract_capabilities(sub_issue.description)
     })

     sub_issue.assigned_experts = expert_match.recommended_experts
     sub_issue.expert_rationale = expert_match.rationale

2. Expert Matching Algorithm (50-25-15-10 weights):
   - Domain Expertise (50%): Primary domain match, capability breadth
   - Technology Match (25%): Exact tech/framework matches
   - File Pattern Match (15%): Extension and path matching
   - Historical Performance (10%): Success rate on similar tasks

3. Expert Selection Output per Sub-Issue:
   {
     "sub_issue": "PROJ-124",
     "recommended_experts": [
       {
         "name": "react-component-architect",
         "score": 95,
         "rationale": "Matched: frontend domain, .tsx files, React keyword",
         "model": "sonnet"
       },
       {
         "name": "accessibility-expert",
         "score": 82,
         "rationale": "Secondary: UI component requires a11y review",
         "model": "haiku"
       }
     ],
     "confidence": "High"
   }

4. Post comment on parent: "Expert agents assigned to {count} sub-issues"
```

### Expert Categories:
```yaml
expert_domains:
  frontend:
    primary: [react-component-architect, nextjs-specialist, accessibility-expert]
    secondary: [theme-builder, mobile-ux-optimizer]

  backend:
    primary: [api-integration-specialist, code-architect]
    secondary: [graphql-specialist, redis-specialist]

  database:
    primary: [prisma-specialist, mongodb-schema-designer]
    secondary: [database-performance-optimizer]

  authentication:
    primary: [keycloak-identity-specialist, keycloak-auth-flow-designer]
    secondary: [enterprise-security-reviewer]

  testing:
    primary: [test-writer-fixer, vitest-specialist]
    secondary: [coverage-analyzer, selenium-test-architect]

  devops:
    primary: [k8s-deployer, helm-chart-developer, docker-builder]
    secondary: [cicd-engineer, gitops-specialist]
```

---

## Step 2.8: Parallel Sub-Issue Work (NEW - MANDATORY)

**IMPORTANT:** Work ALL sub-issues FIRST before the main task. Execute in parallel where possible.

### Actions:
```
1. Invoke the `parallel-sub-issue-worker` agent:

   parallel_result = invoke_agent('parallel-sub-issue-worker', {
     parent_key: ${issue_key},
     sub_issues: sub_issue_registry.sub_issues,
     expert_assignments: expert_match_results,
     execution_mode: "parallel-dag"
   })

2. The agent will:
   a. Analyze dependencies between sub-issues:
      - Explicit: Jira links (blocks, depends on)
      - File-based: Detect shared file modifications
      - Semantic: Layer dependencies (DB → API → UI)

   b. Build DAG (Directed Acyclic Graph):
      - Level 0: No dependencies (can run in parallel)
      - Level 1: Depends on Level 0 completion
      - Level 2: Depends on Level 1 completion
      - etc.

   c. Execute in parallel respecting DAG:
      - Spawn Task agents for Level 0 sub-issues in parallel
      - Wait for Level 0 completion
      - Spawn Task agents for Level 1 sub-issues in parallel
      - Continue until all levels complete

   d. Each sub-issue execution uses:
      - The expert agents assigned in Step 2.7
      - 6-phase protocol (EXPLORE→PLAN→CODE→TEST→FIX→DOCUMENT)
      - Progress reporting to parent issue

3. Track progress:
   - Post updates every 5 minutes to parent issue
   - Track: in_progress, completed, failed counts
   - Calculate parallelism efficiency

4. On completion of all sub-issues:
   - Post summary: "All {count} sub-issues completed"
   - Trigger: Step 3 (Main Issue Orchestration)
```

### Parallel Execution Example:
```
Parent: PROJ-123 "Implement OAuth2 Login"
  │
  ├── Level 0 (parallel):
  │     ├── PROJ-124: "Database schema for users" (prisma-specialist)
  │     └── PROJ-127: "Design login UI mockup" (ux-researcher)
  │
  ├── Level 1 (parallel, after Level 0):
  │     ├── PROJ-125: "Implement Keycloak integration" (keycloak-identity-specialist)
  │     └── PROJ-128: "Create LoginForm component" (react-component-architect)
  │
  └── Level 2 (after Level 1):
        └── PROJ-126: "Integration tests for auth flow" (test-writer-fixer)
```

### Post-Sub-Issue Actions:
```
After all sub-issues complete:
1. Apply status tag: "status:sub-issues-complete"
2. Collect all commits from sub-issues
3. Aggregate file changes
4. Prepare for main issue evaluation
```

---

## Step 3: Main Issue Orchestration (After Sub-Issues)

Based on the issue type, create an appropriate orchestration strategy.

### Dynamic Agent Selection (NEW)

**IMPORTANT:** Before executing any phase, invoke the `agent-router` agent to dynamically select specialized agents from the main registry based on:

1. **Jira Context**: Issue labels, components, issue type
2. **File Patterns**: Extensions and paths of files to be modified
3. **Task Keywords**: Terms from description and acceptance criteria

```yaml
# Invoke agent-router for each phase
agent_selection = invoke_agent('agent-router', {
  issue_key: ${issue_key},
  phase: "CODE",  # or EXPLORE, PLAN, TEST, FIX, DOCUMENT
  changed_files: get_planned_changes(),  # from git diff or plan
  model_filter: "sonnet"  # or "haiku" for fast tasks
})

# Use dynamically selected agents
for agent in agent_selection.recommended_agents:
  spawn_agent(agent.name, task=phase_task)
```

**Configuration:** See `jira-orchestrator/config/file-agent-mapping.yaml` for domain definitions and scoring weights.

**Fallback Strategy:** If no specific agents match, use phase-appropriate defaults from agent-router output.

### AutoGen-Style Team Activation (NEW - RECOMMENDED)

**IMPORTANT:** For complex issues, activate full agent TEAMS instead of individual agents.

Teams provide coordinated multi-agent collaboration with defined leads and communication patterns.
See `jira-orchestrator/config/agent-teams.yaml` for full team configuration.

#### Team Activation by Phase:

| Phase | Primary Team | Call Sign | Lead Agent |
|-------|--------------|-----------|------------|
| EXPLORE | Documentation Guild | DOCS-1 | Archivist |
| PLAN | Code Strike Team | STRIKE-1 | Genesis |
| CODE | Code Strike Team | STRIKE-1 | Genesis |
| TEST | Quality Council | COUNCIL-Q | Paramount |
| FIX | Debug Squadron | DEBUG-1 | Sleuth |
| DOCUMENT | Documentation Guild | DOCS-1 | Archivist |

#### Team Activation by Issue Type:

| Issue Type | Primary Team | Pattern | Description |
|------------|--------------|---------|-------------|
| Initiative | Atlassian Ops (JIRA-1) | swarm | Strategic initiatives spanning epics |
| Epic | Atlassian Ops (JIRA-1) | swarm | Large features → stories |
| Story | Code Strike (STRIKE-1) | hierarchical | User-facing features |
| Task | Code Strike (STRIKE-1) | hierarchical | Technical work items |
| Sub-task | Code Strike (STRIKE-1) | pipeline | Granular work (inherits parent) |
| Bug | Debug Squadron (DEBUG-1) | pipeline | Defects and fixes |
| Spike | Documentation Guild (DOCS-1) | broadcast | Research & investigation |
| Technical-Debt | Migration Convoy (MIGRATE-1) | pipeline | Refactoring work |
| Security | Security Tribunal (SEC-1) | debate | Security hardening |

#### Domain-Specific Teams (activated by labels/components):

| Domain | Team | Call Sign | When to Activate |
|--------|------|-----------|------------------|
| Frontend | Frontend Forge | UI-1 | `domain:frontend`, `tech:react` |
| Mobile | Mobile Force | MOBILE-1 | `domain:mobile`, `tech:react-native` |
| Auth | Identity Vault | AUTH-1 | `domain:security`, `tech:keycloak` |
| Data/ML | Data Pipeline | DATA-1 | `domain:database`, `tech:mongodb` |
| DevOps | Ship Crew | SHIP-1 | `domain:devops`, `tech:kubernetes` |
| Security | Security Tribunal | SEC-1 | `needs:security-review` |
| Messaging | Messaging Hub | MSG-1 | `tech:kafka`, `tech:rabbitmq` |

#### Team Activation Example:

```yaml
# For a Story with labels: [domain:frontend, tech:react, needs:review]

1. Load teams config: jira-orchestrator/config/agent-teams.yaml
2. Match labels against label_teams:
   - domain:frontend → frontend-forge (UI-1)
   - needs:review → pr-review-panel (REVIEW-1)
3. Activate teams for CODE phase:
   - Primary: code-strike (STRIKE-1) - Genesis leads
   - Domain: frontend-forge (UI-1) - Weaver leads
4. Execute with team coordination:
   - Genesis (STRIKE-1 lead) coordinates with Weaver (UI-1 lead)
   - Team members work in parallel per team pattern
   - Checkpoint sync between teams
```

#### Team Communication Patterns:

| Pattern | Description | Best For |
|---------|-------------|----------|
| hierarchical | Lead coordinates all | Feature development |
| round-robin | Sequential contributions | Code review |
| broadcast | Parallel execution | Documentation |
| debate | Discussion with voting | Quality decisions |
| pipeline | Sequential transformation | Bug fixing |
| swarm | Self-organizing | Complex epics |

**Configuration:** See `.claude/registry/teams.index.json` for full team definitions.

### NEW: PR Size Strategy (After PLAN phase)

**IMPORTANT:** Before starting CODE phase, invoke the `pr-size-estimator` agent to:
1. Analyze the scope based on sub-items
2. Estimate total PR size
3. Create splitting strategy if >400 lines expected
4. Post PR strategy to Jira

This prevents massive, overwhelming PRs by planning incremental delivery upfront.

```
If estimated size < 400 lines:
  → Single PR strategy (proceed normally)

If estimated size 400-800 lines:
  → Split into 2-3 PRs (checkpoint PRs during CODE)

If estimated size > 800 lines:
  → Split into 3+ PRs (one per sub-item group)
```

### Issue Type Strategies:

#### For Bugs:
```
EXPLORE (2 agents):
  - bug-detective: Reproduce the bug, analyze logs, identify root cause
  - impact-analyst: Assess scope of impact, check for similar issues

PLAN (1 agent):
  - fix-strategist: Design fix approach, minimal changes

CODE (2 agents):
  - bug-fixer: Implement fix
  - regression-tester: Add regression test

TEST (2 agents):
  - test-runner: Verify bug is fixed
  - edge-case-validator: Test edge cases

FIX (1 agent):
  - debugger: Address any test failures

DOCUMENT (1 agent):
  - documentation-expert: Update changelog, add root cause to Obsidian vault
```

#### For Stories/Features:
```
EXPLORE (3 agents):
  - requirements-analyst: Parse acceptance criteria, clarify requirements
  - code-explorer: Understand existing codebase
  - research-agent: Gather library/framework docs via Context7

PLAN (2 agents):
  - architect: Design solution architecture
  - task-decomposer: Break into implementation tasks

CODE (3-4 agents) - DYNAMIC SELECTION:
  # Invoke agent-router based on planned changes
  code_agents = agent_router.select(phase="CODE", files=planned_changes)

  # Example selections based on context:
  # Frontend changes (*.tsx): react-component-architect, accessibility-expert
  # Database changes (*.prisma): prisma-specialist, database-specialist
  # API changes (api/**/*.ts): api-integration-specialist, graphql-specialist
  # Mixed changes: Multiple domain specialists in parallel

  # Fallback agents if no specific match:
  - code-architect: General architecture
  - test-writer-fixer: Write tests alongside code

TEST (3 agents):
  - test-runner: Execute full test suite
  - coverage-analyst: Measure coverage
  - acceptance-validator: Verify acceptance criteria met

FIX (2 agents):
  - debugger: Diagnose failures
  - fixer: Implement fixes

DOCUMENT (2 agents):
  - documentation-expert: Update docs, README, ADRs
  - vault-syncer: Sync to Obsidian vault
```

#### For Tasks:
```
EXPLORE (2 agents):
  - task-analyst: Understand requirements
  - code-explorer: Analyze relevant code

PLAN (1 agent):
  - planner: Create execution plan

CODE (2 agents):
  - implementer: Execute the task
  - validator: Verify implementation

TEST (2 agents):
  - test-runner: Run tests
  - quality-checker: Verify quality standards

FIX (1 agent):
  - fixer: Address issues

DOCUMENT (1 agent):
  - documentation-expert: Update documentation
```

## Step 4: Execute 6-Phase Protocol

Run the mandatory orchestration protocol with the agents defined above.

### Mandatory Protocol:
```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

### Phase Execution Guidelines:

**DOCUMENTATION REQUIREMENT:** At each phase completion:
1. Create/update Confluence documentation via `confluence-documentation-creator` agent
2. Log phase completion to PR comments via `pr-documentation-logger` agent
3. Post update to Jira issue with Confluence links

---

#### Phase 1: EXPLORE
```
Spawn appropriate agents based on issue type
Extract all requirements from Jira issue:
  - Description
  - Acceptance criteria
  - Story points
  - Labels and components
  - Related issues and subtasks
Understand codebase context
Identify dependencies and risks
Document findings

📚 CONFLUENCE: Search for existing documentation
📝 JIRA: Post "Exploration complete" comment with findings
📋 PR LOG: "Phase 1: EXPLORE completed - {summary}"
```

#### Phase 2: PLAN
```
Create detailed execution plan
Break down into tasks with dependencies
Create task DAG for parallel execution
Assign agents to tasks
Define checkpoints and success criteria
Post plan summary as Jira comment

📚 CONFLUENCE: Create "Technical Design Document" page
   - Architecture overview
   - Component design
   - Data models
   - API specifications
   - Security considerations
   - Link to Jira issue: ${issue_key}
📝 JIRA: Post "Technical Design created: [Title](confluence_url)"
📋 PR LOG: "Phase 2: PLAN completed - Technical Design: {url}"
```

#### Phase 2.5: PR SIZE ESTIMATION (NEW - After PLAN, Before CODE)
```
Invoke pr-size-estimator agent:
  - Analyze sub-item complexity
  - Estimate lines per component
  - Calculate total expected size

If estimated > 400 lines:
  - Create splitting strategy
  - Map sub-items to PRs
  - Define merge order

Post PR strategy to Jira:
  - Estimated total size
  - Splitting strategy (if applicable)
  - PR plan with dependencies

📝 JIRA: Post "PR Strategy: {strategy_type} - {pr_count} PRs planned"
```

#### Phase 2.6: CREATE DRAFT PR (NEW - Early Visibility)
```
Invoke draft-pr-manager agent:
  - Create draft PR immediately
  - Include progress checklist
  - Mark as [WIP]

Purpose:
  - Early visibility for stakeholders
  - Reviewers can watch progress
  - Catch design issues early
  - Reduce "big reveal" anxiety

📝 JIRA: Post "Draft PR created: {pr_url} [DRAFT]"
```

#### Phase 3: CODE
```
🔀 DYNAMIC AGENT SELECTION (MANDATORY):
  1. Invoke agent-router with:
     - issue_key: ${issue_key}
     - phase: "CODE"
     - changed_files: $(git diff --cached --name-only) OR planned_changes
     - model_filter: "sonnet"
  2. Use recommended_agents from agent-router output
  3. Spawn selected specialists in parallel for each domain
  4. Fallback to code-architect if no specific match

Execute implementation tasks in parallel where possible
Write tests alongside code (using selected test specialist)
Commit frequently with clear messages
Reference issue key in commits: "ABC-123: Description"
Handle edge cases and error states
Validate against acceptance criteria continuously

📦 CHECKPOINT PRs (If multi-PR strategy):
   After each sub-item group completes:
   - Invoke checkpoint-pr-manager agent
   - Create draft PR for completed slice
   - Post PR URL to Jira
   - Continue with next sub-item group

   This keeps PRs small and reviewable:
   - Each checkpoint PR < 400 lines
   - Reviewers can start early
   - Merge order follows dependencies

📚 CONFLUENCE: Create "Implementation Notes" page
   - Architecture decisions
   - Key abstractions
   - Integration points
   - Configuration details
   - Link to PR: {pr_url}
📝 JIRA: Post "Implementation started - see [Implementation Notes](confluence_url)"
📋 PR LOG: "Phase 3: CODE completed - {files_changed} files, {lines} lines"
🔄 DRAFT PR: Update progress (every 5 commits)
```

#### Phase 4: TEST
```
🔀 DYNAMIC AGENT SELECTION:
  test_agents = agent_router.select(phase="TEST", files=modified_files)
  # Selects: test-writer-fixer, vitest-specialist, coverage-analyzer, etc.

Run full test suite
Measure code coverage (target 80%+ for new code)
Run security scans if applicable
Validate acceptance criteria from Jira
Document test results
Post test status as Jira comment

📚 CONFLUENCE: Create "Test Plan & Results" page
   - Test strategy
   - Test cases covered
   - Coverage report: {percentage}%
   - Performance results
   - Edge cases tested
   - Link to PR checks
📝 JIRA: Post "Tests: {pass}/{total}, Coverage: {coverage}% - see [Test Results](confluence_url)"
📋 PR LOG: "Phase 4: TEST completed - {pass}/{total} passing, {coverage}% coverage"
```

#### Phase 5: FIX
```
Address all test failures
Fix security vulnerabilities
Address coverage gaps
Optimize performance if needed
Re-run tests after each fix
Verify no regressions

📚 CONFLUENCE: Update "Test Plan & Results" with fix details
📝 JIRA: Post "Issues resolved: {count} - all tests passing"
📋 PR LOG: "Phase 5: FIX completed - {issues_fixed} issues resolved"
```

#### Phase 6: DOCUMENT
```
Update README and docs
Create ADRs for architectural decisions
Sync documentation to Obsidian vault:
  Path: C:\Users\MarkusAhling\obsidian\Repositories\{org}\{repo}\Issues\${issue_key}.md
Document:
  - Issue summary
  - Solution approach
  - Implementation details
  - Testing results
  - Lessons learned
Prepare final commit message

📚 CONFLUENCE: Create "Runbook/Operations Guide" page
   - Deployment procedures
   - Monitoring setup
   - Troubleshooting guide
   - Rollback procedures
   - Contact information
📚 CONFLUENCE: Update "Release Notes" for this feature
📝 JIRA: Post "Documentation complete - [Technical Design](url) | [Runbook](url) | [Test Results](url)"
📋 PR LOG: "Phase 6: DOCUMENT completed - 4 Confluence pages created"
```

## Step 5: Create Pull Request

Once all phases are complete and tests pass, create a PR.

### Actions:
```
1. Ensure all changes are committed
2. Create feature branch if not already on one: feature/${issue_key}-{description}
3. Push to remote with -u flag
4. Use gh pr create with:
   - Title: "${issue_key}: ${summary}"
   - Body format:
     ## Summary
     - Brief description of changes
     - References Jira issue: ${issue_key}

     ## Acceptance Criteria Met
     - [ ] Criterion 1
     - [ ] Criterion 2

     ## Testing
     - [ ] All tests passing
     - [ ] Coverage meets threshold
     - [ ] Manual testing completed

     ## Related Issues
     - Jira: ${issue_key}

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
5. Capture PR URL from output
```

## Step 6: Update Jira Issue (Initial)

Link the PR and post initial update.

### Actions:
```
1. Use mcp__atlassian__jira_add_comment to post:
   "Pull request created: {PR_URL}

   Implementation complete:
   - All acceptance criteria met
   - Tests passing
   - Documentation updated

   Proceeding with QA transition and sub-item documentation..."
```

## Step 7: Document All Sub-Items (MANDATORY)

After PR creation, document implementation details on ALL sub-tasks and linked issues.

### Actions:
```
1. Invoke the `sub-item-documenter` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - Branch name: {branch_name}

2. The agent will:
   - Fetch all subtasks from the parent issue
   - Fetch all linked issues (blocks, relates to, etc.)
   - For EACH sub-item, post a detailed comment:

   ## Implementation Complete ✅

   **PR:** {PR_URL}
   **Branch:** {branch_name}

   ### Changes Made
   - {specific changes for this sub-item}

   ### Files Modified
   - `path/to/file1.ts`
   - `path/to/file2.ts`

   ### Testing
   - Unit tests: ✅ Passing
   - Integration tests: ✅ Passing
   - Coverage: {X}%

   ### Related Commits
   - {commit_hash}: {message}

   ---
   🤖 Documented by Claude Code Orchestrator

3. Track documentation progress:
   - Log each sub-item documented
   - Handle failures gracefully (continue with others)
   - Report final count
```

## Step 8: Transition ALL Items to QA (MANDATORY)

Transition the main issue AND all sub-items to QA status.

### Actions:
```
1. Invoke the `qa-transition` agent with:
   - Parent issue key: ${issue_key}
   - Include subtasks: true
   - Include linked issues: true

2. The agent will:
   - Find available QA transitions for each issue
   - Handle different QA status names (QA, Ready for QA, In QA, Testing, etc.)
   - Transition the PARENT issue to QA
   - Transition ALL subtasks to QA
   - Transition linked issues to QA (if appropriate)

3. Status Mapping:
   - "QA" (preferred)
   - "Ready for QA"
   - "In QA"
   - "Quality Assurance"
   - "Testing"

4. Handle failures:
   - Log issues that couldn't be transitioned
   - Continue with remaining items
   - Report which transitions failed (may need manual update)

5. Post QA transition comment on parent:
   "🔄 QA Transition Complete

   Main issue: ${issue_key} → QA ✅
   Sub-items transitioned: {count}/{total}

   All items are now ready for quality assurance review."
```

## Step 9: Final Completion Summary

Post final summary and verify all completion criteria.

### Actions:
```
1. Use mcp__atlassian__jira_add_comment on parent issue to post:
   "## 🎉 Development Complete - Ready for QA

   **Pull Request:** {PR_URL}
   **Branch:** {branch_name}

   ### Completion Summary
   | Phase | Status |
   |-------|--------|
   | Explore | ✅ Complete |
   | Plan | ✅ Complete |
   | Code | ✅ Complete |
   | Test | ✅ All Passing ({test_count} tests) |
   | Fix | ✅ No Issues |
   | Document | ✅ Complete |

   ### Sub-Items Status
   | Issue | Documented | QA Status |
   |-------|------------|-----------|
   | {SUBTASK-1} | ✅ | ✅ QA |
   | {SUBTASK-2} | ✅ | ✅ QA |

   ### Test Coverage
   - Coverage: {coverage}%
   - New tests: {new_test_count}

   ### What's Next
   This issue and all sub-items are now in **QA** status.
   Please review the PR and run QA validation.

   ---
   🤖 Orchestrated by Claude Code | Total agents: {agent_count}
   ⏱️ Development time: {duration}"

2. Verify completion checklist:
   - [ ] PR created and linked
   - [ ] All sub-items documented
   - [ ] Main issue in QA
   - [ ] All sub-items in QA
   - [ ] Obsidian vault updated
   - [ ] No pending errors
```

## Step 10: Create Review Roadmap (MANDATORY)

Break down the PR into bite-sized review tasks so reviewers can tackle small chunks at a time.

### Actions:
```
1. Invoke the `review-facilitator` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - All sub-item keys

2. The agent will:
   - Analyze PR complexity and lines changed
   - Group changes into reviewable chunks (5-15 min each)
   - Create a review roadmap on the parent issue

3. Review Roadmap Comment:
   "## 📖 Review Roadmap

   This PR is broken into **X reviewable chunks**.
   Total estimated review time: ~Y minutes

   ### Review Tasks (pick any to start!)
   | # | Sub-Item | Focus | Files | Est. Time | Complexity |
   |---|----------|-------|-------|-----------|------------|
   | 1 | PROJ-201 | Test cases | 3 | 5 min | 🟢 Quick |
   | 2 | PROJ-202 | Component | 4 | 10 min | 🟡 Standard |
   | 3 | PROJ-203 | API layer | 5 | 15 min | 🟡 Standard |
   | 4 | PROJ-204 | Error handling | 2 | 8 min | 🟢 Quick |

   ### How to Review
   1. **Pick any row** - you don't need to go in order!
   2. Open the sub-item to see the review checklist
   3. Review just those files (5-15 min max)
   4. Add comments on the PR or sub-item
   5. ✅ Check off items as you complete them

   **No need to review everything at once!**
   Each sub-item is independently reviewable."

4. Each sub-item already has (from sub-item-documenter):
   - 📋 Review Checklist (5-7 quick items)
   - ⏱️ Estimated review time
   - 🎯 Focus areas with file list
   - 📚 Suggested review order
   - ❓ Specific feedback questions

5. Complexity Categories:
   - 🟢 Quick (< 5 min): Config, small fixes, docs
   - 🟡 Standard (5-15 min): Features, components
   - 🔴 Deep (15-30 min): Architecture, complex logic
```

### Why Bite-Sized Reviews Matter:
```
- Reviewers can contribute in short time blocks
- Each sub-item is independently reviewable
- No need to understand entire PR at once
- Reduces review fatigue and improves quality
- Enables parallel reviews by multiple team members
- Clear progress tracking (X of Y chunks reviewed)
```

## Step 11: Final Documentation Summary (MANDATORY)

Post comprehensive documentation summary to PR and Jira with all Confluence links.

### Actions:
```
1. Invoke `pr-documentation-logger` agent to create final PR comment:

   "## 📚 Complete Documentation Trail

   ### Confluence Documentation Created
   | Document | Purpose | Link |
   |----------|---------|------|
   | Technical Design | Architecture & approach | [View]({url}) |
   | Implementation Notes | Code decisions & patterns | [View]({url}) |
   | Test Plan & Results | Testing strategy & coverage | [View]({url}) |
   | Runbook | Operations & troubleshooting | [View]({url}) |

   ### Jira Activity Log
   | Time | Action | Link |
   |------|--------|------|
   | {t1} | Started orchestration | [Comment]({url}) |
   | {t2} | EXPLORE complete | [Comment]({url}) |
   | {t3} | Technical Design created | [Confluence]({url}) |
   | {t4} | PLAN complete | [Comment]({url}) |
   | {t5} | CODE complete | [Comment]({url}) |
   | {t6} | TEST complete, 95% coverage | [Comment]({url}) |
   | {t7} | All issues → QA | [Comment]({url}) |
   | {t8} | Sub-items documented | [Comment]({url}) |

   ### Sub-Item Documentation
   | Issue | Documented | Confluence | QA |
   |-------|------------|------------|-----|
   | {SUB-1} | ✅ | [Notes]({url}) | ✅ |
   | {SUB-2} | ✅ | [Notes]({url}) | ✅ |
   | {SUB-3} | ✅ | [Notes]({url}) | ✅ |

   ### Metrics
   - **Confluence Pages Created:** 4
   - **Jira Comments Posted:** 12
   - **Sub-Items Documented:** {count}
   - **PR Comments:** 8
   - **Total Documentation Time:** {duration}

   ---
   🤖 Full audit trail maintained by Jira Orchestrator"

2. Post final summary to parent Jira issue:

   "## 📋 Complete Documentation Package

   All documentation has been created and linked:

   **Confluence:**
   - [Technical Design]({url}) - Architecture & specifications
   - [Implementation Notes]({url}) - Code decisions
   - [Test Plan & Results]({url}) - Testing strategy
   - [Runbook]({url}) - Operations guide

   **GitHub:**
   - [Pull Request]({pr_url}) - Full code changes
   - [PR Documentation Trail]({pr_comment_url}) - Complete audit log

   **Sub-Items:**
   All {count} sub-items have been documented with:
   - Implementation details
   - Review checklists
   - Confluence links

   ---
   Ready for QA review. All documentation is complete."

3. Update each sub-item with Confluence links:
   - Add comment with relevant Confluence page links
   - Reference parent documentation
```

## Step 12: Create Review Progress Dashboard (NEW)

Track review progress with a visual dashboard on the parent issue.

### Actions:
```
1. Invoke the `review-progress-tracker` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - All review task keys

2. The agent will create a dashboard:
   "## 📊 Review Progress Dashboard

   **Completion:** X of Y chunks (Z%)

   [████████░░░░░░░░░░░░] 40%

   | Status | Count |
   |--------|-------|
   | ✅ Reviewed | N |
   | 🔄 In Progress | N |
   | ⏳ Pending | N |

   ### Progress by Reviewer
   | Reviewer | Assigned | Done | Status |
   |----------|----------|------|--------|
   | @alice | 4 | 4 | ✅ Complete |
   | @bob | 3 | 1 | 🔄 Reviewing |

   📈 Dashboard auto-updates as reviews complete."

3. Dashboard benefits:
   - Real-time visibility into review progress
   - Identifies reviewers who need nudging
   - Calculates time to approval
   - Tracks velocity and bottlenecks
```

## Error Handling

Handle errors gracefully at each step:

### Invalid Issue Key Format:
```
If issue_key does not match pattern [A-Z]+-[0-9]+:
  Respond: "Invalid issue key format. Expected format: ABC-123 (project key + issue number)"
  Exit without making Jira API calls
```

### Issue Not Found:
```
If mcp__atlassian__jira_get_issue returns 404:
  Respond: "Issue ${issue_key} not found. Please verify the issue key and try again."
  Exit
```

### Transition Failures:
```
If status transition fails:
  Log warning
  Continue with orchestration
  Note in final comment that manual status update may be needed
```

### Test Failures:
```
If tests fail in TEST phase:
  Do NOT skip to DOCUMENT
  Execute FIX phase thoroughly
  Re-run TEST phase
  Only proceed when all tests pass
```

### PR Creation Failures:
```
If gh pr create fails:
  Log the error
  Add Jira comment with commit details
  Instruct user to create PR manually
  Provide the commit message and branch name
```

## Context Management

Track context usage throughout orchestration:

### Checkpointing:
```
Create checkpoints after each phase completion
Save checkpoint data to temp files
Post phase summaries as Jira comments for continuity
```

### Context Optimization:
```
If context exceeds 75%:
  Trigger context compression
  Archive phase outputs to Obsidian vault
  Keep only current phase context active
```

## Agent Limits

| Constraint | Value |
|------------|-------|
| **Minimum** | 3 agents |
| **Maximum** | 13 agents |
| **Typical Bug** | 5-7 agents |
| **Typical Story** | 7-10 agents |
| **Typical Task** | 4-6 agents |

## Model Assignment

Assign appropriate models based on task complexity:

| Model | Use For |
|-------|---------|
| **opus-4.5** | Complex architecture decisions, strategic planning (PLAN phase) |
| **sonnet-4.5** | Development, analysis, most CODE phase work |
| **haiku** | Documentation, simple tasks, status updates |

---

## Step 13: Completion Flow with Gap Analysis (NEW - MANDATORY)

**IMPORTANT:** After sub-issues and main issue work complete, run completion flow.

### Actions:
```
1. Invoke the `completion-flow-orchestrator` agent:

   completion_result = invoke_agent('completion-flow-orchestrator', {
     parent_key: ${issue_key},
     sub_issues: sub_issue_registry.sub_issues,
     pr_url: {PR_URL},
     branch_name: {branch_name}
   })

2. The agent will:

   a. EVALUATE COMPLETION:
      - Check all sub-issues status = "Done"
      - Verify acceptance criteria met
      - Validate test coverage >= 80%
      - Confirm documentation exists

   b. GAP ANALYSIS:
      For each criterion, check and identify gaps:

      | Criterion | Check | Gap Type |
      |-----------|-------|----------|
      | Tests passing | `npm test` or `pytest` | testing-gap |
      | Coverage >= 80% | Coverage report | coverage-gap |
      | Documentation | Confluence pages exist | documentation-gap |
      | Acceptance criteria | Jira AC checklist | acceptance-gap |
      | Code quality | Linting, no TODOs | quality-gap |

   c. FIX GAPS:
      For each identified gap:
      - Spawn appropriate agent to fix
      - Wait for completion
      - Re-evaluate

   d. TRIGGER CONFLUENCE DOCS:
      - Invoke confluence-manager for full documentation
      - Create: Technical Design, Implementation Notes, Test Results, Runbook
      - Link all pages to Jira issue

3. Output:
   {
     "completion_status": "complete",
     "gaps_found": 2,
     "gaps_fixed": 2,
     "confluence_pages": [
       { "title": "Technical Design", "url": "..." },
       { "title": "Implementation Notes", "url": "..." }
     ],
     "ready_for_commit": true
   }

4. Post comment: "Gap analysis complete: {gaps_found} found, {gaps_fixed} fixed"
```

### Gap Analysis Categories:
```yaml
gap_categories:
  critical:
    - Tests failing
    - Security vulnerability
    - Missing core functionality

  high:
    - Test coverage < 80%
    - Missing acceptance criteria
    - Missing error handling

  medium:
    - Missing documentation
    - Code quality issues
    - Performance concerns

  low:
    - Minor style issues
    - Optional enhancements
```

---

## Step 14: Commit Tracking & Issue Comments (NEW - MANDATORY)

**IMPORTANT:** Post detailed commit info on ALL issues with Confluence references.

### Actions:
```
1. Invoke the `commit-tracker` agent:

   tracking_result = invoke_agent('commit-tracker', {
     parent_key: ${issue_key},
     sub_issues: sub_issue_registry.sub_issues,
     branch_name: {branch_name},
     confluence_pages: completion_result.confluence_pages
   })

2. The agent will:

   a. COLLECT COMMITS:
      - Get all commits on branch: git log origin/{branch_name}
      - Extract: SHA, author, date, message, files changed

   b. MAP COMMITS TO ISSUES:
      For each commit, determine which issue it relates to:

      Mapping Strategy (priority order):
      1. Direct key match in commit message (PROJ-123)
      2. File path match against issue scope
      3. Temporal proximity to issue work period
      4. Semantic match (commit message ↔ issue summary)

   c. POST COMMENTS ON EACH ISSUE:

      For parent issue and each sub-issue, post:

      "## 🔧 Commit Tracking Report

      ### Commits for this Issue
      | Commit | Author | Files | Changes |
      |--------|--------|-------|---------|
      | [`a1b2c3d`]({github_url}) | @developer | 4 | +142/-23 |
      | [`e4f5g6h`]({github_url}) | @developer | 2 | +56/-12 |

      ### Files Changed
      | File | Status | Lines |
      |------|--------|-------|
      | `src/components/Login.tsx` | Modified | +98/-15 |
      | `src/services/auth.ts` | Added | +44 |
      | `tests/auth.test.ts` | Added | +56 |

      ### What Changed
      - Implemented OAuth2 login flow
      - Added JWT token handling
      - Created unit tests for auth service

      ### 📚 Documentation
      - [Technical Design]({confluence_url})
      - [Implementation Notes]({confluence_url})
      - [Test Results]({confluence_url})

      ### 🔗 Pull Request
      - [PR #{pr_number}]({pr_url}): {pr_title}

      ---
      🤖 Tracked by Jira Orchestrator | Commit Coverage: 100%"

3. BATCH PROCESSING for multiple commits:
   - Group commits by issue
   - Single comment per issue with all related commits
   - Include aggregate file changes

4. Output:
   {
     "issues_commented": 6,
     "commits_tracked": 12,
     "commit_coverage": "100%",
     "confluence_links_added": true
   }
```

### Comment Template Structure:
```yaml
comment_sections:
  header:
    - Issue completion status emoji (✅/⚠️/❌)
    - Report title

  commits_table:
    columns: [SHA (short, linked), Author, Files, +/- Lines]
    max_rows: 10 (truncate with "...and N more")

  files_table:
    columns: [File path, Status (Added/Modified/Deleted), Lines changed]
    group_by: file_type (source, test, config, docs)

  changes_summary:
    format: Bullet points
    extract_from: Commit messages
    max_points: 7

  documentation_links:
    include: All Confluence pages created
    format: Markdown links with titles

  pr_link:
    include: PR number, title, status
    format: Single link with description
```

---

## Success Criteria (Enhanced v2.0)

Orchestration is complete when:

### Phase Execution:
- [ ] All 6 phases executed successfully (EXPLORE → DOCUMENT)
- [ ] All sub-issues worked FIRST (via parallel-sub-issue-worker)
- [ ] Expert agents used for each domain (via expert-agent-matcher)
- [ ] Main issue evaluated and completed

### Quality:
- [ ] All tests passing
- [ ] All acceptance criteria met
- [ ] Gap analysis completed with all gaps fixed
- [ ] Code review completed (if required)

### Documentation:
- [ ] Confluence documentation created (4+ pages)
- [ ] Documentation updated in both repo and Obsidian vault
- [ ] All sub-items have Confluence links in comments

### Commits & PR:
- [ ] PR created and linked to Jira
- [ ] All commits tracked and mapped to issues
- [ ] Commit comments posted on ALL issues (parent + sub-issues)
- [ ] Confluence references in all issue comments

### Status:
- [ ] Tags applied to parent and all sub-issues
- [ ] **ALL sub-items documented** (with review checklists)
- [ ] **Main issue transitioned to QA**
- [ ] **ALL sub-items transitioned to QA**
- [ ] Final completion summary posted
- [ ] **Review roadmap posted** (bite-sized review tasks)
- [ ] No blockers remain

### Confluence Documentation Checklist:
- [ ] **Technical Design** page created (after PLAN)
- [ ] **Implementation Notes** page created (after CODE)
- [ ] **Test Plan & Results** page created (after TEST)
- [ ] **Runbook/Operations Guide** page created (after DOCUMENT)
- [ ] All pages linked to Jira issue
- [ ] All pages linked in PR comments

### PR Comment Logging Checklist:
- [ ] Phase completion logged for each phase (6 total)
- [ ] Confluence page links posted
- [ ] Final documentation summary posted
- [ ] Complete audit trail visible in PR

## Example Usage

```bash
# Work on a bug
/jira:work ABC-123

# Work on a story
/jira:work PROJ-456

# Work on a task
/jira:work DEV-789
```

## Integration with Other Commands

This command can be used in conjunction with:
- `/jira:sync` - Sync all issues before starting work
- `/jira:status` - Check orchestration status
- `/orchestration-resume` - Resume if interrupted

## Jira Comment Timeline

Post comments at key milestones (with Confluence links):

1. **Start**: "Starting orchestrated development with Claude Code"
2. **After EXPLORE**: "Exploration complete: {key findings}"
3. **After PLAN**: "Execution plan created - 📚 [Technical Design]({confluence_url})"
4. **After CODE**: "Implementation complete - 📚 [Implementation Notes]({confluence_url})"
5. **After TEST**: "Tests: {pass/fail count}, Coverage: {percentage}% - 📚 [Test Results]({confluence_url})"
6. **After FIX** (if needed): "All issues resolved, tests passing"
7. **After DOCUMENT**: "Documentation complete - 📚 [Runbook]({confluence_url})"
8. **PR Created**: "Pull request created: {URL}"
9. **Sub-Items Documented**: "Implementation documented on {count} sub-items (with Confluence links)"
10. **QA Transition**: "Main issue and {count} sub-items transitioned to QA"
11. **Final Summary**: "🎉 Development Complete - Ready for QA" (detailed table)
12. **Review Roadmap**: "📖 Review broken into {count} bite-sized chunks" (task table)
13. **Documentation Package**: "📋 Complete documentation: [Tech Design]() | [Notes]() | [Tests]() | [Runbook]()"

---

### Confluence Documentation Created (4 pages minimum):

| Phase | Document | Content |
|-------|----------|---------|
| PLAN | Technical Design | Architecture, components, APIs, security |
| CODE | Implementation Notes | Decisions, abstractions, integrations |
| TEST | Test Plan & Results | Strategy, coverage, performance |
| DOCUMENT | Runbook | Deployment, monitoring, troubleshooting |

---

### PR Comment Log (posted via `pr-documentation-logger`):

Every significant action is logged to the PR:
- Phase completions with timestamps
- Confluence page creation links
- Jira status transitions
- Test results and coverage
- Final documentation summary

---

**Sub-Item Comments:** Each sub-task receives a review-friendly comment with:
- PR link and branch name
- Specific changes for that sub-item
- Files modified with line counts
- Test status and coverage
- Related commits
- **📚 Confluence Links** (relevant documentation)
- **📋 Review Checklist** (5-7 quick items)
- **⏱️ Estimated review time** (5-15 min)
- **🎯 Focus areas** (prioritized file list)
- **📚 Suggested review order**
- **❓ Feedback questions** (specific items to address)

**This enables reviewers to:**
- Pick any sub-item and review it independently
- Complete reviews in short time blocks (5-15 min)
- Track progress across multiple reviewers
- Know exactly what to look for in each chunk
- Access full documentation via Confluence links

## Notes

- Always reference the issue key in commit messages
- Use Context7 MCP for library documentation (mandatory)
- Never skip the TEST phase
- Document all architectural decisions in Obsidian vault
- Keep Jira issue updated with progress
- Follow project-specific git branch naming conventions
