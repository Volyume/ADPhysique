/**
 * plainEnglish.coachCopy.guard.test.js
 *
 * Founder order 2026-09-26 (register D207, docs/rules/plain-english.md), on
 * the Coaching decision screen: "'Getting back to your full week is the thing
 * that makes the rest readable' is not understandable plain British English
 * to normal end users ... We need a sweep and a correction on any language
 * like this."
 *
 * What this pins: the coach shorthand the rule doc names ("the next read",
 * "makes the rest readable", "sized cautiously", "was thin", "tunes
 * against", "sharpens the read", "back on rate", "off rate", "trend
 * responded") never comes back in a string literal of the coaching libraries
 * that write the weekly coach's words. It reads each file's source, keeps
 * only its string literals (comments, regex literals and code are dropped,
 * so a comment quoting the old wording never trips it) and fails on the
 * first literal that carries the shorthand, naming the file and the words.
 *
 * Source-level on purpose, like the house's other copy guards: a rendered-
 * output test only sees the branches its fixtures reach, while this sees
 * every sentence a branch could ever return.
 */
const fs = require('fs');
const path = require('path');

const LIB = path.join(__dirname, '..');

// The coaching libraries swept under D207. Every user-facing line the weekly
// coach, its registers, its story, its receipts and its block explanations
// write lives in one of these.
const FILES = [
  'coachStory.js',
  'coachRegister.js',
  'coachResponse.js',
  'coachOutput/viewCopy.js',
  'weeklyCoach.js',
  'whyThisTemplates.js',
  'coachLedger.js',
  'homeCoachBrief.js',
  'coachDecline.js',
  'coachPrecedence.js',
  'blockExplain.js',
  'capability/reintroduction.js',
  'capability/weekNote.js',
  'capability/summary.js',
];

// The rule doc's shorthand, verbatim from the founder order's brief.
const BANNED = /the next read|next read|makes the rest readable|sized cautiously|was thin|tunes against|sharpen the next read|sharpens the read|back on rate|off rate|trend responded/i;

const KEYWORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'yield', 'await',
]);

/**
 * Every string literal in a JavaScript source, comments stripped: single-
 * and double-quoted strings, and the literal text of template strings (an
 * interpolation reads as one space, and its own nested strings are
 * collected too). Regex literals are skipped so a quote inside a pattern
 * never opens a phantom string.
 */
function stringLiterals(src) {
  const literals = [];
  let i = 0;

  const regexCanStart = (prevSig, prevWord) => {
    if (!prevSig) return true;
    if ('(,=:[!&|?{};+-*%<>~^'.includes(prevSig)) return true;
    return KEYWORDS_BEFORE_REGEX.has(prevWord);
  };

  function readQuoted(quote) {
    let s = '';
    i += 1;
    while (i < src.length && src[i] !== quote && src[i] !== '\n') {
      if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2; continue; }
      s += src[i];
      i += 1;
    }
    i += 1;
    literals.push(s);
  }

  function skipRegex() {
    i += 1;
    let inClass = false;
    while (i < src.length && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) { i += 1; break; }
      i += 1;
    }
    while (i < src.length && /[a-z]/i.test(src[i])) i += 1;
  }

  function readTemplate() {
    let s = '';
    i += 1;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        s += ' ';
        i += 2;
        scanCode(true);
        continue;
      }
      s += src[i];
      i += 1;
    }
    i += 1;
    literals.push(s);
  }

  function scanCode(untilClosingBrace) {
    let depth = 0;
    let prevSig = '';
    let prevWord = '';
    while (i < src.length) {
      const c = src[i];
      const next = src[i + 1];
      if (c === '/' && next === '/') {
        while (i < src.length && src[i] !== '\n') i += 1;
        continue;
      }
      if (c === '/' && next === '*') {
        const end = src.indexOf('*/', i + 2);
        i = end < 0 ? src.length : end + 2;
        continue;
      }
      if (c === "'" || c === '"') { readQuoted(c); prevSig = 'a'; prevWord = ''; continue; }
      if (c === '`') { readTemplate(); prevSig = 'a'; prevWord = ''; continue; }
      if (c === '/') {
        if (regexCanStart(prevSig, prevWord)) { skipRegex(); prevSig = 'a'; prevWord = ''; continue; }
        prevSig = '/';
        i += 1;
        continue;
      }
      if (untilClosingBrace && c === '{') depth += 1;
      if (untilClosingBrace && c === '}') {
        if (depth === 0) { i += 1; return; }
        depth -= 1;
      }
      if (/\s/.test(c)) { i += 1; continue; }
      if (/[A-Za-z0-9_$]/.test(c)) {
        let w = '';
        while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) { w += src[i]; i += 1; }
        prevWord = w;
        prevSig = 'a';
        continue;
      }
      prevSig = c;
      prevWord = '';
      i += 1;
    }
  }

  scanCode(false);
  return literals;
}

describe('the extractor reads strings, never comments or patterns', () => {
  test('a banned phrase in a string is found; in a comment or a regex it is not', () => {
    const src = [
      "// the next read is only a comment",
      "/* makes the rest readable, also a comment */",
      "const re = /back on rate|it's/i;",
      "const a = 'Daily weigh-ins sharpen the next read.';",
      'const b = `Week ${n} of ${m}: trend responded, ${x ? \'back on rate\' : "off rate"}.`;',
    ].join('\n');
    const lits = stringLiterals(src);
    expect(lits).toContain('Daily weigh-ins sharpen the next read.');
    expect(lits).toContain('back on rate');
    expect(lits).toContain('off rate');
    expect(lits.some((l) => /trend responded/.test(l))).toBe(true);
    expect(lits.some((l) => /only a comment|also a comment/.test(l))).toBe(false);
    expect(lits.some((l) => /it's/.test(l))).toBe(false);
  });
});

describe('D207: the coach shorthand never returns to the coaching libraries', () => {
  test.each(FILES)('%s carries no banned shorthand in any string literal', (rel) => {
    const src = fs.readFileSync(path.join(LIB, rel), 'utf8');
    const offenders = stringLiterals(src).filter((l) => BANNED.test(l));
    expect({ file: rel, offenders }).toEqual({ file: rel, offenders: [] });
  });

  test('the guard is not vacuous: it sees the real sentences in these files', () => {
    const lits = (rel) => stringLiterals(fs.readFileSync(path.join(LIB, rel), 'utf8'));
    expect(lits('coachStory.js')).toContain('Your daily food target stays the same.');
    expect(lits('coachResponse.js')).toContain('Keep the week the same: log, train, eat to the target, weigh in.');
    expect(lits('coachOutput/viewCopy.js')).toContain('This decision covers the dates above and has not been updated since.');
    expect(lits('weeklyCoach.js').length).toBeGreaterThan(100);
  });

  test("the founder's own example is gone, and its plain rewrite is what the coach says", () => {
    const story = fs.readFileSync(path.join(LIB, 'coachStory.js'), 'utf8');
    const lits = stringLiterals(story);
    expect(lits.some((l) => /makes the rest readable/i.test(l))).toBe(false);
    expect(lits).toContain("Once you're doing all your planned sessions again, your coach can see whether the rest of your plan is working.");
  });
});
