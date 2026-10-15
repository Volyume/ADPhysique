# Video shares: native compositor research (D229)

Date: 2026-10-15. Status: research only, no code written, nothing in the repo changed except this file.
Authority: D229 and its three addenda (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`), `docs/audit/video-shares-2026-10-15/00-FOUNDER-BRIEF.md`.

Scope as corrected by the coordinator during the work: there is no Instagram Stories handoff and nothing outside the app (question 5 is dropped; section 6.4 only records how the finished MP4 is shared and saved exactly as the photo card is). Android gets two routes at equal depth (Media3 Transformer, and the Android SDK alone). Camera-app imports (HEVC, HDR, 4K and 60 fps, rotation, long clips, slow-mo, Live Photo) are covered in section 5 for both platforms.

How claims are sourced. `NM:` is a path under `/home/user/ADPhysique/node_modules` at the version shown. `M3src:` is a file inside the Media3 1.11.1 sources jar I downloaded and read (`https://dl.google.com/android/maven2/androidx/media3/<module>/1.11.1/<module>-1.11.1-sources.jar`, modules transformer, effect, common, exoplayer). `M3aar:` is a file inside the matching `.aar` from the same directory. `[U#]` is a URL in the Sources list at the end. Where I observed something in code or docs and am inferring what it means, the text says "observed" and "inferred" separately. Anything I could not check is in the last section.

---

## 0. Verdicts at a glance

| # | Question | Verdict |
|---|---|---|
| 1 | Android, Media3 Transformer | Feasible and the shortest path. Current stable is **1.11.1 (10 September 2026)**, Apache 2.0, minSdk 23, needs compileSdk 36 (the app has 36). The look needs **no custom shader**: Media3's `RgbMatrix` is applied as `uRgbMatrix * vec4(rgb, 1)` on gamma-encoded values, so a Skia 4x5 matrix maps onto it exactly, bias included (section 1.3). Framing is `Crop` plus `Presentation`, the card is `OverlayEffect`, trim is `ClippingConfiguration`, audio is `setRemoveAudio(true)`. About 200 lines of Kotlin. |
| 1b | Android, SDK only | Feasible, but it is the work Media3 already carries: roughly 950 to 1,400 lines of Kotlin plus a GLSL pass for SDR only, and a further 300 to 500 for HDR tone mapping, with an open-ended per-device workaround table (Media3 carries 24 `Build.*` workarounds today). I do not recommend it as the shipping route; I give a full sketch and a risk table so the choice is the lead's with eyes open (section 2). |
| 2 | iOS | AVFoundation and Core Image only, **no library**. Recommended: `AVMutableVideoComposition` built with the iOS 16 `videoComposition(with:applyingCIFiltersWithHandler:completionHandler:)`, a `CIContext` with colour management **off**, read through `AVAssetReaderVideoCompositionOutput` and written by `AVAssetWriter` (H.264 High, explicit bitrate). A custom `AVVideoCompositing` class is not better for this job (section 3.3). |
| 3 | Expo module glue | One new module `modules/volyume-video-export` (Android Kotlin and iOS Swift, the `progress-scan-image` shape). No `app.json` change for the compositor itself. Recommendation: pass native the **resolved placement rectangle** and the **final 20-number matrix**, not `crop` and `strength`, so there is one source of truth for the maths (section 6). |
| 4 | Capture and preview | `expo-camera` 17.0.10 records (muted, no mic) and `expo-image-picker` 17.0.11 selects. Skia 2.2.12 `useVideo` can draw frames through a `ColorMatrix`, **but** its Android implementation has defects visible in source that the share screen would hit: a possible frozen first frame when the file has no frame-rate key, a `seek` loop that can spin at end of stream, and a `MediaPlayer` that plays the clip's audio (section 7.3). Write a thin wrapper around `Skia.Video`. `expo-av` 16 `Video` cannot show the look and is deprecated; `expo-video` is not needed if Skia is the preview. |
| 5 | Instagram handoff | Dropped by instruction. |
| 6 | Size and time | Output about 11 to 16 MB for 15 s at 6 to 8.7 Mbps. Export time is **not measured by anyone I could find**; my estimate is 8 to 20 s on a mid-range Android and 6 to 15 s on an iPhone 12, to be replaced by a device measurement. Media3 adds about 4.5 MB of AAR (before R8) and no native libraries; iOS adds nothing. |
| 7 | Alternatives | ffmpeg-kit is retired (repository notice July 2026, Maven artefacts return 404). The React Native video packages are unmaintained (last npm publish 2022) or do not filter. Server export breaks D229-5 and the Article 9 posture. |

Decisions this research asks the lead to take, and the device tests that settle the open points, are in section 10.

---

## 0.1 Repo facts that shape every answer (observed)

1. **The card is not a simple overlay on a full-bleed picture.** In `src/lib/shareCard/drawShareCard.js` (`drawBackground`, lines 574 to 618), with a photo the renderer clips to the rounded outline, fills `PALETTE.bg0` under the photo, draws the photo (look applied via `lookPaint`), then the look's vignette (`drawVignette`, from line 536), then the tone-sampled scrim; outside the outline it paints the plain ground (`#0D0D0D`, `DARK_PALETTE.bg0`, line 68). `SharePhotoFramer.js` (header, lines 1 to 27) already renders the card with `omitPhoto` so the inside of the outline is clear and the photo sits underneath, moved by a translate and scale. For video this means: **overlay PNG = the existing `omitPhoto` render** (ground outside the outline, vignette and scrim and text inside, transparent where the picture shows), and the compositor only has to place, colour and sit the clip underneath it. The vignette and scrim are already in the PNG; the compositor does not draw them.
2. **Every look is a pure RGB affine map.** I ran `PHOTO_LOOKS` (`src/lib/shareCard/photoLooks.js`) through node: for all seven looks the alpha row is `[0,0,0,1,0]` and the alpha-to-colour terms (indices 3, 8, 13) are exactly 0, at full strength and at 0.8. Biases lie between -0.132 and +0.025. `lookMatrix(key, t)` already returns the matrix at strength `t` (identity moved `t` of the way), so **strength is already inside the 20 numbers**; passing `strength` as well as the matrix would invite a double application.
3. **Framing maths is one function.** `photoCoverRect(iw, ih, W, H, crop)` (`drawShareCard.js`, lines 369 to 378) returns `{x, y, w, h}`, the placed rectangle of the source in output pixels, top-left origin, clamped (cover: no gap; zoom below 1 down to the contain fit: the clip floats inside the canvas). `MAX_PHOTO_ZOOM` is 4 (line 153).
4. **The share path is `Sharing.shareAsync(uri, {mimeType, UTI, dialogTitle})` and `MediaLibrary.saveToLibraryAsync(uri)`** (`src/screens/ShareCardScreen.js`, lines 893 to 960). Cards are rendered by an offscreen `Skia.Surface` and written as base64 PNG to `FileSystem.cacheDirectory`.
5. **Existing modules** (the pattern to copy): `modules/progress-scan-image` (both platforms: `expo-module.config.json` lists `expo.modules.progressscanimage.ProgressScanImageModule` and `ProgressScanImageModule`; `android/build.gradle` applies the Expo core plugin; `ios/ProgressScanImage.podspec` with `s.platforms = { :ios => '16.0' }`), `modules/rest-timer-live` (Android; declares `Events("onRestTimerAction")`, `RestTimerLiveModule.kt`, line 137) and `modules/live-activity` (iOS). Each is wired through `package.json` as `"name": "file:./modules/name"` (lines 122, 123, 144). JS wrappers call `requireNativeModule` inside try/catch and expose `isAvailable()`.
6. **Toolchain.** React Native 0.81.5 ships Kotlin 2.1.20, AGP 8.11.0, compileSdk 36 (`NM: react-native/gradle/libs.versions.toml`, RN 0.81.5). `app.json` sets compileSdk 36, targetSdk 36, minSdk 26 and iOS deployment target 16.0 through `expo-build-properties` 1.0.10. Android production builds are an AAB (`eas.json`, `production.android.buildType`). `RECORD_AUDIO`, `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` are in `blockedPermissions` (`app.json`, lines 75 to 83).
7. **Skia and Reanimated are both installed**: `@shopify/react-native-skia` 2.2.12, `react-native-reanimated` 4.1.7, `react-native-worklets` 0.5.1. `ProgressPhotoCompare.js` already uses a Skia `<Canvas>` with `<Image>`.

---

## 1. Android route A: Media3 Transformer

### 1.1 Version, compatibility, licence, dependency

| Item | Finding | Source |
|---|---|---|
| Current stable, October 2026 | **1.11.1, released 10 September 2026**. Previous: 1.11.0 (5 Aug 2026), 1.10.1 (12 May 2026), 1.9.4 (16 May 2026). No RC or beta outstanding. Maven `lastUpdated` 2026-09-11. | [U1], [U2] |
| compileSdk | AAR metadata of `media3-effect`, `media3-transformer`, `media3-common` 1.11.1: `minCompileSdk=36`. 1.10.1 also 36; 1.9.4 is 35. App is on 36, so it compiles. If anyone ever lowers compileSdk below 36, 1.10.1 and 1.11.1 stop building. | M3aar `META-INF/com/android/build/gradle/aar-metadata.properties` |
| minSdk | 23 (`<uses-sdk android:minSdkVersion="23"/>` in the transformer and effect manifests; release note "Update minSdk to 23", 1.9.0). App minSdk is 26. | M3aar `AndroidManifest.xml`, [U1] |
| Licence | Apache License 2.0 (POM for `media3-transformer:1.11.1`). | [U3] |
| Coordinates | `androidx.media3:media3-transformer:1.11.1`, `androidx.media3:media3-effect:1.11.1`, `androidx.media3:media3-common:1.11.1` (the three Google's guide lists; all Media3 modules must be the same version). | [U6] |
| Transitive artefacts the founder's "yes" should name | `media3-exoplayer`, `media3-muxer`, `media3-container`, `media3-datasource`, `media3-extractor`, `media3-decoder`, `media3-database` (all 1.11.1), `androidx.annotation:annotation:1.6.0`, `androidx.concurrent:concurrent-futures:1.2.0`, `androidx.exifinterface:exifinterface:1.3.6`, `androidx.annotation:annotation-experimental:1.3.1`, `com.google.guava:guava:33.3.1-android`, `org.jetbrains.kotlin:kotlin-stdlib:2.2.10`, `org.jetbrains.kotlinx:kotlinx-coroutines-guava:1.9.0`. | Maven `.module` files for transformer, effect, exoplayer, common at 1.11.1 [U2] |
| Native libraries | None in any of the ten Media3 AARs (`unzip -l | grep .so` finds nothing in each). | M3aar |
| Manifest additions | Media3 common and exoplayer add `ACCESS_NETWORK_STATE`; exoplayer adds `WAKE_LOCK`. Both are normal permissions; `WAKE_LOCK` is already declared in `app.json`. No services, receivers, providers or activities. Whether `ACCESS_NETWORK_STATE` is already merged from another library is not checked. | M3aar `AndroidManifest.xml` x10 |

**Kotlin metadata caveat (observed, risk inferred).** `media3-effect` 1.11.1 depends on `kotlin-stdlib:2.2.10`; 1.10.1 and 1.9.4 depend on 2.0.20. RN 0.81.5 builds with Kotlin 2.1.20. Kotlin compilers read metadata one minor version ahead, so 2.1.20 reading 2.2.x should compile, but I have not built it. **Fallback pin: 1.10.1** (same Transformer API surface used below; the only Transformer change in 1.11.0 is a `ExportResult.fileSizeBytes` over-report fix, per [U1]). The first EAS Android build with 1.11.1 settles it; a failure would be at compile time, not in front of a user.

### 1.2 API map (all verified in the 1.11.1 sources jars)

| Need | API | Notes (source) |
|---|---|---|
| Composition | `Composition.Builder(EditedMediaItemSequence.Builder(edited).build()).setHdrMode(...).build()`; `Transformer.start(composition, path)` | `Composition.java` lines 70, 209; `EditedMediaItemSequence.Builder(EditedMediaItem...)` line 138. `fromSingleItem` is package-private, so build the sequence yourself. |
| Trim | `MediaItem.Builder().setUri(u).setClippingConfiguration(ClippingConfiguration.Builder().setStartPositionMs(s).setEndPositionMs(e).build())` | [U7]. Because effects force a transcode, trim is frame-accurate; the "trim optimisation" flags do not apply. |
| Drop audio | `EditedMediaItem.Builder(item).setRemoveAudio(true)` | `EditedMediaItem.java` line 118; [U6]. |
| Frame-rate cap | `EditedMediaItem.Builder.setFrameRate(30)` is a **maximum**: higher-rate sources drop frames, lower-rate sources are untouched. Added in 1.10.0. | `EditedMediaItem.java` lines 198 to 225; [U1] |
| Colour look | `RgbMatrix` (a 4x4 `float[16]`, column-major, `android.opengl.Matrix` convention) | Section 1.3 |
| Zoom and position | `Crop(left, right, bottom, top)` in NDC; may exceed -1 and 1 to "crop to a larger frame"; background black, alpha 0 | `Crop.java` lines 31 to 58 |
| Output size | `Presentation.createForWidthAndHeight(w, h, LAYOUT_STRETCH_TO_FIT)` | `Presentation.java` line 172 |
| Card overlay | `OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(bitmap)))`, default settings | Section 1.5 |
| H.264 | `Transformer.Builder(ctx).setVideoMimeType(MimeTypes.VIDEO_H264)` | `Transformer.java` line 254 |
| Bitrate | `DefaultEncoderFactory.Builder(ctx).setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(n).build())` | `DefaultEncoderFactory.java` line 119; default is `w*h*fps*0.07*2` (Kush gauge), `getSuggestedBitrate`, line 959 |
| Progress | `transformer.getProgress(ProgressHolder)` returns `PROGRESS_STATE_AVAILABLE` and fills `holder.progress` 0 to 100; poll (Google's sample polls every 500 ms) | `Transformer.java` line 1139; [U6] |
| Cancel | `transformer.cancel()`. **It does not call a listener and does not delete the output file** ("The export output file (if any) is not deleted"). | `Transformer.java` lines 1146 to 1175 |
| Threading | `start`, `getProgress`, `cancel` must be called from the `Transformer`'s looper (default: the thread that built it, else main). In an Expo module run the function on `Queues.MAIN` (`expo-camera` does the same: `NM: expo-camera/android/.../CameraViewModule.kt`, `.runOnQueue(Queues.MAIN)`). | `Transformer.java` lines 1042 to 1050 |
| One export at a time | "Concurrent exports on the same Transformer object are not allowed." | `Transformer.java` line 1031 |
| Errors | `ExportException.errorCode`, `getErrorCodeName()`; codes listed in section 5.4 | `ExportException.java` |

### 1.3 The 4x5 colour matrix: what Media3 actually does (the important finding)

Media3's guide never names `RgbMatrix` [U7]; its Javadoc says "4x4 RGB color transformation matrix" and "colors will be in linear RGB BT.709". Read alone that suggests (a) no bias column and (b) linear light, either of which would make the app's looks come out different from the photo path. **Both are wrong for an 8-bit SDR clip with the default settings**, and I checked the shader the library ships:

- `M3aar: res/raw/fragment_shader_transformation_sdr_external_es2.glsl` (decoder output) and `..._sdr_internal_es2.glsl` (bitmaps) both contain
  `vec4 transformedColors = uRgbMatrix * vec4(workingColors, 1);` and then `gl_FragColor = vec4(convertToOutputColors(transformedColors.rgb), inputColor.a);`
  The constant 1 in the fourth component means **the matrix's fourth column is a per-channel bias**, so `(r', g', b') = M3x3 * (r, g, b) + (b0, b1, b2)` (column vectors) is expressible.
- `DefaultVideoFrameProcessor.WORKING_COLOR_SPACE_DEFAULT` (the factory default, `DefaultVideoFrameProcessor.java` line 124) is documented as using the input colour space with no transfer conversion for sRGB or SDR video, and `convertToWorkingColors` returns `inputColor` unchanged in that mode. So the matrix is applied to the **gamma-encoded** values, which is what Skia's `ColorFilter.MakeMatrix` does to the photo. (Javadoc line 193 says "default value is WORKING_COLOR_SPACE_LINEAR"; the code at line 169 sets `WORKING_COLOR_SPACE_DEFAULT`. The documentation is inconsistent with the code; verify with a grey-ramp test clip on a device, section 10.2 item 3)

Mapping from the Skia row-major 20 (`R' = m0 R + m1 G + m2 B + m3 A + m4`, and so on) to Media3's column-major 16. Because the clip is opaque (A = 1) the alpha terms fold into the bias, and every current look has them at zero anyway:

```kotlin
// m = lookMatrix(key, strength) from photoLooks.js, 20 floats, row-major, biases in 0..1
fun skiaToRgbMatrix(m: FloatArray): FloatArray = floatArrayOf(
    m[0],        m[5],        m[10],        0f,   // column 0: contribution of input R to (R', G', B', A')
    m[1],        m[6],        m[11],        0f,   // column 1: input G
    m[2],        m[7],        m[12],        0f,   // column 2: input B
    m[4] + m[3], m[9] + m[8], m[14] + m[13], 1f,  // column 3: bias (alpha terms folded, A = 1)
)
```

A guard test should assert on the JS side that for every look `m[15..19] = [0,0,0,1,0]`, so a future look with alpha-to-colour terms cannot silently differ.

**A 3D LUT is not needed.** `SingleColorLut.createFromCube(int[][][])` exists (`SingleColorLut.java`), would reproduce the look through a baked cube, and I considered it as the fallback if the matrix route were wrong. It is not needed, and a cube adds quantisation (8-bit ARGB entries) that the direct matrix does not have.

### 1.4 Zoom, position and aspect: exact mapping from `photoCoverRect`

Let `r = photoCoverRect(iw, ih, W, H, crop)` (computed in JS with the upright source size). The visible window of the source, as fractions of the source, is `u0 = -r.x / r.w`, `u1 = (W - r.x) / r.w`, `v0 = -r.y / r.h`, `v1 = (H - r.y) / r.h` (top-left origin). In Media3's NDC (y up) that is

```
Crop(left = 2*u0 - 1, right = 2*u1 - 1, bottom = 1 - 2*v1, top = 1 - 2*v0)
```

followed by `Presentation.createForWidthAndHeight(W, H, LAYOUT_STRETCH_TO_FIT)`. The crop window already has the output aspect (`r.w / r.h = iw / ih`), so the stretch is an identity in shape. I ran the repo's own `photoCoverRect` and `photoZoomRange` through node for three cases. A 1920x1080 clip at zoom 1 on 1080x1920 gives left -0.316, right 0.316, bottom -1, top 1 (a centred 9:16 slice; `Crop` reports 608x1080, ratio 0.5630 against 0.5625). The contain fit (zoom 0.3164) gives left -1, right 1, bottom -3.160, top 3.160, which `Crop` accepts ("use values below -1 and above 1") and fills with transparent black; its nominal output is 1920x3413, which I infer is never allocated as a texture because the three effects are merged into one pass. A 1080x1920 clip at zoom 2, centre (0.3, 0.6) on 1080x1350 gives left -0.900, right 0.100, bottom -0.552, top 0.152 and a ratio of exactly 0.8000. Because `Crop`, `Presentation` and `RgbMatrix` are all merged by `DefaultVideoFrameProcessor.createGlShaderPrograms` into one `DefaultShaderProgram` ("Combines consecutive GlMatrixTransformations and RgbMatrices into a single DefaultShaderProgram", `DefaultVideoFrameProcessor.java` lines 1022 to 1040), this is **one GPU pass with one resample**, not three.

Consequences to design around:
- The native side needs no copy of `photoCoverRect`. Send the rectangle (section 6).
- Where the clip does not fill the frame (zoom below 1), the gap is **black**, not `#0D0D0D`, because `Crop` documents "black, with alpha = 0". The photo path shows `#0D0D0D` there. The difference is 13/255 and visible only on a calibrated screen, but it is a mismatch. Options: limit video zoom to 1 or above (no gap), accept it, or use the hand-built route (route B draws the ground exactly). Lead decision.
- A 1080 by 1350 export is the riskiest size on Android: 1350 = 2 x 675, so it is only 2-aligned. Encoders that report `getHeightAlignment()` of 4, 8 or 16 make `EncoderUtil.getSupportedResolution` (`EncoderUtil.java` lines 255 to 305) round it to a neighbour, and the file comes out a few pixels off 4:5. 1080 by 1920 (1920 = 16 x 120) and 1080 by 1080 are safer. The final shader stage scales to the encoder's size (`FinalShaderProgramWrapper.outputSizeBeforeSurfaceTransformation`), so overlays are composited before that scale; I have not run it on an encoder that actually falls back.

### 1.5 The card overlay

`BitmapOverlay.createStaticBitmapOverlay(bitmap)` with default settings. `OverlayMatrixProvider.getTransformationMatrix` (`OverlayMatrixProvider.java`) scales the overlay by `overlaySize / backgroundSize` in pixels, so a 1080x1920 bitmap over a 1080x1920 frame is drawn 1:1 with no resampling (observed). `OverlayEffect` "assumes a non-linear working colour space for SDR input", so the PNG's alpha is blended in gamma space, the same domain Skia used to draw the scrim and text (observed, `OverlayEffect.java` class comment). Decode the PNG with `BitmapFactory` (premultiplied `ARGB_8888`, 8.3 MB for 1080x1920) and keep the effect list order `Crop, Presentation, RgbMatrix, OverlayEffect`: `createGlShaderPrograms` merges the consecutive matrix-type effects into one shader program that runs before the next non-matrix effect (`DefaultVideoFrameProcessor.java` lines 1022 to 1080), so the look is applied to the clip and never to the overlay. Defaults are `scale (1,1)` and both anchors `(0,0)` (`OverlaySettings.java` lines 33 to 39).

### 1.6 HDR and codec facts that matter

- `Composition.Builder.setHdrMode` default is `HDR_MODE_KEEP_HDR`; Google's guidance is to prefer `HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL` (`Composition.java` lines 196 to 210), supported **API 29+**, "more consistent results"; `..._USING_MEDIACODEC` is API 31+ on certain devices, API 33+ for devices with HDR capture, and throws otherwise [U9]. We always set OPEN_GL.
- With KEEP_HDR and a request for H.264, Media3 falls back to HEVC for HDR content (`TransformerUtil.getOutputMimeTypeAndHdrModeAfterFallback`, lines 286 to 304), which would produce a 10-bit HEVC file. Setting the tone-map mode explicitly is therefore mandatory for an H.264 SDR output.
- On API 26 to 28, an HDR source throws `ExportException` "Decoding HDR is not supported on this device." (`DefaultDecoderFactory.java`, lines 263 to 275). Section 5.4 turns that into user copy.
- Google's sharing guide recommends H.264 **High profile, level 4**, bitrate **5 Mbps or more at 1080x1920**, and B-frames only on Android 10 and up (on API 26 to 28 the platform `MediaMuxer` limits them) [U12]. `DefaultEncoderFactory` applies those profile settings itself (lines 835 onward). The page's HDR snippet uses an older `TransformationRequest.setHdrMode`; the current call is `Composition.Builder.setHdrMode`.

### 1.7 Kotlin sketch: one export call

Compiles against the 1.11.1 signatures I read; not built.

```kotlin
package expo.modules.volyumevideoexport

import android.content.Context
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.Crop
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbMatrix
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import java.io.File

data class Placement(val x: Float, val y: Float, val w: Float, val h: Float) // photoCoverRect, output px, top-left origin

@OptIn(UnstableApi::class)
class ShareVideoExporter(private val context: Context) {
  private val main = Handler(Looper.getMainLooper())
  private var transformer: Transformer? = null
  private var outFile: File? = null
  private var ticker: Runnable? = null
  private var onSettled: ((ok: Boolean, code: String, message: String) -> Unit)? = null

  /** Call on the main thread (Queues.MAIN). */
  fun start(
    sourceUri: String, startMs: Long, durationMs: Long,
    matrix20: FloatArray?, place: Placement,
    overlayPng: String, outW: Int, outH: Int, bitrate: Int,
    onProgress: (Float) -> Unit,
    done: (ok: Boolean, code: String, message: String) -> Unit,
  ) {
    check(transformer == null) { "export already running" }
    onSettled = done
    val out = File(context.cacheDir, "volyume-share-${System.currentTimeMillis()}.mp4").also { outFile = it }

    // Visible window of the source in NDC (section 1.4)
    val u0 = -place.x / place.w;  val u1 = (outW - place.x) / place.w
    val v0 = -place.y / place.h;  val v1 = (outH - place.y) / place.h
    val effects = mutableListOf<Effect>(
      Crop(2f * u0 - 1f, 2f * u1 - 1f, 1f - 2f * v1, 1f - 2f * v0),
      Presentation.createForWidthAndHeight(outW, outH, Presentation.LAYOUT_STRETCH_TO_FIT),
    )
    matrix20?.let { m -> val rgb = skiaToRgbMatrix(m); effects += RgbMatrix { _, _ -> rgb } }
    val overlay = BitmapFactory.decodeFile(overlayPng)         // premultiplied ARGB_8888, outW x outH
    effects += OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(overlay)))

    val item = MediaItem.Builder().setUri(sourceUri)
      .setClippingConfiguration(
        MediaItem.ClippingConfiguration.Builder()
          .setStartPositionMs(startMs).setEndPositionMs(startMs + durationMs).build())
      .build()
    val edited = EditedMediaItem.Builder(item)
      .setRemoveAudio(true)
      .setFrameRate(30)                        // maximum; 60 fps sources drop to 30
      .setEffects(Effects(emptyList(), effects))
      .build()
    val composition = Composition.Builder(EditedMediaItemSequence.Builder(edited).build())
      .setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL)   // API 29+; older + HDR -> ExportException
      .build()

    val t = Transformer.Builder(context)
      .setVideoMimeType(MimeTypes.VIDEO_H264)
      .setEncoderFactory(
        DefaultEncoderFactory.Builder(context)
          .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(bitrate).build())
          .build())
      .addListener(object : Transformer.Listener {
        // Uri.fromFile gives file:///... (MediaLibrary needs three slashes; File.toURI() gives one)
        override fun onCompleted(c: Composition, r: ExportResult) { stopTicker(); settle(true, "ok", android.net.Uri.fromFile(out).toString()) }
        override fun onError(c: Composition, r: ExportResult, e: ExportException) {
          stopTicker(); out.delete(); settle(false, e.getErrorCodeName(), e.message ?: "export failed")
        }
      })
      .build()
    transformer = t
    t.start(composition, out.absolutePath)

    val holder = ProgressHolder()
    ticker = object : Runnable {
      override fun run() {
        if (t.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) onProgress(holder.progress / 100f)
        main.postDelayed(this, 250)
      }
    }.also { main.post(it) }
  }

  /** Main thread. Cancel never calls the listener, so settle here and delete the partial file. */
  fun cancel() {
    transformer?.cancel(); stopTicker(); outFile?.delete(); settle(false, "CANCELLED", "cancelled")
  }

  private fun settle(ok: Boolean, code: String, msg: String) {
    transformer = null; onSettled?.invoke(ok, code, msg); onSettled = null
  }
  private fun stopTicker() { ticker?.let { main.removeCallbacks(it) }; ticker = null }
}
```

Gradle for the module (`build.gradle`, same plugin preamble as `progress-scan-image/android/build.gradle`):

```groovy
dependencies {
  def media3 = "1.11.1"   // fallback "1.10.1" if the Kotlin 2.2 metadata check fails
  implementation "androidx.media3:media3-transformer:$media3"
  implementation "androidx.media3:media3-effect:$media3"
  implementation "androidx.media3:media3-common:$media3"
}
```

### 1.8 Known limits and device gaps (Media3)

- Hardware encoders are the throughput limit "for use cases without heavyweight effects processing"; device-specific failures are fixed by workarounds in the library over time [U8]. In 1.11.1 `media3-transformer` and `media3-effect` carry **24** device checks (`grep Build.MODEL|DEVICE|SOC_MODEL|MANUFACTURER|ID`), including: Pixel 6 `TP1A` builds and several Galaxy Z Fold models (HDR tone mapping disabled), Redmi Note 9 Pro (`joyeuse`, frame-rate key), `vivo 1906`, `redmi 7a`, `redmi 8` (use a software decoder for 1080p because "some devices fail to configure a 1080p hardware encoder when a 1080p hardware decoder was created", b/283768701), and encoder operating-rate overflows on SM8550, SM7450, SM6450, SC9863A, T612, T606, T603 (`DefaultDecoderFactory.java` lines 427 to 493; `DefaultEncoderFactory.java` lines 819 to 833).
- Encoder fallback is on by default (`DefaultEncoderFactory.Builder.setEnableFallback(true)`): an unsupported size, profile or bitrate is replaced rather than failing, and `Transformer.Listener.onFallbackApplied` reports it. The output may therefore not be exactly 1080 wide on a weak encoder; the exporter should return the real width and height.
- 10-bit: handled only as an input (tone-mapped to 8-bit SDR). We never ask for 10-bit output.
- File size: unlimited by the API; set the bitrate (section 8).
- Slow-motion flattening for Samsung SEF files (`setFlattenForSlowMotion`) "is not supported yet" together with `ClippingConfiguration` (`EditedMediaItem.java` lines 154 to 156), so it cannot be combined with our trim (section 5.2).
- Emulators: the guides say nothing; treat device behaviour as unverified until run on hardware.

---

## 2. Android route B: the Android SDK only

Pipeline: `MediaExtractor` reads the (trimmed) video track, a `MediaCodec` decoder renders into a `SurfaceTexture`, one OpenGL ES 2.0 pass applies placement, the 4x5 look and the overlay, the result is drawn into the `Surface` of a `MediaCodec` H.264 encoder (`createInputSurface()`), and `MediaMuxer` writes the MP4. This is the structure of Google's own CTS test `ExtractDecodeEditEncodeMuxTest` ("extracts frames, decodes them to a surface, edits with a shader, encodes from the resulting surface, muxes", encoder keys `COLOR_FormatSurface`, `KEY_BIT_RATE`, `KEY_FRAME_RATE`, `KEY_I_FRAME_INTERVAL`; the test deliberately uses multiples of 16 "all tested devices seem to be able to handle") [U13], of Andy McFadden's `DecodeEditEncodeTest`, `EncodeAndMuxTest` and `CameraToMpegTest` [U14], and of Grafika (Apache 2.0) whose `EglCore` shows `EGL_RECORDABLE_ANDROID = 0x3142` and `EGLExt.eglPresentationTimeANDROID` (`gles/EglCore.java` lines 51 and 313 to 315 on `master`) [U15]. Nothing here needs a dependency.

### 2.1 What each stage has to get right

| Stage | Work | Where it goes wrong (evidence) |
|---|---|---|
| Probe | `MediaMetadataRetriever` and `MediaFormat`: upright size, `KEY_ROTATION` (API 23), duration, frame rate, `KEY_COLOR_TRANSFER` (API 24, `MediaFormatUtil.java` line 296 comment), codec MIME | `KEY_FRAME_RATE` is optional in a `MediaFormat` (Skia's own reader guards it with `containsKey`, `RNSkVideo.java` line 77); treat as unknown, never as 0 |
| Seek and trim | `extractor.seekTo(startUs, SEEK_TO_PREVIOUS_SYNC)`, decode and discard frames before `startUs`, stop at `endUs`, subtract `startUs` from every timestamp | Decoding from the sync sample before the start costs up to a GOP (about 1 s) |
| Decoder | `MediaCodec.createDecoderByType(mime)` configured with the `SurfaceTexture`'s `Surface`; releases with `releaseOutputBuffer(i, true)`; the GL thread calls `updateTexImage()` after `onFrameAvailable` | Calling `updateTexImage` on the thread that blocks `onFrameAvailable` deadlocks; use a separate `HandlerThread` for the listener |
| Dolby Vision | DV tracks must be opened as plain HEVC (profile 8, 4), AVC (profile 9) or AV1 (profile 10); profile 5 and 7 cannot | Media3's table: `MediaCodecUtil.getAlternativeCodecMimeType`, `DolbyVisionProfileDvheDtr/DvheSt -> H265`, `DvavSe -> H264`, `Dvav110 -> AV1`; "this can't be done for profile DvheStn ... not backward compatible" (M3src exoplayer `MediaCodecUtil.java` lines 391 to 415). A hand-built route has to replicate this |
| HDR to SDR | Request decoder tone mapping with `KEY_COLOR_TRANSFER_REQUEST = COLOR_TRANSFER_SDR_VIDEO` (API 31 per `DefaultCodec.java` line 526 comment), or tone-map in GLSL from an HLG or PQ external-texture path | Media3 blocks the MediaCodec route on Pixel 6 `TP1A` builds and several Galaxy Z Fold models (`DefaultDecoderFactory.java` lines 445 to 466) and itself falls back to a GL tone mapper (API 29+). A GL tone mapper means YUV-aware sampling: Media3 ships `fragment_shader_transformation_external_yuv_es3.glsl` and `..._hdr_internal_es3.glsl` for this (M3aar `res/raw`) |
| EGL | EGL display, a config with `EGL_RECORDABLE_ANDROID`, a window surface on the encoder's input surface, `eglPresentationTimeANDROID(display, surface, ptsNs)` before every `eglSwapBuffers` | Without correct per-frame timestamps "some devices will drop frames or encode them at low quality" (bigflake FAQ) [U14] |
| GL pass | One shader: placement rectangle, `SurfaceTexture.getTransformMatrix`, look matrix, premultiplied overlay blend, ground colour | OES sampling assumes the driver's YUV to RGB conversion matches the clip's colour standard; devices differ (bigflake FAQ: "the layout of the YUV frames varies from device to device") |
| Encoder | `createEncoderByType("video/avc")`, `COLOR_FormatSurface`, bitrate, 30 fps, 1 s GOP; profile High, level 4 and B-frames only after querying `CodecCapabilities` | Google's guidance: High profile level 4, B-frames only on Android 10+ and not on API 26 to 28 with `MediaMuxer`, never B-frames on Baseline [U12]; size must pass `VideoCapabilities.isSizeSupported` and the alignment (Media3 `EncoderUtil.getSupportedResolution`, 509-line `EncoderUtil` plus 1,005-line `DefaultEncoderFactory` exist for this) |
| Muxer | `MediaMuxer(path, MUXER_OUTPUT_MPEG_4)`; `addTrack` only after `INFO_OUTPUT_FORMAT_CHANGED`; `writeSampleData` for every buffer except config | The CTS test is written to check how codec configuration passes from the encoder to the muxer [U13]; the sketch skips `BUFFER_FLAG_CODEC_CONFIG` buffers because the muxer receives the configuration through `enc.outputFormat` (my reading of that test, not a quoted rule) |
| Teardown | Release decoder, encoder, surfaces, EGL, muxer in a `finally`; delete the partial file on failure or cancel | A leaked hardware codec instance stays held until the process dies, and the device has a small fixed number of instances |

### 2.2 Kotlin sketch (skeleton of the loop; not compiled)

```kotlin
class SdkExporter(private val ctx: Context, private val o: Options, private val progress: (Float) -> Unit) {
  @Volatile var cancelled = false

  fun run(out: File) {
    val ex = MediaExtractor().apply { setDataSource(ctx, Uri.parse(o.sourceUri), null) }
    val track = (0 until ex.trackCount).first { ex.getTrackFormat(it).getString(MediaFormat.KEY_MIME)!!.startsWith("video/") }
    ex.selectTrack(track)
    val inFmt = ex.getTrackFormat(track)
    ex.seekTo(o.startMs * 1000, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
    val startUs = o.startMs * 1000; val endUs = startUs + o.durationMs * 1000

    // 1. Encoder first: its input Surface must exist before EGL is created on it.
    val encFmt = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, o.outW, o.outH).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
      setInteger(MediaFormat.KEY_BIT_RATE, o.bitrate)
      setInteger(MediaFormat.KEY_FRAME_RATE, 30)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
      // KEY_PROFILE / KEY_LEVEL / KEY_MAX_B_FRAMES only after CodecCapabilities says they are supported
    }
    val enc = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    enc.configure(encFmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    val encSurface = enc.createInputSurface()
    enc.start()

    // 2. EGL on that surface (EglCore as in Grafika, FLAG_RECORDABLE), GLES 2.0 is enough.
    val egl = EglCore(encSurface).also { it.makeCurrent() }
    val gl = CardProgram(o)                       // OES texture, overlay texture, the shader below
    val st = SurfaceTexture(gl.videoTex)
    val frameLock = Object(); var frameReady = false
    st.setOnFrameAvailableListener({ synchronized(frameLock) { frameReady = true; frameLock.notifyAll() } }, listenerHandler)

    // 3. Decoder renders into the SurfaceTexture.
    val dec = MediaCodec.createDecoderByType(alternativeMime(inFmt))   // Dolby Vision -> HEVC/AVC/AV1, section 2.1
    if (Build.VERSION.SDK_INT >= 31 && isHdr(inFmt))
      inFmt.setInteger(MediaFormat.KEY_COLOR_TRANSFER_REQUEST, MediaFormat.COLOR_TRANSFER_SDR_VIDEO)
    dec.configure(inFmt, Surface(st), null, 0); dec.start()

    val muxer = MediaMuxer(out.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var muxTrack = -1; var lastKeptUs = Long.MIN_VALUE; var inputDone = false; var outputDone = false
    val info = MediaCodec.BufferInfo()
    try {
      while (!outputDone) {
        if (cancelled) throw CancellationException()
        // feed
        if (!inputDone) {
          val i = dec.dequeueInputBuffer(10_000)
          if (i >= 0) {
            val n = ex.readSampleData(dec.getInputBuffer(i)!!, 0)
            val t = ex.sampleTime
            if (n < 0 || t > endUs) { dec.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inputDone = true }
            else { dec.queueInputBuffer(i, 0, n, t, 0); ex.advance() }
          }
        }
        // decode -> GL -> encode
        val d = dec.dequeueOutputBuffer(info, 10_000)
        if (d >= 0) {
          val keep = info.presentationTimeUs >= startUs && info.size > 0 &&
                     (lastKeptUs == Long.MIN_VALUE || info.presentationTimeUs - lastKeptUs >= 29_000)   // 60 -> 30 fps
          dec.releaseOutputBuffer(d, keep)             // keep == render to the SurfaceTexture
          if (keep) {
            synchronized(frameLock) { while (!frameReady) frameLock.wait(500); frameReady = false }
            st.updateTexImage(); st.getTransformMatrix(gl.texMatrix)
            gl.draw()                                   // placement + look + overlay in one pass
            egl.setPresentationTime(((info.presentationTimeUs - startUs) * 1000))
            egl.swapBuffers()
            lastKeptUs = info.presentationTimeUs
            progress(((info.presentationTimeUs - startUs).toFloat() / (endUs - startUs)).coerceIn(0f, 1f))
          }
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) { enc.signalEndOfInputStream() }
        }
        // drain encoder -> muxer
        while (true) {
          val e = enc.dequeueOutputBuffer(info, 0)
          if (e == MediaCodec.INFO_TRY_AGAIN_LATER) break
          if (e == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) { muxTrack = muxer.addTrack(enc.outputFormat); muxer.start(); continue }
          if (e >= 0) {
            if (info.size > 0 && info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0) muxer.writeSampleData(muxTrack, enc.getOutputBuffer(e)!!, info)
            enc.releaseOutputBuffer(e, false)
            if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) { outputDone = true; break }
          }
        }
      }
      muxer.stop()
    } catch (t: Throwable) { out.delete(); throw t }
    finally { /* release dec, enc, muxer, gl, egl, st, ex in reverse order */ }
  }
}
```

```glsl
// Fragment shader for the single pass (placement + look + overlay + ground). The look matrix is the same
// column-major mat4 as section 1.3, so JS sends one format to both Android routes.
#extension GL_OES_EGL_image_external : require
precision highp float;
uniform samplerExternalOES uVideo;  uniform sampler2D uOverlay;
uniform mat4 uTexMatrix;  // SurfaceTexture.getTransformMatrix (rotation, crop, Y flip)
uniform vec4 uRect;       // photoCoverRect / output size: x, y, w, h as fractions, top-left origin
uniform mat4 uLook;       // bias in column 3
uniform vec3 uGround;     // 13/255 each: DARK_PALETTE.bg0
varying vec2 vOut;        // 0..1, top-left origin
void main() {
  vec2 uv = (vOut - uRect.xy) / uRect.zw;
  vec3 c = uGround;                                   // exact ground in the zoom-out gap (Media3 gives black)
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0)
    c = clamp((uLook * vec4(texture2D(uVideo, (uTexMatrix * vec4(uv, 0.0, 1.0)).xy).rgb, 1.0)).rgb, 0.0, 1.0);
  vec4 o = texture2D(uOverlay, vOut);                  // premultiplied PNG
  gl_FragColor = vec4(o.rgb + c * (1.0 - o.a), 1.0);
}
```

### 2.3 Device-compatibility risks (each with its evidence)

1. **Encoder size and alignment.** The CTS test uses multiples of 16 for safety [U13]; 1080 is a multiple of 8 only and 1350 of 2 only. Media3 needs `EncoderUtil.getSupportedResolution` with 13 reduction factors to cope. A hand-built route needs its own `VideoCapabilities.isSizeSupported`, `getWidthAlignment`, `getHeightAlignment` handling and a decision about what to do when 1080x1920 is not available.
2. **Hardware decoder and hardware encoder both at 1080p.** "Some devices fail to configure a 1080p hardware encoder when a 1080p hardware decoder was created" (vivo 1906, Redmi 7A, Redmi 8), solved in Media3 by forcing a software decoder (`DefaultDecoderFactory.java` lines 480 to 493). Our 1080p-to-1080p case is exactly that.
3. **Chipset quirks.** Encoder operating-rate overflow on SM8550, SM7450, SM6450, SC9863A, T612, T606, T603; decoder priority on s5e8835 and SA8155P; frame-rate key on Redmi Note 9 Pro (`joyeuse`); 8K HEVC on two Galaxy Fold models. A route that never sets `KEY_OPERATING_RATE` avoids some, at a speed cost.
4. **HDR.** Decoding HDR is refused by Media3 below API 29; the platform tone-mapping request is API 31 and blocklisted on some Pixel 6 and Fold builds; the GL tone-mapping path needs external YUV sampling. This is the largest single item of work.
5. **B-frames and `MediaMuxer`.** Platform limitations on API 26 to 28 [U12].
6. **Colour conversion.** OES sampling uses the driver's YUV to RGB matrix; Media3 has dedicated YUV shaders for HDR because that is not good enough.
7. **Timestamps, frame dropping, EOS.** Easy to get subtly wrong: a missed `signalEndOfInputStream` hangs; a non-monotonic timestamp is dropped by some encoders.
8. **Cancel and teardown** must free hardware codecs on every exit path.

### 2.4 Honest size of the native code (my estimate, not measured)

| Part | Kotlin lines (non-blank) | Notes |
|---|---|---|
| EGL core (Grafika-derived: display, config, recordable window surface, makeCurrent, presentation time) | 150 to 200 | Grafika `EglCore` is 372 lines with comments |
| GL program, textures, quad, overlay upload | 120 to 160 | plus about 30 lines of GLSL |
| Extractor, trim, decode loop, frame decimation | 200 to 260 | |
| Encoder set-up with capability queries and fallback ladder | 150 to 250 | Media3 spends 1,500 lines on this |
| Muxer and drain loop | 80 to 120 | |
| Probe, rotation, Dolby Vision mapping, HDR flags | 150 to 250 | |
| Module glue, events, cancel, error mapping, cleanup | 100 to 150 | |
| **SDR-only total** | **about 950 to 1,400** | versus about 200 for route A |
| HDR tone mapping on API 29 and up (GLSL transfer functions, YUV sampling, BT.2020 to 709) | +300 to 500 | Media3's tone-mapping shaders are the reference |
| Per-device workarounds | grows with every Play device report | Media3 has 24 today |

### 2.5 Comparison and verdict

| | A: Media3 | B: SDK only |
|---|---|---|
| New dependency | yes (founder-gated, Apache 2.0, about 4.5 MB of AARs before R8, no native libs) | none |
| Code to own | about 200 lines | about 950 to 1,900 lines |
| HDR, Dolby Vision fallback, encoder fallback, device workarounds | carried by Google, updated per release | ours |
| Look and framing fidelity | exact for the matrix; black (not `#0D0D0D`) in a zoom-out gap | exact, including the ground |
| Single pass | yes (merged shader), then the overlay pass | yes (one pass) |
| Update path | bump the version | maintain |

Verdict: **route A is the recommendation**. Route B is the right answer only if the founder declines Media3, and then it needs a real device matrix (at least one Snapdragon 8 Gen 2 phone, one Exynos, one MediaTek and one low-end Unisoc or Redmi) before it can be trusted, because the failures in 2.3 are all device-specific.

---

## 3. iOS: AVFoundation and Core Image, no library

### 3.1 Library status

Nothing to add. The module imports `AVFoundation`, `CoreImage`, `CoreMedia`, `CoreVideo` (system frameworks, auto-linked by Swift `import`), uses `ExpoModulesCore` as the existing pods do, and needs `s.platforms = { :ios => '16.0' }` in its podspec, matching `modules/progress-scan-image/ios/ProgressScanImage.podspec`. Every API below is available at iOS 16: `videoComposition(with:applyingCIFiltersWithHandler:completionHandler:)` is iOS 16.0 and later [U16]; async `loadTracks(withMediaType:)` and `load(.preferredTransform)` are iOS 15 (from memory, not re-checked); the async `AVAssetExportSession.export(to:as:)` is back-deployed to iOS 13 (`@backDeployed(before: iOS 26.0)`) [U19]. `AVAssetExportSession.states(updateInterval:)` is iOS 18 only [U19].

### 3.2 Recommended pipeline

1. `AVURLAsset` on the source; take the first video track; **never add the audio track** to the working `AVMutableComposition` (this is how audio is dropped); `insertTimeRange(CMTimeRange(start: start, duration: dur), of: videoTrack, at: .zero)` is the trim; copy `preferredTransform` onto the composition track.
2. `AVMutableVideoComposition.videoComposition(with: composition, applyingCIFiltersWithHandler:)` (the iOS 16 async class method). Apple: the handler is called once per frame of the first enabled video track; `renderSize` "encompasses the asset's first enabled video track, respecting the track's preferredTransform"; `frameDuration` follows the nominal frame rate (30 fps if zero) [U16]. Then override `renderSize` to the output size and `frameDuration` to `1/30` (60 fps sources are decimated).
3. In the handler, `request.sourceImage` arrives at **source resolution** (a 4K clip arrives as 4K: "renderSize only changes the size of output frames, not the size of the source frames", Apple developer forums [U17]); scale, translate, colour, composite, crop to the output rectangle, `request.finish(with:context:)` with **our own long-lived `CIContext`** (Apple: do not create the context in the handler [U18]).
4. Read the composition with `AVAssetReaderVideoCompositionOutput` (BGRA) and write with `AVAssetWriter` (`.mp4`, H.264 High, explicit bitrate, BT.709 tags). Progress is the sample timestamp over the duration. Cancel is `reader.cancelReading()` plus `writer.cancelWriting()` plus delete the file.

Why reader and writer instead of `AVAssetExportSession`: the session takes a preset, and I could not find a source that says which codec, bitrate or exact pixel size `AVAssetExportPresetHighestQuality` yields with a 1080x1920 `renderSize` (the size presets are all landscape and "contain H.264 video and AAC audio" [U20]; the HEVC presets are separate). The writer makes codec, bitrate, profile, frame rate and colour tags explicit. The session variant is five lines and is a legitimate first spike; it is shown after the sketch.

### 3.3 Is a custom `AVVideoCompositing` class better than the CI handler?

For one 4x5 matrix and one PNG overlay: **no**. Recommendation: CI handler now; keep the custom compositor as the escape hatch.

| Aspect | CI handler | Custom `AVVideoCompositing` |
|---|---|---|
| Code | about 60 lines | about 250: instruction class, compositor class with `sourcePixelBufferAttributes`, `requiredPixelBufferAttributesForRenderContext`, `renderContextChanged`, `startRequest`, `cancelAllPendingVideoCompositionRequests`, pixel-buffer pool use, thread safety |
| Rotation | documented: `renderSize` respects `preferredTransform`; I did not find a statement for the custom path, so assume you apply the transform | you apply it |
| HDR | built-in compositor converts HDR to SDR when `colorPrimaries`, `colorTransferFunction`, `colorYCbCrMatrix` are set to ITU_R_709_2 (WWDC20 10009) [U21] | `supportsHDRSourceFrames = false` (the default) makes the framework convert to SDR before it reaches you (same session) |
| Colour exactness | `CIContext` with colour management off (3.4) | same, or Metal; no gain for one matrix |
| API churn | the handler API is being superseded: `init(asset:applyingCIFiltersWithHandler:)` is documented as iOS 9 to 18 and discouraged from iOS 16; the request class page shows availability "iOS 9.0 to 27.0" (I read the upper bound as a deprecation version, inferred from the notation); the replacement is `AVVideoComposition(applyingFiltersTo:applier:)` async [U16], [U22] | `AVVideoCompositing` is the documented base mechanism of `AVVideoComposition` and is not marked deprecated [U22] |
| Overlay | `CIImage.composited(over:)` once per frame, overlay image created once | same |
| Verdict | use | switch only if Apple removes the handler or Instruments shows a real cost |

The Core Animation route (`AVVideoCompositionCoreAnimationTool`, a `CALayer` holding the PNG) is documented for `AVAssetExportSession` offline rendering and not for `AVPlayer` [U23]. I did not use it: it composites through Core Animation's colour-managed path (different blending domain from Skia), and I could not confirm whether it combines with a CI-handler composition or with `AVAssetReaderVideoCompositionOutput`.

The built-in compositor route (`AVMutableVideoCompositionInstruction` with `AVMutableVideoCompositionLayerInstruction.setTransform(_:at:)` and `setCropRectangle(_:at:)`, and the instruction's `backgroundColor` for the zoom-out gap) can express placement, zoom and position, using the track's `preferredTransform` concatenated with a scale and a translation. It cannot apply a colour matrix, and a composition cannot mix it with a CI handler or a custom compositor, so it does not serve this feature (API names from memory, not fetched). The CI handler does the placement itself, with the transform maths in the sketch below.

### 3.4 Colour parity: the gotcha that decides whether the look matches (observed)

- `CIColorMatrix` computes `s.r = dot(s, redVector)` and so on, then `s = s + bias`; Apple states it "is performed in the working color space of the Core Image context, using unpremultiplied pixel color values" [U24]. The mapping from Skia's row-major 20 is direct: `inputRVector = (m0, m1, m2, m3)`, `inputGVector = (m5, m6, m7, m8)`, `inputBVector = (m10, m11, m12, m13)`, `inputAVector = (m15, m16, m17, m18)`, `inputBiasVector = (m4, m9, m14, m19)`.
- **The default Core Image working space is extended-sRGB with linear gamma** [U25]. With defaults the matrix would be applied to linear light, and every look (they carry contrast biases such as -0.06) would come out different from the photo path, where Skia applies it to encoded values.
- Fix: `CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])`, which Apple documents as "Core Image perform no color management" [U25], and load the PNG overlay with `CIImage(contentsOf:options: [.colorSpace: NSNull()])`, documented the same way [U26], so the overlay's pixel values are used raw and alpha-blended in the same encoded domain that Skia and Media3 use.
- `finish(with:context:)` requires the output image in BGRA8 [U18]. Output is cropped to the output rectangle.
- The ground in a zoom-out gap is `CIImage(color:)` at 13/255, composited under the clip and over nothing else, so the gap is exactly `#0D0D0D` (better than Media3's black).

### 3.5 Swift sketch (not compiled)

```swift
import AVFoundation
import CoreImage
import ExpoModulesCore

struct Placement { var x, y, w, h: CGFloat }          // photoCoverRect, output px, top-left origin

final class ExportJob {
  private let lock = NSLock(); private var cancelledFlag = false
  var cancelled: Bool { lock.lock(); defer { lock.unlock() }; return cancelledFlag }
  func cancel() { lock.lock(); cancelledFlag = true; lock.unlock() }

  func run(sourceURL: URL, startMs: Int64, durationMs: Int64, matrix20: [Float]?, place: Placement,
           overlayURL: URL, outW: Int, outH: Int, bitrate: Int, dst: URL,
           progress: @escaping (Float) -> Void) async throws -> [String: Any] {
    let asset = AVURLAsset(url: sourceURL)
    guard let vt = try await asset.loadTracks(withMediaType: .video).first else { throw ExportError.noVideo }
    let start = CMTime(value: startMs, timescale: 1000), dur = CMTime(value: durationMs, timescale: 1000)

    // 1. Trim, no audio track added.
    let comp = AVMutableComposition()
    let ct = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try ct.insertTimeRange(CMTimeRange(start: start, duration: dur), of: vt, at: .zero)
    ct.preferredTransform = try await vt.load(.preferredTransform)

    // 2. Colour management off, built once.
    let ci = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
    let W = CGFloat(outW), H = CGFloat(outH)
    let overlay = CIImage(contentsOf: overlayURL, options: [.colorSpace: NSNull()])!   // premultiplied by CI
    let ground = CIImage(color: CIColor(red: 13/255, green: 13/255, blue: 13/255))
      .cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
    // CIColorMatrix parameters, built once; the filter itself is applied statelessly per frame.
    let lookParams: [String: Any]? = matrix20.map { m in [
      "inputRVector": CIVector(x: CGFloat(m[0]),  y: CGFloat(m[1]),  z: CGFloat(m[2]),  w: CGFloat(m[3])),
      "inputGVector": CIVector(x: CGFloat(m[5]),  y: CGFloat(m[6]),  z: CGFloat(m[7]),  w: CGFloat(m[8])),
      "inputBVector": CIVector(x: CGFloat(m[10]), y: CGFloat(m[11]), z: CGFloat(m[12]), w: CGFloat(m[13])),
      "inputAVector": CIVector(x: CGFloat(m[15]), y: CGFloat(m[16]), z: CGFloat(m[17]), w: CGFloat(m[18])),
      "inputBiasVector": CIVector(x: CGFloat(m[4]), y: CGFloat(m[9]), z: CGFloat(m[14]), w: CGFloat(m[19])),
    ] }

    // 3. Video composition from the CI handler (iOS 16 class method).
    let vc = try await AVMutableVideoComposition.videoComposition(with: comp) { request in
      let src = request.sourceImage.transformed(by: CGAffineTransform(translationX: -request.sourceImage.extent.minX,
                                                                       y: -request.sourceImage.extent.minY))
      let s = place.w / src.extent.width
      let scaled = src.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: s, kCIInputAspectRatioKey: 1.0])
        .transformed(by: CGAffineTransform(translationX: place.x, y: H - place.y - place.h))   // CI origin is bottom-left
      let clip = lookParams.map { scaled.applyingFilter("CIColorMatrix", parameters: $0) } ?? scaled
      let out = overlay.composited(over: clip.composited(over: ground)).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
      request.finish(with: out, context: ci)
    }
    vc.renderSize = CGSize(width: W, height: H)
    vc.frameDuration = CMTime(value: 1, timescale: 30)
    vc.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2           // HDR sources are converted to SDR first
    vc.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
    vc.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

    // 4. Reader -> writer.
    let reader = try AVAssetReader(asset: comp)
    let rout = AVAssetReaderVideoCompositionOutput(videoTracks: comp.tracks(withMediaType: .video),
      videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    rout.videoComposition = vc; reader.add(rout)
    try? FileManager.default.removeItem(at: dst)
    let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
    let win = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: outW, AVVideoHeightKey: outH,
      AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                                  AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                                  AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate,
                                        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                        AVVideoExpectedSourceFrameRateKey: 30,
                                        AVVideoMaxKeyFrameIntervalKey: 30]])
    win.expectsMediaDataInRealTime = false
    writer.add(win)
    guard reader.startReading(), writer.startWriting() else { throw writer.error ?? reader.error ?? ExportError.start }
    writer.startSession(atSourceTime: .zero)

    return try await withCheckedThrowingContinuation { cont in
      let q = DispatchQueue(label: "volyume.export")
      win.requestMediaDataWhenReady(on: q) { [self] in
        while win.isReadyForMoreMediaData {
          if cancelled {
            reader.cancelReading(); win.markAsFinished(); writer.cancelWriting()
            try? FileManager.default.removeItem(at: dst); cont.resume(throwing: ExportError.cancelled); return
          }
          guard let sb = rout.copyNextSampleBuffer() else {
            if reader.status == .failed { writer.cancelWriting(); cont.resume(throwing: reader.error ?? ExportError.read); return }
            win.markAsFinished()
            writer.finishWriting {
              if writer.status == .completed {
                let size = (try? FileManager.default.attributesOfItem(atPath: dst.path)[.size] as? Int) ?? 0
                cont.resume(returning: ["uri": dst.absoluteString, "width": outW, "height": outH, "fileSizeBytes": size])
              } else { cont.resume(throwing: writer.error ?? ExportError.write) }
            }
            return
          }
          progress(Float(CMSampleBufferGetPresentationTimeStamp(sb).seconds / dur.seconds))
          if !win.append(sb) { reader.cancelReading(); cont.resume(throwing: writer.error ?? ExportError.write); return }
        }
      }
    }
  }
}
```

The `AVAssetExportSession` spike, if you want the shorter route first (replace step 4):

```swift
let es = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality)!
es.videoComposition = vc; es.outputURL = dst; es.outputFileType = .mp4
try await es.export(to: dst, as: .mp4)        // back-deployed to iOS 13; cancel with Task.cancel()
// progress on iOS < 18: poll es.progress (deprecated in the current SDK but present);  iOS 18+: for await s in es.states(updateInterval: 0.25)
```
Then inspect the output track's `formatDescriptions` for codec and size before trusting it.

### 3.6 iOS gotchas

- **The export must run in the foreground.** Apple: "iOS and tvOS restrict a background app's access to the GPU ... If a Metal command queue tries to schedule command buffers after the app moves in the background, the system prevents those commands from executing" [U27]. Core Image's GPU renderer sits on Metal; I inferred, not tested, that a CI-handler export fails or crawls if the app is backgrounded. Design the progress sheet to block navigation, cancel on `UIApplication.didEnterBackground` (or fail with a calm retry), and keep the screen awake.
- **HDR clips.** `AVAssetTrack.mediaCharacteristics` contains `.containsHDRVideo` (iOS 14) for the probe [U28]. Setting the three colour properties to ITU_R_709_2 makes the built-in compositor convert HDR sources to SDR before the handler (WWDC20 10009) [U21]. If these are left unset, "the framework takes a policy, preferring HLG over PQ over SDR" and extended-range values above 1.0 reach the handler [U21].
- **`animationTool` and presets**: see 3.3.
- **Core Image edge handling**: no blur is applied, so no `clampedToExtent`.
- **4K sources**: 33 MB per BGRA frame; `CILanczosScaleTransform` is used for the downscale because a plain affine scale at a factor under 0.5 aliases. 60 to 30 fps is the `frameDuration` override.
- **File dates**: avoid reading file timestamps in the module (required-reason API category); `attributesOfItem[.size]` is not in that category as far as I know (not confirmed, listed in section 11).

---

## 4. Parity across preview, Android and iOS (what has to be tested, not assumed)

The look and framing are computed in three places that must agree: the Skia live preview, the Android pass and the iOS pass. Common mistakes are in the colour domain and the origin convention, so the contract is:

| Item | Skia preview | Android (Media3) | iOS (CI) |
|---|---|---|---|
| Matrix domain | encoded sRGB values (the photo path) | encoded values (default working space, shader read) | encoded values (colour management off) |
| Matrix layout | 20 row-major | `skiaToRgbMatrix` 16 column-major | `CIColorMatrix` vectors |
| Rect origin | top-left | NDC y up, so `v` flipped in `Crop` | CI y up, so `H - y - h` |
| Overlay blend | Skia, encoded | `OverlayEffect`, encoded | `composited(over:)` with colour management off, encoded |
| Zoom-out gap | `#0D0D0D` | black (route A) | `#0D0D0D` |

Test plan: a shipped 1920x1080 and a 1080x1920 test pattern clip (grey ramp, red/green/blue patches, a 1-pixel border), exported through each platform with each look at 0.5 and 1.0, with the frame at t = 0 compared against the Skia render of the same frame with the same look and rect. Tolerance of a few levels per channel for 8-bit YUV round trips; anything beyond that is a bug in this section's contract.

---

## 5. Imports from the phone's own camera app (addendum 3)

### 5.1 Probe first

Every row below depends on facts the picker may not give. Add a native `probeVideo(uri)` (Android: `MediaMetadataRetriever` and `MediaExtractor.getTrackFormat`; iOS: `AVURLAsset` track properties) returning upright width and height, rotation, duration, frame rate (nullable), codec, `hdr`, `hasAudio`, file size. What the stock packages give:

- `expo-image-picker` 17.0.11 Android reads `METADATA_KEY_VIDEO_WIDTH/HEIGHT/ROTATION/DURATION` and **swaps width and height when rotation is 90 or 270**, with a code comment that iOS already reports upright values (`NM: expo-image-picker/android/src/main/java/expo/modules/imagepicker/MediaHandler.kt` lines 111 to 136). It also returns `rotation`, which the TypeScript `ImagePickerAsset` type in `src/ImagePicker.types.ts` does not declare (observed: no `rotation` in that file).
- `expo-camera` 17.0.10 `recordAsync` resolves with `{ uri }` only (`NM: expo-camera/android/.../ExpoCameraView.kt` line 370), so a recorded clip's size and rotation are unknown without a probe.
- Do not use `AVAssetTrack.nominalFrameRate` to detect slow-mo: Apple's forum reports it returning 30 for 120 and 240 fps clips when read from a copied file [U29].

### 5.2 Case by case

| Case | Android, Media3 1.11.1 | iOS, AVFoundation | Known gaps |
|---|---|---|---|
| **HEVC (H.265) 8-bit SDR** | Decoded by the device's HEVC decoder; output requested as H.264 with `Transformer.Builder.setVideoMimeType(MimeTypes.VIDEO_H264)`. If no decoder: `ExportException` code 3001 or 3003 (`ERROR_CODE_DECODER_INIT_FAILED`, `..._DECODING_FORMAT_UNSUPPORTED`). | Native hardware decode on every iOS 16 device through `AVAssetReader`; H.264 out through `AVVideoCodecKey: .h264`. | Android devices without an HEVC decoder (rare at API 26 and up, not zero on very low-end Unisoc or older MediaTek parts; I have no source for a count). |
| **HDR 10-bit (HLG, HDR10, HDR10+)** | `Composition.Builder.setHdrMode(HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL)`: API 29+, consistent across devices [U9]. Below API 29 an HDR source throws "Decoding HDR is not supported on this device" (`DefaultDecoderFactory.java` lines 263 to 275). Do not use the `..._USING_MEDIACODEC` mode: API 31+, blocklisted on Pixel 6 `TP1A` builds and several Galaxy Z Fold models. | Set `colorPrimaries`, `colorTransferFunction`, `colorYCbCrMatrix` on the composition to `ITU_R_709_2`; the built-in compositor "will respect that setting and convert the HDR sources to SDR before compositing" (WWDC20 10009) [U21]. Probe with `AVMediaCharacteristic.containsHDRVideo` (iOS 14) [U28]. | Android API 26 to 28 with an HDR clip: cannot convert; the app must say so (5.4). The tone-map look is Media3's GL mapper, not Apple's, so the same clip will not be pixel-identical across platforms. |
| **Dolby Vision** | iPhone clips are Dolby Vision profile 8.4 (HLG-compatible). Media3 opens `DvheSt` (profile 8) and `DvheDtr` (profile 4) as plain HEVC, `DvavSe` (profile 9) as AVC, `Dvav110` (profile 10) as AV1, and returns no alternative for profile 5 (`DvheStn`, "not backward compatible") or the deprecated profile 7 (`DvheDtb`) (M3src exoplayer `MediaCodecUtil.java` lines 391 to 415). So an iPhone clip becomes HLG HEVC, then goes through the HDR row. A profile 5 or 7 file needs a real Dolby Vision decoder, which most phones lack, and fails with 3001 or 3003. | Decoded by AVFoundation on devices that support it, then converted to SDR through the same three colour properties. I did not find a source that states profile 5 behaviour; untested. | Profile 5 on Android is a hard gap. The encoder side is not a gap: we never encode HDR or Dolby Vision, only 8-bit SDR H.264. |
| **4K and 60 fps** | Decoder: whatever the device supports (a decoder that cannot do 3840x2160 at the clip's rate fails at configure, 3001 or 3003). Scaling: `Presentation` handles 4K to 1080 on the GPU in the same pass. Frame rate: `EditedMediaItem.Builder.setFrameRate(30)` is a maximum, so 60 fps sources drop to 30 and 24 or 25 fps stay (`EditedMediaItem.java` lines 198 to 225). Time cost roughly 2 to 4 times a 1080p30 clip. | Frames arrive at source resolution (33 MB BGRA at 4K); downscale in the handler with `CILanczosScaleTransform`; `frameDuration = 1/30` decimates 60 fps; `AVVideoExpectedSourceFrameRateKey: 30`. | Older Android mid-range phones may not decode 4K60 HEVC in real time. Skia's preview should not be fed the 4K source (7.3). |
| **Rotation: portrait, landscape, upside-down** | Frames reach the effect chain upright: the decoder's `KEY_ROTATION` flows through the `SurfaceTexture` transform matrix, which `ExternalTextureManager` applies including the 90 and 270 swap (lines 414 to 482), and `TransformerUtil` swaps width and height when `rotationDegrees % 180 != 0` (lines 207 to 208). 0, 90, 180 and 270 are all handled; the `Crop` maths in 1.4 therefore uses the **upright** size. By default portrait output is encoded landscape with a rotation flag (`setPortraitEncodingEnabled(false)`, documented as "more largely supported"); the file plays upright. | `renderSize` "respecting the track's preferredTransform" (Apple) [U16]; the handler's `sourceImage` is the transformed frame (inferred from that sentence; verify with a rotated sample). 180 degree clips handled the same way. | A **mirrored** clip (iPhone front camera with Mirror Front Camera on) stores a flip in the transform. iOS honours it; Media3's model is `rotationDegrees` only, so a flipped matrix is probably ignored on Android (inferred, not verified). The Skia preview's `rotation()` cannot express a mirror either (7.3). |
| **Long clip, chosen 15 s window** | `ClippingConfiguration.setStartPositionMs` and `setEndPositionMs`; the decoder starts at the previous keyframe and drops frames to the exact start. Export time depends on the window, not the file. | `insertTimeRange(CMTimeRange(start:duration:), of:, at:)` on an `AVMutableComposition`. | **The picker copies the whole file first**: Android `MediaHandler.kt` calls `copyFile(sourceUri, outputFile, ...)` to a `.mp4` in the cache; iOS passthrough streams the full-size resource with `PHAssetResourceManager.writeData` (`NM: expo-image-picker/ios/MediaHandler.swift` lines 370 to 404). At 40 Mbps (my assumption for a plain 4K30 HEVC recording) a 5 minute clip is a 1.5 GB copy, takes time, and needs cleanup after export. |
| **Drop audio** | `EditedMediaItem.Builder.setRemoveAudio(true)`: the audio track is not decoded, so unsupported audio codecs cannot fail the export [U6]. | Never insert the audio track into the `AVMutableComposition`. | None. |
| **iOS slow-mo** | n/a. Samsung SEF slow-motion: `setFlattenForSlowMotion(true)` exists but "is not supported yet" together with `ClippingConfiguration` (`EditedMediaItem.java` lines 154 to 156); treat it as a normal high-frame-rate file. | The picker's passthrough path copies the PHAsset's `.fullSizeVideo` resource (Apple: "a modified version of the original video asset" [U30]) else `.video`. For `loadFileRepresentation`, a developer reports slow-mo clips are re-encoded at about real time, "presumably to bake the slow-mo time segments" [U31]. So either a 240 fps original without the ramp, or a baked variable-speed file, may arrive. Both are ordinary files to AVFoundation; at `frameDuration = 1/30` a 240 fps original plays at **real** speed (the slow motion is lost), a baked file keeps its slow segments. | Unknown which the picker hands over in 17.0.11 for an untouched slo-mo clip. Needs one real slo-mo clip on a device (10.2). If real-speed is not acceptable, the retime is `AVMutableCompositionTrack.scaleTimeRange` on iOS and `EditedMediaItem.Builder.setSpeed(SpeedProvider)` plus `setFrameRate(30)` on Android; that is product behaviour, not a bug fix. |
| **iOS Live Photo** | n/a (Android Motion Photo is a JPEG with an embedded MP4; the picker returns the image and I found no extraction in 17.0.11). | `mediaTypes: ['livePhotos']` returns the still plus the paired video (`type: 'pairedVideo'`), exported by `handleLivePhoto` with `PHAssetResourceManager.writeData` (`NM: expo-image-picker/ios/MediaHandler.swift` lines 33 to 34, 216 to 260). With `['images']` the video is not returned. The paired clip is about 3 s and has audio (dropped). | A 3 s clip is a legitimate share background but is shorter than 15 s: loop or play once is a product choice (a loop needs the track inserted repeatedly on iOS, repeated items in the sequence on Android; not sketched). |

### 5.3 Preview of these sources

The module export always reads the original. The live preview does not have to. For any clip the probe flags (HDR, wider than 1080, above 30 fps, not 8-bit H.264 or HEVC, or file larger than a chosen size), consider a **preview proxy**: the same module, identity look, no overlay, 720p long edge or 1080x1920 at most, 30 fps, SDR, H.264, written to the cache and deleted after the share screen closes. It costs one extra short encode but removes three risks together: Skia's Android decoder path on 4K or 10-bit input, HDR frames drawn without tone mapping, and the allocation churn in 7.3. The final export never uses the proxy, so there is no generation loss in the file the person shares.

### 5.4 When a clip cannot be converted

Android error mapping (names from `ExportException.java`; `getErrorCodeName()` gives the string):

| `ExportException` code | Meaning | Class |
|---|---|---|
| 3001 `DECODER_INIT_FAILED`, 3002 `DECODING_FAILED`, 3003 `DECODING_FORMAT_UNSUPPORTED` | The phone cannot decode the clip (HDR below API 29, Dolby Vision profile 5 or 7, 4K60 beyond the decoder, missing HEVC) | A |
| 4001 `ENCODER_INIT_FAILED`, 4002 `ENCODING_FAILED`, 4003 `ENCODING_FORMAT_UNSUPPORTED` | The phone cannot create the H.264 | B |
| 5001 `VIDEO_FRAME_PROCESSING_FAILED` | GL failure, often memory | C |
| 2000 to 2008 (`IO_*`, 2005 file not found, 2006 no permission) | Source unreadable | D |
| `MUXING_FAILED`, `MUXING_TIMEOUT`, 1000, 1001 | Other | B |
| Storage full (an `IOException` underneath) | | E |

iOS: `AVError.Code` cases `decoderNotFound`, `fileFormatNotRecognized`, `operationNotSupportedForAsset` (class A); `exportFailed`, `mediaServicesWereReset` (class B); `diskFull` and `NSFileWriteOutOfSpaceError` (class E); a missing iCloud original (class F); app backgrounded during export (class G). Case names are from the `AVError.Code` enumeration; I could not open the page for numeric values.

Proposed copy (British English, calm, no blame, no em dash; to be checked against `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` by the lead). Every message keeps the photo card as a way forward, and none appears for a person-initiated cancel.

| Class | Message | Actions |
|---|---|---|
| A | "This phone cannot open that clip. Videos filmed in HDR, or at 4K and 60 frames a second, are sometimes too much for older phones. You could record a clip in Volyume instead, or choose a different one." | Record a clip, Choose another |
| B | "We could not make the video on this phone this time. Your photo card is ready to share instead." | Try again, Share the photo card |
| C | "That clip was too big for this phone to prepare. A shorter clip, or one filmed at a lower quality, should work." | Choose another |
| D | "We could not open that clip. It may have been moved or deleted." | Choose another |
| E | "There is not enough space on your phone to make the video. Once some space is free you can try again." | Try again |
| F | "That clip is still downloading from iCloud. You can try again once it has finished." | Try again |
| G | "The video stops if Volyume is closed while it is being made. Keep Volyume open and we will start again." | Start again |

Recorded-in-app clips (CameraX or AVCapture defaults, section 7.1) are the guaranteed-compatible path, which is why class A offers "Record a clip".

---

## 6. The Expo Modules glue

### 6.1 Layout (copy `progress-scan-image`, which already covers both platforms)

```
modules/volyume-video-export/
  package.json                    { "name": "volyume-video-export", "version": "0.1.0", "main": "index.ts", "private": true }
  expo-module.config.json         { "platforms": ["android","ios"],
                                    "android": { "modules": ["expo.modules.volyumevideoexport.VolyumeVideoExportModule"] },
                                    "ios":     { "modules": ["VolyumeVideoExportModule"] } }
  index.ts                        JS wrapper (try/catch requireNativeModule, isAvailable, same style as rest-timer-live/index.ts)
  android/build.gradle            Expo core plugin preamble + the three Media3 lines (1.7)
  android/src/main/AndroidManifest.xml   <manifest xmlns:android="http://schemas.android.com/apk/res/android" />
  android/src/main/java/expo/modules/volyumevideoexport/{VolyumeVideoExportModule,ShareVideoExporter,Probe}.kt
  ios/VolyumeVideoExport.podspec  copy of ProgressScanImage.podspec (name, :ios => '16.0', s.dependency 'ExpoModulesCore')
  ios/VolyumeVideoExportModule.swift, ios/ExportJob.swift
```
`package.json` gains `"volyume-video-export": "file:./modules/volyume-video-export"` next to lines 122, 123 and 144, and `package-lock.json` changes accordingly. That is the same mechanism as the three existing modules, but under CLAUDE.md "never add dependencies without asking" it is still a new `package.json` line; the lead should say so when asking. The third-party addition is only Media3 (D229 already gates it). Autolinking finds the module through the `expo-module.config.json` (`modules` arrays) exactly as `progress-scan-image` does.

### 6.2 JS API (recommended shape)

```ts
export type VideoProbe = {
  width: number; height: number;                 // upright
  rotation: 0 | 90 | 180 | 270; durationMs: number;
  fps: number | null; codec: string | null; hdr: boolean; hasAudio: boolean; fileSizeBytes: number | null;
};

export type ExportOptions = {
  sourceUri: string;                             // file:// URL (picker or camera cache file)
  startMs: number; durationMs: number;           // durationMs <= 15000
  matrix: number[] | null;                       // lookMatrix(key, strength): 20 numbers, strength already applied; null = no look
  rect: { x: number; y: number; w: number; h: number };  // photoCoverRect(srcW, srcH, outWidth, outHeight, crop)
  overlayPngUri: string;                         // the omitPhoto card render at outWidth x outHeight
  outWidth: number; outHeight: number;           // 1080x1920 | 1080x1080 | 1080x1350
  bitrate?: number;                              // default 8_000_000
};

export type ExportResult = { uri: string; width: number; height: number; durationMs: number; fileSizeBytes: number };

export function isAvailable(): boolean;
export function probeVideo(uri: string): Promise<VideoProbe | null>;
export function exportShareVideo(o: ExportOptions, onProgress?: (p: number) => void): Promise<ExportResult>;
export function cancelExport(): Promise<void>;
```

Differences from the brief's `{ sourceUri, startMs, durationMs, matrix, strength, crop: {zoom, cx, cy}, overlayPngUri, outWidth, outHeight }`, and why:
1. `strength` is removed: `lookMatrix(key, t)` already folds it in (0.1 fact 2); sending both can apply it twice.
2. `crop` is replaced by `rect`, the output of `photoCoverRect`, so native code holds no second copy of the clamping rules (min zoom, `placeAxis`) that could drift from `drawShareCard.js`. Native needs neither source size nor crop.
3. A `probeVideo` call is added (5.1), because framing needs the upright size and the camera returns only a URI.
4. Progress arrives as an event, not a callback, because that is how `rest-timer-live` already does it: native `Events("onExportProgress")`, JS `addListener` before the call and `remove()` in a `finally`. Only one export may run at a time (Transformer forbids concurrent exports on one instance; the iOS job holds one reader and writer). Cancel rejects the pending promise with `E_CANCELLED` and deletes the partial file on both platforms.

Android module definition (the pattern `expo-camera` and `rest-timer-live` use):

```kotlin
class VolyumeVideoExportModule : Module() {
  private val exporter by lazy { ShareVideoExporter(appContext.reactContext!!) }
  override fun definition() = ModuleDefinition {
    Name("VolyumeVideoExport")
    Events("onExportProgress")
    AsyncFunction("probeVideo") { uri: String -> Probe.read(appContext.reactContext!!, uri) }
    AsyncFunction("exportShareVideo") { o: ExportRecord, promise: Promise ->
      exporter.start(o.sourceUri, o.startMs, o.durationMs, o.matrix?.toFloatArray(), o.rect.toPlacement(),
        o.overlayPngUri, o.outWidth, o.outHeight, o.bitrate,
        onProgress = { sendEvent("onExportProgress", mapOf("progress" to it)) },
        done = { ok, code, msg -> if (ok) promise.resolve(mapOf("uri" to msg)) else promise.reject(code, msg, null) })
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelExport") { exporter.cancel() }.runOnQueue(Queues.MAIN)
  }
}
```
`ExportRecord` is an Expo `Record` with `@Field` properties, the same mechanism as `RecordingOptions` in `NM: expo-camera/android/.../Options.kt` and `CameraRecordingOptions` in `NM: expo-camera/ios/Current/CameraRecordingOptions.swift`. The iOS module is the Swift mirror: `Events("onExportProgress")`, `AsyncFunction("exportShareVideo") { (o: ExportOptions, promise: Promise) in Task { ... } }`.

### 6.3 `app.json` and build changes

- **Compositor: none.** Media3 is a Gradle dependency inside the module; AVFoundation and Core Image are system frameworks; `expo-build-properties` already sets compileSdk 36 (required by Media3 1.10.1 and 1.11.1) and iOS 16.0.
- Recommended copy edits, not technical blockers: `ios.infoPlist.NSCameraUsageDescription` and the `expo-camera` plugin `cameraPermission` both describe barcodes, labels and progress photos (`app.json` lines 31 and 257); they should also say short workout clips, because App Review reads the purpose string against the feature.
- `RECORD_AUDIO` stays in `blockedPermissions`; recording must pass `mute`. The iOS `NSMicrophoneUsageDescription` can stay as it is.
- A native change needs a new store build; `runtimeVersion.policy` is `appVersion`, so an OTA update cannot deliver it. The JS must hide the video options when `isAvailable()` is false, as the other modules do.
- Under the version-bump order in CLAUDE.md the build that carries this needs the minor bump, What's new entry and guard test.
- No jest mapper is needed (the existing modules have none); add guard tests for the look-matrix invariants (1.3) and for `rect` equal to `photoCoverRect`.

### 6.4 How the finished MP4 is shared and saved (replaces question 5)

Exactly the photo-card calls, with the video types:

```js
await Sharing.shareAsync(result.uri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: 'Share video' });
await MediaLibrary.saveToLibraryAsync(result.uri);   // uri must have an extension and, on Android, start with file:///
```
`expo-sharing` 14.0.8 takes `mimeType`, `UTI`, `dialogTitle` (`NM: expo-sharing/ios/SharingOptions.swift`, `android/.../SharingOptions.kt`); `expo-media-library` 18.2.1 documents "A URI to the image or video file. It must contain an extension. On Android it must be a local path, so it must start with `file:///`" (`NM: expo-media-library/src/MediaLibrary.ts` lines 589 to 597). So the exporter must return `Uri.fromFile(file).toString()` on Android (`File.toURI()` gives a single-slash form). The existing permission flow in `handleSaveToGallery` (`ShareCardScreen.js` lines 900 to 925) is unchanged. I did not verify on a device that the same add-only permission lets `saveToLibraryAsync` write a video on every Android API level.

---

## 7. Capture and preview with what is installed

### 7.1 `expo-camera` 17.0.10: record a clip

- `<CameraView mode="video" mute videoQuality="1080p" />`, then `ref.recordAsync({ maxDuration: 15, codec: 'avc1' })` and `ref.stopRecording()`. The promise resolves when recording stops, when `maxDuration` or `maxFileSize` is reached, or when the preview stops (`CameraView.tsx` doc, line 267).
- **No microphone, observed.** Android: `record` throws `MissingPermissions(RECORD_AUDIO)` only `if (!view.mute && !granted)`; with `mute` the recorder is started without `withAudioEnabled()` (`CameraViewModule.kt` line 430; `ExpoCameraView.kt` lines 329 to 349). iOS: with `isMuted` the session removes its audio input (`CameraSessionManager.swift` `updateSessionAudioIsMuted`, lines 127 to 156), so no audio device is opened.
- Android quality: `videoQuality` `'2160p' | '1080p' | '720p' | '480p' | '4:3'`, default 1080p with `FallbackStrategy.higherQualityOrLowerThan` (`ExpoCameraView.kt` lines 548 to 551); `videoBitrate` sets `setTargetVideoEncodingBitRate`; stabilisation is enabled (`setVideoStabilizationEnabled(true)`, line 569); `maxDuration` is an `Int` of whole seconds (`Options.kt`). The TypeScript doc says the quality list is Android only; iOS also maps `videoQuality` to `AVCaptureSession` presets (`CameraRecordingOptions.swift` `toPreset`, `CameraSessionManager.swift` line 345), observed.
- iOS: records a `.mov` (`CameraVideoRecording.swift` line 50); pass `codec: 'avc1'` so the codec is not left to the device default (default not confirmed). `toggleRecording` (pause and resume) is iOS 18 and later only; the simulator is not supported. Android records an `.mp4` in the cache and resolves `{ uri }` only.
- Android links CameraX `1.5.0-rc01` (`NM: expo-camera/android/build.gradle` line 18). CameraX and Media3 are separate androidx artefacts and do not depend on each other.

### 7.2 `expo-image-picker` 17.0.11: pick a clip

- `launchImageLibraryAsync({ mediaTypes: ['videos'] })`. **`videoMaxDuration` does not filter the library.** It is read by the camera contract on Android (`CameraContract.kt` line 37, `EXTRA_DURATION_LIMIT`) and by `UIImagePickerController.videoMaximumDuration` on iOS (`ImagePickerModule.swift` line 133). A library clip of any length arrives, so the 15 s cap at import is implemented by our trim UI, not the picker. `launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 15 })` is the zero-dependency capture alternative the share screen already uses for photos, but on Android it depends on the installed camera app ("effect of this option depends on support of installed camera app").
- `allowsEditing: true` with video gives iOS's system trim UI (limited to 600 s, `ImagePickerExceptions.swift` line 61), through `UIImagePickerController`; I found no Android video trim in the 17.0.11 options (the Android crop options are image crops).
- Keep `videoExportPreset` at `Passthrough`; any other preset makes the picker transcode the whole clip before our own export starts (`VideoUtils.transcodeVideoAsync`, `MediaHandler.swift` lines 415 to 432).
- Return values: `uri` (cache copy), `width`, `height` (upright), `duration` (ms), `fileSize`, `mimeType`, `assetId`, and on Android `rotation`.
- Permissions: the existing `requestMediaLibraryPermissionsAsync` flow applies (`ShareCardScreen.js` line 810). On iOS the fast copy path needs `assetIdentifier`, which depends on library access; otherwise the slower `loadFileRepresentation` path runs (`MediaHandler.swift` lines 370 to 408).

### 7.3 Live filtered preview inside the Skia canvas (addendum (d))

What `@shopify/react-native-skia` 2.2.12 provides (`NM: @shopify/react-native-skia/src/external/reanimated/useVideo.ts`, `src/skia/types/Video/Video.ts`):
- `useVideo(source: string | null, { looping, paused, seek, volume })` returns `{ currentFrame: SharedValue<SkImage | null>, currentTime, duration (ms), framerate, size, rotation }`; it needs Reanimated, which is installed (4.1.7 with worklets 0.5.1). `Skia.Video(src)` is created on a Reanimated worklet runtime named `video-metadata-runtime`.
- Draw: `<Canvas><Image image={currentFrame} ...><ColorMatrix matrix={m} /></Image></Canvas>`. `ColorMatrix` renders `skMatrixColorFilter` (`src/renderer/components/colorFilters/Matrix.tsx`), the same Skia matrix filter as `ColorFilter.MakeMatrix` used by `lookPaint`, so the preview colour is the photo path's colour by construction. Put the framing in a `Group transform` driven by the same shared values the `SharePhotoFramer` uses, and the `omitPhoto` overlay PNG above it, as that component already does for photos.
- There is **no playback-rate option**: `PlaybackOptions` in 2.2.12 has only `looping`, `paused`, `seek` and `volume`, and frames advance at real time. Slow or fast preview would need our own wrapper.
- `rotation()` returns 0, 90, 180 or 270 and `size()` is the **unrotated** size on both platforms (Android `KEY_WIDTH`/`KEY_HEIGHT`, iOS `naturalSize`); the frames are unrotated too, so the app applies the rotation and swaps width and height itself (or uses the probe).

Defects visible in the source that the share screen would meet (each is an observation; the failure it implies is my inference, not reproduced):
1. **Android `framerate` can be 0.** It comes from `MediaFormat.KEY_FRAME_RATE` only if present (`RNSkVideo.java` lines 77 to 79). `useVideo` computes `frameDuration = 1000 / framerate` and `currentFrameDuration = Math.floor(frameDuration)`; with 0 that is `Infinity`, and the frame callback only draws when `delta >= currentFrameDuration` (`useVideo.ts` lines 86 to 87 and 137). Inferred: a clip without that key never advances past its first frame.
2. **Android `seek` can spin forever.** After `seekTo` it loops `decodeFrame()` until `extractor.getSampleTime() >= timestampUs` (`RNSkVideo.java` lines 142 to 160). At end of stream `getSampleTime()` is -1, so a seek to or past the last sample never exits. Inferred: clamp every seek to at most `duration - 2 frames` in our wrapper.
3. **Android plays the audio track as well.** The constructor creates and starts a `MediaPlayer` on the same file (lines 63 to 68), alongside the separate `MediaCodec` frame path; volume is set to 0 only by `useVideo`'s reaction. Clips from the camera roll have audio. iOS also creates an `AVPlayer` and calls `play()` (`RNSkAppleVideo.mm` `setupPlayer`). Whether a muted preview interrupts the person's music is not tested (10.2).
4. **Per-frame copy on Android.** `copyFrameOnAndroid` calls `makeNonTextureImage()` for each frame (`useVideo.ts` from line 19): a CPU readback and allocation of width x height x 4 bytes per frame.
5. **iOS needs an absolute URL string.** `[NSURL URLWithString:@(_url.c_str())]` (`RNSkAppleVideo.mm`): pass `file://...`, not a bare path. The Android side parses with `Uri.parse`.
6. **Timing is time-based, not clock-based.** Frames advance by Reanimated frame deltas, not by the player clock, and `looping` seeks to 0. A trim window needs its own loop.

Recommendation: write a small wrapper (about 60 lines, in the app, not in `node_modules`) over `Skia.Video`: construct from a probe-validated `file://` URL, fall back to 30 fps when the reported rate is 0, `seek(startMs)` at the start and whenever `currentTime > endMs`, clamp seeks, hold at most two `SkImage`s (dispose the previous before replacing), pause on blur or app background, `volume 0`. Feed it the preview proxy for flagged clips (5.3).

**Memory for a 15 s 1080p clip** (arithmetic from pixel counts, my figures):
- One decoded frame: 1920 x 1080 x 4 B = **8.3 MB** (BGRA or RGBA); 4K: **33.2 MB**; 720p: **3.7 MB**.
- Fully decoded, 450 frames (15 s at 30 fps) would be **3.7 GB** at 1080p. Nothing should ever hold more than a couple of frames; the Skia path streams (decoder buffers, an `ImageReader` of two buffers on Android, a single `currentFrame` shared value).
- On Android the per-frame `makeNonTextureImage` copy (defect 4) allocates 8.3 MB at 30 per second, about **250 MB per second of churn** at 1080p and about **1 GB per second** at 4K. That is why 4K sources go through the proxy.
- The offscreen overlay is a single 8.3 MB bitmap (1080x1920). The export itself keeps frames on the GPU (Media3) or in a small `CVPixelBuffer` pool (iOS); at 4K the iOS handler holds a few 33 MB buffers.
- Skia and Android hardware buffers are native memory outside the JS heap, so a leak shows as process memory, not as a JS error; a long soak test (20 open and close cycles of the share screen) belongs in 10.2.

### 7.4 `expo-av` 16.0.8 and `expo-video`

- `expo-av`'s `Video` shows a clip in a native player and exposes `positionMillis`, `shouldPlay`, `isMuted`, `resizeMode`, `onPlaybackStatusUpdate`, `videoStyle`; the SDK 54 page marks it **deprecated and replaced by `expo-video`** and mentions no shader or colour filter [U32]. It could preview position and framing but **cannot show the look**, so it cannot satisfy "see the result before export". (A second source I found said removal is planned for SDK 55; the page I read gives no removal SDK. The repo's rest-timer sounds also depend on `expo-av`, `src/lib/restSound.js`, so that migration exists regardless.)
- `expo-video` is not installed (`node_modules/expo-video` is absent). With Skia drawing the preview it is not needed. If a non-Skia player is ever wanted it would be a new dependency and a founder question.

---

## 8. Size, time and review risk

### 8.1 Output file size

`bytes = bitrate x seconds / 8` (no audio; MP4 overhead is under 1 per cent):

| Bitrate | 15 s at 1080x1920 | Note |
|---|---|---|
| 5 Mbps | 9.4 MB | Google's minimum for 1080x1920 [U12] |
| 6 Mbps | 11.3 MB | |
| 8 Mbps | **15.0 MB** | recommended default |
| 8.7 Mbps | 16.3 MB | Media3's default for 1080x1920 at 30 fps: `1080 x 1920 x 30 x 0.07 x 2` |
| 17.4 Mbps | 32.7 MB | what the default becomes for an uncapped 60 fps source, hence `setFrameRate(30)` |

D229-3's "near 20 MB" is met at 8 to 10 Mbps. 1080x1080 and 1080x1350 are 56 and 70 per cent of that pixel count.

### 8.2 Export time (estimates; no measurement found)

The only published number I found is Google's: **Pixel 9 Pro XL, 10 s 720p H.264 to H.265 transcode, about 1,300 ms; 4 s of 8K H.265 about 2,300 ms** (rough, Stopwatch API, no effects) [U33]. Google's troubleshooting page says hardware `MediaCodec` encoder throughput is the limit "for use cases without heavyweight effects processing" [U8]. I found no mid-range Android or iPhone 12 figure for a filtered, overlaid export.

My estimate, scaling Google's flagship figure by pixel-seconds (1080x1920 for 15 s is about 3.4 times 720p for 10 s, so about 4 to 5 s on that flagship) and allowing a factor of 2 to 4 for a mid-range chip plus one GPU pass:
- Android mid-range (Snapdragon 6 or 7 series, Dimensity 7000 or 8000 class): **about 8 to 20 s** for a 15 s 1080p30 clip; HDR tone-mapped or 4K60 sources 1.5 to 3 times that.
- iPhone 12 (A14, hardware H.264 and a GPU Core Image pass): **about 6 to 15 s**; 4K60 HEVC sources add decode and Lanczos cost.
These are expectations to be replaced by the 10.2 measurements; design for up to 30 s with a determinate progress bar and a cancel button.

### 8.3 Binary size

- Android: the ten Media3 AARs at 1.11.1 are 506,251 (transformer) + 402,882 (effect) + 1,703,377 (exoplayer) + 644,502 (common) + 823,954 (extractor) + 168,578 (datasource) + 109,910 (muxer) + 67,351 (container) + 19,422 (decoder) + 7,197 (database) = **4,453,424 bytes (about 4.5 MB)**, from `Content-Length` of each `.aar` on `dl.google.com`. Guava 33.3.1-android is a 2,918,070-byte jar (`repo1.maven.org`); whether the app already ships Guava through another library I did not verify (`./gradlew :app:dependencies` would show it). `kotlinx-coroutines-guava` is 18 KB. No `.so` files, so no per-ABI multiplication. After R8 and AAB splits the real download cost is smaller than the sum; **my estimate is 1 to 3 MB**, to be replaced by comparing two EAS builds.
- iOS: no added binary beyond a few hundred lines of Swift.

### 8.4 Store review and policy

- **App Store:** public frameworks only (AVFoundation, Core Image); no new entitlement, capability or background mode; the only review-visible change is the camera purpose string (6.3). Privacy manifest: no new required-reason API is used by the sketch (file sizes via `attributesOfItem` are not a timestamp API as far as I know, unconfirmed).
- **Google Play:** no new sensitive permission. `CAMERA` is already declared, `RECORD_AUDIO` and `READ_MEDIA_*` stay blocked (photo picker, muted recording). Media3 adds `ACCESS_NETWORK_STATE` and `WAKE_LOCK` (both normal permissions; `WAKE_LOCK` already declared). Data safety: all processing is on device and clips are never uploaded (D229-5), so nothing new is collected; confirming the Play Console form is the founder's task.
- **GDPR / Article 9:** clips can show a body, so they are treated like progress photos: device-only, deleted with the workout and account (D229-5), calm mode and ED flag withhold the video background (D229-6). Cache copies made by the picker, the preview proxy and the exported MP4 need an explicit cleanup, or "deleted with the workout" is not true of the cache.

---

## 9. Three alternatives considered, and why not

1. **ffmpeg-kit.** The repository README now opens with "Update (July 2026) ... `FFmpegKit` has been officially retired" and points to `FFmpegKitNext`, "distributed as source only" [U34]. The prebuilt `com.arthenica:ffmpeg-kit-min`, `-video` and `-full` 6.0-2 AARs return **HTTP 404** from Maven Central today (HEAD requests, 15 October 2026). The npm package `ffmpeg-kit-react-native` is at 6.0.2, published 18 September 2023, licence LGPL-3.0 [U35]. Licence: "LGPL 3.0 by default, GPL v3.0 if GPL licensed libraries are enabled"; the `-gpl` packages are the ones with GPL libraries (the x264 software H.264 encoder is GPL, which I know from FFmpeg generally rather than from that README), so a software-encoded H.264 build is GPL v3, which does not suit a closed-source store app. An LGPL build would have to use the platform hardware encoders anyway, which is what Media3 and AVFoundation already do. Size: the README lists none; a package author's README quotes about 9 MB added to an APK for FFmpeg against 50 KB for their compressor [U36] (a competitor's claim, not measured). Community forks exist, and each would be a new third-party-of-a-third-party dependency with no Google or Apple behind it. Not recommended.
2. **React Native video packages.** `react-native-video-processing` 1.7.2, MIT, last modified on npm 8 September 2022; `react-native-video-editor` 0.2.0, no licence field, last modified 26 June 2022 [U36]. Both predate New Architecture and RN 0.81. `react-native-compressor` 2.0.3 (modified 25 July 2026, MIT) is maintained but its README documents compression, thumbnails, upload and download, with no colour matrix, crop-offset, overlay or trim API (zero matches for filter, overlay, trim, crop in its 21 KB README), and its peer set now includes `react-native-nitro-modules >= 0.35.0` [U36]. None can apply a look or composite the card. A fourth idea, driving the encode from Skia (decode with `Skia.Video`, draw each frame with the shared look and card code, read pixels back, feed a native encoder) would give pixel-identical looks, but `Video.nextImage()` has no deterministic frame-by-frame access (iOS reads the player's current time, Android decodes sequentially with a `seek` that has the defect in 7.3), so frame-exact export is not achievable, and 450 readbacks of 8.3 MB through JS would be slow. Rejected.
3. **Server-side export.** It requires uploading a person's workout or posing clip, which is body imagery. That contradicts D229-5 (clips are private device data, never synced, never in a Community post), the "photos never upload" rule and the Article 9 posture in CLAUDE.md section 2, and it needs EU-Dublin-resident compute that the current stack (Supabase edge functions, no video worker) does not have; any such service would be a new subprocessor and cost per export. Rejected on the privacy grounds alone.

---

## 10. Decisions for the lead and the device tests that settle open points

### 10.1 Decisions

1. **Android route.** Media3 Transformer 1.11.1 (fallback 1.10.1) or the SDK-only route. This report recommends Media3; the founder's yes must name the artefacts in 1.1.
2. **API shape.** Native receives the final 20-number matrix and the resolved `rect` (section 6.2), not `strength` and `crop`.
3. **Zoom-out for video.** Allow zoom below 1 (gap is black on Media3, `#0D0D0D` on SDK-only and iOS) or limit video to cover-and-above so there is never a gap. Related: the tone-sampled scrim (`sampleAverageTone`) needs a representative frame for video; a mid-window frame is the obvious source.
4. **Preview proxy and trim UI for long clips.** Proxy only for flagged clips (5.3)? Where does the person choose the 15 s window of a 5 minute clip: the share screen, with a whole-clip proxy capped at, say, 60 s, or iOS `allowsEditing` plus a cap on Android?
5. **Slow-mo and Live Photo behaviour** (5.2): real speed or slow-mo as shown; loop or play once for a 3 s Live Photo clip.
6. **Camera permission copy** (6.3) and the error copy (5.4).
7. **Foreground-only export** on iOS (3.6): block navigation and cancel on background.
8. **Sixty-fps handling**: cap at 30 (assumed here) or keep 60.

### 10.2 Device tests (a physical-device checklist; nothing here has been run)

1. Grey ramp and RGB patch clip, all seven looks at 0.5 and 1.0, both platforms: exported frame at t = 0 against the Skia render of the same frame (tolerance a few levels). Settles the colour-domain claims in 1.3 and 3.4.
2. Rotation set: portrait, landscape, upside-down, plus an iPhone front-camera mirrored clip, imported on Android and iOS.
3. Android API 29 or higher HLG clip and an iPhone Dolby Vision clip: tone mapped output looks right; API 26 to 28 device with an HDR clip: error 3001 or 3003 path and copy.
4. 4K60 HEVC from the camera app on a mid-range Android and an iPhone 12: time, memory, output at 30 fps.
5. A 5 minute 4K clip from the library: picker copy time, disk, cleanup, window export time.
6. A real iPhone slow-mo clip (is it 240 fps real-speed or baked) and a Live Photo.
7. 1080x1350 on at least three Android encoders (check `getHeightAlignment`): output height and overlay alignment when fallback applies.
8. Muted Skia preview of a clip with audio: does the person's music pause (Android `MediaPlayer`, iOS `AVPlayer`)?
9. iOS: start an export and background the app; confirm failure mode and recovery.
10. 20 open and close cycles of the share screen with a 1080p clip: memory flat.
11. Timing on a mid-range Android and an iPhone 12 for 15 s 1080x1920, release builds, three runs each.

---

## 11. What I could not confirm

1. **No device was run.** Every behaviour statement is from source, documentation or arithmetic. Nothing was compiled; the Kotlin and Swift sketches are written against signatures I read (Media3 1.11.1 sources; Apple documentation) but not built.
2. **Media3 colour domain.** The shader source shows the matrix applied to un-linearised values in the default working colour space; the Javadoc says linear BT.709 and the Builder Javadoc says the default is `WORKING_COLOR_SPACE_LINEAR` while the code sets `WORKING_COLOR_SPACE_DEFAULT`. The grey-ramp test (10.2 item 1) is the proof.
3. **Kotlin 2.1.20 reading Media3 1.11.1's Kotlin 2.2.10 metadata**, and whether the app already ships Guava, and the `ACCESS_NETWORK_STATE` merge.
4. **Encoder fallback and overlay size.** I read that the final shader stage scales to the encoder surface size, but did not run an encoder that falls back from 1080x1920 or 1080x1350.
5. **Flipped (mirrored) matrices on Android** and whether `AVAsynchronousCIImageFilteringRequest.sourceImage` is already upright in every case (documentation says `renderSize` respects `preferredTransform`; I inferred the rest).
6. **Which codec, bitrate and exact size** `AVAssetExportPresetHighestQuality` yields with a 1080x1920 `renderSize`; hence the reader and writer recommendation. I also did not confirm whether the Core Animation tool can be combined with a CI-handler composition.
7. **Whether `AVAssetReaderVideoCompositionOutput` accepts a CI-handler composition on iOS 16 without issue**: it is a plain `AVVideoComposition`, and a search summary of the AVFoundation documentation lists the reader output as a carrier of a video composition (I did not read the header myself), but I have not run it.
8. **The iOS slow-mo file the picker returns**, and iOS behaviour for Dolby Vision profile 5.
9. **Apple's deprecation status**: the request class page shows availability "iOS 9.0 to 27.0" and `init(asset:applyingCIFiltersWithHandler:)` "9.0 to 18.0"; I did not open the page naming the replacement's availability (`AVVideoComposition(applyingFiltersTo:applier:)`), so the date it becomes the only option is unknown. The iOS 16 class method I recommend shows no end version.
10. **Background GPU failure of a Core Image export** is inferred from Apple's Metal statement; not tested.
11. **Export times, memory under load, APK and AAB size delta** are estimates (8.2, 8.3).
12. **Number of Android phones without an HEVC decoder** at API 26 and up: no source found.
13. **Whether a muted Skia preview pauses other apps' audio**, and whether Skia's `useVideo` freezes on a clip without a frame-rate key (both are readings of the source).
14. **Whether the same add-only media permission saves an MP4 on every Android API level** through `saveToLibraryAsync`, and whether `NSPrivacyAccessedAPICategoryFileTimestamp` is touched by the Swift code.
15. **CDD figures for mandatory H.264 1080p encoding** [U10]: the CDD search results were truncated, so I did not rely on them; Media3's encoder-size fallback code is my evidence that 1080 by 1920 is not guaranteed.
16. **`expo-av` removal SDK**: the SDK 54 page says deprecated without a removal SDK; one search summary said SDK 55.
17. **Pages I could not retrieve:** the Skia docs site (404 on `shopify.github.io/react-native-skia/docs/video`), `AVError.Code` and `PHAssetResourceType.fullSizeVideo` at the first URL (a second URL worked for the latter), and the full MediaCodec and MediaFormat reference pages (truncated by the fetch tool). The Android platform facts that depend on them (API levels of `KEY_ROTATION`, `KEY_COLOR_TRANSFER`, `KEY_COLOR_TRANSFER_REQUEST`) come from comments inside Media3 sources rather than the reference pages.

---

## 12. Sources

Local: `NM:` paths are relative to `/home/user/ADPhysique/node_modules`. Versions read: `@shopify/react-native-skia` 2.2.12, `expo-camera` 17.0.10, `expo-image-picker` 17.0.11, `expo-av` 16.0.8, `expo-sharing` 14.0.8, `expo-media-library` 18.2.1, `expo-modules-core` 3.0.30, `expo` 54.0.37, `react-native` 0.81.5, `react-native-reanimated` 4.1.7, `react-native-worklets` 0.5.1.

Media3 1.11.1 artefacts, all under `https://dl.google.com/android/maven2/androidx/media3/`: `media3-transformer/1.11.1/` (`.aar`, `.pom`, `.module`, `-sources.jar`), the same for `media3-effect`, `media3-common`, `media3-exoplayer`; `.aar` for `media3-muxer`, `-container`, `-datasource`, `-extractor`, `-decoder`, `-database`; `media3-transformer/maven-metadata.xml`.

- [U1] https://developer.android.com/jetpack/androidx/releases/media3 (versions, dates, release notes; minSdk 23 in 1.9.0; Transformer `setFrameRate` in 1.10.0)
- [U2] https://dl.google.com/android/maven2/androidx/media3/media3-transformer/maven-metadata.xml (version list, `lastUpdated` 20260911)
- [U3] https://dl.google.com/android/maven2/androidx/media3/media3-transformer/1.11.1/media3-transformer-1.11.1.pom (Apache License 2.0; dependencies)
- [U4] Media3 1.11.1 `.module` and `.aar` files (dependency graph, `aar-metadata.properties` with `minCompileSdk`, manifests, `res/raw` shaders, sizes by `Content-Length`), under the directory above
- [U5] Media3 1.11.1 `-sources.jar` files for transformer, effect, common, exoplayer (all `M3src:` citations)
- [U6] https://developer.android.com/media/media3/transformer/getting-started
- [U7] https://developer.android.com/media/media3/transformer/transformations
- [U8] https://developer.android.com/media/media3/transformer/troubleshooting
- [U9] https://developer.android.com/media/media3/transformer/tone-mapping
- [U10] https://source.android.com/docs/compatibility/17/mpc (CDD search result, truncated; not relied on)
- [U11] not used
- [U12] https://developer.android.com/media/optimize/sharing
- [U13] https://android.googlesource.com/platform/cts/+/567f12f%5E%21/ (CTS `ExtractDecodeEditEncodeMuxTest`)
- [U14] https://www.bigflake.com/mediacodec/
- [U15] https://github.com/google/grafika (Apache 2.0; read via `raw.githubusercontent.com/google/grafika/master/app/src/main/java/com/android/grafika/gles/EglCore.java`)
- [U16] https://developer.apple.com/documentation/avfoundation/avmutablevideocomposition/videocomposition(with:applyingcifilterswithhandler:completionhandler:).md and https://developer.apple.com/documentation/avfoundation/avvideocomposition/init(asset:applyingcifilterswithhandler:).md
- [U17] https://developer.apple.com/forums/thread/768845 (as summarised by the search tool; the renderSize versus source size observation)
- [U18] https://developer.apple.com/documentation/avfoundation/avasynchronousciimagefilteringrequest/finish(with:context:).md (BGRA8, context guidance) and https://developer.apple.com/tutorials/data/documentation/avfoundation/avasynchronousciimagefilteringrequest.md
- [U19] https://developer.apple.com/documentation/avfoundation/avassetexportsession.md, `.../avassetexportsession-deprecated-symbols.md`, `.../avassetexportsession/export(to:as:isolation:).md`, `.../avassetexportsession/states(updateinterval:).md`
- [U20] https://developer.apple.com/documentation/avfoundation/export-presets.md
- [U21] https://developer.apple.com/videos/play/wwdc2020/10009/ (HDR in AVFoundation)
- [U22] https://developer.apple.com/documentation/avfoundation/avvideocomposition.md
- [U23] https://developer.apple.com/documentation/avfoundation/avvideocompositioncoreanimationtool.md and `.../avvideocomposition/animationtool.md`
- [U24] https://developer.apple.com/library/archive/documentation/GraphicsImaging/Reference/CoreImageFilterReference/index.html (CIColorMatrix)
- [U25] https://developer.apple.com/documentation/coreimage/cicontextoption/workingcolorspace.md
- [U26] https://developer.apple.com/documentation/coreimage/ciimageoption/colorspace.md
- [U27] https://developer.apple.com/documentation/metal/preparing-your-metal-app-to-run-in-the-background.md
- [U28] https://developer.apple.com/documentation/avfoundation/avmediacharacteristic/containshdrvideo.md
- [U29] https://developer.apple.com/forums/thread/734412 (`nominalFrameRate` 30 for high-frame-rate clips; search-tool summary)
- [U30] https://developer.apple.com/documentation/photos/phassetresourcetype/fullsizevideo.md
- [U31] https://developer.apple.com/forums/thread/693127 (slow-mo and `loadFileRepresentation`)
- [U32] https://docs.expo.dev/versions/v54.0.0/sdk/video-av.md
- [U33] https://android-developers.googleblog.com/2025/03/media-processing-performance-jetpack-media3-transformer.html
- [U34] https://raw.githubusercontent.com/arthenica/ffmpeg-kit/main/README.md
- [U35] https://registry.npmjs.org/ffmpeg-kit-react-native and Maven Central HEAD requests for `https://repo1.maven.org/maven2/com/arthenica/ffmpeg-kit-{min,video,full}/6.0-2/*.aar` (404)
- [U36] https://registry.npmjs.org/react-native-video-processing, `.../react-native-video-editor`, `.../react-native-compressor` (versions, modified dates, licence, README text)
