# S4 — Technical Debt & Implementation Risk Audit

Scope note: read-only audit, ~20-minute runtime budget. Where a finding
needed exhaustive enumeration (e.g. every dead file, every duplicated
snippet) I sampled with targeted greps rather than reading every one of the
~250 source files line-by-line; each finding below states its evidence
basis so a follow-up pass can go deeper if the founder wants it.

## Executive summary (10 lines)

1. The sync layer is now table-complete on the registry/transport engine for
   all 21 `SYNC_REGISTRY` entries, but the FREE-tier core domain (workouts,
   exercises, programmes, routines, PBs) is still 100% on legacy `sync.js` —
   the exact opposite of what "gating is Pro=nutrition" would suggest is the
   risky half.
2. A third weight-tracking pathway (`morning_weights`, local + cloud table)
   exists entirely outside `SYNC_REGISTRY`/`SYNC_ARCHITECTURE_LOCKED.md`,
   pushed/pulled only via legacy per-call functions — a real "the locked
   spec doesn't describe what ships" gap.
3. `useAppStore.js` is a 1,841-line god-object: 82 `set()` call sites, 59
   direct `AsyncStorage.*` calls and ~15 hand-declared persistence key
   constants living inside the store file itself, with no `persist`
   middleware or slice boundaries.
4. Design-system adoption is uneven: only 14/80 screens import `Card`,
   16/80 import `BackHeader`, 21/80 import `Button`, while 64/80 hard-code
   `backgroundColor: colors.surface` inline. The Progress Photos surface's
   five modals/sheets (2,597 lines combined) import zero design-system
   components.
5. `schema.sql` / `setup_complete.sql` are confirmed stale (missing
   `plan_folders`, added well before migration 096).
6. CLAUDE.md's own architecture-facts section is drifted: it states "96
   files" for cloud migrations; the repo actually has 99.
7. `main-ci.yml` (the PR gate) runs Jest, ESLint and Expo Doctor only — it
   never runs `typecheck`, `check:imports`, or `release:check`, even though
   CLAUDE.md calls `release:check` "the final arbiter." `release:check` /
   `release:audit` only appear in `build-android.yml`.
8. Zero literal `TODO`/`FIXME`/`XXX:` markers found in `src/` — genuinely
   clean in that respect (see "already good").
9. Riskiest-file ranking is dominated by `database.js` (7,255 lines, 249
   exports, ~98 importers) and `useAppStore.js` (1,841 lines, ~121
   importers) — any change to either has the widest blast radius in the app.
10. No dependency- or billing-adjacent debt found that would require
    stopping under the ED-safety/billing/identity inviolable-constraint
    rules; nothing here recommends touching those systems.

---

## 1. Sync migration state — dual-system risk surface

**Title:** Registry engine covers all locked tables; the FREE-tier workout
core still runs entirely on legacy `sync.js`.
**Area:** src/lib/sync/, src/lib/sync.js
**Severity:** P1
**Evidence:**
- `src/lib/sync/tables/transport.js:74-96` — `MIGRATED_TABLES` (all 21
  `SYNC_REGISTRY` entries, `src/lib/sync/registry.js:22-230`) are wired
  through per-table handlers.
- `src/lib/sync.js:660-1034` — legacy push helpers still own
  `_pushProgrammes`, `_pushRoutinesAndExercises`, `_pushMesocycles`,
  `_pushMorningWeights`, `_pushCoachOutputs`, `_pushExerciseUserNotes`,
  `_pushUserBodyProfile`, `_pushUserInsights`, `_pushWorkoutNotes`,
  `_pushExerciseGoals`, `_pushPeakWeekPlans`, `_pushPlannedMuscleVolume`,
  `_pushAdaptationEvents`, plus `syncWorkout`/`syncExercises` (top of file).
  None of these tables are in `SYNC_REGISTRY`.
- These are exactly the tables backing the FREE feature set (Plan Library,
  builder, workout logging, exercise library, PBs) per CLAUDE.md §2.
**User impact:** the free core has no registry-driven conflict strategy,
no soft-delete tombstone contract, and no regression-matrix coverage of the
kind `sync.regressionMatrix.test.js` gives the migrated tables — a
multi-device conflict here (e.g. editing a routine on two phones) resolves
by whatever ad hoc logic each legacy `_push*`/`_pull*` function happens to
implement, not a documented strategy.
**Business impact:** the free tier is the top-of-funnel; a workout-logging
sync bug is highest-visibility and hits the largest user cohort.
**Complexity:** L (full migration of ~13 legacy tables to the registry,
per the same table-by-table pattern already used).
**Options:**
1. Do nothing now — legacy code is stable and shipping; log as backlog.
2. Migrate the highest-traffic legacy table (`workouts`/`workout_sets`)
   next, following the existing per-table playbook, before touching lower
   ones.
