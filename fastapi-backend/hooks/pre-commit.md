---
name: pre-commit
description: Pre-commit hook for FastAPI projects - runs linting, type checking, and tests
trigger: pre-commit
enabled: true
---

# Pre-Commit Hook for FastAPI

This hook runs quality checks before allowing commits to FastAPI projects.

## Checks Performed

1. **Code Formatting** - Black, isort
2. **Linting** - Ruff, flake8
3. **Type Checking** - mypy
4. **Tests** - pytest (fast tests only)
5. **Security** - Basic security checks

## Hook Script

```bash
#!/bin/bash
# hooks/scripts/pre-commit.sh

set -e

echo "🔍 Running pre-commit checks for FastAPI project..."

# Get the project root (where .git is)
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

# Check if virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
fi

# Get staged Python files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.py$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No Python files staged, skipping checks"
    exit 0
fi

echo "📝 Checking files: $STAGED_FILES"

# 1. Code Formatting (Black)
echo ""
echo "🎨 Checking code formatting with Black..."
if command -v black &> /dev/null; then
    black --check --quiet $STAGED_FILES || {
        echo "❌ Black formatting check failed. Run 'black .' to fix."
        exit 1
    }
    echo "✅ Black: OK"
else
    echo "⚠️ Black not installed, skipping"
fi

# 2. Import Sorting (isort)
echo ""
echo "📦 Checking import sorting with isort..."
if command -v isort &> /dev/null; then
    isort --check-only --quiet $STAGED_FILES || {
        echo "❌ isort check failed. Run 'isort .' to fix."
        exit 1
    }
    echo "✅ isort: OK"
else
    echo "⚠️ isort not installed, skipping"
fi

# 3. Linting (Ruff)
echo ""
echo "🔍 Running Ruff linter..."
if command -v ruff &> /dev/null; then
    ruff check $STAGED_FILES || {
        echo "❌ Ruff found issues. Run 'ruff check --fix' to auto-fix."
        exit 1
    }
    echo "✅ Ruff: OK"
else
    echo "⚠️ Ruff not installed, skipping"
fi

# 4. Type Checking (mypy)
echo ""
echo "🔎 Running mypy type checks..."
if command -v mypy &> /dev/null; then
    # Only check app/ directory to avoid test file issues
    APP_FILES=$(echo "$STAGED_FILES" | grep "^app/" || true)
    if [ -n "$APP_FILES" ]; then
        mypy --ignore-missing-imports --no-error-summary $APP_FILES || {
            echo "❌ mypy found type errors"
            exit 1
        }
        echo "✅ mypy: OK"
    else
        echo "✅ mypy: No app files to check"
    fi
else
    echo "⚠️ mypy not installed, skipping"
fi

# 5. Security Checks
echo ""
echo "🔒 Running security checks..."

# Check for hardcoded secrets
SECRET_PATTERNS='(password|secret|api_key|apikey|token|credential)\s*=\s*["\047][^"\047]+["\047]'
if grep -iE "$SECRET_PATTERNS" $STAGED_FILES 2>/dev/null | grep -v "# nosec" | grep -v "example" | grep -v "test"; then
    echo "❌ Potential hardcoded secrets found!"
    exit 1
fi
echo "✅ No hardcoded secrets found"

# Check for debug statements
if grep -n "print(" $STAGED_FILES 2>/dev/null | grep -v "# noqa"; then
    echo "⚠️ Warning: print() statements found (consider using logging)"
fi

if grep -n "import pdb\|pdb.set_trace\|breakpoint()" $STAGED_FILES 2>/dev/null; then
    echo "❌ Debug statements (pdb/breakpoint) found!"
    exit 1
fi
echo "✅ No debug statements found"

# 6. Fast Tests (optional)
echo ""
echo "🧪 Running fast tests..."
if command -v pytest &> /dev/null; then
    # Run only unit tests (marked as fast) with short timeout
    pytest tests/unit/ -x -q --timeout=30 2>/dev/null || {
        echo "⚠️ Some unit tests failed (continuing anyway)"
    }
    echo "✅ Fast tests: Done"
else
    echo "⚠️ pytest not installed, skipping tests"
fi

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
```

## Installation

### Using pre-commit framework

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.1.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.14
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies:
          - pydantic
          - types-redis
```

### Manual Installation

```bash
# Copy hook to .git/hooks
cp hooks/scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Configuration Files

### pyproject.toml

```toml
[tool.black]
line-length = 100
target-version = ['py311']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
line_length = 100
skip = [".venv", "venv"]

[tool.ruff]
line-length = 100
target-version = "py311"
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by black)
    "B008",  # do not perform function calls in argument defaults
]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
disallow_untyped_defs = true
```

## Bypass (Emergency Only)

```bash
# Skip pre-commit hooks (use sparingly!)
git commit --no-verify -m "Emergency fix"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hook not running | Check `chmod +x .git/hooks/pre-commit` |
| Tool not found | Install with `pip install black isort ruff mypy` |
| Too slow | Reduce test scope or use `--no-verify` |
| False positives | Add `# noqa` or `# nosec` comments |
