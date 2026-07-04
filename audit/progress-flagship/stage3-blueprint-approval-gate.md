# Progress Photos Flagship Stage 3 Blueprint Approval Gate

Fresh clone: `main` at `acb295eeca0839847b28f9a0f5956876e26e794b`.

This is the proposed implementation blueprint. No application code has been edited. Do not begin coaching-engine code until the founder approves this gate.

## Product Category

Build this as `Progress Scan`, not merely `Progress Photos`.

Positioning:

- Better than casual visual self-assessment because capture is standardised, repeated, measured, and uncertainty-aware.
- Not DEXA, not clinical, not diagnostic, not a medical device.
- On-device first, private by default, understandable by normal users.

Core promise:

> Take standardised front/back/optional side photos. Volyume checks whether the scan is usable, estimates body-composition range when appropriate, explains the trend in plain English, and lets the coach act only where the data is strong enough.

## Release Principles

1. Standardisation before estimation.
2. Abstention before false confidence.
3. Trend before single-scan judgement.
4. Coaching context before calorie changes.
5. ED safety before engagement.
6. iOS and Android parity before launch.
7. Local-first privacy before convenience.

## Required Data Model

Create a scan-session model separate from raw photo metadata.

Suggested local tables:

### `progress_scan_sessions`

- `id`
- `user_id`
- `captured_at`
- `status`: `draft|complete|failed|analysis_unavailable`
- `analysis_status`: `none|queued|running|complete|abstained|failed`
- `consent_version`
- `camera_facing`
- `timer_seconds`
- `required_poses_complete`
- `estimate_body_fat_percent`
- `estimate_range_low`
- `estimate_range_high`
- `estimate_confidence`: `low|medium|high`
- `quality_score`
- `quality_label`
- `model_version`
- `estimator_version`
- `signals_json`
- `abstention_reasons_json`
- `created_at`
- `updated_at`

### `progress_scan_assets`

- `id`
- `scan_id`
- `user_id`
- `pose`: `front|back|side`
- `photo_name`
- `uri`
- `taken_at`
- `quality_score`
- `landmark_confidence`
- `segmentation_confidence`
- `blur_score`
- `lighting_score`
- `framing_score`
- `camera_tilt_degrees`
- `created_at`

Storage:

- Keep raw images device-local.
- Do not sync scan assets or raw analysis payloads.
- Keep a guard test equivalent to `progressPhotoMetaNoSync.guard.test.js`.
- Add account delete/sign-out wipe behaviour for scan sessions, scan assets, metadata, and file-system photos.

## Guided Capture Flow

### Entry

Screen title: `Progress Scan`.

Entry states:

- No scans: start guided scan.
- Existing scans: show dated library and latest scan summary.
- Suppressed mode: show private library only; no estimate, no compare, no share.

### Consent And Expectation

Show a short consent/expectation step before first analysis:

- Photos stay on this device unless the user shares/exports.
- Estimate is approximate.
- Pose, lighting, clothing and camera position affect the result.
- Not medical or diagnostic.
- User can save photos without analysis.

### Capture Wizard

Required:

1. Front photo.
2. Back photo.

Optional but recommended:

3. Side photo.

Solo-user support:

- Remember preferred camera facing.
- Allow front/back camera flip.
- Add timer preference: off, 5 seconds, 10 seconds.
- For timer mode, show a clear countdown and auto-capture.
- Add "step into the outline" guidance.
- After capture, let the user accept/retake before moving to the next pose.

Suggested copy:

- "Front scan"
- "Set the phone down, step into the outline, then stand naturally."
- "Taking photo in 10 seconds."
- "Hold still."
- "Got it. Check this one before we continue."

Controls:

- Flip camera button.
- Timer segmented control.
- Retake.
- Use photo.
- Skip side.
- Save without analysis.

Quality checks:

