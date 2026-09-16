# E2E & Unit Test Infra: TabAndRate

## Test Philosophy
- Requirement-driven, regression-immune, multi-tier verification.
- Covers: Middleware authorization, email normalization, URL safety & fallbacks, QR encoding robustness, AI provider reliability, analytics aggregation correctness, and HTML semantic rendering.

## Test Framework
- Vitest 5.0.0 with Happy-DOM (`vitest.config.mts`)
- Testing Library: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Test Runner invocation: `npm test` (`vitest run`)
- Production build invocation: `npm run build` (`next build --webpack`)

## Test Suite Expansion Plan
1. `test/unit/auth-config.test.ts`:
   - Verify unauthenticated access allowed to `/api/generate`, `/api/analytics`, `/r/[slug]`, `/`, `/login`, `/signup`.
   - Verify protected routes (`/dashboard`, `/dashboard/analytics`, `/api/business`) require authentication.
2. `test/integration/api-auth-register.test.ts` & `test/unit/email-normalization.test.ts`:
   - Verify registration with mixed-case and whitespace emails normalizes to lowercase trimmed email.
   - Verify credentials sign-in queries normalized email.
3. `test/unit/utils-slug.test.ts`:
   - Non-Latin names: Hindi, Arabic, Chinese, Cyrillic produce valid URL-safe slugs.
   - Emoji-only names produce valid URL-safe fallback slugs (`business-${randomSuffix}`).
   - Accented characters normalized (`café` -> `cafe`).
   - Boundary tests: empty string, whitespace only, long names.
4. `test/integration/api-qr.test.ts`:
   - Safe parsing of URLs with unescaped and escaped `%` signs, avoiding `URIError`.
   - Verify 200 OK and PNG image generation.
5. `test/unit/ai-models.test.ts`:
   - Verify Groq model identifiers are active (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
   - Verify Gemini model identifiers are active (`gemini-1.5-flash`, `gemini-2.0-flash`).
6. `test/integration/analytics-aggregation.test.ts`:
   - Test event counts with >50 and >500 events without truncation.
   - Verify date grouping without in-place date mutation.
7. `test/components/onboarding-step3.test.tsx`:
   - Verify Base UI `<Button>` or `<Link>` does not produce invalid `type="button"` on `<a>` tags or nested interactive elements.
