# Agent Performance System

**Version**: 7.4.0
**Workstream**: AI-1099 Foundation Fixes
**Branch**: `feature/AI-1099-foundation-fixes`

## Overview

The Agent Performance System streamlines agent loading, caching, and execution metrics for the Jira Orchestrator plugin. This system delivers measurable improvements:

- **Agent load time < 500ms** (enforced timeout)
- **LRU caching** reduces repeated load overhead
- **Parallel preloading** of frequently-used agents
- **Per-agent execution metrics** for optimization
- **Aggregate analytics** for system-wide insights

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                 Agent Performance System                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Agent Loader  │  │ Agent Cache  │  │ Agent Metrics│ │
│  │               │  │              │  │              │ │
│  │ - Lazy load   │  │ - LRU cache  │  │ - Execution  │ │
│  │ - Preload     │  │ - 30 agents  │  │   tracking   │ │
│  │ - Timeout     │  │ - Hit rate   │  │ - Success    │ │
│  │ - Parallel    │  │ - Eviction   │  │   rate       │ │
│  └───────────────┘  └──────────────┘  └──────────────┘ │
│         ▲                  ▲                  ▲          │
│         └──────────────────┴──────────────────┘          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │  Agent Registry       │
              │  agents.index.json    │
              └───────────────────────┘
```

### Files

| File | Purpose | Lines |
|------|---------|-------|
| `agent-cache.ts` | LRU cache with agent-specific queries | 330 |
| `agent-loader.ts` | Lazy loading with preload strategy | 400 |
| `agent-metrics.ts` | Execution metrics and analytics | 450 |
| `agent-performance-integration.ts` | Unified API and examples | 250 |

## Features

### 1. Agent Loader (`agent-loader.ts`)

**Lazy Loading**: Agents load on-demand, not at startup.

```typescript
const loader = new AgentLoader({
  registryPath: './registry/agents.index.json',
  agentsDir: './agents',
  maxCachedAgents: 30,
  loadTimeoutMs: 500,
  preloadAgents: ['triage-agent', 'code-reviewer']
});

await loader.initialize();  // Loads registry + preloads agents

const agent = await loader.getAgent('triage-agent');  // From cache
const agent2 = await loader.getAgent('sprint-planner');  // Lazy load
```

**Parallel Preloading**: Common agents load at startup in parallel.

```typescript
// Preload 4 agents in parallel (reduces startup blocking)
await loader.warmCache([
  'triage-agent',
  'code-reviewer',
  'task-enricher',
  'documentation-writer'
]);
```

**Load Timeout**: Protects against slow file I/O.

```typescript
// Logs warning if load exceeds 500ms
const agent = await loader.getAgent('slow-agent');
// Warning: Agent slow-agent took 650ms to load (timeout: 500ms)
```

**Search by Criteria**: Find agents without loading.

```typescript
// Search by category
const coreAgents = loader.searchAgents({ category: 'core' });

// Search by type
const intelligenceAgents = loader.searchAgents({ type: 'intelligence' });

// Search by skill
const confluenceAgents = loader.searchAgents({ skill: 'confluence' });
```

### 2. Agent Cache (`agent-cache.ts`)

**LRU Eviction**: Least recently used agents evicted when cache full.

```typescript
const cache = new AgentCache({ maxSize: 30 });

// Add 30 agents
for (let i = 0; i < 30; i++) {
  cache.set(`agent-${i}`, agentData);
}

// Adding 31st triggers eviction of least recently used
cache.set('agent-31', agentData);

const stats = cache.getStats();
console.log(`Evictions: ${stats.evictions}`);  // 1
```

**Cache Statistics**: Track hit rate and usage patterns.

```typescript
const stats = cache.getStats();

console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Size: ${stats.size}/${stats.maxSize}`);
console.log(`Most Accessed: ${stats.mostAccessed.join(', ')}`);
```

**Persistence**: Save cache to disk on shutdown.

```typescript
const cache = new AgentCache({
  maxSize: 30,
  persistPath: './sessions/cache/agents.json'
});

// Save cache
cache.persist();

// Restore on next startup
cache.restore();
```

### 3. Agent Metrics (`agent-metrics.ts`)

**Execution Tracking**: Measure timing, success rate, token usage.

```typescript
const metrics = new AgentMetricsCollector('./sessions/metrics/agents');

// Start tracking
const executionId = metrics.startExecution('triage-agent', 'sonnet', 'triage');

try {
  // Execute agent
  await executeTriageLogic();

  // Record success
  metrics.endExecution(executionId, true, undefined, 1200);
} catch (error) {
  // Record failure
  metrics.endExecution(executionId, false, error.name);
}
```

