// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/DeltaViewer.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface DeltaData {
  document: {
    fileName: string;
    documentType: string;
    uploadedAt: string;
  };
  delta: {
    grossIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    totalTaxes: number;
    refund: number;
  };
  impact: {
    message: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    costBenefit: number;
  };
}

interface DeltaViewerProps {
  returnId: string;
  documentId: string;
  documentFileName: string;
}

const DELTA_FIELDS = [
  { key: 'grossIncome', label: 'Ingresos Brutos', icon: '💰' },
  { key: 'totalDeductions', label: 'Deducciones Totales', icon: '📉' },
  { key: 'taxableIncome', label: 'Ingresos Imponibles', icon: '📊' },
  { key: 'totalTaxes', label: 'Impuestos Totales', icon: '💸' },
  { key: 'refund', label: 'Reembolso', icon: '💵' },
];

export default function DeltaViewer({ returnId, documentId, documentFileName }: DeltaViewerProps) {
  const [delta, setDelta] = useState<DeltaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDelta, setShowDelta] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchDelta = async () => {
    if (!token || !returnId || !documentId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/returns/${returnId}/documents/${documentId}/delta`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDelta(data);
        setShowDelta(true);
      }
    } catch (error) {
      console.error('Error fetching delta:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'text-green-700 bg-green-50 border-green-200';
    if (sentiment === 'negative') return 'text-red-700 bg-red-50 border-red-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === 'positive') return <ArrowTrendingDownIcon className="h-5 w-5 text-green-600" />;
    if (sentiment === 'negative') return <ArrowTrendingUpIcon className="h-5 w-5 text-red-600" />;
    return null;
  };

  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    return `${isNegative ? '-' : '+'}$${Math.abs(value).toLocaleString()}`;
  };

  return (
    <div className="space-y-3">
      {/* Trigger Button */}
      <button
        onClick={fetchDelta}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }`}
      >
        <DocumentIcon className="h-4 w-4" />
        {loading ? 'Analizando...' : '¿Cuál fue el impacto de este documento?'}
      </button>

      {/* Delta Details */}
      {delta && showDelta && (
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-purple-300">
          {/* Document Info */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="font-semibold text-gray-900 mb-1">{delta.document.fileName}</p>
            <p className="text-xs text-gray-600">
              {delta.document.documentType} • Subido: {new Date(delta.document.uploadedAt).toLocaleString('es-ES')}
            </p>
          </div>

          {/* Impact Message */}
          <div
            className={`rounded-lg p-3 border flex items-start gap-3 ${getSentimentColor(
              delta.impact.sentiment
            )}`}
          >
            <div className="mt-0.5">{getSentimentIcon(delta.impact.sentiment)}</div>
            <div>
              <p className="font-semibold mb-1">{delta.impact.message}</p>
              <p className="text-sm font-bold">
                Impacto: {delta.impact.costBenefit >= 0 ? '✅ Ahorrarías' : '❌ Pagarías'}{' '}
                {formatCurrency(Math.abs(delta.impact.costBenefit))}
              </p>
            </div>
          </div>

          {/* Delta Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Impacto Detallado</h4>
            <div className="grid grid-cols-1 gap-2">
              {DELTA_FIELDS.map((field) => {
                const value = delta.delta[field.key as keyof typeof delta.delta];
                const isPositive = value >= 0;

                return (
                  <div key={field.key} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{field.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{field.label}</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {formatCurrency(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>📋 ¿Qué significa esto?</strong>
              <br />
              Estos números muestran cómo este documento cambió tu declaración de impuestos comparado con antes de
              subirlo. Así entiendes exactamente qué impacto tuvo cada archivo.
            </p>
          </div>

          {/* Chart-like Visualization */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Visualización del Impacto</h4>

            {DELTA_FIELDS.map((field) => {
              const value = delta.delta[field.key as keyof typeof delta.delta];
              const maxValue = Math.max(
                ...DELTA_FIELDS.map((f) => Math.abs(delta.delta[f.key as keyof typeof delta.delta]))
              );
              const percentage = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
              const isPositive = value >= 0;

              return (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 w-32">{field.label}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-24 text-right ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(value)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-900">
              ℹ️ <strong>Comparación:</strong> Estos deltas se calculan comparando tu declaración antes y después de
              este documento. Incluye recálculos automáticos de impuestos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
