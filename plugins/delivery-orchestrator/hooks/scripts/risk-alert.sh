#!/usr/bin/env bash
# PostToolUseFailure hook — log failures to a project-scoped risk journal
# so that retrospective / risk-assessor can surface recurring failure modes.
set -euo pipefail

INPUT="$(cat)"

PARSED="$(printf '%s' "$INPUT" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const p = JSON.parse(d);
      process.stdout.write(JSON.stringify({
        tool: p.tool_name || 'unknown',
        error: String(p.error || '').substring(0, 240)
      }));
    } catch { process.stdout.write('{}'); }
  });
" 2>/dev/null || echo '{}')"

PROJECTS_ROOT="${CLAUDE_PROJECT_DIR:-$HOME}/.claude/projects"
mkdir -p "$PROJECTS_ROOT" 2>/dev/null || true
JOURNAL="$PROJECTS_ROOT/.risk-journal.jsonl"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf '%s' "$PARSED" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const parsed = JSON.parse(d);
      const entry = { timestamp: '${TIMESTAMP}', tool: parsed.tool || 'unknown', error: parsed.error || '' };
      process.stdout.write(JSON.stringify(entry));
    } catch { process.stdout.write(''); }
  });
" >> "$JOURNAL" 2>/dev/null || true

# Every line in JSONL must end with \n; add one if the node append did not.
printf '\n' >> "$JOURNAL" 2>/dev/null || true

echo "{}"
