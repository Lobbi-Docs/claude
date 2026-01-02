---
name: jira:council
description: Agent council review using blackboard pattern for comprehensive PR analysis
arguments:
  - name: target
    description: PR URL, repo:pr_number, or issue_key
    required: true
  - name: preset
    description: Council preset (quick, standard, security, performance, full)
    default: standard
  - name: depth
    description: Analysis depth (surface, standard, deep)
    default: standard
  - name: output
    description: Output format (inline, summary, both)
    default: both
  - name: submit
    description: Submit review to PR (true/false)
    default: true
version: 1.0.0
---

# Council Review - Agent Collective Intelligence

**Target:** ${target}
**Preset:** ${preset}
**Depth:** ${depth}
**Output:** ${output}
**Submit:** ${submit}

---

## Overview

The Agent Council uses the **Blackboard Pattern** for comprehensive PR review:

1. **Multiple specialists** analyze the PR in parallel
2. **Shared blackboard** collects findings
3. **Synthesis** identifies consensus and conflicts
4. **Voting** determines final decision
5. **Output** includes inline comments and summary

This provides enterprise-grade review coverage that no single agent could achieve.

---

## Council Presets

### Quick (1-2 min)

```yaml
quick:
  purpose: Fast review for small changes
  members:
    - code-reviewer (weight: 1.0)
    - test-strategist (weight: 0.8)
  timeout: 60s
  use_when:
    - files_changed < 5
    - simple_bug_fix
    - documentation_only
```

### Standard (3-5 min)

```yaml
standard:
  purpose: Balanced review for typical PRs
  members:
    - code-reviewer (weight: 1.0)
    - security-auditor (weight: 0.9)
    - test-strategist (weight: 0.8)
    - performance-analyst (weight: 0.7)
  timeout: 180s
  use_when:
    - typical_feature
    - bug_fix_with_tests
```

### Security (5-8 min)

```yaml
security:
  purpose: Security-focused deep analysis
  members:
    - security-auditor (weight: 1.0, lead: true)
    - code-reviewer (weight: 0.8)
    - api-reviewer (weight: 0.7)
    - secrets-scanner (weight: 0.9)
  timeout: 300s
  focus_areas:
    - authentication
    - authorization
    - input_validation
    - secrets_exposure
    - sql_injection
    - xss
  use_when:
    - auth_changes
    - api_endpoints
    - user_input_handling
```

### Performance (5-8 min)

```yaml
performance:
  purpose: Performance-focused analysis
  members:
    - performance-analyst (weight: 1.0, lead: true)
    - code-reviewer (weight: 0.8)
    - database-reviewer (weight: 0.9)
    - caching-specialist (weight: 0.7)
  timeout: 300s
  focus_areas:
    - algorithmic_complexity
    - database_queries
    - n_plus_one
    - memory_usage
    - caching_opportunities
  use_when:
    - database_changes
    - loop_heavy_code
    - data_processing
```

### Full (8-15 min)

```yaml
full:
  purpose: Comprehensive enterprise review
  members:
    - code-reviewer (weight: 1.0)
    - security-auditor (weight: 0.9)
    - test-strategist (weight: 0.8)
    - performance-analyst (weight: 0.7)
    - accessibility-expert (weight: 0.6, condition: frontend)
    - api-reviewer (weight: 0.6, condition: api)
    - documentation-reviewer (weight: 0.5)
  timeout: 600s
  use_when:
    - major_feature
    - breaking_change
    - release_candidate
```

---

## Blackboard Architecture

### Data Structure

