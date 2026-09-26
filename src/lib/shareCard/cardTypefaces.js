/**
 * cardTypefaces.js — the app's own Inter faces as Skia typefaces, for the
 * share card.
 *
 * Founder order 2026-09-26 on the share image: "Use styles from the rest of
 * the app." The app sets every screen in Inter (src/styles/fontFamily.js), but
 * the card was drawn in the platform's system font (Helvetica Neue / Roboto)
 * because Skia cannot see fonts registered with expo-font. This loads the
 * same bundled TTFs straight into Skia, through the loader the wordmark
 * already uses (Skia.Data.fromURI understands the bundled-asset forms of a
 * release build on both platforms; see wordmarkImage.js, VOLYUME-2X).
 *
 * Never throws and never blocks the card: the screen draws with the system
 * faces until these arrive, and a face that fails to load simply falls back
 * inside the renderer (drawShareCard.js makeFonts). A missing font is a
 * cosmetic loss, never a reason the share screen cannot render
 * (VOLYUME-2V law: nothing decorative may gate sharing).
 */
import { Image } from 'react-native';
import { logError } from '../errorLog';

let Asset;
try { Asset = require('expo-asset').Asset; } catch (_) { /* optional */ }

// Role -> bundled face. The roles are the renderer's font weights.
const FACES = {
  regular: require('../../../assets/fonts/Inter-Regular.ttf'),
  medium: require('../../../assets/fonts/Inter-Medium.ttf'),
  semibold: require('../../../assets/fonts/Inter-SemiBold.ttf'),
  bold: require('../../../assets/fonts/Inter-Bold.ttf'),
  display: require('../../../assets/fonts/InterDisplay-Bold.ttf'),
  displayHeavy: require('../../../assets/fonts/InterDisplay-ExtraBold.ttf'),
};

async function resolveUri(source) {
  try {
    if (Asset) {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri || null;
      if (uri) return uri;
    }
  } catch (_) { /* fall through to the RN resolver below */ }
  try { return Image.resolveAssetSource(source)?.uri || null; } catch (_) { return null; }
}

async function loadFace(Skia, role, source) {
  const uri = await resolveUri(source);
  if (!uri) return null;
  const make = (data) => {
    try { return data ? Skia.Typeface.MakeFreeTypeFaceFromData(data) : null; } catch (_) { return null; }
  };
  try {
    if (typeof Skia.Data?.fromURI === 'function') {
      const face = make(await Skia.Data.fromURI(uri));
      if (face) return face;
    }
  } catch (e) {
    logError('cardTypefaces.fromURI', e, { role });
  }
  try {
    if (/^https?:/i.test(uri)) {
      const res = await fetch(uri);
      const buf = await res.arrayBuffer();
      const face = make(Skia.Data.fromBytes(new Uint8Array(buf)));
      if (face) return face;
    }
  } catch (e) {
    logError('cardTypefaces.fetch', e, { role });
  }
  return null;
}

/**
 * @param {object} Skia the react-native-skia Skia API
 * @returns {Promise<object|null>} { regular, medium, semibold, bold, display,
 *   displayHeavy } SkTypefaces (any that loaded), or null when none did
 */
export async function loadCardTypefaces(Skia) {
  if (!Skia || typeof Skia.Typeface?.MakeFreeTypeFaceFromData !== 'function') return null;
  const out = {};
  await Promise.all(Object.entries(FACES).map(async ([role, source]) => {
    const face = await loadFace(Skia, role, source);
    if (face) out[role] = face;
  }));
  if (!Object.keys(out).length) {
    logError('cardTypefaces.load', new Error('no card typeface could be loaded'));
    return null;
  }
  return out;
}

export default loadCardTypefaces;
