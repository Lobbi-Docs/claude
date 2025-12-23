---
name: jira:work
description: Start working on a Jira issue with full 6-phase orchestration workflow. Use this when the user says "work on issue", "start JIRA-123", "work on PROJ-456", or wants to begin development on a Jira ticket with automated orchestration.
version: 4.0.0
---

# Jira Work Orchestration

Start working on a Jira issue with the full 6-phase development workflow: EXPLORE -> PLAN -> CODE -> TEST -> FIX -> COMMIT

## When to Use This Skill

Activate this skill when:
- User wants to work on a Jira issue (e.g., "work on LF-123")
- User mentions starting development on a ticket
- User references a Jira issue key with intent to implement
- User asks to "begin", "start", or "work on" a Jira issue

## Command Reference

The main command file is located at: `jira-orchestrator/commands/work.md`

## Usage

```
/jira:work <issue-key>
```

### Examples
- `/jira:work LF-27` - Start working on issue LF-27
- `/jira:work PROJ-123` - Start working on issue PROJ-123

## Workflow Phases

### Phase 1: EXPLORE (2+ agents)
- Fetch issue details from Jira
- Analyze requirements and acceptance criteria
- Identify affected codebase areas
- Map dependencies

### Phase 2: PLAN (1-2 agents)
- Design solution approach
- Break down work into subtasks
- Create execution DAG
- Define test scenarios

### Phase 3: CODE (2-4 agents)
- Execute implementation tasks in parallel
- Follow coding standards
- Add inline documentation
- Implement error handling

### Phase 4: TEST (2-3 agents)
- Run unit tests
- Run integration tests
- Validate acceptance criteria
- Security scanning

### Phase 5: FIX (1-2 agents)
- Address test failures
- Fix code review feedback
- Refactor as needed

### Phase 6: COMMIT (1-2 agents)
- Create feature branch
- Commit with Jira issue key
- Create pull request
- Link PR to Jira issue

## Jira Integration

This command automatically:
- Transitions issue to "In Progress"
- Adds progress comments
- Logs work time
- Creates smart commits
- Links PRs to issues

## Related Commands

- `/jira:status` - Check current work session status
- `/jira:sync` - Sync changes with Jira
- `/jira:pr` - Create pull request
- `/jira:commit` - Create smart commit
