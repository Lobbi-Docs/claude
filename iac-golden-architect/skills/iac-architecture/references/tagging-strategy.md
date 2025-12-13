# Enterprise Tagging Strategy for Infrastructure as Code

## Overview

A comprehensive tagging strategy is critical for cost allocation, security, compliance, automation, and resource management at enterprise scale. This document provides best practices, standards, and implementation patterns for infrastructure tagging.

---

## Tag Categories

### 1. Core Business Tags

**Required for ALL resources**

| Tag Name | Purpose | Example Values | Required |
|----------|---------|----------------|----------|
| `Environment` | Deployment environment | `dev`, `staging`, `prod`, `sandbox` | ✅ |
| `Owner` | Team or individual responsible | `platform-team`, `data-team`, `john.doe@company.com` | ✅ |
| `Application` | Application or service name | `customer-api`, `web-portal`, `data-pipeline` | ✅ |
| `CostCenter` | Budget allocation | `engineering`, `marketing`, `sales`, `it-ops` | ✅ |
| `Project` | Project or initiative | `migration-2024`, `customer-portal-v2` | ❌ |

### 2. Technical Tags

**Recommended for technical management**

| Tag Name | Purpose | Example Values | Required |
|----------|---------|----------------|----------|
| `ManagedBy` | Provisioning tool | `terraform`, `cloudformation`, `manual` | ✅ |
| `TerraformWorkspace` | Terraform workspace | `prod-us-east-1`, `dev-eu-west-1` | ✅ (if Terraform) |
| `Version` | Application version | `v1.2.3`, `2024.01.15` | ❌ |
| `Component` | Technical component | `database`, `cache`, `compute`, `network` | ✅ |
| `DataClassification` | Data sensitivity | `public`, `internal`, `confidential`, `restricted` | ✅ (for data resources) |

### 3. Compliance Tags

**Required for regulated environments**

| Tag Name | Purpose | Example Values | Required |
|----------|---------|----------------|----------|
| `SOC2_Control` | SOC2 control reference | `CC6.1`, `CC6.6`, `CC7.1`, `A1.2` | ✅ (for SOC2) |
| `Compliance` | Compliance frameworks | `soc2`, `hipaa`, `pci-dss`, `gdpr` | ✅ (if regulated) |
| `DataRetention` | Retention policy | `7-years`, `90-days`, `indefinite` | ✅ (for data) |
| `Encryption` | Encryption requirement | `required`, `optional` | ✅ |
| `BackupPolicy` | Backup requirement | `daily`, `weekly`, `none` | ❌ |

### 4. Operational Tags

**For automation and operations**

| Tag Name | Purpose | Example Values | Required |
|----------|---------|----------------|----------|
| `ScheduledShutdown` | Auto-shutdown schedule | `weeknights`, `weekends`, `never` | ❌ |
| `Monitoring` | Monitoring profile | `critical`, `standard`, `minimal` | ✅ |
| `AutoScaling` | Auto-scaling enabled | `true`, `false` | ❌ |
| `BackupEnabled` | Backup enabled | `true`, `false` | ✅ (for stateful) |
| `DisasterRecovery` | DR tier | `tier1`, `tier2`, `tier3` | ❌ |

### 5. Financial Tags

**For cost optimization**

| Tag Name | Purpose | Example Values | Required |
|----------|---------|----------------|----------|
| `BillingCode` | Billing/chargeback code | `PRJ-12345`, `CC-6789` | ❌ |
| `PurchaseOrder` | PO number | `PO-2024-001` | ❌ |
| `CostOptimization` | Optimization candidate | `spot-eligible`, `reserved-candidate` | ❌ |

---

## Tagging Standards

### Naming Conventions

**Tag Key Format**
- PascalCase for multi-word tags: `CostCenter`, `DataClassification`
- Single word when possible: `Environment`, `Owner`
- No special characters except hyphen: `SOC2-Control` → `SOC2_Control`
- Maximum 128 characters (AWS limit)

**Tag Value Format**
- lowercase-with-hyphens for environments: `dev`, `staging`, `prod`
- lowercase-with-hyphens for multi-word values: `platform-team`, `customer-api`
- Preserve case for names: `John.Doe@company.com`
- Maximum 256 characters (AWS limit)

### Reserved Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `aws:` | AWS-managed tags | `aws:cloudformation:stack-name` |
| `kubernetes.io/` | Kubernetes tags | `kubernetes.io/cluster/production` |
| `k8s.io/` | Kubernetes tags | `k8s.io/cluster-autoscaler/enabled` |
| `terraform:` | Reserved for Terraform state | `terraform:workspace` |

### Tag Value Enumeration

**Environment Values (Strict)**
```
dev          - Development environment
staging      - Staging/QA environment
prod         - Production environment
sandbox      - Experimental/sandbox
dr           - Disaster recovery
```

