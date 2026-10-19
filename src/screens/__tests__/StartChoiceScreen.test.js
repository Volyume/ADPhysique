/**
 * StartChoiceScreen.test.js
 *
 * Founder brief 2026-10-19 (coaching-first onboarding with an optional quick
 * start). Pins: both paths render; "Set up coaching" replaces to
 * ProOnboarding; each quick-start button saves coachingDeferred, sets the
 * landing tab and open route, then completes first run, in that order; a
 * double tap runs once; a failure logs and toasts without completing first
 * run; an existing draft replaces to ProOnboarding. Plus source guards: no em
 * dash or billing words in the screen, and PlansScreen consumes postSetupOpen
 * once.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
const mockLoadDraft = jest.fn();
const mockLogError = jest.fn();
const mockCalls = [];
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
jest.mock('../../lib/errorLog', () => ({ logError: (...a) => mockLogError(...a) }));
jest.mock('../../lib/proOnboardingDraft', () => ({ loadDraft: (...a) => mockLoadDraft(...a) }));
jest.mock('../../components/Card', () => ({ children }) => children);
jest.mock('../../components/Button', () => (props) => {
  const React = require('react');
  return React.createElement('Button', props);
});

const StartChoiceScreen = require('../StartChoiceScreen').default;

const navigation = { replace: jest.fn() };

function button(root, title) {
  return root.findAll((n) => n.props && n.props.title === title && n.props.onPress)[0];
}

async function mount() {
  let r;
  await act(async () => { r = create(<StartChoiceScreen navigation={navigation} />); });
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCalls.length = 0;
  mockLoadDraft.mockResolvedValue(null);
  mockStore = {
    user: { id: 'u1' },
    userProfile: { name: 'A' },
    saveLocalProfile: jest.fn(async (...a) => { mockCalls.push(['save', ...a]); }),
    setPostSetupLanding: jest.fn((v) => mockCalls.push(['landing', v])),
    setPostSetupOpen: jest.fn((v) => mockCalls.push(['open', v])),
    completeFirstRun: jest.fn(async () => { mockCalls.push(['complete']); }),
  };
});

describe('StartChoiceScreen', () => {
  it('renders both paths', async () => {
    const r = await mount();
    expect(button(r.root, 'Set up coaching')).toBeTruthy();
    expect(button(r.root, 'Pick a ready-made plan')).toBeTruthy();
    expect(button(r.root, 'Build my own')).toBeTruthy();
  });

  it('Set up coaching replaces to ProOnboarding', async () => {
    const r = await mount();
    button(r.root, 'Set up coaching').props.onPress();
    expect(navigation.replace).toHaveBeenCalledWith('ProOnboarding');
  });

  it.each([
    ['Pick a ready-made plan', 'PlanLibrary'],
    ['Build my own', 'ManualBuilder'],
  ])('%s saves, sets landing and route, then completes first run', async (title, route) => {
    const r = await mount();
    await act(async () => { await button(r.root, title).props.onPress(); });
    expect(mockCalls).toEqual([
      ['save', 'u1', { name: 'A', coachingDeferred: true }],
      ['landing', 'PlansTab'],
      ['open', route],
      ['complete'],
    ]);
  });

  it('a double tap runs once', async () => {
    const r = await mount();
    const b = button(r.root, 'Build my own');
    await act(async () => { await Promise.all([b.props.onPress(), b.props.onPress()]); });
    expect(mockStore.completeFirstRun).toHaveBeenCalledTimes(1);
  });

  it('a failure logs and toasts and does not complete first run', async () => {
    mockStore.saveLocalProfile = jest.fn().mockRejectedValue(new Error('boom'));
    const r = await mount();
    await act(async () => { await button(r.root, 'Build my own').props.onPress(); });
    expect(mockLogError).toHaveBeenCalledWith('StartChoiceScreen.quickStart', expect.any(Error));
    expect(mockToastShow).toHaveBeenCalled();
    expect(mockStore.completeFirstRun).not.toHaveBeenCalled();
  });

  it('an existing draft replaces straight to ProOnboarding', async () => {
    mockLoadDraft.mockResolvedValue({ step: 3, answers: { goal: 'cut' } });
    await mount();
    expect(navigation.replace).toHaveBeenCalledWith('ProOnboarding');
  });
});

describe('source guards', () => {
  const src = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

  it('screen copy has no em dash or billing words', () => {
    const s = src('screens/StartChoiceScreen.js');
    expect(s).not.toMatch(/—/);
    expect(s).not.toMatch(/trial|\bPro\b|upgrade|price|£/i);
  });

  it('PlansScreen consumes postSetupOpen once, then navigates', () => {
    const s = src('screens/PlansScreen.js');
    const read = s.indexOf('useAppStore.getState().postSetupOpen');
    const clear = s.indexOf('setPostSetupOpen(null)', read);
    const nav = s.indexOf('navigation.navigate(openRoute)', clear);
    expect(read).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(read);
    expect(nav).toBeGreaterThan(clear);
  });

  it('StartChoice is the first screen in ProOnboardingStack', () => {
    const s = src('navigation/RootNavigator.js');
    const body = s.slice(s.indexOf('function ProOnboardingStack()'));
    expect(body.indexOf('name="StartChoice"')).toBeGreaterThan(-1);
    expect(body.indexOf('name="StartChoice"')).toBeLessThan(body.indexOf('name="ProOnboarding"'));
  });
});

describe('the free band (founder brief 2026-10-19)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../StartChoiceScreen.js'), 'utf8');

  it('says everything is free, in full sentences', async () => {
    const r = await mount();
    const text = r.root.findAll((n) => typeof n.props?.children === 'string').map((n) => n.props.children).join(' | ');
    expect(text).toContain('The whole app is free');
    expect(text).toContain('Coaching, food logging, meal plans and Community are all included. There is no paid version and there are no adverts.');
  });

  it('uses the app note pattern, never amber spent on decoration (styling.md)', () => {
    expect(SRC).not.toMatch(/Free\. All of it\./);
    expect(SRC).not.toMatch(/backgroundColor: t\.colors\.primaryBg \}\]\} testID="start-choice-free"/);
    expect(SRC).toMatch(/<Card style=\{styles\.card\} testID="start-choice-free">/);
  });

  it('never repeats free in other words (founder: no card, no trial, no subscription, data lines)', () => {
    expect(SRC).not.toMatch(/no card|card details|no trial|no subscription|never sold|sell your data|all of it/i);
  });
});
