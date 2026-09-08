#!/usr/bin/env bash
# UserPromptSubmit + SessionStart hook — surface the active focus anchor
# to Claude at the top of every new turn and at session start so the
# "DO X / DON'T Y" contract cannot be silently forgotten.
set -euo pipefail

cat > /dev/null

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

OUT="$(node "$CLI" anchor-reminder 2>/dev/null || echo '{}')"
# Parse the optional "reminder" field from the CLI output and build the
# hook JSON response. Silent when no anchor is active.
printf '%s' "$OUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.reminder) { process.stdout.write('{}'); return; }
    const msg = 'FOCUS ANCHOR (set by /pm:anchor):\n' + p.reminder +
      '\nIf the next step violates this anchor, pause and ask before proceeding.';
    process.stdout.write(JSON.stringify({ notification: msg }));
  } catch { process.stdout.write('{}'); }
});
"
