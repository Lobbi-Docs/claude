# Secrets Management Integration

Enterprise-grade secret management system for secure storage and retrieval of sensitive configuration data across multiple backend providers.

## Business Value

This solution establishes a **robust, scalable secrets management infrastructure** that:

- **Eliminates hardcoded credentials** by centralizing secret storage with encryption at rest
- **Supports multiple environments** from local development to enterprise cloud deployments
- **Enables compliance** with SOC2, HIPAA, and GDPR through comprehensive audit logging
- **Reduces security risk** through role-based access control and automatic rotation
- **Improves developer experience** with unified API across all storage backends
- **Scales with your organization** from single developer to multi-team enterprises

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (Plugins, Agents, CLI Commands, Configuration)             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Secret Manager (Unified API)               │
│  • Multi-provider coordination                              │
│  • Automatic failover                                       │
│  • Template substitution                                    │
│  • Audit logging                                            │
└───────┬────────────┬──────────────┬─────────────────────────┘
        │            │              │
        ▼            ▼              ▼
┌──────────┐  ┌───────────┐  ┌─────────────────┐
│  Local   │  │ Env Vars  │  │ Azure Key Vault │
│ Provider │  │ Provider  │  │    Provider     │
└────┬─────┘  └─────┬─────┘  └────────┬────────┘
     │              │                 │
     ▼              ▼                 ▼
┌──────────┐  ┌───────────┐  ┌─────────────────┐
│Encrypted │  │ Process   │  │  Azure Cloud    │
│   JSON   │  │   Env     │  │   HSM Storage   │
└──────────┘  └───────────┘  └─────────────────┘
```

## Quick Start

### 1. Installation

The secrets management system is built into the Claude Core package:

```bash
cd .claude/core
npm install
```

### 2. Initialize with Environment Variables

Create a `.env` file:

```bash
# Master encryption key (32 bytes, base64 encoded)
CLAUDE_SECRETS_MASTER_KEY=<generate with: openssl rand -base64 32>

# Optional: Azure Key Vault (for production)
AZURE_VAULT_URL=https://my-vault.vault.azure.net

# Optional: Custom environment variable prefix
CLAUDE_SECRET_PREFIX=CLAUDE_SECRET_
```

### 3. Basic Usage

```typescript
import { createSecretManagerFromEnv } from '@claude/core/secrets';

// Initialize from environment variables
const secretManager = await createSecretManagerFromEnv();

// Store a secret
await secretManager.set('api-key-stripe', 'sk_live_abc123...', {
  scope: 'global',
  tags: ['production', 'payment'],
  expiresAt: '90d', // Expire in 90 days
});

// Retrieve a secret
const secret = await secretManager.get('api-key-stripe', {
  required: true,
  accessor: 'payment-plugin',
});

console.log(secret.value); // sk_live_abc123...
console.log(secret.metadata.version); // 1
```

## Providers

### Local Provider

**Best for:** Development, small deployments, offline environments

```typescript
import { LocalSecretProvider } from '@claude/core/secrets';

const provider = new LocalSecretProvider({
  storePath: '.claude/secrets/local.enc.json',
  masterKey: process.env.CLAUDE_SECRETS_MASTER_KEY,
  createIfMissing: true,
  fileMode: 0o600, // Owner read/write only
});

await provider.initialize();
```

**Features:**
- AES-256-GCM encryption at rest
- PBKDF2 key derivation (100,000 iterations)
- Versioning support
- File permission enforcement
- Automatic backup before destructive operations

**Security:**
- Secrets encrypted in JSON file
- Master key never stored (only hash for verification)
- File readable only by owner (Unix permissions)

---

### Environment Variable Provider

**Best for:** Container deployments, CI/CD, platform-as-a-service

```typescript
import { EnvSecretProvider } from '@claude/core/secrets';

const provider = new EnvSecretProvider({
  prefix: 'CLAUDE_SECRET_',
  uppercaseNames: true,
  allowUnprefixed: false,
});

await provider.initialize();
```

**Features:**
- Zero-configuration setup
- Standard deployment pattern support
- Prefix filtering for namespacing
- Read-only (cannot modify at runtime)

**Environment Variables:**
```bash
# With prefix (default)
CLAUDE_SECRET_API_KEY_STRIPE=sk_live_abc123
CLAUDE_SECRET_DATABASE_PASSWORD=secret123

