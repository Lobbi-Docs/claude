#!/bin/bash
#######################################################################
# Agent Studio - Full Stack Deployment to Azure
#
# Establish end-to-end deployment automation to streamline the path
# from development to production with reliable, repeatable workflows.
#
# This script orchestrates:
# - Infrastructure provisioning (Bicep)
# - Container image builds
# - Azure Container Registry pushes
# - Container Apps deployment
# - Health validation
#
# Best for: Complete environment deployment (dev, staging, prod)
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
echo "║   Agent Studio - Full Stack Deployment                        ║"
echo "║   Streamline deployment workflows for sustainable operations  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

#######################################################################
# Configuration & Validation
#######################################################################

# Parse arguments
ENV=${1:-dev}
REGION=${2:-eastus}
PROJECT_NAME=${3:-agent-studio}
SKIP_INFRA=${4:-false}

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENV"
    echo "Usage: $0 <environment> [region] [project-name] [skip-infra]"
    echo "  environment: dev, staging, or prod"
    echo "  region: Azure region (default: eastus)"
    echo "  project-name: Project name prefix (default: agent-studio)"
    echo "  skip-infra: Skip infrastructure deployment (default: false)"
    exit 1
fi

print_status "Deployment configuration:"
echo "  Environment:   $ENV"
echo "  Region:        $REGION"
echo "  Project:       $PROJECT_NAME"
echo "  Skip Infra:    $SKIP_INFRA"
echo ""

# Determine script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

print_status "Project root: $PROJECT_ROOT"

# Check Azure CLI
if ! command -v az >/dev/null 2>&1; then
    print_error "Azure CLI is required but not installed"
    print_error "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is required but not installed"
    print_error "Install from: https://www.docker.com/get-started"
    exit 1
fi

# Check Azure login
print_status "Validating Azure authentication..."
if ! az account show >/dev/null 2>&1; then
    print_error "Not logged in to Azure"
    print_status "Please run: az login"
    exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
print_success "Authenticated to Azure"
print_status "Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
echo ""

#######################################################################
# PHASE 1: Infrastructure Deployment
#######################################################################

if [ "$SKIP_INFRA" == "false" ]; then
    print_status "PHASE 1: Deploying infrastructure to Azure..."
    echo ""

    cd "$INFRA_DIR"

    # Validate Bicep templates
    print_status "Validating Bicep templates..."
    if ! az bicep build --file deploy.bicep; then
        print_error "Bicep validation failed"
        exit 1
    fi
    print_success "Bicep templates validated successfully"

    # Deploy infrastructure
    print_status "Deploying infrastructure (this may take 10-15 minutes)..."

    DEPLOYMENT_NAME="agent-studio-${ENV}-$(date +%Y%m%d-%H%M%S)"

    # Check if parameters file exists
    PARAMS_FILE="deploy.parameters.${ENV}.json"
    if [ ! -f "$PARAMS_FILE" ]; then
        print_warning "Parameters file not found: $PARAMS_FILE"
        print_status "Using inline parameters..."

        az deployment sub create \
            --name "$DEPLOYMENT_NAME" \
            --location "$REGION" \
            --template-file deploy.bicep \
            --parameters environment="$ENV" \
            --parameters projectName="$PROJECT_NAME" \
            --parameters location="$REGION"
    else
        print_status "Using parameters file: $PARAMS_FILE"

        az deployment sub create \
            --name "$DEPLOYMENT_NAME" \
            --location "$REGION" \
            --template-file deploy.bicep \
            --parameters "@$PARAMS_FILE"
    fi

    if [ $? -eq 0 ]; then
        print_success "Infrastructure deployed successfully"
    else
        print_error "Infrastructure deployment failed"
        exit 1
    fi

    echo ""
else
    print_status "PHASE 1: Skipping infrastructure deployment (SKIP_INFRA=true)"
    echo ""
fi

#######################################################################
# PHASE 2: Retrieve Deployment Outputs
#######################################################################

print_status "PHASE 2: Retrieving deployment outputs..."
echo ""

# Get resource group name
RESOURCE_GROUP="${PROJECT_NAME}-${ENV}-rg"
print_status "Resource Group: $RESOURCE_GROUP"

