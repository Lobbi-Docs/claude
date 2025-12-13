---
name: orchestration-resume
description: Resume an interrupted orchestration from the last checkpoint or a specific checkpoint
arguments:
  - name: checkpoint
    description: "Checkpoint to resume from: latest (default), or checkpoint ID"
    required: false
  - name: phase
    description: "Override: start from specific phase (explore, plan, code, test, fix, document)"
    required: false
  - name: skip-validation
    description: "Skip checkpoint validation (use with caution)"
    required: false
---

# Resume Orchestration

Resume an interrupted orchestration workflow from a checkpoint.

## Resume Configuration

**Checkpoint:** ${checkpoint:-latest}
**Phase Override:** ${phase:-none}
**Skip Validation:** ${skip-validation:-false}

## Resume Process

### Step 1: Locate Checkpoint

```
Searching for checkpoints...

Found checkpoints:
┌────┬────────────┬──────────────────────┬──────────┐
│ #  │ Phase      │ Timestamp            │ Status   │
├────┼────────────┼──────────────────────┼──────────┤
│ 1  │ EXPLORE    │ 2025-12-13T10:00:00Z │ Valid    │
│ 2  │ PLAN       │ 2025-12-13T10:15:00Z │ Valid    │
│ 3  │ CODE       │ 2025-12-13T10:45:00Z │ Latest   │
└────┴────────────┴──────────────────────┴──────────┘

Resuming from: Checkpoint #3 (CODE phase)
```

### Step 2: Validate Checkpoint

Unless `--skip-validation` is set:

1. **Verify Integrity**: Check checkpoint data is valid
2. **Verify Context**: Ensure referenced files exist
3. **Verify Dependencies**: Confirm external deps available
4. **Verify Outputs**: Previous phase outputs accessible

```
Validating checkpoint #3...
✓ Checkpoint integrity verified
✓ Context files exist
✓ Dependencies available
✓ Previous outputs accessible
Validation: PASSED
```

### Step 3: Restore State

```
Restoring orchestration state...

Task: "Implement user authentication with OAuth2"
Pattern: plan-then-execute
Original Start: 2025-12-13T09:30:00Z

Phase Status:
[✓] EXPLORE  - Restored from checkpoint
[✓] PLAN     - Restored from checkpoint
[▶] CODE     - Resuming (task 4/7)
[ ] TEST     - Pending
[ ] FIX      - Pending
[ ] DOCUMENT - Pending

Context Restored:
- Requirements: 12 items
- Architecture: 3 components
- DAG: 7 tasks (3 complete, 1 in-progress, 3 pending)
- Files Modified: 5
```

### Step 4: Resume Execution

```
Resuming CODE phase...

DAG Status:
Level 0: [✓] explore-codebase, [✓] gather-requirements
Level 1: [✓] design-architecture
Level 2: [✓] implement-auth-core, [▶] implement-auth-ui (resuming)
Level 3: [ ] write-tests, [ ] integration
Level 4: [ ] run-all-tests

Spawning agents for resumed tasks...
- agent-001: coder → implement-auth-ui (resumed)
- agent-002: unit-tester → write-tests (pending)

Resumption complete. Orchestration continuing...
```

## Checkpoint Data Structure

Each checkpoint contains:

```yaml
checkpoint:
  id: "ckpt-003"
  created_at: "2025-12-13T10:45:00Z"
  phase: "CODE"
  phase_progress: 0.57  # 57% complete

  task:
    description: "Implement user authentication with OAuth2"
    pattern: "plan-then-execute"
    started_at: "2025-12-13T09:30:00Z"

  phases_completed:
    - phase: "EXPLORE"
      completed_at: "2025-12-13T10:00:00Z"
      outputs_ref: "explore-outputs.json"
    - phase: "PLAN"
      completed_at: "2025-12-13T10:15:00Z"
      outputs_ref: "plan-outputs.json"

  current_phase:
    phase: "CODE"
    dag_level: 2
    tasks_completed: [1, 2, 3]
    task_in_progress: 4
    tasks_pending: [5, 6, 7]

  context:
    files_modified: ["auth.ts", "login.tsx", "oauth.ts"]
    decisions_made: ["Use JWT tokens", "Refresh token rotation"]
    blockers: []

  agents:
    total_spawned: 7
    currently_active: 2
    agent_history: [...]
```

## Phase Override

Use `--phase` to restart from a specific phase:

```bash
# Restart from TEST phase (re-run tests)
/orchestration-resume --phase=test

# Restart from CODE phase (re-implement)
/orchestration-resume --phase=code
```

**Warning**: Phase override discards progress in later phases.

## Recovery Scenarios

### Scenario: Context Limit Reached

```
Previous session ended due to context limit.

Recovery actions:
1. ✓ Checkpoint found at CODE phase
2. ✓ Outputs archived to Obsidian vault
3. ✓ Context compressed
4. → Resuming with fresh context

Tip: Use context more efficiently by:
- Spawning fewer parallel agents
- Archiving completed outputs sooner
- Using haiku for documentation tasks
```

### Scenario: Agent Failure

```
Previous session had agent failure.

Failed Agent: agent-003 (integrator)
Failed Task: integrate-auth-components
Error: Dependency conflict in package.json

Recovery options:
1. Retry failed task with same agent
2. Reassign to different agent
3. Mark as blocked and continue others

Recommendation: Retry with conflict resolution
```

### Scenario: External Dependency Unavailable

```
Previous checkpoint references unavailable dependency.

Missing: @auth/oauth2-client v2.0.0
Status: Package removed from registry

Recovery options:
1. Find alternative package
2. Use older version
3. Replan from PLAN phase

Recommendation: Replan with alternative package
```

## Validation Failures

If validation fails:

```
Checkpoint validation FAILED:

Issues found:
✗ File 'src/auth/oauth.ts' has been modified externally
✗ Dependency '@auth/core' version mismatch

Options:
1. /orchestration-resume --skip-validation  (risky)
2. /orchestration-resume --phase=plan       (replan)
3. Manually resolve conflicts and retry

Recommendation: Resolve file conflicts, then resume
```

## Example Usage

```bash
# Resume from latest checkpoint
/orchestration-resume

# Resume from specific checkpoint
/orchestration-resume --checkpoint=ckpt-002

# Resume from specific phase
/orchestration-resume --phase=test

# Force resume (skip validation)
/orchestration-resume --skip-validation
```

## Success Indicators

Resume is successful when:
- [ ] Checkpoint located and loaded
- [ ] Validation passed (or skipped)
- [ ] State restored correctly
- [ ] Agents spawned for pending tasks
- [ ] Execution continues normally
