# Initialize Project

Set up or verify Golden Armada development environment.

## Instructions

Run environment checks and initialization steps:

### 1. Verify Prerequisites

\`\`\`bash
# Check required tools
echo "=== Checking Prerequisites ==="

# Python
python3 --version || echo "Python 3 not found"

# Docker
docker --version || echo "Docker not found"

# Kubernetes tools
kubectl version --client || echo "kubectl not found"
helm version || echo "Helm not found"

# Node.js (for Claude CLI)
node --version || echo "Node.js not found"
npm --version || echo "npm not found"
\`\`\`

### 2. Install Python Dependencies

\`\`\`bash
# Create virtual environment if needed
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate and install
source venv/bin/activate
pip install -r requirements.txt 2>/dev/null || echo "No requirements.txt found"

# Install dev dependencies
pip install pytest pytest-cov flake8 mypy black
\`\`\`

### 3. Verify Docker Setup

\`\`\`bash
# Check Docker daemon
docker info > /dev/null 2>&1 || echo "Docker daemon not running"

# Verify can build
docker build --help > /dev/null 2>&1 && echo "Docker build available"
\`\`\`

### 4. Verify Kubernetes Access

\`\`\`bash
# Check cluster connection
kubectl cluster-info 2>/dev/null || echo "No Kubernetes cluster configured"

# Check namespace
kubectl get namespace agents 2>/dev/null || echo "Namespace 'agents' not found"
\`\`\`

### 5. Verify Helm Chart

\`\`\`bash
# Lint the chart
helm lint ./deployment/helm/golden-armada 2>/dev/null || echo "Helm chart validation failed"
\`\`\`

### 6. Set Up Pre-commit Hooks (Optional)

\`\`\`bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files
\`\`\`

### 7. Initialize Claude Flow (Optional)

\`\`\`bash
# If using Claude Flow MCP
npx claude-flow@alpha init 2>/dev/null || echo "Claude Flow not available"
\`\`\`

## Output

After initialization, you should see:
- All prerequisites installed
- Python virtual environment ready
- Docker operational
- Kubernetes accessible (if configured)
- Helm chart valid

## Next Steps

After initialization:
1. Run tests: `/test`
2. Build images: `/build-agent`
3. Deploy: `/deploy`
