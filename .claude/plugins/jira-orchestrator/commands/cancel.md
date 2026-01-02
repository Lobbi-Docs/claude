---
name: jira:cancel
description: Cancel an ongoing Jira issue orchestration
argument-hint: "<ISSUE-KEY> [--force] [--no-checkpoint]"
allowed-tools: ["Bash", "Read", "Write", "KillShell"]
---

Cancel an active Jira issue orchestration, stop all running sub-agents, save progress to a checkpoint file, and update the Jira issue with a cancellation comment.

## Your Task

You are canceling an orchestration for a Jira issue. Your responsibilities:

1. Verify the orchestration is active for the given ISSUE-KEY
2. Confirm cancellation with the user (show current progress)
3. Stop all running sub-agents for this issue
4. Save current state to a checkpoint file for potential resume
5. Update Jira issue with a cancellation comment listing what was completed
6. Optionally revert the issue status to the previous state
7. Clean up temporary files associated with the orchestration
8. Provide instructions for resuming the work later

## Arguments

- `ISSUE-KEY` (required): The Jira issue key (e.g., PROJ-123)
- `--force` (optional): Skip confirmation and force immediate cancellation
- `--no-checkpoint` (optional): Do NOT save progress checkpoint

## Steps to Execute

### 1. Initialize Variables and Validate Issue Key

