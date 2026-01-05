/**
 * PHASE 5: BILLING + STRIPE API ENDPOINTS
 * ========================================
 * 5 endpoints for Stripe integration, subscriptions, and billing
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add these endpoints to apps/api/src/index.ts BEFORE app.listen()
 * 2. Install: npm install stripe
 * 3. Import: import Stripe from 'stripe';
 * 4. Import: import { prisma } from '@novasolutiontax/db';
 * 5. Set env: STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
 * 
 * READY_TO_COPY: Just paste into index.ts - no modifications needed
 * ===================================================================
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Pricing plans configuration
const PLANS = {
  FREE: { id: 'free', name: 'Free', price: 0, features: 5, maxReturns: 1 },
  PROFESSIONAL: {
    id: 'price_professional',
    name: 'Professional',
    price: 99,
    features: 20,
    maxReturns: 10,
    stripeId: 'price_professional'
  },
  ENTERPRISE: {
    id: 'price_enterprise',
    name: 'Enterprise',
    price: 299,
    features: 100,
    maxReturns: 1000,
    stripeId: 'price_enterprise'
  }
};

// ============================================================================
// ENDPOINT 1: POST /api/billing/checkout
// ============================================================================
// Purpose: Create Stripe checkout session
// Body: { planId: 'free' | 'price_professional' | 'price_enterprise', quantity?: number }
// Returns: { sessionId: string, url: string }
// Use: Redirect user to checkout page
//
// Response:
// {
//   "sessionId": "cs_test_123456789",
//   "url": "https://checkout.stripe.com/pay/cs_test_123456789",
//   "plan": "professional",
//   "message": "Checkout session created successfully"
// }

app.post('/api/billing/checkout', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { organization: true }
    });

    if (!user || user.organizationId !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: req.tenantId }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Handle free plan
    if (planId === 'free') {
      // Update subscription directly
      await prisma.subscription.upsert({
        where: { organizationId: req.tenantId },
        create: {
          organizationId: req.tenantId,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false
        },
        update: {
          plan: 'FREE',
          status: 'ACTIVE'
        }
      });

      return res.json({
        planId: 'free',
        plan: 'free',
        message: 'Free plan activated successfully',
        status: 'ACTIVE'
      });
    }

    // Validate plan
    const plan = Object.values(PLANS).find(p => p.stripeId === planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: organization.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: planId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/billing/cancel`,
      metadata: {
        organizationId: organization.id,
        userId: user.id,
        plan: plan.name
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      plan: plan.name.toLowerCase(),
      message: 'Checkout session created successfully'
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 2: POST /api/billing/webhooks/stripe
// ============================================================================
// Purpose: Handle Stripe webhook events
// Events: customer.subscription.created, customer.subscription.updated, charge.succeeded, invoice.paid
// Returns: { received: true }
// Use: Webhook endpoint from Stripe dashboard
//
// Handles:
// - subscription.created → Create Subscription in DB
// - subscription.updated → Update Subscription status
// - invoice.paid → Create Invoice record
// - charge.succeeded → Payment success

app.post('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe signature' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;

        if (!organizationId) break;

        const plan = subscription.items.data[0]?.price?.lookup_key || 'PROFESSIONAL';

        await prisma.subscription.upsert({
          where: { organizationId },
          create: {
            organizationId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            plan: plan.toUpperCase(),
            status: subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          },
          update: {
            status: subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const organizationId = invoice.metadata?.organizationId;

        if (!organizationId) break;

        await prisma.invoice.create({
          data: {
            organizationId,
            stripeInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'PAID',
            paidAt: new Date(invoice.paid_date! * 1000),
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            receiptUrl: invoice.receipt_url || undefined,
            pdfUrl: invoice.pdf || undefined
          }
        });

        // Log in audit
        await prisma.auditLog.create({
          data: {
            organizationId,
            userId: '', // System event
            action: 'PAYMENT_RECEIVED',
            reason: `Payment of ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`,
            metadata: {
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_paid,
              period: `${new Date(invoice.period_start * 1000).toDateString()} - ${new Date(invoice.period_end * 1000).toDateString()}`
            }
          }
        });
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        console.error('Payment failed:', charge.id, charge.failure_message);

        // Could trigger email notification here
        await prisma.auditLog.create({
          data: {
            organizationId: charge.metadata?.organizationId || '',
            userId: '',
            action: 'PAYMENT_FAILED',
            reason: charge.failure_message || 'Payment processing failed',
            metadata: {
              chargeId: charge.id,
              amount: charge.amount
            }
          }
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;

        if (organizationId) {
          await prisma.subscription.update({
            where: { organizationId },
            data: { status: 'CANCELLED' }
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// ============================================================================
// ENDPOINT 3: GET /api/billing/subscriptions
// ============================================================================
// Purpose: Get subscription details for current organization
// Returns: Subscription object with plan, status, dates
// Use: Display current subscription in settings
//
// Response:
// {
//   "id": "sub-123",
//   "plan": "PROFESSIONAL",
//   "status": "ACTIVE",
//   "currentPeriodStart": "2026-01-04T00:00:00Z",
//   "currentPeriodEnd": "2026-02-04T00:00:00Z",
//   "cancelAtPeriodEnd": false,
//   "amountPaid": 9900,
//   "currency": "usd",
//   "nextPaymentDate": "2026-02-04T00:00:00Z"
// }

app.get('/api/billing/subscriptions', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.tenantId }
    });

    if (!subscription) {
      return res.json({
        plan: 'FREE',
        status: 'ACTIVE',
        message: 'Organization on free plan'
      });
    }

    // Get plan pricing
    const planInfo = Object.values(PLANS).find(p => p.id === subscription.plan.toLowerCase());

    res.json({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      monthlyPrice: planInfo?.price || 0,
      features: planInfo?.features || 0,
      maxReturns: planInfo?.maxReturns || 0,
      daysUntilRenewal: Math.ceil(
        (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
      nextPaymentDate: subscription.currentPeriodEnd
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 4: PUT /api/billing/subscriptions/:id/update-plan
// ============================================================================
// Purpose: Change subscription plan
// Body: { newPlanId: string }
// Returns: Updated subscription
// Use: Upgrade/downgrade plan
//
// Response:
// {
//   "id": "sub-123",
//   "plan": "ENTERPRISE",
//   "status": "ACTIVE",
//   "message": "Plan updated successfully"
// }

app.put('/api/billing/subscriptions/:id/update-plan', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'newPlanId is required' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.tenantId }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Cannot update subscription without Stripe ID' });
    }

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPlanId
          }
        ]
      }
    );

    // Update database
    const plan = Object.values(PLANS).find(p => p.stripeId === newPlanId);
    const updated = await prisma.subscription.update({
      where: { organizationId: req.tenantId },
      data: {
        plan: (plan?.name || 'PROFESSIONAL').toUpperCase()
      }
    });

    // Log change
    await prisma.auditLog.create({
      data: {
        organizationId: req.tenantId,
        userId: req.userId,
        action: 'PLAN_UPGRADED',
        reason: `Plan changed to ${plan?.name}`,
        metadata: {
          oldPlan: subscription.plan,
          newPlan: plan?.name,
          newPrice: plan?.price
        }
      }
    });

    res.json({
      id: updated.id,
      plan: updated.plan,
      status: updated.status,
      message: `Plan updated to ${plan?.name} successfully`
    });
  } catch (error: any) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ error: 'Failed to update subscription plan', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 5: DELETE /api/billing/subscriptions/:id/cancel
// ============================================================================
// Purpose: Cancel subscription
// Query: ?immediate=true (cancel immediately or at period end)
// Returns: Cancelled subscription
// Use: Cancel subscription
//
// Response:
// {
//   "id": "sub-123",
//   "status": "CANCELLED",
//   "cancelAt": "2026-02-04T00:00:00Z",
//   "message": "Subscription cancelled successfully"
// }

app.delete('/api/billing/subscriptions/:id/cancel', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { immediate } = req.query;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.tenantId }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Cannot cancel subscription without Stripe ID' });
    }

    // Cancel Stripe subscription
    if (immediate === 'true') {
      await stripe.subscriptions.del(subscription.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }

    // Update database
    const updated = await prisma.subscription.update({
      where: { organizationId: req.tenantId },
      data: {
        status: immediate === 'true' ? 'CANCELLED' : 'ACTIVE',
        cancelAtPeriodEnd: immediate !== 'true'
      }
    });

    // Log cancellation
    await prisma.auditLog.create({
      data: {
        organizationId: req.tenantId,
        userId: req.userId,
        action: 'SUBSCRIPTION_CANCELLED',
        reason: immediate === 'true' ? 'Cancelled immediately' : 'Scheduled cancellation at period end',
        metadata: {
          planCancelled: subscription.plan,
          effectiveDate: immediate === 'true' ? new Date() : subscription.currentPeriodEnd
        }
      }
    });

    res.json({
      id: updated.id,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      cancelDate: updated.currentPeriodEnd,
      message: 'Subscription cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 6: GET /api/billing/invoices
// ============================================================================
// Purpose: Get all invoices for organization
// Query: ?page=1&limit=20
// Returns: Paginated list of invoices
// Use: Invoice history page
//
// Response:
// {
//   "total": 12,
//   "page": 1,
//   "limit": 20,
//   "invoices": [
//     {
//       "id": "invoice-123",
//       "amount": 9900,
//       "currency": "usd",
//       "status": "PAID",
//       "paidAt": "2026-01-04T10:30:00Z",
//       "periodStart": "2026-01-04T00:00:00Z",
//       "periodEnd": "2026-02-04T00:00:00Z",
//       "pdfUrl": "https://..."
//     }
//   ]
// }

app.get('/api/billing/invoices', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.invoice.count({
      where: { organizationId: req.tenantId }
    });

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      invoices: invoices.map(inv => ({
        id: inv.id,
        stripeInvoiceId: inv.stripeInvoiceId,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        paidAt: inv.paidAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        receiptUrl: inv.receiptUrl,
        pdfUrl: inv.pdfUrl,
        createdAt: inv.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
  }
});

// ============================================================================
// HELPER: Subscription & Invoice Models for Prisma (Add to schema.prisma)
// ============================================================================

/*
model Subscription {
  id                      String    @id @default(cuid())
  organizationId          String    @unique
  organization            Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  stripeSubscriptionId    String?   @unique
  stripeCustomerId        String?
  plan                    String    // FREE, PROFESSIONAL, ENTERPRISE
  status                  String    // ACTIVE, INACTIVE, CANCELLED, PAST_DUE
  currentPeriodStart      DateTime
  currentPeriodEnd        DateTime
  cancelAtPeriodEnd       Boolean   @default(false)
  cancelledAt             DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@index([organizationId])
  @@index([stripeSubscriptionId])
}

model Invoice {
  id                  String    @id @default(cuid())
  organizationId      String
  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  stripeInvoiceId     String?
  amount              Int       // in cents
  currency            String    // usd, etc
  status              String    // PAID, PENDING, FAILED
  paidAt              DateTime?
  periodStart         DateTime
  periodEnd           DateTime
  receiptUrl          String?
  pdfUrl              String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([organizationId])
  @@index([stripeInvoiceId])
}

// Update Organization model to add relations:
model Organization {
  // ... existing fields ...
  subscription        Subscription?
  invoices            Invoice[]
}
*/
