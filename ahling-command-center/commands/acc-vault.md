---
description: Manage HashiCorp Vault secrets - set, get, list, rotate, and backup
argument-hint: "<operation> [path] [--key KEY] [--value VALUE]"
allowed-tools: ["Bash", "Read", "Write"]
---

Manage HashiCorp Vault secrets for ACC services including setting secrets, retrieving values, listing paths, rotating credentials, and backing up secret data.

## Your Task

You are managing Vault secrets for the Ahling Command Center. Perform Vault operations securely, validate paths, handle secret rotation, and maintain secret backups.

## Arguments

- `operation` (required): Operation to perform (set, get, list, rotate, backup, restore)
- `path` (optional): Vault secret path (e.g., secret/services/ollama)
- `--key` (optional): Secret key name
- `--value` (optional): Secret value (for set operation)
- `--file` (optional): File containing secrets (JSON format)
- `--rotate` (optional): Auto-rotate database credentials

## Steps to Execute

### 1. Verify Vault Connectivity

```bash
# Check Vault status
vault status || {
  echo "Error: Vault is not accessible at $VAULT_ADDR"
  exit 1
}

# Verify authentication
vault token lookup > /dev/null 2>&1 || {
  echo "Error: Invalid or expired Vault token"
  exit 1
}

# Check token capabilities
vault token capabilities $VAULT_TOKEN secret/services/* | grep -q "read" || {
  echo "Warning: Token may not have read access to secret/services/*"
}
```

### 2. Operation: SET Secret

```bash
set_secret() {
  PATH=$1
  KEY=$2
  VALUE=$3

  # Validate path format
  if [[ ! "$PATH" =~ ^secret/ ]]; then
    echo "Error: Path must start with 'secret/'"
    exit 1
  fi

  # Generate secure value if not provided
  if [ -z "$VALUE" ]; then
    VALUE=$(openssl rand -base64 32)
    echo "Generated secure random value"
  fi

  # Check if secret exists
  if vault kv get $PATH > /dev/null 2>&1; then
    echo "Secret exists. Updating..."
    vault kv patch $PATH $KEY="$VALUE"
  else
    echo "Creating new secret..."
    vault kv put $PATH $KEY="$VALUE"
  fi

  echo "✅ Secret set: $PATH/$KEY"
}

# Usage
set_secret "secret/services/ollama" "api_key" "${VALUE}"
```

### 3. Operation: GET Secret

```bash
get_secret() {
  PATH=$1
  KEY=$2

  if [ -n "$KEY" ]; then
    # Get specific key
    vault kv get -field=$KEY $PATH 2>/dev/null || {
      echo "Error: Key '$KEY' not found at $PATH"
      exit 1
    }
  else
    # Get entire secret
    vault kv get -format=json $PATH | jq -r '.data.data'
  fi
}

# Usage
get_secret "secret/services/ollama" "api_key"
```

### 4. Operation: LIST Secrets

```bash
list_secrets() {
  BASE_PATH=$1

  echo "Secrets under $BASE_PATH:"
  echo "================================"

  # List all paths
  vault kv list -format=json $BASE_PATH | jq -r '.[]' | while read path; do
    full_path="$BASE_PATH/$path"

    # Check if it's a directory (ends with /)
    if [[ "$path" == */ ]]; then
      echo "📁 $path"
      # Recursively list subdirectories
      list_secrets "$full_path"
    else
      # Get secret metadata
      metadata=$(vault kv metadata get -format=json "$BASE_PATH/$path" 2>/dev/null)
      version=$(echo $metadata | jq -r '.current_version // "?"')
      created=$(echo $metadata | jq -r '.created_time // "unknown"')

      echo "🔑 $path (v$version, created: $created)"

      # List keys if verbose
      if [ "$VERBOSE" = "true" ]; then
        vault kv get -format=json "$BASE_PATH/$path" | jq -r '.data.data | keys[]' | while read key; do
          echo "   - $key"
        done
      fi
    fi
  done
}

# Usage
list_secrets "secret/services"
```

### 5. Operation: ROTATE Credentials

