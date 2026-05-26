/**
 * Mount + snapshot tests for the four new src/components/food/
 * components added per UI_FLOWS_LOCKED.md lines 18-28:
 *   - EmptyDiary
 *   - SourceChip
 *   - HeldDecisionCard
 *   - ServingPicker
 *
 * Also locks the EmptyDiary copy to the exact spec string
 * (UI_FLOWS_LOCKED.md line 275) so any future drift breaks here.
 */
import React from 'react';
import { create } from 'react-test-renderer';

import EmptyDiary, { EMPTY_DIARY_COPY } from '../EmptyDiary';
import SourceChip from '../SourceChip';
import HeldDecisionCard from '../HeldDecisionCard';
import ServingPicker from '../ServingPicker';

describe('EmptyDiary', () => {
  test('renders the spec copy verbatim', () => {
    expect(EMPTY_DIARY_COPY).toBe(
      "No food logged yet. Tap a meal slot above to start. Or use Scan to grab something from a barcode."
    );
    const tree = create(<EmptyDiary />).toJSON();
    expect(JSON.stringify(tree)).toContain(EMPTY_DIARY_COPY);
  });
});

describe('SourceChip', () => {
  test.each([
    ['off',      'OFF'],
    ['usda',     'USDA'],
    ['cofid',    'CoFID'],
    ['user_ocr', 'OCR'],
    ['custom',   'Custom'],
  ])('source %s renders label %s', (source, label) => {
    const tree = create(<SourceChip source={source} />).toJSON();
    expect(JSON.stringify(tree)).toContain(label);
  });
});

describe('HeldDecisionCard', () => {
  test('renders body + amber badge', () => {
    const tree = create(<HeldDecisionCard type="ffm_floor" body="We held your cut." />).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('Held this week');
    expect(txt).toContain('We held your cut.');
  });

  test('shows Get support button only for ed_pattern type', () => {
    const ed = create(<HeldDecisionCard type="ed_pattern" body="x" />).toJSON();
    expect(JSON.stringify(ed)).toContain('Get support');
    const fm = create(<HeldDecisionCard type="ffm_floor" body="x" />).toJSON();
    expect(JSON.stringify(fm)).not.toContain('Get support');
  });

  test('Why? link present only when onWhy provided', () => {
    const without = create(<HeldDecisionCard type="ffm_floor" body="x" />).toJSON();
    expect(JSON.stringify(without)).not.toContain('Why?');
    const with_ = create(<HeldDecisionCard type="ffm_floor" body="x" onWhy={() => {}} />).toJSON();
    expect(JSON.stringify(with_)).toContain('Why?');
  });
});

describe('ServingPicker', () => {
  test('renders quantity + units', () => {
    const tree = create(
      <ServingPicker quantity="150" unit="g" onChangeQuantity={() => {}} onChangeUnit={() => {}} />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('150');
    expect(txt).toContain('"g"');
    expect(txt).toContain('"oz"');
  });

  test('accepts custom unit list', () => {
    const tree = create(
      <ServingPicker
        quantity="1"
        unit="slice"
        units={['slice', 'cup']}
        onChangeQuantity={() => {}}
        onChangeUnit={() => {}}
      />
    ).toJSON();
    const txt = JSON.stringify(tree);
    expect(txt).toContain('slice');
    expect(txt).toContain('cup');
  });
});
