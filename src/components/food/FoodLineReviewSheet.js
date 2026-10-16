import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type, iconSize } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { scaleMacros } from '../../lib/food/macros';
import { describePortion } from '../../lib/food/foodLine';

/**
 * FoodLineReviewSheet (D230 R13): the list a typed line of several foods
 * becomes, to check before anything is added. One row per part: the food it
 * matched (or a plain "No match" line), the portion in words with the grams
 * said, and that portion's energy and macros in the food row's grammar.
 * Nothing is written from here until the one button; the screen owns the
 * write, this sheet only reports what was pressed.
 *
 * Props:
 *   visible     show / hide
 *   mealName    the meal being logged to, for the button ("Breakfast")
 *   items       [{ key, part, food|null, grams, basis }]
 *   energyUnit  'kcal' | 'kj' display unit
 *   adding      true while the write runs (the button waits)
 *   onRowPress  (item) => void   change the portion, or search for a no-match
 *   onRemove    (key) => void
 *   onAdd       () => void       write every row that has a match
 *   onClose     () => void
 */
export default function FoodLineReviewSheet({
  visible, mealName, items = [], energyUnit = 'kcal', adding = false,
  onRowPress, onRemove, onAdd, onClose,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const matched = items.filter((it) => it.food);
  const skipped = items.length - matched.length;
  const addLabel = `Add ${matched.length} ${matched.length === 1 ? 'food' : 'foods'} to ${mealName}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll accessibilityLabel="Check these before adding">
      <Text style={[styles.title, live.title]} accessibilityRole="header">Check these before adding</Text>

      {items.map((it) => {
        const name = it.food ? it.food.name : `No match for '${it.part.name}'`;
        let detail = null;
        let macroLine = null;
        let spoken = name;
        if (it.food) {
          const portion = { grams: it.grams, basis: it.basis };
          const m = scaleMacros(it.food, it.grams);
          const kcal = Math.round(m.kcal ?? 0);
          const p = Math.round(m.proteinG ?? 0);
          const c = Math.round(m.carbsG ?? 0);
          const f = Math.round(m.fatG ?? 0);
          const energyText = `${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}`;
          detail = `${describePortion(it.part, it.food, portion)} · ${energyText}`;
          macroLine = `${p} P · ${c} C · ${f} F`;
          spoken = `${name}, ${detail}, ${p} grams protein, ${c} carbs, ${f} fat. Double tap to change the amount.`;
        } else {
          detail = 'Tap to search for it.';
          spoken = `${name}. Double tap to search for it.`;
        }
        return (
          <View key={it.key} style={[styles.row, live.row]}>
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => onRowPress?.(it)}
              accessibilityRole="button"
              accessibilityLabel={spoken}
            >
              <Text style={[styles.rowName, live.rowName, !it.food && live.rowNameMuted]} numberOfLines={2}>{name}</Text>
              <Text style={[styles.rowMeta, live.rowMeta]}>{detail}</Text>
              {macroLine ? <Text style={[styles.rowMacros, live.rowMacros]}>{macroLine}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove?.(it.key)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${it.food ? it.food.name : it.part.name}`}
            >
              <Ionicons name="close" size={iconSize.md} color={t.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })}

      {skipped > 0 ? (
        <Text style={[styles.note, live.note]}>
          {skipped === 1
            ? 'The food with no match is left out. Tap it to search for it.'
            : 'The foods with no match are left out. Tap one to search for it.'}
        </Text>
      ) : null}

      <Button
        title={addLabel}
        onPress={onAdd}
        variant="primary"
        disabled={matched.length === 0 || adding}
        loading={adding}
        style={styles.addBtn}
        accessibilityLabel={addLabel}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  rowMain: {
    flex: 1, minWidth: 0, minHeight: 64,
    justifyContent: 'center', paddingVertical: spacing.md, paddingRight: spacing.sm,
  },
  rowName: { ...type.bodyStrong, color: colors.textPrimary },
  rowMeta: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xxs },
  rowMacros: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  removeBtn: {
    width: touchTarget.minimum, height: touchTarget.minimum,
    alignItems: 'center', justifyContent: 'center',
  },
  note: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.md },
  addBtn: { marginTop: spacing.lg, minHeight: touchTarget.minimum },
});

// Live theme override for the frozen `styles` block above (the house pattern:
// only the colour and type bearing keys are mirrored).
function buildLiveStyles(t) {
  return {
    title: { ...t.type.title, color: t.colors.textPrimary },
    row: { borderBottomColor: t.colors.borderSubtle },
    rowName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    rowNameMuted: { color: t.colors.textMuted },
    rowMeta: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowMacros: { ...t.type.caption, color: t.colors.textMuted },
    note: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
