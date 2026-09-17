import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
// Campaign item 14 (D25): zeego native long-press context menu, first
// surface only (logged-set rows). ED-safety bound: workout-only, never
// added to weight/nutrition surfaces.
import SetRowMenu from './SetRowMenu';

import { colors, spacing, radius, type, iconSize } from '../../styles/theme';
import LedgerRow from '../LedgerRow';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
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
  set, units, progressNum, exerciseType = 'weight_reps', loadSemantics = 'total', onEdit, onDelete,
  isEditing = false, editValue, onChangeEditValue, onSaveEdit, onCancelEdit, onDeleteEdit, saving = false, weightStepKg,
  first = false,
}) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const isWarmup = set.setType === 'warmup';
  // EL-7 (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md):
  // truthful label only, same mechanism as the warm-up suffix below - never
  // a claim about the set's quality, just what kind of set it was.
  const evidenceClass = set.evidenceClass ?? set.evidence_class ?? null;
  const evidenceLabel = evidenceClass === 'circuit_ballistic' ? ' - Circuit, Ballistic'
    : evidenceClass === 'circuit' ? ' - Circuit'
    : evidenceClass === 'ballistic' ? ' - Ballistic'
    : '';
  // F-13 (docs/final-certification-2026-09-05/07-FINDINGS.md, evidence A5):
  // a circuit station logs one working set per ROUND, so "set 3" on this row
  // meant round 3 and said the wrong word. The number itself is unchanged -
  // only what it is called. The truthful " - Circuit" suffix above stays.
  const isCircuitSet = evidenceClass === 'circuit' || evidenceClass === 'circuit_ballistic';
  const unitWord = isCircuitSet ? 'round' : 'set';

  // In-place editor: replaces the row entirely while open. Delete sits on the
  // left (destructive, separated from Save so it is not fat-fingered), with
  // Cancel/Save on the right. `onDeleteEdit` reuses the SAME confirm-then-
  // remove flow as the long-press zeego menu (ActiveWorkoutScreen's
  // handleDeleteEditedSet) -- the menu stays as a shortcut, but Delete is now
  // discoverable where users look for it: by tapping the set they logged by
  // mistake (founder-reported 2026-07-19; the long-press menu alone was
  // invisible). Optional so the plain live-theme mount stays byte-identical.
  if (isEditing) {
    return (
      <View style={[styles.editingWrap, live.editingWrap]}>
        <Text style={[styles.editingTitle, live.editingTitle]}>
          {isWarmup ? 'Edit warm-up set' : `Edit ${unitWord} ${progressNum}`}
        </Text>
        {editValue && (
          <SetEntry
            value={editValue}
            onChange={onChangeEditValue}
            units={units}
            isWarmup={editValue.setType === 'warmup'}
            exerciseType={exerciseType}
            loadSemantics={loadSemantics}
            weightStepKg={weightStepKg}
          />
        )}
        <View style={styles.editingActions}>
          {onDeleteEdit && (
            <TouchableOpacity
              style={styles.editingDeleteBtn}
              onPress={() => onDeleteEdit(set)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Delete this set"
            >
              <Ionicons name="trash-outline" size={iconSize.sm} color={t.colors.error} />
              <Text style={[styles.editingDeleteText, live.editingDeleteText]}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.editingCancelBtn}
            onPress={onCancelEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing set"
          >
            <Text style={[styles.editingCancelText, live.editingCancelText]}>Cancel</Text>
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
  // "{weight}kg × {reps}" (the weight column holds metres/0 for those).
  // Phase 2B (founder ruling, screenshot failure 7): the routine per-set
  // "Est. max ~X" caption is REMOVED from ordinary rows - it repeated on
  // every logged set and read as noise. PR/record detection is untouched;
  // a genuine record still surfaces through the existing PR system.
  const fmt = formatLoggedSet(set, units, exerciseType);
  const perSide = formatPerSide(set.leftReps, set.rightReps);
  const spokenSetLabel = [
    isWarmup ? 'Edit warm-up set' : `Edit ${unitWord} ${progressNum}`,
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
  // `styles.loggedSetRow` is pure layout (flex, gap, minHeight, radius,
  // padding), so it correctly has no buildLiveStyles twin and the `live`
  // reference that used to sit here resolved undefined. The warm-up override
  // beside it DOES carry colour, so it keeps both halves.
  const rowStyle = [styles.loggedSetRow, isWarmup && [styles.loggedSetRowWarmup, live.loggedSetRowWarmup]];
  // D184 (2026-09-17): the at-rest row IS the ledger now. Presentation
  // delegates to LedgerRow, the second signature device of direction D
  // ("every set, everywhere, as hairline-ruled rows of tabular figures");
  // behaviour stays here untouched -- the tap-to-edit TouchableOpacity, the
  // spoken label, the zeego long-press wrap and its rowStyle clobber
  // contract, the in-place editor above, the React.memo. The 22 dp number
  // badge (a mini-card round a figure) is retired for the ledger's bare
  // index column, which is what D173 T2's warm-up dot already assumed.
  //
  // The middle dot is still the warm-up's index mark (D173 T2): it holds the
  // index column so warm-ups line up with numbered rows, and the row's own
  // text still ends " - Warm-up". A warm-up is a quiet DONE line (`muted`),
  // never an "upcoming" one.
  const warmupMark = '\u00B7';
  const primaryLine = `${fmt.text}${perSide ? ` - ${perSide}` : ''}${
    isWarmup ? ' - Warm-up' : (isCircuitSet ? ` - Round ${progressNum}${evidenceLabel}` : evidenceLabel)
  }`;
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
      <LedgerRow
        accessible={false}
        index={isWarmup ? warmupMark : progressNum}
        primary={primaryLine}
        muted={isWarmup}
        first={first}
        style={styles.ledgerLine}
        trailing={<Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />}
      />
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

  // Platform fork (2026-07-12, Sentry VOLYUME-1X): SetRowMenu.js carries the
  // zeego wrap (Android); SetRowMenu.ios.js renders the bare row because the
  // menu's native layer crash-looped iOS at startup. See both files' headers.
  return (
    <SetRowMenu rowStyle={rowStyle} set={set} onEdit={onEdit} onDelete={onDelete}>
      {row}
    </SetRowMenu>
  );
});

// Frozen base styles, moved verbatim from ActiveWorkoutScreen.js's `styles`
// StyleSheet (D43 S1) -- only the keys LoggedSetRow uses exclusively.
const styles = StyleSheet.create({
  // R5 (D66): radius.xs -> radius.md, the logger's one small-surface radius
  // (RestTimer container, noteInput, completeBtn all sit on md; the xs
  // corner was the odd one out in the founder's style-mish-mash walk).
  // Phase 2B (screenshot failure 6): the per-set border/surface card is
  // retired - a completed set is one quiet LINE in the sequence, not a
  // container. Radius kept for the warm-up tint variant below.
  loggedSetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, minHeight: workoutLoggerSize.loggedSetMinHeight, borderRadius: radius.md, paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
  // D173 T2, extended by lead review: the glyph left `warning` but the row it
  // sits in did not, so a warm-up row was a neutral dot inside a yellow wash --
  // inconsistent with itself, and still the state-colour grammar violation the
  // glyph change was made to fix (a warm-up is not a warning). The wash goes
  // (law 2: rows on the canvas) and the text drops to `textMuted`, which is
  // what the ledger wants anyway: a warm-up is a quieter row than a working
  // set. Two non-colour cues survive -- the dot instead of a number, and the
  // row's own " - Warm-up" text -- so nothing depends on the colour alone.
  loggedSetRowWarmup: { backgroundColor: 'transparent' },
  // D184: the ledger line fills the pressable and keeps the LOGGER's density
  // (36 dp, a founder device verdict for active-set stability) rather than
  // the primitive's 48 dp default -- the pressable's own hitSlop carries the
  // target. Palette-invariant, so frozen only. The number badge, its text,
  // the standalone warm-up mark and the row text that used to live here are
  // all drawn by LedgerRow now; their keys are gone from both halves.
  ledgerLine: { flex: 1, minHeight: workoutLoggerSize.loggedSetMinHeight, paddingVertical: 0 },
  // D43 S4: in-place editor block, replaces the modal sheet's chrome with a
  // house Card-adjacent surface local to the row -- same radius/border
  // language as loggedSetRow, no new one-off idiom.
  editingWrap: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  editingTitle: { ...type.label, color: colors.textPrimary },
  editingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  // Destructive Delete on the LEFT of the action row (marginRight:'auto' pushes
  // Cancel/Save to the right), so it can never be next to Save and fat-fingered.
  editingDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: workoutLoggerSize.loggedSetMinHeight, justifyContent: 'center', paddingHorizontal: spacing.sm, marginRight: 'auto' },
  editingDeleteText: { ...type.label, color: colors.error },
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
    loggedSetRowWarmup: { backgroundColor: 'transparent' },
    // D166 part 3: this read `t.colors.border` while the frozen half sets
    // `colors.borderSubtle`. The live half wins at runtime, so the in-place set
    // editor drew the bright control-edge grey that SettingsPrimitives names as
    // "the wireframe look", against its own frozen intent and against the
    // hairline rule Community's layout guard pins. Two writes, thirty lines
    // apart, with nothing comparing them -- the exact drift the double-write
    // pattern makes invisible, which is why new components do not use it.
    editingWrap: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    editingTitle: { ...t.type.label, color: t.colors.textPrimary },
    editingDeleteText: { ...t.type.label, color: t.colors.error },
    editingCancelText: { ...t.type.label, color: t.colors.textSecondary },
  };
}
