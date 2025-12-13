---
name: secrets
description: Secure secret management - get, set, list, rotate, and audit secrets
category: security
tags: [secrets, security, encryption, credentials]
---

# Secrets Management CLI

Manage secrets securely across multiple storage backends (local encrypted files, environment variables, Azure Key Vault).

## Commands

### Get Secret Value

Retrieve a secret value from storage:

```bash
/secrets get <name> [--provider <provider>] [--version <version>] [--required]
```

**Parameters:**
- `<name>` - Secret name (e.g., `api-key-stripe`)
- `--provider` - Specific provider to use (local, env, azure-keyvault)
- `--version` - Specific version to retrieve (default: latest)
- `--required` - Throw error if secret not found (default: false)

**Examples:**
```bash
# Get latest version of a secret
/secrets get api-key-stripe

# Get from specific provider
/secrets get database-password --provider azure-keyvault

# Get specific version
/secrets get api-token --version 2

# Require secret to exist
/secrets get required-config --required
```

**Output:**
```
Secret: api-key-stripe
Provider: local
Version: 3
Value: sk_live_***************************xyz
Created: 2025-12-01T10:30:00Z
Updated: 2025-12-10T15:45:00Z
Scope: global
Tags: production, stripe, payment
```

**Security Note:** Secret value is masked in output except for last 3 characters. Use `--show-full` to display complete value (use with caution).

---

### Set Secret Value

Store a secret value securely:

```bash
/secrets set <name> <value> [--provider <provider>] [--scope <scope>] [--expires <duration>] [--tags <tags>]
```

**Parameters:**
- `<name>` - Secret name (kebab-case, 3-128 chars)
- `<value>` - Secret value (will be encrypted)
- `--provider` - Provider to store in (default: local)
- `--scope` - Access scope (global, plugin, agent, user)
- `--expires` - Expiration duration (e.g., 30d, 24h, 2025-12-31)
- `--tags` - Comma-separated tags (e.g., production,database)

**Examples:**
```bash
# Set a simple secret
/secrets set api-key-github ghp_abc123xyz789

# Set with expiration
/secrets set temp-token xyz123 --expires 24h

# Set with scope and tags
/secrets set db-password secret123 --scope plugin --tags production,database

# Store in Azure Key Vault
/secrets set prod-api-key abc123 --provider azure-keyvault --scope global
```

**Output:**
```
✓ Secret 'api-key-github' stored successfully
  Provider: local
  Version: 1
  Scope: global
  Created: 2025-12-12T16:30:00Z
```

**Security Note:** Secret value is never logged or displayed after storage.

---

### List Secrets

List all secrets matching filter criteria:

```bash
/secrets list [--pattern <pattern>] [--provider <provider>] [--scope <scope>] [--tags <tags>] [--include-expired]
```

**Parameters:**
- `--pattern` - Name pattern with wildcards (e.g., `api-key-*`)
- `--provider` - Filter by provider
- `--scope` - Filter by scope
- `--tags` - Filter by tags (comma-separated)
- `--include-expired` - Include expired secrets (default: false)

**Examples:**
```bash
# List all secrets
/secrets list

# List API keys
/secrets list --pattern "api-key-*"

# List production secrets
/secrets list --tags production

# List secrets in specific scope
/secrets list --scope plugin

# List from specific provider
/secrets list --provider azure-keyvault
```

**Output:**
```
Secrets (12 total):

┌─────────────────────┬──────────┬─────────┬─────────┬────────────────┐
│ Name                │ Provider │ Version │ Scope   │ Tags           │
├─────────────────────┼──────────┼─────────┼─────────┼────────────────┤
│ api-key-stripe      │ local    │ 3       │ global  │ prod, payment  │
│ api-key-github      │ env      │ 1       │ global  │ dev, git       │
│ database-password   │ azure-kv │ 2       │ plugin  │ prod, db       │
│ ...                 │          │         │         │                │
└─────────────────────┴──────────┴─────────┴─────────┴────────────────┘
```

---

### Rotate Secret

Rotate a secret to a new value while maintaining version history:

