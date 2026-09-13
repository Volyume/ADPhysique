/**
 * The honest early-days helpers (26-EARLY-DAYS-SPEC.md, CR-16 / D162).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: the invite
 * carries the member's own profile link and gym and nothing else; every
 * label reads exactly as specified; the cohort count line says "You and N
 * others" ONLY when the reader is known to belong and stays as it was
 * otherwise, and "Just you so far" is the honest zero; the HOST row shows
 * only to a reader who is not the host, not following, and not blocked or
 * muted either way; the host caption never names a hidden gym.
 */

const {
  inviteMessage, inviteLabel, firstHereLine, isOwnCohort, cohortCountLine,
  hostRowVisible, hostCaption, COMMUNITY_HOST_HANDLE, COMMUNITY_HOST_USER_ID,
} = require('../earlyDays');

describe('inviteMessage', () => {
  test('with a gym: the sentence, the gym, the profile link, nothing else', () => {
    expect(inviteMessage({ handle: 'Rowan_Lifts', gymLabel: ' Volt Gym ' }))
      .toBe('Join me on Volyume. I train at Volt Gym. https://volyume.app/u/?h=rowan_lifts');
  });

  test('without a gym: no gym sentence', () => {
    expect(inviteMessage({ handle: 'rowan', gymLabel: null })).toBe('Join me on Volyume. https://volyume.app/u/?h=rowan');
    expect(inviteMessage({ handle: 'rowan', gymLabel: '' })).toBe('Join me on Volyume. https://volyume.app/u/?h=rowan');
  });
});

describe('inviteLabel and firstHereLine', () => {
  test('the three invite labels', () => {
    expect(inviteLabel({ gymLabel: 'Volt Gym' })).toBe('Invite a gym mate');
    expect(inviteLabel({ gymLabel: null })).toBe('Invite a training partner');
    expect(inviteLabel({ gymLabel: 'Volt Gym', ownGymPage: true })).toBe('Invite someone from Volt Gym');
    expect(inviteLabel({ gymLabel: '', ownGymPage: true })).toBe('Invite a training partner');
  });

  test('the first-here line, with and without a gym', () => {
    expect(firstHereLine('Volt Gym')).toBe('You are the first here from Volt Gym.');
    expect(firstHereLine(null)).toBe('You are one of the first here.');
  });
});

describe('isOwnCohort', () => {
  // The real `me.profile` is `_community_profile_card`: labels for area and
  // place, never keys (review fix 7), so the fixture carries labels.
  const me = {
    profile: {
      user_id: 'u1', gym_id: 'v1', other_gym_ids: ['v2'], discipline_keys: ['powerlifting'],
      area_label: 'Leeds', place_label: 'Burscough',
    },
    tp_age_band: '25_34',
  };

  test('gym: by the venue id, an other gym, or the legacy label match', () => {
    expect(isOwnCohort({ kind: 'gym', key: 'gym:v1', me, venueId: 'v1' })).toBe(true);
    expect(isOwnCohort({ kind: 'gym', key: 'gym:v2', me, venueId: 'v2' })).toBe(true);
    expect(isOwnCohort({ kind: 'gym', key: 'gym:v9', me, venueId: 'v9' })).toBe(false);
    expect(isOwnCohort({ kind: 'gym', key: 'Old Gym', me, venueId: null, ownGymByLabel: true })).toBe(true);
    expect(isOwnCohort({ kind: 'gym', key: 'Old Gym', me, venueId: null })).toBe(false);
  });

  test('discipline, age band and area', () => {
    expect(isOwnCohort({ kind: 'discipline', key: 'powerlifting', me })).toBe(true);
    expect(isOwnCohort({ kind: 'discipline', key: 'bikini', me })).toBe(false);
    expect(isOwnCohort({ kind: 'age_band', key: '25_34', me })).toBe(true);
    expect(isOwnCohort({ kind: 'age_band', key: '35_44', me })).toBe(false);
    expect(isOwnCohort({ kind: 'area', key: 'leeds', me, label: 'Leeds' })).toBe(true);
    expect(isOwnCohort({ kind: 'area', key: 'burscough', me, label: 'Burscough' })).toBe(true);
    expect(isOwnCohort({ kind: 'area', key: 'york', me, label: 'York' })).toBe(false);
    expect(isOwnCohort({ kind: 'area', key: 'leeds', me })).toBe(false);
  });

  test('anything it cannot establish is false', () => {
    expect(isOwnCohort({ kind: 'style', key: 'strength', me })).toBe(false);
    expect(isOwnCohort({ kind: 'gym', key: 'gym:v1', me: null, venueId: 'v1' })).toBe(false);
    expect(isOwnCohort({ kind: 'gym', key: 'gym:v1', me: { profile: null }, venueId: 'v1' })).toBe(false);
  });
});

