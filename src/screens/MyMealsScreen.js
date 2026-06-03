/**
 * MyMealsScreen
 *
 * The user's saved meals (My Meals templates). A saved meal is a named
 * bundle of foods logged together; tapping one logs every food in it to
 * the diary at the slot + date the screen was opened with. Reached from
 * the Search modal's "My meals" entry (custom tab), like My recipes.
 *
 * Create happens elsewhere: from the diary multi-select toolbar's "Save
 * as meal". This screen lists, logs, renames, and deletes.
 *
 * Data: listSavedMeals / applySavedMealToDiary / renameSavedMeal /
 * deleteSavedMeal from src/lib/food/db.js. The sync layer keeps the
 * cloud saved_meals table in step (migration 015).
 *
 * Voice rules from CLAUDE.md: no em dashes, plain spoken, British English.
 */
import { todayLocalKey } from '../lib/dayKey';
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { useToast } from '../components/Toast';
import {
  listSavedMeals, applySavedMealToDiary, renameSavedMeal, deleteSavedMeal,
} from '../lib/food/db';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const SLOT_LABELS = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks',
};

export default function MyMealsScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(null); // { id, name } | null
  const [renameText, setRenameText] = useState('');

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setMeals(await listSavedMeals(userId));
    } catch (_) {
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onLog = useCallback(async (meal) => {
    try {
      const n = await applySavedMealToDiary(userId, meal.id, { mealSlot, entryDate });
      if (n > 0) {
        navigation.goBack();
      } else {
        toast.show('This meal has no foods in it.', { variant: 'info' });
      }
    } catch (_) {
      toast.show('Couldn\'t log.', { variant: 'error' });
    }
  }, [userId, mealSlot, entryDate, navigation, toast]);

  function confirmLog(meal) {
    Alert.alert(
      `Log "${meal.name}"?`,
      `Adds ${meal.itemCount} ${meal.itemCount === 1 ? 'food' : 'foods'} to ${SLOT_LABELS[mealSlot] ?? mealSlot}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log it', onPress: () => onLog(meal) },
      ],
    );
  }

  function openMenu(meal) {
    Alert.alert(
      meal.name,
      undefined,
      [
        { text: 'Rename', onPress: () => { setRenaming(meal); setRenameText(meal.name); } },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert(
            `Delete "${meal.name}"?`,
            'The meal goes from your list. Anything you already logged from it stays in your diary.',
            [
              { text: 'Keep it', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try { await deleteSavedMeal(userId, meal.id); } catch (_) {}
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
    try { await renameSavedMeal(userId, target.id, name); } catch (_) {}
    reload();
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => confirmLog(item)}
        onLongPress={() => openMenu(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.itemCount} {item.itemCount === 1 ? 'food' : 'foods'} · {item.totals.kcal} kcal · {item.totals.protein}g protein
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="My meals" />

      {loading ? null : meals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved meals yet.</Text>
          <Text style={styles.emptyBody}>
            Select foods in your diary and tap "Save as meal".
          </Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}

      <Modal
        visible={!!renaming}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenaming(null)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.cardTitle}>Rename meal</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Meal name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setRenaming(null)} style={styles.cardBtn}>
                <Text style={styles.cardBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={[styles.cardBtn, styles.cardBtnPrimary]}>
                <Text style={[styles.cardBtnText, { color: colors.background, fontWeight: fontWeight.bold }]}>Save</Text>
              </TouchableOpacity>
            </View>
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
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    ...type.body,
    backgroundColor: colors.background, color: colors.textPrimary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.sm },
  cardBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  cardBtnPrimary: { backgroundColor: colors.primary },
  cardBtnText: { ...type.body, color: colors.textPrimary },
});