# Verify resource group exists
if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
    print_error "Resource group not found: $RESOURCE_GROUP"
    print_error "Please ensure infrastructure is deployed first"
    exit 1
fi

# Get ACR name
ACR_NAME=$(az acr list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)
if [ -z "$ACR_NAME" ]; then
    print_error "Azure Container Registry not found in resource group"
    exit 1
fi
print_status "Container Registry: $ACR_NAME"

# Get Container Apps Environment name
CAE_NAME=$(az containerapp env list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)
if [ -z "$CAE_NAME" ]; then
    print_warning "Container Apps Environment not found - will skip container deployment"
    CAE_NAME=""
fi

echo ""

#######################################################################
# PHASE 3: Build and Push Container Images
#######################################################################

print_status "PHASE 3: Building and pushing container images..."
echo ""

# Login to ACR
print_status "Authenticating to Azure Container Registry..."
az acr login --name "$ACR_NAME"
print_success "ACR authentication successful"

ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
IMAGE_TAG="${ENV}-$(date +%Y%m%d-%H%M%S)"

cd "$PROJECT_ROOT"

# Build Webapp image
if [ -f "webapp/package.json" ]; then
    print_status "Building webapp container image..."

    docker build \
        -t "${ACR_LOGIN_SERVER}/webapp:${IMAGE_TAG}" \
        -t "${ACR_LOGIN_SERVER}/webapp:${ENV}-latest" \
        -f Dockerfile.webapp \
        .

    print_status "Pushing webapp image to ACR..."
    docker push "${ACR_LOGIN_SERVER}/webapp:${IMAGE_TAG}"
    docker push "${ACR_LOGIN_SERVER}/webapp:${ENV}-latest"

    print_success "Webapp image pushed successfully"
else
    print_warning "Skipping webapp build - webapp/package.json not found"
fi

# Build .NET API image
if [ -f "services/dotnet/AgentStudio.sln" ]; then
    print_status "Building .NET API container image..."

    docker build \
        -t "${ACR_LOGIN_SERVER}/dotnet-api:${IMAGE_TAG}" \
        -t "${ACR_LOGIN_SERVER}/dotnet-api:${ENV}-latest" \
        -f Dockerfile.api \
        .

    print_status "Pushing .NET API image to ACR..."
    docker push "${ACR_LOGIN_SERVER}/dotnet-api:${IMAGE_TAG}"
    docker push "${ACR_LOGIN_SERVER}/dotnet-api:${ENV}-latest"

    print_success ".NET API image pushed successfully"
else
    print_warning "Skipping .NET API build - services/dotnet/AgentStudio.sln not found"
fi

# Build Python worker image
if [ -f "src/python/pyproject.toml" ]; then
    print_status "Building Python worker container image..."

    docker build \
        -t "${ACR_LOGIN_SERVER}/python-worker:${IMAGE_TAG}" \
        -t "${ACR_LOGIN_SERVER}/python-worker:${ENV}-latest" \
        -f Dockerfile.worker \
        .

    print_status "Pushing Python worker image to ACR..."
    docker push "${ACR_LOGIN_SERVER}/python-worker:${IMAGE_TAG}"
    docker push "${ACR_LOGIN_SERVER}/python-worker:${ENV}-latest"

    print_success "Python worker image pushed successfully"
else
    print_warning "Skipping Python worker build - src/python/pyproject.toml not found"
fi

echo ""

#######################################################################
# PHASE 4: Deploy to Container Apps
#######################################################################

