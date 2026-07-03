/**
 * RecipeBuilderScreen
 *
 * Create or edit a recipe. Persists name, total servings, notes,
 * and an ordered ingredient list. Live macros preview shows total
 * and per-serving figures derived from each ingredient's macros
 * scaled by its quantity in grams.
 *
 * Ingredient picking reuses FoodSearchScreen in `pickMode: 'recipe'`.
 * On pick, that screen navigates back here with route param
 * `addedIngredient: { food_ref, name, quantity_g, food }` which a
 * useEffect appends to local state and then clears.
 *
 * Save flow:
 *   - new recipe   -> createRecipe + setRecipeIngredients (atomic)
 *   - edit recipe  -> updateRecipe(patch) + setRecipeIngredients
 *
 * Voice rules from CLAUDE.md: no em dashes; plain spoken voice;
 * British English; no marketing absolutes.
 */
import { todayLocalKey } from '../lib/dayKey';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { toEnergy, energyUnitLabel } from '../lib/format';
import {
  createRecipe, updateRecipe, getRecipeWithIngredients,
  setRecipeIngredients, computeRecipeMacros,
} from '../lib/food/db';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { importRecipeFromUrl } from '../lib/food/recipeImport';
import { searchFoods } from '../lib/food/waterfall';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function RecipeBuilderScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const userId = user?.id;
  const toast = useToast();

  const recipeId = route?.params?.recipeId ?? null;
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [name, setName] = useState('');
  const [totalServings, setTotalServings] = useState('4');
  const [notes, setNotes] = useState('');
  // Ingredients held locally until save. Each entry:
  // { id?, food_ref, quantity_g, food }
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(!!recipeId);
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const loadedRef = useRef(false);

  // Initial load for edit mode.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!recipeId || loadedRef.current) {
        setLoading(false);
        return;
      }
      try {
        const recipe = await getRecipeWithIngredients(userId, recipeId);
        if (cancelled || !recipe) { setLoading(false); return; }
        setName(recipe.name ?? '');
        setTotalServings(String(recipe.total_servings ?? 4));
        setNotes(recipe.notes ?? '');
        // Resolve each ingredient's food so the preview can show
        // names + per-100g macros.
        const resolved = [];
        for (const ing of recipe.ingredients) {
          const food = await resolveFoodRef(userId, ing.food_ref);
          resolved.push({
            id: ing.id,
            food_ref: ing.food_ref,
            quantity_g: ing.quantity_g,
            food: food || { name: ing.food_ref, food_ref: ing.food_ref },
          });
        }
        if (cancelled) return;
        setIngredients(resolved);
        loadedRef.current = true;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [recipeId, userId]);

  // Accept newly-picked ingredients handed back by FoodSearchScreen
  // via route params. Append + clear so a screen focus event doesn't
  // re-add the same one.
  const incoming = route?.params?.addedIngredient;
  useEffect(() => {
    if (!incoming) return;
    setIngredients((prev) => [
      ...prev,
      {
        food_ref: incoming.food_ref,
        quantity_g: Number(incoming.quantity_g) || 0,
        food: incoming.food || { name: incoming.name ?? incoming.food_ref },
      },
    ]);
    navigation.setParams({ addedIngredient: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const macros = useMemo(
    () => computeRecipeMacros(ingredients, Number(totalServings)),
    [ingredients, totalServings],
  );

  function onPickIngredient() {
    navigation.navigate('FoodSearch', {
      pickMode: 'recipe',
      returnTo: 'RecipeBuilder',
      mealSlot, entryDate,
    });
  }

  // Best-effort import from a web URL. Reads a schema.org Recipe out
  // of the page's JSON-LD, sets the name, and matches each ingredient
  // string to the top food-search hit. The user reviews every amount,
  // so a rough top-hit match is fine. Never blocks the manual builder.
  async function onImportFromWeb() {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImporting(true);
    try {
      const parsed = await importRecipeFromUrl(url);
      if (!parsed) {
        toast.show("Couldn't read a recipe from that link.", { variant: 'warning' });
        return;
      }
      if (typeof parsed.name === 'string' && parsed.name.trim()) {
        setName(parsed.name.trim().slice(0, 80));
      }
      if (parsed.servings && Number(parsed.servings) > 0) {
        setTotalServings(String(parsed.servings));
      }
      const allLines = parsed.ingredients || [];
      // Cap the per-ingredient lookups: each falls through to two live food APIs
      // on a cache miss, and an untrusted page could list 150+ ingredients. 30 is
      // far above any real recipe; the rest are noted so nothing is silently lost.
      const MAX_IMPORT_INGREDIENTS = 30;
      const lines = allLines.slice(0, MAX_IMPORT_INGREDIENTS);
      const overflow = allLines.length - lines.length;
      const matched = [];
      for (const line of lines) {
        try {
          const hits = await searchFoods(userId, line, { limit: 1 });
          const food = hits && hits[0];
          if (!food) continue;
          matched.push({
            food_ref: food.food_ref,
            quantity_g: Number(food.serving_g) > 0 ? Number(food.serving_g) : 100,
            food,
          });
        } catch (_e) {
          // One bad lookup shouldn't sink the whole import.
        }
      }
      if (matched.length > 0) {
        setIngredients((prev) => [...prev, ...matched]);
      }
      setImportUrl('');
      toast.show(
        `Imported ${matched.length} of ${lines.length} ingredients. Check the amounts.`
        + (overflow > 0 ? ` (${overflow} more not imported.)` : ''),
        { variant: matched.length > 0 ? 'success' : 'warning' },
      );
    } catch (_e) {
      toast.show("Couldn't read a recipe from that link.", { variant: 'warning' });
    } finally {
      setImporting(false);
    }
  }

  function onRemove(i) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onChangeQty(i, raw) {
    // Filter to digits and a single decimal so a stray character can't turn the
    // whole macro preview into NaN.
    const q = Number(raw.replace(/[^0-9.]/g, '')) || 0;
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, quantity_g: q } : ing));
  }

  const canSave = name.trim().length > 0 && Number(totalServings) > 0 && !saving;

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      let id = recipeId;
      if (!id) {
        id = await createRecipe(userId, {
          name: name.trim(),
          totalServings: Number(totalServings),
          notes: notes.trim() || null,
        });
      } else {
        await updateRecipe(userId, id, {
          name: name.trim(),
          totalServings: Number(totalServings),
          notes: notes.trim() || null,
        });
      }
      await setRecipeIngredients(userId, id, ingredients.map((ing) => ({
        id: ing.id,
        food_ref: ing.food_ref,
        quantity_g: ing.quantity_g,
      })));
      navigation.goBack();
    } catch (_e) {
      toast.show('Couldn\'t save. Try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipeId ? 'Edit recipe' : 'New recipe'}</Text>
        <TouchableOpacity onPress={onSave} disabled={!canSave} hitSlop={12} accessibilityRole="button" accessibilityState={{ disabled: !canSave }} accessibilityLabel="Save recipe">
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.section}>
          <Text style={styles.label}>Import from web</Text>
          <View style={styles.importRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={importUrl}
              onChangeText={setImportUrl}
              placeholder="Paste a recipe link"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!importing}
              accessibilityLabel="Recipe web address"
            />
            <TouchableOpacity
              onPress={onImportFromWeb}
              disabled={importing || importUrl.trim().length === 0}
              hitSlop={8}
              style={[
                styles.importBtn,
                (importing || importUrl.trim().length === 0) && styles.importBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: importing || importUrl.trim().length === 0 }}
              accessibilityLabel="Import from web"
            >
              <Text style={styles.importBtnText}>{importing ? 'Importing…' : 'Import'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.importHint}>
            We match each ingredient to a food and add a rough amount. Check the amounts after importing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sunday chilli"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
            autoFocus={!recipeId}
            accessibilityLabel="Name"
          />
        </View>

        <View style={styles.row2}>
          <View style={[styles.section, { flex: 1, marginRight: spacing.md }]}>
            <Text style={styles.label}>Total servings</Text>
            <TextInput
              style={styles.input}
              value={totalServings}
              onChangeText={setTotalServings}
              placeholder="4"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
              accessibilityLabel="Total servings"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            multiline
            accessibilityLabel="Notes"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.ingHeader}>
            <Text style={styles.label}>Ingredients</Text>
            <TouchableOpacity onPress={onPickIngredient} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add ingredient">
              <Text style={styles.addLink}>+ Add ingredient</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <Text style={styles.ingEmpty}>No ingredients yet. Add your first to watch the macros build up.</Text>
          ) : ingredients.map((ing, i) => (
            <View key={`${ing.food_ref}-${i}`} style={styles.ingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ingName} numberOfLines={1}>
                  {ing.food?.name ?? ing.food_ref}
                </Text>
                {ing.food?.brand ? (
                  <Text style={styles.ingBrand} numberOfLines={1}>{ing.food.brand}</Text>
                ) : null}
              </View>
              <TextInput
                style={styles.qtyInput}
                value={String(ing.quantity_g ?? 0)}
                onChangeText={(v) => onChangeQty(i, v)}
                keyboardType="decimal-pad"
                maxLength={5}
                accessibilityLabel={`${ing.food?.name ?? ing.food_ref} quantity in grams`}
              />
              <Text style={styles.qtyUnit}>g</Text>
              <TouchableOpacity onPress={() => onRemove(i)} hitSlop={8} style={{ marginLeft: spacing.sm }} accessibilityRole="button" accessibilityLabel={`Remove ${ing.food?.name ?? ing.food_ref}`}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.macros}>
          <Text style={styles.macrosTitle}>Per serving</Text>
          <View style={styles.macrosRow}>
            <MacroPill label={energyUnitLabel(energyUnit)} value={toEnergy(macros.perServing.kcal, energyUnit)} />
            <MacroPill label="P" value={`${macros.perServing.protein}g`} />
            <MacroPill label="C" value={`${macros.perServing.carbs}g`} />
            <MacroPill label="F" value={`${macros.perServing.fat}g`} />
          </View>
          <Text style={styles.macrosSub}>
            Whole recipe: {toEnergy(macros.total.kcal, energyUnit)} {energyUnitLabel(energyUnit)} · P {macros.total.protein}g · C {macros.total.carbs}g · F {macros.total.fat}g
          </Text>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MacroPill({ label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillVal}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, ...type.title },
  saveText: { color: colors.primary, ...type.bodyStrong },
  saveTextDisabled: { color: colors.textMuted },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  row2: { flexDirection: 'row', paddingHorizontal: spacing.lg },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    color: colors.textPrimary, fontSize: fontSize.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },

  importRow: { flexDirection: 'row', alignItems: 'center' },
  importBtn: {
    marginLeft: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: colors.background, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  importHint: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },

  ingHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addLink: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  ingEmpty: { color: colors.textMuted, fontSize: fontSize.sm, paddingVertical: spacing.md },
  ingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ingName: { color: colors.textPrimary, ...type.body },
  ingBrand: { color: colors.textMuted, ...type.caption, marginTop: spacing.xxs },
  qtyInput: {
    width: 64, textAlign: 'right',
    color: colors.textPrimary, fontSize: fontSize.md,
    backgroundColor: colors.surface, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
  },
  qtyUnit: { color: colors.textMuted, fontSize: fontSize.sm, marginLeft: spacing.xs },

  macros: { marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  macrosTitle: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  macrosRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  macrosSub: { color: colors.textMuted, ...type.num('caption') },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.sm,
  },
  pillVal: { color: colors.textPrimary, ...type.num('bodyStrong') },
  pillLabel: { color: colors.textMuted, ...type.caption, marginTop: spacing.xxs },
});
