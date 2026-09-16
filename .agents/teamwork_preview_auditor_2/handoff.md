# Forensic Integrity Audit Report: TabAndRate

**Work Product**: TabAndRate Core Application Codebase, Configurations, and Automated Test Suites  
**Profile**: General Project (Integrity Forensics)  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md`)  
**Auditor**: `teamwork_preview_auditor_2` (Forensic Auditor)  
**Binary Verdict**: **CLEAN**  

---

## 1. Observation

Direct empirical observations across all audited source files, test suites, and runtime verification commands:

### 1.1 Source Code and Route Handlers Inspection

1. **`auth.config.ts`** (Lines 14–37):
   - `PUBLIC_PATHS` explicitly defined: `["/", "/login", "/signup", "/r", "/api/generate", "/api/analytics"]`.
   - Hardened matching: `pathname === "/" || PUBLIC_PATHS.filter((p) => p !== "/").some((p) => pathname === p || pathname.startsWith(p + "/")) || pathname.startsWith("/api/auth")`.
   - Traversal and slash-prefix bypass (`startsWith("/" + "/")`) eliminated.
   - No hardcoded test responses or bypass flags for test runners.

2. **`app/api/auth/register/route.ts`** (Lines 6–26, 36–44):
   - Zod schema enforces: `email: z.string().trim().toLowerCase().email()`.
   - Explicit canonicalization: `const email = parsed.data.email.toLowerCase().trim()`.
   - Password hashed with bcrypt at salt rounds 12 (`bcrypt.hash(password, 12)`).
   - User queried and inserted via `prisma.user.findUnique({ where: { email } })` and `prisma.user.create({ data: { name, email, passwordHash } })`.
   - No dummy responses or hardcoded credentials.

3. **`auth.ts`** (Lines 10–13, 29–43):
   - Credentials schema enforces `email: z.string().trim().toLowerCase().email()`.
   - Authorize handler normalizes: `const email = parsed.data.email.toLowerCase().trim()`.
   - Real lookup in `prisma.user.findUnique` and password comparison via `bcrypt.compare(password, user.passwordHash)`.
   - No mock users or test bypasses.

4. **`lib/utils.ts`** (Lines 10–33):
   - Unicode normalization: `name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")`.
   - Character stripping: `.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "")`.
   - Fallback generator: `if (!cleaned) { const randomSuffix = Math.random().toString(36).substring(2, 8); return 'business-' + randomSuffix; }`.
   - No hardcoded string checks or test dictionary matches.

5. **`app/api/business/route.ts`** (Lines 48–60):
   - Base slug generated via `generateSlug(name)`.
   - Collision loop bounded to 10 attempts:
     ```typescript
     while (await prisma.business.findUnique({ where: { slug } })) {
       attempt++;
       if (attempt > 10) {
         slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
         break;
       }
       slug = `${baseSlug}-${attempt}`;
     }
     ```
   - Pre-seeds tags via `CATEGORY_TAGS`.
   - Authentic Prisma database operations.

6. **`app/api/qr/route.ts`** (Lines 6–34):
   - Size parsed and clamped: `parseInt(sizeParam, 10)`, clamped to `[100, 600]` with `isNaN()` fallback to `300`.
   - Redundant `decodeURIComponent(url)` removed; `url` passed directly into `QRCode.toBuffer(url, { width: size, margin: 2, ... })`.
   - Returns genuine PNG buffer with `Content-Type: image/png`.

7. **`lib/ai.ts`** (Lines 65, 109, 143–161):
   - Groq active production models: `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]`.
   - Gemini active production models: `["gemini-1.5-flash", "gemini-2.0-flash"]`.
   - Multi-provider fallback orchestration with JSON response parsing and schema fallback.
   - Zero fictitious or decommissioned model identifiers.

