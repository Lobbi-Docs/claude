---
name: jira:prepare
description: Prepare a task for work by analyzing it, creating subtasks, and adding detailed descriptions to each
arguments:
  - name: issue_key
    description: The Jira issue key to prepare for work
    required: true
  - name: depth
    description: Level of subtask detail (basic, standard, comprehensive)
    required: false
    default: standard
  - name: include_estimates
    description: Include time/point estimates for subtasks
    required: false
    default: true
version: 1.0.0
---

# Prepare Task for Work

You are preparing a **Jira task for development work** by analyzing it, breaking it down into subtasks, and enriching each subtask with detailed information.

## Parameters

- **Issue Key:** ${issue_key}
- **Depth:** ${depth:-standard}
- **Include Estimates:** ${include_estimates:-true}

---

## Preparation Workflow

### Phase 1: Issue Analysis

```
Invoke the `requirements-analyzer` agent with:
  - issue_key: ${issue_key}
  - analyze_scope: true
  - identify_components: true
  - extract_acceptance_criteria: true
```

**Analysis Output:**
```markdown
## 📋 Issue Analysis: ${issue_key}

### Summary
- **Title:** [Issue title from Jira]
- **Type:** Story/Task/Bug/Epic
- **Current Status:** [Status]
- **Priority:** [Priority level]

### Scope Analysis
- **Domain:** [Identified domain - frontend/backend/fullstack/infrastructure]
- **Complexity:** [1-10 score with reasoning]
- **Estimated Effort:** [S/M/L/XL]

### Components Identified
| Component | Type | Complexity |
|-----------|------|------------|
| [Component 1] | [frontend/backend/db/etc] | [Low/Med/High] |
| [Component 2] | [...] | [...] |

### Acceptance Criteria (Extracted/Inferred)
1. [AC 1]
2. [AC 2]
3. [AC 3]
```

---

### Phase 2: Subtask Decomposition

Based on the analysis, decompose the issue into logical subtasks.

```
Invoke the `epic-decomposer` agent with:
  - issue_key: ${issue_key}
  - decomposition_strategy: "work-breakdown"
  - granularity: ${depth}
  - create_subtasks: true
```

**Decomposition Strategies by Depth:**

| Depth | Subtask Size | Detail Level | Typical Count |
|-------|--------------|--------------|---------------|
| basic | Large chunks | High-level only | 2-4 subtasks |
| standard | Day-sized tasks | Moderate detail | 4-8 subtasks |
| comprehensive | Hour-sized tasks | Full detail | 8-15 subtasks |

**Decomposition Output:**
```markdown
## 🌳 Task Breakdown: ${issue_key}

### Subtask Structure
```
${issue_key}: [Parent Issue Title]
├── SUB-1: [Setup/Preparation task]
├── SUB-2: [Core implementation task 1]
├── SUB-3: [Core implementation task 2]
├── SUB-4: [Testing task]
└── SUB-5: [Documentation/Cleanup task]
```

### Dependency Graph
```
SUB-1 (Setup) ──┬──> SUB-2 (Core 1) ──┐
                │                      ├──> SUB-4 (Test) ──> SUB-5 (Docs)
                └──> SUB-3 (Core 2) ──┘
```

### Parallelization Opportunities
- **Parallel Group 1:** SUB-2, SUB-3 (can work simultaneously after SUB-1)
- **Sequential:** SUB-4 must wait for SUB-2 and SUB-3
```

---

### Phase 3: Subtask Enrichment

Enrich each subtask with detailed information.

```
For each subtask, invoke the `task-enricher` agent with:
  - issue_key: [subtask_key]
  - add_description: true
  - add_acceptance_criteria: true
  - add_technical_notes: true
  - add_testing_notes: true
  - estimate: ${include_estimates}
```

**Enrichment Template (Applied to Each Subtask):**

```markdown
## Subtask: [SUBTASK-KEY]

### Title
[Clear, actionable title]

### Description
**Context:**
[Brief context explaining why this subtask exists and its relationship to the parent]

**Objective:**
[Clear statement of what needs to be accomplished]

**Technical Approach:**
1. [Step 1 - specific technical action]
2. [Step 2 - specific technical action]
3. [Step 3 - specific technical action]

### Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

### Technical Notes
- **Files to Modify:** [List of likely files]
- **Dependencies:** [Libraries, services, or other subtasks]
- **Considerations:** [Edge cases, performance, security]

### Testing Requirements
- [ ] Unit tests for [specific functionality]
- [ ] Integration test for [specific integration point]
- [ ] Manual verification of [specific behavior]

### Estimates (if enabled)
- **Story Points:** [1/2/3/5/8]
- **Time Estimate:** [Xh - Xh range]
- **Confidence:** [High/Medium/Low]
```

---

### Phase 4: Jira Updates

Apply all changes to Jira.

```
Invoke the `tag-manager` agent with:
  - issue_key: ${issue_key}
  - add_labels: ["prepared", "subtasks-created"]
```

