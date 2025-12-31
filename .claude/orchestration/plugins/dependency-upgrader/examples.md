# Dependency Upgrader - Example CLI Commands & Outputs

## Quick Dependency Audit

**Command:**
```bash
upgrade audit
# or
upgrade check
```

**Output:**
```
🔍 Dependency Upgrade Assistant - Quick Audit
================================================

📦 Scanning package.json...

Summary:
  Total dependencies: 47
  ✅ Up to date: 32
  📊 Updates available: 15
    • Patch: 8
    • Minor: 5
    • Major: 2

🔒 Security:
  ⚠️  2 vulnerabilities found
    • lodash: Prototype Pollution (High) - patch available
    • axios: SSRF vulnerability (Moderate) - patch available

Safe to upgrade today (low risk):
  ✅ eslint: 8.45.0 → 8.47.0 (patch)
  ✅ prettier: 3.0.0 → 3.0.3 (patch)
  ✅ jest: 29.5.0 → 29.6.4 (minor)
  ✅ typescript: 5.1.6 → 5.2.2 (minor)
  ✅ vite: 4.4.5 → 4.4.9 (patch)
  + 3 more...

Requires review (medium risk):
  ⚠️  react-query: 3.39.3 → 4.0.10 (major)
      • 5 breaking changes detected
      • ~12 files affected
      • Estimated effort: 2-3 hours

  ⚠️  tailwindcss: 3.3.2 → 3.3.3 (patch)
      • Config changes required
      • 1 breaking change in JIT mode

High risk (defer or plan carefully):
  🚨 next.js: 13.4.7 → 14.0.0 (major)
      • 23 breaking changes
      • ~47 files affected
      • Estimated effort: 1-2 days
      • Recommendation: Plan incremental migration

Next steps:
  • Run: upgrade safe-all    (upgrade all low-risk dependencies)
  • Run: upgrade react-query (analyze and upgrade react-query)
  • Run: upgrade next --plan (create migration plan for Next.js)

Report generated in 8 seconds
```

---

## Single Package Upgrade

**Command:**
```bash
upgrade react 18.3.0
# or
upgrade react to latest
# or just
upgrade react
```

**Output:**
```
🚀 Dependency Upgrade Assistant - Single Package Upgrade
==========================================================

Package: react
Current: 18.2.0
Target:  18.3.0
Type:    Minor version upgrade

Phase 1/7: Analysis
-------------------
✓ Fetching CHANGELOG from github.com/facebook/react
✓ Parsing release notes
✓ Extracting breaking changes

Breaking Changes Found: 0
Deprecations: 1
  • ReactDOM.render() deprecated (use createRoot)

Phase 2/7: Impact Assessment
-----------------------------
✓ Scanning codebase for react imports... (found 37 files)
✓ Checking for deprecated API usage...
✓ Calculating risk score...
✓ Checking peer dependencies...

Impact Summary:
  Files affected: 3
  Deprecated API usage:
    • src/index.tsx:12 - ReactDOM.render() → createRoot()
    • src/legacy/app.tsx:8 - ReactDOM.render() → createRoot()
    • tests/setup.ts:15 - ReactDOM.render() → createRoot()

  Risk Score: 15/100 (Low)
  Peer Dependencies: ✅ All compatible
  Estimated effort: 30 minutes

Phase 3/7: Migration Planning
------------------------------
✓ Generating codemod for ReactDOM.render migration...
✓ Planning test strategy...
✓ Creating rollback plan...

Migration Plan:
  1. Update package.json: react@18.3.0, react-dom@18.3.0
  2. Run codemod: .upgrade/codemods/react-18-render.js (3 files)
  3. Install dependencies: npm install
  4. Run tests: npm test

Phase 4/7: Approval Gate
------------------------
┌─────────────────────────────────────────────────────┐
│ Upgrade Summary                                     │
├─────────────────────────────────────────────────────┤
│ Package:       react 18.2.0 → 18.3.0               │
│ Risk Level:    Low (15/100)                        │
│ Breaking:      0 breaking changes                  │
│ Files:         3 files need migration              │
│ Auto-fixable:  100% (3/3)                          │
│ Tests:         23 tests will run                   │
│ Estimated:     30 minutes                          │
│                                                     │
│ ✅ All checks passed                                │
│ ✅ Migrations ready                                 │
│ ✅ Rollback plan created                            │
└─────────────────────────────────────────────────────┘

Proceed with upgrade? [Y/n]: Y

Phase 5/7: Execute Upgrade
---------------------------
✓ Created backup branch: backup/react-18.3.0-20231215
✓ Updated package.json
✓ Running: npm install
  ...
✓ Applied codemod to 3 files
✓ Committed changes: "chore: upgrade react to 18.3.0"

Phase 6/7: Testing
------------------
✓ Running targeted tests...

Test Results:
  ✅ 23/23 tests passed
  ⏱️  Duration: 12.3 seconds
  📊 Coverage: 87.5% (no change)

Phase 7/7: Validation
---------------------
✓ Verifying migrations applied correctly...
✓ Checking for remaining deprecated APIs... none found
✓ Generating documentation...

✅ Upgrade Complete!
====================

Summary:
  • react: 18.2.0 → 18.3.0
  • react-dom: 18.2.0 → 18.3.0 (peer dependency)
  • 3 files migrated
  • All tests passing
  • Ready to push

Files modified:
  • package.json, package-lock.json
  • src/index.tsx
  • src/legacy/app.tsx
  • tests/setup.ts

Commit: abc123f "chore: upgrade react to 18.3.0"

Rollback: git checkout backup/react-18.3.0-20231215

Next steps:
  • Review changes: git diff HEAD~1
  • Push to remote: git push
  • Create PR: upgrade pr

Total time: 4 minutes 32 seconds
```

