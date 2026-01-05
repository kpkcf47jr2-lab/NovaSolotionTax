/**
 * GUÍA PHASE 11: ANALYTICS DASHBOARD
 * 
 * Complete integration guide for Phase 11: Analytics Dashboard
 * Integration time: 40 minutes
 * Dependencies: Phase 1-10 complete, Express routes, Prisma, Next.js
 * 
 * Files involved:
 * 1. READY_TO_COPY_Analytics_endpoints.ts (950 lines)
 * 2. READY_TO_COPY_AnalyticsDashboard.tsx (850 lines)
 * 3. READY_TO_COPY_Analytics_PrismaModels.ts (350 lines)
 */

// ============================================================================
// SECTION 1: SETUP & INSTALLATION (5 minutes)
// ============================================================================

/*
STEP 1: Install chart dependencies
Command: npm install recharts @recharts/refine
Time: ~2 minutes
Verify: npm list recharts

STEP 2: Update Prisma schema
Location: prisma/schema.prisma

1. Copy all models from READY_TO_COPY_Analytics_PrismaModels.ts
2. Add these models to schema.prisma
3. Keep relationships with existing Tenant, User models

STEP 3: Run database migration
Command: npx prisma migrate dev --name add-analytics
Output: Creates migration file and runs it
Time: ~2 minutes

STEP 4: Generate Prisma client
Command: npx prisma generate
Output: Updates @prisma/client with new types
Time: ~1 minute

STEP 5: Verify database
Query the database:
  SELECT COUNT(*) FROM "AnalyticsEvent";
Should return: 0 rows (empty table)
*/

// ============================================================================
// SECTION 2: BACKEND SETUP (15 minutes)
// ============================================================================

/*
STEP 1: Copy endpoints file
Source: READY_TO_COPY_Analytics_endpoints.ts (950 lines)
Destination: apps/api/src/routes/analytics.ts
Changes: None needed - copy as-is

STEP 2: Register route in Express app
File: apps/api/src/app.ts

Add this import:
  import analyticsRoutes from './routes/analytics';

Add this middleware:
  app.use('/api/analytics', analyticsRoutes);

Placement: After other /api routes

STEP 3: Add event tracking middleware
File: apps/api/src/middleware/analytics.ts

Create function to track events:
  
  export async function trackEvent(
    userId: string,
    tenantId: string,
    eventType: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Fire and forget - don't block request
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, metadata }),
      }).catch(err => console.error('Event tracking error:', err));
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

STEP 4: Hook up event tracking
Add tracking calls to key endpoints:

In tax return endpoints:
  await trackEvent(userId, tenantId, 'tax_return_created', {
    returnId: newReturn.id,
    clientId: newReturn.clientId,
  });

In payment endpoints:
  await trackEvent(userId, tenantId, 'payment_completed', {
    paymentId: payment.id,
    amount: payment.amount,
  });

In login endpoint:
  await trackEvent(userId, tenantId, 'user_login', {
    timestamp: new Date(),
  });

STEP 5: Test endpoints with curl

Test tracking an event:
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventType": "tax_return_created",
    "metadata": {
      "returnId": "ret_123",
      "status": "draft"
    }
  }'

Test getting metrics:
curl -X GET "http://localhost:3001/api/analytics/metrics?period=month" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

Test getting chart data:
curl -X GET "http://localhost:3001/api/analytics/charts/events?period=month&granularity=day" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
*/

// ============================================================================
// SECTION 3: FRONTEND SETUP (10 minutes)
// ============================================================================

