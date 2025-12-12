#!/bin/bash
# Atlassian integration hooks for Golden Armada
# These hooks enable automatic synchronization with Jira and Confluence

set -e

# Load environment variables
JIRA_URL="${JIRA_URL:-}"
JIRA_EMAIL="${JIRA_EMAIL:-}"
JIRA_API_TOKEN="${JIRA_API_TOKEN:-}"
CONFLUENCE_URL="${CONFLUENCE_URL:-}"
CONFLUENCE_EMAIL="${CONFLUENCE_EMAIL:-}"
CONFLUENCE_API_TOKEN="${CONFLUENCE_API_TOKEN:-}"

# Check if Atlassian credentials are configured
atlassian_configured() {
    [ -n "$JIRA_URL" ] && [ -n "$JIRA_EMAIL" ] && [ -n "$JIRA_API_TOKEN" ]
}

confluence_configured() {
    [ -n "$CONFLUENCE_URL" ] && [ -n "$CONFLUENCE_EMAIL" ] && [ -n "$CONFLUENCE_API_TOKEN" ]
}

# Get Jira auth header (using printf for portability)
jira_auth() {
    printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64
}

confluence_auth() {
    printf '%s:%s' "$CONFLUENCE_EMAIL" "$CONFLUENCE_API_TOKEN" | base64
}

# JSON-escape a string to prevent injection
json_escape() {
    local str="$1"
    # Use jq for proper JSON escaping if available, otherwise basic escaping
    if command -v jq &>/dev/null; then
        printf '%s' "$str" | jq -Rs '.'
    else
        # Basic escaping: backslash, quotes, newlines, tabs
        printf '%s' "$str" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g; s/\t/\\t/g; s/\r/\\r/g' | sed ':a;N;$!ba;s/\n/\\n/g'
    fi
}

# =============================================================================
# PRE-TASK HOOK: Atlassian Context Loading
# =============================================================================
pre_task_atlassian() {
    local task_description="$1"
    local agent_name="$2"

    echo "=== Atlassian Pre-Task Hook ==="

    # Check for Jira issue key in task description
    local jira_key=$(echo "$task_description" | grep -oE '[A-Z]+-[0-9]+' | head -1)

    if [ -n "$jira_key" ] && atlassian_configured; then
        echo "Found Jira reference: $jira_key"

        # Fetch issue context (capture exit code immediately)
        local issue_data
        local curl_exit_code
        issue_data=$(curl -s -X GET "$JIRA_URL/rest/api/3/issue/$jira_key" \
            -H "Authorization: Basic $(jira_auth)" \
            -H "Content-Type: application/json" 2>/dev/null)
        curl_exit_code=$?

        if [ "$curl_exit_code" -eq 0 ] && [ -n "$issue_data" ]; then
            local summary=$(echo "$issue_data" | jq -r '.fields.summary // "N/A"')
            local status=$(echo "$issue_data" | jq -r '.fields.status.name // "N/A"')
            local priority=$(echo "$issue_data" | jq -r '.fields.priority.name // "N/A"')

            echo "Issue: $jira_key - $summary"
            echo "Status: $status | Priority: $priority"

            # Export for agent use
            export JIRA_CONTEXT_KEY="$jira_key"
            export JIRA_CONTEXT_SUMMARY="$summary"
            export JIRA_CONTEXT_STATUS="$status"
        fi
    fi

    # Agent-specific Atlassian setup
    case "$agent_name" in
        "jira-specialist"|"agile-coach"|"project-tracker")
            echo "Setting up Jira specialist context..."
            if atlassian_configured; then
                # Fetch current sprint
                local sprint_info=$(curl -s -X GET "$JIRA_URL/rest/agile/1.0/board/${JIRA_BOARD_ID:-1}/sprint?state=active" \
                    -H "Authorization: Basic $(jira_auth)" 2>/dev/null)
                if [ -n "$sprint_info" ]; then
                    local sprint_name=$(echo "$sprint_info" | jq -r '.values[0].name // "No active sprint"')
                    echo "Active Sprint: $sprint_name"
                fi
            fi
            ;;

        "confluence-specialist"|"docs-writer")
            echo "Setting up Confluence specialist context..."
            if confluence_configured; then
                echo "Confluence space: ${CONFLUENCE_SPACE_KEY:-GA}"
            fi
            ;;

        "atlassian-admin")
            echo "Setting up Atlassian admin context..."
            echo "WARNING: Admin operations - proceed with caution"
            ;;
    esac

    echo "=== Atlassian Pre-Task Complete ==="
}

