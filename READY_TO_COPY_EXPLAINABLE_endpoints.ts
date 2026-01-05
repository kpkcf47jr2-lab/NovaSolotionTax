// IMPORTANTE: Este código va DENTRO del archivo existente
// Ubicación en NovaSolutionTax: apps/api/src/index.ts
// Instrucción: AGREGA estos endpoints después de todos los document endpoints

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN A AGREGAR: Explainable Taxes API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

// ENDPOINT 1: Get tax explanation (¿por qué mis impuestos son $X?)
app.get('/returns/:returnId/explain', authenticateToken, async (req, res) => {
  try {
    const { returnId } = req.params;
    const userId = (req as any).userId;

    if (!isValidUUID(returnId)) {
      return res.status(400).json({ error: 'Invalid return ID' });
    }

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: {
        office: true,
        extractions: true,
        auditLog: true,
      },
    });

    if (!taxReturn) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Multi-tenant check
    const office = await prisma.office.findFirst({
      where: {
        id: taxReturn.officeId,
        users: { some: { id: userId } },
      },
    });

    if (!office) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Build explanation
    const calc = taxReturn.calculatedData as any;

    const explanation = {
      summary: `Tus impuestos federales para ${taxReturn.year} son $${calc.totalTaxes.toLocaleString()}`,
      breakdown: {
        grossIncome: {
          value: calc.totalIncome,
          description: `Comenzaste con $${calc.totalIncome.toLocaleString()} en ingresos brutos`,
          sources: [
            'Sueldos y salarios (W-2)',
            'Ingresos de inversiones (1099-DIV, 1099-INT)',
            'Ingresos de negocio (1099-NEC)',
            'Otros ingresos (1099-MISC)',
          ],
        },
        deductions: {
          value: calc.totalDeductions,
          description: `Luego restamos $${calc.totalDeductions.toLocaleString()} en deducciones`,
          sources: [
            'Interés hipotecario',
            'Impuestos a la propiedad',
            'Contribuciones caritativas',
            'Gastos médicos',
          ],
        },
        taxableIncome: {
          value: calc.taxableIncome,
          description: `Esto te dejó con $${calc.taxableIncome.toLocaleString()} en ingresos gravables`,
        },
        taxes: {
          value: calc.totalTaxes,
          description: `Aplicando los tramos fiscales de ${taxReturn.year}, tus impuestos son $${calc.totalTaxes.toLocaleString()}`,
          brackets:
            taxReturn.filingStatus === 'SINGLE'
              ? [
                  '10% en primeros $11,000',
                  '12% en próximos $44,725',
                  '22% en próximos $95,375',
                  '24% y más en cantidad mayor',
                ]
              : [
                  '10% en primeros $22,000',
                  '12% en próximos $89,075',
                  '22% en próximos $190,750',
                  '24% y más en cantidad mayor',
                ],
        },
        withholding: {
          value: taxReturn.withholding || 0,
          description: `Ya pagaste ${taxReturn.withholding || 0} en retenciones`,
        },
        refund: {
          value: calc.refundAmount,
          description:
            calc.refundAmount > 0
              ? `¡Te devolvemos $${Math.abs(calc.refundAmount).toLocaleString()}!`
              : `Debes pagar $${Math.abs(calc.refundAmount).toLocaleString()}`,
        },
      },
      insights: [
        `Tu tasa fiscal efectiva es ${((calc.totalTaxes / calc.totalIncome) * 100).toFixed(1)}%`,
        `Tus deducciones redujeron tu ingreso gravable en ${((calc.totalDeductions / calc.totalIncome) * 100).toFixed(1)}%`,
        taxReturn.year >= 2024 ? 'Estás usando detracciones estándar' : 'Estás usando detracciones detalladas',
      ],
    };

    return res.json(explanation);
  } catch (error) {
    console.error('Error explaining taxes:', error);
    return res.status(500).json({ error: 'Failed to explain taxes' });
  }
});

