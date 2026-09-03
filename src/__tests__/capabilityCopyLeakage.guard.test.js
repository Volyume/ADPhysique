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
  // Surfaced by the founder's 2026-08-21 order; rendered under "Worth
  // knowing" and "Using Volyume".
  push(profile.fatigueNote);
  push(profile.lateralityNote);
  for (const t of profile.accessibilityConsiderations ?? []) push(t);
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

// ── Surfaced disability guidance (founder order 2026-08-21) ────────────
// Accounting and per-string classification:
// docs/capability-campaign-25-2026-08-20/DISABILITY-PROFILE-GUIDANCE-COVERAGE.md

describe('the disability guidance that was hidden now has a rendering path', () => {
  const screen = read('screens/TrainingConsiderationsScreen.js');
  const conditions = allConditionProfiles();

  it('the profile page reads each surfaced field', () => {
    expect(screen).toMatch(/open\.fatigueNote/);
    expect(screen).toMatch(/open\.lateralityNote/);
    expect(screen).toMatch(/open\.accessibilityConsiderations/);
  });

  it('every profile that has surfaced guidance actually has it rendered', () => {
    // Non-vacuous by construction: the counts below are the real content,
    // so deleting the content fails the test rather than passing it.
    const fatigue = conditions.filter((p) => p.fatigueNote).length;
    const sided = conditions.filter((p) => p.lateralityNote).length;
    const app = conditions.reduce((n, p) => n + (p.accessibilityConsiderations ?? []).length, 0);
    expect(fatigue).toBe(7);
    expect(sided).toBe(10);
    expect(app).toBe(16);
    for (const p of conditions) {
      for (const text of [p.fatigueNote, p.lateralityNote, ...(p.accessibilityConsiderations ?? [])]) {
        if (text) expect(renderedStrings(p)).toContain(text);
      }
    }
  });

  it('no internal field name reaches a user-facing string', () => {
    const labels = /fatigueNote|lateralityNote|accessibilityConsiderations|clinicianConfirm|neverInfer|claimRisks|knownGaps/;
    for (const p of [...conditions, ...allInjuryProfiles()]) {
      for (const text of renderedStrings(p)) expect(text).not.toMatch(labels);
    }
    // The headings the screen actually uses are plain English.
    expect(screen).toMatch(/title="Worth knowing"/);
    expect(screen).toMatch(/title="Using Volyume"/);
  });

  it('the side-picker claim never returns as directory copy; a side is asked only where it carves', () => {
    // Directory copy promising a per-answer "side picker" would be a false
    // promise, so it is pinned out of every profile string. (The original
    // comment here also claimed the add flow stored no laterality; that
    // became stale on 2026-08-21 when the side stage landed, and the slice
    // it read was too small to notice. Re-anchored 2026-09-03 with the
    // wizard: the truthful invariant is that a side is ASKED only when a
    // chosen axis carves by side, and STORED only where it carves.)
    const claim = /side picker|answer takes a side/i;
    for (const p of conditions) {
      for (const text of renderedStrings(p)) expect(text).not.toMatch(claim);
    }
    const flow = read('lib/capability/addFlow.js');
    expect(flow).toMatch(/if \(sidedAxes\(draft\)\.length\) steps\.push\(ADD_STEP\.SIDE\)/);
    expect(flow).toMatch(/laterality: isSideCarveable\(CONSTRAINT_RULE_KIND\.DEMAND, axis\) \? \(side \?\? null\) : null/);
    // The DRAFT SHAPE only (emptyDraft's body): draftFromRows, which
    // rebuilds a draft from stored rows, legitimately reads row.laterality.
    const draftStart = flow.indexOf('export function emptyDraft');
    const draftShape = flow.slice(draftStart, flow.indexOf('\n}\n', draftStart));
    expect(draftShape.length).toBeGreaterThan(50);
    expect(draftShape).toMatch(/side: null,/);
    expect(draftShape).not.toMatch(/laterality/);
  });

  it('the clinician checklists stay internal, and their product truth is on the page instead', () => {
    // Rendering "things to confirm with your clinician" would read as
    // needing medical clearance to use Volyume (GC-D12). None renders.
    for (const p of conditions) {
      const rendered = renderedStrings(p);
      for (const line of p.clinicianConfirm ?? []) expect(rendered).not.toContain(line);
      // The actionable half IS carried, once, by the professional note.
      expect(p.professionalNote).toMatch(/clinician asked for it/);
    }
    const totalHidden = conditions.reduce((n, p) => n + (p.clinicianConfirm ?? []).length, 0);
    expect(totalHidden).toBe(26);
  });

  it('surfacing guidance gained no persistence or behavioural authority', () => {
    // GC-D1 statelessness: the page still only reads and navigates.
    expect(screen).not.toMatch(/createConstraint|capability\/store|setItem|AsyncStorage|trackEvent/);
    expect(screen).toMatch(/navigation\.navigate\('HowYouTrain'/);
  });
});
