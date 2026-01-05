/**
 * READY_TO_COPY: SubscriptionManager.tsx
 * ======================================
 * Manage current subscription in settings/billing dashboard
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/components/SubscriptionManager.tsx
 * 2. Import: <SubscriptionManager />
 * 3. Add to: /billing/manage or /settings/billing page
 * 
 * FEATURES:
 * - Current plan display
 * - Days until renewal
 * - Upgrade/downgrade button
 * - Cancel subscription option
 * - Usage statistics
 * 
 * ===========================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  monthlyPrice: number;
  features: number;
  maxReturns: number;
  daysUntilRenewal: number;
  nextPaymentDate: string;
}

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/billing/subscriptions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch subscription');

      const data: Subscription = await response.json();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!subscription) return;

    const newPlan = subscription.plan === 'FREE' ? 'price_professional' : 'price_enterprise';

    setActionLoading(true);
    try {
      const response = await fetch(`/api/billing/subscriptions/${subscription.id}/update-plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPlanId: newPlan })
      });

      if (!response.ok) throw new Error('Failed to upgrade plan');

      setSuccessMessage('Plan upgraded successfully! Changes take effect immediately.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSubscription();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate = false) => {
    if (!subscription) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/billing/subscriptions/${subscription.id}/cancel?immediate=${immediate}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      setSuccessMessage(
        immediate
          ? 'Subscription cancelled immediately. Your access will end today.'
          : 'Subscription scheduled for cancellation at the end of your billing period.'
      );
      setShowCancelConfirm(false);
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchSubscription();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-yellow-800">
        No subscription found. <a href="/billing/checkout" className="font-semibold underline">Get started here.</a>
      </div>
    );
  }

  const planColors: Record<string, { bg: string; text: string; border: string }> = {
    FREE: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    PROFESSIONAL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    ENTERPRISE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
  };

  const colors = planColors[subscription.plan] || planColors.PROFESSIONAL;

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ✓ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          ✗ {error}
        </div>
      )}

      {/* Main Subscription Card */}
      <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-8`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-3xl font-bold ${colors.text}`}>{subscription.plan}</h2>
              {subscription.status === 'ACTIVE' ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <p className={colors.text}>
              {subscription.status === 'ACTIVE'
                ? subscription.cancelAtPeriodEnd
                  ? 'Active until end of billing period'
                  : 'Active and recurring'
                : 'Subscription inactive'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-600">Monthly Cost</p>
            <p className={`text-3xl font-bold ${colors.text}`}>
              ${subscription.monthlyPrice}
              <span className="text-lg font-normal">/mo</span>
            </p>
          </div>
        </div>

        {/* Plan details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="text-xs text-gray-600">Plan Features</p>
            <p className="text-lg font-bold">{subscription.features}</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="text-xs text-gray-600">Max Returns</p>
            <p className="text-lg font-bold">{subscription.maxReturns}</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="text-xs text-gray-600">Days Until Renewal</p>
            <p className="text-lg font-bold">{subscription.daysUntilRenewal}</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="text-xs text-gray-600">Next Billing Date</p>
            <p className="text-sm font-bold">
              {new Date(subscription.nextPaymentDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Renewal info */}
        <div className="bg-white bg-opacity-50 rounded p-4 mb-6">
          <p className="text-sm text-gray-700">
            {subscription.cancelAtPeriodEnd ? (
              <>
                <strong>Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</strong>
                After that date, your access to paid features will be limited to the Free plan.
              </>
            ) : (
              <>
                <strong>Renews automatically</strong> on {new Date(subscription.nextPaymentDate).toLocaleDateString()}.
                You will be charged ${subscription.monthlyPrice}.
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {subscription.plan !== 'ENTERPRISE' && (
            <button
              onClick={handleUpgradePlan}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowUpIcon className="w-5 h-5" />
              Upgrade Plan
            </button>
          )}

          {!subscription.cancelAtPeriodEnd && subscription.plan !== 'FREE' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex-1 px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium flex items-center justify-center gap-2"
            >
              <TrashIcon className="w-5 h-5" />
              Cancel Plan
            </button>
          )}

          <button
            onClick={() => window.location.href = '/billing/checkout'}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Plans
          </button>
        </div>
      </div>

      {/* Billing Period Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Billing Period</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Current Period Start</span>
            <span className="font-medium">
              {new Date(subscription.currentPeriodStart).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Current Period End</span>
            <span className="font-medium">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Days Remaining</span>
            <span className="font-medium text-blue-600 text-lg">
              {subscription.daysUntilRenewal} days
            </span>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-6">
              We're sorry to see you go. If you cancel, you'll lose access to:
            </p>
            <ul className="space-y-2 mb-6 text-gray-600 text-sm">
              <li>✗ Advanced field editing</li>
              <li>✗ Preparer workflow management</li>
              <li>✗ Performance metrics</li>
              <li>✗ Priority support</li>
            </ul>

            <div className="space-y-3">
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Cancel at Period End'}
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                disabled={actionLoading}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Cancel Immediately'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
