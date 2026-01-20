# Test Execution Quick Reference
## Fast Access Guide for Testing Commands and Workflows

---

## One-Command Test Execution

```bash
# Everything (unit + integration + e2e)
npm run test

# Just coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch

# Debug with browser inspector
npm run test:debug
```

---

## Test Level Breakdown

```bash
# Unit Tests Only (Fast - ~10s)
npm run test:unit

# Integration Tests (Medium - ~30s)
npm run test:integration

# E2E Tests (Slow - ~5min)
npm run test:e2e

# Performance Tests
npm run test:performance
```

---

## By Plugin

```bash
# Jira Orchestrator
npm run test -- jira-orchestrator

# Exec Automator
npm run test -- exec-automator

# Ahling Command Center
npm run test -- ahling-command-center

# Container Workflow
npm run test -- container-workflow

# Frontend Powerhouse
npm run test -- frontend-powerhouse
```

---

## Specific Test Files

```bash
# Run single test file
npm run test -- tests/unit/my-test.test.ts

# Run tests matching pattern
npm run test -- --grep "Agent"
npm run test -- --grep "CommandExecution"

# Run all tests with "work" in name
npm run test -- --grep "work"
```

---

## Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# View HTML report
npm run coverage:report
# or manually: open coverage/index.html

# Check specific file coverage
npm run test:coverage -- tests/unit/agent.test.ts

# Generate LCOV for CI
npm run test:coverage -- --reporter=lcov
```

---

## Debugging & Development

```bash
# Watch mode for development
npm run test:watch

# Run single test file in watch
npm run test:watch -- tests/unit/agent.test.ts

# Debug with Node inspector
npm run test:debug
# Then: chrome://inspect (Chrome DevTools)

# Verbose output
npm run test -- --reporter=verbose

# Show test output during run
npm run test -- --reporter=default --no-colors
```

---

## CI/CD Integration

```bash
# GitHub Actions trigger
git push origin feature-branch
# → Automatically runs: test + lint + coverage checks

# Pre-commit hook (if configured)
git add .
git commit -m "message"
# → Automatically runs: test:unit + lint

# Manual CI check
npm run test:run  # All tests in CI mode
npm run lint      # Code style check
npm run typecheck # Type checking
```

---

## Common Test Scenarios

### Happy Path
```bash
# Test successful workflows
npm run test -- --grep "happy path|should complete|should succeed"
```

### Error Handling
```bash
# Test error scenarios
npm run test -- --grep "should handle|error|fail|catch"
```

### Edge Cases
```bash
# Test edge cases
npm run test -- --grep "edge|boundary|limit|concurrent"
```

### Performance
```bash
# Test performance targets
npm run test -- tests/performance --reporter=verbose
```

---

## Fix Common Test Issues

### Tests Failing Locally But Passing in CI
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear vitest cache
npm run test -- --clearCache

# Run with specific Node version
nvm use 20
npm run test
```

### Flaky Tests
```bash
# Run test multiple times to catch flakiness
npm run test -- --reporter=verbose test/flaky.test.ts
for i in {1..10}; do npm run test -- test/flaky.test.ts; done

# Run with longer timeout
npm run test -- --testTimeout=60000
```

### Memory Issues
```bash
# Run single-threaded
npm run test -- --no-threads

# Run with memory monitoring
node --max-old-space-size=4096 node_modules/vitest/vitest.mjs run
```

### Coverage Not Meeting Threshold
```bash
# Generate detailed coverage report
npm run test:coverage -- --reporter=html

# Find uncovered files
npm run test:coverage -- --reporter=text

# Target specific file
npm run test:coverage tests/unit/my-file.test.ts
```

---

## Pre-PR Checklist

```bash
# 1. Run all tests
npm run test:run

# 2. Check coverage
npm run test:coverage
# Verify: lines >= 90%, functions >= 90%, branches >= 85%

# 3. Lint code
npm run lint

# 4. Type check
npm run typecheck

# 5. Build
npm run build
```

---

## Performance Benchmarking

```bash
# Run performance tests
npm run test:performance

# View performance results
npm run test:performance -- --reporter=verbose

# Compare with baseline
npm run test:performance -- --baseline

# Profile test execution
npm run test -- --inspect --single-thread tests/performance
```

---

## Test Results Interpretation

### Coverage Report
```
Lines: 92/100 (92%)        ✅ Exceeds 90% target
Functions: 48/50 (96%)     ✅ Exceeds 90% target
Branches: 78/90 (87%)      ✅ Meets 85% target
Statements: 150/160 (94%)  ✅ Exceeds 90% target
```

### Test Results
```
✓ 1,045 passed
✗ 0 failed
⊘ 5 skipped
⚠ 0 warnings

All tests passed! ✅
Coverage gates passed! ✅
```

---

## GitHub Actions Workflows

### On Push to Main
- Runs: unit + integration + E2E tests
- Coverage must be >= 85%
- All tests must pass
- Duration: ~10 minutes

### On Pull Request
- Runs: unit + integration tests (fast feedback)
- Coverage check
- Code style check
- Duration: ~5 minutes

