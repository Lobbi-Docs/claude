#!/bin/bash
# Post-endpoint hook - generates tests after router creation
# Usage: ./post-endpoint.sh <file_path> <action>

set -e

FILE_PATH="$1"
ACTION="${2:-modified}"

echo "🔗 Post-endpoint hook: $FILE_PATH ($ACTION)"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

# Only process router files
if [[ ! "$FILE_PATH" =~ router\.py$ ]] && [[ ! "$FILE_PATH" =~ routes/.*\.py$ ]]; then
    exit 0
fi

# Extract resource name
RESOURCE=$(echo "$FILE_PATH" | sed -n 's/.*domains\/\([^/]*\)\/.*/\1/p')
if [ -z "$RESOURCE" ]; then
    RESOURCE=$(echo "$FILE_PATH" | sed -n 's/.*routes\/\([^.]*\)\.py/\1/p')
fi

if [ -z "$RESOURCE" ]; then
    echo "Could not determine resource name"
    exit 0
fi

echo "📝 Resource: $RESOURCE"

# Create test file if not exists
TEST_FILE="tests/test_${RESOURCE}.py"
if [ ! -f "$TEST_FILE" ]; then
    mkdir -p tests

    # Convert resource to proper case
    RESOURCE_UPPER=$(echo "$RESOURCE" | tr '[:lower:]' '[:upper:]')
    RESOURCE_TITLE=$(echo "$RESOURCE" | sed 's/.*/\u&/')

    cat > "$TEST_FILE" << EOF
"""Tests for ${RESOURCE} endpoints."""
import pytest
from httpx import AsyncClient


class Test${RESOURCE_TITLE}Endpoints:
    """Test suite for ${RESOURCE_TITLE} API."""

    @pytest.mark.asyncio
    async def test_list_${RESOURCE}(self, client: AsyncClient):
        """Test listing ${RESOURCE}."""
        response = await client.get("/api/v1/${RESOURCE}/")
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_create_${RESOURCE}(self, client: AsyncClient):
        """Test creating ${RESOURCE}."""
        response = await client.post("/api/v1/${RESOURCE}/", json={})
        assert response.status_code in [201, 400, 401, 422]

    @pytest.mark.asyncio
    async def test_get_${RESOURCE}(self, client: AsyncClient):
        """Test getting ${RESOURCE}."""
        response = await client.get("/api/v1/${RESOURCE}/test-id")
        assert response.status_code in [200, 404, 401]
EOF

    echo "✅ Created: $TEST_FILE"
fi

# Log endpoints found
echo "📋 Endpoints found:"
grep -oP '@router\.(get|post|put|patch|delete)\s*\([^)]*\)' "$FILE_PATH" 2>/dev/null | while read -r line; do
    METHOD=$(echo "$line" | grep -oP '(get|post|put|patch|delete)')
    PATH=$(echo "$line" | grep -oP '"\K[^"]*' | head -1)
    echo "   ${METHOD^^} /api/v1/${RESOURCE}${PATH}"
done || true

echo "✅ Post-endpoint hook complete"
