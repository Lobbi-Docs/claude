# Context Window Optimization Engine - Integration Guide

This guide shows how to integrate the Context Window Optimization Engine with other Claude orchestration components.

---

## Quick Integration

### 1. Import the Optimizer

```typescript
import { createOptimizer } from './.claude/orchestration/context';

const optimizer = createOptimizer({
  db: { dbPath: './.claude/orchestration/db/orchestration.db' },
  defaultStrategy: 'balanced',
  autoCheckpoint: true,
  checkpointAtPhases: true,
});
```

### 2. Basic Usage Pattern

```typescript
// At the start of each orchestration phase
const context = getCurrentConversationContext();
const report = optimizer.analyzeUsage(context);

if (report.warningLevel === 'warning' || report.warningLevel === 'critical') {
  console.log(`Context usage: ${report.budgetUsedPercent}%`);

  // Create checkpoint before optimization
  await optimizer.checkpoint('pre-optimization', context);

  // Optimize
  const result = await optimizer.optimize(context, 'balanced');
  console.log(`Saved ${result.savings} tokens (${result.savingsPercent}%)`);

  // Update context
  context = result.optimizedContext;
}

// Create checkpoint at phase boundaries
await optimizer.checkpoint(`post-${currentPhase}`, context, {
  sessionId: orchestrationSession.id,
  phase: currentPhase,
  type: 'phase_boundary',
});
```

---

## Integration with Orchestration Protocol

### Phase-Based Checkpointing

```typescript
// orchestration-manager.ts

import { createOptimizer } from './.claude/orchestration/context';

class OrchestrationManager {
  private optimizer = createOptimizer({
    defaultStrategy: 'balanced',
    checkpointAtPhases: true,
  });

  async executePhase(phase: 'explore' | 'plan' | 'code' | 'test' | 'fix' | 'document') {
    // Get current context
    const context = this.getCurrentContext();

    // Check context budget before phase
    const preReport = this.optimizer.analyzeUsage(context);

    if (preReport.warningLevel === 'critical') {
      console.log('⚠️ Context budget critical, optimizing before phase...');
      const result = await this.optimizer.optimize(context, 'balanced');
      this.updateContext(result.optimizedContext);
    }

    // Create checkpoint before phase
    await this.optimizer.checkpoint(`pre-${phase}`, context, {
      sessionId: this.sessionId,
      phase,
      type: 'phase_boundary',
    });

    // Execute phase
    await this.runPhase(phase);

    // Create checkpoint after phase
    await this.optimizer.checkpoint(`post-${phase}`, this.getCurrentContext(), {
      sessionId: this.sessionId,
      phase,
      type: 'phase_boundary',
    });
  }
}
```

---

## Integration with Agent Memory System

### Offload to Long-Term Memory

```typescript
// agent-memory-integration.ts

import { createOptimizer } from './.claude/orchestration/context';
import { AgentMemory } from './.claude/orchestration/memory';

class ContextMemoryBridge {
  constructor(
    private optimizer: ReturnType<typeof createOptimizer>,
    private memory: AgentMemory
  ) {}

  async manageContextOverflow(context: ConversationContext) {
    const report = this.optimizer.analyzeUsage(context);

    if (report.warningLevel === 'critical') {
      // Identify old conversation turns to archive
      const oldTurns = context.turns.slice(0, -5); // Keep last 5 turns

      // Store in long-term memory
      for (const turn of oldTurns) {
        await this.memory.store({
          sessionId: context.sessionId,
          type: 'conversation_turn',
          content: turn.content,
          metadata: {
            role: turn.role,
            timestamp: turn.timestamp,
          },
        });
      }

      // Optimize context (will summarize old content)
      const result = await this.optimizer.optimize(context, 'balanced');

      return result.optimizedContext;
    }

    return context;
  }
}
```

---

## Integration with Telemetry System

### Track Context Metrics

```typescript
// telemetry-integration.ts

import { createOptimizer } from './.claude/orchestration/context';
import { TelemetryCollector } from './.claude/orchestration/telemetry';

class ContextTelemetry {
  constructor(
    private optimizer: ReturnType<typeof createOptimizer>,
    private telemetry: TelemetryCollector
  ) {}

  async trackContextMetrics(context: ConversationContext) {
    const report = this.optimizer.analyzeUsage(context);

    // Track usage metrics
    this.telemetry.trackMetric('context.total_tokens', report.totalTokens);
    this.telemetry.trackMetric('context.budget_used_percent', report.budgetUsedPercent);
    this.telemetry.trackMetric('context.warning_level', this.warningLevelToNumber(report.warningLevel));

    // Track section breakdown
    this.telemetry.trackMetric('context.system_tokens', report.breakdown.system.tokens);
    this.telemetry.trackMetric('context.conversation_tokens', report.breakdown.conversation.tokens);
    this.telemetry.trackMetric('context.tools_tokens', report.breakdown.tools.tokens);

    // Track information density
    this.telemetry.trackMetric('context.density_score', report.overallDensity.score);
    this.telemetry.trackMetric('context.redundancy', report.overallDensity.redundancy);
  }

  async trackOptimization(result: OptimizationResult) {
    this.telemetry.trackMetric('optimization.tokens_saved', result.savings);
    this.telemetry.trackMetric('optimization.savings_percent', result.savingsPercent);
    this.telemetry.trackMetric('optimization.quality_score', result.quality);
    this.telemetry.trackMetric('optimization.execution_time_ms', result.executionTimeMs);

    // Track strategies used
    this.telemetry.trackEvent('optimization.complete', {
      strategies: result.strategies,
      warnings: result.warnings.length,
      errors: result.errors.length,
    });
  }

  private warningLevelToNumber(level: BudgetWarningLevel): number {
    const mapping = { safe: 0, warning: 1, critical: 2, exceeded: 3 };
    return mapping[level];
  }
}
```

