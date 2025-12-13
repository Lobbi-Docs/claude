---
description: Manage HashiCorp Vault secrets and credentials with support for dynamic secret generation, path-based CRUD operations, and Terraform integration
argument-hint: --operation [read|write|delete|list] --path [vault/path] --engine [kv|aws|database]
allowed-tools:
  - Bash
  - Write
  - Read
  - Edit
  - Grep
  - Glob
---

# HashiCorp Vault Secrets Management

You are managing secrets in HashiCorp Vault with enterprise-grade security practices, including dynamic credentials, secret rotation, and Terraform integration.

## Input Parameters

Parse the user's command arguments:
- `--operation`: Operation type (read, write, delete, list, rotate, generate)
- `--path`: Vault path for the secret (e.g., secret/data/myapp)
- `--engine`: Secret engine type (kv, aws, database, pki, ssh)
- `--key`: Specific key within the secret (for key-value operations)
- `--value`: Value to write (for write operations)
- `--file`: Read values from file (JSON or env format)
- `--format`: Output format (json, yaml, env, table)
- `--mount-path`: Custom mount path (defaults to engine type)
- `--terraform`: Generate Terraform vault resources
- `--rotate`: Enable automatic rotation (for dynamic secrets)

## Execution Steps

### 1. Pre-Flight Checks

Verify Vault connectivity and authentication:

```bash
# Check if Vault CLI is installed
if ! command -v vault &> /dev/null; then
    echo "ERROR: Vault CLI not found. Install from: https://www.vaultproject.io/downloads"
    echo ""
    echo "Installation:"
    echo "  macOS:   brew install vault"
    echo "  Linux:   Download from https://www.vaultproject.io/downloads"
    echo "  Windows: choco install vault"
    exit 1
fi

# Check Vault address
if [ -z "$VAULT_ADDR" ]; then
    echo "ERROR: VAULT_ADDR environment variable not set"
    echo "Example: export VAULT_ADDR=https://vault.example.com:8200"
    exit 1
fi

echo "Vault Address: $VAULT_ADDR"

# Check authentication status
echo "Checking Vault authentication..."
vault token lookup > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR: Not authenticated to Vault"
    echo ""
    echo "Authentication methods:"
    echo "  1. Token: export VAULT_TOKEN=your-token"
    echo "  2. Login: vault login"
    echo "  3. AppRole: vault write auth/approle/login role_id=... secret_id=..."
    echo "  4. OIDC: vault login -method=oidc"
    exit 1
fi

# Display token information (without sensitive data)
echo "✓ Authenticated to Vault"
TOKEN_INFO=$(vault token lookup -format=json 2>/dev/null)
ACCESSOR=$(echo "$TOKEN_INFO" | jq -r '.data.accessor // "unknown"')
POLICIES=$(echo "$TOKEN_INFO" | jq -r '.data.policies | join(", ")' 2>/dev/null || echo "unknown")
TTL=$(echo "$TOKEN_INFO" | jq -r '.data.ttl // "unknown"')

echo "Token Accessor: $ACCESSOR"
echo "Policies: $POLICIES"
echo "TTL: ${TTL}s"
echo ""
```

### 2. Determine Operation Mode

Route to appropriate operation based on parameters:

```bash
OPERATION=${OPERATION:-read}
ENGINE=${ENGINE:-kv}
MOUNT_PATH=${MOUNT_PATH:-$ENGINE}

echo "Operation: $OPERATION"
echo "Engine: $ENGINE"
echo "Mount Path: $MOUNT_PATH"
echo "Path: ${PATH_ARG:-not specified}"
echo ""
```

### 3. KV Secret Operations

Handle key-value secret engine operations:

#### 3.1 Read Secret

