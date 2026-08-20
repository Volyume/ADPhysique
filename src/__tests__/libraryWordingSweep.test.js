/**
 * CC27 - the section 33.17 library text sweep, made permanent.
 *
 * The 551 exercise names and the 31 library-plan names/descriptions are
 * swept against the R2 wording lists (docs/capability-campaign-25-
 * 2026-08-20/research/R2-medical-device-boundary.md sections 5.2/5.3)
 * BEFORE capability-computed browse raises their prominence. The corpus
 * was clean at CC27; this suite keeps it that way - any future exercise
 * or plan description carrying a blacklisted medical-purpose term fails
 * here, mechanically, before it ships.
 *
 * The list below is the R2 BLACKLIST verbatim (words whose presence MHRA
 * treats as indicators of medical intended purpose), plus the named
 * condition terms. GREYLIST terms (recovery, pain-as-logging) are NOT
 * banned here - R2 permits their training-science senses - except the
 * outcome phrases ("reduce pain") which are.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

// Word-boundary regexes; case-insensitive. 'health' is deliberately NOT
// here (not on any R2 list; 'heal/healing/heals' are).
const BLACKLIST = [
  /\brehabilitat\w*\b/i, /\brehab\b/i, /\bprehab\b/i,
  /\binjury management\b/i, /\bflare(-| )?ups?\b/i, /\bflare\b/i,
  /\bphysio(therap\w*)?\b/i,
  /\btreat(s|ment|ing)?\b/i, /\btherap(y|eutic|ies)\b/i,
  /\bdiagnos\w+\b/i, /\bscreening\b/i, /\btriage\b/i, /\bsymptom\w*\b/i,
  /\bheal(s|ing|ed)?\b/i, /\bcures?\b/i, /\bcounteracts?\b/i,
  /\breduce[sd]? pain\b/i, /\bpain[- ]free\b/i,
  /\bsafe for\b/i, /\bprotects? against\b/i, /\bprevents? injur\w*\b/i,
  /\bclinically proven\b/i, /\bclinical trials?\b/i, /\bmedical\w*\b/i,
  // Named conditions (the specific-injury link, R2 section 5.3 last row).
  /\bspinal cord\b/i, /\bmultiple sclerosis\b/i, /\barthritis\b/i,
  /\bfrozen shoulder\b/i, /\bsciatica\b/i, /\bhypermobil\w*\b/i,
  /\bscoliosis\b/i, /\btendinitis\b/i, /\btendinopathy\b/i, /\bimpingement\b/i,
];

function stringsFrom(src, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(src)) !== null) out.push(m[1]);
  return out;
}

test('the 551 exercise names carry no R2-blacklisted term', () => {
  const seedSrc = read('lib/seedExercises.js');
  const start = seedSrc.indexOf('const RAW = [');
  const body = seedSrc.slice(start, seedSrc.indexOf('\n];', start));
  const names = stringsFrom(body, /^\s*\['([^']+)'/gm);
  expect(names.length).toBeGreaterThanOrEqual(551);
  const violations = [];
  for (const name of names) {
    for (const re of BLACKLIST) {
      if (re.test(name)) violations.push({ name, term: String(re) });
    }
  }
  expect(violations).toEqual([]);
});

test('the 31 library plan names and descriptions carry no R2-blacklisted term', () => {
  const src = read('lib/seedRoutines.js');
  const descriptions = [
    ...stringsFrom(src, /description:\s*'((?:[^'\\]|\\.)*)'/g),
    ...stringsFrom(src, /description:\s*"((?:[^"\\]|\\.)*)"/g),
    ...stringsFrom(src, /description:\s*`((?:[^`\\]|\\.)*)`/g),
  ];
  const names = [
    ...stringsFrom(src, /name:\s*'((?:[^'\\]|\\.)*)'/g),
    ...stringsFrom(src, /name:\s*"((?:[^"\\]|\\.)*)"/g),
  ];
  expect(descriptions.length).toBeGreaterThanOrEqual(31);
  const violations = [];
  for (const text of [...descriptions, ...names]) {
    for (const re of BLACKLIST) {
      if (re.test(text)) violations.push({ text: text.slice(0, 60), term: String(re) });
    }
  }
  expect(violations).toEqual([]);
});

test('capability-lane user-facing copy carries no blacklisted term either', () => {
  // The surfaces CC26/CC27 added: the settings screen, the picker flows and
  // the pre-flight dialog. Same lists, same mechanics.
  for (const f of ['screens/HowYouTrainScreen.js', 'components/ExercisePickerModal.js', 'lib/capability/preflight.js']) {
    // Comments are not user-facing (they may NAME the banned words to state
    // the law); scan string literals in comment-stripped code only.
    const src = read(f)
      .replace(/\/\*[^]*?\*\//g, '')
      .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const strings = [
      ...stringsFrom(src, /'((?:[^'\\]|\\.)*)'/g),
      ...stringsFrom(src, /"((?:[^"\\]|\\.)*)"/g),
      ...stringsFrom(src, /`((?:[^`\\]|\\.)*)`/g),
    ];
    const violations = [];
    for (const text of strings) {
      for (const re of BLACKLIST) {
        if (re.test(text)) violations.push({ file: f, text: text.slice(0, 60), term: String(re) });
      }
    }
    expect(violations).toEqual([]);
  }
});
