# Volyume Audit And Hardening Report

Date: 2026-07-04
Worktree: `C:\Users\Admin\app-physique-scan-hardening-20260704-2329`
Branch: `codex/physique-scan-hardening-20260704-2329`
Source branch: `origin/claude/progress-scan-flagship-20260704`

## Executive Summary

This pass moved from audit into implementation. The app now has the source-led IA direction that came out of the audit: visible tabs are `Today / Train / Nutrition / Progress / Coach`, while internal route ids remain stable for deep links, push routing and cross-tab navigation.

The former visible `You` tab is now a deterministic `Coach` hub. It explicitly avoids AI/chat positioning and gives users direct access to weekly check-in, latest review, goal/phase updates, nutrition targets, coaching reminders, safety settings, methodology, partners, settings and the new athlete profile.

The new athlete profile gives Volyume a proper user identity surface: profile photo/avatar, session count, latest weight, manual body-fat entry, Physique Scan state, strength baseline summary, key lifts against standards, and reminders/shortcuts for body metrics, progress photos, scan retakes and lift progress.

Progress Photo / Progress Scan has been hardened and renamed in user-facing copy to `Physique Scan`. The implementation now treats the feature as a visual leanness/progress signal rather than a defensible exact body-fat percentage. Live-tier write rechecks were added throughout capture, library import, guided scan progression, retake and deletion flows. Scan assets are included in local backup table coverage, and delete order now avoids orphaned scan rows when photo files or metadata cleanup partially fails.

Privacy, support, app store and public policy copy were aligned with actual behavior: progress photo image files stay device-local unless the user chooses to share/export; JSON backups include database records/metadata, not private image files; Physique Scan is not a DEXA scan, diagnosis or exact body-fat estimator.

The mobile app verification is strong: full Jest, typecheck, import check, Expo dependency check and ESLint all complete. Remaining risks are mainly dependency/security/tooling and broader UX debt: web Next.js advisories, 63 existing ESLint warnings, package-manager friction, no APK/AAB release artifact for Android page-size validation, and large legacy modules that still need staged refactors.

## What Was Inspected

- Mobile app navigation, root tab IA and profile/coach stack.
- Coach surfaces, deterministic-coach wording and no-chat/no-AI trust stance.
- Athlete profile concept and body data/lift baseline integration.
- Progress Photos, guided capture, Physique Scan sessions/assets, scan analysis copy, scan-to-coach isolation and deletion semantics.
- Privacy, consent, support, store listing and public web copy around photos, backups, export/delete and health data.
- Design consistency on top-level Coach/Profile/Train/Progress surfaces.
- Mobile tests, typecheck, import checks, lint, Expo install validation and package audit.
- Web app install/build/typecheck/test/lint/audit state.
- Secret/config exposure at filename level without printing candidate values.

## Commands Run And Results

### Isolation And Git

- `pwd`: confirmed isolated worktree at `C:\Users\Admin\app-physique-scan-hardening-20260704-2329`.
- `git branch --show-current`: `codex/physique-scan-hardening-20260704-2329`.
- `git status --short`: intentional source/doc/test changes plus new files only.
- Generated root `pnpm-lock.yaml` and `pnpm-workspace.yaml` from an earlier root pnpm probe were removed because the repo tracks `package-lock.json` at root and those pnpm files are not tracked.

### Mobile Root Checks

- `node node_modules/jest/bin/jest.js --runInBand --silent`: pass.
  - 462 test suites passed.
  - 6,273 tests passed, 5 skipped.
  - 39 snapshots passed.
- `node node_modules/typescript/bin/tsc --noEmit`: pass.
- `node scripts/check-imports.cjs`: pass.
  - 872 files checked, no unresolved imports or missing named exports.
- `node node_modules/eslint/bin/eslint.js .`: pass with warnings.
  - 0 errors.
  - 63 warnings, mostly existing `react-native-a11y` missing descriptor warnings plus two unused locals.
- `expo install --check`: pass.
  - Sentry check skipped by existing `expo.install.exclude`.
- `node scripts/verify-android-elf-page-size.cjs`: not runnable without arguments.
  - Script requires an APK, AAB, directory or `.so` path.
  - No app release artifact was present in the worktree to validate.

### Security And Dependency Audit

- Filename-only env scan:
  - tracked env files are `.env.example` and `web/apps/web/.env.example`.
  - no tracked real `.env` files found.
- Filename-only secret-pattern scan:
  - returned docs/tests/scripts/Supabase code paths only; values were not printed.
  - no secret value was copied into this report.
