---
name: jira:triage
description: Triage and classify a Jira issue to determine the optimal workflow path
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: depth
    description: Analysis depth (quick|standard|deep)
    default: standard
  - name: auto_start
    description: Automatically start workflow after triage (true|false)
    default: false
---

# Jira Issue Triage Command

Intelligent triage system that analyzes Jira issues and determines the optimal workflow path, required expertise, and agent sequence.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:triage - {duration}`

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

## Usage

```bash
/jira:triage PROJ-123                    # Standard triage
/jira:triage PROJ-123 quick              # Quick triage (30s)
/jira:triage PROJ-123 deep               # Deep triage with codebase analysis
/jira:triage PROJ-123 standard true      # Auto-start workflow after triage
```

## Triage Process

### Phase 1: Issue Fetch and Initial Classification

**Step 1.1: Fetch Issue Details**
- Retrieve issue from Jira via MCP
- Extract key fields: type, summary, description, labels, priority, sprint, assignee
- Fetch comments, attachments, linked issues
- Get custom fields (story points, acceptance criteria, business value)

**Step 1.2: Quick Classification**
- Determine base issue type (bug, feature, improvement, epic, spike, task)
- Extract urgency signals from priority and labels
- Identify sprint/release context
- Flag critical issues (production outage, security, data loss)

### Phase 2: Complexity Assessment

**Complexity Scoring Matrix** (0-100 points):

| Factor | Weight | Scoring Criteria |
|--------|--------|------------------|
| **Scope** | 25 pts | Single component (5) → Multi-service (15) → Platform-wide (25) |
| **Technical Depth** | 20 pts | Config change (3) → Code change (10) → Architecture change (20) |
| **Dependencies** | 15 pts | Standalone (2) → Few deps (8) → Complex deps (15) |
| **Risk Level** | 15 pts | Low risk (3) → Medium (8) → High/critical (15) |
| **Uncertainty** | 10 pts | Clear path (2) → Some unknowns (6) → Research needed (10) |
| **Testing Needs** | 10 pts | Unit tests (2) → Integration (6) → E2E + load (10) |
| **Documentation** | 5 pts | Minimal (1) → Standard (3) → Extensive (5) |

**Complexity Tiers:**
- **Trivial** (0-20): Simple fix, single file, < 1 hour
- **Low** (21-40): Straightforward task, clear path, < 1 day
- **Medium** (41-60): Multiple components, some complexity, 1-3 days
- **High** (61-80): Complex feature, research needed, 3-7 days
- **Critical** (81-100): Epic-level, architectural, > 1 week

### Phase 3: Expertise Identification

**Required Skills Matrix:**

```
Analysis Inputs:
- Issue labels (frontend, backend, api, database, devops, etc.)
- Description keywords (React, API, Kubernetes, database, etc.)
- Affected components from linked PRs/commits
- Previous similar issues and their assignees
```

**Expertise Categories:**
- **Frontend**: UI components, UX, theming, responsive design
- **Backend**: API endpoints, business logic, services
- **Database**: Schema changes, migrations, queries, performance
- **DevOps**: Infrastructure, deployment, CI/CD, monitoring
- **Full-stack**: End-to-end features spanning multiple layers
- **Testing**: QA, automation, E2E tests, load testing
- **Security**: Authentication, authorization, vulnerability fixes
- **Architecture**: System design, refactoring, tech debt

### Phase 4: Priority Determination

**Priority Scoring** (combines multiple signals):

1. **Jira Priority Field**:
   - Highest/Critical: +50 points
   - High: +30 points
   - Medium: +15 points
   - Low: +5 points

2. **Sprint Context**:
   - Current sprint + flagged: +30 points
   - Current sprint: +20 points
   - Next sprint: +10 points
   - Backlog: +0 points

3. **Business Impact Labels**:
   - `production-outage`: +50 points
   - `customer-facing`: +25 points
   - `revenue-impact`: +25 points
   - `technical-debt`: +5 points

4. **SLA Urgency**:
   - Created > 7 days ago: +10 points
   - Created > 14 days ago: +20 points
   - Approaching deadline: +30 points

**Final Priority:**
- **P0** (100+): Drop everything, immediate action
- **P1** (75-99): Urgent, start within 24 hours
- **P2** (50-74): High priority, start this week
- **P3** (25-49): Normal priority, plan for next sprint
- **P4** (0-24): Low priority, backlog

### Phase 5: Workflow Path Selection

**Decision Tree:**

```
1. Is this a production outage or critical bug?
   YES → Emergency Hotfix Workflow
   NO → Continue

2. Is this a spike or research task?
   YES → Research & Spike Workflow
   NO → Continue

