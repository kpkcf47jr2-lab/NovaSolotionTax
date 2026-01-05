// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/DocumentCard.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import ExtractedFieldsViewer from './ExtractedFieldsViewer';

interface Document {
  id: string;
  fileName: string;
  status: 'PROCESSING' | 'EXTRACTED' | 'EXTRACTION_FAILED';
  classifiedType: string;
  uploadedAt: string;
  extraction?: {
    id: string;
    confidence: number;
    fieldCount: number;
    fields: Record<
      string,
      {
        value: unknown;
        confidence: number;
      }
    >;
  };
  errorMessage?: string;
}

interface DocumentCardProps {
  document: Document;
  isExpanded: boolean;
  onExpand: () => void;
  onDelete: () => void;
  refreshing?: boolean;
}

const DOCUMENT_TYPES: Record<string, string> = {
  W2_2024: 'Formulario W-2 (2024)',
  '1099_INT': '1099-INT (Intereses)',
  '1099_DIV': '1099-DIV (Dividendos)',
  '1099_NEC': '1099-NEC (Ingresos independientes)',
  '1099_MISC': '1099-MISC (Ingresos varios)',
  '1098_T': '1098-T (Créditos educativos)',
  MORTGAGE_STMT: 'Estado de hipoteca',
  BROKERAGE_STMT: 'Estado de corredora',
  DONATION_RECEIPT: 'Recibo de donación',
  MEDICAL_RECEIPT: 'Recibo médico',
  BUSINESS_RECEIPT: 'Recibo de negocio',
  UNKNOWN: 'Documento (tipo desconocido)',
};

export default function DocumentCard({
  document,
  isExpanded,
  onExpand,
  onDelete,
  refreshing,
}: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const statusConfig = {
    PROCESSING: {
      color: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: <ClockIcon className="h-5 w-5 text-yellow-600 animate-spin" />,
      label: 'Procesando',
    },
    EXTRACTED: {
      color: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-800',
      icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
      label: 'Extraído',
    },
    EXTRACTION_FAILED: {
      color: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: <ExclamationCircleIcon className="h-5 w-5 text-red-600" />,
      label: 'Error',
    },
  };

  const config = statusConfig[document.status];
  const docTypeLabel = DOCUMENT_TYPES[document.classifiedType] || DOCUMENT_TYPES.UNKNOWN;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(`/api/returns/${document.id}/documents/${document.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error descargando documento');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${config.color} ${refreshing ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {config.icon}
            <h3 className="font-semibold text-gray-900">{document.fileName}</h3>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${config.badge}`}>
              {config.label}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">{docTypeLabel}</p>

          <div className="flex flex-col md:flex-row md:items-center gap-2 text-xs text-gray-500">
            <span>
              Cargado: {new Date(document.uploadedAt).toLocaleString('es-ES')}
            </span>

            {document.extraction && (
              <>
                <span className="hidden md:inline">•</span>
                <span>
                  Confianza: <strong>{(document.extraction.confidence * 100).toFixed(1)}%</strong>
                </span>
                <span className="hidden md:inline">•</span>
                <span>
                  Campos extraídos: <strong>{document.extraction.fieldCount}</strong>
                </span>
              </>
            )}

            {document.status === 'EXTRACTION_FAILED' && document.errorMessage && (
              <>
                <span className="hidden md:inline">•</span>
                <span className="text-red-600">Error: {document.errorMessage}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {document.status === 'EXTRACTED' && document.extraction && (
            <button
              onClick={onExpand}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Mostrar detalles"
            >
              <ChevronDownIcon
                className={`h-5 w-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-2 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Descargar"
          >
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <TrashIcon className="h-5 w-5 text-red-600" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && document.extraction && (
        <div className="mt-6 pt-6 border-t-2 border-current border-opacity-10">
          <ExtractedFieldsViewer
            fields={document.extraction.fields}
            confidence={document.extraction.confidence}
            documentType={document.classifiedType}
          />
        </div>
      )}
    </div>
  );
}
