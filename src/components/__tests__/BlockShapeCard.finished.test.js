/**
 * BlockShapeCard finished state (Stage 1, adaptive mesocycle build,
 * 2026-08-09). A finished block awaiting the user's next-block decision
 * renders the honest "Block finished" line, marks every week done, and
 * never claims a live current week or a live recovery week — on ALL of
 * this card's consumers (call-site pins below), because dropping the
 * `finished` prop at any one of them silently resurrects the false
 * "Recovery week" claim the stage removed.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import BlockShapeCard from '../BlockShapeCard';

const texts = (tree) =>
  tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));

describe('finished rendering', () => {
  test('finished shows the honest line instead of a live-week or recovery-week claim', () => {
    const tree = create(<BlockShapeCard weekIndex={5} plannedWeeks={5} isDeload finished />);
    const all = texts(tree).join(' | ');
    expect(all).toContain('This block is finished. Your targets hold at recovery-week volume until you choose what comes next.');
    expect(all).not.toContain('This is your recovery week');
    expect(all).not.toMatch(/Week \d+ of \d+/);
  });

  test('a live recovery week still reads as one (finished absent)', () => {
    const tree = create(<BlockShapeCard weekIndex={5} plannedWeeks={5} isDeload />);
    expect(texts(tree).join(' | ')).toContain('This is your recovery week. It is lighter on purpose');
  });

  test('finished has no current dot: every week renders as done', () => {
    const tree = create(<BlockShapeCard weekIndex={5} plannedWeeks={5} isDeload finished />);
    // The current dot is the only one with the enlarged 16px frame.
    const enlarged = tree.root
      .findAll((n) => n.type === 'View')
      .filter((n) => [].concat(n.props.style).flat(4).some((s) => s && s.width === 16 && s.height === 16));
    expect(enlarged.length).toBe(0);
  });
});

describe('every consumer threads awaitingDecision into finished', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

  test.each([
    ['components/HomeBlockShapeSheet.js'],
    ['screens/WorkoutSummaryScreen.js'],
    ['screens/ConsistencyScreen.js'],
  ])('%s passes finished={...awaitingDecision} to BlockShapeCard', (rel) => {
    const src = read(rel);
    const cardUse = src.slice(src.indexOf('<BlockShapeCard'));
    expect(cardUse).toMatch(/finished=\{!![^}]*awaitingDecision\}/);
  });

  test('MesocyclePulseCard and BlockProgressCard carry their own finished state', () => {
    expect(read('components/ProgressSections.js')).toMatch(/finished\s*\?\s*'Block finished'/);
    expect(read('components/BlockProgressCard.js')).toMatch(/awaitingDecision\s*\?\s*'Block finished'/);
    expect(read('screens/ConsistencyScreen.js')).toMatch(/finished=\{!!currentMesoWeek\?\.awaitingDecision\}/);
  });

  test("HomeScreen's chip override replaces the readiness line, not decorates it", () => {
    const src = read('screens/HomeScreen.js');
    expect(src).toMatch(/currentMesoWeek\?\.awaitingDecision\s*\n?\s*\?\s*\{ tone: 'go', line: 'This block is finished\./);
  });
});