```bash
/secrets rotate <name> <new-value> [--provider <provider>] [--expire-old]
```

**Parameters:**
- `<name>` - Secret name to rotate
- `<new-value>` - New secret value
- `--provider` - Provider to rotate in (default: same as current)
- `--expire-old` - Immediately expire old version (default: false)

**Examples:**
```bash
# Rotate to new value
/secrets rotate api-token new_token_value

# Rotate and expire old version
/secrets rotate database-password new_pass123 --expire-old

# Rotate in specific provider
/secrets rotate api-key abc123 --provider azure-keyvault
```

**Output:**
```
✓ Secret 'api-token' rotated successfully
  Old version: 2 (still valid for 30 days)
  New version: 3
  Provider: local
```

**Best Practice:** Rotate secrets regularly (e.g., every 90 days) and configure applications to gracefully handle both old and new versions during rotation.

---

### View Access Audit Log

View access audit log for a secret:

```bash
/secrets audit <name> [--limit <count>] [--failed-only]
```

**Parameters:**
- `<name>` - Secret name to audit
- `--limit` - Number of entries to show (default: 50)
- `--failed-only` - Show only failed access attempts

**Examples:**
```bash
# View recent access
/secrets audit api-key-stripe

# View last 100 entries
/secrets audit database-password --limit 100

# View failed access attempts
/secrets audit api-token --failed-only
```

**Output:**
```
Access Log: api-key-stripe (last 50 entries)

┌────────────────────────┬──────────┬──────────┬─────────┬────────────┐
│ Timestamp              │ Accessor │ Action   │ Success │ Provider   │
├────────────────────────┼──────────┼──────────┼─────────┼────────────┤
│ 2025-12-12T16:45:23Z   │ plugin-a │ get      │ ✓       │ local      │
│ 2025-12-12T16:30:15Z   │ agent-b  │ get      │ ✓       │ local      │
│ 2025-12-12T15:20:00Z   │ unknown  │ get      │ ✗       │ -          │
│ ...                    │          │          │         │            │
└────────────────────────┴──────────┴──────────┴─────────┴────────────┘

Failed attempts: 3
Most frequent accessor: plugin-a (45 accesses)
Last rotation: 2025-12-10T15:45:00Z
```

---

### Delete Secret

Delete a secret and all its versions:

```bash
/secrets delete <name> [--provider <provider>] [--confirm]
```

**Parameters:**
- `<name>` - Secret name to delete
- `--provider` - Delete from specific provider (default: all)
- `--confirm` - Skip confirmation prompt

**Examples:**
```bash
# Delete with confirmation
/secrets delete old-api-key

# Delete from specific provider
/secrets delete temp-secret --provider local

# Delete without confirmation (use with caution)
/secrets delete obsolete-token --confirm
```

**Output:**
```
⚠ Warning: This will permanently delete secret 'old-api-key' from all providers.
  This action cannot be undone.

Are you sure? (yes/no): yes

✓ Secret 'old-api-key' deleted successfully
  Removed from: local, azure-keyvault
  Versions deleted: 5
```

---

### Health Check

Check health status of all secret providers:

```bash
/secrets health
```

**Output:**
```
Secret Provider Health:

┌──────────────────┬──────────┬──────────┬─────────────────┐
│ Provider         │ Status   │ Priority │ Last Check      │
├──────────────────┼──────────┼──────────┼─────────────────┤
│ azure-keyvault   │ ✓ OK     │ 100      │ 2025-12-12T...  │
│ local            │ ✓ OK     │ 50       │ 2025-12-12T...  │
│ env              │ ✓ OK     │ 10       │ 2025-12-12T...  │
└──────────────────┴──────────┴──────────┴─────────────────┘

All providers operational
Fallback chain: azure-keyvault → local → env
```

---

### Import Secrets

Import secrets from a file (encrypted or environment format):

```bash
/secrets import <file> [--format <format>] [--provider <provider>] [--scope <scope>]
```

**Parameters:**
- `<file>` - File path to import from
- `--format` - File format (json, env, yaml)
- `--provider` - Target provider (default: local)
- `--scope` - Scope for imported secrets

