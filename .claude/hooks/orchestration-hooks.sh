#!/bin/bash
# Orchestration Hooks for Claude Code
# These hooks integrate with the orchestration system to track agent activity
# VERSION 4.0.0 - Mandatory Sub-Agent Orchestration Protocol

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCH_DIR="${SCRIPT_DIR}/../orchestration"
DB_PATH="${ORCH_DIR}/db/agents.db"
LOG_DIR="${ORCH_DIR}/logs"
STATE_DIR="${ORCH_DIR}/state"
PHASE_FILE="${STATE_DIR}/current_phase.json"
CONTEXT_FILE="${STATE_DIR}/context_preservation.json"
NEXT_STEPS_FILE="${STATE_DIR}/next_steps.json"

# Orchestration Protocol Configuration
MIN_SUB_AGENTS=3
MAX_SUB_AGENTS=13
DEFAULT_SUB_AGENTS=5
MANDATORY_PHASES=("explore" "plan" "code" "test" "fix" "document")

# Ensure directories exist
mkdir -p "$LOG_DIR" "$STATE_DIR"

# Get or generate agent ID
get_agent_id() {
    if [ -n "$CLAUDE_AGENT_ID" ]; then
        echo "$CLAUDE_AGENT_ID"
    else
        echo "claude-$(hostname)-$$"
    fi
}

# Get session ID
get_session_id() {
    if [ -n "$CLAUDE_SESSION_ID" ]; then
        echo "$CLAUDE_SESSION_ID"
    else
        echo ""
    fi
}

# Log activity to database
log_activity() {
    local action="$1"
    local message="$2"
    local category="${3:-agent_activity}"
    local level="${4:-INFO}"
    local details="$5"

    local agent_id=$(get_agent_id)
    local session_id=$(get_session_id)

    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            INSERT INTO activity_log (agent_id, session_id, action, category, level, message, details)
            VALUES ('$agent_id', '$session_id', '$action', '$category', '$level', '$message', '$details');
        " 2>/dev/null || true
    fi

    # Also log to file
    local timestamp=$(date -Iseconds)
    echo "[$timestamp] [$level] [$action] $message" >> "${LOG_DIR}/$(date +%Y-%m-%d).log"
}

