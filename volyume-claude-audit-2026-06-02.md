# Volyume — Full Technical Audit

Date: 2026-06-02
Auditor: Claude Code (read-only audit session)
Repo: allansdouglas1983-cmyk/ADPhysique (Volyume), branch `main`
Scope: complete technical audit per the audit brief. Read-only. No code changed.

> Status: IN PROGRESS. This file is written incrementally. See the
> "Session progress log" at the bottom for the exact stopping point so a
> follow-up session can resume without re-doing completed work.

---

## PRE-WORK — File inventory

Counts are from `git ls-files` and `find`, run 2026-06-02.

- Total tracked files: **664**
  - `.js`: 411
  - `.md`: 140
  - `.sql`: 61
  - `.png`: 10
  - `.json`: 10
  - `.yml`: 6
  - `.ts`: 5
  - `.swift`: 4, `.html`: 4, `.kt`: 2, `.dat`: 2, plus single config/asset files.
- Top-level directories: `__mocks__/ assets/ docs/ modules/ plugins/ public/ scripts/ src/ supabase/ tests/`
- Config present: `package.json`, `tsconfig.json` (extends `expo/tsconfig.base`, empty compilerOptions), `eslint.config.js`, `babel.config.js`, `app.json`.

### `src/` breakdown (377 files, all `.js`)

| Count | Directory |
|---|---|
| 59 | src/screens |
| 41 | src/components |
| 55 | src/lib |
| 16 | src/lib/food |
| 13 | src/lib/notifications |
| 11 | src/lib/food (components: src/components/food) |
| 11 | src/lib/sync/tables |
| 8 | src/lib/sync |
| 5 | src/lib/payments |
| 4 | src/lib/telemetry |
| 1 each | src/navigation, src/store, src/styles, src/hooks, src/config |

- Test files under `src/`: **141** `*.test.js` (so ~236 non-test source files).
- Note: the source tree is JavaScript (JSX), not TypeScript. The 5 `.ts`
  files are outside `src/` (to be enumerated in Part 1.5). `tsconfig.json`
  has empty `compilerOptions` and extends `expo/tsconfig.base`. This affects
  Part 1.1 (tsc): a strict typecheck over a JS codebase will behave
  differently from a TS project; the actual `tsc` output is reported verbatim
  below rather than assumed.

---

## PART 1 — AUTOMATED ANALYSIS

### 1.1 TypeScript compilation (`tsc --noEmit --strict`)

VERIFIED by running the command. Result: **exit code 2, compilation never
runs.** Output verbatim:

```
tsconfig.json(2,3): error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
```

Context (verified):
- `npx tsc` resolves to **TypeScript 6.0.2** (no `typescript` in
  `package.json` dependencies; no `node_modules/.bin/tsc`). The project does
  not ship a TypeScript toolchain.
- The error originates from the inherited `expo/tsconfig.base`
  (`moduleResolution: node10`), which TS 6.0.2 rejects under default
  `ignoreDeprecations`.
- `package.json` scripts are: `start`, `android`, `ios`, `test` (jest),
  `lint` (`eslint .`), `lint:fix`. There is **no `typecheck` script.**
- The `src/` tree is 377 `.js` files (0 `.ts`). A `--strict` typecheck of a
  JS codebase requires `allowJs`/`checkJs` which are not set.

CONCLUSION: a strict TypeScript typecheck is **not configured and cannot run
as-is**. This is recorded as an Improvement finding (ISSUE-IMP, Part 6), not
a per-line type-error list, because no type-checking occurs. The prompt's
"report every tsc error" yields exactly the one config error above.

### 1.2 ESLint (`eslint .`, project flat config `eslint.config.js`)

VERIFIED by running the command. Result: **exit code 0** —
**777 problems (0 errors, 777 warnings).**

Rule breakdown (verified via grep over the captured output):
- `no-unused-vars`: **728** warnings
- `react-hooks/exhaustive-deps`: **49** warnings

No error-level lint problems exist. Full raw output (1158 lines) is in
Section 5. Per-file breakdown and notable cases are enumerated in Part 2 /
Part 5; the headline is that the 728 unused-vars warnings are the dominant
signal and overlap with Part 1.5 (dead code).

### 1.3 Dependency audit (`npm audit`)

VERIFIED by running the command. Result: **exit code 1** —
**32 vulnerabilities: 18 high, 13 moderate, 1 low, 0 critical**
(JSON metadata confirmed: `{"low":1,"moderate":13,"high":18,"critical":0,"total":32}`).

Distinct advisories (verified from full output, reproduced in Section 5):

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `xlsx` (`^0.18.5`, **devDependency**) | High | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9) | **No fix available** |
| `tar` (`<=7.5.10`) | High | 6 advisories: hardlink/symlink path traversal, arbitrary file write, APFS race | `audit fix --force` → expo@56 (breaking) |
| `@xmldom/xmldom` (`<=0.8.12`) | High | 5 advisories: XML injection / DoS | `audit fix --force` → expo@56 (breaking) |
| `fast-xml-parser` (`<5.7.0`) | Moderate | XML comment/CDATA injection | `audit fix --force` → react-native@0.85 (breaking) |
| `postcss` (`<8.5.10`) | Moderate | XSS via unescaped `</style>` | `audit fix --force` → expo@56 (breaking) |
| `send` (`<0.19.0`) | (unlabelled in report) | template injection → XSS | expo@56 (breaking) |
| `uuid` (`<11.1.1`) | Moderate | missing buffer bounds check v3/v5/v6 | expo@56 (breaking) |

ASSESSMENT (verified by reading `package.json` and tracing usage — a CORRECTION
of an earlier draft claim that wrongly called `xlsx` a runtime dependency):
- **`xlsx` is a `devDependency` (`^0.18.5`), not a runtime dependency.** Its only
  usage is `scripts/seed/buildCofidSnapshot.js:34` (`XLSX = require('xlsx')`),
  an offline build-time script that downloads the McCance & Widdowson food
  dataset (a UK government `.xlsx`) and converts it to a seed snapshot. It is
  **never imported by `src/` and never shipped in the app bundle.** Verified:
  `grep xlsx` across `src/` (non-test) returns nothing; the only hits are
  `package.json` (devDependencies) and the seed script. So the high-severity
  prototype-pollution/ReDoS is **dev-time only**, running locally against a
  trusted source. Real-world user risk: negligible. Still worth pinning or
  replacing the seed script's parser, but not a shipped-app vulnerability.
- **All 32 advisories are dev/build-time, none in runtime app code.** They are
  transitive through Expo / React-Native build + CLI tooling (`@expo/cli`,
  `@expo/config*`, `@react-native-community/cli*`, `expo-updates`, `jest-expo`,
  `xcode`, `cacache`, `tar`, `postcss`, `send`, `@xmldom/xmldom`,
  `fast-xml-parser`, `uuid`) plus the `xlsx` dev seed script. Their only fixes
  are breaking `expo@56` / `react-native@0.85` upgrades. Under the locked
  release policy (no new closed-test build until the project is built out) these
  are deferred-by-policy, but must be recorded. Net security exposure to end
  users from `npm audit`: **none identified in shipped code.**


### 1.4 Unused dependencies

VERIFIED via a Python cross-reference of all 50 `dependencies` against
import/require specifiers across `src/` + root JS. Of 50, three had no JS
import. Each was then manually verified and **all three are legitimately used
in a non-import way** — so there are **no confidently-removable unused
dependencies**:

- `expo-build-properties` — used in `app.json` plugins (line 112) for Android
  SDK levels and Health Connect manifest queries. Config-time, no JS import by
  design. NOT unused.
- `react-native-screens` — no direct import, but a required peer dependency of
  `@react-navigation/stack` and `@react-navigation/bottom-tabs`. NOT removable.
- `expo-font` — no direct import, no `useFonts`/`Font.loadAsync`, no `app.json`
  fonts entry. It backs `@expo/vector-icons` (icon font loading). Low
  confidence it is independently needed; flagged for a maintainer check, not
  asserted as unused.

(Method note: an earlier shell-regex pass produced a false "everything is
unused" result due to a quoting bug; that result was discarded and the Python
fixed-string pass above is the verified one. `devDependencies` were not
import-cross-referenced as they are tooling.)


### 1.5 Dead code detection

Two layers, both VERIFIED by tooling:

**(a) File-local unused identifiers** — ESLint `no-unused-vars` already
flags **728** of these (unused imports / locals / args). Full list is the
ESLint raw output in Section 5. These are intra-file and individually cited
there with file:line:rule.

**(b) Cross-module unused exports** — a Python scan of all 849 named exports
under `src/` (excluding `__tests__`) found **88** exported
identifiers with **no `\bname\b` reference in any other source or root
file (tests included)**. Method: regex word-boundary search across the full
corpus; an export is flagged only when zero other files mention the name, so
dynamic `require('..').name` access is still detected. CAVEAT: a few may be
used *within their own defining module* (the scan only checks other files);
confirm no intra-file use before removing. Sample of 8 (insertCustomExercise,
createMesocycle, getActiveInsights, getCustomExercisesForUser, setActivePlan,
duplicateRoutine, lbsToKg, getExerciseSubstitutes) was manually grep-verified
to have 0 external references.

Full flagged list, grouped by file:

- `src/components/BrandMark.js`
  - `BrandTag`
  - `VolyumeWordmark`
- `src/components/Illustrations.js`
  - `EmptyPRsIllustration`
- `src/components/ProGate.js`
  - `ProLocked`
- `src/components/food/FoodRow.js`
  - `servingGrams`
- `src/lib/algorithms.js`
  - `getExerciseSubstitutes`
  - `getVolumeConfidence`
- `src/lib/coachingGoals.js`
  - `shouldShowGoalLockOnboarding`
- `src/lib/database.js`
  - `BACKUP_TABLES`
  - `copyRoutineFromLibrary`
  - `createMesocycle`
  - `deleteCustomExercise`
  - `deleteExerciseUserNote`
  - `deleteOrphanedRoutines`
  - `duplicateRoutine`
  - `generateInitialPlannedVolume`
  - `generateMesocycleWeeks`
  - `getActiveInsights`
  - `getAdaptiveLandmarkHistory`
  - `getAllExercisesForUser`
  - `getAllRoutines`
  - `getCustomExerciseById`
  - `getCustomExercisesForUser`
  - `getExerciseStimulusRatings`
  - `getExercisesByMuscle`
  - `getLiveRecipeIngredientsForRecipe`
  - `getMesocycleWeeks`
  - `getOrphanedRoutines`
  - `getPreviousWorkoutSets`
  - `getRecentEdPatternFlags`
  - `insertCustomExercise`
  - `persistInsights`
  - `setActivePlan`
  - `softDeleteRecipeIngredient`
  - `updateCustomExercise`
  - `updateProgrammeName`
  - `updateRoutineName`
- `src/lib/errorLog.js`
  - `VERBOSE_LOGGING`
- `src/lib/food/csvExport.js`
  - `buildFoodLookup`
- `src/lib/food/db.js`
  - `getCustomFoodById`
  - `getFoodPreference`
- `src/lib/haptics.js`
  - `prAchieved`
  - `restAlmostDone`
  - `restDone`
  - `warmupLogged`
  - `workoutComplete`
- `src/lib/health.js`
  - `getLastImportMs`
  - `readLatestWeight`
  - `readWeightsSince`
  - `setLastImportMs`
- `src/lib/notifications/preferences.js`
  - `ensureTable`
- `src/lib/notifications/trainingReminders.js`
  - `ensureTrainingReminderChannel`
- `src/lib/nutritionEngine.js`
  - `GAIN_RATE_TARGETS`
- `src/lib/observability.js`
  - `detectCrashedLastSession`
  - `getLastCrashMeta`
  - `installShutdownHandler`
  - `recordCrashMeta`
  - `setCurrentScreen`
  - `uninstallShutdownHandler`
- `src/lib/payments/playBilling.js`
  - `_resetForTests`
  - `currentAppUserID`
  - `getCustomerInfo`
  - `injectProvider`
  - `isInitialised`
  - `isReal`
  - `logOut`
- `src/lib/poolGenerator.js`
  - `isHypertrophyExercise`
- `src/lib/restSound.js`
  - `unloadRestBeeps`
- `src/lib/sentry.js`
  - `isSentryAvailable`
- `src/lib/stepsLaunchPrompt.js`
  - `markStepsPromptShown`
  - `wasStepsPromptShown`
- `src/lib/strengthStandards.js`
  - `STRENGTH_TIERS`
- `src/lib/supabase.js`
  - `getCurrentUser`
  - `getUserProfile`
  - `isSupabaseConfigured`
  - `upsertUserProfile`
- `src/lib/sync.js`
  - `syncExercises`
- `src/lib/syncQueue.js`
  - `clearQueueForUser`
  - `getQueueStats`
- `src/lib/travelMode.js`
  - `TRAVEL_EQUIPMENT_OPTIONS`
- `src/lib/units.js`
  - `bodyWeightUnitLabel`
  - `kgToStoneLbs`
  - `lbsToKg`
  - `usesImperialHeight`
- `src/lib/weeklyCoach.js`
  - `assessDataConfidence`
  - `computeWeeklyTrendPct`
  - `getLatestEwma`
- `src/lib/whyThisTemplates.js`
  - `ED_SUPPORT_LINKS`

Notable cluster: a large part of `src/lib/database.js`'s public API is
unreferenced (custom-exercise CRUD: insertCustomExercise / updateCustomExercise
/ deleteCustomExercise / getCustomExercisesForUser / getCustomExerciseById /
getAllExercisesForUser; mesocycle + routine management: createMesocycle /
generateMesocycleWeeks / getMesocycleWeeks / duplicateRoutine / updateRoutineName
/ getAllRoutines / setActivePlan; insights: persistInsights / getActiveInsights).
This is either genuinely dead code or a feature wired through a different path;
each needs per-item confirmation (intra-module use) before deletion.


---
## SECTION 5 — AUTOMATED ANALYSIS RAW OUTPUT

