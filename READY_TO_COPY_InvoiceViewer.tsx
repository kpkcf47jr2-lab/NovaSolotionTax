/**
 * READY_TO_COPY: InvoiceViewer.tsx
 * ===============================
 * Display invoice history and manage receipts
 * 
 * INTEGRATION:
 * 1. Copy to: apps/web/src/components/InvoiceViewer.tsx
 * 2. Import: <InvoiceViewer />
 * 3. Add to: /billing/invoices page
 * 
 * FEATURES:
 * - Invoice history list
 * - Pagination (20 per page)
 * - Download PDF receipts
 * - Payment status display
 * - Date filtering
 * 
 * ====================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentDownloadIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  periodStart: string;
  periodEnd: string;
  receiptUrl?: string;
  pdfUrl?: string;
  createdAt: string;
}

interface InvoicesResponse {
  total: number;
  page: number;
  limit: number;
  invoices: Invoice[];
}

export default function InvoiceViewer() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchInvoices();
  }, [page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/billing/invoices?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data: InvoicesResponse = await response.json();
      setInvoices(data.invoices);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.pdfUrl) {
      setError('PDF not available for this invoice');
      return;
    }

    setDownloadingId(invoice.id);
    try {
      // Open PDF in new tab
      window.open(invoice.pdfUrl, '_blank');
    } catch (err: any) {
      setError('Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = (amount / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${currency.toUpperCase()} ${formatted}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 animate-pulse">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invoice History</h2>
        <p className="text-gray-600 mt-1">Download your receipts and payment history</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Invoices Table */}
      {invoices.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition">
                    {/* Invoice ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DocumentIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">
                          {invoice.stripeInvoiceId ? invoice.stripeInvoiceId.slice(-8) : invoice.id.slice(-8)}
                        </span>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {invoice.status === 'PAID' ? (
                          <>
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Paid</span>
                          </>
                        ) : (
                          <>
                            <ExclamationIcon className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-700">{invoice.status}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {invoice.pdfUrl ? (
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          disabled={downloadingId === invoice.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-50"
                        >
                          <DocumentDownloadIcon className="w-4 h-4" />
                          {downloadingId === invoice.id ? 'Downloading...' : 'Download'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">No PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {invoice.stripeInvoiceId ? invoice.stripeInvoiceId.slice(-8) : invoice.id.slice(-8)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {invoice.status === 'PAID' ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Paid</span>
                        </>
                      ) : (
                        <>
                          <ExclamationIcon className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs font-medium text-yellow-700">{invoice.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {invoice.pdfUrl && (
                  <button
                    onClick={() => handleDownloadPDF(invoice)}
                    disabled={downloadingId === invoice.id}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    <DocumentDownloadIcon className="w-4 h-4" />
                    {downloadingId === invoice.id ? 'Downloading...' : 'Download PDF'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No invoices yet</p>
          <p className="text-sm text-gray-500">Your invoices will appear here once you upgrade your plan</p>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 text-sm font-medium"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600 text-sm">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Tax Receipt Information</h3>
        <p className="text-sm text-blue-800">
          All invoices are generated from Stripe and sent to your email. You can download PDF copies here for your records. Keep invoices for tax purposes.
        </p>
      </div>
    </div>
  );
}
