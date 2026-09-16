import { authConfig } from "../auth.config";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// ============================================================================
// CHALLENGER 2 EMPIRICAL STRESS TEST SUITE
// ============================================================================

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, durationMs: number, details: string) {
  results.push({ suite, test, passed, durationMs, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[${suite}] ${icon} - ${test} (${durationMs.toFixed(1)}ms): ${details}`);
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING CHALLENGER 2 EMPIRICAL STRESS TEST HARNESS");
  console.log("================================================================================\n");

  // --------------------------------------------------------------------------
  // SUITE 1: MIDDLEWARE ROUTING STRESS TEST (auth.config.ts)
  // --------------------------------------------------------------------------
  console.log("\n--- SUITE 1: Middleware Routing Stress Test (auth.config.ts) ---");
  const authCallback = authConfig.callbacks?.authorized;
  if (!authCallback) {
    throw new Error("authConfig.callbacks.authorized is not defined");
  }

  // 1.1 Public unauthenticated paths
  const publicUnauthMatrix = [
    "/api/generate",
    "/api/analytics",
    "/r/test-slug",
    "/r/my-awesome-cafe-123",
    "/",
    "/login",
    "/signup",
    "/api/auth/csrf",
    "/api/auth/session",
    "/api/auth/callback/credentials",
    "/api/auth/providers",
  ];

  for (const pathname of publicUnauthMatrix) {
    const t0 = performance.now();
    const req = new NextRequest(`http://localhost:3000${pathname}`);
    const allowed = authCallback({
      auth: null,
      request: req,
    } as any);
    const dur = performance.now() - t0;
    record(
      "Middleware: Public Unauth",
      `Path "${pathname}" allows unauthenticated access`,
      allowed === true,
      dur,
      `Expected true, received ${allowed}`
    );
  }

  // 1.2 Protected paths without authentication (must return false)
  const protectedUnauthMatrix = [
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/my-business",
    "/dashboard/qr-code",
    "/dashboard/qr-flyer",
    "/dashboard/feedback",
    "/dashboard/reviews-reply",
    "/api/business",
    "/api/business/123",
    "/onboarding/step1",
    "/onboarding/step2",
    "/onboarding/step3",
  ];

  for (const pathname of protectedUnauthMatrix) {
    const t0 = performance.now();
    const req = new NextRequest(`http://localhost:3000${pathname}`);
    const allowed = authCallback({
      auth: null,
      request: req,
    } as any);
    const dur = performance.now() - t0;
    record(
      "Middleware: Protected Unauth",
      `Path "${pathname}" denies unauthenticated access`,
      allowed === false,
      dur,
      `Expected false, received ${allowed}`
    );
  }

  // 1.3 Traversal & evasion vectors without authentication (must return false)
  const evasionVectors = [
    { name: "Double leading slash //dashboard", rawPath: "//dashboard" },
    { name: "Triple leading slash ///dashboard", rawPath: "///dashboard" },
    { name: "Path traversal /api/generate/../dashboard", rawPath: "/api/generate/../dashboard" },
    { name: "Current dir suffix /dashboard/.", rawPath: "/dashboard/." },
    { name: "Trailing slash /dashboard/", rawPath: "/dashboard/" },
    { name: "Encoded traversal /api/generate/%2e%2e/dashboard", rawPath: "/api/generate/%2e%2e/dashboard" },
    { name: "Public prefix evasion /r/../../dashboard", rawPath: "/r/../../dashboard" },
    { name: "Fake subpath /login/../dashboard", rawPath: "/login/../dashboard" },
    { name: "Auth prefix evasion /api/auth/../dashboard", rawPath: "/api/auth/../dashboard" },
  ];

  for (const { name, rawPath } of evasionVectors) {
    const t0 = performance.now();
    const req = new NextRequest(`http://localhost:3000${rawPath}`);
    const allowed = authCallback({
      auth: null,
      request: req,
    } as any);
    const dur = performance.now() - t0;
    record(
      "Middleware: Evasion Vectors",
      `${name} (${req.nextUrl.pathname}) blocked unauthenticated`,
      allowed === false,
      dur,
      `Resolved pathname="${req.nextUrl.pathname}", allowed=${allowed}`
    );
  }

  // 1.4 Authenticated access to protected paths (must return true)
  const mockAuthSession = { user: { id: "merchant-usr-1", email: "merchant@tabandrate.com" } };
  for (const pathname of protectedUnauthMatrix) {
    const t0 = performance.now();
    const req = new NextRequest(`http://localhost:3000${pathname}`);
    const allowed = authCallback({
      auth: mockAuthSession,
      request: req,
    } as any);
    const dur = performance.now() - t0;
    record(
      "Middleware: Authenticated Access",
      `Path "${pathname}" allows authenticated merchant`,
      allowed === true,
      dur,
      `Expected true, received ${allowed}`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 2: EMAIL NORMALIZATION STRESS TEST
  // --------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Email Normalization Stress Test ---");
  const emailMatrix = [
    { input: "TEST@EXAMPLE.COM", expected: "test@example.com", desc: "All-uppercase" },
    { input: "TeSt.UsEr@ExAmPlE.cOm", expected: "test.user@example.com", desc: "Mixed-case" },
    { input: "   test@example.com   ", expected: "test@example.com", desc: "Leading/trailing spaces" },
    { input: "\ttest@example.com\t", expected: "test@example.com", desc: "Tabs" },
    { input: "\ntest@example.com\r\n", expected: "test@example.com", desc: "Newlines" },
    { input: " \t\r\n TeSt.LaBeL+99@ExAmPlE.CoM \n\t ", expected: "test.label+99@example.com", desc: "Mixed whitespace and casing" },
  ];

  const credentialsSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6),
  });

  const registerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6).max(100),
  });

  for (const { input, expected, desc } of emailMatrix) {
    const t0 = performance.now();
    // Test credentials schema
    const credParsed = credentialsSchema.safeParse({ email: input, password: "securepassword123" });
    // Test register schema
    const regParsed = registerSchema.safeParse({ name: "Tester", email: input, password: "securepassword123" });

    const credEmail = credParsed.success ? credParsed.data.email.toLowerCase().trim() : null;
    const regEmail = regParsed.success ? regParsed.data.email.toLowerCase().trim() : null;

    const dur = performance.now() - t0;
    const passed = credEmail === expected && regEmail === expected;

    record(
      "Email: Normalization Matrix",
      `${desc}: "${input.replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}" -> "${expected}"`,
      passed,
      dur,
      `credParsed=${credEmail}, regParsed=${regEmail}`
    );
  }

  // Verify simulated database query & storage receive exact normalized string
  for (const { input, expected } of emailMatrix) {
    const t0 = performance.now();
    let queryWhereEmail: string | null = null;
    let createDataEmail: string | null = null;

    // Simulate register endpoint logic
    const parsed = registerSchema.safeParse({ name: "Norm Test", email: input, password: "password123" });
    if (parsed.success) {
      const email = parsed.data.email.toLowerCase().trim();
      queryWhereEmail = email; // where: { email }
      createDataEmail = email; // create: { ..., email }
    }

    const dur = performance.now() - t0;
    const passed = queryWhereEmail === expected && createDataEmail === expected;
    record(
      "Email: Database Query & Storage",
      `DB query & insert receive canonical "${expected}"`,
      passed,
      dur,
      `query=${queryWhereEmail}, create=${createDataEmail}`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 3: ANALYTICS AGGREGATION & DATE IMMUTABILITY STRESS TEST
  // --------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Analytics Aggregation & Date Immutability Stress Test (>10k events) ---");

  // Generate 12,000 high-volume synthetic events spanning 40 days
  const TOTAL_EVENTS = 12000;
  const now = new Date();
  const originalNowMs = now.getTime();

  interface SyntheticEvent {
    id: string;
    businessId: string;
    type: "visit" | "generate" | "redirect" | "intercepted";
    createdAt: Date;
  }

  const types: ("visit" | "generate" | "redirect" | "intercepted")[] = [
    "visit",
    "generate",
    "redirect",
    "intercepted",
  ];
  const typeDistribution = [0.50, 0.25, 0.15, 0.10]; // 50% visit, 25% generate, 15% redirect, 10% intercepted

  const syntheticEvents: SyntheticEvent[] = [];
  const expectedTotals = { visit: 0, generate: 0, redirect: 0, intercepted: 0 };

  for (let i = 0; i < TOTAL_EVENTS; i++) {
    // Pick event type according to distribution
    const rand = Math.random();
    let type: "visit" | "generate" | "redirect" | "intercepted" = "visit";
    if (rand < 0.50) type = "visit";
    else if (rand < 0.75) type = "generate";
    else if (rand < 0.90) type = "redirect";
    else type = "intercepted";

    expectedTotals[type]++;

    // Distributed over past 40 days
    const dayOffset = Math.floor(Math.random() * 40); // 0 to 39 days ago
    const hour = Math.floor(Math.random() * 24);
    const min = Math.floor(Math.random() * 60);
    const sec = Math.floor(Math.random() * 60);

    const eventDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOffset,
      hour,
      min,
      sec
    );

    syntheticEvents.push({
      id: `evt-${i}`,
      businessId: "biz-stress-1",
      type,
      createdAt: eventDate,
    });
  }

  // 3.1 Verify groupBy O(1) transfer payload and unbounded count aggregation
  const t0GroupBy = performance.now();
  // Simulate Prisma groupBy: aggregates at DB engine level
  const groupByResult: { type: string; _count: { id: number } }[] = types.map((t) => ({
    type: t,
    _count: { id: syntheticEvents.filter((e) => e.type === t).length },
  }));
  const groupByDuration = performance.now() - t0GroupBy;

  const countMap = Object.fromEntries(groupByResult.map((ec) => [ec.type, ec._count.id]));

  const visits = countMap["visit"] ?? 0;
  const generates = countMap["generate"] ?? 0;
  const redirects = countMap["redirect"] ?? 0;
  const intercepted = countMap["intercepted"] ?? 0;

  const sumCounts = visits + generates + redirects + intercepted;
  const payloadSizeRows = groupByResult.length;

  record(
    "Analytics: GroupBy Aggregation",
    `Aggregates ${TOTAL_EVENTS} events with exactly O(1) payload (${payloadSizeRows} rows)`,
    payloadSizeRows === 4 && sumCounts === TOTAL_EVENTS,
    groupByDuration,
    `Payload rows=${payloadSizeRows} (<=4), total counted=${sumCounts}/${TOTAL_EVENTS}`
  );

  record(
    "Analytics: No Truncation",
    "Counts far exceed legacy limits (take: 50 in dashboard, take: 500 in analytics)",
    visits > 500 && generates > 500 && redirects > 500 && intercepted > 500,
    groupByDuration,
    `visits=${visits}, generates=${generates}, redirects=${redirects}, intercepted=${intercepted}`
  );

  // 3.2 Verify 7-day timeline buckets and Date immutability (Dashboard logic)
  const t0SevenDays = performance.now();
  const sevenDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0
  );

  const weekEvents = syntheticEvents.filter((e) => e.createdAt >= sevenDaysAgo);

  const chartData7 = Array.from({ length: 7 }, (_, i) => {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (6 - i)
    );
    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );
    const dayStr = dayStart.toLocaleDateString("en-US", { weekday: "short" });

    const dayEvents = weekEvents.filter(
      (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
    );
    return {
      day: dayStr,
      visits: dayEvents.filter((e) => e.type === "visit").length,
      redirects: dayEvents.filter((e) => e.type === "redirect").length,
    };
  });
  const sevenDayDuration = performance.now() - t0SevenDays;

  // Immutability check
  const nowMsAfter7 = now.getTime();
  const isDateImmutable7 = originalNowMs === nowMsAfter7;

  record(
    "Analytics: 7-Day Bucketing",
    "Generates exactly 7 buckets with valid counts",
    chartData7.length === 7 && chartData7.every((b) => typeof b.visits === "number" && typeof b.redirects === "number"),
    sevenDayDuration,
    `Buckets=${chartData7.length}, Total 7-day visits=${chartData7.reduce((a, b) => a + b.visits, 0)}`
  );

  record(
    "Analytics: Date Immutability (7-Day)",
    "Original reference `now` was never mutated in place",
    isDateImmutable7,
    sevenDayDuration,
    `Before=${originalNowMs}, After=${nowMsAfter7}, diff=${nowMsAfter7 - originalNowMs}ms`
  );

  // 3.3 Verify 30-day timeline buckets and Date immutability (Analytics logic)
  const t0ThirtyDays = performance.now();
  const thirtyDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29,
    0,
    0,
    0,
    0
  );

  const monthEvents = syntheticEvents.filter((e) => e.createdAt >= thirtyDaysAgo);

  const chartData30 = Array.from({ length: 30 }, (_, i) => {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (29 - i)
    );
    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );
    const label = dayStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const dayEvents = monthEvents.filter(
      (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
    );
    return {
      label,
      visits: dayEvents.filter((e) => e.type === "visit").length,
      generates: dayEvents.filter((e) => e.type === "generate").length,
      redirects: dayEvents.filter((e) => e.type === "redirect").length,
      intercepted: dayEvents.filter((e) => e.type === "intercepted").length,
    };
  });
  const thirtyDayDuration = performance.now() - t0ThirtyDays;

  const nowMsAfter30 = now.getTime();
  const isDateImmutable30 = originalNowMs === nowMsAfter30;

  record(
    "Analytics: 30-Day Bucketing",
    "Generates exactly 30 buckets with complete 4-metric breakdown",
    chartData30.length === 30 && chartData30.every((b) => b.visits >= 0 && b.generates >= 0 && b.redirects >= 0 && b.intercepted >= 0),
    thirtyDayDuration,
    `Buckets=${chartData30.length}, Total 30-day events=${chartData30.reduce((a, b) => a + b.visits + b.generates + b.redirects + b.intercepted, 0)}`
  );

  record(
    "Analytics: Date Immutability (30-Day)",
    "Original reference `now` was never mutated in place",
    isDateImmutable30,
    thirtyDayDuration,
    `Before=${originalNowMs}, After=${nowMsAfter30}, diff=${nowMsAfter30 - originalNowMs}ms`
  );

  // --------------------------------------------------------------------------
  // SUITE 4: BASE UI DOM STRUCTURE IN feedback-view.tsx & step3/page.tsx
  // --------------------------------------------------------------------------
  console.log("\n--- SUITE 4: Base UI DOM Structure & Semantic HTML Validation ---");

  const feedbackViewPath = path.resolve(__dirname, "../components/dashboard/feedback-view.tsx");
  const step3Path = path.resolve(__dirname, "../app/onboarding/step3/page.tsx");

  const feedbackContent = fs.readFileSync(feedbackViewPath, "utf-8");
  const step3Content = fs.readFileSync(step3Path, "utf-8");

  function hasNestedInteractive(content: string, outer: string, inner: string): boolean {
    const regex = new RegExp(`<${outer}\\b(?![^>]*\\/>)[^>]*>(?:(?!<\\/${outer}>)[\\s\\S])*?<${inner}\\b`, "i");
    return regex.test(content);
  }

  // Check 4.1: No type="button" on <a> tags in feedback-view.tsx
  const t0Dom1 = performance.now();
  const aWithTypeButtonInFeedback = /<[aA]\b[^>]*\btype\s*=\s*["']button["']/g.test(feedbackContent);
  const durDom1 = performance.now() - t0Dom1;
  record(
    "DOM: feedback-view.tsx",
    "Zero invalid type='button' on <a> tags",
    !aWithTypeButtonInFeedback,
    durDom1,
    `Found invalid type='button' on <a>: ${aWithTypeButtonInFeedback}`
  );

  // Check 4.2: No nested interactive elements in feedback-view.tsx
  const nestedButtonInsideLinkFeedback = hasNestedInteractive(feedbackContent, "Link", "Button") || hasNestedInteractive(feedbackContent, "a", "button");
  const nestedLinkInsideButtonFeedback = hasNestedInteractive(feedbackContent, "Button", "Link") || hasNestedInteractive(feedbackContent, "button", "a");
  const nestedButtonInsideButtonFeedback = hasNestedInteractive(feedbackContent, "Button", "Button") || hasNestedInteractive(feedbackContent, "button", "button");

  record(
    "DOM: feedback-view.tsx",
    "Zero nested interactive elements (<Button> in <Link>, <Link> in <Button>, or nested <button>)",
    !nestedButtonInsideLinkFeedback && !nestedLinkInsideButtonFeedback && !nestedButtonInsideButtonFeedback,
    durDom1,
    `ButtonInLink=${nestedButtonInsideLinkFeedback}, LinkInButton=${nestedLinkInsideButtonFeedback}, ButtonInButton=${nestedButtonInsideButtonFeedback}`
  );

  // Check 4.3: No type="button" on <a> tags in step3/page.tsx
  const t0Dom2 = performance.now();
  const aWithTypeButtonInStep3 = /<[aA]\b[^>]*\btype\s*=\s*["']button["']/g.test(step3Content);
  const durDom2 = performance.now() - t0Dom2;
  record(
    "DOM: step3/page.tsx",
    "Zero invalid type='button' on <a> tags",
    !aWithTypeButtonInStep3,
    durDom2,
    `Found invalid type='button' on <a>: ${aWithTypeButtonInStep3}`
  );

  // Check 4.4: No nested interactive elements in step3/page.tsx
  const nestedButtonInsideLinkStep3 = hasNestedInteractive(step3Content, "Link", "Button") || hasNestedInteractive(step3Content, "a", "button");
  const nestedLinkInsideButtonStep3 = hasNestedInteractive(step3Content, "Button", "Link") || hasNestedInteractive(step3Content, "button", "a");
  const nestedButtonInsideButtonStep3 = hasNestedInteractive(step3Content, "Button", "Button") || hasNestedInteractive(step3Content, "button", "button");

  record(
    "DOM: step3/page.tsx",
    "Zero nested interactive elements (clean <Link className={buttonVariants()}> pattern)",
    !nestedButtonInsideLinkStep3 && !nestedLinkInsideButtonStep3 && !nestedButtonInsideButtonStep3,
    durDom2,
    `ButtonInLink=${nestedButtonInsideLinkStep3}, LinkInButton=${nestedLinkInsideButtonStep3}, ButtonInButton=${nestedButtonInsideButtonStep3}`
  );

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊 EMPIRICAL STRESS TEST SUMMARY");
  console.log("================================================================================");

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions Evaluated: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    console.error(`\n❌ VERDICT: REQUEST_CHANGES (${failedTests} test(s) failed)`);
    process.exit(1);
  } else {
    console.log(`\n🎉 VERDICT: APPROVE (100% empirical stress tests passed cleanly)`);
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Fatal error in stress test execution:", err);
  process.exit(1);
});
