import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, iconSize, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import Card from '../Card';
import Chip from '../Chip';
import Button from '../Button';
import { formatEnergy, formatNumber, energyUnitLabel, spokenEnergy } from '../../lib/format';
import { getMealAdditionsForEntries, filterAdditionsForProfile, ADDITIONS_INTRO } from '../../lib/food/mealAdditions';
import { foldedRowLabel } from '../../lib/food/mealSlots';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import { SwipeableEntryRow } from './EntryRow';
import AnimatedRow from '../AnimatedRow';
import { touchTarget } from '../../styles/layout';

// One meal as a single contained card (diary-tab redesign 2026-06-01). Replaces
// the old containerless section (a bare uppercase label over a dashed "Add
// food" box). The card owns the border and rounded corners; items are flush
// in-card rows; the header carries the per-meal subtotal (calories AND protein,
// the number a training user defends); the add affordance is a quiet in-card
// hub, not a dashed placeholder box.
//
// D138 (diary as a daily workspace): an empty slot's chip row is now a
// one-tap repeat surface. Each usual chip states the portion it will log
// ("Porridge oats · 60 g") and logs it on tap (hold to change the portion);
// where yesterday had food in this same slot, a "Yesterday's <meal>" chip
// leads the row and copies that meal across. Both write paths are the
// diary's own (logFoodEntry + an undo toast), never a silent shortcut.
//
// D230 (food level-up, rulings R1-R4, R15, R16): the card is the house
// `Card`; the chips are the house `Chip` (role "button", an action, at the
// 48 dp touch target, the glyph in the chip's own ink); "Add food" is the
// house `Button`; the meal name is a heading; the subtotal reads
// "420 kcal · 32 g protein". R1: the chips render on an empty DAY too, not
// only once the day has an entry, so the first food of the day is one tap.
// R3: the two standing lines that explained the chips are gone; the chip's
// label states what it logs and its accessibility hint says how to change
// the portion first.
// D138 (one-tap usual): a usual chip now LOGS on tap, so it must disclose the
// portion it will write before the tap, not after. `pluralise` keeps a
// household serving readable ("2 slices", "1 slice"); a label that already
// ends in an s is left alone.
function pluralise(label, n) {
  const l = String(label).trim();
  if (n === 1 || /s$/i.test(l)) return l;
  return `${l}s`;
}

/**
 * The portion a one-tap log of this usual would write, as the user reads it.
 * Household serving ("2 slices") when the food carries a named serving AND the
 * remembered grams divide cleanly to a half serving; otherwise grams. Returns
 * null when there is no remembered portion at all (the chip then falls back to
 * the edit path rather than guessing a weight).
 */
export function usualPortion(food) {
  const grams = Math.round(Number(food?.last_quantity_g) || 0);
  if (!(grams > 0)) return null;
  const servingG = Number(food?.serving_g) || 0;
  const label = food?.serving_label ? String(food.serving_label).trim() : '';
  // A recipe logged in servings only (no cooked weight, founder ruling
  // 2026-10-16) never shows grams: its remembered portion reads in servings.
  if (food?.servings_only === true && servingG > 0) {
    const n = Math.round((grams / servingG) * 10) / 10;
    if (n > 0) {
      const text = `${n} ${n === 1 ? 'serving' : 'servings'}`;
      return { text, spoken: text };
    }
  }
  if (servingG > 0 && label) {
    const halves = (grams / servingG) * 2;
    const rounded = Math.round(halves);
    if (rounded > 0 && Math.abs(halves - rounded) < 0.02) {
      const n = rounded / 2;
      const text = `${n} ${pluralise(label, n)}`;
      return { text, spoken: text };
    }
  }
  return { text: `${grams} g`, spoken: `${grams} ${grams === 1 ? 'gram' : 'grams'}` };
}

// "60 g" / "2 slices" / null. Used by the chip label and by the diary's
// post-log toast, so the two always quote the same portion.
export function usualPortionText(food) {
  return usualPortion(food)?.text ?? null;
}

// "Porridge oats · 60 g"
export function usualChipLabel(food) {
  const name = food?.name ?? 'Food';
  const portion = usualPortion(food);
  return portion ? `${name} · ${portion.text}` : name;
}

