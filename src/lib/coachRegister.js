/**
 * coachRegister.js — persona-adaptive coaching register + opt-in science
 * layer (deep audit 2026-06-12, Theme C: C1 + C2; founder decision #2).
 *
 * Contract: docs/COACHING_VOICE_SYNTHESIS_LOCKED.md, Addendum 2026-06-12.
 * This is a RENDERING layer over coachResponse.js, never a second engine:
 * both registers render the SAME facts and the SAME decision from the same
 * deterministic weekly output. Only the prose shape differs.
 *
 *  - Supportive (default, beginner-safe): the existing coachResponse.js
 *    strings, unchanged. Warmer connective prose, plainer terms.
 *  - Precise: denser, figure-led, terser. Labels and numbers lead
 *    ("Sessions: 4 of 4."); connective prose drops away. No new jargon
 *    enters via this register; every string passes the same blocklist.
 *
 * Selection: an explicit user preference (coachTone: 'supportive' |
 * 'precise' | 'automatic', default automatic) always wins. Automatic keys
 * off the profile's experience signals (experienceLevel, trainingAgeYears)
 * and defaults beginner-safe whenever the signal is missing or ambiguous.
 *
 * SAFETY CARVE-OUT (register-blind): under suppression (open ED/wellbeing
 * flag or calm mode) the supportive rendering is returned UNTOUCHED whatever
 * the register or preference. Safety holds, lockout copy and every
 * suppression branch render identically in all registers. Part 3 (the
 * decision) is also register-blind always: its reason strings are locked
 * copy (safety holds reuse them verbatim) and the calorie call is already
 * figure-led.
 *
 * The opt-in science layer (C2) lives here too: `withScience` renders the
 * technical term in brackets AFTER the plain term ("weekly target range
 * (MEV to MRV)") only when the explicit preference is on; the plain term
 * always leads and the technical term never appears alone.
 * `checkJargonScienceOn` is the parallel allowance path: copy OUTSIDE
 * brackets must still pass the full blocklist, so the science-OFF
 * `checkJargon` path is never weakened.
 *
 * Pure functions only. No side effects, no DB, no I/O, no randomness.
 */

import { checkJargon } from './whyThisTemplates';
import { buildCoachResponse, preCommitmentFacts, commitmentOutcomeFacts } from './coachResponse';

// ---------------------------------------------------------------------------
// Guards (same pattern as coachResponse.clean)
// ---------------------------------------------------------------------------

function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const { clean: ok, violations } = checkJargon(str);
    if (!ok) {
      throw new Error(`Jargon detected in coach register: "${violations.join(', ')}" in: "${str}"`);
    }
    if (/[–—]/.test(str)) {
      throw new Error(`Em or en dash detected in coach register: "${str}"`);
    }
  }
  return str.trim();
}

// ---------------------------------------------------------------------------
// Register selection
// ---------------------------------------------------------------------------

export const TONE_PREFERENCES = Object.freeze(['automatic', 'supportive', 'precise']);

/**
 * Resolve the rendering register from the explicit preference + the
 * profile's experience signals. Beginner-safe by construction: only an
 * explicit 'precise' preference or an unambiguous experienced-lifter
 * signal selects precise; everything else (missing, junk, mixed signals)
 * lands supportive.
 *
 * Automatic rules:
 *  - experienceLevel 'advanced' or 'competitive'  -> precise
 *  - experienceLevel 'beginner' or 'intermediate' -> supportive (the
 *    user's own self-identification outranks training age)
 *  - experienceLevel missing: trainingAgeYears >= 5 -> precise, else
 *    supportive
 */
