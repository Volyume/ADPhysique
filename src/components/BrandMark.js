import React from 'react';
import { Image as RNImage } from 'react-native';

// Try expo-image first for disk cache + faster decode. Falls back to
// the RN Image if @expo-image isn't installed yet (e.g. before the
// user has run `npx expo install expo-image`). The fallback keeps the
// app building during the migration.
let ImageComp = RNImage;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  const { Image: ExpoImage } = require('expo-image');
  if (ExpoImage) ImageComp = ExpoImage;
} catch (_) { /* expo-image not installed yet, use RN Image */ }

const WORDMARK = require('../../assets/volyume-wordmark.png');
// Source asset is 1448 x 1086 (4:3-ish). size prop drives the HEIGHT;
// width derives from the aspect so the wordmark stays readable at any
// scale.
const WORDMARK_ASPECT = 1448 / 1086;

/**
 * VolyumeMark renders the chrome Volyume wordmark as a static PNG.
 * size controls the height; width is computed from the asset's aspect
 * ratio so letterforms stay correctly proportioned.
 *
 * Uses expo-image when available (disk cache, faster decode), falls
 * back to RN Image otherwise so the app keeps working pre-install.
 */
export function VolyumeMark({ size = 28, color, accent, style }) {
  const height = size;
  const width = Math.round(height * WORDMARK_ASPECT);
  return (
    <ImageComp
      source={WORDMARK}
      style={[{ width, height }, style]}
      contentFit="contain"
      resizeMode="contain"
      accessibilityLabel="Volyume"
    />
  );
}

/**
 * VolyumeWordmark kept for backwards compatibility with any callers
 * that pass it as a header brand. The new asset already contains the
 * full wordmark, so this is now an alias for VolyumeMark.
 */
export function VolyumeWordmark({ size = 28, color, accent, style }) {
  return <VolyumeMark size={size} color={color} accent={accent} style={style} />;
}

/**
 * BrandTag kept for backwards compatibility. Routes through the new
 * wordmark asset at a slightly smaller scale to match prior inline
 * usage.
 */
export function BrandTag({ size = 15, color, accent, style }) {
  return <VolyumeMark size={Math.round(size * 1.6)} color={color} accent={accent} style={style} />;
}

export default VolyumeMark;
