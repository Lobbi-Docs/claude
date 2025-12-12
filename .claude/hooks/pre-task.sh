#!/bin/bash
# Pre-task hook for Golden Armada
# Runs before starting any task - includes orchestration integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${SCRIPT_DIR}/.."
ORCH_DIR="${CLAUDE_DIR}/orchestration"
DB_PATH="${ORCH_DIR}/db/agents.db"

TASK_DESCRIPTION="${1:-}"
AGENT_NAME="${2:-}"

echo "=== Pre-Task Hook ==="
echo "Task: $TASK_DESCRIPTION"
echo "Agent: $AGENT_NAME"
echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ============================================
# ORCHESTRATION INTEGRATION
# ============================================

# Source or create session environment
if [ -f "${ORCH_DIR}/.session_env" ]; then
    source "${ORCH_DIR}/.session_env"
fi

# Initialize session if not exists
if [ -z "$CLAUDE_SESSION_ID" ] || [ ! -f "$DB_PATH" ]; then
    echo "[Orchestration] Initializing session..."
    if [ -f "${SCRIPT_DIR}/session-start.sh" ]; then
        bash "${SCRIPT_DIR}/session-start.sh" 2>/dev/null || true
        if [ -f "${ORCH_DIR}/.session_env" ]; then
            source "${ORCH_DIR}/.session_env"
        fi
    fi
fi

# Set defaults
CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-session-$(date +%s)}"
CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-claude-$$}"

# Create task ID
CLAUDE_TASK_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "task-$(date +%s)")
export CLAUDE_TASK_ID

# Update agent status
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "
        INSERT INTO agents (id, name, type, category, status, last_active_at)
        VALUES ('$CLAUDE_AGENT_ID', '${AGENT_NAME:-claude}', '${AGENT_NAME:-claude}', 'core', 'running', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            status = 'running',
            last_active_at = datetime('now'),
            updated_at = datetime('now');
    " 2>/dev/null || true

    # Create task entry
    sqlite3 "$DB_PATH" "
        INSERT INTO tasks (id, session_id, agent_id, title, status, started_at)
        VALUES ('$CLAUDE_TASK_ID', '$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', '$TASK_DESCRIPTION', 'running', datetime('now'));
    " 2>/dev/null || true

    # Log task start
    sqlite3 "$DB_PATH" "
        INSERT INTO activity_log (session_id, agent_id, task_id, action, category, level, message)
        VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', '$CLAUDE_TASK_ID', 'task_started', 'task_execution', 'INFO', 'Task started: $TASK_DESCRIPTION');
    " 2>/dev/null || true

    # Create checkpoint
    CHECKPOINT_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "cp-$(date +%s)")
    sqlite3 "$DB_PATH" "
        INSERT INTO checkpoints (id, session_id, task_id, agent_id, checkpoint_type, state)
        VALUES ('$CHECKPOINT_ID', '$CLAUDE_SESSION_ID', '$CLAUDE_TASK_ID', '$CLAUDE_AGENT_ID', 'task_start',
                '{\"task\": \"$TASK_DESCRIPTION\", \"agent\": \"$AGENT_NAME\"}');
    " 2>/dev/null || true

    # Check for unread messages
    UNREAD_COUNT=$(sqlite3 "$DB_PATH" "
        SELECT COUNT(*) FROM messages
        WHERE (recipient_id = '$CLAUDE_AGENT_ID' OR (channel = 'broadcast' AND recipient_id IS NULL))
        AND read_at IS NULL;
    " 2>/dev/null || echo "0")

    if [ "$UNREAD_COUNT" -gt 0 ]; then
        echo "[Orchestration] $UNREAD_COUNT unread message(s) from other agents"
    fi

    # Clean up expired locks
    sqlite3 "$DB_PATH" "DELETE FROM locks WHERE expires_at < datetime('now');" 2>/dev/null || true

    echo "[Orchestration] Task $CLAUDE_TASK_ID tracking active"
fi

# Save to session env
if [ -d "$ORCH_DIR" ]; then
    echo "export CLAUDE_TASK_ID='$CLAUDE_TASK_ID'" >> "${ORCH_DIR}/.session_env" 2>/dev/null || true
fi

# ============================================
# STANDARD CHECKS
# ============================================

# Validate environment
validate_environment() {
    local missing=()

    # Check for required tools
    command -v kubectl &>/dev/null || missing+=("kubectl")
    command -v helm &>/dev/null || missing+=("helm")
    command -v docker &>/dev/null || missing+=("docker")

    if [ ${#missing[@]} -gt 0 ]; then
        echo "WARNING: Missing tools: ${missing[*]}"
    fi
}

# Check git status
check_git_status() {
    if [ -d ".git" ]; then
        local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        local status=$(git status --porcelain 2>/dev/null | wc -l)
        echo "Git branch: $branch"
        echo "Uncommitted changes: $status"
    fi
}

# Check Kubernetes context (if applicable)
check_k8s_context() {
    if command -v kubectl &>/dev/null; then
        local context=$(kubectl config current-context 2>/dev/null || echo "none")
        echo "K8s context: $context"
    fi
}

# Agent-specific setup
setup_agent_context() {
    case "$AGENT_NAME" in
        "coder"|"python-specialist"|"typescript-specialist")
            echo "Setting up development context..."
            ;;
        "k8s-deployer"|"helm-specialist")
            echo "Setting up Kubernetes context..."
            check_k8s_context
            ;;
        "security-auditor"|"penetration-tester")
            echo "Setting up security scanning context..."
            ;;
        "incident-responder")
            echo "Setting up incident response context..."
            echo "PRIORITY: Production incident handling"
            ;;
        *)
            echo "Generic agent setup..."
            ;;
    esac
}

# ============================================
# CONTEXT MANAGEMENT & PROTOCOL ENFORCEMENT
# ============================================

# Run context management enforcement
if [ -f "${SCRIPT_DIR}/context-management-hook.sh" ]; then
    bash "${SCRIPT_DIR}/context-management-hook.sh" pre-operation "pre-task" || echo "[WARNING] Context check failed"
fi

# Run orchestration protocol enforcement
if [ -f "${SCRIPT_DIR}/orchestration-protocol-enforcer.sh" ]; then
    # Extract agent count and phase from task description if possible
    AGENT_COUNT="${CLAUDE_AGENT_COUNT:-5}"
    STARTING_PHASE="${CLAUDE_STARTING_PHASE:-explore}"

    bash "${SCRIPT_DIR}/orchestration-protocol-enforcer.sh" pre-task \
        "$TASK_DESCRIPTION" "$AGENT_COUNT" "$STARTING_PHASE" || {
        echo "[ERROR] Orchestration protocol pre-check failed!"
        echo "       Review CLAUDE.md mandatory requirements"
    }
fi

# Run checks
validate_environment
check_git_status
setup_agent_context

echo "=== Pre-Task Complete ==="
