# Reusable Tagging Module
# This module provides enterprise-grade tagging with validation and consistency enforcement

terraform {
  required_version = ">= 1.6.0"
}

#------------------------------------------------------------------------------
# Input Variables
#------------------------------------------------------------------------------

# Required base tags
variable "environment" {
  description = "Environment name (dev, staging, prod, sandbox)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod", "sandbox", "dr"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, sandbox, dr."
  }
}

variable "owner" {
  description = "Team or individual owner (email address)"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.owner)) || can(regex("^[a-z0-9-]+team$", var.owner))
    error_message = "Owner must be a valid email address or team name ending in 'team'."
  }
}

variable "application" {
  description = "Application or service name"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.application))
    error_message = "Application must be lowercase alphanumeric with hyphens only."
  }
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string

  validation {
    condition     = contains(["engineering", "product", "marketing", "sales", "it-ops", "data", "security"], var.cost_center)
    error_message = "Cost center must be one of: engineering, product, marketing, sales, it-ops, data, security."
  }
}

# Optional technical tags
variable "component" {
  description = "Technical component type"
  type        = string
  default     = ""

  validation {
    condition     = var.component == "" || contains(["compute", "database", "storage", "network", "security", "monitoring"], var.component)
    error_message = "Component must be one of: compute, database, storage, network, security, monitoring."
  }
}

variable "data_classification" {
  description = "Data classification level"
  type        = string
  default     = "internal"

  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be one of: public, internal, confidential, restricted."
  }
}

# Optional compliance tags
variable "soc2_control" {
  description = "SOC2 Trust Service Criteria control reference"
  type        = string
  default     = null

  validation {
    condition     = var.soc2_control == null || can(regex("^(CC|A|C|P|PI)[0-9]+(\\.[0-9]+)?$", var.soc2_control))
    error_message = "SOC2 control must match format: CC6.1, A1.2, etc."
  }
}

variable "compliance_frameworks" {
  description = "List of compliance frameworks"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for framework in var.compliance_frameworks :
      contains(["soc2", "hipaa", "pci-dss", "gdpr", "iso27001"], framework)
    ])
    error_message = "Compliance frameworks must be from: soc2, hipaa, pci-dss, gdpr, iso27001."
  }
}

# Optional operational tags
variable "backup_policy" {
  description = "Backup policy/schedule"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "hourly", "daily", "weekly", "monthly"], var.backup_policy)
    error_message = "Backup policy must be one of: none, hourly, daily, weekly, monthly."
  }
}

variable "monitoring_level" {
  description = "Monitoring intensity level"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["minimal", "standard", "critical"], var.monitoring_level)
    error_message = "Monitoring level must be one of: minimal, standard, critical."
  }
}

variable "disaster_recovery_tier" {
  description = "Disaster recovery tier (lower number = higher priority)"
  type        = string
  default     = null

  validation {
    condition     = var.disaster_recovery_tier == null || contains(["tier1", "tier2", "tier3"], var.disaster_recovery_tier)
    error_message = "DR tier must be one of: tier1, tier2, tier3."
  }
}

variable "scheduled_shutdown" {
  description = "Auto-shutdown schedule for cost optimization"
  type        = string
  default     = "never"

  validation {
    condition     = contains(["never", "weeknights", "weekends", "non-business-hours"], var.scheduled_shutdown)
    error_message = "Scheduled shutdown must be one of: never, weeknights, weekends, non-business-hours."
  }
}

# Optional financial tags
variable "project" {
  description = "Project or initiative name"
  type        = string
  default     = null
}

variable "budget_code" {
  description = "Budget or billing code"
  type        = string
  default     = null
}

# Additional custom tags
variable "custom_tags" {
  description = "Additional custom tags to merge"
  type        = map(string)
  default     = {}
}

#------------------------------------------------------------------------------
# Local Tag Construction
#------------------------------------------------------------------------------

locals {
  # Timestamp for created date (evaluated once per apply)
  created_date = formatdate("YYYY-MM-DD", timestamp())

  # Core required tags
  core_tags = {
    Environment = var.environment
    Owner       = var.owner
    Application = var.application
    CostCenter  = var.cost_center
    ManagedBy   = "terraform"
    CreatedDate = local.created_date
  }

  # Technical tags (only include if specified)
  technical_tags = merge(
    var.component != "" ? { Component = var.component } : {},
    { DataClassification = var.data_classification }
  )

  # Compliance tags (only include if specified)
  compliance_tags = merge(
    var.soc2_control != null ? { SOC2_Control = var.soc2_control } : {},
    length(var.compliance_frameworks) > 0 ? { Compliance = join(",", var.compliance_frameworks) } : {}
  )

  # Operational tags
  operational_tags = merge(
    { Monitoring = var.monitoring_level },
    var.backup_policy != "none" ? { BackupPolicy = var.backup_policy } : {},
    var.disaster_recovery_tier != null ? { DisasterRecoveryTier = var.disaster_recovery_tier } : {},
    var.scheduled_shutdown != "never" ? { ScheduledShutdown = var.scheduled_shutdown } : {}
  )

  # Financial tags (only include if specified)
  financial_tags = merge(
    var.project != null ? { Project = var.project } : {},
    var.budget_code != null ? { BudgetCode = var.budget_code } : {}
  )

  # Combine all tags
  all_tags = merge(
    local.core_tags,
    local.technical_tags,
    local.compliance_tags,
    local.operational_tags,
    local.financial_tags,
    var.custom_tags
  )

  # Cost allocation tags (subset for cost reporting)
  cost_allocation_tags = {
    Environment = var.environment
    Application = var.application
    CostCenter  = var.cost_center
    Owner       = var.owner
  }

  # Security tags (subset for security analysis)
  security_tags = merge(
    { DataClassification = var.data_classification },
    var.soc2_control != null ? { SOC2_Control = var.soc2_control } : {},
    length(var.compliance_frameworks) > 0 ? { Compliance = join(",", var.compliance_frameworks) } : {}
  )

  # Automation tags (for automated tooling)
  automation_tags = merge(
    { Environment = var.environment },
    var.scheduled_shutdown != "never" ? { ScheduledShutdown = var.scheduled_shutdown } : {},
    var.backup_policy != "none" ? { BackupPolicy = var.backup_policy } : {}
  )
}