- Whole body visible.
- Single person.
- Pose confidence above threshold.
- Segmentation confidence above threshold.
- Lighting not too dark.
- Blur below threshold.
- Camera tilt within tolerance.
- Body centred.
- Similar distance/framing to previous scan where available.

Abstention reasons:

- `whole_body_not_visible`
- `too_dark`
- `too_blurry`
- `camera_tilted`
- `pose_not_clear`
- `multiple_people`
- `segmentation_low_confidence`
- `clothing_or_background_unclear`
- `missing_required_pose`

## Analysis Output

Never present one magic number as truth.

Recommended display:

- Body-fat estimate range, e.g. `18-22%`.
- Optional midpoint only as secondary detail, e.g. `around 20%`.
- Confidence label.
- Quality notes.
- Like-for-like comparison status.
- What changed, what did not, and what is too uncertain to call.

First scan:

- Baseline only.
- No trend judgement.
- No coaching action beyond education.

Second and later comparable scans:

- Compare only same pose set and adequate quality.
- Treat changes inside the uncertainty band as steady.
- Only call a trend when the movement clears a defined threshold.

Example copy:

- "This is your baseline scan. The useful part starts when we compare it with a future scan taken in similar conditions."
- "Estimate is down, but the change is inside the scan range. Treat this as steady."
- "Estimate is down and your waist measurement is also down. That supports a real fat-loss trend."
- "The scan quality was not good enough for an estimate. You can still keep the photos."

## Measured Signals

Store only signals the system can actually compute.

Candidate signals:

- Body-fat estimate and uncertainty range.
- Pose quality.
- Segmentation mask quality.
- Landmark confidence.
- Silhouette ratios: shoulder/waist/hip width, waist-to-height proxy, torso outline ratios.
- Side-depth proxy if side pose exists and quality supports it.
- Nearest bodyweight snapshot.
- Same-day waist/body metrics if present.
- Comparable-scan delta.

Do not invent subjective observations:

- No "better definition" unless a measurable proxy exists.
- No "more muscular" unless supported by training/bodyweight/silhouette logic.
- No "leaner" language in suppressed mode.

## Coaching Integration

### Boundary

Use the existing boundary where `CoachOutputScreen` gathers coach inputs.

Do not add image processing to:

- `src/lib/weeklyCoach.js`
- `src/lib/nutritionEngine.js`
- `src/lib/coachApply.js`
- ED-detection modules

Add a resolver outside the engine:

- `getLatestUsableProgressScanForCoach(userId)`
- Returns a bounded summary or `null`.
- It should be deterministic and easy to unit test.

Suggested summary:

```js
{
  source: 'photo_scan',
  capturedAt,
  bodyFatPercent,
  rangeLow,
  rangeHigh,
  confidence,
  qualityLabel,
  comparableScanCount,
  trendDirection: 'down' | 'up' | 'steady' | 'uncertain',
  trendMagnitudePctPoints,
  supportingSignals: [],
  limitations: [],
}
```

### Coaching Rules

The coach may:

- Use scan trend to explain progress when scale weight is noisy.
- Hold unnecessary cutting pressure when scan, strength, and measurements support recomposition.
- Strengthen caution when scan suggests the user is getting very lean while intake/recovery are poor.
- Mention uncertainty plainly.
- Ask for a better scan when quality is poor.

The coach must not:

- Lower safety floors because of a photo estimate in v1.
- Increase deficit aggressiveness from a single scan.
- Change calories from scan data alone.
- Use body-shaming copy.
- Present the estimate as clinical truth.
- Surface exact body-fat estimates under ED/calm suppression.

Safe v1 source treatment:

- `photo_scan` should not be treated as DEXA/caliper/BIA for FFM floor or Katch-McArdle authority.
- Treat it closer to `visual`, but better structured: useful for trend context, not for aggressive target changes.

Example coach copy:

- "Your latest scan supports the same direction as your scale trend, so I would treat this as real progress. I would not change calories from the scan alone."
- "The estimate moved, but not beyond the scan range. I would call this steady and keep the plan focused on the scale trend, training and recovery."
- "The scan was not reliable enough to use. Retake it next time if you want the coach to include it."

