# Golden Armada - Claude Code Plugin

**Enterprise Multi-Agent Orchestration System for Professional Software Development**

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/markus41/claude)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Agents](https://img.shields.io/badge/agents-101-orange.svg)](.claude/agents)
[![Skills](https://img.shields.io/badge/skills-31-purple.svg)](.claude/skills)

## Quick Start

### Installation

```bash
# From GitHub
/plugin install markus41/claude

# Or add as marketplace first
/plugin marketplace add markus41/claude
/plugin install golden-armada
```

### Verify Installation

```bash
/status
```

## What's Included

| Resource | Count | Description |
|----------|-------|-------------|
| **Agents** | 101 | Specialized AI agents across 24 categories |
| **Skills** | 31 | Auto-activated capabilities (kubernetes, docker, stripe, etc.) |
| **Commands** | 44 | Slash commands for common operations |
| **Workflows** | 21 | Pre-built multi-agent workflows |
| **Hooks** | 21 | Lifecycle automation and enforcement |

## Core Features

### Mandatory Orchestration Protocol

Every complex task follows the 6-phase protocol:

```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

- **Minimum**: 3 sub-agents per task
- **Maximum**: 13 sub-agents per task
- **Default**: 5 sub-agents

### Agent Categories

#### Core Agents
- `coder` - Code generation and implementation
- `tester` - Test creation and execution
- `reviewer` - Code review and feedback
- `planner` - Task planning and breakdown
- `debugger` - Issue diagnosis and fixing
- `researcher` - Codebase exploration and analysis

#### Lobbi Platform Agents
- **Multi-Tenant**: `multi-tenant-architect`, `tenant-provisioning-specialist`
- **Stripe Payment**: `stripe-integration-specialist`, `subscription-lifecycle-manager`, `invoice-manager`
- **Frontend Theming**: `theme-system-architect`, `theme-builder`, `white-label-specialist`
- **Selenium Testing**: `selenium-test-architect`, `auth-flow-tester`, `member-journey-tester`
- **Membership**: `membership-specialist`, `member-engagement-agent`, `membership-analytics-agent`, `directory-manager`

#### Infrastructure Agents
- **Keycloak**: `keycloak-realm-admin`, `keycloak-theme-developer`, `keycloak-identity-specialist`
- **MongoDB Atlas**: `mongodb-atlas-admin`, `mongodb-schema-designer`, `mongodb-query-optimizer`
- **Kubernetes**: `k8s-architect`, `k8s-debugger`, `k8s-security-specialist`
- **Helm**: `helm-chart-developer`, `helm-values-manager`, `helm-release-manager`

### Key Commands

```bash
# Development
/test          # Run test suite
/review        # AI code review
/deploy        # Deploy application
/debug         # Debug issues

# Project Management
/jira-create   # Create Jira issue
/sprint-plan   # Plan sprint
/standup       # Generate standup report

# Security
/security-scan # Security audit
/compliance-audit # Compliance check

# Documentation
/update-documentation # Sync docs to Obsidian
```

### Skills (Auto-Activated)

Skills activate automatically based on file context:

| Trigger | Skill |
|---------|-------|
| `*.yaml`, `Chart.yaml` | kubernetes, helm |
| `Dockerfile` | docker |
| `*.prisma` | database, multi-tenant |
| `stripe/*` | stripe-payments |
| `keycloak/*` | keycloak |
| `*.test.ts` | testing |

## Configuration

### Override Settings

Create `.claude/settings.local.json`:

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
    "obsidianVaultPath": "/path/to/your/vault"
  }
}
```

### Model Assignment

| Model | Use For |
|-------|---------|
| **opus** | Strategic planning, complex architecture |
| **sonnet** | Development, analysis, coordination (default) |
| **haiku** | Documentation, simple tasks, fast operations |

## Registry System

The plugin uses a registry-first architecture with lazy loading:

```
.claude/registry/
├── index.json           # Master registry
├── agents.index.json    # Agent metadata
├── skills.index.json    # Skill metadata
├── commands.index.json  # Command metadata
├── workflows.index.json # Workflow metadata
└── search/
    └── keywords.json    # Unified keyword index
```

### Quick Lookup

```bash
# Find agents by task
byTask: {
  "deploy": ["k8s-deployer", "docker-builder", "helm-specialist"],
  "review": ["reviewer", "security-auditor", "code-analyzer"],
  "test": ["tester", "e2e-tester", "qa-engineer"]
}
```

## Obsidian Integration

Documentation automatically syncs to your Obsidian vault:

```
Obsidian Vault/
├── Repositories/{org}/{repo}.md
├── Research/
├── Projects/
└── System/Claude-Instructions/
```

Configure your vault path in settings:

```json
{
  "documentation": {
    "obsidianVaultPath": "C:\\Users\\YourName\\obsidian"
  }
}
```

## Hooks

### Available Hooks

| Hook | Purpose |
|------|---------|
| `orchestration-protocol-enforcer.sh` | Enforce 6-phase protocol |
| `enforce-subagent-usage.sh` | Ensure sub-agent usage |
| `context-management-hook.sh` | Token budget management |
| `obsidian-documentation-sync.sh` | Auto-sync to Obsidian |
| `tenant-isolation-validator.sh` | Validate org_id filtering |
| `stripe-webhook-security.sh` | Validate Stripe webhooks |

## Requirements

- **Claude Code**: v1.0.0+
- **MCP Servers** (recommended):
  - `context7` (mandatory for library docs)
  - `github`
  - `obsidian`

## License

MIT License - See [LICENSE](LICENSE) for details.

## Support

- [Documentation](https://github.com/markus41/claude#readme)
- [Issues](https://github.com/markus41/claude/issues)
- [Discussions](https://github.com/markus41/claude/discussions)
