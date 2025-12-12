#!/bin/bash
# Golden Armada Orchestration CLI
# Wrapper script for common orchestration operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="${SCRIPT_DIR}/db/agents.db"
PYTHON_SCRIPT="${SCRIPT_DIR}/orchestrator.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize database if it doesn't exist
init_db() {
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${BLUE}Initializing database...${NC}"
        mkdir -p "$(dirname "$DB_PATH")"
        sqlite3 "$DB_PATH" < "${SCRIPT_DIR}/db/schema.sql"
        echo -e "${GREEN}Database initialized at ${DB_PATH}${NC}"
    fi
}

# Show agent status
status() {
    init_db
    echo -e "${BLUE}=== Agent Status ===${NC}"

    echo -e "\n${YELLOW}Active Agents:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT id, name, type, status, datetime(last_active_at, 'localtime') as last_active
        FROM agents
        WHERE status IN ('idle', 'running')
        ORDER BY last_active_at DESC
        LIMIT 10;
    "

    echo -e "\n${YELLOW}Active Sessions:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT id, name, pattern, status, datetime(started_at, 'localtime') as started
        FROM sessions
        WHERE status = 'active'
        ORDER BY started_at DESC
        LIMIT 5;
    "

    echo -e "\n${YELLOW}Running Tasks:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT t.id, t.title, a.name as agent, t.priority,
               datetime(t.started_at, 'localtime') as started
        FROM tasks t
        LEFT JOIN agents a ON t.agent_id = a.id
        WHERE t.status = 'running'
        ORDER BY t.started_at DESC
        LIMIT 10;
    "

    echo -e "\n${YELLOW}Pending Tasks:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT id, title, priority, datetime(created_at, 'localtime') as created
        FROM tasks
        WHERE status = 'pending'
        ORDER BY priority, created_at
        LIMIT 10;
    "
}

# Show recent logs
logs() {
    local limit=${1:-50}
    local agent_filter=${2:-""}

    init_db
    echo -e "${BLUE}=== Recent Activity Logs ===${NC}\n"

    if [ -n "$agent_filter" ]; then
        sqlite3 -header -column "$DB_PATH" "
            SELECT datetime(timestamp, 'localtime') as time, level, action, message
            FROM activity_log
            WHERE agent_id = '$agent_filter'
            ORDER BY timestamp DESC
            LIMIT $limit;
        "
    else
        sqlite3 -header -column "$DB_PATH" "
            SELECT datetime(timestamp, 'localtime') as time, level, action,
                   substr(message, 1, 60) as message
            FROM activity_log
            ORDER BY timestamp DESC
            LIMIT $limit;
        "
    fi
}

# Show active locks
locks() {
    init_db
    echo -e "${BLUE}=== Active Locks ===${NC}\n"

    sqlite3 -header -column "$DB_PATH" "
        SELECT resource_id, resource_type, owner_agent_id,
               datetime(acquired_at, 'localtime') as acquired,
               datetime(expires_at, 'localtime') as expires
        FROM locks
        WHERE expires_at > datetime('now')
        ORDER BY acquired_at DESC;
    "
}

# Show messages
messages() {
    local channel=${1:-"all"}
    local limit=${2:-20}

    init_db
    echo -e "${BLUE}=== Messages (${channel}) ===${NC}\n"

    if [ "$channel" = "all" ]; then
        sqlite3 -header -column "$DB_PATH" "
            SELECT channel, message_type, sender_id,
                   substr(body, 1, 50) as body,
                   datetime(created_at, 'localtime') as sent
            FROM messages
            ORDER BY created_at DESC
            LIMIT $limit;
        "
    else
        sqlite3 -header -column "$DB_PATH" "
            SELECT message_type, sender_id, recipient_id,
                   substr(body, 1, 50) as body,
                   datetime(created_at, 'localtime') as sent
            FROM messages
            WHERE channel = '$channel'
            ORDER BY created_at DESC
            LIMIT $limit;
        "
    fi
}

# Show checkpoints
checkpoints() {
    local limit=${1:-20}

    init_db
    echo -e "${BLUE}=== Checkpoints ===${NC}\n"

    sqlite3 -header -column "$DB_PATH" "
        SELECT id, checkpoint_type, agent_id, task_id,
               datetime(created_at, 'localtime') as created
        FROM checkpoints
        ORDER BY created_at DESC
        LIMIT $limit;
    "
}

