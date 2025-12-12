# Subscription Lifecycle Manager Agent

## Agent Metadata
```yaml
name: subscription-lifecycle-manager
type: developer
model: sonnet
category: stripe-payment
priority: high
keywords:
  - subscription
  - lifecycle
  - trial
  - upgrade
  - downgrade
  - churn
capabilities:
  - subscription_lifecycle
  - trial_management
  - plan_changes
  - churn_prevention
```

## Description

The Subscription Lifecycle Manager Agent handles the complete subscription lifecycle for multi-tenant organizations, including trials, upgrades, downgrades, renewals, and churn prevention strategies.

## Core Responsibilities

1. **Trial Management**
   - Trial period setup
   - Trial extension logic
   - Conversion tracking
   - Trial expiry handling

2. **Plan Transitions**
   - Upgrade flows
   - Downgrade flows
   - Proration calculations
   - Feature adjustment

3. **Renewal Management**
   - Auto-renewal processing
   - Renewal reminders
   - Failed renewal handling
   - Grace period management

4. **Churn Prevention**
   - Cancellation flows
   - Retention offers
   - Winback campaigns
   - Usage analysis

## Subscription Lifecycle Service

### Complete Lifecycle Manager
```typescript
// services/subscription/lifecycleManager.ts
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export class SubscriptionLifecycleManager {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.prisma = new PrismaClient();
  }

  // Trial Management
  async startTrial(
    orgId: string,
    plan: 'starter' | 'professional' | 'enterprise',
    trialDays: number = 14
  ): Promise<TrialResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if already had a trial
    if (org.hadTrial) {
      throw new Error('Organization already used trial period');
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Update organization with trial
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan,
        status: 'trialing',
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEnd,
        hadTrial: true,
        settings: {
          features: this.getFeaturesForPlan(plan),
          limits: this.getLimitsForPlan(plan)
        }
      }
    });

    // Schedule trial expiry notification
    await this.scheduleTrialReminders(orgId, trialEnd);

    return {
      plan,
      trialEndsAt: trialEnd,
      daysRemaining: trialDays
    };
  }

  async extendTrial(orgId: string, additionalDays: number): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org || org.status !== 'trialing') {
      throw new Error('Organization is not in trial');
    }

    const newTrialEnd = new Date(org.trialEndsAt!);
    newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        trialEndsAt: newTrialEnd
      }
    });

    // Log extension
    await this.logLifecycleEvent(orgId, 'trial_extended', {
      additionalDays,
      newTrialEnd
    });
  }

  async convertTrialToSubscription(
    orgId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org || org.status !== 'trialing') {
      throw new Error('Organization is not in trial');
    }

    // Attach payment method
    const stripeService = new StripeService();
    await stripeService.attachPaymentMethod(orgId, paymentMethodId);

    // Create subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: org.stripeCustomerId!,
      items: [{
        price: this.getPriceIdForPlan(org.plan!)
      }],
      metadata: {
        org_id: orgId,
        plan: org.plan!,
        converted_from_trial: 'true'
      }
    });

    // Update organization
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: 'active',
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscription.id,
        trialConvertedAt: new Date()
      }
    });

    // Log conversion
    await this.logLifecycleEvent(orgId, 'trial_converted', {
      plan: org.plan,
      subscriptionId: subscription.id
    });

    return subscription;
  }

  // Plan Transitions
  async upgradePlan(
    orgId: string,
    newPlan: 'professional' | 'enterprise'
  ): Promise<PlanChangeResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const currentPlan = org.plan;
    const planOrder = { starter: 0, professional: 1, enterprise: 2 };

    if (planOrder[newPlan] <= planOrder[currentPlan as keyof typeof planOrder]) {
      throw new Error('New plan must be higher than current plan');
    }

    // Get current subscription
    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    // Calculate proration
    const prorationDate = Math.floor(Date.now() / 1000);
    const invoice = await this.stripe.invoices.retrieveUpcoming({
      customer: org.stripeCustomerId!,
      subscription: org.stripeSubscriptionId,
      subscription_items: [{
        id: subscription.items.data[0].id,
        price: this.getPriceIdForPlan(newPlan)
      }],
      subscription_proration_date: prorationDate
    });

    // Update subscription
    const updatedSubscription = await this.stripe.subscriptions.update(
      org.stripeSubscriptionId,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: this.getPriceIdForPlan(newPlan)
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          org_id: orgId,
          plan: newPlan,
          previous_plan: currentPlan
        }
      }
    );

    // Update organization
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: newPlan,
        settings: {
          features: this.getFeaturesForPlan(newPlan),
          limits: this.getLimitsForPlan(newPlan)
        }
      }
    });

    // Log upgrade
    await this.logLifecycleEvent(orgId, 'plan_upgraded', {
      fromPlan: currentPlan,
      toPlan: newPlan,
      prorationAmount: invoice.amount_due
    });

    return {
      previousPlan: currentPlan!,
      newPlan,
      prorationAmount: invoice.amount_due,
      effectiveDate: new Date()
    };
  }

  async downgradePlan(
    orgId: string,
    newPlan: 'starter' | 'professional',
    immediate: boolean = false
  ): Promise<PlanChangeResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    // Check feature usage before downgrade
    const usageCheck = await this.checkDowngradeEligibility(org, newPlan);
    if (!usageCheck.eligible) {
      throw new Error(`Cannot downgrade: ${usageCheck.reason}`);
    }

    let effectiveDate: Date;

    if (immediate) {
      // Immediate downgrade
      await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: this.getPriceIdForPlan(newPlan)
        }],
        proration_behavior: 'create_prorations'
      });
      effectiveDate = new Date();

      // Update features immediately
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: newPlan,
          settings: {
            features: this.getFeaturesForPlan(newPlan),
            limits: this.getLimitsForPlan(newPlan)
          }
        }
      });
    } else {
      // Downgrade at period end
      await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
        metadata: {
          pending_downgrade: newPlan
        }
      });
      effectiveDate = new Date(subscription.current_period_end * 1000);

      // Mark pending downgrade
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          pendingPlanChange: newPlan,
          planChangeDate: effectiveDate
        }
      });
    }

    // Log downgrade
    await this.logLifecycleEvent(orgId, 'plan_downgraded', {
      fromPlan: org.plan,
      toPlan: newPlan,
      immediate,
      effectiveDate
    });

    return {
      previousPlan: org.plan!,
      newPlan,
      prorationAmount: 0,
      effectiveDate
    };
  }

  // Churn Prevention
  async initiateCancel(orgId: string): Promise<CancelFlowResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true } }
      }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Analyze usage to determine retention offer
    const usage = await this.analyzeUsage(orgId);
    const retentionOffer = this.generateRetentionOffer(org, usage);

    // Log cancellation intent
    await this.logLifecycleEvent(orgId, 'cancel_initiated', {
      currentPlan: org.plan,
      memberCount: org._count.members,
      usage
    });

    return {
      org,
      usage,
      retentionOffer,
      canPause: org.plan !== 'starter'
    };
  }

  async acceptRetentionOffer(
    orgId: string,
    offerId: string
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    // Apply discount coupon
    await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
      coupon: offerId
    });

    // Log retention success
    await this.logLifecycleEvent(orgId, 'retention_offer_accepted', {
      offerId
    });
  }

  async confirmCancel(
    orgId: string,
    immediate: boolean = false,
    reason?: string
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    if (immediate) {
      await this.stripe.subscriptions.cancel(org.stripeSubscriptionId);

      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          status: 'canceled',
          subscriptionStatus: 'canceled',
          canceledAt: new Date(),
          cancellationReason: reason
        }
      });
    } else {
      await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          cancelAtPeriodEnd: true,
          cancellationReason: reason
        }
      });
    }

    // Schedule winback campaign
    await this.scheduleWinbackCampaign(orgId);

    // Log cancellation
    await this.logLifecycleEvent(orgId, 'subscription_canceled', {
      immediate,
      reason
    });
  }

  // Pause Subscription
  async pauseSubscription(
    orgId: string,
    pauseDurationMonths: number = 1
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    const resumeDate = new Date();
    resumeDate.setMonth(resumeDate.getMonth() + pauseDurationMonths);

    await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor(resumeDate.getTime() / 1000)
      }
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: 'paused',
        subscriptionStatus: 'paused',
        pausedAt: new Date(),
        resumesAt: resumeDate
      }
    });

    // Log pause
    await this.logLifecycleEvent(orgId, 'subscription_paused', {
      pauseDurationMonths,
      resumeDate
    });
  }

  // Helper Methods
  private async checkDowngradeEligibility(
    org: any,
    newPlan: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    const limits = this.getLimitsForPlan(newPlan);
    const memberCount = await this.prisma.member.count({
      where: { orgId: org.id }
    });

    if (limits.members !== -1 && memberCount > limits.members) {
      return {
        eligible: false,
        reason: `Current member count (${memberCount}) exceeds ${newPlan} plan limit (${limits.members})`
      };
    }

    return { eligible: true };
  }

  private async analyzeUsage(orgId: string): Promise<UsageMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [memberCount, activeMembers, logins] = await Promise.all([
      this.prisma.member.count({ where: { orgId } }),
      this.prisma.member.count({
        where: {
          orgId,
          lastActiveAt: { gte: thirtyDaysAgo }
        }
      }),
      this.prisma.loginEvent.count({
        where: {
          orgId,
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    return {
      memberCount,
      activeMembers,
      loginCount30Days: logins,
      activeRate: memberCount > 0 ? activeMembers / memberCount : 0
    };
  }

  private generateRetentionOffer(
    org: any,
    usage: UsageMetrics
  ): RetentionOffer | null {
    // High usage = offer discount
    if (usage.activeRate > 0.5) {
      return {
        id: 'RETAIN_50_3MO',
        type: 'discount',
        description: '50% off for 3 months',
        value: 50
      };
    }

    // Medium usage = offer downgrade
    if (usage.activeRate > 0.2) {
      return {
        id: 'DOWNGRADE_OFFER',
        type: 'downgrade',
        description: 'Switch to a lower plan that fits your usage',
        value: 0
      };
    }

    // Low usage = offer pause
    return {
      id: 'PAUSE_3MO',
      type: 'pause',
      description: 'Pause your subscription for up to 3 months',
      value: 0
    };
  }

  private async scheduleTrialReminders(orgId: string, trialEnd: Date) {
    // 7 days before
    const reminder7 = new Date(trialEnd);
    reminder7.setDate(reminder7.getDate() - 7);

    // 3 days before
    const reminder3 = new Date(trialEnd);
    reminder3.setDate(reminder3.getDate() - 3);

    // 1 day before
    const reminder1 = new Date(trialEnd);
    reminder1.setDate(reminder1.getDate() - 1);

    // Queue reminders
    await this.queueNotification(orgId, 'trial_reminder_7d', reminder7);
    await this.queueNotification(orgId, 'trial_reminder_3d', reminder3);
    await this.queueNotification(orgId, 'trial_reminder_1d', reminder1);
  }

  private async scheduleWinbackCampaign(orgId: string) {
    // 7 days after cancel
    const winback7 = new Date();
    winback7.setDate(winback7.getDate() + 7);

    // 30 days after cancel
    const winback30 = new Date();
    winback30.setDate(winback30.getDate() + 30);

    await this.queueNotification(orgId, 'winback_7d', winback7);
    await this.queueNotification(orgId, 'winback_30d', winback30);
  }

  private async queueNotification(
    orgId: string,
    type: string,
    scheduledFor: Date
  ) {
    await this.prisma.scheduledNotification.create({
      data: {
        orgId,
        type,
        scheduledFor,
        status: 'pending'
      }
    });
  }

  private async logLifecycleEvent(
    orgId: string,
    event: string,
    data: any
  ) {
    await this.prisma.subscriptionEvent.create({
      data: {
        orgId,
        event,
        data,
        createdAt: new Date()
      }
    });
  }

  private getFeaturesForPlan(plan: string): Record<string, any> {
    // Same as in stripe-integration-specialist
    const features = {
      starter: { customTheme: false, apiAccess: false, ssoIntegration: false },
      professional: { customTheme: true, apiAccess: true, ssoIntegration: false },
      enterprise: { customTheme: true, apiAccess: true, ssoIntegration: true }
    };
    return features[plan] || features.starter;
  }

  private getLimitsForPlan(plan: string): Record<string, number> {
    const limits = {
      starter: { members: 100, admins: 2, storage: 1024 },
      professional: { members: 1000, admins: 10, storage: 10240 },
      enterprise: { members: -1, admins: -1, storage: -1 }
    };
    return limits[plan] || limits.starter;
  }

  private getPriceIdForPlan(plan: string): string {
    const prices = {
      starter: process.env.STRIPE_STARTER_PRICE_ID!,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!
    };
    return prices[plan] || prices.starter;
  }
}

// Types
interface TrialResult {
  plan: string;
  trialEndsAt: Date;
  daysRemaining: number;
}

interface PlanChangeResult {
  previousPlan: string;
  newPlan: string;
  prorationAmount: number;
  effectiveDate: Date;
}

interface CancelFlowResult {
  org: any;
  usage: UsageMetrics;
  retentionOffer: RetentionOffer | null;
  canPause: boolean;
}

interface UsageMetrics {
  memberCount: number;
  activeMembers: number;
  loginCount30Days: number;
  activeRate: number;
}

interface RetentionOffer {
  id: string;
  type: 'discount' | 'downgrade' | 'pause';
  description: string;
  value: number;
}
```

## Best Practices

1. **Proactive communication** - Send reminders before trials end
2. **Graceful downgrades** - Check feature usage before allowing
3. **Retention first** - Always offer alternatives to cancellation
4. **Data preservation** - Keep data after cancellation for winback
5. **Audit trail** - Log all lifecycle events

## Collaboration Points

- Works with **stripe-integration-specialist** for payments
- Coordinates with **tenant-provisioning-specialist** for features
- Supports **notification-agent** for lifecycle emails
- Integrates with **analytics-agent** for churn analysis
