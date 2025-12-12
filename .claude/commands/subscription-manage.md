---
description: Manage organization subscriptions including upgrades, downgrades, trials, cancellations, and usage reporting
---

# Subscription Management

Manage Stripe subscriptions for Lobbi organizations including plan changes, trial management, cancellations, billing updates, and usage monitoring.

## Usage

```bash
/subscription-manage <operation> --org=<org-id> [options]
```

## Description

This command manages organization subscriptions through:
- Plan upgrades and downgrades with proration
- Trial period management and conversions
- Subscription cancellations and reactivations
- Payment method updates
- Usage tracking and limit enforcement
- Invoice management and payment history
- Webhook event processing

## Prerequisites

**Required Services:**
- Stripe account with API keys
- MongoDB connection for organization data
- Redis for caching and rate limiting
- Keycloak for access control

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=mongodb://admin:admin@localhost:27017/member_db?authSource=admin
REDIS_URL=redis://localhost:6379
```

**Stripe Product Configuration:**
```bash
# Ensure these products exist in Stripe Dashboard
PLAN_TRIAL=price_trial
PLAN_BASIC=price_basic_monthly
PLAN_PREMIUM=price_premium_monthly
PLAN_ENTERPRISE=price_enterprise_monthly
```

## Operations

### 1. Upgrade Plan

Upgrade an organization to a higher-tier plan with immediate proration.

```bash
# Check current subscription
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << 'EOF'
use member_db;

const org = db.organizations.findOne({ _id: "<org-id>" });
print("Current plan:", org.subscription.plan);
print("Stripe subscription:", org.billing.stripeSubscriptionId);

EOF

