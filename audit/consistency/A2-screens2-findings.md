# A2, screens slice 2, consistency / copy / professionalism findings

Slice (edit-ownership, exclusive): `src/screens/*.js` sorting after
`ImportScreen.js` through `ProgressPhotosScreen.js` inclusive (27 files;
`paywallExcerpts.js` sorts after the range and is excluded).

Files: LiftProgress, LogCardio, Login, ManualBuilder, MealNames, MealPlan,
MesocycleBuilder, Methodology, MyMeals, MyRecipes, NotificationSettings,
NutritionEducation, NutritionTargets, Partner, Paywall, PerDayTargets,
PlanDetail, PlanLibrary, PlanPreview, PlanUpdate, Plans, PrivacyPolicy,
ProGoalSetup, ProOnboarding, ProSetupComplete, ProUpgrade, ProgressPhotos.

Method: ripgrep sweep per safe-fix category, every hit verified against the
real line before any edit. Only the SAFE-FIX class applied; safety /
consent / coaching-voice lines flagged (see A2-screens2-decisions.md).

---

## 1. LANGUAGE

### 1a. Em dashes and en dashes (SAFE-FIX class 2): FIXED
Removed every em dash and en dash from the slice EXCEPT the one user-facing
energy-range line flagged in decisions (NutritionTargets:970). Replacements:
` [emdash] ` became `, `; a trailing line-continuation dash became `,`;
numeric ranges `N[endash]M` became `N to M`. 53 occurrences across 16 files.

- All but one were in **code comments** (JSDoc headers, `//`, block and JSX
  comments), which rule 2 explicitly includes. Lint only bans them in
  user-facing copy, but the shared standard says clear them thoroughly.
- One **user-facing** occurrence fixed (non-safety): `MealPlanScreen.js:244`
  appAlert body now reads `... This won't remove it, the planned meals are
  added alongside.`

Files changed by the dash pass (all comment-only unless noted):
LiftProgress, Login, ManualBuilder, MealPlan (plus one alert string),
Methodology, MyMeals, NutritionTargets (comments only; user-facing :970
left for founder), Partner, PerDayTargets, PlanPreview, PlanUpdate, Plans,
ProOnboarding, ProSetupComplete, ProUpgrade, ProgressPhotos.
Severity: minor. Fix-applied.

### 1b. UK English spelling: NO USER-FACING ISSUES FOUND
All `-ize/-yze/-or/-er` and related hits resolved to code, not copy:
`behavior` (React Native `KeyboardAvoidingView` prop, library API),
`center/centre` (style keys/identifiers), `result?.canceled`
(expo-image-picker result property at ProgressPhotos:103, library API),
`createProgramme`/`getProgrammeById` (identifiers). No quoted human-readable
string needed a spelling fix. British spellings already used in copy
(`programme` PrivacyPolicy:39, `personalisation`, `optimise`).
Comment-only US spellings (`enrollment` PlanDetail:25/342, `toward`
ProUpgrade:194) are out of safe-fix scope (rule 1 covers user-facing strings
only) and were left untouched. Severity: none.

### 1c. Brand name: CONSISTENT
Every user-facing `Volyume` is spelled and capitalised correctly
(NotificationSettings, NutritionEducation, PrivacyPolicy, NutritionTargets,
Partner). `@volyume_*` AsyncStorage keys and the `volyume-btn-*` testID are
identifiers and were left. No `VOLYUME`/`voylume`/`Voylume` in copy.
Severity: none.

### 1d. AI-speak / filler: NO USER-FACING ISSUES FOUND
`seamless`/`seamlessly`, `curated`, `leverage` appear only in comments
(MyRecipes:39, PlanDetail:211, PaywallScreen:146/194, ProOnboarding:512) or
as a data-prefix identifier (`'curated:'` foodRef in MealPlan). None in
user-facing copy. No gratuitous exclamation marks, no model/prompt
references. Severity: none.

## 2. VISUAL

### 2a. Hardcoded colour/size literals: NONE
No raw `#hex` or `rgba()` literals anywhere in the slice; all colour/spacing
reads go through `colors.*` / `spacing.*` / `type.*` tokens. Nothing to
convert. Severity: none.

### 2b. Smart punctuation / ellipsis: CLEAN
No curly quotes. Single-character ellipsis used correctly (placeholders,
"Waiting for Google or Apple"); no three-dot `...` in user copy. No double
spaces in copy. Severity: none.

## 3. PROFESSIONALISM

### 3a. Accessibility warnings (react-native-a11y): PRE-EXISTING, FLAGGED
`npx eslint` reports 20 `has-valid-accessibility-descriptors` warnings across
8 of my files (ManualBuilder x3, MyMeals x1, NutritionTargets x2, Plans x2,
ProOnboarding x12). These are **pre-existing**: my edits touched only
comments/one string and added no interactive elements. Each fix needs
per-element judgement (what the touchable does, matching neighbour rows),
some on safety-sensitive screens (NutritionTargets, ProOnboarding). Surfaced
as a founder decision rather than silently blanket-fixed (see decisions).
Severity: minor (0 eslint errors; warnings only).

### 3b. Dead taps / placeholder / TODO copy: NONE
No lorem/debug/placeholder user copy, no user-visible TODO/FIXME, no
obviously dead interactive rows in the slice.

---

## VERIFICATION
- `npx eslint` on the 16 changed files: **0 errors, 20 warnings**
  (all pre-existing a11y warnings, see 3a).
- `npx jest --runInBand` on all suites covering changed screens: **green**
  (22 suites / 162 tests, two batches). Tails in the return summary.
- No git commits (orchestrator commits).
