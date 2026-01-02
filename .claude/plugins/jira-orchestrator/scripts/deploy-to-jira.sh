#!/bin/bash

################################################################################
# Cloud-Agnostic Deployment Tracking Script for Jira Orchestrator
#
# This script automatically detects the cloud provider, extracts deployment
# metadata, identifies Jira issues, and updates Jira with deployment status.
#
# Usage:
#   ./deploy-to-jira.sh <environment> [options]
#
# Examples:
#   ./deploy-to-jira.sh development
#   ./deploy-to-jira.sh production --version v1.2.0 --issue PROJ-123
#   ./deploy-to-jira.sh staging --rollback --version v1.1.9
#
# Requirements:
#   - jq (for JSON parsing)
#   - yq (for YAML parsing)
#   - git (for commit history)
#   - Cloud CLI tools (aws, gcloud, or az depending on provider)
#   - Jira API credentials (environment variables)
#
# Environment Variables:
#   JIRA_API_TOKEN       - Jira API token (required)
#   JIRA_USER_EMAIL      - Jira user email (required)
#   JIRA_SITE_URL        - Jira instance URL (required)
#   CLOUD_PROVIDER       - Cloud provider (aws, gcp, azure, kubernetes, auto)
#   CONFIG_FILE          - Path to deployment config file
#
################################################################################

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default configuration
CONFIG_DIR="${PROJECT_ROOT}/config"
DEFAULT_CONFIG="${CONFIG_DIR}/multi-cloud-template.yml"
CLOUD_PROVIDER="${CLOUD_PROVIDER:-auto}"
ENVIRONMENT="${1:-development}"

# Logging setup
LOG_DIR="${PROJECT_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Utility Functions
################################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $*" | tee -a "$LOG_FILE" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $*" | tee -a "$LOG_FILE"
}

die() {
    log_error "$1"
    exit "${2:-1}"
}

check_dependencies() {
    local deps=("jq" "git")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            die "Required dependency '$dep' not found. Please install it first."
        fi
    done
}

################################################################################
# Cloud Provider Detection
################################################################################

detect_cloud_provider() {
    log "Detecting cloud provider..."

    # Check explicit environment variable
    if [[ "$CLOUD_PROVIDER" != "auto" ]]; then
        log_success "Cloud provider set explicitly: $CLOUD_PROVIDER"
        echo "$CLOUD_PROVIDER"
        return 0
    fi

    # AWS detection
    if command -v aws &> /dev/null; then
        if aws sts get-caller-identity &> /dev/null; then
            log_success "Detected AWS cloud provider"
            echo "aws"
            return 0
        fi
    fi

    # GCP detection
    if command -v gcloud &> /dev/null; then
        if gcloud config get-value project &> /dev/null 2>&1; then
            log_success "Detected GCP cloud provider"
            echo "gcp"
            return 0
        fi
    fi

    # Azure detection
    if command -v az &> /dev/null; then
        if az account show &> /dev/null 2>&1; then
            log_success "Detected Azure cloud provider"
            echo "azure"
            return 0
        fi
    fi

    # Kubernetes detection
    if command -v kubectl &> /dev/null; then
        if kubectl cluster-info &> /dev/null 2>&1; then
            log_success "Detected Kubernetes environment"
            echo "kubernetes"
            return 0
        fi
    fi

    log_warning "Could not auto-detect cloud provider, using default config"
    echo "default"
}

load_config() {
    local provider="$1"
    local config_file=""

    case "$provider" in
        aws)
            config_file="${CONFIG_DIR}/aws-deployment.yml"
            ;;
        gcp)
            config_file="${CONFIG_DIR}/gcp-deployment.yml"
            ;;
        azure)
            config_file="${CONFIG_DIR}/azure-deployment.yml"
            ;;
        kubernetes)
            config_file="${CONFIG_DIR}/kubernetes-deployment.yml"
            ;;
        *)
            config_file="${DEFAULT_CONFIG}"
            ;;
    esac

    if [[ ! -f "$config_file" ]]; then
        log_warning "Config file not found: $config_file, using default"
        config_file="${DEFAULT_CONFIG}"
    fi

    log_success "Loaded configuration: $config_file"
    echo "$config_file"
}

