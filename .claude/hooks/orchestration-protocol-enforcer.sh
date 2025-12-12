#!/bin/bash
# Orchestration Protocol Enforcement Hook
# Ensures CLAUDE.md mandatory orchestration protocol is followed
# VERSION: 1.0.0

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${SCRIPT_DIR}/.."
ORCH_DIR="${CLAUDE_DIR}/orchestration"

# Orchestration Protocol Requirements (from CLAUDE.md)
MIN_SUB_AGENTS=3
MAX_SUB_AGENTS=13
MANDATORY_PHASES=("explore" "plan" "code" "test" "fix" "document")

# Violation tracking
VIOLATIONS_FILE="${ORCH_DIR}/state/protocol_violations.log"
mkdir -p "$(dirname "$VIOLATIONS_FILE")"

# Log violation
log_violation() {
    local violation_type="$1"
    local details="$2"
    local severity="${3:-ERROR}"
    local timestamp=$(date -Iseconds)

    echo "[$timestamp] [$severity] [$violation_type] $details" >> "$VIOLATIONS_FILE"

    # Also log to orchestration DB
    if [ -f "${ORCH_DIR}/db/agents.db" ]; then
        sqlite3 "${ORCH_DIR}/db/agents.db" "
            INSERT INTO activity_log (action, category, level, message)
            VALUES ('protocol_violation', 'orchestration', '$severity',
                    '[$violation_type] $details');
        " 2>/dev/null || true
    fi

    echo "[${severity}] PROTOCOL VIOLATION: $violation_type"
    echo "Details: $details"
}

# Validate sub-agent count
validate_sub_agent_count() {
    local count="$1"
    local task_description="${2:-unknown task}"

    echo "[Protocol] Validating sub-agent count: $count"

    if [ "$count" -lt "$MIN_SUB_AGENTS" ]; then
        log_violation "SUB_AGENT_COUNT_LOW" \
            "Task '$task_description' uses $count agents (minimum: $MIN_SUB_AGENTS)" \
            "CRITICAL"
        echo ""
        echo "MANDATORY REQUIREMENT VIOLATION:"
        echo "  Task requires minimum $MIN_SUB_AGENTS sub-agents"
        echo "  Current count: $count"
        echo "  Add at least $((MIN_SUB_AGENTS - count)) more specialized agents"
        echo ""
        return 1
    fi

    if [ "$count" -gt "$MAX_SUB_AGENTS" ]; then
        log_violation "SUB_AGENT_COUNT_HIGH" \
            "Task '$task_description' uses $count agents (maximum: $MAX_SUB_AGENTS)" \
            "ERROR"
        echo ""
        echo "PROTOCOL VIOLATION:"
        echo "  Task exceeds maximum $MAX_SUB_AGENTS sub-agents"
        echo "  Current count: $count"
        echo "  Reduce by $((count - MAX_SUB_AGENTS)) agents or split into subtasks"
        echo ""
        return 1
    fi

    echo "[OK] Sub-agent count validated: $count agents"
    return 0
}

