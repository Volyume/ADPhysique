/**
 * Smoke test: the kit's Input (LOC-411 kit trial). Checks the field takes the
 * theme's control edge and ink, the dark-scheme fill from the same token, and
 * that typing reaches onChangeText.
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
const { Input } = require('../input');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Input draws theme edge and ink and passes typing through', () => {
  const onChangeText = jest.fn();
  const tree = renderKit(<Input placeholder="Weight" onChangeText={onChangeText} />);
  const input = hostNodes(tree).find((n) => n.type === 'TextInput');
  const style = flatStyle(input.props.style);
  expect(hex(style.borderColor)).toBe(hex(colors.border));
  expect(hex(style.color)).toBe(hex(colors.textPrimary));
  // dark:bg-input/30: the control-edge token at 30%, never a default grey.
  const fill = normaliseColour(style.backgroundColor);
  expect(fill.hex).toBe(hex(colors.border));
  expect(fill.alpha).toBeCloseTo(0.3, 5);
  expect(style.height).toBe(40);
  act(() => input.props.onChangeText('82.5'));
  expect(onChangeText).toHaveBeenCalledWith('82.5');
});
