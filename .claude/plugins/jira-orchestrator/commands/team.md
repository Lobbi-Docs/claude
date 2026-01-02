---
name: jira:team
description: Comprehensive team and resource management including capacity planning, skills inventory, workload balancing, and productivity optimization
arguments:
  - name: action
    description: Action to perform (capacity, skills, workload, balance, burnout, forecast, report)
    required: true
  - name: team_id
    description: Team identifier (defaults to configured team)
    required: false
    default: default
  - name: sprint_name
    description: Sprint name for capacity/workload analysis
    required: false
  - name: member_name
    description: Specific team member for individual analysis
    required: false
  - name: skill_name
    description: Specific skill for skill gap analysis
    required: false
version: 1.0.0
---

# Team & Resource Management Command

You are executing the `/jira:team` command for comprehensive team and resource management.

## Parameters

- **Action:** ${action}
- **Team:** ${team_id:-default}
- **Sprint:** ${sprint_name:-current}
- **Member:** ${member_name:-all}
- **Skill:** ${skill_name:-all}

---

## Action: capacity

**Purpose:** Calculate and analyze team capacity for a sprint

### Workflow

1. **Invoke team-capacity-planner agent:**
   ```
   agent: team-capacity-planner
   operation: calculate_capacity
   sprint_name: ${sprint_name}
   team_id: ${team_id}
   ```

2. **Agent Actions:**
   - Load team member roster and availability data
   - Calculate base capacity (working days × hours/day)
   - Subtract PTO, holidays, and planned absences
   - Apply overhead factors (meetings, ceremonies, admin)
   - Reserve buffers (bugs, support, uncertainty)
   - Convert hours to story points using velocity factors
   - Generate capacity breakdown by member

3. **Output Format:**
   ```markdown
   # Team Capacity Report
   **Sprint:** {sprint_name}
   **Team:** {team_id}

   ## Team Summary
   - Team Size: {size} members
   - Total Capacity: {hours} hours / {points} SP
   - Net Capacity: {net_hours} hours / {net_points} SP
   - Average Availability: {avg_availability}%

   ## Capacity by Member
   | Member | Base | Available | Productive | Capacity (SP) | Availability |
   |--------|------|-----------|------------|---------------|--------------|
   | ...    | ...  | ...       | ...        | ...           | ...          |

   ## Buffers & Reserves
   | Category | Hours | Points | % of Total |
   |----------|-------|--------|------------|
   | Bug Buffer | ... | ... | 15% |
   | Support Buffer | ... | ... | 10% |
   | Uncertainty | ... | ... | 10% |

   ## Recommendations
   - {recommendations}
   ```

4. **Save Report:**
   - Store in `/home/user/claude/jira-orchestrator/sessions/team-reports/capacity-{sprint_name}-{date}.md`

---

## Action: skills

**Purpose:** View and analyze team skills inventory

### Workflow

1. **Invoke skill-mapper agent:**
   ```
   agent: skill-mapper
   operation: inventory
   team_id: ${team_id}
   skill_name: ${skill_name}
   ```

2. **Agent Actions:**
   - Load team skills configuration from `config/team.yaml`
   - Build skills inventory by category (frontend, backend, devops, etc.)
   - Assess expertise levels (1-5 scale)
   - Validate against work history in Jira
   - Identify subject matter experts (SMEs)
   - Perform skill gap analysis
   - Generate training recommendations

3. **Output Format:**
   ```markdown
   # Team Skills Inventory
   **Team:** {team_id}
   **Date:** {date}

   ## Skills Matrix
   ### Frontend
   | Member | React | Vue | TypeScript | CSS |
   |--------|-------|-----|------------|-----|
   | ...    | ...   | ... | ...        | ... |

   ### Backend
   | Member | Python | Node.js | PostgreSQL |
   |--------|--------|---------|------------|
   | ...    | ...    | ...     | ...        |

   ## Subject Matter Experts
   - **React:** {expert_name} (Level 5)
   - **Python:** {expert_name} (Level 5)

   ## Skill Gaps
   ### Critical Gaps (P0)
   - {skill}: No coverage (Required: Level 3)

   ### Bus Factor Risks (P2)
   - {skill}: Only {expert} at proficient level

   ## Training Recommendations
   ### {member_name}
   1. {skill} (P0): {current_level} → {target_level} ({weeks} weeks)
      - {training_path}
   ```

