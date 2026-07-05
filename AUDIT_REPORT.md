# Volyume Audit And Hardening Report

Date: 2026-07-05
Worktree: `C:\Users\Admin\app-physique-scan-hardening-20260704-2329`
Branch: `codex/physique-scan-hardening-20260704-2329`
Source branch: `origin/claude/progress-scan-flagship-20260704`

## Executive Summary

This branch has moved from audit-only into a verified hardening implementation batch. It keeps Volyume's product stance intact: deterministic coach, no AI/chat coach, Physique Scan as a visual progress signal rather than an exact body-fat estimator, and local-first progress photos.

The biggest shipped changes are:

- Visible IA is now `Today / Train / Nutrition / Progress / Coach`, while internal route ids stay stable for deep links, push routing and cross-tab navigation.
- The old visible `You` surface now reads as a deterministic Coach hub, with no chatbot positioning.
- A real Athlete Profile exists with avatar/profile photo, body metrics, manual body-fat entry, Physique Scan state, strength baselines, key lifts, and deterministic freshness prompts.
- Mobile accessibility warning debt is cleared and locked by a zero-warning lint gate.
- Web security/tooling is hardened: Next is on the patched 15.5 line, production audit is clean, lint is noninteractive, and web lint/typecheck/test/build/audit now run in CI.
- Design consistency is materially improved across headers, modal chrome, section labels, first-run/auth text fields, safe-area edges, wizard back controls, profile rows, scan copy and repeated settings/pro surfaces.

The branch is not claiming that every item in the larger 52-item elite register is complete. The remaining work is now clearer: incoming Physique Scan estimator audit, release-artifact checks, backend telemetry migrations, device QA, and larger domain refactors.

## What Was Inspected

- Navigation, root tabs, cross-tab jumps, stack headers and guarded routes.
- Coach hub, weekly review/check-in paths, deterministic copy, and no-AI/no-chat trust stance.
- Athlete Profile, avatar handling, strength standards, body metrics, Physique Scan summary and freshness prompts.
- Progress Photos / Physique Scan capture, storage, deletion, backup table coverage, privacy copy and coach isolation tests.
- Mobile accessibility, theme contrast, token usage, modal/header consistency and touch-label cleanup.
- Web monorepo dependency health, Next 15 migration, Supabase SSR cookies usage, lint config, build, tests and audit.
- CI workflows for root mobile checks and web checks.
- App-store/platform readiness items where source-level checks are possible.

## Commands Run And Results

### Isolation And Git

- `pwd`: confirmed isolated worktree at `C:\Users\Admin\app-physique-scan-hardening-20260704-2329`.
- `git branch --show-current`: `codex/physique-scan-hardening-20260704-2329`.
- `git status --short`: intentional branch changes only.

### Mobile

- `node node_modules\jest\bin\jest.js --runInBand --silent`: pass.
  - 509 suites passed.
  - 6,466 tests passed, 5 skipped.
  - 39 snapshots passed.
- `node node_modules\eslint\bin\eslint.js . --max-warnings 0`: pass.
- `node node_modules\typescript\bin\tsc --noEmit`: pass.
- `node scripts\check-imports.cjs`: pass.
  - 945 files checked, no unresolved imports or missing named exports.
- `node node_modules\expo\bin\cli install --check`: pass.
  - Sentry dependency check skipped by the repo's existing `expo.install.exclude`.
- Focused guard pack passed:
  - `theme.test.js`
  - `accessibilityDesign.guard.test.js`
  - `iaNavigation.guard.test.js`
  - `themeTokens.guard.test.js`
  - `paywallTelemetry.test.js`
  - `athleteProfileSummary.test.js`
  - `profileFreshness.test.js`
- `git diff --check`: pass before the report rewrite; rerun again before commit.

### Web

- `pnpm lint`: pass.
- `pnpm typecheck`: pass from a clean `.next` state.
- `pnpm --filter @volyume/web test`: pass, 20 Vitest tests.
- `pnpm --filter @volyume/web build`: pass on Next 15.5.20.
- `pnpm audit --prod`: pass, no known vulnerabilities.

### Blocked Or Artifact-Dependent Checks

- Android 16 KB ELF page-size validation still needs an actual release APK/AAB/native artifact.
- Store-build `aps-environment`, APNs, remote-notification and binary-protection checks still need release artifacts or store configuration.
- Root `npm audit` was not rerun locally because this shell lacks global `npm`; root CI/release scripts remain npm-based and the web production audit is clean.

## Named Item Ledger

### H1 / JH1: Web Security

Status: closed in this branch.

- Next upgraded from 14.x to patched 15.5.x.
- Supabase server client updated for async `cookies()` in Next 15.
- Web production audit is clean.
- Web CI now runs install, lint, typecheck, Vitest, build and production audit.

### H2: Mobile Accessibility Warning Debt

Status: closed and enforced.

