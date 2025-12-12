# /improve-orchestration

**Quick Usage:** `/improve-orchestration [target] --mode=analyze --depth=deep`

Optimize orchestration patterns across Claude Code agents, production systems, GitHub workflows, and multi-system coordination.

## Core Parameters

| Parameter | Type | Purpose | Example |
|-----------|------|---------|---------|
| target | string | What to optimize | `claude-code`, `production`, `github`, `all` |
| --mode | select | Analysis mode | `analyze`, `optimize`, `implement` |
| --depth | select | Analysis depth | `shallow`, `deep`, `exhaustive` |
| --focus | list | Specific areas | `latency,conflicts,patterns` |

## Quick Examples

\`\`\`bash
# Analyze Claude Code orchestration
/improve-orchestration claude-code --mode=analyze

# Full optimization of all systems
/improve-orchestration all --mode=optimize --depth=exhaustive

# Fix specific issues
/improve-orchestration production --focus=conflicts,latency
\`\`\`

## What It Does

**8-Phase Orchestration Improvement:**

| Phase | Focus | Duration |
|-------|-------|----------|
| 1. Discovery | Find orchestration points | 0-15 min |
| 2. Analysis | Identify patterns & anti-patterns | 15-35 min |
| 3. Design | Create improved architecture | 35-55 min |
| 4. Implementation | Apply fixes | 55-75 min |
| 5. Testing | Validate changes | 75-90 min |
| 6. Documentation | Update best practices | 90-105 min |
| 7. Optimization | Fine-tune performance | 105-115 min |
| 8. Monitoring | Setup alerts | 115-120 min |

## Key Metrics Analyzed

- Agent coordination latency
- Conflict resolution time
- Resource utilization
- Workflow parallelization efficiency
- Event flow bottlenecks

## Agent Coordination

Uses **meta-orchestration** pattern via `master-strategist` coordinating:
- Pattern discovery (orchestration-discoverer)
- Anti-pattern detection (pattern-analyzer)
- Architecture design (architect-supreme)
- Implementation (devops-automator)
- Testing (test-strategist)

## References

- **Full Execution Flow:** `.claude/docs/commands/improve-orchestration-reference.md`
- **Orchestration Config:** `.claude/orchestration/config.json`
- **Best Practices:** `.claude/docs/orchestration-patterns.md`
