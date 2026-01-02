---
name: jira:review
description: Run comprehensive code review on changes for a Jira issue with security, performance, quality, and accessibility analysis
arguments:
  - name: issue_key
    description: Jira issue key to review changes for (e.g., ABC-123)
    required: true
  - name: scope
    description: Review scope - security|performance|quality|accessibility|full
    default: full
  - name: fix
    description: Auto-fix issues where possible (true|false)
    default: false
---

# Jira Issue Code Review

You are running a comprehensive code review for a **Jira issue**. This command analyzes all changes associated with the issue and provides detailed quality, security, performance, and accessibility feedback.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:review - {duration}`

### Issue Key Detection Priority
1. Command argument (e.g., `${issue_key}`)
2. Git branch name (e.g., `feature/PROJ-123-desc`)
3. Environment variable `JIRA_ISSUE_KEY`
4. Current orchestration session

### Configuration
Time logging can be configured in `jira-orchestrator/config/time-logging.yml`:
- `enabled`: Toggle auto-logging (default: true)
- `threshold_seconds`: Minimum duration to log (default: 60)
- `format`: Worklog comment format (default: "[Claude] {command} - {duration}")

---

## Issue Details

**Issue Key:** ${issue_key}
**Review Scope:** ${scope}
**Auto-Fix Enabled:** ${fix}

## Step 1: Validate Issue and Fetch Details

First, validate the issue key and fetch issue metadata from Jira.

### Actions:
```
1. Validate issue key matches pattern: [A-Z]+-[0-9]+
2. If invalid, respond with error and exit
3. Use mcp__atlassian__jira_get_issue to fetch issue details
4. Extract:
   - summary: Issue title
   - description: Full description
   - status: Current status
   - assignee: Who is working on it
   - labels: All labels
   - issuetype: Bug, Story, Task, etc.
5. If issue not found, respond with error and exit
```

## Step 2: Identify Changed Files

Determine which files were modified for this issue.

### Detection Strategy:

**Option A: Branch-based Detection**
```bash
# If working on feature branch
git branch --show-current

# If branch name contains issue key (e.g., feature/ABC-123-description)
if [[ $(git branch --show-current) =~ ${issue_key} ]]; then
  # Compare against main/master
  git diff --name-only origin/main...HEAD
  git diff --stat origin/main...HEAD
fi
```

**Option B: Commit-based Detection**
```bash
# Find all commits referencing this issue key
git log --all --oneline --grep="${issue_key}" --format="%H"

# Get files changed in those commits
git log --all --grep="${issue_key}" --name-only --pretty=format: | sort -u
```

**Option C: Session-based Detection**
```bash
# Check orchestration session directory
SESSION_DIR=".claude/sessions/${issue_key}"
if [ -d "$SESSION_DIR" ]; then
  # Read tracked files from session metadata
  cat "$SESSION_DIR/metadata.json" | jq -r '.changed_files[]'
fi
```

### Fallback:
If no changed files found, ask user:
```
No changed files detected for ${issue_key}.

Please specify review scope:
1. Review uncommitted changes (git diff)
2. Review specific files (provide file paths)
3. Review entire feature branch
4. Abort review

Which option would you like?
```

## Step 3: Read All Changed Files

Load the contents of all changed files for analysis.

### Actions:
```
1. For each changed file path:
   - Use Read tool to load file contents
   - Store in review context

2. Categorize files by type:
   - Frontend: .tsx, .jsx, .ts (components)
   - Backend: .ts, .js (API, services)
   - Styles: .css, .scss, .module.css
   - Config: .json, .yaml, .env
   - Tests: .test.ts, .spec.ts, .test.tsx
   - Documentation: .md, .mdx

3. Get IDE diagnostics for TypeScript/JavaScript files:
   - Use mcp__ide__getDiagnostics
   - Group by severity: error, warning, info
