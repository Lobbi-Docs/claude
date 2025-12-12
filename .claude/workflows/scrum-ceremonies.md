---
name: scrum-ceremonies
description: Complete Scrum ceremonies workflow for sprint execution
pattern: pipeline
agents:
  - scrum-master
  - product-owner
  - agile-coach
  - sprint-analyst
  - confluence-specialist
  - jira-specialist
---

# Scrum Ceremonies Workflow

## Overview

This workflow orchestrates all Scrum ceremonies throughout a sprint, ensuring proper facilitation, documentation, and follow-up.

## Ceremony Flow

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Sprint Lifecycle                                    │
└─────────────────────────────────────────────────────────────────────────────┘

 Day 0              Day 1-9                    Day 10            Day 10
┌──────────┐     ┌──────────────────┐     ┌──────────┐     ┌─────────────┐
│ SPRINT   │     │    EXECUTION     │     │  SPRINT  │     │    SPRINT   │
│ PLANNING │────▶│                  │────▶│  REVIEW  │────▶│RETROSPECTIVE│
│          │     │  Daily Standups  │     │          │     │             │
│ 4 hours  │     │  15 min/day      │     │  2 hours │     │  1.5 hours  │
└──────────┘     └──────────────────┘     └──────────┘     └─────────────┘
     │                   │                      │                 │
     ▼                   ▼                      ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Jira Updates                                    │
│  Create Sprint │ Track Progress │ Record Demos │ Capture Actions            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Confluence Documentation                             │
│  Planning Notes │ Daily Updates │ Review Notes │ Retro Summary              │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

## Ceremony 1: Sprint Planning

### Coordinator: scrum-master
### Duration: 4 hours (2-week sprint)

#### Pre-Planning (Day -1)

