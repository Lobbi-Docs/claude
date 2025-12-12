# Stripe Payments Integration

Stripe payments and subscription management skill for Lobbi member management system. Activates when working with payment processing, subscription management, or billing workflows.

**Triggers:** stripe, payment, subscription, billing, invoice, checkout, webhook, customer, payment-method, card

**Use this skill when:**
- Implementing Stripe checkout flows
- Managing subscriptions and billing cycles
- Handling Stripe webhooks
- Processing payments and refunds
- Managing customer payment methods
- Implementing usage-based billing

## Allowed Tools

- stripe (Stripe Node.js SDK)
- express (webhook endpoints)
- prisma (payment data persistence)
- typescript (type safety)
- jest (payment flow testing)

## Instructions

### Core Principles

1. **Idempotency**
   - Use Stripe idempotency keys for all mutations
   - Store operation results in database
   - Handle duplicate webhook events gracefully
   - Never charge customers twice

2. **Webhook Security**
   - Always verify webhook signatures
   - Use raw body for signature verification
   - Handle events asynchronously
   - Implement retry logic with exponential backoff

3. **Error Handling**
   - Gracefully handle payment failures
   - Log all Stripe API errors
   - Provide user-friendly error messages
   - Implement fallback for failed webhooks

4. **Testing Strategy**
   - Use Stripe test mode for development
   - Test webhook events with Stripe CLI
   - Mock Stripe API in unit tests
   - Test payment flows end-to-end

### Architecture Layers

```
Client → Checkout Session → Stripe → Webhook → Service → Repository → Database
         (create intent)     (process) (notify)  (update)  (persist)
```

### Implementation Checklist

- [ ] Configure Stripe API keys (test + production)
- [ ] Set up webhook endpoint with signature verification
- [ ] Create Stripe customer on organization signup
- [ ] Implement subscription creation/update/cancel flows
- [ ] Handle payment method updates
- [ ] Implement invoice generation and payment
- [ ] Add webhook event processing (async)
- [ ] Test all payment scenarios
- [ ] Add monitoring and alerting for failed payments

## Code Examples

### 1. Stripe Configuration

```typescript
// backend/src/config/stripe.config.ts

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Lobbi Member Management',
    version: '1.0.0',
  },
});

export const STRIPE_CONFIG = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
};

// Price IDs from Stripe Dashboard
export const STRIPE_PRICES = {
  BASIC_MONTHLY: process.env.STRIPE_PRICE_BASIC_MONTHLY!,
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!,
};
```

### 2. Stripe Customer Management

```typescript
// backend/src/services/stripe-customer.service.ts

import { stripe } from '../config/stripe.config';
import { OrganizationRepository } from '../repositories/organization.repository';
import Stripe from 'stripe';

export class StripeCustomerService {
  constructor(private organizationRepository: OrganizationRepository) {}

  /**
   * Create Stripe customer for organization
   */
  async createCustomer(
    organizationId: string,
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
        ...metadata,
      },
    });

    // Store customer ID in database
    await this.organizationRepository.update(organizationId, {
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(organizationId: string): Promise<string> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Return existing customer ID if present
    if (organization.stripeCustomerId) {
      return organization.stripeCustomerId;
    }

    // Create new customer
    return this.createCustomer(
      organizationId,
      organization.email,
      organization.name
    );
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    customerId: string,
    data: {
      email?: string;
      name?: string;
      address?: Stripe.AddressParam;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Customer> {
    return stripe.customers.update(customerId, data);
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setAsDefault = true
  ): Promise<void> {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
  }

  /**
   * List customer payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Delete customer (careful!)
   */
  async deleteCustomer(customerId: string): Promise<void> {
    await stripe.customers.del(customerId);
  }
}
```

### 3. Subscription Management Service

