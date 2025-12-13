# AWS VPC Module - Production-Ready, SOC2 Compliant
#
# This module creates a complete AWS VPC with:
# - Multi-AZ public and private subnets
# - Internet Gateway and NAT Gateways
# - Route tables and associations
# - VPC Flow Logs for security monitoring
# - Complete tagging for cost allocation and compliance
#
# Usage:
#   module "vpc" {
#     source = "./modules/aws-vpc"
#
#     vpc_name            = "production"
#     vpc_cidr            = "10.0.0.0/16"
#     availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
#
#     environment         = "production"
#     owner               = "platform-team"
#     cost_center         = "infrastructure"
#     data_classification = "confidential"
#   }

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for subnet calculations
locals {
  # Calculate subnet CIDRs automatically
  az_count = length(var.availability_zones)

  # Public subnets: First N /20 blocks (4096 IPs each)
  public_subnet_cidrs = [
    for idx in range(local.az_count) :
    cidrsubnet(var.vpc_cidr, 4, idx)
  ]

  # Private subnets: Next N /20 blocks
  private_subnet_cidrs = [
    for idx in range(local.az_count) :
    cidrsubnet(var.vpc_cidr, 4, idx + local.az_count)
  ]

  # Common tags applied to all resources
  common_tags = merge(
    var.tags,
    {
      Module              = "aws-vpc"
      ManagedBy           = "terraform"
      Environment         = var.environment
      Owner               = var.owner
      CostCenter          = var.cost_center
      DataClassification  = var.data_classification
      ComplianceFramework = "SOC2"
    }
  )
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-vpc"
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count = local.az_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = var.map_public_ip_on_launch

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-public-${var.availability_zones[count.index]}"
      Tier = "public"
      "kubernetes.io/role/elb" = var.enable_kubernetes_tags ? "1" : null
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-private-${var.availability_zones[count.index]}"
      Tier = "private"
      "kubernetes.io/role/internal-elb" = var.enable_kubernetes_tags ? "1" : null
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0

  domain = "vpc"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-nat-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-nat-${var.availability_zones[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-public-rt"
      Tier = "public"
    }
  )
}

# Public Route to Internet
resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Public Route Table Associations
resource "aws_route_table_association" "public" {
  count = local.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables
resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : local.az_count

  vpc_id = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = var.single_nat_gateway ? "${var.vpc_name}-private-rt" : "${var.vpc_name}-private-rt-${var.availability_zones[count.index]}"
      Tier = "private"
    }
  )
}

# Private Route to NAT Gateway (if enabled)
resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

# Private Route Table Associations
resource "aws_route_table_association" "private" {
  count = local.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

# VPC Flow Logs (SOC2 Compliance Requirement)
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name              = "/aws/vpc/${var.vpc_name}/flow-logs"
  retention_in_days = var.flow_logs_retention_days
  kms_key_id        = var.flow_logs_kms_key_id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-flow-logs"
    }
  )
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.vpc_name}-vpc-flow-logs-role"

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

  tags = local.common_tags
}

# IAM Policy for VPC Flow Logs
resource "aws_iam_role_policy" "vpc_flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.vpc_name}-vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow_logs[0].id

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
        Resource = "*"
      }
    ]
  })
}

# VPC Flow Log
resource "aws_flow_log" "main" {
  count = var.enable_flow_logs ? 1 : 0

  iam_role_arn    = aws_iam_role.vpc_flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  traffic_type    = var.flow_logs_traffic_type
  vpc_id          = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-flow-log"
    }
  )
}

# Default Security Group - Restrictive by default (SOC2)
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # No ingress or egress rules - deny all traffic by default
  # Applications should create their own security groups

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-default-sg-deny-all"
    }
  )
}

# VPC Endpoint for S3 (cost optimization and security)
resource "aws_vpc_endpoint" "s3" {
  count = var.enable_s3_endpoint ? 1 : 0

  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"

  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id
  )

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-s3-endpoint"
    }
  )
}

# VPC Endpoint for DynamoDB (cost optimization and security)
resource "aws_vpc_endpoint" "dynamodb" {
  count = var.enable_dynamodb_endpoint ? 1 : 0

  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.dynamodb"

  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id
  )

  tags = merge(
    local.common_tags,
    {
      Name = "${var.vpc_name}-dynamodb-endpoint"
    }
  )
}

# Data source for current region
data "aws_region" "current" {}
