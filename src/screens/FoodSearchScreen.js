/**
 * FoodSearchScreen - the food picker (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and FOOD_DATA_STRATEGY_LOCKED.md.
 *
 * Sits between the Diary "Add food" tap and the actual log write. The
 * top is a browse subnav (GAP row 28): Recent, Suggested, Favourites,
 * Often, More. The search box under it searches the food database
 * from any tab (250ms-debounced waterfall: local cache first, then live
 * OFF + USDA), nothing shown until a 2+ char query. With no query each
 * tab shows its own list. Suggested lists curated meals, not food rows.
 *
 * Tap a row -> ServingPicker sheet -> "Add to diary". Long-press a row
 * to cycle its preference (favourite / "don't suggest"). Custom-food creation
 * lives on the Custom tab and as a fallback under the search results.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import { todayLocalKey } from '../lib/dayKey';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import Text from '../components/Text';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, iconSize, fontFamily } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import useTheme from '../hooks/useTheme';
import SectionLabel from '../components/SectionLabel';
import { logError } from '../lib/errorLog';
import { SkeletonRow } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  logFoodEntry, logFoodEntries, deleteFoodEntry, deleteFoodEntries, getFavourites,
  getDislikes, cycleFoodPreference, getAllCustomFoods, getFoodFrequents, getLocalFoodFrequents,
  getRollupForDay, getLoggedMealSlotsForDay, applyCuratedMealToDiary,
  upsertSlotRecent, getSlotRecents, getSlotRecentQuantities, resolveSlotRecentRefs,
  getEntriesForClockWindow,
} from '../lib/food/db';
import { rankAroundThisTime } from '../lib/food/aroundThisTime';
import { entryDateLine, shiftDate } from '../lib/food/diaryDates';
import { getNutritionTargets } from '../lib/database';
import { getCuratedCandidates, CURATED_MEALS, mealItems } from '../lib/food/curatedMeals';
import { withCuratedServing } from '../lib/food/curatedFoods';
import { rankSuggestions, mealsLeftToday } from '../lib/food/mealSuggest';
// Campaign 17B job 8: one "don't suggest" instruction, obeyed everywhere the
// app chooses food for the user.
import { withDoNotSuggest } from '../lib/food/mealPlanService';
import { refreshFrequentsIfStale, mergeFrequents } from '../lib/food/frequents';
import {
  SEARCH_TABS, selectTabRows, rankByPersonalHistory, mergePersonalMatches,
} from '../lib/food/searchTabs';
import { searchFoods } from '../lib/food/waterfall';
import NetInfo from '@react-native-community/netinfo';
import { resolveFoodRefs } from '../lib/food/sources/localCache';
// Campaign 17A job 6: the ONE exclusion predicate, at the food-ref level.
import { foodRefExcluded } from '../lib/food/foodRoles';
import { audit } from '../lib/observability';
import { trackNow } from '../lib/telemetry/growth';
import { toBucket } from '../lib/telemetry/schema';
import * as haptics from '../lib/haptics';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { energyUnitLabel, formatEnergy, formatNumber, formatWithUnit, spokenEnergy } from '../lib/format';
import { useToast } from '../components/Toast';
import ModalHeader from '../components/ModalHeader';
import Button from '../components/Button';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import FoodLineReviewSheet from '../components/food/FoodLineReviewSheet';
import QuickAddSheet from '../components/food/QuickAddSheet';
import CuratedMealSheet from '../components/food/CuratedMealSheet';
import BottomSheet from '../components/BottomSheet';
import FoodRow from '../components/food/FoodRow';
import SearchBar from '../components/SearchBar';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { mealSlotLabel, buildMealSlots, inferMealSlotForHour, DEFAULT_MEALS_PER_DAY } from '../lib/food/mealSlots';
import { scaleMacros, resolveServingG } from '../lib/food/macros';
import { scaleMacrosAsWeighed } from '../lib/food/cookYield';
import { buildFoodEntryPayload, buildSlotRecentPayload } from '../lib/food/loggingPayloads';
import { parseFoodLine, isFoodLine, portionFor, matchFoodLineParts } from '../lib/food/foodLine';
import useScreenReady from '../lib/telemetry/useScreenReady';

const EMPTY_COPY = {
  recents: 'Your recent foods will appear here after you log them.',
  favourites: 'No favourites yet. Hold a food to star it.',
  frequents: 'Foods you log often will appear here.',
};

const EMPTY_ICON = {
  recents: 'time-outline',
  favourites: 'star-outline',
  frequents: 'repeat-outline',
};

// D230 R7: "Around this time" looks back over the last 60 days (other days
// only), so a habit counts while it is still a habit.
const AROUND_LOOKBACK_DAYS = 60;

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
  // CP-10 batch E (2026-07-10): live theme (src/hooks/useTheme.js). Memoised
  // because this screen renders two FlashLists (rows + suggested cards),
  // matching MyMealsScreen's own precedent (batch D).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // This screen is a root-stack modal outside the tab navigator (RootNavigator.js),
  // so nothing else absorbs the bottom system inset for the sticky plateBar footer.
  const insets = useSafeAreaInsets();
  const entryDate = route?.params?.entryDate ?? todayLocalKey();
  // F3: a route that names no meal used to file the food under the old 'snack'
  // key, which draws a separate Snacks card. It now defaults to the numbered
  // meal for the time of day on today (the same pick the diary's barcode
  // button makes), or Meal 1 on another day, over the person's own meals per
  // day. A route that names a meal is untouched.
  const routeMealSlot = route?.params?.mealSlot ?? null;
  const [prefMeals, setPrefMeals] = useState(DEFAULT_MEALS_PER_DAY);
  useEffect(() => {
    if (routeMealSlot) return undefined;
    let active = true;
    AsyncStorage.getItem('@volyume_meals_per_day').then((v) => {
      const n = parseInt(v, 10);
      if (active && Number.isFinite(n) && n >= 1) setPrefMeals(n);
    }).catch(() => {}); // no preference keeps the default ladder, as the diary does
    return () => { active = false; };
  }, [routeMealSlot]);
  // Memoised so the default does not drift across an hour boundary while the
  // screen is open (it feeds several effect dependencies below).
  const mealSlot = useMemo(() => {
    if (routeMealSlot) return routeMealSlot;
    const keys = buildMealSlots([], prefMeals, false).map((m) => m.key);
    return entryDate === todayLocalKey() ? inferMealSlotForHour(new Date().getHours(), keys) : keys[0];
  }, [routeMealSlot, prefMeals, entryDate]);

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
  const [showPlate, setShowPlate] = useState(false);
  const isRecipePick = route?.params?.pickMode === 'recipe';
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  // D138: the search box should grab the keyboard for a new-food user (an
  // empty recents list means there is nothing to tap instead), but keep the
  // repeat path showing its list untouched. Starts false so a first render
  // never steals focus before loadBrowse has actually reported back.
  const [recentsLoaded, setRecentsLoaded] = useState(false);
  useScreenReady('FoodSearch', recentsLoaded);
  // food_ref -> last portion used in THIS slot (Campaign 17B job 2).
  const [slotPortions, setSlotPortions] = useState(() => new Map());
  // D230 R7: the foods eaten around this clock time on other days, resolved,
  // each carrying the portion last eaten (last_quantity_g) so its "+" and its
  // sheet both start from that portion. Empty unless adding to today.
  const [aroundRows, setAroundRows] = useState([]);
  const [favouriteRows, setFavouriteRows] = useState([]);
  const [favouriteRefs, setFavouriteRefs] = useState(new Set());
  const [dislikeRefs, setDislikeRefs] = useState(new Set());
  const [customRows, setCustomRows] = useState([]);
  const [frequentRows, setFrequentRows] = useState([]);
  const [searching, setSearching] = useState(false);
  // Distinguish "no live results because you're offline" from a genuine miss.
  // The waterfall returns [] for both (live sources time out to [] silently),
  // so on an empty result we probe connectivity, mirroring ScanBarcodeScreen.
  const [searchOffline, setSearchOffline] = useState(false);
  const [picker, setPicker] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMeta, setSuggestMeta] = useState(null);
  const [loggingMealId, setLoggingMealId] = useState(null);
  // The suggested curated meal opened in the detail sheet (its items + the free
  // "add to taste" suggestions). Tapping a meal opens this rather than logging
  // instantly, so the user can see what's in it and what they can add.
  const [mealSheet, setMealSheet] = useState(null);

  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  // D230 R7: "Around this time". What the person has eaten within 90 minutes
  // of this clock time on other days in the last 60 days, ranked by how
  // often (aroundThisTime.js, pure), the slot recents left out so no food is
  // offered twice, then resolved in ONE batched call. Shown only when adding
  // to today: the clock time says nothing about another day. Local data and
  // a pure ranking only: no network, no randomness.
  const loadAroundThisTime = useCallback(async (slotRecentRefs) => {
    const today = todayLocalKey();
    if (!userId || entryDate !== today) { setAroundRows([]); return; }
    try {
      const entries = await getEntriesForClockWindow(userId, {
        fromDate: shiftDate(today, -AROUND_LOOKBACK_DAYS),
        toDate: shiftDate(today, -1),
      });
      const ranked = rankAroundThisTime(entries, { nowMs: Date.now(), excludeRefs: slotRecentRefs });
      if (!ranked.length) { setAroundRows([]); return; }
      const refMap = await resolveFoodRefs(userId, ranked.map((r) => r.foodRef));
      const rows = [];
      for (const r of ranked) {
        const food = refMap.get(r.foodRef);
        if (food) rows.push({ ...food, last_quantity_g: r.quantityG });
      }
      setAroundRows(rows);
    } catch (e) {
      logError('FoodSearchScreen.loadAroundThisTime', e, { mealSlot });
      setAroundRows([]);
    }
  }, [userId, entryDate, mealSlot]);

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
      // D138 latency ruling: one batched resolve for every recent ref instead
      // of a round-trip per row. resolveSlotRecentRefs mirrors
      // resolveSlotRecentRef row-for-row, including the saved meal's
      // synthetic 'meal:<id>' branch (no per-100g profile to resolve) and
      // deferring everything else, a recipe's 'recipe:<id>' ref included, to
      // the same resolution resolveFoodRefs would give it.
      const recentRefMap = recentRows.length
        ? await resolveSlotRecentRefs(userId, recentRows.map((r) => r.food_ref))
        : new Map();
      const recentResolved = [];
      for (const r of recentRows) {
        const food = recentRefMap.get(r.food_ref);
        if (food) recentResolved.push({ ...food, last_quantity_g: r.last_quantity_g });
      }
      setRecents(recentResolved);
      // D230 R7: excludes this slot's own recents (the raw list, so a food
      // that failed to resolve above is still never offered twice). Runs
      // beside the loads below and is awaited before this reports back, so
      // the search box's autofocus (below) knows whether there is anything
      // to tap.
      const aroundLoad = loadAroundThisTime(recentRows.map((r) => r.food_ref));
      // Campaign 17B job 2: the remembered portion for EVERY food in this
      // slot, not just the ten in the list above. A food reached through
      // search, favourites, frequents or custom now opens the sheet at the
      // portion the user actually used for that exact food here last time.
      // Preselected only - never auto-submitted; the sheet still confirms.
      getSlotRecentQuantities(userId, mealSlot)
        .then((m) => setSlotPortions(m))
        .catch((e) => { logError('FoodSearchScreen.loadSlotPortions', e, { mealSlot }); });

      setFavouriteRefs(new Set(favRows.map((f) => f.food_ref)));
      // D138 latency ruling: one batched resolve instead of one round-trip
      // per favourite row.
      const favSlice = favRows.slice(0, 50);
      const favRefMap = favSlice.length
        ? await resolveFoodRefs(userId, favSlice.map((f) => f.food_ref))
        : new Map();
      const favResolved = [];
      for (const f of favSlice) {
        const food = favRefMap.get(f.food_ref);
        if (food) favResolved.push(food);
      }
      setFavouriteRows(favResolved);

      setDislikeRefs(new Set(disRows.map((d) => d.food_ref)));

      setCustomRows((customRaw || []).map((c) => ({
        ...c,
        food_ref: `custom:${c.id}`,
        source: 'custom',
      })));
      await aroundLoad;
    } catch (e) {
      // Tolerated: the tabs show their empty states and search still works.
      logError('FoodSearchScreen.loadBrowse', e, { mealSlot });
    } finally {
      // D138: gate the search box's autoFocus on this having actually
      // reported back (success or failure), never on the pre-load empty
      // state, so a genuine "no recents" case autofocuses exactly once.
      setRecentsLoaded(true);
    }
  }, [userId, mealSlot, loadAroundThisTime]);

  // Frequents is server-computed; pull a fresh snapshot if the local
  // cache is stale, then resolve the refs for display. Lazy: only runs
  // when the Frequents tab is actually opened.
  const loadFrequents = useCallback(async () => {
    if (!userId) return;
    try {
      await refreshFrequentsIfStale(userId);
      // The device's own counts rank first; the server snapshot only fills the
      // places the local diary cannot (a fresh install or a new phone).
      const [local, server] = await Promise.all([
        getLocalFoodFrequents(userId, { days: 30, limit: 20 }).catch((e) => {
          logError('FoodSearchScreen.loadFrequents.local', e);
          return [];
        }),
        getFoodFrequents(userId, 20).catch(() => []),
      ]);
      const rows = mergeFrequents(local, server, 20);
      // D138 latency ruling: one batched resolve instead of one round-trip
      // per frequent row.
      const refMap = rows.length
        ? await resolveFoodRefs(userId, rows.map((r) => r.food_ref))
        : new Map();
      const resolved = [];
      for (const r of rows) {
        const food = refMap.get(r.food_ref);
        if (food) resolved.push(food);
      }
      setFrequentRows(resolved);
    } catch (e) {
      // Tolerated: the tab shows the last cache or its empty state.
      logError('FoodSearchScreen.loadFrequents', e);
    }
  }, [userId]);

  // The user's own foods (favourites, frequents, this slot's "add again"
  // recents) normalised into the ranker's single-food candidate shape, so the
  // Suggested tab can offer a single-food top-up ("Add 150g chicken breast")
  // beside the curated meals, not meals alone. De-duped by food_ref (a food
  // can appear in more than one list) and with disliked + quick-add refs
  // dropped (a long-pressed "hidden" food must not resurface as a suggestion).
  // Pure mapping of already-loaded rows; no extra fetch, fully deterministic.
  // The standing exclusions the suggestion list must honour: the user's
  // "never show me this" foods and their allergen tags, the same two lists
  // the meal-plan layer reads.
  const suggestExclusions = useMemo(() => ({
    excludeFoodKeys: userProfile?.mealPlanExcludeFoods,
    excludeTags: userProfile?.mealPlanExcludeTags,
  }), [userProfile?.mealPlanExcludeFoods, userProfile?.mealPlanExcludeTags]);

  const suggestFoodCandidates = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of [...favouriteRows, ...frequentRows, ...recents, ...customRows]) {
      const ref = f?.food_ref;
      if (!ref || seen.has(ref)) continue;
      if (dislikeRefs.has(ref)) continue;
      // ALLERGENS AND DIETARY RULES ARE ABSOLUTE (Campaign 17A job 6). This
      // list is built from the user's OWN favourites, frequents, recents and
      // custom foods, and it honoured dislikes but not the standing
      // exclusions - so a food they had loved, then excluded, kept appearing
      // as a suggestion. "A previously loved food that becomes excluded
      // disappears from future suggestions/plans immediately."
      if (foodRefExcluded(ref, suggestExclusions)) continue;
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
  }, [favouriteRows, frequentRows, recents, customRows, dislikeRefs, suggestExclusions]);

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
      // Dietary-needs build 2026-07-09: suggestions share the plan layer's
      // hard exclusions (avoid list + allergens). The user's own saved
      // foods/meals are deliberately not filtered: their history is theirs.
      //
      // Campaign 17B job 8: and a food marked "don't suggest" on its own row
      // counts here too. The curated meals were filtered by the profile's
      // avoid list only, so a curated meal could reintroduce the very food
      // the user had just told us not to suggest. Search RESULTS and history
      // are untouched - this is the choosing path, not the looking path.
      const candidates = getCuratedCandidates({
        diet,
        slot: mealSlot,
        ...withDoNotSuggest(
          {
            excludeFoodKeys: userProfile?.mealPlanExcludeFoods,
            excludeTags: userProfile?.mealPlanExcludeTags,
          },
          [...dislikeRefs],
        ),
      });
      const { suggestions: ranked, remaining, perMeal } = rankSuggestions({
        targets, consumed, savedMeals: candidates, foods: suggestFoodCandidates, slot: mealSlot, mealsLeft, limit: 12,
      });
      setSuggestions(ranked);
      setSuggestMeta({ hasTargets: true, remaining, perMeal });
    } catch (e) {
      logError('FoodSearchScreen.loadSuggested', e, { mealSlot });
      setSuggestions([]);
      setSuggestMeta(null);
    } finally {
      setSuggestLoading(false);
    }
  }, [userId, userProfile, entryDate, mealSlot, suggestFoodCandidates, dislikeRefs]);

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
      setSearchOffline(false);
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
        // Only the no-hit case is ambiguous. A saved-food (local) hit means
        // we answered without needing the network, so never flag offline then.
        if (rows.length === 0) {
          let offline = false;
          try {
            const state = await NetInfo.fetch();
            offline = state?.isConnected === false || state?.isInternetReachable === false;
          } catch (e) {
            // Connectivity probe itself failed: leave the generic miss copy.
            logError('FoodSearchScreen.connectivityProbe', e);
          }
          if (searchRequestRef.current === requestId) {
            setSearchOffline(offline);
            // Growth telemetry (adversarial review, minor): one event per
            // settled query, and only when the device was online. An empty
            // result with no network says nothing about the food database.
            // Length only, never text.
            if (!offline) {
              try { trackNow('food_search_empty', { query_length: toBucket('count', q.length) }); } catch (_) { /* telemetry never blocks search */ }
            }
          }
        } else if (searchRequestRef.current === requestId) {
          setSearchOffline(false);
        }
      } catch (e) {
        logError('FoodSearchScreen.search', e, { queryLength: q.length });
        if (searchRequestRef.current !== requestId) return;
        setResults([]);
        setSearchOffline(false);
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

  const plateKcal = useMemo(() => plate.reduce((s, it) => s + (it.kcal || 0), 0), [plate]);

  // Log every plate item to the meal, then return to the diary.
  // D230 R6: the plate closes with the house undo toast ("3 foods added to
  // Breakfast.", one food: "Oats added to Breakfast."), and its Undo removes
  // every row this log wrote: the ids come back from the one write.
  // D230 R10: the whole plate is ONE logFoodEntries call (one transaction, one
  // rollup, one sync schedule, each row validated as a single write is), so it
  // is all or nothing. A failure leaves the diary and the plate exactly as
  // they were, which is why the old "2 of 3 foods were added" sentence is gone:
  // that half-state can no longer happen.
  async function logPlate() {
    const plateSize = plate.length;
    const written = await writeItems(plate, () => { setPlate([]); setShowPlate(false); });
    // Growth telemetry: several foods logged in one go (the plate flow).
    if (written && plateSize >= 2) {
      try { trackNow('food_plate_logged', { items: toBucket('count', plateSize) }); } catch (_) { /* telemetry never blocks logging */ }
    }
  }

  // The one write behind the plate AND the typed-line review (D230 R13): the
  // same single logFoodEntries call, the same slot-recent memory, the same
  // toast with its Undo, the same failure copy. `items` carry
  // { food, quantityG, kcal, proteinG, carbsG, fatG, fibreG }; `onWritten`
  // clears whatever the rows came from, after a successful write only.
  async function writeItems(items, onWritten, { rethrow = false } = {}) {
    if (!items.length) return false;
    // CALC-3: in-flight guard so a double-tap can't log the whole plate twice
    // (each write mints fresh ids, so duplicates can't be deduped).
    if (loggingPlateRef.current) return false;
    loggingPlateRef.current = true;
    const total = items.length;
    // An item may carry its own meal, day, basis and note (a food added from
    // the sheet chose them there); the plate's own items use this screen's.
    const slotOf = (it) => it.mealSlot ?? mealSlot;
    const slots = [...new Set(items.map(slotOf))];
    try {
      const writtenIds = await logFoodEntries(userId, items.map((it) => ({
        entryDate: it.entryDate ?? entryDate,
        mealSlot: slotOf(it),
        foodRef: it.food.food_ref,
        quantityG: it.quantityG,
        kcal: it.kcal,
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        fibreG: it.fibreG,
        ...(it.weightState !== undefined ? { weightState: it.weightState } : null),
        ...(it.note ? { note: it.note } : null),
      })));
      for (const it of items) {
        if (it.skipSlotRecent) continue; // quick adds and curated meals keep no per-food memory
        // eslint-disable-next-line no-await-in-loop
        await upsertSlotRecent(userId, {
          mealSlot: slotOf(it),
          foodRef: it.food.food_ref,
          quantityG: it.quantityG,
        }).catch((e) => { logError('FoodSearchScreen.logPlate.slotRecent', e, { mealSlot }); }); // derived memory only; never fail the log
      }
      const where = slots.length === 1 ? ` to ${mealSlotLabel(slots[0])}` : '';
      const message = total === 1
        ? `${items[0].food?.name ?? 'Food'} added${where}.`
        : `${total} foods added${where}.`;
      // The toast provider is app-level, so it survives the goBack below.
      toast.show(message, {
        variant: 'undo',
        action: { label: 'Undo', onPress: () => undoPlate(writtenIds) },
      });
      onWritten?.();
      navigation.goBack();
      return true;
    } catch (e) {
      // FF-007: a failed plate write must be reported, never silent. Nothing
      // was written (one transaction), so the plate stays up for a retry
      // that cannot double-log.
      logError('FoodSearchScreen.logPlate', e, { mealSlot, total });
      // A caller whose own sheet reports the failure (and stays open to retry)
      // asks for the cause back instead of a second toast.
      if (rethrow) throw e;
      toast.show(
        total === 1
          ? 'That food was not added. Try again in a moment.'
          : 'Those foods were not added. Try again in a moment.',
        { variant: 'error', duration: 5000 },
      );
      return false;
    } finally {
      loggingPlateRef.current = false;
    }
  }

  // Everything already waiting to be logged: the plate and the rows parked
  // from a typed line. Any single-food add below writes these WITH the new
  // food, in one write with one Undo, because the screen closes afterwards
  // and nothing on the plate may be lost on the way out (food audit
  // 2026-10-16, item 5).
  function pendingItems() {
    const parked = (lineParked || []).filter((r) => r.food).map((r) => ({
      food: r.food, quantityG: r.grams, ...scaleMacros(r.food, r.grams),
    }));
    return [...plate, ...parked];
  }
  function clearPending() { setPlate([]); setShowPlate(false); setLineParked(null); }

  // The plate toast's Undo: every row the log wrote, removed in one
  // transaction (D230 R10), under the one toast.
  async function undoPlate(ids) {
    try {
      await deleteFoodEntries(userId, ids);
    } catch (e) {
      logError('FoodSearchScreen.undoPlate', e, { count: ids.length });
      // One transaction: either every row went or none did.
      toast.show('Those foods were not removed. You can remove them from the diary.', { variant: 'error', duration: 5000 });
    }
  }

  // ---- D230 R13: several foods in one typed line -------------------------
  // The search box's text, split into parts (foodLine.js, pure). With two or
  // more parts the screen offers to turn them into separate foods; the review
  // sheet lists each part's best match and portion, and nothing is written
  // until its one button.
  const lineParts = useMemo(() => (isFoodLine(query) ? parseFoodLine(query) : []), [query]);
  const [lineReview, setLineReview] = useState(null); // null | [{ key, part, food, grams, basis }]
  const [lineEdit, setLineEdit] = useState(null); // the review row open in the food's own sheet
  const [lineMatching, setLineMatching] = useState(false);
  const [lineAdding, setLineAdding] = useState(false);

  // The existing search, then the person's own history first (the same two
  // steps the search results use), for one part's name. The first food it
  // returns is the match.
  async function searchForLinePart(name) {
    // R13: the person's own foods and the local library only (lane 3D's
    // localOnly), so a typed line never waits on the network per part.
    const rows = await searchFoods(userId, name, { limit: 25, localOnly: true });
    return rankByPersonalHistory(
      mergePersonalMatches(rows, { personal: personalPool, query: name }),
      { favouriteRefs, recentRefs, frequentRefs },
    ).map(withCuratedServing);
  }

  async function openLineReview() {
    if (lineMatching || lineParts.length < 2) return;
    setLineParked(null);
    setLineMatching(true);
    try {
      const matches = await matchFoodLineParts(lineParts, searchForLinePart);
      setLineReview(matches.map(({ part, food }, i) => {
        // The person's own amount for this food at this meal comes first, then
        // the food's serving, then the generic guess (portionFor).
        const personalG = food ? (food.last_quantity_g > 0 ? food.last_quantity_g : slotPortions.get(food.food_ref)) : undefined;
        const portion = food ? portionFor(part, food, { personalG }) : null;
        return {
          key: `line-${i}-${part.name}`,
          part,
          food,
          grams: portion ? portion.grams : 0,
          basis: portion ? portion.basis : 'default',
        };
      }));
    } catch (e) {
      logError('FoodSearchScreen.openLineReview', e, { parts: lineParts.length });
      toast.show('Those foods could not be checked. Try again in a moment.', { variant: 'error', duration: 5000 });
    } finally {
      setLineMatching(false);
    }
  }

  // The rows kept aside while a "No match" part is searched for by hand
  // (fresh-eyes review 2026-10-16: the person should not have to retype the
  // line). A button under the box brings them back; the food found by hand
  // goes on the plate and is written with them.
  const [lineParked, setLineParked] = useState(null);
  function onLineRowPress(item) {
    if (item.food) { setLineEdit(item); return; }
    setLineParked((lineReview || []).filter((r) => r.key !== item.key));
    setLineReview(null);
    setQuery(item.part.name);
  }
  function resumeLineReview() {
    if (!lineParked?.length) return;
    setLineReview(lineParked);
    setLineParked(null);
  }

  function removeLineRow(key) {
    setLineReview((rows) => {
      const next = (rows || []).filter((r) => r.key !== key);
      return next.length ? next : null;
    });
  }

  // The food's own sheet changed this row's amount: the row takes it. The
  // sheet's meal and day choices do not apply here, the whole line goes to
  // the meal this screen is logging to.
  async function onLineEditSave({ quantityG }) {
    const editing = lineEdit;
    if (!editing) return;
    setLineReview((rows) => (rows || []).map((r) => (
      r.key === editing.key ? { ...r, grams: quantityG, basis: 'typed_g' } : r
    )));
  }

  async function addLineReview() {
    const rows = (lineReview || []).filter((r) => r.food);
    if (!rows.length || lineAdding) return;
    setLineAdding(true);
    try {
      // Foods already on the plate go in the same write (fresh-eyes review
      // 2026-10-16: the screen closes after the add, so the plate must never
      // be dropped on the way out).
      await writeItems([
        ...plate,
        ...rows.map((r) => ({
          food: r.food,
          quantityG: r.grams,
          ...scaleMacros(r.food, r.grams),
        })),
      ], () => { setLineReview(null); setLineParked(null); setQuery(''); setPlate([]); setShowPlate(false); });
    } finally {
      setLineAdding(false);
    }
  }

  // Quick add: log calories (and optional macros) with no food lookup.
  // food_ref 'quick:adhoc' has no resolvable name, so the diary shows it
  // as "Quick add" with no gram weight. Logs, then returns to the diary.
  async function confirmQuickAdd({ kcal, protein, carbs, fat, mealSlot: slot, note }) {
    const pending = pendingItems();
    if (pending.length > 0) {
      // The write closes the screen itself, so quickSavedRef stays false and
      // the sheet's close does not go back a second time.
      await writeItems([...pending, {
        food: { food_ref: 'quick:adhoc', name: (note && String(note).trim()) || 'Quick add' },
        quantityG: 0, kcal, proteinG: protein, carbsG: carbs, fatG: fat, fibreG: null,
        mealSlot: slot, note, skipSlotRecent: true,
      }], clearPending, { rethrow: true });
      return;
    }
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
      note, // D230 R20: the name a quick add never had
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

  // Auto-open the detail sheet for a scanner result or an exact remembered
  // food. Both are preselection only: the user still confirms grams, meal and
  // date in the sheet before anything is written.
  const scannedFood = route?.params?.scannedFood;
  const preselectedFood = route?.params?.preselectedFood;
  useEffect(() => {
    const routedFood = scannedFood ?? preselectedFood;
    // A scan started from this screen's More tab comes back by replacing the
    // scanner with a NEW add screen, leaving two on the stack. When an earlier
    // add screen exists, hand the food to it and drop this one, so the plate
    // and the search are still there.
    if (routedFood && !picker) {
      try {
        const routes = navigation.getState?.()?.routes ?? [];
        const idx = routes.findIndex((r) => r.key === route?.key);
        const earlier = idx > 0 ? routes.slice(0, idx).reverse().find((r) => r.name === 'FoodSearch') : null;
        if (earlier) {
          navigation.navigate({
            key: earlier.key,
            params: { scannedFood, preselectedFood },
            merge: true,
          });
          return;
        }
      } catch (e) {
        logError('FoodSearchScreen.dedupeScan', e); // fall through: open the food here
      }
    }
    if (routedFood && !picker) {
      setPicker({ food: routedFood, fromScan: !!scannedFood });
      navigation.setParams({ scannedFood: undefined, preselectedFood: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedFood, preselectedFood]);

  async function confirmLog({ quantityG, mealSlot: chosenSlot, entryDate: chosenDate, weightState, note }) {
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
      fromScan: !!picker?.fromScan,
      surface: 'sheet',
    });
    const pending = pendingItems();
    if (pending.length > 0) {
      await writeItems([...pending, {
        food, quantityG, ...scaleMacrosAsWeighed(food, quantityG, weightState),
        entryDate: chosenDate, mealSlot: chosenSlot, weightState, note, // D230 R20
      }], clearPending, { rethrow: true });
      return;
    }
    const entryId = await logFoodEntry(userId, buildFoodEntryPayload({
      entryDate: chosenDate,
      mealSlot: chosenSlot,
      foodRef: food.food_ref,
      quantityG,
      food,
      weightState,
      note, // D230 R20
    }));
    await upsertSlotRecent(userId, buildSlotRecentPayload({
      mealSlot: chosenSlot,
      foodRef: food.food_ref,
      quantityG,
    })).catch((e) => { logError('FoodSearchScreen.confirmLog.slotRecent', e, { mealSlot: chosenSlot }); }); // derived memory only; never fail the log
    // A2 (first-week trust): the FIRST food log (and every log after) gets the
    // same success + Undo toast as a re-log or a diary "usual", previously
    // this path (the sheet's "Add to diary") showed nothing at all. Exact
    // pattern from DiaryScreen.onLogUsual; the toast survives the goBack
    // below because the Toast provider is mounted at the app root.
    toast.show(`${food.name ?? 'Food'} added to ${mealSlotLabel(chosenSlot)}.`, {
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
      const pending = pendingItems();
      if (pending.length > 0) {
        const meal = CURATED_MEALS.find((m) => m.id === s.id);
        const mealRows = (meal ? mealItems(meal) : [])
          .filter((it) => it?.foodRef && Number(it.quantityG) > 0)
          .map((it) => ({
            food: { food_ref: it.foodRef, name: it.name },
            quantityG: Number(it.quantityG),
            kcal: Number(it.kcal) || 0,
            proteinG: Number(it.proteinG) || 0,
            carbsG: Number(it.carbsG) || 0,
            fatG: Number(it.fatG) || 0,
            fibreG: null,
            skipSlotRecent: true,
          }));
        const ok = mealRows.length > 0
          && await writeItems([...pending, ...mealRows], clearPending);
        if (ok) setMealSheet(null);
        else {
          if (!mealRows.length) toast.show('That meal was not added. Try again in a moment.', { variant: 'error', duration: 4000 });
          setLoggingMealId(null);
        }
        return;
      }
      await applyCuratedMealToDiary(userId, s.id, { mealSlot, entryDate });
      setMealSheet(null);
      navigation.goBack();
    } catch (e) {
      // FF-007: surface the failure instead of only resetting the spinner.
      logError('FoodSearchScreen.logCuratedMeal', e, { mealId: s.id });
      toast.show('That meal was not added. Try again in a moment.', { variant: 'error', duration: 4000 });
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
      const pending = pendingItems();
      if (pending.length > 0) {
        await writeItems([...pending, {
          food: { food_ref: s.foodRef, name: cand.name },
          quantityG: s.quantityG, ...scaleMacros(per100, s.quantityG),
        }], clearPending);
        setLoggingMealId(null);
        return;
      }
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
      })).catch((err) => { logError('FoodSearchScreen.logSuggestedFood.slotRecent', err, { mealSlot }); }); // derived memory only; never fail the log
      navigation.goBack();
    } catch (e) {
      logError('FoodSearchScreen.logSuggestedFood', e, { foodRef: s.foodRef });
      toast.show('That food was not added. Try again in a moment.', { variant: 'error', duration: 4000 });
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
      // Campaign 17B job 8: the same words the meal plan uses for the same
      // instruction, and the reassurance that the food itself is still here.
      const msg = next === 'fav' ? 'Added to favourites'
        : next === 'dislike' ? 'This will not be suggested again. It stays in your search and your diary.'
        : 'Preference cleared';
      toast.show(msg);
      loadBrowse();
    } catch (e) {
      logError('FoodSearchScreen.cyclePreference', e, { foodRef: food.food_ref });
      toast.show('That choice was not saved. Try again in a moment.', { variant: 'error', duration: 4000 });
    }
  }

  // Database "no match" fallback replaces the screen so Back lands on
  // the Diary, not an empty search. The Custom tab CTA pushes instead,
  // so the user can return to the picker.
  // With foods waiting (the plate, parked typed-line rows) the screen is
  // pushed instead and the waiting foods travel with it, so "Save and add"
  // writes them with the new food in one write and a close keeps them here.
  function customFoodParams() {
    const carry = pendingItems().map((it) => ({
      foodRef: it.food.food_ref, name: it.food.name ?? null, quantityG: it.quantityG,
      kcal: it.kcal, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, fibreG: it.fibreG ?? null,
    }));
    // Recipe pick mode travels with the form, so "Save and add to recipe" hands
    // the new food back to the builder through the same returnTo a picked
    // search result uses (food audit follow-up 2026-10-16).
    const pick = isRecipePick
      ? { pickMode: 'recipe', returnTo: route?.params?.returnTo ?? 'RecipeBuilder' }
      : null;
    return { mealSlot, entryDate, ...(carry.length ? { carryItems: carry } : null), ...pick };
  }
  function gotoCustomReplace() {
    const params = customFoodParams();
    if (params.carryItems) navigation.navigate('AddCustomFood', params);
    else navigation.replace('AddCustomFood', params);
  }
  function newCustomFood() {
    navigation.navigate('AddCustomFood', customFoodParams());
  }

  // Lift the user's own foods (favourited / logged here recently / logged often)
  // above the generic database matches for a typed query, so "search" surfaces
  // what they actually eat first (MFP/Cronometer parity). Pure re-rank over the
  // already-loaded personal sets, no extra fetch. recents/frequents are resolved
  // food rows; map them to their refs for the membership test.
  const recentRefs = useMemo(() => new Set(recents.map((r) => r.food_ref)), [recents]);
  const frequentRefs = useMemo(() => new Set(frequentRows.map((f) => f.food_ref)), [frequentRows]);

  // Campaign 17B job 1: the ranker above can only re-order what the query
  // returned, so a mature user's exact food that sat below the result cap was
  // never promoted - it was simply absent. Their own foods are matched against
  // the query directly and merged in FIRST, then the same single ranker
  // decides the order. Exclusions are honoured here for the same reason they
  // are on the Suggested tab: a food the user asked us never to suggest must
  // not be re-injected by a helpful shortcut. (It stays findable by typing its
  // name - the waterfall is untouched - because history is never hidden.)
  const personalPool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of [...favouriteRows, ...frequentRows, ...recents, ...customRows]) {
      const ref = f?.food_ref;
      if (!ref || seen.has(ref)) continue;
      if (dislikeRefs.has(ref)) continue;
      if (foodRefExcluded(ref, suggestExclusions)) continue;
      seen.add(ref);
      out.push(f);
    }
    return out;
  }, [favouriteRows, frequentRows, recents, customRows, dislikeRefs, suggestExclusions]);

  const rankedResults = useMemo(
    () => rankByPersonalHistory(
      mergePersonalMatches(results, { personal: personalPool, query }),
      { favouriteRefs, recentRefs, frequentRefs },
    ),
    [results, personalPool, query, favouriteRefs, recentRefs, frequentRefs],
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
          style={[styles.ctaRow, live.ctaRow]}
          onPress={() => {
            haptics.selection();
            if (item.action === 'custom') return newCustomFood();
            if (item.action === 'scan') return navigation.navigate('ScanBarcode', { mealSlot, entryDate });
            if (item.action === 'quick') { quickSavedRef.current = false; setShowQuickAdd(true); return null; }
            if (item.action === 'meals') return navigation.navigate('MyMeals', { mealSlot, entryDate });
            return navigation.navigate('MyRecipes', { mealSlot, entryDate });
          }}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Ionicons name={item.icon} size={20} color={t.colors.textSecondary} />
          <Text style={[styles.ctaText, live.ctaText]}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      );
    }
    return renderFoodRow(item.food);
  }

  // One food row, the same grammar wherever it appears (a tab's list, the
  // search results, "Around this time"): a tap opens the sheet, the "+" adds
  // the shown portion to the foods to log, a hold cycles the preference.
  function renderFoodRow(rawFood, key) {
    // The row, its "+" and the sheet it opens start from ONE amount: the
    // person's usual amount at this meal when there is one (the same source
    // the sheet reads), else the food's own serving (food audit 2026-10-16,
    // item 15). FoodRow and addToPlate read last_quantity_g first.
    const usualG = rawFood?.last_quantity_g > 0 ? 0 : slotPortions.get(rawFood?.food_ref);
    let food = usualG > 0
      ? { ...withCuratedServing(rawFood), last_quantity_g: usualG }
      : withCuratedServing(rawFood);
    // A servings-only recipe never carries a gram amount: its row, "+" and
    // sheet all start from its one serving.
    if (food?.servings_only === true && Number(food.serving_g) > 0) {
      food = { ...food, last_quantity_g: Number(food.serving_g) };
    }
    // A saved meal has no single-food gram editor. Open its confirmation
    // surface with the exact meal preselected; never fan it out from a row tap.
    if (typeof food.food_ref === 'string' && food.food_ref.startsWith('meal:')) {
      return (
        <FoodRow
          key={key}
          food={food}
          preference={null}
          onPress={() => navigation.navigate('MyMeals', {
            mealSlot, entryDate, confirmMealId: food.savedMealId,
          })}
        />
      );
    }
    const preference = favouriteRefs.has(food.food_ref) ? 'fav'
      : dislikeRefs.has(food.food_ref) ? 'dislike'
      : null;
    // D138: a custom food is the user's own, so it stays editable from the
    // More tab it lives on -- a trailing pencil that opens AddCustomFood in
    // edit mode, never gated behind the row's own long-press (already the
    // favourite/exclude preference cycle).
    const isEditableCustomFood = activeTab === 'custom' && food.source === 'custom' && !!food.id;
    return (
      <FoodRow
        key={key}
        food={food}
        preference={preference}
        onPress={() => openPicker(food)}
        onLongPress={() => onLongPress(food)}
        onAdd={isRecipePick ? undefined : () => addToPlate(food)}
        onEdit={isEditableCustomFood
          ? () => navigation.navigate('AddCustomFood', { mealSlot, entryDate, editFoodId: food.id })
          : undefined}
      />
    );
  }

  function renderEmpty() {
    // A live search with no hits: offer the custom-food fallback.
    if (query.trim().length >= 2) {
      if (searching) return null;
      // A line of several foods has its own offer above; the whole line is
      // also searched, so "No matches" for it would only contradict the offer.
      // "Add custom food" stays reachable here.
      if (!isRecipePick && lineParts.length >= 2) {
        return (
          <Button
            title="Add custom food"
            icon="add"
            onPress={gotoCustomReplace}
            variant="secondary"
            style={[styles.footerBtn, live.footerBtn]}
            textStyle={[styles.footerBtnText, live.footerBtnText]}
            accessibilityLabel="Add custom food"
          />
        );
      }
      return (
        <EmptyState
          icon={searchOffline ? 'cloud-offline-outline' : 'search-outline'}
          text={searchOffline
            ? "You are offline, so live search cannot check the food library. Saved foods still work, or add a custom food."
            : `No matches for "${query.trim()}".`}
          actionLabel="Add custom food"
          onAction={gotoCustomReplace}
          actionAccessibilityLabel="Add custom food"
          secondaryLabel="Clear search"
          onSecondary={() => setQuery('')}
          secondaryAccessibilityLabel="Clear food search"
        />
      );
    }
    const copy = EMPTY_COPY[activeTab];
    if (!copy) return null;
    return <EmptyState icon={EMPTY_ICON[activeTab]} text={copy} />;
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
        <EmptyState
          icon="restaurant-outline"
          text="Set your targets first and Volyume can suggest meals that fit them."
          actionLabel="Set nutrition targets"
          onAction={() => navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets')}
          actionAccessibilityLabel="Set nutrition targets"
        />
      );
    }
    if (!suggestions.length) {
      return (
        <EmptyState
          icon="restaurant-outline"
          text="No suggestions ready for this meal. Try search, or create meals from your targets."
        />
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
        // D230 R3 (food level-up 2026-10-16): explanation is on demand. The
        // standing additions note that sat here (Founder 2026-06-30: a
        // suggested meal is a base to build on) now lives only where the
        // additions themselves are shown, the meal's own sheet
        // (CuratedMealSheet, ADDITIONS_INTRO from mealAdditions.js, the one
        // source), so this list carries no second copy of it.
        ListHeaderComponent={suggestMeta?.perMeal ? (
          <View>
            <Text
              style={[styles.suggestHint, live.suggestHint]}
              accessibilityLabel={`Sized for this meal: around ${Math.round(suggestMeta.perMeal.protein)} grams of protein, ${spokenEnergy(suggestMeta.perMeal.kcal, energyUnit)}.`}
            >
              Sized for this meal: around {Math.round(suggestMeta.perMeal.protein)} g protein, {formatEnergy(suggestMeta.perMeal.kcal, energyUnit)} {energyUnitLabel(energyUnit)}.
            </Text>
          </View>
        ) : undefined}
        renderItem={({ item }) => {
          const isFood = item.kind === 'food';
          const busyKey = isFood ? item.foodRef : item.id;
          return (
            <TouchableOpacity
              style={[styles.suggestCard, live.suggestCard]}
              onPress={() => (isFood ? logSuggestedFood(item) : setMealSheet(item))}
              disabled={!!loggingMealId}
              accessibilityRole="button"
              accessibilityLabel={isFood ? `Add ${item.quantityG} grams ${item.name}` : `Open ${item.name}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestName, live.suggestName]}>
                  {isFood ? `${item.name} · ${formatWithUnit(formatNumber(item.quantityG), 'g')}` : item.name}
                </Text>
                <Text style={[styles.suggestMacros, live.suggestMacros]}>
                  {formatEnergy(item.macros.kcal, energyUnit)} {energyUnitLabel(energyUnit)} · {item.macros.protein} g protein · {item.macros.carbs} g carbs · {item.macros.fat} g fat
                </Text>
              </View>
              {loggingMealId === busyKey
                ? <ActivityIndicator size="small" color={t.colors.primary} />
                : <Ionicons name={isFood ? 'add-circle' : 'chevron-forward'} size={isFood ? 26 : 22} color={t.colors.textSecondary} />}
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  // D230 R5: the day this add lands on, said once under the tabs when it is
  // not today ("For Tuesday 14 October."), in the add sheet's own words
  // (diaryDates.entryDateLine, null on today so the line is absent then).
  const dateLine = entryDateLine(entryDate);
  // D230 R7: "Around this time" sits above the slot recents on the Recent tab,
  // only while adding to today and only when it has something to offer.
  const showAround = activeTab === 'recents'
    && query.trim().length < 2
    && entryDate === todayLocalKey()
    && aroundRows.length > 0;
  const aroundHeader = showAround ? (
    <View>
      <SectionLabel heading style={styles.sectionLabel}>Around this time</SectionLabel>
      {aroundRows.map((food) => renderFoodRow(food, `around-${food.food_ref}`))}
      {recents.length > 0 ? (
        <SectionLabel heading style={styles.sectionLabel}>{`Recent at ${mealSlotLabel(mealSlot)}`}</SectionLabel>
      ) : null}
    </View>
  ) : undefined;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      {/* D230 R5: the header says where this add is logging, by the meal's
          own name (mealSlotLabel, so a renamed meal shows its name). */}
      {/* In pick mode (a recipe's or a saved meal's "Add a food") nothing is
          logged from here: the header says so (fresh-eyes review 2026-10-16). */}
      <ModalHeader title={isRecipePick ? 'Choose a food' : `Add to ${mealSlotLabel(mealSlot)}`} onClose={() => navigation.goBack()} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, live.tabBar]}
        contentContainerStyle={styles.tabBarContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* D230 R4/R16: still a tab strip (role tab, selected state), each
            tab a full 48 dp target with no hit slop needed, and the selected
            tab drawn in ink (WindowChips' inkSelected treatment: the label
            and the rule beneath it in textPrimary, the rest in textMuted).
            Amber stays on the thing to do, never on a control's state. */}
        {SEARCH_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => { haptics.selection(); setActiveTab(tab.key); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={[styles.tabLabel, live.tabLabel, activeTab === tab.key && [styles.tabLabelActive, live.tabLabelActive]]}>{tab.label}</Text>
            <View style={[styles.tabUnderline, activeTab === tab.key && [styles.tabUnderlineActive, live.tabUnderlineActive]]} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {dateLine ? <Text style={[styles.dateLine, live.dateLine]}>{dateLine}</Text> : null}

      {/* NU-9: the search box renders on EVERY tab, including Suggested. The
          locked design intent (searchTabs.js header) is a persistent search
          bar over browse lists; Suggested was the one tab that hid it. A live
          2+ char query is a database search from any tab (selectTabRows), so
          typing here shows results and clearing returns to the suggestions. */}
      <SearchBar
        // D138: RN's autoFocus only fires at mount, so remounting once the
        // recents list has actually reported back (rather than flipping the
        // prop on a live instance) is what makes the flag take effect. A
        // repeat user with a populated recents list never remounts, so
        // their list keeps focus exactly as before.
        key={recentsLoaded ? 'search-loaded' : 'search-loading'}
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods or brands"
        accessibilityLabel="Search foods or brands"
        loading={searching}
        // D230 R7: "Around this time" is something to tap too, so it keeps
        // the keyboard down as the slot recents do (a meal with no history of
        // its own, the very case it exists for).
        autoFocus={recentsLoaded && recents.length === 0 && aroundRows.length === 0}
        style={styles.searchBar}
      />

      {/* D230 R13: a line of several foods ("2 eggs, toast and a tea") is
          offered as separate foods; the review sheet below lists them and
          nothing is written until its one button. Not in recipe pick mode,
          which returns a single ingredient. */}
      {!isRecipePick && lineParts.length >= 2 ? (
        <Button
          title={`Add these ${lineParts.length} as separate foods`}
          onPress={openLineReview}
          variant="secondary"
          loading={lineMatching}
          style={styles.lineOfferBtn}
          accessibilityLabel={`Add these ${lineParts.length} as separate foods`}
        />
      ) : null}
      {!isRecipePick && lineParts.length < 2 && lineParked?.length ? (
        <Button
          title={`Back to the ${lineParked.length} ${lineParked.length === 1 ? 'food' : 'foods'} you were checking`}
          onPress={resumeLineReview}
          variant="secondary"
          style={styles.lineOfferBtn}
          accessibilityLabel={`Back to the ${lineParked.length} ${lineParked.length === 1 ? 'food' : 'foods'} you were checking`}
        />
      ) : null}

      {/* D230 R3: the standing provenance line that sat here ("Saved foods
          work offline...") is gone; the offline fact is said where it
          matters, in the offline empty state of a search. */}
      {activeTab === 'suggested' && query.trim().length < 2 ? renderSuggested() : (
      <>
      <FlashList
        data={listData}
        extraData={slotPortions}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ListHeaderComponent={aroundHeader}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          activeTab !== 'custom' && query.trim().length >= 2 && results.length > 0 ? (
            <Button
              title="Add custom food"
              icon="add"
              onPress={gotoCustomReplace}
              variant="secondary"
              style={[styles.footerBtn, live.footerBtn]}
              textStyle={[styles.footerBtnText, live.footerBtnText]}
              accessibilityLabel="Add custom food"
            />
          ) : null
        }
      />
      </>
      )}

      {!isRecipePick && plate.length > 0 ? (
        <View style={[styles.plateBar, live.plateBar, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) }]}>
          <TouchableOpacity
            style={styles.plateInfo}
            onPress={() => { haptics.selection(); setShowPlate(true); }}
            accessibilityRole="button"
            accessibilityLabel={`Review selected foods, about ${spokenEnergy(plateKcal, energyUnit)}`}
          >
            <Text style={[styles.plateCount, live.plateCount]}>{plate.length} to log</Text>
            <Text style={[styles.plateKcalLine, live.plateKcalLine]}>About {formatEnergy(plateKcal, energyUnit)} {energyUnitLabel(energyUnit)} · tap to review</Text>
          </TouchableOpacity>
          <Button
            title={`Log ${plate.length}`}
            onPress={logPlate}
            variant="primary"
            fullWidth={false}
            style={[styles.plateLogBtn, live.plateLogBtn]}
            textStyle={[styles.plateLogText, live.plateLogText]}
            accessibilityLabel={`Log ${plate.length} foods to ${mealSlotLabel(mealSlot)}`}
          />
        </View>
      ) : null}

      <BottomSheet
        visible={showPlate}
        onClose={() => setShowPlate(false)}
        accessibilityLabel="Selected foods"
        sheetStyle={styles.plateModalSheet}
      >
        <View style={styles.plateModalHeader}>
          <Text style={[styles.plateModalTitle, live.plateModalTitle]} accessibilityRole="header">Selected foods ({plate.length})</Text>
          <TouchableOpacity onPress={() => setShowPlate(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={t.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 360 }}>
          {plate.map((it) => (
            <View key={it.key} style={[styles.plateItem, live.plateItem]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.plateItemName, live.plateItemName]} numberOfLines={1}>{it.food.name}</Text>
                <Text
                  style={[styles.plateItemMeta, live.plateItemMeta]}
                  accessibilityLabel={`${formatNumber(Math.round(it.quantityG))} grams, ${spokenEnergy(it.kcal, energyUnit)}`}
                >{formatNumber(Math.round(it.quantityG))} g · {formatEnergy(it.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFromPlate(it.key)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${it.food.name}`}>
                <Ionicons name="close-circle" size={22} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <View style={styles.plateModalActions}>
          <Button
            title="Clear"
            onPress={() => { setPlate([]); setShowPlate(false); }}
            variant="outline"
            fullWidth={false}
            style={[styles.plateClearBtn, live.plateClearBtn]}
            textStyle={[styles.plateClearText, live.plateClearText]}
            accessibilityLabel="Clear selected foods"
          />
          <Button
            title="Log selected"
            onPress={logPlate}
            variant="primary"
            fullWidth={false}
            style={[styles.plateLogBtnWide, live.plateLogBtnWide]}
            textStyle={[styles.plateLogText, live.plateLogText]}
            accessibilityLabel={`Log ${plate.length} to ${mealSlotLabel(mealSlot)}`}
          />
        </View>
      </BottomSheet>

      <FoodDetailSheet
        visible={!!picker}
        mode="add"
        saveTitle={isRecipePick ? 'Use this food' : null}
        food={picker?.food}
        // Campaign 17B job 2: the row's own remembered portion when it has
        // one (the Add-again rows carry it), otherwise the portion this exact
        // food was last logged at in THIS slot. Keyed on food_ref, so a
        // portion is never carried across a merely similar food.
        initialQuantityG={picker?.food?.last_quantity_g
          ?? (picker?.food?.food_ref ? slotPortions.get(picker.food.food_ref) : undefined)}
        initialMealSlot={mealSlot}
        initialEntryDate={entryDate}
        onSave={confirmLog}
        onClose={() => setPicker(null)}
      />

      {/* D230 R13: the typed line's review. It steps aside while one food's
          own sheet is open to change an amount, then returns with the row
          updated; the line's rows are kept the whole time. */}
      <FoodLineReviewSheet
        visible={!!lineReview && !lineEdit}
        mealName={mealSlotLabel(mealSlot)}
        items={lineReview || []}
        energyUnit={energyUnit}
        adding={lineAdding}
        onRowPress={onLineRowPress}
        onRemove={removeLineRow}
        onAdd={addLineReview}
        onClose={() => setLineReview(null)}
      />
      <FoodDetailSheet
        visible={!!lineEdit}
        mode="add"
        food={lineEdit?.food}
        initialQuantityG={lineEdit?.grams}
        initialMealSlot={mealSlot}
        initialEntryDate={entryDate}
        saveTitle="Use this amount"
        onSave={onLineEditSave}
        onClose={() => setLineEdit(null)}
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
  // D230 R4/R16: every tab is at least the 48 dp touch target by its own
  // height (no hit slop), the label centred and the rule on the bottom edge.
  tab: {
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...type.label,
    color: colors.textMuted,
  },
  tabLabelActive: { ...type.w('label', 'semibold'), color: colors.textPrimary },
  tabUnderline: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0,
    height: 2, backgroundColor: 'transparent',
    borderRadius: radius.hair,
  },
  // Ink, not amber: the selected tab is a control's state, not the action.
  tabUnderlineActive: { backgroundColor: colors.textPrimary },

  // D230 R5: the add screen's day line, the add sheet's own style for it.
  dateLine: {
    ...type.bodySm, color: colors.textSecondary,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
  },

  searchBar: {
    margin: spacing.md,
  },

  // D230 R13: the typed line's offer, a full 48 dp row under the box.
  lineOfferBtn: {
    minHeight: touchTarget.minimum,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  sectionLabel: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },

  ctaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  ctaText: { ...type.bodyStrong, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 },

  suggestHint: {
    ...type.caption, color: colors.textMuted,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  suggestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  suggestName: { ...type.bodyStrong, color: colors.textPrimary },
  suggestMacros: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  footerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
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
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  plateLogText: { ...type.bodyStrong, color: colors.textPrimary },
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
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  plateItemName: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  plateItemMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  plateModalActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  plateClearBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  plateClearText: { color: colors.textSecondary, fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  plateLogBtnWide: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
});

// CP-10 batch E (2026-07-10): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so
// this screen's tokens stay live under a theme/accessibility toggle. Pure
// layout keys (flex/gap/padding/width, no token) are correctly omitted --
// there is nothing to unfreeze for them. Same pattern as MyMealsScreen.js's
// buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    tabBar: { borderBottomColor: t.colors.border },
    tabLabel: { ...t.type.label, color: t.colors.textMuted },
    tabLabelActive: { ...t.type.w('label', 'semibold'), color: t.colors.textPrimary },
    tabUnderlineActive: { backgroundColor: t.colors.textPrimary },
    dateLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    ctaRow: { borderBottomColor: t.colors.borderSubtle },
    ctaText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    suggestHint: { ...t.type.caption, color: t.colors.textMuted },
    suggestCard: {
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      borderLeftColor: t.colors.primary,
    },
    suggestName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    suggestMacros: { ...t.type.caption, color: t.colors.textSecondary },
    footerBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    footerBtnText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    plateBar: { borderTopColor: t.colors.border, backgroundColor: t.colors.surface },
    plateCount: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    plateKcalLine: { ...t.type.caption, color: t.colors.textMuted },
    plateLogBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    plateLogText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    plateModalTitle: { ...t.type.title, color: t.colors.textPrimary },
    plateItem: { borderBottomColor: t.colors.borderSubtle },
    plateItemName: { color: t.colors.textPrimary, fontSize: t.fontSize.md },
    plateItemMeta: { ...t.type.caption, color: t.colors.textMuted },
    plateClearBtn: { borderColor: t.colors.border },
    plateClearText: { color: t.colors.textSecondary, fontSize: t.fontSize.md },
    plateLogBtnWide: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
  };
}
