#!/usr/bin/env bash
# SessionStart hook — if any project is IN_PROGRESS, nudge the user to resume.
# Delegates all state reading to the shared pm-state library so that bash is
# only responsible for hook-shaped stdin/stdout JSON.
set -euo pipefail

# Drain stdin (hook context is unused here but some runners require read).
cat > /dev/null

LIB="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-state.mjs"
if [ ! -f "$LIB" ]; then
  echo "{}"; exit 0
fi

ACTIVE="$(node "$LIB" active 2>/dev/null || echo '{}')"

if [ "$ACTIVE" = "{}" ] || [ -z "$ACTIVE" ]; then
  echo "{}"
  exit 0
fi

ID="$(printf '%s' "$ACTIVE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).id||'')}catch{}})")"
NAME="$(printf '%s' "$ACTIVE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).name||'')}catch{}})")"

if [ -n "$ID" ]; then
  MSG="Active PM project: ${ID} (${NAME}). Run /pm:status ${ID} to resume."
  # Build JSON safely via node to avoid quoting issues with names.
  printf '%s' "$MSG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{process.stdout.write(JSON.stringify({notification:d}))})"
else
  echo "{}"
fi
