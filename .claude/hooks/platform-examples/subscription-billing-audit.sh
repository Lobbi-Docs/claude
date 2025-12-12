#!/bin/bash
# Subscription Billing Audit Hook
# Validates subscription and billing code for compliance and accuracy

# Hook Configuration
# Event: file:save
# Pattern: **/subscription*.ts, **/billing*.ts, **/payment*.ts
# Priority: critical

set -e

FILE_PATH="$1"
HOOK_NAME="subscription-billing-audit"

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

# Skip if not billing related
if [[ ! "$FILE_PATH" =~ subscription ]] && [[ ! "$FILE_PATH" =~ billing ]] && [[ ! "$FILE_PATH" =~ payment ]]; then
    exit 0
fi

VIOLATIONS=0
WARNINGS=0

# Check 1: Currency handling
if grep -n "amount\|price\|cost\|total" "$FILE_PATH" > /dev/null 2>&1; then
    # Check for floating point operations on money
    if grep -En "\*\s*0\.\d+|\/ 100|amount\s*\*\s*\d+\.\d+" "$FILE_PATH" > /dev/null 2>&1; then
        log_warn "Floating point money operations detected - use cents/integer arithmetic"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 2: Proration calculations
if grep -n "prorat" "$FILE_PATH" > /dev/null 2>&1; then
    # Ensure proration has date calculations
    if ! grep -q "period\|days\|date\|timestamp" "$FILE_PATH"; then
        log_warn "Proration without date/period calculations"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 3: Audit logging for billing events
if grep -n "create.*subscription\|update.*subscription\|cancel" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "log\|audit\|record\|track" "$FILE_PATH"; then
        log_warn "Subscription changes without audit logging"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 4: Transaction handling
if grep -n "stripe\.\|payment" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "transaction\|\$transaction\|atomic" "$FILE_PATH"; then
        log_warn "Payment operations may need transaction handling"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 5: Refund validation
if grep -n "refund" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "validate\|check\|verify\|amount\s*<=" "$FILE_PATH"; then
        log_warn "Refund without apparent validation"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 6: Plan/tier enforcement
if grep -n "upgrade\|downgrade\|changePlan" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "feature\|limit\|capability\|permission" "$FILE_PATH"; then
        log_warn "Plan change without feature enforcement check"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 7: Invoice generation
if grep -n "invoice" "$FILE_PATH" > /dev/null 2>&1; then
    # Check for required invoice fields
    REQUIRED_FIELDS="amount|date|customer|items|tax|total"
    if ! grep -Eq "$REQUIRED_FIELDS.*$REQUIRED_FIELDS" "$FILE_PATH"; then
        log_info "Ensure invoices include all required fields"
    fi
fi

# Check 8: Trial period handling
if grep -n "trial" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "trialEnd\|trial.*days\|trial.*expire" "$FILE_PATH"; then
        log_warn "Trial handling without expiration check"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 9: Duplicate payment prevention
if grep -n "processPayment\|chargeCustomer\|createCharge" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "idempotency\|duplicate\|already" "$FILE_PATH"; then
        log_warn "Payment processing without duplicate prevention"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 10: Grace period for failed payments
if grep -n "paymentFailed\|payment.*fail" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "grace\|retry\|dunning\|notification" "$FILE_PATH"; then
        log_warn "Failed payment handling without grace period/retry logic"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

if [ $VIOLATIONS -gt 0 ]; then
    log_error "Found $VIOLATIONS billing compliance violations!"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    log_warn "Found $WARNINGS billing warnings. Please review."
fi

log_info "Subscription billing audit completed"
exit 0
