/**
 * CP-9 (design-usability audit 2026-07-09, coverage-06-competitive-hps.md;
 * ruled D16 in docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
 * Settings had no Help/FAQ path at all. Pins:
 *  1. WIRING: RootNavigator registers the "SettingsFaq" screen (source-guard,
 *     no navigation harness needed), and SettingsAboutScreen renders a
 *     "Help & FAQ" row ABOVE "Send feedback" that navigates to it.
 *  2. CONTENT SANITY: every FAQ question/answer is a non-empty string, none
 *     contain an em dash (lint enforces this app-wide for user-facing copy),
 *     and none use the banned "The Coach" / "the Coach" / "the coach" actor
 *     naming (COACHING_VOICE_SYNTHESIS_LOCKED.md addendum 2026-07-09: the
 *     branded name is "Precision Coaching", the informal actor is lowercase
 *     possessive "your coach").
 *  3. RENDER: the screen mounts without crashing and each entry expands on
 *     tap (the app's existing CollapsibleSection idiom, lifted from
 *     MethodologyScreen).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { FAQS } from '../SettingsFaqScreen';
import SettingsFaqScreen from '../SettingsFaqScreen';

const ROOT_NAVIGATOR = fs.readFileSync(
  path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'),
  'utf8',
);

describe('SettingsFaq wiring (CP-9/D16)', () => {
  test('RootNavigator registers the SettingsFaq screen', () => {
    expect(ROOT_NAVIGATOR).toMatch(
      /const SettingsFaqScreen = lazyScreen\(\(\) => require\('..\/screens\/SettingsFaqScreen'\)\.default\);/,
    );
    expect(ROOT_NAVIGATOR).toMatch(
      /<Stack\.Screen name="SettingsFaq" component=\{SettingsFaqScreen\}/,
    );
  });
});

describe('SettingsAboutScreen "Help & FAQ" row (CP-9/D16)', () => {
  test('renders above "Send feedback" and navigates to SettingsFaq', () => {
    jest.resetModules();
    jest.doMock('../../components/FeedbackSheet', () => ({
      useFeedback: () => ({ open: jest.fn() }),
    }));
    // CP-10 stage 3: SettingsAboutScreen now calls useTheme() too. Stub it
    // with the real PURE resolveTheme() (no React hooks inside) rather than
    // the real useTheme() hook -- after jest.resetModules() above, a dynamic
    // require() of a component using a genuine hook (useShallow -> useRef)
    // picks up a second, freshly-required copy of `react`, whose dispatcher
    // was never set by the react-test-renderer `create()` call below, and
    // throws "Cannot read properties of null (reading 'useRef')". Sidestep
    // that entirely: this stub has no hook of its own to break.
    jest.doMock('../../hooks/useTheme', () => ({
      __esModule: true,
      // eslint-disable-next-line global-require
      default: () => require('../../styles/theme').resolveTheme({}),
    }));
    jest.doMock('../../components/SettingsPrimitives', () => {
      const { View, Text } = require('react-native');
      return {
        SettingsPage: ({ title, children }) => (<View><Text>{title}</Text>{children}</View>),
        SettingRow: ({ label, sub, onPress }) => (
          <View onPress={onPress} testID={label}>
            <Text>{label}</Text>
            {sub ? <Text>{sub}</Text> : null}
          </View>
        ),
        settingsStyles: { section: {} },
        // CP-10 stage 3: SettingsAboutScreen now calls useSettingsStyles() for
        // its live theme override; this mock stands in for it the same way
        // the other exports here stand in for the real primitives.
        useSettingsStyles: () => ({}),
      };
    });
    // eslint-disable-next-line global-require
    const SettingsAboutScreen = require('../SettingsAboutScreen').default;
    const navigation = { navigate: jest.fn() };
    let tree;
    act(() => { tree = create(<SettingsAboutScreen navigation={navigation} />); });

    const labels = tree.root.findAllByType('Text').map((n) => n.children[0]);
    const helpIndex = labels.indexOf('Help & FAQ');
    const feedbackIndex = labels.indexOf('Send feedback');
    expect(helpIndex).toBeGreaterThanOrEqual(0);
    expect(feedbackIndex).toBeGreaterThan(helpIndex);

    const helpRow = tree.root.findAll((n) => n.props.testID === 'Help & FAQ')[0];
    act(() => { helpRow.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('SettingsFaq');
  });
});

describe('SettingsFaqScreen content (CP-9/D16)', () => {
  test('has between 12 and 16 entries, each with a non-empty question and answer', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(12);
    expect(FAQS.length).toBeLessThanOrEqual(16);
    FAQS.forEach((item) => {
      expect(typeof item.key).toBe('string');
      expect(item.key.length).toBeGreaterThan(0);
      expect(typeof item.q).toBe('string');
      expect(item.q.trim().length).toBeGreaterThan(0);
      expect(typeof item.a).toBe('string');
      expect(item.a.trim().length).toBeGreaterThan(0);
    });
  });

  test('no em dash anywhere in the FAQ copy', () => {
    FAQS.forEach((item) => {
      expect(item.q).not.toMatch(/—/);
      expect(item.a).not.toMatch(/—/);
    });
  });

  test('no banned "The Coach" actor-naming violations', () => {
    FAQS.forEach((item) => {
      expect(item.q).not.toMatch(/\bthe coach\b/i);
      expect(item.a).not.toMatch(/\bthe coach\b(?!'s)/i);
    });
  });

  test('keys are unique', () => {
    const keys = FAQS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('SettingsFaqScreen render', () => {
  test('mounts and expands an entry on tap', () => {
    let tree;
    act(() => { tree = create(<SettingsFaqScreen />); });

    // Initially every section is collapsed: none of the answer bodies render.
    // TouchableOpacity renders as both a composite and a host node carrying
    // the same accessibilityLabel; restrict to the composite (non-string
    // type) to get exactly one match, same fix as
    // SettingsPrivacyScreen.appLock.test.js's findAppLockSwitch.
    const firstAnswer = FAQS[0].a;
    const headers = tree.root.findAll(
      (n) => n.props.accessibilityLabel === FAQS[0].q && typeof n.type !== 'string',
    );
    expect(headers.length).toBe(1);

    act(() => { headers[0].props.onPress(); });

    const texts = tree.root.findAllByType('Text').map((n) => (
      Array.isArray(n.children) ? n.children.join('') : n.children
    ));
    expect(texts.some((t) => t === firstAnswer)).toBe(true);
  });
});
