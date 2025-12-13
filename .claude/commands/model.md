---
name: model
description: Intelligent model routing and cost optimization
category: orchestration
priority: high
version: 1.0.0
---

# Model Routing Commands

Intelligent AI model selection, cost tracking, and optimization.

## Available Commands

### `/model route [task]`

Get recommended model for a task.

**Usage:**
```bash
/model route "Implement user authentication system"
/model route "Write a quick documentation comment"
/model route "Design microservices architecture"
```

**Output:**
- Selected model with confidence score
- Reasoning for selection
- Cost and latency estimates
- Alternative models
- Fallback chain

**Example:**
```
Task: "Implement user authentication system"

Selected Model: sonnet
Confidence: 87.5%

Reasoning:
- Strong capability match for code-generation tasks
- Cost-efficient option
- Strong historical performance on similar tasks

Estimated Cost: $0.0234
Estimated Latency: 2000ms

Alternatives:
1. opus (score: 82.1) - High quality score (95)
2. gpt-4 (score: 79.3) - High capabilityMatch score (85.0)

Fallback Chain: sonnet → haiku → gpt-3.5
```

---

### `/model stats`

Display routing statistics and performance metrics.

**Usage:**
```bash
/model stats
/model stats --model opus
/model stats --task-type code-generation
```

**Output:**
- Total routing decisions
- Model usage breakdown
- Success rates by model
- Average costs and latency
- Task type distribution

**Example:**
```
Routing Statistics
==================

Total Decisions: 142

By Model:
- sonnet: 67 (47.2%) | Success: 94.0% | Avg Quality: 88.5 | Avg Cost: $0.0189
- haiku: 45 (31.7%) | Success: 96.0% | Avg Quality: 82.1 | Avg Cost: $0.0045
- opus: 30 (21.1%) | Success: 100% | Avg Quality: 94.2 | Avg Cost: $0.0876

By Task Type:
- code-generation: 56 (preferred: sonnet, avg quality: 89.2)
- documentation: 34 (preferred: haiku, avg quality: 85.0)
- architecture: 18 (preferred: opus, avg quality: 95.1)

Performance:
- Cache Hit Rate: 23.5%
- Fallback Rate: 3.5%
```

---

### `/model cost`

Generate cost report for a period.

**Usage:**
```bash
/model cost
/model cost --period today
/model cost --period week
/model cost --period month
/model cost --start 2025-01-01 --end 2025-01-31
```

**Output:**
- Total costs by model
- Daily cost breakdown
- Cost trends
- Optimization suggestions

**Example:**
```
Cost Report (Last 7 Days)
=========================

Total Cost: $12.45

By Model:
- sonnet: $7.89 (63.4%) | 418 requests | $0.0189/req
- haiku: $2.34 (18.8%) | 520 requests | $0.0045/req
- opus: $2.22 (17.8%) | 25 requests | $0.0888/req

Daily Costs:
- 2025-01-08: $2.15 (67 requests)
- 2025-01-07: $1.89 (54 requests)
- 2025-01-06: $1.67 (48 requests)

Trends:
- Daily Average: $1.78
- Weekly Average: $12.45
- Projected Monthly: $53.40

Optimization Suggestions:
1. For documentation tasks, use haiku instead of sonnet
   Savings: $0.0144/request | Est Monthly: $18.72
   Quality Impact: -6.4 points | Confidence: 80%

2. For simple-task tasks, use gpt-3.5 instead of sonnet
   Savings: $0.0139/request | Est Monthly: $11.23
   Quality Impact: -13.5 points | Confidence: 75%
```

---

### `/model budget`

Check budget status and limits.

**Usage:**
```bash
/model budget
/model budget --set-daily 20.0
/model budget --set-monthly 500.0
```

**Output:**
- Daily spending and limits
- Monthly spending and limits
- Budget alerts
- Reset times

**Example:**
```
Budget Status
=============

Daily:
- Spent: $3.45 / $10.00
- Remaining: $6.55
- Usage: 34.5%
- Resets: Tomorrow at 00:00 UTC

Monthly:
- Spent: $87.23 / $250.00
- Remaining: $162.77
- Usage: 34.9%
- Resets: 2025-02-01 at 00:00 UTC

Status: ✅ Within budget
```

---

### `/model classify [task]`

Classify a task without routing.

**Usage:**
```bash
/model classify "Fix authentication bug in login endpoint"
/model classify "Design scalable microservices architecture"
```

**Output:**
- Task type
- Complexity level
- Pattern detection
- Token estimates
- Characteristics

