/**
 * Phase 11: Analytics Dashboard - Prisma Database Models
 * File: prisma/schema.prisma (additional models)
 * 
 * Event tracking and analytics aggregation models
 * Production-ready: Full schema with migrations and indexes
 */

// ============================================================================
// ANALYTICS EVENT MODEL
// ============================================================================

/**
 * AnalyticsEvent - Core event tracking table
 * Stores all user actions and system events
 */
model AnalyticsEvent {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  userId                  String
  user                    User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Event details
  eventType               String                    // tax_return_created, user_login, payment_completed, etc.
  metadata                Json?                     // Flexible data storage
  
  // Tracking
  timestamp               DateTime                  @default(now())
  sessionId               String?                   // Link to user session
  
  createdAt               DateTime                  @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([eventType])
  @@index([timestamp])
  @@index([tenantId, timestamp])
}

// ============================================================================
// EVENT SUMMARY MODEL
// ============================================================================

/**
 * EventSummary - Pre-aggregated event counts by day
 * Used for fast metric calculations and trending
 */
model EventSummary {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  eventType               String
  date                    DateTime                  // Day (00:00:00)
  
  // Aggregated counts
  count                   Int                       @default(0)

  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@unique([tenantId, eventType, date])
  @@index([tenantId])
  @@index([date])
}

// ============================================================================
// USER SESSION MODEL
// ============================================================================

/**
 * UserSession - Session tracking for analytics
 * Tracks user sessions and time spent
 */
model UserSession {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  userId                  String
  user                    User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Session details
  sessionId               String                    @unique
  ipAddress               String?
  userAgent               String?
  
  // Timing
  startedAt               DateTime                  @default(now())
  endedAt                 DateTime?
  
  // Engagement
  pageViews               Int                       @default(0)
  eventCount              Int                       @default(0)
  lastActivityAt          DateTime                  @default(now())

  // Exit reason
  exitReason              String?                   // natural, timeout, error, logout

  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@index([tenantId])
  @@index([userId])
  @@index([startedAt])
}

// ============================================================================
// PAGE VIEW MODEL
// ============================================================================

/**
 * PageView - Track page visits for funnel analysis
 * Used for understanding user journey and drop-off points
 */
model PageView {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  userId                  String
  user                    User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Page details
  path                    String                    // /app/returns, /settings/billing, etc.
  title                   String?
  referrer                String?
  
  // Session link
  sessionId               String?
  
  // Timing
  enteredAt               DateTime                  @default(now())
  exitedAt                DateTime?
  timeSpent               Int?                      // seconds

  createdAt               DateTime                  @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([path])
  @@index([enteredAt])
}

// ============================================================================
// FEATURE USAGE MODEL
// ============================================================================

/**
 * FeatureUsage - Track specific feature usage for product insights
 * Helps identify popular features and unused ones
 */
model FeatureUsage {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  userId                  String
  user                    User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Feature details
  featureName             String                    // "chatbot", "what_if_calculator", "audit_trail", etc.
  action                  String                    // "opened", "used", "completed", "error"
  
  // Usage data
  duration                Int?                      // milliseconds
  success                 Boolean                   @default(true)
  errorMessage            String?
  
  metadata                Json?

  timestamp               DateTime                  @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([featureName])
  @@index([timestamp])
}

// ============================================================================
// ERROR LOG MODEL
// ============================================================================

/**
 * ErrorLog - Capture errors for debugging and monitoring
 * Track client-side and server-side errors
 */
model ErrorLog {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  userId                  String?
  user                    User?                     @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Error details
  errorType               String                    // TypeError, NetworkError, ValidationError, etc.
  message                 String
  stackTrace              String?
  
  // Context
  url                     String?
  endpoint                String?
  method                  String?                   // GET, POST, etc.
  
  // Impact
  severity                String                    @default("low")  // low, medium, high, critical
  resolved                Boolean                   @default(false)

  timestamp               DateTime                  @default(now())
  resolvedAt              DateTime?

  @@index([tenantId])
  @@index([severity])
  @@index([timestamp])
}

// ============================================================================
// CUSTOM METRIC MODEL
// ============================================================================

