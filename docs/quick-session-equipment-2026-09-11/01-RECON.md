# 01 — Recon: quick full-body session, equipment widening (lane R-A, Sonnet, read-only, 2026-09-11)

Verbatim report of the read-only recon lane. Evidence class: direct code and doc reads with file:line; nothing inferred from a constant without reading its consumer.

## 1. Equipment taxonomy

Raw `equipment` field, closed enum, `src/lib/exerciseCorpus/vocab.js:34-43`:
`EQUIPMENT = ['barbell','dumbbell','cable','machine','smith_machine','kettlebell','ez_bar','bodyweight','band','suspension','landmine','medicine_ball','sled','sandbag']`

Counts (grepped from the 16 family source files under `src/lib/exerciseCorpus/families/*.js`, 918 seedable rows; `carries.js`, `power.js`, `specialty.js` are documented 0-entry placeholders):

| equipment | count | file |
|---|---|---|
| bodyweight | 176 | bodyweight.js |
| barbell | 157 | barbell.js |
| dumbbell | 143 | dumbbell.js |
| cable | 118 | cable.js |
| machine | 107 | machine.js |
| band | 62 | band.js |
| kettlebell | 59 | kettlebell.js |
| suspension | 36 | suspension.js |
| landmine | 27 | landmine.js |
| smith_machine | 13 | smith.js |
| sandbag | 8 | sandbag.js |
| medicine_ball | 5 | medicine_ball.js |
| ez_bar | 4 | barbell.js (subset) |
| sled | 3 | sled.js |

Derived `equipmentCategory` (`src/lib/exerciseMetadata.js:54-96`, `deriveEquipmentCategory`): `barbell, dumbbell, cable, smith, kettlebell, ez_bar->barbell, bodyweight, suspension, band, landmine, sled, medicine_ball, sandbag, machine_selectorised, machine_plate_loaded, other`. Conditioning machines (`CONDITIONING_RE` :52) fall to `other` (:90); `other` rows are dropped from generation (`poolGenerator.js:176`).

Engine-consumed equipment PROFILES (`PROFILES_BY_CATEGORY`, `exerciseMetadata.js:102-126`), six values: `full_gym, barbell_plates, dumbbells_only, home_gym, machines_cables, bodyweight`. `deriveEquipmentProfiles` (:158-168) carve-outs: bodyweight isolation rows get all six profiles (`BW_LOADED_PROFILES` :136); two band names (`Band Lat Pulldown`, `Band Assisted Pull-Up`, :155) get four profiles under D10/D19.

## 2. Profiles as the engine uses them

Shape: one string `equipment`; each exercise carries an ARRAY of reachable profiles. Consumers: `planEngine.js:1339-1341` (`filterPool`), `planAutoGen.js:400-404` (`equipmentReachable`), `swapEngine.js:210-217,247-255` (fixed 2026-08-19 to compare profiles, not the raw column), `src/lib/exercise/candidateScope.js:56-61` (the closed set in JSDoc).

User-facing option sets differ per screen: `ProOnboardingScreen.js:213-230` eight values (six canonical plus `kettlebells`/`bands`, marked "do NOT generate", F-16 REVISED); `PlanUpdateScreen.js:68-75` six; `QuizScreen.js:44-48` three. The picker's own chips (`src/lib/exerciseDisplay.js:51-54`, eleven) filter raw `equipmentCategory`, not a profile.

Storage: `userProfile.equipment` lives in AsyncStorage via `saveLocalProfile` (`useAppStore.js:391-394`), not SQLite, not cloud-mirrored (`PROFILE_FIELDS_TRACKED` tracks `primaryEquipment`). `kettlebells`/`bands` never reach the engine as literals: `generationEquipmentFor` (`src/lib/startWithPlan.js:206-208`) maps them via `LIBRARY_KIT_BY_EQUIPMENT` (:192-195): kettlebells->home_gym, bands->bodyweight.

## 3. Single-session primitives

