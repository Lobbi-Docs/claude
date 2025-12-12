# Claude Orchestration Plugin

A portable, professional-grade multi-LLM agent coordination system for Claude Code. This plugin provides a comprehensive framework for orchestrating multiple AI agents with mandatory protocols, registry-based resource management, and production-ready DevOps workflows.

## Features

- **Multi-Agent Orchestration**: Coordinate 3-13 specialized agents per task
- **Mandatory 6-Phase Protocol**: EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT
- **Registry-Based Architecture**: Lazy-loaded agents, skills, commands, and workflows
- **Context Management**: Automatic token budget enforcement and checkpointing
- **Production-Ready**: DevOps workflows for Docker, Kubernetes, Helm, CI/CD
- **Extensible**: Easy to add project-specific agents, skills, and hooks
- **Framework Agnostic**: Works with any tech stack (Python, Node.js, Go, etc.)
- **Multi-LLM Support**: Claude, GPT, Gemini, and Ollama integration

## Quick Start

### 1. Installation

Clone or copy this `.claude` directory structure into your project:

```bash
# Option 1: Clone as a template
git clone https://github.com/your-org/claude-orchestration.git .claude

# Option 2: Copy from existing project
cp -r /path/to/claude-orchestration/.claude /path/to/your/project/.claude
cp -r /path/to/claude-orchestration/.claude-plugin /path/to/your/project/.claude-plugin
```

### 2. Configuration

Update the plugin metadata in `.claude-plugin/plugin.json`:

```json
{
  "name": "your-project-orchestration",
  "author": {
    "name": "Your Organization",
    "email": "contact@yourorg.com",
    "url": "https://github.com/your-org/your-repo"
  },
  "homepage": "https://github.com/your-org/your-repo",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/your-repo"
  }
}
```

### 3. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
# Project Configuration
export PROJECT_NAME="my-app"
export PROJECT_ROOT="/path/to/project"
export GIT_BRANCH="main"

# Obsidian Documentation (optional but recommended)
export OBSIDIAN_VAULT_PATH="/path/to/obsidian"

# LLM API Keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."  # Optional
export GOOGLE_API_KEY="..."     # Optional

# Infrastructure (if applicable)
export DOCKER_REGISTRY="ghcr.io/your-org"
export HELM_RELEASE_NAME="${PROJECT_NAME}"
export K8S_NAMESPACE="${PROJECT_NAME}-prod"
```

### 4. Customize for Your Project

Edit `.claude/registry/agents.index.json` to add project-specific agents:

```json
{
  "agents": {
    "project-specific": {
      "your-custom-agent": {
        "path": "agents/project-specific/your-custom-agent.md",
        "type": "developer",
        "model": "sonnet",
        "keywords": ["custom", "feature", "domain"],
        "capabilities": ["custom_logic", "domain_expertise"],
        "priority": "high"
      }
    }
  }
}
```

## Architecture

### Directory Structure

```
.claude/
├── CLAUDE.md                       # Main entry point (ultra-minimal)
├── PLUGIN-README.md                # This file
├── README.md                       # Orchestration system docs
├── registry/                       # Resource indexes
│   ├── agents.index.json          # Agent metadata
│   ├── skills.index.json          # Skill metadata
│   ├── commands.index.json        # Command metadata
│   ├── workflows.index.json       # Workflow metadata
│   └── search/
│       └── keywords.json          # Unified keyword mapping
├── agents/                         # Agent definitions
│   ├── core/                      # Core agents (coder, tester, etc.)
│   ├── devops/                    # DevOps agents
│   ├── development/               # Development agents
│   └── [add-your-categories]/     # Project-specific agents
├── skills/                         # Skill definitions (SKILL.md format)
│   ├── infrastructure/
│   ├── development/
│   └── [add-your-categories]/
├── commands/                       # Slash commands
├── workflows/                      # Workflow templates
├── hooks/                          # Lifecycle hooks
│   ├── pre-task.sh
│   ├── post-task.sh
│   ├── enforce-subagent-usage.sh
│   └── context-management-hook.sh
├── orchestration/                  # Orchestration system
│   ├── cli.sh                     # CLI interface
│   └── db/                        # SQLite database
└── docs/                           # Implementation guides

.claude-plugin/
└── plugin.json                     # Plugin metadata
```

### Core Components

#### 1. Agents

Agents are specialized AI workers focused on specific tasks. The system includes 60+ generic agents across categories:

- **Core**: coder, tester, reviewer, planner, debugger, researcher
- **DevOps**: CI/CD engineers, Kubernetes specialists, Docker builders
- **Development**: Backend/frontend developers, API designers, database specialists
- **Testing**: QA engineers, E2E testers, load testers
- **Documentation**: Technical writers, API documenters
- **Orchestration**: Coordinators for hierarchical, mesh, and adaptive topologies

**Add your own agents** by creating markdown files in `.claude/agents/your-category/` and updating `agents.index.json`.

#### 2. Skills

Skills provide domain expertise that agents can activate based on context. Includes 23+ generic skills:

- **Infrastructure**: Kubernetes, Helm, Docker, Terraform
- **Development**: Flask, FastAPI, Git workflows, Testing
- **Cloud**: AWS, GCP
- **Data**: SQL databases, Redis, Vector databases
- **Frontend**: React, Next.js

**Add project-specific skills** as `SKILL.md` files in `.claude/skills/your-category/`.

#### 3. Orchestration Protocol

The system enforces a mandatory 6-phase protocol:

```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

