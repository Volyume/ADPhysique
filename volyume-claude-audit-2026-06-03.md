# Volyume codebase audit - 2026-06-03

Status: **PART 1 COMPLETE (verified). PARTS 2-6 IN PROGRESS.** Read-only audit;
no code changed. Every figure below is from a command run this session or a
file read this session. Where coverage is partial it is marked explicitly, per
the no-fabrication / no-minimising rules.

Author: Claude (single session, no sub-agents).

---

## Pre-work - file inventory (verified)

Command: `git ls-files` + `find`.
- Total tracked files: **721**
- `src/` files: **405** (all `.js`) = **247 source + 158 test files**
- Supabase migrations: **62** (`supabase/migrate_*.sql`)
- Supabase edge functions: **3** (`supabase/functions/*/index.ts`)
- Docs: **147** `.md`
- Root config: 10 (`App.js`, `index.js`, `babel.config.js`, `metro.config.js`,
  `eslint.config.js`, `tsconfig.json`, `package.json`, `app.json`, `eas.json`,
  `package-lock.json`)

This is a large codebase (247 non-test source files). Part 1 (automated, whole-
repo) is complete and fully verified below. A line-by-line read of all 247
source files (Parts 2-5 deep) was **not** completed in this session; the
verified automated signals that drive those parts are reported, and the
remainder is marked IN PROGRESS with a continuation pointer at the end.

---

# SECTION 1: EXECUTIVE SUMMARY

**Automated analysis (exact counts, from actual command output):**
- **TypeScript (`tsc --noEmit`): 0 errors.** Caveat: the project is JavaScript
  with `tsconfig.json` `checkJs: false`, so `.js` source is **not** statically
  type-checked. 0 errors means "no TS files broke", not "types are sound". A
  true `--strict --checkJs` run is not the project config and would be noise.
- **ESLint (`eslint .`): 798 problems = 0 errors, 798 warnings.**
  Breakdown: **749 `no-unused-vars`**, **49 `react-hooks/exhaustive-deps`**.
- **npm audit: 32 vulnerabilities (1 low, 13 moderate, 18 high).** All are
  transitive through Expo SDK build tooling (`@xmldom/xmldom`, `@expo/plist`,
  `@expo/config-plugins`, `@expo/cli`, `expo`, `cacache`, `send`, `tar`, `uuid`
  chain) plus one app-adjacent: **`xlsx` (high, prototype pollution + ReDoS, no
  fix available)**.
- **Unused dependencies: none removable.** Import-scan flagged 3
  (`expo-build-properties`, `expo-font`, `react-native-screens`); all verified
  legitimately used (config plugin in `app.json:112`; peers of
  `@expo/vector-icons` / react-navigation).

