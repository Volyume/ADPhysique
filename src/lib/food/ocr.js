/**
 * OCR source adapter.
 *
 * Takes a base64-encoded image and returns recognised text. The
 * underlying engine is pluggable so the rest of the food layer
 * (ScanLabelScreen, parser, writeback) doesn't care which one is
 * wired up:
 *
 *   - Google Cloud Vision via HTTP when EXPO_PUBLIC_GOOGLE_VISION_KEY
 *     is set. Per-call cost; no native binary.
 *   - "unavailable" stub otherwise: returns null so the UI can show
 *     "OCR not configured" and fall back to manual entry.
 *
 * A future MLKit-based local OCR engine slots in here as a third
 * branch without touching anything that imports this module.
 */

// Indirect access defeats babel-preset-expo's compile-time
// EXPO_PUBLIC_* inliner (see usda.js for why).
const _GV_KEY_NAME = 'EXPO_PUBLIC_GOOGLE_VISION_KEY';

function _visionKey() {
  return process.env[_GV_KEY_NAME] || null;
}

export function isOcrConfigured() {
  return !!_visionKey();
}

/**
 * Recognise text in an image. Returns the concatenated text or null
 * if OCR is not configured / the call failed.
 *
 * @param {string} base64 Image data in base64 (no data: prefix).
 */
export async function recogniseText(base64) {
  const key = _visionKey();
  if (!key || !base64) return null;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`;
  const body = {
    requests: [{
      image: { content: base64 },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
    }],
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const txt = json?.responses?.[0]?.fullTextAnnotation?.text
             ?? json?.responses?.[0]?.textAnnotations?.[0]?.description
             ?? null;
    return txt || null;
  } catch {
    return null;
  }
}