```json
{
  "blackboard": {
    "id": "BB-{issue_key}-{timestamp}",
    "status": "active|synthesizing|complete",
    "created_at": "ISO8601",

    "context": {
      "pr": {
        "number": 42,
        "repo": "my-service",
        "title": "Add OAuth2 authentication",
        "diff_size": 450,
        "files_changed": 12
      },
      "jira": {
        "key": "PROJ-123",
        "type": "Story",
        "summary": "User authentication"
      }
    },

    "knowledge_entries": [
      {
        "id": "KE-001",
        "agent": "security-auditor",
        "timestamp": "ISO8601",
        "type": "concern",
        "severity": "critical",
        "file": "src/auth/oauth.ts",
        "line_start": 45,
        "line_end": 52,
        "content": "Token stored in localStorage - XSS vulnerable",
        "suggestion": "Use httpOnly cookies or secure storage",
        "confidence": 0.95,
        "tags": ["security", "auth", "xss"]
      }
    ],

    "synthesis": {
      "consensus": [
        "Test coverage is adequate",
        "Code structure is clean"
      ],
      "conflicts": [
        {
          "topic": "Token storage",
          "positions": [
            {"agent": "security-auditor", "view": "Use cookies"},
            {"agent": "performance-analyst", "view": "localStorage is faster"}
          ]
        }
      ],
      "aggregate_score": 0.72,
      "critical_issues": 1,
      "warnings": 3,
      "suggestions": 5
    },

    "votes": {
      "code-reviewer": {"decision": "approve", "confidence": 0.85},
      "security-auditor": {"decision": "changereq", "confidence": 0.95},
      "test-strategist": {"decision": "approve", "confidence": 0.80}
    },

    "final_decision": "changereq",
    "weighted_score": 0.68
  }
}
```

---

## Workflow

### Step 1: Initialize Blackboard

```yaml
actions:
  - Parse target to get repo and PR number
  - Fetch PR details and diff
  - Create blackboard with context
  - Select council members based on preset
```

### Step 2: Spawn Council Members

```yaml
execution:
  mode: parallel
  tool: Task

  for_each_member:
    prompt: |
      You are the ${agent_name} on a review council.

      ## Your Specialty
      ${agent_specialty}

      ## PR Context
      ${pr_context}

      ## Your Task
      1. Analyze the PR from your specialty perspective
      2. Post findings to the blackboard
      3. Assign confidence scores (0-1)
      4. Flag critical issues that should block merge

      ## Output Format
      For each finding:
      {
        "type": "concern|observation|approval|question",
        "severity": "critical|warning|info",
        "file": "path/to/file",
        "line_start": 42,
        "content": "Your finding",
        "suggestion": "How to fix",
        "confidence": 0.85
      }
```

### Step 3: Collect Findings

```yaml
collection:
  timeout: ${preset.timeout}
  min_responses: 2  # At least 2 agents must respond

  aggregation:
    - Merge all findings into blackboard
    - Deduplicate similar findings
    - Link related findings
```

### Step 4: Synthesize

```yaml
synthesis:
  actions:
    - Identify consensus (3+ agents agree)
    - Flag conflicting views
    - Calculate severity distribution
    - Compute aggregate confidence score

  consensus_detection:
    threshold: 0.6  # 60% agreement = consensus
    weighting: by_confidence
```

### Step 5: Vote

```yaml
voting:
  mechanism: weighted_confidence

  for_each_agent:
    decision: approve | changereq | reviewed
    confidence: 0-1

  calculation:
    weighted_score = sum(vote.decision * vote.confidence * agent.weight)
                   / sum(agent.weight)

  thresholds:
    approve: weighted_score >= 0.75
    changereq: weighted_score < 0.50
    reviewed: otherwise

  veto_power:
    - security-auditor: critical security issues
    - code-reviewer: critical bugs
```

### Step 6: Generate Output

Based on ${output} setting:

**inline:**
```yaml
# Add comments at specific code locations
for_each_finding:
  if severity in [critical, warning]:
    add_inline_comment(
      file=finding.file,
      line=finding.line_start,
      text=format_finding(finding)
    )
```

**summary:**
```yaml
# Add summary comment to PR
summary_comment:
  format: |
    ## Council Review Summary

    **Decision:** ${decision}
    **Confidence:** ${score}%

    ### Council Members
    ${member_votes}

    ### Findings
    - Critical: ${critical_count}
    - Warnings: ${warning_count}
    - Suggestions: ${suggestion_count}

    ### Details
    ${finding_details}
```

