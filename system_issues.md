# CampusQA System Issues Report

## Executive Risk Summary

Current system has multiple critical security and integrity gaps that can lead to unauthorized access, data tampering, account/session bypass, and abuse of business logic.

Most urgent problems:

- Admin route protection is likely not enforced server-side (`src/proxy.ts` is not a recognized middleware entrypoint).
- Core data operations (event CRUD, registration insert/delete) are performed directly from client code with no guaranteed server-side authorization boundary.
- Registration anti-abuse controls are weak/easy to bypass (client cookie + IP checks).
- OAuth tokens for Google Calendar are stored in cookies without explicit hardened cookie flags.
- Missing in-repo DB schema/RLS for critical tables (`events`, `registrations`) creates unknown trust boundaries.
- Incremental SQL upgrades in `Databases/` introduce policy and migration drift risks that can silently weaken security.

---

## Critical Findings (Urgent)

### 1) Admin access control likely not active at edge/server
- File: `src/proxy.ts`
- Issue: Logic appears intended for middleware (`matcher: ['/admin/:path*']`) but no `middleware.ts` entrypoint exists.
- Impact: Unauthorized users may access admin routes if client-side checks are bypassed or delayed.
- Risk type: Authentication/Authorization failure

### 2) No trustworthy server-side authorization boundary for admin mutations
- Files: `src/app/admin/page.tsx`, `src/app/admin/events/new/page.tsx`, `src/app/admin/events/[id]/page.tsx`
- Issue: Admin writes occur from browser client to Supabase directly.
- Impact: If RLS is weak/missing, unauthorized actors can modify/delete events.
- Risk type: Privilege escalation, data integrity compromise

### 3) Registration cancellation can be abused if policies are weak
- File: `src/components/CancelTimer.tsx`
- Issue: Deletes registration by ID from client side.
- Impact: With permissive policies, users could delete other users' registrations.
- Risk type: Unauthorized destructive action

### 4) Missing verifiable schema + RLS source of truth for core tables
- Files/folders: `supabase/migrations/`, `src/lib/database.types.ts`
- Issue: Repo includes migration for `newsletter_subscriptions` only; core tables depend on out-of-repo/unknown definitions.
- Impact: Security posture and data controls cannot be audited/reproduced.
- Risk type: Configuration drift, audit failure

### 5) RLS delete policy allows broad deletion of recent registrations
- Files: `Databases/supabase-migration.sql`, `Databases/supabase-linter-fixes.sql`
- Issue: Policy `"Users can cancel their own registration"` uses only `created_at >= now() - interval ...` and does not bind row ownership or a cancellation token.
- Impact: Any actor that can issue a delete and knows/obtains registration IDs can delete other users' recent registrations.
- Risk type: Unauthorized destructive action

---

## High Severity Findings

### 6) Duplicate/abuse prevention is weak and bypassable
- File: `src/components/RegistrationForm.tsx`
- Issue: Relies on editable client cookie (`campus_registered_events`) and IP uniqueness checks.
- Impact: Easy to bypass with cookie resets/VPN/proxy rotation; also false positives on shared networks.
- Risk type: Business logic abuse, spam/fairness failure

### 7) Google OAuth token cookie hardening unclear/inadequate
- Files: `src/app/api/calendar/callback/route.ts`, `src/app/api/calendar/add-attendees/route.ts`
- Issue: Cookies are set without explicit secure flags visible in code (`httpOnly`, `secure`, strict `sameSite`).
- Impact: Token theft/reuse risk if defaults or deployment settings are weak.
- Risk type: Credential/token compromise

### 8) Overbroad token lifecycle controls for Google integration
- Files: Calendar auth/callback/add-attendees routes
- Issue: Refresh token storage and lifecycle controls are minimal.
- Impact: Longer blast radius if token leakage occurs.
- Risk type: Third-party account misuse

### 9) Potential CSRF exposure on cookie-authenticated state-changing routes
- Files: `/api/calendar/*` handlers
- Issue: No explicit CSRF protection visible for cookie-authenticated actions.
- Impact: Forged cross-site requests may trigger unintended actions.
- Risk type: Request forgery

