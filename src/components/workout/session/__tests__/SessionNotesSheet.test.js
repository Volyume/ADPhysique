/**
 * SessionNotesSheet (workout logger rebuild, lane B2, 12-BUILD-SPEC sections 3
 * and 4).
 *
 * Pins the session note editor behind the toolbar's Notes tool:
 *   - the house BottomSheet with a multiline house TextField seeded from
 *     `value`, a title, and Save and Cancel as house buttons;
 *   - Save hands the draft, trimmed of outer whitespace, to onSave and THEN
 *     calls onClose, so the caller only stores the note; an emptied field
 *     saves "" (that is how a note is cleared);
 *   - Cancel only closes and the draft is dropped: the next open shows the
 *     saved note again, and a note changed while the sheet was closed is what
 *     opens;
 *   - a `value` that changes while the sheet is open never overwrites what the
 *     person is typing;
 *   - the keyboard is dismissed on Save and Cancel; labels are readable.
 *
 * Reduce motion is forced so the BottomSheet mounts synchronously. The field
 * renders through the library's sheet input, which jest maps to a plain
 * TextInput host.
 */
import { create, act } from 'react-test-renderer';
import { Keyboard } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

const mockState = { accessibility: { reduceMotion: true } };
jest.mock('../../../../store/useAppStore', () => {
  const useAppStore = (selector) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});
jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import SessionNotesSheet from '../SessionNotesSheet';

const hostText = (node) => node.children.map((c) => (typeof c === 'string' ? c : hostText(c))).join('');
const hosts = (tree, kind) => tree.root.findAll((n) => n.type === kind);
const allText = (tree) => hosts(tree, 'Text').map(hostText);
const byTestId = (tree, id) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props.testID === id,
)[0];
const input = (tree) => hosts(tree, 'TextInput')[0];

function sheet(props = {}) {
  return (
    <SessionNotesSheet
      visible
      value="Felt strong. Shoulder a little tight."
      onSave={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />
  );
}

function render(props) {
  let tree;
  act(() => { tree = create(sheet(props)); });
  return tree;
}

const type = (tree, text) => act(() => input(tree).props.onChangeText(text));
const press = (tree, id) => act(() => byTestId(tree, id).props.onPress());

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SessionNotesSheet, rendering', () => {
  test('renders nothing while it is closed', () => {
    expect(render({ visible: false }).toJSON()).toBeNull();
  });

  test('is the house BottomSheet, labelled for the screen reader', () => {
    const tree = render();
    expect(tree.root.findByType(BottomSheetModal).props.accessibilityLabel).toBe('Session notes');
  });

  test('shows a header, the saved note in a multiline field, and Save and Cancel', () => {
    const tree = render();
    const text = allText(tree);
    expect(text).toContain('Session notes');
    expect(text).toContain('Save');
    expect(text).toContain('Cancel');
    const field = input(tree);
    expect(field.props.value).toBe('Felt strong. Shoulder a little tight.');
    expect(field.props.multiline).toBe(true);
    expect(field.props.placeholder).toBe('Add notes here');
    expect(field.props.accessibilityLabel).toBe('Session notes');
  });

  test('the title is a header for the screen reader', () => {
    const tree = render();
    const title = hosts(tree, 'Text').find((n) => hostText(n) === 'Session notes');
    expect(title.props.accessibilityRole).toBe('header');
  });

  test('Save and Cancel are buttons with their own labels', () => {
    const tree = render();
    const save = byTestId(tree, 'volyume-notes-sheet-save');
    const cancel = byTestId(tree, 'volyume-notes-sheet-cancel');
    expect(save.props.accessibilityRole).toBe('button');
    expect(save.props.accessibilityLabel).toBe('Save session notes');
    expect(cancel.props.accessibilityRole).toBe('button');
    expect(cancel.props.accessibilityLabel).toBe('Cancel session notes');
  });

  test('a missing note opens an empty field showing the placeholder', () => {
    expect(input(render({ value: null })).props.value).toBe('');
    expect(input(render({ value: undefined })).props.value).toBe('');
  });
});

describe('SessionNotesSheet, Save and Cancel', () => {
  test('typing updates the field', () => {
    const tree = render();
    type(tree, 'New note');
    expect(input(tree).props.value).toBe('New note');
  });

  test('Save hands over the trimmed draft, then closes', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onSave, onClose });
    type(tree, '  Squat felt heavy today.\n');
    press(tree, 'volyume-notes-sheet-save');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Squat felt heavy today.');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  test('Save with the note unchanged still hands it over', () => {
    const onSave = jest.fn();
    const tree = render({ onSave, value: 'Same as before' });
    press(tree, 'volyume-notes-sheet-save');
    expect(onSave).toHaveBeenCalledWith('Same as before');
  });

  test('an emptied field saves an empty string, which clears the note', () => {
    const onSave = jest.fn();
    const tree = render({ onSave });
    type(tree, '');
    press(tree, 'volyume-notes-sheet-save');
    expect(onSave).toHaveBeenCalledWith('');
    const blanks = render({ onSave });
    type(blanks, '   ');
    press(blanks, 'volyume-notes-sheet-save');
    expect(onSave).toHaveBeenLastCalledWith('');
  });

  test('Cancel only closes: it never saves', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onSave, onClose });
    type(tree, 'A thought I will not keep');
    press(tree, 'volyume-notes-sheet-cancel');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  test('the keyboard is dismissed on Save and on Cancel', () => {
    const tree = render();
    press(tree, 'volyume-notes-sheet-save');
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    press(tree, 'volyume-notes-sheet-cancel');
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(2);
  });
});

describe('SessionNotesSheet, the draft across opens', () => {
  test('a cancelled draft does not come back: the next open shows the saved note', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 'Saved note' })); });
    type(tree, 'Half typed and cancelled');
    act(() => tree.update(sheet({ value: 'Saved note', visible: false })));
    expect(tree.toJSON()).toBeNull();
    act(() => tree.update(sheet({ value: 'Saved note', visible: true })));
    expect(input(tree).props.value).toBe('Saved note');
  });

  test('a note changed while the sheet was closed is what opens', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 'Old note', visible: false })); });
    act(() => tree.update(sheet({ value: 'Edited elsewhere', visible: false })));
    act(() => tree.update(sheet({ value: 'Edited elsewhere', visible: true })));
    expect(input(tree).props.value).toBe('Edited elsewhere');
  });

  test('a value that changes while the sheet is open does not overwrite the draft', () => {
    let tree;
    act(() => { tree = create(sheet({ value: 'Saved note' })); });
    type(tree, 'Typing in progress');
    act(() => tree.update(sheet({ value: 'Saved note, echoed back' })));
    expect(input(tree).props.value).toBe('Typing in progress');
  });
});
