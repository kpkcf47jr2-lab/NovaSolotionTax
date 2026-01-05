/**
 * PHASE 4: PREPARER WORKFLOW API ENDPOINTS
 * =========================================
 * 5 endpoints for preparer queue management, assignment, approval, rejection, and metrics
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add these endpoints to apps/api/src/index.ts BEFORE app.listen()
 * 2. Import: import { prisma } from '@novasolutiontax/db';
 * 3. Import: import { TaxCalculator } from '@novasolutiontax/core';
 * 4. Testing: Use curl or Postman with Bearer token in Authorization header
 * 
 * READY_TO_COPY: Just paste into index.ts - no modifications needed
 * =========================================================================
 */

// ============================================================================
// ENDPOINT 1: GET /api/preparers/:preparerId/queue
// ============================================================================
// Purpose: Get all returns assigned to preparer + unassigned returns in queue
// Returns: paginated list of returns with status, field count, extraction quality
// Use: Populate PrepareQueuePage
// 
// Response:
// {
//   "total": 45,
//   "assigned": 32,
//   "unassigned": 13,
//   "page": 1,
//   "limit": 20,
//   "returns": [
//     {
//       "id": "return-123",
//       "clientName": "John Doe",
//       "taxYear": 2024,
//       "status": "PENDING_REVIEW",
//       "assignedTo": "prep-456",
//       "extractedFields": 18,
//       "totalFields": 25,
//       "extractionConfidence": 0.92,
//       "createdAt": "2025-12-15T10:30:00Z",
//       "dueDate": "2026-04-15T23:59:59Z",
//       "daysUntilDue": 102,
//       "priority": "NORMAL"
//     }
//   ]
// }