// ENDPOINT 2: What-If simulator (¿qué pasa si cambio este salario?)
app.post('/returns/:returnId/what-if', authenticateToken, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { fieldKey, newValue } = req.body;
    const userId = (req as any).userId;

    if (!isValidUUID(returnId)) {
      return res.status(400).json({ error: 'Invalid return ID' });
    }

    if (!fieldKey || newValue === undefined) {
      return res.status(400).json({ error: 'fieldKey and newValue required' });
    }

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: { office: true },
    });

    if (!taxReturn) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Multi-tenant check
    const office = await prisma.office.findFirst({
      where: {
        id: taxReturn.officeId,
        users: { some: { id: userId } },
      },
    });

    if (!office) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Clone current tax calc
    const currentCalc = taxReturn.calculatedData as any;

    // Create a new calculator with what-if scenario
    const { TaxCalculator } = await import('@novasolutiontax/core');
    const whatIfCalc = new TaxCalculator({
      year: taxReturn.year,
      filingStatus: taxReturn.filingStatus as any,
      state: taxReturn.state,
    });

    // Apply current data
    Object.entries(currentCalc).forEach(([key, value]) => {
      if (key !== 'totalIncome' && key !== 'totalDeductions' && key !== 'taxableIncome' && key !== 'totalTaxes' && key !== 'refundAmount' && key !== 'lastCalculatedAt') {
        try {
          const [category, fieldName] = key.split('.');
          if (category && fieldName) {
            whatIfCalc.setField(category as any, fieldName as any, value);
          }
        } catch (e) {
          // Skip invalid fields
        }
      }
    });

    // Apply the what-if change
    const [category, fieldName] = fieldKey.split('.');
    if (category && fieldName) {
      whatIfCalc.setField(category as any, fieldName as any, newValue);
    }

    // Calculate new result
    const newCalc = whatIfCalc.calculate();

    // Calculate deltas
    const deltas = {
      totalIncome: {
        current: currentCalc.totalIncome,
        whatIf: newCalc.totalIncome,
        delta: newCalc.totalIncome - currentCalc.totalIncome,
      },
      totalDeductions: {
        current: currentCalc.totalDeductions,
        whatIf: newCalc.totalDeductions,
        delta: newCalc.totalDeductions - currentCalc.totalDeductions,
      },
      totalTaxes: {
        current: currentCalc.totalTaxes,
        whatIf: newCalc.totalTaxes,
        delta: newCalc.totalTaxes - currentCalc.totalTaxes,
      },
      refundAmount: {
        current: currentCalc.refundAmount,
        whatIf: newCalc.refundAmount,
        delta: newCalc.refundAmount - currentCalc.refundAmount,
      },
    };

    return res.json({
      scenario: `Si cambiaras ${fieldKey} a $${newValue}`,
      current: currentCalc,
      whatIf: newCalc,
      deltas,
      impact:
        deltas.totalTaxes.delta > 0
          ? `Pagarías $${Math.abs(deltas.totalTaxes.delta).toLocaleString()} más en impuestos`
          : `Ahorrarías $${Math.abs(deltas.totalTaxes.delta).toLocaleString()} en impuestos`,
    });
  } catch (error) {
    console.error('Error calculating what-if:', error);
    return res.status(500).json({ error: 'Failed to calculate what-if scenario' });
  }
});

