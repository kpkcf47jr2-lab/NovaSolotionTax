/**
 * Phase 8: AI + RAG + Chatbot - Prisma Schema Updates
 * File: apps/api/prisma/schema.prisma (ADD THESE MODELS)
 * 
 * Database models for AI/RAG/Chatbot functionality
 * Includes: Chat messages, feedback, embeddings, usage tracking
 * Added to existing Prisma schema - integrate into current schema.prisma
 */

// ============================================================================
// AI CHAT MESSAGES MODEL
// ============================================================================

model AiChatMessage {
  id String @id @default(cuid())
  
  // Relationships
  userId String
  tenantId String
  returnId String?
  
  // Message content
  role String @db.Enum("user", "assistant") // user | assistant
  content String @db.Text
  
  // Performance tracking
  tokens Int? // Token count for billing
  
  // RAG context metadata
  metadata Json? // Stores ragContext, escalationSuggestion
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user User @relation("AiChatMessages", fields: [userId], references: [id])
  tenant Tenant @relation("TenantAiChatMessages", fields: [tenantId], references: [id])
  feedbacks AiResponseFeedback[]
  
  @@index([userId, tenantId, createdAt])
  @@index([returnId])
}

// ============================================================================
// AI RESPONSE FEEDBACK MODEL
// ============================================================================

model AiResponseFeedback {
  id String @id @default(cuid())
  
  // Relationships
  messageId String
  userId String
  tenantId String
  
  // Feedback data
  helpful Boolean // Was response helpful?
  reason String? @db.Text // Why helpful/not helpful
  suggestion String? @db.Text // User suggestion for improvement
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  message AiChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user User @relation("AiResponseFeedback", fields: [userId], references: [id])
  tenant Tenant @relation("TenantAiResponseFeedback", fields: [tenantId], references: [id])
  
  @@unique([messageId, userId]) // One feedback per user per message
  @@index([userId, tenantId, createdAt])
}

// ============================================================================
// RAG EMBEDDINGS MODEL (Vector Store)
// ============================================================================

model RagEmbedding {
  id String @id @default(cuid())
  
  // Embedding data
  text String @db.Text
  embedding String @db.Text // JSON array as string: "[0.123, 0.456, ...]"
  
  // Metadata
  type String @db.Enum("faq", "guide", "error", "tip", "calculation")
  topic String // e.g., "Income", "Deductions", "Credits"
  source String? // Original source document
  
  // Multi-tenant support
  tenantId String?
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  tenant Tenant? @relation("TenantRagEmbeddings", fields: [tenantId], references: [id], onDelete: SetNull)
  
  @@index([topic, type])
  @@index([tenantId])
}

// ============================================================================
// AI USAGE TRACKING MODEL
// ============================================================================

model AiUsageMetric {
  id String @id @default(cuid())
  
  // Relationships
  userId String
  tenantId String
  
  // Usage metrics
  totalMessages Int @default(0)
  totalTokens Int @default(0)
  estimatedCost Decimal @default(0) // In USD
  totalFeedback Int @default(0)
  helpfulCount Int @default(0)
  
  // Period tracking
  period String @db.Enum("day", "week", "month", "year")
  periodStartDate DateTime
  periodEndDate DateTime
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user User @relation("AiUsageMetrics", fields: [userId], references: [id])
  tenant Tenant @relation("TenantAiUsageMetrics", fields: [tenantId], references: [id])
  
  @@unique([userId, tenantId, period, periodStartDate])
  @@index([tenantId, period])
}

// ============================================================================
// AI ESCALATION MODEL (Track AI->Ticket escalations)
// ============================================================================

model AiEscalation {
  id String @id @default(cuid())
  
  // Relationships
  userId String
  tenantId String
  ticketId String?
  chatMessageId String?
  
  // Escalation details
  reason String // Why escalated (e.g., "complex_tax_scenario")
  topic String? // Topic that triggered escalation
  description String? @db.Text
  
  // Resolution tracking
  resolved Boolean @default(false)
  resolution String? @db.Text
  
  // Timestamps
  createdAt DateTime @default(now())
  resolvedAt DateTime?
  updatedAt DateTime @updatedAt
  
  // Relations
  user User @relation("AiEscalations", fields: [userId], references: [id])
  tenant Tenant @relation("TenantAiEscalations", fields: [tenantId], references: [id])
  
  @@index([userId, tenantId, resolved])
}

// ============================================================================
// UPDATES TO EXISTING MODELS
// ============================================================================

// Add these fields to existing User model:
/*
model User {
  ...
  // AI Chat relations
  aiChatMessages AiChatMessage[] @relation("AiChatMessages")
  aiResponseFeedback AiResponseFeedback[] @relation("AiResponseFeedback")
  aiUsageMetrics AiUsageMetric[] @relation("AiUsageMetrics")
  aiEscalations AiEscalation[] @relation("AiEscalations")
}
*/

// Add these fields to existing Tenant model:
/*
model Tenant {
  ...
  // AI Chat relations
  aiChatMessages AiChatMessage[] @relation("TenantAiChatMessages")
  aiResponseFeedback AiResponseFeedback[] @relation("TenantAiResponseFeedback")
  ragEmbeddings RagEmbedding[] @relation("TenantRagEmbeddings")
  aiUsageMetrics AiUsageMetric[] @relation("TenantAiUsageMetrics")
  aiEscalations AiEscalation[] @relation("TenantAiEscalations")
}
*/

// ============================================================================
// DATABASE MIGRATION SQL
// ============================================================================

/*
CREATE TABLE "AiChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "returnId" TEXT,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokens" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE TABLE "AiResponseFeedback" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "helpful" BOOLEAN NOT NULL,
  "reason" TEXT,
  "suggestion" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("messageId", "userId"),
  FOREIGN KEY ("messageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE TABLE "RagEmbedding" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "embedding" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "source" TEXT,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL
);

CREATE TABLE "AiUsageMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(10, 4) NOT NULL DEFAULT 0,
  "totalFeedback" INTEGER NOT NULL DEFAULT 0,
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "period" TEXT NOT NULL,
  "periodStartDate" TIMESTAMP NOT NULL,
  "periodEndDate" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("userId", "tenantId", "period", "periodStartDate"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE TABLE "AiEscalation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT,
  "chatMessageId" TEXT,
  "reason" TEXT NOT NULL,
  "topic" TEXT,
  "description" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
  "resolution" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE INDEX "AiChatMessage_userId_tenantId_createdAt_idx" ON "AiChatMessage"("userId", "tenantId", "createdAt");
CREATE INDEX "AiChatMessage_returnId_idx" ON "AiChatMessage"("returnId");
CREATE INDEX "AiResponseFeedback_userId_tenantId_createdAt_idx" ON "AiResponseFeedback"("userId", "tenantId", "createdAt");
CREATE INDEX "RagEmbedding_topic_type_idx" ON "RagEmbedding"("topic", "type");
CREATE INDEX "RagEmbedding_tenantId_idx" ON "RagEmbedding"("tenantId");
CREATE INDEX "AiUsageMetric_tenantId_period_idx" ON "AiUsageMetric"("tenantId", "period");
CREATE INDEX "AiEscalation_userId_tenantId_resolved_idx" ON "AiEscalation"("userId", "tenantId", "resolved");
*/
