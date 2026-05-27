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
  logFoodEntry, getRecentFoodEntries, getFavourites,
  getDislikes, cycleFoodPreference, getFoodPreference,
} from '../lib/food/db';
import { searchFoods } from '../lib/food/waterfall';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import FoodRow from '../components/food/FoodRow';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
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
  const [dislikeRefs, setDislikeRefs] = useState(new Set());
  const [dislikeRows, setDislikeRows] = useState([]);
  const [showExcluded, setShowExcluded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);

  const debounceRef = useRef(null);

  // Load recents + favourites + dislikes on focus so coming back
  // from a log shows the fresh ordering and any toggle landed
  // since last visit.
  const loadRecentsAndFavs = useCallback(async () => {
    if (!userId) return;
    try {
      const [recentRows, favRows, disRows] = await Promise.all([
        getRecentFoodEntries(userId, 15),
        getFavourites(userId),
        getDislikes(userId),
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
      const disSet = new Set(disRows.map(d => d.food_ref));
      setDislikeRefs(disSet);
      const disResolved = [];
      for (const d of disRows.slice(0, 20)) {
        const food = await resolveFoodRef(userId, d.food_ref);
        if (food) disResolved.push(food);
      }
      setDislikeRows(disResolved);
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

  // Auto-open the detail sheet when arriving from ScanBarcodeScreen.
  // The barcode scan resolves the food, then navigates here with the
  // result in route params so the user lands on a sheet ready to log.
  // Clearing the param prevents a re-open if the user closes the
  // sheet (without this, navigating back into the screen would
  // re-trigger the effect on every focus).
  const scannedFood = route?.params?.scannedFood;
  useEffect(() => {
    if (scannedFood && !picker) {
      openPicker(scannedFood);
      navigation.setParams({ scannedFood: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedFood]);

  async function confirmLog({ quantityG, mealSlot: chosenSlot, entryDate: chosenDate }) {
    if (!picker?.food) return;
    const food = picker.food;
    // Recipe builder reuse: when invoked with pickMode:'recipe', skip
    // the food_entries write and hand the selected food + quantity
    // back to the caller (RecipeBuilder) via route params.
    if (route?.params?.pickMode === 'recipe') {
      const returnTo = route?.params?.returnTo ?? 'RecipeBuilder';
      navigation.navigate(returnTo, {
        addedIngredient: {
          food_ref: food.food_ref,
          name: food.name,
          quantity_g: quantityG,
          food,
        },
      });
      return;
    }
    audit('food.add', {
      source: food.source ?? 'unknown',
      mealSlot: chosenSlot,
      fromScan: !!scannedFood,
    });
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
      const next = await cycleFoodPreference(userId, food.food_ref);
      // Optimistic update of the two ref sets so the row icon
      // flips before the full reload finishes.
      setFavouriteRefs(prev => {
        const set = new Set(prev);
        if (next === 'fav') set.add(food.food_ref);
        else set.delete(food.food_ref);
        return set;
      });
      setDislikeRefs(prev => {
        const set = new Set(prev);
        if (next === 'dislike') set.add(food.food_ref);
        else set.delete(food.food_ref);
        return set;
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
    if (dislikeRows.length) {
      out.push({
        key: 'excluded',
        label: showExcluded
          ? `Excluded · ${dislikeRows.length} (tap to hide)`
          : `Excluded · ${dislikeRows.length} (tap to show)`,
        rows: showExcluded ? dislikeRows : [],
        toggleable: true,
      });
    }
    return out;
  }, [query, results, searching, favouriteRows, recents, dislikeRows, showExcluded]);

  const flat = useMemo(() => {
    const out = [];
    // Browse-mode top affordances. Hidden during a query so search
    // results take the full surface.
    if (query.trim().length < 2 && route?.params?.pickMode !== 'recipe') {
      out.push({ type: 'cta', key: 'cta-my-recipes', label: 'My recipes', icon: 'restaurant-outline', target: 'MyRecipes' });
    }
    for (const s of sections) {
      // Always render the Excluded header so the user can expand
      // it even when its rows are collapsed; skip other empty
      // sections.
      if (s.rows.length === 0 && !s.toggleable) continue;
      out.push({
        type: 'header',
        key: `h-${s.key}`,
        label: s.label,
        toggleable: !!s.toggleable,
        sectionKey: s.key,
      });
      for (const r of s.rows) out.push({ type: 'row', key: `${s.key}-${r.food_ref}`, food: r });
    }
    return out;
  }, [sections, query, route?.params?.pickMode]);

  function renderItem({ item }) {
    if (item.type === 'cta') {
      return (
        <TouchableOpacity
          style={styles.ctaRow}
          onPress={() => navigation.navigate(item.target, { mealSlot, entryDate })}
        >
          <Ionicons name={item.icon} size={20} color={colors.primary} />
          <Text style={styles.ctaText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    }
    if (item.type === 'header') {
      if (item.toggleable && item.sectionKey === 'excluded') {
        return (
          <TouchableOpacity onPress={() => setShowExcluded(v => !v)}>
            <Text style={styles.sectionHeader}>{item.label}</Text>
          </TouchableOpacity>
        );
      }
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }
    const food = item.food;
    const preference = favouriteRefs.has(food.food_ref) ? 'fav'
      : dislikeRefs.has(food.food_ref) ? 'dislike'
      : null;
    return (
      <FoodRow
        food={food}
        preference={preference}
        onPress={() => openPicker(food)}
        onLongPress={() => onLongPress(food)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to {MEAL_LABELS[mealSlot] ?? 'Snacks'}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ScanBarcode', { mealSlot, entryDate })}
          hitSlop={12}
        >
          <Ionicons name="barcode-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
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
  ctaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ctaText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.md, flex: 1 },

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