```typescript
// backend/src/services/stripe-subscription.service.ts

import { stripe } from '../config/stripe.config';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import Stripe from 'stripe';

export interface CreateSubscriptionDto {
  organizationId: string;
  customerId: string;
  priceId: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export class StripeSubscriptionService {
  constructor(private subscriptionRepository: SubscriptionRepository) {}

  /**
   * Create subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<Stripe.Subscription> {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: data.customerId,
      items: [
        {
          price: data.priceId,
          quantity: data.quantity || 1,
        },
      ],
      metadata: {
        organizationId: data.organizationId,
        ...data.metadata,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (data.trialDays) {
      subscriptionParams.trial_period_days = data.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Store in database
    await this.subscriptionRepository.create({
      organizationId: data.organizationId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: data.customerId,
      stripePriceId: data.priceId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    return subscription;
  }

  /**
   * Update subscription (change plan, quantity, etc.)
   */
  async updateSubscription(
    subscriptionId: string,
    data: {
      priceId?: string;
      quantity?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updateParams: Stripe.SubscriptionUpdateParams = {
      metadata: data.metadata,
    };

    // Update subscription items if price or quantity changed
    if (data.priceId || data.quantity) {
      updateParams.items = [
        {
          id: subscription.items.data[0].id,
          price: data.priceId || subscription.items.data[0].price.id,
          quantity: data.quantity,
        },
      ];
      updateParams.proration_behavior = 'always_invoice';
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      updateParams
    );

    // Update in database
    await this.subscriptionRepository.updateByStripeId(subscriptionId, {
      stripePriceId: data.priceId,
      status: updatedSubscription.status,
      currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
    });

    return updatedSubscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately = false
  ): Promise<Stripe.Subscription> {
    let subscription: Stripe.Subscription;

    if (cancelImmediately) {
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update in database
    await this.subscriptionRepository.updateByStripeId(subscriptionId, {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    });

    return subscription;
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await this.subscriptionRepository.updateByStripeId(subscriptionId, {
      status: subscription.status,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    return subscription;
  }

  /**
   * Get subscription with details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer', 'default_payment_method'],
    });
  }

  /**
   * List subscriptions for customer
   */
  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.latest_invoice'],
    });

    return subscriptions.data;
  }
}
```

### 4. Checkout Session Service

```typescript
// backend/src/services/stripe-checkout.service.ts

import { stripe, STRIPE_CONFIG } from '../config/stripe.config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionDto {
  organizationId: string;
  customerId: string;
  priceId: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export class StripeCheckoutService {
  /**
   * Create checkout session for new subscription
   */
  async createCheckoutSession(
    data: CreateCheckoutSessionDto
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      customer: data.customerId,
      mode: 'subscription',
      line_items: [
        {
          price: data.priceId,
          quantity: data.quantity || 1,
        },
      ],
      success_url: data.successUrl || STRIPE_CONFIG.successUrl,
      cancel_url: data.cancelUrl || STRIPE_CONFIG.cancelUrl,
      metadata: {
        organizationId: data.organizationId,
        ...data.metadata,
      },
      subscription_data: {
        metadata: {
          organizationId: data.organizationId,
        },
      },
    });

    return session;
  }

  /**
   * Create checkout session for payment method update
   */
  async createPaymentMethodUpdateSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      success_url: returnUrl,
      cancel_url: returnUrl,
    });
  }

  /**
   * Create portal session for customer self-service
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}
```

### 5. Webhook Handler

```typescript
// backend/src/services/stripe-webhook.service.ts

import { stripe, STRIPE_CONFIG } from '../config/stripe.config';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import Stripe from 'stripe';

export class StripeWebhookService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private invoiceRepository: InvoiceRepository
  ) {}

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      // Subscription events
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      // Invoice events
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.finalized':
        await this.handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;

      // Payment events
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;

    await this.subscriptionRepository.upsert({
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: subscription.items.data[0].price.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    await this.subscriptionRepository.updateByStripeId(subscription.id, {
      status: subscription.status,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.subscriptionRepository.updateByStripeId(subscription.id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceRepository.upsert({
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      stripeSubscriptionId: invoice.subscription as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paidAt: invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceRepository.updateByStripeId(invoice.id, {
      status: 'payment_failed',
    });

    // TODO: Send notification to customer about failed payment
  }

  private async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceRepository.upsert({
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      stripeSubscriptionId: invoice.subscription as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    });
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    // Handle one-time payments if needed
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment failed: ${paymentIntent.id}`);
    // Handle failed payments
  }
}
```

### 6. Webhook Controller

```typescript
// backend/src/controllers/stripe-webhook.controller.ts

import { Request, Response } from 'express';
import { StripeWebhookService } from '../services/stripe-webhook.service';

export class StripeWebhookController {
  constructor(private webhookService: StripeWebhookService) {}

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    try {
      // Verify webhook signature
      const event = this.webhookService.verifyWebhookSignature(
        req.body,
        signature
      );

      // Process event asynchronously
      this.webhookService.handleWebhookEvent(event).catch(error => {
        console.error('Error processing webhook event:', error);
      });

      // Acknowledge receipt immediately
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
```

### 7. Webhook Route Setup

```typescript
// backend/src/routes/stripe.routes.ts

import { Router } from 'express';
import express from 'express';
import { StripeWebhookController } from '../controllers/stripe-webhook.controller';

export const createStripeRouter = (
  webhookController: StripeWebhookController
): Router => {
  const router = Router();

  // Webhook endpoint - MUST use raw body for signature verification
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    webhookController.handleWebhook.bind(webhookController)
  );

  return router;
};

// In main app.ts, configure BEFORE other middleware:
// app.use('/api/stripe', createStripeRouter(stripeWebhookController));
// app.use(express.json()); // JSON parsing for other routes
```

### 8. Subscription Controller

```typescript
// backend/src/controllers/subscription.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types/tenant.types';
import { StripeSubscriptionService } from '../services/stripe-subscription.service';
import { StripeCheckoutService } from '../services/stripe-checkout.service';
import { StripeCustomerService } from '../services/stripe-customer.service';

export class SubscriptionController {
  constructor(
    private subscriptionService: StripeSubscriptionService,
    private checkoutService: StripeCheckoutService,
    private customerService: StripeCustomerService
  ) {}

