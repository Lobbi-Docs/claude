# AWS VPC Module - Input Variables

# Required Variables
variable "vpc_name" {
  description = "Name of the VPC (used for resource naming)"
  type        = string

  validation {
    condition     = length(var.vpc_name) > 0 && length(var.vpc_name) <= 32
    error_message = "VPC name must be between 1 and 32 characters."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }

  validation {
    condition     = tonumber(split("/", var.vpc_cidr)[1]) <= 16
    error_message = "VPC CIDR block must be /16 or larger for proper subnet allocation."
  }
}

variable "availability_zones" {
  description = "List of availability zones for subnet creation"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability."
  }

  validation {
    condition     = length(var.availability_zones) <= 6
    error_message = "Maximum 6 availability zones supported."
  }
}

# DNS Configuration
variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

# NAT Gateway Configuration
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all AZs (cost optimization, lower availability)"
  type        = bool
  default     = false
}

# Public Subnet Configuration
variable "map_public_ip_on_launch" {
  description = "Auto-assign public IP to instances launched in public subnets"
  type        = bool
  default     = false
}

# VPC Flow Logs Configuration (SOC2 Compliance)
variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs for network monitoring and security"
  type        = bool
  default     = true
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, or ALL)"
  type        = string
  default     = "ALL"

  validation {
    condition     = contains(["ACCEPT", "REJECT", "ALL"], var.flow_logs_traffic_type)
    error_message = "Flow logs traffic type must be ACCEPT, REJECT, or ALL."
  }
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC flow logs"
  type        = number
  default     = 90

  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, 0
    ], var.flow_logs_retention_days)
    error_message = "Flow logs retention must be a valid CloudWatch Logs retention period."
  }
}

variable "flow_logs_kms_key_id" {
  description = "KMS key ID for encrypting flow logs (required for SOC2)"
  type        = string
  default     = null
}

# VPC Endpoints
variable "enable_s3_endpoint" {
  description = "Enable VPC endpoint for S3 (cost optimization and security)"
  type        = bool
  default     = true
}

variable "enable_dynamodb_endpoint" {
  description = "Enable VPC endpoint for DynamoDB (cost optimization and security)"
  type        = bool
  default     = true
}

# Kubernetes Integration
variable "enable_kubernetes_tags" {
  description = "Add Kubernetes-specific tags to subnets for EKS integration"
  type        = bool
  default     = false
}

# Compliance and Tagging (SOC2 Required)
variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development", "sandbox"], var.environment)
    error_message = "Environment must be production, staging, development, or sandbox."
  }
}

variable "owner" {
  description = "Team or individual responsible for this VPC"
  type        = string

  validation {
    condition     = length(var.owner) > 0
    error_message = "Owner must be specified for compliance tracking."
  }
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string

  validation {
    condition     = length(var.cost_center) > 0
    error_message = "Cost center must be specified for financial tracking."
  }
}

variable "data_classification" {
  description = "Data classification level (public, internal, confidential, restricted)"
  type        = string

  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be public, internal, confidential, or restricted."
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for k, v in var.tags : length(k) <= 128 && length(v) <= 256])
    error_message = "Tag keys must be <= 128 characters and values <= 256 characters."
  }
}
