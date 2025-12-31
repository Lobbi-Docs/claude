# Dependency Upgrader - Quick Start Guide

Get up and running in 5 minutes.

## Installation

```bash
# Install the plugin
claude plugin install dependency-upgrader

# Verify installation
upgrade --version
```

## Your First Upgrade in 3 Steps

### Step 1: See What Needs Upgrading (30 seconds)

```bash
upgrade audit
```

**You'll see:**
- Total dependencies
- Available updates (categorized by risk)
- Security vulnerabilities
- Recommended next steps

### Step 2: Pick a Safe Upgrade (5 minutes)

Look for packages marked with ✅ in the audit output. These are low-risk upgrades.

```bash
# Example: Upgrade ESLint
upgrade eslint
```

**What happens:**
1. Plugin analyzes breaking changes (if any)
2. Scans your code for impacts
3. Shows you a summary
4. Asks for approval
5. Applies the upgrade
6. Runs tests
7. Creates a commit

### Step 3: Review and Push (2 minutes)

```bash
# Review the changes
git diff HEAD~1

# Push to remote
git push

# Or create a PR
upgrade pr
```

**Done!** You just safely upgraded a dependency with full confidence.

---

## Common Scenarios

### Scenario 1: Weekly Maintenance (10 minutes)

Run this every Monday morning:

```bash
# Check what needs upgrading
upgrade audit

# Upgrade all safe dependencies at once
upgrade safe-all

# Review and push
git push
```

**Result:** All patch/minor versions updated, security patches applied.

---

### Scenario 2: Security Vulnerability Alert (5 minutes)

Got a security alert? Fix it immediately:

```bash
# Check the vulnerability
upgrade check axios

# Apply the security patch
upgrade security-patch axios

# Deploy ASAP
git push
```

**Result:** Vulnerability patched, minimal changes, tests passing.

---

### Scenario 3: Upgrading a Specific Package (15 minutes)

Need to upgrade React for a new feature?

```bash
# Analyze first (read-only)
upgrade analyze react

# If comfortable, proceed
upgrade react

# If major version, use incremental approach
upgrade react --major
```

**Result:** Comprehensive upgrade with migrations, testing, and documentation.

---

### Scenario 4: Major Version Migration (Half day)

Need to migrate from Vue 2 to Vue 3?

```bash
# Create an incremental plan
upgrade vue --from 2 --to 3

# Follow the step-by-step process
# Plugin will guide you through each major version
# with checkpoints and validation
```

**Result:** Safe, incremental migration with rollback points at each step.

---

### Scenario 5: Before Refactoring (Research Mode)

Want to know the impact before committing?

```bash
# Analyze without making changes
upgrade analyze next.js 14

# You'll get:
# - Breaking changes list
# - Affected files with line numbers
# - Effort estimation
# - Risk score
# - Migration preview
```

**Result:** Make informed decisions about when to upgrade.

---

## Daily Workflow Integration

### Morning Routine (5 minutes)

```bash
# Check dependency health
upgrade audit

# Apply any security patches
upgrade security-patch --all
```

### Before Starting Work (2 minutes)

```bash
# Quick check for outdated deps
upgrade check --summary
```

### During Development (as needed)

```bash
# Need a new package version for a feature?
upgrade <package-name>
```

### End of Sprint (30 minutes)

```bash
# Clean up all safe upgrades
upgrade safe-all

# Review major upgrades that need planning
upgrade audit --major-only
```

---

## CLI Cheat Sheet

### Auditing
```bash
upgrade audit                    # Full audit
upgrade audit --security-only    # Security vulnerabilities only
upgrade audit --major-only       # Only major version updates
upgrade check <package>          # Check specific package
```

### Upgrading
```bash
upgrade <package>                # Upgrade single package
upgrade <package> <version>      # Upgrade to specific version
upgrade safe-all                 # Batch upgrade low-risk deps
upgrade security-patch <pkg>     # Emergency security patch
```

### Analysis (Read-Only)
```bash
upgrade analyze <package>        # Detailed impact analysis
upgrade what-breaks <package>    # Breaking changes report
upgrade <package> --dry-run      # Preview changes
```

### Major Versions
```bash
upgrade <pkg> --major                      # Major version upgrade
upgrade <pkg> --from <ver> --to <ver>      # Incremental migration
upgrade <pkg> --plan                       # Create upgrade plan
```

### Control
```bash
upgrade continue                 # Resume interrupted upgrade
upgrade rollback                 # Undo last upgrade
upgrade history                  # View upgrade history
upgrade status                   # Check current upgrade status
```

