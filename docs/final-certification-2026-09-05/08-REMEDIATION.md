# 08 — Remediation record (by finding)

Each entry: what changed, where, how it is pinned. Rulings in
`07-FINDINGS.md`; evidence in `01`..`06`.

| Finding | Change | Files | Pinned by |
|---|---|---|---|
| F-01 / D152 | "How you train" -> "Injuries & limitations" on every row, title, step label and sentence; populated line names what is left out or counts injuries or limitations saved (restriction rows only) and says what the count is for; Home offer and intro claim exactly what the consumers do; onboarding skip collapsed to one "Not now"; plan card "suggests"; check-in save error is a fixed calm line | 39 src files, 30 test files, `summary.js` | `src/__tests__/capabilityVocabulary.d152.guard.test.js`, `capability/__tests__/summary.test.js` |
| F-02 | Widget roots carry the library's OPEN_APP click action | `src/widgets/widgets.js`, `widgetTaskHandler.js` | `src/widgets/__tests__/widgetClickAction.test.js` |
| F-03 | `partner/:code?` linking path to PartnerScreen | `RootNavigator.js` linking | `navigation/__tests__/linkingConfig.test.js` |
| F-04 | `active-workout` maps to Today, which rehydrates the live session | `RootNavigator.js` linking | same |
| F-05 | Save draft pops the Train stack; activation success uses the cross-tab helper and pops | `ManualBuilderScreen.js` | `screens/__tests__/ManualBuilderScreen.test.js` |
| F-06 | Nutrition targets honour returnToTab/returnToScreen on every exit | `NutritionTargetsScreen.js` | `screens/__tests__/NutritionTargetsScreen.returnTo.test.js` |
| F-07 | One cross-tab call replaces goBack + timer | `BlockReflectionScreen.js` | existing suite |
| F-09 | Word-start prefix tier, literal-before-fuzzy, tighter typo allowance with transposition cost 1; 16 garbled dumbbell aliases removed, Flat/Hamstring Curl aliases added; validator rule 16; metadata rederive key v5; Kettlebell chip; no-results copy | `exerciseFuzzySearch.js`, corpus families, `validate-corpus.mjs`, `seedExercises.js`, `ExercisePickerModal.js` | `lib/__tests__/exerciseSearch.staples.contract.test.js`, corpus guard |
| F-10 (P0) | Library copy passes group kind, round rest, selection reason, tags, split type, difficulty | `database.js` | `lib/__tests__/copyPlanFromLibrary.structure.test.js` |
| F-11 | Kettlebell increment snaps to the next real bell (4..48 kg ladder) in the live prescription; Kettlebell Minimal on the foundations pool | `livePrescription.js`, `seedRoutines.js` | `lib/__tests__/livePrescription.kettlebell.test.js`, `stylePlans.seedTags.test.js` |
| F-12 | Low-volume insight suppressed where excluded work exists; heatmap note | `insightsEngine.js`, `algorithms.js` (additive read), `VolumeHeatmapScreen.js` | `insightsEngine.test.js`, `algorithms.test.js`, `VolumeHeatmapScreen.test.js` |
| F-16 (2) | Two band library plans; seed key v16 | `seedRoutines.bandPlans.js`, `seedRoutines.js` | `lib/__tests__/seedRoutines.bandPlans.test.js` |
| F-19 | Methodology: never overrules a safety hold; outside Coached mode every change waits | `MethodologyScreen.js` | existing suite |
| Copy scan | "toward" -> "towards" (two) | `coachStory.js`, `capability/directory/injuries.js` | `coachStory.test.js` |

In flight (wave 2): F-13/F-17 circuit semantics; F-18 Today states; F-14
style/equipment-aware substitutes; F-15 + F-16 (1, 3) equipment routes and
Adjust-training disclosure.
