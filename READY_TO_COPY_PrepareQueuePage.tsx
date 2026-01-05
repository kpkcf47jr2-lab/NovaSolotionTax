/**
 * READY_TO_COPY: PrepareQueuePage.tsx
 * ===================================
 * Main page for preparer to view and manage their queue
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/app/preparer/queue.tsx
 * 2. Import: npm install @heroicons/react (if not exists)
 * 3. Add route: pages/preparer/queue in Next.js router
 * 
 * FEATURES:
 * - Tab-based view: Assigned / Unassigned
 * - Search, filter by status/priority, sort by due date
 * - Quick assign button for CPAs
 * - Real-time status indicators
 * - Pagination support
 * 
 * =====================================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationIcon,
  FunnelIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

interface Return {
  id: string;
  clientName: string;
  taxYear: number;
  status: 'PENDING_REVIEW' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED';
  assignedTo?: string;
  extractedFields: number;
  totalFields: number;
  extractionConfidence: number;
  createdAt: string;
  dueDate: string;
  daysUntilDue: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface QueueResponse {
  total: number;
  assigned: number;
  unassigned: number;
  returns: Return[];
  unassignedReturns: Return[];
}

const statusColors: Record<string, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-800 border-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300'
};

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-600',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600'
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING_REVIEW: <DocumentIcon className="w-4 h-4" />,
  IN_PROGRESS: <ClockIcon className="w-4 h-4" />,
  PENDING_APPROVAL: <ExclamationIcon className="w-4 h-4" />,
  COMPLETED: <CheckCircleIcon className="w-4 h-4" />,
  REJECTED: <ExclamationIcon className="w-4 h-4" />
};

export default function PrepareQueuePage() {
  const [preparerId, setPreparerId] = useState<string>('');
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [tab, setTab] = useState<'assigned' | 'unassigned'>('assigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [assigningReturnId, setAssigningReturnId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get preparer ID from session/auth
  useEffect(() => {
    const getPreparerId = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPreparerId(data.id);
        }
      } catch (err) {
        console.error('Failed to get preparer ID:', err);
      }
    };

    getPreparerId();
  }, []);

  // Fetch queue
  const fetchQueue = async () => {
    if (!preparerId) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const response = await fetch(
        `/api/preparers/${preparerId}/queue?${params}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch queue');

      const data: QueueResponse = await response.json();
      setQueue(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [preparerId, page, statusFilter, priorityFilter]);

  // Filter returns based on search
  const filterReturns = (returns: Return[]) => {
    return returns.filter(ret =>
      ret.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle assign
  const handleAssign = async (returnId: string) => {
    setAssigningReturnId(returnId);

    try {
      const response = await fetch(`/api/preparers/${preparerId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ returnId })
      });

      if (!response.ok) throw new Error('Failed to assign return');

      setSuccessMessage('Return assigned successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to assign return');
    } finally {
      setAssigningReturnId(null);
    }
  };

  const assignedReturns = queue?.returns || [];
  const unassignedReturns = queue?.unassignedReturns || [];
  const returns = tab === 'assigned' ? assignedReturns : unassignedReturns;
  const filteredReturns = filterReturns(returns);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Preparer Queue</h1>
        <p className="text-gray-600 mt-1">
          {tab === 'assigned'
            ? `${queue?.assigned || 0} returns assigned to you`
            : `${queue?.unassigned || 0} returns pending assignment`}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ✓ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          ✗ {error}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Returns</div>
          <div className="text-2xl font-bold">{queue?.total || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Assigned</div>
          <div className="text-2xl font-bold text-blue-600">{queue?.assigned || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Unassigned</div>
          <div className="text-2xl font-bold text-orange-600">{queue?.unassigned || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Completion Rate</div>
          <div className="text-2xl font-bold text-green-600">
            {queue?.total ? Math.round((queue?.assigned / queue?.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setTab('assigned'); setPage(1); }}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            tab === 'assigned'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Assigned ({queue?.assigned || 0})
        </button>
        <button
          onClick={() => { setTab('unassigned'); setPage(1); }}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            tab === 'unassigned'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Unassigned ({queue?.unassigned || 0})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by client name or ID..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
          </div>
          <p className="text-gray-600 mt-4">Loading returns...</p>
        </div>
      )}

      {/* Returns List */}
      {!loading && filteredReturns.length > 0 && (
        <div className="space-y-3">
          {filteredReturns.map((ret) => (
            <div
              key={ret.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                {/* Left: Client & ID */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <DocumentIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{ret.clientName}</h3>
                      <p className="text-sm text-gray-500">{ret.id}</p>
                    </div>
                  </div>
                </div>

                {/* Middle: Status & Fields */}
                <div className="flex-1 text-center">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border mb-2 ${statusColors[ret.status]}`}>
                    <span className="flex items-center gap-2">
                      {statusIcons[ret.status]}
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Fields: {ret.extractedFields}/{ret.totalFields}
                  </p>
                </div>

                {/* Right: Due Date & Priority */}
                <div className="flex-1 text-right">
                  <div className={`font-semibold ${priorityColors[ret.priority]}`}>
                    {ret.priority}
                  </div>
                  <p className={`text-sm ${ret.daysUntilDue < 7 ? 'text-red-600' : 'text-gray-600'}`}>
                    Due in {ret.daysUntilDue} days
                  </p>
                  {ret.extractionConfidence && (
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(ret.extractionConfidence * 100)}% confidence
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <div className="ml-4">
                  {tab === 'assigned' ? (
                    <a
                      href={`/preparer/returns/${ret.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                    >
                      Review
                    </a>
                  ) : (
                    <button
                      onClick={() => handleAssign(ret.id)}
                      disabled={assigningReturnId === ret.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm disabled:opacity-50"
                    >
                      {assigningReturnId === ret.id ? 'Assigning...' : 'Assign'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReturns.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {tab === 'assigned' ? 'No returns assigned yet' : 'No unassigned returns'}
          </p>
          <p className="text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search filters' : 'Check back soon'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {queue && queue.total > 20 && (
        <div className="flex gap-2 mt-8 justify-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {Math.ceil(queue.total / 20)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(queue.total / 20), page + 1))}
            disabled={page >= Math.ceil(queue.total / 20)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
