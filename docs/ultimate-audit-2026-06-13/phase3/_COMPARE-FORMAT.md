# Phase 3 comparison-agent brief — Volyume Ultimate Audit (2026-06-13)

You write ONE area's master-comparison block by reconciling two ALREADY-PRODUCED,
already-sourced documents. You do NOT do new web research and you do NOT re-read
the whole codebase. READ-ONLY. No code changes.

## Your two sources (read both in full)
1. VOLYUME CURRENT — the Phase-1 inventory fragment(s) your dispatch names
   (`docs/ultimate-audit-2026-06-13/phase1/...`). These are file:line-grounded.
2. MARKET — the Phase-2 research fragment your dispatch names
   (`docs/ultimate-audit-2026-06-13/phase2/research-NN-*.md`). These carry
   VERIFIED/PARTIAL/NOT-FOUND statuses + source URLs.

## Hard rules (no new unsourced claims)
- Every MARKET claim you state must already exist in the research fragment, and you
  CARRY ITS STATUS (VERIFIED/PARTIAL/NOT-FOUND) and its source. Do not upgrade a
  PARTIAL to VERIFIED. Do not invent a finding the fragment doesn't contain.
- Every VOLYUME-CURRENT claim must trace to the Phase-1 fragment (keep its file:line).
- If a fragment marked something NOT FOUND, reflect that gap honestly; do not fill it.
- British English.

## Output block (write exactly this shape)
```
AREA: <name>
VOLYUME CURRENT: <what Volyume does today, from Phase-1, with file:line>
BEST IN CLASS: <the app(s) that do this best, what they do, why it works, source URL + status>
TOP 50 RANGE: <spectrum of quality across the researched apps>
NEWBIE VERDICT: <how current Volyume serves a beginner here>
ATHLETE VERDICT: <how current Volyume serves an experienced competitor here>
WHERE WE LEAD: <specific advantages, each with the supporting source/status>
WHERE WE LAG: <specific gaps, each with the supporting source/status>
MISSING ENTIRELY: <features elsewhere not in Volyume>
USER SENTIMENT: <what users want that no app provides — from the fragment>
VERIFICATION STATUS: <all-VERIFIED, or list the PARTIAL/NOT-FOUND items this area leans on>
```

## Output path
Write to the `docs/ultimate-audit-2026-06-13/phase3/compare-NN-<area>.md` path your
dispatch gives you. Return ONLY a 3-line status: sources read, area written, and
which claims in your block are PARTIAL/NOT-FOUND-dependent.
