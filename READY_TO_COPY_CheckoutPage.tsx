/**
 * READY_TO_COPY: CheckoutPage.tsx
 * ================================
 * Billing & pricing page with plan selection and checkout
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/app/billing/checkout.tsx
 * 2. Install: npm install @stripe/react-stripe-js @stripe/js
 * 3. Wrap app with StripeProvider (see below)
 * 4. Add route: /billing/checkout
 * 
 * FEATURES:
 * - 3 plan tiers (Free, Professional, Enterprise)
 * - Feature comparison
 * - Selected plan highlighting
 * - Checkout button integration
 * - Success/cancel pages
 * 
 * =====================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CheckIcon, XIcon } from '@heroicons/react/24/outline';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: number;
  maxReturns: number;
  description: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: 5,
    maxReturns: 1,
    description: 'Get started with NovaSolutionTax for free',
    highlighted: false
  },
  {
    id: 'price_professional',
    name: 'Professional',
    price: 99,
    features: 20,
    maxReturns: 10,
    description: 'Perfect for individual preparers',
    highlighted: true
  },
  {
    id: 'price_enterprise',
    name: 'Enterprise',
    price: 299,
    features: 100,
    maxReturns: 1000,
    description: 'For large tax teams',
    highlighted: false
  }
];

const planFeatures = {
  free: [
    'Up to 1 return per month',
    '5 field edits',
    'Basic tax calculation',
    'Email support',
    'Community forum'
  ],
  professional: [
    'Up to 10 returns per month',
    '20 field edits per return',
    'Advanced tax calculation',
    'Priority email support',
    'Preparer workflow',
    'Performance metrics',
    'API access (limited)',
    'Custom branding (coming soon)'
  ],
  enterprise: [
    'Unlimited returns',
    'Unlimited field edits',
    'Advanced tax features',
    'Priority phone support',
    'Preparer workflow + management',
    'Advanced analytics',
    'Full API access',
    'Custom branding',
    'SSO integration',
    'Dedicated account manager'
  ]
};

const notIncluded = [
  'Mobile app',
  'Advanced AI features',
  'Custom integrations'
];

export default function CheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('price_professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // Get current subscription on load
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const response = await fetch('/api/billing/subscriptions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentPlan(data.plan.toLowerCase());
        }
      } catch (err) {
        console.error('Failed to fetch current plan:', err);
      }
    };

    fetchCurrentPlan();
  }, []);

  // Handle checkout
  const handleCheckout = async (planId: string) => {
    // If selected free plan
    if (planId === 'free') {
      setLoading(true);
      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ planId })
        });

        if (!response.ok) throw new Error('Failed to activate free plan');

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Paid plan - redirect to Stripe
    setLoading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600">Choose the perfect plan for your tax business</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg overflow-hidden transition transform ${
              plan.highlighted
                ? 'ring-2 ring-blue-600 shadow-xl scale-105'
                : 'border border-gray-200 shadow'
            } bg-white`}
          >
            {/* Recommended badge */}
            {plan.highlighted && (
              <div className="bg-blue-600 text-white py-1 px-4 text-center text-sm font-semibold">
                ⭐ MOST POPULAR
              </div>
            )}

            {/* Plan content */}
            <div className="p-8">
              {/* Plan name and price */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
              <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>

              {/* Current plan badge */}
              {currentPlan === plan.id || (currentPlan === 'free' && plan.id === 'free') ? (
                <div className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg text-center font-medium mb-6">
                  ✓ Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Processing...' : 'Get Started'}
                </button>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-200 my-6">
                <div>
                  <p className="text-sm text-gray-600">Max Returns</p>
                  <p className="text-lg font-bold text-gray-900">{plan.maxReturns}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Features</p>
                  <p className="text-lg font-bold text-gray-900">{plan.features}</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {planFeatures[plan.id.replace('price_', '') as keyof typeof planFeatures]?.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Not included */}
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 font-semibold mb-3">NOT INCLUDED</p>
                <ul className="space-y-2">
                  {notIncluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-500 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-16 bg-white rounded-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
            <p className="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
            <p className="text-gray-600">We accept all major credit cards through Stripe. We're planning to add more payment methods soon.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Do you offer annual billing?</h4>
            <p className="text-gray-600">Annual billing is coming soon! Contact sales for enterprise annual plans.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
            <p className="text-gray-600">Start with our Free plan - no credit card required. Upgrade anytime.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">What's included in support?</h4>
            <p className="text-gray-600">Free plan includes community support. Professional and Enterprise include priority email and phone support.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
            <p className="text-gray-600">Yes! Cancel anytime. Your access continues until the end of your billing period.</p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-4xl mx-auto mt-16 text-center bg-blue-50 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Need a custom plan?</h3>
        <p className="text-gray-600 mb-4">For larger teams or special requirements, contact our sales team.</p>
        <a
          href="mailto:sales@novasolutiontax.io"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Contact Sales
        </a>
      </div>
    </div>
  );
}

/**
 * PROVIDER WRAPPER (add to apps/web/src/app/layout.tsx)
 * ======================================================
 * 
 * import { loadStripe } from '@stripe/js';
 * import { Elements } from '@stripe/react-stripe-js';
 * 
 * const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
 * 
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <Elements stripe={stripePromise}>
 *           {children}
 *         </Elements>
 *       </body>
 *     </html>
 *   );
 * }
 */
