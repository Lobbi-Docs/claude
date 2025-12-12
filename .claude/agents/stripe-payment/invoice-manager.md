# Invoice Manager Agent

## Agent Metadata
```yaml
name: invoice-manager
type: developer
model: sonnet
category: stripe-payment
priority: medium
keywords:
  - invoice
  - billing
  - receipt
  - statement
  - payment-history
capabilities:
  - invoice_generation
  - payment_history
  - billing_statements
  - receipt_management
```

## Description

The Invoice Manager Agent handles invoice generation, payment history management, billing statements, and receipt delivery for multi-tenant organizations on the Lobbi platform.

## Core Responsibilities

1. **Invoice Management**
   - Invoice generation
   - Custom invoice items
   - Invoice finalization
   - PDF generation

2. **Payment History**
   - Transaction records
   - Payment receipts
   - Refund tracking
   - Export functionality

3. **Billing Statements**
   - Monthly statements
   - Usage summaries
   - Cost breakdowns
   - Tenant billing reports

## Invoice Service Implementation

```typescript
// services/billing/invoiceManager.ts
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export class InvoiceManager {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.prisma = new PrismaClient();
  }

  // Get invoices for organization
  async getInvoices(
    orgId: string,
    options: InvoiceQueryOptions = {}
  ): Promise<InvoiceListResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      return { invoices: [], hasMore: false };
    }

    const invoices = await this.stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: options.limit || 10,
      starting_after: options.startingAfter,
      status: options.status
    });

    return {
      invoices: invoices.data.map(this.mapInvoice),
      hasMore: invoices.has_more
    };
  }

  // Get single invoice
  async getInvoice(orgId: string, invoiceId: string): Promise<Invoice | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      return null;
    }

    const invoice = await this.stripe.invoices.retrieve(invoiceId);

    // Verify ownership
    if (invoice.customer !== org.stripeCustomerId) {
      throw new Error('Invoice does not belong to organization');
    }

    return this.mapInvoice(invoice);
  }

  // Create one-time invoice
  async createInvoice(
    orgId: string,
    items: InvoiceItemInput[],
    options: CreateInvoiceOptions = {}
  ): Promise<Invoice> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no billing account');
    }

    // Create invoice items
    for (const item of items) {
      await this.stripe.invoiceItems.create({
        customer: org.stripeCustomerId,
        amount: item.amount,
        currency: item.currency || 'usd',
        description: item.description
      });
    }

    // Create invoice
    const invoice = await this.stripe.invoices.create({
      customer: org.stripeCustomerId,
      auto_advance: options.autoFinalize ?? true,
      collection_method: options.collectAutomatically ? 'charge_automatically' : 'send_invoice',
      days_until_due: options.daysUntilDue || 30,
      metadata: {
        org_id: orgId,
        ...options.metadata
      }
    });

    // Optionally finalize immediately
    if (options.finalize) {
      await this.stripe.invoices.finalizeInvoice(invoice.id);
    }

    return this.mapInvoice(invoice);
  }

  // Send invoice
  async sendInvoice(orgId: string, invoiceId: string): Promise<void> {
    await this.verifyInvoiceOwnership(orgId, invoiceId);
    await this.stripe.invoices.sendInvoice(invoiceId);
  }

  // Pay invoice
  async payInvoice(orgId: string, invoiceId: string): Promise<Invoice> {
    await this.verifyInvoiceOwnership(orgId, invoiceId);
    const invoice = await this.stripe.invoices.pay(invoiceId);
    return this.mapInvoice(invoice);
  }

  // Void invoice
  async voidInvoice(orgId: string, invoiceId: string): Promise<void> {
    await this.verifyInvoiceOwnership(orgId, invoiceId);
    await this.stripe.invoices.voidInvoice(invoiceId);
  }

  // Get payment history
  async getPaymentHistory(
    orgId: string,
    options: PaymentHistoryOptions = {}
  ): Promise<PaymentHistoryResult> {
    const payments = await this.prisma.payment.findMany({
      where: {
        orgId,
        paidAt: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      orderBy: { paidAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });

    const total = await this.prisma.payment.count({
      where: { orgId }
    });

    return {
      payments,
      total,
      hasMore: (options.offset || 0) + payments.length < total
    };
  }

  // Generate billing statement
  async generateBillingStatement(
    orgId: string,
    period: { start: Date; end: Date }
  ): Promise<BillingStatement> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get payments in period
    const payments = await this.prisma.payment.findMany({
      where: {
        orgId,
        paidAt: {
          gte: period.start,
          lte: period.end
        }
      },
      orderBy: { paidAt: 'asc' }
    });

    // Get invoices
    const invoices = await this.stripe.invoices.list({
      customer: org.stripeCustomerId!,
      created: {
        gte: Math.floor(period.start.getTime() / 1000),
        lte: Math.floor(period.end.getTime() / 1000)
      }
    });

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoiced = invoices.data.reduce((sum, i) => sum + (i.amount_due || 0), 0);

    return {
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan
      },
      period,
      summary: {
        totalInvoiced,
        totalPaid,
        outstandingBalance: totalInvoiced - totalPaid,
        transactionCount: payments.length
      },
      invoices: invoices.data.map(this.mapInvoice),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        date: p.paidAt
      }))
    };
  }

  // Export payment history
  async exportPaymentHistory(
    orgId: string,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<ExportResult> {
    const { payments } = await this.getPaymentHistory(orgId, { limit: 1000 });

    switch (format) {
      case 'csv':
        return this.exportToCSV(payments);
      case 'json':
        return this.exportToJSON(payments);
      case 'pdf':
        return this.exportToPDF(orgId, payments);
      default:
        throw new Error('Unsupported format');
    }
  }

  // Download invoice PDF
  async downloadInvoicePDF(orgId: string, invoiceId: string): Promise<string> {
    await this.verifyInvoiceOwnership(orgId, invoiceId);
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf || '';
  }

  // Helper methods
  private async verifyInvoiceOwnership(orgId: string, invoiceId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org?.stripeCustomerId) {
      throw new Error('Organization has no billing account');
    }

    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    if (invoice.customer !== org.stripeCustomerId) {
      throw new Error('Invoice does not belong to organization');
    }
  }

  private mapInvoice(invoice: Stripe.Invoice): Invoice {
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      description: invoice.description,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      lineItems: invoice.lines?.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity
      })) || []
    };
  }

  private exportToCSV(payments: any[]): ExportResult {
    const headers = ['Date', 'Amount', 'Currency', 'Status', 'Description'];
    const rows = payments.map(p => [
      p.paidAt?.toISOString(),
      (p.amount / 100).toFixed(2),
      p.currency.toUpperCase(),
      p.status,
      p.description || ''
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

    return {
      format: 'csv',
      content: csv,
      filename: `payments-${Date.now()}.csv`,
      mimeType: 'text/csv'
    };
  }

  private exportToJSON(payments: any[]): ExportResult {
    return {
      format: 'json',
      content: JSON.stringify(payments, null, 2),
      filename: `payments-${Date.now()}.json`,
      mimeType: 'application/json'
    };
  }

  private async exportToPDF(orgId: string, payments: any[]): Promise<ExportResult> {
    // Generate PDF (implementation depends on PDF library)
    const pdfContent = await this.generatePaymentsPDF(orgId, payments);

    return {
      format: 'pdf',
      content: pdfContent,
      filename: `payments-${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  private async generatePaymentsPDF(orgId: string, payments: any[]): Promise<string> {
    // PDF generation implementation
    return 'base64-pdf-content';
  }
}

