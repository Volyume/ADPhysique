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
jest.mock('../../components/BrandMark', () => ({ VolyumeIcon: () => null }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), error: jest.fn() }));
jest.mock('../../components/Button', () => (props) => {
  const React = require('react');
  return React.createElement('Button', props);
});

const StartChoiceScreen = require('../StartChoiceScreen').default;

const navigation = { replace: jest.fn() };

function byId(root, id) {
  return root.findAll((n) => n.props && n.props.testID === id && n.props.onPress)[0];
}

async function choose(r, key) {
  await act(async () => { byId(r.root, `start-choice-${key}`).props.onPress(); });
}

async function cont(r) {
  await act(async () => { await byId(r.root, 'start-choice-continue').props.onPress(); });
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
  it('offers the three ways to start, none pre-selected', async () => {
    const r = await mount();
    ['coaching', 'library', 'builder'].forEach((k) => {
      expect(byId(r.root, `start-choice-${k}`).props.accessibilityState).toEqual({ selected: false });
    });
  });

  it('Continue with nothing chosen shows the hint and goes nowhere', async () => {
    const r = await mount();
    await cont(r);
    const text = r.root.findAll((n) => typeof n.props?.children === 'string').map((n) => n.props.children).join(' | ');
    expect(text).toContain('Still needed: choose how you want to start.');
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(mockStore.completeFirstRun).not.toHaveBeenCalled();
  });

  it('coaching then Continue replaces to ProOnboarding', async () => {
    const r = await mount();
    await choose(r, 'coaching');
    await cont(r);
    expect(navigation.replace).toHaveBeenCalledWith('ProOnboarding');
  });

  it.each([
    ['library', 'PlanLibrary'],
    ['builder', 'ManualBuilder'],
  ])('%s then Continue saves, sets landing and route, then completes first run', async (key, route) => {
    const r = await mount();
    await choose(r, key);
    await cont(r);
    expect(mockCalls).toEqual([
      ['save', 'u1', { name: 'A', coachingDeferred: true }],
      ['landing', 'PlansTab'],
      ['open', route],
      ['complete'],
    ]);
  });

  it('a double tap runs once', async () => {
    const r = await mount();
    await choose(r, 'builder');
    const b = byId(r.root, 'start-choice-continue');
    await act(async () => { await Promise.all([b.props.onPress(), b.props.onPress()]); });
    expect(mockStore.completeFirstRun).toHaveBeenCalledTimes(1);
  });

  it('a failure logs and toasts and does not complete first run', async () => {
    mockStore.saveLocalProfile = jest.fn().mockRejectedValue(new Error('boom'));
    const r = await mount();
    await choose(r, 'builder');
    await cont(r);
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

describe('matches the onboarding wizard (founder 2026-10-19: match what is used everywhere)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../StartChoiceScreen.js'), 'utf8');
  const WIZ = fs.readFileSync(path.join(__dirname, '../ProOnboardingScreen.js'), 'utf8');
  const style = (src, name) => ((src.match(new RegExp(`\\n  ${name}: (\\{[^}]*\\})`)) || [])[1] || '')
    .replace(/\s+/g, ' ').replace(/,\s*\}/, ' }');

  it('the step title is the wizard title role (h2), not h1', () => {
    expect(SRC).toMatch(/\.\.\.t\.type\.h2, color: t\.colors\.textPrimary/);
    expect(SRC).not.toMatch(/type\.h1/);
    expect(WIZ).toMatch(/stepTitle: \{ \.\.\.t\.type\.h2/);
  });

  it('the option rows, badge, hint and button carry the wizard values', () => {
    expect(style(WIZ, 'scroll')).toBe(style(SRC, 'scroll'));
    expect(style(WIZ, 'primaryBtn')).toBe(style(SRC, 'primaryBtn'));
    expect(SRC).toMatch(/borderRadius: radius\.md, borderWidth: 1\.5, padding: spacing\.md, minHeight: 64/);
    expect(WIZ).toMatch(/borderWidth: 1\.5, borderColor: colors\.border, padding: spacing\.md,\s+minHeight: 64/);
    expect(SRC).toMatch(/title="Continue"\s+trailingIcon="arrow-forward"/);
    expect(SRC).not.toMatch(/variant="emphatic"/);
  });

  it('says coaching is free in a full sentence, nothing redundant or clipped', async () => {
    const r = await mount();
    const text = r.root.findAll((n) => typeof n.props?.children === 'string').map((n) => n.props.children).join(' | ');
    expect(text).toContain('Coaching is free, like everything else in Volyume. You can change your mind later.');
    expect(SRC).not.toMatch(/no card|card details|no trial|no subscription|never sold|sell your data|all of it/i);
  });
});
