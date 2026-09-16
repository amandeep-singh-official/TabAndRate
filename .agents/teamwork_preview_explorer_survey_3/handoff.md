# Handoff Report: Survey of R4 (Analytics & UI) and R5 (Test & Build Infrastructure)

**Author:** Explorer 3 (`teamwork_preview_explorer`)  
**Working Directory:** `/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_explorer_survey_3`  
**Date:** 2026-09-13T10:50:00Z  
**Parent Task ID / Conversation ID:** `5536c17a-07b2-41f2-9978-372723801393`

---

## 1. Observation

### 1.1 R4.1: Analytics Query Truncation & In-Place Date Mutation

#### A. Dashboard Overview (`app/(dashboard)/dashboard/page.tsx`)
- **File:** `app/(dashboard)/dashboard/page.tsx`
- **Lines 8–16 (Database Query with hardcoded truncation):**
  ```typescript
  async function getDashboardData(userId: string) {
    const business = await prisma.business.findUnique({
      where: { userId },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
  ```
- **Lines 20–23 (Lifetime metric calculation on truncated slice):**
  ```typescript
    const visits = business.events.filter((e) => e.type === "visit").length;
    const generates = business.events.filter((e) => e.type === "generate").length;
    const redirects = business.events.filter((e) => e.type === "redirect").length;
    const intercepted = business.events.filter((e) => e.type === "intercepted").length;
  ```
- **Lines 26–42 (In-place Date mutation in 7-day loop & array filtering):**
  ```typescript
    // Last 7 days chart data
    const now = new Date();
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStr = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayEvents = business.events.filter(
        (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
      );
      return {
        day: dayStr,
        visits: dayEvents.filter((e) => e.type === "visit").length,
        redirects: dayEvents.filter((e) => e.type === "redirect").length,
      };
    });
  ```
- **Line 44 (Coupled recent events slice):**
  ```typescript
    const recentEvents = business.events.slice(0, 8);
  ```

#### B. Analytics Page (`app/(dashboard)/dashboard/analytics/page.tsx`)
- **File:** `app/(dashboard)/dashboard/analytics/page.tsx`
- **Lines 10–18 (Database Query with hardcoded truncation):**
  ```typescript
    const business = await prisma.business.findUnique({
      where: { userId: session.user.id },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 500,
        },
      },
    });
  ```
- **Lines 22–25 (Metric calculations on 500-event slice):**
  ```typescript
    const visits = business.events.filter((e) => e.type === "visit").length;
    const generates = business.events.filter((e) => e.type === "generate").length;
    const redirects = business.events.filter((e) => e.type === "redirect").length;
    const intercepted = business.events.filter((e) => e.type === "intercepted").length;
  ```
- **Lines 28–45 (In-place Date mutation in 30-day loop & array filtering):**
  ```typescript
    // Last 30 days chart data
    const now = new Date();
    const chartData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      const dayEvents = business.events.filter(
        (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
      );
      return {
        label,
        visits: dayEvents.filter((e) => e.type === "visit").length,
        generates: dayEvents.filter((e) => e.type === "generate").length,
        redirects: dayEvents.filter((e) => e.type === "redirect").length,
        intercepted: dayEvents.filter((e) => e.type === "intercepted").length,
      };
    });
  ```

#### C. Database Schema Indexing (`prisma/schema.prisma`)
- **Lines 108–123:**
  ```prisma
  model AnalyticsEvent {
    id         String   @id @default(cuid())
    businessId String
    business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

    // "visit" | "generate" | "redirect" | "intercepted"
    type String

    // Optional context: { language, draftIndex, starRating, tags }
    metadata Json?

    createdAt DateTime @default(now())

    @@index([businessId, type])
    @@index([businessId, createdAt])
  }
  ```
  Both `@@index([businessId, type])` and `@@index([businessId, createdAt])` exist in PostgreSQL.

---

