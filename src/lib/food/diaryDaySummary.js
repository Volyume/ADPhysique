import { toEnergy, energyUnitLabel } from '../format';

function round(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function macroModel(key, label, logged, target) {
  const loggedG = round(logged);
  const targetG = target == null ? null : round(target);
  const remainingG = targetG == null ? null : targetG - loggedG;
  return { key, label, loggedG, targetG, remainingG };
}

function macroChip(macro) {
  if (macro.targetG == null) return `${macro.loggedG}g logged`;
  if (macro.remainingG > 0) return `${macro.remainingG}g left`;
  if (macro.remainingG < 0) return `${Math.abs(macro.remainingG)}g over`;
  return 'on plan';
}

export function buildDiaryDaySummary({
  rollup = null,
  targets = null,
  planned = null,
  entriesCount = 0,
  dayTypeLabel = null,
} = {}) {
  const loggedKcal = round(rollup?.kcal_total);
  const targetKcal = targets?.targetKcal == null ? null : round(targets.targetKcal);
  const remainingKcal = targetKcal == null ? null : targetKcal - loggedKcal;
  const plannedKcal = round(planned?.kcal);
  const macros = [
    macroModel('protein', 'Protein', rollup?.protein_g, targets?.proteinG),
    macroModel('carbs', 'Carbs', rollup?.carbs_g, targets?.carbsG),
    macroModel('fat', 'Fat', rollup?.fat_g, targets?.fatG),
  ];

  return {
    loggedKcal,
    targetKcal,
    remainingKcal,
    plannedKcal,
    entriesCount: round(entriesCount),
    dayTypeLabel: dayTypeLabel || null,
    macros,
  };
}

export function formatDiaryDaySummary(model, energyUnit = 'kcal') {
  const safe = model || buildDiaryDaySummary();
  const unit = energyUnitLabel(energyUnit);
  const logged = `${toEnergy(safe.loggedKcal, energyUnit)} ${unit} logged`;
  let primary = logged;
  if (safe.targetKcal != null) {
    const value = toEnergy(Math.abs(safe.remainingKcal), energyUnit);
    primary = safe.remainingKcal >= 0
      ? `${value} ${unit} left today`
      : `${value} ${unit} over today`;
  }

  const secondary = safe.entriesCount > 0
    ? `${safe.entriesCount} ${safe.entriesCount === 1 ? 'entry' : 'entries'} logged so far.`
    : 'Nothing logged yet.';

  const chips = [
    { key: 'logged', label: 'Logged', value: `${toEnergy(safe.loggedKcal, energyUnit)} ${unit}` },
    safe.targetKcal != null ? {
      key: 'target',
      label: safe.remainingKcal >= 0 ? 'Remaining' : 'Over',
      value: primary.replace(' today', ''),
    } : null,
    ...safe.macros.map((macro) => ({
      key: macro.key,
      label: macro.label,
      value: macroChip(macro),
    })),
    safe.plannedKcal > 0 ? {
      key: 'planned',
      label: 'Planned',
      value: `+${toEnergy(safe.plannedKcal, energyUnit)} ${unit} planned`,
    } : null,
    safe.dayTypeLabel ? { key: 'dayType', label: 'Day', value: safe.dayTypeLabel } : null,
  ].filter(Boolean);

  return { title: 'Nutrition summary', primary, secondary, chips };
}
