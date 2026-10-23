/**
 * PlanRebuildNoteSheet - D231 (app layout rework, batch 1): the one-time note
 * of what changed after a plan was rebuilt (D219 lane C1b), now opened from the
 * Today line ("Your plan was updated. See what changed.") instead of standing
 * as a card on Today.
 *
 * Presentation only. It shows the note's own title and lines, exactly as the
 * composer wrote them (src/lib/planRebuildNote.js), on the shared BottomSheet.
 * "Got it" calls `onGotIt`, which HomeScreen wires to the same retirement the
 * old card's "Got it" did (dismissPlanRebuildNote). Closing the sheet any other
 * way leaves the note in place for next time.
 *
 * @param {{ visible: boolean, note: ({ title: string, lines: Array<{id: string, text: string}> } | null),
 *   onClose: Function, onGotIt: Function }} props
 */
import { StyleSheet, View } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export default function PlanRebuildNoteSheet({ visible, note, onClose, onGotIt }) {
  const t = useTheme();
  const lines = Array.isArray(note?.lines) ? note.lines : [];
  return (
    <BottomSheet visible={visible && !!note} onClose={onClose} accessibilityLabel={note?.title ?? 'Plan update'}>
      {note ? (
        <>
          <Text style={[styles.title, { color: t.colors.textPrimary }]} accessibilityRole="header">{note.title}</Text>
          <View style={styles.lines}>
            {lines.map((line) => (
              <Text key={line.id} style={[styles.line, { color: t.colors.textSecondary }]}>{line.text}</Text>
            ))}
          </View>
          <Button
            title="Got it"
            onPress={onGotIt}
            accessibilityLabel="Got it. Hides this note for good."
            style={styles.action}
          />
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h3 },
  lines: { gap: spacing.sm, marginTop: spacing.md },
  line: { ...type.bodySm },
  action: { marginTop: spacing.lg },
});
