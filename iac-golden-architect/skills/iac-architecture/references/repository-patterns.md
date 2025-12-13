# IaC Repository Organization Patterns

## Overview

This document provides comprehensive guidance on organizing Infrastructure as Code repositories at enterprise scale. It covers monorepo vs. polyrepo strategies, directory structures, module organization, environment management, and team collaboration patterns.

---

## Repository Strategy Decision Matrix

### Monorepo vs Polyrepo

| Factor | Monorepo | Polyrepo |
|--------|----------|----------|
| **Team Size** | Large, cross-functional teams | Small, autonomous teams |
| **Code Reuse** | Easy, single source of truth | Requires versioned modules |
| **Deployment Scope** | Full platform, coordinated | Independent services |
| **Blast Radius** | Higher (single repo) | Lower (isolated repos) |
| **Tooling** | Unified CI/CD, shared tools | Per-repo customization |
| **Access Control** | Coarse-grained | Fine-grained per repo |
| **Dependency Mgmt** | Internal references | External module registry |
| **CI/CD Complexity** | Complex (selective builds) | Simple (build all) |
| **Learning Curve** | Steeper (more context) | Gentler (focused scope) |

### When to Use Monorepo

**✅ Use Monorepo When:**
- Managing entire platform infrastructure
- Need atomic changes across modules
- Want single source of truth
- Have strong CI/CD automation
- Teams collaborate frequently
- Consistent standards across all IaC

**Example: Platform Infrastructure**
```
All AWS infrastructure for company:
- Networking (VPCs, VPNs)
- Shared services (monitoring, logging)
- Application environments (dev, staging, prod)
- CI/CD infrastructure
```

### When to Use Polyrepo

**✅ Use Polyrepo When:**
- Managing independent applications
- Teams have different release cycles
- Need strict access boundaries
- Want independent versioning
- Services are loosely coupled
- Prefer smaller, focused repos

**Example: Microservices Architecture**
```
Each service has own repo:
- customer-service-infra
- payment-service-infra
- notification-service-infra
- shared-modules (separate repo)
```

---

## Monorepo Patterns

### Pattern 1: Environment-Centric Monorepo

**Best For:** Platform teams managing multi-environment infrastructure

```
terraform-monorepo/
├── .github/
│   └── workflows/
│       ├── plan-dev.yml
│       ├── apply-dev.yml
│       ├── plan-staging.yml
│       ├── apply-staging.yml
│       ├── plan-prod.yml
│       └── apply-prod.yml
├── modules/
│   ├── compute/
│   │   ├── ec2-instance/
│   │   ├── ecs-cluster/
│   │   └── lambda-function/
│   ├── database/
│   │   ├── rds-postgres/
│   │   ├── dynamodb-table/
│   │   └── elasticache-redis/
│   ├── networking/
│   │   ├── vpc/
│   │   ├── security-group/
│   │   └── alb/
│   └── security/
│       ├── iam-role/
│       ├── kms-key/
│       └── secrets-manager/
├── environments/
│   ├── dev/
│   │   ├── backend.tf
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   ├── staging/
│   │   ├── backend.tf
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── outputs.tf
│   └── prod/
│       ├── backend.tf
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       └── outputs.tf
├── shared/
│   ├── dns/
│   ├── monitoring/
│   └── logging/
├── scripts/
│   ├── plan-all.sh
│   ├── apply-environment.sh
│   └── validate-all.sh
├── policies/
│   ├── sentinel/
│   ├── opa/
│   └── checkov/
├── .tfsec/
│   └── config.yml
├── .checkov.yml
├── terraform.tf
└── README.md
```

**Key Files:**

**`environments/dev/backend.tf`**
```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks-dev"
  }
}
```

**`environments/dev/main.tf`**
```hcl
module "vpc" {
  source = "../../modules/networking/vpc"

  environment = var.environment
  cidr_block  = var.vpc_cidr
  common_tags = local.common_tags
}

module "app_cluster" {
  source = "../../modules/compute/ecs-cluster"

  cluster_name = "app-cluster-${var.environment}"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  common_tags  = local.common_tags
}

module "database" {
  source = "../../modules/database/rds-postgres"

  identifier     = "app-db-${var.environment}"
  instance_class = var.db_instance_class
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
  common_tags    = local.common_tags
}
```

