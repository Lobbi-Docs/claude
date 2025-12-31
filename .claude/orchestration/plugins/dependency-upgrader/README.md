# Dependency Upgrade Assistant Plugin

**Callsign:** Upgrader
**Version:** 1.0.0
**Agents:** 12
**Ecosystems:** npm, pip, cargo, yarn, pnpm, poetry

## The Problem

Upgrading dependencies is one of the most stressful and time-consuming tasks in software development:

- **Fear of breaking changes** - "What will this break?"
- **Unknown effort** - "How long will this take?"
- **Manual detective work** - Reading CHANGELOGs, searching for migration guides
- **Tedious refactoring** - Updating the same pattern across 50 files
- **Testing anxiety** - "Did I test everything that changed?"
- **Major version jumps** - "How do I go from v2 to v5 safely?"

**Result:** Dependencies get neglected, security vulnerabilities pile up, and eventually you're stuck on ancient versions with a massive upgrade cliff.

## The Solution

The Dependency Upgrade Assistant plugin automates the hard parts and guides you through the rest:

### What It Does For You

1. **Instant Audit** - See what needs upgrading in seconds, not hours
2. **Breaking Change Detection** - Automatically fetches and parses CHANGELOGs
3. **Code Impact Analysis** - Shows you exactly which files will break
4. **Auto-Generated Migrations** - Creates codemods and migration scripts
5. **Smart Risk Assessment** - Calculates risk scores based on multiple factors
6. **Incremental Paths** - Breaks scary major upgrades into safe steps
7. **Targeted Testing** - Runs only the tests that matter
8. **Full Rollback Plans** - Always have an escape hatch

### Real Developer Value

**Time Saved:**
- Manual CHANGELOG reading: 30-60 min → 0 min
- Finding affected code: 45-90 min → 2 min
- Writing migration scripts: 2-4 hours → 5 min
- Planning major upgrades: 4-8 hours → 15 min

**Confidence Gained:**
- Know exactly what will break before you start
- See effort estimates upfront
- Get rollback plans automatically
- Test with precision, not paranoia

**Risk Reduced:**
- Catch breaking changes you'd miss
- Validate migrations before committing
- Create checkpoints for major upgrades
- Never skip security patches again

## Architecture

### 12 Specialized Agents

Each agent has a focused responsibility:

| Agent | Model | Purpose |
|-------|-------|---------|
| **Dependency Analyzer** | Haiku | Fast scan of package manifests and registries |
| **Breaking Change Detective** | Sonnet | Deep CHANGELOG and release note analysis |
| **Code Impact Scanner** | Sonnet | Find all affected code with AST analysis |
| **Migration Code Generator** | Sonnet | Auto-generate codemods and refactoring scripts |
| **Test Strategy Planner** | Sonnet | Identify which tests to run based on changes |
| **Incremental Path Planner** | Sonnet | Create safe upgrade paths for major versions |
| **Compatibility Checker** | Haiku | Verify peer dependencies and detect conflicts |
| **Risk Assessor** | Sonnet | Calculate risk scores with multiple factors |
| **Rollback Strategist** | Haiku | Plan rollback procedures and safety checkpoints |
| **Documentation Generator** | Haiku | Create upgrade reports and PR descriptions |
| **Test Executor** | Haiku | Run targeted test suites |
| **Migration Validator** | Sonnet | Validate successful migrations |

### Model Strategy

- **Haiku** for fast, simple tasks (scanning, documentation, test execution)
- **Sonnet** for analysis and code generation (breaking changes, migrations, risk)
- **Opus** (optional) for ultra-complex major version planning

This balances speed, cost, and quality.

## Core Workflows

### 1. Quick Audit (5-10 min)
**Use:** "What can I safely upgrade today?"

Perfect for weekly maintenance. Get a categorized list of safe upgrades, security patches, and high-risk packages.

```bash
upgrade audit
```

### 2. Single Package Upgrade (15-30 min)
**Use:** "Upgrade React to latest"

Comprehensive analysis → migration generation → testing → validation. The gold standard upgrade.

