# Complexity Analyzer Agent

**Callsign:** Simplifier
**Faction:** Promethean
**Model:** haiku

## Purpose

Measures code complexity and suggests refactoring opportunities. Ensures maintainable code through complexity thresholds.

## Complexity Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Cyclomatic Complexity | ≤ 10 | Number of linearly independent paths |
| Cognitive Complexity | ≤ 15 | Mental effort to understand code |
| Nesting Depth | ≤ 4 | Maximum nesting level |
| Function Length | ≤ 50 lines | Lines per function |
| File Length | ≤ 500 lines | Lines per file |
| Parameters | ≤ 5 | Parameters per function |
| Maintainability Index | ≥ 20 | Overall maintainability score |

## Tools Integration

| Tool | Language | Metrics |
|------|----------|---------|
| ESLint complexity | JavaScript/TypeScript | Cyclomatic, cognitive |
| Radon | Python | CC, MI, Halstead |
| Lizard | Multi-language | CC, function length |
| gocyclo | Go | Cyclomatic |
| SonarQube | Multi-language | All metrics |

## Activation Triggers

- "complexity"
- "refactor"
- "simplify"
- "maintainability"
- "complexity check"
- "too complex"

## Execution Flow

```bash
#!/bin/bash
# Complexity Analysis

# JavaScript/TypeScript
analyze_js_complexity() {
  npx eslint . --ext .js,.ts,.tsx \
    --rule 'complexity: ["error", 10]' \
    --rule 'max-depth: ["error", 4]' \
    --rule 'max-nested-callbacks: ["error", 3]' \
    --rule 'max-params: ["error", 5]' \
    --format json
}

# Python
analyze_python_complexity() {
  radon cc . -a -j > /tmp/radon-cc.json
  radon mi . -j > /tmp/radon-mi.json
}

# Multi-language
analyze_with_lizard() {
  lizard . -l python -l javascript -l typescript \
    --CCN 10 --length 50 --arguments 5 \
    --output_file /tmp/lizard.json --json
}
```

## Refactoring Suggestions

The agent provides actionable refactoring guidance:

```json
{
  "file": "src/services/dataProcessor.ts",
  "function": "processComplexData",
  "metrics": {
    "cyclomaticComplexity": 15,
    "cognitiveComplexity": 22,
    "lines": 87,
    "nestingDepth": 5
  },
  "suggestions": [
    {
      "type": "extract-method",
      "description": "Extract validation logic (lines 23-45) to separate function",
      "expectedReduction": {
        "cyclomatic": -4,
        "cognitive": -6
      }
    },
    {
      "type": "replace-conditional",
      "description": "Replace nested if-else with early returns or strategy pattern",
      "lines": [52, 65],
      "expectedReduction": {
        "nestingDepth": -2,
        "cognitive": -4
      }
    },
    {
      "type": "decompose-function",
      "description": "Split into processValidation() and processTransformation()",
      "expectedReduction": {
        "lines": -40,
        "cyclomatic": -6
      }
    }
  ]
}
```

## Output Format

```json
{
  "agent": "complexity-analyzer-agent",
  "timestamp": "2025-12-26T12:00:00Z",
  "passed": false,
  "complexityScore": 72,
  "summary": {
    "filesAnalyzed": 45,
    "functionsAnalyzed": 234,
    "violations": 8,
    "warnings": 12
  },
  "metrics": {
    "averageCyclomatic": 4.2,
    "maxCyclomatic": 15,
    "averageCognitive": 6.8,
    "maxCognitive": 22,
    "averageFunctionLength": 28,
    "maxFunctionLength": 87
  },
  "violations": [
    {
      "file": "src/services/dataProcessor.ts",
      "function": "processComplexData",
      "metric": "cyclomaticComplexity",
      "value": 15,
      "threshold": 10,
      "severity": "error"
    }
  ],
  "refactoringSuggestions": 8,
  "estimatedEffort": "2-3 hours"
}
```

## Complexity Grading

| Grade | Cyclomatic | Cognitive | Maintainability |
|-------|------------|-----------|-----------------|
| A | 1-5 | 1-8 | 80-100 |
| B | 6-10 | 9-15 | 60-79 |
| C | 11-15 | 16-25 | 40-59 |
| D | 16-25 | 26-40 | 20-39 |
| F | 25+ | 40+ | 0-19 |
