# Intelligence Analyzer - Usage Examples

This document provides practical examples of how to use the intelligence-analyzer agent in the jira-orchestrator system.

## Example 1: Pre-Sprint Analysis

### Scenario
You're planning Sprint 25 and want data-driven insights on which issues to include and how to estimate them.

### Request
```
"Use intelligence-analyzer to analyze the top 15 backlog issues and generate a sprint 25 briefing"
```

### Process

**Step 1: Intelligence analyzer loads backlog issues**
```yaml
backlog_issues:
  - PROJ-234: "Implement OAuth2 login with Keycloak"
  - PROJ-235: "Create user profile editing UI"
  - PROJ-236: "Add payment processing integration"
  # ... 12 more issues
```

**Step 2: Analyze each issue**

For PROJ-234:
```yaml
analysis:
  complexity:
    predicted: 7.2
    confidence: 0.88
    factors:
      - "auth integration (historical avg: 7.5)"
      - "3 external dependencies"
      - "Keycloak configuration required"

  risk:
    score: 68
    level: "high"
    factors:
      - "Pattern detected: auth-integration-delay"
      - "External Keycloak dependency"
      - "Production security impact"

  priority:
    score: 82
    tier: "P0 - Immediate"
    reasoning: "High business value (customer blocker), tight deadline"

  effort:
    estimated_story_points: 8
    estimated_hours: 24-28
    confidence_interval: [6, 10]

  recommended_agents:
    - agent: "keycloak-identity-specialist"
      confidence: 96
    - agent: "api-integration-specialist"
      confidence: 85

  historical_context:
    similar_issues: ["PROJ-189", "PROJ-156"]
    avg_completion_time: 26.5
    success_rate: 0.75
    key_lesson: "Early specialist assignment critical"
```

**Step 3: Generate sprint briefing**
```yaml
sprint_25_briefing:
  generated_at: "2025-12-22T08:00:00Z"

  velocity_forecast:
    predicted_velocity: 41
    confidence_interval: [38, 44]
    recommended_capacity: 40

  recommended_issues:
    high_priority:
      - PROJ-234 (8 pts, high risk, schedule days 1-2)
      - PROJ-236 (5 pts, medium risk, schedule days 3-5)
      - PROJ-240 (3 pts, low risk, quick win)

    medium_priority:
      - PROJ-235 (5 pts, low risk)
      - PROJ-241 (3 pts, low risk)
      # ... more

  total_recommended_points: 40

  insights:
    - "Sprint has good complexity balance (60% medium, 25% low)"
    - "1 high-risk issue (PROJ-234) - mitigate by scheduling early"
    - "3 quick wins available for early delivery"

  warnings:
    - "keycloak-identity-specialist will be at capacity (3 tasks)"
    - "PROJ-234 has historical delay pattern - add 2-day buffer"

  recommendations:
    - "Schedule PROJ-234 on day 1 (risk mitigation)"
    - "Pair keycloak-identity-specialist with api-integration-specialist"
    - "Reserve 5 points for unplanned work"
    - "Consider spike story for PROJ-245 (high uncertainty)"

  quality_gates:
    - "Pre-configure Keycloak realm before sprint start"
    - "Ensure OAuth sandbox environment is ready"
    - "Schedule security review for PROJ-234"
```

**Step 4: Present to team**

The sprint planning meeting now has data-driven insights:
- Which issues to prioritize (and why)
- Realistic capacity (40 points, not 45)
- Risk mitigation strategies
- Agent assignments with confidence scores
- Early warning of potential bottlenecks

### Outcome

Sprint 25 is planned with:
- ✅ Right-sized backlog (40 points vs historical velocity 41)
- ✅ High-risk items scheduled early
- ✅ Expert agents assigned to critical tasks
- ✅ Mitigation strategies in place for known patterns
- ✅ Buffer included for unplanned work

---

## Example 2: Agent Performance Review

