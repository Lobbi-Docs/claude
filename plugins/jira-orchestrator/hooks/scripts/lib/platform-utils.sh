#!/usr/bin/env bash
# Platform Utilities for Cross-Platform Compatibility
# Provides helper functions for Windows Git Bash, macOS, and Linux
#
# Usage: source this file in other scripts
#   source "$(dirname "$0")/lib/platform-utils.sh"

# Detect platform
is_windows() {
    [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]
}

is_macos() {
    [[ "$OSTYPE" == "darwin"* ]]
}

is_linux() {
    [[ "$OSTYPE" == "linux-gnu"* ]]
}

# Get file modification time (Unix timestamp)
# Usage: get_mtime "/path/to/file"
get_mtime() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "0"
        return 1
    fi

    if is_windows; then
        # Windows Git Bash - use Python as fallback
        python -c "import os; print(int(os.path.getmtime('$file')))" 2>/dev/null || echo "0"
    elif is_macos; then
        # macOS uses BSD stat
        stat -f %m "$file" 2>/dev/null || echo "0"
    else
        # Linux uses GNU stat
        stat -c %Y "$file" 2>/dev/null || echo "0"
    fi
}

# Convert ISO date string to Unix timestamp
# Usage: date_to_epoch "2025-12-29T10:00:00.000Z"
date_to_epoch() {
    local datestr="$1"

    if is_windows; then
        # Windows Git Bash - use Python
        python -c "
from datetime import datetime
import sys
try:
    dt = datetime.fromisoformat(sys.argv[1].replace('Z', '+00:00'))
    print(int(dt.timestamp()))
except:
    print(0)
" "$datestr" 2>/dev/null || echo "0"
    elif is_macos; then
        # macOS BSD date
        date -j -f "%Y-%m-%dT%H:%M:%S" "${datestr%%.*}" +%s 2>/dev/null || echo "0"
    else
        # Linux GNU date
        date -d "$datestr" +%s 2>/dev/null || echo "0"
    fi
}

# Get current Unix timestamp
get_current_epoch() {
    date +%s
}

# Calculate age in seconds
# Usage: get_age_seconds "/path/to/file"
get_age_seconds() {
    local file="$1"
    local mtime
    mtime=$(get_mtime "$file")
    local now
    now=$(get_current_epoch)
    echo $((now - mtime))
}

# Check if jq is available
has_jq() {
    command -v jq &> /dev/null
}

# Check if Python is available
has_python() {
    command -v python &> /dev/null || command -v python3 &> /dev/null
}

# Get Python command
get_python() {
    if command -v python3 &> /dev/null; then
        echo "python3"
    elif command -v python &> /dev/null; then
        echo "python"
    else
        echo ""
    fi
}

# Check required dependencies
check_dependencies() {
    local missing=()

    for cmd in "$@"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "ERROR: Missing required dependencies: ${missing[*]}" >&2
        return 1
    fi
    return 0
}

# Platform info for logging
get_platform_info() {
    echo "OS: $OSTYPE | Shell: $SHELL | Bash: $BASH_VERSION"
}

# Export functions
export -f is_windows is_macos is_linux
export -f get_mtime date_to_epoch get_current_epoch get_age_seconds
export -f has_jq has_python get_python check_dependencies get_platform_info
