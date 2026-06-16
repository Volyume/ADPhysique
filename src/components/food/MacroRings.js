import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import useAppStore from '../../store/useAppStore';

const KCAL_SIZE = 132;
const KCAL_STROKE = 14;

// Adherence-neutral ring colour (founder decision 2026-05-29, reversing the
// earlier amber/green/amber three-band). The ring shows progress in the brand
// amber and makes no colour judgement about being under or over target. The
// adherence-neutral brief is explicit: neither congratulate adherence nor flag
// a deviation by colour, since for the at-risk subgroup colour-coded targets
// drive the harm pattern. The numbers stay factual (value/target). Kept as a
// function so the ring tint has a single source for call sites and tests.
export function bandColour() {
  return colors.primary;
}

function arcPath(cx, cy, r, startDeg, sweepDeg) {
  const p = Skia.Path.Make();
  const start = (startDeg * Math.PI) / 180;
  const end = ((startDeg + sweepDeg) * Math.PI) / 180;
  p.moveTo(cx + r * Math.cos(start), cy + r * Math.sin(start));
  const STEPS = 64;
  for (let i = 1; i <= STEPS; i++) {
    const t = start + ((end - start) * i) / STEPS;
    p.lineTo(cx + r * Math.cos(t), cy + r * Math.sin(t));
  }
  return p;
}

function Ring({ size, stroke, progress, tint, track }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const trackPath = useMemo(() => arcPath(cx, cy, r, 0, 360), [cx, cy, r]);
  const sweep = Math.max(0, Math.min(1, progress)) * 360;
  const fillPath = useMemo(() => arcPath(cx, cy, r, -90, sweep), [cx, cy, r, sweep]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={trackPath}
        color={track}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
      />
      {sweep > 0 && (
        <Path
          path={fillPath}
          color={tint}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
        />
      )}
    </Canvas>
  );
}

// A macro reads as a horizontal bar, not a small ring (diary-tab redesign
// 2026-06-01). A training user tracks four numbers, and bars read all four
// against target at a glance where competing small rings read slower. Protein
// is the primary bar (the number this user defends): it carries the only
// weight emphasis, never a different colour, since the fill stays the
// adherence-neutral amber for every macro.
function MacroBar({ label, value, target, primary }) {
  const progress = target && target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarTop}>
        <Text style={[styles.macroBarLabel, primary && styles.macroBarLabelPrimary]}>{label}</Text>
        <Text style={[styles.macroBarValue, primary && styles.macroBarValuePrimary]}>
          {value}{target != null ? ` / ${target}` : ''}g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

