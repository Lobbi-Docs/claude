# TestForge Agent Roster

**Plugin:** Test Generation Factory
**Callsign:** TestForge
**Mission:** Generate comprehensive tests that catch real bugs

---

## Agent Overview

Total Agents: 12
- Strategic (Opus): 4 agents
- Tactical (Sonnet): 6 agents
- Support (Haiku): 2 agents

---

## 🧠 Strategic Agents (Opus)

### 1. Edge Case Detective
**Callsign:** BoundaryHunter
**Model:** Opus
**Role:** Master of finding bugs through edge case analysis

**Expertise:**
- Boundary value analysis
- Null/undefined scenario enumeration
- Race condition detection
- Resource exhaustion identification
- Type coercion edge cases
- Malformed input scenarios

**Triggers:**
- "edge cases"
- "boundary conditions"
- "what could go wrong"
- "failure scenarios"
- "corner cases"

**Capabilities:**
- Analyzes code to identify potential failure points
- Enumerates all edge cases systematically
- Prioritizes edge cases by likelihood and severity
- Generates test code for each edge case

**Example Output:**
```typescript
// Edge Case: Null nested property
edgeCases: [
  {
    category: 'null-undefined',
    description: 'User object has null address',
    input: { user: { name: 'John', address: null } },
    expectedBehavior: 'Should throw or return default',
    testCode: `
      it('should handle null address gracefully', () => {
        const user = { name: 'John', address: null };
        expect(() => formatAddress(user))
          .toThrow('Address is required');
      });
    `
  }
]
```

---

### 2. Integration Test Architect
**Callsign:** IntegrationMind
**Model:** Opus
**Role:** Designs comprehensive integration test scenarios

**Expertise:**
- Service interaction mapping
- API contract testing
- Database integration testing
- Event-driven architecture testing
- External dependency coordination

**Triggers:**
- "integration test"
- "api test"
- "service test"
- "end-to-end flow"

**Capabilities:**
- Maps service dependencies
- Designs test scenarios for integration points
- Creates database test scaffolds
- Generates API endpoint tests
- Plans test isolation strategies

**Example Output:**
```typescript
integrationScenario: {
  name: 'User Registration Flow',
  steps: [
    'POST /api/users → creates user in DB',
    'Triggers welcome email event',
    'Creates audit log entry',
    'Returns user with JWT token'
  ],
  testCode: `
    describe('User Registration Integration', () => {
      it('should complete full registration flow', async () => {
        // Arrange
        const userData = { email: 'test@example.com', password: 'secure' };
        const emailSpy = vi.spyOn(emailService, 'send');

        // Act
        const response = await request(app)
          .post('/api/users')
          .send(userData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.token).toBeDefined();

        // Verify database
        const user = await db.users.findByEmail(userData.email);
        expect(user).toBeDefined();

        // Verify side effects
        expect(emailSpy).toHaveBeenCalledWith({
          to: userData.email,
          template: 'welcome'
        });

        // Verify audit log
        const log = await db.auditLog.findLatest();
        expect(log.action).toBe('user.created');
      });
    });
  `
}
```

---

### 3. Coverage Strategist
**Callsign:** StrategyMind
**Model:** Opus
**Role:** Plans optimal test generation strategy for coverage goals

**Expertise:**
- Coverage gap analysis
- Risk-based prioritization
- Test effort estimation
- Coverage optimization algorithms
- ROI calculation for test generation

**Triggers:**
- "increase coverage"
- "coverage strategy"
- "test plan"
- "prioritize testing"

**Capabilities:**
- Analyzes coverage data to identify gaps
- Prioritizes gaps by risk and impact
- Creates phased test generation plan
- Estimates coverage gain per test
- Optimizes for efficiency

**Example Output:**
```typescript
testGenerationPlan: {
  currentCoverage: 68.5,
  targetCoverage: 85,
  gapToClose: 16.5,

  phases: [
    {
      name: 'High-Risk Critical Path',
      targets: [
        'src/auth/authentication.ts',
        'src/payment/processor.ts'
      ],
      estimatedTests: 35,
      estimatedGain: 8.2,
      priority: 'critical'
    },
    {
      name: 'Uncovered Error Paths',
      targets: ['uncovered catch blocks', 'error handlers'],
      estimatedTests: 28,
      estimatedGain: 5.5,
      priority: 'high'
    },
    {
      name: 'Utility Functions',
      targets: ['src/utils/**'],
      estimatedTests: 45,
      estimatedGain: 4.1,
      priority: 'medium'
    }
  ],

  totalEstimatedTests: 108,
  totalEstimatedGain: 17.8,
  efficiency: 0.165, // coverage per test
  estimatedTime: '7-9 minutes'
}
```

---

### 4. Test Reviewer
**Callsign:** QualityGuardian
**Model:** Opus
**Role:** Final quality gatekeeper for generated tests

**Expertise:**
- Test quality assessment
- Bug-catching potential evaluation
- Maintainability analysis
- Test smell detection
- Improvement recommendations

