/**
 * MyRecipesScreen
 *
 * List of the user's own composed recipes. Lives under the Diary
 * tab; reached from the Search modal's "My Recipes" entry. Tap a
 * row to choose servings and log it; visible row actions edit or delete;
 * the header plus builds a new one.
 *
 * Data: listRecipesWithTotals(userId) from src/lib/food/db.js (headers plus
 * a resolved macro total per row, L05-MR1 2026-07-09). The cloud sync layer
 * keeps the table in step with the cloud `recipes` table (migration 015 + 046).
 *
 * Voice rules from CLAUDE.md and COACHING_VOICE_SYNTHESIS_LOCKED.
 * No em dashes; plain spoken voice; British English.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, spacing, type } from '../styles/theme';
import { SkeletonRow } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import Stepper from '../components/Stepper';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { listRecipesWithTotals, deleteRecipe, applyRecipeToDiary } from '../lib/food/db';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';

export default function MyRecipesScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const userId = user?.id;
  const toast = useToast();

  // Returned-from-builder hint: pass mealSlot + entryDate forward
  // so the Diary "Add" CTA can hand off seamlessly later.
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loggingId, setLoggingId] = useState(null);
  // Servings picker (food audit F-4): tapping a recipe opens this prompt so the
  // user logs the portion they actually ate, instead of always one serving.
  const [servePrompt, setServePrompt] = useState(null); // the recipe being logged
  const [servings, setServings] = useState(1);

  const reload = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await listRecipesWithTotals(userId);
      setRecipes(rows);
    } catch (e) {
      logError('MyRecipesScreen.reload', e, { userId });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function onCreate() {
    navigation.navigate('RecipeBuilder', { mealSlot, entryDate });
  }

  function onEdit(recipe) {
    navigation.navigate('RecipeBuilder', { recipeId: recipe.id, mealSlot, entryDate });
  }

  // Tap a recipe to choose how many servings, then log to the slot the user
  // came from and drop back to where they were.
  function onLog(recipe) {
    if (loggingId) return;
    setServings(1);
    setServePrompt(recipe);
  }

  const fmtServings = (s) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

  // Commit the log with the chosen servings. applyRecipeToDiary returns null
  // when the recipe has no resolvable ingredients yet, so we tell them to add one.
  async function confirmLog() {
    const recipe = servePrompt;
    if (!recipe || loggingId) return;
    setLoggingId(recipe.id);
    try {
      const id = await applyRecipeToDiary(userId, recipe.id, { mealSlot, entryDate, servings });
      if (id) {
        setServePrompt(null);
        navigation.goBack();
        return;
      }
      setLoggingId(null);
      setServePrompt(null);
      toast.show('Add at least one ingredient first.', { variant: 'info' });
    } catch (_) {
      setLoggingId(null);
      setServePrompt(null);
      toast.show('Couldn\'t log.', { variant: 'error' });
    }
  }

  function onDelete(recipe) {
    appAlert(
      `Delete "${recipe.name}"?`,
      'The recipe goes from your list. Past entries you logged from it stay in your diary.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecipe(userId, recipe.id);
            } catch (e) {
              logError('MyRecipes.deleteRecipe', e, { hasId: !!recipe.id });
              toast.show('Couldn\'t delete that recipe.', { variant: 'error' });
              return;
            }
            reload();
          },
        },
      ],
    );
  }

  function renderItem({ item }) {
    const busy = loggingId === item.id;
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowMain}
          onPress={() => onLog(item)}
          disabled={!!loggingId}
          accessibilityRole="button"
          accessibilityLabel={`Log ${item.name}`}
          accessibilityHint="Choose servings before adding it to your diary"
        >
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.total_servings} {item.total_servings === 1 ? 'serving' : 'servings'}
              {item.notes ? ` - ${item.notes}` : ''}
            </Text>
            {/* L05-MR1 (2026-07-09 design audit): recipe rows showed no
                calories/macros, unlike saved-meal rows. Whole-recipe total,
                same format MyMeals uses. */}
            {item.totals ? (
              <Text style={styles.meta}>
                {toEnergy(item.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)} - P {item.totals.protein}g
              </Text>
            ) : null}
          </View>
          {busy
            ? <ActivityIndicator size="small" color={colors.primary} />
            : (
              <View style={styles.logPill}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.logPillText}>Log</Text>
              </View>
            )}
        </TouchableOpacity>
        <View style={styles.rowActions}>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            disabled={!!loggingId}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            disabled={!!loggingId}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader
        title="Recipes"
        right={(
          <TouchableOpacity onPress={onCreate} hitSlop={12} accessibilityRole="button" accessibilityLabel="New recipe">
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : loadError ? (
        <EmptyState
          icon="warning-outline"
          title="Couldn't load recipes"
          text="Something went wrong loading these. Your saved recipes have not been changed."
          actionLabel="Try again"
          onAction={reload}
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Create your first recipe"
          text="Save the ingredients once, then log the recipe in one tap whenever you eat it."
          actionLabel="Create a recipe"
          onAction={onCreate}
        />
      ) : (
        <FlashList
          data={recipes}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}

      <BottomSheet
        visible={!!servePrompt}
        onClose={() => { if (!loggingId) setServePrompt(null); }}
        accessibilityLabel="Choose recipe servings"
        sheetStyle={styles.servingsSheet}
      >
        <Text style={styles.sheetTitle} numberOfLines={1}>{servePrompt?.name}</Text>
        <Text style={styles.sheetSub}>How many servings did you eat?</Text>
        <Stepper
          value={servings}
          onChange={setServings}
          min={0.5}
          max={20}
          step={0.5}
          label="servings"
          formatValue={fmtServings}
          valueLabel={`${fmtServings(servings)} servings`}
          decreaseLabel="Fewer servings"
          increaseLabel="More servings"
          hitSlop={8}
          style={styles.servingsStepper}
        />
        <Button
          title={`Log ${fmtServings(servings)} ${servings === 1 ? 'serving' : 'servings'}`}
          onPress={confirmLog}
          loading={!!loggingId}
          accessibilityLabel={`Log ${fmtServings(servings)} ${servings === 1 ? 'serving' : 'servings'}`}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowMain: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  logPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logPillText: { ...type.label, color: colors.primary },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  // Servings picker bottom sheet (food audit F-4)
  servingsSheet: { alignItems: 'center' },
  sheetTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  sheetSub: { color: colors.textMuted, fontSize: fontSize.sm },
  servingsStepper: { justifyContent: 'center', alignSelf: 'center' },
});
