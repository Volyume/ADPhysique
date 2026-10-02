/**
 * D204 on the Consistency screen, second pass (register D204 addendum,
 * 2026-09-26). Founder rule, verbatim: "We don't want to be telling people
 * to consider an easier session that is nonsense they are in a plan for a
 * reason and have had a really progressive week. They don't choose
 * sessions!" Surfaces DESCRIBE; no card, caption or tooltip tells the
 * athlete to train easier or harder, or to take a lighter week.
 *
 * The first pass fixed the Weekly load card (ProgressSections.workloadCopy
 * test). The plain-English sweep found two more on the same screen: the
 * fatigue trend card's line ("push your next session", "consider a lighter
 * day") and the four-week fatigue banner ("Lighter week recommended", with
 * a tooltip on how to run your own deload). This suite fails if either
 * goes back to instructing.
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan section 7.3
 * items 6 and 8, CS-6, CS-18): the screen's order changed, so the banner now
 * sits after the sessions line rather than before the loading branch (the
 * slice that finds it moved with it, to the empty-state marker that follows
 * it), and it lists EVERY reason the four-week check found, not only the first
 * (CS-18). The Weekly load card these rules first fixed is the load card now,
 * and its comparison is worded by chartWindows.workloadTakeaway ("In line with
 * recent weeks at this point"), which this suite also holds to the describing
 * register. The banner's own words and its tooltip are unchanged.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

// Instruction verbs and recommendation words a describing surface never uses.
const INSTRUCTS = /\b(push your|push the|hold your weights|focus on form|consider a lighter|consider reducing|lighter (day|week) recommended|recommended|train as normal|drop(ping)? the weights?|stop well before|should feel|ease in|catch up|keep the movement)\b/i;

describe('the fatigue trend card describes what was reported', () => {
  const { lastTwoSessionsLine, FATIGUE_WORDS } = require('../../lib/recovery/ratingWords');
  const SRC = read('components/FatigueTrendCard.js');

  // RE-ANCHORED D214 addendum 9 (V5, rule 7): the card no longer holds four
  // fixed sentences for the AVERAGE of two ratings ("as fresh" ... "as very
  // tiring"); it prints BOTH ratings in the scale's own words. So the guard
  // runs the real builder over every pair of ratings instead of slicing four
  // `return` lines out of the source, and holds each result to the describing
  // register.
  test('every line is a description of the two ratings, never an instruction', () => {
    const lines = [];
    for (let a = 1; a <= 5; a += 1) {
      for (let b = 1; b <= 5; b += 1) lines.push(lastTwoSessionsLine([{ fatigueLevel: a }, { fatigueLevel: b }]));
    }
    // Five matching pairs and ten different ones, whichever session came first.
    expect(new Set(lines).size).toBe(15);
    for (const line of lines) {
      expect(line).toMatch(/^You rated your last two sessions [a-z]+( and [a-z]+)?\.$/);
      expect(line).not.toMatch(INSTRUCTS);
      const words = line.replace('You rated your last two sessions ', '').replace(/\.$/, '').split(' and ');
      for (const w of words) expect(FATIGUE_WORDS).toContain(w);
    }
  });

  test('the card prints that one line and holds no rating sentence of its own', () => {
    expect(SRC).toContain('{lastTwoSessionsLine(sessions)}');
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/You rated|tiring/);
  });
});

describe('the four-week fatigue banner describes, in a neutral card', () => {
  const SRC = read('screens/ConsistencyScreen.js');
  const banner = SRC.slice(SRC.indexOf('hasData && deloadAlert && ('), SRC.indexOf('Empty state (CS-4)'));

  test('the slice found the banner (not an empty string that every negative pin would pass)', () => {
    expect(banner.length).toBeGreaterThan(400);
    expect(banner).toContain('<Card style={styles.deloadBanner}>');
  });

  test('it lists every reason of the check, not only the first (CS-18)', () => {
    expect(banner).toMatch(/deloadAlert\.reasons/);
    expect(banner).toMatch(/\.map\(\(reason\) => \(/);
    expect(banner).not.toMatch(/reasons\??\.?\[0\]/);
  });

  test('it names what was found and says the plan sets the sessions', () => {
    expect(banner).toContain('Signs of building fatigue');
    expect(banner).toContain("It's a picture of how you've been recovering, not an instruction. Your plan sets your sessions.");
  });

  test('no recommendation, no deload instructions, no warning tone', () => {
    expect(banner).not.toMatch(INSTRUCTS);
    expect(banner).not.toMatch(/tone="warning"/);
    expect(banner).not.toMatch(/t\.colors\.warning/);
  });

  test("the check's own reasons are plain and descriptive", () => {
    const ALG = read('lib/algorithms.js');
    const fn = ALG.slice(ALG.indexOf('export function shouldDeload('), ALG.indexOf('const DELOAD_BUCKET_WEEK_MS'));
    const reasons = fn.match(/reasons\.push\('([^']*)'\)/g).map((r) => r.slice(14, -2));
    expect(reasons).toEqual([
      'Your average reps per set have dropped over the last 4 weeks',
      'Recurring joint discomfort across the block',
      'More sets on a muscle than it can usually recover from, in 2 or more weeks',
      'Sustained soreness across 3 or more weeks',
    ]);
    for (const r of reasons) {
      expect(r).not.toMatch(INSTRUCTS);
      expect(r).not.toMatch(/productive volume|rep performance/i);
    }
  });
});

describe("Today's coach brief describes, never tells you what to lift (D204 addendum 2)", () => {
  const { buildCoachBrief } = require('../../lib/homeCoachBrief');
  const now = Date.now();
  const rated = (level) => [
    { fatigueLevel: level, startedAt: now - 1 * 86400000 },
    { fatigueLevel: level, startedAt: now - 3 * 86400000 },
  ];
  const cases = {
    deload: buildCoachBrief({ fatigueHistory: [], deloadSuggestion: { deload: true }, lastWorkoutDaysAgo: 1 }),
    fatigue: buildCoachBrief({ fatigueHistory: rated(4), deloadSuggestion: null, lastWorkoutDaysAgo: 1 }),
    gap: buildCoachBrief({ fatigueHistory: [], deloadSuggestion: null, lastWorkoutDaysAgo: 6 }),
    onTrack: buildCoachBrief({ fatigueHistory: rated(1), deloadSuggestion: null, lastWorkoutDaysAgo: 1 }),
  };

  test('each rule says what it sees', () => {
    expect(cases.deload.body).toBe('Your last four weeks of sessions show signs of it.');
    expect(cases.fatigue.body).toBe('You rated your last two sessions as very tiring.');
    expect(cases.gap.body).toBe("It's been a while since your last session.");
    expect(cases.onTrack.body).toBe('Training is on track.');
  });

  test('no rule tells the athlete to lift lighter, ease in or push', () => {
    for (const [name, brief] of Object.entries(cases)) {
      expect({ name, text: `${brief.headline}. ${brief.body}` }).toEqual({ name, text: expect.not.stringMatching(INSTRUCTS) });
      expect(brief.body).not.toMatch(/10%|reduc|drop the weight/i);
    }
  });
});

describe('the load comparison describes how the week sits and never tells you what to do (D204, D214 CS-6)', () => {
  const { workloadTakeaway } = require('../../lib/chartWindows');

  test('each reading is a description of the week at this point', () => {
    const lines = ['above', 'in_line', 'below'].map(workloadTakeaway);
    expect(lines).toEqual([
      'Above recent weeks at this point',
      'In line with recent weeks at this point',
      'Below recent weeks at this point',
    ]);
    for (const line of lines) expect(line).not.toMatch(INSTRUCTS);
  });

  test('the load card\'s (i) says the plan sets each session and that this is not an instruction', () => {
    const SRC = read('components/ProgressSections.js');
    expect(SRC).toContain('Your plan sets each session; this is a picture of how the load is moving across the block, not an instruction.');
    expect(SRC).not.toMatch(/easier session|Consider|Monitor how you feel|Room for more work|fatigue risk/i);
  });
});
