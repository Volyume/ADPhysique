import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import Button from '../Button';
import SetEntry from '../SetEntry';

// D43 S1 slice 2 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5, ruled approved under D49): extracted byte-identical out of
// ActiveWorkoutScreen.js. Mirrors the discard/stale modal chrome
// (transparent fade overlay + centred sheet). Hosts the same SetEntry
// component used to log the set, so every exercise type (weight_reps /
// weighted_bodyweight / reps_only / duration / distance) renders the
// correct inputs. Presentational only -- `onSave`/`onDelete` are the
// screen's existing zero-arg `handleSaveEditedSet`/`handleDeleteEditedSet`
// (pinned by ActiveWorkoutScreen.prReEval.guard.test.js, which is
// unaffected: those functions stay in the screen and are only wired down
// as props here), so no engine/db/PR-detection logic moves into this
// component.
export default function EditLoggedSetModal({ visible, reduceMotion, onClose, editValue, onChangeEditValue, units, exerciseType, weightStepKg, onSave, saving, onDelete }) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      {visible ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.editSetKeyboard}
      >
        <View style={[styles.editSetOverlay, live.editSetOverlay]}>
          <View style={[styles.editSetSheet, live.editSetSheet]}>
            <ScrollView
              style={styles.editSetScroll}
              contentContainerStyle={styles.editSetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.editSetTitle, live.editSetTitle]}>Edit set</Text>
              {editValue && (
                <SetEntry
                  value={editValue}
                  onChange={onChangeEditValue}
                  units={units}
                  isWarmup={editValue.setType === 'warmup'}
                  exerciseType={exerciseType}
                  weightStepKg={weightStepKg}
                />
              )}
              <Button
                variant="primary"
                style={[styles.editSetSaveBtn, live.editSetSaveBtn]}
                onPress={onSave}
                disabled={saving}
                title="Save"
                textStyle={[styles.editSetSaveText, live.editSetSaveText]}
                accessibilityLabel="Save set changes"
              />
              <TouchableOpacity
                style={styles.editSetCancelBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing set"
              >
                <Text maxFontSizeMultiplier={1.3} style={[styles.editSetCancelText, live.editSetCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <View style={[styles.editSetDivider, live.editSetDivider]} />
              <TouchableOpacity
                style={styles.editSetDeleteBtn}
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete set"
              >
                <Ionicons name="trash-outline" size={16} color={t.colors.error} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.editSetDeleteText, live.editSetDeleteText]}>Delete set</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

// Frozen base styles, moved verbatim from ActiveWorkoutScreen.js's `styles`
// StyleSheet (D43 S1 slice 2). Exclusive to this component -- nothing else
// in the screen referenced these keys, so nothing stays behind.
const styles = StyleSheet.create({
  editSetKeyboard: { flex: 1 },
  editSetOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  editSetSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, width: '100%', maxHeight: '88%', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  editSetScroll: { flexShrink: 1, minHeight: 0 },
  editSetContent: { padding: spacing.lg, gap: spacing.md },
  editSetTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  editSetSaveBtn: { backgroundColor: colors.primaryFill, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center' },
  editSetSaveText: { ...type.bodyStrong, color: colors.onPrimary },
  editSetCancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  editSetCancelText: { ...type.label, color: colors.textSecondary },
  editSetDivider: { height: 1, backgroundColor: colors.border },
  editSetDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  editSetDeleteText: { ...type.label, color: colors.error },
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
    editSetOverlay: { backgroundColor: t.colors.scrim },
    editSetSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    editSetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    editSetSaveBtn: { backgroundColor: t.colors.primaryFill },
    editSetSaveText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    editSetCancelText: { ...t.type.label, color: t.colors.textSecondary },
    editSetDivider: { backgroundColor: t.colors.border },
    editSetDeleteText: { ...t.type.label, color: t.colors.error },
  };
}
