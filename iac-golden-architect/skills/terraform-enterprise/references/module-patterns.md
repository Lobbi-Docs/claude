# Terraform Module Patterns - Design Guide

## Overview

This guide covers enterprise-grade module design patterns, structuring standards, and best practices for creating reusable, maintainable Terraform modules.

## Standard Module Structure

```
terraform-<PROVIDER>-<NAME>/
├── README.md                 # Module documentation
├── main.tf                   # Primary resource definitions
├── variables.tf              # Input variable declarations
├── outputs.tf                # Output value declarations
├── versions.tf               # Provider and Terraform version constraints
├── locals.tf                 # Local value definitions (optional)
├── data.tf                   # Data source definitions (optional)
├── examples/                 # Example usage
│   ├── complete/            # Complete example with all features
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── minimal/             # Minimal example with defaults
│       ├── main.tf
│       └── README.md
├── modules/                  # Nested submodules
│   └── <submodule>/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
├── tests/                    # Automated tests
│   ├── integration/
│   └── unit/
├── .terraform-docs.yml       # terraform-docs configuration
├── .tflint.hcl              # TFLint configuration
└── LICENSE                   # Module license

```

## versions.tf Template

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  # Optional: Experiments
  # experiments = [module_variable_optional_attrs]
}
```

## variables.tf Patterns

### Basic Variable Types

```hcl
# String variable with validation
variable "name" {
  description = "Name of the resource (alphanumeric, hyphens, max 63 chars)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{1,63}$", var.name))
    error_message = "Name must be alphanumeric with hyphens, 1-63 characters."
  }
}

# Number variable with range validation
variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

# Boolean variable
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

# List variable
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.availability_zones) > 0
    error_message = "At least one availability zone must be specified."
  }
}

# Map variable
variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

# Object variable
variable "vpc_config" {
  description = "VPC configuration"
  type = object({
    cidr_block           = string
    enable_dns_hostnames = bool
    enable_dns_support   = bool
  })

  default = {
    cidr_block           = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support   = true
  }
}

# Complex nested object
variable "subnets" {
  description = "Subnet configuration"
  type = list(object({
    name              = string
    cidr_block        = string
    availability_zone = string
    public            = bool
    tags              = optional(map(string), {})
  }))

  validation {
    condition = alltrue([
      for subnet in var.subnets :
      can(cidrhost(subnet.cidr_block, 0))
    ])
    error_message = "All subnet CIDR blocks must be valid."
  }
}

# Sensitive variable
variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Password must be at least 16 characters."
  }
}
```

### Advanced Validation Patterns

```hcl
# CIDR block validation
variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block."
  }
}

# Enum-like validation
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# ARN validation
variable "kms_key_arn" {
  description = "KMS key ARN"
  type        = string
  default     = null

  validation {
    condition = var.kms_key_arn == null || can(regex(
      "^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]+$",
      var.kms_key_arn
    ))
    error_message = "Must be a valid KMS key ARN."
  }
}

# Email validation
variable "admin_email" {
  description = "Administrator email address"
  type        = string

  validation {
    condition = can(regex(
      "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      var.admin_email
    ))
    error_message = "Must be a valid email address."
  }
}

# Port range validation
variable "port" {
  description = "Port number"
  type        = number

  validation {
    condition     = var.port >= 1 && var.port <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}

# Multiple condition validation
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium",
      "t3.large", "t3.xlarge", "t3.2xlarge"
    ], var.instance_type)
    error_message = "Must be a valid t3 instance type."
  }

  validation {
    condition = (
      var.environment == "production" ?
      !contains(["t3.micro", "t3.small"], var.instance_type) :
      true
    )
    error_message = "Production must use t3.medium or larger."
  }
}
```

## outputs.tf Patterns

```hcl
# Simple outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "VPC ARN"
  value       = aws_vpc.main.arn
}

# Sensitive output
output "database_password" {
  description = "Database master password"
  value       = random_password.db_password.result
  sensitive   = true
}

# Complex object output
output "vpc" {
  description = "VPC details"
  value = {
    id                   = aws_vpc.main.id
    arn                  = aws_vpc.main.arn
    cidr_block           = aws_vpc.main.cidr_block
    default_network_acl  = aws_vpc.main.default_network_acl_id
    default_route_table  = aws_vpc.main.default_route_table_id
    default_security_group = aws_vpc.main.default_security_group_id
  }
}

# List output
output "subnet_ids" {
  description = "List of subnet IDs"
  value       = aws_subnet.main[*].id
}