### 5.1 tsc --noEmit --strict (verbatim)
```
tsconfig.json(2,3): error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
```

### 5.2 npm audit (verbatim)
```
# npm audit report

@xmldom/xmldom  <=0.8.12
Severity: high
xmldom: XML injection via unsafe CDATA serialization allows attacker-controlled markup insertion - https://github.com/advisories/GHSA-wh4c-j3r5-mjhp
xmldom: Uncontrolled recursion in XML serialization leads to DoS - https://github.com/advisories/GHSA-2v35-w6hq-6mfw
xmldom has XML injection through unvalidated DocumentType serialization - https://github.com/advisories/GHSA-f6ww-3ggp-fr8h
xmldom has XML node injection through unvalidated processing instruction serialization - https://github.com/advisories/GHSA-x6wf-f3px-wcqx
xmldom has XML node injection through unvalidated comment serialization - https://github.com/advisories/GHSA-j759-j44w-7fr8
fix available via `npm audit fix --force`
Will install expo@56.0.8, which is a breaking change
node_modules/@xmldom/xmldom
  @expo/plist  <=0.0.1-canary-20240418-8d74597 || 0.0.14 - 0.2.2
  Depends on vulnerable versions of @xmldom/xmldom
  node_modules/@expo/plist
    @expo/config-plugins  *
    Depends on vulnerable versions of @expo/plist
    Depends on vulnerable versions of xcode
    node_modules/@expo/config-plugins
    node_modules/react-native-health/node_modules/@expo/config-plugins
      @expo/cli  <=0.0.0-canary-20231123-1b19f96-4 || 0.0.1-canary-20231125-d600e44 - 55.0.0-canary-20260223-05214f1 || 55.0.13-canary-20260424-7bedc9d - 55.0.13-canary-20260429-a5e59cf || 55.0.20-canary-20260327-0789fbc - 55.0.20-canary-20260402-9da566b || 56.0.0-canary-20260128-67ce8d5 - 56.0.2
      Depends on vulnerable versions of @expo/config
      Depends on vulnerable versions of @expo/config-plugins
      Depends on vulnerable versions of @expo/metro-config
      Depends on vulnerable versions of @expo/plist
      Depends on vulnerable versions of @expo/prebuild-config
      Depends on vulnerable versions of @expo/rudder-sdk-node
      Depends on vulnerable versions of cacache
      Depends on vulnerable versions of send
      Depends on vulnerable versions of tar
      node_modules/@expo/cli
        expo  46.0.0-alpha.0 - 55.0.24 || 56.0.0-canary-20260212-4f61309 - 56.0.0-preview.13
        Depends on vulnerable versions of @expo/cli
        Depends on vulnerable versions of @expo/config
        Depends on vulnerable versions of @expo/config-plugins
        Depends on vulnerable versions of @expo/metro-config
        Depends on vulnerable versions of expo-asset
        node_modules/expo
      @expo/config  <=0.0.1-canary-20240418-8d74597 || 5.0.9 - 11.0.0-canary-20250404-87e2506 || 11.0.6-canary-20250428-4156f88
      Depends on vulnerable versions of @expo/config-plugins
      node_modules/@expo/config
        @expo/metro-config  <=0.0.1-canary-20240418-8d74597 || 0.1.84 - 55.0.21 || 56.0.0-canary-20260212-4f61309 - 56.0.5
        Depends on vulnerable versions of @expo/config
        Depends on vulnerable versions of postcss
        node_modules/@expo/metro-config
        expo-constants  <=0.0.1-canary-20240418-8d74597 || 12.0.0 - 17.0.8 || 18.0.0-canary-20250219-4a5dade - 18.0.0-canary-20250404-87e2506 || 18.0.14-canary-20260119-17896bf - 18.1.0-canary-20260113-4879b86
        Depends on vulnerable versions of @expo/config
        node_modules/expo-constants
          expo-asset  <=0.0.1-canary-20240418-8d74597 || 8.6.1 - 11.1.0-canary-20250207-8bc5146 || 11.2.0-canary-20250612-338ef55 - 12.0.0-canary-20250404-87e2506
          Depends on vulnerable versions of expo-constants
          node_modules/expo-asset
          expo-notifications  <=0.0.1-canary-20240418-8d74597 || 0.13.0 - 0.29.15-canary-20250404-87e2506 || 0.31.4-canary-20250611-f0afe80 - 0.31.4-canary-20250613-b29d676-2 || 1.0.0-canary-20240814-ce0f7d5 - 1.0.0-canary-20260113-4879b86
          Depends on vulnerable versions of expo-constants
          node_modules/expo-notifications
        expo-manifests  <=0.0.1-canary-20240418-8d74597 || 0.9.0 - 0.15.9-canary-20250404-87e2506 || 0.17.0-canary-20250701-6a945c5 - 1.0.0-canary-20241021-c4b5a93
        Depends on vulnerable versions of @expo/config
        node_modules/expo-manifests
          expo-updates  <=0.0.1-canary-20240418-8d74597 || 0.10.0 - 0.27.5 || 0.29.0-canary-20250701-6a945c5 - 1.0.0-canary-20250404-87e2506 || 29.1.0-canary-20250919-7a31b96 - 29.1.0-canary-20260113-4879b86
          Depends on vulnerable versions of @expo/config
          Depends on vulnerable versions of @expo/config-plugins
          Depends on vulnerable versions of expo-manifests
          node_modules/expo-updates
        jest-expo  43.0.0-beta.0 - 53.0.0-preview.3 || 55.0.0-canary-20250912-b5ce2a8 - 55.0.0-canary-20260114-2d3b650
        Depends on vulnerable versions of @expo/config
        node_modules/jest-expo
      @expo/prebuild-config  <=0.0.1-canary-20240418-8d74597 || 2.1.0 - 8.0.31 || 8.2.0 - 9.0.0-canary-20250404-87e2506
      Depends on vulnerable versions of @expo/config
      Depends on vulnerable versions of @expo/config-plugins
      node_modules/@expo/prebuild-config
      react-native-health  >=1.13.1
      Depends on vulnerable versions of @expo/config-plugins
      node_modules/react-native-health

fast-xml-parser  <5.7.0
Severity: moderate
fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters - https://github.com/advisories/GHSA-gh4j-gqv2-49f6
fix available via `npm audit fix --force`
Will install react-native@0.85.3, which is a breaking change
node_modules/fast-xml-parser
  @react-native-community/cli-platform-android  12.0.0-alpha.0 - 15.1.0
  Depends on vulnerable versions of fast-xml-parser
  node_modules/@react-native-community/cli-platform-android
    @react-native-community/cli-doctor  12.0.0-alpha.0 - 20.1.1
    Depends on vulnerable versions of @react-native-community/cli-platform-android
    Depends on vulnerable versions of @react-native-community/cli-platform-apple
    Depends on vulnerable versions of @react-native-community/cli-platform-ios
    node_modules/@react-native-community/cli-doctor
      @react-native-community/cli  12.0.0-alpha.0 - 15.1.0
      Depends on vulnerable versions of @react-native-community/cli-doctor
      Depends on vulnerable versions of @react-native-community/cli-hermes
      node_modules/@react-native-community/cli
    @react-native-community/cli-hermes  >=12.0.0-alpha.0
    Depends on vulnerable versions of @react-native-community/cli-platform-android
    node_modules/@react-native-community/cli-hermes
    react-native  0.73.0-nightly-20230506-1af868c52 - 0.76.0-rc.6 || >=0.86.0-nightly-20260304-7f1a1e6c9
    Depends on vulnerable versions of @react-native-community/cli
    Depends on vulnerable versions of @react-native-community/cli-platform-android
    Depends on vulnerable versions of @react-native-community/cli-platform-ios
    node_modules/react-native
  @react-native-community/cli-platform-apple  <=20.1.1
  Depends on vulnerable versions of fast-xml-parser
  node_modules/@react-native-community/cli-platform-apple
    @react-native-community/cli-platform-ios  13.2.0 - 20.1.1
    Depends on vulnerable versions of @react-native-community/cli-platform-apple
    node_modules/@react-native-community/cli-platform-ios

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install expo@56.0.8, which is a breaking change
node_modules/postcss

send  <0.19.0
send vulnerable to template injection that can lead to XSS - https://github.com/advisories/GHSA-m6fv-jmcg-4jfg
fix available via `npm audit fix --force`
Will install expo@56.0.8, which is a breaking change
node_modules/send

tar  <=7.5.10
Severity: high
node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal - https://github.com/advisories/GHSA-34x7-hfp2-rc4v
node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization - https://github.com/advisories/GHSA-8qq5-rm4j-mr97
Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction - https://github.com/advisories/GHSA-83g3-92jg-28cx
tar has Hardlink Path Traversal via Drive-Relative Linkpath - https://github.com/advisories/GHSA-qffp-2rhf-9h96
node-tar Symlink Path Traversal via Drive-Relative Linkpath - https://github.com/advisories/GHSA-9ppj-qmqm-q256
Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS - https://github.com/advisories/GHSA-r6q2-hw4h-h46w
fix available via `npm audit fix --force`
Will install expo@56.0.8, which is a breaking change
node_modules/tar
  cacache  14.0.0 - 18.0.4
  Depends on vulnerable versions of tar
  node_modules/cacache

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install expo@56.0.8, which is a breaking change
node_modules/uuid
node_modules/xcode/node_modules/uuid
  @expo/bunyan  >=3.0.0
  Depends on vulnerable versions of uuid
  node_modules/@expo/bunyan
    @expo/rudder-sdk-node  *
    Depends on vulnerable versions of @expo/bunyan
    Depends on vulnerable versions of uuid
    node_modules/@expo/rudder-sdk-node
  xcode  >=0.9.2
  Depends on vulnerable versions of uuid
  node_modules/xcode

xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
No fix available
node_modules/xlsx

32 vulnerabilities (1 low, 13 moderate, 18 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.
```

