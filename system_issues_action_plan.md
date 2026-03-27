# CampusQA System Issues Action Plan

## Scope

This plan translates `system_issues.md` into concrete implementation tasks, including exact code/database changes, owner mapping, and effort estimates.

Effort scale:
- `S` = 0.5 day
- `M` = 1-2 days
- `L` = 3-5 days

---

## Owners

- **App Engineer (Frontend/Next.js):** Next.js routes, middleware, UI/API wiring
- **Backend/Supabase Engineer:** SQL migrations, RLS, triggers, RPC/functions
- **Security Engineer:** cookie/session policy, CSRF, abuse controls, verification
- **DevOps Engineer:** env/secrets, deployment config, monitoring, rate-limit infra
- **QA Engineer:** regression/security test execution

---

## Phase 0 (Immediate Blocking Risks)

## Task 0.1 - Enforce admin auth in real Next middleware
- **Priority:** P0
- **Owner:** App Engineer
- **Effort:** `S`
- **Current issue:** `src/proxy.ts` is not a recognized Next middleware entrypoint.
- **Changes:**
  1. Create `src/middleware.ts`.
  2. Move logic from `src/proxy.ts` into `middleware(request: NextRequest)`.
  3. Keep matcher: `['/admin/:path*']`.
  4. Keep `/admin/login` pass-through.
  5. Use `createMiddlewareSupabaseClient(...)` from `src/lib/supabase-server.ts`.
  6. Redirect unauthenticated requests to `/admin/login`.
  7. Delete `src/proxy.ts` after verification.
- **Acceptance criteria:**
  - Visiting `/admin` while logged out redirects server-side before page render.
  - Authenticated admin session reaches all admin pages.
  - No redirect loops.

## Task 0.2 - Move privileged event writes to server-side API handlers
- **Priority:** P0
- **Owner:** App Engineer + Backend/Supabase Engineer
- **Effort:** `M`
- **Current issue:** Event create/update/delete currently done directly from browser Supabase client.
- **Changes:**
  1. Add API routes:
     - `src/app/api/admin/events/route.ts` (`POST` create)
     - `src/app/api/admin/events/[id]/route.ts` (`PATCH` update, `DELETE` remove)
  2. In each route:
     - Verify session using `createServerSupabaseClient()`.
     - Validate user has admin role (see Task 0.3 for DB role strategy).
     - Perform mutation server-side.
  3. Update client pages to call these endpoints:
     - `src/app/admin/events/new/page.tsx`
     - `src/app/admin/page.tsx`
  4. Remove direct client `.insert/.update/.delete` for `events`.
- **Acceptance criteria:**
  - Browser client cannot directly mutate `events` table.
  - Non-admin authenticated users receive `403` from admin event APIs.

## Task 0.3 - Add and enforce admin authorization model in DB
- **Priority:** P0
- **Owner:** Backend/Supabase Engineer + Security Engineer
- **Effort:** `M`
- **Current issue:** Admin authorization relies on assumptions; no in-repo source of truth.
- **DB changes (new migration):** `supabase/migrations/<timestamp>_core_schema_and_rls.sql`
  1. Add `public.admin_users` table:
     - `user_id uuid primary key references auth.users(id) on delete cascade`
     - `created_at timestamptz default now()`
  2. Add helper SQL function:
     - `public.is_admin(uid uuid) returns boolean`
  3. Enable RLS on `events` and `registrations`.
  4. Policies for `events`:
     - `SELECT`: public read only for non-archived/open rules as required.
     - `INSERT/UPDATE/DELETE`: admin only (`is_admin(auth.uid())`).
- **Acceptance criteria:**
  - Only admin users can mutate events at DB level.
  - Admin checks do not rely on frontend conditions.

## Task 0.4 - Harden Google token cookie settings
- **Priority:** P0
- **Owner:** Security Engineer + App Engineer
- **Effort:** `S`
- **Current issue:** cookie flags not explicitly hardened.
- **Changes:**
  1. Update cookie sets in:
     - `src/app/api/calendar/callback/route.ts`
     - `src/app/api/calendar/add-attendees/route.ts`
  2. For `gcal_access_token`, `gcal_refresh_token` use:
     - `httpOnly: true`
     - `secure: true` (in production)
     - `sameSite: 'lax'` or `'strict'` (prefer strict if flow permits)
     - `path: '/api/calendar'`
  3. Reduce max-age where possible and ensure refresh token rotation policy.
- **Acceptance criteria:**
  - Cookies are not accessible via `document.cookie`.
  - Cookies only sent on intended path/context.