// ENDPOINT 3: Get delta for a document (cómo este documento cambió mis taxes)
app.get('/returns/:returnId/documents/:documentId/delta', authenticateToken, async (req, res) => {
  try {
    const { returnId, documentId } = req.params;
    const userId = (req as any).userId;

    if (!isValidUUID(returnId) || !isValidUUID(documentId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        return: { include: { office: true } },
        extraction: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Multi-tenant check
    const office = await prisma.office.findFirst({
      where: {
        id: document.return.officeId,
        users: { some: { id: userId } },
      },
    });

    if (!office) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!document.extraction) {
      return res.status(400).json({ error: 'Document has no extraction data' });
    }

    // Get audit log for this extraction
    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        returnId,
        action: 'DOCUMENT_EXTRACTED',
        changes: {
          path: ['extractionId'],
          equals: document.extractionId,
        },
      },
    });

    const extractedFields = document.extraction.extractedFields as any;
    const changes = auditEntry?.changes as any;

    return res.json({
      documentId,
      fileName: document.fileName,
      documentType: document.classifiedType,
      extractedAt: document.extraction.createdAt || new Date(),
      fieldCount: Object.keys(extractedFields).length,
      confidence: document.extraction.confidence,
      impact: {
        fields: extractedFields,
        confidence: document.extraction.confidence,
        calculatedTaxes: changes?.calculatedTaxes || null,
      },
      delta: changes
        ? {
            incomeDelta: changes.calculatedTaxes?.totalIncome || 0,
            deductionsDelta: changes.calculatedTaxes?.totalDeductions || 0,
            taxesDelta: changes.calculatedTaxes?.totalTaxes || 0,
            refundDelta: changes.calculatedTaxes?.refundAmount || 0,
          }
        : null,
    });
  } catch (error) {
    console.error('Error getting document delta:', error);
    return res.status(500).json({ error: 'Failed to get document delta' });
  }
});

// ENDPOINT 4: Get provenance for a field (de dónde vino este número)
app.get('/returns/:returnId/fields/:fieldKey/provenance', authenticateToken, async (req, res) => {
  try {
    const { returnId, fieldKey } = req.params;
    const userId = (req as any).userId;

    if (!isValidUUID(returnId)) {
      return res.status(400).json({ error: 'Invalid return ID' });
    }

    if (!fieldKey) {
      return res.status(400).json({ error: 'fieldKey required' });
    }

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: { office: true },
    });

    if (!taxReturn) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Multi-tenant check
    const office = await prisma.office.findFirst({
      where: {
        id: taxReturn.officeId,
        users: { some: { id: userId } },
      },
    });

    if (!office) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Find all extractions that contain this field
    const extractions = await prisma.extraction.findMany({
      where: { returnId },
      include: {
        document: true,
      },
    });

    const provenance = [];

    for (const extraction of extractions) {
      const fields = extraction.extractedFields as any;

      if (fields[fieldKey]) {
        provenance.push({
          documentId: extraction.documentId,
          fileName: extraction.document.fileName,
          documentType: extraction.document.classifiedType,
          extractedAt: extraction.createdAt || new Date(),
          fieldValue: fields[fieldKey].value,
          confidence: fields[fieldKey].confidence,
          sourceMapping: fields[fieldKey].sourceMapping,
        });
      }
    }

    // Also check audit logs for manual entries
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        returnId,
        action: { in: ['FIELD_UPDATED', 'FIELD_EDITED'] },
      },
      orderBy: { createdTimestamp: 'desc' },
    });

    const auditTrail = auditLogs
      .filter((log) => {
        const changes = log.changes as any;
        return changes?.fieldKey === fieldKey;
      })
      .map((log) => ({
        type: log.action,
        performedBy: log.performedBy,
        timestamp: log.createdTimestamp,
        value: (log.changes as any)?.value,
        reason: (log.changes as any)?.reason,
      }));

    return res.json({
      fieldKey,
      provenance,
      auditTrail,
      sources: [
        ...provenance.map((p) => `${p.fileName} (${p.documentType})`),
        ...auditTrail.filter((a) => a.type === 'FIELD_EDITED').map((a) => `Editado manualmente por ${a.performedBy}`),
      ],
    });
  } catch (error) {
    console.error('Error getting provenance:', error);
    return res.status(500).json({ error: 'Failed to get provenance' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIN DE SECCIÓN A AGREGAR
// ═══════════════════════════════════════════════════════════════════════════════
