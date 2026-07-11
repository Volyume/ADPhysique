import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import BottomSheet from '../BottomSheet';
// M4 (audit 03b §3.3b): the save CTA rides the Button primitive's
// idle → loading → success morph; the commit haptic is its success beat.
import Button from '../Button';
import Chip from '../Chip';
import TextField from '../TextField';
import { useToast } from '../Toast';
import { pickerMealSlots } from '../../lib/food/mealSlots';

/**
 * Quick add: log a bare calorie figure (and optional protein, carbs, fat)
 * without finding a food. For meals out, a guess, or anything not worth a
 * full lookup. Mirrors FoodDetailSheet's bottom-sheet shape and motion.
 *
 * Props:
 *   visible          show / hide
 *   initialMealSlot  'breakfast' | 'lunch' | 'dinner' | 'preworkout' | 'postworkout' | 'snack'
 *   onSave           ({ kcal, protein, carbs, fat, mealSlot }) => Promise<void>
 *   onClose          () => void
 */
export default function QuickAddSheet({ visible, initialMealSlot = 'snack', onSave, onClose }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const toast = useToast();
  // Pre/Post-workout picker options are opt-in (off by default, 2026-07-11
  // fix): mirrors the DiaryScreen/MealPlanScreen "Around training" gate so
  // this sheet never offers a slot the diary itself keeps hidden.
  const periWorkoutSlots = useAppStore((s) => !!s.userProfile?.mealPlanPeriWorkout);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealSlot, setMealSlot] = useState(initialMealSlot);
  const [submitting, setSubmitting] = useState(false);
  // M4: the save has landed; the sheet closes on the Button's onSettled so
  // the checkmark beat is seen before the sheet goes.
  const [saved, setSaved] = useState(false);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setKcal(''); setProtein(''); setCarbs(''); setFat('');
    setMealSlot(initialMealSlot);
    setSubmitting(false);
    setSaved(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onClose?.();
  }

  // A blank macro field is allowed (it counts as 0); only kcal is required.
  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
  }

  async function handleSave() {
    const k = parseFloat(kcal);
    if (!Number.isFinite(k) || k <= 0 || k > 5000) {
      toast.show('Enter calories between 1 and 5000.', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ kcal: Math.round(k), protein: num(protein), carbs: num(carbs), fat: num(fat), mealSlot });
      setSaved(true);
    } catch (_e) {
      setSubmitting(false);
      toast.show('Couldn\'t save. Try again.', { variant: 'error' });
    }
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} keyboardAvoiding accessibilityLabel="Quick add">
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Quick add</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, live.subtitle]}>Log calories now, with macros if you have them.</Text>

          <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, live.fieldLabel]}>Calories</Text>
          <TextField
            value={kcal}
            onChangeText={setKcal}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={t.colors.textMuted}
            accessibilityLabel="Calories"
            autoFocus
            returnKeyType="done"
            inputStyle={styles.calorieInput}
          />

          <View style={styles.macroRow}>
            {[
              { label: 'Protein (g)', a11y: 'Protein in grams', val: protein, set: setProtein },
              { label: 'Carbs (g)', a11y: 'Carbohydrates in grams', val: carbs, set: setCarbs },
              { label: 'Fat (g)', a11y: 'Fat in grams', val: fat, set: setFat },
            ].map(({ label, a11y, val, set }) => (
              <TextField
                key={label}
                label={label}
                value={val}
                onChangeText={set}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.colors.textMuted}
                accessibilityLabel={a11y}
                returnKeyType="done"
                containerStyle={styles.macroField}
                inputStyle={styles.macroInput}
              />
            ))}
          </View>

          <Text maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, live.fieldLabel]}>Meal</Text>
          <View style={styles.mealRow}>
            {pickerMealSlots(mealSlot, undefined, periWorkoutSlots).map(s => (
              <Chip
                key={s.key}
                label={s.label}
                selected={mealSlot === s.key}
                onPress={() => { haptics.selection(); setMealSlot(s.key); }}
                accessibilityRole="radio"
                accessibilityLabel={s.label}
                style={styles.mealChip}
                labelStyle={styles.mealChipLabel}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleClose}
              fullWidth={false}
              style={styles.actionButton}
            />
            <Button
              title="Add to diary"
              onPress={handleSave}
              state={saved ? 'success' : submitting ? 'loading' : 'idle'}
              onSettled={handleClose}
              fullWidth={false}
              style={styles.actionButton}
            />
          </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.xs },
  fieldLabel: {
    fontSize: fontSize.xs, color: colors.textSecondary,
    textTransform: 'uppercase', fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  calorieInput: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1 },
  macroInput: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealChip: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', minHeight: 44 },
  mealChipLabel: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. calorieInput/macroRow/
// macroField/macroInput/mealRow/mealChip/mealChipLabel/actions/actionButton
// have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    fieldLabel: { color: t.colors.textSecondary },
  };
}
