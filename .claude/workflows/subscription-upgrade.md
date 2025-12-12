# Subscription Upgrade Workflow

Handles subscription tier changes for Lobbi tenants, including upgrades, downgrades, and plan modifications with proration and feature management.

## Workflow Metadata
```yaml
name: subscription-upgrade
type: transactional
description: Manage subscription changes with payment processing, feature unlocking, proration, and rollback support
agents:
  - subscription-lifecycle-manager
  - stripe-integration-specialist
  - feature-flag-manager
  - billing-calculation-specialist
  - notification-orchestrator
triggers:
  - "upgrade subscription"
  - "downgrade subscription"
  - "change plan"
  - "modify subscription"
stages:
  - eligibility-check
  - plan-comparison
  - proration-calculation
  - payment-processing
  - feature-unlock
  - database-update
  - notification
  - confirmation
estimatedDuration: "10-20 minutes"
priority: high
```

## Subscription Change Types

### Type A: Upgrade (Immediate)
**Example:** Basic → Pro, Pro → Enterprise
**Behavior:**
- Immediate feature access
- Proration charged immediately
- Member limits increased
- New features unlocked

### Type B: Downgrade (End of Period)
**Example:** Pro → Basic, Enterprise → Pro
**Behavior:**
- Features remain active until period end
- No refund, credit for next billing
- Member limit enforcement at renewal
- Warning for feature loss

### Type C: Plan Modification (Same Tier)
**Example:** Monthly → Annual, add-on changes
**Behavior:**
- Depends on change type
- Annual switch: immediate with proration
- Add-ons: immediate effect

## Workflow Stages

### Stage 1: Eligibility Check
**Agent:** subscription-lifecycle-manager
**Tasks:**
1. Verify tenant subscription status (active, not suspended)
2. Check if target plan is available for tenant
3. Validate tenant has permission to change plans
4. Check for pending subscription changes
5. Verify no outstanding payment issues
6. Validate feature compatibility
7. Check member count vs. new plan limits
8. Review custom contract restrictions

**Eligibility Rules:**
- Active subscription (not cancelled or past due)
- No pending disputes or chargebacks
- Member count within new plan limits (or will be reduced)
- No scheduled changes already queued
- Target plan available in tenant's region

**Outputs:**
- Eligibility status (pass/fail/warning)
- Blocking issues (if any)
- Warning messages
- Current subscription details
- Target plan details

**Duration:** 2-3 minutes

### Stage 2: Plan Comparison & Impact Analysis
**Agent:** subscription-lifecycle-manager
**Tasks:**
1. Load current plan features and limits
2. Load target plan features and limits
3. Generate feature comparison matrix
4. Identify features to be added/removed
5. Check member count impact
6. Identify data/usage that exceeds new limits
7. Calculate storage/API call impacts
8. Generate impact summary

**Comparison Matrix:**
```
Feature              | Current | Target  | Change
---------------------|---------|---------|----------
Members              | 50      | 200     | +150
Storage (GB)         | 10      | 100     | +90
Custom branding      | No      | Yes     | Added
API calls/month      | 1,000   | 10,000  | +9,000
SSO                  | No      | Yes     | Added
Priority support     | No      | Yes     | Added
```

**Outputs:**
- Feature comparison report
- Features to be enabled
- Features to be disabled
- Limit changes
- Impact warnings

**Duration:** 2-3 minutes

### Stage 3: Proration Calculation
**Agent:** billing-calculation-specialist
**Tasks:**
1. Retrieve current subscription details from Stripe
2. Calculate days remaining in billing period
3. Calculate unused amount from current plan
4. Calculate prorated amount for new plan
5. Determine immediate charge or credit
6. Calculate next billing amount
7. Apply any promotional credits
8. Calculate taxes if applicable
9. Generate pricing breakdown

**Proration Logic:**

