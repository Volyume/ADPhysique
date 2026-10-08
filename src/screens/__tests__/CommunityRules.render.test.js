/**
 * CommunityRulesScreen render (D221 visual law V1, lane 2B): the rules are
 * text in bands, each rule under a section header; the re-consent notice is
 * a band with its one emphatic action, and the update notice has none.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/community/trainingConsistency', () => ({ publishConsistency: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/community', () => {
  const actual = jest.requireActual('../../lib/community');
  return {
    ...actual,
    acceptRules: jest.fn(() => Promise.resolve()),
    loadMe: jest.fn(() => Promise.resolve({ me: { accepted_rules_version: 1, rules_version: 2 } })),
    rulesTextBehindServer: jest.fn(() => false),
  };
});

import CommunityRulesScreen, { COMMUNITY_RULES_TEXT, ACCEPT_UPDATED_RULES_LABEL } from '../CommunityRulesScreen';

function headerTitles(tree) {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header')
    .map((n) => n.props.children);
}

async function mount(params = {}) {
  let tree;
  await act(async () => {
    tree = create(<CommunityRulesScreen navigation={{ goBack: jest.fn() }} route={{ params }} />);
  });
  await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
  return tree;
}

describe('the rules text in bands', () => {
  test('every rule and every section is a header, the text is unchanged', async () => {
    const tree = await mount();
    const titles = headerTitles(tree);
    for (const rule of COMMUNITY_RULES_TEXT.rules) expect(titles).toContain(rule.heading);
    for (const key of ['privacy', 'reporting', 'moderatorActions', 'contact']) {
      expect(titles).toContain(COMMUNITY_RULES_TEXT[key].heading);
    }
  });

  test('no accept action for a reader who is up to date', async () => {
    const tree = await mount();
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === ACCEPT_UPDATED_RULES_LABEL)).toHaveLength(0);
  });

  test('a re-consent offers the one emphatic action in a band', async () => {
    const tree = await mount({ mustAccept: true });
    expect(headerTitles(tree)).toContain('The rules have changed');
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === ACCEPT_UPDATED_RULES_LABEL).length).toBeGreaterThan(0);
  });
});
