# MCP Servers Configuration

This directory contains Model Context Protocol (MCP) server configurations that enable Claude Code to interact with external services and documentation systems.

## Overview

| MCP Server | Status | Purpose |
|-----------|--------|---------|
| **Obsidian** | Portable | Centralized documentation, ADRs, research notes |
| **Atlassian (Jira/Confluence)** | Portable | Project management and team documentation |

## Environment Variables

All MCP configurations now use environment variables for portability. Set these variables before using the services.

### Obsidian Configuration

**Required Variables:**
- `OBSIDIAN_VAULT_PATH` - Path to your Obsidian vault directory
  - This should point to the root directory of your Obsidian vault

**Optional Variables:**
- `OBSIDIAN_REST_API_PORT` - Port for Obsidian REST API (default: 27124)
- `OBSIDIAN_API_KEY` - API key for REST API authentication (if required)

### Jira Configuration

**Required Variables:**
- `JIRA_URL` - Base URL of your Jira instance (e.g., https://your-domain.atlassian.net)
- `JIRA_EMAIL` - Email address for Jira authentication
- `JIRA_API_TOKEN` - API token (generate from id.atlassian.com/manage-profile/security/api-tokens)

**Optional Variables:**
- `JIRA_PROJECT_KEY` - Default project key for operations (default: GA)
- `JIRA_BOARD_ID` - Board ID for sprint operations

### Confluence Configuration

**Required Variables:**
- `CONFLUENCE_URL` - Base URL of your Confluence instance (e.g., https://your-domain.atlassian.net/wiki)
- `CONFLUENCE_EMAIL` - Email address for Confluence authentication
- `CONFLUENCE_API_TOKEN` - API token (same token as Jira)

**Optional Variables:**
- `CONFLUENCE_SPACE_KEY` - Default space key for operations (default: GA)

## Configuration Files

| File | Purpose |
|------|---------|
| obsidian-mcp.json | Obsidian vault integration |
| atlassian-mcp.json | Jira and Confluence integration |

## Available Tools

### Obsidian Tools
- list_files_in_vault, get_file_contents, simple_search, append_content, patch_content, etc.

### Jira Tools
- jira_create_issue, jira_get_issue, jira_update_issue, jira_transition_issue, jira_search, jira_add_comment, jira_get_sprint, jira_move_to_sprint

### Confluence Tools
- confluence_create_page, confluence_get_page, confluence_update_page, confluence_search, confluence_add_labels, confluence_get_space, confluence_list_pages

## Environment Variable Syntax

The JSON configuration files use this syntax:
- ${VARIABLE_NAME} - Required environment variable
- ${VARIABLE_NAME:-default} - Environment variable with default fallback

Example:
```json
"env": {
  "JIRA_PROJECT_KEY": "${JIRA_PROJECT_KEY:-GA}",
  "OBSIDIAN_VAULT_PATH": "${OBSIDIAN_VAULT_PATH}"
}
```

## Enabling/Disabling MCP Servers

Update .claude/settings.json to enable or disable specific servers:
```json
{
  "mcpServers": {
    "obsidian": { "disabled": false },
    "jira": { "disabled": false },
    "confluence": { "disabled": false }
  }
}
```

## Testing Your Configuration

### Test Jira Connection
```bash
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" "$JIRA_URL/rest/api/3/myself" | jq '.displayName'
```

### Test Confluence Connection
```bash
curl -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" "$CONFLUENCE_URL/rest/api/space/$CONFLUENCE_SPACE_KEY" | jq '.name'
```

## Security Best Practices

1. Never commit .env files - Use .gitignore
2. Store tokens securely in environment variables, not config files
3. Rotate API tokens regularly
4. Use minimal permissions when creating API tokens
5. Audit access logs periodically

## Resources

- MCP Specification: https://modelcontextprotocol.io/
- Jira Cloud REST API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Confluence Cloud REST API: https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
- Atlassian API Tokens: https://id.atlassian.com/manage-profile/security/api-tokens

## Next Steps

1. Set required environment variables for your services
2. Test connections using provided test commands
3. Configure which MCP servers to enable in .claude/settings.json
4. Start using MCP tools in Claude Code workflows
