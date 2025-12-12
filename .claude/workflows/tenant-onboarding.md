# Tenant Onboarding Workflow

Complete multi-tenant onboarding workflow for Lobbi platform, handling tenant provisioning, configuration, billing setup, and admin account creation.

## Workflow Metadata
```yaml
name: tenant-onboarding
type: sequential
description: End-to-end tenant onboarding including provisioning, billing, admin setup, and theme customization
agents:
  - tenant-provisioning-specialist
  - stripe-integration-specialist
  - keycloak-realm-admin
  - theme-builder
  - notification-orchestrator
triggers:
  - "onboard tenant"
  - "new tenant"
  - "create organization"
  - "setup tenant"
stages:
  - tenant-provision
  - keycloak-realm-setup
  - billing-configuration
  - admin-account-creation
  - theme-customization
  - welcome-notification
estimatedDuration: "45-90 minutes"
priority: high
```

## Workflow Stages

### Stage 1: Tenant Provisioning
**Agent:** tenant-provisioning-specialist
**Tasks:**
1. Validate tenant request data (company name, domain, plan tier)
2. Check domain uniqueness and availability
3. Create tenant record in database with UUID
4. Generate tenant-specific subdomain (e.g., acme.lobbi.app)
5. Initialize tenant schema or database partition
6. Create default tenant settings and feature flags
7. Set up tenant isolation boundaries

**Outputs:**
- Tenant UUID
- Database schema/partition ID
- Subdomain configuration
- Tenant metadata record
- Feature flags configuration

**Duration:** 10-15 minutes

### Stage 2: Keycloak Realm Setup
**Agent:** keycloak-realm-admin
**Tasks:**
1. Create dedicated Keycloak realm for tenant
2. Configure realm settings (tenant-specific branding)
3. Set up tenant-specific roles (tenant-admin, member, guest)
4. Configure authentication flows and password policies
5. Create client applications (tenant-ui, tenant-api)
6. Set up service accounts for backend integration
7. Configure email settings for tenant domain

**Outputs:**
- Realm ID and configuration
- Client credentials (securely stored)
- Role hierarchy
- Email template configurations

**Duration:** 15-20 minutes

### Stage 3: Billing Configuration
**Agent:** stripe-integration-specialist
**Tasks:**
1. Create Stripe customer for tenant
2. Set up subscription based on selected plan tier
3. Configure payment methods if provided
4. Create billing portal session
5. Set up usage-based metering (if applicable)
6. Configure invoice settings and tax calculations
7. Set trial period if applicable
8. Store Stripe customer ID with tenant record

**Outputs:**
- Stripe customer ID
- Subscription ID
- Payment status
- Billing portal URL
- Invoice settings

**Duration:** 10-15 minutes

### Stage 4: Admin Account Creation
**Agent:** keycloak-realm-admin
**Tasks:**
1. Create primary admin user in Keycloak realm
2. Assign tenant-admin role to user
3. Generate temporary password or send verification email
4. Configure MFA requirements for admin
5. Set up admin preferences and profile
6. Grant necessary permissions and scopes
7. Create audit log entry for admin creation

**Outputs:**
- Admin user ID
- Temporary credentials (if applicable)
- Verification email sent status
- Admin permissions list

**Duration:** 5-10 minutes

### Stage 5: Theme Customization
**Agent:** theme-builder
**Tasks:**
1. Apply default theme template
2. Configure tenant branding (logo, colors, fonts)
3. Customize Keycloak login pages with tenant branding
4. Set up email template branding
5. Configure tenant-specific UI components
6. Generate CSS/theme assets
7. Deploy theme to CDN or storage

**Outputs:**
- Theme configuration JSON
- Branded assets URLs
- Keycloak theme deployment
- Email template updates

**Duration:** 15-25 minutes

### Stage 6: Welcome Notification
**Agent:** notification-orchestrator
**Tasks:**
1. Send welcome email to tenant admin
2. Include onboarding checklist and resources
3. Provide login credentials and portal URLs
4. Send internal notification to support team
5. Schedule follow-up onboarding emails
6. Create onboarding task list for admin
7. Log notification delivery status

**Outputs:**
- Welcome email sent confirmation
- Onboarding resources delivered
- Support team notified
- Follow-up schedule created

**Duration:** 5-10 minutes

## Execution Flow

```
[Start: Tenant Request]
         │
         ▼
┌──────────────────────┐
│ Tenant Provision     │ ─── tenant-provisioning-specialist
│ • Validate data      │
│ • Create DB record   │
│ • Setup subdomain    │
│ (10-15 min)          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Keycloak Realm       │ ─── keycloak-realm-admin
│ • Create realm       │
│ • Setup clients      │
│ • Configure roles    │
│ (15-20 min)          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Billing Config       │ ─── stripe-integration-specialist
│ • Create customer    │
│ • Setup subscription │
│ • Configure payment  │
│ (10-15 min)          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Admin Creation       │ ─── keycloak-realm-admin
│ • Create admin user  │
│ • Assign roles       │
│ • Setup MFA          │
│ (5-10 min)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Theme Setup          │ ─── theme-builder
│ • Apply branding     │
│ • Customize UI       │
│ • Deploy assets      │
│ (15-25 min)          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Welcome Email        │ ─── notification-orchestrator
│ • Send credentials   │
│ • Onboarding guide   │
│ • Schedule follow-up │
│ (5-10 min)           │
└──────────┬───────────┘
           │
           ▼
      [Complete]
```

