import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, iconSize, fontFamily, type } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';
import { energyUnitLabel, formatEnergy, spokenEnergy } from '../../lib/format';
import { resolveServingG, scaleMacros } from '../../lib/food/macros';
import useAppStore from '../../store/useAppStore';

// O18 (comprehension/trust audit 2026-08-06): 'OFF' read as "food gone off"
// to a first-time user (it is the Open Food Facts source code). Readable
// short form here; the rest were already plain-language.
// D230 R15 (food level-up 2026-10-16): one source vocabulary across the food
// area, every source named, none abbreviated into jargon ("Snapped" and "You"
// read as nothing in particular; a curated staple and a recipe had no name).
export const SOURCE_LABEL = {
  off: 'Food Facts',
  cofid: 'CoFID',
  usda: 'USDA',
  user_ocr: 'From a label',
  custom: 'Yours',
  curated: 'Volyume',
  recipe: 'Recipe',
};

// Per-100g foods (curated staples, some database rows) carry no serving
// size. Fall back to a 100g basis so the row shows "100g - X kcal" rather
// than "nullg".
export function servingGrams(food) {
  return food?.serving_g && food.serving_g > 0 ? food.serving_g : 100;
}

export function kcalForServing(food) {
  if (!food) return null;
  return Math.round((food.kcal_100g ?? 0) * servingGrams(food) / 100);
}

// A saved meal's row stands for the whole meal (resolveSlotRecentRefs gives it
// the meal's totals on a 100 g basis and a "3 foods" label), not one food.
function isSavedMealRow(food) {
  return food?.savedMealId != null
    || (typeof food?.food_ref === 'string' && food.food_ref.startsWith('meal:'));
}

// A serving label that already states its own amount ("30 g", "1 slice
// (36g)", "250ml", the free text Open Food Facts carries) is shown as it is.
const AMOUNT_IN_LABEL = /\d\s*(g|ml|kg|l)\b/i;
// A label that is only a unit (a custom drink's "ml") names the unit of the
// serving figure itself.
const UNIT_ONLY_LABEL = /^(g|ml)$/i;
// A label that starts with its own count ("1 slice", "2 tbsp", "½ cup").
const COUNTED_LABEL = /^[\d½¼¾]/;

/**
 * D230 R6: the portion a search row shows, which is exactly the portion its
 * "+" adds to the foods to log. Both read resolveServingG (the remembered
 * portion for this meal, else one named serving, else 100 g), so the figure
 * on the row and the amount the tap writes can never disagree.
 *
 * "1 slice (36 g)" when the amount is one named serving, "60 g" otherwise; a
 * saved meal shows its own label ("3 foods"). `spoken` is the same portion in
 * words for the row's accessibility label.
 */
export function rowPortion(food) {
  // A recipe logged in servings only has no gram amount of its own: the row
  // says "1 serving" and the one-tap add is exactly that serving.
  if (food?.servings_only === true && Number(food?.serving_g) > 0) {
    return { grams: Number(food.serving_g), text: '1 serving', spoken: '1 serving' };
  }
  const grams = resolveServingG(food);
  if (isSavedMealRow(food)) {
    const label = food?.serving_label || 'Saved meal';
    return { grams, text: label, spoken: label };
  }
  const servingG = Number(food?.serving_g) || 0;
  const label = typeof food?.serving_label === 'string' ? food.serving_label.trim() : '';
  if (servingG > 0 && label && Math.abs(grams - servingG) < 0.5) {
    const sg = Math.round(servingG);
    if (UNIT_ONLY_LABEL.test(label)) {
      const unit = label.toLowerCase();
      return { grams, text: `${sg} ${unit}`, spoken: `${sg} ${unit === 'ml' ? 'millilitres' : 'grams'}` };
    }
    if (AMOUNT_IN_LABEL.test(label)) return { grams, text: label, spoken: label };
    const counted = COUNTED_LABEL.test(label) ? label : `1 ${label}`;
    return { grams, text: `${counted} (${sg} g)`, spoken: `${counted}, ${sg} grams` };
  }
  const g = Math.round(grams);
  return { grams, text: `${g} g`, spoken: `${g} ${g === 1 ? 'gram' : 'grams'}` };
}

