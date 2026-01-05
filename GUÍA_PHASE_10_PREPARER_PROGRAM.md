/**
 * GUÍA PHASE 10: PREPARER PROGRAM - LICENSE MANAGEMENT
 * 
 * Complete integration guide for Phase 10: Preparer Program with License Management
 * Integration time: 40 minutes
 * Dependencies: Phase 1-9 complete, Express routes, Prisma, Next.js
 * 
 * Files involved:
 * 1. READY_TO_COPY_PreparerProgram_endpoints.ts (920 lines)
 * 2. READY_TO_COPY_BecomePreparer.tsx (700 lines)
 * 3. READY_TO_COPY_PreparerLicense.tsx (650 lines)
 * 4. READY_TO_COPY_PreparerProgram_PrismaModels.ts (350 lines)
 */

// ============================================================================
// SECTION 1: SETUP & INSTALLATION (5 minutes)
// ============================================================================

/*
STEP 1: Update Prisma schema
Location: prisma/schema.prisma

1. Copy all models from READY_TO_COPY_PreparerProgram_PrismaModels.ts
2. Add these models to schema.prisma (after existing models)
3. Keep relationships with existing Tenant, User, Document models

STEP 2: Run database migration
Command: npx prisma migrate dev --name add-preparer-program
Output: Creates migration file and runs it
Time: ~2 minutes

STEP 3: Generate Prisma client
Command: npx prisma generate
Output: Updates @prisma/client with new types
Time: ~1 minute

STEP 4: Verify database
Query the database:
  SELECT COUNT(*) FROM "Preparer";
  SELECT COUNT(*) FROM "PreparerLicense";
Should return: 0 rows (empty tables)
*/

// ============================================================================
// SECTION 2: BACKEND SETUP (15 minutes)
// ============================================================================

/*
STEP 1: Copy endpoints file
Source: READY_TO_COPY_PreparerProgram_endpoints.ts (920 lines)
Destination: apps/api/src/routes/preparer-program.ts
Changes: None needed - copy as-is

STEP 2: Register route in Express app
File: apps/api/src/app.ts

Add this import:
  import preparerProgramRoutes from './routes/preparer-program';

Add this middleware:
  app.use('/api/preparer-program', preparerProgramRoutes);

Placement: After other /api routes

STEP 3: Verify dependencies are installed
Check package.json includes:
  - express: ^4.18
  - @prisma/client: latest
  - bcrypt: ^5
  - stripe: ^14 (if using Stripe)
  - bullmq: ^5 (for background jobs)
  - zod: ^3 (for validation)

Install if missing:
  npm install --save bcrypt bullmq zod

STEP 4: Test endpoints with curl

Test registration:
curl -X POST http://localhost:3001/api/preparer-program/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "businessName": "Doe Tax Services",
    "practiceState": "CA",
    "ein": "12-3456789",
    "yearsOfExperience": 5,
    "specializations": ["Individual Returns", "Business Returns"],
    "backgroundCheckConsent": true
  }'

Expected response:
{
  "success": true,
  "message": "Preparer registered successfully",
  "preparerId": "xxxxx",
  "status": "pending_verification"
}
*/

// ============================================================================
// SECTION 3: FRONTEND SETUP (10 minutes)
// ============================================================================

/*
STEP 1: Copy landing page component
Source: READY_TO_COPY_BecomePreparer.tsx (700 lines)
Destination: apps/web/src/app/become-preparer/page.tsx
Changes: None needed - copy as-is

STEP 2: Copy license dashboard
Source: READY_TO_COPY_PreparerLicense.tsx (650 lines)
Destination: apps/web/src/app/preparer/license/page.tsx
Changes: None needed - copy as-is

STEP 3: Update app routing
File: apps/web/src/app/layout.tsx or navigation component

Add navigation links:
  - "/become-preparer" (public, visible to all)
  - "/preparer/license" (protected, requires auth + preparer role)

STEP 4: Add route protection
For /preparer/license page:

Create: apps/web/src/lib/auth-guards.ts

Export function requirePreparer(Component: React.ComponentType) {
  return function ProtectedComponent(props: any) {
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (!session) router.push('/login');
      if (session?.user?.role !== 'preparer') router.push('/dashboard');
    }, [session, router]);

    if (!session) return <p>Loading...</p>;
    return <Component {...props} />;
  };
}

Wrap license dashboard:
export default requirePreparer(LicenseDashboard);

STEP 5: Test frontend
Navigate to http://localhost:3000/become-preparer
Should see:
  ✓ Hero section with CTA
  ✓ 5 benefit cards
  ✓ Requirements section
  ✓ Registration form
  ✓ FAQ section
*/

// ============================================================================
// SECTION 4: BACKGROUND CHECK INTEGRATION (10 minutes)
// ============================================================================

