# Scout report: Capture and input quality

## Files inspected
- `src/screens/ProgressPhotosScreen.js` (2193 lines, full read)
- `src/components/ProgressGhostCapture.js` (guided camera + ghost overlay)
- `src/lib/progressCaptureGuide.js` (pose/setup copy)
- `src/lib/progressScanVision.js` (automated capture-quality analysis)
- `src/lib/progressPhotos.js` (device-local file storage)
- `src/lib/progressScanPreferences.js` (camera facing/timer prefs)
- `src/components/PhotoDetailsSheet.js` (date + pose collection step)
- `src/components/ProgressPhotoViewer.js` (full viewer: pose/date/note/delete/reference/compare)
- `modules/progress-scan-image/ios/ProgressScanImageModule.swift` (native RGB extraction, lighting score, Vision person segmentation)
- `app.json` (permissions, plugin config)
- `package.json` (dependency confirmation: expo-camera, expo-image-picker, expo-sensors, react-native-fast-tflite, expo-asset)

Not opened in full (referenced only, budget-limited): `src/lib/progressPhotoMeta.js`, `src/lib/progressPhotosController.js`, `src/lib/progressScanStore.js`, `src/components/BeforeAfterShareSheet.js`, `src/components/PhotoDateRangeSheet.js`, `src/components/PhotoDatePicker.js`, `docs/progress-scan-validation.md`, `modules/progress-scan-image/android/.../ProgressScanImageModule.kt`.

## Search terms used
`expo-camera|expo-image-picker|react-native-vision-camera|launchCamera|ImagePicker`; `progress.?photo|progressPhoto|progress_photo|ProgressPhoto|progress.?scan|ProgressScan` (case-insensitive); direct grep for `CAMERA|PHOTO_LIBRARY|NSCameraUsageDescription|NSPhotoLibrary|expo-camera|expo-image-picker|expo-media-library` in `app.json`; dependency grep in `package.json`.

## Current-state evidence

**Capture entry points** (`ProgressPhotosScreen.js` `buildProgressStudioCaptureRoutes` in `progressCaptureGuide.js`, routes rendered in the "Add photos" sheet, lines ~1535-1623):
- `complete_latest` — resume a partial dated set, missing-angle only.
- `scan` — "Start photo set": guided, camera-driven, front→back→side sequence (`openProgressScan('guided')`).
- `scan_library` — "Import photo set": same front/back/side sequence but each pose picked from the photo library, with an explicit date step first (`openScanImportDateStep` → `PhotoDatePicker`).
- `guided` — single guided photo (ghost overlay) outside the scan flow.
- `camera` — quick single photo, `ImagePicker.launchCameraAsync`.
- `library` — quick single photo, `ImagePicker.launchImageLibraryAsync`.

**Camera capture** — `ProgressGhostCapture.js`: wraps `expo-camera`'s `CameraView`, lazy-required (`try { require('expo-camera') }`) so a missing/stale native module renders a calm fallback instead of crashing. `useCameraPermissions()` auto-requests once when `canAskAgain` (line 207-212); denial-for-good (`!granted && !canAskAgain`) renders a "Camera access is off" screen with a library fallback and a "Not now" close (lines 330-364). An unresolved permission renders a neutral "Waiting for camera permission" placeholder (lines 368-397), never a blank/crash state.

**Library import** — `ProgressPhotosScreen.js` `pickFrom()` (lines 250-279): `ImagePicker.requestCameraPermissionsAsync()` for the camera route only; denial shows a toast ("Camera permission is needed to take a photo.") and aborts. Library route (`launchImageLibraryAsync`) requests no explicit permission call in this code (Android has `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` blocked in `app.json` line 81-82, consistent with expo-image-picker using the system Photo Picker, which needs no runtime grant).

