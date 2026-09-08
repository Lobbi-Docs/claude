#!/usr/bin/env bash
# Stop hook — snapshot the active guardrail state to handoff.md so that a
# post-/compact or resumed session can re-anchor. Side-effect only; does
# not influence the Stop decision itself (that's done-gate.sh's job).
set -euo pipefail

cat > /dev/null

CLI="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-guardrails-cli.mjs"
[ -f "$CLI" ] || { echo "{}"; exit 0; }

node "$CLI" handoff-write > /dev/null 2>&1 || true

echo "{}"