/**
 * CustomMetric - Store custom aggregated metrics
 * Allows for pre-computed metrics for performance
 */
model CustomMetric {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Metric definition
  name                    String                    // "daily_active_users", "avg_return_processing_time", etc.
  category                String                    // "engagement", "performance", "revenue", etc.
  
  // Time period
  period                  String                    @default("day")  // day, week, month, year
  date                    DateTime                  // Start of period
  
  // Value
  value                   Decimal                   @db.Decimal(12, 2)
  previousValue           Decimal?                  @db.Decimal(12, 2)
  
  // Metadata
  metadata                Json?

  timestamp               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@unique([tenantId, name, period, date])
  @@index([tenantId])
  @@index([name])
  @@index([date])
}

// ============================================================================
// MIGRATION FILE: analytics.sql
// ============================================================================

/*
-- CreateTable "AnalyticsEvent"
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_idx" ON "AnalyticsEvent"("tenantId");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");
CREATE INDEX "AnalyticsEvent_tenantId_timestamp_idx" ON "AnalyticsEvent"("tenantId", "timestamp");

-- CreateTable "EventSummary"
CREATE TABLE "EventSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventSummary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSummary_tenantId_eventType_date_key" ON "EventSummary"("tenantId", "eventType", "date");
CREATE INDEX "EventSummary_tenantId_idx" ON "EventSummary"("tenantId");
CREATE INDEX "EventSummary_date_idx" ON "EventSummary"("date");

-- CreateTable "UserSession"
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL UNIQUE,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "UserSession_tenantId_idx" ON "UserSession"("tenantId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_startedAt_idx" ON "UserSession"("startedAt");

-- CreateTable "PageView"
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrer" TEXT,
    "sessionId" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "timeSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "PageView_tenantId_idx" ON "PageView"("tenantId");
CREATE INDEX "PageView_userId_idx" ON "PageView"("userId");
CREATE INDEX "PageView_path_idx" ON "PageView"("path");
CREATE INDEX "PageView_enteredAt_idx" ON "PageView"("enteredAt");

-- CreateTable "FeatureUsage"
CREATE TABLE "FeatureUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "FeatureUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "FeatureUsage_tenantId_idx" ON "FeatureUsage"("tenantId");
CREATE INDEX "FeatureUsage_userId_idx" ON "FeatureUsage"("userId");
CREATE INDEX "FeatureUsage_featureName_idx" ON "FeatureUsage"("featureName");
CREATE INDEX "FeatureUsage_timestamp_idx" ON "FeatureUsage"("timestamp");

-- CreateTable "ErrorLog"
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "url" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "ErrorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- CreateIndex
CREATE INDEX "ErrorLog_tenantId_idx" ON "ErrorLog"("tenantId");
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");
CREATE INDEX "ErrorLog_timestamp_idx" ON "ErrorLog"("timestamp");

-- CreateTable "CustomMetric"
CREATE TABLE "CustomMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'day',
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "previousValue" DECIMAL(12,2),
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomMetric_tenantId_name_period_date_key" ON "CustomMetric"("tenantId", "name", "period", "date");
CREATE INDEX "CustomMetric_tenantId_idx" ON "CustomMetric"("tenantId");
CREATE INDEX "CustomMetric_name_idx" ON "CustomMetric"("name");
CREATE INDEX "CustomMetric_date_idx" ON "CustomMetric"("date");
*/

// ============================================================================
// PRISMA CONFIGURATION
// ============================================================================

// Run migrations:
// npx prisma migrate dev --name add-analytics
// npx prisma generate

// Verification queries:
/*
-- Check event count
SELECT COUNT(*) as total_events FROM "AnalyticsEvent";

-- Check event types
SELECT "eventType", COUNT(*) FROM "AnalyticsEvent" GROUP BY "eventType";

-- Check daily summaries
SELECT "date", SUM("count") as total FROM "EventSummary" GROUP BY "date" ORDER BY "date" DESC LIMIT 30;

-- Check active sessions
SELECT COUNT(*) FROM "UserSession" WHERE "endedAt" IS NULL;
*/
