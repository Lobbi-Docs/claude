# MCP Server Archetype

Template for creating Model Context Protocol (MCP) servers with VS Code integration.

## Description

This archetype generates a complete MCP server project structure with:
- TypeScript implementation
- MCP SDK integration
- VS Code configuration
- Custom agents support
- GitHub API client (optional)
- Error handling and validation
- Documentation templates

## Variables

### Required

- **serverName**: MCP server name in kebab-case (e.g., `awesome-copilot-mcp`)
- **displayName**: Human-readable display name
- **description**: Brief description of what the server provides

### Optional

- **dataSource**: Type of data source (`github`, `api`, `file-system`, `database`, `custom`)
- **githubRepo**: GitHub repository in format `owner/repo` (if dataSource is `github`)
- **features**: Additional features to include:
  - `custom-agents`: Generate custom agent templates
  - `resources`: Enable MCP resource protocol
  - `prompts`: Include prompt templates
  - `caching`: Add caching support
  - `error-handling`: Enhanced error handling
  - `logging`: Structured logging
- **author**: Author name (defaults to "Ahling Tech")

## Usage

### Basic Example

```bash
/archetype create mcp-server \
  --variable serverName=my-mcp-server \
  --variable displayName="My MCP Server" \
  --variable description="MCP server for accessing my resources" \
  --variable dataSource=github \
  --variable githubRepo=owner/repo \
  --variable features=custom-agents,resources,error-handling
```

### GitHub Repository Example

```bash
/archetype create mcp-server \
  --variable serverName=awesome-copilot-mcp \
  --variable displayName="Awesome Copilot MCP" \
  --variable description="MCP Server for accessing GitHub awesome-copilot repository resources" \
  --variable dataSource=github \
  --variable githubRepo=github/awesome-copilot \
  --variable features=custom-agents,resources,error-handling \
  --variable author="Ahling Tech"
```

## Generated Structure

```
{{serverName}}/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── clients/              # API clients (if dataSource is github/api)
│   │   └── github.client.ts
│   ├── tools/                # MCP tool definitions and handlers
│   │   └── index.ts
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── .github/
│   └── agents/               # Custom agent definitions (if enabled)
│       └── assistant.agent.md
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .gitignore
└── README.md
```

## Features

### Custom Agents

When `custom-agents` feature is enabled, generates:
- Example custom agent in `.github/agents/`
- VS Code integration documentation
- Agent usage examples

### GitHub Integration

When `dataSource` is `github`, generates:
- GitHub API client with file fetching
- Directory listing support
- Repository tree access
- Error handling for 404s and rate limits

### Resources

When `resources` feature is enabled, generates:
- MCP resource protocol handlers
- Resource listing and reading
- URI-based resource access

## Next Steps

After generating:

1. **Install dependencies**: `npm install`
2. **Implement tools**: Add your specific tool handlers in `src/tools/index.ts`
3. **Configure VS Code**: Update `.vscode/settings.json` with your server path
4. **Build**: `npm run build`
5. **Test**: Use `npm run dev` for development
6. **Customize agents**: Edit `.github/agents/` files as needed

## Integration with VS Code

The generated server includes VS Code configuration examples in the README. Add to your `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcpServers": {
    "{{serverName}}": {
      "command": "node",
      "args": ["${workspaceFolder}/{{serverName}}/dist/index.js"]
    }
  }
}
```

## Best Practices

1. **Error Handling**: Always check for 404 errors before retrying with alternative paths
2. **Type Safety**: Use Zod schemas for all tool input validation
3. **Documentation**: Keep README and agent files up to date
4. **Testing**: Add tests for tool handlers
5. **Rate Limiting**: Implement rate limiting for external APIs

## Examples

See `awesome-copilot-mcp` for a complete example implementation.



