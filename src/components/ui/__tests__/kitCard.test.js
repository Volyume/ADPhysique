/**
 * Smoke test: the kit's Card family (LOC-411 kit trial). Checks the card sits
 * on theme.js's surface step with the subtle border, and that its title and
 * description take the theme's primary and muted ink.
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

const { resolveTheme } = require('../../../styles/theme');
const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = require('../card');
const { Text } = require('../text');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Card renders its parts on the theme surface with theme ink', () => {
  const tree = renderKit(
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
        <CardDescription>Four sessions planned</CardDescription>
      </CardHeader>
      <CardContent>
        <Text>Body</Text>
      </CardContent>
      <CardFooter>
        <Text>Footer</Text>
      </CardFooter>
    </Card>
  );
  const card = flatStyle(tree.toJSON().children[0].props.style);
  expect(hex(card.backgroundColor)).toBe(hex(colors.surface));
  expect(hex(card.borderColor)).toBe(hex(colors.borderSubtle));
  expect(card.borderRadius).toBe(20); // theme.js radius.xl

  const texts = hostNodes(tree).filter((n) => n.type === 'Text');
  const byText = (s) => texts.find((n) => n.props.children === s);
  expect(hex(flatStyle(byText('This week').props.style).color)).toBe(hex(colors.textPrimary));
  expect(hex(flatStyle(byText('Four sessions planned').props.style).color)).toBe(hex(colors.textMuted));
  expect(byText('Body')).toBeTruthy();
  expect(byText('Footer')).toBeTruthy();
});
