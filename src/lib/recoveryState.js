/**
 * recoveryState.js — Campaign 18 recovery-visibility amendment.
 *
 * THE DEFECT THIS CLOSES. Volyume makes training deliberately easier for two
 * fundamentally different reasons, and it recorded both in ONE boolean:
 *
 *   mesocycle_weeks.is_deload
 *
 * `generateMesocycleWeeks` sets it on the block's final week because that week
 * IS the planned recovery week. `setMesocycleWeekDeload` sets it on an
 * accumulation week because recovery evidence justified easing off now. By the
 * time any screen read that flag, WHY training was lighter had already been
 * thrown away - so the only honest thing a surface could say was a generic
 * "deload", and a perfectly-recovering athlete in their normal recovery week
 * risked being told their recovery had been poor.
 *
 * The distinguishing fact was never missing. `mesocycles.deload_week` records
 * the block's planned recovery POSITION, and it simply was not exposed
 * alongside the flag. This module reads the two together and nothing else.
 *
 * NO NEW RECOVERY ALGORITHM. Nothing here decides whether training should be
 * lighter, measures recovery, or reads a check-in. Every input is already
 * persisted by the engine that owns the decision; this only recovers the
 * provenance that the flattening lost.
 *
 * NO HARD-CODED WEEK NUMBER. The planned recovery week is wherever the BLOCK
 * says it is (`deloadWeek`, falling back to the last week), never a literal
 * six. A block whose length ever legitimately differs - an older persisted
 * block, or a future configuration - resolves correctly without a code change,
 * and an old block finishing under its own structure is described truthfully
 * rather than dressed up as the current default.
 *
 * PURE. No I/O, no clock.
 */

/**
 * Why training is what it is right now.
 *
 * NORMAL_ACCUMULATION           the hard-training part of the block.
 * PLANNED_BLOCK_RECOVERY        the block's own recovery week. STRUCTURAL: it
 *                               happens because the athlete reached it, not
 *                               because anything went wrong. Excellent
 *                               progression and good recovery do not cancel it.
 * ADAPTIVE_RECOVERY_ADJUSTMENT  still inside the accumulation portion, but
 *                               recovery evidence justified holding work back.
 */
export const RECOVERY_STATE = Object.freeze({
  NORMAL_ACCUMULATION: 'normal_accumulation',
  PLANNED_BLOCK_RECOVERY: 'planned_block_recovery',
  ADAPTIVE_RECOVERY_ADJUSTMENT: 'adaptive_recovery_adjustment',
});

const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/**
 * Where does this block's planned recovery week sit?
 *
 * The block's own `deloadWeek` when it has one, and the final week otherwise -
 * which is what `generateMesocycleWeeks` materialises when `deload_week` is
 * absent. Out-of-range values are ignored rather than trusted, because a
 * recovery position outside the block cannot be true of it.
 */
export function plannedRecoveryWeek({ plannedWeeks, deloadWeek } = {}) {
  const total = int(plannedWeeks);
  if (total == null || total < 2) return null;
  const stated = int(deloadWeek);
  if (stated != null && stated >= 1 && stated <= total) return stated;
  return total;
}

/**
 * THE resolver. Returns null when there is no live lighter-training question
 * to answer - no block, an unreadable block, or a block that has finished and
 * is waiting on the athlete's next-block decision. A null state means every
 * surface shows nothing, which is how the state ENDS: by the lifecycle moving
 * on, never by the user acknowledging a card.
 *
 * @param {object} p
 * @param {number} p.weekIndex     the block's TRUE current week (1-indexed)
 * @param {number} p.plannedWeeks  the block's own length
 * @param {number} [p.deloadWeek]  the block's own planned recovery position
 * @param {boolean} [p.isDeload]   the current week row's stored flag
 * @param {boolean} [p.awaitingDecision]  the block has finished
 * @returns {null | { state, because, weekIndex, plannedWeeks, recoveryWeek,
 *   weeksToRecovery }}
 */
