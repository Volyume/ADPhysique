/**
 * MacroBreakdownSheet, the planned-food line and the heading (D230 food
 * level-up, R3).
 *
 * What this suite pins, and why:
 *  - The Diary's rings card no longer carries the standing line "Planned
 *    means added ahead..." (explanation is on demand). Its on-demand home is
 *    THIS sheet, which the rings card opens: when the caller says the day
 *    holds planned (unconfirmed) food (`hasPlanned`), the sheet shows ONE
 *    quiet line, "Planned food is added ahead. It counts once you mark it as
 *    eaten." When it does not, the line is absent (a day with no planned food
 *    has nothing to explain, and the sheet must not nag).
 *  - The line appears once, never twice, and the sheet title is a screen-reader
 *    heading.
 *  - The sheet's own maths and rows are the pure `mealBreakdown` (pinned in
 *    MacroBreakdownSheet.test.js); this file only adds the chrome.
 *
 * Kept apart from MacroBreakdownSheet.test.js because that suite stubs the
 * store to render nothing; these tests mount the sheet.
 */
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import { create, act } from 'react-test-renderer';
import MacroBreakdownSheet from '../MacroBreakdownSheet';

const LINE = 'Planned food is added ahead. It counts once you mark it as eaten.';
const entries = [
  { meal_slot: 'breakfast', kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10 },
  { meal_slot: 'dinner', kcal: 600, protein_g: 40, carbs_g: 50, fat_g: 20 },
];

function mount(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <MacroBreakdownSheet visible entries={entries} dateLabel="Friday 16 October" onClose={() => {}} {...props} />,
    );
  });
  return tree;
}

function texts(tree) {
  return tree.root.findAll((n) => n.type === 'Text').map((n) =>
    [].concat(n.props.children ?? []).map((k) => (typeof k === 'string' || typeof k === 'number' ? String(k) : '')).join(''));
}

describe('MacroBreakdownSheet planned line (R3)', () => {
  test('shows the one quiet line when the day has planned food', () => {
    const tree = mount({ hasPlanned: true });
    expect(texts(tree).filter((t) => t === LINE)).toHaveLength(1);
  });

  test('is absent when the day has no planned food', () => {
    expect(texts(mount({ hasPlanned: false })).join(' | ')).not.toContain('Planned food is added ahead');
  });

  test('is absent by default (the prop is opt-in, so an unaware caller never shows it)', () => {
    expect(texts(mount()).join(' | ')).not.toContain('Planned food is added ahead');
  });

  test('the line sits above the meal rows', () => {
    const all = texts(mount({ hasPlanned: true }));
    expect(all.indexOf(LINE)).toBeGreaterThan(-1);
    expect(all.indexOf(LINE)).toBeLessThan(all.indexOf('Breakfast'));
  });

  test('is a full sentence pair in British English with no dash', () => {
    expect(LINE).not.toMatch(/[–—]/);
    expect(LINE).toMatch(/^[A-Z].*\.\s[A-Z].*\.$/);
  });
});

describe('MacroBreakdownSheet heading (R16)', () => {
  test('the title "By meal" is a heading', () => {
    const tree = mount();
    const heads = tree.root.findAll((n) => n.type === 'Text' && n.props.accessibilityRole === 'header');
    expect(heads.map((h) => [].concat(h.props.children).join(''))).toEqual(['By meal']);
  });
});
