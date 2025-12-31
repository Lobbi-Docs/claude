# TestForge - Test Generation Factory

**Callsign:** TestForge
**Version:** 1.0.0
**Category:** Testing, Automation, Code Quality

---

## Overview

TestForge is an intelligent test generation plugin that creates comprehensive tests that **catch real bugs**, not just boost coverage numbers. It analyzes code behavior, identifies edge cases, and generates meaningful tests with proper assertions and mocks.

### Why TestForge?

Most test generation tools create "coverage theater" - tests that execute code without actually validating behavior. TestForge is different:

✅ **Finds Real Bugs:** Identifies edge cases and boundary conditions that cause actual failures
✅ **Meaningful Assertions:** Verifies behavior, not just `toBeDefined()`
✅ **Edge Case Focus:** Systematically tests null, empty, boundary, and error scenarios
✅ **Smart Mocking:** Generates proper mocks that isolate dependencies
✅ **Framework Agnostic:** Supports Jest, Pytest, Vitest, Mocha, Go, Rust
✅ **Quality First:** Reviews generated tests for maintainability and bug-catching potential

---

## Quick Start

### Generate Tests for a File

```bash
# TypeScript/JavaScript
/testforge:file src/payment/processor.ts

# Python
/testforge:file src/validators/user_validator.py

# With coverage target
/testforge:file src/utils/helpers.ts --coverage=90
```

### Increase Project Coverage

```bash
# Boost coverage to 85%
/testforge:coverage 85

# Focus on high-risk code
/testforge:coverage 85 --prioritize=risk

# Specific directory
/testforge:coverage 90 --scope=directory --path=src/auth
```

### Generate Tests for Specific Function

```bash
/testforge:function processPayment --file=src/payment/processor.ts
```

---

## Features

### 🎯 Intelligent Edge Case Detection

TestForge systematically identifies edge cases that other tools miss:

- **Null/Undefined:** Nested properties, array elements, optional parameters
- **Empty Collections:** [], {}, ""
- **Boundary Values:** 0, -1, Number.MAX_SAFE_INTEGER, Infinity
- **Type Coercion:** "0" vs 0, true vs "true"
- **Concurrent Access:** Race conditions, deadlocks
- **Resource Limits:** Memory exhaustion, stack overflow
- **Special Characters:** SQL injection, XSS, Unicode edge cases
- **Error Paths:** Exception handling, failure scenarios

### 🔍 Deep Code Analysis

Uses AST parsing and control flow analysis to understand:

- Function signatures and parameter constraints
- Dependency injection points
- Side effects (database, network, file system)
- Complexity metrics and risk scores
- Existing test coverage gaps

### 🏭 Mock Generation Factory

Automatically generates framework-specific mocks:

```typescript
// Jest/Vitest
const mockPaymentGateway = {
  charge: vi.fn().mockResolvedValue({ transactionId: 'txn_123' }),
  refund: vi.fn(),
  verify: vi.fn().mockResolvedValue(true)
};

// Pytest
@pytest.fixture
def mock_payment_gateway(mocker):
    gateway = mocker.Mock()
    gateway.charge.return_value = {'transaction_id': 'txn_123'}
    return gateway
```

### ✅ Quality Assurance

Every generated test is reviewed for:

- **Bug-Catching Potential (0-100):** Will this test catch real bugs?
- **Maintainability (0-100):** Easy to understand and update?
- **Assertion Quality:** Meaningful behavior verification?
- **Edge Case Coverage:** All edge cases properly tested?

Tests below quality thresholds are improved or rejected.

---

## Agent Architecture

TestForge uses 12 specialized agents working in parallel:

### Strategic Agents (Opus)
1. **Edge Case Detective (BoundaryHunter):** Finds bugs through edge case analysis
2. **Integration Test Architect (IntegrationMind):** Designs integration test scenarios
3. **Coverage Strategist (StrategyMind):** Plans optimal test generation
4. **Test Reviewer (QualityGuardian):** Final quality gatekeeper

### Tactical Agents (Sonnet)
5. **Code Analyzer (CodeMind):** Deep code analysis and behavior understanding
6. **Unit Test Generator (TestSmith):** Generates comprehensive unit tests
7. **Mock Factory (MockMaster):** Creates mocks, stubs, and test doubles
8. **Coverage Analyzer (GapFinder):** Identifies coverage gaps
9. **Assertion Engineer (VerificationArtist):** Crafts meaningful assertions
10. **Mutation Advisor (MutationOracle):** Validates test quality

