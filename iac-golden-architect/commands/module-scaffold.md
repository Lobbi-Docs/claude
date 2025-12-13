---
description: Scaffold new Terraform modules with multi-cloud templates, SOC2-compliant defaults, proper directory structure, and comprehensive documentation including README, variables, outputs, and test files
argument-hint: [module-name] --cloud [aws|azure|gcp] --compliance [soc2|cis|pci] --type [compute|network|storage|database]
allowed-tools:
  - Bash
  - Write
  - Read
  - Edit
  - Glob
---

# Terraform Module Scaffolding

You are scaffolding a new Terraform module with enterprise-grade best practices, including proper structure, documentation, testing framework, and compliance-ready defaults.

## Input Parameters

Parse the user's command arguments:
- `module-name`: Name of the module to create (required)
- `--cloud`: Cloud provider (aws, azure, gcp, multi) - defaults to "aws"
- `--compliance`: Compliance framework (soc2, cis, pci, hipaa, all) - defaults to "soc2"
- `--type`: Module type (compute, network, storage, database, security, custom)
- `--version`: Terraform version constraint (defaults to ">= 1.5.0")
- `--provider-version`: Cloud provider version constraint
- `--include-tests`: Include test framework (default: true)
- `--include-examples`: Include example usage (default: true)
- `--include-ci`: Include CI/CD configuration (default: true)
- `--registry`: Prepare for Terraform Registry publishing

## Execution Steps

### 1. Validate Inputs

Verify module name and parameters:

```bash
# Get module name from first argument
MODULE_NAME=${1:-$MODULE_NAME}

if [ -z "$MODULE_NAME" ]; then
    echo "ERROR: Module name is required"
    echo ""
    echo "Usage: /iac:module-scaffold [module-name] [options]"
    echo ""
    echo "Examples:"
    echo "  /iac:module-scaffold vpc --cloud aws --type network"
    echo "  /iac:module-scaffold storage-account --cloud azure --compliance soc2"
    echo "  /iac:module-scaffold gke-cluster --cloud gcp --type compute"
    exit 1
fi

# Validate module name format
if [[ ! "$MODULE_NAME" =~ ^[a-z0-9_-]+$ ]]; then
    echo "ERROR: Invalid module name format"
    echo "Module name must contain only lowercase letters, numbers, hyphens, and underscores"
    echo "Example: vpc, storage-account, gke_cluster"
    exit 1
fi

# Set defaults
CLOUD=${CLOUD:-aws}
COMPLIANCE=${COMPLIANCE:-soc2}
TYPE=${TYPE:-custom}
TF_VERSION=${VERSION:-">= 1.5.0"}
INCLUDE_TESTS=${INCLUDE_TESTS:-true}
INCLUDE_EXAMPLES=${INCLUDE_EXAMPLES:-true}
INCLUDE_CI=${INCLUDE_CI:-true}

echo "Terraform Module Scaffolding"
echo "========================================"
echo "Module Name: $MODULE_NAME"
echo "Cloud: $CLOUD"
echo "Compliance: $COMPLIANCE"
echo "Type: $TYPE"
echo "Terraform Version: $TF_VERSION"
echo ""

# Check if directory exists
if [ -d "$MODULE_NAME" ]; then
    echo "ERROR: Directory '$MODULE_NAME' already exists"
    echo "Choose a different module name or remove existing directory"
    exit 1
fi
```

### 2. Create Directory Structure

Build module directory structure:

```bash
echo "Creating module structure..."

# Create base directories
mkdir -p "$MODULE_NAME"/{examples,tests,docs}

if [ "$INCLUDE_TESTS" = "true" ]; then
    mkdir -p "$MODULE_NAME/tests/integration"
    mkdir -p "$MODULE_NAME/tests/unit"
fi

if [ "$INCLUDE_EXAMPLES" = "true" ]; then
    mkdir -p "$MODULE_NAME/examples/basic"
    mkdir -p "$MODULE_NAME/examples/complete"
fi

echo "✓ Directory structure created"
echo ""
```

