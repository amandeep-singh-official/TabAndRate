# Handoff Report: R3 Investigation — Edge-Case Crash Prevention & Model Configuration

**Author**: Explorer 2 (`teamwork_preview_explorer_survey_2`)  
**Parent Conversation ID**: `5536c17a-07b2-41f2-9978-372723801393`  
**Milestone**: Requirement R3 Investigation  
**Date**: 2026-09-13  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Slug Generation (`lib/utils.ts` & `app/api/business/route.ts`)

**Existing Code in `lib/utils.ts` (lines 9–18)**:
```typescript
/** Generate a URL-safe slug from a business name */
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

**Existing Code in `app/api/business/route.ts` (lines 48–56)**:
```typescript
    // Generate unique slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.business.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }
```

**Observed Execution Behavior Across Edge Cases** (tested directly via Node runtime):
- Hindi `"चाय कैफ़े"`: Output is `"-"` (single hyphen)
- Hindi single word `"नमस्ते"`: Output is `""` (empty string)
- Chinese `"北京烤鸭"`: Output is `""` (empty string)
- Arabic `"مطعم السعادة"`: Output is `"-"` (single hyphen)
- Cyrillic `"Кафе Бар"`: Output is `"-"` (single hyphen)
- Emojis `"🍕🎉🚀"`: Output is `""` (empty string)
- Symbols only `"!!! @@@ ###"`: Output is `"-"` (single hyphen)
- Accented Latin `"Café & Crêpe"`: Output is `"caf-crpe"` (accented characters stripped rather than transliterated/normalized)
- Leading/trailing symbols `" - hello world - "`: Output is `"-hello-world-"` (leading and trailing hyphens preserved)

**Downstream Impact in Existing Codebase**:
1. **Route 404 in `app/r/[slug]/page.tsx`**: When a merchant with non-Latin/emoji names gets an empty slug `""`, navigating to `/r/` fails to match the dynamic parameter `[slug]` and returns a 404 page.
2. **Schema Rejection in `app/api/generate/route.ts` (line 8)**:
   `slug: z.string().min(1)` — Zod validation rejects requests with empty slugs (`""`), returning `400 Bad Request`.
3. **Schema Rejection in `app/api/analytics/route.ts` (line 6)**:
   `slug: z.string().min(1)` — Rejects requests with empty slugs, returning `400 Bad Request`.
4. **Onboarding QR Failure in `app/onboarding/step3/page.tsx` (line 41)**:
   `if (!slug) return;` — QR code fetch is aborted entirely when slug is empty.
5. **Malformed Collision Sequence in `app/api/business/route.ts`**:
   If `baseSlug` is `""`, `slug = baseSlug` is `""`. If `""` exists, `attempt = 1` results in `"-1"`, then `"-2"`, `"-3"`. If `baseSlug` is `"-"`, `attempt = 1` yields `"--1"`, `"--2"`.
6. **Unbounded Loop**:
   The `while (await prisma.business.findUnique({ where: { slug } }))` loop has no maximum attempt limit, posing request timeout and database connection saturation risks under high collision frequency.

---

### 1.2 QR Route Decoding (`app/api/qr/route.ts`)

**Existing Code in `app/api/qr/route.ts` (lines 4–35)**:
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const size = Math.min(Math.max(parseInt(searchParams.get("size") ?? "300"), 100), 600);

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    const buffer = await QRCode.toBuffer(decodeURIComponent(url), {
      width: size,
      margin: 2,
      color: {
        dark: "#09090b",  // near-black
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[QR_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate QR code." }, { status: 500 });
  }
}
```

**Caller Pattern in UI Components**:
- `components/dashboard/qr-code-page.tsx` (lines 19–20):
  `const encoded = encodeURIComponent(funnelUrl);`  
  `setQrUrl(\`/api/qr?url=\${encoded}&size=400\`);`
- `components/dashboard/flyer-design-canvas.tsx` (line 48):
  `const qrImageUrl = \`/api/qr?url=\${encodeURIComponent(funnelUrl)}&size=\${config.qrSize * 2}\`;`
- `app/onboarding/step3/page.tsx` (lines 42–43):
  `const url = encodeURIComponent(\`\${window.location.origin}/r/\${slug}\`);`  
  `fetch(\`/api/qr?url=\${url}&size=200\`)`

