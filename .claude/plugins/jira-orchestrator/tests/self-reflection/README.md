# Self-Reflection Engine Tests

This directory contains comprehensive tests for the Self-Reflection Engine (v5.0 Feature).

## Test Files

### 1. `test_reflection_engine.ts`
Tests the core self-reflection loop functionality:
- Configuration management
- Reflection loop execution
- Quality score calculation
- Task augmentation with improvements
- Error handling
- Performance benchmarks

**Coverage:**
- ✅ Configuration validation
- ✅ Single iteration when threshold met
- ✅ Multiple iterations when quality low
- ✅ Maximum iteration limits
- ✅ Thinking token tracking
- ✅ Weighted quality scoring
- ✅ Task augmentation with feedback
- ✅ Error handling and edge cases

### 2. `test_quality_scoring.ts`
Tests individual quality criteria evaluators:
- CorrectnessEvaluator
- CompletenessEvaluator
- ActionabilityEvaluator
- BestPracticesEvaluator

**Coverage:**
- ✅ Score calculation (0.0-1.0 range)
- ✅ Reasoning generation
- ✅ Actionable suggestions
- ✅ Confidence levels
- ✅ Context handling
- ✅ Malformed response handling
- ✅ Score boundary clamping
- ✅ Parallel evaluation
- ✅ Weighted scoring

## Running Tests

### Prerequisites
```bash
npm install --save-dev @types/jest @types/node jest ts-jest typescript
```

### Run All Tests
```bash
npm test -- tests/self-reflection/
```

### Run Specific Test File
```bash
npm test -- tests/self-reflection/test_reflection_engine.ts
npm test -- tests/self-reflection/test_quality_scoring.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/self-reflection/
```

### Watch Mode (for development)
```bash
npm test -- --watch tests/self-reflection/
```

## Test Structure

Each test file follows this structure:

1. **Mock LLM Client**: Simulates LLM API calls for testing
2. **Test Fixtures**: Sample data for consistent testing
3. **Unit Tests**: Test individual components in isolation
4. **Integration Tests**: Test component interactions
5. **Error Handling Tests**: Verify graceful error handling
6. **Performance Tests**: Ensure acceptable performance

## Expected Test Results

### ✅ Passing Criteria

All tests should pass with:
- **Test Coverage**: ≥ 85%
- **Execution Time**: < 5 seconds total
- **No Failures**: All assertions passing
- **No Warnings**: Clean test output

### 📊 Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| SelfReflectionEngine | 90% | TBD |
| Evaluators | 85% | TBD |
| Utilities | 80% | TBD |
| **Overall** | **85%** | **TBD** |

## Test Data

### Mock LLM Responses

Tests use mock LLM responses that simulate realistic scores:
- Correctness: 0.88 (Good with minor issues)
- Completeness: 0.92 (Excellent coverage)
- Actionability: 0.85 (Clear and specific)
- Best Practices: 0.78 (Needs some improvement)

These scores are calibrated to:
1. Test threshold logic (some pass, some fail)
2. Trigger iteration logic
3. Validate weighted scoring
4. Exercise improvement suggestions

### Sample Outputs

Tests evaluate various output types:
- **Code**: TypeScript/JavaScript code snippets
- **Documentation**: Markdown documentation
- **Test Strategy**: Test plan JSON
- **PR Description**: Pull request descriptions

## Continuous Integration

### GitHub Actions Integration

Add to `.github/workflows/test.yml`:
```yaml
- name: Run Self-Reflection Tests
  run: npm test -- tests/self-reflection/

- name: Check Test Coverage
  run: npm test -- --coverage tests/self-reflection/

- name: Verify Coverage Threshold
  run: |
    coverage=$(npm test -- --coverage tests/self-reflection/ | grep "All files" | awk '{print $3}')
    if (( $(echo "$coverage < 85" | bc -l) )); then
      echo "Coverage $coverage% is below 85% threshold"
      exit 1
    fi
```

## Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose tests/self-reflection/
```

### Run Single Test
```bash
npm test -- --testNamePattern="should execute single iteration" tests/self-reflection/
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "${fileBasename}",
    "--config",
    "jest.config.js"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Known Issues

### Issue 1: TypeScript Import Paths
If you encounter module resolution errors:
```bash
# Ensure tsconfig.json has correct paths:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["lib/*"]
    }
  }
}
```

### Issue 2: Mock LLM Client Type Errors
If TypeScript complains about mock LLM client:
```typescript
// Use 'any' type for flexible mocking in tests
const llmClient: any = new MockLLMClient();
```

## Contributing

When adding new tests:
1. Follow existing test structure
2. Add descriptive test names
3. Include both positive and negative cases
4. Test edge cases and boundaries
5. Maintain ≥85% coverage
6. Update this README with new test categories

## Version History

- **v1.0.0** (2025-12-29): Initial test suite for v5.0 self-reflection engine
  - 50+ unit tests
  - 15+ integration tests
  - 10+ error handling tests
  - 5+ performance tests

## Support

For questions or issues with tests:
1. Check test output for detailed error messages
2. Review mock LLM client configuration
3. Verify test fixtures match expected format
4. Consult self-reflection-engine.ts implementation
5. Open an issue with test failure details
