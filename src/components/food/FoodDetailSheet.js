import { useEffect, useMemo, useState } from 'react';
import { appAlert } from '../AppAlert';
import { View, StyleSheet, Pressable } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import BottomSheet from '../BottomSheet';
// M4 (audit 03b §3.3b): the save CTA rides the Button primitive's
// idle → loading → success morph; the commit haptic is its success beat.
import Button from '../Button';
import Chip from '../Chip';
import CollapsibleSection from '../CollapsibleSection';
import SectionLabel from '../SectionLabel';
import Stepper from '../Stepper';
import TextField from '../TextField';
import SourceChip from './SourceChip';
import { useToast } from '../Toast';
import { pickerMealSlots, mealSlotLabel } from '../../lib/food/mealSlots';
import { scaleMacros, scaleSugarG, scaleSodiumMg, saltGFromSodiumMg } from '../../lib/food/macros';
import {
  buildServingUnits, initialServingState, resolveGrams, isValidEntryGrams, MAX_ENTRY_GRAMS,
} from '../../lib/food/servingEntry';
import { parseDecimalInput } from '../../lib/parseDecimalInput';
import { isNetworkSourced, formatLastVerified } from '../../lib/food/freshness';
import { refetchStaleFood } from '../../lib/food/waterfall';
import { defaultWeightStateFor } from '../../lib/food/foodRoles';
import { entryDateLine } from '../../lib/food/diaryDates';
import { parseLocalDay } from '../../lib/dayKey';
import EatenTimePicker from './EatenTimePicker';
// Ultimate-Audit item 16 (MN-1), D22 16b: separate file, see its own header
// for why (another agent's WIP was live in this file at build time).
import MicronutrientDetail from './MicronutrientDetail';
import { touchTarget } from '../../styles/layout';

// Ultimate-Audit item 12 (raw/cooked basis toggle): the curated food key
// behind a food_ref, or null for anything that isn't a curated staple
// (global/custom/quick-add foods have no dry/cooked classification and
// never show the choice). Mirrors the 'curated:' prefix resolveFoodRef uses
// (src/lib/food/sources/localCache.js).
function curatedKeyOf(food) {
  const ref = food?.food_ref;
  return typeof ref === 'string' && ref.startsWith('curated:') ? ref.slice(8) : null;
}

// Display-shaped wrapper over the shared scaling helper (food review U-M2):
// the preview render reads .protein/.carbs/.fat, the engine returns .*G.
function macrosFor(food, qtyG) {
  const m = scaleMacros(food, qtyG);
  return { kcal: m.kcal, protein: m.proteinG, carbs: m.carbsG, fat: m.fatG, fibre: m.fibreG };
}

// D230 R5: the day line is diaryDates' entryDateLine, shared with the add
// screen; re-exported here for this sheet's own suite.
export { entryDateLine };

// D230 R8: the one line of what this amount is. Each part keeps its words
// together (no-break spaces inside a part), so at large text the line wraps
// between parts, never inside "8 g protein".
const NBSP = '\u00A0';
const keepTogether = (part) => part.replace(/ /g, NBSP);
const gramsWord = (n) => (n === 1 ? 'gram' : 'grams');