export default function MacroRings({ rollup, targets, dayTypeLabel, onPress }) {
  const kcal = Math.round(rollup?.kcal_total ?? 0);
  const p = Math.round(rollup?.protein_g ?? 0);
  const c = Math.round(rollup?.carbs_g ?? 0);
  const f = Math.round(rollup?.fat_g ?? 0);
  const kcalTarget = targets?.targetKcal ?? null;
  const pTarget = targets?.proteinG ?? null;
  const cTarget = targets?.carbsG ?? null;
  const fTarget = targets?.fatG ?? null;
  const kcalProgress = kcalTarget && kcalTarget > 0 ? kcal / kcalTarget : 0;
  const kcalRemaining = kcalTarget != null ? kcalTarget - kcal : null;
  const kcalOver = kcalRemaining != null && kcalRemaining < 0;
  const kcalTint = bandColour();

  // Count the calorie number up and sweep the ring when the total changes, so
  // the headline reads as alive when a food lands. Animates ON CHANGE only (no
  // replay on every mount), and is skipped entirely under reduce-motion. The
  // accessibility label and the macro numbers stay on the real values.
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const animValue = useRef(new Animated.Value(1)).current;
  const fromRef = useRef({ kcal, progress: kcalProgress });
  const [disp, setDisp] = useState({ kcal, progress: kcalProgress });
  useEffect(() => {
    const from = fromRef.current;
    const to = { kcal, progress: kcalProgress };
    if (reduceMotion || (from.kcal === to.kcal && from.progress === to.progress)) {
      setDisp(to);
      fromRef.current = to;
      return undefined;
    }
    animValue.setValue(0);
    const id = animValue.addListener(({ value }) => {
      setDisp({
        kcal: Math.round(from.kcal + (to.kcal - from.kcal) * value),
        progress: from.progress + (to.progress - from.progress) * value,
      });
    });
    Animated.timing(animValue, { toValue: 1, duration: 500, useNativeDriver: false })
      .start(() => { fromRef.current = to; });
    return () => animValue.removeListener(id);
  }, [kcal, kcalProgress, reduceMotion, animValue]);

  // The rings are decorative (Skia canvas); the numbers are the data. Build
  // one spoken summary of kcal + macros so a screen reader conveys the same
  // information the rings show, and hide the inner content from a11y so the
  // card speaks once.
  const macroPart = (label, value, target) =>
    `${label} ${value}${target != null ? ` of ${target}` : ''} grams`;
  const a11ySummary = [
    kcalTarget != null ? `${kcal} of ${kcalTarget} calories` : `${kcal} calories`,
    macroPart('protein', p, pTarget),
    macroPart('carbs', c, cTarget),
    macroPart('fat', f, fTarget),
  ].join(', ');
  const a11yLabel = onPress ? `${a11ySummary}. Tap for the breakdown by meal.` : a11ySummary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.9}
      accessible
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={a11yLabel}
      // Food audit F-7: the label carries the live kcal + macro totals (the real
      // values, not the ring animation), so a polite live region re-announces
      // the new numbers to a screen reader when the day's intake changes.
      accessibilityLiveRegion="polite"
    >
      {dayTypeLabel ? (
        <View style={styles.dayTypeChip}>
          <Text style={styles.dayTypeChipText}>{dayTypeLabel}</Text>
        </View>
      ) : null}
      <View style={styles.kcalRow}>
        <View style={styles.kcalRingWrap}>
          <Ring
            size={KCAL_SIZE}
            stroke={KCAL_STROKE}
            progress={disp.progress}
            tint={kcalTint}
            track={colors.surface2}
          />
          <View style={styles.kcalCentre} pointerEvents="none">
            <Text style={styles.kcalValue}>{disp.kcal}</Text>
            {kcalTarget != null ? (
              <Text style={styles.kcalSubLabel}>of {kcalTarget}</Text>
            ) : (
              <Text style={styles.kcalSubLabel}>kcal</Text>
            )}
          </View>
        </View>
        {kcalRemaining != null ? (
          <View style={styles.kcalRemainingWrap}>
            <Text style={styles.kcalRemainingValue}>
              {kcalOver ? Math.abs(kcalRemaining) : kcalRemaining}
            </Text>
            <Text style={styles.kcalRemainingLabel}>
              {kcalOver ? 'over' : 'remaining'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.macroRow}>
        <MacroBar label="Protein" value={p} target={pTarget} primary />
        <MacroBar label="Carbs"   value={c} target={cTarget} />
        <MacroBar label="Fat"     value={f} target={fTarget} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  kcalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  kcalRingWrap: {
    width: KCAL_SIZE, height: KCAL_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  kcalCentre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  kcalValue: {
    color: colors.textPrimary,
    // eslint-disable-next-line no-restricted-syntax -- macro ring centre is a hero numeral
    fontSize: 34,
    fontWeight: fontWeight.bold,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  kcalSubLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  kcalRemainingWrap: {
    alignItems: 'flex-end',
  },
  kcalRemainingValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  kcalRemainingLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  dayTypeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dayTypeChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
  macroRow: {
    gap: spacing.md,
  },
  macroBar: { gap: spacing.xs2 },
  macroBarTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  macroBarLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  macroBarLabelPrimary: {
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  macroBarValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  macroBarValuePrimary: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  macroTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
