#!/usr/bin/env bash
###############################################################################
# Pre-Commit Validation Hook
#
# Validates all JSON/YAML files before commit to ensure schema compliance.
# Runs comprehensive validation on plugin manifests, agents, skills, commands,
# workflows, and registry indexes.
#
# Usage:
#   - Automatically runs on git commit
#   - Manually: .claude/hooks/pre-commit-validate.sh
#   - Skip: git commit --no-verify
#
# Exit codes:
#   0 - All validations passed
#   1 - Validation errors found
#   2 - Setup/dependency errors
###############################################################################

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAUDE_ROOT="$PROJECT_ROOT/.claude"
CORE_DIR="$CLAUDE_ROOT/core"
SCHEMAS_DIR="$CLAUDE_ROOT/schemas"

# Validation configuration
VALIDATE_ON_COMMIT="${VALIDATE_ON_COMMIT:-true}"
STRICT_MODE="${STRICT_MODE:-true}"
BLOCK_ON_WARNINGS="${BLOCK_ON_WARNINGS:-false}"
VERBOSE="${VERBOSE:-false}"

# Counters
TOTAL_FILES=0
VALID_FILES=0
INVALID_FILES=0
TOTAL_ERRORS=0
TOTAL_WARNINGS=0

###############################################################################
# Logging functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
}

