import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { fontSize, spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import SectionLabel from '../SectionLabel';
import SavedMealItemRow, { RemovedNotice, useDraftList } from './SavedMealItemRow';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { draftsFromItems, draftTotals } from '../../lib/food/savedMealItems';

/**
 * SavedMealDetailSheet: a saved meal before it is logged (D230 R12, which
 * replaces the L05-MM1 read-only peek and the bare "Add saved meal?" prompt).
 *
 * Tapping a saved meal opens this sheet. It lists each food with its grams and
 * the energy for those grams. Each food has the house Stepper (10 g steps, 1 to
 * 5000 g) and a 48 dp control that takes it out, with Undo in the sheet before
 * anything is written. The live total sits under the list. The one primary
 * button, "Add to <meal>", hands the foods AS SHOWN to the screen, which writes
 * them in one call. The saved meal itself is never changed by logging; the
 * second button, "Edit this meal", hands the list as shown to the edit sheet.
 *
 * Names arrive resolved (the caller makes one batched resolveFoodRefs read);
 * until then, or for a food the library no longer holds, the name stored with
 * the meal is shown. This component does no I/O.
 *
 * Adherence-neutral (CLAUDE.md ED-safety): plain numbers, no colour-coded
 * good/bad framing, no target comparison. Nothing here reads a safety state.
 *
 * Props:
 *   visible    show / hide
 *   meal       { id, name, items: [{ foodRef, name, quantityG, kcal, proteinG, carbsG, fatG, fibreG }] } | null
 *   names      Map<foodRef, { name }> | null  resolved names
 *   energyUnit 'kcal' | 'kj'
 *   mealLabel  the meal the foods go to, e.g. "Breakfast" (the button reads "Add to Breakfast")
 *   busy       true while the write is in flight
 *   onClose    () => void
 *   onConfirm  (drafts) => void  the foods as shown
 *   onEdit     (drafts) => void  start editing the meal from the list as shown
 */
export default function SavedMealDetailSheet({
  visible, meal, names = null, energyUnit = 'kcal', mealLabel = 'your diary', busy = false,
  onClose, onConfirm, onEdit,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const seed = useMemo(() => draftsFromItems(meal?.items), [meal]);
  const { drafts, setGrams, remove, undoRemove, lastRemoved } = useDraftList(seed);
  const totals = useMemo(() => draftTotals(drafts), [drafts]);
  const nameOf = (d) => names?.get?.(d.foodRef)?.name ?? d.name;
  const hadItems = seed.length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      accessibilityLabel={meal ? `${meal.name} foods` : 'Saved meal foods'}
    >
      {meal ? (
        <>
          <Text style={[styles.title, live.title]} numberOfLines={2} accessibilityRole="header">{meal.name}</Text>

          {hadItems ? (
            <View style={styles.section}>
              <SectionLabel>In this meal</SectionLabel>
              {drafts.map((d) => (
                <SavedMealItemRow
                  key={d.key}
                  draft={d}
                  name={nameOf(d)}
                  energyUnit={energyUnit}
                  onGrams={setGrams}
                  onRemove={remove}
                />
              ))}
              <RemovedNotice name={lastRemoved ? nameOf(lastRemoved) : null} onUndo={undoRemove} />
              {drafts.length === 0 ? (
                <Text style={[styles.note, live.note]}>
                  Every food has been taken out. Put one back to add this meal.
                </Text>
              ) : (
                <Text style={[styles.total, live.total]}>
                  {`Total: ${toEnergy(totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)}, ${totals.protein} g protein, ${totals.carbs} g carbs, ${totals.fat} g fat.`}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.note, live.note]}>No food-by-food detail is stored for this meal.</Text>
          )}

          <Button
            title={`Add to ${mealLabel}`}
            onPress={() => onConfirm?.(drafts)}
            disabled={drafts.length === 0}
            loading={busy}
          />
          <View style={styles.actions}>
            <Button title="Edit this meal" variant="secondary" onPress={() => onEdit?.(drafts)} fullWidth={false} disabled={!hadItems || busy} />
            <Button title="Close" variant="secondary" onPress={onClose} fullWidth={false} />
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title },
  section: { gap: spacing.sm, paddingTop: spacing.xs },
  note: { fontSize: fontSize.sm },
  total: { ...type.bodyStrong, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
});

function buildLiveStyles(t) {
  return {
    title: { ...t.type.title, color: t.colors.textPrimary },
    note: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    total: { ...t.type.bodyStrong, color: t.colors.textPrimary, fontSize: t.fontSize.sm },
  };
}
