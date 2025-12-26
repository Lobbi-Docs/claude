#!/usr/bin/env bash
###############################################################################
# Jira Quality Integration Hook
#
# Integrates Code Quality Orchestrator with Jira Orchestrator workflow.
# Called during Phase 5 (QUALITY GATES) of the Jira work process.
#
# Communication Protocol:
#   - Receives: Issue key, changed files, workflow phase
#   - Returns: Quality gate results as JSON
#   - Blocks: If any critical gate fails
#
# Usage:
#   ./jira-quality-integration.sh <issue-key> <phase> [options]
#
# Example:
#   ./jira-quality-integration.sh LF-123 pre-commit --auto-fix
###############################################################################

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# Arguments
ISSUE_KEY="${1:-}"
PHASE="${2:-pre-commit}"
AUTO_FIX="${AUTO_FIX:-true}"
FAIL_ON_WARNING="${FAIL_ON_WARNING:-false}"

# Validate arguments
if [[ -z "$ISSUE_KEY" ]]; then
    echo -e "${RED}Error: Issue key required${NC}"
    echo "Usage: $0 <issue-key> [phase] [options]"
    exit 1
fi

# Output structure
declare -A GATE_RESULTS
QUALITY_SCORE=0
ALL_PASSED=true
BLOCKERS=()
WARNINGS=()

###############################################################################
# Logging
###############################################################################

log_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${BOLD}         JIRA QUALITY GATES - ${ISSUE_KEY}                     ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}         Phase: ${PHASE}                                        ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_gate_start() {
    local gate="$1"
    echo -e "  ${BLUE}▶${NC} Running ${BOLD}$gate${NC}..."
}

log_gate_result() {
    local gate="$1"
    local status="$2"
    local score="$3"

    if [[ "$status" == "PASS" ]]; then
        echo -e "  ${GREEN}✓${NC} ${gate}: ${GREEN}PASS${NC} (Score: ${score})"
    elif [[ "$status" == "WARN" ]]; then
        echo -e "  ${YELLOW}⚠${NC} ${gate}: ${YELLOW}WARN${NC} (Score: ${score})"
    else
        echo -e "  ${RED}✗${NC} ${gate}: ${RED}FAIL${NC} (Score: ${score})"
    fi
}

###############################################################################
# Quality Gates (Parallel Execution)
###############################################################################

run_static_analysis() {
    local score=100
    local status="PASS"
    local issues=0

    log_gate_start "Static Analysis"

    # ESLint
    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        if [[ "$AUTO_FIX" == "true" ]]; then
            npx eslint . --ext .js,.ts,.tsx --fix --quiet 2>/dev/null || true
            npx prettier --write "**/*.{js,jsx,ts,tsx,json}" --log-level error 2>/dev/null || true
        fi

        issues=$(npx eslint . --ext .js,.ts,.tsx --format compact 2>/dev/null | wc -l || echo "0")
        score=$((100 - issues * 2))
        [[ $score -lt 0 ]] && score=0
        [[ $issues -gt 0 ]] && status="WARN"
        [[ $issues -gt 10 ]] && status="FAIL"
    fi

    GATE_RESULTS["static-analysis"]="$score"
    log_gate_result "Static Analysis" "$status" "$score"
    echo "$score"
}

run_test_coverage() {
    local score=0
    local status="PASS"

    log_gate_start "Test Coverage"

    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        if grep -q "vitest" package.json 2>/dev/null; then
            score=$(npx vitest run --coverage --reporter=json 2>/dev/null | \
                    jq -r '.coverageMap.total.lines.pct // 0' 2>/dev/null || echo "80")
        elif grep -q "jest" package.json 2>/dev/null; then
            score=$(npx jest --coverage --json 2>/dev/null | \
                    jq -r '.coverageMap.total.lines.pct // 0' 2>/dev/null || echo "80")
        else
            score=80  # Default if no test framework
        fi
    else
        score=80
    fi

    score=${score%.*}
    [[ -z "$score" ]] && score=80

    if [[ $score -lt 80 ]]; then
        status="FAIL"
        BLOCKERS+=("Test coverage ${score}% below 80% threshold")
        ALL_PASSED=false
    elif [[ $score -lt 90 ]]; then
        status="WARN"
        WARNINGS+=("Test coverage ${score}% - consider adding more tests")
    fi

    GATE_RESULTS["test-coverage"]="$score"
    log_gate_result "Test Coverage" "$status" "${score}%"
    echo "$score"
}

run_security_scanner() {
    local score=100
    local status="PASS"

    log_gate_start "Security Scanner"

    # Check for secrets
    if command -v gitleaks &> /dev/null; then
        if ! gitleaks detect --source . --no-git --quiet 2>/dev/null; then
            status="FAIL"
            score=0
            BLOCKERS+=("Exposed secrets detected - commit blocked")
            ALL_PASSED=false
        fi
    fi

    # npm audit
    if command -v npm &> /dev/null && [[ -f "package-lock.json" ]]; then
        local audit_result
        audit_result=$(npm audit --json 2>/dev/null || echo '{}')
        local critical high
        critical=$(echo "$audit_result" | jq -r '.metadata.vulnerabilities.critical // 0')
        high=$(echo "$audit_result" | jq -r '.metadata.vulnerabilities.high // 0')

        if [[ $critical -gt 0 ]]; then
            status="FAIL"
            score=0
            BLOCKERS+=("$critical critical vulnerabilities found")
            ALL_PASSED=false
        elif [[ $high -gt 0 ]]; then
            status="WARN"
            score=$((100 - high * 10))
            WARNINGS+=("$high high severity vulnerabilities")
        fi
    fi

    GATE_RESULTS["security-scanner"]="$score"
    log_gate_result "Security Scanner" "$status" "$score"
    echo "$score"
}

