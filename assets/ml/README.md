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
nutrition safety floors. Progress Scan v1 converts measured silhouette signals
into a provisional, low-confidence trend range with abstention gates.
