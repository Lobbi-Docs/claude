---
name: jira:work
description: Start working on a Jira issue with full 7-phase orchestration workflow including 5 quality gates. Use this when the user says "work on issue", "start JIRA-123", "work on PROJ-456", or wants to begin development on a Jira ticket with automated orchestration and quality enforcement.
version: 4.1.0
qualityGatesIntegration: code-quality-orchestrator
---

# Jira Work Orchestration

Start working on a Jira issue with the full 7-phase development workflow: EXPLORE -> PLAN -> CODE -> TEST -> QUALITY GATES -> FIX -> COMMIT

**Quality Gates Integration:** This workflow is integrated with the Code Quality Orchestrator (Curator) plugin to enforce 5 quality gates before code can be committed.

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

### Phase 5: QUALITY GATES (5 gates via Curator)
**Integrated with Code Quality Orchestrator (Curator)**
- **Gate 1: Static Analysis** - ESLint, Prettier, Pylint auto-fix
- **Gate 2: Test Coverage** - 80% minimum coverage enforcement
- **Gate 3: Security Scanner** - Secrets, CVEs, OWASP issues
- **Gate 4: Complexity Analyzer** - Cyclomatic ≤10, cognitive ≤15
- **Gate 5: Dependency Health** - Outdated, vulnerable, license check

All gates must pass before proceeding to COMMIT phase.

### Phase 6: FIX (1-2 agents)
- Address test failures
- Fix quality gate violations
- Fix code review feedback
- Refactor as needed

### Phase 7: COMMIT (1-2 agents)
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

### Jira Commands
- `/jira:status` - Check current work session status
- `/jira:sync` - Sync changes with Jira
- `/jira:pr` - Create pull request
- `/jira:commit` - Create smart commit

### Quality Gate Commands (from Curator)
- `/quality-check` - Run all 5 quality gates
- `/quality-fix` - Auto-fix issues where possible
- `/coverage-check` - Check test coverage (80% min)
- `/security-scan` - Run security vulnerability scan
- `/complexity-audit` - Check code complexity
- `/dependency-audit` - Check dependency health

## Quality Gate Thresholds

| Gate | Metric | Threshold |
|------|--------|-----------|
| Static Analysis | Errors | 0 |
| Test Coverage | Line Coverage | ≥ 80% |
| Security Scanner | Critical/High CVEs | 0 |
| Complexity | Cyclomatic | ≤ 10 |
| Complexity | Cognitive | ≤ 15 |
| Dependencies | Critical Vulns | 0 |
