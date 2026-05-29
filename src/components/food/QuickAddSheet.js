import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  Animated, Easing, Platform, KeyboardAvoidingView, Keyboard, Alert,
} from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import useAppStore from '../../store/useAppStore';

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snacks' },
];

/**
 * Quick add: log a bare calorie figure (and optional protein, carbs, fat)
 * without finding a food. For meals out, a guess, or anything not worth a
 * full lookup. Mirrors FoodDetailSheet's bottom-sheet shape and motion.
 *
 * Props:
 *   visible          show / hide
 *   initialMealSlot  'breakfast' | 'lunch' | 'dinner' | 'snack'
 *   onSave           ({ kcal, protein, carbs, fat, mealSlot }) => Promise<void>
 *   onClose          () => void
 */
export default function QuickAddSheet({ visible, initialMealSlot = 'snack', onSave, onClose }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealSlot, setMealSlot] = useState(initialMealSlot);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKcal(''); setProtein(''); setCarbs(''); setFat('');
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

  // A blank macro field is allowed (it counts as 0); only kcal is required.
  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
  }

  async function handleSave() {
    const k = parseFloat(kcal);
    if (!Number.isFinite(k) || k <= 0 || k > 5000) {
      Alert.alert('Check calories', 'Enter a calorie figure between 1 and 5000.');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ kcal: Math.round(k), protein: num(protein), carbs: num(carbs), fat: num(fat), mealSlot });
      animateOut(() => { onClose?.(); });
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Couldn\'t save', e?.message ?? 'Try again.');
    }
  }

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose} statusBarTranslucent={Platform.OS === 'android'}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
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
            autoFocus
            returnKeyType="done"
          />

          <View style={styles.macroRow}>
            {[
              { label: 'Protein (g)', val: protein, set: setProtein },
              { label: 'Carbs (g)', val: carbs, set: setCarbs },
              { label: 'Fat (g)', val: fat, set: setFat },
            ].map(({ label, val, set }) => (
              <View key={label} style={styles.macroField}>
                <Text style={styles.fieldLabelSmall}>{label}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={val}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />
              </View>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Meal</Text>
          <View style={styles.mealRow}>
            {MEAL_SLOTS.map(s => (
              <Pressable
                key={s.key}
                onPress={() => setMealSlot(s.key)}
                style={[styles.mealBtn, mealSlot === s.key && styles.mealBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: mealSlot === s.key }}
              >
                <Text style={[styles.mealBtnText, mealSlot === s.key && styles.mealBtnTextActive]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={submitting} style={[styles.saveBtn, submitting && { opacity: 0.5 }]}>
              <Text style={styles.saveText}>{submitting ? 'Saving' : 'Add to diary'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: spacing.sm,
  },
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
  saveText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
