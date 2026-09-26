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
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

// Instruction verbs and recommendation words a describing surface never uses.
const INSTRUCTS = /\b(push your|hold your weights|focus on form|consider a lighter|lighter (day|week) recommended|recommended|train as normal|drop(ping)? the weights|stop well before|should feel)\b/i;

describe('the fatigue trend card describes what was reported', () => {
  const SRC = read('components/FatigueTrendCard.js');
  const fn = SRC.slice(SRC.indexOf('function coachingLine('), SRC.indexOf('export default function FatigueTrendCard'));

  test('every line is a description of the rating, never an instruction', () => {
    const lines = fn.match(/return '([^']*)'/g).map((l) => l.slice(8, -1)).filter(Boolean);
    expect(lines).toEqual([
      'You rated your last two sessions as fresh.',
      'You rated your last two sessions as mildly tiring.',
      'You rated your last two sessions as moderately tiring.',
      'You rated your last two sessions as very tiring.',
    ]);
    for (const line of lines) expect(line).not.toMatch(INSTRUCTS);
  });
});

describe('the four-week fatigue banner describes, in a neutral card', () => {
  const SRC = read('screens/ConsistencyScreen.js');
  const banner = SRC.slice(SRC.indexOf('{deloadAlert && ('), SRC.indexOf('{loading ? ('));

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
