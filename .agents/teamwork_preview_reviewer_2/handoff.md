# Formal Review & Adversarial Stress-Test Report (Reviewer 2: R3 & R4 Focus)

**Reviewer Identity**: `teamwork_preview_reviewer` (Instance 2)  
**Date**: September 13, 2026  
**Parent Task ID**: `5536c17a-07b2-41f2-9978-372723801393`  
**Verdict**: **APPROVE**  
**Integrity Status**: **CLEAN / NO INTEGRITY VIOLATIONS DETECTED**

---

## 1. Observation

Direct code inspections, automated test executions, and compiler outputs were observed across all target files:

### 1.1 `lib/utils.ts` (`generateSlug`)
- Lines 11–14: Accent decomposition is implemented using `name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")`.
- Lines 16–25: Unicode and symbol stripping, multi-hyphen collapsing, leading/trailing hyphen trimming:
  ```typescript
  const cleaned = normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  ```
- Lines 26–30: Guaranteed non-empty URL-safe fallback for non-Latin (Devanagari, CJK, Arabic, Cyrillic) or emoji inputs:
  ```typescript
  if (!cleaned) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `business-${randomSuffix}`;
  }
  ```

### 1.2 `app/api/business/route.ts` (Collision Retry Loop)
- Lines 48–60: Bounded while loop capped at 10 iterations:
  ```typescript
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.business.findUnique({ where: { slug } })) {
    attempt++;
    if (attempt > 10) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      break;
    }
    slug = `${baseSlug}-${attempt}`;
  }
  ```
- Guaranteed termination: If 10 sequential numbers collide, iteration 11 breaks with an entropy-backed 6-character suffix (`Math.random().toString(36).substring(2, 8)`).

### 1.3 `app/api/qr/route.ts` (URIError Elimination & Size Clamping)
- Lines 7–9: Parameter parsing and boundary clamping:
  ```typescript
  const sizeParam = searchParams.get("size") ?? "300";
  const parsedSize = parseInt(sizeParam, 10);
  const size = Math.min(Math.max(isNaN(parsedSize) ? 300 : parsedSize, 100), 600);
  ```
  Non-numeric input evaluates `isNaN(parsedSize) === true`, safely falling back to 300. Numeric values are clamped to `[100, 600]`.
- Line 18: Direct buffer generation:
  ```typescript
  const buffer = await QRCode.toBuffer(url, { ... });
  ```
  The redundant `decodeURIComponent(url)` call was eliminated. `searchParams.get("url")` provides standard single percent decoding, preventing unhandled `URIError: URI malformed` when URLs contain literal `%` signs.

### 1.4 `lib/ai.ts` (Active Production Model Identifiers)
- Line 65: Active Groq models configured in fallback order:
  ```typescript
  const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  ```
- Line 109: Active Gemini models configured in fallback order:
  ```typescript
  const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash"];
  ```
- All fictitious identifiers (`qwen/qwen3.8-27b`, `groq/compound-mini`, `gemini-3.6-flash`, `gemini-flash-latest`) have been eliminated.
- Primary provider is Groq; failover is Gemini Flash; final failover throws a sanitized user error.

### 1.5 `lib/db.ts` (Unconditional Singleton Caching & Connection Pool Bounds)
- Lines 7–10, 13–21, 33, 36:
  ```typescript
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: Pool | undefined;
  };

  function createPrismaClient() {
    const pool =
      globalForPrisma.pool ??
      new Pool({
        connectionString,
        max: process.env.NODE_ENV === "production" ? 5 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    globalForPrisma.pool = pool;
    ...
  }

  export const prisma = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = prisma;
  ```
  Both `pool` and `prisma` are cached unconditionally on `globalThis` across all environments. Pool connection limits (`max: 5` in production) and timeouts prevent connection leaks in serverless warm lambda environments.

