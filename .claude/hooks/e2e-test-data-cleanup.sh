#!/bin/bash
# E2E Test Data Cleanup Hook
# Ensures test data is properly cleaned up after test runs

# Hook Configuration
# Event: test:complete
# Pattern: e2e, integration
# Priority: medium

set -e

HOOK_NAME="e2e-test-data-cleanup"
TEST_TYPE="${1:-e2e}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[${HOOK_NAME}]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[${HOOK_NAME}]${NC} $1"
}

log_error() {
    echo -e "${RED}[${HOOK_NAME}]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[${HOOK_NAME}]${NC} → $1"
}

# Check if we're in a test environment
if [ "$NODE_ENV" != "test" ] && [ "$NODE_ENV" != "development" ]; then
    log_warn "Not in test/development environment. Skipping cleanup."
    exit 0
fi

log_info "Starting test data cleanup..."

# Step 1: Clean up test organizations
log_step "Cleaning up test organizations..."
if command -v mongosh &> /dev/null; then
    mongosh "$MONGODB_URI" --quiet --eval '
        db.organizations.deleteMany({
            $or: [
                { slug: /^test-/ },
                { name: /^Test Organization/ },
                { "settings.isTestData": true }
            ]
        })
    ' 2>/dev/null || log_warn "Could not clean MongoDB test orgs"
fi

# Step 2: Clean up test members
log_step "Cleaning up test members..."
if command -v mongosh &> /dev/null; then
    mongosh "$MONGODB_URI" --quiet --eval '
        db.members.deleteMany({
            $or: [
                { email: /@test\./ },
                { email: /@example\.com$/ },
                { "metadata.isTestData": true }
            ]
        })
    ' 2>/dev/null || log_warn "Could not clean MongoDB test members"
fi

# Step 3: Clean up Keycloak test users
log_step "Cleaning up Keycloak test users..."
if [ -n "$KEYCLOAK_ADMIN_URL" ] && [ -n "$KEYCLOAK_ADMIN_TOKEN" ]; then
    # Get test users
    TEST_USERS=$(curl -s -X GET \
        "${KEYCLOAK_ADMIN_URL}/admin/realms/${KEYCLOAK_REALM}/users?search=test-" \
        -H "Authorization: Bearer ${KEYCLOAK_ADMIN_TOKEN}" \
        -H "Content-Type: application/json" 2>/dev/null || echo "[]")

    if [ "$TEST_USERS" != "[]" ]; then
        echo "$TEST_USERS" | jq -r '.[].id' | while read -r USER_ID; do
            curl -s -X DELETE \
                "${KEYCLOAK_ADMIN_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}" \
                -H "Authorization: Bearer ${KEYCLOAK_ADMIN_TOKEN}" 2>/dev/null || true
        done
        log_info "Cleaned up Keycloak test users"
    fi
else
    log_warn "Keycloak credentials not set. Skipping Keycloak cleanup."
fi

# Step 4: Clean up Stripe test customers
log_step "Cleaning up Stripe test data..."
if [ -n "$STRIPE_SECRET_KEY" ]; then
    # Only clean up if using test mode
    if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
        # Note: In production, you'd use Stripe API to clean test customers
        log_info "Stripe test mode detected. Manual cleanup may be needed."
    fi
else
    log_warn "Stripe key not set. Skipping Stripe cleanup."
fi

# Step 5: Clean up test screenshots and artifacts
log_step "Cleaning up test artifacts..."
if [ -d "test-artifacts" ]; then
    find test-artifacts -name "*.png" -mtime +1 -delete 2>/dev/null || true
    find test-artifacts -name "*.mp4" -mtime +1 -delete 2>/dev/null || true
    log_info "Cleaned up old test artifacts"
fi

# Step 6: Clean up test logs
log_step "Cleaning up test logs..."
if [ -d "logs" ]; then
    find logs -name "test-*.log" -mtime +7 -delete 2>/dev/null || true
    log_info "Cleaned up old test logs"
fi

# Step 7: Reset Redis test keys
log_step "Cleaning up Redis test data..."
if command -v redis-cli &> /dev/null && [ -n "$REDIS_URL" ]; then
    redis-cli -u "$REDIS_URL" --scan --pattern "test:*" | xargs -r redis-cli -u "$REDIS_URL" del 2>/dev/null || true
    redis-cli -u "$REDIS_URL" --scan --pattern "e2e:*" | xargs -r redis-cli -u "$REDIS_URL" del 2>/dev/null || true
    log_info "Cleaned up Redis test keys"
fi

log_info "Test data cleanup completed successfully!"

# Generate cleanup report
CLEANUP_REPORT=$(cat <<EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "testType": "${TEST_TYPE}",
    "environment": "${NODE_ENV}",
    "cleanedResources": [
        "test organizations",
        "test members",
        "keycloak test users",
        "test artifacts",
        "test logs",
        "redis test keys"
    ]
}
EOF
)

echo "$CLEANUP_REPORT" > "test-artifacts/cleanup-report-$(date +%Y%m%d-%H%M%S).json" 2>/dev/null || true

exit 0
