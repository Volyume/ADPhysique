# VOLYUME launch audit and build wave — 2026-07-08

## What this folder is

The world-class competitive/UX audit run in the Claude session on 2026-07-08,
plus the founder-issued build-wave plan derived from it. Both were produced in
the session conversation and had **not** been written to a file at the time;
this folder reconstructs them **verbatim from the session transcript** so the
build works from a source document, not a summary.

- `00-full-audit.md` — the full 17-section audit (executive summary → §14
  launch-critical top 10 → §15 premium-later top 10 → §16 avoid/delay → §17
  final recommendation). Verbatim.
- `01-build-wave-plan.md` — the founder-issued 4-wave build plan and
  constraints. Verbatim.
- This README — provenance, decisions ledger, live status.

## How the audit was produced (provenance)

8 Sonnet scouts each inspected one lane of the codebase and reported evidence;
the main session synthesised §00-audit from their evidence only (no repo
crawl by the synthesiser). The §14 top-10 is the authoritative build list for
the current wave. Every item in §14 cites the scout that surfaced it.

## Decisions ledger

- **Build list = §14 (10 launch-critical items).** Source of truth for the
  current build wave. Do not re-audit, re-benchmark, or rewrite architecture.
- **No premium-later items in this wave.** §15 is explicitly out of scope for
  the top-10 wave (per `01-build-wave-plan.md`).
- **Waves run sequentially, not in parallel.** DiaryScreen, MacroRings,
  FoodSearchScreen, CoachOutputScreen and AthleteProfileScreen each appear in
  more than one wave, so parallel patching would conflict. The plan permits
  sequential execution when that risk exists.
- **Model tier: Sonnet for patching, no Opus/Fable.** The build-wave plan bars
  Opus/Fable/advisor and asks for the cheapest reliable model for scouting and
  stronger coding only where a patch is written. Implementation subagents run
  on Sonnet; the main loop coordinates and verifies only.
- **Preserve the inviolables.** No-auto-apply, ED-safety floors and gates,
  tier-blind guardrails, GDPR/Article 9 consent, and progress-scan
  `affectsTargets:false` isolation are not touched by any wave beyond a tiny
  required integration.

## Follow-on final wave = §15 (premium-later top 10)

Founder clarified (2026-07-08): the follow-on "final wave" is **§15, the
premium-later top 10** in `00-full-audit.md`, run under the same criteria and
process after the §14 top-10 wave lands. Two §15 items were **founder-gated in the audit**; both were put to the founder
on 2026-07-08 and decided:

- §15 #2 — MN-1 micronutrients/NRV: **DECIDED — full schema build.** New
  micronutrient columns across local SQLite + Supabase (migrate_088+, additive
  and idempotent, run manually by the founder), CoFID micro import, UK NRV
  reference table, opt-in diary panel behind a tap. Schema is safety-adjacent,
  so this is written **hands-on in the main loop**, not by a subagent, during
  the final wave. Blueprint: `docs/ultimate-audit-2026-06-13/pass4-blueprints-micronutrients.md`.
- §15 #9 — Raw/cooked toggle (gated item 12): **DECIDED — keep stored grams
  as-is, no toggle.** No conversion factor exists in code and the register
  forbids inventing one; curated names already carry the weight state
  ("White rice (cooked)"). Nothing to build. Confirms the existing NUT-01
  decision.

The other eight §15 items build under the standard wave process.

## Live status (updated as waves land)

- Wave 1 — Food trust quick wins (items 2, 5): **done** (`dcc74fc`, `4d71fed`).
  Item 5's UI was already shipped; a dead-telemetry bug was fixed and both
  items are now test-covered.
- Wave 2 — Plan/diary adherence loop (items 1, 4): **done** (`b066e73`).
  Audit's "no linkage" claim for item 1 was stale (a day-level linkage already
  existed); extended to per-meal granularity. Item 4 verified already correct
  by construction; added a regression test.
- Wave 3 — Coach surface coherence (items 3, 6, 7): **done** (`c65aed7`,
  `2e3a21c`). Item 3 reorder + item 6 chip shipped. Item 7 diligence read found
  no copy/crash bugs but one pre-existing persistence bug (coach applied-state
  wiped on CoachOutput remount) — verified NOT a safety/stacking risk, founder
  chose to fix now; fixed via `preserveAppliedAdjustments` merge in
  `saveCoachOutput` with a regression test.
- Wave 4 — Polish/loading/correctness/a11y (items 8, 9, 10): **done**
  (`fe01c32`). Item 8 clock-skew guard + 13 tests (isolation intact); item 9
  styling.md rule + ProgressPhotos skeleton swap (other 5 compliant); item 10
  HomeScreen-scoped a11y lint rule + 5 labels. Repo-wide a11y rollout (53
  pre-existing violations) flagged for a founder scope decision.

**All 10 §14 launch-critical items are complete.**

### §15 premium wave (in progress)

- #1 Connected weekly story surface — **done** (`bab1f68`).
- #2 MN-1 micronutrients (full build, hands-on) — **done** (`086d23f`,
  `f9e962f`, `b314efe`). Schema local + cloud (migrate_109, founder-run),
  wiring, sync, read, diary panel + custom-food entry. Ships "unknown" until
  the seed .dat regen (separate queued task, #99).
- #4 "Last verified" + opportunistic re-fetch — **done** (`17a163e`). Reuses
  foods.fetched_at (no new column); network-only, best-effort, non-blocking.
- #5 Training-day meal composition — **done** (`e2a31ed`), floor-only, no
  target/floor changes.
- #6 Repeat-a-day + grocery share — **done** (`3f060dd`).
- #7 Readiness aggregate — **done** (`5382750`).
- #8 Notification deep-links — **done** (`71ba616`).
- #9 Raw/cooked toggle — no build (founder decision: keep stored grams as-is).
- #10 Tap-count regression gate — **done** (`19804fc`).
- #3 Report-bad-food flow — **deferred** (founder decision 2026-07-08: skip this
  wave; the one item with a real moderation backend/ops dependency).
- Final wave — §15 premium-later 10 (2 founder-gated): queued after Wave 4.