if [ -n "$CAE_NAME" ]; then
    print_status "PHASE 4: Deploying to Azure Container Apps..."
    echo ""

    # Deploy Webapp
    WEBAPP_NAME="${PROJECT_NAME}-webapp-${ENV}"
    if az containerapp show --name "$WEBAPP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_status "Updating webapp container app..."

        az containerapp update \
            --name "$WEBAPP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --image "${ACR_LOGIN_SERVER}/webapp:${IMAGE_TAG}"

        print_success "Webapp updated successfully"
    else
        print_status "Creating webapp container app..."

        az containerapp create \
            --name "$WEBAPP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --environment "$CAE_NAME" \
            --image "${ACR_LOGIN_SERVER}/webapp:${IMAGE_TAG}" \
            --target-port 80 \
            --ingress external \
            --min-replicas 1 \
            --max-replicas 3

        print_success "Webapp created successfully"
    fi

    # Deploy .NET API
    API_NAME="${PROJECT_NAME}-api-${ENV}"
    if az containerapp show --name "$API_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_status "Updating API container app..."

        az containerapp update \
            --name "$API_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --image "${ACR_LOGIN_SERVER}/dotnet-api:${IMAGE_TAG}"

        print_success "API updated successfully"
    else
        print_status "Creating API container app..."

        az containerapp create \
            --name "$API_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --environment "$CAE_NAME" \
            --image "${ACR_LOGIN_SERVER}/dotnet-api:${IMAGE_TAG}" \
            --target-port 80 \
            --ingress external \
            --min-replicas 1 \
            --max-replicas 5

        print_success "API created successfully"
    fi

    # Deploy Python Worker
    WORKER_NAME="${PROJECT_NAME}-worker-${ENV}"
    if az containerapp show --name "$WORKER_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        print_status "Updating worker container app..."

        az containerapp update \
            --name "$WORKER_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --image "${ACR_LOGIN_SERVER}/python-worker:${IMAGE_TAG}"

        print_success "Worker updated successfully"
    else
        print_status "Creating worker container app..."

        az containerapp create \
            --name "$WORKER_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --environment "$CAE_NAME" \
            --image "${ACR_LOGIN_SERVER}/python-worker:${IMAGE_TAG}" \
            --target-port 8000 \
            --ingress internal \
            --min-replicas 1 \
            --max-replicas 10

        print_success "Worker created successfully"
    fi

    echo ""
else
    print_warning "PHASE 4: Skipping Container Apps deployment - environment not found"
    echo ""
fi

#######################################################################
# PHASE 5: Health Validation
#######################################################################

print_status "PHASE 5: Validating deployment health..."
echo ""

# Get webapp URL
if [ -n "$CAE_NAME" ]; then
    WEBAPP_URL=$(az containerapp show \
        --name "$WEBAPP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" -o tsv)

    if [ -n "$WEBAPP_URL" ]; then
        WEBAPP_URL="https://${WEBAPP_URL}"
        print_status "Webapp URL: $WEBAPP_URL"

        # Wait for deployment
        print_status "Waiting for webapp to become healthy..."
        sleep 30

        # Health check (simple HTTP check)
        if curl -f -s -o /dev/null "$WEBAPP_URL"; then
            print_success "Webapp is responding"
        else
            print_warning "Webapp health check failed - may need more time to start"
        fi
    fi

    # Get API URL
    API_URL=$(az containerapp show \
        --name "$API_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" -o tsv)

    if [ -n "$API_URL" ]; then
        API_URL="https://${API_URL}"
        print_status "API URL: $API_URL"

        # Health check
        if curl -f -s -o /dev/null "${API_URL}/health" || curl -f -s -o /dev/null "$API_URL"; then
            print_success "API is responding"
        else
            print_warning "API health check failed - may need more time to start"
        fi
    fi
fi

echo ""

#######################################################################
# COMPLETION
#######################################################################

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Deployment Complete - Platform Ready                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_success "Agent Studio deployed to Azure successfully"
echo ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo "  Environment:       $ENV"
echo "  Resource Group:    $RESOURCE_GROUP"
echo "  Container Registry: $ACR_NAME"
echo "  Image Tag:         $IMAGE_TAG"
echo ""

if [ -n "$WEBAPP_URL" ]; then
    echo -e "${BLUE}Access Points:${NC}"
    echo "  Webapp:  $WEBAPP_URL"
    echo "  API:     $API_URL"
    echo ""
fi

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Configure secrets: ./infra/scripts/set-secrets.sh <key-vault-name>"
echo "  2. Verify deployment: Visit webapp URL and test functionality"
echo "  3. Monitor logs: az containerapp logs show --name <app-name> --resource-group $RESOURCE_GROUP"
echo "  4. View metrics: Azure Portal > Container Apps"
echo ""

print_success "Deployment automation complete - sustainable operations established"