**`.github/workflows/plan-dev.yml`**
```yaml
name: Terraform Plan - Dev

on:
  pull_request:
    paths:
      - 'environments/dev/**'
      - 'modules/**'
      - '.github/workflows/plan-dev.yml'

jobs:
  plan:
    runs-on: ubuntu-latest
    env:
      TF_VAR_environment: dev
      AWS_REGION: us-east-1

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.6.0

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-dev
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: environments/dev
        run: terraform init

      - name: Terraform Plan
        working-directory: environments/dev
        run: terraform plan -out=tfplan

      - name: Save Plan
        uses: actions/upload-artifact@v3
        with:
          name: dev-tfplan
          path: environments/dev/tfplan
```

---

### Pattern 2: Service-Centric Monorepo

**Best For:** Product teams managing multiple services

```
platform-infrastructure/
├── services/
│   ├── customer-api/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   ├── payment-api/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── notification-service/
│       ├── dev/
│       ├── staging/
│       └── prod/
├── shared-modules/
│   ├── api-gateway/
│   ├── lambda-api/
│   └── rds-aurora/
├── platform/
│   ├── networking/
│   ├── security/
│   └── monitoring/
└── tooling/
    ├── ci-cd/
    └── developer-tools/
```

---

### Pattern 3: Layer-Based Monorepo

**Best For:** Complex infrastructure with clear separation of concerns

```
terraform/
├── 00-bootstrap/           # Account setup, state buckets
│   └── main.tf
├── 10-networking/          # VPCs, subnets, routing
│   ├── dev/
│   ├── staging/
│   └── prod/
├── 20-security/            # IAM, KMS, security groups
│   ├── dev/
│   ├── staging/
│   └── prod/
├── 30-data/                # Databases, caching
│   ├── dev/
│   ├── staging/
│   └── prod/
├── 40-compute/             # EC2, ECS, Lambda
│   ├── dev/
│   ├── staging/
│   └── prod/
├── 50-applications/        # Application-specific resources
│   ├── customer-portal/
│   ├── admin-dashboard/
│   └── mobile-api/
└── modules/
    └── [shared modules]
```

**Deployment Order:**
```bash
# Bootstrap first (one-time)
cd 00-bootstrap && terraform apply

# Then layers in order
cd 10-networking/prod && terraform apply
cd 20-security/prod && terraform apply
cd 30-data/prod && terraform apply
cd 40-compute/prod && terraform apply
cd 50-applications/customer-portal && terraform apply
```

---

## Polyrepo Patterns

### Pattern 1: Service-Owned Infrastructure

**Best For:** Microservices teams owning their infrastructure

```
customer-service/
├── .github/
│   └── workflows/
│       └── deploy-infra.yml
├── src/                    # Application code
├── terraform/
│   ├── modules/
│   │   ├── api/
│   │   ├── database/
│   │   └── cache/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── backend.tf
└── README.md
```

**Shared Modules Repo:**
```
terraform-modules/
├── .github/
│   └── workflows/
│       └── release.yml
├── modules/
│   ├── vpc/
│   ├── ecs-service/
│   ├── rds-postgres/
│   └── elasticache/
├── examples/
│   └── [usage examples]
└── CHANGELOG.md
```

**Consuming Shared Modules:**
```hcl
# In customer-service/terraform/environments/prod/main.tf
module "database" {
  source  = "git::https://github.com/company/terraform-modules.git//modules/rds-postgres?ref=v1.2.3"

  identifier = "customer-db-prod"
  # ... other config
}
```

---

### Pattern 2: Platform + Application Split

**Best For:** Platform team provides foundation, app teams build on top

