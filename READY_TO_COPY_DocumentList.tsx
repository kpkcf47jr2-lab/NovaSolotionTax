// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/web/src/components/DocumentList.tsx
// Instrucción: Crea este archivo nuevo con TODO este contenido

'use client';

import { useState } from 'react';
import DocumentCard from './DocumentCard';

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

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: string) => void;
  refreshing?: boolean;
}

export default function DocumentList({ documents, onDelete, refreshing }: DocumentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort by uploadedAt descending
  const sortedDocuments = [...documents].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedDocuments.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          isExpanded={expandedId === doc.id}
          onExpand={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
          onDelete={() => onDelete(doc.id)}
          refreshing={refreshing}
        />
      ))}
    </div>
  );
}
