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
  - 466 suites passed.
  - 6,295 tests passed, 5 skipped.
  - 39 snapshots passed.
- `node node_modules\eslint\bin\eslint.js . --max-warnings 0`: pass.
- `node node_modules\typescript\bin\tsc --noEmit`: pass.
- `node scripts\check-imports.cjs`: pass.
  - 881 files checked, no unresolved imports or missing named exports.
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
- `TextField` now provides the first canonical labelled input primitive, with auth fields, first-run setup, Add Custom Food manual/numeric fields, Meal Names, Profile first name, Coaching step target, Volume Heatmap target editor and My Meals rename migrated in safe slices.
- `SearchBar` now supports explicit accessibility labels and loading state, and has replaced the duplicated search chrome in Lift Progress, Exercise Picker, Build Workout picker flows and Food Search.
- `Stepper` now supports compact sizing and explicit accessibility labels, and Manual Builder target controls use it instead of a local +/- implementation while preserving target clamp/coherence rules.
- Goal Change Summary, Food Insights export actions, Plan Update rebuild/confirm actions, Pro Goal Setup rebuild, My Meals rename actions, Cardio Plan log actions, Volume Heatmap target editor actions, Block Reflection CTAs and the inline ProGate upgrade sheet now use the shared `Button` primitive.
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
- Still open: `database.js`, `ProgressPhotosScreen`, `CoachOutputScreen`, sync, and large food/training screens need staged domain refactors.

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