### Scenario
You want to evaluate how well different agents are performing and identify top performers vs those needing improvement.

### Request
```
"Use intelligence-analyzer to review agent performance for the last 3 months"
```

### Process

**Step 1: Load historical data**
```bash
# Intelligence analyzer queries
- history/2025/10/*.yaml (October)
- history/2025/11/*.yaml (November)
- history/2025/12/*.yaml (December)

# Finds 47 completed tasks across 12 agents
```

**Step 2: Calculate performance metrics**

For `react-component-architect`:
```yaml
agent: react-component-architect
period: "2025-10-01 to 2025-12-22"
tasks_completed: 15

performance_metrics:
  success_rate: 0.933  # 14/15 successful
  avg_completion_time_days: 3.2
  estimation_accuracy: 0.91  # Within 9% of estimates

  quality_metrics:
    avg_test_coverage: 0.89
    avg_code_review_score: 8.7/10
    bugs_per_task: 0.2

  complexity_performance:
    low_complexity:
      tasks: 4
      success_rate: 1.0
      avg_time: 1.5 days
    medium_complexity:
      tasks: 8
      success_rate: 0.875
      avg_time: 3.8 days
    high_complexity:
      tasks: 3
      success_rate: 1.0
      avg_time: 6.2 days

  specialization_scores:
    react_components: 0.98  # Excellent
    accessibility: 0.92     # Excellent
    state_management: 0.88  # Very good
    performance: 0.75       # Good
    animations: 0.65        # Needs improvement

  collaboration:
    best_paired_with:
      - accessibility-expert (synergy: 0.95)
      - api-integration-specialist (synergy: 0.88)
    avg_team_size: 2.1

  trend: "improving"  # Performance trending up
```

**Step 3: Compare with other agents**

```yaml
performance_rankings:
  by_success_rate:
    1. prisma-specialist: 0.980 (49/50)
    2. react-component-architect: 0.933 (14/15)
    3. api-integration-specialist: 0.917 (22/24)
    # ...

  by_estimation_accuracy:
    1. prisma-specialist: 0.95
    2. react-component-architect: 0.91
    3. test-writer-fixer: 0.88
    # ...

  by_quality_score:
    1. accessibility-expert: 9.2/10
    2. react-component-architect: 8.7/10
    3. prisma-specialist: 8.5/10
    # ...

  needs_improvement:
    - frontend-specialist: Success rate 0.70 (below 0.80 threshold)
    - backend-generalist: Estimation accuracy 0.65
    - database-optimizer: Limited data (only 2 tasks)
```

**Step 4: Generate recommendations**

```yaml
recommendations:
  top_performers:
    - prisma-specialist:
        strengths: ["Highest success rate", "Excellent estimation"]
        recommendation: "Use for all database/Prisma tasks"

    - react-component-architect:
        strengths: ["Strong frontend", "Great accessibility"]
        improvement_area: "Animations (0.65 score)"
        recommendation: "Consider training on animation libraries"

  agents_needing_support:
    - frontend-specialist:
        issues: ["Success rate 70% (below 80% threshold)"]
        analysis: "Struggles with complex state management"
        recommendation: "Pair with react-component-architect for training"

    - backend-generalist:
        issues: ["Estimation accuracy 65%"]
        analysis: "Consistently underestimates API integration tasks"
        recommendation: "Review estimation process, use historical data"

  specialization_gaps:
    - "No agent with high performance optimization skills"
    - "Limited Kafka/messaging expertise"
    - "Animation specialist needed for frontend"

  collaboration_insights:
    - "react-component-architect + accessibility-expert = 95% synergy"
    - "prisma-specialist + api-integration-specialist = 90% synergy"
    - "Avoid pairing frontend-specialist + backend-generalist (conflicts)"
```

### Outcome

Team now has data to:
- ✅ Recognize top performers
- ✅ Identify skill gaps
- ✅ Provide targeted training
- ✅ Improve agent pairings
- ✅ Adjust agent assignments based on performance