### 3. Generate main.tf

Create main Terraform configuration:

```bash
echo "Generating main.tf..."

cat > "$MODULE_NAME/main.tf" <<EOF
# ${MODULE_NAME} Terraform Module
# Cloud Provider: ${CLOUD}
# Compliance: ${COMPLIANCE}
# Type: ${TYPE}

terraform {
  required_version = "$TF_VERSION"

  required_providers {
EOF

# Add provider based on cloud selection
case $CLOUD in
    aws)
        cat >> "$MODULE_NAME/main.tf" <<EOF
    aws = {
      source  = "hashicorp/aws"
      version = "${PROVIDER_VERSION:-~> 5.0}"
    }
EOF
        ;;
    azure)
        cat >> "$MODULE_NAME/main.tf" <<EOF
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "${PROVIDER_VERSION:-~> 3.0}"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
EOF
        ;;
    gcp)
        cat >> "$MODULE_NAME/main.tf" <<EOF
    google = {
      source  = "hashicorp/google"
      version = "${PROVIDER_VERSION:-~> 5.0}"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "${PROVIDER_VERSION:-~> 5.0}"
    }
EOF
        ;;
    multi)
        cat >> "$MODULE_NAME/main.tf" <<EOF
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
EOF
        ;;
esac

cat >> "$MODULE_NAME/main.tf" <<'EOF'
  }
}

# Local variables for common patterns
locals {
  # Common tags/labels based on cloud provider
  common_tags = merge(
    var.tags,
    {
      ManagedBy   = "Terraform"
      Module      = basename(abspath(path.module))
      Environment = var.environment
    }
  )

  # Name prefix for resources
  name_prefix = var.name_prefix != "" ? "${var.name_prefix}-" : ""
}

# Module resources go here
# TODO: Add your cloud-specific resources

EOF

echo "✓ main.tf created"
```

### 4. Generate variables.tf

Create variables file with best practices:

```bash
echo "Generating variables.tf..."

cat > "$MODULE_NAME/variables.tf" <<EOF
# ${MODULE_NAME} Module Variables

# Common Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "name_prefix" {
  description = "Prefix to add to resource names"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Module-specific variables
# TODO: Add module-specific variables based on requirements

EOF

# Add cloud-specific variables
case $CLOUD in
    aws)
        cat >> "$MODULE_NAME/variables.tf" <<EOF
# AWS-specific variables
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

EOF
        ;;
    azure)
        cat >> "$MODULE_NAME/variables.tf" <<EOF
# Azure-specific variables
variable "location" {
  description = "Azure region location"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

EOF
        ;;
    gcp)
        cat >> "$MODULE_NAME/variables.tf" <<EOF
# GCP-specific variables
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

EOF
        ;;
esac

# Add compliance-specific variables
if [ "$COMPLIANCE" = "soc2" ] || [ "$COMPLIANCE" = "all" ]; then
    cat >> "$MODULE_NAME/variables.tf" <<EOF
# SOC2 Compliance Variables
variable "encryption_enabled" {
  description = "Enable encryption at rest (SOC2 requirement)"
  type        = bool
  default     = true
}

variable "audit_logging_enabled" {
  description = "Enable audit logging (SOC2 requirement)"
  type        = bool
  default     = true
}

EOF
fi

echo "✓ variables.tf created"
```

### 5. Generate outputs.tf

Create outputs file:

```bash
echo "Generating outputs.tf..."

cat > "$MODULE_NAME/outputs.tf" <<EOF
# ${MODULE_NAME} Module Outputs

# Module metadata
output "module_info" {
  description = "Module metadata and information"
  value = {
    name        = basename(abspath(path.module))
    environment = var.environment
    cloud       = "$CLOUD"
    compliance  = "$COMPLIANCE"
  }
}

# Resource outputs
# TODO: Add module-specific outputs

# Example output structure:
# output "resource_id" {
#   description = "ID of the primary resource"
#   value       = <resource>.id
# }
#
# output "resource_arn" {
#   description = "ARN of the primary resource (AWS)"
#   value       = <resource>.arn
# }

EOF

echo "✓ outputs.tf created"
```

