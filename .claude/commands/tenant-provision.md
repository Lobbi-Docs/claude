---
description: Provision new tenant organization with Keycloak, database, Stripe, and theme configuration
---

# Tenant Provisioning

Provision a complete new tenant organization in the Lobbi member management system. This command orchestrates organization creation, authentication setup, payment integration, theming, and admin user configuration.

## Usage

```bash
/tenant-provision <tenant-name> [options]
```

## Description

This command provisions a new tenant organization by:
- Creating organization record in MongoDB
- Setting up Keycloak realm or organization
- Creating Stripe customer and subscription
- Configuring custom theme and branding
- Setting up admin user with proper roles
- Initializing default member groups and permissions

## Prerequisites

**Required Services:**
- Keycloak running and accessible (docker-compose up keycloak)
- MongoDB connection available
- Redis cache available
- Stripe API keys configured in environment
- Admin credentials for Keycloak and database

**Environment Variables:**
```bash
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
DATABASE_URL=mongodb://admin:admin@localhost:27017/member_db?authSource=admin
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
REDIS_URL=redis://localhost:6379
```

**Tools Required:**
- curl or httpie for API testing
- mongosh for database verification
- kcadm.sh (Keycloak Admin CLI) or admin API access

## Step-by-Step Instructions

### 1. Validate Prerequisites

```bash
# Check Keycloak is running
curl -f http://localhost:8080/health/ready || echo "ERROR: Keycloak not ready"

# Check MongoDB connection
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" --eval "db.adminCommand('ping')" || echo "ERROR: MongoDB not accessible"

# Check Redis connection
redis-cli ping || echo "ERROR: Redis not accessible"

# Verify Stripe API keys are set
echo $STRIPE_SECRET_KEY | grep -q "sk_" || echo "ERROR: Stripe secret key not set"
```

### 2. Create Organization Record in MongoDB

```bash
# Generate organization ID and timestamps
ORG_ID=$(uuidgen)
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Create organization document
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;

db.organizations.insertOne({
  _id: "$ORG_ID",
  name: "<tenant-name>",
  slug: "<tenant-slug>",
  status: "provisioning",
  subscription: {
    plan: "trial",
    status: "trialing",
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  settings: {
    theme: {
      primaryColor: "#0066CC",
      logo: null,
      customCss: null
    },
    features: {
      memberPortal: true,
      eventManagement: true,
      paymentProcessing: true
    }
  },
  limits: {
    maxMembers: 100,
    maxAdmins: 5,
    maxStorage: 1073741824
  },
  metadata: {
    createdAt: new Date("$CREATED_AT"),
    updatedAt: new Date("$CREATED_AT"),
    provisionedBy: "claude-admin"
  }
});

print("Organization created: " + "$ORG_ID");
EOF
```

### 3. Setup Keycloak Realm/Organization

```bash
# Option A: Create dedicated realm (multi-tenant isolation)
curl -X POST "http://localhost:8080/admin/realms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "realm": "<tenant-slug>",
    "enabled": true,
    "displayName": "<tenant-name>",
    "registrationAllowed": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": true,
    "sslRequired": "external",
    "accessTokenLifespan": 900,
    "refreshTokenMaxReuse": 0
  }'

# Option B: Create organization in existing realm (Keycloak 24+)
curl -X POST "http://localhost:8080/admin/realms/alpha-members/organizations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "<tenant-name>",
    "enabled": true,
    "attributes": {
      "orgId": ["'$ORG_ID'"],
      "orgSlug": ["<tenant-slug>"]
    }
  }'

# Create OIDC client for tenant
curl -X POST "http://localhost:8080/admin/realms/<tenant-slug>/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "clientId": "<tenant-slug>-app",
    "name": "<tenant-name> Application",
    "enabled": true,
    "protocol": "openid-connect",
    "publicClient": false,
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": true,
    "redirectUris": [
      "http://localhost:3000/*",
      "https://<tenant-slug>.lobbi.app/*"
    ],
    "webOrigins": ["+"]
  }'
```

### 4. Create Stripe Customer and Subscription

