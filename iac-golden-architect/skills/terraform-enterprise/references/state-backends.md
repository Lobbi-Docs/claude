# Terraform State Backends - Complete Reference

## Overview

Remote state backends enable team collaboration, state locking, and encryption. This document covers all major backend configurations with production-ready examples.

## S3 Backend (AWS)

### Basic Configuration

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "path/to/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Enhanced Configuration with All Options

```hcl
terraform {
  backend "s3" {
    # Required
    bucket = "my-terraform-state"
    key    = "env/production/terraform.tfstate"
    region = "us-west-2"

    # Encryption
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
    sse_customer_key = ""  # For customer-managed keys

    # Locking
    dynamodb_table = "terraform-locks"

    # Access Control
    acl            = "private"

    # Versioning (handled at bucket level)
    # Enable versioning on the S3 bucket for state history

    # IAM Role Assumption
    role_arn       = "arn:aws:iam::123456789012:role/TerraformBackend"
    session_name   = "terraform-session"
    external_id    = "unique-external-id"

    # Workspace Prefix
    workspace_key_prefix = "workspaces"

    # Additional Options
    skip_credentials_validation = false
    skip_metadata_api_check    = false
    skip_region_validation     = false
    force_path_style          = false

    # Custom Endpoint (for S3-compatible storage)
    endpoint = ""

    # Shared Credentials
    shared_credentials_file = "~/.aws/credentials"
    profile                 = "terraform"
  }
}
```

### S3 Bucket Setup (Terraform)

```hcl
# Create S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "Terraform State"
    Environment = "Global"
    ManagedBy   = "Terraform"
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging
resource "aws_s3_bucket_logging" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.terraform_state_logs.id
  target_prefix = "state-access-logs/"
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# KMS key for encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name      = "terraform-state-key"
    ManagedBy = "Terraform"
  }
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }

  tags = {
    Name        = "Terraform State Locks"
    Environment = "Global"
    ManagedBy   = "Terraform"
  }
}

# IAM policy for Terraform backend access
resource "aws_iam_policy" "terraform_backend" {
  name        = "TerraformBackendAccess"
  description = "Policy for Terraform backend access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = aws_s3_bucket.terraform_state.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.terraform_state.arn
      }
    ]
  })
}
```

## Azure Blob Storage Backend

### Basic Configuration

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### Enhanced Configuration

```hcl
terraform {
  backend "azurerm" {
    # Required
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "env/production/terraform.tfstate"

    # Authentication
    # Option 1: Service Principal
    subscription_id      = "00000000-0000-0000-0000-000000000000"
    tenant_id            = "00000000-0000-0000-0000-000000000000"
    client_id            = "00000000-0000-0000-0000-000000000000"
    client_secret        = var.client_secret

    # Option 2: Managed Identity
    use_msi              = true
    msi_endpoint         = ""

    # Option 3: Azure CLI
    use_azuread_auth     = true

    # Encryption
    # Encryption is always enabled for Azure Storage

    # Additional Options
    environment          = "public"  # or "usgovernment", "german", "china"
    snapshot             = false

    # Custom Endpoint
    endpoint             = ""

    # SAS Token
    sas_token            = ""

    # Access Key (not recommended)
    access_key           = ""
  }
}
```

### Azure Storage Setup (Terraform)

```hcl
# Resource group for state storage
resource "azurerm_resource_group" "terraform_state" {
  name     = "terraform-state-rg"
  location = "West US 2"

  tags = {
    Environment = "Global"
    ManagedBy   = "Terraform"
  }
}

# Storage account for state
resource "azurerm_storage_account" "terraform_state" {
  name                     = "tfstate${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.terraform_state.name
  location                 = azurerm_resource_group.terraform_state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant storage
  account_kind             = "StorageV2"

  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  enable_https_traffic_only       = true

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = {
    Environment = "Global"
    ManagedBy   = "Terraform"
  }
}

# Random suffix for unique storage account name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Container for state files
resource "azurerm_storage_container" "terraform_state" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.terraform_state.name
  container_access_type = "private"
}

# Enable advanced threat protection
resource "azurerm_advanced_threat_protection" "terraform_state" {
  target_resource_id = azurerm_storage_account.terraform_state.id
  enabled            = true
}

# Service principal for Terraform access
resource "azuread_application" "terraform" {
  display_name = "Terraform Backend Access"
}

resource "azuread_service_principal" "terraform" {
  application_id = azuread_application.terraform.application_id
}

resource "azuread_service_principal_password" "terraform" {
  service_principal_id = azuread_service_principal.terraform.object_id
}

# Role assignment for storage access
resource "azurerm_role_assignment" "terraform_storage" {
  scope                = azurerm_storage_account.terraform_state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.terraform.object_id
}
```

