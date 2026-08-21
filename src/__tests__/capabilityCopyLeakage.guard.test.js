/**
 * Natural coach-language leakage guard (founder order 2026-08-21).
 *
 * What this suite pins and why: the capability journey's user-facing
 * surfaces must never expose system vocabulary - "episode", "active
 * episode", "restriction ended", "limitation resolved" - or the retired
 * robotic phrasings the order named. The scan covers STRING LITERALS
 * only (single, double and backtick, with template interpolations
 * stripped), and only literals containing a space, so identifiers,
 * enum values like 'episode', and code comments never false-positive.
 * Deliberately NOT guarded (the order's point 7): ordinary "this"/"it",
 * and the directory data files, whose rendered fields are governed by
 * the directory schema validator instead.
 */
const fs = require('fs');
const path = require('path');

const SURFACES = [
  'screens/HowYouTrainScreen.js',
  'screens/WeeklyCheckInScreen.js',
  'screens/TrainingConsiderationsScreen.js',
  'screens/ActiveWorkoutScreen.js',
  'components/ExercisePickerModal.js',
  'components/ExerciseConflictSheet.js',
  'lib/homeCoachBrief.js',
  'lib/planRationale.js',
  'lib/interBlock.js',
  'lib/weeklyCoach.js',
  'lib/capability/reintroduction.js',
  'lib/capability/phrase.js',
];

// System vocabulary that must never appear in user-facing copy.
const BANNED = [
  /\bepisodes?\b/i,
  /restriction ended/i,
  /limitation resolved/i,
  /active episode/i,
  // Retired robotic phrasings from the order's audit.
  /has it ended/i,
  /covered by your (clinician-reported )?restriction/i,
  /update restriction/i,
];

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

// Every string literal in the file, template ${...} interpolations
// stripped so variable names never trip the word scan. Comments go
// first: an apostrophe in a comment ("the user's rules") would
// otherwise open a phantom literal spanning real code.
function copyLiterals(src) {
  const withoutComments = src
    .replace(/\/\*[^]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  const literals = [];
  const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  for (const match of withoutComments.match(re) ?? []) {
    const text = match.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ');
    // Copy has spaces; keys, enum values and ids do not.
    if (text.includes(' ')) literals.push(text);
  }
  return literals;
}

describe.each(SURFACES)('%s exposes no system vocabulary in copy', (file) => {
  const literals = copyLiterals(read(file));

  it.each(BANNED.map((b) => [String(b), b]))('never says %s', (_label, banned) => {
    const offenders = literals.filter((text) => banned.test(text));
    expect(offenders).toEqual([]);
  });
});

// ── The condition and injury directory (disability side, 2026-08-21) ────
// Scanned by RENDERED FIELD rather than by literal, because these files
// also carry internal author notes (neverInfer, claimRisks, knownGaps)
// that never reach a user and legitimately use system words. The fields
// below are exactly what TrainingConsiderationsScreen renders.

const { allConditionProfiles, allInjuryProfiles, OTHER_PROFILE } = require('../lib/capability/directory');

function renderedStrings(profile) {
  const out = [];
  const push = (v) => { if (typeof v === 'string' && v.trim()) out.push(v); };
  push(profile.canonicalName);
  push(profile.variability);
  push(profile.professionalNote);
  push(profile.clinicianBoundary);
  push(profile.routeNote);
  for (const q of [...(profile.functionalQuestions ?? []), ...(profile.movementQuestions ?? [])]) {
    push(q.wording); push(q.whyAsked);
  }
  for (const t of profile.generalisable ?? []) push(t);
  for (const t of profile.setupConsiderations ?? []) push(t);
  for (const e of profile.education ?? []) push(e.text);
  for (const t of profile.familyRelevance ?? []) push(t);
  return out;
}

// Jargon the founder's audit named: developer vocabulary, coined
// metaphors, and Volyume's internal terms for its own mechanisms.
const DIRECTORY_JARGON = [
  /first-class/i,
  /\bblocker\b/i,
  /balance tax/i,
  /\ballowances?\b/i,
  /\b(the|that|a) class\b/i,
  /\bthe right grain\b/i,
  /\bshortfall\b/i,
];

describe('the condition and injury directory speaks plainly where it renders', () => {
  const profiles = [...allConditionProfiles(), ...allInjuryProfiles(), OTHER_PROFILE];

  it.each(DIRECTORY_JARGON.map((j) => [String(j), j]))('no rendered field says %s', (_label, jargon) => {
    const offenders = [];
    for (const p of profiles) {
      for (const text of renderedStrings(p)) {
        if (jargon.test(text)) offenders.push(`${p.id}: ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('scans a real, non-empty set of rendered strings (never passes vacuously)', () => {
    const total = profiles.reduce((n, p) => n + renderedStrings(p).length, 0);
    expect(profiles.length).toBeGreaterThan(20);
    expect(total).toBeGreaterThan(200);
  });
});
