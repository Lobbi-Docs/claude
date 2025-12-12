#!/bin/bash
# Session Start Hook - Initializes orchestration system when Claude starts
# This hook runs automatically at the beginning of each Claude session

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${SCRIPT_DIR}/.."
ORCH_DIR="${CLAUDE_DIR}/orchestration"
DB_PATH="${ORCH_DIR}/db/agents.db"

# Generate unique session and agent IDs
export CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "session-$(date +%s)")}"
export CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-claude-$(hostname 2>/dev/null || echo 'local')-$$}"
export CLAUDE_AGENT_TYPE="${CLAUDE_AGENT_TYPE:-claude}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}[Orchestration] Initializing session...${NC}"

# Ensure orchestration directories exist
mkdir -p "${ORCH_DIR}/db" "${ORCH_DIR}/logs" "${ORCH_DIR}/checkpoints" "${ORCH_DIR}/locks" "${ORCH_DIR}/messages"

# Initialize database if needed
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}[Orchestration] Creating database...${NC}"
    if [ -f "${ORCH_DIR}/db/schema.sql" ]; then
        sqlite3 "$DB_PATH" < "${ORCH_DIR}/db/schema.sql"
        echo -e "${GREEN}[Orchestration] Database initialized${NC}"
    else
        echo -e "${YELLOW}[Orchestration] Warning: schema.sql not found${NC}"
    fi
fi

# Clean up expired locks
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "DELETE FROM locks WHERE expires_at < datetime('now');" 2>/dev/null || true
fi

# Register this agent
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "
        INSERT INTO agents (id, name, type, category, status, last_active_at)
        VALUES ('$CLAUDE_AGENT_ID', '$CLAUDE_AGENT_ID', '$CLAUDE_AGENT_TYPE', 'core', 'running', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            status = 'running',
            last_active_at = datetime('now'),
            updated_at = datetime('now');
    " 2>/dev/null || true

    echo -e "${GREEN}[Orchestration] Agent registered: $CLAUDE_AGENT_ID${NC}"
fi

# Create or update session
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "
        INSERT INTO sessions (id, name, pattern, status, started_at)
        VALUES ('$CLAUDE_SESSION_ID', 'Claude Session', 'solo', 'active', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            status = 'active',
            started_at = datetime('now');
    " 2>/dev/null || true

    echo -e "${GREEN}[Orchestration] Session started: $CLAUDE_SESSION_ID${NC}"
fi

# Log session start
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "
        INSERT INTO activity_log (session_id, agent_id, action, category, level, message)
        VALUES ('$CLAUDE_SESSION_ID', '$CLAUDE_AGENT_ID', 'session_started', 'task_execution', 'INFO', 'Claude session initialized');
    " 2>/dev/null || true
fi

# Write to log file
LOG_FILE="${ORCH_DIR}/logs/$(date +%Y-%m-%d).log"
echo "[$(date -Iseconds)] [INFO] [session_started] Session $CLAUDE_SESSION_ID started with agent $CLAUDE_AGENT_ID" >> "$LOG_FILE"

# Export environment for child processes
echo "export CLAUDE_SESSION_ID='$CLAUDE_SESSION_ID'" > "${ORCH_DIR}/.session_env"
echo "export CLAUDE_AGENT_ID='$CLAUDE_AGENT_ID'" >> "${ORCH_DIR}/.session_env"

echo -e "${GREEN}[Orchestration] Ready${NC}"
echo ""

# Output session info for Claude to see
echo "Session ID: $CLAUDE_SESSION_ID"
echo "Agent ID: $CLAUDE_AGENT_ID"
