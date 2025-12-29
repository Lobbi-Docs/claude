#!/bin/bash
# Post-Task Learning Hook
# Triggered after every task completion to record outcomes and update the learning system
# Part of the Real-Time Learning System (v5.0)

set -e

# ============================================
# CONFIGURATION
# ============================================

# Get plugin root from environment or use default
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
SESSIONS_DIR="$PLUGIN_ROOT/sessions"
INTELLIGENCE_DIR="$PLUGIN_ROOT/sessions/intelligence"
LIB_DIR="$PLUGIN_ROOT/lib"

# Ensure intelligence directory exists
mkdir -p "$INTELLIGENCE_DIR"

# ============================================
# LOGGING
# ============================================

LOG_FILE="$SESSIONS_DIR/learning-hook.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# ============================================
# INPUT PARAMETERS
# ============================================

# Can be called with explicit parameters or auto-detect from session
AGENT_NAME="${1:-}"
TASK_ID="${2:-}"
SUCCESS="${3:-}"
DURATION="${4:-}"
SESSION_ID="${5:-}"

# ============================================
# AUTO-DETECTION FROM SESSION
# ============================================

auto_detect_from_session() {
    local session_id="$1"

    if [ -z "$session_id" ]; then
        # Find most recent active or completed session
        local latest_session=$(find "$SESSIONS_DIR/active" "$SESSIONS_DIR/completed" -name "state.json" -type f 2>/dev/null | \
            xargs ls -t 2>/dev/null | head -1 | xargs dirname 2>/dev/null || echo "")

        if [ -z "$latest_session" ]; then
            log_error "No active or completed sessions found"
            return 1
        fi

        session_id="$latest_session"
    fi

    log "Auto-detecting from session: $session_id"

    # Extract state from session
    if [ ! -f "$session_id/state.json" ]; then
        log_error "Session state file not found: $session_id/state.json"
        return 1
    fi

    # Parse session state
    TASK_ID=$(jq -r '.issue_key // .task_id // "UNKNOWN"' "$session_id/state.json" 2>/dev/null || echo "UNKNOWN")

    # Determine primary agent (last agent that completed)
    AGENT_NAME=$(jq -r '.agents | to_entries | map(select(.value.status == "completed")) | .[-1].key // "unknown"' "$session_id/state.json" 2>/dev/null || echo "unknown")

    # Determine success based on final state
    local final_status=$(jq -r '.status // "unknown"' "$session_id/state.json" 2>/dev/null || echo "unknown")
    if [ "$final_status" = "completed" ] || [ "$final_status" = "success" ]; then
        SUCCESS="true"
    else
        SUCCESS="false"
    fi

    # Calculate duration
    local start_time=$(jq -r '.started_at // ""' "$session_id/state.json" 2>/dev/null || echo "")
    local end_time=$(jq -r '.completed_at // ""' "$session_id/state.json" 2>/dev/null || echo "")

    if [ -n "$start_time" ] && [ -n "$end_time" ]; then
        local start_ts=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
        local end_ts=$(date -d "$end_time" +%s 2>/dev/null || echo "0")
        DURATION=$((($end_ts - $start_ts) * 1000)) # Convert to milliseconds
    else
        DURATION="0"
    fi

    log "Detected: agent=$AGENT_NAME, task=$TASK_ID, success=$SUCCESS, duration=${DURATION}ms"
}

# ============================================
# EXTRACT TASK DETAILS
# ============================================

extract_task_details() {
    local task_id="$1"

    # Try to find task details from session
    local task_file=""

    # Check active sessions
    if [ -d "$SESSIONS_DIR/active" ]; then
        task_file=$(find "$SESSIONS_DIR/active" -name "task.json" -type f | \
            xargs grep -l "\"id\".*:.*\"$task_id\"" 2>/dev/null | head -1 || echo "")
    fi

    # Check completed sessions
    if [ -z "$task_file" ] && [ -d "$SESSIONS_DIR/completed" ]; then
        task_file=$(find "$SESSIONS_DIR/completed" -name "task.json" -type f | \
            xargs grep -l "\"id\".*:.*\"$task_id\"" 2>/dev/null | head -1 || echo "")
    fi

    if [ -n "$task_file" ]; then
        log "Found task details: $task_file"
        cat "$task_file"
    else
        # Create minimal task representation
        cat <<EOF
{
  "id": "$task_id",
  "type": "unknown",
  "complexity": 50,
  "domains": [],
  "description": "Task details not available",
  "estimatedDuration": 600000
}
EOF
    fi
}

extract_outcome_details() {
    local success="$1"
    local duration="$2"
    local session_id="$3"

    # Extract quality metrics if available
    local quality_score="0.8"
    local tests_pass="true"
    local tokens_used="0"
    local iterations="1"
    local error_message=""

    if [ -n "$session_id" ] && [ -f "$session_id/state.json" ]; then
        quality_score=$(jq -r '.metrics.quality_score // 0.8' "$session_id/state.json" 2>/dev/null || echo "0.8")
        tests_pass=$(jq -r '.metrics.tests_pass // true' "$session_id/state.json" 2>/dev/null || echo "true")
        tokens_used=$(jq -r '.metrics.tokens_used // 0' "$session_id/state.json" 2>/dev/null || echo "0")
        iterations=$(jq -r '.metrics.iterations // 1' "$session_id/state.json" 2>/dev/null || echo "1")

        if [ "$success" = "false" ]; then
            error_message=$(jq -r '.error // "Unknown error"' "$session_id/state.json" 2>/dev/null || echo "Unknown error")
        fi
    fi

    # Build outcome JSON
    cat <<EOF
{
  "success": $success,
  "duration": $duration,
  "qualityScore": $quality_score,
  "testsPass": $tests_pass,
  "tokensUsed": $tokens_used,
  "iterations": $iterations
  $(if [ "$success" = "false" ]; then echo ", \"error\": \"$error_message\""; fi)
}
EOF
}

