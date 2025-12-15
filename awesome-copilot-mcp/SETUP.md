# Setup Guide for Awesome Copilot MCP Server

This guide will help you set up the Awesome Copilot MCP server for use with VS Code and GitHub Copilot.

## Prerequisites

- Node.js 20.0.0 or higher
- VS Code with GitHub Copilot extension
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
cd awesome-copilot-mcp
npm install
```

### 2. Build the Project

```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `dist/` directory.

### 3. Configure VS Code Settings

You need to add the MCP server configuration to your VS Code settings. You have two options:

#### Option A: Workspace Settings (Recommended for this project)

Create or edit `.vscode/settings.json` in your workspace root:

```json
{
  "github.copilot.chat.mcpServers": {
    "awesome-copilot": {
      "command": "node",
      "args": [
        "${workspaceFolder}/awesome-copilot-mcp/dist/index.js"
      ]
    }
  }
}
```

#### Option B: User Settings (Global)

1. Open VS Code Settings (File > Preferences > Settings or `Ctrl+,`)
2. Search for "mcp servers"
3. Click "Edit in settings.json"
4. Add the configuration:

```json
{
  "github.copilot.chat.mcpServers": {
    "awesome-copilot": {
      "command": "node",
      "args": [
        "C:/Users/YourUsername/path/to/awesome-copilot-mcp/dist/index.js"
      ]
    }
  }
}
```

**Note**: Replace the path with the actual absolute path to your `dist/index.js` file.

### 4. Restart VS Code

After configuring the MCP server, restart VS Code to ensure the changes take effect.

### 5. Verify Installation

1. Open the GitHub Copilot Chat panel
2. Check if the MCP tools are available by looking at the tools list
3. Try using the custom agent: Select "Awesome Copilot Assistant" from the agents dropdown

## Using the Custom Agent

The custom agent file is located at `.github/agents/awesome-copilot-assistant.agent.md`. This agent:

- Provides access to all awesome-copilot MCP tools
- Helps you find and retrieve prompts, instructions, and configurations
- Can search the awesome-copilot repository

### Example Usage

1. Select "Awesome Copilot Assistant" from the agents dropdown in Copilot Chat
2. Ask questions like:
   - "Show me all available prompts"
   - "Get the web development prompt"
   - "Find code review instructions"
   - "What agents are available in awesome-copilot?"

## Troubleshooting

### MCP Server Not Appearing

1. **Check the path**: Ensure the path to `dist/index.js` is correct
2. **Verify build**: Make sure you ran `npm run build` successfully
3. **Check VS Code logs**: Open Output panel and select "GitHub Copilot" to see error messages
4. **Restart VS Code**: Sometimes a restart is needed after configuration changes

### Tools Not Available

1. **Check MCP server status**: Look for errors in the VS Code Output panel
2. **Verify Node.js version**: Ensure you're using Node.js 20.0.0 or higher
3. **Check dependencies**: Run `npm install` again if needed

### GitHub API Rate Limits

The server uses the GitHub API which has rate limits:
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour

If you hit rate limits, you can:
- Add a GitHub personal access token to increase limits
- Wait for the rate limit to reset
- Use the raw content URL directly (already implemented)

## Development Mode

For development, you can use `npm run dev` which uses `tsx` to run TypeScript directly without building:

```bash
npm run dev
```

Then update your VS Code settings to use `tsx`:

```json
{
  "github.copilot.chat.mcpServers": {
    "awesome-copilot": {
      "command": "npx",
      "args": [
        "tsx",
        "${workspaceFolder}/awesome-copilot-mcp/src/index.ts"
      ]
    }
  }
}
```

## Next Steps

- Explore the [awesome-copilot repository](https://github.com/github/awesome-copilot) to see what resources are available
- Create your own custom agents that use the awesome-copilot MCP tools
- Contribute prompts and instructions back to the awesome-copilot repository

## References

- [VS Code Custom Agents Documentation](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [GitHub awesome-copilot Repository](https://github.com/github/awesome-copilot)
- [Model Context Protocol](https://modelcontextprotocol.io/)

