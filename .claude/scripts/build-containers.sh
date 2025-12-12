#!/bin/bash
#######################################################################
# Agent Studio - Container Image Build & Push
#
# Establish reliable container image builds with multi-stage optimization
# to support efficient deployments across all environments.
#
# This script builds and pushes all Agent Studio container images to
# Azure Container Registry with proper tagging and caching.
#
# Best for: Standalone container builds without full infrastructure deployment
#######################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Agent Studio - Container Image Build & Push                 ║"
echo "║   Streamline container workflows for efficient deployments    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

#######################################################################
# Configuration & Validation
#######################################################################

# Parse arguments
ACR_NAME=${1}
IMAGE_TAG=${2:-$(date +%Y%m%d-%H%M%S)}
ENV=${3:-dev}

if [ -z "$ACR_NAME" ]; then
    print_error "Azure Container Registry name is required"
    echo ""
    echo "Usage: $0 <acr-name> [image-tag] [environment]"
    echo "  acr-name:    Azure Container Registry name (required)"
    echo "  image-tag:   Docker image tag (default: timestamp)"
    echo "  environment: Target environment - dev, staging, prod (default: dev)"
    echo ""
    echo "Example:"
    echo "  $0 myacrregistry 1.2.3 prod"
    exit 1
fi

print_status "Build configuration:"
echo "  ACR Name:     $ACR_NAME"
echo "  Image Tag:    $IMAGE_TAG"
echo "  Environment:  $ENV"
echo ""

# Determine project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

print_status "Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is required but not installed"
    print_error "Install from: https://www.docker.com/get-started"
    exit 1
fi

# Check Azure CLI
if ! command -v az >/dev/null 2>&1; then
    print_error "Azure CLI is required but not installed"
    print_error "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Verify ACR exists
print_status "Validating Azure Container Registry..."
if ! az acr show --name "$ACR_NAME" >/dev/null 2>&1; then
    print_error "Azure Container Registry not found: $ACR_NAME"
    print_error "Ensure you have access to the registry or create it first"
    exit 1
fi
print_success "ACR validated: $ACR_NAME"

# Login to ACR
print_status "Authenticating to Azure Container Registry..."
if ! az acr login --name "$ACR_NAME"; then
    print_error "Failed to authenticate to ACR"
    exit 1
fi
print_success "ACR authentication successful"

ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
echo ""

#######################################################################
# Build Configuration
#######################################################################

# Enable Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Track build results
BUILDS_SUCCEEDED=0
BUILDS_FAILED=0

#######################################################################
# PHASE 1: Build Webapp Image
#######################################################################

if [ -f "webapp/package.json" ]; then
    print_status "PHASE 1: Building webapp container image..."

    WEBAPP_IMAGE="${ACR_LOGIN_SERVER}/webapp"

    # Build multi-stage Docker image with caching
    if docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --build-arg NODE_ENV=production \
        --cache-from "${WEBAPP_IMAGE}:${ENV}-latest" \
        -t "${WEBAPP_IMAGE}:${IMAGE_TAG}" \
        -t "${WEBAPP_IMAGE}:${ENV}-latest" \
        -t "${WEBAPP_IMAGE}:latest" \
        -f Dockerfile.webapp \
        .; then

        print_success "Webapp image built successfully"

        # Push images
        print_status "Pushing webapp images to ACR..."
        docker push "${WEBAPP_IMAGE}:${IMAGE_TAG}"
        docker push "${WEBAPP_IMAGE}:${ENV}-latest"

        if [ "$ENV" == "prod" ]; then
            docker push "${WEBAPP_IMAGE}:latest"
        fi

        print_success "Webapp images pushed successfully"
        ((BUILDS_SUCCEEDED++))
    else
        print_error "Webapp image build failed"
        ((BUILDS_FAILED++))
    fi

    echo ""
else
    print_warning "Skipping webapp build - webapp/package.json not found"
    echo ""
fi

#######################################################################
# PHASE 2: Build .NET API Image
#######################################################################

