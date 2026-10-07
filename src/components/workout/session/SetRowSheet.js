/**
 * SetRowSheet
 *
 * The overflow of one set row, opened by the row's long-press or the ellipsis
 * in its footer (12-BUILD-SPEC section 4: "the row's overflow opens the set
 * note" and "Delete through the row's overflow with the existing confirm",
 * register D220). It is presentational: it owns the note draft while it is open
 * and nothing else, no persistence and no store.
 *
 * Props
 *   visible      controls the sheet (the BottomSheet contract)
 *   onClose      called after Save note, Edit set and Delete set, and by the
 *                backdrop, a swipe down and hardware back
 *   title        the sheet's heading, e.g. "Set 3 · 70 kg × 8" or "Next set"
 *   note         the set's saved note, string or null
 *   canEditNote  true: the note is a multiline field with a Save note button;
 *                false: a saved note shows as plain text under "Note", and no
 *                note shows nothing
 *   onSaveNote   called with the draft trimmed of outer whitespace; "" clears
 *                the note. Save note then calls onClose.
 *   onEdit       optional. When given, the "Edit set" row calls it, then onClose
 *   onDelete     optional. When given, the "Delete set" row (error ink) calls
 *                it, then onClose. The confirm is the screen's, not the sheet's.
 *
 * The draft is seeded from `note` each time the sheet opens, so a half-typed
 * edit never comes back, and a `note` that changes while the sheet is open does
 * not overwrite what the person is typing. Save note stays disabled while the
 * draft equals the saved note. The field is the house multiline TextField, which
 * swaps to the library's own sheet input inside a BottomSheet.
 */

import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from '../../BottomSheet';
import Button from '../../Button';
import TextField from '../../TextField';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const ROW_GLYPH = 18;

export default function SetRowSheet({
  visible,
  onClose,
  title,
  note,
  canEditNote = false,
  onSaveNote,
  onEdit,
  onDelete,
}) {
  const t = useTheme();
  const live = useMemo(() => ({
    title: { ...t.type.title, color: t.colors.textPrimary },
    noteLabel: { ...t.type.captionStrong, color: t.colors.textSecondary },
    noteText: { ...t.type.body, color: t.colors.textPrimary },
    row: { borderBottomColor: t.colors.border },
    rowLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    deleteLabel: { ...t.type.bodyStrong, color: t.colors.error },
  }), [t]);

  const saved = note ?? '';
  const [draft, setDraft] = useState(saved);
  // Reseed the draft on the closed-to-open edge, during render, so the first
  // painted frame of an open sheet already shows the saved note.
  const [wasVisible, setWasVisible] = useState(!!visible);
  if (!!visible !== wasVisible) {
    setWasVisible(!!visible);
    if (visible) setDraft(saved);
  }

  const unchanged = draft.trim() === saved.trim();

  function handleSaveNote() {
    Keyboard.dismiss();
    onSaveNote?.(draft.trim());
    onClose?.();
  }

  function handleEdit() {
    onEdit?.();
    onClose?.();
  }

  function handleDelete() {
    onDelete?.();
    onClose?.();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      accessibilityLabel="Set options"
    >
      <Text style={live.title} accessibilityRole="header">{title}</Text>

      {canEditNote ? (
        <View style={styles.noteBlock}>
          <TextField
            label="Note for this set"
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Anything worth remembering"
            testID="volyume-setrow-sheet-input"
          />
          <Button
            title="Save note"
            variant="primary"
            disabled={unchanged}
            onPress={handleSaveNote}
            accessibilityLabel="Save note for this set"
            testID="volyume-setrow-sheet-save"
          />
        </View>
      ) : saved.length > 0 ? (
        <View style={styles.noteBlock}>
          <Text style={live.noteLabel}>Note</Text>
          <Text style={live.noteText} testID="volyume-setrow-sheet-note">{saved}</Text>
        </View>
      ) : null}

      {onEdit ? (
        <TouchableOpacity
          style={[styles.row, live.row]}
          onPress={handleEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit set"
          testID="volyume-setrow-sheet-edit"
        >
          <Ionicons name="create-outline" size={ROW_GLYPH} color={t.colors.textSecondary} />
          <Text style={live.rowLabel}>Edit set</Text>
        </TouchableOpacity>
      ) : null}
      {onDelete ? (
        <TouchableOpacity
          style={[styles.row, live.row]}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete set"
          testID="volyume-setrow-sheet-delete"
        >
          <Ionicons name="trash-outline" size={ROW_GLYPH} color={t.colors.error} />
          <Text style={live.deleteLabel}>Delete set</Text>
        </TouchableOpacity>
      ) : null}
    </BottomSheet>
  );
}

// Layout only (theme-invariant). Type roles and colours come from the live
// theme above.
const styles = StyleSheet.create({
  noteBlock: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.minimum,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
});