- Cleared the previous ESLint warning backlog.
- Removed generic `Text input field` labels.
- Fixed nested touchable/a11y warning in `RestTimer`.
- Removed unused locals.
- Added `src/__tests__/accessibilityDesign.guard.test.js`.
- Root `lint` now runs `eslint . --max-warnings 0`, and CI uses that gate.

### H3: Package Manager / Tooling Friction

Status: materially improved.

- Root declares `packageManager: npm@10.9.4`.
- Web declares `packageManager: pnpm@11.7.0`.
- Web lockfile/workspace are coherent and CI pins pnpm 11.7.0.
- Remaining caveat: this local shell does not expose global npm, so root `npm audit` remains a CI/release-environment check.

### H4: Android Release Artifact Validation

Status: artifact-dependent.

- `verify:android:16kb` exists and Android workflow already runs artifact validation when APK/AAB artifacts are available.
- No APK/AAB was present in this worktree to validate locally.

### H5: Shared BackHeader / Builder Chrome

Status: materially closed.

- Native headers remain hidden for app screens.
- Workout Summary read-only mode now uses `BackHeader`.
- Nutrition Targets duplicate in-content title was removed.
- Shared section labels now use `SectionLabel` / `type.overline` across the first bounded sweeps: Coach Review, Coach Output, Athlete Profile, Consistency, Lift Progress, settings primitives, Add Custom Food, Food Insights, Goal Change Summary, Coaching Reminders, Analytics, Notification Settings, Log Cardio, Meal Plan grocery categories, curated meal details, calorie banking, readiness cards and Block Reflection. `SectionLabel` now forwards text accessibility props.
- `TextField` now provides the first canonical labelled input primitive, with auth fields, first-run setup, Add Custom Food manual/numeric fields, Meal Names, Profile first name, Coaching step target, Volume Heatmap target editor, Exercise Picker custom name, ReasonPicker free text, My Meals rename, FeedbackSheet optional details, RecipeBuilder form/quantity fields and QuickAdd calorie/macro fields migrated in safe slices.
- `SearchBar` now supports explicit accessibility labels and loading state, and has replaced the duplicated search chrome in Lift Progress, Exercise Picker, Build Workout picker flows and Food Search.
- `Chip` now supports explicit accessibility labels and label style overrides; Settings Profile sex/diet radio groups, Settings Display appearance/energy selectors, Coaching Reminders day/hour selectors, QuickAdd meal slots, QuizScreen option groups and CancelReasonSheet break-window options use it instead of bespoke chips.
- `Stepper` now supports compact sizing and explicit accessibility labels, and Manual Builder / Build Workout target controls plus Settings default rest timer use it instead of local +/- implementations while preserving target/rest clamp rules.
- Goal Change Summary, Food Insights export actions, Plan Update rebuild/confirm actions, Pro Goal Setup rebuild, My Meals rename actions, Cardio Plan log actions, Volume Heatmap target editor actions, Block Reflection CTAs, EmptyDiary quick actions, ProgressPhotoPrompt CTAs, RecipeBuilder save/import actions, QuickAdd cancel/save actions and the inline ProGate upgrade sheet now use the shared `Button` primitive.
- The weekly run pause picker, My Meals rename dialog and inline ProGate upgrade sheet now use the shared `BottomSheet` chrome instead of their own modal/scrim implementations.
- A guard now prevents native header drift.

### H6: Setup-Complete / Reveal Consistency

Status: source-level acceptable, device QA still required.

- No failing source/test evidence remained in this pass.
- Final judgement should come from Android/iOS walkthrough because it is visual motion/layout work.

### M1: Large Module Refactor Seams

Status: partially closed, larger work remains.

- Athlete Profile summary logic was extracted to `src/lib/athleteProfileSummary.js`.
- Freshness logic was extracted to `src/lib/profileFreshness.js`.
- Weekly trailing-window math was extracted to dependency-free `src/lib/weekWindows.js`, with `database.js` preserving the public export and guarded `getWeeklyVolumeByMuscle` call shape.
- Tests/guards cover these seams.
- Still open: `database.js`, remaining `ProgressPhotosScreen` orchestration, `CoachOutputScreen` apply actions, sync, and large food/training screens need staged domain refactors.

### M2: Incoming Physique Scan Estimator Audit

Status: blocked on incoming estimator branch.

- Current branch protects scan trust semantics, deletion, backup, coach isolation and no exact body-fat claim.
- Once the other session lands the actual estimator, audit wiring, confidence, retake/quality scoring, abstention, privacy, wipe/export, and nutrition-floor isolation again.

### M3: Web Build Warning / Next Runtime

Status: closed for this pass.

- Next build now passes on 15.5.x without the earlier Supabase Edge/runtime warning.
- Only webpack cache performance notices remain, not a build/runtime blocker.

### M4: Web Lint Noninteractive

Status: closed.

- Added legacy ESLint configs and `web/scripts/eslint-legacy.cjs`.
- `pnpm lint` runs noninteractively and passes.