```bash
if [ "$OPERATION" = "read" ]; then
    if [ -z "$PATH_ARG" ]; then
        echo "ERROR: --path required for read operation"
        echo "Example: --path secret/data/myapp/config"
        exit 1
    fi

    echo "Reading secret from: $PATH_ARG"

    # Read secret
    SECRET_DATA=$(vault kv get -format=json "$PATH_ARG" 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
        echo "ERROR: Failed to read secret"
        echo "$SECRET_DATA"
        exit 1
    fi

    # Format output based on requested format
    FORMAT=${FORMAT:-json}

    case $FORMAT in
        json)
            echo "$SECRET_DATA" | jq '.data.data'
            ;;
        yaml)
            echo "$SECRET_DATA" | jq -r '.data.data | to_entries | .[] | "\(.key): \(.value)"'
            ;;
        env)
            echo "# Environment variables from Vault path: $PATH_ARG"
            echo "$SECRET_DATA" | jq -r '.data.data | to_entries | .[] | "export \(.key)=\(.value | @sh)"'
            ;;
        table)
            echo "Secrets from: $PATH_ARG"
            echo "============================================"
            echo "$SECRET_DATA" | jq -r '.data.data | to_entries | .[] | "\(.key) = \(.value)"'
            echo "============================================"
            ;;
        terraform)
            # Generate Terraform data source
            cat > vault-secret-$(basename $PATH_ARG).tf <<EOF
# Vault Secret Data Source
# Generated: $(date)

data "vault_kv_secret_v2" "$(basename $PATH_ARG)" {
  mount = "$(dirname $(dirname $PATH_ARG))"
  name  = "$(basename $PATH_ARG)"
}

# Access secrets in Terraform:
# data.vault_kv_secret_v2.$(basename $PATH_ARG).data["key_name"]

output "$(basename $PATH_ARG)_keys" {
  description = "Available keys in secret"
  value       = keys(data.vault_kv_secret_v2.$(basename $PATH_ARG).data)
}
EOF
            echo "Terraform configuration written to: vault-secret-$(basename $PATH_ARG).tf"
            ;;
    esac

    # Extract metadata
    echo ""
    echo "Secret Metadata:"
    echo "  Version: $(echo "$SECRET_DATA" | jq -r '.data.metadata.version')"
    echo "  Created: $(echo "$SECRET_DATA" | jq -r '.data.metadata.created_time')"
    echo "  Updated: $(echo "$SECRET_DATA" | jq -r '.data.metadata.updated_time')"
fi
```

#### 3.2 Write Secret

```bash
if [ "$OPERATION" = "write" ]; then
    if [ -z "$PATH_ARG" ]; then
        echo "ERROR: --path required for write operation"
        exit 1
    fi

    echo "Writing secret to: $PATH_ARG"

    # Determine data source
    if [ -n "$FILE" ]; then
        # Read from file
        if [ ! -f "$FILE" ]; then
            echo "ERROR: File not found: $FILE"
            exit 1
        fi

        echo "Reading data from file: $FILE"

        # Detect file format
        if [[ "$FILE" == *.json ]]; then
            # JSON file
            vault kv put "$PATH_ARG" @"$FILE"
        elif [[ "$FILE" == *.env ]]; then
            # .env file - convert to key=value format
            while IFS='=' read -r key value; do
                # Skip comments and empty lines
                [[ "$key" =~ ^#.*$ ]] && continue
                [[ -z "$key" ]] && continue

                # Strip quotes from value
                value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

                VAULT_ARGS="$VAULT_ARGS $key=\"$value\""
            done < "$FILE"

            eval vault kv put "$PATH_ARG" $VAULT_ARGS
        else
            echo "ERROR: Unsupported file format. Use .json or .env"
            exit 1
        fi
    elif [ -n "$KEY" ] && [ -n "$VALUE" ]; then
        # Single key-value pair
        echo "Writing key: $KEY"
        vault kv put "$PATH_ARG" "$KEY=$VALUE"
    else
        echo "ERROR: Either --file or both --key and --value required"
        echo "Examples:"
        echo "  --key db_password --value 'secret123'"
        echo "  --file secrets.json"
        echo "  --file .env"
        exit 1
    fi

    if [ $? -eq 0 ]; then
        echo "✓ Secret written successfully"

        # Read back to confirm
        echo ""
        echo "Stored secret:"
        vault kv get -format=json "$PATH_ARG" | jq -r '.data.data | keys | .[] | "  - \(.)"'
    else
        echo "✗ Failed to write secret"
        exit 1
    fi
fi
```

