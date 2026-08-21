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
