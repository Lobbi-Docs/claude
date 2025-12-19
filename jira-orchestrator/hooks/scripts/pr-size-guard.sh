#!/bin/bash
# PR Size Guard Hook
# Prevents creation of overly large PRs and suggests splitting strategies
#
# Usage: Called automatically by Claude Code hooks before PR creation
#
# Exit codes:
#   0 - PR size acceptable (proceed)
#   1 - PR blocked (too large)
#   2 - Warning issued (large but not blocked)

set -e

# Configuration (can be overridden via environment)
WARN_THRESHOLD=${PR_WARN_THRESHOLD:-400}
BLOCK_THRESHOLD=${PR_BLOCK_THRESHOLD:-800}
BASE_BRANCH=${1:-main}

# Colors for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "         PR SIZE ANALYSIS                     "
echo "=============================================="
echo ""

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "📍 Branch: $BRANCH"
echo "🎯 Base: $BASE_BRANCH"
echo ""

# Check if base branch exists in remote
if ! git rev-parse --verify "origin/${BASE_BRANCH}" >/dev/null 2>&1; then
  echo "⚠️  Warning: Base branch 'origin/${BASE_BRANCH}' not found"
  echo "   Using local $BASE_BRANCH"
  BASE_REF="$BASE_BRANCH"
else
  BASE_REF="origin/${BASE_BRANCH}"
fi

# Calculate lines changed
DIFF_OUTPUT=$(git diff --shortstat "$BASE_REF"...HEAD 2>/dev/null || echo "")

if [ -z "$DIFF_OUTPUT" ]; then
  echo "ℹ️  No changes detected (or branch not pushed)"
  exit 0
fi

# Parse diff stats
ADDITIONS=$(echo "$DIFF_OUTPUT" | grep -oP '\d+(?= insertion)' || echo 0)
DELETIONS=$(echo "$DIFF_OUTPUT" | grep -oP '\d+(?= deletion)' || echo 0)
FILES_CHANGED=$(echo "$DIFF_OUTPUT" | grep -oP '^\s*\d+' | tr -d ' ' || echo 0)

TOTAL_LINES=$((ADDITIONS + DELETIONS))

# Get file list
FILE_LIST=$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null)
FILE_COUNT=$(echo "$FILE_LIST" | wc -l)

echo "📊 Change Statistics:"
echo "   ├─ Files Changed: $FILE_COUNT"
echo "   ├─ Lines Added:   +$ADDITIONS"
echo "   ├─ Lines Removed: -$DELETIONS"
echo "   └─ Total Lines:   $TOTAL_LINES"
echo ""

# Categorize files
TEST_FILES=$(echo "$FILE_LIST" | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | wc -l || echo 0)
CONFIG_FILES=$(echo "$FILE_LIST" | grep -E '\.(json|yaml|yml|env|config)$' | wc -l || echo 0)
DOC_FILES=$(echo "$FILE_LIST" | grep -E '\.(md|txt|rst)$' | wc -l || echo 0)
IMPL_FILES=$((FILE_COUNT - TEST_FILES - CONFIG_FILES - DOC_FILES))

echo "📂 File Categories:"
echo "   ├─ Implementation: $IMPL_FILES"
echo "   ├─ Tests:          $TEST_FILES"
echo "   ├─ Config:         $CONFIG_FILES"
echo "   └─ Documentation:  $DOC_FILES"
echo ""

# Check thresholds
if [ "$TOTAL_LINES" -gt "$BLOCK_THRESHOLD" ]; then
  echo "=============================================="
  echo -e "${RED}❌ PR BLOCKED: TOO LARGE ($TOTAL_LINES lines)${NC}"
  echo "=============================================="
  echo ""
  echo "This PR exceeds the maximum allowed size of $BLOCK_THRESHOLD lines."
  echo "Large PRs are difficult to review and often lead to:"
  echo "  • Missed bugs and issues"
  echo "  • Reviewer fatigue"
  echo "  • Delayed merges"
  echo "  • Lower code quality"
  echo ""
  echo "📋 RECOMMENDED ACTIONS:"
  echo ""
  echo "1. Split by Layer:"
  echo "   - Create separate PRs for database, API, and UI changes"
  echo ""
  echo "2. Split by Sub-Item:"
  echo "   - Each Jira sub-item can be its own PR"
  echo ""
  echo "3. Split by Functionality:"
  echo "   - Happy path first, then edge cases, then polish"
  echo ""
  echo "Run '/jira:plan-prs' to generate a splitting strategy."
  echo ""
  echo "To override this block (not recommended):"
  echo "   export PR_BLOCK_THRESHOLD=9999"
  echo ""
  exit 1

elif [ "$TOTAL_LINES" -gt "$WARN_THRESHOLD" ]; then
  echo "=============================================="
  echo -e "${YELLOW}⚠️  WARNING: LARGE PR ($TOTAL_LINES lines)${NC}"
  echo "=============================================="
  echo ""
  echo "This PR exceeds the recommended size of $WARN_THRESHOLD lines."
  echo ""
  echo "Consider:"
  echo "  • Requesting bite-sized review from reviewers"
  echo "  • Using the review-facilitator to create review chunks"
  echo "  • Splitting into multiple PRs if possible"
  echo ""
  echo "Proceeding anyway (not blocking)..."
  echo ""
  exit 0

else
  echo "=============================================="
  echo -e "${GREEN}✅ PR SIZE ACCEPTABLE ($TOTAL_LINES lines)${NC}"
  echo "=============================================="
  echo ""
  echo "This PR is within recommended limits."
  echo ""

  # Provide helpful context
  if [ "$TOTAL_LINES" -lt 100 ]; then
    echo "💡 Small PR - Quick review expected"
  elif [ "$TOTAL_LINES" -lt 200 ]; then
    echo "💡 Moderate PR - Standard review (~15-20 min)"
  else
    echo "💡 Medium PR - Consider using review-facilitator for chunks"
  fi
  echo ""
  exit 0
fi
