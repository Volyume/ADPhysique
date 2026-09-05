/**
 * CC33 CLOSE-OUT — THE CAPABILITY CENSUS (D132, founder order 2026-08-30:
 * "find a way to satisfactorily close this task off without crazy round
 * after round").
 *
 * WHY THIS FILE EXISTS. Nineteen adversarial review rounds closed 90-odd
 * findings, and the exit condition was "a fresh reviewer fails to break
 * any of 93 scorecard rows". That bar is unbounded by construction: a
 * reviewer finds ONE INSTANCE of a defect class per round, the instance
 * gets fixed, and the next round finds the next instance of the SAME
 * class somewhere else in the tree. The root trajectory
 * (12,7,5,4,9,6,6,4,1,3,4,5,4,3,2,3,1,2,4) never reached zero because
 * instance-by-instance closure cannot exhaust a class.
 *
 * So the exit condition is replaced with a FINITE, MECHANICAL one: every
 * site in the tree that participates in one of the recurring classes is
 * ENUMERATED here and must satisfy that class's invariant, or appear on
 * an explicit exemption list with a stated reason. A new site fails by
 * default - so the census extends itself, and a future contributor
 * cannot add an unclassified consumer without making the decision
 * consciously.
 *
 * THE FOUR CLASSES, each named from the rounds that kept finding it:
 *
 *  1. FAIL-OPEN ON AN UNREADABLE READ (R17-1, R18-1, R19-1, R19-2, and
 *     the census's own three). A capability read that FAILED must never
 *     be treated as "this user has no restrictions". The resolver cannot
 *     throw - it returns a state - so every actor must ask
 *     capabilityKnown(), never a bare try/catch or `!unavailable`.
 *  2. A RULE THAT DRIVES NOTHING DRIVING SOMETHING (R18-2, R19-3). Held,
 *     declined and undecided rules record a FACT but drive no
 *     automation; only removalExcusalConflicts() answers "is an overlay
 *     operating".
 *  3. TWO READERS, ONE STATE, TWO ANSWERS (R16-1, R16-2, R19-2, I9). Any
 *     surface that says "what will happen" consumes a shared helper, not
 *     its own inline chain.
 *  4. EXCUSING SOMETHING THE USER DID (R12-2, R13-2, R19-4). An effects
 *     writer never records an omission for a row the user performed or
 *     chose themselves.
 *
 * This file is a source census on purpose: it must see EVERY site,
 * including ones no fixture reaches. The behavioural halves of each
 * class are driven elsewhere (capabilityAdherence, capabilityHoldAndCarry,
 * the sideCarveNote guard's real-loader pins); this proves the fix
 * reaches every site, which is precisely what nineteen rounds could not
 * establish by sampling.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);
const rel = (f) => path.relative(SRC, f).split(path.sep).join('/');

// The walk really walked (a broken path must fail loudly, not pass
// vacuously - round 9's lesson, applied to every sweep since).
test('the census walks the real tree', () => {
  expect(FILES.length).toBeGreaterThan(150);
});

// ───────────────────────────────────────────────────────────────────────
// CLASS 1 — every capability read that ACTS asks capabilityKnown()
// ───────────────────────────────────────────────────────────────────────
/**
 * Exemptions, each with the reason it is not an actor. A site here is a
 * RULING, not an oversight: it renders or defers rather than deciding,
 * so silence on an unreadable read is the correct posture (D129 ruling 1
 * / D130 ruling 1's notices-vs-actions split).
 */
const CLASS1_EXEMPT = {
  'lib/capability/preflight.js':
    'IS the predicate - capabilityPreflight answers the same question for the screens that gate on it.',
  'lib/exercise/intent.js':
    'Pure loader: hands the state to callers untouched and answers null on failure; every consumer gates.',
  'lib/sessionEffective.js':
    'RULED (D109-2 + R5-9): the `checked` tri-state is this layer\'s answer - an unavailable read returns checked:false, which renders "could not check" copy. It claims nothing, so it needs no knowledge gate; it deliberately under-reads a stale-known state rather than risk a false claim.',
  'screens/HomeScreen.js':
    'Renders the "works around" line only. An unreadable read yields no restrictions and therefore no line (silence), and the could-not-check line beside it speaks for the failure (B4).',
  // 'screens/FreeStarterScreen.js' exemption REMOVED (D137, fully free
  // product): the file is deleted outright, so its CAP-17 hand-rolled
  // last-known-state filtering no longer exists anywhere to exempt.
  'screens/PlanLibraryScreen.js':
    'Renders compatibility badges. An unreadable read shows NO badge rather than a wrong one - absence of information, never a false claim.',
  'screens/RoutineDetailScreen.js':
    'Captions only; the notice ranking is the shared helper\'s and answers null on an empty state.',
  'screens/PlanDetailScreen.js':
    'D139: runs the same computePlanCompatibility PlanLibraryScreen runs for the grid, just for this one plan\'s own exercises, to render badges. Explicitly checks `!capState.unavailable` before computing and sets compatibility to null (no badge) otherwise - an unreadable read yields NO badge, never a wrong one, same posture as PlanLibraryScreen.',
};

