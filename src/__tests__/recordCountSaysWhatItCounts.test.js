/**
 * The record count says what it actually counts.
 *
 * Founder device report 2026-08-23: "it's oddly saying I only had 1 PR
 * when I absolutely did not even close to have only one, I had about 10."
 *
 * detectedPRs is bestPRPerExercise's output, so it has always held ONE
 * entry per lift, not one per record. Working up through three new bests
 * on the same lift is one entry. Both surfaces that render that number
 * called it a count of PRs, so a session that had just handed out ten
 * celebrations closed by reporting one - the app contradicting itself.
 *
 * Founder's ruling: keep the list at one per lift, and reword the number
 * so it says what it counts. This suite pins that wording on the workout
 * summary and on the share card, which draws the identical number.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the workout summary', () => {
  const SRC = stripComments(read('screens/WorkoutSummaryScreen.js'));

  test('counts lifts, not records', () => {
    expect(SRC).toMatch(/New bests on \$\{detectedPRs\.length\} lifts/);
    // The abbreviation is gone from the count itself.
    expect(SRC).not.toMatch(/\{detectedPRs\.length\} new PR/);
  });

  test('a single lift names it instead of counting to one', () => {
    // "New best on 1 lift - Cable Row" says the same thing twice.
    expect(SRC).toMatch(/detectedPRs\.length === 1[\s\S]{0,80}New best on \$\{prExerciseNames \|\| '1 lift'\}/);
  });

  test('the line is still what the gloss is attached to', () => {
    expect(SRC).toMatch(/\{prLine\}<\/Text>[\s\S]{0,120}GLOSSARY\.pr/);
  });
});

describe('the share card', () => {
  const SRC = stripComments(read('lib/shareCard/drawShareCard.js'));

  test('the hero stat counts lifts too, so the card cannot disagree with the summary', () => {
    // prCount is handed straight from the summary's detectedPRs.length.
    expect(SRC).toMatch(/'LIFT WITH A NEW BEST' : 'LIFTS WITH A NEW BEST'/);
    expect(SRC).not.toMatch(/NEW PERSONAL RECORDS?'/);
  });

  test('the summary is the source of that number, so the two move together', () => {
    expect(stripComments(read('screens/WorkoutSummaryScreen.js')))
      .toMatch(/prCount: detectedPRs\.length/);
  });
});

describe('the collapse itself is unchanged', () => {
  const { bestPRPerExercise } = require('../lib/algorithms');

  test('three new bests on one lift are still one entry', () => {
    const prs = [
      { exerciseId: 'e1', type: 'heaviest_weight', value: 100 },
      { exerciseId: 'e1', type: 'heaviest_weight', value: 105 },
      { exerciseId: 'e1', type: 'heaviest_weight', value: 110 },
    ];
    expect(bestPRPerExercise(prs)).toHaveLength(1);
    expect(bestPRPerExercise(prs)[0].value).toBe(110);
  });

  test('four lifts are four entries, which is the number the copy now names', () => {
    const prs = ['e1', 'e2', 'e3', 'e4'].map(exerciseId => ({
      exerciseId, type: 'heaviest_weight', value: 100,
    }));
    expect(bestPRPerExercise(prs)).toHaveLength(4);
  });
});
