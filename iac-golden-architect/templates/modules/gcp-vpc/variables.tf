# GCP VPC Module - Input Variables

# Required Variables
variable "vpc_name" {
  description = "Name of the VPC network (used for resource naming)"
  type        = string

  validation {
    condition     = length(var.vpc_name) > 0 && length(var.vpc_name) <= 63
    error_message = "VPC name must be between 1 and 63 characters."
  }

  validation {
    condition     = can(regex("^[a-z]([a-z0-9-]*[a-z0-9])?$", var.vpc_name))
    error_message = "VPC name must start with a letter, contain only lowercase letters, numbers, and hyphens."
  }
}

variable "project_id" {
  description = "GCP project ID where resources will be created"
  type        = string

  validation {
    condition     = length(var.project_id) > 0
    error_message = "Project ID must be specified."
  }
}

variable "region" {
  description = "GCP region for regional resources (subnets, router, NAT)"
  type        = string

  validation {
    condition     = length(var.region) > 0
    error_message = "Region must be specified."
  }
}

# Network Configuration
variable "routing_mode" {
  description = "Network routing mode (REGIONAL or GLOBAL)"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "GLOBAL"], var.routing_mode)
    error_message = "Routing mode must be REGIONAL or GLOBAL."
  }
}

variable "delete_default_routes" {
  description = "Delete default routes on VPC creation (creates isolated network)"
  type        = bool
  default     = false
}

# Subnet Configuration
variable "public_subnet_cidr" {
  description = "CIDR range for public subnet (empty string for default 10.0.0.0/24)"
  type        = string
  default     = ""

  validation {
    condition     = var.public_subnet_cidr == "" || can(cidrhost(var.public_subnet_cidr, 0))
    error_message = "Public subnet CIDR must be a valid CIDR block or empty string."
  }
}

variable "private_subnet_cidr" {
  description = "CIDR range for private subnet (empty string for default 10.0.1.0/24)"
  type        = string
  default     = ""

  validation {
    condition     = var.private_subnet_cidr == "" || can(cidrhost(var.private_subnet_cidr, 0))
    error_message = "Private subnet CIDR must be a valid CIDR block or empty string."
  }
}

variable "enable_private_google_access" {
  description = "Enable Private Google Access for subnets"
  type        = bool
  default     = true
}

# GKE Secondary Ranges
variable "enable_gke_secondary_ranges" {
  description = "Enable secondary IP ranges for GKE pods and services"
  type        = bool
  default     = false
}

variable "public_pods_cidr" {
  description = "CIDR range for GKE pods in public subnet"
  type        = string
  default     = "10.4.0.0/14"
}

variable "public_services_cidr" {
  description = "CIDR range for GKE services in public subnet"
  type        = string
  default     = "10.8.0.0/20"
}

variable "private_pods_cidr" {
  description = "CIDR range for GKE pods in private subnet"
  type        = string
  default     = "10.12.0.0/14"
}

variable "private_services_cidr" {
  description = "CIDR range for GKE services in private subnet"
  type        = string
  default     = "10.16.0.0/20"
}

# Cloud Router and NAT Configuration
variable "enable_cloud_nat" {
  description = "Enable Cloud NAT for private subnet egress"
  type        = bool
  default     = true
}

variable "router_asn" {
  description = "ASN for Cloud Router (must be 64512-65534 or 4200000000-4294967294)"
  type        = number
  default     = 64514

  validation {
    condition = (
      (var.router_asn >= 64512 && var.router_asn <= 65534) ||
      (var.router_asn >= 4200000000 && var.router_asn <= 4294967294)
    )
    error_message = "Router ASN must be in range 64512-65534 or 4200000000-4294967294."
  }
}

variable "nat_ip_allocate_option" {
  description = "NAT IP allocation method (AUTO_ONLY or MANUAL_ONLY)"
  type        = string
  default     = "AUTO_ONLY"

  validation {
    condition     = contains(["AUTO_ONLY", "MANUAL_ONLY"], var.nat_ip_allocate_option)
    error_message = "NAT IP allocation must be AUTO_ONLY or MANUAL_ONLY."
  }
}

variable "nat_ip_count" {
  description = "Number of NAT IPs to allocate (only for MANUAL_ONLY mode)"
  type        = number
  default     = 1

  validation {
    condition     = var.nat_ip_count >= 1 && var.nat_ip_count <= 16
    error_message = "NAT IP count must be between 1 and 16."
  }
}

variable "enable_nat_logging" {
  description = "Enable logging for Cloud NAT (SOC2 compliance)"
  type        = bool
  default     = true
}

# VPC Flow Logs Configuration (SOC2 Compliance)
variable "flow_logs_aggregation_interval" {
  description = "Aggregation interval for VPC Flow Logs"
  type        = string
  default     = "INTERVAL_5_SEC"

  validation {
    condition = contains([
      "INTERVAL_5_SEC",
      "INTERVAL_30_SEC",
      "INTERVAL_1_MIN",
      "INTERVAL_5_MIN",
      "INTERVAL_10_MIN",
      "INTERVAL_15_MIN"
    ], var.flow_logs_aggregation_interval)
    error_message = "Invalid flow logs aggregation interval."
  }
}

variable "flow_logs_sampling" {
  description = "Sampling rate for VPC Flow Logs (0.0 to 1.0)"
  type        = number
  default     = 0.5

  validation {
    condition     = var.flow_logs_sampling >= 0.0 && var.flow_logs_sampling <= 1.0
    error_message = "Flow logs sampling must be between 0.0 and 1.0."
  }
}

# Firewall Configuration
variable "enable_ssh_firewall" {
  description = "Create firewall rule to allow SSH access"
  type        = bool
  default     = true
}

variable "ssh_source_ranges" {
  description = "Source IP ranges allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # SECURITY: Restrict in production!

  validation {
    condition     = alltrue([for cidr in var.ssh_source_ranges : can(cidrhost(cidr, 0))])
    error_message = "All SSH source ranges must be valid CIDR blocks."
  }
}

variable "enable_http_https_firewall" {
  description = "Create firewall rule to allow HTTP/HTTPS traffic"
  type        = bool
  default     = true
}

variable "create_default_deny_rule" {
  description = "Create default deny-all ingress rule (low priority)"
  type        = bool
  default     = false
}

variable "deny_egress_sensitive_ports" {
  description = "Block egress to sensitive/insecure ports (Telnet, RDP)"
  type        = bool
  default     = true
}

# Private Service Connection
variable "enable_private_service_connection" {
  description = "Enable private service connection for Cloud SQL, etc."
  type        = bool
  default     = false
}

# DNS Configuration
variable "enable_private_google_access_dns" {
  description = "Enable DNS policy for Private Google Access"
  type        = bool
  default     = false
}

# VPC Peering
variable "peering_networks" {
  description = "List of VPC network self_links to peer with"
  type        = list(string)
  default     = []
}

variable "peering_export_custom_routes" {
  description = "Export custom routes to peered networks"
  type        = bool
  default     = false
}

variable "peering_import_custom_routes" {
  description = "Import custom routes from peered networks"
  type        = bool
  default     = false
}

# Compliance and Labeling (SOC2 Required)
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

variable "labels" {
  description = "Additional labels to apply to all resources"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for k, v in var.labels : can(regex("^[a-z][a-z0-9_-]*$", k))])
    error_message = "Label keys must start with lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores."
  }

  validation {
    condition     = alltrue([for k, v in var.labels : length(k) <= 63 && length(v) <= 63])
    error_message = "Label keys and values must be <= 63 characters."
  }
}
