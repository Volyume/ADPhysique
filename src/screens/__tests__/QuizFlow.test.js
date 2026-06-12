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

import useAppStore from '../../store/useAppStore';
import QuizScreen from '../QuizScreen';
import PlanPreviewScreen from '../PlanPreviewScreen';

const store = { onboardingQuiz: {}, setQuizField: jest.fn(), markQuizStep: jest.fn() };

function texts(tree) {
  return tree.root.findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c) => typeof c === 'string');
}
const nav = { navigate: jest.fn() };

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
    const chip = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && typeof n.props.onPress === 'function')[0];
    act(() => chip.props.onPress());
    expect(store.setQuizField).toHaveBeenCalled();
  });
});

describe('PlanPreviewScreen', () => {
  test('shows the built plan and the calories-come-later note', () => {
    store.onboardingQuiz = { daysPerWeek: 4, trainingGoal: 'classic_physique', sessionLengthMinutes: 60 };
    let tree;
    act(() => { tree = create(<PlanPreviewScreen navigation={nav} />); });
    const t = texts(tree).join(' ');
    expect(t).toContain('Upper / Lower');
    expect(t).toContain('they need your weight');
    expect(t).toContain('Create an account to keep it');
  });

  test('the CTA routes to the account wall flagged fromQuiz', () => {
    store.onboardingQuiz = { daysPerWeek: 3, trainingGoal: 'general' };
    let tree;
    act(() => { tree = create(<PlanPreviewScreen navigation={nav} />); });
    const cta = tree.root.findAll((n) => n.props.accessibilityLabel === 'Create an account to keep your plan')[0];
    act(() => cta.props.onPress());
    expect(nav.navigate).toHaveBeenCalledWith('Login', { intent: 'pro_signup', fromQuiz: true });
  });
});
