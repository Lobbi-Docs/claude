# AWS VPC Module - Outputs

# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "The ARN of the VPC"
  value       = aws_vpc.main.arn
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_name" {
  description = "The name of the VPC"
  value       = var.vpc_name
}

# Internet Gateway Outputs
output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "internet_gateway_arn" {
  description = "The ARN of the Internet Gateway"
  value       = aws_internet_gateway.main.arn
}

# Public Subnet Outputs
output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "public_subnet_arns" {
  description = "List of ARNs of public subnets"
  value       = aws_subnet.public[*].arn
}

output "public_subnet_cidrs" {
  description = "List of CIDR blocks of public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "public_subnet_availability_zones" {
  description = "List of availability zones of public subnets"
  value       = aws_subnet.public[*].availability_zone
}

# Private Subnet Outputs
output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "private_subnet_arns" {
  description = "List of ARNs of private subnets"
  value       = aws_subnet.private[*].arn
}

output "private_subnet_cidrs" {
  description = "List of CIDR blocks of private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "private_subnet_availability_zones" {
  description = "List of availability zones of private subnets"
  value       = aws_subnet.private[*].availability_zone
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
}

output "nat_gateway_public_ips" {
  description = "List of public Elastic IPs assigned to NAT Gateways"
  value       = var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
}

output "nat_eip_allocation_ids" {
  description = "List of Elastic IP allocation IDs for NAT Gateways"
  value       = var.enable_nat_gateway ? aws_eip.nat[*].id : []
}

# Route Table Outputs
output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "public_route_table_arn" {
  description = "ARN of the public route table"
  value       = aws_route_table.public.arn
}

output "private_route_table_ids" {
  description = "List of IDs of private route tables"
  value       = aws_route_table.private[*].id
}

output "private_route_table_arns" {
  description = "List of ARNs of private route tables"
  value       = aws_route_table.private[*].arn
}

# VPC Flow Logs Outputs
output "flow_logs_log_group_name" {
  description = "Name of the CloudWatch Log Group for VPC Flow Logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.vpc_flow_logs[0].name : null
}

output "flow_logs_log_group_arn" {
  description = "ARN of the CloudWatch Log Group for VPC Flow Logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.vpc_flow_logs[0].arn : null
}

output "flow_logs_iam_role_arn" {
  description = "ARN of the IAM role for VPC Flow Logs"
  value       = var.enable_flow_logs ? aws_iam_role.vpc_flow_logs[0].arn : null
}

output "flow_logs_id" {
  description = "ID of the VPC Flow Log"
  value       = var.enable_flow_logs ? aws_flow_log.main[0].id : null
}

# VPC Endpoint Outputs
output "s3_vpc_endpoint_id" {
  description = "ID of the S3 VPC Endpoint"
  value       = var.enable_s3_endpoint ? aws_vpc_endpoint.s3[0].id : null
}

output "dynamodb_vpc_endpoint_id" {
  description = "ID of the DynamoDB VPC Endpoint"
  value       = var.enable_dynamodb_endpoint ? aws_vpc_endpoint.dynamodb[0].id : null
}

# Default Security Group Output
output "default_security_group_id" {
  description = "ID of the default security group (configured to deny all traffic)"
  value       = aws_default_security_group.default.id
}

# Useful Aggregated Outputs
output "availability_zones" {
  description = "List of availability zones used"
  value       = var.availability_zones
}

output "subnet_map" {
  description = "Map of subnet types to their IDs and CIDRs"
  value = {
    public = {
      ids   = aws_subnet.public[*].id
      cidrs = aws_subnet.public[*].cidr_block
      azs   = aws_subnet.public[*].availability_zone
    }
    private = {
      ids   = aws_subnet.private[*].id
      cidrs = aws_subnet.private[*].cidr_block
      azs   = aws_subnet.private[*].availability_zone
    }
  }
}

# Configuration Summary
output "vpc_configuration" {
  description = "Summary of VPC configuration for reference"
  value = {
    name                    = var.vpc_name
    cidr                    = var.vpc_cidr
    availability_zones      = var.availability_zones
    nat_gateway_enabled     = var.enable_nat_gateway
    single_nat_gateway      = var.single_nat_gateway
    flow_logs_enabled       = var.enable_flow_logs
    s3_endpoint_enabled     = var.enable_s3_endpoint
    dynamodb_endpoint_enabled = var.enable_dynamodb_endpoint
    environment             = var.environment
    owner                   = var.owner
    cost_center             = var.cost_center
    data_classification     = var.data_classification
  }
}

# Tags Output
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}