# Cleanup old data
cleanup() {
    init_db
    echo -e "${YELLOW}Cleaning up old data...${NC}"

    # Remove expired locks
    sqlite3 "$DB_PATH" "DELETE FROM locks WHERE expires_at < datetime('now');"
    echo -e "  ${GREEN}✓${NC} Expired locks removed"

    # Remove old messages (24h)
    sqlite3 "$DB_PATH" "DELETE FROM messages WHERE created_at < datetime('now', '-1 day');"
    echo -e "  ${GREEN}✓${NC} Old messages removed"

    # Remove old checkpoints (7 days, keep max 100)
    sqlite3 "$DB_PATH" "DELETE FROM checkpoints WHERE created_at < datetime('now', '-7 days');"
    sqlite3 "$DB_PATH" "DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT 100);"
    echo -e "  ${GREEN}✓${NC} Old checkpoints removed"

    # Remove old activity logs (30 days)
    sqlite3 "$DB_PATH" "DELETE FROM activity_log WHERE timestamp < datetime('now', '-30 days');"
    echo -e "  ${GREEN}✓${NC} Old activity logs removed"

    # Vacuum database
    sqlite3 "$DB_PATH" "VACUUM;"
    echo -e "  ${GREEN}✓${NC} Database vacuumed"

    echo -e "${GREEN}Cleanup complete!${NC}"
}

# Release stuck locks
release_locks() {
    local agent_id=$1

    if [ -z "$agent_id" ]; then
        echo -e "${RED}Usage: $0 release-locks <agent_id>${NC}"
        exit 1
    fi

    init_db
    echo -e "${YELLOW}Releasing locks for agent: $agent_id${NC}"

    sqlite3 "$DB_PATH" "DELETE FROM locks WHERE owner_agent_id = '$agent_id';"
    echo -e "${GREEN}Locks released${NC}"
}

# Show metrics summary
metrics() {
    init_db
    echo -e "${BLUE}=== Metrics Summary ===${NC}\n"

    echo -e "${YELLOW}Task Statistics:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT
            status,
            COUNT(*) as count,
            AVG(CASE
                WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
                THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
                ELSE NULL
            END) as avg_duration_minutes
        FROM tasks
        GROUP BY status;
    "

    echo -e "\n${YELLOW}Agent Activity:${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT
            agent_id,
            COUNT(*) as activities,
            MAX(datetime(timestamp, 'localtime')) as last_activity
        FROM activity_log
        WHERE timestamp > datetime('now', '-1 hour')
        GROUP BY agent_id
        ORDER BY activities DESC
        LIMIT 10;
    "

    echo -e "\n${YELLOW}Error Rate (last hour):${NC}"
    sqlite3 -header -column "$DB_PATH" "
        SELECT
            level,
            COUNT(*) as count
        FROM activity_log
        WHERE timestamp > datetime('now', '-1 hour')
        GROUP BY level;
    "
}

# Main command dispatcher
case "${1:-help}" in
    init)
        init_db
        echo -e "${GREEN}Orchestration system initialized${NC}"
        ;;
    status)
        status
        ;;
    logs)
        logs "${2:-50}" "$3"
        ;;
    locks)
        locks
        ;;
    messages)
        messages "${2:-all}" "${3:-20}"
        ;;
    checkpoints)
        checkpoints "${2:-20}"
        ;;
    cleanup)
        cleanup
        ;;
    release-locks)
        release_locks "$2"
        ;;
    metrics)
        metrics
        ;;
    help|*)
        echo -e "${BLUE}Golden Armada Orchestration CLI${NC}"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init                Initialize the orchestration database"
        echo "  status              Show current agent and task status"
        echo "  logs [limit] [agent]  Show recent activity logs"
        echo "  locks               Show active resource locks"
        echo "  messages [channel] [limit]  Show messages (all|broadcast|direct)"
        echo "  checkpoints [limit] Show recent checkpoints"
        echo "  cleanup             Clean up old data"
        echo "  release-locks <id>  Release all locks for an agent"
        echo "  metrics             Show metrics summary"
        echo "  help                Show this help message"
        ;;
esac
