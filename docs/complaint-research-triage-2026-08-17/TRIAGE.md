# COMPLAINT-RESEARCH TRIAGE (Campaign 29, 2026-08-17)

Founder supplied an external competitor-complaint research report
(17 apps, deduplicated complaint corpus) and asked what Volyume should
implement now. Two read-only sonnet verification agents checked every
relevant recommendation against the ACTUAL tree; this is the lead
disposition. Founder rulings received during triage: Apple Health /
Health Connect stay DISABLED (deliberate - store-review cost, D107-1);
injury controls and load semantics are the two workstreams to pursue
(D107-2). Full agent evidence: the two verification reports are
summarised per row below with file:line anchors.

## Disposition table

| Report recommendation | Verdict against the tree | Action |
|---|---|---|
| P0 "never lose a set" invariant | COVERED - every set write hits SQLite before UI confirms (database.js:3562, ActiveWorkoutScreen.js:1803+); full session snapshot persists on every mutation (useAppStore.js:120-170); kill-recovery restores exact state incl. wall-clock timers (restoreActiveWorkout :1542) | None. Optionally market it. |
| P0 visible sync status | COVERED by DESIGN - global status + manual retry in Settings > Your data (SettingsDataScreen.js:262); per-item badges were founder-REMOVED 2026-05-31 (PRODUCTION_READINESS_LOCKED §1) | None; standing ruling holds. |
| P0 Health Connect / Apple Health | FOUNDER-HELD (D107-1): integration deliberately removed 2026-06-30, review-cost. NOT a gap. BUT: SettingsHealthScreen still renders two working-looking toggles that silently no-op (health.js:90-99 always null; no toast, no explanation) - a dead-end UI | FIXED NOW (this landing): screen states the truth instead of dead switches. |
| P0 deterministic coaching visible | COVERED/PARTIAL - per-adjustment rationale + Apply + "Keep as is" decline + hold receipts all real (CoachOutputScreen AdjustmentRow :215-287, HeldDecisionsCard); auto-apply exists ONLY under user-chosen "Coached" autonomy and forces confirm-first under ANY open safety hold (D16; weeklyCoach.js:2118-2128) | None; matches the report's ideal closer than any competitor cited. |
| P0 injury/constraint controls | PARTIAL - per-exercise EXCLUDED / AVOIDED_BLOCK intents exist with UI (exercise/intent.js; RoutineDetailScreen :391-421) and equipment is a hard generation filter; but no movement-pattern/joint-level constraint, no day-bound expiry, advisory not enforced as senior | BUILD NEXT WEEK - spec ready: INJURY-CONSTRAINTS-SPEC.md (D107-2). |
| P0 active-workout release gate | COVERED/PARTIAL - persistence pins exist (activeWorkoutPersistence.test.js, e6aRestSurvival.guard); no single bundled gate; two checks await founder device walk (Campaign 7 items 33-34) | Queue: bundle into one named suite when C27-2d Maestro net builds. |
| P1 load semantics | ABSENT - exercise_type has 5 values, none of per-hand/assisted/stack; tonnage/1RM/PR treat weight as a raw scalar (algorithms.js:156,101); assisted progression (less assistance = stronger) invisible to PR detection; dumbbell convention undefined | BUILD NEXT WEEK - spec ready: LOAD-SEMANTICS-SPEC.md (D107-2). |
| P1 promote import/Data Vault in onboarding | TRUE but a product choice - Hevy/Strong import, JSON backup, CSV export, snapshots all exist and all live only in Settings (SettingsDataScreen :294-323) | FOUNDER OPTION (not built): surface "Bring your history" during onboarding. |
| P1 more importers (JEFIT/Fitbod/...) | Real switching-cost logic, but breadth-not-trust | HOLD - revisit after the two chosen workstreams. |
| P1 keep free logging generous | COVERED exactly - record/keep/delete/export all free, every nutrition/coaching surface Pro (proGate.js; RootNavigator gating verified) | None; the report's proposed "Fair-Pro contract" is already our law. |
| P1 partner-only social | COVERED - allowlist-pinned partner writes, per-card visibility/revocation, private by default (partnerPrivacy.guard.test.js). Report's "cheers lack a toggle" claim is STALE - toggle live + guard-pinned since 2026-08-10 (CoachingRemindersScreen :413-424) | None. |
| P1 exercise families sharing history | Families exist for SELECTION only (canonicality.js, movementFamily.js); history is strictly exercise-id; swap deliberately zero-histories the swapped-in exercise | HOLD - genuine idea, interacts with load semantics; revisit after both specs land. |
| P1 PR/history correction | ABSENT - whole-workout delete only; summaries read-only from history; no per-set correction, no PR exclusion, no import-source badge | QUEUE (next-week candidate 3): small, honest, analytics-trust win. |
| P1 known-issues surface | Not built; low value at current scale | HOLD. |
| P2 watch integrations | Already founder-PAUSED (board :1396) | None. |
| Renewal transparency | PARTIAL - trial end date shown; paid renewal date not shown (store deep-link only); no advance reminder | BILLING-GATED: any change is a founder billing decision; surfaced here, not built. |
| Pre-sync restore points | Absent; per-row last-write-wins guards cover the realistic risk (database.js:9001) | HOLD - note only. |
| Double-finish automated pin | Protection structural + ref-guarded, no dedicated test | QUEUE: cheap guard test, next test-writing pass. |

## What was implemented NOW (this landing)

Only the dead-end UI fix: SettingsHealthScreen no longer renders two
silent no-op switches; it states plainly that health-platform
connections are not available in this version, keeping the founder's
D107-1 hold honest on screen. Everything else waits for next week's
session per the founder's usage-limit order.