/*
OPTION A: Integration with Checkr (Recommended)
https://checkr.com/

1. Create Checkr account at https://checkr.com
2. Get API key from dashboard
3. Add to .env.local:
   CHECKR_API_KEY=sk_live_xxxxx
   CHECKR_ACCOUNT_ID=xxxxx

4. Create background check service:
   File: apps/api/src/services/background-check.service.ts

   import axios from 'axios';

   export async function initiateBackgroundCheck(preparerId: string, data: {
     firstName: string;
     lastName: string;
     email: string;
     ein: string;
   }) {
     try {
       const response = await axios.post('https://api.checkr.com/v1/candidates', {
         first_name: data.firstName,
         last_name: data.lastName,
         email: data.email,
         phone: data.ein,
       }, {
         auth: {
           username: process.env.CHECKR_API_KEY,
           password: '',
         },
       });

       return {
         externalCheckId: response.data.id,
         status: 'in_progress',
         provider: 'checkr',
       };
     } catch (error) {
       console.error('Background check error:', error);
       throw new Error('Failed to initiate background check');
     }
   }

5. Update registration endpoint:
   - When preparer registers, call initiateBackgroundCheck()
   - Store externalCheckId in PreparerBackgroundCheck table
   - Queue webhook listener for completion

6. Create webhook handler:
   File: apps/api/src/webhooks/checkr-webhook.ts

   app.post('/webhooks/checkr', async (req, res) => {
     const { candidate_id, status, reports } = req.body;

     // Update background check in database
     await prisma.preparerBackgroundCheck.update({
       where: { externalCheckId: candidate_id },
       data: {
         status: status,
         resultDetails: reports,
         completedAt: new Date(),
         result: reports[0]?.status || 'review_needed',
       },
     });

     res.json({ received: true });
   });

7. Create BullMQ job to monitor status:
   
   const bgCheckQueue = new Queue('background-check');

   bgCheckQueue.process(async (job) => {
     const { preparerId } = job.data;
     const bgCheck = await prisma.preparerBackgroundCheck.findUnique({
       where: { preparerId },
     });

     if (bgCheck?.externalCheckId) {
       const result = await getCheckrStatus(bgCheck.externalCheckId);
       
       if (result.completed) {
         // Auto-approve if passed
         if (result.status === 'clear') {
           await approvePreparer(preparerId);
         }
       }
     }
   });

OPTION B: Mock implementation (for testing)
If not using real background check service:

File: apps/api/src/services/background-check.service.ts

export async function initiateBackgroundCheck(preparerId: string) {
  // Mock: Always pass after 5 seconds
  return {
    externalCheckId: `mock_${preparerId}_${Date.now()}`,
    status: 'pending',
    provider: 'mock',
  };
}

// Queue job to complete after delay
await bgCheckQueue.add(
  { preparerId },
  { delay: 5000 } // Complete after 5 seconds
);
*/

// ============================================================================
// SECTION 5: LICENSE WORKFLOW (8 minutes)
// ============================================================================

/*
WORKFLOW: Preparer Registration → Verification → Active Status

STEP 1: Preparer Registration (User Action)
- Navigate to /become-preparer
- Fill form (personal info, business, specializations)
- Submit
- POST /api/preparer-program/register

Response:
{
  "preparerId": "prep_123",
  "status": "pending_verification"
}

Database state:
- Preparer.status = "pending_verification"
- Preparer.backgroundCheckStatus = "pending"
- PreparerBackgroundCheck created with status = "pending"
- BullMQ job queued for background check

STEP 2: Background Check Processing (Async)
- BullMQ job runs
- Calls Checkr API (or mock)
- Waits for result
- Updates PreparerBackgroundCheck.status = "completed"
- Updates PreparerBackgroundCheck.result = "passed" or "failed"

If failed:
- Preparer.status = "suspended"
- Send email: "Your application was not approved"
- Show error on dashboard

If passed:
- Continue to Step 3

STEP 3: Admin Review & Licensing
- Admin sees preparer in /admin/preparers list
- Status shows "verified"
- Admin clicks "Create License"
- POST /api/preparer-program/licenses/{preparerId}

Request body:
{
  "certificationNumber": "CPA123456",
  "licenseType": "CPA",
  "issuedAt": "2024-01-15",
  "expiryDate": "2026-01-15"
}

Response:
{
  "license": {
    "id": "lic_123",
    "certificationNumber": "CPA123456",
    "status": "active",
    "expiryDate": "2026-01-15"
  },
  "preparer": {
    "status": "active"
  }
}

Database state:
- PreparerLicense created with status = "active"
- Preparer.status = "active"
- Email sent: "Welcome to NovaSolutionTax Preparer Network"

STEP 4: Preparer Active & Working
- Preparer can now accept tax returns
- License visible on /preparer/license
- Earnings tracked in PreparerEarnings table
- Can initiate renewal 90 days before expiry

STEP 5: License Renewal (Preparer Action)
- 90 days before expiry, notification sent
- Preparer navigates to /preparer/license
- Fills renewal form:
  - Continuing Education Hours (minimum 15)
  - Compliance confirmation
- POST /api/preparer-program/renewals

Response:
{
  "renewal": {
    "id": "renew_123",
    "status": "pending_review",
    "submittedAt": "2024-10-01"
  }
}

Database state:
- PreparerRenewal created with status = "pending_review"
- PreparerLicense.status = "pending_renewal"
- Admin notification queued

STEP 6: Admin Review & Approval
- Admin sees pending renewals in admin panel
- Reviews continuing education hours
- Reviews any compliance issues
- PATCH /api/preparer-program/licenses/{licenseId}

Request body:
{
  "status": "active",
  "expiryDate": "2026-10-15"
}

Database state:
- PreparerLicense updated with new expiryDate
- PreparerRenewal.status = "approved"
- Email sent: "Your license has been renewed"

*/

