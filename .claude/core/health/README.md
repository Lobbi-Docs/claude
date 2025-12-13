# Health Check System

Comprehensive health monitoring and diagnostic system for the Claude orchestration framework.

## Overview

The health check system provides automated monitoring, diagnostics, and remediation capabilities for all core components of the Claude orchestration system including:

- **Registry** - Index files and reference integrity
- **MCP Servers** - Configuration and availability
- **Hooks** - Script executability and permissions
- **Agents** - File existence and frontmatter validation
- **Database** - Connectivity and schema integrity (if applicable)

## Quick Start

### CLI Usage

```bash
# Quick health check
npm run health

# Detailed health report
npm run health:verbose

# Auto-fix issues
npm run health:fix

# Check specific component
node --loader tsx ./health/cli.ts --component registry

# JSON output
node --loader tsx ./health/cli.ts --json

# List all checks
node --loader tsx ./health/cli.ts --list

# View metrics
node --loader tsx ./health/cli.ts --metrics
```

### Programmatic Usage

```typescript
import { HealthAPI, quickHealthCheck, healthCheckWithFix } from './health/index.js';

// Quick check
const status = await quickHealthCheck();
console.log(status);

// Detailed check with auto-fix
const result = await healthCheckWithFix();
console.log(result);

// Using the API
const api = new HealthAPI();
const health = await api.getHealth(true);

if (health.status !== 'healthy') {
  const fixes = await api.fixIssues();
  console.log(`Fixed ${fixes.successful}/${fixes.total} issues`);
}
```

## Architecture

### Core Components

1. **HealthChecker** (`health-checker.ts`)
   - Core health check engine
   - Check registration and execution
   - Dependency resolution
   - Timeout and retry handling
   - Metrics tracking

2. **HealthRemediation** (`remediation.ts`)
   - Auto-fix utilities
   - Issue-specific remediation
   - Index rebuilding
   - Component restart

3. **HealthAPI** (`health-api.ts`)
   - HTTP endpoint interfaces
   - Liveness/readiness probes
   - Component-specific checks
   - Text and JSON formatting

4. **Health Checks** (`checks/`)
   - Individual component validators
   - registry-check.ts
   - mcp-check.ts
   - hook-check.ts
   - agent-check.ts
   - database-check.ts

### Type System

```typescript
// Health status levels
enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

// Issue severity
enum Severity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info'
}

// Health check result
interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  timestamp: Date;
  duration: number;
  details?: Record<string, any>;
  issues?: HealthIssue[];
}

// Overall health
interface OverallHealth {
  status: HealthStatus;
  timestamp: Date;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
  issues: HealthIssue[];
  duration: number;
}
```

## Health Checks

### Registry Check

Validates registry index files and their integrity.

**Checks:**
- Registry directory exists
- All expected index files present
- JSON validity
- Schema references
- Agent/skill/workflow file references

**Auto-fixes:**
- Creates missing registry directory
- Generates index templates
- Updates broken references (via registry-fixer)

### MCP Check

Validates MCP server availability and configuration.

**Checks:**
- MCP index exists
- Server configurations valid
- Required environment variables set
- Custom config files present

**Auto-fixes:**
- Creates MCP index template
- Reports missing environment variables

### Hook Check

Validates hook script executability and configuration.

**Checks:**
- Hooks directory exists
- Expected hooks present
- Scripts executable (Unix-like systems)
- Shebang present
- Non-empty content

**Auto-fixes:**
- Creates hooks directory
- Sets execute permissions (chmod +x)
- Adds missing shebangs

### Agent Check

Validates agent file existence and frontmatter.

**Checks:**
- Agents directory exists
- Agent index present
- Agent files exist
- YAML frontmatter valid
- Required fields present

**Auto-fixes:**
- Creates agents directory
- Creates agent index template

### Database Check

Validates database connectivity and schema integrity.

**Checks:**
- Database file exists
- File readable/writable
- Non-empty database
- SQLite connectivity (if library available)
- Table structure

**Auto-fixes:**
- Creates database directory
- Initializes empty database file
- Sets file permissions

## Exit Codes

The CLI uses the following exit codes:

- `0` - All checks passed (HEALTHY)
- `1` - Some checks degraded (DEGRADED)
- `2` - Critical checks failed (UNHEALTHY)
- `3` - Check execution error

## Status Indicators

### Health Status
- ✅ **HEALTHY** - Component functioning normally
- ⚠️ **DEGRADED** - Component has warnings but functional
- ❌ **UNHEALTHY** - Component has critical issues
- ❓ **UNKNOWN** - Component status cannot be determined

