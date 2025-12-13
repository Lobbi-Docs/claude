# HashiCorp Vault Integration - Ahling Command Center MCP

## Overview

The HashiCorp Vault integration provides comprehensive secret management capabilities for the Ahling Command Center MCP server. This implementation supports both KV v1 (legacy) and KV v2 (modern) secret engines with full CRUD operations, version management, and robust error handling.

## Implementation Summary

### Files Created

1. **vault.client.ts** (11KB)
   - Full-featured Vault client using axios
   - Support for KV v1 and KV v2 secret engines
   - Comprehensive error handling
   - Path: `ahling-command-center/mcp-server/src/clients/vault.client.ts`

2. **vault/index.ts** (13KB)
   - MCP tool registration for Vault operations
   - Zod schema validation
   - Four main tools: vault_read, vault_write, vault_list, vault_delete
   - Path: `ahling-command-center/mcp-server/src/tools/vault/index.ts`

3. **vault.types.ts** (4.3KB)
   - Comprehensive TypeScript type definitions
   - Shared interfaces and enums
   - Path: `ahling-command-center/mcp-server/src/types/vault.types.ts`

4. **vault.client.test.ts**
   - Complete test suite using Vitest
   - Unit tests for all client operations
   - Error handling verification
   - Path: `ahling-command-center/mcp-server/src/clients/vault.client.test.ts`

5. **vault/examples.ts**
   - 8 comprehensive usage examples
   - Demonstrates all client features
   - Path: `ahling-command-center/mcp-server/src/tools/vault/examples.ts`

6. **vault/README.md**
   - Complete documentation
   - API reference
   - Security considerations
   - Troubleshooting guide
   - Path: `ahling-command-center/mcp-server/src/tools/vault/README.md`

## Features Implemented

### Core Operations

#### Read Operations
- Read secrets from any path
- Read specific versions (KV v2)
- Automatic response format handling for v1/v2

#### Write Operations
- Write secrets with any key-value data
- Check-And-Set (CAS) for optimistic locking
- Version tracking (KV v2)

#### List Operations
- List secrets at any path
- Consistent behavior across v1/v2
- Hierarchical path support

#### Delete Operations
- Soft delete (KV v2)
- Hard delete (KV v1)
- Version-specific deletion (KV v2)
- Permanent destroy operation (KV v2)
- Undelete capability (KV v2)

### Advanced Features

1. **Version Management** (KV v2)
   - Read historical versions
   - Soft delete with undelete capability
   - Permanent destruction
   - Version metadata tracking

2. **Check-And-Set (CAS)**
   - Optimistic locking mechanism
   - Prevents concurrent modification conflicts
   - Version-based conflict detection

3. **Health Monitoring**
   - Health check endpoint
   - Seal status detection
   - Cluster information

4. **Mount Detection**
   - Auto-detect KV version
   - Dynamic mount path configuration
   - Mount information retrieval

### Error Handling

