// Tailwind preset generated from the shared tokens. Apps extend this so every
// utility resolves to a Volyume token, never an inline literal. Colours map to
// CSS variables (defined in the app's globals.css) so the accessibility swaps
// (higher contrast, colour-blind-safe) can override them at the document root
// without recompiling. Spacing, radius, type and motion map to fixed values.
import type { Config } from 'tailwindcss';
import {
  baseColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
} from './tokens';

const colorVars = Object.fromEntries(
  Object.keys(baseColors).map((k) => [k, `var(--c-${k})`]),
) as Record<keyof typeof baseColors, string>;

const px = <T extends Record<string, number>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v}px`])) as Record<keyof T, string>;

export const volyumePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: colorVars,
      spacing: px(spacing),
      borderRadius: { ...px(radius), full: '9999px' },
      fontSize: px(fontSize),
      fontWeight: fontWeight,
      lineHeight: lineHeight,
      letterSpacing: px(letterSpacing),
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        accelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
      },
      transitionDuration: {
        micro: '120ms',
        state: '200ms',
        enter: '320ms',
        exit: '220ms',
        hero: '440ms',
      },
    },
  },
};

export default volyumePreset;
