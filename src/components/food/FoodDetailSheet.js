import { useEffect, useMemo, useState } from 'react';
import { appAlert } from '../AppAlert';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import BottomSheet from '../BottomSheet';
import SourceChip from './SourceChip';
import { useToast } from '../Toast';
import { pickerMealSlots } from '../../lib/food/mealSlots';
import { scaleMacros, scaleSugarG } from '../../lib/food/macros';
import { buildServingUnits, initialServingState, resolveGrams, isValidEntryGrams } from '../../lib/food/servingEntry';

// Display-shaped wrapper over the shared scaling helper (food review U-M2):
// the preview render reads .protein/.carbs/.fat, the engine returns .*G.
function macrosFor(food, qtyG) {
  const m = scaleMacros(food, qtyG);
  return { kcal: m.kcal, protein: m.proteinG, carbs: m.carbsG, fat: m.fatG, fibre: m.fibreG };
}

/**
 * Bottom sheet for adding or editing a food entry. Replaces the
 * centred Modal pattern in FoodSearchScreen and the long-press-delete
 * footgun on Diary entries.
 *
 * Props:
 *   visible          show / hide
 *   food             { name, brand, source, kcal_100g, protein_100g, ... }
 *   initialQuantityG default quantity (food.serving_g for add, entry.quantity_g for edit)
 *   initialMealSlot  'breakfast' | 'lunch' | 'dinner' | 'snack'
 *   initialEntryDate yyyy-mm-dd
 *   mode             'add' | 'edit'
 *   onSave           ({ quantityG, mealSlot, entryDate }) => Promise<void>
 *   onDelete         () => Promise<void>  (edit mode only)
 *   onClose          () => void
 */
