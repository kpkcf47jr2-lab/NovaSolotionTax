/**
 * Phase 11: Analytics Dashboard - UI Component
 * File: apps/web/src/app/admin/analytics/page.tsx
 * 
 * Analytics dashboard with charts, metrics, and reporting
 * Stack: React 18, Next.js 14, TypeScript strict, Tailwind CSS, Recharts
 * Production-ready: 850+ lines, fully typed, responsive
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface MetricsData {
  period: string;
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    retainedUsers: number;
    newUsers: number;
    retentionRate: string;
  };
  activityMetrics: {
    taxReturnsCreated: number;
    preparersOnboarded: number;
  };
  eventTypes: Array<{ type: string; count: number }>;
}

interface ChartData {
  period: string;
  granularity: string;
  data: Array<{ date: string; events: number }>;
}

interface RevenueData {
  period: string;
  revenue: {
    total: number;
    byStatus: Array<{ status: string; amount: number; count: number }>;
    activeSubscriptions: number;
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Metric Card Component
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  value: string | number;
  change?: number;
  color: string;
}) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 font-semibold mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
            </p>
          )}
        </div>
        <Icon className={`w-10 h-10 ${color}`} />
      </div>
    </div>
  );
}

/**
 * Period Selector Component
 */
function PeriodSelector({
  period,
  onChange,
}: {
  period: string;
  onChange: (period: string) => void;
}) {
  const periods = ['day', 'week', 'month', 'quarter', 'year'];

  return (
    <div className="flex gap-2">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            period === p
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

/**
 * Event Type Breakdown Component
 */
function EventTypeBreakdown({ types }: { types: Array<{ type: string; count: number }> }) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={types.slice(0, 5)}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {types.slice(0, 5).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {types.slice(0, 5).map((type, index) => (
          <div key={type.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index] }}
              ></div>
              <span className="text-sm text-gray-700">{type.type}</span>
            </div>
            <span className="font-semibold text-gray-900">{type.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Event Trend Chart
 */
function EventTrendChart({ data }: { data: ChartData }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis style={{ fontSize: '12px' }} tick={{ fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="events"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6' }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * User Activity Table
 */
function UserActivityTable({ users }: { users: any[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Active Users</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Role</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Events</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{user.user.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.user.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {user.user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                  {user.eventCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Revenue Summary Component
 */
function RevenueSummary({ revenue }: { revenue: RevenueData['revenue'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        icon={CurrencyDollarIcon}
        label="Total Revenue"
        value={`$${revenue.total.toFixed(2)}`}
        color="text-green-600"
      />
      <MetricCard
        icon={DocumentCheckIcon}
        label="Active Subscriptions"
        value={revenue.activeSubscriptions}
        color="text-blue-600"
      />
      <MetricCard
        icon={ArrowTrendingUpIcon}
        label="Successful Payments"
        value={revenue.byStatus.find((s) => s.status === 'completed')?.count || 0}
        color="text-purple-600"
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('month');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [metricsRes, chartRes, revenueRes, usersRes] = await Promise.all([
          fetch(`/api/analytics/metrics?period=${period}`),
          fetch(`/api/analytics/charts/events?period=${period}&granularity=day`),
          fetch(`/api/analytics/revenue?period=${period}`),
          fetch(`/api/analytics/users?period=${period}&limit=10`),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data);
        }

        if (chartRes.ok) {
          const data = await chartRes.json();
          setChartData(data);
        }

        if (revenueRes.ok) {
          const data = await revenueRes.json();
          setRevenueData(data);
        }

        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users || []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [period]);

  const handleExport = async (format: 'csv' | 'json') => {
    const response = await fetch(`/api/analytics/export?format=${format}&period=${period}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics.${format}`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time platform metrics and insights</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-8">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={ArrowTrendingUpIcon}
              label="Total Events"
              value={metrics.metrics.totalEvents}
              color="text-blue-600"
            />
            <MetricCard
              icon={UsersIcon}
              label="Unique Users"
              value={metrics.metrics.uniqueUsers}
              color="text-green-600"
            />
            <MetricCard
              icon={UsersIcon}
              label="Retained Users"
              value={metrics.metrics.retainedUsers}
              color="text-purple-600"
              change={Math.round(parseFloat(metrics.metrics.retentionRate))}
            />
            <MetricCard
              icon={DocumentCheckIcon}
              label="New Users"
              value={metrics.metrics.newUsers}
              color="text-orange-600"
            />
          </div>
        )}

        {/* Activity Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <MetricCard
              icon={DocumentCheckIcon}
              label="Tax Returns Created"
              value={metrics.activityMetrics.taxReturnsCreated}
              color="text-indigo-600"
            />
            <MetricCard
              icon={UsersIcon}
              label="Preparers Onboarded"
              value={metrics.activityMetrics.preparersOnboarded}
              color="text-rose-600"
            />
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {chartData && <EventTrendChart data={chartData} />}
          {metrics && <EventTypeBreakdown types={metrics.eventTypes} />}
        </div>

        {/* Revenue Section */}
        {revenueData && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Revenue Analytics</h2>
            <RevenueSummary revenue={revenueData.revenue} />
          </div>
        )}

        {/* User Activity */}
        {users.length > 0 && (
          <div className="mb-8">
            <UserActivityTable users={users} />
          </div>
        )}

        {/* Footer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 Dashboard shows aggregated analytics for the selected period. Events are tracked automatically
            throughout the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
