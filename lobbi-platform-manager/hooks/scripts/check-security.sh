#!/bin/bash
# Security validation hook for lobbi-platform-manager
# Prevents committing secrets and validates security best practices

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Load environment variables if .env.example exists
if [ -f "hooks/.env.example" ]; then
    source hooks/.env.example
fi

echo -e "${GREEN}[SECURITY CHECK]${NC} Starting security validation..."

# Get the file being written/edited from arguments
FILE_PATH="${1:-}"

if [ -z "$FILE_PATH" ]; then
    echo -e "${YELLOW}[WARNING]${NC} No file path provided, skipping security check"
    exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo -e "${YELLOW}[WARNING]${NC} File does not exist yet: $FILE_PATH"
    exit 0
fi

# Secret patterns to detect
declare -a SECRET_PATTERNS=(
    "AKIAZ[A-Z0-9]{16}"                    # AWS Access Key
    "sk-[a-zA-Z0-9]{48}"                   # OpenAI API Key
    "xox[baprs]-[0-9a-zA-Z]{10,72}"       # Slack tokens
    "ghp_[a-zA-Z0-9]{36}"                  # GitHub Personal Access Token
    "mongodb(\+srv)?://[^:]+:[^@]+@"       # MongoDB connection string with password
    "postgres://[^:]+:[^@]+@"              # PostgreSQL connection string with password
    "['\"][a-zA-Z0-9]{32,}['\"].*password" # Generic long strings near 'password'
    "api[_-]?key['\"]?\s*[:=]\s*['\"][^'\"]{20,}" # API key assignments
)

# Check for hardcoded secrets
FOUND_SECRETS=0

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$FILE_PATH" 2>/dev/null; then
        echo -e "${RED}[ERROR]${NC} Potential secret detected matching pattern: $pattern"
        echo -e "${RED}[ERROR]${NC} File: $FILE_PATH"
        FOUND_SECRETS=1
    fi
done

# Check .env files specifically
if [[ "$FILE_PATH" =~ \.env$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Validating .env file: $FILE_PATH"

    # Check for production keywords in .env files
    if grep -qiE "(prod|production)" "$FILE_PATH"; then
        echo -e "${RED}[ERROR]${NC} .env file appears to contain production configuration"
        echo -e "${YELLOW}[WARNING]${NC} Production secrets should never be committed"
        FOUND_SECRETS=1
    fi

    # Check for real-looking values (not placeholders)
    if grep -qE "=[^=]{20,}" "$FILE_PATH" && ! grep -q "your_" "$FILE_PATH" && ! grep -q "example" "$FILE_PATH"; then
        echo -e "${YELLOW}[WARNING]${NC} .env file contains long values that might be real secrets"
        echo -e "${YELLOW}[WARNING]${NC} Ensure these are development/example values only"
    fi
fi

# Check JSON files for sensitive data
if [[ "$FILE_PATH" =~ \.json$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Validating JSON file: $FILE_PATH"

    # Check for common secret field names
    if grep -qiE '"(password|secret|token|api_key|private_key)"\s*:\s*"[^"]{10,}"' "$FILE_PATH"; then
        echo -e "${YELLOW}[WARNING]${NC} JSON file contains potential secret fields"
        echo -e "${YELLOW}[WARNING]${NC} Verify these are placeholder values"
    fi
fi

# Check JavaScript/TypeScript files
if [[ "$FILE_PATH" =~ \.(js|ts)$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Validating JS/TS file: $FILE_PATH"

    # Check for hardcoded credentials
    if grep -qE "(password|token|secret|apiKey)\s*[:=]\s*['\"][^'\"]{10,}" "$FILE_PATH"; then
        echo -e "${YELLOW}[WARNING]${NC} Potential hardcoded credentials in code"
        echo -e "${YELLOW}[WARNING]${NC} Use environment variables instead"
    fi
fi

# Final verdict
if [ $FOUND_SECRETS -eq 1 ]; then
    echo -e "${RED}[FAILED]${NC} Security validation failed"
    echo -e "${YELLOW}[ACTION]${NC} Remove secrets and use environment variables instead"
    exit 1
fi

echo -e "${GREEN}[PASSED]${NC} Security validation successful"
exit 0
