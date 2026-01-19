#!/bin/bash
# example-hook - Example hook that processes file operations
# Trigger: PostToolUse
# Plugin: workflow-automator

set -e

# Configuration
HOOK_NAME="example-hook"
LOG_FILE="${HOME}/.claude/logs/${HOOK_NAME}.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Main execution
main() {
    log "Hook started: $HOOK_NAME"

    # Add your hook logic here
    # Available environment variables:
    # - CLAUDE_PROJECT_DIR: Current project directory
    # - CLAUDE_SESSION_ID: Current session identifier

    log "Hook completed: $HOOK_NAME"
}

# Run main function
main "$@"
