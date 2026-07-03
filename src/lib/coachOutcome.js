/**
 * coachOutcome.js — S1 "give the coach a memory" (pure, no I/O).
 *
 * Pairs each week's APPLIED coaching decision with the FOLLOWING week's trend
 * verdict, turning the decision log into an honest track record: the outcome
 * loop ("Applied - on target the following week") and the scorecard ("weeks you
 * applied the call and the next trend landed on target: N of M").
 *
 * Honesty rules baked in here:
 *  - a decision is only verdicted against the CALENDAR-consecutive next week
 *    (~7 days later; the tolerance absorbs DST), never an array-adjacent week
 *    across a gap in history (a missed check-in / reinstall), so a verdict is
 *    never misattributed to the wrong decision;
 *  - the newest week has no following week yet, so it is never paired;
 *  - the scorecard hides below MIN_SCORECARD_SAMPLE so too small a sample never
 *    reads as a boast or an accusation.
 *
 * Deterministic. Suppression under an ED flag / calm mode is the CALLER's job
 * (the screen passes [] / null when suppressed); it is never softened here.
 */

import { isApplied } from './coachApply';

const DAY_MS = 86400000;
const DOMAINS = ['calories', 'training', 'steps'];

// Founder call 2026-07-03: show the scorecard from 2 reviewed weeks (earlier
// payoff; a 2-week sample is the accepted floor).
export const MIN_SCORECARD_SAMPLE = 2;

/** The first applied-adjustment domain for a coach-output week, else null. */
export function appliedDomain(week) {
  if (!week) return null;
  for (const key of DOMAINS) {
    if (isApplied(week, key)) return key;
  }
  return null;
}

/**
 * Pair each applied decision with the following week's verdict.
 * @param {object[]} historyDesc  getCoachOutputHistory order (most-recent-first)
 * @returns {{weekStart:number, domain:string, verdictWeekStart:number, onTarget:boolean}[]}
 */
export function pairAppliedWithOutcome(historyDesc = []) {
  const chrono = Array.isArray(historyDesc) ? [...historyDesc].reverse() : []; // oldest-first
  const pairs = [];
  for (let i = 0; i < chrono.length - 1; i++) {
    const week = chrono[i];
    const next = chrono[i + 1];
    const domain = appliedDomain(week);
    if (!domain) continue;
    if (typeof next?.trend?.onTarget !== 'boolean') continue;
    if (!Number.isFinite(week?.weekStart) || !Number.isFinite(next?.weekStart)) continue;
    // Only verdict against the calendar-consecutive next week (~7 days; the
    // 6-8 day window absorbs a DST hour). A real gap in history is never used.
    const gap = next.weekStart - week.weekStart;
    if (gap < 6 * DAY_MS || gap > 8 * DAY_MS) continue;
    pairs.push({
      weekStart: week.weekStart,
      domain,
      verdictWeekStart: next.weekStart,
      onTarget: next.trend.onTarget,
    });
  }
  return pairs;
}

/** The scorecard count, or null below the minimum sample. */
export function buildScorecard(historyDesc = []) {
  const pairs = pairAppliedWithOutcome(historyDesc);
  if (pairs.length < MIN_SCORECARD_SAMPLE) return null;
  return { onTarget: pairs.filter((p) => p.onTarget).length, of: pairs.length };
}