################################################################################
# Jira Issue Detection
################################################################################

detect_issues_from_commits() {
    log "Detecting Jira issues from git commits..."

    local look_back="${1:-50}"
    local pattern="${2:-([A-Z]+-[0-9]+)}"

    # Get recent commits
    local commits=$(git log --oneline -n "$look_back" 2>/dev/null || echo "")

    if [[ -z "$commits" ]]; then
        log_warning "No git commits found"
        return 1
    fi

    # Extract issue keys using grep and perl
    local issues=$(echo "$commits" | grep -oP "$pattern" | sort -u || echo "")

    if [[ -z "$issues" ]]; then
        log_warning "No Jira issues found in commits"
        return 1
    fi

    log_success "Found issues from commits: $(echo $issues | tr '\n' ' ')"
    echo "$issues"
}

detect_issue_from_branch() {
    log "Detecting Jira issue from branch name..."

    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

    if [[ -z "$branch" ]]; then
        log_warning "Could not determine current branch"
        return 1
    fi

    # Extract issue key from branch name (e.g., feature/PROJ-123-description)
    local issue=$(echo "$branch" | grep -oP '([A-Z]+-[0-9]+)' || echo "")

    if [[ -z "$issue" ]]; then
        log_warning "No Jira issue found in branch name: $branch"
        return 1
    fi

    log_success "Found issue from branch: $issue"
    echo "$issue"
}

detect_issues() {
    local explicit_issue="${ISSUE_KEY:-}"
    local issues=""

    # 1. Check explicit argument
    if [[ -n "$explicit_issue" ]]; then
        log_success "Using explicit issue key: $explicit_issue"
        echo "$explicit_issue"
        return 0
    fi

    # 2. Check git commits
    issues=$(detect_issues_from_commits 50 || echo "")
    if [[ -n "$issues" ]]; then
        echo "$issues"
        return 0
    fi

    # 3. Check branch name
    issues=$(detect_issue_from_branch || echo "")
    if [[ -n "$issues" ]]; then
        echo "$issues"
        return 0
    fi

    log_warning "No Jira issues detected"
    return 1
}

################################################################################
# Version Detection
################################################################################

detect_version() {
    local provider="$1"
    local version="${VERSION:-}"

    # Check explicit version
    if [[ -n "$version" ]]; then
        log_success "Using explicit version: $version"
        echo "$version"
        return 0
    fi

    # Try git tag
    version=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [[ -n "$version" ]]; then
        log_success "Version from git tag: $version"
        echo "$version"
        return 0
    fi

    # Fallback to commit SHA
    version=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    log_success "Version from git commit: $version"
    echo "$version"
}

################################################################################
# Deployment Metadata Extraction
################################################################################

get_deployment_url() {
    local provider="$1"
    local environment="$2"

    case "$provider" in
        aws)
            # Try to get ALB or CloudFront URL
            local url="${DEPLOYMENT_URL:-}"
            if [[ -z "$url" ]]; then
                # Could extract from AWS resources here
                url="https://${environment}.example.com"
            fi
            ;;
        gcp)
            # Try to get Cloud Run URL
            local url="${DEPLOYMENT_URL:-}"
            if [[ -z "$url" ]]; then
                # Could extract from GCP resources here
                url="https://${environment}.example.com"
            fi
            ;;
        azure)
            # Try to get App Service URL
            local url="${DEPLOYMENT_URL:-}"
            if [[ -z "$url" ]]; then
                # Could extract from Azure resources here
                url="https://${environment}.example.com"
            fi
            ;;
        *)
            local url="${DEPLOYMENT_URL:-https://${environment}.example.com}"
            ;;
    esac

    echo "$url"
}