# =============================================================================
# POST-TASK HOOK: Atlassian Updates
# =============================================================================
post_task_atlassian() {
    local task_description="$1"
    local agent_name="$2"
    local task_status="$3"

    echo "=== Atlassian Post-Task Hook ==="

    # Check for Jira context from pre-task
    if [ -n "$JIRA_CONTEXT_KEY" ] && atlassian_configured; then
        echo "Updating Jira issue: $JIRA_CONTEXT_KEY"

        # Add task completion comment (with JSON escaping for safety)
        local comment="Task completed by $agent_name agent.

Task: $task_description
Status: $task_status
Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

        # Properly escape the comment for JSON
        local escaped_comment
        escaped_comment=$(json_escape "$comment")
        # Remove outer quotes added by jq -Rs
        escaped_comment="${escaped_comment%\"}"
        escaped_comment="${escaped_comment#\"}"

        curl -s -X POST "$JIRA_URL/rest/api/3/issue/$JIRA_CONTEXT_KEY/comment" \
            -H "Authorization: Basic $(jira_auth)" \
            -H "Content-Type: application/json" \
            -d "{
                \"body\": {
                    \"type\": \"doc\",
                    \"version\": 1,
                    \"content\": [{
                        \"type\": \"paragraph\",
                        \"content\": [{\"type\": \"text\", \"text\": \"$escaped_comment\"}]
                    }]
                }
            }" >/dev/null 2>&1

        echo "Added completion comment to $JIRA_CONTEXT_KEY"
    fi

    echo "=== Atlassian Post-Task Complete ==="
}

# =============================================================================
# POST-COMMIT HOOK: Link commits to Jira
# =============================================================================
post_commit_atlassian() {
    local commit_msg="$1"
    local commit_sha="$2"

    # Extract Jira key from commit message
    local jira_key=$(echo "$commit_msg" | grep -oE '[A-Z]+-[0-9]+' | head -1)

    if [ -n "$jira_key" ] && atlassian_configured; then
        echo "Linking commit $commit_sha to $jira_key"

        # Add commit comment to Jira issue (with JSON escaping)
        local comment="Commit: $commit_sha
Message: $commit_msg
Branch: $(git branch --show-current 2>/dev/null || echo 'detached')
Author: $(git log -1 --format='%an <%ae>' 2>/dev/null || echo 'unknown')"

        # Properly escape the comment for JSON
        local escaped_comment
        escaped_comment=$(json_escape "$comment")
        escaped_comment="${escaped_comment%\"}"
        escaped_comment="${escaped_comment#\"}"

        curl -s -X POST "$JIRA_URL/rest/api/3/issue/$jira_key/comment" \
            -H "Authorization: Basic $(jira_auth)" \
            -H "Content-Type: application/json" \
            -d "{
                \"body\": {
                    \"type\": \"doc\",
                    \"version\": 1,
                    \"content\": [{
                        \"type\": \"paragraph\",
                        \"content\": [{\"type\": \"text\", \"text\": \"$escaped_comment\"}]
                    }]
                }
            }" >/dev/null 2>&1
    fi
}

# =============================================================================
# POST-PR HOOK: Update Jira on PR creation/merge
# =============================================================================
post_pr_atlassian() {
    local pr_action="$1"  # created, merged, closed
    local pr_number="$2"
    local pr_title="$3"
    local pr_url="$4"

    # Extract Jira key from PR title
    local jira_key=$(echo "$pr_title" | grep -oE '[A-Z]+-[0-9]+' | head -1)

    if [ -n "$jira_key" ] && atlassian_configured; then
        echo "Updating $jira_key for PR $pr_action"

        case "$pr_action" in
            "created")
                # Add PR link comment
                curl -s -X POST "$JIRA_URL/rest/api/3/issue/$jira_key/comment" \
                    -H "Authorization: Basic $(jira_auth)" \
                    -H "Content-Type: application/json" \
                    -d "{
                        \"body\": {
                            \"type\": \"doc\",
                            \"version\": 1,
                            \"content\": [{
                                \"type\": \"paragraph\",
                                \"content\": [
                                    {\"type\": \"text\", \"text\": \"Pull Request #$pr_number created: \"},
                                    {\"type\": \"text\", \"text\": \"$pr_url\", \"marks\": [{\"type\": \"link\", \"attrs\": {\"href\": \"$pr_url\"}}]}
                                ]
                            }]
                        }
                    }" >/dev/null 2>&1

                # Optionally transition to "In Review"
                # Uncomment to enable auto-transition
                # transition_issue "$jira_key" "In Review"
                ;;

            "merged")
                # Transition to Done
                transition_issue "$jira_key" "Done"
                ;;

            "closed")
                # Add closed comment
                curl -s -X POST "$JIRA_URL/rest/api/3/issue/$jira_key/comment" \
                    -H "Authorization: Basic $(jira_auth)" \
                    -H "Content-Type: application/json" \
                    -d "{
                        \"body\": {
                            \"type\": \"doc\",
                            \"version\": 1,
                            \"content\": [{
                                \"type\": \"paragraph\",
                                \"content\": [{\"type\": \"text\", \"text\": \"PR #$pr_number closed without merge\"}]
                            }]
                        }
                    }" >/dev/null 2>&1
                ;;
        esac
    fi
}