### 5.3 ESLint full output (verbatim, 777 warnings)
```

/home/user/ADPhysique/App.js
   88:55  warning  '_' is defined but never used  no-unused-vars
  141:12  warning  '_' is defined but never used  no-unused-vars
  157:14  warning  '_' is defined but never used  no-unused-vars
  178:16  warning  '_' is defined but never used  no-unused-vars
  293:16  warning  '_' is defined but never used  no-unused-vars
  385:14  warning  '_' is defined but never used  no-unused-vars
  416:16  warning  '_' is defined but never used  no-unused-vars
  455:16  warning  '_' is defined but never used  no-unused-vars
  491:20  warning  '_' is defined but never used  no-unused-vars
  552:20  warning  '_' is defined but never used  no-unused-vars
  574:20  warning  '_' is defined but never used  no-unused-vars
  588:20  warning  '_' is defined but never used  no-unused-vars
  590:16  warning  '_' is defined but never used  no-unused-vars
  610:18  warning  '_' is defined but never used  no-unused-vars
  661:16  warning  '_' is defined but never used  no-unused-vars
  680:14  warning  '_' is defined but never used  no-unused-vars
  781:30  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/__tests__/coaching-simulation.test.js
   41:3   warning  'evaluateAutoReg' is assigned a value but never used. Allowed unused vars must match /^_/u         no-unused-vars
   43:3   warning  'getCurrentMesoWeek' is assigned a value but never used. Allowed unused vars must match /^_/u      no-unused-vars
   45:3   warning  'buildWeeklyProgression' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
   47:19  warning  'calculate1RM' is assigned a value but never used. Allowed unused vars must match /^_/u            no-unused-vars
   47:33  warning  'calculateTonnage' is assigned a value but never used. Allowed unused vars must match /^_/u        no-unused-vars
  391:17  warning  'k' is assigned a value but never used. Allowed unused vars must match /^_/u                       no-unused-vars

/home/user/ADPhysique/src/__tests__/error-and-feedback-pipeline.test.js
  489:14  warning  'e' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/__tests__/screen-mount.test.js
   372:28  warning  'rest' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
   414:63  warning  '_' is defined but never used                                           no-unused-vars
   420:65  warning  '_' is defined but never used                                           no-unused-vars
  1081:76  warning  '_' is defined but never used                                           no-unused-vars
  1467:76  warning  '_' is defined but never used                                           no-unused-vars
  1507:78  warning  '_' is defined but never used                                           no-unused-vars
  1648:76  warning  '_' is defined but never used                                           no-unused-vars
  1890:76  warning  '_' is defined but never used                                           no-unused-vars

/home/user/ADPhysique/src/components/AnimatedEntrance.js
  19:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  42:12  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/BackHeader.js
  20:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  37:48  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/BlockProgressCard.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/BodyDiagramHeatmap.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/BottomSheet.js
  16:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/BrandMark.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u   no-unused-vars
  13:10  warning  '_' is defined but never used                                             no-unused-vars
  33:42  warning  'color' is defined but never used. Allowed unused args must match /^_/u   no-unused-vars
  33:49  warning  'accent' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
  53:42  warning  'color' is defined but never used. Allowed unused args must match /^_/u   no-unused-vars
  53:49  warning  'accent' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Button.js
  19:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  20:16  warning  'View' is defined but never used. Allowed unused vars must match /^_/u   no-unused-vars

/home/user/ADPhysique/src/components/Card.js
  16:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Chip.js
  11:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/DifferentialBadge.js
  13:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u          no-unused-vars
  20:3  warning  'pricingWindow' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/EmptyState.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/EngineLog.js
  11:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  67:14  warning  '_' is defined but never used                                            no-unused-vars
  75:14  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/ExerciseCard.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/FatigueTrendCard.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/FeedbackSheet.js
   27:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                  no-unused-vars
   86:14  warning  '_' is defined but never used                                                                                            no-unused-vars
  106:20  warning  '_' is defined but never used                                                                                            no-unused-vars
  112:61  warning  '_' is defined but never used                                                                                            no-unused-vars
  147:48  warning  '_' is defined but never used                                                                                            no-unused-vars
  150:7   warning  React Hook useImperativeHandle has a missing dependency: 'animateOut'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  217:91  warning  '_' is defined but never used                                                                                            no-unused-vars
  221:14  warning  '_' is defined but never used                                                                                            no-unused-vars
  270:62  warning  '_' is defined but never used                                                                                            no-unused-vars

/home/user/ADPhysique/src/components/GradientCard.js
  14:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Illustrations.js
  14:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/InfoTooltip.js
  1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  4:28  warning  'fontWeight' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/OptionCard.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/PRCelebration.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  89:56  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/PeekMenu.js
  32:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                         no-unused-vars
  52:95  warning  '_' is defined but never used                                                                                                   no-unused-vars
  56:7   warning  React Hook useImperativeHandle has a missing dependency: 'animateOut'. Either include it or remove the dependency array         react-hooks/exhaustive-deps
  88:6   warning  React Hook useEffect has missing dependencies: 'backdrop' and 'translateY'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  94:40  warning  '_' is defined but never used                                                                                                   no-unused-vars

/home/user/ADPhysique/src/components/PlateCalculator.js
  1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  2:63  warning  'ScrollView' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/PressableCard.js
  18:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  19:31  warning  'View' is defined but never used. Allowed unused vars must match /^_/u   no-unused-vars

/home/user/ADPhysique/src/components/ProGate.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/ProgressSections.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/ReadinessCards.js
   12:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  124:14  warning  '_' is defined but never used                                            no-unused-vars
  130:16  warning  '_' is defined but never used                                            no-unused-vars
  134:16  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/RestTimer.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  67:50  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/ScreenHeader.js
  20:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/SearchBar.js
  13:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/SegmentedControl.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/SetEntry.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u        no-unused-vars
  6:8  warning  'InfoTooltip' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Skeleton.js
  18:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Sparkline.js
  15:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Stepper.js
  13:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/StepsCard.js
  23:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  48:14  warning  '_' is defined but never used                                            no-unused-vars
  53:14  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/TierComparisonStrip.js
  15:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/Toast.js
   27:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  132:43  warning  '_' is defined but never used                                            no-unused-vars
  176:62  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/VolumeBars.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/WhatsNewSheet.js
  22:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  57:16  warning  '_' is defined but never used                                            no-unused-vars
  63:63  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/__tests__/animatedEntrance.test.js
  5:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/__tests__/bottomsheet.test.js
  5:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/__tests__/inputs.test.js
  6:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  7:10  warning  'Text' is defined but never used. Allowed unused vars must match /^_/u   no-unused-vars

/home/user/ADPhysique/src/components/__tests__/primitives.test.js
  4:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/__tests__/selectionControls.test.js
  6:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/__tests__/whatsNewSheet.test.js
  7:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/auth/EmailPasswordFields.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/auth/OAuthButtons.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/auth/__tests__/authForm.test.js
  6:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/EmptyDiary.js
  11:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/EntryRow.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/FoodDetailSheet.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  78:14  warning  'e' is defined but never used                                            no-unused-vars
  94:48  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/food/FoodRow.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/HeldDecisionCard.js
  12:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/MacroBreakdownSheet.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/MacroRings.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/MealSection.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/QuickAddSheet.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  58:14  warning  'e' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/components/food/ServingPicker.js
  12:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/SourceChip.js
  12:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/__tests__/MacroRings.test.js
  9:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/components/food/__tests__/foodComponents.test.js
  11:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/hooks/useProgressData.js
   92:49  warning  React Hook useCallback has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  137:48  warning  'exMap' is defined but never used. Allowed unused args must match /^_/u                                    no-unused-vars
  167:14  warning  '_' is defined but never used                                                                              no-unused-vars
  174:14  warning  '_' is defined but never used                                                                              no-unused-vars
  185:14  warning  '_' is defined but never used                                                                              no-unused-vars
  195:14  warning  '_' is defined but never used                                                                              no-unused-vars
  261:14  warning  '_' is defined but never used                                                                              no-unused-vars
  338:14  warning  '_' is defined but never used                                                                              no-unused-vars
  384:14  warning  '_' is defined but never used                                                                              no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/coachingGoals.test.js
  27:17  warning  'goal' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/insightsEngine.test.js
  8:7  warning  'WEEK' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/mesocycle.test.js
  10:3  warning  'getVolumeTargetsForWeek' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  13:3  warning  'predictDeloadWeek' is defined but never used. Allowed unused vars must match /^_/u        no-unused-vars
  20:7  warning  'WEEK' is assigned a value but never used. Allowed unused vars must match /^_/u            no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/navigation.test.js
  43:13  warning  'lines' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/planEngine.test.js
  31:17  warning  'key' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/planengineFullVerification.test.js
   97:23  warning  'goal' is defined but never used. Allowed unused args must match /^_/u            no-unused-vars
  135:9   warning  'sweep' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/__tests__/weeklyCoach.ffmFloor.test.js
  14:7  warning  'baseProfile' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/accessibilityPrefs.js
  11:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/activitySteps.js
   29:12  warning  '_' is defined but never used  no-unused-vars
   44:12  warning  '_' is defined but never used  no-unused-vars
   66:12  warning  '_' is defined but never used  no-unused-vars
   82:12  warning  '_' is defined but never used  no-unused-vars
   98:12  warning  '_' is defined but never used  no-unused-vars
  117:12  warning  '_' is defined but never used  no-unused-vars
  140:12  warning  '_' is defined but never used  no-unused-vars
  163:12  warning  '_' is defined but never used  no-unused-vars
  167:52  warning  '_' is defined but never used  no-unused-vars
  172:14  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/algorithms.js
  114:16  warning  '_' is defined but never used                                                      no-unused-vars
  997:54  warning  'repMin' is assigned a value but never used. Allowed unused args must match /^_/u  no-unused-vars
  997:66  warning  'repMax' is assigned a value but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/blockAdvisor.js
  156:9  warning  'experience' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  232:9  warning  'firstName' is assigned a value but never used. Allowed unused vars must match /^_/u   no-unused-vars
  233:9  warning  'experience' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/coachingGoals.js
  293:14  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/cyclePrefs.js
  23:12  warning  '_' is defined but never used  no-unused-vars
  31:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/dailyNarrative.js
  121:14  warning  '_' is defined but never used  no-unused-vars
  132:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/dataBackup.js
  102:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/database.js
    18:12  warning  '_' is defined but never used   no-unused-vars
  1162:12  warning  '_' is defined but never used   no-unused-vars
  1725:14  warning  '_' is defined but never used   no-unused-vars
  1900:12  warning  '_' is defined but never used   no-unused-vars
  1931:51  warning  '_' is defined but never used   no-unused-vars
  2040:12  warning  '_' is defined but never used   no-unused-vars
  2094:12  warning  '_' is defined but never used   no-unused-vars
  2430:12  warning  '_' is defined but never used   no-unused-vars
  2510:12  warning  '_e' is defined but never used  no-unused-vars
  2545:12  warning  '_e' is defined but never used  no-unused-vars
  2609:12  warning  '_e' is defined but never used  no-unused-vars
  2627:12  warning  '_e' is defined but never used  no-unused-vars
  2641:12  warning  '_e' is defined but never used  no-unused-vars
  2661:12  warning  '_e' is defined but never used  no-unused-vars
  2688:12  warning  '_e' is defined but never used  no-unused-vars
  2706:12  warning  '_e' is defined but never used  no-unused-vars
  2760:14  warning  '_' is defined but never used   no-unused-vars
  3314:12  warning  '_' is defined but never used   no-unused-vars
  3319:14  warning  '_' is defined but never used   no-unused-vars
  3424:12  warning  '_e' is defined but never used  no-unused-vars
  3471:12  warning  '_' is defined but never used   no-unused-vars
  3674:12  warning  '_' is defined but never used   no-unused-vars
  4132:12  warning  '_' is defined but never used   no-unused-vars
  4140:12  warning  '_' is defined but never used   no-unused-vars
  4148:12  warning  '_' is defined but never used   no-unused-vars
  4168:12  warning  '_' is defined but never used   no-unused-vars
  4188:12  warning  '_' is defined but never used   no-unused-vars
  5100:12  warning  '_e' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/errorLog.js
   94:10   warning  '_' is defined but never used  no-unused-vars
  138:14   warning  '_' is defined but never used  no-unused-vars
  153:12   warning  '_' is defined but never used  no-unused-vars
  169:46   warning  '_' is defined but never used  no-unused-vars
  184:122  warning  '_' is defined but never used  no-unused-vars
  195:104  warning  '_' is defined but never used  no-unused-vars
  215:105  warning  '_' is defined but never used  no-unused-vars
  219:97   warning  '_' is defined but never used  no-unused-vars
  230:58   warning  '_' is defined but never used  no-unused-vars
  259:12   warning  '_' is defined but never used  no-unused-vars
  263:64   warning  '_' is defined but never used  no-unused-vars
  289:54   warning  '_' is defined but never used  no-unused-vars
  306:12   warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/feedback.js
   31:3   warning  'getSessionId' is defined but never used. Allowed unused vars must match /^_/u      no-unused-vars
   31:17  warning  'setCurrentUserId' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   58:12  warning  '_' is defined but never used                                                       no-unused-vars
   76:12  warning  '_' is defined but never used                                                       no-unused-vars
  107:14  warning  '_' is defined but never used                                                       no-unused-vars
  144:74  warning  '_' is defined but never used                                                       no-unused-vars
  171:12  warning  '_' is defined but never used                                                       no-unused-vars
  224:16  warning  '_' is defined but never used                                                       no-unused-vars
  237:12  warning  '_' is defined but never used                                                       no-unused-vars

/home/user/ADPhysique/src/lib/food/csvExport.js
  73:14  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/food/db.js
    68:12  warning  '_' is defined but never used  no-unused-vars
  1106:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/food/frequents.js
  28:12  warning  '_' is defined but never used  no-unused-vars
  36:94  warning  '_' is defined but never used  no-unused-vars
  37:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/food/libraryDelta.js
   59:14  warning  '_' is defined but never used       no-unused-vars
   83:12  warning  '_' is defined but never used       no-unused-vars
  178:18  warning  'rowErr' is defined but never used  no-unused-vars
  186:53  warning  '_' is defined but never used       no-unused-vars
  217:12  warning  '_' is defined but never used       no-unused-vars

/home/user/ADPhysique/src/lib/food/ocr.js
  36:10  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/food/seed.js
  139:12  warning  '_' is defined but never used       no-unused-vars
  201:20  warning  'rowErr' is defined but never used  no-unused-vars
  210:57  warning  '_' is defined but never used       no-unused-vars

/home/user/ADPhysique/src/lib/haptics.js
  21:10  warning  '_' is defined but never used  no-unused-vars
  26:52  warning  '_' is defined but never used  no-unused-vars
  31:57  warning  '_' is defined but never used  no-unused-vars
  36:50  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/health.js
   39:12   warning  '_' is defined but never used   no-unused-vars
   48:12   warning  '_' is defined but never used   no-unused-vars
  168:18   warning  '_' is defined but never used   no-unused-vars
  216:14   warning  '_' is defined but never used   no-unused-vars
  257:12   warning  '_' is defined but never used   no-unused-vars
  258:63   warning  '__' is defined but never used  no-unused-vars
  260:61   warning  '_' is defined but never used   no-unused-vars
  282:12   warning  '_' is defined but never used   no-unused-vars
  299:12   warning  '_' is defined but never used   no-unused-vars
  300:65   warning  '__' is defined but never used  no-unused-vars
  358:14   warning  '_' is defined but never used   no-unused-vars
  404:14   warning  '_' is defined but never used   no-unused-vars
  414:16   warning  '_' is defined but never used   no-unused-vars
  506:14   warning  '_' is defined but never used   no-unused-vars
  524:12   warning  '_' is defined but never used   no-unused-vars
  530:10   warning  '_' is defined but never used   no-unused-vars
  560:12   warning  '_' is defined but never used   no-unused-vars
  576:14   warning  '_' is defined but never used   no-unused-vars
  580:117  warning  '__' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/importExternal.js
  406:51  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/mesocycle.js
  182:9  warning  'avgJoint' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/notifications/activeWorkout.js
   56:12  warning  '_' is defined but never used  no-unused-vars
   78:12  warning  '_' is defined but never used  no-unused-vars
  147:16  warning  '_' is defined but never used  no-unused-vars
  170:12  warning  '_' is defined but never used  no-unused-vars
  185:56  warning  '_' is defined but never used  no-unused-vars
  189:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/notifications/handler.js
  31:16  warning  '_' is defined but never used  no-unused-vars
  53:12  warning  '_' is defined but never used  no-unused-vars
  69:12  warning  '_' is defined but never used  no-unused-vars
  84:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/notifications/listeners.js
  67:14  warning  '_' is defined but never used  no-unused-vars
  70:39  warning  '_' is defined but never used  no-unused-vars
  81:14  warning  '_' is defined but never used  no-unused-vars
  98:37  warning  '_' is defined but never used  no-unused-vars
  99:38  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/notifications/preferences.js
  104:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/notifications/trainingReminders.js
  172:14  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/nutritionEngine.js
  459:58  warning  'weightKg' is defined but never used. Allowed unused args must match /^_/u                      no-unused-vars
  514:5   warning  'targetRateKgPerWeek' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/observability.js
   77:12  warning  '_' is defined but never used  no-unused-vars
  156:12  warning  '_' is defined but never used  no-unused-vars
  183:12  warning  '_' is defined but never used  no-unused-vars
  188:42  warning  '_' is defined but never used  no-unused-vars
  196:12  warning  '_' is defined but never used  no-unused-vars
  206:12  warning  '_' is defined but never used  no-unused-vars
  406:74  warning  '_' is defined but never used  no-unused-vars
  438:14  warning  '_' is defined but never used  no-unused-vars
  616:12  warning  '_' is defined but never used  no-unused-vars
  622:42  warning  '_' is defined but never used  no-unused-vars
  649:12  warning  '_' is defined but never used  no-unused-vars
  672:12  warning  '_' is defined but never used  no-unused-vars
  678:37  warning  '_' is defined but never used  no-unused-vars
  719:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/payments/cascade.js
  101:12  warning  '_' is defined but never used  no-unused-vars
  118:16  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/payments/playBilling.js
   67:12  warning  '_' is defined but never used  no-unused-vars
   77:12  warning  '_' is defined but never used  no-unused-vars
  165:18  warning  '_' is defined but never used  no-unused-vars
  198:53  warning  '_' is defined but never used  no-unused-vars
  199:50  warning  '_' is defined but never used  no-unused-vars
  202:51  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/planAutoGen.js
   46:12   warning  '_' is defined but never used  no-unused-vars
  113:151  warning  '_' is defined but never used  no-unused-vars
  123:12   warning  '_' is defined but never used  no-unused-vars
  130:104  warning  '_' is defined but never used  no-unused-vars
  139:12   warning  '_' is defined but never used  no-unused-vars
  183:16   warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/planEngine.js
     7:70   warning  'GOALS_WITH_WEAK_POINTS' is defined but never used. Allowed unused vars must match /^_/u         no-unused-vars
   689:7    warning  'totalSec' is assigned a value but never used. Allowed unused vars must match /^_/u              no-unused-vars
   723:46   warning  'landmarks' is defined but never used. Allowed unused args must match /^_/u                      no-unused-vars
   877:10   warning  'pickAt' is defined but never used. Allowed unused vars must match /^_/u                         no-unused-vars
  1106:12   warning  '_' is defined but never used                                                                    no-unused-vars
  1764:79   warning  'sessionLengthMinutes' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  1764:101  warning  'daysPerWeek' is assigned a value but never used. Allowed unused vars must match /^_/u           no-unused-vars
  1772:9    warning  'avgSets' is assigned a value but never used. Allowed unused vars must match /^_/u               no-unused-vars
  1775:9    warning  'avgEx' is assigned a value but never used. Allowed unused vars must match /^_/u                 no-unused-vars
  2032:5    warning  'trainingAge' is assigned a value but never used. Allowed unused vars must match /^_/u           no-unused-vars

/home/user/ADPhysique/src/lib/restSound.js
   23:50  warning  '_' is defined but never used  no-unused-vars
   24:58  warning  '_' is defined but never used  no-unused-vars
  112:14  warning  '_' is defined but never used  no-unused-vars
  125:14  warning  '_' is defined but never used  no-unused-vars
  138:16  warning  '_' is defined but never used  no-unused-vars
  162:14  warning  '_' is defined but never used  no-unused-vars
  186:47  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/seedExercises.js
  2:27  warning  'insertExercise' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/sentry.js
   26:10  warning  '_' is defined but never used  no-unused-vars
   90:16  warning  '_' is defined but never used  no-unused-vars
   94:16  warning  '_' is defined but never used  no-unused-vars
   98:12  warning  '_' is defined but never used  no-unused-vars
  122:12  warning  '_' is defined but never used  no-unused-vars
  147:12  warning  '_' is defined but never used  no-unused-vars
  168:12  warning  '_' is defined but never used  no-unused-vars
  185:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/stepsLaunchPrompt.js
   23:10  warning  'Platform' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   62:12  warning  '_' is defined but never used                                               no-unused-vars
   71:12  warning  '_' is defined but never used                                               no-unused-vars
  134:22  warning  '_' is defined but never used                                               no-unused-vars
  140:12  warning  '_' is defined but never used                                               no-unused-vars

/home/user/ADPhysique/src/lib/supabase.js
    9:64  warning  '_' is defined but never used   no-unused-vars
   12:64  warning  '_' is defined but never used   no-unused-vars
   15:60  warning  '_' is defined but never used   no-unused-vars
   47:14  warning  '_' is defined but never used   no-unused-vars
   50:12  warning  '_e' is defined but never used  no-unused-vars
  145:16  warning  '_' is defined but never used   no-unused-vars

/home/user/ADPhysique/src/lib/sync.js
    65:10  warning  'timeToMs' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   274:14  warning  '_' is defined but never used                                               no-unused-vars
   411:14  warning  '_' is defined but never used                                               no-unused-vars
   446:14  warning  '_' is defined but never used                                               no-unused-vars
   482:14  warning  '_' is defined but never used                                               no-unused-vars
   526:14  warning  '_' is defined but never used                                               no-unused-vars
  1058:99  warning  '_' is defined but never used                                               no-unused-vars
  1530:58  warning  '_' is defined but never used                                               no-unused-vars

/home/user/ADPhysique/src/lib/sync/__tests__/sync.regressionMatrix.test.js
  107:24  warning  'getRegistryEntry' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/sync/runner.js
   85:18  warning  '_' is defined but never used  no-unused-vars
  224:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/sync/tables/bodyComposition.js
  42:67  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/sync/tables/foodDomain.js
  276:73  warning  '_' is defined but never used  no-unused-vars
  331:61  warning  '_' is defined but never used  no-unused-vars
  342:67  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/sync/tables/profiles.js
  48:12  warning  '_' is defined but never used  no-unused-vars
  61:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/sync/telemetry.js
  38:12  warning  '_' is defined but never used  no-unused-vars
  71:12  warning  '_' is defined but never used  no-unused-vars
  85:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/sync/transport.js
  19:10  warning  'logSyncError' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/syncQueue.js
  209:12  warning  '_' is defined but never used  no-unused-vars
  223:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/telemetry/sentryBridge.js
  16:12  warning  '_' is defined but never used  no-unused-vars
  33:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/telemetry/transport.js
  82:62  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/travelMode.js
  234:49  warning  'sessionLengthMins' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
  248:51  warning  'sessionLengthMins' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
  266:44  warning  'sessionLengthMins' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/uuid.js
  32:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/lib/weeklyCoach.js
  306:5  warning  'lastCalAdjustmentDirection' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/lib/wellbeing.js
  23:12  warning  '_' is defined but never used  no-unused-vars
  31:12  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/navigation/RootNavigator.js
     1:8    warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                           no-unused-vars
     7:16   warning  'Text' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                            no-unused-vars
   509:100  warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   551:24   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   570:24   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   576:18   warning  '_e' is defined but never used                                                                                                                                                                                    no-unused-vars
   592:18   warning  '_e' is defined but never used                                                                                                                                                                                    no-unused-vars
   609:18   warning  '_e' is defined but never used                                                                                                                                                                                    no-unused-vars
   637:155  warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   646:20   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   653:20   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   696:22   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   708:142  warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   713:139  warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   763:111  warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   797:86   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   828:26   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   829:24   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
   863:14   warning  '_e' is defined but never used                                                                                                                                                                                    no-unused-vars
   866:6    warning  React Hook useEffect has missing dependencies: 'checkFirstRun', 'checkTier', 'refreshTierFromCloud', 'setAuthLoading', 'setSession', and 'setUser'. Either include them or remove the dependency array            react-hooks/exhaustive-deps
   939:18   warning  '_' is defined but never used                                                                                                                                                                                     no-unused-vars
  1024:6    warning  React Hook useEffect has missing dependencies: 'accentScaleX', 'heroOpacity', 'heroScale', 'heroY', 'reduceMotion', 'tagOpacity', 'wordOpacity', and 'wordY'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/ActiveWorkoutScreen.js
     1:46   warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                no-unused-vars
    28:228  warning  'saveExerciseUserNote' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                       no-unused-vars
    28:304  warning  'updateWorkoutSetPostRating' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                 no-unused-vars
    47:10   warning  'estimateWorkoutMinutes' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                     no-unused-vars
    52:7    warning  'SET_TYPE_DISPLAY' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                  no-unused-vars
   125:59   warning  'route' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                                                                      no-unused-vars
   195:10   warning  'progression' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                       no-unused-vars
   207:10   warning  'weeklyPlan' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                        no-unused-vars
   208:10   warning  'weeklyActual' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                      no-unused-vars
   211:10   warning  'exerciseNote' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                      no-unused-vars
   351:104  warning  '_' is defined but never used                                                                                                                                                                                                                                                                no-unused-vars
   365:6    warning  React Hook useEffect has a missing dependency: 'handleCancelWorkout'. Either include it or remove the dependency array                                                                                                                                                                       react-hooks/exhaustive-deps
   377:6    warning  React Hook useEffect has a missing dependency: 'lastActivityAt'. Either include it or remove the dependency array                                                                                                                                                                            react-hooks/exhaustive-deps
   431:6    warning  React Hook useEffect has a missing dependency: 'infoPulseAnim'. Either include it or remove the dependency array                                                                                                                                                                             react-hooks/exhaustive-deps
   454:45   warning  '_' is defined but never used                                                                                                                                                                                                                                                                no-unused-vars
   525:6    warning  React Hook useEffect has a missing dependency: 'loggedSets'. Either include it or remove the dependency array                                                                                                                                                                                react-hooks/exhaustive-deps
   715:16   warning  '_e' is defined but never used                                                                                                                                                                                                                                                               no-unused-vars
   720:6    warning  React Hook useEffect has missing dependencies: 'activeWorkout', 'exercise', 'routineExercise?.recommendedRepsMax', 'routineExercise?.recommendedRepsMin', 'routineExercise?.startingWeight', 'units', 'user.id', and 'workoutExercises'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
   734:6    warning  React Hook useEffect has missing dependencies: 'currentSet', 'routineExercise?.recommendedRepsMax', 'routineExercise?.recommendedRepsMin', and 'units'. Either include them or remove the dependency array                                                                                   react-hooks/exhaustive-deps
  1025:11   warning  'trimmedNames' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                      no-unused-vars
  1104:24   warning  '_' is defined but never used                                                                                                                                                                                                                                                                no-unused-vars
  1107:112  warning  '_' is defined but never used                                                                                                                                                                                                                                                                no-unused-vars
  1298:64   warning  '_e' is defined but never used                                                                                                                                                                                                                                                               no-unused-vars
  2150:14   warning  '_e' is defined but never used                                                                                                                                                                                                                                                               no-unused-vars

/home/user/ADPhysique/src/screens/AddCustomFoodScreen.js
   10:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  112:18  warning  '_' is defined but never used                                            no-unused-vars
  131:14  warning  'err' is defined but never used                                          no-unused-vars

/home/user/ADPhysique/src/screens/AnalyticsScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  294:33  warning  'units' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/Article9ConsentScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  80:18  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/BlockReflectionScreen.js
   1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                         no-unused-vars
  88:6  warning  React Hook useEffect has missing dependencies: 'mesocycleId' and 'user.id'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/BodyMetricsScreen.js
    1:8    warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                                              no-unused-vars
    3:80   warning  'FlatList' is defined but never used. Allowed unused vars must match /^_/u                                                                                           no-unused-vars
   20:12   warning  '_' is defined but never used                                                                                                                                        no-unused-vars
  122:38   warning  'units' is defined but never used. Allowed unused args must match /^_/u                                                                                              no-unused-vars
  324:45   warning  'navigation' is defined but never used. Allowed unused args must match /^_/u                                                                                         no-unused-vars
  385:6    warning  React Hook useEffect has a missing dependency: 'selectedMeasurement'. Either include it or remove the dependency array                                               react-hooks/exhaustive-deps
  403:8    warning  React Hook useCallback has a missing dependency: 'tier'. Either include it or remove the dependency array                                                            react-hooks/exhaustive-deps
  414:6    warning  React Hook useEffect has missing dependencies: 'loadHistory', 'loadRecentIntake', and 'migrateFromAsyncStorage'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  446:133  warning  '_' is defined but never used                                                                                                                                        no-unused-vars
  457:129  warning  '_' is defined but never used                                                                                                                                        no-unused-vars
  480:140  warning  '_' is defined but never used                                                                                                                                        no-unused-vars
  483:132  warning  '_' is defined but never used                                                                                                                                        no-unused-vars
  500:14   warning  '_e' is defined but never used                                                                                                                                       no-unused-vars
  507:14   warning  '_e' is defined but never used                                                                                                                                       no-unused-vars
  515:14   warning  '_e' is defined but never used                                                                                                                                       no-unused-vars
  588:16   warning  'e' is defined but never used                                                                                                                                        no-unused-vars

/home/user/ADPhysique/src/screens/BuildWorkoutScreen.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/CascadeGateScreen.js
   22:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                     no-unused-vars
  126:6  warning  React Hook useCallback has missing dependencies: 'toast' and 'variant'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  148:6  warning  React Hook useCallback has a missing dependency: 'variant'. Either include it or remove the dependency array                react-hooks/exhaustive-deps
  163:6  warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array                  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/CoachHeldHistoryScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                     no-unused-vars
  78:50  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u                                no-unused-vars
  98:6   warning  React Hook useEffect has a missing dependency: 'user.id'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/CoachOutputScreen.js
     1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                     no-unused-vars
     3:57  warning  'ActivityIndicator' is defined but never used. Allowed unused vars must match /^_/u                                                         no-unused-vars
    71:7   warning  'TRAINING_SIGNAL_LABEL' is assigned a value but never used. Allowed unused vars must match /^_/u                                            no-unused-vars
    79:32  warning  'checkin' is defined but never used. Allowed unused args must match /^_/u                                                                   no-unused-vars
   175:10  warning  'AdherenceNote' is defined but never used. Allowed unused vars must match /^_/u                                                             no-unused-vars
   511:10  warning  'ConfidencePill' is defined but never used. Allowed unused vars must match /^_/u                                                            no-unused-vars
   593:77  warning  '_' is defined but never used                                                                                                               no-unused-vars
   597:60  warning  '_' is defined but never used                                                                                                               no-unused-vars
   659:10  warning  'AmberAlertCard' is defined but never used. Allowed unused vars must match /^_/u                                                            no-unused-vars
   715:10  warning  'adaptiveTDEE' is assigned a value but never used. Allowed unused vars must match /^_/u                                                     no-unused-vars
  1138:16  warning  '_e' is defined but never used                                                                                                              no-unused-vars
  1181:6   warning  React Hook useEffect has missing dependencies: 'units', 'userProfile', and 'weekStart'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  1234:5   warning  'dietBreakNote' is assigned a value but never used. Allowed unused vars must match /^_/u                                                    no-unused-vars
  1240:5   warning  'adherenceNote' is assigned a value but never used. Allowed unused vars must match /^_/u                                                    no-unused-vars
  1241:5   warning  'confidence' is assigned a value but never used. Allowed unused vars must match /^_/u                                                       no-unused-vars

/home/user/ADPhysique/src/screens/CoachReviewScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                      no-unused-vars
    8:64  warning  'getAutoRegSuggestion' is defined but never used. Allowed unused vars must match /^_/u                       no-unused-vars
  176:10  warning  'StatusDot' is defined but never used. Allowed unused vars must match /^_/u                                  no-unused-vars
  242:6   warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  346:14  warning  '_e' is defined but never used                                                                               no-unused-vars
  523:27  warning  'isUnder' is assigned a value but never used. Allowed unused vars must match /^_/u                           no-unused-vars

/home/user/ADPhysique/src/screens/CoachingRemindersScreen.js
   15:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
   17:57  warning  'Alert' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  114:51  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
  139:16  warning  '_' is defined but never used                                                 no-unused-vars
  148:16  warning  '_' is defined but never used                                                 no-unused-vars
  153:16  warning  '_' is defined but never used                                                 no-unused-vars
  184:16  warning  'e' is defined but never used                                                 no-unused-vars

/home/user/ADPhysique/src/screens/ConsistencyScreen.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/CreditsScreen.js
  18:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  20:3   warning  'View' is defined but never used. Allowed unused vars must match /^_/u        no-unused-vars
  31:41  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/DebugLogScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  16:42  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars
  50:12  warning  '_' is defined but never used                                                 no-unused-vars

/home/user/ADPhysique/src/screens/DiaryScreen.js
   12:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                     no-unused-vars
   26:3   warning  'recomputeRollup' is defined but never used. Allowed unused vars must match /^_/u                           no-unused-vars
  110:16  warning  '_' is defined but never used                                                                               no-unused-vars
  281:6   warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  322:14  warning  '_' is defined but never used                                                                               no-unused-vars
  325:6   warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  366:92  warning  '_' is defined but never used                                                                               no-unused-vars
  393:22  warning  '_' is defined but never used                                                                               no-unused-vars
  441:6   warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/ExerciseDetailScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                      no-unused-vars
   80:6   warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  142:16  warning  '_' is defined but never used                                                                                no-unused-vars
  535:39  warning  'i' is defined but never used. Allowed unused args must match /^_/u                                          no-unused-vars

/home/user/ADPhysique/src/screens/ExerciseLibraryScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                           no-unused-vars
   67:6   warning  React Hook useEffect has a missing dependency: 'loadExercises'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
   82:12  warning  'toggleSecondaryMuscle' is defined but never used. Allowed unused vars must match /^_/u                           no-unused-vars
  131:14  warning  '_e' is defined but never used                                                                                    no-unused-vars
  160:28  warning  '_e' is defined but never used                                                                                    no-unused-vars

/home/user/ADPhysique/src/screens/FirstRunScreen.js
  1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/FoodInsightsScreen.js
   16:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  113:14  warning  'e' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/FoodSearchScreen.js
   19:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  129:14  warning  '_' is defined but never used                                            no-unused-vars
  146:14  warning  '_' is defined but never used                                            no-unused-vars
  187:14  warning  '_' is defined but never used                                            no-unused-vars
  217:16  warning  '_' is defined but never used                                            no-unused-vars
  350:14  warning  '_' is defined but never used                                            no-unused-vars
  377:14  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/GoalChangeSummaryScreen.js
   1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u           no-unused-vars
  14:9  warning  'moves' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/GoalLockConsentScreen.js
  47:16  warning  '_' is defined but never used  no-unused-vars

/home/user/ADPhysique/src/screens/HomeScreen.js
    14:10  warning  'VolyumeIcon' is defined but never used. Allowed unused vars must match /^_/u                                                 no-unused-vars
    37:8   warning  'InfoTooltip' is defined but never used. Allowed unused vars must match /^_/u                                                 no-unused-vars
   148:8   warning  React Hook useCallback has missing dependencies: 'loadData' and 'seeded'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
   196:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   210:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   220:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   231:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   241:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   276:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   318:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   327:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   335:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   350:16  warning  '_' is defined but never used                                                                                                 no-unused-vars
   360:18  warning  '_' is defined but never used                                                                                                 no-unused-vars
   376:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   498:16  warning  '_' is defined but never used                                                                                                 no-unused-vars
   501:14  warning  '_e' is defined but never used                                                                                                no-unused-vars
   508:14  warning  '_e' is defined but never used                                                                                                no-unused-vars
   541:14  warning  '_e' is defined but never used                                                                                                no-unused-vars
   560:14  warning  '_e' is defined but never used                                                                                                no-unused-vars
   584:14  warning  '_' is defined but never used                                                                                                 no-unused-vars
   709:9   warning  'today' is assigned a value but never used. Allowed unused vars must match /^_/u                                              no-unused-vars
  1500:44  warning  'weeklyVolume' is defined but never used. Allowed unused args must match /^_/u                                                no-unused-vars

/home/user/ADPhysique/src/screens/ImportScreen.js
   13:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  131:16  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/LiftProgressScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                        no-unused-vars
  55:67  warning  React Hook useCallback has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/LoginScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u              no-unused-vars
  11:3   warning  'ActivityIndicator' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  30:39  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u         no-unused-vars

/home/user/ADPhysique/src/screens/ManualBuilderScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  85:14  warning  '_e' is defined but never used                                           no-unused-vars

/home/user/ADPhysique/src/screens/MesocycleBuilderScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                       no-unused-vars
   1:27  warning  'useEffect' is defined but never used. Allowed unused vars must match /^_/u                                   no-unused-vars
   3:55  warning  'Alert' is defined but never used. Allowed unused vars must match /^_/u                                       no-unused-vars
  35:6   warning  React Hook useCallback has a missing dependency: 'loadAll'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  62:14  warning  '_' is defined but never used                                                                                 no-unused-vars

/home/user/ADPhysique/src/screens/MyMealsScreen.js
   18:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   57:14  warning  '_' is defined but never used                                            no-unused-vars
   74:14  warning  '_' is defined but never used                                            no-unused-vars
  108:74  warning  '_' is defined but never used                                            no-unused-vars
  125:68  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/MyRecipesScreen.js
  16:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  51:14  warning  '_' is defined but never used                                            no-unused-vars
  82:14  warning  '_' is defined but never used                                            no-unused-vars
  98:67  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/NotificationSettingsScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                       no-unused-vars
    9:3   warning  'Platform' is defined but never used. Allowed unused vars must match /^_/u                    no-unused-vars
   37:7   warning  'HOURS' is assigned a value but never used. Allowed unused vars must match /^_/u              no-unused-vars
   39:7   warning  'EVENING_HOURS' is assigned a value but never used. Allowed unused vars must match /^_/u      no-unused-vars
   49:10  warning  'formatDayHour' is defined but never used. Allowed unused vars must match /^_/u               no-unused-vars
   56:10  warning  'computeNextCheckinFireDate' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   72:10  warning  'formatNextFire' is defined but never used. Allowed unused vars must match /^_/u              no-unused-vars
  143:12  warning  '_' is defined but never used                                                                 no-unused-vars
  146:10  warning  'HourChips' is defined but never used. Allowed unused vars must match /^_/u                   no-unused-vars
  175:10  warning  'DayChips' is defined but never used. Allowed unused vars must match /^_/u                    no-unused-vars
  288:18  warning  '_' is defined but never used                                                                 no-unused-vars
  337:20  warning  '_' is defined but never used                                                                 no-unused-vars
  339:16  warning  '_' is defined but never used                                                                 no-unused-vars
  354:18  warning  '_' is defined but never used                                                                 no-unused-vars
  371:18  warning  '_' is defined but never used                                                                 no-unused-vars
  379:20  warning  '_' is defined but never used                                                                 no-unused-vars
  396:16  warning  '_' is defined but never used                                                                 no-unused-vars
  401:16  warning  '_' is defined but never used                                                                 no-unused-vars
  426:16  warning  '_' is defined but never used                                                                 no-unused-vars
  471:14  warning  '_' is defined but never used                                                                 no-unused-vars
  474:12  warning  'handleMorningToggle' is defined but never used. Allowed unused vars must match /^_/u         no-unused-vars
  486:12  warning  'handleMorningHour' is defined but never used. Allowed unused vars must match /^_/u           no-unused-vars
  491:12  warning  'handleCheckinToggle' is defined but never used. Allowed unused vars must match /^_/u         no-unused-vars
  503:12  warning  'handleCheckinDay' is defined but never used. Allowed unused vars must match /^_/u            no-unused-vars
  508:12  warning  'handleCheckinHour' is defined but never used. Allowed unused vars must match /^_/u           no-unused-vars
  531:14  warning  '_' is defined but never used                                                                 no-unused-vars
  552:20  warning  '_' is defined but never used                                                                 no-unused-vars

/home/user/ADPhysique/src/screens/NutritionEducationScreen.js
  11:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  18:52  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/NutritionTargetsScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u            no-unused-vars
    1:38  warning  'useRef' is defined but never used. Allowed unused vars must match /^_/u           no-unused-vars
    4:35  warning  'Keyboard' is defined but never used. Allowed unused vars must match /^_/u         no-unused-vars
  217:16  warning  '_' is defined but never used                                                      no-unused-vars
  239:16  warning  '_' is defined but never used                                                      no-unused-vars
  327:18  warning  '_e' is defined but never used                                                     no-unused-vars
  811:23  warning  'isUp' is assigned a value but never used. Allowed unused vars must match /^_/u    no-unused-vars
  817:23  warning  'fatPct' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/PaywallScreen.js
  19:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/PlanDetailScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                        no-unused-vars
    1:27  warning  'useEffect' is defined but never used. Allowed unused vars must match /^_/u                                    no-unused-vars
   42:40  warning  React Hook useCallback has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
   67:18  warning  '_' is defined but never used                                                                                  no-unused-vars
  108:22  warning  'e' is defined but never used                                                                                  no-unused-vars

/home/user/ADPhysique/src/screens/PlanLibraryScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                        no-unused-vars
  237:40  warning  React Hook useCallback has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  245:6   warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  253:14  warning  '_e' is defined but never used                                                                                 no-unused-vars
  308:22  warning  '_e' is defined but never used                                                                                 no-unused-vars

/home/user/ADPhysique/src/screens/PlansScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                        no-unused-vars
   16:10  warning  'EmptyPlanIllustration' is defined but never used. Allowed unused vars must match /^_/u                        no-unused-vars
  124:8   warning  React Hook useCallback has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  177:14  warning  '_e' is defined but never used                                                                                 no-unused-vars

/home/user/ADPhysique/src/screens/PrivacyPolicyScreen.js
  1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  9:47  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/ProGoalSetupScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  107:16  warning  '_' is defined but never used                                            no-unused-vars
  149:14  warning  '_' is defined but never used                                            no-unused-vars
  215:14  warning  '_' is defined but never used                                            no-unused-vars
  231:16  warning  '_' is defined but never used                                            no-unused-vars
  251:14  warning  'e' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/ProOnboardingScreen.js
    1:8    warning  'React' is defined but never used. Allowed unused vars must match /^_/u           no-unused-vars
  151:11   warning  'units' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  371:14   warning  '_' is defined but never used                                                     no-unused-vars
  524:18   warning  '_' is defined but never used                                                     no-unused-vars
  576:145  warning  '_' is defined but never used                                                     no-unused-vars

/home/user/ADPhysique/src/screens/ProSetupCompleteScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                     no-unused-vars
  48:6   warning  React Hook useEffect has missing dependencies: 'opacity', 'reduceMotion', and 'slideY'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  76:16  warning  '_' is defined but never used                                                                                                               no-unused-vars

/home/user/ADPhysique/src/screens/ProUpgradeScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u              no-unused-vars
    4:22  warning  'ActivityIndicator' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   57:14  warning  '_' is defined but never used                                                        no-unused-vars
  145:14  warning  '_' is defined but never used                                                        no-unused-vars
  178:16  warning  '_' is defined but never used                                                        no-unused-vars

/home/user/ADPhysique/src/screens/RecipeBuilderScreen.js
   21:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  159:14  warning  'e' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/RoutineDetailScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                         no-unused-vars
  114:6   warning  React Hook useEffect has a missing dependency: 'loadRoutine'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  130:6   warning  React Hook useEffect has a missing dependency: 'navigation'. Either include it or remove the dependency array   react-hooks/exhaustive-deps
  239:14  warning  '_err' is defined but never used                                                                                no-unused-vars

/home/user/ADPhysique/src/screens/ScanBarcodeScreen.js
  26:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/ScanLabelScreen.js
  24:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/SettingsScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                      no-unused-vars
   33:29  warning  'getHealthConnectSdkStatus' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
   55:18  warning  '_' is defined but never used                                                                no-unused-vars
  110:17  warning  'setUser' is assigned a value but never used. Allowed unused vars must match /^_/u           no-unused-vars
  110:26  warning  'setSession' is assigned a value but never used. Allowed unused vars must match /^_/u        no-unused-vars
  187:16  warning  '_' is defined but never used                                                                no-unused-vars
  289:18  warning  '_' is defined but never used                                                                no-unused-vars
  343:16  warning  '_' is defined but never used                                                                no-unused-vars
  453:32  warning  '_' is defined but never used                                                                no-unused-vars
  532:22  warning  '_' is defined but never used                                                                no-unused-vars
  611:22  warning  '_' is defined but never used                                                                no-unused-vars
  633:22  warning  '_' is defined but never used                                                                no-unused-vars
  646:15  warning  'cloudErr' is assigned a value but never used. Allowed unused vars must match /^_/u          no-unused-vars
  714:14  warning  '_' is defined but never used                                                                no-unused-vars

/home/user/ADPhysique/src/screens/ShareCardScreen.js
     1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                 no-unused-vars
    15:67  warning  '_' is defined but never used                                                           no-unused-vars
    16:58  warning  '_' is defined but never used                                                           no-unused-vars
    17:51  warning  '_' is defined but never used                                                           no-unused-vars
    18:81  warning  '_' is defined but never used                                                           no-unused-vars
    19:47  warning  '_' is defined but never used                                                           no-unused-vars
   675:43  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u            no-unused-vars
   791:14  warning  '_e' is defined but never used                                                          no-unused-vars
   880:14  warning  '_e' is defined but never used                                                          no-unused-vars
  1052:43  warning  'accentColor' is assigned a value but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/SubscriptionPolicyScreen.js
  14:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u       no-unused-vars
  21:52  warning  'navigation' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/screens/SubscriptionScreen.js
   14:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                     no-unused-vars
   87:6  warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  114:6  warning  React Hook useCallback has a missing dependency: 'toast'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/VolumeHeatmapScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                        no-unused-vars
  28:17  warning  'units' is assigned a value but never used. Allowed unused vars must match /^_/u                               no-unused-vars
  39:53  warning  React Hook useCallback has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  41:36  warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  78:53  warning  '_' is defined but never used                                                                                  no-unused-vars

/home/user/ADPhysique/src/screens/WeeklyCheckInScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                             no-unused-vars
   22:3   warning  'logMorningWeight' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                  no-unused-vars
  190:30  warning  'units' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                    no-unused-vars
  286:18  warning  '_' is defined but never used                                                                                                                                                                                                       no-unused-vars
  399:9   warning  'step1Complete' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                            no-unused-vars
  402:9   warning  'step2Complete' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                            no-unused-vars
  403:9   warning  'step3Complete' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                            no-unused-vars
  404:9   warning  'step4Complete' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                            no-unused-vars
  468:16  warning  '_' is defined but never used                                                                                                                                                                                                       no-unused-vars
  500:6   warning  React Hook useCallback has missing dependencies: 'cycle', 'hasStepsTarget', 'showCycle', 'soreMuscles', 'stepsManual', 'stepsSummary.avgSteps', and 'stepsSummary?.registered'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  830:9   warning  'stepTitles' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                               no-unused-vars
  940:9   warning  'todayDayName' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                             no-unused-vars

/home/user/ADPhysique/src/screens/WelcomeScreen.js
   1:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                                     no-unused-vars
  39:6  warning  React Hook useEffect has missing dependencies: 'fadeIn', 'reduceMotion', and 'slideUp'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/WellbeingCheckScreen.js
   1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars
  33:16  warning  '_' is defined but never used                                            no-unused-vars
  64:14  warning  '_' is defined but never used                                            no-unused-vars

/home/user/ADPhysique/src/screens/WorkoutHistoryScreen.js
    1:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                          no-unused-vars
   52:6   warning  React Hook useEffect has a missing dependency: 'loadWorkouts'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  174:14  warning  '_' is defined but never used                                                                                    no-unused-vars
  179:18  warning  'handleStartNewWorkout' is defined but never used. Allowed unused vars must match /^_/u                          no-unused-vars

/home/user/ADPhysique/src/screens/WorkoutSummaryScreen.js
   19:113  warning  'computeAdaptiveDecision' is defined but never used. Allowed unused vars must match /^_/u                                                                        no-unused-vars
   99:10   warning  'autoRegSuggestions' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                    no-unused-vars
  108:10   warning  'mesoAdvice' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                            no-unused-vars
  109:10   warning  'deloadPrediction' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                      no-unused-vars
  112:10   warning  'deloadRecommendation' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                  no-unused-vars
  136:18   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  139:6    warning  React Hook useEffect has missing dependencies: 'readOnly', 'routineId', and 'user.id'. Either include them or remove the dependency array                        react-hooks/exhaustive-deps
  143:6    warning  React Hook useEffect has a missing dependency: 'loadVolumeAndHistory'. Either include it or remove the dependency array                                          react-hooks/exhaustive-deps
  267:6    warning  React Hook useEffect has missing dependencies: 'userProfile?.currentMesoWeek' and 'userProfile?.experience'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  282:16   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  287:6    warning  React Hook useEffect has missing dependencies: 'readOnly' and 'workoutId'. Either include them or remove the dependency array                                    react-hooks/exhaustive-deps
  351:16   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  372:14   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  390:16   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  425:14   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  431:16   warning  '_e' is defined but never used                                                                                                                                   no-unused-vars
  455:14   warning  '_' is defined but never used                                                                                                                                    no-unused-vars
  526:14   warning  '_' is defined but never used                                                                                                                                    no-unused-vars
  537:9    warning  'dataLimited' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                           no-unused-vars
  543:9    warning  'sessionLabel' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                          no-unused-vars

/home/user/ADPhysique/src/screens/YearOfLiftsScreen.js
   19:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u                                                    no-unused-vars
  114:11  warning  'top' is assigned a value but never used. Allowed unused vars must match /^_/u                                             no-unused-vars
  221:6   warning  React Hook useEffect has missing dependencies: 'user.id' and 'yearMs'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/home/user/ADPhysique/src/screens/YouScreen.js
  12:8  warning  'React' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/src/store/useAppStore.js
   10:88   warning  '_' is defined but never used                                                                    no-unused-vars
   45:12   warning  '_' is defined but never used                                                                    no-unused-vars
   60:12   warning  '_' is defined but never used                                                                    no-unused-vars
   80:14   warning  '_' is defined but never used                                                                    no-unused-vars
  165:14   warning  '_' is defined but never used                                                                    no-unused-vars
  177:14   warning  '_' is defined but never used                                                                    no-unused-vars
  198:105  warning  '_' is defined but never used                                                                    no-unused-vars
  209:16   warning  '_' is defined but never used                                                                    no-unused-vars
  216:14   warning  '_' is defined but never used                                                                    no-unused-vars
  248:55   warning  '_' is defined but never used                                                                    no-unused-vars
  267:16   warning  '_' is defined but never used                                                                    no-unused-vars
  389:14   warning  '_e' is defined but never used                                                                   no-unused-vars
  425:16   warning  '_' is defined but never used                                                                    no-unused-vars
  467:67   warning  '_' is defined but never used                                                                    no-unused-vars
  485:14   warning  '_' is defined but never used                                                                    no-unused-vars
  490:81   warning  '_' is defined but never used                                                                    no-unused-vars
  502:75   warning  '_' is defined but never used                                                                    no-unused-vars
  509:76   warning  '_' is defined but never used                                                                    no-unused-vars
  511:9    warning  'routedOptimistically' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  566:76   warning  '_' is defined but never used                                                                    no-unused-vars
  567:97   warning  '_' is defined but never used                                                                    no-unused-vars
  581:14   warning  '_' is defined but never used                                                                    no-unused-vars
  593:109  warning  '_' is defined but never used                                                                    no-unused-vars
  611:73   warning  '_' is defined but never used                                                                    no-unused-vars
  620:74   warning  '_' is defined but never used                                                                    no-unused-vars
  682:14   warning  '_e' is defined but never used                                                                   no-unused-vars
  708:14   warning  '_e' is defined but never used                                                                   no-unused-vars
  723:82   warning  '_' is defined but never used                                                                    no-unused-vars
  733:14   warning  '_e' is defined but never used                                                                   no-unused-vars
  752:14   warning  '_' is defined but never used                                                                    no-unused-vars
  803:131  warning  '_' is defined but never used                                                                    no-unused-vars
  819:14   warning  '_' is defined but never used                                                                    no-unused-vars
  897:62   warning  '_' is defined but never used                                                                    no-unused-vars
  914:62   warning  '_' is defined but never used                                                                    no-unused-vars
  933:62   warning  '_' is defined but never used                                                                    no-unused-vars
  950:62   warning  '_' is defined but never used                                                                    no-unused-vars
  983:76   warning  '_' is defined but never used                                                                    no-unused-vars
  995:63   warning  '_' is defined but never used                                                                    no-unused-vars

/home/user/ADPhysique/tests/simulator/runner.js
   37:7   warning  'WEEK_MS' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  166:11  warning  'i' is defined but never used. Allowed unused args must match /^_/u                 no-unused-vars

/home/user/ADPhysique/tests/simulator/scenarios/aggressive_cut_supervised.test.js
  19:20  warning  'buildWeeklyInputs' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

/home/user/ADPhysique/tests/simulator/scenarios/aggressive_cut_unsupervised.test.js
  14:20  warning  'buildWeeklyInputs' is defined but never used. Allowed unused vars must match /^_/u  no-unused-vars

✖ 777 problems (0 errors, 777 warnings)

```