Comprehensive error handling for all common Vault errors:

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VAULT_SEALED` | 503 | Vault is sealed and cannot serve requests |
| `PERMISSION_DENIED` | 403 | Insufficient policy or invalid token |
| `NOT_FOUND` | 404 | Secret does not exist at path |
| `INVALID_REQUEST` | 400 | Malformed request |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Vault internal server error |
| `UNAVAILABLE` | 503 | Vault is unavailable |
| `NO_RESPONSE` | - | Network error or unreachable |
| `REQUEST_ERROR` | - | Request setup failed |

Each error includes:
- Human-readable message
- Error code
- HTTP status code (if applicable)
- Detailed error array from Vault

## MCP Tools

### vault_read

Read a secret from HashiCorp Vault.

**Input Schema:**
```typescript
{
  path: string;           // Required: Secret path
  version?: number;       // Optional: Version number (KV v2)
  mountPath?: string;     // Optional: Mount path (default: "secret")
  kvVersion?: 1 | 2;      // Optional: KV version (default: 2)
}
```

**Response:**
```json
{
  "success": true,
  "path": "myapp/database",
  "data": {
    "username": "dbuser",
    "password": "secret123"
  },
  "metadata": {
    "created_time": "2024-01-15T10:30:00Z",
    "version": 2,
    "destroyed": false
  }
}
```

### vault_write

Write a secret to HashiCorp Vault.

**Input Schema:**
```typescript
{
  path: string;                    // Required: Secret path
  data: Record<string, any>;       // Required: Secret data
  cas?: number;                    // Optional: Check-And-Set version
  mountPath?: string;              // Optional: Mount path
  kvVersion?: 1 | 2;               // Optional: KV version
}
```

**Response:**
```json
{
  "success": true,
  "path": "myapp/database",
  "message": "Secret written successfully",
  "metadata": {
    "version": 3,
    "created_time": "2024-01-15T11:00:00Z"
  }
}
```

### vault_list

List secrets at a given path.

**Input Schema:**
```typescript
{
  path: string;           // Required: Path to list
  mountPath?: string;     // Optional: Mount path
  kvVersion?: 1 | 2;      // Optional: KV version
}
```

**Response:**
```json
{
  "success": true,
  "path": "myapp/",
  "keys": ["database", "api-keys", "certificates/"],
  "count": 3
}
```

### vault_delete

Delete a secret from HashiCorp Vault.

**Input Schema:**
```typescript
{
  path: string;           // Required: Secret path
  versions?: number[];    // Optional: Versions to delete (KV v2)
  mountPath?: string;     // Optional: Mount path
  kvVersion?: 1 | 2;      // Optional: KV version
}
```

**Response:**
```json
{
  "success": true,
  "path": "myapp/old-secret",
  "message": "Deleted versions 1, 2"
}
```

## Configuration

### Environment Variables

Required:
```bash
VAULT_ADDR=https://vault.example.com:8200
# or
VAULT_ADDRESS=https://vault.example.com:8200

VAULT_TOKEN=hvs.CAESIxxx...
```

Optional:
```bash
VAULT_NAMESPACE=my-namespace  # For Vault Enterprise
```

### Client Configuration

```typescript
import { VaultClient, VaultKVVersion } from './clients/vault.client.js';

const client = new VaultClient(
  {
    address: 'https://vault.example.com:8200',
    token: 'hvs.CAESIxxx...',
    namespace: 'my-namespace',  // Optional
  },
  VaultKVVersion.V2,  // or VaultKVVersion.V1
  'secret'            // Mount path
);
```

## Usage Examples

### Basic Secret Management

```typescript
// Write a secret
await client.write('myapp/database', {
  username: 'dbuser',
  password: 'secret123',
  host: 'localhost',
  port: 5432,
});

// Read the secret
const secret = await client.read('myapp/database');
console.log(secret.data);

// List secrets
const list = await client.list('myapp/');
console.log(list.keys);

// Delete the secret
await client.delete('myapp/database');
```

### Version Management (KV v2)

```typescript
// Read specific version
const v2 = await client.read('myapp/config', { version: 2 });

// Soft delete
await client.delete('myapp/config', { versions: [2] });

// Undelete
await client.undelete('myapp/config', [2]);

// Permanent destroy
await client.destroy('myapp/config', [1]);
```

### Check-And-Set (Optimistic Locking)

```typescript
// Read current version
const current = await client.read('myapp/counter');
const currentVersion = current.metadata.version;

// Update with CAS
try {
  await client.write(
    'myapp/counter',
    { count: current.data.count + 1 },
    { cas: currentVersion }
  );
} catch (error) {
  console.log('Concurrent modification detected');
}
```

### Health Check

```typescript
const health = await client.healthCheck();

if (health.sealed) {
  console.log('WARNING: Vault is sealed!');
}

