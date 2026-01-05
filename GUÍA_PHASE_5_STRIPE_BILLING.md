# 🎊 PHASE 5: BILLING + STRIPE API - INTEGRATION GUIDE

**Status**: ✅ READY_TO_COPY  
**Estimated Integration Time**: 50 minutes  
**Complexity**: Medium-High  
**Priority**: Critical (Revenue generation)

---

## 📋 Overview

Phase 5 adds complete billing and Stripe integration to NovaSolutionTax:
- **Subscription plans** (Free, Professional, Enterprise)
- **Checkout system** (Stripe integration)
- **Webhook handlers** (Payment events)
- **Subscription management** (Upgrade/downgrade/cancel)
- **Invoice tracking** (History and receipts)

**Total Code**: 1,400+ lines
- **Backend**: 550 lines (6 endpoints + webhook)
- **Frontend**: 800 lines (3 React components)
- **Documentation**: 200+ lines

---

## 🔧 Part 1: Database Setup (10 minutes)

### Step 1.1: Add Subscription & Invoice Models to Prisma

**File**: `apps/api/prisma/schema.prisma`

Add these models after Organization:

```prisma
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
```

Update Organization model:

```prisma
model Organization {
  // ... existing fields ...
  subscription        Subscription?
  invoices            Invoice[]
}
```

### Step 1.2: Run Migration

```bash
cd apps/api
npx prisma migrate dev --name add_stripe_models
```

---

## 🔧 Part 2: Backend Integration (20 minutes)

### Step 2.1: Install Stripe Package

```bash
cd apps/api
npm install stripe
npm install --save-dev @types/stripe
```

### Step 2.2: Set Environment Variables

**File**: `apps/api/.env`

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
NEXT_PUBLIC_DOMAIN=http://localhost:3000
```

### Step 2.3: Add Endpoints to Express Server

**File**: `apps/api/src/index.ts`

1. Add to imports:
```typescript
import Stripe from 'stripe';
import express from 'express';
```

2. Initialize Stripe (near top of file):
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});
```

3. Add webhook endpoint first (before other endpoints):
```typescript
app.post('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // ... webhook handler
});
```

4. Copy entire content from: `READY_TO_COPY_STRIPE_endpoints.ts`
5. Paste into `index.ts` BEFORE `app.listen()`

**Verification**:
- All 6 endpoints compile without errors
- No TypeScript warnings
- All routes follow pattern: `/api/billing/...`

### Step 2.4: Configure Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhooks/stripe`
3. Select events to receive:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `charge.failed`
4. Copy webhook signing secret
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 🎨 Part 3: Frontend Integration (20 minutes)

### Step 3.1: Install Stripe React Libraries

```bash
cd apps/web
npm install @stripe/react-stripe-js @stripe/js
```

### Step 3.2: Add CheckoutPage Component

**File**: `apps/web/src/app/billing/checkout.tsx`

1. Create directory if needed: `apps/web/src/app/billing/`
2. Create file: `checkout.tsx`
3. Copy entire content from: `READY_TO_COPY_CheckoutPage.tsx`

### Step 3.3: Add SubscriptionManager Component

**File**: `apps/web/src/components/SubscriptionManager.tsx`

1. Copy entire content from: `READY_TO_COPY_SubscriptionManager.tsx`
2. Import in settings page:

```typescript
import SubscriptionManager from '@/components/SubscriptionManager';

// In your settings page:
<SubscriptionManager />
```

### Step 3.4: Add InvoiceViewer Component

**File**: `apps/web/src/components/InvoiceViewer.tsx`

1. Copy entire content from: `READY_TO_COPY_InvoiceViewer.tsx`
2. Import in billing page:

```typescript
import InvoiceViewer from '@/components/InvoiceViewer';

// In your billing page:
<InvoiceViewer />
```

### Step 3.5: Wrap App with Stripe Provider

**File**: `apps/web/src/app/layout.tsx`

Add at top of file:

```typescript
import { loadStripe } from '@stripe/js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
```

Update root layout:

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Elements stripe={stripePromise}>
          {children}
        </Elements>
      </body>
    </html>
  );
}
```

### Step 3.6: Add Routes

**File**: `apps/web/src/app/billing/` (create directory structure)

```
apps/web/src/app/billing/
├── checkout.tsx          (CheckoutPage)
├── success.tsx           (Success page - simple confirmation)
├── cancel.tsx            (Cancel page - simple message)
├── manage/
│   └── page.tsx          (with SubscriptionManager)
└── invoices/
    └── page.tsx          (with InvoiceViewer)
```

Example success page (`billing/success.tsx`):
```typescript
export default function BillingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-700 mb-2">✓ Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Your plan has been activated.</p>
        <a href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
```

### Step 3.7: Add Navigation Links

Update your main navigation to include:

```typescript
{userRole && (
  <>
    <a href="/billing/checkout" className="nav-link">Pricing</a>
    <a href="/billing/manage" className="nav-link">Billing</a>
    <a href="/billing/invoices" className="nav-link">Invoices</a>
  </>
)}
```

---

## 📝 Pricing Plans

**Current Plan Configuration**:

```
FREE Plan:
- $0/month
- 1 return per month
- 5 field edits
- Basic tax calculation
- Email support

PROFESSIONAL Plan: ⭐ Recommended
- $99/month
- 10 returns per month
- 20 field edits per return
- Advanced tax calculation
- Priority email support
- Preparer workflow
- Performance metrics

