---
name: orchestration-status
description: Display current orchestration status including active phases, agent states, and checkpoint information
arguments:
  - name: detail
    description: "Detail level: summary (default), full, agents, checkpoints"
    required: false
---

# Orchestration Status

Display the current state of the orchestration workflow.

## Status Request

**Detail Level:** ${detail:-summary}

## Status Report Template

### Summary View (Default)

```
╔═══════════════════════════════════════════════════════════════╗
║               ORCHESTRATION STATUS REPORT                      ║
╠═══════════════════════════════════════════════════════════════╣
║ Task: [Current Task Description]                               ║
║ Pattern: [plan-then-execute | hierarchical | blackboard | es]  ║
║ Started: [Timestamp]                                           ║
╠═══════════════════════════════════════════════════════════════╣
║ PHASE PROGRESS                                                 ║
╠═══════════════════════════════════════════════════════════════╣
║ [✓] EXPLORE  - Completed at [timestamp]                        ║
║ [✓] PLAN     - Completed at [timestamp]                        ║
║ [▶] CODE     - In Progress (3/7 tasks complete)                ║
║ [ ] TEST     - Pending                                         ║
║ [ ] FIX      - Pending                                         ║
║ [ ] DOCUMENT - Pending                                         ║
╠═══════════════════════════════════════════════════════════════╣
║ ACTIVE AGENTS: 4 / 13 max                                      ║
║ CONTEXT USAGE: 45,000 / 100,000 tokens (45%)                   ║
║ LAST CHECKPOINT: [timestamp]                                   ║
╚═══════════════════════════════════════════════════════════════╝
```

### Full View

Includes summary plus:

```
╠═══════════════════════════════════════════════════════════════╣
║ DAG EXECUTION STATUS                                           ║
╠═══════════════════════════════════════════════════════════════╣
║ Level 0: [✓] explore-codebase, [✓] gather-requirements         ║
║ Level 1: [✓] design-architecture                               ║
║ Level 2: [▶] implement-core (75%), [▶] write-tests (50%)       ║
║ Level 3: [ ] run-tests, [ ] integration-test                   ║
║ Level 4: [ ] fix-issues                                        ║
║ Level 5: [ ] document, [ ] sync-vault                          ║
╠═══════════════════════════════════════════════════════════════╣
║ BLOCKERS                                                       ║
╠═══════════════════════════════════════════════════════════════╣
║ None                                                           ║
╚═══════════════════════════════════════════════════════════════╝
```

### Agents View

```
╔═══════════════════════════════════════════════════════════════╗
║                    ACTIVE AGENTS                               ║
╠═══════════════════════════════════════════════════════════════╣
║ ID        │ Type              │ Status   │ Task               ║
╠═══════════════════════════════════════════════════════════════╣
║ agent-001 │ coder             │ RUNNING  │ implement-auth     ║
║ agent-002 │ unit-tester       │ RUNNING  │ write-auth-tests   ║
║ agent-003 │ integrator        │ WAITING  │ integrate-auth     ║
║ agent-004 │ security-scanner  │ IDLE     │ -                  ║
╠═══════════════════════════════════════════════════════════════╣
║ COMPLETED AGENTS                                               ║
╠═══════════════════════════════════════════════════════════════╣
║ agent-005 │ code-explorer     │ DONE     │ explore-codebase   ║
║ agent-006 │ requirements      │ DONE     │ gather-reqs        ║
║ agent-007 │ architect         │ DONE     │ design-arch        ║
╚═══════════════════════════════════════════════════════════════╝
```

### Checkpoints View

```
╔═══════════════════════════════════════════════════════════════╗
║                    CHECKPOINTS                                 ║
╠═══════════════════════════════════════════════════════════════╣
║ #  │ Phase      │ Timestamp            │ Status    │ Size     ║
╠═══════════════════════════════════════════════════════════════╣
║ 1  │ EXPLORE    │ 2025-12-13T10:00:00Z │ Valid     │ 2.3 KB   ║
║ 2  │ PLAN       │ 2025-12-13T10:15:00Z │ Valid     │ 5.1 KB   ║
║ 3  │ CODE (L2)  │ 2025-12-13T10:45:00Z │ Current   │ 8.7 KB   ║
╠═══════════════════════════════════════════════════════════════╣
║ RECOVERY POINT: Checkpoint #3 (CODE phase, Level 2)            ║
╚═══════════════════════════════════════════════════════════════╝
```

## Actions Based on Status

### If Phase is Blocked:
1. Identify blocker from status
2. Resolve dependency or issue
3. Resume with `/orchestration-resume`

### If Context Usage > 75%:
1. Create checkpoint immediately
2. Compress context
3. Archive completed phase outputs to vault

### If Agent Failed:
1. Check agent error details
2. Retry task or reassign
3. Update DAG if needed

## Example Usage

```bash
# Quick summary
/orchestration-status

# Full details
/orchestration-status --detail=full

# Agent status only
/orchestration-status --detail=agents

# Checkpoint history
/orchestration-status --detail=checkpoints
```

## No Active Orchestration

If no orchestration is active:

```
╔═══════════════════════════════════════════════════════════════╗
║               NO ACTIVE ORCHESTRATION                          ║
╠═══════════════════════════════════════════════════════════════╣
║ No complex orchestration is currently running.                 ║
║                                                                ║
║ To start one: /orchestrate-complex "your task description"     ║
║ To resume:    /orchestration-resume --checkpoint=latest        ║
╚═══════════════════════════════════════════════════════════════╝
```