---

## Example 3: Pattern Detection and Mitigation

### Scenario
You've noticed auth-related tasks often get delayed. You want to understand why and create a mitigation strategy.

### Request
```
"Use intelligence-analyzer to detect patterns in auth-related task delays"
```

### Process

**Step 1: Query auth tasks**
```bash
# Intelligence analyzer searches history/
# Finds 23 auth-related tasks in last 90 days
```

**Step 2: Filter by delays**
```yaml
delayed_auth_tasks:
  total: 8 out of 23
  delay_rate: 0.35  # 35% of auth tasks delayed

  examples:
    - PROJ-234:
        planned: 3 days
        actual: 5.5 days
        delay: 2.5 days
        reason: "Keycloak realm approval delay"

    - PROJ-189:
        planned: 2 days
        actual: 4.5 days
        delay: 2.5 days
        reason: "OAuth testing environment unavailable"

    - PROJ-156:
        planned: 4 days
        actual: 6 days
        delay: 2 days
        reason: "Token handling edge cases"
```

**Step 3: Identify pattern**
```yaml
pattern_detected:
  pattern_id: "auth-integration-delay"
  pattern_type: "bottleneck"

  definition:
    keywords: ["auth", "keycloak", "oauth", "integration"]
    issue_types: ["Story", "Bug"]
    domains: ["auth", "backend"]
    frequency: 8  # Occurred 8 times
    avg_delay_days: 2.5
    total_cost_hours: 160  # 8 tasks × 20 hours avg

  root_causes:
    1: "Keycloak realm configuration requires manual approval (5 occurrences)"
    2: "OAuth testing environment not always available (4 occurrences)"
    3: "Token handling edge cases not well documented (3 occurrences)"
    4: "External dependency on identity service (2 occurrences)"

  impact_analysis:
    affected_sprints: 6
    avg_velocity_impact: -3.5 points per sprint
    business_impact: "medium-high"
    customer_complaints: 2
```

**Step 4: Generate mitigation strategies**
```yaml
mitigation_strategies:
  preventive:
    - strategy: "Pre-configure Keycloak realms"
      implementation: "Create realms 2 days before sprint start"
      estimated_impact: "Eliminate 5/8 delays"
      cost: "2 hours per sprint"

    - strategy: "Create OAuth testing sandbox"
      implementation: "Dedicated staging environment for auth testing"
      estimated_impact: "Eliminate 4/8 delays"
      cost: "1 day setup + $50/month"

    - strategy: "Document token handling patterns"
      implementation: "Create auth integration playbook"
      estimated_impact: "Reduce complexity by 30%"
      cost: "4 hours documentation"

  detective:
    - strategy: "Add auth tasks to sprint planning checklist"
      implementation: "Flag auth tasks for early review"
      estimated_impact: "Early detection of issues"
      cost: "5 minutes per planning"

    - strategy: "Monitor OAuth sandbox availability"
      implementation: "Automated health check + alerts"
      estimated_impact: "Prevent 80% of environment issues"
      cost: "2 hours setup"

  corrective:
    - strategy: "Assign keycloak-identity-specialist early"
      implementation: "Schedule auth tasks in first 3 days of sprint"
      estimated_impact: "Better resource allocation"
      cost: "None"

    - strategy: "Create auth task template"
      implementation: "Pre-populate acceptance criteria and test cases"
      estimated_impact: "Reduce planning time by 50%"
      cost: "2 hours to create template"

  recommended_implementation_order:
    1:
      strategy: "Document token handling patterns"
      reason: "Quick win, low cost, immediate value"
      timeline: "This sprint"

    2:
      strategy: "Pre-configure Keycloak realms"
      reason: "Highest impact, addresses 5/8 delays"
      timeline: "Next sprint"

    3:
      strategy: "Create OAuth testing sandbox"
      reason: "Larger investment, long-term benefit"
      timeline: "Within 2 sprints"

    4:
      strategy: "Automated monitoring"
      reason: "Supporting infrastructure"
      timeline: "Within 3 sprints"
```

