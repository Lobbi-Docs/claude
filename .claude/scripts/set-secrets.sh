#!/bin/bash

# Set secrets in Azure Key Vault
# Usage: ./set-secrets.sh <key-vault-name>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <key-vault-name>"
    exit 1
fi

KEY_VAULT_NAME=$1

echo "Setting secrets in Key Vault: $KEY_VAULT_NAME"

# Check if logged in to Azure
az account show > /dev/null 2>&1 || { echo "Please login to Azure using 'az login'"; exit 1; }

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    echo "Setting secret: $secret_name"
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$secret_value" \
        --output none
}

# Prompt for secrets
echo ""
echo "Please provide the following secrets:"
echo ""

# Application Insights
read -p "Application Insights Connection String: " app_insights_conn_string
set_secret "app-insights-connection-string" "$app_insights_conn_string"

read -p "Application Insights Instrumentation Key: " app_insights_key
set_secret "app-insights-instrumentation-key" "$app_insights_key"

# Azure OpenAI
read -p "Azure OpenAI Endpoint: " openai_endpoint
set_secret "openai-endpoint" "$openai_endpoint"

read -p "Azure OpenAI API Key: " openai_api_key
set_secret "openai-api-key" "$openai_api_key"

# Cosmos DB
read -p "Cosmos DB Endpoint: " cosmos_endpoint
set_secret "cosmos-db-endpoint" "$cosmos_endpoint"

read -p "Cosmos DB Key: " cosmos_key
set_secret "cosmos-db-key" "$cosmos_key"

# Storage Account
read -p "Storage Account Key: " storage_key
set_secret "storage-account-key" "$storage_key"

read -p "Storage Connection String: " storage_conn_string
set_secret "storage-connection-string" "$storage_conn_string"

# OTLP (optional)
read -p "OTLP API Key (optional, press Enter to skip): " otlp_key
if [ -n "$otlp_key" ]; then
    set_secret "otlp-api-key" "$otlp_key"
fi

# Agent Service (optional)
read -p "Agent Service Endpoint (optional, press Enter to skip): " agent_endpoint
if [ -n "$agent_endpoint" ]; then
    set_secret "agent-service-endpoint" "$agent_endpoint"
fi

read -p "Agent Service API Key (optional, press Enter to skip): " agent_api_key
if [ -n "$agent_api_key" ]; then
    set_secret "agent-service-api-key" "$agent_api_key"
fi

# GitHub Token (optional)
read -p "GitHub Token (optional, press Enter to skip): " github_token
if [ -n "$github_token" ]; then
    set_secret "github-token" "$github_token"
fi

echo ""
echo "✓ All secrets have been set successfully in Key Vault: $KEY_VAULT_NAME"