### 1.2 R4.2: Base UI / Component Render Props & HTML Semantics

#### A. Feedback View (`components/dashboard/feedback-view.tsx`)
- **File:** `components/dashboard/feedback-view.tsx`
- **Lines 81–84:**
  ```tsx
  <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
    <ArrowLeft className="h-4 w-4 mr-1.5" />
    Back to Dashboard
  </Button>
  ```
  `nativeButton={false}` is present here, but it passes `<Link href="/dashboard" />` via the Base UI `render` prop while wrapping children `<ArrowLeft ... /> Back to Dashboard`.

#### B. Onboarding Step 3 (`app/onboarding/step3/page.tsx`)
- **File:** `app/onboarding/step3/page.tsx`
- **Lines 152–159:**
  ```tsx
  <Button
    variant="outline"
    className="flex-1 h-11 gap-2"
    render={<Link href={`/r/${slug ?? ""}`} target="_blank" />}
  >
    <QrCode className="h-4 w-4" />
    Preview Funnel
  </Button>
  ```
  **Critical Defect:** `nativeButton={false}` is **omitted**.

#### C. Base UI Button Primitive Behavior (`node_modules/@base-ui/react/button/Button.js` and `useButton.js`)
- `Button` component accepts `nativeButton = true` by default.
- In `node_modules/@base-ui/react/internals/use-button/useButton.js` (lines 46–50):
  ```javascript
  if (isNativeButton) {
    if (!isButtonTag) {
      const ownerStackMessage = _safeReact.SafeReact.captureOwnerStack?.() || '';
      const message = 'A component that acts as a button expected a native <button> because the ' +
        '`nativeButton` prop is true. Rendering a non-<button> removes native button ' +
        'semantics, which can impact forms and accessibility. Use a real <button> in the ' +
        '`render` prop, or set `nativeButton` to `false`.';
      (0, _error.error)(`${message}${ownerStackMessage}`);
    }
  }
  ```
- Furthermore, lines 183–187 set `type: 'button'` if `isNativeButton` is `true`. When applied to `<Link>` (`<a>`), it renders invalid HTML: `<a type="button" href="...">`.

#### D. Base UI vs Radix UI Conventions
- Installed library is `@base-ui/react` v1.8.0 (configured via `components.json` with style `base-nova`).
- `@base-ui/react` does **not** support Radix UI's `asChild` prop. If `asChild` were passed, Base UI would render `<button aschild="true"><a href="...">...</a></button>`, which triggers nested interactive element violations (`test/components/sidebar.test.tsx` strictly validates that `button a`, `a button`, and `button button` counts are 0).

---

### 1.3 R5: Test & Build Infrastructure Observations

#### A. Installed Versions & Tooling (`package.json`)
- **Next.js:** `16.3.5` (running with Webpack build: `next dev --webpack`, `next build --webpack`)
- **React:** `19.2.8`
- **Vitest:** `5.0.0`
- **Happy-DOM:** `20.14.5`
- **Prisma:** `7.10.0`
- **Testing Library:** `@testing-library/react` `16.3.3`, `@testing-library/jest-dom` `7.0.1`, `@testing-library/user-event` `14.6.7`
- **Scripts in `package.json`:**
  ```json
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:smoke": "npx tsx scripts/smoke-test.ts"
  }
  ```

#### B. Direct Tool Execution Results
- `npm test` (`vitest run`):
  - **Result:** Code 0 (Success)
  - **Files:** 12 passed (12)
  - **Tests:** 63 passed (63)
  - **Duration:** 29.75s
- `npm run build` (`next build --webpack`):
  - **Result:** Code 0 (Success)
  - **Duration:** ~28s compilation, TypeScript clean, 22 static/dynamic routes created.
  - **Route output:**
    ```
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
    ```