**Permissions declared** (`app.json`):
- iOS `NSCameraUsageDescription` (line 35): "Volyume uses the camera to scan barcodes, read nutrition labels, and take progress photos."
- `expo-camera` plugin `cameraPermission` (line 169): "Volyume uses the camera so you can line up and take your progress photos. Your photos stay on this device and are never uploaded."
- `react-native-vision-camera` plugin `cameraPermissionText` (line 161) mentions only barcode/label scanning, not progress photos (that library is for the barcode/OCR feature, not this flow).
- `expo-media-library` plugin `photosPermission`/`savePhotosPermission` (lines 120-121) copy is scoped to "save your workout share cards to your gallery" — this is for saving OUT (share cards), not reading progress photos in; consistent with progress photos never touching the system media library on the way in.
- Android `permissions` includes `CAMERA` (line 70); `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` are explicitly **blocked** (lines 81-82).

**Pose guidance** — `progressCaptureGuide.js` `POSE_CAPTURE_GUIDANCE` (lines 45-79): per-pose `title`, one-line instruction, a `checks` list, and an `avoid` list for front/side/back. Rendered live as the camera overlay's title/subtitle in `ProgressGhostCapture.js` (`getPoseCaptureGuidance(pose)`, lines 415-417) and as the scan-flow subtitle via `buildScanCaptureSubtitle` (`ProgressPhotosScreen.js` line 1638).

**Lighting guidance** — textual: "Even front light, no backlighting, no deep shadows and no dramatic gym lighting" (`PROGRESS_STUDIO_SETUP_STEPS`, `progressCaptureGuide.js` line 17); "avoid backlighting or deep shadows" (line 31). Automated: native module computes a `lightingScore` from mean luminance of the framed content rect (`ProgressScanImageModule.swift` lines 131-132: `1.2 - abs(meanLum-128)/96`, clamped 0-1); `measureMaskSignals` in `progressScanVision.js` flags `too_dark` when `lightingScore < 0.25` (line 624) and produces retake copy (line 731).

**Framing/distance guidance** — textual: "Camera at mid-torso height", "Full body visible from head to feet", "Same room, lighting and distance" (`SETUP_STANDARD`, lines 1-5); rule-of-thirds grid overlay, toggleable (`ProgressGhostCapture.js` lines 490-498, 595-603). Automated: `framingScore` computed from the segmentation bounding box (centre + height ratio vs. an expected 0.74 body-height fraction, crop penalty for touching top/bottom/side edges) — `progressScanVision.js` lines 585-590; triggers `whole_body_not_visible` reason when `framingScore < 0.25` (line 626).

**Clothing guidance** — textual only: "avoid... bulky clothing" and "arms blocking the waist" (`PROGRESS_STUDIO_AVOID`, lines 28-34); retake copy for `clothing_or_background_uncertain` ("Try plain fitted clothing against a plain background", line 736) is triggered by low foreground/background separation, not by actual clothing detection.

**Baseline/reference capture** — no distinct "first-photo baseline" flow with stricter gating; the ghost-overlay reference is either a photo explicitly marked via "Set reference" in the viewer (`ProgressPhotoViewer.js` `onPressReference`, lines 296-299, 436-439) or auto-seeded from the latest photo of the matching pose (`ProgressPhotosScreen.js` `openGhostCapture`, lines 493-512). A first-ever capture (no prior reference) renders the overlay with `hasReference=false` and no ghost image, i.e., no forcing function ensures the first photo itself is well-framed before it becomes future sessions' reference.

**Retake/review step** — three distinct places:
1. Guided-camera capture preview (`ProgressGhostCapture.js` lines 424-467): full-screen preview with "Retake" / "Use photo" and copy "Use it if your whole body is visible, the photo is sharp, and the camera looks upright."
2. Library-import-to-scan review (`ProgressPhotosScreen.js` "Photo review" modal, lines 1664-1720): same visual pattern for photos picked from the library into a photo set, copy "Use it if your whole body is visible, the photo is sharp, and the picture is upright."
3. Automated ML retake prompt, **only inside the structured "photo set" (scan) flow**, fired from `onScanCaptured` after the user has already approved the preview (`ProgressPhotosScreen.js` lines 774-800): `analyseProgressScanPhoto()` runs, and if `retakeCopyForVisionResult()` returns non-null, an `appAlert('Retake this photo?', ...)` offers "Retake" or "Save without score" (i.e., quality gating is advisory, never a hard block — the user can always keep a flagged photo, just without a Volyume Score).

