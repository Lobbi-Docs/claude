#!/usr/bin/env bash
###############################################################################
# Pre-Commit Quality Gate Hook
#
# Orchestrates all 5 quality gates before allowing commit.
# Part of the Code Quality Orchestrator plugin (Curator).
#
# Gates:
#   1. Static Analysis (ESLint, Prettier, etc.)
#   2. Test Coverage (80% minimum)
#   3. Security Scanner (secrets, vulnerabilities)
#   4. Complexity Analyzer (cyclomatic ≤ 10)
#   5. Dependency Health (no critical vulns)
#
# Usage:
#   - Automatically runs on git commit
#   - Manually: .claude/plugins/code-quality-orchestrator/hooks/pre-commit-quality-gate.sh
#   - Skip: git commit --no-verify (NOT RECOMMENDED)
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

# Configuration
QUALITY_THRESHOLD=80
COVERAGE_THRESHOLD=80
COMPLEXITY_THRESHOLD=10
FAIL_ON_WARNINGS="${FAIL_ON_WARNINGS:-false}"
AUTO_FIX="${AUTO_FIX:-true}"
PARALLEL_GATES="${PARALLEL_GATES:-true}"

# Results tracking
declare -A GATE_RESULTS
declare -A GATE_SCORES
OVERALL_SCORE=0
GATES_PASSED=0
GATES_FAILED=0

###############################################################################
# Logging
###############################################################################

log_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${BOLD}                    CODE QUALITY GATES                         ${NC}${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}                     Pre-Commit Check                          ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_gate() {
    local gate="$1"
    local status="$2"
    local score="$3"
    local details="$4"

    if [[ "$status" == "PASS" ]]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}$gate${NC}: ${GREEN}PASS${NC} (Score: $score) - $details"
    elif [[ "$status" == "WARN" ]]; then
        echo -e "  ${YELLOW}⚠${NC} ${BOLD}$gate${NC}: ${YELLOW}WARN${NC} (Score: $score) - $details"
    else
        echo -e "  ${RED}✗${NC} ${BOLD}$gate${NC}: ${RED}FAIL${NC} (Score: $score) - $details"
    fi
}

log_summary() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${BOLD}Overall Quality Score:${NC} $OVERALL_SCORE/100"
    echo -e "  ${BOLD}Gates Passed:${NC} ${GREEN}$GATES_PASSED${NC} / $(( GATES_PASSED + GATES_FAILED ))"

    if [[ $GATES_FAILED -gt 0 ]]; then
        echo -e "  ${BOLD}Status:${NC} ${RED}BLOCKED${NC} - Fix issues before committing"
    else
        echo -e "  ${BOLD}Status:${NC} ${GREEN}APPROVED${NC} - Ready to commit"
    fi
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

###############################################################################
# Quality Gates
###############################################################################

gate_static_analysis() {
    local score=100
    local issues=0
    local status="PASS"

    # Check for ESLint
    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        if npx eslint . --ext .js,.ts,.tsx --quiet 2>/dev/null; then
            if [[ "$AUTO_FIX" == "true" ]]; then
                npx eslint . --ext .js,.ts,.tsx --fix --quiet 2>/dev/null || true
            fi
        else
            issues=$(npx eslint . --ext .js,.ts,.tsx --format compact 2>/dev/null | wc -l || echo "0")
            score=$((100 - issues * 2))
            [[ $score -lt 0 ]] && score=0
            status="FAIL"
        fi
    fi

    # Check for Prettier
    if command -v npx &> /dev/null && [[ -f ".prettierrc" || -f "prettier.config.js" ]]; then
        if ! npx prettier --check . --ignore-unknown 2>/dev/null; then
            if [[ "$AUTO_FIX" == "true" ]]; then
                npx prettier --write . --ignore-unknown 2>/dev/null || true
            fi
            score=$((score - 10))
            [[ "$status" == "PASS" ]] && status="WARN"
        fi
    fi

    GATE_RESULTS["static-analysis"]="$status"
    GATE_SCORES["static-analysis"]=$score
    log_gate "Static Analysis" "$status" "$score" "$issues issues"
}

gate_test_coverage() {
    local score=0
    local coverage=0
    local status="PASS"

    # Check for test coverage
    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        # Try vitest first, then jest
        if grep -q "vitest" package.json 2>/dev/null; then
            coverage=$(npx vitest run --coverage --reporter=json 2>/dev/null | jq -r '.coverageMap.total.lines.pct // 0' || echo "0")
        elif grep -q "jest" package.json 2>/dev/null; then
            coverage=$(npx jest --coverage --json 2>/dev/null | jq -r '.coverageMap.total.lines.pct // 0' || echo "0")
        fi
    fi

    if [[ -f "pytest.ini" || -f "pyproject.toml" ]]; then
        coverage=$(pytest --cov=. --cov-report=json 2>/dev/null | jq -r '.totals.percent_covered // 0' || echo "0")
    fi

    score=${coverage%.*}
    [[ -z "$score" ]] && score=0

    if [[ $score -lt $COVERAGE_THRESHOLD ]]; then
        status="FAIL"
    elif [[ $score -lt 90 ]]; then
        status="WARN"
    fi

    GATE_RESULTS["test-coverage"]="$status"
    GATE_SCORES["test-coverage"]=$score
    log_gate "Test Coverage" "$status" "$score" "${coverage}% coverage"
}

