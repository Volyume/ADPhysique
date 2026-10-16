import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { fontSize, spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import SectionLabel from '../SectionLabel';
import TextField from '../TextField';
import SavedMealItemRow, { RemovedNotice, useDraftList } from './SavedMealItemRow';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { draftToItem, draftTotals } from '../../lib/food/savedMealItems';

/**
 * SavedMealEditSheet: "Edit this meal" (D230 R12), the same list as the log
 * sheet turned into an editor. The person can rename the meal, change the
 * grams of a food, take a food out (with Undo in the sheet), and add a food.
 * "Save" hands { name, items } to the screen, which writes the meal's new
 * items_json and name in one updateSavedMeal call. Nothing is written until
 * then; "Cancel" leaves the meal exactly as it was.
 *
 * "Add a food" leaves the sheet for the food search (a round trip through route
 * params, as the recipe builder adds an ingredient). So the screen can bring
 * the sheet back with the food added, the sheet hands the screen its current
 * `{ name, drafts }` first; the screen passes that back as `seed` with the new
 * food appended.
 *
 * The name bound is the one saved-meal names already have (60 characters, as the
 * rename and the save-as-meal sheet set it). This component does no I/O.
 *
 * Props:
 *   visible     show / hide
 *   seed        { name, drafts } the starting state (a new seed replaces the sheet's state)
 *   names       Map<foodRef, { name }> | null  resolved names
 *   energyUnit  'kcal' | 'kj'
 *   saving      true while the write is in flight
 *   onClose     () => void   Cancel
 *   onAddFood   ({ name, drafts }) => void
 *   onSave      ({ name, items }) => void
 */
export const SAVED_MEAL_NAME_MAX = 60;

export default function SavedMealEditSheet({
  visible, seed, names = null, energyUnit = 'kcal', saving = false, onClose, onAddFood, onSave,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [name, setName] = useState(seed?.name ?? '');
  useEffect(() => { setName(seed?.name ?? ''); }, [seed]);
  const { drafts, setGrams, remove, undoRemove, lastRemoved } = useDraftList(seed?.drafts);
  const totals = useMemo(() => draftTotals(drafts), [drafts]);
  const nameOf = (d) => names?.get?.(d.foodRef)?.name ?? d.name;
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && drafts.length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      keyboardAvoiding
      accessibilityLabel="Edit saved meal"
    >
      <Text style={[styles.title, live.title]} accessibilityRole="header">Edit this meal</Text>
      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Meal name"
        placeholderTextColor={t.colors.textMuted}
        maxLength={SAVED_MEAL_NAME_MAX}
        returnKeyType="done"
        accessibilityLabel="Meal name"
      />
      <View style={styles.section}>
        <SectionLabel>Foods</SectionLabel>
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
          <Text style={[styles.note, live.note]}>This meal needs at least one food. Add one or put one back.</Text>
        ) : (
          <Text style={[styles.total, live.total]}>
            {`Total: ${toEnergy(totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)}, ${totals.protein} g protein, ${totals.carbs} g carbs, ${totals.fat} g fat.`}
          </Text>
        )}
        <Button
          title="Add a food"
          variant="secondary"
          icon="add"
          onPress={() => onAddFood?.({ name, drafts })}
          disabled={saving}
        />
      </View>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={onClose} fullWidth={false} disabled={saving} />
        <Button
          title="Save"
          onPress={() => onSave?.({ name: trimmed, items: drafts.map((d) => draftToItem(d, nameOf(d))) })}
          disabled={!canSave}
          loading={saving}
          fullWidth={false}
        />
      </View>
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
