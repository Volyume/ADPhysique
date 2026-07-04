# Progress Photos Flagship Stage 2 Research And Risk Notes

Fresh clone audited from `main` at `acb295eeca0839847b28f9a0f5956876e26e794b`.

This file captures external verification used for the Stage 3 blueprint. It is not a claim that the current app already implements these capabilities.

## Product Accuracy Position

The right ambition is:

> A standardised, guided, on-device progress scan that is more consistent and useful than casual visual self-assessment.

The wrong ambition is:

> DEXA-level, clinical-grade, diagnostic body-composition measurement from arbitrary mirror selfies.

The research supports the plausibility of smartphone-image body-composition estimation under controlled/validated conditions, but not enough to make broad consumer-grade clinical claims without Volyume's own validation.

## Research Snapshot

PhotoScan preprint:

- Source: `https://arxiv.org/abs/2603.27017`
- Submitted 27 March 2026; revised 6 April 2026.
- The paper reports a smartphone imagery model fine-tuned on a clinical cohort and evaluated against DXA.
- Reported total body-fat percentage MAE is 2.15 percentage points in the abstract.

Risk interpretation:

- This is promising and directly relevant.
- It is still a preprint and the results are model/dataset/protocol-specific.
- Volyume cannot inherit those accuracy claims unless it uses an equivalently validated model and capture protocol.
- For consumer release, output should be an estimate with uncertainty, not a single authoritative truth.

Safe user-facing language:

- "Estimated body-fat range"
- "Scan confidence"
- "Comparable to your last scan"
- "This looks steady within the estimate range"
- "This supports a fat-loss trend"

Unsafe language:

- "Clinical grade"
- "DEXA equivalent"
- "Diagnostic"
- "Precise body-fat measurement"
- "We can tell exactly how much fat you lost from the photo"

## Vision Pipeline Feasibility

MediaPipe Pose Landmarker:

- Source: `https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker`
- Supports still images, decoded video frames, and live video feed.
- Outputs pose landmarks in image coordinates and world coordinates.
- Can output an optional segmentation mask.
- Has running modes for image, video, and livestream.

MediaPipe Image Segmenter:

- Source: `https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter`
- Supports still images, decoded video frames, and live video feed.
- Outputs category masks and confidence masks.
- Includes person-related segmentation models, though the docs mark MediaPipe Solutions Preview as early release.

Pipeline that fits Volyume:

1. Standardised capture, not arbitrary upload.
2. Pose/landmark validation.
3. Person segmentation/silhouette extraction.
4. Deterministic quality scoring.
5. Body-composition estimator with uncertainty.
6. Delta engine that compares only like-for-like scans.

The app should not start with real-time heavy inference unless necessary. A post-capture still-image quality gate and analysis pipeline is lower-risk across iOS and Android.

## Runtime Options

### LiteRT / TFLite Path

Source: `https://developers.google.com/edge/litert`

LiteRT is Google's current on-device framework for high-performance ML deployment on edge platforms. The docs show deployment paths for Android and iOS/macOS, with model conversion to `.tflite` and hardware acceleration options.

Volyume fit:

- Better match for a compact CV pipeline.
- App already has React Native new architecture and `react-native-nitro-modules`.
- `react-native-fast-tflite` is likely a lower-disruption bridge if the chosen model is TFLite.
- Must verify native binary compatibility, model bundling, Expo config plugin needs, and Android 16 KB page-size compliance.

### ExecuTorch Path

Source: `https://github.com/software-mansion/react-native-executorch`

The README currently lists:

- iOS 17.0 minimum.
- Android 13 minimum.
- New React Native architecture only.
- Latest GitHub release observed: v0.9.2 on 17 June 2026.

Volyume fit:

- App has new architecture enabled.
- Current iOS deployment target is 16.0, so this path would force an iOS target increase unless requirements change.
- This may be acceptable later, but it is a bigger product/support decision than the TFLite/LiteRT route.

## Android 16 KB Page-Size Gate

Source: `https://developer.android.com/guide/practices/page-sizes`

Native libraries and SDKs must be tested/rebuilt for 16 KB page-size devices. The feature is especially relevant for any native ML/runtime dependency.

Release requirement:

- Add Android 16 KB page-size validation before shipping native CV runtime.
- Use APK Analyzer/lint and device/emulator tests where available.
- Treat third-party native libraries as part of this gate, not only Volyume's own code.

## Store And Privacy Constraints

Apple App Review Guidelines:

- Source: `https://developer.apple.com/app-store/review/guidelines/`
- Apple restricts repurposing data from Camera/Photo APIs and health/fitness contexts for advertising, marketing, or data mining without appropriate consent.
- Apple says apps must not write false or inaccurate data into HealthKit or other health/medical apps.

Google Play User Data:

- Source: `https://support.google.com/googleplay/android-developer/answer/10144311`
- Data safety labels must clearly and accurately describe collection, use, and sharing.
- Privacy policy must disclose personal and sensitive data accessed/collected/used/shared, secure handling, retention, and deletion.
- Account deletion must delete associated user data, with retention exceptions disclosed.

GDPR:

- Source: `https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng`
- Health data and special-category data require careful lawful basis/consent handling.
- Automated processing/profiling transparency requires meaningful information about logic, significance, and consequences where applicable.

Practical implication:

- Body photos plus body-composition estimates should be treated as highly sensitive health/fitness data.
- If analysis remains local-only and no upload happens, that reduces collection/sharing scope, but it does not remove the need for clear consent, deletion, retention, and explanation.
- Do not use photo-analysis data for ads/marketing.
- Do not write scan estimates to HealthKit.

## Bias And Fairness Risk

Direct public evidence for body-photo body-fat estimation bias by skin tone/body type is limited. That does not make the risk small; it makes the risk under-measured.

Known risk classes:

- Lighting and skin tone can alter segmentation quality.
- Clothing fit/colour can alter silhouette.
- Camera height/distance/lens distortion can alter proportions.
- Sex, age, disability, limb differences, body-fat distribution, muscularity, and body size can shift model error.
- Back/front/side pose inconsistency can produce false trends.

Required product stance:

- Make no equal-accuracy claims across groups unless validated.
- Show uncertainty.
- Abstain when quality is poor.
- Let users save photos without analysis.
- Explain that the scan is a fitness-tracking estimate, not a medical test.

## Recommended Compliance Copy Skeleton

Consent screen:

> Progress Scan analyses your photos on this device to estimate body-composition trends. Your photos are private to this device unless you choose to share or export them. The estimate is approximate and can vary with lighting, pose, camera angle, clothing and body type. It is not a medical test and should not be used to diagnose or treat any condition.

Estimate screen:

> Estimate: 18-22%. Confidence: good. This is a fitness estimate, not a clinical measurement. Use the trend across comparable scans, not a single scan in isolation.

Abstention:

> I cannot give a useful estimate from this photo. The whole body needs to be visible and the camera needs to be steadier. You can retake it or save the photo without analysis.

Coach wording:

> Your latest scan supports the same direction as your scale trend, so I would treat this as real progress. I would not change calories from the scan alone.