**both:**
```yaml
# Add inline comments AND summary
do_both: true
```

---

## Step 7: Submit Review (if submit=true)

### Via Harness API

```python
from lib.harness_code_api import HarnessCodeAPI

client = HarnessCodeAPI()

# 1. Add inline comments
for finding in blackboard.findings:
    if finding.severity in ["critical", "warning"]:
        client.create_comment(
            repo=repo,
            pr_number=pr,
            text=format_finding(finding),
            path=finding.file,
            line_start=finding.line_start,
            line_end=finding.line_end
        )

# 2. Submit review decision
client.submit_review(
    repo=repo,
    pr_number=pr,
    commit_sha=blackboard.context.pr.head_sha,
    decision=blackboard.final_decision  # approved|changereq|reviewed
)

# 3. Add summary comment
client.create_comment(
    repo=repo,
    pr_number=pr,
    text=format_council_summary(blackboard)
)
```

### Via GitHub (fallback)

```yaml
actions:
  - tool: mcp__github__create_review
    params:
      body: ${summary}
      event: ${decision}  # APPROVE|REQUEST_CHANGES|COMMENT
      comments: ${inline_comments}
```

---

## Step 8: Sync to Jira

```yaml
jira_sync:
  - tool: mcp__atlassian__jira_add_comment
    params:
      issue_key: ${issue_key}
      body: |
        ## Council Review Complete

        **PR:** ${pr_url}
        **Decision:** ${decision}
        **Confidence:** ${score}%

        ### Council Votes
        ${vote_breakdown}

        ### Key Findings
        ${top_findings}
```

---

## Output

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  COUNCIL REVIEW: ${target}                                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Preset: ${preset}  |  Depth: ${depth}  |  Duration: ${duration}          ║
║                                                                           ║
║  ─────────────────────────────────────────────────────────────────────── ║
║  DECISION: ${decision}  (Confidence: ${score}%)                           ║
║  ─────────────────────────────────────────────────────────────────────── ║
║                                                                           ║
║  Council Votes:                                                           ║
║  ├─ code-reviewer:      ${vote} (${confidence}%)                          ║
║  ├─ security-auditor:   ${vote} (${confidence}%)                          ║
║  ├─ test-strategist:    ${vote} (${confidence}%)                          ║
║  └─ performance-analyst: ${vote} (${confidence}%)                         ║
║                                                                           ║
║  Findings:                                                                ║
║  ├─ Critical: ${critical_count}                                           ║
║  ├─ Warnings: ${warning_count}                                            ║
║  └─ Suggestions: ${suggestion_count}                                      ║
║                                                                           ║
║  Top Issues:                                                              ║
║  ${top_issues}                                                            ║
║                                                                           ║
║  ${submitted_message}                                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Examples

### Review a PR

```bash
# Standard review
/jira:council my-service:42

# From Jira issue
/jira:council PROJ-123

# Security-focused
/jira:council my-service:42 --preset=security

# Deep analysis, no submit
/jira:council my-service:42 --depth=deep --submit=false
```

### Review from URL

```bash
/jira:council https://app.harness.io/code/repo/my-service/pulls/42
```

---

## Configuration

Override in `.jira/council-config.yaml`:

```yaml
council:
  default_preset: standard
  default_depth: standard

  presets:
    # Override standard preset
    standard:
      timeout: 240
      members:
        - code-reviewer
        - security-auditor
        - test-strategist

  voting:
    approval_threshold: 0.75
    require_security_approval: true

  output:
    add_inline_comments: true
    add_summary: true
    max_inline_comments: 20

  jira:
    sync_enabled: true
    add_comment: true
```

---

## Related Commands

- `/jira:ship` - Full shipping with council review
- `/jira:iterate` - Fix feedback and re-review
- `/jira:review` - Single-agent AI review
- `/harness-review` - Harness-specific review