ENTERPRISE Plan:
- $299/month
- Unlimited returns
- Unlimited field edits
- All features
- Phone support
- SSO integration
- Dedicated account manager
```

To modify plans, edit `PLANS` object in `READY_TO_COPY_STRIPE_endpoints.ts`

---

## ✅ Testing Checklist

### Backend Testing

- [ ] **Checkout Endpoint**: POST /api/billing/checkout
  - Free plan activated directly
  - Paid plans redirect to Stripe
  - Returns proper sessionId and url

- [ ] **Webhook Endpoint**: POST /api/billing/webhooks/stripe
  - Subscription created → DB entry created
  - Subscription updated → DB entry updated
  - Invoice paid → Invoice record created
  - Payment failed → Error logged

- [ ] **Subscriptions Endpoint**: GET /api/billing/subscriptions
  - Returns current subscription
  - Shows correct plan and status
  - Calculates days until renewal

- [ ] **Update Plan Endpoint**: PUT /api/billing/subscriptions/:id/update-plan
  - Updates Stripe subscription
  - Updates DB plan
  - Creates audit log

- [ ] **Cancel Endpoint**: DELETE /api/billing/subscriptions/:id/cancel
  - Cancels at period end (default)
  - Option to cancel immediately
  - Creates audit log

- [ ] **Invoices Endpoint**: GET /api/billing/invoices
  - Returns paginated invoices
  - Filters by organization
  - Correct sorting (newest first)

### Frontend Testing

- [ ] **CheckoutPage**
  - Shows 3 plan cards
  - Current plan highlighted
  - Can select plan and checkout
  - Free plan works without Stripe
  - Paid plans redirect to Stripe checkout

- [ ] **SubscriptionManager**
  - Shows current plan info
  - Days until renewal calculated
  - Upgrade button works
  - Cancel confirmation modal
  - Can cancel at period end
  - Can cancel immediately

- [ ] **InvoiceViewer**
  - Lists all invoices
  - Pagination works
  - Can download PDF
  - Shows paid status
  - Mobile responsive

### User Flow Testing

1. **Free to Professional**:
   - [ ] Start with free plan
   - [ ] Go to checkout
   - [ ] Select professional plan
   - [ ] Redirect to Stripe
   - [ ] Complete payment
   - [ ] Return to success page
   - [ ] Subscription updated in DB

2. **Professional to Enterprise**:
   - [ ] From billing/manage
   - [ ] Click "Upgrade Plan"
   - [ ] New subscription active immediately
   - [ ] Audit log created

3. **Cancel Subscription**:
   - [ ] Click cancel
   - [ ] Confirm cancellation
   - [ ] Shows "will end on" date
   - [ ] Audit log created

4. **View Invoices**:
   - [ ] Go to invoices page
   - [ ] See invoice history
   - [ ] Download PDF works
   - [ ] Pagination works

---

## 🔐 Security Considerations

- [ ] Stripe keys never in frontend code
- [ ] Webhook signature verification enabled
- [ ] Tenant isolation on all queries (organizationId)
- [ ] User can only see their own invoices
- [ ] Admin can see all organizations' billing
- [ ] Sensitive data not logged (credit card info)
- [ ] Rate limiting on webhook endpoint
- [ ] HTTPS required for Stripe communication

---

## 📊 Testing with Stripe Test Cards

Use these test cards in Stripe checkout:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Exp: `12/25`
- CVC: `123`

**Requires Authentication**:
- Card: `4000 0025 0000 3155`

**Declined Card**:
- Card: `4000 0000 0000 0002`

**Expired Card**:
- Card: `4000 0069 0000 0009`

---

## 📈 Metrics to Track

After Phase 5, you can track:

- Monthly Recurring Revenue (MRR)
- Churn rate
- Plan distribution (Free vs Pro vs Enterprise)
- Payment success rate
- Average subscription value
- Customer lifetime value

---

## 🚀 Phase 5 Enhancements (Optional)

These can be added after basic Phase 5:

1. **Annual Billing**: Offer 20% discount on annual plans
2. **Usage-Based Pricing**: Additional charges for overage
3. **Coupon System**: Promo codes and discounts
4. **Invoice Customization**: Add company branding
5. **Payment Methods**: Add ACH, PayPal, etc.
6. **Billing Notifications**: Email reminders before renewal
7. **Trial Period**: 14-day free trial for new users
8. **Family/Team Plans**: Special multi-user pricing

---

## 🆘 Troubleshooting

### Checkout not redirecting
**Solution**: Verify NEXT_PUBLIC_DOMAIN env variable is set correctly

### Webhook events not received
**Solution**: Verify webhook secret in .env matches Stripe dashboard

### Subscription not updating
**Solution**: Check that metadata is passed correctly to Stripe

### Can't download invoices
**Solution**: Verify pdfUrl is returned from Stripe webhooks

### Plan not changing
**Solution**: Verify Stripe subscription item ID is correct when updating

---

## 📞 Support

**Questions?** Check:
1. Stripe API documentation: https://stripe.com/docs/api
2. Endpoint response format in code comments
3. Component prop requirements
4. Webhook event types in event handler
5. Error messages in browser console

---

**Integration Status**: Ready to begin  
**Last Updated**: 2026-01-04  
**Version**: Phase 5 v1.0