**Triggers:**
- "review tests"
- "validate quality"
- "test quality check"

**Capabilities:**
- Scores tests on multiple quality dimensions
- Identifies weak or meaningless assertions
- Detects test smells and anti-patterns
- Provides actionable improvement suggestions
- Final approval/rejection of generated tests

**Example Output:**
```typescript
qualityReport: {
  overallScore: 84,
  breakdown: {
    bugCatchingPotential: 88,
    maintainability: 82,
    assertionQuality: 79,
    edgeCaseCoverage: 91,
    codeClarity: 85
  },

  strengths: [
    'Excellent edge case coverage',
    'Clear test names and structure',
    'Proper mock isolation'
  ],

  weaknesses: [
    {
      test: 'should process payment',
      issue: 'Assertion only checks toBeDefined()',
      severity: 'medium',
      suggestion: 'Verify payment status, amount, and confirmation'
    }
  ],

  recommendations: [
    'Add assertion for side effect: audit log creation',
    'Strengthen boundary test at line 45',
    'Consider parametrized test for similar scenarios'
  ],

  approved: true,
  requiresRevision: false
}
```

---

## ⚙️ Tactical Agents (Sonnet)

### 5. Code Analyzer
**Callsign:** CodeMind
**Model:** Sonnet
**Role:** Deep code analysis and behavior understanding

**Expertise:**
- AST parsing and traversal
- Control flow graph generation
- Dependency mapping
- Complexity metrics calculation
- Side effect detection

**Triggers:**
- "analyze code"
- "understand behavior"
- "code structure"

**Capabilities:**
- Parses source code into AST
- Generates control flow graphs
- Identifies all dependencies
- Calculates complexity metrics
- Detects side effects and mutations

**Example Output:**
```typescript
functionAnalysis: {
  name: 'processPayment',
  signature: {
    parameters: [
      { name: 'amount', type: 'number', optional: false },
      { name: 'card', type: 'CreditCard', optional: false },
      { name: 'options', type: 'PaymentOptions', optional: true }
    ],
    returnType: 'Promise<PaymentResult>',
    isAsync: true
  },

  controlFlow: {
    branches: 5,
    loops: 0,
    exitPoints: [
      { type: 'return', condition: 'amount <= 0', lineNumber: 23 },
      { type: 'throw', condition: 'invalid card', lineNumber: 27 },
      { type: 'return', condition: 'success', lineNumber: 45 }
    ]
  },

  sideEffects: [
    { type: 'database', target: 'transactions.insert', lineNumber: 38 },
    { type: 'network', target: 'paymentGateway.charge', lineNumber: 42 },
    { type: 'global-state', target: 'auditLog.add', lineNumber: 44 }
  ],

  complexity: {
    cyclomatic: 8,
    cognitive: 12
  },

  dependencies: ['PaymentGateway', 'Database', 'AuditLog'],
  risk: { overall: 85, priority: 'critical' }
}
```

---

### 6. Unit Test Generator
**Callsign:** TestSmith
**Model:** Sonnet
**Role:** Generates comprehensive unit tests

**Expertise:**
- AAA pattern implementation
- Test case generation
- Assertion crafting
- Setup/teardown management
- Test naming conventions

**Triggers:**
- "generate unit tests"
- "unit test"
- "test function"

**Capabilities:**
- Generates happy path tests
- Creates edge case tests
- Writes error handling tests
- Implements boundary tests
- Crafts meaningful assertions

**Example Output:**
See "Example Outputs" section below for full test generation examples.

---

### 7. Mock Factory
**Callsign:** MockMaster
**Model:** Sonnet
**Role:** Generates mocks, stubs, and test doubles

**Expertise:**
- Mock generation for all frameworks
- Spy configuration
- Stub implementation
- Fake object creation
- Mock verification patterns

**Triggers:**
- "generate mock"
- "create stub"
- "test double"
- "spy"

**Capabilities:**
- Identifies mockable dependencies
- Generates framework-specific mocks
- Creates spy configurations
- Implements stub behaviors
- Documents mock usage

**Example Output:**
```typescript
generatedMock: {
  name: 'mockPaymentGateway',
  targetDependency: 'PaymentGateway',
  strategy: 'vi.mock',

  code: `
// Mock PaymentGateway
const mockPaymentGateway = {
  charge: vi.fn(),
  refund: vi.fn(),
  verify: vi.fn()
};

// Setup default behaviors
mockPaymentGateway.charge.mockResolvedValue({
  success: true,
  transactionId: 'txn_123',
  amount: 1000
});

mockPaymentGateway.verify.mockResolvedValue(true);
  `,

  usage: `
// In test setup
beforeEach(() => {
  vi.clearAllMocks();
  mockPaymentGateway.charge.mockResolvedValue({ success: true });
});

// In test
it('should charge payment gateway', async () => {
  await processPayment(100, card);

  expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
    amount: 100,
    card: expect.any(Object)
  });
});
  `
}
```

---

### 8. Coverage Analyzer
**Callsign:** GapFinder
**Model:** Sonnet
**Role:** Analyzes coverage data and identifies gaps

