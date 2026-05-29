import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  Animated, Easing, Platform, KeyboardAvoidingView, Keyboard,
  TouchableWithoutFeedback, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import useAppStore from '../../store/useAppStore';

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snacks' },
];

function macrosFor(food, qtyG) {
  if (!food || !qtyG || !isFinite(qtyG) || qtyG <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: null };
  }
  const k = qtyG / 100;
  return {
    kcal:    Math.round((food.kcal_100g    ?? 0) * k),
    protein: Math.round((food.protein_100g ?? 0) * k * 10) / 10,
    carbs:   Math.round((food.carbs_100g   ?? 0) * k * 10) / 10,
    fat:     Math.round((food.fat_100g     ?? 0) * k * 10) / 10,
    fibre:   food.fibre_100g != null ? Math.round((food.fibre_100g) * k * 10) / 10 : null,
  };
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
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const defaultQty = useMemo(() => {
    if (initialQuantityG != null && initialQuantityG > 0) return String(Math.round(initialQuantityG));
    if (food?.serving_g) return String(Math.round(food.serving_g));
    return '100';
  }, [initialQuantityG, food?.serving_g]);

  const [quantityG, setQuantityG] = useState(defaultQty);
  const [mealSlot, setMealSlot] = useState(initialMealSlot);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuantityG(defaultQty);
    setMealSlot(initialMealSlot);
    setSubmitting(false);
    translateY.setValue(reduceMotion ? 0 : 600);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop,   { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function animateOut(then) {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdrop,   { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 600, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { then?.(); });
  }

  function handleClose() {
    animateOut(() => { onClose?.(); });
  }

  async function handleSave() {
    const qty = Number(quantityG);
    if (!qty || qty <= 0 || qty > 5000) {
      Alert.alert('Check quantity', 'Enter a quantity between 1 and 5000 g.');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ quantityG: qty, mealSlot, entryDate: initialEntryDate });
      animateOut(() => { onClose?.(); });
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Couldn\'t save', e?.message ?? 'Try again.');
    }
  }

  function handleDelete() {
    Alert.alert(
      'Remove this entry?',
      'It comes off this day\'s totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try { await onDelete?.(); } catch (_) {}
            animateOut(() => { onClose?.(); });
          },
        },
      ],
    );
  }

  const macros = macrosFor(food, Number(quantityG));

  if (!visible || !food) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={2}>{food.name}</Text>
          {food.brand ? <Text style={styles.subtitle}>{food.brand}</Text> : null}
          {food.source ? (
            <View style={styles.sourceChip}>
              <Text style={styles.sourceChipText}>{food.source.toUpperCase()}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Quantity (g)</Text>
          <TextInput
            style={styles.input}
            value={quantityG}
            onChangeText={setQuantityG}
            keyboardType="decimal-pad"
            selectTextOnFocus
            autoFocus={mode === 'add'}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <View style={styles.macroSummary}>
            <MacroPill label="kcal" value={macros.kcal} />
            <MacroPill label="P"    value={`${macros.protein}g`} />
            <MacroPill label="C"    value={`${macros.carbs}g`} />
            <MacroPill label="F"    value={`${macros.fat}g`} />
          </View>

          <Text style={styles.fieldLabel}>Meal</Text>
          <View style={styles.mealRow}>
            {MEAL_SLOTS.map(s => (
              <Pressable
                key={s.key}
                onPress={() => setMealSlot(s.key)}
                style={[
                  styles.mealBtn,
                  mealSlot === s.key && styles.mealBtnActive,
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
              <Pressable onPress={handleDelete} style={styles.deleteBtn} accessibilityLabel="Remove entry">
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            ) : null}
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={[styles.saveBtn, submitting && { opacity: 0.5 }]}
            >
              <Text style={styles.saveText}>
                {submitting ? 'Saving' : mode === 'edit' ? 'Save changes' : 'Add to diary'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  kbWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.md,
    borderTopWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.xs },
  sourceChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  sourceChipText: {
    fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.4,
  },
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
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  mealBtnActive: { borderColor: colors.primary, backgroundColor: colors.surface },
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
  saveText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