**Upgrade (Immediate):**
```
Current Plan: $100/month, 15 days used, 15 days remaining
Unused Credit: ($100 / 30) * 15 = $50
Target Plan: $200/month
Prorated Charge: ($200 / 30) * 15 = $100
Amount Due Now: $100 - $50 = $50
Next Billing: $200 (full amount)
```

**Downgrade (End of Period):**
```
Current Plan: $200/month, 10 days used, 20 days remaining
No immediate charge
Current plan continues for 20 days
Next Billing: $100 (new plan amount)
```

**Outputs:**
- Proration breakdown
- Immediate charge amount (if any)
- Next billing amount
- Effective date of change
- Invoice preview

**Duration:** 2-3 minutes

### Stage 4: Payment Processing
**Agent:** stripe-integration-specialist
**Tasks:**
1. Retrieve payment method from Stripe
2. Create proration invoice (for upgrades)
3. Process immediate payment if required
4. Handle payment failures gracefully
5. Update subscription in Stripe
6. Schedule downgrade if end-of-period
7. Generate payment receipt
8. Handle 3D Secure if required
9. Log payment transaction

**Upgrade Payment Flow:**
```
1. Calculate proration charge
2. Create invoice in Stripe
3. Attempt payment with saved method
4. If successful → proceed to Stage 5
5. If failed → retry logic or notify admin
6. If 3DS required → redirect to auth flow
```

**Downgrade Scheduling:**
```
1. Schedule subscription update for period end
2. Create scheduled change record
3. No immediate payment
4. Notify tenant of scheduled change
```

**Outputs:**
- Payment status (success/failed/pending)
- Payment intent ID
- Invoice ID
- Receipt URL
- Updated subscription object

**Duration:** 3-5 minutes

### Stage 5: Feature Unlock/Lock
**Agent:** feature-flag-manager
**Tasks:**
1. Load tenant feature flags configuration
2. For upgrades: enable new features immediately
3. For downgrades: schedule feature removal
4. Update member limits
5. Adjust API rate limits
6. Modify storage quotas
7. Enable/disable integrations
8. Update UI feature visibility
9. Refresh tenant cache

**Feature Updates:**

**Immediate (Upgrades):**
- Custom branding enabled
- SSO configuration unlocked
- Advanced analytics visible
- API limits increased
- Member invite limit raised

**Scheduled (Downgrades):**
- Features remain until period end
- Warning banners shown
- No new usage of premium features
- Data export offered before removal

**Outputs:**
- Updated feature flags
- Enabled features list
- Disabled features list (if downgrade)
- Feature activation timestamps
- Cache refresh status

**Duration:** 2-3 minutes

### Stage 6: Database Update
**Agent:** subscription-lifecycle-manager
**Tasks:**
1. Update tenant subscription record
2. Record plan change in audit log
3. Update subscription tier field
4. Store previous plan for reference
5. Update billing cycle information
6. Record effective date and end date
7. Update member limit fields
8. Store proration details
9. Create subscription history entry

**Database Updates:**
```sql
UPDATE tenants SET
  subscription_tier = 'pro',
  subscription_stripe_id = 'sub_xxx',
  member_limit = 200,
  storage_limit_gb = 100,
  updated_at = NOW()
WHERE tenant_id = 'xxx';

INSERT INTO subscription_history (
  tenant_id,
  previous_plan,
  new_plan,
  change_type,
  effective_date,
  changed_by,
  proration_amount
) VALUES (...);
```

**Outputs:**
- Updated tenant record
- Subscription history entry
- Audit log entries
- Database transaction ID

**Duration:** 1-2 minutes

### Stage 7: Notification
**Agent:** notification-orchestrator
**Tasks:**
1. Select notification template based on change type
2. Personalize with plan details and pricing
3. Send email to tenant admin
4. Include receipt and invoice (if charged)
5. Provide next billing date
6. Include feature changes summary
7. Create in-app notification
8. Send internal alert to billing team
9. Schedule follow-up emails

**Email Types:**