3. Write a regression-matrix test suite for the legacy tables equivalent to
   `sync.regressionMatrix.test.js`, without moving them onto the registry
   yet, to at least pin current behaviour before further build-out.

**Title:** `morning_weights` is a third weight-tracking pathway invisible to
the locked spec.
**Area:** src/lib/database.js, src/lib/sync.js
**Severity:** P2
**Evidence:** `src/lib/database.js:4386-4444` (`logMorningWeight`) writes to
a local `morning_weights` table and fire-and-forgets
`syncMorningWeight` (`src/lib/sync.js:490-512`) to a cloud `morning_weights`
table; pulled back at `src/lib/sync.js:1716-1731`. Separately,
`src/lib/sync/tables/weightLog.js:1-24` documents `weight_log` as an
intentional no-op alias of `body_composition_log`. `morning_weights` appears
in neither `SYNC_REGISTRY` (`registry.js`) nor
`docs/SYNC_ARCHITECTURE_LOCKED.md` (confirmed absent via grep).
**User impact:** none observed today (push+pull both exist), but the
"locked" architecture document is not an accurate map of what ships — a
future engineer trusting the registry as canonical will miss this pathway
entirely when reasoning about weight-data behaviour.
**Business impact:** low now; grows if anyone edits weight sync relying on
the locked doc being complete.
**Complexity:** S (documentation) / M (if folded into the registry).
**Options:**
1. Add `morning_weights` to `SYNC_ARCHITECTURE_LOCKED.md` as an explicitly
   out-of-registry legacy table (cheapest, no behaviour change).
2. Fold it into `SYNC_REGISTRY` as its own entry with a dedicated
   transport handler.
3. Leave as-is, flag as known debt only.

## 2. Store: god-object evidence

**Title:** `useAppStore.js` mixes session state, cross-cutting persistence
orchestration, and ad hoc AsyncStorage key management in one 1,841-line
file.
**Area:** src/store/useAppStore.js
**Severity:** P2
**Evidence:** file is 1,841 lines; 82 `set(` call sites; 59
`AsyncStorage.*` call sites; ~15 module-level key constants defined at the
top of the file itself (`FIRST_RUN_KEY`, `PROFILE_KEY_PFX`,
`PROFILE_TIMESTAMPS_KEY_PFX`, `TIER_KEY`, `TRIAL_STATE_KEY`,
`PRO_TRIAL_ENDS_KEY`, `PAID_VERIFIED_AT_KEY`, `ACTIVE_WORKOUT_KEY`,
`WORKOUT_PREFS_KEY`, lines 13-53); `_persistActiveWorkout` (line 89) and
`pushPrefSoon` (line 144) are persistence-orchestration helpers living
inside the store module rather than a dedicated persistence layer. No
`zustand/middleware` `persist` wrapper is used — persistence is hand-rolled
per key.
**User impact:** none directly; this is a maintainability/regression-risk
concern, not a live bug.
**Business impact:** every new session/tier/consent feature has to touch
this file, raising the chance of an unrelated regression (e.g. an ED-flag
or consent change breaking tier resolution because both live in the same
1,841-line surface with 121 importers across the app).
**Complexity:** L to properly split into slices; CLAUDE.md's own
"touch only what the task requires; no drive-by refactors" rule means this
should not be tackled opportunistically.
**Options:**
1. Leave as one store (current state) — Zustand's own docs don't mandate
   slicing, and CLAUDE.md explicitly names this a known ~1,700-line file.
2. Extract the AsyncStorage key constants + raw get/set helpers into a
   dedicated `src/lib/storeKeys.js` (no behaviour change, pure move) as a
   low-risk first step.
3. Full slice-per-domain refactor (session/tier/consent/units as separate
   Zustand slices combined via `combine`/`subscribeWithSelector`) — highest
   value, highest regression risk given 121 call sites depend on the
   current shape.

**State duplicated between store and DB:** `TIER_KEY`/tier state is kept in
both AsyncStorage (via the store) and `tier_history` (registry,
server-authoritative, pull_only per `registry.js:137-144`) — this is
intentional caching (store = fast local read, DB/cloud = source of truth)
rather than accidental duplication, and is consistent with the "Store holds
session/derived state, never bypasses the DB" architecture fact in
CLAUDE.md. No unintentional duplication found in the time available;
flagging as verified-clean rather than a finding.

