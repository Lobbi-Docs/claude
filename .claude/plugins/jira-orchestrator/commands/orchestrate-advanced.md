---
name: jira:orchestrate-advanced
description: Execute advanced orchestration patterns including Blackboard, Circuit Breaker, Dynamic Replanning, and Saga patterns
arguments:
  - name: issue_key
    description: The Jira issue key to orchestrate
    required: true
  - name: pattern
    description: Pattern to use (auto, blackboard, circuit-breaker, hierarchical, saga, all)
    required: false
    default: auto
version: 1.0.0
---

# Advanced Orchestration Patterns

You are executing **advanced orchestration patterns** for complex task handling.

## Parameters

- **Issue Key:** ${issue_key}
- **Pattern:** ${pattern:-auto}

---

## Pattern Selection

### Auto-Selection Logic (pattern=auto)

The system automatically selects patterns based on:

| Condition | Pattern Activated |
|-----------|-------------------|
| Complexity > 8 | Blackboard (collaborative problem-solving) |
| Story Points > 13 | Hierarchical Decomposition |
| External dependencies | Circuit Breaker + Saga |
| Multi-team coordination | Blackboard + Dynamic Replanning |
| Critical path risk > 0.7 | Dynamic Replanning |

---

## Available Patterns

### 1. Blackboard Pattern (`blackboard`)

Collaborative multi-agent problem-solving with shared knowledge space.

```
Invoke the `advanced-orchestration-patterns` agent with:
  - pattern: "blackboard"
  - issue_key: ${issue_key}
```

**Process:**
1. Create shared knowledge space
2. Spawn specialist agents (architect, security, performance, etc.)
3. Agents contribute knowledge entries with confidence scores
4. System synthesizes contributions
5. Solution emerges from consensus

**Output:**
```markdown
## 🎯 Blackboard Session: ${issue_key}

### Knowledge Contributions
| Agent | Entry | Confidence |
|-------|-------|------------|
| architect | Use microservice pattern | 0.85 |
| security | Add OAuth2 + JWT | 0.92 |
| performance | Cache with Redis | 0.78 |

### Synthesized Solution
- Architecture: Microservice with Redis caching
- Auth: OAuth2 with JWT tokens
- Data: PostgreSQL with connection pooling
- **Consensus Score:** 0.88

### Convergence Metrics
- Iterations: 4
- Time to converge: 8 minutes
- Final confidence: 0.88
```

### 2. Circuit Breaker Pattern (`circuit-breaker`)

Fault-tolerant orchestration with graceful degradation.

```
Invoke the `advanced-orchestration-patterns` agent with:
  - pattern: "circuit-breaker"
  - issue_key: ${issue_key}
```

**States:**
- **CLOSED:** Normal operation, failures tracked
- **OPEN:** Failures exceeded threshold, requests blocked
- **HALF_OPEN:** Testing recovery, limited requests

**Output:**
```markdown
## ⚡ Circuit Breaker Status: ${issue_key}

### Current State: CLOSED ✅

### Agent Health
| Agent | State | Success Rate | Response Time |
|-------|-------|--------------|---------------|
| code-architect | CLOSED | 98% | 45s |
| test-writer | HALF_OPEN | 75% | 120s |
| documentation | CLOSED | 100% | 15s |

### Recent Trips
| Time | Agent | Reason | Recovery |
|------|-------|--------|----------|
| 2h ago | test-writer | Timeout | Auto-recovered |

### Fallback Strategy
If primary agents fail:
1. code-architect → code-reviewer (fallback)
2. test-writer → manual test creation
3. documentation → template-based docs
```

### 3. Hierarchical Decomposition (`hierarchical`)

Recursive task breakdown with automatic parallelization.

```
Invoke the `advanced-orchestration-patterns` agent with:
  - pattern: "hierarchical"
  - issue_key: ${issue_key}
  - max_depth: 5
```

**Output:**
```markdown
## 🌳 Hierarchical Decomposition: ${issue_key}

### Task Tree
```
${issue_key}: Implement User Authentication
├── L1.1: Design auth architecture (8h)
│   ├── L2.1: Define auth flow (2h) ✅
│   └── L2.2: Select auth provider (4h) 🔄
├── L1.2: Implement backend (16h) [PARALLEL]
│   ├── L2.3: Create auth endpoints (8h)
│   ├── L2.4: JWT token service (4h)
│   └── L2.5: Session management (4h)
├── L1.3: Implement frontend (12h) [PARALLEL]
│   ├── L2.6: Login component (4h)
│   ├── L2.7: Auth context (4h)
│   └── L2.8: Protected routes (4h)
└── L1.4: Testing (8h) [SEQUENTIAL after L1.2, L1.3]
    ├── L2.9: Unit tests (4h)
    └── L2.10: E2E tests (4h)