### Support Agents (Haiku)
11. **Signature Parser (TypeScribe):** Fast function signature parsing
12. **Framework Adapter (FrameworkBridge):** Adapts to testing frameworks

---

## Workflows

### Workflow 1: Generate File Tests

**Time:** 3-6 minutes
**Agents:** 12 (parallel execution)

```
ANALYZE (3 agents parallel)
  └─ Code + Signatures + Coverage

EDGE CASE DETECTION (1 agent)
  └─ Boundary conditions + Error scenarios

MOCK GENERATION (2 agents parallel)
  └─ Mocks + Test data

TEST GENERATION (2 agents parallel)
  └─ Unit tests + Integration tests

ASSERTION ENGINEERING (1 agent)
  └─ Meaningful assertions

FRAMEWORK ADAPTATION (1 agent)
  └─ Framework-specific syntax

QUALITY REVIEW (2 agents parallel)
  └─ Mutation testing + Final review
```

### Workflow 2: Increase Coverage

**Time:** 6-10 minutes (for 20% coverage increase)
**Focus:** High-risk, untested code

```
COVERAGE ANALYSIS (2 agents parallel)
  └─ Identify gaps + Calculate risk

PRIORITIZATION (1 agent)
  └─ Create optimal test generation plan

TARGETED TEST GENERATION (4 agents parallel)
  └─ Focus on coverage gaps

COVERAGE VALIDATION (1 agent)
  └─ Verify target reached

QUALITY ASSURANCE (2 agents parallel)
  └─ Ensure quality standards
```

---

## Real-World Examples

### Example 1: Payment Processor (TypeScript)

**Input:** 72 lines of payment processing code
**Output:** 485 lines of comprehensive tests

**Results:**
- **Coverage:** 98.5% (67/68 statements)
- **Bugs Found:** 3 critical issues
  - Transaction rollback missing on DB failure
  - Audit log reliability issues
  - Currency case sensitivity bug
- **Edge Cases:** 15+ scenarios tested
- **Time:** 50 seconds

**Quality Metrics:**
- Bug-Catching Potential: 92/100
- Maintainability: 88/100
- Edge Case Coverage: 95/100

[View Full Example →](./examples/typescript-payment-example.md)

### Example 2: Data Validator (Python)

**Input:** 58 lines of validation logic
**Output:** 625 lines of comprehensive tests

**Results:**
- **Coverage:** 100% (58/58 statements)
- **Bugs Found:** 4 issues
  - Subdomain email validation bug
  - Leap year age calculation error
  - Multiple @ symbol handling
  - Documentation inconsistency
- **Edge Cases:** 45+ scenarios tested
- **Time:** 51 seconds

**Quality Metrics:**
- Bug-Catching Potential: 94/100
- Edge Case Coverage: 98/100
- Maintainability: 91/100

[View Full Example →](./examples/python-data-validator-example.md)

---

## Supported Frameworks

### JavaScript/TypeScript
- **Jest:** Full support with mocking, spies, matchers
- **Vitest:** Modern Vite-based testing
- **Mocha + Chai:** Classic combination with Sinon mocks

### Python
- **Pytest:** Fixtures, parametrize, mocking
- **unittest:** Standard library testing

### Go
- **testing:** Table-driven tests
- **testify:** Assertions and mocking

### Rust
- **cargo test:** Built-in testing
- **mockall:** Mocking support

---

## Configuration

```json
{
  "testforge": {
    "defaultFramework": "vitest",
    "generateEdgeCases": true,
    "generateMocks": true,
    "coverageTarget": 85,
    "mutationTestingEnabled": false,
    "testNamingStyle": "descriptive",
    "assertionStyle": "expect",
    "maxTestsPerFunction": 15
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultFramework` | string | `vitest` | Testing framework to use |
| `generateEdgeCases` | boolean | `true` | Generate edge case tests |
| `generateMocks` | boolean | `true` | Auto-generate mocks |
| `coverageTarget` | number | `85` | Target coverage percentage |
| `mutationTestingEnabled` | boolean | `false` | Enable mutation testing |
| `testNamingStyle` | string | `descriptive` | Test naming convention |
| `assertionStyle` | string | `expect` | Assertion library style |
| `maxTestsPerFunction` | number | `15` | Max tests per function |

