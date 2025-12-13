#!/bin/bash

################################################################################
# Azure Infrastructure Import Script using Terraformer
#
# This script imports existing Azure infrastructure into Terraform using
# Terraformer. It demonstrates resource group-based import strategies.
#
# Usage:
#   ./azure-import.sh [OPTIONS]
#
# Options:
#   -s, --subscription <id>    Azure subscription ID or name
#   -g, --resource-group <rg>  Resource group name (required)
#   -r, --resources <list>     Comma-separated resource types (default: all)
#   -o, --output <path>        Output directory (default: generated/azure)
#   -d, --dry-run              Preview without importing
#   -a, --all-groups           Import from all resource groups
#   -h, --help                 Show this help message
#
# Examples:
#   # Import specific resource group
#   ./azure-import.sh -s "Production" -g "production-rg"
#
#   # Import VNets and VMs only
#   ./azure-import.sh -s "Production" -g "network-rg" -r virtual_network,virtual_machine
#
#   # Import from all resource groups
#   ./azure-import.sh -s "Production" --all-groups
#
################################################################################

set -e
set -o pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
SUBSCRIPTION=""
RESOURCE_GROUP=""
RESOURCES="*"
OUTPUT_DIR="generated/azure"
DRY_RUN=false
ALL_GROUPS=false

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show help
show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--subscription)
            SUBSCRIPTION="$2"
            shift 2
            ;;
        -g|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -r|--resources)
            RESOURCES="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -a|--all-groups)
            ALL_GROUPS=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check terraformer
    if ! command -v terraformer &> /dev/null; then
        print_error "terraformer not found"
        print_info "Installation: brew install terraformer"
        exit 1
    fi

    # Check terraform
    if ! command -v terraform &> /dev/null; then
        print_error "terraform not found"
        print_info "Installation: brew install terraform"
        exit 1
    fi

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not found"
        print_info "Installation: brew install azure-cli"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Verify Azure authentication
verify_azure_auth() {
    print_info "Verifying Azure authentication..."

    if ! az account show &> /dev/null; then
        print_error "Not authenticated with Azure"
        print_info "Please login: az login"
        exit 1
    fi

    # Set subscription if provided
    if [[ -n "$SUBSCRIPTION" ]]; then
        print_info "Setting subscription: $SUBSCRIPTION"
        az account set --subscription "$SUBSCRIPTION"
    fi

    CURRENT_SUB=$(az account show --query name -o tsv)
    CURRENT_SUB_ID=$(az account show --query id -o tsv)
    TENANT_ID=$(az account show --query tenantId -o tsv)

    print_success "Authenticated to Azure"
    print_info "Subscription: $CURRENT_SUB ($CURRENT_SUB_ID)"
    print_info "Tenant ID: $TENANT_ID"
}

# Get all resource groups
get_resource_groups() {
    print_info "Retrieving resource groups..."

    RESOURCE_GROUPS=$(az group list --query "[].name" -o tsv)

    if [[ -z "$RESOURCE_GROUPS" ]]; then
        print_error "No resource groups found in subscription"
        exit 1
    fi

    print_success "Found resource groups:"
    echo "$RESOURCE_GROUPS" | while read -r rg; do
        echo "  - $rg"
    done
}

# Setup output directory
setup_output_directory() {
    print_info "Setting up output directory: $OUTPUT_DIR"

    if [[ -d "$OUTPUT_DIR" ]]; then
        print_warning "Output directory exists. Contents may be overwritten."
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi

    mkdir -p "$OUTPUT_DIR"
    print_success "Output directory ready"
}

# List available resources for Azure
list_azure_resources() {
    print_info "Available Azure resource types:"
    terraformer import azure list
}

# Import from single resource group
import_resource_group() {
    local rg=$1

    print_info "Importing from resource group: $rg"
    print_info "Resources: $RESOURCES"

    # Verify resource group exists
    if ! az group show --name "$rg" &> /dev/null; then
        print_error "Resource group not found: $rg"
        return 1
    fi

    # Get resource group location
    LOCATION=$(az group show --name "$rg" --query location -o tsv)
    print_info "Location: $LOCATION"

    # Run import
    terraformer import azure \
        --resources="$RESOURCES" \
        --resource-group="$rg" \
        --compact \
        --path-pattern="$OUTPUT_DIR/{resource-group}/{service}" \
        --verbose || {
            print_error "Import failed for resource group: $rg"
            return 1
        }

    print_success "Import complete for resource group: $rg"
}

# Import from all resource groups
import_all_resource_groups() {
    print_info "Importing from all resource groups..."

    get_resource_groups

    echo "$RESOURCE_GROUPS" | while read -r rg; do
        if [[ -n "$rg" ]]; then
            import_resource_group "$rg"
        fi
    done
}

# Run dry run
run_dry_run() {
    print_info "Running dry run..."

    if [[ "$ALL_GROUPS" == true ]]; then
        get_resource_groups
        echo "$RESOURCE_GROUPS" | while read -r rg; do
            if [[ -n "$rg" ]]; then
                print_info "Would import from: $rg"
                # List resources in RG
                az resource list --resource-group "$rg" --query "[].{Type:type, Name:name}" -o table
            fi
        done
    else
        print_info "Would import from: $RESOURCE_GROUP"
        az resource list --resource-group "$RESOURCE_GROUP" --query "[].{Type:type, Name:name}" -o table
    fi

    print_success "Dry run complete"
}