```bash
# Create Stripe customer
STRIPE_CUSTOMER=$(curl -X POST https://api.stripe.com/v1/customers \
  -u "$STRIPE_SECRET_KEY:" \
  -d "name=<tenant-name>" \
  -d "email=admin@<tenant-slug>.com" \
  -d "metadata[org_id]=$ORG_ID" \
  -d "metadata[org_slug]=<tenant-slug>" \
  | jq -r '.id')

echo "Stripe customer created: $STRIPE_CUSTOMER"

# Create trial subscription
SUBSCRIPTION=$(curl -X POST https://api.stripe.com/v1/subscriptions \
  -u "$STRIPE_SECRET_KEY:" \
  -d "customer=$STRIPE_CUSTOMER" \
  -d "items[0][price]=price_trial_plan" \
  -d "trial_period_days=14" \
  -d "metadata[org_id]=$ORG_ID" \
  | jq -r '.id')

echo "Subscription created: $SUBSCRIPTION"

# Update organization with Stripe IDs
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;

db.organizations.updateOne(
  { _id: "$ORG_ID" },
  {
    \$set: {
      "billing.stripeCustomerId": "$STRIPE_CUSTOMER",
      "billing.stripeSubscriptionId": "$SUBSCRIPTION",
      "metadata.updatedAt": new Date()
    }
  }
);
EOF
```

### 5. Configure Custom Theme

```bash
# Create theme directory structure
mkdir -p /home/user/alpha-0.1/keycloak/themes/<tenant-slug>/{login,account,email}

# Copy base theme
cp -r /home/user/alpha-0.1/keycloak/themes/lobbi-base/* \
      /home/user/alpha-0.1/keycloak/themes/<tenant-slug>/

# Customize theme.properties
cat > /home/user/alpha-0.1/keycloak/themes/<tenant-slug>/login/theme.properties <<EOF
parent=lobbi-base
styles=css/custom.css
logo=/resources/<tenant-slug>/logo.png
primaryColor=#0066CC
EOF

# Upload custom logo (if provided)
# cp <logo-file> /home/user/alpha-0.1/keycloak/themes/<tenant-slug>/login/resources/logo.png

# Set theme in Keycloak realm
curl -X PUT "http://localhost:8080/admin/realms/<tenant-slug>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "loginTheme": "<tenant-slug>",
    "accountTheme": "<tenant-slug>",
    "emailTheme": "<tenant-slug>"
  }'
```

### 6. Create Admin User

```bash
# Generate secure password
ADMIN_PASSWORD=$(openssl rand -base64 16)

# Create admin user in Keycloak
ADMIN_USER_ID=$(curl -X POST "http://localhost:8080/admin/realms/<tenant-slug>/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "admin",
    "email": "admin@<tenant-slug>.com",
    "firstName": "Admin",
    "lastName": "User",
    "enabled": true,
    "emailVerified": true,
    "credentials": [{
      "type": "password",
      "value": "'$ADMIN_PASSWORD'",
      "temporary": false
    }],
    "requiredActions": ["UPDATE_PROFILE"]
  }' | jq -r '.id')

echo "Admin user created with ID: $ADMIN_USER_ID"
echo "Temporary password: $ADMIN_PASSWORD"

# Assign admin roles
curl -X POST "http://localhost:8080/admin/realms/<tenant-slug>/users/$ADMIN_USER_ID/role-mappings/realm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '[
    {"name": "admin"},
    {"name": "tenant-admin"}
  ]'

# Create admin record in MongoDB
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;

db.users.insertOne({
  keycloakId: "$ADMIN_USER_ID",
  organizationId: "$ORG_ID",
  email: "admin@<tenant-slug>.com",
  role: "admin",
  status: "active",
  profile: {
    firstName: "Admin",
    lastName: "User"
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
EOF
```

### 7. Initialize Default Groups and Permissions

```bash
# Create default member groups
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;

db.groups.insertMany([
  {
    organizationId: "$ORG_ID",
    name: "All Members",
    slug: "all-members",
    description: "Default group for all organization members",
    isDefault: true,
    permissions: ["member:read", "event:read"],
    createdAt: new Date()
  },
  {
    organizationId: "$ORG_ID",
    name: "Administrators",
    slug: "administrators",
    description: "Organization administrators",
    isDefault: false,
    permissions: ["*"],
    createdAt: new Date()
  }
]);
EOF
```

