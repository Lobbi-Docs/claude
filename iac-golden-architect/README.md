# IAC Golden Architect (The Dredgen)

> *"From nothing, we forge empires of infrastructure."*

**The Dredgen** is a comprehensive Infrastructure as Code command center for enterprise architects. It provides complete coverage for multi-cloud Terraform, Harness NextGen CD, HashiCorp Vault, and Terraformer - establishing SOC2-compliant infrastructure patterns from the ground up.

## Overview

| Aspect | Details |
|--------|---------|
| **Target User** | Infrastructure Architects |
| **Cloud Support** | AWS, Azure, GCP (multi-cloud) |
| **CI/CD** | Harness NextGen CD |
| **Secrets** | HashiCorp Vault |
| **Compliance** | SOC2 |
| **IaC Tools** | Terraform, Terraformer |

## Features

### Skills (5)
- **terraform-enterprise** - Advanced Terraform patterns: workspaces, remote state, policy-as-code
- **harness-cd** - Harness NextGen pipelines, GitOps, deployment strategies
- **vault-operations** - Secrets engines, auth methods, dynamic credentials
- **iac-architecture** - Cross-cutting: security, compliance, cost optimization, multi-cloud
- **terraformer** - Reverse-engineer existing infrastructure into Terraform

### Commands (8)
- `/iac:tf-init` - Initialize Terraform with best practices
- `/iac:tf-plan` - Run plan with security/cost validation
- `/iac:tf-apply` - Safe apply with drift check and rollback prep
- `/iac:harness-pipeline` - Create/manage Harness pipelines
- `/iac:vault-secrets` - Manage Vault secrets and credentials
- `/iac:validate` - Comprehensive IaC validation (security, cost, compliance)
- `/iac:drift-detect` - Detect and report infrastructure drift
- `/iac:module-scaffold` - Scaffold new Terraform modules

### Agents (4)
- **terraform-architect** - Reviews TF code, suggests patterns, optimizations
- **security-compliance** - Validates against SOC2, CIS benchmarks
- **cost-optimizer** - Analyzes resources for cost savings
- **iac-reviewer** - Proactively reviews IaC changes

### Hooks (2)
- **tf-pre-apply** - Security validation before terraform apply
- **tf-format-check** - Format validation on .tf file commits

## Installation

```bash
# Clone the plugin
git clone https://github.com/the-Lobbi/iac-golden-architect

# Or use with Claude Code directly
claude --plugin-dir /path/to/iac-golden-architect
```

## Prerequisites

### Required Tools
```bash
# Terraform
terraform version  # >= 1.0.0

# Terraformer
terraformer version

# Security Scanners
tfsec --version
checkov --version
trivy --version
terrascan version

# Vault CLI (optional)
vault version

# Harness CLI (optional)
harness --version
```

### Environment Variables
```bash
# Cloud Providers (configure as needed)
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-west-2"

export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."

export GOOGLE_CREDENTIALS="..."
export GOOGLE_PROJECT="..."

# HashiCorp Vault
export VAULT_ADDR="https://vault.example.com"
export VAULT_TOKEN="..."

# Harness
export HARNESS_API_KEY="..."
export HARNESS_ACCOUNT_ID="..."
```

## Configuration

Create `.claude/iac-golden-architect.local.md` for project-specific settings:

```markdown
# IAC Golden Architect Settings

## Cloud Configuration
- Primary Cloud: AWS
- Secondary Clouds: Azure, GCP
- Default Region: us-west-2

## Terraform Settings
- State Backend: s3
- State Bucket: my-terraform-state
- Lock Table: terraform-locks
- Workspace Strategy: per-environment

## Compliance
- Framework: SOC2
- Auto-Block Critical: true
- Scanners: tfsec, checkov, trivy

## Cost Optimization
- Alert Threshold: $100/month per resource
- Right-sizing: enabled

## Harness
- Organization: my-org
- Project: infrastructure
- Default Pipeline: rolling
```

## Quick Start

### 1. Initialize a New Terraform Project
```
/iac:tf-init --backend s3 --cloud aws
```

### 2. Scaffold a Module
```
/iac:module-scaffold vpc --cloud aws --compliance soc2
```

### 3. Validate Infrastructure
```
/iac:validate --all
```

### 4. Plan with Security Checks
```
/iac:tf-plan --scan
```

### 5. Import Existing Infrastructure
```
/iac:terraformer --provider aws --resources vpc,ec2,rds
```

## Directory Structure

```
iac-golden-architect/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── terraform-enterprise/
│   ├── harness-cd/
│   ├── vault-operations/
│   ├── iac-architecture/
│   └── terraformer/
├── commands/
│   ├── tf-init.md
│   ├── tf-plan.md
│   ├── tf-apply.md
│   ├── harness-pipeline.md
│   ├── vault-secrets.md
│   ├── validate.md
│   ├── drift-detect.md
│   └── module-scaffold.md
├── agents/
│   ├── terraform-architect.md
│   ├── security-compliance.md
│   ├── cost-optimizer.md
│   └── iac-reviewer.md
├── hooks/
│   └── hooks.json
├── templates/
│   ├── modules/
│   └── pipelines/
└── README.md
```

## Compliance & Security

### SOC2 Controls Covered
- **CC6.1** - Encryption at rest and in transit
- **CC6.6** - Logging and monitoring
- **CC6.7** - Access controls and IAM
- **CC7.1** - Network segmentation
- **CC7.2** - Change management

### Security Scanners
| Scanner | Focus |
|---------|-------|
| tfsec | Terraform-specific security |
| checkov | Policy-as-code, multi-framework |
| trivy | Vulnerabilities, misconfigs |
| terrascan | Compliance policies |

## Support

- **Documentation**: See `/skills` for detailed guides
- **Issues**: https://github.com/the-Lobbi/iac-golden-architect/issues
- **Golden Armada**: Internal infrastructure team

---

*The Dredgen forges order from chaos. Your infrastructure will rise.*
