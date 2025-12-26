# Orchestrate Complex v2.0 - High-Performance Multi-Agent Orchestration

Execute complex, multi-phase orchestration with **intelligent complexity scoring**, **tiered execution**, **cost optimization**, and **real-time DAG visualization**.

## v2.0 Key Features

- **Complexity Scoring Engine** - Auto-analyze task complexity (1-100)
- **4 Execution Tiers** - LIGHT (3-5) | STANDARD (6-9) | HEAVY (10-15) | MASSIVE (16-25)
- **Cost Optimization** - Smart model selection to minimize API costs
- **DAG Visualization** - Real-time dependency graph with execution status
- **Parallel Wave Execution** - Maximum parallelization with wave batching
- **Failure Recovery** - Circuit breakers, checkpoints, escalation
- **Performance Prediction** - Time & cost estimates before execution

---

## Quick Start

```bash
# Auto-detect complexity and execute
/orchestrate-complex "Build a real-time collaborative editor"

# Force specific tier
/orchestrate-complex "Fix typo in README" --tier=light

# With pattern and agent count
/orchestrate-complex "Migrate to microservices" --pattern=hierarchical --tier=massive
```

---

## Complexity Scoring Engine

```
COMPLEXITY ANALYSIS (runs first, ~30 seconds):
═════════════════════════════════════════════════════════════════════════
  ┌─────────────────────────────────────────────────────────────────────┐
  │  DIMENSION SCORING (0-100 each)                                     │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  📐 SCOPE (weight: 25%)                                             │
  │     • Files affected: 1-5 = 20, 6-20 = 50, 21-50 = 75, 50+ = 100   │
  │     • Components touched: count × 10                                │
  │     • Cross-cutting concerns: +20 each                              │
  │                                                                      │
  │  🔧 TECHNICAL (weight: 30%)                                         │
  │     • New patterns/frameworks: +25 each                             │
  │     • Database changes: +30 if schema, +15 if queries only         │
  │     • API changes: +20 if breaking, +10 if additive                │
  │     • Security implications: +25 if auth/crypto involved           │
  │                                                                      │
  │  🔗 DEPENDENCIES (weight: 20%)                                      │
  │     • External service integrations: +15 each                       │
  │     • Third-party library changes: +10 each                         │
  │     • Cross-team dependencies: +20 each                             │
  │                                                                      │
  │  ⚠️ RISK (weight: 25%)                                              │
  │     • Production impact: low=10, medium=40, high=70, critical=100  │
  │     • Rollback difficulty: easy=10, medium=40, hard=80             │
  │     • Data migration: +30 if involved                               │
  │                                                                      │
  │  FINAL SCORE = Σ(dimension × weight)                                │
  │                                                                      │
  │  TIER SELECTION:                                                    │
  │     1-25   → LIGHT    (3-5 agents,  ~5 min)                        │
  │     26-50  → STANDARD (6-9 agents,  ~15 min)                       │
  │     51-75  → HEAVY    (10-15 agents, ~30 min)                      │
  │     76-100 → MASSIVE  (16-25 agents, ~60 min)                      │
  │                                                                      │
  └─────────────────────────────────────────────────────────────────────┘
═════════════════════════════════════════════════════════════════════════
```

---

## Tiered Execution Modes

### LIGHT Mode (Score: 1-25, 3-5 agents, ~5 min)
**For:** Bug fixes, docs, config changes, small features

```typescript
// LIGHT mode uses consolidated agents
const lightExecution = {
  phases: ['EXPLORE+PLAN', 'CODE+TEST', 'FIX+DOCUMENT'],
  agents: [
    { name: 'analyst', model: 'haiku', tasks: ['explore', 'plan'] },
    { name: 'implementer', model: 'sonnet', tasks: ['code', 'test'] },
    { name: 'finalizer', model: 'haiku', tasks: ['fix', 'document'] }
  ],
  parallelization: 'minimal',
  checkpoints: ['after-implementation']
};
```

### STANDARD Mode (Score: 26-50, 6-9 agents, ~15 min)
**For:** Medium features, refactoring, API additions

```
STANDARD MODE EXECUTION:
═════════════════════════════════════════════════════════════
  WAVE 1: Analysis (2 parallel agents)
  ├── explorer (haiku): Codebase + requirements analysis
  └── researcher (haiku): Library docs + patterns

  WAVE 2: Planning (1 agent)
  └── strategist (sonnet): Architecture + task DAG

  WAVE 3: Implementation (3 parallel agents)
  ├── coder-1 (sonnet): Primary implementation
  ├── coder-2 (sonnet): Secondary tasks (if independent)
  └── tester (haiku): Unit tests alongside

  WAVE 4: Validation (2 parallel agents)
  ├── validator (haiku): Run tests + coverage
  └── security (haiku): Security scan

  WAVE 5: Finalization (1 agent)
  └── documenter (haiku): Docs + commit + PR
═════════════════════════════════════════════════════════════
```