// `preference`: 'fav' | 'dislike' | null. 'dislike' is the user's
// "don't suggest this" instruction (Campaign 17B job 8: one name for it
// across Diary, Search and Meal Plan). When set, the row
// renders muted text + a small cross-circle next to the name to
// signal "you've said you don't eat this". Tapping still works
// (the user can deliberately log a disliked food); it only
// affects coach suggestions and the Favourites surface.
//
// D230 R6 (food level-up 2026-10-16): the row speaks the diary row's grammar
// (EntryRow). Line one is the name, with a small ink star when it is a
// favourite; line two is the brand, the portion and its energy ("Hovis ·
// 1 slice (36 g) · 89 kcal"), with the source last; line three is the
// macros for that same portion in a quiet caption ("4 P · 17 C · 1 F"),
// spoken in words ("4 grams protein, 17 carbs, 1 fat"). The "+" adds that
// portion in one tap: an ink glyph on a 48 dp target. A "don't suggest" row
// carries no "+" (a food the person has asked not to be offered is not
// offered in one tap); a tap on the row body still opens the sheet.
export default function FoodRow({
  food,
  isFav,
  preference,
  onPress,
  onLongPress,
  onAdd,
  addAccessibilityLabel,
  longPressHint,
  // D138: a plain edit affordance for a custom food (the Custom tab only).
  // A trailing pencil, matching the house pattern of a small icon button
  // beside a row's primary control (see LoggedSetRow's edit chrome) rather
  // than overloading the existing long-press (already the favourite/exclude
  // preference cycle).
  onEdit,
  editAccessibilityLabel,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const sourceTag = SOURCE_LABEL[food.source] ?? null;
  // Energy DISPLAY unit (kcal | kj) is applied here, at the render sites
  // only; the maths stays in kcal.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const portion = rowPortion(food);
  const macros = scaleMacros(food, portion.grams);
  const kcal = Math.round(macros.kcal ?? 0);
  const p = Math.round(macros.proteinG ?? 0);
  const c = Math.round(macros.carbsG ?? 0);
  const f = Math.round(macros.fatG ?? 0);
  // Food audit follow-up 2026-10-16: the row SPEAKS "calories" ("kilojoules" in
  // kJ), the word EntryRow uses, never "kcal" or "kilocalories"; the visible
  // text keeps the unit label.
  const energyText = `${formatEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}`;
  const metaLine = [food.brand || null, portion.text, energyText, sourceTag].filter(Boolean).join(' · ');
  const spokenMacros = `${p} ${p === 1 ? 'gram' : 'grams'} of protein, ${c} carbs, ${f} fat`;
  // Back-compat: callers that still pass `isFav` get the legacy
  // star-only behaviour. New callers pass `preference`.
  const pref = preference ?? (isFav ? 'fav' : null);
  const isDislike = pref === 'dislike';
  const showAdd = typeof onAdd === 'function' && !isDislike;
  const a11yPref = pref === 'fav' ? ' Starred.'
    : pref === 'dislike' ? ' Not suggested.'
    : '';
  const a11yBrand = food.brand ? `, ${food.brand}` : '';
  return (
    <TouchableOpacity
      style={[styles.row, live.row]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${a11yBrand}, ${portion.spoken}, ${spokenEnergy(kcal, energyUnit)}, ${spokenMacros}.${a11yPref}`}
      accessibilityHint={onLongPress ? (longPressHint ?? 'Long-press to cycle favourite, exclude, neutral') : undefined}
    >
      <View style={styles.rowMain}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.rowName, live.rowName, isDislike && [styles.rowNameMuted, live.rowNameMuted]]}
            numberOfLines={1}
          >
            {food.name}
          </Text>
          {pref === 'fav' ? (
            <Ionicons
              name="star"
              size={iconSize.sm}
              color={t.colors.textSecondary}
              style={styles.star}
              importantForAccessibility="no"
              accessibilityElementsHidden
            />
          ) : null}
        </View>
        <Text
          style={[styles.rowMeta, live.rowMeta, isDislike && [styles.rowMetaMuted, live.rowMetaMuted]]}
          numberOfLines={2}
        >
          {metaLine}
        </Text>
        <Text
          style={[styles.rowMacros, live.rowMacros, isDislike && [styles.rowMetaMuted, live.rowMetaMuted]]}
          numberOfLines={1}
        >
          {`${p} P · ${c} C · ${f} F`}
        </Text>
      </View>
      {pref === 'dislike'
        ? <Ionicons name="close-circle" size={20} color={t.colors.textMuted} style={{ marginRight: spacing.sm }} />
        : null}
      {onEdit ? (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={editAccessibilityLabel || `Edit ${food.name}`}
        >
          <Ionicons name="pencil-outline" size={18} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      {showAdd ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={addAccessibilityLabel || `Add ${food.name}`}
          accessibilityHint={`Adds ${portion.spoken} to the foods to log.`}
        >
          <Ionicons name="add" size={iconSize.lg} color={t.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} style={styles.rowChevron} importantForAccessibility="no" accessibilityElementsHidden />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    minHeight: 64,
  },
  rowMain: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowName: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, flexShrink: 1 },
  star: { flexShrink: 0 },
  rowNameMuted: { color: colors.textMuted, textDecorationLine: 'line-through' },
  rowMeta: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xxs },
  rowMacros: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  rowMetaMuted: { color: colors.textMuted, opacity: 0.7 },
  // D230 R6/R16: the one-tap add is a bare ink glyph on a full 48 dp target,
  // the logger's grammar for a glyph control (no pill, no amber).
  addBtn: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowChevron: { marginLeft: spacing.xs, marginRight: spacing.sm },
  editBtn: {
    minWidth: 32, minHeight: 32,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.xs,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. rowMain/nameRow/star/addBtn/
// rowChevron have no colour or type tokens.
function buildLiveStyles(t) {
  return {
    row: { borderBottomColor: t.colors.borderSubtle },
    rowName: { color: t.colors.textPrimary, fontSize: t.fontSize.md },
    rowNameMuted: { color: t.colors.textMuted },
    rowMeta: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowMacros: { ...t.type.caption, color: t.colors.textMuted },
    rowMetaMuted: { color: t.colors.textMuted },
  };
}