export function resolveRecoveryState({
  weekIndex, plannedWeeks, deloadWeek = null,
  isDeload = false, awaitingDecision = false,
  // C18 BLOCK PROGRESSION. The planned recovery week is a PROGRAMME position,
  // not a calendar one: it may not become the active phase while a required
  // pre-recovery session is still outstanding. Supplied by
  // programmePosition.resolveProgrammePosition, which owns that question.
  //
  // Defaults TRUE so every existing caller stays byte-identical; only a caller
  // that has actually asked passes false. That default is safe because the
  // gate can only ever HOLD the structural state back, never create it.
  recoveryPhaseAllowed = true,
} = {}) {
  const recoveryWeek = plannedRecoveryWeek({ plannedWeeks, deloadWeek });
  const week = int(weekIndex);
  const total = int(plannedWeeks);
  if (recoveryWeek == null || week == null || week < 1) return null;
  // A finished block has no live week. Claiming one is the dishonesty the
  // block-status work removed, and a stale "Recovery week" banner after the
  // lifecycle moved on is the same error wearing a different hat.
  if (awaitingDecision) return null;

  const base = {
    weekIndex: week, plannedWeeks: total, recoveryWeek,
    weeksToRecovery: Math.max(0, recoveryWeek - week),
  };

  // POSITION IS THE AUTHORITY for planned recovery, not the flag. The flag is
  // true on this week either way, so reading it first would collapse the two
  // states again exactly as before.
  if (week >= recoveryWeek) {
    // The calendar has reached the recovery week, but the programme has not:
    // an accumulation session is still outstanding, so the athlete is still
    // in the hard part of the block whatever the dates say. Position beats
    // calendar - this is the founder-reported failure, where the app tried to
    // enter recovery with the final hard session unfinished.
    if (!recoveryPhaseAllowed) {
      return {
        ...base,
        state: RECOVERY_STATE.NORMAL_ACCUMULATION,
        because: 'accumulation_work_outstanding',
      };
    }
    return { ...base, state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY, because: 'block_recovery_week' };
  }
  // Inside the accumulation portion, the flag can only have been set by the
  // adaptive path: `setMesocycleWeekDeload`, which runs from the coach's
  // explicit recovery-driven apply and nowhere else.
  if (isDeload === true) {
    return {
      ...base,
      state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT,
      because: 'recovery_evidence',
    };
  }
  return { ...base, state: RECOVERY_STATE.NORMAL_ACCUMULATION, because: 'accumulation_week' };
}

/** Is training deliberately lighter right now, for either reason? */
export function isLighterTrainingState(resolved) {
  return resolved?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY
    || resolved?.state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT;
}

// ─── COPY ───────────────────────────────────────────────────────────────────
//
// PLAIN LANGUAGE. "Recovery week", "training is lighter for now". Nobody has
// to know the words deload, mesocycle, MEV, MRV or peak-week softening to
// understand what is happening to their training.
//
// NO FALSE CAUSE. The planned recovery week is never explained by recovery
// evidence, because it is not caused by any: it is where the block goes. And
// the adaptive state is never called a recovery week, because the hard part of
// the block has not finished.
//
// NO MEDICAL CLAIMS, no nervous systems and no overtraining. Fatigue comes
// down; that is all this app can honestly say.
//
// NO WEEK NUMBER in the explanation. "You have finished the hard-training part
// of this block" is true of a block of any length, so the sentence cannot rot
// if a block is ever configured differently or an older one is still running.

/** The Home / Today card. Null when nothing is deliberately lighter. */
export function recoveryStateCard(resolved) {
  if (!isLighterTrainingState(resolved)) return null;
  if (resolved.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY) {
    return {
      state: resolved.state,
      title: 'Recovery week',
      compactTitle: 'Recovery week',
      body: 'You have finished the hard-training part of this block. Training is lighter on purpose this week so fatigue can come down before you move on.',
      next: 'Once this recovery week is done, you choose what comes next. Nothing starts a new block on its own.',
      action: "See what's different",
    };
  }
  return {
    state: resolved.state,
    title: 'Training is lighter for now',
    compactTitle: 'Training adjusted for recovery',
    body: 'Your recent recovery has been harder, so we are holding back some of the workload for now.',
    next: 'Normal progression picks up again when your recovery supports it. The rest of the block is unchanged.',
    action: 'Why?',
  };
}

/** The short label a next-workout surface shows beside the session. */
export function nextWorkoutRecoveryLabel(resolved) {
  if (!isLighterTrainingState(resolved)) return null;
  return resolved.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY
    ? 'Recovery week'
    : 'Recovery-adjusted';
}