### 1.6 Dashboard, Analytics & UI Components
- `app/(dashboard)/dashboard/page.tsx` (Lines 24–54):
  `prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId: business.id }, _count: { id: true } })` computes lifetime metrics across all event records without `take: 50` truncation.
- `app/(dashboard)/dashboard/analytics/page.tsx` (Lines 27–52):
  `prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId: business.id }, _count: { id: true } })` computes lifetime metrics without `take: 500` truncation.
- Date Bucket Arithmetic (`dashboard/page.tsx` Lines 56–79, `analytics/page.tsx` Lines 54–77):
  Uses immutable constructor instantiation:
  `const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));`
  `const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);`
  `const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);`
  Eliminates previous in-place `date.setHours()` mutation bugs.
- `components/dashboard/feedback-view.tsx` (Lines 82–88) & `app/onboarding/step3/page.tsx` (Lines 153–160):
  Base UI `<Button render={<Link ... />}>` was replaced with standard Next.js `<Link className={cn(buttonVariants({ variant: "outline" }))}>`. This produces valid HTML5 `<a>` anchor tags without illegal `type="button"` attributes.

### 1.7 Verification Commands & Results
- **Production Build** (`npm run build`):
  Command executed: `npm run build`
  Result: **Exit Code 0**
  Compilation: Next.js 16.3.5 (Webpack), compiled successfully in 52s, TypeScript type check completed with 0 errors in 38.4s, all 22 static and dynamic routes collected and generated.
- **Automated Test Suite** (`npm test`):
  Command executed: `npm test` (`vitest run`)
  Result: **Exit Code 0**
  Summary: **16 test files passed (16/16), 107 tests passed (107/107)**, duration 74.46s.
  Includes 6 newly added adversarial challenger stress tests in `test/integration/challenger-stress.test.ts`.

---

## 2. Logic Chain

