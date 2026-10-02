/**
 * BlockShapeCard: the sentence under the week dots, in the plan's own form.
 *
 * D214 addendum 9 (census 0.20, K3, K4 and 6.14; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 item 4). The card used to read "Week 2 of 6
 * · Build. Recovery week in 4 weeks." and "Week 5 of 6 · Push. Your hardest
 * week of the block. Recovery week next.": two sentences where the plan has one
 * line, and a claim ("your hardest week") the card cannot make, because the
 * phase word is STRUCTURAL (the first week eases in, the last is recovery, the
 * one before it is the push, the rest build) and is never read from the plan's
 * volumes. This suite pins what replaced them:
 *   - one line, the week, the phase and what comes next, joined by middle dots
 *     and carrying no full stop: "Week 2 of 6 · Build · recovery week in 4 weeks"
 *     and "Week 5 of 6 · Push · recovery week next";
 *   - the countdown still carries its unit noun (D96 C5-P11-07), singular and
 *     plural;
 *   - nothing on any variant calls a week "hardest";
 *   - a finished block says what its sets stay as, in plain words, and a live
 *     recovery week still reads as one.
 * The spoken label of the card is the same line.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import BlockShapeCard from '../BlockShapeCard';

const texts = (tree) =>
  tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
const lineOf = (props) => {
  const tree = create(<BlockShapeCard {...props} />);
  return { tree, line: texts(tree).find((t) => /^Week \d+ of \d+/.test(t)) };
};

describe('the week sentence is one line in the plan\'s own form', () => {
  test('"Week 2 of 6 · Build · recovery week in 4 weeks"', () => {
    const { line } = lineOf({ weekIndex: 2, plannedWeeks: 6 });
    expect(line).toBe('Week 2 of 6 · Build · recovery week in 4 weeks');
  });

  test('the countdown names its unit, and says "next" when the recovery week is the next one', () => {
    expect(lineOf({ weekIndex: 3, plannedWeeks: 6 }).line).toBe('Week 3 of 6 · Build · recovery week in 3 weeks');
    expect(lineOf({ weekIndex: 4, plannedWeeks: 6 }).line).toBe('Week 4 of 6 · Build · recovery week in 2 weeks');
    expect(lineOf({ weekIndex: 5, plannedWeeks: 6 }).line).toBe('Week 5 of 6 · Push · recovery week next');
    expect(lineOf({ weekIndex: 1, plannedWeeks: 6 }).line).toBe('Week 1 of 6 · Ease in · recovery week in 5 weeks');
  });

  test('a five-week block reads the same form: the push is week 4, and a week to go is "next"', () => {
    // One week to the recovery week is always the push (the week before the last), so the
    // push line says "next" and "in 1 week" never prints; the unit noun is pinned below.
    expect(lineOf({ weekIndex: 3, plannedWeeks: 5 }).line).toBe('Week 3 of 5 · Build · recovery week in 2 weeks');
    expect(lineOf({ weekIndex: 4, plannedWeeks: 5 }).line).toBe('Week 4 of 5 · Push · recovery week next');
    expect(lineOf({ weekIndex: 2, plannedWeeks: 5 }).line).toBe('Week 2 of 5 · Build · recovery week in 3 weeks');
  });

  test('no variant calls a week the hardest, and none ends in a full stop', () => {
    for (const weekIndex of [1, 2, 3, 4, 5]) {
      const { line } = lineOf({ weekIndex, plannedWeeks: 6 });
      expect(line).not.toMatch(/hardest|\.$/);
    }
  });

  test('the card\'s spoken label is the same line', () => {
    const { tree } = lineOf({ weekIndex: 5, plannedWeeks: 6 });
    const card = tree.root.findAll((n) => n.props.accessible === true && typeof n.props.accessibilityLabel === 'string')[0];
    expect(card.props.accessibilityLabel).toBe('Week 5 of 6 · Push · recovery week next');
  });
});

describe('the finished and recovery-week lines', () => {
  test('a finished block says what its sets stay as, in plain words', () => {
    const tree = create(<BlockShapeCard weekIndex={6} plannedWeeks={6} isDeload finished />);
    expect(texts(tree)).toContain('Block finished. Sets stay as light as a recovery week until you choose what comes next.');
    expect(texts(tree).join(' | ')).not.toMatch(/recovery-week level/);
  });

  test('a live recovery week still reads as one', () => {
    const tree = create(<BlockShapeCard weekIndex={6} plannedWeeks={6} isDeload />);
    expect(texts(tree)).toContain('Recovery week. Lighter on purpose: fewer sets and easier effort, so fatigue clears before the next block.');
  });
});

describe('the unit noun of the countdown, singular and plural (D96 C5-P11-07), pinned in the source', () => {
  const src = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'BlockShapeCard.js'), 'utf8');
  test('"week" for one, "weeks" otherwise, after the phase word and a middle dot', () => {
    expect(src).toMatch(/· \$\{word\} · recovery week in \$\{weeksToRecovery\} \$\{weeksToRecovery === 1 \? 'week' : 'weeks'\}/);
  });
});
