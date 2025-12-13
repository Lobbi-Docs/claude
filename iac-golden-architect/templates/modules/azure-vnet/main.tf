# Azure VNet Module - Production-Ready, SOC2 Compliant
#
# This module creates a complete Azure Virtual Network with:
# - Virtual Network with custom address space
# - Public and private subnets
# - Network Security Groups with logging
# - Route tables
# - Network Watcher and flow logs for security monitoring
# - Complete tagging for cost allocation and compliance
#
# Usage:
#   module "vnet" {
#     source = "./modules/azure-vnet"
#
#     vnet_name           = "production"
#     resource_group_name = "rg-production"
#     location            = "eastus"
#     address_space       = ["10.0.0.0/16"]
#
#     environment         = "production"
#     owner               = "platform-team"
#     cost_center         = "infrastructure"
#     data_classification = "confidential"
#   }

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Local variables for subnet calculations
locals {
  # Calculate subnet address prefixes automatically
  # First /24 for public, second /24 for private, third /24 for services
  public_subnet_prefix  = cidrsubnet(var.address_space[0], 8, 0)
  private_subnet_prefix = cidrsubnet(var.address_space[0], 8, 1)
  services_subnet_prefix = cidrsubnet(var.address_space[0], 8, 2)

  # Common tags applied to all resources
  common_tags = merge(
    var.tags,
    {
      Module              = "azure-vnet"
      ManagedBy           = "terraform"
      Environment         = var.environment
      Owner               = var.owner
      CostCenter          = var.cost_center
      DataClassification  = var.data_classification
      ComplianceFramework = "SOC2"
    }
  )
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.vnet_name}-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space
  dns_servers         = var.dns_servers

  tags = local.common_tags
}

# Public Subnet
resource "azurerm_subnet" "public" {
  name                 = "${var.vnet_name}-public-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [local.public_subnet_prefix]

  # Service endpoints for secure access to Azure services
  service_endpoints = var.enable_service_endpoints ? [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.ServiceBus",
    "Microsoft.EventHub"
  ] : []
}

# Private Subnet
resource "azurerm_subnet" "private" {
  name                 = "${var.vnet_name}-private-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [local.private_subnet_prefix]

  # Service endpoints for secure access to Azure services
  service_endpoints = var.enable_service_endpoints ? [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.ServiceBus",
    "Microsoft.EventHub"
  ] : []

  # Private endpoint network policies
  private_endpoint_network_policies_enabled     = false
  private_link_service_network_policies_enabled = false
}

# Services Subnet (for AKS, App Service, etc.)
resource "azurerm_subnet" "services" {
  count = var.enable_services_subnet ? 1 : 0

  name                 = "${var.vnet_name}-services-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [local.services_subnet_prefix]

  # Delegations for Azure services
  dynamic "delegation" {
    for_each = var.subnet_delegations
    content {
      name = delegation.value.name
      service_delegation {
        name    = delegation.value.service
        actions = delegation.value.actions
      }
    }
  }
}

# Network Security Group - Public
resource "azurerm_network_security_group" "public" {
  name                = "${var.vnet_name}-public-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(
    local.common_tags,
    {
      Tier = "public"
    }
  )
}

# Network Security Group - Private
resource "azurerm_network_security_group" "private" {
  name                = "${var.vnet_name}-private-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(
    local.common_tags,
    {
      Tier = "private"
    }
  )
}

# Default NSG Rules - Public (Allow HTTP/HTTPS, deny all else by default)
resource "azurerm_network_security_rule" "public_allow_http" {
  count = var.create_default_nsg_rules ? 1 : 0

  name                        = "AllowHTTP"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.public.name
}

resource "azurerm_network_security_rule" "public_allow_https" {
  count = var.create_default_nsg_rules ? 1 : 0

  name                        = "AllowHTTPS"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.public.name
}

# Default NSG Rules - Private (Deny all inbound from internet)
resource "azurerm_network_security_rule" "private_deny_internet" {
  count = var.create_default_nsg_rules ? 1 : 0

  name                        = "DenyInternetInbound"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.private.name
}

# Associate NSG with Public Subnet
resource "azurerm_subnet_network_security_group_association" "public" {
  subnet_id                 = azurerm_subnet.public.id
  network_security_group_id = azurerm_network_security_group.public.id
}