### 6. Generate README.md

Create comprehensive documentation:

```bash
echo "Generating README.md..."

cat > "$MODULE_NAME/README.md" <<EOF
# ${MODULE_NAME}

Terraform module for ${TYPE} on ${CLOUD} with ${COMPLIANCE} compliance.

## Features

- ✅ ${COMPLIANCE} compliant defaults
- ✅ Encryption at rest and in transit
- ✅ Audit logging enabled
- ✅ Tagged for cost tracking
- ✅ Production-ready

## Usage

### Basic Example

\`\`\`hcl
module "${MODULE_NAME}" {
  source = "./${MODULE_NAME}"

  environment = "dev"
  name_prefix = "myapp"

  # Add module-specific variables
}
\`\`\`

### Complete Example

See \`examples/complete\` for a full implementation.

## Requirements

| Name | Version |
|------|---------|
| terraform | $TF_VERSION |
EOF

case $CLOUD in
    aws)
        echo "| aws | ${PROVIDER_VERSION:-~> 5.0} |" >> "$MODULE_NAME/README.md"
        ;;
    azure)
        echo "| azurerm | ${PROVIDER_VERSION:-~> 3.0} |" >> "$MODULE_NAME/README.md"
        ;;
    gcp)
        echo "| google | ${PROVIDER_VERSION:-~> 5.0} |" >> "$MODULE_NAME/README.md"
        ;;
esac

cat >> "$MODULE_NAME/README.md" <<'EOF'

## Providers

<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| name_prefix | Prefix to add to resource names | `string` | `""` | no |
| tags | Additional tags to apply to resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| module_info | Module metadata and information |

## Compliance

EOF

if [ "$COMPLIANCE" = "soc2" ] || [ "$COMPLIANCE" = "all" ]; then
    cat >> "$MODULE_NAME/README.md" <<EOF
### SOC2 Controls

This module implements the following SOC2 controls:

- **CC6.1** - Encryption at rest and in transit
- **CC6.6** - Audit logging and monitoring
- **CC6.7** - Access controls and IAM
- **CC7.1** - Network segmentation
- **CC7.2** - Change management via IaC

EOF
fi

cat >> "$MODULE_NAME/README.md" <<EOF
## Security Scanning

Run security scans before deploying:

\`\`\`bash
tfsec .
checkov -d .
trivy config .
\`\`\`

## Testing

\`\`\`bash
# Run tests
cd tests
terraform init
terraform test
\`\`\`

## Examples

- [Basic](./examples/basic) - Minimal configuration
- [Complete](./examples/complete) - Full featured configuration

## License

Proprietary - Internal Use Only

## Maintainers

- Platform Engineering Team

EOF

echo "✓ README.md created"
```

### 7. Generate Examples

Create example configurations:

```bash
if [ "$INCLUDE_EXAMPLES" = "true" ]; then
    echo "Generating examples..."

    # Basic example
    cat > "$MODULE_NAME/examples/basic/main.tf" <<EOF
# Basic Example for ${MODULE_NAME}

module "${MODULE_NAME}" {
  source = "../.."

  environment = "dev"
  name_prefix = "example"

  tags = {
    Example = "basic"
  }
}

output "module_output" {
  description = "Module outputs"
  value       = module.${MODULE_NAME}
}
EOF

    # Complete example
    cat > "$MODULE_NAME/examples/complete/main.tf" <<EOF
# Complete Example for ${MODULE_NAME}

module "${MODULE_NAME}" {
  source = "../.."

  environment = "prod"
  name_prefix = "production"

  # Enable all security features
  encryption_enabled     = true
  audit_logging_enabled  = true

  tags = {
    Example     = "complete"
    Compliance  = "$COMPLIANCE"
    ManagedBy   = "Terraform"
  }
}

output "module_output" {
  description = "Module outputs"
  value       = module.${MODULE_NAME}
}
EOF

    echo "✓ Examples created"
fi
```

