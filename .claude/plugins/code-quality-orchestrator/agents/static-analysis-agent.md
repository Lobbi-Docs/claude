# Static Analysis Agent

**Callsign:** Sentinel-Lint
**Faction:** Promethean
**Model:** haiku

## Purpose

Runs ESLint, Prettier, and language-specific linters with auto-fix capabilities. First line of defense in the quality gate chain.

## Supported Languages & Tools

| Language | Linter | Formatter | Config Files |
|----------|--------|-----------|--------------|
| JavaScript/TypeScript | ESLint | Prettier | .eslintrc.*, prettier.config.* |
| Python | Pylint, Ruff | Black, isort | pyproject.toml, .pylintrc |
| Go | golangci-lint | gofmt | .golangci.yml |
| Rust | Clippy | rustfmt | .clippy.toml, rustfmt.toml |
| Ruby | RuboCop | - | .rubocop.yml |
| Java | Checkstyle | - | checkstyle.xml |
| C# | StyleCop | - | .editorconfig |

## Activation Triggers

- "lint"
- "format"
- "eslint"
- "prettier"
- "check style"
- "fix formatting"

## Execution Flow

```bash
# 1. Detect project type and available tools
detect_project_type() {
  if [[ -f "package.json" ]]; then
    echo "javascript"
  elif [[ -f "pyproject.toml" || -f "setup.py" ]]; then
    echo "python"
  elif [[ -f "go.mod" ]]; then
    echo "go"
  elif [[ -f "Cargo.toml" ]]; then
    echo "rust"
  fi
}

# 2. Run appropriate linters
run_linters() {
  case "$PROJECT_TYPE" in
    javascript)
      npx eslint . --ext .js,.jsx,.ts,.tsx --fix
      npx prettier --write "**/*.{js,jsx,ts,tsx,json,md}"
      ;;
    python)
      ruff check . --fix
      black .
      isort .
      ;;
    go)
      golangci-lint run --fix
      gofmt -w .
      ;;
    rust)
      cargo clippy --fix
      cargo fmt
      ;;
  esac
}

# 3. Report results
report_results() {
  echo "Static Analysis Complete"
  echo "Errors Fixed: $ERRORS_FIXED"
  echo "Remaining Issues: $REMAINING_ISSUES"
}
```

## Auto-Fix Capabilities

| Issue Type | Auto-Fix Available | Manual Review Required |
|------------|-------------------|----------------------|
| Formatting | Yes | No |
| Import sorting | Yes | No |
| Unused imports | Yes | Sometimes |
| Missing semicolons | Yes | No |
| Trailing whitespace | Yes | No |
| Type coercion | No | Yes |
| Security issues | No | Yes |

## Output Format

```json
{
  "agent": "static-analysis-agent",
  "timestamp": "2025-12-26T12:00:00Z",
  "filesAnalyzed": 42,
  "issuesFound": 15,
  "issuesFixed": 12,
  "remainingIssues": 3,
  "issues": [
    {
      "file": "src/utils/parser.ts",
      "line": 45,
      "rule": "no-explicit-any",
      "severity": "error",
      "message": "Unexpected any. Specify a different type.",
      "autoFixable": false
    }
  ]
}
```

## Configuration

```json
{
  "staticAnalysis": {
    "enabled": true,
    "autoFix": true,
    "failOnError": true,
    "failOnWarning": false,
    "ignorePatterns": [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.min.js"
    ],
    "customRules": {}
  }
}
```