export function resolveRegister({ coachTone = 'automatic', experienceLevel = null, trainingAgeYears = null } = {}) {
  if (coachTone === 'supportive') return 'supportive';
  if (coachTone === 'precise') return 'precise';
  // Automatic (and any unknown preference value falls through to here).
  if (experienceLevel === 'advanced' || experienceLevel === 'competitive') return 'precise';
  if (experienceLevel === 'beginner' || experienceLevel === 'intermediate') return 'supportive';
  if (experienceLevel == null && Number.isFinite(trainingAgeYears) && trainingAgeYears >= 5) return 'precise';
  return 'supportive';
}

// ---------------------------------------------------------------------------
// Precise renderers — figure-led counterparts of the coachResponse parts.
//
// Each mirrors its supportive builder's branch ladder EXACTLY (the parity
// invariant tests in coachRegister.test.js fail if the ladders drift).
// They are only ever reached when output exists and suppression is off:
// buildRegisteredCoachResponse returns the supportive base untouched in
// every suppressed path, so no `suppress` parameter exists here at all.
// ---------------------------------------------------------------------------

function preciseAcknowledgement({ sessionsCompleted, sessionsPlanned, prsThisWeek, weighInsThisWeek, checkin }) {
  const completed = Number.isFinite(sessionsCompleted) ? sessionsCompleted : 0;
  const planned = Number.isFinite(sessionsPlanned) ? sessionsPlanned : 0;
  const prs = Number.isFinite(prsThisWeek) ? prsThisWeek : 0;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;

  const prClause = prs > 0 ? ` PRs: ${prs}.` : '';

  let sessionSentence = null;
  if (planned > 0 && completed >= planned) {
    sessionSentence = `Sessions: ${planned} of ${planned}.${prClause}`;
  } else if (completed >= 1 && planned > 0) {
    sessionSentence = `Sessions: ${completed} of ${planned}.${prClause}`;
  } else if (completed >= 1) {
    sessionSentence = `Sessions: ${completed}.${prClause}`;
  }

  if (sessionSentence) {
    if (weighIns != null && weighIns >= 5) {
      return clean(`${sessionSentence} Weigh-ins: ${weighIns}.`);
    }
    return clean(sessionSentence);
  }

  if (weighIns != null && weighIns >= 3) {
    return clean(`Weigh-ins: ${weighIns}. Enough data for a trend read.`);
  }

  if (checkin) {
    const e = checkin.energyScore;
    if (e != null) return clean(`Check-in logged. Energy: ${e} of 5.`);
    return clean('Check-in logged.');
  }

  // T8: a fully quiet week is acknowledged calmly, never as a failure. This
  // path is reached only with suppression off (see the register-blind path in
  // the resolver), so no flag gate is needed here.
  if (completed === 0) {
    return clean('A quieter week. Your plan is ready when you are.');
  }

  return null;
}

function onTargetStreak(currentOnTarget, history) {
  if (!currentOnTarget) return 0;
  let streak = 1;
  for (const entry of Array.isArray(history) ? history : []) {
    if (entry?.trend?.onTarget === true) streak += 1;
    else break;
  }
  return streak;
}

function preciseInterpretation({ output, history, units }) {
  const trend = output?.trend ?? null;
  const delta = Number.isFinite(trend?.delta) ? trend.delta : null;

  if (delta == null) {
    return clean('Weigh-ins: too few for a weekly read. Daily logs sharpen it.');
  }

  const u = units === 'lbs' ? 'lbs' : 'kg';
  const abs = Math.abs(delta);
  const lead = abs <= 0.01
    ? '7-day average: level with last week.'
    : `7-day average: ${delta > 0 ? 'up' : 'down'} ${abs} ${u} on last week.`;

  let verdict;
  if (trend?.onTarget) {
    const streak = onTargetStreak(true, history);
    verdict = streak >= 2
      ? `Week ${streak} running on the set rate.`
      : 'On the set rate for this phase.';
  } else {
    verdict = 'Off the set rate for this phase.';
  }

  return clean(`${lead} ${verdict}`);
}