3. Is this an epic or multi-phase initiative?
   YES → Epic Planning Workflow
   NO → Continue

4. Does this require significant design/architecture work?
   YES → Architecture Design Workflow
   NO → Continue

5. What is the complexity tier?
   - Trivial/Low → Simple Task Workflow
   - Medium → Standard Feature Workflow
   - High/Critical → Complex Feature Workflow
```

**Available Workflows:**

1. **Emergency Hotfix Workflow** (`workflows/emergency-hotfix.md`)
   - Agents: incident-commander → hotfix-developer → qa-validator → deploy-specialist
   - Duration: 1-4 hours
   - Checkpoints: Every 30 minutes

2. **Simple Task Workflow** (`workflows/simple-task.md`)
   - Agents: task-analyzer → developer → code-reviewer
   - Duration: 1-4 hours
   - Checkpoints: Pre-development, pre-merge

3. **Standard Feature Workflow** (`workflows/standard-feature.md`)
   - Agents: feature-analyst → architect → developer → tester → documentation-writer
   - Duration: 1-3 days
   - Checkpoints: Design review, implementation review, testing complete

4. **Complex Feature Workflow** (`workflows/complex-feature.md`)
   - Agents: discovery → architect → tech-lead → developers (parallel) → integration-tester → qa → docs
   - Duration: 3-10 days
   - Checkpoints: Design approval, implementation milestones, testing gates

5. **Epic Planning Workflow** (`workflows/epic-planning.md`)
   - Agents: product-analyst → architect → epic-planner → story-splitter
   - Duration: 4-8 hours
   - Output: Sub-tasks and roadmap

6. **Research & Spike Workflow** (`workflows/research-spike.md`)
   - Agents: research-lead → prototyper → evaluator → recommender
   - Duration: 2-5 days
   - Output: Technical recommendation document

7. **Architecture Design Workflow** (`workflows/architecture-design.md`)
   - Agents: requirements-analyst → architect → design-reviewer → adr-writer
   - Duration: 1-3 days
   - Output: ADR and design specs

### Phase 6: Agent Sequence Generation

**For Selected Workflow:**

1. **Load Workflow Template**
2. **Customize Agent Sequence** based on:
   - Required expertise (add specialists)
   - Complexity tier (add/remove review gates)
   - Priority level (adjust parallelism)
3. **Assign Model Tiers**:
   - Opus 4.5: Strategic planning, architecture decisions
   - Sonnet 4.5: Development, analysis, code review
   - Haiku: Documentation, simple validation
4. **Configure Handoffs**:
   - Context passing rules
   - Validation gates
   - Rollback conditions

### Phase 7: Triage Report Generation

**Report Structure:**

```markdown
# Triage Report: {ISSUE_KEY}

**Issue:** {SUMMARY}
**Type:** {TYPE} | **Priority:** {PRIORITY} | **Complexity:** {COMPLEXITY_TIER}

## Classification

- **Base Type:** {bug|feature|improvement|epic|spike}
- **Business Impact:** {HIGH|MEDIUM|LOW}
- **Customer Facing:** {YES|NO}
- **Technical Debt:** {YES|NO}

## Complexity Analysis

**Overall Score:** {COMPLEXITY_SCORE}/100 ({TIER})

| Factor | Score | Rationale |
|--------|-------|-----------|
| Scope | {score}/25 | {explanation} |
| Technical Depth | {score}/20 | {explanation} |
| Dependencies | {score}/15 | {explanation} |
| Risk Level | {score}/15 | {explanation} |
| Uncertainty | {score}/10 | {explanation} |
| Testing Needs | {score}/10 | {explanation} |
| Documentation | {score}/5 | {explanation} |

## Priority Assessment

**Final Priority:** {P0|P1|P2|P3|P4} ({score}/100)

**Contributing Factors:**
- Jira Priority: {priority} (+{points})
- Sprint Context: {context} (+{points})
- Business Labels: {labels} (+{points})
- SLA Urgency: {urgency} (+{points})

## Required Expertise

**Primary:** {expertise_category}
**Secondary:** {additional_expertise}

**Skills Required:**
- {skill_1}
- {skill_2}
- {skill_3}

## Recommended Workflow

**Workflow:** {workflow_name}
**Duration Estimate:** {time_estimate}
**Model Budget:** {token_estimate}

**Agent Sequence:**
1. {agent_1} ({model}) - {purpose}
2. {agent_2} ({model}) - {purpose}
3. {agent_3} ({model}) - {purpose}
...

**Checkpoints:**
- {checkpoint_1}: {validation_criteria}
- {checkpoint_2}: {validation_criteria}

## Risk Factors