---

## PART 4 — SECURITY AUDIT (partial, verified items only)

The following were checked by direct grep/read and are VERIFIED. Items not
listed here (full per-call auth-header trace, complete Supabase RLS review
across the 61 SQL files, deep-link handler trace) are NOT yet done — see the
progress log.

### Verified clean (no finding)
- **Hardcoded secrets:** none. `grep` for JWTs (`eyJ…`), `service_role`,
  `sk_live/sk_test`, inline `secret_key`/`apiKey` literals across `src/`,
  `App.js`, `app.json`, `.env*` returned nothing. VERIFIED.
- **Supabase credentials:** sourced from `process.env.EXPO_PUBLIC_SUPABASE_URL`
  and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/supabase.js:27-28`), not
  hardcoded. The anon key is public-by-design (RLS-protected). Correct pattern.
- **Auth token storage:** the Supabase auth session uses a custom
  `SecureStore` adapter (`src/lib/supabase.js:5-15,33`) with
  `persistSession: true`. Tokens are stored encrypted via `expo-secure-store`,
  NOT in AsyncStorage. Correct/secure pattern. VERIFIED.
- **Sensitive data in logs:** of 42 `console.*` calls in non-test `src/`, none
  log token/password/session/email/secret (grep VERIFIED). Note: 42 raw
  `console.*` is a code-quality item (the project has `logError`/`logWarn`
  wrappers); enumerated as Improvement, not a security finding.

### Findings

---
ID: ISSUE-001
FILE: scripts/seed/buildCofidSnapshot.js
LINE: 34
SEVERITY: Low
TYPE: Security
FLOW AFFECTED: None (offline build-time data seed; not shipped)
DESCRIPTION: `xlsx@^0.18.5` (devDependency) is used to parse the downloaded
McCance & Widdowson `.xlsx` dataset. `xlsx` has unpatched high-severity
advisories (prototype pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9)
with no fix available. VERIFIED it is dev-only: not in `dependencies`, no
import anywhere in `src/`.
REPRODUCTION: Run the seed script locally; it `require('xlsx')` and parses a
remote workbook.
IMPACT: Dev-machine-only exposure when regenerating the food snapshot from the
(trusted) gov.uk source. No end-user/shipped-app exposure.
FIX: Either pin/replace the parser in `scripts/seed/buildCofidSnapshot.js`
(e.g. switch to a maintained reader such as `exceljs` for the one-off parse) or
accept the risk and document it, since the input is a single trusted government
URL and the output is committed as a static snapshot. Do not add `xlsx` to
runtime `dependencies`.
---

> PART 4 REMAINING (not started): per-API-call auth-header verification;
> full Supabase RLS policy review (supabase/*.sql, 61 files); deep-link
> handler trace; per-point input-validation trace to DB/RPC. The
> `food_sync_push`/`food_sync_pull` RPCs and the sign-in/out flow were reviewed
> in prior work but NOT re-verified line-by-line for this audit.

---

## SECTION 1 — EXECUTIVE SUMMARY (automated portion complete; manual parts IN PROGRESS)

### Automated analysis (VERIFIED, exact counts)
- **TypeScript:** no typecheck configured. `tsc --noEmit --strict` exits 2 on a
  config deprecation and never type-checks (no `typescript` dep, 0 `.ts` in
  `src/`). 1 config error, 0 type errors checked. (Improvement ISSUE in Part 6.)
- **ESLint:** 777 problems = **0 errors, 777 warnings** (728 `no-unused-vars`,
  49 `react-hooks/exhaustive-deps`). Raw output in Section 5.3.
- **npm audit:** **32 vulnerabilities (18 high, 13 moderate, 1 low, 0 critical)**,
  ALL dev/build-time (Expo/RN tooling + `xlsx` dev seed script). **None in
  shipped runtime code.** Raw output in Section 5.2.
- **Unused dependencies:** none confidently removable (3 candidates all
  explained: config-plugin / nav peer / icon-font support).
- **Dead code:** 728 file-local unused identifiers (ESLint) + **88 exported
  identifiers with no cross-file reference** (sample-verified), incl. a large
  unused slice of `database.js` (custom-exercise CRUD, mesocycle/routine mgmt).

### Security (partial, verified)
- No hardcoded secrets; tokens in SecureStore (encrypted); no sensitive logging;
  Supabase creds from env. 1 Low finding (xlsx dev-dep). Full security pass
  (RLS, per-call auth, deep links) NOT yet done.

### Manual audit status
- Part 2 (per-file line-by-line bug/quality audit of ~236 source files): **NOT
  STARTED.**
- Part 3 (flow simulation, 10+ flows): **NOT STARTED.**
- Part 4 (security): **PARTIAL** (verified-clean basics + 1 finding; remainder listed).
- Part 6 (improvements): **NOT STARTED** (beyond the 2 implied by Part 1: add a
  JS typecheck path; reduce the 777 lint warnings / dead code).

> Issue-count-by-severity, top-10, and flow pass/fail tables are deliberately
> left blank until Parts 2-3 run, to avoid unverified numbers. Do not infer them.

---

## SESSION PROGRESS LOG

- 2026-06-02 session 1 (this session):
  - DONE: Pre-work inventory; Part 1.1-1.5 (all verified, with raw output in
    Section 5); Part 4 partial (verified-clean basics + ISSUE-001); Section 5
    raw outputs (tsc, npm audit, full ESLint); Executive Summary automated
    portion. One self-correction made (xlsx is devDependency, not runtime).
  - NOT STARTED / RESUME HERE:
    1. PART 2 — line-by-line audit. Suggested order: `src/store/useAppStore.js`,
       `src/lib/sync*` (runtime-critical), `src/lib/database.js`, then
       `src/screens/*` (59), `src/components/*` (41). Use the 88 dead-export
       list (Part 1.5) and 49 exhaustive-deps warnings (Section 5.3) as entry
       points. Assign ISSUE-002+ sequentially.
    2. PART 3 — trace the 10 flows in the brief from `src/navigation/RootNavigator.js`.
    3. PART 4 — finish: RLS review of `supabase/*.sql`, per-call auth headers,
       deep-link handlers, input validation to DB/RPC.
    4. PART 5 — raw outputs already captured (5.1-5.3); add any new tool runs.
    5. PART 6 — improvements (typecheck path, dead-code removal, lint-warning
       reduction, dependency upgrade plan gated by release policy).
  - Output-structure note: sections were appended in execution order, not final
    brief order. A later pass can reorder into Sections 1-6 if needed; content
    is the source of truth.

---

## PART 2 — CODE AUDIT (in progress, runtime-critical files first)

> This part is large (~236 source files). Files are audited in full and
> recorded here as completed. Findings use ISSUE-002+ sequentially. Absence of
> findings for a fully-read file is recorded explicitly (not skipped).

### Files audited this session

**`src/store/useAppStore.js`** (lines 1-660 read in full; file continues past
660, remainder NOT yet read — see log). VERIFIED-CLEAN through 660. No defects
found. Positive observations (why it is clean):
- Both `Promise.race` timeout patterns (`restoreSessionFromCloud` line 540-550;
  `refreshTierFromCloud` 641-651) clear the loser timer in a `finally`, so a
  fast cloud read never leaves a 5s/10s timer armed. No timer leak.
- Every `AsyncStorage` write is wrapped in try/catch (offline-tolerant); tier
  and first-run persistence happen BEFORE in-memory `set` so a crash between
  the two reconciles on next load (documented intent, lines 427-436).
- Optimistic sign-in routing (457-624) reconciles against cloud truth and only
  flips a heuristic guess back to the wizard, never a cache-hit decision
  (guards on `optimisticReturningFromHeuristic`), avoiding the wizard-flash bug.
- Fire-and-forget cloud pushes (`pushPrefSoon` 73-82, `saveLocalProfile`
  170-177) lazy-require `../lib/sync` to break the circular import and swallow
  errors deliberately (queue catches up). Intentional, not a swallowed bug.

### Findings

---
ID: ISSUE-002
FILE: App.js
LINE: 465-470, 493 (and AppState handler ~599-620)
SEVERITY: Low
TYPE: Bug
FLOW AFFECTED: Sign out then sign back in within the same app process (no restart)
DESCRIPTION: `maybeSync()` is throttled by module-scoped `let lastSyncAt`
(App.js:465) with `if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;`
(line 470, 60s window). `lastSyncAt` and `coldStartFired` (466) are NEVER reset
on an auth transition (no SIGNED_OUT/SIGNED_IN reset). So after a sign-out +
sign-in inside one process, a background `maybeSync` fired within 60s of the
pre-logout sync is skipped, and `coldStartFired` stays true so the cold-start
telemetry/sync path also won't re-fire. VERIFIED by reading App.js:465-660 (no
reset of either variable on auth events).
REPRODUCTION: Use the app (triggers a sync, sets lastSyncAt), sign out, sign
back in within 60s, background/foreground the app: the AppState-driven
`maybeSync` no-ops.
IMPACT: Low post-mitigation. The user-visible food-restore symptom this
contributed to is now covered by the explicit `syncAll` on the sign-in restore
(RootNavigator.onAuthStateChange + LoginScreen, added in the food-sync fix), so
data still restores. Residual: the background catch-up cadence can be skipped
for up to 60s after a same-session re-login; harmless but not intended.
FIX: In App.js, reset the throttle on auth change. Either (a) in the existing
`onAuthStateChange` wiring, on `SIGNED_OUT` set `lastSyncAt = 0` and
`coldStartFired = false`; or (b) on `SIGNED_IN` set `lastSyncAt = 0` so the
first post-login `maybeSync` always runs. Keep the 60s throttle for the
steady-state foreground/background cadence.
---

> PART 2 REMAINING (not started): `src/store/useAppStore.js` lines 660-end;
> `src/lib/sync.js` (~1730 lines); `src/lib/sync/*` (runner/transport/registry
> reviewed in prior work, NOT line-audited here); `src/lib/database.js`
> (~5k lines); all 59 `src/screens/*`; all 41 `src/components/*`; `src/lib/*`
> (food, notifications, payments, telemetry). Use the 88 dead-export list
> (1.5) and 49 exhaustive-deps warnings (5.3) as entry points.

---

## SESSION PROGRESS LOG (update)

- 2026-06-02 session 1 continued (Part 2 started):
  - DONE: `src/store/useAppStore.js` audited lines 1-660 (verified-clean, no
    findings, rationale recorded above). App.js sync-throttle reviewed →
    ISSUE-002 (Low) recorded.
  - RESUME HERE for Part 2: finish `useAppStore.js` (660-end), then
    `src/lib/sync.js`, `src/lib/database.js`, then screens/components. Next
    ISSUE id to assign: **ISSUE-003**.
  - Parts 3 (flows) and 6 (improvements) still NOT STARTED. Part 4 still PARTIAL
    (RLS/deep-links/per-call-auth remaining). Part 1 + Section 5 complete.

### Files audited this session (cont.)

**`src/lib/sync.js`** (helpers lines 1-115; `scheduleSync`/`cancelScheduledSync`
388-425; `syncMorningWeight` 427-448; `syncWeeklyCheckin` 450-484;
`syncBodyMetric` 486-490 start). VERIFIED-CLEAN for these ranges. Remaining
~1240 lines of sync.js NOT yet read. Verified observations:
- `fetchAllRows` (98-110) paginates with `.range()` and terminates on a short
  page; no infinite-loop risk. `fetchByIdsChunked` chunks IN-lists at 200.
- `scheduleSync` (388-413) is a debounce: clears the prior timer before arming a
  new one (no timer pile-up), no-ops under Jest (`JEST_WORKER_ID`) to avoid open
  handles, and `cancelScheduledSync` clears it on sign-out. Correct.
- The three immediate per-entity syncs all follow the same correct shape:
  composite-PK upsert (`onConflict: 'user_id,id'`), `logPgErr` + `throw` on
  PostgREST error, and a `catch` that enqueues a retry op via
  `syncQueue.enqueueSyncOp`. Consistent with IDENTITY_AND_OWNERSHIP_LOCKED.md.
- One contract to verify later (NOT a finding yet): `syncWeeklyCheckin` enqueues
  op type `'check_in'` but writes `weekly_checkins_v2`; the queue drain handler
  for `'check_in'` must target the same table. Needs the syncQueue drain code
  read to confirm; flagged for the Part 2 continuation.

> NOTE ON AUDIT COMPLETENESS: Part 2 as specified (read all ~236 source files in
> full, cite every instance) is a multi-session effort. Sessions so far have
> completed Part 1 (automated, exhaustive + verified), Part 4 basics, and begun
> Part 2 with the runtime-critical store + sync entry points (verified-clean +
> ISSUE-002). The remaining per-file reading of sync.js (rest), database.js
> (~5k lines), 59 screens and 41 components is intentionally NOT fabricated;
> resume points are in the progress log. Next ISSUE id: ISSUE-003.

---

## PART 4 (cont.) — Supabase RLS review

Scope: all `supabase/**/*.sql` (57 distinct tables across schema.sql,
setup_complete.sql and migrate_001-059). VERIFIED by reading policy definitions
directly. **Result: no RLS exposure finding. Every user-scoped table enforces
owner-only access.**

### Method and the false-positive trail (recorded for honesty)
A first static pass (regex over `CREATE POLICY`) flagged 10 RLS-enabled tables
as having "no policy": `account_deletions_log, adaptation_events,
autoregulation_suggestions, exercise_goals, nutrition_targets,
peak_week_plans, planned_muscle_volume, user_insights, user_prefs,
workout_notes`. Each was then VERIFIED individually and **all 10 are correctly
secured** — the static pass was wrong because policies are created three ways:

1. **Dynamic `DO`-block loops.** `migrate_012_complete_sync.sql:309-324` runs
   `FOREACH t IN ARRAY [...] EXECUTE format('CREATE POLICY "Users manage own %s"
   ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() =
   user_id)')` for `user_insights, planned_muscle_volume, adaptation_events,
   peak_week_plans, workout_notes, exercise_goals, user_prefs`. A static
   `CREATE POLICY` grep cannot see these. (Verified by reading lines 300-324.)
   There are 4 such dynamic blocks total (migrate_012, 018, 021, 024).
2. **Static policies my split-regex missed:** `nutrition_targets`
   (migrate_009:42, "Users can manage own nutrition targets") and
   `autoregulation_suggestions` ("Users can manage own autoregulation
   suggestions") both have explicit policies. (Verified by grep.)
3. **Intentional deny-all:** `account_deletions_log` has RLS enabled +
   `"deny all on account_deletions_log"` (migrate_039:54). It is a deletion
   audit log written only by the `delete-account` Edge Function (service role);
   clients correctly cannot read/write it. This is correct, not a gap.

### Verified positive findings
- `schema.sql` (16 canonical tables, paren-anchored clean parse): **all 16 have
  `ENABLE ROW LEVEL SECURITY`; none missing.**
- Owner policy pattern is consistent: `FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)` (or per-verb variants for
  custom_exercises, device_push_tokens, daily_intake_rollups).
- Reference/shared tables expose only safe reads: `foods` ("Authenticated users
  can read foods"), `exercises` ("Anyone can read canonical exercises" + owner
  policy for custom rows), `debug_log_uploads` ("Anyone can insert debug logs",
  insert-only).
- This also CONFIRMS the Stage D1 conclusion elsewhere: `user_prefs` has a
  working `auth.uid() = user_id` policy, so custom-landmark persistence via the
  prefs sync is genuinely secured and functional.

### NOT verified (remaining for a later Part 4 pass)
- Per-policy USING-clause correctness beyond the owner pattern (each was
  confirmed to exist and follow `auth.uid() = user_id`; not every clause was
  read line-by-line).
- The `food_sync_push` / `food_sync_pull` RPCs (migrate_016/021) are likely
  `SECURITY DEFINER` and enforce `auth.uid()` internally; their bodies were NOT
  re-read in this pass. Flag for verification: confirm they filter by
  `auth.uid()` and cannot be invoked to read another user's rows.
- Edge Functions (`delete-account`, `play-billing-rtdn`, `send-push`) use the
  service role; their auth/JWT verification was NOT audited here.

---

## PART 4 (cont.) — food_sync RPCs + Edge Functions (VERIFIED)

### food_sync_push / food_sync_pull (migrate_016, migrate_021) — SECURE
VERIFIED by reading the function bodies. Both are `SECURITY DEFINER` (bypass
RLS), `SET search_path = public`, `GRANT EXECUTE … TO authenticated` (not anon),
and correctly self-scope:
- `v_uid uuid := auth.uid()` with an explicit `IF v_uid IS NULL THEN RAISE
  EXCEPTION 'not authenticated'` guard in BOTH (pull 54-56; push 196-198).
- `food_sync_pull`: every SELECT filters `WHERE t.user_id = v_uid` (verified
  across custom_foods, food_entries, daily_intake_rollups, saved_meals,
  recipes, …). A caller cannot pull another user's rows despite DEFINER.
- `food_sync_push`: INSERTs hardcode `user_id = v_uid` (lines 209, 244, …),
  IGNORING any `user_id` in the payload, so a caller cannot write rows owned by
  another user. All UPDATEs and all 4 DELETEs filter `WHERE id = … AND user_id
  = v_uid` (7 such scoping clauses verified). ON CONFLICT uses `(user_id, id)`.
No finding.

### Edge Functions — SECURE
VERIFIED by reading each `index.ts`:
- `delete-account/index.ts` (161 lines): requires `Authorization` (401 if
  missing, 63-66); verifies the caller with an anon client carrying their JWT +
  `auth.getUser()` (401 if not authenticated, 69-77); runs `delete_user_data`
  under the USER's JWT so RLS scopes deletion to their own rows; uses the
  service-role admin client only for `auth.admin.deleteUser` on that same
  verified uid. A caller can only delete their own account. Correct.
- `play-billing-rtdn/index.ts` (353 lines): a Google Play RTDN webhook. Does
  NOT trust the Pub/Sub payload — re-verifies every purchase via the Play
  Developer API (`verifyWithPlayApi`, 307) and **fails closed**: if verification
  is unavailable/fails it ACKs (to stop redelivery) but performs no tier change
  (308-312). The upgraded `userId` is taken from the VERIFIED
  `subscription.obfuscatedExternalAccountId` (313), not the raw payload, so a
  forged webhook cannot route a tier change to an arbitrary user.
  `upgrade_tier_for_user` is service-role-granted only. Correct.
- `send-push/index.ts` (200 lines): rejects any caller whose `Authorization`
  Bearer token is not the service-role key (401, 100-104). Client app cannot
  call it. Correct. (See ISSUE-003 for a minor note.)

### Findings

---
ID: ISSUE-003
FILE: supabase/functions/send-push/index.ts
LINE: ~99-104
SEVERITY: Low
TYPE: Security
FLOW AFFECTED: Server-to-server push send (RTDN → send-push)
DESCRIPTION: The service-role authorisation check compares the caller's bearer
token to the service-role key with a plain string comparison (a code comment
acknowledges "a direct compare is fine"). A plain `===` is not constant-time, so
it is theoretically vulnerable to a timing side-channel for secret recovery.
IMPACT: Negligible in practice — the secret is a long high-entropy service-role
key, the endpoint is server-to-server, and network jitter dwarfs the timing
delta. Recorded for completeness, not a real-world exposure.
FIX: If hardening: replace the `===` with a constant-time comparison (e.g. hash
both sides with `crypto.subtle.digest` and compare the digests, or a
length-checked XOR compare). Optional.
---

### PART 4 CONCLUSION
Security posture is strong and VERIFIED across: secret handling (none
hardcoded; env-sourced), token storage (encrypted SecureStore), logging (no
sensitive data in 42 console calls), RLS (all user-scoped tables owner-scoped,
incl. dynamic-policy tables), the food RPCs (DEFINER but auth.uid()-scoped, null
rejected), and all three Edge Functions (JWT-verified / service-role-gated /
Play-API-verified + fail-closed). Findings: ISSUE-001 (Low, xlsx dev-dep),
ISSUE-003 (Low, non-constant-time compare). NOT audited: deep-link handlers
(Part 4 item still outstanding); per-input validation trace to every DB/RPC
call (the RPC and RLS layers provide defence-in-depth regardless).

---

## PART 4 (cont.) — Deep links (VERIFIED) — Part 4 now COMPLETE

VERIFIED by reading `app.json` + `App.js`.
- Registered: scheme `volyume://`, Android App Links + iOS associatedDomains for
  `volyume.app` (autoVerify).