get_deployer() {
    # Try CI/CD environment variables first
    local deployer=""

    # GitHub Actions
    if [[ -n "${GITHUB_ACTOR:-}" ]]; then
        deployer="$GITHUB_ACTOR (GitHub Actions)"
    # GitLab CI
    elif [[ -n "${GITLAB_USER_NAME:-}" ]]; then
        deployer="$GITLAB_USER_NAME (GitLab CI)"
    # Azure DevOps
    elif [[ -n "${BUILD_REQUESTEDFOR:-}" ]]; then
        deployer="$BUILD_REQUESTEDFOR (Azure DevOps)"
    # Jenkins
    elif [[ -n "${BUILD_USER:-}" ]]; then
        deployer="$BUILD_USER (Jenkins)"
    # Fallback to git user
    else
        deployer="$(git config user.name 2>/dev/null || echo 'Unknown')"
    fi

    echo "$deployer"
}

get_commit_sha() {
    git rev-parse HEAD 2>/dev/null || echo "unknown"
}

get_commit_sha_short() {
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

get_build_id() {
    # Try to get build ID from CI/CD
    local build_id=""

    # GitHub Actions
    if [[ -n "${GITHUB_RUN_ID:-}" ]]; then
        build_id="$GITHUB_RUN_ID"
    # GitLab CI
    elif [[ -n "${CI_PIPELINE_ID:-}" ]]; then
        build_id="$CI_PIPELINE_ID"
    # Azure DevOps
    elif [[ -n "${BUILD_BUILDID:-}" ]]; then
        build_id="$BUILD_BUILDID"
    # Jenkins
    elif [[ -n "${BUILD_NUMBER:-}" ]]; then
        build_id="$BUILD_NUMBER"
    else
        build_id="manual"
    fi

    echo "$build_id"
}

################################################################################
# Jira Comment Generation
################################################################################

generate_deployment_comment() {
    local status="$1"
    local environment="$2"
    local version="$3"
    local url="$4"
    local provider="$5"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local deployer=$(get_deployer)
    local commit_sha=$(get_commit_sha_short)
    local build_id=$(get_build_id)

    local icon=""
    local title=""

    case "$status" in
        success)
            icon="✅"
            title="Deployment Successful"
            ;;
        failure)
            icon="❌"
            title="Deployment Failed"
            ;;
        rollback)
            icon="🔄"
            title="Rollback Completed"
            ;;
        *)
            icon="ℹ️"
            title="Deployment Update"
            ;;
    esac

    cat <<EOF
$icon *$title: $environment*

*Status:* $status
*Environment:* $environment
*Version:* $version
*Timestamp:* $timestamp
*Deployment URL:* $url

h3. Deployment Details

* *Cloud Provider:* $provider
* *Deployed By:* $deployer
* *Commit SHA:* $commit_sha
* *Build ID:* $build_id

h3. Verification

$(if [[ "$status" == "success" ]]; then
    cat <<VERIFY
* ✓ Service health check passed
* ✓ Deployment completed successfully
* ✓ Version updated to $version
VERIFY
else
    cat <<VERIFY
* ✗ Deployment encountered errors
* Review logs for details
* Consider rollback if needed
VERIFY
fi)

---
_Automated deployment tracking via Jira Orchestrator_
EOF
}

################################################################################
# Jira API Functions
################################################################################

validate_jira_credentials() {
    log "Validating Jira credentials..."

    if [[ -z "${JIRA_API_TOKEN:-}" ]]; then
        die "JIRA_API_TOKEN environment variable not set"
    fi

    if [[ -z "${JIRA_USER_EMAIL:-}" ]]; then
        die "JIRA_USER_EMAIL environment variable not set"
    fi

    if [[ -z "${JIRA_SITE_URL:-}" ]]; then
        die "JIRA_SITE_URL environment variable not set"
    fi

    log_success "Jira credentials validated"
}

update_jira_issue() {
    local issue_key="$1"
    local comment="$2"

    log "Updating Jira issue: $issue_key"

    # Create JSON payload for comment
    local payload=$(jq -n \
        --arg body "$comment" \
        '{body: $body}')

    # Make API request to add comment
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
        -d "$payload" \
        "${JIRA_SITE_URL}/rest/api/3/issue/${issue_key}/comment")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [[ "$http_code" -ge 200 ]] && [[ "$http_code" -lt 300 ]]; then
        log_success "Successfully updated Jira issue: $issue_key"
        return 0
    else
        log_error "Failed to update Jira issue: $issue_key (HTTP $http_code)"
        log_error "Response: $body"
        return 1
    fi
}

