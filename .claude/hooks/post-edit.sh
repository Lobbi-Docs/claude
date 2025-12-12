#!/bin/bash
# Post-edit hook for Golden Armada
# Runs after file edits

set -e

FILE_PATH="${1:-}"
EDIT_TYPE="${2:-modify}"

echo "=== Post-Edit Hook ==="
echo "File: $FILE_PATH"
echo "Edit Type: $EDIT_TYPE"

# Get file extension
get_extension() {
    echo "${FILE_PATH##*.}"
}

# Python file validation
validate_python() {
    echo "Validating Python file..."

    # Syntax check
    if python -m py_compile "$FILE_PATH" 2>/dev/null; then
        echo "✓ Syntax OK"
    else
        echo "✗ Syntax error detected"
        return 1
    fi

    # Import check
    if python -c "import ast; ast.parse(open('$FILE_PATH').read())" 2>/dev/null; then
        echo "✓ AST parse OK"
    fi

    # Quick lint (errors only)
    if command -v flake8 &>/dev/null; then
        local errors=$(flake8 --select=E9,F63,F7,F82 "$FILE_PATH" 2>/dev/null | wc -l)
        if [ "$errors" -eq 0 ]; then
            echo "✓ No critical lint errors"
        else
            echo "✗ Found $errors critical lint errors"
            flake8 --select=E9,F63,F7,F82 "$FILE_PATH" 2>/dev/null
        fi
    fi
}

# YAML file validation
validate_yaml() {
    echo "Validating YAML file..."

    if command -v python &>/dev/null; then
        if python -c "import yaml; yaml.safe_load(open('$FILE_PATH'))" 2>/dev/null; then
            echo "✓ YAML syntax OK"
        else
            echo "✗ YAML syntax error"
            return 1
        fi
    fi

    # Helm chart validation
    if [[ "$FILE_PATH" == *"helm"*"values.yaml"* ]]; then
        echo "Validating Helm values..."
        local chart_dir=$(dirname "$FILE_PATH")
        if [ -f "$chart_dir/Chart.yaml" ]; then
            helm lint "$chart_dir" 2>/dev/null || true
        fi
    fi
}

# Dockerfile validation
validate_dockerfile() {
    echo "Validating Dockerfile..."

    # Basic syntax check
    if docker build --check "$FILE_PATH" 2>/dev/null; then
        echo "✓ Dockerfile syntax OK"
    fi

    # Hadolint if available
    if command -v hadolint &>/dev/null; then
        hadolint "$FILE_PATH" 2>/dev/null || true
    fi
}

# JSON file validation
validate_json() {
    echo "Validating JSON file..."

    if python -m json.tool "$FILE_PATH" > /dev/null 2>&1; then
        echo "✓ JSON syntax OK"
    else
        echo "✗ JSON syntax error"
        return 1
    fi
}

# Security check for sensitive patterns
check_secrets() {
    echo "Checking for sensitive patterns..."

    local patterns=(
        "password.*=.*['\"][^'\"]+['\"]"
        "api_key.*=.*['\"][^'\"]+['\"]"
        "secret.*=.*['\"][^'\"]+['\"]"
        "AKIA[0-9A-Z]{16}"
        "sk-[a-zA-Z0-9]{48}"
    )

    for pattern in "${patterns[@]}"; do
        if grep -qiE "$pattern" "$FILE_PATH" 2>/dev/null; then
            echo "⚠ WARNING: Potential sensitive data detected!"
            echo "  Pattern: $pattern"
        fi
    done
}

# Main validation
EXT=$(get_extension)

case "$EXT" in
    py)
        validate_python
        ;;
    yaml|yml)
        validate_yaml
        ;;
    json)
        validate_json
        ;;
    Dockerfile|dockerfile)
        validate_dockerfile
        ;;
    *)
        echo "No specific validation for .$EXT files"
        ;;
esac

# Always check for secrets
check_secrets

# ============================================
# DOCUMENTATION LOGGING
# ============================================

# Check if edited file is documentation and log it
check_documentation() {
    local file="$1"
    local doc_hook_script=".claude/hooks/post-edit-documentation.sh"

    # Check if file is documentation
    if [[ "$file" =~ \.(md|mdx|markdown)$ ]] || [[ "$(basename "$file")" =~ ^(README|CONTRIBUTING|CHANGELOG) ]]; then
        echo "Documentation file detected: $file"

        if [ -x "$doc_hook_script" ]; then
            echo "Logging to documentation system..."
            export EDIT_FILE_PATH="$file"
            bash "$doc_hook_script" "$file"
        fi
    fi
}

check_documentation "$FILE_PATH"

echo "=== Post-Edit Complete ==="
