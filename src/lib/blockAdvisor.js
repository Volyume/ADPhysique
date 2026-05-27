/**
 * blockAdvisor.js
 *
 * Synthesises performance, readiness, and time signals into a single
 * block-transition recommendation.
 *
 * Design philosophy (from three-report research synthesis):
 *   - A block ending is NOT a programme change. Default is always:
 *     recovery week → same programme, refreshed.
 *   - Programme changes only happen when DATA signals it, not time.
 *   - The hierarchy (least → most disruptive):
 *       1. Continue current block
 *       2. Prepare for recovery week (early heads-up)
 *       3. Enter recovery week now (early deload)
 *       4. After recovery → same programme (default)
 *       5. After recovery → same programme, adjusted loads/volume
 *       6. After recovery → swap exercise variants
 *       7. After recovery → full rebuild (coach-prompted, never auto)
 *   - Deloads are "reloading the gun", performance-enabling, not corrective.
 *   - The Banister fitness-fatigue model is NOT used (no hypertrophy validation).
 *   - All decisions are proposed to the user, never auto-executed.
 *
 * Inputs required:
 *   - recentCheckins: last 8 weekly check-ins (from getRecentCheckins)
 *   - activeBlock:    current mesocycle row (from getActiveBlock)
 *   - userProfile:    { experience, trainingFreq, goal, firstName }
 *   - blockHistory:   array of past blocks for this user (optional, for stagnation)
 */

import { getRecentCheckins } from './database';
import { getBlockStatus } from './mesocycle';

// ---------------------------------------------------------------------------
// Readiness computation
// ---------------------------------------------------------------------------

/**
 * Maps a single check-in row to a 0–100 readiness score.
 * Higher = better recovered and ready to train hard.
 *
 * energy_score:   1–5  (1=very low, 5=excellent)
 * soreness_score: 1–5  (1=none, 5=very high), inverted
 * sleep_hours:    real, clipped 4–9h range
 */
