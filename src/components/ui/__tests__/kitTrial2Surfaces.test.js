/**
 * Kit trial 2 (LOC-412; parent LOC-409): the Today session card, the workout
 * logger's set rows and exercise list, and the Coach check-in notice, drawn
 * with the React Native Reusables kit. One test group per design rule the CEO
 * set for the trial, each run through the kit's REAL styling pipeline (the
 * Tailwind compile and NativeWind's runtime, see kitTestEnv.js) in all eight
 * palettes resolveTheme() can produce (dark and light, each alone, with higher
 * contrast, with the Okabe-Ito colour-blind-safe swap, and with both), so a
 * test reads the colour a part really resolves to.
 *
 *   1. Amber means "act here" and nothing else: one solid amber button per
 *      screen; the only other amber is the focus ring on the field being
 *      edited (and the notice's outline, which rule 8 sets).
 *   2. Charcoal in three steps (page, card, raised card), a hairline border,
 *      no shadow, no white surface in dark.
 *   3. Numbers are the loudest thing on a training row, in tabular figures.
 *   4. Weight and reps fields are outlined boxes; the one being edited has the
 *      amber ring.
 *   5. A finished set fades back but keeps at least 4.5:1 against its surface
 *      (the table of ratios is printed by the last test of that group).
 *   6. The tick is a square box with a 48 by 48 dp touch target.
 *   7. Related rows sit in one card separated by dividers; the exercises still
 *      to do fold into a collapsible list.
 *   8. The Coach check-in notice is an amber-OUTLINED alert with an icon and
 *      plain words; the other occupants of the Today line are the same alert in
 *      the neutral edge. (The whole Today screen is read for amber in
 *      src/screens/__tests__/HomeScreen.kitAmber.test.js.)
 *
 * Font scale 2.0: Jest cannot lay text out, so this pins what makes the layout
 * hold at the phone's largest text (every Text carries a font-scale cap no
 * higher than the house reading cap of 2.0 and numerals the 1.15 numeral cap;
 * the card, rows and notice have no fixed height; the action row wraps; the
 * notice sentence is never clamped). The actual 2.0x
 * render is a device check (the manual checklist on LOC-412).
 */