**Step 5: Save pattern and track effectiveness**
```yaml
# Save to patterns/auth-integration-delay.yaml

tracking:
  pattern_created: "2025-12-22"
  mitigations_implemented: []
  effectiveness:
    baseline_delay_rate: 0.35
    current_delay_rate: null  # Will track after mitigations
    target_delay_rate: 0.10   # Reduce to 10%
    review_date: "2026-01-22"  # Review in 1 month
```

### Outcome

Team now has:
- ✅ Clear understanding of auth task delays
- ✅ Root cause analysis
- ✅ Prioritized mitigation strategies
- ✅ Implementation plan with timelines
- ✅ Tracking mechanism for effectiveness

Expected results after mitigations:
- Delay rate: 35% → 10%
- Velocity impact: -3.5 points → -0.5 points
- Cost savings: 160 hours → 50 hours over 6 sprints

---

## Example 4: Velocity Forecasting for Epic Planning

### Scenario
You have a large epic (Epic-42) with 25 stories totaling 120 story points. You need to forecast when it will be completed.

### Request
```
"Use intelligence-analyzer to forecast completion date for Epic-42 (120 points)"
```

### Process

**Step 1: Load historical velocity**
```yaml
historical_velocity:
  team: "lobbi-core-team"
  sprints:
    - sprint: 21
      velocity: 38
      duration: 14 days
    - sprint: 22
      velocity: 41
      duration: 14 days
    - sprint: 23
      velocity: 40
      duration: 14 days
    - sprint: 24
      velocity: 42
      duration: 14 days

  avg_velocity: 40.25
  std_dev: 1.71
  trend: "increasing"
  trend_slope: +1.0 points per sprint
```

**Step 2: Calculate forecast**
```yaml
epic_forecast:
  epic_key: "EPIC-42"
  total_story_points: 120

  base_calculation:
    avg_velocity: 40.25
    sprints_needed: 2.98  # 120 / 40.25
    rounded_sprints: 3

  trend_adjusted:
    # Assume velocity continues increasing
    sprint_25_forecast: 41
    sprint_26_forecast: 42
    sprint_27_forecast: 43
    total_capacity: 126
    sprints_needed: 2.86
    rounded_sprints: 3

  conservative_estimate:
    # Use lower bound of confidence interval
    velocity_lower_bound: 38
    sprints_needed: 3.16
    rounded_sprints: 4

  risk_adjusted:
    # Account for uncertainty and unplanned work
    buffer_percentage: 0.15  # 15% buffer
    total_points_with_buffer: 138
    avg_velocity: 40.25
    sprints_needed: 3.43
    rounded_sprints: 4

  completion_forecast:
    optimistic:
      sprints: 3
      end_date: "2026-02-16"  # End of Sprint 27
      confidence: 0.60

    realistic:
      sprints: 3
      end_date: "2026-02-16"
      confidence: 0.80

    conservative:
      sprints: 4
      end_date: "2026-03-02"  # End of Sprint 28
      confidence: 0.95

  recommended_plan:
    target_sprints: 3
    target_end_date: "2026-02-16"
    contingency_date: "2026-03-02"
    confidence: 0.80

    sprint_breakdown:
      sprint_25:
        planned_points: 41
        stories: 11
        start: "2025-12-23"
        end: "2026-01-05"

      sprint_26:
        planned_points: 42
        stories: 10
        start: "2026-01-06"
        end: "2026-01-19"

      sprint_27:
        planned_points: 37  # Remaining
        stories: 4
        start: "2026-01-20"
        end: "2026-02-02"
```

