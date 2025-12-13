# Evolve Agents - Agent Self-Improvement Analysis

Analyze agent performance, identify capability gaps, and propose improvements using the Evolution System.

## Usage

```bash
# Analyze all agents
.claude/commands/evolve-agents.md analyze

# Analyze specific agent
.claude/commands/evolve-agents.md analyze --agent-id=coder-agent

# Generate weekly evolution report
.claude/commands/evolve-agents.md report --period=weekly

# Check thresholds and recommend updates
.claude/commands/evolve-agents.md check-thresholds

# View capability gaps
.claude/commands/evolve-agents.md gaps

# View skill suggestions
.claude/commands/evolve-agents.md suggestions

# View prompt history
.claude/commands/evolve-agents.md prompt-history --agent-id=coder-agent

# Evolve agent prompts
.claude/commands/evolve-agents.md evolve --agent-id=coder-agent

# Run A/B test on prompts
.claude/commands/evolve-agents.md ab-test --agent-id=coder-agent
```

## Command Actions

### 1. **analyze** - Comprehensive Agent Analysis

Analyze agent performance metrics including:
- Success rate over time
- Average task duration
- Token efficiency (success per 1000 tokens)
- User feedback ratings
- Performance trends (improving, stable, declining)

**Output:**
- Performance summary table
- Trend analysis
- Comparison with previous periods
- Recommendations for improvement

**Example Output:**
```
Agent Performance Analysis
========================

Agent: coder-agent
------------------
Success Rate:        87.5% (↑ 5.2% vs last week)
Avg Duration:        45.3s (↓ 8.1s vs last week)
Token Efficiency:    0.72 (↑ 0.08 vs last week)
User Rating:         4.2/5.0
Performance Trend:   IMPROVING

Tasks Completed:     120
Failures:           15
Retries:            8

Top Error Types:
1. timeout (5 occurrences)
2. validation_error (4 occurrences)
3. tool_limitation (3 occurrences)
```

### 2. **report** - Generate Evolution Report

Generate a comprehensive evolution report for the specified period:
- Overall system performance
- Per-agent performance summaries
- Identified capability gaps
- Skill suggestions
- Prompt updates
- Improvements deployed

**Periods:**
- `daily` - Last 24 hours
- `weekly` - Last 7 days (default)
- `monthly` - Last 30 days
- `custom` - Specify start/end dates

**Output:**
- Executive summary
- Detailed metrics
- Visual trends
- Actionable recommendations

### 3. **check-thresholds** - Auto-Evolution Checks

Check if any agents meet criteria for automatic evolution:
- Success rate drops below threshold
- Performance declining trend
- High failure rate in specific task types

**Thresholds:**
- Success rate drop: 10%
- Minimum task count: 10 tasks
- Declining trend: 2+ consecutive periods

**Output:**
```
Evolution Threshold Analysis
===========================

Agents Requiring Attention:
---------------------------

1. coder-agent
   Current Version:    v3
   Success Rate:       72.5% (↓ 15.2% vs previous period)
   Threshold:          success_rate_drop
   Recommended Action: EVOLVE
   Reason:            Success rate dropped by 15.2%

2. tester-agent
   Current Version:    v2
   Success Rate:       stable
   Performance:        DECLINING trend for 14 days
   Recommended Action: AB_TEST
   Reason:            Consistent performance decline
```

### 4. **gaps** - View Capability Gaps

Display identified capability gaps from task failures:
- Gap category (missing_skill, tool_limitation, knowledge_gap, pattern_failure)
- Severity (low, medium, high, critical)
- Affected tasks
- Frequency
- Error patterns

**Output:**
```
Capability Gaps
==============

CRITICAL Gaps (2):
------------------

1. Gap ID: gap-1234567890
   Category:        tool_limitation
   Description:     Agent struggles with database query tasks requiring SQL execution
   Failure Count:   12
   Frequency:       3.4 failures/week
   Severity:        CRITICAL
   Affected Tasks:  12 tasks
   Error Pattern:   "No database client available"

2. Gap ID: gap-0987654321
   Category:        missing_skill
   Description:     Agent lacks capability for async/parallel task handling
   Failure Count:   8
   Frequency:       2.3 failures/week
   Severity:        CRITICAL
```

### 5. **suggestions** - View Skill Suggestions

