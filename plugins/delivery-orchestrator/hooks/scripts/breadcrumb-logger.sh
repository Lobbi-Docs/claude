#!/usr/bin/env bash
# PostToolUse(*) hook — append every tool invocation to the breadcrumb
# trail for later drift auditing via /pm:drift.
set -euo pipefail

INPUT="$(cat)"

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

READ="$(printf '%s' "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    const tool = p.tool_name || 'unknown';
    const tgt = (p.tool_input||{}).file_path
      || (p.tool_input||{}).path
      || (p.tool_input||{}).command
      || (p.tool_input||{}).pattern
      || '';
    process.stdout.write(JSON.stringify({ tool, target: String(tgt).slice(0, 300) }));
  } catch { process.stdout.write('{}'); }
});
" 2>/dev/null || echo '{}')"

TOOL="$(printf '%s' "$READ" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).tool||'')}catch{}})")"
TARGET="$(printf '%s' "$READ" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).target||'')}catch{}})")"

[ -z "$TOOL" ] && echo "{}" && exit 0

node "$CLI" breadcrumb "$TOOL" "$TARGET" > /dev/null 2>&1 || true

echo "{}"
