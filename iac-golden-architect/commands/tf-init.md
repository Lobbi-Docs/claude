---
description: Initialize Terraform projects with enterprise-grade best practices including backend configuration, provider setup, workspace initialization, and security controls
argument-hint: --backend [s3|azure|gcs|tfcloud] --cloud [aws|azure|gcp|all]
allowed-tools:
  - Bash
  - Write
  - Read
  - Edit
  - Glob
  - Grep
---

# Terraform Project Initialization

You are initializing a Terraform project with enterprise-grade best practices, security controls, and multi-cloud support.

## Input Parameters

Parse the user's command arguments:
- `--backend`: Backend type (s3, azure, gcs, tfcloud) - defaults to "s3"
- `--cloud`: Cloud provider (aws, azure, gcp, all) - defaults to "aws"
- Optional: `--workspace` - Initial workspace name
- Optional: `--project-name` - Project identifier
- Optional: `--region` - Primary region/location

## Execution Steps

### 1. Analyze Current Directory

Check if this is a new or existing Terraform project:

```bash
pwd
ls -la
```

Look for existing Terraform files (*.tf, .terraform/, terraform.tfstate).

### 2. Create Project Structure

Create the following directory structure if it doesn't exist:

```
.
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
├── modules/
├── policies/
│   ├── sentinel/
│   └── opa/
├── scripts/
└── tests/
```

Use the Bash tool to create these directories:

```bash
mkdir -p environments/{dev,staging,prod} modules policies/{sentinel,opa} scripts tests
```

### 3. Generate Backend Configuration

Based on the `--backend` parameter, create appropriate backend configuration:

**For S3 Backend:**

Create `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "REPLACE_WITH_BUCKET_NAME"
    key            = "terraform/REPLACE_WITH_PROJECT_NAME/terraform.tfstate"
    region         = "REPLACE_WITH_REGION"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"

    # Server-side encryption
    kms_key_id = "REPLACE_WITH_KMS_KEY_ARN"

    # Versioning
    versioning = true
  }
}
```

**For Azure Blob Backend:**

Create `backend.tf`:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "REPLACE_WITH_RG_NAME"
    storage_account_name = "REPLACE_WITH_STORAGE_ACCOUNT"
    container_name       = "terraform-state"
    key                  = "REPLACE_WITH_PROJECT_NAME.tfstate"

    # Security
    use_azuread_auth = true
  }
}
```

**For GCS Backend:**

Create `backend.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket  = "REPLACE_WITH_BUCKET_NAME"
    prefix  = "terraform/REPLACE_WITH_PROJECT_NAME"

    # Security
    encryption_key = "REPLACE_WITH_ENCRYPTION_KEY"
  }
}
```

**For Terraform Cloud:**

Create `backend.tf`:

```hcl
terraform {
  cloud {
    organization = "REPLACE_WITH_ORG_NAME"

    workspaces {
      name = "REPLACE_WITH_WORKSPACE_NAME"
    }
  }
}
```

### 4. Generate Provider Configuration

Based on the `--cloud` parameter, create `providers.tf`:

**For AWS:**

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
      Project     = var.project_name
      CostCenter  = var.cost_center
    }
  }

  # Security best practices
  skip_credentials_validation = false
  skip_metadata_api_check     = false

  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "terraform-session"
  }
}
```

**For Azure:**

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }

    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  # Security
  skip_provider_registration = false
  storage_use_azuread        = true
}
```

**For GCP:**

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    managed_by  = "terraform"
    environment = var.environment
    project     = var.project_name
  }
}
```

**For Multi-Cloud (all):**

Combine all provider configurations in a single `providers.tf`.

### 5. Generate Core Variable Files

Create `variables.tf`:

```hcl
# Common Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project identifier"
  type        = string
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}

# Cloud-specific variables based on --cloud parameter
```

Add cloud-specific variables based on the provider.

Create `outputs.tf`:

```hcl
# Output template - customize based on resources
output "project_info" {
  description = "Project metadata"
  value = {
    name        = var.project_name
    environment = var.environment
    timestamp   = timestamp()
  }
}
```

### 6. Create .gitignore

Create `.gitignore` with Terraform-specific entries:

```
# Local .terraform directories
**/.terraform/*

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude all .tfvars files
*.tfvars
*.tfvars.json

# Ignore override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Ignore CLI configuration files
.terraformrc
terraform.rc

# Ignore sensitive files
*.pem
*.key
*.crt
secrets.auto.tfvars

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Lock files (some teams commit this, adjust as needed)
# .terraform.lock.hcl
```

### 7. Install Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
        args:
          - --args=--lockfile=false
      - id: terraform_tflint
        args:
          - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl
      - id: terraform_tfsec
        args:
          - --args=--minimum-severity=MEDIUM
      - id: terraform_checkov
        args:
          - --args=--quiet
          - --args=--framework=terraform

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: detect-private-key
```

Install pre-commit hooks:

```bash
# Check if pre-commit is installed
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo "Pre-commit hooks installed successfully"
else
    echo "WARNING: pre-commit not found. Install with: pip install pre-commit"
    echo "Then run: pre-commit install"