### M5: Avatar Local-Only

Status: intentional design constraint.

- Avatar/profile photo is saved locally and removed locally.
- No cloud avatar upload was added.
- This should remain local-only unless a proper media storage/privacy design is explicitly approved.

### M6: Profile Freshness

Status: first implementation complete.

- Athlete Profile now shows deterministic freshness states for body metrics, Physique Scan/photos, and key lifts.
- No notification cadence was added, which is deliberate because recurring physique/photo reminders can become sensitive and need a separate safety decision.

### M7: Binary Protections

Status: release-artifact dependent.

- Source-level checks suggest Hermes/R8 posture is not newly worsened by this branch.
- Final binary protection confirmation needs release builds and store artifact inspection.

### L1: Medical / Safety Disclaimer

Status: present and guarded.

- Coach and privacy surfaces keep non-medical wording.
- Physique Scan copy states it is not medical, not DEXA and not exact body-fat analysis.
- Privacy truth guards pass.

### L2: Permission Strings

Status: founder/release decision.

- Camera/photo flows use privacy-first copy.
- First-capture and permission UX should still be device-walked before store submission.
- iOS still declares linked but currently unused Location/Microphone/Face ID strings. Existing readiness docs already frame this as "reconsider before public review" rather than a code blocker.
- Android permission posture is cleaner: mic/media/system-alert permissions are blocked and camera audio is disabled.

### L3: `aps-environment` / APNs

Status: release-config dependent.

- Needs confirmation on the store/TestFlight build artifact and Apple developer configuration.
- iOS workflow currently answers "No" to push-key setup, so remote push delivery remains APNs credential-dependent.

### L4: `remote-notification` Background Mode

Status: release decision.

- Keep if remote push is intended for v1.
- Remove before store submission only if push is intentionally deferred.

## Implemented Changes

### IA, Coach And Profile

- Visible tabs now read `Today`, `Train`, `Nutrition`, `Progress`, `Coach`.
- Internal route ids remain stable: `HomeTab`, `PlansTab`, `DiaryTab`, `ProgressTab`, `ProfileTab`.
- `YouScreen` is now a Coach hub with rules-based/no-chat copy.
- Added `AthleteProfileScreen`.
- Added local avatar helper in `src/lib/profileAvatar.js`.
- Extracted and tested `buildAthleteProfileSummary`.
- Extracted and tested `buildProfileFreshness`.

### Design And Accessibility