```

## Step 4: Run Review Analysis

Execute review based on selected scope.

### Scope: security

**Critical Security Checks:**

1. **Hardcoded Secrets Detection**
   ```bash
   # Search for common secret patterns
   Grep pattern="(api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['\"][^'\"]+['\"]" -i
   Grep pattern="(AWS|GOOGLE|STRIPE|GITHUB|ANTHROPIC)[_A-Z]*\s*[:=]\s*['\"][^'\"]+['\"]"
   Grep pattern="-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----"
   ```

2. **SQL Injection Vulnerabilities**
   ```typescript
   // Look for string concatenation in SQL queries
   Grep pattern="(SELECT|INSERT|UPDATE|DELETE).*\+\s*(userId|id|username)" -i

   // Flag: Direct variable interpolation
   Grep pattern="db\.(query|execute)\(.*\$\{" -i

   // CRITICAL if found:
   Report: "SQL Injection Risk - Use parameterized queries"
   Severity: CRITICAL
   ```

3. **XSS Vulnerabilities**
   ```typescript
   // Search for dangerous patterns
   Grep pattern="dangerouslySetInnerHTML" output_mode=content -A 2 -B 2
   Grep pattern="\.innerHTML\s*=" output_mode=content -A 2 -B 2

   // Flag unescaped user input
   Grep pattern="(props\.|userInput|user\.)" output_mode=content | Grep pattern="innerHTML"
   ```

4. **Authentication/Authorization Issues**
   ```typescript
   // Find API routes without auth middleware
   Grep pattern="app\.(get|post|put|delete|patch)\(" output_mode=content -A 3

   // Check for missing auth checks
   // Flag if route doesn't have: requireAuth, authenticate, isAuthenticated, etc.
   ```

5. **Insecure Dependencies**
   ```bash
   # Check package.json for known vulnerabilities
   if [ -f package.json ]; then
     npm audit --json > audit-report.json
     # Parse critical/high vulnerabilities
   fi
   ```

6. **Environment Variable Exposure**
   ```bash
   # Check for leaked .env files
   git ls-files | Grep pattern="\.env$"

   # If .env is tracked: CRITICAL ISSUE
   # Check .gitignore includes .env
   ```

**Security Score Calculation:**
```
Base Score: 100

Deductions:
- Hardcoded secret: -50 per instance (CRITICAL)
- SQL injection risk: -40 per instance (CRITICAL)
- XSS vulnerability: -30 per instance (CRITICAL)
- Missing auth check: -25 per route (HIGH)
- Insecure dependency (critical): -20 per package (HIGH)
- Insecure dependency (high): -10 per package (MEDIUM)
- Missing input validation: -5 per endpoint (LOW)

Minimum Score: 0
Pass Threshold: 85
```

### Scope: performance

**Performance Analysis:**

1. **React Performance Issues**
   ```typescript
   // Search for anti-patterns
   Grep pattern="style=\{\{" output_mode=content -A 2 -B 2
   // Flag: Inline object creation in JSX

   Grep pattern="onClick=\{.*=>" output_mode=content -A 2 -B 2
   // Flag: Inline arrow function in JSX

   Grep pattern="useEffect\(" output_mode=content -A 5
   // Check: Missing dependencies, complex objects in deps array

   Grep pattern="useState<.*\[\]>" output_mode=content
   // Check: Large arrays in state (should use reducer)
   ```

2. **Database Query Optimization**
   ```typescript
   // N+1 query detection
   Grep pattern="(for|forEach|map)\(.*await.*findAll" output_mode=content -A 5 -B 2
   // Flag: Loop contains await for database query (N+1)

   // Missing indexes
   Grep pattern="where:.*=.*(?!.*index)" output_mode=content
   // Suggest: Add database indexes for frequently queried fields
   ```

3. **Bundle Size Issues**
   ```typescript
   // Check for full library imports
   Grep pattern="import \* as .* from" output_mode=content
   // Flag: Import entire library (tree-shaking issue)

   Grep pattern="import .* from 'lodash'" output_mode=content
   // Flag: Import from lodash root (use lodash/[method])

   Grep pattern="import.*from 'react-icons/fa'" output_mode=content
   // Check: Importing entire icon set vs specific icons
   ```

4. **Memory Leaks**
   ```typescript
   // Check for missing cleanup
   Grep pattern="useEffect\(.*setInterval|setTimeout" output_mode=content -A 10
   // Verify: Has return cleanup function

   Grep pattern="addEventListener\(" output_mode=content -A 10
   // Verify: Has removeEventListener in cleanup

   Grep pattern="subscribe\(" output_mode=content -A 10
   // Verify: Has unsubscribe in cleanup
   ```

5. **Unnecessary Re-renders**
   ```typescript
   // Missing memoization
   Grep pattern="const.*=.*useMemo|useCallback" output_mode=content

   // Compare against total components
   // Suggest: Add memoization for expensive computations
   ```

**Performance Score Calculation:**
```
Base Score: 100