- The ONLY inbound deep-link handler is `handleAuthDeepLink` (App.js:146,
  wired at 392-393 via `Linking.getInitialURL` + `addEventListener('url')`). It:
  (1) early-returns unless the URL starts with `volyume://` or
  `https://volyume.app` (rejects arbitrary links); (2) extracts the PKCE `code`
  and calls `supabase.auth.exchangeCodeForSession(...)` — the standard secure
  flow (an attacker-supplied code can't complete without the client-held PKCE
  verifier); (3) on failure calls `notifyAuthLinkFailed`. The top prefix guard
  protects every branch.
- There is **no React-Navigation `linking`/`prefixes` config** (verified: no
  `linking=` on the NavigationContainer at RootNavigator.js:927), so deep links
  CANNOT auto-route to arbitrary screens with params.
- All other `Linking.*` usages are OUTBOUND `openURL`/`openSettings` to known
  app/config URLs (support, Play store, privacy policy, health apps). Not an
  inbound attack surface.
No deep-link finding.

> **PART 4 STATUS: COMPLETE.** Verified-strong security posture. Findings:
> ISSUE-001 (Low, xlsx dev-dep, no shipped exposure), ISSUE-003 (Low,
> non-constant-time service-role compare). Everything else (secrets, token
> storage, logging, RLS incl. dynamic policies, food RPCs, 3 Edge Functions,
> deep links) verified secure. Only un-traced item: exhaustive per-input
> validation to every DB/RPC call — mitigated by the RLS + DEFINER-scoping +
> server-side RPC validation layers verified above.

