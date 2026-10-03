/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md, F-24 and P20): Home's "Last session" row names the unit the
 * person trains in.
 *
 * Gym weight is stored in the user's display unit (kg or lbs) and is never
 * converted (algorithms.js, the unit rule on calculateTonnage). The row
 * printed the literal "kg lifted" for everyone, so a person training in
 * pounds saw their total, in pounds, labelled kilograms, while the Summary
 * hero, History, the share card and Consistency all used the unit.
 *
 * Pinned here: both branches of the total (the stored `totalVolume` and the
 * computed tonnage fallback) print `lbs lifted` for units 'lbs' and `kg
 * lifted` otherwise (kg, no prop, an unknown value); the NUMBER is never
 * converted; the rest of the meta line (duration, sets) is unchanged.
 */
import { create, act } from 'react-test-renderer';
import HomeLastSessionCard from '../HomeLastSessionCard';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function metaLine({ lastSession, lastSessionTonnage = null, units }) {
  let tree;
  const props = {
    lastSession, lastSessionTonnage, relativeDay: 'yesterday', onOpenHistory: jest.fn(), onRepeat: jest.fn(),
  };
  if (units !== undefined) props.units = units;
  act(() => { tree = create(<HomeLastSessionCard {...props} />); });
  return flattenText(tree.toJSON());
}

const STORED = {
  id: 'w1', routineName: 'Push', durationMinutes: 52, setCount: 20, totalVolume: 12345.4,
};
const COMPUTED = {
  id: 'w2', routineName: 'Pull', durationMinutes: 48, setCount: 18, totalVolume: null,
};

describe('D218 (F-24, P20): the Last session row labels its total with the unit the person trains in', () => {
  test('the stored total in pounds reads "lbs lifted", the number untouched', () => {
    const text = metaLine({ lastSession: STORED, units: 'lbs' });
    expect(text).toContain('52m - 20 sets - 12,345 lbs lifted');
    expect(text).not.toContain('kg lifted');
  });

  test('the stored total in kilograms reads "kg lifted"', () => {
    const text = metaLine({ lastSession: STORED, units: 'kg' });
    expect(text).toContain('52m - 20 sets - 12,345 kg lifted');
    expect(text).not.toContain('lbs');
  });

  test('the computed tonnage fallback is labelled the same way', () => {
    const lbs = metaLine({ lastSession: COMPUTED, lastSessionTonnage: 9800.2, units: 'lbs' });
    expect(lbs).toContain('48m - 18 sets - 9,800 lbs lifted');
    const kg = metaLine({ lastSession: COMPUTED, lastSessionTonnage: 9800.2, units: 'kg' });
    expect(kg).toContain('48m - 18 sets - 9,800 kg lifted');
  });

  test('no units prop, or a value that is not "lbs", falls back to kg (the app default), never a blank label', () => {
    expect(metaLine({ lastSession: STORED })).toContain('12,345 kg lifted');
    expect(metaLine({ lastSession: STORED, units: 'stone' })).toContain('12,345 kg lifted');
    expect(metaLine({ lastSession: COMPUTED, lastSessionTonnage: 500 })).toContain('500 kg lifted');
  });

  test('with no total at all the line carries no unit and no "lifted" word', () => {
    const text = metaLine({ lastSession: COMPUTED, lastSessionTonnage: null, units: 'lbs' });
    expect(text).toContain('48m - 18 sets');
    expect(text).not.toMatch(/lifted/);
  });
});

describe('review of D218 (NIT 15): the recomputed total wins over the stored one', () => {
  test('a recomputed total (History\'s basis) replaces a stored figure that counted distance metres', () => {
    const text = metaLine({ lastSession: STORED, lastSessionTonnage: 9800.2, units: 'kg' });
    expect(text).toContain('9,800 kg lifted');
    expect(text).not.toContain('12,345');
  });

  test('a recomputed 0 (nothing loaded) shows no total, never the stored metres', () => {
    const text = metaLine({ lastSession: STORED, lastSessionTonnage: 0, units: 'kg' });
    expect(text).toContain('52m - 20 sets');
    expect(text).not.toMatch(/lifted/);
  });

  test('with no recomputed total the stored figure stands', () => {
    expect(metaLine({ lastSession: STORED, lastSessionTonnage: null, units: 'kg' })).toContain('12,345 kg lifted');
  });
});
