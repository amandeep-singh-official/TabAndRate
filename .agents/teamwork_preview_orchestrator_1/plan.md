# Orchestration Plan: TabAndRate Audit & Remediation

## Objective
Execute a rigorous end-to-end security, reliability, and edge-case audit across the TabAndRate codebase, fix all issues detailed in R1-R5, implement automated tests, ensure build/test suites pass, and produce a formal audit report.

## Phase 0: Survey & Scope Mapping
- Dispatch 3 parallel Explorers:
  - Explorer 1 (R1 & R2 Focus): Middleware routing (`auth.config.ts`), route collision (`app/page.tsx` vs `app/(dashboard)/page.tsx`), and auth email normalization (`app/api/auth/register/route.ts`, `auth.ts`).
  - Explorer 2 (R3 Focus): Slug generation (`lib/utils.ts`), QR route URL decoding (`app/api/qr/route.ts`), AI models (`lib/ai.ts`), and Prisma connection pooling (`lib/db.ts`).
  - Explorer 3 (R4 & R5 Focus): Analytics aggregation (`app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/analytics/page.tsx`), Base UI usages (`components/dashboard/feedback-view.tsx`, `app/onboarding/step3/page.tsx`), existing testing infra, package.json scripts, build setup.
- Synthesize findings into `PROJECT.md` at root.

## Phase 1: Milestones Execution
- Milestone 1: Middleware & Auth Hardening (R1, R2)
- Milestone 2: Core Reliability & Edge-Case Crash Prevention (R3)
- Milestone 3: Analytics Aggregation & UI Render Fixes (R4)
- Milestone 4: Test Infrastructure & Automated Coverage (R5)
- Milestone 5: Verification (`npm run test`, `npm run build`), Adversarial Testing & Formal Audit Report Publication (R5)

## Phase 2: Review, Verification & Audit Gate
- Reviewers evaluate code quality, security, and edge-case resilience.
- Challengers empirically stress test the implementations.
- Forensic Auditor validates integrity (zero hardcoding, real fixes, clean audit).

## Phase 3: Final Delivery
- Synthesize all findings and verified outputs.
- Report completion back to Sentinel parent.