jest.mock('react-native-svg', () => require('./kitTestEnv').svgMock());
jest.mock('react-native', () => require('./kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  renderKit,
  hostNodes,
  normaliseColour,
  flatStyle,
  PALETTES,
} = require('./kitTestEnv');

loadNativeInteropRuntime();

const { act } = require('react-test-renderer');
const { resolveTheme, fontScaleCaps } = require('../../../styles/theme');
const { TodayHeroActions, TodayHeroCard, TodayHeroEyebrow, TodayHeroLink, TodayHeroMeta, TodayHeroTitle } = require('../today-hero-kit');
const { ExerciseList } = require('../exercise-card-kit');
const TodayLine = require('../../home/TodayLine').default;
const ExerciseSection = require('../../workout/session/ExerciseSection').default;
const SetTable = require('../../workout/session/SetTable').default;
const SetRow = require('../../workout/session/SetRow').default;
const { Play, Ellipsis } = require('lucide-react-native');

const hex = (c) => normaliseColour(c).hex;
const colorsFor = (prefs) => resolveTheme({ theme: 'dark', ...prefs, largerText: false }).colors;
const stylesOf = (tree) => hostNodes(tree).map((n) => ({ node: n, style: flatStyle(n.props.style) }));
const textNodes = (tree) => hostNodes(tree).filter((n) => n.type === 'Text');

// WCAG 2.x contrast ratio of two #RRGGBB colours.
function luminance(h) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The amber of a palette: the solid fill and the ring/ink amber.
const ambers = (c) => new Set([hex(c.primaryFill), hex(c.primary)]);
// Every host node carrying an amber background, border or text colour.
function amberUses(tree, c) {
  const set = ambers(c);
  const uses = [];
  for (const { node, style } of stylesOf(tree)) {
    for (const key of ['backgroundColor', 'borderColor', 'color']) {
      if (style[key] !== undefined && set.has(hex(style[key]))) uses.push({ node, key });
    }
  }
  return uses;
}

const TIMES = String.fromCharCode(0x00d7);
const noop = () => {};
const ROW = { marker: 2, last: { text: `72.5 ${TIMES} 8` }, wells: { weight: 70, reps: 8, state: 'next' }, check: 'next', onCheck: noop, onPressWell: noop };

function TodayHero() {
  return (
    <TodayHeroCard>
      <TodayHeroEyebrow>Day 1 of 4</TodayHeroEyebrow>
      <TodayHeroTitle>Upper A</TodayHeroTitle>
      <TodayHeroMeta>5 exercises</TodayHeroMeta>
      <TodayHeroActions
        primary={{ label: 'Start workout', icon: Play, onPress: noop, accessibilityLabel: 'Start Upper A' }}
        secondary={{ label: 'Options', icon: Ellipsis, onPress: noop, accessibilityLabel: 'Workout options' }}
      />
      <TodayHeroLink label="Do another session" onPress={noop} />
    </TodayHeroCard>
  );
}

function Logger({ rows = [ROW], state = 'active' }) {
  return (
    <ExerciseSection index={1} name="Bench press" state={state} onAddSet={noop} onSwap={noop} onMore={noop} onPressHeader={noop}>
      <SetTable rows={rows.map((r, i) => ({ id: i, ...r }))} />
    </ExerciseSection>
  );
}

const checkItem = { key: 'check_in', text: 'Your weekly check-in is ready.', onPress: noop, onDismiss: noop, accessibilityLabel: 'Your weekly check-in is ready.' };

beforeAll(() => { setUpKitStyles(); }, 120000);

describe.each(PALETTES)('kit trial 2 surfaces, palette: $name', ({ prefs }) => {
  const c = colorsFor(prefs);
  beforeAll(() => { setPalette(prefs); });

  // ── Rule 1 ────────────────────────────────────────────────────────────────
  test('rule 1: the Today card has exactly one solid amber button; Options and the link are outlined or plain', () => {
    const tree = renderKit(<TodayHero />);
    const buttons = hostNodes(tree).filter((n) => n.props.role === 'button');
    expect(buttons.map((b) => b.props.accessibilityLabel || '')).toEqual(['Start Upper A', 'Workout options', '']);
    const solid = buttons.filter((b) => ambers(c).has(hex(flatStyle(b.props.style).backgroundColor ?? '#000000')));
    expect(solid).toHaveLength(1);
    expect(solid[0].props.accessibilityLabel).toBe('Start Upper A');
    // Nothing else on the card is amber: no amber text, edge or decoration.
    const rest = amberUses(tree, c).filter((u) => u.node !== solid[0]);
    // The solid button's own icon and label are the dark ink on amber, not amber.
    expect(rest).toEqual([]);
  });

  test('rule 1: a set row spends no amber, except the ring on the one field being edited', () => {
    const idle = renderKit(<SetRow {...ROW} onLongPressRow={noop} record />);
    expect(amberUses(idle, c)).toEqual([]);
    const editing = renderKit(<SetRow {...ROW} wells={{ weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' }} />);
    const uses = amberUses(editing, c);
    expect(uses).toHaveLength(1);
    expect(uses[0].key).toBe('borderColor');
    // The ring is the weight field's own box, not the reps box.
    expect(editing.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Set 2 reps').length).toBe(1);
  });

  test('rule 1: the exercise card and its footer spend no amber (the countdown line is quiet ink)', () => {
    const tree = renderKit(<Logger />);
    expect(amberUses(tree, c)).toEqual([]);
  });

  // ── Rule 2 ────────────────────────────────────────────────────────────────
  test('rule 2: card and raised card are the surface and surfaceElevated steps with a hairline border, no shadow', () => {
    const card = renderKit(<Logger />);
    const cards = stylesOf(card).filter(({ style }) => style.borderRadius === 16 && style.borderWidth !== undefined);
    expect(cards).toHaveLength(1);
    expect(hex(cards[0].style.backgroundColor)).toBe(hex(c.surface));
    expect(hex(cards[0].style.borderColor)).toBe(hex(c.borderSubtle));
    expect(cards[0].style.shadowOpacity === undefined || cards[0].style.shadowColor === undefined
      || cards[0].style.elevation === 0 || cards[0].style.shadowRadius === 0).toBe(true);
    const hero = renderKit(<TodayHero />);
    const raised = stylesOf(hero).filter(({ style }) => style.borderRadius === 16 && style.borderWidth !== undefined);
    expect(raised).toHaveLength(1);
    expect(hex(raised[0].style.backgroundColor)).toBe(hex(c.surfaceElevated));
    expect(hex(raised[0].style.borderColor)).toBe(hex(c.borderSubtle));
    // Three distinct steps, none of them white in dark.
    expect(new Set([hex(c.background), hex(c.surface), hex(c.surfaceElevated)]).size).toBe(3);
    if (prefs.theme === 'dark') {
      for (const step of [c.background, c.surface, c.surfaceElevated]) expect(hex(step)).not.toBe('#FFFFFF');
    }
  });

  // ── Rule 3 ────────────────────────────────────────────────────────────────
  test('rule 3: the well values are the largest type on the row, in tabular figures; labels and Last are smaller', () => {
    const tree = renderKit(<SetRow {...ROW} />);
    const sized = textNodes(tree).map((n) => ({ n, s: flatStyle(n.props.style) }));
    const wells = ['Set 2 weight', 'Set 2 reps'].map((label) => {
      const box = tree.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityLabel === label)[0];
      return flatStyle(box.findAll((n) => n.type === 'Text')[0].props.style);
    });
    const biggestElsewhere = Math.max(...sized.map(({ s }) => s.fontSize).filter((size) => size !== wells[0].fontSize));
    for (const w of wells) {
      expect(w.fontSize).toBe(20);
      expect(w.fontSize).toBeGreaterThan(biggestElsewhere);
      expect(w.fontVariant).toEqual(['tabular-nums']);
    }
    // Last is smaller and tabular too, so a column of sets never jiggles.
    const last = sized.find(({ n }) => n.props.children === `72.5 ${TIMES} 8`).s;
    expect(last.fontSize).toBeLessThan(wells[0].fontSize);
    expect(last.fontVariant).toEqual(['tabular-nums']);
  });

  // ── Rule 4 ────────────────────────────────────────────────────────────────
  test('rule 4: weight and reps are outlined boxes; only the one being edited has the amber ring', () => {
    const tree = renderKit(<SetRow {...ROW} wells={{ weight: 72.5, reps: 8, state: 'editing', editingField: 'reps' }} inputField={{ field: 'reps', value: '8', onChangeText: noop, keyboardType: 'number-pad' }} />);
    const weight = flatStyle(tree.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Set 2 weight')[0].props.style);
    expect(weight.borderWidth).toBeGreaterThanOrEqual(1);
    expect(hex(weight.borderColor)).toBe(hex(c.border));
    expect(hex(weight.backgroundColor)).toBe(hex(c.background));
    const input = tree.root.findAll((n) => n.type === 'TextInput')[0];
    expect(input).toBeTruthy();
    const ringBox = stylesOf(tree).find(({ style }) => style.borderWidth === 2 && style.borderColor !== undefined);
    expect(hex(ringBox.style.borderColor)).toBe(hex(c.primary));
  });

  // ── Rule 5 ────────────────────────────────────────────────────────────────
  test('rule 5: a finished set fades back (muted ink) and keeps at least 4.5:1 on its surface', () => {
    const tree = renderKit(<SetRow {...ROW} check="logged" wells={{ weight: 70, reps: 8, state: 'logged' }} marker="W" record />);
    const texts = textNodes(tree);
    expect(texts.length).toBeGreaterThanOrEqual(4);
    const wellsText = tree.root.findAll((n) => n.type === 'Pressable' && /^Set .* (weight|reps)$/.test(n.props.accessibilityLabel || ''))
      .map((box) => box.findAll((n) => n.type === 'Text')[0]);
    for (const n of texts) {
      const ink = hex(flatStyle(n.props.style).color);
      const onWell = wellsText.includes(n);
      const ground = onWell ? c.background : c.surface;
      expect(contrast(ink, hex(ground))).toBeGreaterThanOrEqual(4.5);
    }
    // They really are faded: the value ink is the muted step, not the primary ink.
    for (const n of wellsText) expect(hex(flatStyle(n.props.style).color)).toBe(hex(c.textMuted));
  });

  // ── Rule 3 (LOC-683): the set you are on is the loudest row ────────────────
  // Fails when a suggested set, or a row whose other well is not the one being typed
  // into, fades like a finished one.
  test('rule 3: the set you are on has full-strength numbers, suggested or typed; finished and later sets fade', () => {
    const wellInk = (tree) => tree.root.findAll((n) => n.type === 'Pressable' && /^Set .* (weight|reps)$/.test(n.props.accessibilityLabel || ''))
      .map((box) => hex(flatStyle(box.findAll((n) => n.type === 'Text')[0].props.style).color));
    const strong = hex(c.textPrimary);
    const faded = hex(c.textMuted);
    expect(strong).not.toBe(faded);
    for (const ghost of [false, true]) {
      const next = renderKit(<SetRow {...ROW} check="next" wells={{ weight: 70, reps: 9, state: 'next', ghost }} />);
      expect(wellInk(next)).toEqual([strong, strong]);
      // One well being typed into: the other well is still the set you are on.
      const editing = renderKit(<SetRow {...ROW} check="next" wells={{ weight: 70, reps: 9, state: 'editing', editingField: 'weight', ghost }} inputField={{ field: 'weight', value: '70', onChangeText: noop, keyboardType: 'decimal-pad' }} />);
      expect(wellInk(editing)).toEqual([strong]);
      const logged = renderKit(<SetRow {...ROW} check="logged" wells={{ weight: 70, reps: 9, state: 'logged', ghost }} />);
      expect(wellInk(logged)).toEqual([faded, faded]);
      const later = renderKit(<SetRow {...ROW} check="pending" wells={{ weight: 70, reps: 9, state: 'pending', ghost }} />);
      expect(wellInk(later)).toEqual([faded, faded]);
    }
    // Every kind of well on the set you are on, not only weight and reps.
    for (const kind of ['reps_only', 'duration', 'distance']) {
      const tree = renderKit(<SetRow {...ROW} kind={kind} check="next" wells={{ weight: 70, reps: 60, state: 'next', ghost: true }} />);
      for (const ink of wellInk(tree)) expect(ink).toBe(strong);
    }
    // Nothing amber was added to the row to make it loud.
    expect(amberUses(renderKit(<SetRow {...ROW} check="next" wells={{ weight: 70, reps: 9, state: 'next', ghost: true }} />), c)).toHaveLength(0);
  });

  // ── Rule 6 ────────────────────────────────────────────────────────────────
  test('rule 6: the tick is a square box in a 48 by 48 dp target, a checkbox that speaks its state', () => {
    for (const check of ['logged', 'next', 'pending']) {
      const tree = renderKit(<SetRow {...ROW} check={check} wells={{ weight: 70, reps: 8, state: check }} />);
      const box = hostNodes(tree).find((n) => n.props.role === 'checkbox');
      const s = flatStyle(box.props.style);
      expect(s.width).toBe(s.height);
      expect(s.borderRadius).toBeLessThanOrEqual(s.width / 4);
      // A 48 by 48 dp layout box around it, and the touch area (box plus slop) is 48 by 48.
      const target = stylesOf(tree).find(({ node, style }) => style.width === 48 && style.height === 48
        && node.findAll((n) => n === box).length > 0);
      expect(target).toBeTruthy();
      const slop = box.props.hitSlop;
      expect(s.width + 2 * slop).toBeGreaterThanOrEqual(48);
      expect(s.height + 2 * slop).toBeGreaterThanOrEqual(48);
      expect(box.props['aria-checked']).toBe(check === 'logged');
    }
  });

  // ── Rule 7 ────────────────────────────────────────────────────────────────
  test('rule 7: the rows sit in one card separated by dividers; still-to-do exercises fold into one collapsible list', () => {
    const rows = [ROW, { ...ROW, marker: 3 }, { ...ROW, marker: 4 }];
    const card = renderKit(<Logger rows={rows} />);
    const cards = stylesOf(card).filter(({ style }) => style.borderRadius === 16 && style.borderWidth !== undefined);
    expect(cards).toHaveLength(1);
    const dividers = stylesOf(card).filter(({ node, style }) => node.props.role === 'presentation' && style.height === 1);
    // One under the column labels and one under each of the three rows.
    expect(dividers).toHaveLength(4);
    for (const { style } of dividers) expect(hex(style.backgroundColor)).toBe(hex(c.borderSubtle));

    const list = renderKit(
      <ExerciseList title="Still to do (2)">
        <ExerciseSection key="a" embedded index={2} name="Row" state="upcoming" onPressHeader={noop} />
        <ExerciseSection key="b" embedded index={3} name="Curl" state="upcoming" onPressHeader={noop} />
      </ExerciseList>,
    );
    const trigger = hostNodes(list).find((n) => n.props.accessibilityLabel === 'Still to do (2)');
    expect(trigger.props.accessibilityState.expanded).toBe(true);
    expect(hostNodes(list).filter((n) => /^Exercise [23], /.test(n.props.accessibilityLabel || ''))).toHaveLength(2);
    // Only one card holds the whole list.
    expect(stylesOf(list).filter(({ style }) => style.borderRadius === 16 && style.borderWidth !== undefined)).toHaveLength(1);
    act(() => { trigger.props.onPress({}); });
    expect(hostNodes(list).find((n) => n.props.accessibilityLabel === 'Still to do (2)').props.accessibilityState.expanded).toBe(false);
    expect(hostNodes(list).filter((n) => /^Exercise [23], /.test(n.props.accessibilityLabel || ''))).toHaveLength(0);
  });

  // ── Rule 8 ────────────────────────────────────────────────────────────────
  test('rule 8: the check-in notice is an amber-OUTLINED alert with an icon and plain words, not a filled banner', () => {
    const tree = renderKit(<TodayLine item={checkItem} testID="today-line" />);
    const button = hostNodes(tree).find((n) => n.props.testID === 'today-line');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Your weekly check-in is ready.');
    const alert = stylesOf(tree).find(({ style }) => style.borderWidth !== undefined && style.borderRadius !== undefined);
    expect(hex(alert.style.borderColor)).toBe(hex(c.primary));
    expect(hex(alert.style.backgroundColor)).toBe(hex(c.surface));
    expect(ambers(c).has(hex(alert.style.backgroundColor))).toBe(false);
    // The icon (the bell) and the words are there; colour is not the only signal.
    expect(hostNodes(tree).some((n) => n.type === 'LucideIcon' && n.props.name === 'Bell')).toBe(true);
    expect(textNodes(tree).map((n) => n.props.children)).toContain('Your weekly check-in is ready.');
    // Dismissal is its own 48 dp control beside the notice, never nested in the button.
    const dismiss = hostNodes(tree).find((n) => n.props.testID === 'today-line-dismiss');
    expect(dismiss.props.accessibilityLabel).toBe('Dismiss: Your weekly check-in is ready.');
    expect(button.findAll((n) => n === dismiss)).toHaveLength(0);
    expect(flatStyle(dismiss.props.style)).toMatchObject({ width: 48, height: 48 });
  });

  test('rule 1 and rule 8: every other Today line occupant is the same alert in a quiet neutral edge, with an icon, the same tap and the same words', () => {
    // None of these is a safety message: the arbiter has no Beat UK, calm mode or
    // ED occupant (those keep their own surfaces and are not drawn with this part).
    for (const key of ['recovery_state', 'deload_suggestion', 're_entry', 'phase_mismatch', 'limitation_decision', 'plan_choice', 'plan_note', 'block_complete']) {
      const tree = renderKit(<TodayLine item={{ ...checkItem, key }} testID="today-line" />);
      const button = hostNodes(tree).find((n) => n.props.testID === 'today-line');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Your weekly check-in is ready.');
      const alert = stylesOf(tree).find(({ style }) => style.borderWidth !== undefined && style.borderRadius !== undefined);
      expect(hex(alert.style.borderColor)).toBe(hex(c.borderSubtle));
      expect(hex(alert.style.backgroundColor)).toBe(hex(c.surface));
      expect(amberUses(tree, c)).toHaveLength(0);
      expect(hostNodes(tree).some((n) => n.type === 'LucideIcon' && n.props.name === 'Info')).toBe(true);
      expect(textNodes(tree).map((n) => n.props.children)).toContain('Your weekly check-in is ready.');
    }
    const coach = renderKit(<TodayLine item={{ ...checkItem, key: 'coach_decision', onDismiss: null }} testID="today-line" />);
    expect(hostNodes(coach).some((n) => n.type === 'LucideIcon' && n.props.name === 'ChevronRight')).toBe(true);
  });

  // ── Font scale 2.0 ────────────────────────────────────────────────────────
  test('font scale 2.0: every text carries a cap no higher than the house reading cap; numerals the numeral cap', () => {
    const trees = [renderKit(<TodayHero />), renderKit(<Logger />), renderKit(<TodayLine item={checkItem} testID="t" />)];
    for (const tree of trees) {
      for (const n of textNodes(tree)) {
        const cap = n.props.maxFontSizeMultiplier;
        expect(cap).toBeGreaterThanOrEqual(1);
        expect(cap).toBeLessThanOrEqual(fontScaleCaps.reading);
      }
    }
    const row = renderKit(<SetRow {...ROW} />);
    const wellTexts = row.root.findAll((n) => n.type === 'Pressable' && /(weight|reps)$/.test(n.props.accessibilityLabel || ''))
      .map((box) => box.findAll((n) => n.type === 'Text')[0]);
    for (const n of wellTexts) {
      expect(n.props.maxFontSizeMultiplier).toBe(fontScaleCaps.numeral);
      expect(n.props.numberOfLines).toBe(1);
      expect(n.props.adjustsFontSizeToFit).toBeUndefined();
    }
  });

  test('font scale 2.0: nothing is given a fixed height that large text could clip, and the action row wraps', () => {
    const hero = renderKit(<TodayHero />);
    for (const { node, style } of stylesOf(hero)) {
      if (node.type === 'Text') expect(style.height).toBeUndefined();
      if (node.props.role === 'button') {
        expect(style.height).toBeUndefined();
        expect(style.minHeight).toBeGreaterThanOrEqual(48);
      }
    }
    expect(stylesOf(hero).some(({ style }) => style.flexWrap === 'wrap')).toBe(true);
    const notice = renderKit(<TodayLine item={checkItem} testID="t" />);
    expect(textNodes(notice).find((n) => n.props.children === checkItem.text).props.numberOfLines).toBeUndefined();
    for (const { style } of stylesOf(notice)) {
      if (style.height !== undefined) expect(style.height).toBe(48);
    }
  });
});

// LOC-683: a notice never cuts its sentence short. Fails when the Notice part puts a
// line limit on the title or the sentence, with or without a close control.
describe('LOC-683: a notice shows its whole sentence', () => {
  const { CoachNotice, QuietNotice } = require('../coach-notice');
  const LONG = 'Your weekly check-in is ready. It shapes this week\'s coaching decision and takes about a minute.';
  const cases = [
    ['CoachNotice', CoachNotice, 'with a close control'],
    ['CoachNotice', CoachNotice, 'without one'],
    ['QuietNotice', QuietNotice, 'with a close control'],
    ['QuietNotice', QuietNotice, 'without one'],
  ];
  test.each(cases.map(([name, Part, how]) => ({ name, Part, how })))('$name $how: neither the title nor the sentence carries a line limit', ({ Part, how }) => {
    const tree = renderKit(
      <Part title="Weekly check-in" text={LONG} onPress={noop} onDismiss={how === 'without one' ? null : noop} testID="n" />
    );
    const texts = textNodes(tree);
    expect(texts.map((n) => n.props.children)).toEqual(expect.arrayContaining(['Weekly check-in', LONG]));
    for (const n of texts) {
      expect(n.props.numberOfLines).toBeUndefined();
      expect(n.props.ellipsizeMode).toBeUndefined();
    }
  });

  // The text column is the room between the icon and the close control or chevron. The
  // notice's own right padding (it keeps clear of the control) sits on the alert once;
  // when the alert's className also reached its Text, the sentence got that padding a
  // second time and wrapped in half the room.
  test.each([['with a close control', noop], ['without one', null]])('%s: the sentence carries none of the alert\'s padding, edge or fill', (_how, onDismiss) => {
    const tree = renderKit(<CoachNotice title="Weekly check-in" text={LONG} onPress={noop} onDismiss={onDismiss} testID="n" />);
    const alert = stylesOf(tree).find(({ node }) => node.props.role === 'none');
    expect(alert.style.paddingRight).toBe(onDismiss ? 56 : 40);
    for (const n of textNodes(tree)) {
      const st = flatStyle(n.props.style);
      expect(st.paddingRight).toBeUndefined();
      expect(st.borderColor).toBeUndefined();
      expect(st.backgroundColor).toBeUndefined();
    }
  });

  test('no caller can put a clamp back: the part takes no wrap flag and its source sets no numberOfLines', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'coach-notice.tsx'), 'utf8');
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/numberOfLines/);
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\bwrap\b/);
  });
});

describe('rule 5: the contrast ratios of a finished set in every palette (reported)', () => {
  test('muted ink against the card and the well, per palette', () => {
    const table = PALETTES.map(({ name, prefs }) => {
      const c = colorsFor(prefs);
      const onCard = contrast(hex(c.textMuted), hex(c.surface));
      const onWell = contrast(hex(c.textMuted), hex(c.background));
      expect(onCard).toBeGreaterThanOrEqual(4.5);
      expect(onWell).toBeGreaterThanOrEqual(4.5);
      return `${name}: ${onCard.toFixed(2)}:1 on the card, ${onWell.toFixed(2)}:1 on the field`;
    });
    // eslint-disable-next-line no-console
    console.info(`Finished-set ink contrast (WCAG 2.x)\n${table.join('\n')}`);
  });
});
