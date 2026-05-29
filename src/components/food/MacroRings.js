import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';

const KCAL_SIZE = 132;
const KCAL_STROKE = 14;
const MACRO_SIZE = 44;
const MACRO_STROKE = 5;

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

function MacroChip({ label, value, target }) {
  const progress = target && target > 0 ? value / target : 0;
  const tint = bandColour();
  return (
    <View style={styles.macroChip}>
      <View style={styles.macroRingWrap}>
        <Ring
          size={MACRO_SIZE}
          stroke={MACRO_STROKE}
          progress={progress}
          tint={tint}
          track={colors.surface2}
        />
      </View>
      <View style={styles.macroChipText}>
        <Text style={styles.macroChipLabel}>{label}</Text>
        <Text style={styles.macroChipValue}>
          {value}{target != null ? `/${target}` : ''}g
        </Text>
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
            progress={kcalProgress}
            tint={kcalTint}
            track={colors.surface2}
          />
          <View style={styles.kcalCentre} pointerEvents="none">
            <Text style={styles.kcalValue}>{kcal}</Text>
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
        <MacroChip label="Protein" value={p} target={pTarget} />
        <MacroChip label="Carbs"   value={c} target={cTarget} />
        <MacroChip label="Fat"     value={f} target={fTarget} />
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
    fontSize: 34,
    fontWeight: fontWeight.bold,
    lineHeight: 36,
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  macroRingWrap: { width: MACRO_SIZE, height: MACRO_SIZE },
  macroChipText: { flex: 1 },
  macroChipLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  macroChipValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
