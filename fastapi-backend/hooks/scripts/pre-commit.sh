#!/bin/bash
# Pre-commit hook for FastAPI projects
# Runs linting, type checking, and security scans

set -e

echo "🔍 Running pre-commit checks for FastAPI project..."

# Get the project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

# Activate virtual environment if exists
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    fi
fi

# Get staged Python files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.py$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No Python files staged, skipping checks"
    exit 0
fi

echo "📝 Checking files:"
echo "$STAGED_FILES"
echo ""

# 1. Black formatting
echo "🎨 Checking code formatting with Black..."
if command -v black &> /dev/null; then
    if black --check --quiet $STAGED_FILES 2>/dev/null; then
        echo "✅ Black: OK"
    else
        echo "❌ Black formatting check failed"
        echo "   Run: black ."
        exit 1
    fi
else
    echo "⚠️ Black not installed"
fi

# 2. isort
echo "📦 Checking import sorting..."
if command -v isort &> /dev/null; then
    if isort --check-only --quiet $STAGED_FILES 2>/dev/null; then
        echo "✅ isort: OK"
    else
        echo "❌ isort check failed"
        echo "   Run: isort ."
        exit 1
    fi
else
    echo "⚠️ isort not installed"
fi

# 3. Ruff linting
echo "🔍 Running Ruff linter..."
if command -v ruff &> /dev/null; then
    if ruff check $STAGED_FILES 2>/dev/null; then
        echo "✅ Ruff: OK"
    else
        echo "❌ Ruff found issues"
        echo "   Run: ruff check --fix"
        exit 1
    fi
else
    echo "⚠️ Ruff not installed"
fi

# 4. Type checking (app files only)
echo "🔎 Running mypy..."
if command -v mypy &> /dev/null; then
    APP_FILES=$(echo "$STAGED_FILES" | grep "^app/" || true)
    if [ -n "$APP_FILES" ]; then
        if mypy --ignore-missing-imports $APP_FILES 2>/dev/null; then
            echo "✅ mypy: OK"
        else
            echo "❌ mypy found type errors"
            exit 1
        fi
    fi
else
    echo "⚠️ mypy not installed"
fi

# 5. Security checks
echo "🔒 Running security checks..."

# Check for hardcoded secrets
if grep -iE '(password|secret|api_key|token)\s*=\s*["\047][^"\047]{8,}["\047]' $STAGED_FILES 2>/dev/null | grep -v "# nosec" | grep -v "example"; then
    echo "❌ Potential hardcoded secrets found!"
    exit 1
fi
echo "✅ No hardcoded secrets"

# Check for debug statements
if grep -n "breakpoint()\|pdb\.set_trace" $STAGED_FILES 2>/dev/null; then
    echo "❌ Debug statements found!"
    exit 1
fi
echo "✅ No debug statements"

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
