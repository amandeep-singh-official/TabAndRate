# Project: TabAndRate Security, Reliability, and Edge-Case Remediation

## Architecture
TabAndRate is a Next.js 16 (React 19, App Router) web application designed for local businesses to collect Google reviews via smart QR codes with AI-powered review drafts and sentiment-aware routing.
- **Routing & Middleware**: NextAuth v5 middleware (`middleware.ts`, `auth.config.ts`) handles session protection across `/dashboard` and `/api/business`, while public visitors access the review funnel at `/r/[slug]` and its supporting API routes (`/api/generate`, `/api/analytics`). Root landing page is served by `app/page.tsx`.
- **Authentication**: Credentials authentication backed by Prisma & PostgreSQL (`auth.ts`, `app/api/auth/register/route.ts`). All emails normalized (`toLowerCase().trim()`).
- **Edge-Case Utilities & Model Providers**:
  - URL-safe slug generation in `lib/utils.ts` and `app/api/business/route.ts` with accent stripping, unicode cleaning, and safe non-empty random fallbacks.
  - Safe QR code generation endpoint in `app/api/qr/route.ts` avoiding double URL decoding.
  - Multi-provider AI generation in `lib/ai.ts` with valid Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and Gemini (`gemini-1.5-flash`, `gemini-2.0-flash`) models.
  - Singleton database access via Prisma 7 & pg driver adapter in `lib/db.ts` preserving pooled connections across dev HMR and serverless warm lambdas.
