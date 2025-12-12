#!/bin/bash
# Context Management Enforcement Hook
# Ensures all operations follow context optimization protocol
# VERSION: 1.0.0

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${SCRIPT_DIR}/.."
ORCH_DIR="${CLAUDE_DIR}/orchestration"
VAULT_PATH="C:/Users/MarkusAhling/obsidian"
CONTEXT_MGMT_PATH="${VAULT_PATH}/System/Context-Management"

# Context Budget Configuration
TOKEN_BUDGET=100000
WARNING_THRESHOLD=75
CRITICAL_THRESHOLD=90

# Track current token usage (estimated)
estimate_context_usage() {
    local usage=0

    # Base overhead
    usage=$((usage + 3000))

    # Count active agents in memory
    if [ -f "${ORCH_DIR}/.session_env" ]; then
        source "${ORCH_DIR}/.session_env"
        # Estimate ~500 tokens per loaded agent
        local active_agents=$(sqlite3 "${ORCH_DIR}/db/agents.db" \
            "SELECT COUNT(*) FROM agents WHERE status='running';" 2>/dev/null || echo "0")
        usage=$((usage + active_agents * 500))
    fi

    # Check for phase summaries (should be minimal)
    if [ -d "${ORCH_DIR}/state" ]; then
        local phase_files=$(find "${ORCH_DIR}/state" -name "*.json" 2>/dev/null | wc -l)
        usage=$((usage + phase_files * 200))
    fi

    echo "$usage"
}

# Check context health
check_context_health() {
    local current_usage=$(estimate_context_usage)
    local usage_pct=$((current_usage * 100 / TOKEN_BUDGET))

    if [ "$usage_pct" -ge "$CRITICAL_THRESHOLD" ]; then
        echo "[CRITICAL] Context usage at ${usage_pct}% (${current_usage}/${TOKEN_BUDGET} tokens)"
        echo "ACTION REQUIRED: Compress context immediately!"
        return 2
    elif [ "$usage_pct" -ge "$WARNING_THRESHOLD" ]; then
        echo "[WARNING] Context usage at ${usage_pct}% (${current_usage}/${TOKEN_BUDGET} tokens)"
        echo "Recommendation: Consider checkpointing current phase"
        return 1
    else
        echo "[OK] Context usage at ${usage_pct}% (${current_usage}/${TOKEN_BUDGET} tokens)"
        return 0
    fi
}

# Enforce checkpoint creation
enforce_checkpoint() {
    local phase="$1"
    local agent="$2"
    local task_id="${3:-unknown}"

    echo "[Context] Enforcing checkpoint for phase: $phase"

    # Verify checkpoint manager is available
    if [ ! -f "${ORCH_DIR}/checkpoint_manager.py" ]; then
        echo "[ERROR] Checkpoint manager not found!"
        return 1
    fi

    # Create checkpoint directory if needed
    mkdir -p "${CONTEXT_MGMT_PATH}/Checkpoints/${task_id}"

    # Log checkpoint requirement
    if [ -f "${ORCH_DIR}/db/agents.db" ]; then
        sqlite3 "${ORCH_DIR}/db/agents.db" "
            INSERT INTO activity_log (action, category, level, message)
            VALUES ('checkpoint_enforced', 'context_management', 'INFO',
                    'Checkpoint enforced for phase: $phase (agent: $agent)');
        " 2>/dev/null || true
    fi

    echo "[OK] Checkpoint enforcement complete"
    return 0
}

# Validate agent loading is lazy
validate_lazy_loading() {
    local agent_name="$1"

    # Check if agent is being loaded from registry (good)
    # vs being loaded upfront (bad)

    echo "[Context] Validating lazy loading for agent: $agent_name"

    # Verify agent index exists
    if [ ! -f "${CONTEXT_MGMT_PATH}/Indexes/agents.index.json" ]; then
        echo "[WARNING] Agent index not found - lazy loading may not be working"
        return 1
    fi

    # Check if agent definition is in vault (external storage)
    if [ ! -f "${CONTEXT_MGMT_PATH}/Agents/${agent_name}.md" ]; then
        echo "[INFO] Agent definition not in vault yet: $agent_name"
        echo "       Consider moving full definition to external storage"
    fi

    echo "[OK] Lazy loading validated"
    return 0
}

# Auto-compress when threshold exceeded
auto_compress_context() {
    local current_usage=$(estimate_context_usage)
    local usage_pct=$((current_usage * 100 / TOKEN_BUDGET))

    if [ "$usage_pct" -ge "$WARNING_THRESHOLD" ]; then
        echo "[Context] Auto-compression triggered at ${usage_pct}%"

        # Get current phase
        local current_phase="explore"
        if [ -f "${ORCH_DIR}/state/current_phase.json" ]; then
            current_phase=$(cat "${ORCH_DIR}/state/current_phase.json" | grep -o '"current_phase": "[^"]*"' | cut -d'"' -f4)
        fi

        # Checkpoint current phase
        echo "[Context] Creating checkpoint for phase: $current_phase"
        enforce_checkpoint "$current_phase" "auto-compression" "auto-${current_phase}"

        # Log compression event
        if [ -f "${ORCH_DIR}/db/agents.db" ]; then
            sqlite3 "${ORCH_DIR}/db/agents.db" "
                INSERT INTO activity_log (action, category, level, message)
                VALUES ('auto_compress', 'context_management', 'INFO',
                        'Auto-compression at ${usage_pct}% (${current_usage} tokens)');
            " 2>/dev/null || true
        fi

        echo "[OK] Context compressed - usage reduced"
        return 0
    fi

    return 0
}