### Options
```bash
--auto-approve                   # Skip approval gate
--dry-run                        # Preview only, no changes
--risk-tolerance=<low|med|high>  # Override risk tolerance
--force                          # Ignore warnings
--report-only                    # Generate report only
```

---

## Understanding the Output

### Risk Scores

| Score | Level | Meaning |
|-------|-------|---------|
| 0-30 | **Low** | Safe to proceed. Minimal or no breaking changes. |
| 31-60 | **Medium** | Proceed with caution. Some breaking changes expected. |
| 61-85 | **High** | Defer or plan carefully. Significant breaking changes. |
| 86-100 | **Critical** | Major effort required. Consider alternatives. |

### Update Types

| Type | Example | Risk | Auto-Upgrade? |
|------|---------|------|---------------|
| **Patch** | 1.2.3 → 1.2.4 | Very Low | ✅ Yes |
| **Minor** | 1.2.3 → 1.3.0 | Low | ✅ Usually |
| **Major** | 1.2.3 → 2.0.0 | Variable | ⚠️ Review needed |

### Status Icons

- ✅ Safe to proceed
- ⚠️ Requires review
- 🚨 High risk / major changes
- 🔒 Security vulnerability
- 📊 Updates available
- ❌ Tests failed

---

## Pro Tips

### 1. Use Audit as a Health Check
```bash
# Add to your Monday morning routine
upgrade audit > weekly-audit.txt
```

### 2. Leverage Dry Run for Big Changes
```bash
# Preview before committing
upgrade next --dry-run

# If comfortable, run for real
upgrade next
```

### 3. Incremental is Safer for Major Jumps
```bash
# Instead of v2 → v5 directly
upgrade <pkg> --from 2 --to 5

# Plugin breaks it into: v2→v3→v4→v5
# Each step has checkpoints and validation
```

### 4. Combine with Git Workflows
```bash
# Create feature branch for upgrade
git checkout -b upgrade/react-18

# Run upgrade
upgrade react

# Plugin commits automatically
# Review, then push
git push -u origin upgrade/react-18

# Create PR
upgrade pr
```

### 5. Security Patches Don't Wait
```bash
# Automate security patches in CI
upgrade security-patch --all --auto-approve
```

### 6. Use Analysis Mode for Planning
```bash
# Planning next sprint?
upgrade analyze next     # "How long will this take?"
upgrade analyze vue      # "What breaks?"
upgrade analyze webpack  # "Worth the effort?"
```

---

## Configuration (Optional)

Copy the example config:
```bash
cp .claude/orchestration/plugins/dependency-upgrader/config.example.json \
   .claude/orchestration/plugins/dependency-upgrader/config.json
```

Customize for your project:
```json
{
  "settings": {
    "default_risk_tolerance": "low",      // How conservative?
    "auto_run_tests": true,               // Always run tests?
    "require_approval": true              // Manual approval needed?
  }
}
```

Most defaults are sensible - configuration is optional.

---

## Troubleshooting

### "No breaking changes found but code breaks"

Some breaking changes aren't documented. Check:
```bash
upgrade analyze <package> --verbose
```

### "Tests failing after upgrade"

1. Check if failures are related to upgrade:
```bash
upgrade status    # Shows test output
```

2. Rollback if needed:
```bash
upgrade rollback
```

3. Review breaking changes and fix manually

### "Migration codemod didn't work"

Codemods work ~80% of the time. For edge cases:
1. Check `.upgrade/manual-migrations.md`
2. Apply changes manually
3. Run `upgrade continue`

### "Risk score seems too high/low"

Override risk tolerance:
```bash
upgrade <package> --risk-tolerance=medium
```

Or adjust in config.json

---

## Next Steps

Now that you've done your first upgrade:

1. **Run weekly audits** - `upgrade audit` every Monday
2. **Apply safe upgrades monthly** - `upgrade safe-all` on first Friday
3. **Plan major upgrades quarterly** - Use analysis mode to prepare
4. **Never miss security patches** - `upgrade security-patch --all` as needed

### Advanced Usage

Once comfortable with basics, explore:
- [Full Examples](./examples.md) - Detailed CLI output examples
- [README](./README.md) - Complete plugin documentation
- [Configuration](./config.example.json) - All available options

---

## Getting Help

```bash
# General help
upgrade --help

# Command-specific help
upgrade <command> --help

# Verbose mode for debugging
upgrade <package> --verbose
```

---

**You're ready to upgrade dependencies with confidence!**

Start with `upgrade audit` and go from there. The plugin will guide you through each step.

Happy upgrading! 🚀
