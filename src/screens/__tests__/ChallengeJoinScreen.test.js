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
 *
 * Review round 2 (client findings): the device's own wellbeing gate hides the
 * food and weigh-in rows and the invitation to log either, even when nothing
 * server side says so; an ended, closed or cancelled challenge shows a calm
 * sentence with no Join, no scoring table and no free-for-life offer; with
 * nothing beneath the screen (a link opened an unopened Community tab) a join
 * replaces to the challenge and the busy state always resets; joining sets
 * the primary gym without wiping the other gyms; the terms button needs a URL
 * and opens it as given.
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
let mockSuppressed = false;

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
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => mockSuppressed }));
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

const {
  CHALLENGE_CONSENT_TEXT, CHALLENGE_CONSENT_VERSION, CHALLENGE_FINISHED_LINE, FREE_FOR_LIFE_JOIN_LINE,
} = require('../../lib/challenges/copy');
const ChallengeJoinScreen = require('../ChallengeJoinScreen').default;

const CODE = 'volt-nov-3f9a1c2e';
const TERMS = 'https://volyume.app/challenge-terms/?c=volt-nov-3f9a1c2e';
const CHALLENGE = {
  id: 'c1', code: CODE, title: 'Volt Gym November', gym_name: 'Volt Gym', gym_id: 'g1',
  starts_on: '2026-11-01', ends_on: '2026-11-30', status: 'upcoming',
  prize_main: 'Six months free', prize_second: 'A hamper', main_threshold: 70, second_threshold: 50,
  terms_url: TERMS, joined: false, withdrawn: false,
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

async function mount(params = { code: CODE }, nav = navigation) {
  let r;
  await act(async () => { r = create(<ChallengeJoinScreen navigation={nav} route={{ params }} />); });
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSuppressed = false;
  mockStore = { user: { id: 'u1' }, userProfile: { firstName: 'Sam' } };
  mockLookup.mockResolvedValue({ ...CHALLENGE });
  mockJoin.mockResolvedValue({ challenge_id: 'c1', joined: true });
  mockPeek.mockResolvedValue(null);
  mockClear.mockResolvedValue();
  mockSetFlag.mockResolvedValue();
  mockSetGyms.mockResolvedValue({});
  mockLoadMe.mockResolvedValue({ me: { profile: null } });
});

const CONSENT = 'To score you, the challenge reads your training, your check-ins and Community posts, '
  + 'whether you logged food, whether you weighed in, and whether calm mode is on, so it never asks you to '
  + 'log food or weigh in at those times. It never reads what you ate or what you weigh. If you are in the '
  + 'top 10, your name and score are shown to other entrants. If you win, your name and county are '
  + 'published, and you can object. You can leave the challenge at any time.';

// A stack with the join screen alone in it (a link opened a Community tab that
// was never opened) or with the hub beneath it. canGoBack stays true in both,
// as it does in the app: the parent tab navigator can always go back to the
// first tab.
const aloneNav = (extra = {}) => ({
  replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn(), canGoBack: () => true,
  getState: () => ({ routeNames: ['Community', 'ChallengeJoin', 'Challenge'], routes: [{ name: 'ChallengeJoin' }] }),
  ...extra,
});
const stackedNav = () => aloneNav({
  getState: () => ({
    routeNames: ['Community', 'ChallengeJoin', 'Challenge'], routes: [{ name: 'Community' }, { name: 'ChallengeJoin' }],
  }),
});

async function joinNow(r) {
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
}

test('shows the challenge, prizes, scoring with coaching marked, and the verbatim consent text', async () => {
  const r = await mount();
  const text = allText(r);
  expect(text).toContain('Volt Gym November');
  expect(text).toContain('Six months free');
  expect(text).toContain('Weekly check-in (with coaching)');
  expect(text).toContain('Food logging (with coaching)');
  expect(text).toContain('Weekly weigh-in (with coaching)');
  expect(text).toContain('Coaching adds up to 20 more points. Without it you can still reach 80.');
  expect(text).toContain(CHALLENGE_CONSENT_TEXT);
  expect(CHALLENGE_CONSENT_TEXT).toBe(CONSENT);
  expect(CHALLENGE_CONSENT_VERSION).toBe('challenge_consent_v2');
  expect(CHALLENGE_CONSENT_TEXT).toContain('It never reads what you ate or what you weigh.');
  expect(mockLookup).toHaveBeenCalledWith(CODE);
  expect(text).toContain('Completing a challenge with a final score of 50 or more earns free for life.');
  expect(FREE_FOR_LIFE_JOIN_LINE).toBe('Completing a challenge with a final score of 50 or more earns free for life.');
});