- Minimum 3 sub-agents per task
- Maximum 13 sub-agents per task
- Testing is REQUIRED before completion
- Documentation is REQUIRED (stored in Obsidian vault if configured)

#### 4. Registry System

All resources are indexed in JSON files for lazy loading:

- **agents.index.json**: Agent metadata, keywords, capabilities
- **skills.index.json**: Skill triggers, dependencies, auto-activation
- **commands.index.json**: Slash command registry
- **workflows.index.json**: Workflow templates
- **keywords.json**: Unified keyword mapping for smart activation

#### 5. Context Management

Automatic token budget enforcement:

- **Budget**: 100,000 tokens
- **Warning**: 75% (75K tokens)
- **Critical**: 90% (90K tokens)
- **Auto-checkpoint**: Enabled at phase completion
- **Auto-compress**: Triggered at 75% usage

## Customization Guide

### Adding Project-Specific Agents

1. Create agent definition in `.claude/agents/your-category/your-agent.md`:

```markdown
---
name: your-custom-agent
description: Specialized agent for [your domain]
model: sonnet
color: blue
when_to_use: Use this agent when [specific conditions]
---

# Your Custom Agent

You are a specialized agent for [domain]. Your responsibilities include:

- [Responsibility 1]
- [Responsibility 2]

## Capabilities

- [Capability 1]
- [Capability 2]

## When to Use

Use this agent when:
- [Condition 1]
- [Condition 2]

## MCP Tools

This agent has access to:
- [Tool 1]
- [Tool 2]
```

2. Add to `.claude/registry/agents.index.json`:

```json
{
  "agents": {
    "your-category": {
      "your-custom-agent": {
        "path": "agents/your-category/your-agent.md",
        "type": "developer",
        "model": "sonnet",
        "keywords": ["domain", "feature", "specialty"],
        "capabilities": ["domain_expertise", "specialized_task"],
        "priority": "high"
      }
    }
  }
}
```

### Adding Project-Specific Skills

1. Create skill in `.claude/skills/your-category/SKILL.md`:

```markdown
---
name: your-skill
description: |
  Expertise in [domain]. Activate when working with [technologies/patterns].

  Triggers: keyword1, keyword2, keyword3

  This skill provides:
  - [Expertise 1]
  - [Expertise 2]
---

# Your Skill

[Detailed skill knowledge and best practices]
```

2. Add to `.claude/registry/skills.index.json`:

```json
{
  "skills": {
    "your-category": {
      "your-skill": {
        "path": "skills/your-category/SKILL.md",
        "triggers": ["keyword1", "keyword2", "framework-name"],
        "activationScore": 0,
        "dependencies": [],
        "conflicts": [],
        "autoActivate": true
      }
    }
  }
}
```

### Adding Custom Hooks

Create hooks in `.claude/hooks/` for lifecycle events:

```bash
#!/bin/bash
# .claude/hooks/your-custom-hook.sh

# Example: Validate domain-specific requirements
echo "Running custom validation..."

# Your validation logic here
```

Common hook types:
- `pre-task.sh`: Before any task starts
- `post-task.sh`: After task completion
- `post-edit.sh`: After file edits
- `session-start.sh`: At session initialization

### Removing Platform-Specific Content

This template is generic. To adapt to your project:

1. **Remove unused agents**: Delete agent folders and entries in `agents.index.json`
2. **Remove unused skills**: Delete skill folders and entries in `skills.index.json`
3. **Remove unused hooks**: Delete hook files that don't apply to your domain
4. **Update categories**: Modify `agentCategories` in `.claude-plugin/plugin.json`

## Integration with Obsidian (Optional)

For advanced documentation management:

1. Set `OBSIDIAN_VAULT_PATH` environment variable
2. Create documentation structure in Obsidian:

```
${OBSIDIAN_VAULT_PATH}/
├── Repositories/
│   └── your-org/
│       └── your-repo.md
├── Research/
├── Projects/
└── System/
    └── Claude-Instructions/
        ├── Orchestration-Protocol.md
        ├── MCP-Servers.md
        ├── Agent-Categories.md
        └── Workflows.md
```

3. Documentation is auto-synced via `obsidian-documentation-sync` hook

## MCP Server Configuration

Configure MCP servers in Claude Code settings for enhanced capabilities:

