# Health Check System - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Health Check System                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
         ┌───────────────────────────────────────────┐
         │          Entry Points                      │
         ├───────────────────────────────────────────┤
         │  • CLI (cli.ts)                           │
         │  • API (health-api.ts)                    │
         │  • Programmatic (index.ts exports)        │
         │  • Command (/health)                      │
         └───────────────┬───────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────────────┐
         │      HealthAPI                             │
         ├───────────────────────────────────────────┤
         │  • getHealth(verbose)                     │
         │  • getLiveness()                          │
         │  • getReadiness()                         │
         │  • getComponentHealth(name)               │
         │  • listChecks()                           │
         │  • getMetrics()                           │
         │  • fixIssues(autoFixOnly)                 │
         │  • formatHealthText()                     │
         └───────────────┬───────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────────┐         ┌─────────────────────┐
│  HealthChecker     │         │  HealthRemediation  │
├────────────────────┤         ├─────────────────────┤
│ • register()       │         │ • fix()             │
│ • runAll()         │         │ • rebuildIndexes()  │
│ • run(name)        │         │ • restartComponent()│
│ • getStatus()      │         └─────────────────────┘
│ • getMetrics()     │
│ • topologicalSort()│
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Health Checks (checks/)                 │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Registry     │  │ MCP Servers  │                │
│  │ Check        │  │ Check        │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Hooks        │  │ Agents       │                │
│  │ Check        │  │ Check        │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐                                   │
│  │ Database     │                                   │
│  │ Check        │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Type System (types.ts)                  │
├─────────────────────────────────────────────────────┤
│ • HealthStatus (enum)                               │
│ • Severity (enum)                                   │
│ • HealthCheck (interface)                           │
│ • HealthCheckResult (interface)                     │
│ • OverallHealth (interface)                         │
│ • HealthIssue (interface)                           │
│ • FixResult (interface)                             │
│ • HealthMetrics (interface)                         │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Health Check Execution Flow

```
User Request
    │
    ▼
┌─────────────────┐
│ CLI / API Entry │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  HealthAPI          │
│  - Parse options    │
│  - Select operation │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│  HealthChecker           │
│  - Load checks           │
│  - Resolve dependencies  │
│  - Topological sort      │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Execute Checks (Parallel)  │
│  - Timeout handling         │
│  - Retry logic              │
│  - Error capture            │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Aggregate Results       │
│  - Calculate status      │
│  - Collect issues        │
│  - Generate summary      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Auto-Fix (if enabled)   │
│  - Filter fixable issues │
│  - Execute remediation   │
│  - Collect fix results   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Format Output           │
│  - Text (with emoji)     │
│  - JSON                  │
│  - Structured object     │
└────────┬─────────────────┘
         │
         ▼
    Return to User
```

## Component Interaction

### Check Registration

```
┌──────────────────┐
│  Application     │
│  Startup         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  HealthChecker.register()│
│  - Validate check        │
│  - Store in Map          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Check Map               │
│  registry -> RegistryChk │
│  mcp-servers -> McpCheck │
│  hooks -> HookCheck      │
│  agents -> AgentCheck    │
│  database -> DatabaseChk │
└──────────────────────────┘
```

### Dependency Resolution

```
Registered Checks:
  - registry (no deps)
  - agents (depends on: registry)
  - mcp-servers (no deps)
  - hooks (no deps)
  - database (no deps)

Topological Sort:
  1. registry ──┐
  2. mcp-servers│
  3. hooks      │
  4. database   │
  5. agents ────┘ (depends on registry)

Execution Order: 1 → 2 → 3 → 4 → 5
```

## File Organization

```
health/
│
├── Core System Files
│   ├── types.ts              # Type definitions
│   ├── health-checker.ts     # Execution engine
│   ├── health-api.ts        # API layer
│   ├── remediation.ts       # Auto-fix system
│   ├── index.ts             # Public exports
│   └── cli.ts               # Command line
│
├── Health Checks
│   └── checks/
│       ├── index.ts         # Check registry
│       ├── registry-check.ts
│       ├── mcp-check.ts
│       ├── hook-check.ts
│       ├── agent-check.ts
│       └── database-check.ts
│
└── Documentation
    ├── README.md            # Usage guide
    ├── ARCHITECTURE.md      # This file
    └── IMPLEMENTATION_SUMMARY.md
```

## State Management

### HealthChecker State

```typescript
class HealthChecker {
  private checks: Map<string, HealthCheck>
  private config: HealthConfiguration
  private metrics: HealthMetrics
  private startTime: Date

  // State transitions:
  // 1. Initialize (empty)
  // 2. Register checks (populate Map)
  // 3. Run checks (update metrics)
  // 4. Return results (immutable)
}
```

### HealthRemediation State

```typescript
class HealthRemediation {
  private fixAttempts: Map<string, number>
  private maxRetries: 3

  // State tracking:
  // - Attempts per issue code
  // - Retry limits
  // - Fix history
}
```

## Error Handling

### Check Execution

```
Try Execute Check
    │
    ├─ Success ────────────> Return Result
    │
    └─ Error ──┬─ Timeout ──> Retry (if retryable)
               │
               ├─ Exception ─> Retry (if retryable)
               │
               └─ Max Retries> Return UNHEALTHY
```

### Auto-Fix

