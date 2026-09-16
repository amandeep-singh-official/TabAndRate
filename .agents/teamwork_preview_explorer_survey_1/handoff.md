# Investigation & Survey Handoff Report: R1 & R2

**Agent**: teamwork_preview_explorer (Survey & Investigation)  
**Date**: 2026-09-13  
**Target Requirements**: R1 (Public Review Funnel & Middleware Access) and R2 (Authentication Hardening & Case Normalization)

---

## 1. Observation

### R1. Public Review Funnel & Middleware Access

#### 1.1 Middleware Configuration (`auth.config.ts` and `middleware.ts`)
- **`middleware.ts`** (lines 1–11):
  ```typescript
  import NextAuth from "next-auth";
  import { authConfig } from "./auth.config";

  export default NextAuth(authConfig).auth;

  export const config = {
    matcher: [
      "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
    ],
  };
  ```
  `middleware.ts` delegates route authorization entirely to `NextAuth(authConfig).auth`. The matcher intercepts all routes except static assets and images.

- **`auth.config.ts`** (lines 11–28):
  ```typescript
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const PUBLIC_PATHS = ["/", "/login", "/signup", "/r"];
      const DEV_BYPASS = "/dev-login";

      if (pathname === DEV_BYPASS && process.env.NODE_ENV !== "production") {
        return true;
      }

      const isPublic =
        PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
  ```
  `PUBLIC_PATHS` only includes `["/", "/login", "/signup", "/r"]`.
  Any request to `/api/generate` or `/api/analytics` yields `isPublic === false`. If the visitor is unauthenticated (`!isLoggedIn`), `authorized` returns `false`. In NextAuth v5, returning `false` causes the middleware to issue a 307 redirect to `/login`.

#### 1.2 Review Funnel Client Execution (`components/funnel/customer-funnel.tsx`)
- Rendered by `app/r/[slug]/page.tsx` for visitors scanning QR codes.
- **Lines 36–42 & 57–59**: On component mount, the client triggers:
  ```typescript
  function track(slug: string, type: string, metadata?: Record<string, unknown>) {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, type, metadata }),
    }).catch(() => {});
  }

  useEffect(() => {
    track(business.slug, "visit");
  }, [business.slug]);
  ```
- **Lines 78–108**: When customer submits tags to generate reviews:
  ```typescript
  track(business.slug, "generate", { tags: selectedTags, language });
  ...
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: business.slug,
      tags: selectedTags,
      extraNotes,
      language,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  ```
- **Lines 115 & 131–134**: Also triggers `fetch("/api/analytics")` on `"redirect"` and `"intercepted"` events.
- Because `/api/analytics` and `/api/generate` are rejected with redirects to `/login` by NextAuth middleware, unauthenticated visitors experience:
  1. Failed analytics tracking (silently caught in `.catch(() => {})`).
  2. Failed AI review generation: `res.json()` fails or receives the HTML redirect response, throwing an error and displaying `Failed to generate reviews.`

#### 1.3 App Router Route Collision (`app/page.tsx` vs `app/(dashboard)/page.tsx`)
- **`app/page.tsx`** (lines 3–28):
  Contains the public marketing landing page:
  ```tsx
  export default function Home() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">TabAndRate</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered Google review funnel for local businesses.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/signup">Get Started</Link>
          <Link href="/login">Sign In</Link>
        </div>
      </main>
    );
  }
  ```
- **`app/(dashboard)/page.tsx`** (lines 1–5):
  ```tsx
  import { redirect } from "next/navigation";

  export default function RootDashboard() {
    redirect("/dashboard");
  }
  ```
- **Route Manifest** (`.next/server/app-paths-manifest.json`):
  ```json
  "/page": "app/page.js",
  "/(dashboard)/page": "app/(dashboard)/page.js",
  ```
