/**
 * DayDots.tone.test.js
 *
 * D214 addendum 1, Q5 = A (Progress, recovery heatmap and Consistency
 * elevation; plan `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 7.1 and 7.5): the Progress root and
 * Consistency draw their seven-day cells through the live Community
 * `DayDots`, with a new optional `tone` prop. This suite pins:
 *   1. `tone="ink"`: a trained dot is `textSecondary`, today's ring is
 *      `textPrimary`, and no dot, ring or fill anywhere is the amber token. On a
 *      progress surface a trained day is a fact; amber is only ever "the
 *      thing to do" (the plan's rule 3, the reverted week ribbon's fault).
 *   2. The default, and `tone="accent"`, are exactly today's Community look:
 *      trained = `primary`, today ringed in `primary` when not yet trained.
 *      The amber budget is pinned by `rows.amber.guard.test.js` (DayDots
 *      reads the amber token exactly twice); this file asserts the same count
 *      from the source so the ink branch can never add a third use.
 *   3. Nothing else differs between tones: the same seven dots, the same ring
 *      rule (today, not yet trained), the same spoken label, the same single
 *      image-role node.
 *   4. An unknown tone falls back to the default look rather than drawing
 *      nothing.
 *
 * `useTheme` is the real `resolveTheme` of a mutable preference object, so
 * the light and colour-blind-safe palettes can be asked for by name.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { resolveTheme } from '../../../styles/theme';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
let mockPrefs = {};
jest.mock('../../../hooks/useTheme', () => () => require('../../../styles/theme').resolveTheme(mockPrefs));

import DayDots from '../DayDots';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'DayDots.js'), 'utf8');
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const dots = (tree) => tree.toJSON().children.map((d) => StyleSheet.flatten(d.props.style));
const label = (tree) => tree.root.findAll((n) => n.props?.accessibilityLabel != null)[0].props.accessibilityLabel;

beforeEach(() => { mockPrefs = {}; });

describe('tone="ink": a fact, never amber', () => {
  test('trained dots are textSecondary and today (not yet trained) is ringed in textPrimary', () => {
    const t = resolveTheme({});
    const d = dots(create(<DayDots days={['mon', 'wed']} todayKey="thu" tone="ink" />));
    expect(d[0].backgroundColor).toBe(t.colors.textSecondary); // Monday, trained
    expect(d[2].backgroundColor).toBe(t.colors.textSecondary); // Wednesday, trained
    expect(d[1].backgroundColor).toBe(t.colors.border); // Tuesday, not trained
    expect(d[3]).toMatchObject({ borderColor: t.colors.textPrimary, borderWidth: 1, backgroundColor: t.colors.border }); // Thursday: today
  });

  test('no dot, ring or fill is amber, in dark, light and colour-blind-safe', () => {
    [{}, { theme: 'light' }, { colorBlindSafe: true }, { theme: 'light', colorBlindSafe: true }, { higherContrast: true }].forEach((prefs) => {
      mockPrefs = prefs;
      const t = resolveTheme(prefs);
      const used = dots(create(<DayDots days={['mon', 'tue', 'sun']} todayKey="wed" tone="ink" />))
        .flatMap((s) => [s.backgroundColor, s.borderColor]);
      expect(used).not.toContain(t.colors.primary);
      expect(used).not.toContain(t.colors.primaryFill);
    });
  });

  test('every other dot is untouched: not-trained dots stay `border`, no ring away from today', () => {
    const t = resolveTheme({});
    const d = dots(create(<DayDots days={['mon']} todayKey="thu" tone="ink" />));
    [1, 2, 4, 5, 6].forEach((i) => {
      expect(d[i].backgroundColor).toBe(t.colors.border);
      expect(d[i].borderWidth).toBe(0);
    });
  });

  test('a trained today keeps its fill and gets no ring (the ring rule is unchanged)', () => {
    const t = resolveTheme({});
    const d = dots(create(<DayDots days={['thu']} todayKey="thu" tone="ink" />));
    expect(d[3].backgroundColor).toBe(t.colors.textSecondary);
    expect(d[3].borderWidth).toBe(0);
  });

  test('the colours are live: a light theme changes them', () => {
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    const d = dots(create(<DayDots days={['mon']} todayKey="tue" tone="ink" />));
    expect(d[0].backgroundColor).toBe(light.colors.textSecondary);
    expect(d[1].borderColor).toBe(light.colors.textPrimary);
  });
});

describe('the default is Community\'s own look, untouched', () => {
  test.each([[undefined], ['accent']])('tone %p: trained = primary, today ringed in primary when not trained', (tone) => {
    const t = resolveTheme({});
    const d = dots(create(<DayDots days={['mon']} todayKey="tue" tone={tone} />));
    expect(d[0].backgroundColor).toBe(t.colors.primary);
    expect(d[1]).toMatchObject({ borderColor: t.colors.primary, borderWidth: 1 });
  });

  test('an unknown tone falls back to the default look', () => {
    const t = resolveTheme({});
    const d = dots(create(<DayDots days={['mon']} todayKey="tue" tone="loud" />));
    expect(d[0].backgroundColor).toBe(t.colors.primary);
  });
});

describe('nothing else differs between tones', () => {
  test('the same seven dots, the same spoken label and one image-role node', () => {
    const accent = create(<DayDots days={['mon', 'wed', 'fri']} todayKey="sat" />);
    const ink = create(<DayDots days={['mon', 'wed', 'fri']} todayKey="sat" tone="ink" />);
    expect(ink.toJSON().children).toHaveLength(7);
    expect(label(ink)).toBe(label(accent));
    expect(label(ink)).toBe('Trained Mon, Wed, Fri');
    const images = ink.root.findAll((n) => n.props?.accessibilityRole === 'image' && typeof n.type === 'string');
    expect(images).toHaveLength(1);
  });

  test('the sizes and gaps do not change with the tone', () => {
    const a = dots(create(<DayDots days={['mon']} todayKey="tue" />));
    const i = dots(create(<DayDots days={['mon']} todayKey="tue" tone="ink" />));
    a.forEach((s, n) => {
      expect(i[n].width).toBe(s.width);
      expect(i[n].height).toBe(s.height);
      expect(i[n].borderRadius).toBe(s.borderRadius);
    });
  });
});

describe('source guard: the amber budget is not spent on the ink tone', () => {
  test('DayDots reads the amber token exactly twice, both in the accent branch (the folder guard pins the same count)', () => {
    const matches = code.match(/\bc\.primary\b|\bcolors\.primary\b|\bt\.colors\.primary\b/g) || [];
    expect(matches).toHaveLength(2);
    expect(code).toMatch(/ink \? t\.colors\.textSecondary : t\.colors\.primary/);
    expect(code).toMatch(/ink \? t\.colors\.textPrimary : t\.colors\.primary/);
  });

  test('no raw hex literal', () => {
    expect(code).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
  });
});