## Google Cloud Storage Backend

### Basic Configuration

```hcl
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state"
    prefix  = "terraform/state"
  }
}
```

### Enhanced Configuration

```hcl
terraform {
  backend "gcs" {
    # Required
    bucket  = "my-terraform-state"
    prefix  = "env/production"

    # Authentication
    credentials = file("terraform-sa-key.json")

    # Or use Application Default Credentials
    # Automatically uses GOOGLE_APPLICATION_CREDENTIALS env var

    # Encryption
    encryption_key = ""  # Customer-supplied encryption key (base64)

    # Additional Options
    impersonate_service_account              = "terraform@project.iam.gserviceaccount.com"
    impersonate_service_account_delegates    = []

    # Custom Endpoint
    storage_custom_endpoint = ""
  }
}
```

### GCS Bucket Setup (Terraform)

```hcl
# GCS bucket for state storage
resource "google_storage_bucket" "terraform_state" {
  name          = "terraform-state-${data.google_project.current.project_id}"
  location      = "US"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.terraform_state.id
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = "global"
    managed_by  = "terraform"
  }
}

# KMS key for bucket encryption
resource "google_kms_key_ring" "terraform_state" {
  name     = "terraform-state-keyring"
  location = "us"
}

resource "google_kms_crypto_key" "terraform_state" {
  name            = "terraform-state-key"
  key_ring        = google_kms_key_ring.terraform_state.id
  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# Service account for Terraform
resource "google_service_account" "terraform" {
  account_id   = "terraform-backend"
  display_name = "Terraform Backend Service Account"
}

# IAM binding for storage access
resource "google_storage_bucket_iam_member" "terraform_state" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform.email}"
}

# IAM binding for KMS access
resource "google_kms_crypto_key_iam_member" "terraform_state" {
  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.terraform.email}"
}
```

## Terraform Cloud/Enterprise Backend

### Basic Configuration

```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "my-workspace"
    }
  }
}
```

### Enhanced Configuration

```hcl
terraform {
  cloud {
    organization = "my-org"
    hostname     = "app.terraform.io"  # or custom TFE hostname

    # Single workspace
    workspaces {
      name = "production-infrastructure"
    }

    # Or workspace tags (for selecting multiple workspaces)
    # workspaces {
    #   tags = ["networking", "production"]
    # }
  }
}

# Authentication via environment variable:
# export TF_TOKEN_app_terraform_io="your-token"
# Or via credentials file: ~/.terraform.d/credentials.tfrc.json
```

### Terraform Cloud Workspace Setup (API)

```hcl
terraform {
  required_providers {
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.51"
    }
  }
}

provider "tfe" {
  token = var.tfe_token
}

# Create workspace
resource "tfe_workspace" "production" {
  name         = "production-infrastructure"
  organization = "my-org"

  # VCS settings
  vcs_repo {
    identifier     = "my-org/infrastructure-repo"
    oauth_token_id = var.oauth_token_id
    branch         = "main"
  }

  # Execution mode
  execution_mode = "remote"  # or "local" for client-side execution

  # Terraform version
  terraform_version = "~> 1.6"

  # Working directory
  working_directory = "terraform/"

  # Triggers
  trigger_prefixes = ["modules/"]

  # Auto-apply
  auto_apply = false

  # Queue settings
  queue_all_runs = false

  # Notifications
  notifications {
    # Slack, email, etc.
  }

  # Run settings
  allow_destroy_plan = false
  speculative_enabled = true

  # Description
  description = "Production infrastructure workspace"

  # Tags
  tag_names = ["production", "infrastructure"]
}

# Workspace variables
resource "tfe_variable" "aws_region" {
  workspace_id = tfe_workspace.production.id
  key          = "AWS_REGION"
  value        = "us-west-2"
  category     = "env"
}

resource "tfe_variable" "aws_credentials" {
  workspace_id = tfe_workspace.production.id
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key_id
  category     = "env"
  sensitive    = true
}
```

