#!/bin/bash
#
# Harness Code REST API Helper Functions
#
# This script provides shell functions for interacting with Harness Code
# (Gitness-based) REST API for PR operations, repository management,
# and Jira integration.
#
# Usage:
#   source harness-code-api.sh
#
# Required Environment Variables:
#   HARNESS_API_KEY       - Your Harness API key
#   HARNESS_BASE_URL      - Optional. Defaults to https://app.harness.io
#   HARNESS_ACCOUNT_ID    - Optional. Your Harness account ID
#   HARNESS_ORG_ID        - Optional. Your organization ID
#   HARNESS_PROJECT_ID    - Optional. Your project ID
#

# Set defaults
export HARNESS_BASE_URL="${HARNESS_BASE_URL:-https://app.harness.io}"
export HARNESS_CODE_API="${HARNESS_BASE_URL}/code/api/v1"

# =============================================================================
# VALIDATION
# =============================================================================

harness_check_config() {
  if [[ -z "$HARNESS_API_KEY" ]]; then
    echo "ERROR: HARNESS_API_KEY is not set" >&2
    return 1
  fi
  return 0
}

# =============================================================================
# GENERIC API REQUEST
# =============================================================================

harness_api() {
  local method="$1"
  local endpoint="$2"
  local data="$3"

  harness_check_config || return 1

  local url="${HARNESS_CODE_API}${endpoint}"
  local curl_args=(-s -X "$method" -H "x-api-key: ${HARNESS_API_KEY}" -H "Content-Type: application/json")

  if [[ -n "$data" ]]; then
    curl_args+=(-d "$data")
  fi

  curl "${curl_args[@]}" "$url"
}

# =============================================================================
# REPOSITORY OPERATIONS
# =============================================================================

# List all repositories
harness_list_repos() {
  local space="${1:-}"
  local endpoint="/repos"

  if [[ -n "$space" ]]; then
    endpoint="/spaces/${space}/repos"
  fi

  harness_api GET "$endpoint"
}

# Get repository details
harness_get_repo() {
  local repo="$1"
  harness_api GET "/repos/${repo}"
}

# Create a new repository
harness_create_repo() {
  local identifier="$1"
  local description="${2:-}"
  local default_branch="${3:-main}"
  local is_public="${4:-false}"
  local space="${5:-}"

  local data
  data=$(cat <<EOF
{
  "identifier": "${identifier}",
  "description": "${description}",
  "default_branch": "${default_branch}",
  "is_public": ${is_public},
  "parent_ref": "${space}"
}
EOF
)

  harness_api POST "/repos" "$data"
}

# Delete a repository
harness_delete_repo() {
  local repo="$1"
  harness_api DELETE "/repos/${repo}"
}

# =============================================================================
# PULL REQUEST OPERATIONS
# =============================================================================

# List pull requests
harness_list_prs() {
  local repo="$1"
  local state="${2:-open}"  # open, closed, merged, all

  harness_api GET "/repos/${repo}/pullreq?state=${state}"
}

# Get PR details
harness_get_pr() {
  local repo="$1"
  local pr="$2"

  harness_api GET "/repos/${repo}/pullreq/${pr}"
}

