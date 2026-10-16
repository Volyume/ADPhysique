/**
 * ImportHistorySheet, the review, write and summary of "Import food history"
 * (D230 R21, lane 4C).
 *
 * What this suite pins, and why each pin is written to fail:
 *  - REVIEW FIRST. The sheet opens on what the file holds, worded as R21 has
 *    it ("Read 412 rows from 3 March to 14 October. 408 will be added. 4 could
 *    not be read."), with Cancel and Import, and nothing is written until
 *    Import is pressed. Cancel closes and writes nothing.
 *  - THE SUMMARY AFTER. Import writes the plan once and the sheet then says
 *    "408 added. 4 could not be read." with Done.
 *  - REASONS ON TAP. What could not be read is hidden until asked for, then
 *    listed by row, in the review and in the summary.
 *  - A CALM FAILURE. A write that stops part-way says how many went in and
 *    that importing the same file again leaves those days alone; the log line
 *    carries the stage and format only, never a food name or a figure.
 *  - NOTHING TO ADD. Only a Close button, no Import.
 *  - The sheet cannot be dismissed while a write is running.
 *
 * Rendered with react-test-renderer against the real house parts (the
 * @gorhom/bottom-sheet and Reanimated manual mocks are global).
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
const mockWritePlan = jest.fn();
jest.mock('../../../lib/food/importHistoryFlow', () => ({ writePlan: (...a) => mockWritePlan(...a) }));
const mockLogError = jest.fn();
jest.mock('../../../lib/errorLog', () => ({ logError: (...a) => mockLogError(...a), logWarn: jest.fn(), logInfo: jest.fn() }));

import { create, act } from 'react-test-renderer';
import ImportHistorySheet from '../ImportHistorySheet';
import { PROBLEM } from '../../../lib/food/importHistory';

const PLAN = {
  format: 'mfp',
  rowsRead: 412,
  from: '2026-03-03',
  to: '2026-10-14',
  addedRows: 408,
  entries: [],
  customFoods: [],
  existingDays: 0,
  existingDayRows: 0,
  problems: [
    { row: 5, reason: PROBLEM.DATE }, { row: 9, reason: PROBLEM.DATE },
    { row: 40, reason: PROBLEM.CALORIES }, { row: 77, reason: PROBLEM.FIGURE },
  ],
};

function allText(tree) {
  const out = [];
  tree.root.findAll((n) => {
    if (n.type === 'Text') {
      const s = [].concat(n.props.children ?? []).filter((k) => typeof k === 'string' || typeof k === 'number').join('');
      if (s) out.push(s);
    }
    return false;
  });
  return out;
}
const joined = (tree) => allText(tree).join(' | ');
const byTestId = (tree, id) => tree.root.findAll((n) => n.props?.testID === id && typeof n.props.onPress === 'function');
async function press(tree, id) {
  const [node] = byTestId(tree, id);
  expect(node).toBeDefined();
  await act(async () => { await node.props.onPress(); });
}

function mount(props = {}) {
  const onClose = jest.fn();
  let tree;
  act(() => {
    tree = create(<ImportHistorySheet visible userId="u1" plan={PLAN} onClose={onClose} {...props} />);
  });
  return { tree, onClose };
}

beforeEach(() => {
  mockWritePlan.mockReset();
  mockLogError.mockReset();
});

describe('review first', () => {
  test('says what the file holds, before anything is written', () => {
    const { tree } = mount();
    const text = allText(tree);
    expect(text).toEqual(expect.arrayContaining([
      'Import food history',
      'Read 412 rows from 3 March to 14 October.',
      '408 will be added.',
      '4 could not be read.',
    ]));
    expect(byTestId(tree, 'import-history-import').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'import-history-cancel').length).toBeGreaterThan(0);
    expect(mockWritePlan).not.toHaveBeenCalled();
  });

  test('Cancel closes and writes nothing', async () => {
    const { tree, onClose } = mount();
    await press(tree, 'import-history-cancel');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockWritePlan).not.toHaveBeenCalled();
  });

  test('what could not be read is hidden until asked for, then listed by row', async () => {
    const { tree } = mount();
    expect(joined(tree)).not.toMatch(/Rows 5 and 9/);
    await press(tree, 'import-history-reasons-toggle');
    expect(allText(tree)).toEqual(expect.arrayContaining([
      'Rows 5 and 9: the date could not be read.',
      'Row 40: the calories could not be read.',
      'Row 77: a protein, carbohydrate, fat or fibre figure could not be read.',
    ]));
  });
});

describe('import, then the summary', () => {
  test('Import writes the plan once and the sheet says what was added', async () => {
    mockWritePlan.mockResolvedValueOnce({ added: 408, foodsSaved: 0, daysLeft: 0 });
    const { tree, onClose } = mount();
    await press(tree, 'import-history-import');
    expect(mockWritePlan).toHaveBeenCalledTimes(1);
    expect(mockWritePlan.mock.calls[0][0]).toBe('u1');
    expect(mockWritePlan.mock.calls[0][1]).toBe(PLAN);
    expect(allText(tree)).toContain('408 added. 4 could not be read.');
    expect(joined(tree)).not.toMatch(/will be added/);
    expect(byTestId(tree, 'import-history-import')).toHaveLength(0);
    await press(tree, 'import-history-reasons-toggle');
    expect(allText(tree)).toContain('Row 40: the calories could not be read.');
    await press(tree, 'import-history-close');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('while the write runs the sheet shows how far it has got and cannot be dismissed', async () => {
    let finish;
    mockWritePlan.mockImplementationOnce((_u, _p, { onProgress }) => new Promise((resolve) => {
      onProgress(200, 408);
      finish = () => resolve({ added: 408, foodsSaved: 0, daysLeft: 0 });
    }));
    const { tree, onClose } = mount();
    const [importBtn] = byTestId(tree, 'import-history-import');
    act(() => { importBtn.props.onPress(); });
    await act(async () => {});
    expect(allText(tree)).toContain('Adding your history: 200 of 408 so far.');
    const sheet = tree.root.find((n) => n.props?.accessibilityLabel === 'Import food history' && typeof n.props.onClose === 'function');
    act(() => { sheet.props.onClose(); });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(allText(tree)).toContain('408 added. 4 could not be read.');
  });

  test('a failure part-way is said calmly, and the log line carries no food detail', async () => {
    const err = Object.assign(new Error('disk full'), { written: 200, stage: 'entries' });
    mockWritePlan.mockRejectedValueOnce(err);
    const { tree } = mount();
    await press(tree, 'import-history-import');
    expect(allText(tree)).toContain('200 added before a problem stopped the import. Import the same file again and the days already added will be left as they are.');
    expect(mockLogError).toHaveBeenCalledWith('ImportHistory.write', err, { stage: 'entries', format: 'mfp' });
    expect(byTestId(tree, 'import-history-close').length).toBeGreaterThan(0);
  });

  test('a failure before anything went in says so', async () => {
    mockWritePlan.mockRejectedValueOnce(Object.assign(new Error('x'), { written: 0, stage: 'foods' }));
    const { tree } = mount();
    await press(tree, 'import-history-import');
    expect(allText(tree)).toContain('Your food history was not added. Try again in a moment.');
  });
});

test('nothing to add: only Close, no Import', () => {
  const { tree } = mount({
    plan: { ...PLAN, addedRows: 0, rowsRead: 6, existingDays: 3, existingDayRows: 6, problems: [] },
  });
  expect(allText(tree)).toContain('Every day in this file already has food in your diary, so nothing new will be added.');
  expect(byTestId(tree, 'import-history-import')).toHaveLength(0);
  expect(byTestId(tree, 'import-history-close').length).toBeGreaterThan(0);
});
