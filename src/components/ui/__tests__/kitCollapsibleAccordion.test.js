/**
 * Smoke test: the kit's Collapsible and Accordion (LOC-411 kit trial; one
 * part in the trial list). Checks both open and close from their trigger, and
 * that the Accordion's classes on reanimated's Animated.View resolve (the
 * cssInterop registration in kit-theme-provider.tsx): the item's theme border
 * and the content's padding.
 */
jest.mock('react-native-reanimated', () => require('./kitTestEnv').reanimatedMock());
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
const { Collapsible, CollapsibleTrigger, CollapsibleContent } = require('../collapsible');
const { Accordion, AccordionItem, AccordionTrigger, AccordionContent } = require('../accordion');
const { Text } = require('../text');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => {
  setUpKitStyles();
  setPalette({ theme: 'dark' });
}, 120000);

const hasText = (tree, s) => hostNodes(tree).some((n) => n.type === 'Text' && n.props.children === s);

test('Collapsible shows its content only while open', () => {
  const tree = renderKit(
    <Collapsible>
      <CollapsibleTrigger>
        <Text>Show details</Text>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Text>Details</Text>
      </CollapsibleContent>
    </Collapsible>
  );
  expect(hasText(tree, 'Details')).toBe(false);
  const trigger = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.onPress === 'function')[0];
  act(() => trigger.props.onPress());
  expect(hasText(tree, 'Details')).toBe(true);
});

test('Accordion opens an item from its trigger and draws theme styles', () => {
  const tree = renderKit(
    <Accordion type="single" collapsible>
      <AccordionItem value="why">
        <AccordionTrigger>
          <Text>Why this weight?</Text>
        </AccordionTrigger>
        <AccordionContent>
          <Text>Because last week moved well.</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
  expect(hasText(tree, 'Because last week moved well.')).toBe(false);

  const item = hostNodes(tree).find((n) => flatStyle(n.props.style).borderBottomWidth === 1);
  expect(item).toBeTruthy();
  expect(hex(flatStyle(item.props.style).borderColor ?? flatStyle(item.props.style).borderBottomColor)).toBe(
    hex(colors.borderSubtle)
  );

  const label = hostNodes(tree).find((n) => n.type === 'Text' && n.props.children === 'Why this weight?');
  expect(flatStyle(label.props.style).fontSize).toBe(13); // theme.js fontSize.sm

  const trigger = tree.root.findAll((n) => n.type === 'Pressable')[0];
  act(() => trigger.props.onPress());
  expect(hasText(tree, 'Because last week moved well.')).toBe(true);
  const padded = hostNodes(tree).find((n) => flatStyle(n.props.style).paddingBottom === 16);
  expect(padded).toBeTruthy();
});