#------------------------------------------------------------------------------
# Outputs
#------------------------------------------------------------------------------

output "tags" {
  description = "Complete tag set for resource tagging"
  value       = local.all_tags
}

output "cost_allocation_tags" {
  description = "Tags specifically for cost allocation"
  value       = local.cost_allocation_tags
}

output "security_tags" {
  description = "Tags specifically for security classification"
  value       = local.security_tags
}

output "automation_tags" {
  description = "Tags used by automation tools"
  value       = local.automation_tags
}

output "tag_summary" {
  description = "Summary of tag configuration"
  value = {
    environment          = var.environment
    application          = var.application
    cost_center          = var.cost_center
    data_classification  = var.data_classification
    compliance_required  = length(var.compliance_frameworks) > 0
    backup_enabled       = var.backup_policy != "none"
    monitoring_level     = var.monitoring_level
    total_tags           = length(local.all_tags)
  }
}

#------------------------------------------------------------------------------
# Validation Outputs (for testing)
#------------------------------------------------------------------------------

output "validation" {
  description = "Tag validation status"
  value = {
    has_required_tags = alltrue([
      contains(keys(local.all_tags), "Environment"),
      contains(keys(local.all_tags), "Owner"),
      contains(keys(local.all_tags), "Application"),
      contains(keys(local.all_tags), "CostCenter"),
      contains(keys(local.all_tags), "ManagedBy")
    ])

    environment_valid = contains(["dev", "staging", "prod", "sandbox", "dr"], var.environment)

    data_classification_valid = contains(["public", "internal", "confidential", "restricted"], var.data_classification)

    cost_center_valid = contains(["engineering", "product", "marketing", "sales", "it-ops", "data", "security"], var.cost_center)
  }
}

#------------------------------------------------------------------------------
# Usage Examples (in comments)
#------------------------------------------------------------------------------

/*
# Example 1: Basic usage with required tags only
module "basic_tags" {
  source = "./modules/tagging"

  environment = "prod"
  owner       = "platform-team"
  application = "customer-api"
  cost_center = "engineering"
}

resource "aws_s3_bucket" "example" {
  bucket = "example-bucket"
  tags   = module.basic_tags.tags
}

# Example 2: Database with SOC2 compliance
module "database_tags" {
  source = "./modules/tagging"

  environment         = "prod"
  owner               = "data-team"
  application         = "customer-data"
  cost_center         = "engineering"
  component           = "database"
  data_classification = "confidential"
  soc2_control        = "CC6.1"
  compliance_frameworks = ["soc2", "gdpr"]
  backup_policy       = "daily"
  monitoring_level    = "critical"
}

resource "aws_db_instance" "main" {
  identifier = "main-db"
  tags       = module.database_tags.tags
}

# Example 3: Development resources with auto-shutdown
module "dev_compute_tags" {
  source = "./modules/tagging"

  environment        = "dev"
  owner              = "john.doe@company.com"
  application        = "test-app"
  cost_center        = "engineering"
  component          = "compute"
  scheduled_shutdown = "weeknights"
  monitoring_level   = "minimal"
  project            = "migration-2024"
}

resource "aws_instance" "dev" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  tags          = module.dev_compute_tags.tags
}

# Example 4: Production with custom tags
module "prod_tags" {
  source = "./modules/tagging"

  environment         = "prod"
  owner               = "platform-team"
  application         = "payment-api"
  cost_center         = "engineering"
  component           = "compute"
  data_classification = "restricted"
  soc2_control        = "CC7.1"
  compliance_frameworks = ["soc2", "pci-dss"]
  monitoring_level    = "critical"
  disaster_recovery_tier = "tier1"
  backup_policy       = "hourly"

  custom_tags = {
    Version     = "v2.1.0"
    Contact     = "platform-oncall@company.com"
    SecurityZone = "dmz"
  }
}

resource "aws_ecs_service" "payment" {
  name = "payment-service"
  tags = module.prod_tags.tags
}

# Example 5: Using cost allocation tags for budgeting
module "app_tags" {
  source = "./modules/tagging"

  environment = "prod"
  owner       = "product-team"
  application = "web-portal"
  cost_center = "product"
  budget_code = "FY24-Q4-001"
}

resource "aws_budgets_budget" "app_budget" {
  name         = "web-portal-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      for k, v in module.app_tags.cost_allocation_tags :
      "${k}$${v}"
    ]
  }
}

# Example 6: Multi-environment deployment
locals {
  environments = ["dev", "staging", "prod"]
}

module "env_tags" {
  for_each = toset(local.environments)
  source   = "./modules/tagging"

  environment = each.key
  owner       = "platform-team"
  application = "multi-env-app"
  cost_center = "engineering"
  component   = "compute"
}

resource "aws_instance" "multi_env" {
  for_each = module.env_tags

  ami           = var.ami_id
  instance_type = each.key == "prod" ? "t3.large" : "t3.micro"
  tags          = each.value.tags
}
*/