---

## Major Version Migration (Incremental)

**Command:**
```bash
upgrade vue --from 2.7.14 --to 3.3.4
# or
upgrade-major vue 3
```

**Output:**
```
🎯 Dependency Upgrade Assistant - Major Version Migration
==========================================================

Package: vue
From:    2.7.14
To:      3.3.4
Gap:     1 major version

Phase 1/4: Path Planning
------------------------
✓ Analyzing version history...
✓ Identifying stable intermediate versions...
✓ Calculating optimal upgrade path...

Recommended Upgrade Path:
┌────────────────────────────────────────────────────────┐
│ Step 1: Vue 2.7.14 → 2.7.16 (latest v2)               │
│   • Prepare for migration                             │
│   • Fix deprecation warnings                          │
│   • Estimated: 1 hour                                 │
│                                                        │
│ Step 2: Vue 2.7.16 → 3.0.0 (initial v3)               │
│   • Major breaking changes                            │
│   • 47 breaking changes detected                      │
│   • ~124 files affected                               │
│   • Estimated: 8-12 hours                             │
│                                                        │
│ Step 3: Vue 3.0.0 → 3.3.4 (latest v3)                 │
│   • Minor improvements                                │
│   • 3 minor breaking changes                          │
│   • ~8 files affected                                 │
│   • Estimated: 2-3 hours                              │
└────────────────────────────────────────────────────────┘

Total estimated time: 11-16 hours
Recommendation: Proceed with incremental migration

Major Breaking Changes (v2 → v3):
  1. Composition API replaces Options API (optional but recommended)
  2. Multiple root elements now supported (affects templates)
  3. v-model usage changed
  4. Filters removed (use computed or methods)
  5. $listeners merged into $attrs
  ... + 42 more

Proceed with step 1? [Y/n]: Y

Phase 2/4: Step 1 - Vue 2.7.14 → 2.7.16
---------------------------------------
✓ Analyzing breaking changes... none
✓ Scanning code impact...
✓ Applying upgrade...
✓ Running tests... ✅ 156/156 passed
✓ Checkpoint created: vue-migration-step-1

Proceed with step 2? [Y/n]: Y

Phase 2/4: Step 2 - Vue 2.7.16 → 3.0.0
---------------------------------------
⚠️  This is a major upgrade with significant breaking changes!

✓ Analyzing 47 breaking changes...
✓ Scanning codebase (124 files affected)...
✓ Generating migration scripts...

Migration Plan:
  1. Install @vue/compat (compatibility layer)
  2. Update build config (webpack/vite)
  3. Run migration codemod (auto-fixes 89 issues)
  4. Manual updates required (35 issues)
  5. Update tests
  6. Remove @vue/compat once stable

Auto-fixable migrations:
  ✅ v-model syntax (47 files)
  ✅ slot syntax (23 files)
  ✅ $listeners removal (12 files)
  ✅ Global API changes (8 files)

Manual migrations required:
  ⚠️  Filters → computed/methods (18 files)
     • src/filters/currency.ts
     • src/filters/date.ts
     ... + 16 more

  ⚠️  Render function updates (12 files)
     • src/components/DynamicTable.vue
     ... + 11 more

  ⚠️  Custom directives API change (5 files)

Proceed? [Y/n]: Y

✓ Creating backup branch: vue-3-migration-step-2
✓ Installing @vue/compat...
✓ Updating vite.config.ts...
✓ Running codemod... (89 files updated)
✓ Generating manual migration guide...

⚠️  Manual updates required!

Manual Migration Guide: .upgrade/vue-3-manual-migrations.md

Please complete manual migrations, then run:
  upgrade continue

[User completes manual migrations]

✓ Checking for remaining issues...
✓ Running tests...

Test Results:
  ❌ 12/156 tests failed

Failed tests related to:
  • Filter removal (8 tests)
  • Render function changes (4 tests)

Fix failures and run: upgrade retry-tests

[User fixes tests]

✓ Tests: ✅ 156/156 passed
✓ Checkpoint created: vue-migration-step-2

Proceed with step 3? [Y/n]: Y

Phase 2/4: Step 3 - Vue 3.0.0 → 3.3.4
-------------------------------------
✓ Minor breaking changes (3 found)
✓ Applying upgrade...
✓ Tests: ✅ 156/156 passed
✓ Checkpoint created: vue-migration-step-3

Phase 3/4: Final Validation
----------------------------
✓ All intermediate migrations successful
✓ Target version reached: 3.3.4
✓ Full test suite: ✅ 156/156 passed
✓ No deprecated APIs remaining

Phase 4/4: Documentation
------------------------
✓ Generating migration report...

✅ Migration Complete!
======================

Vue 2.7.14 → 3.3.4 successfully migrated in 3 steps

Summary:
  • Step 1: 2.7.14 → 2.7.16 (preparation)
  • Step 2: 2.7.16 → 3.0.0 (major upgrade)
  • Step 3: 3.0.0 → 3.3.4 (finalization)

  Files modified: 124
  Auto-migrations: 89
  Manual updates: 35
  Total commits: 3

Commits:
  1. def456a "chore(vue): upgrade to 2.7.16 (migration prep)"
  2. abc789b "feat(vue): migrate to Vue 3.0.0"
  3. fed321c "chore(vue): upgrade to Vue 3.3.4"

Rollback points:
  • Step 1: git checkout vue-migration-step-1
  • Step 2: git checkout vue-migration-step-2
  • Step 3: git checkout vue-migration-step-3

Documentation: .upgrade/vue-2-to-3-migration-report.md

Next steps:
  • Review all changes: git log --oneline -3
  • Remove @vue/compat (see migration report)
  • Create PR: upgrade pr

Total time: 11.5 hours (over 2 days)
```

