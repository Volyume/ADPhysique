# FULL APP PRODUCT MAP — HANDOVER COMPANION

**Deliverable:** `docs/_FULL-APP-PRODUCT-MAP.md` (15,150 lines).
**Repository commit inspected:** `9cdc5fc5` (content identical on `main` at
`e001a89e`), audit date 2026-08-09.
**Task class:** discovery/documentation ONLY. No product code, copy, tests,
schema or behaviour were intentionally changed; the only repository writes
are the two map documents and the taskboard campaign record.

## Methodology

Eight parallel read-only repository audits, each by a dedicated Opus read
agent with a bounded lane, an explicit evidence standard (LIVE /
LIVE-CONDITIONAL / INTERNAL / LEGACY-UNREACHABLE / PLANNED-DOCUMENTED-ONLY /
UNCERTAIN) and orders to record uncertainty rather than guess:

1. **A1** Navigation + all 83 screens (entry points, per-screen states,
   route audit).
2. **A2** Training system + adaptive mesocycle engine (tests read as
   first-class evidence; 31 decision rules, ~140 constants).
3. **B1** Nutrition engine + food domain (engine-first; ~55 rules,
   78 constants, 11 hard safety rules).
4. **B2** Every setting (96), onboarding, auth, consent, tier/payments
   (access-loss matrix over 25 surfaces).
5. **C1** Data model (21 entities, 56 local tables), sync (two tracks),
   offline, conflict, reinstall.
6. **C2** Notifications (23 categories), widgets, background, platform
   differences, partner system, sharing, accessibility, observability.
7. **D1** Progress/analytics (58 metrics), check-ins, coaching surfaces
   (42 cards), photos/scans, education (comprehension matrix).
8. **D2** Docs archaeology (400 files classified), intentional boundaries
   (42), legacy/dead code, terminology (19 collisions), test-revealed
   behaviour (38 statements), doc-vs-code contradictions (15).

The lead then wrote every cross-cutting part (1, 3, 11, 13, 14, 19, 21-24,
29-34) from the lane evidence plus direct session knowledge of the adaptive
engine, reconciled cross-lane conflicts (notably the migration-059 status),
ran the founder's QC term sweep (all terms covered), and commissioned a
fresh-eyes adversarial review against the assembled map with the founder's
16-point checklist; its factual findings were actioned in the map.

## Files/directories inspected

App entry + navigation (App.js, index.js, app.json, src/navigation),
all of src/screens (83 modules), src/components (95), src/store,
src/lib (~168 modules incl. food/, notifications/, partners/, payments/,
sync/, cardio/, consent/, coachOutput/, observability/, shareCard/,
telemetry/, widgets/, onboarding/, database/), src/widgets, modules/
(3 native modules), plugins/, supabase/ (128 migration files + README),
scripts/, .github/workflows, eas.json, package.json, eslint config,
docs/ (340 files classified) + root-level docs, and the test tree
(src/**/__tests__; ~290 source-level guard tests inventoried).

## Final inventory counts

See Part 32 of the map for the full table. Headlines: 83 screens / 116
route registrations / 9 navigators; 98 settings tabulated (93 live);
42 coaching cards (8 proposal, 5 automatic, 1 requires-confirmation,
2 manual-only, 26 informational); 23 notification categories plus the
server-side email loop; 6 widget/live surfaces (iOS set parked);
21 persisted entities (56 local tables; 22 registry + ~19 legacy synced,
~13 local-only); 58 progress metrics (14 dark, 12 decorative); 26 hard
safety rules; 42 recorded product boundaries; 15 doc-vs-code
contradictions; 84 recorded lane uncertainties.

## Uncertainties and unprovable areas

Every lane ends with its uncertainty list (74 total); Part 33 carries the
reconciliations and the twelve highest-stakes items (F-1..F-12), led by:
the cardio dead-tap (surface unreachable), the planned_muscle_volume
cross-device restore gap, the analytics opt-out preference apparently
riding pref sync against its own contract, and the dropped allergen
profile stamp. Items needing device/production verification rather than
code reading are marked as such. Nothing was resolved by guessing.

Notable resolution: migration 059 (numbered meal slots) is APPLIED in
production per the taskboard's live-schema sweep; the CLAUDE.md and
supabase/README "HELD" notes are stale documentation, not a live defect.
Migration 049 remains genuinely unapplied by design.

## Fresh-eyes review findings

The adversarial reviewer (fresh Opus agent, your 16-point brief, repo
access, most effort spent in the repository) returned **21 findings:
6 blockers, 8 defects, 5 gaps, 3 nits — all documentation corrections,
all actioned** in the map (full disposition: map Part 34 §K; the raw
findings file is preserved in the session scratchpad). The blockers:

1. Plate calculator described as LIVE in six places — it is
   LEGACY-UNREACHABLE (`calculatePlates` uncalled; dropped by D57).
2. Part 19 overstated the rapid-loss rule ("forces maintenance"); the
   code caps the deficit at 1.5%/week and the observed-rate path adds
   +125-300 kcal behind a four-part gate. Restated precisely.
3. Supersets/giant sets are shipped and test-pinned but were absent from
   the catalogue and listed as "do not build" (stale D14 note annotated
   as superseded by campaign item 21/D44).
4. Partner cap is free 1 / Pro 3, not "one partner".
5. The health-integration screen and its five settings are permanently
   dark (`isHealthAvailable()` always false) — reclassified.

Notable defects/gaps also fixed: five share-card types (session is the
default), "learned check-in hour" replaced with the real learned quantity
(habit-derived reminder weekdays), warm-up ramp is pull-only, workout
history loads 50 sessions maximum, SnapshotsScreen and RecapStory
uncertainties resolved, six Part 19 safety rules added (including SCOFF
≥ 2 as a third suppression input), the Your-data feature set and the
server-side lifecycle email loop added, two unmentioned lib modules
named, and internal counts corrected (84 lane uncertainties; 26 safety
rows; 98 settings tabulated / 93 live). Three review categories yielded
nothing after a genuine hunt: screens missing from A1 §5, sync/local
mislabelling, and Part 22 dependency omissions.

## Confirmation

No product code was intentionally changed during this audit. `git status`
was kept clean throughout except for the two deliverable documents and the
taskboard record; the working tree diff at delivery contains documentation
only.

## Suggested reading order for the next reviewer

1. Part 1 (executive model) then Part 30 (dependency map) — the shape.
2. Part 29 (truth table) — what the product can honestly claim today.
3. CHAPTER A2 Parts C-D — the adaptive engine, the product's core.
4. Part 19 (safety) + Part 21 (control vs automation) — the philosophy.
5. CHAPTER B2 §A (settings) + CHAPTER B1 — the Pro surface.
6. Part 33 — where reality is still uncertain before trusting any detail.
7. Part 3 + CHAPTER A1 as reference while assessing individual features.