# Pre-task hook: Called before starting a task
pre_task_hook() {
    local task_description="$1"
    local agent_id=$(get_agent_id)

    log_activity "task_started" "Starting task: $task_description" "task_execution" "INFO"

    # Update agent status
    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            INSERT INTO agents (id, name, type, status, last_active_at)
            VALUES ('$agent_id', '$agent_id', 'claude', 'running', datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                status = 'running',
                last_active_at = datetime('now'),
                updated_at = datetime('now');
        " 2>/dev/null || true
    fi

    echo "Orchestration: Task started - $task_description"
}

# Post-task hook: Called after completing a task
post_task_hook() {
    local task_description="$1"
    local status="${2:-completed}"
    local agent_id=$(get_agent_id)

    log_activity "task_completed" "Completed task: $task_description (status: $status)" "task_execution" "INFO"

    # Update agent status
    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            UPDATE agents SET status = 'idle', last_active_at = datetime('now')
            WHERE id = '$agent_id';
        " 2>/dev/null || true
    fi

    echo "Orchestration: Task completed - $task_description"
}

# File edit hook: Called when a file is modified
file_edit_hook() {
    local file_path="$1"
    local operation="${2:-edit}"
    local agent_id=$(get_agent_id)
    local session_id=$(get_session_id)

    log_activity "file_$operation" "File $operation: $file_path" "task_execution" "INFO"

    # Record file operation
    if [ -f "$DB_PATH" ]; then
        local content_hash=""
        if [ -f "$file_path" ]; then
            content_hash=$(sha256sum "$file_path" 2>/dev/null | cut -d' ' -f1)
        fi

        sqlite3 "$DB_PATH" "
            INSERT INTO file_operations (agent_id, session_id, operation, file_path, content_hash)
            VALUES ('$agent_id', '$session_id', '$operation', '$file_path', '$content_hash');
        " 2>/dev/null || true
    fi
}

# Checkpoint hook: Create a checkpoint
checkpoint_hook() {
    local checkpoint_type="$1"
    local state_json="$2"
    local agent_id=$(get_agent_id)
    local session_id=$(get_session_id)

    local checkpoint_id=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            INSERT INTO checkpoints (id, agent_id, session_id, checkpoint_type, state)
            VALUES ('$checkpoint_id', '$agent_id', '$session_id', '$checkpoint_type', '$state_json');
        " 2>/dev/null || true
    fi

    log_activity "checkpoint_created" "Created checkpoint: $checkpoint_type ($checkpoint_id)" "checkpoints" "INFO"

    echo "$checkpoint_id"
}

# Lock acquire hook
lock_acquire_hook() {
    local resource_id="$1"
    local resource_type="${2:-file}"
    local agent_id=$(get_agent_id)
    local session_id=$(get_session_id)
    local timeout_minutes="${3:-5}"

    local expires_at=$(date -d "+${timeout_minutes} minutes" -Iseconds 2>/dev/null || date -v+${timeout_minutes}M -Iseconds)

    if [ -f "$DB_PATH" ]; then
        # Check if already locked
        local existing=$(sqlite3 "$DB_PATH" "
            SELECT owner_agent_id FROM locks
            WHERE resource_id = '$resource_id' AND expires_at > datetime('now');
        " 2>/dev/null)

        if [ -n "$existing" ]; then
            log_activity "lock_failed" "Failed to acquire lock: $resource_id (owned by $existing)" "coordination" "WARN"
            return 1
        fi

        # Acquire lock
        sqlite3 "$DB_PATH" "
            INSERT INTO locks (resource_id, resource_type, owner_agent_id, owner_session_id, expires_at)
            VALUES ('$resource_id', '$resource_type', '$agent_id', '$session_id', '$expires_at')
            ON CONFLICT(resource_id) DO UPDATE SET
                owner_agent_id = excluded.owner_agent_id,
                acquired_at = datetime('now'),
                expires_at = excluded.expires_at;
        " 2>/dev/null || return 1

        log_activity "lock_acquired" "Acquired lock: $resource_id ($resource_type)" "coordination" "INFO"
        return 0
    fi

    return 1
}

# Lock release hook
lock_release_hook() {
    local resource_id="$1"
    local agent_id=$(get_agent_id)

    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            DELETE FROM locks WHERE resource_id = '$resource_id' AND owner_agent_id = '$agent_id';
        " 2>/dev/null || true

        log_activity "lock_released" "Released lock: $resource_id" "coordination" "INFO"
    fi
}

# Message send hook
message_send_hook() {
    local channel="$1"
    local message_type="$2"
    local body="$3"
    local recipient_id="$4"
    local agent_id=$(get_agent_id)
    local session_id=$(get_session_id)

    local message_id=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            INSERT INTO messages (id, channel, sender_id, recipient_id, session_id, message_type, body)
            VALUES ('$message_id', '$channel', '$agent_id', '$recipient_id', '$session_id', '$message_type', '$body');
        " 2>/dev/null || true

        log_activity "message_sent" "Sent $message_type to $channel" "communication" "INFO"
    fi

    echo "$message_id"
}

# Error hook
error_hook() {
    local error_message="$1"
    local context="$2"
    local agent_id=$(get_agent_id)

    log_activity "error" "$error_message" "errors" "ERROR" "$context"

    # Create error checkpoint
    checkpoint_hook "error" "{\"error\": \"$error_message\", \"context\": \"$context\"}"

    # Broadcast error
    message_send_hook "broadcast" "error" "Error in $agent_id: $error_message" ""
}

# ============================================================================
# MANDATORY SUB-AGENT ORCHESTRATION PROTOCOL (v4.0.0)
# All Claude operations MUST follow this protocol
# ============================================================================

# Validate sub-agent count
validate_sub_agents() {
    local count="$1"
    local task_type="${2:-standard}"

    if [ "$count" -lt "$MIN_SUB_AGENTS" ]; then
        log_activity "orchestration_violation" "Sub-agent count ($count) below minimum ($MIN_SUB_AGENTS)" "orchestration" "ERROR"
        echo "ERROR: Minimum $MIN_SUB_AGENTS sub-agents required. Found: $count"
        return 1
    fi

    if [ "$count" -gt "$MAX_SUB_AGENTS" ]; then
        log_activity "orchestration_warning" "Sub-agent count ($count) above maximum ($MAX_SUB_AGENTS)" "orchestration" "WARN"
        echo "WARNING: Maximum $MAX_SUB_AGENTS sub-agents allowed. Found: $count"
        return 1
    fi

    log_activity "orchestration_validated" "Sub-agent count validated: $count agents" "orchestration" "INFO"
    return 0
}

# Initialize phase tracking
init_phase_tracking() {
    local session_id=$(get_session_id)
    local timestamp=$(date -Iseconds)

    cat > "$PHASE_FILE" << EOF
{
    "session_id": "$session_id",
    "current_phase": "explore",
    "phase_index": 0,
    "phases": ["explore", "plan", "code", "test", "fix", "document"],
    "phase_history": [],
    "started_at": "$timestamp",
    "last_updated": "$timestamp"
}
EOF

    log_activity "phase_init" "Phase tracking initialized for session $session_id" "orchestration" "INFO"
}

# Get current phase
get_current_phase() {
    if [ -f "$PHASE_FILE" ]; then
        cat "$PHASE_FILE" | grep -o '"current_phase": "[^"]*"' | cut -d'"' -f4
    else
        echo "explore"
    fi
}

# Transition to next phase
transition_phase() {
    local new_phase="$1"
    local reason="${2:-automatic}"
    local current_phase=$(get_current_phase)
    local session_id=$(get_session_id)
    local timestamp=$(date -Iseconds)

    # Validate phase exists in mandatory phases
    local valid=false
    for phase in "${MANDATORY_PHASES[@]}"; do
        if [ "$phase" == "$new_phase" ]; then
            valid=true
            break
        fi
    done

    if [ "$valid" != "true" ]; then
        log_activity "phase_error" "Invalid phase: $new_phase" "orchestration" "ERROR"
        return 1
    fi

    # Log phase transition
    log_activity "phase_transition" "Transitioning from $current_phase to $new_phase ($reason)" "orchestration" "INFO"

    # Update phase file
    if [ -f "$PHASE_FILE" ]; then
        # Read current state and update
        local phase_index=0
        for i in "${!MANDATORY_PHASES[@]}"; do
            if [ "${MANDATORY_PHASES[$i]}" == "$new_phase" ]; then
                phase_index=$i
                break
            fi
        done

        cat > "$PHASE_FILE" << EOF
{
    "session_id": "$session_id",
    "current_phase": "$new_phase",
    "previous_phase": "$current_phase",
    "phase_index": $phase_index,
    "phases": ["explore", "plan", "code", "test", "fix", "document"],
    "transition_reason": "$reason",
    "last_updated": "$timestamp"
}
EOF
    fi

    # Trigger phase transition hook
    source "${SCRIPT_DIR}/pre-task.sh" phase-transition "$current_phase" "$new_phase" 2>/dev/null || true

    return 0
}

# Validate phase order (enforce Explore → Plan → Code → Test → Fix → Document)
validate_phase_order() {
    local requested_phase="$1"
    local current_phase=$(get_current_phase)

    local current_index=-1
    local requested_index=-1

    for i in "${!MANDATORY_PHASES[@]}"; do
        if [ "${MANDATORY_PHASES[$i]}" == "$current_phase" ]; then
            current_index=$i
        fi
        if [ "${MANDATORY_PHASES[$i]}" == "$requested_phase" ]; then
            requested_index=$i
        fi
    done

    # Cannot skip phases (except going backwards for fixes)
    if [ "$requested_index" -gt $((current_index + 1)) ]; then
        log_activity "phase_violation" "Cannot skip from $current_phase to $requested_phase" "orchestration" "ERROR"
        echo "ERROR: Cannot skip phases. Current: $current_phase, Requested: $requested_phase"
        echo "       Next valid phase: ${MANDATORY_PHASES[$((current_index + 1))]}"
        return 1
    fi

    return 0
}

# Preserve context across phases
preserve_context() {
    local context_data="$1"
    local phase=$(get_current_phase)
    local session_id=$(get_session_id)
    local timestamp=$(date -Iseconds)

    cat > "$CONTEXT_FILE" << EOF
{
    "session_id": "$session_id",
    "phase": "$phase",
    "context": $context_data,
    "preserved_at": "$timestamp"
}
EOF

    log_activity "context_preserved" "Context preserved for phase $phase" "orchestration" "INFO"
}

# Retrieve preserved context
retrieve_context() {
    if [ -f "$CONTEXT_FILE" ]; then
        cat "$CONTEXT_FILE"
    else
        echo "{}"
    fi
}

# Track next steps
track_next_steps() {
    local next_steps_json="$1"
    local phase=$(get_current_phase)
    local session_id=$(get_session_id)
    local timestamp=$(date -Iseconds)

    cat > "$NEXT_STEPS_FILE" << EOF
{
    "session_id": "$session_id",
    "current_phase": "$phase",
    "next_steps": $next_steps_json,
    "updated_at": "$timestamp"
}
EOF

    log_activity "next_steps_updated" "Next steps tracked for phase $phase" "orchestration" "INFO"
}

# Get next steps
get_next_steps() {
    if [ -f "$NEXT_STEPS_FILE" ]; then
        cat "$NEXT_STEPS_FILE"
    else
        echo '{"next_steps": []}'
    fi
}

# Pre-task orchestration check
orchestration_pre_check() {
    local task_description="$1"
    local agent_count="${2:-5}"
    local requested_phase="${3:-explore}"

    # Validate sub-agent count
    if ! validate_sub_agents "$agent_count"; then
        echo "ORCHESTRATION VIOLATION: Sub-agent count out of range [$MIN_SUB_AGENTS-$MAX_SUB_AGENTS]"
        return 1
    fi

    # Validate phase order
    if ! validate_phase_order "$requested_phase"; then
        echo "ORCHESTRATION VIOLATION: Phase order not followed"
        return 1
    fi

    # Initialize phase tracking if needed
    if [ ! -f "$PHASE_FILE" ]; then
        init_phase_tracking
    fi

    log_activity "orchestration_pre_check" "Pre-check passed: $agent_count agents, phase: $requested_phase" "orchestration" "INFO"
    return 0
}

# Post-task orchestration validation
orchestration_post_check() {
    local task_description="$1"
    local status="${2:-completed}"
    local current_phase=$(get_current_phase)

    case "$status" in
        completed)
            log_activity "orchestration_post_check" "Task completed in phase $current_phase" "orchestration" "INFO"

            # Check if tests were run (required before marking as done)
            if [ "$current_phase" != "document" ] && [ "$current_phase" != "test" ] && [ "$current_phase" != "fix" ]; then
                log_activity "orchestration_warning" "Task completed without reaching test phase" "orchestration" "WARN"
            fi
            ;;
        failed)
            log_activity "orchestration_post_check" "Task failed in phase $current_phase" "orchestration" "WARN"
            # Transition to fix phase on failure
            transition_phase "fix" "task_failure"
            ;;
    esac
}

