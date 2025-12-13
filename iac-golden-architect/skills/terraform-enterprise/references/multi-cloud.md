# Multi-Cloud Terraform Patterns

## Overview

This guide covers provider configurations, authentication patterns, and best practices for managing infrastructure across AWS, Azure, and GCP with Terraform.

## Provider Configurations

### AWS Provider

#### Basic Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}
```

#### Complete Configuration

```hcl
provider "aws" {
  # Region
  region = var.aws_region

  # Authentication (multiple methods)
  # Method 1: Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  # Method 2: Shared credentials file
  shared_credentials_files = ["~/.aws/credentials"]
  profile                  = "default"

  # Method 3: IAM Role assumption
  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformRole"
    session_name = "terraform-session"
    external_id  = "unique-external-id"
  }

  # Method 4: Web Identity (OIDC for GitHub Actions, etc.)
  assume_role_with_web_identity {
    role_arn                = "arn:aws:iam::123456789012:role/GitHubActionsRole"
    session_name            = "github-actions"
    web_identity_token_file = "/var/run/secrets/eks.amazonaws.com/serviceaccount/token"
  }

  # Additional settings
  max_retries                   = 3
  skip_credentials_validation   = false
  skip_metadata_api_check       = false
  skip_requesting_account_id    = false
  skip_region_validation        = false

  # Custom endpoints (for testing or non-standard environments)
  endpoints {
    ec2 = "http://localhost:4566"  # LocalStack
    s3  = "http://localhost:4566"
  }

  # Default tags for all resources
  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
      Project     = var.project_name
    }
  }

  # Ignore specific tags
  ignore_tags {
    keys         = ["AutoTag", "aws:*"]
    key_prefixes = ["kubernetes.io/"]
  }
}
```

#### Multi-Region AWS

```hcl
# Primary region
provider "aws" {
  alias  = "primary"
  region = "us-west-2"
}

# Secondary region for DR
provider "aws" {
  alias  = "secondary"
  region = "us-east-1"
}

# Example usage
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "my-bucket-primary"
}

resource "aws_s3_bucket" "secondary" {
  provider = aws.secondary
  bucket   = "my-bucket-secondary"
}

# Cross-region replication
resource "aws_s3_bucket_replication_configuration" "replication" {
  provider = aws.primary

  bucket = aws_s3_bucket.primary.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.secondary.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

### Azure Provider

#### Basic Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

#### Complete Configuration

```hcl
provider "azurerm" {
  # Authentication methods
  # Method 1: Service Principal with Client Secret
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id

  # Method 2: Service Principal with Certificate
  # subscription_id            = var.subscription_id
  # client_id                  = var.client_id
  # client_certificate_path    = "/path/to/cert.pfx"
  # client_certificate_password = var.cert_password
  # tenant_id                  = var.tenant_id

  # Method 3: Managed Service Identity
  # use_msi = true
  # subscription_id = var.subscription_id
  # tenant_id       = var.tenant_id

  # Method 4: Azure CLI (for local development)
  # use_cli = true

  # Method 5: OIDC (GitHub Actions, etc.)
  # use_oidc = true
  # subscription_id = var.subscription_id
  # client_id       = var.client_id
  # tenant_id       = var.tenant_id

  # Environment (defaults to "public")
  environment = "public"  # or "usgovernment", "german", "china"

  # Additional settings
  skip_provider_registration = false
  storage_use_azuread        = true

  # Features block (required)
  features {
    # API Management
    api_management {
      purge_soft_delete_on_destroy = true
      recover_soft_deleted         = true
    }

    # App Configuration
    app_configuration {
      purge_soft_delete_on_destroy = true
      recover_soft_deleted         = true
    }

    # Key Vault
    key_vault {
      purge_soft_delete_on_destroy               = true
      recover_soft_deleted_key_vaults            = true
      purge_soft_deleted_certificates_on_destroy = true
      purge_soft_deleted_keys_on_destroy         = true
      purge_soft_deleted_secrets_on_destroy      = true
    }

    # Log Analytics
    log_analytics_workspace {
      permanently_delete_on_destroy = true
    }

    # Resource Group
    resource_group {
      prevent_deletion_if_contains_resources = true
    }

    # Virtual Machine
    virtual_machine {
      delete_os_disk_on_deletion     = true
      graceful_shutdown              = false
      skip_shutdown_and_force_delete = false
    }

    # Virtual Machine Scale Set
    virtual_machine_scale_set {
      force_delete                  = false
      roll_instances_when_required  = true
      scale_to_zero_before_deletion = true
    }
  }
}
```

#### Multi-Subscription Azure

```hcl
# Primary subscription
provider "azurerm" {
  alias           = "primary"
  subscription_id = var.primary_subscription_id
  features {}
}

# Secondary subscription
provider "azurerm" {
  alias           = "secondary"
  subscription_id = var.secondary_subscription_id
  features {}
}

# Example usage
resource "azurerm_resource_group" "primary" {
  provider = azurerm.primary
  name     = "rg-primary"
  location = "West US 2"
}

resource "azurerm_resource_group" "secondary" {
  provider = azurerm.secondary
  name     = "rg-secondary"
  location = "East US"
}
```

### GCP Provider

#### Basic Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "my-project-id"
  region  = "us-central1"
}
```

#### Complete Configuration

```hcl
provider "google" {
  # Project and location
  project = var.project_id
  region  = var.region
  zone    = var.zone

  # Authentication methods
  # Method 1: Service Account Key File
  credentials = file("path/to/service-account-key.json")

  # Method 2: Environment variable (GOOGLE_APPLICATION_CREDENTIALS)
  # credentials = file(var.gcp_credentials_file)

  # Method 3: Application Default Credentials (for Cloud Shell, GCE, etc.)
  # (No credentials block needed)

  # Service account impersonation
  impersonate_service_account = "terraform@my-project.iam.gserviceaccount.com"

  # Impersonation delegation chain
  impersonate_service_account_delegates = [
    "delegated-sa@my-project.iam.gserviceaccount.com"
  ]

  # Additional settings
  request_timeout = "60s"
  request_reason  = "Terraform provisioning"

  # User project override for billing
  user_project_override = true
  billing_project       = var.billing_project_id

  # Scopes for authentication
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
  ]

  # Batching settings
  batching {
    enable_batching = true
    send_after      = "10s"
  }
}