- Added shared `ModalHeader`.
- Converted upgrade/paywall/subscription and Log Cardio modal headers to the shared component.
- Normalised safe-area bottom edges on affected screens.
- Removed duplicate `NutritionTargets` title.
- Added a read-only `WorkoutSummary` header.
- Normalised wizard chevron sizing/colour.
- Tightened `textMuted` dark contrast and added dark-theme contrast tests.
- Added source guards for generic text-input labels, disabled font scaling, native header drift and tab-bar token drift.
- Root lint is now zero-warning.
- Food serving entry is now closer to the shared design system: `ServingPicker` uses `TextField`/`Chip`, and `FoodDetailSheet` uses shared chips, field styling and the secondary `Button` for cancel while preserving the existing macro/save/delete logic.
- Progress before/after sharing now uses the shared `Button` primitive for Share and Save-to-gallery CTAs, keeping the existing safety/privacy/render gates intact while removing another bespoke primary/secondary button pair.
- Workout/PR/weekly Share Card CTAs now use shared outline `Button` controls for Story sharing and Save-to-gallery, preserving the existing export/share handlers and direct share-target tests.
- Plan Library collection filters and division-prep filters now use the shared `Chip` primitive, preserving filtering behavior while removing another local chip grammar from a core Train browse surface.
- Workout History filters now use the shared `Chip` primitive, preserving filter/calendar-reset behavior while removing bespoke chip fill/border/text styling from another Train surface.
- Exercise Picker browse filters now use the same shared `Chip` primitive already used by its custom-exercise create flow, preserving muscle/equipment filter behavior while removing duplicate local chip styles.
- Feedback Sheet sentiment choices and Cancel/Send actions now use shared `Chip` and `Button` primitives, preserving feedback submission, auto-dismiss and privacy copy while removing another bespoke sheet-control cluster.
- Reusable `WindowChips` chart-window control now delegates selected/idle styling to the shared `Chip` primitive while preserving equal-width tab targets and chart-window behavior.
- Body Metrics logging now uses shared `TextField` and `Button` controls for date, weight, body-fat, measurements and notes entry, preserving validation, read-only gating and ED/calm fail-closed behavior while removing raw input/button styling from the form.
- Weekly Check-in now uses shared `Chip`, `TextField` and `Button` primitives for its rating choices, option choices, soreness tags, short fields, notes field, planned-meal confirmation and wizard CTA, preserving deterministic coach inputs, reminder rescheduling, lapsed read-only gating and wellbeing fail-closed behavior.
- Progress Photo viewer note editing and pose selection now use shared `TextField` and `Chip` primitives, preserving local-only metadata writes, photo suppression, delete tier re-checks and compare/reference callbacks while removing bespoke note/pose controls from the flagship Progress surface.
- Today strip morning-weight entry now uses shared `TextField` and `Button` primitives while preserving the compact first-screen cell layout, deep-linked weight editor, trend-door long-press behavior and meal/cardio routing.
- Manual Builder now uses shared `TextField`, `Chip` and `Button` primitives for plan naming, goal/day selection, create/save/draft/activate actions and success-modal actions, preserving superset persistence, day duplication/reorder, edit-mode save behavior and plan activation naming.
- Partner invite and aim flows now use shared `TextField` and `Button` primitives for the empty-state invite CTA, invite-code entry/join action, weekly aim confirmation and invite-journey primary CTAs, preserving privacy receipt copy, one-code minting, invite caps and partner isolation behavior.
- Build Workout now uses shared `TextField` controls for rep-range and starting-weight targets and shared `Button` controls for travel-mode actions, preserving exercise setup, deterministic rest suggestions, Travel/Hotel Gym generation and FlashList picker behavior.
- Exercise Detail target-weight sheet now uses shared `TextField` and `Button` primitives for target weight/date entry and save, preserving goal parsing, achievement detection and chart/helper behavior.
- Workout Summary now uses shared `TextField` and `Button` primitives for session notes, next-time notes, save-template naming, Close/Share footer actions and template modal actions, preserving finish-flow persistence, share-card routing and read-only behavior while removing another bespoke completion-control cluster.
- Pro Goal Setup now uses the shared `TextField` primitive for the optional competition show-date field, preserving the date validation, competition-only visibility and deterministic countdown/checklist wiring while removing a raw input from the paid goal rebuild flow.
- Plans folder create/rename prompt now uses shared `TextField` and `Button` primitives for folder naming, cancel and save/create actions, preserving duplicate-name protection, saving gates, folder tombstone behavior and plan-unfile semantics while removing bespoke modal controls from the Train organisation surface.
- Diary save-meal modal now uses shared `TextField` and `Button` primitives for meal naming and cancel/save actions, preserving saved-meal creation/audit/toast behavior while gating blank Save presses instead of dismissing the sheet with no saved meal.
- Routine Detail exercise-target editing now uses shared `TextField` and `Button` primitives for sets, rep range, rest, starting weight and Save, preserving `updateRoutineExercise` parsing, plan-day editing and swap/add/remove behavior while removing bespoke numeric form controls from a core Train detail surface.
- Nutrition Targets now routes fast-path and full-form numeric fields through a local `NumericField` wrapper over shared `TextField`, covering age, height, weight, body-fat and custom protein inputs while preserving calculation, GDPR consent, saved-target hydration and safety-floor behavior.
- Pro Onboarding now uses shared `TextField` controls for identity/body inputs and shared `Button` controls for wizard Continue CTAs, preserving sex/height/body-weight gates, draft restore, plan-generation sequence, consent routing and source-guarded `canContinue` disabled predicates.
- Active Workout field migration was explicitly trialled and deferred: the note, cluster mini-set and plate-calculator inputs remain lightweight native controls because the 100-tap live-workout stress guard exceeded its 15s budget during the shared-field attempt. Treat Active Workout and `SetEntry` as performance-critical exceptions until a dedicated lightweight logging-field primitive is designed and benchmarked.
- Active Workout was hardened instead: hidden modal bodies now unmount while closed, `SetEntry` is memoized behind a stable current-set handler, and the 20-seed / 2,000-tap fuzz guard is split into four 5-seed tests so the same coverage stays under the suite's 15s per-test budget without increasing the timeout.
- Body Metrics now uses the shared `SectionLabel` primitive for weight, body-fat, measurements, history and recomposition headings, preserving metric logging/trend behavior while removing another local section-title grammar from a sensitive Progress surface.
- Exercise Detail now uses shared `SectionLabel` headings for history, all-time bests, similar exercises and technique notes, preserving chart/history/substitution behavior while tightening Train detail typography.
- Plan Detail and Plans now use shared `SectionLabel` headings for workouts, folders, plan lists, templates, plan rationale, manage actions and plan-start/switch entry points, preserving library/add/activate/edit/start behavior while removing more Train-local section-title styles.
- Share Card and Before/After Share Sheet now use shared `SectionLabel` headings for format, background, preview, PR choice, share includes and scan/photo selection, preserving export/privacy behavior while aligning social-sharing typography with the wider app.
- Volume Heatmap and Routine Detail now use shared `SectionLabel` headings for volume trend and muscle coverage, preserving chart/routine behavior while retiring two more local uppercase label styles.
- Food Insights now separates loading, failed reads and genuinely empty nutrition history: range/target fetches show skeleton cards while loading, a retryable inline error on failure, and existing empty copy only after a successful read.
- My Meals now separates failed saved-meal reads from a genuinely empty saved-meal list and exposes a visible per-row more-actions control for rename/delete, preserving one-tap logging while removing long-press-only management.
- Cardio History now separates loading, failed reads and genuinely empty cardio history, adds a retryable inline error state, and reports failed delete attempts through the standard toast/error-log path instead of silently dropping the failure.
- Volume Heatmap now uses skeleton cards for the initial read and a retryable inline error for failed volume reads, clearing stale heatmap/trend data so failed loads do not masquerade as a valid empty training history.
- Partners now distinguishes failed local partnership reads from a true no-partner state: `usePartners` surfaces an explicit `error` flag and `PartnerScreen` renders a retryable inline error instead of showing the invite pitch on failed reads.
- Progress Photos / Physique Scan orchestration now has a first controller seam in `src/lib/progressPhotosController.js`: photo enrichment, completed-scan filtering, share-item derivation, scan cadence gating, transient scan-photo cleanup, retake cleanup and viewer-delete ordering are covered by pure/unit tests while UI alert/state choreography remains in `ProgressPhotosScreen`.
- Body Metrics database access now lives behind `src/lib/database/bodyMetrics.js`, with `database.js` preserving all existing public exports for screens and sync. The seam covers local metric logging, latest/nearest weight reads, body-composition reads, bulk sync reads, cloud restore column mapping and LWW updated-at lookup with focused repository tests.
- Plan Update and Pro Goal Setup now use the shared `SectionLabel` primitive for plan/goal setup headings, including optional weak-point and show-date labels, with a source guard preventing those high-traffic setup screens from reverting to local heading typography.
- Exercise Detail now separates initial loading from a failed exercise read: skeletons still render while loading, but missing/failed exercise details show a retryable error card instead of an indefinite skeleton/null state.
- Workout History now distinguishes failed history reads from a genuinely empty training log, logging the failure and showing a retryable error state instead of the new-user empty illustration.
- My Recipes now distinguishes failed recipe reads from a genuinely empty recipe list, logs the failure, gives the user a retry action, and uses the shared `Button` primitive for both retry and the empty-state build CTA.
- Paywall, Cascade Gate and Pro Upgrade now share `BillingPeriodSelector` for monthly/annual choice rendering, price loading placeholders, save-badge copy, selected/disabled accessibility state and localised store-price display, removing three duplicated billing-period style blocks from sensitive purchase surfaces.
- Pro Upgrade now uses the shared `OAuthButtons` account-creation surface, matching Login and Pro onboarding platform rules instead of carrying a local Apple/Google button variant.
- Log Cardio now uses the shared `Stepper` primitive for duration, preserving the 5-300 minute range and 5-minute increment while removing a local plus/minus control from the Nutrition/Cardio flow.
- Article 9 and Nutrition Targets now share `ConsentCheckboxRow` for explicit consent controls, preserving locked consent copy, consent state and persistence while removing three bespoke checkbox presentations from legal/body-data surfaces.
- My Recipes now uses the shared `Stepper` primitive for the recipe-serving picker, preserving half-serving increments and the 0.5-20 serving range while removing another bespoke plus/minus row from food logging.
- Block Reflection and Coaching History now use the shared `EmptyState` component for no-data states, preserving copy and load behavior while removing two local empty-card typography blocks from history surfaces.
- Daily Steps and Cardio database access now lives behind `src/lib/database/activity.js`, with `database.js` preserving every existing public export for UI, sync and health imports. Focused repository tests cover local-day injection, clamping, sync scheduling, soft-delete timestamps and cloud timestamp restore.
- Athlete Profile now uses the shared `EmptyState` component for the strength-baseline no-data state, preserving the athlete-profile copy while removing another local empty-card style block.
- Coach Output passive display copy now has a pure `coachOutput/viewCopy` helper and shared `CoachOutputCards` presentation module for date labels, confidence captions, stat chips, ledger, why copy and rapid-loss warning UI. Apply actions, ED/calm safety, load effects and deterministic coach policy remain in `CoachOutputScreen`.
- Active Workout set-entry value parsing and validation now live in `workoutHelpers`, with SetEntry sharing the same duration parser/formatter and log/edit paths sharing the same reps/time/weight validation and normalized weight/reps output. Persistence, PR detection, rest timers and superset flow remain untouched.
- Diary planned/read-only view derivation now lives in a pure `diaryViewModel` helper: read-only filters planned scaffolding, Pro mode keeps it, planned meal count is slot-based, and planned macro totals stay separate from eaten rollups. The async day loader, race guard and write handlers remain in `DiaryScreen`.
- FoodSearch one-food logging paths now share pure `loggingPayloads` builders for entry payloads and slot-recent payloads. The slice deliberately leaves audit events, undo toasts, navigation, saved-meal fan-out, plate logging and double-tap guards in `FoodSearchScreen`.
- Progress Scan display copy now lives in a pure `progressScanCopy` helper, with tests covering score copy, hide-exact mode, suppression, baseline/not-comparable trends, pose labels and weight-stat privacy. Capture, deletion, scan storage, Coach isolation and model analysis remain untouched.
- Progress Photo timeline filtering/grouping now lives in a pure `progressPhotoTimeline` helper, with tests for fixed-width month rows, newest/oldest ordering, inclusive date bounds and pose/date composition. Capture, viewer, compare, share and scan safety behavior remain untouched.
- Progress Photo and Progress Scan date labels now share `progressPhotoDates`, covering full day, compact day and month labels with invalid timestamps returning empty labels. Gallery, viewer, compare, date sheets, scan compare and before/after share date copy now use the same British formatting.
- Progress Scan finish payload shaping now lives in `progressPhotosController`, with tests pinning profile-first precedence, body-profile fallbacks, weight field precedence, training-goal fallback and the exact `darkerSkinOverestimationRisk === true` rule. Live-tier rechecks, database reads and `finishProgressScanSession` remain in `ProgressPhotosScreen`.
- Progress Scan history rendering now lives in `ProgressScanHistoryCard`, with tests covering detailed copy, hide-exact mode, suppression, read-only deletion hiding and thumbnail callback behaviour. `ProgressPhotosScreen` keeps state, refresh, persistence and modal orchestration.
- Progress Scan compare pair selection and view-model derivation now live in `progressScanCompareViewModel`, with tests for completed-scan ordering, default earliest/latest pair, third-selection replacement, pose row ordering and measured delta derivation. `ProgressScanCompare` keeps rendering, suppression and exact-value hiding.
- Before/After share card date, elapsed-time, pair selection, scan-range and draw-params helpers now live in `shareCard/beforeAfterParams`; `BeforeAfterShareSheet` re-exports them for existing tests while keeping native decode/render/share/save, confirmation, Pro gating and suppression behaviour untouched.
- `Card` now forwards accessibility hints/state/test IDs through both static and pressable surfaces, and Athlete Profile rows use a shared accessibility helper so freshness status, guidance copy and Pro markings are available to assistive technology without changing row labels or navigation behaviour.
- `SectionLabel` now owns a title-scale variant, and Nutrition Targets uses it for its form-section headings so the screen keeps its intended hierarchy while heading typography is governed by the shared design primitive.
- Live camera close controls in Barcode Scan and Label Scan now expose the same `Close` accessibility label as their fallback states, keeping the primary camera escape route screen-reader reliable.
- The shared Exercise Picker modal now labels icon-only back/close controls, custom-exercise save/create actions and selectable exercise rows, protecting the workout-building and active-workout picker flows from unlabeled button regressions.
- Radio-style shared selectors now expose `checked` state through `Chip` and `SegmentedControl`, matching the existing `ReasonPicker` radio semantics while leaving non-radio button/toggle selected states unchanged.
- Cardio History date labels, 7-day trend windows, empty-week trimming and spoken trend labels now live in `cardio/cardioHistoryView`, leaving the screen focused on loading, deletion and rendering.
- Plan Library now uses the shared `EmptyState` primitive for both retryable load failures and genuine no-results states, preserving copy and retry behaviour while removing local empty-card typography.
- Coach Review read failures now use the shared retryable `EmptyState` treatment while preserving the deterministic coach safety copy that tells users their sessions are safe and this is not a lost week.
- Plan Folder SQL now lives behind a focused `planFoldersRepository`, with direct tests for creation ordering, sync scheduling, transaction-backed folder deletion/unfiling and cloud tombstone timestamp handling while keeping the public `database.js` API unchanged.
- Year of Lifts, weekly recap, monthly recap and block recap share payloads now use a pure `buildRecapMilestoneData` helper with tests covering each variant and confirming the card stays training-only rather than leaking bodyweight, body-fat, measurements or notes.
- Progress data now exits loading and clears user-scoped state when no signed-in user is present, and the Consistency screen uses shared skeleton/empty-state treatments instead of rendering data-heavy training cards against an empty progress dataset.
- Undo toasts now detect screen-reader users, hold the undo window until the user chooses dismiss or Undo, and expose explicit dismiss/action hints so destructive pending changes are not silently committed by an inaccessible timer.
- Food Search live results now use a latest-request guard so slower older waterfall responses cannot overwrite a newer query, with a regression test that resolves searches out of order and asserts only the newest result remains visible.
- Food Search selected-foods review now uses the shared `BottomSheet` chrome with modal isolation and a labelled header, replacing the hand-rolled bottom `Modal` and local safe-area/backdrop handling.
- Import history now uses the shared `Button` primitive for its CSV pick, confirm, done and secondary actions, removing another bespoke CTA cluster while leaving the Hevy/Strong parser and import flow untouched.
- Workout History now loads its visible page through a bounded `getRecentCompletedWorkouts` query, so large histories do not over-read every workout before applying the 50-session UI ceiling, and set fan-out remains capped to the visible page.
- Profile age handling now uses shared local-date helpers: Nutrition Targets computes age from the saved date of birth with birthday awareness, and Pro Onboarding stores an age-preserving synthetic local DOB instead of a fixed July 1 placeholder when only age is known.
- Web account profile age now follows the same calendar-date principle, parsing date of birth as strict `YYYY-MM-DD` and comparing London calendar parts instead of using elapsed milliseconds from `Date.parse`.
- Workout History now guards overlapping loads with a request token, so a stale mount, retry, refresh or post-delete read cannot overwrite newer loading/error/workout state or fan out set reads for old results.
- Progress Photos refresh now uses a latest-request guard before committing photos, scan entries, suppression state, hide-exact preference, metadata, reference cleanup and loading state, preventing older focus/delete/add refreshes from restoring stale Progress Scan or photo state.
- Coach Output steps, cardio, macro-cycle and refeed apply actions now merge into the latest store profile at tap/write time instead of the render-time `userProfile` snapshot, preventing deterministic coach applies from clobbering concurrent profile edits.
- Food Insights window loads now use a latest-request guard, with an out-of-order regression proving an older 7-day rollup response cannot overwrite the currently selected 30-day nutrition insight window.
- Cardio History now guards focus, retry and post-delete loads with a latest-request token, with a regression proving an older list/trend response cannot repaint over a newer cardio-goal load.
- Volume Heatmap now has a single focus-based load trigger instead of duplicate focus/effect loads, and its volume, trend, freshness, division and landmark commits are guarded so stale profile/window reads cannot repaint the heatmap.
- Coach Held History now fails closed when no user is present or history loading fails, suppressing outcome scorecard/chips and clearing history state instead of merely stopping the loading indicator.
- Partner loading now uses a latest-request guard across local partnership reads, active-count checks, preserved-invite redemption and pair enrichment, with a regression proving older reads cannot overwrite a newer partner state.
- Coach Review now guards weekly review loads with a latest-request token, so a late failure from an older user/retry load cannot replace a newer successful deterministic review with the retry error state.
- Snapshot restore loading now uses a focus-driven latest-request guard, removing the duplicate mount load and preventing an older device-snapshot read from overwriting a newer focused result.
- Pro setup completion now maps ED flag read failures to the shared truthy `read_failed` sentinel before showing dated morning-weight review copy, with source and behavioural guards proving flagged/unknown states stay neutral.
- Shared Progress/Consistency data loading now uses a latest-request guard across its user-scoped async pipeline, so a delayed signed-in read cannot repopulate progress data after sign-out or a newer load.
- Manual Builder's plan-activated confirmation now uses the shared `BottomSheet` chrome instead of a local React Native modal, preserving the plan name and Train routing while bringing the builder success state into the app's sheet system.
- Consistency now distinguishes a failed shared Progress data read from a genuinely empty training account, surfacing a retryable safety-worded error state instead of the first-session prompt when history cannot be read.
- Block Reflection now separates failed block-summary reads from a genuine no-session block, with a guarded retry state and latest-request token so stale reads cannot overwrite newer route/user state.
- Lift Progress now separates failed lift-history reads from a genuine no-lift state, clears user-scoped derived strength data when no user is present, and guards overlapping refreshes so stale lift responses cannot repaint newer results.
- Workout History now distinguishes a genuinely empty training log from a saved history narrowed away by filters or calendar view, showing truthful filter-specific copy and a `Show all sessions` recovery action instead of the first-run empty state.
- Volume Heatmap now explains true first-run/no-set states and selected-window gaps with compact guidance copy, so a zeroed diagram no longer masquerades as a complete volume analysis without context.
- Cardio History now gives the true empty state a direct `Log cardio` action wired to the existing logging route, removing another dead end while preserving Health import copy and retry/delete safeguards.
- My Recipes now uses the shared `EmptyState` primitive for retryable load failures and the genuine first-recipe prompt, preserving build/retry behaviour while removing another local empty-card style cluster from Nutrition.

