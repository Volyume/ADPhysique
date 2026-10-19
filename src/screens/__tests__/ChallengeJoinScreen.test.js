/**
 * ChallengeJoinScreen.test.js
 *
 * Gym challenge SPEC sections 2 (step 6) and 5. Pins: the consent text is
 * shown verbatim; Join does nothing until "I am 18 or over" is ticked (no
 * default tick) and, in name mode, a name is typed; a successful join sends
 * the right call, sets the gym only when the person has a Community profile
 * with no gym, toasts "You're in." and continues; "Not now" clears the
 * pending code and continues; an already joined person is told so; a missing
 * challenge shows a calm message.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
const mockLookup = jest.fn();
const mockJoin = jest.fn();
const mockClear = jest.fn();
const mockPeek = jest.fn();
const mockSetFlag = jest.fn();
const mockSetGyms = jest.fn();
const mockLoadMe = jest.fn();
let mockStore;

jest.mock('../../store/useAppStore', () => {
  const fn = (sel) => sel(mockStore);
  fn.getState = () => mockStore;
  return { __esModule: true, default: fn };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/challenges/api', () => ({
  lookupChallenge: (...a) => mockLookup(...a),
  joinChallenge: (...a) => mockJoin(...a),
}));
jest.mock('../../lib/challenges/pending', () => ({
  normaliseChallengeCode: (c) => (typeof c === 'string' && /^[a-z0-9-]{3,32}$/i.test(c) ? c.toLowerCase() : null),
  peekPendingChallenge: (...a) => mockPeek(...a),
  clearPendingChallenge: (...a) => mockClear(...a),
  setChallengeActiveFlag: (...a) => mockSetFlag(...a),
}));
jest.mock('../../lib/challenges/plannedPerWeek', () => ({ readPlannedPerWeek: jest.fn(async () => 4) }));
jest.mock('../../lib/community/profile', () => ({
  loadMe: (...a) => mockLoadMe(...a),
  hasProfile: (me) => !!me?.profile?.handle,
}));
jest.mock('../../lib/gyms', () => ({ setGyms: (...a) => mockSetGyms(...a) }));
jest.mock('../../components/Card', () => ({ children }) => children);
jest.mock('../../components/Button', () => (props) => {
  const React = require('react');
  return React.createElement('Button', props);
});
jest.mock('../../components/ConsentCheckboxRow', () => (props) => {
  const React = require('react');
  return React.createElement('ConsentCheckboxRow', props);
});

const { CHALLENGE_CONSENT_TEXT, FREE_FOR_LIFE_JOIN_LINE, FREE_FOR_LIFE_LANDING_LINE } = require('../../lib/challenges/copy');
const ChallengeJoinScreen = require('../ChallengeJoinScreen').default;

const CHALLENGE = {
  id: 'c1', code: 'volt-nov', title: 'Volt Gym November', gym_name: 'Volt Gym', gym_id: 'g1',
  starts_on: '2026-11-01', ends_on: '2026-11-30', status: 'upcoming',
  prize_main: 'Six months free', prize_second: 'A hamper', main_threshold: 70, second_threshold: 50,
  terms_url: 'https://volyume.app/terms/volt-nov', entrants: 3, joined: false, withdrawn: false,
};

const navigation = {
  replace: jest.fn(), goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn(),
  getState: () => ({ routeNames: ['ChallengeJoin', 'StartChoice'] }),
};

function allText(r) {
  return r.root.findAll((n) => typeof n.type === 'string' || typeof n.type === 'function')
    .flatMap((n) => n.children.filter((c) => typeof c === 'string')).join(' | ');
}
const button = (r, title) => r.root.findAll((n) => n.props && n.props.title === title && n.props.onPress)[0];
const tick = (r) => r.root.findAll((n) => n.props && n.props.label === 'I am 18 or over' && n.props.onPress)[0];
const nameInput = (r) => r.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Your first name and initial' && n.props.onChangeText)[0];

async function mount(params = { code: 'volt-nov' }, nav = navigation) {
  let r;
  await act(async () => { r = create(<ChallengeJoinScreen navigation={nav} route={{ params }} />); });
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore = { user: { id: 'u1' }, userProfile: { firstName: 'Sam' } };
  mockLookup.mockResolvedValue({ ...CHALLENGE });
  mockJoin.mockResolvedValue({ challenge_id: 'c1', joined: true });
  mockPeek.mockResolvedValue(null);
  mockClear.mockResolvedValue();
  mockSetFlag.mockResolvedValue();
  mockSetGyms.mockResolvedValue({});
  mockLoadMe.mockResolvedValue({ me: { profile: null } });
});

test('shows the challenge, prizes, scoring with coaching marked, and the verbatim consent text', async () => {
  const r = await mount();
  const text = allText(r);
  expect(text).toContain('Volt Gym November');
  expect(text).toContain('Six months free');
  expect(text).toContain('Weekly check-in (with coaching)');
  expect(text).toContain(CHALLENGE_CONSENT_TEXT);
  expect(CHALLENGE_CONSENT_TEXT).toContain('It never reads what you ate or what you weigh.');
  expect(mockLookup).toHaveBeenCalledWith('volt-nov');
  expect(text).toContain("Joining also keeps Volyume free for you for life, even if we ever introduce paid plans.");
  expect(FREE_FOR_LIFE_JOIN_LINE).toBe("Joining also keeps Volyume free for you for life, even if we ever introduce paid plans.");
});

test('landing page carries the free-for-life line verbatim', () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'c', 'index.html'), 'utf8');
  const line = 'Volyume is free. Join through the challenge and it stays free for you for life, even if we ever introduce paid plans.';
  expect(FREE_FOR_LIFE_LANDING_LINE).toBe(line);
  expect(html).toContain(line);
});

test('the adult tick starts unticked and Join does nothing until it is ticked', async () => {
  const r = await mount();
  expect(tick(r).props.checked).toBe(false);
  expect(button(r, 'Join the challenge').props.disabled).toBe(true);
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockJoin).not.toHaveBeenCalled();
  await act(async () => { tick(r).props.onPress(); });
  expect(button(r, 'Join the challenge').props.disabled).toBe(false);
});

test('name mode needs a name (prefilled from the account, clearable)', async () => {
  const r = await mount();
  expect(nameInput(r).props.value).toBe('Sam');
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { nameInput(r).props.onChangeText(''); });
  expect(button(r, 'Join the challenge').props.disabled).toBe(true);
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockJoin).not.toHaveBeenCalled();
  expect(nameInput(r).props.maxLength).toBe(30);
});

test('join: calls the api, flags, clears the code, toasts and continues to StartChoice', async () => {
  const r = await mount();
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { nameInput(r).props.onChangeText('Sam K'); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockJoin).toHaveBeenCalledWith({
    code: 'volt-nov', displayMode: 'name', displayName: 'Sam K', plannedPerWeek: 4,
    consentVersion: 'challenge_consent_v1', adult: true,
  });
  expect(mockSetFlag).toHaveBeenCalled();
  expect(mockClear).toHaveBeenCalled();
  expect(mockSetGyms).not.toHaveBeenCalled(); // no Community profile
  expect(mockToastShow).toHaveBeenCalledWith("You're in.", expect.anything());
  expect(navigation.replace).toHaveBeenCalledWith('StartChoice');
});

test('a Community profile with no gym gets the challenge gym; one with a gym keeps it', async () => {
  mockLoadMe.mockResolvedValue({ me: { profile: { handle: 'sam', gym_id: null } } });
  let r = await mount();
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockSetGyms).toHaveBeenCalledWith('g1');

  jest.clearAllMocks();
  mockLookup.mockResolvedValue({ ...CHALLENGE });
  mockJoin.mockResolvedValue({ challenge_id: 'c1', joined: true });
  mockPeek.mockResolvedValue(null);
  mockLoadMe.mockResolvedValue({ me: { profile: { handle: 'sam', gym_id: 'other' } } });
  r = await mount();
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockSetGyms).not.toHaveBeenCalled();
});

test('a failed join toasts calmly, does not continue and can be retried', async () => {
  mockJoin.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'network' }));
  const r = await mount();
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockToastShow).toHaveBeenCalledWith(expect.stringContaining('No connection'), { variant: 'error' });
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(button(r, 'Join the challenge').props.disabled).toBe(false);
});

test('Not now clears the pending code and continues', async () => {
  const r = await mount();
  await act(async () => { await button(r, 'Not now').props.onPress(); });
  expect(mockClear).toHaveBeenCalled();
  expect(mockJoin).not.toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('StartChoice');
});

test('outside onboarding, Not now goes back instead', async () => {
  const nav = { ...navigation, getState: () => ({ routeNames: ['Community', 'ChallengeJoin'] }), goBack: jest.fn() };
  const r = await mount({ code: 'volt-nov' }, nav);
  await act(async () => { await button(r, 'Not now').props.onPress(); });
  expect(nav.goBack).toHaveBeenCalled();
});

test('already joined: says so and offers the challenge route', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true });
  const nav = { ...navigation, getState: () => ({ routeNames: ['Community', 'ChallengeJoin'] }), navigate: jest.fn() };
  const r = await mount({ code: 'volt-nov' }, nav);
  expect(allText(r)).toContain("You're already in this challenge");
  expect(tick(r)).toBeUndefined();
  await act(async () => { button(r, 'Go to the challenge').props.onPress(); });
  expect(nav.navigate).toHaveBeenCalledWith('Challenge', { id: 'c1' });
});

test('a withdrawn entrant can join again', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true, withdrawn: true });
  const r = await mount();
  expect(tick(r)).toBeDefined();
});

test('no such challenge: calm message and a way to type a code', async () => {
  mockLookup.mockResolvedValue(null);
  const r = await mount();
  expect(allText(r)).toContain('We could not find that challenge.');
  expect(button(r, 'Find challenge')).toBeDefined();
});

test('with no link param it uses the pending code', async () => {
  mockPeek.mockResolvedValue('volt-nov');
  await mount({});
  expect(mockLookup).toHaveBeenCalledWith('volt-nov');
});

test('source guards: no em dash, no billing words, no hard-coded colours', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'ChallengeJoinScreen.js'), 'utf8');
  expect(src).not.toMatch(/—/);
  expect(src.replace(/free for you for life[^']*/, '')).not.toMatch(/\b(pro|premium|subscribe|trial|paywall|pricing)\b/i);
  expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
});
