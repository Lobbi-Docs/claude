# GCP VPC Module - Outputs

# VPC Network Outputs
output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.main.name
}

output "network_self_link" {
  description = "The self-link of the VPC network"
  value       = google_compute_network.main.self_link
}

output "network_gateway_ipv4" {
  description = "The gateway IPv4 address of the VPC network"
  value       = google_compute_network.main.gateway_ipv4
}

# Subnet Outputs
output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = google_compute_subnetwork.public.id
}

output "public_subnet_name" {
  description = "The name of the public subnet"
  value       = google_compute_subnetwork.public.name
}

output "public_subnet_self_link" {
  description = "The self-link of the public subnet"
  value       = google_compute_subnetwork.public.self_link
}

output "public_subnet_cidr" {
  description = "The IP CIDR range of the public subnet"
  value       = google_compute_subnetwork.public.ip_cidr_range
}

output "public_subnet_gateway_address" {
  description = "The gateway address of the public subnet"
  value       = google_compute_subnetwork.public.gateway_address
}

output "private_subnet_id" {
  description = "The ID of the private subnet"
  value       = google_compute_subnetwork.private.id
}

output "private_subnet_name" {
  description = "The name of the private subnet"
  value       = google_compute_subnetwork.private.name
}

output "private_subnet_self_link" {
  description = "The self-link of the private subnet"
  value       = google_compute_subnetwork.private.self_link
}

output "private_subnet_cidr" {
  description = "The IP CIDR range of the private subnet"
  value       = google_compute_subnetwork.private.ip_cidr_range
}

output "private_subnet_gateway_address" {
  description = "The gateway address of the private subnet"
  value       = google_compute_subnetwork.private.gateway_address
}

# GKE Secondary Ranges
output "public_pods_range_name" {
  description = "The name of the secondary range for GKE pods in public subnet"
  value       = var.enable_gke_secondary_ranges ? "${var.vpc_name}-public-pods" : null
}

output "public_services_range_name" {
  description = "The name of the secondary range for GKE services in public subnet"
  value       = var.enable_gke_secondary_ranges ? "${var.vpc_name}-public-services" : null
}

output "private_pods_range_name" {
  description = "The name of the secondary range for GKE pods in private subnet"
  value       = var.enable_gke_secondary_ranges ? "${var.vpc_name}-private-pods" : null
}

output "private_services_range_name" {
  description = "The name of the secondary range for GKE services in private subnet"
  value       = var.enable_gke_secondary_ranges ? "${var.vpc_name}-private-services" : null
}

# Cloud Router Outputs
output "router_id" {
  description = "The ID of the Cloud Router (if enabled)"
  value       = var.enable_cloud_nat ? google_compute_router.main[0].id : null
}

output "router_name" {
  description = "The name of the Cloud Router (if enabled)"
  value       = var.enable_cloud_nat ? google_compute_router.main[0].name : null
}

output "router_self_link" {
  description = "The self-link of the Cloud Router (if enabled)"
  value       = var.enable_cloud_nat ? google_compute_router.main[0].self_link : null
}

# Cloud NAT Outputs
output "nat_id" {
  description = "The ID of the Cloud NAT (if enabled)"
  value       = var.enable_cloud_nat ? google_compute_router_nat.main[0].id : null
}

output "nat_name" {
  description = "The name of the Cloud NAT (if enabled)"
  value       = var.enable_cloud_nat ? google_compute_router_nat.main[0].name : null
}

output "nat_external_ips" {
  description = "List of external IP addresses allocated to Cloud NAT"
  value       = var.nat_ip_allocate_option == "MANUAL_ONLY" ? google_compute_address.nat_ips[*].address : []
}

# Firewall Rules Outputs
output "allow_internal_firewall_id" {
  description = "The ID of the allow-internal firewall rule"
  value       = google_compute_firewall.allow_internal.id
}

output "allow_ssh_firewall_id" {
  description = "The ID of the allow-ssh firewall rule (if enabled)"
  value       = var.enable_ssh_firewall ? google_compute_firewall.allow_ssh[0].id : null
}

