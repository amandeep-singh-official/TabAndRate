# Challenger 1 Empirical Verification Report: Edge Cases & Reliability

**Agent**: teamwork_preview_challenger (Challenger 1)  
**Roles**: critic, specialist  
**Parent Conversation ID**: `5536c17a-07b2-41f2-9978-372723801393`  
**Working Directory**: `/Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_challenger_1`  
**Date**: 2026-09-13T12:00:00Z  
**Verdict**: **APPROVE**

---

## Challenge Summary

- **Overall risk assessment**: **LOW**
- **Subsystems Evaluated**:
  1. `lib/utils.ts` — `generateSlug` edge case handling (non-Latin scripts, emojis, punctuation, whitespace, empty strings, accented text, length boundaries, and fuzzing).
  2. `app/api/qr/route.ts` — QR code generation endpoint (percent-encoding malformation immunity, `URIError` crash vectors, parameter clamping, and PNG buffer validation).
  3. `app/api/business/route.ts` — Business profile slug collision retry loop (bounded iterations, infinite loop prevention, random suffix fallback).

---

## 1. Observation

### 1.1 Inspected Code Implementation

#### `lib/utils.ts` (lines 10–33)
```typescript
export function generateSlug(name: string): string {
  // Normalize accents (e.g., "Café" -> "Cafe")
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const cleaned = normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");

  if (!cleaned) {
    // Guaranteed non-empty URL-safe fallback for non-Latin or emoji-only names
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `business-${randomSuffix}`;
  }

  return cleaned;
}
```

#### `app/api/qr/route.ts` (lines 4–39)
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const sizeParam = searchParams.get("size") ?? "300";
  const parsedSize = parseInt(sizeParam, 10);
  const size = Math.min(Math.max(isNaN(parsedSize) ? 300 : parsedSize, 100), 600);

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    // searchParams.get("url") already percent-decodes once per WHATWG standard.
    // Pass url directly without redundant decodeURIComponent to prevent URIError crashes.
    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[QR_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate QR code." }, { status: 500 });
  }
}
```

#### `app/api/business/route.ts` (lines 48–61)
```typescript
    // Generate unique slug with bounded collision retry
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.business.findUnique({ where: { slug } })) {
      attempt++;
      if (attempt > 10) {
        // Prevent infinite loops under high collision frequency
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
        break;
      }
      slug = `${baseSlug}-${attempt}`;
    }
```

---

### 1.2 Verbatim Empirical Stress Test Results

Executed custom empirical adversarial stress harness (`scripts/challenger-stress-suite.ts`):
```text
================================================================================
CHALLENGER EMPIRICAL STRESS TEST SUITE — TABANDRATE
================================================================================

>>> [1/3] EXECUTING `generateSlug` EMPIRICAL STRESS TESTS...
  ✓ Non-Latin: Hindi (Devanagari)                     : 20/20 passed
  ✓ Non-Latin: Arabic                                 : 20/20 passed
  ✓ Non-Latin: Chinese (Simplified & Traditional)     : 20/20 passed
  ✓ Non-Latin: Japanese (Hiragana, Katakana, Kanji)   : 20/20 passed
  ✓ Non-Latin: Korean (Hangul)                        : 20/20 passed
  ✓ Non-Latin: Russian (Cyrillic)                     : 20/20 passed
  ✓ Non-Latin: Greek                                  : 15/15 passed
  ✓ Non-Latin: Hebrew                                 : 15/15 passed
  ✓ Non-Latin: Thai                                   : 15/15 passed
  ✓ Emojis: Single Emojis                             : 30/30 passed
  ✓ Emojis: Compound Emojis (Skin tones & ZWJ)        : 20/20 passed
  ✓ Emojis: Emoji Strings & Combinations              : 15/15 passed
  ✓ Mixed Text & Emojis                               : 12/12 passed
  ✓ Punctuation-Only Strings                          : 30/30 passed
  ✓ Whitespace-Only Strings                           : 17/17 passed
  ✓ Empty String                                      : 1/1 passed
  ✓ Accented Strings (Latin Diacritics)               : 25/25 passed
  ✓ Ultra-Long Names (>1000 chars)                    : 11/11 passed
  ✓ Boundary Length & Hyphen Placement Edge Cases     : 23/23 passed
  ✓ Randomized Unicode Fuzzing (500 cases)            : 500/500 passed

Slug Summary: 849/849 passed (100.0%). Failures: 0