- Root `pnpm audit --prod`: completed as a proxy audit because `npm`/`npx` are not available in this runtime.
  - 2 moderate advisories:
    - `postcss <8.5.10` via Expo/Metro dependency paths.
    - `uuid <11.1.1` via Expo config/plugin dependency paths.
  - Caveat: root repo is npm-scripted with `package-lock.json`; native `npm audit` could not run in this runtime.

### Web Checks

- `pnpm install --frozen-lockfile` in `web`: dependency tree populated but command exited nonzero.
  - Blocked by pnpm build-script approval policy for `esbuild` and `unrs-resolver`.
  - Generated placeholder `allowBuilds` lines in `web/pnpm-workspace.yaml`; removed to keep tracked metadata clean.
- `vitest run` in `web/apps/web`: pass.
  - 2 files, 20 tests passed.
- `tsc --noEmit` in `web/apps/web`: pass.
- `next build` in `web/apps/web`: pass.
  - Existing warning: Supabase SSR middleware imports `process.version`, which Next reports as unsupported in Edge Runtime.
- `next lint` in `web/apps/web`: did not run non-interactively.
  - Next prompts: "How would you like to configure ESLint?"
  - This is a tooling gap; web lint is not configured for noninteractive CI.
- `pnpm audit --prod` in `web`: fail due vulnerabilities.
  - 15 vulnerabilities: 5 high, 8 moderate, 2 low.
  - Dominant source is `next` on 14.x; advisories list patched versions in Next 15.x, with several requiring at least `15.5.16`.
  - Also includes `postcss <8.5.10`.

## Critical Issues

None newly introduced in this branch after verification. The mobile app builds through static/test validation and full Jest is green.

## High-Priority Issues

### H1. Web Next.js Security Advisories

`web` audit reports 15 production vulnerabilities, including 5 high-severity Next.js advisories around server components, DoS, SSRF, middleware/proxy bypass and related risks.

Recommendation:
- Upgrade the web workspace from Next 14.2.x to a currently patched Next 15 line.
- Re-test middleware, Supabase SSR auth, route protection and build output.
- Add a CI gate for `pnpm audit --prod` in `web`.

### H2. Accessibility Warning Debt Remains

Mobile ESLint passes, but 63 warnings remain. Most are `react-native-a11y` warnings for touchables without valid accessibility descriptors. This matters for App Store quality, user trust and design consistency.

Recommendation:
- Run a dedicated a11y cleanup branch.
- Prioritise high-frequency and touched flows: ProGate, TodayStrip, Plan/Train cards, Nutrition screens, scan/barcode screens, WorkoutSummary and modals.
- Add guard tests where rows/cards represent controls, radios, tabs or destructive actions.

### H3. Package Manager Friction Is Now A Release Risk

The root app is npm-scripted and has `package-lock.json`, but the current local install tree is pnpm-shaped. `npm`/`npx` are not available in this runtime, and pnpm commands can fail before running scripts because build scripts are unapproved.

Recommendation:
- Choose and document one root package manager for release.
- If npm is canonical, make sure the developer/runtime environment has npm available and run `npm ci --legacy-peer-deps --ignore-scripts` or the intended equivalent.
- If pnpm is canonical, commit the root pnpm lock/workspace intentionally and configure approved builds.
- Avoid accidental lockfile churn.

### H4. Android Release Artifact Validation Was Not Completed

The 16 KB ELF page-size script exists, but there was no APK/AAB/native artifact to validate.

Recommendation:
- Run the script against the actual release APK/AAB before Play submission.
- Add a CI job that builds or downloads the release artifact and runs `verify:android:16kb` with the artifact path.

## Medium-Priority Issues

### M1. Large Legacy Modules Still Need Refactor Seams

`database.js`, `HomeScreen`, `PlansScreen`, `ProgressPhotosScreen`, `CoachOutputScreen`, nutrition flows and sync remain large. This branch deliberately kept route ids stable and avoided broad source churn, but the app still needs staged maintainability work.

Recommended seam order:
1. Extract progress photo/scan session orchestration from `ProgressPhotosScreen`.
2. Split `database.js` by domain: profile/body metrics, progress photos, scans, workouts, food, sync helpers.
3. Move Coach output section renderers into components with pure selectors.
4. Convert repeated card/row/tile patterns to design-system primitives.
5. Add per-domain contract tests before each extraction.

### M2. Physique Scan Estimator Delta Still Needs A Dedicated Audit