// "Log porridge oats, 60 grams" - the portion is spoken, never implied.
export function usualChipAccessibilityLabel(food, slotLabel) {
  const name = food?.name ?? 'food';
  const portion = usualPortion(food);
  return portion ? `Log ${name}, ${portion.spoken}` : `Log ${name} to ${slotLabel}`;
}

// Item 3 (food Diary audit 2026-10-16): the planned line counts foods and
// says whether the whole meal is planned. "This meal is planned." only when
// it is one food and it is all of the meal.
export function plannedLine(plannedCount, foodCount) {
  if (plannedCount <= 0) return null;
  if (plannedCount >= foodCount) {
    return plannedCount === 1 ? 'This meal is planned.' : `All ${plannedCount} foods in this meal are planned.`;
  }
  return `${plannedCount} ${plannedCount === 1 ? 'food' : 'foods'} planned in this meal.`;
}

export default function MealSection({
  slot, entries, onAdd, onEdit, onDelete,
  usuals = null, onLogUsual, onEditUsual,
  // D138: on an EMPTY slot where yesterday had food in the SAME slot, the
  // first chip in the usuals row copies that meal across. Shape:
  // { label: "Yesterday's Breakfast", count: 3 }; null when there is nothing
  // to copy.
  yesterdayCopy = null, onCopyYesterday,
  mealSuggestion = null, onLogMealSuggestion,
  selectionMode = false, selectedIds, onLongPressEntry, onToggleSelect,
  readOnly = false,
  // Food audit item 1 ("mark planned meal eaten", one tap): confirms just
  // THIS slot's planned rows via mealPlanService's real intake write path
  // (logFoodEntry -> is_planned=1, confirmPlannedDay -> is_planned=0), never
  // a cosmetic flag. Undefined when the parent has decided a write is not
  // currently possible (read-only, a future day); the button only ever
  // renders when this slot actually holds planned rows.
  onConfirmPlanned,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const hasEntries = entries.length > 0;
  // Food Diary audit 2026-10-16, item 3 (data wrong): planned is not eaten.
  // The subtotal counts only eaten rows, so it agrees with the ring and the
  // breakdown sheet (mealBreakdown skips `is_planned` the same way); a meal
  // holding only planned food shows no subtotal.
  const eatenEntries = entries.filter((e) => !e.is_planned);
  const slotKcal = Math.round(eatenEntries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  const slotProtein = Math.round(eatenEntries.reduce((a, e) => a + (e.protein_g ?? 0), 0));
  // Planned-but-unconfirmed rows in THIS meal (is_planned=1, staged by the
  // meal plan). MacroRings already shows the day-wide planned/eaten split
  // (the faded arc); this is the per-meal signal that drives the one-tap
  // confirm button below, no colour or score attached to it.
  const plannedCount = entries.reduce((n, e) => n + (e.is_planned ? 1 : 0), 0);
  const showMarkEaten = plannedCount > 0 && !selectionMode && typeof onConfirmPlanned === 'function';
  // GAP #5: one-tap "usuals". Only on an empty slot (a slot with food doesn't
  // need the prompt) and never in selection mode (the card is a target then).
  // E10 read-only lapse views: never in read-only either, logging a usual is
  // a write.
  const showUsuals = !hasEntries && !selectionMode && !readOnly && Array.isArray(usuals) && usuals.length > 0;
  // D138: the copy-yesterday chip lives in the same row and under the same
  // conditions (empty slot, writable, not a selection target), so the row can
  // appear for it alone on a slot with no recents yet.
  const showYesterdayCopy = !hasEntries && !selectionMode && !readOnly
    && !!yesterdayCopy && typeof onCopyYesterday === 'function';
  const showUsualsRow = showUsuals || showYesterdayCopy;
  // Founder must-fix #6 phase 2: a genuine curated-meal suggestion for an
  // empty pre/post-workout slot (mealSuggestion is only ever populated for
  // those two slots - see DiaryScreen). Personal history (usuals) wins when
  // both exist, so a user's own established habit is offered before a
  // generic library pick; the suggestion only shows once usuals have
  // nothing to offer.
  const showMealSuggestion = !hasEntries && !selectionMode && !readOnly && !showUsualsRow && !!mealSuggestion;
  const showActionHub = !selectionMode && !readOnly;
  // Season to taste (founder 2026-07-01): once a curated / meal-plan meal is on
  // the day, carry its free additions into the diary too. Only shows when the
  // slot's foods resolve to a real curated meal; null (hidden) otherwise.
  // R1 (D28): additions are filtered by the profile's allergen excludes at
  // every render site - an excluded allergen is never suggested, silently.
  // Reads the profile here (like CuratedMealSheet) so no caller can forget.
  // D230 R17: the only profile field filterAdditionsForProfile reads is
  // `mealPlanExcludeTags` (mealAdditions.js), so that is all this selects: an
  // unrelated profile change no longer re-renders every meal card. The
  // curated-meal match and the filter run in a memo keyed on the entries.
  const excludeTags = useAppStore((s) => s.userProfile?.mealPlanExcludeTags);
  const seasonAdds = useMemo(() => {
    // Item 23: the tip is about a meal still to be eaten, so it reads only the
    // planned rows (the existing is_planned flag, no new marker). Once the
    // meal is marked eaten, or when a curated meal was logged straight away,
    // there is nothing left to season and the row is gone.
    const plannedRows = entries.filter((e) => e.is_planned);
    const rawSeasonAdds = plannedRows.length && !selectionMode ? getMealAdditionsForEntries(plannedRows) : null;
    const filteredSeasonAdds = rawSeasonAdds
      ? filterAdditionsForProfile(rawSeasonAdds, { mealPlanExcludeTags: excludeTags })
      : null;
    return filteredSeasonAdds && filteredSeasonAdds.length ? filteredSeasonAdds : null;
  }, [selectionMode, entries, excludeTags]);
  // L05-D1/D6 (design-usability audit 2026-07-09, founder-gated build): a
  // logged row already opens for edit on tap (EntryRow's own accessibility
  // label says "Tap to edit"), but a sighted user had no visual cue at all.
  // Same write-capability gate as the add-food hub below: a row is only
  // presented as editable when the diary can be written to and the card
  // is not currently a multi-select target.
  const showRowEditHint = !selectionMode && !readOnly;
  // Item 22 (view only): rows stored under an old meal name (Breakfast,
  // Lunch, Dinner) are drawn in this numbered card. Own rows come first, then
  // each old-named group in a stable order; the old names are named once, as
  // a sub-line under the card title. The stored meal_slot never changes.
  const { rows, oldNames } = useMemo(() => {
    const tagged = entries.map((entry, i) => ({
      entry, i, oldName: foldedRowLabel(entry.meal_slot, slot.key, slot.label),
    }));
    tagged.sort((a, b) => (a.oldName ? 1 : 0) - (b.oldName ? 1 : 0)
      || (a.oldName && b.oldName && a.oldName !== b.oldName
        ? String(a.entry.meal_slot).localeCompare(String(b.entry.meal_slot)) : 0)
      || a.i - b.i);
    const names = [];
    for (const r of tagged) if (r.oldName && !names.includes(r.oldName)) names.push(r.oldName);
    return { rows: tagged.map((r) => r.entry), oldNames: names };
  }, [entries, slot.key, slot.label]);
  return (
    <Card padding="none" style={styles.card}>
      <View style={styles.header}>
        {/* D230 R16: the meal name is a heading, so the screen-reader
            heading rotor walks the Diary meal by meal. */}
        <View style={styles.titleBlock}>
          <Text style={[styles.mealName, live.mealName]} accessibilityRole="header">{slot.label}</Text>
          {oldNames.length ? (
            <Text style={[styles.oldName, live.oldName]}>{`Includes ${oldNames.join(" and ")}`}</Text>
          ) : null}
        </View>
        {eatenEntries.length > 0 ? (
          <Text
            style={[styles.subtotal, live.subtotal]}
            accessibilityLabel={`${spokenEnergy(slotKcal, energyUnit)}, ${formatNumber(slotProtein)} ${slotProtein === 1 ? 'gram' : 'grams'} of protein`}
          >
            {formatEnergy(slotKcal, energyUnit)} {energyUnitLabel(energyUnit)} · {formatNumber(slotProtein)} g protein
          </Text>
        ) : null}
      </View>
      {showMealSuggestion ? (
        <View style={styles.usuals}>
          <Chip
            label={mealSuggestion.name ?? 'Meal'}
            icon="add"
            onPress={() => onLogMealSuggestion?.(mealSuggestion)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${mealSuggestion.name ?? 'meal'} to ${slot.label}`}
            numberOfLines={1}
            style={styles.usualChip}
            labelStyle={styles.usualChipText}
          />
        </View>
      ) : null}
      {showUsualsRow ? (
        <View style={styles.usuals}>
          {showYesterdayCopy ? (
            <Chip
              label={yesterdayCopy.label}
              icon="copy-outline"
              onPress={() => onCopyYesterday?.()}
              accessibilityRole="button"
              accessibilityLabel={
                `${yesterdayCopy.label}, copy ${yesterdayCopy.count} `
                + `${yesterdayCopy.count === 1 ? 'entry' : 'entries'} into ${slot.label}`
              }
              numberOfLines={1}
              style={styles.usualChip}
              labelStyle={styles.usualChipText}
            />
          ) : null}
          {showUsuals ? usuals.map((food) => (
            // D138: one tap LOGS the remembered portion (the label states it);
            // a hold opens the search/detail path to change the portion first.
            <Chip
              key={food.food_ref}
              label={usualChipLabel(food)}
              icon="add"
              onPress={() => onLogUsual?.(food)}
              onLongPress={() => onEditUsual?.(food)}
              accessibilityRole="button"
              accessibilityLabel={usualChipAccessibilityLabel(food, slot.label)}
              accessibilityHint="Hold to change the portion first"
              numberOfLines={1}
              style={styles.usualChip}
              labelStyle={styles.usualChipText}
            />
          )) : null}
        </View>
      ) : null}
      {/* D2: rows animate in/out and siblings glide into freed space, so a
          delete or add is no longer a jump-cut. Keys are entry ids (stable),
          which AnimatedRow requires. */}
      {rows.map((e) => (
        <AnimatedRow key={e.id} style={styles.entryRowOuter}>
          <View style={styles.entryFlex}>
            <SwipeableEntryRow
              entry={e}
              onEdit={() => onEdit(e)}
              onDelete={onDelete}
              selectionMode={selectionMode}
              selected={!!selectedIds?.has(e.id)}
              onLongPress={() => onLongPressEntry?.(e)}
              onToggleSelect={() => onToggleSelect?.(e)}
              readOnly={readOnly}
            />
          </View>
          {/* L05-D1/D6: decorative-only edit cue, matching the chevron
              idiom already used for "this opens something" rows elsewhere
              in the diary (e.g. the saved-meals sheet below). pointerEvents
              "none" so it never competes with the row's own tap, long-press
              or swipe-to-delete gesture; hidden the moment the row is not
              actually editable (selection mode, read-only lapse view). */}
          {showRowEditHint ? (
            <View style={[styles.entryChevron, live.entryChevron]} pointerEvents="none">
              <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
            </View>
          ) : null}
        </AnimatedRow>
      ))}
      {seasonAdds ? (
        <View style={[styles.seasonRow, live.seasonRow]}>
          {/* Founder 2026-07-09: the old label here read like an instruction
              to add ALL of the listed items. Reframed to the same pick-any
              register as ADDITIONS_INTRO/CuratedMealSheet's "Optional extras"
              heading (src/lib/food/mealAdditions.js), so this inline row can't
              be misread as a checklist. */}
          <Text style={[styles.seasonText, live.seasonText]}>
            <Text style={[styles.seasonLabel, live.seasonLabel]}>{ADDITIONS_INTRO} </Text>
            {seasonAdds.map((a) => a.name).join(', ')}.
          </Text>
        </View>
      ) : null}
      {/* Food audit item 1: a planned meal stages into the diary as real rows
          (is_planned=1); one tap here confirms THIS meal eaten. Shown before
          the action hub so it reads as the meal's own next step, not a
          generic add action. Staging only, never automatic: nothing here
          runs without this explicit tap. */}
      {showMarkEaten ? (
        <View style={styles.plannedRow}>
          <Text style={[styles.plannedRowText, live.plannedRowText]}>
            {plannedLine(plannedCount, entries.length)}
          </Text>
          <TouchableOpacity
            style={[styles.markEatenButton, live.markEatenButton]}
            // Drawn at 36dp to sit inside the planned-meal row without
            // dominating it; the shortfall against the platform minimum is
            // padded onto the touch area rather than the box.
            hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            onPress={onConfirmPlanned}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${slot.label} as eaten`}
          >
            {/* D230 R15: one wording, the same as the day's banner. */}
            <Text style={[styles.markEatenText, live.markEatenText]}>Mark as eaten</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {/* E10 read-only lapse views: no add affordances on a view-only diary. */}
      {/* D230 R4: "Add food" is the house Button (secondary: the ink
          sibling, its search glyph in the same ink), full width at the 48 dp
          touch target. It is TAP #1 of the pinned three-tap log
          (DiaryScreen.foodLogTapCount.guard.test.js). */}
      {showActionHub ? (
        <View style={[styles.actionHub, hasEntries && [styles.actionHubDivided, live.actionHubDivided]]}>
          <Button
            title="Add food"
            icon="search-outline"
            variant="secondary"
            onPress={() => { haptics.selection(); onAdd?.(); }}
            accessibilityLabel={`Add food to ${slot.label}`}
            style={styles.addFoodButton}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  // D230 R4: the surface, the `lg` radius and the `borderSubtle` edge come
  // from the house Card; this carries only the clip (so a swiping row stays
  // inside the rounded corners) and the space between cards.
  card: {
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  // Food Diary audit 2026-10-16, item 13: at the largest text size the name
  // and the subtotal ran into each other ("Breakfast677 kcal · 31 g pr"). The
  // row wraps: the subtotal moves under the name, still on the right.
  header: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
    columnGap: spacing.md, rowGap: spacing.xxs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  mealName: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  subtotal: {
    color: colors.textMuted, fontSize: fontSize.sm, fontVariant: ['tabular-nums'],
    flexShrink: 1, marginLeft: 'auto', textAlign: 'right',
  },
  // One-tap "usuals" chips: a quiet wrap of the foods most logged into this
  // slot, sitting between the header and the Add row on an empty card. Each
  // is the house Chip at the platform touch target (D230 R4, R16).
  usuals: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, paddingTop: spacing.xxs,
  },
  usualChip: { minHeight: touchTarget.minimum, maxWidth: '100%' },
  // Layout only: a long food name ellipsises inside the chip rather than
  // pushing it past the card.
  usualChipText: { flexShrink: 1 },
  actionHub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  actionHubDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  // Layout only: the house Button owns the surface, border, label and glyph.
  addFoodButton: { flex: 1, minHeight: touchTarget.minimum },
  // L05-D1/D6: the entry row keeps its own full-bleed background/border
  // (EntryRow.js, untouched by this fix); this outer row only adds a
  // narrow decorative lane for the edit chevron, so the row itself must be
  // wrapped with flex:1 to keep its existing full-width layout now that it
  // shares a row-direction parent with that lane.
  entryRowOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  entryFlex: {
    flex: 1,
  },
  entryChevron: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  // Per-meal "mark eaten" (food audit item 1). Same visual language as the
  // day-level planned banner (DiaryScreen `plannedBtnPrimary`): a quiet
  // caption plus a single primary-tinted button, no colour judgement, no
  // score, no streak.
  plannedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  plannedRowText: { ...type.bodySm, color: colors.textMuted, flex: 1 },
  markEatenButton: {
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minHeight: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  markEatenText: { color: colors.textPrimary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  titleBlock: { flexShrink: 1 },
  oldName: { ...type.caption, color: colors.textMuted },
  seasonRow: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle,
  },
  seasonText: { ...type.bodySm, color: colors.textSecondary },
  seasonLabel: { color: colors.textMuted, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. card/header/usuals/usualChip/
// usualChipText/actionHub/addFoodButton/entryRowOuter/entryFlex have no
// colour tokens (the house Card, Chip and Button own their own colours).
function buildLiveStyles(t) {
  return {
    mealName: { color: t.colors.textPrimary },
    subtotal: { color: t.colors.textMuted },
    actionHubDivided: { borderTopColor: t.colors.border },
    entryChevron: { backgroundColor: t.colors.surface, borderTopColor: t.colors.borderSubtle },
    plannedRowText: { color: t.colors.textMuted },
    markEatenButton: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    markEatenText: { color: t.colors.textPrimary },
    oldName: { color: t.colors.textMuted },
    seasonRow: { borderTopColor: t.colors.borderSubtle },
    seasonText: { color: t.colors.textSecondary },
    seasonLabel: { color: t.colors.textMuted },
  };
}
