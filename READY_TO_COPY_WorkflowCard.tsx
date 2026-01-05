/**
 * READY_TO_COPY: WorkflowCard.tsx
 * ==============================
 * Shows workflow status for a single return
 * Displays: Steps (Extraction → Review → Approval), completion %, field changes
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/components/WorkflowCard.tsx
 * 2. Import in return detail page
 * 3. Usage: <WorkflowCard returnId={returnId} />
 * 
 * FEATURES:
 * - Visual step indicator (3 steps)
 * - Completion percentage
 * - Field change counter
 * - Approval/Rejection status
 * - Expandable details
 * 
 * ==========================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface Step {
  step: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REJECTED';
  timestamp: string | null;
}

interface WorkflowStatus {
  id: string;
  status: string;
  completionPercent: number;
  clientName: string;
  assignedTo: string | null;
  steps: Step[];
  fieldChanges: number;
  fieldsReviewed: number;
  totalFields: number;
  pendingApproval: boolean;
  approvedBy: string | null;
  approvalStatus: string | null;
  rejectionReason: string | null;
  dueDate: string;
  daysRemaining: number;
}

const stepIcons = {
  EXTRACTION: '📄',
  REVIEW: '👁️',
  APPROVAL: '✅'
};

const stepLabels = {
  EXTRACTION: 'Document Extraction',
  REVIEW: 'Preparer Review',
  APPROVAL: 'CPA Approval'
};

const statusBgColors: Record<string, string> = {
  COMPLETED: 'bg-green-50 border-green-200',
  IN_PROGRESS: 'bg-blue-50 border-blue-200',
  PENDING: 'bg-gray-50 border-gray-200',
  REJECTED: 'bg-red-50 border-red-200'
};

const statusTextColors: Record<string, string> = {
  COMPLETED: 'text-green-700',
  IN_PROGRESS: 'text-blue-700',
  PENDING: 'text-gray-700',
  REJECTED: 'text-red-700'
};

const stepStatusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircleIcon className="w-6 h-6 text-green-600" />,
  IN_PROGRESS: <ClockIcon className="w-6 h-6 text-blue-600" />,
  PENDING: <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />,
  REJECTED: <ExclamationIcon className="w-6 h-6 text-red-600" />
};

export default function WorkflowCard({ returnId }: { returnId: string }) {
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/returns/${returnId}/workflow-status`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Failed to fetch workflow status');

        const data: WorkflowStatus = await response.json();
        setWorkflow(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();

    // Refetch every 30 seconds
    const interval = setInterval(fetchWorkflow, 30000);
    return () => clearInterval(interval);
  }, [returnId]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        Failed to load workflow: {error}
      </div>
    );
  }

  const allStepsCompleted = workflow.steps.every(s => s.status === 'COMPLETED');
  const urgentDeadline = workflow.daysRemaining < 7;

  return (
    <div className={`bg-white border-2 rounded-lg p-6 transition ${
      urgentDeadline ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Workflow Status</h3>
          <p className="text-sm text-gray-600 mt-1">{workflow.clientName}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Completion Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{workflow.completionPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${workflow.completionPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {workflow.fieldsReviewed} of {workflow.totalFields} fields reviewed
        </p>
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4 mb-6">
        {workflow.steps.map((step, index) => (
          <div key={step.step}>
            <div className="flex items-start gap-4">
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-1">
                {stepStatusIcons[step.status]}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{stepIcons[step.step as keyof typeof stepIcons]}</span>
                  <div>
                    <h4 className={`font-semibold ${statusTextColors[step.status]}`}>
                      {stepLabels[step.step as keyof typeof stepLabels]}
                    </h4>
                    {step.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(step.timestamp).toLocaleDateString()} at{' '}
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusBgColors[step.status]} ${statusTextColors[step.status]}`}>
                {step.status.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Connector Line */}
            {index < workflow.steps.length - 1 && (
              <div className="ml-3 h-4 border-l-2 border-gray-300 my-2" />
            )}
          </div>
        ))}
      </div>

      {/* Field Changes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Changes Made</p>
            <p className="text-2xl font-bold text-blue-600">{workflow.fieldChanges}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fields Reviewed</p>
            <p className="text-2xl font-bold text-green-600">{workflow.fieldsReviewed}</p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t pt-4 space-y-4">
          {/* Due Date */}
          <div className={`p-3 rounded-lg ${urgentDeadline ? 'bg-red-100 border border-red-300' : 'bg-gray-50 border border-gray-200'}`}>
            <p className="text-sm text-gray-600">Due Date</p>
            <p className={`font-semibold ${urgentDeadline ? 'text-red-700' : 'text-gray-900'}`}>
              {new Date(workflow.dueDate).toLocaleDateString()}
              <span className={`ml-2 text-sm ${urgentDeadline ? 'text-red-600' : 'text-gray-600'}`}>
                ({workflow.daysRemaining} days remaining)
              </span>
            </p>
          </div>

          {/* Approval Status */}
          {workflow.approvalStatus && (
            <div className={`p-3 rounded-lg border ${
              workflow.approvalStatus === 'APPROVED'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm text-gray-600">Approval Status</p>
              <p className={`font-semibold ${
                workflow.approvalStatus === 'APPROVED'
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}>
                {workflow.approvalStatus === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
              </p>
              {workflow.rejectionReason && (
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Reason:</strong> {workflow.rejectionReason}
                </p>
              )}
            </div>
          )}

          {/* Status Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">Current Status</p>
            <p className="font-semibold text-gray-900 capitalize">
              {workflow.status.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Completion Message */}
          {allStepsCompleted && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                <strong>Complete!</strong> All workflow steps have been completed. Awaiting final approval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Button */}
      {workflow.status === 'IN_PROGRESS' && (
        <div className="mt-4 pt-4 border-t">
          <a
            href={`/preparer/returns/${returnId}/edit`}
            className="w-full inline-block px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Continue Review
          </a>
        </div>
      )}
    </div>
  );
}
