/**
 * Smoke test: the kit's Text (LOC-411 kit trial). Checks the default ink and
 * body size come from theme.js, the heading variants announce as headings,
 * and a parent's TextClassContext reaches it.
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
const { Text, TextClassContext } = require('../text');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

test('Text uses theme ink and the theme.js type scale', () => {
  const body = flatStyle(renderKit(<Text>Body</Text>).toJSON().children[0].props.style);
  expect(hex(body.color)).toBe(hex(colors.textPrimary));
  expect(body.fontSize).toBe(16); // theme.js fontSize.md

  const h1 = renderKit(<Text variant="h1">Title</Text>).toJSON().children[0];
  expect(h1.props.role).toBe('heading');
  expect(flatStyle(h1.props.style).fontSize).toBe(40); // theme.js fontSize.display

  const muted = flatStyle(renderKit(<Text variant="muted">Note</Text>).toJSON().children[0].props.style);
  expect(hex(muted.color)).toBe(hex(colors.textMuted));
});

test('TextClassContext from a parent part styles the text', () => {
  const tree = renderKit(
    <TextClassContext.Provider value="text-primary-foreground">
      <Text>Label</Text>
    </TextClassContext.Provider>
  );
  expect(hex(flatStyle(tree.toJSON().children[0].props.style).color)).toBe(hex(colors.onPrimary));
});
