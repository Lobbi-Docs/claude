#!/bin/bash

# Rotate secrets in Azure Key Vault
# Usage: ./rotate-secrets.sh <key-vault-name> <secret-name>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <key-vault-name> <secret-name>"
    echo ""
    echo "Example: $0 ascension-dev-kv-abc123 openai-api-key"
    exit 1
fi

KEY_VAULT_NAME=$1
SECRET_NAME=$2

echo "Rotating secret: $SECRET_NAME in Key Vault: $KEY_VAULT_NAME"

# Check if logged in to Azure
az account show > /dev/null 2>&1 || { echo "Please login to Azure using 'az login'"; exit 1; }

# Check if secret exists
if ! az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$SECRET_NAME" > /dev/null 2>&1; then
    echo "Error: Secret '$SECRET_NAME' does not exist in Key Vault '$KEY_VAULT_NAME'"
    exit 1
fi

# Get current secret value and version
current_version=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "id" -o tsv | awk -F'/' '{print $NF}')

echo "Current version: $current_version"
echo ""

# Prompt for new secret value
read -s -p "Enter new secret value: " new_secret_value
echo ""
read -s -p "Confirm new secret value: " confirm_secret_value
echo ""

if [ "$new_secret_value" != "$confirm_secret_value" ]; then
    echo "Error: Secret values do not match"
    exit 1
fi

if [ -z "$new_secret_value" ]; then
    echo "Error: Secret value cannot be empty"
    exit 1
fi

# Set new secret version
echo "Setting new secret version..."
new_version=$(az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$SECRET_NAME" \
    --value "$new_secret_value" \
    --query "id" -o tsv | awk -F'/' '{print $NF}')

echo ""
echo "✓ Secret rotated successfully!"
echo "  Previous version: $current_version"
echo "  New version: $new_version"
echo ""
echo "Note: Applications using Key Vault references will automatically use the new version."
echo "Previous versions are retained for rollback if needed."
echo ""
echo "To view all versions:"
echo "  az keyvault secret list-versions --vault-name $KEY_VAULT_NAME --name $SECRET_NAME"
echo ""
echo "To restore a previous version:"
echo "  az keyvault secret show --vault-name $KEY_VAULT_NAME --name $SECRET_NAME --version $current_version"