```bash
rotate_secret() {
  PATH=$1
  TYPE=$2  # database, api-key, jwt, etc.

  echo "Rotating secret: $PATH ($TYPE)"

  case $TYPE in
    "database")
      rotate_database_password "$PATH"
      ;;
    "api-key")
      rotate_api_key "$PATH"
      ;;
    "jwt")
      rotate_jwt_secret "$PATH"
      ;;
    *)
      rotate_generic_secret "$PATH"
      ;;
  esac
}

rotate_database_password() {
  PATH=$1

  # Get current credentials
  OLD_USER=$(vault kv get -field=user $PATH)
  OLD_PASS=$(vault kv get -field=password $PATH)
  DB_HOST=$(vault kv get -field=host $PATH)

  # Generate new password
  NEW_PASS=$(openssl rand -base64 32)

  # Update password in database
  PGPASSWORD=$OLD_PASS psql -h $DB_HOST -U $OLD_USER -c "ALTER USER $OLD_USER PASSWORD '$NEW_PASS';" || {
    echo "Error: Failed to update password in database"
    exit 1
  }

  # Update Vault
  vault kv patch $PATH password="$NEW_PASS"

  echo "✅ Database password rotated for $OLD_USER"
  echo "⚠️  Restart services using this credential"
}

rotate_api_key() {
  PATH=$1

  # Generate new API key (32 bytes, hex encoded)
  NEW_KEY=$(openssl rand -hex 32)

  # Store old key with timestamp for grace period
  OLD_KEY=$(vault kv get -field=key $PATH)
  TIMESTAMP=$(date +%s)

  vault kv patch $PATH \
    key="$NEW_KEY" \
    old_key_$TIMESTAMP="$OLD_KEY"

  echo "✅ API key rotated at $PATH"
  echo "Old key stored as old_key_$TIMESTAMP (remove after grace period)"
}

rotate_jwt_secret() {
  PATH=$1

  # Generate new JWT secret (64 bytes for strong security)
  NEW_SECRET=$(openssl rand -base64 64)

  vault kv patch $PATH secret="$NEW_SECRET"

  echo "✅ JWT secret rotated at $PATH"
  echo "⚠️  All existing tokens are now invalid"
}

rotate_generic_secret() {
  PATH=$1

  # Get all keys
  KEYS=$(vault kv get -format=json $PATH | jq -r '.data.data | keys[]')

  for KEY in $KEYS; do
    # Generate new value
    NEW_VALUE=$(openssl rand -base64 32)
    vault kv patch $PATH $KEY="$NEW_VALUE"
    echo "Rotated: $KEY"
  done

  echo "✅ All secrets rotated at $PATH"
}
```

### 6. Operation: BACKUP Secrets

```bash
backup_secrets() {
  BASE_PATH=$1
  BACKUP_FILE=$2

  echo "Backing up secrets from $BASE_PATH..."

  # Create backup directory
  BACKUP_DIR="${ACC_BACKUP_PATH}/vault/$(date +%Y%m%d_%H%M%S)"
  mkdir -p $BACKUP_DIR

  # Export all secrets
  export_secrets() {
    PATH=$1

    vault kv list -format=json $PATH 2>/dev/null | jq -r '.[]' | while read item; do
      if [[ "$item" == */ ]]; then
        # Directory - recurse
        export_secrets "$PATH/$item"
      else
        # Secret - export
        SECRET_PATH="$PATH/$item"
        vault kv get -format=json $SECRET_PATH > "$BACKUP_DIR/${SECRET_PATH//\//_}.json"
        echo "Backed up: $SECRET_PATH"
      fi
    done
  }

  export_secrets $BASE_PATH

  # Create encrypted archive
  BACKUP_FILE="${BACKUP_DIR}/vault_backup_$(date +%Y%m%d_%H%M%S).tar.gz.gpg"

  tar czf - -C $BACKUP_DIR . | gpg --symmetric --cipher-algo AES256 -o $BACKUP_FILE

  echo "✅ Backup created: $BACKUP_FILE"
  echo "⚠️  Store backup password securely!"

  # Clean up unencrypted files
  find $BACKUP_DIR -name "*.json" -delete

  # Generate backup manifest
  cat > "$BACKUP_DIR/manifest.txt" <<EOF
Vault Backup Manifest
=====================
Date: $(date)
Source: $BASE_PATH
Vault Address: $VAULT_ADDR
Secrets Count: $(find $BACKUP_DIR -name "*.json" | wc -l)
Backup File: $BACKUP_FILE
EOF

  echo "Manifest created: $BACKUP_DIR/manifest.txt"
}

# Usage
backup_secrets "secret/services" "${ACC_BACKUP_PATH}/vault_backup.tar.gz.gpg"
```

### 7. Operation: RESTORE Secrets

```bash
restore_secrets() {
  BACKUP_FILE=$1

  echo "Restoring secrets from $BACKUP_FILE..."

  # Decrypt and extract
  TEMP_DIR=$(mktemp -d)
  gpg --decrypt $BACKUP_FILE | tar xzf - -C $TEMP_DIR

  # Restore each secret
  find $TEMP_DIR -name "*.json" | while read file; do
    # Extract path from filename
    PATH=$(basename $file .json | tr '_' '/')

    # Read secret data
    DATA=$(cat $file | jq -r '.data.data')

    # Restore to Vault
    echo $DATA | vault kv put $PATH -

    echo "Restored: $PATH"
  done

  # Clean up
  rm -rf $TEMP_DIR

  echo "✅ Secrets restored from backup"
}
```

### 8. Common Secret Patterns for ACC