describe('cohortCountLine', () => {
  test('not the reader\'s cohort: unchanged wording', () => {
    expect(cohortCountLine({ own: false, others: 1 })).toBe('1 member');
    expect(cohortCountLine({ own: false, others: 23, rosterMode: true, trainedToday: 4 })).toBe('23 members · 4 trained today');
    expect(cohortCountLine({ own: false, others: 0 })).toBe('0 members');
  });

  test('the reader\'s cohort: honest about them', () => {
    expect(cohortCountLine({ own: true, others: 0 })).toBe('Just you so far');
    expect(cohortCountLine({ own: true, others: 0, rosterMode: true, trainedToday: 1 })).toBe('Just you so far');
    expect(cohortCountLine({ own: true, others: 1 })).toBe('You and 1 other');
    expect(cohortCountLine({ own: true, others: 3, rosterMode: true, trainedToday: 2 })).toBe('You and 3 others · 2 trained today');
  });

  test('a missing or negative count reads as zero', () => {
    expect(cohortCountLine({ own: true, others: undefined })).toBe('Just you so far');
    expect(cohortCountLine({ own: false, others: -2 })).toBe('0 members');
  });
});

describe('hostRowVisible', () => {
  const host = (rel = {}, over = {}) => ({
    user_id: COMMUNITY_HOST_USER_ID, handle: COMMUNITY_HOST_HANDLE, display_name: 'Allan',
    relationship: { following: 'none', followed_by: false, muted: false, blocked: false, ...rel },
    ...over,
  });

  test('shows for a reader who is not the host and not following', () => {
    expect(hostRowVisible({ card: host(), viewable: true, uid: 'u1' })).toBe(true);
  });

  test('the handle AND the user id must be the founder\'s: a re-claimed handle is a stranger', () => {
    expect(hostRowVisible({ card: host({}, { user_id: 'someone-else' }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({}, { handle: 'not_allan' }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({}, { handle: 'ALLAN' }), viewable: true, uid: 'u1' })).toBe(true);
  });

  test('never for the host, never when following or waiting, never with a block or mute, never unviewable', () => {
    expect(hostRowVisible({ card: host(), viewable: true, uid: COMMUNITY_HOST_USER_ID })).toBe(false);
    // The card's vocabulary is 'none' | 'requested' | 'accepted' (a fresh
    // follow of a public profile reads 'accepted' on production).
    expect(hostRowVisible({ card: host({ following: 'accepted' }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({ following: 'requested' }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({ following: 'following' }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({ following: true }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({ following: null }), viewable: true, uid: 'u1' })).toBe(true);
    expect(hostRowVisible({ card: host({ following: false }), viewable: true, uid: 'u1' })).toBe(true);
    expect(hostRowVisible({ card: host({ blocked: true }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host({ muted: true }), viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host(), viewable: false, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: null, viewable: true, uid: 'u1' })).toBe(false);
    expect(hostRowVisible({ card: host(), viewable: true, uid: null })).toBe(false);
  });
});

describe('hostCaption', () => {
  test('names the gym only when the host shows it', () => {
    expect(hostCaption({ gym_label: 'Volt Gym', show_gym: true })).toBe('Built Volyume · Volt Gym');
    expect(hostCaption({ gym_label: 'Volt Gym' })).toBe('Built Volyume · Volt Gym');
    expect(hostCaption({ gym_label: 'Volt Gym', show_gym: false })).toBe('Built Volyume');
    expect(hostCaption({})).toBe('Built Volyume');
  });
});
