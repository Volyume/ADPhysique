/**
 * coachGlossary: the Volume heatmap legend's (i) and the effort (i)
 * (register D214 addendum 9, census 0.21, H10 and K2).
 *
 * 0.21 / H10: the legend's (i) said "How much you've trained a muscle this week,
 * compared with the helpful range", and "the helpful range" is never defined on
 * that screen while "this week" is wrong at the 2 and 4 weeks views. The lead's
 * text counts sets, names the windows, defines the range once, and says which of
 * the legend's words sit inside it. K2: the effort (i) said how close to your
 * limit "the set should feel", an instruction, for what is a plan's prescription
 * ("is planned to feel", the D93 note on the removed `rir` gloss).
 *
 * The brief names the entries `volume` and `rir`; the tree's keys for those two
 * strings are `volumeBands` (coachGlossary.js, read by BodyDiagramHeatmap.js:552)
 * and `effort`. `volume` is a different gloss, used on seven other surfaces
 * (onboarding, the plan screens), and `rir` was removed on the founder's order of
 * 2026-09-22 and is pinned undefined (campaign2.comprehension.test.js), so neither
 * could be the target. `volumeBands` is ALSO read by the Manual Builder's Plan
 * balance card, a plan being built where "sets you have done ... this week so
 * far" would be untrue, so the lead's text lives under its own key,
 * `volumeHeatmapBands`, which the legend reads; `volumeBands` is left as it was.
 */
import fs from 'fs';
import path from 'path';
import { GLOSSARY } from '../coachGlossary';
import { checkJargon } from '../whyThisTemplates';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

// RE-PINNED under D219 lane A5 (design 5.3): the legend's (i) used to define "the
// range" as the fewest sets that help a muscle grow up to the most it can recover
// from, and to say "Just enough, In range and Near the limit all sit inside the
// range" and "Too much means past the point of extra benefit". Those words judged
// against a landmark table that ignored the plan; the legend now names the four
// tones of the one judgement (volumeJudgement.js) and says what the bands are.
describe('the Volume heatmap legend\'s (i): sets done, in a window, against the studied bands', () => {
  test('the lead\'s text, word for word', () => {
    expect(GLOSSARY.volumeHeatmapBands).toBe(
      'How many sets you have done for a muscle, this week so far or as a weekly average over 2 or 4 weeks. '
      + 'The bands come from studies of weekly sets: under 2 is below maintenance, 2 to 10 runs from holding the size you have towards growth, '
      + '10 to 20 is the normal growth range, 20 to 30 is a focus range, and studies have little to say beyond 42. '
      + 'A muscle you picked as a focus in your plan reads against its focus range. '
      + 'Each row’s bar runs from 2 to 42 sets and marks the range your plan aims at.',
    );
  });

  test('it names the windows\' figure, names the bands, and never says "too much" or "near the limit"', () => {
    const text = GLOSSARY.volumeHeatmapBands;
    expect(text).toMatch(/this week so far or as a weekly average over 2 or 4 weeks/);
    for (const word of ['below maintenance', 'normal growth range', 'focus range']) expect(text).toContain(word);
    expect(text).not.toMatch(/too much|near the limit|just enough|helpful range|you've trained|compared with|recover from/i);
    expect(text).not.toContain('—');
  });

  test('it passes the jargon blocklist, like every glossary entry', () => {
    expect(checkJargon(GLOSSARY.volumeHeatmapBands).clean).toBe(true);
    expect(checkJargon(GLOSSARY.effort).clean).toBe(true);
  });

  // RE-ANCHORED 2026-10-02 (lead, D214 addendum 9): the Plan balance card's own
  // gloss said "you've trained ... this week" of a plan still being built, so it
  // now describes what a plan GIVES a muscle, against the same defined range.
  test('the figure\'s legend reads it, and the Plan balance card keeps its own gloss, true of a plan being built', () => {
    expect(read('components/BodyDiagramHeatmap.js')).toContain('<InfoTooltip text={GLOSSARY.volumeHeatmapBands} size={14} />');
    expect(read('components/BodyDiagramHeatmap.js')).not.toContain('GLOSSARY.volumeBands');
    expect(read('screens/ManualBuilderScreen.js')).toContain('<InfoTooltip text={GLOSSARY.volumeBands} size={14} />');
    // RE-PINNED under D219 lane A5: the Plan balance card no longer reads a weekly
    // ceiling as "too much" (it nudges on the exercise and session caps instead),
    // so its gloss describes the dots against the fewest sets that help a muscle grow.
    expect(GLOSSARY.volumeBands).toBe(
      'How many direct sets a week your plan gives each muscle, against the fewest that still help it grow. A hollow dot means none yet, a half dot means fewer than that, and a full dot means at least that.',
    );
    expect(GLOSSARY.volumeBands).not.toMatch(/helpful range|you've trained|this week|too much|recover from/i);
  });

  test('the entries the brief names by other keys are untouched: `volume` stays the weekly-sets gloss, `rir` stays removed', () => {
    expect(GLOSSARY.volume).toBe('The total work for a muscle: the number of sets you do for it in a week, not counting warm-ups.');
    expect(GLOSSARY.rir).toBeUndefined();
  });
});

describe('the effort (i) describes what the block plans, it does not tell (K2)', () => {
  test('"each set is planned to feel", with the two ends of the scale', () => {
    expect(GLOSSARY.effort).toBe(
      'How close to your limit each set is planned to feel: 5 means you could not do another rep, 0 means very easy.',
    );
    expect(GLOSSARY.effort).not.toMatch(/should/);
  });
});