function preciseCue({ output, checkin, weighInsThisWeek }) {
  const trend = output?.trend ?? null;
  const delta = Number.isFinite(trend?.delta) ? trend.delta : null;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;
  const sessionsCompleted = Number.isFinite(output?.sessionsCompleted) ? output.sessionsCompleted : 0;
  const sessionsPlanned = Number.isFinite(output?.sessionsPlanned) ? output.sessionsPlanned : 0;
  const sleepHours = checkin?.sleepHours ?? null;
  const cals = checkin?.calsAdherence ?? null;

  // 1. Thin weigh-in data.
  if (delta == null || (weighIns != null && weighIns < 4)) {
    return clean('Log morning weight daily. Each log sharpens the read.');
  }
  // 2. Sleep.
  if (sleepHours != null && sleepHours < 6.5) {
    return clean('Sleep: under target. Aim for 7 hours or more a night.');
  }
  // 3. Sessions.
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return clean(`Sessions: ${sessionsCompleted} of ${sessionsPlanned}. Get all ${sessionsPlanned} in this week.`);
  }
  // 4. Joint pain.
  if (checkin?.jointPain) {
    return clean('Joint flagged. Swap any movement that aggravates it for a pain-free option.');
  }
  // 5. Untracked calories.
  if (cals === 'untracked') {
    return clean('Food logs: missing. The calorie target only tunes against real intake.');
  }
  // 6. Calorie adherence off target.
  if (cals === 'under') {
    return clean('Intake: under target. Eat to the target, not under it.');
  }
  if (cals === 'over') {
    return clean('Intake: over target. Hold inside it this week.');
  }
  // 7. Default.
  return clean('Hold the week steady: log, train, eat to the target, weigh in.');
}

function preciseForward({ output, weighInsThisWeek, checkinDayName }) {
  const opener = checkinDayName ? `Next check-in: ${checkinDayName}.` : 'Next check-in: as scheduled.';

  const sessionsCompleted = Number.isFinite(output?.sessionsCompleted) ? output.sessionsCompleted : 0;
  const sessionsPlanned = Number.isFinite(output?.sessionsPlanned) ? output.sessionsPlanned : 0;
  const calorieChange = output?.adjustments?.calories?.change ?? 0;
  const delta = Number.isFinite(output?.trend?.delta) ? output.trend.delta : null;
  const weighIns = Number.isFinite(weighInsThisWeek) ? weighInsThisWeek : null;

  let tail;
  if (calorieChange !== 0) {
    tail = 'Next read: trend against the new target.';
  } else if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    tail = 'Sessions in, and the next read shows it.';
  } else if (delta == null || (weighIns != null && weighIns < 4)) {
    tail = 'Daily weigh-ins sharpen the next read.';
  } else {
    tail = 'The next read takes it from there.';
  }

  return clean(`${opener} ${tail}`);
}

// S1c precise renderers. Same facts (shared preCommitmentFacts /
// commitmentOutcomeFacts), figure-led prose; they self-null on the same facts
// as the supportive builders, so structural parity holds.
function precisePreCommitment({ output, checkinDayName }) {
  const facts = preCommitmentFacts(output);
  if (!facts) return null;
  const what = facts.clamped ? "this week's calorie change" : `the ${facts.amount} kcal ${facts.direction}`;
  const when = checkinDayName ? `Next ${checkinDayName}` : 'Next read';
  return clean(`${when}: does the trend respond to ${what}.`);
}

function preciseCommitmentAnswer({ output, history, weekStartMs }) {
  const facts = commitmentOutcomeFacts({ output, history, weekStartMs });
  if (!facts) return null;
  const label = facts.clamped ? 'Last calorie change' : `Last ${facts.amount} kcal ${facts.direction}`;
  const verdict = facts.onTarget ? 'trend responded, back on rate.' : 'no response yet, off rate.';
  return clean(`${label}: ${verdict}`);
}

// ---------------------------------------------------------------------------
// Public API — the registered five-part response
// ---------------------------------------------------------------------------

