/**
 * ProgressSections: the Consistency cards' words and figures.
 *
 * Progress-tab audit 2026-09-24 (F4/F5, D200 item 3), lane E, ruling 3 pinned
 * ONE load surface: the plan card's sparkline plus a "Weekly load" ratio card
 * explaining the same number, and the D204 rule that the load line describes and
 * never tells the athlete to change a session.
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 items 3, 4, 6 and 7). Those two cards are
 * ONE card now, and this file pins its replacements:
 *   - LoadCard (CS-1, CS-6): "9,598 kg lifted so far this week" in the
 *     person's own unit (the "kg" was hard-coded for a pounds user), four
 *     labelled bars, the like-for-like D204 sentence ("In line with recent
 *     weeks at this point") in place of the ratio of a part week to full ones,
 *     and "4-week average: 16,406 kg" named with its true count. The ratio,
 *     its bar scale and the second card are gone.
 *   - BlockCard (CS-5, CS-7): the plan card, the block shape and the effort
 *     line as one card; "Week 2 of 6" for the line and the bar from ONE M, no
 *     percent anywhere; "This week's effort: 3 of 5" with its (i).
 *   - typicalSessionsLine (CS-11): the one sessions line that replaces the
 *     session length chart and its fatigue inference.
 *   - TrainingDaysSection (CS-13, CS-21): the labelled grid and its caption,
 *     "Trained" and "No session", never "Rest" (D166).
 * D204 still holds on every line: the plan sets the sessions, these cards say
 * what happened.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../InfoTooltip', () => {
  const { Text: RNText } = require('react-native');
  return ({ text }) => <RNText>{text}</RNText>;
});
jest.mock('../Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);

import {
  BlockCard, LoadCard, TrainingDaysSection, typicalSessionsLine, trainingDaysCaption, blockEffort,
} from '../ProgressSections';
import { GLOSSARY } from '../../lib/coachGlossary';
import { localDayKey, localDayKeysEndingAt } from '../../lib/dayKey';

const plain = (s) => String(s).replace(/ /g, ' ');
function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => plain([].concat(n.props.children).join('')));
}

describe('LoadCard: one load card in the person\'s units, compared like for like (CS-1, CS-6)', () => {
  const bars = [
    { value: 12100, label: '-3w' },
    { value: 14300, label: '-2w' },
    { value: 16000, label: '-1w' },
    { value: 9598, label: 'Now' },
  ];
  const comparison = { current: 9598, expected: 9400, ratio: 1.02, comparison: 'in_line', weeksOfData: 3 };
  const average = { acute: 9598, chronic: 16406, ratio: 0.59, weeksOfData: 4 };

  test('the headline says what the figure is, with the person\'s unit', () => {
    const kg = texts(create(<LoadCard bars={bars} unit="kg" comparison={comparison} average={average} />));
    expect(kg).toContain('9,598 kg lifted so far this week');
    const lbs = texts(create(<LoadCard bars={bars} unit="lbs" comparison={comparison} average={average} />));
    expect(lbs).toContain('9,598 lbs lifted so far this week');
    expect(lbs.join(' | ')).not.toMatch(/\bkg\b/);
  });

  test('a pounds user never reads "kg" anywhere on the card, tooltip and spoken label included (CS-1)', () => {
    const tree = create(<LoadCard bars={bars} unit="lbs" comparison={comparison} average={average} />);
    expect(texts(tree).join(' | ')).not.toMatch(/\bkg\b/i);
    const spoken = tree.root.findAll((n) => n.props.accessibilityRole === 'image')[0].props.accessibilityLabel;
    expect(plain(spoken)).toContain('this week so far 9,598 lbs');
    expect(plain(spoken)).not.toMatch(/\bkg\b/i);
  });

  test('four labelled bars: three full weeks and this week "so far"', () => {
    const all = texts(create(<LoadCard bars={bars} unit="kg" comparison={comparison} average={average} />));
    for (const label of ['3 weeks ago', '2 weeks ago', 'Last week', 'This week', 'so far']) {
      expect(all).toContain(label);
    }
    // Exactly one "so far" caption, under the one open week.
    expect(all.filter((t) => t === 'so far')).toHaveLength(1);
    for (const value of ['12,100', '14,300', '16,000', '9,598']) expect(all).toContain(value);
  });

  test('the comparison is the D204 like-for-like sentence, never the ratio', () => {
    const lines = {
      in_line: 'In line with recent weeks at this point',
      above: 'Above recent weeks at this point',
      below: 'Below recent weeks at this point',
    };
    for (const [key, line] of Object.entries(lines)) {
      const all = texts(create(<LoadCard bars={bars} unit="kg" comparison={{ ...comparison, comparison: key }} average={average} />));
      expect(all).toContain(line);
    }
    const all = texts(create(<LoadCard bars={bars} unit="kg" comparison={comparison} average={average} />)).join(' | ');
    expect(all).not.toMatch(/vs recent average|0\.59|0\.\d\d|against a|This week so far \(kg\)|Weekly load/);
  });

  test('"N-week average" names the real count and the unit', () => {
    expect(texts(create(<LoadCard bars={bars} unit="kg" comparison={comparison} average={average} />)))
      .toContain('4-week average: 16,406 kg');
    expect(texts(create(<LoadCard bars={bars} unit="lbs" comparison={comparison} average={{ ...average, weeksOfData: 2 }} />)))
      .toContain('2-week average: 16,406 lbs');
  });

  test('it hides the comparison rather than comparing against nothing, and keeps the figure', () => {
    const none = { current: 9598, expected: null, ratio: null, comparison: null, weeksOfData: 1 };
    const all = texts(create(<LoadCard bars={bars} unit="kg" comparison={none} average={null} />));
    expect(all).toContain('9,598 kg lifted so far this week');
    // (The (i)'s own explanation names both ideas; the card's lines do not.)
    const lines = all.filter((t) => !t.startsWith('The total weight you lifted'));
    expect(lines.join(' | ')).not.toMatch(/recent weeks at this point|average/);
    expect(texts(create(<LoadCard bars={bars} unit="kg" comparison={null} average={null} />))).toContain('9,598 kg lifted so far this week');
  });

  test('no tonnage in the four weeks renders no card', () => {
    expect(create(<LoadCard bars={bars.map((b) => ({ ...b, value: 0 }))} unit="kg" />).toJSON()).toBeNull();
    expect(create(<LoadCard bars={[]} unit="kg" />).toJSON()).toBeNull();
    expect(create(<LoadCard unit="kg" />).toJSON()).toBeNull();
  });

  test('the (i) says it describes, names the like-for-like rule and its real bounds (D204)', () => {
    const tip = texts(create(<LoadCard bars={bars} unit="kg" comparison={comparison} average={average} />))
      .find((t) => t.startsWith('The total weight you lifted'));
    expect(tip).toContain('the same days and the same time of day in each of your last three weeks, so a part week is never set against full ones');
    expect(tip).toContain('In line means between 20% under and 30% over the average of those weeks at this point');
    expect(tip).toContain('Your plan sets each session; this is a picture of how the load is moving across the block, not an instruction.');
    expect(tip).not.toMatch(/easier session|Consider|Monitor how you feel|Room for more work|fatigue risk|helpful range/i);
  });

  test('the status line never tells the athlete to change a session, whichever way the week sits (D204)', () => {
    for (const key of ['above', 'in_line', 'below']) {
      const all = texts(create(<LoadCard bars={bars} unit="kg" comparison={{ ...comparison, comparison: key }} average={average} />));
      const line = all.find((t) => /at this point$/.test(t));
      expect(line).toBeTruthy();
      expect(line).not.toMatch(/easier|harder|consider|should|try|aim|monitor|rest|lighter|push/i);
    }
  });
});

describe('BlockCard: one block card, one total, no percent (CS-5, CS-7)', () => {
  const meso = { name: 'Upper Lower 4-Day', durationWeeks: 8, focus: 'hypertrophy' };

  test('the plan name, the bar labelled "Week 2 of 6" from the block\'s ONE total, no percent', () => {
    const tree = create(<BlockCard meso={meso} weekIndex={2} plannedWeeks={6} rirTarget={2} onPress={() => {}} onBuild={() => {}} />);
    const all = texts(tree);
    expect(all).toContain('Upper Lower 4-Day');
    expect(all).toContain('Week 2 of 6');
    // The plan row's own durationWeeks (8) is never printed: one M.
    expect(all.join(' | ')).not.toMatch(/of 8|%|complete/);
    const bar = tree.root.findByProps({ accessibilityRole: 'progressbar' });
    expect(bar.props.accessibilityLabel).toBe('Week 2 of 6');
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 6, now: 2, text: 'Week 2 of 6' });
  });

  test('the first week reads "Week 1 of 6", not "0% complete", and the last reads "Week 6 of 6", not "100%"', () => {
    const first = texts(create(<BlockCard meso={meso} weekIndex={1} plannedWeeks={6} rirTarget={3} />));
    expect(first).toContain('Week 1 of 6');
    const last = texts(create(<BlockCard meso={meso} weekIndex={6} plannedWeeks={6} rirTarget={4} />));
    expect(last).toContain('Week 6 of 6');
    expect(first.concat(last).join(' | ')).not.toMatch(/%/);
  });

  test('"This week\'s effort: 3 of 5" with the glossary\'s (i)', () => {
    const all = texts(create(<BlockCard meso={meso} weekIndex={2} plannedWeeks={6} rirTarget={2} />));
    expect(all).toContain("This week's effort: 3 of 5");
    expect(all).toContain(GLOSSARY.effort);
  });

  test('effort is 5 minus the rep target, clamped to 0 to 5, and absent without a target', () => {
    expect(blockEffort(2)).toBe(3);
    expect(blockEffort(0)).toBe(5);
    expect(blockEffort(4)).toBe(1);
    expect(blockEffort(9)).toBe(0);
    expect(blockEffort(-2)).toBe(5);
    expect(blockEffort(null)).toBeNull();
    expect(blockEffort(undefined)).toBeNull();
    expect(blockEffort('x')).toBeNull();
    const none = texts(create(<BlockCard meso={meso} weekIndex={2} plannedWeeks={6} rirTarget={null} />));
    expect(none.some((t) => t.startsWith("This week's effort"))).toBe(false);
  });

  test('a finished block claims no live week and no effort (Stage 1)', () => {
    const tree = create(<BlockCard meso={meso} weekIndex={6} plannedWeeks={6} rirTarget={4} finished />);
    const all = texts(tree);
    expect(all).toContain('Block finished');
    expect(all.join(' | ')).not.toMatch(/Week \d+ of \d+|effort/);
    expect(tree.root.findByProps({ accessibilityRole: 'progressbar' }).props.accessibilityValue).toMatchObject({ now: 6, max: 6 });
  });

  test('an adaptive adjustment keeps the module\'s own words and the card never calls it a recovery week', () => {
    const note = 'Training is lighter for now. Your recent recovery has been harder, so your coach is holding back some of the workload for now.';
    const all = texts(create(<BlockCard meso={meso} weekIndex={3} plannedWeeks={6} rirTarget={4} note={note} />));
    expect(all).toContain(note);
    expect(all.join(' | ')).not.toMatch(/recovery week/i);
  });

  test('tapping the name row opens the block, as before', () => {
    const onPress = jest.fn();
    const tree = create(<BlockCard meso={meso} weekIndex={2} plannedWeeks={6} rirTarget={2} onPress={onPress} />);
    const open = tree.root.findByProps({ accessibilityHint: 'Opens training block' });
    expect(open.props.accessibilityLabel).toBe('Upper Lower 4-Day, Week 2 of 6');
    open.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('a plan with no block yet shows its name and no bar; no plan at all offers the library', () => {
    const planOnly = create(<BlockCard meso={{ name: 'Push Pull Legs', _isPlan: true, splitType: 'Push Pull Legs' }} />);
    expect(texts(planOnly)).toContain('Push Pull Legs');
    expect(planOnly.root.findAllByProps({ accessibilityRole: 'progressbar' })).toHaveLength(0);

    const onBuild = jest.fn();
    const none = create(<BlockCard meso={null} onBuild={onBuild} />);
    expect(texts(none)).toContain('No plan running yet');
    expect(texts(none)).toContain('Browse plans');
  });
});

describe('typicalSessionsLine: the one sessions line (CS-11)', () => {
  test('"Sessions usually last about 57 minutes."', () => {
    expect(typicalSessionsLine(57)).toBe('Sessions usually last about 57 minutes.');
    expect(typicalSessionsLine(56.6)).toBe('Sessions usually last about 57 minutes.');
    expect(typicalSessionsLine(1)).toBe('Sessions usually last about 1 minute.');
  });
  test('nothing to state, nothing printed', () => {
    for (const v of [null, undefined, 0, -3, NaN, 'x']) expect(typicalSessionsLine(v)).toBeNull();
  });
  test('it infers no state from the minutes (voice doc, pattern 3)', () => {
    expect(typicalSessionsLine(40)).not.toMatch(/fatigue|shorter|longer|steady|tired/i);
  });
});

describe('TrainingDaysSection: the labelled grid and its caption, never "Rest" (CS-13, CS-21, D166)', () => {
  const dayKeys = localDayKeysEndingAt(84);

  test('the legend names "Trained" and "No session", and "Rest" appears nowhere', () => {
    const tree = create(<TrainingDaysSection trainedDayKeys={dayKeys.slice(-10)} firstSessionAt={Date.now() - 200 * 86400000} />);
    const all = texts(tree);
    expect(all).toContain('Trained');
    expect(all).toContain('No session');
    expect(all.join(' | ')).not.toMatch(/\brest\b/i);
  });

  test('the grid is one labelled group with per-cell labels, and only keys in the window count', () => {
    const tree = create(<TrainingDaysSection trainedDayKeys={[...dayKeys.slice(-4), '2001-01-01']} firstSessionAt={null} />);
    const grid = tree.root.findByProps({ testID: 'training-days-grid' });
    expect(grid.props.accessibilityLabel).toContain('4 days trained');
    expect(texts(tree).some((t) => t.startsWith('4 days trained in the last 12 weeks'))).toBe(true);
    expect(tree.root.findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('day-')).length).toBeGreaterThanOrEqual(84);
  });

  test('today is the grid\'s own outlined cell, keyed on the local day', () => {
    const tree = create(<TrainingDaysSection trainedDayKeys={[]} />);
    const today = tree.root.findAllByProps({ testID: `day-${localDayKey(Date.now())}` });
    expect(today.length).toBeGreaterThan(0);
  });
});

describe('trainingDaysCaption: "51 days trained in the last 12 weeks · about 4 a week"', () => {
  const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
  const DAY = 86400000;

  test('the plan\'s own example', () => {
    expect(trainingDaysCaption({ trainedDays: 51, firstSessionAt: NOW - 200 * DAY, now: NOW }))
      .toBe('51 days trained in the last 12 weeks · about 4 a week');
  });

  test('a singular day, and a rate that rounds to nothing is left out', () => {
    expect(trainingDaysCaption({ trainedDays: 1, firstSessionAt: NOW - 200 * DAY, now: NOW }))
      .toBe('1 day trained in the last 12 weeks');
    expect(trainingDaysCaption({ trainedDays: 5, firstSessionAt: NOW - 200 * DAY, now: NOW }))
      .toBe('5 days trained in the last 12 weeks');
    // Under one a week there is no "about 1 a week" to claim; from one, there is.
    expect(trainingDaysCaption({ trainedDays: 11, firstSessionAt: NOW - 200 * DAY, now: NOW }))
      .toBe('11 days trained in the last 12 weeks');
    expect(trainingDaysCaption({ trainedDays: 12, firstSessionAt: NOW - 200 * DAY, now: NOW }))
      .toBe('12 days trained in the last 12 weeks · about 1 a week');
  });

  test('a person with under twelve weeks of history is not divided by twelve', () => {
    // First session 6 weeks ago, 18 days trained: 3 a week, not "about 2".
    expect(trainingDaysCaption({ trainedDays: 18, firstSessionAt: NOW - 41 * DAY, now: NOW }))
      .toBe('18 days trained in the last 12 weeks · about 3 a week since your first session');
    // Under four weeks of history: no rate at all.
    expect(trainingDaysCaption({ trainedDays: 6, firstSessionAt: NOW - 10 * DAY, now: NOW }))
      .toBe('6 days trained in the last 12 weeks');
  });

  test('an unknown first session reads as the full window', () => {
    expect(trainingDaysCaption({ trainedDays: 51, firstSessionAt: null, now: NOW }))
      .toBe('51 days trained in the last 12 weeks · about 4 a week');
  });

  test('no streak, no countdown, no instruction in any variant', () => {
    for (const n of [0, 1, 18, 51]) {
      const c = trainingDaysCaption({ trainedDays: n, firstSessionAt: NOW - 200 * DAY, now: NOW });
      expect(c).not.toMatch(/streak|in a row|keep|miss|rest|goal|aim|try/i);
    }
  });
});