#### C. Existing Test File Inventory (`test/`)
- `test/components/customer-funnel.test.tsx` (5 tests)
- `test/components/feedback-view.test.tsx` (4 tests)
- `test/components/my-business-form.test.tsx` (7 tests)
- `test/components/sidebar.test.tsx` (3 tests)
- `test/integration/api-analytics.test.ts` (3 tests)
- `test/integration/api-auth-register.test.ts` (4 tests)
- `test/integration/api-business.test.ts` (10 tests)
- `test/integration/api-generate.test.ts` (3 tests)
- `test/integration/api-qr.test.ts` (3 tests)
- `test/unit/ai.test.ts` (4 tests)
- `test/unit/utils.test.ts` (10 tests)
- `test/unit/validation.test.ts` (7 tests)
- `test/setup.ts` (mocks for `navigator.clipboard` and `window.open`)

---

## 2. Logic Chain

### 2.1 Root Cause of Analytics Truncation & In-Place Date Mutation (R4.1)

1. **Premise 1 (Query Level):** In `app/(dashboard)/dashboard/page.tsx` line 14, `take: 50` is specified on the `events` relation of `Business`. In `app/(dashboard)/dashboard/analytics/page.tsx` line 15, `take: 500` is specified.
2. **Premise 2 (Aggregation in Memory):** Both pages calculate lifetime counters (`visits`, `generates`, `redirects`, `intercepted`) via `.filter()` on `business.events`.
3. **Inference 1:** As soon as total events exceed 50 (for dashboard) or 500 (for analytics), the computed statistics freeze at a maximum cap or misrepresent lifetime metrics, dropping all older events.
4. **Premise 3 (Timeline Chart Slicing):** The 7-day chart in dashboard and 30-day chart in analytics filter the same truncated array:
   ```typescript
   business.events.filter((e) => e.createdAt >= dayStart && e.createdAt <= dayEnd);
   ```
5. **Inference 2:** If a business receives 50 events in a single day, the other 6 days in the dashboard chart display `0` visits/redirects even if hundreds of events occurred on those days. In analytics, 500 events over a few days wipes out earlier activity across the 30-day window.
6. **Premise 4 (Date Mutation):**
   ```typescript
   const dayStart = new Date(date.setHours(0, 0, 0, 0));
   const dayEnd = new Date(date.setHours(23, 59, 59, 999));
   ```
   `date.setHours(0, 0, 0, 0)` mutates `date` in place, returning an epoch integer timestamp. Immediately following that, `date.setHours(23, 59, 59, 999)` mutates the same `date` instance to end of day. While `new Date(timestamp)` creates distinct Date objects, mutating shared date instances in date-loop arithmetic is error-prone. If `date` is instantiated outside or manipulated relatively (e.g. `date.setDate(date.getDate() - i)`), successive iterations compound decrements ($1, 1+2=3, 3+3=6, \dots$), skewing the entire timeline backwards exponentially.

### 2.2 Root Cause of Base UI Render Prop Issues (R4.2)

1. **Premise 1:** In `app/onboarding/step3/page.tsx` line 152:
   ```tsx
   <Button variant="outline" className="flex-1 h-11 gap-2" render={<Link href={`/r/${slug ?? ""}`} target="_blank" />}>
   ```
2. **Premise 2:** Base UI's `Button` primitive requires `nativeButton={false}` whenever the element specified in `render` is not a `<button>`.
3. **Inference 1:** When `nativeButton` is undefined, it defaults to `true`. Base UI's internal `useButton` hook triggers a runtime console error in browser environments and injects `type="button"` into the `<a>` tag generated by Next.js `<Link>`.
4. **Premise 3:** In `components/dashboard/feedback-view.tsx` line 81:
   ```tsx
   <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
     <ArrowLeft className="h-4 w-4 mr-1.5" />
     Back to Dashboard
   </Button>
   ```
   `nativeButton={false}` is present, but using `<Button render={<Link ... />}>` introduces unnecessary layer of abstraction and potential hydration quirks when `<Link className={buttonVariants({ variant: "outline", size: "sm" })}>...</Link>` directly renders a native semantic `<a>` with identical styling.