/*
STEP 1: Copy dashboard component
Source: READY_TO_COPY_AnalyticsDashboard.tsx (850 lines)
Destination: apps/web/src/app/admin/analytics/page.tsx
Changes: None needed - copy as-is

STEP 2: Update app routing
File: apps/web/src/app/(admin)/layout.tsx or navigation

Add navigation link:
  - "/admin/analytics" (protected, requires admin role)

STEP 3: Add route protection
For /admin/analytics page:

Wrap component:
  export default requireAdmin(AnalyticsDashboard);

Or add middleware check at top:
  'use client';
  
  import { useSession } from 'next-auth/react';
  import { useRouter } from 'next/navigation';
  import { useEffect } from 'react';

  export default function AnalyticsDashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (!session?.user?.role?.includes('admin')) {
        router.push('/dashboard');
      }
    }, [session, router]);

    if (!session?.user?.role?.includes('admin')) {
      return <div>Redirecting...</div>;
    }

    // ... rest of component
  }

STEP 4: Add chart library to package.json
packages/web/package.json should have:
  "recharts": "^2.10.0"

If not installed:
  npm install recharts

STEP 5: Test frontend
Navigate to http://localhost:3000/admin/analytics
Should see:
  ✓ Period selector buttons
  ✓ 4 key metric cards
  ✓ Line chart for trends
  ✓ Pie chart for event types
  ✓ User activity table
  ✓ Export buttons
*/

// ============================================================================
// SECTION 4: EVENT TRACKING IMPLEMENTATION (10 minutes)
// ============================================================================

/*
SETUP CLIENT-SIDE TRACKING:

File: apps/web/src/lib/analytics.ts

Create analytics helper:

export async function trackEvent(
  eventType: string,
  metadata?: Record<string, any>
) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

Add to key components:

// In login component:
import { trackEvent } from '@/lib/analytics';

async function handleLogin() {
  const response = await signIn('credentials', { email, password });
  if (response?.ok) {
    await trackEvent('user_login', {
      email,
      timestamp: new Date(),
    });
  }
}

// In tax return creation:
async function createReturn(data) {
  const result = await createTaxReturn(data);
  if (result.success) {
    await trackEvent('tax_return_created', {
      returnId: result.id,
      clientId: data.clientId,
    });
  }
}

// In payment submit:
async function submitPayment(amount) {
  const result = await processPayment(amount);
  if (result.success) {
    await trackEvent('payment_completed', {
      paymentId: result.id,
      amount,
      method: result.method,
    });
  }
}

KEY EVENTS TO TRACK:

User Events:
✓ user_registered
✓ user_login
✓ user_logout
✓ profile_updated
✓ password_changed

Tax Return Events:
✓ tax_return_created
✓ tax_return_submitted
✓ tax_return_approved
✓ tax_return_rejected
✓ tax_return_filed

Preparer Events:
✓ preparer_registered
✓ preparer_assigned
✓ preparer_completed_return

Payment Events:
✓ payment_initiated
✓ payment_completed
✓ payment_failed
✓ refund_initiated
✓ refund_completed

Support Events:
✓ ticket_created
✓ ticket_resolved
✓ support_chat_started
✓ support_chat_ended

AI Events:
✓ chatbot_conversation_started
✓ chatbot_question_asked
✓ chatbot_conversation_ended
*/

// ============================================================================
// SECTION 5: DASHBOARD FEATURES (10 minutes)
// ============================================================================

/*
METRIC CARDS:
├─ Total Events (all user actions)
├─ Unique Users (active user count)
├─ Retained Users (repeat visitors)
└─ New Users (first time visitors)

ACTIVITY METRICS:
├─ Tax Returns Created
└─ Preparers Onboarded

CHARTS:
├─ Event Trends (line chart showing events over time)
└─ Event Type Breakdown (pie chart showing % by type)

TABLES:
└─ Top Active Users (name, email, role, event count)

EXPORT:
├─ Export as CSV
└─ Export as JSON

PERIOD SELECTOR:
├─ Day (last 24 hours)
├─ Week (last 7 days)
├─ Month (last 30 days)
├─ Quarter (last 90 days)
└─ Year (last 365 days)
*/

// ============================================================================
// SECTION 6: PERFORMANCE OPTIMIZATION (5 minutes)
// ============================================================================

