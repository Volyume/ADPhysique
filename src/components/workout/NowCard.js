/**
 * NowCard (R3 logger rebuild, founder order 2026-07-12)
 *
 * The set being done, as one calm house Card - the redesigned heart of the
 * logger (D43 blueprint section 3.4 + founder rulings 2026-07-12):
 *
 *   Line 1  "Set 2 of 3 · Working · 8-12 reps" - ONE tappable line, the
 *           set-type picker's only entry point (volyume-set-type-btn).
 *   Line 2  at most ONE context line, priority-ordered by the orchestrator
 *           (group-focus flash > warm-up > coach note). The coach note is
 *           plain, CLOSABLE info - an info glyph, the sentence, and a
 *           dismiss X. It never navigates anywhere (the old chevron opened
 *           the exercise form guide; founder-killed).
 *   Prefill one compact "Last: 80kg x 8 - Use" row when history exists;
 *           first-time sessions get a quiet non-tappable target line.
 *   Inputs  the proven SetEntry stepper block, untouched.
 *   Note    a collapsed "Add a note" row that expands into the input. The
 *           old corner pencil was a one-way latch (open only, dead after
 *           its first tap) and is deleted; this row toggles honestly both
 *           ways (volyume-note-row).
 *
 * No beginner education lives in this card - "How logging works" moved to
 * the overflow menu. Behaviour stays in the orchestrator; this component is
 * presentation plus the note-row's own expand/collapse.
 */
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SetEntry from '../SetEntry';
import { spacing, radius, iconSize, withAlpha } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