**Examples:**
```bash
# Import from .env file
/secrets import .env.production --format env --scope global

# Import from JSON
/secrets import secrets.json --format json --provider azure-keyvault

# Import from YAML
/secrets import config.yaml --format yaml --scope plugin
```

**JSON Format:**
```json
{
  "api-key-stripe": "sk_live_abc123",
  "database-password": "secret123",
  "api-token": {
    "value": "token_xyz",
    "tags": ["production", "api"],
    "expiresAt": "2025-12-31"
  }
}
```

**ENV Format:**
```bash
API_KEY_STRIPE=sk_live_abc123
DATABASE_PASSWORD=secret123
```

---

### Export Secrets

Export secret metadata (NOT values) for backup:

```bash
/secrets export [--output <file>] [--format <format>] [--include-values]
```

**Parameters:**
- `--output` - Output file path (default: stdout)
- `--format` - Output format (json, yaml, csv)
- `--include-values` - Include decrypted values (DANGEROUS - use with caution)

**Examples:**
```bash
# Export metadata only (safe)
/secrets export --output secrets-metadata.json

# Export with values (use secure channel)
/secrets export --include-values --output secrets-backup.json.enc
```

**Security Warning:** Never export secrets with `--include-values` to unencrypted files or version control. Use only for secure backup to encrypted storage.

---

## Configuration

Configure secret providers in `.claude/config/secrets.yaml`:

```yaml
secrets:
  defaultProvider: local
  enableAuditLog: true

  providers:
    local:
      storePath: .claude/secrets/local.enc.json
      masterKey: ${env:CLAUDE_SECRETS_MASTER_KEY}
      fileMode: 0600

    env:
      prefix: CLAUDE_SECRET_
      uppercaseNames: true
      allowUnprefixed: false

    azure-keyvault:
      vaultUrl: https://my-vault.vault.azure.net
      cacheTtlSeconds: 300
      maxRetries: 3

  accessControl:
    enforce: true
    defaultPermissions: [read]
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_SECRETS_MASTER_KEY` | Master encryption key for local provider | Required |
| `CLAUDE_SECRETS_PROVIDER` | Default provider to use | local |
| `CLAUDE_SECRET_*` | Environment variable secrets (with prefix) | N/A |
| `AZURE_VAULT_URL` | Azure Key Vault URL | N/A |

---

## Security Best Practices

1. **Master Key Management**
   - Store master key in secure location (environment variable, key vault)
   - Never commit master key to version control
   - Rotate master key annually

2. **Secret Rotation**
   - Rotate secrets regularly (30-90 days)
   - Use versioning to enable graceful rotation
   - Expire old versions after migration period

3. **Access Control**
   - Grant least privilege (minimum permissions needed)
   - Use scope restrictions for multi-team environments
   - Review access logs regularly for anomalies

4. **Audit Logging**
   - Enable audit logging in production
   - Monitor failed access attempts
   - Retain logs per compliance requirements (90 days - 7 years)

5. **Backup and Recovery**
   - Export metadata regularly for disaster recovery
   - Store encrypted backups in separate location
   - Test recovery procedures periodically

---

## Troubleshooting

### Secret not found
```bash
# Check which providers are configured
/secrets health

# List secrets with pattern
/secrets list --pattern "api-*"

# Try specific provider
/secrets get secret-name --provider local
```

### Access denied
```bash
# Check permissions
/secrets audit secret-name

# Verify scope matches
/secrets list --scope plugin
```

### Provider initialization failed
```bash
# Check provider health
/secrets health

# Verify configuration
cat .claude/config/secrets.yaml

# Check environment variables
echo $CLAUDE_SECRETS_MASTER_KEY
echo $AZURE_VAULT_URL
```

---

## See Also

- Encryption: `.claude/core/secrets/encryption.ts`
- Providers: `.claude/core/secrets/providers/`
- Access Control: `.claude/core/secrets/access-control.ts`
- Database Schema: `.claude/orchestration/db/secrets.sql`