**Data Classification (Strict)**
```
public        - Public data, no restrictions
internal      - Internal use, no external sharing
confidential  - Confidential business data
restricted    - Highly restricted, regulated data
```

**Compliance Values**
```
soc2          - SOC2 Type II
hipaa         - HIPAA compliance
pci-dss       - PCI-DSS compliance
gdpr          - GDPR compliance
none          - No compliance requirements
```

---

## Tag Implementation Patterns

### 1. Terraform Variable-Based Tagging

**`variables.tf`**
```hcl
variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod", "sandbox"], var.environment)
    error_message = "Environment must be dev, staging, prod, or sandbox."
  }
}

variable "owner" {
  description = "Team or individual owner"
  type        = string
}

variable "application" {
  description = "Application name"
  type        = string
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
}

variable "soc2_control" {
  description = "SOC2 control reference"
  type        = string
  default     = ""
}
```

**`locals.tf`**
```hcl
locals {
  # Merge common tags with environment-specific tags
  common_tags = merge(
    var.common_tags,
    {
      Environment         = var.environment
      Owner               = var.owner
      Application         = var.application
      CostCenter          = var.cost_center
      ManagedBy           = "terraform"
      TerraformWorkspace  = terraform.workspace
      CreatedDate         = formatdate("YYYY-MM-DD", timestamp())
    }
  )

  # Tags for SOC2-compliant resources
  soc2_tags = merge(
    local.common_tags,
    var.soc2_control != "" ? {
      SOC2_Control = var.soc2_control
      Compliance   = "soc2"
    } : {}
  )

  # Tags for sensitive data resources
  sensitive_data_tags = merge(
    local.soc2_tags,
    {
      DataClassification = "confidential"
      Encryption         = "required"
      BackupEnabled      = "true"
    }
  )
}
```

### 2. Reusable Tagging Module

**`modules/tagging/main.tf`**
```hcl
variable "base_tags" {
  description = "Base tags to merge"
  type        = map(string)
}

variable "resource_type" {
  description = "Type of resource (compute, database, storage, network)"
  type        = string
  validation {
    condition     = contains(["compute", "database", "storage", "network", "security"], var.resource_type)
    error_message = "Resource type must be compute, database, storage, network, or security."
  }
}

variable "data_classification" {
  description = "Data classification level"
  type        = string
  default     = "internal"
  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be public, internal, confidential, or restricted."
  }
}

variable "soc2_control" {
  description = "SOC2 control reference"
  type        = string
  default     = null
}

variable "monitoring_level" {
  description = "Monitoring level"
  type        = string
  default     = "standard"
  validation {
    condition     = contains(["minimal", "standard", "critical"], var.monitoring_level)
    error_message = "Monitoring level must be minimal, standard, or critical."
  }
}

variable "backup_enabled" {
  description = "Whether backups are enabled"
  type        = bool
  default     = false
}

locals {
  # Build comprehensive tag set
  resource_tags = merge(
    var.base_tags,
    {
      Component          = var.resource_type
      DataClassification = var.data_classification
      Monitoring         = var.monitoring_level
      BackupEnabled      = var.backup_enabled ? "true" : "false"
    },
    var.soc2_control != null ? {
      SOC2_Control = var.soc2_control
      Compliance   = "soc2"
    } : {}
  )
}

output "tags" {
  description = "Complete tag set for resource"
  value       = local.resource_tags
}
```

**Usage Example**
```hcl
module "database_tags" {
  source = "./modules/tagging"

  base_tags = local.common_tags
  resource_type = "database"
  data_classification = "confidential"
  soc2_control = "CC6.1"
  monitoring_level = "critical"
  backup_enabled = true
}

resource "aws_db_instance" "main" {
  identifier = "main-db"
  # ... other configuration ...

  tags = module.database_tags.tags
}
```

### 3. Tag Validation Module

**`modules/tag-validator/main.tf`**
```hcl
variable "tags" {
  description = "Tags to validate"
  type        = map(string)
}

variable "required_tags" {
  description = "List of required tag keys"
  type        = list(string)
  default = [
    "Environment",
    "Owner",
    "Application",
    "CostCenter",
    "ManagedBy"
  ]
}

locals {
  # Check for missing required tags
  missing_tags = [
    for tag in var.required_tags :
    tag if !contains(keys(var.tags), tag)
  ]

  # Validation flag
  tags_valid = length(local.missing_tags) == 0
}

# Validation check
resource "null_resource" "validate_tags" {
  lifecycle {
    precondition {
      condition     = local.tags_valid
      error_message = "Missing required tags: ${join(", ", local.missing_tags)}"
    }
  }
}

output "validated_tags" {
  description = "Validated tags"
  value       = var.tags
}
```

---

