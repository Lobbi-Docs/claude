#!/bin/bash
# Tool installation helper for local development
# Usage: ./install-tools.sh [tool1 tool2 ...]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="amd64"
[ "$ARCH" = "aarch64" ] && ARCH="arm64"

log() {
    echo -e "${BLUE}[installer]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Install Kind
install_kind() {
    log "Installing Kind..."

    KIND_VERSION="v0.20.0"
    curl -Lo ./kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-${OS}-${ARCH}"
    chmod +x ./kind

    if [ -w "/usr/local/bin" ]; then
        mv ./kind /usr/local/bin/kind
    else
        sudo mv ./kind /usr/local/bin/kind
    fi

    success "Kind $(kind --version) installed"
}

# Install Skaffold
install_skaffold() {
    log "Installing Skaffold..."

    curl -Lo skaffold "https://storage.googleapis.com/skaffold/releases/latest/skaffold-${OS}-${ARCH}"
    chmod +x skaffold

    if [ -w "/usr/local/bin" ]; then
        mv skaffold /usr/local/bin/
    else
        sudo mv skaffold /usr/local/bin/
    fi

    success "Skaffold $(skaffold version) installed"
}

# Install yq
install_yq() {
    log "Installing yq..."

    YQ_VERSION="v4.40.5"
    curl -Lo ./yq "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_${OS}_${ARCH}"
    chmod +x ./yq

    if [ -w "/usr/local/bin" ]; then
        mv ./yq /usr/local/bin/yq
    else
        sudo mv ./yq /usr/local/bin/yq
    fi

    success "yq $(yq --version) installed"
}

# Install Trivy
install_trivy() {
    log "Installing Trivy..."

    if [ "$OS" = "darwin" ]; then
        brew install trivy
    else
        curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    fi

    success "Trivy $(trivy --version | head -1) installed"
}

# Install Checkov
install_checkov() {
    log "Installing Checkov..."

    if command -v pip3 &> /dev/null; then
        pip3 install checkov --user
    elif command -v pip &> /dev/null; then
        pip install checkov --user
    else
        warn "pip not found, cannot install checkov"
        return 1
    fi

    success "Checkov installed"
}

# Install Helm (if missing)
install_helm() {
    log "Installing Helm..."

    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    success "Helm $(helm version --short) installed"
}

# Install kubectl (if missing)
install_kubectl() {
    log "Installing kubectl..."

    KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
    curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/${OS}/${ARCH}/kubectl"
    chmod +x kubectl

    if [ -w "/usr/local/bin" ]; then
        mv kubectl /usr/local/bin/
    else
        sudo mv kubectl /usr/local/bin/
    fi

    success "kubectl $(kubectl version --client --short 2>/dev/null || kubectl version --client) installed"
}

# Install AWS CLI
install_awscli() {
    log "Installing AWS CLI..."

    if [ "$OS" = "darwin" ]; then
        brew install awscli
    else
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip -q awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi

    success "AWS CLI $(aws --version) installed"
}

# Check what's missing
check_tools() {
    MISSING=()

    command -v kind &> /dev/null || MISSING+=("kind")
    command -v skaffold &> /dev/null || MISSING+=("skaffold")
    command -v yq &> /dev/null || MISSING+=("yq")
    command -v trivy &> /dev/null || MISSING+=("trivy")
    command -v checkov &> /dev/null || MISSING+=("checkov")
    command -v helm &> /dev/null || MISSING+=("helm")
    command -v kubectl &> /dev/null || MISSING+=("kubectl")
    command -v aws &> /dev/null || MISSING+=("awscli")

    if [ ${#MISSING[@]} -eq 0 ]; then
        success "All tools are installed!"
        return 0
    fi

    echo ""
    echo "Missing tools: ${MISSING[*]}"
    echo ""

    return 1
}

# Main
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              EKS TOOL INSTALLER                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $# -eq 0 ]; then
    # No arguments - check and prompt
    if check_tools; then
        exit 0
    fi

    echo "Install missing tools? (y/n): "
    read -r INSTALL_CONFIRM

    if [ "$INSTALL_CONFIRM" != "y" ]; then
        echo "Skipping installation"
        exit 0
    fi

    TOOLS=("${MISSING[@]}")
else
    TOOLS=("$@")
fi

for tool in "${TOOLS[@]}"; do
    case $tool in
        kind) install_kind ;;
        skaffold) install_skaffold ;;
        yq) install_yq ;;
        trivy) install_trivy ;;
        checkov) install_checkov ;;
        helm) install_helm ;;
        kubectl) install_kubectl ;;
        awscli|aws) install_awscli ;;
        all)
            install_kind
            install_skaffold
            install_yq
            install_trivy
            install_checkov
            ;;
        *)
            warn "Unknown tool: $tool"
            ;;
    esac
done

echo ""
success "Installation complete!"
