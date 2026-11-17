/**
 * Smoke test: the kit's Separator (LOC-411 kit trial). Checks the hairline is
 * the theme's subtle border colour in both orientations.
 */
jest.mock('react-native', () => require('./kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  renderKit,
  normaliseColour,
  flatStyle,
} = require('./kitTestEnv');

loadNativeInteropRuntime();

const { resolveTheme } = require('../../../styles/theme');
const { Separator } = require('../separator');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Separator draws a 1px theme border line in both orientations', () => {
  const horizontal = flatStyle(renderKit(<Separator />).toJSON().children[0].props.style);
  expect(hex(horizontal.backgroundColor)).toBe(hex(colors.borderSubtle));
  expect(horizontal.height).toBe(1);
  expect(horizontal.width).toBe('100%');

  const vertical = flatStyle(renderKit(<Separator orientation="vertical" />).toJSON().children[0].props.style);
  expect(hex(vertical.backgroundColor)).toBe(hex(colors.borderSubtle));
  expect(vertical.width).toBe(1);
});
