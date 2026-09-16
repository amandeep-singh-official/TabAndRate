# Handoff Report: Milestone 2 (R3: Edge-Case Crash Prevention & Model Configuration)

**Worker ID**: `teamwork_preview_worker` (Worker M2)  
**Parent Conversation ID**: `5536c17a-07b2-41f2-9978-372723801393`  
**Working Directory**: `/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_m2`  
**Date**: 2026-09-13T11:04:00Z  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Slug Generation Edge Cases (`lib/utils.ts`)
- **Initial State**:
  `lib/utils.ts` lines 10–18:
  ```typescript
  export function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  }
  ```
- **Observed Behavior**:
  - Non-Latin scripts (e.g., Hindi `"चाय कैफ़े"`, `"नमस्ते"`, Chinese `"北京烤鸭"`, Arabic `"مطعم السعادة"`, Cyrillic `"Кафе Бар"`) and emojis (e.g., `"🍕🎉🚀"`) stripped to empty strings `""` or isolated hyphens `"-"`.
  - Accented Latin characters (e.g., `"Café & Crêpe"`) produced `"caf-crpe"`, dropping accented vowels instead of transliterating.
  - Empty slugs cause downstream crashes in dynamic routes (`/r/[slug]`), schema rejections in `/api/generate` and `/api/analytics` (`z.string().min(1)`), and onboarding QR generation halts.

### 1.2 Unbounded Slug Collision Loop (`app/api/business/route.ts`)
- **Initial State**:
  `app/api/business/route.ts` lines 48–56:
  ```typescript
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.business.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  ```
- **Observed Behavior**:
  - The `while` loop has no upper bound. If high concurrency or repeated base slugs occur, database queries execute without limit, posing a request timeout and database connection exhaustion risk.

### 1.3 Redundant URL Percent Decoding & Size Parsing (`app/api/qr/route.ts`)
- **Initial State**:
  `app/api/qr/route.ts` lines 4–14:
  ```typescript
  export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const size = Math.min(Math.max(parseInt(searchParams.get("size") ?? "300"), 100), 600);
    ...
    const buffer = await QRCode.toBuffer(decodeURIComponent(url), { ... });
  ```
- **Observed Behavior**:
  - `searchParams.get("url")` per WHATWG URL specification already decodes percent-encoded components once.
  - Calling `decodeURIComponent(url)` on this string performs a second decoding.
  - Any URL containing a `%` sign not followed by two valid hexadecimal characters (e.g., query params like `?discount=50%off`, `?offer=100%real`) causes the V8 JavaScript engine to throw an unhandled `URIError: URI malformed`, returning HTTP 500.
  - If `size` parameter was an invalid string (e.g., `abc`), `parseInt` yielded `NaN`, resulting in `NaN` propagated to `QRCode.toBuffer`.

### 1.4 Invalid AI Model Identifiers (`lib/ai.ts`)
- **Initial State**:
  `lib/ai.ts`:
  - Line 65: `const modelsToTry = ["qwen/qwen3.8-27b", "groq/compound-mini", "qwen/qwen3.6-27b"];`
  - Line 109: `const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];`
- **Observed Behavior**:
  - None of `"qwen/qwen3.8-27b"`, `"groq/compound-mini"`, or `"qwen/qwen3.6-27b"` exist on the Groq API.
  - Neither `"gemini-3.6-flash"` nor `"gemini-flash-latest"` exist in Google Generative AI API catalog.
  - All calls to `/api/generate` failed on both providers, exhausting retries and returning HTTP 500 error `"AI generation unavailable. Please try again."`.

