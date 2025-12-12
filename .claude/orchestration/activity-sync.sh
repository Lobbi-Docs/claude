#!/bin/bash
# Activity Sync Script
# Syncs fallback JSON logs to Obsidian when MCP is available

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/config.json"

# Extract fallback JSON path from config
FALLBACK_JSON=$(python3 -c "import json; print(json.load(open('$CONFIG_PATH'))['activity_logging']['fallback_json'])" 2>/dev/null)

if [ -z "$FALLBACK_JSON" ]; then
    echo "Error: Could not read fallback_json from config"
    exit 1
fi

# Check if MCP is available
if ! command -v tsx &> /dev/null; then
    echo "tsx not found, skipping sync"
    exit 0
fi

# Check if fallback JSON exists
if [ ! -f "$FALLBACK_JSON" ]; then
    echo "No fallback JSON to sync"
    exit 0
fi

# Check if fallback JSON is empty
ENTRY_COUNT=$(jq length "$FALLBACK_JSON" 2>/dev/null || echo 0)
if [ "$ENTRY_COUNT" -eq 0 ]; then
    echo "No entries to sync"
    exit 0
fi

# Sync entries
echo "Syncing $ENTRY_COUNT entries to Obsidian..."

# Call TypeScript sync function
tsx "${SCRIPT_DIR}/obsidian-mcp-client.ts" syncPendingToObsidian

# Clear fallback JSON after successful sync
if [ $? -eq 0 ]; then
    echo "[]" > "$FALLBACK_JSON"
    echo "Sync complete - cleared fallback JSON"
else
    echo "Sync failed, keeping fallback JSON"
    exit 1
fi