export default function NowCard({
  // Line 1
  positionLabel,            // "Set 2 of 3 · Working"
  targetRangeLabel = null,  // "8-12 reps" | null
  onPressSetType,
  // Line 2 (exactly one or none):
  // { kind: 'group'|'warmup'|'coach', text, onDismiss? } - only 'coach'
  // carries onDismiss; 'group' is hidden from the a11y tree (the spoken
  // announcement already fired in the orchestrator).
  context = null,
  // Prefill row: { label, valueLabel, onUse } | { label, valueLabel } (no
  // onUse = quiet first-time line) | null
  prefill = null,
  // SetEntry passthrough
  setValue,
  onSetChange,
  units,
  isWarmup = false,
  onSubmitComplete,
  exerciseType,
  weightStepKg,
  // Note row
  noteText,
  onNoteChange,
  // Bump to collapse the note row (exercise switch / set logged).
  noteResetKey,
  // 700ms log-flash + warm-up tint
  flash = false,
}) {
  const t = useTheme();
  const [noteOpen, setNoteOpen] = useState(false);

  // Collapse the note row whenever the orchestrator moves on (set logged,
  // exercise switched) - the same moments it clears noteText.
  useEffect(() => { setNoteOpen(false); }, [noteResetKey]);

  const noteVisible = noteOpen || (noteText ?? '').length > 0;

  const contextIcon = context?.kind === 'group'
    ? 'swap-horizontal'
    : context?.kind === 'warmup'
      ? 'flame-outline'
      : 'pulse-outline';
  const contextColor = context?.kind === 'warmup' ? t.colors.warning : t.colors.primary;

  return (
    <Card
      radius="lg"
      padding="lg"
      style={[
        styles.card,
        isWarmup && { borderColor: withAlpha(t.colors.warning, 0.45) },
        flash && { borderColor: t.colors.primary },
      ]}
    >
      {/* Line 1: position + type + target, one tappable line. */}
      <TouchableOpacity
        testID="volyume-set-type-btn"
        style={styles.positionRow}
        onPress={onPressSetType}
        hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`${positionLabel}${targetRangeLabel ? `, target ${targetRangeLabel}` : ''}, tap to change set type`}
      >
        <Text
          numberOfLines={1}
          style={[styles.positionText, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}
        >
          {positionLabel}
          {targetRangeLabel ? (
            <Text style={{ ...t.type.body, color: t.colors.textSecondary }}>
              {' · '}{targetRangeLabel}
            </Text>
          ) : null}
        </Text>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>

      {/* Line 2: the single context line. */}
      {context ? (
        <View
          style={styles.contextRow}
          accessibilityElementsHidden={context.kind === 'group'}
          importantForAccessibility={context.kind === 'group' ? 'no-hide-descendants' : 'auto'}
        >
          <Ionicons name={contextIcon} size={14} color={contextColor} style={styles.contextIcon} />
          <Text
            style={[styles.contextText, { ...t.type.caption, color: context.kind === 'warmup' ? t.colors.warning : t.colors.textSecondary }]}
            numberOfLines={3}
          >
            {context.text}
          </Text>
          {context.onDismiss ? (
            <TouchableOpacity
              testID="volyume-coach-note-dismiss"
              onPress={context.onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss this note"
            >
              <Ionicons name="close" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Prefill: last time's numbers, one honest tap to use them. */}
      {prefill ? (
        prefill.onUse ? (
          <TouchableOpacity
            style={[styles.prefillRow, { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle }]}
            onPress={prefill.onUse}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`${prefill.label} ${prefill.valueLabel}. Tap to apply.`}
          >
            <Text numberOfLines={1} style={[styles.prefillLabel, { ...t.type.caption, color: t.colors.textSecondary }]}>
              {prefill.label}{' '}
              <Text style={{ ...t.type.num('caption'), color: t.colors.textPrimary }}>
                {prefill.valueLabel}
              </Text>
            </Text>
            <View style={styles.prefillCue}>
              <Ionicons name="arrow-down-circle-outline" size={13} color={t.colors.textSecondary} />
              <Text style={{ ...t.type.caption, color: t.colors.textSecondary }}>Use</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.prefillQuiet} accessible accessibilityLabel={`${prefill.label} ${prefill.valueLabel}`}>
            <Text style={[styles.prefillLabel, { ...t.type.caption, color: t.colors.textMuted }]}>
              {prefill.label}{' '}
              <Text style={{ ...t.type.num('caption'), color: t.colors.textSecondary }}>
                {prefill.valueLabel}
              </Text>
            </Text>
          </View>
        )
      ) : null}

      <SetEntry
        value={setValue}
        onChange={onSetChange}
        units={units}
        isWarmup={isWarmup}
        onSubmitComplete={onSubmitComplete}
        exerciseType={exerciseType}
        weightStepKg={weightStepKg}
      />

      {/* Note: collapsed row, honest toggle both ways. */}
      {noteVisible ? (
        <View style={styles.noteWrap}>
          <TextInput
            style={[styles.noteInput, { backgroundColor: t.colors.surface2, borderColor: t.colors.border, ...t.type.caption, color: t.colors.textPrimary }]}
            value={noteText}
            onChangeText={onNoteChange}
            placeholder="Add a note for this set"
            placeholderTextColor={t.colors.textMuted}
            accessibilityLabel="Note for this set"
            multiline
            autoFocus={noteOpen && (noteText ?? '').length === 0}
            autoComplete="off"
            textContentType="none"
          />
          <TouchableOpacity
            testID="volyume-note-row"
            style={styles.noteToggle}
            onPress={() => { onNoteChange?.(''); setNoteOpen(false); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Remove this note"
          >
            <Ionicons name="close-circle-outline" size={iconSize.sm} color={t.colors.textMuted} />
            <Text style={{ ...t.type.caption, color: t.colors.textMuted }}>Remove note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          testID="volyume-note-row"
          style={styles.noteToggle}
          onPress={() => setNoteOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Add a note for this set"
        >
          <Ionicons name="create-outline" size={iconSize.sm} color={t.colors.textMuted} />
          <Text style={{ ...t.type.caption, color: t.colors.textMuted }}>Add a note</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
  },
  positionText: { flex: 1, minWidth: 0 },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  contextIcon: { marginTop: 2 },
  contextText: { flex: 1, minWidth: 0 },
  prefillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  prefillQuiet: { minHeight: 20, justifyContent: 'center' },
  prefillLabel: { flexShrink: 1 },
  prefillCue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  noteWrap: { gap: spacing.xs },
  noteInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 60,
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 28,
  },
});