// Types
interface InvoiceQueryOptions {
  limit?: number;
  startingAfter?: string;
  status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
}

interface InvoiceListResult {
  invoices: Invoice[];
  hasMore: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  description: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  lineItems: {
    description: string | null;
    amount: number;
    quantity: number | null;
  }[];
}

interface InvoiceItemInput {
  amount: number;
  description: string;
  currency?: string;
}

interface CreateInvoiceOptions {
  autoFinalize?: boolean;
  collectAutomatically?: boolean;
  daysUntilDue?: number;
  finalize?: boolean;
  metadata?: Record<string, string>;
}

interface PaymentHistoryOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface PaymentHistoryResult {
  payments: any[];
  total: number;
  hasMore: boolean;
}

interface BillingStatement {
  organization: {
    id: string;
    name: string;
    plan: string | null;
  };
  period: { start: Date; end: Date };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
    transactionCount: number;
  };
  invoices: Invoice[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: Date | null;
  }[];
}

interface ExportResult {
  format: string;
  content: string;
  filename: string;
  mimeType: string;
}
```

## Best Practices

1. **Verify ownership** - Always check invoice belongs to org
2. **Currency handling** - Store amounts in cents
3. **Timezone awareness** - Use UTC for all dates
4. **Audit logging** - Log all invoice operations
5. **PDF caching** - Cache generated PDFs

## Collaboration Points

- Works with **stripe-integration-specialist** for payments
- Coordinates with **subscription-lifecycle-manager** for billing
- Supports **notification-agent** for invoice delivery
- Integrates with **reporting-agent** for financial reports
