#!/bin/bash

################################################################################
# AWS Infrastructure Import Script using Terraformer
#
# This script imports existing AWS infrastructure into Terraform using
# Terraformer. It demonstrates various import strategies and best practices.
#
# Usage:
#   ./aws-import.sh [OPTIONS]
#
# Options:
#   -p, --profile <profile>    AWS profile to use (default: default)
#   -r, --regions <regions>    Comma-separated list of regions (default: us-east-1)
#   -e, --environment <env>    Environment tag to filter (default: production)
#   -o, --output <path>        Output directory (default: generated/aws)
#   -s, --services <services>  Comma-separated service list (default: all)
#   -d, --dry-run              Preview without importing
#   -h, --help                 Show this help message
#
# Examples:
#   # Import VPC resources from production
#   ./aws-import.sh -p production -r us-east-1 -e production -s vpc,subnet
#
#   # Dry run to preview what will be imported
#   ./aws-import.sh -p production -r us-east-1 --dry-run
#
#   # Import from multiple regions
#   ./aws-import.sh -r us-east-1,us-west-2,eu-west-1
#
################################################################################

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
AWS_PROFILE="default"
REGIONS="us-east-1"
ENVIRONMENT="production"
OUTPUT_DIR="generated/aws"
SERVICES="vpc,subnet,route_table,internet_gateway,nat_gateway,security_group,ec2_instance,rds,s3,lambda,iam_role"
DRY_RUN=false

# Function to print colored messages
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

# Function to show usage
show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        -r|--regions)
            REGIONS="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -s|--services)
            SERVICES="$2"
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

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check for terraformer
    if ! command -v terraformer &> /dev/null; then
        print_error "terraformer not found. Please install it first."
        print_info "Installation: brew install terraformer"
        exit 1
    fi

    # Check for terraform
    if ! command -v terraform &> /dev/null; then
        print_error "terraform not found. Please install it first."
        print_info "Installation: brew install terraform"
        exit 1
    fi

    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "aws CLI not found. Please install it first."
        print_info "Installation: brew install awscli"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Function to verify AWS credentials
verify_aws_credentials() {
    print_info "Verifying AWS credentials for profile: $AWS_PROFILE"

    export AWS_PROFILE="$AWS_PROFILE"

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "Failed to authenticate with AWS using profile: $AWS_PROFILE"
        print_info "Please configure AWS credentials: aws configure --profile $AWS_PROFILE"
        exit 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    CALLER_ARN=$(aws sts get-caller-identity --query Arn --output text)

    print_success "Authenticated as: $CALLER_ARN"
    print_info "AWS Account ID: $ACCOUNT_ID"
}

# Function to create output directory
setup_output_directory() {
    print_info "Setting up output directory: $OUTPUT_DIR"

    if [[ -d "$OUTPUT_DIR" ]]; then
        print_warning "Output directory already exists. Contents may be overwritten."
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Aborted by user"
            exit 0
        fi
    fi

    mkdir -p "$OUTPUT_DIR"
    print_success "Output directory ready"
}

# Function to run dry run
run_dry_run() {
    print_info "Running dry run for region: $1"

    terraformer import aws \
        --resources="$SERVICES" \
        --regions="$1" \
        --filter="Name=tag:Environment;Value=$ENVIRONMENT" \
        --dry-run

    print_success "Dry run complete for region: $1"
}

# Function to import resources
import_resources() {
    local region=$1

    print_info "Importing resources from region: $region"
    print_info "Services: $SERVICES"
    print_info "Filter: Environment=$ENVIRONMENT"

    terraformer import aws \
        --resources="$SERVICES" \
        --regions="$region" \
        --filter="Name=tag:Environment;Value=$ENVIRONMENT" \
        --compact \
        --path-pattern="$OUTPUT_DIR/{region}/{service}" \
        --verbose || {
            print_error "Import failed for region: $region"
            return 1
        }

    print_success "Import complete for region: $region"
}

# Function to validate imported terraform
validate_terraform() {
    local region=$1

    print_info "Validating Terraform code for region: $region"

    # Find all directories with .tf files
    find "$OUTPUT_DIR/$region" -name "*.tf" -type f | while read -r tf_file; do
        dir=$(dirname "$tf_file")

        # Skip if already validated (has .terraform directory)
        if [[ -d "$dir/.terraform" ]]; then
            continue
        fi

        cd "$dir" || continue

        print_info "Validating: $dir"

        # Initialize
        if ! terraform init -backend=false &> /dev/null; then
            print_warning "Failed to initialize: $dir"
            cd - &> /dev/null
            continue
        fi

        # Validate
        if terraform validate &> /dev/null; then
            print_success "Valid: $dir"
        else
            print_warning "Validation warnings in: $dir"
        fi

        cd - &> /dev/null
    done
}

