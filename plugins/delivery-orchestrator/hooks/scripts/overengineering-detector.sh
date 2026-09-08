#!/usr/bin/env bash
# PostToolUse(Write|Edit|MultiEdit) hook — scan the just-written file's
# staged diff against the overengineering ruleset and surface any hits
# so Claude can self-correct before the pattern compounds.
set -euo pipefail

INPUT="$(cat)"

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

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

[ -z "$FILE_PATH" ] && echo "{}" && exit 0

RESULT="$(node "$CLI" overeng "$FILE_PATH" 2>/dev/null || echo '{}')"

printf '%s' "$RESULT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.hits || p.hits.length === 0) { process.stdout.write('{}'); return; }
    const bullets = p.hits.map(h => '- ' + h.reason + '\n  rule: \"' + h.rule + '\"').join('\n');
    const msg = 'Over-engineering detected in the last edit:\n' + bullets +
      '\n\nConsider whether these additions are actually required by the task. ' +
      'If not, revert them before continuing.';
    process.stdout.write(JSON.stringify({ notification: msg }));
  } catch { process.stdout.write('{}'); }
});
"
