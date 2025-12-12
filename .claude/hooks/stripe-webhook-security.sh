#!/bin/bash
# Stripe Webhook Security Hook
# Validates Stripe webhook handlers for security best practices

# Hook Configuration
# Event: file:save
# Pattern: **/webhook*.ts, **/stripe*.ts
# Priority: critical

set -e

FILE_PATH="$1"
HOOK_NAME="stripe-webhook-security"

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

# Skip if not relevant file
if [[ ! "$FILE_PATH" =~ webhook ]] && [[ ! "$FILE_PATH" =~ stripe ]]; then
    exit 0
fi

VIOLATIONS=0

# Check 1: Webhook signature verification
if grep -n "stripe.webhooks" "$FILE_PATH" > /dev/null 2>&1; then
    if ! grep -q "constructEvent" "$FILE_PATH"; then
        log_error "Stripe webhook detected but constructEvent (signature verification) not found!"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
fi

# Check 2: Raw body parser for webhooks
if grep -q "constructEvent" "$FILE_PATH"; then
    if ! grep -q "bodyParser.*false\|raw\|buffer" "$FILE_PATH" && \
       ! grep -q "micro\|getRawBody\|buffer(req)" "$FILE_PATH"; then
        log_warn "Webhook signature verification requires raw body - ensure bodyParser is disabled"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
fi

# Check 3: STRIPE_WEBHOOK_SECRET usage
if grep -q "constructEvent" "$FILE_PATH"; then
    if ! grep -q "STRIPE_WEBHOOK_SECRET\|webhookSecret\|webhook_secret" "$FILE_PATH"; then
        log_error "Webhook secret not referenced - signature verification will fail!"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
fi

# Check 4: Idempotency for payment operations
if grep -q "paymentIntents\|charges\|subscriptions" "$FILE_PATH"; then
    if ! grep -q "idempotencyKey\|idempotency_key\|Idempotency-Key" "$FILE_PATH"; then
        log_warn "Payment operation without idempotency key detected"
    fi
fi

# Check 5: Error handling in webhooks
if grep -q "handleStripeEvent\|webhook" "$FILE_PATH"; then
    if ! grep -q "try.*catch\|\.catch" "$FILE_PATH"; then
        log_warn "Webhook handler should have error handling"
    fi
fi

# Check 6: Metadata with org_id
if grep -q "stripe\.\w\+\.create\|stripe\.\w\+\.update" "$FILE_PATH"; then
    if ! grep -q "metadata.*org_id\|org_id.*metadata" "$FILE_PATH"; then
        log_warn "Stripe operations should include org_id in metadata for multi-tenant tracking"
    fi
fi

if [ $VIOLATIONS -gt 0 ]; then
    log_error "Found $VIOLATIONS critical Stripe security issues!"
    exit 1
else
    log_info "Stripe webhook security validated"
fi

exit 0
