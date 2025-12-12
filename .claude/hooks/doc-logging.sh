#!/bin/bash
#
# Documentation Logging Hook
# Automatically logs documentation activity to orchestration database and Obsidian vault
#
# Usage:
#   - Called by post-edit hook when documentation files are modified
#   - Can be called manually: .claude/hooks/doc-logging.sh --file path/to/doc.md --action created
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="${DB_PATH:-.claude/orchestration/db/agents.db}"
OBSIDIAN_VAULT="${OBSIDIAN_VAULT:-C:/Users/MarkusAhling/obsidian}"
OBSIDIAN_API_URL="${OBSIDIAN_API_URL:-http://localhost:27123}"

# Agent context (from environment or defaults)
CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-unknown}"
CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
CLAUDE_TASK_ID="${CLAUDE_TASK_ID:-unknown}"

# ============================================
# UTILITY FUNCTIONS
# ============================================

log_info() {
    echo -e "${CYAN}[DocLog]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[DocLog]${NC} ✓ $1"
}

log_warn() {
    echo -e "${YELLOW}[DocLog]${NC} ⚠ $1"
}

log_error() {
    echo -e "${RED}[DocLog]${NC} ✗ $1" >&2
}

# Calculate SHA256 hash of file
calculate_hash() {
    local file="$1"
    if [ -f "$file" ]; then
        sha256sum "$file" | awk '{print $1}'
    else
        echo ""
    fi
}

# Count lines in file
count_lines() {
    local file="$1"
    if [ -f "$file" ]; then
        wc -l < "$file"
    else
        echo "0"
    fi
}

# Count words in file
count_words() {
    local file="$1"
    if [ -f "$file" ]; then
        wc -w < "$file"
    else
        echo "0"
    fi
}

# Extract title from markdown file
extract_title() {
    local file="$1"

    # Try YAML frontmatter first
    if head -n 20 "$file" | grep -q "^title:"; then
        grep "^title:" "$file" | head -1 | sed 's/^title:[[:space:]]*//' | tr -d '"'
        return
    fi

    # Try first H1 heading
    if grep -m 1 "^#[[:space:]]" "$file" &>/dev/null; then
        grep -m 1 "^#[[:space:]]" "$file" | sed 's/^#[[:space:]]*//'
        return
    fi

    # Fallback to filename
    basename "$file" .md
}