### Web / CI / Security

- Upgraded web Next and related packages to the patched 15.5 line.
- Migrated Supabase SSR helpers and callers for Next 15 async cookies.
- Added noninteractive web lint config.
- Added web CI job.
- Added `outputFileTracingRoot` to the web Next config.
- `pnpm audit --prod` is clean.

### Conversion Telemetry

- `PaywallScreen` emits `paywall_shown` once per mount.
- `CascadeGateScreen` emits `paywall_shown` once per mount.
- `ProGate` full-screen lock emits `feature_locked_viewed`.
- Added `src/__tests__/paywallTelemetry.test.js` to verify all three behavior paths.
- Client catalogue includes the event and server migration coverage exists in the repo; production usefulness still depends on applying telemetry migrations in Supabase.

### Physique Scan / Privacy

- User-facing copy remains `Physique Scan` and avoids exact body-fat claims.
- Existing tests verify no scan-derived estimate can become an authoritative nutrition safety-floor source.
- Delete/wipe/backup/privacy guards for photos and scan tables pass.
- Coach receives constrained scan context only.

## Product And UX Notes

The IA direction is right for a powerful app that must stay easy to use:

- `Today`: what should I do today?
- `Train`: how do I manage training and sessions?
- `Nutrition`: how do I eat, log and understand targets?
- `Progress`: what is changing?
- `Coach`: what did Volyume decide, why, and what should I update?