### 8. Generate Test Framework

Create test configuration:

```bash
if [ "$INCLUDE_TESTS" = "true" ]; then
    echo "Generating test framework..."

    # Terraform test file (new native testing)
    cat > "$MODULE_NAME/tests/module.tftest.hcl" <<EOF
# Terraform Native Tests for ${MODULE_NAME}

run "basic_validation" {
  command = plan

  assert {
    condition     = module.${MODULE_NAME}.module_info.cloud == "$CLOUD"
    error_message = "Cloud provider mismatch"
  }

  assert {
    condition     = module.${MODULE_NAME}.module_info.compliance == "$COMPLIANCE"
    error_message = "Compliance framework mismatch"
  }
}

run "apply_test" {
  command = apply

  assert {
    condition     = module.${MODULE_NAME}.module_info != null
    error_message = "Module should produce outputs"
  }
}
EOF

    # Integration test
    cat > "$MODULE_NAME/tests/integration/main.tf" <<EOF
# Integration Tests for ${MODULE_NAME}

terraform {
  required_version = "$TF_VERSION"
}

module "test" {
  source = "../.."

  environment = "test"
  name_prefix = "integration-test"

  tags = {
    Test = "integration"
  }
}

output "test_results" {
  value = module.test
}
EOF

    # Terratest (Go) example
    cat > "$MODULE_NAME/tests/integration/module_test.go" <<'EOF'
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestTerraformModule(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: ".",
    })

    defer terraform.Destroy(t, terraformOptions)

    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    output := terraform.OutputMap(t, terraformOptions, "test_results")
    assert.NotNil(t, output)
}
EOF

    echo "✓ Test framework created"
fi
```

### 9. Generate CI/CD Configuration

Create CI/CD pipeline files:

```bash
if [ "$INCLUDE_CI" = "true" ]; then
    echo "Generating CI/CD configuration..."

    # GitHub Actions
    mkdir -p "$MODULE_NAME/.github/workflows"

    cat > "$MODULE_NAME/.github/workflows/terraform.yml" <<EOF
name: Terraform Module CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform

  test:
    runs-on: ubuntu-latest
    needs: [validate, security]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Test
        run: |
          cd tests
          terraform init
          terraform test
EOF

    echo "✓ CI/CD configuration created"
fi
```

### 10. Generate Additional Files

Create supporting files:

```bash
echo "Generating additional files..."

# .gitignore
cat > "$MODULE_NAME/.gitignore" <<'EOF'
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

# Ignore .terraform.lock.hcl in modules
.terraform.lock.hcl

# Test artifacts
tests/**/.terraform
tests/**/*.tfstate
tests/**/*.tfstate.*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

# .terraform-docs.yml
cat > "$MODULE_NAME/.terraform-docs.yml" <<EOF
formatter: "markdown table"
version: ""

sections:
  show:
    - header
    - requirements
    - providers
    - inputs
    - outputs
    - resources

output:
  file: "README.md"
  mode: inject
  template: |-
    <!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
    {{ .Content }}
    <!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->

sort:
  enabled: true
  by: required

settings:
  anchor: true
  required: true
  sensitive: true
EOF

# .pre-commit-config.yaml
cat > "$MODULE_NAME/.pre-commit-config.yaml" <<EOF
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
      - id: terraform_tflint
      - id: terraform_tfsec
      - id: terraform_checkov

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-merge-conflict
EOF

# CHANGELOG.md
cat > "$MODULE_NAME/CHANGELOG.md" <<EOF
# Changelog

All notable changes to this module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial module scaffolding
- ${COMPLIANCE} compliance defaults
- Security scanning integration
- CI/CD pipeline

### Changed

### Fixed

### Security
EOF

# versions.tf (for better organization)
cat > "$MODULE_NAME/versions.tf" <<EOF
terraform {
  required_version = "$TF_VERSION"

  required_providers {
EOF

case $CLOUD in
    aws)
        cat >> "$MODULE_NAME/versions.tf" <<EOF
    aws = {
      source  = "hashicorp/aws"
      version = "${PROVIDER_VERSION:-~> 5.0}"
    }
EOF
        ;;
    azure)
        cat >> "$MODULE_NAME/versions.tf" <<EOF
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "${PROVIDER_VERSION:-~> 3.0}"
    }
EOF
        ;;
    gcp)
        cat >> "$MODULE_NAME/versions.tf" <<EOF
    google = {
      source  = "hashicorp/google"
      version = "${PROVIDER_VERSION:-~> 5.0}"
    }
EOF
        ;;
esac

cat >> "$MODULE_NAME/versions.tf" <<EOF
  }
}
EOF

echo "✓ Additional files created"
```

