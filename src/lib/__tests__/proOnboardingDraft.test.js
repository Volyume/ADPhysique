/**
 * OB-3 (audit 02): the Pro onboarding wizard must survive process death. This
 * suite pins the draft round-trip contract of lib/proOnboardingDraft:
 *   - a saved { step, answers } draft loads back identically, per user id,
 *   - malformed/corrupt drafts parse to null (fresh start, never a crash),
 *   - completing the wizard clears the draft,
 *   - restoring a draft can NEVER weaken the sex gate: a draft saved with
 *     sex null round-trips with sex null (the helpers never invent values).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  draftKey, buildDraft, parseDraft, saveDraft, loadDraft, clearDraft,
  buildKey, parseBuildProgress, loadBuildProgress, markBuildProgress,
  clearBuildProgress,
} from '../proOnboardingDraft';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('draftKey', () => {
  test('is per user id', () => {
    expect(draftKey('user-a')).toBe('@volyume_pro_onboarding_draft_user-a');
    expect(draftKey('user-b')).toBe('@volyume_pro_onboarding_draft_user-b');
  });

  test('is null without a user id (nothing to key a draft to)', () => {
    expect(draftKey(null)).toBeNull();
    expect(draftKey(undefined)).toBeNull();
    expect(draftKey('')).toBeNull();
  });
});

describe('buildDraft / parseDraft round-trip', () => {
  const answers = {
    firstName: 'Sam',
    sex: 'female',
    age: '34',
    bodyWeight: '68',
    experience: 'intermediate',
    planWeakPoints: ['Glutes', 'Delts'],
    checkinDay: 0,
    morningEnabled: true,
  };

  test('a saved draft parses back to the same step and answers', () => {
    const draft = buildDraft(3, answers);
    const parsed = parseDraft(JSON.stringify(draft));
    expect(parsed).toEqual({ step: 3, answers });
  });

  test('only wizard steps 2-6 are persistable (step 1 is auth-owned)', () => {
    expect(buildDraft(1, answers)).toBeNull();
    expect(buildDraft(0, answers)).toBeNull();
    expect(buildDraft(7, answers)).toBeNull();
    expect(buildDraft('nope', answers)).toBeNull();
    expect(buildDraft(2.5, answers)).toBeNull();
    for (const step of [2, 3, 4, 5, 6]) {
      expect(buildDraft(step, answers)?.step).toBe(step);
    }
  });

  test('malformed input parses to null, never throws', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft(undefined)).toBeNull();
    expect(parseDraft('')).toBeNull();
    expect(parseDraft('not json {')).toBeNull();
    expect(parseDraft('42')).toBeNull();
    expect(parseDraft('[1,2,3]')).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 999, step: 3, answers: {} }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, step: 9, answers: {} }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, step: 3, answers: [] }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, step: 3 }))).toBeNull();
  });

  test('SEX GATE: a draft with no sex chosen round-trips with sex null, not a default', () => {
    const draft = buildDraft(2, { ...answers, sex: null });
    const parsed = parseDraft(JSON.stringify(draft));
    expect(parsed.answers.sex).toBeNull();
    // And the helper never adds a sex key that wasn't saved.
    const noSex = parseDraft(JSON.stringify(buildDraft(2, { firstName: 'Sam' })));
    expect('sex' in noSex.answers).toBe(false);
  });
});

describe('AsyncStorage persistence', () => {
  test('save → load round-trips per user id', async () => {
    await saveDraft('user-a', 4, { sex: 'male', age: '41' });
    await saveDraft('user-b', 2, { sex: null });
    expect(await loadDraft('user-a')).toEqual({ step: 4, answers: { sex: 'male', age: '41' } });
    expect(await loadDraft('user-b')).toEqual({ step: 2, answers: { sex: null } });
  });

  test('completing the wizard clears the draft', async () => {
    await saveDraft('user-a', 5, { recoveryRating: 'good' });
    await clearDraft('user-a');
    expect(await loadDraft('user-a')).toBeNull();
  });

  test('no draft, no user id, or a corrupt stored value all load as null', async () => {
    expect(await loadDraft('user-none')).toBeNull();
    expect(await loadDraft(null)).toBeNull();
    await AsyncStorage.setItem(draftKey('user-x'), '{corrupt');
    expect(await loadDraft('user-x')).toBeNull();
  });

  test('an invalid step is never written', async () => {
    await saveDraft('user-a', 1, { firstName: 'Sam' });
    expect(await loadDraft('user-a')).toBeNull();
  });
});

/**
 * C5-P29-07 (D96): a kill inside the final build left the draft at step 6, so
 * the retry replayed every write — a second enrolment body-metric row and a
 * second generated plan that archived the first and took the "Your plan 2"
 * name. The build record is what makes that replay idempotent.
 */
describe('build progress (C5-P29-07)', () => {
  test('is per user id, and keyless without one', () => {
    expect(buildKey('user-a')).toBe('@volyume_pro_onboarding_build_user-a');
    expect(buildKey(null)).toBeNull();
    expect(buildKey('')).toBeNull();
  });

  test('marks merge, so each step of the build records itself without erasing the last', async () => {
    await markBuildProgress('user-a', { weightLoggedAt: 1000 });
    await markBuildProgress('user-a', { planId: 'prog-1', planSignature: '["intermediate",4]' });
    expect(await loadBuildProgress('user-a')).toEqual({
      weightLoggedAt: 1000,
      weightKg: null,
      planId: 'prog-1',
      planSignature: '["intermediate",4]',
    });
  });

  test('no record, no user id, or a corrupt value all read as "nothing was built yet"', async () => {
    expect(await loadBuildProgress('user-none')).toBeNull();
    expect(await loadBuildProgress(null)).toBeNull();
    await AsyncStorage.setItem(buildKey('user-x'), '{corrupt');
    expect(await loadBuildProgress('user-x')).toBeNull();
    // A missing record must mean "run the build in full", never "skip it".
    expect(parseBuildProgress(null)).toBeNull();
    expect(parseBuildProgress('[]')).toBeNull();
    expect(parseBuildProgress('42')).toBeNull();
  });

  test('malformed fields degrade to null rather than a truthy skip signal', () => {
    const parsed = parseBuildProgress(JSON.stringify({
      weightLoggedAt: 'yesterday', weightKg: -3, planId: 42, planSignature: {},
    }));
    expect(parsed).toEqual({ weightLoggedAt: null, weightKg: null, planId: null, planSignature: null });
  });

  test('clearDraft leaves the build record; clearBuildProgress removes it (RA/RB re-anchor)', async () => {
    // RB-1 (D96, Review B): the record must SURVIVE the end of advanceFrom6
    // (where clearDraft runs) because first run is not over until the
    // hand-off's Start training - clearing early let a back-out replay the
    // whole build. completeFirstRun/resetFirstRun own the record's removal
    // via clearBuildProgress, so a stale record still never suppresses a
    // deliberate later rebuild.
    await saveDraft('user-a', 6, { recoveryRating: 'good' });
    await markBuildProgress('user-a', { planId: 'prog-1' });
    await clearDraft('user-a');
    expect(await loadDraft('user-a')).toBeNull();
    expect((await loadBuildProgress('user-a'))?.planId).toBe('prog-1');
    await clearBuildProgress('user-a');
    expect(await loadBuildProgress('user-a')).toBeNull();
  });

  test('records are per user, so one account cannot suppress another account\'s build', async () => {
    await markBuildProgress('user-a', { planId: 'prog-a' });
    expect(await loadBuildProgress('user-b')).toBeNull();
  });
});
