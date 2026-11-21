/**
 * Store wording guard (LOC-662).
 *
 * docs/growth-store-2026-11/wording/*.txt is the draft text for the Google
 * Play and App Store pages. This suite pins, as a source-level regression
 * guard:
 *  - every field is inside its store limit (Play 30/80/4000; App Store
 *    subtitle 30, keywords 100, promotional text 170, description 4000);
 *  - the claims the live pages got wrong can not come back: no Pro tier, trial
 *    or subscription, no price figure or price promise, no cardio or steps
 *    TRACKING, no "AI", "learns", "best", "#1", no streaks, no gym challenge,
 *    no coach partnerships, no em dash, no emoji;
 *  - the name is unchanged ("Volyume") and the phrase list is carried;
 *  - the Apple keyword field repeats no word from the subtitle or the name;
 *  - docs/growth-store-2026-11/02-store-wording.md shows every field verbatim
 *    and states the same counts, so the page a reviewer reads is the text that
 *    will be pasted.
 * The live (wrong) text is recorded in 01-live-page-record.md and is
 * deliberately not scanned here.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'docs', 'growth-store-2026-11');
const read = (f) => fs.readFileSync(path.join(DIR, 'wording', f), 'utf8');

const FIELDS = {
  'play-title.txt': 30,
  'play-short-description.txt': 80,
  'play-full-description.txt': 4000,
  'apple-subtitle.txt': 30,
  'apple-keywords.txt': 100,
  'apple-promotional-text.txt': 170,
  'apple-description.txt': 4000,
};

describe('limits', () => {
  test.each(Object.entries(FIELDS))('%s is within %i characters', (file, limit) => {
    const text = read(file);
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(limit);
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(file === 'apple-keywords.txt' ? limit : limit * 4);
  });

  test('the title starts with the unchanged name', () => {
    expect(read('play-title.txt').startsWith('Volyume')).toBe(true);
  });

  test('no field ends in a newline (a stray newline is counted by the console)', () => {
    Object.keys(FIELDS).forEach((f) => expect(read(f)).not.toMatch(/\n$/));
  });
});

describe('claims the live pages got wrong stay out', () => {
  const all = Object.keys(FIELDS).map((f) => [f, read(f)]);
  const banned = [
    ['Pro tier', /\bpro\b/i],
    ['trial', /\btrial\b/i],
    ['subscription', /\bsubscri/i],
    ['price figure', /[£$€]\s?\d/],
    ['price promise', /free (forever|for life|for ever)|forever free|always free|no card/i],
    // "AI" may appear only in a denial ("not AI", "no AI").
    ['AI', /(?<!\bnot )(?<!\bno )\bAI\b|artificial|machine learning|\bLLM\b/],
    ['learns', /\blearn/i],
    ['adapts to you', /adapts? to you|gets? better/i],
    ['cardio', /cardio/i],
    ['steps tracking', /steps? tracking|step counter|count your steps/i],
    ['superlatives', /\bbest\b|#1|\bnumber one\b|\btop\b|\bpopular\b|\bnew\b/i],
    ['streaks', /streak/i],
    ['gym challenge', /challenge/i],
    ['coach partnership', /partner|personal trainer|human coach|real coach/i],
    ['loss claims', /lose weight|weight loss|fat loss|shred|transform|before and after/i],
    ['health claim', /\bcure|treat|diagnos|clinical|doctor/i],
    ['other apps', /\b(hevy|strong|fitbod|myfitnesspal|macrofactor|jefit|boostcamp)\b/i],
    ['em dash', /—|–/],
    ['emoji', /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u],
  ];
  test.each(banned)('no %s anywhere', (_name, re) => {
    all.forEach(([file, text]) => expect([file, re.test(text)]).toEqual([file, false]));
  });

  test('the first word "free" appears only in the Play full description and the Apple fields that allow it', () => {
    expect(/\bfree\b/i.test(read('play-title.txt'))).toBe(false);
    expect(/\bfree\b/i.test(read('play-short-description.txt'))).toBe(false);
    expect(/\bfree\b/i.test(read('apple-subtitle.txt'))).toBe(false);
  });

  test('"free" is stated as a present fact, not a promise', () => {
    const desc = read('play-full-description.txt');
    expect(desc.split('\n')[0]).toMatch(/^Volyume is a free workout tracker/);
  });
});

describe('the phrase list is carried', () => {
  const desc = read('play-full-description.txt').toLowerCase();
  test.each([
    'hypertrophy',
    'progressive overload',
    'gym log',
    'workout tracker',
    'workout planner',
    'bodybuilding',
    'strength training',
    'calorie counter',
    'macro tracker',
    'food diary',
  ])('the description uses "%s"', (phrase) => {
    expect(desc).toContain(phrase);
  });

  test('the Play title and short description carry hypertrophy and gym log', () => {
    expect(read('play-title.txt')).toMatch(/Hypertrophy/);
    expect(read('play-title.txt')).toMatch(/Gym Log/);
    expect(read('play-short-description.txt')).toMatch(/Hypertrophy/);
  });
});

describe('Apple keyword field', () => {
  const words = read('apple-keywords.txt').split(',');
  test('is comma separated with no spaces and no empty entries', () => {
    expect(read('apple-keywords.txt')).not.toMatch(/\s/);
    words.forEach((w) => expect(w.length).toBeGreaterThan(0));
  });
  test('repeats no word and none from the name or subtitle', () => {
    expect(new Set(words).size).toBe(words.length);
    const used = `volyume ${read('apple-subtitle.txt')}`.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    words.forEach((w) => expect(used).not.toContain(w.toLowerCase()));
  });
});

describe('02-store-wording.md matches the files', () => {
  const doc = fs.readFileSync(path.join(DIR, '02-store-wording.md'), 'utf8');
  test.each(Object.entries(FIELDS))('shows %s verbatim with its count', (file, limit) => {
    const text = read(file);
    expect(doc).toContain(`\n\`\`\`\n${text}\n\`\`\`\n`);
    expect(doc).toContain(`\`${file}\` | ${text.length} / ${limit} |`);
  });
});
