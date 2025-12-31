# Workflow: Generate Tests for File

**Callsign:** TestForge
**Workflow ID:** `testforge-file-generation`
**Purpose:** Generate comprehensive tests for a specific file that catch real bugs

## Overview

This workflow analyzes a source file and generates high-quality unit and integration tests with edge cases, mocks, and fixtures. Focus is on **bug detection**, not just coverage theater.

## Input

```typescript
{
  filePath: string;
  framework?: TestFramework;
  coverageTarget?: number;
  includeIntegration?: boolean;
}
```

## Phases and Agent Orchestration

### Phase 1: ANALYZE (Parallel - 3 agents)

**Goal:** Deep understanding of code behavior and test requirements

#### Agent 1: Code Analyzer
**Model:** Sonnet
**Callsign:** CodeMind
**Task:** Analyze file structure, dependencies, and complexity

```typescript
Input: { filePath }
Output: {
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  dependencies: DependencyMap;
  complexity: ComplexityMetrics;
  sideEffects: SideEffect[];
}
```

**Actions:**
- Parse AST and generate control flow graphs
- Identify dependencies and side effects
- Calculate complexity metrics
- Map function signatures and types
- Detect existing test coverage

#### Agent 2: Signature Parser
**Model:** Haiku
**Callsign:** TypeScribe
**Task:** Parse all function signatures and type constraints

```typescript
Input: { functions from CodeMind }
Output: {
  signatures: FunctionSignature[];
  typeConstraints: TypeConstraint[];
  parameterRanges: ParameterRange[];
}
```

**Actions:**
- Extract parameter types and constraints
- Identify nullable/optional parameters
- Parse return types and generics
- Document type boundaries

#### Agent 3: Coverage Analyzer
**Model:** Sonnet
**Callsign:** GapFinder
**Task:** Identify existing coverage and gaps

```typescript
Input: { filePath, existingTests }
Output: {
  currentCoverage: CoverageData;
  uncoveredPaths: UncoveredPath[];
  prioritizedGaps: Gap[];
}
```

**Actions:**
- Load existing coverage data
- Identify untested branches
- Find uncovered error paths
- Prioritize gaps by risk

### Phase 2: EDGE CASE DETECTION (Single agent)

**Goal:** Identify all edge cases and boundary conditions

#### Agent 4: Edge Case Detective
**Model:** Opus
**Callsign:** BoundaryHunter
**Task:** Identify edge cases that could cause bugs

```typescript
Input: {
  functions: FunctionAnalysis[];
  signatures: FunctionSignature[];
  controlFlow: ControlFlowGraph[];
}
Output: {
  edgeCases: EdgeCase[];
  boundaryConditions: BoundaryCondition[];
  errorScenarios: ErrorScenario[];
}
```

**Actions:**
- Analyze for null/undefined scenarios
- Identify boundary values (0, -1, max, empty)
- Find type coercion edge cases
- Detect race conditions and resource exhaustion
- Enumerate error states
- Consider malformed inputs

**Edge Case Categories:**
1. **Null/Undefined:** Parameters, nested properties, array elements
2. **Empty Collections:** [], {}, ""
3. **Boundary Values:** 0, -1, Number.MAX_SAFE_INTEGER, Infinity
4. **Type Coercion:** "0" vs 0, true vs "true"
5. **Concurrent Access:** Race conditions, deadlocks
6. **Resource Limits:** Memory, stack overflow
7. **Special Characters:** SQL injection, XSS, unicode

### Phase 3: MOCK GENERATION (Parallel - 2 agents)

**Goal:** Generate mocks and test data

#### Agent 5: Mock Factory
**Model:** Sonnet
**Callsign:** MockMaster
**Task:** Generate mocks for dependencies

```typescript
Input: {
  dependencies: DependencyMap;
  framework: TestFramework;
}
Output: {
  mocks: GeneratedMock[];
  mockStrategy: MockStrategy;
}
```

**Actions:**
- Identify mockable dependencies
- Generate mock implementations
- Create spy configurations
- Implement stub behaviors
- Document mock usage

