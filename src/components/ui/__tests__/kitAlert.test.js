/**
 * Smoke test: the kit's Alert (LOC-411 kit trial). Checks it announces as an
 * alert, sits on the card surface, and that the destructive variant takes the
 * theme's error fill colour for its text.
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

const { resolveTheme } = require('../../../styles/theme');
const { Info } = require('lucide-react-native');
const { Alert, AlertTitle, AlertDescription } = require('../alert');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Alert renders title and description on the theme surface', () => {
  const tree = renderKit(
    <Alert icon={Info}>
      <AlertTitle>Saved</AlertTitle>
      <AlertDescription>Your plan is up to date.</AlertDescription>
    </Alert>
  );
  const alert = hostNodes(tree).find((n) => n.props.role === 'alert');
  expect(hex(flatStyle(alert.props.style).backgroundColor)).toBe(hex(colors.surface));
  const texts = hostNodes(tree).filter((n) => n.type === 'Text');
  const title = texts.find((n) => n.props.children === 'Saved');
  const body = texts.find((n) => n.props.children === 'Your plan is up to date.');
  expect(hex(flatStyle(title.props.style).color)).toBe(hex(colors.textPrimary));
  expect(hex(flatStyle(body.props.style).color)).toBe(hex(colors.textMuted));
});

test('destructive Alert text uses the theme destructive colour', () => {
  const tree = renderKit(
    <Alert icon={Info} variant="destructive">
      <AlertTitle>Could not save</AlertTitle>
    </Alert>
  );
  const title = hostNodes(tree).find((n) => n.type === 'Text' && n.props.children === 'Could not save');
  expect(hex(flatStyle(title.props.style).color)).toBe(hex(colors.errorFill));
});