### Nightly Full Suite
- Runs: all tests + performance benchmarks
- Generates trend reports
- Identifies flaky tests
- Duration: ~20 minutes

---

## Test Lifecycle

```
┌─────────────────────────────────────────────────┐
│ 1. Developer makes code change                  │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ 2. git add && git commit (triggers pre-commit)   │
│    → npm run test:unit (fails if tests fail)     │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ 3. git push origin feature-branch                │
│    → GitHub Actions workflow triggered            │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────┬──────────────────┐
│ 4a. Run tests on PR          │ 4b. Run full      │
│   - unit tests               │   suite nightly   │
│   - integration tests        │   - all tests     │
│   - coverage check           │   - benchmarks    │
│   - code style               │   - trend report  │
└──────────────────────────────┴──────────────────┘
           │                         │
           ▼                         ▼
┌─────────────────────────────────────────────────┐
│ 5. PR approved + CI passes                       │
│    → Merge to main                               │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ 6. Full test suite runs on main                  │
│    → Deploy if all pass                          │
└─────────────────────────────────────────────────┘
```

---

## Useful Aliases (Add to .bashrc/.zshrc)

```bash
# Quick test shortcuts
alias t='npm run test:run'
alias tw='npm run test:watch'
alias tc='npm run test:coverage'
alias tu='npm run test:unit'
alias ti='npm run test:integration'
alias te='npm run test:e2e'
alias tp='npm run test:performance'

# View coverage
alias cov='npm run coverage:report'

# Full CI check
alias ci-check='npm run lint && npm run typecheck && npm run test:run && npm run test:coverage'

# Run before commit
alias pre-commit='npm run test:unit && npm run lint'
```

---

## Monitoring Test Health

### Daily Check
```bash
npm run test:unit    # Should complete in <30s
npm run test:integration  # Should complete in <60s
```

### Weekly Review
```bash
# Check coverage trend
npm run test:coverage

# Review slowest tests
npm run test -- --reporter=verbose | grep "duration"

# Check for flaky tests
npm run test:run -- --reporter=default 2>&1 | grep -i flak
```

### Monthly Maintenance
```bash
# Clean up old test artifacts
rm -rf .vitest
rm -rf coverage-old

# Update test dependencies
npm update --save-dev vitest @vitest/coverage-v8

# Audit test health
node scripts/audit-test-health.js
```

---

## Environment Variables for Testing

```bash
# Enable debug logging
DEBUG=* npm run test

# Set specific test timeout
TEST_TIMEOUT=60000 npm run test

# Run with specific Node env
NODE_ENV=test npm run test

# Disable parallelization
VITEST_THREADS=1 npm run test

# Verbose output
VITEST_REPORTER=verbose npm run test
```

---

## Integration with IDEs

### VS Code
```json
{
  "extensions": {
    "vitest.explorer": "Install Vitest extension",
    "vitest.run": "CMD+SHIFT+T to run test"
  }
}
```

### WebStorm/IntelliJ
```
- Right-click test file → Run 'filename'
- Or: Select test → CMD+SHIFT+R
- View → Tool Windows → Run
```

### Vim/Neovim
```bash
# Run test for current file
:!npm run test -- %

# Run with grep pattern
:!npm run test -- --grep <pattern>
```

---

## Emergency Procedures

### Tests Breaking After Upgrade
```bash
# Revert to last known good version
git revert <commit-hash>

# Reinstall exact dependencies
rm package-lock.json
npm install

# Check for breaking changes
npm run test:unit
```

### CI Pipeline Stuck
```bash
# Clear all caches
npm run test -- --clearCache
rm -rf .vitest node_modules/.cache

# Force re-run
git commit --allow-empty -m "Trigger CI"
git push
```

### Memory Leak in Tests
```bash
# Run with heap snapshot
node --inspect-brk node_modules/vitest/vitest.mjs run

# Profile with clinic.js
npm install -g clinic
clinic doctor -- npm run test:unit
```

---

## Test Metrics Dashboard

View real-time metrics:
```
Dashboard URL: https://your-org.example.com/test-metrics

Displays:
- Overall test pass rate
- Coverage trend (weekly)
- Slowest tests
- Flaky test detection
- CI pipeline health
```

---

## Support & Resources

```
📚 Full Documentation
   → See TEST_STRATEGY.md for comprehensive guide
   → See TESTING_IMPLEMENTATION_GUIDE.md for setup details
   → See PLUGIN_TEST_SCENARIOS.md for specific plugin tests

💬 Getting Help
   → #testing channel in Slack
   → Create issue: github.com/your-org/repo/issues

🔗 Links
   → Vitest docs: https://vitest.dev
   → Coverage thresholds: .vitest.config.ts
   → CI config: .github/workflows/test.yml
```

---

## Quick Decision Tree

```
⁉️  What should I run?

  ↓
  Making local changes?
  → npm run test:watch

  ↓
  Ready to commit?
  → npm run test:unit

  ↓
  Creating PR?
  → npm run test:integration

  ↓
  Need full validation?
  → npm run test:run

  ↓
  Performance critical code?
  → npm run test:performance

  ↓
  Checking coverage?
  → npm run test:coverage
```

---

**Last Updated:** 2025-12-26
**Status:** Ready for Production Use

