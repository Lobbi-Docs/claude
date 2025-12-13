# Policy-as-Code for Terraform

## Overview

Policy-as-code enables automated validation of Terraform configurations against organizational standards, security requirements, and compliance frameworks. This guide covers Sentinel (HashiCorp) and OPA/Conftest implementations.

## Sentinel (Terraform Cloud/Enterprise)

### Overview

Sentinel is HashiCorp's policy-as-code framework integrated with Terraform Cloud and Enterprise. Policies can be enforced at different levels: advisory, soft-mandatory, or hard-mandatory.

### Policy Enforcement Levels

```hcl
# sentinel.hcl
policy "require-encryption-at-rest" {
  enforcement_level = "hard-mandatory"  # Cannot be overridden
}

policy "recommend-cost-tags" {
  enforcement_level = "soft-mandatory"  # Can be overridden with reason
}

policy "suggest-rightsizing" {
  enforcement_level = "advisory"  # Warning only
}
```

### Sentinel Policy Structure

```sentinel
# policies/aws-encryption.sentinel
import "tfplan/v2" as tfplan
import "strings"

# Get all S3 buckets from the plan
s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Rule: All S3 buckets must have encryption enabled
bucket_encryption_enabled = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.server_side_encryption_configuration is not null
  }
}

# Main rule that must pass
main = rule {
  bucket_encryption_enabled
}
```

### Common Sentinel Policies

#### 1. Enforce Encryption at Rest

```sentinel
# policies/enforce-encryption.sentinel
import "tfplan/v2" as tfplan

# S3 Buckets
s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

s3_encryption_enabled = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.server_side_encryption_configuration is not null and
    length(bucket.change.after.server_side_encryption_configuration) > 0
  }
}

# RDS Databases
rds_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_db_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_encryption_enabled = rule {
  all rds_instances as _, db {
    db.change.after.storage_encrypted is true
  }
}

# EBS Volumes
ebs_volumes = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_ebs_volume" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

ebs_encryption_enabled = rule {
  all ebs_volumes as _, volume {
    volume.change.after.encrypted is true
  }
}

main = rule {
  s3_encryption_enabled and
  rds_encryption_enabled and
  ebs_encryption_enabled
}
```

#### 2. Enforce Required Tags

```sentinel
# policies/required-tags.sentinel
import "tfplan/v2" as tfplan

# Required tags
required_tags = [
  "Environment",
  "Owner",
  "Project",
  "CostCenter",
]

# Get all resources that support tags
tagged_resources = filter tfplan.resource_changes as _, rc {
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update") and
  rc.change.after.tags is not null
}

# Validate tags
tags_validated = rule {
  all tagged_resources as _, resource {
    all required_tags as _, tag {
      resource.change.after.tags contains tag
    }
  }
}

main = rule {
  tags_validated
}
```

#### 3. Prevent Public Access

```sentinel
# policies/prevent-public-access.sentinel
import "tfplan/v2" as tfplan

# S3 Buckets
s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# S3 bucket ACLs should not be public
s3_acl_private = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.acl is null or
    bucket.change.after.acl is "private"
  }
}

# Security Groups
security_groups = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_security_group" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Security groups should not allow unrestricted ingress
sg_no_public_ingress = rule {
  all security_groups as _, sg {
    all sg.change.after.ingress else [] as _, rule {
      not (rule.cidr_blocks contains "0.0.0.0/0" and rule.from_port is 0 and rule.to_port is 65535)
    }
  }
}

# RDS instances should not be publicly accessible
rds_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_db_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_not_public = rule {
  all rds_instances as _, db {
    db.change.after.publicly_accessible is false
  }
}

main = rule {
  s3_acl_private and
  sg_no_public_ingress and
  rds_not_public
}
```

#### 4. Cost Control

```sentinel
# policies/cost-control.sentinel
import "tfplan/v2" as tfplan
import "decimal"

# Define cost limits per resource type
instance_type_limits = {
  "t3.micro":   10.0,
  "t3.small":   20.0,
  "t3.medium":  40.0,
  "t3.large":   80.0,
  "m5.large":   100.0,
  "m5.xlarge":  200.0,
}

# Get all EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Calculate estimated monthly cost
estimated_cost = func() {
  total = decimal.new(0)
  for ec2_instances as _, instance {
    instance_type = instance.change.after.instance_type
    if instance_type in instance_type_limits {
      cost = decimal.new(instance_type_limits[instance_type])
      total = decimal.add(total, cost)
    }
  }
  return total
}

# Rule: Total cost must be under $1000/month
cost_under_limit = rule {
  decimal.less_than(estimated_cost(), decimal.new(1000))
}

main = rule {
  cost_under_limit
}
```

