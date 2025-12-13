# Agent Self-Improvement System

A comprehensive system for tracking, analyzing, and evolving agent performance through data-driven insights and automated optimization.

## Overview

The Evolution System enables agents to continuously improve through:

- **Performance Tracking**: Detailed metrics collection for every task
- **A/B Testing**: Multi-armed bandit algorithm (UCB1) for prompt optimization
- **Capability Analysis**: Automatic identification of skill gaps
- **Feedback Collection**: Both explicit (user ratings) and implicit (retries, edits) signals
- **Automated Evolution**: Prompt optimization triggered by performance thresholds
- **Comprehensive Reporting**: Weekly evolution reports with actionable insights

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Evolution System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ Performance       │  │ Prompt            │                   │
│  │ Tracker           │  │ Optimizer         │                   │
│  │                   │  │                   │                   │
│  │ • Metrics         │  │ • A/B Testing     │                   │
│  │ • Success Rates   │  │ • UCB1 Selection  │                   │
│  │ • Token Usage     │  │ • Auto-Evolution  │                   │
│  │ • Trends          │  │ • Version History │                   │
│  └─────────┬─────────┘  └─────────┬─────────┘                   │
│            │                       │                             │
│            └───────────┬───────────┘                             │
│                        │                                         │
│            ┌───────────▼─────────────┐                           │
│            │   Feedback Loop         │                           │
│            │                         │                           │
│            │ • Implicit Signals      │                           │
│            │ • Exponential Decay     │                           │
│            │ • Threshold Checks      │                           │
│            │ • Report Generation     │                           │
│            └───────────┬─────────────┘                           │
│                        │                                         │
│            ┌───────────▼─────────────┐                           │
│            │ Capability Expander     │                           │
│            │                         │                           │
│            │ • Gap Identification    │                           │
│            │ • Skill Suggestions     │                           │
│            │ • Agent Variants        │                           │
│            │ • Compositions          │                           │
│            └─────────────────────────┘                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  SQLite DB     │
                   │  • Metrics     │
                   │  • Variants    │
                   │  • Gaps        │
                   │  • Reports     │
                   └────────────────┘
```

## Components

### 1. Performance Tracker

Tracks and analyzes agent task completion metrics.

**Key Features:**
- Success rate calculation with time windows
- Average task duration tracking
- Token efficiency metrics (success per 1000 tokens)
- User feedback with exponential decay weighting
- Performance trend analysis (improving, stable, declining)
- Task failure recording for gap analysis

**Usage:**
```typescript
import { PerformanceTracker } from './evolution';

const tracker = new PerformanceTracker(db);

// Track task completion
tracker.trackTask({
  agentId: 'coder-agent',
  taskId: 'task-123',
  success: true,
  duration: 45000,
  tokenCount: 1250,
  userRating: 4.5,
  timestamp: new Date(),
});

// Get metrics
const successRate = tracker.getSuccessRate('coder-agent');
const avgTime = tracker.getAverageTime('coder-agent');
const efficiency = tracker.getTokenEfficiency('coder-agent');
const trend = tracker.getPerformanceTrend('coder-agent');
```

### 2. Prompt Optimizer

Implements A/B testing and evolution of agent prompts using the UCB1 algorithm.

**Key Features:**
- Multi-variant prompt testing
- UCB1 (Upper Confidence Bound) selection algorithm
- Automatic variant promotion based on performance
- Prompt mutation generation
- Complete version history tracking

**UCB1 Algorithm:**
The UCB1 algorithm balances exploitation (using best-known variant) with exploration (trying new variants):

```
UCB1 = avg_success_rate + c * sqrt(ln(total_trials) / variant_trials)
```

**Usage:**
```typescript
import { PromptOptimizer } from './evolution';

const optimizer = new PromptOptimizer(db);