/*
DATABASE INDEXES (already in schema):
- AnalyticsEvent.tenantId → For tenant isolation
- AnalyticsEvent.eventType → For filtering by event
- AnalyticsEvent.timestamp → For date range queries
- AnalyticsEvent.tenantId_timestamp → For combined queries
- EventSummary.date → For trending
- UserSession.userId → For user session lookups
- FeatureUsage.featureName → For feature adoption

QUERY OPTIMIZATION:

1. Use EventSummary for daily trending:
   // Instead of aggregating all events:
   // const events = await prisma.analyticsEvent.findMany(...);
   
   // Use pre-aggregated summary:
   const summary = await prisma.eventSummary.findMany({
     where: {
       tenantId,
       date: { gte: from, lte: to },
     },
     orderBy: { date: 'asc' },
   });

2. Cache dashboard metrics (1 hour):
   const cached = await redis.get(`analytics:metrics:${tenantId}:${period}`);
   if (cached) return JSON.parse(cached);
   
   const metrics = await calculateMetrics(...);
   await redis.setex(
     `analytics:metrics:${tenantId}:${period}`,
     3600,
     JSON.stringify(metrics)
   );

3. Batch event tracking:
   // Collect events in memory, write to DB in batches
   const eventBatch: AnalyticsEvent[] = [];
   
   function addEvent(event: AnalyticsEvent) {
     eventBatch.push(event);
     if (eventBatch.length >= 100) {
       flushEvents();
     }
   }
   
   async function flushEvents() {
     if (eventBatch.length === 0) return;
     await prisma.analyticsEvent.createMany({
       data: eventBatch,
     });
     eventBatch.length = 0;
   }

4. Use aggregation pipelines:
   const stats = await prisma.analyticsEvent.groupBy({
     by: ['eventType'],
     where: { tenantId },
     _count: true,
     _max: { timestamp: true },
   });
*/

// ============================================================================
// SECTION 7: TESTING CHECKLIST (5 minutes)
// ============================================================================

/*
ENDPOINT TESTS:

[ ] POST /api/analytics/track
    - Valid event → 200 OK
    - Missing eventType → 400 Bad Request
    - Unauthenticated → 401 Unauthorized
    - Event stored in DB → Verify with query

[ ] GET /api/analytics/events?period=month
    - Admin user → 200 OK + events list
    - Non-admin → 403 Forbidden
    - Period param works → Correct date range
    - Filtering by eventType → Correct results
    - Pagination works → Correct page/limit

[ ] GET /api/analytics/metrics?period=month
    - Admin user → 200 OK + metrics
    - Returns all metric types → totalEvents, uniqueUsers, etc.
    - Period changes metrics → Different values per period

[ ] GET /api/analytics/charts/events
    - Returns chart data → date + events count
    - Granularity option → day/week/month
    - Data points correct → Match actual events

[ ] GET /api/analytics/users?limit=20
    - Returns top active users → By event count
    - User details included → name, email, role
    - Limit respected → Returns ≤20 users

[ ] GET /api/analytics/funnel
    - Returns funnel stages → User → Login → Return → Payment
    - Conversion rates calculated → % of previous stage
    - Stages in order → Realistic funnel sequence

[ ] GET /api/analytics/revenue?period=month
    - Returns revenue stats → total, byStatus
    - Active subscriptions count → Correct number
    - Admin only → Non-admin gets 403

[ ] GET /api/analytics/export?format=csv
    - CSV format → Valid CSV file
    - JSON format → Valid JSON file
    - Download works → File saved to local

FRONTEND TESTS:

[ ] Navigate to /admin/analytics
    - Page loads → No errors
    - Metrics cards visible → 4 cards show values
    - Charts render → No rendering errors
    - Period selector works → Can change periods
    - Data updates → New data fetches on period change

[ ] Export functionality
    - Export CSV → Downloads CSV file
    - Export JSON → Downloads JSON file
    - Files valid → Can open and read files

[ ] User table
    - Shows top users → Name, email, role, events
    - Sorting works → Can sort by columns
    - Pagination works → Can go to next page

DATABASE TESTS:

[ ] Events recorded correctly
[ ] Event summary aggregation works
[ ] User sessions tracked
[ ] Page views recorded
[ ] Feature usage logged
[ ] Error logs captured
[ ] Custom metrics calculated
*/

// ============================================================================
// SECTION 8: TROUBLESHOOTING
// ============================================================================