**Automated quality signals** (`progressScanVision.js`): `segmentationConfidence`, `framingScore`, `blurScore` (Laplacian-variance heuristic on luminance, lines 350-372), `lightingScore` (native), `poseConfidence` (height-ratio + centring + shoulder/hip-tilt upright score), `cameraTiltDegrees` (from shoulder/hip centre offset, not a device gyroscope reading), `backgroundSeparation`, `componentDominance`/`connectedComponents` (multi-person detection). Backed by an on-device selfie-segmentation model (`react-native-fast-tflite`, MediaPipe model) with a native ML Kit / Vision-framework segmentation fallback and a `no_person_detected` / model-unavailable abstention path — the check never blocks capture if the model fails to load, it just returns `unavailableVisionResult()` (mostly non-actionable, "model_unavailable" is not in `RETAKE_REASONS`).

**Horizon level** — `expo-sensors` `Accelerometer`-based tilt readout in `ProgressGhostCapture.js` (lines 217-234); confirmed a real dependency in `package.json` (`expo-sensors: ~15.0.8`), so this is not conditionally absent in production, contrary to the in-file comment implying "if it is missing the level is simply absent" (comment describes defensive code, but the dependency is in fact always present).

**Save/upload path** — `progressPhotos.js`: device-local only, `expo-file-system`, per-user directory `progress_photos/users/<safeUserId>/`, filename is `<epochMs>.jpg` (the epoch IS the photo id), a collision guard walks the timestamp forward on same-millisecond saves (lines 74-87). Never synced to Supabase (explicit header comment, lines 4-9). A legacy owner-marker file (`owner.txt`) gates read-only viewing on a shared device to the account that last used the screen (fail-closed, lines 114-148).

**Thumbnails** — not evidenced. The library grid (`checkInCoverImage`, `ProgressPhotosScreen.js` styles line 1973) renders the same full-resolution file at a fixed 104×132 box with `resizeMethod="resize"`; no separate thumbnail file generation found in `progressPhotos.js` or the native modules.

**Deletion** — `onViewerDelete` (`ProgressPhotosScreen.js` lines 876-926) distinguishes scan-set deletion (removes the whole scored set via `deleteProgressScanSession`), same-date photo-set deletion, and single-photo deletion, each with its own confirm copy in `ProgressPhotoViewer.js` `onPressDelete` (lines 306-337). Delete re-checks live tier at execution to guard a mid-confirm pro→free flip.

**Export** — `exportLatestScanCalibration` (`ProgressPhotosScreen.js` lines 998-1031) exports a JSON file of **scan vision signals** (not the photos themselves) via `expo-sharing`, gated by `isProgressScanCalibrationExportAllowed(user)` and reachable only via a long-press on the privacy pill (a hidden/debug-style affordance, not a user-facing "export my photos" feature). No general "export/share my raw photos" path was found.

**Empty/loading/error states** — Loading: content-shaped `SkeletonCard` placeholders, not a bare spinner (lines 1327-1339). Load error with photos still present: a warning card with "Try again" (lines 1209-1228, 1846-1859). Load error with zero photos: dedicated empty state, "Volyume has not deleted or changed your photo library." (lines 1340-1357). True empty (no photos yet): differs by tier — read-only free copy "No photos on this device." vs. Pro copy "No saved photos yet" / "Add front, back and side photos to start." (lines 1358-1374). Filtered-empty (pose/date filter yields nothing): three distinct copy variants depending on which filters are active (lines 1375-1386).

