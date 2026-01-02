#!/bin/bash
# Make all shell scripts executable

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Making scripts executable..."

# Make installation scripts executable
chmod +x "${SCRIPT_DIR}"/*.sh

# Make hook scripts executable
if [ -d "${PLUGIN_ROOT}/hooks/scripts" ]; then
    chmod +x "${PLUGIN_ROOT}/hooks/scripts"/*.sh
fi

echo "Done! All scripts are now executable."
