/**
 * The words on the video surfaces (D229 addendum 5 and the founder's rule of
 * 2026-10-15: "it needs to be very understandable for even the least technical
 * people ... very intuitive for the end user"; CLAUDE.md voice rules).
 *
 * Calm, plain, British, no shame. Pinned across every NEW file and the ruled
 * strings themselves:
 *   - no em dash, anywhere, in copy or in comments;
 *   - never "posing" (it names the body) and never "physique";
 *   - no exclamation mark in any shown string;
 *   - no "replace" (nothing is replaced silently);
 *   - every user-facing string says VIDEO, never "clip" ("clip" stays in code
 *     names, file names, keys and test ids only);
 *   - no jargon: nothing says "render", "export", "encode" or "AI", and no
 *     abbreviation a non-technical person would not know (seconds may be "s"
 *     only where the word sits beside it: "Countdown" above "3 s");
 *   - the plain-words pins: "Record a video of this set", the primer body, and
 *     the two forms of the summary row;
 *   - no string may imply a video belongs to a PR, with ONE named exception:
 *     the PR-moment keys below (D229 addendum 9, lead ruling 2026-10-15). They
 *     are the words the founder ruled for sharing one PR set with its video,
 *     and their "PR" is the set's own record, never a claim about the video.
 *     They are exempt from the PR ban only: every other check here still
 *     scans them, and so do the lines the helpers build from them.
 * The existing screens the rows were added to are checked on the lines this
 * work added, by their D229 markers, so older copy there is not in scope.
 */
const fs = require('fs');
const path = require('path');
const {
  CLIP_STRINGS, clipRowTitle, clipDisplayName, clipCountLabel,
  summaryClipRowCopy, startA11yLabel, leadInLabel, leadInA11yLabel, lengthLabel,
  lengthA11yLabel, formatClipDuration,
} = require('../rules');

const SRC = path.resolve(__dirname, '..', '..', '..');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const NEW_FILES = [
  ...walk(path.join(SRC, 'lib', 'clips')),
  ...walk(path.join(SRC, 'components', 'clips')),
  path.join(SRC, 'screens', 'ClipCameraScreen.js'),
];

// The lines a D229 marker opens: from the marker to the next blank line (or 25
// lines), so an older line further down the file is never read as ours.
function d229Block(lines, i) {
  const out = [];
  for (let j = i; j < Math.min(lines.length, i + 25); j += 1) {
    if (j > i && lines[j].trim() === '') break;
    out.push(lines[j]);
  }
  return out.join('\n');
}

const BANNED = [
  [/—/, 'an em dash'],
  [/posing/i, '"posing"'],
  [/physique/i, '"physique"'],
];

// Every word a person is shown, from every function that makes one.
const ONE_VIDEO = { exerciseName: 'Bench press', setNumber: 3, source: 'workout', durationMs: 12000, createdAt: 5 };
const OTHER_VIDEO = { exerciseName: null, source: 'summary', durationMs: 9000, createdAt: 9 };
const BENCH_PR = { exerciseName: 'Bench press', setNumber: 3, type: 'heaviest_weight' };
const UNNAMED_PR_VIDEO = { exerciseId: 'e1', exerciseName: null, setNumber: 2, source: 'workout', createdAt: 7 };
const UNNAMED_PR = { exerciseId: 'e1', exerciseName: null, setNumber: 2, type: '1rm_estimate' };

// D229 addendum 9 (lead ruling 2026-10-15): the words the founder ruled for the
// PR moment ("This set would be a new PR", "This set would be a new PR.", "Share this PR
// with its video", "Use your PR video on the share", "..., a new PR"). Their "PR"
// is the set's own record, never a claim about the video, so these keys, and
// only these, are exempt from the PR ban. Every other check scans them.
const PR_MOMENT_KEYS = Object.freeze([
  'prOfferText',
  'prShareA11y',
  'summaryLabelPR',
  'summarySubPRTail',
  'summarySubPRUnnamed',
]);
const PR_MOMENT_WORDS = PR_MOMENT_KEYS.map((k) => CLIP_STRINGS[k]);

// The lines the helpers build in their PR forms. Each is built from a
// PR-moment word, and with that word taken out nothing in it says PR.
const PR_MOMENT_LINES = [
  ...[
    [[ONE_VIDEO], [BENCH_PR]],
    [[ONE_VIDEO, OTHER_VIDEO], [BENCH_PR]],
    [[UNNAMED_PR_VIDEO], [UNNAMED_PR]],
  ].flatMap(([list, prs]) => {
    const copy = summaryClipRowCopy(list, prs);
    return [copy.label, copy.sub];
  }),
];

