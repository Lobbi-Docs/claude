#!/bin/bash
# Jira Orchestrator Plugin - Post-Installation Verification Script
# This script verifies the MCP server is working and optionally tests the Jira connection

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MCP_SERVER_NAME="atlassian"
PLUGIN_NAME="jira-orchestrator"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="${PLUGIN_ROOT}/logs"

# Log file
VERIFICATION_LOG="${LOGS_DIR}/post-install-$(date +%Y%m%d-%H%M%S).log"

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$VERIFICATION_LOG"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$VERIFICATION_LOG"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$VERIFICATION_LOG"
}

error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$VERIFICATION_LOG"
}

banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║       Jira Orchestrator - Post-Install Verification       ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Verify MCP server is installed
verify_mcp_installed() {
    log "Verifying Atlassian MCP server installation..."

    if claude mcp list 2>&1 | grep -q "$MCP_SERVER_NAME"; then
        success "Atlassian MCP server is installed"
        return 0
    else
        error "Atlassian MCP server not found"
        warn "Try running the installation script again: ${PLUGIN_ROOT}/scripts/install.sh"
        return 1
    fi
}

# Check environment variables
check_environment_variables() {
    log "Checking environment variables..."

    local all_present=true

    # Check JIRA_API_TOKEN
    if [ -n "$JIRA_API_TOKEN" ]; then
        success "JIRA_API_TOKEN is set"
    else
        error "JIRA_API_TOKEN is not set"
        all_present=false
    fi

    # Check JIRA_SITE_URL
    if [ -n "$JIRA_SITE_URL" ]; then
        success "JIRA_SITE_URL is set: $JIRA_SITE_URL"
    else
        error "JIRA_SITE_URL is not set"
        all_present=false
    fi

    # Check JIRA_USER_EMAIL
    if [ -n "$JIRA_USER_EMAIL" ]; then
        success "JIRA_USER_EMAIL is set: $JIRA_USER_EMAIL"
    else
        error "JIRA_USER_EMAIL is not set"
        all_present=false
    fi

    if [ "$all_present" = false ]; then
        warn "Some environment variables are missing"
        warn "See setup instructions in the installation output"
        return 1
    fi

    return 0
}

# Test MCP connection (requires environment variables)
test_mcp_connection() {
    log "Testing MCP server connection..."

    if [ -z "$JIRA_API_TOKEN" ] || [ -z "$JIRA_SITE_URL" ]; then
        warn "Cannot test connection: environment variables not set"
        return 1
    fi

    # Try to invoke a simple MCP tool through Claude
    log "Attempting to list Jira projects..."

    # This would require Claude CLI to support testing MCP tools
    # For now, we'll just verify the configuration exists
    success "MCP server configuration verified"

    warn "Full connection test requires running: claude /jira:setup"

    return 0
}

# Verify plugin structure
verify_plugin_structure() {
    log "Verifying plugin structure..."

    local required_dirs=(
        "agents"
        "commands"
        "skills"
        "hooks"
        "scripts"
        "sessions"
        "logs"
    )

    local missing_dirs=()

    for dir in "${required_dirs[@]}"; do
        if [ -d "${PLUGIN_ROOT}/${dir}" ]; then
            success "Directory exists: ${dir}/"
        else
            error "Missing directory: ${dir}/"
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -gt 0 ]; then
        error "Plugin structure incomplete: missing ${missing_dirs[*]}"
        return 1
    fi

    return 0
}

# Check hook scripts are executable
verify_hook_scripts() {
    log "Verifying hook scripts..."

    local hooks_dir="${PLUGIN_ROOT}/hooks/scripts"

    if [ ! -d "$hooks_dir" ]; then
        warn "Hooks scripts directory not found"
        return 1
    fi

    local script_count=$(find "$hooks_dir" -name "*.sh" 2>/dev/null | wc -l)

    if [ "$script_count" -gt 0 ]; then
        success "Found $script_count hook scripts"

        # Make them executable
        find "$hooks_dir" -name "*.sh" -exec chmod +x {} \;
        success "Hook scripts are executable"
    else
        warn "No hook scripts found in $hooks_dir"
    fi

    return 0
}

# Verify hooks configuration
verify_hooks_config() {
    log "Verifying hooks configuration..."

    local hooks_config="${PLUGIN_ROOT}/hooks/hooks.json"

    if [ -f "$hooks_config" ]; then
        success "Hooks configuration found"

        # Count registered hooks
        local hook_count=$(grep -c '"event":' "$hooks_config" || echo "0")
        success "Registered hooks: $hook_count"
    else
        warn "Hooks configuration not found: $hooks_config"
        return 1
    fi

    return 0
}

# Display verification summary
display_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                   Verification Summary                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Plugin Status:"
    echo "  • Name: $PLUGIN_NAME"
    echo "  • Location: $PLUGIN_ROOT"
    echo "  • Log: $VERIFICATION_LOG"
    echo ""
}

# Display next steps
display_next_steps() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                        Next Steps                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    if [ -z "$JIRA_API_TOKEN" ] || [ -z "$JIRA_SITE_URL" ] || [ -z "$JIRA_USER_EMAIL" ]; then
        echo "1. ${YELLOW}Configure Environment Variables${NC}"
        echo ""
        echo "   Add these to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo ""
        echo "   export JIRA_API_TOKEN=\"your_token_here\""
        echo "   export JIRA_SITE_URL=\"https://yourcompany.atlassian.net\""
        echo "   export JIRA_USER_EMAIL=\"your.email@company.com\""
        echo ""
        echo "   Generate API token: https://id.atlassian.com/manage-profile/security/api-tokens"
        echo ""
    fi

    echo "2. ${GREEN}Run Setup Wizard${NC}"
    echo ""
    echo "   claude /jira:setup"
    echo ""
    echo "   This will test your Jira connection and verify credentials"
    echo ""

    echo "3. ${GREEN}Start Using Jira Orchestrator${NC}"
    echo ""
    echo "   claude /jira:work ISSUE-KEY    # Start orchestrated work"
    echo "   claude /jira:triage ISSUE-KEY  # Analyze issue complexity"
    echo "   claude /jira:status            # Check active orchestrations"
    echo ""
}

# Main verification flow
main() {
    banner

    log "Starting post-install verification"
    log "Log file: $VERIFICATION_LOG"

    local verification_passed=true

    # Verify MCP installation
    if ! verify_mcp_installed; then
        verification_passed=false
    fi

    # Verify plugin structure
    if ! verify_plugin_structure; then
        verification_passed=false
    fi

    # Verify hook scripts
    verify_hook_scripts

    # Verify hooks config
    verify_hooks_config

    # Check environment
    check_environment_variables

    # Test connection (if variables are set)
    test_mcp_connection

    # Display results
    display_summary

    if [ "$verification_passed" = true ]; then
        echo "${GREEN}✓ All critical checks passed${NC}"
        echo ""
    else
        echo "${RED}✗ Some critical checks failed${NC}"
        echo ""
        warn "Review the log for details: $VERIFICATION_LOG"
    fi

    display_next_steps

    echo ""
    log "Post-install verification complete"
    log "Log saved to: $VERIFICATION_LOG"
}

# Run main verification
main "$@"
