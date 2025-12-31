# Example Session #1: Intermittent Test Failure (Race Condition)

**Scenario:** E2E test for checkout flow passes 70% of the time, fails 30%. Team has been debugging for 2 days.

## Initial Report

```
Test: "User can complete checkout"
Status: Flaky (70% pass, 30% fail)
Error: "Expected button 'Place Order' to be enabled, but it was disabled"
Duration: 30 seconds when passes, 15 seconds when fails
```

## Debug Detective Investigation

### Phase 1: Initial Analysis (2 minutes)

**Hypothesis Agent activates**, analyzes symptoms:

```typescript
{
  symptom: "Intermittent test failure (30% fail rate)",
  pattern: "Flaky test - suggests race condition or timing issue",

  hypotheses: [
    {
      id: "H1",
      statement: "Test checks button state before async validation completes",
      confidence: 85,
      reasoning: "Fast failures (15s) vs slow passes (30s) suggests timing dependency",
      priority: 1
    },
    {
      id: "H2",
      statement: "API call to validate payment sometimes slow/times out",
      confidence: 70,
      reasoning: "30% failure could be network instability",
      priority: 2
    },
    {
      id: "H3",
      statement: "Form validation racing with button state update",
      confidence: 60,
      reasoning: "Common React state update race",
      priority: 3
    }
  ]
}
```

### Phase 2: Race Condition Detection (5 minutes)

**Race Detector Agent activates**, runs analysis:

```typescript
const raceAnalysis = {
  approach: "Add timing logs to understand event sequence",

  experiment: {
    modify: "test/e2e/checkout.spec.ts",
    addLogs: `
      // Before clicking "Place Order"
      await page.evaluate(() => {
        console.log('[TEST]', Date.now(), 'Checking button state');
      });

      // Listen to network
      page.on('request', req => {
        console.log('[REQUEST]', Date.now(), req.url());
      });

      page.on('response', res => {
        console.log('[RESPONSE]', Date.now(), res.url(), res.status());
      });
    `
  },

  runResults: {
    passingRun: [
      "[TEST] 1000 Clicking 'Place Order'",
      "[REQUEST] 1005 /api/validate-payment",
      "[RESPONSE] 1100 /api/validate-payment 200",
      "[TEST] 1105 Button enabled ✓"
    ],

    failingRun: [
      "[TEST] 1000 Clicking 'Place Order'",
      "[REQUEST] 1005 /api/validate-payment",
      "[TEST] 1010 Button still disabled ✗",  // ← Checked too early!
      "[RESPONSE] 1150 /api/validate-payment 200"  // ← Arrived after check
    ]
  },

  conclusion: "H1 CONFIRMED: Test checks button before validation response"
};
```

### Phase 3: Evidence Collection (3 minutes)

**Evidence Collector Agent** verifies:

```typescript
const evidence = {
  experiment: "Add artificial delays at various points",

  tests: [
    {
      scenario: "No delays",
      passRate: 70
    },
    {
      scenario: "500ms delay before button check",
      passRate: 100  // ← Always passes!
    },
    {
      scenario: "100ms delay before button check",
      passRate: 95   // Still helps
    }
  ],

  conclusion: "Test needs to wait for async validation before checking button",
  confidence: 100
};
```

### Phase 4: Root Cause (1 minute)

```typescript
const rootCause = {
  type: "test_race_condition",
  file: "test/e2e/checkout.spec.ts",
  line: 45,

  problem: `
    Test code:
      await page.click('button:text("Place Order")');
      const isEnabled = await page.isEnabled('button:text("Place Order")');
      expect(isEnabled).toBe(true);

    Issue: No waiting for async validation to complete before assertion
  `,

  fix: `
    await page.click('button:text("Place Order")');

    // Wait for button to be enabled (validation complete)
    await page.waitForSelector('button:text("Place Order"):not([disabled])', {
      timeout: 5000
    });

    const isEnabled = await page.isEnabled('button:text("Place Order")');
    expect(isEnabled).toBe(true);
  `
};
```

### Phase 5: Solution (5 minutes)

**State Inspector Agent** suggests proper waiting strategy:

```typescript
const solution = {
  before: `
    // BAD: Races with async validation
    await page.click('button:text("Place Order")');
    expect(await page.isEnabled('button:text("Place Order")')).toBe(true);
  `,

  after: `
    // GOOD: Waits for async validation
    await page.click('button:text("Place Order")');

    // Wait for button to become enabled (validation complete)
    await expect(page.locator('button:text("Place Order")')).toBeEnabled({
      timeout: 5000
    });
  `,

  verification: {
    runs: 100,
    passes: 100,
    passRate: 100,
    avgDuration: "2.3 seconds"
  }
};
```

### Results

**Before Debug Detective:**
- Time spent: 2 days (16 hours)
- Root cause: Not found
- Test stability: 70%
- Team frustration: High

**With Debug Detective:**
- Time spent: 16 minutes
- Root cause: Test racing with async validation
- Test stability: 100% (after fix)
- Team frustration: Zero

**Key Insight:**
The Race Detector Agent immediately recognized the pattern:
- Fast failures (test doesn't wait)
- Slow passes (validation happens to complete in time)
- 30% failure rate (depends on API response time)

This is a textbook async race condition that took 2 days to debug manually, but 16 minutes with systematic debugging.

---

## Lesson Learned

**Added to Regression Suite:**
```typescript
// tests/patterns/race-conditions.test.ts

test('E2E tests should wait for async operations', async () => {
  // Anti-pattern detection: Check for assertions without waits
  const testFiles = await glob('tests/e2e/**/*.spec.ts');

  for (const file of testFiles) {
    const content = await readFile(file, 'utf-8');

    // Look for immediate assertions after async operations
    const hasRacePattern =
      /await page\.click.*\n.*expect.*isEnabled/.test(content);

    if (hasRacePattern) {
      throw new Error(
        `Potential race condition in ${file}:\n` +
        `Assertion immediately after click without waiting.\n` +
        `Use waitForSelector or Playwright's auto-waiting matchers.`
      );
    }
  }
});
```

**Prevention:**
- Added linting rule to detect race patterns
- Updated E2E testing guide
- Added to code review checklist
