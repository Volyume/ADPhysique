import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
// Campaign item 14 (D25): zeego native long-press context menu, first
// surface only (logged-set rows). ED-safety bound: workout-only, never
// added to weight/nutrition surfaces.
import * as ContextMenu from 'zeego/context-menu';

import { colors, spacing, radius, fontSize, fontWeight, type, iconSize, withAlpha } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import { calculate1RM } from '../../lib/algorithms';
import { formatPerSide } from '../../lib/unilateral';
import { formatLoggedSet } from '../../lib/workoutHelpers';
import SetEntry from '../SetEntry';
import Button from '../Button';

// D43 S1 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5, ruled approved under D49): extracted byte-identical out of
// ActiveWorkoutScreen.js as the first decomposition slice (zero visual/
// behaviour change). ActiveWorkoutScreen.js keeps `export { LoggedSetRow }`
// as a re-export so existing imports keep working.

/**
 * One already-logged set in the "This workout" list. Display only, no inputs.
 * Pulled out of the screen's render and memoised so the logged-set rows do not
 * re-render on every workout-timer tick (the parent re-renders each second);
 * with stable props React.memo skips them. `progressNum` is the set's position
 * among counting (non-warm-up, non-dropset) sets, computed by the caller.
 */
// Named export (CP-10 stage 3, theming FINAL batch, 2026-07-10): this screen
// as a whole is impractical to mount in a test (SQLite, notifications, Live
// Activity, haptics -- see the guard tests' own header comments), but this
// row is pure presentational props-in/JSX-out, so it is exported purely so
// the live-theme flip contract can be pinned against a real mounted instance
// (see cp10Stage3WorkoutShellsLiveTheme.test.js). No behaviour change.
// D43 S4 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 3.6/5): the modal edit sheet is replaced with in-place editing --
// tapping a row now expands THAT row into a compact inline editor built
// from the same SetEntry primitives used to log, Save/Cancel inline, no
// modal round-trip. `isEditing` + the edit* props below are the whole
// contract; the parent (ActiveWorkoutScreen) owns the single editingSet/
// editValue state and the existing handleSaveEditedSet/handleDeleteEditedSet
// persistence + PR-reeval path completely unchanged -- this component only
// renders the editor, it does not persist anything itself. SetEntry.js
// itself is NOT modified (pinned input contract); this composes with it.
export const LoggedSetRow = React.memo(function LoggedSetRow({
  set, units, progressNum, exerciseType = 'weight_reps', onEdit, onDelete,
  isEditing = false, editValue, onChangeEditValue, onSaveEdit, onCancelEdit, saving = false, weightStepKg,
}) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const isWarmup = set.setType === 'warmup';

  // In-place editor: replaces the row entirely while open. Save/Cancel are
  // the only actions here -- Delete stays reachable only via the long-press
  // zeego menu (onDelete below), which keeps its existing confirm dialog;
  // no duplicate delete affordance is introduced inline.
  if (isEditing) {
    return (
      <View style={[styles.editingWrap, live.editingWrap]}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.editingTitle, live.editingTitle]}>
          {isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`}
        </Text>
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
        <View style={styles.editingActions}>
          <TouchableOpacity
            style={styles.editingCancelBtn}
            onPress={onCancelEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing set"
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.editingCancelText, live.editingCancelText]}>Cancel</Text>
          </TouchableOpacity>
          <Button
            variant="primary"
            size="sm"
            style={styles.editingSaveBtn}
            onPress={onSaveEdit}
            disabled={saving}
            title="Save"
            accessibilityLabel="Save set changes"
          />
        </View>
      </View>
    );
  }

  // Exercise-type aware: a distance/duration/reps_only set must not print
  // "{weight}kg × {reps}" (the weight column holds metres/0 for those) nor an
  // Est. max computed off a non-load value.
  const fmt = formatLoggedSet(set, units, exerciseType);
  const est1RM = (!isWarmup && fmt.showE1RM) ? calculate1RM(set.weight, set.actualReps) : null;
  const perSide = formatPerSide(set.leftReps, set.rightReps);
  const spokenSetLabel = [
    isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`,
    fmt.text,
    perSide,
  ].filter(Boolean).join(': ');
  // Founder defect (2026-07-11): computed once so the SAME array reference
  // is used both on the row and on the ContextMenu.Trigger below. zeego
  // 3.0.6's asChild Trigger (Android AND iOS) does
  // `cloneElement(children, { style, ...props })` -- with no `style` prop of
  // its own that clobbers the row's entire style array to `undefined`,
  // dropping flexDirection: 'row' and stacking the row vertically
  // (photo-verified regression at f1bace6). Passing the identical array as
  // `style` on the Trigger means the clobber re-applies the SAME styling, so
  // the row is correct whether or not zeego clobbers -- deterministic either
  // way, and lossless if zeego ever stops clobbering.
  const rowStyle = [styles.loggedSetRow, live.loggedSetRow, isWarmup && [styles.loggedSetRowWarmup, live.loggedSetRowWarmup]];
  const row = (
    <TouchableOpacity
      style={rowStyle}
      // F7: the row binds its own set so the parent can pass ONE stable
      // handler; an inline closure per row was defeating this memo.
      onPress={() => onEdit(set)}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={spokenSetLabel}
      accessibilityHint="Opens a sheet to change or delete this logged set"
    >
      {isWarmup ? (
        <Ionicons name="flame-outline" size={14} color={t.colors.warning} style={{ width: 22, textAlign: 'center' }} />
      ) : (
        <View style={[styles.setNumBadge, live.setNumBadge]}>
          <Text style={[styles.setNumText, live.setNumText]} maxFontSizeMultiplier={1.3}>{progressNum}</Text>
        </View>
      )}
      <Text maxFontSizeMultiplier={1.3} style={[styles.loggedSetText, live.loggedSetText, isWarmup && [styles.loggedSetTextWarmup, live.loggedSetTextWarmup]]} numberOfLines={1}>
        {fmt.text}
        {perSide ? ` - ${perSide}` : ''}
        {isWarmup ? ' - Warm-up' : ''}
      </Text>
      {!isWarmup && est1RM > 0 && (
        <Text maxFontSizeMultiplier={1.3} style={[styles.loggedEst1RM, live.loggedEst1RM]}>Est. max ~{est1RM.toFixed(0)}{units}</Text>
      )}
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </TouchableOpacity>
  );

  // Campaign item 14 (D25): zeego native long-press menu, first surface
  // (logged sets). Mirrors the row's OWN two existing actions exactly —
  // Edit set (the tap-to-open sheet, unchanged) and Delete set (the sheet's
  // existing delete button, reached via the same confirm-then-remove flow;
  // see ActiveWorkoutScreen's openDeleteFromMenu). No new action invented.
  // `onDelete` is optional so callers that only need the plain row (the
  // cp10Stage3 live-theme pin mounts LoggedSetRow with no onDelete) get
  // byte-identical behaviour with zero menu wrapping.
  if (!onDelete) return row;

  return (
    <ContextMenu.Root>
      {/* `style={rowStyle}` here is NOT decorative -- see rowStyle's comment
          above. zeego's asChild clobber overwrites the cloned row's style
          with whatever the Trigger itself was given, so the Trigger must
          carry the row's own array or the row loses its layout. */}
      <ContextMenu.Trigger action="longPress" asChild style={rowStyle}>
        {row}
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item key="edit-set" onSelect={() => onEdit(set)}>
          <ContextMenu.ItemTitle>Edit set</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key="delete-set" destructive onSelect={() => onDelete(set)}>
          <ContextMenu.ItemTitle>Delete set</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
});

