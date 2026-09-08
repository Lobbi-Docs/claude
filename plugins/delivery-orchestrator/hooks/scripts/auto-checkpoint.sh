#!/usr/bin/env bash
# Stop hook — write a checkpoint for every IN_PROGRESS project so that the
# next session can resume cleanly. All logic lives in the shared library to
# keep this script small and testable.
set -euo pipefail

cat > /dev/null

LIB="$(cd "$(dirname "$0")/../../lib" && pwd)/pm-state.mjs"
if [ ! -f "$LIB" ]; then
  echo "{}"; exit 0
fi

# The library prints the list of checkpoints it wrote; we don't need to parse
# it here — we just want the side effect and a quiet hook response.
node "$LIB" checkpoint > /dev/null 2>&1 || true

echo "{}"