---

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/testforge:file` | Generate tests for file | `/testforge:file src/utils.ts` |
| `/testforge:function` | Generate tests for function | `/testforge:function validate` |
| `/testforge:coverage` | Increase coverage to target | `/testforge:coverage 85` |
| `/testforge:edge-cases` | Focus on edge cases | `/testforge:edge-cases src/auth.ts` |
| `/testforge:mocks` | Generate mocks for dependencies | `/testforge:mocks PaymentGateway` |
| `/testforge:integration` | Generate integration test scaffolds | `/testforge:integration api` |
| `/testforge:validate` | Validate generated tests | `/testforge:validate` |
| `/testforge:report` | Generate test quality report | `/testforge:report` |

---

## Metrics & Tracking

TestForge tracks:

- **Tests Generated:** Total number of tests created
- **Coverage Improvement:** Before/after coverage delta
- **Edge Cases Identified:** Number of edge cases found
- **Bugs Caught:** Bugs found by generated tests
- **Mutation Score:** Test quality via mutation testing
- **Generation Time:** Time to generate tests

---

## Integration with Other Plugins

### Testing Orchestrator
- Executes generated tests
- Validates coverage improvements
- Runs mutation testing

### Code Quality Orchestrator
- Enforces quality thresholds
- Prevents low-quality tests
- Gates PRs on test quality

### Git Workflow Orchestrator
- Auto-generates tests for PR changes
- Ensures new code has tests
- Prevents coverage regression

### Cognitive Code Reasoner
- Deep code analysis for behavior understanding
- Complex control flow analysis
- Risk assessment

---

## Best Practices

### ✅ DO

- **Focus on Behavior:** Test what the code does, not how
- **Test Edge Cases:** Null, empty, boundary, error scenarios
- **Meaningful Assertions:** Verify actual behavior
- **Proper Isolation:** Mock dependencies appropriately
- **Clear Names:** Describe what and why
- **Maintainable:** Easy to understand and update

### ❌ DON'T

- **Coverage Theater:** Tests that just execute code
- **Weak Assertions:** `expect(result).toBeDefined()`
- **Happy Path Only:** Missing edge cases
- **Brittle Tests:** Coupled to implementation
- **Unclear Names:** `test1()`, `testFunction()`
- **Over-Mocking:** Mocking everything unnecessarily

---

## Performance

### Typical Performance

| Metric | Value |
|--------|-------|
| **Small File (50 lines)** | 30-45 seconds |
| **Medium File (200 lines)** | 2-4 minutes |
| **Large File (500 lines)** | 5-8 minutes |
| **Coverage Boost (20%)** | 6-10 minutes |

### Optimization

- **Parallel Execution:** Agents run in parallel when possible
- **Smart Caching:** Reuses analysis results
- **Incremental Generation:** Generates tests in batches
- **Model Selection:** Opus for strategy, Sonnet for generation, Haiku for adaptation

---

## Troubleshooting

### Tests Don't Compile

**Cause:** Framework detection failed or wrong imports
**Solution:** Specify framework explicitly: `/testforge:file --framework=jest`

### Low Quality Scores

**Cause:** Generated tests too simple or weak assertions
**Solution:** Enable mutation testing: `mutationTestingEnabled: true`

### Missing Edge Cases

**Cause:** Complex logic not fully analyzed
**Solution:** Use Cognitive Code Reasoner integration for deeper analysis

### Coverage Not Increasing

**Cause:** Tests generated but not covering right paths
**Solution:** Review uncovered paths: `/testforge:report`

---

## Contributing

TestForge is part of the Claude orchestration plugin ecosystem. To contribute:

1. Review [Plugin Development Guide](../../docs/plugin-development.md)
2. Add new agent capabilities in `agents/`
3. Extend framework support in `templates/`
4. Improve edge case detection in `skills/edge-case-enumeration.md`

---

## License

MIT License - See [LICENSE](../../LICENSE)

---

## Support

- **Documentation:** [Full Documentation](./docs/)
- **Examples:** [Real-World Examples](./examples/)
- **Issues:** [GitHub Issues](https://github.com/Lobbi-Docs/claude/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Lobbi-Docs/claude/discussions)

---

**TestForge** - Because test coverage means nothing if the tests don't catch bugs.
