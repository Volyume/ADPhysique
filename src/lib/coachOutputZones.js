// U-B-1 §3: pure hero / secondary / safety zoning for CoachOutputScreen.
//
// The hero is the engine's single top applyable decision, read from the
// engine-derived `output.primary.domain` (weeklyCoach §2). Everything else
// applyable collapses under "More adjustments"; the safety blocks are handled
// by the screen's always-visible zone and are never returned here. Kept pure so
// the zoning is unit-tested directly (no screen mount needed).
//
// Card kinds: 'training' (TrainingNextWeekCard — volume or deload row),
// 'nutrition' (NextWeekCard — calories/steps rows), 'dietBreak'
// (DietBreakCard). The 'macro' and 'refeed' kinds were retired with the
// carb-cycle and refeed cards under the one-daily-truth law (Campaign 17A).
//
// DietBreakCard is founder-confirmed as a safety block: it is the hero ONLY when
// it is the engine's top decision; otherwise the screen renders it in the
// always-visible safety zone — never in the collapsible secondary.
export function selectCoachOutputZones(output, { dietBreakSuggested = false } = {}) {
  const domain = output?.primary?.domain ?? null;

  let heroKind = null;
  if (domain === 'training' || domain === 'deload') heroKind = 'training';
  else if (domain === 'calories' || domain === 'steps') heroKind = 'nutrition';
  else if (domain === 'dietBreak' && dietBreakSuggested) heroKind = 'dietBreak';

  // The training and nutrition cards always render (they show a held/hold row
  // even when nothing changes), so each is a secondary candidate unless it is
  // the hero.
  const secondaryKinds = [];
  if (heroKind !== 'training') secondaryKinds.push('training');
  if (heroKind !== 'nutrition') secondaryKinds.push('nutrition');

  const dietBreakInSafety = dietBreakSuggested && heroKind !== 'dietBreak';

  return { heroKind, secondaryKinds, dietBreakInSafety };
}
