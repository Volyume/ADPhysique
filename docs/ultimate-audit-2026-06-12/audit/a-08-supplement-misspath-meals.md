# a-08 SUPPLEMENT — barcode miss-path, saved meals, recipes, totals surfaces
(Recovered from the first a-08 attempt's sub-agent, 2026-06-12. Code-verified,
file:line cited. The relaunched a-08 main audit cross-checks this ground;
disagreements get resolved by direct code read.)

## Headline findings
1. OFF write-back NEVER sends the label photo despite consent copy promising
   "the label photo and the macros you confirmed" (writeback.js:14-16 vs
   _postToOff:111-136; imageBase64 param accepted at :85 but unused).
   Privacy-positive behaviour, but a copy-vs-behaviour mismatch.
2. THREE inconsistent source-label vocabularies: SourceChip LABELS
   ("OCR"/"Custom"), FoodRow.SOURCE_LABEL ("Snapped"/"You"), and
   FoodDetailSheet's raw source.toUpperCase() inline chip — same source can
   render three different ways.
3. ScanBarcode miss uses navigation.replace (ScanBarcodeScreen.js:122-123) —
   one-way funnel; scanner unreachable by back once in ScanLabel/AddCustomFood.
4. ServingPicker effectively dead: not imported by the logging flows and does
   no g↔oz conversion despite doc claiming shared use.
5. Adherence-neutral tone CONSISTENTLY enforced across all totals surfaces —
   MacroRings bandColour() returns colors.primary always (:17-19) with the
   founder's ED-safety note (:10-16); kcal over/remaining is factual only.
   Strongest, cleanest part of the area.
6. AddCustomFood comment drift: :43-45 claims barcode persistence is a future
   phase but food.barcodeEan is already written (:99).
7. RecipeBuilder silently allows 0g ingredients (no validation).

## Tap counts (verified)
- Saved meal log: 2 (row -> confirm). MyMealsScreen.js:79-88,133.
- Recipe log: 1 (row, no confirm). MyRecipesScreen.js:71-86,111.
- Searched food add: 2 (result -> "Add to diary", qty prefilled).
  FoodDetailSheet.
- Barcode miss -> form: arrival choice 1 tap ("Type it in") or 3 taps via
  label-scan path (choice -> front capture -> nutrition capture).
- Entry edit: 1 tap; delete: swipe + 1 tap (EntryRow/SwipeableEntryRow).

## Barcode miss-chain detail (COMP-022)
- ScanLabelScreen: two-step on-device OCR (front-of-pack name, nutrition
  panel) via vision-camera + MLKit, degrades to manual. Arrival-choice
  overlay (:325-341) with online/offline copy branches (:329-335). Persistent
  "Type it in" escape during capture (:312-316); permission-denied (:186-211)
  and no-device (:213-230) fallbacks both offer manual entry; OCR-not-in-
  binary collapses to single "Type it in" (:318-320).
- ocrParser: per-100g anchor confidence (:144); amber fieldNeedsCheck clears
  on user edit (:110-115). ocr.js returns null on failure, never throws.
- Write-back fires from AddCustomFoodScreen.onSave with CONFIRMED values
  (:160-181), double-gated on consent (:166); reward toast "Saved. Next time
  this barcode scans instantly." (:180).
- writeback.js: consent default OFF; queueContribution hard-gates on consent
  + barcode (:88-89); 30s delayed flush, MAX_RETRIES 3, backoff [2s,8s,30s];
  consent-off drops queue (:145-148); failures never surface to user.
- OFF consent card on Diary: one-time eligibility (chain completed AND not
  dismissed AND consent off), today-only (DiaryScreen.js:201-210,557-571).
- Duplicate banner only catches source==='custom' dupes (AddCustomFood:72-80),
  not OFF/USDA cached rows; "Log that instead" replaces to FoodSearch.

## Saved meals / recipes detail
- MyMealsScreen: list/log/rename/delete; creation lives in diary multi-select
  "Save as meal". Empty-meal log silently allowed until post-apply toast.
  No in-screen Pro gating (must hold upstream).
- MyRecipesScreen + RecipeBuilder: FoodSearch pickMode:'recipe' round-trip
  (FoodSearchScreen.js:340-351 returns addedIngredient, no log); live macro
  preview; edit resolves via resolveFoodRef; delete copy preserves diary
  history.

## Totals surfaces
- MacroRings: neutral colour always; protein emphasised by weight only;
  count-up animation skipped under reduce-motion; a11y summary present.
- MacroBreakdownSheet: per-slot sums, read-only, no judgement language.
- FoodDetailSheet: 1-5000g validation; live macro pills with a11y live
  region; inline source chip (vocabulary inconsistency #2).
