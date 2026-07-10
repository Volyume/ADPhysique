/**
 * Sleep Debt — the running shortfall between what you needed and what you got
 * over recent nights. WHOOP confirms the field (NeedBreakdown.debt) and the
 * trend bands (High >45m, Moderate 30-45m, Low <30m) but its exact accumulation
 * is server-side, so this is a faithful rolling model:
 *
 *   carry = max(0, prevDebt + (needed_n − asleep_n))
 *
 * i.e. each shortfall night adds to debt; surplus nights pay it down; clamped at
 * 0 and capped so it can't run away. Sleep Debt then feeds back into Sleep Need
 * (the +debt term in computeSleepNeed).
 */

/** neededMin is the debt-free target for that night (baseline + strain - naps). */
export type SleepNightHistory = { neededMin: number; asleepMin: number };

const DEBT_CAP_MIN = 240; // never carry more than 4 h of debt

/**
 * Accumulate debt across nights oldest→newest. Returns the carried debt AFTER
 * the most recent night. Pass the trailing window (e.g. last 14 nights).
 */
export function sleepDebt(nights: SleepNightHistory[]): number {
  let debt = 0;
  for (const n of nights) {
    const deficit = n.neededMin - n.asleepMin; // +ve = short, −ve = surplus
    debt = Math.max(0, Math.min(DEBT_CAP_MIN, debt + deficit));
  }
  return Math.round(debt);
}
