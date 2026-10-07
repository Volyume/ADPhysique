/**
 * SetRowSheet (workout logger rebuild, lane C2, 12-BUILD-SPEC sections 3 and 4,
 * register D220).
 *
 * Pins the row overflow sheet behind a set row's long-press:
 *   - the house BottomSheet with a title header;
 *   - the note, three ways: editable (a multiline house TextField labelled
 *     "Note for this set" with a Save note button), read-only (plain text under
 *     "Note"), and none (nothing at all when there is no note to show);
 *   - the draft is seeded from `note` each time the sheet opens, a cancelled
 *     draft never returns, and a `note` that changes while open never
 *     overwrites what the person is typing;
 *   - Save note is disabled while the draft equals the saved note, and when it
 *     fires it hands over the trimmed draft ("" clears) and THEN closes;
 *   - "Edit set" and "Delete set" appear only when their handler is given, call
 *     it and THEN close; Delete is in error ink and never confirms itself;
 *   - spoken labels, roles, 48 dp rows, and the token-only source guard.
 *
 * Reduce motion is forced so the BottomSheet mounts synchronously.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Keyboard } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '../../../../styles/theme';

const mockState = { accessibility: { reduceMotion: true } };
jest.mock('../../../../store/useAppStore', () => {
  const useAppStore = (selector) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});
jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import SetRowSheet from '../SetRowSheet';

const hostText = (node) => node.children.map((c) => (typeof c === 'string' ? c : hostText(c))).join('');
const hosts = (tree, kind) => tree.root.findAll((n) => n.type === kind);
const allText = (tree) => hosts(tree, 'Text').map(hostText);
const byTestId = (tree, id) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props.testID === id,
)[0];
const input = (tree) => hosts(tree, 'TextInput')[0];
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));

function sheet(props = {}) {
  return (
    <SetRowSheet
      visible
      title="Set 3 · 70 kg × 8"
      note="Belt on, left knee a touch sore."
      canEditNote
      onSaveNote={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
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

describe('SetRowSheet, rendering', () => {
  test('renders nothing while it is closed', () => {
    expect(render({ visible: false }).toJSON()).toBeNull();
  });

  test('is the house BottomSheet, labelled for the screen reader', () => {
    expect(render().root.findByType(BottomSheetModal).props.accessibilityLabel).toBe('Set options');
  });

  test('the title is a header at the title role', () => {
    const tree = render();
    const title = hosts(tree, 'Text').find((n) => hostText(n) === 'Set 3 · 70 kg × 8');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title.props.style).color).toBe(colors.textPrimary);
    expect(render({ title: 'Next set' }).root.findAll((n) => n.type === 'Text' && hostText(n) === 'Next set')).toHaveLength(1);
  });
});

describe('SetRowSheet, the note', () => {
  test('editable: a multiline field labelled Note for this set, seeded from the note', () => {
    const tree = render();
    const field = input(tree);
    expect(field.props.value).toBe('Belt on, left knee a touch sore.');
    expect(field.props.multiline).toBe(true);
    expect(field.props.placeholder).toBe('Anything worth remembering');
    expect(field.props.accessibilityLabel).toBe('Note for this set');
    expect(allText(tree)).toContain('Note for this set');
    expect(allText(tree)).toContain('Save note');
  });

  test('editable with no note opens an empty field', () => {
    expect(input(render({ note: null })).props.value).toBe('');
    expect(input(render({ note: undefined })).props.value).toBe('');
  });

  test('read-only with a note: plain text under Note, no field, no Save note', () => {
    const tree = render({ canEditNote: false });
    expect(hosts(tree, 'TextInput')).toHaveLength(0);
    expect(byTestId(tree, 'volyume-setrow-sheet-save')).toBeUndefined();
    const text = allText(tree);
    expect(text).toContain('Note');
    expect(text).toContain('Belt on, left knee a touch sore.');
  });

  test('read-only with no note, or a blank one: no note block at all', () => {
    [null, '', undefined].forEach((note) => {
      const tree = render({ canEditNote: false, note });
      expect(hosts(tree, 'TextInput')).toHaveLength(0);
      expect(allText(tree)).not.toContain('Note');
      expect(byTestId(tree, 'volyume-setrow-sheet-note')).toBeUndefined();
    });
  });

  test('typing updates the field', () => {
    const tree = render();
    type(tree, 'New note');
    expect(input(tree).props.value).toBe('New note');
  });
});

describe('SetRowSheet, Save note', () => {
  test('is disabled while the draft equals the saved note, enabled once it differs', () => {
    const tree = render();
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(true);
    type(tree, 'Belt on, left knee a touch sore!');
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(false);
    type(tree, 'Belt on, left knee a touch sore.');
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(true);
  });

  test('with no saved note it is disabled until something is typed', () => {
    const tree = render({ note: null });
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(true);
    type(tree, '   ');
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(true);
    type(tree, 'Slow tempo');
    expect(byTestId(tree, 'volyume-setrow-sheet-save').props.disabled).toBe(false);
  });

  test('hands over the trimmed draft, then closes, and dismisses the keyboard', () => {
    const onSaveNote = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onSaveNote, onClose });
    type(tree, '  Paused at the bottom.\n');
    press(tree, 'volyume-setrow-sheet-save');
    expect(onSaveNote).toHaveBeenCalledTimes(1);
    expect(onSaveNote).toHaveBeenCalledWith('Paused at the bottom.');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaveNote.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  });

  test('an emptied field saves an empty string, which clears the note', () => {
    const onSaveNote = jest.fn();
    const tree = render({ onSaveNote });
    type(tree, '');
    press(tree, 'volyume-setrow-sheet-save');
    expect(onSaveNote).toHaveBeenCalledWith('');
  });

  test('is a labelled primary button', () => {
    const save = byTestId(render(), 'volyume-setrow-sheet-save');
    expect(save.props.accessibilityRole).toBe('button');
    expect(save.props.accessibilityLabel).toBe('Save note for this set');
  });
});

describe('SetRowSheet, the draft across opens', () => {
  test('a cancelled draft does not come back: the next open shows the saved note', () => {
    let tree;
    act(() => { tree = create(sheet({ note: 'Saved note' })); });
    type(tree, 'Half typed and dismissed');
    act(() => tree.update(sheet({ note: 'Saved note', visible: false })));
    expect(tree.toJSON()).toBeNull();
    act(() => tree.update(sheet({ note: 'Saved note', visible: true })));
    expect(input(tree).props.value).toBe('Saved note');
  });

  test('a note changed while the sheet was closed is what opens', () => {
    let tree;
    act(() => { tree = create(sheet({ note: 'Old note', visible: false })); });
    act(() => tree.update(sheet({ note: 'Edited elsewhere', visible: false })));
    act(() => tree.update(sheet({ note: 'Edited elsewhere', visible: true })));
    expect(input(tree).props.value).toBe('Edited elsewhere');
  });

  test('a note that changes while the sheet is open does not overwrite the draft', () => {
    let tree;
    act(() => { tree = create(sheet({ note: 'Saved note' })); });
    type(tree, 'Typing in progress');
    act(() => tree.update(sheet({ note: 'Saved note, echoed back' })));
    expect(input(tree).props.value).toBe('Typing in progress');
  });
});

describe('SetRowSheet, Edit set and Delete set', () => {
  test('Edit set calls onEdit, then onClose', () => {
    const onEdit = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onEdit, onClose });
    press(tree, 'volyume-setrow-sheet-edit');
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  test('Delete set calls onDelete, then onClose, and nothing else', () => {
    const onDelete = jest.fn();
    const onEdit = jest.fn();
    const onSaveNote = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onDelete, onEdit, onSaveNote, onClose });
    press(tree, 'volyume-setrow-sheet-delete');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onSaveNote).not.toHaveBeenCalled();
  });

  test('a row appears only when its handler is given', () => {
    const none = render({ onEdit: undefined, onDelete: undefined });
    expect(allText(none)).not.toContain('Edit set');
    expect(allText(none)).not.toContain('Delete set');
    const onlyEdit = render({ onDelete: undefined });
    expect(allText(onlyEdit)).toContain('Edit set');
    expect(allText(onlyEdit)).not.toContain('Delete set');
    const onlyDelete = render({ onEdit: undefined });
    expect(allText(onlyDelete)).toContain('Delete set');
    expect(allText(onlyDelete)).not.toContain('Edit set');
  });

  test('the rows are 48 dp buttons with spoken labels and an 18 dp Ionicons glyph', () => {
    const tree = render();
    [['volyume-setrow-sheet-edit', 'Edit set', 'create-outline'], ['volyume-setrow-sheet-delete', 'Delete set', 'trash-outline']]
      .forEach(([id, label, glyph]) => {
        const row = byTestId(tree, id);
        expect(row.props.accessibilityRole).toBe('button');
        expect(row.props.accessibilityLabel).toBe(label);
        expect(flat(row.props.style).minHeight).toBe(48);
        const icon = row.findAll((n) => n.type === 'Ionicons')[0];
        expect(icon.props.name).toBe(glyph);
        expect(icon.props.size).toBe(18);
      });
  });

  test('Delete set is in error ink, glyph and label; Edit set is not', () => {
    const tree = render();
    const del = byTestId(tree, 'volyume-setrow-sheet-delete');
    expect(del.findAll((n) => n.type === 'Ionicons')[0].props.color).toBe(colors.error);
    const delLabel = del.findAll((n) => n.type === 'Text')[0];
    expect(flat(delLabel.props.style).color).toBe(colors.error);
    const editLabel = byTestId(tree, 'volyume-setrow-sheet-edit').findAll((n) => n.type === 'Text')[0];
    expect(flat(editLabel.props.style).color).toBe(colors.textPrimary);
  });
});

describe('SetRowSheet, every prop combination renders', () => {
  const notes = [{ canEditNote: true, note: 'x' }, { canEditNote: true, note: null }, { canEditNote: false, note: 'x' }, { canEditNote: false, note: null }];
  const handlers = [
    { onEdit: jest.fn(), onDelete: jest.fn() },
    { onEdit: jest.fn(), onDelete: undefined },
    { onEdit: undefined, onDelete: jest.fn() },
    { onEdit: undefined, onDelete: undefined },
  ];
  test.each(notes.flatMap((n) => handlers.map((h) => [JSON.stringify(n) + Object.keys(h).filter((k) => h[k]).join(), n, h])))(
    '%s', (_name, n, h) => {
      const tree = render({ ...n, ...h });
      expect(tree.toJSON()).not.toBeNull();
    },
  );
});

describe('SetRowSheet source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SetRowSheet.js'), 'utf8');
  test('no hex or rgb literal', () => {
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SRC).not.toMatch(/\brgba?\s*\(/);
  });
  test('no fontSize, fontWeight or letterSpacing property', () => {
    expect(SRC).not.toMatch(/\b(fontSize|fontWeight|letterSpacing)\s*:/);
  });
  test('no em dash', () => {
    expect(SRC).not.toContain(String.fromCharCode(0x2014));
  });
  test('built on the house sheet, with StyleSheet.create as the last statement', () => {
    expect(SRC).toMatch(/from '\.\.\/\.\.\/BottomSheet'/);
    const at = SRC.indexOf('StyleSheet.create(');
    const end = SRC.indexOf('\n});', at);
    expect(SRC.slice(end + '\n});'.length).trim()).toBe('');
  });
  test('no persistence, engine or sync reach', () => {
    expect(SRC).not.toMatch(/lib\/(database|sync|notifications|nutritionEngine|edPatternDetector|wellbeing|weeklyCoach|coachApply|food)\b/);
  });
});
