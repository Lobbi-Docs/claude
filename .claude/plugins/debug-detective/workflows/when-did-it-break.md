# Workflow: "When did this break?"

**Scenario:** Feature that used to work is now broken. Need to find when the regression was introduced.

## Workflow Overview

```
Confirm Regression → Git Bisect → Identify Culprit → Analyze Change → Fix & Prevent
```

## Agents Involved

- **Regression Hunter Agent** (Primary Coordinator)
- **Bisect Agent** (Primary Investigator)
- **Hypothesis Agent** (For analyzing breaking change)
- **Evidence Collector Agent** (For verification)
- **Stack Trace Agent** (If error occurs)

## Step-by-Step Process

### Phase 1: Confirm Regression (5 minutes)

**Lead: Regression Hunter Agent**

1. **Document Symptom**
   ```typescript
   const regression = {
     feature: "User authentication",
     symptom: "Login button doesn't respond, no error in console",
     reportedBy: "QA team",
     reportedAt: "2023-12-20",
     affectedEnvironment: "production",
     severity: "critical"
   };
   ```

2. **Verify in Previous Version**
   ```bash
   # Checkout last known good version
   git checkout v1.2.0
   npm install
   npm start

   # Test: Login button works ✓

   # Checkout current version
   git checkout main
   npm install
   npm start

   # Test: Login button doesn't work ✗

   # CONFIRMED: Regression between v1.2.0 and main
   ```

3. **Define Success Criteria**
   ```typescript
   const testCriteria = {
     test: "Click login button → Form submits → User logged in",
     passing: "v1.2.0",
     failing: "main (current)",
     commitRange: {
       good: "v1.2.0 (commit a1a1a1a)",
       bad: "main (commit f9f9f9f)",
       totalCommits: 87
     }
   };
   ```

### Phase 2: Automated Bisect (15-30 minutes)

**Lead: Bisect Agent**

4. **Setup Automated Test**
   ```typescript
   // scripts/test-login.js
   const puppeteer = require('puppeteer');

   async function testLogin() {
     const browser = await puppeteer.launch();
     const page = await browser.newPage();

     try {
       await page.goto('http://localhost:3000/login');

       // Fill form
       await page.type('#email', 'test@example.com');
       await page.type('#password', 'password123');

       // Click submit
       await page.click('button[type="submit"]');

       // Wait for redirect (should go to /dashboard)
       await page.waitForNavigation({ timeout: 5000 });

       const url = page.url();

       if (url.includes('/dashboard')) {
         console.log('PASS: Login successful');
         process.exit(0);  // Good commit
       } else {
         console.log('FAIL: Not redirected to dashboard');
         process.exit(1);  // Bad commit
       }
     } catch (error) {
       console.log('FAIL:', error.message);
       process.exit(1);  // Bad commit
     } finally {
       await browser.close();
     }
   }

   testLogin();
   ```

5. **Run Git Bisect**
   ```bash
   # Start bisect
   git bisect start
   git bisect bad main
   git bisect good v1.2.0

   # Git calculates: ~7 steps for 87 commits

   # Create bisect run script
   cat > bisect-test.sh << 'EOF'
   #!/bin/bash
   npm install --silent
   npm run build --silent
   npm start > /dev/null 2>&1 &
   SERVER_PID=$!
   sleep 5  # Wait for server
   node scripts/test-login.js
   RESULT=$?
   kill $SERVER_PID
   exit $RESULT
   EOF

   chmod +x bisect-test.sh

   # Run automated bisect
   git bisect run ./bisect-test.sh
   ```

6. **Bisect Results**
   ```typescript
   const bisectSession = {
     totalSteps: 7,
     commits: [
       { commit: "c5c5c5c", result: "good", message: "feat: add user preferences" },
       { commit: "d8d8d8d", result: "good", message: "fix: update dependencies" },
       { commit: "e2e2e2e", result: "bad",  message: "refactor: modernize event handlers" },
       { commit: "d4d4d4d", result: "good", message: "chore: update README" },
       { commit: "d9d9d9d", result: "good", message: "feat: add analytics" },
       { commit: "e1e1e1e", result: "bad",  message: "refactor: convert to React hooks" },
       { commit: "e0e0e0e", result: "bad",  message: "refactor: use onChange instead of onClick" }
     ],

     culprit: {
       commit: "e0e0e0e",
       message: "refactor: use onChange instead of onClick",
       author: "Jane Smith",
       date: "2023-12-15",
       filesChanged: ["components/LoginForm.tsx"]
     }
   };
   ```