# Validate imported Terraform
validate_terraform() {
    local rg=$1

    print_info "Validating Terraform code for: $rg"

    find "$OUTPUT_DIR/$rg" -name "*.tf" -type f | while read -r tf_file; do
        dir=$(dirname "$tf_file")

        if [[ -d "$dir/.terraform" ]]; then
            continue
        fi

        cd "$dir" || continue

        print_info "Validating: $dir"

        if ! terraform init -backend=false &> /dev/null; then
            print_warning "Failed to initialize: $dir"
            cd - &> /dev/null
            continue
        fi

        if terraform validate &> /dev/null; then
            print_success "Valid: $dir"
        else
            print_warning "Validation warnings in: $dir"
        fi

        cd - &> /dev/null
    done
}

# Generate report
generate_report() {
    print_info "Generating import summary report..."

    REPORT_FILE="$OUTPUT_DIR/import-report.txt"

    cat > "$REPORT_FILE" <<EOF
================================================================================
Azure Infrastructure Import Report
================================================================================

Import Date: $(date)
Subscription: $(az account show --query name -o tsv)
Subscription ID: $(az account show --query id -o tsv)
Resource Groups: $(if [[ "$ALL_GROUPS" == true ]]; then echo "All"; else echo "$RESOURCE_GROUP"; fi)
Resources: $RESOURCES

================================================================================
Imported Resources by Resource Group
================================================================================

EOF

    # Count resources per RG
    for rg_dir in "$OUTPUT_DIR"/*; do
        if [[ -d "$rg_dir" ]]; then
            rg=$(basename "$rg_dir")
            echo "Resource Group: $rg" >> "$REPORT_FILE"
            echo "-----------------------------------" >> "$REPORT_FILE"

            find "$rg_dir" -name "*.tf" -type f | while read -r tf_file; do
                service=$(basename "$(dirname "$tf_file")")
                resource_count=$(grep -c "^resource " "$tf_file" 2>/dev/null || echo 0)
                echo "  $service: $resource_count resources" >> "$REPORT_FILE"
            done

            echo "" >> "$REPORT_FILE"
        fi
    done

    cat >> "$REPORT_FILE" <<EOF
================================================================================
Azure-Specific Considerations
================================================================================

1. Resource Dependencies:
   - Resource groups must exist before resources
   - Virtual networks before subnets
   - Storage accounts before containers

2. Naming Conventions:
   - Azure has strict naming rules per resource type
   - Some resources require globally unique names
   - Review generated names for compliance

3. Managed Identities:
   - System-assigned identities are resource-specific
   - User-assigned identities are separate resources
   - Verify identity configurations

4. Tags and Metadata:
   - Azure supports tags on most resources
   - Tags are key-value pairs (unlike AWS)
   - Maximum 50 tags per resource

5. RBAC and Permissions:
   - Role assignments are separate resources
   - Import may require elevated permissions
   - Review and validate access controls

================================================================================
Next Steps
================================================================================

1. Review generated code in: $OUTPUT_DIR
2. Set up remote state (Azure Storage Account)
3. Run terraform plan to verify no drift
4. Refactor code into modules
5. Add input validation
6. Set up CI/CD pipeline
7. Document architecture

================================================================================
EOF

    print_success "Report generated: $REPORT_FILE"
    echo ""
    cat "$REPORT_FILE"
}

# Post-import guidance
post_import_guidance() {
    cat <<EOF

${GREEN}================================================================================
Import Complete!
================================================================================${NC}

${BLUE}Generated files location:${NC}
  $OUTPUT_DIR

${BLUE}Azure-specific next steps:${NC}

  1. Set up remote state with Azure Storage:
     ${YELLOW}# Create storage account and container
     az storage account create --name tfstate\\
       --resource-group terraform-state-rg \\
       --location eastus --sku Standard_LRS

     az storage container create --name tfstate \\
       --account-name tfstate${NC}

  2. Configure backend:
     ${YELLOW}cat > backend.tf <<EOF
     terraform {
       backend "azurerm" {
         resource_group_name  = "terraform-state-rg"
         storage_account_name = "tfstate"
         container_name       = "tfstate"
         key                  = "terraform.tfstate"
       }
     }
     EOF${NC}

  3. Initialize with backend:
     ${YELLOW}terraform init${NC}

  4. Verify no drift:
     ${YELLOW}terraform plan${NC}

${BLUE}Useful Azure CLI commands:${NC}

  # List all resources in RG
  ${YELLOW}az resource list --resource-group <rg-name> -o table${NC}

  # Show resource details
  ${YELLOW}az resource show --ids <resource-id>${NC}

  # List locations
  ${YELLOW}az account list-locations -o table${NC}

  # Export resource group template
  ${YELLOW}az group export --name <rg-name>${NC}

${BLUE}Documentation:${NC}
  - Terraformer: https://github.com/GoogleCloudPlatform/terraformer
  - Azure Provider: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
  - Azure CLI: https://docs.microsoft.com/en-us/cli/azure/

EOF
}

# Main execution
main() {
    echo ""
    print_info "Azure Infrastructure Import - Starting"
    echo ""

    # Validate inputs
    if [[ "$ALL_GROUPS" == false && -z "$RESOURCE_GROUP" ]]; then
        print_error "Resource group required (use -g or --all-groups)"
        show_help
    fi

    # Check prerequisites
    check_prerequisites

    # Verify Azure auth
    verify_azure_auth

    # Setup output directory
    setup_output_directory

    # Execute import
    if [[ "$DRY_RUN" == true ]]; then
        run_dry_run
    else
        if [[ "$ALL_GROUPS" == true ]]; then
            import_all_resource_groups
        else
            import_resource_group "$RESOURCE_GROUP"
            validate_terraform "$RESOURCE_GROUP"
        fi

        # Generate report
        generate_report

        # Show guidance
        post_import_guidance
    fi

    print_success "All operations completed successfully"
    echo ""
}

# Run main
main