test('the device gate alone (server silent) leaves out the food and weigh-in rows and the invitation to log', async () => {
  mockSuppressed = true;
  const r = await mount();
  const text = allText(r);
  expect(text).toContain('Train to your plan');
  expect(text).toContain('Weekly check-in (with coaching)');
  expect(text).not.toContain('Food logging');
  expect(text).not.toContain('Weekly weigh-in');
  expect(text).not.toContain('Coaching adds up to 20 more points');
  expect(text).toContain('Weekly check-ins with coaching add up to 10 more points.');
  // Joining itself still works for a withheld person.
  await joinNow(r);
  expect(mockJoin).toHaveBeenCalledTimes(1);
});

test('landing page carries the free-for-life line verbatim', () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'c', 'index.html'), 'utf8');
  // The page carries the app's own line and nothing about price beside it.
  const line = 'Completing a challenge with a final score of 50 or more earns free for life.';
  expect(FREE_FOR_LIFE_JOIN_LINE).toBe(line);
  expect(html).toContain(`>${line}</p>`);
  expect(html).not.toContain('Volyume is free');
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

test('join: calls the api, flags for this user, clears the code, toasts and continues to StartChoice', async () => {
  const r = await mount();
  await act(async () => { tick(r).props.onPress(); });
  await act(async () => { nameInput(r).props.onChangeText('Sam K'); });
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockJoin).toHaveBeenCalledWith({
    code: CODE, displayMode: 'name', displayName: 'Sam K', plannedPerWeek: 4,
    consentVersion: 'challenge_consent_v2', adult: true,
  });
  expect(mockSetFlag).toHaveBeenCalledWith('u1');
  expect(mockClear).toHaveBeenCalled();
  expect(mockSetGyms).not.toHaveBeenCalled(); // no Community profile
  expect(mockToastShow).toHaveBeenCalledWith("You're in.", expect.anything());
  expect(navigation.replace).toHaveBeenCalledWith('StartChoice');
});

test('a Community profile with no gym gets the challenge gym; one with a gym keeps it', async () => {
  mockLoadMe.mockResolvedValue({ me: { profile: { handle: 'sam', gym_id: null } } });
  let r = await mount();
  await joinNow(r);
  expect(mockSetGyms).toHaveBeenCalledWith('g1', []);

  jest.clearAllMocks();
  mockLookup.mockResolvedValue({ ...CHALLENGE });
  mockJoin.mockResolvedValue({ challenge_id: 'c1', joined: true });
  mockPeek.mockResolvedValue(null);
  mockLoadMe.mockResolvedValue({ me: { profile: { handle: 'sam', gym_id: 'other' } } });
  r = await mount();
  await joinNow(r);
  expect(mockSetGyms).not.toHaveBeenCalled();
});

test('setting the primary gym keeps the other gyms the person already listed', async () => {
  mockLoadMe.mockResolvedValue({
    me: { profile: { handle: 'sam', gym_id: null, other_gym_ids: ['g2', 'g1', 'g3', 7] } },
  });
  const r = await mount();
  await joinNow(r);
  // The challenge gym is not repeated in the others, and nothing else is lost.
  expect(mockSetGyms).toHaveBeenCalledTimes(1);
  expect(mockSetGyms).toHaveBeenCalledWith('g1', ['g2', 'g3']);
});

test('the profile is read fresh before the gym is written; a failed read writes nothing', async () => {
  mockLoadMe.mockResolvedValueOnce({ me: { profile: null } }); // the screen's own load
  mockLoadMe.mockResolvedValueOnce({ me: { profile: { handle: 'sam', gym_id: 'elsewhere' } } }); // the fresh read
  const r = await mount();
  await joinNow(r);
  expect(mockLoadMe).toHaveBeenLastCalledWith({ force: true, userId: 'u1' });
  expect(mockSetGyms).not.toHaveBeenCalled();
});