app.get('/api/preparers/:preparerId/queue', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { preparerId } = req.params;
    const { page = 1, limit = 20, status, priority } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Verify preparer is in the same tenant
    const preparer = await prisma.user.findUnique({
      where: { id: preparerId },
      include: { organization: true }
    });

    if (!preparer || preparer.organization.id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['preparer', 'cpa', 'admin'].includes(preparer.role)) {
      return res.status(400).json({ error: 'User is not a preparer' });
    }

    // Build query filter
    const filters: any = { organizationId: req.tenantId };
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    // Get assigned returns
    const assigned = await prisma.taxReturn.findMany({
      where: { ...filters, assignedToPreparer: preparerId },
      include: {
        extractedFields: true,
        auditLogs: { take: 1, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { dueDate: 'asc' },
      skip,
      take: limitNum
    });

    // Get unassigned returns (only if preparer is CPA or admin)
    let unassigned = [];
    if (['cpa', 'admin'].includes(preparer.role)) {
      unassigned = await prisma.taxReturn.findMany({
        where: { ...filters, assignedToPreparer: null, status: 'PENDING_REVIEW' },
        include: { extractedFields: true },
        orderBy: { createdAt: 'asc' },
        take: 10 // Show top 10 unassigned
      });
    }

    // Get total counts
    const total = await prisma.taxReturn.count({ where: filters });
    const assignedCount = await prisma.taxReturn.count({
      where: { ...filters, assignedToPreparer: preparerId }
    });
    const unassignedCount = await prisma.taxReturn.count({
      where: { ...filters, assignedToPreparer: null, status: 'PENDING_REVIEW' }
    });

    // Calculate extraction confidence average
    const calculateConfidence = (fields: any[]) => {
      if (fields.length === 0) return 1;
      const sum = fields.reduce((acc, f) => acc + (f.extractionConfidence || 0.5), 0);
      return Math.round((sum / fields.length) * 100) / 100;
    };

    const formattedReturns = assigned.map((ret: any) => ({
      id: ret.id,
      clientName: ret.clientName,
      taxYear: ret.taxYear,
      status: ret.status,
      assignedTo: ret.assignedToPreparer,
      extractedFields: ret.extractedFields.length,
      totalFields: Object.keys(ret.data || {}).length,
      extractionConfidence: calculateConfidence(ret.extractedFields),
      createdAt: ret.createdAt,
      dueDate: ret.dueDate,
      daysUntilDue: Math.ceil((ret.dueDate - new Date()) / (1000 * 60 * 60 * 24)),
      priority: ret.priority || 'NORMAL',
      lastModified: ret.auditLogs[0]?.createdAt || ret.createdAt
    }));

    res.json({
      total,
      assigned: assignedCount,
      unassigned: unassignedCount,
      page: pageNum,
      limit: limitNum,
      returns: formattedReturns,
      unassignedReturns: unassigned.length > 0 ? unassigned.map(r => ({
        id: r.id,
        clientName: r.clientName,
        taxYear: r.taxYear,
        createdAt: r.createdAt,
        priority: r.priority || 'NORMAL'
      })) : []
    });
  } catch (error: any) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 2: POST /api/preparers/:preparerId/assign
// ============================================================================
// Purpose: Assign an unassigned return to this preparer
// Requires: CPA or Admin role
// Body: { returnId: string }
// Returns: Updated return with assignment details
// Use: Assign returns from unassigned queue to self

app.post('/api/preparers/:preparerId/assign', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { preparerId } = req.params;
    const { returnId } = req.body;

    if (!returnId) {
      return res.status(400).json({ error: 'returnId is required' });
    }

    // Verify preparer is CPA or Admin
    const preparer = await prisma.user.findUnique({
      where: { id: preparerId }
    });

    if (!preparer || preparer.organizationId !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['cpa', 'admin'].includes(preparer.role)) {
      return res.status(400).json({ error: 'Only CPAs/Admins can assign returns' });
    }

    // Fetch return and verify it's not already assigned
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: { extractedFields: true, auditLogs: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    if (!taxReturn || taxReturn.organizationId !== req.tenantId) {
      return res.status(404).json({ error: 'Return not found' });
    }

    if (taxReturn.assignedToPreparer) {
      return res.status(400).json({ error: 'Return is already assigned' });
    }

    // Assign return
    const updatedReturn = await prisma.taxReturn.update({
      where: { id: returnId },
      data: {
        assignedToPreparer: preparerId,
        status: 'IN_PROGRESS',
        assignedAt: new Date(),
        metadata: {
          ...taxReturn.metadata,
          assignmentNotes: `Assigned to ${preparer.name} on ${new Date().toISOString()}`
        }
      }
    });

    // Log assignment in audit trail
    await prisma.auditLog.create({
      data: {
        returnId,
        userId: req.userId,
        action: 'RETURN_ASSIGNED',
        reason: `Assigned to preparer ${preparerId}`,
        metadata: {
          previousAssignee: null,
          newAssignee: preparerId,
          preparer: preparer.name
        },
        organizationId: req.tenantId
      }
    });

    res.json({
      id: updatedReturn.id,
      clientName: updatedReturn.clientName,
      taxYear: updatedReturn.taxYear,
      status: updatedReturn.status,
      assignedTo: updatedReturn.assignedToPreparer,
      assignedAt: updatedReturn.assignedAt,
      extractedFields: taxReturn.extractedFields.length,
      message: `Return assigned successfully to ${preparer.name}`
    });
  } catch (error: any) {
    console.error('Error assigning return:', error);
    res.status(500).json({ error: 'Failed to assign return', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 3: GET /api/returns/:returnId/workflow-status
// ============================================================================
// Purpose: Get complete workflow status for a return (assigned to logged-in user)
// Returns: Current status, completion %, next steps, approval status
// Use: Populate WorkflowCard component
//
// Response:
// {
//   "id": "return-123",
//   "status": "IN_PROGRESS",
//   "completionPercent": 75,
//   "clientName": "John Doe",
//   "assignedTo": "prep-456",
//   "steps": [
//     { "step": "EXTRACTION", "status": "COMPLETED", "timestamp": "2025-12-15T10:30:00Z" },
//     { "step": "REVIEW", "status": "IN_PROGRESS", "timestamp": "2025-12-16T09:00:00Z" },
//     { "step": "APPROVAL", "status": "PENDING", "timestamp": null }
//   ],
//   "fieldChanges": 12,
//   "fieldsReviewed": 18,
//   "pendingApproval": false,
//   "approvedBy": null,
//   "rejectionReason": null
// }

app.get('/api/returns/:returnId/workflow-status', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { returnId } = req.params;

    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId },
      include: {
        extractedFields: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 3 }
      }
    });

    if (!taxReturn || taxReturn.organizationId !== req.tenantId) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Verify access: only assigned preparer, CPA, or admin can view
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (
      taxReturn.assignedToPreparer !== req.userId &&
      !['cpa', 'admin'].includes(user?.role || '')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate workflow steps
    const steps = [];
    const extractionLog = taxReturn.auditLogs.find(l => l.action === 'DOCUMENT_EXTRACTED');
    const reviewLog = taxReturn.auditLogs.find(l => l.action === 'FIELD_EDITED' || l.action === 'FIELD_OVERRIDDEN');
    const approvalLog = taxReturn.approvals[0];

    steps.push({
      step: 'EXTRACTION',
      status: extractionLog ? 'COMPLETED' : 'PENDING',
      timestamp: extractionLog?.createdAt || null
    });

    steps.push({
      step: 'REVIEW',
      status: taxReturn.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'COMPLETED',
      timestamp: reviewLog?.createdAt || null
    });

    steps.push({
      step: 'APPROVAL',
      status: approvalLog ? (approvalLog.status === 'APPROVED' ? 'COMPLETED' : 'REJECTED') : 'PENDING',
      timestamp: approvalLog?.createdAt || null
    });

    // Count field changes
    const fieldChanges = taxReturn.auditLogs.filter(
      l => l.action === 'FIELD_EDITED' || l.action === 'FIELD_OVERRIDDEN'
    ).length;

    const fieldsReviewed = taxReturn.extractedFields.filter(f => f.confidence > 0.5).length;
    const completionPercent = Math.round((fieldsReviewed / (taxReturn.extractedFields.length || 1)) * 100);

    res.json({
      id: taxReturn.id,
      status: taxReturn.status,
      completionPercent,
      clientName: taxReturn.clientName,
      taxYear: taxReturn.taxYear,
      assignedTo: taxReturn.assignedToPreparer,
      steps,
      fieldChanges,
      fieldsReviewed,
      totalFields: taxReturn.extractedFields.length,
      pendingApproval: taxReturn.status === 'PENDING_APPROVAL',
      approvedBy: approvalLog?.userId || null,
      approvalStatus: approvalLog?.status || null,
      rejectionReason: approvalLog?.rejectionReason || null,
      dueDate: taxReturn.dueDate,
      daysRemaining: Math.ceil((taxReturn.dueDate - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (error: any) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({ error: 'Failed to fetch workflow status', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 4: PUT /api/returns/:returnId/approve
// ============================================================================
// Purpose: Approve a return (mark as COMPLETED + create approval record)
// Requires: CPA or Admin role
// Body: { comments?: string }
// Returns: Updated return with approval details
// Use: Complete return after review
//
// Response:
// {
//   "id": "return-123",
//   "status": "COMPLETED",
//   "approvedAt": "2025-12-20T14:30:00Z",
//   "approvedBy": "user-789",
//   "message": "Return approved successfully"
// }

app.put('/api/returns/:returnId/approve', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { returnId } = req.params;
    const { comments } = req.body;

    // Verify user is CPA or Admin
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!['cpa', 'admin'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Only CPAs/Admins can approve returns' });
    }

    // Fetch return
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId }
    });

    if (!taxReturn || taxReturn.organizationId !== req.tenantId) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Create approval record
    const approval = await prisma.approval.create({
      data: {
        returnId,
        userId: req.userId,
        status: 'APPROVED',
        comments: comments || '',
        approvedAt: new Date(),
        organizationId: req.tenantId
      }
    });

    // Update return status
    const updatedReturn = await prisma.taxReturn.update({
      where: { id: returnId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Log approval
    await prisma.auditLog.create({
      data: {
        returnId,
        userId: req.userId,
        action: 'RETURN_APPROVED',
        reason: 'Return approved by CPA',
        metadata: {
          approvalId: approval.id,
          comments: comments || '',
          approver: user?.name
        },
        organizationId: req.tenantId
      }
    });

    res.json({
      id: updatedReturn.id,
      status: updatedReturn.status,
      approvedAt: approval.approvedAt,
      approvedBy: req.userId,
      message: 'Return approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving return:', error);
    res.status(500).json({ error: 'Failed to approve return', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 5: PUT /api/returns/:returnId/reject
// ============================================================================
// Purpose: Reject a return (send back for more work)
// Requires: CPA or Admin role
// Body: { rejectionReason: string (required) }
// Returns: Updated return with rejection details
// Use: Reject return if issues found
//
// Response:
// {
//   "id": "return-123",
//   "status": "REJECTED",
//   "rejectedAt": "2025-12-20T14:30:00Z",
//   "rejectedBy": "user-789",
//   "reason": "Missing W-2 information for spouse",
//   "message": "Return rejected and sent back for revision"
// }

app.put('/api/returns/:returnId/reject', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { returnId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ error: 'rejectionReason is required' });
    }

    // Verify user is CPA or Admin
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!['cpa', 'admin'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Only CPAs/Admins can reject returns' });
    }

    // Fetch return
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id: returnId }
    });

    if (!taxReturn || taxReturn.organizationId !== req.tenantId) {
      return res.status(404).json({ error: 'Return not found' });
    }

    // Create rejection record
    const approval = await prisma.approval.create({
      data: {
        returnId,
        userId: req.userId,
        status: 'REJECTED',
        rejectionReason,
        approvedAt: new Date(),
        organizationId: req.tenantId
      }
    });

    // Update return status back to IN_PROGRESS
    const updatedReturn = await prisma.taxReturn.update({
      where: { id: returnId },
      data: {
        status: 'IN_PROGRESS',
        metadata: {
          ...taxReturn.metadata,
          rejectionReason,
          rejectedBy: req.userId,
          rejectedAt: new Date()
        }
      }
    });

    // Log rejection
    await prisma.auditLog.create({
      data: {
        returnId,
        userId: req.userId,
        action: 'RETURN_REJECTED',
        reason: rejectionReason,
        metadata: {
          rejectionId: approval.id,
          rejector: user?.name
        },
        organizationId: req.tenantId
      }
    });

    res.json({
      id: updatedReturn.id,
      status: updatedReturn.status,
      rejectedAt: new Date(),
      rejectedBy: req.userId,
      reason: rejectionReason,
      message: 'Return rejected and sent back for revision'
    });
  } catch (error: any) {
    console.error('Error rejecting return:', error);
    res.status(500).json({ error: 'Failed to reject return', details: error.message });
  }
});

// ============================================================================
// ENDPOINT 6: GET /api/preparers/:preparerId/metrics
// ============================================================================
// Purpose: Get metrics dashboard for preparer (completion rate, avg time, quality)
// Returns: KPIs for metrics dashboard
// Use: Populate MetricsDashboard component
//
// Response:
// {
//   "totalReturns": 150,
//   "completedReturns": 120,
//   "completionRate": 0.80,
//   "averageReviewTime": 2.5,
//   "averageFieldsPerReturn": 22,
//   "averageConfidence": 0.87,
//   "rejectionRate": 0.05,
//   "approvalRate": 0.95,
//   "thisMonth": { ... }
// }

app.get('/api/preparers/:preparerId/metrics', verifyJWT, verifyMultiTenant, async (req: Request, res: Response) => {
  try {
    const { preparerId } = req.params;

    // Verify user is viewing their own metrics or is CPA/Admin
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (preparerId !== req.userId && !['cpa', 'admin'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const preparer = await prisma.user.findUnique({
      where: { id: preparerId }
    });

    if (!preparer || preparer.organizationId !== req.tenantId) {
      return res.status(404).json({ error: 'Preparer not found' });
    }

    // Get all returns for this preparer
    const allReturns = await prisma.taxReturn.findMany({
      where: {
        organizationId: req.tenantId,
        assignedToPreparer: preparerId
      },
      include: {
        extractedFields: true,
        auditLogs: true,
        approvals: true
      }
    });

    const completedReturns = allReturns.filter(r => r.status === 'COMPLETED');
    const rejectedReturns = allReturns.filter(r => r.status === 'REJECTED');
    const approvedReturns = allReturns.filter(r => r.approvals.some(a => a.status === 'APPROVED'));

    // Calculate metrics
    const totalReturns = allReturns.length;
    const completionRate = totalReturns > 0 ? completedReturns.length / totalReturns : 0;
    const rejectionRate = totalReturns > 0 ? rejectedReturns.length / totalReturns : 0;
    const approvalRate = totalReturns > 0 ? approvedReturns.length / totalReturns : 0;

    const averageFieldsPerReturn = totalReturns > 0
      ? Math.round(allReturns.reduce((sum, r) => sum + r.extractedFields.length, 0) / totalReturns)
      : 0;

    const averageConfidence = totalReturns > 0
      ? Math.round(
          allReturns.reduce(
            (sum, r) => sum + (r.extractedFields.length > 0
              ? r.extractedFields.reduce((s, f) => s + (f.confidence || 0.5), 0) / r.extractedFields.length
              : 0.5),
            0
          ) / totalReturns * 100
        ) / 100
      : 0;

    const averageReviewTime = completedReturns.length > 0
      ? Math.round(
          completedReturns.reduce((sum, r) => {
            const startTime = r.extractedAt || r.createdAt;
            const endTime = r.completedAt || new Date();
            return sum + (endTime - startTime) / (1000 * 60 * 60 * 24);
          }, 0) / completedReturns.length * 10
        ) / 10
      : 0;

    // This month metrics
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthReturns = allReturns.filter(r => r.createdAt >= thisMonthStart);
    const thisMonthCompleted = thisMonthReturns.filter(r => r.status === 'COMPLETED').length;

    res.json({
      totalReturns,
      completedReturns: completedReturns.length,
      completionRate: Math.round(completionRate * 100) / 100,
      inProgressReturns: allReturns.filter(r => r.status === 'IN_PROGRESS').length,
      pendingApprovalReturns: allReturns.filter(r => r.status === 'PENDING_APPROVAL').length,
      averageReviewTime: `${averageReviewTime} days`,
      averageFieldsPerReturn,
      averageConfidence,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      approvalRate: Math.round(approvalRate * 100) / 100,
      thisMonth: {
        total: thisMonthReturns.length,
        completed: thisMonthCompleted,
        inProgress: thisMonthReturns.filter(r => r.status === 'IN_PROGRESS').length
      }
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// ============================================================================
// HELPER: Approval Model Migration (Add to Prisma schema if not exists)
// ============================================================================
// model Approval {
//   id                  String    @id @default(cuid())
//   returnId            String
//   return              TaxReturn @relation(fields: [returnId], references: [id], onDelete: Cascade)
//   userId              String
//   user                User      @relation(fields: [userId], references: [id])
//   status              String    // APPROVED, REJECTED, PENDING
//   comments            String?
//   rejectionReason     String?
//   approvedAt          DateTime  @default(now())
//   organizationId      String
//   organization        Organization @relation(fields: [organizationId], references: [id])
//   createdAt           DateTime  @default(now())
//   updatedAt           DateTime  @updatedAt
//
//   @@index([returnId])
//   @@index([userId])
//   @@index([organizationId])
// }
