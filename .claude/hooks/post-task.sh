#!/bin/bash
# Post-task hook for Golden Armada
# Runs after completing any task - includes orchestration integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${SCRIPT_DIR}/.."
ORCH_DIR="${CLAUDE_DIR}/orchestration"
DB_PATH="${ORCH_DIR}/db/agents.db"

TASK_DESCRIPTION="${1:-}"
AGENT_NAME="${2:-}"
TASK_STATUS="${3:-success}"

echo "=== Post-Task Hook ==="
echo "Task: $TASK_DESCRIPTION"
echo "Agent: $AGENT_NAME"
echo "Status: $TASK_STATUS"
echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ============================================
# ORCHESTRATION INTEGRATION
# ============================================

# Source session environment
if [ -f "${ORCH_DIR}/.session_env" ]; then
    source "${ORCH_DIR}/.session_env"
fi

# Set defaults
CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-unknown}"
CLAUDE_TASK_ID="${CLAUDE_TASK_ID:-unknown}"

# Update task status
if [ -f "$DB_PATH" ]; then
    # Determine DB status
    db_status="completed"
    if [ "$TASK_STATUS" != "success" ]; then
        db_status="failed"
    fi

    # Update task
    sqlite3 "$DB_PATH" "
        UPDATE tasks SET
            status = '$db_status',
            completed_at = datetime('now')
        WHERE id = '$CLAUDE_TASK_ID';
    " 2>/dev/null || true

    # Update agent status to idle
    sqlite3 "$DB_PATH" "
        UPDATE agents SET
            status = 'idle',
            last_active_at = datetime('now')
        WHERE id = '$CLAUDE_AGENT_ID';
    " 2>/dev/null || true

    # Log task completion
    sqlite3 "$DB_PATH" "
        INSERT INTO activity_log (session_id, agent_id, task_id, action, category, level, message)
        VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', '$CLAUDE_TASK_ID', 'task_completed',
                'task_execution', 'INFO', 'Task completed with status: $TASK_STATUS');
    " 2>/dev/null || true

    # Create completion checkpoint
    CHECKPOINT_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "cp-$(date +%s)")
    sqlite3 "$DB_PATH" "
        INSERT INTO checkpoints (id, session_id, task_id, agent_id, checkpoint_type, state)
        VALUES ('$CHECKPOINT_ID', '$CLAUDE_SESSION_ID', '$CLAUDE_TASK_ID', '$CLAUDE_AGENT_ID', 'task_complete',
                '{\"status\": \"$TASK_STATUS\", \"duration\": \"$SECONDS\"}');
    " 2>/dev/null || true

    # Release any locks held by this agent
    sqlite3 "$DB_PATH" "DELETE FROM locks WHERE owner_agent_id = '$CLAUDE_AGENT_ID';" 2>/dev/null || true

    echo "[Orchestration] Task $CLAUDE_TASK_ID completed (status: $TASK_STATUS)"
fi

# Write to orchestration log file
LOG_FILE="${ORCH_DIR}/logs/$(date +%Y-%m-%d).log"
echo "[$(date -Iseconds)] [INFO] [task_completed] Task $CLAUDE_TASK_ID completed: $TASK_DESCRIPTION (status: $TASK_STATUS)" >> "$LOG_FILE" 2>/dev/null || true

# ============================================
# CONTEXT MANAGEMENT & PROTOCOL ENFORCEMENT
# ============================================

# Get current phase
CURRENT_PHASE="unknown"
if [ -f "${ORCH_DIR}/state/current_phase.json" ]; then
    CURRENT_PHASE=$(cat "${ORCH_DIR}/state/current_phase.json" | grep -o '"current_phase": "[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
fi

# Count files changed for documentation enforcement
FILES_CHANGED=0
if [ -d ".git" ]; then
    FILES_CHANGED=$(git diff --name-only HEAD~1 2>/dev/null | wc -l || echo "0")
fi

# Run context management enforcement
if [ -f "${SCRIPT_DIR}/context-management-hook.sh" ]; then
    bash "${SCRIPT_DIR}/context-management-hook.sh" post-operation "post-task" "$CURRENT_PHASE" "$AGENT_NAME" "$CLAUDE_TASK_ID" || echo "[WARNING] Context post-check failed"
fi

# Run orchestration protocol enforcement
if [ -f "${SCRIPT_DIR}/orchestration-protocol-enforcer.sh" ]; then
    bash "${SCRIPT_DIR}/orchestration-protocol-enforcer.sh" post-task \
        "$TASK_DESCRIPTION" "$CURRENT_PHASE" "$TASK_STATUS" || {
        echo "[WARNING] Orchestration protocol post-check failed!"
        echo "          Review protocol violations in .claude/orchestration/state/protocol_violations.log"
    }
fi

# ============================================
# STANDARD HOOKS
# ============================================

# Log task completion
log_task() {
    local log_file=".claude/logs/tasks.log"
    mkdir -p "$(dirname "$log_file")" 2>/dev/null || true
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | $AGENT_NAME | $TASK_STATUS | $TASK_DESCRIPTION" >> "$log_file"
}

# Check for uncommitted changes
check_changes() {
    if [ -d ".git" ]; then
        local changes=$(git status --porcelain 2>/dev/null | wc -l)
        if [ "$changes" -gt 0 ]; then
            echo "Uncommitted changes detected: $changes files"
            git status --short 2>/dev/null || true
        fi
    fi
}

# Run linting if code was modified
run_linting() {
    local modified_py=$(git diff --name-only --cached 2>/dev/null | grep "\.py$" | wc -l)
    if [ "$modified_py" -gt 0 ]; then
        echo "Running Python linting..."
        python -m flake8 --max-line-length=100 $(git diff --name-only --cached | grep "\.py$") 2>/dev/null || true
    fi
}

# Agent-specific cleanup
cleanup_agent() {
    case "$AGENT_NAME" in
        "docker-builder")
            echo "Cleaning up Docker build artifacts..."
            docker system prune -f --filter "until=1h" 2>/dev/null || true
            ;;
        "tester")
            echo "Cleaning up test artifacts..."
            find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
            find . -type f -name "*.pyc" -delete 2>/dev/null || true
            ;;
        *)
            ;;
    esac
}

# Generate summary
generate_summary() {
    echo ""
    echo "=== Task Summary ==="
    echo "Duration: $SECONDS seconds"

    if [ -d ".git" ]; then
        local files_changed=$(git diff --name-only HEAD~1 2>/dev/null | wc -l || echo "0")
        echo "Files changed: $files_changed"
    fi

    # Orchestration summary
    if [ -f "$DB_PATH" ]; then
        local session_tasks=$(sqlite3 "$DB_PATH" "
            SELECT COUNT(*) FROM tasks WHERE session_id = '$CLAUDE_SESSION_ID';
        " 2>/dev/null || echo "0")
        echo "Tasks in session: $session_tasks"
    fi
}

# Run hooks
log_task
check_changes
run_linting
cleanup_agent
generate_summary

echo "=== Post-Task Complete ==="
