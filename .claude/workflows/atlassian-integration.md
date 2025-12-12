---
name: atlassian-integration
description: End-to-end workflow integrating Jira, Confluence, and development processes
pattern: pipeline
agents:
  - jira-specialist
  - planner
  - coder
  - tester
  - confluence-specialist
  - agile-coach
---

# Atlassian Integration Workflow

## Overview

This workflow orchestrates the complete software development lifecycle with Atlassian tool integration, ensuring issues are tracked, code is documented, and processes are followed.

## Workflow Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Atlassian Integration Workflow                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Jira     │────▶│   Planner   │────▶│    Coder    │────▶│   Tester    │
│ Specialist  │     │  (Design)   │     │ (Implement) │     │  (Verify)   │
│ (Triage)    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Jira Updates                                    │
│    Create Issue    │   Update Status   │  Link Commits   │   Add Results   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Confluence Documentation                            │
│               Technical Docs    │    Runbooks    │    Release Notes          │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

## Stage Definitions

### Stage 1: Issue Triage (jira-specialist)

**Input:** Feature request, bug report, or task description
**Output:** Well-formed Jira issue

**Tasks:**
- Create or update Jira issue
- Set appropriate issue type and priority
- Add labels and components
- Assign to sprint (if applicable)
- Link related issues

**Jira Actions:**
\`\`\`bash
# Create issue
Task("Jira Specialist", "Create bug report for error in orchestrator health check", "jira-specialist")

# Output: GA-XXX created with:
# - Type: Bug
# - Priority: High
# - Labels: [bug, orchestrator]
# - Sprint: Current sprint
\`\`\`

### Stage 2: Planning (planner)

**Input:** Jira issue with requirements
**Output:** Technical specification

**Tasks:**
- Analyze requirements
- Design solution
- Break into subtasks
- Update Jira with technical approach

**Jira Updates:**
\`\`\`bash
# Add technical notes to issue
# Create subtasks for implementation
# Update acceptance criteria
\`\`\`

### Stage 3: Implementation (coder)

**Input:** Technical specification
**Output:** Working code

**Tasks:**
- Implement feature/fix
- Write unit tests
- Update documentation
- Commit with Jira key

**Jira Integration:**
\`\`\`bash
# Commit message format
git commit -m "GA-123: Implement health check endpoint

- Add /health route
- Return status and version
- Add unit tests"

# Auto-transition to "In Progress" on first commit
\`\`\`

### Stage 4: Testing (tester)

**Input:** Implemented code
**Output:** Test results

**Tasks:**
- Run test suite
- Verify acceptance criteria
- Document test results
- Update Jira with test status

**Jira Updates:**
\`\`\`bash
# Add test results as comment
# Update custom fields with coverage
# Flag if tests fail
\`\`\`

### Stage 5: Documentation (confluence-specialist)

**Input:** Completed and tested feature
**Output:** Updated documentation

**Tasks:**
- Update technical documentation
- Create/update runbooks
- Add API documentation
- Link Confluence pages to Jira

**Confluence Actions:**
\`\`\`bash
# Create or update documentation
Task("Confluence Specialist", "Update API documentation with new health endpoint", "confluence-specialist")

# Output: Confluence page updated with:
# - New endpoint documentation
# - Code examples
# - Linked Jira issues
\`\`\`

### Stage 6: Sprint Review (agile-coach)

**Input:** Completed work
**Output:** Sprint metrics and retrospective

**Tasks:**
- Update sprint status
- Generate metrics report
- Facilitate retrospective
- Create action items

## Workflow Configuration

\`\`\`yaml
name: atlassian-integration
version: 1.0.0

triggers:
  - type: jira_webhook
    event: issue_created
    filter: project = GA AND type in (Bug, Story)

  - type: github_webhook
    event: push
    filter: branch = main

stages:
  - name: triage
    agent: jira-specialist
    timeout: 10m
    jira:
      transition_to: "To Do"
      add_labels: ["triaged"]

  - name: plan
    agent: planner
    timeout: 15m
    depends_on: [triage]
    jira:
      transition_to: "In Progress"
      add_comment: true

  - name: implement
    agent: coder
    timeout: 60m
    depends_on: [plan]
    jira:
      link_commits: true
      update_progress: true

  - name: test
    agent: tester
    timeout: 30m
    depends_on: [implement]
    jira:
      add_test_results: true
      update_fields:
        - field: customfield_10020  # Test Status
          value: "{{test_result}}"

  - name: document
    agent: confluence-specialist
    timeout: 20m
    depends_on: [test]
    condition: "{{stages.test.passed}}"
    confluence:
      update_pages: true
      link_to_jira: true

  - name: complete
    agent: jira-specialist
    timeout: 5m
    depends_on: [document]
    jira:
      transition_to: "Done"
      resolution: "Done"
      add_comment: "Completed via automation workflow"

notifications:
  on_stage_complete:
    - slack: "#dev-updates"
      message: "Stage {{stage.name}} completed for {{jira.key}}"

  on_failure:
    - slack: "#dev-alerts"
      message: "Workflow failed at {{stage.name}} for {{jira.key}}"

  on_complete:
    - jira_comment: "Workflow completed successfully"
    - confluence_update: true
\`\`\`

## Automation Rules

### Jira Automation

\`\`\`yaml
# Auto-transition on PR merge
rule: pr_merged_transition
trigger: GitHub PR merged with Jira key
actions:
  - transition_issue: "Done"
  - add_comment: "Merged in PR #{{pr.number}}"
  - update_fix_version: "{{release.version}}"

# Auto-create release notes
rule: sprint_complete_docs
trigger: Sprint completed
actions:
  - create_confluence_page:
      template: release_notes
      title: "Sprint {{sprint.name}} Release Notes"
  - update_jira_issues:
      field: fix_version
      value: "{{sprint.name}}"
\`\`\`

### Confluence Automation

\`\`\`yaml
# Sync documentation on merge
rule: sync_docs_on_merge
trigger: GitHub push to docs/ directory
actions:
  - sync_to_confluence:
      source: docs/
      space: GA
      parent: "Documentation"
\`\`\`

## Invocation

\`\`\`bash
# Start workflow from Jira issue
Task("Atlassian Integration", "Process GA-123 through full development workflow", "hierarchical-coordinator")

# Start from feature request
Task("Atlassian Integration", "Create and implement: Add rate limiting to API", "hierarchical-coordinator")

# Generate sprint documentation
Task("Agile Coach", "Complete Sprint 10 and generate release notes", "agile-coach")
\`\`\`

## Metrics and Reporting

### Tracked Metrics
- Cycle time (issue created to done)
- Lead time (first commit to deployment)
- Sprint velocity
- Bug escape rate
- Documentation coverage

### Generated Reports
- Sprint summary (Confluence)
- Release notes (Confluence)
- Velocity chart (Jira gadget)
- Team workload (Jira dashboard)

## Error Handling

### Stage Failures
1. **Jira API Error:** Retry 3 times with backoff
2. **Confluence API Error:** Log and continue
3. **Test Failure:** Block progression, notify team
4. **Documentation Failure:** Create placeholder, notify docs team

### Rollback
\`\`\`yaml
rollback:
  - revert_jira_transition: true
  - archive_confluence_draft: true
  - notify_team: true
\`\`\`

## Success Criteria

- [ ] Jira issue created/updated correctly
- [ ] All stages completed without error
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Jira transitioned to Done
- [ ] Confluence pages linked