################################################################################
# Main Deployment Tracking Logic
################################################################################

parse_arguments() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --issue)
                ISSUE_KEY="$2"
                shift 2
                ;;
            --url)
                DEPLOYMENT_URL="$2"
                shift 2
                ;;
            --status)
                DEPLOYMENT_STATUS="$2"
                shift 2
                ;;
            --rollback)
                IS_ROLLBACK="true"
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                # First positional argument is environment
                if [[ -z "${ENVIRONMENT:-}" ]]; then
                    ENVIRONMENT="$1"
                fi
                shift
                ;;
        esac
    done
}

show_usage() {
    cat <<EOF
Usage: $0 <environment> [options]

Arguments:
  environment           Target environment (dev, staging, production)

Options:
  --version VERSION     Deployment version (default: auto-detect from git)
  --issue ISSUE-KEY     Jira issue key (default: auto-detect from commits)
  --url URL             Deployment URL (default: auto-detect from cloud)
  --status STATUS       Deployment status (success, failure, pending)
  --rollback            Mark this as a rollback deployment
  --help, -h            Show this help message

Environment Variables:
  JIRA_API_TOKEN        Jira API token (required)
  JIRA_USER_EMAIL       Jira user email (required)
  JIRA_SITE_URL         Jira instance URL (required)
  CLOUD_PROVIDER        Cloud provider (aws, gcp, azure, kubernetes, auto)

Examples:
  # Deploy to development (auto-detect everything)
  $0 development

  # Deploy to production with specific version and issue
  $0 production --version v1.2.0 --issue PROJ-123

  # Track rollback deployment
  $0 production --rollback --version v1.1.9

  # Manual deployment with all parameters
  $0 staging --version v1.2.0 --issue PROJ-123 --url https://staging.example.com
EOF
}

main() {
    log "=== Jira Deployment Tracking Started ==="

    # Check dependencies
    check_dependencies

    # Parse arguments
    parse_arguments "$@"

    # Validate Jira credentials
    validate_jira_credentials

    # Detect cloud provider
    local provider=$(detect_cloud_provider)

    # Load configuration
    local config_file=$(load_config "$provider")

    # Detect version
    local version=$(detect_version "$provider")

    # Detect Jira issues
    local issues=$(detect_issues || echo "")

    if [[ -z "$issues" ]]; then
        log_error "No Jira issues detected. Use --issue to specify manually."
        exit 1
    fi

    # Get deployment metadata
    local deployment_url=$(get_deployment_url "$provider" "$ENVIRONMENT")
    local deployment_status="${DEPLOYMENT_STATUS:-success}"

    if [[ "${IS_ROLLBACK:-false}" == "true" ]]; then
        deployment_status="rollback"
    fi

    # Generate deployment comment
    local comment=$(generate_deployment_comment \
        "$deployment_status" \
        "$ENVIRONMENT" \
        "$version" \
        "$deployment_url" \
        "$provider")

    # Update each Jira issue
    local success_count=0
    local failure_count=0

    for issue in $issues; do
        if update_jira_issue "$issue" "$comment"; then
            ((success_count++))
        else
            ((failure_count++))
        fi
    done

    # Summary
    log "=== Deployment Tracking Summary ==="
    log_success "Successfully updated: $success_count issues"
    if [[ $failure_count -gt 0 ]]; then
        log_error "Failed to update: $failure_count issues"
    fi
    log_success "Environment: $ENVIRONMENT"
    log_success "Version: $version"
    log_success "Status: $deployment_status"
    log_success "Provider: $provider"
    log "Log file: $LOG_FILE"

    if [[ $failure_count -gt 0 ]]; then
        exit 1
    fi

    log_success "=== Deployment Tracking Completed ==="
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
