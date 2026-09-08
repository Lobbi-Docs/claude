#!/usr/bin/env bash
# PreToolUse(Write|Edit|MultiEdit) hook — block edits to paths outside the
# active /pm:scope allowlist, nudging Claude to justify or abort. Writes
# within the allowlist pass silently. Non-Write tools are not checked.
set -euo pipefail

INPUT="$(cat)"

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo '{"decision":"approve"}'; exit 0; }

FILE_PATH="$(printf '%s' "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    const fp = (p.tool_input||{}).file_path || (p.tool_input||{}).path || '';
    process.stdout.write(fp);
  } catch { process.stdout.write(''); }
});
" 2>/dev/null || true)"

# No file path means nothing to check — approve.
if [ -z "$FILE_PATH" ]; then echo '{"decision":"approve"}'; exit 0; fi

RESULT="$(node "$CLI" scope-check "$FILE_PATH" 2>/dev/null || echo '{}')"

printf '%s' "$RESULT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.active || p.in_scope) { process.stdout.write(JSON.stringify({ decision: 'approve' })); return; }
    const allow = (p.allowlist || []).join(', ');
    const reason = 'Path is outside the active /pm:scope allowlist (' + allow + '). ' +
      'If this edit is genuinely required for the current task, call mcp__pm-mcp__pm_scope_override ' +
      'with a one-line reason (which will be logged to the drift ledger), or call mcp__pm-mcp__pm_scope_add ' +
      'to expand scope. Otherwise, revise your approach to stay within scope.';
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  } catch { process.stdout.write(JSON.stringify({ decision: 'approve' })); }
});
"