>>> [2/3] EXECUTING `app/api/qr/route.ts` EMPIRICAL STRESS TESTS...
>>> [3/3] EXECUTING BOUNDED COLLISION RETRY EMPIRICAL STRESS TEST...
  ✓ Infinite collision scenario: Bounded at attempt 11, produced random suffix: cafe-mocha-fxgzkb
  ✓ 10-collision boundary scenario: Bounded at attempt 10, produced cafe-mocha-10
  ✓ 11-collision boundary scenario: Bounded at attempt 11, broke loop with fallback: cafe-mocha-xdzcfc
  ✓ 1,000 randomized collision runs: 1000/1000 strictly bounded (attempts <= 11)

Collision Summary: 4/4 passed (100.0%)

  ✓ Literal percent in promo code (50%off)                           : PASS (200)
  ✓ Multiple percent signs (100%real and save%25)                    : PASS (200)
  ✓ Standard %20 percent encoding for spaces                         : PASS (200)
  ✓ Standard %26 for encoded ampersand                               : PASS (200)
  ✓ Standard %3D for encoded equal sign                              : PASS (200)
  ✓ Unencoded literal percent at end of URL                          : PASS (200)
  ✓ Multiple consecutive literal percents (%%%)                      : PASS (200)
  ✓ Invalid hex sequence %ZZ in query                                : PASS (200)
  ✓ Invalid hex sequence %G1 in query                                : PASS (200)
  ✓ Incomplete percent sequence %2 at end                            : PASS (200)
  ✓ High-byte hex sequence %99                                       : PASS (200)
  ✓ Broken multibyte UTF-8 lead byte %E0%A4 without continuation     : PASS (200)
  ✓ Complex URL with multiple mixed query parameters                 : PASS (200)
  ✓ Unicode characters directly in URL query                         : PASS (200)
  ✓ Accented characters in URL                                       : PASS (200)
  ✓ Invalid non-numeric size (size=abc) -> clamps to default 300     : PASS (200)
  ✓ Negative size (size=-100) -> clamps to min 100                   : PASS (200)
  ✓ Massive size (size=999999) -> clamps to max 600                  : PASS (200)
  ✓ NaN string size (size=NaN) -> clamps to default 300              : PASS (200)
  ✓ Zero size (size=0) -> clamps to min 100                          : PASS (200)
  ✓ Sub-minimum size (size=50) -> clamps to min 100                  : PASS (200)
  ✓ Exact boundary min size (size=100)                               : PASS (200)
  ✓ Default size (size=300)                                          : PASS (200)
  ✓ Exact boundary max size (size=600)                               : PASS (200)
  ✓ Super-maximum size (size=601) -> clamps to max 600               : PASS (200)
  ✓ Floating point size (size=250.75) -> parses to 250               : PASS (200)
  ✓ Padded whitespace size (size=  400  )                            : PASS (200)
  ✓ Missing size param -> defaults to 300                            : PASS (200)
  ✓ Missing url parameter -> returns 400 Bad Request                 : PASS (400)
  ✓ Empty url parameter -> returns 400 Bad Request                   : PASS (400)

QR Summary: 30/30 passed (100.0%). Failures: 0

================================================================================
CHALLENGER EMPIRICAL VERIFICATION COMPLETE — ALL STRESS TESTS PASSED 100%
================================================================================
```

---

### 1.3 Full Project Regression Test Run (`npm test`)

Command: `npm test`  
Result: 15 test files passed, 101 tests passed, 0 failures.
```text
Test Files  15 passed (15)
     Tests  101 passed (101)
