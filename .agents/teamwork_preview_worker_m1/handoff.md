# Milestone 1 Handoff Report: R1 & R2

**Agent**: teamwork_preview_worker (Worker M1)  
**Milestone**: Milestone 1 (R1 & R2)  
**Target Requirements**: R1 (Public Review Funnel & Middleware Access) and R2 (Authentication Hardening & Case Normalization)  
**Date**: 2026-09-13  

---

## 1. Observation

### 1.1 Pre-Modification State

1. **`auth.config.ts`**:
   - `PUBLIC_PATHS` was defined as `["/", "/login", "/signup", "/r"]`.
   - The `isPublic` check evaluated:
     ```typescript
     const isPublic =
       PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
       pathname.startsWith("/api/auth");
     ```
   - Requests to `/api/generate` and `/api/analytics` failed `isPublic`, causing unauthenticated QR funnel visitors at `/r/[slug]` to be redirected to `/login` with HTTP 307.
   - Also, `pathname.startsWith(p + "/")` when `p === "/"` created an accidental `//` prefix matching hazard.

2. **`app/(dashboard)/page.tsx`**:
   - Contained:
     ```typescript
     import { redirect } from "next/navigation";

     export default function RootDashboard() {
       redirect("/dashboard");
     }
     ```
   - In Next.js App Router, route group `(dashboard)` does not add a path segment. Both `app/page.tsx` and `app/(dashboard)/page.tsx` mapped to the URL `/`.
   - `.next/server/app-paths-manifest.json` mapped both `"/page": "app/page.js"` and `"/(dashboard)/page": "app/(dashboard)/page.js"`.
   - `app/(dashboard)/layout.tsx` enforces authentication via `await auth()`. Any unauthenticated request hitting `/(dashboard)/page.tsx` was forcibly redirected to `/login`, hijacking traffic from the public landing page `app/page.tsx`.

3. **`app/api/auth/register/route.ts`**:
   - Lines 6–10 and 24–42:
     ```typescript
     const registerSchema = z.object({
       name: z.string().min(1).max(100),
       email: z.string().email(),
       password: z.string().min(6).max(100),
     });
     ...
     const { name, email, password } = parsed.data;
     const existing = await prisma.user.findUnique({ where: { email } });
     ...
     await prisma.user.create({
       data: { name, email, passwordHash },
     });
     ```
   - Email was neither trimmed nor lowercased before validation, unique lookup, or persistence. Because PostgreSQL treats text comparison on `@unique` case-sensitively, registering `User@Example.com` prevented logging in as `user@example.com`.

4. **`auth.ts`**:
   - Lines 10–13 and 29–42:
     ```typescript
     const credentialsSchema = z.object({
       email: z.string().email(),
       password: z.string().min(6),
     });
     ...
     const { email, password } = parsed.data;
     const user = await prisma.user.findUnique({ where: { email } });
     ```
   - Email was validated without trim or lowercase, and looked up in Prisma using raw casing, causing case-sensitivity lockouts.

---

## 2. Logic Chain

1. **R1 Middleware Fix**:
   - The public review funnel at `/r/[slug]` triggers client-side API calls to `/api/analytics` (for visit and interaction tracking) and `/api/generate` (for AI review generation).
   - Adding `"/api/generate"` and `"/api/analytics"` to `PUBLIC_PATHS` in `auth.config.ts` allows unauthenticated clients to access these endpoints without receiving a 307 redirect to `/login`.
   - Hardening the condition to:
     ```typescript
     const isPublic =
       pathname === "/" ||
       PUBLIC_PATHS.filter((p) => p !== "/").some(
         (p) => pathname === p || pathname.startsWith(p + "/")
       ) ||
       pathname.startsWith("/api/auth");
     ```
     ensures exact matching for `/` while preventing root-prefix traversal hazards (e.g. `//dashboard`).
   - Protected routes (`/dashboard`, `/dashboard/analytics`, `/api/business`) do not match `PUBLIC_PATHS` or `/api/auth` and therefore evaluate to `isPublic = false`, remaining strictly protected by NextAuth session checks.

2. **R1 Route Collision Fix**:
   - Deleting `app/(dashboard)/page.tsx` removes the conflicting page component under the `(dashboard)` route group that mapped to `/`.
   - `app/page.tsx` becomes the sole handler for `/`, allowing unauthenticated landing page visitors to view the marketing page without being intercepted by `DashboardLayout`'s session check.
   - The actual dashboard is already correctly hosted at `app/(dashboard)/dashboard/page.tsx` (`/dashboard`), which remains unaffected.

3. **R2 Registration Email Normalization**:
   - Updating `registerSchema` to `email: z.string().trim().toLowerCase().email()` normalizes whitespace and casing at the schema validation stage.
   - Normalizing `email = parsed.data.email.toLowerCase().trim()` explicitly before querying `prisma.user.findUnique` and `prisma.user.create` guarantees defense-in-depth and ensures all database records store normalized lowercase emails.

4. **R2 Credentials Login Email Normalization**:
   - Updating `credentialsSchema` to `email: z.string().trim().toLowerCase().email()` in `auth.ts` validates and normalizes credentials inputs.
   - Explicitly normalizing `const email = parsed.data.email.toLowerCase().trim()` before `prisma.user.findUnique({ where: { email } })` ensures case-insensitive matching against the database.

---

## 3. Code Modifications & Diffs