// Register new variant
optimizer.registerVariant({
  id: 'coder-agent-v4',
  agentId: 'coder-agent',
  version: 4,
  prompt: 'Enhanced prompt with better constraints...',
  systemPrompt: 'System prompt...',
  createdAt: new Date(),
  trialCount: 0,
  successCount: 0,
  successRate: 0,
  avgDuration: 0,
  avgTokens: 0,
  mutationType: 'automated',
  mutationReason: 'Add time management constraints',
});

// Select variant using UCB1
const variant = optimizer.selectVariant('coder-agent');

// Update performance after task
optimizer.updatePerformance(variant.id, true, 45000, 1250);

// Auto-evolve based on failures
const newVariant = optimizer.evolvePrompt('coder-agent');
```

### 3. Capability Expander

Identifies capability gaps and suggests improvements.

**Key Features:**
- Automatic gap identification from failure patterns
- Severity and frequency analysis
- Skill suggestion generation
- Agent variant creation for specializations
- Agent composition recommendations for complex tasks

**Gap Categories:**
- `missing_skill`: Agent lacks required skill
- `tool_limitation`: Missing or inadequate tools
- `knowledge_gap`: Missing domain knowledge
- `pattern_failure`: Recurring pattern failures

**Usage:**
```typescript
import { CapabilityExpander } from './evolution';

const expander = new CapabilityExpander(db);

// Identify gaps from failures
const failures = tracker.getFailures('coder-agent');
const gaps = expander.identifyGaps(failures);

// Get skill suggestions
const suggestions = expander.suggestSkills(gaps);

// Create specialized variant
const variant = expander.generateVariant('coder-agent', 'React Development');

// Propose composition for complex task
const composition = expander.proposeComposition({
  description: 'Build full-stack app',
  complexity: 8,
  requiredCapabilities: ['frontend', 'backend', 'database'],
});
```

### 4. Feedback Loop

Collects feedback signals and orchestrates the evolution cycle.

**Key Features:**
- Implicit feedback tracking (retries, edits, abandons)
- Exponential decay weighting for time-sensitivity
- Weighted score combining explicit and implicit feedback
- Automated threshold monitoring
- Evolution report generation

**Implicit Feedback Signals:**
- **Retry**: User retries task → Rating: 2/5
- **Minor Edit**: Small corrections → Rating: 3/5
- **Major Edit**: Significant changes → Rating: 2/5
- **Complete Rewrite**: Total redo → Rating: 1/5
- **Abandon**: User gives up → Rating: 1/5

**Usage:**
```typescript
import { FeedbackLoop } from './evolution';

const feedback = new FeedbackLoop(db);

// Track implicit feedback
feedback.trackRetry('task-123', 'coder-agent');
feedback.trackEdit('task-124', 'coder-agent', 'minor');
feedback.trackAbandon('task-125', 'coder-agent');

// Get weighted score
const score = feedback.getWeightedScore('coder-agent');

// Generate evolution report
const report = feedback.generateReport();

// Check if evolution needed
const updates = feedback.checkThresholds();
for (const update of updates) {
  console.log(`${update.agentId} needs ${update.recommendedAction}`);
}
```

## Complete Example

```typescript
import Database from 'better-sqlite3';
import { EvolutionSystem } from './evolution';

// Initialize
const db = new Database('.claude/orchestration/db/agents.db');
const evolution = new EvolutionSystem(db, {
  autoEvolutionEnabled: true,
  explorationParameter: 2.0,
  minTrialsBeforePromotion: 20,
  evolutionThreshold: {
    minSuccessRateDrop: 10,
    minTaskCount: 10,
  },
});

// Track task completion
await evolution.trackTaskCompletion({
  agentId: 'coder-agent',
  taskId: 'task-123',
  variantId: 'coder-agent-v4',
  success: true,
  duration: 45000,
  tokens: 1250,
  userRating: 4.5,
});

// Collect implicit feedback
evolution.feedbackLoop.trackEdit('task-124', 'coder-agent', 'minor');