4. **Interactive Options:**
   - If skill_name specified: Show detailed analysis for that skill
   - If member_name specified: Show personalized training plan

---

## Action: workload

**Purpose:** Analyze current workload distribution

### Workflow

1. **Invoke workload-balancer agent:**
   ```
   agent: workload-balancer
   operation: analyze_distribution
   team_id: ${team_id}
   sprint_name: ${sprint_name}
   ```

2. **Agent Actions:**
   - Query Jira for all assigned work by team member
   - Calculate workload in issues and story points
   - Calculate capacity utilization percentage
   - Compute distribution statistics (mean, stdev, CV)
   - Identify over-allocated and under-allocated members
   - Assess distribution balance (excellent/good/fair/poor)

3. **Output Format:**
   ```markdown
   # Workload Distribution Analysis
   **Team:** {team_id}
   **Sprint:** {sprint_name}

   ## Distribution Statistics
   - Mean Utilization: {mean}%
   - Coefficient of Variation: {cv}%
   - Balance Status: {status}

   ## Member Workload
   | Member | Assigned | Capacity | Utilization | Status |
   |--------|----------|----------|-------------|--------|
   | ...    | ...      | ...      | ...%        | ...    |

   ## Over-Allocated ({count})
   - {member}: {utilization}% ({excess} SP over capacity)

   ## Under-Allocated ({count})
   - {member}: {utilization}% ({available} SP available)

   ## Recommendations
   - {recommendations}
   ```

---

## Action: balance

**Purpose:** Generate workload rebalancing plan

### Workflow

1. **Invoke workload-balancer agent:**
   ```
   agent: workload-balancer
   operation: rebalance
   team_id: ${team_id}
   sprint_name: ${sprint_name}
   ```

2. **Agent Actions:**
   - Analyze current workload distribution
   - Identify over-allocated members (>100% capacity)
   - Identify under-allocated members (<70% capacity)
   - For each over-allocated member:
     - Get their assigned "To Do" issues
     - Match issues to under-allocated members based on skills
     - Generate reassignment recommendations
   - Calculate expected improvement in distribution
   - Optionally execute rebalancing (with confirmation)

3. **Output Format:**
   ```markdown
   # Workload Rebalancing Plan
   **Team:** {team_id}
   **Sprint:** {sprint_name}

   ## Current State
   - Balance Status: {status}
   - Coefficient of Variation: {cv}%
   - Over-Allocated: {count} members

   ## Rebalancing Actions

   ### Action 1: {from_member} → {to_member}
   **Issues to Reassign:**
   | Issue | Summary | Points | Skill Match |
   |-------|---------|--------|-------------|
   | ...   | ...     | ...    | ...         |

   **Impact:**
   - {from_member}: {before}% → {after}%
   - {to_member}: {before}% → {after}%

   ## Expected Results
   - Improved CV: {current_cv}% → {expected_cv}%
   - All members within 60-100% capacity
   - Estimated balance status: {expected_status}

   ## Execute Rebalancing?
   - Run: `/jira:team action=execute-balance` to apply changes
   ```

4. **Confirmation & Execution:**
   - If user confirms, execute reassignments in Jira
   - Update issue assignees
   - Add comments explaining rebalancing
   - Generate post-rebalancing report

---

## Action: burnout

**Purpose:** Detect burnout risk indicators

### Workflow

1. **Invoke workload-balancer agent:**
   ```
   agent: workload-balancer
   operation: detect_burnout
   team_id: ${team_id}
   member_name: ${member_name}
   ```

