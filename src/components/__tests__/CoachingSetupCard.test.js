/**
 * Pins the calm coaching-setup card (founder brief 2026-10-19, coaching-first
 * onboarding with an optional quick start): it shows the locked copy from
 * src/lib/coachingSetup.js, the coach variant uses `body`, the nutrition
 * variant uses `nutritionBody`, and the one action fires onPress.
 */
import { create, act } from 'react-test-renderer';
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import CoachingSetupCard from '../CoachingSetupCard';
import { COACHING_SETUP_COPY } from '../../lib/coachingSetup';

function texts(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' ? false : n.props.children !== undefined && typeof n.props.children === 'string')
    .map((n) => n.props.children);
}

describe('CoachingSetupCard', () => {
  it('shows the title, the coach body and the action by default', () => {
    let tree;
    act(() => { tree = create(<CoachingSetupCard onPress={() => {}} />); });
    const all = texts(tree);
    expect(all).toContain(COACHING_SETUP_COPY.title);
    expect(all).toContain(COACHING_SETUP_COPY.body);
    expect(all).not.toContain(COACHING_SETUP_COPY.nutritionBody);
    expect(all).toContain(COACHING_SETUP_COPY.action);
  });

  it('uses the nutrition body for the nutrition variant', () => {
    let tree;
    act(() => { tree = create(<CoachingSetupCard variant="nutrition" onPress={() => {}} />); });
    const all = texts(tree);
    expect(all).toContain(COACHING_SETUP_COPY.nutritionBody);
    expect(all).not.toContain(COACHING_SETUP_COPY.body);
  });

  it('labels the action for screen readers and calls onPress', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<CoachingSetupCard onPress={onPress} />); });
    const btn = tree.root.find((n) => n.props.accessibilityLabel === 'Set up coaching' && typeof n.props.onPress === 'function');
    act(() => { btn.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('compact renders one labelled row that fires onPress', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<CoachingSetupCard mode="compact" onPress={onPress} />); });
    const all = texts(tree);
    expect(all).toContain(COACHING_SETUP_COPY.compact);
    expect(all).toContain(COACHING_SETUP_COPY.compactAction);
    expect(all).not.toContain(COACHING_SETUP_COPY.body);
    const row = tree.root.find((n) => n.props.testID === 'coaching-setup-row' && typeof n.props.onPress === 'function');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe("Coaching isn't set up yet. Set up coaching");
    act(() => { row.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('full with onNotNow shows a Not now action that fires it', () => {
    const onNotNow = jest.fn();
    let tree;
    act(() => { tree = create(<CoachingSetupCard onPress={() => {}} onNotNow={onNotNow} />); });
    expect(texts(tree)).toContain(COACHING_SETUP_COPY.notNow);
    const btn = tree.root.find((n) => n.props.accessibilityLabel === 'Not now' && typeof n.props.onPress === 'function');
    act(() => { btn.props.onPress(); });
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('full without onNotNow has no Not now', () => {
    let tree;
    act(() => { tree = create(<CoachingSetupCard onPress={() => {}} />); });
    expect(texts(tree)).not.toContain(COACHING_SETUP_COPY.notNow);
  });
});
