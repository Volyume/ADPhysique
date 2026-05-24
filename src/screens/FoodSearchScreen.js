/**
 * FoodSearchScreen - the food picker (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and FOOD_DATA_STRATEGY_LOCKED.md.
 *
 * Sits between the Diary "Add food" tap and the actual log write.
 * Debounced 250ms type-to-search runs the waterfall (local cache first,
 * Move 1.5 adds live OFF + USDA). Recents and Favourites surface on
 * an empty query so the common case of "I already log this every day"
 * is one tap.
 *
 * Tap a row → ServingPicker sheet → "Add to diary". Long-press a row
 * to favourite it. "Create a custom food" lives at the bottom of the
 * results list for the inevitable miss.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  logFoodEntry, getRecentFoodEntries, toggleFavourite, getFavourites,
} from '../lib/food/db';
import { searchFoods } from '../lib/food/waterfall';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import FoodDetailSheet from '../components/food/FoodDetailSheet';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const SOURCE_LABEL = {
  off: 'OFF',
  usda: 'USDA',
  cofid: 'CoFID',
  user_ocr: 'Snapped',
  custom: 'You',
};

export default function FoodSearchScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  const [favouriteRefs, setFavouriteRefs] = useState(new Set());
  const [favouriteRows, setFavouriteRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);

  const debounceRef = useRef(null);

  // Load recents + favourites on focus so coming back from a log
  // shows the fresh ordering.
  const loadRecentsAndFavs = useCallback(async () => {
    if (!userId) return;
    try {
      const [recentRows, favRows] = await Promise.all([
        getRecentFoodEntries(userId, 15),
        getFavourites(userId),
      ]);
      const seen = new Set();
      const recentResolved = [];
      for (const r of recentRows) {
        if (seen.has(r.food_ref)) continue;
        seen.add(r.food_ref);
        const food = await resolveFoodRef(userId, r.food_ref);
        if (food) recentResolved.push(food);
        if (recentResolved.length >= 10) break;
      }
      setRecents(recentResolved);
      const favSet = new Set(favRows.map(f => f.food_ref));
      setFavouriteRefs(favSet);
      const favResolved = [];
      for (const f of favRows.slice(0, 20)) {
        const food = await resolveFoodRef(userId, f.food_ref);
        if (food) favResolved.push(food);
      }
      setFavouriteRows(favResolved);
    } catch (_) { /* tolerate */ }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadRecentsAndFavs(); }, [loadRecentsAndFavs]));

  // Debounced search. 250ms matches the locked spec.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchFoods(userId, q, { limit: 25 });
        setResults(rows);
      } catch (_) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, userId]);

  function openPicker(food) {
    setPicker({ food });
  }

  async function confirmLog({ quantityG, mealSlot: chosenSlot, entryDate: chosenDate }) {
    if (!picker?.food) return;
    const food = picker.food;
    const factor = quantityG / 100;
    await logFoodEntry(userId, {
      entryDate: chosenDate,
      mealSlot: chosenSlot,
      foodRef: food.food_ref,
      quantityG,
      kcal:      Math.round((food.kcal_100g    ?? 0) * factor),
      proteinG:  Math.round((food.protein_100g ?? 0) * factor * 10) / 10,
      carbsG:    Math.round((food.carbs_100g   ?? 0) * factor * 10) / 10,
      fatG:      Math.round((food.fat_100g     ?? 0) * factor * 10) / 10,
      fibreG:    food.fibre_100g != null ? Math.round(food.fibre_100g * factor * 10) / 10 : null,
    });
    navigation.goBack();
  }

  async function onLongPress(food) {
    try {
      const nowFav = await toggleFavourite(userId, food.food_ref);
      setFavouriteRefs(prev => {
        const next = new Set(prev);
        if (nowFav) next.add(food.food_ref); else next.delete(food.food_ref);
        return next;
      });
      loadRecentsAndFavs();
    } catch (_) {}
  }

  function gotoCustom() {
    navigation.replace('AddCustomFood', { mealSlot, entryDate });
  }

  const sections = useMemo(() => {
    const q = query.trim();
    if (q.length >= 2) {
      return [{ key: 'results', label: searching ? 'Searching' : 'Results', rows: results }];
    }
    const out = [];
    if (favouriteRows.length) out.push({ key: 'favs', label: 'Favourites', rows: favouriteRows });
    if (recents.length) out.push({ key: 'recents', label: 'Recent', rows: recents });
    return out;
  }, [query, results, searching, favouriteRows, recents]);

  const flat = useMemo(() => {
    const out = [];
    for (const s of sections) {
      if (s.rows.length === 0) continue;
      out.push({ type: 'header', key: `h-${s.key}`, label: s.label });
      for (const r of s.rows) out.push({ type: 'row', key: `${s.key}-${r.food_ref}`, food: r });
    }
    return out;
  }, [sections]);

  function renderItem({ item }) {
    if (item.type === 'header') return <Text style={styles.sectionHeader}>{item.label}</Text>;
    const food = item.food;
    const isFav = favouriteRefs.has(food.food_ref);
    const sourceTag = SOURCE_LABEL[food.source] ?? null;
    const kcalPerServing = food.serving_g
      ? Math.round((food.kcal_100g ?? 0) * food.serving_g / 100)
      : null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openPicker(food)}
        onLongPress={() => onLongPress(food)}
        accessibilityLabel={`${food.name}, ${kcalPerServing ?? '?'} kcal per serving. Long-press to favourite.`}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {food.name}
            {isFav ? '  ★' : ''}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {food.brand ? `${food.brand} · ` : ''}
            {food.serving_label || `${food.serving_g}g`}
            {kcalPerServing != null ? ` · ${kcalPerServing} kcal` : ''}
            {sourceTag ? `  ${sourceTag}` : ''}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to {MEAL_LABELS[mealSlot] ?? 'Snacks'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods or brands"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
      </View>

      <FlatList
        data={flat}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListEmptyComponent={
          query.trim().length >= 2 && !searching ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                No matches for "{query.trim()}".
              </Text>
              <TouchableOpacity style={styles.noResultsBtn} onPress={gotoCustom}>
                <Text style={styles.noResultsBtnText}>Create a custom food</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.footerBtn} onPress={gotoCustom}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.footerBtnText}>Create a custom food</Text>
          </TouchableOpacity>
        }
      />

      <FoodDetailSheet
        visible={!!picker}
        mode="add"
        food={picker?.food}
        initialMealSlot={mealSlot}
        initialEntryDate={entryDate}
        onSave={confirmLog}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 48,
  },
  searchInput: {
    flex: 1, color: colors.textPrimary, fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },

  sectionHeader: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    minHeight: 56,
  },
  rowName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  rowMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },

  noResults: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: { color: colors.textSecondary, fontSize: fontSize.md, marginBottom: spacing.md, textAlign: 'center' },
  noResultsBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  noResultsBtnText: { color: colors.background, fontWeight: fontWeight.bold },

  footerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg, marginTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