/**
 * Bottom sheet for adding or editing a food entry. Replaces the
 * centred Modal pattern in FoodSearchScreen and the long-press-delete
 * footgun on Diary entries.
 *
 * D230 R8 (docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md,
 * 4.5): five blocks at open, in this order: (1) the title (a heading) with
 * the brand and the source chip on one line beneath it; (2) Amount: the
 * unit chips, the house Stepper with the typed field beside it (Stepper has
 * no custom centre, and its adjustable root hides its children from a
 * screen reader, so the field sits beside a Stepper whose value mirrors it),
 * then "= 72 g" for a serving; (3) one line of what this amount is; (4) the
 * day line when it is not today, the meal chips, and in edit mode "Eaten
 * at"; (5) the actions, the primary reading "Add to <meal>" in add mode.
 * A collapsed "More about this food" row (closed on every open) holds the
 * last-verified line, the weigh-basis chips, sugar, salt and the vitamins
 * and minerals. The sheet scrolls, so no block relies on the window cap at
 * the largest text size.
 *
 * Props:
 *   visible          show / hide
 *   food             { name, brand, source, kcal_100g, protein_100g, ... }
 *   initialQuantityG default quantity (food.serving_g for add, entry.quantity_g for edit)
 *   initialMealSlot  'breakfast' | 'lunch' | 'dinner' | 'snack'
 *   initialEntryDate yyyy-mm-dd
 *   mode             'add' | 'edit'
 *   initialWeightState 'as_weighed' | 'raw' | 'cooked' (edit mode: the
 *                    entry's current basis label; Ultimate-Audit item 12)
 *   initialEatenAt   ms epoch or null (edit mode: the entry's current
 *                    "time eaten", Ultimate-Audit item 15, D22 15b). Add
 *                    mode never shows this field -- a fresh log stamps
 *                    eaten_at = now automatically (see src/lib/food/db.js
 *                    logFoodEntry), keeping the fast add path unchanged.
 *   onSave           ({ quantityG, mealSlot, entryDate, weightState, eatenAt }) => Promise<void>
 *                    (eatenAt is only ever sent in edit mode; add-mode
 *                    callers can ignore it, it is undefined)
 *   onDelete         () => Promise<void>  (edit mode only)
 *   onSelectEntries  () => void  (edit mode only; optional). Discoverability
 *                    audit 2026-08-10, Phase 10 finding #2: multi-select
 *                    (move to another meal / copy to today / save as a meal)
 *                    was reachable only through an undisclosed long press on
 *                    a diary row. This gives a visible route into the same
 *                    selection mode from the sheet a normal tap already
 *                    opens, with this entry pre-selected. The caller owns
 *                    entering selection state (DiaryScreen's enterSelection);
 *                    this sheet only asks for it.
 *   onClose          () => void
 *   saveTitle        optional: the save button's words when the sheet is
 *                    changing an amount for a caller that writes later (the
 *                    typed line's review, D230 R13: "Use this amount"), so
 *                    it never says "Add to Breakfast" when nothing is added.
 */
