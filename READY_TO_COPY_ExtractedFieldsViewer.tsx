// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/ExtractedFieldsViewer.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Field {
  value: unknown;
  confidence: number;
}

interface ExtractedFieldsViewerProps {
  fields: Record<string, Field>;
  confidence: number;
  documentType: string;
}

const FIELD_LABELS: Record<string, string> = {
  // W-2 Fields
  'income.wages': 'Sueldos y salarios',
  'income.socialSecurityWages': 'Sueldos de Seguro Social',
  'income.medicareWages': 'Sueldos de Medicare',
  'withheld.federalTaxWithheld': 'Retenciones federales',
  'withheld.socialSecurityTaxWithheld': 'Retenciones de Seguro Social',
  'withheld.medicareTaxWithheld': 'Retenciones de Medicare',
  'employer.name': 'Nombre del empleador',
  'employer.ein': 'EIN del empleador',

  // 1099 Fields
  'income.interestIncome': 'Ingresos por intereses',
  'income.qualifiedDividends': 'Dividendos calificados',
  'income.ordinaryDividends': 'Dividendos ordinarios',
  'income.businessIncome': 'Ingresos de negocio',
  'income.rentals': 'Ingresos de alquileres',
  'income.capitalGains': 'Ganancias de capital',
  'income.capitalLosses': 'Pérdidas de capital',

  // Mortgage Fields
  'deductions.mortgageInterest': 'Interés hipotecario',
  'deductions.propertyTaxes': 'Impuestos a la propiedad',

  // Other
  'deductions.charitableContributions': 'Contribuciones caritativas',
  'deductions.medicalExpenses': 'Gastos médicos',
  'deductions.businessSupplies': 'Suministros de negocio',
  'credits.educationCredits': 'Créditos educativos',

  'institution.name': 'Institución financiera',
  'institution.ein': 'EIN de la institución',
  'charity.name': 'Nombre de la caridad',
  'charity.ein': 'EIN de la caridad',
  'payer.name': 'Nombre del pagador',
  'provider.name': 'Nombre del proveedor',
  'merchant.name': 'Nombre del comerciante',
  'lender.name': 'Nombre del prestamista',
  'broker.name': 'Nombre del corredora',
  'date': 'Fecha',
};

const getFieldLabel = (fieldKey: string): string => {
  return FIELD_LABELS[fieldKey] || fieldKey;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'number') {
    if (value > 1000 || value < -1000) {
      // Format as currency
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (typeof value === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value).toLocaleString('es-ES', { dateStyle: 'long' });
    }
    return value;
  }

  return String(value);
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.95) return 'bg-green-100 text-green-800';
  if (confidence >= 0.85) return 'bg-blue-100 text-blue-800';
  if (confidence >= 0.75) return 'bg-yellow-100 text-yellow-800';
  return 'bg-orange-100 text-orange-800';
};

export default function ExtractedFieldsViewer({
  fields,
  confidence,
  documentType,
}: ExtractedFieldsViewerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['income']));

  // Group fields by category
  const groupedFields: Record<string, [string, Field][]> = {};

  Object.entries(fields).forEach(([key, field]) => {
    const category = key.split('.')[0] || 'other';
    if (!groupedFields[category]) {
      groupedFields[category] = [];
    }
    groupedFields[category].push([key, field]);
  });

  const categoryLabels: Record<string, string> = {
    income: 'Ingresos',
    withheld: 'Retenciones',
    deductions: 'Deducciones',
    credits: 'Créditos',
    employer: 'Empleador',
    institution: 'Institución',
    charity: 'Caridad',
    payer: 'Pagador',
    provider: 'Proveedor',
    merchant: 'Comerciante',
    lender: 'Prestamista',
    broker: 'Corredora',
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-4">Información Extraída</h4>

      {/* Overall Confidence */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600">
          Confianza general:{' '}
          <strong className={`px-2 py-1 rounded text-sm font-semibold ${getConfidenceColor(confidence)}`}>
            {(confidence * 100).toFixed(1)}%
          </strong>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Indica qué tan seguro está el sistema de que la información extraída es correcta.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(groupedFields)
          .sort(([a], [b]) => {
            const order = ['income', 'withheld', 'deductions', 'credits'];
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
          })
          .map(([category, categoryFields]) => (
            <div key={category} className="border border-gray-200 rounded-lg">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  {categoryLabels[category] || category}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-600 transition-transform ${
                    expandedCategories.has(category) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Category Fields */}
              {expandedCategories.has(category) && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 space-y-3">
                    {categoryFields.map(([fieldKey, field]) => (
                      <div key={fieldKey} className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getFieldLabel(fieldKey)}
                          </p>
                          <p className="text-sm text-gray-600 font-mono mt-1">
                            {formatValue(field.value)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getConfidenceColor(
                              field.confidence,
                            )}`}
                          >
                            {(field.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-900">
          ℹ️ <strong>Nota:</strong> Los datos extraídos se usan para calcular automáticamente tus
          impuestos. Si algo parece incorrecto, puedes editarlo después.
        </p>
      </div>
    </div>
  );
}