# Validate phase order
validate_phase_order() {
    local current_phase="$1"
    local next_phase="$2"

    echo "[Protocol] Validating phase transition: $current_phase → $next_phase"

    # Get phase indexes
    local current_idx=-1
    local next_idx=-1

    for i in "${!MANDATORY_PHASES[@]}"; do
        if [ "${MANDATORY_PHASES[$i]}" == "$current_phase" ]; then
            current_idx=$i
        fi
        if [ "${MANDATORY_PHASES[$i]}" == "$next_phase" ]; then
            next_idx=$i
        fi
    done

    # Check if phases are valid
    if [ "$current_idx" -eq -1 ]; then
        log_violation "INVALID_PHASE" "Invalid current phase: $current_phase" "ERROR"
        return 1
    fi

    if [ "$next_idx" -eq -1 ]; then
        log_violation "INVALID_PHASE" "Invalid next phase: $next_phase" "ERROR"
        return 1
    fi

    # Check if skipping phases (not allowed except for fix phase)
    if [ "$next_idx" -gt $((current_idx + 1)) ] && [ "$next_phase" != "fix" ]; then
        log_violation "PHASE_SKIPPED" \
            "Cannot skip from $current_phase to $next_phase (missing: ${MANDATORY_PHASES[$((current_idx + 1))]})" \
            "CRITICAL"
        echo ""
        echo "MANDATORY PROTOCOL VIOLATION:"
        echo "  Cannot skip phases in the orchestration protocol"
        echo "  Current phase: $current_phase"
        echo "  Attempted phase: $next_phase"
        echo "  Next valid phase: ${MANDATORY_PHASES[$((current_idx + 1))]}"
        echo ""
        echo "Required phase sequence:"
        echo "  ${MANDATORY_PHASES[*]}"
        echo ""
        return 1
    fi

    echo "[OK] Phase transition validated"
    return 0
}

# Enforce testing before completion
enforce_testing() {
    local current_phase="$1"
    local next_action="${2:-continue}"

    if [ "$next_action" == "complete" ] || [ "$next_action" == "done" ]; then
        echo "[Protocol] Checking if tests were run before completion..."

        # Check if test phase was completed
        local test_completed=false
        if [ -f "${ORCH_DIR}/state/current_phase.json" ]; then
            # Check phase history
            if grep -q '"test"' "${ORCH_DIR}/state/current_phase.json" 2>/dev/null; then
                test_completed=true
            fi
        fi

        if [ "$test_completed" != "true" ] && [ "$current_phase" != "test" ]; then
            log_violation "NO_TESTS_RUN" \
                "Attempting to complete without running tests (current phase: $current_phase)" \
                "CRITICAL"
            echo ""
            echo "MANDATORY PROTOCOL VIOLATION:"
            echo "  Cannot mark task complete without TEST phase"
            echo "  Current phase: $current_phase"
            echo "  Required: Must complete TEST phase before DOCUMENT phase"
            echo ""
            echo "Next steps:"
            echo "  1. Transition to TEST phase"
            echo "  2. Run all unit and integration tests"
            echo "  3. Fix any failing tests (FIX phase)"
            echo "  4. Only then proceed to DOCUMENT phase"
            echo ""
            return 1
        fi

        echo "[OK] Testing requirements satisfied"
    fi

    return 0
}

# Enforce documentation phase
enforce_documentation() {
    local current_phase="$1"
    local files_changed="${2:-0}"

    if [ "$current_phase" == "code" ] || [ "$current_phase" == "fix" ]; then
        if [ "$files_changed" -gt 0 ]; then
            echo "[Protocol] Code changes detected - documentation phase required"

            # Check if DOCUMENT phase is planned
            if [ -f "${ORCH_DIR}/state/next_steps.json" ]; then
                if ! grep -q "document" "${ORCH_DIR}/state/next_steps.json" 2>/dev/null; then
                    log_violation "NO_DOCUMENTATION_PLANNED" \
                        "Code changes made but DOCUMENT phase not in next steps" \
                        "WARNING"
                    echo "[WARNING] Add DOCUMENT phase to update Obsidian vault"
                fi
            fi
        fi
    fi

    return 0
}

# Validate context preservation
validate_context_preservation() {
    local phase_transition="$1"

    echo "[Protocol] Validating context preservation across phases..."

    # Check if context file exists
    if [ ! -f "${ORCH_DIR}/state/context_preservation.json" ]; then
        log_violation "NO_CONTEXT_PRESERVATION" \
            "Context not preserved during phase transition: $phase_transition" \
            "ERROR"
        echo "[ERROR] Context preservation required between phases"
        return 1
    fi

    # Check if next steps are tracked
    if [ ! -f "${ORCH_DIR}/state/next_steps.json" ]; then
        log_violation "NO_NEXT_STEPS" \
            "Next steps not tracked for phase: $phase_transition" \
            "WARNING"
        echo "[WARNING] Next steps should be tracked for context continuity"
    fi

    echo "[OK] Context preservation validated"
    return 0
}

