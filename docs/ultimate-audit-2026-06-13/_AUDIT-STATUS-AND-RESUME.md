# ▶ NEW SESSION STARTS HERE — Ultimate Audit 2026-06-13 (status & resume)

Read THIS file, then `_FOUNDER-DECISIONS-NEEDED.md` (verdicts), then the specific
proposal blueprint for the item you're building. Work from the SOURCE files, never a
summary (founder rule 2026-06-13). Build is READ-the-source → edit-gate → implement →
lint + full test → commit → close gate, ONE item at a time, in the LOCKED ORDER below.
No reordering, no picking and choosing (founder, 2026-06-13).

## PRINCIPLE (founder, 2026-06-13) — non-negotiable
HIGH QUALITY + FIDELITY over speed, ALWAYS. Follow the audit EXACTLY and build every item in
full — no skipping, no deferring as a "future refinement", no substituting your own judgement to
cut scope or pick an inferior alternative. If the audit is genuinely ambiguous, ASK the founder;
do not guess. Use Opus 4.8 agents for parallel research and for a review pass after each item; the
build loop itself stays one-item-at-a-time and gated.

## IMMEDIATE NEXT ACTION
Build **ULTIMATE-009 (M2 — 44px touch-target pass, U-A-3 + U-F-2)** next, then **007 (U-C-7 — food search)**,
in this LOCKED order. Read each item's FULL source chain (phase5 proposal body + the cited compare-/phase1
files + the screen) before writing a line; edit-gate every src/ change with a verbatim spec quote; lint +
full test per item; commit one item at a time. Ask the founder only where the audit marks a value
NOT-DETERMINED or a SACRED boundary is touched. (Note: the InfoTooltip 44px fix was folded into 006 by
founder decision, so it is already done within M2's scope.)
DONE (takeover, founder-signed-off): 001 U-B-6 `b7426eb`+test `8bae26e`; 002 U-F-1 `b7ca91a`+`4b758e6`;
003 U-A-1 `61b0d0c`+`86343be`; 004 U-C-1 rebuilt `9f596d4`; 008 U-D-4 `cfb95fe`+`d7be25f`;
005 U-B-1 §2 engine `de6c97b` + §3-§6 screen `501fb45` (founder approved the `primary` field + DietBreak-as-safety).
006 M1 DONE (this session): part1 foundation+U-F-5 `b272f38`; part2 U-D-3 `4e351e9`; part3 U-E-1 body-fat `8665795`;
part4 literal U-F-5/U-D-3/U-E-1/U-E-2 `ec7f37b`; part5 U-B-9 opt-in science layer `89d300a`. Specs:
`_SPEC-006-M1-jargon-glossary.md` + `_SPEC-006b-U-B-9-locked-path.md`. **OPEN REVIEW:** U-B-9 (`89d300a`) is a
LOCKED coaching-voice change (`coachRegister.js` applyScienceLayer) committed BRANCH-ONLY — founder reviews
before any merge to main; only "lighter week (deload)" fires today (MEV/MRV/RIR pairs inert, phrases absent).

## ENVIRONMENT / MODEL (verified facts)
- Fable 5 is GLOBALLY DISABLED (US gov export-control directive; source: anthropic.com/news/fable-mythos-access).
  `model:"fable"` returns "unavailable"; only sonnet|opus|haiku|fable accepted. FOUNDER DECISION: run all
  agents on **Opus 4.8** (`model:"opus"`). FOUNDER INSTRUCTION: RE-AUDIT with Fable when it returns.
- Reddit (reddit.com) is BLOCKED here → all Reddit-derived sentiment in the audit is PARTIAL/secondary
  sourced (flagged). Founder accepted this (D17); re-run only where a proposal hinges on it.

## GUARDRAILS (active, do not bypass)
- Edit-gate `.claude/hooks/edit-gate.sh` + commit-gate `.githooks/pre-commit` (core.hooksPath=.githooks).
  Editing/committing app code (src/, supabase/) REQUIRES `.claude/edit-gate` to name a real spec file +
  a verbatim quote that grep-verifies against it. Open it with the proposal-blueprint path + a quote,
  edit, then `rm .claude/edit-gate` to re-close. (Local to this container; gitignored.)
- CLAUDE.md founder rules (2026-06-13): work from source not interpretation; handovers point to source files.
- FRESH-CONTAINER SETUP (local-only state — re-establish at session start): `git config core.hooksPath .githooks`
  (commit-gate) AND `npm ci --legacy-peer-deps --ignore-scripts` (deps for lint+test). NOTE (verified 2026-06-13):
  the edit-gate PreToolUse hook only loads at SESSION START — if `.claude/settings.json` arrives mid-session it
  will NOT enforce that session; the commit-gate is then the binding guardrail, so keep `.claude/edit-gate` valid
  for every src/ edit regardless.

## AUDIT — COMPLETE (all in docs/ultimate-audit-2026-06-13/, committed + pushed)
- Phase 1: `ultimate-audit-00-volyume-complete-inventory.md` (78 screens + 68 components, file:line) +
  `ultimate-audit-00-navigation-psychology.md`. Source fragments in `phase1/`.
- Phase 2: `phase2/research-01..15-*.md` (15 areas, 50+ apps each, VERIFIED/PARTIAL/NOT-FOUND, sourced).
- Phase 3: `ultimate-audit-02-master-comparison.md` (2.3k lines). Fragments in `phase3/`.
- Phase 4: `ultimate-audit-03-navigation-proposals.md`.
- Phase 5: `ultimate-audit-04-proposals-with-blueprints.md` (70 proposals, Tier 1–4 index, merges M1–M8,
  build order). Source bodies in `phase5/proposals-*.md`. Plus `ultimate-audit-01-workout-screen-proposal.md`.
- Phase 6: `ultimate-audit-00-executive-summary.md`.

## FOUNDER VERDICTS (full detail + rationale in `_FOUNDER-DECISIONS-NEEDED.md`)
D1 by-ability disclosure · D2 translation layer (presentation) · D3 jargon+empty-states FREE ·
D4 FULL (incl. Coached auto-apply + engine-feed → needs spec+safety review) · D5 overreach warning (safety) ·
D6 diary anti-shame · D7 lenient streak (safety) · D8 RPE/RIR + readiness BOTH (engine review) ·
D9 pain flag + rotation BOTH (engine review) · D10 log-confirm guard · D11 contest-prep floor-clamped ·
D12 demo media: prove in-house + price a licence · D13 food stays boundary-safe (no AI) ·
D14 nav relocations yes · D15 RENAME locked names (amend locked docs; bring specific proposals) ·
D16 onboarding tweaks yes · D17 accept PARTIAL Reddit · D18 re-audit w/ Fable later · D19 build order yes ·
D20 build Tier-1 ungated quick wins now.

## BUILD PHASE — in progress
DONE (committed): 002 U-F-1 Button onPrimary contrast (`b7ca91a`) · 001 U-B-6 CoachReview error-vs-empty
(`b7426eb`) · 008 U-D-4 encouragement empty/near-empty (`cfb95fe`) · 003 U-A-1 workout banner-fold
(`61b0d0c` + `86343be`: rail collapse, target-line-into-card, RestTimer layout-recompute, invariant test) ·
004 U-C-1 "set it for me" fast nutrition target (`bdb71f9`).
LOCKED ORDER (next →): **005 → 006 → 009 → 007** → then the FOUNDER-DECISION/GATED batch
(D4-full, D5–D9, D12, D15, U-NAV gated items, U-G-1/020 etc. — each needs its spec + safety/locked-doc
review) → then Tier 2/3/4 by ULTIMATE number.

### 003 (U-A-1) confirmed spec — ready to build (founder-confirmed):
- Above the set-entry card render ONLY: nav strip (unchanged, ActiveWorkoutScreen.js:1409-1441) + rest
  timer when running (:1551). Collapse ALL other banners — starter (:1393-1406), superset chip (:1487-1494),
  next-time notes (:1498-1514), deload (:1517-1534), target-reached (:1554-1561) — into ONE tappable
  "N notes" chip that expands on demand.
- Move the target line (:1537-1544) INTO the set-entry card header (by orientation/beat lines).
- Acceptance: on a 5.4" device (default + larger-text 1.2×) the beat line + first input row are within the
  initial viewport. No engine/gating change. Add an invariant-style test if feasible; small-phone walk by founder.

## OPEN FOLLOW-UPS (recorded, not yet done)
- U-F-1 destructive variant: flips dark-ink-on-dark-red in LIGHT theme → needs an "on-error" light-ink token.
- U-B-6 CoachReview: no test harness → add an error-state regression test.
- U-D-4: per-row sparkline near-empty treatment in LiftProgress (minor).
- Universal-link AASA/assetlinks (separate prior partner work) — server-side, outside repo.

## SACRED CONSTRAINTS (never violate; FOUNDER-GATE if touched)
Deterministic engine (no AI/LLM) + confirm-then-apply contract · `src/coaching/safety/` (ED floors, rapid-loss
threshold, Beat signposting) · billing (no change without sign-off) · free/Pro gating · British English ·
never touch main. Gated proposals are INPUT ONLY until the founder + safety/billing owner sign the spec.
