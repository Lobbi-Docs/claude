# Stripe Integration Specialist Agent

## Agent Metadata
```yaml
name: stripe-integration-specialist
type: developer
model: sonnet
category: stripe-payment
priority: high
keywords:
  - stripe
  - payment
  - subscription
  - billing
  - webhook
  - checkout
capabilities:
  - stripe_api
  - payment_processing
  - subscription_management
  - webhook_handling
```

## Description

The Stripe Integration Specialist Agent handles all Stripe API integrations for the Lobbi platform, including payment processing, subscription management, webhook handling, and billing operations in a multi-tenant environment.

## Core Responsibilities

1. **Payment Processing**
   - Checkout session creation
   - Payment intent management
   - Payment method handling
   - Refund processing

2. **Subscription Management**
   - Subscription creation/updates
   - Plan management
   - Usage-based billing
   - Proration handling

3. **Webhook Integration**
   - Webhook endpoint setup
   - Event verification
   - Event processing
   - Retry handling

4. **Multi-Tenant Billing**
   - Per-organization customers
   - Tenant-isolated billing
   - Organization billing portal
   - Invoice management

## Stripe Service Implementation

### Core Stripe Service
```typescript
// services/stripe/stripeService.ts
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export class StripeService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.prisma = new PrismaClient();
  }

  // Customer Management
  async getOrCreateCustomer(orgId: string): Promise<Stripe.Customer> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    if (org.stripeCustomerId) {
      return await this.stripe.customers.retrieve(org.stripeCustomerId) as Stripe.Customer;
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      name: org.name,
      email: org.billingEmail || org.contactEmail,
      metadata: {
        org_id: orgId,
        org_slug: org.slug
      }
    });

    // Update organization with Stripe customer ID
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customer.id }
    });

    return customer;
  }

  // Payment Method Management
  async attachPaymentMethod(
    orgId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    const customer = await this.getOrCreateCustomer(orgId);

    const paymentMethod = await this.stripe.paymentMethods.attach(
      paymentMethodId,
      { customer: customer.id }
    );

    // Set as default
    await this.stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    return paymentMethod;
  }

  // Checkout Session
  async createCheckoutSession(
    orgId: string,
    priceId: string,
    options: CheckoutOptions = {}
  ): Promise<Stripe.Checkout.Session> {
    const customer = await this.getOrCreateCustomer(orgId);
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    return await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: options.quantity || 1
      }],
      success_url: `${process.env.APP_URL}/${org!.slug}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/${org!.slug}/billing/cancel`,
      metadata: {
        org_id: orgId
      },
      subscription_data: {
        metadata: {
          org_id: orgId
        }
      },
      allow_promotion_codes: options.allowPromoCodes || false
    });
  }

  // Payment Intent for one-time payments
  async createPaymentIntent(
    orgId: string,
    amount: number,
    currency: string = 'usd',
    description?: string
  ): Promise<Stripe.PaymentIntent> {
    const customer = await this.getOrCreateCustomer(orgId);

    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customer.id,
      description,
      metadata: {
        org_id: orgId
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
  }
}

interface CheckoutOptions {
  quantity?: number;
  allowPromoCodes?: boolean;
}
```

### Subscription Service
```typescript
// services/stripe/subscriptionService.ts
export class SubscriptionService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.prisma = new PrismaClient();
  }

  // Plan mapping
  private readonly PLAN_PRICES: Record<string, string> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID!,
    professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!
  };

  async createSubscription(
    orgId: string,
    plan: 'starter' | 'professional' | 'enterprise'
  ): Promise<Stripe.Subscription> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no Stripe customer');
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [{
        price: this.PLAN_PRICES[plan]
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      metadata: {
        org_id: orgId,
        plan
      },
      expand: ['latest_invoice.payment_intent']
    });

    // Update organization
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        plan,
        subscriptionStatus: subscription.status
      }
    });

    return subscription;
  }

  async updateSubscription(
    orgId: string,
    newPlan: 'starter' | 'professional' | 'enterprise'
  ): Promise<Stripe.Subscription> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('Organization has no active subscription');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    // Update subscription item
    const updatedSubscription = await this.stripe.subscriptions.update(
      org.stripeSubscriptionId,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: this.PLAN_PRICES[newPlan]
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          org_id: orgId,
          plan: newPlan
        }
      }
    );

    // Update organization
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: newPlan,
        subscriptionStatus: updatedSubscription.status
      }
    });

    return updatedSubscription;
  }

  async cancelSubscription(
    orgId: string,
    immediate: boolean = false
  ): Promise<Stripe.Subscription> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('Organization has no active subscription');
    }

    let subscription: Stripe.Subscription;

    if (immediate) {
      subscription = await this.stripe.subscriptions.cancel(
        org.stripeSubscriptionId
      );
    } else {
      subscription = await this.stripe.subscriptions.update(
        org.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
    }

    // Update organization
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    return subscription;
  }

  async getSubscriptionStatus(orgId: string): Promise<SubscriptionStatus> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeSubscriptionId) {
      return {
        status: 'none',
        plan: null,
        currentPeriodEnd: null
      };
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    return {
      status: subscription.status,
      plan: org.plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
  }
}

interface SubscriptionStatus {
  status: string;
  plan: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd?: boolean;
}
```

