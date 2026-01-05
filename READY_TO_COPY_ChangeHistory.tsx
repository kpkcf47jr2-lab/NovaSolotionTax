// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/ChangeHistory.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { HistoryIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FieldChange {
  id: string;
  fieldKey: string;
  timestamp: string;
  action: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  user: string;
  userRole: string;
}

interface ChangeHistoryProps {
  returnId: string;
  fieldKey: string;
  fieldLabel: string;
}

export default function ChangeHistory({
  returnId,
  fieldKey,
  fieldLabel,
}: ChangeHistoryProps) {
  const [changes, setChanges] = useState<FieldChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchHistory = async () => {
    if (!token || !returnId || !fieldKey) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/returns/${returnId}/fields/${encodeURIComponent(fieldKey)}/audit`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setChanges(data.changes || []);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching change history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: unknown) => {
    if (typeof value !== 'number') return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role: string) => {
    if (role === 'cpa' || role === 'preparer') return 'bg-purple-100 text-purple-800';
    if (role === 'admin') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getActionIcon = (action: string) => {
    if (action === 'FIELD_EDITED') return '✏️';
    if (action === 'FIELD_OVERRIDDEN') return '⚖️';
    if (action === 'FIELD_EXTRACTED') return '📄';
    return '📝';
  };

  if (!showHistory) {
    return (
      <button
        onClick={fetchHistory}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }`}
      >
        <HistoryIcon className="h-4 w-4" />
        {loading ? 'Cargando...' : 'Historial de Cambios'}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 pl-4 border-l-2 border-purple-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Cambios en {fieldLabel}
        </h3>
        <button
          onClick={() => setShowHistory(false)}
          className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 text-sm"
        >
          <XMarkIcon className="h-4 w-4" />
          Cerrar
        </button>
      </div>

      {/* Change List */}
      {changes.length === 0 ? (
        <p className="text-sm text-gray-600 italic py-2">No hay cambios registrados para este campo</p>
      ) : (
        <div className="space-y-2">
          {changes.map((change, index) => (
            <div key={change.id} className="bg-white rounded-lg border p-3 hover:shadow-md transition-shadow">
              {/* Change Number + Action */}
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">{getActionIcon(change.action)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      Cambio #{changes.length - index}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${getRoleColor(change.userRole)}`}>
                      {change.userRole}
                    </span>
                  </div>

                  {/* Values at a glance */}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(change.previousValue)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(change.newValue)}
                    </span>
                    <span className={`font-bold ${
                      Number(change.newValue) - Number(change.previousValue) < 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ({Number(change.newValue) - Number(change.previousValue) >= 0 ? '+' : ''}
                      {formatCurrency(Number(change.newValue) - Number(change.previousValue))})
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs text-gray-600 ml-10">
                <p>
                  <strong>Modificado por:</strong> {change.user}
                </p>
                <p>
                  <strong>Fecha:</strong> {formatDate(change.timestamp)}
                </p>
                {change.reason && (
                  <p>
                    <strong>Razón:</strong> {change.reason}
                  </p>
                )}

                {/* Tax Impact */}
                {change.taxImpact && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="font-semibold text-yellow-900 mb-1">
                      💰 Impacto en Impuestos: {change.taxImpact.delta >= 0 ? '+' : ''}
                      {formatCurrency(change.taxImpact.delta)}
                    </p>
                    <p className="text-yellow-800">
                      Antes: {formatCurrency(change.taxImpact.taxesBefore)} → Después: {formatCurrency(change.taxImpact.taxesAfter)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-xs text-purple-900">
          ℹ️ <strong>Historial:</strong> Aquí ves todos los cambios realizados a este campo. Cada cambio es reversible si
          se necesita, pero la edición anterior quedará registrada en el audit trail para compliance.
        </p>
      </div>
    </div>
  );
}
