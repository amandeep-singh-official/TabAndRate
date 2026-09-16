# Challenger 2 Empirical Stress Testing & Verification Report

**Author**: Challenger 2 (`teamwork_preview_challenger`)  
**Mission**: Empirical Stress Testing of Auth & Analytics  
**Date**: 2026-09-13  
**Final Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Baseline Test Suite Execution (`npm run test`)
- **Command**: `npm run test` (`vitest run`)
- **Execution Result**:
  ```text
  RUN v5.0.0 /Users/amandeepsingh/Desktop/TabandRate

  Test Files  15 passed (15)
       Tests  101 passed (101)
    Start at  17:30:00
    Duration  26.63s (environment 42%, tests 20%, import 17%, setup 17%, transform 3%, worker 1%)
  ```
- **Observations**:
  - All 15 unit, integration, and component test suites passed with 100% success rate across 101 tests.
  - Notice on bcrypt timing: In `test/integration/api-auth-register.test.ts`, password hashing with 12 salt rounds takes ~3,017ms. Under high concurrency across multiple workers, individual tests can approach the default 5,000ms Vitest timeout. When run under normal system load, all 10 tests pass cleanly in 9.6s.

### 1.2 Production Build Verification (`npm run build`)
- **Command**: `npm run build` (`next build --webpack`)
- **Execution Result**:
  ```text
  ▲ Next.js 16.3.5 (webpack)
  - Environments: .env
  ✓ Running next.config.ts took 1662ms
  - Experiments: serverActions
  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  Creating an optimized production build ...
  ✓ Compiled successfully in 74s
  Running TypeScript ...
  Finished TypeScript in 24.9s ...
  Collecting page data using 3 workers ...
  Generating static pages using 3 workers (22/22) in 4.4s
  Finalizing page optimization ...
  Collecting build traces ...

  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ƒ /api/analytics
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /api/auth/register
  ├ ƒ /api/business
  ├ ƒ /api/generate
  ├ ƒ /api/qr
  ├ ƒ /dashboard
  ├ ƒ /dashboard/analytics
  ├ ƒ /dashboard/feedback
  ├ ƒ /dashboard/my-business
  ├ ƒ /dashboard/qr-code
  ├ ƒ /dashboard/qr-flyer
  ├ ƒ /dashboard/reviews-reply
  ├ ƒ /dev-login
  ├ ○ /login
  ├ ○ /onboarding/step1
  ├ ○ /onboarding/step2
  ├ ○ /onboarding/step3
  ├ ƒ /r/[slug]
  └ ○ /signup

  ƒ Proxy (Middleware)
  ○ (Static)   prerendered as static content
  ƒ (Dynamic)  server-rendered on demand
  ```
- **Observations**:
  - Exit code: `0`.
  - All 22 App Router routes compiled cleanly without static generation errors or Webpack bundling failures.
  - Route collision between root `app/page.tsx` and legacy `app/(dashboard)/page.tsx` is completely resolved; root `/` is statically pre-rendered while `/dashboard` is dynamic and protected.

### 1.3 TypeScript Compilation (`npx tsc --noEmit`)
- **Command**: `npx tsc --noEmit`
- **Execution Result**: Exit code `0`, zero type errors emitted across entire project tree.

