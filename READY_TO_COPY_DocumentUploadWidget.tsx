// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/DocumentUploadWidget.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useCallback, useState } from 'react';
import { CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DocumentUploadWidgetProps {
  returnId: string;
  onUploadSuccess?: () => void;
}

export default function DocumentUploadWidget({ returnId, onUploadSuccess }: DocumentUploadWidgetProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt'];

    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo es muy grande. Máximo 10MB.' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido. Usa JPEG, PNG, PDF o TXT.' };
    }

    const hasValidExtension = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      return { valid: false, error: 'Extensión de archivo no permitida.' };
    }

    return { valid: true };
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const validation = validateFile(file);

      if (validation.valid) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setStatusMessage('');
      } else {
        setUploadStatus('error');
        setStatusMessage(validation.error || 'Error validando archivo');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const validation = validateFile(file);

      if (validation.valid) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setStatusMessage('');
      } else {
        setUploadStatus('error');
        setStatusMessage(validation.error || 'Error validando archivo');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) {
      setUploadStatus('error');
      setStatusMessage('Error: archivo o token no disponible');
      return;
    }

    try {
      setUploading(true);
      setUploadStatus('idle');
      setStatusMessage('');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/returns/${returnId}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus('success');
        setStatusMessage(
          `Documento "${data.document.fileName}" cargado. Extrayendo información...`,
        );
        setSelectedFile(null);

        // Reset form
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        // Callback
        if (onUploadSuccess) {
          setTimeout(() => onUploadSuccess(), 1500);
        }

        // Clear success message after 4 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setStatusMessage('');
        }, 4000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUploadStatus('error');
        setStatusMessage(errorData.error || 'Error cargando documento');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage('Error cargando documento. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 border-2 border-gray-200">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`transition-colors duration-300 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.pdf,.txt"
          disabled={uploading}
        />

        <label htmlFor="file-upload" className="cursor-pointer block">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />

          {selectedFile ? (
            <div>
              <p className="text-lg font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra archivos aquí'}
              </p>
              <p className="text-sm text-gray-600 mt-1">o haz clic para seleccionar</p>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            Formatos permitidos: JPEG, PNG, PDF, TXT. Máximo 10MB.
          </p>
        </label>
      </div>

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="mt-4 flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{statusMessage}</p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mt-4 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg p-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{statusMessage}</p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && uploadStatus !== 'success' && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-colors ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {uploading ? 'Cargando...' : 'Cargar Documento'}
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            }}
            disabled={uploading}
            className="px-4 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Info Text */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-900">
          💡 <strong>Consejo:</strong> Soportamos W-2, 1099s, hipotecas, extractos de corredores, y más.
          NovaSolutionTax extraerá automáticamente los datos y recalculará tus impuestos.
        </p>
      </div>
    </div>
  );
}