fi
```

### 8. Create TFLint Configuration

Create `.tflint.hcl`:

```hcl
config {
  module = true
  force = false
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}
```

Adjust plugin section based on `--cloud` parameter.

### 9. Create Example tfvars Files

For each environment, create example tfvars:

`environments/dev/terraform.tfvars.example`:

```hcl
environment  = "dev"
project_name = "REPLACE_WITH_PROJECT_NAME"
cost_center  = "engineering"

# Cloud-specific variables
# aws_region = "us-east-1"
# azure_location = "eastus"
# gcp_region = "us-central1"

tags = {
  Owner       = "platform-team"
  Compliance  = "soc2"
}
```

### 10. Initialize Terraform

Run terraform init:

```bash
terraform init -upgrade
```

If `--workspace` parameter is provided, create and switch to workspace:

```bash
terraform workspace new [workspace-name] 2>/dev/null || terraform workspace select [workspace-name]
```

### 11. Create README

Create `README.md` with project documentation:

```markdown
# Terraform Project: [PROJECT_NAME]

## Overview

Infrastructure as Code for [PROJECT_NAME] using Terraform.

## Prerequisites

- Terraform >= 1.5.0
- Pre-commit (for hooks)
- TFLint
- TFSec
- Checkov

## Project Structure

- `environments/` - Environment-specific configurations
- `modules/` - Reusable Terraform modules
- `policies/` - Policy as Code (Sentinel/OPA)
- `scripts/` - Helper scripts
- `tests/` - Infrastructure tests

## Backend Configuration

Backend: [BACKEND_TYPE]

Update `backend.tf` with your specific values before running `terraform init`.

## Usage

### Initialize

```bash
terraform init
```

### Plan

```bash
terraform plan -var-file=environments/dev/terraform.tfvars
```

### Apply

```bash
terraform apply -var-file=environments/dev/terraform.tfvars
```

## Security

- All secrets must be stored in secure vaults (HashiCorp Vault, AWS Secrets Manager, etc.)
- Never commit `.tfvars` files with sensitive data
- Pre-commit hooks scan for security issues

## Compliance

This project follows SOC2 compliance requirements:
- Encryption at rest and in transit
- State file encryption
- Audit logging enabled
- Access controls via IAM

## Support

For issues or questions, contact the Platform Engineering team.
```

### 12. Create Makefile (Optional)

Create `Makefile` for common operations:

```makefile
.PHONY: init plan apply destroy validate format security-scan

ENVIRONMENT ?= dev
VAR_FILE := environments/$(ENVIRONMENT)/terraform.tfvars

init:
	terraform init -upgrade

plan:
	terraform plan -var-file=$(VAR_FILE)

apply:
	terraform apply -var-file=$(VAR_FILE)

destroy:
	terraform destroy -var-file=$(VAR_FILE)

validate:
	terraform fmt -check -recursive
	terraform validate
	tflint --recursive
	tfsec .
	checkov -d . --quiet

format:
	terraform fmt -recursive

security-scan:
	@echo "Running security scans..."
	tfsec . --format json > tfsec-results.json
	checkov -d . --output json > checkov-results.json
	@echo "Results saved to tfsec-results.json and checkov-results.json"

cost-estimate:
	@echo "Cost estimation requires Infracost"
	@command -v infracost >/dev/null 2>&1 || { echo "Infracost not installed"; exit 1; }
	infracost breakdown --path .

clean:
	rm -rf .terraform
	rm -f .terraform.lock.hcl
	rm -f terraform.tfstate*
```

## Validation

After initialization, validate the setup:

```bash
# Format check
terraform fmt -check -recursive

# Validation
terraform validate

# Security scan (if tools are installed)
command -v tfsec >/dev/null && tfsec . || echo "TFSec not installed"
command -v checkov >/dev/null && checkov -d . --quiet || echo "Checkov not installed"
```

## Output Summary

Provide a summary to the user:

```
Terraform project initialized successfully!

Backend: [BACKEND_TYPE]
Cloud Provider(s): [CLOUD_PROVIDERS]
Workspace: [WORKSPACE_NAME]

Next Steps:
1. Update backend.tf with your specific backend configuration
2. Copy environments/dev/terraform.tfvars.example to terraform.tfvars
3. Fill in your environment-specific values
4. Run: terraform plan -var-file=environments/dev/terraform.tfvars

Files Created:
- backend.tf (update with your values)
- providers.tf
- variables.tf
- outputs.tf
- .gitignore
- .pre-commit-config.yaml
- .tflint.hcl
- README.md
- Makefile
- Directory structure for environments, modules, policies

Security Tools Configured:
- Pre-commit hooks (run 'pre-commit install')
- TFLint
- TFSec
- Checkov

Documentation: See README.md for usage instructions
```

## Error Handling

If any step fails:
1. Report the specific error to the user
2. Provide remediation steps
3. Do not proceed with subsequent steps if a critical step fails
4. For non-critical failures (like pre-commit installation), warn but continue

## Best Practices Applied

- Encrypted state files
- State locking enabled
- Provider version constraints
- Required Terraform version
- Default tags/labels
- Security scanning in pre-commit
- Workspace support
- Environment separation
- Secret detection
- Cost center tagging
- SOC2 compliance ready
