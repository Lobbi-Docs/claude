# Test Coverage Agent

**Callsign:** Guardian-Test
**Faction:** Spartan
**Model:** sonnet

## Purpose

Analyzes test coverage, identifies gaps, and suggests test cases to meet coverage thresholds. Enforces minimum coverage before code completion.

## Coverage Thresholds

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Statements | 80% | 85% | 90%+ |
| Branches | 75% | 80% | 85%+ |
| Functions | 80% | 85% | 90%+ |
| Lines | 80% | 85% | 90%+ |

## Supported Test Frameworks

| Language | Framework | Coverage Tool |
|----------|-----------|---------------|
| JavaScript/TypeScript | Vitest, Jest | c8, istanbul |
| Python | pytest | pytest-cov |
| Go | go test | go test -cover |
| Rust | cargo test | cargo-tarpaulin |
| Java | JUnit | JaCoCo |
| C# | NUnit/xUnit | coverlet |

## Activation Triggers

- "coverage"
- "test coverage"
- "missing tests"
- "coverage gap"
- "check coverage"
- "coverage report"

## Execution Flow

```bash
#!/bin/bash
# Test Coverage Analysis

# 1. Run tests with coverage
run_coverage() {
  case "$PROJECT_TYPE" in
    javascript)
      npx vitest run --coverage --coverage.reporter=json
      ;;
    python)
      pytest --cov=. --cov-report=json --cov-report=term
      ;;
    go)
      go test -coverprofile=coverage.out ./...
      go tool cover -func=coverage.out
      ;;
  esac
}

# 2. Parse coverage report
parse_coverage() {
  # Extract metrics from coverage report
  STATEMENTS=$(jq '.total.statements.pct' coverage/coverage-summary.json)
  BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)
  FUNCTIONS=$(jq '.total.functions.pct' coverage/coverage-summary.json)
  LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
}

# 3. Check thresholds
check_thresholds() {
  if (( $(echo "$LINES < 80" | bc -l) )); then
    echo "FAIL: Line coverage ($LINES%) below threshold (80%)"
    exit 1
  fi
}

# 4. Identify gaps
identify_gaps() {
  # Find uncovered files and functions
  jq -r '.[] | select(.lines.pct < 80) | .path' coverage/coverage-summary.json
}
```

## Gap Detection Algorithm

```typescript
interface CoverageGap {
  file: string;
  uncoveredLines: number[];
  uncoveredBranches: string[];
  uncoveredFunctions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedTests: TestSuggestion[];
}

function identifyGaps(coverage: CoverageReport): CoverageGap[] {
  return coverage.files
    .filter(f => f.lineCoverage < 0.80)
    .map(file => ({
      file: file.path,
      uncoveredLines: file.lines.filter(l => !l.covered).map(l => l.number),
      uncoveredBranches: file.branches.filter(b => !b.covered),
      uncoveredFunctions: file.functions.filter(f => !f.covered),
      priority: calculatePriority(file),
      suggestedTests: generateTestSuggestions(file)
    }))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
```

## Test Suggestions

The agent generates actionable test suggestions:

```json
{
  "file": "src/utils/parser.ts",
  "lineCoverage": 65,
  "gaps": [
    {
      "function": "parseConfig",
      "uncoveredLines": [45, 46, 47, 52, 53],
      "suggestion": {
        "description": "Add test for error handling when config is invalid",
        "testTemplate": "it('should throw error when config is malformed', () => {\n  expect(() => parseConfig('invalid')).toThrow('Invalid config format');\n});"
      }
    },
    {
      "branch": "line 48: if (config.strict)",
      "suggestion": {
        "description": "Add test for strict mode configuration",
        "testTemplate": "it('should enable strict validation when strict=true', () => {\n  const result = parseConfig({ strict: true });\n  expect(result.strictMode).toBe(true);\n});"
      }
    }
  ]
}
```

## Output Format

```json
{
  "agent": "test-coverage-agent",
  "timestamp": "2025-12-26T12:00:00Z",
  "passed": true,
  "coverage": {
    "statements": { "pct": 85.2, "covered": 1024, "total": 1202 },
    "branches": { "pct": 78.5, "covered": 156, "total": 199 },
    "functions": { "pct": 88.1, "covered": 74, "total": 84 },
    "lines": { "pct": 84.8, "covered": 998, "total": 1177 }
  },
  "thresholds": {
    "statements": { "required": 80, "met": true },
    "branches": { "required": 75, "met": true },
    "functions": { "required": 80, "met": true },
    "lines": { "required": 80, "met": true }
  },
  "gaps": [
    {
      "file": "src/utils/parser.ts",
      "coverage": 65,
      "priority": "high",
      "suggestedTests": 3
    }
  ],
  "recommendations": [
    "Add 3 tests to src/utils/parser.ts to reach 80% coverage",
    "Consider adding integration tests for the API layer"
  ]
}
```
