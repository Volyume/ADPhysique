/**
 * Nutrition, under direction D (D169, D170, D171).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * The first block is the important one, and it pins an ABSENCE that looks like
 * an omission: this screen has NO `type.hero` element, deliberately. Every
 * other stage-2 screen got one. "Exactly one loud thing per screen" is a
 * ceiling, not a quota, and the diary is a workspace that takes input all day
 * rather than a screen that answers a question. Every candidate was also wrong
 * on its own merits, and the loudest of them - calories REMAINING - is a
 * countdown of what you may still eat, which is the most loaded framing on the
 * screen. Without this case a later pass would "finish the job" by adding one.
 *
 * The rest pin the ED chain (which is the reason the screen is careful at all),
 * law 2's un-carding, law 3's control radius, law 6's amber spend, and law 7 on
 * the one number that lacked its unit.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const DIARY = code(read('src/screens/DiaryScreen.js'));
const RINGS = code(read('src/components/food/MacroRings.js'));

describe('D169: this screen has no loud element, and that is the ruling', () => {
  test('no type.hero and no BigNumber anywhere on the Nutrition tab', () => {
    for (const [name, src] of [['DiaryScreen', DIARY], ['MacroRings', RINGS]]) {
      expect({ name, hero: /type\.hero|BigNumber/.test(src) }).toEqual({ name, hero: false });
    }
  });

  test('the calorie figure is not promoted to display scale', () => {
    // It is a countdown of what you may still eat. It stays where it is.
    expect(RINGS).not.toMatch(/fontSize\.(display|hero)/);
    expect(RINGS).toContain('fontSize.xxxl');
  });
});

describe('ED-safety: the chain this screen is careful for', () => {
  test('exactly one flag read, and it fails closed', () => {
    const reads = DIARY.match(/getOpenEdPatternFlag\(/g) || [];
    const closed = DIARY.match(/getOpenEdPatternFlag\([^)]*\)\.catch\(\(\) => 'read_failed'\)/g) || [];
    expect(reads.length).toBe(1);
    expect(closed.length).toBe(1);
  });

  test('calm mode is read directly here and also fails closed', () => {
    expect(DIARY).toContain("AsyncStorage.getItem(WELLBEING_KEY).catch(() => 'read_failed')");
    expect(DIARY).toContain("calmMode: wellbeingRaw === 'read_failed' || isCalm(wellbeing)");
  });

  test('the banking carve-out stays gated on the flag', () => {
    expect(DIARY).toContain('const bankingAvailable = !!targets && !targetWasFloored(targets) && !edFlagOpen;');
  });
});

describe('D171, law 2: a card means an object', () => {
  test('the consent notice and the planned banner are no longer boxed', () => {
    for (const key of ['offCard', 'plannedBanner']) {
      const block = new RegExp(`\\n  ${key}: \\{[\\s\\S]*?\\n  \\},`).exec(DIARY);
      expect({ key, anchored: !!block }).toEqual({ key, anchored: true });
      expect({ key, radius: /borderRadius/.test(block[0]) }).toEqual({ key, radius: false });
      expect({ key, rule: /borderTopWidth: StyleSheet\.hairlineWidth/.test(block[0]) })
        .toEqual({ key, rule: true });
    }
  });

  test('their live halves moved with them', () => {
    // Live is appended after frozen in every style array on this screen, so a
    // live half still carrying the fill would re-apply the card at runtime and
    // the change would look right in source while doing nothing on device.
    expect(DIARY).toContain('offCard: { borderTopColor: t.colors.borderSubtle }');
    expect(DIARY).toContain('plannedBanner: { borderTopColor: t.colors.borderSubtle }');
  });

  test('the macro summary is not a card either', () => {
    const block = /\n  card: \{[\s\S]*?\n  \},/.exec(RINGS);
    expect(!!block).toBe(true);
    expect(block[0]).not.toMatch(/borderRadius|borderWidth|backgroundColor/);
  });
});

describe('D171, law 3: anything you press wears the control radius', () => {
  test.each([
    'dayPagerNav', 'dateButton', 'todayPill', 'dayPagerMore',
    'addMealRow', 'plannedBtnPrimary', 'plannedBtnGhostButton', 'saveMealBtn', 'waterBtn',
  ])('%s', (key) => {
    const block = new RegExp(`\\n  ${key}: \\{[\\s\\S]*?\\n  \\},`).exec(DIARY);
    expect({ key, anchored: !!block }).toEqual({ key, anchored: true });
    expect({ key, control: block[0].includes('borderRadius: radius.control') })
      .toEqual({ key, control: true });
  });

  test('no control on this screen still wears the card radius', () => {
    // `dateButton` and `plannedBtnGhostButton` were on radius.lg -- controls
    // wearing a card's shape, which is the sameness law 3 exists to break.
    for (const key of ['dateButton', 'plannedBtnGhostButton']) {
      const block = new RegExp(`\\n  ${key}: \\{[\\s\\S]*?\\n  \\},`).exec(DIARY);
      expect({ key, lg: block[0].includes('radius.lg') }).toEqual({ key, lg: false });
    }
  });
});

describe('D170, law 6: amber means now', () => {
  test('the ring arc is no longer amber', () => {
    // One colour at EVERY value is the safety rule and is unchanged; which
    // colour is law 6's question, and an arc that is amber at 10% of the day
    // and at 90% of it is amber as decoration.
    expect(RINGS).toContain('return c.borderLight;');
    expect(RINGS).toContain('return colors.borderLight;');
    expect(RINGS).not.toMatch(/return (c|colors)\.primaryFill;/);
  });

  test('the planned banner lost its amber edge with its box', () => {
    const block = /\n  plannedBanner: \{[\s\S]*?\n  \},/.exec(DIARY);
    expect(block[0]).not.toContain('withAlpha');
    expect(block[0]).not.toContain('primary');
  });
});

describe('D169, law 7: a number states what it is', () => {
  test('the ring figure carries its unit, not a bare "left"', () => {
    expect(RINGS).toContain("`${energyUnitLabel(energyUnit)} ${over ? 'over' : 'left'}`");
  });
});