## Webhook Handler

### Webhook Processing
```typescript
// api/webhooks/stripe.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle events
  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  const webhookHandler = new StripeWebhookHandler();

  switch (event.type) {
    case 'checkout.session.completed':
      await webhookHandler.handleCheckoutComplete(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await webhookHandler.handleSubscriptionUpdate(
        event.data.object as Stripe.Subscription
      );
      break;

    case 'customer.subscription.deleted':
      await webhookHandler.handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
      break;

    case 'invoice.paid':
      await webhookHandler.handleInvoicePaid(
        event.data.object as Stripe.Invoice
      );
      break;

    case 'invoice.payment_failed':
      await webhookHandler.handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice
      );
      break;

    case 'payment_intent.succeeded':
      await webhookHandler.handlePaymentSucceeded(
        event.data.object as Stripe.PaymentIntent
      );
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

class StripeWebhookHandler {
  private prisma = new PrismaClient();

  async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const orgId = session.metadata?.org_id;
    if (!orgId) return;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: 'active',
        subscriptionStatus: 'active'
      }
    });

    // Send confirmation email
    await this.sendSubscriptionConfirmation(orgId);
  }

  async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata?.org_id;
    if (!orgId) return;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        plan: subscription.metadata?.plan || 'starter',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });

    // Update feature flags based on plan
    await this.updateFeatureFlags(orgId, subscription.metadata?.plan);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata?.org_id;
    if (!orgId) return;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: 'canceled',
        plan: 'starter' // Downgrade to starter
      }
    });

    // Notify organization admins
    await this.notifySubscriptionCanceled(orgId);
  }

  async handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!org) return;

    // Record payment
    await this.prisma.payment.create({
      data: {
        orgId: org.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        paidAt: new Date()
      }
    });
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!org) return;

    // Update org status
    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: 'past_due'
      }
    });

    // Notify admins
    await this.notifyPaymentFailed(org.id, invoice);
  }

  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const orgId = paymentIntent.metadata?.org_id;
    if (!orgId) return;

    // Record one-time payment
    await this.prisma.payment.create({
      data: {
        orgId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        description: paymentIntent.description,
        paidAt: new Date()
      }
    });
  }

  private async updateFeatureFlags(orgId: string, plan?: string) {
    const features = this.getFeaturesForPlan(plan || 'starter');

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          features
        }
      }
    });
  }

  private getFeaturesForPlan(plan: string): Record<string, boolean> {
    const features = {
      starter: {
        customTheme: false,
        apiAccess: false,
        ssoIntegration: false,
        advancedReporting: false,
        customDomain: false,
        maxMembers: 100
      },
      professional: {
        customTheme: true,
        apiAccess: true,
        ssoIntegration: false,
        advancedReporting: true,
        customDomain: false,
        maxMembers: 1000
      },
      enterprise: {
        customTheme: true,
        apiAccess: true,
        ssoIntegration: true,
        advancedReporting: true,
        customDomain: true,
        maxMembers: -1 // Unlimited
      }
    };
    return features[plan] || features.starter;
  }

  private async sendSubscriptionConfirmation(orgId: string) {
    // Implementation for email sending
  }

  private async notifySubscriptionCanceled(orgId: string) {
    // Implementation for notification
  }

  private async notifyPaymentFailed(orgId: string, invoice: Stripe.Invoice) {
    // Implementation for payment failure notification
  }
}
```

## Billing Portal Integration

### Customer Portal
```typescript
// services/stripe/billingPortal.ts
export class BillingPortalService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.prisma = new PrismaClient();
  }

  async createPortalSession(orgId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no billing account');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.APP_URL}/${org.slug}/settings/billing`
    });

    return session.url;
  }

  async getInvoices(orgId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      return [];
    }

    const invoices = await this.stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit
    });

    return invoices.data;
  }

  async getUpcomingInvoice(orgId: string): Promise<Stripe.Invoice | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      return null;
    }

    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: org.stripeCustomerId
      });
    } catch {
      return null;
    }
  }
}
```

## Best Practices

1. **Idempotency** - Use idempotency keys for payment operations
2. **Webhook verification** - Always verify webhook signatures
3. **Error handling** - Handle Stripe errors gracefully
4. **Metadata** - Always include org_id in metadata
5. **Testing** - Use Stripe test mode and CLI for development
6. **Audit logging** - Log all payment events

## Collaboration Points

- Works with **tenant-provisioning-specialist** for org billing setup
- Coordinates with **multi-tenant-architect** for data isolation
- Supports **membership-specialist** for member limits
- Integrates with **notification-agent** for billing alerts