### 8. Finalize Provisioning

```bash
# Mark organization as active
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;

db.organizations.updateOne(
  { _id: "$ORG_ID" },
  {
    \$set: {
      status: "active",
      "metadata.updatedAt": new Date(),
      "metadata.provisionedAt": new Date()
    }
  }
);

print("Organization provisioning completed");
EOF

# Cache organization data in Redis
redis-cli SET "org:$ORG_ID" "$(echo '{
  "id": "'$ORG_ID'",
  "name": "<tenant-name>",
  "slug": "<tenant-slug>",
  "status": "active"
}' | jq -c .)" EX 3600
```

### 9. Verify Provisioning

```bash
# Test authentication
curl -X POST "http://localhost:8080/realms/<tenant-slug>/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=<tenant-slug>-app" \
  -d "username=admin" \
  -d "password=$ADMIN_PASSWORD" \
  | jq '.'

# Verify organization in database
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" \
  --eval "db.organizations.findOne({_id: '$ORG_ID'})" | jq '.'

# Check Stripe subscription
curl "https://api.stripe.com/v1/subscriptions/$SUBSCRIPTION" \
  -u "$STRIPE_SECRET_KEY:" | jq '.'
```

## Example Usage

### Basic Tenant Provisioning
```bash
/tenant-provision acme-corp
```

### With Custom Options
```bash
/tenant-provision acme-corp \
  --plan=professional \
  --admin-email=john@acme.com \
  --custom-domain=members.acme.com \
  --max-members=500
```

### Dry Run (Preview Only)
```bash
/tenant-provision acme-corp --dry-run
```

## Error Handling

### Common Issues

**1. Keycloak Connection Failed**
```bash
# Check Keycloak health
curl http://localhost:8080/health/ready

# Restart if needed
docker-compose restart keycloak
```

**2. Stripe API Error**
```bash
# Verify API keys
echo $STRIPE_SECRET_KEY | grep -q "sk_test" || echo "Invalid key"

# Check Stripe dashboard for errors
curl https://api.stripe.com/v1/events -u "$STRIPE_SECRET_KEY:"
```

**3. MongoDB Duplicate Key Error**
```bash
# Check if organization already exists
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" \
  --eval "db.organizations.findOne({slug: '<tenant-slug>'})"

# Remove if necessary
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" \
  --eval "db.organizations.deleteOne({slug: '<tenant-slug>'})"
```

**4. Realm Already Exists**
```bash
# Delete existing realm
curl -X DELETE "http://localhost:8080/admin/realms/<tenant-slug>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Rollback on Failure

```bash
# Run rollback script
./scripts/rollback-tenant.sh $ORG_ID

# Manual cleanup
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" <<EOF
use member_db;
db.organizations.deleteOne({_id: "$ORG_ID"});
db.users.deleteMany({organizationId: "$ORG_ID"});
db.groups.deleteMany({organizationId: "$ORG_ID"});
EOF

# Delete Keycloak realm
curl -X DELETE "http://localhost:8080/admin/realms/<tenant-slug>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Cancel Stripe subscription
curl -X DELETE "https://api.stripe.com/v1/subscriptions/$SUBSCRIPTION" \
  -u "$STRIPE_SECRET_KEY:"
```

## Post-Provisioning Tasks

1. **Send Welcome Email**
   - Email admin credentials to organization contact
   - Include setup guide and onboarding checklist

2. **Schedule Onboarding Call**
   - Calendar invite for product walkthrough
   - Custom configuration review

3. **Monitor Initial Usage**
   - Track login activity
   - Monitor for errors or issues
   - Check subscription status

4. **Documentation**
   - Add organization to internal registry
   - Document any custom configurations
   - Update support team

## Agent Assignment

This command activates the **tenant-provisioning-orchestrator** agent for execution, which coordinates:
- MongoDB admin agent
- Keycloak admin agent
- Stripe integration agent
- Theme configuration agent

## Security Notes

- Admin passwords are generated securely and should be rotated immediately
- Stripe API keys must be kept secure and never logged
- Database credentials should use environment variables only
- All API tokens should be short-lived and properly scoped
- Enable MFA for admin accounts after initial setup
