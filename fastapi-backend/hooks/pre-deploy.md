---
name: pre-deploy
description: Pre-deployment validation hook - runs comprehensive checks before deploying to production
trigger: pre-deploy
enabled: true
---

# Pre-Deploy Validation Hook

This hook runs comprehensive validation before deploying a FastAPI application to production, ensuring security, quality, and reliability.

## Validation Stages

1. **Environment Validation** - Required env vars and secrets
2. **Security Checks** - Vulnerability scanning and secret detection
3. **Test Suite** - Full test run with coverage
4. **Build Validation** - Docker build and health check
5. **Configuration Check** - Production settings verification

## Hook Script

```bash
#!/bin/bash
# hooks/scripts/pre-deploy.sh

set -e

ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-false}"

echo "🚀 Pre-deploy validation for: $ENVIRONMENT"
echo "================================================"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

FAILED=0
WARNINGS=0

# Helper functions
pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=$((FAILED + 1)); }
warn() { echo "  ⚠️  $1"; WARNINGS=$((WARNINGS + 1)); }
info() { echo "  ℹ️  $1"; }

# ============================================
# STAGE 1: Environment Validation
# ============================================
echo ""
echo "📋 Stage 1: Environment Validation"
echo "-----------------------------------"

# Required environment variables for production
REQUIRED_VARS=(
    "MONGODB_URL"
    "REDIS_URL"
    "KEYCLOAK_SERVER_URL"
    "KEYCLOAK_REALM"
    "KEYCLOAK_CLIENT_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] && [ ! -f ".env.$ENVIRONMENT" ]; then
        fail "$var is not set"
    else
        pass "$var is configured"
    fi
done

# Check for production .env file
if [ -f ".env.$ENVIRONMENT" ]; then
    pass "Environment file .env.$ENVIRONMENT exists"
else
    warn "No .env.$ENVIRONMENT file found"
fi

# ============================================
# STAGE 2: Security Checks
# ============================================
echo ""
echo "🔒 Stage 2: Security Checks"
echo "-----------------------------------"

# Check for hardcoded secrets
echo "  Scanning for hardcoded secrets..."
SECRET_PATTERNS='(password|secret|api_key|apikey|token|credential|private_key)\s*=\s*["\047][A-Za-z0-9+/=]{8,}["\047]'
if grep -riE "$SECRET_PATTERNS" app/ --include="*.py" 2>/dev/null | grep -v "# nosec" | grep -v "example" | grep -v "test"; then
    fail "Potential hardcoded secrets found!"
else
    pass "No hardcoded secrets detected"
fi

# Check for debug mode
if grep -r "debug\s*=\s*True" app/ --include="*.py" 2>/dev/null | grep -v "settings.debug"; then
    fail "Debug mode hardcoded to True"
else
    pass "No hardcoded debug mode"
fi

# Vulnerability scanning with pip-audit
if command -v pip-audit &> /dev/null; then
    echo "  Running pip-audit..."
    if pip-audit --strict 2>/dev/null; then
        pass "No known vulnerabilities in dependencies"
    else
        fail "Vulnerable dependencies detected"
    fi
else
    warn "pip-audit not installed, skipping vulnerability scan"
fi

# Safety check
if command -v safety &> /dev/null; then
    echo "  Running safety check..."
    if safety check --full-report 2>/dev/null; then
        pass "Safety check passed"
    else
        warn "Safety check found issues"
    fi
else
    info "safety not installed, skipping"
fi

# ============================================
# STAGE 3: Test Suite
# ============================================
echo ""
echo "🧪 Stage 3: Test Suite"
echo "-----------------------------------"

if command -v pytest &> /dev/null; then
    echo "  Running full test suite..."

    # Run tests with coverage
    if pytest --cov=app --cov-report=term-missing --cov-fail-under=80 -q 2>/dev/null; then
        pass "All tests passed with >80% coverage"
    else
        fail "Tests failed or coverage below 80%"
    fi
else
    fail "pytest not installed"
fi

# ============================================
# STAGE 4: Build Validation
# ============================================
echo ""
echo "🐳 Stage 4: Build Validation"
echo "-----------------------------------"

if command -v docker &> /dev/null; then
    # Build Docker image
    echo "  Building Docker image..."
    IMAGE_TAG="pre-deploy-check:$(date +%s)"

    if docker build -t "$IMAGE_TAG" -f Dockerfile . --quiet 2>/dev/null; then
        pass "Docker build successful"

        # Test container health
        echo "  Testing container health..."
        CONTAINER_ID=$(docker run -d -p 8099:8000 \
            -e MONGODB_URL="${MONGODB_URL:-mongodb://localhost:27017}" \
            -e DATABASE_NAME=test \
            -e ENVIRONMENT=test \
            "$IMAGE_TAG" 2>/dev/null)

        sleep 5

        if curl -sf http://localhost:8099/health > /dev/null 2>&1; then
            pass "Container health check passed"
        else
            fail "Container health check failed"
        fi

        # Cleanup
        docker stop "$CONTAINER_ID" > /dev/null 2>&1 || true
        docker rm "$CONTAINER_ID" > /dev/null 2>&1 || true
        docker rmi "$IMAGE_TAG" > /dev/null 2>&1 || true
    else
        fail "Docker build failed"
    fi
else
    warn "Docker not available, skipping build validation"
fi

# ============================================
# STAGE 5: Configuration Check
# ============================================
echo ""
echo "⚙️  Stage 5: Configuration Check"
echo "-----------------------------------"

# Check Dockerfile exists
if [ -f "Dockerfile" ]; then
    pass "Dockerfile exists"

    # Check for non-root user
    if grep -q "USER" Dockerfile; then
        pass "Non-root user configured"
    else
        warn "No non-root USER in Dockerfile"
    fi

    # Check for health check
    if grep -q "HEALTHCHECK" Dockerfile; then
        pass "HEALTHCHECK configured"
    else
        warn "No HEALTHCHECK in Dockerfile"
    fi
else
    fail "Dockerfile not found"
fi

# Check Kubernetes manifests
if [ -d "deployment/helm" ] || [ -d "k8s" ]; then
    pass "Kubernetes deployment files found"

    # Check resource limits
    if grep -r "resources:" deployment/ k8s/ 2>/dev/null | grep -q "limits"; then
        pass "Resource limits configured"
    else
        warn "No resource limits found in K8s manifests"
    fi
else
    warn "No Kubernetes deployment files found"
fi

# Check for production configs
if [ -f "pyproject.toml" ]; then
    pass "pyproject.toml exists"
else
    warn "pyproject.toml not found"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "================================================"
echo "📊 Pre-Deploy Validation Summary"
echo "================================================"
echo ""
echo "  Environment: $ENVIRONMENT"
echo "  Failures:    $FAILED"
echo "  Warnings:    $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "❌ DEPLOYMENT BLOCKED: $FAILED critical issue(s) found"
    echo ""
    echo "Fix all failures before deploying to $ENVIRONMENT"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  PROCEED WITH CAUTION: $WARNINGS warning(s)"
    if [ "$DRY_RUN" = "true" ]; then
        echo "   (Dry run - would proceed)"
    else
        read -p "   Continue with deployment? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled"
            exit 1
        fi
    fi
fi

echo ""
echo "✅ Pre-deploy validation PASSED"
echo "   Ready to deploy to $ENVIRONMENT"
exit 0
```