function checkinReadiness(c) {
  if (!c) return null;
  const energy  = (((c.energyScore  ?? 3) - 1) / 4) * 100;           // 0–100
  const soreness = (1 - ((c.sorenessScore ?? 3) - 1) / 4) * 100;     // inverted 0–100
  const sleep    = Math.min(Math.max(((c.sleepHours ?? 7) - 4) / 5, 0), 1) * 100; // 4–9h → 0–100
  return energy * 0.4 + soreness * 0.4 + sleep * 0.2;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function zScore(value, baseline) {
  const sd = stdDev(baseline);
  if (sd === 0 || baseline.length < 2) return 0;
  return (value - mean(baseline)) / sd;
}

// ---------------------------------------------------------------------------
// Signal detection
// ---------------------------------------------------------------------------

/**
 * Returns an array of detected signals from check-in history.
 * Each signal: { type, severity: 'info'|'medium'|'high', label, data }
 */
function detectSignals(checkins) {
  const signals = [];
  if (!checkins.length) return signals;

  const latest = checkins[0];
  const recentTwo = checkins.slice(0, 2);

  // ── Acute low energy ──────────────────────────────────────────────────────
  const energy = latest.energyScore ?? 3;
  if (energy <= 1) {
    signals.push({ type: 'energy', severity: 'high', label: 'Very low energy this week', data: energy });
  } else if (energy <= 2) {
    signals.push({ type: 'energy', severity: 'medium', label: 'Energy lower than usual', data: energy });
  }

  // ── Persistent high soreness ──────────────────────────────────────────────
  // "Carrying over" needs TWO consecutive high readings to be true. A single
  // first-ever check-in with high soreness is a snapshot, not a pattern, and
  // shouldn't be labelled as carrying over from anything. Promote to high
  // only when we can actually see the carry-over in the data.
  const soreness = latest.sorenessScore ?? 3;
  const prevSoreness = checkins[1]?.sorenessScore ?? null;
  if (soreness >= 4 && prevSoreness !== null && prevSoreness >= 4) {
    signals.push({ type: 'soreness', severity: 'high', label: 'High soreness carrying over into sessions', data: soreness });
  } else if (soreness >= 4) {
    signals.push({ type: 'soreness', severity: 'medium', label: 'Soreness higher than normal this week', data: soreness });
  }

  // ── Low sleep ─────────────────────────────────────────────────────────────
  const sleep = latest.sleepHours ?? 7;
  if (sleep < 5.5) {
    signals.push({ type: 'sleep', severity: 'high', label: `Sleep averaging ${sleep.toFixed(1)}h. Recovery is compromised.`, data: sleep });
  } else if (sleep < 6.5) {
    signals.push({ type: 'sleep', severity: 'medium', label: 'Sleep below recommended for training recovery', data: sleep });
  }

  // ── Readiness z-score vs. 8-week personal baseline ───────────────────────
  // Use the latest reading vs. weeks 2-8 as the baseline
  const readinessScores = checkins.map(checkinReadiness).filter(r => r !== null);
  const latestR = readinessScores[0];
  const baselineR = readinessScores.slice(2, 8);
  if (latestR !== null && baselineR.length >= 2) {
    const z = zScore(latestR, baselineR);
    if (z <= -1.5) {
      signals.push({ type: 'readiness_drop', severity: 'high', label: 'Readiness well below your personal baseline', data: Math.round(z * 10) / 10 });
    } else if (z <= -1.0) {
      signals.push({ type: 'readiness_drop', severity: 'medium', label: 'Readiness a bit below your recent average', data: Math.round(z * 10) / 10 });
    }
  }

  // ── Consecutive poor check-ins ────────────────────────────────────────────
  const recentPoorCount = recentTwo.filter(c => {
    const r = checkinReadiness(c);
    return r !== null && r < 45;
  }).length;
  if (recentPoorCount >= 2) {
    signals.push({ type: 'sustained_fatigue', severity: 'high', label: 'Recovery has been low for 2 weeks in a row' });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Next-block recommendation (post-recovery hierarchy)
// ---------------------------------------------------------------------------

/**
 * Determines what should happen after the recovery week.
 * Default is always: same programme, go again.
 * Changes only triggered by sustained signals over multiple blocks.
 *
 * @param {Array}  checkins    - recent weekly check-ins
 * @param {Object} userProfile - { experience, goal }
 * @param {Array}  signals     - detected signals
 * @returns {{ recommendation, headline, body, actionLabel, secondaryLabel }}
 */
function buildNextBlockRecommendation(checkins, userProfile, signals) {
  const highSignals = signals.filter(s => s.severity === 'high');
  const experience  = userProfile?.experience ?? 'intermediate';

  // Count persistent performance/fatigue signals
  // Simplified: if this block had consistently poor readiness, suggest minor adjustment
  const allReadiness = checkins.map(checkinReadiness).filter(r => r !== null);
  const avgReadiness = allReadiness.length ? mean(allReadiness) : 70;

  // Default: same programme
  if (highSignals.length === 0 && avgReadiness >= 60) {
    return {
      recommendation: 'repeat',
      headline: 'Go again: same programme',
      body: "Your recovery week does its job, then you pick up where you left off. Same exercises, same structure. You'll come back a little stronger each block.",
      actionLabel: 'Continue this programme',
      secondaryLabel: 'Build a new programme',
    };
  }

  // Minor adjustment: loads or sets tweaked, same structure
  if (highSignals.length <= 1 || avgReadiness >= 50) {
    return {
      recommendation: 'adjust',
      headline: 'Same programme, slightly adjusted',
      body: "The structure is working. After your recovery week, you'll restart the same programme with a small volume or load adjustment based on how this block went.",
      actionLabel: 'Continue with adjustments',
      secondaryLabel: 'Build a new programme',
    };
  }

  // Suggest rebuild only when signals are consistently poor
  return {
    recommendation: 'consider_rebuild',
    headline: 'Might be worth a fresh look',
    body: "Fatigue has been consistently high this block. After your recovery week, it's worth reviewing whether the programme volume or exercise selection still fits where you are. The coach can help rebuild it.",
    actionLabel: 'Continue this programme',
    secondaryLabel: 'Review with coach',
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns a block advice object for the current state.
 *
 * @param {string} userId
 * @param {Object|null} activeBlock  - from getActiveBlock(); has startDate, plannedWeeks, etc.
 * @param {Object} userProfile       - from useAppStore; { experience, goal, firstName }
 * @returns {Promise<BlockAdvice>}
 *
 * BlockAdvice shape:
 * {
 *   action:    'continue' | 'heads_up' | 'early_deload' | 'in_recovery' | 'post_recovery'
 *   headline:  string, short coaching statement
 *   body:      string, plain English, uses user's own data
 *   signals:   [{ type, severity, label }]
 *   nextBlock: null | { recommendation, headline, body, actionLabel, secondaryLabel }
 *   blockStatus: null | { status, currentWeek, totalWeeks, ... }
 * }
 */
export async function getBlockAdvice(userId, activeBlock, userProfile) {
  const [checkins] = await Promise.all([
    getRecentCheckins(userId, 8).catch(() => []),
  ]);

  const blockStatus = activeBlock
    ? getBlockStatus(
        activeBlock.startDate ?? activeBlock.createdAt ?? Date.now(),
        activeBlock.plannedWeeks ?? 5,
      )
    : null;

  const signals = detectSignals(checkins);
  const highSignals   = signals.filter(s => s.severity === 'high');
  const mediumSignals = signals.filter(s => s.severity === 'medium');
  const firstName     = userProfile?.firstName ? `, ${userProfile.firstName}` : '';
  const experience    = userProfile?.experience ?? 'intermediate';

  // ── In recovery week ──────────────────────────────────────────────────────
  if (blockStatus?.status === 'recovery') {
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals);
    return {
      action: 'in_recovery',
      headline: 'Recovery week is active',
      body: `Keep sessions lighter. Roughly half the sets, same exercises, easy effort. This isn't stepping back; it's letting the adaptations from the last few weeks land. You'll come back to full training next week.`,
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // ── Block complete / overdue ──────────────────────────────────────────────
  if (blockStatus?.status === 'complete' || blockStatus?.status === 'overdue') {
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals);
    const overdueWeeks = blockStatus.weeksOverdue;
    return {
      action: 'post_recovery',
      headline: overdueWeeks > 0
        ? `Recovery week passed ${overdueWeeks} week${overdueWeeks > 1 ? 's' : ''} ago`
        : 'Block complete',
      body: overdueWeeks > 0
        ? `Your recovery week has come and gone. The sooner you start the next block, the better. Your body is ready.`
        : `You've finished this block. Take your recovery week, then pick up the plan again.`,
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // ── Active block, check for early deload triggers ────────────────────────

  // Masters lifters (age ≥40) recover more slowly from accumulated training
  // stress (Sullivan & Baker; Rippetoe; Hayes et al. 2023, older adults show
  // longer strength-recovery timelines and lower productive-volume ceilings).
  // Drop the deload trigger from 2 high signals to 1, and the heads-up from
  // 2 medium signals to 1, so the same recovery state surfaces a week earlier.
  const isMasters = (userProfile?.age ?? 0) >= 40;
  const deloadHighThreshold  = isMasters ? 1 : 2;
  const headsUpMediumThreshold = isMasters ? 1 : 2;

  // Strong deload trigger: enough high signals OR sustained fatigue.
  // Gated on enough history to be a pattern rather than a single bad day.
  // A user one week into their first block, with one check-in entered on
  // enrolment day, shouldn't be told to drop their sets in half. That
  // recommendation is for accumulated fatigue, which requires at least
  // two weeks of check-ins and a block that's been running long enough
  // for fatigue to actually accumulate.
  const hasSustainedFatigue = signals.some(s => s.type === 'sustained_fatigue');
  const hasEnoughHistory = checkins.length >= 2 && (blockStatus?.currentWeek ?? 1) >= 2;
  if (hasEnoughHistory && (highSignals.length >= deloadHighThreshold || hasSustainedFatigue)) {
    const nextBlock = buildNextBlockRecommendation(checkins, userProfile, signals);
    return {
      action: 'early_deload',
      headline: 'Your body is asking for a lighter week',
      body: buildEarlyDeloadBody(signals, checkins[0], blockStatus),
      signals,
      nextBlock,
      blockStatus,
    };
  }

  // Moderate: heads-up, signals building
  if (highSignals.length >= 1 || mediumSignals.length >= headsUpMediumThreshold) {
    return {
      action: 'heads_up',
      headline: 'Keep an eye on recovery',
      body: buildHeadsUpBody(signals, blockStatus),
      signals,
      nextBlock: null,
      blockStatus,
    };
  }

  // All clear
  const weeksLeft = blockStatus
    ? blockStatus.recoveryWeek - blockStatus.currentWeek
    : null;

  return {
    action: 'continue',
    headline: blockStatus
      ? `Week ${blockStatus.currentWeek} of ${blockStatus.totalWeeks}`
      : 'On track',
    body: weeksLeft === 1
      ? `One more week before your recovery week. Push hard this week. It's your peak.`
      : weeksLeft === 0
        ? `This is your recovery week. Back off and let everything settle.`
        : `Training is going well. Stay on plan.`,
    signals,
    nextBlock: null,
    blockStatus,
  };
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

function buildEarlyDeloadBody(signals, latestCheckin, blockStatus) {
  const parts = [];

  const energySig  = signals.find(s => s.type === 'energy');
  const sorenessSig = signals.find(s => s.type === 'soreness');
  const sleepSig   = signals.find(s => s.type === 'sleep');
  const zSig       = signals.find(s => s.type === 'readiness_drop');

  if (energySig?.severity === 'high') parts.push('energy is very low');
  if (sorenessSig?.severity === 'high') parts.push('soreness is carrying over into sessions');
  if (sleepSig) parts.push(`sleep is below ${sleepSig.data?.toFixed(1) ?? '6'}h`);
  if (zSig?.severity === 'high') parts.push('your overall readiness is well below your normal baseline');

  const signalText = parts.length > 0
    ? `Your check-in shows ${parts.join(' and ')}. `
    : '';

  const weeksIn = blockStatus?.currentWeek ?? null;
  const timing = weeksIn
    ? `You're in week ${weeksIn}. `
    : '';

  return `${signalText}${timing}dropping your sets roughly in half this week while keeping the same exercises lets fatigue clear without losing any of the progress you've built. Think of it as reloading the gun.`;
}

function buildHeadsUpBody(signals, blockStatus) {
  const energySig   = signals.find(s => s.type === 'energy');
  const sorenessSig = signals.find(s => s.type === 'soreness');
  const recovDrop   = signals.find(s => s.type === 'readiness_drop');

  const weeksToRecovery = blockStatus
    ? blockStatus.recoveryWeek - blockStatus.currentWeek
    : null;

  const obs = [];
  if (energySig) obs.push('energy is a bit lower than usual');
  if (sorenessSig) obs.push('soreness is higher than normal');
  if (recovDrop) obs.push('your overall readiness has dipped');

  const obsText = obs.length ? `${obs.join(' and ')}. ` : '';

  const timing = weeksToRecovery !== null
    ? `Your recovery week is ${weeksToRecovery === 1 ? 'next week' : `${weeksToRecovery} weeks away`}. `
    : '';

  return `${obsText}${timing}Keep training as planned, focus on sleep and eating enough, and flag it next check-in if nothing has improved.`;
}
