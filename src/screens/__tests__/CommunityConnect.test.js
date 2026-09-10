/**
 * ConnectButton and ConnectSheet (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 1,
 * 6, 10; SD-20, SD-32).
 *
 * What this suite pins:
 *
 *   1. `shouldOfferConnect`: the four cases nobody gets a Connect control
 *      at all (a minor viewer, a minor target, your own card, a blocked
 *      person), so a minor never sees the button anywhere it renders
 *      (SD-32).
 *   2. The four button states read the four card states, and the two
 *      states that answer a request the recipient could not have
 *      predicted (Respond, and withdrawing a sent request) go through a
 *      confirm rather than firing instantly.
 *   3. `rules_outdated` on either surface calls `onRulesOutdated` instead
 *      of a toast: the screens route that straight to CommunityRules
 *      with the emphatic "Accept the updated rules" action.
 *   4. ConnectSheet pre-selects the reason the door it opened from
 *      implies (the partners list pre-selects "Want to train together?",
 *      SD-25), and sends the reasons and note it has on screen.
 *   5. "Same programme" is never offered as a selectable reason
 *      (communities revamp 2026-09-10, phase 0).
 *
 * The client library is mocked: this is about what the components do
 * with the connection state, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
// The Connected-state menu only ever matters here as a place to reach
// (see the withdraw/respond/remove flows below); rendering it for real
// needs a SafeAreaProvider this suite never mounts, so it uses the same
// visible-gated stand-in the rest of the app's screen suites already use.
jest.mock('../../components/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, children }) => (visible ? React.createElement(View, null, children) : null),
    // TextField reads this to pick BottomSheetTextInput vs the plain
    // TextInput; the mock above never provides it, so a real TextField
    // rendered under it (the note field, in ConnectSheet) needs a real
    // context object to read `false` from rather than `undefined`.
    InsideBottomSheetContext: React.createContext(false),
  };
});

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../lib/community', () => ({
  connectionState: (card) => {
    const v = card?.connection ?? null;
    return ['none', 'requested_by_me', 'requested_by_them', 'connected'].includes(v) ? v : 'none';
  },
  connect: jest.fn(),
  withdrawConnect: jest.fn(),
  respondToConnect: jest.fn(),
  removeConnection: jest.fn(),
  CONNECT_REASONS: {
    same_gym: 'Same gym',
    same_programme: 'Same programme',
    train_like_me: 'You train like me',
    train_together: 'Want to train together?',
  },
  MAX_CONNECT_REASONS: 2,
  CONNECT_NOTE_MAX: 120,
}));

import { appAlert } from '../../components/AppAlert';
import {
  connect, withdrawConnect, respondToConnect,
} from '../../lib/community';
import ConnectButton, {
  shouldOfferConnect, connectRefusalLine, connectDeniedByPreference,
} from '../../components/community/ConnectButton';
import ConnectSheet from '../../components/community/ConnectSheet';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });
}

function findByLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label && 'onPress' in n.props,
  )[0];
}

function card(over = {}) {
  return { user_id: 'u2', handle: 'priya_kb', connection: 'none', ...over };
}

const ME = { profile: { user_id: 'u1' }, is_minor: false };

beforeEach(() => { jest.clearAllMocks(); });

describe('shouldOfferConnect: nobody who cannot connect ever gets the control (SD-32)', () => {
  test('a minor VIEWER never sees a Connect control anywhere', () => {
    expect(shouldOfferConnect({ is_minor: true }, card())).toBe(false);
  });

  test('a minor TARGET is never offered one either', () => {
    expect(shouldOfferConnect(ME, card({ is_minor: true }))).toBe(false);
  });

  test('your own card is never offered a Connect button', () => {
    expect(shouldOfferConnect(ME, card({ user_id: 'u1' }))).toBe(false);
  });

  test('a blocked relationship is never offered one', () => {
    expect(shouldOfferConnect(ME, card({ relationship: { blocked: true } }))).toBe(false);
  });

  test('otherwise, yes', () => {
    expect(shouldOfferConnect(ME, card())).toBe(true);
  });

  // Migration 163, spec 1.1 C / 1.3: `can_connect === false` (the target's
  // own connect_from refuses the caller) hides Connect too, exactly like
  // the structural reasons above; the card is never removed from a list
  // for it, only this control.
  test('can_connect === false hides Connect, just like the structural reasons', () => {
    expect(shouldOfferConnect(ME, card({ can_connect: false }))).toBe(false);
  });

  test('can_connect === true (or absent, every pre-163 card) is unaffected', () => {
    expect(shouldOfferConnect(ME, card({ can_connect: true }))).toBe(true);
    expect(shouldOfferConnect(ME, card())).toBe(true);
  });
});

describe('connectDeniedByPreference: telling a preference refusal apart from a structural one', () => {
  test('true only when Connect would otherwise qualify but can_connect is false', () => {
    expect(connectDeniedByPreference(ME, card({ can_connect: false }))).toBe(true);
  });

  test('false when Connect is allowed', () => {
    expect(connectDeniedByPreference(ME, card({ can_connect: true }))).toBe(false);
  });

  test('false for every structural reason, even with can_connect false (never double-explained)', () => {
    expect(connectDeniedByPreference({ is_minor: true }, card({ can_connect: false }))).toBe(false);
    expect(connectDeniedByPreference(ME, card({ can_connect: false, is_minor: true }))).toBe(false);
    expect(connectDeniedByPreference(ME, card({ can_connect: false, user_id: 'u1' }))).toBe(false);
    expect(connectDeniedByPreference(
      ME,
      card({ can_connect: false, relationship: { blocked: true } }),
    )).toBe(false);
  });
});

describe('connectRefusalLine: every code names what happened, none of them reveal a decline', () => {
  test('connect_not_allowed names the setting, not the person', () => {
    expect(connectRefusalLine('connect_not_allowed')).toMatch(/chooses who can send them/);
  });

  test('a declined-or-withdrawn cool off never says which one happened', () => {
    expect(connectRefusalLine('not_allowed')).toBe('Not available just now. You can try again later.');
  });

  test('an unknown code still answers something calm', () => {
    expect(connectRefusalLine('a_future_code_nobody_wrote_yet')).toBe('Could not do that just now.');
  });
});

describe('ConnectButton: the four states', () => {
  test('none -> "Connect", primary', async () => {
    let tree;
    await act(async () => { tree = create(<ConnectButton card={card()} me={ME} />); });
    expect(flattenText(tree.toJSON())).toContain('Connect');
  });

  test('requested_by_me -> "Requested"', async () => {
    let tree;
    await act(async () => { tree = create(<ConnectButton card={card({ connection: 'requested_by_me' })} me={ME} />); });
    expect(flattenText(tree.toJSON())).toContain('Requested');
  });

  test('requested_by_them -> "Respond"', async () => {
    let tree;
    await act(async () => { tree = create(<ConnectButton card={card({ connection: 'requested_by_them' })} me={ME} />); });
    expect(flattenText(tree.toJSON())).toContain('Respond');
  });

  test('connected -> "Connected"', async () => {
    let tree;
    await act(async () => { tree = create(<ConnectButton card={card({ connection: 'connected' })} me={ME} />); });
    expect(flattenText(tree.toJSON())).toContain('Connected');
  });

  test('a minor viewer renders nothing at all', async () => {
    let tree;
    await act(async () => { tree = create(<ConnectButton card={card()} me={{ ...ME, is_minor: true }} />); });
    expect(tree.toJSON()).toBeNull();
  });
});

describe('ConnectButton: none -> a plain request with no reasons or note', () => {
  test('tapping Connect with no onConnect sends a complete request on its own', async () => {
    connect.mockResolvedValue({ user_id: 'u2', connection: 'requested_by_me' });
    const onChange = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card()} me={ME} onChange={onChange} />);
    });
    const btn = findByLabel(tree, 'Connect priya_kb');
    await act(async () => { btn.props.onPress(); });
    await flush();

    expect(connect).toHaveBeenCalledWith('u2', {});
    expect(onChange).toHaveBeenCalledWith({ user_id: 'u2', connection: 'requested_by_me' });
  });

  test('an onConnect prop opens the sheet instead of sending anything', async () => {
    const onConnect = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card()} me={ME} onConnect={onConnect} />);
    });
    const btn = findByLabel(tree, 'Connect priya_kb');
    await act(async () => { btn.props.onPress(); });

    expect(onConnect).toHaveBeenCalledWith(card());
    expect(connect).not.toHaveBeenCalled();
  });

  test('rules_outdated calls onRulesOutdated, never a toast', async () => {
    const err = new Error('rules_outdated'); err.code = 'rules_outdated';
    connect.mockRejectedValue(err);
    const onRulesOutdated = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card()} me={ME} onRulesOutdated={onRulesOutdated} />);
    });
    const btn = findByLabel(tree, 'Connect priya_kb');
    await act(async () => { btn.props.onPress(); });
    await flush();

    expect(onRulesOutdated).toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });
});

describe('ConnectButton: requested_by_me -> withdrawing is confirmed, and silent either way', () => {
  test('tapping Requested asks first; confirming calls withdrawConnect', async () => {
    withdrawConnect.mockResolvedValue({ user_id: 'u2', connection: 'none' });
    const onChange = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card({ connection: 'requested_by_me' })} me={ME} onChange={onChange} />);
    });
    const btn = findByLabel(tree, 'Requested priya_kb');
    await act(async () => { btn.props.onPress(); });

    expect(appAlert).toHaveBeenCalledWith(
      'Withdraw your request?',
      expect.stringMatching(/not told either way/),
      expect.any(Array),
    );
    const [, , buttons] = appAlert.mock.calls[0];
    const withdraw = buttons.find((b) => b.text === 'Withdraw');
    await act(async () => { withdraw.onPress(); });
    await flush();

    expect(withdrawConnect).toHaveBeenCalledWith('u2');
    expect(onChange).toHaveBeenCalledWith({ user_id: 'u2', connection: 'none' });
  });
});

describe('ConnectButton: requested_by_them -> Accept or Decline, decline stays silent', () => {
  function respondButtons(tree) {
    const btn = findByLabel(tree, 'Respond priya_kb');
    act(() => { btn.props.onPress(); });
    return appAlert.mock.calls[0][2];
  }

  test('Accept connects both people', async () => {
    respondToConnect.mockResolvedValue({ user_id: 'u2', connection: 'connected' });
    const onChange = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card({ connection: 'requested_by_them' })} me={ME} onChange={onChange} />);
    });
    const buttons = respondButtons(tree);
    const accept = buttons.find((b) => b.text === 'Accept');
    await act(async () => { accept.onPress(); });
    await flush();

    expect(respondToConnect).toHaveBeenCalledWith('u2', true);
    expect(onChange).toHaveBeenCalledWith({ user_id: 'u2', connection: 'connected' });
  });

  test('Decline never tells the requester anything', async () => {
    respondToConnect.mockResolvedValue({ user_id: 'u2', connection: 'none' });
    let tree;
    await act(async () => {
      tree = create(<ConnectButton card={card({ connection: 'requested_by_them' })} me={ME} />);
    });
    const buttons = respondButtons(tree);
    const decline = buttons.find((b) => b.text === 'Decline');
    await act(async () => { decline.onPress(); });
    await flush();

    expect(respondToConnect).toHaveBeenCalledWith('u2', false);
  });
});

describe('ConnectSheet: reasons, note, and the door it was opened from (SD-25)', () => {
  test('opened from the partners door, "Want to train together?" is pre-selected', async () => {
    let tree;
    await act(async () => {
      tree = create(
        <ConnectSheet visible card={card()} preselect={['train_together']} onClose={() => {}} />,
      );
    });
    const chip = tree.root.findAll(
      (n) => n.props?.label === 'Want to train together?' && 'selected' in n.props,
    )[0];
    expect(chip.props.selected).toBe(true);
  });

  // Communities revamp (2026-09-10), phase 0: the client never offers
  // "Same programme" as a reason to pick, even though CONNECT_REASONS
  // (mocked above with all four, matching the real, unchanged constant)
  // still carries it for the SQL cross-check guard.
  test('"Same programme" is never offered as a selectable reason', async () => {
    let tree;
    await act(async () => {
      tree = create(<ConnectSheet visible card={card()} onClose={() => {}} />);
    });
    const chips = tree.root.findAll((n) => 'selected' in n.props && 'label' in n.props);
    expect(chips.map((n) => n.props.label)).not.toContain('Same programme');
    expect(chips.map((n) => n.props.label)).toEqual([
      'Same gym', 'You train like me', 'Want to train together?',
    ]);
  });

  test('sending carries the chosen reasons and the trimmed note', async () => {
    connect.mockResolvedValue({ user_id: 'u2', connection: 'requested_by_me' });
    const onSent = jest.fn();
    const onClose = jest.fn();
    let tree;
    await act(async () => {
      tree = create(
        <ConnectSheet
          visible
          card={card()}
          preselect={['same_gym']}
          onSent={onSent}
          onClose={onClose}
        />,
      );
    });
    const field = tree.root.findAll((n) => n.props?.label === 'Note' && n.props?.onChangeText)[0];
    await act(async () => { field.props.onChangeText('  Fancy a session together?  '); });

    const send = findByLabel(tree, 'Send a connection request to @priya_kb');
    await act(async () => { send.props.onPress(); });
    await flush();

    expect(connect).toHaveBeenCalledWith('u2', {
      reasons: ['same_gym'], note: 'Fancy a session together?',
    });
    expect(onSent).toHaveBeenCalledWith({ user_id: 'u2', connection: 'requested_by_me' });
    expect(onClose).toHaveBeenCalled();
  });

  test('rules_outdated closes the sheet and calls onRulesOutdated, not a toast', async () => {
    const err = new Error('rules_outdated'); err.code = 'rules_outdated';
    connect.mockRejectedValue(err);
    const onClose = jest.fn();
    const onRulesOutdated = jest.fn();
    let tree;
    await act(async () => {
      tree = create(
        <ConnectSheet visible card={card()} onClose={onClose} onRulesOutdated={onRulesOutdated} />,
      );
    });
    const send = findByLabel(tree, 'Send a connection request to @priya_kb');
    await act(async () => { send.props.onPress(); });
    await flush();

    expect(onClose).toHaveBeenCalled();
    expect(onRulesOutdated).toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });
});