const SHOWN = [
  ...Object.values(CLIP_STRINGS),
  clipRowTitle(ONE_VIDEO), clipRowTitle(OTHER_VIDEO), clipDisplayName(ONE_VIDEO), clipDisplayName(OTHER_VIDEO),
  clipCountLabel(1), clipCountLabel(2),
  startA11yLabel(3), startA11yLabel(10), leadInLabel(5), leadInA11yLabel(5), lengthLabel(10), lengthA11yLabel(10),
  formatClipDuration(12000),
  ...[[], [ONE_VIDEO], [ONE_VIDEO, OTHER_VIDEO], [OTHER_VIDEO]].flatMap((list) => {
    const copy = summaryClipRowCopy(list);
    return [copy.label, copy.sub];
  }),
  ...PR_MOMENT_LINES,
];

// The PR ban reads every shown string except the PR-moment words and the
// lines built from them.
const NOT_PR_MOMENT = SHOWN.filter((l) => !PR_MOMENT_WORDS.includes(l) && !PR_MOMENT_LINES.includes(l));

describe('the new files', () => {
  test('there are files to scan', () => {
    expect(NEW_FILES.length).toBeGreaterThan(10);
  });

  test.each(NEW_FILES.map((p) => [path.relative(SRC, p), p]))('%s has no em dash, "posing" or "physique"', (_name, p) => {
    const text = fs.readFileSync(p, 'utf8');
    for (const [re, label] of BANNED) {
      expect(`${label}: ${re.test(text)}`).toBe(`${label}: false`);
    }
  });
});

describe('every shown string', () => {
  test('there are strings to scan', () => {
    expect(SHOWN.length).toBeGreaterThan(40);
  });

  test.each(SHOWN.map((l) => [l]))('%s', (line) => {
    for (const [re, label] of BANNED) {
      expect(`${label}: ${re.test(line)}`).toBe(`${label}: false`);
    }
    expect(line).not.toMatch(/!/);
    expect(line).not.toMatch(/replace/i);
  });
});

