/**
 * HintCaption (Wave A C7, 2026-07-03): the shared one-time caption used by
 * DiaryScreen and FoodSearchScreen to surface a long-press gesture that was
 * previously accessibilityHint/accessibilityLabel only. Pins its contract in
 * isolation: renders the given text, renders a "Got it" dismiss link, and
 * calls onDismiss when it's tapped.
 */
import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import HintCaption from '../HintCaption';

test('renders the given caption text', () => {
  const root = create(<HintCaption text="Hold to add 500 ml." onDismiss={() => {}} />).root;
  const texts = root.findAllByType(Text).map((t) => t.props.children).flat();
  expect(texts).toContain('Hold to add 500 ml.');
});

test('renders a "Got it" dismiss link that calls onDismiss', () => {
  const onDismiss = jest.fn();
  const root = create(<HintCaption text="Hold to add 500 ml." onDismiss={onDismiss} />).root;
  const dismissBtn = root.findAllByType(TouchableOpacity).find(
    (b) => b.props.accessibilityLabel === 'Got it, dismiss this hint',
  );
  expect(dismissBtn).toBeTruthy();
  act(() => { dismissBtn.props.onPress(); });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
