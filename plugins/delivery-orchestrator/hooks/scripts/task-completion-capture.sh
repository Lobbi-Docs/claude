#!/usr/bin/env bash
# PostToolUse(Write|Edit) hook — if a write lands inside a project's artifacts/
# directory and the path carries a T-XXX id, surface a notification so Claude
# can consider marking the task complete.
set -euo pipefail

INPUT="$(cat)"

LIB="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-state.mjs"
if [ ! -f "$LIB" ]; then
  echo "{}"; exit 0
fi

FILE_PATH="$(printf '%s' "$INPUT" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const p = JSON.parse(d);
      const fp = (p.tool_input || {}).file_path || (p.tool_input || {}).path || '';
      process.stdout.write(fp);
    } catch { process.stdout.write(''); }
  });
" 2>/dev/null || true)"

[ -z "$FILE_PATH" ] && echo "{}" && exit 0

TASK_ID="$(node "$LIB" artifact-task "$FILE_PATH" 2>/dev/null || true)"

if [ -n "$TASK_ID" ]; then
  MSG="Artifact written for ${TASK_ID} — consider /pm:task complete ${TASK_ID}"
  printf '%s' "$MSG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{process.stdout.write(JSON.stringify({notification:d}))})"
else
  echo "{}"
fi