**Step 3: Identify risks and dependencies**
```yaml
risk_analysis:
  risks:
    - risk: "Auth integration delays (pattern detected)"
      impact: "+0.5 sprints"
      mitigation: "Implement auth-integration-delay mitigations"

    - risk: "Team member vacation (Jan 15-20)"
      impact: "-5 points capacity in Sprint 26"
      mitigation: "Adjust Sprint 26 to 37 points"

    - risk: "External API dependency (Story EPIC-42-S12)"
      impact: "Potential 1 week delay"
      mitigation: "Schedule early, create fallback plan"

  dependency_analysis:
    blocking_dependencies: 2
    external_dependencies: 1
    critical_path_stories: 8

    recommendations:
      - "Schedule critical path stories across all 3 sprints"
      - "Complete blocking stories in Sprint 25"
      - "External dependency story in Sprint 25 (early risk mitigation)"
```

**Step 4: Generate epic timeline**
```yaml
epic_timeline:
  epic: "EPIC-42"
  total_points: 120
  forecasted_sprints: 3
  forecasted_completion: "2026-02-02"
  confidence: 0.80

  milestone_plan:
    milestone_1:
      sprint: 25
      target_points: 41
      target_date: "2026-01-05"
      deliverables:
        - "Auth integration complete"
        - "Core API endpoints live"
        - "Database schema deployed"

    milestone_2:
      sprint: 26
      target_points: 79  # Cumulative
      target_date: "2026-01-19"
      deliverables:
        - "Frontend UI 70% complete"
        - "Integration testing underway"
        - "External API integration done"

    milestone_3:
      sprint: 27
      target_points: 120
      target_date: "2026-02-02"
      deliverables:
        - "All features complete"
        - "E2E testing passed"
        - "Documentation complete"
        - "Production ready"

  tracking_metrics:
    - "Velocity per sprint (target: 40+)"
    - "Points completed vs planned"
    - "Scope creep (new stories added)"
    - "Risk materialization"

  contingency_plans:
    if_behind_schedule:
      - "Reduce scope (drop nice-to-have stories)"
      - "Add 4th sprint (contingency date: 2026-03-02)"
      - "Increase team capacity (short-term)"

    if_ahead_schedule:
      - "Add polish stories"
      - "Increase test coverage"
      - "Add documentation"
      - "Start next epic early"
```

### Outcome

Product owner and team now have:
- ✅ Data-driven completion forecast (80% confidence)
- ✅ Sprint-by-sprint breakdown
- ✅ Milestone plan with deliverables
- ✅ Risk assessment and mitigation
- ✅ Contingency plans
- ✅ Tracking metrics

This enables:
- Accurate roadmap planning
- Stakeholder communication with realistic dates
- Proactive risk management
- Resource allocation planning

---

## Integration Example: Intelligence + Expert-Agent-Matcher

### Scenario
The expert-agent-matcher is scoring agents for a high-risk auth task. Intelligence analyzer provides historical performance data to improve the scoring.

### Process

**Step 1: Expert-agent-matcher initiates**
```python
# Expert-agent-matcher analyzing PROJ-234
issue = jira_get_issue("PROJ-234")
# Detects: auth domain, high complexity, Keycloak keyword
```

**Step 2: Query intelligence analyzer**
```python
# Expert-agent-matcher requests historical data
historical_data = intelligence_analyzer.get_agent_performance(
    domain="auth",
    keywords=["keycloak", "oauth"]
)

# Intelligence analyzer responds
{
    "keycloak-identity-specialist": {
        "success_rate": 0.95,
        "avg_completion_time": 18.5,
        "quality_score": 9.2,
        "specialization_scores": {
            "keycloak_realms": 0.98,
            "oauth_flows": 0.96
        },
        "estimation_accuracy": 0.93,
        "tasks_in_domain": 20
    },
    "security-specialist": {
        "success_rate": 0.88,
        "avg_completion_time": 22.0,
        "quality_score": 8.7,
        "specialization_scores": {
            "keycloak_realms": 0.75,
            "oauth_flows": 0.72
        },
        "estimation_accuracy": 0.85,
        "tasks_in_domain": 8
    }
}
```

