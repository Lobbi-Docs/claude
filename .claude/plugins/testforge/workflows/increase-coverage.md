# Workflow: Increase Coverage to Target

**Callsign:** TestForge
**Workflow ID:** `testforge-coverage-boost`
**Purpose:** Intelligently increase test coverage to a target percentage by focusing on high-risk, untested code paths

## Overview

This workflow analyzes existing coverage, prioritizes untested code by risk and impact, and generates targeted tests to reach the coverage goal. Focuses on **meaningful coverage** that catches bugs, not just hitting percentage targets.

## Input

```typescript
{
  targetCoverage: number; // e.g., 85
  scope?: 'project' | 'directory' | 'file';
  path?: string;
  prioritizeBy?: 'risk' | 'complexity' | 'change-frequency' | 'critical-path';
  maxTests?: number;
}
```

## Phases and Agent Orchestration

### Phase 1: COVERAGE ANALYSIS (Parallel - 2 agents)

**Goal:** Understand current coverage state and identify gaps

#### Agent 1: Coverage Analyzer
**Model:** Sonnet
**Callsign:** GapFinder
**Task:** Analyze coverage data and identify gaps

```typescript
Input: { scope, path, currentCoverage }
Output: {
  currentCoverage: CoverageData;
  gaps: CoverageGap[];
  uncoveredPaths: UncoveredPath[];
  statistics: CoverageStatistics;
}
```

**Actions:**
- Load coverage reports (Istanbul, Coverage.py, etc.)
- Identify uncovered statements
- Map uncovered branches
- Find untested functions
- Calculate gap priorities

**Coverage Gap Types:**
1. **Uncovered Functions:** Never called in tests
2. **Uncovered Branches:** If/else paths not taken
3. **Uncovered Statements:** Lines never executed
4. **Uncovered Error Paths:** Exception handling not tested

#### Agent 2: Code Analyzer
**Model:** Sonnet
**Callsign:** CodeMind
**Task:** Analyze uncovered code for complexity and risk

```typescript
Input: { uncoveredPaths }
Output: {
  complexityScores: ComplexityScore[];
  riskAssessments: RiskAssessment[];
  criticalPaths: CriticalPath[];
}
```

**Actions:**
- Calculate cyclomatic complexity
- Identify critical business logic
- Detect high-risk areas (auth, payment, data loss)
- Analyze change frequency
- Map dependency chains

**Risk Factors:**
- High complexity (cyclomatic > 10)
- Critical business logic
- Frequent changes (git history)
- Security-sensitive code
- Data mutation operations
- External integrations

### Phase 2: PRIORITIZATION (Single agent)

**Goal:** Prioritize gaps for maximum impact

#### Agent 3: Coverage Strategist
**Model:** Opus
**Callsign:** StrategyMind
**Task:** Create prioritized test generation plan

```typescript
Input: {
  gaps: CoverageGap[];
  risks: RiskAssessment[];
  targetCoverage: number;
  currentCoverage: number;
}
Output: {
  plan: TestGenerationPlan;
  prioritizedTargets: PrioritizedTarget[];
  estimatedTests: number;
  estimatedCoverageGain: number;
}
```

**Actions:**
- Score each gap by impact
- Calculate tests needed per gap
- Estimate coverage gain per test
- Optimize test generation order
- Balance coverage vs effort

**Prioritization Formula:**
```
Priority Score = (
  Risk Score × 0.4 +
  Complexity × 0.2 +
  Coverage Impact × 0.3 +
  Change Frequency × 0.1
)
```

**Plan Output:**
```typescript
{
  phase1: {
    targets: ['high-risk auth functions'],
    expectedGain: 15%,
    tests: 25
  },
  phase2: {
    targets: ['uncovered branches in utils'],
    expectedGain: 12%,
    tests: 30
  },
  // ...until target reached
}
```

### Phase 3: TARGETED TEST GENERATION (Parallel - 4 agents)

**Goal:** Generate tests for prioritized gaps

This phase runs the same agents as "Generate File Tests" but targeted:

#### Agent 4: Edge Case Detective
**Model:** Opus
**Callsign:** BoundaryHunter
**Task:** Focus on uncovered edge cases

```typescript
Input: { prioritizedTargets, uncoveredBranches }
Output: { edgeCases: EdgeCase[] }
```

**Actions:**
- Analyze uncovered branches
- Identify missing error cases
- Find untested boundary conditions

#### Agent 5: Unit Test Generator
**Model:** Sonnet
**Callsign:** TestSmith
**Task:** Generate tests for coverage gaps

```typescript
Input: {
  targets: PrioritizedTarget[];
  edgeCases: EdgeCase[];
}
Output: {
  tests: GeneratedTest[];
  coverageMap: TestCoverageMap;
}
```

