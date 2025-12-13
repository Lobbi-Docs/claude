# Terraform Backend Configuration Examples
# Complete reference for all major backend types

#------------------------------------------------------------------------------
# S3 BACKEND (AWS)
#------------------------------------------------------------------------------

# Basic S3 backend
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "path/to/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# S3 backend with KMS encryption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
    dynamodb_table = "terraform-locks"
  }
}

# S3 backend with role assumption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
    role_arn       = "arn:aws:iam::123456789012:role/TerraformBackendRole"
    session_name   = "terraform-session"
    external_id    = "unique-external-id"
  }
}

# S3 backend with workspace prefix
terraform {
  backend "s3" {
    bucket               = "my-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-west-2"
    workspace_key_prefix = "environments"
    encrypt              = true
    dynamodb_table       = "terraform-locks"
  }
}

# Results in state paths:
# environments/dev/terraform.tfstate
# environments/staging/terraform.tfstate
# environments/production/terraform.tfstate

#------------------------------------------------------------------------------
# AZURE BLOB STORAGE BACKEND
#------------------------------------------------------------------------------

# Basic Azure backend
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

# Azure backend with service principal
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "production/terraform.tfstate"

    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "00000000-0000-0000-0000-000000000000"
    client_id       = "00000000-0000-0000-0000-000000000000"
    client_secret   = var.azure_client_secret
  }
}

# Azure backend with managed identity
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"

    use_msi         = true
    subscription_id = "00000000-0000-0000-0000-000000000000"
  }
}

# Azure backend with Azure AD authentication
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"

    use_azuread_auth = true
    subscription_id  = "00000000-0000-0000-0000-000000000000"
    tenant_id        = "00000000-0000-0000-0000-000000000000"
  }
}

#------------------------------------------------------------------------------
# GOOGLE CLOUD STORAGE BACKEND
#------------------------------------------------------------------------------

# Basic GCS backend
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"
  }
}

# GCS backend with service account
terraform {
  backend "gcs" {
    bucket      = "my-terraform-state"
    prefix      = "production"
    credentials = file("path/to/service-account-key.json")
  }
}

# GCS backend with encryption
terraform {
  backend "gcs" {
    bucket         = "my-terraform-state"
    prefix         = "terraform/state"
    encryption_key = "base64-encoded-encryption-key"
  }
}

# GCS backend with service account impersonation
terraform {
  backend "gcs" {
    bucket                            = "my-terraform-state"
    prefix                            = "terraform/state"
    impersonate_service_account       = "terraform@my-project.iam.gserviceaccount.com"
    impersonate_service_account_delegates = [
      "delegated-sa@my-project.iam.gserviceaccount.com"
    ]
  }
}

#------------------------------------------------------------------------------
# TERRAFORM CLOUD / ENTERPRISE
#------------------------------------------------------------------------------

# Terraform Cloud - single workspace
terraform {
  cloud {
    organization = "my-org"
    hostname     = "app.terraform.io"

    workspaces {
      name = "my-workspace"
    }
  }
}

# Terraform Cloud - workspace tags
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      tags = ["networking", "production"]
    }
  }
}

# Terraform Enterprise (self-hosted)
terraform {
  cloud {
    organization = "my-org"
    hostname     = "tfe.example.com"

    workspaces {
      name = "production-infrastructure"
    }
  }
}

#------------------------------------------------------------------------------
# CONSUL BACKEND
#------------------------------------------------------------------------------

# Consul backend
terraform {
  backend "consul" {
    address = "consul.example.com:8500"
    scheme  = "https"
    path    = "terraform/production"

    # Authentication
    http_auth = "username:password"

    # TLS
    ca_file   = "/path/to/ca.pem"
    cert_file = "/path/to/cert.pem"
    key_file  = "/path/to/key.pem"

    # State locking
    lock = true

    # Access token
    access_token = var.consul_token
  }
}

#------------------------------------------------------------------------------
# KUBERNETES BACKEND
#------------------------------------------------------------------------------

# Kubernetes secret backend
terraform {
  backend "kubernetes" {
    secret_suffix    = "state"
    config_path      = "~/.kube/config"
    namespace        = "terraform"
  }
}

# Kubernetes backend with in-cluster config
terraform {
  backend "kubernetes" {
    secret_suffix     = "state"
    in_cluster_config = true
    namespace         = "terraform"
    labels = {
      environment = "production"
      managed_by  = "terraform"
    }
  }
}

#------------------------------------------------------------------------------
# HTTP BACKEND
#------------------------------------------------------------------------------

# HTTP backend (generic)
terraform {
  backend "http" {
    address        = "https://api.example.com/terraform/state"
    lock_address   = "https://api.example.com/terraform/lock"
    unlock_address = "https://api.example.com/terraform/unlock"

    username = var.http_username
    password = var.http_password

    # Optional: skip TLS verification (not recommended for production)
    skip_cert_verification = false
  }
}