## 3. Design-system adoption debt

**Title:** Card/BackHeader/Button adoption is a minority pattern; Progress
Photos surfaces are fully hand-rolled.
**Area:** src/screens/, src/components/
**Severity:** P2
**Evidence (counts, 80 screens / 69 components total):**
- `Card` imported by 14/80 screens.
- `BackHeader` imported by 16/80 screens.
- `Button` imported by 21/80 screens.
- `backgroundColor: colors.surface` written inline in 64/80 screens (a
  proxy for hand-rolled card-like boxes rather than the `Card` component).
- 8 screens hand-roll a back header (`chevron-back`/`arrow-back` icon
  present) without importing `BackHeader`:
  `WorkoutHistoryScreen.js`, `WeeklyCheckInScreen.js`,
  `FreeStarterScreen.js`, `CoachOutputScreen.js`, `CardioHistoryScreen.js`,
  `ProOnboardingScreen.js`, `DiaryScreen.js`, `QuizScreen.js`.
- **Partners surface:** `PartnerScreen.js` (1,093 lines) does import
  `Card`/`BackHeader` once each, but its two sub-components,
  `PartnerRow.js` (55 lines) and `PartnerPrivacyReceipt.js` (142 lines),
  import none of Card/BackHeader/Button.
- **Progress Photos surface (worst offender, verified with numbers):**
  `ProgressPhotosScreen.js` (623 lines) does import all three. But its five
  modals/sheets — `ProgressPhotoViewer.js` (522 lines),
  `ProgressPhotoCompare.js` (662 lines), `ProgressGhostCapture.js` (579
  lines), `BeforeAfterShareSheet.js` (653 lines), `PhotoDetailsSheet.js`
  (181 lines) — a combined 2,597 lines — import **zero** of
  Card/BackHeader/Button between them, and use raw inline
  `colors.surface` styling (2, 6, 0, 6, 3 occurrences respectively).
