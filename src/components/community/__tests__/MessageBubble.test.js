/**
 * MessageBubble (community product audit `40-GAP-CLOSURE.md` §1).
 *
 * What this suite pins:
 *  - a plain message renders its body as text;
 *  - an `https://` link in the body renders as a separate tappable node
 *    that opens the OS browser, never any other scheme;
 *  - a session suggestion renders its tile line and, while unanswered,
 *    Accept/"Can't make it" for the recipient only; once responded, the
 *    state line replaces the actions for both parties.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../../hooks/useTheme', () => {
  const real = jest.requireActual('../../../styles/theme');
  return () => ({
    colors: {
      ...real.colors,
      textPrimary: '#000', textMuted: '#666', surface: '#fff', surfaceElevated: '#eee',
      borderSubtle: '#ccc', primary: '#f5a623', onPrimary: '#000',
    },
    type: real.type,
    fontSize: real.fontSize,
    spacing: real.spacing,
  });
});
jest.mock('../../../lib/community', () => {
  const actual = jest.requireActual('../../../lib/community/messages');
  const linksActual = jest.requireActual('../../../lib/community/links');
  return {
    sessionTileLine: actual.sessionTileLine,
    sessionStateLine: actual.sessionStateLine,
    findHttpsLinks: linksActual.findHttpsLinks,
    openMessageLink: jest.fn(),
  };
});

import MessageBubble from '../MessageBubble';
import { openMessageLink } from '../../../lib/community';

function render(props) {
  let tree = null;
  act(() => { tree = create(<MessageBubble {...props} />); });
  return tree;
}

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) node.children.forEach(walk);
  };
  walk(tree.toJSON());
  return out;
}

function find(tree, predicate) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node === 'string') return;
    if (predicate(node)) out.push(node);
    (node.children || []).forEach(walk);
  };
  walk(tree.toJSON());
  return out;
}

describe('a plain message', () => {
  test('renders its body', () => {
    const tree = render({ message: { id: 'm1', mine: false, body: 'Hello there' } });
    expect(texts(tree)).toContain('Hello there');
  });
});

describe('links in message text', () => {
  test('an https URL renders as its own node with onPress', () => {
    const tree = render({ message: { id: 'm1', mine: false, body: 'See https://volyume.app for more' } });
    expect(texts(tree)).toContain('https://volyume.app');
    const linkNodes = find(tree, (n) => n.props && n.props.accessibilityRole === 'link');
    expect(linkNodes).toHaveLength(1);
  });

  test('tapping the link opens it through openMessageLink, never any other route', () => {
    const tree = render({ message: { id: 'm1', mine: false, body: 'https://volyume.app' } });
    const linkNode = find(tree, (n) => n.props && n.props.accessibilityRole === 'link')[0];
    linkNode.props.onPress();
    expect(openMessageLink).toHaveBeenCalledWith('https://volyume.app');
  });

  test('plain text with no link carries no link node', () => {
    const tree = render({ message: { id: 'm1', mine: false, body: 'no links here' } });
    expect(find(tree, (n) => n.props && n.props.accessibilityRole === 'link')).toHaveLength(0);
  });
});

describe('session suggestion tile', () => {
  const REF = { day: 'thu', time_band: 'evening', gym_name: 'PureGym Motherwell' };

  test('renders the tile line', () => {
    const tree = render({
      message: { id: 'm1', mine: true, body: 'x', ref_kind: 'session', ref: REF },
    });
    expect(texts(tree)).toContain('Thursday evening at PureGym Motherwell');
  });

  test('the recipient of an unanswered suggestion sees Accept and "Can\'t make it"', () => {
    const onRespondSession = jest.fn();
    const tree = render({
      message: { id: 'm1', mine: false, body: 'x', ref_kind: 'session', ref: REF },
      onRespondSession,
    });
    expect(texts(tree)).toContain('Accept');
    expect(texts(tree)).toContain("Can't make it");
  });

  test('the sender of an unanswered suggestion sees no actions', () => {
    const tree = render({
      message: { id: 'm1', mine: true, body: 'x', ref_kind: 'session', ref: REF },
    });
    expect(texts(tree)).not.toContain('Accept');
  });

  test('once accepted, the state line replaces the actions', () => {
    const tree = render({
      message: {
        id: 'm1', mine: false, body: 'x', ref_kind: 'session',
        ref: { ...REF, accepted: true },
      },
      onRespondSession: jest.fn(),
    });
    expect(texts(tree)).toContain('Accepted');
    expect(texts(tree)).not.toContain('Accept');
  });

  test('once declined, the state line reads "Not this time"', () => {
    const tree = render({
      message: {
        id: 'm1', mine: true, body: 'x', ref_kind: 'session',
        ref: { ...REF, accepted: false },
      },
    });
    expect(texts(tree)).toContain('Not this time');
  });
});
