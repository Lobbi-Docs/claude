#!/bin/bash
# Member Data Privacy Hook
# Validates that member data handling complies with privacy requirements

# Hook Configuration
# Event: file:save
# Pattern: **/member*.ts, **/user*.ts, **/profile*.ts
# Priority: high

set -e

FILE_PATH="$1"
HOOK_NAME="member-data-privacy"

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

# Skip if not member/user related
if [[ ! "$FILE_PATH" =~ member ]] && [[ ! "$FILE_PATH" =~ user ]] && [[ ! "$FILE_PATH" =~ profile ]]; then
    exit 0
fi

# Skip test files
if [[ "$FILE_PATH" =~ \.test\. ]] || [[ "$FILE_PATH" =~ \.spec\. ]]; then
    exit 0
fi

VIOLATIONS=0
WARNINGS=0

# PII Fields that need special handling
PII_FIELDS="email|phone|address|ssn|socialSecurity|dateOfBirth|dob|bankAccount|creditCard"

# Check 1: Logging PII
if grep -En "console\.(log|info|debug|warn|error).*($PII_FIELDS)" "$FILE_PATH" > /dev/null 2>&1; then
    log_warn "Potential PII in console logs detected"
    grep -En "console\.(log|info|debug|warn|error).*($PII_FIELDS)" "$FILE_PATH"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 2: PII in error messages
if grep -En "throw.*Error.*($PII_FIELDS)" "$FILE_PATH" > /dev/null 2>&1; then
    log_warn "Potential PII in error messages"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 3: Bulk data exports without privacy check
if grep -n "export\|download\|csv\|xlsx" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "privacy\|consent\|permission\|authorize" "$FILE_PATH"; then
        log_warn "Data export detected without apparent privacy/permission check"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 4: Member queries returning all fields
if grep -n "findMany\|findAll\|select.*\*" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "select:\s*{" "$FILE_PATH"; then
        log_warn "Query may return all member fields - consider explicit field selection"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 5: Missing data retention checks
if grep -n "delete\|remove\|destroy" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "retention\|archive\|audit" "$FILE_PATH"; then
        log_info "Data deletion without apparent retention/audit handling"
    fi
fi

# Check 6: Third-party data sharing
if grep -En "axios|fetch|http\.(get|post)" "$FILE_PATH" > /dev/null 2>&1; then
    if grep -En "($PII_FIELDS)" "$FILE_PATH" > /dev/null 2>&1; then
        log_warn "Potential PII being sent to external service - ensure compliance"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 7: Directory visibility settings
if [[ "$FILE_PATH" =~ directory ]]; then
    if ! grep -q "visibility\|isPublic\|showInDirectory" "$FILE_PATH"; then
        log_warn "Directory file without visibility controls"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 8: Email/phone masking for display
if grep -n "email\|phone" "$FILE_PATH" > /dev/null 2>&1; then
    if grep -q "display\|render\|show\|view" "$FILE_PATH"; then
        if ! grep -q "mask\|redact\|hide\|partial" "$FILE_PATH"; then
            log_info "Consider masking email/phone for display (e.g., j***@example.com)"
        fi
    fi
fi

# Check 9: Consent tracking
if grep -n "marketing\|newsletter\|communication" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "consent\|optIn\|optOut\|preferences" "$FILE_PATH"; then
        log_warn "Marketing/communication code without consent tracking"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 10: GDPR/CCPA data subject requests
if grep -n "userData\|personalData\|memberData" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "export\|download\|request\|rightTo" "$FILE_PATH"; then
        log_info "Consider implementing data subject request handlers (GDPR/CCPA)"
    fi
fi

if [ $VIOLATIONS -gt 0 ]; then
    log_error "Found $VIOLATIONS privacy violations!"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    log_warn "Found $WARNINGS privacy warnings. Please review for compliance."
fi

log_info "Member data privacy patterns validated"
exit 0
