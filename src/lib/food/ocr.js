/**
 * OCR adapter, on-device MLKit text recognition.
 *
 * Per MOVE_1_5_BARCODE_AND_OCR.md (locked spec): free, on-device,
 * no per-call cost. Uses @react-native-ml-kit/text-recognition which
 * wraps Google's MLKit Text Recognition v2 on Android and iOS.
 * Bundled into the native binary at EAS build time; no API key, no
 * network round-trip, no env var configuration.
 *
 * Earlier branches of this file had a Google Cloud Vision (paid)
 * adapter and an `EXPO_PUBLIC_GOOGLE_VISION_KEY` env-var gate. Both
 * are removed: they violated the locked free-stack constraint and
 * the spec which explicitly named MLKit.
 *
 * Public API stays stable so call sites (ScanLabelScreen, writeback,
 * parser) don't change:
 *
 *   isOcrConfigured()              true when MLKit is linkable.
 *                                  Native module presence is the
 *                                  source of truth; tests + jest
 *                                  mock to false (module not loaded).
 *
 *   recogniseText(imageUri)        Returns the concatenated text or
 *                                  null on failure. Input is a file
 *                                  URI from camera takePictureAsync
 *                                  (`photo.uri`), NOT base64. MLKit
 *                                  reads files directly which avoids
 *                                  the base64 encode/decode round-
 *                                  trip the old adapter needed.
 */

let _TextRecognition = null;
try {
  // eslint-disable-next-line global-require
  _TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (_) {
  // Module not installed (or running under jest with no native binding).
  // isOcrConfigured() will report false; ScanLabelScreen surfaces the
  // manual-entry CTA in that case. EAS dev-client builds with the
  // package in dependencies pick it up via autolinking.
}

export function isOcrConfigured() {
  return !!_TextRecognition;
}

/**
 * Recognise text in an image. Returns the full text block or null
 * if OCR is unavailable / the recognition failed.
 *
 * @param {string} imageUri  Local file URI from camera takePictureAsync.
 */
export async function recogniseText(imageUri) {
  if (!_TextRecognition || !imageUri) return null;
  try {
    const result = await _TextRecognition.recognize(imageUri);
    return result?.text || null;
  } catch {
    return null;
  }
}