// ============================================================================
// SECTION 6: TESTING CHECKLIST (5 minutes)
// ============================================================================

/*
ENDPOINT TESTS:

[ ] POST /api/preparer-program/register
    - Valid registration data → 201 Created
    - Missing required fields → 400 Bad Request
    - Duplicate email → 409 Conflict
    - Rate limited (>5/hour) → 429 Too Many Requests

[ ] GET /api/preparer-program/profile
    - Authenticated preparer → 200 OK + profile data
    - Non-authenticated → 401 Unauthorized
    - Preparer not found → 404 Not Found

[ ] PATCH /api/preparer-program/profile
    - Update businessName → 200 OK
    - Update phone → 200 OK
    - Update specializations → 200 OK
    - Unauthorized user → 403 Forbidden

[ ] POST /api/preparer-program/licenses/{preparerId}
    - Valid data + admin role → 201 Created
    - Non-admin → 403 Forbidden
    - Invalid preparerId → 404 Not Found
    - Preparer already has license → 409 Conflict

[ ] PATCH /api/preparer-program/licenses/{licenseId}
    - Update status to active → 200 OK
    - Update expiryDate → 200 OK
    - Non-admin → 403 Forbidden
    - Invalid licenseId → 404 Not Found

[ ] POST /api/preparer-program/renewals
    - Valid renewal data → 201 Created
    - Insufficient education hours → 400 Bad Request
    - License not expiring soon → 409 Conflict

[ ] GET /api/preparer-program/earnings?period=month
    - Returns statistics → 200 OK
    - Period options work (week/month/year) → 200 OK
    - Calculations correct → Values match
    - Unauthorized → 401 Unauthorized

[ ] GET /api/preparer-program/list (admin only)
    - Admin user → 200 OK + filtered list
    - Non-admin → 403 Forbidden
    - Filters work (status, state) → Correct results
    - Search works (name) → Correct results
    - Pagination works (page, limit) → Correct results

FRONTEND TESTS:

[ ] Navigate to /become-preparer
    - Page loads → No errors
    - Hero section visible → Can see CTA button
    - Form renders → All fields present
    - Form submission → Works with valid data
    - Success redirect → Goes to /preparer/onboarding

[ ] Navigate to /preparer/license (authenticated)
    - License card displays → All info visible
    - Status badge shows → Correct color/text
    - Renewal form visible → Can fill and submit
    - Earnings section → Shows stats
    - Period selector works → Can change week/month/year

DATABASE TESTS:

[ ] Preparer created with correct status
[ ] License created with correct dates
[ ] Renewal tracked properly
[ ] Background check result stored
[ ] Earnings calculated correctly
[ ] Indexes created for performance

*/

// ============================================================================
// SECTION 7: TROUBLESHOOTING
// ============================================================================