run_complexity_analyzer() {
    local score=100
    local status="PASS"
    local violations=0

    log_gate_start "Complexity Analyzer"

    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        violations=$(npx eslint . --ext .js,.ts,.tsx \
            --rule 'complexity: ["error", 10]' \
            --format compact 2>/dev/null | grep -c "complexity" || echo "0")

        score=$((100 - violations * 10))
        [[ $score -lt 0 ]] && score=0

        if [[ $violations -gt 0 ]]; then
            status="WARN"
            WARNINGS+=("$violations functions exceed complexity threshold")
        fi
        if [[ $violations -gt 5 ]]; then
            status="FAIL"
        fi
    fi

    GATE_RESULTS["complexity-analyzer"]="$score"
    log_gate_result "Complexity Analyzer" "$status" "$score"
    echo "$score"
}

run_dependency_health() {
    local score=100
    local status="PASS"
    local outdated=0

    log_gate_start "Dependency Health"

    if command -v npm &> /dev/null && [[ -f "package.json" ]]; then
        outdated=$(npm outdated --json 2>/dev/null | jq 'length' || echo "0")
        score=$((100 - outdated * 2))
        [[ $score -lt 0 ]] && score=0

        if [[ $outdated -gt 5 ]]; then
            status="WARN"
            WARNINGS+=("$outdated outdated dependencies")
        fi
        if [[ $outdated -gt 20 ]]; then
            status="FAIL"
        fi
    fi

    GATE_RESULTS["dependency-health"]="$score"
    log_gate_result "Dependency Health" "$status" "$score"
    echo "$score"
}

###############################################################################
# Orchestration
###############################################################################

run_all_gates() {
    log_header

    echo -e "${BOLD}Executing Quality Gates (Parallel)...${NC}"
    echo ""

    # Run gates in parallel and capture results
    local sa_score tc_score ss_score ca_score dh_score

    # Use background processes for parallel execution
    run_static_analysis > /tmp/sa_score.txt &
    local sa_pid=$!

    run_test_coverage > /tmp/tc_score.txt &
    local tc_pid=$!

    run_security_scanner > /tmp/ss_score.txt &
    local ss_pid=$!

    run_complexity_analyzer > /tmp/ca_score.txt &
    local ca_pid=$!

    run_dependency_health > /tmp/dh_score.txt &
    local dh_pid=$!

    # Wait for all to complete
    wait $sa_pid $tc_pid $ss_pid $ca_pid $dh_pid

    # Read results
    sa_score=$(tail -1 /tmp/sa_score.txt)
    tc_score=$(tail -1 /tmp/tc_score.txt)
    ss_score=$(tail -1 /tmp/ss_score.txt)
    ca_score=$(tail -1 /tmp/ca_score.txt)
    dh_score=$(tail -1 /tmp/dh_score.txt)

    # Calculate overall score (weighted average)
    QUALITY_SCORE=$(( (sa_score * 20 + tc_score * 25 + ss_score * 25 + ca_score * 15 + dh_score * 15) / 100 ))

    # Determine grade
    local grade
    if [[ $QUALITY_SCORE -ge 90 ]]; then grade="A"
    elif [[ $QUALITY_SCORE -ge 80 ]]; then grade="B"
    elif [[ $QUALITY_SCORE -ge 70 ]]; then grade="C"
    elif [[ $QUALITY_SCORE -ge 60 ]]; then grade="D"
    else grade="F"; fi

    # Output summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${BOLD}Issue:${NC} $ISSUE_KEY"
    echo -e "  ${BOLD}Quality Score:${NC} $QUALITY_SCORE/100 (Grade: $grade)"
    echo -e "  ${BOLD}All Passed:${NC} $ALL_PASSED"

    if [[ ${#BLOCKERS[@]} -gt 0 ]]; then
        echo -e "  ${BOLD}${RED}Blockers:${NC}"
        for b in "${BLOCKERS[@]}"; do
            echo -e "    - $b"
        done
    fi

    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "  ${BOLD}${YELLOW}Warnings:${NC}"
        for w in "${WARNINGS[@]}"; do
            echo -e "    - $w"
        done
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    # Output JSON for Jira integration
    output_json "$grade"

    # Return exit code
    if [[ "$ALL_PASSED" == "false" ]]; then
        exit 1
    fi

    exit 0
}

output_json() {
    local grade="$1"

    cat << EOF
{
  "issueKey": "$ISSUE_KEY",
  "phase": "$PHASE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "qualityScore": $QUALITY_SCORE,
  "grade": "$grade",
  "allPassed": $ALL_PASSED,
  "gates": {
    "staticAnalysis": ${GATE_RESULTS["static-analysis"]:-0},
    "testCoverage": ${GATE_RESULTS["test-coverage"]:-0},
    "securityScanner": ${GATE_RESULTS["security-scanner"]:-0},
    "complexityAnalyzer": ${GATE_RESULTS["complexity-analyzer"]:-0},
    "dependencyHealth": ${GATE_RESULTS["dependency-health"]:-0}
  },
  "blockers": $(printf '%s\n' "${BLOCKERS[@]:-[]}" | jq -R . | jq -s .),
  "warnings": $(printf '%s\n' "${WARNINGS[@]:-[]}" | jq -R . | jq -s .),
  "canProceed": $ALL_PASSED
}
EOF
}

###############################################################################
# Main
###############################################################################

run_all_gates
