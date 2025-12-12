# Agent Studio Tools

This directory contains tools and utilities for Agent Studio.

## MCP Tool Stub

The `mcp-tool-stub` directory contains a Model Context Protocol (MCP) tool implementation that provides a standardized interface for AI agents to interact with Agent Studio services.

### What is MCP?

The Model Context Protocol (MCP) is a standard protocol for AI tools and services to communicate with language models. It provides:

- **Standardized tool interface** for AI agents
- **Type-safe communication** between agents and tools
- **Structured input/output** schemas
- **Error handling** and validation
- **Extensibility** for custom tools

### Available Tools

The MCP tool stub provides three main tools:

#### 1. execute_agent

Execute an AI agent with optional parameters.

\`\`\`typescript
{
  agentId: "code-review-agent",
  parameters: {
    pullRequestId: "123",
    repository: "agent-studio"
  }
}
\`\`\`

#### 2. get_agent_status

Get the current status and metrics of an agent.

\`\`\`typescript
{
  agentId: "code-review-agent"
}
\`\`\`

#### 3. list_agents

List all available agents in the system.

### Usage

\`\`\`bash
cd mcp-tool-stub
npm install
npm run build
npm run dev
\`\`\`

### Integration

To integrate this MCP tool with an AI system:

1. Configure your MCP client to connect via stdio
2. Start the tool server
3. Use the provided tools in your agent workflows

Example MCP client configuration:

\`\`\`json
{
  "mcpServers": {
    "agent-studio": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/mcp-tool-stub"
    }
  }
}
\`\`\`

## Creating Custom Tools

To create a custom MCP tool:

1. Create a new directory under `tools/`
2. Implement the MCP SDK interfaces
3. Define tool schemas using Zod
4. Register tools with the MCP server
5. Handle tool invocations

Example:

\`\`\`typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";

// Define input schema
const MyToolSchema = z.object({
  input: z.string(),
});

// Register tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "my_custom_tool",
    description: "Does something useful",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string" }
      }
    }
  }]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { input } = MyToolSchema.parse(request.params.arguments);
  // Process input and return result
});
\`\`\`

## Best Practices

1. **Validate inputs** using Zod schemas
2. **Handle errors** gracefully with meaningful messages
3. **Document tools** with clear descriptions
4. **Test tools** thoroughly with various inputs
5. **Version tools** to maintain compatibility
6. **Log operations** for debugging and monitoring
7. **Secure credentials** using environment variables

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Zod Documentation](https://zod.dev)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing new tools.