### 2.3 Build & Test Infrastructure Assessment (R5)

1. **Build Health:** Next.js 16.3.5 and Webpack build successfully compiles all 22 routes. There are no fatal TypeScript or syntax errors currently in the main repository tree.
2. **Test Framework:** `vitest` with `happy-dom` is configured in `vitest.config.mts` with `@/` path alias pointing to project root. Setup file `test/setup.ts` correctly mocks `navigator.clipboard` and `window.open`.
3. **Coverage Gaps for R1, R2, R3, R4:**
   - **R1:** `auth.config.ts` lacks test verifying that `/api/generate` and `/api/analytics` are accessible to unauthenticated callers, while `/dashboard` and `/api/business` require authentication.
   - **R2:** `app/api/auth/register/route.ts` and `auth.ts` lack tests verifying case-normalization (`toLowerCase().trim()`) for registration, duplicate detection, and credentials sign-in.
   - **R3:**
     - `lib/utils.ts` `generateSlug`: No tests for non-Latin scripts (Hindi, Chinese, Arabic) or emoji-only names.
     - `app/api/qr/route.ts`: No tests for double URL decoding or unhandled `URIError` when URLs contain `%`.
     - `lib/ai.ts`: No tests ensuring model fallbacks use valid, supported model IDs (`llama-3.3-70b-versatile`, `gemini-1.5-flash`).
     - `lib/db.ts`: No test asserting singleton PrismaClient and Pool reuse in production.
   - **R4:**
     - No test asserting database-level aggregation for events without `take: 50`/`take: 500` limits.
     - No test asserting date bucket immutability and accuracy over 7-day and 30-day timelines.
     - No component test verifying `app/onboarding/step3/page.tsx` button rendering semantics.

---

## 3. Caveats & Edge Cases

1. **Database Aggregation Scalability:**
   - Replacing `take: 50` with full dataset retrieval in memory (`findMany` without `take`) would be catastrophic for businesses with 100,000+ events, causing high memory usage and database bandwidth starvation.
   - Instead, the solution must use database-level SQL aggregation:
     - `prisma.analyticsEvent.groupBy` with `by: ['type']` for lifetime counts.
     - A filtered `findMany` bounded by `createdAt: { gte: startDate }` and `select: { type: true, createdAt: true }` (excluding heavy `metadata` JSON) for timeline charts.
2. **Timezone Discrepancies:**
   - Server-side date generation using `new Date()` uses UTC on Vercel/production servers. Using `toLocaleDateString("en-US", ...)` without an explicit timezone can cause day-boundary shifts between UTC and the user's local timezone. Using UTC-consistent date boundaries or consistent date formatting prevents hydration mismatches.
3. **Base UI vs Radix UI Confusion:**
   - Future developers or workers might assume standard shadcn Radix UI and attempt to write `<Button asChild>`. In `@base-ui/react`, `asChild` does not exist. Using `buttonVariants` on `<Link>` directly is immune to library-specific render prop incompatibilities.
4. **Prisma 7 Edge Compatibility:**
   - Prisma 7 with `@prisma/adapter-pg` requires careful singleton handling because `new Pool()` establishes physical TCP connections. Re-instantiating `Pool` across serverless requests causes connection pool exhaustion in PostgreSQL.

---

## 4. Conclusion & Proposed Fix Strategy

### 4.1 Proposed Fix Strategy for R4.1 (Analytics Aggregation & Date Immutability)

