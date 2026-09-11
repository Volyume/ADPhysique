/**
 * community.privacy.guard.test.js - blueprint section 10
 * (`docs/social-discovery-2026-09-06/30-BLUEPRINT.md`), SD-04.
 *
 * What this suite pins: the ONE thing Community must never do. Nothing
 * about a person's body, food, Progress Scan, coaching output, health
 * data or direct identity may enter it, in any form, from any file.
 *
 * A source-level guard rather than a behavioural one because the failure
 * mode is a future edit: someone adding a "nice touch" to a post card
 * that reads bodyweight, or a screen that shows the user's kcal beside
 * their session. A unit test only covers the code that exists today;
 * this covers the code nobody has written yet.
 *
 * A SECOND allowance, narrower still, for two files whose whole job is to
 * SAY what is never shared: `src/components/community/PrivacyReceipt.js`
 * (the "Others can see" / "Never shared" receipt) and
 * `src/screens/CommunityRulesScreen.js` (the versioned rules text, which
 * lists "Your bodyweight and body composition", "Your Progress Scan",
 * "Your nutrition and food diary"). Those words are USER-FACING COPY, the
 * opposite of a read: they are the promise itself. So for exactly those
 * two files, and no others, quoted string literals are stripped before the
 * scan and the remaining code is scanned as normal. A real read in either
 * file (a property access, an import, a database call) still fails, because
 * none of that is inside a string.
 *
 * ONE deliberate allowance, and why it is not a hole. The blueprint's
 * section 10 shorthand lists "capability" among the words no Community
 * file may read, while section 5.4 requires "Adapt for me" to compose
 * `loadCapabilityResolveState` and `blockingConflicts` by name. Both are
 * right: adaptation has to ask the recipient's own device whether a
 * movement clashes with their own rules, or it would serve them the
 * exact thing that layer exists to keep out. What must never happen is
 * a capability-derived FACT leaving the device (the Q4 ruling quoted at
 * `sessionEffective.js:723-726`: "no capability-derived event leaves the
 * device"). So the allowance is exactly two imports in exactly one file,
 * and the same file is forbidden from touching the transport.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const LIB_DIR = path.join(ROOT, 'src/lib/community');
const COMPONENT_DIR = path.join(ROOT, 'src/components/community');
const SCREEN_DIR = path.join(ROOT, 'src/screens');
const HOOK = path.join(ROOT, 'src/hooks/useCommunityMe.js');
const MIGRATION = path.join(ROOT, 'supabase/migrate_160_community.sql');
// Gym database blueprint (`docs/gym-database-2026-09-06/20-BLUEPRINT.md`,
// GD-13): the gym directory is infrastructure UNDER Community, and this
// guard's walk is extended to cover it rather than left to a guard of its
// own, so the one sentence at the top of this file ("nothing about a
// person's body... may enter it") and the location rule below are both
// enforced from the same place a future rename cannot quietly miss.
const GYMS_DIR = path.join(ROOT, 'src/lib/gyms');

const { SENSITIVE_COMMUNITY_KEYS, POST_PAYLOAD_KEYS } = require('../lib/community/validation');
const { BLOCKED_TERMS } = require('../lib/community/keywordFilter');

/** Strip block and line comments so a rule NAMED in a comment (this file
 * is full of them, and so is the source) is never mistaken for a read. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** The two files that exist to say what is never shared (see the header).
 * Their copy names the forbidden things on purpose; their CODE still may
 * not read any of it. */
const COPY_ONLY_FILES = [
  'src/components/community/PrivacyReceipt.js',
  'src/screens/CommunityRulesScreen.js',
];

/** Strip quoted string literals, leaving the code around them. Applied to
 * the two copy-only files above and to nothing else. */