#### 5. Enforce Multi-AZ for Production

```sentinel
# policies/production-high-availability.sentinel
import "tfplan/v2" as tfplan
import "tfconfig/v2" as tfconfig

# Get workspace environment
get_environment = func() {
  # Check workspace name or variables
  workspace = tfconfig.variables.environment.value else ""
  return workspace
}

# RDS instances in production must be multi-AZ
rds_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_db_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_multi_az_in_prod = rule {
  all rds_instances as _, db {
    get_environment() is not "production" or
    db.change.after.multi_az is true
  }
}

# EKS clusters must span multiple AZs
eks_clusters = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_eks_cluster" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

eks_multi_az = rule {
  all eks_clusters as _, cluster {
    length(cluster.change.after.vpc_config[0].subnet_ids) >= 2
  }
}

main = rule {
  rds_multi_az_in_prod and
  eks_multi_az
}
```

### Sentinel Policy Sets

```hcl
# sentinel.hcl - Policy set configuration
policy "encryption-at-rest" {
  source            = "./policies/enforce-encryption.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "required-tags" {
  source            = "./policies/required-tags.sentinel"
  enforcement_level = "soft-mandatory"
}

policy "prevent-public-access" {
  source            = "./policies/prevent-public-access.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "cost-control" {
  source            = "./policies/cost-control.sentinel"
  enforcement_level = "soft-mandatory"
}

policy "production-ha" {
  source            = "./policies/production-high-availability.sentinel"
  enforcement_level = "hard-mandatory"
}

# Module-based policies
module "tfplan-functions" {
  source = "./modules/tfplan-functions.sentinel"
}

module "tfconfig-functions" {
  source = "./modules/tfconfig-functions.sentinel"
}
```

## OPA / Conftest

### Overview

Open Policy Agent (OPA) with Conftest provides policy-as-code validation using the Rego language. It works with Terraform JSON plan files.

### Setup

```bash
# Install Conftest
brew install conftest

# Generate JSON plan
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json

# Run policy checks
conftest test tfplan.json
```

### OPA Policy Structure

```rego
# policy/main.rego
package main

deny[msg] {
  resource := input.planned_values.root_module.resources[_]
  resource.type == "aws_s3_bucket"
  not resource.values.server_side_encryption_configuration
  msg := sprintf("S3 bucket '%s' must have encryption enabled", [resource.name])
}
```

### Common OPA/Conftest Policies

#### 1. S3 Bucket Security

```rego
# policy/s3-security.rego
package main

import future.keywords.in

# Deny S3 buckets without encryption
deny[msg] {
  resource := input.planned_values.root_module.resources[_]
  resource.type == "aws_s3_bucket"
  not has_encryption(resource)
  msg := sprintf(
    "S3 bucket '%s' must have server-side encryption enabled",
    [resource.name]
  )
}

has_encryption(resource) {
  resource.values.server_side_encryption_configuration
}

# Deny public S3 buckets
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  resource.change.after.acl in ["public-read", "public-read-write"]
  msg := sprintf(
    "S3 bucket '%s' has public ACL '%s'",
    [resource.name, resource.change.after.acl]
  )
}

# Warn if versioning is not enabled
warn[msg] {
  resource := input.planned_values.root_module.resources[_]
  resource.type == "aws_s3_bucket"
  not has_versioning(resource)
  msg := sprintf(
    "S3 bucket '%s' should have versioning enabled",
    [resource.name]
  )
}

has_versioning(resource) {
  resource.values.versioning[_].enabled == true
}
```

#### 2. Required Tags

