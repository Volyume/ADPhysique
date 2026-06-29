/**
 * WHOOP sleep band thresholds + colours, lifted from the decompiled app's
 * trend-view breakdowns (confirmed against the founder's screenshots). Every
 * sleep contributor is classified Optimal / Sufficient / Poor (or High / Moderate
 * / Low) against these exact cutoffs and coloured to match WHOOP.
 *
 * Confirmed bands (Trend View "breakdown" rows):
 *   Sleep Performance  : Optimal >85, Sufficient 70-85, Poor <70
 *   Hours vs Needed    : Optimal >85, Sufficient 70-85, Poor <70
 *   Sleep Consistency  : Optimal 80+, Sufficient 70-79, Poor <70
 *   Sleep Efficiency   : Optimal 90+, Sufficient 80-89, Poor <80
 *   Restorative %      : High   >45, Sufficient 30-45, Low  <30
 *   Sleep Debt (mins)  : High   >45, Moderate   30-45, Low  <30   (lower is better)
 */

export type Band = 'optimal' | 'sufficient' | 'poor';

// WHOOP colours (colors.xml): positive/optimal green, concern/sufficient amber,
// alert/poor — WHOOP shows the sleep "poor" state in amber (#ffa722), reserving
// red for health alerts. Sufficient is a neutral grey.
export const bandColors: Record<Band, string> = {
  optimal: '#00F19F', // whoop_sleep_green
  sufficient: '#8A93A2', // neutral grey
  poor: '#FFA722', // concern amber
};

export const BAND_LABEL: Record<Band, string> = {
  optimal: 'Optimal',
  sufficient: 'Sufficient',
  poor: 'Poor',
};

/** Higher-is-better metric → band by two cutoffs (optimalMin inclusive lower edge). */
function bandHigherBetter(value: number, sufficientMin: number, optimalMin: number): Band {
  if (value >= optimalMin) return 'optimal';
  if (value >= sufficientMin) return 'sufficient';
  return 'poor';
}

export function performanceBand(pct: number): Band {
  // Optimal >85, Sufficient 70-85, Poor <70.
  return bandHigherBetter(pct, 70, 85.0001);
}

export function hoursVsNeededBand(pct: number): Band {
  return bandHigherBetter(pct, 70, 85.0001);
}

export function consistencyBand(pct: number): Band {
  // Optimal 80+, Sufficient 70-79, Poor <70.
  return bandHigherBetter(pct, 70, 80);
}

export function efficiencyBand(pct: number): Band {
  // Optimal 90+, Sufficient 80-89, Poor <80.
  return bandHigherBetter(pct, 80, 90);
}

export function restorativeBand(pct: number): Band {
  // High >45 (optimal), Sufficient 30-45, Low <30 (poor).
  return bandHigherBetter(pct, 30, 45.0001);
}

/** Sleep debt (minutes) — LOWER is better. High >45, Moderate 30-45, Low <30. */
export function debtBand(minutes: number): Band {
  if (minutes > 45) return 'poor';
  if (minutes >= 30) return 'sufficient';
  return 'optimal';
}

/**
 * "High Sleep Stress" contributor — the share of the night spent in the HIGH
 * stress band, lower is better. WHOOP's exact contributor cutoffs are server-side
 * and NOT in the APK, so these are our own sensible bands (documented, not
 * presented as WHOOP-confirmed): Optimal <10%, Sufficient 10-25%, Poor >25%.
 */
export function highStressBand(pct: number): Band {
  if (pct < 10) return 'optimal';
  if (pct <= 25) return 'sufficient';
  return 'poor';
}
