// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/FieldEditor.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FieldEditorProps {
  returnId: string;
  fieldKey: string;
  fieldLabel: string;
  currentValue: number;
  onSuccess?: (newValue: number) => void;
}

export default function FieldEditor({
  returnId,
  fieldKey,
  fieldLabel,
  currentValue,
  onSuccess,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(currentValue.toString());
  const [editReason, setEditReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleSave = async () => {
    if (!token || !returnId || !fieldKey) return;

    // Validación
    if (!editValue || isNaN(Number(editValue))) {
      setError('El valor debe ser un número válido');
      return;
    }

    if (!editReason.trim()) {
      setError('Debes explicar por qué cambias este valor');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(`/api/returns/${returnId}/fields/${encodeURIComponent(fieldKey)}/edit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newValue: Number(editValue),
          reason: editReason.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`✅ ${fieldLabel} actualizado a $${Number(editValue).toLocaleString()}`);
        setIsEditing(false);
        setEditValue('');
        setEditReason('');

        // Callback para actualizar padre
        if (onSuccess) {
          onSuccess(Number(editValue));
        }

        // Auto-hide success message
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Error al guardar cambios');
      }
    } catch (err) {
      console.error('Error saving field:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(currentValue.toString());
    setEditReason('');
    setError('');
  };

  const formatCurrency = (value: string) => {
    const num = Number(value);
    return isNaN(num) ? '-' : `$${num.toLocaleString()}`;
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
        <div>
          <p className="text-xs text-gray-600 mb-1">{fieldLabel}</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(currentValue.toString())}</p>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium text-sm transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          Editar
        </button>

        {success && <p className="text-sm text-green-700 font-medium">{success}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 space-y-3">
      {/* Current Value */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Valor actual:</span>
        <span className="font-bold text-gray-900">{formatCurrency(currentValue.toString())}</span>
      </div>

      {/* New Value Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo valor:</label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-600">$</span>
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="0"
            step="100"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        {editValue && editValue !== currentValue.toString() && (
          <p className="text-xs text-gray-600 mt-1">
            Cambio: <span className={formatCurrency(String(Number(editValue) - currentValue)).startsWith('-') ? 'text-red-600' : 'text-green-600'}>
              {Number(editValue) - currentValue >= 0 ? '+' : ''}{formatCurrency(String(Number(editValue) - currentValue))}
            </span>
          </p>
        )}
      </div>

      {/* Reason Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">¿Por qué cambias esto?</label>
        <textarea
          value={editReason}
          onChange={(e) => setEditReason(e.target.value)}
          placeholder="Ej: Recibí documento actualizado del empleador"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Esta razón quedará registrada en el audit trail</p>
      </div>

      {/* Error Message */}
      {error && <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={loading || !editValue || !editReason.trim()}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded font-medium text-white transition-colors ${
            loading || !editValue || !editReason.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          <CheckIcon className="h-4 w-4" />
          {loading ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded font-medium text-white transition-colors disabled:cursor-not-allowed"
        >
          <XMarkIcon className="h-4 w-4" />
          Cancelar
        </button>
      </div>

      {/* Info Box */}
      <div className="p-2 bg-blue-100 rounded text-xs text-blue-900">
        ℹ️ <strong>Importante:</strong> Este cambio recalculará automáticamente tus impuestos. Todos los cambios quedan registrados en el audit trail.
      </div>
    </div>
  );
}