- In Next.js App Router, route groups `(dashboard)` do NOT add a path segment to the URL. Therefore, both `app/page.tsx` and `app/(dashboard)/page.tsx` resolve to the exact same URL path `/`.
- In addition, `app/(dashboard)/layout.tsx` encloses all routes inside `(dashboard)` and checks:
  ```typescript
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  ```
  If `app/(dashboard)/page.tsx` handles `/`, unauthenticated users visiting the root domain `/` are forcibly redirected to `/login`, completely shadowing and blocking access to the landing page `app/page.tsx`.
- The actual dashboard is already implemented at `app/(dashboard)/dashboard/page.tsx` (URL: `/dashboard`), and all application navigation links (in `LoginPage`, `SignUpPage`, `Sidebar`) navigate directly to `/dashboard`.

---

### R2. Authentication Hardening & Case Normalization

#### 2.1 Registration Handler (`app/api/auth/register/route.ts`)
- **Lines 6–10**:
  ```typescript
  const registerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  });
  ```
- **Lines 24–41**:
  ```typescript
  const { name, email, password } = parsed.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  await prisma.user.create({
    data: { name, email, passwordHash },
  });
  ```
  The incoming email is passed directly to `prisma.user.findUnique` and `prisma.user.create` without calling `.trim()` or `.toLowerCase()`.

#### 2.2 Credentials Sign-in Provider (`auth.ts`)
- **Lines 10–13**:
  ```typescript
  const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  ```
- **Lines 29–42**:
  ```typescript
  async authorize(credentials) {
    const parsed = credentialsSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return { id: user.id, email: user.email, name: user.name, image: user.image };
  },
  ```
  `parsed.data.email` is queried directly with `prisma.user.findUnique({ where: { email } })` without `.trim()` or `.toLowerCase()`.

#### 2.3 Database Schema (`prisma/schema.prisma`)
- **Lines 11–17**:
  ```prisma
  datasource db {
    provider = "postgresql"
  }

  model User {
    id            String    @id @default(cuid())
    name          String?
    email         String    @unique
    emailVerified DateTime?
    image         String?
    passwordHash  String?   // null for OAuth users
  ```
  In PostgreSQL, string comparison on a `@unique` text column is case-sensitive by default. A query for `user@example.com` will NOT match `User@Example.com` or `USER@EXAMPLE.COM`.

---

## 2. Logic Chain

### R1. Public Review Funnel & Middleware Access

1. **Premise**: Customers access `/r/[slug]` by scanning physical QR codes at business locations without having a merchant user account.
2. **Current Execution**:
   - Customer opens `/r/[slug]`. Middleware allows this because `pathname.startsWith("/r/")` matches `PUBLIC_PATHS`.
   - The browser mounts `CustomerFunnel` and issues `fetch("/api/analytics")` for page visits, then `fetch("/api/generate")` when clicking "Generate My Review", and `fetch("/api/analytics")` on redirects or private feedback interception.
3. **Failure Point**:
   - `auth.config.ts` defines `PUBLIC_PATHS = ["/", "/login", "/signup", "/r"]`.
   - Because neither `/api/generate` nor `/api/analytics` are in `PUBLIC_PATHS`, nor do they begin with `/api/auth`, `isPublic` evaluates to `false`.
   - `isLoggedIn` is `false` because visitors do not have session cookies.
   - NextAuth middleware rejects both endpoints with a redirect (307) to `/login`.
   - In `CustomerFunnel`, the fetch response is an HTML login redirect instead of the expected JSON payload (`{ reviews: [...] }` or `{ ok: true }`).
   - As a result, the entire public funnel is non-functional: review generation fails with `Failed to generate reviews.`, and analytics tracking events are lost.
4. **Root Route Collision**:
   - Next.js route groups `(folderName)` do not participate in the URL path.
   - `app/page.tsx` defines the root route `/` as a static public marketing landing page.
   - `app/(dashboard)/page.tsx` defines a page at the same route `/` containing only `redirect("/dashboard")`.
   - Furthermore, `app/(dashboard)/layout.tsx` wraps `app/(dashboard)/page.tsx` and redirects unauthenticated users to `/login`.
   - When both files exist, route resolution causes collisions in Next.js App Router. If the route group's page is served, unauthenticated visitors to `/` are kicked to `/login` without ever seeing the landing page.
   - Since the actual dashboard is located at `app/(dashboard)/dashboard/page.tsx` (`/dashboard`), `app/(dashboard)/page.tsx` is completely redundant and causes collisions.

