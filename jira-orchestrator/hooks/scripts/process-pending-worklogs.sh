#!/bin/bash
# Process Pending Worklogs
# Processes queued worklog entries that failed to post immediately
#
# Usage:
#   process-pending-worklogs.sh [--once]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROCESSOR="$PLUGIN_ROOT/lib/pending_worklog_processor.py"

# Check if processor exists
if [ ! -f "$PROCESSOR" ]; then
    echo "[ERROR] Processor not found: $PROCESSOR"
    exit 1
fi

# Run processor
if [ "$1" == "--once" ]; then
    python "$PROCESSOR" --once
else
    python "$PROCESSOR" --once
fi

exit $?