The risk is no longer that Volyume lacks power. The risk is that power becomes scattered. The next UX work should keep building layered simplicity: strong tab homes, consistent section grammar, one modal language, predictable rows, and clear profile/freshness prompts without nagging.

## Remaining High-Value Work

### Safe Implementation Candidates

1. Continue the "one product" design sweep:
   - migrate remaining plain inputs to `TextField` in small screen-level slices, especially body metrics, weekly check-in and nutrition target forms;
   - continue `SearchBar` adoption in remaining low-risk browse/search surfaces now that explicit labels and loading state are supported;
   - remaining hand-rolled CTAs to `Button` in smaller low-risk surfaces, avoiding live workout/session flows until a dedicated pass;
   - remaining hand-rolled sheets to `BottomSheet`, avoiding Active Workout and Progress Photos until a dedicated state-aware pass;
   - finish any remaining ad hoc section-label callers only where they are pure typography and not coupled to complex live-session/photo state.
2. Add shared loading/error/empty states so failed reads do not look like empty accounts.
3. Finish state/dead-end surfaces: Partners error branch, Consistency/VolumeHeatmap loading-empty-error, FoodInsights loading, CardioHistory controls, and MyMeals edit/create clarity.
4. Extract Progress Photos / Physique Scan orchestration into a controller module with tests.
5. Split `database.js` by domain behind the existing public API.
6. Device-walk Coach, Athlete Profile, Progress Photos/Physique Scan, Nutrition, Train and settings for text wrapping, hit targets and visual consistency.