# ============================================
# RECORD LEARNING EVENT
# ============================================

record_learning_event() {
    local agent="$1"
    local task_json="$2"
    local outcome_json="$3"

    # Build learning event
    local learning_event=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "agent": "$agent",
  "task": $task_json,
  "outcome": $outcome_json,
  "context": {
    "timeOfDay": "$(date +%p | tr '[:upper:]' '[:lower:]')",
    "workloadLevel": "medium",
    "hook": "post-task-learning"
  }
}
EOF
)

    log "Recording learning event for agent: $agent"

    # Append to history file
    local history_file="$INTELLIGENCE_DIR/task-outcome-history.json"

    if [ ! -f "$history_file" ]; then
        echo "[]" > "$history_file"
    fi

    # Append event to history (keep last 1000 events)
    local temp_file=$(mktemp)
    jq ". += [$learning_event] | .[-1000:]" "$history_file" > "$temp_file" && mv "$temp_file" "$history_file"

    log "Learning event recorded successfully"

    # Trigger pattern extraction if conditions met
    trigger_pattern_extraction_if_needed "$agent"
}

# ============================================
# PATTERN EXTRACTION TRIGGER
# ============================================

trigger_pattern_extraction_if_needed() {
    local agent="$1"

    # Count recent events for this agent
    local history_file="$INTELLIGENCE_DIR/task-outcome-history.json"
    local recent_count=$(jq "[.[] | select(.agent == \"$agent\")] | length" "$history_file" 2>/dev/null || echo "0")

    log "Agent $agent has $recent_count total events"

    # Trigger pattern extraction every 10 tasks
    if [ $((recent_count % 10)) -eq 0 ] && [ "$recent_count" -gt 0 ]; then
        log "Triggering pattern extraction for $agent (reached $recent_count tasks)"

        # Async trigger - don't block the hook
        (
            # Call pattern analyzer agent
            # This would integrate with the Claude Code agent system
            log "Pattern extraction triggered for $agent"

            # Update metrics
            update_learning_metrics
        ) &
    fi
}

# ============================================
# UPDATE LEARNING METRICS
# ============================================

update_learning_metrics() {
    local metrics_file="$INTELLIGENCE_DIR/learning-metrics.json"
    local history_file="$INTELLIGENCE_DIR/task-outcome-history.json"

    if [ ! -f "$history_file" ]; then
        return
    fi

    # Calculate basic metrics
    local total_events=$(jq 'length' "$history_file" 2>/dev/null || echo "0")
    local success_count=$(jq '[.[] | select(.outcome.success == true)] | length' "$history_file" 2>/dev/null || echo "0")
    local success_rate=$(echo "scale=3; $success_count / $total_events" | bc 2>/dev/null || echo "0")

    # Update metrics file
    local temp_file=$(mktemp)
    cat > "$temp_file" <<EOF
{
  "totalEvents": $total_events,
  "patternsExtracted": $(jq '.patternsExtracted // 0' "$metrics_file" 2>/dev/null || echo "0"),
  "profilesUpdated": $(jq 'length' "$INTELLIGENCE_DIR/agent-profiles.json" 2>/dev/null || echo "0"),
  "averageSuccessRate": $success_rate,
  "improvementRate": $(jq '.improvementRate // 0' "$metrics_file" 2>/dev/null || echo "0"),
  "lastConsolidation": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF

    mv "$temp_file" "$metrics_file"
    log "Learning metrics updated: $total_events events, ${success_rate} success rate"
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    log "=== Post-Task Learning Hook Started ==="

    # Auto-detect if parameters not provided
    if [ -z "$AGENT_NAME" ] || [ -z "$TASK_ID" ]; then
        log "Auto-detecting task details from session..."
        auto_detect_from_session "$SESSION_ID" || {
            log_error "Failed to auto-detect task details"
            exit 1
        }
    fi

    # Validate inputs
    if [ -z "$AGENT_NAME" ] || [ -z "$TASK_ID" ]; then
        log_error "Missing required parameters: agent_name=$AGENT_NAME, task_id=$TASK_ID"
        echo "Usage: $0 <agent_name> <task_id> <success> <duration> [session_id]"
        echo "   or: $0 (auto-detect from latest session)"
        exit 1
    fi

    log "Processing: agent=$AGENT_NAME, task=$TASK_ID, success=$SUCCESS"

    # Extract task and outcome details
    local task_json=$(extract_task_details "$TASK_ID")
    local outcome_json=$(extract_outcome_details "$SUCCESS" "$DURATION" "$SESSION_ID")

    # Record learning event
    record_learning_event "$AGENT_NAME" "$task_json" "$outcome_json"

    # Update metrics
    update_learning_metrics

    log "=== Post-Task Learning Hook Completed ==="
}

# Run main function
main "$@"