test('a failed join toasts calmly, does not continue and can be retried', async () => {
  mockJoin.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'network' }));
  const r = await mount();
  await joinNow(r);
  expect(mockToastShow).toHaveBeenCalledWith(expect.stringContaining('No connection'), { variant: 'error' });
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(button(r, 'Join the challenge').props.disabled).toBe(false);
  expect(button(r, 'Join the challenge').props.loading).toBe(false);
  await act(async () => { await button(r, 'Join the challenge').props.onPress(); });
  expect(mockJoin).toHaveBeenCalledTimes(2);
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
  const r = await mount({ code: CODE }, nav);
  await act(async () => { await button(r, 'Not now').props.onPress(); });
  expect(nav.goBack).toHaveBeenCalled();
});

test('a join with a screen beneath goes back to it', async () => {
  const nav = stackedNav();
  const r = await mount({ code: CODE }, nav);
  await joinNow(r);
  expect(nav.goBack).toHaveBeenCalledTimes(1);
  expect(nav.replace).not.toHaveBeenCalled();
});

test('a join on an unopened Community tab replaces to the challenge, and the busy state is cleared', async () => {
  const nav = aloneNav();
  const r = await mount({ code: CODE }, nav);
  await joinNow(r);
  expect(mockJoin).toHaveBeenCalledTimes(1);
  expect(nav.goBack).not.toHaveBeenCalled(); // canGoBack() is true, but only because of the parent tab
  expect(nav.replace).toHaveBeenCalledWith('Challenge', { id: 'c1' });
  // Had the navigation not moved, the screen would be live: it says so and does not offer Join again.
  expect(button(r, 'Join the challenge')).toBeUndefined();
  expect(allText(r)).toContain("You're already in this challenge");
  expect(button(r, 'Go to the challenge')).toBeDefined();
});

test('if navigation throws after a successful join the join is not reported as failed and the screen stays usable', async () => {
  const nav = aloneNav({ replace: jest.fn(() => { throw new Error('no such route'); }) });
  const r = await mount({ code: CODE }, nav);
  await joinNow(r);
  expect(mockJoin).toHaveBeenCalledTimes(1);
  expect(require('../../lib/errorLog').logError).toHaveBeenCalledWith('ChallengeJoinScreen.continue', expect.any(Error));
  expect(mockToastShow).toHaveBeenCalledWith("You're in.", expect.anything());
  expect(mockToastShow).not.toHaveBeenCalledWith(expect.stringContaining('did not go through'), expect.anything());
  expect(button(r, 'Join the challenge')).toBeUndefined();
  expect(button(r, 'Go to the challenge')).toBeDefined();
});

test('Not now on an unopened Community tab goes to the hub instead of doing nothing', async () => {
  const nav = aloneNav();
  const r = await mount({ code: CODE }, nav);
  await act(async () => { await button(r, 'Not now').props.onPress(); });
  expect(mockClear).toHaveBeenCalled();
  expect(nav.goBack).not.toHaveBeenCalled();
  expect(nav.replace).toHaveBeenCalledWith('Community');
});

test('already joined: says so and offers the challenge route', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true });
  const nav = { ...navigation, getState: () => ({ routeNames: ['Community', 'ChallengeJoin'] }), navigate: jest.fn() };
  const r = await mount({ code: CODE }, nav);
  expect(allText(r)).toContain("You're already in this challenge");
  expect(tick(r)).toBeUndefined();
  await act(async () => { button(r, 'Go to the challenge').props.onPress(); });
  expect(nav.navigate).toHaveBeenCalledWith('Challenge', { id: 'c1' });
});

test('already joined on an unopened Community tab replaces to the challenge', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true });
  const nav = aloneNav();
  const r = await mount({ code: CODE }, nav);
  await act(async () => { button(r, 'Go to the challenge').props.onPress(); });
  expect(nav.replace).toHaveBeenCalledWith('Challenge', { id: 'c1' });
  expect(nav.navigate).not.toHaveBeenCalled();
});

test('already joined in onboarding continues to StartChoice', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true });
  const r = await mount();
  await act(async () => { button(r, 'Continue').props.onPress(); });
  expect(navigation.replace).toHaveBeenCalledWith('StartChoice');
});