#### Agent 6: Test Data Builder
**Model:** Haiku
**Callsign:** DataForge
**Task:** Generate test fixtures and factories

```typescript
Input: {
  types: TypeInfo[];
  edgeCases: EdgeCase[];
}
Output: {
  fixtures: GeneratedFixture[];
  factories: FactoryFunction[];
  builders: BuilderPattern[];
}
```

**Actions:**
- Create fixture objects
- Implement factory functions
- Build data builders
- Generate edge case variations

### Phase 4: TEST GENERATION (Parallel - 2 agents)

**Goal:** Generate actual test code

#### Agent 7: Unit Test Generator
**Model:** Sonnet
**Callsign:** TestSmith
**Task:** Generate unit tests with meaningful assertions

```typescript
Input: {
  functions: FunctionAnalysis[];
  edgeCases: EdgeCase[];
  mocks: GeneratedMock[];
  fixtures: GeneratedFixture[];
}
Output: {
  unitTests: GeneratedTest[];
}
```

**Actions:**
- Generate happy path tests
- Create edge case tests
- Write error handling tests
- Implement boundary tests
- Add state transition tests
- Craft meaningful assertions

**Test Structure (AAA Pattern):**
```typescript
describe('functionName', () => {
  // Arrange: Setup
  beforeEach(() => { /* setup */ });

  // Tests organized by scenario
  describe('happy path', () => {
    it('should return expected result for valid input', () => {
      // Arrange
      const input = validInput();
      const expected = expectedOutput();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle null input gracefully', () => { /* ... */ });
    it('should handle empty array', () => { /* ... */ });
    it('should handle boundary value: 0', () => { /* ... */ });
  });

  describe('error handling', () => {
    it('should throw TypeError for invalid type', () => { /* ... */ });
  });
});
```

#### Agent 8: Integration Test Architect
**Model:** Opus
**Callsign:** IntegrationMind
**Task:** Design integration test scaffolds

```typescript
Input: {
  dependencies: DependencyMap;
  sideEffects: SideEffect[];
}
Output: {
  integrationTests: GeneratedTest[];
  testScenarios: TestScenario[];
}
```

**Actions:**
- Identify integration points
- Design test scenarios
- Create service interaction tests
- Build database test scaffolds
- Generate API test templates

### Phase 5: ASSERTION ENGINEERING (Single agent)

**Goal:** Ensure assertions verify actual behavior

#### Agent 9: Assertion Engineer
**Model:** Sonnet
**Callsign:** VerificationArtist
**Task:** Craft meaningful assertions

```typescript
Input: {
  tests: GeneratedTest[];
  functions: FunctionAnalysis[];
}
Output: {
  enhancedTests: GeneratedTest[];
  assertionQuality: number;
}
```

**Actions:**
- Review all assertions
- Strengthen weak assertions
- Add behavior verification
- Check side effects
- Validate state changes
- Add invariant checks

**Assertion Quality Criteria:**
- Verifies actual behavior, not just syntax
- Checks multiple properties
- Validates side effects
- Tests invariants
- Clear failure messages

### Phase 6: FRAMEWORK ADAPTATION (Single agent)

**Goal:** Adapt to target testing framework

#### Agent 10: Framework Adapter
**Model:** Haiku
**Callsign:** FrameworkBridge
**Task:** Adapt tests to framework idioms

```typescript
Input: {
  tests: GeneratedTest[];
  framework: TestFramework;
  conventions: TestingConventions;
}
Output: {
  adaptedTests: GeneratedTest[];
  imports: string[];
  setup: string;
}
```

**Actions:**
- Apply framework syntax
- Use framework idioms
- Add proper imports
- Configure test setup
- Apply naming conventions

### Phase 7: QUALITY REVIEW (Parallel - 2 agents)

**Goal:** Validate test quality

#### Agent 11: Mutation Advisor
**Model:** Sonnet
**Callsign:** MutationOracle
**Task:** Suggest mutations to verify test quality

```typescript
Input: {
  tests: GeneratedTest[];
  sourceCode: string;
}
Output: {
  mutations: Mutation[];
  survivableMutants: SurvivableMutant[];
  recommendations: MutationRecommendation[];
}
```

