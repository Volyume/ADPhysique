/**
 * TrainingDaysGrid.test.js
 *
 * D214 (plan `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 5.2 CS-13 and CS-21, 7.3 item 3): the
 * twelve-week training calendar of the Consistency screen. The old grid had
 * twelve columns of seven-day blocks ending today (not weeks), no labels, one
 * label for 84 cells, amber on a fact and a legend that invented a rest day.
 * This suite pins the fixes, each written to fail on the old drawing:
 *   1. Columns are Monday-to-Sunday weeks: 84 days ending on a Thursday fill
 *      THIRTEEN columns (a 3-day first part week, eleven full weeks, a 4-day
 *      last part week) and every day sits in the row of its weekday; a day
 *      outside the window is an empty gap, not a cell; 84 days ending on a
 *      Sunday are exactly twelve columns.
 *   2. Weekday initials M T W T F S S run down the left; month names sit above
 *      the first column of each month, and the part-week month at the start
 *      is dropped when the next label would collide with it.
 *   3. Trained days are `textSecondary` (ink), other days `surface2`, today a
 *      1.5 dp `textPrimary` outline; the amber token appears nowhere.
 *   4. The legend says "Trained" and "No session" and the word "Rest" appears
 *      nowhere (D166: no rest-day concept).
 *   5. One group label ("Training days over the last 12 weeks, Monday to
 *      Sunday columns. N days trained.", singular for one) and a spoken label
 *      on every cell ("Mon 14 Sep, trained", "Tue 15 Sep, no session",
 *      "today, no session yet").
 *   6. A UK clock-change week renders all seven cells (the 84-day grid once
 *      lost the spring-forward day, audit 2026-08-26 finding 7): the keys come
 *      from `localDayKeysEndingAt`, the shared authority, and the test runs
 *      under TZ=Europe/London (jest.globalSetup).
 *   7. Cells are sized from the window width with `spacing.xs` gaps, between a
 *      floor and a cap, and the grid never wider than the window.
 *
 * `useTheme` is the real `resolveTheme` of a mutable preference object, and
 * `useWindowDimensions` is a spy so the width is the test's own.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { resolveTheme, spacing, radius } from '../../styles/theme';
import { localDayKeysEndingAt } from '../../lib/dayKey';

let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

// The module object itself (not an import * namespace copy), so the spy reaches the component.
const RN = require('react-native');
const TrainingDaysGrid = require('../TrainingDaysGrid').default;
const { buildGrid } = require('../TrainingDaysGrid');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'TrainingDaysGrid.js'), 'utf8');

const host = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
const columnsOf = (tree) => host(tree, (n) => /^week-\d+$/.test(n.props.testID || ''));
const cellsIn = (node) => host({ root: node }, (n) => /^day-/.test(n.props.testID || ''));
const allCells = (tree) => host(tree, (n) => /^day-/.test(n.props.testID || ''));
const cellFor = (tree, key) => host(tree, (n) => n.props.testID === `day-${key}`)[0];
const texts = (tree) => tree.root.findAllByType(RN.Text).map((n) => [].concat(n.props.children).join(''));
const groupOf = (tree) => host(tree, (n) => n.props.testID === 'training-days-grid')[0];

// Local noon of a calendar day, so the key is that day in any zone.
const noon = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
// Thursday 1 October 2026: 84 days ending here start on Friday 10 July.
const THURSDAY_KEYS = localDayKeysEndingAt(84, noon(2026, 10, 1));
const THURSDAY_TODAY = '2026-10-01';

let widthSpy;
beforeEach(() => {
  mockPrefs = {};
  widthSpy = jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({ width: 412, height: 900, scale: 2, fontScale: 1 });
});
afterEach(() => widthSpy.mockRestore());

describe('the layout is Monday-to-Sunday weeks', () => {
  test('84 days ending on a Thursday: thirteen columns, 3 + 77 + 4 cells, the rest empty gaps', () => {
    expect(THURSDAY_KEYS).toHaveLength(84);
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const columns = columnsOf(tree);
    expect(columns).toHaveLength(13);
    const counts = columns.map((c) => cellsIn(c).length);
    expect(counts[0]).toBe(3); // Friday 10 July to Sunday 12 July
    expect(counts.slice(1, 12)).toEqual(Array(11).fill(7));
    expect(counts[12]).toBe(4); // Monday 28 September to Thursday 1 October
    expect(counts.reduce((a, b) => a + b, 0)).toBe(84);
    // Every column still has seven slots; the days outside the window are gaps.
    columns.forEach((c) => expect(c.children).toHaveLength(7));
    expect(columns[0].children.filter((s) => !s.props.testID)).toHaveLength(4);
    expect(columns[12].children.filter((s) => !s.props.testID)).toHaveLength(3);
  });

  test('every day sits in the row of its weekday', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const last = columnsOf(tree)[12];
    const rowOf = (key) => last.children.findIndex((s) => s.props.testID === `day-${key}`);
    expect(rowOf('2026-09-28')).toBe(0); // Monday
    expect(rowOf('2026-10-01')).toBe(3); // Thursday
    expect(last.children[4].props.testID).toBeUndefined(); // Friday is beyond today: a gap
    const first = columnsOf(tree)[0];
    expect(first.children.findIndex((s) => s.props.testID === 'day-2026-07-10')).toBe(4); // Friday
    expect(first.children.findIndex((s) => s.props.testID === 'day-2026-07-12')).toBe(6); // Sunday
  });

  test('84 days ending on a Sunday are exactly twelve full columns', () => {
    const sunday = localDayKeysEndingAt(84, noon(2026, 10, 4));
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={sunday} todayKey="2026-10-04" />);
    const columns = columnsOf(tree);
    expect(columns).toHaveLength(12);
    columns.forEach((c) => expect(cellsIn(c)).toHaveLength(7));
  });

  test('a UK clock-change week renders all seven cells, spring and autumn', () => {
    // Sunday 29 March 2026 (clocks forward) and Sunday 25 October 2026 (back).
    [[noon(2026, 4, 2), '2026-03-29'], [noon(2026, 10, 29), '2026-10-25']].forEach(([endMs, changeDay]) => {
      const keys = localDayKeysEndingAt(84, endMs);
      expect(keys).toContain(changeDay);
      const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={keys} todayKey={keys[83]} />);
      const column = columnsOf(tree).find((c) => cellsIn(c).some((n) => n.props.testID === `day-${changeDay}`));
      expect(cellsIn(column)).toHaveLength(7);
      expect(allCells(tree)).toHaveLength(84);
      // Each calendar day appears exactly once.
      const ids = allCells(tree).map((n) => n.props.testID);
      expect(new Set(ids).size).toBe(84);
    });
  });

  test('the layout is pure and tolerant: any order, bad keys skipped, nothing for no days', () => {
    expect(buildGrid(undefined)).toEqual({ columns: [], monthLabels: [] });
    expect(buildGrid([])).toEqual({ columns: [], monthLabels: [] });
    const shuffled = [...THURSDAY_KEYS].reverse();
    expect(buildGrid(shuffled).columns).toHaveLength(13);
    expect(buildGrid([...THURSDAY_KEYS, 'nope', '2026-13-45', 7, null]).columns.flat().filter(Boolean)).toHaveLength(84);
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={[]} todayKey="2026-10-01" />);
    expect(tree.toJSON()).toBeNull();
  });
});

describe('weekday initials and month names', () => {
  test('M T W T F S S run down the left, in textMuted caption type', () => {
    const t = resolveTheme({});
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const letters = texts(tree).filter((x) => x.length === 1);
    expect(letters).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    tree.root.findAllByType(RN.Text).filter((n) => n.props.children.length === 1).forEach((n) => {
      const style = flat(n.props.style);
      expect(style.color).toBe(t.colors.textMuted);
      expect(style.fontSize).toBe(t.type.caption.fontSize);
    });
  });

  test('a month name sits above the first column that begins in it', () => {
    // Columns begin Mon 6 Jul (shown from Fri 10), 13 Jul, 20 Jul, 27 Jul, 3 Aug ... 7 Sep, ... 28 Sep.
    expect(buildGrid(THURSDAY_KEYS).monthLabels).toEqual([
      { col: 0, text: 'Jul' }, { col: 4, text: 'Aug' }, { col: 9, text: 'Sep' },
    ]);
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const months = texts(tree).filter((x) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(x));
    expect(months).toEqual(['Jul', 'Aug', 'Sep']);
    // Placed by column: left = column index x (cell + gap).
    const slot = host(tree, (n) => n.props.testID === 'month-4')[0];
    expect(flat(slot.props.style)).toMatchObject({ position: 'absolute', left: 4 * (21 + spacing.xs) });
    const aug = tree.root.findAllByType(RN.Text).find((n) => n.props.children === 'Aug');
    expect(flat(aug.props.style).color).toBe(resolveTheme({}).colors.textMuted);
  });

  test('the part-week month at the start is dropped when the next label would collide with it', () => {
    // Starts Wednesday 30 September: column 0 is September, column 1 (Mon 5 Oct) is October.
    const keys = localDayKeysEndingAt(84, noon(2026, 12, 22));
    expect(keys[0]).toBe('2026-09-30');
    const labels = buildGrid(keys).monthLabels;
    expect(labels[0]).toEqual({ col: 1, text: 'Oct' });
    expect(labels.map((l) => l.text)).not.toContain('Sep');
  });
});

describe('colours: ink for a fact, today outlined in ink, no amber', () => {
  const TRAINED = ['2026-09-14', '2026-09-16', '2026-09-28'];

  test('trained days are textSecondary, other days surface2', () => {
    const t = resolveTheme({});
    const tree = create(<TrainingDaysGrid trainedDayKeys={new Set(TRAINED)} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    TRAINED.forEach((key) => expect(flat(cellFor(tree, key).props.style).backgroundColor).toBe(t.colors.textSecondary));
    expect(flat(cellFor(tree, '2026-09-15').props.style).backgroundColor).toBe(t.colors.surface2);
    expect(flat(cellFor(tree, '2026-07-10').props.style).backgroundColor).toBe(t.colors.surface2);
  });

  test('today carries a 1.5 dp textPrimary outline, and only today does', () => {
    const t = resolveTheme({});
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const today = flat(cellFor(tree, THURSDAY_TODAY).props.style);
    expect(today.borderWidth).toBe(1.5);
    expect(today.borderColor).toBe(t.colors.textPrimary);
    const outlined = allCells(tree).filter((n) => flat(n.props.style).borderWidth);
    expect(outlined).toHaveLength(1);
  });

  test('a trained today keeps the outline on its ink fill', () => {
    const t = resolveTheme({});
    const tree = create(<TrainingDaysGrid trainedDayKeys={[THURSDAY_TODAY]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const today = flat(cellFor(tree, THURSDAY_TODAY).props.style);
    expect(today.backgroundColor).toBe(t.colors.textSecondary);
    expect(today.borderColor).toBe(t.colors.textPrimary);
  });

  test('the amber token appears on no cell and no swatch, in dark and in light', () => {
    ['dark', 'light'].forEach((theme) => {
      mockPrefs = { theme };
      const t = resolveTheme(mockPrefs);
      const tree = create(<TrainingDaysGrid trainedDayKeys={new Set(TRAINED)} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
      const used = new Set();
      tree.root.findAll(() => true).forEach((n) => {
        const s = flat(n.props.style);
        ['backgroundColor', 'borderColor', 'color'].forEach((k) => { if (s[k]) used.add(s[k]); });
      });
      expect(used.has(t.colors.primary)).toBe(false);
      expect(used.has(t.colors.primaryFill)).toBe(false);
    });
  });

  test('cells are rounded with radius.xs and sit in columns with spacing.xs gaps', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(flat(cellFor(tree, '2026-09-15').props.style).borderRadius).toBe(radius.xs);
    expect(flat(columnsOf(tree)[1].props.style).gap).toBe(spacing.xs);
  });
});

describe('the legend says Trained and No session, never Rest', () => {
  test('two entries, in that order, with the ink swatch and the surface2 swatch', () => {
    const t = resolveTheme({});
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const legend = texts(tree).filter((x) => x === 'Trained' || x === 'No session');
    expect(legend).toEqual(['Trained', 'No session']);
    const swatches = host(tree, (n) => n.props.testID === 'legend-swatch').map((s) => flat(s.props.style));
    expect(swatches[0].backgroundColor).toBe(t.colors.textSecondary);
    expect(swatches[1].backgroundColor).toBe(t.colors.surface2);
    expect(swatches[1].borderWidth).toBe(1); // the quiet swatch keeps a hairline so it reads on the card
  });

  test('"Rest" is not in the rendered text, the spoken labels or the source', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const spoken = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel);
    [...texts(tree), ...spoken].forEach((s) => expect(s).not.toMatch(/\brest\b/i));
    const copy = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(copy).not.toMatch(/['"`][^'"`\n]*\bRest\b/);
  });
});

describe('accessibility: one group, a spoken label on every cell', () => {
  test('the group label names the window and counts the trained days', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={['2026-09-14', '2026-09-16']} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    const group = groupOf(tree);
    expect(group.props.accessible).toBe(true);
    expect(group.props.accessibilityRole).toBe('image');
    expect(group.props.accessibilityLabel).toBe('Training days over the last 12 weeks, Monday to Sunday columns. 2 days trained.');
    // The grid is the only accessible group besides the legend's own.
    expect(host(tree, (n) => n.props.accessible === true)).toHaveLength(2);
  });

  test('one day is singular and none is zero', () => {
    const one = create(<TrainingDaysGrid trainedDayKeys={['2026-09-14']} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(groupOf(one).props.accessibilityLabel).toMatch(/\. 1 day trained\.$/);
    const none = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(groupOf(none).props.accessibilityLabel).toMatch(/\. 0 days trained\.$/);
  });

  test('trained keys outside the window are not counted', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={['2020-01-01', '2026-09-14']} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(groupOf(tree).props.accessibilityLabel).toMatch(/\. 1 day trained\.$/);
  });

  test('every cell says its day and whether it was trained', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={['2026-09-14']} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(cellFor(tree, '2026-09-14').props.accessibilityLabel).toBe('Mon 14 Sep, trained');
    expect(cellFor(tree, '2026-09-15').props.accessibilityLabel).toBe('Tue 15 Sep, no session');
    expect(cellFor(tree, THURSDAY_TODAY).props.accessibilityLabel).toBe('today, no session yet');
    expect(cellFor(tree, '2026-07-12').props.accessibilityLabel).toBe('Sun 12 Jul, no session');
    allCells(tree).forEach((n) => expect(n.props.accessibilityLabel).toMatch(/^(today|(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}), (trained|no session( yet)?)$/));
  });

  test('a trained today says so', () => {
    const tree = create(<TrainingDaysGrid trainedDayKeys={[THURSDAY_TODAY]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(cellFor(tree, THURSDAY_TODAY).props.accessibilityLabel).toBe('today, trained');
  });
});

describe('cells are sized from the window width', () => {
  const cellWidth = (width) => {
    widthSpy.mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    return flat(cellFor(tree, '2026-09-15').props.style).width;
  };

  test('412 dp gives 21, 360 dp gives 17, and the grid fits inside the window minus its chrome', () => {
    expect(cellWidth(412)).toBe(21);
    expect(cellWidth(360)).toBe(17);
    [412, 390, 360, 320].forEach((w) => {
      const cell = cellWidth(w);
      const gridWidth = 16 + 4 + 13 * cell + 12 * 4;
      expect(gridWidth).toBeLessThanOrEqual(w - 64);
    });
  });

  test('a floor and a cap hold at the extremes', () => {
    expect(cellWidth(200)).toBe(10);
    expect(cellWidth(1200)).toBe(24);
  });

  test('every slot in a column is the same size, gaps included', () => {
    widthSpy.mockReturnValue({ width: 412, height: 900, scale: 2, fontScale: 1 });
    const tree = create(<TrainingDaysGrid trainedDayKeys={[]} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    columnsOf(tree)[0].children.forEach((slot) => {
      const s = flat(slot.props.style);
      expect(s.width).toBe(21);
      expect(s.height).toBe(21);
    });
  });
});

describe('the colours are live, never frozen', () => {
  test('a light theme changes the cell and the legend colours', () => {
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    const tree = create(<TrainingDaysGrid trainedDayKeys={['2026-09-14']} dayKeys={THURSDAY_KEYS} todayKey={THURSDAY_TODAY} />);
    expect(flat(cellFor(tree, '2026-09-14').props.style).backgroundColor).toBe(light.colors.textSecondary);
    expect(flat(cellFor(tree, '2026-09-15').props.style).backgroundColor).toBe(light.colors.surface2);
    expect(flat(cellFor(tree, THURSDAY_TODAY).props.style).borderColor).toBe(light.colors.textPrimary);
  });
});

describe('source guards', () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('no raw hex or rgba literal, and no amber', () => {
    expect(code).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
    expect(code).not.toMatch(/rgba?\(/);
    expect(code).not.toMatch(/colors\.primary|\.primary\b|primaryFill|primaryBg/);
  });

  test('dates come from dayKey.js, never new Date(isoString)', () => {
    expect(code).toMatch(/civilDayOrdinal/);
    expect(code).toMatch(/parseLocalDay/);
    expect(code).not.toMatch(/new Date\(/);
  });

  test('the cells are sized through useWindowDimensions', () => {
    expect(code).toMatch(/useWindowDimensions\(\)/);
  });
});
