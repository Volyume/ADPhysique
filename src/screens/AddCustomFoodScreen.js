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
import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import ModalHeader from '../components/ModalHeader';
import SectionLabel from '../components/SectionLabel';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { insertCustomFood, logFoodEntry } from '../lib/food/db';
import { queueContribution, getConsent, markScanChainCompleted } from '../lib/food/writeback';
import { checkFoodSanity } from '../lib/food/sanityChecks';
import { fieldNeedsCheck } from '../lib/food/ocrParser';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { findLocalByBarcode } from '../lib/food/sources/localCache';
import { scaleMacros } from '../lib/food/macros';
import { isValidEntryGrams } from '../lib/food/servingEntry';
import { MICRONUTRIENTS } from '../lib/food/micronutrients';
import CollapsibleSection from '../components/CollapsibleSection';


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

  // MN-1 (audit §15 item 2): optional per-100g vitamin/mineral entry, keyed by
  // nutrient key (MICRONUTRIENTS is the single source of truth for the set).
  // Every value is optional; leaving all of them blank saves exactly as
  // before this section existed (insertCustomFood/microValuesFromInput
  // already treat a missing key as null/unknown, never 0).
  const [microsOpen, setMicrosOpen] = useState(false);
  const [microInputs, setMicroInputs] = useState({});
  const setMicroValue = useCallback((key, v) => {
    setMicroInputs((prev) => ({ ...prev, [key]: v }));
  }, []);
  const micros = useMemo(() => {
    const out = {};
    for (const n of MICRONUTRIENTS) {
      const raw = microInputs[n.key];
      // Blank/whitespace stays unset (never coerced to Number('') === 0);
      // only a genuinely finite entered value is collected.
      if (raw != null && raw.trim() !== '' && Number.isFinite(Number(raw))) {
        out[n.key] = Number(raw);
      }
    }
    return out;
  }, [microInputs]);

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
    micros,
  }), [name, brand, servingG, kcal, protein, carbs, fat, fibre, prefillBarcode, micros]);

  // Hard-block non-finite / negative numbers here (audit F-006): an entry like
  // 1e400 parses to Infinity, which is >= 0, and would scale to Infinity then be
  // coerced to a silent 0-calorie diary entry downstream. "Save anyway" is only
  // for finite-but-unusual values (handled by checkFoodSanity in onSave).
  const fin = (s) => Number.isFinite(Number(s));
  const canSave = name.trim().length > 0
    && fin(kcal) && Number(kcal) >= 0
    && fin(servingG) && Number(servingG) > 0
    && fin(protein) && Number(protein) >= 0
    && fin(carbs) && Number(carbs) >= 0
    && fin(fat) && Number(fat) >= 0
    && (!fibre.trim() || (fin(fibre) && Number(fibre) >= 0));

  // L05-ACF2 (2026-07-09 design audit): a live preview of what "Eaten (g)"
  // actually works out to, scaled from the per-100g figures above, so the
  // user can sanity-check the portion before saving rather than only
  // finding out the logged kcal at save time. Display-only; never feeds
  // into what gets saved.
  const portionPreview = useMemo(() => {
    const qty = Number(quantityG);
    if (!fin(quantityG) || qty <= 0 || !fin(kcal)) return null;
    const factor = qty / 100;
    const round1 = (n) => Math.round(n * 10) / 10;
    return {
      kcal: Math.round((Number(kcal) || 0) * factor),
      protein: round1((Number(protein) || 0) * factor),
      carbs: round1((Number(carbs) || 0) * factor),
      fat: round1((Number(fat) || 0) * factor),
    };
  }, [quantityG, kcal, protein, carbs, fat]);

  async function onSave() {
    if (!canSave || saving) return;
    // FOOD-001: the amount eaten must fall inside the shared 1 to 5000 g safety
    // bound (isValidEntryGrams), the same gate FoodDetailSheet enforces, so a
    // negative, zero, blank or extreme quantity can never be logged as a diary
    // row whose weight and macros disagree. logFoodEntry re-checks this as
    // defence in depth. Blank/0 no longer silently falls back to the serving
    // size; the user is asked for a real amount.
    const qty = Number(quantityG);
    if (!isValidEntryGrams(qty)) {
      toast.show('Enter an amount between 1 and 5000 g.', { variant: 'warning' });
      return;
    }
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
        // Food audit D-6: surface that the sanity gate tripped + the user's
        // choice. Coded reason + action only, never the typed values.
        if (userId) {
          try {
            // eslint-disable-next-line global-require
            require('../lib/engineTelemetry').track(userId, 'food_sanity_check_failed', {
              reason_code: sanity.code ?? 'other',
              action: confirmed ? 'override' : 'edit',
            }).catch(() => {});
          } catch (_) {}
        }
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
      // Food audit D-6: when an OCR-prefilled food is saved with fields still
      // holding their low-confidence read (the user didn't correct them), record
      // how many, count only, no values, so OCR accuracy is measurable.
      if (userId && prefillConfidence) {
        // Bug fix (item 5 audit): these must be the full field names
        // (kcal100g etc.), the same keys prefillConfidence/prefillMacros use,
        // matching what _unsure's callers pass when rendering the amber
        // marks. The short names ('kcal', 'protein'...) never matched a
        // confidence key, so this count was always 0 and the event never
        // fired.
        const vals = {
          kcal100g: kcal, protein100g: protein, carbs100g: carbs, fat100g: fat, fibre100g: fibre,
        };
        const flagged = Object.keys(vals).filter((k) => _unsure(k, vals[k])).length;
        if (flagged > 0) {
          try {
            // eslint-disable-next-line global-require
            require('../lib/engineTelemetry').track(userId, 'ocr_low_confidence_saved', {
              fields_flagged: flagged,
              from: route?.params?.from ?? 'scan',
            }).catch(() => {});
          } catch (_) {}
        }
      }
      // Macros for the logged entry are scaled from per-100g to the actual
      // quantity logged (qty, validated above). This denormalises at log time so
      // future edits to the custom food don't rewrite history. Shared helper
      // (food review U-M2).
      await logFoodEntry(userId, {
        entryDate,
        mealSlot,
        foodRef: `custom:${customId}`,
        quantityG: qty,
        ...scaleMacros(food, qty), // { kcal, proteinG, carbsG, fatG, fibreG }
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
        // A heal chain completed, make the one-time OFF-consent card eligible
        // (offered later on the Diary, never mid-task). Fire-and-forget.
        markScanChainCompleted().catch(() => {});
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
      <ModalHeader title="New food" onClose={() => navigation.goBack()} />

      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern (same behavior prop as PlansScreen /
          ManualBuilderScreen) for consistency, no fixed footer was found
          below this scroll. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.contextLabel}>Save this food, then add it to your diary.</Text>
        {prefillBarcode ? (
          <Text style={styles.barcodeHint}>Scanned barcode: {prefillBarcode}</Text>
        ) : null}
        {dupeFood ? (
          <View style={styles.dupeBanner}>
            <Text style={styles.dupeText}>
              You've saved this barcode before as {dupeFood.name}.
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

        <SectionLabel style={styles.sectionLabelSpacing}>PER 100G</SectionLabel>
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

        <SectionLabel style={styles.sectionLabelSpacing}>QUANTITY EATEN</SectionLabel>
        <View style={styles.row}>
          <NumField label="Serving (g)" value={servingG} onChange={setServingG} suffix="g" />
          <NumField label="Eaten (g)" value={quantityG} onChange={setQuantityG} suffix="g" />
        </View>
        {/* L05-ACF3 (2026-07-09 design audit): the two gram fields sat side by
            side with no explanation of which drives what. */}
        <Text style={styles.unsureNote}>
          Serving is this food's usual portion, saved for next time. Eaten is how much you had today, logged now.
        </Text>
        {portionPreview ? (
          <Text style={styles.portionPreview}>
            {`${quantityG} g works out to ${portionPreview.kcal} kcal - P ${portionPreview.protein}g - C ${portionPreview.carbs}g - F ${portionPreview.fat}g.`}
          </Text>
        ) : null}

        {/* MN-1 (audit §15 item 2): fully optional per-100g vitamin/mineral
            entry. Collapsed by default so the common case (just the macros
            above) stays exactly as short as it always was; nothing here is
            required to save. */}
        <View style={styles.microsWrap}>
          <CollapsibleSection
            title="Vitamins and minerals (optional)"
            open={microsOpen}
            onToggle={() => setMicrosOpen((v) => !v)}
          >
            {MICRONUTRIENTS.map((n) => (
              <NumField
                key={n.key}
                label={n.label}
                value={microInputs[n.key] ?? ''}
                onChange={(v) => setMicroValue(n.key, v)}
                suffix={n.unit}
              />
            ))}
          </CollapsibleSection>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      accessibilityLabel={label}
      surface={colors.inputBg}
      containerStyle={styles.field}
    />
  );
}

function NumField({ label, value, onChange, suffix, unsure }) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder="0"
      keyboardType="decimal-pad"
      accessibilityLabel={suffix === 'g' ? `${label}, grams` : label}
      accessibilityHint={unsure ? 'Not certain, check this value' : undefined}
      surface={colors.inputBg}
      containerStyle={[styles.field, styles.numField]}
      fieldStyle={unsure && styles.numWrapUnsure}
      trailing={<Text style={styles.numSuffix}>{suffix}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
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
  dupeText: { ...type.bodySm, color: colors.textSecondary },

  sectionLabelSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm },
  microsWrap: { marginTop: spacing.lg },
  field: { marginBottom: spacing.md },
  numField: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  numSuffix: { color: colors.textMuted, fontSize: fontSize.sm, marginLeft: spacing.xs },
  numWrapUnsure: { borderColor: colors.primary },
  unsureNote: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -spacing.xs, marginBottom: spacing.sm },
  // L05-ACF2 (2026-07-09 design audit): the live portion-calorie preview.
  portionPreview: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: -spacing.xs, marginBottom: spacing.sm },

  saveBtn: { marginTop: spacing.xl },
});
