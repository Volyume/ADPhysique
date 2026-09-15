/**
 * amberPrimitives.guard.test.js — the shared primitives stop spending amber
 * (D174, the amber census).
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D174, whose parent is `docs/design-redesign-2026-09-14/20-DIRECTION-AND-
 * PLAN.md` §3 (the four amber disciplines) and §5 law 6. The reading that
 * governs every case below is D174's own: **discipline 1 is a ceiling**
 * ("amber marks 'now' and nothing else": today's ribbon cell, the set you are
 * on, the one committing button, a personal best) and **discipline 4 is a
 * filter inside it** ("a colour is applied because a number or a state
 * justifies it"). Discipline 4 cannot widen discipline 1, so "it is a state"
 * is never on its own an argument for amber -- the state also has to be *now*.
 * A stored preference is not now. A chosen filter is not now.
 *
 * WHY A SOURCE GUARD. D174 measured 1,375 raw amber references across 175
 * files where the product is entitled to about twelve sites, and the four
 * files pinned here are roughly a third of that surface: three lines in
 * `SettingsPrimitives` drew an amber disc on 104 settings rows across 17
 * screens, and two lines in `Button` coloured 62 `tertiary` and 33
 * icon-bearing `primary` call sites. Nothing renders most of those branches in
 * a test, so a rendered-colour suite would not notice them coming back;
 * grepping the SOURCE pins the treatment whether or not a branch is mounted.
 * Comments are stripped first (the `code()` helper, as
 * `rewardProps.guard.test.js` and `community.privacy.guard.test.js` do), so a
 * rule NAMED in a docblock -- and every file below now explains in prose which
 * colour it lost -- is never read as that colour coming back.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. `SettingsPrimitives` carries no amber at all: no `primaryBg` behind the
 *     row glyph (§3.2 forbids "a tint behind a glyph", and D174's
 *     REMOVE-decoration definition names "an icon in a settings list" word for
 *     word) and no amber ink on the glyph. BOTH halves of the frozen/live pair
 *     are pinned, because the live half wins at runtime and a fix applied to
 *     one half only is this codebase's standing trap.
 *  2. The `destructive` branch KEEPS `error`. §8 protects the state-colour
 *     grammar; a guard that let a later sweep grey out "Delete my account"
 *     would be doing harm in the name of restraint.
 *  3. `Button.tertiary` carries no amber -- it had three amber properties at
 *     once, a wash, an amber label on a button that commits to nothing, and a
 *     tinted border -- and `primary.iconFg` is neutral. `emphatic` still
 *     carries `primaryFill`: it is discipline 1's "one committing button" and
 *     it is the one variant this sweep must NOT touch.
 *  4. The four selection primitives (`Chip`, `SegmentedControl`, `OptionCard`,
 *     `Dropdown`) carry no amber in their selected states -- D174 A2: a chip
 *     selects a VIEW, not a state of the user's training -- and their
 *     selection is pinned POSITIVELY as the three simultaneous differences A2
 *     ordered (`surface3` fill, `textPrimary` at the semibold face,
 *     `borderLight` edge), so a later edit cannot satisfy this suite by simply
 *     deleting the selected treatment and leaving selection unreadable.
 *  5. `Dropdown`'s filled/open TRIGGER is A2's one named exception and keeps
 *     amber, de-washed from a 40%-alpha border to the solid token. The exact
 *     set of amber lines left in that file is pinned as a list, so the
 *     exception cannot quietly grow.
 *  6. `TextField`'s focus ring stays amber and stays SOLID. A focused field is
 *     the user's live moment, so the ring is a KEEP-structural site; drawing
 *     it at 40% alpha was both §3.2's tint and a weakened indicator for anyone
 *     navigating by focus. Pinned in both directions: the ring exists, and it
 *     is not alpha'd.
 *  7. `Illustrations.js` does not exist and nothing references it. It had zero
 *     production importers, 28 amber `ACCENT` strokes and a decorative
 *     `opacity: 0.5` halo; a deleted file is only deleted until somebody
 *     restores it from history.
 *
 * NOT IN SCOPE, named so the gaps are recorded rather than mistaken for
 * completeness: every `<Switch>` `trackColor`/`thumbColor` (D174 A1, a
 * concurrent lane), the hand-rolled `*Active`/`*Selected` style keys on
 * screens (A2 migrates them onto these primitives), and the iOS numeric
 * keyboard accessory's amber "Next"/"Done" labels in `TextField`, which D174's
 * order of work does not name and which are left for a lead ruling rather than
 * swept on an agent's own judgement.
 *
 * ONE COLLISION WORTH KNOWING ABOUT, because it will catch the next person.
 * `DietaryPreferencesEditor.test.js` proves its ED-safe excluded-foods nudge
 * never mentions body weight by scanning `JSON.stringify(tree.toJSON())` for
 * the substring "weight". That tree includes STYLE props, so any component it
 * renders that carries a numeric `fontWeight` key fails an ED-safety case for
 * a reason that has nothing to do with copy. `Chip` is one of those components,
 * which is why its selected label names the Inter semibold FACE directly
 * instead of going through `type.w()`. The ED suite was left untouched: it is
 * not this unit's to re-anchor, and the fragile half is its substring check,
 * not the nudge.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const read = (rel) => code(fs.readFileSync(path.join(SRC, rel), 'utf8'));

// Every accessor for the amber roles, in all three spellings the primitives
// use: the static singleton (`colors.primary`), the live theme
// (`t.colors.primary`) and the per-render variant builder's parameter
// (`c.primaryBg`). No `g` flag: these are reused with .test() and a sticky
// lastIndex would make the results order-dependent.
const AMBER = /\b(?:c|colors|t\.colors)\.(primary|primaryBg|primaryFill|primaryDim)\b/;
const amberLinesIn = (src) =>
  src.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter((l) => AMBER.test(l));

describe('D174: the settings row glyph loses its amber disc (104 rows, 17 screens)', () => {
  const SP = read('components/SettingsPrimitives.js');

  test('no amber anywhere in the file, in either half of the frozen/live pair', () => {
    expect(amberLinesIn(SP)).toEqual([]);
    // Named separately from the sweep above: `primaryBg` was the specific
    // token behind the glyph, at `:39` in the render and `:136` in the live
    // override, and it is the one a later edit is most likely to reach for.
    expect(SP.includes('primaryBg')).toBe(false);
  });

  test('the glyph wrapper has no fill and no disc geometry left to fill', () => {
    const frozen = SP.slice(SP.indexOf('settingIcon: {'), SP.indexOf('settingLabel:'));
    expect(frozen).not.toMatch(/backgroundColor/);
    expect(frozen).not.toMatch(/borderRadius/);
    // The `errorBg` wash went with the amber one: same disc, same §3.2 tint.
    expect(SP).not.toMatch(/settingIconDestructive/);
    expect(SP).not.toMatch(/backgroundColor: t\.colors\.errorBg/);
  });

  test('the glyph takes the secondary ink, and the destructive branch keeps error (§8)', () => {
    expect(SP).toMatch(
      /color=\{destructive \? t\.colors\.error : t\.colors\.textSecondary\}/,
    );
    // The destructive LABEL keeps it too. A settings row that deletes an
    // account has to say so in colour as well as in words.
    expect(SP).toMatch(/destructive && \{ color: t\.colors\.error \}/);
  });
});

describe('D174: the button variants, where only the committing one stays amber', () => {
  const BUTTON = read('components/Button.js');
  const table = BUTTON.slice(
    BUTTON.indexOf('function buildVariants'),
    BUTTON.indexOf('function buildSizes'),
  );
  const rows = Object.fromEntries(
    table
      .split('\n')
      .filter((l) => /^\s{4}[a-z]+: \{/.test(l))
      .map((l) => [l.trim().split(':')[0], l.trim()]),
  );

  test('the table still has all six variants (this suite reads rows, not the whole file)', () => {
    expect(Object.keys(rows).sort()).toEqual(
      ['destructive', 'emphatic', 'outline', 'primary', 'secondary', 'tertiary'],
    );
  });

  test('tertiary carries no amber: not a wash, not a label, not a tinted border', () => {
    expect(AMBER.test(rows.tertiary)).toBe(false);
    expect(rows.tertiary).not.toMatch(/withAlpha/);
    // It keeps its BOX. `border` is what makes a ghost button a contained
    // control rather than a bare coloured text link, which is the property
    // `primitives.test.js` has pinned since D148 and D174 does not relax.
    expect(rows.tertiary).toMatch(
      /tertiary: \{ bg: 'transparent', fg: c\.textSecondary, border: c\.border, iconFg: c\.textSecondary \}/,
    );
    // `withAlpha`/`alpha` were imported for that border alone; a dangling
    // import is how a tint finds its way back in.
    expect(BUTTON).not.toMatch(/withAlpha/);
  });

  test('the standard primary glyph is neutral (33 icon-bearing call sites)', () => {
    expect(AMBER.test(rows.primary)).toBe(false);
    expect(rows.primary).toMatch(/iconFg: c\.textSecondary/);
  });

  test('emphatic is UNTOUCHED: discipline 1 grants the accent to the one committing button', () => {
    expect(rows.emphatic).toMatch(
      /emphatic: \{ bg: c\.primaryFill, fg: c\.onPrimary, border: 'transparent', iconFg: c\.onPrimary \}/,
    );
    // And it is the only row that names the accent at all.
    expect(Object.entries(rows).filter(([, l]) => AMBER.test(l)).map(([k]) => k)).toEqual(['emphatic']);
  });
});

describe('D174 A2: a selection is not "now", so the selected state is neutral and stronger', () => {
  test('Chip: no amber; selected is fill + semibold ink + a lighter edge', () => {
    const CHIP = read('components/Chip.js');
    expect(amberLinesIn(CHIP)).toEqual([]);
    expect(CHIP).toMatch(
      /selected && \{ backgroundColor: t\.colors\.surface3, borderColor: t\.colors\.borderLight \}/,
    );
    // The semibold ink, through the house `type.w()` helper, which sets the
    // Inter face AND the numeric fontWeight -- the numeric half being what
    // "still reads to accessibility services" (theme.js:724-726).
    //
    // RE-ANCHORED BY LEAD REVIEW, and the reason matters more than the pattern.
    // This first pinned the face spelled WITHOUT the weight, to dodge an
    // ED-safety suite that scans a serialised render tree for the substring
    // "weight" and was tripped by the style key. That traded real accessibility
    // on 114 chips for a string match, and pinning it would have frozen the
    // trade in place. The scan was made precise instead
    // (`DietaryPreferencesEditor.test.js`, which now strips only `fontWeight`
    // declarations and asserts that is all it stripped), and the chip keeps its
    // weight.
    expect(CHIP).toMatch(
      /selected && \{ \.\.\.t\.type\.w\('label', 'semibold'\), color: t\.colors\.textPrimary \}/,
    );
    // The unselected chip keeps its own edge, so an unselected chip on a card
    // is still an identifiable control (WCAG 1.4.11).
    expect(CHIP).toMatch(/\{ backgroundColor: t\.colors\.surface, borderColor: t\.colors\.border \}/);
  });

  test('SegmentedControl: no amber, and BOTH halves of the frozen/live pair moved', () => {
    const SEG = read('components/SegmentedControl.js');
    expect(amberLinesIn(SEG)).toEqual([]);
    // Once in the frozen StyleSheet, once in buildLiveStyles. The live half
    // wins at runtime; a one-sided fix is the defect class this campaign has
    // spent itself closing.
    expect((SEG.match(/segmentActive: \{ backgroundColor: (?:t\.)?colors\.surface3, borderColor: (?:t\.)?colors\.borderLight \}/g) || []).length)
      .toBe(2);
    expect((SEG.match(/segmentTextActive: \{ \.\.\.(?:t\.)?type\.w\('label', 'semibold'\), color: (?:t\.)?colors\.textPrimary \}/g) || []).length)
      .toBe(2);
    // The edge only reads if every segment reserves room for one, otherwise
    // the track grows by 2px the first time a segment is chosen.
    expect((SEG.match(/borderWidth: 1, borderColor: 'transparent'/g) || []).length).toBe(2);
  });

  test('OptionCard: no amber, in the card, the glyph or the tick; both halves moved', () => {
    const OC = read('components/OptionCard.js');
    expect(amberLinesIn(OC)).toEqual([]);
    expect((OC.match(/cardActive: \{ backgroundColor: (?:t\.)?colors\.surface3, borderColor: (?:t\.)?colors\.borderLight \}/g) || []).length)
      .toBe(2);
    expect((OC.match(/labelActive: \{ \.\.\.(?:t\.)?type\.w\('bodyStrong', 'semibold'\), color: (?:t\.)?colors\.textPrimary \}/g) || []).length)
      .toBe(2);
    // The tick survives as the selection affordance; only its colour changed.
    expect(OC).toMatch(/name="checkmark-circle" size=\{20\} color=\{t\.colors\.textPrimary\}/);
  });

  test('Dropdown: the chosen row is neutral in both halves', () => {
    const DD = read('components/Dropdown.js');
    expect((DD.match(/dropdownItemActive: \{ backgroundColor: (?:t\.)?colors\.surface3 \}/g) || []).length).toBe(2);
    expect(DD).toMatch(/name="checkmark" size=\{16\} color=\{t\.colors\.textPrimary\}/);
    expect(DD).not.toMatch(/withAlpha/);
  });

  test('Dropdown: amber survives ONLY on the filled/open input state, and nowhere else', () => {
    // A2's one named exception inside this file: a filled or open input is a
    // live input state. `dropdownTriggerFilled` was a 40%-alpha wash of the
    // accent (§3.2's tint); it is the solid token now, matching
    // `dropdownTriggerOpen`. The list border belongs to the open state, since
    // the list only renders while open.
    //
    // THE CHEVRON WAS RULED OUT by lead review and is deliberately absent from
    // this list. It fired amber on exactly the same `value` condition as the
    // filled border, so the field carried TWO amber marks for ONE state, which
    // is the scarcity failure discipline 1 exists to prevent. The border keeps
    // the state; the chevron went back to being a disclosure affordance. Its
    // absence here is the pin: if it comes back amber, this list no longer
    // matches and the case fails.
    expect(amberLinesIn(read('components/Dropdown.js'))).toEqual([
      'dropdownTriggerFilled: { borderColor: colors.primary },',
      'dropdownTriggerOpen: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },',
      'borderColor: colors.primary, borderTopWidth: 0,',
      'dropdownTriggerFilled: { borderColor: t.colors.primary },',
      'dropdownTriggerOpen: { borderColor: t.colors.primary },',
      'dropdownList: { backgroundColor: t.colors.surface, borderColor: t.colors.primary },',
    ]);
  });
});

describe('D174: the focus ring is kept, and de-washed', () => {
  const TF = read('components/TextField.js');

  test('the ring is solid amber, not a 40%-alpha tint', () => {
    expect(TF).toMatch(/focused && \{ borderColor: t\.colors\.primary \}/);
    expect(TF).not.toMatch(/withAlpha/);
    expect(TF).not.toMatch(/alpha\.strong/);
  });

  test('the ring still EXISTS: this is a keep-structural site, not a neutralised one', () => {
    // Written as its own case because the cheapest way to pass the case above
    // is to delete the focused branch, which would take away the only
    // indicator a keyboard or switch-control user navigates a form by.
    expect(TF).toMatch(/const \[focused, setFocused\] = useState\(false\);/);
    expect(TF).toMatch(/focused && \{ borderColor:/);
    // The error border still wins over it: a field in error says error.
    expect(TF.indexOf('error ? { borderColor: t.colors.error }')).toBeGreaterThan(
      TF.indexOf('focused && { borderColor:'),
    );
  });
});

describe('D174: Illustrations.js is deleted', () => {
  test('the file does not exist', () => {
    expect(fs.existsSync(path.join(SRC, 'components', 'Illustrations.js'))).toBe(false);
  });

  test('nothing under src/ imports, requires or mocks it', () => {
    // Tests are INCLUDED in this scan, unlike most source guards: the only two
    // references the file ever had were `jest.mock` calls, and a jest.mock of
    // a missing module throws at resolution rather than failing quietly.
    const offences = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name.endsWith('.js') && /components\/Illustrations/.test(fs.readFileSync(p, 'utf8'))) {
          offences.push(path.relative(SRC, p).split(path.sep).join('/'));
        }
      }
    };
    walk(SRC);
    expect(offences).toEqual([]);
  });
});
