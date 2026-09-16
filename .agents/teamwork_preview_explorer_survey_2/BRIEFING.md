# BRIEFING — 2026-09-13T10:49:00Z

## Mission
Investigate requirement R3 (Edge-Case Crash Prevention & Model Configuration: slug generation, QR decoding, AI model IDs, DB singleton) and produce an exhaustive handoff report.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: [explorer, synthesis]
- Working directory: /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_explorer_survey_2
- Original parent: 5536c17a-07b2-41f2-9978-372723801393
- Milestone: R3 Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Output handoff report to /Users/amandeepsingh/Desktop/TabandRate/.agents/teamwork_preview_explorer_survey_2/handoff.md
- Use send_message to report completion back to parent (5536c17a-07b2-41f2-9978-372723801393)

## Current Parent
- Conversation ID: 5536c17a-07b2-41f2-9978-372723801393
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `lib/utils.ts` (lines 9-18: `generateSlug` implementation and test coverage)
  - `app/api/business/route.ts` (lines 48-56: slug assignment & collision loop)
  - `app/api/qr/route.ts` (lines 5-22: `new URL`, `searchParams.get`, `decodeURIComponent`, `QRCode.toBuffer`)
  - `lib/ai.ts` (lines 57-141: Groq & Gemini model arrays, error fallbacks)
  - `lib/db.ts` (lines 1-26: `Pool`, `PrismaPg`, `PrismaClient`, `globalThis` assignment)
- **Key findings**:
  - `generateSlug` strips all non-ASCII chars and emojis, producing `""` or `"-"` for Hindi/Arabic/Chinese/emojis.
  - In `app/api/business/route.ts`, empty or hyphen-only slugs cause route collisions, 404s at `/r/[slug]`, and bad slug sequences (`"-1"`, `"-2"`).
  - In `app/api/qr/route.ts`, `searchParams.get("url")` already decodes parameters; calling `decodeURIComponent(url)` causes double decoding and crashes with `URIError: URI malformed` on percent-containing URLs.
  - In `lib/ai.ts`, Groq models (`qwen/qwen3.8-27b`, `groq/compound-mini`) and Gemini models (`gemini-3.6-flash`, `gemini-flash-latest`) are entirely fictitious, causing 100% failure of review generation.
  - In `lib/db.ts`, singleton is disabled in production (`if (process.env.NODE_ENV !== "production")`), leaking connections across serverless route bundles.
- **Unexplored areas**: None. All 4 target areas in R3 thoroughly investigated.

## Key Decisions Made
- Formulated exact patch recommendations for all 4 items in R3.
- Ready to write handoff.md.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Final investigation report