```bash
upgrade react
```

### 3. Major Version Migration (1-4 hours)
**Use:** "Migrate Vue 2 to Vue 3"

Incremental approach breaks major jumps into safe steps with checkpoints. No more big-bang upgrades.

```bash
upgrade vue --from 2 --to 3
```

### 4. Bulk Safe Upgrades (20-40 min)
**Use:** "Upgrade all patch/minor versions"

Monthly cleanup. Batch upgrade all low-risk dependencies at once.

```bash
upgrade safe-all
```

### 5. Breaking Change Analysis (10-20 min)
**Use:** "What breaks if I upgrade Next.js?"

Read-only research mode. Understand the impact before committing to the upgrade.

```bash
upgrade analyze next
```

### 6. Security Patch (10-15 min)
**Use:** "Emergency CVE patch"

Fast-track critical security fixes with minimal validation.

```bash
upgrade security-patch axios
```

## Data Models

Type-safe interfaces ensure reliable communication between agents:

### Core Types
- `DependencyInfo` - Package with version info and metadata
- `BreakingChange` - Parsed breaking change with migration hints
- `CodeImpact` - Specific code location affected by breaking change
- `MigrationStep` - Executable migration action (codemod, script, manual)
- `UpgradePath` - Step-by-step plan for major version jumps
- `RiskAssessment` - Multi-factor risk score and recommendations
- `TestPlan` - Targeted test strategy based on code changes
- `ValidationReport` - Post-upgrade verification results

### Session State
`UpgradeSession` tracks the entire upgrade journey with outputs from all 12 agents, enabling:
- Progress tracking
- Error recovery
- Checkpoint/restore
- Audit trails

## Key Features

### Breaking Change Detection
- Fetches CHANGELOGs from GitHub/GitLab
- Parses release notes and migration guides
- Uses context7 MCP for library documentation
- Extracts structured breaking change data
- Categorizes by severity and type

### Code Impact Analysis
- AST-based code scanning
- Detects deprecated API usage
- Finds configuration changes needed
- Estimates refactoring effort
- Provides line-by-line suggestions

### Migration Code Generation
- **JavaScript/TypeScript**: jscodeshift codemods
- **Python**: AST transformation scripts
- **Rust**: Macro-based refactoring
- **Fallback**: Regex find-and-replace scripts
- **Output**: Executable scripts + patch files for review

### Incremental Upgrade Paths
Transforms risky big-bang upgrades into safe incremental journeys:

```
v2.7.14 → v5.3.0  (scary!)

Becomes:
Step 1: v2.7.14 → v2.7.16 (prep)
Step 2: v2.7.16 → v3.0.0 (major)
Step 3: v3.0.0 → v4.0.0 (major)
Step 4: v4.0.0 → v5.0.0 (major)
Step 5: v5.0.0 → v5.3.0 (polish)

Each step: checkpoint → test → validate → proceed
```

### Risk Assessment (0-100 Score)
Multi-factor analysis:
- **Breaking changes** (weight: 30%)
- **Code impact** (weight: 25%)
- **Test coverage** (weight: 20%)
- **Package maturity** (weight: 10%)
- **Community adoption** (weight: 10%)
- **Rollback difficulty** (weight: 5%)

Outputs: Risk score, level (low/medium/high/critical), recommendation (proceed/caution/defer/reject)

### Smart Testing
Instead of "run all tests and hope," the plugin:
- Maps code changes to relevant tests
- Prioritizes high-risk tests
- Runs smoke tests first for quick feedback
- Executes full suite only when needed
- Identifies flaky tests vs real failures

### Always-Safe Rollback
Every upgrade includes:
- Backup branch creation
- Pre-upgrade state snapshot
- Quick rollback commands
- Full rollback procedure
- Monitoring checkpoints

## Configuration

```json
{
  "default_risk_tolerance": "low",
  "auto_run_tests": true,
  "create_backup_branch": true,
  "max_major_version_jump": 2,
  "parallel_upgrades": false,
  "require_approval": true
}
```

Customize in `.claude/orchestration/plugins/dependency-upgrader/config.json`