# Google Beta provider for beta features
provider "google-beta" {
  project     = var.project_id
  region      = var.region
  credentials = file("path/to/service-account-key.json")
}
```

#### Multi-Project GCP

```hcl
# Primary project
provider "google" {
  alias   = "primary"
  project = var.primary_project_id
  region  = "us-central1"
}

# Secondary project
provider "google" {
  alias   = "secondary"
  project = var.secondary_project_id
  region  = "us-east1"
}

# Example usage
resource "google_compute_network" "primary" {
  provider                = google.primary
  name                    = "vpc-primary"
  auto_create_subnetworks = false
}

resource "google_compute_network" "secondary" {
  provider                = google.secondary
  name                    = "vpc-secondary"
  auto_create_subnetworks = false
}

# VPC peering between projects
resource "google_compute_network_peering" "primary_to_secondary" {
  provider     = google.primary
  name         = "peer-primary-to-secondary"
  network      = google_compute_network.primary.self_link
  peer_network = google_compute_network.secondary.self_link
}

resource "google_compute_network_peering" "secondary_to_primary" {
  provider     = google.secondary
  name         = "peer-secondary-to-primary"
  network      = google_compute_network.secondary.self_link
  peer_network = google_compute_network.primary.self_link
}
```

## Authentication Best Practices

### Environment Variables

```bash
# AWS
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-west-2"

# Azure
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."

# GCP
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/keyfile.json"
export GOOGLE_PROJECT="my-project-id"
export GOOGLE_REGION="us-central1"
```

### Vault Dynamic Credentials

```hcl
# Use Vault for dynamic AWS credentials
data "vault_aws_access_credentials" "creds" {
  backend = "aws"
  role    = "terraform-role"
}

provider "aws" {
  region     = var.aws_region
  access_key = data.vault_aws_access_credentials.creds.access_key
  secret_key = data.vault_aws_access_credentials.creds.secret_key
}

# Use Vault for dynamic Azure credentials
data "vault_azure_access_credentials" "creds" {
  backend = "azure"
  role    = "terraform-role"
}

provider "azurerm" {
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  client_id       = data.vault_azure_access_credentials.creds.client_id
  client_secret   = data.vault_azure_access_credentials.creds.client_secret

  features {}
}

# Use Vault for dynamic GCP credentials
data "vault_gcp_credentials" "creds" {
  backend = "gcp"
  roleset = "terraform-roleset"
}

provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = data.vault_gcp_credentials.creds.key
}
```

### OIDC Authentication (GitHub Actions)

```hcl
# AWS OIDC
provider "aws" {
  region = var.aws_region

  assume_role_with_web_identity {
    role_arn                = var.aws_role_arn
    session_name            = "github-actions-${var.github_run_id}"
    web_identity_token_file = var.github_token_file
  }
}

# Azure OIDC
provider "azurerm" {
  use_oidc        = true
  subscription_id = var.subscription_id
  client_id       = var.client_id
  tenant_id       = var.tenant_id

  features {}
}

# GCP Workload Identity
provider "google" {
  project = var.project_id
  region  = var.region

  # Automatically uses Workload Identity when running in GKE
  # Or use service account impersonation
  impersonate_service_account = var.terraform_sa_email
}
```

## Cross-Cloud Patterns

### Unified Networking

```hcl
# AWS VPC
resource "aws_vpc" "main" {
  provider             = aws
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name  = "multi-cloud-vpc"
    Cloud = "AWS"
  }
}

# Azure VNet
resource "azurerm_virtual_network" "main" {
  provider            = azurerm
  name                = "multi-cloud-vnet"
  address_space       = ["10.1.0.0/16"]
  location            = "West US 2"
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Cloud = "Azure"
  }
}

# GCP VPC
resource "google_compute_network" "main" {
  provider                = google
  name                    = "multi-cloud-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  provider      = google
  name          = "multi-cloud-subnet"
  ip_cidr_range = "10.2.0.0/16"
  region        = "us-central1"
  network       = google_compute_network.main.id
}

# VPN connections between clouds
# AWS to Azure VPN
resource "aws_vpn_gateway" "to_azure" {
  provider = aws
  vpc_id   = aws_vpc.main.id
}

resource "azurerm_virtual_network_gateway" "to_aws" {
  provider            = azurerm
  name                = "vpn-to-aws"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"

  sku = "VpnGw1"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn_gw.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }
}
```

### Centralized DNS

```hcl
# AWS Route53 as central DNS
resource "aws_route53_zone" "main" {
  provider = aws
  name     = "example.com"
}

# Azure DNS Zone (delegated subdomain)
resource "azurerm_dns_zone" "azure_subdomain" {
  provider            = azurerm
  name                = "azure.example.com"
  resource_group_name = azurerm_resource_group.main.name
}

# Delegate Azure subdomain in Route53
resource "aws_route53_record" "azure_delegation" {
  provider = aws
  zone_id  = aws_route53_zone.main.zone_id
  name     = "azure.example.com"
  type     = "NS"
  ttl      = 300
  records  = azurerm_dns_zone.azure_subdomain.name_servers
}

# GCP Cloud DNS (delegated subdomain)
resource "google_dns_managed_zone" "gcp_subdomain" {
  provider    = google
  name        = "gcp-subdomain"
  dns_name    = "gcp.example.com."
  description = "GCP subdomain zone"
}

# Delegate GCP subdomain in Route53
resource "aws_route53_record" "gcp_delegation" {
  provider = aws
  zone_id  = aws_route53_zone.main.zone_id
  name     = "gcp.example.com"
  type     = "NS"
  ttl      = 300
  records  = google_dns_managed_zone.gcp_subdomain.name_servers
}
```

### Load Balancer Abstractions

```hcl
# Abstract load balancer module
module "aws_lb" {
  source = "./modules/load-balancer"

  cloud      = "aws"
  name       = "api-gateway"
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  providers = {
    aws = aws
  }
}

module "azure_lb" {
  source = "./modules/load-balancer"

  cloud               = "azure"
  name                = "api-gateway"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  providers = {
    azurerm = azurerm
  }
}

module "gcp_lb" {
  source = "./modules/load-balancer"

  cloud   = "gcp"
  name    = "api-gateway"
  project = var.project_id
  region  = var.region

  providers = {
    google = google
  }
}
```

## Multi-Cloud Module Pattern

```hcl
# modules/compute/variables.tf
variable "cloud_provider" {
  description = "Cloud provider (aws, azure, gcp)"
  type        = string
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "Must be aws, azure, or gcp"
  }
}

variable "instance_config" {
  description = "Instance configuration"
  type = object({
    name          = string
    instance_type = string
    image_id      = string
    subnet_id     = string
  })
}

# modules/compute/main.tf
# AWS EC2
resource "aws_instance" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  ami           = var.instance_config.image_id
  instance_type = var.instance_config.instance_type
  subnet_id     = var.instance_config.subnet_id

  tags = {
    Name = var.instance_config.name
  }
}

