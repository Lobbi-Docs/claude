---
name: jira:triage
description: Analyze issue to determine optimal workflow path
arguments:
  - name: issue_key
    description: Jira issue key (PROJ-123)
    required: true
  - name: depth
    description: Analysis depth (quick|standard|deep)
    default: standard
  - name: auto_start
    description: Auto-start workflow after triage
    default: false
version: 1.0.0
---

# Jira Issue Triage

Intelligent analysis to classify issues and select optimal workflow with required expertise and agent sequence.

**Auto time logging:** Command duration >= 60s auto-posts worklog (via `jira-orchestrator/config/time-logging.yml`)

## Usage
```bash
/jira:triage PROJ-123                # Standard triage
/jira:triage PROJ-123 quick          # 30-second quick analysis
/jira:triage PROJ-123 deep           # Deep (codebase analysis)
/jira:triage PROJ-123 standard true  # Auto-start workflow
```

## Triage Process

### 1. Fetch & Classify
- Fetch issue (type, summary, description, labels, priority, sprint, comments)
- Base type: bug|feature|improvement|epic|spike|task
- Extract urgency (priority, labels, sprint)
- Flag critical (outage, security, data loss)

### 2. Score Complexity (0-100)
| Factor | Weight | Range |
|--------|--------|-------|
| Scope | 25 | 5-25 (single→platform) |
| Technical Depth | 20 | 3-20 (config→architecture) |
| Dependencies | 15 | 2-15 (standalone→complex) |
| Risk Level | 15 | 3-15 (low→critical) |
| Uncertainty | 10 | 2-10 (clear→research needed) |
| Testing | 10 | 2-10 (unit→e2e) |
| Docs | 5 | 1-5 (minimal→extensive) |

**Tiers:** Trivial (0-20) → Low (21-40) → Medium (41-60) → High (61-80) → Critical (81-100)

### 3. Determine Priority (0-100)
- Jira Priority: +50 (Highest) → +5 (Low)
- Sprint: +30 (current+flagged) → +0 (backlog)
- Business Labels: +50 (outage) → +5 (debt)
- SLA: +30 (14+ days old) → +0

**Final:** P0 (100+) → P1 (75-99) → P2 (50-74) → P3 (25-49) → P4 (0-24)

### 4. Identify Required Expertise
Frontend | Backend | Database | DevOps | Full-stack | Testing | Security | Architecture

### 5. Select Workflow
- Production outage? → Emergency Hotfix (1-4h, incident-commander→hotfix→qa→deploy)
- Spike/research? → Research (2-5d, research-lead→prototyper→evaluator)
- Epic? → Epic Planning (4-8h, analyst→architect→planner→splitter)
- Architecture? → Design (1-3d, analyst→architect→reviewer→adr-writer)
- Complexity: Trivial/Low → Simple Task | Medium → Standard Feature | High/Critical → Complex Feature

### 6. Generate Agent Sequence
Assign models: Opus (strategy/architecture) | Sonnet (dev/analysis) | Haiku (docs/validation)

### 7. Output Report
Markdown with: Classification → Complexity → Priority → Expertise → Workflow → Risk → Dependencies → Recommendations

## Depth Modes
- **Quick** (30s): Basics only, no complexity scoring, no code analysis
- **Standard** (2m): Full issue, complexity, priority, expertise, workflow selection
- **Deep** (5m): Standard + codebase analysis + similar issues + historical patterns + risk details

## MCP Tools
- `mcp__jira__get_issue`: Fetch details
- `mcp__jira__search_issues`: Similar issues (deep)
- `mcp__context7__search`: Code analysis (deep)
- `mcp__obsidian__vault-add`: Save report

## Examples
```
/jira:triage LOBBI-456
→ Type: Bug | P1 | Medium (55/100) | Standard Feature Workflow | 1-2 days

/jira:triage LOBBI-100 deep
→ Type: Epic | P2 | Critical (88/100) | Epic Planning | 1w plan + 4-6w execution

/jira:triage LOBBI-999 quick true
→ Type: Bug | P0 | Low (18/100) | Emergency Hotfix | ✅ AUTO-STARTED
```

## See Also
- Workflows: `jira-orchestrator/workflows/`
- Agent Registry: `.claude/registry/agents.minimal.json`

**⚓ Golden Armada** | *The Fleet Stands Ready*
