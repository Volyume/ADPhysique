/**
 * SessionToolbar
 *
 * The logger's header is the app's modal chrome (ModalHeader, the header
 * trio in docs/rules/styling.md): the X on the left (Cancel workout), the
 * session name centred at the title role with the elapsed clock as its
 * subtitle, and on the right the house header glyphs: History (for the
 * current exercise) and the amber icon-only Finish (founder order
 * 2026-07-27; an amber action glyph in the modal accessory slot is house
 * precedent, MyRecipesScreen). Nothing else: the session notes and the full
 * rest view are rows on the exercise overflow sheet (D220 addendum 14,
 * founder verdict 2026-10-09: "make it all one language").
 *
 * Presentation only: every action is a callback the screen owns, so the
 * cancel and finish contracts (BEHAVIOURAL-CONTRACT sections 1 and 6) are
 * untouched. Test ids: volyume-workout-close, volyume-workout-finish,
 * volyume-tool-history.
 *
 * Finish stays icon only: the visible word is gone, so the accessibility
 * label "Finish workout" is the whole name of the control and must not be
 * shortened. `finishBusy` swaps the glyph for a spinner and disables the
 * control while the finish is being saved.
 */
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import ModalHeader from '../../ModalHeader';
import HeaderGlyph from '../../community/HeaderGlyph';
import SessionClock from './SessionClock';
import { iconSize, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

export default function SessionToolbar({
  title,
  startTime,
  onClose,
  onHistory,
  onFinish,
  finishBusy = false,
}) {
  const t = useTheme();
  const busy = !!finishBusy;

  return (
    <ModalHeader
      title={title}
      subtitle={startTime ? <SessionClock startTime={startTime} /> : null}
      onClose={onClose}
      closePosition="left"
      closeLabel="Cancel workout"
      closeTestID="volyume-workout-close"
      balanced
      rightAccessory={(
        <View style={styles.glyphs}>
          {onHistory ? (
            <HeaderGlyph
              testID="volyume-tool-history"
              icon="stats-chart-outline"
              label="History and records for the current exercise"
              onPress={onHistory}
            />
          ) : null}
          <TouchableOpacity
            testID="volyume-workout-finish"
            style={styles.finish}
            onPress={onFinish}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
            accessibilityState={{ busy, disabled: busy }}
          >
            {busy ? (
              <ActivityIndicator color={t.colors.primary} />
            ) : (
              <Ionicons name="checkmark-done" size={iconSize.lg} color={t.colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  glyphs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  finish: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
