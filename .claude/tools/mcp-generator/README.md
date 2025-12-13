# MCP Server Generator

Automatically generate fully functional Model Context Protocol (MCP) servers from OpenAPI 3.0/3.1 specifications and GraphQL schemas.

## Features

- **OpenAPI Support**: Parse OpenAPI 3.0 and 3.1 specs (YAML/JSON)
- **GraphQL Support**: Parse GraphQL SDL schemas
- **Authentication**: Supports API Key, Bearer Token, Basic Auth, and OAuth2
- **Type Safety**: Generates TypeScript with Zod validation
- **Complete Servers**: Includes package.json, tsconfig.json, README, and .env.example
- **HTTP Clients**: Automatic HTTP request handling for REST APIs
- **Validation**: Built-in input validation using JSON Schema

## Installation

```bash
cd .claude/tools/mcp-generator
npm install
npm run build
```

## Usage

### Command Line Interface

#### Generate from OpenAPI Spec

```bash
npm run dev openapi <spec-path> --output <dir> --name <server-name>

# Example
npm run dev openapi ./specs/petstore.yaml --output ./generated/petstore --name petstore-mcp
```

**Options:**
- `<spec-path>`: Path to OpenAPI specification file (YAML or JSON)
- `-o, --output <dir>`: Output directory for generated server
- `-n, --name <name>`: Name for the generated server
- `--no-types`: Skip TypeScript type generation
- `--no-validation`: Skip input validation generation

#### Generate from GraphQL Schema

```bash
npm run dev graphql <schema-path> --output <dir> --name <server-name>

# Example
npm run dev graphql ./schemas/api.graphql --output ./generated/graphql-api --name graphql-mcp
```

**Options:**
- `<schema-path>`: Path to GraphQL schema file
- `-o, --output <dir>`: Output directory for generated server
- `-n, --name <name>`: Name for the generated server
- `--endpoint <url>`: GraphQL endpoint URL
- `--no-types`: Skip TypeScript type generation
- `--no-validation`: Skip input validation generation

#### Validate Specification

```bash
npm run dev validate <spec-path> --type <openapi|graphql>

# Example
npm run dev validate ./specs/api.yaml --type openapi
```

### Programmatic API

```typescript
import { parseOpenAPI, parseGraphQL, generateMCPServer } from 'mcp-generator';

// Parse OpenAPI spec
const apiResult = await parseOpenAPI('./specs/api.yaml');
if (apiResult.success && apiResult.data) {
  const api = apiResult.data;

  // Generate MCP server
  const genResult = await generateMCPServer(api, {
    serverName: 'my-mcp-server',
    outputDir: './output',
    includeTypes: true,
    includeValidation: true,
  });

  console.log(`Generated at: ${genResult.outputPath}`);
}

// Parse GraphQL schema
const graphqlResult = await parseGraphQL('./schemas/schema.graphql');
if (graphqlResult.success && graphqlResult.data) {
  // ... same as above
}
```

## Examples

### Example 1: Generate from Petstore API

```bash
# Download the Petstore OpenAPI spec
curl -o petstore.yaml https://petstore3.swagger.io/api/v3/openapi.yaml

# Generate MCP server
npm run dev openapi petstore.yaml --output ./petstore-mcp --name petstore

# Install and run
cd petstore-mcp
npm install
npm run build
npm start
```

### Example 2: Generate from GraphQL Schema

Create a GraphQL schema file `schema.graphql`:

```graphql
type Query {
  users(limit: Int, offset: Int): [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}
```

Generate the server:

```bash
npm run dev graphql schema.graphql \
  --output ./user-api-mcp \
  --name user-api \
  --endpoint https://api.example.com/graphql
```

### Example 3: API with Authentication

For an API with authentication, the generator will:

1. Detect the auth scheme from the spec
2. Generate code to read from environment variables
3. Create a `.env.example` file
4. Document setup in the README

Example OpenAPI spec with API Key auth:

```yaml
openapi: 3.0.0
info:
  title: Secure API
  version: 1.0.0
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
security:
  - ApiKeyAuth: []
paths:
  /data:
    get:
      summary: Get data
      responses:
        '200':
          description: Success
```

Generated server will expect `API_KEY` environment variable.

## Generated Server Structure

```
output-directory/
├── index.ts           # Main MCP server implementation
├── package.json       # Node.js package configuration
├── tsconfig.json      # TypeScript configuration
├── README.md          # Documentation for the server
└── .env.example       # Example environment variables (if auth required)
```

## Tool Naming Convention

### OpenAPI
Tools are named based on the operation ID or generated from the HTTP method and path:

- `operationId: getUserById` → `get_user_by_id`
- `GET /users/{id}` → `get_users_id`

### GraphQL
Tools are prefixed with the operation type:

- Query `users` → `query_users`
- Mutation `createUser` → `mutation_create_user`
- Subscription `userUpdated` → `subscription_user_updated`

## Input Schema Mapping

### OpenAPI to JSON Schema

| OpenAPI Type | JSON Schema Type |
|--------------|------------------|
| string       | string           |
| integer      | integer          |
| number       | number           |
| boolean      | boolean          |
| array        | array            |
| object       | object           |

### GraphQL to JSON Schema

| GraphQL Type | JSON Schema Type |
|--------------|------------------|
| String       | string           |
| Int          | integer          |
| Float        | number           |
| Boolean      | boolean          |
| ID           | string           |
| [Type]       | array            |
| Enum         | string (enum)    |

## Authentication Support

The generator supports the following authentication schemes:

| Type    | OpenAPI Security Scheme | Environment Variable |
|---------|-------------------------|----------------------|
| API Key | `type: apiKey`          | `API_KEY`            |
| Bearer  | `type: http, scheme: bearer` | `BEARER_TOKEN` |
| Basic   | `type: http, scheme: basic` | `BASIC_AUTH`   |
| OAuth2  | `type: oauth2`          | `OAUTH_TOKEN`        |

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test -- --coverage
```

## Development

### Project Structure

```
src/
├── parsers/
│   ├── openapi-parser.ts    # OpenAPI spec parser
│   └── graphql-parser.ts    # GraphQL schema parser
├── generators/
│   └── mcp-generator.ts     # Main generator logic
├── templates/
│   └── mcp-server.template.ts  # Code generation templates
├── types.ts                 # TypeScript type definitions
├── cli.ts                   # Command-line interface
└── index.ts                 # Public API exports

tests/
├── openapi-parser.test.ts   # OpenAPI parser tests
├── graphql-parser.test.ts   # GraphQL parser tests
└── mcp-generator.test.ts    # Generator tests
```

### Adding New Features

1. **Parser Enhancement**: Edit `src/parsers/openapi-parser.ts` or `graphql-parser.ts`
2. **Template Updates**: Modify `src/templates/mcp-server.template.ts`
3. **Generator Logic**: Update `src/generators/mcp-generator.ts`
4. **Tests**: Add tests in `tests/` directory

## Limitations

- **$ref Resolution**: Limited support for OpenAPI `$ref` (inline schemas preferred)
- **GraphQL Subscriptions**: Generated as stubs (requires WebSocket implementation)
- **Complex Auth Flows**: OAuth2 flows require manual implementation
- **Custom Scalars**: Treated as strings with descriptive comments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## See Also

- [Model Context Protocol (MCP)](https://github.com/anthropics/mcp)
- [OpenAPI Specification](https://swagger.io/specification/)
- [GraphQL](https://graphql.org/)
