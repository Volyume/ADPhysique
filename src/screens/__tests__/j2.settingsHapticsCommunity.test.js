/**
 * Pins Stage 2 batch J2 (items 8, 11, 31): the Settings landing's six headings and
 * row order, the separate Haptics switch (Reduce motion no longer silences
 * haptics), the Community feed default rule, and the Followers default for a
 * new member on both join paths. Source-level guards plus the real helpers.
 */
const fs = require('fs');
const path = require('path');
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()), impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
}));
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

describe('item 11 Settings landing', () => {
  const src = read('screens/SettingsScreen.js');
  test('six headings in the owner order', () => {
    const heads = [...src.matchAll(/<SectionHeader title="([^"]+)"/g)].map((m) => m[1]);
    expect(heads).toEqual(['Training', 'Nutrition', 'Reminders', 'Display & accessibility', 'Privacy & data', 'Account & help']);
  });
  // RE-POINTED (D231, app layout rework batch 5; the owner amended item 11):
  // "Injuries & limitations" and "Nutrition targets" left Settings (the owner
  // answered "Remove both"). Every other row and its order is the owner's table.
  test('rows in the owner order', () => {
    const labels = [...src.matchAll(/label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual([
      'Coaching', 'Workout', 'Dietary needs',
      'Notifications', 'Coaching reminders', 'Display', 'Units', 'Home screen widget',
      'Your data', 'Privacy and legal', 'Community', 'Account', 'Profile', 'Help and about',
    ]);
  });
});

describe('item 11 haptics', () => {
  test('default is on', () => {
    expect(require('../../store/useAppStore').default.getState().accessibility.hapticsEnabled).toBe(true);
  });
  test('Reduce motion no longer turns haptics off; the Haptics switch does', () => {
    const Haptics = require('expo-haptics');
    const useAppStore = require('../../store/useAppStore').default;
    const h = require('../../lib/haptics');
    Haptics.selectionAsync.mockClear();
    useAppStore.setState({ accessibility: { ...useAppStore.getState().accessibility, reduceMotion: true, reduceMotionUserPref: true, hapticsEnabled: true } });
    h.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    useAppStore.setState({ accessibility: { ...useAppStore.getState().accessibility, hapticsEnabled: false } });
    h.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });
});

describe('item 31 Community defaults', () => {
  const { defaultFeedScope, JOIN_DEFAULT_SESSIONS_AUDIENCE, DEFAULT_SESSIONS_AUDIENCE } = require('../../lib/community/trainingProfile');
  test('feed default rule', () => {
    expect(defaultFeedScope({ joined: false })).toBe('everyone');
    expect(defaultFeedScope({ joined: true, followingCount: 0, gymId: 'g' })).toBe('gym');
    expect(defaultFeedScope({ joined: true, followingCount: 4, gymId: null })).toBe('everyone');
    expect(defaultFeedScope({ joined: true, followingCount: 5, gymId: 'g' })).toBe('following');
    expect(defaultFeedScope({ joined: true, followingCount: undefined, gymId: 'g' })).toBe('following');
  });
  test('new members start at Followers; stored-row reader default is untouched', () => {
    expect(JOIN_DEFAULT_SESSIONS_AUDIENCE).toBe('followers');
    expect(DEFAULT_SESSIONS_AUDIENCE).toBe('everyone');
    expect(read('lib/community/onboardingJoin.js')).toContain('sessions_audience: JOIN_DEFAULT_SESSIONS_AUDIENCE');
    expect(read('screens/CommunityJoinScreen.js')).toContain('sessions_audience: JOIN_DEFAULT_SESSIONS_AUDIENCE');
    expect(read('screens/ProOnboardingScreen.js')).toContain('shared with the people who follow you in Community');
  });
});

describe('item 8 offer position', () => {
  test('the offer renders after the main-area ternary, before the post-hero cards', () => {
    const home = read('screens/HomeScreen.js');
    const offer = home.indexOf('<HomeHowYouTrainOfferCard');
    expect(offer).toBeGreaterThan(home.indexOf('Primary workout area'));
    expect(offer).toBeLessThan(home.indexOf('Campaign 26 (founder device order 2026-08-17): the post-hero'));
  });
});

describe('item 31 owner change: an empty automatic Gym feed falls back to Everyone', () => {
  const hub = read('screens/CommunityHubScreen.js');
  test('fallback only for the automatic default, with the one line; chip taps clear it', () => {
    expect(hub).toContain("opts.autoDefault && sc === 'gym'");
    expect(hub).toContain("loadHub('everyone'");
    expect(hub).toContain('Nobody at your gym has posted yet. Showing everyone.');
    expect(hub).toContain('autoDefault: true');
    expect(hub).toMatch(/scopeChosenRef\.current = true;\s*setGymFallbackNote\(false\);/);
  });
  test('community_get_me carries following_count and gym_id on the self card (migrate_180 card, migrate_191 me)', () => {
    const card = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrate_180_community_consistency_server_gate.sql'), 'utf8');
    expect(card).toContain("'following_count', p.following_count");
    expect(card).toContain("'gym_id',");
  });
});
