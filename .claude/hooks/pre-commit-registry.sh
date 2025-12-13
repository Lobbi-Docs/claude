#!/usr/bin/env bash
#
# Pre-Commit Registry Validation Hook
#
# Runs registry integrity validation before allowing commits.
# Blocks commits if critical errors are found.
#
# Installation:
#   ln -sf ../../.claude/hooks/pre-commit-registry.sh .git/hooks/pre-commit
#
# Or add to existing pre-commit hook:
#   .claude/hooks/pre-commit-registry.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CORE_DIR="$CLAUDE_DIR/core"
REGISTRY_DIR="$CLAUDE_DIR/registry"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not in a git repository, skipping registry validation${NC}"
    exit 0
fi

# Check if any registry files are being committed
REGISTRY_FILES_STAGED=$(git diff --cached --name-only | grep -E "^\.claude/registry/.*\.json$" || true)

if [ -z "$REGISTRY_FILES_STAGED" ]; then
    echo -e "${BLUE}ℹ️  No registry files staged, skipping validation${NC}"
    exit 0
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Registry Integrity Pre-Commit Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js to run registry validation.${NC}"
    echo -e "${YELLOW}   Skipping validation (not recommended)${NC}"
    exit 0
fi

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install npm/npx.${NC}"
    echo -e "${YELLOW}   Skipping validation (not recommended)${NC}"
    exit 0
fi

# Install dependencies if needed
if [ ! -d "$CORE_DIR/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing registry validator dependencies...${NC}"
    (cd "$CORE_DIR" && npm install --silent)
    echo
fi

# Create temporary directory for validation
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Export staged registry files to temp directory
echo -e "${BLUE}📋 Exporting staged registry files...${NC}"
for file in $REGISTRY_FILES_STAGED; do
    mkdir -p "$TEMP_DIR/$(dirname "$file")"
    git show ":$file" > "$TEMP_DIR/$file"
done
echo

# Run validation on staged files
echo -e "${BLUE}🔍 Validating registry integrity...${NC}"
echo

# Run validator
VALIDATOR_SCRIPT="$CORE_DIR/registry-validator.ts"

if [ ! -f "$VALIDATOR_SCRIPT" ]; then
    echo -e "${RED}❌ Registry validator not found at: $VALIDATOR_SCRIPT${NC}"
    echo -e "${YELLOW}   Skipping validation${NC}"
    exit 0
fi

# Execute validator
VALIDATION_OUTPUT=$(cd "$CORE_DIR" && npx tsx "$VALIDATOR_SCRIPT" "$TEMP_DIR/.claude" 2>&1)
VALIDATION_EXIT_CODE=$?

# Display validation output
echo "$VALIDATION_OUTPUT"

# Parse validation results
ERRORS=$(echo "$VALIDATION_OUTPUT" | grep -oP '\d+(?= Error\(s\))' || echo "0")
WARNINGS=$(echo "$VALIDATION_OUTPUT" | grep -oP '\d+(?= Warning\(s\))' || echo "0")

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Determine if commit should be allowed
if [ "$VALIDATION_EXIT_CODE" -ne 0 ] || [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ Registry validation FAILED!${NC}"
    echo
    echo -e "${YELLOW}Errors found: ${ERRORS}${NC}"
    echo -e "${YELLOW}Warnings found: ${WARNINGS}${NC}"
    echo
    echo -e "${YELLOW}To fix these issues:${NC}"
    echo -e "  1. Run: ${BLUE}/registry-check${NC} to see details"
    echo -e "  2. Run: ${BLUE}/registry-check --fix${NC} to auto-fix"
    echo -e "  3. Manually fix remaining errors"
    echo -e "  4. Re-stage your changes: ${BLUE}git add .claude/registry/${NC}"
    echo -e "  5. Try committing again"
    echo
    echo -e "${RED}Commit blocked to prevent invalid registry state.${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
else
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Registry validation passed with ${WARNINGS} warning(s)${NC}"
        echo
        echo -e "${YELLOW}Consider running:${NC}"
        echo -e "  ${BLUE}/registry-check --verbose${NC} to see warning details"
        echo
    else
        echo -e "${GREEN}✅ Registry validation PASSED!${NC}"
    fi
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
fi