### Issue Severity
- 🔴 **CRITICAL** - Requires immediate attention
- 🟡 **WARNING** - Should be addressed soon
- 🔵 **INFO** - Informational, no action required

## Configuration

Health checks can be configured via the HealthChecker constructor:

```typescript
const checker = new HealthChecker({
  enabled: true,
  checksEnabled: ['registry', 'mcp-servers'], // Only run these
  checksDisabled: ['database'], // Skip these
  timeout: 5000, // Default timeout in ms
  retryAttempts: 2,
  autoFix: false,
  reportingLevel: 'standard' // 'verbose' | 'standard' | 'minimal'
});
```

## API Endpoints

The HealthAPI provides the following programmatic endpoints:

### GET /health
Overall health status with summary.

```typescript
const health = await api.getHealth(verbose);
```

### GET /health/live
Liveness probe - is the system running?

```typescript
const live = await api.getLiveness();
```

### GET /health/ready
Readiness probe - can the system handle requests?

```typescript
const ready = await api.getReadiness();
```

### GET /health/:component
Component-specific health check.

```typescript
const result = await api.getComponentHealth('registry');
```

### GET /health/checks
List all available health checks.

```typescript
const checks = api.listChecks();
```

### GET /health/metrics
System health metrics.

```typescript
const metrics = api.getMetrics();
```

### POST /health/fix
Attempt to fix auto-fixable issues.

```typescript
const fixes = await api.fixIssues(autoFixOnly);
```

### POST /health/rebuild-indexes
Rebuild corrupted registry indexes.

```typescript
const result = await api.rebuildIndexes();
```

## Extending Health Checks

### Creating a Custom Check

```typescript
import { HealthCheck, HealthCheckResult, HealthStatus } from './types.js';

export const customCheck: HealthCheck = {
  name: 'my-component',
  description: 'Check my custom component',
  priority: 'medium',
  timeout: 5000,
  retryable: true,
  dependencies: ['registry'], // Optional

  check: async (): Promise<HealthCheckResult> => {
    // Perform your checks
    const issues = [];

    // Add issues if found
    if (somethingWrong) {
      issues.push({
        severity: Severity.WARNING,
        code: 'MY_ISSUE_CODE',
        message: 'Something is wrong',
        component: 'my-component',
        remediation: 'How to fix it',
        autoFixable: true
      });
    }

    return {
      name: 'my-component',
      status: HealthStatus.HEALTHY,
      message: 'Component is healthy',
      timestamp: new Date(),
      duration: 0,
      issues
    };
  }
};
```

### Registering Custom Checks

```typescript
import { HealthChecker } from './health-checker.js';
import { customCheck } from './checks/custom-check.js';

const checker = new HealthChecker();
checker.register(customCheck);
```

## Best Practices

1. **Regular Monitoring** - Run health checks periodically in production
2. **CI/CD Integration** - Include health checks in deployment pipelines
3. **Alerting** - Monitor health status and alert on degradation
4. **Auto-Fix Carefully** - Review auto-fix results before deploying
5. **Custom Checks** - Add domain-specific health checks as needed
6. **Dependencies** - Define check dependencies for proper execution order
7. **Timeouts** - Set appropriate timeouts for long-running checks
8. **Metrics** - Track health metrics over time for trend analysis

## Troubleshooting

### Health Check Fails to Run

- Ensure TypeScript is compiled: `npm run build`
- Check Node.js version compatibility
- Verify all dependencies installed: `npm install`

### Permission Errors (Unix/Linux)

```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Fix database permissions
chmod 644 .claude/data/orchestration.db
```

### Registry Issues

```bash
# Rebuild registry indexes
node --loader tsx ./registry-fixer.ts

# Or via health system
npm run health -- --fix
```

### Database Issues

- Check SQLite installation
- Verify disk space
- Check file permissions
- Review database schema

## Performance

Typical health check performance:

- **Quick Check** (summary only): < 100ms
- **Full Check** (all components): 200-500ms
- **With Auto-Fix**: 500ms - 2s (depending on fixes needed)

## Security Considerations

- Health endpoints should be secured in production
- Avoid exposing sensitive details in health responses
- Auto-fix operations should be logged and auditable
- Limit access to remediation endpoints

## Related Documentation

- [Registry Validator](../registry-validator.ts)
- [Orchestration Hooks](../../hooks/README.md)
- [MCP Configuration](../../mcp/README.md)
- [Agent System](../../agents/README.md)

## License

Part of the Claude orchestration system. See project LICENSE.