#### 3.3 Delete Secret

```bash
if [ "$OPERATION" = "delete" ]; then
    if [ -z "$PATH_ARG" ]; then
        echo "ERROR: --path required for delete operation"
        exit 1
    fi

    echo "⚠️  WARNING: This will delete the secret at: $PATH_ARG"

    # Show current secret
    echo ""
    echo "Current secret:"
    vault kv get "$PATH_ARG" 2>/dev/null

    # Require confirmation
    read -p "Type 'yes' to confirm deletion: " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo "Deletion cancelled"
        exit 0
    fi

    # Delete secret
    vault kv delete "$PATH_ARG"

    if [ $? -eq 0 ]; then
        echo "✓ Secret deleted successfully"
        echo ""
        echo "Note: Deleted secret can be recovered using:"
        echo "  vault kv undelete -versions=VERSION $PATH_ARG"
    else
        echo "✗ Failed to delete secret"
        exit 1
    fi
fi
```

#### 3.4 List Secrets

```bash
if [ "$OPERATION" = "list" ]; then
    LIST_PATH=${PATH_ARG:-secret/metadata}

    echo "Listing secrets at: $LIST_PATH"
    echo ""

    # List secrets
    SECRET_LIST=$(vault kv list -format=json "$LIST_PATH" 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
        echo "ERROR: Failed to list secrets"
        echo "$SECRET_LIST"
        exit 1
    fi

    # Format output
    echo "$SECRET_LIST" | jq -r '.[]' | while read -r item; do
        if [[ "$item" == */ ]]; then
            # Directory
            echo "📁 $item"
        else
            # Secret
            echo "🔑 $item"

            # Optionally show metadata
            if [ "$VERBOSE" = "true" ]; then
                METADATA=$(vault kv metadata get -format=json "$LIST_PATH/$item" 2>/dev/null)
                if [ $? -eq 0 ]; then
                    VERSION=$(echo "$METADATA" | jq -r '.current_version')
                    UPDATED=$(echo "$METADATA" | jq -r '.updated_time')
                    echo "   Version: $VERSION | Updated: $UPDATED"
                fi
            fi
        fi
    done

    echo ""
    TOTAL_ITEMS=$(echo "$SECRET_LIST" | jq '. | length')
    echo "Total items: $TOTAL_ITEMS"
fi
```

### 4. Dynamic Secret Operations

Handle dynamic secret engines (AWS, Database, etc.):

#### 4.1 AWS Dynamic Credentials