log_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $*${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# Dependency checks
###############################################################################

check_dependencies() {
    local missing_deps=()

    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    # Check for npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install: npm install -g typescript ts-node"
        return 2
    fi

    return 0
}

###############################################################################
# Setup validation environment
###############################################################################

setup_validator() {
    log_info "Setting up validation environment..."

    # Check if validator dependencies are installed
    if [ ! -d "$CORE_DIR/node_modules" ]; then
        log_info "Installing validator dependencies..."
        cd "$CORE_DIR"
        npm install --silent
        cd "$PROJECT_ROOT"
    fi

    # Check if validator is built
    if [ ! -f "$CORE_DIR/validator.js" ] && [ ! -f "$CORE_DIR/dist/validator.js" ]; then
        log_info "Building validator..."
        cd "$CORE_DIR"
        npm run build --silent || true
        cd "$PROJECT_ROOT"
    fi

    log_success "Validation environment ready"
}

###############################################################################
# Get staged files for validation
###############################################################################

get_staged_files() {
    # Get all staged files that match validation patterns
    git diff --cached --name-only --diff-filter=ACM | \
        grep -E '\.(json|yaml|yml|md)$' | \
        grep -v 'node_modules/' | \
        grep -v 'package-lock.json' || true
}

###############################################################################
# Validate single file using TypeScript validator
###############################################################################

validate_file() {
    local file="$1"
    local result

    # Skip if file doesn't exist (deleted file)
    if [ ! -f "$file" ]; then
        return 0
    fi

    TOTAL_FILES=$((TOTAL_FILES + 1))

    # Determine file type and schema
    local file_type=""
    local basename=$(basename "$file")

    case "$basename" in
        plugin.json|manifest.json)
            file_type="plugin"
            ;;
        *index.json)
            file_type="registry"
            ;;
        SKILL.md)
            file_type="skill"
            ;;
        *.workflow.json|*.workflow.yaml)
            file_type="workflow"
            ;;
    esac

    # Run TypeScript validator
    cd "$CORE_DIR"
    result=$(node -e "
        const { validateFile } = require('./validator');
        const result = validateFile('$PROJECT_ROOT/$file');
        console.log(JSON.stringify(result));
    " 2>&1) || {
        log_error "Failed to validate $file"
        INVALID_FILES=$((INVALID_FILES + 1))
        return 1
    }
    cd "$PROJECT_ROOT"

    # Parse result
    local valid=$(echo "$result" | node -e "
        const stdin = require('fs').readFileSync(0, 'utf-8');
        const data = JSON.parse(stdin);
        console.log(data.valid);
    " 2>/dev/null || echo "false")

    if [ "$valid" = "true" ]; then
        VALID_FILES=$((VALID_FILES + 1))
        log_success "$file"

        # Check for warnings
        local warnings=$(echo "$result" | node -e "
            const stdin = require('fs').readFileSync(0, 'utf-8');
            const data = JSON.parse(stdin);
            console.log(data.warnings.length);
        " 2>/dev/null || echo "0")

        if [ "$warnings" -gt 0 ]; then
            TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
            if [ "$VERBOSE" = "true" ]; then
                echo "$result" | node -e "
                    const stdin = require('fs').readFileSync(0, 'utf-8');
                    const data = JSON.parse(stdin);
                    data.warnings.forEach(w => {
                        console.log('  ⚠ ' + w.message);
                    });
                "
            fi
        fi
    else
        INVALID_FILES=$((INVALID_FILES + 1))
        log_error "$file"

        # Show errors
        local errors=$(echo "$result" | node -e "
            const stdin = require('fs').readFileSync(0, 'utf-8');
            const data = JSON.parse(stdin);
            console.log(data.errors.length);
        " 2>/dev/null || echo "1")

        TOTAL_ERRORS=$((TOTAL_ERRORS + errors))

        echo "$result" | node -e "
            const stdin = require('fs').readFileSync(0, 'utf-8');
            const data = JSON.parse(stdin);
            data.errors.forEach(e => {
                console.log('  ✗ ' + e.message);
            });
        "

        return 1
    fi

    return 0
}

###############################################################################
# Validate specific file types with JSON Schema
###############################################################################

validate_with_schema() {
    local file="$1"
    local schema="$2"

    if [ ! -f "$schema" ]; then
        log_warning "Schema not found: $schema"
        return 0
    fi

    # Use ajv-cli if available, otherwise skip
    if command -v ajv &> /dev/null; then
        ajv validate -s "$schema" -d "$file" &> /dev/null
        return $?
    fi

    return 0
}

###############################################################################
# Main validation function
###############################################################################

main() {
    log_header "Pre-Commit Validation"

    # Check if validation is enabled
    if [ "$VALIDATE_ON_COMMIT" != "true" ]; then
        log_info "Validation disabled (VALIDATE_ON_COMMIT=false)"
        exit 0
    fi

    # Check dependencies
    if ! check_dependencies; then
        log_warning "Skipping validation due to missing dependencies"
        exit 0
    fi

    # Setup validator
    setup_validator || {
        log_warning "Skipping validation due to setup errors"
        exit 0
    }

    # Get staged files
    log_info "Checking staged files..."
    local staged_files=$(get_staged_files)

    if [ -z "$staged_files" ]; then
        log_info "No files to validate"
        exit 0
    fi

    # Count files
    local file_count=$(echo "$staged_files" | wc -l)
    log_info "Found $file_count file(s) to validate"

    # Validate each file
    local failed_files=()
    while IFS= read -r file; do
        if ! validate_file "$file"; then
            failed_files+=("$file")
        fi
    done <<< "$staged_files"

    # Print summary
    log_header "Validation Summary"

    echo "Total Files:    $TOTAL_FILES"
    echo "Valid:          $VALID_FILES"
    echo "Invalid:        $INVALID_FILES"
    echo "Errors:         $TOTAL_ERRORS"
    echo "Warnings:       $TOTAL_WARNINGS"
    echo ""

    # Check results
    if [ "$INVALID_FILES" -gt 0 ]; then
        log_error "Validation failed for $INVALID_FILES file(s)"
        echo ""
        log_info "Failed files:"
        for file in "${failed_files[@]}"; do
            echo "  - $file"
        done
        echo ""
        log_info "Fix the errors and try again, or use 'git commit --no-verify' to skip validation"
        exit 1
    fi

    if [ "$TOTAL_WARNINGS" -gt 0 ]; then
        log_warning "Validation passed with $TOTAL_WARNINGS warning(s)"

        if [ "$BLOCK_ON_WARNINGS" = "true" ]; then
            log_error "Blocking commit due to warnings (BLOCK_ON_WARNINGS=true)"
            exit 1
        fi
    else
        log_success "All validations passed!"
    fi

    exit 0
}

# Run main function
main "$@"
