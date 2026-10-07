/**
 * SessionHeader
 *
 * The session's name and its one note, on the section surface under the
 * toolbar (12-BUILD-SPEC sections 2 and 3, register D220). Tapping the note
 * line calls `onNotes`, which opens the session notes sheet, the same place
 * the toolbar's Notes tool goes.
 *
 * Props
 *   name     the session title, at the h2 role
 *   note     the saved session note; empty, blank or absent shows the
 *            placeholder "Add notes here"
 *   onNotes  called with no arguments
 *
 * The note line is a full 48 dp target (the drawing's line is about 20 dp tall
 * on its own), so the header is a little taller than a bare title plus line.
 * A long note stops at two lines rather than pushing the sheet down.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

// Spec section 2: the note glyph is 18.
const NOTE_GLYPH = 18;
const PLACEHOLDER = 'Add notes here';

export default function SessionHeader({ name, note, onNotes }) {
  const t = useTheme();
  const live = useMemo(() => ({
    wrap: { backgroundColor: t.colors.surface },
    title: { ...t.type.h2, color: t.colors.textPrimary },
    noteText: { ...t.type.bodySm, color: t.colors.textMuted },
  }), [t]);

  const trimmed = typeof note === 'string' ? note.trim() : '';
  const hasNote = trimmed.length > 0;

  return (
    <View style={[styles.wrap, live.wrap]}>
      <Text style={live.title} numberOfLines={2} accessibilityRole="header">
        {name}
      </Text>
      <TouchableOpacity
        style={styles.noteRow}
        onPress={onNotes}
        accessibilityRole="button"
        accessibilityLabel={hasNote ? `Session note: ${trimmed}` : 'Add a session note'}
        accessibilityHint="Opens the session notes"
      >
        <Ionicons name="create-outline" size={NOTE_GLYPH} color={t.colors.textMuted} />
        <Text style={[styles.noteText, live.noteText]} numberOfLines={2}>
          {hasNote ? trimmed : PLACEHOLDER}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  noteRow: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteText: { flex: 1 },
});