This branch handles trust/copy/store/delete/gating and current scan analysis semantics. The incoming AI/vision estimator from the other session still needs a focused audit after it lands.

Must check:
- no exact body-fat percentage claim from photos;
- confidence and abstention states are real;
- retake/quality scoring blocks weak scans;
- Coach receives only safe, low-authority summary signals;
- privacy, export, wipe and delete behavior include every new table/file;
- no nutrition safety floor uses scan-derived estimates.

### M3. Web Middleware Edge Warning

Next build passes with a Supabase SSR Edge Runtime warning from middleware import trace.

Recommendation:
- Decide whether middleware should run on Node runtime or be refactored to Edge-compatible Supabase calls.
- Add a focused auth-route smoke test after the change.

### M4. Web Lint Is Not CI-Ready

`next lint` prompts for setup instead of running. This hides web lint quality in automation.

Recommendation:
- Add explicit ESLint config for the Next workspace or replace `next lint` with a direct configured `eslint` command.
- Add it to CI after the config is noninteractive.

### M5. Avatar Is Local-Only By Design

Profile photo/avatar is intentionally stored as a device-local file URI and preserved in local profile state. It is ignored by the cloud profile whitelist and is not uploaded.

Recommendation:
- Keep this as local-only unless a real object-storage/privacy design is approved.
- Add UX copy later if users expect profile pictures to follow them across devices.

### M6. Data-Freshness Reminders Are UI Shortcuts, Not Yet A Scheduling System

Athlete profile now points users toward body metrics, progress photos/Physique Scan and lift progress. It does not yet create notification cadences or adaptive task cards.

Recommendation:
- In a later task, build a deterministic freshness engine that suggests body metric/photo/lift updates based on last logged dates, suppression state and user goal.

## Low-Priority Issues

- Some old docs still mention historical `Diary`, `Plans` or `You` terminology because they are archival audit/backlog files. Current app-facing docs/public copy was updated where relevant.
- React 19 test output emits many `react-test-renderer is deprecated` warnings in non-silent runs. Tests pass; this is future test-harness debt.
- CRLF-to-LF warnings appear for two docs when Git touches them.
- The app still needs visual device QA for final mobile ergonomics, particularly tab labels, Coach hub, Athlete Profile, Progress filters and settings chips.

## Implemented Changes

### IA And Navigation

- Visible tabs changed to `Today / Train / Nutrition / Progress / Coach`.
- Internal route ids remain `HomeTab`, `PlansTab`, `DiaryTab`, `ProgressTab`, `ProfileTab` to avoid deep-link and push-route regressions.
- Icons updated to match the new IA.
- Guard tests updated/added for navigation labels, tab labels and mount coverage.

### Coach Hub

- `YouScreen` is now visible as `Coach`.
- Copy explicitly says rules-based and no chat.
- Pro users get weekly check-in, current review, goal/phase update, nutrition targets, reminders, safety and methodology paths.
- Free/lapsed users get Pro entry and read-only coaching history when history exists.

### Athlete Profile

- Added `AthleteProfileScreen`.
- Added local-only avatar save/delete helper.
- Shows completed session count, body weight, body fat manual entry, Physique Scan state, strength standing and key lifts.
- Adds shortcuts to body metrics, progress photos/Physique Scan, lift progress, settings and data export.

### Physique Scan / Progress Photos

- User-facing wording moved from Progress Scan to Physique Scan.
- Copy says visual leanness/progress signal, not exact body-fat percentage.
- Live Pro tier rechecks added across capture/import/save/finish/retake/delete.
- Lapsed write attempts clean up pending scan sessions, photo metadata and local files where possible.
- Delete flow detaches scan assets and metadata before photo file deletion.
- Backup table guard now includes scan session/asset tables.

### Privacy And Public Copy

- App store listings, public privacy pages, support page, app map and in-app privacy/consent screens now align on:
  - progress photo image files stay device-local unless user shares/exports;
  - app-data JSON backup includes database records and metadata, not private image files;
  - Physique Scan is not medical, diagnostic, DEXA or exact body-fat analysis.

### Design Consistency

- Coach/Profile rows and cards now use shared `Card`.
- Train/Plans repeated surfaces moved toward shared `Card`.
- Progress filter/sort/date chips have 44 px minimum touch targets.
- Settings profile/coaching chips have better accessibility roles/states.
- Touched top-level surfaces use theme alpha helpers instead of ad-hoc opacity strings.

## Product And UX Audit Notes

The IA direction is right: `Today / Train / Nutrition / Progress / Coach` is clearer than the old `Train / Plans / Diary / Progress / You` model because it maps to user intent rather than implementation history.

