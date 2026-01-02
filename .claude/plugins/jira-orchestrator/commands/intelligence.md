---
name: jira:intelligence
description: Access AI-powered predictive analytics, smart prioritization, and learning insights
arguments:
  - name: operation
    description: Operation (predict, prioritize, velocity, patterns, briefing)
    required: true
  - name: target
    description: Target issue key, sprint name, or project key
    required: false
version: 1.0.0
---

# Intelligence Analytics

You are accessing the **AI-powered intelligence module** for predictive analytics and smart insights.

## Parameters

- **Operation:** ${operation}
- **Target:** ${target:-current project}

---

## Available Operations

### 1. Predict (`predict`)

Get predictions for complexity, risk, and estimates.

```
Invoke the `intelligence-analyzer` agent with:
  - operation: "predict"
  - target: ${target}  # Issue key
  - include_complexity: true
  - include_risk: true
  - include_estimate: true
```

**Output:**
```markdown
## 🔮 Predictions: ${target}

### Complexity Prediction
- **Score:** 7/10 (High)
- **Confidence:** 85%
- **Factors:**
  - Multiple system integrations (+2)
  - Authentication involved (+1.5)
  - Similar issues averaged 6.8

### Risk Assessment
- **Risk Score:** 62/100 (Medium-High)
- **Risk Breakdown:**
  | Factor | Score | Weight |
  |--------|-------|--------|
  | Technical | 65 | 35% |
  | Dependency | 70 | 25% |
  | Expertise | 45 | 20% |
  | Historical | 55 | 10% |
  | Timeline | 75 | 10% |

### Estimate Prediction
- **Predicted Points:** 8 (±2)
- **Similar Issues:**
  | Issue | Actual | Our Estimate |
  |-------|--------|--------------|
  | PROJ-89 | 8 | 8 |
  | PROJ-67 | 5 | 5 |
  | PROJ-45 | 13 | 13 |
- **Estimation Accuracy:** 87% (based on last 20 issues)
```

### 2. Prioritize (`prioritize`)

Smart prioritization of backlog items.

```
Invoke the `intelligence-analyzer` agent with:
  - operation: "prioritize"
  - target: ${target}  # Project key or sprint
  - algorithm: "wsjf"  # weighted shortest job first
  - include_recommendations: true
```

**Output:**
```markdown
## 📊 Smart Prioritization

**Algorithm:** Weighted Shortest Job First (WSJF)

### Prioritized Backlog

| Rank | Issue | Title | Priority Score | Tier |
|------|-------|-------|----------------|------|
| 1 | PROJ-123 | Payment Integration | 95 | P0 |
| 2 | PROJ-145 | User Auth Fix | 88 | P0 |
| 3 | PROJ-167 | Dashboard Charts | 72 | P1 |
| 4 | PROJ-189 | Email Templates | 65 | P1 |
| 5 | PROJ-201 | Dark Mode | 45 | P2 |

### Priority Breakdown (PROJ-123)
```
Business Value: 9/10 (Critical revenue impact)
Time Criticality: 8/10 (Deadline in 2 weeks)
Risk Reduction: 7/10 (Removes payment bottleneck)
Job Size: 5 (Medium effort)

WSJF Score = (9 + 8 + 7) / 5 = 4.8 × 20 = 96
```

### Recommendations
1. **Move PROJ-145 up** - Security issue, high risk
2. **Defer PROJ-201** - Nice-to-have, low impact
3. **Bundle PROJ-167 + PROJ-189** - Same domain, parallel work
```

### 3. Velocity (`velocity`)

Velocity analysis and forecasting.

```
Invoke the `intelligence-analyzer` agent with:
  - operation: "velocity"
  - target: ${target}  # Team or project
  - sprints: 5  # Historical sprints to analyze
  - forecast: 3  # Future sprints to predict
```

