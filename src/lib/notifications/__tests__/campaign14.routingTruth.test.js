/**
 * campaign14.routingTruth.test.js — Campaign 14 job 5, "notification
 * navigation / routing truth" (founder ruling).
 *
 * WHAT THIS SUITE PINS, AND WHY
 *
 * The ruling: "A delivered notification must not navigate to: a dead route, an
 * unrelated screen, or a screen with no representation of what the
 * notification described. [...] Each live notification gets one of:
 * A. meaningful existing destination, or B. intentionally non-navigating
 * notification. Do not navigate merely because a route string exists."
 *
 * Three defect classes had to become impossible to reintroduce:
 *
 *   1. DEAD ROUTE — `routeForNotificationType` names a `{tab, screen}` that no
 *      navigator registers. React Navigation drops such a navigate() silently,
 *      so it only ever shows up as "the tap did nothing" in production. The
 *      registered route names are therefore read out of RootNavigator.js
 *      itself rather than restated here, so renaming a screen breaks this
 *      suite instead of breaking a user's tap.
 *
 *   2. MISLEADING DESTINATION — a registered screen that does not carry the
 *      notification's subject. This is what `partner_cheer` was doing: it
 *      landed on ProgressTab/Consistency on the claim that "the partner row
 *      hosts the cheer caption", but that row was removed from
 *      ConsistencyScreen on the founder device-walk of 2026-07-03 and its
 *      absence is pinned by partnerPlacementSpine.guard.test.js. Every
 *      destination below is therefore checked against a marker in the
 *      destination screen's own source that proves the subject is represented.
 *
 *   3. SILENT DEAD-END — a live type with no mapping at all, so the tap opens
 *      whatever screen was last on top. `partner_streak`, `partner_joined`,
 *      `meal_log_reminder` and `subscription_payment_failure` were in this
 *      state. Non-navigating is allowed, but only as an explicit, reasoned
 *      decision (option B), never as a default fall-through.
 *
 * The live type inventory is DERIVED from the emitters (scheduler.js,
 * trainingReminders.js, restEnd.js, activeWorkout.js and the Edge Functions
 * that call send-push), not hand-listed, so a new notification type cannot be
 * shipped without a routing decision being made for it here.
 *
 * Finally, the ruling's telemetry clause: "Do not let 'no destination' mean
 * 'no open event recorded.'" The open event fires in listeners.js before and
 * independently of the route mapping; that ordering is pinned behaviourally
 * against the real listeners + real telemetry modules.
 */

import fs from 'fs';
import path from 'path';

// Jest mock factories may only reference `mock`-prefixed outer vars.
const mockTapListeners = [];
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((fn) => {
    mockTapListeners.push(fn);
    return { remove: () => {} };
  }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'u1' } }) },
}));

const { routeForNotificationType } = require('../notificationRoute');
const { categoryForDataType, CATEGORY } = require('../categories');
const { installNotificationListeners } = require('../listeners');

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ───────────────────────── live type inventory ──────────────────────────────

// Every file that bakes a `data.type` onto a notification a real user can
// receive today. The Edge Functions are included because the ruling names them
// explicitly: a server push dead-ends exactly like a local one.
const EMITTERS = [
  'src/lib/notifications/scheduler.js',
  'src/lib/notifications/trainingReminders.js',
  'src/lib/notifications/restEnd.js',
  'src/lib/notifications/activeWorkout.js',
  'supabase/functions/play-billing-rtdn/index.ts',
  'supabase/functions/_shared/appStore.ts',
  'supabase/functions/partner-cheer/index.ts',
];

// The one emitted type that is NOT live: the whole workout-progress surface
// no-ops (founder decision, the confusing "Set 3 of 2" numbering), so nothing
// is ever delivered with this type. Pinned as disabled below, so if the
// surface is ever revived this suite forces a routing decision for it.
const DISABLED_TYPES = new Set(['active_workout']);

