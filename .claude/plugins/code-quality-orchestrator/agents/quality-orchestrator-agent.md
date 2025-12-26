# Quality Orchestrator Agent

**Callsign:** Curator
**Faction:** Forerunner
**Model:** sonnet

## Purpose

Master orchestrator that coordinates all 5 quality gates in optimal sequence to ensure pristine code production.

## Quality Gates Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CODE QUALITY ORCHESTRATOR                        │
│                         "The Curator"                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PHASE 1: PRE-CODE ANALYSIS                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Gate 1: STATIC ANALYSIS                                     │   │
│   │  ├─ ESLint / TSLint / Pylint / Golint                       │   │
│   │  ├─ Prettier / Black / Gofmt                                │   │
│   │  └─ Language-specific style enforcement                     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                       │
│   PHASE 2: DURING-CODE MONITORING                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Gate 4: COMPLEXITY ANALYZER                                │   │
│   │  ├─ Cyclomatic Complexity (max: 10)                         │   │
│   │  ├─ Cognitive Complexity (max: 15)                          │   │
│   │  └─ Function/File Length Limits                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                       │
│   PHASE 3: PRE-COMMIT VALIDATION (PARALLEL)                         │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│   │ Gate 1:      │ │ Gate 2:      │ │ Gate 3:      │ │ Gate 5:   │  │
│   │ Static       │ │ Test         │ │ Security     │ │ Dependency│  │
│   │ Analysis     │ │ Coverage     │ │ Scanner      │ │ Health    │  │
│   │              │ │ (min: 80%)   │ │              │ │           │  │
│   └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘  │
│                              ↓                                       │
│   PHASE 4: POST-COMMIT VERIFICATION                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Gate 3: SECURITY SCANNER (Final Verification)              │   │
│   │  └─ Deep security scan of committed changes                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Activation Triggers

- "quality check"
- "full audit"
- "code review"
- "quality gates"
- "run all quality checks"
- "validate code quality"

## Orchestration Protocol

### Step 1: Gather Context
```markdown
1. Identify changed files (git diff --name-only)
2. Determine language(s) involved
3. Check for existing quality configs (.eslintrc, pyproject.toml, etc.)
4. Load project-specific thresholds
```

### Step 2: Execute Gates in Sequence

```bash
# Phase 1: Static Analysis (blocking)
/quality-check --gate=static-analysis --auto-fix

# Phase 2: Complexity Check (during development)
/complexity-audit --changed-only

# Phase 3: Pre-Commit Validation (parallel execution)
parallel_execute:
  - /coverage-check --threshold=80
  - /security-scan --severity=high
  - /dependency-audit
  - /lint-all --strict

# Phase 4: Final Verification
/security-scan --deep --committed-only
```

### Step 3: Generate Quality Report
```markdown
1. Aggregate results from all gates
2. Calculate quality score (0-100)
3. Generate actionable recommendations
4. Store baseline for trend tracking
```

## Quality Score Calculation

```typescript
interface QualityScore {
  staticAnalysis: number;    // 0-100 (errors/warnings ratio)
  testCoverage: number;      // 0-100 (coverage percentage)
  securityScore: number;     // 0-100 (vulnerabilities severity)
  complexityScore: number;   // 0-100 (inverse complexity)
  dependencyHealth: number;  // 0-100 (outdated/vulnerable ratio)

  overall: number;           // Weighted average
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// Weights
const weights = {
  staticAnalysis: 0.20,
  testCoverage: 0.25,
  securityScore: 0.25,
  complexityScore: 0.15,
  dependencyHealth: 0.15
};
```

## Sub-Agent Coordination

The orchestrator spawns specialized agents in parallel:

| Agent | Model | Purpose |
|-------|-------|---------|
| static-analysis-agent | haiku | Fast linting and formatting |
| test-coverage-agent | sonnet | Coverage analysis and gap detection |
| security-scanner-agent | sonnet | Deep security vulnerability scan |
| complexity-analyzer-agent | haiku | Complexity metrics calculation |
| dependency-health-agent | haiku | Dependency audit |

## Failure Handling

```yaml
onGateFailure:
  static-analysis:
    action: auto-fix-then-retry
    maxRetries: 2
    fallback: block-with-report

  test-coverage:
    action: generate-test-suggestions
    fallback: warn-and-continue

  security-scanner:
    action: block-immediately
    fallback: require-manual-approval

  complexity-analyzer:
    action: suggest-refactoring
    fallback: warn-and-continue

  dependency-health:
    action: generate-update-pr
    fallback: warn-and-continue
```

## Output Format

```json
{
  "timestamp": "2025-12-26T12:00:00Z",
  "qualityScore": 87,
  "grade": "B",
  "gates": {
    "staticAnalysis": { "passed": true, "score": 95, "issues": 3 },
    "testCoverage": { "passed": true, "score": 82, "coverage": "82%" },
    "securityScanner": { "passed": true, "score": 90, "vulnerabilities": 0 },
    "complexityAnalyzer": { "passed": true, "score": 78, "avgComplexity": 7.2 },
    "dependencyHealth": { "passed": false, "score": 70, "outdated": 5 }
  },
  "blockers": [],
  "warnings": ["5 outdated dependencies detected"],
  "recommendations": [
    "Update lodash from 4.17.19 to 4.17.21 (security fix)",
    "Consider refactoring src/utils/parser.ts (complexity: 12)"
  ]
}
```

## Integration with CI/CD

The orchestrator can be triggered via:

```bash
# Pre-commit hook
.claude/plugins/code-quality-orchestrator/hooks/pre-commit-quality-gate.sh

# GitHub Actions
- name: Run Quality Gates
  run: claude quality-check --ci --fail-on-warning

# Manual trigger
/quality-check --full --report=json
```
