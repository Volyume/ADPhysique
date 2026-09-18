/**
 * HomeBlockShapeSheet reachability (D36a item 17 modal tails, 2026-07-10).
 *
 * Pins that the sheet migrated cleanly off a hand-rolled Modal onto the
 * shared BottomSheet (src/components/BottomSheet.js): it still opens on
 * `visible`, still renders its content (block shape + glossary defns), and
 * "Close" still calls onClose. Reduce-motion is forced via the store mock
 * so BottomSheet mounts/unmounts synchronously (same convention as
 * CancelReasonSheet.test.js).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
// Stage 1 (2026-08-09): the sheet now renders the shared Button for the
// finished-state CTA, which pulls in the haptics module (same mock
// convention as CancelReasonSheet.test.js).
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import HomeBlockShapeSheet from '../HomeBlockShapeSheet';
import { GLOSSARY } from '../../lib/coachGlossary';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  act(() => node.props.onPress());
}

function render(props = {}) {
  const merged = {
    visible: true,
    onClose: jest.fn(),
    currentMesoWeek: { mesoName: 'Hypertrophy block', weekIndex: 2, plannedWeeks: 5, isDeload: false },
    ...props,
  };
  let tree;
  act(() => {
    tree = create(<HomeBlockShapeSheet {...merged} />);
  });
  return { tree, props: merged };
}

describe('HomeBlockShapeSheet', () => {
  test('renders its content when visible', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Your block');
    expect(text).toContain('Hypertrophy block');
    // RE-ANCHORED 2026-09-18 (D192, block sheet): GLOSSARY.deload (three
    // sentences) now renders only its opening fact here, plus one fact
    // line of the sheet's own -- same recovery-week facts, fewer words.
    expect(text).toContain(GLOSSARY.deload.split('. ')[0] + '.');
    expect(text).toContain('Sets logged in the recovery week do not count towards the block');
    // Founder order 2026-09-17: the block sheet does not explain reps in
    // reserve. The gloss and its GLOSSARY entry are gone; pinned as absent.
    expect(text).not.toMatch(/Reps in reserve/);
    expect(GLOSSARY.rir).toBeUndefined();
  });

  // D93 (Campaign 2, Phase 4): the sheet is the block's education surface.
  // It must define what a block IS (the authored gloss, whose only call
  // site is here) and state WHY workload climbs plus what the block
  // teaches the next one - the mental model
  // build -> work harder -> recover -> review -> start from what was learned.
  test('teaches the block mental model: definition, the climb why, and next-block learning', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain(GLOSSARY.mesocycle);
    // RE-ANCHORED 2026-09-18 (D192, block sheet): the five-sentence inline
    // paragraph became three one-line facts (FINISH-SPEC copy rule: no
    // paragraphs, one line each). Same three facts kept -- the climb, the
    // next-block choice with nothing automatic, and next-block learning --
    // in fewer words. The recovery-week clause that used to sit mid-
    // paragraph is dropped from here because the deload line already
    // states it (pinned in the test above).
    expect(text).toMatch(/Each week the effort target steps closer to failure/);
    expect(text).toMatch(/When the block ends you choose what comes next\. Nothing starts on its own/);
    expect(text).toMatch(/How each muscle goes shapes where its sets start next block/);
  });

  test('stays unreachable while not visible', () => {
    const { tree } = render({ visible: false });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Your block');
  });

  test('Close calls onClose', () => {
    const { tree, props } = render();
    pressByLabel(tree, 'Close');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // Stage 1 (2026-08-09): a finished block's chip line names a decision, so
  // the sheet it opens must offer the route to it - and only then.
  test('a finished block offers the Choose your next block CTA and it closes then navigates', () => {
    const onChooseNext = jest.fn();
    const { tree, props } = render({
      currentMesoWeek: { mesoName: 'Hypertrophy block', weekIndex: 5, plannedWeeks: 5, isDeload: true, awaitingDecision: true },
      onChooseNext,
    });
    pressByLabel(tree, 'Choose your next block');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(onChooseNext).toHaveBeenCalledTimes(1);
  });

  test('a live block shows no next-block CTA', () => {
    const { tree } = render({ onChooseNext: jest.fn() });
    const cta = tree.root.findAll((n) => n.props.accessibilityLabel === 'Choose your next block');
    expect(cta.length).toBe(0);
  });
});