# Map output
output "subnet_map" {
  description = "Map of subnet names to IDs"
  value = {
    for subnet in aws_subnet.main :
    subnet.tags.Name => subnet.id
  }
}

# Conditional output
output "nat_gateway_ips" {
  description = "NAT Gateway public IPs (if NAT enabled)"
  value = var.enable_nat_gateway ? [
    for nat in aws_nat_gateway.main : nat.public_ip
  ] : []
}

# Module output (exposing nested module outputs)
output "eks_cluster" {
  description = "EKS cluster details"
  value = {
    id                = module.eks.cluster_id
    endpoint          = module.eks.cluster_endpoint
    certificate_authority = module.eks.cluster_certificate_authority_data
    oidc_provider_arn = module.eks.oidc_provider_arn
  }
}

# Depends on output (for timing control)
output "vpc_ready" {
  description = "VPC is ready signal"
  value       = true
  depends_on = [
    aws_vpc.main,
    aws_subnet.main,
    aws_route_table.main
  ]
}
```

## locals.tf Patterns

```hcl
locals {
  # Common tags
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Module      = "vpc"
      CreatedAt   = timestamp()
    }
  )

  # Name prefix
  name_prefix = "${var.project_name}-${var.environment}"

  # Conditional logic
  enable_ipv6 = var.enable_ipv6 && var.environment != "dev"

  # Data transformation
  subnet_cidrs = cidrsubnets(
    var.vpc_cidr,
    [for i in range(var.subnet_count) : 8]...
  )

  # Map transformation
  availability_zones = {
    for idx, az in data.aws_availability_zones.available.names :
    az => idx if idx < var.max_azs
  }

  # Flattening nested structures
  route_table_associations = flatten([
    for rt_key, rt in aws_route_table.main : [
      for subnet_key, subnet in aws_subnet.main : {
        rt_id     = rt.id
        subnet_id = subnet.id
        key       = "${rt_key}-${subnet_key}"
      }
      if subnet.tags.Tier == rt.tags.Tier
    ]
  ])

  # Complex conditionals
  database_config = var.create_database ? {
    engine         = var.database_engine
    instance_class = var.environment == "production" ? "db.r5.xlarge" : "db.t3.small"
    multi_az       = var.environment == "production"
    backup_retention = var.environment == "production" ? 30 : 7
  } : null

  # Security group rules as data
  security_group_rules = {
    ingress = [
      {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTPS from anywhere"
      },
      {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP from anywhere"
      }
    ]
    egress = [
      {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow all outbound"
      }
    ]
  }

  # JSON encoding for policies
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

## Module Composition Patterns

### Parent-Child Module Pattern

```hcl
# Parent module: modules/complete-vpc/main.tf
module "vpc" {
  source = "../vpc-base"

  name       = var.name
  cidr_block = var.cidr_block
  tags       = var.tags
}

module "subnets" {
  source = "../subnets"

  vpc_id             = module.vpc.vpc_id
  availability_zones = var.availability_zones
  subnet_configs     = var.subnet_configs
  tags               = var.tags

  depends_on = [module.vpc]
}

module "nat_gateway" {
  source = "../nat-gateway"
  count  = var.enable_nat_gateway ? 1 : 0

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.subnets.public_subnet_ids
  tags              = var.tags

  depends_on = [module.subnets]
}
```

### Factory Pattern

```hcl
# modules/resource-factory/main.tf
locals {
  # Create resources based on a configuration map
  resources = {
    for key, config in var.resource_configs :
    key => config if config.enabled
  }
}

resource "aws_instance" "factory" {
  for_each = local.resources

  ami           = each.value.ami
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id

  tags = merge(
    var.common_tags,
    each.value.tags,
    {
      Name = each.key
    }
  )
}
```

### Wrapper Pattern

```hcl
# Wrap community modules with organizational defaults
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  # Organizational defaults
  name = "${var.project}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = data.aws_availability_zones.available.names
  private_subnets = local.private_subnet_cidrs
  public_subnets  = local.public_subnet_cidrs

  # Security defaults
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Compliance defaults
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  # Standard tags
  tags = local.common_tags
}
```

### Conditional Resource Pattern

```hcl
# Create resources conditionally
resource "aws_db_instance" "main" {
  count = var.create_database ? 1 : 0

  identifier     = "${var.name}-db"
  engine         = var.database_engine
  instance_class = var.database_instance_class

  # ... other configuration
}

# Reference conditional resource
output "database_endpoint" {
  description = "Database endpoint (if created)"
  value       = var.create_database ? aws_db_instance.main[0].endpoint : null
}
```

