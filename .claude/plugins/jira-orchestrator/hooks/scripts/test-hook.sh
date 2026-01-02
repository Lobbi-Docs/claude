#!/usr/bin/env bash
# Integration test for Jira issue detection hook
# Tests the detection script with various inputs and validates output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DETECT_SCRIPT="${SCRIPT_DIR}/detect-jira-key.sh"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_detection() {
    local test_name="$1"
    local input="$2"
    local expected_detected="$3"
    local expected_action="$4"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "${YELLOW}Test ${TESTS_RUN}: ${test_name}${NC}"
    echo "  Input: $input"

    # Run detection script
    result=$(echo "$input" | bash "$DETECT_SCRIPT")

    # Parse results using more precise extraction
    detected=$(echo "$result" | grep '"detected":' | head -1 | sed 's/.*"detected": \([0-9]*\).*/\1/')
    action=$(echo "$result" | grep '"action_detected":' | head -1 | sed 's/.*"action_detected": \([a-z]*\).*/\1/')

    # Validate
    if [ "$detected" -eq "$expected_detected" ] && [ "$action" = "$expected_action" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (detected: $detected, action: $action)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}✗ FAIL${NC} (expected: detected=$expected_detected, action=$expected_action, got: detected=$detected, action=$action)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "  Output: $result"
    fi
    echo ""
}

echo "======================================"
echo "Jira Issue Detection Hook Test Suite"
echo "======================================"
echo ""

# Test cases
test_detection "Single issue with action verb" \
    "I need to work on PROJ-123" \
    1 \
    "true"

test_detection "Multiple issues with action verbs" \
    "Fix PROJ-123 and implement ABC-456" \
    2 \
    "true"

test_detection "Casual mention without action" \
    "PROJ-123 is related to authentication" \
    1 \
    "false"

test_detection "No Jira keys" \
    "How do I write a React component?" \
    0 \
    "false"

test_detection "Question about issue" \
    "What's the status of DEV-789?" \
    1 \
    "false"

test_detection "Complex project key" \
    "Start work on DEVELOPMENT-1234" \
    1 \
    "true"

test_detection "Multiple issues with various action verbs" \
    "Complete PROJ-111, start PROJ-222, and fix PROJ-333" \
    3 \
    "true"

test_detection "Help request" \
    "Can you help with PROJ-999?" \
    1 \
    "true"

test_detection "Edge case: version number (should not match)" \
    "The version is 1.2-345" \
    0 \
    "false"

test_detection "Tackle action verb" \
    "Let's tackle BACKEND-101" \
    1 \
    "true"

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
    echo "Failed: $TESTS_FAILED"
fi
echo ""

# Exit code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
