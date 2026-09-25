# SCAN-ACC-1: Progress Scan accuracy round. Spec (lead, 2026-09-25)

Authority: founder order 2026-07-13 ("when I next do a round of fixes I
want it improved"), board entry SCAN-ACC-1 (docs/TASKBOARD.md section 2),
register D84 and D85, the accuracy audit
docs/audit/progress-scan-accuracy-audit-2026-07-12.md (open founder
decisions D1 to D4), docs/progress-scan-validation.md (release gate,
acceptance lines), the two read lanes of 2026-09-25 (SR1 the native and
vision pipeline, SR2 the telemetry, harness and safety isolation; their
file:line evidence is quoted below), and the founder's 2026-09-25 answer
"Both, in board order" (this round first, then CP-10 theming).

Inviolables carried through unchanged: the engine stays pure and
deterministic (no clock, no randomness, no I/O in the scoring files); the
ED-safety isolation chain is untouched (the scan never moves a floor or a
target, `affectsTargets: false`, calm mode and an open ED flag suppress,
fail closed); the pure Core Graphics render guard on iOS keeps its intent
(no UIKit in the analysis render); both native modules change in lockstep
or not at all; no new dependency.

---

## 1. What the evidence says (SR1, SR2)

1. **The score path is platform-blind.** `calibrateVolyumeScore`
   (progressScanAnalysis.js:631-650) is one fixed curve for every device;
   nothing in the score or confidence path reads the platform. So the
   measured cross-device gap (shoulderToHeight 0.291 iOS against 0.311
   Android; bodyAreaRatio 0.133 against 0.143 to 0.152, board entry) is
   made UPSTREAM, in how the 256 px model input is produced.
2. **Five places the two native modules differ** (SR1 section 1):
   decode strategy (ImageIO thumbnail in one call on iOS,
   `BitmapFactory` power-of-two sampling plus a separate EXIF matrix on
   Android), EXIF handling path, the letterbox scale computed in 64-bit
   on iOS and 32-bit on Android (swift:88-96, kt:165-170), the resample
   filter (`interpolationQuality = .high` at swift:123 against
   `FILTER_BITMAP_FLAG` at kt:173), and colour (iOS draws into
   `CGColorSpaceCreateDeviceRGB()` at swift:86 with an implicit P3
   conversion; Android has no colour-space code at all).
3. **One frame per pose.** `ProgressGhostCapture.capture()` (279-312)
   calls `takePictureAsync` once; no burst or median exists anywhere.
4. **The side pose barely touches confidence.** Its own quality is
   excluded from every confidence average (`requiredPoseAssets`,
   progressScanAnalysis.js:136-142, 471-481); presence moves
   `viewCompletenessScore` from 0.92 to 1.0 at weight 0.10, about 0.008
   on a [0,1] score whose "high" threshold is 0.85.
5. **The body box already exists** in pass one (`bodyBox` fractions of
   `contentRect`, progressScanVision.js:846-853; `originalWidth/Height`
   returned by both natives), but no crop entry point exists on either
   platform (SR1 section 3.1).
6. **`bodyAreaRatio` is camera distance scored as shape** (audit D2;
   weight 0.15 in the score, progressScanAnalysis.js:514, 551-579). A
   zoom pass makes it near constant by construction, so this round
   cannot ship without deciding it.
7. **Telemetry is anonymous by construction** (SR2 section 1): no user,
   device or session id, day-resolution date, 5-unit height and weight
   bands; the 256 px pixels and mask ride only on three founder accounts
   (`vision_debug`); INSERT-only for the client, service role reads;
   `ratios`, `pose_ratios` and `quality` are jsonb, so new keys need no
   migration; `measurement_version` exists and is exercised
   (`silhouette_bands_anatomical_v3`).
8. **The offline harnesses prove the scoring layer only** (SR2 section
   3): the corpus, retest and sensitivity tests inject ratios; only the
   BodyM smoke test exercises `measureMaskSignals` on real masks. Nothing
   feeds a real photo through the native decode in a test, on any
   platform.
9. **Risks still live from D84** (SR1 section 5): decode and colour
   divergence (this round), the deprecated `manipulateAsync` in the
   capture orientation bake (progressPhotoOrientation.js:103, 113), the
   library-import path bypassing that bake (ProgressPhotosScreen.js:
   351-408), Android capture resolution unpinned while iOS is pinned to
   'Photo' (ProgressGhostCapture.js:570), two iOS render paths for one
   job (`extractRgb` and `preparedImage`), and no cross-run or
   cross-platform behavioural test of the vision layer.

---

## 2. The design (lead rulings, D33: best product, deterministic)

### 2.1 JavaScript owns the geometry; native decodes, orients, box-downsamples, colour-normalises

The cross-platform surface shrinks to one narrow native contract, the
same on both platforms:

```
decodeOriented(uri, maxLongSide) ->
  { width, height, originalWidth, originalHeight, colourSpace: 'srgb', rgbBase64 }
```

- Decode with the file's EXIF orientation applied. iOS:
  `CGImageSourceCreateThumbnailAtIndex` with
  `kCGImageSourceCreateThumbnailWithTransform: true` and
  `kCGImageSourceThumbnailMaxPixelSize` = 2048, drawn with
  `CGContext.draw` into a context created on
  `CGColorSpace(name: CGColorSpace.sRGB)` (item 3, P3 to sRGB, explicit).
  Android: `BitmapFactory` with the smallest power-of-two `inSampleSize`
  that brings the long side to 2048 or under, `inPreferredColorSpace`
  sRGB, then the EXIF matrix. Both JPEG decoders scale by power of two
  in the DCT domain, so this stage is the same class of operation on
  both platforms.
- Then ONE shared, exactly specified integer box filter in native code:
  factor = ceil(longSide / maxLongSide); each output pixel is the
  rounded mean of its factor x factor block (partial edge blocks average
  what they cover). Integer arithmetic, identical results on both
  platforms by construction. maxLongSide = 1024 from the caller.
- Return the RGB bytes and dimensions. No letterbox, no lighting score,
  no crop in native code any more.
- The pure Core Graphics guard is re-anchored to `decodeOriented`
  (`CGContext.draw`, no `UIImage(`, `.draw(in:`,
  `UIGraphicsPushContext` on code lines). A second guard pins the
  explicit sRGB colour space on iOS and `inPreferredColorSpace` on
  Android.

Everything after that runs once, in JavaScript, in a new pure module
`src/lib/progressScanRaster.js`:

- `letterbox(rgb, w, h, size = 256)`: scale to fit, black padding,
  `contentRect` in double precision with one rounding rule, area-averaging
  resample (exact box average when downscaling by an integer factor,
  bilinear otherwise). This replaces both natives' letterbox, so the
  256 px model input is built by one implementation on both platforms.
- `cropRect(bodyBox, contentRect, w, h, pad = 0.10)`: the pass-one body
  box mapped back to buffer pixels, padded by 10 percent of the box on
  each side, clamped to the buffer.
- `crop(rgb, w, h, rect)`.
- `lightingScore(rgb, w, h, contentRect)`: the native mean-luminance
  formula moved into JavaScript unchanged (swift:130-150, kt:181-203).
- A reference implementation of the native box filter, pinned by tests
  so the spec the natives implement is executable.

The native segmentation fallbacks (Apple Vision, ML Kit) keep working:
they gain `segmentPersonMaskFromRgb(rgbBase64, width, height)` and are
fed the JavaScript-built 256 px input, so the fallback path sees exactly
the input the primary TFLite path sees. `segmentPersonMask(uri, ...)`
and `extractRgb(uri, ...)` are removed once nothing calls them (the
guard test and index.ts follow).

Transport stays base64 (the existing contract and tests); a 1024 by 768
frame is about 3 MB of string, once per frame. Typed-array transport is
noted as a later optimisation, not part of this round.

### 2.2 Item 1: two-pass zoom (JavaScript)

`analyseProgressScanPhoto` runs: pass one on the letterboxed full frame
(mask, `bodyBox`, framing and whole-body gates as today); then the crop
from 2.1 letterboxed to 256; pass two produces the scan's signals
(ratios, blur, lighting, segmentation confidence, fragments) over a body
that fills the model's 256 px at any camera distance. Pass one's ratios
are kept as `passOne` for telemetry and for the `whole_body_not_visible`
and `multiple_people` gates. Same file, same two passes, same numbers:
deterministic.

`bodyAreaRatio` is replaced in the SCORE by `solidity =
foreground / bboxArea` (distance-invariant) under founder decision F1
below; `bodyAreaRatio` stays recorded as a diagnostic. The score anchors
for the replaced component are re-derived on the calibration corpus and
the founder's real exports by the retune lane (section 4).

### 2.3 Item 4: median of three frames per pose

Guided capture takes three frames in quick succession (shutter sound off
where the platform allows), analyses each (both passes), and takes the
per-signal MEDIAN across the frames that did not abstain; with two or
more abstentions the pose abstains with the majority reason. The frame
whose signals are nearest the median (sum of normalised absolute
deviations over the scored ratios) is the one saved as the pose photo;
the other two are discarded. `frameCount` and `frameSpread` (max minus
min of each scored ratio) are recorded. Library imports stay one frame
(`frameCount: 1`). The median of a fixed frame set is a pure function:
same frames, same result.

### 2.4 Item 5: the side pose counts

When a side asset is present, model-backed and abstention-free: its own
quality metrics join the confidence averages at half the weight of a
required pose (the three filter points at progressScanAnalysis.js:
136-142, 471-481, 1671-1672), `viewCompletenessScore` stays as it is, and
`withinScanConsistencyScore` gains the side-versus-front waist agreement.
The "high" tier still requires front and back foundational metrics. The
D85 prediction (side lifts a moderate scan to high) is pinned as a
fixture: a moderate front-and-back scan with clean side signals crosses
0.85; the same scan with a poor side photo does not fall below its
front-and-back reading (the corpus already pins "never worse").

### 2.5 Items 2 and 3: decode, resample and colour normalisation

Delivered by 2.1: one decode class per platform, one integer box filter
specified to the bit, one JavaScript letterbox, explicit sRGB on iOS and
Android. Android capture is pinned to the largest available picture size
(it was unpinned; iOS keeps 'Photo'). The deprecated `manipulateAsync`
call in the orientation bake migrates to the current image-manipulator
API in the same lane, behaviour unchanged; the library-import path now
gets the same orientation handling as the camera path because
`decodeOriented` applies EXIF for both.

### 2.6 Item 6: cross-device calibration, evidence first

A per-platform correction table would mask the divergence this round
removes at its source, and the only paired evidence today was produced
by the OLD pipeline. Ruling: no calibration table in this round.
Instead: `measurement_version` is minted (`two_pass_srgb_median_v4`) so
post-change rows are distinguishable; the new telemetry keys (`solidity`,
`passOne` ratios, `frameCount`, `frameSpread`, `colourSpace`,
`decodeWidth`, `decodeHeight`, `captureSource`) ride in the existing
jsonb columns, no cloud migration; and a founder-run parity check
(section 4) measures the residual iOS-versus-Android offset on the SAME
photos through the new pipeline. Only a proven residual offset earns a
correction, shipped as a versioned bundled asset (the
`progress_scan_bf_estimator_v1.json` precedent) and recorded in the
register; the app never reads telemetry back.

### 2.7 Score versions and comparability (lead ruling)

Every scan under the new pipeline carries the new `measurement_version`
and a bumped `PROGRESS_SCAN_SCORE_VERSION`. The existing, pinned
comparability rule (a measurement-version mismatch voids a comparison,
progressScanAnalysis.test.js:1054-1101) then keeps an old scan from ever
being read against a new one as a physique change. The trend surfaces
show the version boundary; no old score is rewritten.

---

## 3. The four founder decisions this round cannot ship without

These are the accuracy audit's D1 to D4, recorded as NOT pre-decided
because each changes a valid capture's score for live users. The
founder's order for this round authorises a score change; which change
is theirs. The lead's recommendation is given for each on the
best-product criterion.

- **F1 (audit D2), the body-area signal.** (a, recommended) replace it in
  the score with distance-invariant solidity (foreground over body-box
  area), re-anchored on the corpus and the founder's real exports; (b)
  drop it from the score and keep it as a diagnostic only, redistributing
  its 0.15 weight. Either recalibrates every existing user's score; the
  version boundary in 2.7 keeps old and new from being compared.
- **F2 (audit D1), a leaner body can score lower.** (a, recommended) make
  the estimator blend weight a continuous function of the gap (no step)
  and route the front-back spread into confidence only, then land the
  global monotonicity property test; (b) gate the boost so a lean
  estimate can only pull the score up; (c) accept and document the
  non-monotonicity.
- **F3 (audit D3), lean athletes at high BMI.** (a, recommended) grant the
  tight lean-protection clamp whenever the silhouette measures lean,
  regardless of BMI or a competition flag; (b) keep the BMI gate.
- **F4 (audit D4), unreliable captures.** (a, recommended) promote
  `segmentation_low_confidence`, `clothing_or_background_uncertain` and
  `camera_tilted` to withhold reasons (more abstentions, never a score
  built on an input the engine itself calls unreliable); (b) keep
  scoring them at the Low tier and amend the corpus to record it as
  intentional.

---

## 4. Validation (the contract)

1. **Raster module**: exact pins for letterbox geometry and rounding,
   area-averaging on synthetic buffers (uniform stays uniform; a 2 by 2
   block averages exactly), crop mapping round trip, the box-filter
   reference, lighting parity with the old native formula, determinism.
2. **Two passes**: on hand-built masks (and the BodyM masks the smoke
   test already downloads) pass two's ratios equal pass one's within
   0.01 when the body already filled the frame, and improve shoulder and
   waist resolution when it did not; solidity is invariant to a 2x
   framing change where `bodyAreaRatio` moved.
3. **Median of three**: odd and even counts, one and two abstentions,
   the saved frame is the nearest to the median, determinism.
4. **Side pose**: the moderate-to-high fixture; never-worse kept.
5. **Corpus retune**: `npm run progress-scan:calibration` green after
   re-derivation for solidity and the F1 to F4 rulings; retest and
   sensitivity harness reports regenerated and read; BodyM smoke run
   once and its report kept in this folder.
6. **Guards**: the re-anchored pure-CG guard, the sRGB guard, the model
   hash pin, the ED isolation suite, `affectsTargets: false` literals,
   the results contract's tone, purity of the raster and vision modules.
7. **Founder parity check (device)**: import the SAME two photos (one
   per pose) on both phones; export both scans; a new
   `npm run progress-scan:parity` replays the two exports and reports the
   per-ratio difference and the 256 px input's mean absolute pixel
   difference. Acceptance: scores within 2 points, ratios within 0.01,
   pixel difference under 2/255 mean. Then guided camera scans on both
   phones on the same day: within 3 points (the validation doc's
   high-tier acceptance line).

---

## 5. Lanes (two at a time, lowest capable tier, Section 4 discipline)

0. **Lead, hands-on**: `src/lib/progressScanRaster.js` and its tests,
   the constants and version strings, the native contract in
   `index.ts`. Everything else builds on it.
1. **SA-1 (Sonnet, native, lockstep)**: `decodeOriented` and
   `segmentPersonMaskFromRgb` on iOS and Android; sRGB; the integer box
   filter to the spec; removal of the native letterbox and lighting;
   guard tests re-anchored; Android capture size pinned.
2. **SA-2 (Sonnet, JavaScript vision)**: two-pass orchestration in
   `analyseProgressScanPhoto`, solidity, `passOne`, the telemetry keys,
   the measurement and score version bumps, the fallback wiring. Runs
   beside SA-1 (disjoint files; the contract is fixed by this spec).
3. **SA-3 (Sonnet, capture and scoring)**: median of three in
   `ProgressGhostCapture` and `onScanCaptured`, the side pose in
   confidence, the F1 to F4 rulings, the corpus retune with harness
   reports, the image-manipulator migration, the parity script.
4. **SA-4 (Opus)**: hostile review of the whole round against this spec
   before the founder's device walk.

Each lane lands as its own lead-reviewed commit over a green tree; the
board records every hash; the device checklist is delivered in chat.

---

## 6. Out of scope, noted

- A calibration correction table (2.6): only after the parity evidence.
- Typed-array transport for the decoded frame.
- HEIC-specific handling: both decoders read HEIC/HEIF natively; the
  parity check covers an imported HEIC.
- The scoring blueprint the validation doc cites
  (`scoring-accuracy-and-validation-blueprint.md`) is not in the
  repository; the validation doc carries the acceptance lines this spec
  uses.
- SR2's evidence note: PHOTO-SCAN-CHAIN-TRACE.md (2026-08-17) describes
  `photoCorroboration` as always null; the D99 corroboration landed the
  same day and is pinned (one confidence step, never a target). The
  trace's safety conclusion stands; its mechanism description is
  superseded. Recorded here, not acted on.
