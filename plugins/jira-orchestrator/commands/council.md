---
name: jira:council
description: Agent council review using blackboard pattern for comprehensive PR analysis
arguments:
  - name: target
    description: PR URL, repo:pr_number, or issue_key
    required: true
  - name: preset
    description: Preset (quick|standard|security|performance|full)
    default: standard
  - name: depth
    description: Depth (surface|standard|deep)
    default: standard
  - name: output
    description: Output (inline|summary|both)
    default: both
  - name: submit
    description: Submit review (true/false)
    default: true
version: 1.0.0
---

# Council Review - Blackboard Pattern

**Target:** ${target} | **Preset:** ${preset} | **Depth:** ${depth}

## Purpose

Multiple specialist agents analyze PR in parallel, share findings on blackboard, synthesize consensus/conflicts, vote with confidence weighting, submit inline + summary review.

## Presets & Members

**quick** (60s): code-reviewer, test-strategist
**standard** (180s): code-reviewer, security-auditor, test-strategist, performance-analyst
**security** (300s): security-auditor (lead), code-reviewer, api-reviewer, secrets-scanner
**performance** (300s): performance-analyst (lead), code-reviewer, database-reviewer, caching-specialist
**full** (600s): all agents (code, security, test, performance, accessibility, api, docs)

## Workflow

1. **Initialize Blackboard** - Parse target, fetch PR, select members per preset
2. **Spawn Agents (Parallel)** - Each analyzes from specialty, posts findings to blackboard
3. **Collect Findings** - Merge, deduplicate, link related findings (timeout: preset.timeout)
4. **Synthesize** - Identify consensus (60% threshold), flag conflicts, compute aggregate score
5. **Vote** - Weighted confidence: decision × confidence × weight / total weight
   - approve: score ≥0.75 | changereq: score <0.50 | reviewed: otherwise
   - Veto: security-auditor (critical issues), code-reviewer (critical bugs)
6. **Generate Output** - Per ${output}: inline comments at code locations, summary to PR, or both
7. **Submit Review** - Add inline comments (critical/warning severity), submit decision, add summary
8. **Sync to Jira** - Post decision, confidence, findings to issue

## Output Format

Finding structure:
```json
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

## Configuration

Override in `.jira/council-config.yaml`:
```yaml
council:
  default_preset: standard
  voting:
    approval_threshold: 0.75
    require_security_approval: true
  output:
    add_inline_comments: true
    max_inline_comments: 20
  jira:
    sync_enabled: true
```

## Integration

- `/jira:ship` - Full shipping with council review
- `/jira:iterate` - Fix feedback and re-review
- `/jira:review` - Single-agent review
- **Targets:** PR URL, repo:number, or issue_key

**⚓ Golden Armada** | *The Fleet Stands Ready*
