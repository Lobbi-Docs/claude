---
name: jira:team
description: Team and resource management - capacity, skills, workload, burnout, and forecasting
arguments:
  - name: action
    description: Action (capacity|skills|workload|balance|burnout|forecast|report)
    required: true
  - name: team_id
    description: Team identifier
    required: false
    default: default
  - name: sprint_name
    description: Sprint name for analysis
    required: false
  - name: member_name
    description: Specific team member
    required: false
  - name: skill_name
    description: Specific skill
    required: false
version: 1.0.0
---

# Team & Resource Management

**Action:** ${action} | **Team:** ${team_id:-default} | **Sprint:** ${sprint_name:-current}

## Actions

### capacity
Invoke `team-capacity-planner` agent. Calculate base capacity, subtract PTO/holidays, apply overhead, reserve buffers, convert to story points.

### skills
Invoke `skill-mapper` agent. Build skills inventory by category, assess expertise (1-5), identify SMEs, perform gap analysis.

### workload
Invoke `workload-balancer` agent. Analyze assigned work, calculate utilization %, compute distribution stats (mean, stdev, CV), assess balance.

### balance
Invoke `workload-balancer` agent (rebalance mode). Match over-allocated members to under-allocated ones, generate reassignment plan with skill matching.

### burnout
Invoke `workload-balancer` agent. Analyze sustained over-allocation (4 sprints), check velocity trends, assess meeting load, calculate risk score (0-100).

### forecast
Invoke `team-capacity-planner` agent. Calculate capacity for next 4 sprints, account for PTO/holidays, generate conservative/expected/optimistic scenarios.

### report
Run all three agents in parallel. Aggregate capacity, skills, workload data. Calculate team health score (0-100). Generate priorities.

## Output Format

All actions save reports to:
- `/home/user/claude/jira-orchestrator/sessions/team-reports/{action}-{team_id}-{date}.md`

## Configuration

Load from `config/team.yaml`:
```yaml
teams:
  default:
    members: [array]
    skills: {member: {skill: {level, years}}}
    pto_calendar: {member: [{start, end}]}
```

## Integration Points

- `/jira:sprint-plan` - Uses capacity for planning
- `/jira:work` - Uses skill matching for assignments
- `/jira:metrics` - Incorporates team health metrics
- **Jira:** Queries issues, updates assignments
- **Calendar:** Meeting data for capacity planning
- **Agents:** team-capacity-planner, skill-mapper, workload-balancer

## Success Metrics

- Capacity forecasts within 10% of actual
- Workload CV consistently <30%
- No burnout scores >40
- Team health score >70/100

**⚓ Golden Armada** | *The Fleet Stands Ready*
