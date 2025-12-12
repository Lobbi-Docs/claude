#!/bin/bash
#
# Post-Edit Documentation Hook
# Automatically triggered after file edits to log documentation changes
#
# This hook is called by the main post-edit.sh hook when documentation files are modified
# Integration: Add to .claude/hooks/post-edit.sh:
#   source .claude/hooks/post-edit-documentation.sh
#

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_LOGGER="$SCRIPT_DIR/doc-logging.sh"

# ============================================
# DOCUMENTATION DETECTION
# ============================================

is_documentation_file() {
    local file="$1"

    # Check if file is markdown
    if [[ "$file" =~ \.(md|mdx|markdown)$ ]]; then
        return 0
    fi

    # Check specific documentation files
    case "$(basename "$file")" in
        README*|readme*|CONTRIBUTING*|CHANGELOG*|LICENSE*)
            return 0
            ;;
    esac

    return 1
}

should_log_documentation() {
    local file="$1"

    # Exclude patterns
    local exclude_patterns=(
        "node_modules/"
        ".git/"
        ".next/"
        "dist/"
        "build/"
        "coverage/"
        ".turbo/"
        "__pycache__/"
    )

    for pattern in "${exclude_patterns[@]}"; do
        if [[ "$file" =~ $pattern ]]; then
            return 1
        fi
    done

    # Only log if it's a documentation file
    is_documentation_file "$file"
}

# ============================================
# POST-EDIT HANDLER
# ============================================

handle_documentation_edit() {
    local edited_file="$1"
    local edit_type="${2:-updated}"  # created, updated, deleted

    if ! should_log_documentation "$edited_file"; then
        return 0
    fi

    echo -e "${CYAN}[PostEdit]${NC} Documentation detected: $edited_file"

    # Check if file still exists (not deleted)
    if [ ! -f "$edited_file" ] && [ "$edit_type" != "deleted" ]; then
        edit_type="deleted"
    fi

    # Determine action based on git status (if available)
    if command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null 2>&1; then
        if git ls-files --error-unmatch "$edited_file" &>/dev/null; then
            # File is tracked
            if [ "$(git diff --name-only "$edited_file")" ]; then
                edit_type="updated"
            fi
        else
            # File is untracked
            if [ -f "$edited_file" ]; then
                edit_type="created"
            fi
        fi
    fi

    # Generate summary from git diff (if available)
    local summary=""
    if [ "$edit_type" = "updated" ] && command -v git &>/dev/null; then
        # Get line change stats
        local stats=$(git diff --numstat "$edited_file" 2>/dev/null | awk '{print "+"$1" -"$2}')
        if [ -n "$stats" ]; then
            summary="Modified: $stats lines"
        fi
    fi

    # Call documentation logger
    if [ -x "$DOC_LOGGER" ]; then
        "$DOC_LOGGER" \
            --file "$edited_file" \
            --action "$edit_type" \
            --summary "$summary"
    else
        echo -e "${CYAN}[PostEdit]${NC} Warning: Documentation logger not found or not executable: $DOC_LOGGER"
    fi
}

# ============================================
# INTEGRATION HOOK
# ============================================

# This function should be called from main post-edit.sh hook
post_edit_documentation_hook() {
    local edited_files=("$@")

    if [ ${#edited_files[@]} -eq 0 ]; then
        # If called without arguments, check environment
        if [ -n "$EDIT_FILE_PATH" ]; then
            edited_files=("$EDIT_FILE_PATH")
        else
            return 0
        fi
    fi

    for file in "${edited_files[@]}"; do
        handle_documentation_edit "$file" "updated"
    done
}

# ============================================
# STANDALONE EXECUTION
# ============================================

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Script is being run directly
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <file1> [file2] [...]"
        echo "Or set EDIT_FILE_PATH environment variable"
        exit 1
    fi

    post_edit_documentation_hook "$@"
fi

# Export function for sourcing
export -f post_edit_documentation_hook handle_documentation_edit