# Create pull request
harness_create_pr() {
  local repo="$1"
  local title="$2"
  local source_branch="$3"
  local target_branch="${4:-main}"
  local description="${5:-}"

  local data
  data=$(cat <<EOF
{
  "title": "${title}",
  "source_branch": "${source_branch}",
  "target_branch": "${target_branch}",
  "description": "${description}"
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq" "$data"
}

# =============================================================================
# COMMENT OPERATIONS
# =============================================================================

# Create a general PR comment
harness_pr_comment() {
  local repo="$1"
  local pr="$2"
  local text="$3"

  local data
  data=$(cat <<EOF
{"text": "${text}"}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/comments" "$data"
}

# Create a code comment on specific lines
harness_code_comment() {
  local repo="$1"
  local pr="$2"
  local file="$3"
  local line_start="$4"
  local line_end="${5:-$line_start}"
  local text="$6"

  local data
  data=$(cat <<EOF
{
  "text": "${text}",
  "path": "${file}",
  "line_start": ${line_start},
  "line_end": ${line_end},
  "line_start_new": true,
  "line_end_new": true
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/comments" "$data"
}

# Reply to an existing comment
harness_reply_comment() {
  local repo="$1"
  local pr="$2"
  local parent_id="$3"
  local text="$4"

  local data
  data=$(cat <<EOF
{
  "text": "${text}",
  "parent_id": ${parent_id}
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/comments" "$data"
}

# Update a comment
harness_update_comment() {
  local repo="$1"
  local pr="$2"
  local comment_id="$3"
  local text="$4"

  harness_api PATCH "/repos/${repo}/pullreq/${pr}/comments/${comment_id}" "{\"text\": \"${text}\"}"
}

# Delete a comment
harness_delete_comment() {
  local repo="$1"
  local pr="$2"
  local comment_id="$3"

  harness_api DELETE "/repos/${repo}/pullreq/${pr}/comments/${comment_id}"
}

# Resolve/unresolve a comment
harness_resolve_comment() {
  local repo="$1"
  local pr="$2"
  local comment_id="$3"
  local resolved="${4:-true}"

  harness_api PUT "/repos/${repo}/pullreq/${pr}/comments/${comment_id}/status" "{\"resolved\": ${resolved}}"
}

# =============================================================================
# REVIEW OPERATIONS
# =============================================================================

# Submit a review
harness_pr_review() {
  local repo="$1"
  local pr="$2"
  local decision="$3"  # approved, changereq, reviewed
  local commit_sha="$4"

  local data
  data=$(cat <<EOF
{
  "commit_sha": "${commit_sha}",
  "decision": "${decision}"
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/reviews" "$data"
}

# Approve PR
harness_pr_approve() {
  local repo="$1"
  local pr="$2"
  local commit_sha="$3"

  harness_pr_review "$repo" "$pr" "approved" "$commit_sha"
}

# Request changes
harness_pr_request_changes() {
  local repo="$1"
  local pr="$2"
  local commit_sha="$3"

  harness_pr_review "$repo" "$pr" "changereq" "$commit_sha"
}

# Mark as reviewed
harness_pr_mark_reviewed() {
  local repo="$1"
  local pr="$2"
  local commit_sha="$3"

  harness_pr_review "$repo" "$pr" "reviewed" "$commit_sha"
}

# =============================================================================
# REVIEWER OPERATIONS
# =============================================================================

# Add a reviewer
harness_add_reviewer() {
  local repo="$1"
  local pr="$2"
  local reviewer_id="$3"

  harness_api POST "/repos/${repo}/pullreq/${pr}/reviewers" "{\"reviewer_id\": ${reviewer_id}}"
}

# Remove a reviewer
harness_remove_reviewer() {
  local repo="$1"
  local pr="$2"
  local reviewer_id="$3"

  harness_api DELETE "/repos/${repo}/pullreq/${pr}/reviewers/${reviewer_id}"
}

# List reviewers
harness_list_reviewers() {
  local repo="$1"
  local pr="$2"

  harness_api GET "/repos/${repo}/pullreq/${pr}/reviewers"
}

# =============================================================================
# MERGE OPERATIONS
# =============================================================================

# Merge PR
harness_pr_merge() {
  local repo="$1"
  local pr="$2"
  local method="${3:-squash}"  # merge, squash, rebase, fast-forward
  local source_sha="$4"
  local title="${5:-}"
  local message="${6:-}"
  local delete_branch="${7:-true}"

  local data
  data=$(cat <<EOF
{
  "method": "${method}",
  "source_sha": "${source_sha}",
  "title": "${title}",
  "message": "${message}",
  "delete_source_branch": ${delete_branch}
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/merge" "$data"
}

# Check mergeability (dry run)
harness_check_mergeable() {
  local repo="$1"
  local pr="$2"
  local source_sha="$3"

  local data
  data=$(cat <<EOF
{
  "method": "squash",
  "source_sha": "${source_sha}",
  "dry_run": true
}
EOF
)

  harness_api POST "/repos/${repo}/pullreq/${pr}/merge" "$data"
}

# =============================================================================
# MULTI-REPO WORKSPACE SUPPORT
# =============================================================================

# Detect repos in VS Code workspace
harness_detect_workspace_repos() {
  local workspace_file="${1:-.code-workspace}"

  if [[ -f "$workspace_file" ]]; then
    # Parse .code-workspace file for folders
    jq -r '.folders[].path' "$workspace_file" 2>/dev/null
  else
    # List git repos in current directory
    find . -maxdepth 2 -name ".git" -type d 2>/dev/null | xargs dirname
  fi
}

# Get repo status for all workspace repos
harness_workspace_status() {
  local repos
  repos=$(harness_detect_workspace_repos "$1")

  echo "=== Workspace Repository Status ==="
  for repo_path in $repos; do
    if [[ -d "$repo_path/.git" ]]; then
      local repo_name
      repo_name=$(basename "$repo_path")
      local branch
      branch=$(git -C "$repo_path" branch --show-current 2>/dev/null)
      local status
      status=$(git -C "$repo_path" status --porcelain 2>/dev/null | wc -l)

      echo "[$repo_name] branch: $branch, changes: $status"
    fi
  done
}

# Create PR for each changed repo in workspace
harness_workspace_create_prs() {
  local jira_key="$1"
  local target_branch="${2:-main}"

  local repos
  repos=$(harness_detect_workspace_repos)

  for repo_path in $repos; do
    if [[ -d "$repo_path/.git" ]]; then
      local repo_name
      repo_name=$(basename "$repo_path")
      local branch
      branch=$(git -C "$repo_path" branch --show-current 2>/dev/null)
      local changes
      changes=$(git -C "$repo_path" status --porcelain 2>/dev/null | wc -l)

      if [[ "$changes" -gt 0 ]] && [[ "$branch" != "$target_branch" ]]; then
        echo "Creating PR for $repo_name ($branch -> $target_branch)..."
        harness_create_pr "$repo_name" "$jira_key: Changes from $branch" "$branch" "$target_branch"
      fi
    fi
  done
}

# =============================================================================
# JIRA INTEGRATION
# =============================================================================

# Extract Jira key from PR title or branch
harness_extract_jira_key() {
  local text="$1"
  echo "$text" | grep -oE '[A-Z]+-[0-9]+' | head -1
}

# Review PR and update Jira
harness_review_with_jira() {
  local repo="$1"
  local pr="$2"
  local decision="$3"
  local commit_sha="$4"
  local jira_key="$5"

  # Submit review
  echo "Submitting review: $decision"
  harness_pr_review "$repo" "$pr" "$decision" "$commit_sha"

  # Update Jira if MCP is available
  if command -v mcp &>/dev/null; then
    local status_map
    case "$decision" in
      approved) status_map="Approved" ;;
      changereq) status_map="Changes Requested" ;;
      reviewed) status_map="Reviewed" ;;
    esac

    echo "Updating Jira $jira_key with status: $status_map"
    # This would use the Jira MCP to add a comment
    # mcp__MCP_DOCKER__jira_add_comment "$jira_key" "PR #$pr: $status_map"
  fi
}

# =============================================================================
# CONVENIENCE ALIASES
# =============================================================================

alias hpr='harness_pr_comment'
alias hcc='harness_code_comment'
alias happrove='harness_pr_approve'
alias hreject='harness_pr_request_changes'
alias hmerge='harness_pr_merge'
alias hrepos='harness_list_repos'
alias hprs='harness_list_prs'

# =============================================================================
# HELP
# =============================================================================

harness_help() {
  cat <<EOF
Harness Code API Helper Functions

REPOSITORY OPERATIONS:
  harness_list_repos [space]              List repositories
  harness_get_repo <repo>                 Get repository details
  harness_create_repo <id> [desc] [branch] [public] [space]  Create repository
  harness_delete_repo <repo>              Delete repository

PULL REQUEST OPERATIONS:
  harness_list_prs <repo> [state]         List PRs (state: open/closed/merged/all)
  harness_get_pr <repo> <pr>              Get PR details
  harness_create_pr <repo> <title> <source> [target] [desc]  Create PR

COMMENT OPERATIONS:
  harness_pr_comment <repo> <pr> <text>   Add general comment
  harness_code_comment <repo> <pr> <file> <start> <end> <text>  Add code comment
  harness_reply_comment <repo> <pr> <parent_id> <text>  Reply to comment
  harness_update_comment <repo> <pr> <id> <text>  Update comment
  harness_delete_comment <repo> <pr> <id>  Delete comment
  harness_resolve_comment <repo> <pr> <id> [resolved]  Resolve comment

REVIEW OPERATIONS:
  harness_pr_review <repo> <pr> <decision> <sha>  Submit review
  harness_pr_approve <repo> <pr> <sha>    Approve PR
  harness_pr_request_changes <repo> <pr> <sha>  Request changes
  harness_pr_mark_reviewed <repo> <pr> <sha>  Mark as reviewed

REVIEWER OPERATIONS:
  harness_add_reviewer <repo> <pr> <id>   Add reviewer
  harness_remove_reviewer <repo> <pr> <id>  Remove reviewer
  harness_list_reviewers <repo> <pr>      List reviewers

MERGE OPERATIONS:
  harness_pr_merge <repo> <pr> [method] <sha> [title] [msg] [delete]  Merge PR
  harness_check_mergeable <repo> <pr> <sha>  Check mergeability

WORKSPACE OPERATIONS:
  harness_detect_workspace_repos [file]   Detect repos in workspace
  harness_workspace_status [file]         Show status of all workspace repos
  harness_workspace_create_prs <jira> [target]  Create PRs for changed repos

JIRA INTEGRATION:
  harness_extract_jira_key <text>         Extract Jira key from text
  harness_review_with_jira <repo> <pr> <decision> <sha> <jira>  Review and update Jira

ALIASES:
  hpr       harness_pr_comment
  hcc       harness_code_comment
  happrove  harness_pr_approve
  hreject   harness_pr_request_changes
  hmerge    harness_pr_merge
  hrepos    harness_list_repos
  hprs      harness_list_prs

ENVIRONMENT VARIABLES:
  HARNESS_API_KEY       Required. Your Harness API key.
  HARNESS_BASE_URL      Optional. Defaults to https://app.harness.io
  HARNESS_ACCOUNT_ID    Optional. Your Harness account ID.
  HARNESS_ORG_ID        Optional. Your organization ID.
  HARNESS_PROJECT_ID    Optional. Your project ID.

EXAMPLES:
  # List repositories
  harness_list_repos

  # Create a comment
  harness_pr_comment "my-repo" 42 "LGTM!"

  # Approve a PR
  harness_pr_approve "my-repo" 42 "abc123def"

  # Merge with squash
  harness_pr_merge "my-repo" 42 "squash" "abc123" "feat: Add feature"
EOF
}

# Print help if sourced with --help
if [[ "${1:-}" == "--help" ]]; then
  harness_help
fi