---

## Bulk Safe Upgrades

**Command:**
```bash
upgrade safe-all
# or
upgrade all --safe-only
```

**Output:**
```
📦 Dependency Upgrade Assistant - Bulk Safe Upgrades
====================================================

Identifying safe upgrades (patch/minor only)...

Found 12 safe upgrade candidates:
  ✅ eslint: 8.45.0 → 8.47.0 (patch)
  ✅ prettier: 3.0.0 → 3.0.3 (patch)
  ✅ jest: 29.5.0 → 29.6.4 (minor)
  ✅ typescript: 5.1.6 → 5.2.2 (minor)
  ✅ vite: 4.4.5 → 4.4.9 (patch)
  ✅ axios: 1.4.0 → 1.5.0 (minor)
  ✅ lodash: 4.17.20 → 4.17.21 (patch) [SECURITY FIX]
  ✅ dotenv: 16.0.3 → 16.3.1 (minor)
  ✅ @testing-library/react: 14.0.0 → 14.1.0 (minor)
  ✅ eslint-config-prettier: 8.8.0 → 9.0.0 (major - but safe)
  ✅ husky: 8.0.3 → 8.0.3 (already latest)
  ✅ lint-staged: 13.2.2 → 13.3.0 (minor)

Excluded (require review):
  ⚠️  react-query: 3.39.3 → 4.0.10 (major with breaking changes)
  ⚠️  next.js: 13.4.7 → 14.0.0 (major with breaking changes)

Compatibility check...
✅ No peer dependency conflicts

Proceed with bulk upgrade? [Y/n]: Y

Applying upgrades...
✓ Created backup branch: bulk-upgrade-20231215
✓ Updating package.json (12 packages)
✓ Running npm install...
  ...

Test Strategy:
  Running full test suite (multiple packages changed)

✓ Unit tests:     ✅ 143/143 passed
✓ Integration:    ✅ 23/23 passed
✓ Smoke tests:    ✅ 8/8 passed

✓ Validation complete

✅ Bulk Upgrade Complete!
=========================

12 packages upgraded successfully:

Security fixes:
  🔒 lodash: 4.17.20 → 4.17.21 (fixes CVE-2021-23337)

Development dependencies:
  • eslint: 8.45.0 → 8.47.0
  • prettier: 3.0.0 → 3.0.3
  • typescript: 5.1.6 → 5.2.2
  • jest: 29.5.0 → 29.6.4
  • @testing-library/react: 14.0.0 → 14.1.0
  • eslint-config-prettier: 8.8.0 → 9.0.0
  • husky: 8.0.3 → 8.0.3
  • lint-staged: 13.2.2 → 13.3.0

Production dependencies:
  • vite: 4.4.5 → 4.4.9
  • axios: 1.4.0 → 1.5.0
  • dotenv: 16.0.3 → 16.3.1

Commit: xyz789f "chore: bulk upgrade 12 dependencies (patch/minor)"
Rollback: git checkout bulk-upgrade-20231215

Total time: 3 minutes 45 seconds
```

