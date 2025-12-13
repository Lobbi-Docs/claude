#!/bin/bash

################################################################################
# GCP Infrastructure Import Script using Terraformer
#
# This script imports existing Google Cloud Platform infrastructure into
# Terraform using Terraformer. It demonstrates project-based import strategies.
#
# Usage:
#   ./gcp-import.sh [OPTIONS]
#
# Options:
#   -p, --project <id>         GCP project ID (required)
#   -r, --regions <regions>    Comma-separated regions (default: us-central1)
#   -z, --zones <zones>        Comma-separated zones (optional)
#   -s, --services <services>  Comma-separated service list (default: all)
#   -o, --output <path>        Output directory (default: generated/gcp)
#   -d, --dry-run              Preview without importing
#   -h, --help                 Show this help message
#
# Examples:
#   # Import VPC and instances from project
#   ./gcp-import.sh -p my-project-id -r us-central1 -s networks,instances
#
#   # Import from multiple regions
#   ./gcp-import.sh -p my-project-id -r us-central1,europe-west1
#
#   # Import with specific zones
#   ./gcp-import.sh -p my-project-id -r us-central1 -z us-central1-a,us-central1-b
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
PROJECT_ID=""
REGIONS="us-central1"
ZONES=""
SERVICES="networks,subnetworks,firewalls,instances,gke,gcs,cloudsql"
OUTPUT_DIR="generated/gcp"
DRY_RUN=false

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
        -p|--project)
            PROJECT_ID="$2"
            shift 2
            ;;
        -r|--regions)
            REGIONS="$2"
            shift 2
            ;;
        -z|--zones)
            ZONES="$2"
            shift 2
            ;;
        -s|--services)
            SERVICES="$2"
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
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Validate required parameters
if [[ -z "$PROJECT_ID" ]]; then
    print_error "Project ID is required (-p or --project)"
    show_help
fi

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

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found"
        print_info "Installation: brew install google-cloud-sdk"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Verify GCP authentication
verify_gcp_auth() {
    print_info "Verifying GCP authentication..."

    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        print_error "Not authenticated with GCP"
        print_info "Please login: gcloud auth login"
        print_info "Also run: gcloud auth application-default login"
        exit 1
    fi

    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    print_success "Authenticated as: $ACTIVE_ACCOUNT"

    # Set project
    print_info "Setting project: $PROJECT_ID"
    gcloud config set project "$PROJECT_ID"

    # Verify project exists
    if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
        print_error "Project not found: $PROJECT_ID"
        print_info "Available projects:"
        gcloud projects list
        exit 1
    fi

    PROJECT_NAME=$(gcloud projects describe "$PROJECT_ID" --format="value(name)")
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

    print_success "Project: $PROJECT_NAME"
    print_info "Project Number: $PROJECT_NUMBER"
}

# Check required APIs
check_required_apis() {
    print_info "Checking required GCP APIs..."

    REQUIRED_APIS=(
        "compute.googleapis.com"
        "container.googleapis.com"
        "storage-api.googleapis.com"
        "sqladmin.googleapis.com"
        "iam.googleapis.com"
    )

    for api in "${REQUIRED_APIS[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            print_success "API enabled: $api"
        else
            print_warning "API not enabled: $api"
            read -p "Enable $api? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                gcloud services enable "$api"
                print_success "Enabled: $api"
            fi
        fi
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

# List available resources
list_gcp_resources() {
    print_info "Available GCP resource types:"
    terraformer import google list
}

# Run dry run
run_dry_run() {
    print_info "Running dry run for project: $PROJECT_ID"
    print_info "Regions: $REGIONS"
    print_info "Services: $SERVICES"

    # List resources by type
    IFS=',' read -ra SERVICE_ARRAY <<< "$SERVICES"

    for service in "${SERVICE_ARRAY[@]}"; do
        print_info "Resources for service: $service"

        case $service in
            networks)
                gcloud compute networks list --project="$PROJECT_ID" --format="table(name,autoCreateSubnetworks,creationTimestamp)"
                ;;
            subnetworks)
                gcloud compute networks subnets list --project="$PROJECT_ID" --format="table(name,region,ipCidrRange)"
                ;;
            instances)
                gcloud compute instances list --project="$PROJECT_ID" --format="table(name,zone,machineType,status)"
                ;;
            gke)
                gcloud container clusters list --project="$PROJECT_ID" --format="table(name,location,status,currentNodeCount)"
                ;;
            gcs)
                gsutil ls -p "$PROJECT_ID"
                ;;
            cloudsql)
                gcloud sql instances list --project="$PROJECT_ID" --format="table(name,region,databaseVersion,state)"
                ;;
            firewalls)
                gcloud compute firewall-rules list --project="$PROJECT_ID" --format="table(name,direction,priority,sourceRanges.list())"
                ;;
            *)
                print_warning "Unknown service: $service"
                ;;
        esac

        echo ""
    done

    print_success "Dry run complete"
}

