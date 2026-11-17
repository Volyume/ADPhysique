/**
 * Smoke test: the kit's Button (LOC-411 kit trial). Renders through the real
 * NativeWind pipeline inside KitThemeProvider and checks the parts a screen
 * relies on: amber fill with theme ink, the destructive fill, the theme.js
 * size scale, and that a press reaches onPress.
 */
jest.mock('react-native', () => require('./kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  renderKit,
  hostNodes,
  normaliseColour,
  flatStyle,
} = require('./kitTestEnv');

loadNativeInteropRuntime();

const { act } = require('react-test-renderer');
const { resolveTheme } = require('../../../styles/theme');
const { Button } = require('../button');
const { Text } = require('../text');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('default Button draws the amber fill with theme ink and fires onPress', () => {
  const onPress = jest.fn();
  const tree = renderKit(
    <Button onPress={onPress}>
      <Text>Save</Text>
    </Button>
  );
  const button = hostNodes(tree).find((n) => n.props.role === 'button');
  const style = flatStyle(button.props.style);
  expect(hex(style.backgroundColor)).toBe(hex(colors.primaryFill));
  expect(style.height).toBe(40);
  expect(style.borderRadius).toBe(10); // theme.js radius.md
  const label = hostNodes(tree).find((n) => n.type === 'Text');
  expect(hex(flatStyle(label.props.style).color)).toBe(hex(colors.onPrimary));
  expect(flatStyle(label.props.style).fontSize).toBe(13); // theme.js fontSize.sm
  act(() => button.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('destructive Button uses the theme error fill', () => {
  const tree = renderKit(
    <Button variant="destructive">
      <Text>Delete</Text>
    </Button>
  );
  const style = flatStyle(hostNodes(tree).find((n) => n.props.role === 'button').props.style);
  expect(hex(style.backgroundColor)).toBe(hex(colors.errorFill));
});