export default function FoodDetailSheet({
  visible, food, mode = 'add',
  initialQuantityG, initialMealSlot = 'snack', initialEntryDate, initialWeightState, initialEatenAt = null,
  onSave, onDelete, onSelectEntries, onClose, saveTitle = null,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id ?? null);
  // Energy DISPLAY unit (kcal | kj). Display-only: macros.kcal stays kcal (the
  // stored/scaled value scaleMacros returns); only the rendered energy number +
  // label convert at the point of display.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  // gap #16: which extra per-food nutrients to surface. All default on; all
  // display-only (never a target or total). D230 R8: the sodium toggle now
  // governs the salt line (salt is sodium x 2.5, as UK packs print it).
  const showFibre = useAppStore((s) => s.accessibility?.showFibre !== false);
  const showSugar = useAppStore((s) => s.accessibility?.showSugar !== false);
  const showSodium = useAppStore((s) => s.accessibility?.showSodium !== false);
  // Pre/Post-workout picker options are opt-in (off by default, 2026-07-11
  // fix): mirrors the DiaryScreen/MealPlanScreen "Around training" gate so
  // this sheet never offers a slot the diary itself keeps hidden.
  const periWorkoutSlots = useAppStore((s) => !!s.userProfile?.mealPlanPeriWorkout);
  // Serving model (food ease, MFP/Cronometer parity): prefer the food's own
  // household serving (e.g. "1 cup", "1 slice") so the common case is RECOGNITION,
  // not gram arithmetic, the list row already shows serving_label, we keep it
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
  // M4 (audit 03b §3.3b): the save has landed; the sheet closes on the save
  // Button's onSettled so the checkmark beat is seen before the sheet goes.
  const [saved, setSaved] = useState(false);
  // D230 R8: "More about this food" is closed on every open.
  const [moreOpen, setMoreOpen] = useState(false);

  // Ultimate-Audit item 12 (raw/cooked basis toggle). Only curated foods with
  // a dry/cooked distinction show the choice (foodRoles.hasWeightChoice via
  // defaultWeightStateFor returning non-null); ready-state foods and every
  // global/custom/quick-add food never show it. Edit mode opens on the
  // entry's own saved label when it is a real choice; otherwise (add mode, or
  // no prior label) it opens pre-selected to the food's native basis, so an
  // untouched item keeps exactly today's meaning. This never changes grams or
  // macros -- see foodRoles.js defaultWeightStateFor for the founder ruling
  // this pins (store the basis, no conversion).
  const curatedKey = curatedKeyOf(food);
  const nativeWeightState = curatedKey ? defaultWeightStateFor(curatedKey) : null;
  const showWeightChoice = nativeWeightState != null;
  const initialWeight = (mode === 'edit' && (initialWeightState === 'raw' || initialWeightState === 'cooked'))
    ? initialWeightState
    : nativeWeightState;
  const [weightState, setWeightState] = useState(initialWeight);

  // Ultimate-Audit item 15 (D22 15b): the calm, optional "eaten at" field.
  // Edit mode only -- a fresh log already stamps eaten_at = now, so add
  // mode never shows this (the fast add path, and its TAP_BUDGET, are
  // unchanged). null means "no time set" (e.g. a bulk-confirmed entry,
  // D22 15b's honest untimed state); the user may set one, or clear a time
  // back to null if they realise they do not know it either.
  const [eatenAt, setEatenAt] = useState(mode === 'edit' ? (Number.isFinite(initialEatenAt) ? initialEatenAt : null) : null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const unit = units.find(u => u.key === unitKey) || units[units.length - 1];
  const isServing = unitKey === 'serving';
  // D230 R8 (inventory section 6, decimal comma): the typed amount is read
  // through the app's one number parser, so "1,5" from a comma-decimal
  // keyboard means 1.5, never 15. resolveGrams takes the parsed number as it
  // always has; the 1 to 5000 g bound (isValidEntryGrams) is untouched.
  const parsedAmount = parseDecimalInput(amount);
  const amountValue = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const quantityG = resolveGrams(parsedAmount, unit);
  // The Stepper's bounds are servingEntry's own: never below 1 g and never
  // above MAX_ENTRY_GRAMS, expressed in the chosen unit on the 0.1 grid the
  // amount is rounded to.
  const unitGrams = Number(unit?.grams) || 1;
  const stepMin = isServing ? Math.ceil((1 / unitGrams) * 10) / 10 : 1;
  const stepMax = isServing ? Math.floor((MAX_ENTRY_GRAMS / unitGrams) * 10) / 10 : MAX_ENTRY_GRAMS;

  useEffect(() => {
    if (!visible) return;
    setUnitKey(initial.unitKey);
    setAmount(initial.amount);
    setMealSlot(initialMealSlot);
    setWeightState(initialWeight);
    setEatenAt(mode === 'edit' ? (Number.isFinite(initialEatenAt) ? initialEatenAt : null) : null);
    setShowTimePicker(false);
    setSubmitting(false);
    setSaved(false);
    setMoreOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, curatedKey]);

  // Combine the chosen clock time with the entry's own calendar day
  // (initialEntryDate), never inventing a different day. Falls back to
  // stamping just the picked Date if the day fails to parse (should not
  // happen: initialEntryDate is always a valid local day-key).
  function onPickEatenTime(date) {
    const day = parseLocalDay(initialEntryDate);
    if (Number.isNaN(day.getTime())) {
      setEatenAt(date.getTime());
    } else {
      day.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setEatenAt(day.getTime());
    }
    setShowTimePicker(false);
  }

  // Opportunistic re-fetch (audit §15 item 4): viewing a promoted off/usda
  // food whose foods.fetched_at ("last verified") is past the staleness
  // threshold triggers a silent, best-effort refresh from its source. Fire
  // and forget: never awaited, never blocks the sheet, and any failure
  // leaves the cached row (and this render) exactly as it was.
  useEffect(() => {
    if (!visible || !food?.food_ref) return;
    refetchStaleFood(userId, food).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, food?.food_ref, food?.fetched_at]);

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

  // The Stepper steps 0.5 serving or 10 g, as the hand-rolled buttons did;
  // its clamp has already applied the bounds above.
  function onStepAmount(next) {
    haptics.selection();
    setAmount(String(Math.round(next * 10) / 10));
  }

  // The Stepper's centre mirrors the typed field (two decimals at most, so a
  // typed 1.25 reads as 1.25, and floating-point noise never shows).
  function formatAmount(v) {
    const n = Math.round(v * 100) / 100;
    if (isServing) return `${n} ${n === 1 ? 'serving' : 'servings'}`;
    return `${n} g`;
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
      // showWeightChoice false -> weightState is null (no basis to record for
      // this food, e.g. it's 'ready'-state or not a curated staple); the
      // caller/db layer falls back to 'as_weighed'. eatenAt is only ever sent
      // in edit mode (Ultimate-Audit item 15, D22 15b); add-mode callers
      // receive undefined and the db layer's own "log now" default applies.
      await onSave({
        quantityG: qty, mealSlot, entryDate: initialEntryDate, weightState,
        eatenAt: mode === 'edit' ? eatenAt : undefined,
      });
      setSaved(true);
    } catch (_e) {
      setSubmitting(false);
      // R15: what happened, then what to do, as a full sentence.
      toast.show('That entry was not saved. Try again in a moment.', { variant: 'error' });
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
            // Haptics completion pass (2026-07-10): data-first, mirrors
            // DiaryScreen.requestDelete -- the commit beat fires only after
            // the delete actually succeeds, never on a swallowed failure.
            try { await onDelete?.(); haptics.commit(); } catch (_) {}
            onClose?.();
          },
        },
      ],
    );
  }

  const macros = macrosFor(food, quantityG);
  // D230 R8: the one line of what this amount is, replacing the four macro
  // pills. Fibre joins it when the food carries the datum (null = "no data",
  // never a fake 0) and the Display toggle is on. The spoken label says the
  // same things in full words.
  const energyValue = toEnergy(macros.kcal, energyUnit);
  const energySpoken = energyUnit === 'kj'
    ? (energyValue === 1 ? 'kilojoule' : 'kilojoules')
    : (energyValue === 1 ? 'calorie' : 'calories');
  const fibreShown = showFibre && macros.fibre != null;
  const summaryLine = [
    `${energyValue} ${energyUnitLabel(energyUnit)}`,
    `${macros.protein} g protein`,
    `${macros.carbs} g carbs`,
    `${macros.fat} g fat`,
    fibreShown ? `${macros.fibre} g fibre` : null,
  ].filter(Boolean).map(keepTogether).join(' · ');
  const summarySpoken = [
    `${energyValue} ${energySpoken}`,
    `${macros.protein} ${gramsWord(macros.protein)} protein`,
    `${macros.carbs} ${gramsWord(macros.carbs)} carbs`,
    `${macros.fat} ${gramsWord(macros.fat)} fat`,
    fibreShown ? `${macros.fibre} ${gramsWord(macros.fibre)} fibre` : null,
  ].filter(Boolean).join(', ');
  // Extra per-food nutrients (gap #16), now inside "More about this food":
  // shown only when the food actually carries the datum and the user keeps
  // the toggle on. Display-only, not logged, not totalled, not scored.
  const sugarG = showSugar ? scaleSugarG(food, quantityG) : null;
  // E4: sodium scales in mg (stored grams per 100g; implausible values read
  // as no data inside the scaler). D230 R8: shown as salt, sodium x 2.5, the
  // figure UK packs print; the sodium figure stays in the spoken label.
  const sodiumMg = showSodium ? scaleSodiumMg(food, quantityG) : null;
  const saltG = sodiumMg != null ? saltGFromSodiumMg(sodiumMg) : null;
  // D230 R5: the day being logged to, when it is not today.
  const dateLine = entryDateLine(initialEntryDate);

  if (!food) return null;

  // Audit §15 item 4: a calm "last verified" line for network-sourced
  // (off/usda) rows only, reusing foods.fetched_at. Never implies the food
  // is wrong -- it only states when it was last checked.
  const lastVerified = isNetworkSourced(food.source) && food.fetched_at
    ? formatLastVerified(food.fetched_at)
    : null;

  return (
    <>
    <BottomSheet visible={visible} onClose={handleClose} keyboardAvoiding scroll accessibilityLabel={food.name}>
          {/* (1) The title, a heading, with the brand and the source on one
              line beneath it. A6: the shared SourceChip carries CoFID's
              verified treatment and every source's gloss at the point of use. */}
          <View style={styles.block} testID="food-sheet-title">
            <Text accessibilityRole="header" style={[styles.title, live.title]} numberOfLines={2}>{food.name}</Text>
            {food.brand || food.source ? (
              <View style={styles.titleMeta}>
                {food.brand ? <Text style={[styles.brand, live.brand]} numberOfLines={1}>{food.brand}</Text> : null}
                {food.source ? <SourceChip source={food.source} /> : null}
              </View>
            ) : null}
          </View>

          {/* (2) Amount. The common case, one named serving, needs zero
              keystrokes: step it, type it, or just add it. */}
          <View style={styles.block} testID="food-sheet-amount">
            <SectionLabel>Amount</SectionLabel>
            {units.length > 1 ? (
              <View style={styles.unitRow}>
                {units.map(u => (
                  <Chip
                    key={u.key}
                    label={u.key === 'serving' ? `${u.label} (${Math.round(u.grams)} g)` : 'Grams'}
                    selected={unitKey === u.key}
                    onPress={() => { haptics.selection(); selectUnit(u.key); }}
                    style={styles.unitBtn}
                    labelStyle={[styles.unitBtnText, live.unitBtnText]}
                    selectedLabelStyle={[styles.unitBtnTextActive, live.unitBtnTextActive]}
                    accessibilityRole="radio"
                    accessibilityLabel={u.key === 'serving' ? `Per ${u.label}` : 'Grams'}
                    numberOfLines={1}
                  />
                ))}
              </View>
            ) : null}
            {/* The typed field IS the Stepper's centre (the house Stepper's
                `centre` slot, D230 lane 2B note 1): one number, between the
                two buttons; a screen reader reaches the buttons and the
                field each as themselves. */}
            <View style={styles.amountRow}>
              <Stepper
                value={amountValue}
                onChange={onStepAmount}
                min={stepMin}
                max={stepMax}
                step={isServing ? 0.5 : 10}
                formatValue={formatAmount}
                label="Amount"
                decreaseLabel="Decrease amount"
                increaseLabel="Increase amount"
                style={styles.amountStepper}
                centre={(
                  <TextField
                    size="sm"
                    containerStyle={styles.amountField}
                    inputStyle={styles.amountInput}
                    value={amount}
                    onChangeText={v => setAmount(v.replace(/[^0-9.,]/g, ''))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    accessibilityLabel={isServing ? 'Amount in servings' : 'Amount in grams'}
                  />
                )}
              />
            </View>
            {isServing ? (
              <Text style={[styles.gramHint, live.gramHint]}>= {Math.round(quantityG)} g</Text>
            ) : null}
          </View>

          {/* (3) What this amount is, on one wrapping line. */}
          <View
            testID="food-sheet-summary"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={summarySpoken}
          >
            <Text style={[styles.summary, live.summary]}>{summaryLine}</Text>
          </View>

          {/* D230 R8: the rest, on demand, closed on every open. It sits before
              the meal and the actions (the lead's ruling on lane 2B's note 4):
              content first, the action last, as every house sheet reads. */}
          <View testID="food-sheet-more">
            <CollapsibleSection
              title="More about this food"
              open={moreOpen}
              onToggle={() => { haptics.selection(); setMoreOpen((v) => !v); }}
            >
              {lastVerified ? (
                <Text style={[styles.lastVerified, live.lastVerified]}>{lastVerified}</Text>
              ) : null}
              {/* Ultimate-Audit item 12: only shown for a curated food with a
                  real raw/cooked distinction. Choosing an option never changes
                  the grams or the macros -- it only records which basis this
                  entry's grams are in (founder ruling: store the basis, no
                  conversion). */}
              {showWeightChoice ? (
                <View style={styles.block}>
                  <SectionLabel>Weighed</SectionLabel>
                  <View style={styles.unitRow}>
                    <Chip
                      label="Raw"
                      selected={weightState === 'raw'}
                      onPress={() => { haptics.selection(); setWeightState('raw'); }}
                      style={styles.unitBtn}
                      labelStyle={[styles.unitBtnText, live.unitBtnText]}
                      selectedLabelStyle={[styles.unitBtnTextActive, live.unitBtnTextActive]}
                      accessibilityRole="radio"
                      accessibilityLabel="Weighed raw"
                    />
                    <Chip
                      label="Cooked"
                      selected={weightState === 'cooked'}
                      onPress={() => { haptics.selection(); setWeightState('cooked'); }}
                      style={styles.unitBtn}
                      labelStyle={[styles.unitBtnText, live.unitBtnText]}
                      selectedLabelStyle={[styles.unitBtnTextActive, live.unitBtnTextActive]}
                      accessibilityRole="radio"
                      accessibilityLabel="Weighed cooked"
                    />
                  </View>
                </View>
              ) : null}
              {sugarG != null ? (
                <Text
                  style={[styles.nutrientLine, live.nutrientLine]}
                  accessibilityLabel={`${sugarG} ${gramsWord(sugarG)} of sugars`}
                >
                  <Text style={[styles.nutrientLabel, live.nutrientLabel]}>Sugars </Text>{`${sugarG} g`}
                </Text>
              ) : null}
              {saltG != null ? (
                <Text
                  style={[styles.nutrientLine, live.nutrientLine]}
                  accessibilityLabel={`${saltG} ${gramsWord(saltG)} of salt, ${sodiumMg} milligrams sodium`}
                >
                  <Text style={[styles.nutrientLabel, live.nutrientLabel]}>Salt </Text>{`${saltG} g`}
                </Text>
              ) : null}
              {/* Ultimate-Audit item 16 (MN-1), D22 16b primary surface. */}
              <MicronutrientDetail food={food} quantityG={quantityG} />
            </CollapsibleSection>
          </View>

          {/* (4) Where it goes: the day when it is not today, the meal, and
              in edit mode the time it was eaten. */}
          <View style={styles.block} testID="food-sheet-meal">
            {dateLine ? <Text style={[styles.dateLine, live.dateLine]}>{dateLine}</Text> : null}
            <SectionLabel>Meal</SectionLabel>
            <View style={styles.mealRow}>
              {pickerMealSlots(mealSlot, undefined, periWorkoutSlots).map(s => (
                <Chip
                  key={s.key}
                  label={s.label}
                  selected={mealSlot === s.key}
                  onPress={() => { haptics.selection(); setMealSlot(s.key); }}
                  style={styles.mealBtn}
                  labelStyle={[styles.mealBtnText, live.mealBtnText]}
                  selectedLabelStyle={[styles.mealBtnTextActive, live.mealBtnTextActive]}
                  accessibilityRole="radio"
                  accessibilityLabel={`Meal: ${s.label}`}
                />
              ))}
            </View>
            {/* Ultimate-Audit item 15 (D22 15b): the calm, optional "eaten at"
                time. Edit mode only. A bulk-confirmed entry opens here with no
                time set (D22 15b's honest untimed state); setting one here is
                the one place a user can give it a real, editable time. */}
            {mode === 'edit' ? (
              <>
                <SectionLabel>Eaten at</SectionLabel>
                <View style={styles.unitRow}>
                  <Pressable
                    onPress={() => { haptics.selection(); setShowTimePicker(true); }}
                    style={({ pressed }) => [styles.unitBtn, styles.eatenAtBtn, live.eatenAtBtn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={eatenAt
                      ? `Change the time you ate this, currently ${new Date(eatenAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Set the time you ate this'}
                  >
                    <Text style={[styles.unitBtnTextActive, live.unitBtnTextActive]}>
                      {eatenAt
                        ? new Date(eatenAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : 'No time set'}
                    </Text>
                  </Pressable>
                  {eatenAt != null ? (
                    <Pressable
                      onPress={() => { haptics.selection(); setEatenAt(null); }}
                      style={({ pressed }) => [styles.unitBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Clear the eaten time"
                    >
                      <Text style={[styles.unitBtnText, live.unitBtnText]}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>

          {/* (5) The actions. */}
          <View style={styles.actions} testID="food-sheet-actions">
            {/* Phase 10 finding #2 (discoverability audit 2026-08-10): the
                only other way into multi-select is an undisclosed long
                press on the diary row. This gives a visible route from the
                sheet a normal tap already opens, entering the SAME
                selection mode with this entry pre-selected (DiaryScreen
                wires onSelectEntries to enterSelection(editSheet.entry) --
                no new state, no second selection mechanism). */}
            {mode === 'edit' && onSelectEntries ? (
              <Pressable
                onPress={() => { haptics.selection(); onSelectEntries(); }}
                style={({ pressed }) => [styles.deleteBtn, live.selectBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Select entries"
                accessibilityHint="Choose this and other entries to move to a meal, copy to today or save as a meal"
              >
                <Ionicons name="checkbox-outline" size={18} color={t.colors.textSecondary} />
              </Pressable>
            ) : null}
            {mode === 'edit' && onDelete ? (
              <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, live.deleteBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Remove entry">
                <Ionicons name="trash-outline" size={18} color={t.colors.error} />
              </Pressable>
            ) : null}
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="secondary"
              fullWidth={false}
              style={styles.cancelBtn}
            />
            {/* D230 R5: the button names the meal it adds to, and follows
                the meal chips above. */}
            <Button
              title={saveTitle ?? (mode === 'edit' ? 'Save changes' : `Add to ${mealSlotLabel(mealSlot)}`)}
              onPress={handleSave}
              state={saved ? 'success' : submitting ? 'loading' : 'idle'}
              onSettled={handleClose}
              fullWidth={false}
              style={styles.saveBtn}
            />
          </View>

    </BottomSheet>
    {mode === 'edit' ? (
      <EatenTimePicker
        visible={showTimePicker}
        value={eatenAt ? new Date(eatenAt) : new Date()}
        onChange={onPickEatenTime}
        onClose={() => setShowTimePicker(false)}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // Each block keeps its own parts close; the sheet's own gap separates blocks.
  block: { gap: spacing.sm },
  title: { ...type.w('title', 'bold'), color: colors.textPrimary },
  // The brand and the source chip share one line beneath the title.
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { ...type.bodySm, color: colors.textMuted, flexShrink: 1 },
  lastVerified: { ...type.caption, color: colors.textMuted },
  // Unit selector (household serving vs grams), and the weigh-basis and
  // eaten-at rows that share its shape.
  unitRow: { flexDirection: 'row', gap: spacing.xs },
  unitBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', minHeight: touchTarget.minimum,
  },
  unitBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  unitBtnTextActive: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  // Ultimate-Audit item 15 (D22 15b): the eaten-at button reuses unitBtn's
  // shape but stays visually neutral (border, not a selected-chip fill) --
  // it is a value to open, not a radio choice.
  eatenAtBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  // The house Stepper with the typed field beside it. At the largest text
  // sizes the field wraps under the Stepper rather than squeezing it.
  amountRow: { alignItems: 'stretch' },
  // The Stepper spans the row; its centre slot holds the field.
  amountStepper: { alignSelf: 'stretch' },
  amountField: { flexGrow: 1 },
  amountInput: {
    fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  gramHint: { ...type.bodySm, color: colors.textMuted },
  summary: { ...type.num('body'), color: colors.textPrimary },
  dateLine: { ...type.bodySm, color: colors.textSecondary },
  nutrientLine: { ...type.num('bodySm'), color: colors.textPrimary },
  nutrientLabel: { color: colors.textMuted },
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', minHeight: touchTarget.minimum,
  },
  mealBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  mealBtnTextActive: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  deleteBtn: {
    width: touchTarget.minimum, height: touchTarget.minimum,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { minHeight: touchTarget.minimum },
  // The primary variant as the house draws it; this only fills the row.
  saveBtn: { flex: 1, minHeight: touchTarget.minimum },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. block/titleMeta/unitRow/
// unitBtn/amountRow/amountField/amountInput/mealRow/mealBtn/actions/
// cancelBtn/saveBtn have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { ...t.type.w('title', 'bold'), color: t.colors.textPrimary },
    brand: { ...t.type.bodySm, color: t.colors.textMuted },
    lastVerified: { ...t.type.caption, color: t.colors.textMuted },
    unitBtnText: { color: t.colors.textSecondary },
    unitBtnTextActive: { color: t.colors.primary },
    eatenAtBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    gramHint: { ...t.type.bodySm, color: t.colors.textMuted },
    summary: { ...t.type.num('body'), color: t.colors.textPrimary },
    dateLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    nutrientLine: { ...t.type.num('bodySm'), color: t.colors.textPrimary },
    nutrientLabel: { color: t.colors.textMuted },
    mealBtnText: { color: t.colors.textSecondary },
    mealBtnTextActive: { color: t.colors.primary },
    deleteBtn: { borderColor: t.colors.border },
    selectBtn: { borderColor: t.colors.border },
  };
}