```bash
if [ "$ENGINE" = "aws" ]; then
    if [ "$OPERATION" = "generate" ]; then
        if [ -z "$PATH_ARG" ]; then
            echo "ERROR: --path required (e.g., aws/creds/my-role)"
            exit 1
        fi

        echo "Generating AWS dynamic credentials..."
        echo "Role: $PATH_ARG"
        echo ""

        # Generate credentials
        CREDS=$(vault read -format=json "$PATH_ARG" 2>&1)
        EXIT_CODE=$?

        if [ $EXIT_CODE -ne 0 ]; then
            echo "ERROR: Failed to generate credentials"
            echo "$CREDS"
            exit 1
        fi

        # Extract credentials
        ACCESS_KEY=$(echo "$CREDS" | jq -r '.data.access_key')
        SECRET_KEY=$(echo "$CREDS" | jq -r '.data.secret_key')
        SESSION_TOKEN=$(echo "$CREDS" | jq -r '.data.security_token // empty')
        LEASE_ID=$(echo "$CREDS" | jq -r '.lease_id')
        LEASE_DURATION=$(echo "$CREDS" | jq -r '.lease_duration')

        echo "✓ Credentials generated successfully"
        echo ""
        echo "Lease ID: $LEASE_ID"
        echo "Lease Duration: ${LEASE_DURATION}s ($(($LEASE_DURATION / 3600))h)"
        echo ""

        # Output in requested format
        FORMAT=${FORMAT:-env}

        case $FORMAT in
            env)
                echo "# AWS Credentials from Vault"
                echo "# Lease: $LEASE_ID"
                echo "# Expires in: ${LEASE_DURATION}s"
                echo "export AWS_ACCESS_KEY_ID=$ACCESS_KEY"
                echo "export AWS_SECRET_ACCESS_KEY=$SECRET_KEY"
                [ -n "$SESSION_TOKEN" ] && echo "export AWS_SESSION_TOKEN=$SESSION_TOKEN"
                echo ""
                echo "# To use: eval \$(vault read -format=... aws/creds/...)"
                ;;
            json)
                echo "$CREDS" | jq '.data'
                ;;
            terraform)
                cat > vault-aws-creds.tf <<EOF
# Vault AWS Dynamic Credentials
# Generated: $(date)

resource "vault_aws_secret_backend_role" "$(basename $PATH_ARG)" {
  backend = "aws"
  name    = "$(basename $PATH_ARG)"

  # Configuration would go here based on your role setup
}

data "vault_aws_access_credentials" "creds" {
  backend = vault_aws_secret_backend_role.$(basename $PATH_ARG).backend
  role    = vault_aws_secret_backend_role.$(basename $PATH_ARG).name
}

output "aws_access_key_id" {
  value     = data.vault_aws_access_credentials.creds.access_key
  sensitive = true
}

output "aws_secret_access_key" {
  value     = data.vault_aws_access_credentials.creds.secret_key
  sensitive = true
}
EOF
                echo "Terraform configuration written to: vault-aws-creds.tf"
                ;;
        esac

        # Save lease information for renewal
        cat > ".vault-lease-$LEASE_ID.json" <<EOF
{
  "lease_id": "$LEASE_ID",
  "lease_duration": $LEASE_DURATION,
  "path": "$PATH_ARG",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expires_at": "$(date -u -d "+${LEASE_DURATION} seconds" +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        echo ""
        echo "Lease information saved to: .vault-lease-$LEASE_ID.json"
        echo ""
        echo "To renew lease: vault lease renew $LEASE_ID"
        echo "To revoke lease: vault lease revoke $LEASE_ID"
    fi
fi
```

#### 4.2 Database Dynamic Credentials

```bash
if [ "$ENGINE" = "database" ]; then
    if [ "$OPERATION" = "generate" ]; then
        if [ -z "$PATH_ARG" ]; then
            echo "ERROR: --path required (e.g., database/creds/my-role)"
            exit 1
        fi

        echo "Generating database dynamic credentials..."
        echo "Role: $PATH_ARG"
        echo ""

        # Generate credentials
        DB_CREDS=$(vault read -format=json "$PATH_ARG" 2>&1)
        EXIT_CODE=$?

        if [ $EXIT_CODE -ne 0 ]; then
            echo "ERROR: Failed to generate credentials"
            echo "$DB_CREDS"
            exit 1
        fi

        # Extract credentials
        USERNAME=$(echo "$DB_CREDS" | jq -r '.data.username')
        PASSWORD=$(echo "$DB_CREDS" | jq -r '.data.password')
        LEASE_ID=$(echo "$DB_CREDS" | jq -r '.lease_id')
        LEASE_DURATION=$(echo "$DB_CREDS" | jq -r '.lease_duration')

        echo "✓ Database credentials generated successfully"
        echo ""
        echo "Username: $USERNAME"
        echo "Lease ID: $LEASE_ID"
        echo "Lease Duration: ${LEASE_DURATION}s ($(($LEASE_DURATION / 3600))h)"
        echo ""

        # Output in requested format
        FORMAT=${FORMAT:-env}

        case $FORMAT in
            env)
                echo "# Database Credentials from Vault"
                echo "# Lease: $LEASE_ID"
                echo "export DB_USERNAME=$USERNAME"
                echo "export DB_PASSWORD=$PASSWORD"
                ;;
            json)
                echo "$DB_CREDS" | jq '.data'
                ;;
            connection-string)
                # This is example format - customize based on database type
                echo "postgresql://${USERNAME}:${PASSWORD}@localhost:5432/mydb"
                ;;
        esac
    fi
fi
```