# HTTP backend with GitLab
terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/${var.gitlab_project_id}/terraform/state/${var.tf_state_name}"
    lock_address   = "https://gitlab.com/api/v4/projects/${var.gitlab_project_id}/terraform/state/${var.tf_state_name}/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/${var.gitlab_project_id}/terraform/state/${var.tf_state_name}/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    retry_wait_min = 5
    username       = var.gitlab_username
    password       = var.gitlab_token
  }
}

#------------------------------------------------------------------------------
# ARTIFACTORY BACKEND
#------------------------------------------------------------------------------

# Artifactory backend
terraform {
  backend "artifactory" {
    url      = "https://artifactory.example.com/artifactory"
    repo     = "terraform-state"
    subpath  = "production"
    username = var.artifactory_username
    password = var.artifactory_password
  }
}

#------------------------------------------------------------------------------
# ETCD BACKEND
#------------------------------------------------------------------------------

# etcd v3 backend
terraform {
  backend "etcdv3" {
    endpoints = ["https://etcd1.example.com:2379", "https://etcd2.example.com:2379"]
    prefix    = "/terraform/state/production"

    # TLS
    cacert_path = "/path/to/ca.pem"
    cert_path   = "/path/to/cert.pem"
    key_path    = "/path/to/key.pem"

    # Authentication
    username = var.etcd_username
    password = var.etcd_password

    # State locking
    lock = true
  }
}

#------------------------------------------------------------------------------
# POSTGRES BACKEND
#------------------------------------------------------------------------------

# PostgreSQL backend
terraform {
  backend "pg" {
    conn_str = "postgres://user:password@localhost/terraform_backend?sslmode=require"
    schema_name = "terraform_remote_state"
  }
}

#------------------------------------------------------------------------------
# OSS BACKEND (Alibaba Cloud)
#------------------------------------------------------------------------------

# Alibaba Cloud OSS backend
terraform {
  backend "oss" {
    bucket              = "terraform-state-bucket"
    prefix              = "production"
    key                 = "terraform.tfstate"
    region              = "cn-beijing"
    access_key          = var.alicloud_access_key
    secret_key          = var.alicloud_secret_key
    encrypt             = true
    tablestore_endpoint = "https://terraform-lock.cn-beijing.ots.aliyuncs.com"
    tablestore_table    = "terraform_lock"
  }
}

#------------------------------------------------------------------------------
# COS BACKEND (Tencent Cloud)
#------------------------------------------------------------------------------

# Tencent Cloud COS backend
terraform {
  backend "cos" {
    region  = "ap-guangzhou"
    bucket  = "terraform-state-1234567890"
    prefix  = "production"
    encrypt = true

    secret_id  = var.tencentcloud_secret_id
    secret_key = var.tencentcloud_secret_key
  }
}

#------------------------------------------------------------------------------
# MULTI-ENVIRONMENT PATTERN
#------------------------------------------------------------------------------

# Per-environment backend using variables
# This won't work directly - backends don't support variables
# Instead, use partial configuration

# terraform.tf
terraform {
  backend "s3" {
    # Partial configuration - values provided via backend config file
  }
}

# Backend config files:
# backend-dev.hcl
# bucket         = "terraform-state-dev"
# key            = "terraform.tfstate"
# region         = "us-west-2"
# encrypt        = true
# dynamodb_table = "terraform-locks-dev"

# backend-production.hcl
# bucket         = "terraform-state-production"
# key            = "terraform.tfstate"
# region         = "us-west-2"
# encrypt        = true
# dynamodb_table = "terraform-locks-production"

# Usage:
# terraform init -backend-config=backend-dev.hcl
# terraform init -backend-config=backend-production.hcl

#------------------------------------------------------------------------------
# WORKSPACE-BASED PATTERN
#------------------------------------------------------------------------------

# Single backend with workspaces for environments
terraform {
  backend "s3" {
    bucket               = "my-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-west-2"
    workspace_key_prefix = "environments"
    encrypt              = true
    dynamodb_table       = "terraform-locks"
  }
}

# Usage:
# terraform workspace new dev
# terraform workspace new staging
# terraform workspace new production
# terraform workspace select production

#------------------------------------------------------------------------------
# MIGRATION EXAMPLE
#------------------------------------------------------------------------------

# Migrating from local to S3 backend

# Step 1: Start with local backend (default)
# No backend block = local state file

# Step 2: Add S3 backend configuration
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Step 3: Run terraform init with migration
# terraform init -migrate-state

# Terraform will ask:
# "Do you want to copy existing state to the new backend?"
# Answer: yes

# Step 4: Verify state was migrated
# terraform state list

# Step 5: Backup and remove local state file
# mv terraform.tfstate terraform.tfstate.backup

#------------------------------------------------------------------------------
# BACKEND CONFIGURATION BEST PRACTICES
#------------------------------------------------------------------------------

# 1. Always enable encryption
# 2. Always enable state locking (if supported)
# 3. Enable versioning on storage backend
# 4. Use separate backends per environment
# 5. Implement access controls (IAM, RBAC)
# 6. Enable audit logging
# 7. Regular backups (even with versioning)
# 8. Use consistent naming conventions
# 9. Document backend configuration
# 10. Test disaster recovery procedures
