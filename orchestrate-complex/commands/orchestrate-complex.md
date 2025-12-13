---
name: orchestrate-complex
description: Execute complex multi-agent orchestration following the mandatory 6-phase protocol with DAG-based parallel execution
arguments:
  - name: task
    description: The complex task to orchestrate
    required: true
  - name: pattern
    description: "Orchestration pattern: plan-then-execute (default), hierarchical-decomposition, blackboard, event-sourcing"
    required: false
  - name: agents
    description: "Number of sub-agents to spawn (3-13, default: 5)"
    required: false
---

# Complex Multi-Agent Orchestration

You are initiating a **complex orchestration** workflow. This command enforces the mandatory 6-phase protocol with parallel agent execution.

## Task Description

**Task:** ${task}
**Pattern:** ${pattern:-plan-then-execute}
**Agents:** ${agents:-5}

## Mandatory Protocol

Execute ALL phases in order - NO SKIPPING:

```
EXPLORE (2+) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

## Phase 1: EXPLORE

**Objective:** Comprehensive understanding before any planning.

### Spawn Agents (2+ in parallel):
1. **code-explorer**: Analyze relevant codebase sections
2. **research-agent**: Gather library docs via Context7
3. **requirements-analyst**: Extract clear requirements

### Required Outputs:
- [ ] Requirements documented with acceptance criteria
- [ ] Codebase context understood (files, patterns, dependencies)
- [ ] Risks identified with mitigations
- [ ] Dependencies mapped (external, internal)

### Actions:
```
Use Task tool with subagent_type=Explore for codebase analysis
Use Context7 for any library/framework documentation
Document findings in structured format
```

## Phase 2: PLAN

**Objective:** Design solution and create execution DAG.

### Spawn Agents (1-2):
1. **master-strategist**: Overall architecture and strategy
2. **plan-decomposer**: Break into executable tasks

### Required Outputs:
- [ ] Architecture/approach documented
- [ ] Tasks broken down with dependencies
- [ ] DAG created with levels
- [ ] Agents assigned to tasks
- [ ] Checkpoints defined

### Actions:
```
Create task DAG with clear dependencies
Assign agents to tasks by expertise
Define phase boundaries and checkpoints
Estimate complexity and timeline
```

## Phase 3: CODE

**Objective:** Implement the planned solution.

### Spawn Agents (2-4 in parallel per DAG level):
1. **coder**: Primary implementation
2. **unit-tester**: Write tests alongside code
3. **integrator**: Ensure components work together

### Required Outputs:
- [ ] All implementation tasks completed
- [ ] Unit tests written for new code
- [ ] Code compiles/runs without errors
- [ ] Integration verified

### Actions:
```
Execute DAG levels in parallel
Write tests alongside implementation
Commit frequently with clear messages
Handle edge cases and error states
```

## Phase 4: TEST

**Objective:** Validate implementation quality.

### Spawn Agents (2-3):
1. **test-runner**: Execute full test suite
2. **coverage-analyst**: Measure and report coverage
3. **security-scanner**: Check for vulnerabilities

### Required Outputs:
- [ ] All tests passing
- [ ] Coverage meets threshold (80%+ for new code)
- [ ] No security vulnerabilities
- [ ] Performance acceptable

### Actions:
```
Run: npm test / pytest / dotnet test
Generate coverage report
Run security scan if applicable
Document any issues found
```

## Phase 5: FIX

**Objective:** Address all issues from testing.

### Spawn Agents (1-2):
1. **debugger**: Diagnose root causes
2. **fixer**: Implement fixes

### Required Outputs:
- [ ] All failing tests fixed
- [ ] Security issues resolved
- [ ] Coverage gaps addressed
- [ ] Performance optimized

### Actions:
```
Fix each issue methodically
Re-run tests after each fix
Verify no regressions
Update tests if needed
```

## Phase 6: DOCUMENT

**Objective:** Knowledge transfer and vault sync.

### Spawn Agents (1-2):
1. **documentation-expert**: Write/update documentation
2. **vault-syncer**: Sync to Obsidian vault

### Required Outputs:
- [ ] README/docs updated
- [ ] ADRs created for decisions
- [ ] Obsidian vault updated
- [ ] Commit message prepared

### Actions:
```
Update relevant documentation
Create ADRs for architectural decisions
Sync to: C:\Users\MarkusAhling\obsidian\Repositories\{org}\{repo}\
Prepare final commit
```

## Orchestration Patterns

### Pattern: Plan-then-Execute (Default)
Best for well-defined tasks with clear phases.
```
Plan entire workflow upfront → Validate plan → Execute DAG → Checkpoint at boundaries
```

### Pattern: Hierarchical Decomposition
Best for large objectives requiring recursive breakdown.
```
Root task → Level 1 (5-7 subtasks) → Level 2 → ... → Atomic tasks → Bottom-up aggregation
```

### Pattern: Blackboard
Best for collaborative problem-solving.
```
Shared knowledge space → Multiple experts contribute → Control shell mediates → Solution emerges
```

### Pattern: Event Sourcing
Best for audit requirements and replay capability.
```
Append-only event log → Immutable facts → State from replay → Time-travel debugging
```

## Agent Limits

| Constraint | Value |
|------------|-------|
| **Minimum** | 3 agents |
| **Maximum** | 13 agents |
| **Optimal** | 5-7 agents |

## Checkpointing

Automatic checkpoints created at:
- Phase completion
- Major task completion
- Before risky operations

## Recovery

If interrupted, use `/orchestration-resume` to continue from last checkpoint.

## Example Usage

```bash
# Standard orchestration
/orchestrate-complex "Implement user authentication with OAuth2"

# With specific pattern
/orchestrate-complex "Build analytics dashboard" --pattern=hierarchical-decomposition

# With agent count
/orchestrate-complex "Refactor payment module" --agents=7
```

## Success Criteria

Orchestration is complete when:
- [ ] All 6 phases executed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Vault synced
- [ ] No blockers remain
