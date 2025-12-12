# Configuration Template - Quick Start Guide

This is a 5-minute setup guide for using the Golden Armada configuration template in a new project.

## Prerequisites

- Node.js installed (for the expansion script)
- Git repository initialized
- Claude Code CLI installed

## Setup Steps

### 1. Copy Template Files (30 seconds)

```bash
# From your project root
cp .claude/config.template.json .claude/config.json
cp .env.template .env
```

### 2. Configure Core Variables (2 minutes)

Edit `.env` and set these **required** values:

```bash
# Project basics
PROJECT_NAME=your-project-name          # e.g., "my-saas-app"
GITHUB_ORG=your-github-org              # e.g., "acme-corp"
GITHUB_REPO=your-repo-name              # e.g., "backend-api"

# Docker/K8s (if using containerization)
DOCKER_REGISTRY=your-registry           # e.g., "ghcr.io/acme-corp"
K8S_NAMESPACE=your-namespace            # e.g., "production"

# LLM API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...            # For Claude agents
# OPENAI_API_KEY=sk-...                 # Optional: For GPT agents
# GOOGLE_API_KEY=...                    # Optional: For Gemini agents
```

### 3. Expand Configuration (30 seconds)

```bash
# Install if needed
npm install dotenv

# Expand the template
node scripts/expand-config.js

# Or preview first
node scripts/expand-config.js --dry-run
```

### 4. Verify Setup (1 minute)

```bash
# Validate environment variables
node scripts/expand-config.js --validate

# Check generated config
cat .claude/config.json | head -20
```

### 5. Customize (Optional, 1-2 minutes)

Edit `.claude/config.json` to:

- Add domain-specific agents to `agents.registry`
- Enable/disable MCP servers in `mcps.builtin` and `mcps.custom`
- Adjust orchestration settings in `orchestration.protocol`
- Configure workflows in `workflows.list`

## Verification Checklist

After setup, verify these files exist and are correct:

```bash
✅ .claude/config.json         # Generated from template
✅ .env                        # Your environment variables
✅ .gitignore                  # Excludes .env and config.json
✅ scripts/expand-config.js    # Configuration expander
```

## Common Configurations

### Minimal Setup (Just Claude)

```bash
# .env
PROJECT_NAME=my-project
GITHUB_ORG=my-org
GITHUB_REPO=my-repo
ANTHROPIC_API_KEY=sk-ant-...
```

### Full Stack with Atlassian

```bash
# .env
PROJECT_NAME=my-saas-app
GITHUB_ORG=acme-corp
GITHUB_REPO=saas-backend
DOCKER_REGISTRY=ghcr.io/acme-corp
K8S_NAMESPACE=production

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

JIRA_URL=https://acme.atlassian.net
JIRA_PROJECT_KEY=SAAS
JIRA_BOARD_ID=123
CONFLUENCE_URL=https://acme.atlassian.net/wiki
CONFLUENCE_SPACE_KEY=SAAS
```

### With n8n Workflows

```bash
# .env
PROJECT_NAME=automation-hub
N8N_BASE_URL=https://acme.app.n8n.cloud
ANTHROPIC_API_KEY=sk-ant-...
```

## Next Steps

1. **Test orchestration:**
   ```bash
   .claude/orchestration/cli.sh status
   ```

2. **Try a simple task:**
   ```bash
   # Use Claude Code to run a task
   # The orchestration system will automatically use your config
   ```

3. **Add custom agents:**
   - Create agent files in `.claude/agents/`
   - Update `.claude/registry/agents.index.json`
   - Reference in `config.json`

4. **Configure MCP servers:**
   - Edit MCP config files in `.claude/mcp/`
   - Update URLs and credentials in `.env`

## Troubleshooting

### "Template not found"
**Solution:** Make sure you're in the project root directory

### "Missing environment variables"
**Solution:** Check `.env` file has all required variables from `.env.template`

### "Invalid JSON generated"
**Solution:** Run with `--validate` to find missing variables:
```bash
node scripts/expand-config.js --validate
```

### "MCP connection failed"
**Solution:** Verify MCP URLs and credentials in `.env`

## Environment Variable Priority

The configuration system uses this priority order:

1. **System environment variables** (highest priority)
2. **`.env` file** (local development)
3. **Default values** (in template)

You can override any `.env` value by setting it in your system environment.

## Security Notes

⚠️ **NEVER commit these files:**
- `.env` - Contains secrets
- `.claude/config.json` - May contain expanded secrets

✅ **ALWAYS commit these files:**
- `.env.template` - Safe template
- `.claude/config.template.json` - Safe template
- `scripts/expand-config.js` - Expansion script

## Getting Help

- **Full documentation:** `.claude/CONFIG-TEMPLATE-README.md`
- **Template reference:** `.claude/config.template.json`
- **Environment reference:** `.env.template`

---

**Estimated Setup Time:** 5 minutes
**Template Version:** 4.0.0
**Last Updated:** 2025-12-12
