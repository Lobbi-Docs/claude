# Simple User API MCP Server

A simple API for managing users

**Version:** 1.0.0
**Source:** OPENAPI
**Base URL:** https://api.example.com/v1


## Installation

```bash
npm install
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

## Configuration

### API Key Authentication

Set the following environment variable:

```bash
export API_KEY="your-api-key-here"
```

The API key will be sent as a header parameter named `X-API-Key`.

## Available Tools

This MCP server provides the following tools:

### `list_users`

List all users

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "description": "Maximum number of users to return"
    },
    "offset": {
      "type": "integer",
      "description": "Number of users to skip"
    }
  }
}
```

### `create_user`

Create a new user

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "User's full name"
    },
    "email": {
      "type": "string",
      "description": "User's email address"
    }
  },
  "required": [
    "name",
    "email"
  ]
}
```

### `get_user_by_id`

Get user by ID

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Path parameter: id"
    }
  },
  "required": [
    "id"
  ]
}
```

## Integration

Add this server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "simple-user-api": {
      "command": "node",
      "args": ["C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\mcp-generator\dist\index.js"]
    }
  }
}
```

## Generated with

This MCP server was automatically generated from a OPENAPI specification using the MCP Generator tool.