Deductions:
- N+1 query: -30 per occurrence (CRITICAL)
- Memory leak: -25 per occurrence (CRITICAL)
- Missing memoization (hot path): -15 per component (HIGH)
- Inline object/function in render: -10 per component (MEDIUM)
- Full library import: -8 per import (MEDIUM)
- Large bundle contribution: -5 per file >100KB (LOW)

Minimum Score: 0
Pass Threshold: 80
```

### Scope: quality

**Code Quality Checks:**

1. **TypeScript Type Safety**
   ```typescript
   // Search for 'any' types
   Grep pattern=":\s*any\b" output_mode=content -n
   // Flag: Explicit any usage (escape hatches)

   Grep pattern="@ts-ignore|@ts-expect-error" output_mode=content -n
   // Flag: TypeScript error suppression

   // Check IDE diagnostics
   mcp__ide__getDiagnostics
   // Count errors, warnings
   ```

2. **Error Handling**
   ```typescript
   // Find async functions without try-catch
   Grep pattern="async.*function|async.*=>" output_mode=files_with_matches

   // For each async function file, check for error handling
   Grep pattern="try\s*\{|\.catch\(" output_mode=content

   // Flag: Async without error handling
   ```

3. **Null Safety**
   ```typescript
   // Check for optional chaining usage
   Grep pattern="\?\." output_mode=count

   // Check for nullish coalescing
   Grep pattern="\?\?" output_mode=count

   // Flag potential null references
   Grep pattern="(\.|\[)[a-zA-Z_][a-zA-Z0-9_]*(?!\?\.)" output_mode=content
   ```

4. **Code Duplication**
   ```bash
   # For each changed file, search for similar code blocks
   # Flag if >80% similarity detected

   # Use jscpd or similar tool
   npx jscpd --mode "strict" --min-lines 5 --min-tokens 50 {changed_files}
   ```

5. **Code Complexity**
   ```bash
   # Calculate cyclomatic complexity
   npx complexity-report {changed_files}

   # Flag functions with complexity > 10
   # Suggest: Refactor into smaller functions
   ```

6. **Naming Conventions**
   ```typescript
   // Check naming patterns
   Grep pattern="^[a-z][a-zA-Z0-9]*$" // camelCase
   Grep pattern="^[A-Z][a-zA-Z0-9]*$" // PascalCase
   Grep pattern="^[A-Z_][A-Z0-9_]*$" // UPPER_SNAKE_CASE

   // Verify conventions:
   // - Components: PascalCase
   // - Functions/variables: camelCase
   // - Constants: UPPER_SNAKE_CASE
   ```

**Quality Score Calculation:**
```
Base Score: 100

Deductions:
- TypeScript error: -15 per error (CRITICAL)
- Unhandled async error: -12 per function (HIGH)
- 'any' type usage: -8 per instance (MEDIUM)
- Code duplication: -10 per duplicate block (MEDIUM)
- High complexity (>15): -10 per function (MEDIUM)
- TypeScript warning: -5 per warning (LOW)
- Naming convention violation: -3 per instance (LOW)

