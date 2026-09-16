## 2026-09-13T11:12:36Z

<USER_REQUEST>
You are Test Writer M4 on the TabAndRate project.
Your identity: teamwork_preview_test_writer
Your working directory: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_test_writer_m4
Parent conversation ID: 5536c17a-07b2-41f2-9978-372723801393

MANDATORY FIRST STEP:
Read the authoritative user request at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
Read the scope and test plan at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_orchestrator_1/PROJECT.md
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_orchestrator_1/TEST_INFRA.md

Exclusive Write Ownership:
You own and may write/modify test files under `test/`:
- test/unit/auth-config.test.ts
- test/unit/utils.test.ts (or test/unit/utils-slug.test.ts)
- test/integration/api-auth-register.test.ts
- test/integration/api-qr.test.ts
- test/unit/ai.test.ts (or test/unit/ai-models.test.ts)
- test/integration/analytics-aggregation.test.ts
- test/components/onboarding-step3.test.tsx

Task Assignment (Milestone 4: R5 - Automated Test Coverage):
Add comprehensive automated test suites using Vitest for all remediation items:
1. Middleware Public Access Tests (`test/unit/auth-config.test.ts`):
   - Import `authConfig` from `@/auth.config`.
   - Test `authConfig.callbacks.authorized`:
     - Returns `true` for unauthenticated requests to `/api/generate`.
     - Returns `true` for unauthenticated requests to `/api/analytics`.
     - Returns `true` for unauthenticated requests to `/r/my-shop`.
     - Returns `true` for unauthenticated requests to `/`, `/login`, `/signup`.
     - Returns `false` for unauthenticated requests to `/dashboard`, `/dashboard/analytics`, `/api/business`.
     - Returns `true` for authenticated requests (`auth: { user: { id: "123" } }`) to `/dashboard` and `/api/business`.

2. Email Normalization Tests (`test/integration/api-auth-register.test.ts` and `auth.ts` credentials verification):
   - Verify registration with mixed-case and whitespace emails (e.g. `"  Alice.Smith@EXAMPLE.Com  "`) queries `prisma.user.findUnique` with lowercase trimmed email `"alice.smith@example.com"` and stores `"alice.smith@example.com"`.
   - Verify credentials sign-in normalizes email before querying user.

3. Slug Generation Edge-Case Tests (`test/unit/utils.test.ts`):
   - Non-Latin business names: Hindi `"चाय कैफ़े"`, Arabic `"مطعم الشرق"`, Chinese `"北京烤鸭"`, Cyrillic `"Каफे Бар"` produce valid URL-safe non-empty slugs matching `/^business-[a-z0-9]+$/`.
   - Emoji-only business names: `"🍕🎉🚀"`, `"🔥☕️"` produce valid fallback slugs matching `/^business-[a-z0-9]+$/`.
   - Accented Latin names: `"Café & Crêpe"` produces `"cafe-crepe"`.
   - Leading/trailing hyphens: `" - Hello World - "` produces `"hello-world"`.
   - Empty input: `""` produces valid fallback slug.

4. QR Code Safety & Decoding Tests (`test/integration/api-qr.test.ts`):
   - Verify requests with URLs containing percent characters (e.g. `?discount=50%off`, `?offer=100%real`, `%20`, etc.) do NOT throw `URIError` and return status 200 with PNG buffer.
   - Verify size parameter parsing: clamped between 100 and 600, handles invalid strings gracefully without NaN.

5. AI Model Identifiers Tests (`test/unit/ai.test.ts`):
   - Verify Groq model array in `lib/ai.ts` contains only active production models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
   - Verify Gemini model array contains only active production models (`gemini-1.5-flash`, `gemini-2.0-flash`).
   - Verify obsolete/fictitious models are not present.

6. Analytics Aggregation & Date Immutability Tests (`test/integration/analytics-aggregation.test.ts`):
   - Mock Prisma client to return counts and events:
     - Verify lifetime metrics are not truncated at 50 or 500.
     - Verify date buckets over 7-day and 30-day timelines are immutably grouped.

7. Base UI Render Prop Tests (`test/components/onboarding-step3.test.tsx`):
   - Render `app/onboarding/step3/page.tsx` preview button. Verify it renders a clean `<a>` element without invalid `type="button"` attribute or nested `<button><a>` elements.

8. Execution & Verification:
   - Run `npm test` using run_command to verify 100% pass rate across all test suites.

Output Requirements:
- Write a detailed handoff report to:
  /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_test_writer_m4/handoff.md
  Include:
  1. Test files created or updated.
  2. Test cases implemented and what requirement each covers.
  3. Exact test run output (`npm test`).
- Send a message to parent (conversation ID: 5536c17a-07b2-41f2-9978-372723801393) reporting completion.
</USER_REQUEST>