#### Strategy for `app/(dashboard)/dashboard/page.tsx`:
1. **Query 1: Lifetime Event Aggregation via Prisma `groupBy`:**
   ```typescript
   const [eventCounts, business] = await Promise.all([
     prisma.analyticsEvent.groupBy({
       by: ["type"],
       where: { businessId: businessId },
       _count: { id: true },
     }),
     prisma.business.findUnique({ where: { userId } }),
   ]);
   ```
   Map into a lookup dictionary:
   ```typescript
   const countMap = Object.fromEntries(
     eventCounts.map((ec) => [ec.type, ec._count.id])
   );
   const visits = countMap["visit"] ?? 0;
   const generates = countMap["generate"] ?? 0;
   const redirects = countMap["redirect"] ?? 0;
   const intercepted = countMap["intercepted"] ?? 0;
   ```
2. **Query 2: 7-Day Timeline Query (Bounded by Date):**
   ```typescript
   const sevenDaysAgo = new Date();
   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
   sevenDaysAgo.setHours(0, 0, 0, 0);

   const weekEvents = await prisma.analyticsEvent.findMany({
     where: {
       businessId: business.id,
       createdAt: { gte: sevenDaysAgo },
     },
     select: {
       type: true,
       createdAt: true,
     },
   });
   ```
3. **Query 3: Recent Events (Decoupled with exact limit):**
   ```typescript
   const recentEvents = await prisma.analyticsEvent.findMany({
     where: { businessId: business.id },
     orderBy: { createdAt: "desc" },
     take: 8,
   });
   ```
4. **Immutable Date Bucket Generation:**
   ```typescript
   const now = new Date();
   const chartData = Array.from({ length: 7 }, (_, i) => {
     const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
     const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
     const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
     const dayStr = dayStart.toLocaleDateString("en-US", { weekday: "short" });

     const dayEvents = weekEvents.filter(
       (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
     );
     return {
       day: dayStr,
       visits: dayEvents.filter((e) => e.type === "visit").length,
       redirects: dayEvents.filter((e) => e.type === "redirect").length,
     };
   });
   ```

#### Strategy for `app/(dashboard)/dashboard/analytics/page.tsx`:
1. Use `groupBy` for the 4 lifetime metrics (`visits`, `generates`, `redirects`, `intercepted`), eliminating `take: 500`.
2. Query 30-day timeline events bounded by `createdAt: { gte: thirtyDaysAgo }`, selecting only `type` and `createdAt`.
3. Construct immutable 30-day date buckets using pure date offsets (`new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i))`).

---

### 4.2 Proposed Fix Strategy for R4.2 (Base UI Component Props)

#### Option A (Direct semantic `<Link>` with `buttonVariants` - Recommended):
In `app/onboarding/step3/page.tsx`:
```tsx
import { buttonVariants } from "@/components/ui/button";

// Replace Button render prop with semantic Link:
<Link
  href={`/r/${slug ?? ""}`}
  target="_blank"
  className={cn(buttonVariants({ variant: "outline" }), "flex-1 h-11 gap-2")}
>
  <QrCode className="h-4 w-4" />
  Preview Funnel
</Link>
```
In `components/dashboard/feedback-view.tsx`:
```tsx
<Link
  href="/dashboard"
  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
>
  <ArrowLeft className="h-4 w-4 mr-1.5" />
  Back to Dashboard
</Link>
```

#### Option B (Base UI with explicit `nativeButton={false}`):
If keeping `<Button render={<Link ... />}>`, ensure `nativeButton={false}` is explicitly added to `app/onboarding/step3/page.tsx`:
```tsx
<Button
  variant="outline"
  className="flex-1 h-11 gap-2"
  nativeButton={false}
  render={<Link href={`/r/${slug ?? ""}`} target="_blank" />}
>
  <QrCode className="h-4 w-4" />
  Preview Funnel
</Button>
```

---

### 4.3 Proposed Test Strategy for R5 (Automated Test Suite Expansion)

Implement automated tests in Vitest for each requirement:

1. **R1 Tests (`test/unit/auth-config.test.ts`):**
   - Import `authConfig` from `@/auth.config`.
   - Test `authConfig.callbacks.authorized`:
     - Returns `true` for unauthenticated requests to `/api/generate`.
     - Returns `true` for unauthenticated requests to `/api/analytics`.
     - Returns `true` for unauthenticated requests to `/api/qr`.
     - Returns `true` for unauthenticated requests to `/r/sample-business`.
     - Returns `false` for unauthenticated requests to `/dashboard`.
     - Returns `false` for unauthenticated requests to `/dashboard/analytics`.
     - Returns `false` for unauthenticated requests to `/api/business`.
     - Returns `true` when `auth` user is present for protected paths.
2. **R2 Tests (`test/unit/email-normalization.test.ts` & `test/integration/api-auth-register.test.ts`):**
   - Test `POST /api/auth/register` with `Email: " John.Doe@Example.COM  "`:
     - Asserts `prisma.user.findUnique` queried with `"john.doe@example.com"`.
     - Asserts `prisma.user.create` received `email: "john.doe@example.com"`.
   - Test `auth.ts` `authorize` credentials callback:
     - When credentials contain `"JOHN.DOE@EXAMPLE.COM"`, searches for `"john.doe@example.com"`.
3. **R3 Tests (`test/unit/utils-slug.test.ts`, `test/integration/api-qr.test.ts`, `test/unit/ai-models.test.ts`):**
   - `generateSlug`:
     - Test non-Latin names: `"द हैंगआउट"`, `"مطعم الشرق"`, `"寿司処"`, `"Кафе"`.
     - Test emoji-only names: `"🔥☕️"`, `"🎉"`.
     - Assert returned slug is non-empty, URL-safe, and lowercase.
   - `GET /api/qr`:
     - Test URL with raw `%` (e.g. `?url=https://tabandrate.com/r/cafe%20delight` and unencoded `%`): does not throw `URIError`, returns HTTP 200 with PNG.
   - AI models in `lib/ai.ts`:
     - Verify Groq model array uses supported models (e.g. `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
     - Verify Gemini model array uses supported models (e.g. `gemini-1.5-flash`, `gemini-2.0-flash`).
   - `lib/db.ts`:
     - Verify global singleton caching in both `NODE_ENV === "production"` and development.
4. **R4 Tests (`test/integration/analytics-aggregation.test.ts` & `test/components/onboarding-step3.test.tsx`):**
   - Mock Prisma with 600+ events across various dates:
     - Verify aggregation counts are exact and not truncated at 50 or 500.
     - Verify 7-day and 30-day buckets correctly group events into their respective dates without in-place date corruption.
   - Component test for `app/onboarding/step3/page.tsx`:
     - Verify no `<button>` element wraps an `<a>` element, preventing hydration mismatches.

---

## 5. Verification Method

To independently verify all findings and validate future fixes:

1. **Run Vitest Test Suite:**
   ```bash
   npm test
   ```
   *Expected:* All existing 12 test suites and 63 tests pass, plus any new test suites added.
2. **Run Production Build:**
   ```bash
   npm run build
   ```
   *Expected:* Next.js Webpack build completes with 0 errors, TypeScript check passes with 0 errors, and all 22+ routes generate properly.
3. **Verify Zero Route Collisions:**
   Ensure `app/(dashboard)/page.tsx` is removed so only `app/page.tsx` serves root `/`.
4. **Verify Base UI Semantics:**
   In DOM testing (e.g. `test/components/sidebar.test.tsx` and new `step3.test.tsx`):
   ```typescript
   expect(container.querySelectorAll("button a").length).toBe(0);
   expect(container.querySelectorAll("a button").length).toBe(0);
   expect(container.querySelectorAll("button button").length).toBe(0);
   ```
5. **Verify Analytics Aggregation In PostgreSQL:**
   Verify `prisma.analyticsEvent.groupBy` generates:
   ```sql
   SELECT "type", COUNT("id") FROM "AnalyticsEvent" WHERE "businessId" = $1 GROUP BY "type";
   ```
   without any `LIMIT` or `take` clause.