## Backend Migration

### From Local to S3

```bash
# 1. Add backend configuration to your Terraform code
# 2. Run terraform init with -migrate-state flag
terraform init -migrate-state

# Terraform will prompt to migrate state
# Answer 'yes' to copy state to the new backend

# 3. Verify state was migrated
terraform state list

# 4. Remove local state file (backup first!)
mv terraform.tfstate terraform.tfstate.backup
```

### From S3 to Terraform Cloud

```bash
# 1. Update backend configuration in code
# 2. Migrate state
terraform init -migrate-state

# 3. Verify migration
terraform state list
```

### Between Different S3 Buckets

```bash
# 1. Update backend configuration
# 2. Reconfigure backend
terraform init -reconfigure -migrate-state
```

## Workspace Key Patterns

### Per-Environment Pattern

```hcl
# Backend configuration
terraform {
  backend "s3" {
    bucket               = "my-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-west-2"
    workspace_key_prefix = "env"
    dynamodb_table       = "terraform-locks"
    encrypt              = true
  }
}

# Results in state paths:
# env/dev/terraform.tfstate
# env/staging/terraform.tfstate
# env/production/terraform.tfstate
```

### Per-Service Pattern

```hcl
# Different key per service
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "services/api-gateway/terraform.tfstate"
    region = "us-west-2"
  }
}

# services/api-gateway/terraform.tfstate
# services/lambda-functions/terraform.tfstate
# services/databases/terraform.tfstate
```

## State Locking Troubleshooting

### Check Lock Status (S3 + DynamoDB)

```bash
# Check DynamoDB for active locks
aws dynamodb scan \
  --table-name terraform-locks \
  --filter-expression "attribute_exists(LockID)"

# Get lock info for specific state
aws dynamodb get-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "my-terraform-state/path/to/terraform.tfstate"}}'
```

### Force Unlock (Use with Caution)

```bash
# Only use if you're certain no other process is running
terraform force-unlock <LOCK_ID>

# For S3 backend, LOCK_ID format is typically:
# <bucket>/<key>-md5
```

### Prevent Lock Timeout Issues

```hcl
# Increase lock timeout in backend configuration
terraform {
  backend "s3" {
    # ... other settings ...

    # Not directly configurable, but use retry logic
    max_retries = 5
  }
}
```

## Security Best Practices

1. **Never commit state files** - Add to .gitignore
2. **Use encrypted backends** - S3-SSE, Azure encryption, GCS encryption
3. **Enable versioning** - For rollback capability
4. **Implement access controls** - IAM policies, RBAC
5. **Use separate backends per environment** - Isolation
6. **Enable audit logging** - CloudTrail, Azure Monitor, Cloud Audit Logs
7. **Rotate credentials regularly** - Service accounts, access keys
8. **Use dynamic credentials** - OIDC, workload identity when possible
9. **Implement state locking** - Prevent concurrent modifications
10. **Regular backups** - Even with versioning enabled

## Performance Considerations

- Use `-refresh=false` for large states when appropriate
- Implement targeted operations with `-target`
- Split large monolithic states into smaller modules
- Use data sources instead of remote state when possible
- Consider state file size limits (Terraform Cloud: 100MB)
- Optimize provider API calls with lifecycle rules

## Compliance Requirements

### SOC2 Controls
- **CC6.1**: State encryption at rest (KMS, SSE)
- **CC6.6**: State access logging (CloudTrail, etc.)
- **CC6.7**: IAM policies for state access
- **CC7.2**: State versioning for change tracking

### Implementation
```hcl
# All backends should have:
# 1. Encryption enabled
# 2. Versioning enabled
# 3. Access logging enabled
# 4. Strict IAM policies
# 5. State locking enabled
# 6. Regular backups configured
```
