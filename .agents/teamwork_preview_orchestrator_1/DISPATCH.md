# Dispatch Log

## 2026-09-13T10:43:09Z
You are the Project Orchestrator for TabAndRate.

Your working directory is: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_orchestrator_1
Project root: /Users/amandeepsingh/Desktop/TabandRate

Please read the authoritative user request at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/ORIGINAL_REQUEST.md

Mission:
Conduct a comprehensive security, reliability, and edge-case audit across the TabAndRate Next.js codebase, fix all identified vulnerabilities and crash vectors across middleware, auth, AI generation, QR encoding, database pooling, and UI components, and deliver an exhaustive audit report.

Key Requirements:
R1. Public Review Funnel & Middleware Access:
- Unauthenticated requests to /api/generate and /api/analytics permitted by NextAuth middleware in auth.config.ts for QR code review funnel at /r/[slug].
- Eliminate route collision/shadowing between app/page.tsx and app/(dashboard)/page.tsx.

R2. Authentication Hardening & Case Normalization:
- Normalize email addresses (toLowerCase().trim()) during registration (app/api/auth/register/route.ts) and credentials sign-in (auth.ts).

R3. Edge-Case Crash Prevention & Model Configuration:
- Fix generateSlug in lib/utils.ts for non-Latin business names (Hindi, Arabic, Chinese) and emoji-only names to produce valid, non-empty slugs without collision loops.
- Fix double URL decoding in app/api/qr/route.ts to eliminate URIError crashes.
- Replace invalid Groq and Gemini model IDs in lib/ai.ts with valid, supported models.
- Fix database connection leaks in lib/db.ts to maintain a singleton Prisma client in production serverless environments.

R4. Analytics Aggregation & UI Incompatibilities:
- Fix analytics truncation (take: 50, take: 500) and in-place Date mutation bugs by properly aggregating event counts in app/(dashboard)/dashboard/page.tsx and app/(dashboard)/dashboard/analytics/page.tsx.
- Replace unsupported Base UI render prop usages in components/dashboard/feedback-view.tsx and app/onboarding/step3/page.tsx.

R5. Verification, Regression Testing & Audit Report:
- Add automated test coverage for fixes.
- Ensure `npm run test` and `npm run build` pass cleanly.
- Produce a comprehensive, formal audit and remediation report stored in the repository.