```
# Platform repo (platform-infrastructure)
platform-infrastructure/
├── networking/
│   ├── vpcs/
│   └── transit-gateway/
├── security/
│   ├── iam-roles/
│   └── security-hub/
├── shared-services/
│   ├── monitoring/
│   ├── logging/
│   └── secrets-management/
└── modules/
    └── [shared modules]

# Application repo (customer-portal-infra)
customer-portal-infra/
├── terraform/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── modules/
    └── [app-specific modules]
```

**Consuming Platform Outputs:**
```hcl
# In customer-portal-infra/terraform/prod/main.tf
data "terraform_remote_state" "platform" {
  backend = "s3"
  config = {
    bucket = "platform-terraform-state"
    key    = "networking/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

module "app" {
  source = "../../modules/web-app"

  vpc_id     = data.terraform_remote_state.platform.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.platform.outputs.private_subnet_ids
}
```

---

## Module Organization

### Internal Module Structure

```
modules/
├── compute/
│   ├── ec2-instance/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── versions.tf
│   │   ├── README.md
│   │   └── examples/
│   │       ├── basic/
│   │       ├── with-ebs/
│   │       └── auto-scaling/
│   └── ecs-cluster/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── versions.tf
│       ├── README.md
│       └── examples/
```

**`modules/compute/ec2-instance/main.tf`**
```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  vpc_security_group_ids = var.security_group_ids

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
  }

  monitoring = var.detailed_monitoring

  tags = merge(
    var.common_tags,
    {
      Name = var.instance_name
    }
  )
}
```

**`modules/compute/ec2-instance/variables.tf`**
```hcl
variable "instance_name" {
  description = "Name of the EC2 instance"
  type        = string
}

variable "ami_id" {
  description = "AMI ID to use for the instance"
  type        = string
}

variable "instance_type" {
  description = "Instance type"
  type        = string
  default     = "t3.micro"
}

variable "subnet_id" {
  description = "Subnet ID where instance will be launched"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "root_volume_size" {
  description = "Size of root volume in GB"
  type        = number
  default     = 20
}

variable "root_volume_type" {
  description = "Type of root volume"
  type        = string
  default     = "gp3"
  validation {
    condition     = contains(["gp3", "gp2", "io1", "io2"], var.root_volume_type)
    error_message = "Volume type must be gp3, gp2, io1, or io2."
  }
}

variable "detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

**`modules/compute/ec2-instance/outputs.tf`**
```hcl
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.this.id
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.this.private_ip
}

output "arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.this.arn
}
```

---

## Environment Management

### Approach 1: Separate Directories (Recommended)

```
environments/
├── dev/
│   ├── backend.tf          # Dev state config
│   ├── main.tf             # Dev resources
│   ├── variables.tf        # Variable definitions
│   ├── terraform.tfvars    # Dev values
│   └── outputs.tf
├── staging/
│   ├── backend.tf          # Staging state config
│   ├── main.tf             # Staging resources
│   ├── variables.tf
│   ├── terraform.tfvars    # Staging values
│   └── outputs.tf
└── prod/
    ├── backend.tf          # Prod state config
    ├── main.tf             # Prod resources
    ├── variables.tf
    ├── terraform.tfvars    # Prod values
    └── outputs.tf
```

**Benefits:**
- Clear separation of environments
- Different state files automatically
- Easy to apply different configurations
- No risk of applying to wrong environment

**Drawbacks:**
- Code duplication between environments
- Changes must be synced manually
- More files to maintain

---

### Approach 2: Terraform Workspaces

```
infrastructure/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
├── dev.tfvars
├── staging.tfvars
└── prod.tfvars
```

**Usage:**
```bash
# Create and switch to dev workspace
terraform workspace new dev
terraform workspace select dev
terraform apply -var-file=dev.tfvars