**User impact:** visual inconsistency risk (spacing/colour drift) in
exactly the surfaces (Progress Photos) that CLAUDE.md flags as having a
founder-approved but delicate exception for bodyweight display under calm
mode/ED-flag gating — hand-rolled styling means that gating logic and
visual treatment aren't reviewed through the same component the rest of
the app uses.
**Business impact:** slower to restyle/rebrand; higher chance a themed
token change misses these files.
**Complexity:** M (mechanical swap-in per file, one file at a time,
respecting "no drive-by refactors").
**Options:**
1. Leave as-is; these are working, shipped, tested surfaces.
2. Retrofit only the 5 Progress Photos modals/sheets onto Card/BackHeader/
   Button as a scoped, reviewed piece of work (bounded, high signal given
   they're named as suspected worst offenders).
3. Add an ESLint rule (or extend `check:imports`) flagging new files that
   use `colors.surface` inline without importing `Card`, to stop the debt
   growing further, without retrofitting existing files.

## 4. Dead/stale code

**Title:** `schema.sql` / `setup_complete.sql` confirmed stale.
**Area:** supabase/
**Severity:** P3 (already flagged as known-stale by CLAUDE.md itself)
**Evidence:** `plan_folders` (added via a migration before `migrate_096`)
appears in zero of `supabase/schema.sql` / `supabase/setup_complete.sql`.
`setup_complete.sql` was last touched 2026-07-01, `schema.sql` 2026-06-12,
while migrations run through `migrate_102` (99 files total).
**Impact:** low — CLAUDE.md already tells readers migrations are canonical
and these are stale snapshots; this confirms that statement is accurate.
**Options:** delete the snapshots, regenerate on a schedule, or leave as
historical reference (founder call, not urgent).

**Title:** Zero TODO/FIXME/XXX markers in `src/`.
**Severity:** N/A — this is a "what's already good," not a finding. Full
`grep -rn "TODO\|FIXME\|XXX:" src` returned zero hits outside test files.

**Title:** Dead-file / unused-dependency sweep — clean on dead files, one
confirmed unused dependency.
**Severity:** P3
**Evidence:** background sub-agent (Explore, sonnet) cross-referenced all
404 candidate files under lib/components/hooks/navigation/screens/store
against every relative import/require by path resolution (not basename
grep): every file resolves to at least one importer, corroborated by the
repo's own `scripts/check-imports.cjs` gate (`release:check`) reporting
823 files with no unresolved imports. No 5+-line commented-out disabled
code blocks found in `src/lib`/`src/screens` (a looser heuristic's ~737
hits were all legitimate "why" rationale comments on manual inspection).
`package.json` dependency `@gorhom/bottom-sheet` (`"^5.2.14"`) has zero
references anywhere in `src/`, `app.json`, or `babel.config.js`, confirmed
by direct grep — the app has its own `src/components/BottomSheet.js`
instead. Possible false-positive candidates not confirmed either way:
`expo-font`, `expo-system-ui`, `react-native-nitro-modules`,
`react-native-screens` (commonly pulled in transitively by
Expo/react-navigation/Skia without a direct source import, so absence of a
direct import doesn't prove they're removable).
**Impact:** none functionally; `@gorhom/bottom-sheet` is shipped dead
weight in the bundle.
**Options:**
1. Leave it — per "never add dependencies without asking," the mirror rule
   (never remove one without asking either) suggests this needs an
   explicit founder decision too, even though removal looks safe.
2. Remove `@gorhom/bottom-sheet` from `package.json` in a small, isolated
   change once confirmed unused by a full `npm ls`/bundle check.

## 5. Config/docs drift

**Title:** CLAUDE.md's own migration-file count is stale.
**Area:** CLAUDE.md, supabase/
**Severity:** P3
**Evidence:** CLAUDE.md states "`supabase/migrate_NNN_*.sql` (96 files...)";
actual count is 99 files (`ls supabase/migrate_*.sql | wc -l` = 99, latest
`migrate_102_partner_safety_consent.sql`).
**Impact:** cosmetic; doesn't change any behaviour or gate, but is exactly
the kind of drift the founder's "work from SOURCE documents" rule exists to
catch.
**Options:** correct the count next time CLAUDE.md is touched for another
reason; not worth a standalone edit given "touch only what the task
requires."

**Title:** PR-gate CI (`main-ci.yml`) does not run `typecheck`,
`check:imports`, or `release:check`, despite CLAUDE.md calling
`release:check` "the final arbiter."
**Area:** .github/workflows/main-ci.yml vs package.json vs CLAUDE.md §4
**Severity:** P1
**Evidence:** `package.json` scripts: `start, android, ios, test, lint,
lint:fix, typecheck, check:imports, release:check, release:audit`.
`.github/workflows/main-ci.yml` jobs run `npx jest --runInBand --ci`
directly (not `npm test`), `npm run lint`, and `npx expo-doctor` only —
no `typecheck`, `check:imports`, `release:check`, or `release:audit` step
anywhere in that file. `release:check`/`release:audit` only appear (via
grep) in `.github/workflows/build-android.yml`.
**User impact:** none directly, but a PR could merge to main with a
JSDoc/type error or an import-boundary violation (whatever
`check:imports` guards) that only surfaces later in the Android build
workflow, or not at all if that workflow isn't run on every change.
**Business impact:** weakens the "CI (release:check) is the final
arbiter" guarantee CLAUDE.md asserts for the merge-to-main gate.
**Complexity:** S (add steps to an existing workflow) — but per workflow
rules, this is a "state assumptions, plan first" change, not a drive-by fix.
**Options:**
1. Leave as-is if `release:check`/`typecheck`/`check:imports` are
   intentionally reserved for the release/build pipeline rather than every
   PR (founder may want fast PR CI and a heavier release gate).
2. Add `typecheck` and `check:imports` to `main-ci.yml` as they're fast,
   static checks well-suited to a PR gate.
3. Add `release:check` to `main-ci.yml` too, matching CLAUDE.md's stated
   guarantee literally.

## 6. Duplication (top candidates found, not exhaustive)

1. **Weight-unit conversion constant hard-coded once outside `units.js`:**
   `src/lib/database.js:3828` computes `r.weight * 2.20462` inline for a
   lift-history display row, instead of calling `kgToLbs()` from
   `src/lib/units.js:29`. Single instance found (not widespread) — low
   severity, easy fix, flagged rather than fixed per audit scope.
2. **Direct `toLocaleDateString` calls:** 15 files call
   `.toLocaleDateString()` directly rather than through a shared formatter;
   the app already has `src/lib/dayKey.js` for local-day keys, but display
   formatting isn't centralised the same way. Not counted file-by-file in
   the time available — flagged as a candidate, not a confirmed count of
   divergent formats.
3. **`Alert.alert` bypassing the wrapper:** 2 files call `Alert.alert`
   directly rather than via the `AppAlert` component/wrapper found in
   `src/components/` — small (2 instances), low severity.
4. **Empty-state markup:** already substantially centralised —
   `src/components/EmptyState.js` and `src/components/food/EmptyDiary.js`
   exist as shared components; 21 files reference empty-state-ish text,
   but a genuine duplication count would require checking how many of
   those 21 use the shared component vs hand roll one — not completed in
   this pass, flagged as a scope cut.
5. **Registry table `weight_log` duplication-by-design:** not a bug, but
   worth naming as "duplication that looks like debt but isn't" —
   `weightLog.js` intentionally no-ops because `body_composition_log`
   already owns the same rows (see finding in §1); a future reader could
   mistake this for dead code and "fix" it by writing real push/pull logic,
   causing double-pushes. Comment already warns against this
   (`weightLog.js:11-15`) — flagged so reviewers don't miss the comment.

## 7. Riskiest files (ranked, churn proxy = size x fan-in x domain criticality)

| # | File | Lines | Rough importer count | Why it's risky |
|---|------|-------|----------------------|-----------------|
| 1 | `src/lib/database.js` | 7,255 | ~98 | All local reads/writes + schema; 249 exports; touches every domain including ED-safety-adjacent tables. |
| 2 | `src/store/useAppStore.js` | 1,841 | ~121 (highest fan-in in repo) | Session/tier/consent/units all in one file; any edit risks cross-domain regression (see §2). |
| 3 | `src/navigation/RootNavigator.js` | 1,554 | single entry point (import count low but blast radius total) | Routes by auth state, Article 9 consent, first-run, tier — an ordering bug here is a GDPR-gate or paywall bypass. |
| 4 | `src/lib/sync.js` | 1,800 | ~15 | Legacy sync for the entire free-tier workout domain (§1); no registry-level regression matrix. |
| 5 | `src/lib/planEngine.js` | 2,310 | ~4 direct, but feeds the coaching engine | Deterministic-engine constraint (CLAUDE.md §2) means any change risks silently altering MEV/MRV/MAV output for identical inputs. |
| 6 | `src/lib/weeklyCoach.js` | 1,537 | ~5 | Orchestrates the weekly coaching run; ED-safety floors are re-enforced downstream in `coachApply.js` — a bug here has a direct path to a safety-relevant output. |
| 7 | `src/lib/nutritionEngine.js` | 1,175 | ~10 | BMR/TDEE/macro math; houses the calorie floors and FFM/rapid-loss gates named as untouchable in CLAUDE.md §2. |
| 8 | `src/lib/food/db.js` | 1,669 | ~21 | Parallel "second `database.js`" for the whole food domain (Pro-gated, highest-revenue surface). |
| 9 | `src/lib/sync/runner.js` | 396 | small file, but is the single dispatch point for all 21 registry tables | A bug here has the widest sync blast radius even though the file is short. |
| 10 | `src/lib/payments/cascade.js` (not line-counted this pass) | — | — | Named explicitly in CLAUDE.md as the trial→downgrade cascade; billing changes require a written test plan per `docs/rules/billing.md` — flagged by criticality, not by size/fan-in metrics. |

## What is already good

- Zero literal TODO/FIXME/XXX markers anywhere in `src/`.
- The sync registry (`registry.js`) is well-commented, cites its locked
  source doc line ranges, and its 21 entries all have working
  push/pull/no-op handlers wired through `transport.js` with a dedicated
  regression-matrix test suite (`sync.regressionMatrix.test.js`) that
  explicitly asserts every registry table is in `MIGRATED_TABLES`.
- `weightLog.js`'s intentional no-op is self-documenting about *why* it's
  a no-op, pre-empting a "helpful" but harmful fix.
- Shared `units.js` and `EmptyState.js`/`EmptyDiary.js` components already
  exist and are used in the majority of cases — duplication found was the
  exception, not the norm.
- CI already runs Jest + ESLint + Expo Doctor on every PR/push, with a
  genuinely useful failure-surfacing mechanism (auto-posts Jest failures to
  the PR and to `$GITHUB_STEP_SUMMARY`) — a real, working safety net, just
  not a complete one against `package.json`'s full script list (§5).
- Product/domain naming discipline is consistent (`Screen.js` suffix,
  `lib/camelCase.js`) with no naming-convention violations spotted while
  sampling ~30 files across this audit.

## Explicit scope cuts (given the 20-minute budget)

- Duplication counts in §6 items 2 and 4 are candidate counts, not verified
  divergence counts (didn't diff the actual formatting/markup logic
  file-by-file).
- Riskiest-files ranking uses a fast proxy (line count + grep-based
  fan-in), not real git churn/blame data — a `git log --stat` based churn
  ranking would be more rigorous and is a good follow-up.
