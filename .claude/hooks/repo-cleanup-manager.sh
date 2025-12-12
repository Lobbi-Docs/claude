#!/bin/bash
# Repository Cleanup Manager Hook
# Moves old .md files to Obsidian vault and removes from repo to declutter

# Hook Configuration
# Event: manual, scheduled
# Pattern: .claude/**/*.md
# Priority: low

set -e

HOOK_NAME="repo-cleanup-manager"
ACTION="${1:-status}"

# Configuration - Uses environment variables for portability
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-${HOME}/obsidian}"
CLAUDE_DIR=".claude"
ARCHIVE_BASE="$OBSIDIAN_VAULT/System/Claude-Archives"
MAX_AGE_DAYS="${MAX_AGE_DAYS:-30}"  # Files older than this can be archived

# Files to NEVER delete (keep in repo)
PROTECTED_FILES="CLAUDE.md|settings.json|*.schema.json"
PROTECTED_DIRS="registry|orchestration|hooks"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[${HOOK_NAME}]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[${HOOK_NAME}]${NC} $1"
}

log_action() {
    echo -e "${BLUE}[${HOOK_NAME}]${NC} → $1"
}

log_error() {
    echo -e "${RED}[${HOOK_NAME}]${NC} $1"
}

# Function to check if file is protected
is_protected() {
    local FILE="$1"

    # Check protected files
    if echo "$FILE" | grep -E "$PROTECTED_FILES" > /dev/null 2>&1; then
        return 0
    fi

    # Check protected directories
    if echo "$FILE" | grep -E "$PROTECTED_DIRS" > /dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Function to archive file
archive_file() {
    local SOURCE="$1"
    local RELATIVE_PATH="${SOURCE#$CLAUDE_DIR/}"
    local ARCHIVE_PATH="$ARCHIVE_BASE/$RELATIVE_PATH"
    local ARCHIVE_DIR=$(dirname "$ARCHIVE_PATH")

    # Create archive directory
    mkdir -p "$ARCHIVE_DIR"

    # Add metadata header
    TEMP_FILE=$(mktemp)
    cat > "$TEMP_FILE" << EOF
---
archived_from: $SOURCE
archived_date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
original_modified: $(stat -c %y "$SOURCE" 2>/dev/null || stat -f %Sm "$SOURCE" 2>/dev/null)
---

EOF
    cat "$SOURCE" >> "$TEMP_FILE"
    mv "$TEMP_FILE" "$ARCHIVE_PATH"

    log_action "Archived: $SOURCE → $ARCHIVE_PATH"
}

# Status command - show what would be cleaned
show_status() {
    log_info "=== Repository Cleanup Status ==="
    log_info ""

    # Count files
    TOTAL_MD=$(find "$CLAUDE_DIR" -name "*.md" 2>/dev/null | wc -l)
    AGENT_MD=$(find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l)
    WORKFLOW_MD=$(find "$CLAUDE_DIR/workflows" -name "*.md" 2>/dev/null | wc -l)
    COMMAND_MD=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l)
    SKILL_MD=$(find "$CLAUDE_DIR/skills" -name "*.md" 2>/dev/null | wc -l)

    log_info "Total .md files in .claude/: $TOTAL_MD"
    log_info "  - Agents: $AGENT_MD"
    log_info "  - Workflows: $WORKFLOW_MD"
    log_info "  - Commands: $COMMAND_MD"
    log_info "  - Skills: $SKILL_MD"
    log_info ""

    # Show old files
    log_info "Files older than $MAX_AGE_DAYS days (candidates for archival):"
    find "$CLAUDE_DIR" -name "*.md" -mtime +$MAX_AGE_DAYS 2>/dev/null | while read -r FILE; do
        if ! is_protected "$FILE"; then
            log_action "$FILE"
        fi
    done

    log_info ""
    log_info "Protected files/directories (never cleaned):"
    log_info "  - $PROTECTED_FILES"
    log_info "  - Directories: $PROTECTED_DIRS"
}

# Preview command - show what would be archived
preview_cleanup() {
    log_info "=== Preview: Files to Archive ==="
    log_info ""

    COUNT=0
    find "$CLAUDE_DIR" -name "*.md" 2>/dev/null | while read -r FILE; do
        if ! is_protected "$FILE"; then
            RELATIVE="${FILE#$CLAUDE_DIR/}"
            DEST="$ARCHIVE_BASE/$RELATIVE"
            echo "  $FILE → $DEST"
            COUNT=$((COUNT + 1))
        fi
    done

    log_info ""
    log_info "Total files to archive: $COUNT"
    log_info ""
    log_warn "Run with 'execute' to perform archival"
}

# Execute command - actually archive and optionally delete
execute_cleanup() {
    log_info "=== Executing Repository Cleanup ==="
    log_info ""

    ARCHIVED=0
    DELETED=0

    find "$CLAUDE_DIR" -name "*.md" 2>/dev/null | while read -r FILE; do
        if ! is_protected "$FILE"; then
            # Archive the file
            archive_file "$FILE"
            ARCHIVED=$((ARCHIVED + 1))

            # Delete if DELETE_AFTER_ARCHIVE is set
            if [ "$DELETE_AFTER_ARCHIVE" = "true" ]; then
                rm "$FILE"
                DELETED=$((DELETED + 1))
                log_action "Deleted: $FILE"
            fi
        fi
    done

    log_info ""
    log_info "Cleanup complete!"
    log_info "  Archived: $ARCHIVED files"
    log_info "  Deleted: $DELETED files"

    # Update git
    if [ "$DELETED" -gt 0 ]; then
        log_info ""
        log_warn "Don't forget to commit the deletions:"
        log_warn "  git add -A && git commit -m 'chore: archive old .md files to Obsidian'"
    fi
}

# Archive agents specifically
archive_agents() {
    log_info "=== Archiving Agent Files to Obsidian ==="

    find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | while read -r FILE; do
        archive_file "$FILE"
    done

    log_info "Agent archival complete!"
}

# Sync to obsidian without deletion
sync_only() {
    log_info "=== Syncing to Obsidian (no deletion) ==="

    find "$CLAUDE_DIR" -name "*.md" 2>/dev/null | while read -r FILE; do
        if ! is_protected "$FILE"; then
            archive_file "$FILE"
        fi
    done

    log_info "Sync complete! Files remain in repository."
}

# Main execution
case "$ACTION" in
    status)
        show_status
        ;;
    preview)
        preview_cleanup
        ;;
    execute)
        execute_cleanup
        ;;
    agents)
        archive_agents
        ;;
    sync)
        sync_only
        ;;
    *)
        log_error "Unknown action: $ACTION"
        log_info ""
        log_info "Usage: $0 [status|preview|execute|agents|sync]"
        log_info ""
        log_info "  status  - Show current file counts and candidates"
        log_info "  preview - Show what would be archived"
        log_info "  execute - Archive files (set DELETE_AFTER_ARCHIVE=true to also delete)"
        log_info "  agents  - Archive only agent files"
        log_info "  sync    - Sync all files to Obsidian without deletion"
        exit 1
        ;;
esac

exit 0
