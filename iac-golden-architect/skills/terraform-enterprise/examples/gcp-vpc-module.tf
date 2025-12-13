# Complete GCP VPC Module Example
# Production-ready VPC module with all enterprise features

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
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

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "routing_mode" {
  description = "VPC routing mode (REGIONAL or GLOBAL)"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "GLOBAL"], var.routing_mode)
    error_message = "Routing mode must be REGIONAL or GLOBAL."
  }
}

variable "subnets" {
  description = "Map of subnets to create"
  type = map(object({
    region                   = string
    ip_cidr_range            = string
    private_ip_google_access = optional(bool, true)
    secondary_ip_ranges = optional(list(object({
      range_name    = string
      ip_cidr_range = string
    })), [])
    log_config = optional(object({
      aggregation_interval = optional(string, "INTERVAL_5_SEC")
      flow_sampling        = optional(number, 0.5)
      metadata             = optional(string, "INCLUDE_ALL_METADATA")
    }), null)
  }))
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs for all subnets"
  type        = bool
  default     = true
}

variable "firewall_rules" {
  description = "Map of firewall rules to create"
  type = map(object({
    description   = string
    priority      = number
    direction     = string
    source_ranges = optional(list(string), [])
    source_tags   = optional(list(string), [])
    target_tags   = optional(list(string), [])
    allow = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
    deny = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
  }))
  default = {}
}

variable "enable_cloud_nat" {
  description = "Enable Cloud NAT for private instances"
  type        = bool
  default     = true
}

variable "nat_regions" {
  description = "Regions where Cloud NAT should be created"
  type        = list(string)
  default     = []
}

variable "enable_private_google_access" {
  description = "Enable Private Google Access by default"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}

#------------------------------------------------------------------------------
# LOCALS
#------------------------------------------------------------------------------

locals {
  common_labels = merge(
    var.labels,
    {
      name        = var.name
      environment = var.environment
      managed_by  = "terraform"
      module      = "vpc"
    }
  )

  # Extract unique regions from subnets
  regions = distinct([for k, v in var.subnets : v.region])

  # Use nat_regions if specified, otherwise use all subnet regions
  nat_regions = length(var.nat_regions) > 0 ? var.nat_regions : local.regions

  # Default flow log config
  default_flow_log_config = {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

#------------------------------------------------------------------------------
# VPC NETWORK
#------------------------------------------------------------------------------

resource "google_compute_network" "main" {
  name                            = "${var.name}-vpc"
  project                         = var.project_id
  auto_create_subnetworks         = false
  routing_mode                    = var.routing_mode
  delete_default_routes_on_create = false

  depends_on = []
}

#------------------------------------------------------------------------------
# SUBNETS
#------------------------------------------------------------------------------

resource "google_compute_subnetwork" "main" {
  for_each = var.subnets

  name          = "${var.name}-${each.key}-subnet"
  project       = var.project_id
  region        = each.value.region
  network       = google_compute_network.main.id
  ip_cidr_range = each.value.ip_cidr_range

  private_ip_google_access = each.value.private_ip_google_access

  dynamic "secondary_ip_range" {
    for_each = each.value.secondary_ip_ranges

    content {
      range_name    = secondary_ip_range.value.range_name
      ip_cidr_range = secondary_ip_range.value.ip_cidr_range
    }
  }

  dynamic "log_config" {
    for_each = var.enable_flow_logs ? [
      each.value.log_config != null ? each.value.log_config : local.default_flow_log_config
    ] : []

    content {
      aggregation_interval = log_config.value.aggregation_interval
      flow_sampling        = log_config.value.flow_sampling
      metadata             = log_config.value.metadata
    }
  }
}

#------------------------------------------------------------------------------
# FIREWALL RULES
#------------------------------------------------------------------------------

# Default deny all ingress rule
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "${var.name}-deny-all-ingress"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 65534
  direction = "INGRESS"

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

# Allow internal traffic
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.name}-allow-internal"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 1000
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [for k, v in var.subnets : v.ip_cidr_range]
}

# Custom firewall rules
resource "google_compute_firewall" "custom" {
  for_each = var.firewall_rules

  name        = "${var.name}-${each.key}"
  project     = var.project_id
  network     = google_compute_network.main.id
  description = each.value.description

  priority      = each.value.priority
  direction     = each.value.direction
  source_ranges = each.value.source_ranges
  source_tags   = each.value.source_tags
  target_tags   = each.value.target_tags

  dynamic "allow" {
    for_each = each.value.allow

    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }

  dynamic "deny" {
    for_each = each.value.deny

    content {
      protocol = deny.value.protocol
      ports    = deny.value.ports
    }
  }
}

#------------------------------------------------------------------------------
# CLOUD NAT
#------------------------------------------------------------------------------

# Cloud Router (required for Cloud NAT)
resource "google_compute_router" "main" {
  for_each = var.enable_cloud_nat ? toset(local.nat_regions) : toset([])

  name    = "${var.name}-router-${each.key}"
  project = var.project_id
  region  = each.key
  network = google_compute_network.main.id

  bgp {
    asn = 64514
  }
}

# Cloud NAT
resource "google_compute_router_nat" "main" {
  for_each = var.enable_cloud_nat ? toset(local.nat_regions) : toset([])

  name    = "${var.name}-nat-${each.key}"
  project = var.project_id
  region  = each.key
  router  = google_compute_router.main[each.key].name

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }

  min_ports_per_vm                 = 64
  enable_endpoint_independent_mapping = true
}

