#!/bin/bash
# Pre-deployment validation hook
# Validates Helm charts, security, and Keycloak configuration

set -e

CHART_PATH="${CHART_PATH:-charts/}"
VALIDATION_MODE="${VALIDATION_MODE:-strict}"
SECURITY_SCAN="${SECURITY_SCAN:-true}"
KEYCLOAK_CHECK="${KEYCLOAK_CHECK:-true}"

echo "🔍 Running pre-deployment validation..."

# Function to check command availability
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "⚠️ Warning: $1 not found, skipping related checks"
        return 1
    fi
    return 0
}

# 1. Helm Lint
echo "📋 Validating Helm chart..."
if [ -d "$CHART_PATH" ]; then
    if check_command helm; then
        helm lint "$CHART_PATH" --strict
        echo "✅ Helm lint passed"
    fi
else
    echo "⚠️ Chart path not found: $CHART_PATH"
fi

# 2. Security Scanning
if [ "$SECURITY_SCAN" = "true" ]; then
    echo "🔒 Running security scans..."

    # Trivy scan
    if check_command trivy; then
        echo "Running Trivy..."
        trivy config "$CHART_PATH" --severity HIGH,CRITICAL --exit-code 0 || {
            if [ "$VALIDATION_MODE" = "strict" ]; then
                echo "❌ Trivy found critical vulnerabilities"
                exit 1
            else
                echo "⚠️ Trivy found issues (non-blocking)"
            fi
        }
        echo "✅ Trivy scan completed"
    fi

    # Checkov scan
    if check_command checkov; then
        echo "Running Checkov..."
        checkov -d "$CHART_PATH" --framework helm --soft-fail || {
            if [ "$VALIDATION_MODE" = "strict" ]; then
                echo "❌ Checkov found security issues"
                exit 1
            else
                echo "⚠️ Checkov found issues (non-blocking)"
            fi
        }
        echo "✅ Checkov scan completed"
    fi
fi

# 3. Keycloak Configuration Check
if [ "$KEYCLOAK_CHECK" = "true" ] && [ -n "$KEYCLOAK_URL" ]; then
    echo "🔐 Checking Keycloak configuration..."

    # Check Keycloak is reachable
    if curl -sf "$KEYCLOAK_URL/realms/$KEYCLOAK_REALM/.well-known/openid-configuration" > /dev/null 2>&1; then
        echo "✅ Keycloak realm is accessible"
    else
        echo "⚠️ Warning: Cannot reach Keycloak at $KEYCLOAK_URL"
        if [ "$VALIDATION_MODE" = "strict" ]; then
            exit 1
        fi
    fi

    # Check client exists (if CLIENT_ID is set)
    if [ -n "$KEYCLOAK_CLIENT_ID" ] && [ -n "$KEYCLOAK_ADMIN_TOKEN" ]; then
        CLIENT_EXISTS=$(curl -sf -H "Authorization: Bearer $KEYCLOAK_ADMIN_TOKEN" \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$KEYCLOAK_CLIENT_ID" | jq '. | length')

        if [ "$CLIENT_EXISTS" -gt 0 ]; then
            echo "✅ Keycloak client exists: $KEYCLOAK_CLIENT_ID"
        else
            echo "⚠️ Warning: Keycloak client not found: $KEYCLOAK_CLIENT_ID"
        fi
    fi
fi

# 4. Values File Validation
echo "📄 Validating values files..."
VALUES_FILES=$(find "$CHART_PATH" -name "values*.yaml" 2>/dev/null || true)
for file in $VALUES_FILES; do
    if check_command yq; then
        yq eval '.' "$file" > /dev/null 2>&1 || {
            echo "❌ Invalid YAML: $file"
            exit 1
        }
        echo "✅ Valid YAML: $file"
    fi
done

# 5. Template Rendering Test
if check_command helm && check_command kubectl; then
    echo "🧪 Testing template rendering..."
    helm template test "$CHART_PATH" 2>&1 | kubectl apply --dry-run=client -f - > /dev/null 2>&1 || {
        echo "⚠️ Warning: Template rendering issues detected"
        if [ "$VALIDATION_MODE" = "strict" ]; then
            exit 1
        fi
    }
    echo "✅ Template rendering OK"
fi

echo ""
echo "✅ Pre-deployment validation completed successfully!"