/**
 * buildCoachResponse, rendered in the resolved register.
 *
 * Takes the exact buildCoachResponse args plus the register inputs
 * ({ coachTone, experienceLevel, trainingAgeYears }). Returns the same
 * shape plus `register`, the register actually RENDERED (under suppression
 * this is always 'supportive', whatever was resolved: the safety carve-out
 * is register-blind).
 *
 * Structural parity is guaranteed by construction: a precise part renders
 * only where the supportive part rendered (same nullness, same cold-start
 * shrink), and part 3 (the decision) is carried over byte-identical.
 */
export function buildRegisteredCoachResponse({
  coachTone = 'automatic',
  experienceLevel = null,
  trainingAgeYears = null,
  ...args
} = {}) {
  const base = buildCoachResponse(args);
  const register = resolveRegister({ coachTone, experienceLevel, trainingAgeYears });

  // Register-blind paths: suppression, no output, or supportive resolved.
  if (base.suppressed || !args.output || register !== 'precise') {
    return { ...base, register: 'supportive' };
  }

  const { output, checkin = null, history = [], weighInsThisWeek = null, units = 'kg', checkinDayName = null, weekStartMs = null } = args;

  return {
    acknowledgement: base.acknowledgement != null
      ? preciseAcknowledgement({
        sessionsCompleted: output.sessionsCompleted,
        sessionsPlanned: output.sessionsPlanned,
        prsThisWeek: output.prsThisWeek,
        weighInsThisWeek,
        checkin,
      })
      : null,
    interpretation: base.interpretation != null
      ? preciseInterpretation({ output, history, units })
      : null,
    decision: base.decision, // register-blind always (locked reason strings)
    cue: base.cue != null
      ? preciseCue({ output, checkin, weighInsThisWeek })
      : null,
    forward: base.forward != null
      ? preciseForward({ output, weighInsThisWeek, checkinDayName })
      : null,
    preCommitment: base.preCommitment != null
      ? precisePreCommitment({ output, checkinDayName })
      : null,
    commitmentAnswer: base.commitmentAnswer != null
      ? preciseCommitmentAnswer({ output, history, weekStartMs })
      : null,
    suppressed: base.suppressed,
    register: 'precise',
  };
}

// ---------------------------------------------------------------------------
// C2 — opt-in science layer
// ---------------------------------------------------------------------------

/**
 * Render a plain term with its technical term bracketed after it, only on
 * an explicit science opt-in. The plain term always leads; the technical
 * term never appears alone. With the preference off (the default) the
 * plain term passes through untouched, so nothing changes anywhere.
 *
 * withScience('weekly target range', 'MEV to MRV', true)
 *   -> 'weekly target range (MEV to MRV)'
 */
export function withScience(plainTerm, technicalTerm, showScience = false) {
  const plain = String(plainTerm ?? '').trim();
  // No plain term means no output at all: the technical term may never
  // appear alone, even on an opted-in surface.
  if (!plain || !showScience) return plain;
  const tech = String(technicalTerm ?? '').trim();
  if (!tech) return plain;
  return `${plain} (${tech})`;
}

/**
 * The parallel allowance path for science-ON copy: every character OUTSIDE
 * round brackets must still pass the full jargon blocklist (and the em/en
 * dash ban applies everywhere, brackets included). The science-OFF
 * `checkJargon` is untouched and never weakened; this is a separate check
 * used only on explicit opt-in surfaces.
 *
 * @returns {{ clean: boolean, violations: string[] }}
 */
export function checkJargonScienceOn(str) {
  const s = String(str ?? '');
  if (/[–—]/.test(s)) {
    return { clean: false, violations: ['em or en dash'] };
  }
  // Strip bracketed segments (non-nested, the only form withScience emits),
  // then run the full blocklist over what remains.
  const outside = s.replace(/\([^()]*\)/g, ' ');
  return checkJargon(outside);
}