# Pre-task enforcement
pre_task_enforcement() {
    local task_description="$1"
    local agent_count="${2:-0}"
    local starting_phase="${3:-explore}"

    echo "=== Orchestration Protocol Pre-Task Enforcement ==="
    echo "Task: $task_description"
    echo "Agents: $agent_count"
    echo "Starting Phase: $starting_phase"
    echo ""

    local violations=0

    # Validate sub-agent count
    if [ "$agent_count" -gt 0 ]; then
        validate_sub_agent_count "$agent_count" "$task_description" || ((violations++))
    else
        echo "[WARNING] Agent count not specified - cannot validate"
    fi

    # Validate starting phase
    local valid_start=false
    for phase in "${MANDATORY_PHASES[@]}"; do
        if [ "$phase" == "$starting_phase" ]; then
            valid_start=true
            break
        fi
    done

    if [ "$valid_start" != "true" ]; then
        log_violation "INVALID_START_PHASE" \
            "Invalid starting phase: $starting_phase" \
            "ERROR"
        ((violations++))
    fi

    # Check if phase tracking is initialized
    if [ ! -f "${ORCH_DIR}/state/current_phase.json" ]; then
        echo "[INFO] Initializing phase tracking..."
        bash "${SCRIPT_DIR}/orchestration-hooks.sh" init-phases 2>/dev/null || true
    fi

    echo ""
    if [ "$violations" -gt 0 ]; then
        echo "[FAILED] Pre-task enforcement failed with $violations violation(s)"
        echo "Review protocol requirements in CLAUDE.md"
        return 1
    else
        echo "[PASSED] All pre-task protocol checks passed"
        return 0
    fi
}

# Post-task enforcement
post_task_enforcement() {
    local task_description="$1"
    local final_phase="${2:-unknown}"
    local status="${3:-completed}"

    echo "=== Orchestration Protocol Post-Task Enforcement ==="
    echo "Task: $task_description"
    echo "Final Phase: $final_phase"
    echo "Status: $status"
    echo ""

    local violations=0

    # If status is "completed", ensure all phases were executed
    if [ "$status" == "completed" ] || [ "$status" == "success" ]; then
        # Check if DOCUMENT phase was completed
        if [ "$final_phase" != "document" ]; then
            log_violation "INCOMPLETE_PHASES" \
                "Task marked complete but final phase is $final_phase (expected: document)" \
                "ERROR"
            ((violations++))
        fi

        # Verify TEST phase was executed
        enforce_testing "$final_phase" "complete" || ((violations++))
    fi

    echo ""
    if [ "$violations" -gt 0 ]; then
        echo "[FAILED] Post-task enforcement failed with $violations violation(s)"
        return 1
    else
        echo "[PASSED] All post-task protocol checks passed"
        return 0
    fi
}

