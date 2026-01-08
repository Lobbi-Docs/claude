#!/bin/bash
# Comprehensive setup validation script
# Usage: ./validate-setup.sh [--json] [--fix]

set -e

OUTPUT_FORMAT="${1:-text}"
AUTO_FIX="${2:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results tracking
declare -A RESULTS
WARNINGS=0
ERRORS=0

# Helper functions
log_check() {
    local component=$1
    local check=$2
    local status=$3
    local message=$4

    if [ "$OUTPUT_FORMAT" = "json" ]; then
        echo "{\"component\": \"$component\", \"check\": \"$check\", \"status\": \"$status\", \"message\": \"$message\"}"
    else
        case $status in
            "pass") echo -e "  ${GREEN}✅${NC} $check" ;;
            "warn") echo -e "  ${YELLOW}⚠️${NC} $check: $message" ;;
            "fail") echo -e "  ${RED}❌${NC} $check: $message" ;;
        esac
    fi

    RESULTS["${component}_${check}"]="$status"
    [ "$status" = "warn" ] && ((WARNINGS++))
    [ "$status" = "fail" ] && ((ERRORS++))
}

header() {
    if [ "$OUTPUT_FORMAT" != "json" ]; then
        echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE} $1${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
    fi
}

# ═══════════════════════════════════════════════════════════════
# AWS Validation
# ═══════════════════════════════════════════════════════════════
validate_aws() {
    header "AWS VALIDATION"

    # Check AWS CLI
    if command -v aws &> /dev/null; then
        log_check "aws" "cli_installed" "pass" ""
    else
        log_check "aws" "cli_installed" "fail" "AWS CLI not found"
        return
    fi

    # Check credentials
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        log_check "aws" "credentials" "pass" ""
        [ "$OUTPUT_FORMAT" != "json" ] && echo "     Account: $ACCOUNT_ID"
    else
        log_check "aws" "credentials" "fail" "Invalid or expired credentials"
        return
    fi

    # Check EKS clusters
    if [ -n "$EKS_CLUSTER_DEV" ]; then
        if aws eks describe-cluster --name "$EKS_CLUSTER_DEV" &> /dev/null; then
            log_check "aws" "eks_dev" "pass" ""
        else
            log_check "aws" "eks_dev" "fail" "Cannot access cluster: $EKS_CLUSTER_DEV"
        fi
    else
        log_check "aws" "eks_dev" "warn" "EKS_CLUSTER_DEV not set"
    fi

    if [ -n "$EKS_CLUSTER_STAGING" ]; then
        if aws eks describe-cluster --name "$EKS_CLUSTER_STAGING" &> /dev/null; then
            log_check "aws" "eks_staging" "pass" ""
        else
            log_check "aws" "eks_staging" "fail" "Cannot access cluster: $EKS_CLUSTER_STAGING"
        fi
    fi

    if [ -n "$EKS_CLUSTER_PROD" ]; then
        if aws eks describe-cluster --name "$EKS_CLUSTER_PROD" &> /dev/null; then
            log_check "aws" "eks_prod" "pass" ""
        else
            log_check "aws" "eks_prod" "fail" "Cannot access cluster: $EKS_CLUSTER_PROD"
        fi
    fi

    # Check ECR
    if aws ecr get-login-password &> /dev/null; then
        log_check "aws" "ecr" "pass" ""
    else
        log_check "aws" "ecr" "fail" "Cannot access ECR"
    fi

    # Check Secrets Manager
    if aws secretsmanager list-secrets --max-items 1 &> /dev/null; then
        log_check "aws" "secrets_manager" "pass" ""
    else
        log_check "aws" "secrets_manager" "fail" "Cannot access Secrets Manager"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Harness Validation
# ═══════════════════════════════════════════════════════════════
validate_harness() {
    header "HARNESS VALIDATION"

    # Check required variables
    if [ -z "$HARNESS_ACCOUNT_ID" ] || [ -z "$HARNESS_API_KEY" ]; then
        log_check "harness" "configuration" "fail" "HARNESS_ACCOUNT_ID or HARNESS_API_KEY not set"
        return
    fi

    HARNESS_BASE_URL="${HARNESS_BASE_URL:-https://app.harness.io}"

    # Check API connectivity
    RESPONSE=$(curl -sf -w "%{http_code}" -H "x-api-key: $HARNESS_API_KEY" \
        "$HARNESS_BASE_URL/ng/api/user/currentUser?accountIdentifier=$HARNESS_ACCOUNT_ID" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ] || [[ "$RESPONSE" == *"SUCCESS"* ]]; then
        log_check "harness" "api_connection" "pass" ""
    else
        log_check "harness" "api_connection" "fail" "Cannot connect to Harness API (HTTP: $RESPONSE)"
        return
    fi

    # Check project access
    if [ -n "$HARNESS_ORG_ID" ] && [ -n "$HARNESS_PROJECT_ID" ]; then
        PROJECT_CHECK=$(curl -sf -H "x-api-key: $HARNESS_API_KEY" \
            "$HARNESS_BASE_URL/ng/api/projects/$HARNESS_PROJECT_ID?accountIdentifier=$HARNESS_ACCOUNT_ID&orgIdentifier=$HARNESS_ORG_ID" 2>/dev/null)

        if echo "$PROJECT_CHECK" | grep -q "SUCCESS"; then
            log_check "harness" "project_access" "pass" ""
        else
            log_check "harness" "project_access" "fail" "Cannot access project: $HARNESS_PROJECT_ID"
        fi
    else
        log_check "harness" "project_access" "warn" "HARNESS_ORG_ID or HARNESS_PROJECT_ID not set"
    fi

    # Check delegates (simplified check)
    DELEGATE_CHECK=$(curl -sf -H "x-api-key: $HARNESS_API_KEY" \
        "$HARNESS_BASE_URL/ng/api/delegate-setup/listDelegates?accountId=$HARNESS_ACCOUNT_ID" 2>/dev/null || echo "{}")

    if echo "$DELEGATE_CHECK" | grep -q "ENABLED"; then
        log_check "harness" "delegates" "pass" ""
    else
        log_check "harness" "delegates" "warn" "No healthy delegates found or cannot verify"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Keycloak Validation
# ═══════════════════════════════════════════════════════════════
validate_keycloak() {
    header "KEYCLOAK VALIDATION"

    if [ -z "$KEYCLOAK_URL" ]; then
        log_check "keycloak" "configuration" "warn" "KEYCLOAK_URL not set"
        return
    fi

    # Check server reachability
    if curl -sf "$KEYCLOAK_URL/realms/master/.well-known/openid-configuration" &> /dev/null; then
        log_check "keycloak" "server" "pass" ""
    else
        log_check "keycloak" "server" "fail" "Cannot reach Keycloak at $KEYCLOAK_URL"
        return
    fi

    # Check admin credentials (if provided)
    if [ -n "$KEYCLOAK_ADMIN" ] && [ -n "$KEYCLOAK_ADMIN_PASSWORD" ]; then
        TOKEN=$(curl -sf -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "grant_type=password" \
            -d "client_id=admin-cli" \
            -d "username=$KEYCLOAK_ADMIN" \
            -d "password=$KEYCLOAK_ADMIN_PASSWORD" 2>/dev/null | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$TOKEN" ]; then
            log_check "keycloak" "admin_access" "pass" ""

            # Check realms
            for REALM_VAR in KEYCLOAK_REALM_DEV KEYCLOAK_REALM_STAGING KEYCLOAK_REALM_PROD; do
                REALM="${!REALM_VAR}"
                if [ -n "$REALM" ]; then
                    if curl -sf "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" &> /dev/null; then
                        log_check "keycloak" "realm_$REALM" "pass" ""
                    else
                        log_check "keycloak" "realm_$REALM" "warn" "Realm not found: $REALM"
                    fi
                fi
            done
        else
            log_check "keycloak" "admin_access" "fail" "Cannot authenticate as admin"
        fi
    else
        log_check "keycloak" "admin_access" "warn" "Admin credentials not configured"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Local Development Validation
# ═══════════════════════════════════════════════════════════════
validate_local() {
    header "LOCAL DEVELOPMENT VALIDATION"

    # Check Docker
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        log_check "local" "docker" "pass" ""
    else
        log_check "local" "docker" "fail" "Docker not running"
    fi

    # Check kubectl
    if command -v kubectl &> /dev/null; then
        log_check "local" "kubectl" "pass" ""
    else
        log_check "local" "kubectl" "fail" "kubectl not found"
    fi

    # Check Helm
    if command -v helm &> /dev/null; then
        log_check "local" "helm" "pass" ""
    else
        log_check "local" "helm" "fail" "helm not found"
    fi

    # Check Kind (optional)
    if command -v kind &> /dev/null; then
        log_check "local" "kind" "pass" ""
    else
        log_check "local" "kind" "warn" "kind not installed (optional)"
    fi

    # Check Skaffold (optional)
    if command -v skaffold &> /dev/null; then
        log_check "local" "skaffold" "pass" ""
    else
        log_check "local" "skaffold" "warn" "skaffold not installed (optional)"
    fi

    # Check configuration files
    if [ -f "docker-compose.yaml" ] || [ -f "local-dev/docker-compose.yaml" ]; then
        log_check "local" "docker_compose_config" "pass" ""
    else
        log_check "local" "docker_compose_config" "warn" "docker-compose.yaml not found"
    fi

    if [ -f "kind-config.yaml" ] || [ -f "local-dev/kind-config.yaml" ]; then
        log_check "local" "kind_config" "pass" ""
    else
        log_check "local" "kind_config" "warn" "kind-config.yaml not found"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
print_summary() {
    if [ "$OUTPUT_FORMAT" = "json" ]; then
        echo "{\"warnings\": $WARNINGS, \"errors\": $ERRORS, \"status\": \"$([ $ERRORS -eq 0 ] && echo 'ok' || echo 'failed')\"}"
    else
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE} VALIDATION SUMMARY${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""

        if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
            echo -e "  ${GREEN}✅ ALL CHECKS PASSED${NC}"
        elif [ $ERRORS -eq 0 ]; then
            echo -e "  ${YELLOW}⚠️ PASSED WITH $WARNINGS WARNING(S)${NC}"
        else
            echo -e "  ${RED}❌ FAILED: $ERRORS error(s), $WARNINGS warning(s)${NC}"
        fi

        echo ""
        echo "  Run '/eks:setup --mode=repair' to fix issues"
        echo ""
    fi
}

# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

# Load environment if available
[ -f ".env.eks-setup" ] && source .env.eks-setup

if [ "$OUTPUT_FORMAT" != "json" ]; then
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              EKS ECOSYSTEM VALIDATION                         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
fi

validate_aws
validate_harness
validate_keycloak
validate_local
print_summary

# Exit with appropriate code
[ $ERRORS -eq 0 ] && exit 0 || exit 1