#------------------------------------------------------------------------------
# VPC PEERING (example structure)
#------------------------------------------------------------------------------

# variable "peering_networks" {
#   description = "Map of networks to peer with"
#   type = map(object({
#     peer_network                        = string
#     export_custom_routes                = bool
#     import_custom_routes                = bool
#     export_subnet_routes_with_public_ip = bool
#     import_subnet_routes_with_public_ip = bool
#   }))
#   default = {}
# }

# resource "google_compute_network_peering" "main" {
#   for_each = var.peering_networks

#   name         = "${var.name}-to-${each.key}"
#   network      = google_compute_network.main.id
#   peer_network = each.value.peer_network

#   export_custom_routes                = each.value.export_custom_routes
#   import_custom_routes                = each.value.import_custom_routes
#   export_subnet_routes_with_public_ip = each.value.export_subnet_routes_with_public_ip
#   import_subnet_routes_with_public_ip = each.value.import_subnet_routes_with_public_ip
# }

#------------------------------------------------------------------------------
# PRIVATE SERVICE CONNECTION (for managed services)
#------------------------------------------------------------------------------

resource "google_compute_global_address" "private_ip_range" {
  count = var.enable_private_google_access ? 1 : 0

  name          = "${var.name}-private-ip-range"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  count = var.enable_private_google_access ? 1 : 0

  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range[0].name]
}

#------------------------------------------------------------------------------
# OUTPUTS
#------------------------------------------------------------------------------

output "network_id" {
  description = "VPC network ID"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

output "network_self_link" {
  description = "VPC network self link"
  value       = google_compute_network.main.self_link
}

output "subnet_ids" {
  description = "Map of subnet names to IDs"
  value = {
    for k, v in google_compute_subnetwork.main : k => v.id
  }
}

output "subnet_self_links" {
  description = "Map of subnet names to self links"
  value = {
    for k, v in google_compute_subnetwork.main : k => v.self_link
  }
}

output "subnet_ip_cidr_ranges" {
  description = "Map of subnet names to IP CIDR ranges"
  value = {
    for k, v in google_compute_subnetwork.main : k => v.ip_cidr_range
  }
}

output "router_ids" {
  description = "Map of region to router IDs"
  value = {
    for k, v in google_compute_router.main : k => v.id
  }
}

output "nat_ids" {
  description = "Map of region to NAT IDs"
  value = {
    for k, v in google_compute_router_nat.main : k => v.id
  }
}

output "network" {
  description = "Complete VPC network details"
  value = {
    id              = google_compute_network.main.id
    name            = google_compute_network.main.name
    self_link       = google_compute_network.main.self_link
    subnets         = { for k, v in google_compute_subnetwork.main : k => v.id }
    subnet_regions  = { for k, v in google_compute_subnetwork.main : k => v.region }
    routers         = { for k, v in google_compute_router.main : k => v.id }
    nats            = { for k, v in google_compute_router_nat.main : k => v.id }
  }
}

#------------------------------------------------------------------------------
# EXAMPLE USAGE
#------------------------------------------------------------------------------

# module "vpc" {
#   source = "./modules/vpc"
#
#   name       = "production"
#   project_id = "my-project-id"
#   routing_mode = "REGIONAL"
#
#   subnets = {
#     public-us-central1 = {
#       region                   = "us-central1"
#       ip_cidr_range            = "10.0.1.0/24"
#       private_ip_google_access = true
#     }
#     private-us-central1 = {
#       region                   = "us-central1"
#       ip_cidr_range            = "10.0.2.0/24"
#       private_ip_google_access = true
#     }
#     gke-us-central1 = {
#       region        = "us-central1"
#       ip_cidr_range = "10.0.10.0/23"
#       secondary_ip_ranges = [
#         {
#           range_name    = "pods"
#           ip_cidr_range = "10.1.0.0/16"
#         },
#         {
#           range_name    = "services"
#           ip_cidr_range = "10.2.0.0/20"
#         }
#       ]
#     }
#     public-us-east1 = {
#       region        = "us-east1"
#       ip_cidr_range = "10.0.11.0/24"
#     }
#   }
#
#   firewall_rules = {
#     allow-ssh = {
#       description   = "Allow SSH from specific IPs"
#       priority      = 1000
#       direction     = "INGRESS"
#       source_ranges = ["35.235.240.0/20"]
#       target_tags   = ["allow-ssh"]
#       allow = [{
#         protocol = "tcp"
#         ports    = ["22"]
#       }]
#       deny = []
#     }
#     allow-http-https = {
#       description   = "Allow HTTP and HTTPS"
#       priority      = 1000
#       direction     = "INGRESS"
#       source_ranges = ["0.0.0.0/0"]
#       target_tags   = ["web"]
#       allow = [
#         {
#           protocol = "tcp"
#           ports    = ["80", "443"]
#         }
#       ]
#       deny = []
#     }
#   }
#
#   enable_cloud_nat              = true
#   enable_private_google_access  = true
#   enable_flow_logs              = true
#
#   environment = "production"
#
#   labels = {
#     project     = "myapp"
#     cost_center = "engineering"
#     owner       = "platform-team"
#   }
# }
