---
description: Keycloak administration commands - manage realms, clients, users, and authentication
---

# Keycloak Administration

Execute Keycloak administration tasks. Available operations:

## Usage
```
/keycloak-admin <operation> [options]
```

## Operations

### Realm Management
- `realm-export` - Export realm configuration to JSON
- `realm-import` - Import realm from JSON file
- `realm-status` - Check realm health and configuration

### Client Management
- `client-list` - List all clients in realm
- `client-create` - Create new OIDC/SAML client
- `client-secret` - Regenerate client secret

### User Management
- `user-list` - List users with filters
- `user-create` - Create new user
- `user-roles` - Manage user role assignments

### Authentication
- `flow-list` - List authentication flows
- `flow-export` - Export authentication flow
- `token-test` - Test token generation

## Examples

```bash
# Export alpha-members realm
/keycloak-admin realm-export --realm alpha-members

# List all clients
/keycloak-admin client-list --realm alpha-members

# Create service account client
/keycloak-admin client-create --name new-service --type confidential

# Test authentication
/keycloak-admin token-test --client member-api
```

## Agent Assignment
This command activates the **keycloak-realm-admin** agent for execution.

## Prerequisites
- Keycloak running (docker-compose up keycloak)
- Admin credentials available
- Network access to Keycloak admin API