### 5. Secret Rotation

Implement secret rotation workflows:

```bash
if [ "$OPERATION" = "rotate" ]; then
    if [ -z "$PATH_ARG" ]; then
        echo "ERROR: --path required for rotation"
        exit 1
    fi

    echo "Initiating secret rotation for: $PATH_ARG"
    echo ""

    # Read current secret version
    CURRENT_SECRET=$(vault kv get -format=json "$PATH_ARG" 2>&1)
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to read current secret"
        echo "$CURRENT_SECRET"
        exit 1
    fi

    CURRENT_VERSION=$(echo "$CURRENT_SECRET" | jq -r '.data.metadata.version')
    echo "Current version: $CURRENT_VERSION"
    echo ""

    # For demonstration - in practice, integrate with secret generation service
    echo "Rotation steps:"
    echo "  1. Generate new secret value"
    echo "  2. Update Vault with new value"
    echo "  3. Update dependent systems"
    echo "  4. Verify rotation"
    echo ""

    # Generate new secret (example for password)
    if [ "$KEY" = "password" ]; then
        NEW_PASSWORD=$(openssl rand -base64 32)

        echo "Writing new password to Vault..."
        vault kv put "$PATH_ARG" password="$NEW_PASSWORD"

        if [ $? -eq 0 ]; then
            NEW_VERSION=$(vault kv get -format=json "$PATH_ARG" | jq -r '.data.metadata.version')
            echo "✓ Secret rotated successfully"
            echo "  Old version: $CURRENT_VERSION"
            echo "  New version: $NEW_VERSION"
            echo ""
            echo "⚠️  IMPORTANT: Update dependent systems with new secret"
        fi
    else
        echo "ERROR: Rotation not implemented for this secret type"
        echo "Implement custom rotation logic for your use case"
        exit 1
    fi
fi
```

### 6. Terraform Integration

Generate Terraform resources for Vault:

```bash
if [ "$TERRAFORM" = "true" ]; then
    echo "Generating Terraform configuration for Vault integration..."
    echo ""

    # Create provider configuration
    cat > vault-provider.tf <<EOF
# Vault Provider Configuration
# Generated: $(date)

terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.0"
    }
  }
}

provider "vault" {
  address = "$VAULT_ADDR"
  # Authentication handled via VAULT_TOKEN env var or other methods
}
EOF

    # Create generic secret module
    cat > vault-secrets-module.tf <<EOF
# Vault Secrets Module
# Generated: $(date)

variable "vault_secrets" {
  description = "Map of secrets to store in Vault"
  type = map(object({
    path = string
    data = map(string)
  }))
  default = {}
}

resource "vault_kv_secret_v2" "secrets" {
  for_each = var.vault_secrets

  mount     = split("/", each.value.path)[0]
  name      = join("/", slice(split("/", each.value.path), 1, length(split("/", each.value.path))))
  data_json = jsonencode(each.value.data)

  # Delete all versions on destroy
  delete_all_versions = true
}

output "secret_paths" {
  description = "Paths to created secrets"
  value       = { for k, v in vault_kv_secret_v2.secrets : k => v.path }
}
EOF

    echo "✓ Terraform files created:"
    echo "  - vault-provider.tf (provider configuration)"
    echo "  - vault-secrets-module.tf (reusable secrets module)"
    echo ""
    echo "Usage example:"
    echo ""
    cat <<'EXAMPLE'
module "vault_secrets" {
  source = "./vault-secrets-module"

  vault_secrets = {
    app_config = {
      path = "secret/myapp/config"
      data = {
        db_host = "localhost"
        db_port = "5432"
      }
    }
  }
}
EXAMPLE
fi
```