```rego
# policy/required-tags.rego
package main

import future.keywords.in

required_tags := ["Environment", "Owner", "Project", "CostCenter"]

# Deny resources missing required tags
deny[msg] {
  resource := input.resource_changes[_]
  resource.change.actions[_] in ["create", "update"]
  has_tags(resource.type)
  missing_tags := get_missing_tags(resource)
  count(missing_tags) > 0
  msg := sprintf(
    "Resource '%s' of type '%s' is missing required tags: %v",
    [resource.name, resource.type, missing_tags]
  )
}

has_tags(resource_type) {
  resource_type in [
    "aws_instance",
    "aws_s3_bucket",
    "aws_db_instance",
    "aws_vpc",
    "aws_subnet",
    "aws_security_group",
  ]
}

get_missing_tags(resource) = missing {
  resource_tags := object.keys(resource.change.after.tags)
  missing := [tag | tag := required_tags[_]; not tag in resource_tags]
}
```

#### 3. Network Security

```rego
# policy/network-security.rego
package main

import future.keywords.in

# Deny security groups with unrestricted SSH access
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  rule := resource.change.after.ingress[_]
  rule.from_port <= 22
  rule.to_port >= 22
  "0.0.0.0/0" in rule.cidr_blocks
  msg := sprintf(
    "Security group '%s' allows unrestricted SSH access",
    [resource.name]
  )
}

# Deny RDS instances that are publicly accessible
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.publicly_accessible == true
  msg := sprintf(
    "RDS instance '%s' must not be publicly accessible",
    [resource.name]
  )
}

# Deny subnets with auto-assign public IP in production
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_subnet"
  resource.change.after.map_public_ip_on_launch == true
  resource.change.after.tags.Environment == "production"
  msg := sprintf(
    "Production subnet '%s' should not auto-assign public IPs",
    [resource.name]
  )
}

# Warn if NACLs allow all traffic
warn[msg] {
  resource := input.planned_values.root_module.resources[_]
  resource.type == "aws_network_acl"
  rule := resource.values.ingress[_]
  rule.protocol == "-1"
  rule.cidr_block == "0.0.0.0/0"
  msg := sprintf(
    "Network ACL '%s' allows all inbound traffic",
    [resource.name]
  )
}
```

#### 4. Encryption Requirements

```rego
# policy/encryption.rego
package main

# Deny unencrypted RDS instances
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.storage_encrypted != true
  msg := sprintf(
    "RDS instance '%s' must have storage encryption enabled",
    [resource.name]
  )
}

# Deny unencrypted EBS volumes
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_ebs_volume"
  resource.change.after.encrypted != true
  msg := sprintf(
    "EBS volume '%s' must be encrypted",
    [resource.name]
  )
}

# Deny EFS without encryption
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_efs_file_system"
  resource.change.after.encrypted != true
  msg := sprintf(
    "EFS file system '%s' must be encrypted",
    [resource.name]
  )
}

# Deny ELB without SSL/TLS
deny[msg] {
  resource := input.resource_changes[_]
  resource.type in ["aws_lb_listener", "aws_alb_listener"]
  resource.change.after.protocol == "HTTP"
  msg := sprintf(
    "Load balancer listener '%s' should use HTTPS",
    [resource.name]
  )
}
```

#### 5. Compliance (SOC2/CIS)

```rego
# policy/compliance.rego
package main

import future.keywords.in

# CIS 2.1.1 - S3 bucket logging enabled
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not has_logging(resource)
  msg := sprintf(
    "S3 bucket '%s' must have access logging enabled (CIS 2.1.1)",
    [resource.name]
  )
}

has_logging(resource) {
  resource.change.after.logging
}

# CIS 2.3.1 - RDS encryption at rest
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.storage_encrypted != true
  msg := sprintf(
    "RDS instance '%s' must have encryption at rest enabled (CIS 2.3.1)",
    [resource.name]
  )
}

# CIS 4.1 - No unrestricted SSH
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  rule := resource.change.after.ingress[_]
  rule.from_port <= 22
  rule.to_port >= 22
  "0.0.0.0/0" in rule.cidr_blocks
  msg := sprintf(
    "Security group '%s' violates CIS 4.1: SSH must not be open to 0.0.0.0/0",
    [resource.name]
  )
}

# CIS 4.2 - No unrestricted RDP
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  rule := resource.change.after.ingress[_]
  rule.from_port <= 3389
  rule.to_port >= 3389
  "0.0.0.0/0" in rule.cidr_blocks
  msg := sprintf(
    "Security group '%s' violates CIS 4.2: RDP must not be open to 0.0.0.0/0",
    [resource.name]
  )
}

# SOC2 - VPC Flow Logs enabled
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_vpc"
  not has_flow_logs(resource.name)
  msg := sprintf(
    "VPC '%s' must have Flow Logs enabled for SOC2 compliance",
    [resource.name]
  )
}

has_flow_logs(vpc_name) {
  resource := input.resource_changes[_]
  resource.type == "aws_flow_log"
  contains(resource.change.after.vpc_id, vpc_name)
}
```

