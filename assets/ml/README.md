# Progress Scan model assets

`selfie_segmentation.tflite` is bundled for the on-device Progress Scan v1 pipeline.

- Source: `https://storage.googleapis.com/mediapipe-assets/selfie_segmentation.tflite`
- Model family: MediaPipe Selfie Segmentation general model
- Licence: Apache License 2.0, per the MediaPipe model card
- Input used by the app: 256x256 RGB, normalised to `[0.0, 1.0]`
- Output used by the app: 256x256 foreground mask
- SHA-256: `9EE168EC7C8F2A16C56FE8E1CFBC514974CBBB7E434051B455635F1BD1462F5C`

The app uses this only as a person-mask/silhouette model. It is not a body-fat
model, not a medical device, not a DEXA replacement, and not an authority for
nutrition safety floors. Progress Scan converts measured silhouette signals
into a Volyume Leanness Score, Leanness Band, Scan Confidence and Progress
Signal with abstention gates.

`progress_scan_bf_estimator_v1.json` is retained as a legacy versioned
on-device regressor contract after segmentation. Its percent output is not shown
to users and is not persisted as a body-fat result for new Progress Scans.
Visible Progress Scan output is the Volyume visual score/band/confidence layer
derived from the TFLite silhouette signals. Front and back scan photos are
required. The side pose is optional and only improves context when available.

Progress Scan output is photo context only. It is never an authority for
Katch-McArdle, FFM floors, calorie floors, or a deeper deficit.
