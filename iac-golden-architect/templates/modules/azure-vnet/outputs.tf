# Azure VNet Module - Outputs

# Virtual Network Outputs
output "vnet_id" {
  description = "The ID of the Virtual Network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "The name of the Virtual Network"
  value       = azurerm_virtual_network.main.name
}

output "vnet_address_space" {
  description = "The address space of the Virtual Network"
  value       = azurerm_virtual_network.main.address_space
}

output "vnet_location" {
  description = "The location of the Virtual Network"
  value       = azurerm_virtual_network.main.location
}

output "vnet_guid" {
  description = "The GUID of the Virtual Network"
  value       = azurerm_virtual_network.main.guid
}

# Subnet Outputs
output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = azurerm_subnet.public.id
}

output "public_subnet_name" {
  description = "The name of the public subnet"
  value       = azurerm_subnet.public.name
}

output "public_subnet_address_prefixes" {
  description = "The address prefixes of the public subnet"
  value       = azurerm_subnet.public.address_prefixes
}

output "private_subnet_id" {
  description = "The ID of the private subnet"
  value       = azurerm_subnet.private.id
}

output "private_subnet_name" {
  description = "The name of the private subnet"
  value       = azurerm_subnet.private.name
}

output "private_subnet_address_prefixes" {
  description = "The address prefixes of the private subnet"
  value       = azurerm_subnet.private.address_prefixes
}

output "services_subnet_id" {
  description = "The ID of the services subnet (if enabled)"
  value       = var.enable_services_subnet ? azurerm_subnet.services[0].id : null
}

output "services_subnet_name" {
  description = "The name of the services subnet (if enabled)"
  value       = var.enable_services_subnet ? azurerm_subnet.services[0].name : null
}

output "services_subnet_address_prefixes" {
  description = "The address prefixes of the services subnet (if enabled)"
  value       = var.enable_services_subnet ? azurerm_subnet.services[0].address_prefixes : null
}

# Network Security Group Outputs
output "public_nsg_id" {
  description = "The ID of the public Network Security Group"
  value       = azurerm_network_security_group.public.id
}

output "public_nsg_name" {
  description = "The name of the public Network Security Group"
  value       = azurerm_network_security_group.public.name
}

output "private_nsg_id" {
  description = "The ID of the private Network Security Group"
  value       = azurerm_network_security_group.private.id
}

output "private_nsg_name" {
  description = "The name of the private Network Security Group"
  value       = azurerm_network_security_group.private.name
}

# Route Table Outputs
output "public_route_table_id" {
  description = "The ID of the public route table"
  value       = azurerm_route_table.public.id
}

output "public_route_table_name" {
  description = "The name of the public route table"
  value       = azurerm_route_table.public.name
}

output "private_route_table_id" {
  description = "The ID of the private route table"
  value       = azurerm_route_table.private.id
}

output "private_route_table_name" {
  description = "The name of the private route table"
  value       = azurerm_route_table.private.name
}

# Network Watcher Outputs
output "network_watcher_id" {
  description = "The ID of the Network Watcher (if enabled)"
  value       = var.enable_network_watcher ? azurerm_network_watcher.main[0].id : null
}

output "network_watcher_name" {
  description = "The name of the Network Watcher (if enabled)"
  value       = var.enable_network_watcher ? azurerm_network_watcher.main[0].name : null
}

# Flow Logs Outputs
output "flow_logs_storage_account_id" {
  description = "The ID of the storage account for flow logs (if enabled)"
  value       = var.enable_flow_logs ? azurerm_storage_account.flow_logs[0].id : null
}

output "flow_logs_storage_account_name" {
  description = "The name of the storage account for flow logs (if enabled)"
  value       = var.enable_flow_logs ? azurerm_storage_account.flow_logs[0].name : null
}

output "flow_logs_workspace_id" {
  description = "The ID of the Log Analytics workspace for flow logs (if enabled)"
  value       = var.enable_flow_logs ? azurerm_log_analytics_workspace.flow_logs[0].id : null
}

output "flow_logs_workspace_name" {
  description = "The name of the Log Analytics workspace for flow logs (if enabled)"
  value       = var.enable_flow_logs ? azurerm_log_analytics_workspace.flow_logs[0].name : null
}

output "public_flow_log_id" {
  description = "The ID of the public NSG flow log (if enabled)"
  value       = var.enable_flow_logs && var.enable_network_watcher ? azurerm_network_watcher_flow_log.public[0].id : null
}

output "private_flow_log_id" {
  description = "The ID of the private NSG flow log (if enabled)"
  value       = var.enable_flow_logs && var.enable_network_watcher ? azurerm_network_watcher_flow_log.private[0].id : null
}

# DDoS Protection Outputs
output "ddos_protection_plan_id" {
  description = "The ID of the DDoS Protection Plan (if enabled)"
  value       = var.enable_ddos_protection ? azurerm_network_ddos_protection_plan.main[0].id : null
}

output "ddos_protection_plan_name" {
  description = "The name of the DDoS Protection Plan (if enabled)"
  value       = var.enable_ddos_protection ? azurerm_network_ddos_protection_plan.main[0].name : null
}

# Useful Aggregated Outputs
output "subnet_map" {
  description = "Map of subnet names to their IDs and address prefixes"
  value = {
    public = {
      id               = azurerm_subnet.public.id
      name             = azurerm_subnet.public.name
      address_prefixes = azurerm_subnet.public.address_prefixes
    }
    private = {
      id               = azurerm_subnet.private.id
      name             = azurerm_subnet.private.name
      address_prefixes = azurerm_subnet.private.address_prefixes
    }
    services = var.enable_services_subnet ? {
      id               = azurerm_subnet.services[0].id
      name             = azurerm_subnet.services[0].name
      address_prefixes = azurerm_subnet.services[0].address_prefixes
    } : null
  }
}

output "nsg_map" {
  description = "Map of NSG names to their IDs"
  value = {
    public = {
      id   = azurerm_network_security_group.public.id
      name = azurerm_network_security_group.public.name
    }
    private = {
      id   = azurerm_network_security_group.private.id
      name = azurerm_network_security_group.private.name
    }
  }
}

# Configuration Summary
output "vnet_configuration" {
  description = "Summary of VNet configuration for reference"
  value = {
    name                    = var.vnet_name
    location                = var.location
    address_space           = var.address_space
    network_watcher_enabled = var.enable_network_watcher
    flow_logs_enabled       = var.enable_flow_logs
    traffic_analytics_enabled = var.enable_traffic_analytics
    ddos_protection_enabled = var.enable_ddos_protection
    service_endpoints_enabled = var.enable_service_endpoints
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