```bash
# Initialize all ACC service secrets
init_acc_secrets() {

  echo "Initializing ACC secrets..."

  # Foundation services
  vault kv put secret/services/postgres \
    password=$(openssl rand -base64 32) \
    replication_password=$(openssl rand -base64 32)

  vault kv put secret/services/redis \
    password=$(openssl rand -base64 32)

  vault kv put secret/services/minio \
    root_user="admin" \
    root_password=$(openssl rand -base64 32) \
    access_key=$(openssl rand -hex 20) \
    secret_key=$(openssl rand -base64 32)

  # AI services
  vault kv put secret/services/ollama \
    api_key=$(openssl rand -hex 32)

  vault kv put secret/services/qdrant \
    api_key=$(openssl rand -hex 32)

  vault kv put secret/services/langfuse \
    nextauth_secret=$(openssl rand -base64 64) \
    salt=$(openssl rand -base64 32)

  # Home Assistant
  vault kv put secret/services/home-assistant \
    secret_key=$(openssl rand -base64 64) \
    webhook_id=$(uuidgen)

  vault kv put secret/services/mqtt \
    username="acc_mqtt" \
    password=$(openssl rand -base64 32)

  # Neo4j
  vault kv put secret/services/neo4j \
    password=$(openssl rand -base64 32) \
    bolt_password=$(openssl rand -base64 32)

  echo "✅ All ACC secrets initialized"
  echo "Run /acc:vault list secret/services to view"
}
```

### 9. Generate Vault Report

```bash
generate_vault_report() {
  cat <<EOF
# Vault Secret Management Report

**Date:** $(date)
**Vault Address:** $VAULT_ADDR

## Vault Status
- Sealed: $(vault status -format=json | jq -r '.sealed')
- Version: $(vault status -format=json | jq -r '.version')
- HA Enabled: $(vault status -format=json | jq -r '.ha_enabled')

## Secret Statistics
- Total Paths: $(vault kv list -format=json secret/services | jq '. | length')
- Services Configured: $(vault kv list secret/services | wc -l)

## Recent Operations
- Last Backup: $(ls -t ${ACC_BACKUP_PATH}/vault/*.tar.gz.gpg | head -1)
- Last Rotation: [Check rotation log]

## Service Secrets
$(vault kv list secret/services | while read service; do
  echo "- $service"
done)

## Security Recommendations
- ✅ Vault is sealed/unsealed properly
- ⚠️  Rotate secrets every 90 days
- ⚠️  Backup secrets weekly
- ✅ Use strong passwords (32+ bytes)
- ⚠️  Review access policies quarterly

## Next Actions
1. Schedule automatic rotation (cron)
2. Verify backups are encrypted
3. Test disaster recovery procedure
4. Audit access logs
EOF
}
```

## Usage Examples

### Set a secret
```
/acc:vault set secret/services/ollama --key api_key --value "sk-xyz123"
```

### Generate random secret
```
/acc:vault set secret/services/redis --key password
```

### Get a secret
```
/acc:vault get secret/services/ollama --key api_key
```

### Get all keys for a service
```
/acc:vault get secret/services/ollama
```

### List all service secrets
```
/acc:vault list secret/services
```

### Rotate database password
```
/acc:vault rotate secret/services/postgres --type database
```

### Rotate API key
```
/acc:vault rotate secret/services/ollama --type api-key
```

### Backup all secrets
```
/acc:vault backup secret/services
```

### Restore from backup
```
/acc:vault restore /backups/vault/vault_backup_20251213.tar.gz.gpg
```

### Initialize all ACC secrets
```
/acc:vault init
```

## Expected Outputs

### Set Operation
```
✅ Secret set: secret/services/ollama/api_key
Generated secure random value (32 bytes)
```

### Get Operation
```json
{
  "api_key": "sk-abc123...",
  "created_at": "2025-12-13T10:30:00Z"
}
```

### List Operation
```
Secrets under secret/services:
================================
📁 ollama/
   🔑 config (v3, created: 2025-12-13)
      - api_key
      - model_path
📁 home-assistant/
   🔑 credentials (v1, created: 2025-12-13)
      - secret_key
      - webhook_id
```

### Rotate Operation
```
Rotating secret: secret/services/postgres (database)
✅ Database password rotated for postgres_user
⚠️  Restart services using this credential:
   - docker-compose restart postgres
   - docker-compose restart ollama
```

### Backup Operation
```
Backing up secrets from secret/services...
Backed up: secret/services/ollama/config
Backed up: secret/services/postgres/credentials
✅ Backup created: /backups/vault/vault_backup_20251213.tar.gz.gpg
⚠️  Store backup password securely!
```

## Success Criteria

- Vault is accessible and unsealed
- Token has required capabilities
- Secrets are created/updated successfully
- Rotation updates both Vault and service
- Backups are encrypted and complete
- Restore operation succeeds
- No secrets exposed in logs
- All operations logged for audit

## Notes

- Always use secure random generation for secrets
- Rotate secrets regularly (90 days recommended)
- Backup before major operations
- Use GPG for backup encryption
- Test restore procedure regularly
- Never commit Vault tokens to git
- Use dynamic secrets for databases when possible
- Implement grace period for key rotation
- Audit Vault access logs monthly
- Use namespaces for multi-tenancy
- Enable Vault audit logging
