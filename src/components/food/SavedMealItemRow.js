import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from '../Text';
import Card from '../Card';
import Button from '../Button';
import Stepper from '../Stepper';
import { fontSize, spacing, type, iconSize } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import * as haptics from '../../lib/haptics';
import {
  ITEM_STEP_G, ITEM_MIN_G, ITEM_MAX_G, clampItemGrams, draftMacros,
} from '../../lib/food/savedMealItems';

/**
 * SavedMealItemRow and useDraftList: the list pieces a saved meal's two sheets
 * share (D230 R12). SavedMealDetailSheet (log it as shown) and
 * SavedMealEditSheet (change the meal itself) show the same list, so they read
 * the same row and the same list behaviour.
 *
 * A row is one house Card: the food's name and a 48 dp remove control on the
 * first line, the house Stepper (10 g steps, 1 to 5000 g, the same bound as any
 * entry; a hold on a button moves 100 g) and the energy for those grams on the
 * second. Removing a row writes nothing: the sheet keeps it and offers Undo in
 * place until the person logs or saves.
 *
 * useDraftList holds the list the sheet is showing. `seed` is the starting
 * list; a new seed replaces it (a new meal opened, or the edit sheet coming
 * back from the food search with a food added).
 */

export function useDraftList(seed) {
  // One state object, so a removal and its Undo record change together.
  const [state, setState] = useState({ drafts: seed ?? [], removed: [] }); // removed: latest last

  useEffect(() => {
    setState({ drafts: seed ?? [], removed: [] });
  }, [seed]);

  const setGrams = useCallback((key, grams) => {
    setState((s) => ({
      ...s,
      drafts: s.drafts.map((d) => (d.key === key ? { ...d, quantityG: clampItemGrams(grams) } : d)),
    }));
  }, []);

  const remove = useCallback((key) => {
    setState((s) => {
      const index = s.drafts.findIndex((d) => d.key === key);
      if (index < 0) return s;
      return {
        drafts: s.drafts.filter((d) => d.key !== key),
        removed: [...s.removed, { draft: s.drafts[index], index }],
      };
    });
  }, []);

  const undoRemove = useCallback(() => {
    setState((s) => {
      if (s.removed.length === 0) return s;
      const last = s.removed[s.removed.length - 1];
      const at = Math.min(last.index, s.drafts.length);
      return {
        drafts: [...s.drafts.slice(0, at), last.draft, ...s.drafts.slice(at)],
        removed: s.removed.slice(0, -1),
      };
    });
  }, []);

  const lastRemoved = state.removed.length ? state.removed[state.removed.length - 1].draft : null;
  return { drafts: state.drafts, setGrams, remove, undoRemove, lastRemoved };
}

export function RemovedNotice({ name, onUndo }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  if (!name) return null;
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={[styles.noticeText, live.noticeText]}>{`${name} was taken out.`}</Text>
      <Button
        title="Undo"
        variant="secondary"
        size="sm"
        fullWidth={false}
        onPress={() => { haptics.selection(); onUndo(); }}
        accessibilityLabel={`Put ${name} back`}
      />
    </View>
  );
}

export default function SavedMealItemRow({ draft, name, energyUnit = 'kcal', onGrams, onRemove }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const shown = name ?? draft.name ?? 'Food';
  const { kcal } = draftMacros(draft);
  const grams = draft.quantityG;
  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.top}>
        <Text style={[styles.name, live.name]} numberOfLines={2}>{shown}</Text>
        <TouchableOpacity
          onPress={() => { haptics.selection(); onRemove(draft.key); }}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={`Take ${shown} out`}
        >
          <Ionicons name="close-circle-outline" size={iconSize.lg} color={t.colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.bottom}>
        {draft.fixed ? (
          <Text style={[styles.energy, live.energy]} accessibilityLabel={`${shown}, a quick add, no amount`}>Quick add</Text>
        ) : (
        <Stepper
          value={grams}
          onChange={(g) => onGrams(draft.key, g)}
          min={ITEM_MIN_G}
          max={ITEM_MAX_G}
          step={ITEM_STEP_G}
          label={`${shown} amount`}
          formatValue={(v) => `${v} g`}
          valueLabel={`${shown}, ${grams} grams`}
          decreaseLabel={`Less ${shown}`}
          increaseLabel={`More ${shown}`}
          onDecreaseLongPress={() => onGrams(draft.key, grams - 100)}
          onIncreaseLongPress={() => onGrams(draft.key, grams + 100)}
        />
        )}
        <Text style={[styles.energy, live.energy]}>
          {`${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}`}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, ...type.bodyStrong },
  removeBtn: {
    width: touchTarget.minimum, height: touchTarget.minimum,
    alignItems: 'center', justifyContent: 'center',
  },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  energy: { fontSize: fontSize.sm },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  noticeText: { flex: 1, fontSize: fontSize.sm },
});

function buildLiveStyles(t) {
  return {
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    energy: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    noticeText: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
  };
}