Minimum Score: 0
Pass Threshold: 75
```

### Scope: accessibility

**Accessibility Checks (WCAG 2.1 AA):**

1. **Semantic HTML**
   ```typescript
   // Flag non-semantic interactive elements
   Grep pattern="<div.*onClick" output_mode=content -n
   Grep pattern="<span.*onClick" output_mode=content -n

   // Suggest: Use <button>, <a>, or semantic HTML with role
   ```

2. **ARIA Attributes**
   ```typescript
   // Check for required ARIA labels
   Grep pattern="<(button|input|select|textarea)" output_mode=content -A 2

   // For each interactive element, verify:
   // - Has aria-label OR aria-labelledby
   // - Has aria-describedby for complex inputs

   // Check for proper ARIA roles
   Grep pattern="role=\"" output_mode=content
   // Verify: Valid ARIA role values
   ```

3. **Keyboard Navigation**
   ```typescript
   // Check onClick has keyboard equivalent
   Grep pattern="onClick=" output_mode=content -A 5 -B 2

   // Verify: Has onKeyDown or onKeyPress handler
   // Or: Element is natively keyboard-accessible (button, a)
   ```

4. **Form Accessibility**
   ```typescript
   // Check all inputs have labels
   Grep pattern="<input" output_mode=content -A 3 -B 3

   // Verify each input:
   // - Has associated <label htmlFor="id">
   // - OR has aria-label
   // - Has aria-required for required fields
   // - Has aria-invalid for error states
   ```

5. **Focus Management**
   ```typescript
   // Check modals/dialogs for focus trap
   Grep pattern="role=\"dialog\"|role=\"modal\"" output_mode=content -A 20

   // Verify:
   // - Focus trap implemented
   // - Escape key handler
   // - Focus returns to trigger element on close
   ```

6. **Image Alt Text**
   ```typescript
   // Check all images have alt text
   Grep pattern="<img" output_mode=content -A 2

   // Verify: Every <img> has alt attribute
   // Decorative images: alt=""
   // Meaningful images: descriptive alt text
   ```

7. **Color Contrast**
   ```typescript
   // Flag inline color styles
   Grep pattern="color:\s*#|background-color:\s*#" output_mode=content

   // Suggest: Run automated contrast checker
   // Manual review required for visual elements
   ```

**Accessibility Score Calculation:**
```
Base Score: 100

Deductions:
- Missing keyboard nav: -20 per interactive element (CRITICAL)
- Non-semantic interactive: -15 per element (HIGH)
- Missing ARIA label: -12 per element (HIGH)
- Missing form label: -12 per input (HIGH)
- Missing alt text: -10 per image (MEDIUM)
- Missing focus management: -15 per modal/dialog (HIGH)
- Potential contrast issue: -5 per color pair (LOW)

Minimum Score: 0
Pass Threshold: 90
```

### Scope: full

**Comprehensive Review:**

Execute ALL scopes in parallel:
```
1. Run security analysis
2. Run performance analysis
3. Run quality analysis
4. Run accessibility analysis
5. Run test coverage analysis
6. Run documentation review
```

**Additional Full Review Checks:**

1. **Test Coverage Analysis**
   ```bash
   # Check if tests exist for changed files
   for file in {changed_files}; do
     test_file="${file/.ts/.test.ts}"
     test_file="${test_file/.tsx/.test.tsx}"

     if [ ! -f "$test_file" ]; then
       echo "MISSING: No test file for $file"
     fi
   done

   # Run coverage report
   npm test -- --coverage --collectCoverageFrom="{changed_files}"

   # Parse coverage JSON
   # Flag: Coverage < 80% for new code
   ```

2. **Documentation Review**
   ```typescript
   // Check for JSDoc on exported functions
   Grep pattern="export.*function" output_mode=content -A 15

   // Verify: Has /** ... */ comment block above

   // Check README updates
   if [ -f README.md ]; then
     git diff origin/main...HEAD README.md
     # If changed files but README unchanged: suggest update
   fi
   ```

3. **Dependency Changes**
   ```bash
   # Check package.json changes
   git diff origin/main...HEAD package.json

   # For new dependencies:
   # - Check license compatibility
   # - Check package size
   # - Check security vulnerabilities
   # - Check maintenance status (last update)
   ```

**Overall Score Calculation:**
```
Weighted Score:
- Security: 30%
- Performance: 25%
- Quality: 20%
- Accessibility: 15%
- Test Coverage: 10%