# Get Stripe subscription details
SUBSCRIPTION_ID=$(mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" \
  --eval "db.organizations.findOne({_id: '<org-id>'}).billing.stripeSubscriptionId" --quiet)

curl "https://api.stripe.com/v1/subscriptions/$SUBSCRIPTION_ID" \
  -u "$STRIPE_SECRET_KEY:" | jq '.items.data[0] | {plan: .price.id, quantity: .quantity}'

# Upgrade to premium plan
python3 << 'EOF'
import stripe
import os
from pymongo import MongoClient
from datetime import datetime

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
org_id = "<org-id>"
new_plan = "premium"  # basic, premium, enterprise

# Get organization
client = MongoClient(os.getenv("DATABASE_URL"))
db = client.member_db
org = db.organizations.find_one({"_id": org_id})

if not org or not org.get("billing", {}).get("stripeSubscriptionId"):
    print("ERROR: Organization or subscription not found")
    exit(1)

subscription_id = org["billing"]["stripeSubscriptionId"]

# Retrieve current subscription
subscription = stripe.Subscription.retrieve(subscription_id)
current_item = subscription["items"]["data"][0]

# Plan price IDs
plan_prices = {
    "trial": os.getenv("PLAN_TRIAL", "price_trial"),
    "basic": os.getenv("PLAN_BASIC", "price_basic_monthly"),
    "premium": os.getenv("PLAN_PREMIUM", "price_premium_monthly"),
    "enterprise": os.getenv("PLAN_ENTERPRISE", "price_enterprise_monthly")
}

new_price_id = plan_prices.get(new_plan)
if not new_price_id:
    print(f"ERROR: Invalid plan '{new_plan}'")
    exit(1)

print(f"Upgrading from {org['subscription']['plan']} to {new_plan}")
print(f"Current price ID: {current_item.price.id}")
print(f"New price ID: {new_price_id}")

# Update subscription
try:
    updated_subscription = stripe.Subscription.modify(
        subscription_id,
        items=[{
            "id": current_item.id,
            "price": new_price_id
        }],
        proration_behavior="always_invoice",  # Immediate proration
        metadata={
            "upgraded_at": datetime.utcnow().isoformat(),
            "upgraded_from": org["subscription"]["plan"],
            "organization_id": org_id
        }
    )

    # Update MongoDB
    db.organizations.update_one(
        {"_id": org_id},
        {
            "$set": {
                "subscription.plan": new_plan,
                "subscription.status": updated_subscription.status,
                "subscription.currentPeriodEnd": datetime.fromtimestamp(updated_subscription.current_period_end),
                "metadata.updatedAt": datetime.utcnow()
            },
            "$push": {
                "subscription.history": {
                    "action": "upgrade",
                    "fromPlan": org["subscription"]["plan"],
                    "toPlan": new_plan,
                    "timestamp": datetime.utcnow(),
                    "proration": "applied"
                }
            }
        }
    )

    print(f"✅ Subscription upgraded successfully")
    print(f"New status: {updated_subscription.status}")
    print(f"Current period end: {updated_subscription.current_period_end}")

    # Update limits based on new plan
    limits = {
        "trial": {"maxMembers": 100, "maxAdmins": 3, "maxStorage": 1073741824},
        "basic": {"maxMembers": 500, "maxAdmins": 5, "maxStorage": 5368709120},
        "premium": {"maxMembers": 2000, "maxAdmins": 15, "maxStorage": 21474836480},
        "enterprise": {"maxMembers": -1, "maxAdmins": -1, "maxStorage": -1}  # Unlimited
    }

    db.organizations.update_one(
        {"_id": org_id},
        {"$set": {"limits": limits[new_plan]}}
    )

    print(f"✅ Organization limits updated for {new_plan} plan")

except stripe.error.StripeError as e:
    print(f"❌ Stripe error: {str(e)}")
    exit(1)

EOF
```

### 2. Downgrade Plan

Downgrade to a lower-tier plan (applied at end of billing period).

```bash
python3 << 'EOF'
import stripe
import os
from pymongo import MongoClient
from datetime import datetime

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
org_id = "<org-id>"
new_plan = "basic"  # Downgrade to basic

# Get organization
client = MongoClient(os.getenv("DATABASE_URL"))
db = client.member_db
org = db.organizations.find_one({"_id": org_id})

subscription_id = org["billing"]["stripeSubscriptionId"]
subscription = stripe.Subscription.retrieve(subscription_id)
current_item = subscription["items"]["data"][0]

# Plan price IDs
plan_prices = {
    "basic": os.getenv("PLAN_BASIC", "price_basic_monthly"),
    "premium": os.getenv("PLAN_PREMIUM", "price_premium_monthly"),
    "enterprise": os.getenv("PLAN_ENTERPRISE", "price_enterprise_monthly")
}

new_price_id = plan_prices[new_plan]

print(f"Scheduling downgrade from {org['subscription']['plan']} to {new_plan}")
print(f"Will take effect at end of billing period")

# Schedule downgrade
try:
    updated_subscription = stripe.Subscription.modify(
        subscription_id,
        items=[{
            "id": current_item.id,
            "price": new_price_id
        }],
        proration_behavior="none",  # No proration for downgrades
        billing_cycle_anchor="unchanged"  # Keep current billing cycle
    )

    # Update MongoDB with pending downgrade
    db.organizations.update_one(
        {"_id": org_id},
        {
            "$set": {
                "subscription.pendingDowngrade": {
                    "toPlan": new_plan,
                    "effectiveDate": datetime.fromtimestamp(subscription.current_period_end),
                    "scheduledAt": datetime.utcnow()
                },
                "metadata.updatedAt": datetime.utcnow()
            }
        }
    )

    print(f"✅ Downgrade scheduled for {datetime.fromtimestamp(subscription.current_period_end)}")
    print(f"Organization will continue on {org['subscription']['plan']} until then")

except stripe.error.StripeError as e:
    print(f"❌ Stripe error: {str(e)}")
    exit(1)

EOF
```

### 3. Manage Trial

Convert trial to paid subscription or extend trial period.

```bash
# Check trial status
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << 'EOF'
use member_db;

const org = db.organizations.findOne({ _id: "<org-id>" });
const sub = org.subscription;

print("Subscription status:", sub.status);
print("Plan:", sub.plan);

if (sub.status === "trialing" || sub.plan === "trial") {
    print("Trial ends:", sub.trialEndsAt);

    const now = new Date();
    const trialEnd = new Date(sub.trialEndsAt);
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    print(`Days remaining: ${daysLeft}`);
}

EOF

# Convert trial to paid subscription
python3 << 'EOF'
import stripe
import os
from pymongo import MongoClient
from datetime import datetime

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
org_id = "<org-id>"
paid_plan = "basic"  # Plan to convert to

client = MongoClient(os.getenv("DATABASE_URL"))
db = client.member_db
org = db.organizations.find_one({"_id": org_id})

if org["subscription"]["status"] != "trialing":
    print("Organization is not on trial")
    exit(1)

subscription_id = org["billing"]["stripeSubscriptionId"]
plan_prices = {
    "basic": os.getenv("PLAN_BASIC"),
    "premium": os.getenv("PLAN_PREMIUM"),
    "enterprise": os.getenv("PLAN_ENTERPRISE")
}

print(f"Converting trial to {paid_plan} plan")

try:
    # End trial and convert to paid
    subscription = stripe.Subscription.modify(
        subscription_id,
        trial_end="now",  # End trial immediately
        items=[{"price": plan_prices[paid_plan]}]
    )

    db.organizations.update_one(
        {"_id": org_id},
        {
            "$set": {
                "subscription.plan": paid_plan,
                "subscription.status": "active",
                "subscription.trialEndsAt": None,
                "subscription.convertedAt": datetime.utcnow(),
                "metadata.updatedAt": datetime.utcnow()
            }
        }
    )

    print(f"✅ Trial converted to {paid_plan} plan")

except stripe.error.StripeError as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

EOF

# Extend trial period
python3 << 'EOF'
import stripe
import os
from pymongo import MongoClient
from datetime import datetime, timedelta

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
org_id = "<org-id>"
extend_days = 7  # Extend by 7 days

client = MongoClient(os.getenv("DATABASE_URL"))
db = client.member_db
org = db.organizations.find_one({"_id": org_id})

subscription_id = org["billing"]["stripeSubscriptionId"]
subscription = stripe.Subscription.retrieve(subscription_id)

if subscription.status != "trialing":
    print("Subscription is not in trial period")
    exit(1)

# Calculate new trial end
current_trial_end = datetime.fromtimestamp(subscription.trial_end)
new_trial_end = current_trial_end + timedelta(days=extend_days)
new_trial_timestamp = int(new_trial_end.timestamp())

try:
    stripe.Subscription.modify(
        subscription_id,
        trial_end=new_trial_timestamp
    )

    db.organizations.update_one(
        {"_id": org_id},
        {
            "$set": {
                "subscription.trialEndsAt": new_trial_end,
                "metadata.updatedAt": datetime.utcnow()
            },
            "$push": {
                "subscription.history": {
                    "action": "trial_extended",
                    "extendedBy": f"{extend_days} days",
                    "timestamp": datetime.utcnow()
                }
            }
        }
    )

    print(f"✅ Trial extended by {extend_days} days")
    print(f"New trial end date: {new_trial_end}")

except stripe.error.StripeError as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

EOF
```

### 4. Cancel Subscription

Cancel subscription immediately or at end of billing period.

```bash
# Cancel at end of period (recommended)
python3 << 'EOF'
import stripe
import os
from pymongo import MongoClient
from datetime import datetime

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
org_id = "<org-id>"
immediate = False  # Set to True for immediate cancellation

client = MongoClient(os.getenv("DATABASE_URL"))
db = client.member_db
org = db.organizations.find_one({"_id": org_id})

subscription_id = org["billing"]["stripeSubscriptionId"]

print(f"Canceling subscription: {subscription_id}")
print(f"Immediate: {immediate}")

try:
    if immediate:
        # Cancel immediately
        subscription = stripe.Subscription.delete(subscription_id)
        new_status = "canceled"
        access_until = datetime.utcnow()
    else:
        # Cancel at period end
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        new_status = "canceling"
        access_until = datetime.fromtimestamp(subscription.current_period_end)

    # Update MongoDB
    db.organizations.update_one(
        {"_id": org_id},
        {
            "$set": {
                "subscription.status": new_status,
                "subscription.canceledAt": datetime.utcnow(),
                "subscription.accessUntil": access_until,
                "metadata.updatedAt": datetime.utcnow()
            },
            "$push": {
                "subscription.history": {
                    "action": "canceled",
                    "immediate": immediate,
                    "timestamp": datetime.utcnow()
                }
            }
        }
    )

    print(f"✅ Subscription canceled")
    print(f"Access until: {access_until}")

    # Optionally disable organization access
    if immediate:
        db.organizations.update_one(
            {"_id": org_id},
            {"$set": {"status": "suspended"}}
        )
        print("⚠️  Organization access suspended")

except stripe.error.StripeError as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

EOF
```

### 5. Usage Reporting

Generate usage reports and check against limits.

```bash
# Get current usage statistics
mongosh "mongodb://admin:admin@localhost:27017/member_db?authSource=admin" << 'EOF'
use member_db;

const org = db.organizations.findOne({ _id: "<org-id>" });

// Count members
const memberCount = db.users.countDocuments({
    organizationId: "<org-id>",
    role: "member",
    status: "active"
});

// Count admins
const adminCount = db.users.countDocuments({
    organizationId: "<org-id>",
    role: "admin",
    status: "active"
});

// Calculate storage (placeholder - implement based on your storage system)
const storageUsed = 0; // In bytes

print("\n" + "=".repeat(60));
print("USAGE REPORT");
print("=".repeat(60));
print(`Organization: ${org.name}`);
print(`Plan: ${org.subscription.plan}`);
print("");

print("Members:");
print(`  Current: ${memberCount}`);
print(`  Limit: ${org.limits.maxMembers === -1 ? 'Unlimited' : org.limits.maxMembers}`);
print(`  Usage: ${org.limits.maxMembers === -1 ? 'N/A' : (memberCount / org.limits.maxMembers * 100).toFixed(1) + '%'}`);

print("\nAdmins:");
print(`  Current: ${adminCount}`);
print(`  Limit: ${org.limits.maxAdmins === -1 ? 'Unlimited' : org.limits.maxAdmins}`);

print("\nStorage:");
print(`  Used: ${(storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB`);
print(`  Limit: ${org.limits.maxStorage === -1 ? 'Unlimited' : (org.limits.maxStorage / 1024 / 1024 / 1024).toFixed(2) + ' GB'}`);

// Check if approaching limits
const warnings = [];
if (org.limits.maxMembers !== -1 && memberCount >= org.limits.maxMembers * 0.8) {
    warnings.push(`⚠️  Approaching member limit (${memberCount}/${org.limits.maxMembers})`);
}

if (warnings.length > 0) {
    print("\n" + "WARNINGS:".padEnd(60, "-"));
    warnings.forEach(w => print(w));
}

// Update usage statistics in organization
db.organizations.updateOne(
    { _id: "<org-id>" },
    {
        $set: {
            "statistics.currentMembers": memberCount,
            "statistics.currentAdmins": adminCount,
            "statistics.storageUsed": storageUsed,
            "statistics.lastCalculated": new Date()
        }
    }
);

EOF
```

## Example Usage

### Upgrade to Premium
```bash
/subscription-manage upgrade --org=550e8400-e29b-41d4-a716-446655440000 --plan=premium
```

### Schedule Downgrade
```bash
/subscription-manage downgrade --org=550e8400-e29b-41d4-a716-446655440000 --plan=basic
```

### Extend Trial
```bash
/subscription-manage trial-extend --org=550e8400-e29b-41d4-a716-446655440000 --days=14
```

### Cancel Subscription
```bash
/subscription-manage cancel --org=550e8400-e29b-41d4-a716-446655440000 --at-period-end
```

### Generate Usage Report
```bash
/subscription-manage usage-report --org=550e8400-e29b-41d4-a716-446655440000
```

## Error Handling

### Common Issues

**1. Payment Method Required**
```bash
# Check if payment method attached
curl "https://api.stripe.com/v1/customers/$CUSTOMER_ID" \
  -u "$STRIPE_SECRET_KEY:" | jq '.default_source'

# Attach payment method
curl -X POST "https://api.stripe.com/v1/payment_methods/$PM_ID/attach" \
  -u "$STRIPE_SECRET_KEY:" \
  -d "customer=$CUSTOMER_ID"
```

**2. Proration Invoice Failed**
```bash
# Retrieve failed invoice
curl "https://api.stripe.com/v1/invoices?subscription=$SUBSCRIPTION_ID&status=open" \
  -u "$STRIPE_SECRET_KEY:"

# Retry payment
curl -X POST "https://api.stripe.com/v1/invoices/$INVOICE_ID/pay" \
  -u "$STRIPE_SECRET_KEY:"
```

**3. Exceeding Plan Limits**
```bash
# Enforce limits before downgrade
python3 << 'EOF'
# Check if current usage exceeds new plan limits
# Prevent downgrade if over limits
# Notify organization to reduce usage first
EOF
```

## Webhooks Integration

Handle Stripe webhook events for automated subscription management.

```bash
# Webhook endpoint implementation (Node.js/Express example)
cat > /home/user/alpha-0.1/src/webhooks/stripe.ts << 'EOF'
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'customer.subscription.updated':
      // Handle subscription update
      break;
    case 'customer.subscription.deleted':
      // Handle cancellation
      break;
    case 'invoice.payment_succeeded':
      // Handle successful payment
      break;
    case 'invoice.payment_failed':
      // Handle failed payment
      break;
  }

  res.json({received: true});
});
EOF
```

## Agent Assignment

This command activates the **subscription-management** agent, coordinating:
- Stripe API integration agent
- MongoDB billing operations agent
- Usage tracking agent
- Email notification agent

## Security & Compliance

- All Stripe API calls use secure server-side keys
- Webhook signatures validated for authenticity
- Payment data never stored locally (PCI compliance)
- Subscription changes logged for audit trail
- Customer consent required for plan changes
