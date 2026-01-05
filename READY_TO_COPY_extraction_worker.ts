// IMPORTANTE: Este código va DENTRO del archivo existente
// Ubicación en NovaSolutionTax: packages/workers/src/index.ts
// Instrucción: REEMPLAZA la función extractionQueue.process() existente con este código

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN A REEMPLAZAR: extractionQueue.process() function
// ═══════════════════════════════════════════════════════════════════════════════

// ANTES:
// extractionQueue.process(async (job) => { ... })

// DESPUÉS: Reemplaza TODO el contenido del process() con esto:

extractionQueue.process(async (job) => {
  const { documentId, returnId, documentType, storagePath } = job.data;
  const maxRetries = 5;

  try {
    console.log(`[Worker] Processing document: ${documentId} (${documentType})`);

    // 1. Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        return: {
          include: { taxCalculator: true, office: true },
        },
      },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // 2. Load file from storage
    const storageProvider = getStorageProvider();
    const fileContent = await storageProvider.get(storagePath);

    if (!fileContent) {
      throw new Error(`Could not load file from storage: ${storagePath}`);
    }

    // 3. Get parser for document type
    const { getParserForDocumentType } = await import('./parsers');
    const parser = getParserForDocumentType(documentType);

    if (!parser) {
      throw new Error(`No parser available for document type: ${documentType}`);
    }

    // 4. Parse document with OCR/ML
    const parsedData = parser(document.fileName, fileContent);

    // 5. Create extraction record in database
    const extraction = await prisma.extraction.create({
      data: {
        documentId,
        returnId,
        extractedFields: parsedData.fields,
        confidence: parsedData.overallConfidence,
        provenance: {
          extractorType: parsedData.extractorType,
          extractedAt: parsedData.extractedAt.toISOString(),
          evidence: parsedData.evidence,
        },
      },
    });

    console.log(`[Worker] Extraction created: ${extraction.id} (confidence: ${extraction.confidence})`);

    // 6. Update document status to EXTRACTED
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'EXTRACTED',
        extractionId: extraction.id,
      },
    });

    // 7. CRITICAL: Recalculate taxes with extracted fields
    console.log(`[Worker] Recalculating taxes for return ${returnId}...`);

    const taxReturn = document.return;
    const taxCalculator = new TaxCalculator({
      year: taxReturn.year,
      filingStatus: taxReturn.filingStatus as any,
      state: taxReturn.state,
    });

    // Apply extracted fields to tax calculator
    for (const [fieldKey, fieldData] of Object.entries(parsedData.fields)) {
      const fieldPath = fieldKey.split('.');
      if (fieldPath.length === 2) {
        const [category, fieldName] = fieldPath;
        // Map extracted fields to tax calculator sections
        taxCalculator.setField(category as any, fieldName as any, fieldData.value);
      }
    }

    // Calculate taxes
    const calculatedResult = taxCalculator.calculate();

    console.log(`[Worker] Tax calculation result:`, {
      totalIncome: calculatedResult.totalIncome,
      totalDeductions: calculatedResult.totalDeductions,
      taxableIncome: calculatedResult.taxableIncome,
      totalTaxes: calculatedResult.totalTaxes,
      refundAmount: calculatedResult.refundAmount,
    });

    // 8. Update tax return with new calculations
    await prisma.taxReturn.update({
      where: { id: returnId },
      data: {
        calculatedData: calculatedResult,
        lastCalculatedAt: new Date(),
        isDirty: false,
      },
    });

    // 9. Create audit log entry
    await prisma.auditLog.create({
      data: {
        returnId,
        action: 'DOCUMENT_EXTRACTED',
        performedBy: 'SYSTEM_WORKER',
        changes: {
          extractionId: extraction.id,
          documentId,
          confidence: extraction.confidence,
          fieldCount: Object.keys(parsedData.fields).length,
          calculatedTaxes: calculatedResult,
        },
      },
    });

    // 10. Record analytics event
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'DOCUMENT_EXTRACTION_COMPLETE',
        properties: {
          documentType,
          confidence: extraction.confidence,
          fieldCount: Object.keys(parsedData.fields).length,
          processingTimeMs: job.progress().duration || 0,
          returnId,
          officeId: taxReturn.office.id,
        },
      },
    });

    console.log(`[Worker] ✅ Document ${documentId} processed successfully`);

    return {
      success: true,
      extractionId: extraction.id,
      confidence: extraction.confidence,
      fieldCount: Object.keys(parsedData.fields).length,
      taxesRecalculated: true,
    };
  } catch (error) {
    console.error(`[Worker] Error processing document ${documentId}:`, error);

    // Retry logic
    if (job.attemptsMade < maxRetries) {
      const retryDelay = Math.pow(2, job.attemptsMade) * 1000; // Exponential backoff
      console.log(`[Worker] Retrying in ${retryDelay}ms (attempt ${job.attemptsMade + 1}/${maxRetries})`);
      throw error; // BullMQ will handle retry
    } else {
      // Max retries exceeded - mark as failed
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'EXTRACTION_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      await prisma.auditLog.create({
        data: {
          returnId,
          action: 'DOCUMENT_EXTRACTION_FAILED',
          performedBy: 'SYSTEM_WORKER',
          changes: {
            documentId,
            error: error instanceof Error ? error.message : 'Unknown error',
            attemptsMade: job.attemptsMade,
          },
        },
      });

      console.error(`[Worker] ❌ Document ${documentId} failed after ${maxRetries} retries`);
      throw new Error(`Extraction failed after ${maxRetries} attempts`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIN DE SECCIÓN A REEMPLAZAR
// ═══════════════════════════════════════════════════════════════════════════════
