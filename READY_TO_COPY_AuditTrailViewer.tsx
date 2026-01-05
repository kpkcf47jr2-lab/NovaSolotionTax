// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/AuditTrailViewer.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { ClockIcon, ArchiveBoxIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Change {
  id: string;
  timestamp: string;
  action: string;
  field: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  user: string;
  userRole: string;
  taxImpact?: {
    taxesBefore: number;
    taxesAfter: number;
    delta: number;
  };
}

interface Statistics {
  totalChanges: number;
  changesByType: {
    fieldEdited: number;
    overridden: number;
    extracted: number;
  };
  lastModifiedAt: string;
  createdAt: string;
}

interface AuditTrailData {
  returnId: string;
  timeline: Change[];
  statistics: Statistics;
}

interface AuditTrailViewerProps {
  returnId: string;
}

const ACTION_ICONS: Record<string, string> = {
  FIELD_EDITED: '✏️',
  FIELD_OVERRIDDEN: '⚖️',
  FIELD_EXTRACTED: '📄',
};

const ACTION_LABELS: Record<string, string> = {
  FIELD_EDITED: 'Editado',
  FIELD_OVERRIDDEN: 'Override (CPA)',
  FIELD_EXTRACTED: 'Extraído',
};

export default function AuditTrailViewer({ returnId }: AuditTrailViewerProps) {
  const [auditTrail, setAuditTrail] = useState<AuditTrailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchAuditTrail = async () => {
    if (!token || !returnId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/returns/${returnId}/audit-trail`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAuditTrail(data);
        setShowTrail(true);
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: unknown) => {
    if (typeof value !== 'number') return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getActionColor = (action: string) => {
    if (action === 'FIELD_EDITED') return 'bg-blue-50 border-blue-200';
    if (action === 'FIELD_OVERRIDDEN') return 'bg-purple-50 border-purple-200';
    if (action === 'FIELD_EXTRACTED') return 'bg-green-50 border-green-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getRoleColor = (role: string) => {
    if (role === 'cpa' || role === 'preparer') return 'bg-purple-100 text-purple-800';
    if (role === 'admin') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-3">
      {/* Trigger Button */}
      <button
        onClick={fetchAuditTrail}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <ArchiveBoxIcon className="h-4 w-4" />
        {loading ? 'Cargando...' : 'Ver Historial Completo'}
      </button>

      {/* Audit Trail Details */}
      {auditTrail && showTrail && (
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-300">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs text-gray-600 mb-1">Total de cambios</p>
              <p className="text-2xl font-bold text-gray-900">{auditTrail.statistics.totalChanges}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs text-gray-600 mb-1">Última modificación</p>
              <p className="text-xs font-medium text-gray-900">
                {formatDate(auditTrail.statistics.lastModifiedAt)}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Editados</p>
              <p className="text-xl font-bold text-blue-900">
                {auditTrail.statistics.changesByType.fieldEdited}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <p className="text-xs text-purple-600 mb-1">CPAs Override</p>
              <p className="text-xl font-bold text-purple-900">
                {auditTrail.statistics.changesByType.overridden}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              Historial de Cambios
            </h4>

            {auditTrail.timeline.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No hay cambios registrados</p>
            ) : (
              <div className="space-y-2">
                {auditTrail.timeline.map((change, i) => (
                  <div key={change.id} className={`rounded-lg border p-3 ${getActionColor(change.action)}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2 cursor-pointer" onClick={() => setExpandedChangeId(expandedChangeId === change.id ? null : change.id)}>
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-lg">{ACTION_ICONS[change.action] || '📝'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {ACTION_LABELS[change.action] || change.action}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${getRoleColor(change.userRole)}`}>
                              {change.userRole}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {change.field} • {formatDate(change.timestamp)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{i + 1}</span>
                    </div>

                    {/* Expanded Details */}
                    {expandedChangeId === change.id && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
                        {/* Who */}
                        <div>
                          <p className="text-xs text-gray-600">
                            <strong>Por:</strong> {change.user}
                          </p>
                        </div>

                        {/* Values */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white bg-opacity-50 rounded">
                            <p className="text-xs text-gray-600 mb-0.5">Antes</p>
                            <p className="font-bold text-gray-900">
                              {formatCurrency(change.previousValue)}
                            </p>
                          </div>
                          <div className="p-2 bg-white bg-opacity-50 rounded">
                            <p className="text-xs text-gray-600 mb-0.5">Después</p>
                            <p className="font-bold text-gray-900">
                              {formatCurrency(change.newValue)}
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        {change.reason && (
                          <div className="p-2 bg-white bg-opacity-50 rounded">
                            <p className="text-xs text-gray-600 mb-1">
                              <strong>Razón:</strong>
                            </p>
                            <p className="text-sm text-gray-900">{change.reason}</p>
                          </div>
                        )}

                        {/* Tax Impact */}
                        {change.taxImpact && (
                          <div className="p-2 bg-white bg-opacity-50 rounded border-l-4 border-yellow-500">
                            <p className="text-xs text-gray-600 mb-1">
                              <strong>💰 Impacto en Impuestos:</strong>
                            </p>
                            <div className="space-y-1 text-xs">
                              <p>
                                Antes: <span className="font-bold">{formatCurrency(change.taxImpact.taxesBefore)}</span>
                              </p>
                              <p>
                                Después:{' '}
                                <span className="font-bold">{formatCurrency(change.taxImpact.taxesAfter)}</span>
                              </p>
                              <p
                                className={`font-bold ${
                                  change.taxImpact.delta < 0
                                    ? 'text-green-700'
                                    : change.taxImpact.delta > 0
                                      ? 'text-red-700'
                                      : 'text-gray-700'
                                }`}
                              >
                                Cambio: {change.taxImpact.delta >= 0 ? '+' : ''}
                                {formatCurrency(change.taxImpact.delta)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900">
              ℹ️ <strong>Audit Trail:</strong> Este historial muestra todos los cambios realizados a tu declaración de
              impuestos. Cada cambio incluye quién lo hizo, cuándo, y por qué. Esto garantiza transparencia y compliance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