# Associate NSG with Private Subnet
resource "azurerm_subnet_network_security_group_association" "private" {
  subnet_id                 = azurerm_subnet.private.id
  network_security_group_id = azurerm_network_security_group.private.id
}

# Route Table - Public
resource "azurerm_route_table" "public" {
  name                          = "${var.vnet_name}-public-rt"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  disable_bgp_route_propagation = false

  tags = merge(
    local.common_tags,
    {
      Tier = "public"
    }
  )
}

# Route Table - Private
resource "azurerm_route_table" "private" {
  name                          = "${var.vnet_name}-private-rt"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  disable_bgp_route_propagation = false

  tags = merge(
    local.common_tags,
    {
      Tier = "private"
    }
  )
}

# Associate Route Table with Public Subnet
resource "azurerm_subnet_route_table_association" "public" {
  subnet_id      = azurerm_subnet.public.id
  route_table_id = azurerm_route_table.public.id
}

# Associate Route Table with Private Subnet
resource "azurerm_subnet_route_table_association" "private" {
  subnet_id      = azurerm_subnet.private.id
  route_table_id = azurerm_route_table.private.id
}

# Network Watcher (SOC2 Compliance Requirement)
resource "azurerm_network_watcher" "main" {
  count = var.enable_network_watcher ? 1 : 0

  name                = "${var.vnet_name}-network-watcher"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.common_tags
}

# Storage Account for Flow Logs
resource "azurerm_storage_account" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name                     = lower(replace("${var.vnet_name}flowlogs", "-", ""))
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  # SOC2 Requirements
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false

  blob_properties {
    delete_retention_policy {
      days = var.flow_logs_retention_days
    }
  }

  tags = local.common_tags
}

# Log Analytics Workspace for Flow Logs
resource "azurerm_log_analytics_workspace" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name                = "${var.vnet_name}-flow-logs-workspace"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.flow_logs_retention_days

  tags = local.common_tags
}

# NSG Flow Logs - Public
resource "azurerm_network_watcher_flow_log" "public" {
  count = var.enable_flow_logs && var.enable_network_watcher ? 1 : 0

  name                 = "${var.vnet_name}-public-nsg-flow-log"
  network_watcher_name = azurerm_network_watcher.main[0].name
  resource_group_name  = var.resource_group_name

  network_security_group_id = azurerm_network_security_group.public.id
  storage_account_id        = azurerm_storage_account.flow_logs[0].id
  enabled                   = true

  retention_policy {
    enabled = true
    days    = var.flow_logs_retention_days
  }

  traffic_analytics {
    enabled               = var.enable_traffic_analytics
    workspace_id          = azurerm_log_analytics_workspace.flow_logs[0].workspace_id
    workspace_region      = var.location
    workspace_resource_id = azurerm_log_analytics_workspace.flow_logs[0].id
    interval_in_minutes   = 10
  }

  tags = local.common_tags
}

# NSG Flow Logs - Private
resource "azurerm_network_watcher_flow_log" "private" {
  count = var.enable_flow_logs && var.enable_network_watcher ? 1 : 0

  name                 = "${var.vnet_name}-private-nsg-flow-log"
  network_watcher_name = azurerm_network_watcher.main[0].name
  resource_group_name  = var.resource_group_name

  network_security_group_id = azurerm_network_security_group.private.id
  storage_account_id        = azurerm_storage_account.flow_logs[0].id
  enabled                   = true

  retention_policy {
    enabled = true
    days    = var.flow_logs_retention_days
  }

  traffic_analytics {
    enabled               = var.enable_traffic_analytics
    workspace_id          = azurerm_log_analytics_workspace.flow_logs[0].workspace_id
    workspace_region      = var.location
    workspace_resource_id = azurerm_log_analytics_workspace.flow_logs[0].id
    interval_in_minutes   = 10
  }

  tags = local.common_tags
}

# DDoS Protection Plan (Optional, for production environments)
resource "azurerm_network_ddos_protection_plan" "main" {
  count = var.enable_ddos_protection ? 1 : 0

  name                = "${var.vnet_name}-ddos-plan"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.common_tags
}
