/**
 * R6 (remediation 2026-07-11, founder defect build 2608): PressableCard's
 * old two-view structure (bare Pressable wrapping an inner Reanimated.View
 * that carried the caller's style) silently discarded every
 * layout-in-parent style a caller passed. The style landed on the inner
 * view while the unstyled outer Pressable, the element the parent actually
 * lays out, shrink-wrapped its content, so in any flex row a `flex: 1`
 * button rendered at text width. That is the class behind the founder's
 * WorkoutSummary photo (a dead band on the footer beside a small Close)
 * and ActiveWorkout's under-width Log set bar, both regressed when those
 * bars adopted <Button> on 2026-07-09 (5d98870).
 *
 * Pins:
 *  1. PressableCard renders ONE animated pressable carrying the caller's
 *     style, so the caller's style IS the element the parent lays out.
 *     The old shape (style on an inner view under an unstyled Pressable)
 *     is banned.
 *  2. The two row-fill dependents the founder photographed keep their
 *     flex: 1 (through Button, which forwards `style` to PressableCard).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import useAppStore from '../../store/useAppStore';
import PressableCard from '../PressableCard';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

// Render-level companion to the source pins below (adversarial-review
// recommendation, 2026-07-11): a future regression could reintroduce an
// inner wrapper without using the banned substrings, so also assert the
// RENDERED tree - the caller's layout style must sit on the outermost
// rendered element (the one the parent lays out), with no styled wrapper
// between it and the children.
describe('PressableCard rendered shape (R6)', () => {
  test("the caller's style lands on the outermost rendered element", () => {
    act(() => { useAppStore.setState({ accessibility: { reduceMotion: true } }); });
    let tree;
    act(() => {
      tree = create(
        <PressableCard onPress={() => {}} style={{ flex: 1 }}>
          <Text>x</Text>
        </PressableCard>
      );
    });
    const flat = (s) => JSON.stringify(s ?? null);
    // Exactly the outermost host element carries flex: 1...
    const styled = tree.root.findAll((n) => typeof n.type === 'string' && flat(n.props.style).includes('"flex":1'));
    expect(styled.length).toBe(1);
    // ...and the text content is its direct descendant with no other
    // styled host view in between.
    let node = tree.root.findByType(Text).parent;
    const betweenStyled = [];
    while (node && node !== styled[0]) {
      if (typeof node.type === 'string' && node.props.style) betweenStyled.push(node.type);
      node = node.parent;
    }
    expect(node).toBe(styled[0]);
    expect(betweenStyled).toEqual([]);
  });
});

describe('PressableCard single-view layout contract (R6)', () => {
  const src = read('components/PressableCard.js');

  test('one animated pressable carries the caller style', () => {
    expect(src).toMatch(/const AnimatedPressable = Reanimated\.createAnimatedComponent\(Pressable\);/);
    expect(src).toMatch(/<AnimatedPressable[\s\S]*style=\{\[style, animatedStyle\]\}/);
  });

  test('the old two-view shape (unstyled Pressable over a styled inner view) stays dead', () => {
    // A plain <Pressable> in the render would re-create the unstyled outer
    // element the parent lays out; the caller's style must never move back
    // to a nested inner view.
    expect(src).not.toMatch(/<Pressable[\s>]/);
    expect(src).not.toMatch(/<Reanimated\.View/);
  });

  test('Button forwards the caller style to PressableCard (the row-fill path)', () => {
    const button = read('components/Button.js');
    expect(button).toMatch(/<PressableCard[\s\S]*style=\{\[\s*styles\.base,/);
  });
});

describe('row-fill dependents keep flex: 1 (founder photo, build 2608)', () => {
  test('WorkoutSummary footer: Close owns the bar', () => {
    const summary = read('screens/WorkoutSummaryScreen.js');
    expect(summary).toMatch(/doneBtn:\s*\{\s*flex:\s*1,/);
  });

  test('ActiveWorkout bottom bar: the primary and advance actions fill the row', () => {
    const screen = read('screens/ActiveWorkoutScreen.js');
    expect(screen).toMatch(/styles\.completeBtn,\s*live\.completeBtn,\s*\{\s*flex:\s*1\s*\}/);
    expect(screen).toMatch(/styles\.extraSetBtnPromoted,\s*live\.extraSetBtnPromoted,\s*\{\s*flex:\s*1\s*\}/);
  });

  // R7 was the same class: SparkCard is a pressable <Card style={styles.
  // sparkCard}> whose flex: 1 was discarded, so the two cards under the
  // Training Load hero shrink-wrapped and the right half of the row
  // rendered empty (the founder's "Progress space below training load
  // half-empty"). The earlier "verified correct in source" claim read the
  // JSX (two-up flex, correct) but missed that the flex never reached the
  // element the row lays out.
  test('Progress spark cards fill the row (founder R7, build 2608)', () => {
    const analytics = read('screens/AnalyticsScreen.js');
    expect(analytics).toMatch(/sparkCard:\s*\{\s*flex:\s*1\s*\}/);
    expect(analytics).toMatch(/<Card\s*\n\s*style=\{styles\.sparkCard\}/);
  });
});