## Integration

### Required MCPs
- **github** - For fetching CHANGELOGs and release notes

### Optional MCPs
- **context7** - For library documentation (highly recommended)

### Required Skills
- **testing** - Test execution and analysis
- **git-workflows** - Branch management and commits

### Hooks
- `pre-upgrade` - Validation before starting
- `post-upgrade` - Cleanup and notification
- `migration-validation` - Custom validation checks

## Usage Examples

See [examples.md](./examples.md) for detailed CLI output examples.

### Quick Start
```bash
# See what needs upgrading
upgrade audit

# Upgrade a package safely
upgrade <package-name>

# Research a major upgrade
upgrade analyze <package-name> <version>

# Upgrade all safe dependencies
upgrade safe-all

# Emergency security patch
upgrade security-patch <package-name>
```

### Advanced
```bash
# Incremental major upgrade
upgrade <package> --from <version> --to <version>

# Custom risk tolerance
upgrade <package> --risk-tolerance=high

# Dry run (no changes)
upgrade <package> --dry-run

# Auto-approve (skip approval gate)
upgrade <package> --auto-approve

# Continue interrupted upgrade
upgrade continue

# Rollback last upgrade
upgrade rollback
```

## Real-World Impact

### Before This Plugin
```
Developer: "We need to upgrade React..."
Manager: "How long?"
Developer: "Uh... 2 days? Maybe a week? I need to read the CHANGELOG..."
Manager: "Just to upgrade one package?"
Developer: "It's v18, there are breaking changes..."
Manager: "Can we defer this?"
Developer: "We're 6 versions behind and have 3 security vulnerabilities..."

Result: Upgrade deferred, tech debt accumulates
```

### After This Plugin
```
Developer: "Running upgrade audit..."
[8 seconds later]
Developer: "12 safe upgrades available, 1 security patch needed.
           React upgrade is medium risk, 3 hours estimated."
Manager: "Can we do it this sprint?"
Developer: "Yes. The plugin will handle migrations and testing.
           I'll review the PR tomorrow."
Manager: "Great. And the security patch?"
Developer: "Already applied and deployed. Took 2 minutes."

Result: Dependencies stay current, security stays tight, developers stay happy
```

## Metrics Tracked

- `upgrades_completed` - Total successful upgrades
- `breaking_changes_detected` - Accuracy of detection
- `migrations_generated` - Auto-migration success rate
- `test_failures_prevented` - Regressions caught before merge
- `time_saved` - Hours saved vs manual process

## Future Enhancements

- **AI-powered migration suggestions** - Learn from past upgrades
- **Team collaboration** - Share upgrade plans across team
- **Dependency health scoring** - Proactive recommendations
- **Automated PR creation** - One-click upgrade PRs
- **Slack/Discord notifications** - Alert team of security patches
- **Custom migration rules** - Project-specific patterns

## Why This Matters

Dependencies are the foundation of modern software. When they're neglected:
- Security vulnerabilities go unpatched
- Bug fixes are missed
- Performance improvements are lost
- Tech debt compounds exponentially
- Eventually you face an upgrade cliff (v2 to v7 anyone?)

This plugin makes dependency management **proactive instead of reactive**.

Instead of dreading upgrades, you'll:
- Run weekly audits (5 minutes)
- Apply safe upgrades monthly (30 minutes)
- Plan major upgrades quarterly (with confidence)
- Never miss a security patch (2 minutes each)

**Result:** Healthy, secure, up-to-date dependencies without the stress.

## Getting Started

1. Install the plugin:
   ```bash
   claude plugin install dependency-upgrader
   ```

2. Run your first audit:
   ```bash
   upgrade audit
   ```

3. Try a safe upgrade:
   ```bash
   upgrade <low-risk-package>
   ```

4. Experience the difference!

## Contributing

Found a package manager edge case? New migration pattern? Better risk heuristic?

Contributions welcome! This plugin gets better as it learns from real-world upgrades.

## License

MIT

---

**Built with Claude Orchestration System**
Making dependency upgrades less painful, one package at a time.