# Unprefixed (if allowUnprefixed: true)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Limitations:**
- Read-only (no write, rotate, or delete)
- No versioning or expiration
- No encryption at rest (OS security only)
- Secrets visible in process environment

---

### Azure Key Vault Provider

**Best for:** Production deployments, enterprise environments, compliance requirements

```typescript
import { AzureKeyVaultProvider } from '@claude/core/secrets';

const provider = new AzureKeyVaultProvider({
  vaultUrl: 'https://my-vault.vault.azure.net',
  cacheTtlSeconds: 300, // 5 minute cache
  maxRetries: 3,
});

await provider.initialize();
```

**Prerequisites:**
```bash
npm install @azure/keyvault-secrets @azure/identity
```

**Features:**
- Hardware security module (HSM) backing
- Managed identity authentication
- Automatic versioning
- High availability with Azure SLA
- Audit logging via Azure Monitor
- In-memory caching with TTL
- Exponential backoff retry logic

**Authentication:**
- Managed Identity (recommended for Azure deployments)
- Service Principal (client ID + secret)
- Developer credentials (Azure CLI)

**Environment Variables:**
```bash
AZURE_VAULT_URL=https://my-vault.vault.azure.net

# For service principal authentication
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...

# For managed identity (no credentials needed)
# Set identity in Azure resource (App Service, VM, Container Instance)
```

## Secret Manager

The Secret Manager provides a unified API across all providers with automatic failover:

```typescript
import { SecretManager } from '@claude/core/secrets';

const manager = new SecretManager({
  providers: [
    new AzureKeyVaultProvider({ vaultUrl: '...' }), // Priority 100
    new LocalSecretProvider({ storePath: '...' }),  // Priority 50
    new EnvSecretProvider({ prefix: '...' }),       // Priority 10
  ],
  defaultWriteProvider: 'local',
  enableAuditLog: true,
});

await manager.initialize();
```

### Get Secret

```typescript
// Simple get
const secret = await manager.get('api-key-stripe');

// With options
const secret = await manager.get('database-password', {
  required: true,         // Throw if not found
  version: 2,             // Specific version
  provider: 'azure-kv',   // Specific provider
  accessor: 'db-plugin',  // For audit log
});
```

### Set Secret

```typescript
await manager.set('api-key-github', 'ghp_abc123...', {
  provider: 'local',
  scope: 'plugin',
  tags: ['development', 'git'],
  expiresAt: '30d', // or ISO timestamp
  actor: 'admin',   // For audit log
});
```

### Rotate Secret

```typescript
await manager.rotate('database-password', {
  newValue: 'new_secure_password',
  actor: 'admin',
  expireOldVersion: false, // Keep old version valid
});
```

### List Secrets

```typescript
const secrets = await manager.list({
  pattern: 'api-key-*',
  scope: 'global',
  tags: ['production'],
  provider: 'azure-keyvault',
  includeExpired: false,
});
```

### Template Substitution

```typescript
const config = {
  stripe: {
    apiKey: '${secret:api-key-stripe}',
    webhookSecret: '${secret:webhook-secret-stripe}',
  },
  database: {
    url: '${secret:database-url:postgresql://localhost}', // with default
  },
};

const resolved = await manager.substituteSecrets(config, {
  accessor: 'app-init',
});

// Result:
// {
//   stripe: {
//     apiKey: 'sk_live_abc123...',
//     webhookSecret: 'whsec_xyz789...',
//   },
//   database: {
//     url: 'postgresql://prod-db...',
//   },
// }
```

## Access Control

Role-based access control with scope isolation:

```typescript
import { SecretAccessControl } from '@claude/core/secrets';

const accessControl = new SecretAccessControl({
  enforceAccessControl: true,
  defaultPermissions: ['read'],
});

// Grant permissions
await accessControl.grant(
  'api-key-stripe',      // Secret ID or pattern
  'payment-plugin',      // Who to grant to
  'read',                // Permission level
  {
    scope: 'plugin',
    expiresAt: '2025-12-31', // Optional expiration
  }
);

// Check permission before access
await accessControl.checkPermission(
  'api-key-stripe',
  'payment-plugin',
  'read',
  'plugin'
);

// Revoke permission
await accessControl.revoke('api-key-stripe', 'payment-plugin');
```

**Permission Levels:**
- `read` - Get secret value
- `write` - Set secret value
- `delete` - Delete secret
- `rotate` - Rotate secret to new value
- `admin` - All permissions