**Upgrade Confirmation:**
- Thank you message
- Features now available
- Proration charge details
- Next billing date
- Getting started guide for new features

**Downgrade Confirmation:**
- Confirmation of scheduled change
- Effective date
- Features that will be removed
- Data export instructions
- Option to cancel downgrade

**Outputs:**
- Email delivery status
- In-app notification created
- Internal team notified
- Follow-up emails scheduled

**Duration:** 1-2 minutes

### Stage 8: Confirmation & Verification
**Agent:** subscription-lifecycle-manager
**Tasks:**
1. Verify Stripe subscription matches database
2. Confirm feature flags applied correctly
3. Test new feature availability
4. Verify member limits updated
5. Check billing calculations accuracy
6. Validate next invoice preview
7. Confirm notifications delivered
8. Run post-change health check
9. Generate change summary report

**Verification Checks:**
- [ ] Stripe subscription tier correct
- [ ] Database record updated
- [ ] Feature flags active
- [ ] Member limits enforced
- [ ] Payment processed (if applicable)
- [ ] Email sent successfully
- [ ] Audit trail complete

**Outputs:**
- Verification status
- Change summary report
- Health check results
- Any discrepancies found

**Duration:** 1-2 minutes

## Execution Flow

### Upgrade Flow (Immediate)
```
[Tenant Requests Upgrade]
         │
         ▼
┌──────────────────────┐
│ Eligibility Check    │ ─── subscription-lifecycle-manager
│ • Active sub?        │
│ • No pending change? │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Plan Comparison      │ ─── subscription-lifecycle-manager
│ • Feature diff       │
│ • Impact analysis    │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Proration Calc       │ ─── billing-calculation-specialist
│ • Calculate charge   │
│ • Preview invoice    │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Payment Process      │ ─── stripe-integration-specialist
│ • Charge proration   │
│ • Update Stripe sub  │
│ (3-5 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Feature Unlock       │ ─── feature-flag-manager
│ • Enable features    │
│ • Update limits      │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Database Update      │ ─── subscription-lifecycle-manager
│ • Update tenant      │
│ • Audit log          │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Send Notification    │ ─── notification-orchestrator
│ • Email confirmation │
│ • In-app alert       │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Verification         │ ─── subscription-lifecycle-manager
│ • Health check       │
│ • Confirm changes    │
│ (1-2 min)            │
└──────────┬───────────┘
           │
           ▼
      [Complete]
```

### Downgrade Flow (End of Period)
```
[Tenant Requests Downgrade]
         │
         ▼
┌──────────────────────┐
│ Eligibility +        │ ─── subscription-lifecycle-manager
│ Comparison           │     billing-calculation-specialist
│ (combined)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Schedule Change      │ ─── stripe-integration-specialist
│ • Set end-of-period  │
│ • No payment now     │
│ (2-3 min)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Database Update      │ ─── subscription-lifecycle-manager
│ • Pending status     │
│ • Scheduled date     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Send Notification    │ ─── notification-orchestrator
│ • Scheduled change   │
│ • Data export offer  │
└──────────┬───────────┘
           │
           ▼
   [Scheduled - Will Execute at Period End]
```

## Prerequisites

- Active Stripe subscription for tenant
- Valid payment method on file (for upgrades)
- Tenant not in suspended or cancelled state
- No pending billing disputes
- Admin permission to modify subscription
- Target plan available in tenant region
- Member count within new plan limits (or reduction plan)

## Post-Workflow Actions

1. **Monitoring**
   - Track feature usage after upgrade
   - Monitor for downgrade regret
   - Track member limit utilization
   - Watch for feature adoption

2. **Customer Success**
   - For upgrades: Schedule onboarding call for new features
   - For downgrades: Reach out to understand reason
   - Follow-up email with tips for new plan
   - Survey after 30 days

3. **Analytics**
   - Record plan change in analytics
   - Track upgrade/downgrade patterns
   - Calculate customer lifetime value impact
   - Monitor churn risk for downgrades

