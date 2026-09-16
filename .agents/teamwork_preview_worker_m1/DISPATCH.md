## 2026-09-13T10:52:14Z
You are Worker M1 on the TabAndRate project.
Your identity: teamwork_preview_worker
Your working directory: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_m1
Parent conversation ID: 5536c17a-07b2-41f2-9978-372723801393

MANDATORY FIRST STEP:
Read the authoritative user request at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
Read the Explorer 1 survey report at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_explorer_survey_1/handoff.md
Read the scope document at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_orchestrator_1/PROJECT.md

Exclusive Write Ownership:
You own and may modify ONLY the following files:
1. /Users/amandeepsingh/Desktop/TabandRate/auth.config.ts
2. /Users/amandeepsingh/Desktop/TabandRate/app/(dashboard)/page.tsx (DELETE this file)
3. /Users/amandeepsingh/Desktop/TabandRate/app/api/auth/register/route.ts
4. /Users/amandeepsingh/Desktop/TabandRate/auth.ts

Task Assignment (Milestone 1: R1 & R2):
1. Public Review Funnel Middleware Access (auth.config.ts):
   - Update PUBLIC_PATHS to include "/api/generate" and "/api/analytics".
   - Refine isPublic evaluation so that:
     pathname === "/" ||
     PUBLIC_PATHS.filter((p) => p !== "/").some((p) => pathname === p || pathname.startsWith(p + "/")) ||
     pathname.startsWith("/api/auth")
     returns true.
   - Verify that protected routes (/dashboard, /dashboard/analytics, /api/business) remain strictly protected.

2. Eliminate Root Route Collision:
   - Delete /Users/amandeepsingh/Desktop/TabandRate/app/(dashboard)/page.tsx.
   - This removes the route collision with app/page.tsx and stops DashboardLayout from redirecting unauthenticated landing page visitors to /login.

3. Authentication Email Normalization (app/api/auth/register/route.ts):
   - Update registerSchema to trim and lowercase the email: z.string().trim().toLowerCase().email().
   - Normalize email (parsed.data.email.toLowerCase().trim()) before querying prisma.user.findUnique and before creating user in prisma.user.create.

4. Authentication Email Normalization (auth.ts):
   - In credentials provider credentialsSchema, use z.string().trim().toLowerCase().email().
   - In authorize(credentials), normalize email (parsed.data.email.toLowerCase().trim()) before querying prisma.user.findUnique({ where: { email } }).

5. Verification:
   - Run `npm test` to verify that existing test suites pass cleanly.

Output Requirements:
- Write a detailed handoff report to:
  /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_m1/handoff.md
  Include:
  1. What changed (files touched, diffs, rationale).
  2. Verification commands and exact outputs.
  3. Residual risks or edge cases.
- Send a message to parent (conversation ID: 5536c17a-07b2-41f2-9978-372723801393) reporting completion.