### Conftest Configuration

```yaml
# .conftest.toml
[policy]
  # Policy directory
  dir = "policy"

  # Suppress specific policies
  suppress = []

  # Policy namespaces
  namespace = ["main"]

[output]
  # Output format: stdout, json, tap, table
  format = "table"

  # Show successes
  no-color = false

[trace]
  # Enable trace for debugging
  enabled = false
```

## Integration with CI/CD

### GitHub Actions with Sentinel

```yaml
# .github/workflows/terraform-sentinel.yml
name: Terraform Sentinel Check

on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  sentinel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      # Sentinel checks run automatically in TFC/TFE
      # This is just for local validation
      - name: Download Sentinel
        run: |
          wget https://releases.hashicorp.com/sentinel/0.21.0/sentinel_0.21.0_linux_amd64.zip
          unzip sentinel_0.21.0_linux_amd64.zip
          chmod +x sentinel

      - name: Run Sentinel Policies
        run: ./sentinel test
```

### GitHub Actions with Conftest

```yaml
# .github/workflows/terraform-conftest.yml
name: Terraform Policy Check

on:
  pull_request:
    paths:
      - '**.tf'
      - 'policy/**'

jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: |
          terraform plan -out=tfplan.binary
          terraform show -json tfplan.binary > tfplan.json

      - name: Install Conftest
        run: |
          wget https://github.com/open-policy-agent/conftest/releases/download/v0.45.0/conftest_0.45.0_Linux_x86_64.tar.gz
          tar xzf conftest_0.45.0_Linux_x86_64.tar.gz
          chmod +x conftest

      - name: Run Conftest
        run: ./conftest test tfplan.json

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: policy-results
          path: tfplan.json
```

## Best Practices

1. **Start with Advisory**: Begin with advisory policies and gradually move to mandatory
2. **Clear Error Messages**: Provide actionable error messages in policy violations
3. **Test Policies**: Write tests for your policies
4. **Version Control**: Store policies in version control
5. **Documentation**: Document each policy's purpose and requirements
6. **Gradual Rollout**: Apply new policies to non-production first
7. **Exception Process**: Define clear process for policy exceptions
8. **Regular Review**: Review and update policies regularly
9. **Performance**: Keep policies efficient for fast feedback
10. **Collaboration**: Involve security and compliance teams in policy development

## Testing Policies

### Sentinel Mock Data

```sentinel
# test/enforce-encryption/mock-tfplan-pass.sentinel
mock "tfplan/v2" {
  module {
    source = "mock-tfplan-pass.sentinel"
  }
}

# Mock passing configuration
planned_values = {
  "root_module": {
    "resources": [
      {
        "type": "aws_s3_bucket",
        "name": "test-bucket",
        "values": {
          "server_side_encryption_configuration": [
            {
              "rule": [
                {
                  "apply_server_side_encryption_by_default": [
                    {
                      "sse_algorithm": "AES256"
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

### OPA/Conftest Tests

```rego
# policy/s3-security_test.rego
package main

test_s3_encryption_required {
  deny["S3 bucket 'test-bucket' must have server-side encryption enabled"] with input as {
    "planned_values": {
      "root_module": {
        "resources": [{
          "type": "aws_s3_bucket",
          "name": "test-bucket",
          "values": {}
        }]
      }
    }
  }
}

test_s3_encryption_present {
  count(deny) == 0 with input as {
    "planned_values": {
      "root_module": {
        "resources": [{
          "type": "aws_s3_bucket",
          "name": "test-bucket",
          "values": {
            "server_side_encryption_configuration": [{}]
          }
        }]
      }
    }
  }
}
```

## Policy Library Resources

- [Terraform Sentinel Policies](https://github.com/hashicorp/terraform-sentinel-policies)
- [AWS Foundational Security Best Practices](https://github.com/aws/aws-foundational-security-policies)
- [Conftest Examples](https://github.com/open-policy-agent/conftest/tree/master/examples)
- [OPA Policy Library](https://github.com/open-policy-agent/library)
