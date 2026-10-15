/**
 * The exercise More sheet's "Record a video of this set" row (D229 addendum 5
 * and the founder's additions of 2026-10-15). Rendered through the real
 * SessionSheets with the overflow sheet open.
 * Pins:
 *   - the row sits AFTER "Use last session" and BEFORE "Pair as superset", in
 *     the same sheet-option row part as its neighbours, with the videocam icon;
 *   - its label is the plain "Record a video of this set" (and so is its
 *     accessibility label), and its second line follows the count (none, 1, 2, 3);
 *   - it is HIDDEN unless usePhotoSuppression has answered an explicit false:
 *     calm mode / an open flag (true), the starting state, and any value that is
 *     not false (undefined, null) all hide it, with no explanation in its place;
 *   - tapping it closes the sheet and hands over to the clip handler once.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../../../lib/haptics', () => ({
  selection: jest.fn(), press: jest.fn(), commit: jest.fn(), setLogged: jest.fn(),
}));
jest.mock('../../../AppAlert', () => ({ appAlert: jest.fn() }));

import SessionSheets from '../SessionSheets';
import { buildSheetProps } from './sessionSheetsProps.helper';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'SessionSheets.js'), 'utf8');

function render(extra = {}) {
  let tree;
  act(() => { tree = create(<SessionSheets {...buildSheetProps()} {...extra} />); });
  return tree;
}

// Host nodes only: the touchable mock renders a wrapper and a host per row.
const labels = (tree) => tree.root
  .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && typeof n.props.onPress === 'function')
  .map((n) => n.props.accessibilityLabel);

describe('the Record a video of this set row', () => {
  test('is shown once usePhotoSuppression has said false, in the ruled place: after Use last session, before Pair as superset', () => {
    const tree = render({ clipsSuppressed: false, clipCount: 0 });
    const all = labels(tree);
    const clip = all.indexOf('Record a video of this set');
    expect(clip).toBeGreaterThan(-1);
    expect(all.indexOf('Use last session')).toBeGreaterThan(-1);
    expect(all.indexOf('Use last session')).toBeLessThan(clip);
    expect(clip).toBeLessThan(all.findIndex((l) => /superset/i.test(l)));
    expect(all.filter((l) => l === 'Record a video of this set')).toHaveLength(1);
  });

  test('uses the same sheet-option row part as its neighbours, with the videocam icon', () => {
    const tree = render({ clipsSuppressed: false, clipCount: 0 });
    const touchables = (label) => tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
    const clipRow = touchables('Record a video of this set');
    const neighbour = touchables('Use last session');
    expect(clipRow.props.style).toEqual(neighbour.props.style);
    expect(clipRow.props.accessibilityRole).toBe('button');
    const icons = clipRow.findAll((n) => n.props.name === 'videocam-outline');
    expect(icons.length).toBeGreaterThan(0);
  });

  test.each([
    [0, 'Up to 15 seconds, no sound. Shared from the summary afterwards.'],
    [1, '1 saved. Up to 3 for each workout.'],
    [2, '2 saved. Up to 3 for each workout.'],
    [3, '3 saved, the most for one workout.'],
  ])('with %i clips saved the second line reads "%s"', (clipCount, line) => {
    const json = JSON.stringify(render({ clipsSuppressed: false, clipCount }).toJSON());
    expect(json).toContain('Record a video of this set');
    expect(json).toContain(line);
  });

  test.each([
    ['calm mode or an open flag (true)', true],
    ['not yet known (undefined)', undefined],
    ['not yet known (null)', null],
  ])('is hidden, with nothing in its place, when suppression is %s', (_name, clipsSuppressed) => {
    const tree = render({ clipsSuppressed, clipCount: 2 });
    const json = JSON.stringify(tree.toJSON());
    expect(labels(tree)).not.toContain('Record a video of this set');
    expect(json).not.toContain('Record a video');
    expect(json).not.toContain('saved. Up to 3');
    // The neighbours are untouched.
    expect(labels(tree)).toContain('Use last session');
  });

  test('tapping it closes the sheet and starts the clip flow once', () => {
    const setShowOverflow = jest.fn();
    const handleRecordClip = jest.fn();
    const tree = render({ clipsSuppressed: false, clipCount: 0, setShowOverflow, handleRecordClip });
    const row = tree.root.findAll((n) => n.props.accessibilityLabel === 'Record a video of this set' && typeof n.props.onPress === 'function')[0];
    act(() => row.props.onPress());
    expect(setShowOverflow).toHaveBeenCalledWith(false);
    expect(handleRecordClip).toHaveBeenCalledTimes(1);
  });

  test('source: fail closed, only an explicit false shows it', () => {
    expect(SOURCE).toMatch(/\{clipsSuppressed === false && \(/);
    expect(SOURCE).toMatch(/import \{ CLIP_STRINGS, clipRowDescription \} from '\.\.\/\.\.\/\.\.\/lib\/clips\/rules';/);
  });
});
