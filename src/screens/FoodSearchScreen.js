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
import { todayLocalKey } from '../lib/dayKey';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { SkeletonRow } from '../components/Skeleton';
import {
  logFoodEntry, deleteFoodEntry, getFavourites,
  getDislikes, cycleFoodPreference, getAllCustomFoods, getFoodFrequents,
  getRollupForDay, getLoggedMealSlotsForDay, applyCuratedMealToDiary,
  upsertSlotRecent, getSlotRecents, applySavedMealToDiary, resolveSlotRecentRef,
} from '../lib/food/db';
import { getNutritionTargets } from '../lib/database';
import { getCuratedCandidates } from '../lib/food/curatedMeals';
import { rankSuggestions, mealsLeftToday } from '../lib/food/mealSuggest';
import { refreshFrequentsIfStale } from '../lib/food/frequents';
import { SEARCH_TABS, selectTabRows, rankByPersonalHistory } from '../lib/food/searchTabs';
import { searchFoods } from '../lib/food/waterfall';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { useToast } from '../components/Toast';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import QuickAddSheet from '../components/food/QuickAddSheet';
import CuratedMealSheet from '../components/food/CuratedMealSheet';
import BottomSheet from '../components/BottomSheet';
import FoodRow from '../components/food/FoodRow';
import HintCaption from '../components/HintCaption';
import SearchBar from '../components/SearchBar';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { mealSlotLabel } from '../lib/food/mealSlots';
import { scaleMacros, resolveServingG } from '../lib/food/macros';
import { isValidEntryGrams } from '../lib/food/servingEntry';
import { buildFoodEntryPayload, buildSlotRecentPayload } from '../lib/food/loggingPayloads';

const EMPTY_COPY = {
  recents: 'Your recent foods will appear here after you log them.',
  favourites: 'No favourites yet. Hold a food to star it.',
  frequents: 'Foods you log often will appear here.',
};

// The "Add again" re-log tabs (Move #1): a row tap here logs the food in one
// tap at its remembered portion, the way MFP/Cronometer re-log a recent. The
// live-search-results list (any 2+ char query) is NOT a re-log surface, a
// never-logged food has no remembered portion, so it still opens the sheet.
// Suggested + Custom are handled elsewhere and are not in this set.
const RELOG_TABS = new Set(['recents', 'favourites', 'frequents']);

// Wave A C7 (2026-07-03): shared with DiaryScreen's meal-list hint, same
// flag, same caption, because they're the two long-press "hold a food"
// gestures a user meets across one diary-logging journey (edit the portion
// here on the add-food picker, multi-select back on the diary's own list).
// Whichever they meet first teaches both; dismissing either dismisses both.
const DIARY_FOOD_HINT_KEY = '@volyume_seen_diary_food_hint';