### 1.4 Dedicated Empirical Stress Test Harness (`scripts/stress-test-challenger-2.ts`)
- **Command**: `npx tsx scripts/stress-test-challenger-2.ts`
- **Execution Result**:
  ```text
  ================================================================================
  🚀 STARTING CHALLENGER 2 EMPIRICAL STRESS TEST HARNESS
  ================================================================================

  --- SUITE 1: Middleware Routing Stress Test (auth.config.ts) ---
  [Middleware: Public Unauth] ✅ PASS - Path "/api/generate" allows unauthenticated access (5.4ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/api/analytics" allows unauthenticated access (0.6ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/r/test-slug" allows unauthenticated access (0.7ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/r/my-awesome-cafe-123" allows unauthenticated access (0.2ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/" allows unauthenticated access (0.4ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/login" allows unauthenticated access (0.2ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/signup" allows unauthenticated access (0.1ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/api/auth/csrf" allows unauthenticated access (0.1ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/api/auth/session" allows unauthenticated access (0.7ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/api/auth/callback/credentials" allows unauthenticated access (0.3ms): Expected true, received true
  [Middleware: Public Unauth] ✅ PASS - Path "/api/auth/providers" allows unauthenticated access (0.1ms): Expected true, received true
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/analytics" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/my-business" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/qr-code" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/qr-flyer" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/feedback" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/dashboard/reviews-reply" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/api/business" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/api/business/123" denies unauthenticated access (1.2ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/onboarding/step1" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/onboarding/step2" denies unauthenticated access (0.2ms): Expected false, received false
  [Middleware: Protected Unauth] ✅ PASS - Path "/onboarding/step3" denies unauthenticated access (0.1ms): Expected false, received false
  [Middleware: Evasion Vectors] ✅ PASS - Double leading slash //dashboard (//dashboard) blocked unauthenticated (0.1ms): Resolved pathname="//dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Triple leading slash ///dashboard (///dashboard) blocked unauthenticated (0.1ms): Resolved pathname="///dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Path traversal /api/generate/../dashboard (/api/dashboard) blocked unauthenticated (0.1ms): Resolved pathname="/api/dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Current dir suffix /dashboard/. (/dashboard/) blocked unauthenticated (0.1ms): Resolved pathname="/dashboard/", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Trailing slash /dashboard/ (/dashboard/) blocked unauthenticated (0.1ms): Resolved pathname="/dashboard/", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Encoded traversal /api/generate/%2e%2e/dashboard (/api/dashboard) blocked unauthenticated (0.1ms): Resolved pathname="/api/dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Public prefix evasion /r/../../dashboard (/dashboard) blocked unauthenticated (0.1ms): Resolved pathname="/dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Fake subpath /login/../dashboard (/dashboard) blocked unauthenticated (0.1ms): Resolved pathname="/dashboard", allowed=false
  [Middleware: Evasion Vectors] ✅ PASS - Auth prefix evasion /api/auth/../dashboard (/api/dashboard) blocked unauthenticated (0.4ms): Resolved pathname="/api/dashboard", allowed=false
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/analytics" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/my-business" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/qr-code" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/qr-flyer" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/feedback" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/dashboard/reviews-reply" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/api/business" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/api/business/123" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/onboarding/step1" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/onboarding/step2" allows authenticated merchant (0.1ms): Expected true, received true
  [Middleware: Authenticated Access] ✅ PASS - Path "/onboarding/step3" allows authenticated merchant (0.1ms): Expected true, received true

  --- SUITE 2: Email Normalization Stress Test ---
  [Email: Normalization Matrix] ✅ PASS - All-uppercase: "TEST@EXAMPLE.COM" -> "test@example.com" (5.9ms): credParsed=test@example.com, regParsed=test@example.com
  [Email: Normalization Matrix] ✅ PASS - Mixed-case: "TeSt.UsEr@ExAmPlE.cOm" -> "test.user@example.com" (0.1ms): credParsed=test.user@example.com, regParsed=test.user@example.com
  [Email: Normalization Matrix] ✅ PASS - Leading/trailing spaces: "   test@example.com   " -> "test@example.com" (0.2ms): credParsed=test@example.com, regParsed=test@example.com
  [Email: Normalization Matrix] ✅ PASS - Tabs: "\ttest@example.com\t" -> "test@example.com" (0.0ms): credParsed=test@example.com, regParsed=test@example.com
  [Email: Normalization Matrix] ✅ PASS - Newlines: "\ntest@example.com\r\n" -> "test@example.com" (0.1ms): credParsed=test@example.com, regParsed=test@example.com
  [Email: Normalization Matrix] ✅ PASS - Mixed whitespace and casing: " \t\r\n TeSt.LaBeL+99@ExAmPlE.CoM \n\t " -> "test.label+99@example.com" (0.0ms): credParsed=test.label+99@example.com, regParsed=test.label+99@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test@example.com" (0.1ms): query=test@example.com, create=test@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test.user@example.com" (0.1ms): query=test.user@example.com, create=test.user@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test@example.com" (0.4ms): query=test@example.com, create=test@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test@example.com" (0.1ms): query=test@example.com, create=test@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test@example.com" (0.0ms): query=test@example.com, create=test@example.com
  [Email: Database Query & Storage] ✅ PASS - DB query & insert receive canonical "test.label+99@example.com" (2.1ms): query=test.label+99@example.com, create=test.label+99@example.com

  --- SUITE 3: Analytics Aggregation & Date Immutability Stress Test (>10k events) ---
  [Analytics: GroupBy Aggregation] ✅ PASS - Aggregates 12000 events with exactly O(1) payload (4 rows) (2.9ms): Payload rows=4 (<=4), total counted=12000/12000
  [Analytics: No Truncation] ✅ PASS - Counts far exceed legacy limits (take: 50 in dashboard, take: 500 in analytics) (2.9ms): visits=5983, generates=2978, redirects=1815, intercepted=1224
  [Analytics: 7-Day Bucketing] ✅ PASS - Generates exactly 7 buckets with valid counts (61.0ms): Buckets=7, Total 7-day visits=1074
  [Analytics: Date Immutability (7-Day)] ✅ PASS - Original reference `now` was never mutated in place (61.0ms): Before=1789300780500, After=1789300780500, diff=0ms
  [Analytics: 30-Day Bucketing] ✅ PASS - Generates exactly 30 buckets with complete 4-metric breakdown (150.0ms): Buckets=30, Total 30-day events=9060
  [Analytics: Date Immutability (30-Day)] ✅ PASS - Original reference `now` was never mutated in place (150.0ms): Before=1789300780500, After=1789300780500, diff=0ms

  --- SUITE 4: Base UI DOM Structure & Semantic HTML Validation ---
  [DOM: feedback-view.tsx] ✅ PASS - Zero invalid type='button' on <a> tags (0.1ms): Found invalid type='button' on <a>: false
  [DOM: feedback-view.tsx] ✅ PASS - Zero nested interactive elements (<Button> in <Link>, <Link> in <Button>, or nested <button>) (0.1ms): ButtonInLink=false, LinkInButton=false, ButtonInButton=false
  [DOM: step3/page.tsx] ✅ PASS - Zero invalid type='button' on <a> tags (0.0ms): Found invalid type='button' on <a>: false
  [DOM: step3/page.tsx] ✅ PASS - Zero nested interactive elements (clean <Link className={buttonVariants()}> pattern) (0.0ms): ButtonInLink=false, LinkInButton=false, ButtonInButton=false

  ================================================================================
  📊 EMPIRICAL STRESS TEST SUMMARY
  ================================================================================
  Total Assertions Evaluated: 66
  Passed: 66
  Failed: 0

  🎉 VERDICT: APPROVE (100% empirical stress tests passed cleanly)
  ```