2. **Agent Actions:**
   - Analyze sustained over-allocation (last 4 sprints)
   - Check for declining velocity trends
   - Assess meeting load (% of time in meetings)
   - Calculate context switching and fragmentation
   - Check for weekend/after-hours work patterns
   - Calculate burnout risk score (0-100)
   - Classify risk level (low/moderate/high/critical)
   - Generate prevention recommendations

3. **Output Format:**
   ```markdown
   # Burnout Risk Assessment
   **Team:** {team_id}
   **Date:** {date}

   ## Team Overview
   | Member | Risk Score | Risk Level | Action Required |
   |--------|-----------|------------|-----------------|
   | ...    | .../100   | ...        | ...             |

   ## High Risk Members

   ### {member_name} (Risk Score: {score}/100)
   **Risk Level:** {level}
   **Action Required:** {action}

   **Risk Factors:**
   - {factor}: {details} (Impact: {score_impact})
   - {factor}: {details} (Impact: {score_impact})

   **Recommendations:**
   1. {recommendation} (Priority: {priority})
   2. {recommendation} (Priority: {priority})

   ## Prevention Actions
   - Immediate: {actions}
   - Short-term: {actions}
   - Long-term: {actions}
   ```

---

## Action: forecast

**Purpose:** Forecast capacity for upcoming sprints

### Workflow

1. **Invoke team-capacity-planner agent:**
   ```
   agent: team-capacity-planner
   operation: forecast
   team_id: ${team_id}
   num_sprints: 4
   ```

2. **Agent Actions:**
   - Calculate capacity for next 4 sprints
   - Account for known PTO and holidays
   - Apply historical capacity utilization rates
   - Generate conservative/expected/optimistic forecasts
   - Identify capacity constraints and risks
   - Recommend resource planning actions

3. **Output Format:**
   ```markdown
   # Capacity Forecast
   **Team:** {team_id}
   **Forecast Period:** {start_date} to {end_date}

   ## Forecast by Sprint

   ### Sprint +1 ({dates})
   - Conservative: {points} SP
   - Expected: {points} SP
   - Optimistic: {points} SP
   - Team Size: {size}
   - Known Absences: {count}

   ### Sprint +2 ({dates})
   - Conservative: {points} SP
   - Expected: {points} SP
   - Optimistic: {points} SP
   - Known Absences: {count}

   ## Capacity Trends
   - Average Capacity: {avg} SP/sprint
   - Trend: {increasing|stable|decreasing}

   ## Risks & Constraints
   - {risk}: {description}

   ## Recommendations
   - {recommendation}
   ```

---

## Action: report

**Purpose:** Generate comprehensive team health report

### Workflow

1. **Invoke all three agents in parallel:**
   ```
   parallel:
     - agent: team-capacity-planner (capacity analysis)
     - agent: skill-mapper (skills inventory + gaps)
     - agent: workload-balancer (distribution + burnout)
   ```

2. **Aggregate Results:**
   - Combine capacity, skills, and workload data
   - Calculate overall team health score
   - Identify top priorities for improvement
   - Generate executive summary

3. **Output Format:**
   ```markdown
   # Team Health Report
   **Team:** {team_id}
   **Sprint:** {sprint_name}
   **Date:** {date}

   ## Executive Summary
   **Overall Health Score:** {score}/100

   **Status:**
   - Capacity: {status} ✅/⚠️/❌
   - Skills: {status} ✅/⚠️/❌
   - Workload: {status} ✅/⚠️/❌
   - Burnout Risk: {status} ✅/⚠️/❌

   **Top Priorities:**
   1. {priority} ({urgency})
   2. {priority} ({urgency})
   3. {priority} ({urgency})

   ## Capacity
   - Net Capacity: {points} SP
   - Team Size: {size}
   - Availability: {pct}%

   ## Skills
   - Skill Coverage: {pct}%
   - Critical Gaps: {count}
   - Bus Factor Risks: {count}
   - SMEs: {count}

   ## Workload
   - Balance Status: {status}
   - Over-Allocated: {count}
   - CV: {cv}%

   ## Burnout Risk
   - High Risk: {count} members
   - Moderate Risk: {count} members
   - Low Risk: {count} members

   ## Detailed Sections
   - [Capacity Report](#capacity)
   - [Skills Inventory](#skills)
   - [Workload Analysis](#workload)
   - [Burnout Assessment](#burnout)

   ## Recommendations
   ### Immediate (This Sprint)
   - {recommendation}

   ### Short-term (Next 2-3 Sprints)
   - {recommendation}

   ### Long-term (Next Quarter)
   - {recommendation}
   ```

