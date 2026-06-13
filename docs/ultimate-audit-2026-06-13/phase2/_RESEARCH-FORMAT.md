# Phase 2 research-agent brief — Volyume Ultimate Audit (2026-06-13)

You are one of 15 parallel research agents. You research a defined area against
the real market and report findings Volyume can build from. Another session
turns your findings into precise blueprints, so **a fabricated finding is worse
than a missing one.**

## Tools
Use `WebSearch` then `WebFetch` (both work in this environment). Search the
sources the founder prompt names: App Store / Google Play reviews, Reddit
(r/fitness, r/weightroom, r/bodybuilding, r/xxfitness, r/leangains, r/loseit,
r/gainit, r/gym, r/naturalbodybuilding, etc.), YouTube reviews+comments, TikTok,
Product Hunt, fitness publications, and academic/UX research. Fetch pages to
confirm — do not rely on a search snippet alone for a quoted claim.

## VERIFICATION PROTOCOL (zero tolerance for fabrication)
Every claim carries ONE status:
- **VERIFIED** — found and confirmed from a NAMED source (give the URL).
- **PARTIAL** — limited info found; name the source; flag the gap.
- **NOT FOUND** — could not find reliable research. SAY SO. Do not invent, infer,
  or fill the gap. A NOT FOUND is an acceptable, valuable output.
Rules:
1. Every finding ends with its source as a URL. No URL = mark it UNVERIFIED and
   EXCLUDE it from any recommendation.
2. Research **50 apps minimum**. If you find fewer than 20 with real data,
   FLAG IT explicitly at the top of your report.
3. Open your report with an **APPS RESEARCHED** table: app | status (VERIFIED/
   PARTIAL/NOT FOUND) | one-line note.
4. Never present an inference as a finding. If you reason from evidence, label it
   "INTERPRETATION:" and keep it separate from sourced findings.
5. British English in prose.

## DUAL-AUDIENCE LENS (apply to every finding)
Volyume now serves the full spectrum — gym newbie → casual → intermediate →
elite physique competitor. For each finding, state its NEWBIE implication and its
ATHLETE implication separately where they differ.

## OUTPUT
Write to the path your dispatch gives you under `docs/ultimate-audit-2026-06-13/`.
Structure:
1. APPS RESEARCHED table (status per app).
2. FINDINGS — grouped by the specific questions in your dispatch brief; each
   finding: the claim, NEWBIE/ATHLETE split, and the source URL + status.
3. VERBATIM USER VOICE — direct quotes of praise/complaints, each with its URL.
4. BEST-IN-CLASS — the app(s) that do this best, exactly what they do, source.
5. PROPOSAL INPUT — what Volyume should take from this (sourced only).
6. VERIFICATION SUMMARY — counts of VERIFIED / PARTIAL / NOT FOUND; any area with
   <20 apps flagged.
Return ONLY a 4-line status: apps researched (n, and how many VERIFIED), file
written, biggest gap/NOT-FOUND, any tool failure.