export default function FoodDetailSheet({
  visible, food, mode = 'add',
  initialQuantityG, initialMealSlot = 'snack', initialEntryDate,
  onSave, onDelete, onClose,
}) {
  const toast = useToast();
  // Energy DISPLAY unit (kcal | kj). Display-only: macros.kcal stays kcal (the
  // stored/scaled value scaleMacros returns); only the rendered energy number +
  // label convert at the point of display.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  // gap #16: which extra per-food nutrients to surface under the macro summary.
  // Both default on; both are grams and display-only (never a target or total).
  const showFibre = useAppStore((s) => s.accessibility?.showFibre !== false);
  const showSugar = useAppStore((s) => s.accessibility?.showSugar !== false);
  // Serving model (food ease, MFP/Cronometer parity): prefer the food's own
  // household serving (e.g. "1 cup", "1 slice") so the common case is RECOGNITION,
  // not gram arithmetic — the list row already shows serving_label, we keep it
  // here instead of throwing it away and demanding grams. Grams remain the
  // storage contract (scaleMacros(food, grams)); the unit only changes how the
  // amount is entered. Falls back to grams when a food has no named serving.
  // Primitive deps (not the `food` object identity) so these don't re-memo on
  // every parent render; the helpers only read serving_g/serving_label.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const units = useMemo(() => buildServingUnits(food), [food?.serving_g, food?.serving_label]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => initialServingState(food, mode, initialQuantityG), [mode, initialQuantityG, food?.serving_g]);

  const [unitKey, setUnitKey] = useState(initial.unitKey);
  const [amount, setAmount] = useState(initial.amount);
  const [mealSlot, setMealSlot] = useState(initialMealSlot);
  const [submitting, setSubmitting] = useState(false);

  const unit = units.find(u => u.key === unitKey) || units[units.length - 1];
  const quantityG = resolveGrams(amount, unit);

  useEffect(() => {
    if (!visible) return;
    setUnitKey(initial.unitKey);
    setAmount(initial.amount);
    setMealSlot(initialMealSlot);
    setSubmitting(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching unit keeps the gram total roughly constant (so the macros don't
  // jump), just re-expressed in the new unit.
  function selectUnit(key) {
    if (key === unitKey) return;
    const u = units.find(x => x.key === key);
    if (!u) return;
    const g = quantityG;
    setUnitKey(key);
    setAmount(key === 'serving'
      ? String(Math.round((g / u.grams) * 10) / 10)
      : String(Math.round(g)));
  }

  function adjustAmount(dir) {
    const step = unitKey === 'serving' ? 0.5 : 10;
    const cur = Number(amount) || 0;
    const next = Math.max(0, Math.round((cur + dir * step) * 10) / 10);
    setAmount(String(next));
  }

  function handleClose() {
    onClose?.();
  }

  async function handleSave() {
    const qty = Math.round(quantityG);
    if (!isValidEntryGrams(qty)) {
      toast.show('Enter an amount that works out between 1 and 5000 g.', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ quantityG: qty, mealSlot, entryDate: initialEntryDate });
      onClose?.();
    } catch (_e) {
      setSubmitting(false);
      toast.show('Couldn\'t save. Try again.', { variant: 'error' });
    }
  }

  function handleDelete() {
    appAlert(
      'Remove this entry?',
      'It comes off this day\'s totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try { await onDelete?.(); } catch (_) {}
            onClose?.();
          },
        },
      ],
    );
  }

  const macros = macrosFor(food, quantityG);
  // Extra per-food nutrients (gap #16): shown only when the food actually
  // carries the datum (null = "no data", never a fake 0) and the user keeps the
  // toggle on. Display-only — not logged, not totalled, not scored.
  const sugarG = showSugar ? scaleSugarG(food, quantityG) : null;
  const extraNutrients = [
    showFibre && macros.fibre != null ? { key: 'fibre', label: 'Fibre', value: `${macros.fibre}g` } : null,
    sugarG != null ? { key: 'sugar', label: 'Sugars', value: `${sugarG}g` } : null,
  ].filter(Boolean);

  if (!food) return null;

  return (
    <BottomSheet visible={visible} onClose={handleClose} keyboardAvoiding accessibilityLabel={food.name}>
          <Text style={styles.title} numberOfLines={2}>{food.name}</Text>
          {food.brand ? <Text style={styles.subtitle}>{food.brand}</Text> : null}
          {/* A6: the shared SourceChip replaces the inline uppercase text so
              CoFID rows carry their verified treatment + "what is CoFID?"
              gloss at the point of use. */}
          {food.source ? <SourceChip source={food.source} /> : null}

          <Text style={styles.fieldLabel}>Amount</Text>
          {units.length > 1 ? (
            <View style={styles.unitRow}>
              {units.map(u => (
                <Pressable
                  key={u.key}
                  onPress={() => selectUnit(u.key)}
                  style={({ pressed }) => [styles.unitBtn, unitKey === u.key && styles.unitBtnActive, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: unitKey === u.key }}
                  accessibilityLabel={u.key === 'serving' ? `Per ${u.label}` : 'Grams'}
                >
                  <Text style={[styles.unitBtnText, unitKey === u.key && styles.unitBtnTextActive]} numberOfLines={1}>
                    {u.key === 'serving' ? `${u.label} (${Math.round(u.grams)} g)` : 'Grams'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.stepper}>
            <Pressable
              onPress={() => adjustAmount(-1)}
              style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Decrease amount"
            >
              <Ionicons name="remove" size={22} color={colors.textPrimary} />
            </Pressable>
            <TextInput
              style={styles.stepInput}
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Amount"
            />
            <Pressable
              onPress={() => adjustAmount(1)}
              style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Increase amount"
            >
              <Ionicons name="add" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          {unitKey === 'serving' ? (
            <Text style={styles.gramHint}>= {Math.round(quantityG)} g</Text>
          ) : null}

          <View
            style={styles.macroSummary}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${toEnergy(macros.kcal, energyUnit)} ${energyWord}, protein ${macros.protein} grams, carbs ${macros.carbs} grams, fat ${macros.fat} grams`}
          >
            <MacroPill label={energyUnitLabel(energyUnit)} value={toEnergy(macros.kcal, energyUnit)} />
            <MacroPill label="P"    value={`${macros.protein}g`} />
            <MacroPill label="C"    value={`${macros.carbs}g`} />
            <MacroPill label="F"    value={`${macros.fat}g`} />
          </View>

          {extraNutrients.length ? (
            <View style={styles.extraRow}>
              {extraNutrients.map((n) => (
                <Text key={n.key} style={styles.extraText}>
                  <Text style={styles.extraLabel}>{n.label} </Text>{n.value}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Meal</Text>
          <View style={styles.mealRow}>
            {pickerMealSlots(mealSlot).map(s => (
              <Pressable
                key={s.key}
                onPress={() => setMealSlot(s.key)}
                style={({ pressed }) => [
                  styles.mealBtn,
                  mealSlot === s.key && styles.mealBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mealSlot === s.key }}
              >
                <Text style={[
                  styles.mealBtnText,
                  mealSlot === s.key && styles.mealBtnTextActive,
                ]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            {mode === 'edit' && onDelete ? (
              <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]} accessibilityLabel="Remove entry">
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            ) : null}
            <Pressable onPress={handleClose} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={({ pressed }) => [styles.saveBtn, submitting && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.saveText}>
                {submitting ? 'Saving' : mode === 'edit' ? 'Save changes' : 'Add to diary'}
              </Text>
            </Pressable>
          </View>
    </BottomSheet>
  );
}

function MacroPill({ label, value }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillValue}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
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
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
  },
  // Unit selector (household serving vs grams) + amount stepper. The common
  // case — one named serving — needs zero keystrokes: tap +/− or just Add.
  unitRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  unitBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', minHeight: 44,
  },
  unitBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  unitBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  unitBtnTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 48, height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  gramHint: {
    fontSize: fontSize.sm, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.xs,
  },
  macroSummary: {
    flexDirection: 'row', gap: spacing.sm,
  },
  macroPill: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  macroPillValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  macroPillLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xxs },
  // gap #16: a quiet secondary line for extra per-food nutrients, below the
  // primary kcal/P/C/F pills so it never competes with the macros that matter.
  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, paddingHorizontal: spacing.xxs },
  extraText: { fontSize: fontSize.sm, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  extraLabel: { color: colors.textMuted },
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  mealBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  mealBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  mealBtnTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteBtn: {
    width: 44, height: 44,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
