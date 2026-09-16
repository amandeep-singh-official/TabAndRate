# DISPATCH — Worker Remediation

## 2026-09-13T12:01:54Z

You are Worker Remediation on the TabAndRate project.
Your identity: teamwork_preview_worker
Your working directory: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_remediation
Parent conversation ID: 5536c17a-07b2-41f2-9978-372723801393

MANDATORY FIRST STEP:
Read the authoritative user request at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
Read Reviewer 1's report at:
/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_reviewer_1/handoff.md

Tasks to Resolve Reviewer 1 Feedback:
1. Fix TypeScript type errors in `test/integration/challenger-stress.test.ts`:
   - Lines 28, 37, 67, 80, 104, 130 currently cause TS2345 errors because mockImplementation returns `Promise<any>` instead of `Prisma__BusinessClient`. Cast the mock implementations appropriately (e.g. `as any`) so `npx tsc --noEmit` produces 0 errors.
2. Eliminate test timeouts in `test/integration/api-auth-register.test.ts`:
   - In `test/integration/api-auth-register.test.ts`, mock `bcrypt.hash` using:
     `vi.spyOn(bcrypt, "hash").mockImplementation(async () => "$2a$12$e8YqK6hFzH4R0p0y7D8cOe12345678901234567890123456789012");`
     so that running tests under heavy parallel CPU load does not exceed Vitest's 5000ms timeout.
3. In `auth.config.ts`:
   - Tighten line 33 from `pathname.startsWith("/api/auth")` to `(pathname === "/api/auth" || pathname.startsWith("/api/auth/"))` for defense-in-depth against hypothetical `/api/author` matching.
4. Verify all three quality gates:
   - Run `npx tsc --noEmit` using run_command: confirm exit code 0 and zero errors.
   - Run `npm test` using run_command: confirm all test suites pass with zero failures.
   - Run `npm run build` using run_command: confirm Next.js production build succeeds with exit code 0. (If a stale `.next` cache exists, remove `.next` and rebuild).
5. Ensure `AUDIT_REPORT.md` reflects the final test count and clean build status.

Output Requirements:
- Write a detailed handoff report to:
  /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_worker_remediation/handoff.md
- Send message to parent (conversation ID: 5536c17a-07b2-41f2-9978-372723801393) reporting completion.
