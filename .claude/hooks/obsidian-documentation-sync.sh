#!/bin/bash
# Obsidian Documentation Sync Hook
# Automatically documents work in Obsidian vault and manages repo cleanup

# Hook Configuration
# Event: task:complete, phase:complete
# Pattern: *
# Priority: high

set -e

HOOK_NAME="obsidian-documentation-sync"
PHASE="${1:-unknown}"
CONTEXT="${2:-}"

# Configuration - Uses environment variables for portability
OBSIDIAN_VAULT="${OBSIDIAN_VAULT_PATH:-${HOME}/obsidian}"
CLAUDE_DIR=".claude"
PROJECT_NAME="${PROJECT_NAME:-project}"
ARCHIVE_DIR="$OBSIDIAN_VAULT/System/Claude-Archives"
DOCS_DIR="$OBSIDIAN_VAULT/System/Claude-Instructions"

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

# Create archive directories if they don't exist
mkdir -p "$ARCHIVE_DIR"/{agents,workflows,skills,commands,hooks}
mkdir -p "$DOCS_DIR"

# Function to sync file to Obsidian
sync_to_obsidian() {
    local SOURCE="$1"
    local DEST_DIR="$2"
    local FILENAME=$(basename "$SOURCE")
    local DEST="$DEST_DIR/$FILENAME"

    if [ -f "$SOURCE" ]; then
        # Add frontmatter if not present
        if ! head -1 "$SOURCE" | grep -q "^---"; then
            TEMP_FILE=$(mktemp)
            cat > "$TEMP_FILE" << EOF
---
source: $SOURCE
synced: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
type: claude-resource
---

EOF
            cat "$SOURCE" >> "$TEMP_FILE"
            mv "$TEMP_FILE" "$DEST"
        else
            cp "$SOURCE" "$DEST"
        fi
        log_action "Synced: $FILENAME → Obsidian"
    fi
}

# Function to archive and remove from repo
archive_and_cleanup() {
    local SOURCE="$1"
    local ARCHIVE_SUBDIR="$2"
    local FILENAME=$(basename "$SOURCE")
    local DATE=$(date +%Y%m%d)
    local ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_SUBDIR/${DATE}_${FILENAME}"

    if [ -f "$SOURCE" ]; then
        # Archive to Obsidian
        sync_to_obsidian "$SOURCE" "$ARCHIVE_DIR/$ARCHIVE_SUBDIR"

        # Add to .gitignore if cleanup is enabled
        if [ "$CLEANUP_MODE" = "true" ]; then
            log_action "Archived: $FILENAME (can be removed from repo)"
        fi
    fi
}

# Sync different resource types
log_info "Starting Obsidian documentation sync..."

# Sync agents (important for reference)
if [ -d "$CLAUDE_DIR/agents" ]; then
    log_action "Syncing agents to Obsidian..."
    find "$CLAUDE_DIR/agents" -name "*.md" | while read -r FILE; do
        CATEGORY=$(dirname "$FILE" | xargs basename)
        mkdir -p "$ARCHIVE_DIR/agents/$CATEGORY"
        sync_to_obsidian "$FILE" "$ARCHIVE_DIR/agents/$CATEGORY"
    done
fi

# Sync workflows
if [ -d "$CLAUDE_DIR/workflows" ]; then
    log_action "Syncing workflows to Obsidian..."
    find "$CLAUDE_DIR/workflows" -name "*.md" | while read -r FILE; do
        sync_to_obsidian "$FILE" "$ARCHIVE_DIR/workflows"
    done
fi

# Sync skills
if [ -d "$CLAUDE_DIR/skills" ]; then
    log_action "Syncing skills to Obsidian..."
    find "$CLAUDE_DIR/skills" -name "SKILL.md" | while read -r FILE; do
        SKILL_NAME=$(dirname "$FILE" | xargs basename)
        mkdir -p "$ARCHIVE_DIR/skills"
        cp "$FILE" "$ARCHIVE_DIR/skills/${SKILL_NAME}-SKILL.md"
    done
fi

# Sync commands
if [ -d "$CLAUDE_DIR/commands" ]; then
    log_action "Syncing commands to Obsidian..."
    find "$CLAUDE_DIR/commands" -name "*.md" | while read -r FILE; do
        sync_to_obsidian "$FILE" "$ARCHIVE_DIR/commands"
    done
fi

# Create index file in Obsidian
INDEX_FILE="$ARCHIVE_DIR/INDEX.md"
cat > "$INDEX_FILE" << EOF
---
title: Claude Resources Index
updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

# Claude Resources Index

Auto-generated index of all Claude Code resources synced from repository.

## Agents
$(find "$ARCHIVE_DIR/agents" -name "*.md" 2>/dev/null | sort | while read -r f; do
    NAME=$(basename "$f" .md)
    CATEGORY=$(dirname "$f" | xargs basename)
    echo "- [[$CATEGORY/$NAME|$NAME]] ($CATEGORY)"
done)

## Workflows
$(find "$ARCHIVE_DIR/workflows" -name "*.md" 2>/dev/null | sort | while read -r f; do
    NAME=$(basename "$f" .md)
    echo "- [[$NAME]]"
done)

## Skills
$(find "$ARCHIVE_DIR/skills" -name "*.md" 2>/dev/null | sort | while read -r f; do
    NAME=$(basename "$f" .md)
    echo "- [[$NAME]]"
done)

## Commands
$(find "$ARCHIVE_DIR/commands" -name "*.md" 2>/dev/null | sort | while read -r f; do
    NAME=$(basename "$f" .md)
    echo "- [[$NAME]]"
done)

---
*Last sync: $(date)*
EOF

log_info "Created Obsidian index at: $INDEX_FILE"
log_info "Documentation sync completed!"

# Phase-specific documentation
if [ -n "$PHASE" ] && [ "$PHASE" != "unknown" ]; then
    PHASE_LOG="$ARCHIVE_DIR/phase-logs/$(date +%Y%m%d)_${PHASE}.md"
    mkdir -p "$(dirname "$PHASE_LOG")"

    cat >> "$PHASE_LOG" << EOF

## Phase: $PHASE - $(date)

Context: $CONTEXT

---
EOF

    log_info "Logged phase completion: $PHASE"
fi

exit 0
