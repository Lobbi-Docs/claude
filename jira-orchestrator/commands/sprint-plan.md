---
name: jira:sprint-plan
description: Automated sprint planning with capacity calculation, backlog prioritization, and velocity-based commitment
arguments:
  - name: sprint_name
    description: Name of the sprint to plan (e.g., Sprint 42)
    required: true
  - name: team_id
    description: Team identifier for capacity lookup
    required: false
    default: default
version: 1.0.0
---

# Sprint Planning Automation

You are conducting **automated sprint planning** with data-driven recommendations.

## Parameters

- **Sprint:** ${sprint_name}
- **Team:** ${team_id:-default}

---

## Sprint Planning Workflow

### Step 1: Invoke Sprint Planner Agent

```
Invoke the `sprint-planner` agent with:
  - sprint_name: ${sprint_name}
  - team_id: ${team_id:-default}
  - operation: "full-planning"
```

### Step 2: Calculate Team Capacity

The agent will:

1. **Get Team Members**
   - Query team roster
   - Get individual availability
   - Account for planned absences

2. **Calculate Available Hours**
   ```
   Base Hours = Working Days × Hours per Day × Team Size
   - Ceremonies overhead (20%)
   - Bug buffer (15%)
   - Support buffer (10%)
   - Uncertainty buffer (10%)
   = Net Available Hours
   ```

3. **Convert to Story Points**
   ```
   Capacity (SP) = Net Hours × Historical Velocity Factor
   ```

### Step 3: Analyze Velocity

1. **Historical Velocity**
   - Last 5 sprints average
   - Median and standard deviation
   - Trend analysis (improving/declining/stable)

2. **Velocity Prediction**
   - Conservative (80% confidence)
   - Expected (50% confidence)
   - Optimistic (20% confidence)

### Step 4: Prioritize Backlog

Using WSJF algorithm:

```
Priority Score = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

Categories:
- P0: Immediate (this sprint, must-have)
- P1: This Sprint (should-have)
- P2: Next Sprint (could-have)
- P3: Backlog (won't-have this sprint)

### Step 5: Generate Sprint Commitment

Based on capacity and velocity:

1. **Must-Have (70% of capacity)**
   - High priority items
   - Zero dependency conflicts
   - All have story points and AC

2. **Should-Have (20% of capacity)**
   - Medium priority items
   - Dependency-safe

3. **Stretch Goals (10% of capacity)**
   - Quick wins
   - Nice-to-have items

### Step 6: Risk Assessment

Calculate Sprint Risk Index (0-100):
- Dependency conflicts
- Unestimated items
- Large stories (>8 points)
- Team availability changes
- Velocity variance

### Step 7: Technical Debt Allocation

Reserve 10-20% of capacity for:
- Identified tech debt items
- Refactoring opportunities
- Infrastructure improvements

---

## Output Format

```markdown
## 📋 Sprint Planning Report: ${sprint_name}

### 👥 Team Capacity
| Metric | Value |
|--------|-------|
| Team Size | 5 |
| Available Days | 10 |
| Net Capacity | 42 SP |

### 📈 Velocity Analysis
| Metric | Value |
|--------|-------|
| Last 5 Sprint Avg | 38 SP |
| Trend | Improving (+5%) |
| Prediction | 40 ± 8 SP |

### ✅ Recommended Commitment

#### Must-Have (30 SP)
| Issue | Title | Points | Priority |
|-------|-------|--------|----------|
| PROJ-101 | Feature A | 8 | P0 |
| PROJ-102 | Bug Fix B | 3 | P0 |
| ... | ... | ... | ... |

#### Should-Have (8 SP)
| Issue | Title | Points | Priority |
|-------|-------|--------|----------|
| PROJ-201 | Enhancement C | 5 | P1 |
| ... | ... | ... | ... |

#### Stretch Goals (4 SP)
| Issue | Title | Points | Priority |
|-------|-------|--------|----------|
| PROJ-301 | Quick Win D | 2 | P2 |
| ... | ... | ... | ... |

### ⚠️ Risk Assessment
- **Risk Index:** 35/100 (Low)
- **Concerns:**
  - 1 large story (>8 points)
  - 2 items with external dependencies

### 🔧 Tech Debt Allocation
- Allocated: 5 SP (12% of capacity)
- Items: PROJ-401, PROJ-402

### 📊 Sprint Forecast
- Confidence: 85%
- Expected Completion: 38-42 SP
- Risk of Carryover: Low
```

---

## Example Usage

```bash
# Plan Sprint 42
/jira:sprint-plan sprint_name="Sprint 42"

# Plan with specific team
/jira:sprint-plan sprint_name="Sprint 42" team_id="platform-team"
```

---

## Post-Planning Actions

After generating the plan:

1. **Create Sprint in Jira** (if approved)
2. **Move issues to sprint**
3. **Post summary to Confluence**
4. **Notify team via Slack/Teams**
