/**
 * Recovery has its own place in Progress (register D208). Founder,
 * 2026-09-26: "Should we have a place in Progress exclusively for recovery
 * rather than it being hidden behind a button for consistency? Have a think
 * the best way because it looks like a good feature now hard to find."
 *
 * The ruling, previewed to the founder: a Recovery row in the top card on
 * Progress, after the rows already there, opening a Recovery screen that
 * holds the Recovery section exactly as it stood on Consistency, in the same
 * order (the founder's standing order: "The order wasn't to change the order
 * or lead with anything"). Consistency keeps the sessions milestone. The
 * section moved; it was not copied. Each case is written to fail if a link
 * is cut or the order changes.
 *
 * Later the same day the founder changed the order on the Recovery screen:
 * "Move the ratings thing down below the recovery by muscle to the bottom".
 * That replaces the standing order above for this screen; the old single
 * block keeps the ratings first.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const PROGRESS = read('screens/AnalyticsScreen.js');
const CONSISTENCY = read('screens/ConsistencyScreen.js');
const RECOVERY = read('screens/RecoveryScreen.js');
const NAV = read('navigation/RootNavigator.js');
const CARDS = read('components/ReadinessCards.js');

describe('the Recovery row on Progress', () => {
  test('it sits in the top card after the rows that were already there, and opens Recovery', () => {
    const block = PROGRESS.slice(PROGRESS.indexOf('<Card padding="none" surface="surfaceElevated"'), PROGRESS.indexOf('</Card>', PROGRESS.indexOf('<Card padding="none" surface="surfaceElevated"')));
    const training = block.indexOf('label="Training"');
    const body = block.indexOf('label="Body"');
    const photos = block.indexOf('label="Progress photos"');
    const recovery = block.indexOf('label="Recovery"');
    expect(training).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(training);
    expect(photos).toBeGreaterThan(body);
    expect(recovery).toBeGreaterThan(photos);
    expect(block.slice(recovery)).toMatch(/onPress=\{\(\) => navigation\.navigate\('Recovery'\)\}/);
    expect(block.slice(recovery)).toContain('stateText={recoveryCopy.state}');
  });

  test('its lines come from the same estimate the Recovery screen draws', () => {
    expect(PROGRESS).toContain("import { loadMuscleRecovery } from '../lib/recovery/load';");
    expect(PROGRESS).toContain('const recoveryCopy = useMemo(() => buildRecoveryPillarCopy(recoveryLoad), [recoveryLoad]);');
  });
});

describe('the Recovery screen', () => {
  test('it is registered in the Progress stack', () => {
    expect(NAV).toContain("const RecoveryScreen = lazyScreen(() => require('../screens/RecoveryScreen').default);");
    const stack = NAV.slice(NAV.indexOf('function ProgressStack('), NAV.indexOf('function', NAV.indexOf('function ProgressStack(') + 10));
    expect(stack).toContain('<Stack.Screen name="Recovery" component={RecoveryScreen}');
  });

  test('it draws the Recovery section only, under its own title', () => {
    expect(RECOVERY).toContain('<BackHeader title="Recovery" />');
    expect(RECOVERY).toMatch(/<ReadinessCards[\s\S]*sections="recovery"/);
  });

  // RE-ANCHORED under D214 (lane 2, founder ruling Q7 = A): the founder's
  // order of the screen's sections (by muscle, then speed, then ratings,
  // 2026-09-26) is KEPT; what changed is inside the first block, which now
  // leads with the answer line and the next-workout sentence (the separate
  // "Next workout" block is gone, its fact IS the answer line), then the
  // sessions still to do, the figure and the list. The fatigue-trend bars
  // moved in from Consistency (Q3 = A) and sit under the ratings.
  test('the Recovery screen: recovery by muscle (answer line first), the recovery speed, then your ratings at the bottom, with the fatigue trend under them', () => {
    const byMuscle = CARDS.indexOf('Recovery by muscle</Text>');
    const answer = CARDS.indexOf('<Text style={live.answerLine}>{answerLine}</Text>');
    // RE-ANCHORED D214 addendum 9 (V3): the heading is "Still to do this plan week".
    const still = CARDS.indexOf('Still to do this plan week</Text>');
    const figure = CARDS.indexOf('<BodyDiagramHeatmap');
    const list = CARDS.indexOf('<MuscleRecoveryList');
    const speed = CARDS.indexOf('<RecoveryLearningCard personal=');
    const ratingsLast = CARDS.indexOf("{sections === 'recovery' && (slots ? <SkeletonCard height={190} /> : ratingsBlock)}");
    const ratingsFirst = CARDS.indexOf("{sections !== 'recovery' && (slots ? <SkeletonCard height={190} /> : ratingsBlock)}");
    const fatigue = CARDS.indexOf("{sections === 'recovery' ? <FatigueTrendCard sessions={fatigueSessions} /> : null}");
    const trend = CARDS.indexOf('{recoveryTrendInsight && !slots && (');
    expect(byMuscle).toBeGreaterThan(-1);
    // D214 Q7 = A: the answer line leads the block, then the sessions still
    // to do, then the figure, then the list.
    expect(answer).toBeGreaterThan(byMuscle);
    expect(still).toBeGreaterThan(answer);
    expect(figure).toBeGreaterThan(still);
    expect(list).toBeGreaterThan(figure);
    // The founder's order stands: speed after by muscle, ratings last.
    expect(speed).toBeGreaterThan(list);
    expect(ratingsLast).toBeGreaterThan(speed);
    // The separate "Next workout" block is gone (its fact is the answer line).
    expect(CARDS).not.toContain('>Next workout</Text>');
    // The fatigue-trend bars (Q3 = A) sit with the ratings, and the trend
    // sentence stays under them.
    expect(fatigue).toBeGreaterThan(-1);
    expect(trend).toBeGreaterThan(ratingsLast);
    // Only the old single block draws the ratings first.
    expect(ratingsFirst).toBeGreaterThan(-1);
    expect(ratingsFirst).toBeLessThan(byMuscle);
    expect(CARDS).toContain("<SectionLabel>{sections === 'recovery' ? 'Your ratings' : 'Recovery'}</SectionLabel>");
  });

  test('the screen hands its ScrollView to the cards so a figure tap can scroll to a row (RC-12)', () => {
    expect(RECOVERY).toContain('<ScrollView ref={scrollRef}');
    expect(RECOVERY).toContain('scrollRef={scrollRef}');
  });
});

describe('Consistency keeps the milestone, and the section moved rather than being copied', () => {
  test('Consistency draws the milestone only', () => {
    expect(CONSISTENCY).toMatch(/<ReadinessCards[\s\S]{0,80}sections="milestone"/);
    expect(CONSISTENCY).not.toMatch(/<ReadinessCards[\s\S]{0,120}onRateLastSession/);
  });

  test('the milestone and the recovery section each draw under their own mode only', () => {
    // D214 (RC-33): the milestone waits for a workouts read that succeeded, so
    // it never claims "1 to go: First session" before the read lands.
    expect(CARDS).toContain("{sections !== 'recovery' && workoutsRead && (lastUnlocked || next) && (");
    expect(CARDS).toContain("{sections !== 'milestone' && (");
    expect(CARDS).toContain("if (sections === 'milestone') return;");
  });
});
