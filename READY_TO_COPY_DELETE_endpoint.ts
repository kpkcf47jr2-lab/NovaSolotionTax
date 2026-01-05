// IMPORTANTE: Este código va DENTRO del archivo existente
// Ubicación en NovaSolutionTax: apps/api/src/index.ts
// Instrucción: AGREGA este endpoint después del GET /returns/:returnId/documents/:documentId/download

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN A AGREGAR: DELETE endpoint para documentos
// ═══════════════════════════════════════════════════════════════════════════════

// Agrega después de la ruta GET /returns/:returnId/documents/:documentId/download

app.delete('/returns/:returnId/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { returnId, documentId } = req.params;
    const userId = (req as any).userId;

    // Validate UUIDs
    if (!isValidUUID(returnId) || !isValidUUID(documentId)) {
      return res.status(400).json({ error: 'Invalid return or document ID' });
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        return: {
          include: { office: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Multi-tenant check
    const office = await prisma.office.findFirst({
      where: {
        id: document.return.officeId,
        users: {
          some: { id: userId },
        },
      },
    });

    if (!office) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify document belongs to this return
    if (document.returnId !== returnId) {
      return res.status(400).json({ error: 'Document does not belong to this return' });
    }

    // Delete file from storage
    try {
      const storageProvider = getStorageProvider();
      await storageProvider.delete(document.storagePath);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue anyway, delete DB record
    }

    // Delete extraction records if any
    if (document.extractionId) {
      await prisma.extraction.delete({
        where: { id: document.extractionId },
      });
    }

    // Delete document
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        returnId,
        action: 'DOCUMENT_DELETED',
        performedBy: userId,
        changes: {
          documentId,
          fileName: document.fileName,
        },
      },
    });

    // Recalculate taxes (document removed, might affect calculations)
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
    });

    if (taxReturn?.calculatedData) {
      // Mark as dirty so UI knows taxes might have changed
      await prisma.taxReturn.update({
        where: { id: returnId },
        data: {
          isDirty: true,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Document deleted successfully',
      documentId,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIN DE SECCIÓN A AGREGAR
// ═══════════════════════════════════════════════════════════════════════════════