{list of identified risks}

## Dependencies

**Blocked By:** {blocking_issues}
**Blocks:** {blocked_issues}
**Related:** {related_issues}

## Recommendations

1. {recommendation_1}
2. {recommendation_2}
3. {recommendation_3}

## Next Steps

{if auto_start=true}
✅ Workflow automatically started
{else}
To start this workflow, run:
`/jira:workflow start {ISSUE_KEY} {workflow_name}`
{endif}

---

**Triage Completed:** {timestamp}
**Analysis Depth:** {depth}
**Confidence:** {HIGH|MEDIUM|LOW}
```

## Depth Modes

### Quick Triage (30 seconds)
- Fetch issue basics
- Simple type classification
- Priority from Jira field only
- Basic workflow suggestion
- No complexity scoring
- No codebase analysis

### Standard Triage (2 minutes)
- Full issue fetch with comments
- Complete complexity scoring
- Priority with all signals
- Expertise identification
- Workflow selection with reasoning
- Agent sequence generation

### Deep Triage (5 minutes)
- Everything in Standard mode
- Codebase analysis via Context7
- Similar issue search
- Historical pattern analysis
- Code impact estimation
- Detailed risk assessment
- Optimized agent selection

## Implementation

The command delegates to the `jira-triage-agent` which:

1. **Fetches Issue Data** using Jira MCP server
2. **Analyzes Content** using Claude Sonnet 4.5
3. **Scores Complexity** using the matrix above
4. **Selects Workflow** using decision tree
5. **Generates Report** in markdown format
6. **Optionally Starts Workflow** if `auto_start=true`

## MCP Tools Used

- `mcp__jira__get_issue`: Fetch issue details
- `mcp__jira__search_issues`: Find similar issues (deep mode)
- `mcp__jira__get_comments`: Retrieve all comments
- `mcp__context7__search`: Analyze related code (deep mode)
- `mcp__obsidian__vault-add`: Save triage report to vault

## Output

The triage report is:
1. **Displayed** in console with color formatting
2. **Saved** to Obsidian vault at `Projects/{PROJECT}/Triage/{ISSUE_KEY}.md`
3. **Linked** from the issue documentation

## Error Handling

- **Issue Not Found:** Clear error message with suggestions
- **MCP Connection Failed:** Fallback to manual input mode
- **Insufficient Data:** Request user clarification
- **Workflow Unavailable:** Suggest closest alternative

## Examples

### Example 1: Bug Triage

```bash
/jira:triage LOBBI-456
```

**Result:**
```
Triage Report: LOBBI-456
Type: Bug | Priority: P1 | Complexity: Medium (55/100)

Recommended Workflow: Standard Feature Workflow
Estimated Duration: 1-2 days
Agents: bug-analyzer → developer → qa-validator → deploy-specialist
```

### Example 2: Epic Triage

```bash
/jira:triage LOBBI-100 deep
```

**Result:**
```
Triage Report: LOBBI-100
Type: Epic | Priority: P2 | Complexity: Critical (88/100)

Recommended Workflow: Epic Planning Workflow
Estimated Duration: 1 week (planning), 4-6 weeks (execution)
Sub-tasks: 12 features, 3 technical tasks, 2 spikes

Agent Sequence:
1. product-analyst (opus) - Extract requirements
2. architect (opus) - Design system changes
3. epic-planner (sonnet) - Create roadmap
4. story-splitter (sonnet) - Generate sub-tasks
```

### Example 3: Hotfix Triage

```bash
/jira:triage LOBBI-999 quick true
```

**Result:**
```
Triage Report: LOBBI-999
Type: Bug | Priority: P0 | Complexity: Low (18/100)

⚠️  PRODUCTION OUTAGE DETECTED

Recommended Workflow: Emergency Hotfix Workflow
✅ Workflow automatically started

Incident Commander Agent activated...
```

## Integration with Workflow System

After triage, the command can:
1. **Start Workflow** if `auto_start=true`
2. **Generate Workflow Config** for manual start
3. **Update Jira Labels** with triage results
4. **Create Sub-tasks** for complex issues
5. **Notify Team** via configured channels

## Continuous Improvement

The triage system learns from:
- Historical triage accuracy
- Actual vs estimated complexity
- Workflow success rates
- Agent performance metrics

Metrics are stored in `jira-orchestrator/metrics/triage-history.json`

## See Also

- **Workflows Directory:** `jira-orchestrator/workflows/`
- **Agent Registry:** `.claude/registry/agents.index.json`
- **Triage Agent:** `jira-orchestrator/agents/jira-triage-agent.md`
- **Workflow Starter:** `jira-orchestrator/commands/workflow.md`
