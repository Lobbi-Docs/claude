# /quality-check

Run all quality gates and generate comprehensive report.

## Usage

```bash
/quality-check [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--gate=<name>` | Run specific gate only | all |
| `--fix` | Auto-fix issues where possible | false |
| `--strict` | Fail on warnings | false |
| `--changed-only` | Only check changed files | false |
| `--ci` | CI mode (JSON output, exit codes) | false |
| `--report=<format>` | Output format (text/json/html) | text |
| `--threshold=<pct>` | Override coverage threshold | 80 |

## Examples

```bash
# Run all quality gates
/quality-check

# Run with auto-fix
/quality-check --fix

# Only static analysis
/quality-check --gate=static-analysis

# CI pipeline mode
/quality-check --ci --strict --report=json

# Check only changed files
/quality-check --changed-only --fix
```

## Quality Gates Executed

1. **Static Analysis** - ESLint, Prettier, language linters
2. **Test Coverage** - Coverage threshold enforcement
3. **Security Scanner** - Vulnerability and secret detection
4. **Complexity Analyzer** - Code complexity metrics
5. **Dependency Health** - Outdated/vulnerable dependencies

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All gates passed |
| 1 | Gate(s) failed with errors |
| 2 | Gate(s) failed with warnings (--strict mode) |
| 3 | Configuration error |

## Output

```
╔══════════════════════════════════════════════════════════════╗
║                    CODE QUALITY REPORT                        ║
║                    Quality Score: 87/100                      ║
╠══════════════════════════════════════════════════════════════╣
║  Gate                    │ Status  │ Score │ Issues          ║
╠══════════════════════════════════════════════════════════════╣
║  Static Analysis         │ ✓ PASS  │  95   │ 3 warnings      ║
║  Test Coverage           │ ✓ PASS  │  82   │ 82% coverage    ║
║  Security Scanner        │ ✓ PASS  │  90   │ 0 vulnerabilities║
║  Complexity Analyzer     │ ✓ PASS  │  78   │ 2 suggestions   ║
║  Dependency Health       │ ⚠ WARN  │  70   │ 5 outdated      ║
╠══════════════════════════════════════════════════════════════╣
║  Overall Grade: B                                             ║
╚══════════════════════════════════════════════════════════════╝
```
