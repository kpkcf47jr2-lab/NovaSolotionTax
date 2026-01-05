// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/TaxSummaryExplainer.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface TaxExplanation {
  summary: string;
  breakdown: {
    grossIncome: {
      value: number;
      description: string;
      sources: string[];
    };
    deductions: {
      value: number;
      description: string;
      sources: string[];
    };
    taxableIncome: {
      value: number;
      description: string;
    };
    taxes: {
      value: number;
      description: string;
      brackets: string[];
    };
    withholding: {
      value: number;
      description: string;
    };
    refund: {
      value: number;
      description: string;
    };
  };
  insights: string[];
}

interface TaxSummaryExplainerProps {
  returnId: string;
  calculatedData?: {
    totalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    totalTaxes: number;
    refundAmount: number;
  };
}

export default function TaxSummaryExplainer({
  returnId,
  calculatedData,
}: TaxSummaryExplainerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['grossIncome', 'deductions', 'taxes', 'refund']),
  );
  const [explanation, setExplanation] = useState<TaxExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchExplanation = async () => {
    if (!token || !returnId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/returns/${returnId}/explain`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setExplanation(data);
        setShowExplanation(true);
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!calculatedData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Resumen de Impuestos</h3>
            <p className="text-gray-600 mb-4">
              {explanation?.summary || `Tus impuestos totales son $${calculatedData.totalTaxes.toLocaleString()}`}
            </p>
            <button
              onClick={fetchExplanation}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              {loading ? 'Cargando...' : showExplanation ? 'Actualizar' : 'Ver Explicación'}
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {explanation && showExplanation && (
        <div className="space-y-3">
          {/* Gross Income Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('grossIncome')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">Ingresos Brutos</p>
                <p className="text-sm text-gray-600">{explanation.breakdown.grossIncome.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-green-600">
                  ${explanation.breakdown.grossIncome.value.toLocaleString()}
                </p>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-600 transition-transform ${
                    expandedSections.has('grossIncome') ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {expandedSections.has('grossIncome') && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
                {explanation.breakdown.grossIncome.sources.map((source, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    • {source}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Deductions Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('deductions')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">Deducciones</p>
                <p className="text-sm text-gray-600">{explanation.breakdown.deductions.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-blue-600">
                  -${explanation.breakdown.deductions.value.toLocaleString()}
                </p>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-600 transition-transform ${
                    expandedSections.has('deductions') ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {expandedSections.has('deductions') && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
                {explanation.breakdown.deductions.sources.map((source, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    • {source}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Taxable Income */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Ingresos Gravables</p>
                <p className="text-sm text-gray-600">{explanation.breakdown.taxableIncome.description}</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                ${explanation.breakdown.taxableIncome.value.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Taxes Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('taxes')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-red-50"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">Impuestos Federales</p>
                <p className="text-sm text-gray-600">{explanation.breakdown.taxes.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-red-600">
                  ${explanation.breakdown.taxes.value.toLocaleString()}
                </p>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-600 transition-transform ${
                    expandedSections.has('taxes') ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {expandedSections.has('taxes') && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-3">
                <p className="text-sm text-gray-600 font-semibold">Tramos fiscales aplicados:</p>
                {explanation.breakdown.taxes.brackets.map((bracket, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    • {bracket}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Refund Section */}
          <div className={`border-2 rounded-lg p-4 ${
            explanation.breakdown.refund.value > 0
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Resultado Final</p>
                <p className="text-sm text-gray-600">{explanation.breakdown.refund.description}</p>
              </div>
              <p className={`text-3xl font-bold ${
                explanation.breakdown.refund.value > 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {explanation.breakdown.refund.value > 0 ? '+' : '-'}${Math.abs(
                  explanation.breakdown.refund.value,
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Insights */}
          {explanation.insights && explanation.insights.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900 mb-2">💡 Insights</p>
              <ul className="space-y-1">
                {explanation.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
