# Progress Photos / Image Scoring — Audit and Blueprint Pack

Run date: 2026-07-08. Lead: Fable. Branch `claude/codebase-audit-docs-pv6mjd`, audited at commit
`0025e07281fd628a924f343ec66e0ea430a0d939`, clean tree (see `00-run-manifest.md`).

**Do not re-audit the repo for this topic. Use these saved docs.** Conversation memory does not
count as a source; these files do. Re-audit only if a critical contradiction with the working
tree is found, and then only the contradicted area.

## What this covers

Progress photos, Progress Scan, the Volyume Score (image scoring), photo capture/import,
pose/lighting/framing guidance, the scoring pipeline, confidence/quality/withhold logic, results
UI and history/comparison, storage/privacy/reliability/tests, and the FUTURE Coach/check-in
integration stance.

## What this does not cover

Whole-app, nutrition, onboarding, or training audits; generic product strategy; implementation
(no app code was changed in this run).

## Saved files

```
00-run-manifest.md                       branch/commit/status + run plan
phase-1-code-audit.md                    the synthesised current-state audit (verdict + risks)
phase-1-evidence-gaps.md                 what nobody may guess; founder/technical/safety questions
evidence/scout-01-current-system-map.md
evidence/scout-02-capture-input-quality.md
evidence/scout-03-scoring-code-pipeline.md
evidence/scout-04-confidence-withhold-repeatability.md
evidence/scout-05-results-ui-history-comparison.md
evidence/scout-06-storage-privacy-reliability-tests.md
evidence/scout-07-future-coach-integration-attachment-points.md
research/image-scoring-progress-photo-research.md   external evidence only, cited
blueprints/scoring-accuracy-and-validation-blueprint.md   GOVERNING document
blueprints/world-class-progress-photos-blueprint.md       product blueprint + launch top 10
blueprints/future-coach-checkin-integration-blueprint.md  future-only, guarded
blueprints/results-ui-and-copy-blueprint.md
blueprints/safety-privacy-blueprint.md                    word lists + exact copy + hardening
implementation/sonnet-wave-01-scoring-accuracy-foundation.md
implementation/sonnet-wave-02-capture-quality-confidence.md
implementation/sonnet-wave-03-results-history-trust.md
implementation/sonnet-wave-04-future-coach-checkin-integration.md
implementation/sonnet-wave-05-validation-privacy-tests.md
```

## Recommended read order

1. `phase-1-code-audit.md` (verdict, system map, risks)
2. `blueprints/scoring-accuracy-and-validation-blueprint.md` (what the score is allowed to be)
3. `blueprints/world-class-progress-photos-blueprint.md` (launch-critical top 10)
4. `blueprints/future-coach-checkin-integration-blueprint.md` (integration stance)
5. `blueprints/results-ui-and-copy-blueprint.md` + `blueprints/safety-privacy-blueprint.md`
6. `phase-1-evidence-gaps.md` (open questions) and the scout reports as reference depth

## Top findings

1. **The system is real and strong**: on-device MediaPipe/TFLite segmentation, a deterministic
   silhouette score, layered withhold gates, confidence tiers, bias flags, comparability gating,
   device-local guard-tested storage, and 60+ relevant test files. Verdict: strong but trust
   gaps remain.
2. **Biggest trust exposure**: a provisional linear body-fat regressor
   (`"status": "provisional_validation_pending"`) can shift the visible score by up to +20/-26
   points as an internal anchor, with no in-repo ground-truth validation.
3. **Overconfidence by omission**: the score renders as a bare integer; the computed uncertainty
   range is deliberately hidden and no test pins the confidence label's prominence.
4. **Input holes**: quick-add photos bypass all quality gating; an identical photo reused for
   two poses scores as MORE consistent.
5. **Contradiction reconciled**: the engine, targets, body-metrics log and check-ins are
   scan-free (guard-tested), but a display-only "Progress photo context" card on
   `CoachOutputScreen` is live and matches the founder-pre-approved
   `audit/progress-flagship/stage3-blueprint-approval-gate.md` design. Needs founder
   confirmation, plus suppression unification onto `usePhotoSuppression()`.
6. **Privacy hardening gaps** on Article 9 data: EXIF/GPS not verifiably stripped, no iOS
   backup exclusion, and account wipe deletes ALL users' photos on a shared device.
7. Coordination flag: this exact surface was under active edit by another agent ("Codex") on
   this branch as of 2026-07-08.

## Scoring-first launch-critical top 10

(Full detail: world-class blueprint §8.)
1. Anchor gating: clamp the provisional regressor's influence, reflect engagement in confidence.
2. Duplicate-content withhold across poses.
3. Confidence-tier rendered contract (what each tier may show, test-pinned).
4. Receipts on every scored/downgraded/withheld outcome.
5. Quick-add scoring firewall (unscored tag, never comparison material).
6. Suppression unification on the Coach card and profile tile.
7. EXIF strip on save + iOS backup exclusion.
8. Per-user wipe scope for progress photos.
9. finishScan re-entrancy guard + DST day-grouping tests.
10. Comparable-points-only trend view + recalibration note.

## Future Coach/check-in integration stance

Not linked to decisions or check-ins today; the display-only Coach card is the ceiling of
current integration pending founder confirmation. Future integration is permitted only after the
scoring waves land and Tier 1 validation holds; anything touching decision confidence requires
Tier 2 validation plus an explicit founder unlock. Photo/scan data must never directly or
indirectly change calories, macros, refeeds, diet breaks, or training; low-confidence and
withheld scans behave identically to absent; every scan surface states whether the scan was
used; nine guard tests are specified before any new surface work.

## Next Sonnet command

Run wave 1 first, AFTER the founder answers its F1 gate (anchor clamp option):

```
Read and implement .volyume-audit/progress-photos/implementation/sonnet-wave-01-scoring-accuracy-foundation.md
in full. Work from the source docs it lists. Do not use conversation memory.
```

Waves 2, 3, 5 may follow in any order after wave 1 (each has its own founder gates); wave 4
requires its blocking founder confirmation first.

## Reminder

Do not re-audit. Do not rebuild what Phase 1 marked "do not rebuild" (engine machinery, storage
design, capture aids, isolation pattern, neutral-compare contract). Every founder fork is marked
in the blueprints and wave docs; none may be silently pre-decided.
