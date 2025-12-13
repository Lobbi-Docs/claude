# HashiCorp Vault - Quick Start Guide

## 5-Minute Setup

### Prerequisites

- HashiCorp Vault server running and accessible
- Vault token with appropriate permissions
- Node.js 20+ installed

### Step 1: Set Environment Variables

```bash
# Required
export VAULT_ADDR=https://vault.example.com:8200
export VAULT_TOKEN=hvs.CAESIxxx...

# Optional (for Vault Enterprise)
export VAULT_NAMESPACE=my-namespace
```

### Step 2: Install Dependencies

```bash
cd ahling-command-center/mcp-server
npm install
```

Dependencies already configured:
- `axios` (^1.6.5) - HTTP client
- `zod` (^3.22.4) - Schema validation
- `@modelcontextprotocol/sdk` (^1.0.0) - MCP SDK

### Step 3: Test the Client

```typescript
import { VaultClient, VaultKVVersion } from './src/clients/vault.client.js';

const client = new VaultClient(
  {
    address: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  },
  VaultKVVersion.V2,
  'secret'
);

// Test health
const health = await client.healthCheck();
console.log('Vault status:', health.sealed ? 'SEALED' : 'READY');

// Write and read a test secret
await client.write('test/hello', { message: 'Hello, Vault!' });
const secret = await client.read('test/hello');
console.log('Secret:', secret.data);

// Clean up
await client.delete('test/hello');
```

### Step 4: Run Example Code

```bash
# Run all examples
npm run dev -- src/tools/vault/examples.ts

# Or run specific examples
node --loader tsx src/tools/vault/examples.ts
```

### Step 5: Run Tests

```bash
# Run test suite
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Quick Reference

### Read a Secret

```typescript
const secret = await client.read('myapp/database');
console.log(secret.data);
// { username: 'dbuser', password: 'secret123' }
```

### Write a Secret

```typescript
await client.write('myapp/database', {
  username: 'dbuser',
  password: 'secret123',
});
```

### List Secrets

```typescript
const list = await client.list('myapp/');
console.log(list.keys);
// ['database', 'api-keys', 'config']
```

### Delete a Secret

```typescript
await client.delete('myapp/old-secret');
```

## Common Use Cases

### 1. Database Credentials

```typescript
// Store database credentials
await client.write('myapp/postgres', {
  host: 'postgres.example.com',
  port: 5432,
  database: 'myapp_prod',
  username: 'app_user',
  password: 'super-secret-password',
  ssl: true,
});

// Retrieve for connection
const dbCreds = await client.read('myapp/postgres');
const connectionString = `postgresql://${dbCreds.data.username}:${dbCreds.data.password}@${dbCreds.data.host}:${dbCreds.data.port}/${dbCreds.data.database}`;
```

### 2. API Keys

```typescript
// Store API keys
await client.write('myapp/integrations/stripe', {
  publishable_key: 'pk_live_xxx',
  secret_key: 'sk_live_yyy',
  webhook_secret: 'whsec_zzz',
});

// Retrieve for use
const stripe = await client.read('myapp/integrations/stripe');
const stripeClient = new Stripe(stripe.data.secret_key);
```

### 3. Configuration Secrets

```typescript
// Store app configuration
await client.write('myapp/config/prod', {
  jwt_secret: 'random-jwt-secret',
  encryption_key: 'random-encryption-key',
  session_secret: 'random-session-secret',
  admin_email: 'admin@example.com',
});

// Load on startup
const config = await client.read('myapp/config/prod');
app.use(session({ secret: config.data.session_secret }));
```

### 4. Version Management

```typescript
// Update configuration
await client.write('myapp/config', { version: '1.0', feature_flags: {} });
await client.write('myapp/config', { version: '1.1', feature_flags: { new_ui: true } });
await client.write('myapp/config', { version: '1.2', feature_flags: { new_ui: true, beta: true } });

// Read current version
const current = await client.read('myapp/config');

// Rollback to previous version
const previous = await client.read('myapp/config', { version: 2 });
await client.write('myapp/config', previous.data);
```

### 5. Optimistic Locking

```typescript
// Increment counter safely
async function incrementCounter(path: string) {
  const current = await client.read(path);
  const currentVersion = current.metadata.version;

  try {
    await client.write(
      path,
      { count: current.data.count + 1 },
      { cas: currentVersion }
    );
    return true;
  } catch (error) {
    if (error.statusCode === 400) {
      console.log('Concurrent modification, retry');
      return incrementCounter(path); // Retry
    }
    throw error;
  }
}
```

## MCP Tools Usage

When using through MCP server, the tools are available as:

### vault_read

```json
{
  "name": "vault_read",
  "arguments": {
    "path": "myapp/database",
    "version": 2
  }
}
```

### vault_write

```json
{
  "name": "vault_write",
  "arguments": {
    "path": "myapp/database",
    "data": {
      "username": "dbuser",
      "password": "secret123"
    }
  }
}
```

### vault_list

```json
{
  "name": "vault_list",
  "arguments": {
    "path": "myapp/"
  }
}
```

### vault_delete

```json
{
  "name": "vault_delete",
  "arguments": {
    "path": "myapp/old-secret"
  }
}
```

## Troubleshooting

### "No response from Vault"

```bash
# Check connectivity
curl -k $VAULT_ADDR/v1/sys/health

# Check environment variable
echo $VAULT_ADDR
```

### "Permission denied"

```bash
# Verify token
vault token lookup

# Check capabilities
vault token capabilities secret/myapp/database
```

### "Vault is sealed"

```bash
# Check status
vault status

# Unseal if needed
vault operator unseal
```

### "Secret not found"

```bash
# List available secrets
vault kv list secret/

# Check path
vault kv get secret/myapp/database
```

## Next Steps

1. **Read the Full Documentation**: `VAULT_INTEGRATION.md`
2. **Review Examples**: `src/tools/vault/examples.ts`
3. **Run Tests**: `npm test`
4. **Explore Advanced Features**:
   - Version management
   - Check-And-Set (CAS)
   - Mount detection
   - Health monitoring

## Resources

- **Client Code**: `src/clients/vault.client.ts`
- **MCP Tools**: `src/tools/vault/index.ts`
- **Type Definitions**: `src/types/vault.types.ts`
- **Examples**: `src/tools/vault/examples.ts`
- **Tests**: `src/clients/vault.client.test.ts`
- **Full Docs**: `VAULT_INTEGRATION.md`

## Support Matrix

| Feature | KV v1 | KV v2 |
|---------|-------|-------|
| Read | ✅ | ✅ |
| Write | ✅ | ✅ |
| List | ✅ | ✅ |
| Delete | ✅ (permanent) | ✅ (soft) |
| Versioning | ❌ | ✅ |
| Metadata | ❌ | ✅ |
| Undelete | ❌ | ✅ |
| Destroy | ❌ | ✅ |
| Check-And-Set | ❌ | ✅ |

## Best Practices

1. **Always use KV v2** unless you have a specific reason to use v1
2. **Enable versioning** for audit trail and rollback capability
3. **Use Check-And-Set** for concurrent modification protection
4. **Implement token rotation** for security
5. **Monitor health status** before operations
6. **Use namespaces** for multi-tenancy (Enterprise)
7. **Never commit tokens** to source control
8. **Use least privilege** policies

---

**Ready to use!** Start with the examples above or run `npm run dev -- src/tools/vault/examples.ts`