### 7. Audit and Compliance

Generate audit report for secret access:

```bash
# Create secret access audit report
cat > vault-secrets-audit-$(date +%Y%m%d).md <<EOF
# Vault Secrets Audit Report
Generated: $(date)

## Authentication Status
- Vault Address: $VAULT_ADDR
- Token Accessor: $ACCESSOR
- Policies: $POLICIES
- Token TTL: ${TTL}s

## Operations Performed
- Operation: $OPERATION
- Engine: $ENGINE
- Path: ${PATH_ARG:-N/A}

## Security Checklist
- [ ] Secrets encrypted at rest
- [ ] Secrets encrypted in transit (TLS)
- [ ] Dynamic secrets used where possible
- [ ] Lease durations appropriate
- [ ] Secret rotation enabled
- [ ] Access policies follow least privilege
- [ ] Audit logging enabled

## Recommendations
1. Enable automatic secret rotation for static secrets
2. Use dynamic secrets for cloud credentials
3. Implement short lease durations
4. Regular audit of access policies
5. Enable MFA for sensitive paths

EOF

echo "Audit report saved to: vault-secrets-audit-$(date +%Y%m%d).md"
```

## Error Handling

Handle common Vault errors:

```bash
# Vault not reachable
# (handled in pre-flight checks)

# Permission denied
if [[ "$ERROR_MSG" == *"permission denied"* ]]; then
    echo "ERROR: Permission denied"
    echo ""
    echo "Your token policies: $POLICIES"
    echo ""
    echo "Required capabilities for this operation:"
    case $OPERATION in
        read) echo "  - read" ;;
        write) echo "  - create, update" ;;
        delete) echo "  - delete" ;;
        list) echo "  - list" ;;
    esac
    echo ""
    echo "Contact your Vault administrator to update your policies"
    exit 1
fi

# Secret not found
if [[ "$ERROR_MSG" == *"no value"* ]] || [[ "$ERROR_MSG" == *"not found"* ]]; then
    echo "ERROR: Secret not found at path: $PATH_ARG"
    echo ""
    echo "Possible causes:"
    echo "  1. Path does not exist"
    echo "  2. Incorrect mount path"
    echo "  3. KV version mismatch (v1 vs v2)"
    echo ""
    echo "Try listing available secrets: --operation list --path $(dirname $PATH_ARG)"
    exit 1
fi

# Token expired
if [[ "$ERROR_MSG" == *"token expired"* ]]; then
    echo "ERROR: Vault token has expired"
    echo "Authenticate again: vault login"
    exit 1
fi
```

## Best Practices Applied

- Secure credential handling (never log secrets)
- Dynamic secret generation
- Lease management and renewal
- Secret rotation support
- Terraform integration
- Audit trail generation
- SOC2 compliance ready
- Multi-engine support
- Format flexibility (JSON, YAML, env)
- Error handling with remediation guidance

## Output Summary

Provide clear summary to user:

```
Vault Secrets Operation Complete!

Operation: $OPERATION
Engine: $ENGINE
Path: $PATH_ARG

Status: ✓ Success

Generated Files:
- [files created based on operation]

Next Steps:
1. [operation-specific recommendations]
2. Review audit report
3. Update dependent systems if needed
4. Monitor lease expiration

Documentation:
- Vault Docs: https://www.vaultproject.io/docs
- Terraform Vault Provider: https://registry.terraform.io/providers/hashicorp/vault
```