## Task 0.5 - Fix dangerous registration RLS policies (DELETE and SELECT)
- **Priority:** P0
- **Owner:** Backend/Supabase Engineer + Security Engineer
- **Effort:** `M`
- **Current issue:** Existing SQL in `Databases/` allows broad delete/read behavior on registrations.
- **Changes (new migration):**
  1. Drop public-read policy:
     - `DROP POLICY IF EXISTS "Registrations are viewable by everyone" ON public.registrations;`
  2. Replace with least-privilege read policy:
     - allow only admin of linked event to `SELECT` registration rows.
  3. Drop weak delete policy:
     - `DROP POLICY IF EXISTS "Users can cancel their own registration" ON public.registrations;`
  4. Reintroduce cancel via server-verified token flow (Task 1.2), and keep DB delete restricted to:
     - admin of event, or
     - backend service role via API.
- **Acceptance criteria:**
  - Anonymous/public cannot list registration PII.
  - Users cannot delete arbitrary recent rows.
  - Admin can still manage registrations for their own events.

---

## Phase 1 (Abuse Prevention and Integrity Controls)

## Task 1.1 - Replace client-only registration controls with DB-enforced constraints
- **Priority:** P1
- **Owner:** Backend/Supabase Engineer
- **Effort:** `M`
- **Current issue:** client cookie and weak constraints are easy to bypass.
- **DB changes (same/new migration):**
  1. Add unique index on `(event_id, email)`.
  2. Decide on IP strategy:
     - either remove strict `(event_id, ip_address)` uniqueness
     - or keep with exception strategy for shared networks.
  3. Add trigger/function to enforce `max_capacity` atomically at insert time.
  4. Add check constraints for `will_attend in ('YES','MAYBE')`.
- **Code changes:**
  - `src/components/RegistrationForm.tsx`: keep cookie as UX hint only; never as source of truth.
  - Normalize user-facing error messages from DB codes.
- **Acceptance criteria:**
  - Duplicate registrations are blocked by DB.
  - Over-capacity race conditions prevented.

## Task 1.5 - Enforce `is_open` and `is_archived` rules in DB layer
- **Priority:** P1
- **Owner:** Backend/Supabase Engineer
- **Effort:** `M`
- **Current issue:** Closed/archive state is mostly enforced in UI; DB allows inserts if event exists.
- **Changes:**
  1. Update registration insert policy to require:
     - event exists
     - `events.is_open = true`
     - `coalesce(events.is_archived, false) = false`
  2. Optionally add trigger guard in `check_registration_time_window()`:
     - reject insert when event closed/archived
  3. Ensure policy/trigger behavior aligns with admin reopen/restore flow.
- **Acceptance criteria:**
  - Direct DB/API inserts for closed/archived events fail.
  - UI and DB behavior match for registration eligibility.

## Task 1.2 - Secure registration cancellation path
- **Priority:** P1
- **Owner:** App Engineer + Backend/Supabase Engineer
- **Effort:** `M`
- **Current issue:** delete by id from client can be risky under weak RLS.
- **Changes:**
  1. Add API endpoint `src/app/api/registrations/cancel/route.ts`.
  2. Pass cancellation token (signed, short-lived) in success URL instead of raw trust on id.
  3. Server validates:
     - token signature and expiry (<= 60s),
     - registration id bound to token.
  4. Remove direct client delete in `src/components/CancelTimer.tsx`; call API instead.
- **Acceptance criteria:**
  - Cancellation only works for owner/token holder within allowed window.
  - Arbitrary ID deletion attempts fail.

## Task 1.3 - Add CSRF protections for state-changing API routes
- **Priority:** P1
- **Owner:** Security Engineer + App Engineer
- **Effort:** `M`
- **Changes:**
  1. Implement CSRF token issuance endpoint or double-submit cookie approach.
  2. Validate CSRF token on:
     - `/api/calendar/add-attendees`
     - `/api/admin/events*`
     - `/api/registrations/cancel`
  3. Reject missing/invalid token with `403`.
- **Acceptance criteria:**
  - Cross-origin forged requests to protected routes fail consistently.

## Task 1.4 - Add rate limiting and bot protection
- **Priority:** P1
- **Owner:** DevOps Engineer + Security Engineer
- **Effort:** `M`
- **Changes:**
  1. Add request throttling middleware/utility for:
     - `/api/subscribe`
     - `/api/calendar/*`
     - registration submit endpoint (if moved server-side)
  2. Add optional CAPTCHA/challenge on high-risk public forms.
  3. Add structured logs for blocked attempts.
- **Acceptance criteria:**
  - Burst abuse is throttled.
  - Repeated offender fingerprints/IPs are constrained.

---

## Phase 2 (Schema Completeness, Compliance, and Observability)

## Task 2.1 - Version full core schema in migrations
- **Priority:** P2
- **Owner:** Backend/Supabase Engineer
- **Effort:** `L`
- **Changes:**
  1. Add migrations for complete `events` and `registrations` schema.
  2. Include indexes:
     - `registrations(event_id)`
     - `events(start_timestamp)`
     - `events(is_open, is_archived)`
  3. Include all RLS policies and functions in SQL.
- **Acceptance criteria:**
  - Fresh project bootstrap from migrations only is possible.
  - No manual dashboard-only schema steps required.

