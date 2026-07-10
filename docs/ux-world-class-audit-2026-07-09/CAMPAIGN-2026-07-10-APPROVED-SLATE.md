# World-class campaign — approved slate (founder GO, 2026-07-10)

Founder confirmed **all scorecard improvement items EXCEPT #18 exercise
media and #22 rest-day notification** (both stay HELD). Source: the /10
scorecard `SCORECARD-2026-07-10.md`. This doc is the action spec for every
approved item — a fresh session builds from here. Two agents at a time,
lowest capable tier, leverage order. Each item: scope, files, constraints,
tests. Base = branch tip after Codex's AUD-01..07 fixes were merged.

## Standing constraints on ALL items (CLAUDE.md)
- Deterministic engine (planEngine/nutritionEngine/weeklyCoach) stays pure;
  no AI; identical outputs for identical inputs.
- ED-safety system untouchable: calorie floors, FFM floor, rapid-loss/
  max-safe-loss gates, Beat UK signposting, calm mode, ED-flag suppression;
  guardrails tier-blind. STOP-and-ask if a task nears any of it.
- Free/Pro gating binary and absolute. GDPR/Article 9 gate un-skippable.
- Cloud migrations written in-repo but applied MANUALLY by the founder only.
- Billing changes: written test plan + explicit founder proceed + feature
  branch (never straight to main; app-store-notifications auto-deploys).
- Additive/idempotent migrations; British English; no em dash in user copy;
  no attribution in commits. `npm run lint && npm test` reported per landing.
- Device checklist for every shipped change (physical Android, EAS build).

## Sequencing (two agents, leverage order)
Pair 1: **1 Coach-half polish** + **2 theming stage 4 (charts/Skia)**.
Pair 2: **2 theming stage 5 (retire restart prompts)** + **5 haptics pass**.
Pair 3: **6 dynamic-type pass** + **8 history/cardio theme migration**.
Pair 4: **13 photo gallery** + **14 keyboard-controller + zeego**.
Pair 5: **15 shared-element transitions + Android polish** + **16 MLKit scanner**.
Pair 6: **20 drag reorder** + **21 giant sets**.
Pair 7: **19 iOS Live Activity wiring** + **12 Android rest-timer actions**.
Pair 8: **4 dietary discoverability** + **17 small tails**.
Interleave the small single-file fixes (7, 9, 10, 11) into any pair with a
spare slot. **3 OFF micronutrients** and **23 Rive/font** are gated (below).

---

## READY-TO-BUILD ITEMS

### 1. Coach-half polish (TOP TARGET)
Live-theme + haptics + memoise the 5 Coach screens: CoachOutputScreen (3,281
lines, zero memo), WeeklyCheckInScreen, CoachReviewScreen, MethodologyScreen,
BlockReflectionScreen, plus CoachDailyBrief.js. None currently use useTheme
(static `colors` import) or haptics. Follow the EXACT batch-2/3 theming
pattern (frozen StyleSheet byte-identical; `const t=useTheme(); const live={...}`
appended after; module-scope colour maps -> build functions). Add the
existing haptics vocabulary on non-Button touchables (NOT on ED/weight
surfaces or the held-decision/lockout cards). Memoise heavy sub-trees.
CONSTRAINT: CoachOutput is ED-safety-adjacent (held-decision cards, ED
lockout/cleared blocks, autonomy-mode apply) — colour/type/haptic plumbing
ONLY, zero logic/copy change; the D16 autonomy-hold and photo-corroboration
render logic stays byte-identical. Guard tests updated mechanically.

### 2. Finish restart-free theming (stages 4-5)
Stage 4: migrate the Skia/chart surfaces (VolyumeChart, MacroRings, photo
compares) + any remaining components to live theme. Stage 5: once every
surface a toggle touches is live, RETIRE the promptRestartForA11y() alerts
in SettingsDisplayScreen for those toggles — be honest, only retire a
toggle whose full dependency set is genuinely live (a half-applied toggle
is worse than a restart prompt). Plan doc: CP-10-restart-free-theming-plan.md.