## Provider-Specific Implementations

### AWS Default Tags (Terraform 0.15+)

**`provider.tf`**
```hcl
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment        = var.environment
      Owner              = var.owner
      Application        = var.application
      CostCenter         = var.cost_center
      ManagedBy          = "terraform"
      TerraformWorkspace = terraform.workspace
    }
  }
}
```

### Azure Tags

**`main.tf`**
```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.application}-${var.environment}"
  location = var.location

  tags = merge(
    local.common_tags,
    {
      ResourceType = "resource-group"
    }
  )
}

resource "azurerm_storage_account" "main" {
  name                     = "st${var.application}${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  tags = merge(
    local.sensitive_data_tags,
    {
      ResourceType = "storage-account"
    }
  )
}
```

### GCP Labels

**`main.tf`**
```hcl
# Convert tags to GCP-compatible labels (lowercase, hyphens only)
locals {
  gcp_labels = {
    for key, value in local.common_tags :
    lower(replace(key, "_", "-")) => lower(replace(value, "_", "-"))
  }
}

resource "google_storage_bucket" "main" {
  name     = "${var.application}-${var.environment}"
  location = var.region

  labels = merge(
    local.gcp_labels,
    {
      resource-type = "storage-bucket"
      soc2-control  = "cc6-1"
    }
  )
}
```

---

## Tag Enforcement

### 1. AWS Organizations Tag Policies

**`tag-policy.json`**
```json
{
  "tags": {
    "Environment": {
      "tag_key": {
        "@@assign": "Environment"
      },
      "tag_value": {
        "@@assign": [
          "dev",
          "staging",
          "prod",
          "sandbox"
        ]
      },
      "enforced_for": {
        "@@assign": [
          "ec2:instance",
          "rds:db",
          "s3:bucket"
        ]
      }
    },
    "Owner": {
      "tag_key": {
        "@@assign": "Owner"
      },
      "enforced_for": {
        "@@assign": [
          "ec2:*",
          "rds:*",
          "s3:*"
        ]
      }
    },
    "CostCenter": {
      "tag_key": {
        "@@assign": "CostCenter"
      },
      "tag_value": {
        "@@assign": [
          "engineering",
          "marketing",
          "sales",
          "it-ops"
        ]
      },
      "enforced_for": {
        "@@assign": [
          "ec2:*",
          "rds:*",
          "s3:*"
        ]
      }
    }
  }
}
```

### 2. Sentinel Policy (Terraform Cloud/Enterprise)

**`require-tags.sentinel`**
```hcl
import "tfplan/v2" as tfplan
import "strings"

# Required tags for all resources
required_tags = [
    "Environment",
    "Owner",
    "Application",
    "CostCenter",
]

# Get all resources that support tags
allResources = filter tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    rc.change.actions is not ["delete"] and
    "tags" in rc.change.after
}

# Validate tags for each resource
validate_tags = func(resource) {
    tags = resource.change.after.tags
    missing_tags = []

    for required_tags as tag {
        if tag not in keys(tags) {
            append(missing_tags, tag)
        }
    }

    if length(missing_tags) > 0 {
        print("Resource", resource.address, "is missing required tags:", missing_tags)
        return false
    }

    return true
}

# Main rule
main = rule {
    all allResources as _, resource {
        validate_tags(resource)
    }
}
```

### 3. checkov Custom Policy

**`.checkov/custom/required_tags.py`**
```python
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class RequiredTags(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have required tags"
        id = "CKV_CUSTOM_TAGS_1"
        supported_resources = ['aws_*', 'azurerm_*', 'google_*']
        categories = [CheckCategories.CONVENTION]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        required_tags = ['Environment', 'Owner', 'Application', 'CostCenter']

        # Check if tags/labels exist
        tag_attr = None
        if 'tags' in conf:
            tag_attr = 'tags'
        elif 'labels' in conf:  # GCP uses labels
            tag_attr = 'labels'

        if not tag_attr:
            self.evaluated_keys = ['tags']
            return CheckResult.FAILED

        tags = conf[tag_attr][0] if isinstance(conf[tag_attr], list) else conf[tag_attr]

        missing_tags = [tag for tag in required_tags if tag not in tags]

        if missing_tags:
            self.evaluated_keys = [tag_attr]
            return CheckResult.FAILED

        return CheckResult.PASSED

check = RequiredTags()
```

---

## Cost Allocation and Reporting

### 1. Cost Allocation Tags (AWS)

```hcl
# Enable cost allocation tags
resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "cost_center" {
  tag_key = "CostCenter"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "application" {
  tag_key = "Application"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "owner" {
  tag_key = "Owner"
  status  = "Active"
}
```

### 2. Cost Explorer Query

