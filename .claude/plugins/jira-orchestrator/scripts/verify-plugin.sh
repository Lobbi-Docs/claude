#!/bin/bash
# Verify plugin structure and components

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

check_directory() {
    local dir=$1
    if [ -d "${PLUGIN_ROOT}/${dir}" ]; then
        echo "DIR_${dir^^}=EXISTS"
        return 0
    else
        echo "DIR_${dir^^}=MISSING"
        return 1
    fi
}

# Check required directories
all_present=true

check_directory "agents" || all_present=false
check_directory "commands" || all_present=false
check_directory "skills" || all_present=false
check_directory "hooks" || all_present=false
check_directory "scripts" || all_present=false

# Check hooks configuration
if [ -f "${PLUGIN_ROOT}/hooks/hooks.json" ]; then
    echo "HOOKS_CONFIG=EXISTS"
    hook_count=$(grep -c '"event":' "${PLUGIN_ROOT}/hooks/hooks.json" || echo "0")
    echo "HOOK_COUNT=$hook_count"
else
    echo "HOOKS_CONFIG=MISSING"
    all_present=false
fi

# Check hook scripts
if [ -d "${PLUGIN_ROOT}/hooks/scripts" ]; then
    script_count=$(find "${PLUGIN_ROOT}/hooks/scripts" -name "*.sh" | wc -l)
    echo "HOOK_SCRIPTS=$script_count"
else
    echo "HOOK_SCRIPTS=0"
fi

if [ "$all_present" = true ]; then
    echo "PLUGIN_STATUS=VALID"
    exit 0
else
    echo "PLUGIN_STATUS=INCOMPLETE"
    exit 1
fi