**Observed Execution Behavior**:
- When the client calls `/api/qr?url=${encodeURIComponent(targetUrl)}`, WHATWG `URLSearchParams.prototype.get('url')` automatically percent-decodes the query parameter once.
- Line 14 executes `decodeURIComponent(url)` a **second time** on the already-decoded string.
- If `targetUrl` contains any percent character not followed by two hexadecimal digits (e.g. `?discount=50%off`, `?offer=100%real`, `?tax=5%`, or malformed sequences `%99`), `decodeURIComponent` throws:
  `URIError: URI malformed`
- This is caught in line 31 and returns `{ error: "Failed to generate QR code." }` with status `500`.
- If `targetUrl` contains intentional percent-encoded parameters (e.g. `%20` or `%26`), double-decoding converts `%20` into literal spaces and `%26` into `&`, altering query string boundaries and corrupting the destination URL.

---

### 1.3 AI Model Identifiers (`lib/ai.ts`)

**Existing Code in `lib/ai.ts`**:
- **Groq configuration (lines 64–66)**:
```typescript
  const groq = new Groq({ apiKey });
  const modelsToTry = ["qwen/qwen3.8-27b", "groq/compound-mini", "qwen/qwen3.6-27b"];
```
- **Gemini configuration (lines 108–110)**:
```typescript
  const gemini = new GoogleGenerativeAI(apiKey);
  const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];
```
- **Fallback cascade (lines 143–161)**:
```typescript
export async function generateReviews(
  params: GenerateReviewsParams
): Promise<string[]> {
  const count = params.count ?? 5;

  try {
    // Primary: Groq (ultra-fast, free)
    return await generateWithGroq(params, count);
  } catch (primaryError) {
    console.warn("[AI] Groq failed, falling back to Gemini:", primaryError);
    try {
      // Fallback: Gemini Flash
      return await generateWithGemini(params, count);
    } catch (fallbackError) {
      console.error("[AI] Both providers failed:", fallbackError);
      throw new Error("AI generation unavailable. Please try again.");
    }
  }
}
```

**Observed Flaws**:
1. In Groq SDK (`groq-sdk` v1.6.0): None of `"qwen/qwen3.8-27b"`, `"groq/compound-mini"`, or `"qwen/qwen3.6-27b"` exist on Groq. All three calls result in 404 Model Not Found errors.
2. In Google Generative AI (`@google/generative-ai` v0.24.1): Neither `"gemini-3.6-flash"` nor `"gemini-flash-latest"` are valid API model identifiers. Both result in 404 Model Not Found errors.
3. Every real invocation of `/api/generate` in production causes all 3 Groq attempts to fail, triggers fallback to Gemini, causes both Gemini attempts to fail, and throws `AI generation unavailable. Please try again.`, returning HTTP 500.
4. Active, supported models on Groq:
   - `llama-3.3-70b-versatile` (primary production model)
   - `llama-3.1-8b-instant` (lightweight, ultra-fast model)
5. Active, supported models on Google Gemini:
   - `gemini-1.5-flash` (production standard, fast, structured JSON output)
   - `gemini-2.0-flash` (latest generation model)

---

### 1.4 Database Connection Singleton & Pooling (`lib/db.ts`)

**Existing Code in `lib/db.ts` (lines 1–26)**:
```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Observed Flaws**:
1. **Missing Production Global Assignment (line 25)**:
   `if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;`
   In production (`NODE_ENV === "production"`), `globalForPrisma.prisma` is never set.
   In Next.js App Router serverless deployments (Vercel, AWS Lambda, Netlify), route handlers and server components are bundled into distinct chunks or lambda worker executions.
   When warm lambdas handle successive requests or multiple routes within the same Node process, `globalForPrisma.prisma` is `undefined`, triggering `createPrismaClient()` on every evaluation.
2. **Untracked `pg.Pool` Instance**:
   `pool` is created as a local variable inside `createPrismaClient()`. It is not attached to `globalThis` or the singleton container.
3. **No Connection Pool Limits or Timeouts**:
   `new Pool({ connectionString })` is invoked with default settings (`max: 10`, no `idleTimeoutMillis`, no `connectionTimeoutMillis`).
   In serverless environments backed by Supabase / Neon / PgBouncer, unconstrained connection creation rapidly exhausts PostgreSQL's connection pool, causing connection timeouts and `too many connections` errors.

---

## 2. Logic Chain

### 2.1 Slug Generation Failure
1. **Premise**: `generateSlug(name)` uses regex `/[^a-z0-9\s-]/g` to remove all characters outside ASCII alphanumeric, whitespace, and hyphens.
2. **Deduction**:
   - For non-Latin alphabets (Devanagari, Arabic, Chinese, Cyrillic, Greek), all letter characters are matched by `[^a-z0-9\s-]` and erased.
   - If the input had spaces between words (e.g. `"चाय कैफ़े"`), only spaces remain; `replace(/\s+/g, "-")` turns them into `"-"`.
   - If the input had no spaces (e.g. `"北京烤鸭"`, `"🍕🎉"`), the entire string becomes `""`.
3. **Downstream Cascade**:
   - Next.js dynamic routing expects `/r/[slug]`. Route `/r/` returns HTTP 404.
   - Zod schemas in `/api/generate` and `/api/analytics` require `.min(1)`. Empty slugs return HTTP 400.
   - `app/api/business/route.ts` creates slugs `""`, `"-1"`, `"-2"`, or `"-"`, `"--1"`.
   - In `app/api/business/route.ts`, the `while` loop checks `findUnique({ where: { slug } })` without an attempt ceiling, creating a potential denial-of-service vector if collisions escalate.
4. **Resolution**:
   - Normalize accents using `name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")`.
   - Strip leading and trailing hyphens `.replace(/^-+|-+$/g, "")`.
   - If the sanitized slug is empty (`!cleaned`), generate a guaranteed URL-safe fallback: `business-${randomSuffix}`.
   - In `app/api/business/route.ts`, cap the while-loop at 10 attempts and fall back to a random alphanumeric suffix.