\`\`\`bash
# Product Owner prepares
Task("Product Owner", "Prioritize backlog and prepare top 20 stories for Sprint 11", "product-owner")

# Scrum Master prepares
Task("Scrum Master", "Calculate team capacity for Sprint 11", "scrum-master")

# Check story readiness
Task("Jira Specialist", "Identify stories not meeting Definition of Ready", "jira-specialist")
\`\`\`

#### Planning Session

\`\`\`yaml
agenda:
  part_1_what:
    duration: 2 hours
    facilitator: product-owner
    activities:
      - Present sprint goal
      - Review top backlog items
      - Answer team questions
      - Confirm acceptance criteria

  part_2_how:
    duration: 2 hours
    facilitator: scrum-master
    activities:
      - Team selects stories
      - Break into tasks
      - Estimate effort
      - Commit to sprint scope

outputs:
  - sprint_goal: "Clear, measurable goal"
  - sprint_backlog: "Selected stories"
  - capacity: "35 story points"
  - confluence_page: "Sprint 11 Planning Notes"
\`\`\`

#### Post-Planning

\`\`\`bash
# Create sprint in Jira
Task("Jira Specialist", "Create Sprint 11 and move committed stories", "jira-specialist")

# Document planning
Task("Confluence Specialist", "Create Sprint 11 planning page with goal, stories, and capacity", "confluence-specialist")

# Notify team
Task("Scrum Master", "Send Sprint 11 kickoff notification to team", "scrum-master")
\`\`\`

## Ceremony 2: Daily Standup

### Coordinator: scrum-master
### Duration: 15 minutes

#### Daily Automation

\`\`\`yaml
schedule: "0 9 * * 1-5"  # 9 AM weekdays

pre_standup:
  - agent: jira-specialist
    action: Generate sprint progress report

  - agent: sprint-analyst
    action: Update burndown chart

standup_format:
  each_member:
    - What did I complete yesterday?
    - What will I work on today?
    - Any blockers?

post_standup:
  - agent: scrum-master
    action: Log blockers and assign owners

  - agent: confluence-specialist
    action: Update daily progress (if significant)
\`\`\`

#### Blocker Handling

\`\`\`bash
# Identify and track blockers
Task("Scrum Master", "Track blocker for GA-123 and escalate if needed", "scrum-master")

# Update Jira
Task("Jira Specialist", "Flag GA-123 as impediment and add blocker details", "jira-specialist")
\`\`\`

## Ceremony 3: Sprint Review

### Coordinator: scrum-master
### Duration: 2 hours

#### Pre-Review (Day 9)

\`\`\`bash
# Prepare demo list
Task("Scrum Master", "Compile Sprint 11 demo list with completed stories", "scrum-master")

# Generate metrics
Task("Sprint Analyst", "Generate Sprint 11 velocity and completion metrics", "sprint-analyst")

# Prepare environment
Task("Jira Specialist", "Ensure all Done stories have demo notes", "jira-specialist")
\`\`\`

#### Review Session

\`\`\`yaml
agenda:
  welcome:
    duration: 5 min
    content: Sprint goal recap, attendee introductions

  demo:
    duration: 45 min
    format: Each story demonstrated by developer
    capture: Stakeholder feedback

  metrics:
    duration: 10 min
    content: Velocity, burndown, quality metrics

  feedback:
    duration: 15 min
    content: Open discussion, questions

  next_sprint:
    duration: 10 min
    content: Preview upcoming priorities

outputs:
  - demo_feedback: "Captured in Confluence"
  - new_backlog_items: "Created from feedback"
  - stakeholder_approval: "Recorded"
\`\`\`

#### Post-Review

\`\`\`bash
# Document review
Task("Confluence Specialist", "Create Sprint 11 Review page with demo notes and feedback", "confluence-specialist")

# Create follow-up items
Task("Product Owner", "Create backlog items from Sprint 11 review feedback", "product-owner")

# Close completed stories
Task("Jira Specialist", "Ensure all accepted stories marked Done with resolution", "jira-specialist")
\`\`\`

## Ceremony 4: Sprint Retrospective

### Coordinator: scrum-master
### Duration: 1.5 hours

#### Retrospective Session

\`\`\`yaml
format: sailboat  # Or: start-stop-continue, 4ls, mad-sad-glad

agenda:
  set_stage:
    duration: 5 min
    activities:
      - Read prime directive
      - Vegas rule reminder
      - Check-in round

  gather_data:
    duration: 20 min
    activities:
      - Silent brainstorming
      - Post items on board
      - Group similar items

  generate_insights:
    duration: 25 min
    activities:
      - Dot voting
      - Discuss top items
      - Root cause analysis

  decide_actions:
    duration: 20 min
    activities:
      - Identify improvements
      - Assign owners
      - Set due dates (next sprint)

  close:
    duration: 10 min
    activities:
      - Summarize actions
      - Appreciation round
      - ROTI (Return on Time Invested)

outputs:
  - action_items: "3-5 specific improvements"
  - confluence_page: "Sprint 11 Retrospective"
  - jira_tasks: "Action items as tasks"
\`\`\`

#### Post-Retrospective

\`\`\`bash
# Document retrospective
Task("Confluence Specialist", "Create Sprint 11 Retrospective page", "confluence-specialist")

# Create action items
Task("Jira Specialist", "Create Jira tasks for retro action items with retro-action label", "jira-specialist")

# Schedule follow-up
Task("Scrum Master", "Add retro action review to Sprint 12 planning agenda", "scrum-master")
\`\`\`

## Ceremony 5: Backlog Refinement

### Coordinator: product-owner
### Duration: 1-2 hours (weekly)

\`\`\`yaml
schedule: "Wednesday 2 PM"  # Mid-sprint

agenda:
  new_items:
    duration: 30 min
    activities:
      - PO presents new stories
      - Team asks questions
      - Clarify requirements

  refine_existing:
    duration: 30 min
    activities:
      - Add acceptance criteria
      - Update descriptions
      - Identify dependencies

  estimate:
    duration: 20 min
    activities:
      - Planning poker
      - Relative sizing
      - Note unknowns

  prioritize:
    duration: 10 min
    activities:
      - Stack rank items
      - Consider sprint goals
      - Balance tech debt

outputs:
  - refined_stories: "Ready for next sprint"
  - story_points: "Estimates added"
  - dependencies: "Documented"
\`\`\`

## Workflow Configuration

\`\`\`yaml
name: scrum-ceremonies
version: 1.0.0

sprint_duration: 2 weeks

ceremonies:
  sprint_planning:
    day: 0
    time: "09:00"
    duration: 4h
    agents: [scrum-master, product-owner]
    outputs:
      - jira_sprint
      - confluence_planning_page

  daily_standup:
    days: [1,2,3,4,5,6,7,8,9]
    time: "09:00"
    duration: 15m
    agents: [scrum-master]
    outputs:
      - blocker_tracking
      - daily_progress

  backlog_refinement:
    day: 5
    time: "14:00"
    duration: 2h
    agents: [product-owner, scrum-master]
    outputs:
      - refined_stories

  sprint_review:
    day: 10
    time: "14:00"
    duration: 2h
    agents: [scrum-master, sprint-analyst]
    outputs:
      - confluence_review_page
      - stakeholder_feedback

  sprint_retrospective:
    day: 10
    time: "16:00"
    duration: 1.5h
    agents: [scrum-master, confluence-specialist]
    outputs:
      - confluence_retro_page
      - jira_action_items

automation:
  reminders:
    - event: sprint_planning
      before: 24h
      to: team

    - event: sprint_review
      before: 48h
      to: stakeholders

  reports:
    - type: daily_standup_summary
      schedule: "0 18 * * 1-5"

    - type: sprint_burndown
      schedule: "0 9 * * 1-5"

notifications:
  channel: "#scrum-ceremonies"
\`\`\`

## Invocation

\`\`\`bash
# Full sprint ceremony management
Task("Scrum Master", "Facilitate all Sprint 11 ceremonies", "scrum-master")

# Individual ceremonies
Task("Scrum Master", "Facilitate Sprint 11 planning", "scrum-master")
Task("Scrum Master", "Run daily standup and capture blockers", "scrum-master")
Task("Scrum Master", "Facilitate Sprint 11 review", "scrum-master")
Task("Scrum Master", "Run Sprint 11 retrospective using Sailboat format", "scrum-master")
Task("Product Owner", "Lead backlog refinement session", "product-owner")
\`\`\`

## Success Criteria

### Sprint Planning
- [ ] Sprint goal defined and agreed
- [ ] Backlog items selected within capacity
- [ ] Team committed to sprint scope
- [ ] Planning documented in Confluence

### Daily Standups
- [ ] All team members participate
- [ ] Blockers identified within 24 hours
- [ ] Updates reflected in Jira

### Sprint Review
- [ ] All Done stories demonstrated
- [ ] Stakeholder feedback captured
- [ ] Metrics presented

### Retrospective
- [ ] All team members contributed
- [ ] 3-5 action items identified
- [ ] Actions assigned and tracked
