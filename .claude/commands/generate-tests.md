# Test Suite Generation

Generate comprehensive test suites for the codebase with focus on coverage and quality:

## Test Strategy
- Identify untested or under-tested code paths
- Generate unit tests for individual functions/methods
- Create integration tests for component interactions
- Add end-to-end tests for critical user flows
- Include edge cases and error scenarios

## Test Types to Generate
1. **Unit Tests**
   - Pure function testing
   - Component testing (React, Vue, etc.)
   - Service/utility testing
   - Mock external dependencies

2. **Integration Tests**
   - API endpoint testing
   - Database interaction testing
   - Service integration testing
   - Third-party integration testing

3. **Edge Cases**
   - Boundary conditions
   - Null/undefined handling
   - Empty arrays/objects
   - Invalid input handling
   - Error scenarios

4. **Performance Tests** (where applicable)
   - Load testing
   - Stress testing
   - Benchmark tests

## Test Framework Guidelines
- Use existing test framework (Jest, Mocha, Pytest, etc.)
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Include setup and teardown
- Mock external dependencies appropriately
- Aim for high code coverage (>80%)

## Output
Generate test files with:
- Clear test descriptions
- Comprehensive assertions
- Proper mocking/stubbing
- Comments explaining complex test logic
- Coverage for happy path and error cases

Report current test coverage and areas needing attention.