**Scope Isolation:**
- `global` - Accessible to all (default)
- `plugin` - Plugin-specific secrets
- `agent` - Agent-specific secrets
- `user` - User-specific secrets

## Database Schema

Persistent storage for metadata, audit logs, and permissions:

```bash
# Initialize database
cd .claude/orchestration/db
sqlite3 secrets.db < secrets.sql
```

**Tables:**
- `secrets` - Secret metadata (not values)
- `secret_access_log` - Audit trail
- `secret_permissions` - Access control rules
- `encryption_keys` - Key lifecycle tracking
- `secret_versions` - Version history

**Views:**
- `active_secrets` - Non-expired secrets
- `recent_access_log` - Last 1000 access entries
- `failed_access_attempts` - Security monitoring
- `active_permissions` - Current permission grants
- `rotation_history` - Secret rotation tracking

## CLI Commands

Interactive secret management:

```bash
# Get secret
/secrets get api-key-stripe

# Set secret
/secrets set api-key-github ghp_abc123 --tags production,git

# List secrets
/secrets list --pattern "api-*" --tags production

# Rotate secret
/secrets rotate database-password new_password --expire-old

# Audit log
/secrets audit api-key-stripe --limit 100

# Health check
/secrets health

# Delete secret
/secrets delete old-api-key --confirm
```

See `.claude/commands/secrets.md` for full CLI documentation.

## Security Best Practices

### 1. Master Key Management

```bash
# Generate strong master key (32 bytes)
openssl rand -base64 32

# Store in secure location
export CLAUDE_SECRETS_MASTER_KEY="<generated-key>"

# For production, use Azure Key Vault or similar
az keyvault secret set \
  --vault-name my-vault \
  --name claude-master-key \
  --value "<generated-key>"
```

**Never:**
- Commit master key to version control
- Share master key via email/chat
- Use weak or predictable keys

### 2. Secret Rotation

```typescript
// Rotate secrets regularly (30-90 days)
setInterval(async () => {
  const expiring = await manager.list({
    // Secrets not rotated in 90 days
    pattern: '*',
  });

  for (const secret of expiring) {
    const daysSinceUpdate =
      (Date.now() - new Date(secret.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 90) {
      console.warn(`Secret ${secret.name} needs rotation`);
      // Trigger rotation workflow
    }
  }
}, 24 * 60 * 60 * 1000); // Daily check
```

### 3. Access Control

```typescript
// Grant least privilege
await accessControl.grant('database-password', 'db-plugin', 'read', {
  scope: 'plugin',
  expiresAt: '30d', // Temporary access
});

// Use wildcard patterns for groups
await accessControl.grant('api-key-*', 'api-consumer', 'read', {
  scope: 'global',
});

// Review permissions regularly
const permissions = await accessControl.listPermissions('api-key-stripe');
```

### 4. Audit Logging

```typescript
// Enable audit logging
const manager = new SecretManager({
  providers: [...],
  enableAuditLog: true,
  auditLogCallback: async (entry) => {
    // Send to monitoring system
    await sendToSplunk(entry);

    // Alert on failures
    if (!entry.success) {
      await alertSecurityTeam(entry);
    }
  },
});

// Query audit log
const failedAttempts = await db.query(`
  SELECT * FROM secret_access_log
  WHERE success = 0
  AND timestamp >= datetime('now', '-24 hours')
  ORDER BY timestamp DESC
`);
```

### 5. Backup and Recovery

```typescript
// Export metadata for backup (NOT values)
const metadata = await manager.list();
await fs.writeFile(
  'secrets-metadata-backup.json',
  JSON.stringify(metadata, null, 2)
);

// Export permissions
const permissions = accessControl.exportPermissions();
await fs.writeFile(
  'permissions-backup.json',
  JSON.stringify(permissions, null, 2)
);

// Restore permissions
await accessControl.importPermissions(permissions);
```

## Deployment Patterns

### Local Development

```bash
# .env.local
CLAUDE_SECRETS_MASTER_KEY=<generate-key>
CLAUDE_SECRETS_PROVIDER=local
CLAUDE_SECRETS_LOCAL_PATH=.claude/secrets/local.enc.json
```

### CI/CD Pipeline