function emittedTypes() {
  const found = new Set();
  for (const rel of EMITTERS) {
    const src = read(rel);
    for (const m of src.matchAll(/\{\s*type:\s*['"]([a-z0-9_]+)['"]/g)) found.add(m[1]);
    for (const m of src.matchAll(/\{\s*type:\s*CATEGORY\.([A-Z0-9_]+)/g)) {
      const value = CATEGORY[m[1]];
      if (value) found.add(value);
    }
  }
  return found;
}

const LIVE_TYPES = [...emittedTypes()].filter((t) => !DISABLED_TYPES.has(t)).sort();

// Destination decisions, one row per live type. `screen: null` is option B:
// an intentionally non-navigating notification. `marker` is a regex that must
// appear in the destination screen's own source and that proves the screen
// represents what the notification said — the anti-"unrelated screen" check.
const DECISIONS = {
  morning_weight: {
    tab: 'HomeTab', screen: 'Home',
    file: 'src/screens/HomeScreen.js', marker: /openWeightLog/,
  },
  evening_weight: {
    tab: 'HomeTab', screen: 'Home',
    file: 'src/screens/HomeScreen.js', marker: /openWeightLog/,
  },
  training_reminder: {
    tab: 'HomeTab', screen: 'Home',
    file: 'src/screens/HomeScreen.js', marker: /Start workout/,
  },
  activation_nudge: {
    tab: 'HomeTab', screen: 'Home',
    file: 'src/screens/HomeScreen.js', marker: /Start workout/,
  },
  weekly_checkin: {
    tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    file: 'src/screens/WeeklyCheckInScreen.js', marker: /[Cc]heck-[Ii]n/,
  },
  checkin_missed: {
    tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    file: 'src/screens/WeeklyCheckInScreen.js', marker: /[Cc]heck-[Ii]n/,
  },
  weekly_coach_ready: {
    tab: 'ProfileTab', screen: 'CoachOutput',
    file: 'src/screens/CoachOutputScreen.js', marker: /weekStart/,
  },
  // C16 phase C: the block-complete review opens the surface that carries
  // the decision card, not a generic screen.
  block_ready_to_review: {
    tab: 'PlansTab', screen: 'Plans',
    file: 'src/screens/PlansScreen.js', marker: /programmeReview/,
  },
  cascade_gate: {
    tab: 'ProfileTab', screen: 'CascadeGate',
    file: 'src/screens/CascadeGateScreen.js', marker: /params\?\.variant/,
  },
  trial_day3: {
    tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    file: 'src/screens/WeeklyCheckInScreen.js', marker: /[Cc]heck-[Ii]n/,
  },
  winback: {
    tab: 'ProfileTab', screen: 'Subscription',
    file: 'src/screens/SubscriptionScreen.js', marker: /subscription settings/,
  },
  subscription_payment_failure: {
    tab: 'ProfileTab', screen: 'Subscription',
    // The push says "update your billing to keep your Pro features"; this is
    // the screen that carries the plan state and the route into the store's
    // own subscription settings.
    file: 'src/screens/SubscriptionScreen.js', marker: /payment method/,
  },
  year_of_lifts_unlock: {
    tab: 'ProgressTab', screen: 'YearOfLifts',
    file: 'src/screens/YearOfLiftsScreen.js', marker: /[Yy]ear of [Ll]ifts/,
  },
  monthly_recap: {
    tab: 'ProgressTab', screen: 'Analytics',
    file: 'src/screens/AnalyticsScreen.js', marker: /recap/,
  },
  partner_cheer: {
    tab: 'ProgressTab', screen: 'Partner',
    file: 'src/screens/PartnerScreen.js', marker: /cheer/,
  },
  partner_streak: {
    tab: 'ProgressTab', screen: 'Partner',
    file: 'src/screens/PartnerScreen.js', marker: /sharedStreak/,
  },
  partner_joined: {
    tab: 'ProgressTab', screen: 'Partner',
    file: 'src/screens/PartnerScreen.js', marker: /partnership/i,
  },
  planned_meal_confirm: {
    tab: 'DiaryTab', screen: 'Diary',
    file: 'src/screens/DiaryScreen.js', marker: /Mark as eaten/,
  },
  meal_log_reminder: {
    tab: 'DiaryTab', screen: 'Diary',
    file: 'src/screens/DiaryScreen.js', marker: /[Mm]eal/,
  },
  // Option B. Both are live-workout notifications whose tap happens while the
  // user is mid session, so the OS already restores them to the Active Workout
  // screen; rest_timer's real controls are its action buttons, handled in
  // listeners.js before onTap runs. Deep-linking would duplicate the screen
  // when a workout is live and land on an empty one when the notification is
  // stale, which is the "no representation" defect the ruling forbids.
  rest_timer: { tab: null, screen: null },
  rest_end: { tab: null, screen: null },
};

// Sample `data` payloads, matching the shapes the emitters actually bake, for
// the types whose target depends on a baked field.
const SAMPLE_DATA = {
  trial_day3: { variant: 'S1' },
  checkin_missed: { slot: 'evening' },
  weekly_coach_ready: { weekStart: 1_750_000_000_000 },
  partner_joined: { pairId: 'pair-1' },
};

// ─────────────────── registered routes, read from the navigator ─────────────

const NAV = read('src/navigation/RootNavigator.js');

/** tab route name -> the stack component that tab renders. */
function tabToStack() {
  const map = {};
  for (const m of NAV.matchAll(/<Tab\.Screen\s+name="([A-Za-z]+)"\s+component=\{([A-Za-z]+)\}/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

/** The screen names a given stack function registers. */
function screensIn(stackFnName) {
  const start = NAV.indexOf(`function ${stackFnName}(`);
  if (start === -1) return null;
  const next = NAV.indexOf('\nfunction ', start + 1);
  const body = NAV.slice(start, next === -1 ? NAV.length : next);
  return new Set([...body.matchAll(/<Stack\.Screen\s+name="([A-Za-z0-9]+)"/g)].map((m) => m[1]));
}

const TAB_TO_STACK = tabToStack();

describe('live notification type inventory is derived, not assumed', () => {
  test('every emitted type has an explicit routing decision (A or B)', () => {
    // A new notification type cannot ship without a decision being recorded
    // here: this is the mechanical form of "each live notification gets one of
    // A or B".
    const undecided = LIVE_TYPES.filter((t) => !(t in DECISIONS));
    expect(undecided).toEqual([]);
  });

  test('the inventory matches the traced set (a new emitter forces a re-trace)', () => {
    expect(LIVE_TYPES).toEqual([
      'activation_nudge',
      'block_ready_to_review',
      'cascade_gate',
      'checkin_missed',
      'evening_weight',
      'meal_log_reminder',
      'monthly_recap',
      'morning_weight',
      'partner_cheer',
      'partner_joined',
      'partner_streak',
      'planned_meal_confirm',
      'rest_end',
      'rest_timer',
      'subscription_payment_failure',
      'training_reminder',
      'trial_day3',
      'weekly_checkin',
      'weekly_coach_ready',
      'winback',
      'year_of_lifts_unlock',
    ]);
  });

  test('active_workout is excluded because its surface is genuinely disabled', () => {
    const src = read('src/lib/notifications/activeWorkout.js');
    // The function short-circuits before it can ever schedule; if that early
    // return is removed, the type becomes live and the inventory test above
    // starts failing until a routing decision is made for it.
    expect(src).toMatch(
      /export async function showActiveWorkoutNotification\([^)]*\)\s*\{\s*\n\s*return;/,
    );
  });
});

// (19) ────────────────────────────────────────────────────────────────────────
describe('(19) every routed live type reaches a route a navigator registers', () => {
  const routed = LIVE_TYPES.filter((t) => DECISIONS[t].screen !== null);

  test.each(routed)('%s lands on its decided destination', (type) => {
    const target = routeForNotificationType(type, SAMPLE_DATA[type] ?? {});
    expect(target).not.toBeNull();
    expect(target.tab).toBe(DECISIONS[type].tab);
    expect(target.screen).toBe(DECISIONS[type].screen);
  });

  test.each(routed)('%s: the tab it names is a registered bottom tab', (type) => {
    const { tab } = routeForNotificationType(type, SAMPLE_DATA[type] ?? {});
    expect(Object.keys(TAB_TO_STACK)).toContain(tab);
  });

  test.each(routed)('%s: the screen it names is registered in that tab\'s stack (no dead route)', (type) => {
    const { tab, screen } = routeForNotificationType(type, SAMPLE_DATA[type] ?? {});
    const screens = screensIn(TAB_TO_STACK[tab]);
    expect(screens).not.toBeNull();
    expect([...screens]).toContain(screen);
  });

  test.each(routed)('%s: the destination screen actually represents its subject', (type) => {
    const { file, marker } = DECISIONS[type];
    expect(read(file)).toMatch(marker);
  });

  test('trial_day3 S3 targets a bare tab, and that tab is registered', () => {
    // The one live target with no `screen`: the S3 variant lands on the Today
    // tab root, where the session hero is the re-onboarding. RootNavigator
    // passes `screen: undefined` straight through, which React Navigation
    // resolves to the tab's initial route rather than a dead route.
    const target = routeForNotificationType('trial_day3', { variant: 'S3' });
    expect(target).toEqual({ tab: 'HomeTab' });
    expect(Object.keys(TAB_TO_STACK)).toContain(target.tab);
  });

  test('checkin_missed follow-up lands on the trend view it promises, not the wrong-day check-in gate', () => {
    const target = routeForNotificationType('checkin_missed', { slot: 'followup' });
    expect(target).toEqual({ tab: 'ProgressTab', screen: 'Analytics' });
    expect([...screensIn(TAB_TO_STACK.ProgressTab)]).toContain('Analytics');
    expect(read('src/screens/AnalyticsScreen.js')).toMatch(/[Tt]rend/);
  });

  test('every live type still resolves a telemetry category (no live type can lose its open event)', () => {
    for (const type of LIVE_TYPES) {
      expect(categoryForDataType(type)).not.toBeNull();
    }
  });
});

// (20) ────────────────────────────────────────────────────────────────────────
describe('(20) no partner notification routes to an unrelated surface', () => {
  const PARTNER_TYPES = ['partner_cheer', 'partner_streak', 'partner_joined'];

  test.each(PARTNER_TYPES)('%s lands on the Partner surface', (type) => {
    expect(routeForNotificationType(type, SAMPLE_DATA[type] ?? {})).toEqual({
      tab: 'ProgressTab', screen: 'Partner', params: { source: 'notification' },
    });
  });

  test.each(PARTNER_TYPES)('%s never lands on Consistency, which carries no partner content', (type) => {
    const target = routeForNotificationType(type, SAMPLE_DATA[type] ?? {});
    expect(target.screen).not.toBe('Consistency');
  });

  test('ConsistencyScreen still has no partner content (the reason the old route was false)', () => {
    // Kept in step with partnerPlacementSpine.guard.test.js: the Partners row
    // was removed from this screen on the founder device-walk of 2026-07-03.
    expect(read('src/screens/ConsistencyScreen.js')).not.toMatch(/[Pp]artner/);
  });

  test('PartnerScreen shows the state each of the three beats describes', () => {
    const src = read('src/screens/PartnerScreen.js');
    // cheerPush: "<name> cheered you on".
    expect(src).toMatch(/cheer/i);
    // streakKeptPush: "<n> weeks running, together".
    expect(src).toMatch(/sharedStreak/);
    // joinPush: "<name> joined you [...] you'll see their training week here".
    expect(src).toMatch(/partnership/i);
  });

  test('the Partner route keeps its Pro guard (routing never widens a tier gate)', () => {
    expect(NAV).toMatch(/const GatedPartner\s*=[\s\S]*?withProGuard\(/);
    expect(NAV).toMatch(/<Stack\.Screen name="Partner" component=\{GatedPartner\}/);
  });

  test('no pairId is forwarded (PartnerScreen reads route.params.pairId as a share target)', () => {
    const target = routeForNotificationType('partner_joined', { pairId: 'pair-1' });
    expect(target.params).toEqual({ source: 'notification' });
    expect(target.params.pairId).toBeUndefined();
  });
});

// (21) ────────────────────────────────────────────────────────────────────────
describe('(21) intentionally non-navigating types are safe', () => {
  const NON_NAVIGATING = LIVE_TYPES.filter((t) => DECISIONS[t].screen === null);

  test('the non-navigating set is exactly the two live-workout notifications', () => {
    expect(NON_NAVIGATING).toEqual(['rest_end', 'rest_timer']);
  });

  test.each(NON_NAVIGATING)('%s returns null, never undefined and never a partial target', (type) => {
    const target = routeForNotificationType(type);
    expect(target).toBeNull();
    expect(target).not.toBeUndefined();
  });

  test.each(NON_NAVIGATING)('%s is an explicit case, not a default fall-through', (type) => {
    // The difference between option B and a silent dead-end is that option B
    // is written down. Both types must appear as their own `case` label.
    const src = read('src/lib/notifications/notificationRoute.js');
    expect(src).toMatch(new RegExp(`case '${type}':`));
  });

  test('no live type ever yields a target with an undefined screen alongside a screen key', () => {
    for (const type of LIVE_TYPES) {
      const target = routeForNotificationType(type, SAMPLE_DATA[type] ?? {});
      if (target === null) continue;
      expect(typeof target.tab).toBe('string');
      if ('screen' in target) expect(typeof target.screen).toBe('string');
    }
  });

  test('unknown, absent and malformed types resolve to null rather than throwing', () => {
    for (const bad of [undefined, null, '', 'not_a_type', 0, {}, []]) {
      expect(() => routeForNotificationType(bad)).not.toThrow();
      expect(routeForNotificationType(bad)).toBeNull();
    }
    // A malformed `data` payload must not crash the mapping either.
    expect(() => routeForNotificationType('trial_day3', null)).not.toThrow();
    expect(() => routeForNotificationType('checkin_missed', 'nonsense')).not.toThrow();
    expect(() => routeForNotificationType('weekly_coach_ready', { weekStart: 'soon' })).not.toThrow();
    expect(routeForNotificationType('weekly_coach_ready', { weekStart: 'soon' }))
      .toEqual({ tab: 'ProfileTab', screen: 'CoachOutput' });
  });

  test('the navigator refuses to navigate on a null target (the tap just opens the app)', () => {
    // RootNavigator's onTap: `const target = routeForNotificationType(...); if
    // (!target) return;`. Pinned at source because the effect is not exported.
    expect(NAV).toMatch(/const target = routeForNotificationType\(type, data\);\s*\n\s*if \(!target\) return;/);
  });
});

// (22) ────────────────────────────────────────────────────────────────────────
describe('(22) the open telemetry event still fires on a non-navigating tap', () => {
  beforeEach(() => {
    mockTapListeners.length = 0;
    mockTrack.mockClear();
  });

  function tap(type, extra = {}) {
    const onTap = jest.fn();
    installNotificationListeners({ onTap });
    mockTapListeners[0]({
      notification: { request: { content: { data: { type } } } },
      ...extra,
    });
    return onTap;
  }

  test.each(['rest_end', 'rest_timer'])(
    '%s: a body tap records notification_tapped even though it navigates nowhere',
    (type) => {
      const onTap = tap(type);
      // Non-navigating by decision...
      expect(routeForNotificationType(type)).toBeNull();
      // ...but the open event is still recorded, with the right category.
      expect(mockTrack).toHaveBeenCalledWith(
        'u1',
        'notification_tapped',
        expect.objectContaining({ category: CATEGORY.REST_TIMER, data_type: type }),
      );
      // rest_timer's plain body tap still reaches onTap so the app opens; only
      // an action-button response short-circuits.
      expect(onTap).toHaveBeenCalledTimes(1);
    },
  );

  test('a rest-timer ACTION button still records the open event before short-circuiting', () => {
    const onTap = tap('rest_timer', { actionIdentifier: 'rest_plus_15' });
    expect(mockTrack).toHaveBeenCalledWith(
      'u1',
      'notification_tapped',
      expect.objectContaining({ category: CATEGORY.REST_TIMER, data_type: 'rest_timer' }),
    );
    expect(onTap).not.toHaveBeenCalled();
  });

  test('telemetry is fired before routing, so it cannot depend on a destination existing', () => {
    const src = read('src/lib/notifications/listeners.js');
    const trackAt = src.indexOf('trackNotificationTapped(');
    const onTapAt = src.indexOf('onTap(response)');
    expect(trackAt).toBeGreaterThan(-1);
    expect(onTapAt).toBeGreaterThan(-1);
    expect(trackAt).toBeLessThan(onTapAt);
  });

  test('every live type, routed or not, records an open event on tap', () => {
    for (const type of LIVE_TYPES) {
      mockTrack.mockClear();
      mockTapListeners.length = 0;
      tap(type);
      expect(mockTrack).toHaveBeenCalledWith(
        'u1',
        'notification_tapped',
        expect.objectContaining({ data_type: type }),
      );
    }
  });
});