### R2. Authentication Hardening & Case Normalization

1. **Premise**: Email addresses are case-insensitive by Internet standard (RFC 5321) and human convention. Users frequently type mixed-case characters (or mobile virtual keyboards capitalize the first letter). Users also frequently introduce whitespace when copying/pasting.
2. **Current Execution**:
   - `registerSchema` and `credentialsSchema` validate `email: z.string().email()`.
   - `prisma.user.findUnique({ where: { email } })` and `prisma.user.create({ data: { email, ... } })` use the raw string.
3. **Failure Point**:
   - PostgreSQL `@unique` index compares exact character codes (`"User@example.com"` != `"user@example.com"`).
   - If a user registers with `"Jane.Doe@example.com"`, PostgreSQL stores `"Jane.Doe@example.com"`.
   - If the user later attempts login with `"jane.doe@example.com"`, `prisma.user.findUnique` returns `null`. The user is locked out.
   - Conversely, an attacker or duplicate registration could register `"JANE.DOE@example.com"`, creating multiple accounts for the same email address.
   - Additionally, if an email has surrounding whitespace (e.g. `" jane.doe@example.com "`), `z.string().email()` rejects it as invalid input (status 400).
4. **Remediation**:
   - Normalizing with `.trim().toLowerCase()` in both Zod schemas (`z.string().trim().toLowerCase().email()`) and explicitly in route/provider handlers ensures that all lookups and writes are consistent across registration and credentials authentication.

---

## 3. Proposed Solution / Fix Strategy

### Recommendation 1: Fix `auth.config.ts` (R1)

Update `auth.config.ts` to explicitly include `/api/generate` and `/api/analytics` in the permitted public paths, and harden the public path matching logic against slash-normalization edge cases.

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/auth.config.ts`  
**Proposed Code Change**:
```typescript
<<<<
      const PUBLIC_PATHS = ["/", "/login", "/signup", "/r"];
      const DEV_BYPASS = "/dev-login";

      if (pathname === DEV_BYPASS && process.env.NODE_ENV !== "production") {
        return true;
      }

      const isPublic =
        PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
====
      const PUBLIC_PATHS = [
        "/",
        "/login",
        "/signup",
        "/r",
        "/api/generate",
        "/api/analytics",
      ];
      const DEV_BYPASS = "/dev-login";

      if (pathname === DEV_BYPASS && process.env.NODE_ENV !== "production") {
        return true;
      }

      const isPublic =
        pathname === "/" ||
        PUBLIC_PATHS.filter((p) => p !== "/").some(
          (p) => pathname === p || pathname.startsWith(p + "/")
        ) ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
>>>>
```

*Note on protected routes*:
- `/api/business` is NOT in `PUBLIC_PATHS` and will remain strictly protected by NextAuth middleware (and route-level `await auth()`).
- `/dashboard` and `/onboarding` are NOT in `PUBLIC_PATHS` and will remain strictly protected.

---

### Recommendation 2: Eliminate Route Collision (R1)

Remove the conflicting file `app/(dashboard)/page.tsx`.

**Action**: Delete `/Users/amandeepsingh/Desktop/TabandRate/app/(dashboard)/page.tsx`

**Rationale**:
- `app/page.tsx` is the intended marketing landing page at `/`.
- `app/(dashboard)/dashboard/page.tsx` is the actual merchant dashboard at `/dashboard`.
- `app/(dashboard)/page.tsx` is 5 lines of dead code (`redirect("/dashboard")`) that causes an App Router collision at `/` and causes `DashboardLayout` to intercept visitors to `/`.
- Deleting it cleanly resolves the route collision and lets `app/page.tsx` serve `/` without interference.

---

### Recommendation 3: Normalize Email in Registration Handler (R2)

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/app/api/auth/register/route.ts`  
**Proposed Code Change**:
```typescript
<<<<
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input." },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
====
const registerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input." },
        { status: 400 }
      );
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
>>>>
```

