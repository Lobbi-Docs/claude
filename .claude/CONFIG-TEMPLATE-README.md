# Configuration Template Usage Guide

This directory contains generalized configuration templates that can be used to set up the Golden Armada orchestration system in any project.

## Files

### 1. `config.template.json`
The main configuration template with environment variable placeholders.

### 2. `.env.template` (in project root)
Environment variables template listing all required and optional configuration values.

## Quick Start

### For New Projects

1. **Copy the template files:**
   ```bash
   cp .claude/config.template.json .claude/config.json
   cp .env.template .env
   ```

2. **Edit `.env` with your project values:**
   ```bash
   # Required
   PROJECT_NAME=my-awesome-project
   GITHUB_ORG=my-github-org
   GITHUB_REPO=my-repo-name

   # LLM Keys
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=...

   # Optional (add as needed)
   JIRA_PROJECT_KEY=MYPROJ
   CONFLUENCE_SPACE_KEY=MYSPACE
   N8N_BASE_URL=https://your-instance.app.n8n.cloud
   ```

3. **Replace placeholders in `config.json`:**

   You can either:

   **Option A: Manual replacement**
   ```bash
   # Edit config.json and replace ${VARIABLE} with actual values
   ```

   **Option B: Use a script (recommended)**
   ```bash
   # Create a simple replacement script
   node scripts/expand-config.js
   ```

4. **Customize your configuration:**
   - Update agent categories in `agents.categories`
   - Modify agent registry in `agents.registry`
   - Configure MCP servers in `mcps.custom`
   - Adjust orchestration settings as needed

## Environment Variables Reference

### Core Project Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `${PROJECT_NAME}` | Your project identifier | `golden-armada`, `my-saas-app` |
| `${GITHUB_ORG}` | GitHub organization | `the-Lobbi`, `acme-corp` |
| `${GITHUB_REPO}` | GitHub repository name | `tools-golden-armada`, `backend-api` |
| `${DOCKER_REGISTRY}` | Docker registry name | `golden-armada`, `ghcr.io/org` |
| `${K8S_NAMESPACE}` | Kubernetes namespace | `agents`, `production` |

### Integration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `${JIRA_URL}` | Jira instance URL | `https://mycompany.atlassian.net` |
| `${JIRA_PROJECT_KEY}` | Jira project key | `GA`, `PROJ`, `DEV` |
| `${JIRA_BOARD_ID}` | Jira board ID | `123` |
| `${CONFLUENCE_URL}` | Confluence instance URL | `https://mycompany.atlassian.net/wiki` |
| `${CONFLUENCE_SPACE_KEY}` | Confluence space key | `GA`, `DOCS`, `TEAM` |
| `${N8N_BASE_URL}` | n8n workflow automation URL | `https://my-instance.app.n8n.cloud` |

## Customization Guide

### 1. Agent Categories

Update the `agents.categories` array to match your project needs:

```json
{
  "agents": {
    "categories": [
      "core",
      "my-domain",           // Add your domain
      "my-feature-area",     // Add specific feature areas
      // ... keep or remove others as needed
    ]
  }
}
```

### 2. Agent Registry

Add your domain-specific agents:

```json
{
  "agents": {
    "registry": {
      "my-domain": [
        "my-custom-agent",
        "my-specialized-agent"
      ]
    }
  }
}
```

### 3. MCP Servers

Configure custom MCP servers:

```json
{
  "mcps": {
    "custom": {
      "my-custom-mcp": {
        "enabled": true,
        "type": "http",
        "url": "${MY_MCP_URL}",
        "priority": "medium",
        "autoActivate": false
      }
    }
  }
}
```

### 4. Skills

Add or remove skills based on your stack:

```json
{
  "skills": {
    "registry": [
      "kubernetes",
      "my-custom-skill",
      // ... add your skills
    ]
  }
}
```

## Script: Expand Configuration

Create `scripts/expand-config.js` to automatically replace environment variables:

```javascript
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const templatePath = path.join(__dirname, '../.claude/config.template.json');
const outputPath = path.join(__dirname, '../.claude/config.json');

let config = fs.readFileSync(templatePath, 'utf8');

// Replace all ${VAR} with process.env.VAR
config = config.replace(/\$\{(\w+)\}/g, (match, varName) => {
  return process.env[varName] || match;
});

fs.writeFileSync(outputPath, config);
console.log('✅ Configuration expanded successfully!');
```

Run with:
```bash
node scripts/expand-config.js
```

## Best Practices

### Security
- **Never commit `.env` or `config.json` with secrets** - Add to `.gitignore`
- **Always commit `config.template.json`** - Safe for version control
- Use environment variables for all sensitive data

### Portability
- Keep project-specific values in `.env`
- Use the template for shared structure
- Document custom variables in your project README

### Maintenance
- Update the template when adding new features
- Version your template changes
- Share template updates across projects

## Example Projects

### SaaS Application
```bash
PROJECT_NAME=my-saas-app
GITHUB_ORG=my-company
GITHUB_REPO=saas-backend
DOCKER_REGISTRY=ghcr.io/my-company
K8S_NAMESPACE=production
```

### Internal Tool
```bash
PROJECT_NAME=internal-dashboard
GITHUB_ORG=my-company
GITHUB_REPO=tools-dashboard
DOCKER_REGISTRY=my-company
K8S_NAMESPACE=tools
```

### Open Source Project
```bash
PROJECT_NAME=awesome-lib
GITHUB_ORG=awesome-org
GITHUB_REPO=awesome-lib
DOCKER_REGISTRY=docker.io/awesome-org
K8S_NAMESPACE=awesome-lib
```

## Troubleshooting

### Issue: Environment variables not expanding
**Solution:** Make sure `.env` is in project root and you're using `dotenv` or similar

### Issue: Config validation errors
**Solution:** Check JSON syntax and ensure all required fields are present

### Issue: MCP servers not connecting
**Solution:** Verify URLs and credentials in `.env`

## Migration from Existing Config

If you have an existing `config.json`:

1. Compare with `config.template.json`
2. Extract project-specific values to `.env`
3. Replace values with `${VARIABLE}` syntax
4. Test with the expand script

## Support

For questions or issues:
- Check `.claude/docs/` for detailed documentation
- Review example configurations in other projects
- Consult the orchestration system documentation

---

**Template Version:** 4.0.0
**Last Updated:** 2025-12-12
**Maintained by:** Golden Armada Team