**User-facing copy (quoted, capture-flow only)**:
- "Best about a week apart" / "Volyume reads change best when photo sets are about a week apart. You can still save photos today..." (cadence gate, line 538)
- "Front saved" / "Turn around for the back photo. Use the timer if you need to step into position." (line 621)
- "Back saved" / "Now add the side photo to complete the set." (line 642)
- "Retake this photo?" / per-reason copy in `retakeCopyForVisionResult` (`progressScanVision.js` lines 727-739)
- "Check this photo" / "Use it if your whole body is visible, the photo is sharp, and the camera looks upright." (`ProgressGhostCapture.js` line 439)
- "Date for this photo set" / "Pick the day these photos were taken. Volyume uses that date for the library entry and the weight shown with the set." (`ProgressPhotosScreen.js` lines 1492-1494)
- "Take clear front, back and side photos once a week. Volyume scores the set and saves it to your library." (hero subtitle, line 1173)
- "Private on this device" (privacy pill, line 1169)
- "Stored on this device. Export anything you want to keep before uninstalling, clearing app data or changing phones." (`ProgressPhotoViewer.js` line 399)

**Accessibility** — Pervasive `accessibilityRole`/`accessibilityLabel`/`accessibilityHint`/`accessibilityState` on interactive elements throughout all files read. Notable depth: the ghost-overlay opacity slider exposes `accessibilityRole="adjustable"` with `accessibilityValue` (min/max/now) and `accessibilityActions` for increment/decrement (VoiceOver/TalkBack swipe), `ProgressGhostCapture.js` lines 143-150. Touch targets: capture shutter 72×72, pill buttons 48×48, close/icon buttons 40×40, opacity presets `minHeight:36`/`minWidth:76`, timer chips `minHeight:34`; most meet or exceed the ~44pt guideline, a few (icon buttons at 40, pose chips) sit slightly under it. Reduce Motion is respected: overlay/level never animate, `Modal` `animationType` swaps to `'none'` throughout, tilt-driven rotation is flattened under Reduce Motion (`ProgressGhostCapture.js` line 422).

## What is evidenced
- Two structurally different capture pipelines that receive different quality treatment: (a) the guided "photo set" (scan) flow, which is quality-gated (automated retake prompts on blur/lighting/framing/pose/tilt/multi-person), and (b) quick single-photo add via `pickFrom('camera'|'library')`, which is never quality-gated at all.
- A real ghost-overlay alignment aid (previous-photo overlay, adjustable opacity, rule-of-thirds grid, horizon level) that is genuinely aimed at capture-time repeatability, not just after-the-fact comparison.
- Clear, explicit, calm-voice textual guidance for pose, lighting, framing and clothing, both as static "how it works" copy and as live in-camera subtitle text per pose.
- A real automated image-quality pipeline (on-device ML segmentation model + native luminance/blur heuristics) that CAN flag retakes, but only inside the scan flow and only as an advisory ("Save without score" always available).
- Photos are strictly device-local, never uploaded, with careful collision-safe naming and owner-scoped, fail-closed shared-device handling.
- A dated "photo details" step (date + pose) sits between capture and final save for every path except the automated in-flow scan poses (which already carry pose/date from the flow).
- A weekly cadence soft-gate exists ("about a week apart") but is always overridable.

## What is not evidenced
- Any quality gating (blur/lighting/framing/tilt/pose) on the two "quick" capture routes (`camera`, `library` outside a photo set) — not evidenced in `ProgressPhotosScreen.js` `pickFrom()`.
- Thumbnail generation/caching — not evidenced; full-resolution files appear to be reused directly for grid rendering.
- Live, real-time pose/skeleton landmark guidance during framing (e.g. an on-screen body outline or keypoint overlay) — not evidenced; the only live capture aid is the static reference-photo ghost image and a rule-of-thirds grid. The ML quality signals run only after the shutter, not as live framing feedback.
- Distance/scale guidance beyond text ("mid-torso height") — no evidenced measurement of subject distance or size-consistency check between the reference photo and the live camera feed before capture.
- Photo export or user-facing "share/export my raw progress photos" feature — only a hidden scan-signal JSON export was found; no general photo backup/export mechanism evidenced in the capture flow.
- A dedicated "first-ever baseline" flow with elevated capture standards (e.g., mandatory retake gating on the very first photo of a pose, since it becomes every future ghost-overlay reference) — not evidenced; the first capture of a pose is treated identically to any other.
- Device camera resolution/megapixel or minimum-resolution enforcement — not evidenced; `quality: 0.7` (`pickFrom`) vs `0.92` (scan library import, `PROGRESS_SCAN_IMAGE_QUALITY`) vs `quality: 0.92` (guided camera `takePictureAsync`) are JPEG compression settings, not resolution floors.
- Calibration/accuracy validation methodology for the heuristic thresholds (e.g. `blurScore < 0.18`, `segmentationConfidence < 0.30`) beyond their presence in code — `docs/progress-scan-validation.md` and `src/lib/__tests__/progressScanCalibrationCorpus.test.js` exist (named in the search but not opened) and likely contain this; not verified in this pass.

