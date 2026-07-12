// COMP-018, "Your weeks", the deep home of the weekly consistency streak on
// ConsistencyScreen. Renders the run number, a 12-week glyph strip (CVD-safe:
// shape differs per state, no red, no cross), "Longest run", the Pause control
// and, for plan-less users, the weekly-goal editor.
//
// It reads the same useWeeklyStreak resolver the Progress strip uses, so the
// two never disagree. Under an open ED/wellbeing flag the whole section is
// absent (the resolver reports suppressed), a visible streak artefact is a
// pressure cue for that population (§4.5). Copy is blueprint copy (§4.6),
// founder review at PR. The word "streak" never appears; the unit is
// "weeks running".
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BottomSheet from './BottomSheet';
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

// Per-state glyph (shape carries the meaning, no colour-only state, no red).
// D4 (founder decision, updated 2026-07-03): the 'missed' glyph now carries a
// calm on-screen label ("Quiet week") in the key, so the mark is not a mystery
// to sighted users. This supersedes the earlier same-day note that left it off
// the key. The no-shame rule is kept in the WORDING and the shape: never
// "missed" or "failed", never red; the glyph stays a faint outline. Screen
// readers already hear it as a "quiet week" via stripA11y.
// CP-10 theming batch (component sweep, 2026-07-10): build function replacing
// the frozen module-scope GLYPH map, same "build" pattern as WeightTrendCard's
// buildDotColour -- resolves the SAME state -> icon/colour mapping off the
// passed-in live t.colors instead of the frozen colors singleton, so the
// glyph strip stays in step with a theme flip. No frozen twin kept: GLYPH was
// file-private and untested.
function buildGlyph(c) {
  return {
    kept:          { icon: 'ellipse',          color: c.primary },
    resting:       { icon: 'moon',             color: c.success },
    paused:        { icon: 'pause-circle',     color: c.textMuted },
    repaired:      { icon: 'git-compare',      color: c.primary },
    missed:        { icon: 'ellipse-outline',  color: c.border },
    'in-progress': { icon: 'ellipse-outline',  color: c.primary },
  };
}

function strength(weeks, key) {
  return weeks.filter(w => w.state === key).length;
}