## ED And Calm-Mode Rules

Inherit `usePhotoSuppression`.

When suppressed:

- Hide body-fat estimate.
- Hide numeric deltas.
- Hide before/after share.
- Hide comparison/overlay.
- Do not include scan body-composition context in coach output.
- Allow private dated photo storage and deletion.

Cadence:

- No daily nudges.
- Default to every 14 or 28 days.
- Never streakify progress scans.

## UX And Design

Match the existing app:

- Use existing surface ladder, amber action colour, cards/sheets/buttons.
- No extra glows, bokeh, gradient orbs, or AI-themed visual layer.
- Respect Reduce Motion.
- Use compact, calm, British English.
- Make the scan process feel guided, not technical.

Suggested library model:

- `Scans` tab/list: complete scan sessions with date, estimate range if allowed, quality, notes.
- `Photos` drill-in: raw pose assets for a scan.
- `Compare` only for allowed users and comparable scans.
- `Share` opt-in only; default excludes body-fat number unless user explicitly includes it.

## Testing And Release Gates

Automated tests:

- No-sync guard for scan tables and photos.
- Sign-out/delete-account wipes photos/scans.
- Suppressed mode hides estimates, compare, share, deltas, and coach scan context.
- Resolver never feeds low-quality/abstained scan to coach.
- First scan does not create trend.
- Inside-uncertainty movement reads as steady.
- `photo_scan` does not lower FFM/calorie safety floor in v1.
- Camera preference persists.
- Timer flow cannot double-capture.
- Required front/back poses enforced.
- iOS and Android permission copy and fallback paths covered.

Manual QA:

- iOS physical device front/back camera.
- Android physical device front/back camera.
- Timer 5s/10s with phone set down.
- Camera flip persistence.
- Poor lighting abstention.
- Cropped body abstention.
- Multiple people abstention.
- Calm mode.
- Open ED flag.
- Pro lapse read-only.
- Account delete/sign-out shared-device scenario.
- Android 16 KB page-size validation after adding native ML runtime.

## Suggested Build Sequence

1. Data/privacy foundation:
   - User-scoped scan tables.
   - User-scoped photo storage or strict ownership.
   - Wipe/export/delete behaviour.
   - No-sync tests.

2. Guided capture wizard:
   - Front/back/optional side.
   - Camera flip preference.
   - Timer and countdown.
   - Accept/retake loop.

3. Deterministic quality gate:
   - Framing, blur, lighting, tilt, single-person checks where available.
   - Save without analysis path.

4. Runtime prototype:
   - Prefer LiteRT/TFLite bridge first unless product accepts iOS 17+ requirement.
   - Still-image post-capture analysis before live inference.

5. Estimate and uncertainty:
   - Body-fat range.
   - Confidence.
   - Abstention.
   - Model/version metadata.

6. Library and comparison:
   - Scan sessions.
   - Like-for-like comparison.
   - Share controls.

7. Coach integration:
   - Resolver outside engine.
   - Bounded summary.
   - No safety-floor lowering.
   - Plain-English coaching explanations.

8. Hardening:
   - Tests.
   - Physical-device QA.
   - Store/privacy copy.
   - Android 16 KB gate.

## Approval Gate

Approval is required before any app-code implementation or coaching-engine work.

Founder decision needed:

1. Approve `Progress Scan` as the product category.
2. Approve front/back required, side optional.
3. Approve camera flip preference plus 5/10 second timer.
4. Approve uncertainty-first estimates rather than a single definitive number.
5. Approve `photo_scan` as low-confidence/trend context in v1, not DEXA-equivalent body-fat authority.
6. Approve no exact estimates/comparisons under calm/ED suppression.
7. Approve LiteRT/TFLite-first runtime exploration unless iOS 17+ target increase is acceptable.
