#!/bin/bash
# Session Resume Script
# Lists active Jira orchestrations and allows resuming them

set -e

# Get plugin root from environment or use default
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
SESSIONS_DIR="$PLUGIN_ROOT/sessions"

# Function to format time ago
time_ago() {
    local timestamp="$1"
    local now=$(date +%s)
    local diff=$((now - timestamp))

    if [ $diff -lt 60 ]; then
        echo "${diff}s ago"
    elif [ $diff -lt 3600 ]; then
        echo "$((diff / 60))m ago"
    elif [ $diff -lt 86400 ]; then
        echo "$((diff / 3600))h ago"
    else
        echo "$((diff / 86400))d ago"
    fi
}

# Function to get session status
get_session_status() {
    local session_dir="$1"

    if [ ! -f "$session_dir/state.json" ]; then
        echo "unknown"
        return
    fi

    local current_phase=$(jq -r '.current_phase // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")
    local agents_completed=$(jq -r '.agents | to_entries[] | select(.value.status == "completed") | .key' "$session_dir/state.json" 2>/dev/null | wc -l || echo "0")
    local agents_total=$(jq -r '.workflow | length // 0' "$session_dir/state.json" 2>/dev/null || echo "0")

    echo "$current_phase ($agents_completed/$agents_total agents)"
}

# Function to check if session is stale
is_stale_session() {
    local session_dir="$1"
    local threshold=86400  # 24 hours in seconds

    if [ -f "$session_dir/state.json" ]; then
        local last_modified=$(stat -c %Y "$session_dir/state.json" 2>/dev/null || echo "0")
        local now=$(date +%s)
        local age=$((now - last_modified))

        if [ $age -gt $threshold ]; then
            return 0
        fi
    fi

    return 1
}

# Function to list active sessions
list_active_sessions() {
    local active_count=0
    local stale_sessions=()

    if [ ! -d "$SESSIONS_DIR/active" ]; then
        echo "NO_ACTIVE_SESSIONS"
        return 0
    fi

    echo "---ACTIVE_SESSIONS---"

    for session_dir in "$SESSIONS_DIR/active"/*; do
        if [ ! -d "$session_dir" ] || [ ! -f "$session_dir/state.json" ]; then
            continue
        fi

        local session_id=$(basename "$session_dir")
        local issue_key=$(jq -r '.issue_key // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")
        local issue_summary=$(jq -r '.issue_summary // "No summary"' "$session_dir/state.json" 2>/dev/null || echo "No summary")
        local current_phase=$(jq -r '.current_phase // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")
        local status=$(get_session_status "$session_dir")
        local last_modified=$(stat -c %Y "$session_dir/state.json" 2>/dev/null || echo "0")
        local last_activity=$(time_ago "$last_modified")

        # Check if stale
        local is_stale=""
        if is_stale_session "$session_dir"; then
            is_stale=" [STALE]"
            stale_sessions+=("$session_id")
        fi

        # Output session details
        echo ""
        echo "[$((active_count + 1))] $issue_key: $issue_summary$is_stale"
        echo "    Phase: $current_phase"
        echo "    Status: $status"
        echo "    Last Activity: $last_activity"
        echo "    Session: $session_id"
        echo "    Directory: $session_dir"

        active_count=$((active_count + 1))
    done

    echo ""
    echo "---SUMMARY---"
    echo "Total active sessions: $active_count"

    if [ ${#stale_sessions[@]} -gt 0 ]; then
        echo "Stale sessions (>24h): ${#stale_sessions[@]}"
        echo "Stale session IDs: ${stale_sessions[*]}"
    fi

    if [ $active_count -eq 0 ]; then
        echo "NO_ACTIVE_SESSIONS"
    fi

    return 0
}

# Function to get session details
get_session_details() {
    local session_id="$1"
    local session_dir="$SESSIONS_DIR/active/$session_id"

    if [ ! -f "$session_dir/state.json" ]; then
        echo "ERROR: Session not found: $session_id"
        return 1
    fi

    echo "---SESSION_DETAILS---"
    echo "Session ID: $session_id"
    echo ""

    # Issue information
    echo "Issue:"
    echo "  Key: $(jq -r '.issue_key // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
    echo "  Summary: $(jq -r '.issue_summary // "No summary"' "$session_dir/state.json" 2>/dev/null || echo "No summary")"
    echo "  Type: $(jq -r '.issue_type // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
    echo ""

    # Workflow progress
    echo "Workflow Progress:"
    echo "  Current Phase: $(jq -r '.current_phase // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
    echo ""

    # Agent status
    echo "Agents:"
    jq -r '.agents | to_entries[] | "  \(.key): \(.value.status // "pending")"' "$session_dir/state.json" 2>/dev/null || echo "  No agent data"
    echo ""

    # Completed agents output
    echo "Completed Agents Output:"
    jq -r '.agents | to_entries[] | select(.value.status == "completed") | "  \(.key):\n    Output: \(.value.output // "none")\n    Summary: \(.value.summary // "no summary")"' "$session_dir/state.json" 2>/dev/null || echo "  None"
    echo ""

    # Pending agents
    echo "Pending Agents:"
    jq -r '.agents | to_entries[] | select(.value.status == "pending" or .value.status == null) | "  - \(.key)"' "$session_dir/state.json" 2>/dev/null || echo "  None"
    echo ""

    # Files modified
    echo "Files Modified:"
    jq -r '.files_modified[]? // "  None"' "$session_dir/state.json" 2>/dev/null || echo "  None"
    echo ""

    # Session metadata
    echo "Metadata:"
    echo "  Created: $(jq -r '.created_at // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
    echo "  Last Updated: $(jq -r '.updated_at // "unknown"' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
    local last_modified=$(stat -c %Y "$session_dir/state.json" 2>/dev/null || echo "0")
    echo "  Last Activity: $(time_ago "$last_modified")"
    echo ""

    # Output directory
    echo "Output Directory: $session_dir"
    echo ""

    # Available logs
    if [ -d "$session_dir/logs" ]; then
        echo "Available Logs:"
        ls -1 "$session_dir/logs" 2>/dev/null | sed 's/^/  - /' || echo "  None"
    fi

    return 0
}

# Function to cleanup stale sessions
cleanup_stale_sessions() {
    local stale_dir="$SESSIONS_DIR/stale"
    mkdir -p "$stale_dir"

    local moved_count=0

    if [ -d "$SESSIONS_DIR/active" ]; then
        for session_dir in "$SESSIONS_DIR/active"/*; do
            if [ ! -d "$session_dir" ]; then
                continue
            fi

            if is_stale_session "$session_dir"; then
                local session_id=$(basename "$session_dir")
                echo "Moving stale session to stale directory: $session_id"
                mv "$session_dir" "$stale_dir/"
                moved_count=$((moved_count + 1))
            fi
        done
    fi

    echo ""
    echo "Cleanup complete: $moved_count session(s) moved to stale"
    echo "Stale directory: $stale_dir"

    return 0
}

# Main execution
case "${1:-list}" in
    list)
        list_active_sessions
        ;;
    details)
        if [ -z "$2" ]; then
            echo "ERROR: Session ID required"
            echo "Usage: $0 details <session-id>"
            exit 1
        fi
        get_session_details "$2"
        ;;
    cleanup)
        cleanup_stale_sessions
        ;;
    help)
        echo "Session Resume Script"
        echo ""
        echo "Usage: $0 [command] [args]"
        echo ""
        echo "Commands:"
        echo "  list              List all active sessions (default)"
        echo "  details <id>      Show detailed information for a session"
        echo "  cleanup           Move stale sessions (>24h) to stale directory"
        echo "  help              Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  CLAUDE_PLUGIN_ROOT   Plugin root directory"
        echo ""
        exit 0
        ;;
    *)
        echo "ERROR: Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

exit 0
