# Keycloak Setup Workflow

Multi-agent workflow for setting up and configuring Keycloak for the Alpha Members Platform.

## Workflow Metadata
```yaml
name: keycloak-setup
type: sequential
description: Complete Keycloak setup including realm, clients, auth flows, and themes
agents:
  - keycloak-realm-admin
  - keycloak-auth-flow-designer
  - keycloak-theme-developer
  - keycloak-security-auditor
triggers:
  - "setup keycloak"
  - "configure keycloak"
  - "initialize auth"
stages:
  - realm-setup
  - client-configuration
  - auth-flow-design
  - theme-customization
  - security-audit
estimatedDuration: "2-4 hours"
priority: high
```

## Workflow Stages

### Stage 1: Realm Setup
**Agent:** keycloak-realm-admin
**Tasks:**
1. Create or update realm configuration
2. Configure realm settings (SSL, brute force, email)
3. Set up realm roles (admin, member, guest)
4. Configure groups and default roles
5. Set token lifespans and session policies

**Outputs:**
- Realm configuration JSON
- Role hierarchy documentation
- Group structure

### Stage 2: Client Configuration
**Agent:** keycloak-realm-admin
**Tasks:**
1. Create member-api client (confidential)
2. Create member-ui client (public with PKCE)
3. Configure client scopes
4. Set up service accounts
5. Configure redirect URIs and web origins

**Outputs:**
- Client configurations
- Client secrets (to be stored securely)
- Scope mappings

### Stage 3: Authentication Flow Design
**Agent:** keycloak-auth-flow-designer
**Tasks:**
1. Design custom browser flow
2. Configure MFA for admin roles
3. Set up OTP policy
4. Configure password policies
5. Create first-time login flow

**Outputs:**
- Authentication flow definitions
- MFA configuration
- Password policy documentation

### Stage 4: Theme Customization
**Agent:** keycloak-theme-developer
**Tasks:**
1. Create custom login theme
2. Design email templates
3. Configure branding assets
4. Test across browsers
5. Implement accessibility features

**Outputs:**
- Theme files
- Email templates
- Style documentation

### Stage 5: Security Audit
**Agent:** keycloak-security-auditor
**Tasks:**
1. Audit realm security settings
2. Review client configurations
3. Check authentication flows
4. Validate token settings
5. Generate security report

**Outputs:**
- Security audit report
- Remediation recommendations
- Compliance checklist

## Execution Flow

```
[Start]
    │
    ▼
┌─────────────────┐
│ Realm Setup     │ ─── keycloak-realm-admin
│ (30-60 min)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Client Config   │ ─── keycloak-realm-admin
│ (20-40 min)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Flows      │ ─── keycloak-auth-flow-designer
│ (30-45 min)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Theme Setup     │ ─── keycloak-theme-developer
│ (45-90 min)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Security Audit  │ ─── keycloak-security-auditor
│ (15-30 min)     │
└────────┬────────┘
         │
         ▼
     [Complete]
```

## Prerequisites

- Docker running with Keycloak service
- Network access to Keycloak (localhost:8080)
- Admin credentials configured
- Theme assets prepared

## Post-Workflow Actions

1. Export final realm configuration
2. Store client secrets securely
3. Document configuration changes
4. Test authentication flows
5. Update application configuration

## Rollback Procedure

1. Restore previous realm configuration
2. Revert client changes
3. Reset authentication flows to default
4. Remove custom themes

## Success Criteria

- [ ] Realm configured with security settings
- [ ] Clients created and tested
- [ ] MFA working for admin roles
- [ ] Custom theme applied
- [ ] Security audit passed