# =============================================================================
# Helper: Transition Jira issue
# =============================================================================
transition_issue() {
    local issue_key="$1"
    local target_status="$2"

    if ! atlassian_configured; then
        return 1
    fi

    # Get available transitions
    local transitions=$(curl -s -X GET "$JIRA_URL/rest/api/3/issue/$issue_key/transitions" \
        -H "Authorization: Basic $(jira_auth)")

    local transition_id=$(echo "$transitions" | jq -r ".transitions[] | select(.name == \"$target_status\") | .id")

    if [ -n "$transition_id" ]; then
        curl -s -X POST "$JIRA_URL/rest/api/3/issue/$issue_key/transitions" \
            -H "Authorization: Basic $(jira_auth)" \
            -H "Content-Type: application/json" \
            -d "{\"transition\": {\"id\": \"$transition_id\"}}" >/dev/null 2>&1

        echo "Transitioned $issue_key to $target_status"
    else
        echo "Warning: Could not find transition to $target_status for $issue_key"
    fi
}

# =============================================================================
# DOCUMENTATION SYNC HOOK: Sync docs to Confluence
# =============================================================================
sync_docs_to_confluence() {
    local doc_path="$1"
    local page_title="$2"
    local space_key="${3:-GA}"

    if ! confluence_configured; then
        echo "Confluence not configured, skipping sync"
        return 1
    fi

    # Convert markdown to HTML
    if command -v pandoc &>/dev/null; then
        local content=$(pandoc -f markdown -t html "$doc_path")
    else
        local content=$(cat "$doc_path")
    fi

    # Check if page exists
    local existing=$(curl -s -X GET "$CONFLUENCE_URL/wiki/rest/api/content?spaceKey=$space_key&title=$page_title" \
        -H "Authorization: Basic $(confluence_auth)" | jq -r '.results[0].id // empty')

    if [ -n "$existing" ]; then
        # Update existing page
        local version=$(curl -s -X GET "$CONFLUENCE_URL/wiki/api/v2/pages/$existing" \
            -H "Authorization: Basic $(confluence_auth)" | jq '.version.number')

        curl -s -X PUT "$CONFLUENCE_URL/wiki/api/v2/pages/$existing" \
            -H "Authorization: Basic $(confluence_auth)" \
            -H "Content-Type: application/json" \
            -d "{
                \"id\": \"$existing\",
                \"status\": \"current\",
                \"title\": \"$page_title\",
                \"body\": {
                    \"representation\": \"storage\",
                    \"value\": $(echo "$content" | jq -Rs .)
                },
                \"version\": {
                    \"number\": $((version + 1)),
                    \"message\": \"Auto-synced from $doc_path\"
                }
            }" >/dev/null 2>&1

        echo "Updated Confluence page: $page_title"
    else
        echo "Page not found: $page_title (create manually first)"
    fi
}

# =============================================================================
# Main entry point
# =============================================================================
case "$1" in
    "pre-task")
        pre_task_atlassian "$2" "$3"
        ;;
    "post-task")
        post_task_atlassian "$2" "$3" "$4"
        ;;
    "post-commit")
        post_commit_atlassian "$2" "$3"
        ;;
    "post-pr")
        post_pr_atlassian "$2" "$3" "$4" "$5"
        ;;
    "sync-docs")
        sync_docs_to_confluence "$2" "$3" "$4"
        ;;
    *)
        echo "Usage: $0 {pre-task|post-task|post-commit|post-pr|sync-docs} [args...]"
        exit 1
        ;;
esac
