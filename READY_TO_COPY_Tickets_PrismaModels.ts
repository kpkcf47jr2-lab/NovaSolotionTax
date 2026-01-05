/**
 * Phase 9: Ticket System - Prisma Schema Models
 * File: apps/api/prisma/schema.prisma (ADD THESE MODELS)
 * 
 * Database models for ticket management and SLA tracking
 * Includes: Tickets, comments, attachments, escalations
 * Added to existing Prisma schema - integrate into current schema.prisma
 */

// ============================================================================
// TICKET MODEL (Main ticket entity)
// ============================================================================

model Ticket {
  id String @id @default(cuid())
  
  // Relationships
  tenantId String
  createdById String
  assignedToId String?
  returnId String? // Link to tax return (Phase 4)
  
  // Ticket content
  title String @db.VarChar(200)
  description String @db.Text
  
  // Classification
  priority String @db.Enum("low", "medium", "high", "critical") @default("medium")
  status String @db.Enum("open", "in_progress", "waiting_customer", "resolved", "closed") @default("open")
  category String @db.Enum("billing", "technical", "refund", "general", "escalation")
  source String @db.Enum("user", "ai_escalation", "system") @default("user")
  
  // SLA tracking
  slaResponseDue DateTime
  slaResolutionDue DateTime
  slaResponseBreach Boolean @default(false)
  slaResolutionBreach Boolean @default(false)
  respondedAt DateTime?
  resolvedAt DateTime?
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  closedAt DateTime?
  
  // Relations
  createdBy User @relation("TicketsCreated", fields: [createdById], references: [id])
  assignedTo User? @relation("TicketsAssigned", fields: [assignedToId], references: [id])
  tenant Tenant @relation("TenantTickets", fields: [tenantId], references: [id])
  
  comments TicketComment[]
  attachments TicketAttachment[]
  escalations TicketEscalation[]
  
  @@index([tenantId, status])
  @@index([priority, status])
  @@index([assignedToId])
  @@index([createdAt])
  @@index([slaResponseDue])
  @@index([slaResolutionDue])
}

// ============================================================================
// TICKET COMMENT MODEL
// ============================================================================

model TicketComment {
  id String @id @default(cuid())
  
  // Relationships
  ticketId String
  authorId String
  
  // Content
  content String @db.Text
  isInternal Boolean @default(false) // Only visible to support staff
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author User @relation("TicketCommentsCreated", fields: [authorId], references: [id])
  attachments TicketCommentAttachment[]
  
  @@index([ticketId, createdAt])
  @@index([authorId])
}

// ============================================================================
// TICKET ATTACHMENT MODEL
// ============================================================================

model TicketAttachment {
  id String @id @default(cuid())
  
  // Relationships
  ticketId String
  fileId String
  
  // Timestamps
  createdAt DateTime @default(now())
  
  // Relations
  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  @@index([ticketId])
}

// ============================================================================
// TICKET COMMENT ATTACHMENT MODEL
// ============================================================================

model TicketCommentAttachment {
  id String @id @default(cuid())
  
  // Relationships
  commentId String
  fileId String
  
  // Timestamps
  createdAt DateTime @default(now())
  
  // Relations
  comment TicketComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  
  @@index([commentId])
}

// ============================================================================
// TICKET ESCALATION MODEL (Link to AI escalations)
// ============================================================================

model TicketEscalation {
  id String @id @default(cuid())
  
  // Relationships
  ticketId String
  aiEscalationId String? // Link to Phase 8 AI escalation
  
  // Escalation details
  reason String
  priority String @db.Enum("urgent", "normal", "low") @default("normal")
  notes String? @db.Text
  
  // Resolution tracking
  resolved Boolean @default(false)
  resolution String? @db.Text
  resolvedAt DateTime?
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  @@index([ticketId, resolved])
}

// ============================================================================
// TICKET SLA METRIC MODEL (For analytics/reporting)
// ============================================================================

model TicketSLAMetric {
  id String @id @default(cuid())
  
  // Relationships
  tenantId String
  ticketId String
  
  // Metrics
  responseTime Int? // In minutes
  resolutionTime Int? // In minutes
  responseSLAMet Boolean
  resolutionSLAMet Boolean
  
  // Timestamps
  createdAt DateTime @default(now())
  
  // Relations
  tenant Tenant @relation("TenantTicketSLAMetrics", fields: [tenantId], references: [id])
  
  @@index([tenantId, createdAt])
}