**Issues by severity (this session's verified findings):**
- Critical: 0 (no crash/data-loss/secret found in the automated pass or the
  files read this session).
- High: 1 (`xlsx` advisory, build/devtool scope - ISSUE-002).
- Medium: 2 (49 exhaustive-deps cluster ISSUE-003; 749 unused-vars cluster
  ISSUE-004).
- Low / Improvement: 2 (Expo-tooling vulns ISSUE-001; JS-no-static-typing
  ISSUE-005).

**Top urgent (verified):**
1. ISSUE-003 - 49 `react-hooks/exhaustive-deps` warnings (potential stale
   closures / missed updates), full list in Section 2.
2. ISSUE-002 - `xlsx` high-severity advisory, no upstream fix.
3. ISSUE-004 - 749 `no-unused-vars` (dead code / dead imports).
4. ISSUE-001 - 31 Expo-tooling transitive vulns (clear on SDK bump).

**Flows that failed simulation:** not run this session (Part 3 IN PROGRESS).
Cross-reference: the cardio flows were traced and verified in
`docs/audit/volyume-cardio-qa-2026-06-03/` (same date); no cardio flow failed,
one tier-gating bug was found and already fixed.

---

# SECTION 5: AUTOMATED ANALYSIS RAW OUTPUT (verified)

### 1. TypeScript
```
$ npx tsc --noEmit
(exit 0, no output)
```
`tsconfig.json`: extends `expo/tsconfig.base`, `allowJs: true`, `checkJs: false`,
`skipLibCheck: true`. JS source is not type-checked.

### 2. ESLint
```
$ npx eslint .
✖ 798 problems (0 errors, 798 warnings)
```
By rule: `no-unused-vars` 749, `react-hooks/exhaustive-deps` 49.
CI gate is 0 errors (warnings do not fail CI). The hardcoded-colour, raw-type-
literal, em-dash and machine-tell rules are `error`-level and all pass (0).

### 3. npm audit (verbatim tail + structure)
```
$ npm audit
# npm audit report
@xmldom/xmldom <=0.8.12  (high) - XML injection / DoS, fix via expo@56 (breaking)
  @expo/plist → @expo/config-plugins → @expo/cli → expo (whole Expo build chain)
@expo/metro-config, expo-constants, expo-asset, expo-notifications,
expo-manifests, expo-updates - depend on the vulnerable @expo/config chain
uuid (>=3.0.0 chain) via @expo/bunyan, @expo/rudder-sdk-node, xcode
xlsx * (high) - Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS
  (GHSA-5pgg-2g8v-p4x9). No fix available. node_modules/xlsx
32 vulnerabilities (1 low, 13 moderate, 18 high)
```
Nature: 31 of 32 are Expo SDK build/CLI tooling (dev + prebuild time, not
shipped app runtime); they clear with the next Expo SDK bump. `xlsx` is the only
non-Expo one. Matches the prior survey `docs/audit/npm-audit-survey-2026-06-01.md`.

### 4. Unused dependencies
```
$ for each dependency: grep import/require in src App.js index.js modules
UNUSED? expo-build-properties  → used as app.json config plugin (app.json:112)
UNUSED? expo-font              → transitive peer of @expo/vector-icons
UNUSED? react-native-screens   → required peer of @react-navigation/*
```
Conclusion: no genuinely unused/removable dependency.

---

# SECTION 2: CRITICAL AND HIGH SEVERITY ISSUES

---
ID: ISSUE-001
FILE: package.json (transitive: node_modules/@xmldom/xmldom, @expo/plist, @expo/cli, uuid chain)
LINE: dependencies (expo SDK)
SEVERITY: Low
TYPE: Security / Improvement
FLOW AFFECTED: build / prebuild tooling only (not shipped runtime)
DESCRIPTION: 31 of 32 npm-audit vulnerabilities are transitive through the Expo
SDK build chain (@xmldom/xmldom XML injection/DoS, @expo/plist, @expo/config-
plugins, @expo/cli, cacache, send, tar, uuid). These run at build/prebuild time,
not in the shipped app.
IMPACT: No shipped-app runtime exposure; build-host only. Left unaddressed they
persist as audit noise.
FIX: Bump the Expo SDK at the next planned upgrade (`npm audit fix --force`
installs expo@56, a breaking change - do NOT run mid-release-freeze). Track,
do not force now. No code change.
---
ID: ISSUE-002
FILE: package.json → node_modules/xlsx
LINE: dependencies
SEVERITY: High
TYPE: Security
FLOW AFFECTED: offline seed/export tooling
DESCRIPTION: `xlsx` has a high-severity Prototype Pollution
(GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9) advisory with **no
upstream fix**. Per the prior survey, xlsx is only used by an offline seed
script, not the shipped app.
REPRODUCTION: `npm audit` → xlsx high, no fix available.
IMPACT: If xlsx ever parses untrusted input in the shipped app, prototype
pollution/ReDoS. Confirmed scope (offline script only) makes runtime risk low,
but it is a high-severity advisory in `dependencies`.
FIX: Verify xlsx has no shipped-app import path (`grep -rn "xlsx" src App.js`),
then move it from `dependencies` to `devDependencies` in `package.json`
(prior survey recommendation, not yet applied). If it is only used by
`scripts/`, it should not be a production dependency. Confirm before moving.
---

# SECTION 3: MEDIUM AND LOW SEVERITY ISSUES

---
ID: ISSUE-003
FILE: 27 files (full list below)
LINE: see list
SEVERITY: Medium
TYPE: Bug (potential stale closure) / Code Quality
FLOW AFFECTED: multiple (data loads, animations, auth bootstrap)
DESCRIPTION: 49 `react-hooks/exhaustive-deps` warnings. Each is a hook whose
dependency array omits a value it reads. Most are deliberate (load-once effects,
animation refs that are stable), but each is a potential stale-closure / missed-
update bug and should be reviewed individually. Verified full list (file:line:
missing deps):
- src/components/FeedbackSheet.js:150 - useImperativeHandle missing 'animateOut'
- src/components/PeekMenu.js:56 - missing 'animateOut'; :88 - missing 'backdrop','translateY'
- src/hooks/useProgressData.js:92 - useCallback missing 'load'
- src/navigation/RootNavigator.js:897 - useEffect missing checkFirstRun/checkTier/refreshTierFromCloud/setAuthLoading/setSession/setUser (auth bootstrap; likely intentional run-once)
- src/navigation/RootNavigator.js:1055 - missing 8 animation refs
- src/screens/ActiveWorkoutScreen.js:373,385,439,533,728,742 - 6 effects (handleCancelWorkout, lastActivityAt, infoPulseAnim, loggedSets, + two large dep sets)
- src/screens/BlockReflectionScreen.js:88 - missing mesocycleId,user.id
- src/screens/BodyMetricsScreen.js:386,404,415 - selectedMeasurement, tier, loadHistory/loadRecentIntake/migrateFromAsyncStorage
- src/screens/CascadeGateScreen.js:126,148,163 - toast,variant
- src/screens/CoachHeldHistoryScreen.js:98 - user.id
- src/screens/CoachOutputScreen.js:1207 - units,userProfile,weekStart
- src/screens/CoachReviewScreen.js:242 - loadData
- src/screens/DiaryScreen.js:289,333,449 - toast (x3)
- src/screens/ExerciseDetailScreen.js:80 - loadData
- src/screens/HomeScreen.js:162 - loadData,seeded
- src/screens/LiftProgressScreen.js:55 - loadData
- src/screens/MesocycleBuilderScreen.js:35 - loadAll
- src/screens/PlanDetailScreen.js:42 - loadData
- src/screens/PlanLibraryScreen.js:237,245 - loadData
- src/screens/PlansScreen.js:169 - loadData
- src/screens/ProSetupCompleteScreen.js:48 - opacity,reduceMotion,slideY
- src/screens/RoutineDetailScreen.js:115,131 - loadRoutine, navigation
- src/screens/SubscriptionScreen.js:87,114 - toast
- src/screens/VolumeHeatmapScreen.js:39,41 - loadData
- src/screens/WeeklyCheckInScreen.js:242 - userProfile?.cardioPrescription, userProfile?.cardioTarget; :515 - cycle,hasStepsTarget,showCycle,soreMuscles,stepsManual,stepsSummary.avgSteps,stepsSummary?.registered
- src/screens/WelcomeScreen.js:39 - fadeIn,reduceMotion,slideUp
- src/screens/WorkoutHistoryScreen.js:52 - loadWorkouts
- src/screens/WorkoutSummaryScreen.js:139,143,267,287 - readOnly/routineId/user.id, loadVolumeAndHistory, userProfile?.currentMesoWeek/experience, readOnly/workoutId
- src/screens/YearOfLiftsScreen.js:221 - user.id,yearMs
NOTE (verified, self-introduced this date): WeeklyCheckInScreen.js:242 is the
cardio prefill effect added in the cardio QA; it reads `userProfile?.cardioTarget`
/ `cardioPrescription` with deps `[user?.id]`. Low impact (prefill is best-effort
and userProfile is stable per session), but it is a real omission.
IMPACT: Each is a possible stale value. The `loadData`/`toast`/`navigation`
ones are the common "stable callback referenced in a focus effect" pattern and
are usually safe; the auth-bootstrap (RootNavigator:897) and the large
ActiveWorkout/WorkoutSummary sets warrant individual review.
FIX: Review each individually. For the genuinely run-once effects, add an
eslint-disable-next-line with a one-line reason (the codebase already does this
elsewhere) rather than adding deps that would re-fire. For any that should
react to a value (e.g. WeeklyCheckInScreen:242 reacting to a profile change),
add the dep. Do not blanket-add deps; each needs a judgement call.
---
ID: ISSUE-004
FILE: whole repo (749 instances)
LINE: see `npx eslint .`
SEVERITY: Medium
TYPE: Code Quality / Dead code
FLOW AFFECTED: none directly
DESCRIPTION: 749 `no-unused-vars` warnings. The eslint config allows `^_`
(catch params etc.), so these are genuine unused identifiers: unused imports,
unused destructured values, dead locals. This is the codebase's dead-code
signal (the audit's "dead code detection" item). Enumerating all 749 with
file:line is the continuation work (run `npx eslint .` and grep `no-unused-vars`).
IMPACT: Bundle weight, readability, masks real unused-import drift. No runtime
break (warnings).
FIX: A dedicated dead-code pass: `npx eslint . --fix` removes the safe ones
(unused imports), then hand-review the rest. Not safe to bulk-apply blind during
a release freeze; schedule as its own change.
---
ID: ISSUE-005
FILE: tsconfig.json
LINE: 4 (checkJs: false)
SEVERITY: Low
TYPE: Improvement / Type safety
FLOW AFFECTED: all
DESCRIPTION: The project is JavaScript with no static type checking
(`checkJs: false`). `tsc` therefore reports 0 errors but verifies nothing about
`.js` source. The audit's "type safety" part (any/unknown, assertions, prop
typing) has no surface to check because there are no types.
IMPACT: No compile-time guarantees; class of bugs (wrong prop shape, undefined
access) only caught at runtime or by tests.
FIX: Out of scope for a fix now (would be a large migration). Recorded as the
reason the type-safety audit items return nothing. A pragmatic step is enabling
`checkJs` on a few core lib files with JSDoc, but that is a project decision.
---

# SECTION 4: FLOW SIMULATION RESULTS

**IN PROGRESS - not run this session.** The cardio flows (onboarding opt-in,
log, Plans, Diary, check-in, coach loop) were traced and verified in the cardio
QA on the same date (`docs/audit/volyume-cardio-qa-2026-06-03/cardio-qa-01`...
`-03`): all passed except one tier-gating bug (now fixed). The 10 flows in this
audit's Part 3 (first launch, auth, onboarding, plan builder, training session,
food logging, progress, settings, pro upgrade) remain to be traced in a
follow-up session.

