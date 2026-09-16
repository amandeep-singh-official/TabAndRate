# Original User Request

## 2026-09-13T10:42:22Z

Conduct a comprehensive security, reliability, and edge-case audit across the TabAndRate Next.js codebase, fix all identified vulnerabilities and crash vectors across middleware, auth, AI generation, QR encoding, database pooling, and UI components, and deliver an exhaustive audit report.

Working directory: /Users/amandeepsingh/Desktop/TabandRate
Integrity mode: development

## Requirements

### R1. Public Review Funnel & Middleware Access
Ensure that public end-customer review funnel endpoints (/api/generate and /api/analytics) are accessible to unauthenticated visitors scanning QR codes at /r/[slug] by updating the NextAuth middleware configuration in auth.config.ts. Eliminate route collision/shadowing between app/page.tsx and app/(dashboard)/page.tsx.

### R2. Authentication Hardening & Case Normalization
Normalize email addresses (toLowerCase().trim()) during user registration (app/api/auth/register/route.ts) and credentials sign-in (auth.ts) to prevent case-sensitivity lockout issues in PostgreSQL.

### R3. Edge-Case Crash Prevention & Model Configuration
Fix generateSlug in lib/utils.ts to ensure non-Latin business names (e.g. Hindi, Arabic, Chinese) and emoji-only names produce valid, non-empty slugs without collision loops. Fix double URL decoding in app/api/qr/route.ts to eliminate URIError crashes. Replace invalid Groq and Gemini model IDs in lib/ai.ts with valid, supported models. Fix database connection leaks in lib/db.ts to maintain a singleton Prisma client in production serverless environments.

### R4. Analytics Aggregation & UI Incompatibilities
Fix analytics truncation (take: 50 in dashboard, take: 500 in analytics) and in-place Date mutation bugs by properly aggregating event counts in app/(dashboard)/dashboard/page.tsx and app/(dashboard)/dashboard/analytics/page.tsx. Replace unsupported Base UI render prop usages in components/dashboard/feedback-view.tsx and app/onboarding/step3/page.tsx.

### R5. Verification, Regression Testing & Audit Report
Add automated test coverage for the fixes (slug generation edge cases, public middleware access, QR encoding safety, email normalization). Ensure npm run test and npm run build pass cleanly. Produce a comprehensive, formal audit and remediation report summarizing all findings, root causes, and patches.

## Acceptance Criteria

### Security & Access Control
- [ ] Unauthenticated requests to /api/generate and /api/analytics are permitted by NextAuth middleware.
- [ ] User registration and credentials login normalize emails so casing differences do not cause authentication failures.
- [ ] Conflicting root page route in app/(dashboard)/page.tsx is resolved.

### Reliability & Crash Immunity
- [ ] Non-Latin and special-character business names generate valid URL-safe fallback slugs without causing empty slugs or routing crashes.
- [ ] app/api/qr/route.ts safely parses URLs without double-decoding or throwing unhandled URIError.
- [ ] lib/ai.ts uses valid, existing model identifiers for both Groq and Gemini.
- [ ] lib/db.ts reuses the PrismaClient and pool connection safely across requests.

### Build, Testing & Report
- [ ] npm run test passes 100% with no unhandled errors.
- [ ] npm run build succeeds with zero errors.
- [ ] A detailed audit and remediation report is created and stored in the repository.