function stripStrings(source) {
  return source
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

function communityFiles() {
  const screens = fs.existsSync(SCREEN_DIR)
    ? fs.readdirSync(SCREEN_DIR)
      .filter((f) => f.startsWith('Community') && f.endsWith('.js'))
      .map((f) => path.join(SCREEN_DIR, f))
    : [];
  return [
    ...walk(LIB_DIR),
    ...walk(COMPONENT_DIR),
    ...walk(GYMS_DIR),
    ...screens,
    ...(fs.existsSync(HOOK) ? [HOOK] : []),
  ];
}

// The refusal list, as things a source file could plausibly READ. Kept
// as regexes so both the snake_case column and the camelCase field are
// caught, and so a partial word ("scanning", "agenda") is not.
const FORBIDDEN_READS = [
  /\bbodyweight\b/i,
  /\bbody_weight\b/i,
  /\bweight_kg\b/i,
  /\bbody_fat\b/i,
  /\bbf_pct\b/i,
  /\bffm\b/i,
  /\bfm_kg\b/i,
  /\bheight_cm\b/i,
  /\bkcal\b/i,
  /\bcalories\b/i,
  /\bmacros?\b/i,
  /\bfood_entries\b/i,
  /\bdaily_intake\b/i,
  /\bprogress_scan\b/i,
  /\bprogress_photos?\b/i,
  /\bprogressScan\b/,
  /\bed_pattern\b/i,
  /\bedPattern\b/,
  /\bscoff\b/i,
  /\bfirst_name\b/i,
  /\bfirstName\b/,
  // Community at onboarding (2026-09-11, fresh-eyes review N8): the handle
  // is derived from the sign-in email SERVER-SIDE (migrate_173), so no
  // Community source may read the address at all.
  /\bemail\b/i,
  /\bdate_of_birth\b/i,
  /\bdateOfBirth\b/,
  /\bweekly_?[Cc]oach\b/,
  /\bcoach_outputs?\b/i,
  /\bweight_log\b/i,
  /\bbody_composition_log\b/i,
  /\bcapability_constraints\b/i,
  /\bgetCapabilityConstraints\b/,
];

// No Community file is allowed to name the capability lane at all: the
// one file that used to (adapt.js, the programme-adaptation composition)
// was removed entirely with Community programme-sharing
// (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2).

/**
 * The discovery campaign's files (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 3;
 * SD-30). These are the first Community files that read the training
 * history at all, which makes them the first place a body, food or
 * coaching read could plausibly be added by someone reaching for "one
 * more useful signal". They are named here so a rename cannot quietly
 * drop them out of the walk, and they are held to a STRICTER list than
 * the rest: none of them has the adaptation lane's reason to name the
 * capability layer, so for these four the bare words are refused too.
 */
const DISCOVERY_FILES = [
  'src/lib/community/trainingProfile.js',
  'src/lib/community/connections.js',
  'src/lib/community/messages.js',
  'src/lib/community/findPeople.js',
  // Community product audit `60-DESIGN-PROGRESS-COMMUNITY.md` section 1
  // (consistency counters). A second training-history reader, held to
  // the same stricter list for the same reason `trainingProfile.js` is.
  'src/lib/community/trainingConsistency.js',
];

const DISCOVERY_EXTRA_FORBIDDEN = [
  /\bscan\b/i,
  /\bcapability\b/i,
  /\bcapabilities\b/i,
  /\bprotein\b/i,
  /\bcarbs\b/i,
  /\bcheck_?in\b/i,
  /\binjur/i,
  /\blimitation\b/i,
  /\bmeasurement/i,
  /\bage\b(?!_band)/i,
];

/**
 * The ONLY device reads `trainingProfile.js` may make (SD-30: "the
 * training profile reads completed-workout timestamps and exercise ids
 * only"). An allow-list rather than a deny-list, for the same reason the
 * post payloads are: a database helper added to the app next year cannot
 * be pulled in here, because it was never named.
 */
const TRAINING_PROFILE_FILE = path.join(LIB_DIR, 'trainingProfile.js');
const TRAINING_PROFILE_DB_READS = [
  'getCompletedWorkoutStartTimestamps',
  'getWorkoutSetsSince',
  'getAllExercises',
  'getActivePlan',
];

/**
 * The ONLY device reads `trainingConsistency.js` may make (community
 * product audit section 1: "completed-workout timestamps... and the
 * active plan's days per week"). `getRoutinesForPlan`'s row COUNT is
 * the days-per-week figure; nothing about a routine's exercises is
 * read from it here.
 *
 * migrate_172 (blueprint section 4, CR-05) widens this by one, deliberately
 * and reviewed here: `getPRCountInWindow` answers a COUNT of personal
 * records over a rolling 28 days (the exact calculate1RM-based method
 * `getWeeklyPRCount` uses for a week, database.js), never the exercise,
 * weight or reps behind it -- so it carries no more risk than the PR
 * moments the activity feed already shows for anyone who shares what they
 * did, and stays inside SD-30's "nothing about the body, food, Progress
 * Scan, injuries, coaching or check-ins" boundary.
 */
const TRAINING_CONSISTENCY_FILE = path.join(LIB_DIR, 'trainingConsistency.js');
const TRAINING_CONSISTENCY_DB_READS = [
  'getCompletedWorkoutStartTimestamps',
  'getActivePlan',
  'getRoutinesForPlan',
  'getPRCountInWindow',
];

/**
 * Phase 3 (`docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md` section
 * 8): "the ambient payload builders import nothing new from the
 * database". `posts.js`'s `buildSessionPayload`/`buildPrPayload` are
 * reused, unchanged, by the new ambient-item path (`ambient.js`); this
 * pins their existing device-read surface so a future edit cannot widen
 * it silently just because a NEW caller (the completion hook) now exists.
 * An allow-list, matching the shape `trainingProfile.js`'s own pin above
 * already uses.
 */
const POSTS_FILE = path.join(LIB_DIR, 'posts.js');
const POSTS_DB_READS = [
  'getWorkoutById', 'getWorkoutSetsForWorkout', 'getWorkoutSetsForExercise',
  'getRoutineById', 'getProgrammeById', 'getAllExercises',
  'getAllMesocyclesForUser', 'getBlockTrainingData', 'getPriorCompletedSets',
];

/**
 * Phase 3 (spec section 8): "the ED gate is consulted before any auto
 * item (regex pin on the completion hook)". `publishAmbientItems`
 * (`ambient.js`) is the completion hook every auto item flows through;
 * this pins that its own gate check (`sessionShareGateState`) is called
 * BEFORE it ever calls `sendAutoItem` (which is what actually posts),
 * inside that one function's own body -- not merely somewhere earlier in
 * the file, which file order alone could satisfy by accident.
 */
const AMBIENT_FILE = path.join(LIB_DIR, 'ambient.js');

describe('no Community file reads personal data', () => {
  test('there is Community source to guard', () => {
    // If this ever fails, the guard has quietly stopped guarding
    // anything (a folder rename, a moved file) rather than passing.
    expect(communityFiles().length).toBeGreaterThan(10);
  });

  test.each(communityFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s reads nothing personal',
    (rel, full) => {
      // validation.js IS the refusal list. It names every forbidden key
      // on purpose, which is the one place that is correct.
      if (rel.endsWith('src/lib/community/validation.js')) return;
      const stripped = code(fs.readFileSync(full, 'utf8'));
      // The two copy-only files keep every line of code under the scan;
      // only their quoted copy is set aside (see the header).
      const source = COPY_ONLY_FILES.includes(rel.split(path.sep).join('/'))
        ? stripStrings(stripped)
        : stripped;
      for (const pattern of FORBIDDEN_READS) {
        expect(source).not.toMatch(pattern);
      }
    },
  );

  test('no Community file reaches the capability lane', () => {
    for (const full of communityFiles()) {
      const source = code(fs.readFileSync(full, 'utf8'));
      const imports = (source.match(/^import [^\n]*capability[^\n]*$/gim) ?? []).map((l) => l.trim());
      expect({ file: path.relative(ROOT, full), imports }).toEqual({
        file: path.relative(ROOT, full), imports: [],
      });
    }
  });

  test('every discovery file is present and inside the walk', () => {
    // A rename that moved one of these out of src/lib/community would
    // leave the guard passing over a file it no longer sees.
    const walked = new Set(communityFiles().map((f) => path.relative(ROOT, f).split(path.sep).join('/')));
    const missing = DISCOVERY_FILES.filter((rel) => !walked.has(rel));
    expect({ missing }).toEqual({ missing: [] });
  });

  test.each(DISCOVERY_FILES)('%s reads nothing personal, on the stricter list', (rel) => {
    const source = code(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const pattern of [...FORBIDDEN_READS, ...DISCOVERY_EXTRA_FORBIDDEN]) {
      expect({ rel, pattern: String(pattern), matched: pattern.test(source) })
        .toEqual({ rel, pattern: String(pattern), matched: false });
    }
  });

  test('trainingProfile.js reads only the four device functions SD-30 allows', () => {
    const source = code(fs.readFileSync(TRAINING_PROFILE_FILE, 'utf8'));
    // The single database import, and everything it takes from it.
    const imports = source.match(/import\s*\{[^}]*\}\s*from\s*'\.\.\/database';/g) ?? [];
    expect(imports).toHaveLength(1);
    const named = imports[0]
      .replace(/^import\s*\{|\}\s*from\s*'\.\.\/database';$/g, '')
      .split(',')
      .map((s2) => s2.trim())
      .filter(Boolean);
    expect(named.sort()).toEqual([...TRAINING_PROFILE_DB_READS].sort());
    // And no second route to the device: a lazy require would sidestep
    // the import above entirely.
    expect(source).not.toMatch(/require\(['"][^'"]*database['"]\)/);
  });

  test('trainingConsistency.js reads only the four device functions section 1 and migrate_172 allow', () => {
    const source = code(fs.readFileSync(TRAINING_CONSISTENCY_FILE, 'utf8'));
    const imports = source.match(/import\s*\{[^}]*\}\s*from\s*'\.\.\/database';/g) ?? [];
    expect(imports).toHaveLength(1);
    const named = imports[0]
      .replace(/^import\s*\{|\}\s*from\s*'\.\.\/database';$/g, '')
      .split(',')
      .map((s2) => s2.trim())
      .filter(Boolean);
    expect(named.sort()).toEqual([...TRAINING_CONSISTENCY_DB_READS].sort());
    expect(source).not.toMatch(/require\(['"][^'"]*database['"]\)/);
  });

  test('posts.js payload builders read only the nine device functions they always have', () => {
    const source = code(fs.readFileSync(POSTS_FILE, 'utf8'));
    const imports = source.match(/import\s*\{[^}]*\}\s*from\s*'\.\.\/database';/g) ?? [];
    expect(imports).toHaveLength(1);
    const named = imports[0]
      .replace(/^import\s*\{|\}\s*from\s*'\.\.\/database';$/g, '')
      .split(',')
      .map((s2) => s2.trim())
      .filter(Boolean);
    expect(named.sort()).toEqual([...POSTS_DB_READS].sort());
    expect(source).not.toMatch(/require\(['"][^'"]*database['"]\)/);
  });

  test('the ambient completion hook consults the gate before any auto item is sent', () => {
    const source = code(fs.readFileSync(AMBIENT_FILE, 'utf8'));
    const fnMatch = /export async function publishAmbientItems\([\s\S]*?\n}\n/.exec(source);
    expect(fnMatch).toBeTruthy();
    const body = fnMatch[0];
    const gateIdx = body.indexOf('sessionShareGateState(');
    const sendIdx = body.indexOf('sendAutoItem(');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(sendIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(sendIdx);
  });

  test('no Community file imports the food, nutrition, wellbeing or ED modules', () => {
    for (const full of communityFiles()) {
      const source = code(fs.readFileSync(full, 'utf8'));
      for (const pattern of [
        /from '[^']*\/food\//, /from '[^']*nutritionEngine'/, /from '[^']*wellbeing'/,
        /from '[^']*edPatternDetector'/, /from '[^']*weeklyCoach'/, /from '[^']*coachApply'/,
        /from '[^']*progressScan[^']*'/,
      ]) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});

