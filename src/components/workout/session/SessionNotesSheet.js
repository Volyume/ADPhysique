/**
 * SessionNotesSheet
 *
 * Edits the one note on a whole session, opened by the Notes tool in the
 * session toolbar and by the note line under the session title
 * (12-BUILD-SPEC sections 3 and 4, register D220). It is a dumb editor: it owns
 * the draft while it is open and nothing else, no persistence and no store.
 *
 * Props
 *   visible  controls the sheet (the BottomSheet contract)
 *   value    the saved note, "" or null for none
 *   onSave   called with the draft trimmed of outer whitespace; "" means the
 *            person cleared the note
 *   onClose  called after Save, by Cancel, and by the backdrop, a swipe down
 *            and hardware back
 *
 * Save calls onSave and then onClose, so the caller only has to store the note
 * and flip its own visible flag. Cancel only calls onClose and drops the draft.
 *
 * The draft is seeded from `value` each time the sheet opens, so a cancelled
 * edit never comes back and a note changed elsewhere is what opens next. A
 * `value` that changes while the sheet is open does not overwrite what the
 * person is typing. The field is the house multiline TextField, which swaps to
 * the library's own sheet input inside a BottomSheet (the Android keyboard
 * fix, TextField.js).
 */

import { useMemo, useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import Text from '../../Text';
import BottomSheet from '../../BottomSheet';
import Button from '../../Button';
import TextField from '../../TextField';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';

export default function SessionNotesSheet({ visible, value, onSave, onClose }) {
  const t = useTheme();
  const live = useMemo(() => ({
    title: { ...t.type.title, color: t.colors.textPrimary },
  }), [t]);

  const [draft, setDraft] = useState(value ?? '');
  // Reseed the draft on the closed-to-open edge, during render, so the first
  // painted frame of an open sheet already shows the saved note.
  const [wasVisible, setWasVisible] = useState(!!visible);
  if (!!visible !== wasVisible) {
    setWasVisible(!!visible);
    if (visible) setDraft(value ?? '');
  }

  function handleSave() {
    Keyboard.dismiss();
    onSave?.(draft.trim());
    onClose?.();
  }

  function handleCancel() {
    Keyboard.dismiss();
    onClose?.();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      accessibilityLabel="Session notes"
    >
      <Text style={live.title} accessibilityRole="header">Session notes</Text>
      <TextField
        value={draft}
        onChangeText={setDraft}
        multiline
        placeholder="Add notes here"
        accessibilityLabel="Session notes"
        testID="volyume-notes-sheet-input"
      />
      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="secondary"
          fullWidth={false}
          style={styles.action}
          onPress={handleCancel}
          accessibilityLabel="Cancel session notes"
          testID="volyume-notes-sheet-cancel"
        />
        <Button
          title="Save"
          fullWidth={false}
          style={styles.action}
          onPress={handleSave}
          accessibilityLabel="Save session notes"
          testID="volyume-notes-sheet-save"
        />
      </View>
    </BottomSheet>
  );
}

// Layout only (theme-invariant). The title's type role and colour come from
// the live theme above.
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
