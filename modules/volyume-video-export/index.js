/**
 * volyume-video-export: the native binding for the share video (D229).
 *
 * The app talks to it through src/lib/shareVideo/engine.js, which validates
 * every option, guards one export at a time, owns the progress subscription
 * and turns failures into calm lines. This entry only says whether the native
 * module is compiled into the build and hands it over; it holds no logic.
 *
 * Native contract (Android: Media3 Transformer; iOS: AVFoundation and Core
 * Image; docs/audit/video-shares-2026-10-15/01-NATIVE-RESEARCH.md section 6):
 *   probeVideo(uri) -> { width, height (upright), rotation, durationMs,
 *     fps | null, codec | null, hdr, hasAudio, fileSizeBytes | null } | null
 *   exportShareVideo({ sourceUri, startMs, durationMs, matrix, rect,
 *     overlayPngUri, outWidth, outHeight, bitrate })
 *     -> { uri, width, height, durationMs, fileSizeBytes }
 *   cancelExport()
 *   setLockScreenWallpaper(uri) (Android; iOS rejects E_UNSUPPORTED)
 *   extractFrames(uri, timesMs, maxEdge) -> Array<{ uri (file:// JPEG in
 *     share-frames/), width, height (upright), timeMs } | null>; a time that
 *     fails is null, a bad source rejects (lead ruling 2026-10-16)
 *   deleteFrames() (best effort, never rejects)
 *   event 'onExportProgress' { progress: 0..1 }
 */
import { requireNativeModule } from 'expo-modules-core';

export const NATIVE_MODULE_NAME = 'VolyumeVideoExport';

let nativeModule = null;
try {
  nativeModule = requireNativeModule(NATIVE_MODULE_NAME);
} catch (_e) {
  // Expo Go, a build without the module, or a test: the app hides video.
  nativeModule = null;
}

export function isAvailable() {
  return nativeModule !== null;
}

export function getNativeModule() {
  return nativeModule;
}