/*
ISSUE 1: Background check never completes
Symptom: Preparer stuck in "pending_verification" status
Cause: BullMQ job not running or Checkr webhook not configured

Solution:
1. Verify Redis is running: redis-cli ping → PONG
2. Check BullMQ job logs:
   const bgCheckQueue = new Queue('background-check');
   const failed = await bgCheckQueue.getFailed();
   console.log('Failed jobs:', failed);

3. If using Checkr, verify webhook is configured:
   - Go to https://checkr.com/settings/webhooks
   - Add endpoint: https://your-domain.com/webhooks/checkr
   - Test webhook from Checkr dashboard

4. If using mock, verify job delay is set


ISSUE 2: License endpoint returns 404
Symptom: POST /api/preparer-program/licenses/{preparerId} → 404 Not Found
Cause: Preparer ID not found or incorrect format

Solution:
1. Verify preparer exists:
   SELECT * FROM "Preparer" WHERE id = 'prep_123';

2. Check preparer status is "verified":
   SELECT status FROM "Preparer" WHERE id = 'prep_123';

3. Use correct ID format from registration response


ISSUE 3: Renewal form not submitting
Symptom: Form stuck on "Submitting..." state
Cause: Frontend not properly integrated with endpoint

Solution:
1. Check browser console for errors
2. Verify endpoint URL: /api/preparer-program/renewals
3. Check network tab: Request sent with correct body
4. Check backend logs for any errors
5. Verify auth token is sent in headers


ISSUE 4: Earnings showing $0
Symptom: GET /api/preparer-program/earnings returns 0 earnings
Cause: No completed TaxReturns or calculations not running

Solution:
1. Check if preparer has any returns:
   SELECT COUNT(*) FROM "TaxReturn" WHERE "preparerId" = 'prep_123';

2. Check if returns are in "completed" status:
   SELECT * FROM "TaxReturn" WHERE "preparerId" = 'prep_123' AND status = 'completed';

3. Verify earnings calculation query in endpoint
4. Check if PreparerEarnings table is being updated
   SELECT * FROM "PreparerEarnings" WHERE "preparerId" = 'prep_123';


ISSUE 5: Rate limiting blocks registration
Symptom: 429 Too Many Requests on registration
Cause: Rate limiter configured too restrictively

Solution:
1. In endpoint file, find rate limiter config:
   const limiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 5,
   });

2. Adjust as needed:
   - Increase max requests: max: 10
   - Increase time window: windowMs: 24 * 60 * 60 * 1000

3. Clear rate limit cache: redis-cli FLUSHDB
*/

// ============================================================================
// SECTION 8: PERFORMANCE OPTIMIZATION
// ============================================================================

/*
DATABASE INDEXES (already in schema):
- Preparer.status → For filtering active preparers
- Preparer.backgroundCheckStatus → For background check reports
- PreparerLicense.status → For license tracking
- PreparerLicense.expiryDate → For expiry monitoring
- PreparerRenewal.status → For renewal workflows
- PreparerEarnings.preparerId → For quick earnings lookup

QUERY OPTIMIZATION:

1. Use eager loading for related data:
   const preparer = await prisma.preparer.findUnique({
     where: { id: preparerId },
     include: {
       licenses: true,
       renewals: true,
       backgroundCheck: true,
     },
   });

2. Cache earnings for month/year:
   // Cache in Redis for 1 hour
   const cached = await redis.get(`earnings:${preparerId}:${period}`);
   if (cached) return JSON.parse(cached);

3. Use database aggregation for statistics:
   const stats = await prisma.taxReturn.aggregate({
     where: { preparerId },
     _count: true,
     _sum: { feePaid: true },
   });


REDIS CACHING:

1. Cache preparer profile (1 hour):
   await redis.setex(
     `preparer:${id}`,
     3600,
     JSON.stringify(preparerData)
   );

2. Cache license status (30 minutes):
   await redis.setex(
     `license:${id}`,
     1800,
     JSON.stringify(licenseData)
   );

3. Invalidate cache on updates:
   await redis.del(`preparer:${id}`);
   await redis.del(`license:${id}`);
*/

// ============================================================================
// SECTION 9: SECURITY CONSIDERATIONS
// ============================================================================

/*
PII ENCRYPTION:

1. EIN field is encrypted before storage
   - Use database-level encryption or field-level
   - Decrypt only when displaying to authorized users
   
2. Background check results contain sensitive data
   - Store only necessary fields
   - Don't log full results
   - Require admin auth to view

3. Rate limiting on registration
   - Prevents abuse
   - Configured per IP address
   - Reset after time window


AUTHORIZATION:

1. Registration endpoint: Public, rate limited
2. Profile GET/PATCH: Only owner or admin
3. License endpoints: Admin only
4. Renewal endpoints: Owner or admin
5. Admin list: Admin only
6. Earnings: Only owner or admin


COMPLIANCE:

1. OFAC compliance
   - Background check provider handles OFAC screening
   - Results stored in backgroundCheckResult

2. Audit logging
   - All state changes logged
   - User who made change recorded
   - Timestamp recorded

3. Data retention
   - Background checks: 7 years (per IRS)
   - License history: Permanent
   - Renewals: Permanent
   - Earnings: Permanent
*/

// ============================================================================
// INTEGRATION COMPLETE
// ============================================================================

/*
Summary:
- 4 files integrated (endpoints + 2 UI components + models)
- 8 API endpoints fully functional
- Database schema complete with indexes
- Background check integration ready
- License workflow operational
- Earnings tracking active

Next Phase: Phase 11 - Analytics Dashboard
Estimated time to next phase: 5 minutes
*/
