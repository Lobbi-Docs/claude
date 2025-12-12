# Agent Studio MCP Tool

Model Context Protocol (MCP) tool for Agent Studio.

## Overview

This MCP tool provides a standardized interface for AI models to interact with Agent Studio's agent management system. It implements the [Model Context Protocol](https://modelcontextprotocol.io) specification.

## Available Tools

### execute_agent

Execute an AI agent with optional parameters.

**Parameters:**
- `agentId` (string, required): The ID of the agent to execute
- `parameters` (object, optional): Optional parameters for agent execution

**Example:**
\`\`\`typescript
{
  "agentId": "code-review-agent",
  "parameters": {
    "pullRequestId": "123",
    "repository": "agent-studio"
  }
}
\`\`\`

### get_agent_status

Get the current status of an agent.

**Parameters:**
- `agentId` (string, required): The ID of the agent to check

**Returns:**
- Agent status information including health, metrics, and last execution time

### list_agents

List all available agents in the system.

**Parameters:** None

**Returns:**
- Array of agent information

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

The MCP tool runs as a stdio server:

\`\`\`bash
npm run dev
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm run test

# Lint
npm run lint
\`\`\`

## Integration

To use this tool with an MCP-compatible AI system, configure your client to connect to this server via stdio transport.

Example configuration:
\`\`\`json
{
  "mcpServers": {
    "agent-studio": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
\`\`\`