---

## SESSION PROGRESS LOG (update 2)

- 2026-06-02 session 1 (continued):
  - DONE since last update: PART 4 COMPLETE — RLS review (all tables
    owner-scoped, dynamic-policy false positives cleared), food_sync_push/pull
    RPCs (auth.uid()-scoped, null-rejected), 3 Edge Functions (delete-account,
    play-billing-rtdn, send-push — all verified), deep links (PKCE, prefix-
    guarded, no nav linking config). Findings ISSUE-001, ISSUE-003 (both Low).
  - Part 2 status: STARTED (useAppStore 1-660 clean; sync.js entry points
    clean; ISSUE-002). Remaining ~230 files NOT read. Next ISSUE id: ISSUE-004.
  - NOT STARTED: Part 3 (flow simulation), Part 6 (improvements). Part 5 raw
    output captured (5.1-5.3).
  - Highest-value remaining units, in order: (1) Part 3 flow simulation from
    RootNavigator; (2) Part 6 improvements writeup (typecheck path, 777 lint
    warnings, 88 dead exports, dep-upgrade plan); (3) Part 2 bulk per-file
    (low expected yield given code quality so far).

---

## SECTION 6 / PART 6 — IMPROVEMENT OPPORTUNITIES

All grounded in this audit's verified data. Standard finding format.