test('a withdrawn entrant can join again', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, joined: true, withdrawn: true });
  const r = await mount();
  expect(tick(r)).toBeDefined();
});

test.each(['ended', 'closed', 'cancelled'])('the %s challenge shows a calm sentence, and no Join, scoring or free-for-life offer', async (status) => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, status });
  const r = await mount();
  const text = allText(r);
  expect(CHALLENGE_FINISHED_LINE).toBe('This challenge has finished. Thank you to everyone who took part.');
  expect(text).toContain(CHALLENGE_FINISHED_LINE);
  expect(text).toContain('Volt Gym November');
  expect(button(r, 'Join the challenge')).toBeUndefined();
  expect(tick(r)).toBeUndefined();
  expect(text).not.toContain('How you score');
  expect(text).not.toContain('Coaching adds up to');
  expect(text).not.toContain('Prizes');
  expect(text).not.toContain('earns free for life');
  expect(text).not.toContain(CHALLENGE_CONSENT_TEXT);
  expect(button(r, 'Read the full terms')).toBeUndefined();
  // The one button is a way out, and it clears the pending code.
  await act(async () => { await button(r, 'Continue').props.onPress(); });
  expect(mockClear).toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('StartChoice');
});

test('upcoming and active challenges still offer Join and the free-for-life line', async () => {
  for (const status of ['upcoming', 'active']) {
    mockLookup.mockResolvedValue({ ...CHALLENGE, status });
    const r = await mount();
    expect(button(r, 'Join the challenge')).toBeDefined();
    expect(allText(r)).toContain(FREE_FOR_LIFE_JOIN_LINE);
    expect(allText(r)).not.toContain(CHALLENGE_FINISHED_LINE);
  }
});

test('a finished challenge you took part in still lets you open it, and outside onboarding "Go back" goes back', async () => {
  mockLookup.mockResolvedValue({ ...CHALLENGE, status: 'closed', joined: true });
  const nav = stackedNav();
  let r = await mount({ code: CODE }, nav);
  expect(allText(r)).toContain(CHALLENGE_FINISHED_LINE);
  await act(async () => { button(r, 'Go to the challenge').props.onPress(); });
  expect(nav.navigate).toHaveBeenCalledWith('Challenge', { id: 'c1' });

  mockLookup.mockResolvedValue({ ...CHALLENGE, status: 'ended' });
  const nav2 = stackedNav();
  r = await mount({ code: CODE }, nav2);
  await act(async () => { await button(r, 'Go back').props.onPress(); });
  expect(nav2.goBack).toHaveBeenCalled();
});

test('the terms button opens the URL exactly as given, and is not shown without one', async () => {
  const { Linking } = require('react-native');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  let r = await mount();
  await act(async () => { button(r, 'Read the full terms').props.onPress(); });
  expect(open).toHaveBeenCalledWith(TERMS);

  for (const terms_url of [undefined, null, '']) {
    mockLookup.mockResolvedValue({ ...CHALLENGE, terms_url });
    r = await mount();
    expect(button(r, 'Read the full terms')).toBeUndefined();
  }
  open.mockRestore();
});

test('no such challenge: calm message and a way to type a code', async () => {
  mockLookup.mockResolvedValue(null);
  const r = await mount();
  expect(allText(r)).toContain('We could not find that challenge.');
  expect(button(r, 'Find challenge')).toBeDefined();
});

test('with no link param it uses the pending code', async () => {
  mockPeek.mockResolvedValue(CODE);
  await mount({});
  expect(mockLookup).toHaveBeenCalledWith(CODE);
});

test('source guards: no em dash, no billing words, no hard-coded colours', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'ChallengeJoinScreen.js'), 'utf8');
  expect(src).not.toMatch(/—/);
  expect(src).not.toMatch(/\b(pro|premium|subscribe|trial|paywall|pricing)\b/i);
  expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  // The device's own wellbeing gate is read through the shared hook, never re-implemented.
  expect(src).toMatch(/import usePhotoSuppression from '\.\.\/hooks\/usePhotoSuppression';/);
  expect(src).toMatch(/joinScoring\(deviceWithheld\)/);
});