`poolGenerator.js:generatePoolFromLibrary(exercises)` (:172-198) turns a library array into `{ muscle: [entry] }`, entry `{n, sub, p, eq, difficulty, sfr, fatigue, equipmentCategory, secondary}` (`toPoolEntry` :113-135), taxonomy-agnostic. No pure function builds ONE session; `selectExercisesForMuscle` (`planEngine.js:1435`) needs landmarks and weekly-volume context; `generatePlan` (:3143) is whole-programme and persists.

## 4. The travel generator today (`src/lib/travelMode.js`)

Header (:1-9) claims bands; `getPool` (:128-144) branches only on `bodyweight`, `dumbbells`, `hotel_gym`, anything else silently gets bodyweight. Pools are hand-authored constants (:16-73, :76-122), disconnected from the corpus. `pickExercise` (:215-219) takes `candidates[0]`. `buildFullBodyTravel` (:234-246) covers eight muscles: chest, back, side_delts, biceps, triceps, quads, hamstrings, abs. `BuildWorkoutScreen.applyTravelMode` (:205-303): capability preflight, intent filter on the library, `generateTravelPlan(...)`, `plan.sessions[0]`, name matching against the filtered library then `all`, drop classification (capability vs preference) with two toast lines. The sheet's three ids (`bodyweight`/`dumbbells`/`hotel_gym`) share no constant with the engine's six profile ids.

## 5. Tests that pin it

`src/screens/__tests__/BuildWorkoutScreen.travelSheet.guard.test.js` (sheet JSX, neutrality, row position); `BuildWorkoutScreen.travelDrops.guard.test.js` (T1-23: `capabilityState` carried out of the try, exactly one `return null;` drop path, the two toast strings, `setExercises` before the toast); `src/lib/__tests__/capabilityPosture.w1.guard.test.js:62-68` (T1-21: `applyTravelMode` must call `capabilityPreflight` and `offerCapabilityPreflightChoice`); `whyThisTemplates.snapshot.test.js:11` incidental. No unit test of `travelMode.js` itself.

## 6. Preflight and intent filter

`capabilityPreflight(userId)` (`src/lib/capability/preflight.js:35-40`) returns `{proceed, state}`; `offerCapabilityPreflightChoice({onHold, onContinue})` (:46-55). `loadExerciseIntentState(userId, {...})` (`src/lib/exercise/intent.js:76`). `filterLibraryForGeneration(library, state)` (`src/lib/exercise/generation.js:148-191`) is pure, returns `{ library, droppedIds, droppedNames, dropped, reasonById, reasonByName }`, fails OPEN on a no-intent state (:157). `generationBlockReason` (:66-114) ranks capability reasons ahead of preference reasons.

## 7. Rulings on point

- `docs/final-certification-2026-09-05/07-FINDINGS.md:236-253` (F-16 REVISED): weekly generation is not ready for kettlebell-only or band-only; the honest route there is the library plan.
- `docs/final-certification-2026-09-05/04-TRAINING-STYLES.md:378-411`: measured; a kettlebell profile is either a bodyweight plan under a kettlebell label or leaves shoulders at zero sets; a band profile is byte-identical to bodyweight.
- D154 (`DECISIONS-2026-07-09.md:6391-6428`): no tier change; kettlebell inclusion is an equipment INVENTORY question; founder fork open for weekly plans.
- D10/D19 (`exerciseMetadata.js:139-156`): narrow named band exceptions.

## Gaps

1. No single-session assembly primitive for the real taxonomy. 2. Travel pools are hand-authored, three of six profiles, eight of seventeen muscles; `barbell_plates` and `machines_cables` unrepresented. 3. Sheet ids and engine ids share no constant. 4. Kettlebell and band inputs unmeasured for the single-session case. 5. D154's fork open. 6. `PlanUpdateScreen.js` never gained kettlebells/bands (six versus eight, unrelated to this task). 7. No unit test for `travelMode.js`.