Display proposed skills to address capability gaps:
- Skill name and description
- Addressed gaps
- Estimated impact
- Implementation complexity
- Required tools/training

**Output:**
```
Skill Suggestions
================

HIGH PRIORITY (3):
------------------

1. Enhanced Database Integration
   Category:            tool_usage
   Addresses Gaps:      gap-1234567890
   Estimated Impact:
     - Gaps Closed:              1
     - Tasks Unblocked:          12
     - Success Rate Improvement: +15%
   Implementation:      MEDIUM complexity
   Required Tools:      database-client, sql-executor

2. Async Task Manager
   Category:            specialized_skill
   Addresses Gaps:      gap-0987654321
   Estimated Impact:
     - Gaps Closed:              1
     - Tasks Unblocked:          8
     - Success Rate Improvement: +20%
   Implementation:      HIGH complexity
   Required Training:   async_patterns, concurrency_control
```

### 6. **prompt-history** - View Prompt Evolution

Display prompt version history for an agent:
- Version number
- Activation/deactivation dates
- Performance summary
- Improvement over previous version

**Output:**
```
Prompt History: coder-agent
===========================

v4 (ACTIVE)
-----------
Activated:      2024-01-15 14:30:00
Tasks:          45
Success Rate:   87.5%
Avg Duration:   45.3s
Token Efficiency: 0.72
Improvement:    +12.5% vs v3

v3 (ARCHIVED)
-----------
Activated:      2024-01-08 09:00:00
Deactivated:    2024-01-15 14:30:00
Tasks:          120
Success Rate:   75.0%
Avg Duration:   53.4s
Token Efficiency: 0.64
Improvement:    +5.0% vs v2
```

### 7. **evolve** - Trigger Agent Evolution

Manually trigger prompt evolution for an agent:
- Analyze recent failures
- Suggest prompt mutations
- Generate new variant
- Register for A/B testing

**Process:**
1. Analyze failure patterns
2. Identify mutation opportunities
3. Generate new prompt variant
4. Add to A/B testing pool
5. Report expected improvements

**Output:**
```
Agent Evolution: coder-agent
===========================

Current Version: v3

Failure Analysis:
-----------------
- timeout errors (5x) → Add time management constraints
- validation errors (4x) → Clarify output format requirements

Suggested Mutations:
-------------------
1. ADD_CONSTRAINT (system prompt)
   Confidence: 70%
   Description: Add time management and efficiency constraints

2. CLARIFY (user prompt)
   Confidence: 80%
   Description: Clarify output format requirements

New Variant Created: v4
-----------------------
Status:     TESTING
Trial Count: 0
UCB1 Score: 0.0

The new variant will be tested using UCB1 multi-armed bandit selection.
Expected to reach promotion threshold after 20 trials.
```

### 8. **ab-test** - A/B Test Management

View and manage A/B testing of prompt variants:
- Active variants
- Trial counts
- Success rates
- UCB1 scores
- Selection probability

**Output:**
```
A/B Testing Status: coder-agent
===============================

Active Variants:
---------------

v4 (TESTING)
  Trials:         15
  Success Rate:   85.0%
  Avg Duration:   42.1s
  UCB1 Score:     0.92
  Selection Prob: 65%

v3 (ACTIVE)
  Trials:         120
  Success Rate:   75.0%
  Avg Duration:   53.4s
  UCB1 Score:     0.78
  Selection Prob: 35%

Next Selection: v4 (UCB1 algorithm)

Promotion Status:
----------------
v4 needs 5 more trials before promotion consideration
Current improvement: +10.0% success rate vs v3
Threshold for promotion: +5.0% improvement
```

## Implementation Guide

### 1. Initialize Evolution System

```typescript
import Database from 'better-sqlite3';
import { EvolutionSystem } from '.claude/orchestration/evolution';

// Initialize database
const db = new Database('.claude/orchestration/db/agents.db');

// Create evolution system
const evolution = new EvolutionSystem(db, {
  autoEvolutionEnabled: true,
  explorationParameter: 2.0,
  minTrialsBeforePromotion: 20,
});
```

### 2. Track Task Completion

```typescript
// After task completes
await evolution.trackTaskCompletion({
  agentId: 'coder-agent',
  taskId: 'task-123',
  variantId: 'coder-agent-v4',
  success: true,
  duration: 45300, // ms
  tokens: 1250,
  userRating: 4.5,
});
```