test('CLASS 1: every capability read that ACTS gates on capabilityKnown', () => {
  const offenders = [];
  for (const f of FILES) {
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes('loadCapabilityResolveState(')) continue;
    const r = rel(f);
    if (r === 'lib/capability/resolve.js') continue; // defines it
    if (CLASS1_EXEMPT[r]) continue;
    if (!src.includes('capabilityKnown')) offenders.push(r);
  }
  // A new actor lands here until it either gates or is ruled exempt
  // above WITH a reason. That is the whole point: the decision cannot
  // be skipped silently.
  expect(offenders).toEqual([]);
});

test('CLASS 1: the exemption list names only real sites, each with a reason', () => {
  for (const [r, reason] of Object.entries(CLASS1_EXEMPT)) {
    expect({ site: r, exists: fs.existsSync(path.join(SRC, r)) })
      .toEqual({ site: r, exists: true });
    expect({ site: r, reasoned: reason.length > 40 })
      .toEqual({ site: r, reasoned: true });
    // An exemption is void unless the site is genuinely not deciding on
    // an unreadable state. Two ways to satisfy that, and a site must
    // show one of them in its own source:
    //   - it never consults `unavailable` at all (it renders whatever
    //     the state holds, and an unreadable state holds nothing), or
    //   - it fails CLOSED on `unavailable` - a STRICTER test than
    //     capabilityKnown, since it also declines a stale-known state.
    //     sessionEffective is the case in point: it writes effects, so
    //     it is an actor, but it refuses to act at all on an unavailable
    //     read (`checked: false`), which is the class's intent honoured
    //     more conservatively than the predicate requires.
    const src = fs.readFileSync(path.join(SRC, r), 'utf8');
    const failsClosed = /(capState|state|st)\??\.(unavailable)/.test(src);
    const writes = src.includes('appendSessionConstraintEffects(');
    expect({ site: r, actorWithoutAGuard: writes && !failsClosed })
      .toEqual({ site: r, actorWithoutAGuard: false });
  }
});

test('CLASS 1: capabilityKnown is the ONE predicate - no site rolls its own', () => {
  // Three hand-rolled equivalents existed when the predicate was
  // extracted (round 19's contradiction b). The picker's inline form is
  // the last one standing and is allowed only because it is the
  // predicate's exact negation, written before the extraction.
  const ALLOWED_INLINE = [
    'components/ExercisePickerModal.js', // the predicate's exact negation, written before the extraction
    'lib/capability/preflight.js', // IS the predicate, in its own vocabulary
    // Home and the session screen RENDER this signature rather than
    // gating on it: "could not check Injuries & limitations" is the honest
    // failure surface for exactly the unknown-empty state (B4, D121
    // ruling 3). Naming the state to SPEAK about it is the opposite of
    // rolling a private gate.
    'screens/HomeScreen.js',
    'screens/ActiveWorkoutScreen.js',
  ];
  const offenders = [];
  for (const f of FILES) {
    const src = fs.readFileSync(f, 'utf8');
    const r = rel(f);
    if (r === 'lib/capability/resolve.js' || ALLOWED_INLINE.includes(r)) continue;
    // The shape the predicate replaced: testing `unavailable` against
    // `stale` by hand.
    if (/unavailable\s*&&\s*![^)]*stale/.test(src)) offenders.push(r);
  }
  expect(offenders).toEqual([]);
});

// ───────────────────────────────────────────────────────────────────────
// CLASS 2 — only removalExcusalConflicts answers "is an overlay live"
// ───────────────────────────────────────────────────────────────────────
test('CLASS 2: no site decides automation from the RAW episode list', () => {
  // The exact shape that shipped the R18-2 and R19-3 defects: filtering
  // definite episode conflicts and acting on the result, without asking
  // whether the rules are held, declined or undecided.
  const offenders = [];
  for (const f of FILES) {
    const src = fs.readFileSync(f, 'utf8');
    const r = rel(f);
    if (r === 'lib/capability/effective.js') continue; // defines both
    if (!src.includes('episodeConflicts(')) continue;
    // Every consumer must reach the shared gate (directly, or via
    // actionableEpisodeConflicts, which is serve's own filter).
    const gated = src.includes('removalExcusalConflicts')
      || src.includes('actionableEpisodeConflicts');
    // A pure RENDER read of the raw list is legitimate - the notice
    // layer names what BEARS on a row - as long as the ranking itself
    // comes from the shared helper.
    const rendersViaHelper = src.includes('constraintNoticeKind');
    if (!gated && !rendersViaHelper) offenders.push(r);
  }
  expect(offenders).toEqual([]);
});

