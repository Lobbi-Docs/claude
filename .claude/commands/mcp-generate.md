# MCP Server Generator Command

Generate MCP servers from OpenAPI specifications or GraphQL schemas.

## Usage

```
/mcp-generate <source-type> <spec-path> [options]
```

## Source Types

- `openapi` - Generate from OpenAPI 3.0/3.1 specification
- `graphql` - Generate from GraphQL SDL schema
- `validate` - Validate specification without generating

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output <dir>` | Output directory for generated server | `./generated-mcp` |
| `--name <name>` | Server name (used in package.json) | Derived from spec |
| `--typescript` | Generate TypeScript (default) | `true` |
| `--javascript` | Generate JavaScript instead | `false` |
| `--auth <type>` | Auth passthrough (oauth, apikey, bearer) | Auto-detect |
| `--dry-run` | Preview generation without writing files | `false` |

## Examples

### Generate from OpenAPI

```bash
# Generate MCP server from Stripe API spec
/mcp-generate openapi ./specs/stripe-api.yaml --name stripe-mcp --output ./mcp-servers/stripe

# Generate from remote spec
/mcp-generate openapi https://api.example.com/openapi.json --name example-mcp
```

### Generate from GraphQL

```bash
# Generate MCP server from GitHub GraphQL schema
/mcp-generate graphql ./schemas/github.graphql --name github-mcp

# With custom output directory
/mcp-generate graphql ./schema.graphql --output ./my-mcp-server
```

### Validate Specification

```bash
# Validate OpenAPI spec
/mcp-generate validate ./api-spec.yaml

# Validate GraphQL schema
/mcp-generate validate ./schema.graphql
```

## Generated Output Structure

```
<output-dir>/
├── package.json          # NPM package with MCP dependencies
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── tools/            # Generated tool handlers
│   │   ├── get-users.ts
│   │   ├── create-user.ts
│   │   └── ...
│   ├── types.ts          # TypeScript type definitions
│   └── auth.ts           # Authentication handling
├── README.md             # Generated documentation
└── .env.example          # Environment variables template
```

## Tool Generation Rules

### OpenAPI Endpoint Mapping

| HTTP Method | Tool Naming Pattern | Example |
|-------------|---------------------|---------|
| GET /users | `list_users` | List all users |
| GET /users/{id} | `get_user` | Get user by ID |
| POST /users | `create_user` | Create new user |
| PUT /users/{id} | `update_user` | Update user |
| DELETE /users/{id} | `delete_user` | Delete user |
| PATCH /users/{id} | `patch_user` | Partial update |

### GraphQL Operation Mapping

| Operation Type | Tool Naming Pattern | Example |
|----------------|---------------------|---------|
| Query | `query_<name>` | `query_user` |
| Mutation | `mutate_<name>` | `mutate_create_user` |
| Subscription | `subscribe_<name>` | `subscribe_user_events` |

## Authentication Support

The generator supports automatic authentication passthrough:

### OAuth 2.0
```typescript
// Generated auth.ts
export const auth = {
  type: 'oauth2',
  tokenUrl: process.env.OAUTH_TOKEN_URL,
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
};
```

### API Key
```typescript
// Generated auth.ts
export const auth = {
  type: 'apiKey',
  header: 'X-API-Key',
  value: process.env.API_KEY,
};
```

### Bearer Token
```typescript
// Generated auth.ts
export const auth = {
  type: 'bearer',
  token: process.env.AUTH_TOKEN,
};
```

## Workflow Integration

This command integrates with the plugin ecosystem:

1. Generate MCP server from API specification
2. Register in `.claude/registry/mcps.index.json`
3. Configure in Claude Code settings
4. Use generated tools in agents and workflows

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Invalid specification | Malformed YAML/JSON/GraphQL | Run `/mcp-generate validate` first |
| Missing required field | Spec missing title/version | Add required OpenAPI/GraphQL fields |
| Unsupported auth type | Custom auth not supported | Use manual implementation |
| Circular reference | Self-referencing schemas | Flatten references before generation |

## See Also

- `/plugin-install` - Install generated MCP as plugin
- `/plugin-validate` - Validate generated plugin structure
- MCP Specification: https://modelcontextprotocol.io