**Per-Agent Metrics**: Detailed statistics for optimization.

```typescript
const agentMetrics = metrics.getAgentMetrics('triage-agent');

console.log(`Success Rate: ${(agentMetrics.successRate * 100).toFixed(1)}%`);
console.log(`Avg Duration: ${agentMetrics.avgDurationMs.toFixed(0)}ms`);
console.log(`P95 Duration: ${agentMetrics.p95DurationMs.toFixed(0)}ms`);
console.log(`Total Tokens: ${agentMetrics.totalTokensUsed}`);
```

**Aggregate Analytics**: System-wide insights.

```typescript
const aggregate = metrics.getAggregateMetrics();

console.log(`Total Executions: ${aggregate.totalExecutions}`);
console.log(`Overall Success Rate: ${(aggregate.overallSuccessRate * 100).toFixed(1)}%`);

// Top agents by usage
aggregate.topAgentsByUsage.forEach(({ name, count }) => {
  console.log(`  ${name}: ${count} executions`);
});

// Failures by error type
Object.entries(aggregate.failuresByErrorType).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
```

**Retention Management**: Clean up old metrics.

```typescript
// Remove metrics older than 30 days
const removed = metrics.cleanup(30);
console.log(`Removed ${removed} old execution records`);
```

## Usage

### Basic Integration

```typescript
import { AgentPerformanceSystem } from './lib/agent-performance-integration';

// Initialize system
const perfSystem = new AgentPerformanceSystem();
await perfSystem.initialize();

// Execute agent with tracking
const result = await perfSystem.executeAgent(
  'triage-agent',
  'sonnet',
  'triage',
  async () => {
    // Your agent logic here
    return await triageIssue(issueKey);
  }
);

// Get performance report
console.log(perfSystem.getPerformanceReport());
```

### Integration with AgentSwarm

Update `lib/agent-swarm.ts`:

```typescript
import { AgentMetricsCollector } from './agent-metrics';

export class AgentSwarm {
  private metricsCollector: AgentMetricsCollector;

  constructor(config: Partial<SwarmConfig> = {}) {
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };
    this.metricsCollector = new AgentMetricsCollector('./sessions/metrics/agents');
  }

  private async executeAgent(agentName: string, model: string): Promise<any> {
    const executionId = this.metricsCollector.startExecution(
      agentName,
      model,
      'swarm-exploration'
    );

    try {
      // ... existing agent execution logic
      const result = await performAgentTask();
      this.metricsCollector.endExecution(executionId, true);
      return result;
    } catch (error) {
      this.metricsCollector.endExecution(executionId, false, error.name);
      throw error;
    }
  }

  getMetrics(): SwarmMetrics & { agentMetrics: AggregateMetrics } {
    return {
      ...this.metrics,
      agentMetrics: this.metricsCollector.getAggregateMetrics()
    };
  }
}
```

## Performance Targets

### Success Criteria

| Metric | Target | Measured By |
|--------|--------|-------------|
| Agent load time | < 500ms | `LoadedAgent.loadTimeMs` |
| Cache hit rate | > 60% | `CacheStats.hitRate` |
| Preload time | < 1000ms | Logged at startup |
| Metrics overhead | < 5ms/execution | Measured in `startExecution`/`endExecution` |

### Optimization Strategies

1. **Preload Frequently-Used Agents**: Configured in `metadata.preloadHints` in registry
2. **Increase Cache Size**: Adjust `maxCachedAgents` based on available memory
3. **Reduce Agent File Size**: Split large agents into modules
4. **Parallel Loading**: Use `loader.getAgents()` for batch operations

## Monitoring

### Loader Statistics

```bash
# Export loader stats to file
const stats = loader.getStats();
fs.writeFileSync('loader-stats.json', JSON.stringify(stats, null, 2));
```

**Output**:
```json
{
  "totalAgentsInRegistry": 73,
  "cachedAgents": 12,
  "preloadedAgents": 4,
  "avgLoadTimeMs": 135,
  "cacheHitRate": 0.68,
  "evictionCount": 2
}
```

### Metrics Summary

```bash
# Print summary report
console.log(metrics.getSummaryReport());
```

**Output**:
```
=== Agent Metrics Summary ===
Total Executions: 247
Success Rate: 94.7%
Avg Duration: 1235ms

Top 5 Agents by Usage:
  triage-agent: 62 executions
  code-reviewer: 45 executions
  task-enricher: 38 executions
  documentation-writer: 31 executions
  confluence-manager: 23 executions

Top 5 Slowest Agents:
  intelligence-analyzer: 3245ms avg
  infrastructure-orchestrator: 2890ms avg
  code-reviewer: 1876ms avg
  requirements-analyzer: 1534ms avg
  triage-agent: 1102ms avg
```

