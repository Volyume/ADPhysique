/**
 * monthlyReport.js
 * Deterministic 30-day training report + a one-off 90-day "First Block" recap.
 *
 * Fills the celebration dead-zone between the daily home line and the
 * 365-day Year of Lifts: a recurring, free, shareable milestone that lands
 * inside the first-3-months churn window rather than after it.
 *
 * Pure function: same inputs -> same output, no side effects. Training-only,
 * so it is safe on the free tier (progress stats are free). British English,
 * no jargon, no em dashes.
 */

import { calculateTonnage } from './algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;

function isCompleted(w) {
  return !!(w && (w.isCompleted ?? w.is_completed ?? false));
}
function startedAt(w) {
  return w?.startedAt ?? w?.createdAt ?? w?.created_at ?? 0;
}

/**
 * @param {object} args
 * @param {Array}  args.workouts     all workouts (completed flag + started time)
 * @param {Array}  args.sets         all workout_sets in the window (for tonnage)
 * @param {number} [args.prCount]    PRs in the last 30 days (caller computes; the
 *                                   screen already has computePRsPerWeek)
 * @param {string} [args.units]      'kg' | 'lb'
 * @param {number} [args.now]
 * @returns {object|null} report, or null when there is not enough to celebrate
 */
export function buildMonthlyReport(args = {}) {
  const a = (args && typeof args === 'object') ? args : {};
  const workouts = Array.isArray(a.workouts) ? a.workouts : [];
  const sets = Array.isArray(a.sets) ? a.sets : [];
  const prCount = Number.isFinite(a.prCount) ? a.prCount : 0;
  const units = a.units === 'lb' ? 'lb' : 'kg';
  const now = Number.isFinite(a.now) ? a.now : Date.now();

  const completed = workouts.filter(isCompleted);
  if (completed.length === 0) return null;

  const earliest = completed.reduce((min, w) => Math.min(min, startedAt(w) || now), now);
  const daysCovered = Math.floor((now - earliest) / DAY_MS);

  const windowStart = now - 30 * DAY_MS;
  const monthWorkouts = completed.filter(w => startedAt(w) >= windowStart);
  const sessions = monthWorkouts.length;
  // Need at least a handful of sessions for a report to be worth showing.
  if (sessions < 3) return null;

  const trainingDays = new Set(
    monthWorkouts.map(w => Math.floor(startedAt(w) / DAY_MS)),
  ).size;

  const monthWorkoutIds = new Set(monthWorkouts.map(w => w.id));
  const monthSets = sets.filter(s => monthWorkoutIds.has(s.workoutId ?? s.workout_id));
  const tonnage = Math.round(calculateTonnage(monthSets) || 0);

  // The 90-day First Block recap is a one-off: it shows once the user has been
  // training for roughly a quarter, the first real milestone, framed warmly.
  const isFirstBlock = daysCovered >= 84 && daysCovered <= 100 && completed.length >= 12;

  const headline = isFirstBlock
    ? 'Your first block, done. This is the part most people never reach.'
    : sessions >= 12
      ? 'A full month of work. The consistency is the whole game.'
      : 'Solid month. Every session is in the bank.';

  return {
    isFirstBlock,
    title: isFirstBlock ? 'Your first block' : 'Your month in training',
    sessions,
    trainingDays,
    tonnageKg: tonnage,
    tonnageLabel: formatTonnage(tonnage, units),
    prs: prCount,
    daysCovered,
    headline,
  };
}

function formatTonnage(kg, units) {
  const unit = units === 'lb' ? 'lb' : 'kg';
  if (kg >= 1000) {
    const t = Math.round(kg / 100) / 10;
    return `${t.toLocaleString('en-GB')} t`;
  }
  return `${kg.toLocaleString('en-GB')} ${unit}`;
}
