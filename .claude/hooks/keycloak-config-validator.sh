#!/bin/bash
# Keycloak Configuration Validator Hook
# Validates Keycloak configuration files for security best practices

# Hook Configuration
# Event: file:save
# Pattern: **/keycloak*.json, **/realm*.json, **/*.keycloak.ts
# Priority: high

set -e

FILE_PATH="$1"
HOOK_NAME="keycloak-config-validator"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Skip if not Keycloak related
if [[ ! "$FILE_PATH" =~ keycloak ]] && [[ ! "$FILE_PATH" =~ realm ]]; then
    exit 0
fi

VIOLATIONS=0
WARNINGS=0

# JSON file checks
if [[ "$FILE_PATH" =~ \.json$ ]]; then
    # Check 1: Realm SSL requirement
    if grep -q '"sslRequired"' "$FILE_PATH"; then
        if grep -q '"sslRequired"\s*:\s*"none"' "$FILE_PATH"; then
            log_error "SSL requirement set to 'none' - this is insecure!"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi

    # Check 2: Brute force protection
    if grep -q '"bruteForceProtected"' "$FILE_PATH"; then
        if grep -q '"bruteForceProtected"\s*:\s*false' "$FILE_PATH"; then
            log_warn "Brute force protection is disabled"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    # Check 3: Password policy
    if grep -q '"passwordPolicy"' "$FILE_PATH"; then
        if ! grep -q 'length\|upperCase\|lowerCase\|digits\|specialChars' "$FILE_PATH"; then
            log_warn "Password policy may be too weak"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    # Check 4: Public client with direct access
    if grep -q '"publicClient"\s*:\s*true' "$FILE_PATH"; then
        if grep -q '"directAccessGrantsEnabled"\s*:\s*true' "$FILE_PATH"; then
            log_warn "Public client with direct access grants enabled - review if necessary"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    # Check 5: Redirect URI wildcards
    if grep -q '"redirectUris".*\*' "$FILE_PATH"; then
        log_warn "Wildcard in redirect URIs detected - potential security risk"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check 6: Admin URL exposure
    if grep -q '"adminUrl"' "$FILE_PATH"; then
        if grep -q '"adminUrl"\s*:\s*"http://' "$FILE_PATH"; then
            log_warn "Admin URL using HTTP instead of HTTPS"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

# TypeScript file checks
if [[ "$FILE_PATH" =~ \.ts$ ]]; then
    # Check for hardcoded credentials
    if grep -n "clientSecret\s*[:=]\s*['\"]" "$FILE_PATH" | grep -v "process.env\|config\.\|getSecret" > /dev/null 2>&1; then
        log_error "Hardcoded client secret detected!"
        grep -n "clientSecret\s*[:=]\s*['\"]" "$FILE_PATH" | grep -v "process.env"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi

    # Check for proper admin client usage
    if grep -q "KeycloakAdminClient" "$FILE_PATH"; then
        if ! grep -q "auth(\|grantType" "$FILE_PATH"; then
            log_warn "KeycloakAdminClient used without visible authentication"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    # Check for org_id in token mappers
    if grep -q "protocolMapper\|tokenMapper" "$FILE_PATH"; then
        if ! grep -q "org_id" "$FILE_PATH"; then
            log_info "Consider adding org_id claim mapper for multi-tenant support"
        fi
    fi
fi

if [ $VIOLATIONS -gt 0 ]; then
    log_error "Found $VIOLATIONS security violations!"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    log_warn "Found $WARNINGS security warnings. Please review."
fi

log_info "Keycloak configuration validated"
exit 0