describe('video, never clip, in anything a person sees or hears', () => {
  test.each(SHOWN.map((l) => [l]))('%s', (line) => {
    expect(line).not.toMatch(/clip/i);
  });

  // Literals in the new component and screen files that a person could see or
  // hear: anything with a space in it that is not a SQL statement or a code
  // identifier. Template expressions (${...}) are code, so they are removed
  // first. The store holds SQL and is not user-facing.
  const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  function userFacingLiterals(text) {
    const out = [];
    for (const line of text.split('\n')) {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue;
      let m;
      LITERAL.lastIndex = 0;
      while ((m = LITERAL.exec(line)) !== null) {
        const body = m[2].replace(/\$\{[^}]*\}/g, '');
        if (/\s/.test(body)) out.push(body);
      }
    }
    return out;
  }

  const SHOWN_FILES = NEW_FILES.filter((p) => !/\/lib\/clips\/store\.js$/.test(p) && !/\/lib\/clips\/index\.js$/.test(p));

  test.each(SHOWN_FILES.map((p) => [path.relative(SRC, p), p]))('%s: no literal with a space in it says clip', (_name, p) => {
    const offenders = userFacingLiterals(fs.readFileSync(p, 'utf8')).filter((l) => /clip/i.test(l));
    expect(offenders).toEqual([]);
  });

  test('the scan sees real strings (a broken scan must not pass as clean)', () => {
    const camera = userFacingLiterals(fs.readFileSync(path.join(SRC, 'screens', 'ClipCameraScreen.js'), 'utf8'));
    expect(camera.length).toBeGreaterThan(0);
    const rules = userFacingLiterals(fs.readFileSync(path.join(SRC, 'lib', 'clips', 'rules.js'), 'utf8'));
    expect(rules).toContain('Record a video');
  });

  test('the lines added to the existing screens say video too', () => {
    const touched = [
      'screens/ActiveWorkoutScreen.js',
      'screens/WorkoutSummaryScreen.js',
      'screens/WorkoutHistoryScreen.js',
      'components/workout/session/SessionSheets.js',
    ];
    const offenders = [];
    for (const file of touched) {
      const lines = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/D229/.test(line)) return;
        const window = d229Block(lines, i);
        for (const lit of userFacingLiterals(window)) if (/clip/i.test(lit)) offenders.push(`${file}:${i + 1} ${lit}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('no jargon, no abbreviation a non-technical person would not know', () => {
  test.each(SHOWN.map((l) => [l]))('%s', (line) => {
    expect(line).not.toMatch(/\b(render\w*|export\w*|encod\w*|transcod\w*|codec|compos\w*|pipeline|bitrate)\b/i);
    expect(line).not.toMatch(/\bAI\b/);
    // Abbreviations: no sec/secs/min/mins/approx/etc, and a bare "s" only
    // straight after a number ("3 s"), with the word beside it on screen.
    expect(line).not.toMatch(/\b(secs?|mins?|approx|etc|e\.g|i\.e)\b/i);
    expect(line.match(/(?<!\d\s|['\u2019])\bs\b/)).toBeNull();
  });
});

describe('a video belongs to the set, not to a record', () => {
  // A video recorded for a set is usable on ANY share (the session card too),
  // so no string may imply it is only for a personal record.
  test.each(NOT_PR_MOMENT.map((l) => [l]))('%s', (line) => {
    expect(line).not.toMatch(/\bPRs?\b|personal (record|best)|new best/i);
  });

  test('the exception is exactly the named PR-moment keys, and each of them exists', () => {
    for (const key of PR_MOMENT_KEYS) expect({ key, type: typeof CLIP_STRINGS[key] }).toEqual({ key, type: 'string' });
    const saysPR = Object.entries(CLIP_STRINGS)
      .filter(([, line]) => /\bPRs?\b|personal (record|best)|new best/i.test(line))
      .map(([key]) => key)
      .sort();
    expect(saysPR).toEqual([...PR_MOMENT_KEYS].sort());
  });

  test('every line a helper builds in its PR form says PR only through a PR-moment word', () => {
    expect(PR_MOMENT_LINES.length).toBeGreaterThanOrEqual(6);
    for (const line of PR_MOMENT_LINES) {
      const word = PR_MOMENT_WORDS.find((w) => line.includes(w));
      expect({ line, built: !!word }).toEqual({ line, built: true });
      const rest = line.split(word).join(' ');
      expect({ line, rest: /\bPRs?\b|personal (record|best)|new best/i.test(rest) }).toEqual({ line, rest: false });
    }
  });

  test('the scan still sees the usual forms (a broken filter must not pass as clean)', () => {
    expect(NOT_PR_MOMENT).toContain(CLIP_STRINGS.rowLabel);
    expect(NOT_PR_MOMENT).toContain('You recorded Bench press, set 3');
    expect(NOT_PR_MOMENT).toContain(CLIP_STRINGS.prOfferAction);
    expect(NOT_PR_MOMENT).toContain(CLIP_STRINGS.prShareAction);
  });
});

describe('the plain-words pins', () => {
  test('the exercise menu row', () => {
    expect(CLIP_STRINGS.rowLabel).toBe('Record a video of this set');
    expect(CLIP_STRINGS.rowA11y).toBe('Record a video of this set');
  });

  test('the primer says it all, once', () => {
    expect(CLIP_STRINGS.primerTitle).toBe('Videos stay on this phone');
    expect(CLIP_STRINGS.primerBody).toBe('Prop your phone up, tap the button, and get into position. Recording starts after the countdown and stops by itself. Each video is up to 15 seconds long, with no sound. Your videos are kept with the workout on this phone and are never uploaded.');
  });

  test('the summary row, in its two forms', () => {
    expect(summaryClipRowCopy([])).toMatchObject({
      label: 'Record a video',
      sub: "Up to 15 seconds, with no sound. You can also film a set during a workout, from an exercise's menu.",
    });
    expect(summaryClipRowCopy([ONE_VIDEO])).toMatchObject({
      label: 'Use your video on the share', sub: 'You recorded Bench press, set 3',
    });
    expect(summaryClipRowCopy([ONE_VIDEO, OTHER_VIDEO])).toMatchObject({
      label: 'Use your video on the share', sub: 'You recorded 2 videos',
    });
  });

  test('no other explanation anywhere: the privacy line is said only in the primer', () => {
    const others = Object.entries(CLIP_STRINGS).filter(([k]) => k !== 'primerBody' && k !== 'primerTitle');
    for (const [key, line] of others) {
      expect({ key, hit: /never uploaded|stay on this phone|unless you share/i.test(line) }).toEqual({ key, hit: false });
    }
  });
});

describe('the lines added to existing screens carry no banned word', () => {
  const touched = [
    'screens/ActiveWorkoutScreen.js',
    'screens/WorkoutSummaryScreen.js',
    'screens/WorkoutHistoryScreen.js',
    'components/workout/session/SessionSheets.js',
    'navigation/RootNavigator.js',
  ];

  test.each(touched.map((f) => [f]))('%s: the D229 lines carry no em dash, "posing" or "physique"', (file) => {
    const text = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n');
    const offenders = [];
    text.forEach((line, i) => {
      if (!/D229/.test(line)) return;
      const window = d229Block(text, i);
      for (const [re, label] of BANNED) if (re.test(window)) offenders.push(`${file}:${i + 1} ${label}`);
    });
    expect(offenders).toEqual([]);
  });
});