# Determine document type from file path
determine_doc_type() {
    local file_path="$1"
    local basename=$(basename "$file_path")

    case "$file_path" in
        *README.md|*readme.md)
            echo "readme"
            ;;
        */decisions/*|*/ADR-*|*/adr-*)
            echo "adr"
            ;;
        */ARCHITECTURE*|*/architecture/*|*system-design*)
            echo "architecture"
            ;;
        */API*|*/api-*)
            echo "api"
            ;;
        *QUICK*START*|*quick*start*|*quickstart*)
            echo "quickstart"
            ;;
        research/*)
            echo "research"
            ;;
        */guides/*|docs/*guide*)
            echo "guide"
            ;;
        docs/*)
            echo "guide"
            ;;
        *)
            echo "reference"
            ;;
    esac
}

# Determine Obsidian target path
determine_obsidian_path() {
    local file_path="$1"
    local doc_type="$2"
    local repo_name=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown')")

    case "$doc_type" in
        readme)
            echo "Repositories/Alpha-1.4/${basename%%.*}.md"
            ;;
        adr)
            echo "Repositories/Alpha-1.4/Decisions/$(basename "$file_path")"
            ;;
        architecture)
            echo "Repositories/Alpha-1.4/Architecture/$(basename "$file_path")"
            ;;
        api)
            echo "Repositories/Alpha-1.4/API/$(basename "$file_path")"
            ;;
        guide|quickstart)
            echo "Repositories/Alpha-1.4/Guides/$(basename "$file_path")"
            ;;
        research)
            # Extract research topic from path
            topic=$(echo "$file_path" | sed 's|research/\([^/]*\).*|\1|')
            echo "Research/${topic}/$(basename "$file_path")"
            ;;
        *)
            echo "Repositories/Alpha-1.4/$(basename "$file_path")"
            ;;
    esac
}

# ============================================
# DATABASE OPERATIONS
# ============================================

log_to_database() {
    local file_path="$1"
    local doc_type="$2"
    local action="$3"
    local summary="$4"
    local content_hash="$5"
    local obsidian_path="$6"
    local title="$7"
    local lines="$8"
    local words="$9"

    if [ ! -f "$DB_PATH" ]; then
        log_warn "Database not found at $DB_PATH - creating..."
        mkdir -p "$(dirname "$DB_PATH")"
    fi

    # Prepare metadata
    local metadata=$(cat <<EOF
{
    "agent_id": "$CLAUDE_AGENT_ID",
    "hostname": "$(hostname)",
    "working_dir": "$(pwd)"
}
EOF
)

    # Insert into documentation_log
    sqlite3 "$DB_PATH" <<SQL
        INSERT INTO documentation_log (
            timestamp,
            session_id,
            agent_id,
            task_id,
            doc_type,
            doc_path,
            obsidian_path,
            action,
            title,
            summary,
            content_hash,
            lines_added,
            word_count,
            vault_synced,
            sync_status,
            metadata
        ) VALUES (
            datetime('now'),
            '${CLAUDE_SESSION_ID}',
            '${CLAUDE_AGENT_ID}',
            '${CLAUDE_TASK_ID}',
            '${doc_type}',
            '${file_path}',
            '${obsidian_path}',
            '${action}',
            '${title}',
            '${summary}',
            '${content_hash}',
            ${lines},
            ${words},
            0,
            'pending',
            '${metadata}'
        );
SQL

    # Get the inserted ID
    local doc_log_id=$(sqlite3 "$DB_PATH" "SELECT last_insert_rowid();")

    log_success "Logged to database (ID: $doc_log_id)"

    # Also log to activity_log for comprehensive tracking
    sqlite3 "$DB_PATH" <<SQL
        INSERT INTO activity_log (
            timestamp,
            session_id,
            agent_id,
            task_id,
            action,
            category,
            level,
            message,
            details
        ) VALUES (
            datetime('now'),
            '${CLAUDE_SESSION_ID}',
            '${CLAUDE_AGENT_ID}',
            '${CLAUDE_TASK_ID}',
            'doc_${action}',
            'documentation',
            'INFO',
            'Documentation ${action}: ${file_path}',
            json_object(
                'doc_type', '${doc_type}',
                'doc_path', '${file_path}',
                'obsidian_path', '${obsidian_path}',
                'title', '${title}',
                'lines', ${lines},
                'words', ${words}
            )
        );
SQL

    echo "$doc_log_id"
}

# ============================================
# OBSIDIAN SYNC
# ============================================

sync_to_obsidian() {
    local file_path="$1"
    local obsidian_path="$2"
    local doc_log_id="$3"

    log_info "Syncing to Obsidian: $obsidian_path"

    local full_obsidian_path="${OBSIDIAN_VAULT}/${obsidian_path}"
    local obsidian_dir=$(dirname "$full_obsidian_path")

    # Create directory in Obsidian vault if needed
    mkdir -p "$obsidian_dir"

    # Copy file to Obsidian vault
    if cp "$file_path" "$full_obsidian_path"; then
        log_success "Copied to: $full_obsidian_path"

        # Update database
        if [ -f "$DB_PATH" ]; then
            sqlite3 "$DB_PATH" <<SQL
                UPDATE documentation_log SET
                    vault_synced = 1,
                    sync_status = 'success',
                    sync_timestamp = datetime('now')
                WHERE id = ${doc_log_id};
SQL
        fi

        return 0
    else
        log_error "Failed to copy to Obsidian vault"

        # Update database with failure
        if [ -f "$DB_PATH" ]; then
            sqlite3 "$DB_PATH" <<SQL
                UPDATE documentation_log SET
                    sync_status = 'failed',
                    sync_error = 'Failed to copy file to vault'
                WHERE id = ${doc_log_id};
SQL
        fi

        return 1
    fi
}

# Try to sync via MCP (fallback to direct copy)
sync_via_mcp() {
    local file_path="$1"
    local obsidian_path="$2"

    log_info "Attempting MCP sync..."

    local response=$(curl -s -X PUT \
        "${OBSIDIAN_API_URL}/vault/${obsidian_path}" \
        -H "Content-Type: text/markdown" \
        --data-binary @"$file_path" \
        -w "\n%{http_code}" 2>&1)

    local http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log_success "MCP sync successful"
        return 0
    else
        log_warn "MCP sync failed (HTTP $http_code), falling back to direct copy"
        return 1
    fi
}

# ============================================
# MAIN LOGGING FUNCTION
# ============================================

log_documentation() {
    local file_path="$1"
    local action="${2:-updated}"
    local summary="${3:-}"
    local auto_sync="${4:-true}"

    if [ ! -f "$file_path" ]; then
        log_error "File not found: $file_path"
        return 1
    fi

    log_info "Processing: $file_path"

    # Extract metadata
    local doc_type=$(determine_doc_type "$file_path")
    local obsidian_path=$(determine_obsidian_path "$file_path" "$doc_type")
    local title=$(extract_title "$file_path")
    local content_hash=$(calculate_hash "$file_path")
    local lines=$(count_lines "$file_path")
    local words=$(count_words "$file_path")

    log_info "Type: $doc_type"
    log_info "Title: $title"
    log_info "Lines: $lines | Words: $words"

    # Log to database
    local doc_log_id=$(log_to_database \
        "$file_path" \
        "$doc_type" \
        "$action" \
        "$summary" \
        "$content_hash" \
        "$obsidian_path" \
        "$title" \
        "$lines" \
        "$words")

    # Sync to Obsidian if requested
    if [ "$auto_sync" = "true" ]; then
        # Try MCP first, fallback to direct copy
        if ! sync_via_mcp "$file_path" "$obsidian_path"; then
            sync_to_obsidian "$file_path" "$obsidian_path" "$doc_log_id"
        else
            # Update database on MCP success
            if [ -f "$DB_PATH" ]; then
                sqlite3 "$DB_PATH" <<SQL
                    UPDATE documentation_log SET
                        vault_synced = 1,
                        sync_status = 'success',
                        sync_timestamp = datetime('now')
                    WHERE id = ${doc_log_id};
SQL
            fi
        fi
    else
        log_info "Auto-sync disabled, queued for later"
    fi

    log_success "Documentation logged successfully (ID: $doc_log_id)"
}

# ============================================
# CLI INTERFACE
# ============================================

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Automatically log documentation activity to orchestration database.

OPTIONS:
    --file FILE         Documentation file to log (required)
    --action ACTION     Action: created, updated, deleted (default: updated)
    --summary TEXT      Brief summary of changes
    --no-sync           Disable auto-sync to Obsidian
    --help              Show this help message

ENVIRONMENT VARIABLES:
    CLAUDE_AGENT_ID     Agent ID (auto-detected)
    CLAUDE_SESSION_ID   Session ID (auto-detected)
    CLAUDE_TASK_ID      Task ID (auto-detected)
    OBSIDIAN_VAULT      Path to Obsidian vault
    OBSIDIAN_API_URL    Obsidian REST API URL

EXAMPLES:
    # Log documentation creation
    $0 --file docs/setup.md --action created --summary "Initial setup guide"

    # Log update without sync
    $0 --file README.md --action updated --no-sync

    # Called from hook (auto-detected)
    $0 --file docs/api.md

EOF
}

# Parse command-line arguments
FILE_PATH=""
ACTION="updated"
SUMMARY=""
AUTO_SYNC="true"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --file)
            FILE_PATH="$2"
            shift 2
            ;;
        --action)
            ACTION="$2"
            shift 2
            ;;
        --summary)
            SUMMARY="$2"
            shift 2
            ;;
        --no-sync)
            AUTO_SYNC="false"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$FILE_PATH" ]; then
    log_error "Missing required parameter: --file"
    show_usage
    exit 1
fi

# Execute main logging function
log_documentation "$FILE_PATH" "$ACTION" "$SUMMARY" "$AUTO_SYNC"