### 3. Collect Implicit Feedback

```typescript
// User retries task
evolution.feedbackLoop.trackRetry('task-123', 'coder-agent');

// User edits output
evolution.feedbackLoop.trackEdit('task-123', 'coder-agent', 'minor');

// User abandons task
evolution.feedbackLoop.trackAbandon('task-123', 'coder-agent');
```

### 4. Generate Reports

```typescript
// Weekly report
const report = evolution.generateWeeklyReport();

console.log('Overall Success Rate:', report.summary.overallSuccessRate);
console.log('Total Tasks:', report.summary.totalTasks);

// Per-agent performance
for (const perf of report.agentPerformance) {
  console.log(`${perf.agentId}: ${perf.successRate}% (${perf.successRateChange > 0 ? '↑' : '↓'} ${Math.abs(perf.successRateChange)}%)`);
}
```

### 5. Check and Apply Evolution

```typescript
// Check thresholds
const updates = evolution.feedbackLoop.checkThresholds();

// Apply recommended updates
for (const update of updates) {
  if (update.recommendedAction === 'evolve') {
    await evolution.evolveAgent(update.agentId);
  }
}
```

## UCB1 Algorithm Explanation

The system uses the **UCB1 (Upper Confidence Bound)** algorithm for prompt variant selection, which balances:

**Exploitation:** Selecting variants with proven high success rates
**Exploration:** Testing new or under-tested variants

**Formula:**
```
UCB1 = avg_success_rate + c * sqrt(ln(total_trials) / variant_trials)
```

Where:
- `avg_success_rate`: Historical success rate of variant
- `c`: Exploration parameter (default: 2.0)
- `total_trials`: Total trials across all variants
- `variant_trials`: Trials for this specific variant

**Selection Strategy:**
1. Always select untried variants first (forced exploration)
2. Calculate UCB1 score for each variant
3. Select variant with highest UCB1 score
4. Update statistics after task completion
5. Promote variant to "active" after sufficient trials and proven improvement

## Configuration

Default configuration can be customized:

```typescript
const evolution = new EvolutionSystem(db, {
  // Tracking
  trackingEnabled: true,
  metricsRetentionDays: 90,

  // A/B Testing
  abTestingEnabled: true,
  minTrialsBeforePromotion: 20,
  confidenceLevel: 0.95,
  explorationParameter: 2.0,

  // Auto-Evolution
  autoEvolutionEnabled: true,
  evolutionThreshold: {
    minSuccessRateDrop: 10, // 10% drop triggers evolution
    minTaskCount: 10,
  },

  // Feedback
  implicitFeedbackWeight: 0.3,
  feedbackDecayHalfLife: 7, // days

  // Reporting
  reportFrequency: 'weekly',
  reportRetentionCount: 12,
});
```

## Database Schema

All evolution data is stored in SQLite:
- `evolution_performance_metrics` - Task completion metrics
- `evolution_user_feedback` - Explicit and implicit feedback
- `evolution_task_failures` - Detailed failure tracking
- `evolution_prompt_variants` - Prompt versions and A/B testing
- `evolution_capability_gaps` - Identified capability gaps
- `evolution_skill_suggestions` - Proposed improvements
- `evolution_reports` - Generated reports

See `.claude/orchestration/db/evolution.sql` for complete schema.

## Integration with Orchestration System

The evolution system integrates seamlessly with the existing orchestration system:

1. **Automatic Tracking**: All task completions are automatically tracked
2. **Checkpoint Integration**: Evolution state saved in checkpoints
3. **Activity Logging**: Evolution events logged to activity log
4. **Obsidian Sync**: Reports synced to Obsidian vault for review

## Best Practices

1. **Regular Reporting**: Generate weekly reports to track trends
2. **Review Gaps**: Address critical capability gaps promptly
3. **Monitor A/B Tests**: Track variant performance during testing phase
4. **Feedback Collection**: Actively collect user feedback for better evolution
5. **Gradual Evolution**: Don't change too many agents at once
6. **Version Control**: Keep prompt history for rollback capability

## See Also

- `.claude/orchestration/evolution/README.md` - Detailed system documentation
- `.claude/orchestration/PROTOCOL.md` - Orchestration protocol
- Obsidian vault: `System/Agents/Evolution/` - Evolution reports and analysis