4. **Save Report:**
   - Store in `/home/user/claude/jira-orchestrator/sessions/team-reports/health-{team_id}-{date}.md`
   - Optionally post to Confluence
   - Send summary to team lead

---

## Additional Sub-Actions

### Context Switching Analysis

```bash
/jira:team action=context member_name="Alice"
```

**Output:**
- Fragmentation score
- Concurrent issues count
- Time lost to context switching
- Recommendations to reduce fragmentation

### Meeting Load Analysis

```bash
/jira:team action=meetings member_name="Bob"
```

**Output:**
- Average meeting hours per day
- Meeting load percentage
- Meeting-heavy days count
- Recommendations to optimize calendar

### Skill Gap for Specific Skill

```bash
/jira:team action=skill-gap skill_name="Kubernetes"
```

**Output:**
- Current team coverage for skill
- Gap assessment (critical/proficiency/bus factor)
- Training recommendations
- Suggested assignments for skill development

---

## Configuration

Team configuration is loaded from `/home/user/claude/jira-orchestrator/config/team.yaml`:

```yaml
teams:
  default:
    members:
      - id: alice
        name: Alice Smith
        role: Senior Engineer
        ...
    skills:
      alice:
        React: {level: 5, years: 4}
        Python: {level: 4, years: 3}
    pto_calendar:
      alice:
        - start: "2024-06-01"
          end: "2024-06-05"
```

---

## Example Usage

```bash
# Calculate sprint capacity
/jira:team action=capacity sprint_name="Sprint 42"

# View skills inventory
/jira:team action=skills

# Analyze workload distribution
/jira:team action=workload

# Generate rebalancing plan
/jira:team action=balance

# Detect burnout risks
/jira:team action=burnout

# Forecast future capacity
/jira:team action=forecast

# Generate comprehensive health report
/jira:team action=report

# Individual member analysis
/jira:team action=capacity member_name="Alice"
/jira:team action=skills member_name="Bob"
/jira:team action=burnout member_name="Carol"

# Skill-specific analysis
/jira:team action=skill-gap skill_name="Kubernetes"
```

---

## Integration Points

### With Other Commands

- `/jira:sprint-plan` - Uses capacity data for sprint planning
- `/jira:work` - Uses skill matching for task assignment
- `/jira:metrics` - Incorporates team health metrics

### With External Systems

- **Jira:** Queries issues, updates assignments
- **Calendar:** Integrates meeting data for capacity planning
- **HR System:** Imports PTO and availability
- **Confluence:** Posts team health reports

### With Agents

- **team-capacity-planner:** Capacity and forecast calculations
- **skill-mapper:** Skills inventory and gap analysis
- **workload-balancer:** Distribution and burnout detection

---

## Success Metrics

Team management is effective when:
- ✅ Capacity forecasts within 10% of actual
- ✅ Workload CV consistently <30%
- ✅ No burnout risk scores >40
- ✅ Skill gap score <30/100
- ✅ All critical skills have ≥2 proficient members
- ✅ Team health score >70/100
- ✅ Reports generated and reviewed weekly

---

**Note:** Regular team health monitoring (weekly or bi-weekly) helps identify issues early and maintain sustainable pace.