---

# SECTION 6: IMPROVEMENT OPPORTUNITIES

- ISSUE-001 (Expo SDK bump at next upgrade window) and ISSUE-002 (move `xlsx`
  to devDependencies) above.
- ISSUE-004 (dead-code pass) and ISSUE-003 (hook-deps review) above.
- ISSUE-005 (incremental JSDoc/checkJs on core lib) above.
- Dependency health: `npm audit fix --force` would pull expo@56 (breaking);
  defer to a planned SDK upgrade, not the current release freeze.

---

## IN PROGRESS - continuation pointer (multi-session)

**Completed and verified this session:** pre-work inventory; Part 1 in full
(tsc, eslint with rule breakdown + full exhaustive-deps list, npm audit,
unused-deps, dead-code signal); the automated-derived findings (ISSUE-001..005).

**Not yet done (continue here):**
- Part 2 deep: line-by-line read of the 247 source files for logic bugs, null
  checks, race conditions, memory leaks (listener/timer cleanup), performance
  (memo/FlatList keyExtractor/native-driver), hardcoded values, duplicated
  logic, console.logs, long functions/components. START with the highest-traffic
  files: `src/store/useAppStore.js`, `src/lib/database.js` (5500 lines),
  `src/lib/sync/*`, `src/screens/ActiveWorkoutScreen.js`, `App.js`. Use the
  749 `no-unused-vars` and 49 `exhaustive-deps` lists above as the entry points.
- Part 3: trace the 10 user flows in code (auth, onboarding, training, food,
  progress, settings, pro upgrade) and record Pass/Fail/Partial per flow.
- Part 4: security deep-dive - auth token storage (grep `SecureStore`/
  `AsyncStorage` for tokens), API auth headers, Supabase RLS (read every
  `supabase/migrate_*.sql` policy), input validation, hardcoded secrets
  (`grep -rn` for keys), deep-link handlers (`App.js` Linking), sensitive
  console.logs. NONE of these were run this session; do not assume clean.
- Part 5: edge-case simulation (empty/error/offline/null/rapid-tap/large-data)
  per screen.

**Honest scope statement:** this session verified the whole-repo automated layer
and produced the findings that layer supports. It did NOT read all 247 source
files line-by-line, did not run the flow simulations, and did not perform the
security deep-dive. Those sections are marked IN PROGRESS rather than reported
as clean, per the no-fabrication rule. A follow-up session should start from the
"continue here" list above.