The critical product stance remains intact:
- no AI coach/chat surface;
- deterministic coach decisions;
- Physique Scan as low-authority visual signal;
- no unsafe contest peak-week manipulation;
- privacy-first local photos.

The next UX challenge is layered simplicity. Volyume has many powerful facilities, so the first screen in each tab must answer one question:
- Today: what should I do today?
- Train: how do I manage training structure and sessions?
- Nutrition: how do I eat/log/understand targets?
- Progress: what is changing?
- Coach: what did Volyume decide, why, and what should I update?

## Recommended Implementation Roadmap

### Phase 1: Merge This Hardening Branch After Review

- Manual device QA on Coach, Athlete Profile, tab bar, Progress Photos/Physique Scan, settings chips and public copy.
- Confirm branch diff with the other in-flight progress-photo AI work.
- Re-run full mobile checks after merge/rebase.

### Phase 2: Incoming Physique Scan Estimator Audit

- Pull the new estimator branch.
- Audit wiring, abstention, quality scoring, confidence, coach summary, privacy, deletion and backup.
- Add tests that fail if exact photo-derived body-fat percentage is surfaced.

### Phase 3: Accessibility Warning Cleanup

- Clear all 63 ESLint warnings.
- Add accessibility labels/roles/states for touchables, radios, modal controls, destructive actions and nested pressables.
- Keep the lint gate at 0 errors and 0 warnings if practical.

### Phase 4: Web Security Upgrade

- Upgrade Next and PostCSS in `web`.
- Resolve Supabase middleware runtime warning.
- Configure noninteractive web lint.
- Add web audit/build/test/typecheck to CI.

### Phase 5: Architecture Reset By Domain

- Extract Progress Scan flow controller.
- Split `database.js` by domain behind a compatibility index.
- Move large screen sections into components/selectors.
- Add tests around each seam before moving logic.

### Phase 6: Guided Event Prep Modes

Treat contest prep, photoshoot prep and holiday prep as guided goal layers, not coach replacements.

Safe scope:
- date, target, current condition and available time;
- weekly rate limits;
- progress photo/Physique Scan trend support;
- training/nutrition adherence checks;
- calm fail-closed safety copy;
- explicit "peak week needs trained human eyes" boundary for contest prep.

Unsafe scope:
- dehydration protocols;
- diuretic/sodium/water manipulation;
- claim of stage-readiness certainty;
- exact photo-derived body-fat promises.

## Suggested Follow-Up Codex Tasks

1. `Audit and harden the incoming Physique Scan estimator branch. Verify exact current source behavior, then add tests for confidence, abstention, quality scoring, Coach isolation, no exact body-fat percentage claims, backup/export/delete, and privacy copy. Do not change unrelated app surfaces.`

2. `Clear all mobile ESLint warnings without broad refactors. Prioritise accessibility descriptors, nested touchables and unused locals. Keep Jest, typecheck, import check and lint green.`

3. `Upgrade the web workspace from Next 14 to a patched Next 15 version, resolve Supabase middleware runtime warnings, configure noninteractive web lint, and make web build/test/typecheck/audit pass.`

4. `Refactor ProgressPhotosScreen by extracting a Physique Scan flow controller and pure helper module. Preserve UI behavior and add tests before moving logic.`

5. `Split src/lib/database.js into domain modules behind the existing public API. Start with progress photos/scans and body metrics. Add import/export compatibility tests.`

6. `Design and implement a deterministic data-freshness engine for Athlete Profile: body metrics cadence, Physique Scan/photo cadence, strength baseline freshness, suppression behavior, and Coach-safe reminders.`

7. `Build a safe guided Event Prep layer covering holiday prep, photoshoot prep and responsible contest-prep support. Include hard boundaries for dehydration/peak week and no-coach-replacement wording.`

## Blockers And Assumptions

- Assumption: Coach remains deterministic and explainable; no AI coach/chat recommendations.
- Assumption: Physique Scan outputs visual leanness, confidence and progress signal, not exact body-fat percentage.
- Blocker: no APK/AAB release artifact was present for Android 16 KB page-size validation.
- Blocker: root native `npm audit` could not run because npm/npx are unavailable in this runtime.
- Blocker: pnpm build-script approval policy prevents clean web install without approved builds.
- Blocker: web `next lint` prompts for setup and is not CI-ready.
- Assumption: avatar/profile picture should remain local-only until there is an explicit cloud media storage/privacy design.
