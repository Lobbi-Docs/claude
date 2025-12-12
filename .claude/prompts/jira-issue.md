---
name: jira-issue
description: Templates and prompts for creating well-structured Jira issues
category: atlassian
---

# Jira Issue Prompts

## Bug Report Template

When creating a bug report, gather the following information:

\`\`\`markdown
## Summary
[Component] Brief description of the bug

## Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
A clear description of what actually happened.

## Environment
- **Agent Type:** [claude/gemini/gpt/ollama]
- **Kubernetes Version:** X.X.X
- **Helm Version:** X.X.X
- **Browser (if applicable):** [e.g., Chrome 120]

## Logs
\`\`\`
Paste relevant log output here
\`\`\`

## Screenshots
If applicable, add screenshots to help explain the problem.

## Additional Context
Add any other context about the problem here.

## Acceptance Criteria
- [ ] Bug is reproducible
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
\`\`\`

## User Story Template

\`\`\`markdown
## User Story
As a [type of user],
I want [goal/desire],
So that [benefit/value].

## Description
Detailed description of the feature or functionality.

## Acceptance Criteria
- [ ] Given [context], when [action], then [outcome]
- [ ] Given [context], when [action], then [outcome]
- [ ] Given [context], when [action], then [outcome]

## Technical Notes
Implementation considerations:
- Architecture impact
- Dependencies
- API changes
- Database changes

## Design
Link to mockups or design documents.

## Out of Scope
Explicitly list what is NOT included in this story.

## Definition of Done
- [ ] Code complete and reviewed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner approval
\`\`\`

## Task Template

\`\`\`markdown
## Objective
Clear description of what needs to be accomplished.

## Background
Context and reason for this task.

## Steps
1. Step one
2. Step two
3. Step three

## Technical Details
- Files to modify
- APIs to call
- Commands to run

## Verification
How to verify the task is complete.

## Dependencies
- Dependent on: [issues]
- Blocks: [issues]
\`\`\`

## Epic Template

\`\`\`markdown
## Epic Summary
High-level description of this body of work.

## Business Value
Why this epic is important and what value it provides.

## Goals
- Goal 1
- Goal 2
- Goal 3

## Success Metrics
- Metric 1: Target value
- Metric 2: Target value

## Scope
### In Scope
- Feature A
- Feature B

### Out of Scope
- Feature X
- Feature Y

## Stories
- [ ] Story 1
- [ ] Story 2
- [ ] Story 3

## Technical Approach
High-level technical approach and architecture.

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk 1 | High | Mitigation |

## Timeline
- Start: [Date]
- Target completion: [Date]
\`\`\`

## Spike Template

\`\`\`markdown
## Research Question
What question are we trying to answer?

## Background
Why this research is needed.

## Time Box
Maximum time to spend: [X] days/hours

## Approach
1. Research method 1
2. Research method 2
3. Prototype if needed

## Expected Outputs
- [ ] Technical document
- [ ] Prototype (if applicable)
- [ ] Recommendation
- [ ] Follow-up stories

## Acceptance Criteria
- [ ] Question answered
- [ ] Findings documented
- [ ] Recommendation provided
\`\`\`

## Prompt: Generate Bug from Error

When you encounter an error, use this prompt to generate a bug report:

\`\`\`
Based on the following error, create a Jira bug report:

Error: [paste error]
Context: [what was happening]
Frequency: [how often does it occur]
Impact: [who is affected]

Generate:
1. Summary (format: [Component] Brief description)
2. Description
3. Steps to reproduce
4. Expected vs actual behavior
5. Suggested priority (Highest/High/Medium/Low)
6. Suggested labels
\`\`\`

## Prompt: Break Down Epic into Stories

\`\`\`
Given this epic description, break it down into user stories:

Epic: [epic description]
Target users: [user types]
Business goals: [goals]

For each story, provide:
1. User story format (As a... I want... So that...)
2. Acceptance criteria (Given/When/Then)
3. Story point estimate (1, 2, 3, 5, 8, 13)
4. Dependencies
5. Suggested labels
\`\`\`

## Prompt: Generate Sprint Planning Summary

\`\`\`
Based on these Jira issues, generate a sprint planning summary:

Issues: [list of issue keys]
Team capacity: [X story points]
Sprint goal: [goal]

Generate:
1. Sprint summary
2. Committed stories with estimates
3. Risks and dependencies
4. Stretch goals (if capacity allows)
\`\`\`