### Phase 3: Analyze Breaking Change (10 minutes)

**Lead: Hypothesis Agent**

7. **Examine Culprit Commit**
   ```bash
   git show e0e0e0e
   ```

   ```diff
   commit e0e0e0e
   Author: Jane Smith <jane@example.com>
   Date:   Fri Dec 15 14:30:00 2023 -0800

       refactor: use onChange instead of onClick

   diff --git a/components/LoginForm.tsx b/components/LoginForm.tsx
   index abc123..def456 100644
   --- a/components/LoginForm.tsx
   +++ b/components/LoginForm.tsx
   @@ -10,7 +10,7 @@ export function LoginForm() {

      return (
        <form onSubmit={handleSubmit}>
   -      <button type="submit" onClick={handleSubmit}>
   +      <button type="submit" onChange={handleSubmit}>
            Login
          </button>
        </form>
   ```

8. **Identify Problem**
   ```typescript
   const analysis = {
     change: "Changed onClick to onChange on submit button",

     problem: `
       Buttons don't fire onChange events, only onClick!

       Before: onClick={handleSubmit} → Works ✓
       After: onChange={handleSubmit} → Never fires ✗

       Form submission was broken because onChange never fires on button.
     `,

     whyItHappened: `
       Likely overzealous refactoring - developer was changing
       onChange handlers throughout the codebase and mistakenly
       changed onClick to onChange on the button.
     `,

     impact: {
       severity: "critical",
       affectedUsers: "100% (complete login failure)",
       downtime: "5 days (since commit was merged)"
     }
   };
   ```

### Phase 4: Verify Root Cause (5 minutes)

**Lead: Evidence Collector Agent**

9. **Test Fix Hypothesis**
   ```typescript
   const experiment = {
     hypothesis: "Changing onChange back to onClick will fix login",

     test: `
       // In components/LoginForm.tsx
       - <button type="submit" onChange={handleSubmit}>
       + <button type="submit" onClick={handleSubmit}>

       Result: Login works ✓
     `,

     conclusion: "CONFIRMED: onChange → onClick fixes the issue"
   };
   ```

### Phase 5: Implement Solution (15 minutes)

10. **Choose Fix Strategy**
    ```typescript
    const fixOptions = [
      {
        approach: "Revert Commit",
        command: "git revert e0e0e0e",
        pros: ["Fast", "Safe", "Automatic"],
        cons: ["Creates revert commit in history"],
        timeToFix: "5 minutes",
        recommended: true
      },
      {
        approach: "Manual Fix",
        command: "Edit file, commit fix",
        pros: ["Clean history", "Can improve code"],
        cons: ["Manual work", "Error-prone"],
        timeToFix: "15 minutes",
        recommended: false
      },
      {
        approach: "Cherry-pick Good Version",
        command: "git checkout v1.2.0 -- components/LoginForm.tsx",
        pros: ["Restores known-good version"],
        cons: ["May lose other changes to file"],
        timeToFix: "10 minutes",
        recommended: false
      }
    ];

    const chosen = fixOptions[0]; // Revert commit
    ```

11. **Apply Fix**
    ```bash
    # Revert the breaking commit
    git revert e0e0e0e

    # Git creates revert commit:
    commit r1r1r1r
    Revert "refactor: use onChange instead of onClick"

    This reverts commit e0e0e0e which broke login by changing
    onClick to onChange on the submit button. Buttons don't
    fire onChange events.

    Fixes: #JIRA-567
    ```

12. **Verify Fix**
    ```bash
    # Run test
    npm start &
    sleep 5
    node scripts/test-login.js

    # Output: PASS: Login successful ✓
    ```