**Output:**
```markdown
## 📈 Velocity Analytics

### Historical Velocity (Last 5 Sprints)

| Sprint | Committed | Completed | Velocity |
|--------|-----------|-----------|----------|
| Sprint 38 | 40 | 38 | 38 |
| Sprint 39 | 42 | 44 | 44 |
| Sprint 40 | 45 | 42 | 42 |
| Sprint 41 | 40 | 40 | 40 |
| Sprint 42 | 42 | 41 | 41 |

### Statistics
- **Average:** 41 SP
- **Median:** 41 SP
- **Std Dev:** 2.2 SP
- **Trend:** Stable (+2%)

### Velocity Forecast

| Sprint | Conservative (80%) | Expected (50%) | Optimistic (20%) |
|--------|-------------------|----------------|------------------|
| Sprint 43 | 38 | 42 | 46 |
| Sprint 44 | 37 | 42 | 47 |
| Sprint 45 | 36 | 43 | 48 |

### Insights
- Velocity is stable with low variance
- Team consistently meets commitments (95%)
- Recommend: Commit to 40-42 SP for Sprint 43
```

### 4. Patterns (`patterns`)

Detect recurring patterns and bottlenecks.

```
Invoke the `intelligence-analyzer` agent with:
  - operation: "patterns"
  - target: ${target}
  - lookback_days: 90
  - include_bottlenecks: true
  - include_recurring: true
```

**Output:**
```markdown
## 🔄 Pattern Analysis

### Recurring Issue Patterns

| Pattern | Occurrences | Impact | Status |
|---------|-------------|--------|--------|
| Auth Integration Delays | 8 | High | Active |
| E2E Test Flakiness | 12 | Medium | Active |
| PR Review Bottleneck | 15 | Medium | Mitigated |

### Pattern Detail: Auth Integration Delays
- **First Seen:** 45 days ago
- **Last Seen:** 3 days ago
- **Root Cause:** External OAuth provider latency
- **Avg Delay:** 2.5 days per occurrence
- **Suggested Mitigation:**
  1. Add mock OAuth service for dev
  2. Increase timeout thresholds
  3. Add retry logic with backoff

### Bottleneck Analysis

| Stage | Avg Time | Issues | Bottleneck Score |
|-------|----------|--------|------------------|
| Code Review | 18h | 23 | 85 (Critical) |
| QA Testing | 12h | 15 | 62 (Medium) |
| Deployment | 2h | 5 | 25 (Low) |

### Recommendations
1. Add second reviewer to reduce code review time
2. Automate E2E tests to reduce QA bottleneck
3. Pattern "Auth Delays" needs architectural fix
```

### 5. Sprint Briefing (`briefing`)

Generate AI-powered sprint briefing.

```
Invoke the `intelligence-analyzer` agent with:
  - operation: "briefing"
  - target: ${target}  # Sprint name
  - include_risks: true
  - include_recommendations: true
```

**Output:**
```markdown
## 📋 Sprint Intelligence Briefing: ${target}

### Executive Summary
Sprint ${target} has **moderate risk** with **strong velocity**.
Key concerns: 2 high-complexity items, 1 external dependency.

### Capacity vs Commitment
- **Capacity:** 45 SP (based on team availability)
- **Committed:** 42 SP (93% utilization)
- **Risk-Adjusted Capacity:** 38 SP
- **Status:** ⚠️ Slightly aggressive

### Risk Matrix
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PROJ-123 complexity | 60% | High | Assign senior dev |
| External API | 40% | Medium | Fallback ready |
| Team absence | 20% | Low | Cross-train |

### Agent Recommendations
Based on historical performance:
| Issue | Recommended Agent | Success Rate |
|-------|-------------------|--------------|
| PROJ-123 | api-integration-specialist | 94% |
| PROJ-145 | react-component-architect | 91% |
| PROJ-167 | test-writer-fixer | 88% |

### Historical Context
- Similar sprints: Sprint 35, Sprint 38
- Average completion: 92%
- Common blockers: Code review delays

### Action Items
1. ⚡ Assign PROJ-123 to senior developer
2. 📞 Confirm external API availability
3. 📝 Pre-create PRs for early review
```

---

## Example Usage

```bash
# Predict complexity and risk for an issue
/jira:intelligence operation=predict target=PROJ-123

# Smart prioritize the backlog
/jira:intelligence operation=prioritize target=PROJECT

# Velocity analysis and forecast
/jira:intelligence operation=velocity target=platform-team

# Detect patterns and bottlenecks
/jira:intelligence operation=patterns lookback=90

# Generate sprint briefing
/jira:intelligence operation=briefing target="Sprint 43"
```