## File Locations

### Storage Paths

```
sessions/
├── metrics/
│   └── agents/
│       ├── agent-executions.json      # Execution history
│       └── performance-report.json    # Exported reports
└── cache/
    └── agents.json                     # Cached agent data (optional)
```

### Configuration

**Registry**: `registry/agents.index.json`
```json
{
  "metadata": {
    "version": "7.4.0",
    "totalAgents": 73,
    "preloadHints": ["triage-agent", "code-reviewer"]
  },
  "agentPerformance": {
    "triage-agent": {
      "loadPriority": "high",
      "expectedLoadTimeMs": 100
    }
  }
}
```

## Best Practices

### 1. Preload Strategy

Configure preload based on usage patterns:

```typescript
// High-frequency agents (used in > 50% of workflows)
const HIGH_PRIORITY = ['triage-agent', 'code-reviewer'];

// Medium-frequency agents (used in 20-50% of workflows)
const MEDIUM_PRIORITY = ['task-enricher', 'documentation-writer'];

// Low-frequency agents (used in < 20% of workflows)
// Do not preload - lazy load on demand
```

### 2. Cache Size Tuning

```typescript
// Default: 30 agents (~5MB memory)
// Large deployments: 50 agents (~8MB memory)
// Small deployments: 15 agents (~2.5MB memory)

const loader = new AgentLoader({
  maxCachedAgents: 30  // Adjust based on deployment size
});
```

### 3. Metrics Retention

```typescript
// Clean up old metrics weekly
setInterval(() => {
  const removed = metrics.cleanup(30);  // 30 days retention
  console.log(`Cleaned up ${removed} old execution records`);
}, 7 * 24 * 60 * 60 * 1000);  // 7 days
```

### 4. Error Handling

```typescript
// Always handle load failures gracefully
const agent = await loader.getAgent(agentName);
if (!agent) {
  console.warn(`Agent ${agentName} not found, falling back to default`);
  return await loader.getAgent('triage-agent');
}
```

## Testing

### Unit Tests

```bash
# Run agent performance tests
npm test -- agent-loader.test.ts
npm test -- agent-cache.test.ts
npm test -- agent-metrics.test.ts
```

### Performance Tests

```typescript
// Test load time for all agents
const loader = new AgentLoader();
await loader.initialize();

const agentNames = loader.listAgents().map(a => a.name);
const loadTimes: Record<string, number> = {};

for (const name of agentNames) {
  const start = Date.now();
  await loader.getAgent(name);
  loadTimes[name] = Date.now() - start;
}

// Verify all agents load within timeout
Object.entries(loadTimes).forEach(([name, time]) => {
  if (time > 500) {
    console.warn(`⚠️  ${name} exceeds load timeout: ${time}ms`);
  }
});
```

## Troubleshooting

### Agent Load Failures

**Issue**: `Agent not found in registry`
- **Cause**: Agent not registered in `agents.index.json`
- **Fix**: Add agent entry to registry

**Issue**: `Agent file not found`
- **Cause**: Missing `.md` file in `agents/` directory
- **Fix**: Create agent file or update registry `file` path

### Performance Issues

**Issue**: High cache eviction rate
- **Cause**: Too many agents, cache size too small
- **Fix**: Increase `maxCachedAgents` or reduce concurrent agent usage

**Issue**: Slow preload time (>2s)
- **Cause**: Too many preload agents or slow I/O
- **Fix**: Reduce `preloadAgents` list or optimize agent file sizes

## API Reference

See source files for detailed API documentation:

- **`agent-loader.ts`**: AgentLoader, LoaderStats
- **`agent-cache.ts`**: LRUCache, AgentCache, CacheStats
- **`agent-metrics.ts`**: AgentMetricsCollector, AgentExecution, AgentMetrics
- **`agent-performance-integration.ts`**: AgentPerformanceSystem

## Changelog

### v7.4.0 (2026-01-19)
- ✨ Added lazy agent loading with preload strategy
- ✨ Implemented LRU cache with 30-agent capacity
- ✨ Added per-agent execution metrics tracking
- ✨ Created unified performance system API
- 📝 Updated registry with load hints and priorities

## See Also

- **Workstream Documentation**: `.claude/workstreams/AI-1099.md`
- **Agent Registry**: `registry/agents.index.json`
- **Integration Examples**: `lib/agent-performance-integration.ts`