**Expertise:**
- Coverage report parsing
- Gap identification
- Path analysis
- Prioritization algorithms

**Triggers:**
- "coverage gap"
- "uncovered code"
- "missing tests"

**Capabilities:**
- Parses coverage reports
- Identifies uncovered branches
- Maps uncovered paths
- Prioritizes gaps by impact

---

### 9. Assertion Engineer
**Callsign:** VerificationArtist
**Model:** Sonnet
**Role:** Crafts meaningful assertions

**Expertise:**
- Assertion patterns
- Behavior verification
- State validation
- Invariant testing

**Triggers:**
- "assertions"
- "verify behavior"
- "test expectations"

**Capabilities:**
- Reviews and strengthens assertions
- Adds behavior verification
- Validates side effects
- Checks invariants

---

### 10. Mutation Advisor
**Callsign:** MutationOracle
**Model:** Sonnet
**Role:** Suggests mutations to verify test quality

**Expertise:**
- Mutation testing concepts
- Survivable mutant detection
- Test weakness identification

**Triggers:**
- "mutation test"
- "test quality"
- "mutation score"

**Capabilities:**
- Suggests potential mutations
- Identifies weak tests
- Recommends improvements

---

## 🔧 Support Agents (Haiku)

### 11. Signature Parser
**Callsign:** TypeScribe
**Model:** Haiku
**Role:** Fast function signature and type parsing

**Expertise:**
- Type inference
- Parameter validation
- Generic/template handling

**Triggers:**
- "parse signature"
- "function parameters"

**Capabilities:**
- Extracts function signatures
- Parses type information
- Identifies constraints

---

### 12. Framework Adapter
**Callsign:** FrameworkBridge
**Model:** Haiku
**Role:** Adapts tests to specific frameworks

**Expertise:**
- Framework syntax
- Idiom application
- Convention enforcement

**Triggers:**
- "jest", "pytest", "vitest"
- "framework adaptation"

**Capabilities:**
- Detects testing framework
- Applies framework idioms
- Adds proper imports
- Enforces conventions

**Example Output:**
```typescript
// Input: Generic test
test('validates input', () => {
  expect(validate(input)).equals(true);
});

// Output: Jest-adapted
describe('validation', () => {
  it('should validate input correctly', () => {
    const input = { email: 'test@example.com' };
    expect(validate(input)).toBe(true);
  });
});

// Output: Pytest-adapted
def test_validates_input():
    """Should validate input correctly."""
    input_data = {"email": "test@example.com"}
    assert validate(input_data) is True
```

---

## Agent Collaboration Patterns

### Pattern 1: Sequential Analysis
```
CodeMind → SignatureParser → EdgeCaseDetective → TestSmith
```

### Pattern 2: Parallel Generation
```
         ┌─ TestSmith (Unit Tests)
CodeMind ┼─ MockMaster (Mocks)
         ├─ DataForge (Fixtures)
         └─ IntegrationMind (Integration Tests)
```

### Pattern 3: Quality Gate
```
TestSmith → AssertionEngineer → MutationOracle → QualityGuardian
```

### Pattern 4: Coverage Boost
```
GapFinder → StrategyMind → [Parallel Generation] → CoverageValidator
```

---

## Performance Characteristics

| Agent | Model | Avg Time | Parallel | Cost |
|-------|-------|----------|----------|------|
| CodeMind | Sonnet | 8-15s | Yes | Medium |
| TypeScribe | Haiku | 2-5s | Yes | Low |
| BoundaryHunter | Opus | 15-30s | No | High |
| TestSmith | Sonnet | 20-40s | Yes | Medium |
| IntegrationMind | Opus | 25-45s | Yes | High |
| MockMaster | Sonnet | 10-20s | Yes | Medium |
| GapFinder | Sonnet | 8-12s | Yes | Medium |
| VerificationArtist | Sonnet | 8-15s | No | Medium |
| MutationOracle | Sonnet | 12-20s | Yes | Medium |
| FrameworkBridge | Haiku | 3-8s | No | Low |
| StrategyMind | Opus | 10-20s | No | High |
| QualityGuardian | Opus | 15-25s | No | High |

**Total Workflow Time:** 3-6 minutes (with parallelization)

---

## Agent Selection Guide

**For Quick Tests:**
- CodeMind + TestSmith + FrameworkBridge

**For Comprehensive Coverage:**
- Full 12-agent workflow

**For Edge Cases Focus:**
- BoundaryHunter + TestSmith + QualityGuardian

**For Coverage Boost:**
- GapFinder + StrategyMind + TestSmith + CoverageValidator

**For Integration Tests:**
- CodeMind + IntegrationMind + MockMaster

---

## Success Metrics

Each agent tracks:
- Execution time
- Output quality
- Bug-catching contribution
- Coverage impact
- Cost efficiency

**Overall Plugin Metrics:**
- Tests generated per run
- Average quality score
- Coverage improvement
- Bugs caught by generated tests
- Time to generate
- Cost per test
