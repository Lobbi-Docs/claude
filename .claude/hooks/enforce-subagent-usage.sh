#!/bin/bash
# Enforce Sub-Agent Usage Hook
# Monitors task complexity and enforces sub-agent orchestration

# Hook Configuration
# Event: task:start, user-prompt-submit
# Pattern: *
# Priority: critical

set -e

HOOK_NAME="enforce-subagent-usage"
TASK_DESCRIPTION="$1"

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

log_reminder() {
    echo -e "${BLUE}[${HOOK_NAME}]${NC} $1"
}

# Task complexity indicators that REQUIRE sub-agents
COMPLEX_KEYWORDS="implement|create|build|develop|refactor|migrate|setup|configure|deploy|test|review|optimize|analyze|design|architect"

# Check task complexity
if echo "$TASK_DESCRIPTION" | grep -iE "$COMPLEX_KEYWORDS" > /dev/null 2>&1; then
    log_reminder "=== SUB-AGENT ORCHESTRATION REQUIRED ==="
    log_reminder ""
    log_reminder "This task appears complex. Follow the 6-phase protocol:"
    log_reminder "  1. EXPLORE (2+ agents) - Research and gather context"
    log_reminder "  2. PLAN (1-2 agents)   - Design the approach"
    log_reminder "  3. CODE (2-4 agents)   - Implement in parallel"
    log_reminder "  4. TEST (2-3 agents)   - Validate the implementation"
    log_reminder "  5. FIX (1-2 agents)    - Address any issues"
    log_reminder "  6. DOCUMENT (1-2)      - Document in Obsidian vault"
    log_reminder ""
    log_reminder "Minimum: 3-5 sub-agents | Maximum: 13 sub-agents"
    log_reminder ""
    log_reminder "Use Task tool with subagent_type for parallel execution"
    log_reminder "==========================================="
fi

# Specific task type reminders
if echo "$TASK_DESCRIPTION" | grep -iE "tenant|multi-tenant|org" > /dev/null 2>&1; then
    log_info "Multi-tenant task detected. Recommended agents:"
    log_info "  - multi-tenant-architect"
    log_info "  - tenant-provisioning-specialist"
    log_info "  - keycloak-realm-admin"
fi

if echo "$TASK_DESCRIPTION" | grep -iE "payment|stripe|subscription|billing" > /dev/null 2>&1; then
    log_info "Payment task detected. Recommended agents:"
    log_info "  - stripe-integration-specialist"
    log_info "  - subscription-lifecycle-manager"
    log_info "  - invoice-manager"
fi

if echo "$TASK_DESCRIPTION" | grep -iE "test|e2e|selenium" > /dev/null 2>&1; then
    log_info "Testing task detected. Recommended agents:"
    log_info "  - selenium-test-architect"
    log_info "  - auth-flow-tester"
    log_info "  - member-journey-tester"
fi

if echo "$TASK_DESCRIPTION" | grep -iE "member|enrollment|membership" > /dev/null 2>&1; then
    log_info "Membership task detected. Recommended agents:"
    log_info "  - membership-specialist"
    log_info "  - member-engagement-agent"
    log_info "  - directory-manager"
fi

if echo "$TASK_DESCRIPTION" | grep -iE "theme|styling|branding" > /dev/null 2>&1; then
    log_info "Theming task detected. Recommended agents:"
    log_info "  - theme-system-architect"
    log_info "  - theme-builder"
    log_info "  - white-label-specialist"
fi

exit 0
