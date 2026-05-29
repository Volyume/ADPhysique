/**
 * FoodSearchScreen - the food picker (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and FOOD_DATA_STRATEGY_LOCKED.md.
 *
 * Sits between the Diary "Add food" tap and the actual log write. The
 * top is a browse subnav (GAP row 28): Recents, Suggested, Favourites,
 * Frequents, Custom. The search box under it searches the food database
 * from any tab (250ms-debounced waterfall: local cache first, then live
 * OFF + USDA), nothing shown until a 2+ char query. With no query each
 * tab shows its own list. Suggested lists curated meals, not food rows.
 *
 * Tap a row -> ServingPicker sheet -> "Add to diary". Long-press a row
 * to cycle its preference (favourite / dislike). Custom-food creation
 * lives on the Custom tab and as a fallback under the search results.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  logFoodEntry, getRecentFoodEntries, getFavourites,
  getDislikes, cycleFoodPreference, getAllCustomFoods, getFoodFrequents,
  getRollupForDay, getLoggedMealSlotsForDay, applyCuratedMealToDiary,
} from '../lib/food/db';
import { getNutritionTargets } from '../lib/database';
import { getCuratedCandidates } from '../lib/food/curatedMeals';
import { rankSuggestions, mealsLeftToday } from '../lib/food/mealSuggest';
import { refreshFrequentsIfStale } from '../lib/food/frequents';
import { SEARCH_TABS, selectTabRows } from '../lib/food/searchTabs';
import { searchFoods } from '../lib/food/waterfall';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import QuickAddSheet from '../components/food/QuickAddSheet';
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
  const { user, userProfile } = useAppStore(useShallow((s) => ({ user: s.user, userProfile: s.userProfile })));
  const userId = user?.id;
  const toast = useToast();

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recents');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickSavedRef = useRef(false);
  // Multi-add plate: tap a row's + to drop a default serving here, then
  // log the whole plate in one pass. Disabled in recipe pick mode (which
  // returns a single ingredient). Mirrors MacroFactor's fastest workflow.
  const [plate, setPlate] = useState([]);
  const [showPlate, setShowPlate] = useState(false);
  const isRecipePick = route?.params?.pickMode === 'recipe';
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  const [favouriteRows, setFavouriteRows] = useState([]);
  const [favouriteRefs, setFavouriteRefs] = useState(new Set());
  const [dislikeRefs, setDislikeRefs] = useState(new Set());
  const [customRows, setCustomRows] = useState([]);
  const [frequentRows, setFrequentRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMeta, setSuggestMeta] = useState(null);
  const [loggingMealId, setLoggingMealId] = useState(null);

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

  // Curated meal suggestions, sized to one meal's share of what's left
  // today. Pulls the day's targets + intake, works out how many meals
  // remain, filters the curated library to the user's diet + this slot,
  // then ranks. Lazy: only runs when the Suggested tab is open.
  const loadSuggested = useCallback(async () => {
    if (!userId) return;
    setSuggestLoading(true);
    try {
      const diet = userProfile?.dietPreference ?? 'omnivore';
      const [targetsRow, rollup, loggedSlots, mealsPerRaw] = await Promise.all([
        getNutritionTargets(userId),
        getRollupForDay(userId, entryDate),
        getLoggedMealSlotsForDay(userId, entryDate),
        AsyncStorage.getItem('@volyume_meals_per_day'),
      ]);
      if (!targetsRow) {
        setSuggestions([]);
        setSuggestMeta({ hasTargets: false });
        return;
      }
      const targets = {
        kcal: targetsRow.targetKcal,
        protein: targetsRow.proteinG,
        carbs: targetsRow.carbsG,
        fat: targetsRow.fatG,
      };
      const consumed = rollup
        ? { kcal: rollup.kcal_total, protein: rollup.protein_g, carbs: rollup.carbs_g, fat: rollup.fat_g }
        : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
      const parsedMeals = parseInt(mealsPerRaw, 10);
      const mealsPerDay = (parsedMeals >= 3 && parsedMeals <= 6) ? parsedMeals : 4;
      const mealsLeft = mealsLeftToday(mealsPerDay, loggedSlots);
      const candidates = getCuratedCandidates({ diet, slot: mealSlot });
      const { suggestions: ranked, remaining, perMeal } = rankSuggestions({
        targets, consumed, savedMeals: candidates, foods: [], slot: mealSlot, mealsLeft, limit: 12,
      });
      setSuggestions(ranked);
      setSuggestMeta({ hasTargets: true, remaining, perMeal });
    } catch (_) {
      setSuggestions([]);
      setSuggestMeta(null);
    } finally {
      setSuggestLoading(false);
    }
  }, [userId, userProfile, entryDate, mealSlot]);

  useFocusEffect(useCallback(() => { loadBrowse(); }, [loadBrowse]));
  useEffect(() => { if (activeTab === 'frequents') loadFrequents(); }, [activeTab, loadFrequents]);
  useEffect(() => { if (activeTab === 'suggested') loadSuggested(); }, [activeTab, loadSuggested]);
  // Close the plate review once the last item is removed.
  useEffect(() => { if (showPlate && plate.length === 0) setShowPlate(false); }, [showPlate, plate.length]);

  // Debounced waterfall search. The search box searches the food database
  // from any browse tab (250ms debounce). Suggested has no search box, so
  // it is skipped. With no query each tab shows its own browse list.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (activeTab === 'suggested' || q.length < 2) {
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

  // Add one default serving of a food to the plate (no sheet). Tapping the
  // row still opens the detail sheet for a custom quantity.
  function addToPlate(food) {
    const servingG = food?.serving_g && food.serving_g > 0 ? food.serving_g : 100;
    const factor = servingG / 100;
    const item = {
      key: `${food.food_ref}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      food,
      quantityG: servingG,
      kcal: Math.round((food.kcal_100g ?? 0) * factor),
      proteinG: Math.round((food.protein_100g ?? 0) * factor * 10) / 10,
      carbsG: Math.round((food.carbs_100g ?? 0) * factor * 10) / 10,
      fatG: Math.round((food.fat_100g ?? 0) * factor * 10) / 10,
      fibreG: food.fibre_100g != null ? Math.round((food.fibre_100g) * factor * 10) / 10 : null,
    };
    setPlate((p) => [...p, item]);
  }

  function removeFromPlate(key) {
    setPlate((p) => p.filter((it) => it.key !== key));
  }

  const plateKcal = useMemo(() => plate.reduce((s, it) => s + (it.kcal || 0), 0), [plate]);

  // Log every plate item to the meal, then return to the diary.
  async function logPlate() {
    if (!plate.length) return;
    for (const it of plate) {
      // eslint-disable-next-line no-await-in-loop
      await logFoodEntry(userId, {
        entryDate,
        mealSlot,
        foodRef: it.food.food_ref,
        quantityG: it.quantityG,
        kcal: it.kcal,
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        fibreG: it.fibreG,
      });
    }
    setPlate([]);
    setShowPlate(false);
    navigation.goBack();
  }

  // Quick add: log calories (and optional macros) with no food lookup.
  // food_ref 'quick:adhoc' has no resolvable name, so the diary shows it
  // as "Quick add" with no gram weight. Logs, then returns to the diary.
  async function confirmQuickAdd({ kcal, protein, carbs, fat, mealSlot: slot }) {
    await logFoodEntry(userId, {
      entryDate,
      mealSlot: slot,
      foodRef: 'quick:adhoc',
      quantityG: 0,
      kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fibreG: null,
    });
    quickSavedRef.current = true;
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

  // Log a whole curated meal: fan its items into the diary at this
  // slot/date, then close back to the diary. Fixed portions, so no
  // serving picker.
  async function logCuratedMeal(s) {
    if (!userId || !s?.id || loggingMealId) return;
    setLoggingMealId(s.id);
    try {
      audit('food.suggestMeal', { mealId: s.id, mealSlot, itemCount: s.itemCount });
      await applyCuratedMealToDiary(userId, s.id, { mealSlot, entryDate });
      navigation.goBack();
    } catch (_) {
      setLoggingMealId(null);
    }
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
      // The long-press preference cycle is otherwise invisible; confirm
      // the new state so the gesture has feedback.
      const msg = next === 'fav' ? 'Added to favourites'
        : next === 'dislike' ? 'Hidden from suggestions'
        : 'Preference cleared';
      toast.show(msg);
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
        onAdd={isRecipePick ? undefined : () => addToPlate(food)}
      />
    );
  }

  function renderEmpty() {
    // A live search with no hits: offer the custom-food fallback.
    if (query.trim().length >= 2) {
      if (searching) return null;
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

  function renderSuggested() {
    if (suggestLoading) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      );
    }
    if (suggestMeta && !suggestMeta.hasTargets) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Set your daily targets to get meal ideas.</Text>
        </View>
      );
    }
    if (!suggestions.length) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Nothing to suggest right now.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={suggestions}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          suggestMeta?.perMeal ? (
            <Text style={styles.suggestHint}>
              Sized for this meal: around {Math.round(suggestMeta.perMeal.protein)}g protein, {Math.round(suggestMeta.perMeal.kcal)} kcal.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.suggestCard}
            onPress={() => logCuratedMeal(item)}
            disabled={!!loggingMealId}
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.name}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.suggestName}>{item.name}</Text>
              <Text style={styles.suggestMacros}>
                {item.macros.kcal} kcal · {item.macros.protein}g protein · {item.macros.carbs}g carbs · {item.macros.fat}g fat
              </Text>
            </View>
            {loggingMealId === item.id
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="add-circle" size={26} color={colors.primary} />}
          </TouchableOpacity>
        )}
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowQuickAdd(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quick add calories"
          >
            <Ionicons name="flash-outline" size={23} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ScanBarcode', { mealSlot, entryDate })}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Scan a barcode"
          >
            <Ionicons name="barcode-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
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

      {activeTab === 'suggested' ? renderSuggested() : (
      <>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods or brands"
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
          query.trim().length >= 2 && results.length > 0 ? (
            <TouchableOpacity style={styles.footerBtn} onPress={gotoCustomReplace}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.footerBtnText}>Create a custom food</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      </>
      )}

      {!isRecipePick && plate.length > 0 ? (
        <View style={styles.plateBar}>
          <TouchableOpacity
            style={styles.plateInfo}
            onPress={() => setShowPlate(true)}
            accessibilityRole="button"
            accessibilityLabel="Review the plate"
          >
            <Text style={styles.plateCount}>{plate.length} on the plate</Text>
            <Text style={styles.plateKcalLine}>~{plateKcal} kcal · tap to review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plateLogBtn}
            onPress={logPlate}
            accessibilityRole="button"
            accessibilityLabel={`Log ${plate.length} foods to ${MEAL_LABELS[mealSlot] ?? 'Snacks'}`}
          >
            <Text style={styles.plateLogText}>Log {plate.length}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showPlate} transparent animationType="slide" onRequestClose={() => setShowPlate(false)}>
        <View style={styles.plateModalBackdrop}>
          <View style={styles.plateModalSheet}>
            <View style={styles.plateModalHeader}>
              <Text style={styles.plateModalTitle}>Plate ({plate.length})</Text>
              <TouchableOpacity onPress={() => setShowPlate(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {plate.map((it) => (
                <View key={it.key} style={styles.plateItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plateItemName} numberOfLines={1}>{it.food.name}</Text>
                    <Text style={styles.plateItemMeta}>{Math.round(it.quantityG)}g · {it.kcal} kcal</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFromPlate(it.key)} hitSlop={10} accessibilityLabel={`Remove ${it.food.name}`}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.plateModalActions}>
              <TouchableOpacity style={styles.plateClearBtn} onPress={() => { setPlate([]); setShowPlate(false); }}>
                <Text style={styles.plateClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.plateLogBtnWide} onPress={logPlate}>
                <Text style={styles.plateLogText}>Log {plate.length} to {MEAL_LABELS[mealSlot] ?? 'Snacks'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FoodDetailSheet
        visible={!!picker}
        mode="add"
        food={picker?.food}
        initialMealSlot={mealSlot}
        initialEntryDate={entryDate}
        onSave={confirmLog}
        onClose={() => setPicker(null)}
      />

      <QuickAddSheet
        visible={showQuickAdd}
        initialMealSlot={mealSlot}
        onSave={confirmQuickAdd}
        onClose={() => {
          setShowQuickAdd(false);
          if (quickSavedRef.current) { quickSavedRef.current = false; navigation.goBack(); }
        }}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },

  tabBar: {
    // flexShrink: 0 so the strip keeps its intrinsic height and never gets
    // squished by the list below (which was clipping the tab labels).
    flexGrow: 0, flexShrink: 0,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  tabLabel: {
    color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm + 6,
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

  suggestHint: {
    color: colors.textMuted, fontSize: fontSize.xs,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  suggestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    borderRadius: radius.md,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  suggestName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  suggestMacros: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 },

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

  plateBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  plateInfo: { flex: 1 },
  plateCount: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  plateKcalLine: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  plateLogBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  plateLogText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  plateModalBackdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  plateModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  plateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  plateModalTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  plateItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  plateItemName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  plateItemMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  plateModalActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  plateClearBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  plateClearText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  plateLogBtnWide: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
});
