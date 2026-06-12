# Blast radius & revert map — the research failure (2026-06-12)

**The decision this enables:** what survives from the 2-day deep-audit branch.
**The critical fact:** `main` (production) was never touched. Nothing here
reached users. This is triage of unreleased branch work, not a live rollback.

## Category A — KEEP regardless (founder-ordered fixes; zero research input)
Reverting these would RESTORE bugs the founder personally found on device.
- Black-on-black text fix (phantom theme tokens) + the guard test that makes
  the bug class impossible.
- "Supplements, honestly" removal. Methodology row made free-only.
- Body Metrics tile honesty fix. Bogus day-level plan warnings removed
  ("no hamstring work" on a back day).
- Workout delete in history (+ cloud tombstone path, contract tests).
- Meal library cuts + renames (thighs, bangers, ham sandwich, etc; Weetabix,
  Quorn). Attribution scrub + CLAUDE.md rules.
- Profile-pull fix (wiped local prefs), GDPR wipe additions, CI fixes.

## Category B — KEEP, founder-shaped mechanics (research-light, test-pinned)
Direction came from the founder in-session; contracts are invariant tests
against the real engine, not research claims.
- Slot character: Meal 1 places breakfast food, numbered labels kept; swaps
  respect the slot (the curry-for-breakfast fix).
- Protein-anchor policy: omnivore meals anchor on animal protein; legumes
  never anchor (founder ruling). Vegan uplift gate (caught 5 pre-existing
  under-protein meals; the leucine literature behind it is textbook, though
  flagged unvalidated like everything else).

## Category C — FUNCTIONAL BUT UNPROVEN DESIGNS (the contaminated justification)
Built to spec and test-pinned, but their "right design vs competitors"
rationale rests on the UNVALIDATED corpus. Each needs a verdict from the
real competitive research: keep / amend / rebuild. None is safe to merge to
production until then.
- Theme G meal-plan flagship (prior session) — already part-corrected.
- D1 milestone ladder; D2 programme-arc + streak-repair surface.
- C1/C2 coaching register + science layer (engine + settings).
- Partner system rebuild (screen, beats, pushes) — code sound; placement
  rationale unvalidated.
- Wave 1 (five-part coach response, free one-liner, notification budget,
  ghost prevention, quiz-first onboarding) — prior sessions, same corpus.
- Meal library SURVIVORS (provisional, founder-gated, in
  `_GATE-meal-library-2026-06-12.md`).

## Category D — DISCARDED ALREADY
Everything the founder vetoed is deleted; research docs carry provenance/
degraded-method notices; competitive claims withdrawn.

## The three options
1. **Hold the branch, validate, then merge selectively (recommended).**
   Nothing is live, so there is no urgency to delete. Fix the environment's
   network policy, re-run the competitive research properly, then judge each
   Category C feature against real evidence. A and B merge whenever wanted.
2. **Surgical revert now:** strip Category C features from the branch, keep
   A+B. Significant git surgery across ~265 commits; loses test-pinned work
   that may yet validate; only worth it if the founder wants a clean slate
   before validation.
3. **Full reset to main:** throws away A and B too — restores the device-walk
   bugs the founder found. Not recommended under any reading.

## How to verify this map independently
- `git log origin/main..HEAD --oneline` — every commit, all on the branch.
- `npm run lint && npm test && npm run typecheck` — the contracts (4,055
  tests green at the time of writing).
- The founder's own device-walks remain the only trusted quality signal
  until the research re-runs.
