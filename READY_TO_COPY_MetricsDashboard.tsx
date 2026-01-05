/**
 * READY_TO_COPY: MetricsDashboard.tsx
 * ==================================
 * Shows preparer KPIs: completion rate, avg review time, quality metrics
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/components/MetricsDashboard.tsx
 * 2. Import in preparer dashboard
 * 3. Usage: <MetricsDashboard preparerId={preparerId} />
 * 
 * FEATURES:
 * - KPI cards with real-time data
 * - This month statistics
 * - Performance trending
 * - Comparison to targets
 * 
 * ========================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ExclamationIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface MetricsData {
  totalReturns: number;
  completedReturns: number;
  completionRate: number;
  inProgressReturns: number;
  pendingApprovalReturns: number;
  averageReviewTime: string;
  averageFieldsPerReturn: number;
  averageConfidence: number;
  rejectionRate: number;
  approvalRate: number;
  thisMonth: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface MetricCard {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  trend?: number;
}

export default function MetricsDashboard({ preparerId }: { preparerId: string }) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/preparers/${preparerId}/metrics`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Failed to fetch metrics');

        const data: MetricsData = await response.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (preparerId) {
      fetchMetrics();
      // Refresh every 60 seconds
      const interval = setInterval(fetchMetrics, 60000);
      return () => clearInterval(interval);
    }
  }, [preparerId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        <ExclamationIcon className="w-5 h-5 inline mr-2" />
        Failed to load metrics: {error}
      </div>
    );
  }

  // Build metric cards
  const metricCards: MetricCard[] = [
    {
      label: 'Total Returns',
      value: metrics.totalReturns,
      icon: <ChartBarIcon className="w-6 h-6" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(metrics.completionRate * 100)}%`,
      unit: 'of all returns',
      icon: <CheckCircleIcon className="w-6 h-6" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      trend: metrics.completionRate > 0.75 ? 1 : metrics.completionRate < 0.5 ? -1 : 0
    },
    {
      label: 'Avg Review Time',
      value: metrics.averageReviewTime,
      unit: 'per return',
      icon: <ClockIcon className="w-6 h-6" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      label: 'Quality Score',
      value: `${Math.round(metrics.averageConfidence * 100)}%`,
      unit: 'extraction confidence',
      icon: <SparklesIcon className="w-6 h-6" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    }
  ];

  const targetCompletionRate = 0.8;
  const completionTrend = metrics.completionRate - targetCompletionRate;
  const targetQualityScore = 0.85;
  const qualityTrend = metrics.averageConfidence - targetQualityScore;

  return (
    <div className="space-y-6">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} border border-gray-200 rounded-lg p-6 hover:shadow-lg transition`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={card.textColor}>{card.icon}</div>
              {card.trend !== undefined && (
                <div className={card.trend > 0 ? 'text-green-600' : card.trend < 0 ? 'text-red-600' : 'text-gray-400'}>
                  {card.trend > 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                  ) : card.trend < 0 ? (
                    <ArrowTrendingDownIcon className="w-4 h-4" />
                  ) : null}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
            {card.unit && <p className="text-xs text-gray-600 mt-2">{card.unit}</p>}
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Approval & Rejection Rates */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quality Metrics</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Approval Rate</span>
                <span className="text-sm font-semibold text-green-600">
                  {Math.round(metrics.approvalRate * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${metrics.approvalRate * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Rejection Rate</span>
                <span className="text-sm font-semibold text-red-600">
                  {Math.round(metrics.rejectionRate * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${metrics.rejectionRate * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t">
              <p className="text-xs text-gray-600">
                <strong>Target:</strong> &gt;80% approval, &lt;10% rejection
              </p>
            </div>
          </div>
        </div>

        {/* This Month Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Total Returns</span>
              <span className="font-semibold text-gray-900">{metrics.thisMonth.total}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{metrics.thisMonth.completed}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">In Progress</span>
              <span className="font-semibold text-blue-600">{metrics.thisMonth.inProgress}</span>
            </div>

            <div className="pt-4 mt-4 border-t">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{
                    width: `${metrics.thisMonth.total > 0 ? (metrics.thisMonth.completed / metrics.thisMonth.total) * 100 : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {metrics.thisMonth.total > 0
                  ? `${Math.round((metrics.thisMonth.completed / metrics.thisMonth.total) * 100)}% completion rate this month`
                  : 'No returns this month yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Completion Rate vs Target</p>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(metrics.completionRate * 100)}%
                </p>
                <p className="text-xs text-gray-500">Actual</p>
              </div>
              <div className={completionTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
                {completionTrend >= 0 ? '+' : ''}{Math.round(completionTrend * 100)}%
                <p className="text-xs">vs Target (80%)</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Quality Score vs Target</p>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(metrics.averageConfidence * 100)}%
                </p>
                <p className="text-xs text-gray-500">Actual</p>
              </div>
              <div className={qualityTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
                {qualityTrend >= 0 ? '+' : ''}{Math.round(qualityTrend * 100)}%
                <p className="text-xs">vs Target (85%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.completionRate < 0.7 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-800">
              <ExclamationIcon className="w-4 h-4 inline mr-2" />
              <strong>Recommendation:</strong> Consider prioritizing high-priority returns to improve completion rate.
            </p>
          </div>
        )}

        {metrics.rejectionRate > 0.1 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-800">
              <ExclamationIcon className="w-4 h-4 inline mr-2" />
              <strong>Recommendation:</strong> Review rejection reasons to improve quality of first submissions.
            </p>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Current Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{metrics.inProgressReturns}</p>
            <p className="text-xs text-gray-600 mt-2">In Progress</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{metrics.pendingApprovalReturns}</p>
            <p className="text-xs text-gray-600 mt-2">Pending Approval</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{metrics.completedReturns}</p>
            <p className="text-xs text-gray-600 mt-2">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
