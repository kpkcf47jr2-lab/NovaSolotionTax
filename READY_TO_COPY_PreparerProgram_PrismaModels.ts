/**
 * Phase 10: Preparer Program - Prisma Database Models
 * File: prisma/schema.prisma (additional models)
 * 
 * Database schema for preparer program with license management
 * Features: License tracking, renewals, background checks, earnings
 * Production-ready: Full schema with migrations and indexes
 */

// ============================================================================
// PREPARER MODEL
// ============================================================================

/**
 * Preparer - Main preparer profile
 * Represents a tax preparer in the network
 */
model Preparer {
  id                      String                    @id @default(cuid())
  tenantId                String
  tenant                  Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // User relationship (1:1 with User)
  userId                  String                    @unique
  user                    User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Personal information
  firstName               String
  lastName                String
  email                   String                    @unique
  phone                   String

  // Business information
  businessName            String
  practiceState           String                    // US state code (e.g., "CA", "NY")
  ein                     String?                   @db.VarChar(255) // Encrypted
  specializations         String[]                  // JSON array of specializations
  yearsOfExperience       Int

  // Status tracking
  status                  String                    @default("pending_verification") // pending_verification, verified, active, suspended, inactive
  backgroundCheckStatus   String                    @default("pending") // pending, in_progress, completed, passed, failed
  backgroundCheckResult   Json?                     // Store background check result
  
  // Verification
  verifiedAt              DateTime?
  verifiedBy              String?

  // Relationships
  licenses                PreparerLicense[]
  renewals                PreparerRenewal[]
  backgroundCheck         PreparerBackgroundCheck?
  earnings                PreparerEarnings[]
  documents               Document[]
  taxReturns              TaxReturn[]                // Preparer can handle multiple returns
  
  // Metadata
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt
  deletedAt               DateTime?

  @@unique([tenantId, email])
  @@index([status])
  @@index([backgroundCheckStatus])
  @@index([createdAt])
  @@index([tenantId])
}

// ============================================================================
// PREPARER LICENSE MODEL
// ============================================================================

/**
 * PreparerLicense - Tax preparer licenses
 * Tracks active and historical licenses
 */
model PreparerLicense {
  id                      String                    @id @default(cuid())
  preparerId              String
  preparer                Preparer                  @relation(fields: [preparerId], references: [id], onDelete: Cascade)

  // License information
  certificationNumber     String                    @unique // License number from IRS/state
  status                  String                    @default("pending") // pending, active, expired, suspended, pending_renewal
  licenseType             String                    // CPA, EA, ENROLLED_AGENT
  
  // Dates
  issuedAt                DateTime
  expiryDate              DateTime
  renewalDueDate          DateTime?

  // Renewal tracking
  lastRenewalDate         DateTime?
  renewalCount            Int                       @default(0)

  // Metadata
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@unique([preparerId])
  @@index([status])
  @@index([expiryDate])
  @@index([preparerId])
}

// ============================================================================
// PREPARER RENEWAL MODEL
// ============================================================================

/**
 * PreparerRenewal - License renewal submissions
 * Tracks renewal applications and status
 */
model PreparerRenewal {
  id                      String                    @id @default(cuid())
  preparerId              String
  preparer                Preparer                  @relation(fields: [preparerId], references: [id], onDelete: Cascade)
  
  licenseId               String                    // Reference to license being renewed
  
  // Renewal details
  continuingEducationHours Int
  educationProof          String?                   // Document ID reference
  status                  String                    @default("pending_review") // pending_review, approved, rejected, withdrawn
  
  // Review tracking
  reviewedBy              String?
  reviewedAt              DateTime?
  rejectionReason         String?

  // New license info (after approval)
  newExpiryDate           DateTime?
  approvalLetter          String?                   // Document ID

  // Metadata
  submittedAt             DateTime                  @default(now())
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@index([preparerId])
  @@index([status])
  @@index([submittedAt])
}

// ============================================================================
// BACKGROUND CHECK MODEL
// ============================================================================

/**
 * PreparerBackgroundCheck - Background check results
 * Stores background check data and status
 */
model PreparerBackgroundCheck {
  id                      String                    @id @default(cuid())
  preparerId              String                    @unique
  preparer                Preparer                  @relation(fields: [preparerId], references: [id], onDelete: Cascade)

  // Check details
  status                  String                    @default("pending") // pending, in_progress, completed, passed, failed
  checkProvider           String                    // e.g., "checkr", "sterling", "aceinvestigations"
  externalCheckId         String?                   // Unique ID from provider

  // Results
  result                  String?                   // passed, failed, review_needed
  resultDetails           Json?                     // Detailed results from provider
  
  // Flags
  criminalHistory         Boolean                   @default(false)
  termsViolation          Boolean                   @default(false)
  sanctionedList          Boolean                   @default(false)

  // Dates
  requestedAt             DateTime                  @default(now())
  completedAt             DateTime?
  expiresAt               DateTime?

  // Metadata
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@index([status])
  @@index([completedAt])
}

// ============================================================================
// PREPARER EARNINGS MODEL
// ============================================================================

/**
 * PreparerEarnings - Earnings aggregation
 * Tracks earnings statistics per preparer
 */
