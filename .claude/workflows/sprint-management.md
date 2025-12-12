---
name: sprint-management
description: Sprint lifecycle management workflow with Jira and Confluence integration
pattern: hierarchical
agents:
  - agile-coach
  - jira-specialist
  - confluence-specialist
  - project-tracker
---

# Sprint Management Workflow

## Overview

This workflow manages the complete sprint lifecycle from planning through retrospective, integrating Jira for tracking and Confluence for documentation.

## Sprint Lifecycle

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Sprint Lifecycle                                   │
└─────────────────────────────────────────────────────────────────────────────┘

 Week 0                Week 1                Week 2               Week 2+
┌───────┐           ┌───────────────────────────────────┐       ┌───────┐
│PLANNING│          │         SPRINT EXECUTION           │       │ REVIEW │
│        │          │                                    │       │  RETRO │
│ - Goal │          │  Daily Standups                    │       │        │
│ - Scope│    ──▶   │  Progress Tracking                 │  ──▶  │ - Demo │
│ - Commit│         │  Blockers Resolution               │       │ - Metrics│
└───────┘           │  Documentation                     │       │ - Actions│
                    └───────────────────────────────────┘       └───────┘
     │                           │                                    │
     ▼                           ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Jira Updates                                    │
│  Create Sprint  │  Track Progress  │  Update Status  │  Close Sprint        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Confluence Documentation                             │
│  Planning Notes  │  Daily Updates  │  Sprint Review  │  Retrospective       │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

## Phase 1: Sprint Planning

### Coordinator: agile-coach

**Duration:** 2-4 hours
**Participants:** Product Owner, Scrum Master, Development Team

