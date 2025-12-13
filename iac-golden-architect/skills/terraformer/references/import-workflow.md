# Terraformer Import Workflow

Complete step-by-step guide for importing existing infrastructure into Terraform using Terraformer.

## Table of Contents

1. [Pre-Import Preparation](#pre-import-preparation)
2. [Running Terraformer](#running-terraformer)
3. [Post-Import Cleanup](#post-import-cleanup)
4. [State Integration](#state-integration)
5. [Resource Filtering](#resource-filtering)
6. [Validation and Testing](#validation-and-testing)
7. [Advanced Workflows](#advanced-workflows)

---

## Pre-Import Preparation

### 1. Assess Infrastructure Scope

**Document what exists:**
```bash
# AWS: List resources
aws ec2 describe-vpcs
aws ec2 describe-instances
aws rds describe-db-instances

# Azure: List resources
az resource list --resource-group my-rg --output table

# GCP: List resources
gcloud compute instances list
gcloud sql instances list

# Kubernetes: List resources
kubectl get all --all-namespaces
```

**Create inventory spreadsheet:**
| Resource Type | Count | Region/Location | Tags/Labels | Priority |
|--------------|-------|-----------------|-------------|----------|
| VPC          | 3     | us-east-1       | Env=prod    | High     |
| EC2 Instance | 15    | us-east-1       | Team=api    | High     |
| RDS          | 5     | us-east-1       | Env=prod    | Critical |

### 2. Set Up Project Structure

```bash
# Create project directory
mkdir terraform-import-project
cd terraform-import-project

# Create directory structure
mkdir -p {generated,modules,environments,docs}

# Initialize git repository
git init
echo "generated/" >> .gitignore
echo "*.tfstate" >> .gitignore
echo "*.tfstate.backup" >> .gitignore
echo ".terraform/" >> .gitignore

git add .gitignore
git commit -m "Initial commit"
```

### 3. Configure Authentication

**AWS:**
```bash
# Option 1: AWS CLI configuration
aws configure
aws sts get-caller-identity

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"

# Option 3: AWS Profile
export AWS_PROFILE=terraform-import
```

**Azure:**
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Production"
az account show

# Or use Service Principal
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."
```

**GCP:**
```bash
# Login with gcloud
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project my-project-id
gcloud config list

# Or use Service Account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

**Kubernetes:**
```bash
# Verify kubectl context
kubectl config current-context
kubectl config get-contexts

# Switch context if needed
kubectl config use-context production-cluster

# Test access
kubectl get nodes
```

### 4. Create Import Plan

**Document import strategy:**
```yaml
# import-plan.yaml
import_strategy:
  provider: aws
  regions:
    - us-east-1
    - us-west-2

  phases:
    - name: "Core Networking"
      resources: [vpc, subnet, route_table, internet_gateway, nat_gateway, security_group]
      filters:
        - "Name=tag:Environment;Value=production"

    - name: "Compute Resources"
      resources: [ec2_instance, autoscaling, load_balancer]
      filters:
        - "Name=tag:Environment;Value=production"

    - name: "Data Layer"
      resources: [rds, dynamodb, elasticache, s3]
      filters:
        - "Name=tag:Environment;Value=production"

    - name: "Application Services"
      resources: [lambda, api_gateway, ecs, eks]
      filters:
        - "Name=tag:Environment;Value=production"

  output_organization:
    pattern: "generated/{provider}/{region}/{service}"

  state_management:
    backend: "s3"
    bucket: "terraform-state-bucket"
    region: "us-east-1"
```

### 5. Install and Verify Tools

```bash
# Install Terraformer
# (See installation instructions in SKILL.md)

# Verify installation
terraformer version

# Install Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads

# Verify Terraform
terraform version

# Install terraform-docs (optional but recommended)
brew install terraform-docs

# Install tflint (optional but recommended)
brew install tflint
```

### 6. Create Helper Scripts

**Import script template:**
```bash
#!/bin/bash
# scripts/import-infrastructure.sh

set -e

PROVIDER="${1:-aws}"
RESOURCES="${2:-vpc,subnet,ec2_instance}"
REGIONS="${3:-us-east-1}"
OUTPUT_PATH="${4:-generated}"

echo "Importing infrastructure from ${PROVIDER}..."
echo "Resources: ${RESOURCES}"
echo "Regions: ${REGIONS}"

terraformer import ${PROVIDER} \
  --resources="${RESOURCES}" \
  --regions="${REGIONS}" \
  --compact \
  --path-pattern="${OUTPUT_PATH}/${PROVIDER}/{region}/{service}" \
  --filter="Name=tag:Environment;Value=production"

echo "Import complete. Review output in: ${OUTPUT_PATH}/"
```

---

## Running Terraformer

### Phase 1: Dry Run and Discovery

```bash
# List available resources
terraformer import aws list

# Dry run to preview what will be imported
terraformer import aws \
  --resources=vpc \
  --regions=us-east-1 \
  --dry-run

# This shows what will be imported without actually doing it
```

### Phase 2: Start with Core Infrastructure

Import foundational resources first.

```bash
# Import VPC and networking (no dependencies)
terraformer import aws \
  --resources=vpc,subnet,route_table,internet_gateway,nat_gateway \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --compact \
  --path-pattern="generated/aws/{region}/{service}"

# Verify output
ls -la generated/aws/us-east-1/
```

### Phase 3: Import Dependent Resources

Import resources that depend on core infrastructure.

```bash
# Import security groups (depends on VPC)
terraformer import aws \
  --resources=security_group \
  --regions=us-east-1 \
  --filter="Name=vpc-id;Value=vpc-12345678" \
  --compact

# Import EC2 instances (depends on VPC, subnets, security groups)
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --compact

# Import RDS (depends on VPC, subnets, security groups)
terraformer import aws \
  --resources=rds \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --compact
```

### Phase 4: Import Application Services

```bash
# Import Lambda functions and API Gateway
terraformer import aws \
  --resources=lambda,api_gateway \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --compact

# Import EKS clusters
terraformer import aws \
  --resources=eks \
  --regions=us-east-1 \
  --compact

# Import S3 buckets
terraformer import aws \
  --resources=s3 \
  --regions=us-east-1 \
  --compact
```

### Phase 5: Import IAM and Cross-Service Resources

```bash
# Import IAM roles and policies
terraformer import aws \
  --resources=iam_role,iam_policy,iam_user,iam_group \
  --regions=us-east-1 \
  --compact

# Import CloudWatch and monitoring
terraformer import aws \
  --resources=cloudwatch \
  --regions=us-east-1 \
  --compact
```

### Multi-Region Import

```bash
# Import from multiple regions sequentially
REGIONS=("us-east-1" "us-west-2" "eu-west-1")

for region in "${REGIONS[@]}"; do
  echo "Importing from ${region}..."

  terraformer import aws \
    --resources=vpc,subnet,ec2_instance,rds \
    --regions=$region \
    --filter="Name=tag:Environment;Value=production" \
    --compact \
    --path-pattern="generated/aws/{region}/{service}"

  echo "Completed ${region}"
done
```

---

## Post-Import Cleanup

### 1. Review Generated Files

```bash
# Navigate to generated directory
cd generated/aws/us-east-1/vpc

# List generated files
ls -la

# Typical output:
# vpc.tf
# terraform.tfstate
# variables.tf
# outputs.tf
# provider.tf
```

### 2. Remove Unnecessary Content

**Remove default values:**
```bash
# Before cleanup:
resource "aws_vpc" "tfer--vpc-002D-12345678" {
  assign_generated_ipv6_cidr_block     = false  # Remove (default)
  enable_dns_hostnames                 = true
  enable_dns_support                   = true   # Remove (default)
  enable_network_address_usage_metrics = false  # Remove (default)
  cidr_block                           = "10.0.0.0/16"
  instance_tenancy                     = "default"  # Remove (default)
}

# After cleanup:
resource "aws_vpc" "tfer--vpc-002D-12345678" {
  enable_dns_hostnames = true
  cidr_block           = "10.0.0.0/16"
}
```

**Automate cleanup with script:**
```bash
#!/bin/bash
# scripts/cleanup-terraform.sh

# Remove common default values
find generated/ -name "*.tf" -type f -exec sed -i '' \
  -e '/enable_dns_support.*= true/d' \
  -e '/instance_tenancy.*= "default"/d' \
  -e '/assign_generated_ipv6_cidr_block.*= false/d' \
  {} \;

echo "Cleanup complete"
```

### 3. Rename Resources Meaningfully

**Before:**
```hcl
resource "aws_instance" "tfer--i-002D-0123456789abcdef0" {
  ami           = "ami-12345678"
  instance_type = "t3.large"
}
```

**After:**
```hcl
resource "aws_instance" "web_server_1" {
  ami           = "ami-12345678"
  instance_type = "t3.large"
}
```

**Rename in state file:**
```bash
# Initialize Terraform first
terraform init

# Rename resource in state
terraform state mv \
  'aws_instance.tfer--i-002D-0123456789abcdef0' \
  'aws_instance.web_server_1'

# Update .tf file to match
# Edit the resource block name manually
```

### 4. Extract Variables

**Before:**
```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
    Team        = "platform"
  }
}
```

**After:**
```hcl
# variables.tf
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Team        = "platform"
    ManagedBy   = "terraform"
  }
}

# main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.environment}-vpc"
      Environment = var.environment
    }
  )
}
```

### 5. Consolidate Files

**Organize by logical grouping:**
```bash
# Before: Each resource type in separate file
generated/aws/us-east-1/
├── vpc/vpc.tf
├── subnet/subnet.tf
├── route_table/route_table.tf
└── internet_gateway/internet_gateway.tf

# After: Consolidate related resources
modules/networking/
├── main.tf          # VPC, subnets, route tables
├── variables.tf     # Input variables
├── outputs.tf       # Output values
├── security.tf      # Security groups, NACLs
└── README.md        # Documentation
```

### 6. Add Input Validation

```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string

  validation {
    condition     = can(regex("^t3\\.(micro|small|medium|large)$", var.instance_type))
    error_message = "Instance type must be a valid t3 type."
  }
}
```

### 7. Add Output Definitions

```hcl
# outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "security_group_id" {
  description = "ID of main security group"
  value       = aws_security_group.main.id
}
```

### 8. Add Lifecycle Rules

```hcl
resource "aws_instance" "web_server" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Ignore changes to tags added outside Terraform
  lifecycle {
    ignore_changes = [
      tags["LastModified"],
      tags["ModifiedBy"],
    ]
  }
}

resource "aws_autoscaling_group" "main" {
  # ...

  # Prevent destroy for critical resources
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_launch_template" "main" {
  # ...

  # Create before destroy for zero-downtime updates
  lifecycle {
    create_before_destroy = true
  }
}
```

---

## State Integration

### Option 1: Use Generated State As-Is

```bash
# Navigate to imported directory
cd generated/aws/us-east-1/vpc

# Initialize Terraform
terraform init

# Verify state matches reality
terraform plan
# Expected: No changes. Infrastructure is up-to-date.

# If changes appear, investigate and fix
```

### Option 2: Merge with Existing State

```bash
# Pull existing state
cd existing-terraform-project
terraform state pull > existing.tfstate

# Pull imported state
cd ../generated/aws/us-east-1/vpc
terraform state pull > imported.tfstate

# Merge states manually or with script
# This requires careful planning!

# Alternative: Use terraform state mv to move resources
terraform state mv \
  -state=../generated/aws/us-east-1/vpc/terraform.tfstate \
  -state-out=./terraform.tfstate \
  aws_vpc.tfer--vpc-12345678 \
  aws_vpc.main
```

### Option 3: Configure Remote Backend

```bash
# Create backend configuration
cat > backend.tf <<'EOF'
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "imported/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"

    # Optional: S3 bucket versioning for state history
  }
}
EOF

# Initialize with backend
terraform init

# Migrate local state to remote
# Terraform will prompt to migrate
```

### Option 4: Workspace Strategy

```bash
# Create workspaces for environments
terraform workspace new production
terraform workspace new staging
terraform workspace new development

# Use workspace in configuration
locals {
  environment = terraform.workspace
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidrs[local.environment]

  tags = {
    Name        = "${local.environment}-vpc"
    Environment = local.environment
  }
}
```

---

## Resource Filtering

### Filtering by Tags

**AWS:**
```bash
# Single tag filter
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production"

# Multiple tag filters (AND logic)
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --filter="Name=tag:Team;Value=platform"

# Import everything with specific tag
terraformer import aws \
  --resources=* \
  --regions=us-east-1 \
  --filter="Name=tag:ManagedBy;Value=terraform"
```

### Filtering by Resource ID

```bash
# Import specific VPC
terraformer import aws \
  --resources=vpc \
  --regions=us-east-1 \
  --filter="Name=id;Value=vpc-12345678"

# Import specific instance
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --filter="Name=id;Value=i-0123456789abcdef0"

# Import specific S3 bucket
terraformer import aws \
  --resources=s3 \
  --regions=us-east-1 \
  --filter="Name=id;Value=my-bucket-name"
```

### Filtering by Name Pattern

```bash
# Import resources matching name pattern
terraformer import aws \
  --resources=s3 \
  --regions=us-east-1 \
  --filter="Name=id;Value=prod-*"

# Import RDS instances with naming pattern
terraformer import aws \
  --resources=rds \
  --regions=us-east-1 \
  --filter="Name=db-instance-id;Value=production-*"
```

### Filtering by VPC

```bash
# Import all resources in specific VPC
VPC_ID="vpc-12345678"

terraformer import aws \
  --resources=subnet,route_table,security_group,ec2_instance \
  --regions=us-east-1 \
  --filter="Name=vpc-id;Value=${VPC_ID}"
```

### Excluding Resources

```bash
# Use excludes parameter (not all providers support this)
terraformer import aws \
  --resources=vpc \
  --regions=us-east-1 \
  --excludes="default-vpc-*"

# Alternative: Import all, then remove unwanted
terraformer import aws --resources=vpc --regions=us-east-1

# Then manually remove or use:
terraform state rm 'aws_vpc.default'
```

---

## Validation and Testing

### 1. Initialize Terraform

```bash
cd generated/aws/us-east-1/vpc

terraform init

# Expected output:
# Terraform has been successfully initialized!
```

### 2. Validate Configuration

```bash
# Validate syntax
terraform validate

# Expected output:
# Success! The configuration is valid.

# If errors, fix them before proceeding
```

### 3. Run Plan (Critical Step)

```bash
# Run plan to check for drift
terraform plan

# Expected output:
# No changes. Infrastructure is up-to-date.

# If changes detected:
# Review each change carefully
# Determine if it's:
# - Missing attribute in imported code
# - Default value that should be explicit
# - Actual drift from manual changes
```

### 4. Address Plan Differences

**Common causes of drift:**

1. **Missing lifecycle ignores:**
```hcl
resource "aws_instance" "web" {
  # ...

  lifecycle {
    ignore_changes = [
      tags["LastModified"],
      user_data,  # If changed outside Terraform
    ]
  }
}
```

2. **Default values:**
```hcl
# Remove these if they appear in plan
# instance_tenancy = "default"
# enable_dns_support = true
```

3. **Computed values:**
```hcl
# Don't specify computed values
# arn = "..." (remove, this is computed)
```

4. **Formatting differences:**
```hcl
# Terraform may reformat
# Before: cidr_blocks = ["0.0.0.0/0"]
# After:  cidr_blocks = ["0.0.0.0/0"]  # Same, just formatted
```

### 5. Test with Targeted Plans

```bash
# Test specific resource
terraform plan -target=aws_vpc.main

# Test module
terraform plan -target=module.networking

# Test specific output
terraform plan -target=aws_instance.web_server
```

### 6. Run Linters

```bash
# Install tflint
brew install tflint

# Run linter
tflint

# Fix issues reported
```

### 7. Generate Documentation

```bash
# Install terraform-docs
brew install terraform-docs

# Generate README
terraform-docs markdown . > README.md

# Or use custom template
terraform-docs markdown . --config .terraform-docs.yml
```

### 8. Security Scanning

```bash
# Install checkov
pip install checkov

# Scan for security issues
checkov -d .

# Or use tfsec
brew install tfsec
tfsec .

# Address security findings
```

### 9. Cost Estimation

```bash
# Install infracost
brew install infracost

# Register (free)
infracost register

# Generate cost estimate
infracost breakdown --path .

# Review costs before apply
```

### 10. Dry Run Apply

```bash
# Create plan file
terraform plan -out=tfplan

# Review plan file
terraform show tfplan

# If satisfied, apply
# terraform apply tfplan
# (Only if you want to make changes)
```

---

## Advanced Workflows

### Incremental Import Strategy

Import infrastructure in phases to reduce complexity.

```bash
#!/bin/bash
# scripts/incremental-import.sh

set -e

PROVIDER="aws"
REGION="us-east-1"
FILTER="Name=tag:Environment;Value=production"

# Phase 1: Networking foundation
echo "Phase 1: Importing networking..."
terraformer import $PROVIDER \
  --resources=vpc,subnet,route_table \
  --regions=$REGION \
  --filter="$FILTER" \
  --compact \
  --path-pattern="generated/phase1/{service}"

# Validate Phase 1
cd generated/phase1/vpc
terraform init && terraform plan
cd ../../..

# Phase 2: Security and gateways
echo "Phase 2: Importing security..."
terraformer import $PROVIDER \
  --resources=internet_gateway,nat_gateway,security_group \
  --regions=$REGION \
  --filter="$FILTER" \
  --compact \
  --path-pattern="generated/phase2/{service}"

# Validate Phase 2
cd generated/phase2/security_group
terraform init && terraform plan
cd ../../..

# Phase 3: Compute resources
echo "Phase 3: Importing compute..."
terraformer import $PROVIDER \
  --resources=ec2_instance,autoscaling \
  --regions=$REGION \
  --filter="$FILTER" \
  --compact \
  --path-pattern="generated/phase3/{service}"

# Validate Phase 3
cd generated/phase3/ec2_instance
terraform init && terraform plan
cd ../../..

echo "All phases complete. Review generated/ directory."
```

### Module Creation from Imports

Transform imported code into reusable modules.

```bash
#!/bin/bash
# scripts/create-module.sh

SERVICE_NAME="${1:-vpc}"
SOURCE_PATH="generated/aws/us-east-1/${SERVICE_NAME}"
MODULE_PATH="modules/${SERVICE_NAME}"

echo "Creating module from ${SOURCE_PATH}..."

# Create module directory
mkdir -p "$MODULE_PATH"

# Copy terraform files
cp "$SOURCE_PATH"/*.tf "$MODULE_PATH/" 2>/dev/null || true

# Create module structure
cd "$MODULE_PATH"

# Extract variables
# (This is simplified - actual implementation would be more complex)
cat > variables.tf <<'EOF'
variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
EOF

# Create outputs
cat > outputs.tf <<'EOF'
output "id" {
  description = "Resource ID"
  value       = aws_vpc.main.id  # Adjust based on resource type
}
EOF

# Create README
cat > README.md <<EOF
# ${SERVICE_NAME^} Module

Generated from imported infrastructure.

## Usage

\`\`\`hcl
module "${SERVICE_NAME}" {
  source = "./modules/${SERVICE_NAME}"

  name_prefix = "production"
  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
\`\`\`

## Inputs

See variables.tf

## Outputs

See outputs.tf
EOF

echo "Module created at: $MODULE_PATH"
```

### Cross-Account Import

Import from multiple AWS accounts.

```bash
#!/bin/bash
# scripts/multi-account-import.sh

ACCOUNTS=(
  "production:arn:aws:iam::123456789012:role/TerraformImport"
  "staging:arn:aws:iam::987654321098:role/TerraformImport"
  "development:arn:aws:iam::111111111111:role/TerraformImport"
)

for account_entry in "${ACCOUNTS[@]}"; do
  IFS=':' read -r account_name role_arn <<< "$account_entry"

  echo "Importing from account: $account_name"

  # Assume role
  temp_creds=$(aws sts assume-role \
    --role-arn "$role_arn" \
    --role-session-name "terraformer-import" \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)

  export AWS_ACCESS_KEY_ID=$(echo $temp_creds | awk '{print $1}')
  export AWS_SECRET_ACCESS_KEY=$(echo $temp_creds | awk '{print $2}')
  export AWS_SESSION_TOKEN=$(echo $temp_creds | awk '{print $3}')

  # Import resources
  terraformer import aws \
    --resources=vpc,ec2_instance,rds,s3 \
    --regions=us-east-1 \
    --compact \
    --path-pattern="generated/${account_name}/{service}"

  # Clear credentials
  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

  echo "Completed import for account: $account_name"
done
```

### Automated Refactoring

Script to automate common refactoring tasks.

```bash
#!/bin/bash
# scripts/refactor-imports.sh

set -e

TARGET_DIR="${1:-generated}"

echo "Refactoring Terraform code in: $TARGET_DIR"

# Function to remove default values
remove_defaults() {
  local file=$1

  # Remove common AWS defaults
  sed -i '' \
    -e '/instance_tenancy.*= "default"/d' \
    -e '/enable_dns_support.*= true/d' \
    -e '/enable_network_address_usage_metrics.*= false/d' \
    -e '/assign_generated_ipv6_cidr_block.*= false/d' \
    "$file"
}

# Function to format files
format_files() {
  terraform fmt -recursive "$TARGET_DIR"
}

# Process all .tf files
find "$TARGET_DIR" -name "*.tf" -type f | while read -r tf_file; do
  echo "Processing: $tf_file"
  remove_defaults "$tf_file"
done

# Format all files
format_files

echo "Refactoring complete"
```

### State Migration Script

Migrate state from local to remote backend.

```bash
#!/bin/bash
# scripts/migrate-state.sh

set -e

BACKEND_BUCKET="${1:-my-terraform-state}"
BACKEND_REGION="${2:-us-east-1}"
STATE_KEY="${3:-imported/terraform.tfstate}"

echo "Migrating state to S3 backend..."

# Create backend configuration
cat > backend.tf <<EOF
terraform {
  backend "s3" {
    bucket         = "${BACKEND_BUCKET}"
    key            = "${STATE_KEY}"
    region         = "${BACKEND_REGION}"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
EOF

# Initialize with backend migration
terraform init -migrate-state

# Verify migration
terraform state list

echo "State migration complete"
echo "State now stored in: s3://${BACKEND_BUCKET}/${STATE_KEY}"
```

---

## Troubleshooting Common Issues

### Issue: Plan Shows Many Changes After Import

**Diagnosis:**
```bash
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan | jq '.resource_changes[] | select(.change.actions | contains(["update"])) | .change.after_unknown'
```

**Solution:**
- Add lifecycle `ignore_changes` blocks
- Remove default values from .tf files
- Ensure attribute formatting matches

### Issue: State Locking Errors

**Diagnosis:**
```bash
# Check DynamoDB lock table
aws dynamodb scan --table-name terraform-locks
```

**Solution:**
```bash
# Force unlock (use with caution!)
terraform force-unlock <lock-id>
```

### Issue: Import Fails Midway

**Solution:**
```bash
# Import is idempotent, safe to re-run
# It will skip already-imported resources

# Or import remaining resources manually
terraform import aws_instance.web i-0123456789abcdef0
```

---

## Next Steps

After completing the import workflow:

1. **Create modules** from imported code
2. **Set up CI/CD** pipeline for Terraform
3. **Implement policy-as-code** (Sentinel/OPA)
4. **Enable state locking** and versioning
5. **Document architecture** for team
6. **Train team** on Terraform workflows
7. **Decommission** manual infrastructure processes

See `/iac:refactor` command for guided refactoring assistance.
