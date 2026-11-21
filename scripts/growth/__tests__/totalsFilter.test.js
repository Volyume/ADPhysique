/**
 * The weekly growth totals filter (LOC-661, scripts/growth/totalsFilter.js).
 *
 * What this suite pins, against the REAL filter:
 *  - only allow-listed keys come out: the exact set of key paths is fixed
 *    here, so a new field reaches the output only when this list changes;
 *  - `safety_activity_groups`, the event catalogue, release notes and every
 *    other free-text field never appear, nor any value planted in them;
 *  - an unknown key, at the top or inside a row, is dropped;
 *  - a breakdown row covering fewer than five people goes into "other";
 *  - a label the app cannot send (typed text, a made-up version) is counted
 *    in "other" and never printed, however many people it covers;
 *  - counts rebuilt from the digest's rounded percentages are exact or null;
 *  - the checks above fail for a pass-through (proved at the end).
 *
 * The main fixture is the real output of telemetry_weekly_digest(8) and
 * telemetry_new_account_outcomes(8) on a scratch PostgreSQL 17 loaded with
 * migrate_200, migrate_204 and 64 synthetic people (no real data); its
 * sign-up counts were checked against direct SQL counts of the raw rows.
 */
const fs = require('fs');
const path = require('path');
const {
  filterGrowthTotals, foldSmallGroups, countFromPct, schemaValue, versionOfRelease,
  ALLOWED_DIGEST_SECTIONS, MIN_GROUP,
} = require('../totalsFilter');

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
const DIGEST = fixture('synthetic-digest.json');
const OUTCOMES = fixture('synthetic-outcomes.json');
const CRASHES = {
  status: 'ok',
  period_days: 7,
  rows: [
    { release: 'app.volyume@3.4.0+3357', crashes: 31, people: 9 },
    { release: 'app.volyume@3.4.0+10', crashes: 4, people: 2 },
    { release: 'app.volyume@3.2.0+3300', crashes: 3, people: 2 },
    { release: 'my-phone-build', crashes: 50, people: 12 },
  ],
  total: { crashes: 88, people: 24 },
};

const run = (over = {}) => filterGrowthTotals({
  digest: DIGEST, outcomes: OUTCOMES, outcomesStatus: 'ok', crashes: CRASHES, ...over,
});

