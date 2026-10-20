/**
 * Pins the workout, reminder and notification-permission telemetry emitters
 * (growth brief 2026-10-19): each is present at its site with only the
 * payload keys its schema declares and schema-valid literal enum values, the
 * session counters behave, and the optional exit-reason chips only send
 * reasons the schema accepts.
 */
const fs = require('fs');
const path = require('path');
const { SCHEMA_BY_NAME, toBucket, sanitisePayload } = require('../schema');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../../..', rel), 'utf8');
const WORKOUT = 'src/screens/ActiveWorkoutScreen.js';

function bodyOf(src, marker, len = 2500) {
  const i = src.indexOf(marker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i, i + len);
}

const EMITTERS = [
  [WORKOUT, 'function trackWorkoutDiscarded', 'workout_discarded', ['sets', 'duration']],
  ['src/lib/telemetry/workoutAbandoned.js', 'export async function trackWorkoutAbandonedIfOpen', 'workout_abandoned', ['age', 'sets']],
  [WORKOUT, "trackNow('exercise_swapped'", 'exercise_swapped', ['scope', 'cause']],
  [WORKOUT, "trackNow('workout_session_summary'", 'workout_session_summary', ['edits', 'swaps', 'rest_timer_uses', 'warmups_added', 'discarded_sets']],
  ['src/lib/telemetry/exitReason.js', 'export function sendWorkoutDiscardReason', 'exit_reason_given', ['moment', 'reason']],
  ['src/screens/NotificationSettingsScreen.js', 'function trackReminderOff', 'reminders_turned_off', ['category']],
  ['src/lib/notifications/permissions.js', 'function _trackPermissionOutcome', 'notification_permission_result', ['outcome']],
];

describe('lane workout emitters', () => {
  test.each(EMITTERS)('%s emits %s near %s', (file, marker, event, keys) => {
    const body = bodyOf(read(file), marker);
    expect(body).toContain(`'${event}'`);
    for (const k of keys) expect(body).toMatch(new RegExp(`\\b${k}\\b`));
    // only schema fields are carried
    expect(Object.keys(SCHEMA_BY_NAME[event].fields).sort()).toEqual([...keys].sort());
  });

  test('swap scope and cause literals are schema values', () => {
    const f = SCHEMA_BY_NAME.exercise_swapped.fields;
    const body = bodyOf(read(WORKOUT), "trackNow('exercise_swapped'", 600);
    for (const v of ['programme', 'session', 'style', 'choice']) {
      expect(body).toContain(`'${v}'`);
      expect(JSON.stringify(f)).toContain(`"${v}"`);
    }
  });

  // Q4 ruling (src/lib/telemetry/events.js): no capability-derived event
  // leaves the device. A Work-around-sheet swap is capability derived, so the
  // telemetry never says 'constraint'; it reports 'choice'.
  test("a swap never reports cause 'constraint' (Q4); a Work-around swap reports choice", () => {
    expect(SCHEMA_BY_NAME.exercise_swapped.fields.cause.values).toEqual(['style', 'choice']);
    expect(sanitisePayload('exercise_swapped', { scope: 'session', cause: 'constraint' }).payload).toEqual({ scope: 'session' });
    const body = bodyOf(read(WORKOUT), "trackNow('exercise_swapped'", 600);
    expect(body).not.toContain("'constraint'");
    expect(body).toContain("(!workAroundSwapRef.current && swapStylePoolKey && !swapStyleShowAll) ? 'style' : 'choice'");
  });

  test('bucket kinds used match the schema field kinds', () => {
    expect(SCHEMA_BY_NAME.workout_discarded.fields.duration.kind).toBe('minutes');
    expect(SCHEMA_BY_NAME.workout_abandoned.fields.age.kind).toBe('age');
    expect(read('src/lib/telemetry/workoutAbandoned.js')).toContain("toBucket('age', hours)");
    expect(read(WORKOUT)).toContain("toBucket('minutes', mins)");
  });

  test('every reminder category used is in the schema', () => {
    const src = read('src/screens/NotificationSettingsScreen.js');
    const values = SCHEMA_BY_NAME.reminders_turned_off.fields.category.values;
    const used = [...src.matchAll(/trackReminderOff\('([a-z_]+)'\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThanOrEqual(7);
    for (const u of used) expect(values).toContain(u);
  });

  test('permission outcomes are schema values', () => {
    const values = SCHEMA_BY_NAME.notification_permission_result.fields.outcome.values;
    const body = bodyOf(read('src/lib/notifications/permissions.js'), 'function _trackPermissionOutcome', 900);
    for (const v of ['granted', 'denied', 'blocked']) {
      expect(body).toContain(`'${v}'`);
      expect(values).toContain(v);
    }
  });

  test('discard reason chips send only schema reasons', () => {
    const { WORKOUT_DISCARD_REASONS } = require('../exitReason');
    const values = SCHEMA_BY_NAME.exit_reason_given.fields.reason.values;
    expect(WORKOUT_DISCARD_REASONS.map((r) => r.reason)).toEqual(['no_time', 'felt_off', 'app_problem', 'just_browsing', 'other']);
    for (const r of WORKOUT_DISCARD_REASONS) expect(values).toContain(r.reason);
    expect(SCHEMA_BY_NAME.exit_reason_given.fields.moment.values).toContain('workout_discard');
  });

  // Adversarial review (minor): the one-tap discard of a session with no sets
  // logged and nothing typed is not a discarded workout; nothing is sent.
  test('the silent empty-session discard does not send workout_discarded', () => {
    const src = read(WORKOUT);
    const body = bodyOf(src, 'function handleCancelWorkout()', 1600);
    expect(body).toMatch(/totalSets === 0 && !hasInProgressSetEntry\(\)/);
    const silent = body.slice(0, body.indexOf('confirmDiscard('));
    expect(silent).not.toContain('trackWorkoutDiscarded');
    expect(silent).not.toContain('workout_discarded');
    expect(silent).toContain('takeSessionCounts(activeWorkout?.id)');
    // The confirmed discard still reports it.
    expect(bodyOf(src, 'async function discardWorkout', 2600)).toContain('trackWorkoutDiscarded()');
  });

  test('the exit-reason row is offered only after a confirmed discard with work lost', () => {
    const body = bodyOf(read(WORKOUT), 'async function discardWorkout', 2600);
    expect(body).toMatch(/discardedSets > 0\) setTimeout\(\(\) => \{ offerWorkoutDiscardReason/);
  });
});

describe('workoutSession counters', () => {
  const { bump, peek, take, __test } = require('../workoutSession');
  beforeEach(() => __test.reset());

  test('counts per workout and ignores unknown names', () => {
    bump('swaps', 'w1'); bump('swaps', 'w1'); bump('warmups_added', 'w1', 3); bump('nonsense', 'w1');
    expect(peek('w1')).toEqual({ edits: 0, swaps: 2, rest_timer_uses: 0, warmups_added: 3, discarded_sets: 0 });
  });

  test('a different workout starts from zero', () => {
    bump('edits', 'w1');
    bump('edits', 'w2');
    expect(peek('w1').edits).toBe(0);
    expect(peek('w2').edits).toBe(1);
  });

  test('take returns the totals and forgets them', () => {
    bump('rest_timer_uses', 'w1');
    expect(take('w1').rest_timer_uses).toBe(1);
    expect(peek('w1').rest_timer_uses).toBe(0);
  });

  test('totals bucket to schema labels', () => {
    expect(toBucket('count', 0)).toBe('0');
    expect(toBucket('count', 5)).toBe('4-6');
  });
});
