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
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import RecoveryLearningCard, {
  recoveryLearningCopy, spokenDuration, learningExampleMuscle, learningExample, scalePosition,
  recoveryLearningA11yLabel, pointLabelPlacement, RECOVERY_SPEED_TITLE, RECOVERY_SPEED_FOOTER,
} from '../RecoveryLearningCard';
import { recoveryHours, REFERENCE_SETS, PERSONAL_MIN_PAIRS } from '../../lib/recovery/constants';
import { muscleRecoveryBasisText } from '../MuscleRecoveryList';

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
    expect(now).toBe('3½ days'); // 72 h x 1.2 = 86.4 h, 3.6 days
    expect(before).toBe('3 days'); // 72 h
    expect(learningExample(personal)).toEqual({
      name: 'Quads',
      sets: REFERENCE_SETS,
      before: '3 days',
      now: '3½ days',
      sentence: `Quads after a ${REFERENCE_SETS}-set session: about 3½ days, up from 3 days.`,
    });
  });

  test('falls back to hours when both round to the same days', () => {
    // Chest: 60 h at the start, 57 h at 0.95: both "2½ days".
    const personal = reading({ factor: 0.95, prior: 1, pairs: 30, reason: 'adjusted', pairsByMuscle: { chest: 30 } });
    expect(learningExample(personal).sentence).toBe(`Chest after a ${REFERENCE_SETS}-set session: about 57 hours, down from 60 hours.`);
    expect(learningExample(personal)).toMatchObject({ before: '60 hours', now: '57 hours' });
  });
});

describe('what the card says, state by state', () => {
  test('faster: what changed, by how much, why, and from how much', () => {
    const copy = recoveryLearningCopy(reading({
      factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 30, chest: 12 },
    }));
    expect(copy.state).toBe('faster');
    expect(copy.headline).toBe('Faster than first estimated');
    expect(copy.body).toBe('Your lifts hold up after short breaks better than the first estimate expected, so each muscle is now estimated to recover about 15% sooner.');
    expect(copy.example.sentence).toMatch(/^Quads after a 6-set session: about .*, down from .*\.$/);
    expect(copy.evidence).toBe('From 42 comparisons of the same lift at the same effort.');
    expect(copy.progress).toBeNull();
  });

  test('slower, measured against a "poor" answer\'s start', () => {
    const copy = recoveryLearningCopy(reading({
      factor: 1.4, prior: 1.15, pairs: 20, reason: 'adjusted', pairsByMuscle: { back: 20 },
    }));
    expect(copy.state).toBe('slower');
    expect(copy.headline).toBe('Slower than first estimated');
    expect(copy.body).toBe('Your lifts drop after short breaks more than the first estimate expected, so each muscle is now estimated to recover about 22% later.');
  });

  test('not clear: in line with the first estimate, with what it is based on', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 25, reason: 'not_clear', pairsByMuscle: { chest: 25 } }));
    expect(copy.state).toBe('steady');
    expect(copy.headline).toBe('In line with the first estimate');
    expect(copy.evidence).toBe('From 25 comparisons of the same lift at the same effort.');
    expect(copy.example).toBeNull();
  });

  test('no spread: says why it cannot learn yet, without telling anyone to change anything', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 16, reason: 'no_spread' }));
    expect(copy.state).toBe('waiting');
    expect(copy.headline).toBe('Not learning yet');
    expect(copy.body).toMatch(/breaks between your sessions have been much the same length/);
  });

  test('too few: how far along it is', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 5, reason: 'too_few' }));
    expect(copy.state).toBe('learning');
    expect(copy.headline).toBe('Still learning');
    expect(copy.progress).toEqual({ done: 5, needed: PERSONAL_MIN_PAIRS });
    expect(copy.evidence).toBeNull();
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
      reading({ pairs: 2, reason: 'too_few' }),
    ].map(recoveryLearningCopy);
    const words = [RECOVERY_SPEED_TITLE, RECOVERY_SPEED_FOOTER, ...all.flatMap((c) => [c.headline, c.body, c.example?.sentence, c.evidence])]
      .filter(Boolean).join(' \n ');
    expect(words).not.toMatch(/—/);
    expect(words).not.toMatch(/factor|pairs?\b|calibrat|algorithm|regression|significan/i);
    // D204: no instruction to train, rest, vary or change anything.
    expect(words).not.toMatch(/\b(you should|try to|make sure|train (more|less)|rest more|take (a|more) rest|vary your|change your)\b/i);
    expect(RECOVERY_SPEED_FOOTER).toMatch(/An estimate, not a measurement\./);
  });
});