// Every key path in a value, with array positions written as [].
function keyPaths(value, prefix = '', out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => keyPaths(v, `${prefix}[]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(`${prefix}.${k}`);
      keyPaths(v, `${prefix}.${k}`, out);
    }
  }
  return out;
}

const SHOWN_VERSION_OUTCOME = [
  'new_accounts', 'first_workout_in_14_days', 'judged_14_days', 'three_workouts_in_14_days', 'still_training_after',
  ...['day_7', 'day_14', 'day_30'].flatMap((d) => [`still_training_after.${d}`, `still_training_after.${d}.judged`, `still_training_after.${d}.still_training`]),
];

// The complete allow-list of output key paths. A pass-through, a new digest
// column or a new section all change this set and fail the first test.
const ALLOWED_PATHS = new Set([
  '.format', '.generated_at', '.window_weeks', '.minimum_group',
  '.active_people_by_week', '.active_people_by_week.weeks', '.active_people_by_week.rows_not_counted',
  ...['week', 'complete', 'active_people'].map((k) => `.active_people_by_week.weeks[].${k}`),
  '.sign_ups_by_week', '.sign_ups_by_week.weeks', '.sign_ups_by_week.rows_not_counted',
  ...['signup_week', 'new_accounts', 'first_workout_within_7_days', 'first_7_days_over_for_everyone', 'still_using_app_after',
    'still_using_app_after.day_7', 'still_using_app_after.day_14', 'still_using_app_after.day_30']
    .map((k) => `.sign_ups_by_week.weeks[].${k}`),
  '.people_by_status_today', '.people_by_status_today.rows', '.people_by_status_today.other',
  '.people_by_status_today.rows[].status', '.people_by_status_today.rows[].people',
  '.people_by_status_today.other.people', '.people_by_status_today.other.rows_folded',
  ...[['sign_up_steps_by_week', ['mode', 'path', 'step'], ['people_completed']],
    ['leaving_reasons_by_week', ['moment', 'reason'], ['answers']],
    ['help_topics_by_week', ['topic', 'screen'], ['opens']]].flatMap(([s, labels, counts]) => [
    `.${s}`, `.${s}.weeks`, `.${s}.rows_not_counted`,
    `.${s}.weeks[].week`, `.${s}.weeks[].complete`, `.${s}.weeks[].rows`, `.${s}.weeks[].other`,
    ...[...labels, 'people', ...counts].map((k) => `.${s}.weeks[].rows[].${k}`),
    ...['people', 'rows_folded', ...counts].map((k) => `.${s}.weeks[].other.${k}`),
  ]),
  '.last_screen_before_leaving', '.last_screen_before_leaving.rows', '.last_screen_before_leaving.other',
  '.last_screen_before_leaving.rows_not_counted',
  '.last_screen_before_leaving.rows[].screen', '.last_screen_before_leaving.rows[].people',
  '.last_screen_before_leaving.other.people', '.last_screen_before_leaving.other.rows_folded',
  '.by_app_version', '.by_app_version.rows', '.by_app_version.other', '.by_app_version.rows_not_counted',
  ...['app_version', 'first_seen', 'workouts_per_person', 'workout_discard_pct', 'errors_per_visit', 'people', 'visits']
    .map((k) => `.by_app_version.rows[].${k}`),
  '.by_app_version.other.people', '.by_app_version.other.rows_folded', '.by_app_version.other.visits',
  '.new_account_outcomes', '.new_account_outcomes.status', '.new_account_outcomes.the_one_measure',
  '.new_account_outcomes.the_one_measure.judged_14_days', '.new_account_outcomes.the_one_measure.three_workouts_in_14_days',
  '.new_account_outcomes.weeks', '.new_account_outcomes.rows_not_counted',
  '.new_account_outcomes.weeks[].signup_week',
  ...SHOWN_VERSION_OUTCOME.map((k) => `.new_account_outcomes.weeks[].${k}`),
  '.new_account_outcomes.by_app_version_at_sign_up',
  '.new_account_outcomes.by_app_version_at_sign_up.rows', '.new_account_outcomes.by_app_version_at_sign_up.other',
  '.new_account_outcomes.by_app_version_at_sign_up.rows[].app_version',
  ...SHOWN_VERSION_OUTCOME.map((k) => `.new_account_outcomes.by_app_version_at_sign_up.rows[].${k}`),
  '.new_account_outcomes.by_app_version_at_sign_up.other.rows_folded',
  ...SHOWN_VERSION_OUTCOME.map((k) => `.new_account_outcomes.by_app_version_at_sign_up.other.${k}`),
  '.crashes', '.crashes.status', '.crashes.http_status', '.crashes.period_days', '.crashes.total', '.crashes.total.crashes',
  '.crashes.total.people', '.crashes.by_app_version', '.crashes.by_app_version.rows', '.crashes.by_app_version.other',
  '.crashes.by_app_version.rows[].app_version', '.crashes.by_app_version.rows[].people', '.crashes.by_app_version.rows[].crashes',
  '.crashes.by_app_version.other.people', '.crashes.by_app_version.other.rows_folded', '.crashes.by_app_version.other.crashes',
  '.crashes.rows_not_counted',
]);

// Strings that must never be in the output: the safety section's labels,
// the catalogue's and release notes' free text, the planted typed text and
// identifiers. Built from the fixture itself, so a pass-through fails.
const FORBIDDEN_TEXT = [
  'safety', 'flag_open', 'no_flag', 'catalogue', 'description', 'notes', 'Android setup fix',
  '07700', 'call me', 'my private notes', "Allan's phone", 'my-phone-build',
  ...DIGEST.catalogue.map((c) => c.description),
  ...DIGEST.releases.map((r) => r.notes),
];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function assertOnlyAllowed(out) {
  const extra = [...keyPaths(out)].filter((p) => !ALLOWED_PATHS.has(p));
  if (extra.length) throw new Error(`keys outside the allow-list: ${extra.slice(0, 8).join(', ')}`);
  const text = JSON.stringify(out);
  const found = FORBIDDEN_TEXT.filter((s) => text.includes(s));
  if (found.length) throw new Error(`forbidden text in output: ${found.slice(0, 4).join(' | ')}`);
  if (UUID_RE.test(text)) throw new Error('an identifier is in the output');
}

describe('only allow-listed keys are emitted', () => {
  test('every key path of the real-fixture output is on the allow-list, and the forbidden text is absent', () => {
    expect(() => assertOnlyAllowed(run())).not.toThrow();
  });

  test('the fixture really contains what must be dropped (so the check above has teeth)', () => {
    expect(DIGEST.safety_activity_groups.length).toBeGreaterThan(0);
    expect(DIGEST.safety_activity_groups.map((r) => r.safety_group)).toContain('no_flag');
    expect(JSON.stringify(DIGEST)).toContain('call me on 07700 900123');
    expect(JSON.stringify(DIGEST)).toContain('my private notes');
    expect(DIGEST.releases.every((r) => typeof r.notes === 'string' && r.notes.length > 0)).toBe(true);
    expect(DIGEST.catalogue.length).toBeGreaterThan(30);
  });

  test('the sections read are exactly the listed ones, and safety is not one of them', () => {
    expect(ALLOWED_DIGEST_SECTIONS).not.toContain('safety_activity_groups');
    expect([...ALLOWED_DIGEST_SECTIONS].sort()).toEqual([
      'activation_by_path', 'confusion_topics', 'core_loops', 'engagement_status_counts', 'exit_reasons',
      'generated_at', 'lapse_last_screens', 'onboarding_funnel', 'release_compare', 'weeks',
    ]);
    expect(Object.keys(run())).toEqual([
      'format', 'generated_at', 'window_weeks', 'minimum_group', 'active_people_by_week', 'sign_ups_by_week',
      'people_by_status_today', 'sign_up_steps_by_week', 'last_screen_before_leaving', 'leaving_reasons_by_week',
      'help_topics_by_week', 'by_app_version', 'new_account_outcomes', 'crashes',
    ]);
  });
});

describe('safety_activity_groups and free text never appear', () => {
  test('a value planted in the safety section, the catalogue or the release notes does not come out', () => {
    const digest = JSON.parse(JSON.stringify(DIGEST));
    digest.safety_activity_groups.push({ week: '2026-11-16', safety_group: 'SENTINEL_SAFETY_GROUP', users: 99 });
    digest.catalogue[0].description = 'SENTINEL_CATALOGUE_TEXT';
    digest.releases[0].notes = 'SENTINEL_RELEASE_NOTE';
    digest.release_compare[0].notes = 'SENTINEL_COMPARE_NOTE';
    const text = JSON.stringify(run({ digest }));
    ['SENTINEL_SAFETY_GROUP', 'SENTINEL_CATALOGUE_TEXT', 'SENTINEL_RELEASE_NOTE', 'SENTINEL_COMPARE_NOTE', '99']
      .forEach((s) => expect(text).not.toContain(s));
  });

  test('typed text in a label is never printed, even when many people carry it', () => {
    const digest = JSON.parse(JSON.stringify(DIGEST));
    digest.exit_reasons.push({ week: '2026-11-16', moment: 'setup_leave', reason: 'my name is Sam Jones', users: 40, answers: 40 });
    digest.lapse_last_screens.push({ last_screen: 'Sam Jones notes', lapsed_users: 30, active_users: 0 });
    digest.lapse_last_screens.push({ last_screen: 'SamJonesDiary', lapsed_users: 2, active_users: 0 });
    digest.confusion_topics.push({ week: '2026-11-16', topic: 'Sam typed this', screen: 'Today', users: 12, opens: 12 });
    digest.release_compare.push({ app_version: 'Sam build', users: 50, visits: 70, notes: '' });
    const out = run({ digest });
    const text = JSON.stringify(out);
    ['Sam', 'Jones', 'typed'].forEach((s) => expect(text).not.toContain(s));
    // Their people are still counted, in "other".
    const week = out.leaving_reasons_by_week.weeks.find((w) => w.week === '2026-11-16');
    expect(week.other.people).toBe(40 + 1);
    expect(out.last_screen_before_leaving.other.people).toBeGreaterThanOrEqual(32);
    expect(out.by_app_version.other.people).toBe(50 + 3);
  });
});

describe('an unknown key is dropped by default', () => {
  test('unknown top-level sections and unknown row keys do not come out', () => {
    const digest = JSON.parse(JSON.stringify(DIGEST));
    digest.user_emails = ['someone@example.com'];
    digest.new_section_from_a_later_migration = [{ week: '2026-11-16', users: 7 }];
    digest.core_loops[0].user_id = '6b0c2f5e-2d7b-4c84-9d49-2a3c2b9f0e11';
    digest.exit_reasons[0].free_text = 'SENTINEL_ROW_TEXT';
    digest.engagement_status_counts.SENTINEL_STATUS = 9;
    const out = run({ digest });
    expect(() => assertOnlyAllowed(out)).not.toThrow();
    const text = JSON.stringify(out);
    ['someone@example.com', 'new_section_from_a_later_migration', 'SENTINEL_ROW_TEXT', 'SENTINEL_STATUS', 'user_id']
      .forEach((s) => expect(text).not.toContain(s));
    // An unknown status's people are counted in "other", its name dropped.
    expect(out.people_by_status_today.other).toEqual({ people: 9, rows_folded: 1 });
  });
});

describe('groups under five fold into "other"', () => {
  test('four people fold, five are shown (the boundary)', () => {
    expect(MIN_GROUP).toBe(5);
    const { rows, other } = foldSmallGroups([
      { labels: { reason: 'no_time' }, people: 5, counts: { answers: 6 } },
      { labels: { reason: 'felt_off' }, people: 4, counts: { answers: 4 } },
      { labels: { reason: 'other' }, people: 1, counts: { answers: 2 } },
    ], ['answers']);
    expect(rows).toEqual([{ reason: 'no_time', people: 5, answers: 6 }]);
    expect(other).toEqual({ people: 5, rows_folded: 2, answers: 6 });
  });

  test('nothing folded gives no "other"', () => {
    expect(foldSmallGroups([{ labels: { s: 'a' }, people: 9, counts: {} }], []).other).toBeNull();
  });

  test('every shown breakdown row in the real-fixture output covers five or more people', () => {
    const out = run();
    const shown = [
      ...out.sign_up_steps_by_week.weeks, ...out.leaving_reasons_by_week.weeks, ...out.help_topics_by_week.weeks,
    ].flatMap((w) => w.rows)
      .concat(out.people_by_status_today.rows, out.last_screen_before_leaving.rows, out.by_app_version.rows,
        out.crashes.by_app_version.rows);
    expect(shown.length).toBeGreaterThan(5);
    shown.forEach((r) => expect(r.people).toBeGreaterThanOrEqual(5));
    out.new_account_outcomes.by_app_version_at_sign_up.rows.forEach((r) => expect(r.new_accounts).toBeGreaterThanOrEqual(5));
  });

  test('the fixture folds real rows (last screens: Train, Coach and Settings have fewer than five who left)', () => {
    const out = run().last_screen_before_leaving;
    expect(out.rows.map((r) => r.screen)).toEqual(['Nutrition', 'ActiveWorkout', 'Today']);
    expect(out.other).toEqual({ people: 3 + 3 + 2, rows_folded: 3 });
  });

  test('a screen only people who stayed last saw is not a leaving screen at all', () => {
    expect(JSON.stringify(run().last_screen_before_leaving)).not.toContain('private');
  });
});

describe('labels are checked against the app schema', () => {
  test('values the app can send pass, others do not, and an undeclared event or field never passes', () => {
    expect(schemaValue('exit_reason_given', 'reason', 'no_time')).toBe(true);
    expect(schemaValue('exit_reason_given', 'reason', 'call me')).toBe(false);
    expect(schemaValue('screen_viewed', 'screen', 'ActiveWorkout')).toBe(true);
    expect(schemaValue('screen_viewed', 'screen', 'my private notes')).toBe(false);
    expect(schemaValue('onboarding_step_viewed', 'step', 9)).toBe(false);
    expect(schemaValue('account_created', 'provider', 'google')).toBe(false); // legacy: no schema
    expect(schemaValue('exit_reason_given', 'note', 'x')).toBe(false);
  });

  test('a Sentry release name gives its app version only when it has the SDK shape', () => {
    expect(versionOfRelease('app.volyume@3.4.0+3357')).toBe('3.4.0');
    expect(versionOfRelease('app.volyume@3.4.0')).toBe('3.4.0');
    expect(versionOfRelease('my-phone-build')).toBeNull();
    expect(versionOfRelease('app.volyume@three')).toBeNull();
  });
});

describe('counts rebuilt from rounded percentages are exact or null', () => {
  // Postgres round(numeric, 1) of 100 * k / n, halves away from zero,
  // written independently of the filter's own arithmetic.
  const pgPct = (k, n) => Math.floor((2000 * k + n) / (2 * n)) / 10;

  test('for every n up to 999 and every k, the count comes back exactly', () => {
    // Below 1,000 people a one-decimal percentage always fits one count.
    for (let n = 1; n <= 999; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        if (countFromPct(n, pgPct(k, n)) !== k) throw new Error(`n=${n} k=${k}`);
      }
    }
  });

  test('a percentage that fits two counts gives null, never a guess', () => {
    expect(pgPct(1, 2000)).toBe(pgPct(2, 2000));
    expect(countFromPct(2000, pgPct(1, 2000))).toBeNull();
    // From 1,000 people up, whether a count is unique varies, and each
    // answer is either the right count or null.
    for (const n of [1000, 1999, 2000, 5003, 25000]) {
      for (let k = 0; k <= n; k += Math.max(1, Math.floor(n / 97))) {
        const got = countFromPct(n, pgPct(k, n));
        const fits = [k - 1, k, k + 1].filter((j) => j >= 0 && j <= n && pgPct(j, n) === pgPct(k, n));
        expect(got).toBe(fits.length === 1 ? k : null);
      }
    }
    expect(countFromPct(5, null)).toBeNull();
    expect(countFromPct(0, 0)).toBeNull();
  });

  test('the real fixture matches the direct SQL counts of the synthetic rows', () => {
    // Checked on the scratch database: new, first workout in 7 days, active
    // after day 7, 14 and 30 per sign-up week.
    const want = {
      '2026-09-28': [7, 6, 5, 5, 5], '2026-10-05': [7, 6, 5, 5, 5], '2026-10-12': [8, 6, 8, 6, 6],
      '2026-10-19': [7, 6, 6, 5, null], '2026-10-26': [7, 6, 6, 6, null], '2026-11-02': [8, 7, 4, null, null],
      '2026-11-09': [7, 6, null, null, null], '2026-11-16': [5, 4, null, null, null],
    };
    const got = Object.fromEntries(run().sign_ups_by_week.weeks.map((w) => [w.signup_week, [
      w.new_accounts, w.first_workout_within_7_days,
      w.still_using_app_after.day_7, w.still_using_app_after.day_14, w.still_using_app_after.day_30,
    ]]));
    expect(got).toEqual(want);
  });
});

describe('sources that are missing or failed', () => {
  test('migrate_204 not applied: the section says so and carries nothing else', () => {
    expect(run({ outcomes: null, outcomesStatus: 'not_applied' }).new_account_outcomes).toEqual({ status: 'not_applied' });
  });

  test('no crash token: "not_configured"; a failed read keeps only its HTTP status', () => {
    expect(run({ crashes: { status: 'not_configured' } }).crashes).toEqual({ status: 'not_configured' });
    expect(run({ crashes: { status: 'failed', http_status: 401, body: 'SENTINEL' } }).crashes).toEqual({ status: 'failed', http_status: 401 });
    expect(run({ crashes: null }).crashes).toEqual({ status: 'not_configured' });
  });

  test('crash rows: builds of one version add up, under five people fold, an odd release name is never printed', () => {
    const c = run().crashes;
    expect(c.by_app_version.rows).toEqual([{ app_version: '3.4.0', people: 9 + 2, crashes: 31 + 4 }]);
    expect(c.by_app_version.other).toEqual({ people: 2 + 12, rows_folded: 2, crashes: 3 + 50 });
    expect(c.total).toEqual({ crashes: 88, people: 24 });
    expect(JSON.stringify(c)).not.toContain('my-phone-build');
  });

  test('a digest without a usable generated_at is refused rather than guessed', () => {
    expect(() => filterGrowthTotals({ digest: { ...DIGEST, generated_at: 'yesterday' } })).toThrow('generated_at');
    expect(() => filterGrowthTotals({ digest: null })).toThrow('digest');
  });
});

describe('the checks fail for a pass-through', () => {
  // If the allow-list were replaced by copying the input across, these are
  // the outputs it would give; the same assertions used above must reject
  // every one of them.
  const passThroughs = {
    'whole digest copied': (i) => ({ ...i.digest }),
    'allowed sections copied whole': (i) => Object.fromEntries(ALLOWED_DIGEST_SECTIONS.map((k) => [k, i.digest[k]])),
    'filter output plus the remaining sections': (i) => ({ ...filterGrowthTotals(i), safety_activity_groups: i.digest.safety_activity_groups }),
  };
  test.each(Object.keys(passThroughs))('%s is rejected', (name) => {
    const input = { digest: DIGEST, outcomes: OUTCOMES, outcomesStatus: 'ok', crashes: CRASHES };
    expect(() => assertOnlyAllowed(passThroughs[name](input))).toThrow();
  });
});