# Enforce documentation update after changes
enforce_documentation() {
    local changed_files="$1"
    local current_phase=$(get_current_phase)

    if [ "$current_phase" == "code" ] || [ "$current_phase" == "fix" ]; then
        log_activity "doc_reminder" "Documentation update required for: $changed_files" "orchestration" "INFO"
        echo "REMINDER: Update documentation after code/fix phase"
        return 0
    fi
    return 0
}

# Generate orchestration status report
orchestration_status() {
    local session_id=$(get_session_id)
    local current_phase=$(get_current_phase)
    local next_steps=$(get_next_steps)
    local context=$(retrieve_context)

    echo "=============================================="
    echo "  ORCHESTRATION STATUS REPORT"
    echo "=============================================="
    echo "Session ID:     $session_id"
    echo "Current Phase:  $current_phase"
    echo "Min Sub-Agents: $MIN_SUB_AGENTS"
    echo "Max Sub-Agents: $MAX_SUB_AGENTS"
    echo ""
    echo "Mandatory Phases: ${MANDATORY_PHASES[*]}"
    echo ""
    echo "Next Steps:"
    echo "$next_steps" | grep -o '"next_steps": \[[^]]*\]' | sed 's/"next_steps": //' 2>/dev/null || echo "  None tracked"
    echo ""
    echo "Context Preserved: $([ -f "$CONTEXT_FILE" ] && echo "Yes" || echo "No")"
    echo "=============================================="
}