**Actions:**
- Suggest potential mutations
- Identify weak tests
- Recommend improvements
- Estimate mutation score

#### Agent 12: Test Reviewer
**Model:** Opus
**Callsign:** QualityGuardian
**Task:** Final quality review

```typescript
Input: {
  tests: GeneratedTest[];
  mocks: GeneratedMock[];
  fixtures: GeneratedFixture[];
}
Output: {
  qualityReport: QualityReport;
  improvements: Improvement[];
  approved: boolean;
}
```

**Actions:**
- Score test quality
- Assess bug-catching potential
- Evaluate maintainability
- Provide improvement suggestions
- Final approval/rejection

**Quality Criteria:**
1. **Bug-Catching Potential (0-100):** Will this test catch real bugs?
2. **Maintainability (0-100):** Is this test easy to understand and update?
3. **Coverage Impact:** Does this improve meaningful coverage?
4. **Assertion Quality:** Are assertions checking real behavior?
5. **Edge Case Coverage:** Are edge cases properly tested?

## Output

```typescript
{
  success: boolean;
  tests: GeneratedTest[];
  mocks: GeneratedMock[];
  fixtures: GeneratedFixture[];
  coverage: CoverageImpact;
  metrics: {
    totalTests: number;
    edgeCasesIdentified: number;
    mocksGenerated: number;
    averageQuality: number;
    bugCatchingPotential: number;
  };
  files: {
    testFile: string;
    mockFile?: string;
    fixtureFile?: string;
  };
}
```

## Execution Timeline

```
Phase 1: ANALYZE (parallel)         - 30s
  ├─ Code Analyzer
  ├─ Signature Parser
  └─ Coverage Analyzer

Phase 2: EDGE CASE DETECTION        - 45s
  └─ Edge Case Detective

Phase 3: MOCK GENERATION (parallel) - 25s
  ├─ Mock Factory
  └─ Test Data Builder

Phase 4: TEST GENERATION (parallel) - 60s
  ├─ Unit Test Generator
  └─ Integration Test Architect

Phase 5: ASSERTION ENGINEERING      - 20s
  └─ Assertion Engineer

Phase 6: FRAMEWORK ADAPTATION       - 15s
  └─ Framework Adapter

Phase 7: QUALITY REVIEW (parallel)  - 30s
  ├─ Mutation Advisor
  └─ Test Reviewer

Total Estimated Time: ~225s (3.75 minutes)
```

## Success Criteria

- ✅ All functions have at least 3 tests (happy path + edge cases)
- ✅ Coverage increase >= 20% or target reached
- ✅ All identified edge cases have tests
- ✅ Average bug-catching potential >= 75/100
- ✅ Average test quality >= 80/100
- ✅ All tests pass when executed
- ✅ Mocks properly isolate dependencies

## Error Handling

- If code analysis fails: Skip file, warn user
- If framework detection fails: Use default (vitest)
- If mock generation fails: Generate basic stubs
- If quality review fails: Proceed with warning
- If any test fails to compile: Remove from output, log error

## Example Command

```bash
/testforge:file src/utils/payment-processor.ts --coverage=85 --include-integration
```

## Anti-Patterns to Avoid

❌ **Coverage Theater:** Tests that just call functions without assertions
❌ **Weak Assertions:** `expect(result).toBeDefined()`
❌ **Happy Path Only:** Missing edge cases and error scenarios
❌ **Brittle Tests:** Tightly coupled to implementation details
❌ **Unclear Names:** `test1()`, `testFunction()`
❌ **Missing Mocks:** Testing dependencies instead of target function

## Best Practices

✅ **Meaningful Assertions:** Verify actual behavior and invariants
✅ **Edge Case Coverage:** Null, empty, boundary, error scenarios
✅ **Clear Test Names:** Describe what and why
✅ **Proper Isolation:** Mock dependencies appropriately
✅ **AAA Pattern:** Arrange, Act, Assert structure
✅ **Maintainable:** Easy to understand and update
