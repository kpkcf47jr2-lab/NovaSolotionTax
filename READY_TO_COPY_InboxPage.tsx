// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/app/(authenticated)/returns/[returnId]/inbox/page.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DocumentUploadWidget from '@/components/DocumentUploadWidget';
import DocumentList from '@/components/DocumentList';

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

interface TaxReturn {
  id: string;
  year: number;
  filingStatus: string;
  calculatedData?: {
    totalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    totalTaxes: number;
    refundAmount: number;
    lastCalculatedAt: string;
  };
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const returnId = params.returnId as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [taxReturn, setTaxReturn] = useState<TaxReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch documents and tax return
  useEffect(() => {
    const fetchData = async () => {
      if (!token || !returnId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch tax return details
        const returnRes = await fetch(`/api/returns/${returnId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (returnRes.ok) {
          const returnData = await returnRes.json();
          setTaxReturn(returnData);
        }

        // Fetch documents
        const docsRes = await fetch(`/api/returns/${returnId}/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
        } else if (docsRes.status === 401) {
          router.push('/auth/login');
        }

        setError('');
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error cargando documentos. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token, returnId, router]);

  const handleUploadSuccess = () => {
    // Refresh documents immediately
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      // Trigger a fetch
      if (token && returnId) {
        fetch(`/api/returns/${returnId}/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            setDocuments(data.documents || []);
          })
          .catch(console.error);
      }
    }, 1000);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;

    try {
      const res = await fetch(`/api/returns/${returnId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== documentId));
      } else {
        alert('Error eliminando documento');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error eliminando documento');
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bandeja de Documentos</h1>
          <p className="text-gray-600 mt-2">Carga documentos para que NovaSolutionTax extraiga la información automáticamente</p>
        </div>

        {/* Tax Return Summary */}
        {taxReturn?.calculatedData && (
          <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-green-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Impuestos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${taxReturn.calculatedData.totalIncome.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Deducciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${taxReturn.calculatedData.totalDeductions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Impuestos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${taxReturn.calculatedData.totalTaxes.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reembolso Estimado</p>
                <p
                  className={`text-2xl font-bold ${
                    taxReturn.calculatedData.refundAmount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  ${Math.abs(taxReturn.calculatedData.refundAmount).toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Última actualización: {new Date(taxReturn.calculatedData.lastCalculatedAt).toLocaleString('es-ES')}
            </p>
          </div>
        )}

        {/* Upload Widget */}
        <DocumentUploadWidget returnId={returnId} onUploadSuccess={handleUploadSuccess} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Documents List */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Documentos Cargados ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No hay documentos cargados aún.</p>
              <p className="text-gray-500 text-sm mt-2">Carga tu primer documento arriba para empezar</p>
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDelete={handleDeleteDocument}
              refreshing={refreshing}
            />
          )}
        </div>

        {/* Documents Count Summary */}
        {documents.length > 0 && (
          <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>{documents.filter((d) => d.status === 'EXTRACTED').length}</strong> documentos procesados •{' '}
              <strong>{documents.filter((d) => d.status === 'PROCESSING').length}</strong> procesando •{' '}
              <strong>{documents.filter((d) => d.status === 'EXTRACTION_FAILED').length}</strong> errores
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