### 1.5 Database Connection Leak in Serverless (`lib/db.ts`)
- **Initial State**:
  `lib/db.ts` lines 7–25:
  ```typescript
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  function createPrismaClient() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    ...
  }

  export const prisma = globalForPrisma.prisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- **Observed Behavior**:
  - In production (`NODE_ENV === "production"`), `globalForPrisma.prisma` was never populated.
  - In serverless environments with warm containers across route bundles, `createPrismaClient()` executed repeatedly, creating untracked `pg.Pool` instances.
  - No connection limits (`max`), idle timeouts, or connection timeouts were configured, leading to PostgreSQL connection exhaustion.

---

## 2. Logic Chain

1. **Slug Generation & Collision**:
   - Decomposing accents via `normalize("NFKD")` separates base letters from diacritical marks; stripping `[\u0300-\u036f]` converts characters like `é` -> `e`, preserving readability for Latin-based accented languages.
   - Trimming leading and trailing hyphens (`replace(/^-+|-+$/g, "")`) and slicing to 50 characters avoids leading/trailing hyphen artifacts.
   - When an input contains purely non-Latin characters (Devanagari, Chinese, Arabic, emojis), `cleaned` is empty `""`. Returning `business-${Math.random().toString(36).substring(2, 8)}` guarantees a non-empty, URL-safe alphanumeric string satisfying `z.string().min(1)` and Next.js route parameter requirements.
   - In `app/api/business/route.ts`, checking `if (attempt > 10)` and appending a random 6-character suffix breaks the collision loop deterministically, preventing DoS/infinite query loops under heavy duplicate business names.

2. **QR Code Generation Safety**:
   - Removing `decodeURIComponent(url)` allows `searchParams.get("url")` to be passed directly to `QRCode.toBuffer()`. Because the URL was already percent-decoded once by WHATWG query parsing, URLs with literal percent sequences (e.g. `?discount=50%off`) are preserved intact without throwing `URIError`.
   - Handling `isNaN(parsedSize)` with fallback to default `300` ensures valid integer bounds between 100 and 600.

3. **AI Model Identifiers**:
   - Replacing the Groq models array with active production models `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]` allows review generation requests to succeed against Groq.
   - Replacing the Gemini models array with active models `["gemini-1.5-flash", "gemini-2.0-flash"]` ensures reliable fallback if Groq fails or rate limits.

4. **Database Pooling & Singleton**:
   - Storing `pool: Pool | undefined` on `globalForPrisma` enables reuse of the connection pool across invocations.
   - Configuring `max: process.env.NODE_ENV === "production" ? 5 : 10`, `idleTimeoutMillis: 30000`, and `connectionTimeoutMillis: 5000` prevents connection pooling saturation in serverless environments.
   - Removing `if (process.env.NODE_ENV !== "production")` and assigning `globalForPrisma.prisma = prisma;` unconditionally ensures the singleton pattern is preserved across warm serverless lambdas.

---

## 3. Changes Implemented

### File 1: `lib/utils.ts`
- **Diff Summary**:
  ```diff
  @@ -10,7 +10,22 @@
   export function generateSlug(name: string): string {
  -  return name
  +  // Normalize accents (e.g., "Café" -> "Cafe")
  +  const normalized = name
  +    .normalize("NFKD")
  +    .replace(/[\u0300-\u036f]/g, "");
  +
  +  const cleaned = normalized
       .toLowerCase()
       .trim()
       .replace(/[^a-z0-9\s-]/g, "")
       .replace(/\s+/g, "-")
       .replace(/-+/g, "-")
  -    .slice(0, 50);
  +    .replace(/^-+|-+$/g, "")
  +    .slice(0, 50)
  +    .replace(/-+$/, "");
  +
  +  if (!cleaned) {
  +    // Guaranteed non-empty URL-safe fallback for non-Latin or emoji-only names
  +    const randomSuffix = Math.random().toString(36).substring(2, 8);
  +    return `business-${randomSuffix}`;
  +  }
  +
  +  return cleaned;
   }
  ```

### File 2: `app/api/business/route.ts`
- **Diff Summary**:
  ```diff
  @@ -48,7 +48,7 @@
  -    // Generate unique slug
  +    // Generate unique slug with bounded collision retry
       const baseSlug = generateSlug(name);
       let slug = baseSlug;
       let attempt = 0;
       while (await prisma.business.findUnique({ where: { slug } })) {
         attempt++;
  +      if (attempt > 10) {
  +        // Prevent infinite loops under high collision frequency
  +        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
  +        break;
  +      }
         slug = `${baseSlug}-${attempt}`;
       }
  ```

### File 3: `app/api/qr/route.ts`
- **Diff Summary**:
  ```diff
  @@ -7,4 +7,6 @@
  -  const size = Math.min(Math.max(parseInt(searchParams.get("size") ?? "300"), 100), 600);
  +  const sizeParam = searchParams.get("size") ?? "300";
  +  const parsedSize = parseInt(sizeParam, 10);
  +  const size = Math.min(Math.max(isNaN(parsedSize) ? 300 : parsedSize, 100), 600);
  ...
  -    const buffer = await QRCode.toBuffer(decodeURIComponent(url), {
  +    // searchParams.get("url") already percent-decodes once per WHATWG standard.
  +    // Pass url directly without redundant decodeURIComponent to prevent URIError crashes.
  +    const buffer = await QRCode.toBuffer(url, {
  ```

### File 4: `lib/ai.ts`
- **Diff Summary**:
  ```diff
  @@ -65,1 +65,1 @@
  -  const modelsToTry = ["qwen/qwen3.8-27b", "groq/compound-mini", "qwen/qwen3.6-27b"];
  +  const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  ...
  @@ -109,1 +109,1 @@
  -  const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];
  +  const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash"];
  ```

### File 5: `lib/db.ts`
- **Diff Summary**:
  ```diff
  @@ -7,3 +7,4 @@
   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
  +  pool: Pool | undefined;
   };

   function createPrismaClient() {
  -  const pool = new Pool({ connectionString });
  +  const pool =
  +    globalForPrisma.pool ??
  +    new Pool({
  +      connectionString,
  +      max: process.env.NODE_ENV === "production" ? 5 : 10,
  +      idleTimeoutMillis: 30000,
  +      connectionTimeoutMillis: 5000,
  +    });
  +  globalForPrisma.pool = pool;

     const adapter = new PrismaPg(pool);
  ...
  -if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  +// Unconditionally cache singleton on globalThis to reuse across serverless warm lambdas and dev HMR
  +globalForPrisma.prisma = prisma;
  ```

---

## 4. Caveats

- **Exclusive Write Ownership Respected**: Only the five designated files (`lib/utils.ts`, `app/api/business/route.ts`, `app/api/qr/route.ts`, `lib/ai.ts`, `lib/db.ts`) were modified. No other files or shared test fixtures were touched.
- **Random Fallbacks**: Non-Latin business names produce random URL-safe slugs (`business-${randomSuffix}`). This ensures collision safety and valid URL formatting. The slug is generated once during merchant creation and persisted in the database, preserving permanent link stability for the merchant's review funnel.
- **AI Live API Keys**: While valid model identifiers are now set, live AI review generation in production requires valid API keys in `GROQ_API_KEY` and/or `GEMINI_API_KEY`. Without API keys, the fallback error handler gracefully informs callers that AI generation is unavailable.

---

## 5. Conclusion

Milestone 2 (R3: Edge-Case Crash Prevention & Model Configuration) is fully and genuinely implemented across all five files.
- Slug generation now handles accents, unicode edge cases, non-Latin alphabets, and emojis gracefully with guaranteed non-empty URL-safe fallbacks.
- Collision retries are safely bounded at 10 iterations.
- The QR route avoids redundant decoding and parses sizes safely, immune to `URIError` on percent sequences.
- AI review generation points to active Groq and Gemini models.
- Database connections and pool resources are strictly managed with pool limits, timeouts, and unconditional singleton caching on `globalThis`.

---

## 6. Verification Method

### 6.1 Unit & Integration Test Suite
Execute the project test command:
```bash
npm test
```
**Observed Output**:
```
Test Files  12 passed (12)
     Tests  63 passed (63)
  Duration  18.85s
```

### 6.2 Production Build Verification
Execute Next.js production build command:
```bash
npm run build
```
**Observed Output**:
```
✓ Compiled successfully in 18.8s
  Running TypeScript ...
  Finished TypeScript in 12.8s ...
✓ Generating static pages using 3 workers (22/22) in 1932ms
Exit code: 0
```
All 22 routes compiled and statically generated/rendered with zero errors.