---

### Recommendation 4: Normalize Email in Credentials Sign-in Provider (R2)

**Target File**: `/Users/amandeepsingh/Desktop/TabandRate/auth.ts`  
**Proposed Code Change**:
```typescript
<<<<
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
...
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
====
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});
...
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const { password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
>>>>
```

---

### Recommendation 5: Add Automated Test Coverage (R1 & R2)

1. **Middleware / Auth Config Unit Test** (`test/unit/auth-config.test.ts`):
   Test `authConfig.callbacks.authorized`:
   - `authorized({ auth: null, request: { nextUrl: { pathname: "/api/generate" } } })` -> `true`
   - `authorized({ auth: null, request: { nextUrl: { pathname: "/api/analytics" } } })` -> `true`
   - `authorized({ auth: null, request: { nextUrl: { pathname: "/r/my-shop" } } })` -> `true`
   - `authorized({ auth: null, request: { nextUrl: { pathname: "/dashboard" } } })` -> `false`
   - `authorized({ auth: null, request: { nextUrl: { pathname: "/api/business" } } })` -> `false`
   - `authorized({ auth: { user: { id: "123" } }, request: { nextUrl: { pathname: "/dashboard" } } })` -> `true`

2. **Email Normalization Test** in `test/integration/api-auth-register.test.ts`:
   Add a test verifying:
   - Submitting `{ name: "Bob", email: "  Bob.Smith@EXAMPLE.Com  ", password: "password123" }` calls `prisma.user.findUnique` with `{ where: { email: "bob.smith@example.com" } }` and creates the user with normalized email.

---

## 4. Caveats & Edge Cases

1. **Public API Abuse**:
   - `/api/generate` calls Groq/Gemini AI APIs. Opening `/api/generate` to unauthenticated visitors means anyone who knows or discovers business slugs can invoke the endpoint. The schema validates `slug`, `tags` (1–8 strings), and `extraNotes` (max 500 chars), and verifies business existence before invoking AI. In production, rate-limiting (e.g. via IP or Redis/Upstash) should be added.
   - `/api/analytics` writes to `AnalyticsEvent`. The schema validates `slug` and `type` (strict enum: `["visit", "generate", "redirect", "intercepted"]`) and confirms business existence before saving.
2. **Double Slash Traversal Edge Case**:
   - If `PUBLIC_PATHS` contains `"/"`, evaluating `pathname.startsWith(p + "/")` results in `pathname.startsWith("//")`. A request like `//dashboard` could match if URLs are not normalized. Filtering `p !== "/"` when performing prefix checks prevents this risk.
3. **QR Generation Endpoint (`/api/qr`)**:
   - `/api/qr` is currently used inside dashboard components (`qr-code-page.tsx`, `flyer-design-canvas.tsx`). It does not strictly need to be in `PUBLIC_PATHS` unless flyers are rendered by unauthenticated visitors in the future.
4. **Existing Database Data**:
   - If an existing database has accounts registered with uppercase characters before this patch, their emails will remain uppercase until migrated or updated. A one-time SQL migration `UPDATE "User" SET email = LOWER(TRIM(email))` should be noted if running against an existing staging/production database.

---

## 5. Verification Method

Workers implementing these fixes can independently verify with:

1. **Vitest Test Suite**:
   ```bash
   npm run test
   ```
   Ensures all existing 63 tests and newly added tests pass cleanly.

2. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   - Confirms zero route collision errors during page data collection.
   - Inspect `.next/server/app-paths-manifest.json` to verify `"/page"` exists as the sole root page, and `"/(dashboard)/page"` is eliminated.

3. **Invalidation Conditions**:
   - If unauthenticated requests to `/api/generate` or `/api/analytics` return a 307 redirect to `/login`, the middleware patch failed.
   - If user registration with uppercase letters (`User@Example.Com`) allows logging in ONLY with exact uppercase letters and fails with lowercase (`user@example.com`), email normalization failed.
   - If navigating to `/` redirects unauthenticated users to `/login`, the route collision was not eliminated.