Overall = (Security * 0.30) +
          (Performance * 0.25) +
          (Quality * 0.20) +
          (Accessibility * 0.15) +
          (Coverage * 0.10)

Pass Threshold: 80
```

## Step 5: Auto-Fix Issues (if enabled)

If ${fix} is true, automatically fix issues where safe.

### Auto-Fixable Issues:

1. **Code Formatting**
   ```bash
   # Run Prettier on changed files
   npx prettier --write {changed_files}

   # Run ESLint with auto-fix
   npx eslint --fix {changed_files}
   ```

2. **Import Organization**
   ```typescript
   // For each file, organize imports:
   // 1. External dependencies (react, next, etc.)
   // 2. Internal dependencies (@/lib, @/components)
   // 3. Relative imports (./Component, ../utils)

   // Use Edit tool to reorder imports
   ```

3. **Add Missing Type Annotations**
   ```typescript
   // Add explicit return types to functions
   // Convert implicit any to explicit types

   // Use TypeScript compiler API or simple regex
   ```

4. **Security Quick Fixes**
   ```typescript
   // Move hardcoded values to environment variables
   // Add input validation to API endpoints
   // Add missing auth checks (with template)
   ```

5. **Accessibility Quick Fixes**
   ```typescript
   // Add missing alt="" to decorative images
   // Add aria-label to icon buttons
   // Convert <div onClick> to <button>
   ```

### Auto-Fix Report:
```markdown
## Auto-Fixed Issues

✅ Applied Prettier to 12 files
✅ Fixed ESLint errors in 8 files
✅ Organized imports in 15 files
✅ Added 5 missing type annotations
✅ Added 3 missing ARIA labels
✅ Converted 2 div elements to buttons

Manual fixes still required: 4 (see Critical Issues)
```

## Step 6: Generate Review Report

Create comprehensive review report.

### Report Structure:

```markdown
# Code Review Report: ${issue_key}

**Issue:** ${issue_summary}
**Reviewed By:** Claude Code Quality Enhancer
**Date:** {current_date}
**Scope:** ${scope}
**Auto-Fix:** ${fix ? 'Enabled' : 'Disabled'}

---

## 📊 Summary

| Metric | Score | Status |
|--------|-------|--------|
| **Overall** | {overall_score}/100 | {PASS/FAIL} |
| Security | {security_score}/100 | {PASS/FAIL} |
| Performance | {performance_score}/100 | {PASS/FAIL} |
| Quality | {quality_score}/100 | {PASS/FAIL} |
| Accessibility | {a11y_score}/100 | {PASS/FAIL} |
| Test Coverage | {coverage}% | {PASS/FAIL} |

**Files Reviewed:** {file_count}
**Total Issues:** {issue_count}
**Critical:** {critical_count}
**High:** {high_count}
**Medium:** {medium_count}
**Low:** {low_count}

**Auto-Fixed:** {auto_fix_count}
**Manual Review Required:** {manual_count}

---

## 🔴 Critical Issues (Action Required)

{for each critical issue:}
### {issue_number}. [{CATEGORY}] {issue_title}

**File:** `{file_path}:{line_number}`
**Severity:** CRITICAL

**Issue:**
{detailed_description}

**Current Code:**
```{language}
{code_snippet}
```

**Recommended Fix:**
```{language}
{fixed_code_snippet}
```

**Impact:** {impact_description}
**Effort:** {LOW|MEDIUM|HIGH}

---

## 🟡 Warnings (Should Fix)

{for each warning:}
### {issue_number}. [{CATEGORY}] {issue_title}

**File:** `{file_path}:{line_number}`
**Severity:** {HIGH|MEDIUM|LOW}

{brief_description}

**Recommendation:** {fix_suggestion}

---

## ✅ Fixed Automatically

