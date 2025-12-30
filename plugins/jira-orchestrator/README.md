# Jira Orchestrator Plugin

**Version:** 4.0.0 | **Agents:** 64 | **Commands:** 36 | **Context Budget:** Optimized

---

## Quick Start

```bash
# Install
bash scripts/install.sh

# Set environment
export JIRA_API_TOKEN="your_token"
export JIRA_SITE_URL="https://yourcompany.atlassian.net"
export JIRA_USER_EMAIL="your.email@company.com"

# Verify
claude /jira:setup
```

---

## Essential Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/jira:work` | Full orchestrated implementation | `/jira:work PROJ-123` |
| `/jira:status` | Check progress | `/jira:status PROJ-123` |
| `/jira:triage` | Classify and route | `/jira:triage PROJ-123` |
| `/jira:prepare` | Create subtasks | `/jira:prepare PROJ-123` |
| `/jira:pr` | Create pull request | `/jira:pr PROJ-123` |
| `/jira:review` | AI code review | `/jira:review` |

**Full command list:** `registry/commands.index.json`

---

## 6-Phase Protocol (Mandatory)

```
EXPLORE (2+) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

| Phase | Goal | Key Agents |
|-------|------|------------|
| EXPLORE | Context gathering | triage-agent, task-enricher |
| PLAN | Execution planning | planner, architect |
| CODE | Implementation | domain specialists (via agent-router) |
| TEST | Validation | test-strategist, coverage-analyst |
| FIX | Bug resolution | debugger, fixer |
| DOCUMENT | Documentation | documentation-writer |

---

## Agent Categories (64 Total)

| Category | Count | Key Agents |
|----------|-------|------------|
| **core** | 6 | triage-agent, code-reviewer, pr-creator |
| **intelligence** | 5 | intelligence-analyzer, agent-router |
| **enterprise** | 8 | notification-router, sla-monitor, compliance-reporter |
| **portfolio** | 4 | portfolio-manager, release-coordinator |
| **sprint** | 5 | sprint-planner, team-capacity-planner |
| **git** | 7 | commit-tracker, smart-commit-validator |
| **confluence** | 3 | confluence-manager |

**Full agent list:** `registry/agents.index.json`

---

## Enterprise Features (v4.0)

| Feature | Command | Description |
|---------|---------|-------------|
| **Notifications** | `/jira:notify` | Slack, Teams, Email, Webhooks |
| **Approvals** | `/jira:approve` | Multi-level workflows |
| **Portfolio** | `/jira:portfolio` | Multi-project dashboards |
| **SLA** | `/jira:sla` | Real-time monitoring |
| **Compliance** | `/jira:compliance` | SOC2, GDPR, ISO27001 |
| **Batch** | `/jira:batch` | Bulk operations |
| **Export** | `/jira:export` | PDF, Excel, CSV |

---

## Quality Gates

| Gate | Status | Enforcement |
|------|--------|-------------|
| Code Review | **BLOCKING** | PR creation blocked until passed |
| Tests Passing | Required | 80% coverage threshold |
| Documentation | Required | Synced to Obsidian vault |

---

## Workflow Selection

| Workflow | Trigger | Duration | Agents |
|----------|---------|----------|--------|
| quick-fix | complexity ≤ 10 | 1-4h | 3-5 |
| standard-feature | complexity 11-40 | 4-16h | 5-8 |
| complex-feature | complexity > 40 | 1-3 days | 8-13 |
| epic-decomposition | type = Epic | 1-2 days | 4-6 |
| critical-bug | priority = Highest | 2-8h | 3-5 |

---

## Dynamic Agent Discovery

The `agent-router` selects specialists based on:
- **Jira labels/components**
- **File patterns** (`.tsx` → frontend, `.prisma` → database)
- **Keywords** in description
- **Phase requirements**

**Config:** `config/file-agent-mapping.yaml`

---

## Registry Structure

```
registry/
├── agents.index.json     # 64 agents with categories
├── commands.index.json   # 36 commands with quick reference
└── workflows.index.json  # Workflow definitions
```

**Load on-demand:** Read full agent/command docs from `agents/*.md` or `commands/*.md`

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `JIRA_API_TOKEN` | Yes | Jira API authentication |
| `JIRA_SITE_URL` | Yes | Jira instance URL |
| `JIRA_USER_EMAIL` | Yes | Your email |
| `OBSIDIAN_VAULT_PATH` | No | Documentation sync |
| `GITHUB_TOKEN` | No | PR creation |

---

## MCP Integration

The plugin auto-configures Atlassian MCP via `.mcp.json`:

```json
{"atlassian": {"command": "npx", "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"]}}
```

**Available tools:** `jira_get_issue`, `jira_create_issue`, `jira_update_issue`, `jira_transition_issue`, `confluence_*`

---

## External Documentation

Full documentation stored externally for context efficiency:

| Document | Location |
|----------|----------|
| Full README | `docs/archive/README-v4-full.md` |
| Installation Guide | `INSTALLATION.md` |
| Agent Details | `agents/*.md` |
| Command Docs | `commands/*.md` |
| Workflows | Obsidian: `System/Claude-Instructions/Jira-Orchestrator-Workflows.md` |

---

## Context Efficiency Metrics

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| README lines | 2,192 | ~150 | **93%** |
| Token estimate | ~45,000 | ~3,000 | **93%** |
| Load strategy | All inline | On-demand | Registry-based |

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Commands not showing | Restart Claude Code, check plugin path |
| Jira connection fails | Verify env vars, test with curl |
| PR blocked by review | Run `/jira:review`, address findings |
| Hooks not triggering | `chmod +x hooks/scripts/*.sh` |

---

**License:** MIT | **Support:** See `docs/` | **Full Docs:** `docs/archive/README-v4-full.md`