console.log('Vault version:', health.version);
```

## Error Handling Best Practices

### Using Try-Catch

```typescript
try {
  const secret = await client.read('myapp/database');
  console.log(secret.data);
} catch (error) {
  if (error instanceof VaultError) {
    console.error('Vault error:', error.code);
    console.error('Message:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.errors);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Code Checking

```typescript
try {
  await client.read('nonexistent/path');
} catch (error) {
  if (error instanceof VaultError) {
    switch (error.code) {
      case 'NOT_FOUND':
        console.log('Secret does not exist');
        break;
      case 'PERMISSION_DENIED':
        console.log('Access denied - check token policy');
        break;
      case 'VAULT_SEALED':
        console.log('Vault is sealed - unseal required');
        break;
      default:
        console.log('Vault error:', error.message);
    }
  }
}
```

## Integration with MCP Server

### Registration

```typescript
import { registerVaultTools, getVaultToolDefinitions } from './tools/vault/index.js';

// Register tools with MCP server
registerVaultTools(server);

// Get tool definitions for ListTools handler
const tools = getVaultToolDefinitions();
```

### Tool Call Handler

The tools are automatically registered and handled by the MCP server. The handler:

1. Validates input using Zod schemas
2. Creates Vault client from environment variables
3. Executes the requested operation
4. Returns formatted response or error

## Security Considerations

### Authentication

- **Token Management**: Never commit tokens to source control
- **Token Rotation**: Implement regular token rotation
- **Token Renewal**: Handle token renewal for long-running processes
- **Least Privilege**: Use policies with minimum required permissions

### Network Security

- **TLS**: Always use HTTPS in production
- **Certificate Validation**: Validate Vault server certificates
- **Network Isolation**: Run Vault in isolated network segments

### Audit and Compliance

- **Audit Logging**: Enable Vault audit logging
- **Access Reviews**: Regular review of token and policy usage
- **Encryption**: Ensure data is encrypted at rest and in transit

### Namespaces (Enterprise)

- **Multi-tenancy**: Use Vault namespaces for isolation
- **Namespace Headers**: Set `X-Vault-Namespace` header appropriately

## Testing

### Run Tests

```bash
npm test
```

### Test Environment

```bash
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=root
```

### Test Coverage

The test suite includes:
- KV v1 and KV v2 operations
- Error handling for all error codes
- Edge cases and boundary conditions
- Configuration options
- Health checks

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
curl -k https://vault.example.com:8200/v1/sys/health

# Check environment variables
echo $VAULT_ADDR
echo $VAULT_TOKEN
```

### Permission Issues

```bash
# Check token capabilities
vault token capabilities secret/myapp/database

# View token info
vault token lookup

# Check policy
vault policy read my-policy
```

### Sealed Vault

```bash
# Check seal status
vault status

# Unseal Vault
vault operator unseal
```

### Debug Logging

Enable debug mode:

```bash
export VAULT_LOG_LEVEL=debug
```

## Performance Considerations

### Batch Operations

Use `Promise.all` for parallel operations:

```typescript
const results = await Promise.all([
  client.read('app1/config'),
  client.read('app2/config'),
  client.read('app3/config'),
]);
```

### Connection Pooling

The axios client reuses connections automatically.

### Timeout Configuration

Default timeout is 10 seconds. Can be customized in client creation.

## Future Enhancements

Potential improvements for future versions:

1. **Token Renewal**: Automatic token renewal
2. **Caching**: Local secret caching with TTL
3. **Retry Logic**: Automatic retry with exponential backoff
4. **Metrics**: Prometheus metrics for monitoring
5. **Transit Engine**: Encryption-as-a-Service support
6. **PKI Engine**: Certificate management
7. **Database Engine**: Dynamic database credentials
8. **AWS Engine**: Dynamic AWS credentials

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault API Documentation](https://www.vaultproject.io/api-docs)
- [KV Secrets Engine v2](https://www.vaultproject.io/docs/secrets/kv/kv-v2)
- [Vault Best Practices](https://www.vaultproject.io/docs/internals/security)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT License - Part of the Ahling Command Center MCP Server

## Support

For issues or questions:
- Check the README.md in `src/tools/vault/`
- Review the examples in `src/tools/vault/examples.ts`
- Run the test suite for validation
- Consult HashiCorp Vault documentation

---

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2024-12-13