### 3.1 `auth.config.ts`
```diff
@@ -11,7 +11,14 @@
     authorized({ auth, request: { nextUrl } }) {
       const isLoggedIn = !!auth?.user;
       const pathname = nextUrl.pathname;
-      const PUBLIC_PATHS = ["/", "/login", "/signup", "/r"];
+      const PUBLIC_PATHS = [
+        "/",
+        "/login",
+        "/signup",
+        "/r",
+        "/api/generate",
+        "/api/analytics",
+      ];
       const DEV_BYPASS = "/dev-login";
 
       if (pathname === DEV_BYPASS && process.env.NODE_ENV !== "production") {
@@ -18,7 +18,10 @@
       }
 
       const isPublic =
-        PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
+        pathname === "/" ||
+        PUBLIC_PATHS.filter((p) => p !== "/").some(
+          (p) => pathname === p || pathname.startsWith(p + "/")
+        ) ||
         pathname.startsWith("/api/auth");
 
       if (isPublic) return true;
```

### 3.2 `app/(dashboard)/page.tsx`
- File deleted entirely.

### 3.3 `app/api/auth/register/route.ts`
```diff
@@ -5,7 +5,7 @@
 
 const registerSchema = z.object({
   name: z.string().min(1).max(100),
-  email: z.string().email(),
+  email: z.string().trim().toLowerCase().email(),
   password: z.string().min(6).max(100),
 });
 
@@ -20,7 +20,8 @@
       );
     }
 
-    const { name, email, password } = parsed.data;
+    const { name, password } = parsed.data;
+    const email = parsed.data.email.toLowerCase().trim();
 
     // Check if user already exists
     const existing = await prisma.user.findUnique({ where: { email } });
```

### 3.4 `auth.ts`
```diff
@@ -8,7 +8,7 @@
 import { authConfig } from "./auth.config";
 
 const credentialsSchema = z.object({
-  email: z.string().email(),
+  email: z.string().trim().toLowerCase().email(),
   password: z.string().min(6),
 });
 
@@ -29,7 +29,8 @@
         const parsed = credentialsSchema.safeParse(credentials);
         if (!parsed.success) return null;
 
-        const { email, password } = parsed.data;
+        const email = parsed.data.email.toLowerCase().trim();
+        const { password } = parsed.data;
 
         const user = await prisma.user.findUnique({ where: { email } });
         if (!user || !user.passwordHash) return null;
```

---

## 4. Verification Method & Results

### 4.1 Vitest Test Suite Execution
- **Command**: `npm test`
- **Result**: PASSED (12/12 test files, 63/63 tests)
```text
 RUN  v5.0.0 /Users/amandeepsingh/Desktop/TabandRate

 ✓ test/integration/api-auth-register.test.ts (4 tests) 848ms
 ✓ test/components/customer-funnel.test.tsx (5 tests) 718ms
 ✓ test/components/my-business-form.test.tsx (7 tests) 2160ms
 ✓ test/components/feedback-view.test.tsx (4 tests) 559ms
 ✓ test/components/sidebar.test.tsx (3 tests) 572ms
 ✓ test/integration/api-generate.test.ts (3 tests) 386ms
 ✓ test/integration/api-qr.test.ts (3 tests) 363ms
 ✓ test/integration/api-business.test.ts (10 tests) 72ms
 ✓ test/integration/api-analytics.test.ts (3 tests) 85ms
 ✓ test/unit/utils.test.ts (10 tests) 19ms
 ✓ test/unit/validation.test.ts (7 tests) 31ms
 ✓ test/unit/ai.test.ts (4 tests) 8ms

 Test Files  12 passed (12)
      Tests  63 passed (63)
   Duration  15.00s
```

### 4.2 Next.js Production Build Execution
- **Command**: `npm run build`
- **Result**: PASSED (Compiled in 22.6s, static pages generated 22/22, zero errors)
- **Manifest Check**: `.next/server/app-paths-manifest.json` confirms:
  - `"/page": "app/page.js"` is the sole root route.
  - `"/(dashboard)/page"` is eliminated.
  - Route compilation tree shows:
    ```text
    Route (app)
    ┌ ○ /
    ├ ○ /_not-found
    ├ ƒ /api/analytics
    ├ ƒ /api/auth/[...nextauth]
    ├ ƒ /api/auth/register
    ├ ƒ /api/business
    ├ ƒ /api/generate
    ├ ƒ /api/qr
    ├ ƒ /dashboard
    ...
    ```

---

## 5. Caveats & Edge Cases

1. **Rate Limiting on Public Endpoints**:
   - `/api/generate` and `/api/analytics` are now accessible to unauthenticated visitors as required by the review funnel. While inputs are validated via Zod schemas and checked against existing business slugs, rate limiting (e.g. per-IP or Redis-backed) should be considered for high-scale production to prevent API abuse.
2. **Pre-existing Uppercase Database Records**:
   - While all new registrations and logins are now normalized to lowercase, any existing database records created prior to this patch with uppercase letters would require a one-time data migration (`UPDATE "User" SET email = LOWER(TRIM(email))`).
3. **No Unintended Side Effects**:
   - No changes were made outside the authorized files (`auth.config.ts`, `app/(dashboard)/page.tsx`, `app/api/auth/register/route.ts`, `auth.ts`). Protected routes (`/dashboard`, `/api/business`) remain strictly guarded.

---

## 6. Conclusion

Milestone 1 (R1 & R2) requirements are completely and genuinely implemented:
- Unauthenticated review funnel requests to `/api/generate` and `/api/analytics` are permitted by middleware.
- The root route collision between `app/page.tsx` and `app/(dashboard)/page.tsx` is completely eliminated.
- User registration and credentials login normalize emails to lowercase and trimmed strings, preventing PostgreSQL case-sensitivity lockouts.
- All 63 existing tests pass cleanly, and the production build compiles with zero errors.