# Import resources
import_resources() {
    local region=$1

    print_info "Importing resources from region: $region"
    print_info "Project: $PROJECT_ID"
    print_info "Services: $SERVICES"

    # Build terraformer command
    local cmd="terraformer import google"
    cmd="$cmd --resources=$SERVICES"
    cmd="$cmd --projects=$PROJECT_ID"
    cmd="$cmd --regions=$region"

    # Add zones if specified
    if [[ -n "$ZONES" ]]; then
        cmd="$cmd --zones=$ZONES"
    fi

    cmd="$cmd --compact"
    cmd="$cmd --path-pattern=$OUTPUT_DIR/{region}/{service}"
    cmd="$cmd --verbose"

    # Execute import
    if eval "$cmd"; then
        print_success "Import complete for region: $region"
    else
        print_error "Import failed for region: $region"
        return 1
    fi
}

# Validate imported Terraform
validate_terraform() {
    local region=$1

    print_info "Validating Terraform code for region: $region"

    find "$OUTPUT_DIR/$region" -name "*.tf" -type f | while read -r tf_file; do
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
GCP Infrastructure Import Report
================================================================================

Import Date: $(date)
Project ID: $PROJECT_ID
Project Name: $(gcloud projects describe "$PROJECT_ID" --format="value(name)")
Project Number: $(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
Regions: $REGIONS
Zones: ${ZONES:-"All zones in regions"}
Services: $SERVICES

================================================================================
Imported Resources by Region
================================================================================

EOF

    # Count resources per region
    for region_dir in "$OUTPUT_DIR"/*; do
        if [[ -d "$region_dir" ]]; then
            region=$(basename "$region_dir")
            echo "Region: $region" >> "$REPORT_FILE"
            echo "-----------------------------------" >> "$REPORT_FILE"

            find "$region_dir" -name "*.tf" -type f | while read -r tf_file; do
                service=$(basename "$(dirname "$tf_file")")
                resource_count=$(grep -c "^resource " "$tf_file" 2>/dev/null || echo 0)
                echo "  $service: $resource_count resources" >> "$REPORT_FILE"
            done

            echo "" >> "$REPORT_FILE"
        fi
    done

    cat >> "$REPORT_FILE" <<EOF
================================================================================
GCP-Specific Considerations
================================================================================

1. Project Hierarchy:
   - Organization > Folders > Projects
   - Import organization/folder resources separately
   - Use separate imports for different projects

2. Regional vs Zonal Resources:
   - Networks: Global
   - Subnetworks: Regional
   - Instances: Zonal
   - GKE Clusters: Regional or Zonal
   - Be explicit about location types

3. IAM and Service Accounts:
   - Project-level IAM bindings
   - Service account permissions
   - Organization/folder-level permissions (separate import)

4. Labels:
   - GCP uses labels (not tags like AWS)
   - Labels are key-value pairs
   - Maximum 64 labels per resource
   - Use for organization and cost tracking

5. Network Configuration:
   - VPCs are global, subnets are regional
   - Firewall rules are associated with VPC
   - Review auto-created default networks
   - Shared VPC requires separate configuration

6. API Requirements:
   - Ensure all required APIs are enabled
   - Some resources require specific APIs
   - Check API quotas and limits

================================================================================
Next Steps
================================================================================

1. Review generated code in: $OUTPUT_DIR

2. Set up remote state with GCS:
   gsutil mb gs://my-terraform-state
   gsutil versioning set on gs://my-terraform-state

3. Configure backend:
   cat > backend.tf <<'EEOF'
   terraform {
     backend "gcs" {
       bucket = "my-terraform-state"
       prefix = "terraform/state"
     }
   }
   EEOF

4. Initialize and validate:
   terraform init
   terraform plan

5. Refactor into modules:
   - Organize by service/function
   - Extract variables
   - Add validation
   - Document patterns

6. Set up CI/CD:
   - Use Cloud Build or GitHub Actions
   - Implement policy checks
   - Automate testing

================================================================================
Useful GCP Commands
================================================================================

# List all resources in project
gcloud asset search-all-resources --scope=projects/$PROJECT_ID

# Export project configuration
gcloud projects describe $PROJECT_ID

# List enabled APIs
gcloud services list --enabled

# Check IAM policy
gcloud projects get-iam-policy $PROJECT_ID

# List service accounts
gcloud iam service-accounts list

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

${BLUE}GCP-specific next steps:${NC}

  1. Set up remote state:
     ${YELLOW}# Create GCS bucket
     gsutil mb gs://\${PROJECT_ID}-terraform-state
     gsutil versioning set on gs://\${PROJECT_ID}-terraform-state${NC}

  2. Configure backend:
     ${YELLOW}cat > backend.tf <<'EOF'
     terraform {
       backend "gcs" {
         bucket = "\${PROJECT_ID}-terraform-state"
         prefix = "terraform/state"
       }
     }
     EOF${NC}

  3. Set up service account for Terraform:
     ${YELLOW}gcloud iam service-accounts create terraform \\
       --display-name "Terraform Service Account"

     gcloud projects add-iam-policy-binding $PROJECT_ID \\
       --member="serviceAccount:terraform@$PROJECT_ID.iam.gserviceaccount.com" \\
       --role="roles/editor"${NC}

  4. Verify no drift:
     ${YELLOW}terraform plan${NC}

${BLUE}Useful commands:${NC}

  # List all compute instances
  ${YELLOW}gcloud compute instances list --project=$PROJECT_ID${NC}

  # List all GCS buckets
  ${YELLOW}gsutil ls -p $PROJECT_ID${NC}

  # List all GKE clusters
  ${YELLOW}gcloud container clusters list --project=$PROJECT_ID${NC}

  # Show project metadata
  ${YELLOW}gcloud compute project-info describe --project=$PROJECT_ID${NC}

  # List all firewalls
  ${YELLOW}gcloud compute firewall-rules list --project=$PROJECT_ID${NC}

${BLUE}Documentation:${NC}
  - Terraformer: https://github.com/GoogleCloudPlatform/terraformer
  - GCP Provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
  - gcloud Reference: https://cloud.google.com/sdk/gcloud/reference

EOF
}

# Main execution
main() {
    echo ""
    print_info "GCP Infrastructure Import - Starting"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Verify GCP auth
    verify_gcp_auth

    # Check APIs
    check_required_apis

    # Setup output directory
    setup_output_directory

    # Process each region
    IFS=',' read -ra REGION_ARRAY <<< "$REGIONS"

    if [[ "$DRY_RUN" == true ]]; then
        run_dry_run
    else
        for region in "${REGION_ARRAY[@]}"; do
            import_resources "$region"
            validate_terraform "$region"
        done

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