/**
 * The Train detail line, shown when a workout opens so the athlete knows why
 * the prescription differs from a normal hard week.
 *
 * `differences` are the prescription changes that are ACTUALLY true of this
 * session, supplied by the caller from the real prescription. Nothing is
 * assumed and nothing is listed by default: a claim about what changed must
 * come from what changed.
 */
export function trainRecoveryDetail(resolved, differences = []) {
  if (!isLighterTrainingState(resolved)) return null;
  const real = (Array.isArray(differences) ? differences : []).filter(Boolean);
  const planned = resolved.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
  const lead = planned
    ? 'Recovery week. This session is lighter on purpose, because you have finished the hard-training part of this block.'
    : 'Recovery-adjusted session. This one is lighter because your recent recovery has been harder.';
  if (!real.length) return lead;
  return `${lead} ${sentenceList(real)}`;
}

/**
 * What ACTUALLY differs between the session as normally prescribed and the
 * session as prescribed now.
 *
 * Read off the two prescriptions rather than assumed, because the founder's
 * rule is explicit: do not claim "everything is 50% lighter" unless that is
 * genuinely what the engine applied. Today's recovery prescription
 * (`generateDeloadPrescription`, first half) keeps the load and halves the
 * reps at RIR 4 - so "reduced loading" would be false on it, and saying so
 * would be the kind of plausible-sounding copy nobody checked.
 *
 * Returns plain phrases for `trainRecoveryDetail`, or [] when nothing
 * measurable changed. Pure; no percentages and no internal multipliers reach
 * the athlete.
 */
export function describePrescriptionDifferences(baselineSets = [], prescribedSets = []) {
  const base = Array.isArray(baselineSets) ? baselineSets.filter(Boolean) : [];
  const now = Array.isArray(prescribedSets) ? prescribedSets.filter(Boolean) : [];
  if (!base.length || !now.length) return [];
  const out = [];

  const workingBase = base.filter((s) => (s.setType ?? s.set_type ?? 'straight') !== 'warmup');
  if (workingBase.length && now.length < workingBase.length) out.push('fewer working sets');

  const avg = (rows, pick) => {
    const vals = rows.map(pick).map(Number).filter((n) => Number.isFinite(n));
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const baseReps = avg(workingBase, (s) => s.actualReps ?? s.actual_reps ?? s.reps);
  const nowReps = avg(now, (s) => s.reps);
  if (baseReps != null && nowReps != null && nowReps < baseReps) out.push('fewer reps per set');

  const baseWeight = avg(workingBase, (s) => s.weight);
  const nowWeight = avg(now, (s) => s.weight);
  if (baseWeight != null && nowWeight != null && nowWeight < baseWeight) out.push('lighter loads');

  const baseRir = avg(workingBase, (s) => s.rir);
  const nowRir = avg(now, (s) => s.rir);
  // A HIGHER RIR is an EASIER target: it stops the set further from failure.
  if (nowRir != null && (baseRir == null ? nowRir >= 3 : nowRir > baseRir)) {
    out.push('easier effort targets');
  }
  return out;
}

/** "a, b and c." with no Oxford comma, house voice, no em dash. */
function sentenceList(items) {
  if (items.length === 1) return `${capitalise(items[0])}.`;
  const head = items.slice(0, -1).map((s, i) => (i === 0 ? capitalise(s) : s));
  return `${head.join(', ')} and ${items[items.length - 1]}.`;
}

function capitalise(s) {
  return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * The block / weekly review line about what is coming.
 *
 * Only ever states the lifecycle truth: the recovery week arrives on its own,
 * and the NEXT block does not. Volyume requires the athlete's decision after a
 * block finishes, so nothing here may promise an automatic start.
 */
export function reviewRecoveryLine(resolved) {
  if (!resolved) return null;
  if (resolved.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY) {
    return 'You are in your recovery week. Training is lighter before you move on from this block, and you will choose what comes next when it is done.';
  }
  if (resolved.state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT) {
    return 'Training is being held back at the moment while your recovery catches up. Your recovery week still comes at the end of the block as planned.';
  }
  if (resolved.weeksToRecovery === 1) {
    return 'Next is your recovery week. Training will be lighter before you move on from this block.';
  }
  return null;
}
