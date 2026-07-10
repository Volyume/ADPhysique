/**
 * MyMealsScreen
 *
 * The user's saved meals. A saved meal is a named
 * bundle of foods logged together; tapping one logs every food in it to
 * the diary at the slot + date the screen was opened with. Reached from
 * the food search Saved meals entry, like Recipes.
 *
 * Create happens elsewhere: from the diary multi-select toolbar's "Save
 * as meal". This screen lists, logs, renames, and deletes.
 *
 * Data: listSavedMeals / applySavedMealToDiary / renameSavedMeal /
 * deleteSavedMeal from src/lib/food/db.js. The sync layer keeps the
 * cloud saved_meals table in step (migration 015).
 *
 * C6 (Wave A, 2026-07-03): logging a meal used to gate behind an
 * appAlert confirm dialog. That's gone, tapping a row now logs
 * immediately (optimistic write) and shows a success + Undo toast, the
 * same contract as DiaryScreen's onLogUsual and FoodSearchScreen's
 * confirmLog. A saved meal fans out into MULTIPLE food_entries rows, so
 * Undo must delete every one of them, not just the first; see
 * applySavedMealToDiary's `entryIds`.
 *
 * Voice rules from CLAUDE.md: no em dashes, plain spoken, British English.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, spacing, type } from '../styles/theme';
import { toEnergy, energyUnitLabel } from '../lib/format';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SavedMealDetailSheet from '../components/food/SavedMealDetailSheet';
import { SkeletonRow } from '../components/Skeleton';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import {
  listSavedMeals, applySavedMealToDiary, renameSavedMeal, deleteSavedMeal, deleteFoodEntry,
} from '../lib/food/db';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { audit } from '../lib/observability';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

export default function MyMealsScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const userId = user?.id;
  const toast = useToast();

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [renaming, setRenaming] = useState(null); // { id, name } | null
  const [renameText, setRenameText] = useState('');
  // L05-MM1 (design audit 2026-07-09, decision D6): read-only inspect sheet
  // for a saved meal's contents. Holds the already-loaded list item, so no
  // extra read is needed to open it.
  const [inspecting, setInspecting] = useState(null); // saved meal | null

  const reload = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      setMeals(await listSavedMeals(userId));
    } catch (e) {
      logError('MyMeals.listSavedMeals', e, { userId });
      setMeals([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // C6: one-tap log, no confirm dialog. Optimistic write + a success + Undo
  // toast, exactly the DiaryScreen.onLogUsual / FoodSearchScreen.confirmLog
  // contract. loggingRef guards a fast double-tap from minting the meal
  // twice (mirrors loggingUsualRef / loggingPlateRef elsewhere in food).
  const loggingRef = useRef(null);
  const onLog = useCallback(async (meal) => {
    if (!userId || loggingRef.current) return;
    loggingRef.current = meal.id;
    audit('food.savedMeal', { mealId: meal.id, mealSlot, itemCount: meal.itemCount });
    try {
      const { logged, entryIds } = await applySavedMealToDiary(userId, meal.id, { mealSlot, entryDate });
      if (logged > 0) {
        toast.show(`${meal.name ?? 'Meal'} added.`, {
          variant: 'undo',
          action: {
            label: 'Undo',
            onPress: async () => {
              // A saved meal fans out into several food_entries rows; Undo
              // must remove every one, not just the first.
              try { await Promise.all(entryIds.map((eid) => deleteFoodEntry(eid, userId))); } catch (_) { /* already gone */ }
            },
          },
        });
        navigation.goBack();
      } else {
        toast.show('This meal has no foods in it.', { variant: 'info' });
      }
    } catch (_) {
      toast.show('Couldn\'t log.', { variant: 'error' });
    } finally {
      loggingRef.current = null;
    }
  }, [userId, mealSlot, entryDate, navigation, toast]);

  function openMenu(meal) {
    appAlert(
      meal.name,
      undefined,
      [
        { text: 'Rename', onPress: () => { setRenaming(meal); setRenameText(meal.name); } },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => appAlert(
            `Delete "${meal.name}"?`,
            'The meal goes from your list. Anything you already logged from it stays in your diary.',
            [
              { text: 'Keep it', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteSavedMeal(userId, meal.id);
                  } catch (e) {
                    logError('MyMeals.deleteSavedMeal', e, { hasId: !!meal.id });
                    toast.show('Couldn\'t delete that meal.', { variant: 'error' });
                    return;
                  }
                  // Haptics completion pass (2026-07-10): data-first, this
                  // deletes the saved-meal TEMPLATE (past diary entries
                  // logged from it are unaffected), so it carries none of
                  // the diary-marking exclusion.
                  haptics.commit();
                  reload();
                },
              },
            ],
          ),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  async function submitRename() {
    const name = renameText.trim();
    const target = renaming;
    setRenaming(null);
    if (!target || !name) return;
    try {
      await renameSavedMeal(userId, target.id, name);
    } catch (e) {
      logError('MyMeals.renameSavedMeal', e, { hasId: !!target.id });
      toast.show('Couldn\'t rename that meal.', { variant: 'error' });
      return;
    }
    reload();
  }

  function renderItem({ item }) {
    // Haptics completion pass (2026-07-10): the row tap logs the meal
    // directly (C6, no confirm step), excluded per the campaign's
    // diary-marking/ED-pattern-detection rule -- left without an added
    // haptic.
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onLog(item)}
        onLongPress={() => openMenu(item)}
        accessibilityRole="button"
        accessibilityLabel={`Log ${item.name}`}
        accessibilityHint="Use the info button to view what's inside, or the more actions button to rename or delete"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.itemCount} {item.itemCount === 1 ? 'food' : 'foods'} | {toEnergy(item.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)} | {item.totals.protein}g protein
          </Text>
        </View>
        <View style={styles.rowActions}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <TouchableOpacity
            onPress={() => { haptics.selection(); setInspecting(item); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}`}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.selection(); openMenu(item); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${item.name}`}
          >
            <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Saved meals" />

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load saved meals"
            text="Something went wrong loading these. Try again."
            actionLabel="Try again"
            onAction={reload}
          />
        </View>
      ) : meals.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="restaurant-outline"
            title="Save your go-to meals"
            text={'Select foods in your diary and tap "Save as meal".'}
            actionLabel="Back to diary"
            onAction={() => navigation.goBack()}
          />
        </View>
      ) : (
        <FlashList
          data={meals}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}

      <BottomSheet
        visible={!!renaming}
        onClose={() => setRenaming(null)}
        keyboardAvoiding
        accessibilityLabel="Rename meal"
      >
        <Text style={styles.sheetTitle}>Rename meal</Text>
        <TextField
          value={renameText}
          onChangeText={setRenameText}
          placeholder="Meal name"
          placeholderTextColor={colors.textMuted}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={submitRename}
          accessibilityLabel="Meal name"
        />
        <View style={styles.sheetActions}>
          <Button title="Cancel" variant="secondary" onPress={() => setRenaming(null)} fullWidth={false} />
          <Button title="Save" onPress={submitRename} fullWidth={false} />
        </View>
      </BottomSheet>

      <SavedMealDetailSheet
        visible={!!inspecting}
        meal={inspecting}
        energyUnit={energyUnit}
        onClose={() => setInspecting(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    minHeight: 64,
  },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.md },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheetTitle: { ...type.bodyStrong, color: colors.textPrimary },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