{for each auto-fixed issue:}
- [{CATEGORY}] {description} in `{file_path}`

---

## 📈 Detailed Metrics

### Security Analysis
- Secrets Scan: {PASS/FAIL}
- SQL Injection Check: {PASS/FAIL}
- XSS Vulnerability Check: {PASS/FAIL}
- Auth/Authorization: {PASS/FAIL}
- Dependency Security: {PASS/FAIL}

**Score:** {security_score}/100

### Performance Analysis
- React Optimization: {PASS/FAIL}
- Database Queries: {PASS/FAIL}
- Bundle Size: {PASS/FAIL}
- Memory Leaks: {PASS/FAIL}
- Render Performance: {PASS/FAIL}

**Score:** {performance_score}/100

### Quality Analysis
- Type Safety: {typescript_errors} errors, {warnings} warnings
- Error Handling: {async_without_catch} unhandled async functions
- Code Duplication: {duplication_percentage}%
- Cyclomatic Complexity: {avg_complexity} (max: {max_complexity})

**Score:** {quality_score}/100

### Accessibility Analysis
- Semantic HTML: {PASS/FAIL}
- ARIA Compliance: {PASS/FAIL}
- Keyboard Navigation: {PASS/FAIL}
- Form Accessibility: {PASS/FAIL}
- Focus Management: {PASS/FAIL}

**Score:** {a11y_score}/100

### Test Coverage
- Statements: {statements}%
- Branches: {branches}%
- Functions: {functions}%
- Lines: {lines}%

**Missing Tests:** {missing_test_files}

---

## 💡 Recommendations

### High Priority
{prioritized_action_items}

### Nice to Have
{optional_improvements}

### Long Term
{architectural_suggestions}

---

## 📋 Checklist for Resolution

Before marking this review as complete:

- [ ] All critical issues resolved
- [ ] Security score ≥ 85
- [ ] Performance score ≥ 80
- [ ] Quality score ≥ 75
- [ ] Accessibility score ≥ 90
- [ ] Test coverage ≥ 80%
- [ ] All tests passing
- [ ] Documentation updated

---

## 🔗 References

- **Jira Issue:** {jira_url}
- **Changed Files:** {file_list}
- **Commit Range:** {commit_range}
- **Branch:** {branch_name}

---

**Review Status:** {PASS|FAIL|CONDITIONAL_PASS}

{if PASS:}
✅ **Code review passed!** All quality gates met. Ready to proceed to testing phase.

{if CONDITIONAL_PASS:}
⚠️ **Conditional pass.** Minor issues found but not blocking. Address warnings before merge.

{if FAIL:}
❌ **Code review failed.** Critical issues must be resolved before proceeding.

**Next Steps:**
{next_action_items}
```

## Step 7: Post Review to Jira

Update the Jira issue with review results.

### Actions:
```
1. Use mcp__atlassian__jira_add_comment with formatted report:

   "Code Review Complete - ${scope}

   Overall Score: {overall_score}/100 - {PASS/FAIL}

   Summary:
   - Security: {security_score}/100
   - Performance: {performance_score}/100
   - Quality: {quality_score}/100
   - Accessibility: {a11y_score}/100

   Critical Issues: {critical_count}
   {if critical_count > 0:}
   See detailed review report for action items.
   {endif}

   {if PASS:}
   ✅ All quality gates passed. Ready for testing.
   {endif}

   Full report: [Attach or link to detailed markdown report]"

2. If review FAILED, add label: "review-failed"
3. If review PASSED, add label: "review-passed"
4. Update custom field (if exists): code_review_score = {overall_score}
```

## Step 8: Save Review Report

Store the detailed review report for reference.

### Actions:
```
1. Save to Obsidian vault:
   Path: C:\Users\MarkusAhling\obsidian\Repositories\{org}\{repo}\Reviews\${issue_key}-review-{timestamp}.md

2. Include in vault document:
   - Full review report
   - All code snippets
   - Metrics and scores
   - Recommendations

