# GCP VPC Module - Production-Ready, SOC2 Compliant
#
# This module creates a complete GCP VPC with:
# - VPC network with custom subnets
# - Public and private subnets with Private Google Access
# - Cloud Router and Cloud NAT
# - Firewall rules for ingress/egress control
# - VPC Flow Logs for security monitoring
# - Complete labeling for cost allocation and compliance
#
# Usage:
#   module "vpc" {
#     source = "./modules/gcp-vpc"
#
#     vpc_name    = "production"
#     project_id  = "my-project-id"
#     region      = "us-central1"
#
#     environment         = "production"
#     owner               = "platform-team"
#     cost_center         = "infrastructure"
#     data_classification = "confidential"
#   }

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Local variables for subnet calculations
locals {
  # Common labels applied to all resources
  common_labels = merge(
    var.labels,
    {
      module              = "gcp-vpc"
      managed_by          = "terraform"
      environment         = var.environment
      owner               = replace(lower(var.owner), " ", "-")
      cost_center         = replace(lower(var.cost_center), " ", "-")
      data_classification = var.data_classification
      compliance_framework = "soc2"
    }
  )

  # Subnet configurations
  public_subnet_cidr  = var.public_subnet_cidr != "" ? var.public_subnet_cidr : "10.0.0.0/24"
  private_subnet_cidr = var.private_subnet_cidr != "" ? var.private_subnet_cidr : "10.0.1.0/24"
}

# VPC Network
resource "google_compute_network" "main" {
  name                            = "${var.vpc_name}-vpc"
  project                         = var.project_id
  auto_create_subnetworks         = false
  routing_mode                    = var.routing_mode
  delete_default_routes_on_create = var.delete_default_routes

  description = "VPC network for ${var.environment} environment"
}

# Public Subnet
resource "google_compute_subnetwork" "public" {
  name                     = "${var.vpc_name}-public-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.main.id
  ip_cidr_range            = local.public_subnet_cidr
  private_ip_google_access = var.enable_private_google_access

  # Secondary IP ranges for GKE pods and services
  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.vpc_name}-public-pods"
      ip_cidr_range = var.public_pods_cidr
    }
  }

  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.vpc_name}-public-services"
      ip_cidr_range = var.public_services_cidr
    }
  }

  # VPC Flow Logs (SOC2 Compliance)
  log_config {
    aggregation_interval = var.flow_logs_aggregation_interval
    flow_sampling        = var.flow_logs_sampling
    metadata             = "INCLUDE_ALL_METADATA"
  }

  description = "Public subnet for ${var.vpc_name} VPC"
}

# Private Subnet
resource "google_compute_subnetwork" "private" {
  name                     = "${var.vpc_name}-private-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.main.id
  ip_cidr_range            = local.private_subnet_cidr
  private_ip_google_access = true # Always enable for private subnet

  # Secondary IP ranges for GKE pods and services
  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.vpc_name}-private-pods"
      ip_cidr_range = var.private_pods_cidr
    }
  }

  dynamic "secondary_ip_range" {
    for_each = var.enable_gke_secondary_ranges ? [1] : []
    content {
      range_name    = "${var.vpc_name}-private-services"
      ip_cidr_range = var.private_services_cidr
    }
  }

  # VPC Flow Logs (SOC2 Compliance)
  log_config {
    aggregation_interval = var.flow_logs_aggregation_interval
    flow_sampling        = var.flow_logs_sampling
    metadata             = "INCLUDE_ALL_METADATA"
  }

  description = "Private subnet for ${var.vpc_name} VPC"
}

# Cloud Router
resource "google_compute_router" "main" {
  count = var.enable_cloud_nat ? 1 : 0

  name    = "${var.vpc_name}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn = var.router_asn
  }

  description = "Cloud Router for ${var.vpc_name} VPC"
}

# Cloud NAT
resource "google_compute_router_nat" "main" {
  count = var.enable_cloud_nat ? 1 : 0

  name                               = "${var.vpc_name}-nat"
  project                            = var.project_id
  region                             = var.region
  router                             = google_compute_router.main[0].name
  nat_ip_allocate_option             = var.nat_ip_allocate_option
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.private.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  # Enable logging for NAT (SOC2 Compliance)
  log_config {
    enable = var.enable_nat_logging
    filter = "ALL"
  }

  # Static NAT IPs
  dynamic "nat_ips" {
    for_each = var.nat_ip_allocate_option == "MANUAL_ONLY" ? google_compute_address.nat_ips : []
    content {
      nat_ip = nat_ips.value.id
    }
  }
}

