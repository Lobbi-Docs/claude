---
name: jira:cancel
description: Cancel ongoing Jira issue orchestration and save checkpoint for resume
argument-hint: "<ISSUE-KEY> [--force] [--no-checkpoint]"
allowed-tools: ["Bash", "Read", "Write", "KillShell"]
---

Cancel active orchestration, stop sub-agents, save checkpoint, update Jira, and enable resume.

## Arguments

- `ISSUE-KEY` (required): Jira issue key (PROJ-123)
- `--force` (optional): Skip confirmation
- `--no-checkpoint` (optional): Skip checkpoint save

## Workflow

1. **Validate issue key** - Format check (PROJECT-123)
2. **Check status** - Load state from `~/.jira-orchestrator/state/{ISSUE-KEY}.json`
3. **Show progress** - Display completed phases, current phase, running agents
4. **Confirm** - Prompt unless --force flag
5. **Stop agents** - SIGTERM then SIGKILL from agents file
6. **Create checkpoint** - Save state to `checkpoints/{ISSUE-KEY}-{timestamp}.json` (unless --no-checkpoint)
7. **Update Jira** - Post comment with completed work, in-progress phase, resume instructions
8. **Revert status** - Optional: prompt to revert issue status to pre-orchestration state
9. **Cleanup** - Remove temp files, locks, agent tracking (keep checkpoints for resume)
10. **Summary** - Show successful cancellation, checkpoint location, resume command

## State Files

- State: `~/.jira-orchestrator/state/{ISSUE-KEY}.json`
  - Fields: status, startTime, currentPhase, completedPhases, phaseResults, agents, jira (previousStatus, currentStatus)
- Checkpoint: `~/.jira-orchestrator/checkpoints/{ISSUE-KEY}-{timestamp}.json`
  - Full state copy for resumption via `/jira:resume {ISSUE-KEY}`
- Agents: `~/.jira-orchestrator/agents/{ISSUE-KEY}.json`
  - Array of running agents: {name, pid, type}

## Error Handling

- No orchestration: Exit gracefully, inform user
- Already canceled: Detect and handle
- Agents already stopped: Handle gracefully
- State file missing: Create minimal state
- User cancels cancellation: Abort on confirmation fail

## Safety Features

1. Confirmation prompt (unless --force)
2. Progress visibility before cancellation
3. Checkpoint created (unless --no-checkpoint)
4. Graceful SIGTERM -> SIGKILL shutdown
5. Status preserved until explicit revert

## Resume Capability

Checkpoint enables later resumption via `/jira:resume ISSUE-KEY`:
- Complete phase history preserved
- All phase results saved
- Start from last completed phase
- Jira context maintained
- Checkpoints preserved 30 days

**⚓ Golden Armada** | *The Fleet Stands Ready*
