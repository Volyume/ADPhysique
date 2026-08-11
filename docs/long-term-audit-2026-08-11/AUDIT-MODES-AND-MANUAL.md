# Phases 15-17 — manual overrides, coaching modes, calm mode over time

Campaign 6 completion pass (lead). The engine-level laws were pinned
earlier in the campaign; this closes the three phases' surface
questions with traced behaviour. Verified 2026-08-11 on the live tree.

## Phase 15 — manual overrides over time

- **Set**: a manual landmark table wins the seed outright and teaches
  the engine nothing (blockSeed step 1; learnedRange skips
  deferredToManual entries; pinned in campaign6.relationship +
  athlete180). Only a REAL edit counts: `isManualEdit`
  (effectiveLandmarks.js:85) compares each band to the research
  default, so saving untouched defaults never silently disables the
  adaptive layer (Stage 6 blocker #1, still enforced).
- **Removal**: resetting bands back to the research values makes
  `isManualEdit` false - the override dissolves and the adaptive
  precedence resumes. No hidden residue: the same rule guards the
  ledger runner (blockLedgerRunner.js:231,408).
- **Reinstall / new device**: the manual table is a stamp-guarded pref
  - it crosses reinstall and survives every conflict path (S-20 CLEAN,
  prefSync.landmarks suite; REINSTALL-MATRIX row).
- **Mode return**: returning from Manual autonomy does not resurrect
  anything - autonomy gates only WHO presses Apply (below); the manual
  LANDMARK table is independent of autonomy mode by design.
- **Expiry**: none exists; a manual override stands until the user
  changes it. The one open edge - F9, whether a REVERT of an applied
  adjustment should expire - remains the recorded founder question.

## Phase 16 — coaching modes across block states

`coachAutonomy` (default 'collaborative', CoachOutputScreen.js:1022):

| Mode | Behaviour | Bound |
|---|---|---|
| Manual | `applyDisabled` - every Apply affordance (8 sites) renders informational; nothing writes | Full user ownership; the coach still explains |
| Collaborative | Confirm-first Apply on every card | The default posture |
| Coached | Auto-walk of the CURRENT cycle's output only: hard-stops on `autoApplyHoldActive` (safety holds stay confirm-first) and on the D97-10 age gate (`liveWeek - outWeek > 7d` returns), so months-old outputs keep manual buttons | Pinned in campaign6.longTerm ("old proposals are never resurrected by Coached mode") |

Across block states: the auto-walk reads the LIVE week only; a
completed_awaiting_decision block passes a null live week (Stage 4
rule) so Coached mode cannot roll a finished block forward - no
automatic block transitions in any mode (R-22 CLEAN re-verified).
Mode switches take effect on the next render; no queued auto-applies
survive a switch to Manual because the walk re-reads autonomy at run
time (`if (coachAutonomy !== 'coached') return;` at :2184).

## Phase 17 — calm mode over time (Standard → Calm → Standard)

- **Entering calm**: user action or safety routing; every
  weight/food-adjacent surface softens or hides (S-27 CLEAN inventory;
  win-back lay now included, R-17).
- **During calm**: nothing learns upward from the period - the
  suppressed block's evidence can reduce but never raise the learned
  ceiling (athlete180 + relationship pins); proposals degrade to
  repeat numbers (blockSeed suppression rule); the block-start deload
  stays the flat protective week.
- **Sync while calm**: the one-way ratchet - a stale device's
  'standard' can NEVER un-calm this device via pull (S-20, pinned).
  The ratchet binds sync only; the USER leaves calm freely in
  Settings → Coaching (SettingsCoachingScreen.js:76).
- **Returning to Standard**: suppression lifts forward-only. The calm
  period's history remains suppressed evidence for ever (no
  retroactive teaching), and nothing "catches up" - no banked
  increases, no replayed proposals (the D97-10 age gate makes old
  outputs manual). Copy on return makes no reference to the calm
  period's data (checked: no surface narrates the suppressed weeks -
  matching the B2 founder-gated boundary that calm/ED state is never
  exposed in copy).

All three phases close as COMPLETE with the above traces; no new
defects surfaced beyond the already-recorded founder items (F9, B2).