## What already works well
- The ghost-overlay alignment aid is a genuinely strong, differentiated capture-time repeatability mechanism (adjustable opacity 15-85%, grid, live horizon level via a real installed dependency).
- Retake review is calm and consistent in voice/pattern across both entry points (camera preview and library-import review use near-identical copy and button pattern).
- Photo storage design is careful: collision-safe naming, per-user directories, fail-closed shared-device read-only guard, tier-flip re-checks scattered through every write/delete path.
- Deletion UX correctly distinguishes single photo vs. same-date set vs. full scored scan set, with matching confirm copy for each.
- Accessibility coverage is broad and specific (adjustable slider semantics, hints on toggle/timer controls), not just boilerplate roles.
- Empty/loading/error states are content-shaped and differentiated by cause (load failure vs. genuinely empty vs. filtered-empty vs. read-only-tier empty), each with distinct, honest copy.
- The automated quality pipeline correctly degrades: model-unavailable never blocks capture, and even a flagged retake reason is advisory ("Save without score"), consistent with the code's own "quality-first capture" note (`QUALITY_FIRST_CAPTURE_NOTE`, `progressCaptureGuide.js` line 43): "If a set is not clear enough for a score, it still stays in your photo library."

## Accuracy/trust risks
- **Uneven quality gating across entry points**: only the structured "photo set" (scan) flow runs `analyseProgressScanPhoto`. A user who reaches "Volyume Score" comparisons partly via quick single-photo adds (`pickFrom`) gets zero automated quality feedback on those frames, yet those photos can still land in the same dated timeline and (per `scanForCheckIn` matching logic) potentially be treated as comparable material downstream.
- **Advisory-only gating**: even inside the gated flow, every retake prompt has a "Save without score" or "Save photos anyway" (cadence) escape hatch, so a scoring input's quality is never actually enforced, only recommended.
- **No live framing feedback**: the reference-photo ghost overlay guides alignment visually, but there is no live measurement (e.g., a body-in-frame indicator) confirming the subject matches the reference's scale/position before the shutter fires; misalignment is only caught after the fact by the post-hoc segmentation analysis (which measures the live photo's own qualities, not its similarity to the reference).
- **`cameraTiltDegrees` in the vision result is derived from shoulder/hip centre offsets in the segmentation mask, not from the phone's actual accelerometer**, despite a real device tilt sensor already being used for the on-screen level. These two "tilt" concepts (device level vs. body lean) are conceptually different and could disagree, but only the sensor-based one is shown live; the mask-derived one only surfaces after capture as a retake reason.
- **First-photo baseline has no elevated standard**: because any saved photo of a pose can become the future ghost-overlay reference (explicitly via "Set reference" or implicitly as "latest of this pose"), a poorly-framed first capture propagates its own error forward into every subsequent alignment attempt with no distinct baseline-quality gate.
- **Blur heuristic is a simple discrete Laplacian variance measure** computed on a 256×256 downsampled RGB buffer (`progressScanVision.js` `blurScoreFromRgb`) — a coarse, resolution-limited signal for the "is this photo sharp enough for a body-composition score" question; not verified for accuracy against the calibration corpus in this pass (see "Questions for Fable").

