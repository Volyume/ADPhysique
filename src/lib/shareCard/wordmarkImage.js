/**
 * wordmarkImage.js — load the Volyume wordmark as an SkImage, reliably.
 *
 * VOLYUME-2X: on the founder's device this threw
 *
 *   Call to function 'ExponentFileSystem.readAsStringAsync' has been rejected
 *   → java.io.IOException: Unsupported scheme for location
 *     'assets_volyumewordmark'
 *
 * ShareCardScreen and BeforeAfterShareSheet each carried the same hand-rolled
 * loader: resolve the asset, then read it with expo-file-system and decode the
 * base64. That works in development, where a bundled asset resolves to an
 * http:// URL served by Metro - and CANNOT work in a release build, where the
 * same asset resolves to an Android resource name with no scheme at all.
 * expo-file-system refuses it, so the wordmark never loaded on any real
 * install, and the share screen (which gated readiness on the mark) went dead
 * with it.
 *
 * The fix is to stop hand-rolling it. Skia.Data.fromURI is react-native-skia's
 * own loader - the one its useImage hook uses - and it understands the
 * bundled-asset forms on both platforms. The two older paths are kept BELOW it
 * as fallbacks rather than deleted, so an environment where fromURI is
 * unavailable (an older installed native build) still gets its mark.
 *
 * Never throws: a missing mark is a card that still says volyume.app, which is
 * a cosmetic loss, and no caller may treat it as fatal.
 */
import { Image } from 'react-native';
import { logError } from '../errorLog';

let Asset;
let FileSystem;
try { Asset = require('expo-asset').Asset; } catch (_) { /* optional */ }
try { FileSystem = require('expo-file-system/legacy'); } catch (_) { /* optional */ }

/**
 * @param {object} Skia the react-native-skia Skia API
 * @param {number} source the require()'d image module
 * @returns {Promise<object|null>} an SkImage, or null when it cannot be loaded
 */
export async function loadWordmarkImage(Skia, source) {
  if (!Skia || source == null) return null;

  // Resolve to whatever this build serves: an http:// URL under Metro, a
  // file:// path once expo-asset has cached it, or a bare Android resource
  // name in a release build.
  let uri = null;
  try {
    if (Asset) {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      uri = asset.localUri || asset.uri || null;
    }
  } catch (_) { /* fall through to the RN resolver below */ }
  if (!uri) {
    try { uri = Image.resolveAssetSource(source)?.uri || null; } catch (_) { /* no uri */ }
  }
  if (!uri) {
    logError('wordmarkImage.resolve', new Error('wordmark asset resolved no uri'));
    return null;
  }

  const decode = (data) => {
    try { return data ? Skia.Image.MakeImageFromEncoded(data) : null; } catch (_) { return null; }
  };

  // 1. Skia's own loader. Handles the release-build resource name that broke
  //    the file read (VOLYUME-2X), and http/file alike.
  try {
    if (typeof Skia.Data?.fromURI === 'function') {
      const img = decode(await Skia.Data.fromURI(uri));
      if (img) return img;
    }
  } catch (e) {
    logError('wordmarkImage.fromURI', e, { uri });
  }

  // 2. The historical file read. Still correct for a file:// uri.
  try {
    if (FileSystem?.readAsStringAsync && /^file:/i.test(uri)) {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const img = decode(Skia.Data.fromBase64(b64));
      if (img) return img;
    }
  } catch (e) {
    logError('wordmarkImage.fileRead', e, { uri });
  }

  // 3. Raw bytes over fetch, for an http(s) uri under Metro.
  try {
    if (/^https?:/i.test(uri)) {
      const res = await fetch(uri);
      const buf = await res.arrayBuffer();
      const img = decode(Skia.Data.fromBytes(new Uint8Array(buf)));
      if (img) return img;
    }
  } catch (e) {
    logError('wordmarkImage.fetch', e, { uri });
  }

  logError('wordmarkImage.load', new Error('wordmark could not be decoded'), { uri });
  return null;
}

export default loadWordmarkImage;
