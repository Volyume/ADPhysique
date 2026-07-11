import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import Button from '../Button';

// D43 S1 slice 2 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5, ruled approved under D49): extracted byte-identical out of
// ActiveWorkoutScreen.js. Presentational only -- `onDiscard` is the exact
// async discard sequence (activeWorkout id, endWorkout, navigation.goBack,
// deleteIncompleteWorkout, logError) the screen already ran inline; it stays
// defined in the screen and is passed down unchanged, so no store/db/nav
// access moves into this component. `onClose` covers both the modal's
// onRequestClose and the "Keep training" button, exactly as the single
// `() => setShowDiscardModal(false)` did before the move.
export default function DiscardWorkoutModal({ visible, reduceMotion, onClose, onDiscard }) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      {visible ? (
      <View style={[styles.discardOverlay, live.discardOverlay]}>
        <View style={[styles.discardSheet, live.discardSheet]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.discardTitle, live.discardTitle]}>Discard workout?</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.discardBody, live.discardBody]}>
            This will delete the current workout session. Your plan will not advance.
          </Text>
          <Button
            variant="primary"
            style={[styles.keepTrainingBtn, live.keepTrainingBtn]}
            onPress={onClose}
            accessibilityLabel="Keep training"
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.keepTrainingBtnText, live.keepTrainingBtnText]}>Keep training</Text>
          </Button>
          <TouchableOpacity
            style={styles.discardConfirmBtn}
            accessibilityRole="button"
            accessibilityLabel="Discard workout"
            onPress={onDiscard}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.discardConfirmBtnText, live.discardConfirmBtnText]}>Discard workout</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}
    </Modal>
  );
}

// Frozen base styles, moved verbatim from ActiveWorkoutScreen.js's `styles`
// StyleSheet (D43 S1 slice 2). Exclusive to this component -- nothing else
// in the screen referenced these keys, so nothing stays behind.
const styles = StyleSheet.create({
  discardOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  discardSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxHeight: '88%', gap: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  discardTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  discardBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
  keepTrainingBtn: { backgroundColor: colors.primaryFill, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center' },
  keepTrainingBtnText: { ...type.bodyStrong, color: colors.onPrimary },
  discardConfirmBtn: { alignItems: 'center', paddingVertical: spacing.md },
  discardConfirmBtnText: { ...type.label, color: colors.error },
});

// CP-10 stage 3 (theming FINAL batch, 2026-07-10): the same "frozen base +
// live override" map pattern as ActiveWorkoutScreen.js's own buildLiveStyles
// (see that function's header comment for the full rationale), moved
// verbatim (D43 S1 slice 2) and scoped down to only the keys this component
// reads -- every key here mirrors only the colour/type-bearing
// sub-properties of the matching frozen style above, at identical rest
// values; pure layout keys (flex/gap/padding/width, no token) are correctly
// omitted, there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    discardOverlay: { backgroundColor: t.colors.scrim },
    discardSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    discardTitle: { ...t.type.h3, color: t.colors.textPrimary },
    discardBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    keepTrainingBtn: { backgroundColor: t.colors.primaryFill },
    keepTrainingBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    discardConfirmBtnText: { ...t.type.label, color: t.colors.error },
  };
}
