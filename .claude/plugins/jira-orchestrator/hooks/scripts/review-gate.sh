#!/bin/bash
# Code Review Gate Script
# Checks if code review has been completed before allowing PR creation

set -e

ISSUE_KEY="$1"

if [ -z "$ISSUE_KEY" ]; then
    echo "ERROR: Issue key required"
    exit 1
fi

# Get plugin root from environment or use default
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
SESSIONS_DIR="$PLUGIN_ROOT/sessions"

# Function to check review status
check_review_status() {
    local issue_key="$1"

    # Find active sessions for this issue
    if [ -d "$SESSIONS_DIR/active" ]; then
        for session_dir in "$SESSIONS_DIR/active"/*; do
            if [ -f "$session_dir/state.json" ]; then
                # Check if this session is for our issue
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    # Check if code review agent has run
                    review_status=$(jq -r '.agents.code_reviewer.status // empty' "$session_dir/state.json" 2>/dev/null || echo "")
                    review_result=$(jq -r '.agents.code_reviewer.result // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                    case "$review_status" in
                        "completed")
                            if [ "$review_result" = "passed" ] || [ "$review_result" = "approved" ]; then
                                echo "REVIEW_PASSED"
                                echo "Session: $(basename "$session_dir")"
                                echo "Review: $session_dir/code-review.json"
                                show_review_summary "$session_dir/code-review.json"
                                return 0
                            else
                                echo "REVIEW_FAILED"
                                echo "Session: $(basename "$session_dir")"
                                echo "Review: $session_dir/code-review.json"
                                echo "Result: $review_result"
                                show_review_findings "$session_dir/code-review.json"
                                return 1
                            fi
                            ;;
                        "running"|"in_progress")
                            echo "REVIEW_IN_PROGRESS"
                            echo "Session: $(basename "$session_dir")"
                            echo "Please wait for review to complete..."
                            return 2
                            ;;
                        "failed"|"error")
                            echo "REVIEW_ERROR"
                            echo "Session: $(basename "$session_dir")"
                            echo "Check logs: $session_dir/logs/code-reviewer.log"
                            return 1
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
                    review_status=$(jq -r '.agents.code_reviewer.status // empty' "$session_dir/state.json" 2>/dev/null || echo "")
                    review_result=$(jq -r '.agents.code_reviewer.result // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                    if [ "$review_status" = "completed" ]; then
                        if [ "$review_result" = "passed" ] || [ "$review_result" = "approved" ]; then
                            echo "REVIEW_PASSED"
                            echo "Session: $(basename "$session_dir")"
                            echo "Review: $session_dir/code-review.json"
                            show_review_summary "$session_dir/code-review.json"
                            return 0
                        else
                            echo "REVIEW_FAILED"
                            echo "Session: $(basename "$session_dir")"
                            echo "Result: $review_result"
                            show_review_findings "$session_dir/code-review.json"
                            return 1
                        fi
                    fi
                fi
            fi
        done
    fi

    # No review found
    echo "NO_REVIEW"
    echo "No code review found for $issue_key"
    echo "CRITICAL: Code review is required before creating a pull request!"
    return 1
}

# Function to show review summary
show_review_summary() {
    local review_file="$1"

    if [ -f "$review_file" ]; then
        echo ""
        echo "---REVIEW_SUMMARY---"
        jq -r '.summary // empty' "$review_file" 2>/dev/null || echo "No summary available"

        # Show stats
        issues_count=$(jq -r '.issues | length // 0' "$review_file" 2>/dev/null || echo "0")
        critical_count=$(jq -r '.issues[] | select(.severity == "critical") | .severity' "$review_file" 2>/dev/null | wc -l || echo "0")
        high_count=$(jq -r '.issues[] | select(.severity == "high") | .severity' "$review_file" 2>/dev/null | wc -l || echo "0")

        echo ""
        echo "Issues found: $issues_count"
        echo "  Critical: $critical_count"
        echo "  High: $high_count"
    fi
}

# Function to show review findings
show_review_findings() {
    local review_file="$1"

    if [ -f "$review_file" ]; then
        echo ""
        echo "---REVIEW_FINDINGS---"
        jq -r '.issues[] | "[\(.severity | ascii_upcase)] \(.file):\(.line) - \(.message)"' "$review_file" 2>/dev/null || echo "No findings available"

        echo ""
        echo "Full review: $review_file"
    fi
}

# Main execution
echo "Checking code review status for: $ISSUE_KEY"
echo "---"

check_review_status "$ISSUE_KEY"
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✓ Code review PASSED - PR creation allowed"
    exit 0
elif [ $exit_code -eq 2 ]; then
    echo ""
    echo "⏳ Code review IN PROGRESS - Please wait"
    exit 2
else
    echo ""
    echo "✗ Code review FAILED or MISSING - PR creation BLOCKED"
    exit 1
fi
