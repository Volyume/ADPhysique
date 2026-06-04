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
const V_ICON = require('../../assets/volyume-v.png');
// Both assets ship with a transparent background so they blend with
// any surface colour. size prop drives the HEIGHT in each component;
// width derives from the asset's aspect so letterforms stay correctly
// proportioned at any scale.
const WORDMARK_ASPECT = 1032 / 277;
const V_ICON_ASPECT = 685 / 741;

/**
 * VolyumeMark renders the chrome Volyume wordmark (V + lettering) as a
 * static PNG. Use this in HERO placements (login, welcome, splash)
 * where the lettering is the headline. Anywhere it's used, remove any
 * separate "Volyume" text heading nearby. The asset already says it.
 *
 * Uses expo-image when available (disk cache, faster decode), falls
 * back to RN Image otherwise so the app keeps working pre-install.
 */
export function VolyumeMark({ size = 28, style }) {
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
 * VolyumeIcon renders only the V (no lettering). Use this for compact
 * inline placements: header chips, screen-corner brand tags, anywhere
 * a screen title already names the section so the wordmark would be
 * redundant. size drives the height; width follows the asset aspect.
 */
export function VolyumeIcon({ size = 28, style }) {
  const height = size;
  const width = Math.round(height * V_ICON_ASPECT);
  return (
    <ImageComp
      source={V_ICON}
      style={[{ width, height }, style]}
      contentFit="contain"
      resizeMode="contain"
      accessibilityLabel="Volyume"
    />
  );
}

/**
 * VolyumeWordmark kept as a thin alias for VolyumeMark so legacy
 * imports keep building. New code should pick VolyumeMark (full
 * wordmark) or VolyumeIcon (V only) based on context.
 */
export function VolyumeWordmark({ size = 28, color, accent, style }) {
  return <VolyumeMark size={size} color={color} accent={accent} style={style} />;
}

/**
 * BrandTag kept for backwards compatibility. Routes through the icon
 * since the inline placements that used to pair it with text now have
 * the V alone next to the existing heading.
 */
export function BrandTag({ size = 15, color, accent, style }) {
  return <VolyumeIcon size={Math.round(size * 1.6)} color={color} accent={accent} style={style} />;
}

export default VolyumeMark;