### Phase 6: Prevent Recurrence (20 minutes)

**Lead: Regression Hunter Agent**

13. **Add Regression Test**
    ```typescript
    // tests/regressions/JIRA-567-login-button.test.tsx

    /**
     * Regression test for JIRA-567
     *
     * Bug: Login button didn't work due to onChange instead of onClick
     * Fixed: Reverted to onClick
     * Date: 2023-12-20
     * Culprit: commit e0e0e0e
     */
    describe('JIRA-567: Login button regression', () => {
      test('submit button uses onClick, not onChange', () => {
        const { container } = render(<LoginForm />);
        const button = container.querySelector('button[type="submit"]');

        // Verify onClick handler exists
        expect(button).toHaveAttribute('onClick');

        // Verify no onChange handler (buttons don't use onChange)
        expect(button).not.toHaveAttribute('onChange');
      });

      test('clicking submit button triggers form submission', async () => {
        const handleSubmit = jest.fn();
        render(<LoginForm onSubmit={handleSubmit} />);

        const button = screen.getByRole('button', { name: /login/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(handleSubmit).toHaveBeenCalled();
        });
      });

      test('login flow works end-to-end', async () => {
        render(<App />);

        // Navigate to login
        await navigateTo('/login');

        // Fill form
        await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');

        // Click login
        await userEvent.click(screen.getByRole('button', { name: /login/i }));

        // Should redirect to dashboard
        await waitFor(() => {
          expect(window.location.pathname).toBe('/dashboard');
        });
      });
    });
    ```

14. **Add Pre-Commit Check**
    ```bash
    # .husky/pre-commit

    #!/bin/bash

    # Run regression test suite before every commit
    echo "Running regression tests..."
    npm run test:regression

    if [ $? -ne 0 ]; then
      echo "❌ Regression tests failed. Commit blocked."
      echo "Ensure your changes don't break previously fixed bugs."
      exit 1
    fi

    echo "✅ Regression tests passed"
    ```

15. **Document in Runbook**
    ```markdown
    ## Known Issues

    ### JIRA-567: Login Button Change Handler

    **Symptom:** Login button doesn't respond
    **Cause:** Button uses onChange instead of onClick
    **Detection:** Regression test: JIRA-567-login-button.test.tsx
    **Fix:** Ensure submit button uses onClick, not onChange

    **History:**
    - Introduced: commit e0e0e0e (2023-12-15)
    - Fixed: commit r1r1r1r (2023-12-20)
    - Downtime: 5 days
    - Impact: 100% of login attempts

    **Prevention:**
    - Regression test added
    - Pre-commit hook runs regression suite
    - Code review checklist updated
    ```

## Timeline

```
Total Time: ~55 minutes (excluding downtime before detection)

0:00 - Regression reported
0:05 - Confirmed regression (works in v1.2.0, fails in main)
0:35 - Git bisect completed (7 steps, automated)
0:45 - Breaking change analyzed
0:50 - Root cause verified
0:55 - Fix applied and verified
1:15 - Regression tests added
```

## Success Metrics

- ✅ Culprit commit found (e0e0e0e)
- ✅ Breaking change identified (onChange → onClick)
- ✅ Fix applied and verified (git revert)
- ✅ Regression test added (prevents recurrence)
- ✅ Time to resolution: 55 minutes
- ✅ Automated detection: Pre-commit hook

## Learnings

**What Went Wrong:**
1. Breaking change merged without adequate testing
2. No E2E test for login flow
3. Code review didn't catch semantic error
4. 5 days before regression was detected

**Improvements:**
1. ✅ Added regression test for login flow
2. ✅ Added pre-commit hook to run regression suite
3. ✅ Updated code review checklist
4. ✅ Documented incident in runbook
5. 🔄 TODO: Add E2E test coverage for critical flows
6. 🔄 TODO: Improve monitoring/alerting for login failures

**Process Improvements:**
- Require E2E tests for UI changes
- Add automated smoke tests in CI/CD
- Implement canary deployments
- Add feature flags for risky changes