gate_security_scanner() {
    local score=100
    local vulns=0
    local status="PASS"

    # Check for secrets using gitleaks
    if command -v gitleaks &> /dev/null; then
        if ! gitleaks detect --source . --no-git --quiet 2>/dev/null; then
            status="FAIL"
            score=0
            vulns=$((vulns + 1))
        fi
    fi

    # Check npm audit
    if command -v npm &> /dev/null && [[ -f "package-lock.json" ]]; then
        local npm_audit
        npm_audit=$(npm audit --json 2>/dev/null || echo '{}')
        local critical high medium
        critical=$(echo "$npm_audit" | jq -r '.metadata.vulnerabilities.critical // 0')
        high=$(echo "$npm_audit" | jq -r '.metadata.vulnerabilities.high // 0')
        medium=$(echo "$npm_audit" | jq -r '.metadata.vulnerabilities.moderate // 0')

        vulns=$((critical + high))
        score=$((100 - critical * 20 - high * 10 - medium * 5))
        [[ $score -lt 0 ]] && score=0

        if [[ $critical -gt 0 ]]; then
            status="FAIL"
        elif [[ $high -gt 0 ]]; then
            status="FAIL"
        elif [[ $medium -gt 0 ]]; then
            status="WARN"
        fi
    fi

    GATE_RESULTS["security-scanner"]="$status"
    GATE_SCORES["security-scanner"]=$score
    log_gate "Security Scanner" "$status" "$score" "$vulns vulnerabilities"
}

gate_complexity_analyzer() {
    local score=100
    local violations=0
    local status="PASS"

    # Check complexity with ESLint
    if command -v npx &> /dev/null && [[ -f "package.json" ]]; then
        violations=$(npx eslint . --ext .js,.ts,.tsx \
            --rule 'complexity: ["error", 10]' \
            --format compact 2>/dev/null | grep -c "complexity" || echo "0")

        score=$((100 - violations * 10))
        [[ $score -lt 0 ]] && score=0

        if [[ $violations -gt 0 ]]; then
            status="WARN"
        fi
        if [[ $violations -gt 5 ]]; then
            status="FAIL"
        fi
    fi

    GATE_RESULTS["complexity-analyzer"]="$status"
    GATE_SCORES["complexity-analyzer"]=$score
    log_gate "Complexity Analyzer" "$status" "$score" "$violations violations"
}

gate_dependency_health() {
    local score=100
    local outdated=0
    local status="PASS"

    # Check outdated npm packages
    if command -v npm &> /dev/null && [[ -f "package.json" ]]; then
        outdated=$(npm outdated --json 2>/dev/null | jq 'length' || echo "0")
        score=$((100 - outdated * 2))
        [[ $score -lt 0 ]] && score=0

        if [[ $outdated -gt 10 ]]; then
            status="WARN"
        fi
        if [[ $outdated -gt 25 ]]; then
            status="FAIL"
        fi
    fi

    GATE_RESULTS["dependency-health"]="$status"
    GATE_SCORES["dependency-health"]=$score
    log_gate "Dependency Health" "$status" "$score" "$outdated outdated"
}

###############################################################################
# Orchestration
###############################################################################

run_all_gates() {
    log_header

    echo -e "${BOLD}Running Quality Gates...${NC}"
    echo ""

    # Run gates (parallel or sequential)
    if [[ "$PARALLEL_GATES" == "true" ]]; then
        gate_static_analysis &
        gate_test_coverage &
        gate_security_scanner &
        gate_complexity_analyzer &
        gate_dependency_health &
        wait
    else
        gate_static_analysis
        gate_test_coverage
        gate_security_scanner
        gate_complexity_analyzer
        gate_dependency_health
    fi

    # Calculate overall score
    local total=0
    local count=0
    for gate in "${!GATE_SCORES[@]}"; do
        total=$((total + GATE_SCORES[$gate]))
        count=$((count + 1))

        if [[ "${GATE_RESULTS[$gate]}" == "PASS" ]]; then
            GATES_PASSED=$((GATES_PASSED + 1))
        elif [[ "${GATE_RESULTS[$gate]}" == "FAIL" ]]; then
            GATES_FAILED=$((GATES_FAILED + 1))
        elif [[ "${GATE_RESULTS[$gate]}" == "WARN" ]]; then
            if [[ "$FAIL_ON_WARNINGS" == "true" ]]; then
                GATES_FAILED=$((GATES_FAILED + 1))
            else
                GATES_PASSED=$((GATES_PASSED + 1))
            fi
        fi
    done

    OVERALL_SCORE=$((total / count))

    log_summary

    # Exit with appropriate code
    if [[ $GATES_FAILED -gt 0 ]]; then
        echo ""
        echo -e "${RED}Commit blocked. Please fix the issues above.${NC}"
        echo -e "Use ${YELLOW}git commit --no-verify${NC} to bypass (not recommended)."
        exit 1
    fi

    exit 0
}

###############################################################################
# Main
###############################################################################

run_all_gates