---
ID: ISSUE-004
FILE: tsconfig.json, package.json
LINE: tsconfig.json:1-4
SEVERITY: Medium
TYPE: Improvement
DESCRIPTION: The ~236-file JS codebase has NO type checking (Part 1.1: no
`typescript` dep, no `typecheck` script, `tsc --noEmit --strict` dies on a
config deprecation, 0 `.ts` in `src/`). A JS app this size syncing to a typed
Postgres schema is exactly where type drift causes the silent payload bugs the
repo's own history references (e.g. the camelCase/snake_case food-mapper
regression noted in foodDomain.js:109-118).
IMPACT: A whole class of contract bugs (wrong field names, null shapes, RPC
payload mismatches) can only be caught at runtime / by tests.
FIX: Add `typescript` as a devDependency; set `tsconfig.json` compilerOptions to
`{ "allowJs": true, "checkJs": false, "noEmit": true, "ignoreDeprecations":
"6.0" }`; add a `"typecheck": "tsc --noEmit"` script. Then incrementally opt-in
files with `// @ts-check` + JSDoc, starting with the sync/database contract
layer (src/lib/sync/*, src/lib/database.js). Do NOT flip `checkJs:true`
globally first — it would surface thousands of errors at once.
---
ID: ISSUE-005
FILE: (49 sites; see list) — worst: src/screens/ActiveWorkoutScreen.js
LINE: ActiveWorkoutScreen 6 warnings; WorkoutSummaryScreen 4; DiaryScreen 3;
CascadeGateScreen 3; BodyMetricsScreen 3; VolumeHeatmapScreen/SubscriptionScreen/
RoutineDetailScreen/PlanLibraryScreen/RootNavigator/PeekMenu 2 each; +18 files 1 each
SEVERITY: Medium
TYPE: Improvement
DESCRIPTION: 49 `react-hooks/exhaustive-deps` warnings (Part 1.2). Unlike the
unused-vars noise, these are genuinely bug-prone: a missing dep can capture a
stale value/closure (stale state in an effect, a callback that never updates).
The concentration in `ActiveWorkoutScreen` (the live logging screen, 6
warnings) is the highest risk because stale state there means wrong set data.
IMPACT: Latent stale-closure bugs; hard to reproduce, easy to ship.
FIX: Triage these 49 individually (NOT a blanket auto-fix — adding deps can
cause re-run loops). Start with ActiveWorkoutScreen's 6 and WorkoutSummaryScreen's
4. For each: either add the missing dep, wrap the dep in `useCallback`/`useRef`,
or add a justified `// eslint-disable-next-line` with a comment. The full list
with line numbers is in Section 5.3.
---
ID: ISSUE-006
FILE: codebase-wide; worst: src/store/useAppStore.js (38), src/lib/database.js (28)
LINE: see Section 5.3 (unused-vars) + Part 1.5 (dead exports)
SEVERITY: Low
TYPE: Improvement
DESCRIPTION: 728 `no-unused-vars` warnings + 88 cross-module-unused exports
(Part 1.5). Top unused-vars files: useAppStore.js (38), database.js (28),
NotificationSettingsScreen.js (27), HomeScreen.js (22), RootNavigator.js (20),
health.js (19). The 88 dead exports include a large unused `database.js` surface
(custom-exercise CRUD, mesocycle/routine mgmt) — possibly a feature wired through
a different path or genuinely dead.
IMPACT: Maintenance drag; dead exports imply either an unfinished feature or
removable code; obscures real signal in lint output.
FIX: (1) Run `eslint . --fix` is NOT safe for unused-vars (won't remove them);
instead sweep file-by-file removing unused imports/locals. (2) For the 88 dead
exports, confirm no intra-module use (Part 1.5 caveat) then remove or drop the
`export` keyword. (3) Investigate the unused custom-exercise CRUD cluster in
database.js — decide feature-in-progress vs delete.
---
ID: ISSUE-007
FILE: src/hooks/useProgressData.js (+ src/components/ReadinessCards.js, src/screens/VolumeHeatmapScreen.js, src/screens/ConsistencyScreen.js)
LINE: useProgressData.js:92-99 (useFocusEffect → load → getAllWorkouts + getCompletedWorkoutSets + getAllExercises + more)
SEVERITY: Medium
TYPE: Performance
FLOW AFFECTED: Progress tab (landing + Consistency), every focus
DESCRIPTION: VERIFIED: `useProgressData.load()` runs on every `useFocusEffect`
(line 92) and re-reads ALL workouts, ALL completed sets, and ALL exercises from
SQLite (94-99), then recomputes ~12 derived sections. `ReadinessCards`,
`VolumeHeatmapScreen` and `ConsistencyScreen` each have their own
`useFocusEffect` loaders that also read all sets. For a long-term user with
thousands of sets, every tab focus reloads and recomputes the full history.
IMPACT: Growing focus latency and redundant SQLite reads as history grows
(this is the Stage D3 concern in the redesign plan, now code-verified).
FIX: (1) Memoise/caching: keep the last load in the store keyed by a cheap
"sets count / max(createdAt)" signature; skip reload when unchanged. (2) Or push
the heavy aggregation into SQL (sum/group-by) instead of pulling every row into
JS. (3) Or page the set read. MEASURE first (add a timing log around `load()`)
to confirm the regression before optimising.
---
ID: ISSUE-008
FILE: package.json
LINE: dependencies/devDependencies
SEVERITY: Low
TYPE: Improvement
DESCRIPTION: 32 npm-audit vulnerabilities (Part 1.3), all dev/build-time, fixable
only via breaking `expo@56` / `react-native@0.85` upgrades. Deferred by the
locked release policy (no new closed-test build until build-out). The `xlsx`
dev-dep (ISSUE-001) has no fix at all.
IMPACT: None shipped today; but the gap widens and the eventual upgrade grows
riskier the longer it is deferred.
FIX: Schedule the Expo/RN upgrade as a single planned effort AFTER the feature
build-out (when a new build ships anyway), not piecemeal. Track it in
`supabase/README.md`-style notes or a CHANGELOG. Separately, replace/pin `xlsx`
in the seed script (ISSUE-001) since that is independent of the app upgrade.
---

> SECTION 6 STATUS: COMPLETE for the verified surface. Additional architecture/
> perf improvements may surface when Part 2 (bulk per-file) and Part 3 (flows)
> run; those are not yet done.

---

## SECTION 4 / PART 3 — FLOW SIMULATION (structural, verified)

Method: extracted all 64 registered routes from RootNavigator.js (5 tab stacks +
WelcomeStack/FirstRunStack/Article9ConsentStack/ProOnboardingStack), then
cross-referenced EVERY `navigate('X')` / `{screen:'X'}` target across all
non-test source. VERIFIED structurally; per-flow interaction-level tracing (every
button, modal open/close animation) would require the per-screen reads of Part 2
and is noted where not done.

### Verified-positive (no finding)
- **No broken navigation.** Every `navigate()`/`screen:` target resolves to a
  registered route or tab name. Zero navigations to a non-existent screen.
  (An initial pass flagged 13 "unknown targets" — all false positives from
  `array.push('…')` / `string.replace('…')`; the navigate-only re-run found
  NONE.)
- **Auth/onboarding/consent gating is sound.** Welcome, Login, FirstRunBranch,
  Article9Consent, ProOnboarding live in root stacks (RootNavigator 357-392)
  rendered conditionally by `renderNavigator` on `firstRunComplete` /
  `healthConsent` / `tier` (417-420+), not via `navigate()`. Reachable.
- **CascadeGate / Paywall / ProUpgrade** (modal presentation) are reachable
  (e.g. CascadeGate from SubscriptionScreen.js:118).

### Findings

---
ID: ISSUE-009
FILE: src/navigation/RootNavigator.js (registrations 243 + 269), src/screens/ExerciseLibraryScreen.js
LINE: RootNavigator.js:243 (PlansStack), 269 (ProgressStack)
SEVERITY: Low
TYPE: Navigation
FLOW AFFECTED: Plans (exercise picking) / Progress
DESCRIPTION: `ExerciseLibrary` is registered as a screen in BOTH PlansStack
(243) and ProgressStack (269) but is UNREACHABLE — VERIFIED: a codebase-wide
search for `navigate('ExerciseLibrary')` / `{screen:'ExerciseLibrary'}` /
any 'ExerciseLibrary' string reference (excluding its own file + the two
registrations + the import) returns NOTHING. No navigation path opens it.
REPRODUCTION: There is no in-app action that routes to ExerciseLibrary; it can
only be reached by an explicit `navigation.navigate('ExerciseLibrary')` that no
code performs.
IMPACT: Dead route + dead screen (ExerciseLibraryScreen.js). Either an intended
entry point is missing (a regression — e.g. an "Exercise Library" button that
was removed) or the screen is obsolete (exercise selection happens elsewhere,
e.g. ManualBuilder/RoutineDetail).
FIX: Decide intent. If the library is wanted, add the entry point (likely a
button in PlansScreen or RoutineDetail/ManualBuilder's add-exercise flow → 
`navigation.navigate('ExerciseLibrary')`). If obsolete, remove both Stack.Screen
registrations (243, 269) and `src/screens/ExerciseLibraryScreen.js`. Confirm
which by checking how exercises are actually added to a routine (read
RoutineDetailScreen / ManualBuilderScreen).

> NOT DONE (Part 3 interaction-level): the brief's 10 named flows
> (cold-start, OAuth signup, onboarding screen-by-screen, plan builder, training
> session log, food logging, etc.) were verified at the NAVIGATION-GRAPH level
> (all targets resolve, no traps in the route table). Step-by-step interaction
> tracing (each CTA, each modal open/close, empty/error states per screen)
> requires reading those screens individually and belongs with Part 2. The
> structural guarantee here is: no flow can navigate to a non-existent screen,
> and only ExerciseLibrary is orphaned.
