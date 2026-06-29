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

// `plannedProgress` is the COMBINED eaten+planned fraction; it draws a faded
// arc behind the solid eaten arc so planned-but-unconfirmed food is visible
// without being mistaken for eaten. When the user confirms a day, planned
// flips to eaten and the faded extension becomes solid.
function Ring({ size, stroke, progress, plannedProgress = 0, tint, track }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const trackPath = useMemo(() => arcPath(cx, cy, r, 0, 360), [cx, cy, r]);
  const sweep = Math.max(0, Math.min(1, progress)) * 360;
  const plannedSweep = Math.max(0, Math.min(1, plannedProgress)) * 360;
  const fillPath = useMemo(() => arcPath(cx, cy, r, -90, sweep), [cx, cy, r, sweep]);
  const plannedPath = useMemo(() => arcPath(cx, cy, r, -90, plannedSweep), [cx, cy, r, plannedSweep]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={trackPath}
        color={track}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
      />
      {plannedSweep > sweep && (
        <Path
          path={plannedPath}
          color={tint}
          opacity={0.32}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
        />
      )}
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
// is the primary bar (the number this user defends): it carries the weight
// emphasis. Each bar's fill is its macro's CATEGORY colour (`tint`, founder
// decision 2026-06-29) — a fixed hue that says WHICH macro it is, never an
// adherence judgement: the hue does not change on under/over target, so a bar
// is never coloured "good" or "bad" (the overall calorie ring stays neutral
// amber). Protein's tint is the brand amber.
// `planned` is the planned-but-unconfirmed grams for this macro. It draws a
// faded fill to the combined (eaten+planned) width behind the solid eaten
// fill, matching the ring, and is shown in the value text as "+Ng planned".
// `sub` is an optional quiet descriptive line under the bar (e.g. protein
// g/kg today) — purely factual, never a target judgement.
//
// `moreIsFine` marks a macro with no upper-bound shame (fibre): it shows a
// "Ng to go" remaining hint while under target but NEVER an "over" readout,
// since more fibre is not a deviation to flag.
function MacroBar({ label, value, target, planned = 0, primary, sub = null, moreIsFine = false, tint = colors.primary }) {
  const progress = target && target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const plannedProgress = target && target > 0 ? Math.max(0, Math.min(1, (value + planned) / target)) : 0;
  // Remaining framing (factual value/target, no colour judgement — matches the
  // adherence-neutral kcal ring). "Ng to go" while under, "Ng over" while over,
  // and nothing exactly on target. A more-is-fine macro never shows "over".
  const remaining = target != null && target > 0 ? target - value : null;
  let remainingText = null;
  if (remaining != null) {
    if (remaining > 0) remainingText = `${Math.round(remaining)}g to go`;
    else if (remaining < 0 && !moreIsFine) remainingText = `${Math.round(Math.abs(remaining))}g over`;
  }
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarTop}>
        <Text style={[styles.macroBarLabel, primary && styles.macroBarLabelPrimary]}>{label}</Text>
        <Text style={[styles.macroBarValue, primary && styles.macroBarValuePrimary]}>
          {value}{target != null ? ` / ${target}` : ''}g
          {planned > 0 ? <Text style={styles.macroBarPlanned}>{`  +${Math.round(planned)} planned`}</Text> : null}
        </Text>
      </View>
      <View style={styles.macroTrack}>
        {plannedProgress > progress ? (
          <View style={[styles.macroFillPlanned, { width: `${Math.round(plannedProgress * 100)}%`, backgroundColor: tint }]} />
        ) : null}
        <View style={[styles.macroFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tint }]} />
      </View>
      {(sub || remainingText) ? (
        <View style={styles.macroBarSubRow}>
          <Text style={styles.macroBarSub}>{sub ?? ''}</Text>
          {remainingText ? <Text style={styles.macroBarRemaining}>{remainingText}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function MacroRings({ rollup, targets, planned, dayTypeLabel, onPress }) {
  const kcal = Math.round(rollup?.kcal_total ?? 0);
  const p = Math.round(rollup?.protein_g ?? 0);
  const c = Math.round(rollup?.carbs_g ?? 0);
  const f = Math.round(rollup?.fat_g ?? 0);
  // Planned-but-unconfirmed food (is_planned=1). Shown distinctly so a planned
  // day doesn't read as empty, but never folded into the eaten totals the coach
  // and adherence use — those stay on `rollup` (eaten only).
  const plannedKcal = Math.round(planned?.kcal ?? 0);
  const plannedP = Math.round(planned?.protein_g ?? 0);
  const plannedC = Math.round(planned?.carbs_g ?? 0);
  const plannedF = Math.round(planned?.fat_g ?? 0);
  const hasPlanned = plannedKcal > 0 || plannedP > 0 || plannedC > 0 || plannedF > 0;
  const kcalTarget = targets?.targetKcal ?? null;
  const pTarget = targets?.proteinG ?? null;
  const cTarget = targets?.carbsG ?? null;
  const fTarget = targets?.fatG ?? null;
  const kcalProgress = kcalTarget && kcalTarget > 0 ? kcal / kcalTarget : 0;
  const kcalPlannedProgress = kcalTarget && kcalTarget > 0 ? (kcal + plannedKcal) / kcalTarget : 0;
  // Remaining (the hero) is derived from the animated eaten total at render time
  // (dispRemaining), so the non-animated kcalRemaining is no longer needed here.
  const kcalTint = bandColour();

  // Descriptive macro %-of-calories split (Cronometer-style). Purely factual:
  // what was eaten, computed from grams using the Atwater factors (protein 4,
  // carbs 4, fat 9 kcal/g). This is NOT a target judgement and carries no
  // colour — it just explains how today's energy breaks down by macro.
  const pKcal = p * 4;
  const cKcal = c * 4;
  const fKcal = f * 9;
  const macroKcal = pKcal + cKcal + fKcal;
  const macroSplit = macroKcal > 0
    ? {
        p: Math.round((pKcal / macroKcal) * 100),
        c: Math.round((cKcal / macroKcal) * 100),
        f: Math.round((fKcal / macroKcal) * 100),
      }
    : null;

  // Protein g/kg eaten today, shown by the protein bar. Derived from the eaten
  // protein and bodyweight; bodyweight is back-calculated from the target's own
  // proteinGPerKg ratio (the same derivation the Nutrition Targets screen uses)
  // so MacroRings needs no extra prop. Renders only when that ratio is present
  // (a freshly hydrated target carries it); otherwise the line is simply hidden.
  const proteinGPerKgTarget = targets?.proteinGPerKg;
  const weightKg = proteinGPerKgTarget > 0 && pTarget > 0
    ? pTarget / proteinGPerKgTarget
    : null;
  const proteinPerKgToday = weightKg > 0 ? Math.round((p / weightKg) * 10) / 10 : null;

  // Fibre is an optional, more-is-fine bar (no upper-bound shame): only shown
  // when there's a fibre datum to show (a target or some logged fibre). The
  // eaten fibre comes from the rollup; the target, when present, comes from the
  // nutrition target.
  const fibre = Math.round(rollup?.fibre_g ?? 0);
  const fibreTarget = targets?.fibreG ?? null;
  const showFibre = fibreTarget != null || fibre > 0;

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

  // Remaining is the hero number (founder decision 2026-06-29, MFP-style): the
  // ring centre counts DOWN the calories left, with eaten/target shown as the
  // quiet reference beside it. Derived from the animated eaten total so it counts
  // as food lands. Stays adherence-NEUTRAL: "over" is shown factually in the same
  // neutral ink as "left" — never a red/alarm colour (the ring colour is likewise
  // neutral amber, see bandColour).
  const dispRemaining = kcalTarget != null ? Math.round(kcalTarget - disp.kcal) : null;
  const dispOver = dispRemaining != null && dispRemaining < 0;

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
    hasPlanned ? `${plannedKcal} calories planned but not yet confirmed eaten` : null,
  ].filter(Boolean).join(', ');
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
            plannedProgress={kcalPlannedProgress}
            tint={kcalTint}
            track={colors.surface2}
          />
          <View style={styles.kcalCentre} pointerEvents="none">
            {kcalTarget != null ? (
              <>
                <Text style={styles.kcalValue}>{dispOver ? Math.abs(dispRemaining) : dispRemaining}</Text>
                <Text style={styles.kcalSubLabel}>{dispOver ? 'over' : 'left'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.kcalValue}>{disp.kcal}</Text>
                <Text style={styles.kcalSubLabel}>kcal</Text>
              </>
            )}
            {hasPlanned ? (
              <Text style={styles.kcalPlanned}>{`+${plannedKcal} planned`}</Text>
            ) : null}
          </View>
        </View>
        {kcalTarget != null ? (
          <View style={styles.kcalEatenWrap}>
            <Text style={styles.kcalEatenValue}>{disp.kcal}</Text>
            <Text style={styles.kcalEatenLabel}>{`of ${kcalTarget} eaten`}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.macroRow}>
        <MacroBar
          label="Protein"
          value={p}
          target={pTarget}
          planned={plannedP}
          primary
          tint={colors.macroProtein}
          sub={proteinPerKgToday != null ? `${proteinPerKgToday} g/kg today` : null}
        />
        <MacroBar label="Carbs"   value={c} target={cTarget} planned={plannedC} tint={colors.macroCarb} />
        <MacroBar label="Fat"     value={f} target={fTarget} planned={plannedF} tint={colors.macroFat} />
        {showFibre ? (
          <MacroBar label="Fibre" value={fibre} target={fibreTarget} moreIsFine tint={colors.macroFibre} />
        ) : null}
      </View>
      {macroSplit ? (
        <Text style={styles.macroSplit}>
          {`P ${macroSplit.p}% · C ${macroSplit.c}% · F ${macroSplit.f}%`}
          <Text style={styles.macroSplitCaption}> of calories</Text>
        </Text>
      ) : null}
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
    // Hero numeral. Token-based so it scales with the Larger-Text accessibility
    // setting (MFP-parity audit #21) instead of the old fixed 34.
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.xxxl * 1.1),
    fontVariant: ['tabular-nums'],
  },
  kcalSubLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  kcalPlanned: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xxs,
  },
  // The eaten total is now the quiet reference beside the remaining hero
  // (founder decision 2026-06-29): secondary weight/colour, not a second hero.
  kcalEatenWrap: {
    alignItems: 'flex-end',
  },
  kcalEatenValue: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  kcalEatenLabel: {
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
    position: 'relative',
  },
  macroFill: {
    position: 'absolute', left: 0, top: 0,
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  macroFillPlanned: {
    position: 'absolute', left: 0, top: 0,
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    opacity: 0.32,
  },
  macroBarPlanned: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  // Quiet descriptive sub-row under a bar: protein g/kg on the left, the
  // factual remaining ("Ng to go" / "Ng over") on the right. Both adherence-
  // neutral (textMuted), never a colour judgement.
  macroBarSubRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xxs,
  },
  macroBarSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  macroBarRemaining: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  // Descriptive %-of-calories split. Factual readout, neutral colour.
  macroSplit: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  macroSplitCaption: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