**Actions Performed:**
1. Create all subtasks under parent issue
2. Set subtask descriptions with enriched content
3. Add acceptance criteria to each subtask
4. Set estimates (story points and/or time)
5. Establish subtask links and dependencies
6. Add "prepared" label to parent issue
7. Add comment summarizing preparation

---

## Output Summary

```markdown
## ✅ Task Preparation Complete: ${issue_key}

### Summary
- **Parent Issue:** ${issue_key}
- **Subtasks Created:** [count]
- **Total Estimated Points:** [sum]
- **Total Estimated Time:** [sum]h

### Subtasks Created

| Key | Title | Points | Estimate | Status |
|-----|-------|--------|----------|--------|
| SUB-1 | Setup development environment | 1 | 2h | To Do |
| SUB-2 | Implement core feature logic | 3 | 6h | To Do |
| SUB-3 | Create API endpoints | 2 | 4h | To Do |
| SUB-4 | Write unit and integration tests | 2 | 4h | To Do |
| SUB-5 | Update documentation | 1 | 2h | To Do |

### Work Order Recommendation
1. **Start with:** SUB-1 (Setup)
2. **Then parallel:** SUB-2, SUB-3
3. **After core complete:** SUB-4
4. **Finally:** SUB-5

### Ready for Sprint
- [x] All subtasks have descriptions
- [x] All subtasks have acceptance criteria
- [x] All subtasks have estimates
- [x] Dependencies documented
- [x] Parent issue updated

### Quick Actions
- View in Jira: [Link to ${issue_key}]
- Start work: `/jira:work ${issue_key}` or pick first subtask
- View metrics: `/jira:metrics target=${issue_key}`
```

---

## Depth Configurations

### Basic Depth
- 2-4 large subtasks
- High-level descriptions only
- Minimal acceptance criteria
- Rough estimates

**Best for:**
- Simple, well-understood tasks
- Experienced developers
- Time-sensitive preparation

### Standard Depth (Default)
- 4-8 day-sized subtasks
- Moderate descriptions
- 3-5 acceptance criteria per subtask
- Detailed estimates

**Best for:**
- Typical development tasks
- Team collaboration
- Sprint planning

### Comprehensive Depth
- 8-15 granular subtasks
- Full technical descriptions
- Complete acceptance criteria
- Hour-level estimates
- Testing notes for each

**Best for:**
- Complex features
- Junior developers
- Audit/compliance requirements
- Outsourced work

---

## Example Usage

```bash
# Basic preparation for a simple task
/jira:prepare issue_key=PROJ-123 depth=basic

# Standard preparation (default)
/jira:prepare issue_key=PROJ-123

# Comprehensive preparation with full details
/jira:prepare issue_key=PROJ-123 depth=comprehensive

# Preparation without estimates
/jira:prepare issue_key=PROJ-123 include_estimates=false
```

---

## Integration with Other Commands

After preparation, use these commands:

| Command | Purpose |
|---------|---------|
| `/jira:work ${issue_key}` | Start working on prepared task |
| `/jira:intelligence operation=predict target=${issue_key}` | Get AI predictions |
| `/jira:sprint-plan` | Include in sprint planning |
| `/jira:metrics target=${issue_key}` | Track progress metrics |

---

## Subtask Templates by Issue Type

### Story Preparation
```
1. [Setup] Environment/branch setup
2. [Design] Component/API design
3. [Implement] Core functionality
4. [Test] Unit and integration tests
5. [Polish] Error handling, edge cases
6. [Document] Code comments, README updates
```

### Bug Fix Preparation
```
1. [Reproduce] Verify and document reproduction steps
2. [Investigate] Root cause analysis
3. [Fix] Implement the fix
4. [Test] Regression tests
5. [Verify] Confirm fix in staging
```

### Technical Debt Preparation
```
1. [Audit] Current state assessment
2. [Plan] Refactoring strategy
3. [Refactor] Code improvements
4. [Test] Ensure no regressions
5. [Document] Update technical docs
```

### Feature Preparation
```
1. [Requirements] Clarify and document requirements
2. [Design] Architecture and API design
3. [Backend] Server-side implementation
4. [Frontend] UI implementation
5. [Integration] Connect frontend to backend
6. [Test] E2E and user acceptance
7. [Deploy] Staging deployment and verification
8. [Document] User and technical documentation
```

---

## Agent Collaboration

This command coordinates multiple agents:

| Agent | Role |
|-------|------|
| `requirements-analyzer` | Analyzes issue scope and requirements |
| `epic-decomposer` | Breaks down into subtasks |
| `task-enricher` | Adds details to each subtask |
| `tag-manager` | Manages labels and metadata |
| `intelligence-analyzer` | Provides complexity predictions |

---

## Session Persistence

Preparation sessions are saved for reference:

```
/sessions/prepare/${issue_key}/
├── analysis.json       # Requirements analysis
├── decomposition.json  # Subtask structure
├── enrichment/         # Per-subtask details
│   ├── SUB-1.json
│   ├── SUB-2.json
│   └── ...
└── summary.json        # Final preparation summary
```

Use `/jira:events operation=audit issue_key=${issue_key}` to review preparation history.