// Frozen base styles, moved verbatim from ActiveWorkoutScreen.js's `styles`
// StyleSheet (D43 S1) -- only the keys LoggedSetRow uses exclusively.
const styles = StyleSheet.create({
  loggedSetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, minHeight: workoutLoggerSize.loggedSetMinHeight, backgroundColor: colors.surface, borderRadius: radius.xs, paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  loggedSetRowWarmup: { borderColor: withAlpha(colors.warning, 0.376), backgroundColor: colors.warningBg || colors.surface },
  loggedSetTextWarmup: { color: colors.warning },
  setNumBadge: { width: workoutLoggerSize.setNumberBadge, height: workoutLoggerSize.setNumberBadge, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  loggedSetText: { ...type.bodySm, flex: 1, color: colors.textPrimary, minWidth: 0 },
  loggedEst1RM: { ...type.caption, color: colors.textMuted },
  // D43 S4: in-place editor block, replaces the modal sheet's chrome with a
  // house Card-adjacent surface local to the row -- same radius/border
  // language as loggedSetRow, no new one-off idiom.
  editingWrap: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.xs, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  editingTitle: { ...type.label, color: colors.textPrimary },
  editingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  editingCancelBtn: { minHeight: workoutLoggerSize.loggedSetMinHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  editingCancelText: { ...type.label, color: colors.textSecondary },
  editingSaveBtn: { minWidth: 96 },
});

// CP-10 stage 3 (theming FINAL batch, 2026-07-10): the same "frozen base +
// live override" map pattern as ActiveWorkoutScreen.js's own buildLiveStyles
// (see that function's header comment for the full rationale), moved
// verbatim (D43 S1) and scoped down to only the keys this component reads --
// every key here mirrors only the colour/fontSize/type-bearing
// sub-properties of the matching frozen style above, at identical rest
// values; pure layout keys (flex/gap/padding/width, no token) are correctly
// omitted, there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    loggedSetRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    loggedSetRowWarmup: { borderColor: withAlpha(t.colors.warning, 0.376), backgroundColor: t.colors.warningBg || t.colors.surface },
    loggedSetTextWarmup: { color: t.colors.warning },
    setNumBadge: { backgroundColor: t.colors.surface2 },
    setNumText: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    loggedSetText: { ...t.type.bodySm, color: t.colors.textPrimary },
    loggedEst1RM: { ...t.type.caption, color: t.colors.textMuted },
    editingWrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    editingTitle: { ...t.type.label, color: t.colors.textPrimary },
    editingCancelText: { ...t.type.label, color: t.colors.textSecondary },
  };
}