### HEAVY Mode (Score: 51-75, 10-15 agents, ~30 min)
**For:** Major features, system integration, complex refactoring

```
HEAVY MODE EXECUTION:
═════════════════════════════════════════════════════════════
  WAVE 1: Deep Analysis (4 parallel agents)
  ├── deep-explorer (sonnet): Comprehensive codebase analysis
  ├── requirements-analyst (sonnet): Detailed requirements
  ├── risk-assessor (haiku): Risk identification
  └── compliance-checker (haiku): Regulatory check

  WAVE 2: Architecture (2 parallel agents)
  ├── architect (opus): System design + ADRs
  └── planner (sonnet): Task DAG + resource allocation

  WAVE 3: Implementation (5 parallel per wave level)
  └── code-agents (sonnet): Parallel DAG execution

  WAVE 4: Quality (3 parallel agents)
  ├── test-runner (haiku): Full test suite
  ├── security-scanner (sonnet): Vulnerability analysis
  └── performance-tester (haiku): Performance benchmarks

  WAVE 5: Fix Cycle (2 agents)
  ├── debugger (sonnet): Root cause analysis
  └── fixer (sonnet): Apply fixes

  WAVE 6: Documentation (2 agents)
  ├── doc-writer (haiku): Technical documentation
  └── vault-syncer (haiku): Obsidian sync
═════════════════════════════════════════════════════════════
```

### MASSIVE Mode (Score: 76-100, 16-25 agents, ~60 min)
**For:** Architectural overhaul, system migration, new platforms

```
MASSIVE MODE EXECUTION:
═════════════════════════════════════════════════════════════
  WAVE 1: Strategic Analysis (6 parallel agents)
  ├── master-strategist (opus): Overall strategy
  ├── architect-supreme (opus): Architecture design
  ├── risk-assessor (sonnet): Comprehensive risk analysis
  ├── compliance-orchestrator (sonnet): Full compliance review
  ├── security-architect (sonnet): Security architecture
  └── performance-architect (sonnet): Scalability design

  WAVE 2: Tactical Planning (4 parallel agents)
  ├── plan-decomposer (sonnet): Hierarchical task breakdown
  ├── resource-allocator (sonnet): Agent + resource assignment
  ├── dependency-mapper (haiku): Full dependency graph
  └── timeline-estimator (haiku): Critical path analysis

  WAVE 3: Parallel Implementation (up to 8 agents per wave)
  └── Dynamically spawned based on DAG levels

  WAVE 4: Comprehensive Quality (5 parallel agents)
  ├── test-strategist (sonnet): Test strategy execution
  ├── chaos-engineer (sonnet): Resilience testing
  ├── security-specialist (sonnet): Security audit
  ├── performance-optimizer (sonnet): Performance validation
  └── integration-tester (sonnet): Cross-component testing

  WAVE 5: Issue Resolution (3 agents)
  ├── root-cause-analyst (opus): Deep issue analysis
  ├── fix-implementer (sonnet): Fix application
  └── regression-checker (haiku): Regression verification

  WAVE 6: Documentation & Delivery (4 agents)
  ├── documentation-expert (sonnet): Comprehensive docs
  ├── architecture-documenter (sonnet): ADRs + diagrams
  ├── deployment-planner (haiku): Deployment strategy
  └── vault-syncer (haiku): Knowledge base sync
═════════════════════════════════════════════════════════════
```

---

## DAG Visualization (Real-time)

```
TASK DEPENDENCY GRAPH:
═════════════════════════════════════════════════════════════════════════

Level 0 (Parallel)
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ ✅ explore-1 │  │ ✅ explore-2 │  │ ✅ research  │
  │   (haiku)    │  │   (haiku)    │  │   (haiku)    │
  │   [0:45]     │  │   [0:52]     │  │   [1:03]     │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
         └────────────────┬┴─────────────────┘
                          │
Level 1 (Sequential)      ▼
               ┌──────────────────┐
               │ ✅ plan-strategy │
               │    (sonnet)      │
               │    [2:15]        │
               └────────┬─────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
Level 2  ▼              ▼              ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ 🔄 code-1│   │ ⏳ code-2│   │ ⏳ code-3│
  │ (sonnet) │   │ (sonnet) │   │ (sonnet) │
  │ [3:22]   │   │ blocked  │   │ blocked  │
  └────┬─────┘   └────┬─────┘   └────┬─────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
Level 3               ▼
               ┌──────────────┐
               │ ⏳ integrate │
               │   (sonnet)   │
               │   pending    │
               └──────────────┘

LEGEND: ✅ complete  🔄 running  ⏳ pending  ❌ failed  ⚠️ blocked

PROGRESS: ████████░░░░░░░░░░░░ 40% | ETA: 8:32 remaining
AGENTS:   4/9 active | COST: $0.42 estimated

═════════════════════════════════════════════════════════════════════════
```

