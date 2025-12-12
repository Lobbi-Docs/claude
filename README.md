# Golden Armada

**Enterprise Multi-Agent Orchestration System for Claude Code**

[![Plugin Version](https://img.shields.io/badge/plugin-4.0.0-blue.svg)](.claude-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Agents](https://img.shields.io/badge/agents-101-orange.svg)](.claude/agents)
[![Skills](https://img.shields.io/badge/skills-31-purple.svg)](.claude/skills)
[![Commands](https://img.shields.io/badge/commands-44-red.svg)](.claude/commands)

Golden Armada is a comprehensive Claude Code marketplace plugin that provides **100+ specialized AI agents**, **31 auto-activated skills**, and **44 slash commands** with a **mandatory 6-phase orchestration protocol** for professional software development.

## Quick Install

```bash
# Install from GitHub
/plugin install markus41/claude

# Verify installation
/status
```

## What You Get

| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 101 | Specialized agents across 24 categories |
| **Skills** | 31 | Auto-activated based on file context |
| **Commands** | 44 | Slash commands for common operations |
| **Workflows** | 21 | Pre-built multi-agent workflows |
| **Hooks** | 21 | Lifecycle automation & enforcement |

## Orchestration Protocol

Every complex task follows the **mandatory 6-phase protocol**:

```
EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT
   2+       1-2     2-4    2-3    1-2      1-2
```

**Sub-Agent Limits:**
- Minimum: 3 agents
- Maximum: 13 agents
- Default: 5 agents

## Agent Categories

### Core Development
- `coder` - Code generation
- `tester` - Test creation & execution
- `reviewer` - Code review
- `planner` - Task breakdown
- `debugger` - Issue diagnosis
- `researcher` - Codebase exploration

### Lobbi Platform (Multi-Tenant SaaS)
| Category | Agents |
|----------|--------|
| **Multi-Tenant** | `multi-tenant-architect`, `tenant-provisioning-specialist` |
| **Stripe** | `stripe-integration-specialist`, `subscription-lifecycle-manager`, `invoice-manager` |
| **Theming** | `theme-system-architect`, `theme-builder`, `white-label-specialist` |
| **Testing** | `selenium-test-architect`, `auth-flow-tester`, `member-journey-tester` |
| **Membership** | `membership-specialist`, `member-engagement-agent`, `directory-manager` |

### Infrastructure
| Category | Agents |
|----------|--------|
| **Keycloak** | `keycloak-realm-admin`, `keycloak-theme-developer`, `keycloak-identity-specialist` |
| **MongoDB** | `mongodb-atlas-admin`, `mongodb-schema-designer`, `mongodb-query-optimizer` |
| **Kubernetes** | `k8s-architect`, `k8s-debugger`, `k8s-security-specialist` |
| **Helm** | `helm-chart-developer`, `helm-values-manager`, `helm-release-manager` |

## Key Commands

```bash
# Development
/test              # Run tests
/review            # AI code review
/deploy            # Deploy application
/debug             # Debug issues
/generate-tests    # Generate test suite

# Project Management
/jira-create       # Create Jira issue
/sprint-plan       # Plan sprint
/standup           # Generate standup
/retro             # Sprint retrospective

# DevOps
/helm-deploy       # Helm deployment
/k8s-debug         # Kubernetes debugging
/security-scan     # Security audit

# Multi-Tenant
/tenant-provision  # Provision new tenant
/member-import     # Bulk member import
/subscription-manage # Manage subscriptions
```

## Skills (Auto-Activated)

Skills activate automatically based on context:

| File Pattern | Activates |
|--------------|-----------|
| `*.yaml`, `Chart.yaml` | kubernetes, helm |
| `Dockerfile` | docker |
| `*.prisma` | database, multi-tenant |
| `stripe/**` | stripe-payments |
| `keycloak/**` | keycloak |
| `*.test.ts` | testing |
| `*.tsx`, `*.jsx` | react, nextjs |

## Project Structure

```
.
├── .claude-plugin/           # Plugin manifest
│   ├── plugin.json          # Main manifest
│   ├── marketplace.json     # Marketplace listing
│   └── README.md            # Plugin docs
│
├── .claude/                  # Plugin resources
│   ├── agents/              # 101 agents by category
│   ├── skills/              # 31 skills with SKILL.md
│   ├── commands/            # 44 slash commands
│   ├── workflows/           # 21 workflows
│   ├── hooks/               # 21 lifecycle hooks
│   ├── registry/            # Resource indexes
│   ├── orchestration/       # Orchestration system
│   ├── templates/           # Resource templates
│   └── tools/               # Custom tools
│
├── assets/                   # Plugin assets
└── README.md                # This file
```

## Configuration

Create `.claude/settings.local.json` to override defaults:

```json
{
  "orchestration": {
    "minSubAgents": 5,
    "defaultModel": "sonnet"
  },
  "contextManagement": {
    "tokenBudget": 150000
  },
  "documentation": {
    "obsidianVaultPath": "/path/to/obsidian"
  }
}
```

## Model Assignment

| Model | Best For |
|-------|----------|
| **opus** | Strategic planning, complex architecture |
| **sonnet** | Development, analysis (default) |
| **haiku** | Documentation, simple tasks |

## MCP Integrations

| MCP | Purpose |
|-----|---------|
| `context7` | Library documentation (mandatory) |
| `github` | Repository management |
| `obsidian` | Documentation vault |
| `supabase` | Database operations |
| `vercel` | Deployment |
| `playwright` | Browser automation |
| `atlassian` | Jira/Confluence |

## Requirements

- Claude Code v1.0.0+
- Node.js 20+ (for hooks)
- Python 3.11+ (for orchestration)

## Documentation

- [Plugin Guide](.claude-plugin/README.md)
- [Orchestration Protocol](.claude/orchestration/PROTOCOL.md)
- [Agent Development](.claude/docs/AGENT_ACTIVITY_TRACKING.md)
- [Context Management](.claude/docs/CONTEXT-REDUCTION-GUIDE.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your agent/skill/command
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | [Documentation](https://github.com/markus41/claude#readme) | [Issues](https://github.com/markus41/claude/issues)