if [ -f "services/dotnet/AgentStudio.sln" ]; then
    print_status "PHASE 2: Building .NET API container image..."

    API_IMAGE="${ACR_LOGIN_SERVER}/dotnet-api"

    # Build multi-stage Docker image
    if docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --build-arg ASPNETCORE_ENVIRONMENT=Production \
        --cache-from "${API_IMAGE}:${ENV}-latest" \
        -t "${API_IMAGE}:${IMAGE_TAG}" \
        -t "${API_IMAGE}:${ENV}-latest" \
        -t "${API_IMAGE}:latest" \
        -f Dockerfile.api \
        .; then

        print_success ".NET API image built successfully"

        # Push images
        print_status "Pushing .NET API images to ACR..."
        docker push "${API_IMAGE}:${IMAGE_TAG}"
        docker push "${API_IMAGE}:${ENV}-latest"

        if [ "$ENV" == "prod" ]; then
            docker push "${API_IMAGE}:latest"
        fi

        print_success ".NET API images pushed successfully"
        ((BUILDS_SUCCEEDED++))
    else
        print_error ".NET API image build failed"
        ((BUILDS_FAILED++))
    fi

    echo ""
else
    print_warning "Skipping .NET API build - services/dotnet/AgentStudio.sln not found"
    echo ""
fi

#######################################################################
# PHASE 3: Build Python Worker Image
#######################################################################

if [ -f "src/python/pyproject.toml" ]; then
    print_status "PHASE 3: Building Python worker container image..."

    WORKER_IMAGE="${ACR_LOGIN_SERVER}/python-worker"

    # Build multi-stage Docker image
    if docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --build-arg PYTHON_ENV=production \
        --cache-from "${WORKER_IMAGE}:${ENV}-latest" \
        -t "${WORKER_IMAGE}:${IMAGE_TAG}" \
        -t "${WORKER_IMAGE}:${ENV}-latest" \
        -t "${WORKER_IMAGE}:latest" \
        -f Dockerfile.worker \
        .; then

        print_success "Python worker image built successfully"

        # Push images
        print_status "Pushing Python worker images to ACR..."
        docker push "${WORKER_IMAGE}:${IMAGE_TAG}"
        docker push "${WORKER_IMAGE}:${ENV}-latest"

        if [ "$ENV" == "prod" ]; then
            docker push "${WORKER_IMAGE}:latest"
        fi

        print_success "Python worker images pushed successfully"
        ((BUILDS_SUCCEEDED++))
    else
        print_error "Python worker image build failed"
        ((BUILDS_FAILED++))
    fi

    echo ""
else
    print_warning "Skipping Python worker build - src/python/pyproject.toml not found"
    echo ""
fi

#######################################################################
# SUMMARY
#######################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ $BUILDS_FAILED -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   All Container Builds Successful                              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    print_success "All container images built and pushed successfully"
else
    echo -e "${RED}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   Some Container Builds Failed                                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    print_error "Some container builds failed - review errors above"
fi

echo ""
echo -e "${BLUE}Build Summary:${NC}"
echo "  ✓ Succeeded: $BUILDS_SUCCEEDED"
echo "  ✗ Failed:    $BUILDS_FAILED"
echo ""

echo -e "${BLUE}Container Registry:${NC}"
echo "  ACR Name:         $ACR_NAME"
echo "  Login Server:     $ACR_LOGIN_SERVER"
echo "  Image Tag:        $IMAGE_TAG"
echo "  Environment Tag:  ${ENV}-latest"
echo ""

echo -e "${BLUE}Pushed Images:${NC}"
[ $BUILDS_SUCCEEDED -gt 0 ] && echo "  - ${ACR_LOGIN_SERVER}/webapp:${IMAGE_TAG}" || true
[ $BUILDS_SUCCEEDED -gt 1 ] && echo "  - ${ACR_LOGIN_SERVER}/dotnet-api:${IMAGE_TAG}" || true
[ $BUILDS_SUCCEEDED -gt 2 ] && echo "  - ${ACR_LOGIN_SERVER}/python-worker:${IMAGE_TAG}" || true
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Deploy to Container Apps: ./infra/scripts/deploy-containers.sh <resource-group> $ENV"
echo "  2. View images in ACR: az acr repository list --name $ACR_NAME"
echo "  3. Inspect image: az acr repository show --name $ACR_NAME --image webapp:${IMAGE_TAG}"
echo ""

if [ $BUILDS_FAILED -eq 0 ]; then
    print_success "Container build automation complete - ready for deployment"
    exit 0
else
    print_error "Container builds incomplete - resolve failures before deployment"
    exit 1
fi
