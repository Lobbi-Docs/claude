# Atlassian MCP Server Setup

This directory contains configuration for Model Context Protocol (MCP) servers that enable Claude Code to interact with Jira and Confluence.

## Prerequisites

1. **Node.js 18+** - Required for MCP server execution
2. **Atlassian API Token** - Generate from [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)

## Environment Variables

Set these environment variables before using the MCP servers:

\`\`\`bash
# Jira Configuration
export JIRA_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_PROJECT_KEY="GA"  # Default project key
export JIRA_BOARD_ID="1"      # Board ID for sprints

# Confluence Configuration
export CONFLUENCE_URL="https://your-domain.atlassian.net/wiki"
export CONFLUENCE_EMAIL="your-email@example.com"
export CONFLUENCE_API_TOKEN="your-api-token"
export CONFLUENCE_SPACE_KEY="GA"  # Default space key
\`\`\`

## MCP Server Options

### Option 1: Use Community MCP Servers (Recommended)

Check the [MCP Server Registry](https://github.com/modelcontextprotocol/servers) for available Atlassian integrations:

\`\`\`json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-atlassian"],
      "env": {
        "ATLASSIAN_URL": "${JIRA_URL}",
        "ATLASSIAN_EMAIL": "${JIRA_EMAIL}",
        "ATLASSIAN_API_TOKEN": "${JIRA_API_TOKEN}"
      }
    }
  }
}
\`\`\`

### Option 2: Custom MCP Server Implementation

Create custom MCP servers using the schema defined in `atlassian-mcp.json`:

1. Install dependencies:
   \`\`\`bash
   npm init -y
   npm install @modelcontextprotocol/sdk node-fetch
   \`\`\`

2. Create `jira-server.js` and `confluence-server.js` implementing the tool schemas

3. Update `.claude/settings.json` with your server paths

## Configuration Files

| File | Purpose |
|------|---------|
| `atlassian-mcp.json` | Tool schemas and capability definitions |
| `jira-server.js` | Jira MCP server implementation (create this) |
| `confluence-server.js` | Confluence MCP server implementation (create this) |

## Available Tools

### Jira Tools
- `jira_create_issue` - Create new issues
- `jira_get_issue` - Fetch issue details
- `jira_update_issue` - Update existing issues
- `jira_transition_issue` - Move issues through workflow
- `jira_search` - Search with JQL
- `jira_add_comment` - Add comments
- `jira_get_sprint` - Get sprint info
- `jira_move_to_sprint` - Move issues to sprint

### Confluence Tools
- `confluence_create_page` - Create new pages
- `confluence_get_page` - Fetch page content
- `confluence_update_page` - Update pages
- `confluence_search` - Search with CQL
- `confluence_add_labels` - Add labels to pages
- `confluence_get_space` - Get space info
- `confluence_list_pages` - List pages in space

## Testing

Test your configuration:

\`\`\`bash
# Test Jira connection
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/myself" | jq '.displayName'

# Test Confluence connection
curl -s -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" \
  "$CONFLUENCE_URL/rest/api/space/$CONFLUENCE_SPACE_KEY" | jq '.name'
\`\`\`

## Troubleshooting

1. **Authentication errors**: Verify API token is valid and not expired
2. **Permission errors**: Ensure user has appropriate Jira/Confluence permissions
3. **Rate limiting**: Atlassian Cloud has rate limits; implement retry logic
4. **Network issues**: Check firewall/proxy settings for Atlassian Cloud access

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Confluence Cloud REST API](https://developer.atlassian.com/cloud/confluence/rest/v2/intro/)
- [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
