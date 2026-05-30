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
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { SkeletonRow } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import { useToast } from '../components/Toast';
import { listRecipes, deleteRecipe, applyRecipeToDiary } from '../lib/food/db';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function MyRecipesScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();

  // Returned-from-builder hint: pass mealSlot + entryDate forward
  // so the Diary "Add" CTA can hand off seamlessly later.
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);

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

  // Tap a recipe to log one serving to the slot the user came from, then
  // drop back to where they were. Returns null when the recipe has no
  // resolvable ingredients yet, so we tell them to add one.
  async function onLog(recipe) {
    if (loggingId) return;
    setLoggingId(recipe.id);
    try {
      const id = await applyRecipeToDiary(userId, recipe.id, { mealSlot, entryDate, servings: 1 });
      if (id) {
        navigation.goBack();
        return;
      }
      setLoggingId(null);
      Alert.alert('Nothing to log', 'Add at least one ingredient to this recipe first.');
    } catch (_) {
      setLoggingId(null);
      toast.show('Couldn\'t log.', { variant: 'error' });
    }
  }

  function onDelete(recipe) {
    Alert.alert(
      `Delete "${recipe.name}"?`,
      'The recipe goes from your list. Past entries you logged from it stay in your diary.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await deleteRecipe(userId, recipe.id); } catch (_) {}
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
          <TouchableOpacity onPress={onCreate} hitSlop={12} accessibilityLabel="New recipe">
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
          <Text style={styles.emptyTitle}>No recipes yet.</Text>
          <Text style={styles.emptyBody}>
            Build a recipe once. Log it as one line in your diary every time you eat it.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={onCreate}>
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
  name: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
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
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  emptyBody: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg },
  emptyCta: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  emptyCtaText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
