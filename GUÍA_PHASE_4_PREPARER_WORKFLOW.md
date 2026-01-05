# 🎯 PHASE 4: PREPARER WORKFLOW API - INTEGRATION GUIDE

**Status**: ✅ READY_TO_COPY  
**Estimated Integration Time**: 45 minutes  
**Complexity**: Medium  
**Priority**: High (Core feature for preparers)

---

## 📋 Overview

Phase 4 adds complete preparer workflow management to NovaSolutionTax:
- **Queue management** (assigned/unassigned returns)
- **Return assignment** (CPA assigns to preparers)
- **Workflow tracking** (3-step process: Extract → Review → Approve)
- **Approval/Rejection** (CPA approves or rejects)
- **Metrics dashboard** (KPIs for preparer performance)

**Total Code**: 1,650+ lines
- **Backend**: 550 lines (6 endpoints)
- **Frontend**: 800 lines (3 React components)
- **Documentation**: 300+ lines

---

## 🔧 Part 1: Backend Integration (15 minutes)

### Step 1.1: Add Approval Model to Prisma Schema

**File**: `apps/api/prisma/schema.prisma`

Add this model after TaxReturn:

```prisma
model Approval {
  id                  String    @id @default(cuid())
  returnId            String
  return              TaxReturn @relation(fields: [returnId], references: [id], onDelete: Cascade)
  userId              String
  user                User      @relation(fields: [userId], references: [id])
  status              String    // APPROVED, REJECTED, PENDING
  comments            String?
  rejectionReason     String?
  approvedAt          DateTime  @default(now())
  organizationId      String
  organization        Organization @relation(fields: [organizationId], references: [id])
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([returnId])
  @@index([userId])
  @@index([organizationId])
}
```

Update TaxReturn model to add relation:

```prisma
model TaxReturn {
  // ... existing fields ...
  approvals           Approval[]
  assignedAt          DateTime?
  completedAt         DateTime?
}
```

Update User model to add relation:

```prisma
model User {
  // ... existing fields ...
  approvals           Approval[]
}
```

Update Organization model:

```prisma
model Organization {
  // ... existing fields ...
  approvals           Approval[]
}
```

### Step 1.2: Create and Run Migration

```bash
cd apps/api
npx prisma migrate dev --name add_approval_model
# Migration name suggestion: "add_approval_model"
```

### Step 1.3: Add Endpoints to Express Server

**File**: `apps/api/src/index.ts`

Find `app.listen()` and add these endpoints BEFORE it (around line 50-100):

1. Copy entire content from: `READY_TO_COPY_PREPARER_endpoints.ts`
2. Paste before `app.listen()`
3. Verify imports at top of file:

```typescript
import { prisma } from '@novasolutiontax/db';
import { TaxCalculator } from '@novasolutiontax/core';
```

**Verification**:
- All 6 endpoints compile without errors
- No TypeScript warnings (strict mode)
- All routes follow pattern: `/api/preparers/:preparerId/...`

### Step 1.4: Test Endpoints (Optional)

```bash
# Terminal: Start server
cd apps/api
npm run dev

# Terminal 2: Test queue endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/preparers/prep-123/queue

# Expected response:
# {
#   "total": 45,
#   "assigned": 32,
#   "unassigned": 13,
#   "page": 1,
#   "returns": [...]
# }
```

**Quick Testing Checklist**:
- [ ] GET /queue returns 200 with correct structure
- [ ] POST /assign successfully assigns return
- [ ] GET /workflow-status returns workflow data
- [ ] PUT /approve marks return as COMPLETED
- [ ] PUT /reject marks return as IN_PROGRESS
- [ ] GET /metrics returns KPI data

---

## 🎨 Part 2: Frontend Integration (20 minutes)

### Step 2.1: Add PrepareQueuePage Component

**File**: `apps/web/src/app/preparer/queue.tsx`

1. Create directory if not exists: `apps/web/src/app/preparer/`
2. Create file: `queue.tsx`
3. Copy entire content from: `READY_TO_COPY_PrepareQueuePage.tsx`

**Key Implementation Points**:
- Component fetches queue on mount
- Tabs: Assigned (for all preparers) / Unassigned (CPA only)
- Search, filter, sort functionality
- Pagination support (20 items per page)
- Real-time status indicators

### Step 2.2: Add WorkflowCard Component

**File**: `apps/web/src/components/WorkflowCard.tsx`

1. Copy entire content from: `READY_TO_COPY_WorkflowCard.tsx`
2. Import in return detail page:

```typescript
import WorkflowCard from '@/components/WorkflowCard';

// In your return detail page:
<WorkflowCard returnId={returnId} />
```

**Key Implementation Points**:
- 3-step workflow visualization
- Real-time status updates (30-second refresh)
- Expandable details section
- Urgent deadline highlighting (red if < 7 days)

### Step 2.3: Add MetricsDashboard Component

**File**: `apps/web/src/components/MetricsDashboard.tsx`

1. Copy entire content from: `READY_TO_COPY_MetricsDashboard.tsx`
2. Import in preparer dashboard:

```typescript
import MetricsDashboard from '@/components/MetricsDashboard';

// In your dashboard page:
<MetricsDashboard preparerId={userId} />
```

**Key Implementation Points**:
- 4 primary KPI cards (Total, Completion Rate, Avg Time, Quality)
- Secondary metrics (Approval/Rejection rates)
- This month summary
- Performance vs targets
- Auto-refresh every 60 seconds

### Step 2.4: Add Routes to Next.js Router

**File**: `apps/web/src/app/preparer/_layout.tsx` (or your router config)

```typescript
// Add these routes:
- /preparer/queue                    → PrepareQueuePage
- /preparer/dashboard                → Dashboard with MetricsDashboard
- /preparer/returns/:id              → Return detail with WorkflowCard
- /preparer/returns/:id/approve      → Approval page
- /preparer/returns/:id/reject       → Rejection page
```

**Example Next.js App Router Structure**:

```
apps/web/src/app/preparer/
├── layout.tsx                 (with role check)
├── queue.tsx                  (PrepareQueuePage)
├── dashboard.tsx              (MetricsDashboard)
├── returns/
│   └── [id]/
│       ├── page.tsx           (WorkflowCard)
│       ├── approve/
│       │   └── page.tsx       (Approve UI)
│       └── reject/
│           └── page.tsx       (Reject UI)
```

---

## 🔌 Part 3: UI Integration (10 minutes)

### Step 3.1: Add Navigation Links

**File**: `apps/web/src/components/Navigation.tsx` (or your nav component)

Add for authenticated preparers/CPAs:

```typescript
{userRole === 'preparer' || userRole === 'cpa' ? (
  <a href="/preparer/queue" className="nav-link">
    My Queue
  </a>
) : null}

{userRole === 'preparer' || userRole === 'cpa' ? (
  <a href="/preparer/dashboard" className="nav-link">
    Dashboard
  </a>
) : null}
```

### Step 3.2: Add to Main Dashboard

Update your dashboard to include metrics:

```typescript
// apps/web/src/app/dashboard.tsx
import MetricsDashboard from '@/components/MetricsDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* Existing dashboard content */}
      
      {(user.role === 'preparer' || user.role === 'cpa') && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Your Performance</h2>
          <MetricsDashboard preparerId={user.id} />
        </section>
      )}
    </div>
  );
}
```