**Example:**
```
Task Classification Report
==========================

Type: debugging
Complexity: medium
Pattern: multi-step
Priority: 4/5

Characteristics:
- Requires Extended Thinking: Yes
- Involves Code: Yes
- Requires Creativity: No

Token Estimates:
- Input: ~850 tokens
- Output: ~1,500 tokens
- Total: ~2,350 tokens
```

---

### `/model config`

View or update routing configuration.

**Usage:**
```bash
/model config
/model config --show-models
/model config --show-weights
/model config --set-weight capability 0.4
```

**Output:**
- Current configuration
- Available models
- Routing weights
- Feature flags

---

### `/model fallback`

View and configure fallback chains.

**Usage:**
```bash
/model fallback
/model fallback --show opus
/model fallback --set opus "sonnet,gpt-4,haiku"
```

**Output:**
- Configured fallback chains
- Fallback event history
- Success rates

---

### `/model export`

Export routing data for analysis.

**Usage:**
```bash
/model export --format json --output routing-data.json
/model export --format csv --period month --output costs.csv
```

**Formats:**
- `json` - Full routing decisions and outcomes
- `csv` - Cost tracking data

---

### `/model reset`

Reset routing cache and statistics.

**Usage:**
```bash
/model reset --cache
/model reset --stats
/model reset --all
```

---

## Configuration

The model router can be configured via:

1. **Environment Variables:**
   ```bash
   ROUTING_DEFAULT_MODEL=sonnet
   ROUTING_ENABLE_CACHE=true
   ROUTING_CACHE_TTL=3600
   ROUTING_DAILY_BUDGET=10.0
   ROUTING_MONTHLY_BUDGET=250.0
   ```

2. **Config File:** `.claude/orchestration/routing/config.json`
   ```json
   {
     "defaultModel": "sonnet",
     "weights": {
       "capability": 0.35,
       "cost": 0.20,
       "latency": 0.15,
       "quality": 0.20,
       "historical": 0.10
     },
     "budget": {
       "dailyLimit": 10.0,
       "monthlyLimit": 250.0
     }
   }
   ```

## Model Profiles

Current model profiles (as of Jan 2025):

| Model | Best For | Cost/1M | Latency | Quality |
|-------|----------|---------|---------|---------|
| **opus** | Architecture, Planning, Critical | $15-75 | 3s | 95 |
| **sonnet** | Code, Analysis, General | $3-15 | 2s | 90 |
| **haiku** | Documentation, Simple Tasks | $0.8-4 | 0.8s | 80 |
| **gpt-4** | Complex Reasoning, Creative | $10-30 | 2.5s | 92 |
| **gpt-3.5** | Quick Tasks, Factual | $0.5-1.5 | 1s | 75 |
| **gemini-pro** | Analysis, Large Context | $1.25-5 | 2s | 88 |
| **gemini-flash** | Fast, High-Volume | $0.075-0.3 | 0.6s | 78 |

## Routing Decision Tree

```
Task Input
    │
    ├─ Classify (type, complexity, pattern)
    │
    ├─ Score Models
    │   ├─ Capability Match (35%)
    │   ├─ Cost Efficiency (20%)
    │   ├─ Quality (20%)
    │   ├─ Latency (15%)
    │   └─ Historical Performance (10%)
    │
    ├─ Select Best Match
    │
    ├─ Build Fallback Chain
    │
    └─ Return Decision
```

## Tips

- **Critical tasks**: Automatically routed to opus for highest quality
- **Simple tasks**: Automatically routed to haiku for speed and cost
- **Budget conscious**: Increase cost weight in config
- **Speed priority**: Increase latency weight in config
- **Learning**: System learns from outcomes when enabled

## Database

Routing data is stored in `.claude/orchestration/db/routing.db`

Tables:
- `routing_decisions` - All routing decisions
- `routing_outcomes` - Task outcomes and feedback
- `model_performance` - Aggregated performance metrics
- `cost_tracking` - Detailed cost records
- `budget_tracking` - Budget limits and spending

## Integration

Use the routing system programmatically:

```typescript
import { createDefaultRoutingSystem } from './.claude/orchestration/routing';

const routing = createDefaultRoutingSystem();

// Route a task
const decision = await routing.routeTask("Implement auth system");

// Execute with fallback
const result = await routing.executeWithRouting(
  "Fix bug in login",
  async (model) => {
    return await callLLM(model, prompt);
  }
);

// Check budget
const budget = routing.costOptimizer.checkBudget();
```

## See Also

- [Orchestration Protocol](../docs/ORCHESTRATION.md)
- [Cost Optimization Guide](../docs/COST_OPTIMIZATION.md)
- [Model Comparison](../docs/MODELS.md)
