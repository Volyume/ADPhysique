/**
 * SettingsScreen, D231 (app layout rework, batch 5; the owner amended the
 * item 11 layout).
 *
 * What this suite pins, written to fail against the previous screen:
 *   - "Injuries & limitations" and "Nutrition targets" have no row in Settings
 *     (the owner answered "Remove both"); the six headings stay, and Nutrition
 *     keeps "Dietary needs";
 *   - the "Community" row, under Privacy & data, opens Community privacy and
 *     sharing (CommunityPrivacy), not the tab's root, and its sub line says what
 *     that screen holds. Batch 5 opened it inside the Community tab through
 *     `navigateCrossTab`; batch 4 (the Progress tab's removal) registers the
 *     screen in the Coach stack too, so the row opens it IN PLACE with a plain
 *     `navigation.navigate('CommunityPrivacy')` and Back returns to Settings;
 *   - that screen is reachable by someone who has not joined Community (it
 *     answers "what would Community share" and offers a way in), which is why
 *     the row needs no non-member branch.
 */

import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../components/SettingsPrimitives', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    SettingsPage: ({ children }) => React.createElement(View, null, children),
    SectionHeader: ({ title }) => React.createElement(Text, { accessibilityRole: 'header' }, title),
    SettingRow: ({ label, sub, onPress }) => React.createElement(
      Pressable,
      { accessibilityRole: 'button', accessibilityLabel: label, accessibilityHint: sub, onPress },
      React.createElement(Text, null, label),
    ),
    settingsStyles: { section: {} },
    useSettingsStyles: () => ({ section: {} }),
  };
});
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));

import { navigateCrossTab } from '../../navigation/navigateCrossTab';
import SettingsScreen from '../SettingsScreen';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

function mount() {
  const navigation = { navigate: jest.fn(), getParent: jest.fn() };
  let tree;
  act(() => { tree = create(<SettingsScreen navigation={navigation} />); });
  return { tree, navigation };
}

function rowsOf(tree) {
  return tree.root.findAll((n) => n.props?.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
}

function rowNamed(tree, label) {
  return rowsOf(tree).find((n) => n.props.accessibilityLabel === label);
}

function headingsOf(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header').map((n) => n.props.children);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('D231: Settings loses two rows', () => {
  test('no Injuries & limitations row and no Nutrition targets row, and nothing opens either screen', () => {
    const { tree, navigation } = mount();
    const labels = [...new Set(rowsOf(tree).map((n) => n.props.accessibilityLabel))];
    expect(labels).not.toContain('Injuries & limitations');
    expect(labels).not.toContain('Nutrition targets');
    for (const n of rowsOf(tree)) { act(() => { n.props.onPress(); }); }
    const opened = navigation.navigate.mock.calls.map((c) => c[0]);
    expect(opened).not.toContain('HowYouTrain');
    expect(opened).not.toContain('NutritionTargets');
  });

  test('the six headings stay, in order, and Nutrition keeps Dietary needs', () => {
    const { tree } = mount();
    expect(headingsOf(tree)).toEqual([
      'Training', 'Nutrition', 'Reminders', 'Display & accessibility', 'Privacy & data', 'Account & help',
    ]);
    expect(rowNamed(tree, 'Dietary needs')).toBeTruthy();
    expect(rowNamed(tree, 'Coaching')).toBeTruthy();
    expect(rowNamed(tree, 'Workout')).toBeTruthy();
  });

  test('every other row is still there', () => {
    const { tree } = mount();
    const labels = new Set(rowsOf(tree).map((n) => n.props.accessibilityLabel));
    for (const label of [
      'Coaching', 'Workout', 'Dietary needs', 'Notifications', 'Coaching reminders', 'Display', 'Units',
      'Your data', 'Privacy and legal', 'Community', 'Account', 'Profile', 'Help and about',
    ]) {
      expect(labels.has(label)).toBe(true);
    }
  });
});

describe('D231: the Community row opens Community privacy and sharing', () => {
  // RE-POINTED (D231, batch 4): in place, so Back returns to Settings.
  test('it opens CommunityPrivacy in place (the Coach stack registers it), not the tab root and not across tabs', () => {
    const { tree, navigation } = mount();
    const row = rowNamed(tree, 'Community');
    expect(row).toBeTruthy();
    act(() => { row.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityPrivacy');
    expect(navigateCrossTab).not.toHaveBeenCalled();
  });

  test('its sub line says what Community privacy and sharing holds, from the screen itself', () => {
    const { tree } = mount();
    const sub = rowNamed(tree, 'Community').props.accessibilityHint;
    expect(sub).toBe('Who can follow you, what you share, and who you have blocked or muted');
    expect(sub).not.toMatch(/—/);
    expect(sub).not.toMatch(/\bhandles?\b/i);
    // Every thing it names is on the destination screen.
    const privacy = read('screens/CommunityPrivacyScreen.js');
    expect(privacy).toContain('title="Who can follow you"');
    expect(privacy).toContain('SectionHeader title="Blocked"');
    expect(privacy).toContain('SectionHeader title="Muted"');
    expect(privacy).toContain('title="Share what I did"');
  });

  test('the destination is registered in the Coach stack (so the row opens it in place) and still in the Community tab\'s stack, with the same options', () => {
    const nav = read('navigation/RootNavigator.js');
    const body = (name) => nav.slice(nav.indexOf(`function ${name}(`), nav.indexOf('\nfunction ', nav.indexOf(`function ${name}(`) + 1));
    const reg = (src) => (src.match(/<Stack\.Screen name="CommunityPrivacy"[^>]*\/>/) || [''])[0].replace(/\s+/g, ' ');
    expect(reg(body('CommunityStack'))).toContain('component={CommunityPrivacyScreen}');
    expect(reg(body('ProfileStack'))).toBe(reg(body('CommunityStack')));
    expect(reg(body('ProfileStack'))).not.toBe('');
  });

  // Why the row has no non-member branch: the screen is built to be opened by
  // someone with no Community profile.
  test('Community privacy and sharing works for someone who has not joined: the receipt and a way in, no profile needed', () => {
    const privacy = read('screens/CommunityPrivacyScreen.js');
    expect(privacy).toContain('Someone who has never joined can open this from Settings');
    expect(privacy).toContain('<PrivacyReceipt inBand />');
    expect(privacy).toContain('title="You are not in Community yet"');
    expect(privacy).toContain('actionLabel="Open Community"');
    expect(privacy).toMatch(/if \(!joined\) \{ setLoading\(false\); return; \}/);
  });

  test('the source pins the same: one in-place navigate to CommunityPrivacy, no cross-tab call and no navigation to the Community tab or its root', () => {
    const src = read('screens/SettingsScreen.js').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toContain("navigation.navigate('CommunityPrivacy')");
    expect(src).not.toContain('navigateCrossTab');
    expect(src).not.toMatch(/navigation\.navigate\('Community(?!Privacy)/);
    expect(src).not.toContain('HowYouTrain');
    expect(src).not.toContain('NutritionTargets');
  });
});