---

## Integration with Health Checks

### Monitor Context Health

```typescript
// health-check-integration.ts

import { createOptimizer } from './.claude/orchestration/context';
import { HealthChecker } from './.claude/core/health';

class ContextHealthCheck {
  constructor(private optimizer: ReturnType<typeof createOptimizer>) {}

  async checkHealth(context: ConversationContext): Promise<HealthCheckResult> {
    const report = this.optimizer.analyzeUsage(context);

    const issues = [];

    // Check budget usage
    if (report.warningLevel === 'critical') {
      issues.push({
        severity: 'critical',
        message: `Context budget at ${report.budgetUsedPercent}%`,
        recommendation: 'Run optimization immediately',
      });
    } else if (report.warningLevel === 'warning') {
      issues.push({
        severity: 'warning',
        message: `Context budget at ${report.budgetUsedPercent}%`,
        recommendation: 'Consider optimization before next phase',
      });
    }

    // Check for high-cost patterns
    if (report.highCostPatterns.length > 0) {
      const topPattern = report.highCostPatterns[0];
      issues.push({
        severity: 'warning',
        message: `Detected ${topPattern.type}: ${topPattern.occurrences} occurrences`,
        recommendation: `Apply ${topPattern.recommendedOptimization} to save ~${topPattern.potentialSavings} tokens`,
      });
    }

    // Check information density
    if (report.overallDensity.score < 0.5) {
      issues.push({
        severity: 'info',
        message: `Low information density: ${report.overallDensity.score.toFixed(2)}`,
        recommendation: 'Consider compression or summarization',
      });
    }

    return {
      healthy: report.warningLevel === 'safe',
      issues,
      metrics: {
        budgetUsedPercent: report.budgetUsedPercent,
        warningLevel: report.warningLevel,
        densityScore: report.overallDensity.score,
      },
    };
  }
}
```

---

## CLI Integration

### Slash Command Handler

```typescript
// commands/context-handler.ts

import { createOptimizer } from './.claude/orchestration/context';
import { parseArgs } from 'node:util';

export async function handleContextCommand(args: string[]) {
  const optimizer = createOptimizer({ defaultStrategy: 'balanced' });

  const { values, positionals } = parseArgs({
    args,
    options: {
      strategy: { type: 'string', default: 'balanced' },
      name: { type: 'string' },
      verbose: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const action = positionals[0];

  switch (action) {
    case 'status':
      await showStatus(optimizer, values.verbose);
      break;

    case 'optimize':
      await runOptimization(optimizer, values.strategy, values['dry-run']);
      break;

    case 'checkpoint':
      await createCheckpoint(optimizer, values.name);
      break;

    case 'restore':
      await restoreCheckpoint(optimizer, values.name);
      break;

    case 'budget':
      await configureBudget(optimizer, values);
      break;

    default:
      console.log('Unknown action. Use: status, optimize, checkpoint, restore, budget');
  }
}

async function showStatus(optimizer: any, verbose: boolean) {
  const context = getCurrentContext();
  const report = optimizer.analyzeUsage(context);

  console.log('Context Window Status');
  console.log('='.repeat(70));
  console.log(`Total Budget:     ${report.budgetLimit.toLocaleString()} tokens`);
  console.log(`Current Usage:    ${report.totalTokens.toLocaleString()} tokens (${report.budgetUsedPercent.toFixed(1)}%)`);
  console.log(`Available:        ${(report.budgetLimit - report.totalTokens).toLocaleString()} tokens`);

  if (verbose) {
    console.log('\nBreakdown by Section:');
    for (const [section, data] of Object.entries(report.breakdown)) {
      console.log(`  ${section.padEnd(15)} ${data.tokens.toString().padStart(6)} tokens (${data.percentage.toFixed(1)}%)`);
    }

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const rec of report.recommendations.slice(0, 3)) {
        console.log(`  • ${rec.title}`);
        console.log(`    Estimated savings: ${rec.estimatedSavings} tokens`);
      }
    }
  }

  console.log('='.repeat(70));
}

// ... other command handlers
```