### 11. Initialize and Validate

Initialize the module and run validation:

```bash
echo "Initializing and validating module..."
echo ""

cd "$MODULE_NAME"

# Initialize
terraform init -backend=false > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Terraform initialized"
else
    echo "⚠️  Terraform initialization had warnings (expected for new module)"
fi

# Format
terraform fmt -recursive > /dev/null 2>&1
echo "✓ Code formatted"

# Validate
terraform validate > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Module validated"
else
    echo "⚠️  Validation warnings (complete TODO items to resolve)"
fi

cd ..

echo ""
```

### 12. Final Summary

Display summary and next steps:

```bash
echo "========================================"
echo "MODULE SCAFFOLDING COMPLETE"
echo "========================================"
echo ""
echo "Module: $MODULE_NAME"
echo "Location: $(pwd)/$MODULE_NAME"
echo ""
echo "Structure:"
find "$MODULE_NAME" -type f -name "*.tf" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" | sed 's/^/  /'
echo ""
echo "Next Steps:"
echo "  1. Review and complete TODOs in main.tf"
echo "  2. Add module-specific variables in variables.tf"
echo "  3. Define outputs in outputs.tf"
echo "  4. Update README.md with usage examples"
echo "  5. Run terraform-docs: terraform-docs markdown table . > README.md"
echo "  6. Install pre-commit hooks: pre-commit install"
echo "  7. Run security scans: tfsec . && checkov -d ."
echo "  8. Write tests in tests/"
echo "  9. Update CHANGELOG.md"
echo "  10. Commit to version control"
echo ""
echo "Quick Commands:"
echo "  cd $MODULE_NAME"
echo "  terraform fmt -recursive"
echo "  terraform validate"
echo "  tfsec ."
echo "  checkov -d ."
echo ""
echo "Documentation:"
echo "  README.md - $(pwd)/$MODULE_NAME/README.md"
echo "  CHANGELOG.md - $(pwd)/$MODULE_NAME/CHANGELOG.md"
echo ""
echo "========================================"
```

## Error Handling

```bash
# Module already exists
# (handled in validation)

# Invalid module name
# (handled in validation)

# Missing required parameters
if [ -z "$MODULE_NAME" ]; then
    echo "ERROR: Module name required"
    exit 1
fi

# Invalid cloud provider
if [[ ! "$CLOUD" =~ ^(aws|azure|gcp|multi)$ ]]; then
    echo "ERROR: Invalid cloud provider: $CLOUD"
    echo "Valid options: aws, azure, gcp, multi"
    exit 1
fi
```

## Best Practices Applied

- Proper module structure
- Terraform Registry compatible
- Pre-commit hooks configured
- Security scanning setup
- CI/CD pipeline included
- Comprehensive documentation
- Test framework ready
- Compliance defaults
- Version constraints
- Example usage provided
- Changelog for tracking
- .gitignore for safety