# ============================================================================
# AGENT ACTIVITY LOGGING HOOKS
# Integration with Obsidian MCP for activity tracking
# ============================================================================

# Hook: On agent start
on_agent_start() {
    local agent_type="$1"
    local task_id="$2"
    local parent_task="$3"

    # Call Python logger
    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/agent_activity_logger.py" start "$agent_type" "$task_id" "$parent_task" 2>/dev/null || true
    fi

    log_activity "agent_start" "Agent started: type=$agent_type, task=$task_id, parent=$parent_task" "agent_activity" "INFO"
}

# Hook: On phase transition
on_agent_phase() {
    local agent_id="$1"
    local phase="$2"
    local action="$3"

    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/agent_activity_logger.py" phase "$agent_id" "$phase" "$action" 2>/dev/null || true
    fi

    log_activity "agent_phase" "Phase transition: agent=$agent_id, phase=$phase, action=$action" "agent_activity" "INFO"
}

# Hook: On checkpoint
on_checkpoint() {
    local agent_id="$1"
    local checkpoint="$2"

    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/agent_activity_logger.py" checkpoint "$agent_id" "$checkpoint" 2>/dev/null || true
    fi

    log_activity "agent_checkpoint" "Checkpoint: agent=$agent_id, checkpoint=$checkpoint" "checkpoints" "INFO"
}