---

## Cost Optimization

```typescript
// Smart model selection based on task type
const MODEL_SELECTION = {
  // Use haiku for fast, simple tasks (cheapest)
  haiku: [
    'exploration', 'research', 'testing', 'linting',
    'documentation', 'simple-fixes', 'status-checks'
  ],

  // Use sonnet for implementation tasks (balanced)
  sonnet: [
    'coding', 'refactoring', 'debugging', 'security-analysis',
    'test-writing', 'integration', 'complex-fixes'
  ],

  // Use opus only for strategic decisions (expensive)
  opus: [
    'architecture-design', 'strategic-planning',
    'complex-problem-solving', 'critical-decisions'
  ]
};

// Cost estimation
const COST_PER_AGENT = {
  haiku: 0.02,   // ~$0.02 per task
  sonnet: 0.15,  // ~$0.15 per task
  opus: 0.75     // ~$0.75 per task
};

// Pre-execution cost estimate
function estimateCost(tier: Tier): CostEstimate {
  const estimates = {
    LIGHT:    { min: 0.08, max: 0.25, typical: 0.15 },
    STANDARD: { min: 0.50, max: 1.50, typical: 0.90 },
    HEAVY:    { min: 2.00, max: 5.00, typical: 3.50 },
    MASSIVE:  { min: 5.00, max: 15.00, typical: 8.00 }
  };
  return estimates[tier];
}
```

---

## Parallel Wave Execution Engine

```typescript
interface WaveExecutor {
  // Execute tasks in parallel waves
  async executeWaves(dag: TaskDAG): Promise<WaveResults> {
    const waves = topologicalSort(dag);

    for (const wave of waves) {
      // Launch all independent tasks in parallel
      const tasks = wave.tasks.map(task =>
        Task({
          subagent_type: task.agentType,
          model: selectOptimalModel(task),
          prompt: buildPrompt(task, previousResults)
        })
      );

      // Wait for wave to complete
      const results = await Promise.all(tasks);

      // Checkpoint after each wave
      await checkpoint(wave.id, results);

      // Check for failures
      if (results.some(r => r.failed)) {
        await handleWaveFailure(wave, results);
      }
    }
  }
}

// Wave-level parallelization
const WAVE_LIMITS = {
  LIGHT: 2,      // Max 2 parallel agents
  STANDARD: 4,   // Max 4 parallel agents
  HEAVY: 6,      // Max 6 parallel agents
  MASSIVE: 8     // Max 8 parallel agents
};
```

---

## Failure Recovery Integration

```typescript
// Integrated with failure-recovery.ts module
import {
  circuitBreaker,
  negativeCache,
  checkpointManager,
  withFallback,
  determineEscalation
} from './lib/failure-recovery';

// Wave-level failure handling
async function handleWaveFailure(wave: Wave, results: Result[]): Promise<void> {
  const failures = results.filter(r => r.failed);

  for (const failure of failures) {
    // Check if we should retry
    const escalation = determineEscalation(
      failure.retryCount,
      failure.hasAlternatives,
      failure.isCritical
    );

    switch (escalation.level) {
      case 1: // Self-recovery
        await retryWithBackoff(failure.task);
        break;
      case 2: // Strategy pivot
        await retryWithAlternativeAgent(failure.task);
        break;
      case 3: // Graceful degradation
        await proceedWithPartialResult(failure.task);
        break;
      case 4: // Human escalation
        await pauseAndRequestHelp(failure.task);
        break;
    }
  }
}

// Automatic checkpoint and resume
async function executeWithRecovery(task: ComplexTask): Promise<void> {
  // Check for existing checkpoint
  const checkpoint = await checkpointManager.getLatestResumable(task.id);

  if (checkpoint) {
    console.log(`Resuming from checkpoint: ${checkpoint.phase}`);
    await resumeFromCheckpoint(checkpoint);
  } else {
    await executeFromStart(task);
  }
}
```

---

## Performance Prediction

