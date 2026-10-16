/**
 * AddCustomFoodScreen - the manual food entry form (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md. Lets the user create a custom_foods
 * row and log a food_entries row in one flow. Sanity-checks the
 * macros before saving (see sanityChecks.js).
 *
 * D230 4.11 (food level-up 2026-10-16): two ways to finish a new food.
 * "Save and add to diary" is the flow above. "Save the food" (secondary)
 * saves the custom food, and queues the Open Food Facts contribution as
 * before, without writing a diary entry, then closes. Both go through the
 * same unsure-figures confirm and the same sanity confirm. Editing an
 * existing food keeps its single "Save changes" (it never logs).
 *
 * D230 R15 and R18: every failure is a full sentence that says what happened
 * and what to do, and every catch that turns a failure into a toast logs its
 * cause first (logError). A figure the label scan could not read clearly is
 * marked by a dot beside its label as well as by its border, so the mark is
 * never only a colour.
 *
 * D230 R20 (lane 4B): the serving block is "Portions". The single serving
 * (name and grams) stays portion one and is still what serving_g and
 * serving_label store; "Add another portion" adds up to two more rows (a name
 * and a weight), saved to custom_foods.portions_json. A portion only changes
 * how an amount is entered; grams stay the stored truth, and every portion
 * keeps the 1 to 5000 g bound.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
// Campaign item 14 (D25): react-native-keyboard-controller outside sheets.
// KeyboardAwareScrollView replaces the ScrollView + KeyboardAvoidingView
// pair below (proper avoidance, auto-scroll to the focused field);
// KeyboardGestureArea adds cross-platform interactive (drag-to-dismiss)
// keyboard handling, matching iOS's native behaviour on Android too.
import { KeyboardAwareScrollView, KeyboardGestureArea } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, spacing, radius, type, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import ModalHeader from '../components/ModalHeader';
import SectionLabel from '../components/SectionLabel';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { insertCustomFood, updateCustomFood, getCustomFoodById, logFoodEntry } from '../lib/food/db';
import { queueContribution, getConsent, markScanChainCompleted } from '../lib/food/writeback';
import { checkFoodSanity } from '../lib/food/sanityChecks';
import { fieldNeedsCheck } from '../lib/food/ocrParser';
import { audit } from '../lib/observability';
import { logError } from '../lib/errorLog';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { findLocalByBarcode } from '../lib/food/sources/localCache';
import { scaleMacros } from '../lib/food/macros';
import Stepper from '../components/Stepper';
import {
  parsePortions, MAX_EXTRA_PORTIONS, PORTION_LABEL_MAX, PORTION_GRAMS_MIN, PORTION_GRAMS_MAX,
} from '../lib/food/portions';
import { isValidEntryGrams } from '../lib/food/servingEntry';
import { MICRONUTRIENTS } from '../lib/food/micronutrients';
import CollapsibleSection from '../components/CollapsibleSection';

// D230 R15: the dot beside a figure the label scan could not read clearly.
// 8 dp, in the quiet text colour: a mark that is not only a colour.
const UNSURE_DOT_SIZE = 8;

export default function AddCustomFoodScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();
  // CP-10 batch D (2026-07-10): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row, so an
  // unmemoised call matches ScanBarcodeScreen's own precedent.
  const t = useTheme();
  const live = buildLiveStyles(t);

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();
  // D138: opened from the More tab's edit affordance on an existing custom
  // food, rather than the create-and-log flow. Mutually exclusive with the
  // OCR prefill params below (a scan never carries editFoodId).
  const editFoodId = route?.params?.editFoodId ?? null;
  const isEditMode = !!editFoodId;
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
      .catch((e) => {
        // The duplicate hint is a convenience and never blocks the form, but
        // the cause is kept.
        logError('AddCustomFood.dupeLookup', e);
      });
    return () => { cancelled = true; };
  }, [prefillBarcode, userId]);
  // D138: a drink label reads its serving in ml, not g ("Serving size 330
  // ml"). There is no separate ml column (custom_foods stores one serving
  // figure), so it goes into serving_g exactly as an existing per-100ml
  // global food is represented (usdaToFood.js's 1 ml ~= 1 g approximation),
  // with serving_label set to 'ml' so the figure still reads honestly.
  const [servingG, setServingG] = useState(
    _num(prefillMacros?.servingG) || _num(prefillMacros?.servingMl) || '100'
  );
  // L05-ACF1 (2026-07-09 design audit): the named/household unit for the
  // Serving (g) figure above, e.g. "slice" when Serving (g) is 30 (one
  // slice = 30 g). Optional; no OCR/barcode source ever prefills it, so it
  // always starts blank. Persisted as custom_foods.serving_label, the
  // column insertCustomFood already writes (db.js:389,396) but the form
  // never populated until now.
  const [servingLabel, setServingLabel] = useState(
    (!prefillMacros?.servingG && prefillMacros?.servingMl) ? 'ml' : ''
  );
  // D230 R20: the second and third portions, as typed. A row left wholly blank
  // is ignored on save; a row with only one half filled in blocks the save
  // with a sentence under it. Grams are kept as text so a field can be empty.
  const [extraPortions, setExtraPortions] = useState([]);
  const [kcal, setKcal] = useState(_num(prefillMacros?.kcal100g));
  const [protein, setProtein] = useState(_num(prefillMacros?.protein100g));
  const [carbs, setCarbs] = useState(_num(prefillMacros?.carbs100g));
  const [fat, setFat] = useState(_num(prefillMacros?.fat100g));
  const [fibre, setFibre] = useState(_num(prefillMacros?.fibre100g));
  const [quantityG, setQuantityG] = useState('100');
  const [saving, setSaving] = useState(false);
  // Which button is busy, so only the pressed one shows its spinner.
  const [savingOnly, setSavingOnly] = useState(false);

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

  // D138 edit mode: prefill every field from the existing row. barcode_ean/
  // photo_url/notes have no form control (there was never one), so they are
  // carried through from this fetched row rather than the create flow's
  // route-param sources, so editing never silently wipes them.
  const [existingFood, setExistingFood] = useState(null);
  useEffect(() => {
    if (!isEditMode || !userId) return;
    let cancelled = false;
    getCustomFoodById(editFoodId, userId)
      .then((row) => {
        if (cancelled || !row) return;
        setExistingFood(row);
        setName(row.name ?? '');
        setBrand(row.brand ?? '');
        setServingG(_num(row.serving_g) || '100');
        setServingLabel(row.serving_label ?? '');
        setExtraPortions(parsePortions(row.portions_json).slice(0, MAX_EXTRA_PORTIONS)
          .map((p) => ({ label: p.label, grams: String(p.grams) })));
        setKcal(_num(row.kcal_100g));
        setProtein(_num(row.protein_100g));
        setCarbs(_num(row.carbs_100g));
        setFat(_num(row.fat_100g));
        setFibre(_num(row.fibre_100g));
        const microState = {};
        for (const n of MICRONUTRIENTS) {
          const v = row[n.column];
          if (v != null) microState[n.key] = String(v);
        }
        setMicroInputs(microState);
        setMicrosOpen(Object.keys(microState).length > 0);
      })
      .catch((e) => {
        logError('AddCustomFood.loadFood', e, { hasId: !!editFoodId });
        if (!cancelled) toast.show('That food did not load. Try again in a moment.', { variant: 'error' });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editFoodId, userId]);

  const food = useMemo(() => ({
    name: name.trim(),
    brand: brand.trim() || null,
    servingG: Number(servingG) || 0,
    servingLabel: servingLabel.trim() || null,
    portions: extraPortions.filter((p) => portionRowState(p) === 'ok')
      .map((p) => ({ label: p.label.trim(), grams: Number(p.grams) })),
    kcal100g: Number(kcal) || 0,
    protein100g: Number(protein) || 0,
    carbs100g: Number(carbs) || 0,
    fat100g: Number(fat) || 0,
    fibre100g: fibre.trim() ? Number(fibre) : null,
    barcodeEan: isEditMode ? (existingFood?.barcode_ean ?? null) : (prefillBarcode || null),
    photoUrl: isEditMode ? (existingFood?.photo_url ?? null) : null,
    notes: isEditMode ? (existingFood?.notes ?? null) : null,
    micros,
  }), [name, brand, servingG, servingLabel, extraPortions, kcal, protein, carbs, fat, fibre, prefillBarcode, micros, isEditMode, existingFood]);

  // Hard-block non-finite / negative numbers here (audit F-006): an entry like
  // 1e400 parses to Infinity, which is >= 0, and would scale to Infinity then be
  // coerced to a silent 0-calorie diary entry downstream. "Save anyway" is only
  // for finite-but-unusual values (handled by checkFoodSanity in onSave).
  const fin = (s) => Number.isFinite(Number(s));
  const canSave = name.trim().length > 0
    && fin(kcal) && Number(kcal) >= 0
    && fin(servingG) && Number(servingG) > 0 && Number(servingG) <= PORTION_GRAMS_MAX
    && extraPortions.every((p) => portionRowState(p) !== 'bad')
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
    // L05-ACF1: when a named serving is set (e.g. "slice" at 30 g), fold it
    // into the existing preview as a multiple ("2 x slice") alongside the
    // grams, rather than adding a second preview line.
    const label = servingLabel.trim();
    const sG = Number(servingG);
    const unitPrefix = (label && fin(servingG) && sG > 0)
      ? ` (${round1(qty / sG)} x ${label})`
      : '';
    return {
      kcal: Math.round((Number(kcal) || 0) * factor),
      protein: round1((Number(protein) || 0) * factor),
      carbs: round1((Number(carbs) || 0) * factor),
      fat: round1((Number(fat) || 0) * factor),
      unitPrefix,
    };
  }, [quantityG, kcal, protein, carbs, fat, servingG, servingLabel]);

  // D138: editing an existing custom food only ever updates the food row --
  // it never logs a new diary entry, so this skips the eaten-amount gate and
  // the create-flow's log/contribution steps entirely. Logged entries keep
  // their own already-scaled macros (see updateCustomFood's doc comment in
  // db.js), so this changes only future logs of the food.
  async function onSaveEdit() {
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
      await updateCustomFood(userId, editFoodId, food);
      audit('food.custom.update', { hasFibre: food.fibre100g != null });
      toast.show('Food updated.');
      navigation.goBack();
    } catch (e) {
      logError('AddCustomFood.updateFood', e, { hasId: !!editFoodId });
      toast.show('That food was not saved. Try again in a moment.', { variant: 'error' });
      setSaving(false);
    }
  }

  // `log: true` is "Save and add to diary"; `log: false` is "Save the food"
  // (D230 4.11): the same food row, the same confirms, no diary entry.
  async function saveFood({ log }) {
    if (!canSave || saving) return;
    if (isEditMode) return onSaveEdit();
    // FOOD-001: the amount eaten must fall inside the shared 1 to 5000 g safety
    // bound (isValidEntryGrams), the same gate FoodDetailSheet enforces, so a
    // negative, zero, blank or extreme quantity can never be logged as a diary
    // row whose weight and macros disagree. logFoodEntry re-checks this as
    // defence in depth. Blank/0 no longer silently falls back to the serving
    // size; the user is asked for a real amount.
    const qty = Number(quantityG);
    // Saving the food alone logs nothing, so the amount eaten is not asked for.
    if (log && !isValidEntryGrams(qty)) {
      toast.show('Enter an amount between 1 and 5000 g.', { variant: 'warning' });
      return;
    }
    setSavingOnly(!log);
    setSaving(true);
    try {
      // D138: a prefilled low-confidence field the user never touched must
      // never save silently -- ask first, the same appAlert confirm pattern
      // the sanity gate just below already uses, so the choice is the
      // user's, not a lost guess.
      if (prefillConfidence) {
        const vals = { kcal100g: kcal, protein100g: protein, carbs100g: carbs, fat100g: fat, fibre100g: fibre };
        const stillUnsure = Object.keys(vals).some((k) => _unsure(k, vals[k]));
        if (stillUnsure) {
          const proceed = await new Promise((resolve) => {
            appAlert(
              "Some figures were not read clearly",
              'Save anyway?',
              [
                { text: 'Check first', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Save anyway', style: 'destructive', onPress: () => resolve(true) },
              ],
              { cancelable: false }
            );
          });
          if (!proceed) { setSaving(false); return; }
        }
      }

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
            }).catch(() => {}); // telemetry only, never blocks the save
          } catch (_) { /* telemetry only, never blocks the save */ }
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
          }).catch(() => {}); // telemetry only, never blocks the save
        } catch (_) { /* telemetry only, never blocks the save */ }
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
            }).catch(() => {}); // telemetry only, never blocks the save
          } catch (_) { /* telemetry only, never blocks the save */ }
        }
      }
      // Macros for the logged entry are scaled from per-100g to the actual
      // quantity logged (qty, validated above). This denormalises at log time so
      // future edits to the custom food don't rewrite history. Shared helper
      // (food review U-M2).
      if (log) {
        await logFoodEntry(userId, {
          entryDate,
          mealSlot,
          foodRef: `custom:${customId}`,
          quantityG: qty,
          ...scaleMacros(food, qty), // { kcal, proteinG, carbsG, fatG, fibreG }
        });
      }

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
        } catch (e) {
          // Contribution is best-effort and never blocks the save; the cause
          // is kept (no barcode, no food name).
          logError('AddCustomFood.queueContribution', e);
        }
        // A heal chain completed, make the one-time OFF-consent card eligible
        // (offered later on the Diary, never mid-task). Fire-and-forget.
        markScanChainCompleted().catch((e) => {
          logError('AddCustomFood.markScanChainCompleted', e);
        });
        // Confirm the healing: the loop-closing reward (COMP-022).
        toast.show('Saved. Next time this barcode scans instantly.');
      } else if (!log) {
        // Saving the food alone writes no diary row, so say it is kept.
        toast.show('Food saved. You can add it to your diary any time.');
      }
      navigation.goBack();
    } catch (e) {
      logError('AddCustomFood.save', e, { logged: log, scanned: !!prefillBarcode });
      toast.show('That food was not saved. Try again in a moment.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const onSaveAndLog = () => saveFood({ log: true });
  const onSaveOnly = () => saveFood({ log: false });
  const busyLog = saving && !savingOnly;
  const busyOnly = saving && savingOnly;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ModalHeader title={isEditMode ? 'Edit food' : 'New food'} onClose={() => navigation.goBack()} />

      {/* L03-C5 (2026-07-09 design audit) originally standardised this on the
          app's KeyboardAvoidingView pattern (same behavior prop as
          PlansScreen/ManualBuilderScreen); campaign item 14 (D25) replaces it
          here with the keyboard-controller equivalent — proper avoidance
          plus interactive dismiss, no fixed footer below this scroll. */}
      <KeyboardGestureArea interpolator="ios" style={styles.keyboardAvoid}>
      <KeyboardAwareScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: t.screenPadding }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.contextLabel, live.contextLabel]}>
          {isEditMode ? 'Edit this food\'s details.' : 'Save this food, then add it to your diary.'}
        </Text>
        {/* D138: historical integrity, one line -- an edit must never look
            like it silently rewrites what was already logged. */}
        {isEditMode ? (
          <Text style={[styles.unsureNote, live.unsureNote]}>
            Logged entries keep the numbers they were logged with. This changes only future logs of this food.
          </Text>
        ) : null}
        {prefillBarcode ? (
          <Text style={[styles.barcodeHint, live.barcodeHint]}>Scanned barcode: {prefillBarcode}</Text>
        ) : null}
        {dupeFood ? (
          <View style={[styles.dupeBanner, live.dupeBanner]}>
            <Text style={[styles.dupeText, live.dupeText]}>
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

        <SectionLabel style={styles.sectionLabelSpacing}>Per 100 g</SectionLabel>
        {(_unsure('kcal100g', kcal) || _unsure('protein100g', protein)
          || _unsure('carbs100g', carbs) || _unsure('fat100g', fat)
          || _unsure('fibre100g', fibre)) ? (
          <Text style={[styles.unsureNote, live.unsureNote]}>The figures marked with a dot were hard to read. Check them before you save.</Text>
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

        <SectionLabel style={styles.sectionLabelSpacing}>Portions</SectionLabel>
        {/* L05-ACF1 (2026-07-09 design audit): name the Serving (g) amount as
            a household unit ("slice", "cup", "tin"), stored as
            custom_foods.serving_label alongside the gram figure. Optional;
            leaving it blank saves exactly as before this field existed. This
            is portion one (D230 R20). */}
        <Field
          label="Serving name (optional)"
          value={servingLabel}
          onChange={setServingLabel}
          placeholder="e.g. slice, cup, tin"
        />
        <NumField label="Serving (g)" value={servingG} onChange={setServingG} suffix="g" />
        {extraPortions.map((p, index) => (
          <PortionRow
            key={index}
            number={index + 2}
            portion={p}
            onChange={(next) => setExtraPortions((list) => list.map((x, i) => (i === index ? next : x)))}
            onRemove={() => setExtraPortions((list) => list.filter((_, i) => i !== index))}
          />
        ))}
        {extraPortions.length < MAX_EXTRA_PORTIONS ? (
          <Button
            title="Add another portion"
            accessibilityLabel="Add another portion, such as 1 slice or 1 mug"
            variant="tertiary"
            onPress={() => setExtraPortions((list) => [...list, { label: '', grams: '' }])}
            style={styles.addPortionBtn}
          />
        ) : null}
        {/* D138: editing a food's own details logs nothing, so the "Eaten"
            amount (today's log quantity, not part of the food itself) has no
            place here. */}
        {isEditMode ? null : (
          <>
            <SectionLabel style={styles.sectionLabelSpacing}>Quantity eaten</SectionLabel>
            <NumField label="Eaten (g)" value={quantityG} onChange={setQuantityG} suffix="g" />
            {/* L05-ACF3 (2026-07-09 design audit): the two gram fields need
                an explanation of which drives what. */}
            <Text style={[styles.unsureNote, live.unsureNote]}>
              The first portion is this food's usual portion, saved for next time. Eaten is how much you had today, logged now.
            </Text>
            {portionPreview ? (
              <Text style={[styles.portionPreview, live.portionPreview]}>
                {`${quantityG} g${portionPreview.unitPrefix} works out to ${portionPreview.kcal} kcal - P ${portionPreview.protein}g - C ${portionPreview.carbs}g - F ${portionPreview.fat}g.`}
              </Text>
            ) : null}
          </>
        )}

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
          title={isEditMode ? 'Save changes' : 'Save and add to diary'}
          accessibilityLabel={isEditMode ? 'Save changes to food' : 'Save food and add to diary'}
          size="lg"
          loading={busyLog}
          disabled={!canSave || busyOnly}
          onPress={onSaveAndLog}
          style={styles.saveBtn}
        />
        {/* D230 4.11: the way to keep a new food without logging it (before
            this, every new food was logged the moment it was saved). */}
        {isEditMode ? null : (
          <Button
            title="Save the food"
            accessibilityLabel="Save the food without adding it to the diary"
            variant="secondary"
            size="lg"
            loading={busyOnly}
            disabled={!canSave || busyLog}
            onPress={onSaveOnly}
            style={styles.saveOnlyBtn}
          />
        )}
      </KeyboardAwareScrollView>
      </KeyboardGestureArea>
    </SafeAreaView>
  );
}

// D230 R20: one extra portion row's state. 'blank' (both halves empty, ignored
// on save), 'ok' (a name of 1 to 24 characters and whole or decimal grams from
// 1 to 5000) or 'bad' (anything in between, which blocks the save).
function portionRowState(p) {
  const label = (p?.label ?? '').trim();
  const gramsText = String(p?.grams ?? '').trim();
  if (!label && !gramsText) return 'blank';
  const grams = Number(gramsText);
  if (label.length >= 1 && label.length <= PORTION_LABEL_MAX
    && gramsText !== '' && Number.isFinite(grams)
    && grams >= PORTION_GRAMS_MIN && grams <= PORTION_GRAMS_MAX) return 'ok';
  return 'bad';
}

function PortionRow({ number, portion, onChange, onRemove }) {
  const t = useTheme();
  const state = portionRowState(portion);
  const labelError = state === 'bad' && !portion.label.trim()
    ? 'Give this portion a name, such as 1 slice.' : undefined;
  const gramsNumber = Number(portion.grams);
  const gramsError = state === 'bad' && portion.label.trim()
    && !(Number.isFinite(gramsNumber) && gramsNumber >= PORTION_GRAMS_MIN && gramsNumber <= PORTION_GRAMS_MAX && String(portion.grams).trim() !== '')
    ? `Enter a weight between ${PORTION_GRAMS_MIN} and ${PORTION_GRAMS_MAX} g.` : undefined;
  return (
    <View style={styles.portionCard} testID={`portion-row-${number}`}>
      <TextField
        label={`Portion ${number} name`}
        value={portion.label}
        onChangeText={(v) => onChange({ ...portion, label: v })}
        placeholder="e.g. 1 slice, 1 mug, 1 tbsp"
        maxLength={PORTION_LABEL_MAX}
        accessibilityLabel={`Portion ${number} name`}
        surface={t.colors.inputBg}
        containerStyle={styles.field}
        error={labelError}
      />
      <Stepper
        value={Number.isFinite(gramsNumber) ? gramsNumber : 0}
        onChange={(next) => onChange({ ...portion, grams: String(next) })}
        min={PORTION_GRAMS_MIN}
        max={PORTION_GRAMS_MAX}
        step={10}
        label={`Portion ${number} weight`}
        decreaseLabel="Less"
        increaseLabel="More"
        style={styles.portionStepper}
        centre={(
          <TextField
            size="sm"
            containerStyle={styles.portionGramsField}
            inputStyle={styles.portionGramsInput}
            value={portion.grams}
            onChangeText={(v) => onChange({ ...portion, grams: v.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder="0"
            accessibilityLabel={`Portion ${number} weight, grams`}
            surface={t.colors.inputBg}
            error={gramsError}
            trailing={<Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.sm }}>g</Text>}
          />
        )}
      />
      <Button
        title="Remove this portion"
        accessibilityLabel={`Remove portion ${number}`}
        variant="outline"
        onPress={onRemove}
        style={styles.removePortionBtn}
      />
    </View>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }) {
  // CP-10 batch D (2026-07-10): Field is a sibling function-component scope
  // (not prop-drilled `live`/`t` from AddCustomFoodScreen, it is called from
  // several places in one render), so its own useTheme() call is cleaner
  // than threading two extra props through. Same shared buildLiveStyles(t)
  // as the parent screen.
  const t = useTheme();
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      accessibilityLabel={label}
      surface={t.colors.inputBg}
      containerStyle={styles.field}
    />
  );
}

function NumField({ label, value, onChange, suffix, unsure }) {
  // CP-10 batch D (2026-07-10): same rationale as Field above, own useTheme()
  // call rather than prop-drilling.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <TextField
      label={unsure ? (
        // D230 R15: a dot beside the label as well as the border, so the mark
        // is never only a colour.
        <>
          {label}{' '}
          <Ionicons
            name="ellipse"
            size={UNSURE_DOT_SIZE}
            color={t.colors.textSecondary}
            accessibilityLabel="hard to read"
          />
        </>
      ) : label}
      value={value}
      onChangeText={onChange}
      placeholder="0"
      keyboardType="decimal-pad"
      accessibilityLabel={suffix === 'g' ? `${label}, grams` : label}
      accessibilityHint={unsure ? 'Hard to read. Check this value.' : undefined}
      surface={t.colors.inputBg}
      containerStyle={[styles.field, styles.numField]}
      fieldStyle={unsure && [styles.numWrapUnsure, live.numWrapUnsure]}
      trailing={<Text style={[styles.numSuffix, live.numSuffix]}>{suffix}</Text>}
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
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle,
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
  portionPreview: { color: colors.textPrimary, fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, marginTop: -spacing.xs, marginBottom: spacing.sm },

  // D230 R20: an extra portion's card, its weight Stepper (the typed field is
  // the Stepper's centre) and its 48 dp remove control.
  portionCard: { marginBottom: spacing.md },
  portionStepper: { alignSelf: 'stretch' },
  portionGramsField: { flexGrow: 1 },
  portionGramsInput: { textAlign: 'center' },
  addPortionBtn: { marginBottom: spacing.md },
  removePortionBtn: { marginTop: spacing.sm, minHeight: 48 },

  saveBtn: { marginTop: spacing.xl },
  saveOnlyBtn: { marginTop: spacing.md },
});

// CP-10 batch D (2026-07-10): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this file's three function-component scopes (AddCustomFoodScreen,
// Field, NumField) so they can never drift out of step with each other or
// the frozen block. Pure layout keys (flex/gap/padding/width, no token) are
// correctly omitted -- there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    contextLabel: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    barcodeHint: { ...t.type.label, color: t.colors.primary },
    dupeBanner: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    dupeText: { ...t.type.bodySm, color: t.colors.textSecondary },
    numSuffix: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    numWrapUnsure: { borderColor: t.colors.primary },
    unsureNote: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    portionPreview: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
  };
}
