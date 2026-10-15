/**
 * D228 item 2, tier c (founder 2026-10-15): the Athlete profile's Body weight
 * tile and its "N x body weight" lift lines are weight figures. Under an OPEN
 * FLAG, a failed read or the unknown state the tile reads "Kept in Body
 * metrics" with no sub line and the lift lines print no ratio; under calm
 * alone, and for everyone who is neither calm nor flagged, nothing differs.
 * Written to FAIL if any of those four states drifts. The physique tile keeps
 * its own hook gate (AthleteProfileScreen.physiqueTile.guard.test.js).
 *
 * The real screen is mounted over a mocked data boundary; the safety hook is
 * driven with states the real pure derivation produced.
 */
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/BackHeader', () => 'BackHeader');
jest.mock('../../components/BottomSheet', () => 'BottomSheet');
jest.mock('../../components/ProfileAvatarMark', () => 'ProfileAvatarMark');
jest.mock('../../components/InfoTooltip', () => 'InfoTooltip');
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));
const mockSafety = { current: null };
jest.mock('../../hooks/useSafetyState', () => ({ __esModule: true, default: () => mockSafety.current }));
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getBodyMetricLog: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getExerciseLookup: jest.fn(),
  getLatestBodyComposition: jest.fn(),
  getLatestBodyWeight: jest.fn(),
}));
jest.mock('../../lib/progressScanStore', () => ({ getProgressScanCoachSummary: jest.fn(async () => null) }));
jest.mock('../../lib/profileAvatar', () => ({ saveAvatarPhoto: jest.fn(), deleteAvatarPhoto: jest.fn() }));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import * as db from '../../lib/database';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { deriveSafetyState, SAFETY_STATE_UNKNOWN } from '../../lib/safetyState';
import AthleteProfileScreen, { bodyWeightTile, liftBaselineSub } from '../AthleteProfileScreen';

const STATES = {
  normal: deriveSafetyState({ mode: 'normal', edFlag: null }),
  calm: deriveSafetyState({ mode: 'calm', edFlag: null }),
  flag: deriveSafetyState({ mode: 'normal', edFlag: { id: 'f1' } }),
  flagReadFailed: deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }),
  wellbeingReadFailed: deriveSafetyState({ mode: 'read_failed', edFlag: null }),
  unknown: SAFETY_STATE_UNKNOWN,
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}
async function flush() {
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
}

// One stable store object: the screen's load callback depends on userProfile,
// so a fresh object per read would reload on every render.
const STORE = {
  user: { id: 'u1', email: 'a@b.co' },
  userProfile: { firstName: 'Sam' },
  units: 'kg',
  bodyWeightUnits: 'kg',
  saveLocalProfile: jest.fn(),
};

// A bench press at ~120 kg estimated against an 82.5 kg body weight: a ratio
// (about 1.45x) and a next level to reach.
async function mount() {
  useAppStore.mockImplementation((sel) => sel(STORE));
  const now = Date.now();
  db.getAllWorkouts.mockResolvedValue([{ isCompleted: true, endedAt: now }]);
  db.getCompletedWorkoutSets.mockResolvedValue([
    { exerciseId: 'bench', workoutId: 'w1', weight: 100, actualReps: 5, createdAt: now - 1000, setType: 'straight' },
  ]);
  db.getExerciseLookup.mockResolvedValue(buildExerciseLookup([{ id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' }]));
  db.getLatestBodyWeight.mockResolvedValue({ weightKg: 82.5, loggedAt: now });
  db.getLatestBodyComposition.mockResolvedValue(null);
  db.getBodyMetricLog.mockResolvedValue([]);
  let tree;
  await act(async () => { tree = create(<AthleteProfileScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />); });
  await flush();
  return tree;
}

beforeEach(() => { mockSafety.current = STATES.normal; });
afterEach(() => jest.clearAllMocks());

describe('AthleteProfileScreen - weight figures under the safety state (D228 item 2, tier c)', () => {
  test('not calm and not flagged: the tile shows the weight and its date, the lift line its ratio, as before', async () => {
    const text = flattenText((await mount()).toJSON());
    expect(text).toContain('Body weight');
    expect(text).toContain('82.5 kg');
    expect(text).toMatch(/Logged \d/);
    expect(text).toMatch(/\d\.\d\dx body weight/);
    expect(text).not.toContain('Kept in Body metrics');
  });

  test('calm alone: nothing differs, the figures stay', async () => {
    mockSafety.current = STATES.calm;
    const text = flattenText((await mount()).toJSON());
    expect(text).toContain('82.5 kg');
    expect(text).toMatch(/\d\.\d\dx body weight/);
    expect(text).not.toContain('Kept in Body metrics');
  });

  test.each([
    ['an open flag', 'flag'],
    ['a failed flag read', 'flagReadFailed'],
    ['a failed wellbeing read', 'wellbeingReadFailed'],
    ['the unknown state', 'unknown'],
  ])('%s: "Kept in Body metrics", no weight, no date, no ratio; the lift and its level stay', async (_l, key) => {
    mockSafety.current = STATES[key];
    const text = flattenText((await mount()).toJSON());
    expect(text).toContain('Body weight');
    expect(text).toContain('Kept in Body metrics');
    expect(text).not.toContain('82.5');
    expect(text).not.toMatch(/Logged \d/);
    expect(text).not.toMatch(/x body weight|% body weight/);
    expect(text).toContain('Barbell Bench Press'); // the lift itself stays
    expect(text).toMatch(/(Beginner|Novice|Intermediate|Advanced|Elite)/); // with its level word
  });
});

describe('bodyWeightTile and liftBaselineSub (pure)', () => {
  test('the kept line is the one the lane names', () => {
    expect(bodyWeightTile({ withheld: true }).value).toBe('Kept in Body metrics');
  });

  const level = { ratio: 1.45, label: 'Intermediate', nextLabel: 'Advanced', nextTarget: 140 };
  const row = { bestE1rm: 120 };

  test('bodyWeightTile: not withheld passes the screen text through untouched', () => {
    expect(bodyWeightTile({ withheld: false, weightText: '82.5 kg', weightTileSub: 'Logged 1 Oct 2026' }))
      .toEqual({ value: '82.5 kg', sub: 'Logged 1 Oct 2026' });
  });
  test('bodyWeightTile: withheld is the kept line and no sub', () => {
    expect(bodyWeightTile({ withheld: true, weightText: '82.5 kg', weightTileSub: 'Logged 1 Oct 2026' }))
      .toEqual({ value: 'Kept in Body metrics', sub: null });
  });
  test('liftBaselineSub: not withheld is the ratio then the distance, exactly as before', () => {
    expect(liftBaselineSub({ level, row, units: 'kg', withheld: false })).toBe('1.45x body weight - 20.0 kg to Advanced');
    expect(liftBaselineSub({ level: { ...level, ratio: 0.8 }, row, units: 'kg', withheld: false })).toBe('80% body weight - 20.0 kg to Advanced');
    expect(liftBaselineSub({ level: { ...level, nextLabel: null, nextTarget: null }, row, units: 'kg', withheld: false })).toBe('1.45x body weight');
  });
  test('liftBaselineSub: withheld drops the ratio and keeps the distance; none left is no line', () => {
    expect(liftBaselineSub({ level, row, units: 'kg', withheld: true })).toBe('20.0 kg to Advanced');
    expect(liftBaselineSub({ level: { ...level, nextLabel: null, nextTarget: null }, row, units: 'kg', withheld: true })).toBeNull();
  });
});