/*
ISSUE 1: No events appearing in dashboard
Symptom: Metrics show 0 events
Cause: Events not being tracked or not reaching API

Solution:
1. Check if events are being triggered:
   - Open browser console
   - Perform action (create return, login, etc.)
   - Check network tab for POST /api/analytics/track
   - Should see 200 response

2. Verify endpoint is running:
   curl http://localhost:3001/api/analytics/metrics
   Should return metrics object, not 404

3. Check database has events:
   SELECT COUNT(*) FROM "AnalyticsEvent";
   Should return > 0

4. Check user is authenticated:
   Tracking requires valid auth token
   Verify token in Authorization header


ISSUE 2: Dashboard page shows "403 Forbidden"
Symptom: Can't access /admin/analytics
Cause: User doesn't have admin role

Solution:
1. Verify user role in database:
   SELECT role FROM "User" WHERE email = 'user@example.com';
   Should include 'admin'

2. Add admin role if needed:
   UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';

3. Sign out and sign back in
4. Token should now include admin role


ISSUE 3: Charts not rendering
Symptom: Dashboard shows empty charts
Cause: Recharts not installed or chart data missing

Solution:
1. Check recharts is installed:
   npm list recharts
   Should show recharts@2.10.0 or higher

2. Verify chart data is fetching:
   - Open browser console
   - Go to Network tab
   - Check /api/analytics/charts/events response
   - Should have data array with entries

3. Check browser console for errors:
   - Might be TypeScript or rendering error
   - Fix type mismatches in component


ISSUE 4: Export button not working
Symptom: Click export, nothing happens
Cause: Endpoint error or blob creation issue

Solution:
1. Check endpoint is responding:
   curl "http://localhost:3001/api/analytics/export?format=csv"
   Should return CSV content

2. Check browser console:
   - Might show fetch error
   - Check response status code

3. Verify fetch permissions:
   - Need proper Authorization header
   - Token must have admin role


ISSUE 5: High database query time
Symptom: Dashboard loading slowly
Cause: Too many events or missing indexes

Solution:
1. Check indexes are created:
   SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='AnalyticsEvent';
   Should show several indexes

2. Run query analyze:
   ANALYZE;
   (PostgreSQL optimization)

3. Archive old events:
   DELETE FROM "AnalyticsEvent" WHERE timestamp < '2025-01-01';
   Keep only last 12 months

4. Use event summary for trends:
   Don't query all events, use pre-aggregated summary
*/

// ============================================================================
// SECTION 9: SECURITY CONSIDERATIONS
// ============================================================================

/*
AUTHENTICATION:

1. All analytics endpoints require admin role
   - Tracking endpoint: Requires auth
   - Metrics endpoints: Admin only
   - Export endpoints: Admin only

2. Token validation:
   - Check JWT signature
   - Verify expiration
   - Check tenant ID matches


AUTHORIZATION:

1. Tenant isolation:
   - All queries filtered by tenantId
   - Can't see other tenant's analytics
   - Cross-tenant queries forbidden

2. Role-based access:
   - Admin: Full access
   - Preparer: Can track own events (read-only)
   - Client: Limited access


DATA PRIVACY:

1. Sensitive data in events:
   - Don't track PII in metadata
   - Don't log passwords
   - Don't log credit card numbers
   - Sanitize user inputs

2. Error logs:
   - Don't expose stack traces to users
   - Store detailed errors server-side only
   - Client sees generic error messages

3. Retention:
   - Delete old events (>1 year)
   - Archive to cold storage if needed
   - Comply with GDPR/CCPA (data deletion)


PERFORMANCE:

1. Event tracking shouldn't block requests:
   - Fire and forget pattern
   - Async tracking
   - Don't wait for response

2. Large exports:
   - Limit to reasonable date ranges
   - Paginate CSV output if >100k rows
   - Stream response for memory efficiency
*/

// ============================================================================
// INTEGRATION COMPLETE
// ============================================================================

/*
Summary:
- 3 files integrated (endpoints + UI + models)
- 8 API endpoints fully functional
- Database schema complete with indexes
- Event tracking framework established
- Dashboard visualization ready
- Export functionality working

Next Phase: Phase 12 - Mobile App
Estimated time to next phase: 5 minutes
*/