```

### Parallelization Analysis
- **Total Tasks:** 10
- **Parallelizable:** 6 (60%)
- **Critical Path:** L1.1 → L1.2 → L1.4
- **Estimated Duration:** 32h → 20h (37% reduction)

### Execution Plan
| Wave | Tasks | Duration |
|------|-------|----------|
| 1 | L2.1, L2.2 | 4h |
| 2 | L2.3, L2.4, L2.5, L2.6, L2.7, L2.8 | 8h |
| 3 | L2.9, L2.10 | 4h |
```

### 4. Dynamic Replanning (`dynamic`)

Continuous plan evaluation with adaptive strategy.

```
Invoke the `advanced-orchestration-patterns` agent with:
  - pattern: "dynamic-replanning"
  - issue_key: ${issue_key}
```

**Output:**
```markdown
## 🔄 Dynamic Replanning: ${issue_key}

### Current Plan Health
- **Status:** ⚠️ Blocker Detected
- **Velocity:** 0.4 (below 0.5 threshold)
- **Risk Score:** 0.72 (above 0.7 threshold)

### Blocker Analysis
| Blocker | Impact | Duration | Resolution |
|---------|--------|----------|------------|
| External API down | High | 4h | Wait or mock |

### Replan Options

#### Option A: Wait for API (Current)
- **Delay:** 4h
- **Risk:** External dependency continues
- **Confidence:** 0.6

#### Option B: Use Mock API (Recommended)
- **Delay:** 1h (mock setup)
- **Risk:** Integration validation later
- **Confidence:** 0.85

#### Option C: Skip Integration
- **Delay:** 0h
- **Risk:** High (incomplete feature)
- **Confidence:** 0.3

### Recommendation
Switch to **Option B** (mock API)
- Lower delay
- Higher confidence
- Manageable risk

### Action
Replanning in progress...
- [ ] Create mock API responses
- [ ] Update test fixtures
- [ ] Continue with implementation
```

### 5. Saga Pattern (`saga`)

Distributed transaction management with compensating actions.

```
Invoke the `advanced-orchestration-patterns` agent with:
  - pattern: "saga"
  - issue_key: ${issue_key}
```

**Output:**
```markdown
## 🔗 Saga Orchestration: ${issue_key}

### Transaction Steps
| Step | Action | Status | Compensation |
|------|--------|--------|--------------|
| 1 | Create feature branch | ✅ Done | Delete branch |
| 2 | Update database schema | ✅ Done | Rollback migration |
| 3 | Deploy to staging | 🔄 Running | Undeploy |
| 4 | Run E2E tests | ⏳ Pending | N/A |
| 5 | Merge to main | ⏳ Pending | Revert commit |

### Saga State
- **Status:** EXECUTING
- **Current Step:** 3 (Deploy to staging)
- **Completed:** 2/5

### Compensation Plan (if failure)
If Step 3 fails:
1. ⏪ Rollback migration (Step 2 compensation)
2. ⏪ Delete branch (Step 1 compensation)
3. 📝 Log failure to Jira
4. 🔔 Notify team

### Durability
- State persisted to: `/sessions/sagas/${issue_key}.json`
- Last checkpoint: 2 minutes ago
- Crash recovery: Enabled
```

---

## Combined Pattern Execution (pattern=all)

For highly complex issues, all patterns work together:

```
1. Hierarchical Decomposition → Break down task
2. Blackboard → Collaborative planning for each subtask
3. Circuit Breaker → Protect all agent executions
4. Dynamic Replanning → Adapt when blockers occur
5. Saga → Ensure state consistency across phases
```

---

## Example Usage

```bash
# Auto-select patterns based on complexity
/jira:orchestrate-advanced issue_key=PROJ-123

# Force blackboard pattern for collaborative planning
/jira:orchestrate-advanced issue_key=PROJ-123 pattern=blackboard

# Use hierarchical decomposition for large tasks
/jira:orchestrate-advanced issue_key=PROJ-123 pattern=hierarchical

# Enable all patterns for maximum resilience
/jira:orchestrate-advanced issue_key=PROJ-123 pattern=all
```

---

## Pattern Metrics

Each pattern execution records:
- Execution time
- Success/failure rate
- Convergence metrics (blackboard)
- Circuit trips (circuit-breaker)
- Parallelization efficiency (hierarchical)
- Replans executed (dynamic)
- Compensations triggered (saga)

Use `/jira:metrics` to view pattern performance.