export default function FoodSearchScreen({ navigation, route }) {
  const { user, userProfile, energyUnit } = useAppStore(useShallow((s) => ({
    user: s.user,
    userProfile: s.userProfile,
    energyUnit: s.accessibility?.energyUnit ?? 'kcal',
  })));
  const userId = user?.id;
  // Energy DISPLAY unit (kcal | kj): display-only, applied at the render sites
  // below. plateKcal and every macros.kcal stay kcal for the maths/log writes.
  const toast = useToast();
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [query, setQuery] = useState('');
  // Open straight on a chosen tab when routed in with one (the empty-diary
  // "What should I eat?" CTA and the diary macro-finish strip pass
  // initialTab: 'suggested' to land on the deterministic suggestion list).
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab ?? 'recents');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickSavedRef = useRef(false);
  // Multi-add plate: tap a row's + to drop a default serving here, then
  // log the whole plate in one pass. Disabled in recipe pick mode (which
  // returns a single ingredient). Mirrors MacroFactor's fastest workflow.
  const [plate, setPlate] = useState([]);
  const loggingPlateRef = useRef(false); // CALC-3: prevents double-tap double-log
  const loggingQuickRef = useRef(false); // one-tap re-log: blocks a double-tap double-log
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
  // The suggested curated meal opened in the detail sheet (its items + the free
  // "add to taste" suggestions). Tapping a meal opens this rather than logging
  // instantly, so the user can see what's in it and what they can add.
  const [mealSheet, setMealSheet] = useState(null);

  // Wave A C7: one-time caption for the "hold a food to edit the portion"
  // long-press on re-log rows (see isRelogRow below), otherwise invisible to
  // a sighted user (FoodRow only carried an accessibilityHint).
  const [showFoodHint, setShowFoodHint] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DIARY_FOOD_HINT_KEY).then((v) => {
      if (active && v !== 'true') setShowFoodHint(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const dismissFoodHint = useCallback(() => {
    setShowFoodHint(false);
    AsyncStorage.setItem(DIARY_FOOD_HINT_KEY, 'true').catch(() => {});
  }, []);

  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  // Browse lists (Recents / Favourites / Custom) + the preference ref
  // sets that drive each row's star/exclude icon. Reloaded on focus so
  // a log or a long-press toggle since last visit shows fresh.
  const loadBrowse = useCallback(async () => {
    if (!userId) return;
    try {
      const [recentRows, favRows, disRows, customRaw] = await Promise.all([
        // "Add again" (COMP-002): this slot's most-logged foods, not the
        // global recency list. last_quantity_g rides along so the detail
        // sheet pre-fills the portion the user used here last time. T1
        // (world-class audit 2026-07-03): a saved meal or recipe that has
        // earned its own slot-recent row (via applySavedMealToDiary /
        // applyRecipeToDiary) ranks in this exact same list, by the exact
        // same log_count/last_logged_at order, no separate pool.
        getSlotRecents(userId, mealSlot, 10),
        getFavourites(userId),
        getDislikes(userId),
        getAllCustomFoods(userId),
      ]);
      const recentResolved = [];
      for (const r of recentRows) {
        // resolveSlotRecentRef handles a saved meal's synthetic 'meal:<id>'
        // ref (no per-100g profile to resolve) and defers everything else,
        // including a recipe's 'recipe:<id>' ref, to resolveFoodRef unchanged.
        const food = await resolveSlotRecentRef(userId, r.food_ref);
        if (food) recentResolved.push({ ...food, last_quantity_g: r.last_quantity_g });
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
  }, [userId, mealSlot]);

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

  // The user's own foods (favourites, frequents, this slot's "add again"
  // recents) normalised into the ranker's single-food candidate shape, so the
  // Suggested tab can offer a single-food top-up ("Add 150g chicken breast")
  // beside the curated meals, not meals alone. De-duped by food_ref (a food
  // can appear in more than one list) and with disliked + quick-add refs
  // dropped (a long-pressed "hidden" food must not resurface as a suggestion).
  // Pure mapping of already-loaded rows; no extra fetch, fully deterministic.
  const suggestFoodCandidates = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of [...favouriteRows, ...frequentRows, ...recents, ...customRows]) {
      const ref = f?.food_ref;
      if (!ref || seen.has(ref)) continue;
      if (dislikeRefs.has(ref)) continue;
      if (typeof ref === 'string' && ref.startsWith('quick:')) continue; // quick-add has no real macros
      seen.add(ref);
      out.push({
        foodRef: ref,
        name: f.name,
        kcal100: f.kcal_100g,
        protein100: f.protein_100g,
        carbs100: f.carbs_100g,
        fat100: f.fat_100g,
        // carried through for the one-tap log of a suggested food
        fibre100: f.fibre_100g ?? null,
        source: f.source ?? null,
      });
    }
    return out;
  }, [favouriteRows, frequentRows, recents, customRows, dislikeRefs]);

  // Curated meal suggestions + single-food top-ups, sized to one meal's share
  // of what's left today. Pulls the day's targets + intake, works out how many
  // meals remain, filters the curated library to the user's diet + this slot,
  // then ranks the curated meals AND the user's own foods together. Lazy: only
  // runs when the Suggested tab is open.
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
      const mealsPerDay = (parsedMeals >= 3 && parsedMeals <= 8) ? parsedMeals : 4;
      const mealsLeft = mealsLeftToday(mealsPerDay, loggedSlots);
      const candidates = getCuratedCandidates({ diet, slot: mealSlot });
      const { suggestions: ranked, remaining, perMeal } = rankSuggestions({
        targets, consumed, savedMeals: candidates, foods: suggestFoodCandidates, slot: mealSlot, mealsLeft, limit: 12,
      });
      setSuggestions(ranked);
      setSuggestMeta({ hasTargets: true, remaining, perMeal });
    } catch (_) {
      setSuggestions([]);
      setSuggestMeta(null);
    } finally {
      setSuggestLoading(false);
    }
  }, [userId, userProfile, entryDate, mealSlot, suggestFoodCandidates]);

  useFocusEffect(useCallback(() => { loadBrowse(); }, [loadBrowse]));
  useEffect(() => { if (activeTab === 'frequents') loadFrequents(); }, [activeTab, loadFrequents]);
  useEffect(() => { if (activeTab === 'suggested') loadSuggested(); }, [activeTab, loadSuggested]);
  // Close the plate review once the last item is removed.
  useEffect(() => { if (showPlate && plate.length === 0) setShowPlate(false); }, [showPlate, plate.length]);

  // Debounced waterfall search. The search box searches the food database
  // from any browse tab (250ms debounce), Suggested included (NU-9: it was
  // the one tab that hid the box). With no query each tab shows its own list.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      searchRequestRef.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchFoods(userId, q, { limit: 25 });
        if (searchRequestRef.current !== requestId) return;
        setResults(rows);
      } catch (_) {
        if (searchRequestRef.current !== requestId) return;
        setResults([]);
      } finally {
        if (searchRequestRef.current === requestId) setSearching(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, userId]);

  function openPicker(food) {
    setPicker({ food });
  }

  // Add one serving of a food to the plate (no sheet). Tapping the row still
  // opens the detail sheet for a custom quantity. Food audit F-2: prefer the
  // user's LAST logged portion for this slot+food when the row carries one (the
  // "Add again" recents list does), so one-tap re-add uses the remembered
  // portion, matching the prefill the detail sheet already shows, instead of a
  // generic serving. Falls back to the default serving, then 100 g.
  function addToPlate(food) {
    const servingG = resolveServingG(food);
    const macros = scaleMacros(food, servingG); // { kcal, proteinG, carbsG, fatG, fibreG }
    const item = {
      key: `${food.food_ref}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      food,
      quantityG: servingG,
      ...macros,
    };
    setPlate((p) => [...p, item]);
  }

  function removeFromPlate(key) {
    setPlate((p) => p.filter((it) => it.key !== key));
  }

  // One-tap re-log (Move #1): on the "Add again" tabs a row tap logs the food
  // immediately, no sheet, to the slot the search was opened for, at the
  // remembered portion (last_quantity_g -> serving_g -> 100 g, via
  // resolveServingG), ROUNDED to whole grams exactly as the detail sheet does.
  // Same write mechanics as the sheet's onSave (confirmLog): scaleMacros from
  // per-100g at the resolved grams, logFoodEntry, then the derived slot-recent;
  // and the long-press sheet now opens at this same remembered portion
  // (initialServingState honours initialQuantityG), so tap and long-press agree.
  // The 1–5000 g safety bound the sheet enforces (isValidEntryGrams) binds here
  // too: a remembered portion outside it can't be silently logged, we open the
  // sheet instead so the user corrects it. An Undo toast (8s) deletes exactly
  // the entry just created, the safety net for an accidental tap.
  async function quickLogRelog(food) {
    if (!userId || !food?.food_ref) return;
    // Round to whole grams (the sheet rounds; last_quantity_g is a REAL and can
    // be fractional) and bind the same 1–5000 g safety bound the sheet enforces.
    // Out of bounds -> fall back to the sheet rather than write a value the sheet
    // would refuse; this is the one path that logs without the sheet's gate.
    const servingG = Math.round(resolveServingG(food));
    if (!isValidEntryGrams(servingG)) { openPicker(food); return; }
    // In-flight guard: a fast double-tap must not mint two entries (each
    // logFoodEntry returns a fresh id, so duplicates can't be deduped). Mirrors
    // logPlate's loggingPlateRef.
    if (loggingQuickRef.current) return;
    loggingQuickRef.current = true;
    try {
      audit('food.add', { source: food.source ?? 'unknown', mealSlot, fromScan: false, surface: 'relog' });
      const entryId = await logFoodEntry(userId, buildFoodEntryPayload({
        entryDate,
        mealSlot,
        foodRef: food.food_ref,
        quantityG: servingG,
        food,
      }));
      await upsertSlotRecent(userId, buildSlotRecentPayload({
        mealSlot,
        foodRef: food.food_ref,
        quantityG: servingG,
      })).catch(() => {}); // derived memory only; never fail the log
      // Mandatory Undo: the action deletes the exact entry just created. Matches
      // the diary's soft-delete + Undo pattern (DiaryScreen requestDelete).
      toast.show(`Added ${food.name}.`, {
        variant: 'undo',
        action: { label: 'Undo', onPress: async () => { await deleteFoodEntry(entryId, userId); } },
      });
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('FoodSearch.quickLogRelog', e, { foodRef: food.food_ref }); } catch (_) {}
      toast.show("Couldn't add that food, try again.", { variant: 'error', duration: 4000 });
    } finally {
      loggingQuickRef.current = false;
    }
  }

  // One-tap re-log for a saved meal (T1, world-class audit 2026-07-03): a
  // frequently-used saved meal earns a place in this same "Add again" list
  // (see resolveSlotRecentRef), but it fans out into one food_entries row
  // per item rather than a single scaled entry, so it reuses
  // applySavedMealToDiary (MyMealsScreen.onLog's exact contract) instead of
  // quickLogRelog's scaleMacros + single logFoodEntry. Undo removes every
  // entry the meal created, not just one. Shares loggingQuickRef with
  // quickLogRelog: only one relog can be in flight from this screen at a time.
  async function quickLogRelogMeal(food) {
    if (!userId || !food?.savedMealId || loggingQuickRef.current) return;
    loggingQuickRef.current = true;
    try {
      audit('food.savedMeal', { mealId: food.savedMealId, mealSlot, itemCount: food.itemCount, surface: 'relog' });
      const { logged, entryIds } = await applySavedMealToDiary(userId, food.savedMealId, { mealSlot, entryDate });
      if (logged > 0) {
        toast.show(`${food.name ?? 'Meal'} added.`, {
          variant: 'undo',
          action: {
            label: 'Undo',
            onPress: async () => {
              try { await Promise.all(entryIds.map((eid) => deleteFoodEntry(eid, userId))); } catch (_) { /* already gone */ }
            },
          },
        });
      } else {
        toast.show('This meal has no foods in it.', { variant: 'info' });
      }
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('FoodSearch.quickLogRelogMeal', e, { mealId: food.savedMealId }); } catch (_) {}
      toast.show("Couldn't add that meal, try again.", { variant: 'error', duration: 4000 });
    } finally {
      loggingQuickRef.current = false;
    }
  }

  const plateKcal = useMemo(() => plate.reduce((s, it) => s + (it.kcal || 0), 0), [plate]);

  // Log every plate item to the meal, then return to the diary.
  async function logPlate() {
    if (!plate.length) return;
    // CALC-3: in-flight guard so a double-tap can't log the whole plate twice
    // (each logFoodEntry mints a fresh id, so duplicates can't be deduped).
    if (loggingPlateRef.current) return;
    loggingPlateRef.current = true;
    const total = plate.length;
    let logged = 0;
    try {
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
        logged++;
        // eslint-disable-next-line no-await-in-loop
        await upsertSlotRecent(userId, {
          mealSlot,
          foodRef: it.food.food_ref,
          quantityG: it.quantityG,
        }).catch(() => {}); // derived memory only; never fail the log
      }
      setPlate([]);
      setShowPlate(false);
      navigation.goBack();
    } catch (e) {
      // FF-007: a mid-plate write failure used to leave the plate up with no
      // feedback. Tell the user what actually logged, drop the logged items so a
      // retry can't double-log them (entries are sequential), and stay on screen.
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('FoodSearch.logPlate', e); } catch (_) {}
      toast.show(
        logged > 0
          ? `Logged ${logged} of ${total}. The rest didn't save, try again.`
          : "Couldn't log those foods, try again.",
        { variant: 'error', duration: 5000 },
      );
      if (logged > 0) setPlate((p) => p.slice(logged));
    } finally {
      loggingPlateRef.current = false;
    }
  }

  // Quick add: log calories (and optional macros) with no food lookup.
  // food_ref 'quick:adhoc' has no resolvable name, so the diary shows it
  // as "Quick add" with no gram weight. Logs, then returns to the diary.
  async function confirmQuickAdd({ kcal, protein, carbs, fat, mealSlot: slot }) {
    const entryId = await logFoodEntry(userId, {
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
    // A2 (first-week trust): every log gets the same success + Undo feedback,
    // matching DiaryScreen's onLogUsual. The toast provider is app-level, so
    // it survives the goBack the caller triggers on sheet close.
    toast.show('Quick add saved.', {
      variant: 'undo',
      action: { label: 'Undo', onPress: async () => { await deleteFoodEntry(entryId, userId); } },
    });
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
      surface: 'sheet',
    });
    const entryId = await logFoodEntry(userId, buildFoodEntryPayload({
      entryDate: chosenDate,
      mealSlot: chosenSlot,
      foodRef: food.food_ref,
      quantityG,
      food,
    }));
    await upsertSlotRecent(userId, buildSlotRecentPayload({
      mealSlot: chosenSlot,
      foodRef: food.food_ref,
      quantityG,
    })).catch(() => {}); // derived memory only; never fail the log
    // A2 (first-week trust): the FIRST food log (and every log after) gets the
    // same success + Undo toast as a re-log or a diary "usual", previously
    // this path (the sheet's "Add to diary") showed nothing at all. Exact
    // pattern from DiaryScreen.onLogUsual; the toast survives the goBack
    // below because the Toast provider is mounted at the app root.
    toast.show(`${food.name ?? 'Food'} added.`, {
      variant: 'undo',
      action: { label: 'Undo', onPress: async () => { await deleteFoodEntry(entryId, userId); } },
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
      setMealSheet(null);
      navigation.goBack();
    } catch (e) {
      // FF-007: surface the failure instead of only resetting the spinner.
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('FoodSearch.logCuratedMeal', e, { mealId: s.id }); } catch (_) {}
      toast.show("Couldn't add that meal, try again.", { variant: 'error', duration: 4000 });
      setLoggingMealId(null);
    }
  }

  // Log a single suggested food at the quantity the ranker chose to fill the
  // gap (e.g. "Add 150g chicken breast"). Re-scales from the original per-100g
  // candidate so the logged macros match the diary's own scaling exactly, then
  // closes back to the diary. Same write + slot-recent path as a normal add.
  async function logSuggestedFood(s) {
    if (!userId || !s?.foodRef || loggingMealId) return;
    const cand = suggestFoodCandidates.find((c) => c.foodRef === s.foodRef);
    if (!cand) return;
    setLoggingMealId(s.foodRef);
    try {
      const per100 = {
        kcal_100g: cand.kcal100,
        protein_100g: cand.protein100,
        carbs_100g: cand.carbs100,
        fat_100g: cand.fat100,
        fibre_100g: cand.fibre100,
      };
      audit('food.suggestFood', { source: cand.source ?? 'unknown', mealSlot, quantityG: s.quantityG });
      await logFoodEntry(userId, buildFoodEntryPayload({
        entryDate,
        mealSlot,
        foodRef: s.foodRef,
        quantityG: s.quantityG,
        food: per100,
      }));
      await upsertSlotRecent(userId, buildSlotRecentPayload({
        mealSlot,
        foodRef: s.foodRef,
        quantityG: s.quantityG,
      })).catch(() => {}); // derived memory only; never fail the log
      navigation.goBack();
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('FoodSearch.logSuggestedFood', e, { foodRef: s.foodRef }); } catch (_) {}
      toast.show("Couldn't add that food, try again.", { variant: 'error', duration: 4000 });
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

  // Lift the user's own foods (favourited / logged here recently / logged often)
  // above the generic database matches for a typed query, so "search" surfaces
  // what they actually eat first (MFP/Cronometer parity). Pure re-rank over the
  // already-loaded personal sets, no extra fetch. recents/frequents are resolved
  // food rows; map them to their refs for the membership test.
  const recentRefs = useMemo(() => new Set(recents.map((r) => r.food_ref)), [recents]);
  const frequentRefs = useMemo(() => new Set(frequentRows.map((f) => f.food_ref)), [frequentRows]);
  const rankedResults = useMemo(
    () => rankByPersonalHistory(results, { favouriteRefs, recentRefs, frequentRefs }),
    [results, favouriteRefs, recentRefs, frequentRefs],
  );

  const tabRows = useMemo(() => selectTabRows({
    activeTab,
    query,
    lists: { recents, favourites: favouriteRows, frequents: frequentRows, custom: customRows },
    results: rankedResults,
  }), [activeTab, query, recents, favouriteRows, frequentRows, customRows, rankedResults]);

  const listData = useMemo(() => {
    const out = [];
    if (activeTab === 'custom') {
      out.push({ type: 'cta', key: 'cta-new-custom', label: 'Add custom food', icon: 'add-circle-outline', action: 'custom' });
      if (!isRecipePick) {
        out.push({ type: 'cta', key: 'cta-scan-barcode', label: 'Scan barcode', icon: 'barcode-outline', action: 'scan' });
        out.push({ type: 'cta', key: 'cta-quick-add', label: 'Quick add calories', icon: 'flash-outline', action: 'quick' });
      }
      if (route?.params?.pickMode !== 'recipe') {
        out.push({ type: 'cta', key: 'cta-my-recipes', label: 'Recipes', icon: 'restaurant-outline', action: 'recipes' });
        out.push({ type: 'cta', key: 'cta-my-meals', label: 'Saved meals', icon: 'fast-food-outline', action: 'meals' });
      }
    }
    for (const f of tabRows) out.push({ type: 'row', key: `${activeTab}-${f.food_ref}`, food: f });
    return out;
  }, [activeTab, tabRows, route?.params?.pickMode, isRecipePick]);

  function renderItem({ item }) {
    if (item.type === 'cta') {
      return (
        <TouchableOpacity
          style={styles.ctaRow}
          onPress={() => {
            if (item.action === 'custom') return newCustomFood();
            if (item.action === 'scan') return navigation.navigate('ScanBarcode', { mealSlot, entryDate });
            if (item.action === 'quick') { quickSavedRef.current = false; setShowQuickAdd(true); return null; }
            if (item.action === 'meals') return navigation.navigate('MyMeals', { mealSlot, entryDate });
            return navigation.navigate('MyRecipes', { mealSlot, entryDate });
          }}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Ionicons name={item.icon} size={20} color={colors.primary} />
          <Text style={styles.ctaText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    }
    const food = item.food;
    // T1 (world-class audit 2026-07-03): a saved meal earns its way into
    // this same "Add again" list via its own 'meal:<id>' slot-recent row
    // (resolveSlotRecentRef), but it has none of the single-food affordances
    // below (no per-100g quantity to edit in the sheet, no plate add, no
    // favourite/dislike) since logging it means fanning out several
    // food_entries via applySavedMealToDiary, not scaling one. A recipe's
    // 'recipe:<id>' ref needs none of this branch: resolveFoodRef already
    // gives it a normal food shape, so it flows through the existing
    // single-food path below untouched.
    if (typeof food.food_ref === 'string' && food.food_ref.startsWith('meal:')) {
      return (
        <FoodRow
          food={food}
          preference={null}
          onPress={() => quickLogRelogMeal(food)}
        />
      );
    }
    const preference = favouriteRefs.has(food.food_ref) ? 'fav'
      : dislikeRefs.has(food.food_ref) ? 'dislike'
      : null;
    // Move #1: on the "Add again" re-log tabs (recents/favourites/frequents),
    // with no active search, a tap one-tap-logs at the remembered portion and a
    // long-press opens the sheet to adjust it. A live search (2+ chars) replaces
    // the list with results regardless of tab, so those rows are NOT re-log rows
    // and keep the original behaviour (tap = sheet, long-press = preference
    // cycle). Recipe pick mode must always open the sheet to set a quantity, so
    // it is excluded from one-tap re-log.
    const isRelogRow = !isRecipePick && RELOG_TABS.has(activeTab) && query.trim().length < 2;
    return (
      <FoodRow
        food={food}
        preference={preference}
        onPress={isRelogRow ? () => quickLogRelog(food) : () => openPicker(food)}
        onLongPress={isRelogRow ? () => { openPicker(food); dismissFoodHint(); } : () => onLongPress(food)}
        longPressHint={isRelogRow ? 'Long-press to change the portion' : undefined}
        onAdd={isRecipePick ? undefined : () => addToPlate(food)}
      />
    );
  }

  // Wave A C7: content-gated so the caption only shows once there's actually
  // a re-log row to hold (never on an empty tab), and only on the tabs where
  // long-press means "edit the portion" (isRelogRow's own condition, mirrored
  // here since it's computed per-row above).
  const showRelogHint = showFoodHint && !isRecipePick && RELOG_TABS.has(activeTab)
    && query.trim().length < 2 && tabRows.length > 0;

  function renderEmpty() {
    // A live search with no hits: offer the custom-food fallback.
    if (query.trim().length >= 2) {
      if (searching) return null;
      return (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No matches for "{query.trim()}".</Text>
          <View style={styles.noResultsActions}>
            <TouchableOpacity
              style={[styles.noResultsBtn, styles.noResultsBtnSecondary]}
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear food search"
            >
              <Text style={styles.noResultsBtnSecondaryText}>Clear search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.noResultsBtn}
              onPress={gotoCustomReplace}
              accessibilityRole="button"
              accessibilityLabel="Add custom food"
            >
              <Text style={styles.noResultsBtnText}>Add custom food</Text>
            </TouchableOpacity>
          </View>
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
      // Content-shaped skeleton rather than a bare spinner (premium loading).
      return (
        <View>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      );
    }
    if (suggestMeta && !suggestMeta.hasTargets) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Set your targets first and Volyume can suggest meals that fit them.</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets')}
            accessibilityRole="button"
            accessibilityLabel="Set nutrition targets"
          >
            <Text style={styles.emptyActionText}>Set nutrition targets</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      );
    }
    if (!suggestions.length) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No suggestions ready for this meal. Try search, or build meals from your targets.</Text>
        </View>
      );
    }
    return (
      <FlashList
        data={suggestions}
        // Food and meal suggestions share one list, so the key must cover both
        // kinds: a food carries foodRef (no id), a meal carries id.
        keyExtractor={(s) => (s.kind === 'food' ? `food:${s.foodRef}` : `meal:${s.id}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          <View>
            {suggestMeta?.perMeal ? (
              <Text style={styles.suggestHint}>
                Sized for this meal: around {Math.round(suggestMeta.perMeal.protein)}g protein, {toEnergy(suggestMeta.perMeal.kcal, energyUnit)} {energyUnitLabel(energyUnit)}.
              </Text>
            ) : null}
            {/* Founder 2026-06-30: novices don't realise a suggested meal is a
                base they can build on (season it, add veg, add flavour), not
                a fixed prescription. A quiet, pro-food note,
                framed around flavour/enjoyment, never diet-culture restriction,
                and honest ("most", "basically") since sugar alcohols and trace
                seasoning calories aren't literally zero. */}
            <View style={styles.suggestNoteRow}>
              <Ionicons name="leaf-outline" size={13} color={colors.textMuted} style={{ marginTop: spacing.hair }} />
              <Text style={styles.suggestNote}>
                A starting point, not a rule. Season and tweak to taste with herbs, spices, citrus or sauces you enjoy.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isFood = item.kind === 'food';
          const busyKey = isFood ? item.foodRef : item.id;
          return (
            <TouchableOpacity
              style={styles.suggestCard}
              onPress={() => (isFood ? logSuggestedFood(item) : setMealSheet(item))}
              disabled={!!loggingMealId}
              accessibilityRole="button"
              accessibilityLabel={isFood ? `Add ${item.quantityG}g ${item.name}` : `Open ${item.name}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestName}>
                  {isFood ? `${item.name} - ${item.quantityG}g` : item.name}
                </Text>
                <Text style={styles.suggestMacros}>
                  {toEnergy(item.macros.kcal, energyUnit)} {energyUnitLabel(energyUnit)} - {item.macros.protein}g protein - {item.macros.carbs}g carbs - {item.macros.fat}g fat
                </Text>
              </View>
              {loggingMealId === busyKey
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name={isFood ? 'add-circle' : 'chevron-forward'} size={isFood ? 26 : 22} color={colors.primary} />}
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.headerButton}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Add food</Text>
        </View>
        <View style={styles.headerSide} />
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

      {/* NU-9: the search box renders on EVERY tab, including Suggested. The
          locked design intent (searchTabs.js header) is a persistent search
          bar over browse lists; Suggested was the one tab that hid it. A live
          2+ char query is a database search from any tab (selectTabRows), so
          typing here shows results and clearing returns to the suggestions. */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods or brands"
        accessibilityLabel="Search foods or brands"
        loading={searching}
        style={styles.searchBar}
      />

      {activeTab === 'suggested' && query.trim().length < 2 ? renderSuggested() : (
      <>
      {/* Wave-1 A6: name the UK data moat on the pre-typing state. Hidden the
          moment a live query (2+ chars) takes over, so it never competes with
          results. */}
      {query.trim().length < 2 ? (
        <Text style={styles.provenanceNote}>
          Saved foods work offline. Live search can also check trusted UK generics and branded products.
        </Text>
      ) : null}

      <FlashList
        data={listData}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListHeaderComponent={showRelogHint ? (
          <HintCaption
            text="Hold a food to change the portion."
            onDismiss={dismissFoodHint}
          />
        ) : null}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          activeTab !== 'custom' && query.trim().length >= 2 && results.length > 0 ? (
            <TouchableOpacity
              style={styles.footerBtn}
              onPress={gotoCustomReplace}
              accessibilityRole="button"
              accessibilityLabel="Add custom food"
            >
              <Ionicons name="add" size={18} color={colors.textPrimary} />
              <Text style={styles.footerBtnText}>Add custom food</Text>
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
            accessibilityLabel="Review selected foods"
          >
            <Text style={styles.plateCount}>{plate.length} selected</Text>
            <Text style={styles.plateKcalLine}>~{toEnergy(plateKcal, energyUnit)} {energyUnitLabel(energyUnit)} - tap to review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plateLogBtn}
            onPress={logPlate}
            accessibilityRole="button"
            accessibilityLabel={`Log ${plate.length} foods to ${mealSlotLabel(mealSlot)}`}
          >
            <Text style={styles.plateLogText}>Log {plate.length}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <BottomSheet
        visible={showPlate}
        onClose={() => setShowPlate(false)}
        accessibilityLabel="Selected foods"
        sheetStyle={styles.plateModalSheet}
      >
        <View style={styles.plateModalHeader}>
          <Text style={styles.plateModalTitle} accessibilityRole="header">Selected foods ({plate.length})</Text>
          <TouchableOpacity onPress={() => setShowPlate(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 360 }}>
          {plate.map((it) => (
            <View key={it.key} style={styles.plateItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.plateItemName} numberOfLines={1}>{it.food.name}</Text>
                <Text style={styles.plateItemMeta}>{Math.round(it.quantityG)}g - {toEnergy(it.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFromPlate(it.key)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${it.food.name}`}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <View style={styles.plateModalActions}>
          <TouchableOpacity
            style={styles.plateClearBtn}
            onPress={() => { setPlate([]); setShowPlate(false); }}
            accessibilityRole="button"
            accessibilityLabel="Clear selected foods"
          >
            <Text style={styles.plateClearText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plateLogBtnWide}
            onPress={logPlate}
            accessibilityRole="button"
            accessibilityLabel={`Log ${plate.length} to ${mealSlotLabel(mealSlot)}`}
          >
            <Text style={styles.plateLogText}>Log selected</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <FoodDetailSheet
        visible={!!picker}
        mode="add"
        food={picker?.food}
        initialQuantityG={picker?.food?.last_quantity_g}
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
          // Only a genuine save-then-settle returns to the diary. The ref is
          // reset to false when the sheet OPENS (see the Quick add button), so
          // a save that resolves after an early cancel cannot strand it true
          // and surprise-navigate on a later, unrelated close.
          if (quickSavedRef.current) { quickSavedRef.current = false; navigation.goBack(); }
        }}
      />

      <CuratedMealSheet
        visible={!!mealSheet}
        meal={mealSheet}
        logging={!!mealSheet && loggingMealId === mealSheet.id}
        energyUnit={energyUnit}
        onLog={() => mealSheet && logCuratedMeal(mealSheet)}
        onClose={() => setMealSheet(null)}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: {
    width: 48,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
  },
  headerTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },

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

  searchBar: {
    margin: spacing.md,
  },
  provenanceNote: {
    ...type.captionTight, color: colors.textMuted,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },

  ctaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ctaText: { ...type.bodyStrong, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 },

  emptyWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyActionText: { ...type.label, color: colors.onPrimary },

  suggestHint: {
    ...type.caption, color: colors.textMuted,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  suggestNoteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  suggestNote: {
    ...type.caption, color: colors.textMuted, flex: 1, lineHeight: fontSize.sm + 5,
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
  suggestName: { ...type.bodyStrong, color: colors.textPrimary },
  suggestMacros: { ...type.caption, color: colors.textSecondary, marginTop: 3 },

  noResults: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: { ...type.body, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' },
  noResultsActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noResultsBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  noResultsBtnText: { color: colors.onPrimary, fontWeight: fontWeight.bold },
  noResultsBtnSecondary: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noResultsBtnSecondaryText: { color: colors.textPrimary, fontWeight: fontWeight.bold },

  footerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  footerBtnText: { ...type.bodyStrong, color: colors.textPrimary },

  plateBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  plateInfo: { flex: 1 },
  plateCount: { ...type.bodyStrong, color: colors.textPrimary },
  plateKcalLine: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  plateLogBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  plateLogText: { ...type.bodyStrong, color: colors.onPrimary },
  plateModalSheet: {
    paddingTop: spacing.lg,
  },
  plateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  plateModalTitle: { ...type.title, color: colors.textPrimary },
  plateItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  plateItemName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  plateItemMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
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
