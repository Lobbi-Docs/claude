# @claude-sdk/tools

**Comprehensive Custom Tools Library for Claude Agent SDK**

A production-ready collection of 35+ MCP (Model Context Protocol) tools designed to extend Claude's capabilities with robust, type-safe utilities.

## Features

- **35+ Production-Ready Tools** across 6 categories
- **Full TypeScript Support** with Zod schema validation
- **MCP Server Integration** compatible with Claude Agent SDK
- **Zero External Dependencies** (uses Node.js built-in modules)
- **Comprehensive Error Handling** with custom error classes
- **Consistent API** across all tools

## Installation

```bash
npm install @claude-sdk/tools
# or
pnpm add @claude-sdk/tools
# or
yarn add @claude-sdk/tools
```

## Quick Start

### Using Individual Tools

```typescript
import { StringManipulatorTool, JsonProcessorTool } from '@claude-sdk/tools';

// String manipulation
const result = await StringManipulatorTool.execute({
  operation: 'case_convert',
  input: 'hello world',
  options: { caseType: 'title' }
});
// { success: true, data: { result: 'Hello World' } }

// JSON processing
const jsonResult = await JsonProcessorTool.execute({
  operation: 'query',
  data: { users: [{ name: 'Alice', age: 30 }] },
  options: { path: 'users[0].name' }
});
// { success: true, data: { result: 'Alice' } }
```

### Using with Claude Agent SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getAllTools, createMCPServer } from '@claude-sdk/tools';

const client = new Anthropic();
const tools = getAllTools();

// Use tools with Claude
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema
  })),
  messages: [{
    role: 'user',
    content: 'Calculate the SHA-256 hash of "hello world"'
  }],
});
```

### Starting MCP Server

```bash
npx @claude-sdk/tools
```

Or programmatically:

```typescript
import { startMCPServer } from '@claude-sdk/tools';

await startMCPServer();
```

## Tool Categories

### Core Tools (6)

| Tool | Description |
|------|-------------|
| `string_manipulator` | Advanced string operations: split, join, replace, regex, case conversion, templates |
| `data_transformer` | Object/array transformations: flatten, map, filter, reduce, group, merge |
| `datetime_utils` | Date/time operations: parse, format, diff, timezone conversion |
| `math_calculator` | Mathematical operations: basic, advanced, statistics, rounding |
| `uuid_generator` | UUID generation (v4, v5) and validation |
| `hash_generator` | Hash generation: MD5, SHA-1, SHA-256, SHA-512, HMAC |

### API Tools (5)

| Tool | Description |
|------|-------------|
| `http_client` | Full HTTP client with retry, timeout, streaming support |
| `graphql_client` | GraphQL queries and mutations with variable support |
| `websocket_client` | WebSocket connection management with heartbeat |
| `rest_api_builder` | REST API configuration with auth and interceptors |
| `oauth_handler` | OAuth 2.0 flows: authorization_code, client_credentials, PKCE |

### Data Tools (6)

| Tool | Description |
|------|-------------|
| `json_processor` | JSON operations: parse, stringify, query (JSONPath), diff, merge |
| `csv_processor` | CSV parsing and generation with type inference |
| `xml_processor` | XML ↔ JSON conversion with XPath-like queries |
| `yaml_processor` | YAML parsing and generation with multi-document support |
| `schema_validator` | JSON Schema and Zod validation with detailed errors |
| `data_merger` | Deep merge with configurable strategies |

### System Tools (5)

| Tool | Description |
|------|-------------|
| `env_manager` | Environment variable management with .env parsing |
| `process_executor` | Safe command execution with allowlist |
| `logger` | Structured JSON logging with levels |
| `metrics_collector` | Counter, gauge, histogram metrics |
| `cache_manager` | In-memory LRU cache with TTL |

### Security Tools (5)

| Tool | Description |
|------|-------------|
| `encryptor` | AES-256-GCM, AES-256-CBC encryption |
| `token_generator` | Secure tokens, API keys, JWT |
| `password_hasher` | Secure password hashing with scrypt |
| `input_sanitizer` | XSS, SQL injection, path traversal prevention |
| `secrets_manager` | Encrypted in-memory secrets storage |

### Testing Tools (5)

| Tool | Description |
|------|-------------|
| `mock_server` | HTTP mock server configuration |
| `data_faker` | Fake data generation with seeding |
| `assertion_helper` | Test assertions with detailed diffs |
| `benchmark_runner` | Performance benchmarking with statistics |
| `snapshot_tester` | Snapshot testing with update mode |

## API Reference

### Result Type

All tools return a consistent result type:

```typescript
interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    executionTime?: number;
    timestamp?: string;
    requestId?: string;
  };
}
```

### Error Classes

```typescript
import {
  ToolError,
  ValidationError,
  NetworkError,
  TimeoutError,
  SecurityError,
  ConfigurationError,
  ResourceError,
  RateLimitError
} from '@claude-sdk/tools';
```

### Utility Functions

```typescript
import {
  success,      // Create success result
  failure,      // Create failure result
  withTimeout,  // Add timeout to async operations
  withRetry,    // Add retry logic
  deepMerge,    // Deep merge objects
  toCamelCase,  // String case conversion
  generateUUID, // Generate UUID v4
} from '@claude-sdk/tools';
```

## Configuration

### Tool Configuration

```typescript
interface ToolConfig {
  timeout?: number;    // Default: 30000ms
  retries?: number;    // Default: 3
  cache?: boolean;     // Default: false
  cacheTtl?: number;   // Cache TTL in seconds
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}
```

### MCP Server Options

```typescript
import { createMCPServer } from '@claude-sdk/tools';

const server = createMCPServer({
  name: 'my-tools-server',
  version: '1.0.0',
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Related

- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Anthropic API](https://docs.anthropic.com)
