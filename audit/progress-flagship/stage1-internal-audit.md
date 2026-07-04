# Progress Photos Flagship Stage 1 Internal Audit

Fresh clone audited from `main`.

- Repository: `https://github.com/allansdouglas1983-cmyk/ADPhysique.git`
- Local path: `C:\Users\Admin\ADPhysique-progress-flagship-main-20260704`
- Commit: `acb295eeca0839847b28f9a0f5956876e26e794b`
- Scope: actual code only. Existing docs were not treated as truth.
- App targets: iOS and Android.
- Code-edit status: no application code edited for this audit.

## Executive Verdict

The current progress-photo system is a strong privacy-first base, but it is not yet a flagship body-composition feature. It is a local dated photo library with guided capture, metadata, comparison, and sharing. It is not a standardised scan session, does not have body-fat estimation, does not model uncertainty, and does not feed the coaching system.

The safe build path is not to wire a photo model directly into `weeklyCoach.js`. The build should first create a separate local `Progress Scan` domain: scan session, pose assets, quality gates, body-composition estimate, uncertainty range, model version, and deterministic coaching summary. Only after that should the coach consume a bounded summary through the existing body-composition boundary.

## Current Code Reality

### Storage And Privacy

Progress photos are currently stored device-locally under the app private document directory:

- `src/lib/progressPhotos.js:14-18` imports legacy Expo FileSystem and defines `progress_photos/`.
- `src/lib/progressPhotos.js:42-47` lists local files.
- `src/lib/progressPhotos.js:51-70` copies captured/picked images into the local private folder with timestamp filenames.
- `src/lib/progressPhotos.js:73-75` deletes a single local photo.
- `src/lib/progressPhotos.js:90-110` writes and checks an owner sidecar for read-only lapse access.

Metadata is local SQLite only:

- `src/lib/database.js:1519-1527` creates `progress_photo_meta`.
- Columns are `name`, `taken_at`, `pose`, `weight_kg`, `note`, `created_at`, `updated_at`.
- There is no `user_id`, no scan-session id, no confidence, no model version, no body-fat estimate, no quality status, no analysis payload.

Sync protection exists:

- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` asserts progress-photo metadata is not in sync registry.
- `app.json:167-170` says progress-photo camera captures stay on device and are never uploaded.

Adversarial privacy risk:

- The photo folder is per device, not per user. The owner-marker guard protects read-only lapse routes, but the storage model remains global to the app install.
- `progress_photo_meta` has no `user_id`, so metadata is not naturally scoped to a signed-in user.
- `WIPE_DIRECT_TABLES` in `src/lib/database.js:4067-4098` does not include `progress_photo_meta`, and FileSystem photos are not wiped by `wipeAllUserData`.
- Sign-out and delete-account paths wipe SQLite/AsyncStorage but not this photo directory:
  - `src/store/useAppStore.js:431-447`
  - `src/hooks/useAccountActions.js:274-289`

Before flagship release, the photo domain must become user-scoped and account-delete/sign-out behaviour must be explicit. Otherwise the app can truthfully say "not uploaded", but it cannot fully claim account-local privacy on a shared device.

### Current User Flow

Entry points:

- `src/navigation/RootNavigator.js:188` wraps progress photos in a read-only Pro guard.
- `src/screens/AnalyticsScreen.js` and `src/screens/BodyMetricsScreen.js` link users into progress photos.
- `src/screens/WorkoutSummaryScreen.js` prompts after workouts.

Progress screen behaviour:

- `src/screens/ProgressPhotosScreen.js:119-143` reads tier/user, applies read-only mode, and stamps owner marker.
- `src/screens/ProgressPhotosScreen.js:190-205` loads photos and metadata.
- `src/screens/ProgressPhotosScreen.js:212-242` handles camera/library import through `expo-image-picker`.
- `src/screens/ProgressPhotosScreen.js:403-408` gates compare/share behind photo suppression.
- `src/screens/ProgressPhotosScreen.js:454-459` tells users photos are private to device and not uploaded.
- `src/screens/ProgressPhotosScreen.js:653-659` mounts guided ghost capture.

Guided capture already exists:

- `src/components/ProgressGhostCapture.js:160-164` holds grid, facing, capture, and level state.
- `src/components/ProgressGhostCapture.js:178-198` uses accelerometer level when available.
- `src/components/ProgressGhostCapture.js:200-218` captures a single photo and saves pose metadata.
- `src/components/ProgressGhostCapture.js:278-320` renders camera preview, ghost overlay, grid, and level.
- `src/components/ProgressGhostCapture.js:345-380` renders grid toggle, shutter, and camera flip.

Adversarial UX gap:

- Camera flip exists but is only a manual control, not a preference or guided solo-user mode.
- There is no timer, countdown, auto-capture, "step into the frame" loop, voice cue, or pose-by-pose wizard.
- A user taking photos alone will struggle to frame front/back/side consistently.
- This matters for trust because inconsistent framing will make the later body-fat estimate look arbitrary.

### ED, Calm Mode, And High-Risk Surfaces

The current app already has a serious suppression model:

- `src/hooks/usePhotoSuppression.js:1-20` documents the gate for comparison, bodyweight display, and sharing.
- `src/hooks/usePhotoSuppression.js:33-35` suppresses when calm mode, read failure, or open ED flag is present.
- `src/hooks/usePhotoSuppression.js:41-59` starts fail-closed and only lifts after both reads succeed.
- `src/screens/ProgressPhotosScreen.js:403-408` uses suppression for compare/share.

Flagship implication:

- Progress Scan must inherit this gate.
- In suppressed mode, no exact body-fat number, no comparison language, no before/after share, no bodyweight overlays, no "leaner/smaller/bigger" judgement.
- Basic private viewing, deletion, and opt-out should remain available.

### Coaching Integration

The current coach already accepts body-composition inputs:

- `src/screens/CoachOutputScreen.js:1476-1477` finds the latest body-fat metric from `getBodyMetricLog`.
- `src/screens/CoachOutputScreen.js:1599-1609` passes `bodyFatPercent` and `bodyFatSource` into `runWeeklyCoach`.
- `src/lib/weeklyCoach.js:430-438` accepts body-composition fields.
- `src/lib/weeklyCoach.js:804-808` uses body fat inside adaptive calorie/FFM context when food and weight data are sufficient.
- `src/lib/weeklyCoach.js:941-960` applies the FFM safety floor and blocks downward calorie changes when intake is already too low.

Nutrition engine source handling:

- `src/lib/nutritionEngine.js:573-588` uses Katch-McArdle BMR only when BF is finite and source is not `visual`.
- `src/lib/nutritionEngine.js:606-631` treats DEXA/caliper/BIA-like body-fat data as credible for FFM floor, not visual self-estimates.
- `src/lib/nutritionEngine.js:700-704` maps source to confidence; `visual` is low.

Safe insertion point:

- Do not put image analysis or scan-session reads inside `weeklyCoach.js`.
- Add a resolver outside the engine, near the `CoachOutputScreen` boundary or in a new pure adapter, that converts the latest usable scan into an explicit coaching context.
- The weekly coach should receive a small deterministic summary: estimate, range, confidence, trend, comparable-scan count, and abstention reasons.

Adversarial coaching risk:

- If `photo_scan` is treated like DEXA/caliper/BIA, the app may lower calorie floors or change protein/BMR math from a noisy image estimate. That is unsafe.
- First release should treat `photo_scan` as low-confidence, trend-first, and safety-positive only. It may add context, hold overreaction, or strengthen caution. It should not permit more aggressive cuts.

Potential existing bug near body composition:

- `getLatestBodyComposition` returns camelCase at `src/lib/database.js:3790-3791`.
- `src/screens/DiaryScreen.js:170-171` and `src/screens/PerDayTargetsScreen.js:55-56` read snake_case fields.
- This can silently ignore stored body-fat data in those screens. It is adjacent risk for any scan estimate if reused there.

### Design System Constraints

Progress Scan must inherit the app's current material system:

- `src/styles/theme.js:9-25` defines the material policy: surface ladder, no Android blur, only one sanctioned Skia glow, no extra glow/orb/bloom.
- `src/styles/theme.js:36-52` defines dark surfaces and amber primary.
- `src/styles/theme.js:291-312` defines spacing/radius tokens.
- `src/styles/theme.js:609-658` defines motion tokens and Reduce Motion expectations.

Design implications:

- Use existing `Card`, `Button`, `BackHeader`, bottom sheets/modals, Skia share-card patterns, and tokenised colours.
- Avoid adding a separate visual language for "AI analysis".
- Use neutral scan/coach language: plain British English, no shame, no urgency, no body-judgement tone.

### iOS And Android Constraints

Current app config:

- `app.json:19` enables React Native new architecture.
- `app.json:185-187` targets Android SDK 35, min SDK 26.
- `app.json:217` sets iOS deployment target to 16.0.
- `app.json:35` iOS camera permission text mentions progress photos.
- `app.json:167-170` Expo Camera permission says progress photos stay on-device.

Runtime implication:

- Any CV runtime must support both iOS and Android.
- It must not require raising iOS deployment target unless explicitly accepted.
- Any native library must be checked against Android 16 KB page-size compatibility before release.

## Required Foundation Before Building Photo Analysis

1. User-scoped local data model:
   - Add `user_id` to photo/scan metadata or move into user-scoped subdirectories.
   - Make sign-out/delete-account wipe behaviour explicit.
   - Keep the no-sync/no-upload guard.

2. Scan-session model:
   - A scan is not a photo. A scan should have session id, user id, captured_at, pose set, quality state, analysis state, model version, estimate, range, signal payload, and consent version.
   - Required poses: front and back.
   - Optional pose: side, strongly recommended where solo capture allows.

3. Guided solo capture:
   - Remember preferred camera side.
   - Support front/back camera flip.
   - Add 5/10 second timer options.
   - Add countdown and hands-free auto-capture.
   - Guide user into the frame with silhouette/outline/grid and quality checks.

4. Quality and abstention:
   - Do not estimate from bad photos.
   - Fail with useful reasons: too dark, too blurry, body not fully in frame, camera tilted, pose not clear, multiple people, clothing/lighting makes estimate unreliable.

5. ED-safe output:
   - Suppressed users get private storage/deletion, not body-fat numbers or comparison.
   - No daily checking loop; use a sensible cadence such as 14 or 28 days.

6. Coaching integration:
   - Keep image logic outside the engine.
   - Feed only deterministic, bounded scan summaries.
   - Do not let photo estimates lower safety floors in v1.
