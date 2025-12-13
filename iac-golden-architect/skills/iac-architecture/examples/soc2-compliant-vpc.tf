# SOC2-Compliant VPC Configuration
# This example demonstrates a production-ready VPC configuration that satisfies SOC2 Trust Service Criteria

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for common configuration
locals {
  # SOC2-compliant tags
  common_tags = {
    Environment      = var.environment
    Owner            = var.owner
    Application      = var.application
    CostCenter       = var.cost_center
    ManagedBy        = "terraform"
    Compliance       = "soc2"
    DataClassification = "confidential"
  }

  # Network configuration
  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # CIDR blocks
  vpc_cidr = "10.0.0.0/16"

  # Calculate subnet CIDRs
  private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  database_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
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

#------------------------------------------------------------------------------
# VPC - CC7.1: Network Security
#------------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Enable VPC Flow Logs for SOC2 CC6.6
  tags = merge(
    local.common_tags,
    {
      Name         = "vpc-${var.environment}"
      SOC2_Control = "CC7.1"
      Purpose      = "network-isolation"
    }
  )
}

#------------------------------------------------------------------------------
# VPC Flow Logs - CC6.6: Logging and Monitoring
#------------------------------------------------------------------------------

# CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flow-logs/${var.environment}"
  retention_in_days = 90  # SOC2 requirement: minimum 90 days

  # Encrypt logs at rest
  kms_key_id = aws_kms_key.logs.arn

  tags = merge(
    local.common_tags,
    {
      Name         = "vpc-flow-logs-${var.environment}"
      SOC2_Control = "CC6.6"
      Purpose      = "network-monitoring"
    }
  )
}

# KMS key for log encryption - CC6.1: Encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # SOC2 requirement

  tags = merge(
    local.common_tags,
    {
      Name         = "logs-kms-${var.environment}"
      SOC2_Control = "CC6.1"
      Purpose      = "log-encryption"
    }
  )
}

resource "aws_kms_alias" "logs" {
  name          = "alias/logs-${var.environment}"
  target_key_id = aws_kms_key.logs.key_id
}

# IAM role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  name = "vpc-flow-logs-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      SOC2_Control = "CC6.7"
    }
  )
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  name = "vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = aws_cloudwatch_log_group.vpc_flow_logs.arn
      }
    ]
  })
}

# VPC Flow Logs - capture ALL traffic
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.vpc_flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"  # Accept, Reject, All
  vpc_id          = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name         = "vpc-flow-log-${var.environment}"
      SOC2_Control = "CC6.6"
    }
  )
}

#------------------------------------------------------------------------------
# Subnets - CC7.1: Network Segmentation
#------------------------------------------------------------------------------

# Private subnets for application servers
resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  # No public IPs in private subnets
  map_public_ip_on_launch = false

  tags = merge(
    local.common_tags,
    {
      Name         = "private-subnet-${count.index + 1}-${var.environment}"
      Tier         = "private"
      SOC2_Control = "CC7.1"
      Purpose      = "application-servers"
    }
  )
}

# Database subnets (even more isolated)
resource "aws_subnet" "database" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.database_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  map_public_ip_on_launch = false

  tags = merge(
    local.common_tags,
    {
      Name         = "database-subnet-${count.index + 1}-${var.environment}"
      Tier         = "database"
      SOC2_Control = "CC7.1"
      Purpose      = "data-storage"
    }
  )
}

# Public subnets - ONLY for load balancers
resource "aws_subnet" "public" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  # Do not auto-assign public IPs
  map_public_ip_on_launch = false

  tags = merge(
    local.common_tags,
    {
      Name         = "public-subnet-${count.index + 1}-${var.environment}"
      Tier         = "public"
      SOC2_Control = "CC7.1"
      Purpose      = "load-balancers-only"
    }
  )
}

# DB Subnet Group for RDS
resource "aws_db_subnet_group" "main" {
  name       = "db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(
    local.common_tags,
    {
      Name         = "db-subnet-group-${var.environment}"
      SOC2_Control = "CC7.1"
    }
  )
}