# Generate protocol compliance report
generate_compliance_report() {
    echo "=============================================="
    echo "  ORCHESTRATION PROTOCOL COMPLIANCE REPORT"
    echo "=============================================="
    echo "Report generated: $(date -Iseconds)"
    echo ""

    # Count violations
    if [ -f "$VIOLATIONS_FILE" ]; then
        local total_violations=$(wc -l < "$VIOLATIONS_FILE")
        local critical_violations=$(grep -c "CRITICAL" "$VIOLATIONS_FILE" || echo "0")
        local errors=$(grep -c "ERROR" "$VIOLATIONS_FILE" || echo "0")
        local warnings=$(grep -c "WARNING" "$VIOLATIONS_FILE" || echo "0")

        echo "Total Violations: $total_violations"
        echo "  Critical: $critical_violations"
        echo "  Errors: $errors"
        echo "  Warnings: $warnings"
        echo ""

        if [ "$total_violations" -gt 0 ]; then
            echo "Recent violations:"
            tail -10 "$VIOLATIONS_FILE"
            echo ""
        fi

        # Compliance score
        local compliance_pct=$((100 - critical_violations * 10 - errors * 5))
        if [ "$compliance_pct" -lt 0 ]; then
            compliance_pct=0
        fi

        echo "Compliance Score: ${compliance_pct}%"

        if [ "$compliance_pct" -lt 70 ]; then
            echo "Status: NON-COMPLIANT (action required)"
        elif [ "$compliance_pct" -lt 90 ]; then
            echo "Status: PARTIAL COMPLIANCE (improvements needed)"
        else
            echo "Status: COMPLIANT"
        fi
    else
        echo "No violations recorded"
        echo "Compliance Score: 100%"
        echo "Status: COMPLIANT"
    fi

    echo ""
    echo "Protocol Requirements:"
    echo "  Sub-Agents: ${MIN_SUB_AGENTS}-${MAX_SUB_AGENTS} per task"
    echo "  Mandatory Phases: ${MANDATORY_PHASES[*]}"
    echo "  Phase Order: MUST be sequential (no skipping)"
    echo "  Testing: REQUIRED before completion"
    echo "  Documentation: REQUIRED in Obsidian vault"
    echo "=============================================="
}

# Main dispatcher
case "${1:-status}" in
    validate-agents)
        validate_sub_agent_count "$2" "$3"
        ;;
    validate-phase)
        validate_phase_order "$2" "$3"
        ;;
    enforce-testing)
        enforce_testing "$2" "$3"
        ;;
    enforce-docs)
        enforce_documentation "$2" "$3"
        ;;
    validate-context)
        validate_context_preservation "$2"
        ;;
    pre-task)
        pre_task_enforcement "$2" "$3" "$4"
        ;;
    post-task)
        post_task_enforcement "$2" "$3" "$4"
        ;;
    report)
        generate_compliance_report
        ;;
    clear-violations)
        if [ -f "$VIOLATIONS_FILE" ]; then
            mv "$VIOLATIONS_FILE" "${VIOLATIONS_FILE}.bak"
            echo "Violations cleared (backup created)"
        fi
        ;;
    status)
        echo "Orchestration Protocol Enforcer v1.0.0"
        echo ""
        echo "Configuration:"
        echo "  Min Sub-Agents: $MIN_SUB_AGENTS"
        echo "  Max Sub-Agents: $MAX_SUB_AGENTS"
        echo "  Mandatory Phases: ${MANDATORY_PHASES[*]}"
        echo ""
        generate_compliance_report
        ;;
    *)
        echo "Orchestration Protocol Enforcer v1.0.0"
        echo "Usage: $0 <command> [args...]"
        echo ""
        echo "Commands:"
        echo "  validate-agents <count> <task>  - Validate sub-agent count"
        echo "  validate-phase <current> <next> - Validate phase transition"
        echo "  enforce-testing <phase> <action> - Enforce testing requirement"
        echo "  enforce-docs <phase> <files>    - Enforce documentation"
        echo "  validate-context <transition>   - Validate context preservation"
        echo "  pre-task <task> <agents> <phase> - Pre-task enforcement"
        echo "  post-task <task> <phase> <status> - Post-task enforcement"
        echo "  report                          - Compliance report"
        echo "  clear-violations                - Clear violation log"
        echo "  status                          - Show current status"
        echo ""
        echo "Protocol Requirements (from CLAUDE.md):"
        echo "  • ${MIN_SUB_AGENTS}-${MAX_SUB_AGENTS} sub-agents per task"
        echo "  • Phases: ${MANDATORY_PHASES[*]}"
        echo "  • Sequential phase execution (no skipping)"
        echo "  • Testing required before completion"
        echo "  • Documentation in Obsidian vault"
        ;;
esac
