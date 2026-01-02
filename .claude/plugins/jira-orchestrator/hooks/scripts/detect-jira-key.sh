#!/usr/bin/env bash
# Jira Issue Key Detection Script
# Extracts Jira issue keys from input text and returns JSON with detected keys

set -euo pipefail

# Read input from stdin or first argument
INPUT="${1:-$(cat)}"

# Jira key pattern: 2-10 uppercase letters, hyphen, one or more digits
# Examples: ABC-123, PROJ-456, DEVELOPMENT-1234
JIRA_KEY_PATTERN='[A-Z]{2,10}-[0-9]+'

# Extract all Jira keys from the input
DETECTED_KEYS=$(echo "$INPUT" | grep -oE "$JIRA_KEY_PATTERN" | sort -u || true)

# Count the number of detected keys
if [ -z "$DETECTED_KEYS" ]; then
    KEY_COUNT=0
else
    KEY_COUNT=$(echo "$DETECTED_KEYS" | grep -c .)
fi

# Build JSON array of detected keys
KEYS_JSON="[]"
if [ "$KEY_COUNT" -gt 0 ]; then
    KEYS_JSON="["
    FIRST=true
    while IFS= read -r key; do
        if [ -n "$key" ]; then
            if [ "$FIRST" = true ]; then
                FIRST=false
            else
                KEYS_JSON="${KEYS_JSON},"
            fi
            KEYS_JSON="${KEYS_JSON}\"${key}\""
        fi
    done <<< "$DETECTED_KEYS"
    KEYS_JSON="${KEYS_JSON}]"
fi

# Detect action verbs that suggest the user wants to work on the issue
ACTION_DETECTED=false
ACTION_VERBS=("work on" "fix" "implement" "complete" "start" "begin" "solve" "resolve" "address" "help with" "tackle")

INPUT_LOWER=$(echo "$INPUT" | tr '[:upper:]' '[:lower:]')

for verb in "${ACTION_VERBS[@]}"; do
    if echo "$INPUT_LOWER" | grep -qi "$verb"; then
        ACTION_DETECTED=true
        break
    fi
done

# Build comma-separated list for display
KEYS_LIST=""
if [ "$KEY_COUNT" -gt 0 ]; then
    KEYS_LIST=$(echo "$DETECTED_KEYS" | tr '\n' ',' | sed 's/,$//')
fi

# Output JSON result
cat <<EOF
{
  "detected": $KEY_COUNT,
  "keys": $KEYS_JSON,
  "keys_list": "$KEYS_LIST",
  "action_detected": $ACTION_DETECTED,
  "suggest_orchestration": $ACTION_DETECTED
}
EOF
