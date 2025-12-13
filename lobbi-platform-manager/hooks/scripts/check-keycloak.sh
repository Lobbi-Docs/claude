#!/bin/bash
# Keycloak configuration validation hook for lobbi-platform-manager
# Validates Keycloak configuration changes

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables if .env.example exists
if [ -f "hooks/.env.example" ]; then
    source hooks/.env.example
fi

echo -e "${GREEN}[KEYCLOAK CHECK]${NC} Starting Keycloak validation..."

# Get the file being written/edited
FILE_PATH="${1:-}"

if [ -z "$FILE_PATH" ]; then
    echo -e "${YELLOW}[WARNING]${NC} No file path provided, skipping Keycloak check"
    exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo -e "${YELLOW}[WARNING]${NC} File does not exist yet: $FILE_PATH"
    exit 0
fi

echo -e "${BLUE}[INFO]${NC} Validating file: $FILE_PATH"

# Validation flags
VALIDATION_FAILED=0

# Validate realm configuration files
if [[ "$FILE_PATH" =~ realm.*\.json$ ]]; then
    echo -e "${BLUE}[INFO]${NC} Validating realm configuration..."

    # Check if it's valid JSON
    if ! jq empty "$FILE_PATH" 2>/dev/null; then
        echo -e "${RED}[ERROR]${NC} Invalid JSON in realm configuration"
        VALIDATION_FAILED=1
    else
        echo -e "${GREEN}[OK]${NC} Valid JSON syntax"

        # Check required realm fields
        REALM_NAME=$(jq -r '.realm // empty' "$FILE_PATH")
        if [ -z "$REALM_NAME" ]; then
            echo -e "${RED}[ERROR]${NC} Missing 'realm' field in configuration"
            VALIDATION_FAILED=1
        else
            echo -e "${GREEN}[OK]${NC} Realm name: $REALM_NAME"
        fi

        # Check for enabled flag
        REALM_ENABLED=$(jq -r '.enabled // empty' "$FILE_PATH")
        if [ "$REALM_ENABLED" != "true" ]; then
            echo -e "${YELLOW}[WARNING]${NC} Realm is not enabled"
        fi
    fi
fi

# Validate client configuration files
if [[ "$FILE_PATH" =~ client.*\.json$ ]]; then
    echo -e "${BLUE}[INFO]${NC} Validating client configuration..."

    # Check if it's valid JSON
    if ! jq empty "$FILE_PATH" 2>/dev/null; then
        echo -e "${RED}[ERROR]${NC} Invalid JSON in client configuration"
        VALIDATION_FAILED=1
    else
        echo -e "${GREEN}[OK]${NC} Valid JSON syntax"

        # Check required client fields
        CLIENT_ID=$(jq -r '.clientId // empty' "$FILE_PATH")
        if [ -z "$CLIENT_ID" ]; then
            echo -e "${RED}[ERROR]${NC} Missing 'clientId' field in configuration"
            VALIDATION_FAILED=1
        else
            echo -e "${GREEN}[OK]${NC} Client ID: $CLIENT_ID"
        fi

        # Check redirect URIs for security
        REDIRECT_URIS=$(jq -r '.redirectUris[]? // empty' "$FILE_PATH")
        if echo "$REDIRECT_URIS" | grep -q "\*"; then
            echo -e "${YELLOW}[WARNING]${NC} Wildcard redirect URIs detected - potential security risk"
        fi

        # Check if public client has proper settings
        PUBLIC_CLIENT=$(jq -r '.publicClient // empty' "$FILE_PATH")
        if [ "$PUBLIC_CLIENT" == "true" ]; then
            echo -e "${BLUE}[INFO]${NC} Public client detected"

            # Public clients should not have credentials
            if jq -e '.credentials' "$FILE_PATH" > /dev/null 2>&1; then
                echo -e "${YELLOW}[WARNING]${NC} Public client has credentials configured"
            fi
        fi
    fi
fi

# Validate theme files
if [[ "$FILE_PATH" =~ theme/ ]]; then
    echo -e "${BLUE}[INFO]${NC} Validating theme file..."

    # Check for common theme structure
    if [[ "$FILE_PATH" =~ \.ftl$ ]]; then
        echo -e "${GREEN}[OK]${NC} FreeMarker template detected"

        # Basic FreeMarker syntax check (look for unclosed tags)
        if grep -q "<#[^>]*$" "$FILE_PATH"; then
            echo -e "${YELLOW}[WARNING]${NC} Potential unclosed FreeMarker tag"
        fi
    fi

    if [[ "$FILE_PATH" =~ \.css$ ]]; then
        echo -e "${GREEN}[OK]${NC} CSS file detected"

        # Basic CSS validation (check for unclosed braces)
        OPEN_BRACES=$(grep -o "{" "$FILE_PATH" | wc -l)
        CLOSE_BRACES=$(grep -o "}" "$FILE_PATH" | wc -l)

        if [ "$OPEN_BRACES" -ne "$CLOSE_BRACES" ]; then
            echo -e "${YELLOW}[WARNING]${NC} Mismatched braces in CSS file"
        fi
    fi
fi

# Check Keycloak service availability if URL is configured
KEYCLOAK_URL="${KEYCLOAK_URL:-}"
if [ -n "$KEYCLOAK_URL" ]; then
    echo -e "${BLUE}[INFO]${NC} Checking Keycloak availability at $KEYCLOAK_URL"

    if curl -sf --max-time 5 "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} Keycloak is accessible"
    else
        echo -e "${YELLOW}[WARNING]${NC} Keycloak is not accessible (may not be running)"
    fi
fi

# Final verdict
echo ""
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}[PASSED]${NC} Keycloak configuration validation successful"
    exit 0
else
    echo -e "${RED}[FAILED]${NC} Keycloak configuration validation failed"
    exit 1
fi
