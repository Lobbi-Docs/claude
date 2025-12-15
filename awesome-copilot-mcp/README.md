# Awesome Copilot MCP Server

MCP (Model Context Protocol) server that provides access to the [GitHub awesome-copilot](https://github.com/github/awesome-copilot) repository resources, including prompts, instructions, agents, and collections.

## Overview

This MCP server allows Claude and other MCP-compatible clients to access community-contributed GitHub Copilot resources from the awesome-copilot repository. You can search, list, and retrieve prompts, instructions, agent definitions, and collections.

## Features

- **List Resources**: Browse all available prompts, instructions, agents, and collections
- **Get Resources**: Retrieve specific resource files by path
- **Search**: Search for resources by name or path
- **Convenience Methods**: Quick access to prompts and instructions by name
- **Resource Access**: Access resources via MCP resource protocol

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Test the server:
```bash
npm start
```

## Configuration

The server uses default configuration for the awesome-copilot repository:

- **Repository**: `github/awesome-copilot`
- **Branch**: `main`
- **GitHub API**: `https://api.github.com`
- **Raw Content**: `https://raw.githubusercontent.com`

You can modify these settings in `src/index.ts` if needed.

## MCP Tools

### `awesome_copilot_list_resources`

List all resources from the awesome-copilot repository.

**Parameters:**
- `type` (optional): Filter by type (`prompt`, `instruction`, `config`, `agent`, `collection`, or `all`)
- `category` (optional): Filter by category
- `path` (optional): Specific directory path to list

**Example:**
```json
{
  "type": "prompt",
  "path": "prompts"
}
```

### `awesome_copilot_get_resource`

Get the contents of a specific resource file.

**Parameters:**
- `path` (required): Path to the resource file

**Example:**
```json
{
  "path": "prompts/web-development.md"
}
```

### `awesome_copilot_search`

Search for resources by name or path.

**Parameters:**
- `query` (required): Search query
- `type` (optional): Filter results by type

**Example:**
```json
{
  "query": "code review",
  "type": "instruction"
}
```

### `awesome_copilot_get_prompt`

Get a specific prompt from the prompts directory.

**Parameters:**
- `name` (required): Name of the prompt file (with or without .md extension)

**Example:**
```json
{
  "name": "web-development"
}
```

### `awesome_copilot_get_instruction`

Get a specific instruction from the instructions directory.

**Parameters:**
- `name` (required): Name of the instruction file (with or without .md extension)

**Example:**
```json
{
  "name": "code-review"
}
```

## VS Code Custom Agents Integration

This MCP server can be used with VS Code custom agents. Here's how to configure it:

### 1. Add MCP Server to VS Code Settings

Add the awesome-copilot MCP server to your VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "github.copilot.chat.mcpServers": {
    "awesome-copilot": {
      "command": "node",
      "args": ["C:/Users/YourUsername/path/to/awesome-copilot-mcp/dist/index.js"]
    }
  }
}
```

### 2. Create a Custom Agent

Create a custom agent file (`.github/agents/awesome-copilot-agent.agent.md`) that uses the MCP tools:

```markdown
---
description: Access awesome-copilot repository resources for prompts and instructions
name: Awesome Copilot Assistant
tools: ['awesome-copilot/awesome_copilot_list_resources', 'awesome-copilot/awesome_copilot_get_prompt', 'awesome-copilot/awesome_copilot_get_instruction', 'awesome-copilot/awesome_copilot_search']
model: Claude Sonnet 4
---

# Awesome Copilot Assistant

You are an assistant that helps users find and use community-contributed GitHub Copilot prompts, instructions, and configurations from the awesome-copilot repository.

## Available Tools

- `awesome_copilot_list_resources`: List all available resources
- `awesome_copilot_get_prompt`: Get a specific prompt
- `awesome_copilot_get_instruction`: Get a specific instruction
- `awesome_copilot_search`: Search for resources

## Usage