## Usage

### Manual Execution

```bash
# Standard production check
./hooks/scripts/pre-deploy.sh production

# Staging environment
./hooks/scripts/pre-deploy.sh staging

# Dry run (no prompts)
./hooks/scripts/pre-deploy.sh production true
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Pre-deploy validation
  run: ./hooks/scripts/pre-deploy.sh production true
  env:
    MONGODB_URL: ${{ secrets.MONGODB_URL }}
    REDIS_URL: ${{ secrets.REDIS_URL }}
    KEYCLOAK_SERVER_URL: ${{ secrets.KEYCLOAK_SERVER_URL }}
    KEYCLOAK_REALM: ${{ secrets.KEYCLOAK_REALM }}
    KEYCLOAK_CLIENT_ID: ${{ secrets.KEYCLOAK_CLIENT_ID }}
```

### Helm Deployment Integration

```bash
# Run pre-deploy before helm upgrade
./hooks/scripts/pre-deploy.sh production && \
helm upgrade --install myapp ./helm/myapp \
    --namespace production \
    -f values-production.yaml
```

## Customization

### Add Custom Checks

Edit the script to add project-specific validations:

```bash
# Example: Check database migrations are current
echo "  Checking migrations..."
if python scripts/migrate.py status | grep -q "pending"; then
    fail "Pending migrations found"
else
    pass "All migrations applied"
fi
```

### Adjust Thresholds

```bash
# Coverage threshold
--cov-fail-under=90  # Increase to 90%

# Required environment variables
REQUIRED_VARS+=("SENTRY_DSN" "NEW_RELIC_KEY")
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Critical failure(s) found |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker not found | Install Docker or skip with `--no-docker` |
| Tests timeout | Increase timeout or skip with `--no-tests` |
| False positive secrets | Add `# nosec` comment |
| Missing env vars | Create `.env.production` or set in CI |