**Actions:**
- Generate tests for each target
- Focus on uncovered branches
- Create error path tests
- Implement boundary tests

**Test Focus Examples:**

**Uncovered Branch:**
```typescript
// Code with uncovered else branch
function processOrder(order) {
  if (order.status === 'pending') {
    return processPending(order);
  } else { // ⚠️ UNCOVERED
    return processCompleted(order);
  }
}

// Generated test to cover gap
it('should process completed orders', () => {
  const order = { status: 'completed', items: [...] };
  const result = processOrder(order);
  expect(result).toHaveBeenProcessedAsCompleted();
});
```

**Uncovered Error Path:**
```typescript
// Code with uncovered catch block
async function fetchUser(id) {
  try {
    return await api.getUser(id);
  } catch (error) { // ⚠️ UNCOVERED
    logger.error(error);
    throw new UserNotFoundError(id);
  }
}

// Generated test to cover error path
it('should handle API errors gracefully', async () => {
  api.getUser = vi.fn().mockRejectedValue(new Error('Network error'));

  await expect(fetchUser('123'))
    .rejects.toThrow(UserNotFoundError);
  expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
});
```

#### Agent 6: Mock Factory
**Model:** Sonnet
**Callsign:** MockMaster
**Task:** Generate mocks for integration points

```typescript
Input: { targets, dependencies }
Output: { mocks: GeneratedMock[] }
```

#### Agent 7: Integration Test Architect
**Model:** Opus
**Callsign:** IntegrationMind
**Task:** Design integration tests for complex gaps

```typescript
Input: { criticalPaths, integrationPoints }
Output: { integrationTests: GeneratedTest[] }
```

### Phase 4: COVERAGE VALIDATION (Single agent)

**Goal:** Verify coverage improvements

#### Agent 8: Coverage Validator
**Model:** Haiku
**Callsign:** CoverageChecker
**Task:** Validate coverage gains

```typescript
Input: {
  generatedTests: GeneratedTest[];
  targetCoverage: number;
}
Output: {
  projectedCoverage: CoverageData;
  targetReached: boolean;
  remainingGaps: Gap[];
}
```

**Actions:**
- Estimate coverage impact
- Identify remaining gaps
- Suggest additional tests if needed
- Validate target reached

### Phase 5: QUALITY ASSURANCE (Parallel - 2 agents)

**Goal:** Ensure generated tests are high quality

#### Agent 9: Assertion Engineer
**Model:** Sonnet
**Callsign:** VerificationArtist
**Task:** Strengthen assertions

```typescript
Input: { tests: GeneratedTest[] }
Output: { enhancedTests: GeneratedTest[] }
```

**Actions:**
- Review assertions
- Add behavior verification
- Ensure meaningful checks

#### Agent 10: Test Reviewer
**Model:** Opus
**Callsign:** QualityGuardian
**Task:** Final quality review

```typescript
Input: {
  tests: GeneratedTest[];
  coverageGain: number;
}
Output: {
  approved: boolean;
  qualityScore: number;
  recommendations: Recommendation[];
}
```

**Quality Thresholds:**
- Bug-catching potential >= 70/100
- No "coverage theater" tests
- All assertions meaningful
- Proper error handling tested

### Phase 6: INCREMENTAL EXECUTION (Coordinated)

**Goal:** Execute and validate tests incrementally

#### Agent 11: Test Executor (via Testing Orchestrator)
**Model:** Haiku
**Task:** Run generated tests and measure coverage

```typescript
Input: { tests: GeneratedTest[] }
Output: {
  executionResults: TestResults;
  actualCoverage: CoverageData;
  failures: TestFailure[];
}
```

**Actions:**
- Execute tests in batches
- Measure actual coverage
- Report failures
- Adjust if needed

**Incremental Approach:**
```
Batch 1 (High Priority): Run + Measure
  └─ If target not reached → Batch 2
Batch 2 (Medium Priority): Run + Measure
  └─ If target not reached → Batch 3
Batch 3 (Fill Gaps): Run + Measure
  └─ Target reached ✓
```

### Phase 7: REPORTING (Single agent)

**Goal:** Generate comprehensive coverage report

#### Agent 12: Report Generator
**Model:** Haiku
**Callsign:** ReportScribe
**Task:** Generate detailed coverage improvement report

```typescript
Input: {
  before: CoverageData;
  after: CoverageData;
  testsGenerated: number;
  timeline: Timeline;
}
Output: {
  report: CoverageReport;
  visualizations: Chart[];
  recommendations: Recommendation[];
}
```

## Output