#------------------------------------------------------------------------------
# Internet Gateway and NAT Gateways
#------------------------------------------------------------------------------

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = "igw-${var.environment}"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"

  tags = merge(
    local.common_tags,
    {
      Name = "nat-eip-${count.index + 1}-${var.environment}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways in each AZ for high availability
resource "aws_nat_gateway" "main" {
  count         = length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    local.common_tags,
    {
      Name         = "nat-${count.index + 1}-${var.environment}"
      SOC2_Control = "A1.2"  # High availability
    }
  )

  depends_on = [aws_internet_gateway.main]
}

#------------------------------------------------------------------------------
# Route Tables
#------------------------------------------------------------------------------

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "public-rt-${var.environment}"
    }
  )
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route tables (one per AZ for HA)
resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "private-rt-${count.index + 1}-${var.environment}"
    }
  )
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Database route tables (separate for extra isolation)
resource "aws_route_table" "database" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  # No internet access for database subnets

  tags = merge(
    local.common_tags,
    {
      Name         = "database-rt-${count.index + 1}-${var.environment}"
      SOC2_Control = "CC7.1"
      Purpose      = "no-internet-access"
    }
  )
}

# Associate database subnets with database route tables
resource "aws_route_table_association" "database" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database[count.index].id
}

#------------------------------------------------------------------------------
# VPC Endpoints - CC7.1: Secure AWS Service Access
#------------------------------------------------------------------------------

# S3 Gateway Endpoint (free, avoids internet traffic)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    aws_route_table.database[*].id
  )

  tags = merge(
    local.common_tags,
    {
      Name         = "s3-endpoint-${var.environment}"
      SOC2_Control = "CC7.1"
      Purpose      = "secure-s3-access"
    }
  )
}

# DynamoDB Gateway Endpoint (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.dynamodb"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    aws_route_table.database[*].id
  )

  tags = merge(
    local.common_tags,
    {
      Name         = "dynamodb-endpoint-${var.environment}"
      SOC2_Control = "CC7.1"
    }
  )
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "vpc-endpoints-${var.environment}"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [local.vpc_cidr]
    description = "All traffic within VPC"
  }

  tags = merge(
    local.common_tags,
    {
      Name         = "vpc-endpoints-sg-${var.environment}"
      SOC2_Control = "CC7.1"
    }
  )
}

# Secrets Manager VPC Endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    local.common_tags,
    {
      Name         = "secretsmanager-endpoint-${var.environment}"
      SOC2_Control = "CC7.1"
      Purpose      = "secure-secrets-access"
    }
  )
}

# CloudWatch Logs VPC Endpoint
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    local.common_tags,
    {
      Name         = "logs-endpoint-${var.environment}"
      SOC2_Control = "CC6.6"
      Purpose      = "secure-logging"
    }
  )
}

#------------------------------------------------------------------------------
# Network ACLs - CC7.1: Additional Network Security Layer
#------------------------------------------------------------------------------

# Private subnet NACL
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  # Ingress rules
  ingress {
    protocol   = -1
    rule_no    = 100
    action     = "allow"
    cidr_block = local.vpc_cidr
    from_port  = 0
    to_port    = 0
  }

  # Egress rules
  egress {
    protocol   = -1
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(
    local.common_tags,
    {
      Name         = "private-nacl-${var.environment}"
      SOC2_Control = "CC7.1"
    }
  )
}

# Database subnet NACL - more restrictive
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.database[*].id

  # Only allow traffic from private subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = local.private_subnet_cidrs[0]
    from_port  = 5432  # PostgreSQL
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 101
    action     = "allow"
    cidr_block = local.private_subnet_cidrs[1]
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 102
    action     = "allow"
    cidr_block = local.private_subnet_cidrs[2]
    from_port  = 5432
    to_port    = 5432
  }

  # Return traffic
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  tags = merge(
    local.common_tags,
    {
      Name         = "database-nacl-${var.environment}"
      SOC2_Control = "CC7.1"
      Purpose      = "restrict-database-access"
    }
  )
}

#------------------------------------------------------------------------------
# Outputs
#------------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = aws_subnet.database[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "db_subnet_group_name" {
  description = "Database subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "vpc_endpoints_security_group_id" {
  description = "VPC endpoints security group ID"
  value       = aws_security_group.vpc_endpoints.id
}

output "soc2_compliance_evidence" {
  description = "SOC2 compliance evidence for this VPC"
  value = {
    vpc_flow_logs_enabled    = true
    log_retention_days       = aws_cloudwatch_log_group.vpc_flow_logs.retention_in_days
    log_encryption_enabled   = true
    kms_key_rotation_enabled = aws_kms_key.logs.enable_key_rotation
    network_segmentation     = "private, database, public subnets"
    vpc_endpoints_enabled    = ["s3", "dynamodb", "secretsmanager", "logs"]
    nacls_configured         = ["private", "database"]
    multi_az_deployment      = length(local.azs)
  }
}
