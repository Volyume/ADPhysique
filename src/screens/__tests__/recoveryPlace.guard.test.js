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

  test('the section keeps its order: your ratings, then recovery by muscle, then the next workout', () => {
    const ratings = CARDS.indexOf("<SectionLabel>{sections === 'recovery' ? 'Your ratings' : 'Recovery'}</SectionLabel>");
    const byMuscle = CARDS.indexOf('Recovery by muscle</Text>');
    const next = CARDS.indexOf('>Next workout</Text>');
    expect(ratings).toBeGreaterThan(-1);
    expect(byMuscle).toBeGreaterThan(ratings);
    expect(next).toBeGreaterThan(byMuscle);
  });
});

describe('Consistency keeps the milestone, and the section moved rather than being copied', () => {
  test('Consistency draws the milestone only', () => {
    expect(CONSISTENCY).toMatch(/<ReadinessCards[\s\S]{0,80}sections="milestone"/);
    expect(CONSISTENCY).not.toMatch(/<ReadinessCards[\s\S]{0,120}onRateLastSession/);
  });

  test('the milestone and the recovery section each draw under their own mode only', () => {
    expect(CARDS).toContain("{sections !== 'recovery' && (lastUnlocked || next) && (");
    expect(CARDS).toContain("{sections !== 'milestone' && (");
    expect(CARDS).toContain("if (sections === 'milestone') return;");
  });
});
