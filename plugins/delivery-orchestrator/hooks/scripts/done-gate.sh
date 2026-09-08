#!/usr/bin/env bash
# Stop hook — refuse to end the session while any /pm:done-when criterion
# lacks recorded evidence. The hook's block reason names the specific
# criteria so Claude knows exactly what is outstanding.
set -euo pipefail

cat > /dev/null

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

STATUS="$(node "$CLI" done-status 2>/dev/null || echo '{}')"

printf '%s' "$STATUS" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const p = JSON.parse(d);
    if (!p.active) { process.stdout.write('{}'); return; }
    if (!p.unmet || p.unmet.length === 0) {
      process.stdout.write(JSON.stringify({ notification: 'All done-when criteria (' + p.total + ') have evidence. Session may end.' }));
      return;
    }
    const lines = p.unmet.map(c => '  - ' + c.id + ': ' + c.text).join('\n');
    const reason = 'Cannot end session — ' + p.unmet.length + ' of ' + p.total +
      ' done-when criteria have no evidence:\n' + lines +
      '\n\nFor each, run the verification and call mcp__pm-mcp__pm_done_when_met ' +
      \"with {id, evidence: 'exact proof line'}. If a criterion genuinely cannot be met, \" +
      'explain why and ask the user to relax it with /pm:done-when --drop <id>.';
    process.stdout.write(JSON.stringify({ ok: false, reason, decision: 'block' }));
  } catch { process.stdout.write('{}'); }
});
"