---

## Breaking Change Analysis (Read-Only)

**Command:**
```bash
upgrade analyze next.js 14.0.0
# or
upgrade what-breaks next
```

**Output:**
```
🔍 Dependency Upgrade Assistant - Breaking Change Analysis
===========================================================

Package: next
Current: 13.4.7
Target:  14.0.0 (latest)
Type:    Major version upgrade

This is a READ-ONLY analysis. No changes will be applied.

Breaking Changes (23 found):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. App Router is now stable (breaking: metadata API changes)
   Severity: High
   Affected APIs:
     • generateMetadata() signature changed
     • Metadata type definitions updated

   Files affected: 12
     • app/layout.tsx:8
     • app/products/layout.tsx:15
     ... + 10 more

   Migration:
     Before: export const metadata = { title: 'Page' }
     After:  export async function generateMetadata() {
               return { title: 'Page' }
             }

   Auto-fixable: ❌ Manual update required
   Estimated effort: 2 hours

2. Image component: removed 'domains' config
   Severity: Medium
   Affected: next.config.js configuration

   Migration:
     Before: images: { domains: ['example.com'] }
     After:  images: { remotePatterns: [{ hostname: 'example.com' }] }

   Auto-fixable: ✅ Yes
   Estimated effort: 15 minutes

3. Removed deprecated 'next/legacy/image'
   Severity: Medium
   Files affected: 8

   Migration: Use next/image instead
   Auto-fixable: ✅ Codemod available

... + 20 more breaking changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Code Impact Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files affected:        47
Total code locations:  123
Auto-fixable:          45 (37%)
Manual required:       78 (63%)

Effort estimation:
  • Auto migrations:     2-3 hours
  • Manual updates:      6-8 hours
  • Testing:             4-6 hours
  • Total:               12-17 hours

Risk Assessment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Risk Score: 72/100 (High)

Risk factors:
  • Breaking changes:       High (23 changes)
  • Code impact:            High (47 files, 123 locations)
  • Test coverage:          Medium (73% coverage)
  • Package maturity:       High (stable release)
  • Community adoption:     High (94% on v14 within 3 months)
  • Rollback difficulty:    Medium

Recommendations:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  PROCEED WITH CAUTION

This is a significant upgrade with substantial breaking changes.

Recommended approach:
  1. Allocate 2-3 days for migration
  2. Start with a feature branch
  3. Use incremental migration if possible
  4. Test thoroughly in staging environment
  5. Consider upgrading to 13.5.x first (easier path)

Alternative incremental path:
  Step 1: 13.4.7 → 13.5.6 (latest v13)
  Step 2: 13.5.6 → 14.0.0 (major jump)

Would reduce risk score to: 45/100 (Medium)

Next steps:
  • Run: upgrade next --plan    (create detailed migration plan)
  • Run: upgrade next --major   (start incremental migration)
  • Defer: Schedule for next sprint

Full report: .upgrade/next-14-analysis.md

Analysis completed in 18 seconds
```

