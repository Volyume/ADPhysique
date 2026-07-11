import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import Button from '../Button';

// D43 S1 slice 2 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5, ruled approved under D49): extracted byte-identical out of
// ActiveWorkoutScreen.js. Presentational only -- `onDiscard` is the exact
// appAlert-confirm-then-discard sequence the screen already ran inline
// (activeWorkout id, endWorkout, navigation.goBack, deleteIncompleteWorkout,
// logError); it stays defined in the screen and is passed down unchanged, so
// no store/db/nav/alert access moves into this component. `onClose` is the
// modal's own onRequestClose (`() => setShowStaleModal(false)`), distinct
// from `onResume`/`onFinish` which each ALSO close the modal as part of
// their own screen-defined behaviour, exactly as today.
export default function StaleWorkoutModal({ visible, reduceMotion, onClose, onResume, onFinish, onDiscard }) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      {visible ? (
      <View style={[styles.staleOverlay, live.staleOverlay]}>
        <View style={[styles.staleSheet, live.staleSheet]}>
          <Ionicons name="time-outline" size={32} color={t.colors.warning} style={{ marginBottom: spacing.md }} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.staleTitle, live.staleTitle]}>Resume workout?</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.staleBody, live.staleBody]}>
            This workout has been inactive for a while. What would you like to do?
          </Text>
          <Button
            variant="primary"
            style={[styles.staleResume, live.staleResume]}
            onPress={onResume}
            title="Resume"
            textStyle={[styles.staleResumeText, live.staleResumeText]}
            accessibilityLabel="Resume workout"
          />
          <Button
            variant="secondary"
            style={[styles.staleFinish, live.staleFinish]}
            onPress={onFinish}
            title="Finish workout"
            textStyle={[styles.staleFinishText, live.staleFinishText]}
          />
          <TouchableOpacity style={styles.staleDiscard} accessibilityRole="button" accessibilityLabel="Discard workout" onPress={onDiscard}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.staleDiscardText, live.staleDiscardText]}>Discard</Text>
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
  staleOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  staleSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxHeight: '88%', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  staleTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  staleBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  staleResume: { width: '100%', backgroundColor: colors.primaryFill, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center' },
  staleResumeText: { ...type.bodyStrong, color: colors.onPrimary },
  staleFinish: { width: '100%', backgroundColor: colors.surface2, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  staleFinishText: { ...type.label, color: colors.textPrimary },
  staleDiscard: { width: '100%', paddingVertical: spacing.md, alignItems: 'center' },
  staleDiscardText: { ...type.label, color: colors.error },
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
    staleOverlay: { backgroundColor: t.colors.scrim },
    staleSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    staleTitle: { ...t.type.h3, color: t.colors.textPrimary },
    staleBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    staleResume: { backgroundColor: t.colors.primaryFill },
    staleResumeText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    staleFinish: { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle },
    staleFinishText: { ...t.type.label, color: t.colors.textPrimary },
    staleDiscardText: { ...t.type.label, color: t.colors.error },
  };
}