**Step 3: Expert-agent-matcher integrates data**
```python
# Original scoring (before intelligence data)
base_score_keycloak_specialist = 88  # From keyword/domain matching

# Apply historical performance boost (+15 points max)
historical_boost = (
    success_rate * 5 +              # 0.95 * 5 = 4.75
    quality_score / 10 * 5 +        # 9.2/10 * 5 = 4.6
    estimation_accuracy * 3 +       # 0.93 * 3 = 2.79
    (tasks_in_domain / 30) * 2      # 20/30 * 2 = 1.33
)  # Total: 13.47 points

# Final score
final_score_keycloak_specialist = 88 + 13.47 = 101.47 → capped at 100

# Comparison
{
    "keycloak-identity-specialist": {
        "base_score": 88,
        "historical_boost": 13.47,
        "final_score": 100,
        "confidence_level": "Excellent"
    },
    "security-specialist": {
        "base_score": 75,
        "historical_boost": 9.2,
        "final_score": 84.2,
        "confidence_level": "Strong"
    }
}
```

**Step 4: Intelligence provides additional context**
```python
# Pattern detection
pattern = intelligence_analyzer.check_patterns(issue)
# Returns: "auth-integration-delay" pattern detected

# Recommendation
{
    "pattern_detected": "auth-integration-delay",
    "historical_delay_rate": 0.35,
    "mitigation_required": True,
    "recommended_actions": [
        "Assign keycloak-identity-specialist (proven success)",
        "Schedule early in sprint (days 1-2)",
        "Pre-configure Keycloak realm",
        "Ensure OAuth sandbox available"
    ]
}
```

**Step 5: Final recommendation**
```yaml
expert_matching_result:
  issue: "PROJ-234"

  primary_expert:
    agent: "keycloak-identity-specialist"
    confidence_score: 100  # Boosted by historical performance
    rationale: >
      Perfect match with exceptional historical performance.
      95% success rate on 20 similar tasks, highest quality scores,
      proven expertise in Keycloak realms and OAuth flows.

  pattern_alert:
    pattern: "auth-integration-delay"
    mitigation: "Pre-configure realm, schedule early"

  execution_plan:
    schedule: "Sprint 25, Days 1-2"
    preparation:
      - "Pre-configure Keycloak realm (2 days before sprint)"
      - "Validate OAuth sandbox availability"
    agents:
      primary: "keycloak-identity-specialist"
      supporting: "api-integration-specialist"
```

### Outcome

By integrating intelligence analyzer with expert-agent-matcher:
- ✅ Agent scoring improved with historical data
- ✅ Pattern detection provides early warnings
- ✅ Mitigation strategies automatically suggested
- ✅ Higher confidence in agent selection
- ✅ Better task success rate

---

## Tips for Effective Use

1. **Build Historical Data First**
   - Intelligence analyzer needs data to learn
   - Start tracking task completions immediately
   - Aim for at least 5-10 completed tasks per domain

2. **Review and Refine Predictions**
   - Compare predictions vs actuals monthly
   - Adjust configuration weights based on accuracy
   - Update pattern mitigations based on effectiveness

3. **Use Intelligence Proactively**
   - Generate sprint briefings before planning
   - Review agent performance quarterly
   - Run pattern detection monthly
   - Forecast epics early in planning

4. **Integrate with Existing Workflows**
   - Add intelligence briefing to sprint planning agenda
   - Review velocity trends in retrospectives
   - Use pattern insights for process improvements
   - Track agent performance in 1-on-1s

5. **Keep Data Clean**
   - Ensure completed tasks have accurate metadata
   - Update story points if they change
   - Record lessons learned
   - Archive old data regularly

---

**Note:** These examples assume the intelligence analyzer has sufficient historical data. For new installations, predictions will have lower confidence until enough data is collected.