```
Try Fix Issue
    │
    ├─ Not Auto-fixable ──> Return failure (manual)
    │
    ├─ Max Attempts ──────> Return failure (limit)
    │
    └─ Attempt Fix
        │
        ├─ Success ───────> Return success
        │
        └─ Error ─────────> Return failure (details)
```

## Performance Characteristics

### Time Complexity

- **Check Registration**: O(1)
- **Dependency Sort**: O(n) where n = number of checks
- **Check Execution**: O(n) with parallelization
- **Result Aggregation**: O(n)
- **Overall**: O(n) linear time

### Space Complexity

- **Check Storage**: O(n)
- **Results Storage**: O(n)
- **Metrics Storage**: O(1)
- **Overall**: O(n) linear space

### Execution Times (Typical)

```
Quick Check (summary only):
├─ Registry:    20-50ms
├─ MCP:         30-80ms
├─ Hooks:       40-100ms
├─ Agents:      50-150ms
└─ Database:    10-30ms
────────────────────────
Total:          ~200ms (parallel)

With Auto-Fix:
├─ Detection:   200ms
├─ Fix Ops:     300-1500ms
└─ Re-check:    200ms
────────────────────────
Total:          ~700-1900ms
```

## Security Model

### Permission Levels

```
┌──────────────────────────────┐
│  Read-Only Operations        │
│  • List checks               │
│  • Get status                │
│  • View metrics              │
│  • Format output             │
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Diagnostic Operations       │
│  • Run checks                │
│  • Check components          │
│  • Read configs              │
│  • Access files              │
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Remediation Operations      │
│  • Create directories        │
│  • Generate files            │
│  • Set permissions           │
│  • Rebuild indexes           │
│  REQUIRES: Elevated access   │
└──────────────────────────────┘
```

## Integration Points

### With Existing Systems

```
┌─────────────────────────────────────────┐
│  Claude Orchestration System            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │ Registry     │◄──│ Health Check │  │
│  │ System       │   │ System       │  │
│  └──────────────┘   └──────┬───────┘  │
│                            │          │
│  ┌──────────────┐          │          │
│  │ MCP          │◄─────────┤          │
│  │ Servers      │          │          │
│  └──────────────┘          │          │
│                            │          │
│  ┌──────────────┐          │          │
│  │ Hook         │◄─────────┤          │
│  │ System       │          │          │
│  └──────────────┘          │          │
│                            │          │
│  ┌──────────────┐          │          │
│  │ Agent        │◄─────────┤          │
│  │ System       │          │          │
│  └──────────────┘          │          │
│                            │          │
│  ┌──────────────┐          │          │
│  │ Database     │◄─────────┘          │
│  │ (Optional)   │                     │
│  └──────────────┘                     │
└─────────────────────────────────────────┘
```

## Extension Architecture

### Adding New Health Checks

```typescript
// 1. Create check file
// checks/my-check.ts

import { HealthCheck, HealthCheckResult } from '../types.js';

export const myCheck: HealthCheck = {
  name: 'my-component',
  description: 'Check my component',
  priority: 'medium',
  timeout: 5000,
  retryable: true,
  dependencies: ['registry'], // Optional

  check: async (): Promise<HealthCheckResult> => {
    // Implementation
    return {
      name: 'my-component',
      status: HealthStatus.HEALTHY,
      message: 'All good',
      timestamp: new Date(),
      duration: 0
    };
  }
};

// 2. Export from checks/index.ts
export { myCheck } from './my-check.js';
export const ALL_CHECKS = [
  // ... existing checks
  myCheck
];

// 3. Auto-registered!
```

### Adding Auto-Fix Handlers

```typescript
// remediation.ts

async fix(issue: HealthIssue): Promise<FixResult> {
  switch (issue.code) {
    // Add new case
    case 'MY_NEW_ISSUE':
      return await this.fixMyIssue(issue);

    // ... existing cases
  }
}

private async fixMyIssue(issue: HealthIssue): Promise<FixResult> {
  // Implementation
  return {
    success: true,
    issue,
    message: 'Fixed successfully'
  };
}
```

## Monitoring Integration

### Prometheus Metrics (Future)

```
# Metrics to expose
health_check_duration_seconds{check="registry"}
health_check_total{check="registry",status="healthy"}
health_check_failures_total{check="registry"}
health_fix_attempts_total{issue="INDEX_MISSING"}
health_fix_success_total{issue="INDEX_MISSING"}
```

### Kubernetes Integration

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30

# Readiness probe
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Design Decisions

### Why Dependency-Based Execution?

- Ensures checks run in correct order
- Agents check depends on registry being valid
- Prevents cascading false failures
- Topological sort handles complex dependencies

### Why Retry Logic?

- Network timeouts can be transient
- File locks may be temporary
- Increases reliability
- Exponential backoff prevents thrashing

### Why Auto-Fix?

- Reduces manual intervention
- Faster recovery
- Idempotent operations
- Safe defaults

### Why Multiple Output Formats?

- Text: Human-readable, debugging
- JSON: CI/CD integration, monitoring
- Structured: Programmatic use
- Flexibility for different use cases

## Conclusion

The health check system architecture is designed for:

- **Extensibility** - Easy to add new checks
- **Reliability** - Retry and error handling
- **Performance** - Parallel execution
- **Maintainability** - Clear separation of concerns
- **Integration** - Multiple entry points
- **Observability** - Metrics and detailed reporting
