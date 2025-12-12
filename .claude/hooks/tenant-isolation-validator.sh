#!/bin/bash
# Tenant Isolation Validator Hook
# Runs on file save to validate tenant isolation patterns in TypeScript files

# Hook Configuration
# Event: file:save
# Pattern: **/*.ts
# Priority: high

set -e

FILE_PATH="$1"
HOOK_NAME="tenant-isolation-validator"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[${HOOK_NAME}]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[${HOOK_NAME}]${NC} $1"
}

log_error() {
    echo -e "${RED}[${HOOK_NAME}]${NC} $1"
}

# Skip if not a TypeScript file
if [[ ! "$FILE_PATH" =~ \.ts$ ]]; then
    exit 0
fi

# Skip test files
if [[ "$FILE_PATH" =~ \.test\.ts$ ]] || [[ "$FILE_PATH" =~ \.spec\.ts$ ]]; then
    exit 0
fi

# Check for tenant isolation patterns
VIOLATIONS=0

# Pattern 1: Direct Prisma queries without orgId filter
if grep -n "prisma\.\w\+\.find" "$FILE_PATH" | grep -v "where.*orgId" > /dev/null 2>&1; then
    log_warn "Potential missing orgId filter in Prisma query"
    grep -n "prisma\.\w\+\.find" "$FILE_PATH" | grep -v "where.*orgId"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: Create operations without orgId
if grep -n "prisma\.\w\+\.create" "$FILE_PATH" | grep -v "orgId" > /dev/null 2>&1; then
    log_warn "Potential missing orgId in create operation"
    grep -n "prisma\.\w\+\.create" "$FILE_PATH" | grep -v "orgId"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 3: Using findUnique without tenant validation
if grep -n "findUnique" "$FILE_PATH" > /dev/null 2>&1; then
    # Check if there's a subsequent orgId check
    if ! grep -A5 "findUnique" "$FILE_PATH" | grep -q "orgId"; then
        log_warn "findUnique without apparent tenant validation"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
fi

# Pattern 4: Raw SQL queries (potential bypass)
if grep -n "prisma\.\$queryRaw" "$FILE_PATH" > /dev/null 2>&1; then
    log_warn "Raw SQL query detected - ensure tenant isolation is enforced"
    grep -n "prisma\.\$queryRaw" "$FILE_PATH"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 5: Missing tenant context in service methods
if grep -n "async \w\+(.*)" "$FILE_PATH" | grep -v "tenant\|orgId\|TenantContext" > /dev/null 2>&1; then
    # This is informational, not a hard violation
    log_info "Some methods may need tenant context parameter"
fi

if [ $VIOLATIONS -gt 0 ]; then
    log_warn "Found $VIOLATIONS potential tenant isolation issues. Please review."
    # Return 0 to not block, just warn
    exit 0
else
    log_info "Tenant isolation patterns validated"
fi

exit 0