### Needs Founder Decision

- Recurring physique/photo reminders.
- Photo backup/export beyond local/device-owned behavior.
- Event prep modes beyond safe goal/date guidance.
- Any billing/paywall claim/proof changes.
- Bigger partner/social loops.

### Needs External Artifact Or Backend State

- Android APK/AAB 16 KB page-size validation.
- iOS APNs / `aps-environment` confirmation.
- Binary protection inspection.
- APNs send-key / remote-push credential setup if remote push ships in v1.
- Telemetry migrations `092-104` applied in Supabase EU-Dublin.
- Store screenshots and final metadata.
- Incoming Physique Scan estimator branch.
- Native Physique Scan/TFLite path on real Android and iOS devices.

## Recommended Next Implementation Plan

1. Merge/push this hardening branch after review and device QA.
2. Rebase onto the incoming Physique Scan estimator branch and run the scan-specific audit.
3. Complete the design-system sweep in small batches: inputs, buttons, remaining section-label callers, sheets, load states.
4. Extract Progress Photos / Physique Scan controller.
5. Extract `database.js` by domain, starting with progress photos/scans and body metrics.
6. Build only safe guided prep layers first: holiday/photoshoot/contest date planning with rate limits, honesty, no dehydration/peak-week manipulation, and explicit trained-eye boundaries.