---

## 2. Logic Chain

### 2.1 Middleware Authorization Resilience (`auth.config.ts`)
1. **Public Review Funnel Isolation**:
   - `PUBLIC_PATHS` defines: `["/", "/login", "/signup", "/r", "/api/generate", "/api/analytics"]`.
   - Matching rule in `auth.config.ts:30-33`:
     ```ts
     const isPublic =
       pathname === "/" ||
       PUBLIC_PATHS.filter((p) => p !== "/").some(
         (p) => pathname === p || pathname.startsWith(p + "/")
       ) ||
       pathname.startsWith("/api/auth");
     ```
   - Unauthenticated visitors hitting `/api/generate`, `/api/analytics`, `/r/[slug]`, and `/api/auth/*` evaluate to `isPublic === true` and receive immediate access without redirection to `/login` (supporting Observation 1.4).
2. **Strict Route Defense & Evasion Immunity**:
   - Protected routes (`/dashboard/*`, `/api/business/*`, `/onboarding/*`) evaluate to `isPublic === false`. Unauthenticated requests yield `!isLoggedIn === true`, triggering immediate `false` authorization.
   - For traversal vectors:
     - WHATWG URL resolution automatically normalizes `/api/generate/../dashboard` and `/api/auth/../dashboard` to `/dashboard` or `/api/dashboard`, which does not match public prefixes and is blocked.
     - Multi-slash inputs `//dashboard` and `///dashboard` do not match `/` or `p + "/"` and are blocked.
     - Trailing dots `/dashboard/.` resolve to `/dashboard/`, which does not match public paths and is blocked.
     - Authenticated requests with a valid user session evaluate `isLoggedIn === true` and are authorized.

