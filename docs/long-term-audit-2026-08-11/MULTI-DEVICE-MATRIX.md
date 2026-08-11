# MULTI-DEVICE MATRIX — the Phase 37 conflict scenario, step by step

Campaign 6 commissioned document. The order's scenario is walked in
sequence; every verdict is traced to the applier/guard that enforces it
and to the suite that pins it. Sources: AUDIT-REINSTALL-SYNC-OFFLINE.md
(S-n), campaign1.syncConflict.test.js (the applier-level conflict pins,
green), campaign6.reinstall.test.js, and the D97 rulings.

## The commissioned scenario

Device A starts a block → B syncs → A completes a workout → B stale →
A applies weekly coaching → B opens the old plan → A finishes the block
→ B still believes it active → A chooses adjustments → B reconnects.

| Step | What B could corrupt | Verdict | Enforced by | Pinned |
|---|---|---|---|---|
| A starts block, B syncs | — | B receives the mesocycle + weeks | pull appliers | reinstall E2E |
| A completes workout, B stale | B's stale push overwrites A's workout in the cloud | REFUSED cloud-side only after migration 134 (stale-write trigger, proven in scratch); LOCAL truth on A is safe regardless (appliers refuse older cloud rows) | S-12 proven; S-18 CLEAN; **S-19: the exposure 134 closes is cloud-side** | campaign1.syncConflict |
| A applies weekly coaching | B's copy of the week's output lacks the receipt → double Apply | Receipt propagates AND survives: one deterministic output id per week (v71/v72); the pull applier's receipt RATCHET (RC6-1, D97-25) stops B's newer merely-viewed row clearing A's receipt (Review C proved the pre-fix applier destroyed it); the applied column is derived from the JSON on every save (RC6-2) | S-16/S-22; corrected 135 completes cloud convergence under its two recorded release conditions | reinstall E2E test 7 (rebuilt on the real apply path); coachOutputReid suite |
| B opens the old plan | B resurrects the old plan as active | Activation is explicit-only; setActivePlan is transactional with a deterministic tiebreak (D97-12); is_archived syncs both ways (D97-13) | plan lifecycle pins | campaign6.longTerm |
| A finishes the block; B still believes it active | B pushes "active" state over A's completed block | A completed block cannot resurrect: status is DATE-DERIVED (never stored-active), and the ledger applier never nulls a local ledger | R-21/R-22 CLEAN; S-18 | reinstall E2E test 3 |
| A chooses adjustments (seeds next block) | B's stale mesocycle push nulls the ledger / duplicates learning / replaces it with a poorer judgement | Ledger key omitted from push when absent (can't null); blockLedgerRunner idempotent by version (no duplicate learning); a newer cloud row with a SAME-VERSION ledger keeps the local judgement (RC6-4, D97-25 - Review C proved recency alone let the poorer device's ledger seed the next block) | S-18, S-22 CLEAN; RC6-4 fixed | adaptiveBlock/e2e suites; reinstall E2E RC6-4 pin |
| B reconnects | B's bulk push reverts A's newer prefs | GUARDED prefs win by freshest real user write, not push order: landmarks, calm (one-way ratchet), profile blob, streak blob (R-11), notification blob + quiet hours (S-2) | D97-19 F4, D97-22 R-11, D97-23 S-2 | campaign1.syncConflict re-anchored |
| B reconnects (safety) | B un-calms A's calm mode / clears an ED flag | Calm is a one-way ratchet in pref sync; ED flag is device-local (D92-11) so B cannot clear A's - and equally cannot SEE it (the recorded D92-11 consequence) | S-20 CLEAN; S-1 under D92-11 | prefSync suites |
| B reconnects (manual intent) | B's stale push drops A's manual landmark override | Stamp rule: the freshest real write wins; manual overrides survive every conflict path | S-20 CLEAN | prefSync.landmarks |

## Convergence statement

With migration 134 applied (stale-write refusal, proven in the scratch
cluster) and the corrected 135 applied after the v72 build, the two
devices converge deterministically on: one coach output per week
carrying the applied receipt; one active plan; the completed block
completed; the ledger intact; the freshest real user choice for every
guarded preference; and safety state never weakened by staleness.

## Honest residuals (all recorded, none silent)

- **S-19 (LATENT)**: until 134 runs, a stale push can corrupt the CLOUD
  copy while both devices hold correct local truth; the cloud self-heals
  only when the good device syncs again — a user who abandons the good
  device restores from the corrupted copy. This is the concrete reason
  134 leads the release order.
- **S-6/S-7 (LATENT)**: 134's IS-NULL branch accepts a null-updated_at
  write (all nine push mappers fall back to Date.now(), so unreachable
  today), and its equal-timestamp branch accepts (strictly-older-refuses
  semantics). Recorded for the triage; no client change required.
- **D92-11**: ED flag state does not propagate between devices — founder
  decision, unchanged, with the new partner-cheer/migrate_123 evidence
  recorded under it.
- **FR-C4-2/FR-C4-3**: the notification-pref dual family and the
  adaptation_events mirror remain the founder's architecture questions.