# Azure VM
resource "azurerm_linux_virtual_machine" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = var.instance_config.name
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = var.instance_config.instance_type

  network_interface_ids = [azurerm_network_interface.main[0].id]

  source_image_id = var.instance_config.image_id

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }
}

# GCP Compute Instance
resource "google_compute_instance" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name         = var.instance_config.name
  machine_type = var.instance_config.instance_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = var.instance_config.image_id
    }
  }

  network_interface {
    subnetwork = var.instance_config.subnet_id
  }
}

# Output abstraction
output "instance_id" {
  value = (
    var.cloud_provider == "aws" ? aws_instance.main[0].id :
    var.cloud_provider == "azure" ? azurerm_linux_virtual_machine.main[0].id :
    google_compute_instance.main[0].id
  )
}
```

## State Management for Multi-Cloud

### Separate Backends per Cloud

```hcl
# aws/backend.tf
terraform {
  backend "s3" {
    bucket         = "terraform-state-aws"
    key            = "aws/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# azure/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstateazure"
    container_name       = "tfstate"
    key                  = "azure.terraform.tfstate"
  }
}

# gcp/backend.tf
terraform {
  backend "gcs" {
    bucket = "terraform-state-gcp"
    prefix = "gcp"
  }
}
```

### Unified Terraform Cloud Backend

```hcl
# All clouds in one workspace
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "multi-cloud-infrastructure"
    }
  }
}

# Or separate workspaces per cloud
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      tags = ["cloud:${var.cloud_provider}", "environment:${var.environment}"]
    }
  }
}
```

## Cost Optimization Across Clouds

```hcl
# Cost tagging standards
locals {
  cost_tags = {
    CostCenter  = var.cost_center
    Application = var.application_name
    Environment = var.environment
    Cloud       = var.cloud_provider
    Team        = var.team_name
  }
}

# AWS tags
resource "aws_instance" "main" {
  # ... configuration ...
  tags = merge(local.cost_tags, {
    Name = "app-server"
  })
}

# Azure tags
resource "azurerm_linux_virtual_machine" "main" {
  # ... configuration ...
  tags = local.cost_tags
}

# GCP labels
resource "google_compute_instance" "main" {
  # ... configuration ...
  labels = {
    for k, v in local.cost_tags :
    lower(replace(k, " ", "-")) => lower(replace(v, " ", "-"))
  }
}
```

## Security Considerations

1. **Separate credentials per environment**
2. **Use OIDC/Workload Identity when possible**
3. **Implement least-privilege IAM policies**
4. **Enable audit logging on all providers**
5. **Encrypt state backends**
6. **Use separate state files per cloud/environment**
7. **Implement policy-as-code validation**
8. **Regular credential rotation**
9. **Use Vault for dynamic credentials**
10. **Network segmentation between clouds**

## Monitoring and Observability

```hcl
# Unified monitoring with Datadog/New Relic
resource "datadog_monitor" "aws_health" {
  name    = "AWS Infrastructure Health"
  type    = "metric alert"
  message = "AWS infrastructure issues detected"
  query   = "avg(last_5m):aws.ec2.status_check_failed{*} > 0"

  tags = ["cloud:aws", "severity:critical"]
}

resource "datadog_monitor" "azure_health" {
  name    = "Azure Infrastructure Health"
  type    = "metric alert"
  message = "Azure infrastructure issues detected"
  query   = "avg(last_5m):azure.vm.available{*} < 1"

  tags = ["cloud:azure", "severity:critical"]
}

resource "datadog_monitor" "gcp_health" {
  name    = "GCP Infrastructure Health"
  type    = "metric alert"
  message = "GCP infrastructure issues detected"
  query   = "avg(last_5m):gcp.compute.instance.up{*} < 1"

  tags = ["cloud:gcp", "severity:critical"]
}
```

## Best Practices

1. **Provider Version Pinning**: Always pin provider versions
2. **Separate State Files**: Use different backends per cloud
3. **Consistent Naming**: Establish naming conventions across clouds
4. **Tagging Strategy**: Implement unified tagging/labeling
5. **Network Design**: Plan IP ranges to avoid conflicts
6. **Authentication**: Use cloud-native identity federation
7. **Monitoring**: Implement cross-cloud observability
8. **Cost Management**: Tag all resources for cost tracking
9. **Documentation**: Document cloud-specific patterns
10. **Testing**: Test modules across all supported clouds
