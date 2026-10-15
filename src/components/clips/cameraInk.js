/**
 * cameraInk - the viewfinder's fixed ink (D229 addendum 5).
 *
 * The `camera` token is true black behind a live preview in EVERY theme
 * (theme.js), so the chrome drawn on it is white in every theme too: these
 * colours come from the DARK palette on purpose, not from the live theme (a
 * light-theme `textPrimary` is dark ink and would vanish on the viewfinder).
 * Type roles and sizes still follow the live theme (Larger text).
 */
import { resolveTheme } from '../../styles/theme';

export const CAM = resolveTheme({ theme: 'dark' }).colors;