```hcl
# Query costs by tags
resource "aws_ce_anomaly_monitor" "cost_center" {
  name              = "cost-center-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  monitor_specification = jsonencode({
    Tags = {
      Key    = "CostCenter"
      Values = ["engineering", "marketing", "sales"]
    }
  })
}
```

### 3. Budget Alerts by Tags

```hcl
resource "aws_budgets_budget" "engineering" {
  name         = "engineering-monthly-budget"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "CostCenter$engineering"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["engineering-leads@company.com"]
  }
}
```

---

## Tag Automation

### 1. Auto-Tagging Lambda (AWS)

**`lambda/auto-tag.py`**
```python
import boto3
import json

def lambda_handler(event, context):
    """Auto-tag resources on creation"""

    ec2 = boto3.client('ec2')

    # Extract resource info from CloudTrail event
    resource_type = event['detail']['requestParameters'].get('resourceType')
    resource_id = event['detail']['responseElements'].get('resourceId')

    # Get creator identity
    creator_arn = event['detail']['userIdentity']['arn']
    creator_name = creator_arn.split('/')[-1]

    # Apply tags
    tags = [
        {'Key': 'CreatedBy', 'Value': creator_name},
        {'Key': 'CreatedDate', 'Value': event['detail']['eventTime']},
        {'Key': 'ManagedBy', 'Value': 'auto-tagging'},
    ]

    ec2.create_tags(Resources=[resource_id], Tags=tags)

    return {
        'statusCode': 200,
        'body': json.dumps(f'Tagged {resource_id}')
    }
```

### 2. Tag Compliance Scanner

**`scripts/scan-tag-compliance.sh`**
```bash
#!/bin/bash
set -e

REQUIRED_TAGS=("Environment" "Owner" "Application" "CostCenter")

# Scan EC2 instances
echo "Scanning EC2 instances..."
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,Tags]' --output json | \
  jq -r '.[] | select(.[1] != null) | [.[0], (.[1] | map(.Key) | sort)] | @csv' | \
  while IFS=, read -r instance_id tags; do
    for required_tag in "${REQUIRED_TAGS[@]}"; do
      if [[ ! "$tags" =~ $required_tag ]]; then
        echo "VIOLATION: Instance $instance_id missing tag: $required_tag"
      fi
    done
  done

# Scan S3 buckets
echo "Scanning S3 buckets..."
aws s3api list-buckets --query 'Buckets[].Name' --output text | \
  tr '\t' '\n' | \
  while read -r bucket; do
    tags=$(aws s3api get-bucket-tagging --bucket "$bucket" 2>/dev/null || echo "")
    if [ -z "$tags" ]; then
      echo "VIOLATION: Bucket $bucket has no tags"
    fi
  done
```

---

## Best Practices

### 1. Tag Consistently
- Use the same tag keys across all resources
- Standardize tag value formats
- Document tag meanings centrally

### 2. Enforce Tags
- Use policy-as-code (Sentinel, OPA, checkov)
- Implement pre-commit hooks
- Block resource creation without required tags

### 3. Automate Tagging
- Use Terraform default tags (AWS provider 3.x+)
- Implement auto-tagging for manual resources
- Propagate tags to child resources

### 4. Review Regularly
- Quarterly tag compliance audits
- Update tag values as ownership changes
- Retire unused tags

### 5. Cost Allocation
- Enable cost allocation tags in cloud provider
- Tag 100% of billable resources
- Use tags for chargeback/showback

### 6. Security and Compliance
- Tag sensitive resources with classification
- Map tags to compliance controls
- Use tags for access control policies

---

## Tag Migration Strategy

### Phase 1: Baseline (Week 1-2)
1. Document current tagging practices
2. Define required tags and values
3. Create tagging module
4. Enable provider default tags

### Phase 2: New Resources (Week 3-4)
1. Implement tagging in all new Terraform
2. Add tag validation in CI/CD
3. Document tagging standards
4. Train teams on requirements

### Phase 3: Existing Resources (Month 2-3)
1. Scan existing resources for missing tags
2. Create remediation plan
3. Auto-tag resources where possible
4. Manually tag remaining resources

### Phase 4: Enforcement (Month 4+)
1. Enable tag policies in cloud provider
2. Implement Sentinel/OPA policies
3. Block non-compliant deployments
4. Monitor tag compliance continuously

---

## Tag Governance

### Ownership
- **Cloud FinOps Team**: Cost allocation tags
- **Security Team**: Compliance and security tags
- **Platform Team**: Technical and automation tags
- **Application Teams**: Application-specific tags

### Change Management
1. Propose new tag in RFC
2. Update tagging module
3. Document in standards
4. Communicate to teams
5. Implement in next sprint

### Compliance Reporting
- Weekly: Tag compliance percentage
- Monthly: Cost allocation accuracy
- Quarterly: Tag standard review
- Annually: Tag strategy assessment