  async createCheckoutSession(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { priceId, quantity } = req.body;
      const organizationId = req.tenant.organizationId;

      // Get or create Stripe customer
      const customerId = await this.customerService.getOrCreateCustomer(organizationId);

      // Create checkout session
      const session = await this.checkoutService.createCheckoutSession({
        organizationId,
        customerId,
        priceId,
        quantity,
        successUrl: `${req.headers.origin}/subscription/success`,
        cancelUrl: `${req.headers.origin}/subscription/cancel`,
      });

      res.json({ sessionUrl: session.url });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentSubscription(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant.organizationId;
      const customerId = await this.customerService.getOrCreateCustomer(organizationId);

      const subscriptions = await this.subscriptionService.listSubscriptions(customerId);
      const activeSubscription = subscriptions.find(s =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );

      res.json({ data: activeSubscription || null });
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = req.params;
      const { immediate } = req.body;

      const subscription = await this.subscriptionService.cancelSubscription(
        subscriptionId,
        immediate
      );

      res.json({ data: subscription });
    } catch (error) {
      next(error);
    }
  }

  async createPortalSession(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant.organizationId;
      const customerId = await this.customerService.getOrCreateCustomer(organizationId);

      const session = await this.checkoutService.createPortalSession(
        customerId,
        `${req.headers.origin}/settings/billing`
      );

      res.json({ portalUrl: session.url });
    } catch (error) {
      next(error);
    }
  }
}
```

### 9. Testing Stripe Integration

```typescript
// backend/src/services/__tests__/stripe-subscription.service.test.ts

import Stripe from 'stripe';
import { StripeSubscriptionService } from '../stripe-subscription.service';
import { stripe } from '../../config/stripe.config';

// Mock Stripe
jest.mock('../../config/stripe.config', () => ({
  stripe: {
    subscriptions: {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      retrieve: jest.fn(),
    },
  },
}));

describe('StripeSubscriptionService', () => {
  let service: StripeSubscriptionService;
  let mockSubscriptionRepository: any;

  beforeEach(() => {
    mockSubscriptionRepository = {
      create: jest.fn(),
      updateByStripeId: jest.fn(),
    };
    service = new StripeSubscriptionService(mockSubscriptionRepository);
  });

  describe('createSubscription', () => {
    it('should create subscription and store in database', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1234567890,
        current_period_end: 1234567890,
        cancel_at_period_end: false,
        items: {
          data: [{ price: { id: 'price_123' } } as any],
        } as any,
      };

      (stripe.subscriptions.create as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.createSubscription({
        organizationId: 'org_123',
        customerId: 'cus_123',
        priceId: 'price_123',
      });

      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          items: [{ price: 'price_123', quantity: 1 }],
        })
      );

      expect(mockSubscriptionRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });
  });
});
```

## Best Practices

1. **Use webhooks for state changes** - Don't rely on API responses alone
2. **Implement idempotency** - Use idempotency keys for all mutations
3. **Verify signatures** - Always verify webhook signatures
4. **Handle async events** - Process webhooks asynchronously
5. **Test thoroughly** - Use Stripe test mode and Stripe CLI
6. **Log everything** - Log all Stripe API calls and errors
7. **Handle failures gracefully** - Implement retry logic and fallbacks

## Common Pitfalls

- ❌ Not verifying webhook signatures
- ❌ Processing webhooks synchronously
- ❌ Not handling duplicate webhook events
- ❌ Forgetting to expand related objects
- ❌ Not testing with Stripe CLI
- ❌ Hardcoding price IDs in code
- ❌ Not handling subscription lifecycle events

## Testing Checklist

- [ ] Test subscription creation flow
- [ ] Test subscription updates (upgrade/downgrade)
- [ ] Test subscription cancellation
- [ ] Test payment method updates
- [ ] Test webhook signature verification
- [ ] Test webhook event processing
- [ ] Test failed payment scenarios
- [ ] Test refund flows
- [ ] Test invoice generation
- [ ] Test customer portal access

## Stripe CLI Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

## Related Skills

- **rest-api** - API design for payment endpoints
- **database** - Storing subscription data
- **authentication** - Securing payment endpoints
- **testing** - Integration testing with Stripe
