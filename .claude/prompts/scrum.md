---
name: scrum
description: Prompts and templates for Scrum ceremonies and artifacts
category: methodology
---

# Scrum Prompts

## User Story Templates

### Standard User Story
\`\`\`markdown
## User Story

**Title:** [Brief description]

### Story
As a [type of user],
I want [goal/desire],
So that [benefit/value].

### Acceptance Criteria
\`\`\`gherkin
Scenario: [Scenario name]
Given [precondition]
When [action]
Then [expected result]
And [additional result]
\`\`\`

### Technical Notes
- Implementation approach
- API changes needed
- Database impacts

### Definition of Done
- [ ] Acceptance criteria met
- [ ] Code reviewed
- [ ] Tests written
- [ ] Documentation updated

**Story Points:** [estimate]
**Priority:** [High/Medium/Low]
\`\`\`

### Bug Report Story
\`\`\`markdown
## Bug Report

**Title:** [BUG] [Component] - Brief description

### Description
What is happening vs what should happen.

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Behavior
What should happen.

### Actual Behavior
What actually happens.

### Environment
- Version: X.X.X
- Browser: Chrome 120
- OS: macOS 14

### Logs/Screenshots
[Attach relevant evidence]

### Acceptance Criteria
- [ ] Bug no longer reproducible
- [ ] Regression test added
- [ ] Root cause documented

**Severity:** [Critical/High/Medium/Low]
**Story Points:** [estimate]
\`\`\`

### Technical Task
\`\`\`markdown
## Technical Task

**Title:** [TECH] Brief description

### Objective
What needs to be accomplished.

### Background
Why this work is needed.

### Approach
1. Step 1
2. Step 2
3. Step 3

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Risks
- Risk 1 and mitigation

**Story Points:** [estimate]
\`\`\`

## Sprint Planning Prompts

### Sprint Goal Generator
\`\`\`
Based on these backlog priorities, generate a sprint goal:

Priorities:
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

Business context: [context]
Team capacity: [X] story points

Generate a SMART sprint goal that:
- Is specific and measurable
- Aligns with business objectives
- Can be achieved within the sprint
- Motivates the team
\`\`\`

### Capacity Calculator
\`\`\`
Calculate sprint capacity:

Team Members:
- [Name 1]: [availability %]
- [Name 2]: [availability %]
- [Name 3]: [availability %]

Sprint Duration: [X] days
Historical Velocity: [Y] points average
Focus Factor: 70%

Calculate:
1. Total available person-days
2. Recommended story point commitment
3. Buffer for unexpected work
\`\`\`

### Story Selection Helper
\`\`\`
Help select stories for the sprint:

Available Stories:
[List of stories with points and priorities]

Constraints:
- Capacity: [X] points
- Sprint goal: [goal]
- Must include: [required stories]
- Avoid: [constraints]

Select stories that:
1. Align with sprint goal
2. Fit within capacity
3. Balance new features and tech debt
4. Consider dependencies
\`\`\`

## Daily Standup Prompts

### Standup Summary Generator
\`\`\`
Generate a standup summary from:

Yesterday's Updates:
[List of completed items]

Today's Plan:
[List of planned items]

Blockers:
[List of blockers]

Format as:
- Concise bullet points
- Highlight blockers prominently
- Note any risks to sprint goal
\`\`\`

### Blocker Escalation
\`\`\`
Analyze this blocker and recommend action:

Blocker: [description]
Affected Story: [story key]
Duration: [how long blocked]
Impact: [sprint goal impact]

Recommend:
1. Immediate mitigation
2. Escalation path
3. Alternative approaches
4. Communication plan
\`\`\`

## Sprint Review Prompts

### Demo Script Generator
\`\`\`
Generate a demo script for:

Story: [story key and title]
Acceptance Criteria:
1. [Criterion 1]
2. [Criterion 2]

Generate:
1. Introduction (what and why)
2. Demo steps (how to show each criterion)
3. Key points to highlight
4. Anticipated questions
\`\`\`

### Review Summary
\`\`\`
Generate sprint review summary:

Sprint: [Sprint name]
Goal: [Sprint goal]
Completed: [list of stories]
Not Completed: [list]
Demos Given: [list]

Generate:
1. Executive summary
2. Key accomplishments
3. Stakeholder feedback summary
4. Recommendations for next sprint
\`\`\`

## Retrospective Prompts

### Retro Facilitation Guide
\`\`\`
Facilitate a [format] retrospective:

Format: [Start-Stop-Continue / 4Ls / Sailboat / Mad-Sad-Glad]
Sprint: [Sprint name]
Duration: [X] minutes
Participants: [count]

Generate:
1. Opening script with prime directive
2. Activity instructions
3. Time allocations
4. Discussion prompts
5. Closing script
\`\`\`

### Action Item Generator
\`\`\`
From these retrospective discussion points, generate action items:

Discussion Points:
- [Point 1]
- [Point 2]
- [Point 3]

For each action item, provide:
1. Clear, actionable description
2. Suggested owner
3. Due date (within next sprint)
4. Success criteria
5. Jira task format
\`\`\`

### Retro Analysis
\`\`\`
Analyze retrospective patterns:

Last 3 Retros:
Sprint 8: [themes]
Sprint 9: [themes]
Sprint 10: [themes]

Identify:
1. Recurring themes
2. Improvements made
3. Persistent problems
4. Recommendations for systemic fixes
\`\`\`

## Estimation Prompts

### Planning Poker Facilitation
\`\`\`
Facilitate estimation for:

Story: [title and description]
Acceptance Criteria: [list]
Similar Stories: [reference stories with points]

Provide:
1. Key factors affecting complexity
2. Suggested reference comparison
3. Discussion prompts if estimates diverge
4. Recommended final estimate
\`\`\`

### Story Splitting
\`\`\`
This story is too large ([X] points). Help split it:

Story: [title]
Description: [description]
Current Estimate: [X] points

Split into smaller stories that:
1. Each delivers value independently
2. Each is ≤5 points
3. Maintains INVEST criteria
4. Can be prioritized separately

Provide 2-4 smaller stories with:
- Title
- Brief description
- Estimated points
- Dependencies
\`\`\`

## Metrics Prompts

### Velocity Analysis
\`\`\`
Analyze velocity trend:

Last 6 Sprints:
- Sprint 5: [X] points
- Sprint 6: [X] points
- Sprint 7: [X] points
- Sprint 8: [X] points
- Sprint 9: [X] points
- Sprint 10: [X] points

Provide:
1. Average velocity
2. Trend analysis (improving/stable/declining)
3. Outlier explanation
4. Forecast for next 3 sprints
5. Recommendations
\`\`\`

### Sprint Health Check
\`\`\`
Assess sprint health based on:

Day: [X] of [Y]
Stories Done: [count]
Stories In Progress: [count]
Blockers: [count]
Burndown Status: [ahead/on-track/behind]

Provide:
1. Overall health score (1-10)
2. Risk assessment
3. Recommendations
4. Mitigation actions if needed
\`\`\`

## Communication Prompts

### Sprint Email Template
\`\`\`
Generate a sprint [planning/review/status] email:

Sprint: [name]
Key Information: [details]
Audience: [stakeholders/team/management]

Include:
1. Subject line
2. Executive summary
3. Key metrics
4. Action items
5. Next steps
\`\`\`

### Stakeholder Update
\`\`\`
Generate stakeholder update for:

Project: [name]
Sprint: [current sprint]
Progress: [% complete]
Risks: [list]
Needs: [decisions/resources needed]

Format for [executive/technical/business] audience
\`\`\`