---

## Security Patch (Urgent)

**Command:**
```bash
upgrade security-patch axios
# or
upgrade patch axios --urgent
```

**Output:**
```
🚨 Dependency Upgrade Assistant - Urgent Security Patch
=======================================================

Package: axios
Current: 1.4.0
Vulnerability: CVE-2023-45857 (High severity)

Security Advisory:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:       Server-Side Request Forgery (SSRF)
Severity:    HIGH (CVSS 8.1)
Description: Axios follows redirects to untrusted domains,
             allowing SSRF attacks.
Patched:     1.6.0+
Reference:   https://github.com/advisories/GHSA-xxxx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Minimum patch version: 1.6.0
Latest version:        1.6.2

⚠️  FAST-TRACK MODE: Minimal validation for urgent patch

Phase 1: Quick Analysis
-----------------------
✓ Checking for breaking changes in 1.4.0 → 1.6.2...
  ✅ No breaking changes (minor version bump)
✓ Quick code scan... (37 files use axios)
  ✅ No obvious API changes required
✓ Peer dependencies... ✅ Compatible

Risk Score: 8/100 (Very Low)

Phase 2: Apply Patch
--------------------
✓ Creating backup branch: security-patch-axios-20231215
✓ Updating axios: 1.4.0 → 1.6.2
✓ Running npm install...
✓ Smoke tests... ✅ 8/8 passed

Phase 3: Fast Validation
-------------------------
✓ Running critical tests (API integration)...
  ✅ 23/23 tests passed
✓ No regressions detected

✅ Security Patch Applied!
==========================

axios: 1.4.0 → 1.6.2

Vulnerability fixed: CVE-2023-45857 (SSRF)

Files modified:
  • package.json
  • package-lock.json

Commit: sec789x "security: patch axios SSRF vulnerability (CVE-2023-45857)"

Next steps:
  • Deploy to staging immediately
  • Run full test suite: npm test
  • Create emergency PR: upgrade pr --emergency
  • Schedule production deployment

Rollback: git checkout security-patch-axios-20231215

Total time: 2 minutes 15 seconds

⚠️  Recommendation: Deploy to production within 24 hours
```

---

## Additional CLI Commands

```bash
# Get help
upgrade --help
upgrade <command> --help

# Check specific package
upgrade check react

# Dry run (no changes)
upgrade react --dry-run

# Auto-approve (skip approval gate)
upgrade react --auto-approve

# Force upgrade (ignore risk warnings)
upgrade next --force

# Custom risk tolerance
upgrade next --risk-tolerance=high

# Generate migration report only
upgrade react --report-only

# Continue interrupted upgrade
upgrade continue

# Rollback last upgrade
upgrade rollback

# View upgrade history
upgrade history

# Export audit report
upgrade audit --export=json > audit.json

# Schedule upgrades
upgrade schedule weekly

# Interactive mode
upgrade interactive
```

---

## Integration Examples

### GitHub Actions
```yaml
name: Weekly Dependency Audit

on:
  schedule:
    - cron: '0 9 * * 1' # Monday 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run dependency audit
        run: |
          upgrade audit --export=json > audit.json
      - name: Create issue if updates available
        run: |
          upgrade audit --create-issue
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if package.json changed
if git diff --cached --name-only | grep -q 'package.json'; then
  echo "Checking for dependency security vulnerabilities..."
  upgrade check --security-only --fail-on-high
fi
```

### CI/CD Integration
```bash
# Check for outdated dependencies in CI
upgrade audit --fail-on-major --fail-on-vulnerable

# Auto-upgrade patch versions in CI
upgrade safe-all --auto-approve --create-pr
```

This plugin transforms dependency management from a dreaded chore into a smooth, confident process!