4. **Compliance**
   - Update invoicing records
   - Adjust tax calculations
   - Update billing forecast
   - Record in financial system

## Rollback Procedure

### Upgrade Rollback (Within 24 Hours)
```
1. Check if payment can be refunded
2. Refund proration charge in Stripe
3. Revert subscription to previous plan
4. Disable newly enabled features
5. Restore previous member limits
6. Update database to previous state
7. Send rollback notification
8. Log rollback reason
9. Contact tenant to confirm
```

### Downgrade Rollback (Before Execution)
```
1. Cancel scheduled subscription change in Stripe
2. Remove pending change record from database
3. Send cancellation confirmation email
4. Log cancellation reason
5. Remove warning banners
```

### Payment Failure Handling
```
If payment fails during upgrade:
1. Do NOT enable new features
2. Keep current subscription active
3. Create retry schedule (3 attempts)
4. Notify admin of payment failure
5. Provide payment update link
6. If all retries fail: cancel upgrade request
7. Log failure reason
```

## Error Handling

### Common Errors and Resolution

| Error | Stage | Resolution |
|-------|-------|------------|
| Payment declined | 4 | Retry 3x, notify admin, keep current plan |
| Stripe API timeout | 4 | Retry with idempotency, verify state |
| Feature flag update failed | 5 | Rollback payment, retry feature update |
| Member count exceeds limit | 1 | Block downgrade, require member removal |
| Subscription not found | 1 | Sync Stripe data, verify subscription |
| Proration error | 3 | Use flat upgrade, log for review |
| Email delivery failed | 7 | Queue retry, create in-app notification |

## Success Criteria

### Upgrade Success
- [ ] Eligibility check passed
- [ ] Proration calculated correctly
- [ ] Payment processed successfully
- [ ] Stripe subscription updated to new plan
- [ ] All new features enabled immediately
- [ ] Member limits increased
- [ ] Database record updated
- [ ] Confirmation email delivered
- [ ] Audit trail complete
- [ ] Tenant can access new features
- [ ] Next invoice shows correct amount

### Downgrade Success
- [ ] Downgrade scheduled in Stripe
- [ ] Database marked with pending change
- [ ] Confirmation email sent with effective date
- [ ] Current features remain active
- [ ] Warning displayed about upcoming changes
- [ ] Data export option provided
- [ ] Billing team notified

## Metrics and Monitoring

**Key Metrics:**
- Upgrade conversion rate
- Average upgrade value
- Downgrade rate by plan
- Payment failure rate during upgrades
- Time to feature activation after upgrade
- Downgrade cancellation rate (changed mind)
- Customer satisfaction after plan change

**Alerts:**
- Payment failure rate >5%
- Feature unlock failure
- Proration calculation error
- Stripe API failure
- Downgrade rate spike (>normal threshold)

## Special Scenarios

### Annual to Monthly Switch
- Calculate refund for unused annual period
- Apply as credit to account
- Switch to monthly billing immediately
- Adjust pricing to monthly rate

### Trial to Paid Conversion
- End trial period immediately
- Activate paid plan features
- Process first payment
- Update subscription status

### Add-on Management
- Process as mini subscription change
- Prorate add-on charges
- Enable add-on features
- Update total monthly cost

## Testing Checklist

Before running in production:
- [ ] Test upgrade with valid payment method
- [ ] Test upgrade with declined card
- [ ] Test downgrade scheduling
- [ ] Test downgrade cancellation
- [ ] Verify proration calculations
- [ ] Test member limit enforcement
- [ ] Test feature enable/disable
- [ ] Test rollback procedures
- [ ] Verify email notifications
- [ ] Test Stripe webhook handling
- [ ] Verify database consistency
- [ ] Test concurrent upgrade attempts
- [ ] Verify audit trail completeness
- [ ] Test edge cases (same plan, invalid plan)
