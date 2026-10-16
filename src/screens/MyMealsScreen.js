/**
 * MyMealsScreen
 *
 * The user's saved meals. A saved meal is a named
 * bundle of foods logged together; tapping one opens a confirmation for the
 * slot + date the screen was opened with. Reached from
 * the food search Saved meals entry, like Recipes.
 *
 * Create happens elsewhere: from the diary multi-select toolbar's "Save
 * as meal". This screen lists, logs, renames, and deletes.
 *
 * Data: listSavedMeals / logFoodEntries / deleteFoodEntries / renameSavedMeal /
 * deleteSavedMeal / updateSavedMeal from src/lib/food/db.js. The sync layer
 * keeps the cloud saved_meals table in step (migration 015).
 *
 * A saved meal shortcut is preselection, not evidence that the remembered
 * portions were eaten. The sheet shows the foods and writes only from its
 * explicit button. A saved meal fans out into MULTIPLE food_entries rows, so
 * the write is ONE logFoodEntries call (one transaction) and Undo removes
 * every row it returned in one deleteFoodEntries call.
 *
 * D230 R12, R15, R16 and R18 (food level-up 2026-10-16): tapping a meal (or
 * its info button) opens SavedMealDetailSheet, which lists each food with its
 * grams, a house Stepper and a remove control (Undo inside the sheet), and
 * logs the foods AS SHOWN with "Add to Breakfast". The sheet replaces the
 * old "Add saved meal?" confirmation and its "Add this meal" button, and the
 * meal itself is never changed by logging. "Edit this meal" turns the same
 * list into SavedMealEditSheet (rename, grams, remove, "Add a food" through a
 * FoodSearch round trip in route params, as the recipe builder adds an
 * ingredient), and Save writes the new name and items in one updateSavedMeal
 * call. The log toast names the meal it went to ("Your usual breakfast added
 * to Breakfast.") and its Undo removes every row the write returned; every
 * failure is a full sentence and logs its cause first; the info and more
 * icons are 48 dp (24 dp glyph plus the house 12 dp hit slop); sheet titles
 * carry the header role. Nothing here reads a safety state.
 *
 * Voice rules from CLAUDE.md: no em dashes, plain spoken, British English.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../components/Text';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, spacing, type, iconSize, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../lib/format';
import ModalHeader from '../components/ModalHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SavedMealDetailSheet from '../components/food/SavedMealDetailSheet';
import SavedMealEditSheet from '../components/food/SavedMealEditSheet';
import { SkeletonRow } from '../components/Skeleton';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import {
  listSavedMeals, logFoodEntries, deleteFoodEntries, renameSavedMeal, deleteSavedMeal, updateSavedMeal,
  upsertSlotRecent,
} from '../lib/food/db';
import { resolveFoodRefs } from '../lib/food/sources/localCache';
import { draftFromFood, draftsToEntries } from '../lib/food/savedMealItems';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { audit } from '../lib/observability';
import { logError } from '../lib/errorLog';
import { mealSlotLabel } from '../lib/food/mealSlots';
import * as haptics from '../lib/haptics';

export default function MyMealsScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const userId = user?.id;
  const toast = useToast();
  // CP-10 batch D (2026-07-10): live theme (src/hooks/useTheme.js).
  // Memoised because this is a list-heavy screen (renderItem runs once per
  // FlashList row). See buildLiveStyles header comment after the frozen
  // `styles` block below.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // The slot and the day this screen was opened for. A round trip through the
  // food search returns here with only the food in the params (navigate replaces
  // them), so they are kept the first time they are seen and a later param can
  // only update them, never blank them.
  const paramsRef = useRef({
    mealSlot: route?.params?.mealSlot ?? 'snack',
    entryDate: route?.params?.entryDate ?? todayLocalKey(),
  });
  if (route?.params?.mealSlot) paramsRef.current.mealSlot = route.params.mealSlot;
  if (route?.params?.entryDate) paramsRef.current.entryDate = route.params.entryDate;
  const { mealSlot, entryDate } = paramsRef.current;

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [renaming, setRenaming] = useState(null); // { id, name } | null
  const [renameText, setRenameText] = useState('');
  // The saved meal whose foods are open in the log sheet (D230 R12). Holds the
  // already-loaded list item, so no extra read is needed to open it.
  const [opened, setOpened] = useState(null); // saved meal | null
  const [logging, setLogging] = useState(false);
  // Resolved names for the open meal's foods: one batched read per opening.
  const [names, setNames] = useState(null); // Map<foodRef, food> | null
  // "Edit this meal": the state the edit sheet starts from. It survives the
  // trip to the food search (the sheet is hidden while the search is open).
  const [editSeed, setEditSeed] = useState(null); // { mealId, name, drafts } | null
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const editSeedRef = useRef(null);
  editSeedRef.current = editSeed;

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

  // A recent-meal shortcut can route here with an exact template identity.
  // It opens the same confirmation as a row tap and never logs on arrival.
  useEffect(() => {
    const id = route?.params?.confirmMealId;
    if (!id || loading) return;
    const meal = meals.find((m) => m.id === id);
    if (meal) setOpened(meal);
    navigation.setParams({ confirmMealId: undefined });
  }, [route?.params?.confirmMealId, loading, meals, navigation]);

  // One batched name read per opening (the stored name stands in until it
  // lands, and for a food the library no longer holds).
  useEffect(() => {
    if (!opened || !userId) return undefined;
    const refs = (opened.items ?? []).map((it) => it?.foodRef).filter(Boolean);
    if (refs.length === 0) { setNames(null); return undefined; }
    let cancelled = false;
    resolveFoodRefs(userId, refs)
      .then((map) => { if (!cancelled) setNames(map); })
      .catch((e) => { logError('MyMeals.resolveNames', e, { count: refs.length }); });
    return () => { cancelled = true; };
  }, [opened, userId]);

  // The sheet's button is the write boundary. loggingRef guards a fast
  // double-tap from minting the meal twice. The foods are written AS SHOWN
  // (changed grams scaled, removed foods absent) in ONE logFoodEntries call;
  // the saved meal itself is not touched.
  const loggingRef = useRef(null);
  const confirmLog = useCallback(async (drafts) => {
    const meal = opened;
    if (!userId || !meal || loggingRef.current) return;
    const entries = draftsToEntries(drafts, { mealSlot, entryDate });
    if (entries.length === 0) {
      toast.show('This meal has no foods in it.', { variant: 'info' });
      return;
    }
    loggingRef.current = meal.id;
    setLogging(true);
    audit('food.savedMeal', { mealId: meal.id, mealSlot, itemCount: entries.length });
    try {
      const entryIds = await logFoodEntries(userId, entries);
      // Derived memory for "Add again"; the meal as a whole has no grams.
      await upsertSlotRecent(userId, { mealSlot, foodRef: `meal:${meal.id}`, quantityG: 0 })
        .catch((e) => { logError('MyMeals.slotRecent', e, { mealSlot }); });
      toast.show(`${meal.name ?? 'Meal'} added to ${mealSlotLabel(mealSlot)}.`, {
        variant: 'undo',
        action: {
          label: 'Undo',
          onPress: async () => {
            // A saved meal fans out into several food_entries rows; Undo
            // removes every one in one call.
            try {
              await deleteFoodEntries(userId, entryIds);
            } catch (e) {
              logError('MyMeals.undoSavedMeal', e, { count: entryIds.length });
              toast.show('That meal was not removed. You can remove its foods from the diary.', { variant: 'error' });
            }
          },
        },
      });
      setOpened(null);
      navigation.goBack();
    } catch (e) {
      logError('MyMeals.applySavedMeal', e, { mealSlot, itemCount: entries.length });
      toast.show('That meal was not added. Try again in a moment.', { variant: 'error' });
    } finally {
      loggingRef.current = null;
      setLogging(false);
    }
  }, [opened, userId, mealSlot, entryDate, navigation, toast]);

  // "Edit this meal": the list as shown becomes the editor's starting state.
  function startEdit(drafts) {
    if (!opened) return;
    setEditSeed({ mealId: opened.id, name: opened.name, drafts });
    setEditVisible(true);
    setOpened(null);
  }

  // "Add a food": the edit sheet hands over its state, steps aside, and the
  // food search returns the pick in route params (the recipe builder's shape).
  function onEditAddFood({ name, drafts }) {
    if (!editSeed) return;
    setEditSeed({ ...editSeed, name, drafts });
    setEditVisible(false);
    navigation.push('FoodSearch', {
      pickMode: 'recipe',
      returnTo: 'MyMeals',
      mealSlot, entryDate,
    });
  }

  // Back from the food search (a pick, or closed without one): bring the
  // edit sheet back. A pick arrives as `addedIngredient` and is appended once.
  useFocusEffect(useCallback(() => {
    if (editSeedRef.current) setEditVisible(true);
  }, []));
  const incoming = route?.params?.addedIngredient;
  useEffect(() => {
    if (!incoming) return;
    const seed = editSeedRef.current;
    if (seed) {
      const grams = Number(incoming.quantity_g) || 0;
      const food = { ...(incoming.food ?? {}), food_ref: incoming.food_ref, name: incoming.name ?? incoming.food?.name };
      if (grams > 0 && food.food_ref) {
        const draft = draftFromFood(food, grams);
        setEditSeed({ ...seed, drafts: [...seed.drafts, draft] });
        setEditVisible(true);
      }
    }
    navigation.setParams({ addedIngredient: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const savingRef = useRef(false);
  async function saveEdit({ name, items }) {
    const seed = editSeed;
    if (!userId || !seed || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await updateSavedMeal(userId, seed.mealId, { name, items });
    } catch (e) {
      logError('MyMeals.updateSavedMeal', e, { itemCount: items.length });
      toast.show('That meal was not saved. Try again in a moment.', { variant: 'error' });
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    haptics.commit();
    setEditSeed(null);
    setEditVisible(false);
    toast.show(`${name} saved.`, { variant: 'success' });
    reload();
  }

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
                    toast.show('That meal was not deleted. Try again in a moment.', { variant: 'error' });
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
      toast.show('That meal was not renamed. Try again in a moment.', { variant: 'error' });
      return;
    }
    reload();
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[styles.row, live.row]}
        onPress={() => setOpened(item)}
        onLongPress={() => openMenu(item)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name}`}
        accessibilityHint="Opens the foods in this meal so you can change them before adding. Use more actions to rename or delete"
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, live.name]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.meta, live.meta]}>
            {item.itemCount} {item.itemCount === 1 ? 'food' : 'foods'} | {toEnergy(item.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)} | {item.totals.protein}g protein
          </Text>
        </View>
        <View style={styles.rowActions}>
          <Ionicons name="add-circle-outline" size={iconSize.lg} color={t.colors.primary} />
          <TouchableOpacity
            onPress={() => { haptics.selection(); setOpened(item); }}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}`}
          >
            <Ionicons name="information-circle-outline" size={iconSize.lg} color={t.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.selection(); openMenu(item); }}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${item.name}`}
          >
            <Ionicons name="ellipsis-horizontal-circle-outline" size={iconSize.lg} color={t.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      {/* Coherence pass: presented as a modal (RootNavigator DiaryStack),
          so it uses the shared ModalHeader like its sibling food modals. */}
      <ModalHeader title="Saved meals" onClose={() => navigation.goBack()} />

      {loading ? (
        <View style={{ paddingHorizontal: t.screenPadding }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <EmptyState
            icon="warning-outline"
            title="Your saved meals did not load"
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
            // D94 (Campaign 3, Phase 10): the only creation path is the
            // diary long-press, and this line never said so - the one
            // instruction for a gesture-only flow must name the gesture.
            text={'Tap an entry in your diary and choose Select entries, or press and hold one, then tap "Save as meal".'}
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
        <Text style={[styles.sheetTitle, live.sheetTitle]} accessibilityRole="header">Rename meal</Text>
        <TextField
          value={renameText}
          onChangeText={setRenameText}
          placeholder="Meal name"
          placeholderTextColor={t.colors.textMuted}
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
        visible={!!opened}
        meal={opened}
        names={names}
        energyUnit={energyUnit}
        mealLabel={mealSlotLabel(mealSlot)}
        busy={logging}
        onClose={() => { if (!logging) setOpened(null); }}
        onConfirm={confirmLog}
        onEdit={startEdit}
      />

      <SavedMealEditSheet
        visible={!!editSeed && editVisible}
        seed={editSeed}
        names={names}
        energyUnit={energyUnit}
        saving={saving}
        onClose={() => { if (!saving) { setEditSeed(null); setEditVisible(false); } }}
        onAddFood={onEditAddFood}
        onSave={saveEdit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    minHeight: 64,
  },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  // 24 dp glyphs with the house 12 dp hit slop are 48 dp targets; the 24 dp gap
  // puts their centres 48 dp apart, so neighbouring targets meet without
  // overlapping (D230 R16).
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginLeft: spacing.md },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheetTitle: { ...type.bodyStrong, color: colors.textPrimary },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});

// CP-10 batch D (2026-07-10): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values, so
// this screen's tokens stay live under a theme/accessibility toggle. Pure
// layout keys (flex/gap/padding/width, no token) are correctly omitted --
// there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    row: { paddingHorizontal: t.screenPadding, borderBottomColor: t.colors.borderSubtle },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    meta: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    sheetTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
  };
}
