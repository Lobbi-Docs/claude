#!/bin/bash
# Pre-deploy validation hook
# Usage: ./pre-deploy.sh <environment> [dry-run]

set -e

ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-false}"

echo "🚀 Pre-deploy validation for: $ENVIRONMENT"
echo "================================================"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

FAILED=0
WARNINGS=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=$((FAILED + 1)); }
warn() { echo "  ⚠️  $1"; WARNINGS=$((WARNINGS + 1)); }

# Stage 1: Environment
echo ""
echo "📋 Stage 1: Environment Validation"
echo "-----------------------------------"

REQUIRED_VARS=("MONGODB_URL" "REDIS_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        pass "$var is set"
    else
        warn "$var not set (may use defaults)"
    fi
done

# Stage 2: Security
echo ""
echo "🔒 Stage 2: Security Checks"
echo "-----------------------------------"

# Check for secrets
if grep -riE '(password|secret|api_key)\s*=\s*["\047][A-Za-z0-9]{8,}["\047]' app/ --include="*.py" 2>/dev/null | grep -v "# nosec"; then
    fail "Hardcoded secrets found"
else
    pass "No hardcoded secrets"
fi

# Check debug mode
if grep -r "debug\s*=\s*True" app/ --include="*.py" 2>/dev/null; then
    warn "Debug mode may be enabled"
else
    pass "Debug mode not hardcoded"
fi

# Stage 3: Tests
echo ""
echo "🧪 Stage 3: Tests"
echo "-----------------------------------"

if command -v pytest &> /dev/null; then
    if pytest --co -q 2>/dev/null | head -1 | grep -q "test"; then
        pass "Test suite found"
        if [ "$DRY_RUN" != "true" ]; then
            if pytest -x -q --tb=no 2>/dev/null; then
                pass "Tests passing"
            else
                fail "Tests failing"
            fi
        else
            warn "Tests skipped (dry run)"
        fi
    else
        warn "No tests found"
    fi
else
    warn "pytest not installed"
fi

# Stage 4: Build
echo ""
echo "🐳 Stage 4: Build Validation"
echo "-----------------------------------"

if [ -f "Dockerfile" ]; then
    pass "Dockerfile exists"

    if grep -q "USER" Dockerfile; then
        pass "Non-root user configured"
    else
        warn "No non-root USER"
    fi

    if grep -q "HEALTHCHECK" Dockerfile; then
        pass "HEALTHCHECK configured"
    else
        warn "No HEALTHCHECK"
    fi
else
    fail "Dockerfile not found"
fi

# Summary
echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo "  Environment: $ENVIRONMENT"
echo "  Failures:    $FAILED"
echo "  Warnings:    $WARNINGS"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "❌ BLOCKED: Fix $FAILED issue(s)"
    exit 1
fi

echo ""
echo "✅ Pre-deploy validation PASSED"
exit 0