3. Link to issue documentation:
   Update C:\Users\MarkusAhling\obsidian\Repositories\{org}\{repo}\Issues\${issue_key}.md
   Add section: ## Code Review
   Link to review report: [[Reviews/${issue_key}-review-{timestamp}]]

4. Save summary to session directory (if exists):
   Path: .claude/sessions/${issue_key}/reviews/review-{timestamp}.json
   Format: JSON with all metrics and issues
```

## Error Handling

### Invalid Issue Key:
```
If issue_key does not match pattern [A-Z]+-[0-9]+:
  Respond: "Invalid issue key format. Expected: ABC-123"
  Exit
```

### Issue Not Found:
```
If Jira API returns 404:
  Respond: "Issue ${issue_key} not found. Please verify the issue key."
  Exit
```

### No Changed Files:
```
If no changed files detected:
  Prompt user for review scope:
  1. Review uncommitted changes
  2. Specify files manually
  3. Review entire branch
  4. Abort
```

### Auto-Fix Failures:
```
If auto-fix fails for any file:
  Log the error
  Continue with other fixes
  Report failed fixes in review report
  Do not fail entire review
```

### Tool Failures:
```
If linter/formatter not available:
  Skip that specific check
  Note in report: "Skipped {tool} - not available"
  Continue with other checks
```

## Pass/Fail Criteria

### Review PASSES if:
```
✅ Overall score ≥ 80
✅ Security score ≥ 85
✅ No critical security issues (hardcoded secrets, SQL injection, XSS)
✅ No TypeScript errors
✅ Test coverage ≥ 80% (if scope includes quality/full)
```

### Review CONDITIONALLY PASSES if:
```
✅ Overall score ≥ 70
✅ Security score ≥ 85
⚠️ Some warnings present
⚠️ Coverage 70-79%
✅ All critical issues resolved
```

### Review FAILS if:
```
❌ Overall score < 70
❌ Security score < 85
❌ Any critical security issues present
❌ TypeScript errors present
❌ Coverage < 70%
```

## Integration with Orchestration

This review command integrates with the orchestration workflow:

### Position in Workflow:
```
EXPLORE → PLAN → CODE → **REVIEW** → TEST → FIX → DOCUMENT
```

### When to Run:
```
- After CODE phase, before TEST phase
- Before creating pull request
- On-demand for quality checks
- As part of CI/CD pipeline
```

### Workflow Integration:
```bash
# Run review as part of work command
/jira:work ABC-123
  # ... CODE phase completes ...
  # Auto-trigger review
  /jira:review ABC-123 --scope=full --fix=true
  # If review PASSES, proceed to TEST
  # If review FAILS, return to FIX phase
```

## Example Usage

```bash
# Full review with auto-fix
/jira:review ABC-123 --scope=full --fix=true

# Security-only review
/jira:review DEV-456 --scope=security

# Performance review without fixes
/jira:review PERF-789 --scope=performance --fix=false

# Accessibility audit
/jira:review UI-321 --scope=accessibility --fix=true

# Code quality check
/jira:review TECH-654 --scope=quality
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Jira instance URL |
| `JIRA_API_TOKEN` | Yes | API token for Jira |
| `OBSIDIAN_VAULT_PATH` | No | Path to Obsidian vault (default: C:\Users\MarkusAhling\obsidian) |
| `REVIEW_SECURITY_THRESHOLD` | No | Security pass threshold (default: 85) |
| `REVIEW_OVERALL_THRESHOLD` | No | Overall pass threshold (default: 80) |

## Related Commands

- `/jira:work` - Start work on issue (includes review)
- `/jira:status` - Check orchestration status
- `/quality` - Run quality checks without Jira integration
- `/test` - Run test suite

## Notes

- Always run review before creating pull requests
- Auto-fix is conservative - only applies safe transformations
- Manual review still recommended for critical code paths
- Review scores are objective metrics, not absolute quality measures
- Integrate with CI/CD for automated quality gates
- Store all review reports in Obsidian vault for historical analysis
- Use review trends to identify recurring issues and improve practices
