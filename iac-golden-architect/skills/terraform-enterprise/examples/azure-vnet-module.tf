# Complete Azure VNet Module Example
# Production-ready VNet module with all enterprise features

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

#------------------------------------------------------------------------------
# VARIABLES
#------------------------------------------------------------------------------

variable "name" {
  description = "Name prefix for all resources"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{1,32}$", var.name))
    error_message = "Name must be lowercase alphanumeric with hyphens, max 32 characters."
  }
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "address_space" {
  description = "Address space for the VNet"
  type        = list(string)

  validation {
    condition     = length(var.address_space) > 0
    error_message = "At least one address space is required."
  }
}

variable "subnets" {
  description = "Map of subnets to create"
  type = map(object({
    address_prefixes                              = list(string)
    service_endpoints                             = optional(list(string), [])
    private_endpoint_network_policies_enabled     = optional(bool, true)
    private_link_service_network_policies_enabled = optional(bool, true)
    delegation = optional(object({
      name = string
      service_delegation = object({
        name    = string
        actions = list(string)
      })
    }), null)
  }))
}

variable "enable_ddos_protection" {
  description = "Enable DDoS Protection Plan"
  type        = bool
  default     = false
}

variable "dns_servers" {
  description = "Custom DNS servers"
  type        = list(string)
  default     = []
}

variable "enable_flow_logs" {
  description = "Enable NSG flow logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Flow logs retention in days"
  type        = number
  default     = 30
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}

#------------------------------------------------------------------------------
# LOCALS
#------------------------------------------------------------------------------

locals {
  common_tags = merge(
    var.tags,
    {
      Name        = var.name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Module      = "vnet"
    }
  )
}

#------------------------------------------------------------------------------
# RESOURCE GROUP (if creating new one)
#------------------------------------------------------------------------------

# data "azurerm_resource_group" "main" {
#   name = var.resource_group_name
# }

#------------------------------------------------------------------------------
# DDOS PROTECTION PLAN
#------------------------------------------------------------------------------

resource "azurerm_network_ddos_protection_plan" "main" {
  count = var.enable_ddos_protection ? 1 : 0

  name                = "${var.name}-ddos-plan"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# VIRTUAL NETWORK
#------------------------------------------------------------------------------

resource "azurerm_virtual_network" "main" {
  name                = "${var.name}-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space
  dns_servers         = var.dns_servers

  dynamic "ddos_protection_plan" {
    for_each = var.enable_ddos_protection ? [1] : []

    content {
      id     = azurerm_network_ddos_protection_plan.main[0].id
      enable = true
    }
  }

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# SUBNETS
#------------------------------------------------------------------------------

resource "azurerm_subnet" "main" {
  for_each = var.subnets

  name                 = "${var.name}-${each.key}-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = each.value.address_prefixes
  service_endpoints    = each.value.service_endpoints

  private_endpoint_network_policies_enabled     = each.value.private_endpoint_network_policies_enabled
  private_link_service_network_policies_enabled = each.value.private_link_service_network_policies_enabled

  dynamic "delegation" {
    for_each = each.value.delegation != null ? [each.value.delegation] : []

    content {
      name = delegation.value.name

      service_delegation {
        name    = delegation.value.service_delegation.name
        actions = delegation.value.service_delegation.actions
      }
    }
  }
}

#------------------------------------------------------------------------------
# NETWORK SECURITY GROUPS
#------------------------------------------------------------------------------

resource "azurerm_network_security_group" "main" {
  for_each = var.subnets

  name                = "${var.name}-${each.key}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(
    local.common_tags,
    {
      Subnet = each.key
    }
  )
}

resource "azurerm_subnet_network_security_group_association" "main" {
  for_each = var.subnets

  subnet_id                 = azurerm_subnet.main[each.key].id
  network_security_group_id = azurerm_network_security_group.main[each.key].id
}

#------------------------------------------------------------------------------
# NSG FLOW LOGS
#------------------------------------------------------------------------------

resource "azurerm_storage_account" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name                     = "${replace(var.name, "-", "")}flowlogs"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    delete_retention_policy {
      days = var.flow_logs_retention_days
    }
  }

  tags = local.common_tags
}

resource "azurerm_log_analytics_workspace" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name                = "${var.name}-law"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.flow_logs_retention_days

  tags = local.common_tags
}

resource "azurerm_network_watcher" "main" {
  count = var.enable_flow_logs ? 1 : 0

  name                = "${var.name}-network-watcher"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.common_tags
}

