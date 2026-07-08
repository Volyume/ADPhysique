/**
 * AthleteProfileScreen — physique-score / body-fat-log timestamp race
 * (ultimate audit 2026-07-08, item 8, Scout 5: "physique-score timestamp
 * race untested").
 *
 * shouldShowPhysiqueScore({ scan, bodyFat, bodyFatLoggedAt }) decides whether
 * the profile's stat tile shows the photo-scan Volyume Score or the raw body
 * fat percentage. scan.capturedAt and bodyFatLoggedAt are two independently
 * written timestamps (a progress scan and a manual body-fat log), so they can
 * arrive tied, out of order, missing, or corrupted (bad device clock / torn
 * sync merge landing a future-dated row). This suite pins that the gate
 * resolves deterministically and safely for every one of those cases, and
 * exercises the finiteMs clock-skew guard added alongside it.
 *
 * This does NOT touch coaching targets: the progress-scan feature stays
 * isolated by affectsTargets:false (untouched by this change), and this
 * suite only asserts on the local stat-tile gate.
 *
 * The screen require()s native/component/store modules that do not run
 * under the plain node test env, so they are mocked exactly like the
 * ExerciseDetailScreen pure-helper tests do it, purely so the module loads
 * and its exported pure helpers can be exercised directly.
 */

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../components/BackHeader', () => 'BackHeader');
jest.mock('../../components/Card', () => 'Card');
jest.mock('../../components/ProGate', () => ({ ProBadge: 'ProBadge' }));
jest.mock('../../components/Skeleton', () => ({ Skeleton: 'Skeleton' }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/EmptyState', () => 'EmptyState');
jest.mock('../../components/SectionLabel', () => 'SectionLabel');
jest.mock('../../components/BottomSheet', () => 'BottomSheet');
jest.mock('../../components/ProfileAvatarMark', () => 'ProfileAvatarMark');
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));
jest.mock('../../lib/database', () => ({
  getAllExercises: jest.fn(),
  getAllWorkouts: jest.fn(),
  getBodyMetricLog: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLatestBodyComposition: jest.fn(),
  getLatestBodyWeight: jest.fn(),
}));
jest.mock('../../lib/units', () => ({ formatBodyWeightShort: jest.fn() }));
jest.mock('../../lib/progressScanStore', () => ({ getProgressScanCoachSummary: jest.fn() }));
jest.mock('../../lib/profileAvatar', () => ({ saveAvatarPhoto: jest.fn(), deleteAvatarPhoto: jest.fn() }));
jest.mock('../../lib/profileAvatarPresets', () => ({ AVATAR_PRESETS: [], avatarPresetFor: jest.fn() }));
jest.mock('../../lib/profileFreshness', () => ({ buildProfileFreshness: jest.fn(), freshnessTone: jest.fn() }));
jest.mock('../../lib/athleteProfileAccessibility', () => ({
  buildProfileRowAccessibility: jest.fn(),
  profileRowStatusLabel: jest.fn(),
}));
jest.mock('../../lib/coachingGoals', () => ({ GOAL_LABELS: {}, PHASE_LABELS: {} }));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

const { shouldShowPhysiqueScore, finiteMs } = require('../AthleteProfileScreen');

const NOW = Date.UTC(2026, 6, 8, 12, 0, 0);
const scanWithScore = (capturedAt) => ({ visualLeannessScore: 72, capturedAt });

describe('finiteMs clock-skew guard', () => {
  const realNow = Date.now;
  beforeEach(() => { Date.now = () => NOW; });
  afterEach(() => { Date.now = realNow; });

  test('accepts a plausible past/near-present timestamp', () => {
    expect(finiteMs(NOW - 1000)).toBe(NOW - 1000);
  });

  test('rejects non-finite, zero and negative values as "not logged"', () => {
    expect(finiteMs(null)).toBeNull();
    expect(finiteMs(undefined)).toBeNull();
    expect(finiteMs(NaN)).toBeNull();
    expect(finiteMs(0)).toBeNull();
    expect(finiteMs(-1)).toBeNull();
  });

  test('rejects a timestamp further in the future than the clock-skew tolerance', () => {
    const farFuture = NOW + 25 * 60 * 60 * 1000; // 25h ahead
    expect(finiteMs(farFuture)).toBeNull();
  });

  test('tolerates a small forward clock skew (under 24h)', () => {
    const smallSkew = NOW + 60 * 60 * 1000; // 1h ahead
    expect(finiteMs(smallSkew)).toBe(smallSkew);
  });
});

describe('shouldShowPhysiqueScore timestamp race', () => {
  const realNow = Date.now;
  beforeEach(() => { Date.now = () => NOW; });
  afterEach(() => { Date.now = realNow; });

  test('no scored scan at all: never shows the physique score', () => {
    expect(shouldShowPhysiqueScore({ scan: null, bodyFat: 15, bodyFatLoggedAt: NOW })).toBe(false);
    expect(shouldShowPhysiqueScore({ scan: {}, bodyFat: 15, bodyFatLoggedAt: NOW })).toBe(false);
  });

  test('scored scan, no body-fat log yet: shows the physique score', () => {
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW), bodyFat: null, bodyFatLoggedAt: null,
    })).toBe(true);
  });

  test('scored scan strictly newer than the body-fat log: shows the physique score', () => {
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW), bodyFat: 15, bodyFatLoggedAt: NOW - 60_000,
    })).toBe(true);
  });

  test('body-fat log strictly newer than the scan: shows body fat instead', () => {
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW - 60_000), bodyFat: 15, bodyFatLoggedAt: NOW,
    })).toBe(false);
  });

  test('EXACT TIE resolves deterministically (scan wins ties)', () => {
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW), bodyFat: 15, bodyFatLoggedAt: NOW,
    })).toBe(true);
  });

  test('body-fat value present but its logged-at timestamp is missing: cannot prove it is newer, shows the scan', () => {
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW), bodyFat: 15, bodyFatLoggedAt: null,
    })).toBe(true);
  });

  test('scan capturedAt missing/untrusted but a trustworthy body-fat log exists: hides the scan', () => {
    expect(shouldShowPhysiqueScore({
      scan: { visualLeannessScore: 72 }, bodyFat: 15, bodyFatLoggedAt: NOW,
    })).toBe(false);
  });

  test('guard: a corrupted future-dated body-fat log cannot permanently suppress a real scan', () => {
    const corruptedFutureLog = NOW + 30 * 24 * 60 * 60 * 1000; // 30 days in the future
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(NOW), bodyFat: 15, bodyFatLoggedAt: corruptedFutureLog,
    })).toBe(true);
  });

  test('guard: a corrupted future-dated scan cannot permanently win over a real body-fat log', () => {
    const corruptedFutureScan = NOW + 30 * 24 * 60 * 60 * 1000;
    expect(shouldShowPhysiqueScore({
      scan: scanWithScore(corruptedFutureScan), bodyFat: 15, bodyFatLoggedAt: NOW,
    })).toBe(false);
  });
});
