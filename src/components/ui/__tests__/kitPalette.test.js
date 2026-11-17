/**
 * Kit palette parity (LOC-411 kit trial; parent LOC-409).
 *
 * Pins the trial's one-source-of-colour rule: theme.js stays the only source
 * of colour, and every palette resolveTheme() can produce (dark, light,
 * higher contrast, Okabe-Ito colour-blind safe, and their combinations) must
 * reach the React Native Reusables kit unchanged. Each kit colour variable is
 * rendered through the REAL pipeline (Tailwind + NativeWind compile of the
 * real config, the css-interop runtime, KitThemeProvider, a kit part) and the
 * colour that comes out is compared with the colour theme.js gives the same
 * role, both through resolveTheme() and through the boot path
 * (applyAccessibility() and the legacy `colors` singleton).
 *
 * Fails if: a palette resolves to a different colour through the kit than
 * through theme.js; the provider stops following the live palette; a role is
 * re-pointed at another token (EXPECTED_ROLES is pinned here on purpose,
 * not read from kitTheme.js); or the compiled kit stylesheet contains any
 * colour that is not a theme variable (a Tailwind or shadcn default).
 */
jest.mock('react-native', () => require('./kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  PALETTES,
  normaliseColour,
  flatStyle,
} = require('./kitTestEnv');

loadNativeInteropRuntime();

const { create, act } = require('react-test-renderer');
const theme = require('../../../styles/theme');
const { KIT_COLOUR_TOKENS, kitColourVariables, hexToRgbChannels } = require('../../../styles/kitTheme');
const { KitThemeProvider } = require('../kit-theme-provider');
const { Card } = require('../card');
const { Text } = require('../text');

// The founder-facing role table (LOC-411 task, point 3): amber is the kit's
// primary; page / card / raised card are theme.js's three charcoal steps.
const EXPECTED_ROLES = {
  background: 'background',
  foreground: 'textPrimary',
  card: 'surface',
  'card-foreground': 'textPrimary',
  popover: 'surfaceElevated',
  'popover-foreground': 'textPrimary',
  primary: 'primaryFill',
  'primary-foreground': 'onPrimary',
  secondary: 'surface2',
  'secondary-foreground': 'textPrimary',
  muted: 'surface2',
  'muted-foreground': 'textMuted',
  accent: 'surface3',
  'accent-foreground': 'textPrimary',
  destructive: 'errorFill',
  'destructive-foreground': 'onError',
  border: 'borderSubtle',
  input: 'border',
  ring: 'primary',
};

// One literal class per variable. Literal strings, so Tailwind's content scan
// of this folder generates them (a built-up `bg-${name}` would not be).
const BG_PROBES = {
  background: 'bg-background',
  foreground: 'bg-foreground',
  card: 'bg-card',
  'card-foreground': 'bg-card-foreground',
  popover: 'bg-popover',
  'popover-foreground': 'bg-popover-foreground',
  primary: 'bg-primary',
  'primary-foreground': 'bg-primary-foreground',
  secondary: 'bg-secondary',
  'secondary-foreground': 'bg-secondary-foreground',
  muted: 'bg-muted',
  'muted-foreground': 'bg-muted-foreground',
  accent: 'bg-accent',
  'accent-foreground': 'bg-accent-foreground',
  destructive: 'bg-destructive',
  'destructive-foreground': 'bg-destructive-foreground',
  border: 'bg-border',
  input: 'bg-input',
  ring: 'bg-ring',
};

let compiledCss;
beforeAll(() => {
  compiledCss = setUpKitStyles();
}, 120000);

afterAll(() => {
  // Leave the legacy singletons on the default palette for any later suite.
  theme.applyAccessibility({ theme: 'dark' });
});

// A palette that differs from `prefs` in every switch it has.
function oppositeOf(prefs) {
  return {
    theme: prefs.theme === 'light' ? 'dark' : 'light',
    higherContrast: !prefs.higherContrast,
    colorBlindSafe: !prefs.colorBlindSafe,
  };
}

// Render one kit Card with a probe class inside the provider and return the
// background colour the runtime resolved for it.
function kitBackground(probeClass) {
  let tree;
  act(() => {
    tree = create(
      <KitThemeProvider>
        <Card className={probeClass} />
      </KitThemeProvider>
    );
  });
  const card = tree.toJSON().children[0];
  const colour = normaliseColour(flatStyle(card.props.style).backgroundColor);
  act(() => tree.unmount());
  return colour;
}

function kitTextColour(element) {
  let tree;
  act(() => {
    tree = create(<KitThemeProvider>{element}</KitThemeProvider>);
  });
  const colour = normaliseColour(flatStyle(tree.toJSON().children[0].props.style).color);
  act(() => tree.unmount());
  return colour;
}

test('the role table is the one the trial agreed (amber primary, three charcoal steps)', () => {
  expect(KIT_COLOUR_TOKENS).toEqual(EXPECTED_ROLES);
  expect(Object.keys(BG_PROBES).sort()).toEqual(Object.keys(EXPECTED_ROLES).sort());
});

test('PALETTES covers every combination resolveTheme() accepts', () => {
  const keys = PALETTES.map(({ prefs }) =>
    [prefs.theme, !!prefs.higherContrast, !!prefs.colorBlindSafe].join('/')
  );
  expect(new Set(keys).size).toBe(8);
});

describe.each(PALETTES)('$name palette', ({ prefs }) => {
  beforeAll(() => setPalette(prefs));

  test.each(Object.keys(EXPECTED_ROLES))('--%s resolves to the theme.js colour', (name) => {
    const token = EXPECTED_ROLES[name];
    const fromResolve = normaliseColour(theme.resolveTheme(prefs).colors[token]);

    // Render while the legacy boot singletons still hold ANOTHER palette, as
    // they do after a live switch in Settings (useTheme() is live, the
    // singletons stay frozen until restart), so a provider that read the
    // static `colors` export instead of the live palette fails here.
    theme.applyAccessibility(oppositeOf(prefs));
    const viaKit = kitBackground(BG_PROBES[name]);

    // The boot path every unmigrated screen reads must agree too.
    theme.applyAccessibility(prefs);
    const fromBoot = normaliseColour(theme.colors[token]);

    expect(viaKit).toEqual({ hex: fromResolve.hex, alpha: 1 });
    expect(viaKit.hex).toBe(fromBoot.hex);
  });

  test('kit text draws in the palette foreground and muted ink', () => {
    const { colors } = theme.resolveTheme(prefs);
    expect(kitTextColour(<Text>Body</Text>).hex).toBe(normaliseColour(colors.textPrimary).hex);
    expect(kitTextColour(<Text variant="muted">Muted</Text>).hex).toBe(
      normaliseColour(colors.textMuted).hex
    );
  });

  test('opacity modifiers keep the theme colour and apply the alpha', () => {
    const { colors } = theme.resolveTheme(prefs);
    const translucent = kitBackground('bg-primary/90');
    expect(translucent.hex).toBe(normaliseColour(colors.primaryFill).hex);
    expect(translucent.alpha).toBeCloseTo(0.9, 5);
  });
});

test('every palette gives the kit a distinct page, card and raised-card step', () => {
  for (const { prefs } of PALETTES) {
    const { colors } = theme.resolveTheme(prefs);
    const steps = [colors.background, colors.surface, colors.surfaceElevated].map(
      (c) => normaliseColour(c).hex
    );
    expect(new Set(steps).size).toBe(3);
  }
});

test('kitColourVariables reads every value from the colours it is given', () => {
  const { colors } = theme.resolveTheme({ theme: 'light', higherContrast: true });
  const vars = kitColourVariables(colors);
  for (const [name, token] of Object.entries(EXPECTED_ROLES)) {
    expect(vars[`--${name}`]).toBe(hexToRgbChannels(colors[token]));
  }
  expect(() => kitColourVariables({ ...colors, primaryFill: undefined })).toThrow(/primaryFill/);
  expect(() => hexToRgbChannels('rgba(0, 0, 0, 0.5)')).toThrow(/opaque hex/);
});

test('the compiled kit stylesheet holds no colour outside the theme variables', () => {
  const literals = compiledCss.match(/#[0-9a-fA-F]{3,8}\b|hsla?\([^)]*\)|rgba?\([^)]*\)/g) || [];
  const allowed = [
    /^rgb\(var\(--[a-z-]+\)$/, // a theme variable (the match stops at its inner ')')
    /^#0000$/, // Tailwind's transparent shadow seed
    /^rgba?\(0,? 0,? 0(?:,| \/) ?[0-9.]+\)$/, // black shadow at an alpha, as theme.js shadows
  ];
  const outside = [...new Set(literals)].filter((c) => !allowed.some((re) => re.test(c)));
  expect(outside).toEqual([]);
  const variables = new Set((compiledCss.match(/var\(--([a-z-]+)\)/g) || []).map((v) => v.slice(6, -1)));
  for (const v of variables) {
    if (!v.startsWith('tw-')) expect(Object.keys(EXPECTED_ROLES)).toContain(v);
  }
});