// Generate weekly report
const report = evolution.generateWeeklyReport();
console.log('Success Rate:', report.summary.overallSuccessRate);
console.log('Capability Gaps:', report.gaps.length);
console.log('Suggestions:', report.suggestions.length);

// Check and apply evolution
const updates = evolution.feedbackLoop.checkThresholds();
for (const update of updates) {
  if (update.recommendedAction === 'evolve') {
    await evolution.evolveAgent(update.agentId);
  }
}
```

## Database Schema

### Core Tables

1. **evolution_performance_metrics**
   - Task completion tracking
   - Success/failure, duration, tokens
   - User ratings

2. **evolution_prompt_variants**
   - Prompt versions
   - A/B testing statistics
   - UCB1 scores

3. **evolution_capability_gaps**
   - Identified gaps
   - Severity, frequency
   - Affected tasks

4. **evolution_skill_suggestions**
   - Proposed improvements
   - Estimated impact
   - Implementation complexity

5. **evolution_reports**
   - Generated reports
   - Historical tracking

### Views

- `v_evolution_agent_performance`: Performance summary per agent
- `v_evolution_recent_failures`: Recent failure analysis
- `v_evolution_active_gaps`: Open capability gaps
- `v_evolution_prompt_comparison`: Prompt variant comparison
- `v_evolution_weekly_trend`: Weekly performance trends

### Triggers

- `trg_update_variant_stats`: Auto-update variant statistics
- `trg_update_evolution_trend`: Auto-update performance trends

## Configuration

```typescript
interface EvolutionConfig {
  // Performance tracking
  trackingEnabled: boolean;
  metricsRetentionDays: number;

  // A/B testing
  abTestingEnabled: boolean;
  minTrialsBeforePromotion: number;
  confidenceLevel: number;

  // UCB1 parameters
  explorationParameter: number; // c in UCB1 formula

  // Auto-evolution
  autoEvolutionEnabled: boolean;
  evolutionThreshold: {
    minSuccessRateDrop: number;
    minTaskCount: number;
  };

  // Feedback collection
  implicitFeedbackWeight: number;
  feedbackDecayHalfLife: number; // days

  // Report generation
  reportFrequency: 'daily' | 'weekly' | 'monthly';
  reportRetentionCount: number;
}
```

**Defaults:**
```typescript
{
  trackingEnabled: true,
  metricsRetentionDays: 90,
  abTestingEnabled: true,
  minTrialsBeforePromotion: 20,
  confidenceLevel: 0.95,
  explorationParameter: 2.0,
  autoEvolutionEnabled: true,
  evolutionThreshold: {
    minSuccessRateDrop: 10,
    minTaskCount: 10,
  },
  implicitFeedbackWeight: 0.3,
  feedbackDecayHalfLife: 7,
  reportFrequency: 'weekly',
  reportRetentionCount: 12,
}
```

## Evolution Workflow

```
1. Task Execution
   │
   ├─> Track Performance
   │   └─> Record metrics
   │
   ├─> Collect Feedback
   │   ├─> Explicit (ratings)
   │   └─> Implicit (retries, edits)
   │
   ├─> Update Variant Stats
   │   └─> UCB1 scores
   │
   └─> Check Thresholds
       │
       ├─> Performance Declining?
       │   └─> Trigger Evolution
       │       ├─> Analyze Failures
       │       ├─> Suggest Mutations
       │       ├─> Generate Variant
       │       └─> Start A/B Testing
       │
       └─> Variant Ready for Promotion?
           └─> Promote to Active
               └─> Archive Old Variant

2. Weekly Report Generation
   │
   ├─> Aggregate Metrics
   ├─> Identify Gaps
   ├─> Generate Suggestions
   ├─> Document Improvements
   └─> Store Report