/**
 * F7 (fresh-eyes review): a Community SCREEN reaching straight into
 * `src/lib/database.js` bypasses the whole `src/lib/community` privacy
 * boundary the tests above police file-by-file (trainingProfile.js,
 * trainingConsistency.js, posts.js) -- a screen has no equivalent
 * itemised-import test of its own, so `CommunityGroupScreen.js` had
 * quietly grown a lazy `getAllWorkouts` require (SELECT w.*, private
 * notes included) to take a single id. Fixed to an id-only read
 * (`getLatestCompletedWorkoutId`); this is that screen's own itemised
 * exception, same convention as the three lib files above, rather than
 * a blanket ban with a silent gap. A sweep at the time of this fix found
 * no OTHER Community screen reaching database.js at all.
 */
describe('no Community SCREEN reaches src/lib/database.js except one named, narrow exception', () => {
  // The only screen allowed near the device layer, and exactly the
  // functions it may take from it. Any other screen wanting one joins
  // this list explicitly, in the same lead-reviewed change that adds it
  // -- never silently.
  const SCREEN_DB_EXCEPTIONS = {
    'CommunityGroupScreen.js': ['getLatestCompletedWorkoutId'],
  };

  function communityScreenFiles() {
    return fs.existsSync(SCREEN_DIR)
      ? fs.readdirSync(SCREEN_DIR).filter((f) => f.startsWith('Community') && f.endsWith('.js'))
      : [];
  }

  test('there are Community screens to guard', () => {
    expect(communityScreenFiles().length).toBeGreaterThan(0);
  });

  test.each(communityScreenFiles())('%s', (file) => {
    const source = code(fs.readFileSync(path.join(SCREEN_DIR, file), 'utf8'));
    const staticImportRefs = source.match(/from\s*'\.\.\/lib\/database'/g) ?? [];
    const lazyRequireRefs = source.match(/require\(['"]\.\.\/lib\/database['"]\)/g) ?? [];
    const allowed = SCREEN_DB_EXCEPTIONS[file];

    if (!allowed) {
      expect(staticImportRefs).toEqual([]);
      expect(lazyRequireRefs).toEqual([]);
      return;
    }
    // The named exception: exactly the allowed functions, lazily
    // required (never a static top-level import -- that would pull the
    // device layer into every screen bundling this one, not only the
    // one call site that needs it).
    expect(staticImportRefs).toEqual([]);
    expect(lazyRequireRefs).toHaveLength(1);
    const destructure = /const \{\s*([^}]*)\s*\} = require\('\.\.\/lib\/database'\);/.exec(source);
    expect(destructure).toBeTruthy();
    const named = destructure[1].split(',').map((s) => s.trim()).filter(Boolean);
    expect(named.sort()).toEqual([...allowed].sort());
  });

  test('getLatestCompletedWorkoutId itself is an id-only SELECT, never w.* (private notes excluded by construction)', () => {
    const dbSource = fs.readFileSync(path.join(ROOT, 'src/lib/database.js'), 'utf8');
    const fnMatch = /export async function getLatestCompletedWorkoutId\([\s\S]*?\n\}/.exec(dbSource);
    expect(fnMatch).toBeTruthy();
    const body = fnMatch[0];
    expect(body).toMatch(/SELECT id FROM workouts/);
    expect(body).toMatch(/is_completed = 1/);
    expect(body).toMatch(/ORDER BY started_at DESC/);
    expect(body).toMatch(/LIMIT 1/);
    expect(body).not.toMatch(/SELECT w\.\*/);
    expect(body).not.toMatch(/rowToCamel/);
  });
});

/**
 * GD-13 (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`): "A person's gym is a chosen fact... there is no
 * inference from sessions, no check-ins, no live presence." The half of
 * that rule a behavioural test cannot see is the one a future "nice
 * touch" would add silently: a location permission read, a device
 * coordinate cached to survive a restart, or any local-storage write at
 * all from a module whose whole design is "ask the server, at the
 * moment the user asks, and keep nothing back". `src/lib/gyms` is a
 * transport-and-ranking layer with no cache of its own on purpose (the
 * profile's own `gym_id`/`other_gym_ids` are the only place a choice
 * persists, and those are Community's tables, not this module's).
 */
const LOCATION_FORBIDDEN = [
  // The dependency the blueprint says never to add without a founder
  // decision (CLAUDE.md: never add a dependency without asking); catches
  // it whether it arrives as an import or a bare package reference.
  /expo-location/i,
  // The device location APIs that dependency would expose.
  /watchPositionAsync/,
  /getCurrentPositionAsync/,
  /getLastKnownPositionAsync/,
  /startLocationUpdatesAsync/,
  /requestForegroundPermissionsAsync/,
  /requestBackgroundPermissionsAsync/,
  // Every local-storage route the rest of the app uses to persist
  // something between sessions. None belongs in this module at all: a
  // coordinate is used at the moment it is supplied to a search and never
  // written anywhere.
  /AsyncStorage/,
  /SecureStore/,
  /expo-sqlite/,
];

/*
 * Founder decision 2026-09-07 (in chat, "yes to both"): `expo-location`
 * is added for exactly one use, "Use my location" in the gym finder:
 * an explicit tap, foreground "while using" only, approximate accuracy,
 * the coordinate handed to a gym search and discarded. The ONLY file in
 * `src/` allowed to name the dependency or a position API is
 * `src/lib/deviceLocation.js`; that file may request a foreground
 * permission and read one current position, and may never watch,
 * subscribe, run in the background, read a cached last-known position,
 * or write to any local storage. Every other file under `src/` stays
 * under the original ban.
 */
const LOCATION_ADAPTER = path.join(ROOT, 'src/lib/deviceLocation.js');
const LOCATION_ADAPTER_FORBIDDEN = [
  /watchPositionAsync/,
  /getLastKnownPositionAsync/,
  /startLocationUpdatesAsync/,
  /requestBackgroundPermissionsAsync/,
  /startGeofencingAsync/,
  /AsyncStorage/,
  /SecureStore/,
  /expo-sqlite/,
];
const LOCATION_ANYWHERE_FORBIDDEN = [
  /expo-location/i,
  /watchPositionAsync/,
  /getCurrentPositionAsync/,
  /getLastKnownPositionAsync/,
  /startLocationUpdatesAsync/,
  /requestForegroundPermissionsAsync/,
  /requestBackgroundPermissionsAsync/,
];
const SRC_DIR = path.join(ROOT, 'src');

describe('the device location adapter is the only door, and it only opens forwards', () => {
  test('the adapter exists', () => {
    expect(fs.existsSync(LOCATION_ADAPTER)).toBe(true);
  });

  test('the adapter never watches, backgrounds, reads a cached position or persists', () => {
    const source = code(fs.readFileSync(LOCATION_ADAPTER, 'utf8'));
    for (const pattern of LOCATION_ADAPTER_FORBIDDEN) {
      expect({ pattern: String(pattern), matched: pattern.test(source) })
        .toEqual({ pattern: String(pattern), matched: false });
    }
  });

  test.each(
    walk(SRC_DIR)
      .filter((f) => f !== LOCATION_ADAPTER)
      .map((f) => [path.relative(ROOT, f), f]),
  )('%s never names the location dependency or a position API', (rel, full) => {
    const source = code(fs.readFileSync(full, 'utf8'));
    for (const pattern of LOCATION_ANYWHERE_FORBIDDEN) {
      expect({ rel, pattern: String(pattern), matched: pattern.test(source) })
        .toEqual({ rel, pattern: String(pattern), matched: false });
    }
  });
});

describe('GD-13: the gym directory never tracks or persists a coordinate', () => {
  test('there is gyms source to guard', () => {
    // Same self-check as the Community walk above: if this ever fails,
    // the guard has quietly stopped guarding anything.
    expect(walk(GYMS_DIR).length).toBeGreaterThan(0);
  });

  test.each(walk(GYMS_DIR).map((f) => [path.relative(ROOT, f), f]))(
    '%s never reads a location API and never writes to local storage',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      for (const pattern of LOCATION_FORBIDDEN) {
        expect({ rel, pattern: String(pattern), matched: pattern.test(source) })
          .toEqual({ rel, pattern: String(pattern), matched: false });
      }
    },
  );
});

describe('the client and the SQL agree', () => {
  // The migration is written in a separate lane. These checks arm
  // themselves the moment the file lands, so the two copies of each list
  // can never drift once both exist. `describe` cannot be conditional
  // without hiding the reason, so the condition is stated in each test.
  const sql = fs.existsSync(MIGRATION) ? fs.readFileSync(MIGRATION, 'utf8') : null;

  test('the SQL forbidden-key list is the client refusal list', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    for (const key of SENSITIVE_COMMUNITY_KEYS) {
      expect(sql).toContain(`'${key}'`);
    }
  });

  test('the SQL blocked-terms array carries every client term', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    // The safety-critical direction. A term the client refuses but the
    // server accepts is a bypass: the client is a convenience, the
    // server is the rule. `keywordFilter.js` is the authority (blueprint
    // section 3: "the list is the same array as BLOCKED_TERMS"), so a
    // failure here is fixed by adding the named terms to
    // `_community_blocked_terms()`, never by shortening the client list.
    const missingFromSql = BLOCKED_TERMS.filter((term) => !sql.includes(`'${term}'`));
    expect({ missingFromSql }).toEqual({ missingFromSql: [] });
  });

  test('the SQL payload allow-lists are the client allow-lists', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    for (const keys of Object.values(POST_PAYLOAD_KEYS)) {
      for (const key of keys) expect(sql).toContain(`'${key}'`);
    }
  });
});