### 3. OFF micronutrients live (GATED on a founder action)
The OFF parsing is BUILT (landed earlier). To make it live: the founder runs
the `refresh-off-snapshot.yml` GitHub workflow (or a manual dispatch) to
regenerate the bundled snapshot with micronutrient columns, then applies
migrate_116 to Dublin. NO further build unless coverage comes back
unexpectedly low — then surface it. This is item 3 in the scorecard's target
list; its "build" is a founder ops action, not an agent task.

### 4. Dietary-needs discoverability
The "Dietary needs" row is buried in MealPlanScreen's collapsed
MealPreferencesControls accordion (defaults closed). Surface a visible
diet/allergen summary chip (e.g. "Vegetarian · 2 excluded") on the meal
builder's PRIMARY surface, tappable to the same SettingsDietary route, plus
a one-time pointer hint (@volyume_seen_* convention). Reads the same synced
profile fields (single source of truth). Founder-flagged item.

### 5. Haptics completion pass
Roll the existing `src/lib/haptics.js` vocabulary across the untouched
surfaces: food (FoodSearch, MyMeals, MyRecipes, NutritionTargets, FoodInsights,
diary interactions), Coach (folds into item 1), Paywall/ProUpgrade/Subscription,
Settings, VolyumeTabBar (tab press), ExercisePickerModal. EXCLUDE ED/weight/
wellbeing surfaces and billing-destructive actions. haptics.js stays the sole
expo-haptics importer (importBan test). Selection/commit vocabulary only.

### 6. Dynamic-type completion pass
`maxFontSizeMultiplier` currently in only 5 files. Add sensible font-scale
ceilings + large-text resilience across all screens so nothing overflows at
the largest system font. Extends the approved ability/ease emphasis. No copy
change; layout resilience only.

### 7. LiftProgress metric-switcher bug (small, single-file)
LiftProgressScreen: the headline numeral stays e1RM-based even when the user
selects Volume/heaviest/reps (line ~357-359,396), so a volume-shaped line
shows under an "est. max" label. Make the numeral track the selected metric.
Real confusion fix.

### 8. History + cardio theme migration
WorkoutHistoryScreen, LogCardioScreen, CardioHistoryScreen import static
`colors` only — stale colours on a mid-session theme flip. Migrate to
useTheme (batch-2/3 pattern). Folds conceptually into item 2.

### 9. Raw/cooked chip on the diary row (small)
weight_state (raw/cooked) only shows in the edit sheet; add a quiet inline
chip on EntryRow/MealSection so the basis is visible without opening the
entry. Data already present.

### 10. PR markers on the LiftProgress sparkline (small)
VolyumeChart's highlightIndices gold-ring marker is wired on ExerciseDetail
but not LiftProgress's row sparkline. Extend it (CP-5 residue).

### 11. TierComparisonStrip on Subscription (small)
Paywall/ProUpgrade show it; Subscription shows a bare Upgrade button to a
free/lapsed viewer. Add the comparison strip for consistency. Billing-
ADJACENT (display only, no purchase logic) — no test plan needed for pure
display, but keep proGate reads intact.

### 12. Android rest-timer notification actions
Skip / +15s directly from the rest-timer notification. Verify what exists in
the rest-timer-live / notifications layer first, build the gap. Android only.

### 13. Progress-photo gallery (D25)
Pinch-zoom + fluid swipe + before/after compare on ProgressPhotos. Prefer a
Reanimated hand-roll or react-native-awesome-gallery (lead decides at build
by product quality; D23 dependency discipline if a dep is added). Photos
stay on-device; suppression gates intact.

### 14. Keyboard-controller + zeego context menus (D25)
Adopt react-native-keyboard-controller (interactive dismiss + proper avoidance
across all typing surfaces) and zeego (native long-press context menus —
land first on logged sets: edit/delete/repeat, then diary/history rows).
D23 discipline: licence, health, lockfile in the same commit, register entry,
EAS flag. Note the sheet-input fix already routes sheet TextFields through
BottomSheetTextInput — keyboard-controller complements it outside sheets.