# Switch to prod
terraform workspace select prod
terraform apply -var-file=prod.tfvars
```

**Benefits:**
- Single codebase for all environments
- Less duplication
- Easy to add new environments

**Drawbacks:**
- Easy to accidentally apply to wrong workspace
- Shared state file (different keys)
- Less explicit separation

**Recommendation:** Use separate directories for production safety.

---

### Approach 3: Terragrunt (DRY Environments)

```
terragrunt/
├── terragrunt.hcl          # Root config
├── dev/
│   ├── terragrunt.hcl      # Dev environment config
│   ├── vpc/
│   │   └── terragrunt.hcl
│   ├── database/
│   │   └── terragrunt.hcl
│   └── compute/
│       └── terragrunt.hcl
├── staging/
│   ├── terragrunt.hcl
│   ├── vpc/
│   ├── database/
│   └── compute/
└── prod/
    ├── terragrunt.hcl
    ├── vpc/
    ├── database/
    └── compute/
```

**Root `terragrunt.hcl`:**
```hcl
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "terraform-state-${get_env("ENVIRONMENT", "dev")}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**`dev/vpc/terragrunt.hcl`:**
```hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "git::https://github.com/company/terraform-modules.git//modules/vpc?ref=v1.0.0"
}

inputs = {
  environment = "dev"
  cidr_block  = "10.0.0.0/16"
  azs         = ["us-east-1a", "us-east-1b"]
}
```

---

## CI/CD Integration Patterns

### Pattern 1: Path-Based Triggers

**`.github/workflows/terraform-ci.yml`**
```yaml
name: Terraform CI

on:
  pull_request:
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-ci.yml'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      environments: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            dev:
              - 'terraform/environments/dev/**'
              - 'terraform/modules/**'
            staging:
              - 'terraform/environments/staging/**'
              - 'terraform/modules/**'
            prod:
              - 'terraform/environments/prod/**'
              - 'terraform/modules/**'

  plan:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ fromJSON(needs.detect-changes.outputs.environments) }}
    steps:
      - uses: actions/checkout@v3
      - name: Terraform Plan
        run: |
          cd terraform/environments/${{ matrix.environment }}
          terraform init
          terraform plan
```

---

### Pattern 2: Manual Approval for Production

**`.github/workflows/terraform-apply.yml`**
```yaml
name: Terraform Apply

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  apply:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment }}
      # Requires manual approval for prod
    steps:
      - uses: actions/checkout@v3
      - name: Terraform Apply
        run: |
          cd terraform/environments/${{ inputs.environment }}
          terraform init
          terraform apply -auto-approve
```

---

## Best Practices

### 1. State Management
- One state file per environment
- Use remote state (S3, GCS, Azure Storage)
- Enable state locking (DynamoDB, GCS, Azure Storage)
- Never commit state files to git

### 2. Module Versioning
- Version external modules (git tags, registry versions)
- Pin module versions in production
- Use `~>` for non-prod to get patches
- Test module updates in dev first

### 3. Secrets Management
- Never commit secrets to git
- Use Terraform variables for sensitive data
- Store secrets in external systems (Vault, AWS Secrets Manager)
- Use environment variables for CI/CD secrets

### 4. Code Organization
- Keep modules small and focused
- One resource type per module when possible
- Use composition over large modules
- Document module inputs/outputs thoroughly

### 5. Testing
- Run `terraform fmt` and `terraform validate`
- Use security scanners (tfsec, checkov)
- Test modules with examples
- Use Terratest for integration tests

### 6. Documentation
- README in every module
- Document required providers
- Include usage examples
- Maintain CHANGELOG for modules

---

## Migration Strategies

### Monorepo to Polyrepo

1. **Identify Boundaries**: Determine logical service boundaries
2. **Extract Modules**: Move shared modules to separate repo
3. **Split Environments**: Create separate repos for each service
4. **Update References**: Point to external module registry
5. **Migrate State**: Use `terraform state mv` to migrate
6. **Update CI/CD**: Create pipelines for each repo

### Polyrepo to Monorepo

1. **Create Monorepo Structure**: Set up directory structure
2. **Import Repos**: Move each repo into subdirectory
3. **Consolidate Modules**: Deduplicate shared modules
4. **Update State Config**: Ensure unique state keys
5. **Migrate CI/CD**: Create monorepo-aware pipelines
6. **Update Documentation**: Central README and guides