# Static IP addresses for Cloud NAT (if manual allocation)
resource "google_compute_address" "nat_ips" {
  count = var.nat_ip_allocate_option == "MANUAL_ONLY" ? var.nat_ip_count : 0

  name         = "${var.vpc_name}-nat-ip-${count.index + 1}"
  project      = var.project_id
  region       = var.region
  address_type = "EXTERNAL"

  labels = local.common_labels
}

# Firewall Rule - Allow Internal Traffic
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.vpc_name}-allow-internal"
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

  source_ranges = [
    local.public_subnet_cidr,
    local.private_subnet_cidr
  ]

  description = "Allow all internal traffic within VPC"
}

# Firewall Rule - Allow SSH (restricted by tag)
resource "google_compute_firewall" "allow_ssh" {
  count = var.enable_ssh_firewall ? 1 : 0

  name    = "${var.vpc_name}-allow-ssh"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 1000
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.ssh_source_ranges
  target_tags   = ["allow-ssh"]

  # Enable logging for SSH access (SOC2 Compliance)
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Allow SSH access to instances with allow-ssh tag"
}

# Firewall Rule - Allow HTTP/HTTPS
resource "google_compute_firewall" "allow_http_https" {
  count = var.enable_http_https_firewall ? 1 : 0

  name    = "${var.vpc_name}-allow-http-https"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 1000
  direction = "INGRESS"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["allow-http", "allow-https"]

  # Enable logging for web traffic (SOC2 Compliance)
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Allow HTTP/HTTPS traffic to instances with appropriate tags"
}

# Firewall Rule - Deny All Ingress (low priority, catch-all)
resource "google_compute_firewall" "deny_all_ingress" {
  count = var.create_default_deny_rule ? 1 : 0

  name    = "${var.vpc_name}-deny-all-ingress"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 65534
  direction = "INGRESS"

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]

  # Enable logging for denied traffic (SOC2 Compliance)
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Deny all ingress traffic not explicitly allowed"
}

# Firewall Rule - Deny Egress to Sensitive Ports (optional)
resource "google_compute_firewall" "deny_egress_sensitive" {
  count = var.deny_egress_sensitive_ports ? 1 : 0

  name    = "${var.vpc_name}-deny-egress-sensitive"
  project = var.project_id
  network = google_compute_network.main.id

  priority  = 1000
  direction = "EGRESS"

  deny {
    protocol = "tcp"
    ports    = ["23", "3389"] # Telnet, RDP
  }

  destination_ranges = ["0.0.0.0/0"]

  # Enable logging for denied egress (SOC2 Compliance)
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Deny egress to sensitive/insecure ports"
}

# Private Service Connection for managed services
resource "google_compute_global_address" "private_service_connection" {
  count = var.enable_private_service_connection ? 1 : 0

  name          = "${var.vpc_name}-private-service-connection"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id

  labels = local.common_labels
}

resource "google_service_networking_connection" "private_service_connection" {
  count = var.enable_private_service_connection ? 1 : 0

  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_connection[0].name]
}

# VPC Peering (if specified)
resource "google_compute_network_peering" "peering" {
  count = length(var.peering_networks)

  name         = "${var.vpc_name}-peering-${count.index}"
  network      = google_compute_network.main.id
  peer_network = var.peering_networks[count.index]

  export_custom_routes = var.peering_export_custom_routes
  import_custom_routes = var.peering_import_custom_routes
}

# DNS Policy for Private Google Access
resource "google_dns_policy" "private_google_access" {
  count = var.enable_private_google_access_dns ? 1 : 0

  name    = "${var.vpc_name}-private-google-access-policy"
  project = var.project_id

  enable_inbound_forwarding = false
  enable_logging            = true

  alternative_name_server_config {
    target_name_servers {
      ipv4_address = "169.254.169.254"
    }
  }

  networks {
    network_url = google_compute_network.main.id
  }

  description = "DNS policy for Private Google Access"
}