```typescript
{
  success: boolean;
  targetReached: boolean;
  coverage: {
    before: CoverageData;
    after: CoverageData;
    improvement: {
      statements: number; // +15.3%
      branches: number;   // +22.1%
      functions: number;  // +18.7%
      lines: number;      // +16.8%
    };
  };
  testsGenerated: {
    total: number;
    unit: number;
    integration: number;
    edgeCase: number;
  };
  files: {
    testFiles: string[];
    mockFiles: string[];
    coverageReport: string;
  };
  metrics: {
    highRiskCovered: number; // Critical paths now tested
    averageQuality: number;
    timeSpent: number;
    efficiency: number; // Coverage gain per test
  };
  remainingGaps?: Gap[];
  recommendations?: Recommendation[];
}
```

## Example Scenarios

### Scenario 1: Project at 65%, Target 85%

```bash
/testforge:coverage 85 --prioritize=risk
```

**Execution:**
1. Analyze 20% gap across project
2. Find 45 uncovered functions, 120 uncovered branches
3. Prioritize: 15 high-risk auth functions, 8 payment processors
4. Generate 85 targeted tests
5. Execute in batches, measure coverage
6. Result: 87% coverage, 89 tests generated

**Report:**
```
Coverage Improvement: 65% → 87% (+22%)
Tests Generated: 89
  - 52 unit tests
  - 24 edge case tests
  - 13 integration tests
Time: 8 minutes
Efficiency: 0.25% coverage per test

High-Risk Coverage:
  ✓ Authentication: 45% → 95%
  ✓ Payment Processing: 58% → 92%
  ✓ Data Validation: 72% → 88%

Remaining Gaps: 7 low-priority utility functions
```

### Scenario 2: Critical File Needs 100%

```bash
/testforge:coverage 100 --scope=file --path=src/core/payment-gateway.ts
```

**Execution:**
1. Deep analysis of single file
2. Identify 12 uncovered branches
3. Generate 28 comprehensive tests
4. All edge cases covered
5. Result: 100% coverage

### Scenario 3: Pre-Release Coverage Boost

```bash
/testforge:coverage 90 --prioritize=critical-path --max-tests=200
```

**Execution:**
1. Focus on critical business flows
2. Ignore low-priority utilities
3. Generate up to 200 tests
4. Prioritize user-facing features
5. Stop when 90% reached or max tests hit

## Success Criteria

- ✅ Target coverage reached or within 2%
- ✅ All high-risk gaps covered
- ✅ No "coverage theater" tests (quality >= 70/100)
- ✅ All generated tests pass
- ✅ Coverage improvement measurable and verified

## Smart Strategies

### 1. Risk-First Approach
Focus on high-risk code first:
- Authentication and authorization
- Payment processing
- Data mutations
- Security-critical functions

### 2. Efficiency Optimization
Maximize coverage gain per test:
- Target multi-branch functions
- Cover multiple scenarios per test
- Use parametrized tests

### 3. Diminishing Returns Awareness
Stop when cost > benefit:
- Last 5% often requires 50% of effort
- Low-risk code may not need 100%
- Focus on meaningful coverage

## Anti-Patterns to Avoid

❌ **Coverage Obsession:** Chasing 100% in trivial getters/setters
❌ **Shallow Tests:** Tests that only execute code without assertions
❌ **Duplicate Tests:** Multiple tests covering the same path
❌ **Ignored Gaps:** Missing critical error paths to hit percentage

## Best Practices

✅ **Risk-Based Prioritization:** High-risk code first
✅ **Meaningful Coverage:** Quality over quantity
✅ **Incremental Validation:** Verify after each batch
✅ **Smart Stopping:** Know when good enough is good enough
✅ **Maintainable Tests:** Easy to update when code changes

## Timeline Estimate

```
Coverage Gap: 20%
Estimated Tests: 80-120
Estimated Time: 6-10 minutes

Breakdown:
  Analysis & Prioritization: 1-2 min
  Test Generation: 4-6 min
  Execution & Validation: 1-2 min
```

## Integration with CI/CD

```yaml
# .github/workflows/coverage-check.yml
name: Coverage Check

on: [pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check coverage
        run: npm run test:coverage

      - name: Boost if below threshold
        if: coverage < 85
        run: |
          claude testforge:coverage 85 --prioritize=risk
          npm run test:coverage

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            // Post coverage improvement report
```

## Monitoring & Metrics

Track over time:
- Coverage trend
- Tests generated per sprint
- Bug-catching effectiveness
- Time to reach targets
- Efficiency (coverage per test)

**Dashboard Metrics:**
```
Current Coverage: 87.3%
Target: 85%
Status: ✓ Target Exceeded

Tests Generated This Sprint: 145
Bugs Caught: 23
Coverage Efficiency: 0.28% per test

High-Risk Coverage: 94.5%
Critical Paths: 98.2%
```