1. **R3 Edge-Case Crash Prevention**:
   - Observations 1.1 and 1.2 demonstrate that `generateSlug` decomposes Latin accents via NFKD and trims hyphens. For non-Latin scripts (e.g. Devanagari `"चाय कैफ़े"` or Chinese `"北京烤鸭"`) and emojis (`"🍕🎉🚀"`), where alphanumeric regex stripping reduces the string to empty, the function deterministically yields a non-empty fallback `business-${randomSuffix}`.
   - Observation 1.2 confirms that `POST /api/business` limits collision checking to at most 10 iterations before appending a random suffix and breaking the loop. This provably prevents unbounded iteration and database query saturation under repeated slug collisions.
   - Observation 1.3 shows that removing `decodeURIComponent(url)` in `app/api/qr/route.ts` allows URLs with literal percent signs (`50%off`, `100%real`, `item%99`) to be encoded into the QR matrix without triggering `URIError: URI malformed`. The size parameter parser defaults non-numeric strings to 300 and clamps within `[100, 600]`.
   - Observation 1.4 confirms that `lib/ai.ts` replaces fictitious models with currently active, official production models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemini-1.5-flash`, `gemini-2.0-flash`) and provides multi-tier failover.
   - Observation 1.5 confirms that `lib/db.ts` caches both `prisma` and `pool` unconditionally on `globalThis` with production bounds (`max: 5`, timeouts: 30s/5s), resolving connection leaks on warm serverless lambdas.

2. **R4 Analytics Aggregation & UI Semantic Compliance**:
   - Observation 1.6 shows that `app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/dashboard/analytics/page.tsx` employ `prisma.analyticsEvent.groupBy` over `businessId` and `type` with `_count: { id: true }`. Because no `take` limits are applied, lifetime metrics reflect the complete database state.
   - Observation 1.6 demonstrates that chart timeline buckets are computed using immutable `new Date(year, month, day, h, m, s, ms)` constructors, avoiding previous in-place `date.setHours()` mutations that corrupted iterative timeline calculations.
   - Observation 1.6 confirms that replacing `<Button render={<Link ... />}>` with `<Link className={cn(buttonVariants(...))}>` produces valid semantic HTML anchor tags, eliminating illegal `type="button"` attributes and hydration warnings.

3. **Integrity & Authenticity Audit**:
   - Inspected source code for hardcoded test responses, mocks pretending to be real logic, or backdoors. No hardcoded test responses exist in `lib/` or `app/`.
   - Inspected test suites: tests verify actual runtime behavior (e.g., verifying PNG magic bytes `0x89 0x50 0x4E 0x47`, parsing PNG width headers for exact clamped dimensions, checking database query argument structure, and simulating real component user interactions).
   - Independent reproduction of both `npm test` and `npm run build` confirmed 100% genuine passing results (107/107 tests passed, 22/22 routes generated).

---

## 3. Caveats

1. **Bcrypt Test Execution Timing Under Resource Pressure**:
   During initial test suite execution while background processes were active, one integration test (`test/integration/api-auth-register.test.ts` > `normalizes mixed-case and whitespace emails during registration`) took 5218ms and hit Vitest's default 5000ms timeout.
   - Root Cause: `app/api/auth/register/route.ts` performs real `bcrypt.hash(password, 12)` using the pure-JavaScript `bcryptjs` library. In integration tests where `bcrypt` is not mocked, successive password hashes under high CPU contention can exceed 5 seconds.
   - Verification: Running `npx vitest run test/integration/api-auth-register.test.ts` individually passed in 3287ms. Running the complete suite on an idle machine passed all 16 files and 107 tests cleanly.
   - Recommendation for future maintenance: Consider configuring Vitest's `testTimeout` to 10000ms in `vitest.config.mts` or mocking bcrypt in unit/integration tests to eliminate test runner timing sensitivity.
2. **AI Provider API Key Requirements at Runtime**:
   Live generation via `POST /api/generate` requires valid `GROQ_API_KEY` or `GEMINI_API_KEY` environment variables configured in production. Unit tests appropriately mock provider SDKs to verify model strings, prompt structures, and failover mechanics.

---

## 4. Conclusion

The implementation for Requirements R3 and R4 is complete, verified, and architecturally sound.
- Slug generation reliably handles accents, non-Latin scripts, and emojis with safe non-empty fallbacks and bounded collision loops.
- QR generation is immune to double-decoding `URIError` crashes and validates size parameters.
- AI review generation targets active, supported production models with graceful multi-tier fallback.
- Database connection management uses an unconditional singleton pattern with bounded connection pools and timeouts.
- Analytics calculations aggregate at the database level with immutable date intervals.
- UI components render valid semantic HTML without Base UI render-prop attribute contamination.
- Zero integrity violations were detected.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify these conclusions:

1. **Execute Automated Test Suite**:
   ```bash
   npm test
   ```
   *Expected outcome*: 16 test files pass, 107 tests pass with 0 failures.

2. **Execute Full Production Build**:
   ```bash
   npm run build
   ```
   *Expected outcome*: TypeScript check completes with 0 errors, Next.js compiles all 22 routes with exit code 0.

3. **Verify Empirical Stress Tests**:
   ```bash
   npx vitest run test/integration/challenger-stress.test.ts
   ```
   *Expected outcome*: All 6 adversarial stress tests pass, confirming bounded collision retry (attempt 11 fallback), non-Latin/emoji slug handling, percent encoding immunity, and size clamping.

4. **Inspect Source Code Files**:
   - `lib/utils.ts` (Lines 10–33)
   - `app/api/business/route.ts` (Lines 48–60)
   - `app/api/qr/route.ts` (Lines 7–27)
   - `lib/ai.ts` (Lines 65, 109)
   - `lib/db.ts` (Lines 7–36)
   - `app/(dashboard)/dashboard/page.tsx` (Lines 24–79)
   - `app/(dashboard)/dashboard/analytics/page.tsx` (Lines 27–77)
   - `components/dashboard/feedback-view.tsx` (Lines 82–88)
   - `app/onboarding/step3/page.tsx` (Lines 153–160)
