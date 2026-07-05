export function deriveDiaryDayViewModel(entries, { readOnly = false } = {}) {
  const sourceEntries = Array.isArray(entries) ? entries : [];
  const viewEntries = readOnly ? sourceEntries.filter((e) => !e.is_planned) : sourceEntries;

  const slots = new Set();
  let kcal = 0, protein = 0, carbs = 0, fat = 0;

  for (const entry of viewEntries) {
    if (!entry.is_planned) continue;
    slots.add(entry.meal_slot);
    kcal += Number(entry.kcal) || 0;
    protein += Number(entry.protein_g) || 0;
    carbs += Number(entry.carbs_g) || 0;
    fat += Number(entry.fat_g) || 0;
  }

  return {
    viewEntries,
    plannedCount: slots.size,
    plannedTotals: (kcal || protein || carbs || fat)
      ? { kcal, protein_g: protein, carbs_g: carbs, fat_g: fat }
      : null,
  };
}
