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
 * The R2 BLACKLIST (words whose presence MHRA treats as indicators of
 * medical intended purpose) and named condition terms are shared in
 * src/lib/observability/r2Wording.js to keep the list canonical.
 * GREYLIST terms (recovery, pain-as-logging) are NOT banned here - R2
 * permits their training-science senses - except the outcome phrases
 * ("reduce pain") which are.
 */
import fs from 'fs';
import path from 'path';
import { R2_BLACKLIST } from '../lib/observability/r2Wording';

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

// Alias for backward compatibility with the rest of the suite.
const BLACKLIST = R2_BLACKLIST;

function stringsFrom(src, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(src)) !== null) out.push(m[1]);
  return out;
}

// Re-anchored EL-14 (exercise-library-expansion-2026-09-05): the RAW tuple
// block is retired; the corpus module is the source of truth, and the sweep
// now covers every live name, alias and cue rather than names alone.
test('every corpus exercise name, alias and cue carries no R2-blacklisted term', () => {
  // eslint-disable-next-line global-require
  const { CORPUS } = require('../lib/exerciseCorpus');
  const live = CORPUS.filter((e) => !e.retiredInto);
  expect(live.length).toBeGreaterThanOrEqual(551);
  const violations = [];
  for (const entry of live) {
    const texts = [entry.name, ...(entry.aliases || []), entry.cue || ''];
    for (const text of texts) {
      for (const re of BLACKLIST) {
        if (re.test(text)) violations.push({ name: entry.name, text: text.slice(0, 60), term: String(re) });
      }
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
