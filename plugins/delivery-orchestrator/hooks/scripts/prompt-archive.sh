#!/usr/bin/env bash
# UserPromptSubmit hook — archive the user's message to user-prompts.jsonl
# so later hooks (done-gate, /pm:drift) can remind Claude what was asked.
# Best-effort: never blocks the turn.
set -euo pipefail

INPUT="$(cat)"

LIB_DIR="$(cd "$(dirname "$0")/../../lib" && pwd)"
[ -f "$LIB_DIR/pm-guardrails.mjs" ] || { echo "{}"; exit 0; }

# Single node invocation: parse the hook payload, extract the prompt
# text, and call recordUserPrompt() directly from the guardrails module.
printf '%s' "$INPUT" | node --input-type=module -e "
import { recordUserPrompt } from 'file://$LIB_DIR/pm-guardrails.mjs';
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const p = JSON.parse(d);
    const t = p.prompt || p.user_message || (p.message && p.message.content) || '';
    if (typeof t === 'string' && t.trim()) recordUserPrompt(t);
  } catch {}
});
" > /dev/null 2>&1 || true

echo "{}"
