/**
 * WaterRow: the Diary's water card (NU-9, Wave A C7), moved out of
 * DiaryScreen.js as a named component (D230 R4, 4.7) with the same props
 * and behaviour.
 *
 * D230 R14 (4.6): the control is the house Stepper with its 48 dp buttons:
 * a tap moves 250 ml, a hold moves 500 ml (the one-time hint below teaches
 * it), and the value, "1.5 of 2.5 litres", is itself the control that opens
 * the daily target picker. The caller owns the write: `onAdd(ml)` and
 * `onSub(ml)` carry the DELTA, never a computed total, so the database
 * applies it atomically (food/db.js adjustWaterMl) and a second tap inside
 * the first write's await window can never be lost.
 *
 * D230 R2 (one amber on the Diary): the water glyph is ink. The fill keeps
 * its tint: it is a data mark (a chart), like the calorie ring and the macro
 * bars, and the house rule on amber is about chrome, not charts.
 */
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import Stepper from '../Stepper';
import HintCaption from '../HintCaption';
import * as haptics from '../../lib/haptics';
import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export const WATER_STEP_ML = 250;
export const WATER_HOLD_STEP_ML = 500;
// The same ceiling food/db.js setWater and adjustWaterMl hold a day to.
export const WATER_MAX_ML = 20000;

// "1.5 of 2.5 litres": the day's water against the target, in words a
// screen reader speaks as written.
export function waterValueText(ml, targetMl) {
  const litres = ((Number(ml) || 0) / 1000).toFixed(1);
  const targetL = ((Number(targetMl) || 0) / 1000).toFixed(1);
  return `${litres} of ${targetL} litres`;
}

export default function WaterRow({
  ml, targetMl, onAdd, onSub, onEditTarget,
  showHint = false, onDismissHint,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const value = waterValueText(ml, targetMl);
  const progress = targetMl > 0 ? Math.max(0, Math.min(1, ml / targetMl)) : 0;
  // The Stepper reports the next value; the row hands its caller the delta.
  const onStep = (next) => {
    const delta = next - ml;
    if (delta > 0) onAdd?.(delta);
    else if (delta < 0) onSub?.(-delta);
  };
  return (
    <Card padding="md" style={styles.waterRow}>
      <View style={styles.waterHeader}>
        <Ionicons name="water-outline" size={18} color={t.colors.textSecondary} />
        <Text style={[styles.waterLabel, live.waterLabel]}>Water</Text>
      </View>
      {/* NU-9: a hold moves a bottle (500 ml) at a time, so a full day of
          water no longer needs 12 taps; the value doubles as the target
          editor. */}
      <Stepper
        value={ml}
        onChange={onStep}
        min={0}
        max={WATER_MAX_ML}
        step={WATER_STEP_ML}
        label="Water"
        formatValue={() => value}
        decreaseLabel="Remove 250 millilitres of water. Hold to remove 500."
        increaseLabel="Add 250 millilitres of water. Hold to add 500."
        onDecreaseLongPress={() => onSub(500)}
        onIncreaseLongPress={() => onAdd(500)}
        onValuePress={() => { haptics.selection(); onEditTarget?.(); }}
        valuePressLabel={`Water ${value}. Change your daily target.`}
        style={styles.waterStepper}
      />
      <View
        style={[styles.waterTrack, live.waterTrack]}
        accessibilityRole="progressbar"
        accessibilityLabel="Water intake"
        accessibilityValue={{ min: 0, max: targetMl, now: Math.round(ml) }}
      >
        <View testID="water-fill" style={[styles.waterFill, live.waterFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {/* Wave A C7: the hold-for-500 move had no visible affordance
          (accessibilityLabel only). Gone once discovered or dismissed. */}
      {showHint ? (
        <HintCaption
          text="Hold to add 500 ml."
          onDismiss={onDismissHint}
          style={styles.waterHint}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  waterRow: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  waterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waterLabel: { ...type.bodyStrong, color: colors.textPrimary },
  // The buttons sit at the two edges and the value fills the space between.
  waterStepper: { alignSelf: 'stretch' },
  waterTrack: {
    height: 6, borderRadius: radius.full,
    backgroundColor: colors.surface2, overflow: 'hidden',
  },
  waterFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  // waterRow already pads/gaps its children; HintCaption's own padding would
  // double up, so this instance is flush.
  waterHint: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
});

// The tree's frozen-plus-live pattern: this mirrors only the colour- and
// type-bearing keys of the frozen block above, at identical rest values.
function buildLiveStyles(t) {
  return {
    waterLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    waterTrack: { backgroundColor: t.colors.surface2 },
    waterFill: { backgroundColor: t.colors.primary },
  };
}
