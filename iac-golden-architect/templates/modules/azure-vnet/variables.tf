# Azure VNet Module - Input Variables

# Required Variables
variable "vnet_name" {
  description = "Name of the Virtual Network (used for resource naming)"
  type        = string

  validation {
    condition     = length(var.vnet_name) > 0 && length(var.vnet_name) <= 64
    error_message = "VNet name must be between 1 and 64 characters."
  }

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.vnet_name))
    error_message = "VNet name can only contain alphanumeric characters and hyphens."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group where resources will be created"
  type        = string

  validation {
    condition     = length(var.resource_group_name) > 0
    error_message = "Resource group name must be specified."
  }
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string

  validation {
    condition     = length(var.location) > 0
    error_message = "Location must be specified."
  }
}

variable "address_space" {
  description = "Address space for the Virtual Network"
  type        = list(string)

  validation {
    condition     = length(var.address_space) > 0
    error_message = "At least one address space must be specified."
  }

  validation {
    condition     = alltrue([for cidr in var.address_space : can(cidrhost(cidr, 0))])
    error_message = "All address spaces must be valid CIDR blocks."
  }

  validation {
    condition     = alltrue([for cidr in var.address_space : tonumber(split("/", cidr)[1]) <= 16])
    error_message = "Address space must be /16 or larger for proper subnet allocation."
  }
}

# DNS Configuration
variable "dns_servers" {
  description = "List of DNS servers for the Virtual Network (empty list uses Azure default DNS)"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for ip in var.dns_servers : can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", ip))])
    error_message = "All DNS servers must be valid IPv4 addresses."
  }
}

# Subnet Configuration
variable "enable_services_subnet" {
  description = "Enable dedicated services subnet for AKS, App Service, etc."
  type        = bool
  default     = false
}

variable "subnet_delegations" {
  description = "List of subnet delegations for Azure services"
  type = list(object({
    name    = string
    service = string
    actions = list(string)
  }))
  default = []
}

# Service Endpoints
variable "enable_service_endpoints" {
  description = "Enable service endpoints for secure access to Azure services"
  type        = bool
  default     = true
}

# Network Security Groups
variable "create_default_nsg_rules" {
  description = "Create default NSG rules (HTTP/HTTPS for public, deny internet for private)"
  type        = bool
  default     = true
}

# Network Watcher and Flow Logs (SOC2 Compliance)
variable "enable_network_watcher" {
  description = "Enable Network Watcher for network monitoring"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable NSG Flow Logs for security monitoring"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain flow logs"
  type        = number
  default     = 90

  validation {
    condition     = var.flow_logs_retention_days >= 0 && var.flow_logs_retention_days <= 365
    error_message = "Flow logs retention must be between 0 and 365 days."
  }
}

variable "enable_traffic_analytics" {
  description = "Enable Traffic Analytics for network insights"
  type        = bool
  default     = true
}

# DDoS Protection
variable "enable_ddos_protection" {
  description = "Enable DDoS Protection Standard (additional cost, recommended for production)"
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
  description = "Team or individual responsible for this VNet"
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
    condition     = alltrue([for k, v in var.tags : length(k) <= 512 && length(v) <= 256])
    error_message = "Tag keys must be <= 512 characters and values <= 256 characters."
  }
}