test('CLASS 2: the two rebuild verdict builders emit the same three facts', () => {
  const gen = fs.readFileSync(path.join(SRC, 'lib/planAutoGen.js'), 'utf8');
  const adv = fs.readFileSync(path.join(SRC, 'lib/blockAdvisor.js'), 'utf8');
  for (const [name, src] of [['planAutoGen', gen], ['blockAdvisor', adv]]) {
    expect({ name, live: src.includes('capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;') })
      .toEqual({ name, live: true });
    expect({ name, open: src.includes('capabilityEpisodeOpen = !capabilityAffected && episodeDefinite.length > 0;') })
      .toEqual({ name, open: true });
    expect({ name, baseline: src.includes('baselineConflicts(intentState') })
      .toEqual({ name, baseline: true });
  }
});

// ───────────────────────────────────────────────────────────────────────
// CLASS 3 — one answer per question, consumed everywhere
// ───────────────────────────────────────────────────────────────────────
const SHARED_ANSWERS = [
  // [helper, the question it answers, every file that must consume it]
  ['constraintNoticeKind', 'which constraint line does this row show',
    ['screens/ActiveWorkoutScreen.js', 'screens/RoutineDetailScreen.js']],
  ['removalExcusalConflicts', 'is an overlay operating on this row',
    ['screens/ActiveWorkoutScreen.js', 'lib/capability/effective.js', 'lib/planAutoGen.js', 'lib/blockAdvisor.js']],
  ['sidedUnionShape', 'does a sided rule cover this movement outright',
    ['components/ExercisePickerModal.js', 'screens/ActiveWorkoutScreen.js']],
  ['capabilityKnown', 'may an action consult this capability state',
    ['screens/ActiveWorkoutScreen.js', 'screens/CoachOutputScreen.js', 'lib/coachApplySafety.js', 'lib/planAutoGen.js', 'lib/blockAdvisor.js', 'lib/database.js']],
];

test('CLASS 3: every shared answer is consumed by every surface that asks it', () => {
  for (const [helper, question, consumers] of SHARED_ANSWERS) {
    for (const c of consumers) {
      const src = fs.readFileSync(path.join(SRC, c), 'utf8');
      expect({ helper, question, consumer: c, consumes: src.includes(helper) })
        .toEqual({ helper, question, consumer: c, consumes: true });
    }
  }
});

// ───────────────────────────────────────────────────────────────────────
// CLASS 4 — an effects writer never excuses what the user did or chose
// ───────────────────────────────────────────────────────────────────────
test('CLASS 4: every effects WRITE site carries the performed and user-chosen refusals', () => {
  const writers = FILES
    .filter((f) => fs.readFileSync(f, 'utf8').includes('appendSessionConstraintEffects('))
    .map(rel)
    .filter((r) => r !== 'lib/database.js'); // defines it
  // The census must find the writers it knows about; a NEW one fails
  // the shape assertions below rather than passing unnoticed.
  expect(writers.sort()).toEqual(['lib/sessionEffective.js', 'screens/ActiveWorkoutScreen.js']);

  const aws = fs.readFileSync(path.join(SRC, 'screens/ActiveWorkoutScreen.js'), 'utf8');
  // The mid-session removal writer (R12-2 user-chosen, R19-4 performed).
  expect(aws).toContain('&& !(removedEntry?.sets?.length)');
  expect(aws).toContain('!removedEntry?._userAdded');
  // The completion writer's projection carries both facts (R13-2).
  expect(aws).toContain('userChosen: !!e?._userAdded,');
  expect(aws).toContain('performed: (e.sets?.length ?? 0) > 0,');
  // And reconciliation reads the DB, where a removed row's sets live.
  expect(aws).toContain('const dbSetRows = await getWorkoutSetsForWorkout(activeWorkout.id);');

  const eff = fs.readFileSync(path.join(SRC, 'lib/capability/effective.js'), 'utf8');
  // The shared writer refuses both, on its first two lines.
  expect(eff).toContain('if (row?.performed) return;');
  expect(eff).toContain('if (row?.userChosen) return;');
});

// ───────────────────────────────────────────────────────────────────────
// The ED-safety wall: nothing in this lane may reach it (Section 2).
// Cheap to assert, and it is the one thing no round may ever weaken.
// ───────────────────────────────────────────────────────────────────────
test('the capability lane never touches the ED-safety system or tier', () => {
  const LANE = FILES.filter((f) => rel(f).startsWith('lib/capability/'));
  expect(LANE.length).toBeGreaterThan(5);
  for (const f of LANE) {
    const src = fs.readFileSync(f, 'utf8');
    for (const banned of ['edPatternDetector', 'nutritionEngine', 'wellbeing', 'proGate', 'isPro(']) {
      expect({ file: rel(f), banned, present: src.includes(banned) })
        .toEqual({ file: rel(f), banned, present: false });
    }
  }
});
