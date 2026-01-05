// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/ProvenanceViewer.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { LinkIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ProvenanceSource {
  documentId: string;
  fileName: string;
  documentType: string;
  extractedAt: string;
  fieldValue: unknown;
  confidence: number;
  sourceMapping?: {
    pageNumber?: number;
    rawText?: string;
  };
}

interface AuditTrailEntry {
  type: string;
  performedBy: string;
  timestamp: string;
  value: unknown;
  reason?: string;
}

interface ProvenanceData {
  fieldKey: string;
  provenance: ProvenanceSource[];
  auditTrail: AuditTrailEntry[];
  sources: string[];
}

interface ProvenanceViewerProps {
  returnId: string;
  fieldKey: string;
  fieldLabel: string;
}

const FIELD_CATEGORIES: Record<string, string> = {
  'income.wages': '💼 Ingresos: Sueldos',
  'income.interestIncome': '💰 Ingresos: Intereses',
  'income.qualifiedDividends': '📈 Ingresos: Dividendos',
  'deductions.mortgageInterest': '🏠 Deducciones: Hipoteca',
  'deductions.propertyTaxes': '🏘️ Deducciones: Impuestos',
  'deductions.charitableContributions': '❤️ Deducciones: Caridad',
};

export default function ProvenanceViewer({
  returnId,
  fieldKey,
  fieldLabel,
}: ProvenanceViewerProps) {
  const [provenance, setProvenance] = useState<ProvenanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchProvenance = async () => {
    if (!token || !returnId || !fieldKey) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/returns/${returnId}/fields/${encodeURIComponent(fieldKey)}/provenance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProvenance(data);
        setShowProvenance(true);
      }
    } catch (error) {
      console.error('Error fetching provenance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    return FIELD_CATEGORIES[fieldKey]?.charAt(0) || '📝';
  };

  return (
    <div className="space-y-3">
      {/* Trigger Button */}
      <button
        onClick={fetchProvenance}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        <LinkIcon className="h-4 w-4" />
        {loading ? 'Cargando...' : '¿De dónde vino este número?'}
      </button>

      {/* Provenance Details */}
      {provenance && showProvenance && (
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-blue-300">
          {/* Document Sources */}
          {provenance.provenance.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                Extraído de Documentos
              </h4>

              <div className="space-y-3">
                {provenance.provenance.map((source, i) => (
                  <div key={i} className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{source.fileName}</p>
                        <p className="text-xs text-gray-600">{source.documentType}</p>
                      </div>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {(source.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm text-gray-600">
                        <strong>Valor:</strong> ${typeof source.fieldValue === 'number' ? source.fieldValue.toLocaleString() : source.fieldValue}
                      </p>
                    </div>

                    {source.sourceMapping?.rawText && (
                      <div className="p-2 bg-white rounded border border-green-100">
                        <p className="text-xs text-gray-600">
                          <strong>Texto original:</strong> "{source.sourceMapping.rawText}"
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Extraído: {new Date(source.extractedAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {provenance.auditTrail.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-blue-600" />
                Cambios Manuales
              </h4>

              <div className="space-y-3">
                {provenance.auditTrail.map((entry, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border ${
                      entry.type === 'FIELD_EDITED' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-900">Editado manualmente</p>
                        <p className="text-xs text-gray-600">Por: {entry.performedBy}</p>
                      </div>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        {entry.type}
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm text-gray-600">
                        <strong>Nuevo valor:</strong> ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                      </p>
                    </div>

                    {entry.reason && (
                      <div className="p-2 bg-white rounded border border-blue-100 mb-2">
                        <p className="text-xs text-gray-600">
                          <strong>Razón:</strong> {entry.reason}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString('es-ES')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-sm text-gray-600">
              <strong>Fuentes totales:</strong> {provenance.sources.length}
            </p>
            <ul className="mt-2 space-y-1">
              {provenance.sources.map((source, i) => (
                <li key={i} className="text-xs text-gray-600">
                  • {source}
                </li>
              ))}
            </ul>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-900">
              ℹ️ <strong>Transparencia:</strong> Puedes ver exactamente de dónde vino cada número. Esto te ayuda a
              verificar la precisión de tus impuestos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