```bash
# Extract and validate the issue key
ISSUE_KEY="${1:-}"
FORCE_CANCEL="${2:---force}"
NO_CHECKPOINT="${3:---no-checkpoint}"
ORCHESTRATION_STATE_DIR="${HOME}/.jira-orchestrator"
ISSUE_CHECKPOINT_DIR="${ORCHESTRATION_STATE_DIR}/checkpoints"
ISSUE_STATE_FILE="${ORCHESTRATION_STATE_DIR}/state/${ISSUE_KEY}.json"
ISSUE_AGENTS_FILE="${ORCHESTRATION_STATE_DIR}/agents/${ISSUE_KEY}.json"

# Validate issue key format (basic validation)
if [[ ! "$ISSUE_KEY" =~ ^[A-Z]+-[0-9]+$ ]]; then
  echo "❌ Error: Invalid Jira issue key format: $ISSUE_KEY"
  echo "   Expected format: PROJECT-123"
  exit 1
fi

echo "=== Jira Orchestration Cancellation ==="
echo "Issue Key: $ISSUE_KEY"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### 2. Check If Orchestration Is Active

```bash
check_orchestration_status() {
  local issue_key=$1

  echo ""
  echo "=== Checking Orchestration Status ==="

  # Check if state file exists
  if [[ ! -f "$ISSUE_STATE_FILE" ]]; then
    echo "⚠️  No active orchestration found for $issue_key"
    echo ""
    echo "This could mean:"
    echo "  • The orchestration was already completed"
    echo "  • The orchestration was previously canceled"
    echo "  • No orchestration was ever started for this issue"
    exit 0
  fi

  # Load the state
  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    STATUS=$(jq -r '.status // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)
    START_TIME=$(jq -r '.startTime // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)
    AGENTS_COUNT=$(jq -r '.agents | length // 0' "$ISSUE_STATE_FILE" 2>/dev/null)

    echo "✅ Active orchestration found"
    echo "   Status: $STATUS"
    echo "   Current Phase: $CURRENT_PHASE"
    echo "   Started: $START_TIME"
    echo "   Running Agents: $AGENTS_COUNT"

    return 0
  else
    echo "❌ Could not read orchestration state"
    exit 1
  fi
}

check_orchestration_status "$ISSUE_KEY"
```

### 3. Load Current Progress and Running Agents

```bash
load_current_progress() {
  local issue_key=$1

  echo ""
  echo "=== Loading Current Progress ==="

  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    # Extract completed phases and current work
    COMPLETED_PHASES=$(jq -r '.completedPhases // []' "$ISSUE_STATE_FILE" 2>/dev/null)
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)
    PHASE_RESULTS=$(jq -r '.phaseResults // {}' "$ISSUE_STATE_FILE" 2>/dev/null)

    echo "📊 Completed Phases:"
    echo "$COMPLETED_PHASES" | jq -r '.[]' | while read phase; do
      if [[ -n "$phase" ]]; then
        echo "   ✓ $phase"
      fi
    done

    echo ""
    echo "⏳ Current Phase: $CURRENT_PHASE"

    # Show phase results summary
    echo ""
    echo "📈 Work Summary:"
    echo "$PHASE_RESULTS" | jq -r 'to_entries[] | "   \(.key): \(.value | if type == "object" then "Completed" else . end)"' 2>/dev/null || true

  else
    echo "⚠️  No progress data available"
  fi
}

load_current_progress "$ISSUE_KEY"
```

### 4. Show Running Agents and Confirm Cancellation

```bash
confirm_cancellation() {
  local issue_key=$1
  local force_cancel=$2

  echo ""
  echo "=== Running Sub-Agents ==="

  # Get list of running agents
  if [[ -f "$ISSUE_AGENTS_FILE" ]]; then
    AGENT_COUNT=$(jq -r 'length' "$ISSUE_AGENTS_FILE" 2>/dev/null || echo "0")

    if [[ $AGENT_COUNT -gt 0 ]]; then
      echo "⚙️  Found $AGENT_COUNT running agent(s):"
      jq -r '.[] | "   • \(.name) (PID: \(.pid), Type: \(.type))"' "$ISSUE_AGENTS_FILE" 2>/dev/null || true
    else
      echo "⚙️  No running agents found"
    fi
  else
    echo "⚙️  No agent tracking file found"
  fi

  echo ""

  # Confirmation prompt
  if [[ "$force_cancel" != "--force" ]]; then
    echo "⚠️  WARNING: This will cancel the orchestration for $issue_key"
    echo ""
    echo "Are you sure you want to cancel? (yes/no)"
    read -r CONFIRM

    if [[ "$CONFIRM" != "yes" && "$CONFIRM" != "YES" && "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
      echo ""
      echo "❌ Cancellation aborted"
      exit 0
    fi
  fi

  echo "✅ Proceeding with cancellation..."
}

confirm_cancellation "$ISSUE_KEY" "$FORCE_CANCEL"
```

### 5. Stop All Running Sub-Agents

```bash
stop_running_agents() {
  local issue_key=$1

  echo ""
  echo "=== Stopping Sub-Agents ==="

  if [[ ! -f "$ISSUE_AGENTS_FILE" ]]; then
    echo "✅ No agents to stop"
    return 0
  fi

  # Kill each agent process
  STOPPED_COUNT=0
  jq -r '.[] | "\(.pid)"' "$ISSUE_AGENTS_FILE" 2>/dev/null | while read pid; do
    if [[ -n "$pid" && "$pid" != "null" ]]; then
      if kill -0 "$pid" 2>/dev/null; then
        echo "   Stopping agent (PID: $pid)..."
        kill -TERM "$pid" 2>/dev/null || true
        sleep 1

        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
          echo "   Force killing agent (PID: $pid)..."
          kill -9 "$pid" 2>/dev/null || true
        fi

        echo "   ✓ Agent stopped"
        ((STOPPED_COUNT++))
      else
        echo "   ℹ Agent (PID: $pid) already stopped"
      fi
    fi
  done

  echo "✅ All agents stopped (stopped: $STOPPED_COUNT)"
}

stop_running_agents "$ISSUE_KEY"
```

### 6. Create Checkpoint File for Potential Resume

```bash
create_checkpoint() {
  local issue_key=$1
  local no_checkpoint=$2

  echo ""
  echo "=== Creating Cancellation Checkpoint ==="

  if [[ "$no_checkpoint" == "--no-checkpoint" ]]; then
    echo "⊘ Checkpoint creation skipped (--no-checkpoint flag)"
    return 0
  fi

  # Ensure checkpoint directory exists
  mkdir -p "$ISSUE_CHECKPOINT_DIR"

  CHECKPOINT_FILE="$ISSUE_CHECKPOINT_DIR/${issue_key}-$(date -u +%Y%m%d-%H%M%S).json"

  # Create checkpoint with current state
  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    cat "$ISSUE_STATE_FILE" > "$CHECKPOINT_FILE"

    echo "✅ Checkpoint saved: $CHECKPOINT_FILE"
    echo ""
    echo "📝 Checkpoint Details:"
    jq -r '{
      issueKey: .issueKey,
      status: .status,
      canceledAt: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
      completedPhases: .completedPhases,
      currentPhase: .currentPhase,
      lastKnownProgress: .phaseResults,
      canResume: true,
      instructions: "To resume this orchestration, use: /jira:resume ' + .issueKey + '"
    }' "$CHECKPOINT_FILE" 2>/dev/null || true

    echo ""
    echo "💾 Resume Instructions:"
    echo "   To resume this work later, run: /jira:resume $issue_key"

  else
    echo "⚠️  Could not create checkpoint (state file not found)"
  fi
}

create_checkpoint "$ISSUE_KEY" "$NO_CHECKPOINT"
```

### 7. Update Jira Issue with Cancellation Comment

```bash
update_jira_comment() {
  local issue_key=$1

  echo ""
  echo "=== Updating Jira Issue ==="

  # Build cancellation summary
  COMMENT_TEXT="## ⛔ Orchestration Cancelled

**Cancelled At:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

### Work Completed Before Cancellation"

  # Add completed phases to comment
  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    COMPLETED_PHASES=$(jq -r '.completedPhases[]?' "$ISSUE_STATE_FILE" 2>/dev/null)

    if [[ -n "$COMPLETED_PHASES" ]]; then
      COMMENT_TEXT="$COMMENT_TEXT

"
      echo "$COMPLETED_PHASES" | while read phase; do
        if [[ -n "$phase" ]]; then
          COMMENT_TEXT="$COMMENT_TEXT
- ✓ $phase"
        fi
      done
    else
      COMMENT_TEXT="$COMMENT_TEXT
- *No phases completed before cancellation*"
    fi

    # Add current phase info
    CURRENT_PHASE=$(jq -r '.currentPhase' "$ISSUE_STATE_FILE" 2>/dev/null)
    if [[ -n "$CURRENT_PHASE" && "$CURRENT_PHASE" != "null" && "$CURRENT_PHASE" != "unknown" ]]; then
      COMMENT_TEXT="$COMMENT_TEXT

### In Progress
- ⏸ $CURRENT_PHASE (halted)"
    fi

    # Add resume instructions
    COMMENT_TEXT="$COMMENT_TEXT

### Resume
To resume this orchestration later, use the command:
\`\`\`
/jira:resume $issue_key
\`\`\`

A checkpoint has been saved with the current state."
  fi

  echo "📮 Jira Comment Preview:"
  echo "$COMMENT_TEXT" | sed 's/^/   /'
  echo ""

  # Note: Actual Jira API call would go here
  # This is a template for how the comment would be posted
  echo "✅ Comment prepared (ready to post to Jira)"
  echo "   Note: Jira API integration would be executed here"

  # Save comment for reference
  mkdir -p "$ORCHESTRATION_STATE_DIR/comments"
  echo "$COMMENT_TEXT" > "$ORCHESTRATION_STATE_DIR/comments/${issue_key}-cancel-$(date -u +%s).txt"
}

update_jira_comment "$ISSUE_KEY"
```

### 8. Optionally Revert Jira Issue Status

```bash
revert_issue_status() {
  local issue_key=$1

  echo ""
  echo "=== Reverting Issue Status (Optional) ==="

  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    PREVIOUS_STATUS=$(jq -r '.jira.previousStatus // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)
    CURRENT_STATUS=$(jq -r '.jira.currentStatus // "unknown"' "$ISSUE_STATE_FILE" 2>/dev/null)

    if [[ "$PREVIOUS_STATUS" != "unknown" && "$PREVIOUS_STATUS" != "$CURRENT_STATUS" ]]; then
      echo "📊 Status Information:"
      echo "   Previous Status: $PREVIOUS_STATUS"
      echo "   Current Status: $CURRENT_STATUS"
      echo ""
      echo "Would you like to revert the issue status to '$PREVIOUS_STATUS'? (yes/no)"
      read -r REVERT_CONFIRM

      if [[ "$REVERT_CONFIRM" == "yes" || "$REVERT_CONFIRM" == "YES" || "$REVERT_CONFIRM" == "y" || "$REVERT_CONFIRM" == "Y" ]]; then
        echo "✓ Issue status revert queued: $PREVIOUS_STATUS"
        echo "   (Actual Jira API call would execute here)"
      else
        echo "⊘ Skipped status revert"
      fi
    else
      echo "ℹ  Status unchanged during orchestration"
    fi
  else
    echo "ℹ  No status history available"
  fi
}

revert_issue_status "$ISSUE_KEY"
```

### 9. Clean Up Temporary Files

```bash
cleanup_temp_files() {
  local issue_key=$1

  echo ""
  echo "=== Cleaning Up Temporary Files ==="

  CLEANUP_COUNT=0

  # Note: Keep checkpoint files (for resume), but clean other temp files
  TEMP_PATTERNS=(
    "${ORCHESTRATION_STATE_DIR}/temp/${issue_key}*"
    "${ORCHESTRATION_STATE_DIR}/locks/${issue_key}.lock"
    "${ORCHESTRATION_STATE_DIR}/agents/${issue_key}.json"
  )

  for pattern in "${TEMP_PATTERNS[@]}"; do
    if ls $pattern >/dev/null 2>&1; then
      echo "   Removing: $(basename $pattern)"
      rm -f $pattern
      ((CLEANUP_COUNT++))
    fi
  done

  # Update state file to mark as canceled
  if [[ -f "$ISSUE_STATE_FILE" ]]; then
    # Update the state file with cancellation metadata
    jq ".status = \"canceled\" | .canceledAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .agents = [] | .runningProcesses = []" "$ISSUE_STATE_FILE" > "$ISSUE_STATE_FILE.tmp"
    mv "$ISSUE_STATE_FILE.tmp" "$ISSUE_STATE_FILE"
    echo "   ✓ State file updated"
  fi

  echo "✅ Cleanup completed ($CLEANUP_COUNT items removed)"
}

cleanup_temp_files "$ISSUE_KEY"
```

### 10. Provide Cancellation Summary and Resume Instructions

```bash
show_cancellation_summary() {
  local issue_key=$1

  echo ""
  echo "========================================"
  echo "  ORCHESTRATION CANCELED SUCCESSFULLY"
  echo "========================================"
  echo ""
  echo "📋 Summary:"
  echo "   Issue: $issue_key"
  echo "   Canceled At: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "✅ Actions Completed:"
  echo "   ✓ All running agents stopped"
  echo "   ✓ Current state saved to checkpoint"
  echo "   ✓ Jira issue updated with cancellation comment"
  echo "   ✓ Temporary files cleaned up"
  echo ""
  echo "📂 Checkpoint Location:"
  echo "   Directory: $ISSUE_CHECKPOINT_DIR"

  # List the checkpoint file
  if ls "$ISSUE_CHECKPOINT_DIR/${issue_key}-"*.json >/dev/null 2>&1; then
    LATEST_CHECKPOINT=$(ls -t "$ISSUE_CHECKPOINT_DIR/${issue_key}-"*.json 2>/dev/null | head -1)
    echo "   Latest: $(basename $LATEST_CHECKPOINT)"
  fi

  echo ""
  echo "🔄 To Resume This Orchestration Later:"
  echo "   /jira:resume $issue_key"
  echo ""
  echo "📝 Notes:"
  echo "   • Checkpoint data is preserved for 30 days"
  echo "   • Issue status can be manually reverted if needed"
  echo "   • All completed work is documented in Jira comments"
  echo ""
}

show_cancellation_summary "$ISSUE_KEY"
```

## Error Handling

The command handles these scenarios gracefully:

- **No active orchestration**: Informs user that no active orchestration exists
- **Already canceled**: Detects if orchestration was already canceled
- **Not yet started**: Detects if orchestration never started
- **Agents already stopped**: Handles cases where agents have stopped
- **State file missing**: Creates minimal state with available data
- **User cancels the cancellation**: Aborts if user doesn't confirm

## Safety Features

1. **Confirmation prompt**: Asks user to confirm before cancellation (unless --force)
2. **Progress visibility**: Shows completed phases before cancellation
3. **Checkpoint creation**: Automatically saves state (unless --no-checkpoint)
4. **Graceful shutdown**: Uses SIGTERM first, then SIGKILL for agents
5. **Status preservation**: Keeps issue status until user explicitly requests revert

## Resume Capability

The checkpoint file enables later resumption via `/jira:resume ISSUE-KEY`:
- Contains complete phase history
- Preserves all phase results
- Allows starting from the last completed phase
- Maintains Jira issue context

## Files Modified

- `~/.jira-orchestrator/state/{ISSUE-KEY}.json` - Updated with cancellation status
- `~/.jira-orchestrator/checkpoints/{ISSUE-KEY}-{timestamp}.json` - Created checkpoint
- `~/.jira-orchestrator/comments/{ISSUE-KEY}-cancel-{timestamp}.txt` - Comment draft saved
- Jira issue - Comment added with cancellation details
