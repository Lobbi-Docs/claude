#!/bin/bash
# Documentation Reminder Script
# Checks if documentation has been created for completed work

set -e

ISSUE_KEY="$1"

if [ -z "$ISSUE_KEY" ]; then
    echo "ERROR: Issue key required"
    exit 1
fi

# Get plugin root from environment or use default
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
SESSIONS_DIR="$PLUGIN_ROOT/sessions"
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/obsidian}"

# Function to check if work was significant
check_work_significance() {
    local session_dir="$1"

    if [ ! -f "$session_dir/state.json" ]; then
        echo "NO_WORK"
        return 0
    fi

    # Check if any code agents ran
    local agents_run=$(jq -r '.agents | keys | length' "$session_dir/state.json" 2>/dev/null || echo "0")

    if [ "$agents_run" -lt 2 ]; then
        echo "NO_WORK"
        echo "Only $agents_run agent(s) ran - not significant enough for documentation"
        return 0
    fi

    # Check if any files were modified
    local files_modified=$(jq -r '.files_modified | length // 0' "$session_dir/state.json" 2>/dev/null || echo "0")

    if [ "$files_modified" -eq 0 ]; then
        echo "NO_WORK"
        echo "No files were modified"
        return 0
    fi

    # Significant work detected
    echo "SIGNIFICANT_WORK"
    echo "Agents run: $agents_run"
    echo "Files modified: $files_modified"
    return 0
}

# Function to check documentation status
check_documentation_status() {
    local issue_key="$1"

    # Find the most recent session for this issue
    local latest_session=""
    local latest_time=0

    # Check active sessions first
    if [ -d "$SESSIONS_DIR/active" ]; then
        for session_dir in "$SESSIONS_DIR/active"/*; do
            if [ -f "$session_dir/state.json" ]; then
                session_issue=$(jq -r '.issue_key // empty' "$session_dir/state.json" 2>/dev/null || echo "")

                if [ "$session_issue" = "$issue_key" ]; then
                    session_time=$(stat -c %Y "$session_dir/state.json" 2>/dev/null || echo "0")
                    if [ "$session_time" -gt "$latest_time" ]; then
                        latest_time=$session_time
                        latest_session="$session_dir"
                    fi
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
                    session_time=$(stat -c %Y "$session_dir/state.json" 2>/dev/null || echo "0")
                    if [ "$session_time" -gt "$latest_time" ]; then
                        latest_time=$session_time
                        latest_session="$session_dir"
                    fi
                fi
            fi
        done
    fi

    if [ -z "$latest_session" ]; then
        echo "NO_SESSION"
        echo "No session found for $issue_key"
        return 0
    fi

    # Check if work was significant
    work_check=$(check_work_significance "$latest_session" | head -n1)
    if [ "$work_check" = "NO_WORK" ]; then
        echo "NO_WORK"
        echo "Work not significant enough for documentation"
        return 0
    fi

    # Check if documentation agent ran
    docs_status=$(jq -r '.agents.documentation.status // empty' "$latest_session/state.json" 2>/dev/null || echo "")

    if [ "$docs_status" = "completed" ]; then
        echo "DOCS_COMPLETE"
        echo "Session: $(basename "$latest_session")"
        echo "Documentation created by documentation agent"
        show_docs_location "$latest_session"
        return 0
    fi

    # Check if documentation exists in Obsidian vault
    if check_obsidian_docs "$issue_key"; then
        echo "DOCS_COMPLETE"
        echo "Session: $(basename "$latest_session")"
        echo "Documentation found in Obsidian vault"
        return 0
    fi

    # Check if manual documentation was created
    if [ -f "$latest_session/documentation.md" ]; then
        echo "DOCS_COMPLETE"
        echo "Session: $(basename "$latest_session")"
        echo "Manual documentation: $latest_session/documentation.md"
        return 0
    fi

    # Documentation needed
    echo "DOCS_NEEDED"
    echo "Session: $(basename "$latest_session")"
    echo "Significant work completed but no documentation found"
    show_work_summary "$latest_session"
    return 0
}

# Function to check Obsidian vault for documentation
check_obsidian_docs() {
    local issue_key="$1"

    if [ ! -d "$OBSIDIAN_VAULT" ]; then
        return 1
    fi

    # Search for files mentioning the issue key
    if grep -r "$issue_key" "$OBSIDIAN_VAULT" --include="*.md" -l > /dev/null 2>&1; then
        echo "Found in Obsidian vault:"
        grep -r "$issue_key" "$OBSIDIAN_VAULT" --include="*.md" -l 2>/dev/null | head -n5
        return 0
    fi

    return 1
}

# Function to show documentation location
show_docs_location() {
    local session_dir="$1"

    if [ -f "$session_dir/state.json" ]; then
        echo ""
        echo "---DOCUMENTATION_LOCATION---"
        jq -r '.agents.documentation.output // empty' "$session_dir/state.json" 2>/dev/null || echo "Unknown"
    fi
}

# Function to show work summary
show_work_summary() {
    local session_dir="$1"

    if [ -f "$session_dir/state.json" ]; then
        echo ""
        echo "---WORK_SUMMARY---"
        echo "Agents completed:"
        jq -r '.agents | to_entries[] | select(.value.status == "completed") | "  - \(.key): \(.value.summary // "no summary")"' "$session_dir/state.json" 2>/dev/null || echo "  Unknown"

        echo ""
        echo "Files modified:"
        jq -r '.files_modified[]? // "  None"' "$session_dir/state.json" 2>/dev/null || echo "  Unknown"

        echo ""
        echo "Suggested documentation topics:"
        echo "  - Implementation approach and decisions"
        echo "  - Challenges encountered and solutions"
        echo "  - Testing strategy and results"
        echo "  - Integration points and dependencies"
        echo "  - Future considerations"
    fi
}

# Main execution
echo "Checking documentation status for: $ISSUE_KEY"
echo "---"

check_documentation_status "$ISSUE_KEY"

exit 0