- **Analytics & UI**:
  - High-performance, un-truncated aggregation in `app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/dashboard/analytics/page.tsx` using database-level `groupBy` and immutable date intervals.
  - Valid HTML semantics and Base UI compliance in `app/onboarding/step3/page.tsx` and `components/dashboard/feedback-view.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Middleware Public Path Access | Allow unauthenticated requests to `/api/generate` and `/api/analytics` in `auth.config.ts` for `/r/[slug]` funnel | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Eliminate Root Route Collision | Remove `app/(dashboard)/page.tsx` so `app/page.tsx` cleanly serves `/` without redirecting visitors to `/login` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | User Registration Email Normalization | Normalize email via `toLowerCase().trim()` in `app/api/auth/register/route.ts` | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Credentials Login Email Normalization | Normalize email via `toLowerCase().trim()` in `auth.ts` authorize callback | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Non-Latin & Emoji Slug Generation | Enhance `generateSlug` in `lib/utils.ts` to normalize accents and provide safe non-empty fallbacks | M2 | ORIGINAL_REQUEST §R3 |
| 6 | Business Slug Collision Guard | Cap collision loop at 10 iterations with random suffix fallback in `app/api/business/route.ts` | M2 | ORIGINAL_REQUEST §R3 |
| 7 | QR Parameter Double-Decoding Fix | Remove redundant `decodeURIComponent` in `app/api/qr/route.ts` to prevent `URIError` on percent sequences | M2 | ORIGINAL_REQUEST §R3 |
| 8 | Valid AI Model Identifiers | Configure active Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and Gemini (`gemini-1.5-flash`, `gemini-2.0-flash`) in `lib/ai.ts` | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Database Connection Singleton & Pool Limits | Cache PrismaClient & pg.Pool unconditionally on `globalThis` with pool limits and timeouts in `lib/db.ts` | M2 | ORIGINAL_REQUEST §R3 |
| 10 | Analytics Unbounded Aggregation | Replace `take: 50` and `take: 500` with Prisma `groupBy` for lifetime metrics and bounded date queries | M3 | ORIGINAL_REQUEST §R4 |
| 11 | Immutable Date Bucket Arithmetic | Eliminate in-place `date.setHours` mutation bugs in dashboard and analytics chart generation | M3 | ORIGINAL_REQUEST §R4 |
| 12 | Base UI Render Prop Fix | Ensure semantic HTML without invalid `type="button"` on `<a>` tags in `step3/page.tsx` and `feedback-view.tsx` | M3 | ORIGINAL_REQUEST §R4 |
| 13 | Automated Test Suite Expansion | Add comprehensive Vitest unit and integration tests for R1, R2, R3, R4 in `test/` | M4 | ORIGINAL_REQUEST §R5 |
| 14 | Verification & Audit Report | Verify `npm run test` and `npm run build` pass with zero errors, and publish `AUDIT_REPORT.md` | M5 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Middleware Access & Auth Hardening (R1, R2) | `auth.config.ts`, `app/(dashboard)/page.tsx`, `app/api/auth/register/route.ts`, `auth.ts` | none | DONE |
| M2 | Core Reliability & Crash Prevention (R3) | `lib/utils.ts`, `app/api/business/route.ts`, `app/api/qr/route.ts`, `lib/ai.ts`, `lib/db.ts` | none | DONE |
| M3 | Analytics Aggregation & UI Render Fixes (R4) | `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/analytics/page.tsx`, `components/dashboard/feedback-view.tsx`, `app/onboarding/step3/page.tsx` | none | DONE |
| M4 | Comprehensive Test Suite & Regression Coverage (R5) | `test/unit/auth-config.test.ts`, `test/unit/utils-slug.test.ts`, `test/integration/api-auth-register.test.ts`, `test/integration/api-qr.test.ts`, `test/unit/ai.test.ts`, `test/integration/analytics-aggregation.test.ts`, `test/components/onboarding-step3.test.tsx` | M1, M2, M3 | DONE |
| M5 | Build Verification & Formal Comprehensive Audit Report (R5) | Run `npm run test`, `npm run build`, produce formal `AUDIT_REPORT.md` at root | M4 | DONE |

## Interface Contracts
### Public Review Funnel (`CustomerFunnel` ↔ Middleware & API)
- `POST /api/generate`: Unauthenticated POST request with `{ slug: string, tags: string[], extraNotes?: string, language?: string }`.
  - Expected response: `{ reviews: string[] }` (HTTP 200) or `{ error: string }` (HTTP 400/500). Must NOT return HTTP 307 redirect to `/login`.
- `POST /api/analytics`: Unauthenticated POST request with `{ slug: string, type: "visit" | "generate" | "redirect" | "intercepted", metadata?: Record<string, unknown> }`.
  - Expected response: `{ ok: true }` (HTTP 200). Must NOT return HTTP 307 redirect to `/login`.

### Authentication Contract (`Register` & `SignIn` ↔ PostgreSQL)
- All user emails stored and queried in normalized lowercase format: `email.trim().toLowerCase()`.
- Uniqueness enforced case-insensitively via normalized input.

### Utility & Service Contracts
- `generateSlug(name: string): string`: Guarantees non-empty, URL-safe alphanumeric string, accent-normalized, lowercase, max 50 chars. If input contains no ASCII alphanumerics, returns `business-${randomSuffix}`.
- `GET /api/qr?url=<encodedUrl>&size=<size>`: Always handles arbitrary query parameters including percent symbols without throwing `URIError`. Returns image/png.
- `prisma`: Singleton PrismaClient with underlying `pg.Pool` cached on `globalThis.prisma` and `globalThis.pool`.

## Code Layout
- `auth.config.ts`: NextAuth middleware authorization rules
- `auth.ts`: NextAuth configuration and credentials provider
- `app/(dashboard)/page.tsx`: Redundant root page to be removed
- `app/api/auth/register/route.ts`: Registration route handler
- `lib/utils.ts`: General utilities including `generateSlug`
- `app/api/business/route.ts`: Business creation and slug assignment
- `app/api/qr/route.ts`: QR code generation route handler
- `lib/ai.ts`: AI multi-provider review generation
- `lib/db.ts`: Database client and connection pool singleton
- `app/(dashboard)/dashboard/page.tsx`: Merchant overview dashboard
- `app/(dashboard)/dashboard/analytics/page.tsx`: Merchant analytics dashboard
- `components/dashboard/feedback-view.tsx`: Feedback view component
- `app/onboarding/step3/page.tsx`: Onboarding completion & preview
- `test/`: Vitest test suites
- `AUDIT_REPORT.md`: Comprehensive audit report