# Function to generate summary report
generate_report() {
    print_info "Generating import summary report..."

    REPORT_FILE="$OUTPUT_DIR/import-report.txt"

    cat > "$REPORT_FILE" <<EOF
================================================================================
AWS Infrastructure Import Report
================================================================================

Import Date: $(date)
AWS Profile: $AWS_PROFILE
AWS Account: $ACCOUNT_ID
Regions: $REGIONS
Environment Filter: $ENVIRONMENT
Services: $SERVICES

================================================================================
Imported Resources by Region
================================================================================

EOF

    # Count resources per region
    for region in $(echo "$REGIONS" | tr ',' ' '); do
        if [[ -d "$OUTPUT_DIR/$region" ]]; then
            echo "Region: $region" >> "$REPORT_FILE"
            echo "-----------------------------------" >> "$REPORT_FILE"

            # Count .tf files and state resources
            find "$OUTPUT_DIR/$region" -name "*.tf" -type f | while read -r tf_file; do
                service=$(basename "$(dirname "$tf_file")")
                resource_count=$(grep -c "^resource " "$tf_file" 2>/dev/null || echo 0)
                echo "  $service: $resource_count resources" >> "$REPORT_FILE"
            done

            echo "" >> "$REPORT_FILE"
        fi
    done

    cat >> "$REPORT_FILE" <<EOF
================================================================================
Next Steps
================================================================================

1. Review generated Terraform code in: $OUTPUT_DIR
2. Navigate to each service directory and run:
   - terraform init
   - terraform plan
3. Refactor code as needed:
   - Remove default values
   - Extract variables
   - Rename resources meaningfully
   - Add validation rules
4. Set up remote state backend
5. Run terraform plan to verify no drift
6. Document infrastructure architecture

================================================================================
EOF

    print_success "Report generated: $REPORT_FILE"
    echo ""
    cat "$REPORT_FILE"
}

# Function to provide post-import guidance
post_import_guidance() {
    cat <<EOF

${GREEN}================================================================================
Import Complete!
================================================================================${NC}

${BLUE}Generated files location:${NC}
  $OUTPUT_DIR

${BLUE}Next steps:${NC}

  1. Review generated code:
     ${YELLOW}cd $OUTPUT_DIR/${NC}

  2. Initialize Terraform:
     ${YELLOW}cd $OUTPUT_DIR/<region>/<service>
     terraform init${NC}

  3. Verify no drift:
     ${YELLOW}terraform plan${NC}
     Expected: "No changes. Infrastructure is up-to-date."

  4. Refactor code:
     ${YELLOW}# Remove default values
     # Extract variables
     # Rename resources
     # Add validation${NC}

  5. Set up remote state:
     ${YELLOW}# Configure backend.tf with S3/GCS/Azure Storage
     terraform init -migrate-state${NC}

  6. Create modules:
     ${YELLOW}# Move reusable patterns to modules/
     # Create module documentation${NC}

${BLUE}Useful commands:${NC}

  # List all imported resources
  ${YELLOW}terraform state list${NC}

  # Show specific resource
  ${YELLOW}terraform state show <resource>${NC}

  # Rename resource
  ${YELLOW}terraform state mv <old-name> <new-name>${NC}

  # Remove resource from state
  ${YELLOW}terraform state rm <resource>${NC}

${BLUE}Documentation:${NC}
  - Terraformer: https://github.com/GoogleCloudPlatform/terraformer
  - AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

EOF
}

# Main execution
main() {
    echo ""
    print_info "AWS Infrastructure Import - Starting"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Verify AWS credentials
    verify_aws_credentials

    # Setup output directory
    setup_output_directory

    # Process each region
    IFS=',' read -ra REGION_ARRAY <<< "$REGIONS"

    for region in "${REGION_ARRAY[@]}"; do
        if [[ "$DRY_RUN" == true ]]; then
            run_dry_run "$region"
        else
            import_resources "$region"
            validate_terraform "$region"
        fi
    done

    if [[ "$DRY_RUN" == false ]]; then
        # Generate summary report
        generate_report

        # Show post-import guidance
        post_import_guidance
    else
        print_info "Dry run complete. No resources were imported."
    fi

    print_success "All operations completed successfully"
    echo ""
}

# Run main function
main
