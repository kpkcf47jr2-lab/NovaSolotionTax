// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/WhatIfCalculator.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface WhatIfResult {
  scenario: string;
  current: {
    totalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    totalTaxes: number;
    refundAmount: number;
  };
  whatIf: {
    totalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    totalTaxes: number;
    refundAmount: number;
  };
  deltas: {
    totalIncome: { current: number; whatIf: number; delta: number };
    totalDeductions: { current: number; whatIf: number; delta: number };
    totalTaxes: { current: number; whatIf: number; delta: number };
    refundAmount: { current: number; whatIf: number; delta: number };
  };
  impact: string;
}

interface WhatIfCalculatorProps {
  returnId: string;
}

const COMMON_FIELDS = [
  { key: 'income.wages', label: 'Cambiar sueldos' },
  { key: 'income.qualifiedDividends', label: 'Cambiar dividendos' },
  { key: 'income.interestIncome', label: 'Cambiar intereses' },
  { key: 'deductions.mortgageInterest', label: 'Cambiar interés hipotecario' },
  { key: 'deductions.propertyTaxes', label: 'Cambiar impuestos a propiedad' },
  { key: 'deductions.charitableContributions', label: 'Cambiar contribuciones caritativas' },
];

export default function WhatIfCalculator({ returnId }: WhatIfCalculatorProps) {
  const [selectedField, setSelectedField] = useState('income.wages');
  const [newValue, setNewValue] = useState('');
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleCalculate = async () => {
    if (!selectedField || !newValue || !token) {
      setError('Por favor selecciona un campo y un valor');
      return;
    }

    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0) {
      setError('Por favor ingresa un número válido');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/returns/${returnId}/what-if`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldKey: selectedField,
          newValue: numValue,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setError('Error calculando What-If');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error conectando al servidor');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = () => {
    const field = COMMON_FIELDS.find((f) => f.key === selectedField);
    return field?.label || selectedField;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Calculador What-If</h3>
      </div>

      <p className="text-gray-600 text-sm mb-6">
        Simula cómo cambiarían tus impuestos si modificaras un campo
      </p>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        {/* Field Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Qué deseas cambiar?
          </label>
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {COMMON_FIELDS.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nuevo valor ($)
          </label>
          <input
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Ej: 85000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            min="0"
            step="100"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
          }`}
        >
          {loading ? 'Calculando...' : 'Simular Cambio'}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-4 border-t pt-6">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Escenario:</strong> {result.scenario}
            </p>
            <p
              className={`text-lg font-semibold ${
                result.deltas.totalTaxes.delta > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {result.impact}
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2 font-semibold">Concepto</th>
                  <th className="text-right py-2 px-2 font-semibold">Actual</th>
                  <th className="text-right py-2 px-2 font-semibold">What-If</th>
                  <th className="text-right py-2 px-2 font-semibold">Cambio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-gray-600">Ingresos</td>
                  <td className="text-right py-2 px-2 font-mono">
                    ${result.current.totalIncome.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono">
                    ${result.whatIf.totalIncome.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-mono font-semibold ${
                      result.deltas.totalIncome.delta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.deltas.totalIncome.delta > 0 ? '+' : ''}${result.deltas.totalIncome.delta.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 text-gray-600">Deducciones</td>
                  <td className="text-right py-2 px-2 font-mono">
                    ${result.current.totalDeductions.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono">
                    ${result.whatIf.totalDeductions.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-mono font-semibold ${
                      result.deltas.totalDeductions.delta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.deltas.totalDeductions.delta > 0 ? '+' : ''}
                    ${result.deltas.totalDeductions.delta.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b-2 border-gray-300 bg-amber-50">
                  <td className="py-2 px-2 font-semibold text-gray-900">Ingresos Gravables</td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.current.taxableIncome.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.whatIf.taxableIncome.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-mono font-semibold ${
                      result.deltas.taxableIncome.delta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.deltas.taxableIncome.delta > 0 ? '+' : ''}
                    ${result.deltas.taxableIncome.delta.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-red-50">
                  <td className="py-2 px-2 font-semibold text-gray-900">Impuestos</td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.current.totalTaxes.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.whatIf.totalTaxes.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-mono font-semibold ${
                      result.deltas.totalTaxes.delta > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {result.deltas.totalTaxes.delta > 0 ? '+' : ''}${result.deltas.totalTaxes.delta.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-green-50">
                  <td className="py-2 px-2 font-semibold text-gray-900">Reembolso</td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.current.refundAmount.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono font-semibold">
                    ${result.whatIf.refundAmount.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-mono font-semibold ${
                      result.deltas.refundAmount.delta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.deltas.refundAmount.delta > 0 ? '+' : ''}${result.deltas.refundAmount.delta.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900">
              💡 <strong>Nota:</strong> Este es un simulador. Los cambios no se guardan hasta que actualices
              manualmente el return.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
