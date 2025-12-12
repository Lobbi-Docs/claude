#!/bin/bash

# List all secrets in Azure Key Vault
# Usage: ./list-secrets.sh <key-vault-name>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <key-vault-name>"
    exit 1
fi

KEY_VAULT_NAME=$1

echo "Listing secrets in Key Vault: $KEY_VAULT_NAME"
echo ""

# Check if logged in to Azure
az account show > /dev/null 2>&1 || { echo "Please login to Azure using 'az login'"; exit 1; }

# List all secrets
az keyvault secret list \
    --vault-name "$KEY_VAULT_NAME" \
    --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
    --output table