```

## Best Practices

### 1. **Gradual Evolution**
- Don't evolve multiple agents simultaneously
- Allow sufficient trial period (20+ tasks) before promotion
- Monitor A/B tests actively

### 2. **Feedback Collection**
- Actively solicit user ratings
- Track implicit signals automatically
- Weight recent feedback more heavily

### 3. **Gap Analysis**
- Review capability gaps weekly
- Prioritize by severity and frequency
- Address critical gaps promptly

### 4. **Prompt Management**
- Keep version history
- Document mutation reasons
- Enable rollback capability

### 5. **Reporting**
- Generate weekly evolution reports
- Track trends over time
- Share insights with team

## Integration

### With Orchestration System

```typescript
// In orchestrator.py or orchestrator.ts
import { EvolutionSystem } from './.claude/orchestration/evolution';

class Orchestrator {
  private evolution: EvolutionSystem;

  constructor() {
    this.evolution = new EvolutionSystem(this.db);
  }

  async executeTask(task) {
    const variant = this.evolution.promptOptimizer.selectVariant(task.agentId);

    // Execute with selected variant
    const result = await this.runTask(task, variant);

    // Track completion
    await this.evolution.trackTaskCompletion({
      agentId: task.agentId,
      taskId: task.id,
      variantId: variant.id,
      success: result.success,
      duration: result.duration,
      tokens: result.tokens,
    });
  }
}
```

### With Activity Logging

```typescript
// Log evolution events
activityLogger.log({
  action: 'prompt_evolved',
  agentId: 'coder-agent',
  details: {
    oldVersion: 3,
    newVersion: 4,
    reason: 'Success rate dropped by 12%',
  },
});
```

### With Obsidian Vault

Evolution reports are automatically synced to:
```
${OBSIDIAN_VAULT}/System/Agents/Evolution/
├── Reports/
│   ├── 2024-W03.md
│   ├── 2024-W04.md
│   └── ...
├── Gaps/
│   ├── active-gaps.md
│   └── resolved-gaps.md
└── Variants/
    ├── coder-agent-history.md
    └── ...
```

## CLI Commands

See `.claude/commands/evolve-agents.md` for complete CLI documentation.

Quick commands:
```bash
# Analyze agent performance
.claude/commands/evolve-agents.md analyze --agent-id=coder-agent

# Generate weekly report
.claude/commands/evolve-agents.md report --period=weekly

# Check evolution thresholds
.claude/commands/evolve-agents.md check-thresholds

# View capability gaps
.claude/commands/evolve-agents.md gaps

# View skill suggestions
.claude/commands/evolve-agents.md suggestions

# Evolve agent prompts
.claude/commands/evolve-agents.md evolve --agent-id=coder-agent
```

## Metrics and KPIs

### System-Level
- Overall success rate
- Total tasks completed
- Average task duration
- Token efficiency

### Agent-Level
- Per-agent success rate
- Success rate trend
- Token efficiency
- User satisfaction rating

### Evolution-Level
- Variants in testing
- Successful promotions
- Gaps identified
- Suggestions implemented

## Troubleshooting

### Low Success Rates
1. Check capability gaps
2. Review recent failures
3. Analyze error patterns
4. Consider skill additions

### Slow Evolution
1. Verify auto-evolution enabled
2. Check threshold configuration
3. Ensure sufficient task volume
4. Review UCB1 exploration parameter

### Poor A/B Test Results
1. Increase trial count before promotion
2. Adjust confidence level
3. Review mutation quality
4. Consider manual intervention

## Future Enhancements

- [ ] LLM-based prompt generation
- [ ] Multi-objective optimization (speed + quality + cost)
- [ ] Reinforcement learning integration
- [ ] Cross-agent knowledge transfer
- [ ] Automated skill implementation
- [ ] Real-time dashboard
- [ ] Slack/Discord notifications
- [ ] Advanced statistical testing

## See Also

- `.claude/commands/evolve-agents.md` - CLI commands
- `.claude/orchestration/db/evolution.sql` - Database schema
- `.claude/orchestration/PROTOCOL.md` - Orchestration protocol
- Obsidian vault: `System/Agents/Evolution/` - Evolution documentation

## License

Part of the Claude Orchestration System.
