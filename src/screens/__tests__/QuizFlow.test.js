/**
 * COMP-030 quiz-first screens — mount + the privacy-critical contract: the quiz
 * writes to the in-memory slice (never persisted) and the preview shows the
 * built plan with the no-calories-yet honesty note.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
// PlanPreviewScreen's CTA moved onto the shared Button primitive (design
// campaign 2026-07-09 Batch 2 wave B), which pulls in ../../lib/haptics ->
// expo-haptics; mock it the same way other Button-rendering screen tests do.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import useAppStore from '../../store/useAppStore';
import QuizScreen from '../QuizScreen';
import PlanPreviewScreen from '../PlanPreviewScreen';

const store = { onboardingQuiz: {}, setQuizField: jest.fn(), markQuizStep: jest.fn() };

function texts(tree) {
  return tree.root.findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c) => typeof c === 'string');
}
const nav = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  store.onboardingQuiz = {};
  useAppStore.mockImplementation((selector) => selector(store));
});

describe('QuizScreen', () => {
  test('renders both quiz sections', () => {
    let tree;
    act(() => { tree = create(<QuizScreen navigation={nav} />); });
    const t = texts(tree);
    expect(t).toContain('How do you train?');
    expect(t).toContain('What are you training for?');
  });

  test('selecting a chip writes to the in-memory slice', () => {
    let tree;
    act(() => { tree = create(<QuizScreen navigation={nav} />); });
    const groups = tree.root.findAll((n) => n.props.accessibilityRole === 'radiogroup');
    expect(groups.length).toBeGreaterThan(0);
    const chip = tree.root.findAll((n) => n.props.accessibilityRole === 'radio'
      && typeof n.props.onPress === 'function')[0];
    act(() => chip.props.onPress());
    expect(store.setQuizField).toHaveBeenCalled();
  });

  // Onboarding finish: every sibling wizard (ProOnboarding's fill bar,
  // FreeStarterScreen's dot row) shows progress; this single-page quiz had
  // no indicator at all. Pins the dot row (six questions, PHASE_PRE_ACCOUNT
  // is on) lighting up as fields are answered, first/middle/last.
  function findDots(tree) {
    // The dot row is the only accessibilityElementsHidden View; its children
    // are the individual dots.
    const row = tree.root.findAll((n) => n.props.accessibilityElementsHidden)[0];
    return row.props.children;
  }

  // CP-10 batch F (2026-07-11): QuizScreen now reads a live theme
  // (src/hooks/useTheme.js), so a dot's style is
  // [styles.dot, live.dot, i < answeredCount && [styles.dotActive, live.dotActive]]
  // -- the live.dot override sits at a fixed index 1 and is always present,
  // so "lit" now means the LAST array slot resolved truthy (the
  // styles.dotActive/live.dotActive pair), not merely that some
  // backgroundColor is present. Same contract as before, widened only for
  // the extra fixed slot the live insertion adds.
  function isLit(dot) {
    const style = dot.props.style;
    return Array.isArray(style) ? !!style[style.length - 1] : false;
  }

  test('progress indicator: no dots lit before any question is answered (first)', () => {
    store.onboardingQuiz = {};
    let tree;
    act(() => { tree = create(<QuizScreen navigation={nav} />); });
    const dots = findDots(tree);
    expect(dots.length).toBe(6);
    expect(dots.filter(isLit).length).toBe(0);
  });

  test('progress indicator: partial answers light the matching number of dots (middle)', () => {
    store.onboardingQuiz = { experience: 'beginner', daysPerWeek: 4, sessionLengthMinutes: 60 };
    let tree;
    act(() => { tree = create(<QuizScreen navigation={nav} />); });
    const dots = findDots(tree);
    expect(dots.length).toBe(6);
    expect(dots.filter(isLit).length).toBe(3);
  });

  test('progress indicator: every dot lit once all six questions are answered (last)', () => {
    store.onboardingQuiz = {
      experience: 'beginner',
      daysPerWeek: 4,
      sessionLengthMinutes: 60,
      equipment: 'full_gym',
      trainingGoal: 'general',
      trainingPhase: 'cut',
    };
    let tree;
    act(() => { tree = create(<QuizScreen navigation={nav} />); });
    const dots = findDots(tree);
    expect(dots.length).toBe(6);
    expect(dots.filter(isLit).length).toBe(6);
  });
});

describe('PlanPreviewScreen', () => {
  test('shows the built plan and the calories-come-later note', () => {
    store.onboardingQuiz = { daysPerWeek: 4, trainingGoal: 'classic_physique', sessionLengthMinutes: 60 };
    let tree;
    act(() => { tree = create(<PlanPreviewScreen navigation={nav} />); });
    const t = texts(tree).join(' ');
    // classic_physique is a specialised division: the preview names its split
    // from the division matrix (X-Frame), mirroring the builder — not the
    // generic day-count "Upper / Lower".
    expect(t).toContain('X-Frame');
    // Copy updated by the no-em-dash sweep: "come after — they need your weight"
    // -> "come after. They need your weight" (D4/em-dash campaign).
    expect(t).toContain('They need your weight');
    expect(t).toContain('Create an account to keep it');
  });

  test('the CTA routes to the account wall', () => {
    store.onboardingQuiz = { daysPerWeek: 3, trainingGoal: 'general' };
    let tree;
    act(() => { tree = create(<PlanPreviewScreen navigation={nav} />); });
    const cta = tree.root.findAll((n) => n.props.accessibilityLabel === 'Create an account to keep your plan')[0];
    act(() => cta.props.onPress());
    expect(nav.navigate).toHaveBeenCalledWith('Login');
  });
});
