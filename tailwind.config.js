// Tailwind config for the React Native Reusables kit trial (LOC-411; parent
// LOC-409). NativeWind compiles it at bundle time; only the kit's files are
// scanned, so no existing StyleSheet screen gains or loses a style.
//
// theme.js is the single source of colour, spacing and type
// (src/styles/kitTheme.js). Colours are CSS variables only: KitThemeProvider
// sets each variable from the live theme.js palette, so this file holds no
// colour value at all. The `colors` key REPLACES Tailwind's default palette
// (slate, gray, zinc and the rest) instead of extending it, so a default
// shadcn grey cannot be reached from a class name; black and white remain for
// the kit's `shadow-black/5` and the destructive button's `text-white` (white
// is theme.js onError in every palette).
//
// Base: the kit's own Tailwind config at its last Expo 54 revision
// (founded-labs/react-native-reusables b4806c42, apps/showcase/tailwind.config.js),
// minus the web-only parts (tailwindcss-animate, the accordion keyframes, the
// Geist font plugin) and with `hsl(var(--x))` changed to
// `rgb(var(--x) / <alpha-value>)` so opacity modifiers resolve.
const { hairlineWidth } = require('nativewind/theme');
// theme.js and kitTheme.js are ES modules with extensionless imports, which
// plain Node `require` cannot load; jiti (the loader Tailwind itself uses for
// configs) transpiles them on the fly, in Metro, in Jest and in Node alike.
const loadEsm = require('jiti')(__filename, { interopDefault: true });
const { KIT_COLOUR_NAMES, kitTailwindScales } = loadEsm('./src/styles/kitTheme.js');

const scales = kitTailwindScales();

const kitColours = {};
for (const name of KIT_COLOUR_NAMES) {
  kitColours[name] = `rgb(var(--${name}) / <alpha-value>)`;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/components/ui/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: 'black',
      white: 'white',
      ...kitColours,
    },
    fontSize: scales.fontSize,
    borderRadius: scales.borderRadius,
    fontFamily: scales.fontFamily,
    extend: {
      spacing: scales.namedSpacing,
      borderWidth: {
        hairline: hairlineWidth(),
      },
      // Tailwind's base layer seeds every element's ring variables from these
      // two defaults; left unset they fall back to Tailwind's own blue and
      // #fff, colours outside theme.js. The ring default is a function because
      // Tailwind cannot parse a CSS-variable colour string there and silently
      // falls back to its blue (tailwindcss corePlugins ringWidth).
      ringColor: {
        DEFAULT: ({ opacityValue }) =>
          opacityValue === undefined ? 'rgb(var(--ring))' : `rgb(var(--ring) / ${opacityValue})`,
      },
      ringOffsetColor: {
        DEFAULT: 'rgb(var(--background))',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