export default function StreakWeeksSection({ userId, scoffScore = 0 }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const GLYPH = buildGlyph(t.colors);
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

  // D2: surface the otherwise-silent streak repair. A 'repaired' week is, by
  // the engine's bridge rule, always followed by a keeping week (the comeback),
  // so the comeback has just landed exactly when the second-to-last FINISHED
  // week is 'repaired'. A calm, forgiving line, never shame, and it self-
  // expires within a week as the next week finishes and rolls the strip on.
  const finishedWeeks = weeks.filter(w => w.state !== 'in-progress');
  const justRepaired = finishedWeeks[finishedWeeks.length - 2]?.state === 'repaired';

  // Text equivalent of the glyph strip for screen readers. D4 (founder,
  // 2026-07-03): a missed week is spoken as a "quiet week", never "missed".
  const parts = [];
  const k = strength(weeks, 'kept'); if (k) parts.push(`${k} kept`);
  const r = strength(weeks, 'resting'); if (r) parts.push(`${r} recovery`);
  const c = strength(weeks, 'repaired'); if (c) parts.push(`${c} covered`);
  const p = strength(weeks, 'paused'); if (p) parts.push(`${p} paused`);
  const q = strength(weeks, 'missed'); if (q) parts.push(`${q} quiet`);
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
    <View style={[styles.section, live.section]}>
      <View style={styles.headerRow}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Your weeks</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.runLine, live.runLine]} numberOfLines={2}>{runLine}</Text>
      </View>

      {/* 12-week glyph strip */}
      <View style={styles.strip} accessible accessibilityLabel={stripA11y}>
        {weeks.map((w) => {
          const g = GLYPH[w.state] || GLYPH.missed;
          return <Ionicons key={w.weekKey} name={g.icon} size={16} color={g.color} style={styles.glyph} />;
        })}
      </View>

      {/* U-F-5: on-screen key for the glyph strip, mirroring the screen-reader
          summary so the strip is not opaque to sighted users. Hidden from
          screen readers (the strip already carries the text equivalent), and
          absent under suppression because the whole section returns null above. */}
      <View
        style={styles.glyphKey}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {[
          { state: 'kept', label: 'Kept' },
          { state: 'resting', label: 'Recovery' },
          { state: 'repaired', label: 'Covered' },
          { state: 'paused', label: 'Paused' },
          { state: 'missed', label: 'Quiet week' },
        ].map(({ state, label }) => (
          <View key={state} style={styles.glyphKeyItem}>
            <Ionicons name={GLYPH[state].icon} size={12} color={GLYPH[state].color} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.glyphKeyLabel, live.glyphKeyLabel]}>{label}</Text>
          </View>
        ))}
      </View>

      {justRepaired ? (
        <View style={styles.repairRow}>
          <Ionicons name="git-compare" size={14} color={t.colors.primary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.repairLine, live.repairLine]}>A lighter week, and you came back. Your run carried on.</Text>
        </View>
      ) : null}

      {longestRun > 0 ? (
        <Text maxFontSizeMultiplier={1.3} style={[styles.longest, live.longest]}>Longest run: {longestRun} {longestRun === 1 ? 'week' : 'weeks'}.</Text>
      ) : null}

      {/* Manual-goal editor, plan-less users only */}
      {/* EP-12/UI-04 (end-user-polish audit, 2026-07-12): six 40x40 chips in
          one non-wrapping row needed 280dp but a 320dp phone only offers
          254dp inside this card (320 - 32 screen padding - 2 border - 32
          card padding), so the last chip spilled through the card edge.
          Two rows of three at 44x44 (the project's touch-target minimum,
          src/styles/layout.js touchTarget.minimum) fits with room to spare
          on 320dp (3*44 + 2*8 = 148dp per row) and meets the 44dp contract
          without hitSlop. Selection semantics are unchanged. */}
      {!hasTarget ? (
        <View style={styles.goalBlock}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.goalLabel, live.goalLabel]}>How many sessions a week are you aiming for?</Text>
          <View style={styles.goalChipsGrid}>
            {[[1, 2, 3], [4, 5, 6]].map((row, i) => (
              <View key={i} style={styles.goalChipsRow}>
                {row.map(n => {
                  const sel = vm.manualGoal === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.goalChip, live.goalChip, sel && [styles.goalChipOn, live.goalChipOn]]}
                      onPress={() => setGoal(n)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={`${n} sessions a week`}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={[styles.goalChipText, live.goalChipText, sel && [styles.goalChipTextOn, live.goalChipTextOn]]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.pauseBtn, live.pauseBtn]}
        onPress={() => setPauseOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Pause your run"
      >
        <Ionicons name="pause-outline" size={16} color={t.colors.textSecondary} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.pauseBtnText, live.pauseBtnText]}>Pause</Text>
      </TouchableOpacity>

      <BottomSheet
        visible={pauseOpen}
        onClose={() => setPauseOpen(false)}
        accessibilityLabel="Pause your run options"
      >
        <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Life happens. Pause your run and nothing is lost.</Text>
        {PAUSE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.weeks}
            style={[styles.sheetOption, live.sheetOption]}
            onPress={() => doPause(opt.weeks)}
            accessibilityRole="button"
            accessibilityLabel={`Pause for ${opt.label}`}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionText, live.sheetOptionText]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>
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
  glyphKey: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  glyphKeyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  glyphKeyLabel: { ...type.caption, color: colors.textMuted },
  longest: { ...type.caption, color: colors.textMuted },
  // D2 streak-repair line, calm, forgiving; primary tint (a positive bridge),
  // never a warning colour.
  repairRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  repairLine: { ...type.captionTight, flex: 1, color: colors.textSecondary },
  goalBlock: { gap: spacing.sm, marginTop: spacing.xs },
  goalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  // EP-12/UI-04: two explicit rows of three, guaranteed to fit a 320dp card
  // (see the render-site comment above), rather than a single non-wrapping
  // row that overflowed.
  goalChipsGrid: { gap: spacing.sm },
  goalChipsRow: { flexDirection: 'row', gap: spacing.sm },
  goalChip: {
    // 44pt touch target (src/styles/layout.js touchTarget.minimum), raised
    // from 40x40 which fell below the project's touch-target contract.
    width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  goalChipOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, alpha.tint) },
  goalChipText: { ...type.num('body'), color: colors.textSecondary },
  goalChipTextOn: { color: colors.primary },
  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 44, marginTop: spacing.xs,
  },
  pauseBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  sheetTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetOption: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, minHeight: 48, justifyContent: 'center',
  },
  sheetOptionText: { fontSize: fontSize.md, color: colors.textPrimary },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. headerRow/strip/glyph/glyphKey/
// glyphKeyItem/goalChips have no colour tokens.
function buildLiveStyles(t) {
  return {
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    title: { ...t.type.label, color: t.colors.textSecondary },
    runLine: { color: t.colors.textPrimary },
    glyphKeyLabel: { ...t.type.caption, color: t.colors.textMuted },
    longest: { ...t.type.caption, color: t.colors.textMuted },
    repairLine: { ...t.type.captionTight, color: t.colors.textSecondary },
    goalLabel: { color: t.colors.textSecondary },
    goalChip: { borderColor: t.colors.border },
    goalChipOn: { borderColor: t.colors.primary, backgroundColor: withAlpha(t.colors.primary, alpha.tint) },
    goalChipText: { ...t.type.num('body'), color: t.colors.textSecondary },
    goalChipTextOn: { color: t.colors.primary },
    pauseBtn: { borderColor: t.colors.border },
    pauseBtnText: { color: t.colors.textSecondary },
    sheetTitle: { color: t.colors.textPrimary },
    sheetOption: { borderColor: t.colors.border },
    sheetOptionText: { color: t.colors.textPrimary },
  };
}