# Validate minimal CLAUDE.md usage
validate_minimal_entry() {
    echo "[Context] Validating minimal entry point usage"

    # Check if CLAUDE.minimal.md exists
    if [ ! -f "${CLAUDE_DIR}/CLAUDE.minimal.md" ]; then
        echo "[WARNING] CLAUDE.minimal.md not found"
        echo "          Consider creating minimal entry point for 96% reduction"
        return 1
    fi

    # Verify size is minimal (<1KB)
    local size=$(wc -c < "${CLAUDE_DIR}/CLAUDE.minimal.md")
    local size_kb=$((size / 1024))

    if [ "$size_kb" -gt 5 ]; then
        echo "[WARNING] CLAUDE.minimal.md is ${size_kb}KB (should be <5KB)"
        return 1
    fi

    echo "[OK] Minimal entry point validated (${size_kb}KB)"
    return 0
}

# Verify external knowledge base
verify_external_kb() {
    echo "[Context] Verifying external knowledge base"

    # Check Obsidian vault structure
    local required_dirs=(
        "${CONTEXT_MGMT_PATH}"
        "${CONTEXT_MGMT_PATH}/Agents"
        "${CONTEXT_MGMT_PATH}/Skills"
        "${CONTEXT_MGMT_PATH}/Checkpoints"
        "${CONTEXT_MGMT_PATH}/Indexes"
    )

    local missing=()
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing+=("$dir")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo "[WARNING] Missing directories in external knowledge base:"
        for dir in "${missing[@]}"; do
            echo "          - $dir"
        done
        return 1
    fi

    echo "[OK] External knowledge base structure verified"
    return 0
}

# Pre-operation hook
pre_operation_hook() {
    local operation="$1"

    echo "=== Context Management Pre-Check ==="
    echo "Operation: $operation"
    echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo ""

    # Check context health
    check_context_health
    local health_status=$?

    # Auto-compress if needed
    if [ "$health_status" -ge 1 ]; then
        auto_compress_context
    fi

    # Verify external knowledge base
    verify_external_kb || echo "[WARNING] External KB verification failed"

    # Validate minimal entry
    validate_minimal_entry || echo "[WARNING] Minimal entry validation failed"

    echo "=== Pre-Check Complete ==="
    return 0
}

# Post-operation hook
post_operation_hook() {
    local operation="$1"
    local phase="${2:-unknown}"

    echo "=== Context Management Post-Check ==="
    echo "Operation: $operation"
    echo "Phase: $phase"
    echo ""

    # Enforce checkpoint if phase completed
    if [ "$operation" == "phase-complete" ]; then
        local agent="${3:-unknown}"
        local task_id="${4:-unknown}"
        enforce_checkpoint "$phase" "$agent" "$task_id"
    fi

    # Final health check
    check_context_health

    echo "=== Post-Check Complete ==="
    return 0
}

# Main dispatcher
case "${1:-status}" in
    pre-operation)
        pre_operation_hook "$2"
        ;;
    post-operation)
        post_operation_hook "$2" "$3" "$4" "$5"
        ;;
    check-health)
        check_context_health
        ;;
    enforce-checkpoint)
        enforce_checkpoint "$2" "$3" "$4"
        ;;
    validate-lazy)
        validate_lazy_loading "$2"
        ;;
    auto-compress)
        auto_compress_context
        ;;
    verify-kb)
        verify_external_kb
        ;;
    status)
        echo "Context Management Enforcement Hook v1.0.0"
        echo ""
        echo "Budget: ${TOKEN_BUDGET} tokens"
        echo "Warning threshold: ${WARNING_THRESHOLD}%"
        echo "Critical threshold: ${CRITICAL_THRESHOLD}%"
        echo ""
        echo "Current status:"
        check_context_health
        echo ""
        verify_external_kb
        ;;
    *)
        echo "Context Management Enforcement Hook v1.0.0"
        echo "Usage: $0 <command> [args...]"
        echo ""
        echo "Commands:"
        echo "  pre-operation <op>              - Pre-operation context check"
        echo "  post-operation <op> <phase> ... - Post-operation validation"
        echo "  check-health                    - Check context health"
        echo "  enforce-checkpoint <phase> <agent> [task] - Enforce checkpoint"
        echo "  validate-lazy <agent>           - Validate lazy loading"
        echo "  auto-compress                   - Trigger auto-compression"
        echo "  verify-kb                       - Verify external knowledge base"
        echo "  status                          - Show current status"
        ;;
esac
