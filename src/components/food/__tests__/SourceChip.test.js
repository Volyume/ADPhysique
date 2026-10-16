/**
 * SourceChip: the one source vocabulary (D230 R15, food level-up 2026-10-16).
 *
 * Pins three truths.
 *  1. The seven sources print the seven words the add screen's FoodRow prints
 *     ("Food Facts", "CoFID", "USDA", "From a label", "Yours", "Volyume",
 *     "Recipe"), word for word: the chip is compared with FoodRow's exported
 *     SOURCE_LABEL, so the two cannot drift into two spellings again (they
 *     had: "OFF" and "OCR" on one, "Food Facts" and "Snapped" on the other).
 *  2. A source the chip does not know prints NOTHING. It used to fall back to
 *     the raw key in capitals ("CURATE", "RECIPE"), which read as a system
 *     code. No label, no tooltip, no empty box.
 *  3. CoFID keeps its verified treatment and its "what is CoFID?" gloss, and
 *     every known source carries a plain-English gloss of its own.
 */
import { create } from 'react-test-renderer';

jest.mock('../../AppAlert', () => ({ appAlert: jest.fn(), AppAlertHost: () => null }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import SourceChip, { COFID_TOOLTIP } from '../SourceChip';
import { SOURCE_LABEL } from '../FoodRow';

const SEVEN = ['off', 'cofid', 'usda', 'user_ocr', 'custom', 'curated', 'recipe'];

describe('SourceChip vocabulary', () => {
  test('the seven sources print the seven words, exactly', () => {
    const printed = {};
    for (const source of SEVEN) {
      const json = JSON.stringify(create(<SourceChip source={source} />).toJSON());
      printed[source] = json;
    }
    expect(printed.off).toContain('"Food Facts"');
    expect(printed.cofid).toContain('"CoFID"');
    expect(printed.usda).toContain('"USDA"');
    expect(printed.user_ocr).toContain('"From a label"');
    expect(printed.custom).toContain('"Yours"');
    expect(printed.curated).toContain('"Volyume"');
    expect(printed.recipe).toContain('"Recipe"');
  });

  test('it matches FoodRow\'s SOURCE_LABEL for every source, word for word', () => {
    expect(Object.keys(SOURCE_LABEL).sort()).toEqual([...SEVEN].sort());
    for (const source of SEVEN) {
      const json = JSON.stringify(create(<SourceChip source={source} />).toJSON());
      expect(json).toContain(`"${SOURCE_LABEL[source]}"`);
      expect(json).toContain(`Source: ${SOURCE_LABEL[source]}`);
    }
  });

  test('none of the retired spellings or raw keys is ever printed', () => {
    for (const source of SEVEN) {
      const json = JSON.stringify(create(<SourceChip source={source} />).toJSON());
      for (const retired of ['"OFF"', '"OCR"', '"Custom"', '"Snapped"', '"You"', 'CURATE', 'RECIPE']) {
        expect(json).not.toContain(retired);
      }
    }
  });
});

describe('SourceChip unknown sources', () => {
  test.each([
    ['an unknown key', 'mystery_source'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a near miss in capitals', 'CURATED'],
  ])('%s prints nothing at all', (_label, source) => {
    expect(create(<SourceChip source={source} />).toJSON()).toBeNull();
  });
});

describe('SourceChip glosses', () => {
  test('CoFID keeps its verified treatment and its explanation', () => {
    const json = JSON.stringify(create(<SourceChip source="cofid" />).toJSON());
    expect(json).toContain('Source: CoFID, UK government food data');
    expect(json).toContain('checkmark-circle');
    expect(json).toContain(COFID_TOOLTIP);
  });

  test.each(SEVEN)('source %s carries a plain-English gloss', (source) => {
    const json = JSON.stringify(create(<SourceChip source={source} />).toJSON());
    expect(json).toContain('More information');
  });

  test('no gloss prints the old jargon', () => {
    for (const source of SEVEN) {
      const json = JSON.stringify(create(<SourceChip source={source} />).toJSON());
      expect(json).not.toMatch(/snapped/i);
    }
  });
});
