// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: apps/api/src/index.ts
// Instrucción: Pega TODO este contenido ANTES de app.listen()

// ==========================================
// PHASE 3: EDITOR + AUDIT TRAIL ENDPOINTS
// ==========================================

// 1. POST /api/returns/:returnId/fields/:fieldKey/edit
// Editar un campo + registrar razón + recalcular impuestos
app.post(
  '/api/returns/:returnId/fields/:fieldKey/edit',
  authenticateJWT,
  async (req, res) => {
    try {
      const { returnId, fieldKey } = req.params;
      const { newValue, reason } = req.body;
      const userId = (req as any).user.id;
      const tenantId = (req as any).user.tenantId;

      // Validación de entrada
      if (!newValue && newValue !== 0) {
        return res.status(400).json({
          error: 'newValue es requerido',
          code: 'VALIDATION_ERROR',
        });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          error: 'reason es requerido (explica por qué cambias este valor)',
          code: 'VALIDATION_ERROR',
        });
      }

      // Fetch return con multi-tenant check
      const taxReturn = await prisma.taxReturn.findFirst({
        where: {
          id: returnId,
          tenantId: tenantId,
        },
        include: {
          extractedData: true,
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!taxReturn) {
        return res.status(404).json({
          error: 'Return no encontrado',
          code: 'NOT_FOUND',
        });
      }

      // Guardar valor anterior para audit
      const previousValue = taxReturn.extractedData[fieldKey];

      // Validar que el nuevo valor sea del tipo correcto
      if (typeof newValue !== 'number') {
        return res.status(400).json({
          error: 'El valor debe ser un número',
          code: 'INVALID_TYPE',
        });
      }

      // Actualizar extractedData
      const updatedData = {
        ...taxReturn.extractedData,
        [fieldKey]: newValue,
      };

      // Recalcular impuestos
      const calculator = new (require('@novasolutiontax/core').TaxCalculator)(updatedData);
      const newTaxCalculation = calculator.calculate();

      // Guardar cambios
      const updated = await prisma.taxReturn.update({
        where: { id: returnId },
        data: {
          extractedData: updatedData,
          taxCalculation: newTaxCalculation,
          lastModifiedAt: new Date(),
        },
        include: {
          extractedData: true,
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      // Crear audit log
      await prisma.auditLog.create({
        data: {
          returnId: returnId,
          tenantId: tenantId,
          userId: userId,
          action: 'FIELD_EDITED',
          fieldKey: fieldKey,
          previousValue: previousValue,
          newValue: newValue,
          reason: reason,
          metadata: {
            previousTaxCalculation: taxReturn.taxCalculation,
            newTaxCalculation: newTaxCalculation,
          },
        },
      });

      res.json({
        success: true,
        field: fieldKey,
        previousValue: previousValue,
        newValue: newValue,
        reason: reason,
        updatedReturn: {
          ...updated,
          taxCalculation: newTaxCalculation,
        },
      });
    } catch (error) {
      console.error('Error editing field:', error);
      res.status(500).json({
        error: 'Error al editar el campo',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// 2. GET /api/returns/:returnId/fields/:fieldKey/audit
// Ver audit trail de un campo específico
app.get(
  '/api/returns/:returnId/fields/:fieldKey/audit',
  authenticateJWT,
  async (req, res) => {
    try {
      const { returnId, fieldKey } = req.params;
      const tenantId = (req as any).user.tenantId;

      // Fetch return con multi-tenant check
      const taxReturn = await prisma.taxReturn.findFirst({
        where: {
          id: returnId,
          tenantId: tenantId,
        },
      });

      if (!taxReturn) {
        return res.status(404).json({
          error: 'Return no encontrado',
          code: 'NOT_FOUND',
        });
      }

      // Obtener audit logs de este campo
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          returnId: returnId,
          fieldKey: fieldKey,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Obtener extraction record original (si existe)
      const extractionRecord = await prisma.extractionRecord.findFirst({
        where: {
          returnId: returnId,
          fieldKey: fieldKey,
        },
      });

      res.json({
        field: fieldKey,
        originalExtraction: extractionRecord
          ? {
              value: extractionRecord.extractedValue,
              confidence: extractionRecord.confidence,
              documentId: extractionRecord.documentId,
              extractedAt: extractionRecord.createdAt,
            }
          : null,
        changes: auditLogs.map((log) => ({
          id: log.id,
          timestamp: log.createdAt,
          action: log.action,
          previousValue: log.previousValue,
          newValue: log.newValue,
          reason: log.reason,
          editedBy: log.user?.email || 'Unknown',
          taxImpact: log.metadata?.newTaxCalculation
            ? {
                taxesBefore: log.metadata?.previousTaxCalculation?.totalTaxes,
                taxesAfter: log.metadata?.newTaxCalculation?.totalTaxes,
                delta: log.metadata?.newTaxCalculation?.totalTaxes - log.metadata?.previousTaxCalculation?.totalTaxes,
              }
            : null,
        })),
        totalChanges: auditLogs.length,
      });
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      res.status(500).json({
        error: 'Error al obtener audit trail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// 3. PUT /api/returns/:returnId/fields/:fieldKey/override
// Override de valor extraído (para CPAs/Preparers)
// Similar a edit pero con "CPA override" flag
app.put(
  '/api/returns/:returnId/fields/:fieldKey/override',
  authenticateJWT,
  async (req, res) => {
    try {
      const { returnId, fieldKey } = req.params;
      const { overrideValue, overrideReason, requiresApproval } = req.body;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const tenantId = (req as any).user.tenantId;

      // Solo preparers/CPAs pueden hacer overrides
      if (userRole !== 'preparer' && userRole !== 'cpa' && userRole !== 'admin') {
        return res.status(403).json({
          error: 'Solo preparers/CPAs pueden hacer overrides',
          code: 'FORBIDDEN',
        });
      }

      // Validación
      if (!overrideValue && overrideValue !== 0) {
        return res.status(400).json({
          error: 'overrideValue es requerido',
          code: 'VALIDATION_ERROR',
        });
      }

      if (!overrideReason || overrideReason.trim().length === 0) {
        return res.status(400).json({
          error: 'overrideReason es requerido',
          code: 'VALIDATION_ERROR',
        });
      }

      // Fetch return
      const taxReturn = await prisma.taxReturn.findFirst({
        where: {
          id: returnId,
          tenantId: tenantId,
        },
        include: {
          extractedData: true,
        },
      });

      if (!taxReturn) {
        return res.status(404).json({
          error: 'Return no encontrado',
          code: 'NOT_FOUND',
        });
      }

      const previousValue = taxReturn.extractedData[fieldKey];

      // Actualizar datos
      const updatedData = {
        ...taxReturn.extractedData,
        [fieldKey]: overrideValue,
      };

      // Recalcular impuestos
      const calculator = new (require('@novasolutiontax/core').TaxCalculator)(updatedData);
      const newTaxCalculation = calculator.calculate();

      // Guardar
      const updated = await prisma.taxReturn.update({
        where: { id: returnId },
        data: {
          extractedData: updatedData,
          taxCalculation: newTaxCalculation,
          lastModifiedAt: new Date(),
          status: requiresApproval ? 'PENDING_APPROVAL' : 'EDITED',
        },
        include: {
          extractedData: true,
        },
      });

      // Crear audit log con flag de override
      await prisma.auditLog.create({
        data: {
          returnId: returnId,
          tenantId: tenantId,
          userId: userId,
          action: 'FIELD_OVERRIDDEN',
          fieldKey: fieldKey,
          previousValue: previousValue,
          newValue: overrideValue,
          reason: overrideReason,
          metadata: {
            overriddenBy: userRole,
            requiresApproval: requiresApproval,
            newTaxCalculation: newTaxCalculation,
          },
        },
      });

      res.json({
        success: true,
        override: {
          field: fieldKey,
          previousValue: previousValue,
          overrideValue: overrideValue,
          reason: overrideReason,
          overriddenBy: userRole,
          requiresApproval: requiresApproval,
        },
        updatedReturn: {
          ...updated,
          taxCalculation: newTaxCalculation,
        },
      });
    } catch (error) {
      console.error('Error overriding field:', error);
      res.status(500).json({
        error: 'Error al hacer override del campo',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ==========================================
// BONUS: GET /api/returns/:returnId/audit-trail (completo)
// Ver audit trail completo de un return
// ==========================================

app.get(
  '/api/returns/:returnId/audit-trail',
  authenticateJWT,
  async (req, res) => {
    try {
      const { returnId } = req.params;
      const tenantId = (req as any).user.tenantId;

      // Fetch return
      const taxReturn = await prisma.taxReturn.findFirst({
        where: {
          id: returnId,
          tenantId: tenantId,
        },
      });

      if (!taxReturn) {
        return res.status(404).json({
          error: 'Return no encontrado',
          code: 'NOT_FOUND',
        });
      }

      // Obtener todos los audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          returnId: returnId,
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Agrupar por tipo de acción
      const timeline = auditLogs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        action: log.action,
        field: log.fieldKey,
        previousValue: log.previousValue,
        newValue: log.newValue,
        reason: log.reason,
        user: log.user?.email,
        userRole: log.user?.role,
        metadata: log.metadata,
      }));

      // Estadísticas
      const stats = {
        totalChanges: auditLogs.length,
        changesByType: {
          fieldEdited: auditLogs.filter((l) => l.action === 'FIELD_EDITED').length,
          overridden: auditLogs.filter((l) => l.action === 'FIELD_OVERRIDDEN').length,
          extracted: auditLogs.filter((l) => l.action === 'FIELD_EXTRACTED').length,
        },
        lastModifiedAt: taxReturn.lastModifiedAt,
        createdAt: taxReturn.createdAt,
      };

      res.json({
        returnId: returnId,
        timeline: timeline,
        statistics: stats,
      });
    } catch (error) {
      console.error('Error fetching complete audit trail:', error);
      res.status(500).json({
        error: 'Error al obtener audit trail completo',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
