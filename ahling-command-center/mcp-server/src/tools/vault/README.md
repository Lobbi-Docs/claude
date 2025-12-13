# HashiCorp Vault MCP Tools

This module provides MCP tools for interacting with HashiCorp Vault secret management.

## Features

- **KV v1 and KV v2 Support**: Works with both legacy KV v1 and modern KV v2 secret engines
- **Full CRUD Operations**: Read, write, list, and delete secrets
- **Version Management**: Read specific versions (KV v2) and manage secret history
- **Error Handling**: Comprehensive error handling for common Vault errors:
  - Vault sealed
  - Permission denied
  - Secret not found
  - Rate limiting
  - Network errors

## Environment Variables

Required environment variables:

```bash
# Vault server address
VAULT_ADDR=https://vault.example.com:8200
# or
VAULT_ADDRESS=https://vault.example.com:8200

# Vault authentication token
VAULT_TOKEN=hvs.CAESIxxx...

# Optional: Vault namespace (for Vault Enterprise)
VAULT_NAMESPACE=my-namespace
```

## Available Tools

### vault_read

Read a secret from Vault.

**Parameters:**
- `path` (required): Secret path without mount point (e.g., "myapp/database")
- `version` (optional): Version number to read (KV v2 only)
- `mountPath` (optional): Mount path (default: "secret")
- `kvVersion` (optional): KV version 1 or 2 (default: 2)

**Example:**
```json
{
  "path": "myapp/database",
  "version": 2
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

Write a secret to Vault.

**Parameters:**
- `path` (required): Secret path without mount point
- `data` (required): Secret data as key-value pairs
- `cas` (optional): Check-And-Set version for optimistic locking (KV v2)
- `mountPath` (optional): Mount path (default: "secret")
- `kvVersion` (optional): KV version 1 or 2 (default: 2)

**Example:**
```json
{
  "path": "myapp/database",
  "data": {
    "username": "dbuser",
    "password": "newsecret456"
  },
  "cas": 2
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

**Parameters:**
- `path` (required): Path to list without mount point (e.g., "myapp/" or "")
- `mountPath` (optional): Mount path (default: "secret")
- `kvVersion` (optional): KV version 1 or 2 (default: 2)

**Example:**
```json
{
  "path": "myapp/"
}
```

**Response:**
```json
{
  "success": true,
  "path": "myapp/",
  "keys": [
    "database",
    "api-keys",
    "certificates/"
  ],
  "count": 3
}
```

### vault_delete

Delete a secret from Vault.

**Parameters:**
- `path` (required): Secret path without mount point
- `versions` (optional): Specific versions to delete (KV v2 only)
- `mountPath` (optional): Mount path (default: "secret")
- `kvVersion` (optional): KV version 1 or 2 (default: 2)

**Example:**
```json
{
  "path": "myapp/old-secret",
  "versions": [1, 2]
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

## Error Handling

The Vault tools provide detailed error messages for common scenarios:

### Vault Sealed
```json
{
  "success": false,
  "error": "Vault Error (VAULT_SEALED): Vault is sealed"
}
```

### Permission Denied
```json
{
  "success": false,
  "error": "Vault Error (PERMISSION_DENIED): Permission denied - insufficient policy or invalid token"
}
```

### Secret Not Found
```json
{
  "success": false,
  "error": "Vault Error (NOT_FOUND): Secret not found at the specified path"
}
```

### Network Error
```json
{
  "success": false,
  "error": "Vault Error (NO_RESPONSE): No response from Vault - check connection and address"
}
```

## KV v1 vs KV v2

### KV v1 (Legacy)

- Simple key-value storage
- No versioning
- Delete is permanent
- Path: `/v1/{mount}/{path}`

### KV v2 (Recommended)

- Versioned secret storage
- Soft delete (can be undeleted)
- Metadata tracking
- Check-And-Set support for optimistic locking
- Path: `/v1/{mount}/data/{path}`

## Client Usage

The Vault client can also be used directly in code:

```typescript
import { VaultClient, VaultKVVersion } from './clients/vault.client.js';

const client = new VaultClient(
  {
    address: 'https://vault.example.com:8200',
    token: 'hvs.CAESIxxx...',
  },
  VaultKVVersion.V2,
  'secret'
);

// Read secret
const secret = await client.read('myapp/database');
console.log(secret.data);

// Write secret
await client.write('myapp/database', {
  username: 'dbuser',
  password: 'secret123',
});

// List secrets
const list = await client.list('myapp/');
console.log(list.keys);

// Delete secret
await client.delete('myapp/old-secret');

// Health check
const health = await client.healthCheck();
console.log(health);
```

## Advanced Features

### Check-And-Set (CAS)

Prevent concurrent modifications using version-based locking:

```typescript
// Read current version
const current = await client.read('myapp/config');
const currentVersion = current.metadata.version;

// Update with CAS
try {
  await client.write('myapp/config', newData, { cas: currentVersion });
} catch (error) {
  // Handle conflict - secret was modified by someone else
}
```

### Version Management

```typescript
// Read specific version
const v2 = await client.read('myapp/secret', { version: 2 });

// Soft delete (KV v2)
await client.delete('myapp/secret');

// Undelete (KV v2)
await client.undelete('myapp/secret', [3, 4]);

// Permanent delete (KV v2)
await client.destroy('myapp/secret', [1, 2]);
```

### Mount Detection

```typescript
// Auto-detect KV version
const mountInfo = await client.getMountInfo('secret');
const kvVersion = mountInfo.options?.version === '2'
  ? VaultKVVersion.V2
  : VaultKVVersion.V1;

client.setKVVersion(kvVersion);
```

## Security Considerations

1. **Token Management**: Never commit tokens to source control
2. **Least Privilege**: Use policies with minimum required permissions
3. **Token Renewal**: Implement token renewal for long-running processes
4. **TLS**: Always use HTTPS in production
5. **Audit**: Enable Vault audit logging
6. **Namespaces**: Use Vault namespaces for multi-tenancy (Enterprise)

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
curl -k https://vault.example.com:8200/v1/sys/health

# Verify token
vault login $VAULT_TOKEN
```

### Permission Issues

```bash
# Check current token capabilities
vault token capabilities secret/myapp/database

# View token info
vault token lookup
```

### Debug Mode

Enable debug logging:

```bash
export VAULT_LOG_LEVEL=debug
```

## Integration with MCP Server

The Vault tools are automatically registered with the MCP server:

```typescript
import { registerVaultTools, getVaultToolDefinitions } from './tools/vault/index.js';

// Register tools
registerVaultTools(server);

// Get tool definitions
const tools = getVaultToolDefinitions();
```

## Testing

Run tests with:

```bash
npm test
```

Set test environment variables:

```bash
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=root
```

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault API Documentation](https://www.vaultproject.io/api-docs)
- [KV Secrets Engine v2](https://www.vaultproject.io/docs/secrets/kv/kv-v2)
