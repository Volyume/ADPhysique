/**
 * SessionHeader
 *
 * The session's name and, when one is written, its note, on the page under
 * the toolbar (12-BUILD-SPEC sections 2 and 3, register D220). Tapping the
 * note calls `onNotes`, which opens the session notes sheet, the same place
 * the toolbar's Notes tool goes; the toolbar tool is the ONE way to add a
 * note (founder device verdict 2026-10-08: no second note control here).
 *
 * Props
 *   name     the session title, at the title role (semibold)
 *   note     the saved session note; empty, blank or absent shows nothing
 *   onNotes  called with no arguments
 *
 * The note line is a full 48 dp target (the drawing's line is about 20 dp tall
 * on its own), so the header is a little taller than a bare title plus line.
 * A long note stops at two lines rather than pushing the sheet down.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';


export default function SessionHeader({ name, note, onNotes }) {
  const t = useTheme();
  const live = useMemo(() => ({
    // The session name is a label over the cards, not a page heading
    // (founder render verdict 2026-10-09: h2 was too big).
    title: { ...t.type.w(t.type.title, 'semibold'), color: t.colors.textPrimary },
    noteText: { ...t.type.bodySm, color: t.colors.textMuted },
  }), [t]);

  const trimmed = typeof note === 'string' ? note.trim() : '';
  const hasNote = trimmed.length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={live.title} numberOfLines={2} accessibilityRole="header">
        {name}
      </Text>
      {/* Founder device verdict 2026-10-08: the "Add notes here" control under
          the title sat out of place beside the toolbar's Notes tool, which is
          the one way in. A note already written still shows here, quietly,
          and tapping it opens the same sheet. */}
      {hasNote ? (
        <TouchableOpacity
          style={styles.noteRow}
          onPress={onNotes}
          accessibilityRole="button"
          accessibilityLabel={`Session note: ${trimmed}`}
          accessibilityHint="Opens the session notes"
        >
          <Text style={[styles.noteText, live.noteText]} numberOfLines={2}>{trimmed}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  noteRow: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteText: { flex: 1 },
});