8. **`lib/db.ts`** (Lines 7–36):
   - `prisma` and `pool` cached unconditionally on `globalThis` (`globalForPrisma.prisma = prisma`).
   - Connection pool bounds configured: `max: process.env.NODE_ENV === "production" ? 5 : 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
   - `@prisma/adapter-pg` driver adapter cleanly configured.

9. **`app/(dashboard)/dashboard/page.tsx`** (Lines 24–45, 56–90):
   - Database-level aggregation via `prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId: business.id }, _count: { id: true } })`.
   - Truncating `include: { events: { take: 50 } }` completely removed.
   - Date ranges generated immutably via fresh `new Date(...)` constructor calls, eliminating in-place `date.setHours()` mutations.
   - Recent events queried independently with explicit `take: 8`.

10. **`app/(dashboard)/dashboard/analytics/page.tsx`** (Lines 27–43, 54–93):
    - Database-level aggregation via `prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId: business.id }, _count: { id: true } })`.
    - Truncating `include: { events: { take: 500 } }` completely removed.
    - 30-day timeline buckets computed immutably without `setHours` mutations.

11. **`components/dashboard/feedback-view.tsx`** (Lines 82–88):
    - Clean semantic Next.js `<Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>`.
    - No Base UI `<Button render={<Link ... />}>` or invalid `type="button"` on `<a>` tags.

12. **`app/onboarding/step3/page.tsx`** (Lines 153–160):
    - Clean semantic Next.js `<Link href={...} target="_blank" className={cn(buttonVariants({ variant: "outline" }), "flex-1 h-11 gap-2")}>`.
    - No Base UI `<Button render={<Link ... />}>` or invalid `type="button"` on `<a>` tags.

13. **Shadow Route Elimination**:
    - `app/(dashboard)/page.tsx` is completely removed from the filesystem.
    - `app/page.tsx` serves as the sole canonical root page `/`.

### 1.2 Test Suite Authenticity Audit

Inspected all 15 test files under `test/`:
- `test/components/customer-funnel.test.tsx` (5 tests)
- `test/components/feedback-view.test.tsx` (4 tests)
- `test/components/my-business-form.test.tsx` (7 tests)
- `test/components/onboarding-step3.test.tsx` (4 tests)
- `test/components/sidebar.test.tsx` (3 tests)
- `test/integration/analytics-aggregation.test.ts` (4 tests)
- `test/integration/api-analytics.test.ts` (3 tests)
- `test/integration/api-auth-register.test.ts` (10 tests)
- `test/integration/api-business.test.ts` (10 tests)
- `test/integration/api-generate.test.ts` (3 tests)
- `test/integration/api-qr.test.ts` (8 tests)
- `test/unit/ai.test.ts` (8 tests)
- `test/unit/auth-config.test.ts` (8 tests)
- `test/unit/utils.test.ts` (17 tests)
- `test/unit/validation.test.ts` (7 tests)

Results of Assertion Inspection:
- Zero tautological assertions (`expect(true).toBe(true)` or `expect(1).toBe(1)`).
- Every assertion verifies actual behavior:
  - `test/integration/api-qr.test.ts` verifies PNG magic bytes `[0x89, 0x50, 0x4E, 0x47]` directly from generated response array buffers.
  - `test/unit/ai.test.ts` verifies active model arrays by reading `lib/ai.ts` source and asserting against deprecated lists.
  - `test/integration/analytics-aggregation.test.ts` asserts `groupByArgs.take` is undefined and validates 7-day and 30-day date immutability (`expect(now.getTime()).toBe(originalTime)`).
  - `test/components/onboarding-step3.test.tsx` verifies DOM tag is `A`, `type` attribute is null, and zero invalid nested button elements exist (`button a`, `a button`, `button button`).

### 1.3 Pre-Populated Artifact & Facade Detection

- No `.log` files in the repository workspace.
- No fabricated test result files or pre-cached execution artifacts exist outside `node_modules`.
- No dummy facades or stub functions returning constant values.

### 1.4 Runtime Execution Verification

1. **`npm test` (Task 92)**:
   - Command: `vitest run`
   - Exit Code: `0`
   - Output:
     ```text
     Test Files  15 passed (15)
          Tests  101 passed (101)
       Duration  79.18s
     ```
   - 100% of tests passed cleanly with 0 failures, 0 skipped, 0 unhandled rejections.

2. **`npm run build` (Task 98)**:
   - Command: `next build --webpack`
   - Exit Code: `0`
   - Output:
     ```text
     ✓ Compiled successfully in 46s
     Running TypeScript ...
     Finished TypeScript in 75s ...
     Generating static pages using 3 workers (22/22) in 6.6s
     Collecting build traces ...
     ```
   - All 22 routes compiled cleanly with 0 TypeScript or build errors.

---

## 2. Logic Chain

1. **Requirement Mapping**: `ORIGINAL_REQUEST.md` established requirements R1 through R5 under `Integrity mode: development`.
2. **Anti-Hardcoding Analysis**: Direct examination of `auth.config.ts`, `app/api/auth/register/route.ts`, `auth.ts`, `lib/utils.ts`, `app/api/business/route.ts`, `app/api/qr/route.ts`, `lib/ai.ts`, `lib/db.ts`, and dashboard pages confirms that all business logic, queries, and algorithms operate on input parameters dynamically. No test-keyed branch statements (e.g. `if (input === 'test') return ...`) or hardcoded constants exist.
3. **Anti-Facade Analysis**:
   - The database queries in `app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/dashboard/analytics/page.tsx` execute genuine Prisma `groupBy` operations targeting PostgreSQL `AnalyticsEvent` records.
   - `generateSlug` in `lib/utils.ts` implements genuine Unicode NFKD diacritic decomposition and generates a dynamic random alphanumeric fallback when Latin characters are absent.
   - `app/api/qr/route.ts` generates real PNG buffers using `QRCode.toBuffer` with standard error correction and passes URLs directly without redundant decoding.
   - `lib/ai.ts` targets active, supported models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemini-1.5-flash`, `gemini-2.0-flash`).
   - `lib/db.ts` unconditionally attaches both `PrismaClient` and `pg.Pool` to `globalThis` with real pool size limits.
