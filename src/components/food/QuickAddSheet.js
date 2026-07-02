import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
} from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import BottomSheet from '../BottomSheet';
// M4 (audit 03b §3.3b): the save CTA rides the Button primitive's
// idle → loading → success morph; the commit haptic is its success beat.
import Button from '../Button';
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
  const toast = useToast();
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
          <Text style={styles.title}>Quick add</Text>
          <Text style={styles.subtitle}>Log calories now, with macros if you have them.</Text>

          <Text style={styles.fieldLabel}>Calories</Text>
          <TextInput
            style={styles.input}
            value={kcal}
            onChangeText={setKcal}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Calories"
            autoFocus
            returnKeyType="done"
          />

          <View style={styles.macroRow}>
            {[
              { label: 'Protein (g)', a11y: 'Protein in grams', val: protein, set: setProtein },
              { label: 'Carbs (g)', a11y: 'Carbohydrates in grams', val: carbs, set: setCarbs },
              { label: 'Fat (g)', a11y: 'Fat in grams', val: fat, set: setFat },
            ].map(({ label, a11y, val, set }) => (
              <View key={label} style={styles.macroField}>
                <Text style={styles.fieldLabelSmall}>{label}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={val}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel={a11y}
                  returnKeyType="done"
                />
              </View>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Meal</Text>
          <View style={styles.mealRow}>
            {pickerMealSlots(mealSlot).map(s => (
              <Pressable
                key={s.key}
                onPress={() => setMealSlot(s.key)}
                style={({ pressed }) => [styles.mealBtn, mealSlot === s.key && styles.mealBtnActive, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: mealSlot === s.key }}
              >
                <Text style={[styles.mealBtnText, mealSlot === s.key && styles.mealBtnTextActive]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleClose} accessibilityRole="button" style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button
              title="Add to diary"
              onPress={handleSave}
              state={saved ? 'success' : submitting ? 'loading' : 'idle'}
              onSettled={handleClose}
              fullWidth={false}
              style={styles.saveBtn}
              textStyle={styles.saveText}
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
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  fieldLabelSmall: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1 },
  inputSmall: {
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealBtn: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: radius.md, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  mealBtnActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  mealBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  mealBtnTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  saveBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  saveText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
