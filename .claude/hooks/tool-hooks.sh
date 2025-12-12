#!/bin/bash
# Tool Hooks - Track tool calls and file operations in orchestration system
# Called before/after tool executions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCH_DIR="${SCRIPT_DIR}/../orchestration"
DB_PATH="${ORCH_DIR}/db/agents.db"

# Source session environment if available
if [ -f "${ORCH_DIR}/.session_env" ]; then
    source "${ORCH_DIR}/.session_env"
fi

# Default values if not set
CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-unknown}"

# Log function
log_to_db() {
    local action="$1"
    local message="$2"
    local category="${3:-tool_execution}"
    local level="${4:-INFO}"
    local details="$5"

    if [ -f "$DB_PATH" ]; then
        sqlite3 "$DB_PATH" "
            INSERT INTO activity_log (session_id, agent_id, action, category, level, message, details)
            VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', '$action', '$category', '$level', '$message', '$details');
        " 2>/dev/null || true
    fi

    # Also log to file
    local LOG_FILE="${ORCH_DIR}/logs/$(date +%Y-%m-%d).log"
    echo "[$(date -Iseconds)] [$level] [$action] $message" >> "$LOG_FILE" 2>/dev/null || true
}

# Pre-tool hook - called before tool execution
pre_tool() {
    local tool_name="$1"
    local tool_input="$2"

    log_to_db "tool_started" "Starting $tool_name" "tool_execution" "DEBUG" "$tool_input"

    # For file operations, try to acquire lock
    case "$tool_name" in
        Edit|Write|NotebookEdit)
            # Extract file path from tool input (simplified)
            local file_path=$(echo "$tool_input" | grep -oP '"file_path":\s*"[^"]*"' | head -1 | sed 's/"file_path":\s*"\([^"]*\)"/\1/')
            if [ -n "$file_path" ]; then
                # Check if file is locked
                if [ -f "$DB_PATH" ]; then
                    local lock_owner=$(sqlite3 "$DB_PATH" "
                        SELECT owner_agent_id FROM locks
                        WHERE resource_id = '$file_path' AND expires_at > datetime('now');
                    " 2>/dev/null)

                    if [ -n "$lock_owner" ] && [ "$lock_owner" != "$CLAUDE_AGENT_ID" ]; then
                        echo "[Orchestration] Warning: File $file_path is locked by $lock_owner"
                        log_to_db "lock_conflict" "File $file_path locked by $lock_owner" "coordination" "WARN"
                    else
                        # Acquire lock
                        local expires=$(date -d "+5 minutes" -Iseconds 2>/dev/null || date -v+5M -Iseconds 2>/dev/null || echo "")
                        if [ -n "$expires" ]; then
                            sqlite3 "$DB_PATH" "
                                INSERT INTO locks (resource_id, resource_type, owner_agent_id, owner_session_id, expires_at)
                                VALUES ('$file_path', 'file', '$CLAUDE_AGENT_ID', '$CLAUDE_SESSION_ID', '$expires')
                                ON CONFLICT(resource_id) DO UPDATE SET
                                    owner_agent_id = excluded.owner_agent_id,
                                    acquired_at = datetime('now'),
                                    expires_at = excluded.expires_at;
                            " 2>/dev/null || true
                        fi
                    fi
                fi
            fi
            ;;
    esac
}

# Post-tool hook - called after tool execution
post_tool() {
    local tool_name="$1"
    local tool_result="$2"
    local duration_ms="$3"

    log_to_db "tool_completed" "Completed $tool_name (${duration_ms}ms)" "tool_execution" "DEBUG"

    # For file operations, release lock and record operation
    case "$tool_name" in
        Edit|Write|NotebookEdit)
            local file_path=$(echo "$tool_result" | grep -oP 'File [^ ]* (created|updated)' | head -1 | awk '{print $2}')
            if [ -n "$file_path" ] && [ -f "$DB_PATH" ]; then
                # Record file operation
                local content_hash=""
                if [ -f "$file_path" ]; then
                    content_hash=$(sha256sum "$file_path" 2>/dev/null | cut -d' ' -f1 || echo "")
                fi

                sqlite3 "$DB_PATH" "
                    INSERT INTO file_operations (session_id, agent_id, operation, file_path, content_hash)
                    VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', 'edit', '$file_path', '$content_hash');
                " 2>/dev/null || true

                # Release lock
                sqlite3 "$DB_PATH" "
                    DELETE FROM locks WHERE resource_id = '$file_path' AND owner_agent_id = '$CLAUDE_AGENT_ID';
                " 2>/dev/null || true
            fi
            ;;
        Read)
            local file_path=$(echo "$tool_result" | head -1)
            if [ -n "$file_path" ] && [ -f "$DB_PATH" ]; then
                sqlite3 "$DB_PATH" "
                    INSERT INTO file_operations (session_id, agent_id, operation, file_path)
                    VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', 'read', '$file_path');
                " 2>/dev/null || true
            fi
            ;;
        Bash)
            # Record bash command execution
            local command=$(echo "$tool_result" | head -1)
            log_to_db "bash_executed" "Executed bash command" "tool_execution" "INFO" "$command"
            ;;
    esac
}

# Error hook - called on tool error
error_hook() {
    local tool_name="$1"
    local error_message="$2"

    log_to_db "tool_error" "Error in $tool_name: $error_message" "errors" "ERROR"

    # Create error checkpoint
    if [ -f "$DB_PATH" ]; then
        local checkpoint_id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "cp-$(date +%s)")
        sqlite3 "$DB_PATH" "
            INSERT INTO checkpoints (id, session_id, agent_id, checkpoint_type, state)
            VALUES ('$checkpoint_id', '$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', 'error',
                    '{\"tool\": \"$tool_name\", \"error\": \"$error_message\"}');
        " 2>/dev/null || true
    fi
}

# Main dispatcher
case "${1:-help}" in
    pre)
        pre_tool "$2" "$3"
        ;;
    post)
        post_tool "$2" "$3" "$4"
        ;;
    error)
        error_hook "$2" "$3"
        ;;
    *)
        echo "Tool Hooks for Orchestration"
        echo "Usage: $0 <pre|post|error> <tool_name> [args...]"
        ;;
esac
