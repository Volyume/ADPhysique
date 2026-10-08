/**
 * CommunityGymAddScreen (gym database blueprint, GD-11; D221 lane 2B).
 * Pins: the form is bands with section headers and every field is a well;
 * the duplicate offer is a band with the two actions; Add stays disabled
 * until the name and a valid postcode are given; a UK postcode that does not
 * parse says so.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/gyms', () => ({
  submit: jest.fn(),
  isFullPostcode: jest.fn((v) => /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(v)),
  normalisePostcode: jest.fn((v) => v.toUpperCase()),
}));

import { submit } from '../../lib/gyms';
import CommunityGymAddScreen from '../CommunityGymAddScreen';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}
function headerTitles(tree) {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header')
    .map((n) => n.props.children);
}
const field = (tree, label) => tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onChangeText)[0];
const button = (tree, label) => tree.root.findAll(
  (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label && 'onPress' in n.props,
)[0];

async function mount(params = {}) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityGymAddScreen navigation={navigation} route={{ params }} />);
  });
  return { tree, navigation };
}

beforeEach(() => { jest.clearAllMocks(); });

describe('the form', () => {
  test('is bands with section headers, and every field is a well', async () => {
    const { tree } = await mount();
    expect(headerTitles(tree)).toEqual(expect.arrayContaining(['The gym', 'Optional']));
    for (const label of ['Gym name', 'Address line', 'Town', 'Postcode', 'Website', 'Gym company']) {
      expect(field(tree, label).props.well).toBe(true);
    }
  });

  test('Add stays disabled until there is a name and a valid postcode', async () => {
    const { tree } = await mount();
    expect(button(tree, 'Add this gym').props.disabled).toBe(true);
    await act(async () => { field(tree, 'Gym name').props.onChangeText('Volt Gym'); });
    await act(async () => { field(tree, 'Postcode').props.onChangeText('zz'); });
    expect(flattenText(tree.toJSON())).toContain('That does not look like a UK postcode.');
    expect(button(tree, 'Add this gym').props.disabled).toBe(true);
  });

  test('typed text from the finder pre-fills the name', async () => {
    const { tree } = await mount({ typed: 'Volt' });
    expect(field(tree, 'Gym name').props.value).toBe('Volt');
  });
});

describe('a duplicate is offered back in a band, not a card', () => {
  test('"Use this gym" selects the existing venue; "Add it anyway" returns to the form', async () => {
    const onSelect = jest.fn();
    submit.mockResolvedValue({ duplicate: true, id: 'v9', displayName: 'Volt Gym' });
    const { tree, navigation } = await mount({ onSelect });
    await act(async () => { field(tree, 'Gym name').props.onChangeText('Volt Gym'); });
    await act(async () => { field(tree, 'Address line').props.onChangeText('1 Main Street'); });
    await act(async () => { field(tree, 'Town').props.onChangeText('Burscough'); });
    await act(async () => { field(tree, 'Postcode').props.onChangeText('L40 4BY'); });
    await act(async () => { button(tree, 'Add this gym').props.onPress(); });
    expect(flattenText(tree.toJSON())).toContain('Did you mean Volt Gym?');
    expect(headerTitles(tree)).toContain('Already in the directory');
    await act(async () => { button(tree, 'Use Volt Gym').props.onPress(); });
    expect(onSelect).toHaveBeenCalledWith({ id: 'v9' });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('"Add it anyway" returns to the form', async () => {
    submit.mockResolvedValue({ duplicate: true, id: 'v9', displayName: 'Volt Gym' });
    const { tree, navigation } = await mount();
    await act(async () => { field(tree, 'Gym name').props.onChangeText('Volt Gym'); });
    await act(async () => { field(tree, 'Address line').props.onChangeText('1 Main Street'); });
    await act(async () => { field(tree, 'Town').props.onChangeText('Burscough'); });
    await act(async () => { field(tree, 'Postcode').props.onChangeText('L40 4BY'); });
    await act(async () => { button(tree, 'Add this gym').props.onPress(); });
    await act(async () => { button(tree, 'Add a new gym anyway').props.onPress(); });
    expect(headerTitles(tree)).toContain('The gym');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('source: no Card, no SectionLabel', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../CommunityGymAddScreen.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(src).not.toMatch(/<Card\b|SectionLabel/);
  });
});