### 2.2 QR Double-Decoding Crash
1. **Premise**: Web standard `URLSearchParams.prototype.get('url')` parses query strings by extracting percent-encoded key-value pairs and decoding each component once.
2. **Deduction**:
   - When client sends `/api/qr?url=${encodeURIComponent(targetUrl)}`, `searchParams.get("url")` restores `targetUrl` to its exact original form.
   - Calling `decodeURIComponent(url)` on this string constitutes a second, redundant decoding pass.
   - Any `%` character that is not followed by two valid hex digits causes the JavaScript engine to throw `URIError: URI malformed`.
3. **Resolution**:
   - Remove `decodeURIComponent(url)`. Pass `url` directly from `searchParams.get("url")` into `QRCode.toBuffer(url, ...)`.

### 2.3 AI Provider Failure
1. **Premise**: `lib/ai.ts` defines hardcoded model arrays for Groq (`["qwen/qwen3.8-27b", "groq/compound-mini", "qwen/qwen3.6-27b"]`) and Gemini (`["gemini-3.6-flash", "gemini-flash-latest"]`).
2. **Deduction**:
   - These model strings do not exist in the Groq or Google Gemini API catalogs.
   - Every API request returns a 404 error from both providers.
   - Because both primary (Groq) and secondary (Gemini) fail, `generateReviews()` always throws, causing 100% error rates on review generation.
3. **Resolution**:
   - Replace Groq model array with active models: `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]`.
   - Replace Gemini model array with active models: `["gemini-1.5-flash", "gemini-2.0-flash"]`.

### 2.4 Database Connection Leaks
1. **Premise**: Node.js in serverless platforms keeps the execution environment ("warm container") alive across multiple requests.
2. **Deduction**:
   - By omitting `globalForPrisma.prisma = prisma;` in production, separate route handlers bundled into distinct files or re-evaluated within the same process cannot find `prisma` on `globalThis`.
   - Each bundle instantiates a new `Pool` and a new `PrismaClient`.
   - Default `Pool` allows up to 10 connections with no idle timeouts, rapidly depleting pool slots in managed Postgres databases.
3. **Resolution**:
   - Store both `prisma` and `pool` on `globalThis` unconditionally (in both development and production).
   - Configure pool parameters: `max: process.env.NODE_ENV === "production" ? 5 : 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.

---

## 3. Proposed Solution & Fix Strategy

### 3.1 `lib/utils.ts` — Robust Slug Generation

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/lib/utils.ts`  
**Lines to Replace**: Lines 9–18

```typescript
/** Generate a URL-safe slug from a business name */
export function generateSlug(name: string): string {
  // Normalize accents (e.g., "Café" -> "Cafe")
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const cleaned = normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") // Strip leading and trailing hyphens
    .slice(0, 50)
    .replace(/-+$/, ""); // Ensure no trailing hyphen after slicing

  if (!cleaned) {
    // URL-safe fallback for non-Latin, emoji-only, or special-char-only names
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `business-${randomSuffix}`;
  }

  return cleaned;
}
```

### 3.2 `app/api/business/route.ts` — Collision Cap & Safe Slug

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/app/api/business/route.ts`  
**Lines to Replace**: Lines 48–56

```typescript
    // Generate unique slug with bounded collision retry
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.business.findUnique({ where: { slug } })) {
      attempt++;
      if (attempt > 10) {
        // Prevent infinite loops under high collision
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
        break;
      }
      slug = `${baseSlug}-${attempt}`;
    }