/**
 * The training profile's closed sets exist twice: once in
 * `trainingProfile.js` and `connections.js`, once in migrate_161, which
 * validates every value it is sent against them. Two copies of a closed
 * set drift, and the failure is quiet in the worst way: a band the client
 * offers and the server rejects makes a toggle that silently does
 * nothing. migrate_161 says in its own comments that a Jest guard compares
 * the two; this is that guard.
 */
describe('the closed sets are the same on both sides', () => {
  const MIGRATION_161 = path.join(ROOT, 'supabase/migrate_161_community_connections.sql');
  const sql161 = fs.existsSync(MIGRATION_161) ? fs.readFileSync(MIGRATION_161, 'utf8') : null;
  // Phase 3 (`22-MIGRATION-170A-CONTRACT.md` Part B): `_community_
  // connect_reasons_list` was RE-ISSUED inside migrate_170 ("same_
  // programme" retired, "same_discipline" added), not migrate_161 -- so
  // that ONE helper's equality check below reads THIS file instead; every
  // other closed set above is untouched by 170 and stays pinned against
  // 161, exactly as before.
  const MIGRATION_170 = path.join(ROOT, 'supabase/migrate_170_community_connection.sql');
  const sql170 = fs.existsSync(MIGRATION_170) ? fs.readFileSync(MIGRATION_170, 'utf8') : null;

  const {
    TP_DAYS, TP_TIME_BANDS, TP_SESSIONS_BANDS, TP_SESSIONS_BAND_ORDER,
    TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  } = require('../lib/community/trainingProfile');
  const { CONNECT_REASONS, CONNECT_FROM_VALUES } = require('../lib/community/connections');

  /** The array literal one `_community_*_list()` helper returns. */
  function sqlList(helper, sqlText = sql161) {
    const re = new RegExp(`FUNCTION public\\.${helper}\\(\\)[\\s\\S]*?ARRAY\\[([^\\]]*)\\]`, 'i');
    const m = re.exec(sqlText);
    if (!m) return null;
    return m[1].split(',').map((s2) => s2.trim().replace(/^'|'$/g, '')).filter(Boolean);
  }

  test.each([
    ['_community_tp_days_list', () => Object.keys(TP_DAYS)],
    ['_community_tp_time_bands_list', () => Object.keys(TP_TIME_BANDS)],
    // Not Object.keys: '3' is an integer-like key and JavaScript would
    // hoist it to the front. TP_SESSIONS_BAND_ORDER is the order.
    ['_community_tp_sessions_list', () => [...TP_SESSIONS_BAND_ORDER]],
    ['_community_tp_experience_list', () => Object.keys(TP_EXPERIENCE_BANDS)],
    ['_community_tp_age_bands_list', () => Object.keys(TP_AGE_BANDS)],
  ])('%s carries the client set, in the same order', (helper, clientKeys) => {
    if (!sql161) { expect(fs.existsSync(MIGRATION_161)).toBe(false); return; }
    expect({ helper, values: sqlList(helper) })
      .toEqual({ helper, values: clientKeys() });
  });

  // Phase 3: this one closed set moved to migrate_170 Part B (see the
  // header comment above `sql170`) -- read against that file, not 161.
  // Per the contract's own note, this case FAILS if read against 161
  // (which still carries the retired `same_programme`), by design.
  test('_community_connect_reasons_list carries the client set, in the same order', () => {
    if (!sql170) { expect(fs.existsSync(MIGRATION_170)).toBe(false); return; }
    expect({ helper: '_community_connect_reasons_list', values: sqlList('_community_connect_reasons_list', sql170) })
      .toEqual({ helper: '_community_connect_reasons_list', values: Object.keys(CONNECT_REASONS) });
  });

  test('the connect_from CHECK carries the client values', () => {
    if (!sql161) { expect(fs.existsSync(MIGRATION_161)).toBe(false); return; }
    for (const value of Object.keys(CONNECT_FROM_VALUES)) {
      expect(sql161).toContain(`'${value}'`);
    }
  });

  test('the band phrases the reasons line uses read the same on both sides', () => {
    if (!sql161) { expect(fs.existsSync(MIGRATION_161)).toBe(false); return; }
    // "Both usually train evenings", "Both train 4 to 5 times a week": the
    // server composes these, and a phrase that differs from the client's
    // preview line would show one person a band worded two ways.
    for (const label of Object.values(TP_TIME_BANDS)) expect(sql161).toContain(`'${label}'`);
    for (const label of Object.values(TP_SESSIONS_BANDS)) expect(sql161).toContain(`'${label}'`);
  });
});

