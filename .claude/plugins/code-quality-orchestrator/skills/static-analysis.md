# Static Analysis Skill

**Category:** code-quality
**Activation:** lint, format, static analysis, code style, eslint, prettier

## Description

Multi-language static analysis with ESLint, Prettier, Pylint, Golint, and other language-specific linters integrated into a unified quality check.

## Capabilities

- ESLint/TSLint configuration and execution
- Prettier formatting with custom rules
- Python linting (Pylint, Ruff, Flake8)
- Go linting (golangci-lint, gofmt)
- Rust linting (Clippy, rustfmt)
- Auto-fix mode for automatic corrections

## Usage

This skill activates when:
- User mentions "lint", "format", "code style"
- Files with .js, .ts, .py, .go, .rs extensions are edited
- Pre-commit hooks require validation

## Configuration

```json
{
  "staticAnalysis": {
    "autoFix": true,
    "failOnWarning": false,
    "ignorePatterns": ["node_modules", "dist"],
    "rules": {
      "eslint": { "extends": ["eslint:recommended"] },
      "prettier": { "semi": true, "singleQuote": true }
    }
  }
}
```

## Integration Points

- Pre-edit hook: Validates code style before changes
- Post-edit hook: Auto-formats after modifications
- Pre-commit hook: Final validation before commit