output "allow_http_https_firewall_id" {
  description = "The ID of the allow-http-https firewall rule (if enabled)"
  value       = var.enable_http_https_firewall ? google_compute_firewall.allow_http_https[0].id : null
}

output "deny_all_ingress_firewall_id" {
  description = "The ID of the deny-all-ingress firewall rule (if enabled)"
  value       = var.create_default_deny_rule ? google_compute_firewall.deny_all_ingress[0].id : null
}

# Private Service Connection Outputs
output "private_service_connection_address" {
  description = "The IP address range allocated for private service connection"
  value       = var.enable_private_service_connection ? google_compute_global_address.private_service_connection[0].address : null
}

output "private_service_connection_prefix_length" {
  description = "The prefix length of the private service connection address range"
  value       = var.enable_private_service_connection ? google_compute_global_address.private_service_connection[0].prefix_length : null
}

output "private_service_connection_id" {
  description = "The ID of the service networking connection"
  value       = var.enable_private_service_connection ? google_service_networking_connection.private_service_connection[0].id : null
}

# DNS Policy Outputs
output "dns_policy_id" {
  description = "The ID of the DNS policy for Private Google Access (if enabled)"
  value       = var.enable_private_google_access_dns ? google_dns_policy.private_google_access[0].id : null
}

output "dns_policy_name" {
  description = "The name of the DNS policy for Private Google Access (if enabled)"
  value       = var.enable_private_google_access_dns ? google_dns_policy.private_google_access[0].name : null
}

# Useful Aggregated Outputs
output "subnet_map" {
  description = "Map of subnet names to their details"
  value = {
    public = {
      id           = google_compute_subnetwork.public.id
      name         = google_compute_subnetwork.public.name
      self_link    = google_compute_subnetwork.public.self_link
      cidr         = google_compute_subnetwork.public.ip_cidr_range
      gateway      = google_compute_subnetwork.public.gateway_address
      region       = google_compute_subnetwork.public.region
    }
    private = {
      id           = google_compute_subnetwork.private.id
      name         = google_compute_subnetwork.private.name
      self_link    = google_compute_subnetwork.private.self_link
      cidr         = google_compute_subnetwork.private.ip_cidr_range
      gateway      = google_compute_subnetwork.private.gateway_address
      region       = google_compute_subnetwork.private.region
    }
  }
}

output "gke_ranges" {
  description = "Map of GKE secondary IP ranges (if enabled)"
  value = var.enable_gke_secondary_ranges ? {
    public_pods     = var.public_pods_cidr
    public_services = var.public_services_cidr
    private_pods    = var.private_pods_cidr
    private_services = var.private_services_cidr
  } : null
}

output "firewall_rules" {
  description = "Map of created firewall rule IDs"
  value = {
    allow_internal      = google_compute_firewall.allow_internal.id
    allow_ssh           = var.enable_ssh_firewall ? google_compute_firewall.allow_ssh[0].id : null
    allow_http_https    = var.enable_http_https_firewall ? google_compute_firewall.allow_http_https[0].id : null
    deny_all_ingress    = var.create_default_deny_rule ? google_compute_firewall.deny_all_ingress[0].id : null
    deny_egress_sensitive = var.deny_egress_sensitive_ports ? google_compute_firewall.deny_egress_sensitive[0].id : null
  }
}

# Configuration Summary
output "vpc_configuration" {
  description = "Summary of VPC configuration for reference"
  value = {
    name                          = var.vpc_name
    project_id                    = var.project_id
    region                        = var.region
    routing_mode                  = var.routing_mode
    cloud_nat_enabled             = var.enable_cloud_nat
    private_google_access         = var.enable_private_google_access
    gke_secondary_ranges_enabled  = var.enable_gke_secondary_ranges
    private_service_connection    = var.enable_private_service_connection
    flow_logs_enabled             = true
    environment                   = var.environment
    owner                         = var.owner
    cost_center                   = var.cost_center
    data_classification           = var.data_classification
  }
}

# Labels Output
output "common_labels" {
  description = "Common labels applied to all resources"
  value       = local.common_labels
}
