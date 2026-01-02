#!/bin/bash
# Triage Check Script
# Checks if triage analysis is in progress or completed for a Jira issue

set -e

ISSUE_KEY="$1"

if [ -z "$ISSUE_KEY" ]; then
    echo "ERROR: Issue key required"
    exit 1
fi

# Get plugin root from environment or use default
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
SESSIONS_DIR="$PLUGIN_ROOT/sessions"

# Function to check session state
check_triage_status() {
    local issue_key="$1"

    # Find active sessions for this issue
    if [ -d "$SESSIONS_DIR/active" ]; then
        for session_dir in "$SESSIONS_DIR/active"/*; do
            if [ -f "$session_dir/state.json" ]; then
                # Check if this session is for our issue
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    # Check current phase
                    current_phase=$(jq -r '.current_phase // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                    # Check if triage agent has run
                    triage_status=$(jq -r '.agents.triage.status // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                    case "$triage_status" in
                        "completed")
                            echo "TRIAGE_COMPLETED"
                            echo "Session: $(basename "$session_dir")"
                            echo "Output: $session_dir/triage-output.json"
                            return 0
                            ;;
                        "running"|"in_progress")
                            echo "TRIAGE_IN_PROGRESS"
                            echo "Session: $(basename "$session_dir")"
                            return 0
                            ;;
                        "failed")
                            echo "TRIAGE_FAILED"
                            echo "Session: $(basename "$session_dir")"
                            echo "Check logs: $session_dir/logs/triage.log"
                            return 0
                            ;;
                    esac
                fi
            fi
        done
    fi

    # Check completed sessions
    if [ -d "$SESSIONS_DIR/completed" ]; then
        for session_dir in "$SESSIONS_DIR/completed"/*; do
            if [ -f "$session_dir/state.json" ]; then
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    triage_status=$(jq -r '.agents.triage.status // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                    if [ "$triage_status" = "completed" ]; then
                        echo "TRIAGE_COMPLETED"
                        echo "Session: $(basename "$session_dir")"
                        echo "Output: $session_dir/triage-output.json"
                        echo "Completed: $(jq -r '.agents.triage.completed_at // empty' "$session_dir/state.json" 2>/dev/null || echo "unknown")"
                        return 0
                    fi
                fi
            fi
        done
    fi

    # No triage found
    echo "NO_TRIAGE"
    echo "No triage analysis found for $issue_key"
    return 0
}

# Function to get triage output if available
get_triage_output() {
    local issue_key="$1"

    # Search for triage output in active sessions first
    if [ -d "$SESSIONS_DIR/active" ]; then
        for session_dir in "$SESSIONS_DIR/active"/*; do
            if [ -f "$session_dir/triage-output.json" ]; then
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/triage-output.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    echo "---TRIAGE_OUTPUT---"
                    cat "$session_dir/triage-output.json"
                    return 0
                fi
            fi
        done
    fi

    # Check completed sessions
    if [ -d "$SESSIONS_DIR/completed" ]; then
        for session_dir in "$SESSIONS_DIR/completed"/*; do
            if [ -f "$session_dir/triage-output.json" ]; then
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/triage-output.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    echo "---TRIAGE_OUTPUT---"
                    cat "$session_dir/triage-output.json"
                    return 0
                fi
            fi
        done
    fi
}

# Main execution
echo "Checking triage status for: $ISSUE_KEY"
echo "---"

check_triage_status "$ISSUE_KEY"

# If triage completed, show output
status_result=$(check_triage_status "$ISSUE_KEY" | head -n1)
if [ "$status_result" = "TRIAGE_COMPLETED" ]; then
    echo ""
    get_triage_output "$ISSUE_KEY"
fi

exit 0