// ============================================================================
// TICKET SATISFACTION SURVEY MODEL
// ============================================================================

model TicketSatisfaction {
  id String @id @default(cuid())
  
  // Relationships
  ticketId String
  userId String
  tenantId String
  
  // Survey data
  rating Int @db.SmallInt // 1-5 stars
  comment String? @db.Text
  wouldRecommend Boolean?
  
  // Timestamps
  createdAt DateTime @default(now())
  
  // Relations
  user User @relation("TicketSatisfaction", fields: [userId], references: [id])
  tenant Tenant @relation("TenantTicketSatisfaction", fields: [tenantId], references: [id])
  
  @@unique([ticketId, userId]) // One survey per user per ticket
  @@index([tenantId, createdAt])
}

// ============================================================================
// UPDATES TO EXISTING MODELS
// ============================================================================

// Add these fields to existing User model:
/*
model User {
  ...
  // Ticket relations
  ticketsCreated Ticket[] @relation("TicketsCreated")
  ticketsAssigned Ticket[] @relation("TicketsAssigned")
  ticketComments TicketComment[] @relation("TicketCommentsCreated")
  ticketSatisfaction TicketSatisfaction[] @relation("TicketSatisfaction")
}
*/

// Add these fields to existing Tenant model:
/*
model Tenant {
  ...
  // Ticket relations
  tickets Ticket[] @relation("TenantTickets")
  ticketSLAMetrics TicketSLAMetric[] @relation("TenantTicketSLAMetrics")
  ticketSatisfaction TicketSatisfaction[] @relation("TenantTicketSatisfaction")
}
*/

// ============================================================================
// DATABASE MIGRATION SQL
// ============================================================================

/*
CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "assignedToId" TEXT,
  "returnId" TEXT,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "category" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'user',
  "slaResponseDue" TIMESTAMP NOT NULL,
  "slaResolutionDue" TIMESTAMP NOT NULL,
  "slaResponseBreach" BOOLEAN NOT NULL DEFAULT FALSE,
  "slaResolutionBreach" BOOLEAN NOT NULL DEFAULT FALSE,
  "respondedAt" TIMESTAMP,
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  "closedAt" TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  FOREIGN KEY ("createdById") REFERENCES "User"("id"),
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
);

CREATE TABLE "TicketComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
);

CREATE TABLE "TicketAttachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE
);

CREATE TABLE "TicketCommentAttachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "commentId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("commentId") REFERENCES "TicketComment"("id") ON DELETE CASCADE
);

CREATE TABLE "TicketEscalation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "aiEscalationId" TEXT,
  "reason" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "notes" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE
);

CREATE TABLE "TicketSLAMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "responseTime" INTEGER,
  "resolutionTime" INTEGER,
  "responseSLAMet" BOOLEAN NOT NULL,
  "resolutionSLAMet" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE TABLE "TicketSatisfaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "rating" SMALLINT NOT NULL,
  "comment" TEXT,
  "wouldRecommend" BOOLEAN,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("ticketId", "userId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE INDEX "Ticket_tenantId_status_idx" ON "Ticket"("tenantId", "status");
CREATE INDEX "Ticket_priority_status_idx" ON "Ticket"("priority", "status");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "Ticket_slaResponseDue_idx" ON "Ticket"("slaResponseDue");
CREATE INDEX "Ticket_slaResolutionDue_idx" ON "Ticket"("slaResolutionDue");
CREATE INDEX "TicketComment_ticketId_createdAt_idx" ON "TicketComment"("ticketId", "createdAt");
CREATE INDEX "TicketComment_authorId_idx" ON "TicketComment"("authorId");
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");
CREATE INDEX "TicketCommentAttachment_commentId_idx" ON "TicketCommentAttachment"("commentId");
CREATE INDEX "TicketEscalation_ticketId_resolved_idx" ON "TicketEscalation"("ticketId", "resolved");
CREATE INDEX "TicketSLAMetric_tenantId_createdAt_idx" ON "TicketSLAMetric"("tenantId", "createdAt");
CREATE INDEX "TicketSatisfaction_tenantId_createdAt_idx" ON "TicketSatisfaction"("tenantId", "createdAt");
*/
