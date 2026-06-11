/**
 * AddCustomFoodScreen - the manual food entry form (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md. Lets the user create a custom_foods
 * row and log a food_entries row in one flow. Sanity-checks the
 * macros before saving (see sanityChecks.js).
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { insertCustomFood, logFoodEntry } from '../lib/food/db';
import { queueContribution, getConsent } from '../lib/food/writeback';
import { checkFoodSanity } from '../lib/food/sanityChecks';
import { fieldNeedsCheck } from '../lib/food/ocrParser';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { findLocalByBarcode } from '../lib/food/sources/localCache';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function AddCustomFoodScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();
  // Set when arriving from a barcode-scan miss. Displayed as a hint
  // so the user knows what was scanned. Persisting the barcode to
  // custom_foods is a phase 3 follow-up (needs a schema column +
  // localCache lookup extension).
  const prefillBarcode = route?.params?.prefillBarcode ?? null;
  // Prefilled by ScanLabel after OCR. Each value may be null if the
  // parser couldn't extract that field; the input fields render an
  // empty string for null so the user can fill in manually.
  const prefillMacros = route?.params?.prefillMacros ?? null;
  // Read off the front-of-pack photo by ScanLabel. Empty when the name step
  // was skipped or the read found nothing; the user types it in then.
  const prefillName = route?.params?.prefillName ?? '';
  // Per-field 'high'|'low'|'missing' from the OCR parser. A 'low' value was
  // read but couldn't be confirmed as per-100g, so we flag it amber until the
  // user edits it. null when the food wasn't scanned.
  const prefillConfidence = route?.params?.prefillConfidence ?? null;
  const _num = (v) => (v == null || !Number.isFinite(v) ? '' : String(v));
  // A field is unsure while it still holds the low-confidence value the OCR
  // prefilled. Editing it clears the flag (see fieldNeedsCheck), no extra
  // state needed.
  const _unsure = (key, current) =>
    fieldNeedsCheck(prefillConfidence?.[key], prefillMacros?.[key], current);

  const [name, setName] = useState(prefillName);
  const [brand, setBrand] = useState('');

  // COMP-022 duplicate guard: this barcode can already belong to a custom food
  // if sync pulled it (or a soft-delete was restored) after the miss routed the
  // user here. Surface it so they can log the existing food instead of making a
  // second; saving anyway is allowed (newest wins in barcode resolution).
  const [dupeFood, setDupeFood] = useState(null);
  useEffect(() => {
    if (!prefillBarcode || !userId) return;
    let cancelled = false;
    findLocalByBarcode(prefillBarcode, userId)
      .then((hit) => { if (!cancelled && hit && hit.source === 'custom') setDupeFood(hit); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prefillBarcode, userId]);
  const [servingG, setServingG] = useState(_num(prefillMacros?.servingG) || '100');
  const [kcal, setKcal] = useState(_num(prefillMacros?.kcal100g));
  const [protein, setProtein] = useState(_num(prefillMacros?.protein100g));
  const [carbs, setCarbs] = useState(_num(prefillMacros?.carbs100g));
  const [fat, setFat] = useState(_num(prefillMacros?.fat100g));
  const [fibre, setFibre] = useState(_num(prefillMacros?.fibre100g));
  const [quantityG, setQuantityG] = useState('100');
  const [saving, setSaving] = useState(false);

  const food = useMemo(() => ({
    name: name.trim(),
    brand: brand.trim() || null,
    servingG: Number(servingG) || 0,
    kcal100g: Number(kcal) || 0,
    protein100g: Number(protein) || 0,
    carbs100g: Number(carbs) || 0,
    fat100g: Number(fat) || 0,
    fibre100g: fibre.trim() ? Number(fibre) : null,
    barcodeEan: prefillBarcode || null,
  }), [name, brand, servingG, kcal, protein, carbs, fat, fibre, prefillBarcode]);

  const canSave = name.trim().length > 0 && Number(kcal) >= 0 && Number(servingG) > 0;

  async function onSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const sanity = checkFoodSanity(food);
      if (!sanity.valid) {
        const confirmed = await new Promise((resolve) => {
          appAlert(
            'Numbers look off',
            sanity.reason,
            [
              { text: 'Edit', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Save anyway', style: 'destructive', onPress: () => resolve(true) },
            ],
            { cancelable: false }
          );
        });
        if (!confirmed) { setSaving(false); return; }
      }

      const customId = await insertCustomFood(userId, food);
      audit('food.custom.create', {
        source: route?.params?.from ?? 'manual',
        hasFibre: food.fibre100g != null,
      });
      // Funnel telemetry: custom_food_created fires once per save.
      // The follow-on logFoodEntry below also fires food_logged from
      // inside food/db.js, so each custom-food save produces two
      // events: the create + the first log.
      if (userId) {
        try {
          // eslint-disable-next-line global-require
          const { track } = require('../lib/engineTelemetry');
          track(userId, 'custom_food_created', {
            source: route?.params?.from ?? 'manual',
            has_fibre: food.fibre100g != null,
          }).catch(() => {});
        } catch (_) {}
      }
      const qty = Number(quantityG) || food.servingG;
      // Macros for the logged entry are scaled from per-100g to the
      // actual quantity logged. This denormalises at log time so
      // future edits to the custom food don't rewrite history.
      const factor = qty / 100;
      await logFoodEntry(userId, {
        entryDate,
        mealSlot,
        foodRef: `custom:${customId}`,
        quantityG: qty,
        kcal:      Math.round(food.kcal100g    * factor),
        proteinG:  Math.round(food.protein100g * factor * 10) / 10,
        carbsG:    Math.round(food.carbs100g   * factor * 10) / 10,
        fatG:      Math.round(food.fat100g     * factor * 10) / 10,
        fibreG:    food.fibre100g != null ? Math.round(food.fibre100g * factor * 10) / 10 : null,
      });

      // OFF contribution (COMP-022): relocated here from ScanLabel capture so
      // it carries the values the user actually confirmed, plus name/brand.
      // queueContribution hard-gates on consent internally; the barcode check
      // keeps it to scanned-and-healed items. Fire-and-forget.
      if (food.barcodeEan) {
        try {
          if (await getConsent()) {
            await queueContribution(userId, {
              barcode: food.barcodeEan,
              name: food.name, brand: food.brand,
              kcal100g: food.kcal100g, protein100g: food.protein100g,
              carbs100g: food.carbs100g, fat100g: food.fat100g,
              fibre100g: food.fibre100g, servingG: food.servingG,
            });
          }
        } catch (_) { /* contribution is best-effort, never blocks the save */ }
        // Confirm the healing: the loop-closing reward (COMP-022).
        toast.show('Saved. Next time this barcode scans instantly.');
      }
      navigation.goBack();
    } catch (_err) {
      toast.show('Couldn\'t save. Try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New food</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.contextLabel}>Logging to {MEAL_LABELS[mealSlot] ?? 'Snacks'}</Text>
        {prefillBarcode ? (
          <Text style={styles.barcodeHint}>Scanned barcode: {prefillBarcode}</Text>
        ) : null}
        {dupeFood ? (
          <View style={styles.dupeBanner}>
            <Text style={styles.dupeText}>
              You’ve saved this barcode before as {dupeFood.name}.
            </Text>
            <Button
              title="Log that instead"
              variant="secondary"
              onPress={() => navigation.replace('FoodSearch', { mealSlot, entryDate, scannedFood: dupeFood })}
            />
          </View>
        ) : null}

        <Field label="Name" value={name} onChange={setName} placeholder="Chicken breast, raw" autoFocus />
        <Field label="Brand (optional)" value={brand} onChange={setBrand} placeholder="Tesco" />

        <Text style={styles.sectionLabel}>PER 100G</Text>
        {(_unsure('kcal100g', kcal) || _unsure('protein100g', protein)
          || _unsure('carbs100g', carbs) || _unsure('fat100g', fat)
          || _unsure('fibre100g', fibre)) ? (
          <Text style={styles.unsureNote}>Amber figures aren't certain, check them.</Text>
        ) : null}
        <View style={styles.row}>
          <NumField label="Calories" value={kcal} onChange={setKcal} suffix="kcal" unsure={_unsure('kcal100g', kcal)} />
          <NumField label="Protein" value={protein} onChange={setProtein} suffix="g" unsure={_unsure('protein100g', protein)} />
        </View>
        <View style={styles.row}>
          <NumField label="Carbs" value={carbs} onChange={setCarbs} suffix="g" unsure={_unsure('carbs100g', carbs)} />
          <NumField label="Fat" value={fat} onChange={setFat} suffix="g" unsure={_unsure('fat100g', fat)} />
        </View>
        <NumField label="Fibre (optional)" value={fibre} onChange={setFibre} suffix="g" unsure={_unsure('fibre100g', fibre)} />

        <Text style={styles.sectionLabel}>QUANTITY EATEN</Text>
        <View style={styles.row}>
          <NumField label="Serving (g)" value={servingG} onChange={setServingG} suffix="g" />
          <NumField label="Eaten (g)" value={quantityG} onChange={setQuantityG} suffix="g" />
        </View>

        <Button
          title="Save and add to diary"
          accessibilityLabel="Save food and add to diary"
          size="lg"
          loading={saving}
          disabled={!canSave}
          onPress={onSave}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        accessibilityLabel={label}
      />
    </View>
  );
}

function NumField({ label, value, onChange, suffix, unsure }) {
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.numWrap, unsure && styles.numWrapUnsure]}>
        <TextInput
          style={styles.numInput}
          value={value}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          accessibilityLabel={suffix === 'g' ? `${label}, grams` : label}
          accessibilityHint={unsure ? 'Not certain, check this value' : undefined}
        />
        <Text style={styles.numSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.title, color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  contextLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.lg },
  barcodeHint: {
    ...type.label,
    color: colors.primary,
    marginTop: -spacing.md, marginBottom: spacing.lg,
  },
  dupeBanner: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  dupeText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    ...type.body, minHeight: 48,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  numWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 48,
  },
  numInput: { flex: 1, color: colors.textPrimary, ...type.body, paddingVertical: spacing.md },
  numSuffix: { color: colors.textMuted, fontSize: fontSize.sm, marginLeft: spacing.xs },
  numWrapUnsure: { borderColor: colors.primary },
  unsureNote: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -spacing.xs, marginBottom: spacing.sm },

  saveBtn: { marginTop: spacing.xl },
});