### Step 3.3: Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_TOKEN_NAME=token
```

---

## ✅ Testing Checklist

### Backend Testing

- [ ] **Queue Endpoint**: GET /api/preparers/:id/queue
  - Returns paginated list of returns
  - Filters work (status, priority)
  - Pagination works
  - Stats are accurate

- [ ] **Assign Endpoint**: POST /api/preparers/:id/assign
  - Only CPA/Admin can assign
  - Return changes to IN_PROGRESS
  - AuditLog entry created
  - Returns error if already assigned

- [ ] **Workflow Status**: GET /api/returns/:id/workflow-status
  - Returns 3-step workflow
  - Completion % calculated correctly
  - Field changes counted correctly
  - Approval status displayed

- [ ] **Approve Endpoint**: PUT /api/returns/:id/approve
  - Only CPA/Admin can approve
  - Status changes to COMPLETED
  - Approval record created
  - AuditLog entry created

- [ ] **Reject Endpoint**: PUT /api/returns/:id/reject
  - Requires rejection reason
  - Status back to IN_PROGRESS
  - Rejection record created
  - AuditLog entry created

- [ ] **Metrics Endpoint**: GET /api/preparers/:id/metrics
  - Completion rate calculated
  - Rejection rate calculated
  - Average review time calculated
  - This month stats accurate

### Frontend Testing

- [ ] **PrepareQueuePage**
  - Loads assigned returns
  - Search works
  - Filters work (status, priority)
  - Pagination works
  - Unassigned tab visible for CPAs
  - Assign button works for unassigned

- [ ] **WorkflowCard**
  - Displays 3 steps correctly
  - Completion % accurate
  - Field changes counted
  - Expandable details work
  - Auto-refreshes every 30 seconds
  - Red highlight for urgent (< 7 days)

- [ ] **MetricsDashboard**
  - All KPI cards display data
  - Charts render correctly
  - This month stats accurate
  - Performance vs targets shown
  - Auto-refreshes every 60 seconds

### User Flow Testing

1. **Preparer Workflow**:
   - [ ] Login as preparer
   - [ ] See queue of assigned returns
   - [ ] Click "Review" on return
   - [ ] See workflow status with 3 steps
   - [ ] Edit fields (using Phase 3 FieldEditor)
   - [ ] Return shows "In Progress"

2. **CPA Workflow**:
   - [ ] Login as CPA
   - [ ] See unassigned returns in queue
   - [ ] Assign return to preparer
   - [ ] View preparer's metrics
   - [ ] Approve or reject return
   - [ ] See metrics update

---

## 🚀 Phase 4 Enhancements (Optional)

These can be added after basic Phase 4:

1. **Bulk Assignment**: Allow CPA to assign multiple returns at once
2. **Comments on Workflow**: Add comments at each step
3. **Notifications**: Alert preparers of new assignments
4. **Auto-assignment**: Rule-based automatic assignment by specialty
5. **SLA Tracking**: Track time to completion vs SLA
6. **Performance Reports**: Monthly preparer performance reports

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                  PREPARER WORKFLOW                  │
└─────────────────────────────────────────────────────┘

Client Upload
     ↓
Phase 1: Document Extraction
     ↓
Phase 3: Field Editing + Audit Trail
     ↓
Phase 4: Preparer Workflow ← YOU ARE HERE
     ├─→ Queue Management (GET /queue)
     ├─→ Assignment (POST /assign)
     ├─→ Workflow Status (GET /workflow-status)
     ├─→ Approval (PUT /approve)
     ├─→ Rejection (PUT /reject)
     └─→ Metrics (GET /metrics)
     ↓
Phase 5: Billing + Stripe (next)
     ↓
E-filing & Completion
```

---

## 🔐 Security Checklist

- [ ] Only CPAs/Admins can assign returns
- [ ] Only CPAs/Admins can approve/reject returns
- [ ] Preparers can only see their own assigned returns
- [ ] Multi-tenant isolation enforced
- [ ] JWT validation on all endpoints
- [ ] Role-based access control (RBAC) implemented
- [ ] Audit logs created for all changes
- [ ] All inputs validated and sanitized

---

## 📱 Component Dependencies

```
PrepareQueuePage
├── No child components (standalone page)
├── Uses: @heroicons/react

WorkflowCard
├── No child components
├── Uses: @heroicons/react
└── Auto-refresh: 30 seconds

MetricsDashboard
├── No child components
├── Uses: @heroicons/react
└── Auto-refresh: 60 seconds
```

---

## 🎯 Next Steps

1. ✅ Complete Phase 4 integration (this document)
2. 📋 Test all endpoints and UI flows
3. 🔄 Run through user flows with test data
4. 📊 Verify metrics are accurate
5. 🚀 Deploy to staging
6. ✨ Proceed to Phase 5: Billing + Stripe API

---

## 💡 Pro Tips

1. **Performance**: Metrics endpoint uses caching with 60-second refresh
2. **Mobile**: All components are responsive (mobile-first)
3. **Accessibility**: All components include ARIA labels and keyboard navigation
4. **Error Handling**: Comprehensive try-catch blocks with user-friendly messages
5. **Type Safety**: 100% TypeScript with strict mode

---

## 🆘 Troubleshooting

### Queue not showing returns
**Solution**: Verify `assignedToPreparer` field is set in TaxReturn table

### Approve/Reject endpoints failing
**Solution**: Ensure Approval model is created and migration is run

### Metrics showing zeros
**Solution**: Check that returns have proper status and timestamps

### Components not rendering
**Solution**: Verify @heroicons/react is installed: `npm install @heroicons/react`

---

## 📞 Support

**Questions?** Check:
1. Endpoint response format in code comments
2. Component prop requirements
3. Error messages in browser console
4. API logs: `tail -f apps/api/logs/*.log`

---

**Integration Status**: Ready to begin  
**Last Updated**: 2026-01-04  
**Version**: Phase 4 v1.0  
