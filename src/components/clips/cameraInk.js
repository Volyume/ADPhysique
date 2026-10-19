/**
 * cameraInk - the viewfinder's fixed ink (D229 addendum 5).
 *
 * The `camera` token is true black behind a live preview in EVERY theme
 * (theme.js), so the chrome drawn on it is white in every theme too: these
 * colours come from the DARK palette on purpose, not from the live theme (a
 * light-theme `textPrimary` is dark ink and would vanish on the viewfinder).
 * Type roles and sizes still follow the live theme (Larger text).
 */
import { resolveTheme, withAlpha, alpha } from '../../styles/theme';

const DARK = resolveTheme({ theme: 'dark' }).colors;

// About 55% black, the scrim edge and the pill.
const GLASS_ALPHA = 0.55;

// Legibility ink (founder report 2026-10-19: text on the live picture was hard
// to read). Camera-only values, so they live here and not in the theme.
export const CAM = {
  ...DARK,
  // Black at about 55%: the gradient scrim's solid edge, fading to scrimClear.
  scrim: withAlpha(DARK.camera, GLASS_ALPHA),
  scrimClear: withAlpha(DARK.camera, 0),
  // The dark "glass" pill every text and control group sits on (black ~55%).
  pill: withAlpha(DARK.camera, GLASS_ALPHA),
  // The dark disc behind the big countdown numeral (black 40%).
  disc: withAlpha(DARK.camera, alpha.strong),
  // The platform record red: the REC dot and the record button's centre.
  // eslint-disable-next-line no-restricted-syntax -- the platform record red, camera-only by design
  record: '#FF3B30',
};