### 15. Shared-element transitions + Android polish (D25)
Reanimated shared-element transitions (exercise card->detail, photo grid->
viewer). Android polish: themed/monochrome icon, edge-to-edge, splash fade.

### 16. MLKit dedicated barcode scanner (D26)
A dedicated MLKit code-scanner frame processor on vision-camera for faster,
low-light-tolerant scanning. Complements the existing waterfall lookup.

### 17. Small tails (bundle)
- Dead MealSection callbacks (onSavedMeals/onScan/onQuickAdd passed but not
  in the signature) — remove.
- Stray hand-rolled Modals -> gorhom sheets where sensible (HomeBlockShapeSheet,
  HomeChangeWorkoutSheet, and the Modal usages in PlanLibrary/RoutineDetail/
  WorkoutSummary) — consistency, no behaviour change.
- Usuals one-tap chips re-homed into the add-food flow (diary follow-up).
- Per-meal subtotal chip assessed for the restored meal-card idiom.
- TalkBack sheet isolation: mark the host screen importantForAccessibility=
  no-hide-descendants while a sheet is open (flagged in the bottom-sheet
  adoption).
- Kala namak (black salt) tip on the vegan tofu scramble: keep as an
  educational tip or swap/drop (founder micro-call still open — surface it).
- Thumbhash pipeline proposal (from the image-polish agent) if the founder
  wants photo-grid placeholders — needs a schema column + vendored hashing;
  propose, do not build unprompted.

---

## HELD-ITEMS NOW UNHELD (founder GO 2026-07-10)

### 19. iOS Live Activity — rest timer on lock screen / Dynamic Island
The native module (modules/rest-timer-live) is BUILT; wire it. FOUNDER-SIDE
prerequisites: App Groups provisioning (group.app.volyume.widget already in
app.json) + a fresh EAS build. Build the JS wiring; flag the provisioning +
EAS as founder actions at landing.

### 20. Drag reorder
Replace chevron-only reorder with true drag in plans/builder/session
(exercises within a day, days within a plan, routine exercises). gesture-
handler + Reanimated already present (no new dep). Reuse the no-dep reorder
pattern already used for day-level plan reorder (routines.position).

### 21. Giant sets (3+)
Supersets are pairs-only (ManualBuilder caps at 2). Extend to 3+ exercise
giant sets in the builder and the active-session flow. Engine volume
attribution must stay correct (each exercise credits its own muscle).
ENGINE-ADJACENT: lead reviews the planEngine/logging diff.

### 23. Core-Haptics / Rive / brand font
- Core-Haptics (D21): react-native-haptic-feedback ALREADY ADOPTED (landed);
  the two iOS curves exist. Nothing further unless retuning after device feel.
- Rive: GATED on designed animation assets (founder-side or commissioned);
  library work may precede content. Do not start without assets.
- Brand font: lead prepares a shortlist of variable fonts -> founder taste
  pick, then adopt via expo-font. Bring the shortlist.

---

## STILL HELD (do NOT build)
- **#18 Exercise media** (video/images) — founder HOLD (not spending now).
- **#22 Rest-day notification** — founder HOLD (schedule-substrate question).
- Adversarial whole-diff review — SUPERSEDED by the external Codex audit
  (done; AUD-01..07 fixed by Codex on main). R1 already fixed in-tree.

## FOUNDER-SIDE (not agent work)
- #3 OFF micronutrients: run refresh-off-snapshot workflow + apply migrate_116.
- Apply supabase migrations 110-116 to EU-Dublin (manual).
- iOS Live Activity: App Groups provisioning + fresh EAS build.
- Play OAuth SHA-1 confirm.
- #24 Plan-F Tier-1/Tier-2 validation studies (external research, not code).
- Run the read-only weekly_checkins_v2 PK query (AUD-06 close-out) if desired.
- Codex's AUD fixes: any cloud migration Codex wrote is founder-applied.

## FOUNDER DECISION ROUNDS STILL OPEN
- #25 Watch-app scoping memo -> commission it, returns as a decision round.
- Kala namak tip (keep/swap/drop).
- Brand font shortlist pick.
- VC-1 residue / any light-theme sign-off if re-raised.
