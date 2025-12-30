---
name: jira:ship
description: One command to ship - prepare, code, PR, and council review in a single workflow
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
version: 1.0.0
---

# Ship Command - One Command to Rule Them All

**Issue:** ${issue_key}
**Mode:** ${mode}
**Council Review:** ${council}
**Depth:** ${depth}

---

## Overview

This command executes the complete development lifecycle in one invocation:

```
PREPARE → BRANCH → CODE → TEST → PR → COUNCIL REVIEW → DONE
```

No manual steps required. Just run and ship.

---

## Phase 1: Preparation (Auto)

### Step 1.1: Fetch and Validate Issue

```yaml
actions:
  - tool: mcp__atlassian__jira_get_issue
    params:
      issue_key: ${issue_key}
  - validate:
      - Issue exists
      - Status is not "Done" or "Closed"
      - Has required fields (summary, description)
```

### Step 1.2: Quick Triage

Analyze issue to determine workflow:

| Complexity | Workflow | Agents |
|------------|----------|--------|
| 1-10 | quick-fix | 3-5 |
| 11-40 | standard | 5-8 |
| 41+ | complex | 8-13 |

### Step 1.3: Create Branch

```bash
# Auto-generate branch name from issue
git checkout -b feature/${issue_key}-$(echo "${summary}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | head -c 30)
```

### Step 1.4: Transition to In Progress

```yaml
- tool: mcp__atlassian__jira_transition_issue
  params:
    issue_key: ${issue_key}
    transition: "In Progress"
```

---

## Phase 2: Implementation (6-Phase Protocol)

Execute the standard 6-phase protocol automatically:

### EXPLORE Phase

```yaml
agents:
  - triage-agent: Classify and analyze
  - task-enricher: Gather context and requirements
  - agent-router: Select domain specialists

output:
  - Issue context document
  - Selected code agents
  - Dependency map
```

### PLAN Phase

```yaml
agents:
  - code-architect: Design solution
  - (domain specialists as needed)

output:
  - Execution plan
  - Task breakdown
  - Parallel vs sequential strategy
```

### CODE Phase

```yaml
agents:
  - (Domain specialists from agent-router)
  - Parallel execution where possible

output:
  - Implemented feature
  - Unit tests
  - Integration tests
```

### TEST Phase

```yaml
agents:
  - test-strategist: Validate coverage
  - test-runner: Execute all tests

output:
  - All tests passing
  - Coverage report
  - Acceptance criteria validation
```

### FIX Phase (if needed)

```yaml
condition: Any tests failing
agents:
  - debugger: Diagnose failures
  - fixer: Implement fixes

loop: Until all tests pass (max 3 iterations)
```

### DOCUMENT Phase

```yaml
agents:
  - documentation-writer: Update docs
  - confluence-manager: Create Confluence pages

output:
  - Updated README
  - Confluence documentation
  - API docs (if applicable)
```

---

## Phase 3: Delivery

### Step 3.1: Smart Commit

```yaml
actions:
  - Validate all changes staged
  - Generate commit message:
      format: "feat(${issue_key}): ${summary}"
  - Include co-authored-by for all agents
  - Push to remote branch
```

### Step 3.2: Create Pull Request

Detect platform and create PR:

**If Harness detected:**
```yaml
- tool: harness_create_pull_request
  params:
    repo_id: ${detected_repo}
    source_branch: ${current_branch}
    target_branch: main
    title: "${issue_key}: ${summary}"
    description: |
      ## Summary
      ${issue_description}

      ## Jira Issue
      [${issue_key}](${jira_url})

      ## Changes
      ${auto_generated_changes}

      ## Testing
      - All tests passing
      - Coverage: ${coverage}%
```

**If GitHub detected:**
```yaml
- tool: mcp__github__create_pull_request
  params:
    title: "${issue_key}: ${summary}"
    head: ${current_branch}
    base: main
```

---

## Phase 4: Council Review

### Step 4.1: Initialize Blackboard

```yaml
blackboard:
  id: "BB-${issue_key}-${timestamp}"
  problem: "Review PR for ${issue_key}"
  pr_diff: ${pr_diff}
  context:
    issue: ${issue_details}
    files_changed: ${changed_files}
    test_results: ${test_results}
```

### Step 4.2: Spawn Council Members

Based on ${depth} setting:

**quick:**
```yaml
council:
  - code-reviewer
  - test-strategist
```

**standard:**
```yaml
council:
  - code-reviewer (weight: 1.0)
  - security-auditor (weight: 0.9)
  - test-strategist (weight: 0.8)
  - performance-analyst (weight: 0.7)
```

**deep:**
```yaml
council:
  - code-reviewer (weight: 1.0)
  - security-auditor (weight: 0.9)
  - test-strategist (weight: 0.8)
  - performance-analyst (weight: 0.7)
  - accessibility-expert (weight: 0.6, if: frontend)
  - api-reviewer (weight: 0.6, if: api)
  - documentation-reviewer (weight: 0.5)
```

### Step 4.3: Parallel Analysis

```yaml
execution:
  mode: parallel
  timeout: 180s  # 3 minutes max

  each_agent:
    - Analyze PR from specialty perspective
    - Post findings to blackboard
    - Assign confidence scores
    - Flag critical issues
```

### Step 4.4: Synthesize and Vote

```yaml
synthesis:
  - Aggregate all findings
  - Identify consensus (3+ agree)
  - Flag conflicts
  - Calculate weighted score

voting:
  approval_threshold: 0.75
  veto_conditions:
    - Any critical security issue
    - Any critical bug
```

### Step 4.5: Submit Review

```yaml
# Via Harness REST API
actions:
  - Add inline comments for each finding
  - Submit review decision:
      approved: if score >= 0.75
      changereq: if score < 0.75 or critical issues
  - Add summary comment with council breakdown
```

---

## Phase 5: Completion

### Step 5.1: Update Jira

```yaml
actions:
  - tool: mcp__atlassian__jira_transition_issue
    params:
      transition: "In Review"

  - tool: mcp__atlassian__jira_add_comment
    params:
      body: |
        ## Shipped via /jira:ship

        **PR:** ${pr_url}
        **Branch:** ${branch}

        ### Council Review: ${review_decision}
        ${council_summary}

        ### Next Steps
        ${next_steps}
```

### Step 5.2: Output Summary

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  SHIPPED: ${issue_key}                                                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Issue: ${summary}                                                        ║
║  Branch: ${branch}                                                        ║
║  PR: ${pr_url}                                                            ║
║                                                                           ║
║  Duration: ${duration}                                                    ║
║  Agents Used: ${agent_count}                                              ║
║                                                                           ║
║  Council Review: ${decision}                                              ║
║  ${council_breakdown}                                                     ║
║                                                                           ║
║  Next: ${next_action}                                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Jira issue not found | Abort with clear message |
| Tests failing after 3 FIX iterations | Checkpoint, ask for help |
| PR creation fails | Retry once, then manual fallback |
| Council timeout | Use available results, flag incomplete |
| Harness API error | Fallback to GitHub if available |

---

## Configuration

Override defaults in `.jira/ship-config.yaml`:

```yaml
ship:
  default_council: standard
  auto_merge: false
  require_human_approval: true

  council:
    timeout: 180
    min_members: 2
    approval_threshold: 0.75

  harness:
    auto_detect: true
    fallback_to_github: true
```

---

## Related Commands

- `/jira:iterate` - Fix review feedback and re-review
- `/jira:council` - Standalone council review
- `/jira:work` - Traditional full orchestration
