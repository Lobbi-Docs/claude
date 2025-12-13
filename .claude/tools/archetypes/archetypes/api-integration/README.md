# API Integration Archetype

Create a production-ready REST API client plugin with authentication, error handling, and best practices.

## Features

- **Multiple Authentication Methods**: OAuth, API Key, JWT, Basic Auth
- **Error Handling**: Comprehensive error handling with retry logic
- **Rate Limiting**: Built-in rate limiting and backoff strategies
- **Request/Response Logging**: Detailed logging for debugging
- **Type Safety**: Full TypeScript support with types
- **Caching**: Optional response caching
- **Pagination**: Support for paginated endpoints

## Usage

```bash
archetype create api-integration -o my-api-plugin
```

## Variables

- `pluginName`: Name of your plugin (kebab-case)
- `apiName`: Name of the API service
- `baseUrl`: Base URL for API endpoints
- `authType`: Authentication method (oauth, api-key, jwt, basic, none)
- `features`: Additional features to include (retry, rate-limit, caching, etc.)
- `author`: Your name
- `description`: Plugin description

## Generated Structure

```
my-api-plugin/
├── src/
│   ├── client.ts          # API client implementation
│   ├── auth.ts            # Authentication logic
│   ├── types.ts           # TypeScript types
│   ├── errors.ts          # Error classes
│   └── index.ts           # Main entry point
├── tests/
│   └── client.test.ts     # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

## Best Practices

- Uses axios for HTTP requests with interceptors
- Implements exponential backoff for retries
- Includes comprehensive error handling
- Provides TypeScript types for all endpoints
- Follows security best practices for credentials

## Example

After generation, your plugin will have a structure like:

```typescript
import { createClient } from './my-api-plugin';

const client = createClient({
  apiKey: process.env.API_KEY,
  baseUrl: 'https://api.example.com'
});

const data = await client.get('/endpoint');
```

## Next Steps

1. Install dependencies: `npm install`
2. Add your API endpoint types in `src/types.ts`
3. Implement API methods in `src/client.ts`
4. Add tests in `tests/`
5. Build: `npm run build`
