/**
 * Progress-tab audit 2026-09-24 (F4/F5, D200 item 3), lane E, ruling 3.
 *
 * P5: one load surface on Consistency. The plan card's sparkline stays the
 * picture (its value captioned "this week so far"); WorkloadCard becomes
 * the explanation of the SAME number, retitled "Weekly load" so the two
 * cards read as one story instead of two disagreeing ones ("Weekly load"
 * vs "Training load"). Pins the new title, subtitle, stat labels, tooltip
 * and status copy, plus the session-length trend's "so far" qualifier on
 * its current bar.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../InfoTooltip', () => {
  const { Text: RNText } = require('react-native');
  return ({ text }) => <RNText>{text}</RNText>;
});
jest.mock('../SvgBarSparkline', () => () => null);

import { MesocyclePulseCard, WorkloadCard, SessionDurationChart } from '../ProgressSections';

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}

describe('MesocyclePulseCard: the sparkline value is captioned "this week so far"', () => {
  const meso = { name: 'Push Pull Legs', durationWeeks: 6, focus: 'Hypertrophy' };
  const tonnageBars = [
    { value: 400, label: '-3w', color: '#999' },
    { value: 450, label: '-2w', color: '#999' },
    { value: 480, label: '-1w', color: '#999' },
    { value: 500, label: 'Now', color: '#f00' },
  ];

  test('the label stays "Weekly load"; the value carries a "this week so far" caption', () => {
    const tree = create(
      <MesocyclePulseCard meso={meso} currentWeek={2} progress={0.2} tonnageBars={tonnageBars} onPress={() => {}} onBuild={() => {}} />,
    );
    const all = texts(tree);
    expect(all).toContain('Weekly load');
    expect(all).toContain('500 kg');
    expect(all).toContain('this week so far');
  });

  test('no sparkline at all (every bar zero) renders neither the label nor the caption', () => {
    const zeroBars = tonnageBars.map((b) => ({ ...b, value: 0 }));
    const tree = create(
      <MesocyclePulseCard meso={meso} currentWeek={2} progress={0.2} tonnageBars={zeroBars} onPress={() => {}} onBuild={() => {}} />,
    );
    expect(texts(tree)).not.toContain('this week so far');
  });
});

describe('WorkloadCard: retitled "Weekly load", explaining the sparkline\'s own number', () => {
  const data = { acute: 12450, chronic: 10200, ratio: 1.22, weeksOfData: 4 };

  test('title, subtitle and stat labels', () => {
    const tree = create(<WorkloadCard data={data} />);
    const all = texts(tree);
    expect(all).toContain('Weekly load');
    expect(all).not.toContain('Training load');
    expect(all).toContain('This week so far against your recent full weeks');
    expect(all).toContain('vs recent average');
    expect(all).toContain('This week so far (kg)');
    expect(all).toContain('4-wk average (kg)');
    expect(all).not.toContain('4-wk avg (kg)');
  });

  test('the tooltip explains the comparison in the new wording, with the real weeks count', () => {
    const tree = create(<WorkloadCard data={data} />);
    expect(texts(tree)).toContain(
      'Compares this week so far (Monday to today) with your average over the previous 4 full weeks. '
      + '0.8 to 1.3 is the helpful range. Above 1.5 signals high fatigue risk.',
    );
  });

  test('a 2-week baseline reads "previous 2 full weeks" in the tooltip, singular-safe grammar', () => {
    const tree = create(<WorkloadCard data={{ acute: 5000, chronic: 4000, ratio: 1.25, weeksOfData: 2 }} />);
    expect(texts(tree)).toContain(
      'Compares this week so far (Monday to today) with your average over the previous 2 full weeks. '
      + '0.8 to 1.3 is the helpful range. Above 1.5 signals high fatigue risk.',
    );
  });

  test('the high-load status line says "this week so far", not "this week"', () => {
    const tree = create(<WorkloadCard data={{ acute: 20000, chronic: 10000, ratio: 2.0, weeksOfData: 4 }} />);
    const all = texts(tree);
    expect(all).toContain('High load this week so far (above 1.5). Consider an easier session.');
    expect(all.some((t) => t.includes('High load this week ('))).toBe(false);
  });

  test('the takeaway line reads "This week so far", matching chartWindows.workloadTakeaway', () => {
    const tree = create(<WorkloadCard data={data} />);
    expect(texts(tree)).toContain('This week so far: 12,450 kg against a 4-week average of 10,200 kg.');
  });

  test('still returns nothing when there is not enough data (ratio null), unchanged', () => {
    expect(create(<WorkloadCard data={null} />).toJSON()).toBeNull();
    expect(create(<WorkloadCard data={{ acute: 0, chronic: 100, ratio: null, weeksOfData: 2 }} />).toJSON()).toBeNull();
  });
});

describe('SessionDurationChart: the current bar reads "so far" too', () => {
  const bars = [
    { avgMin: 50, weekLabel: 'W1', sessionCount: 1 },
    { avgMin: 45, weekLabel: 'W2', sessionCount: 1 },
    { avgMin: 0, weekLabel: 'W3', sessionCount: 0 },
    { avgMin: 55, weekLabel: 'W4', sessionCount: 1 },
    { avgMin: 60, weekLabel: 'W5', sessionCount: 1 },
    { avgMin: 40, weekLabel: 'Now', sessionCount: 1 },
  ];

  test('the "Now" bar carries a "so far" caption; the full weeks do not', () => {
    const tree = create(<SessionDurationChart bars={bars} />);
    const all = texts(tree);
    expect(all).toContain('Now');
    expect(all).toContain('so far');
    expect(all).not.toContain('W1 so far');
    // Exactly one "so far" caption, next to the one current-week bar.
    expect(all.filter((t) => t === 'so far')).toHaveLength(1);
  });
});