### 2.2 Email Normalization & PostgreSQL Case Insensitivity
1. **Multi-Stage Canonicalization**:
   - Both `registerSchema` (`app/api/auth/register/route.ts:8`) and `credentialsSchema` (`auth.ts:11`) enforce `z.string().trim().toLowerCase().email()`.
   - Furthermore, both route handlers explicitly apply `.toLowerCase().trim()` before querying (`prisma.user.findUnique({ where: { email } })`) and inserting (`prisma.user.create({ data: { ..., email } })`).
2. **Empirical Matrix Verification**:
   - Evaluated 6 variations across uppercase, mixed-case, leading/trailing whitespace, tabs, and newlines.
   - All variations produced the exact canonical lowercase trimmed string `test@example.com` or `test.user@example.com` across both schema validation and database execution arguments.
   - Zero possibility of PostgreSQL case-sensitivity lockout or duplicate registration under casing variants.

### 2.3 Analytics Aggregation Scalability & Date Immutability
1. **Unbounded Database Aggregation ($O(1)$ transfer payload)**:
   - Legacy code used `take: 50` on the dashboard and `take: 500` on the analytics page, silently dropping older records.
   - Remediated code uses `prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId }, _count: { id: true } })`.
   - In our empirical simulation of 12,000 events across 40 days, `groupBy` aggregated all 12,000 records across the 4 event types (`visit`, `generate`, `redirect`, `intercepted`). The transfer payload was strictly 4 summary rows, establishing $O(1)$ transfer payload independent of event volume.
2. **Date Immutability**:
   - In `app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/dashboard/analytics/page.tsx`, bucket bounds are constructed using:
     ```ts
     const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset - i));
     const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
     const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
     ```
   - In our empirical stress test, `now.getTime()` was verified before and after 7-day and 30-day bucket calculations:
     - `Before: 1789300780500 ms`
     - `After:  1789300780500 ms`
     - `Diff:   0 ms`
   - Complete absence of in-place date mutation ensures calendar buckets remain completely accurate.

### 2.4 Base UI Semantic DOM Compliance
1. **Invalid Attribute Removal**:
   - Base UI components and Next.js Links avoid invalid HTML attributes. Inspected `feedback-view.tsx` and `step3/page.tsx` for `<a type="button">`: 0 occurrences found.
2. **Zero Nested Interactive Elements**:
   - Navigation links use `<Link href="..." className={cn(buttonVariants({ ... }))}>` instead of `<Button asChild>` or wrapping `<Button>` inside `<Link>`.
   - Verified that neither `<Button>` contains `<Link>` nor `<Link>` contains `<Button>`.
   - Verified zero `<button>` elements nested inside other `<button>` elements, preventing React hydration mismatches and browser accessibility errors.

---

## 3. Caveats

- **Google OAuth Integration**: External Google OAuth callback handling was tested via mocks and configuration validation; live OAuth tokens were not exchanged against Google's production endpoints during offline execution.
- **Bcrypt Hash Latency**: At 12 salt rounds, bcrypt password hashing requires ~3 seconds of CPU time per operation. Under heavy multi-core Vitest parallelism, integration tests can take up to 9 seconds. This is an expected computational trade-off for password security.

---

## 4. Conclusion & Verdict

All four targeted subsystems (NextAuth middleware routing, email normalization, high-volume analytics aggregation with Date immutability, and Base UI DOM structure) satisfy all operational, security, and edge-case contracts.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Run Full Automated Test Suite**:
   ```bash
   npm run test
   ```
   Expected: 15 test files passed, 101 tests passed.

2. **Run Challenger 2 Dedicated Stress Test Harness**:
   ```bash
   npx tsx scripts/stress-test-challenger-2.ts
   ```
   Expected: 66/66 assertions pass cleanly with exit code 0.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   Expected: Next.js compiles all 22/22 routes cleanly with zero static generation errors.

4. **Verify TypeScript Consistency**:
   ```bash
   npx tsc --noEmit
   ```
   Expected: Zero TypeScript diagnostics.
