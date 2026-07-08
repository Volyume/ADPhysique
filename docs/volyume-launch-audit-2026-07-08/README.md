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

## Open founder decision (for the follow-on wave)

The founder asked for "the other 15 improvements" in a final wave under the
same criteria. The audit does not contain a clean list of exactly 15: §5 ranks
7 gaps, §14 is the launch-critical 10, §15 is the premium-later 10. Which items
constitute "the other 15" is a founder decision to be surfaced as a structured
question **after** the §14 top-10 wave lands — not guessed here.

## Live status (updated as waves land)

- Wave 1 — Food trust quick wins (items 2, 5): in progress.
- Wave 2 — Plan/diary adherence loop (items 1, 4): not started.
- Wave 3 — Coach surface coherence (items 3, 6, 7): not started.
- Wave 4 — Polish/loading/correctness/a11y (items 8, 9, 10): not started.