### Pre-Planning Checklist
\`\`\`bash
# Generate backlog status
Task("Jira Specialist", "Generate backlog status report with priority and estimates", "jira-specialist")

# Check team capacity
Task("Project Tracker", "Calculate team capacity for upcoming sprint", "project-tracker")
\`\`\`

### Planning Activities

#### 1. Backlog Grooming
\`\`\`jql
# Unrefined stories
project = GA AND type = Story AND "Story Points" is EMPTY AND status = Backlog ORDER BY priority DESC

# Ready for sprint
project = GA AND status = "Ready" AND sprint is EMPTY ORDER BY rank
\`\`\`

#### 2. Sprint Creation
\`\`\`bash
# Create sprint via API
curl -X POST "$JIRA_URL/rest/agile/1.0/sprint" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint 11",
    "startDate": "2024-01-15T09:00:00.000Z",
    "endDate": "2024-01-29T17:00:00.000Z",
    "originBoardId": 1,
    "goal": "Complete authentication feature and improve API performance"
  }'
\`\`\`

#### 3. Story Commitment
\`\`\`bash
# Move stories to sprint
Task("Jira Specialist", "Move prioritized stories to Sprint 11 based on team capacity of 35 points", "jira-specialist")
\`\`\`

#### 4. Create Planning Documentation
\`\`\`bash
# Create Confluence planning page
Task("Confluence Specialist", "Create Sprint 11 planning page with goals, committed stories, and risks", "confluence-specialist")
\`\`\`

### Planning Output Template

\`\`\`markdown
# Sprint [X] Planning

**Sprint Goal:** [Goal statement]
**Duration:** [Start Date] - [End Date]
**Team Capacity:** [X] story points

## Committed Stories
| Key | Summary | Points | Assignee |
|-----|---------|--------|----------|
| GA-XXX | Story title | 5 | Dev 1 |

## Sprint Goal Alignment
- Story GA-XXX contributes to: [goal component]

## Risks & Dependencies
| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk 1 | High | Plan B |

## Team Availability
| Member | Availability | Notes |
|--------|-------------|-------|
| Dev 1 | 100% | - |
| Dev 2 | 80% | PTO Friday |
\`\`\`

## Phase 2: Sprint Execution

### Coordinator: jira-specialist

**Duration:** 2 weeks
**Activities:** Daily standups, progress tracking, blocker resolution

### Daily Standup Automation
\`\`\`bash
# Generate daily status
Task("Jira Specialist", "Generate daily standup report for Sprint 11", "jira-specialist")

# Check for blockers
Task("Jira Specialist", "Identify and report any blocked issues", "jira-specialist")
\`\`\`

### Progress Tracking JQL
\`\`\`jql
# Sprint burndown data
project = GA AND sprint = "Sprint 11" ORDER BY status

# In Progress
project = GA AND sprint = "Sprint 11" AND status = "In Progress"

# Blocked items
project = GA AND sprint = "Sprint 11" AND "Flagged" = "Impediment"

# Completed
project = GA AND sprint = "Sprint 11" AND status = Done
\`\`\`

### Mid-Sprint Check-in
\`\`\`bash
# Generate mid-sprint report
Task("Agile Coach", "Generate mid-sprint health check for Sprint 11", "agile-coach")

# Update Confluence with progress
Task("Confluence Specialist", "Update Sprint 11 progress page with current metrics", "confluence-specialist")
\`\`\`

## Phase 3: Sprint Review

### Coordinator: agile-coach

**Duration:** 1-2 hours
**Participants:** Team + Stakeholders

### Review Preparation
\`\`\`bash
# Generate sprint summary
Task("Jira Specialist", "Generate Sprint 11 completion summary with all completed stories", "jira-specialist")

# Prepare demo list
Task("Project Tracker", "Compile list of demonstrable features for Sprint 11 review", "project-tracker")
\`\`\`

### Review Documentation
\`\`\`bash
# Create review page
Task("Confluence Specialist", "Create Sprint 11 review page with demo notes and stakeholder feedback", "confluence-specialist")
\`\`\`

### Sprint Metrics
\`\`\`jql
# Velocity calculation
project = GA AND sprint = "Sprint 11" AND status = Done AND type = Story

# Completion rate
project = GA AND sprint = "Sprint 11"

# Bug count
project = GA AND sprint = "Sprint 11" AND type = Bug AND status = Done
\`\`\`

## Phase 4: Sprint Retrospective

### Coordinator: agile-coach

**Duration:** 1-1.5 hours
**Participants:** Development Team

### Retrospective Format
\`\`\`markdown
# Sprint [X] Retrospective

**Date:** [Date]
**Facilitator:** [Name]
**Format:** [Start/Stop/Continue or 4Ls]

## What Went Well
- Item 1
- Item 2

## What Could Improve
- Item 1
- Item 2

## Action Items
| Action | Owner | Due | Priority |
|--------|-------|-----|----------|
| Action 1 | Name | Date | High |

## Previous Action Items Review
| Action | Status | Notes |
|--------|--------|-------|
| Previous | Complete | Outcome |

## Team Happiness Score
Average: X/5
\`\`\`

### Create Retrospective Page
\`\`\`bash
# Facilitate and document retrospective
Task("Agile Coach", "Facilitate Sprint 11 retrospective and create documentation page", "agile-coach")

# Create action items in Jira
Task("Jira Specialist", "Create Jira issues for Sprint 11 retrospective action items", "jira-specialist")
\`\`\`

## Workflow Configuration

\`\`\`yaml
name: sprint-management
version: 1.0.0

phases:
  - name: planning
    coordinator: agile-coach
    duration: 4h
    agents:
      - jira-specialist
      - confluence-specialist
      - project-tracker
    outputs:
      - sprint_created: true
      - planning_page: confluence_url
      - committed_points: number

  - name: execution
    coordinator: jira-specialist
    duration: 2w
    agents:
      - agile-coach
    recurring:
      - name: daily_standup
        schedule: "0 9 * * 1-5"
        action: generate_status_report

      - name: mid_sprint_check
        schedule: "0 14 * * 3"  # Wednesday afternoon
        action: health_check

  - name: review
    coordinator: agile-coach
    duration: 2h
    agents:
      - jira-specialist
      - confluence-specialist
    triggers:
      - sprint_end_date - 1d

  - name: retrospective
    coordinator: agile-coach
    duration: 1.5h
    agents:
      - jira-specialist
      - confluence-specialist
    triggers:
      - review_complete

automation:
  sprint_start:
    - create_confluence_page: sprint_planning_template
    - notify_team: "Sprint {{sprint.name}} has started!"

  sprint_end:
    - move_incomplete_to_backlog: true
    - generate_velocity_report: true
    - create_confluence_page: sprint_review_template

  daily:
    - generate_burndown: true
    - check_blockers: true
    - send_summary: slack_channel

notifications:
  channels:
    - slack: "#sprint-updates"
    - email: "team@company.com"

  events:
    - sprint_started
    - mid_sprint_alert
    - sprint_ending_soon
    - sprint_completed
    - blocker_raised
\`\`\`

## Invocation Examples

\`\`\`bash
# Start sprint planning
Task("Agile Coach", "Facilitate Sprint 11 planning session", "agile-coach")

# Generate daily standup report
Task("Jira Specialist", "Generate daily standup report with blockers highlighted", "jira-specialist")

# Run sprint review
Task("Agile Coach", "Conduct Sprint 11 review and document outcomes", "agile-coach")

# Complete sprint retrospective
Task("Agile Coach", "Run Sprint 11 retrospective using Start/Stop/Continue format", "agile-coach")

# Generate sprint metrics
Task("Project Tracker", "Generate comprehensive Sprint 11 metrics report", "project-tracker")
\`\`\`

## Success Criteria

### Planning Phase
- [ ] Sprint created in Jira
- [ ] Stories committed within capacity
- [ ] Planning page created in Confluence
- [ ] Team aligned on sprint goal

### Execution Phase
- [ ] Daily standups generated
- [ ] Blockers identified and tracked
- [ ] Progress visible in dashboard
- [ ] Mid-sprint adjustments documented

### Review Phase
- [ ] All completed work demonstrated
- [ ] Stakeholder feedback captured
- [ ] Metrics calculated
- [ ] Review page published

### Retrospective Phase
- [ ] Team participated
- [ ] Action items created
- [ ] Previous actions reviewed
- [ ] Documentation complete
