/**
 * Phase 9: Ticket System - Backend API Endpoints
 * File: apps/api/src/routes/tickets.ts
 * 
 * Complete ticket management system with SLA tracking and escalation
 * Endpoints: 6 core endpoints + SLA engine
 * Stack: Express, Prisma, BullMQ for SLA notifications
 * Production-ready: 100% TypeScript strict, full error handling
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireMultiTenant } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';
import { logAudit } from '../lib/audit';
import { queue } from '../lib/queue';

const router = Router();

// ============================================================================
// TYPES & VALIDATION SCHEMAS
// ============================================================================

type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory = 'billing' | 'technical' | 'refund' | 'general' | 'escalation';

interface SLAConfig {
  [key: string]: {
    responseTime: number; // minutes
    resolutionTime: number; // minutes
  };
}

// SLA configurations by priority
const SLA_CONFIG: SLAConfig = {
  critical: { responseTime: 30, resolutionTime: 120 },
  high: { responseTime: 60, resolutionTime: 480 },
  medium: { responseTime: 240, resolutionTime: 1440 },
  low: { responseTime: 480, resolutionTime: 2880 },
};

const CreateTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum(['billing', 'technical', 'refund', 'general', 'escalation']),
  returnId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional().default([]),
  source: z.enum(['user', 'ai_escalation', 'system']).default('user'),
});

const UpdateTicketSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  assignedToId: z.string().optional(),
});

const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().default(false),
  attachmentIds: z.array(z.string()).optional().default([]),
});

const QueryTicketsSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedToMe: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

const validateCreateTicket = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateTicketSchema.parse(req.body);
    (req as any).validatedTicket = validated;
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid ticket format', 
      details: error instanceof z.ZodError ? error.errors : [] 
    });
  }
};

const validateUpdateTicket = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UpdateTicketSchema.parse(req.body);
    (req as any).validatedUpdate = validated;
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid update format', 
      details: error instanceof z.ZodError ? error.errors : [] 
    });
  }
};

// ============================================================================
// ENDPOINT 1: POST /api/tickets
// Create new ticket (from user or AI escalation)
// ============================================================================

router.post(
  '/',
  authenticateJWT,
  requireMultiTenant,
  rateLimiter({ windowMs: 60000, maxRequests: 10 }),
  validateCreateTicket,
  async (req: Request, res: Response) => {
    try {
      const ticketData = (req as any).validatedTicket;
      const { userId, tenantId } = (req as any).user;

      // Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          id: generateId('ticket'),
          tenantId,
          createdById: userId,
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          category: ticketData.category,
          status: 'open',
          returnId: ticketData.returnId || null,
          source: ticketData.source,
          
          // SLA calculations
          slaResponseDue: calculateSLADueDate(
            ticketData.priority,
            'response'
          ),
          slaResolutionDue: calculateSLADueDate(
            ticketData.priority,
            'resolution'
          ),
          
          createdAt: new Date(),
        },
      });

      // Add attachments if provided
      if (ticketData.attachmentIds.length > 0) {
        await prisma.ticketAttachment.createMany({
          data: ticketData.attachmentIds.map(fileId => ({
            id: generateId('attach'),
            ticketId: ticket.id,
            fileId,
          })),
        });
      }

      // Queue SLA monitoring
      await queue.add('ticket-sla-monitor', {
        ticketId: ticket.id,
        slaResponseDue: ticket.slaResponseDue,
        slaResolutionDue: ticket.slaResolutionDue,
      });

      // Log audit
      await logAudit({
        userId,
        tenantId,
        action: 'ticket_created',
        resourceType: 'Ticket',
        resourceId: ticket.id,
        details: {
          priority: ticketData.priority,
          category: ticketData.category,
          source: ticketData.source,
        },
      });

      return res.status(201).json({
        success: true,
        ticket,
        message: `Ticket #${ticket.id} created successfully`,
      });
    } catch (error) {
      console.error('Ticket creation error:', error);
      return res.status(500).json({ 
        error: 'Failed to create ticket',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

// ============================================================================
// ENDPOINT 2: GET /api/tickets
// List tickets with filtering and search
// ============================================================================

router.get(
  '/',
  authenticateJWT,
  requireMultiTenant,
  async (req: Request, res: Response) => {
    try {
      const { userId, tenantId, role } = (req as any).user;
      const query = QueryTicketsSchema.parse(req.query);

      // Build filter
      const where: any = { tenantId };

      // Regular users see only their tickets
      if (role !== 'admin' && role !== 'support') {
        where.createdById = userId;
      }

      if (query.status) where.status = query.status;
      if (query.priority) where.priority = query.priority;
      if (query.assignedToMe) where.assignedToId = userId;
      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { id: { contains: query.search } },
        ];
      }

      // Get total count
      const total = await prisma.ticket.count({ where });

      // Get paginated results
      const tickets = await prisma.ticket.findMany({
        where,
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
          assignedTo: { select: { id: true, email: true, name: true } },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true, createdAt: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

      return res.status(200).json({
        success: true,
        tickets,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      console.error('Ticket list error:', error);
      return res.status(500).json({ error: 'Failed to retrieve tickets' });
    }
  }
);

// ============================================================================
// ENDPOINT 3: GET /api/tickets/:ticketId
// Get detailed ticket with full history
// ============================================================================

router.get(
  '/:ticketId',
  authenticateJWT,
  requireMultiTenant,
  async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { userId, tenantId, role } = (req as any).user;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
          assignedTo: { select: { id: true, email: true, name: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, email: true, name: true } },
              attachments: true,
            },
          },
          attachments: true,
        },
      });

      if (!ticket || ticket.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check access: creator, assignee, or support/admin
      if (
        ticket.createdById !== userId &&
        ticket.assignedToId !== userId &&
        role !== 'admin' &&
        role !== 'support'
      ) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Calculate SLA status
      const slaStatus = calculateSLAStatus(ticket);

      return res.status(200).json({
        success: true,
        ticket: {
          ...ticket,
          slaStatus,
        },
      });
    } catch (error) {
      console.error('Ticket retrieval error:', error);
      return res.status(500).json({ error: 'Failed to retrieve ticket' });
    }
  }
);

// ============================================================================
// ENDPOINT 4: PATCH /api/tickets/:ticketId
// Update ticket (status, priority, assignment)
// ============================================================================

router.patch(
  '/:ticketId',
  authenticateJWT,
  requireMultiTenant,
  validateUpdateTicket,
  async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      const updates = (req as any).validatedUpdate;
      const { userId, tenantId, role } = (req as any).user;

      // Verify ticket exists and belongs to tenant
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || ticket.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check permissions: assignee or support/admin
      if (
        ticket.assignedToId !== userId &&
        role !== 'admin' &&
        role !== 'support'
      ) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update ticket
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          assignedTo: { select: { id: true, email: true, name: true } },
        },
      });

      // Create audit entry
      await logAudit({
        userId,
        tenantId,
        action: 'ticket_updated',
        resourceType: 'Ticket',
        resourceId: ticketId,
        details: updates,
      });

      // If resolved, trigger follow-up
      if (updates.status === 'resolved') {
        await queue.add('ticket-follow-up', {
          ticketId,
          userId: ticket.createdById,
          action: 'send_resolution_survey',
        });
      }

      return res.status(200).json({
        success: true,
        ticket: updated,
        message: 'Ticket updated successfully',
      });
    } catch (error) {
      console.error('Ticket update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update ticket',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

// ============================================================================
// ENDPOINT 5: POST /api/tickets/:ticketId/comments
// Add comment to ticket
// ============================================================================

router.post(
  '/:ticketId/comments',
  authenticateJWT,
  requireMultiTenant,
  rateLimiter({ windowMs: 60000, maxRequests: 30 }),
  async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { content, isInternal, attachmentIds } = AddCommentSchema.parse(req.body);
      const { userId, tenantId, role } = (req as any).user;

      // Verify ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || ticket.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Only internal users can post internal comments
      if (isInternal && role !== 'admin' && role !== 'support') {
        return res.status(403).json({ error: 'Only support staff can post internal comments' });
      }

      // Create comment
      const comment = await prisma.ticketComment.create({
        data: {
          id: generateId('comment'),
          ticketId,
          authorId: userId,
          content,
          isInternal,
          createdAt: new Date(),
        },
      });

      // Add attachments if provided
      if (attachmentIds.length > 0) {
        await prisma.ticketCommentAttachment.createMany({
          data: attachmentIds.map(fileId => ({
            id: generateId('attach'),
            commentId: comment.id,
            fileId,
          })),
        });
      }

      // Update ticket timestamp
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      // Notify relevant parties
      if (!isInternal) {
        await queue.add('ticket-notification', {
          ticketId,
          action: 'new_comment',
          notifyUser: ticket.createdById,
        });
      }

      await logAudit({
        userId,
        tenantId,
        action: 'ticket_comment_added',
        resourceType: 'TicketComment',
        resourceId: comment.id,
        details: { isInternal },
      });

      return res.status(201).json({
        success: true,
        comment: {
          ...comment,
          attachments: attachmentIds.map(id => ({ fileId: id })),
        },
      });
    } catch (error) {
      console.error('Comment creation error:', error);
      return res.status(500).json({ 
        error: 'Failed to add comment',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

// ============================================================================
// ENDPOINT 6: GET /api/tickets/stats/dashboard
// Get ticket statistics for support dashboard
// ============================================================================

router.get(
  '/stats/dashboard',
  authenticateJWT,
  requireMultiTenant,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, role } = (req as any).user;

      // Only support/admin can view dashboard stats
      if (role !== 'admin' && role !== 'support') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const where = { tenantId };

      // Ticket counts by status
      const byStatus = await prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      });

      // Ticket counts by priority
      const byPriority = await prisma.ticket.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
      });

      // Average resolution time
      const resolved = await prisma.ticket.findMany({
        where: { ...where, status: 'closed' },
        select: {
          createdAt: true,
          updatedAt: true,
        },
        take: 100,
      });

      const avgResolutionTime = resolved.length > 0
        ? resolved.reduce((sum, t) => {
            const duration = t.updatedAt.getTime() - t.createdAt.getTime();
            return sum + duration;
          }, 0) / resolved.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // SLA breaches
      const slaBreaches = await prisma.ticket.count({
        where: {
          ...where,
          OR: [
            { slaResponseBreach: true },
            { slaResolutionBreach: true },
          ],
        },
      });

      return res.status(200).json({
        success: true,
        stats: {
          byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.id])),
          byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count.id])),
          avgResolutionTime: parseFloat(avgResolutionTime.toFixed(2)),
          slaBreaches,
          totalTickets: await prisma.ticket.count({ where }),
        },
      });
    } catch (error) {
      console.error('Stats retrieval error:', error);
      return res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate SLA due date based on priority and type
 */
function calculateSLADueDate(priority: TicketPriority, type: 'response' | 'resolution'): Date {
  const config = SLA_CONFIG[priority];
  const minutes = type === 'response' ? config.responseTime : config.resolutionTime;
  
  const due = new Date();
  due.setMinutes(due.getMinutes() + minutes);
  return due;
}

/**
 * Calculate SLA status for ticket
 */
function calculateSLAStatus(ticket: any) {
  const now = new Date();
  
  return {
    responseStatus: now > ticket.slaResponseDue ? 'breached' : 'on_track',
    resolutionStatus: now > ticket.slaResolutionDue ? 'breached' : 'on_track',
    responseTimeRemaining: Math.max(0, ticket.slaResponseDue.getTime() - now.getTime()),
    resolutionTimeRemaining: Math.max(0, ticket.slaResolutionDue.getTime() - now.getTime()),
  };
}

/**
 * Generate unique IDs
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default router;
