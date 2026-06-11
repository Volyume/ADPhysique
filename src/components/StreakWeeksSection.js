// COMP-018 — "Your weeks", the deep home of the weekly consistency streak on
// ConsistencyScreen. Renders the run number, a 12-week glyph strip (CVD-safe:
// shape differs per state, no red, no cross), "Longest run", the Pause control
// and — for plan-less users — the weekly-goal editor.
//
// It reads the same useWeeklyStreak resolver the Progress strip uses, so the
// two never disagree. Under an open ED/wellbeing flag the whole section is
// absent (the resolver reports suppressed) — a visible streak artefact is a
// pressure cue for that population (§4.5). Copy is blueprint copy (§4.6),
// founder review at PR. The word "streak" never appears; the unit is
// "weeks running".
import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import useWeeklyStreak from '../hooks/useWeeklyStreak';
import { addPause, setManualGoal } from '../lib/streakState';
import { track } from '../lib/engineTelemetry';
import * as haptics from '../lib/haptics';

const PAUSE_OPTIONS = [
  { label: 'This week', weeks: 1 },
  { label: '2 weeks', weeks: 2 },
  { label: '4 weeks', weeks: 4 },
  { label: '8 weeks', weeks: 8 },
];

// Per-state glyph (shape carries the meaning — no colour-only state, no red).
const GLYPH = {
  kept:          { icon: 'ellipse',          color: colors.primary },
  resting:       { icon: 'moon',             color: colors.success },
  paused:        { icon: 'pause-circle',     color: colors.textMuted },
  repaired:      { icon: 'git-compare',      color: colors.primary },
  missed:        { icon: 'ellipse-outline',  color: colors.border },
  'in-progress': { icon: 'ellipse-outline',  color: colors.primary },
};

function strength(weeks, key) {
  return weeks.filter(w => w.state === key).length;
}

export default function StreakWeeksSection({ userId, scoffScore = 0 }) {
  const vm = useWeeklyStreak(userId, scoffScore);
  const [pauseOpen, setPauseOpen] = useState(false);

  // Hide entirely under suppression or before any training (§4.5 / empty user).
  if (!vm || !vm.render || vm.suppressed) return null;

  const { weeks = [], runLength, current, hasTarget, longestRun = 0, currentWeekKey } = vm;
  const isResting = current?.state === 'resting';
  const isPaused = current?.state === 'paused';
  const completed = current?.completed ?? 0;
  const target = current?.target ?? null;

  // Headline run line.
  let runLine;
  if (isPaused) runLine = 'Paused. Pick it up again whenever you\'re ready.';
  else if (isResting) runLine = 'Recovery week. Your run carries on.';
  else if (Number.isFinite(runLength) && runLength >= 1) runLine = `${runLength} ${runLength === 1 ? 'week' : 'weeks'} running`;
  else if (hasTarget && Number.isFinite(target)) runLine = `${completed} of ${target} sessions this week`;
  else runLine = `${completed} session${completed === 1 ? '' : 's'} this week`;

  // Text equivalent of the glyph strip for screen readers.
  const parts = [];
  const k = strength(weeks, 'kept'); if (k) parts.push(`${k} kept`);
  const r = strength(weeks, 'resting'); if (r) parts.push(`${r} recovery`);
  const c = strength(weeks, 'repaired'); if (c) parts.push(`${c} covered`);
  const p = strength(weeks, 'paused'); if (p) parts.push(`${p} paused`);
  const stripA11y = `Last ${weeks.length} weeks: ${parts.join(', ') || 'getting started'}.`;

  async function doPause(w) {
    setPauseOpen(false);
    if (!userId || !currentWeekKey) return;
    await addPause(userId, currentWeekKey, w);
    try { track(userId, 'streak_paused', { weeks: w })?.catch?.(() => {}); } catch (_) {}
    haptics.commit();
    vm.reload?.();
  }

  async function setGoal(n) {
    if (!userId) return;
    await setManualGoal(userId, n);
    haptics.selection();
    vm.reload?.();
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your weeks</Text>
        <Text style={styles.runLine} numberOfLines={2}>{runLine}</Text>
      </View>

      {/* 12-week glyph strip */}
      <View style={styles.strip} accessible accessibilityLabel={stripA11y}>
        {weeks.map((w) => {
          const g = GLYPH[w.state] || GLYPH.missed;
          return <Ionicons key={w.weekKey} name={g.icon} size={16} color={g.color} style={styles.glyph} />;
        })}
      </View>

      {longestRun > 0 ? (
        <Text style={styles.longest}>Longest run: {longestRun} {longestRun === 1 ? 'week' : 'weeks'}.</Text>
      ) : null}

      {/* Manual-goal editor — plan-less users only */}
      {!hasTarget ? (
        <View style={styles.goalBlock}>
          <Text style={styles.goalLabel}>How many sessions a week are you aiming for?</Text>
          <View style={styles.goalChips}>
            {[1, 2, 3, 4, 5, 6].map(n => {
              const sel = vm.manualGoal === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.goalChip, sel && styles.goalChipOn]}
                  onPress={() => setGoal(n)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${n} sessions a week`}
                >
                  <Text style={[styles.goalChipText, sel && styles.goalChipTextOn]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.pauseBtn}
        onPress={() => setPauseOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Pause your run"
      >
        <Ionicons name="pause-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.pauseBtnText}>Pause</Text>
      </TouchableOpacity>

      <Modal visible={pauseOpen} transparent animationType="fade" onRequestClose={() => setPauseOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPauseOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Life happens. Pause your run and nothing is lost.</Text>
          {PAUSE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.weeks}
              style={styles.sheetOption}
              onPress={() => doPause(opt.weeks)}
              accessibilityRole="button"
              accessibilityLabel={`Pause for ${opt.label}`}
            >
              <Text style={styles.sheetOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  title: { ...type.label, color: colors.textSecondary },
  runLine: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  glyph: { marginRight: 2 },
  longest: { fontSize: fontSize.xs, color: colors.textMuted },
  goalBlock: { gap: spacing.sm, marginTop: spacing.xs },
  goalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  goalChips: { flexDirection: 'row', gap: spacing.sm },
  goalChip: {
    width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  goalChipOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) },
  goalChipText: { ...type.num('body'), color: colors.textSecondary },
  goalChipTextOn: { color: colors.primary },
  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 44, marginTop: spacing.xs,
  },
  pauseBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: withAlpha(colors.background, 0.6) },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, gap: spacing.sm,
  },
  sheetTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetOption: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, minHeight: 48, justifyContent: 'center',
  },
  sheetOptionText: { fontSize: fontSize.md, color: colors.textPrimary },
});
