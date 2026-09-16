## 2026-09-13T10:56:22Z

You are Worker M2 on the TabAndRate project.
Your identity: teamwork_preview_worker
Your working directory: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_m2
Parent conversation ID: 5536c17a-07b2-41f2-9978-372723801393

MANDATORY FIRST STEP:
Read the authoritative user request at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
Read the Explorer 2 survey report at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_explorer_survey_2/handoff.md
Read the scope document at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_orchestrator_1/PROJECT.md

Exclusive Write Ownership:
You own and may modify ONLY the following files:
1. /Users/amandeepsingh/Desktop/TabandRate/lib/utils.ts
2. /Users/amandeepsingh/Desktop/TabandRate/app/api/business/route.ts
3. /Users/amandeepsingh/Desktop/TabandRate/app/api/qr/route.ts
4. /Users/amandeepsingh/Desktop/TabandRate/lib/ai.ts
5. /Users/amandeepsingh/Desktop/TabandRate/lib/db.ts

Task Assignment (Milestone 2: R3 - Edge-Case Crash Prevention & Model Configuration):
1. Slug Generation (lib/utils.ts):
   - In `generateSlug(name: string)`:
     - Normalize accents using `name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")`.
     - Clean characters: `normalized.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "")`.
     - Fallback: if `!cleaned` (e.g. for Hindi, Arabic, Chinese, Cyrillic, emoji-only names), generate a guaranteed non-empty URL-safe string:
       `const randomSuffix = Math.random().toString(36).substring(2, 8); return "business-" + randomSuffix;`
     - Otherwise return `cleaned`.

2. Bounded Slug Collision Retry (app/api/business/route.ts):
   - In lines 48-56: Ensure the collision `while` loop has a bound (e.g. `if (attempt > 10) { slug = \`${baseSlug}-${Math.random().toString(36).substring(2, 8)}\`; break; }`) to prevent infinite loops under high collision frequency.

3. QR Route Decoding (app/api/qr/route.ts):
   - Eliminate the redundant `decodeURIComponent(url)` call that throws `URIError: URI malformed` on percent-containing URLs (e.g. `?discount=50%off`).
   - `searchParams.get("url")` already percent-decodes once per WHATWG standard. Pass `url` directly to `QRCode.toBuffer(url, ...)`.
   - Ensure safe parsing of `size` parameter (`parseInt(sizeParam, 10)`, bounds clamped between 100 and 600).

4. Valid AI Model Identifiers (lib/ai.ts):
   - In `generateWithGroq`: Replace fictitious models with active production models:
     `const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];`
   - In `generateWithGemini`: Replace fictitious models with active production models:
     `const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash"];`

5. Database Connection Singleton & Pool Management (lib/db.ts):
   - Declare `globalForPrisma` with both `prisma: PrismaClient | undefined; pool: Pool | undefined;`.
   - In `createPrismaClient()`:
     - Reuse `globalForPrisma.pool` or instantiate `new Pool({ connectionString, max: process.env.NODE_ENV === "production" ? 5 : 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })`.
     - Assign `globalForPrisma.pool = pool`.
   - Unconditionally cache the singleton on `globalThis`:
     `globalForPrisma.prisma = prisma;` (remove the `if (process.env.NODE_ENV !== "production")` condition so that serverless production environments also reuse the singleton).

6. Verification:
   - Run `npm test` to verify that all existing tests continue to pass cleanly.

Output Requirements:
- Write a detailed handoff report to:
  /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_m2/handoff.md
  Include:
  1. What changed (files touched, diffs, rationale).
  2. Verification commands and exact outputs.
  3. Residual risks or edge cases.
- Send a message to parent (conversation ID: 5536c17a-07b2-41f2-9978-372723801393) reporting completion.
