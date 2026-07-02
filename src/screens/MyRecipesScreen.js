/**
 * MyRecipesScreen
 *
 * List of the user's own composed recipes. Lives under the Diary
 * tab; reached from the Search modal's "My Recipes" entry. Tap a
 * row to log it as one diary line (one serving); the pencil edits;
 * long-press deletes; the header plus builds a new one.
 *
 * Data: listRecipes(userId) from src/lib/food/db.js. The cloud
 * sync layer keeps the table in step with the cloud
 * `recipes` table (migration 015 + 046).
 *
 * Voice rules from CLAUDE.md and COACHING_VOICE_SYNTHESIS_LOCKED.
 * No em dashes; plain spoken voice; British English.
 */
import { todayLocalKey } from '../lib/dayKey';
import { appAlert } from '../components/AppAlert';
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, spacing, radius, type, circle } from '../styles/theme';
import { SkeletonRow } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import { useToast } from '../components/Toast';
import { listRecipes, deleteRecipe, applyRecipeToDiary } from '../lib/food/db';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';

export default function MyRecipesScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();

  // Returned-from-builder hint: pass mealSlot + entryDate forward
  // so the Diary "Add" CTA can hand off seamlessly later.
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);
  // Servings picker (food audit F-4): tapping a recipe opens this prompt so the
  // user logs the portion they actually ate, instead of always one serving.
  const [servePrompt, setServePrompt] = useState(null); // the recipe being logged
  const [servings, setServings] = useState(1);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const rows = await listRecipes(userId);
      setRecipes(rows);
    } catch (_) {
      setRecipes([]);
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

  const stepServings = (delta) => {
    setServings((s) => {
      const next = Math.round((s + delta) * 2) / 2; // 0.5 steps, no float drift
      return Math.min(20, Math.max(0.5, next));
    });
  };
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
      <TouchableOpacity
        style={styles.row}
        onPress={() => onLog(item)}
        onLongPress={() => onDelete(item)}
        disabled={!!loggingId}
        accessibilityRole="button"
        accessibilityLabel={`Log ${item.name}`}
        accessibilityHint="Long press to delete"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.total_servings} {item.total_servings === 1 ? 'serving' : 'servings'}
            {item.notes ? ` · ${item.notes}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          disabled={!!loggingId}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        {busy
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name="add-circle" size={26} color={colors.primary} />}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader
        title="My recipes"
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
      ) : recipes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Build your first recipe</Text>
          <Text style={styles.emptyBody}>
            Build a recipe once. Log it as one line in your diary every time you eat it.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={onCreate} accessibilityRole="button" accessibilityLabel="Build a recipe">
            <Text style={styles.emptyCtaText}>Build a recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}

      <Modal
        visible={!!servePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!loggingId) setServePrompt(null); }}
      >
        <Pressable style={styles.backdrop} onPress={() => { if (!loggingId) setServePrompt(null); }}>
          <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{servePrompt?.name}</Text>
            <Text style={styles.sheetSub}>How many servings?</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => stepServings(-0.5)}
                disabled={servings <= 0.5}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fewer servings"
                style={[styles.stepBtn, servings <= 0.5 && styles.stepBtnDisabled]}
              >
                <Ionicons name="remove" size={24} color={servings <= 0.5 ? colors.textMuted : colors.primary} />
              </TouchableOpacity>
              <Text style={styles.stepValue} accessibilityLabel={`${fmtServings(servings)} servings`}>
                {fmtServings(servings)}
              </Text>
              <TouchableOpacity
                onPress={() => stepServings(0.5)}
                disabled={servings >= 20}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="More servings"
                style={[styles.stepBtn, servings >= 20 && styles.stepBtnDisabled]}
              >
                <Ionicons name="add" size={24} color={servings >= 20 ? colors.textMuted : colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={confirmLog}
              disabled={!!loggingId}
              accessibilityRole="button"
              accessibilityLabel={`Log ${fmtServings(servings)} ${servings === 1 ? 'serving' : 'servings'}`}
            >
              {loggingId
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={styles.logBtnText}>Log {fmtServings(servings)} {servings === 1 ? 'serving' : 'servings'}</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  editBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.xs,
  },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg },
  emptyCta: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  emptyCtaText: { ...type.bodyStrong, color: colors.onPrimary },
  // Servings picker modal (food audit F-4)
  backdrop: {
    flex: 1, backgroundColor: colors.scrim,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  sheet: {
    width: '100%', maxWidth: 360,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, alignItems: 'center',
  },
  sheetTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  sheetSub: { color: colors.textMuted, fontSize: fontSize.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  stepBtn: {
    width: 48, height: 48, borderRadius: circle(48),
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.5 },
  stepValue: {
    ...type.title, color: colors.textPrimary, minWidth: 56, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  logBtn: {
    alignSelf: 'stretch', alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primary, minHeight: 48, justifyContent: 'center',
  },
  logBtnText: { ...type.bodyStrong, color: colors.onPrimary },
});