describe('the scale', () => {
  test('a marker label is centred on its point, and starts or ends at it near an end, by percentage (right on the first frame)', () => {
    expect(pointLabelPlacement(0.5)).toEqual({ style: { left: '50%', marginLeft: -52 }, textAlign: 'center' });
    expect(pointLabelPlacement(0)).toEqual({ style: { left: '0%', marginLeft: -6 }, textAlign: 'left' });
    expect(pointLabelPlacement(1)).toEqual({ style: { right: '0%', marginRight: -6 }, textAlign: 'right' });
    expect(pointLabelPlacement(0.385).style.left).toBe('38.5%');
  });

  test('the markers sit at the start and at the learned speed, with the span between them', () => {
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
    // start (1.0 -> 38.5%), you (1.4 -> 100%), the span from 38.5% wide 61.5%,
    // and the start label centred at 38.5%.
    expect(lefts).toEqual(expect.arrayContaining(['38.5%', '100%']));
  });

  test('runs from the fastest the learning allows (0) to the slowest (1)', () => {
    expect(scalePosition(0.75)).toBe(0);
    expect(scalePosition(1.4)).toBe(1);
    expect(scalePosition(1)).toBeCloseTo(0.25 / 0.65, 10);
    expect(scalePosition(0.5)).toBe(0);
    expect(scalePosition('x')).toBeNull();
  });
});

describe('rendering', () => {
  const texts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));

  test('an adjusted reading shows the title, the scale ends, both markers\' labels, the words and the evidence', () => {
    let tree;
    act(() => {
      tree = create(<RecoveryLearningCard personal={reading({
        factor: 0.85, prior: 1, pairs: 42, reason: 'adjusted', pairsByMuscle: { quads: 42 },
      })}
      />);
    });
    const shown = texts(tree);
    expect(shown).toEqual(expect.arrayContaining([
      RECOVERY_SPEED_TITLE, 'Faster', 'Slower', 'You', 'First estimate', 'Faster than first estimated',
      'Quads after a 6-set session, estimated',
      'From 42 comparisons of the same lift at the same effort.', RECOVERY_SPEED_FOOTER,
    ]));
    // The two tiles mirror the two markers.
    expect(shown.filter((x) => x === 'First estimate')).toHaveLength(2);
    expect(shown.filter((x) => x === 'You')).toHaveLength(2);
    const card = tree.root.findAll((n) => n.props.accessibilityLabel && String(n.props.accessibilityLabel).startsWith(RECOVERY_SPEED_TITLE))[0];
    expect(card.props.accessibilityLabel).toMatch(/Faster than first estimated/);
  });

  test('a still-learning reading shows the progress, and no "You" marker label', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={reading({ pairs: 3, reason: 'too_few' })} />); });
    const shown = texts(tree);
    expect(shown).toContain('First estimate');
    expect(shown).toContain('Still learning');
    expect(shown).toContain(`3 of ${PERSONAL_MIN_PAIRS} comparisons so far`);
    expect(shown).not.toContain('You');
  });

  test('no reading renders nothing', () => {
    let tree;
    act(() => { tree = create(<RecoveryLearningCard personal={null} />); });
    expect(tree.toJSON()).toBeNull();
  });

  test('the spoken summary reads the headline and the evidence as sentences', () => {
    const copy = recoveryLearningCopy(reading({ pairs: 25, reason: 'not_clear' }));
    expect(recoveryLearningA11yLabel(copy)).toBe(
      'Your recovery speed. In line with the first estimate. Your lifts after shorter and longer breaks do not show a clear difference from it yet, so it stays as it is. From 25 comparisons of the same lift at the same effort.',
    );
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
});
