---
name: incident-response
description: Production incident response and resolution workflow
pattern: hierarchical
coordinator: hierarchical-coordinator
agents:
  - incident-responder
  - observability
  - coder
  - k8s-deployer
priority: critical
---

# Incident Response Workflow

## Overview

Emergency workflow for handling production incidents with rapid diagnosis, mitigation, and resolution.

## Workflow Stages

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    INCIDENT DETECTED                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: TRIAGE (incident-responder)                       │
│  - Assess severity                                          │
│  - Identify affected services                               │
│  - Initial communication                                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Stage 2a: DIAGNOSE     │   │  Stage 2b: MITIGATE     │
│  (observability)        │   │  (k8s-deployer)         │
│  - Analyze logs         │   │  - Scale/restart        │
│  - Check metrics        │   │  - Rollback if needed   │
│  - Trace requests       │   │  - Enable fallbacks     │
└───────────┬─────────────┘   └───────────┬─────────────┘
            │                             │
            └──────────────┬──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: FIX (coder)                                       │
│  - Implement hotfix                                         │
│  - Emergency PR                                             │
│  - Fast-track review                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: DEPLOY (k8s-deployer)                             │
│  - Deploy fix                                               │
│  - Verify resolution                                        │
│  - Monitor stability                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 5: POSTMORTEM (incident-responder)                   │
│  - Document timeline                                        │
│  - Root cause analysis                                      │
│  - Action items                                             │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Severity Levels

| Level | Criteria | Response Time | Agents |
|-------|----------|---------------|--------|
| SEV-1 | Complete outage | Immediate | All |
| SEV-2 | Major feature down | < 30 min | incident-responder, observability, coder |
| SEV-3 | Minor degradation | < 4 hours | incident-responder, observability |
| SEV-4 | Low priority bug | Next sprint | coder, tester |

## Stage Details

### Stage 1: Triage (incident-responder)

\`\`\`yaml
actions:
  - assess_impact:
      questions:
        - "What services are affected?"
        - "How many users impacted?"
        - "Is there data loss?"
        - "What's the blast radius?"

  - classify_severity:
      sev1: "Complete outage, data loss"
      sev2: "Major feature broken"
      sev3: "Minor degradation"
      sev4: "Cosmetic/minor"

  - communicate:
      template: |
        **INCIDENT DECLARED - SEV-{{severity}}**
        **Impact:** {{impact_description}}
        **Affected:** {{services}}
        **Status:** Investigating
\`\`\`

### Stage 2a: Diagnose (observability)

\`\`\`yaml
actions:
  - check_metrics:
      queries:
        - "Error rate spike?"
        - "Latency degradation?"
        - "Resource exhaustion?"
        - "Traffic anomaly?"

  - analyze_logs:
      commands:
        - "kubectl logs -n agents --since=30m | grep ERROR"
        - "Check application logs for exceptions"
        - "Review recent deployments"

  - trace_requests:
      commands:
        - "Review distributed traces"
        - "Identify slow/failing spans"
        - "Check external dependencies"

output: |
  ## Diagnosis Summary
  - Root cause hypothesis: {{hypothesis}}
  - Evidence: {{evidence}}
  - Confidence: {{confidence_level}}
\`\`\`

### Stage 2b: Mitigate (k8s-deployer)

\`\`\`yaml
actions:
  - immediate_relief:
      options:
        - "Scale up replicas"
        - "Restart failing pods"
        - "Enable circuit breaker"
        - "Redirect traffic"

  - rollback:
      condition: "recent_deploy AND suspected_cause"
      command: "helm rollback golden-armada -n agents"

  - feature_flag:
      condition: "feature_specific_issue"
      command: "Disable problematic feature"
\`\`\`

### Stage 3: Fix (coder)

\`\`\`yaml
actions:
  - implement_fix:
      constraints:
        - "Minimal change"
        - "No new features"
        - "Must be tested"

  - create_pr:
      labels: ["hotfix", "urgent"]
      reviewers: ["on-call"]
      template: |
        ## Hotfix for {{incident_id}}

        **Root Cause:** {{root_cause}}
        **Fix:** {{fix_description}}

        - [ ] Tested locally
        - [ ] Reviewed by on-call
        - [ ] Ready for emergency deploy

  - fast_track_review:
      skip_if_sev1: true
      require_approval: 1
\`\`\`

### Stage 4: Deploy (k8s-deployer)

\`\`\`yaml
actions:
  - deploy_fix:
      strategy: "rolling"
      canary_percent: 10
      monitor_duration: "5m"

  - verify_resolution:
      checks:
        - "Error rate normalized"
        - "Latency within SLA"
        - "No new errors"
        - "Health checks passing"

  - monitor_stability:
      duration: "30m"
      alerts: "enabled"
\`\`\`

### Stage 5: Postmortem (incident-responder)

\`\`\`yaml
output_template: |
  # Incident Postmortem - {{incident_id}}

  **Date:** {{date}}
  **Duration:** {{duration}}
  **Severity:** {{severity}}
  **Responders:** {{responders}}

  ## Summary
  {{summary}}

  ## Timeline
  | Time | Event |
  |------|-------|
  {{timeline}}

  ## Root Cause
  {{root_cause}}

  ## Impact
  - Users affected: {{users_affected}}
  - Revenue impact: {{revenue_impact}}
  - SLA impact: {{sla_impact}}

  ## Resolution
  {{resolution}}

  ## Lessons Learned
  ### What went well
  {{went_well}}

  ### What went poorly
  {{went_poorly}}

  ## Action Items
  | Action | Owner | Due Date | Priority |
  |--------|-------|----------|----------|
  {{action_items}}
\`\`\`

## Invocation

\`\`\`bash
# Immediate incident response
Task("INCIDENT", "Production API returning 500 errors", "incident-responder")

# With severity
Task("SEV-1 INCIDENT", "Complete outage of agent services", "hierarchical-coordinator")
\`\`\`

## Escalation Path

1. **0-15 min:** On-call engineer + incident-responder
2. **15-30 min:** Team lead notified
3. **30-60 min:** Engineering manager engaged
4. **60+ min:** Executive notification for SEV-1