# Hook: On agent complete
on_agent_complete() {
    local agent_id="$1"
    local status="$2"
    local errors="${3:-0}"
    local warnings="${4:-0}"

    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/agent_activity_logger.py" complete "$agent_id" "$status" "$errors" "$warnings" 2>/dev/null || true
    fi

    log_activity "agent_complete" "Agent completed: id=$agent_id, status=$status, errors=$errors, warnings=$warnings" "agent_activity" "INFO"
}

# Hook: Daily summary (run via cron)
on_daily_summary() {
    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/log-rotation.py" generate_summary 2>/dev/null || true
    fi
}

# Hook: Log rotation (run via cron)
on_log_rotation() {
    if command -v python3 &> /dev/null; then
        python3 "${ORCH_DIR}/log-rotation.py" rotate 2>/dev/null || true
    fi
}

# Main dispatcher for hook calls
case "${1:-}" in
    pre-task)
        pre_task_hook "$2"
        ;;
    post-task)
        post_task_hook "$2" "$3"
        ;;
    file-edit)
        file_edit_hook "$2" "$3"
        ;;
    checkpoint)
        checkpoint_hook "$2" "$3"
        ;;
    lock-acquire)
        lock_acquire_hook "$2" "$3" "$4"
        ;;
    lock-release)
        lock_release_hook "$2"
        ;;
    message)
        message_send_hook "$2" "$3" "$4" "$5"
        ;;
    error)
        error_hook "$2" "$3"
        ;;
    # New orchestration protocol commands (v4.0.0)
    validate-agents)
        validate_sub_agents "$2" "$3"
        ;;
    init-phases)
        init_phase_tracking
        ;;
    get-phase)
        get_current_phase
        ;;
    transition-phase)
        transition_phase "$2" "$3"
        ;;
    validate-phase-order)
        validate_phase_order "$2"
        ;;
    preserve-context)
        preserve_context "$2"
        ;;
    get-context)
        retrieve_context
        ;;
    track-next-steps)
        track_next_steps "$2"
        ;;
    get-next-steps)
        get_next_steps
        ;;
    pre-check)
        orchestration_pre_check "$2" "$3" "$4"
        ;;
    post-check)
        orchestration_post_check "$2" "$3"
        ;;
    enforce-docs)
        enforce_documentation "$2"
        ;;
    status)
        orchestration_status
        ;;
    # Agent Activity Logging Hooks
    agent-start)
        on_agent_start "$2" "$3" "$4"
        ;;
    agent-phase)
        on_agent_phase "$2" "$3" "$4"
        ;;
    agent-checkpoint)
        on_checkpoint "$2" "$3"
        ;;
    agent-complete)
        on_agent_complete "$2" "$3" "$4" "$5"
        ;;
    daily-summary)
        on_daily_summary
        ;;
    log-rotation)
        on_log_rotation
        ;;
    *)
        echo "Orchestration Hooks v4.0.0 - Mandatory Sub-Agent Protocol"
        echo "Usage: $0 <hook-type> [args...]"
        echo ""
        echo "Basic Hooks:"
        echo "  pre-task <description>          - Before starting a task"
        echo "  post-task <description> [status] - After completing a task"
        echo "  file-edit <path> [operation]    - When a file is modified"
        echo "  checkpoint <type> <state_json>  - Create a checkpoint"
        echo "  lock-acquire <resource> [type] [timeout] - Acquire a lock"
        echo "  lock-release <resource>         - Release a lock"
        echo "  message <channel> <type> <body> [recipient] - Send a message"
        echo "  error <message> [context]       - Log an error"
        echo ""
        echo "Orchestration Protocol (v4.0.0):"
        echo "  validate-agents <count> [type]  - Validate sub-agent count (min: $MIN_SUB_AGENTS, max: $MAX_SUB_AGENTS)"
        echo "  init-phases                     - Initialize phase tracking"
        echo "  get-phase                       - Get current phase"
        echo "  transition-phase <phase> [reason] - Transition to next phase"
        echo "  validate-phase-order <phase>    - Validate phase order"
        echo "  preserve-context <json>         - Preserve context across phases"
        echo "  get-context                     - Retrieve preserved context"
        echo "  track-next-steps <json>         - Track next steps"
        echo "  get-next-steps                  - Get current next steps"
        echo "  pre-check <desc> <agents> <phase> - Full pre-task orchestration check"
        echo "  post-check <desc> [status]      - Post-task validation"
        echo "  enforce-docs <files>            - Enforce documentation update"
        echo "  status                          - Show orchestration status report"
        echo ""
        echo "Agent Activity Logging:"
        echo "  agent-start <type> <task_id> [parent] - Agent started"
        echo "  agent-phase <id> <phase> <action>     - Phase transition"
        echo "  agent-checkpoint <id> <checkpoint>    - Checkpoint created"
        echo "  agent-complete <id> <status> [err] [warn] - Agent completed"
        echo "  daily-summary                         - Generate daily summary"
        echo "  log-rotation                          - Rotate old logs"
        echo ""
        echo "Mandatory Phases: explore → plan → code → test → fix → document"
        echo "Sub-Agent Range:  $MIN_SUB_AGENTS - $MAX_SUB_AGENTS agents per task"
        ;;
esac