## Task 2.5 - Normalize incremental SQL history into canonical migrations
- **Priority:** P2
- **Owner:** Backend/Supabase Engineer
- **Effort:** `M`
- **Current issue:** `Databases/*.sql` contains upgrade scripts outside Supabase migration chain.
- **Changes:**
  1. Create ordered migration files under `supabase/migrations/` that fully represent:
     - base schema (`events`, `registrations`)
     - upgrades v2/v3/v4 (`start_timestamp`, `is_open`, `is_archived`)
     - linter/policy fixes
  2. Add idempotent guards:
     - `IF NOT EXISTS` for types/indexes/columns
     - constraint existence checks before add/drop
  3. Mark `Databases/` files as legacy reference or remove after migration parity is confirmed.
- **Acceptance criteria:**
  - New environments can be provisioned with one deterministic migration chain.
  - Re-running migrations does not fail due to duplicate constraints/types.

## Task 2.2 - Generate and enforce typed DB models
- **Priority:** P2
- **Owner:** Backend/Supabase Engineer + App Engineer
- **Effort:** `S`
- **Changes:**
  1. Generate Supabase types and replace placeholder:
     - update `src/lib/database.types.ts`
  2. Type Supabase clients with generated `Database`.
- **Acceptance criteria:**
  - Compile-time errors surface schema drift.

## Task 2.3 - Add audit logs for admin actions
- **Priority:** P2
- **Owner:** Backend/Supabase Engineer
- **Effort:** `M`
- **Changes:**
  1. Add `admin_audit_logs` table.
  2. Log create/update/archive/delete event actions with actor id + timestamp + payload.
  3. Write logs from admin API handlers.
- **Acceptance criteria:**
  - Every admin mutation has immutable audit record.

## Task 2.4 - Add legal pages linked in footer
- **Priority:** P2
- **Owner:** App Engineer + Product/Legal
- **Effort:** `S`
- **Changes:**
  1. Create:
     - `src/app/privacy/page.tsx`
     - `src/app/terms/page.tsx`
  2. Keep links in `src/components/Footer.tsx`.
- **Acceptance criteria:**
  - No 404 on legal links.

---

## Recommended SQL Blueprint (Minimum)

Add to migration:

1. `events` table with:
- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `description text null`
- `type text not null check (type in ('orientation','tutorial','live_qa'))`
- `event_date timestamptz null`
- `start_timestamp timestamptz null`
- `max_capacity int not null check (max_capacity > 0)`
- `meet_url text null`
- `admin_id uuid null references auth.users(id)`
- `is_open boolean not null default true`
- `is_archived boolean not null default false`
- `created_at timestamptz not null default now()`

2. `registrations` table with:
- `id uuid primary key default gen_random_uuid()`
- `event_id uuid not null references events(id) on delete cascade`
- `first_name text not null`
- `last_name text not null`
- `email text not null`
- `contact_number text null`
- `whatsapp_number text null`
- `year_of_study int null`
- `program_name text null`
- `will_attend text not null check (will_attend in ('YES','MAYBE'))`
- `ip_address text null`
- `created_at timestamptz not null default now()`

3. Constraints/indexes:
- unique `(event_id, email)`
- index on `registrations(event_id)`
- index on `events(start_timestamp)`

4. Trigger function:
- before insert on `registrations`, reject when current count >= `events.max_capacity`.

5. RLS policies:
- strict write policies for admins only on `events`
- controlled insert/select/delete policies for `registrations` via server path or tokenized flow
- no public policy granting `SELECT` of registration PII
- no generic time-window delete policy without ownership/token binding

---

## QA and Verification Checklist

- **AuthZ tests**
  - logged-out user blocked from `/admin/*`
  - non-admin blocked from admin APIs
  - admin permitted
- **Registration integrity tests**
  - duplicate email per event blocked
  - over-capacity insert blocked under concurrent requests
  - cancellation fails after 60 seconds
- **Security tests**
  - CSRF attempts blocked on protected routes
  - token cookies are `httpOnly` + secure flags in production
  - rate limits trigger under abuse bursts
- **Regression tests**
  - full happy-path user registration
  - admin create/update/archive/delete flow
  - calendar add-attendees flow remains functional

---

## Delivery Timeline (Suggested)

- **Day 1:** Tasks 0.1, 0.4
- **Day 2-3:** Tasks 0.2, 0.3
- **Day 4-5:** Tasks 1.1, 1.2
- **Day 6-7:** Tasks 1.3, 1.4
- **Week 2:** Tasks 2.1 to 2.4 + full QA pass

---

## Definition of Done

System is considered hardened when:
- Admin access is protected by real middleware and server-side authorization.
- All critical writes are server-side and policy-enforced at DB layer.
- Registration abuse controls are DB-backed and race-safe.
- OAuth/session tokens are securely scoped and protected.
- CSRF/rate-limiting protections are active and tested.
- Core schema and RLS are fully versioned in migrations.
- Security and regression test suite passes in staging before production rollout.
