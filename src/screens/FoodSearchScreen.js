/**
 * FoodSearchScreen - the food picker (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and FOOD_DATA_STRATEGY_LOCKED.md.
 *
 * Sits between the Diary "Add food" tap and the actual log write. The
 * top is a five-tab subnav (GAP row 28): Recents, Favourites, Frequents,
 * Custom, Database. The first four are curated local lists; the query
 * filters them by name. Database is the search surface: 250ms-debounced
 * waterfall (local cache first, then live OFF + USDA), nothing shown
 * until a 2+ char query.
 *
 * Tap a row -> ServingPicker sheet -> "Add to diary". Long-press a row
 * to cycle its preference (favourite / dislike). Custom-food creation
 * lives on the Custom tab and as a fallback under the Database results.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  logFoodEntry, getRecentFoodEntries, getFavourites,
  getDislikes, cycleFoodPreference, getAllCustomFoods, getFoodFrequents,
} from '../lib/food/db';
import { refreshFrequentsIfStale } from '../lib/food/frequents';
import { SEARCH_TABS, selectTabRows } from '../lib/food/searchTabs';
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

const EMPTY_COPY = {
  recents: 'Nothing logged yet.',
  favourites: 'No favourites yet. Long-press a food to star it.',
  frequents: 'Nothing logged often enough yet.',
};

export default function FoodSearchScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recents');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  const [favouriteRows, setFavouriteRows] = useState([]);
  const [favouriteRefs, setFavouriteRefs] = useState(new Set());
  const [dislikeRefs, setDislikeRefs] = useState(new Set());
  const [customRows, setCustomRows] = useState([]);
  const [frequentRows, setFrequentRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);

  const debounceRef = useRef(null);

  // Browse lists (Recents / Favourites / Custom) + the preference ref
  // sets that drive each row's star/exclude icon. Reloaded on focus so
  // a log or a long-press toggle since last visit shows fresh.
  const loadBrowse = useCallback(async () => {
    if (!userId) return;
    try {
      const [recentRows, favRows, disRows, customRaw] = await Promise.all([
        getRecentFoodEntries(userId, 25),
        getFavourites(userId),
        getDislikes(userId),
        getAllCustomFoods(userId),
      ]);
      const seen = new Set();
      const recentResolved = [];
      for (const r of recentRows) {
        if (seen.has(r.food_ref)) continue;
        seen.add(r.food_ref);
        const food = await resolveFoodRef(userId, r.food_ref);
        if (food) recentResolved.push(food);
        if (recentResolved.length >= 25) break;
      }
      setRecents(recentResolved);

      setFavouriteRefs(new Set(favRows.map((f) => f.food_ref)));
      const favResolved = [];
      for (const f of favRows.slice(0, 50)) {
        const food = await resolveFoodRef(userId, f.food_ref);
        if (food) favResolved.push(food);
      }
      setFavouriteRows(favResolved);

      setDislikeRefs(new Set(disRows.map((d) => d.food_ref)));

      setCustomRows((customRaw || []).map((c) => ({
        ...c,
        food_ref: `custom:${c.id}`,
        source: 'custom',
      })));
    } catch (_) { /* tolerate */ }
  }, [userId]);

  // Frequents is server-computed; pull a fresh snapshot if the local
  // cache is stale, then resolve the refs for display. Lazy: only runs
  // when the Frequents tab is actually opened.
  const loadFrequents = useCallback(async () => {
    if (!userId) return;
    try {
      await refreshFrequentsIfStale(userId);
      const rows = await getFoodFrequents(userId, 20);
      const resolved = [];
      for (const r of rows) {
        const food = await resolveFoodRef(userId, r.food_ref);
        if (food) resolved.push(food);
      }
      setFrequentRows(resolved);
    } catch (_) { /* tolerate */ }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadBrowse(); }, [loadBrowse]));
  useEffect(() => { if (activeTab === 'frequents') loadFrequents(); }, [activeTab, loadFrequents]);

  // Debounced waterfall search, Database tab only. Matches the locked
  // 250ms; other tabs filter their list client-side via selectTabRows.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (activeTab !== 'database' || q.length < 2) {
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
  }, [query, userId, activeTab]);

  function openPicker(food) {
    setPicker({ food });
  }

  // Auto-open the detail sheet when arriving from ScanBarcodeScreen.
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
    // Recipe builder reuse: hand the picked food back instead of logging.
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
      setFavouriteRefs((prev) => {
        const set = new Set(prev);
        if (next === 'fav') set.add(food.food_ref);
        else set.delete(food.food_ref);
        return set;
      });
      setDislikeRefs((prev) => {
        const set = new Set(prev);
        if (next === 'dislike') set.add(food.food_ref);
        else set.delete(food.food_ref);
        return set;
      });
      loadBrowse();
    } catch (_) {}
  }

  // Database "no match" fallback replaces the screen so Back lands on
  // the Diary, not an empty search. The Custom tab CTA pushes instead,
  // so the user can return to the picker.
  function gotoCustomReplace() {
    navigation.replace('AddCustomFood', { mealSlot, entryDate });
  }
  function newCustomFood() {
    navigation.navigate('AddCustomFood', { mealSlot, entryDate });
  }

  const tabRows = useMemo(() => selectTabRows({
    activeTab,
    query,
    lists: { recents, favourites: favouriteRows, frequents: frequentRows, custom: customRows },
    results,
  }), [activeTab, query, recents, favouriteRows, frequentRows, customRows, results]);

  const listData = useMemo(() => {
    const out = [];
    if (activeTab === 'custom') {
      out.push({ type: 'cta', key: 'cta-new-custom', label: 'New custom food', icon: 'add-circle-outline', action: 'custom' });
      if (route?.params?.pickMode !== 'recipe') {
        out.push({ type: 'cta', key: 'cta-my-recipes', label: 'My recipes', icon: 'restaurant-outline', action: 'recipes' });
        out.push({ type: 'cta', key: 'cta-my-meals', label: 'My meals', icon: 'fast-food-outline', action: 'meals' });
      }
    }
    for (const f of tabRows) out.push({ type: 'row', key: `${activeTab}-${f.food_ref}`, food: f });
    return out;
  }, [activeTab, tabRows, route?.params?.pickMode]);

  function renderItem({ item }) {
    if (item.type === 'cta') {
      return (
        <TouchableOpacity
          style={styles.ctaRow}
          onPress={() => {
            if (item.action === 'custom') return newCustomFood();
            if (item.action === 'meals') return navigation.navigate('MyMeals', { mealSlot, entryDate });
            return navigation.navigate('MyRecipes', { mealSlot, entryDate });
          }}
        >
          <Ionicons name={item.icon} size={20} color={colors.primary} />
          <Text style={styles.ctaText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
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

  function renderEmpty() {
    if (activeTab === 'database') {
      if (query.trim().length < 2 || searching) return null;
      return (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No matches for "{query.trim()}".</Text>
          <TouchableOpacity style={styles.noResultsBtn} onPress={gotoCustomReplace}>
            <Text style={styles.noResultsBtnText}>Create a custom food</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const copy = EMPTY_COPY[activeTab];
    if (!copy) return null;
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{copy}</Text>
      </View>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
        keyboardShouldPersistTaps="handled"
      >
        {SEARCH_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={styles.tab}
            onPress={() => setActiveTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === t.key }}
          >
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            <View style={[styles.tabUnderline, activeTab === t.key && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={activeTab === 'database' ? 'Search foods or brands' : 'Filter this list'}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          activeTab === 'database' && results.length > 0 ? (
            <TouchableOpacity style={styles.footerBtn} onPress={gotoCustomReplace}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.footerBtnText}>Create a custom food</Text>
            </TouchableOpacity>
          ) : null
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

  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  tabLabel: {
    color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    paddingBottom: spacing.sm,
  },
  tabLabelActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  tabUnderline: {
    height: 2, width: '100%', backgroundColor: 'transparent',
    borderRadius: 1,
  },
  tabUnderlineActive: { backgroundColor: colors.primary },

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

  ctaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ctaText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.md, flex: 1 },

  emptyWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },

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
