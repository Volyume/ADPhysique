/**
 * Smoke test: the kit's Checkbox (LOC-411 kit trial). Checks the unchecked
 * edge is the theme's control edge, a press asks to check it, and the checked
 * box draws the amber fill.
 */
jest.mock('react-native-svg', () => require('./kitTestEnv').svgMock());
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
const { Checkbox } = require('../checkbox');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Checkbox toggles and draws theme colours in both states', () => {
  const onCheckedChange = jest.fn();
  const unchecked = renderKit(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);
  const box = hostNodes(unchecked).find((n) => n.props.role === 'checkbox');
  expect(hex(flatStyle(box.props.style).borderColor)).toBe(hex(colors.border));
  act(() => box.props.onPress());
  expect(onCheckedChange).toHaveBeenCalledWith(true);

  const checked = renderKit(<Checkbox checked onCheckedChange={onCheckedChange} />);
  const checkedBox = hostNodes(checked).find((n) => n.props.role === 'checkbox');
  expect(hex(flatStyle(checkedBox.props.style).borderColor)).toBe(hex(colors.primaryFill));
  const fills = hostNodes(checked)
    .map((n) => flatStyle(n.props.style).backgroundColor)
    .filter(Boolean)
    .map(hex);
  expect(fills).toContain(hex(colors.primaryFill));
});
