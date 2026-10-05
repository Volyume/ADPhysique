/**
 * RecoveryLearningCard.test.js -- register D210.
 *
 * Founder, 2026-09-26: "we need an elegant way to show and demonstrate this
 * intelligence too", and "human understandable English!". Pins what the
 * card says for each state of the personal recovery learner, that every
 * "not yet" state gives its reason (spec section 6), that the example is a
 * real reading of the model in days, and the wording rules: no engine words
 * ("factor", "pairs", "calibrat"), no instruction (D204), no em dash, and
 * every figure an estimate.
 *
 * RE-ANCHORED under D214 (lane 2, plan section 7.2 item 3, RC-13 and RC-21):
 * the card says ONE sentence under the headline (`summary`); the method
 * paragraph, the example and the footer sit behind "How this is worked
 * out", collapsed by default; the scale is a thin track with a TICK for the
 * first estimate and a MARKER for "You", both always drawn ("You, at the
 * first estimate" while they coincide), never a round thumb; the "You"
 * marker is ink, not amber. `body` still holds the method paragraph (its
 * pins are unchanged).
 *
 * D219 (lead ruling 6.4, 2026-10-05): a reading with `pairing: 'slot'` (the
 * learner paired each lift with its previous session because the weekdays did
 * not set the gaps) must not say "on the same day"; and the 'fixed_reps' reason
 * also covers sets kept exactly as the screen filled them in. Pinned below.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import RecoveryLearningCard, {
  recoveryLearningCopy, spokenDuration, learningExampleMuscle, learningExample, scalePosition,
  recoveryLearningSubtitle, pointLabelPlacement, speedScaleSpokenLabel, RECOVERY_SPEED_TITLE, RECOVERY_SPEED_FOOTER,
} from '../RecoveryLearningCard';
import {
  recoveryHours, REFERENCE_SETS, PERSONAL_MIN_PAIRS, RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX,
} from '../../lib/recovery/constants';
import { muscleRecoveryBasisText } from '../MuscleRecoveryList';

const THEME_COLORS = require('../../styles/theme').resolveTheme({
  theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined,
}).colors;

const reading = (over = {}) => ({
  factor: 1, prior: 1, pairs: 0, reason: 'too_few', pairsByMuscle: {}, ...over,
});

describe('spokenDuration', () => {
  test('under a day and a half in hours, otherwise days to the nearest half', () => {
    expect(spokenDuration(24)).toBe('24 hours');
    expect(spokenDuration(35.4)).toBe('35 hours');
    expect(spokenDuration(36)).toBe('1½ days');
    expect(spokenDuration(48)).toBe('2 days');
    expect(spokenDuration(60)).toBe('2½ days');
    expect(spokenDuration(70)).toBe('3 days');
    expect(spokenDuration(0)).toBeNull();
    expect(spokenDuration(NaN)).toBeNull();
  });
});

describe('the example', () => {
  test('names the muscle with the most comparisons, ties by name', () => {
    expect(learningExampleMuscle({ chest: 9, quads: 14, back: 14 })).toBe('back');
    expect(learningExampleMuscle({})).toBeNull();
    expect(learningExampleMuscle(null)).toBeNull();
  });

  test('is the model\'s own reading after a standard session, now and at the first estimate', () => {
    const personal = reading({ factor: 1.2, prior: 1, pairs: 30, reason: 'adjusted', pairsByMuscle: { quads: 20, chest: 10 } });
    const now = spokenDuration(recoveryHours('quads', { sets: REFERENCE_SETS, personalFactor: 1.2 }));
    const before = spokenDuration(recoveryHours('quads', { sets: REFERENCE_SETS, personalFactor: 1 }));
    // RE-PINNED D219 (founder Q3, design 4.13): quads re-centred from 72 h to
    // 54 h. 54 h x 1.2 = 64.8 h; both read "2½ days", so the card speaks hours.
    expect(now).toBe('2½ days');
    expect(before).toBe('2½ days');
    expect(learningExample(personal)).toEqual({
      name: 'Quads',
      sets: REFERENCE_SETS,
      before: '54 hours',
      now: '65 hours',
      sentence: `Quads after ${REFERENCE_SETS} sets: about 65 hours, up from 54 hours.`,
    });
  });

  test('falls back to hours when both round to the same days', () => {
    // Chest: 60 h at the start, 57 h at 0.95: both "2½ days".
    const personal = reading({ factor: 0.95, prior: 1, pairs: 30, reason: 'adjusted', pairsByMuscle: { chest: 30 } });
    expect(learningExample(personal).sentence).toBe(`Chest after ${REFERENCE_SETS} sets: about 57 hours, down from 60 hours.`);
    expect(learningExample(personal)).toMatchObject({ before: '60 hours', now: '57 hours' });
  });
});

// RE-ANCHORED D214 addendum 9 (plain-English census, 2026-10-02): the card's
// words are the common ones. "Faster than your first estimate" and "than the
// first estimate" (the phrase the scale's own tick uses) for "first
// estimated"; "more time" beside "less time" for "longer"; "rest" for "breaks"
// (0.9); "usable comparisons" for "comparisons count" (V7). No figure, state or
// threshold moves.
describe('what the card says, state by state', () => {
  test('faster: what changed, by how much, why, and from how much', () => {
    const copy = recoveryLearningCopy(reading({
      factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 30, chest: 12 },
    }));
    expect(copy.state).toBe('faster');
    expect(copy.headline).toBe('Faster than your first estimate');
    expect(copy.body).toBe('When you train again soon after a workout, you lift more than first expected. So your recovery is now estimated to take about 15% less time, though never less than a day.');
    expect(copy.example.sentence).toMatch(/^Quads after 6 sets: about .*, down from .*\.$/);
    expect(copy.evidence).toBe('Based on 42 comparisons of the same exercise on the same day in different weeks.');
    expect(copy.progress).toBeNull();
    // D214: the ONE sentence under the headline.
    expect(copy.summary).toBe('Your recovery is now estimated to take about 15% less time than the first estimate.');
  });

  test('slower, measured against a "poor" answer\'s start', () => {
    const copy = recoveryLearningCopy(reading({
      factor: 1.4, prior: 1.15, pairs: 20, reason: 'adjusted', pairsByMuscle: { back: 20 },
    }));
    expect(copy.state).toBe('slower');
    expect(copy.headline).toBe('Slower than your first estimate');
    expect(copy.body).toBe('When you train again soon after a workout, you lift less than first expected. So your recovery is now estimated to take about 22% longer, though never more than a week.');
    expect(copy.summary).toBe('Your recovery is now estimated to take about 22% more time than the first estimate.');
  });

  test('"a day" and "a week" are the estimate\'s own bounds (a session at either cannot move, review of 2026-09-26)', () => {
    expect(RECOVERY_HOURS_MIN).toBe(24);
    expect(RECOVERY_HOURS_MAX).toBe(7 * 24);
    // Calves after two sets sit at the minimum at the start: a faster
    // reading moves them less than the headline percent, which is why the
    // sentence names the minimum.
    expect(recoveryHours('calves', { sets: 2, personalFactor: 0.85 })).toBe(RECOVERY_HOURS_MIN);
  });

  test('not clear: in line with the first estimate, with what it is based on', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 25, reason: 'not_clear', pairsByMuscle: { chest: 25 } }));
    expect(copy.state).toBe('steady');
    expect(copy.headline).toBe('In line with the first estimate');
    expect(copy.body).toBe('So far, how much you lift after short and long rests shows no clear difference from the first estimate, so the estimate stays the same.');
    expect(copy.evidence).toBe('Based on 25 comparisons of the same exercise on the same day in different weeks.');
    expect(copy.example).toBeNull();
    expect(copy.summary).toBe('Your workouts so far show no clear difference from the first estimate, so it stays the same.');
  });

  test('no spread: says why it cannot learn yet, true of a fixed weekly schedule and of long breaks alike, and instructs nothing', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 16, reason: 'no_spread' }));
    expect(copy.state).toBe('waiting');
    expect(copy.headline).toBe('Not learning yet');
    expect(copy.body).toBe('Your recovery speed is worked out by comparing the same exercise on the same day in different weeks, after rests of different lengths. So far the rests have been too alike, or long enough to recover fully.');
    // D210 addendum 3: the old line said the breaks "have been much the same
    // length", false for a schedule that alternates three and four days.
    expect(copy.body).not.toMatch(/much the same length/);
    expect(copy.evidence).toBeNull();
    expect(copy.summary).toBe('The rest between your workouts has not varied enough to learn from yet.');
    // "break" is not the common word for it: "rest" is, in every sentence of the state.
    expect(`${copy.summary} ${copy.body}`).not.toMatch(/\bbreaks?\b/i);
  });

  // Re-pinned for lead ruling 6.4: the reason now also covers sets kept exactly as the screen filled
  // them in (the learner leaves those out as well as the lifts whose reps repeat).
  test('reps that repeat or sets kept as filled in: says what is left out, and that too few comparisons remain', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 2, reason: 'fixed_reps' }));
    expect(copy.state).toBe('waiting');
    expect(copy.headline).toBe('Not learning yet');
    expect(copy.body).toBe('Sets kept exactly as the screen filled them in, and exercises logged with the same reps at least half the time, show the plan rather than how each workout went, so they are left out. That leaves too few comparisons so far.');
    expect(copy.progress).toBeNull();
    expect(copy.summary).toBe('Too few comparisons are left once repeated reps and sets kept as filled in are set aside.');
    // Both kinds are named, in the summary and in the method.
    expect(copy.summary).toMatch(/repeated reps/);
    expect(copy.summary).toMatch(/kept as filled in/);
    expect(copy.body).toMatch(/kept exactly as the screen filled them in/);
    expect(copy.body).toMatch(/the same reps at least half the time/);
  });

  test('too few: how far along it is', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 5, reason: 'too_few' }));
    expect(copy.state).toBe('learning');
    expect(copy.headline).toBe('Still learning');
    expect(copy.body).toBe('Each exercise is compared with the same exercise on the same day in an earlier week. A muscle’s comparisons become usable once it has 5, and learning starts after 8 usable comparisons.');
    expect(copy.progress).toEqual({ done: 5, needed: PERSONAL_MIN_PAIRS });
    expect(copy.evidence).toBeNull();
    expect(copy.summary).toBe(`Learning starts after ${PERSONAL_MIN_PAIRS} usable comparisons.`);
  });

  test('every state has exactly ONE sentence under the headline (D214)', () => {
    for (const personal of [
      reading({ factor: 0.8, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { quads: 40 } }),
      reading({ factor: 1.3, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { chest: 40 } }),
      reading({ pairs: 30, reason: 'not_clear' }), reading({ pairs: 30, reason: 'no_spread' }),
      reading({ pairs: 4, reason: 'fixed_reps' }), reading({ pairs: 2, reason: 'too_few' }),
    ]) {
      const { summary } = recoveryLearningCopy(personal);
      expect(summary.endsWith('.')).toBe(true);
      // One full stop, at the end: one sentence.
      expect(summary.slice(0, -1)).not.toMatch(/\.\s/);
    }
  });

  test('no reading: nothing', () => {
    expect(recoveryLearningCopy(null)).toBeNull();
  });

  test('every state\'s words are plain, describe rather than instruct, and carry no em dash', () => {
    const all = [
      reading({ factor: 0.8, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { quads: 40 } }),
      reading({ factor: 1.3, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { chest: 40 } }),
      reading({ pairs: 30, reason: 'not_clear' }),
      reading({ pairs: 30, reason: 'no_spread' }),
      reading({ pairs: 4, reason: 'fixed_reps' }),
      reading({ pairs: 2, reason: 'too_few' }),
    ].map(recoveryLearningCopy);
    const words = [RECOVERY_SPEED_TITLE, RECOVERY_SPEED_FOOTER, ...all.flatMap((c) => [c.headline, c.summary, c.body, c.example?.sentence, c.evidence])]
      .filter(Boolean).join(' \n ');
    expect(words).not.toMatch(/—/);
    expect(words).not.toMatch(/factor|pairs?\b|calibrat|algorithm|regression|significan/i);
    // D204: no instruction to train, rest, vary or change anything.
    expect(words).not.toMatch(/\b(you should|try to|make sure|train (more|less)|rest more|take (a|more) rest|vary your|change your)\b/i);
    expect(RECOVERY_SPEED_FOOTER).toBe('It starts from your answer to ‘How’s your recovery?’ and only changes when your workouts show a clear difference. It’s an estimate, not a measurement.');
    // Plain English (docs/rules/plain-english.md, founder 2026-09-26): no
    // lifting shorthand a person who has never trained would have to decode.
    expect(words).not.toMatch(/\byour lifts\b|\bhold up\b|\bsession\b|\bsame lift\b/i);
    // Effort is matched only inside a plan, so no line claims it (D210 addendum 3).
    expect(words).not.toMatch(/same effort/);
    // The change is the estimate's, not "each muscle's" (a muscle at the 24-hour floor cannot move).
    expect(words).not.toMatch(/each muscle/);
  });

  test('the subtitle says "learned" only once something has been learned', () => {
    expect(recoveryLearningSubtitle(recoveryLearningCopy(reading({ factor: 0.85, prior: 1, pairs: 30, reason: 'adjusted' })))).toBe('Learned from your workouts · estimated');
    expect(recoveryLearningSubtitle(recoveryLearningCopy(reading({ pairs: 30, reason: 'not_clear' })))).toBe('Learned from your workouts · estimated');
    for (const reason of ['no_spread', 'fixed_reps', 'too_few']) {
      expect(recoveryLearningSubtitle(recoveryLearningCopy(reading({ pairs: 3, reason })))).toBe('Learns from your workouts · estimated');
    }
  });
});

// D219 (lead ruling 6.4): when the learner paired each lift with its previous session (the
// weekdays did not set the gaps), "on the same day" is untrue, so the words change with it.
describe('what the card says when the comparisons were not of the same weekday (pairing: slot)', () => {
  const SLOT = { pairing: 'slot' };

  test('the comparisons line: the ruled wording for slot pairing, the same-weekday wording otherwise', () => {
    for (const over of [
      { factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 42 } },
      { factor: 1.3, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 42 } },
      { pairs: 25, reason: 'not_clear', pairsByMuscle: { chest: 25 } },
    ]) {
      expect(recoveryLearningCopy(reading({ ...over, ...SLOT })).evidence)
        .toBe(`Based on ${over.pairs} comparisons of the same exercise on different days.`);
      expect(recoveryLearningCopy(reading(over)).evidence)
        .toBe(`Based on ${over.pairs} comparisons of the same exercise on the same day in different weeks.`);
    }
  });

  test('one comparison is singular, in both forms', () => {
    expect(recoveryLearningCopy(reading({ pairs: 1, reason: 'not_clear', ...SLOT })).evidence)
      .toBe('Based on 1 comparison of the same exercise on different days.');
    expect(recoveryLearningCopy(reading({ pairs: 1, reason: 'not_clear' })).evidence)
      .toBe('Based on 1 comparison of the same exercise on the same day in different weeks.');
  });

  test('a pairing that is not "slot" reads as the same weekday (only the learner\'s own word counts)', () => {
    for (const pairing of [undefined, null, '', 'weekday', 'SLOT', true]) {
      expect(recoveryLearningCopy(reading({ pairs: 9, reason: 'not_clear', pairing })).evidence)
        .toBe('Based on 9 comparisons of the same exercise on the same day in different weeks.');
    }
  });

  test('the method paragraphs that describe the comparison say "the last time you did it", never "on the same day"', () => {
    const noSpread = recoveryLearningCopy(reading({ pairs: 16, reason: 'no_spread', ...SLOT }));
    expect(noSpread.body).toBe('Your recovery speed is worked out by comparing each exercise with the last time you did it, after rests of different lengths. So far the rests have been too alike, or long enough to recover fully.');
    const learning = recoveryLearningCopy(reading({ pairs: 5, reason: 'too_few', ...SLOT }));
    expect(learning.body).toBe(`Each exercise is compared with the last time you did it. A muscle’s comparisons become usable once it has 5, and learning starts after ${PERSONAL_MIN_PAIRS} usable comparisons.`);
    for (const reason of ['adjusted', 'not_clear', 'no_spread', 'fixed_reps', 'too_few']) {
      const copy = recoveryLearningCopy(reading({
        reason, factor: reason === 'adjusted' ? 1.3 : 1, pairs: 12, pairsByMuscle: { quads: 12 }, ...SLOT,
      }));
      const words = [copy.headline, copy.summary, copy.body, copy.example?.sentence, copy.evidence].filter(Boolean).join(' ');
      expect(words).not.toMatch(/same day|same weekday|day of the week/i);
    }
  });

  test('the other readings (not slot) keep the words they had', () => {
    expect(recoveryLearningCopy(reading({ pairs: 16, reason: 'no_spread' })).body)
      .toBe('Your recovery speed is worked out by comparing the same exercise on the same day in different weeks, after rests of different lengths. So far the rests have been too alike, or long enough to recover fully.');
    expect(recoveryLearningCopy(reading({ pairs: 5, reason: 'too_few' })).body)
      .toBe('Each exercise is compared with the same exercise on the same day in an earlier week. A muscle’s comparisons become usable once it has 5, and learning starts after 8 usable comparisons.');
  });

  test('everything else about a slot reading is as for any other: state, headline, summary, scale and progress do not move', () => {
    for (const over of [
      { factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 42 } },
      { pairs: 25, reason: 'not_clear' }, { pairs: 16, reason: 'no_spread' }, { pairs: 4, reason: 'fixed_reps' }, { pairs: 3, reason: 'too_few' },
    ]) {
      const { body, evidence, ...rest } = recoveryLearningCopy(reading({ ...over, ...SLOT }));
      const { body: otherBody, evidence: otherEvidence, ...otherRest } = recoveryLearningCopy(reading(over));
      expect(rest).toEqual(otherRest);
      expect(typeof body).toBe('string');
      expect(typeof otherBody).toBe('string');
      expect(evidence === null).toBe(otherEvidence === null);
    }
  });

  test('the slot words are plain, describe rather than instruct, and carry no em dash', () => {
    const all = [
      reading({ factor: 0.8, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { quads: 40 }, ...SLOT }),
      reading({ pairs: 30, reason: 'not_clear', ...SLOT }),
      reading({ pairs: 30, reason: 'no_spread', ...SLOT }),
      reading({ pairs: 4, reason: 'fixed_reps', ...SLOT }),
      reading({ pairs: 2, reason: 'too_few', ...SLOT }),
    ].map(recoveryLearningCopy);
    const words = all.flatMap((c) => [c.headline, c.summary, c.body, c.example?.sentence, c.evidence]).filter(Boolean).join(' \n ');
    expect(words).not.toMatch(/—/);
    expect(words).not.toMatch(/factor|pairs?\b|calibrat|algorithm|regression|significan/i);
    expect(words).not.toMatch(/\b(you should|try to|make sure|train (more|less)|rest more|take (a|more) rest|vary your|change your)\b/i);
    expect(words).not.toMatch(/\byour lifts\b|\bhold up\b|\bsession\b|\bsame lift\b/i);
    // One sentence under the headline, as for every state (D214).
    for (const c of all) {
      expect(c.summary.endsWith('.')).toBe(true);
      expect(c.summary.slice(0, -1)).not.toMatch(/\.\s/);
    }
  });

  test('rendered: the evidence line is the slot wording', () => {
    let tree;
    const slotReading = reading({ factor: 0.85, prior: 1, pairs: 12, reason: 'adjusted', pairsByMuscle: { quads: 12 }, ...SLOT });
    act(() => { tree = create(<RecoveryLearningCard personal={slotReading} />); });
    const shown = tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
    expect(shown).toContain('Based on 12 comparisons of the same exercise on different days.');
    expect(shown.some((x) => /on the same day/.test(x))).toBe(false);
  });

  test('rendered: "How this is worked out" opens to the slot wording for a reading still learning', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={reading({ pairs: 5, reason: 'too_few', ...SLOT })} />); });
    const toggle = tree.root.findAll((n) => n.props.accessibilityLabel === 'How this is worked out' && typeof n.props.onPress === 'function')[0];
    act(() => { toggle.props.onPress(); });
    const shown = tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
    expect(shown).toContain(recoveryLearningCopy(reading({ pairs: 5, reason: 'too_few', ...SLOT })).body);
    expect(shown.some((x) => /Each exercise is compared with the last time you did it\./.test(x))).toBe(true);
    expect(shown.some((x) => /same day/.test(x))).toBe(false);
  });
});

describe('the scale', () => {
  test('a marker label is centred on its point, and starts or ends at it near an end, by percentage (right on the first frame)', () => {
    expect(pointLabelPlacement(0.5)).toEqual({ style: { left: '50%', marginLeft: -52 }, textAlign: 'center' });
    expect(pointLabelPlacement(0)).toEqual({ style: { left: '0%', marginLeft: -6 }, textAlign: 'left' });
    expect(pointLabelPlacement(1)).toEqual({ style: { right: '0%', marginRight: -6 }, textAlign: 'right' });
    expect(pointLabelPlacement(0.385).style.left).toBe('38.5%');
  });

  test('the tick sits at the first estimate and the marker at the learned speed, with the span between them', () => {
    let tree;
    act(() => {
      tree = create(<RecoveryLearningCard personal={reading({
        factor: 1.4, prior: 1, pairs: 30, reason: 'adjusted', pairsByMuscle: { quads: 30 },
      })}
      />);
    });
    const lefts = tree.root.findAll((n) => n.type === 'View' && n.props.style)
      .map((n) => [].concat(n.props.style).reduce((acc, st) => ({ ...acc, ...(st || {}) }), {}))
      .map((st) => st.left)
      .filter((l) => typeof l === 'string');
    // tick (1.0 -> 38.5%), you (1.4 -> 100%), the span from 38.5% wide 61.5%,
    // and the first-estimate label centred at 38.5%.
    expect(lefts).toEqual(expect.arrayContaining(['38.5%', '100%']));
  });

  test('runs from the fastest the learning allows (0) to the slowest (1)', () => {
    expect(scalePosition(0.75)).toBe(0);
    expect(scalePosition(1.4)).toBe(1);
    expect(scalePosition(1)).toBeCloseTo(0.25 / 0.65, 10);
    expect(scalePosition(0.5)).toBe(0);
    expect(scalePosition('x')).toBeNull();
  });

  test('the scale is ONE labelled image that says where the person sits (it is drawn, not decoration)', () => {
    expect(speedScaleSpokenLabel({ state: 'faster' })).toBe('Recovery speed scale from faster to slower. You are faster than the first estimate.');
    expect(speedScaleSpokenLabel({ state: 'slower' })).toBe('Recovery speed scale from faster to slower. You are slower than the first estimate.');
    expect(speedScaleSpokenLabel({ state: 'steady' })).toBe('Recovery speed scale from faster to slower. You are at the first estimate.');
  });
});

describe('rendering', () => {
  const texts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
  const flat = (n) => Object.assign({}, ...[].concat(n.props.style).flat(3).filter(Boolean));
  const ADJUSTED = reading({ factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 42 } });

  test('an adjusted reading shows the title, the scale ends, both labels, the headline, the one sentence and the evidence; the method waits behind a toggle', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={ADJUSTED} />); });
    const shown = texts(tree);
    expect(shown).toEqual(expect.arrayContaining([
      RECOVERY_SPEED_TITLE, 'Faster', 'Slower', 'You', 'First estimate', 'Faster than your first estimate',
      'Your recovery is now estimated to take about 15% less time than the first estimate.',
      'Based on 42 comparisons of the same exercise on the same day in different weeks.',
      'How this is worked out',
    ]));
    // Collapsed by default: no method, no example, no footer (RC-21).
    expect(shown).not.toContain(RECOVERY_SPEED_FOOTER);
    expect(shown.some((x) => x.startsWith('When you train again soon after a workout'))).toBe(false);
    // The two example tiles are gone with the long card.
    expect(shown).not.toContain('Quads after 6 sets, estimated recovery time');
    // Not one grouped node: the title keeps its heading role.
    expect(tree.root.findAll((n) => n.props.accessible === true && n.props.accessibilityLabel
      && String(n.props.accessibilityLabel).startsWith(RECOVERY_SPEED_TITLE))).toHaveLength(0);
    expect(tree.root.findByProps({ accessibilityRole: 'header', children: RECOVERY_SPEED_TITLE })).toBeTruthy();
  });

  test('"How this is worked out" opens the method, the example in days and the footer, and closes again', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={ADJUSTED} />); });
    const toggle = () => tree.root.findAll((n) => n.props.accessibilityLabel === 'How this is worked out' && typeof n.props.onPress === 'function')[0];
    expect(toggle().props.accessibilityState).toEqual({ expanded: false });
    act(() => { toggle().props.onPress(); });
    const open = texts(tree);
    expect(open).toContain(recoveryLearningCopy(ADJUSTED).body);
    expect(open.some((x) => /^For example, quads after 6 sets: about .*, down from .*\.$/.test(x))).toBe(true);
    expect(open).toContain(RECOVERY_SPEED_FOOTER);
    expect(toggle().props.accessibilityState).toEqual({ expanded: true });
    act(() => { toggle().props.onPress(); });
    expect(texts(tree)).not.toContain(RECOVERY_SPEED_FOOTER);
  });

  test('the toggle is at least 48 dp tall', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={ADJUSTED} />); });
    const nodes = tree.root.findAll((n) => n.props.accessibilityLabel === 'How this is worked out');
    const heights = nodes.map((n) => flat(n).minHeight).filter((h) => h != null);
    expect(heights.length).toBeGreaterThan(0);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(48);
  });

  test('a still-learning reading shows the progress and the marker labelled "You, at the first estimate"', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={reading({ pairs: 3, reason: 'too_few' })} />); });
    const shown = texts(tree);
    expect(shown).toContain('Still learning');
    expect(shown).toContain(`3 of ${PERSONAL_MIN_PAIRS} usable so far`);
    // D214 RC-13: the person is ALWAYS placed on the scale; with nothing
    // learned they sit at the first estimate and the label says so.
    expect(shown).toContain('You, at the first estimate');
    expect(shown).not.toContain('You');
    expect(shown).not.toContain('First estimate');
  });

  test('the tick and the marker are always drawn, in ink, and neither is a round thumb (RC-13)', () => {
    for (const personal of [ADJUSTED, reading({ pairs: 25, reason: 'not_clear' }), reading({ pairs: 3, reason: 'too_few' })]) {
      let tree;
      act(() => { tree = create(<RecoveryLearningCard personal={personal} />); });
      const views = tree.root.findAll((n) => n.type === 'View' && n.props.style).map(flat);
      const tick = views.filter((st) => st.position === 'absolute' && st.width === 2 && st.height === 32);
      const marker = views.filter((st) => st.position === 'absolute' && st.width === 6 && st.height === 14);
      expect(tick).toHaveLength(1);
      expect(marker).toHaveLength(1);
      // Ink, never the accent.
      expect(tick[0].backgroundColor).toBe(THEME_COLORS.textMuted);
      expect(marker[0].backgroundColor).toBe(THEME_COLORS.textPrimary);
      // A short block with hairline corners, not a circle.
      expect(marker[0].borderRadius).toBeLessThan(marker[0].width / 2);
    }
  });

  test('an unmoved reading draws the marker over the tick at the same point', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={reading({ pairs: 25, reason: 'not_clear', prior: 1, factor: 1 })} />); });
    const views = tree.root.findAll((n) => n.type === 'View' && n.props.style).map(flat);
    const tick = views.find((st) => st.width === 2 && st.height === 32);
    const marker = views.find((st) => st.width === 6 && st.height === 14);
    expect(tick.left).toBe(marker.left);
  });

  test('no reading renders nothing', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={null} />); });
    expect(tree.toJSON()).toBeNull();
  });
});

// The Recovery by muscle caption's own pin lives with ReadinessCards'
// tests (ReadinessCards.recoveryByMuscle.test.js), which mock its reads.
describe('the estimate says what it is built from (D210)', () => {
  test('a muscle\'s breakdown names the learned speed only once it is in use', () => {
    expect(muscleRecoveryBasisText('time_and_volume')).toBe('Time and sets');
    expect(muscleRecoveryBasisText('time_and_volume', true)).toBe('Time, sets and your recovery speed');
    expect(muscleRecoveryBasisText('time_volume_and_ratings', true)).toBe('Time, sets, your ratings and your recovery speed');
  });
});

describe('source guard', () => {
  test('the card is pure presentation: no database import', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'RecoveryLearningCard.js'), 'utf8');
    expect(src).not.toMatch(/from '\.\.\/lib\/database'|require\('\.\.\/lib\/database'\)/);
    expect(src).toMatch(/export default function RecoveryLearningCard/);
  });

  test('no amber and no round thumb: ink markers, no accent token, no circle helper (D214 plan 7.0 rule 3, RC-13)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'RecoveryLearningCard.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/colors\.(primary|primaryBg|primaryFill|primaryDim|warning)\b/);
    expect(code).not.toMatch(/\bcircle\(/);
  });

  test('describes, never instructs (D204) and carries no em dash', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'RecoveryLearningCard.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(consider|should|you must|try to|make sure|take it easy)\b/i);
    expect(code).not.toMatch(/—/);
  });
});