/**
 * migrate_172 (blueprint section 4, CR-05; lead ruling 5). The nine
 * migrate_165/170 consistency counters (`trainingConsistency.js`,
 * `shareablePayload` in `trainingProfile.js`) travel under one closed
 * allow-list: whatever `shareablePayload` emits with a `c_` prefix when
 * `share_consistency` is on. `c_prs_4w` joins that set here -- pinned
 * alongside the rest, not on its own, so the allow-list stays a single
 * source of truth for "every counter key this payload builder may ever
 * emit" rather than one more one-off assertion. The second half of the
 * pin is the thing a PR count could tempt a future edit to add "just
 * alongside" it: SD rulings ("a PR is a moment, never a table") and the
 * migrate_172 SQL header both say a count is ALL that travels, so the
 * payload builder is asserted to never carry the exercise, weight or reps
 * a PR is made of.
 */
describe('consistency counters travel under one allow-list, PR count included (migrate_172)', () => {
  const { shareablePayload, TP_DEFAULT_SHARE } = require('../lib/community/trainingProfile');

  // The closed set of `c_`-prefixed keys `shareablePayload` may ever emit
  // when share_consistency is true (trainingProfile.js, mirrored
  // server-side by `community_update_training_profile` in migrate_165 and
  // re-issued in migrate_172 with c_prs_4w added).
  const COUNTER_ALLOW_LIST = [
    'c_sessions_week', 'c_sessions_month', 'c_weeks_streak', 'c_planned_pct_4w',
    'c_consistent_weeks_12w', 'c_trained_days_week', 'c_last_trained_day',
    'c_weeks_history', 'c_updated_at', 'c_planned_per_week', 'c_prs_4w',
  ];

  function fakeCounters() {
    return {
      c_sessions_week: 3,
      c_sessions_month: 10,
      c_weeks_streak: 2,
      c_planned_pct_4w: 75,
      c_consistent_weeks_12w: 6,
      c_trained_days_week: ['mon', 'wed'],
      c_last_trained_day: '2026-09-08',
      c_weeks_history: [1, 2, 1, 2, 3, 1, 2, 3],
      c_updated_at: 1700000000000,
      c_planned_per_week: 4,
      c_prs_4w: 3,
    };
  }

  test('every c_-prefixed key shareablePayload can emit is on the allow-list, c_prs_4w included', () => {
    const payload = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: true }, {
      consistencyCounters: fakeCounters(), consistencyGated: false,
    });
    const counterKeys = Object.keys(payload).filter((k) => k.startsWith('c_'));
    expect(counterKeys.sort()).toEqual([...COUNTER_ALLOW_LIST].sort());
  });

  test('the payload builder never emits a PR detail alongside the count: no exercise, weight or reps', () => {
    const payload = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: true }, {
      consistencyCounters: fakeCounters(), consistencyGated: false,
    });
    expect(payload.c_prs_4w).toBe(3);
    for (const forbidden of ['pr_exercise', 'exerciseName', 'weight', 'reps']) {
      expect(Object.prototype.hasOwnProperty.call(payload, forbidden)).toBe(false);
    }
    // Belt and braces: not even buried in a nested value or a differently-cased key.
    expect(JSON.stringify(payload)).not.toMatch(/\bpr_exercise\b|\bexerciseName\b|\bweight\b|\breps\b/i);
  });

  test('c_prs_4w never travels when consistency sharing is off, the same as every other counter', () => {
    const payload = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: false }, {
      consistencyCounters: fakeCounters(), consistencyGated: false,
    });
    expect(payload).not.toHaveProperty('c_prs_4w');
    expect(payload.share_consistency).toBe(false);
  });
});
