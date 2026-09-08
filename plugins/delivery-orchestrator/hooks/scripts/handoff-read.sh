#!/usr/bin/env bash
# SessionStart hook — if a recent handoff.md exists, surface it as a
# notification so the resumed session (especially after /compact) can
# re-anchor on the task without re-reading the whole history.
set -euo pipefail

cat > /dev/null

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

OUT="$(node "$CLI" handoff-read 2>/dev/null || echo '{}')"

printf '%s' "$OUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.markdown) { process.stdout.write('{}'); return; }
    // Truncate to keep the SessionStart notification bounded — handoff can
    // be large for long tasks.
    const md = p.markdown.length > 3500
      ? p.markdown.slice(0, 3500) + '\n\n(handoff truncated — full content in handoff.md)'
      : p.markdown;
    const msg = 'TASK HANDOFF FROM PREVIOUS SESSION:\n' + md +
      '\n\nDo not re-plan from scratch; resume where the last session left off.';
    process.stdout.write(JSON.stringify({ notification: msg }));
  } catch { process.stdout.write('{}'); }
});
"