## Suggested Follow-Up Codex Tasks

1. `Audit and harden the incoming Physique Scan estimator branch. Verify exact current source behavior, then add tests for confidence, abstention, quality scoring, Coach isolation, no exact body-fat percentage claims, backup/export/delete, and privacy copy.`
2. `Continue the Volyume design consistency sweep: migrate any remaining ad hoc section labels, canonical inputs, remaining Button migrations, and remaining BottomSheet migrations. Keep lint, typecheck, imports, Jest and web checks green.`
3. `Extract ProgressPhotosScreen scan orchestration into a pure controller/helper module with tests, preserving UI behavior and all safety/privacy gates.`
4. `Split src/lib/database.js into domain modules behind the current public API. Start with progress photos/scans and body metrics. Add compatibility tests before moving callers.`
5. `Design a safe guided prep layer for holiday prep, photoshoot prep and responsible contest-prep support. No dehydration, diuretic, sodium/water manipulation, or coach-replacement claims.`

## Blockers And Assumptions

- Assumption: Volyume's coach remains deterministic and explainable; no AI coach/chat recommendations.
- Assumption: Physique Scan outputs visual leanness, confidence and progress signal, not exact body-fat percentage.
- Blocker: final scan-estimator audit waits for the incoming branch from the other session.
- Blocker: release-artifact checks need APK/AAB/TestFlight/store artifacts.
- Blocker: telemetry migration state needs Supabase/project access.
- Assumption: avatar/profile photo remains device-local until a media-storage privacy design is approved.