---

## Database Integration

### Initialize Database

```bash
# Create database with context schema
sqlite3 ./.claude/orchestration/db/orchestration.db < ./.claude/orchestration/db/context.sql
```

### Query Context History

```typescript
import Database from 'better-sqlite3';

const db = new Database('./.claude/orchestration/db/orchestration.db');

// Get recent context usage
const usage = db.prepare(`
  SELECT * FROM v_context_budget_summary
  WHERE session_id = ?
  ORDER BY timestamp DESC
  LIMIT 10
`).all(sessionId);

// Get optimization effectiveness
const effectiveness = db.prepare(`
  SELECT * FROM v_optimization_effectiveness
`).all();

// Get checkpoint timeline
const timeline = db.prepare(`
  SELECT * FROM v_checkpoint_timeline
  WHERE session_id = ?
  ORDER BY created_at DESC
`).all(sessionId);
```

---

## Event-Driven Integration

### Listen for Context Events

```typescript
import { createOptimizer } from './.claude/orchestration/context';

const optimizer = createOptimizer({ defaultStrategy: 'balanced' });

// Optimize with progress tracking
const result = await optimizer.optimize(context, 'balanced', (event) => {
  switch (event.type) {
    case 'start':
      console.log('🚀 Optimization started');
      break;

    case 'progress':
      console.log(`⏳ Progress: ${event.progress}% - ${event.message}`);
      break;

    case 'complete':
      console.log('✅ Optimization complete');
      break;

    case 'error':
      console.error('❌ Error:', event.message);
      break;

    case 'warning':
      console.warn('⚠️ Warning:', event.message);
      break;
  }
});
```

---

## Testing Integration

### Mock Context for Tests

```typescript
import { createOptimizer } from './.claude/orchestration/context';
import type { ConversationContext } from './.claude/orchestration/context/types';

describe('Context Optimization', () => {
  it('should optimize context when budget exceeded', async () => {
    const optimizer = createOptimizer({ defaultStrategy: 'balanced' });

    const mockContext: ConversationContext = {
      sessionId: 'test-session',
      sections: [/* ... */],
      totalTokens: 85000, // 85% of 100K budget
      turns: [/* ... */],
      files: [],
      toolResults: [],
      timestamp: new Date().toISOString(),
    };

    const report = optimizer.analyzeUsage(mockContext);
    expect(report.warningLevel).toBe('warning');

    const result = await optimizer.optimize(mockContext, 'balanced');
    expect(result.savings).toBeGreaterThan(0);
    expect(result.optimizedTokens).toBeLessThan(mockContext.totalTokens);
  });
});
```

---

## Environment Variables

Set these in your `.env` or environment:

```bash
# Context optimization settings
CONTEXT_BUDGET_TOTAL=100000
CONTEXT_WARNING_THRESHOLD=75
CONTEXT_CRITICAL_THRESHOLD=90
CONTEXT_DEFAULT_STRATEGY=balanced
CONTEXT_AUTO_CHECKPOINT=true
CONTEXT_DB_PATH=./.claude/orchestration/db/orchestration.db
```

---

## Best Practices

### 1. Checkpoint Before Major Operations
```typescript
await optimizer.checkpoint('pre-refactor', context);
// ... perform refactoring
await optimizer.checkpoint('post-refactor', context);
```

### 2. Monitor During Long Sessions
```typescript
setInterval(async () => {
  const report = optimizer.analyzeUsage(getCurrentContext());
  if (report.warningLevel !== 'safe') {
    console.log(`⚠️ Context at ${report.budgetUsedPercent}%`);
  }
}, 60000); // Check every minute
```

### 3. Use Progressive Disclosure
```typescript
// Instead of loading entire file
const fileRef = await compressor.compress(fileContent, 'reference');
// Load on demand when needed
const original = compressor.resolveReference(fileRef.compressed);
```

### 4. Clean Up Old Checkpoints
```typescript
// Delete checkpoints older than 7 days
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const deleted = checkpointManager.deleteOlderThan(sevenDaysAgo);
console.log(`Cleaned up ${deleted} old checkpoints`);
```

---

## Troubleshooting

### Issue: Token counts seem inaccurate
**Solution:** The default implementation uses approximation. For exact counts, integrate tiktoken:
```bash
npm install tiktoken
```
Then update `token-counter.ts` to use real tiktoken encoding.

### Issue: Optimization is slow
**Solution:** Check compression cache:
```typescript
const stats = compressor.getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
```

### Issue: Database errors
**Solution:** Verify database exists and schema is applied:
```bash
sqlite3 ./.claude/orchestration/db/orchestration.db ".schema context_checkpoints"
```

---

## See Also

- [README.md](./README.md) - Complete documentation
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation details
- [types.ts](./types.ts) - TypeScript type definitions
- [Orchestration Protocol](../PROTOCOL.md) - Overall orchestration system