## Parallel Execution Options

Some stages can be parallelized for faster onboarding:

```
[Tenant Provision] ──┐
                     │
                     ├─→ [Keycloak Realm] ──┐
                     │                       │
                     └─→ [Billing Config] ───┤
                                             │
                                             ├─→ [Admin Creation] ─→ [Theme Setup] ─→ [Welcome Email]
```

## Prerequisites

- Tenant request validated with required fields:
  - Company name
  - Primary admin email
  - Chosen subscription tier
  - Domain/subdomain preference (optional)
- Stripe API credentials configured
- Keycloak admin access available
- Email service (SendGrid/SES) operational
- Theme assets repository accessible
- Database with sufficient capacity
- CDN/storage for tenant assets

## Post-Workflow Actions

1. **Verification**
   - Test admin login to tenant portal
   - Verify Stripe subscription is active
   - Confirm email delivery
   - Check realm isolation

2. **Monitoring**
   - Add tenant to monitoring dashboards
   - Set up usage tracking
   - Configure alerting thresholds
   - Enable audit logging

3. **Documentation**
   - Record onboarding completion in CRM
   - Update tenant registry
   - Log configuration details
   - Create support ticket for follow-up

4. **Handoff**
   - Notify customer success team
   - Schedule onboarding call
   - Provide admin with documentation
   - Enable self-service resources

## Rollback Procedure

### Full Rollback
```
1. Delete Stripe subscription
2. Archive Stripe customer (don't delete for audit)
3. Disable Keycloak realm
4. Soft-delete tenant database record (mark as cancelled)
5. Remove subdomain DNS/routing
6. Archive theme assets
7. Send cancellation notification
8. Log rollback reason and timestamp
```

### Partial Rollback (Stage-Specific)
- **After Stage 1:** Delete database record, release subdomain
- **After Stage 2:** Disable realm, proceed with Stage 1 rollback
- **After Stage 3:** Cancel subscription, disable realm, delete tenant
- **After Stage 4:** Remove admin user, proceed with previous stages
- **After Stage 5:** Revert to default theme, continue operation
- **After Stage 6:** No rollback needed, onboarding complete

## Error Handling

### Common Errors and Resolution

| Error | Stage | Resolution |
|-------|-------|------------|
| Domain conflict | 1 | Generate alternative subdomain |
| Keycloak unavailable | 2 | Retry with exponential backoff |
| Stripe payment failed | 3 | Request payment update, pause subscription |
| Email delivery failed | 4, 6 | Queue for retry, use alternative email |
| Theme upload failed | 5 | Use default theme, retry upload async |

## Success Criteria

- [ ] Tenant record created in database with unique UUID
- [ ] Subdomain configured and accessible
- [ ] Keycloak realm created and isolated
- [ ] Client credentials generated and stored securely
- [ ] Stripe customer and subscription active
- [ ] Payment method validated (if not in trial)
- [ ] Tenant admin account created with proper roles
- [ ] Admin able to login successfully
- [ ] Theme assets deployed and visible
- [ ] Welcome email delivered to admin
- [ ] Billing portal accessible
- [ ] Audit trail complete for all actions
- [ ] Monitoring enabled for tenant
- [ ] Customer success team notified

## Metrics and Monitoring

**Key Metrics:**
- Total onboarding time (target: <60 minutes)
- Stage completion rates
- Error rate by stage
- Rollback frequency
- Time to first login
- Admin activation rate (within 24 hours)

**Alerts:**
- Onboarding exceeds 90 minutes
- Stage failure requiring manual intervention
- Payment setup failure
- Admin account not activated within 48 hours

## Integration Points

- **CRM:** Tenant creation triggers CRM contact/account update
- **Analytics:** Track tenant onboarding funnel
- **Support:** Auto-create support ticket for new tenant
- **Monitoring:** Add tenant to application monitoring
- **Documentation:** Generate tenant-specific access docs

## Testing Checklist

Before running in production:
- [ ] Test with all subscription tiers
- [ ] Verify rollback works at each stage
- [ ] Test with various email providers
- [ ] Validate payment failure scenarios
- [ ] Test concurrent tenant onboarding
- [ ] Verify tenant isolation
- [ ] Test theme customization options
- [ ] Validate notification delivery
- [ ] Test admin login immediately after creation
- [ ] Verify billing portal access
