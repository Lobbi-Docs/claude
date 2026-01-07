#!/bin/bash
# Post-deployment Keycloak sync hook
# Updates Keycloak client configuration after successful deployment

set -e

SYNC_MODE="${SYNC_MODE:-update}"
KEYCLOAK_URL="${KEYCLOAK_URL:-}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-}"
SERVICE_NAME="${SERVICE_NAME:-}"

echo "🔐 Running Keycloak sync..."

# Check required variables
if [ -z "$KEYCLOAK_URL" ] || [ -z "$KEYCLOAK_REALM" ]; then
    echo "⚠️ Keycloak URL or realm not configured, skipping sync"
    exit 0
fi

# Function to get admin token
get_admin_token() {
    if [ -n "$KEYCLOAK_ADMIN_TOKEN" ]; then
        echo "$KEYCLOAK_ADMIN_TOKEN"
        return
    fi

    if [ -n "$KEYCLOAK_ADMIN" ] && [ -n "$KEYCLOAK_ADMIN_PASSWORD" ]; then
        curl -sf -X POST \
            "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "username=$KEYCLOAK_ADMIN" \
            -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
            -d "grant_type=password" \
            -d "client_id=admin-cli" | jq -r '.access_token'
    else
        echo ""
    fi
}

TOKEN=$(get_admin_token)
if [ -z "$TOKEN" ]; then
    echo "⚠️ Could not obtain Keycloak admin token, skipping sync"
    exit 0
fi

CLIENT_ID="${SERVICE_NAME}-client"

# Check if client exists
echo "Checking for client: $CLIENT_ID"
EXISTING_CLIENT=$(curl -sf -X GET \
    "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id // empty')

if [ -n "$EXISTING_CLIENT" ]; then
    echo "✅ Client exists: $CLIENT_ID (UUID: $EXISTING_CLIENT)"

    if [ "$SYNC_MODE" = "update" ]; then
        # Update redirect URIs if SERVICE_URL is set
        if [ -n "$SERVICE_URL" ]; then
            echo "Updating redirect URIs..."

            # Get current client config
            CURRENT_CONFIG=$(curl -sf -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$EXISTING_CLIENT" \
                -H "Authorization: Bearer $TOKEN")

            # Add new redirect URI if not present
            UPDATED_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg url "$SERVICE_URL/*" '
                if (.redirectUris | index($url)) then .
                else .redirectUris += [$url]
                end
            ')

            curl -sf -X PUT \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$EXISTING_CLIENT" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$UPDATED_CONFIG"

            echo "✅ Updated redirect URIs for: $SERVICE_URL"
        fi
    fi
else
    echo "⚠️ Client not found: $CLIENT_ID"

    if [ "$SYNC_MODE" = "create" ]; then
        echo "Creating new client..."

        # Create client configuration
        CLIENT_CONFIG=$(cat <<EOF
{
    "clientId": "$CLIENT_ID",
    "name": "$SERVICE_NAME",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "redirectUris": ["${SERVICE_URL:-http://localhost:3000}/*"],
    "webOrigins": ["${SERVICE_URL:-http://localhost:3000}"],
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "publicClient": false,
    "protocol": "openid-connect"
}
EOF
)

        RESPONSE=$(curl -sf -X POST \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$CLIENT_CONFIG" -w "%{http_code}" -o /dev/null)

        if [ "$RESPONSE" = "201" ]; then
            echo "✅ Created client: $CLIENT_ID"

            # Get and store client secret
            NEW_CLIENT_ID=$(curl -sf -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$CLIENT_ID" \
                -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

            SECRET=$(curl -sf -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$NEW_CLIENT_ID/client-secret" \
                -H "Authorization: Bearer $TOKEN" | jq -r '.value')

            echo "Client secret generated (store securely): $SECRET"

            # Optionally store in AWS Secrets Manager
            if [ -n "$AWS_REGION" ] && command -v aws &> /dev/null; then
                aws secretsmanager create-secret \
                    --name "$SERVICE_NAME/keycloak-client-secret" \
                    --secret-string "$SECRET" \
                    --region "$AWS_REGION" 2>/dev/null || \
                aws secretsmanager put-secret-value \
                    --secret-id "$SERVICE_NAME/keycloak-client-secret" \
                    --secret-string "$SECRET" \
                    --region "$AWS_REGION"
                echo "✅ Secret stored in AWS Secrets Manager"
            fi
        else
            echo "❌ Failed to create client"
            exit 1
        fi
    fi
fi

echo ""
echo "✅ Keycloak sync completed!"