When users ask for prompts or instructions, use the appropriate tool to retrieve them from the awesome-copilot repository.
```

### 3. Use with Custom Agents

You can reference this MCP server in any custom agent by including the tool names in the `tools` field:

```yaml
tools: ['awesome-copilot/awesome_copilot_get_prompt', 'awesome-copilot/awesome_copilot_search']
```

## MCP Resources

Resources are accessible via the MCP resource protocol using URIs in the format:

```
awesome-copilot://<path>
```

For example:
- `awesome-copilot://prompts/web-development.md`
- `awesome-copilot://instructions/code-review.md`

## Development

### Project Structure

```
awesome-copilot-mcp/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── clients/
│   │   └── github.client.ts  # GitHub API client
│   ├── tools/
│   │   └── index.ts          # MCP tool definitions and handlers
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run the compiled server
- `npm run dev`: Run with tsx for development
- `npm run typecheck`: Type check without building
- `npm run lint`: Run ESLint

## Examples

### Example 1: List all prompts

```typescript
// Tool call
{
  "name": "awesome_copilot_list_resources",
  "arguments": {
    "type": "prompt"
  }
}
```

### Example 2: Get a specific prompt

```typescript
// Tool call
{
  "name": "awesome_copilot_get_prompt",
  "arguments": {
    "name": "web-development"
  }
}
```

### Example 3: Search for code review resources

```typescript
// Tool call
{
  "name": "awesome_copilot_search",
  "arguments": {
    "query": "code review",
    "type": "instruction"
  }
}
```

## Integration with VS Code Smart Actions

The awesome-copilot MCP server complements [VS Code Smart Actions](https://code.visualstudio.com/docs/copilot/copilot-smart-actions) by providing access to community-contributed prompts and instructions that can enhance your workflow.

### How They Work Together

**Smart Actions** are built-in AI-powered features in VS Code that help with common tasks:
- Generate commit messages and PR descriptions
- Resolve merge conflicts
- Implement TODO comments
- Rename symbols
- Generate documentation
- Generate tests
- Explain code
- Fix coding/testing/terminal errors
- Review code
- Semantic search

**Awesome Copilot MCP** provides access to community-contributed resources that can:
- Enhance prompts used by Smart Actions
- Provide specialized instructions for code review
- Offer domain-specific prompts for documentation
- Supply testing patterns and best practices
- Share code explanation templates

### Example Workflows

1. **Enhanced Code Review**: Use Smart Actions to review code, then use awesome-copilot to retrieve specialized code review instructions for your tech stack.

2. **Better Documentation**: Use Smart Actions to generate docs, then enhance them with prompts from awesome-copilot for your specific framework or library.

3. **Improved Testing**: Use Smart Actions to generate tests, then retrieve testing best practices from awesome-copilot to refine the generated tests.

4. **Custom Fixes**: When Smart Actions suggest fixes, use awesome-copilot to find domain-specific fix patterns or instructions.

### Using with Smart Actions

You can reference awesome-copilot resources in your custom agents that work alongside Smart Actions:

```markdown
---
description: Enhanced code reviewer using awesome-copilot resources
name: Enhanced Reviewer
tools: ['awesome-copilot/awesome_copilot_get_instruction']
---

# Enhanced Code Reviewer

Before reviewing code, retrieve the latest code review instructions from awesome-copilot:

1. Use `awesome_copilot_get_instruction` with name "code-review"
2. Apply those guidelines when reviewing code
3. Use VS Code Smart Actions for automated review suggestions
4. Combine both for comprehensive code review
```

## Custom Agents Included

This MCP server comes with several ready-to-use custom agents:

- **awesome-copilot-assistant**: General resource access and search
- **smart-reviewer**: Enhanced code review with Smart Actions integration
- **smart-fixer**: Code fixing with pattern matching
- **smart-tester**: Test generation with best practices
- **smart-documenter**: Documentation generation with templates
- **todo-implementer**: TODO implementation with patterns

See [WORKFLOWS.md](./WORKFLOWS.md) for detailed workflow examples.

## References

- [VS Code Custom Agents Documentation](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [VS Code Smart Actions Documentation](https://code.visualstudio.com/docs/copilot/copilot-smart-actions)
- [GitHub awesome-copilot Repository](https://github.com/github/awesome-copilot)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## License

MIT License - See LICENSE file for details.