4. **Test Authenticity Analysis**: Inspection of the 15 test suites and 101 tests showed that assertions verify real behaviors, invariants, and edge cases. No mock returns mask implementation defects in production code.
5. **Runtime Empiricism**: Running `npm test` and `npm run build` independently confirmed full functional pass and clean production compilation.
6. **Conclusion Deduction**: All forensic checks pass without exception. The work product is authentic, genuine, and compliant.

---

## 3. Caveats

- **External API Keys**: Runtime execution tests for `lib/ai.ts` and `app/api/generate/route.ts` utilize mocked provider SDK instances (`MockGroq`, `MockGoogleGenerativeAI`) to prevent billed API consumption and avoid failures when live API keys are omitted in offline test environments. However, the model identifier validation tests inspect the production source code directly and verify active production model names.
- **Database Driver in Vitest**: Unit and integration tests for route handlers mock Prisma method calls (`prisma.user.findUnique`, `prisma.business.create`, `prisma.analyticsEvent.groupBy`) using `vi.spyOn`, which is standard unit/integration testing practice for Next.js applications to avoid requiring an active PostgreSQL daemon during test execution.

---

## 4. Conclusion

**Binary Verdict**: **CLEAN**

The TabAndRate codebase contains no hardcoded test outputs, no facade implementations, no test bypasses, and no fabricated artifacts. All twelve defects identified in `ORIGINAL_REQUEST.md` have been authentically remediated in production source code, backed by 15 rigorous test suites containing 101 passing tests and a 100% clean production build.

---

## 5. Verification Method

To independently reproduce this forensic audit:

1. **Verify Source Implementation Authenticity**:
   - Inspect `auth.config.ts`: verify `PUBLIC_PATHS` and route matching logic.
   - Inspect `app/api/auth/register/route.ts` and `auth.ts`: verify `toLowerCase().trim()` email normalization.
   - Inspect `lib/utils.ts`: verify NFKD normalization and `business-${randomSuffix}` fallback.
   - Inspect `app/api/qr/route.ts`: verify removal of `decodeURIComponent(url)`.
   - Inspect `lib/ai.ts`: verify active Groq and Gemini model IDs.
   - Inspect `lib/db.ts`: verify `globalForPrisma.prisma` and `globalForPrisma.pool` caching.
   - Inspect `app/(dashboard)/dashboard/page.tsx`: verify `groupBy` aggregation and date immutability.
   - Inspect `app/(dashboard)/page.tsx`: verify file does not exist.

2. **Run Automated Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: All 15 test files pass, all 101 tests pass, 0 failures.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Exit code 0, 22/22 routes generated cleanly.
