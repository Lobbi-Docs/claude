# /project-status

**Quick Usage:** `/project-status [scope] --format=dashboard --insights=true`

Real-time project health assessment, phase tracking, and intelligent sprint planning for RealmWorks 20-phase roadmap.

## Core Parameters

| Parameter | Type | Purpose | Example |
|-----------|------|---------|---------|
| scope | string | Status scope | `all`, `current-phase`, `sprint`, `risks` |
| --format | select | Output format | `dashboard`, `report`, `json` |
| --insights | boolean | AI recommendations | `true`, `false` |
| --depth | select | Detail level | `summary`, `detailed`, `comprehensive` |

## Quick Examples

\`\`\`bash
# Quick dashboard
/project-status all --format=dashboard

# Current sprint deep dive
/project-status sprint --depth=comprehensive

# Risk assessment only
/project-status risks --insights=true
\`\`\`

## What It Analyzes

**6 Core Dimensions:**

| Dimension | Metrics | Sources |
|-----------|---------|---------|
| Phase Progress | Completion %, blockers | `.claude/context/project-phases/` |
| Sprint Health | Velocity, burndown | Git commits, Jira API |
| Technical Debt | Code quality, coverage | SonarQube, CodeClimate |
| Dependencies | Health score, vulnerabilities | `package.json`, `requirements.txt` |
| Risk Assessment | Risk score, mitigation | All sources + AI analysis |
| Resource Allocation | Team capacity, utilization | Git contributors, Jira |

## Output Dashboard

\`\`\`
╔══════════════════════════════════════════════╗
║  PROJECT HEALTH: 🟢 HEALTHY (Score: 87/100)  ║
╠══════════════════════════════════════════════╣
║  Phase 12/20  ████████████░░░░░░░░ 60%      ║
║  Sprint Velocity: ↗ +15% (23 → 26.5 pts)    ║
║  Tech Debt: 🟡 Medium (DTI: 12%)            ║
║  Critical Risks: 2 (Migration, API Limits)   ║
╚══════════════════════════════════════════════╝
\`\`\`

## AI-Powered Insights

When `--insights=true`:
- Next sprint recommendations
- Priority rebalancing suggestions
- Risk mitigation strategies
- Resource reallocation proposals
- Technical debt paydown plan

## Agent Coordination

Uses **strategic analysis** pattern via `master-strategist` coordinating:
- Phase tracking (phase-tracker)
- Sprint metrics (sprint-analyst)
- Tech debt analysis (code-analyzer)
- Risk assessment (risk-assessor)
- Planning (product-owner)

## References

- **Full Analysis Flow:** `.claude/docs/commands/project-status-reference.md`
- **Phase Documentation:** `.claude/context/project-phases/`
- **Metrics Guide:** `.claude/docs/metrics-definitions.md`
