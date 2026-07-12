import { useEffect, useMemo, useState } from 'react';
import { appAlert } from '../AppAlert';
import { View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import BottomSheet from '../BottomSheet';
// M4 (audit 03b §3.3b): the save CTA rides the Button primitive's
// idle → loading → success morph; the commit haptic is its success beat.
import Button from '../Button';
import Chip from '../Chip';
import TextField from '../TextField';
import SourceChip from './SourceChip';
import { useToast } from '../Toast';
import { pickerMealSlots } from '../../lib/food/mealSlots';
import { scaleMacros, scaleSugarG, scaleSodiumMg } from '../../lib/food/macros';
import { buildServingUnits, initialServingState, resolveGrams, isValidEntryGrams } from '../../lib/food/servingEntry';
import { isNetworkSourced, formatLastVerified } from '../../lib/food/freshness';
import { refetchStaleFood } from '../../lib/food/waterfall';
import { defaultWeightStateFor } from '../../lib/food/foodRoles';
import { parseLocalDay } from '../../lib/dayKey';
import EatenTimePicker from './EatenTimePicker';
// Ultimate-Audit item 16 (MN-1), D22 16b: separate file, see its own header
// for why (another agent's WIP was live in this file at build time).
import MicronutrientDetail from './MicronutrientDetail';

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
 *   onClose          () => void
 */
export default function FoodDetailSheet({
  visible, food, mode = 'add',
  initialQuantityG, initialMealSlot = 'snack', initialEntryDate, initialWeightState, initialEatenAt = null,
  onSave, onDelete, onClose,
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
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  // gap #16: which extra per-food nutrients to surface under the macro summary.
  // Both default on; both are grams and display-only (never a target or total).
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
  const quantityG = resolveGrams(amount, unit);

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
  // Extra per-food nutrients (gap #16): shown only when the food actually
  // carries the datum (null = "no data", never a fake 0) and the user keeps the
  // toggle on. Display-only, not logged, not totalled, not scored.
  const sugarG = showSugar ? scaleSugarG(food, quantityG) : null;
  // E4: sodium displays in mg (stored grams per 100g; implausible values read
  // as no data inside the scaler). Same shown-when-the-food-carries-it rule.
  const sodiumMg = showSodium ? scaleSodiumMg(food, quantityG) : null;
  const extraNutrients = [
    showFibre && macros.fibre != null ? { key: 'fibre', label: 'Fibre', value: `${macros.fibre}g` } : null,
    sugarG != null ? { key: 'sugar', label: 'Sugars', value: `${sugarG}g` } : null,
    sodiumMg != null ? { key: 'sodium', label: 'Sodium', value: `${sodiumMg}mg` } : null,
  ].filter(Boolean);

  if (!food) return null;

  return (
    <>
    <BottomSheet visible={visible} onClose={handleClose} keyboardAvoiding accessibilityLabel={food.name}>
          <Text style={[styles.title, live.title]} numberOfLines={2}>{food.name}</Text>
          {food.brand ? <Text style={[styles.subtitle, live.subtitle]}>{food.brand}</Text> : null}
          {/* A6: the shared SourceChip replaces the inline uppercase text so
              CoFID rows carry their verified treatment + "what is CoFID?"
              gloss at the point of use. */}
          {food.source ? <SourceChip source={food.source} /> : null}
          {/* Audit §15 item 4: a calm "last verified" line for network-sourced
              (off/usda) rows only, reusing foods.fetched_at. Never implies the
              food is wrong -- it only states when it was last checked. */}
          {isNetworkSourced(food.source) && food.fetched_at ? (
            <Text style={[styles.lastVerified, live.lastVerified]}>{formatLastVerified(food.fetched_at)}</Text>
          ) : null}

          <Text style={[styles.fieldLabel, live.fieldLabel]}>Amount</Text>
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
          <View style={styles.stepper}>
            <Pressable
              onPress={() => { haptics.selection(); adjustAmount(-1); }}
              style={({ pressed }) => [styles.stepBtn, live.stepBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Decrease amount"
              accessibilityValue={{ text: `${amount} ${unit?.label ?? ''}`.trim() }}
            >
              <Ionicons name="remove" size={22} color={t.colors.textPrimary} />
            </Pressable>
            <TextField
              containerStyle={styles.stepInputContainer}
              fieldStyle={styles.stepInputField}
              inputStyle={styles.stepInput}
              value={amount}
              onChangeText={v => setAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Amount"
            />
            <Pressable
              onPress={() => { haptics.selection(); adjustAmount(1); }}
              style={({ pressed }) => [styles.stepBtn, live.stepBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Increase amount"
              accessibilityValue={{ text: `${amount} ${unit?.label ?? ''}`.trim() }}
            >
              <Ionicons name="add" size={22} color={t.colors.textPrimary} />
            </Pressable>
          </View>
          {unitKey === 'serving' ? (
            <Text style={[styles.gramHint, live.gramHint]}>= {Math.round(quantityG)} g</Text>
          ) : null}

          {/* Ultimate-Audit item 12: only shown for a curated food with a real
              raw/cooked distinction. Choosing an option never changes the
              grams above or the macros below -- it only records which basis
              this entry's grams are in (founder ruling: store the basis, no
              conversion). */}
          {showWeightChoice ? (
            <>
              <Text style={[styles.fieldLabel, live.fieldLabel]}>Weighed</Text>
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
            </>
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
                <Text key={n.key} style={[styles.extraText, live.extraText]}>
                  <Text style={[styles.extraLabel, live.extraLabel]}>{n.label} </Text>{n.value}
                </Text>
              ))}
            </View>
          ) : null}

          {/* Ultimate-Audit item 16 (MN-1), D22 16b primary surface. */}
          <MicronutrientDetail food={food} quantityG={quantityG} />

          {/* Ultimate-Audit item 15 (D22 15b): the calm, optional "eaten at"
              time. Edit mode only. A bulk-confirmed entry opens here with no
              time set (D22 15b's honest untimed state); setting one here is
              the one place a user can give it a real, editable time. */}
          {mode === 'edit' ? (
            <>
              <Text style={[styles.fieldLabel, live.fieldLabel]}>Eaten at</Text>
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

          <Text style={[styles.fieldLabel, live.fieldLabel]}>Meal</Text>
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

          <View style={styles.actions}>
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
              textStyle={[styles.cancelText, live.cancelText]}
            />
            <Button
              title={mode === 'edit' ? 'Save changes' : 'Add to diary'}
              onPress={handleSave}
              state={saved ? 'success' : submitting ? 'loading' : 'idle'}
              onSettled={handleClose}
              fullWidth={false}
              style={[styles.saveBtn, live.saveBtn]}
              textStyle={[styles.saveText, live.saveText]}
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

function MacroPill({ label, value }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.macroPill, live.macroPill]}>
      <Text style={[styles.macroPillValue, live.macroPillValue]}>{value}</Text>
      <Text style={[styles.macroPillLabel, live.macroPillLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.xs },
  lastVerified: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  fieldLabel: {
    fontSize: fontSize.xs, color: colors.textSecondary,
    textTransform: 'uppercase', fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  // Unit selector (household serving vs grams) + amount stepper. The common
  // case, one named serving, needs zero keystrokes: tap +/− or just Add.
  unitRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  unitBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', minHeight: 44,
  },
  unitBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  unitBtnTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Ultimate-Audit item 15 (D22 15b): the eaten-at button reuses unitBtn's
  // shape but stays visually neutral (border, not a selected-chip fill) --
  // it is a value to open, not a radio choice.
  eatenAtBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 48, height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepInputContainer: {
    flex: 1,
  },
  stepInputField: {
    minHeight: 54,
  },
  stepInput: {
    paddingVertical: spacing.md,
    fontWeight: fontWeight.bold,
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
  macroPillLabel: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  // gap #16: a quiet secondary line for extra per-food nutrients, below the
  // primary kcal/P/C/F pills so it never competes with the macros that matter.
  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, paddingHorizontal: spacing.xxs },
  extraText: { fontSize: fontSize.sm, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  extraLabel: { color: colors.textMuted },
  mealRow: { flexDirection: 'row', gap: spacing.xs },
  mealBtn: {
    flex: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
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
  },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFill,
    alignItems: 'center',
  },
  saveText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. unitRow/unitBtn/stepper/
// stepInputContainer/stepInputField/stepInput/macroSummary/extraRow/mealRow/
// mealBtn/actions have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    lastVerified: { color: t.colors.textMuted },
    fieldLabel: { color: t.colors.textSecondary },
    unitBtnText: { color: t.colors.textSecondary },
    unitBtnTextActive: { color: t.colors.primary },
    eatenAtBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    stepBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    gramHint: { color: t.colors.textMuted },
    macroPill: { backgroundColor: t.colors.surface2 },
    macroPillValue: { color: t.colors.textPrimary },
    macroPillLabel: { color: t.colors.textMuted },
    extraText: { color: t.colors.textPrimary },
    extraLabel: { color: t.colors.textMuted },
    mealBtnText: { color: t.colors.textSecondary },
    mealBtnTextActive: { color: t.colors.primary },
    deleteBtn: { borderColor: t.colors.border },
    cancelText: { color: t.colors.textSecondary },
    saveBtn: { backgroundColor: t.colors.primaryFill },
    saveText: { color: t.colors.onPrimary },
  };
}
