#!/usr/bin/env bash
# PostToolUse(*) hook — check the active turn budget and surface a
# warning when 80% consumed, a stronger warning when over. Never blocks
# the tool call itself; only injects a notification so Claude can self-
# correct. Explicit blocking is the user's call via /pm:budget clear or
# raising the cap.
set -euo pipefail

cat > /dev/null

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

STATUS="$(node "$CLI" budget-status 2>/dev/null || echo '{}')"

printf '%s' "$STATUS" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.active) { process.stdout.write('{}'); return; }
    if (p.status === 'ok') { process.stdout.write('{}'); return; }
    const pct = Math.round((p.pct || 0) * 100);
    let msg;
    if (p.status === 'over') {
      msg = 'OVER turn budget: ' + p.used + '/' + p.max_turns + ' turns used (' + pct +
        '%). You have blown past the cap. Stop, summarize progress, and ask the user whether ' +
        'to raise the cap with /pm:budget set <N> or call it and close out.';
    } else {
      msg = 'Turn budget approaching: ' + p.used + '/' + p.max_turns + ' (' + pct +
        '%). Consider wrapping up the current task or raising the cap.';
    }
    process.stdout.write(JSON.stringify({ notification: msg }));
  } catch { process.stdout.write('{}'); }
});
"