### Required
- **context7**: Library documentation (MANDATORY for code assistance)

### Recommended
- **github**: Repository operations, PR management
- **obsidian**: Documentation vault integration

### Optional (by project type)
- **supabase**: Database, migrations, types
- **vercel**: Deployment automation
- **upstash**: Redis cache, queue management
- **playwright**: Browser automation, E2E testing
- **atlassian**: Jira/Confluence integration

## Usage Examples

### Example 1: Implement New Feature

```
User: Implement user authentication with JWT tokens

Claude orchestrates:
1. EXPLORE (researcher + system-architect): Research auth patterns, design system
2. PLAN (planner + security-auditor): Create implementation plan, security review
3. CODE (backend-dev + security-specialist): Implement auth logic
4. TEST (tester + security-auditor): Write tests, security validation
5. FIX (debugger): Address any issues
6. DOCUMENT (docs-writer): Create API documentation
```

### Example 2: Deploy to Kubernetes

```
User: Deploy the application to Kubernetes with Helm

Claude orchestrates:
1. EXPLORE (k8s-architect + helm-specialist): Review cluster, analyze requirements
2. PLAN (planner + devops): Design deployment strategy
3. CODE (helm-chart-developer + k8s-deployer): Create/update Helm charts
4. TEST (qa-engineer): Validate deployment in staging
5. FIX (k8s-debugger): Resolve any deployment issues
6. DOCUMENT (docs-writer): Update deployment documentation
```

### Example 3: Fix Production Bug

```
User: Critical bug in payment processing - investigate and fix

Claude orchestrates:
1. EXPLORE (debugger + researcher): Analyze logs, reproduce issue
2. PLAN (incident-responder + planner): Triage, create fix strategy
3. CODE (coder + security-specialist): Implement fix with security review
4. TEST (tester + qa-engineer): Comprehensive testing
5. FIX (debugger): Address any regression
6. DOCUMENT (docs-writer + runbook-writer): Post-mortem, runbook update
```

## Best Practices

### DO:
- ✅ Use 3-5 minimum sub-agents for complex tasks
- ✅ Follow the 6-phase protocol strictly
- ✅ Document everything (in Obsidian vault if configured)
- ✅ Verify work with tests before marking complete
- ✅ Use Context7 for library/framework documentation
- ✅ Add project-specific agents/skills as needed
- ✅ Keep registry indexes up to date

### DON'T:
- ❌ Skip the testing phase
- ❌ Work on complex tasks without spawning sub-agents
- ❌ Lose context between phases
- ❌ Declare "done" without running tests
- ❌ Keep outdated agents/skills in the registry
- ❌ Commit secrets or API keys

## Troubleshooting

### Issue: Agents not activating

**Solution**: Check `agents.index.json` for correct paths and keywords. Ensure the agent markdown file exists.

### Issue: Skills not loading

**Solution**: Verify `skills.index.json` has correct trigger keywords. Skills use the official `SKILL.md` format.

### Issue: Context budget exceeded

**Solution**: The system auto-checkpoints at 75%. Review `.claude/orchestration/db/agents.db` for history. Use context cleanup hooks.

### Issue: Hooks not executing

**Solution**: Ensure hooks are executable (`chmod +x .claude/hooks/*.sh`). Check hook paths in `.claude-plugin/plugin.json`.

### Issue: MCP tools not available

**Solution**: Configure MCP servers in Claude Code settings. Check `ANTHROPIC_API_KEY` and other environment variables.

## Advanced Configuration

### Custom Profiles

Create activation profiles in `.claude-plugin/plugin.json`:

```json
{
  "registry": {
    "activation": {
      "profiles": ["minimal", "standard", "full", "your-custom-profile"]
    }
  }
}
```

### Model Assignment Strategy

Configure default models for different agent types:

```json
{
  "orchestration": {
    "protocol": {
      "defaultModel": "sonnet"
    }
  }
}
```

Model usage:
- **opus**: Strategic planning, complex architecture (expensive, thorough)
- **sonnet**: Development, analysis, coordination (balanced)
- **haiku**: Documentation, simple tasks (fast, economical)

## Contributing

To add generic agents/skills that benefit all users:

1. Create agent/skill following the template format
2. Add entry to appropriate registry index
3. Update stats in registry files
4. Test in a real project
5. Submit PR with clear documentation

## License

MIT License - See LICENSE file for details

## Support

- **Documentation**: See `.claude/docs/` for implementation guides
- **Issues**: Report bugs via GitHub issues
- **Discussions**: Join community discussions for best practices

## Acknowledgments

Built on Claude Code's official plugin system with support for:
- Multi-agent orchestration patterns
- Registry-based resource management
- Context-aware skill activation
- Production-ready DevOps workflows
- Universal portability across projects

---

**Ready to orchestrate?** Start with `export PROJECT_NAME="your-app"` and customize the registries for your domain.