### 10) Service-role usage in public API path needs strict abuse controls
- File: `src/app/api/subscribe/route.ts`
- Issue: Uses `SUPABASE_SERVICE_ROLE_KEY` in request path reachable from public site.
- Impact: Abuse can amplify cost/data poisoning if not rate-limited and validated.
- Risk type: Abuse amplification, operational risk

---

## Medium Severity Findings

### 11) Session model inconsistency (security vs UX)
- File: `src/components/AdminSessionGuard.tsx`
- Issue: Inactivity logout is client-side UX control, not a robust security control.
- Impact: False confidence if treated as primary protection.

### 12) Missing rate limiting and anti-automation controls
- Files: subscription and calendar API handlers; registration flow
- Issue: No visible server-side throttling/challenge controls.
- Impact: DoS/spam/bruteforce pressure and higher third-party cost risk.

### 13) Error handling may leak internals
- Files: various UI/API handlers
- Issue: Raw backend errors are surfaced in some paths.
- Impact: Attackers gain implementation hints.

### 14) Missing legal pages linked in footer
- File: `src/components/Footer.tsx`
- Issue: Links to `/privacy` and `/terms` but pages are missing.
- Impact: Compliance and trust risk.

### 15) Database typing/schema drift risk
- File: `src/lib/database.types.ts`
- Issue: Placeholder types do not reflect real schema.
- Impact: Runtime mismatch risks and weaker refactor safety.

### 16) Migration idempotency and ordering gaps in `Databases/`
- Files: `Databases/supabase-duplicate-prevention.sql`, `Databases/supabase-upgrade-v2.sql`, `Databases/supabase-upgrade-v3.sql`, `Databases/supabase-upgrade-v4.sql`
- Issue: Incremental scripts are not fully idempotent (constraint adds without existence guards), and are not tracked in `supabase/migrations/`.
- Impact: Re-runs can fail or partially apply; environments can diverge in security behavior.

### 17) Public registration SELECT policy exposes PII broadly
- Files: `Databases/supabase-migration.sql`
- Issue: Policy `"Registrations are viewable by everyone"` allows global read of registration rows (names, email, phone fields).
- Impact: Personal data exposure risk and likely compliance violation.

### 18) Event open/archive controls are mostly UI-enforced, not policy-enforced
- Files: `Databases/supabase-upgrade-v2.sql`, `Databases/supabase-upgrade-v3.sql`, `Databases/supabase-upgrade-v4.sql`
- Issue: DB triggers enforce capacity/time window, but registration validity against `is_open` and `is_archived` is not guaranteed at policy/trigger level.
- Impact: Direct API/DB calls may bypass UI gating and register on logically closed events.

---

## Low Severity / Operational Red Flags

- N+1 style registration counting in list views may degrade under scale (availability concern).
- Some scaffolding/legacy integration code may confuse maintenance and secure design decisions.

---

## Immediate Remediation Plan

### P0 (same day)
- Implement proper Next middleware entrypoint (`middleware.ts`) for admin route protection.
- Enforce strict RLS for `events` and `registrations` with role/ownership checks.
- Move sensitive mutations to server-side handlers with explicit authorization checks.
- Harden OAuth token cookies (`httpOnly`, `secure`, strict `sameSite`, minimal scope/lifetime).
- Replace permissive registration DELETE and SELECT policies with least-privilege alternatives.

### P1 (1-3 days)
- Add CSRF defenses for cookie-authenticated state-changing endpoints.
- Add rate limiting and anti-bot controls (registration/subscribe/calendar routes).
- Remove security dependence on client cookies; enforce constraints in DB/server.
- Standardize sanitized error responses.

### P2 (this sprint)
- Add complete migrations for `events` and `registrations` (constraints, indexes, RLS, triggers).
- Generate and maintain typed DB models from schema.
- Add audit logging for admin actions (open/close/archive/delete).
- Implement `privacy` and `terms` pages and any required consent records.
- Move all `Databases/*.sql` scripts into versioned `supabase/migrations/` with deterministic order and idempotent guards.

---

## Validation Gaps / Residual Risk

This report is based on repository inspection only. Final assurance requires:

- Live Supabase policy audit (RLS/policies/triggers in production).
- Runtime endpoint abuse testing (authz, CSRF, rate limits).
- Token/cookie security verification in deployed environment.
- Dependency and secret handling review in CI/CD.
- Data privacy review for registration fields exposed by current RLS SELECT policy.
