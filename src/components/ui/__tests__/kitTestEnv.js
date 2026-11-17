/**
 * Test environment for the React Native Reusables kit trial (LOC-411).
 *
 * Runs the kit's REAL styling pipeline under Jest, so a test sees the colour
 * a kit part actually resolves to, not a model of it:
 *   1. tailwind.config.js + global.css compile with the real Tailwind,
 *      scanning the real kit files (the config's own `content`);
 *   2. NativeWind's own CSS-to-React-Native compiler turns that CSS into the
 *      style data Metro would inject on device (same options as its Metro
 *      plugin, nativewind/dist/metro/common);
 *   3. the data is injected into the real css-interop runtime, and kit parts
 *      render through it with react-test-renderer.
 *
 * Usage, at the top of a kit test (jest.mock is hoisted, so the factory must
 * require this file itself):
 *   jest.mock('react-native', () => require('./kitTestEnv').reactNativeMock());
 *   const { loadNativeInteropRuntime, setUpKitStyles, setPalette } = require('./kitTestEnv');
 *   loadNativeInteropRuntime(); // before the first kit or nativewind require
 *   beforeAll(setUpKitStyles);
 *
 * The repo's react-native mock (__mocks__/react-native.js) has no Appearance,
 * AccessibilityInfo, I18nManager or PlatformColor, which the css-interop
 * runtime reads when it loads; reactNativeMock() adds inert versions for
 * these files only rather than changing the shared mock.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');

let colourScheme = 'dark';

function reactNativeMock() {
  const base = jest.requireActual(path.join(ROOT, '__mocks__/react-native.js'));
  return {
    ...base,
    Appearance: {
      getColorScheme: () => colourScheme,
      setColorScheme: jest.fn(),
      addChangeListener: () => ({ remove: () => {} }),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => {} }),
    },
    I18nManager: { isRTL: false, getConstants: () => ({ isRTL: false }) },
    PlatformColor: (...names) => ({ semantic: names }),
  };
}

// The repo's reanimated mock (__mocks__/react-native-reanimated.js) has no
// LayoutAnimationConfig or FadeOutUp, which the kit's Accordion uses. Extend
// it for the kit's tests only rather than changing the shared mock.
function reanimatedMock() {
  const base = jest.requireActual(path.join(ROOT, '__mocks__/react-native-reanimated.js'));
  return {
    ...base,
    LayoutAnimationConfig: ({ children }) => children,
    FadeOutUp: base.FadeOut,
  };
}

// react-native-svg (which the kit's lucide icons draw with) needs native
// Touchable internals the repo's react-native mock lacks. Same approach as the
// existing screen suites (src/__tests__/screen-mount.test.js): each SVG
// element renders as a plain host node carrying its props.
function svgMock() {
  const React = require('react');
  const mk = (name) => {
    const El = ({ children, ...props }) => React.createElement(`Svg.${name}`, props, children);
    El.displayName = `Svg.${name}`;
    return El;
  };
  const Svg = mk('Svg');
  const out = { __esModule: true, default: Svg, Svg };
  for (const name of ['Path', 'Circle', 'Rect', 'Line', 'Polyline', 'Polygon', 'Ellipse', 'G']) {
    out[name] = mk(name);
  }
  return out;
}

// The repo's Jest config has no React Native preset, so Jest resolves plain
// `.js` files and react-native-css-interop would run its WEB runtime (which
// passes className through as a `$$css` marker instead of resolving it).
// Point its four platform-split modules at their `.native.js` builds, the
// files Metro bundles for Android and iOS, for the calling test file only.
const INTEROP_NATIVE_MODULES = [
  'react-native-css-interop/dist/runtime/api',
  'react-native-css-interop/dist/runtime/index',
  'react-native-css-interop/dist/runtime/third-party-libs/react-native-safe-area-context',
  'react-native-css-interop/dist/doctor',
];

function loadNativeInteropRuntime() {
  for (const mod of INTEROP_NATIVE_MODULES) {
    const nativePath = require.resolve(`${mod}.native.js`);
    jest.doMock(mod, () => jest.requireActual(nativePath));
  }
}

// Every file the compiled kit styles depend on. The compiled data is cached
// under node_modules/.cache keyed by a hash of all of them, so only the first
// kit suite in a run pays for the Tailwind compile and any edit to an input
// recompiles.
const STYLE_INPUTS = [
  'tailwind.config.js',
  'global.css',
  'metro.config.js',
  'src/styles/kitTheme.js',
  'src/styles/theme.js',
  'src/styles/fontFamily.js',
  'scripts/compile-kit-styles.cjs',
  'node_modules/nativewind/package.json',
  'node_modules/react-native-css-interop/package.json',
  'node_modules/tailwindcss/package.json',
  'package-lock.json',
];

function kitStyleCacheKey() {
  const fs = require('fs');
  const crypto = require('crypto');
  const hash = crypto.createHash('sha1');
  const uiDir = path.join(ROOT, 'src/components/ui');
  const kitFiles = fs.readdirSync(uiDir).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f)).sort()
    .map((f) => path.join('src/components/ui', f));
  for (const rel of [...STYLE_INPUTS, ...kitFiles]) {
    hash.update(rel);
    hash.update(fs.readFileSync(path.join(ROOT, rel)));
  }
  return hash.digest('hex');
}

// Compile (or read the cached result) and inject the kit styles into the
// css-interop runtime. The compile runs as a plain Node child process
// (scripts/compile-kit-styles.cjs): inside Jest's module sandbox the same
// Tailwind compile took over a minute, in plain Node about 6.5 s.
function setUpKitStyles() {
  const fs = require('fs');
  const { execFileSync } = require('child_process');
  const cacheDir = path.join(ROOT, 'node_modules/.cache/volyume-kit-test');
  const cacheFile = path.join(cacheDir, `${kitStyleCacheKey()}.json`);
  if (!fs.existsSync(cacheFile)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/compile-kit-styles.cjs'), cacheFile], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
  const compiled = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const { injectData } = require('react-native-css-interop/dist/runtime/native/styles');
  injectData(compiled.data);
  // css-interop skips registering its built-in components when
  // NODE_ENV is 'test' (runtime/wrap-jsx.js); register them as on device.
  require('react-native-css-interop/dist/runtime/components');
  return compiled.css;
}

// Point the app store's accessibility prefs at a palette, the way the
// Settings screen does, so useTheme() (and so KitThemeProvider) resolves it.
// Also aligns the colour scheme the kit's `dark:` variants read with the
// palette's resolved theme, as App.js bootstrapAccessibility does on device
// (Appearance.setColorScheme, which css-interop's Appearance listener feeds
// into this same observable).
function setPalette(prefs) {
  const useAppStore = require(path.join(ROOT, 'src/store/useAppStore')).default;
  const { resolveTheme } = require(path.join(ROOT, 'src/styles/theme'));
  const { systemColorScheme } = require('react-native-css-interop/dist/runtime/native/appearance-observables');
  const { act } = require('react-test-renderer');
  const accessibility = {
    ...useAppStore.getState().accessibility,
    theme: prefs.theme ?? 'dark',
    higherContrast: !!prefs.higherContrast,
    colorBlindSafe: !!prefs.colorBlindSafe,
    largerText: false,
  };
  const scheme = resolveTheme(accessibility).resolvedTheme === 'light' ? 'light' : 'dark';
  act(() => {
    colourScheme = scheme;
    systemColorScheme.set(scheme);
    useAppStore.setState({ accessibility });
  });
}

// Every palette resolveTheme() can produce: dark or light, each alone, with
// higher contrast, with the Okabe-Ito colour-blind-safe swap, and with both.
const PALETTES = [
  { name: 'dark', prefs: { theme: 'dark' } },
  { name: 'light', prefs: { theme: 'light' } },
  { name: 'dark + higher contrast', prefs: { theme: 'dark', higherContrast: true } },
  { name: 'light + higher contrast', prefs: { theme: 'light', higherContrast: true } },
  { name: 'dark + Okabe-Ito', prefs: { theme: 'dark', colorBlindSafe: true } },
  { name: 'light + Okabe-Ito', prefs: { theme: 'light', colorBlindSafe: true } },
  { name: 'dark + both', prefs: { theme: 'dark', higherContrast: true, colorBlindSafe: true } },
  { name: 'light + both', prefs: { theme: 'light', higherContrast: true, colorBlindSafe: true } },
];

// Mount a kit element inside KitThemeProvider (the trial's only way to give
// kit parts their colours) and return the renderer.
function renderKit(element) {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  const { KitThemeProvider } = require(path.join(ROOT, 'src/components/ui/kit-theme-provider'));
  let tree;
  act(() => {
    tree = create(React.createElement(KitThemeProvider, null, element));
  });
  return tree;
}

// The host nodes (string types) under a renderer, in render order.
function hostNodes(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string');
}

// Any CSS colour string the runtime emits ('#rrggbb', 'rgb(r, g, b)',
// 'rgba(r, g, b, a)', 'rgb(r g b / a)') -> '#RRGGBB' plus alpha, so a
// resolved style compares exactly with a theme.js hex.
function normaliseColour(value) {
  if (typeof value !== 'string') return { hex: String(value), alpha: NaN };
  const v = value.trim();
  if (v.startsWith('#')) {
    let h = v.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return { hex: `#${h.slice(0, 6).toUpperCase()}`, alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return { hex: v, alpha: NaN };
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const [r, g, b] = parts;
  const alpha = parts.length > 3 ? parts[3] : 1;
  const hex = `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return { hex, alpha };
}

// Flatten a host node's style prop (arrays, nested arrays, falsy entries).
function flatStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style;
}

module.exports = {
  reactNativeMock,
  reanimatedMock,
  svgMock,
  renderKit,
  hostNodes,
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  PALETTES,
  normaliseColour,
  flatStyle,
};