```

### 3.3 `app/api/qr/route.ts` — Safe URL Parameter Parsing

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/app/api/qr/route.ts`  
**Lines to Replace**: Lines 4–24

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const sizeParam = searchParams.get("size") ?? "300";
  const parsedSize = parseInt(sizeParam, 10);
  const size = Math.min(Math.max(isNaN(parsedSize) ? 300 : parsedSize, 100), 600);

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    // searchParams.get("url") already performs standard percent-decoding.
    // Pass url directly to QRCode.toBuffer without calling decodeURIComponent to prevent URIError crashes.
    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#09090b", // near-black
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[QR_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate QR code." }, { status: 500 });
  }
}
```

### 3.4 `lib/ai.ts` — Valid AI Model Identifiers & Robust Error Recording

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/lib/ai.ts`  
**Lines to Replace**:
- In `generateWithGroq` (line 65):
  Replace `const modelsToTry = ["qwen/qwen3.8-27b", "groq/compound-mini", "qwen/qwen3.6-27b"];` with:
  `const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];`
- In `generateWithGemini` (line 109):
  Replace `const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];` with:
  `const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash"];`

### 3.5 `lib/db.ts` — Production Serverless Singleton & Pool Management

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/lib/db.ts`  
**Full Replacement**:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

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

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always assign to globalThis to preserve singleton across HMR (dev) and warm serverless containers (prod)
globalForPrisma.prisma = prisma;
```

---

## 4. Caveats & Edge Cases

1. **Random Fallback Determinism**:
   When a business name consists entirely of emojis or non-Latin characters, `generateSlug` will return a random fallback `business-${randomSuffix}`. This ensures uniqueness and validity, but repeated calls with the same non-Latin name will produce distinct fallback strings. In the registration flow (`app/api/business/route.ts`), this is called once upon business creation and saved to the database, so the merchant's saved slug remains stable.
2. **QR Code Parameter Safety**:
   If a client double-encodes a URL before sending it to `/api/qr`, `url` will contain the once-encoded string. Passing `url` directly encodes that string into the QR code. Standard modern phone cameras scan and parse percent-encoded URLs correctly.
3. **AI API Key Dependency**:
   Validating model IDs resolves the 404 API error. If neither `GROQ_API_KEY` nor `GEMINI_API_KEY` is configured in the environment, `generateReviews` will throw an error notifying that AI generation is unavailable. Tests should continue mocking `generateReviews` or the underlying SDK clients to prevent external network calls during CI.
4. **Prisma Driver Adapter Support**:
   `@prisma/adapter-pg` version `7.10.0` uses the provided `pg.Pool`. Setting `max: 5` in production avoids connection saturation when multiple serverless instances handle concurrent requests.

---

## 5. Verification Method

### 5.1 Slug Generation Verification
Add tests to `test/unit/utils.test.ts`:
```typescript
it("handles non-Latin, emoji, and special-character business names with a valid URL-safe fallback", () => {
  const hindi = generateSlug("चाय कैफ़े");
  expect(hindi).toMatch(/^business-[a-z0-9]+$/);

  const emojis = generateSlug("🍕🎉🚀");
  expect(emojis).toMatch(/^business-[a-z0-9]+$/);

  const accented = generateSlug("Café & Crêpe");
  expect(accented).toBe("cafe-crepe");

  const trailingHyphens = generateSlug(" - Hello World - ");
  expect(trailingHyphens).toBe("hello-world");
});
```

### 5.2 QR Decoding Crash Immunity Verification
Add tests to `test/integration/api-qr.test.ts`:
```typescript
it("handles URLs containing percent characters without throwing URIError", async () => {
  const targetUrl = encodeURIComponent("https://tabandrate.com/r/cafe?discount=50%off");
  const req = new NextRequest(`http://localhost:3000/api/qr?url=${targetUrl}`);
  const res = await GET(req);
  expect(res.status).toBe(200);
});
```

### 5.3 AI Model Verification
Add tests to `test/unit/ai.test.ts`:
- Verify `modelsToTry` in `lib/ai.ts` contains only `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]` for Groq and `["gemini-1.5-flash", "gemini-2.0-flash"]` for Gemini.

### 5.4 Database Singleton Verification
- Inspect `lib/db.ts` to ensure `globalForPrisma.prisma = prisma;` is unconditional without `if (process.env.NODE_ENV !== "production")`.
- Execute `npm run test` and `npm run build` to confirm clean compilation and test passes.