## UX/safety risks
- None found specific to ED-safety in the CAPTURE path itself (weight is not surfaced during capture; the weight-in-review copy uses neutral phrasing "Use it if your whole body is visible, the photo is sharp, and the picture is upright" with no numeric or body-comparison framing). The existing ED-safety machinery (suppression, calm mode) governs viewing/sharing/comparison, which is out of this scout's scope but referenced consistently (`usePhotoSuppression`) throughout the screen.
- The mandatory "Photo review" step for scan library imports and the guided-camera preview both use identical framing/sharpness/upright criteria in plain language, consistently applied — no risk observed of shame-based or numeric copy leaking into the capture path.
- Icon-only touch targets at 40×40 (`iconBtn`, close button) are marginally under the common 44×44 accessibility guideline, though `hitSlop` is applied in several (not all) of these cases.

## Tests found
- `src/screens/__tests__/ProgressPhotosScreen.addFlow.test.js` (402 lines) — add-flow coverage.
- `src/screens/__tests__/ProgressPhotosScreen.progressScan.guard.test.js`, `.compare.test.js` — scan-specific guards and compare view.
- `src/components/__tests__/ProgressGhostCapture.test.js` (314 lines) — guided-capture component tests.
- `src/lib/__tests__/progressScanVision.test.js` (511 lines) — the vision/quality-signal pipeline, heavily tested.
- `src/lib/__tests__/progressCaptureGuide.test.js` (128 lines) — pose/setup copy content tests.
- `src/lib/__tests__/progressScanCalibrationCorpus.test.js`, `progressScanBodyMExternal.test.js` — calibration corpus-based tests (not opened; likely the accuracy-validation evidence referenced above).
- `src/lib/__tests__/progressPhotos.test.js`, `progressPhotoMeta.test.js`, `progressPhotoTimeline.test.js`, `progressPhotoDates.test.js` — storage/metadata/timeline unit tests.
- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` — regression guard that photo metadata is never synced.
- `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`, `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js` — guards that the coach engine cannot use scan output to override safety floors (adjacent to, not part of, capture).

## Launch-critical opportunities
(None assessed here — this scout is evidence-only per its mission; no design recommendations offered.)

## Premium later opportunities
- Live pose/landmark-based framing feedback (rather than only a static ghost image + post-hoc analysis) would close the "misalignment only caught after the shot" gap noted above.
- Real-time device-tilt-based retake blocking (using the already-live accelerometer level) rather than only the post-hoc, mask-derived tilt reason.
- A distinct, more rigorously gated "baseline" capture experience for a user's very first photo of each pose, given it seeds every future ghost-overlay reference.
- Thumbnail generation for the library grid, if list-scroll performance at scale becomes a concern (not evidenced as a current problem, just an absence).

## Things not to rebuild
- The ghost-overlay alignment component (`ProgressGhostCapture.js`) is a substantial, already-tested, calm-voice, accessibility-considered capture aid — a full rebuild is not evidenced as necessary; any change here should be additive.
- The device-local, never-synced photo storage design (`progressPhotos.js`) — collision-safe naming, per-user directories, fail-closed shared-device guard — is deliberate ED/GDPR-safety architecture and should not be re-architected without founder sign-off (per CLAUDE.md ED-safety and GDPR sections).
- The advisory-only (never hard-blocking) retake gating is a deliberate "quality-first capture" design choice (explicit code comment/constant), not an oversight — any move toward hard-blocking capture would be a founder-level product decision, not a bug fix.

## Questions for Fable
- Is the asymmetry between the gated "photo set" (scan) flow and the ungated quick single-photo (`pickFrom`) routes intentional (quick photos are meant only for the general library/timeline, never for scoring), or should quick-added photos that later get matched into a scored check-in also pass through `analyseProgressScanPhoto`?
- What does `docs/progress-scan-validation.md` and the calibration-corpus tests actually establish about the accuracy of the heuristic thresholds (blur/segmentation/framing/pose-confidence cutoffs)? This scout did not open those files; a request for a scoring-focused audit should read them directly rather than infer accuracy from the presence of tests alone.
- Is a stricter "baseline" first-capture experience (given it becomes every future reference image) already covered by product intent, or genuinely unaddressed?