resource "azurerm_network_watcher_flow_log" "main" {
  for_each = var.enable_flow_logs ? var.subnets : {}

  name                      = "${var.name}-${each.key}-flow-log"
  network_watcher_name      = azurerm_network_watcher.main[0].name
  resource_group_name       = var.resource_group_name
  network_security_group_id = azurerm_network_security_group.main[each.key].id
  storage_account_id        = azurerm_storage_account.flow_logs[0].id
  enabled                   = true
  version                   = 2

  retention_policy {
    enabled = true
    days    = var.flow_logs_retention_days
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.flow_logs[0].workspace_id
    workspace_region      = azurerm_log_analytics_workspace.flow_logs[0].location
    workspace_resource_id = azurerm_log_analytics_workspace.flow_logs[0].id
    interval_in_minutes   = 10
  }

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# ROUTE TABLES
#------------------------------------------------------------------------------

resource "azurerm_route_table" "main" {
  for_each = var.subnets

  name                = "${var.name}-${each.key}-rt"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(
    local.common_tags,
    {
      Subnet = each.key
    }
  )
}

resource "azurerm_subnet_route_table_association" "main" {
  for_each = var.subnets

  subnet_id      = azurerm_subnet.main[each.key].id
  route_table_id = azurerm_route_table.main[each.key].id
}

#------------------------------------------------------------------------------
# VNET PEERING (example structure)
#------------------------------------------------------------------------------

# variable "peering_vnets" {
#   description = "Map of VNets to peer with"
#   type = map(object({
#     id                           = string
#     allow_virtual_network_access = bool
#     allow_forwarded_traffic      = bool
#     allow_gateway_transit        = bool
#     use_remote_gateways          = bool
#   }))
#   default = {}
# }

# resource "azurerm_virtual_network_peering" "main" {
#   for_each = var.peering_vnets

#   name                         = "${var.name}-to-${each.key}"
#   resource_group_name          = var.resource_group_name
#   virtual_network_name         = azurerm_virtual_network.main.name
#   remote_virtual_network_id    = each.value.id
#   allow_virtual_network_access = each.value.allow_virtual_network_access
#   allow_forwarded_traffic      = each.value.allow_forwarded_traffic
#   allow_gateway_transit        = each.value.allow_gateway_transit
#   use_remote_gateways          = each.value.use_remote_gateways
# }

#------------------------------------------------------------------------------
# OUTPUTS
#------------------------------------------------------------------------------

output "vnet_id" {
  description = "VNet ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "VNet name"
  value       = azurerm_virtual_network.main.name
}

output "vnet_address_space" {
  description = "VNet address space"
  value       = azurerm_virtual_network.main.address_space
}

output "subnet_ids" {
  description = "Map of subnet names to IDs"
  value = {
    for k, v in azurerm_subnet.main : k => v.id
  }
}

output "subnet_address_prefixes" {
  description = "Map of subnet names to address prefixes"
  value = {
    for k, v in azurerm_subnet.main : k => v.address_prefixes
  }
}

output "nsg_ids" {
  description = "Map of NSG names to IDs"
  value = {
    for k, v in azurerm_network_security_group.main : k => v.id
  }
}

output "route_table_ids" {
  description = "Map of route table names to IDs"
  value = {
    for k, v in azurerm_route_table.main : k => v.id
  }
}

output "vnet" {
  description = "Complete VNet details"
  value = {
    id            = azurerm_virtual_network.main.id
    name          = azurerm_virtual_network.main.name
    address_space = azurerm_virtual_network.main.address_space
    subnets       = { for k, v in azurerm_subnet.main : k => v.id }
    nsgs          = { for k, v in azurerm_network_security_group.main : k => v.id }
    route_tables  = { for k, v in azurerm_route_table.main : k => v.id }
  }
}

#------------------------------------------------------------------------------
# EXAMPLE USAGE
#------------------------------------------------------------------------------

# module "vnet" {
#   source = "./modules/vnet"
#
#   name                = "production"
#   resource_group_name = azurerm_resource_group.main.name
#   location            = "West US 2"
#   address_space       = ["10.0.0.0/16"]
#
#   subnets = {
#     public = {
#       address_prefixes  = ["10.0.1.0/24"]
#       service_endpoints = ["Microsoft.Storage", "Microsoft.KeyVault"]
#     }
#     private = {
#       address_prefixes  = ["10.0.2.0/24"]
#       service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
#     }
#     database = {
#       address_prefixes  = ["10.0.3.0/24"]
#       service_endpoints = ["Microsoft.Sql"]
#       delegation = {
#         name = "sql-delegation"
#         service_delegation = {
#           name = "Microsoft.Sql/managedInstances"
#           actions = [
#             "Microsoft.Network/virtualNetworks/subnets/join/action",
#             "Microsoft.Network/virtualNetworks/subnets/prepareNetworkPolicies/action",
#             "Microsoft.Network/virtualNetworks/subnets/unprepareNetworkPolicies/action"
#           ]
#         }
#       }
#     }
#     aks = {
#       address_prefixes  = ["10.0.10.0/23"]
#       service_endpoints = []
#       delegation = {
#         name = "aks-delegation"
#         service_delegation = {
#           name = "Microsoft.ContainerService/managedClusters"
#           actions = [
#             "Microsoft.Network/virtualNetworks/subnets/join/action"
#           ]
#         }
#       }
#     }
#   }
#
#   enable_ddos_protection = true
#   enable_flow_logs       = true
#   flow_logs_retention_days = 30
#
#   environment = "production"
#
#   tags = {
#     Project    = "MyApp"
#     CostCenter = "Engineering"
#     Owner      = "Platform Team"
#   }
# }
