import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { colors, fontSize, fontWeight, spacing, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
// M4 (audit 03b §3.3b): the save CTA rides the Button primitive's
// idle → loading → success morph; the commit haptic is its success beat.
import Button from '../Button';
import Chip from '../Chip';
import TextField from '../TextField';
import { useToast } from '../Toast';
import useMealSlotChoices from './useMealSlotChoices';
import { fromEnergy, toEnergy, energyUnitLabel } from '../../lib/format';
import { parseDecimalInput } from '../../lib/parseDecimalInput';
import { logError } from '../../lib/errorLog';
import { touchTarget } from '../../styles/layout';
import { FOOD_NOTE_MAX_LENGTH } from '../../lib/food/entryNote';

/**
 * Quick add: log a bare calorie figure (and optional protein, carbs, fat)
 * without finding a food. For meals out, a guess, or anything not worth a
 * full lookup. Mirrors FoodDetailSheet's bottom-sheet shape and motion.
 *
 * Props:
 *   visible          show / hide
 *   initialMealSlot  'breakfast' | 'lunch' | 'dinner' | 'preworkout' | 'postworkout' | 'snack'
 *   onSave           ({ kcal, protein, carbs, fat, mealSlot, note }) => Promise<void>
 *                    (D230 R20: note is the optional "What was it?" line, trimmed,
 *                    '' when blank; it becomes the entry's name in the diary)
 *   onClose          () => void
 *   mealSlots        optional: the meals the caller shows ({ key, label }[]).
 *                    Without it the chips follow the person's meals per day
 *                    (food Diary audit 2026-10-16, item 7); the chosen meal is
 *                    always kept as a chip.
 *
 * The sheet scrolls (BottomSheet `scroll`, as the add sheet does), so with
 * the keyboard up at the largest text size every field and the actions can
 * be reached (food Diary audit 2026-10-16, item 13).
 */
export default function QuickAddSheet({ visible, initialMealSlot = 'snack', onSave, onClose, mealSlots = null }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const toast = useToast();
  // Pre/Post-workout picker options are opt-in (off by default, 2026-07-11
  // fix): mirrors the DiaryScreen/MealPlanScreen "Around training" gate so
  // this sheet never offers a slot the diary itself keeps hidden.
  const periWorkoutSlots = useAppStore((s) => !!s.userProfile?.mealPlanPeriWorkout);
  // The user's energy-unit preference. This sheet previously read NO unit at
  // all and labelled its field a bare "Calories", so a kJ user typed a kJ
  // figure and it was stored verbatim as kcal -- a ~4.18x inflation written
  // into daily_intake_rollups, the single source every kcal surface reads,
  // and from there into adherence and the intake figures ED-safety code
  // consumes. Read the preference, say the unit out loud, and convert on save.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const unitLabel = energyUnitLabel(energyUnit);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [note, setNote] = useState('');
  const [mealSlot, setMealSlot] = useState(initialMealSlot);
  const [submitting, setSubmitting] = useState(false);
  // M4: the save has landed; the sheet closes on the Button's onSettled so
  // the checkmark beat is seen before the sheet goes.
  const [saved, setSaved] = useState(false);
  const mealChoices = useMealSlotChoices({ visible, current: mealSlot, slots: mealSlots, periWorkoutSlots });

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setKcal(''); setProtein(''); setCarbs(''); setFat(''); setNote('');
    setMealSlot(initialMealSlot);
    setSubmitting(false);
    setSaved(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onClose?.();
  }

  // A blank macro field is allowed (it counts as 0); only kcal is required.
  function num(v) {
    const n = parseDecimalInput(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
  }

  async function handleSave() {
    // The user typed in THEIR unit, so validate the bounds in that unit and
    // convert once, here, through the shared inverse. The stored value is
    // always kcal -- the engine and every rollup work in kcal only.
    const typed = parseDecimalInput(kcal);
    const maxTyped = toEnergy(5000, energyUnit);
    if (!Number.isFinite(typed) || typed <= 0 || typed > maxTyped) {
      toast.show(`Enter energy between 1 and ${maxTyped} ${unitLabel}.`, { variant: 'warning' });
      return;
    }
    const k = fromEnergy(typed, energyUnit);
    if (!Number.isFinite(k) || k <= 0) {
      toast.show(`Enter energy between 1 and ${maxTyped} ${unitLabel}.`, { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ kcal: Math.round(k), protein: num(protein), carbs: num(carbs), fat: num(fat), mealSlot, ...(note.trim() ? { note: note.trim() } : null) });
      setSaved(true);
    } catch (e) {
      // D230 R18: the cause is logged (no amounts, no names), then the person
      // gets the calm full sentence that says what was being saved.
      logError('QuickAddSheet.save', e, { mealSlot });
      setSubmitting(false);
      toast.show('That quick add was not saved. Try again in a moment.', { variant: 'error' });
    }
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} keyboardAvoiding scroll accessibilityLabel="Quick add">
          <Text style={[styles.title, live.title]} accessibilityRole="header">Quick add</Text>
          <Text style={[styles.subtitle, live.subtitle]}>Log energy now, with macros if you have them.</Text>

          <SectionLabel style={styles.fieldLabel}>{`Energy (${unitLabel})`}</SectionLabel>
          <TextField
            value={kcal}
            onChangeText={setKcal}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={t.colors.textMuted}
            accessibilityLabel={`Energy in ${unitLabel}`}
            autoFocus
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
                containerStyle={styles.macroField}
                inputStyle={styles.macroInput}
              />
            ))}
          </View>

          <TextField
            label="What was it?"
            value={note}
            onChangeText={setNote}
            maxLength={FOOD_NOTE_MAX_LENGTH}
            placeholder="Anything worth remembering"
            placeholderTextColor={t.colors.textMuted}
            accessibilityLabel="What was it, optional"
            returnKeyType="done"
            testID="quick-add-note"
          />

          <SectionLabel style={styles.fieldLabel}>Meal</SectionLabel>
          <View style={styles.mealRow} accessibilityRole="radiogroup" accessibilityLabel="Meal">
            {mealChoices.map(s => (
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
  title: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.xs },
  // D230 R15: the label is the house SectionLabel (it sets its own overline
  // type and capitals); only the spacing above it is local.
  fieldLabel: { marginTop: spacing.xs },
  calorieInput: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
  },
  // The three macro fields share a row and wrap under each other when the
  // text is too large for three across (food Diary audit 2026-10-16, item 13).
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroField: { flexGrow: 1, flexBasis: 96 },
  macroInput: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  // Food Diary audit 2026-10-16, item 7: the meal chips wrap (six meals, a
  // 24-character name or the largest text size never clip a chip).
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealChip: { flexGrow: 1, flexShrink: 1, maxWidth: '100%', alignSelf: 'stretch', justifyContent: 'center', minHeight: touchTarget.minimum },
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
  };
}