```yaml
# GitHub Actions
env:
  CLAUDE_SECRET_API_KEY_GITHUB: ${{ secrets.API_KEY_GITHUB }}
  CLAUDE_SECRET_NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  CLAUDE_SECRETS_PROVIDER: env
```

### Docker Container

```dockerfile
ENV CLAUDE_SECRETS_PROVIDER=env
ENV CLAUDE_SECRET_DATABASE_URL=postgresql://...
ENV CLAUDE_SECRET_REDIS_URL=redis://...
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: claude-secrets
type: Opaque
stringData:
  master-key: <base64-encoded-key>
---
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: claude
      env:
        - name: CLAUDE_SECRETS_MASTER_KEY
          valueFrom:
            secretKeyRef:
              name: claude-secrets
              key: master-key
        - name: CLAUDE_SECRETS_PROVIDER
          value: local
```

### Azure Production

```bash
# Use managed identity (no credentials needed)
AZURE_VAULT_URL=https://my-vault.vault.azure.net
CLAUDE_SECRETS_PROVIDER=azure-keyvault

# Fallback to local for non-cloud secrets
CLAUDE_SECRETS_MASTER_KEY=<from-key-vault>
```

## Monitoring and Alerting

### Metrics to Track

```typescript
// Secret access rate
SELECT COUNT(*) as access_count
FROM secret_access_log
WHERE timestamp >= datetime('now', '-1 hour')
GROUP BY strftime('%Y-%m-%d %H:00', timestamp);

// Failed access attempts
SELECT accessor, COUNT(*) as failed_attempts
FROM secret_access_log
WHERE success = 0
AND timestamp >= datetime('now', '-24 hours')
GROUP BY accessor
HAVING failed_attempts > 5;

// Secrets expiring soon
SELECT name, expires_at,
  julianday(expires_at) - julianday('now') as days_until_expiry
FROM secrets
WHERE expires_at IS NOT NULL
AND days_until_expiry < 30
ORDER BY days_until_expiry ASC;

// Secrets never rotated
SELECT name, updated_at,
  julianday('now') - julianday(updated_at) as days_since_update
FROM secrets
WHERE days_since_update > 90
ORDER BY days_since_update DESC;
```

### Alerts

```typescript
// Alert on multiple failed access attempts
if (failedAttempts > 5) {
  await sendAlert({
    severity: 'high',
    message: `Multiple failed secret access attempts by ${accessor}`,
    details: failedAttempts,
  });
}

// Alert on secrets expiring soon
if (daysUntilExpiry < 7) {
  await sendAlert({
    severity: 'medium',
    message: `Secret ${name} expires in ${daysUntilExpiry} days`,
  });
}
```

## Troubleshooting

### Provider Initialization Failed

```bash
# Check provider health
/secrets health

# Verify configuration
cat .claude/config/secrets.yaml

# Test connectivity (Azure Key Vault)
az keyvault secret list --vault-name my-vault

# Check file permissions (local provider)
ls -la .claude/secrets/local.enc.json
```

### Access Denied

```bash
# Check permissions
/secrets audit api-key-stripe --failed-only

# List permissions
SELECT * FROM secret_permissions
WHERE secret_id = 'api-key-stripe'
AND granted_to = 'my-plugin';

# Grant permission
/secrets grant api-key-stripe my-plugin read
```

### Secret Not Found

```bash
# List all secrets
/secrets list

# Check specific provider
/secrets list --provider azure-keyvault

# Try with pattern
/secrets list --pattern "api-*"
```

## Performance Considerations

- **Local Provider:** ~1ms per operation (filesystem I/O)
- **Environment Provider:** <1ms per operation (memory lookup)
- **Azure Key Vault:** ~50-200ms per operation (network + cache)

**Optimization:**
- Enable caching for Azure Key Vault (default: 5 minutes)
- Use environment provider for frequently accessed secrets
- Batch secret retrieval during initialization
- Monitor cache hit rate

## Compliance Support

- **SOC2:** Audit logging, access control, encryption at rest
- **HIPAA:** PHI encryption, audit trails, access restrictions
- **GDPR:** Right to erasure (delete), access logs, data minimization
- **PCI-DSS:** Key rotation, access control, audit logging (90 days)

## See Also

- [API Documentation](./index.ts)
- [CLI Reference](../../commands/secrets.md)
- [Database Schema](../../orchestration/db/secrets.sql)
- [Security Best Practices](https://docs.microsoft.com/azure/key-vault/general/best-practices)
