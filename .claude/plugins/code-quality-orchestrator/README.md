# Code Quality Orchestrator

**Callsign:** Curator
**Faction:** Forerunner
**Version:** 1.0.0

> "Ancient guardian of code excellence. Orchestrates 5 quality gates in a unified flow to ensure pristine code through Forerunner precision."

## Overview

The Code Quality Orchestrator (Curator) is a comprehensive plugin that coordinates 5 integrated quality gates to ensure high-quality, clean code production. It orchestrates static analysis, test coverage, security scanning, complexity analysis, and dependency health checking in an optimal flow.

## 5 Quality Gates

### 1. Static Analysis Gate
**Tools:** ESLint, Prettier, Pylint, Golint, Rustfmt, RuboCop

Enforces code style, formatting, and best practices across multiple languages with auto-fix capabilities.

### 2. Test Coverage Enforcer
**Tools:** Vitest, Jest, pytest-cov, Istanbul, c8

Enforces minimum test coverage thresholds (default 80%) and identifies coverage gaps with actionable test suggestions.

### 3. Security Vulnerability Scanner
**Tools:** Trivy, Semgrep, Gitleaks, Trufflehog, Bandit, npm-audit

Scans for exposed secrets, known CVEs, OWASP Top 10 vulnerabilities, and security anti-patterns.

### 4. Code Complexity Analyzer
**Tools:** ESLint complexity, Radon, Lizard, SonarQube

Measures cyclomatic complexity (≤10), cognitive complexity (≤15), and maintainability index with refactoring suggestions.

### 5. Dependency Health Checker
**Tools:** npm-outdated, pip-audit, Dependabot, Snyk

Checks for outdated packages, vulnerable dependencies, deprecated libraries, and license compliance.

## Quality Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUALITY ORCHESTRATION FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PRE-CODE ────────> DURING-CODE ────────> PRE-COMMIT ────> POST    │
│      │                    │                    │                │    │
│   ┌──┴──┐             ┌──┴──┐          ┌────┴────┐         ┌──┴──┐ │
│   │Gate1│             │Gate4│          │All Gates│         │Gate3│ │
│   │Lint │             │Cmplx│          │Parallel │         │ Sec │ │
│   └─────┘             └─────┘          └─────────┘         └─────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Using plugin-cli
/plugin-install code-quality-orchestrator

# Manual
cp -r .claude/plugins/code-quality-orchestrator ~/.claude/plugins/
```

## Commands

| Command | Description |
|---------|-------------|
| `/quality-check` | Run all quality gates |
| `/quality-fix` | Auto-fix issues where possible |
| `/quality-report` | Generate comprehensive report |
| `/coverage-check` | Run test coverage analysis |
| `/security-scan` | Run security vulnerability scan |
| `/complexity-audit` | Run complexity analysis |
| `/dependency-audit` | Check dependency health |
| `/lint-all` | Run all linters |
| `/format-all` | Format all files |

## Quality Score

The orchestrator calculates an overall quality score (0-100):

| Component | Weight |
|-----------|--------|
| Static Analysis | 20% |
| Test Coverage | 25% |
| Security Score | 25% |
| Complexity | 15% |
| Dependency Health | 15% |

### Grading Scale

| Grade | Score | Description |
|-------|-------|-------------|
| A | 90-100 | Excellent code quality |
| B | 80-89 | Good code quality |
| C | 70-79 | Acceptable, needs improvement |
| D | 60-69 | Poor, significant issues |
| F | <60 | Failing, blocked |

## Configuration

```json
{
  "qualityOrchestrator": {
    "staticAnalysis": {
      "enabled": true,
      "autoFix": true
    },
    "testCoverage": {
      "enabled": true,
      "threshold": 80
    },
    "securityScanner": {
      "enabled": true,
      "failOnHigh": true
    },
    "complexityAnalyzer": {
      "enabled": true,
      "maxCyclomaticComplexity": 10
    },
    "dependencyHealth": {
      "enabled": true,
      "checkVulnerabilities": true
    }
  }
}
```

## CI/CD Integration

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
.claude/plugins/code-quality-orchestrator/hooks/pre-commit-quality-gate.sh
```

### GitHub Actions
```yaml
- name: Quality Gates
  run: |
    claude quality-check --ci --strict --report=json
```

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| quality-orchestrator-agent | sonnet | Master coordinator |
| static-analysis-agent | haiku | Linting and formatting |
| test-coverage-agent | sonnet | Coverage analysis |
| security-scanner-agent | sonnet | Security scanning |
| complexity-analyzer-agent | haiku | Complexity metrics |
| dependency-health-agent | haiku | Dependency auditing |
| auto-fix-agent | sonnet | Automatic corrections |
| quality-reporter-agent | haiku | Report generation |

## License

MIT
