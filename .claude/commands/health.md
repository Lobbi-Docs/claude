---
name: health
description: Run health checks on the Claude orchestration system
category: system
priority: high
keywords: [health, status, check, diagnostic, system, monitoring]
---

# Health Check Command

Run comprehensive health checks on the Claude orchestration system to identify and fix issues.

## Usage

```bash
/health [options]
```

## Options

- `--verbose` - Show detailed health information including all check details
- `--fix` - Automatically attempt to fix auto-fixable issues
- `--component [name]` - Check only a specific component (registry, mcp-servers, hooks, agents, database)
- `--json` - Output results in JSON format
- `--list` - List all available health checks
- `--metrics` - Show health metrics and statistics

## Examples

### Quick Health Check
```bash
/health
```
Shows overall system health status with summary.

### Detailed Health Check
```bash
/health --verbose
```
Shows full health report with all component details and issues.

### Auto-Fix Issues
```bash
/health --fix
```
Runs health checks and attempts to automatically fix any auto-fixable issues.

### Check Specific Component
```bash
/health --component registry
/health --component mcp-servers
/health --component hooks
```

### JSON Output
```bash
/health --json
```
Outputs health status in JSON format for programmatic use.

### List Available Checks
```bash
/health --list
```
Lists all registered health checks with their descriptions.

### View Metrics
```bash
/health --metrics
```
Shows health check metrics and statistics.

## Health Check Components

1. **Registry** - Validates registry index files and references
2. **MCP Servers** - Checks MCP server availability and configuration
3. **Hooks** - Validates hook script executability
4. **Agents** - Checks agent file existence and frontmatter
5. **Database** - Tests database connectivity (if applicable)

## Status Indicators

- ✅ **HEALTHY** - Component is functioning normally
- ⚠️ **DEGRADED** - Component has warnings but is functional
- ❌ **UNHEALTHY** - Component has critical issues
- ❓ **UNKNOWN** - Component status cannot be determined

## Issue Severity

- 🔴 **CRITICAL** - Requires immediate attention
- 🟡 **WARNING** - Should be addressed soon
- 🔵 **INFO** - Informational, no action required

## Auto-Fixable Issues

The following issues can be automatically fixed with `--fix`:

- Missing registry directory
- Missing index files (creates templates)
- Missing hooks/agents directories
- Non-executable hook scripts (Unix-like systems)
- Missing shebangs in hook scripts
- File permission issues (Unix-like systems)
- Database initialization

## Implementation

Execute the health check system using the health API:

```typescript
import { HealthAPI } from '../core/health/index.js';

// Parse command arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const fix = args.includes('--fix');
const json = args.includes('--json');
const list = args.includes('--list');
const metrics = args.includes('--metrics');
const componentIndex = args.indexOf('--component');
const component = componentIndex >= 0 ? args[componentIndex + 1] : null;

// Create API instance
const api = new HealthAPI({ enableAutoFix: fix });

// Execute requested action
if (list) {
  const checks = api.listChecks();
  console.log('Available Health Checks:');
  console.log(JSON.stringify(checks, null, 2));
} else if (metrics) {
  const metrics = api.getMetrics();
  console.log('Health Metrics:');
  console.log(JSON.stringify(metrics, null, 2));
} else if (component) {
  const result = await api.getComponentHealth(component);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Component: ${component}`);
    console.log(`Status: ${result.status}`);
    console.log(`Message: ${result.message}`);
    if (verbose) {
      console.log(`Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }
} else {
  const health = await api.getHealth(verbose);

  if (json) {
    console.log(JSON.stringify(health, null, 2));
  } else {
    const text = await api.formatHealthText(verbose);
    console.log(text);
  }

  if (fix && health.issues && health.issues.length > 0) {
    console.log('\nAttempting to fix issues...');
    const fixes = await api.fixIssues(true);
    console.log(`Fixed ${fixes.successful}/${fixes.total} issues`);

    if (verbose) {
      console.log(JSON.stringify(fixes.results, null, 2));
    }
  }
}
```

## Exit Codes

- `0` - All checks passed (HEALTHY)
- `1` - Some checks degraded (DEGRADED)
- `2` - Critical checks failed (UNHEALTHY)
- `3` - Check execution error

## Notes

- Health checks run in dependency order
- Some checks require specific environment setup
- Auto-fix may not resolve all issues
- Critical issues should be manually reviewed
- Windows platform has limited auto-fix capabilities for permissions

## Related Commands

- `/context-optimize` - Optimize context usage
- `/registry-validate` - Validate registry integrity
