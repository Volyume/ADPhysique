import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import BackHeader from '../BackHeader';
import ModalHeader from '../ModalHeader';
import EmptyState from '../EmptyState';
import { colors } from '../../styles/theme';

const CARDIO_PLAN_CARD = require('fs').readFileSync(
  require('path').resolve(__dirname, '../CardioPlanCard.js'),
  'utf8',
);
const BUTTON = require('fs').readFileSync(
  require('path').resolve(__dirname, '../Button.js'),
  'utf8',
);
const CHIP = require('fs').readFileSync(
  require('path').resolve(__dirname, '../Chip.js'),
  'utf8',
);
const SCREEN_HEADER = require('fs').readFileSync(
  require('path').resolve(__dirname, '../ScreenHeader.js'),
  'utf8',
);
const BRAND_MARK = require('fs').readFileSync(
  require('path').resolve(__dirname, '../BrandMark.js'),
  'utf8',
);
const TAB_BAR = require('fs').readFileSync(
  require('path').resolve(__dirname, '../VolyumeTabBar.js'),
  'utf8',
);

function flatten(style) {
  if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean).map(flatten));
  return style || {};
}

describe('shared chrome polish', () => {
  test('BackHeader uses quiet separators and balanced side targets', () => {
    let tree;
    act(() => { tree = create(<BackHeader title="Details" />); });
    const title = tree.root.findAllByType(Text).find((node) => node.props.children === 'Details');
    const header = title.parent;
    expect(flatten(header.props.style).borderBottomColor).toBe(colors.borderSubtle);
    expect(flatten(tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.style).width).toBe(44);
  });

  test('ModalHeader uses the same quiet divider language', () => {
    let tree;
    act(() => { tree = create(<ModalHeader title="Choose date" onClose={() => {}} />); });
    const title = tree.root.findAllByType(Text).find((node) => node.props.children === 'Choose date');
    const header = title.parent;
    expect(flatten(header.props.style).borderBottomColor).toBe(colors.borderSubtle);
    expect(flatten(tree.root.findByProps({ accessibilityLabel: 'Close' }).props.style).width).toBe(44);
  });

  test('EmptyState headline is primary, not muted placeholder text', () => {
    let tree;
    act(() => {
      tree = create(<EmptyState icon="barbell-outline" title="No data yet" text="Log one session to start." />);
    });
    const title = tree.root.findAllByType(Text).find((node) => node.props.children === 'No data yet');
    expect(flatten(title.props.style).color).toBe(colors.textPrimary);
  });

  test('Cardio history is a contained neutral header action', () => {
    expect(CARDIO_PLAN_CARD).toContain('style={styles.cardioHistoryBtn}');
    expect(CARDIO_PLAN_CARD).toContain('Ionicons name="time-outline" size={13} color={colors.textSecondary}');
    expect(CARDIO_PLAN_CARD).toMatch(/cardioHistoryBtn: \{[\s\S]*minHeight: 36,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(CARDIO_PLAN_CARD).toContain('cardioHistoryLink: { ...type.caption, color: colors.textPrimary }');
    expect(CARDIO_PLAN_CARD).not.toMatch(/cardioHistoryLink: \{[\s\S]*color: colors\.primary/);
  });

  test('core chrome uses bundled type roles instead of synthetic Android weights', () => {
    expect(BUTTON).toContain('fontFamily: fontFamily.semibold');
    expect(BUTTON).not.toContain('fontWeight: fontWeight.bold');
    expect(CHIP).toContain('label: { ...type.label, color: colors.textSecondary }');
    expect(CHIP).not.toContain('fontWeight: fontWeight.semibold');
    expect(SCREEN_HEADER).toContain('...type.h3');
    expect(TAB_BAR).toContain('label: { ...type.caption, fontFamily: type.label.fontFamily }');
  });

  test('tab-screen chrome uses the clean compact V, not the splash flare asset', () => {
    const compactIconRequire = [
      'const V_ICON_COMPACT = require',
      "('../../assets/volyume-v-compact.png');",
    ].join('');
    expect(BRAND_MARK).toContain(compactIconRequire);
    expect(BRAND_MARK).toContain('source={V_ICON_COMPACT}');
    expect(SCREEN_HEADER).toContain('backgroundColor: colors.chipInk');
  });
});