## Dynamic Block Patterns

```hcl
# Dynamic ingress rules
resource "aws_security_group" "main" {
  name        = "${var.name}-sg"
  description = var.description
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = var.egress_rules

    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = var.tags
}

# Dynamic nested blocks
resource "aws_launch_template" "main" {
  name_prefix = "${var.name}-"

  dynamic "block_device_mappings" {
    for_each = var.block_devices

    content {
      device_name = block_device_mappings.value.device_name

      dynamic "ebs" {
        for_each = block_device_mappings.value.ebs != null ? [block_device_mappings.value.ebs] : []

        content {
          volume_size           = ebs.value.volume_size
          volume_type           = ebs.value.volume_type
          delete_on_termination = ebs.value.delete_on_termination
          encrypted             = ebs.value.encrypted
          kms_key_id            = ebs.value.kms_key_id
        }
      }
    }
  }
}
```

## Count vs For_Each

### When to Use Count

```hcl
# Simple multiplication
resource "aws_subnet" "public" {
  count = var.public_subnet_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.name}-public-${count.index + 1}"
  }
}

# Conditional single resource
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0

  domain = "vpc"
  tags   = var.tags
}
```

### When to Use For_Each

```hcl
# Named resources from map
resource "aws_subnet" "main" {
  for_each = var.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone

  tags = merge(
    var.tags,
    {
      Name = each.key
    }
  )
}

# Set of strings
resource "aws_security_group_rule" "ingress" {
  for_each = toset(var.allowed_cidr_blocks)

  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.main.id
}
```

## Module Testing Patterns

### Terratest Example

```go
// tests/integration/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCModule(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../../examples/complete",
        Vars: map[string]interface{}{
            "name":       "test-vpc",
            "cidr_block": "10.0.0.0/16",
        },
    })

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcID)
}
```

### terraform-compliance Example

```gherkin
# tests/compliance/vpc.feature
Feature: VPC Security Compliance

  Scenario: VPC must have flow logs enabled
    Given I have aws_vpc defined
    Then it must have flow_log

  Scenario: Subnets must have appropriate tags
    Given I have aws_subnet defined
    Then it must contain tags
    And it must have Name tag
    And it must have Environment tag
```

## Documentation Patterns

### README.md Template

```markdown
# AWS VPC Module

Terraform module for creating a production-ready VPC with public and private subnets.

## Features

- Multi-AZ public and private subnets
- NAT Gateway with high availability
- VPC Flow Logs
- Transit Gateway integration
- SOC2 compliant defaults

## Usage

```hcl
module "vpc" {
  source = "git::https://github.com/org/terraform-aws-vpc.git?ref=v1.0.0"

  name       = "production-vpc"
  cidr_block = "10.0.0.0/16"

  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway = true
  enable_flow_logs   = true

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | VPC name | `string` | n/a | yes |
| cidr_block | VPC CIDR block | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | VPC ID |
| vpc_arn | VPC ARN |

## Examples

- [Complete](./examples/complete) - Full featured example
- [Minimal](./examples/minimal) - Minimal configuration

## License

Apache 2.0
```

### terraform-docs Configuration

```yaml
# .terraform-docs.yml
formatter: markdown table

header-from: main.tf
footer-from: ""

sections:
  hide: []
  show: []

content: |-
  {{ .Header }}

  ## Requirements

  {{ .Requirements }}

  ## Providers

  {{ .Providers }}

  ## Modules

  {{ .Modules }}

  ## Resources

  {{ .Resources }}

  ## Inputs

  {{ .Inputs }}

  ## Outputs

  {{ .Outputs }}

output:
  file: README.md
  mode: inject
  template: |-
    <!-- BEGIN_TF_DOCS -->
    {{ .Content }}
    <!-- END_TF_DOCS -->

sort:
  enabled: true
  by: required

settings:
  anchor: true
  color: true
```

## Best Practices Summary

1. **Naming**: Use consistent, descriptive names
2. **Validation**: Validate all inputs
3. **Documentation**: Auto-generate with terraform-docs
4. **Testing**: Implement automated tests
5. **Versioning**: Use semantic versioning
6. **Examples**: Provide complete and minimal examples
7. **Outputs**: Expose all useful resource attributes
8. **Defaults**: Provide sensible, secure defaults
9. **Composition**: Build complex modules from simple ones
10. **Backward Compatibility**: Maintain across minor versions
