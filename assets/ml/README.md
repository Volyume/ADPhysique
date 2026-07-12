# Progress Scan model assets

`selfie_segmentation_v2.tflite` is bundled for the on-device Progress Scan v1 pipeline.

- Model family: MediaPipe Selfie Segmentation general model (256x256), the
  SAME network as the original MediaPipe release, converted to builtin
  TFLite ops only.
- Why v2 (2026-07-12, Sentry VOLYUME-1F): the original MediaPipe asset
  contains the MediaPipe-proprietary custom op `Convolution2DTransposeBias`,
  which the stock TFLite interpreter in `react-native-fast-tflite` cannot
  resolve. `createModel` therefore threw on every device on both platforms
  and the TFLite path never ran; scans silently used the native fallback.
  v2 unfuses that custom op into the builtin `TRANSPOSE_CONV`, keeping the
  identical IO contract ([1,256,256,3] float32 in, [1,256,256,1] float32
  sigmoid mask out, same `activation_10` output tensor).
- Op inventory (verified by flatbuffer parse, no CUSTOM/Flex ops): ADD,
  AVERAGE_POOL_2D, CONV_2D, DEPTHWISE_CONV_2D, DEQUANTIZE, HARD_SWISH,
  LOGISTIC, MUL, RESIZE_BILINEAR, TRANSPOSE_CONV. Weights are float16
  (as in the original asset); IO stays float32.
- Conversion source: PINTO model zoo #109 (Selfie Segmentation),
  `model_float16_quant.tflite` from
  `https://s3.ap-northeast-2.wasabisys.com/pinto-model-zoo/109_Selfie_Segmentation/resources.tar.gz`
- Licence: Apache License 2.0 (MediaPipe model card); conversion repo MIT.
- Validation (2026-07-12): loads and runs under a real TFLite interpreter
  (the original asset reproduces the production failure "Encountered
  unresolved custom op: Convolution2DTransposeBias" under the same
  interpreter); segments a real person photo correctly through the app's
  exact letterbox + `[0.0, 1.0]` preprocessing.
- The v2 file name is deliberate: the native `resolveBundledModel` caches by
  file name under `caches/progress_scan_models/` and reuses any existing
  cached copy, so a same-name swap would leave existing installs on the
  broken cached model forever.
- Input used by the app: 256x256 RGB, normalised to `[0.0, 1.0]`
- Output used by the app: 256x256 foreground mask
- SHA-256: `771cd3a11cad1a5259e308f42820e75f231abe44b6387d2025a5d8c00b2da339`

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
