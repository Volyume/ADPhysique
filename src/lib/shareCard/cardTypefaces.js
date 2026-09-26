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

// Every form this build can serve the file under: expo-asset's cached local
// copy, and the bundled form React Native resolves (the one react-native-
// skia's own useFont reads). Tried in that order.
async function candidateUris(source) {
  const out = [];
  try {
    if (Asset) {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      if (asset.localUri) out.push(asset.localUri);
      if (asset.uri) out.push(asset.uri);
    }
  } catch (_) { /* fall through to the RN resolver below */ }
  try {
    const uri = Image.resolveAssetSource(source)?.uri;
    if (uri) out.push(uri);
  } catch (_) { /* no uri */ }
  return [...new Set(out)];
}

async function loadFace(Skia, role, source) {
  const uris = await candidateUris(source);
  const make = (data) => {
    try { return data ? Skia.Typeface.MakeFreeTypeFaceFromData(data) : null; } catch (_) { return null; }
  };
  for (const uri of uris) {
    try {
      if (typeof Skia.Data?.fromURI === 'function') {
        // eslint-disable-next-line no-await-in-loop
        const face = make(await Skia.Data.fromURI(uri));
        if (face) return face;
      }
    } catch (_) { /* try the next form */ }
    try {
      if (/^https?:/i.test(uri)) {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(uri);
        // eslint-disable-next-line no-await-in-loop
        const buf = await res.arrayBuffer();
        const face = make(Skia.Data.fromBytes(new Uint8Array(buf)));
        if (face) return face;
      }
    } catch (_) { /* try the next form */ }
  }
  logError('cardTypefaces.face', new Error('typeface could not be loaded'), { role, tried: uris.length });
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