```

---

## 2. Logic Chain

### 2.1 `generateSlug` Invariant Verification
1. **Observation**: 849 adversarial inputs spanning 9 non-Latin alphabets, compound emojis, ZWJ sequences, Unicode whitespace, punctuation, empty strings, accents, >1000 character strings, and 500 randomized fuzz cases were executed against `generateSlug`.
2. **Analysis**:
   - When input contains Latin diacritics (e.g. `Café`, `Crêpe`, `Jalapeño`), `normalize("NFKD")` splits base letters and diacritic marks, and `.replace(/[\u0300-\u036f]/g, "")` strips the diacritics, producing clean ASCII representations (`cafe`, `crepe`, `jalapeno`).
   - When input contains exclusively non-Latin scripts (e.g. `नमस्ते`, `مطعم القدس`, `北京烤鸭`) or emojis (`🍕🎉🚀`), the regex `.replace(/[^a-z0-9\s-]/g, "")` leaves `cleaned` as an empty string. The conditional `if (!cleaned)` intercepts this and generates a guaranteed fallback: `business-${randomSuffix}`.
   - Suffix generation `Math.random().toString(36).substring(2, 8)` produces a 6-character alphanumeric string `[a-z0-9]{6}`. The prefix `business-` + 6 characters totals 15 characters, well within the 50-character ceiling.
   - Trailing and leading hyphen stripping `.replace(/^-+|-+$/g, "")` followed by `.slice(0, 50).replace(/-+$/, "")` ensures that if a string is sliced across a hyphen boundary at index 50, the trailing hyphen is removed.
3. **Conclusion**: 100% of tested outputs (849/849) satisfy:
   - Non-empty string
   - Strict pattern `/^[a-z0-9-]+$/`
   - `!slug.startsWith("-")` and `!slug.endsWith("-")`
   - `slug.length <= 50`

### 2.2 QR Route Decoding Safety & Clamping
1. **Observation**: 30 distinct edge-case queries were sent to `GET /api/qr`, including unencoded percent signs (`50%off`, `%%%`, `literal%`), broken multibyte sequences (`%E0%A4`), invalid hex (`%ZZ`, `%G1`), and out-of-range sizes (`abc`, `-100`, `999999`, `NaN`, `0`, `50`, `601`).
2. **Analysis**:
   - The route handler eliminates the redundant `decodeURIComponent(url)` call. Standard WHATWG `new URL(req.url).searchParams.get("url")` extracts the URL string safely without throwing unhandled `URIError`.
   - `QRCode.toBuffer(url, ...)` accepts the resulting string and encodes it into a standard PNG buffer.
   - The response buffer was empirically validated:
     - Magic bytes matched `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`.
     - IHDR chunk width and height strictly respected the clamped range `[100, 600]`.
     - Non-numeric or NaN size parameters defaulted safely to 300 without raising exceptions.
3. **Conclusion**: The QR route is fully immune to percent-encoding crash vectors and parameter tampering.

### 2.3 Bounded Slug Collision Retry
1. **Observation**: Collision loops were tested under simulated 100% collision rate (infinite collisions), 10 sequential collisions, 11 boundary collisions, and 1,000 randomized collision runs.
2. **Analysis**:
   - The `while` loop checks `attempt > 10`.
   - For attempts 1 through 10, it queries `${baseSlug}-${attempt}`.
   - If attempt 10 collides, the loop reaches `attempt = 11`. Because `11 > 10` evaluates to true, it assigns `${baseSlug}-${Math.random().toString(36).substring(2, 8)}` and executes `break`.
   - The loop unconditionally halts after exactly 11 collision checks, consuming bounded database resources.
3. **Conclusion**: The collision loop cannot run indefinitely or cause event-loop starvation.

---

## 3. Caveats

1. **Random Suffix Collision Probability**:
   - The random fallback suffix uses base-36 with 6 characters ($36^6 \approx 2.176 \times 10^9$ possible values). For local business slug allocation, the probability of collision is negligible. If an extremely rare collision does occur at the database level, Prisma's `@unique` constraint will throw a caught error returning HTTP 500, preventing silent data corruption.
2. **Offline Build Network Boundary**:
   - Running `next build` in an environment without internet access triggers `getaddrinfo ENOTFOUND fonts.googleapis.com` if Google Fonts (`Geist` in `app/layout.tsx`) are not pre-cached. This is an environment networking constraint rather than an application logic defect.

---

## 4. Conclusion

All empirical challenge criteria specified in the Challenger Mission have been thoroughly tested and satisfied:
1. `generateSlug` successfully and safely processes 100% of adversarial inputs (non-Latin scripts, emojis, symbols, whitespace, empty strings, accents, and extreme lengths) without generating invalid or out-of-spec slugs.
2. `app/api/qr/route.ts` safely parses arbitrary URL parameters without throwing `URIError` and strictly clamps dimensions to `[100, 600]`.
3. `POST /api/business` collision retry loop is strictly bounded to a maximum of 11 iterations.
4. Regression test suite (`npm test`) passes with 101/101 tests across 15 suites.

Final Challenger Verdict: **APPROVE**.

---

## 5. Verification Method

To independently reproduce the empirical findings:

1. **Execute the Challenger Empirical Stress Suite**:
   ```bash
   npx tsx scripts/challenger-stress-suite.ts
   ```
   *Expected Result*:
   - Slug Summary: 849/849 passed (100.0%)
   - Collision Summary: 4/4 passed (100.0%)
   - QR Summary: 30/30 passed (100.0%)
   - Final message: `CHALLENGER EMPIRICAL VERIFICATION COMPLETE — ALL STRESS TESTS PASSED 100%`

2. **Execute Full Project Regression Test Suite**:
   ```bash
   npm test
   ```
   *Expected Result*:
   - 15 test files passed (101 tests passed, 0 failed).
