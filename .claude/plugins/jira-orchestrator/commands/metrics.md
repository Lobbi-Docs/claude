---
name: jira:metrics
description: Generate real-time metrics dashboard with SLA tracking, agent performance, and throughput analysis
arguments:
  - name: format
    description: Output format (ascii, markdown, json, confluence)
    required: false
    default: markdown
  - name: period
    description: Time period (today, week, month, sprint)
    required: false
    default: today
version: 1.0.0
---

# Jira Orchestrator Metrics Dashboard

You are generating a **real-time metrics dashboard** for Jira orchestration activities.

## Parameters

- **Format:** ${format:-markdown}
- **Period:** ${period:-today}

---

## Dashboard Generation Process

### Step 1: Invoke Metrics Dashboard Agent

```
Invoke the `metrics-dashboard` agent with:
  - format: ${format:-markdown}
  - period: ${period:-today}
  - include_sla: true
  - include_agents: true
  - include_quality: true
  - include_throughput: true
```

### Step 2: Collect Metrics

The agent will collect and calculate:

1. **Orchestration Metrics**
   - Active orchestrations count
   - Phase distribution
   - Success/failure rates
   - Average completion times

2. **SLA Compliance**
   - Response time SLA compliance
   - Resolution time SLA compliance
   - At-risk issues (predicted breaches)
   - Violated SLAs with details

3. **Agent Performance**
   - Success rate by agent
   - Average execution time
   - Model cost breakdown (opus/sonnet/haiku)
   - Cost optimization opportunities

4. **Quality Metrics**
   - Test coverage trends
   - Bug escape rate
   - First-time pass rate
   - Rework percentage

5. **Throughput**
   - Issues completed
   - Story points delivered
   - Lead time distribution
   - Cycle time breakdown

### Step 3: Generate Dashboard

Based on format:

**ASCII (console):**
```
┌────────────────────────────────────────────────────────────────┐
│           JIRA ORCHESTRATOR METRICS - ${period}                │
├────────────────────────────────────────────────────────────────┤
│ Active: 5   │ Success: 92%  │ Avg Time: 45min │ SLA: 88%       │
├────────────────────────────────────────────────────────────────┤
│ Phase Distribution:                                            │
│ [EXPLORE ██████    ] 3                                         │
│ [PLAN    ████      ] 2                                         │
│ [CODE    ████████  ] 4                                         │
└────────────────────────────────────────────────────────────────┘
```

**Markdown (Jira/GitHub):**
```markdown
## 📊 Orchestration Metrics - ${period}

| Metric | Value | Trend |
|--------|-------|-------|
| Active | 5 | ↑ |
| Success Rate | 92% | → |
| SLA Compliance | 88% | ↓ |
```

**JSON (API):**
```json
{
  "period": "${period}",
  "generated_at": "...",
  "metrics": { ... }
}
```

**Confluence:**
Full Confluence page with charts and tables.

### Step 4: Display Results

Output the generated dashboard to the user.

---

## Example Usage

```bash
# Quick daily metrics
/jira:metrics

# Weekly markdown report
/jira:metrics format=markdown period=week

# ASCII dashboard for console
/jira:metrics format=ascii period=today

# JSON for automation
/jira:metrics format=json period=month

# Confluence monthly report
/jira:metrics format=confluence period=month
```

---

## Output Sections

### 1. Executive Summary
- Key metrics at a glance
- Critical alerts
- Trend indicators

### 2. SLA Status
- Compliance by issue type
- At-risk issues
- Violation details

### 3. Agent Performance
- Top performers
- Optimization opportunities
- Cost analysis

### 4. Quality Health
- Current scores
- Trends
- Recommendations

### 5. Throughput Analysis
- Delivery velocity
- Bottlenecks
- Forecasts