model PreparerEarnings {
  id                      String                    @id @default(cuid())
  preparerId              String
  preparer                Preparer                  @relation(fields: [preparerId], references: [id], onDelete: Cascade)

  // Period
  periodStart             DateTime
  periodEnd               DateTime
  period                  String                    // "day", "week", "month", "year"

  // Statistics
  totalReturns            Int                       @default(0)
  approvedReturns         Int                       @default(0)
  rejectedReturns         Int                       @default(0)
  totalEarnings           Decimal                   @default(0) @db.Decimal(10, 2)
  platformFee             Decimal                   @default(0) @db.Decimal(10, 2)
  netEarnings             Decimal                   @default(0) @db.Decimal(10, 2)

  // Metadata
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  @@unique([preparerId, periodStart, periodEnd])
  @@index([preparerId])
  @@index([periodStart])
}

// ============================================================================
// MIGRATION FILE: preparer-program.sql
// ============================================================================

/*
-- CreateTable "Preparer"
CREATE TABLE "Preparer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "practiceState" TEXT NOT NULL,
    "ein" VARCHAR(255),
    "specializations" TEXT NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "backgroundCheckStatus" TEXT NOT NULL DEFAULT 'pending',
    "backgroundCheckResult" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Preparer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
    CONSTRAINT "Preparer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "Preparer_status_idx" ON "Preparer"("status");
CREATE INDEX "Preparer_backgroundCheckStatus_idx" ON "Preparer"("backgroundCheckStatus");
CREATE INDEX "Preparer_createdAt_idx" ON "Preparer"("createdAt");
CREATE INDEX "Preparer_tenantId_idx" ON "Preparer"("tenantId");

-- CreateTable "PreparerLicense"
CREATE TABLE "PreparerLicense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preparerId" TEXT NOT NULL UNIQUE,
    "certificationNumber" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "licenseType" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "renewalDueDate" TIMESTAMP(3),
    "lastRenewalDate" TIMESTAMP(3),
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreparerLicense_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "Preparer" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "PreparerLicense_status_idx" ON "PreparerLicense"("status");
CREATE INDEX "PreparerLicense_expiryDate_idx" ON "PreparerLicense"("expiryDate");
CREATE INDEX "PreparerLicense_preparerId_idx" ON "PreparerLicense"("preparerId");

-- CreateTable "PreparerRenewal"
CREATE TABLE "PreparerRenewal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preparerId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "continuingEducationHours" INTEGER NOT NULL,
    "educationProof" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "newExpiryDate" TIMESTAMP(3),
    "approvalLetter" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreparerRenewal_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "Preparer" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "PreparerRenewal_preparerId_idx" ON "PreparerRenewal"("preparerId");
CREATE INDEX "PreparerRenewal_status_idx" ON "PreparerRenewal"("status");
CREATE INDEX "PreparerRenewal_submittedAt_idx" ON "PreparerRenewal"("submittedAt");

-- CreateTable "PreparerBackgroundCheck"
CREATE TABLE "PreparerBackgroundCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preparerId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "checkProvider" TEXT NOT NULL,
    "externalCheckId" TEXT,
    "result" TEXT,
    "resultDetails" JSONB,
    "criminalHistory" BOOLEAN NOT NULL DEFAULT false,
    "termsViolation" BOOLEAN NOT NULL DEFAULT false,
    "sanctionedList" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreparerBackgroundCheck_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "Preparer" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "PreparerBackgroundCheck_status_idx" ON "PreparerBackgroundCheck"("status");
CREATE INDEX "PreparerBackgroundCheck_completedAt_idx" ON "PreparerBackgroundCheck"("completedAt");

-- CreateTable "PreparerEarnings"
CREATE TABLE "PreparerEarnings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preparerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "totalReturns" INTEGER NOT NULL DEFAULT 0,
    "approvedReturns" INTEGER NOT NULL DEFAULT 0,
    "rejectedReturns" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreparerEarnings_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "Preparer" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "PreparerEarnings_preparerId_idx" ON "PreparerEarnings"("preparerId");
CREATE INDEX "PreparerEarnings_periodStart_idx" ON "PreparerEarnings"("periodStart");
CREATE UNIQUE INDEX "PreparerEarnings_preparerId_periodStart_periodEnd_key" ON "PreparerEarnings"("preparerId", "periodStart", "periodEnd");
*/

// ============================================================================
// PRISMA CONFIGURATION
// ============================================================================

// Run migrations:
// npx prisma migrate dev --name add-preparer-program
// npx prisma generate

// Verification queries:
/*
-- Check preparer count
SELECT COUNT(*) as total_preparers FROM "Preparer";

-- Check license status distribution
SELECT status, COUNT(*) FROM "PreparerLicense" GROUP BY status;

-- Check pending renewals
SELECT p.id, p.firstName, p.lastName, pr.status 
FROM "Preparer" p 
JOIN "PreparerRenewal" pr ON p.id = pr."preparerId"
WHERE pr.status = 'pending_review';

-- Check expiring licenses (within 30 days)
SELECT p.firstName, p.lastName, pl."expiryDate"
FROM "Preparer" p
JOIN "PreparerLicense" pl ON p.id = pl."preparerId"
WHERE pl."expiryDate" BETWEEN NOW() AND NOW() + INTERVAL '30 days';
*/