```
PRE-EXECUTION ANALYSIS:
═════════════════════════════════════════════════════════════════════════

Task: "Build a real-time collaborative editor"

┌────────────────────────────────────────────────────────────────────────┐
│  COMPLEXITY SCORE: 72/100 (HEAVY tier)                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  BREAKDOWN:                                                            │
│  ├── Scope:        68/100 (12 files, 4 components, WebSocket)        │
│  ├── Technical:    78/100 (OT/CRDT, real-time sync, offline)         │
│  ├── Dependencies: 65/100 (3 external services, 2 new libraries)     │
│  └── Risk:         75/100 (high production impact, medium rollback)  │
│                                                                        │
│  EXECUTION PLAN:                                                       │
│  ├── Tier:         HEAVY                                              │
│  ├── Agents:       12-14 (10 sonnet, 3 haiku, 1 opus)                │
│  ├── Waves:        6                                                  │
│  └── Parallelism:  Up to 5 concurrent                                 │
│                                                                        │
│  ESTIMATES:                                                            │
│  ├── Time:         25-35 minutes                                      │
│  ├── Cost:         $2.80 - $4.20                                      │
│  └── Confidence:   78%                                                │
│                                                                        │
│  IDENTIFIED RISKS:                                                     │
│  ├── ⚠️ WebSocket complexity may require iteration                    │
│  ├── ⚠️ CRDT implementation is non-trivial                           │
│  └── ⚠️ Cross-browser testing needed                                  │
│                                                                        │
│  PROCEED? [Y/n]                                                        │
└────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════
```

---

## Orchestration Patterns (Enhanced)

### 1. Plan-then-Execute (Default)
```
Analysis → Planning → Validation → Parallel Execution → Quality → Delivery
```
Best for: Well-defined tasks, predictable scope

### 2. Hierarchical Decomposition
```
Root → Level 1 (5-7) → Level 2 → ... → Atomic → Bottom-up aggregation
```
Best for: Large objectives, epics, migrations

### 3. Blackboard (Collaborative)
```
Shared Knowledge Space ← Multiple Experts → Emergent Solution
```
Best for: Research, design exploration, complex problem-solving

### 4. Event Sourcing
```
Append-only Log → Immutable Facts → State Replay → Time-travel Debug
```
Best for: Audit requirements, complex workflows, debugging

### 5. Reactive (NEW in v2.0)
```
Event Stream → Reactive Agents → Dynamic Adaptation → Continuous Delivery
```
Best for: Long-running tasks, evolving requirements

---

## Success Metrics

```
ORCHESTRATION COMPLETE:
═════════════════════════════════════════════════════════════════════════

✅ EXECUTION SUMMARY
├── Tier Used:       HEAVY
├── Total Time:      28:42
├── Agents Spawned:  13
├── Total Cost:      $3.24
└── Success Rate:    100%

✅ QUALITY METRICS
├── Tests Passing:   47/47 (100%)
├── Test Coverage:   87%
├── Security Issues: 0 critical, 0 high
├── Complexity:      All functions <10 cyclomatic
└── Dependencies:    0 vulnerabilities

✅ DELIVERABLES
├── Files Changed:   14
├── Lines Added:     1,247
├── Lines Removed:   89
├── Commits:         3
└── PR Created:      #142

✅ DOCUMENTATION
├── README Updated:  Yes
├── ADRs Created:    2
├── API Docs:        Generated
└── Vault Synced:    Yes

═════════════════════════════════════════════════════════════════════════
```

---

## Command Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--tier` | light, standard, heavy, massive, auto | auto | Force execution tier |
| `--pattern` | pte, hierarchical, blackboard, event, reactive | pte | Orchestration pattern |
| `--agents` | 3-25 | auto | Override agent count |
| `--cost-limit` | $X.XX | none | Maximum cost allowed |
| `--dry-run` | flag | false | Show plan without executing |
| `--resume` | checkpoint-id | none | Resume from checkpoint |
| `--parallel` | 1-8 | auto | Max parallel agents |

---

## Examples

```bash
# Auto-detect complexity (recommended)
/orchestrate-complex "Implement user authentication with OAuth2"

# Force light tier for simple task
/orchestrate-complex "Update copyright year in footer" --tier=light

# Massive migration with cost limit
/orchestrate-complex "Migrate monolith to microservices" --tier=massive --cost-limit=15.00

# Dry run to see plan
/orchestrate-complex "Add GraphQL API layer" --dry-run

# Resume interrupted orchestration
/orchestrate-complex --resume=ckpt-20251226-143022

# Hierarchical breakdown for epic
/orchestrate-complex "Build analytics platform" --pattern=hierarchical --tier=heavy
```

---

## Integration Points

- **Jira Orchestrator**: Auto-link to Jira issues
- **Code Quality Orchestrator**: Integrated quality gates
- **Failure Recovery**: Circuit breakers, checkpoints, escalation
- **Obsidian Vault**: Automatic documentation sync
- **GitHub**: PR creation with quality report

---

## Notes

- Complexity scoring runs automatically before execution
- Cost estimates shown before confirmation
- All checkpoints saved for potential resume
- Real-time DAG visualization available
- Failure recovery is automatic with escalation
