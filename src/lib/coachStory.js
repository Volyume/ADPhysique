/**
 * coachStory.js — Campaign 18 jobs 10, 12 and 18.
 *
 * ONE WEEKLY STORY. "The weekly experience should not feel like five engines
 * independently giving advice." So this module takes the single coaching
 * context the run decided from and writes the week as one account:
 *
 *   WHAT HAPPENED
 *   WHAT IT MEANS
 *   WHAT VOLYUME IS CHANGING
 *   WHAT STAYS THE SAME
 *   WHAT VOLYUME WILL WATCH NEXT
 *
 * "NOT a long AI essay." Every line is short, plain and built from a fact
 * that already exists. Nothing here computes anything; it reads the context
 * and the changes the engines actually made.
 *
 * EVERY SENTENCE IS TRACEABLE. Each line carries the context key it came
 * from, so a sentence with no evidence behind it cannot be written by
 * accident - and a test can check that rather than trusting the prose.
 *
 * NO CAUSAL CLAIMS. "No causal claims such as 'because you ate too little'
 * unless the evidence genuinely supports that." This module states what was
 * observed and what is being done. It never joins two domains with a
 * "because": the app observes a correlation and does not observe a
 * mechanism, and the difference matters more here than anywhere else in the
 * product.
 *
 * PLAIN ENGLISH (job 18). No mesocycle, no EWMA, no adherence coefficient, no
 * programme epoch, no confidence interval. BANNED_TERMS below is checkable.
 *
 * PURE. No I/O, no clock.
 */
import { SIGNAL } from './coachContext';
import { LIMITER, chooseInterventions, nutritionQualifier } from './coachPrecedence';

/** Vocabulary that may never reach the user from this module. */
export const BANNED_TERMS = Object.freeze([
  'mesocycle', 'ewma', 'adherence coefficient', 'dose response', 'posterior',
  'programme epoch', 'systemic recovery weighting', 'confidence interval',
  'autoregulation', 'e1rm', 'tdee', 'macronutrient partitioning',
]);

/** A story line, with the evidence it came from. */
const line = (text, from) => ({ text, from });

// ─── WHAT HAPPENED ──────────────────────────────────────────────────────────

/**
 * The week, stated. Facts only, in the order a person would care about them:
 * their training, their body, their food.
 *
 * An UNKNOWN fact produces a sentence about what we do not know, not silence
 * and not a guess. That is job 8 arriving at the user.
 */
export function whatHappened(context) {
  const out = [];
  const t = context?.training?.execution;
  const p = context?.training?.progress;
  const w = context?.weight?.trend;
  const n = context?.nutrition?.coverage;
  const r = context?.recovery?.systemic;

  if (t?.signal === SIGNAL.GOOD) out.push(line(`You trained ${t.detail}.`, 'training.execution'));
  else if (t?.signal === SIGNAL.POOR) out.push(line(`You trained ${t.detail}.`, 'training.execution'));

  if (p?.signal === SIGNAL.GOOD) out.push(line('Your main lifts are still moving up.', 'training.progress'));
  else if (p?.signal === SIGNAL.POOR) out.push(line('Your main lifts have stopped moving.', 'training.progress'));

  if (w?.signal === SIGNAL.GOOD) out.push(line('Your weight is moving the way we intended.', 'weight.trend'));
  else if (w?.signal === SIGNAL.POOR) out.push(line('Your weight is not moving the way we intended.', 'weight.trend'));
  else if (w?.signal === SIGNAL.UNKNOWN) out.push(line('There are not enough weigh-ins to read a trend yet.', 'weight.trend'));

  // The coverage fact's own detail already reads "6 of 7 days logged", so the
  // sentence carries the count and not a second "logged".
  if (n?.signal === SIGNAL.GOOD) out.push(line(`You logged food on ${n.value} of the last 7 days.`, 'nutrition.coverage'));
  else if (n?.signal === SIGNAL.UNKNOWN) out.push(line('There is not enough food logging this week to judge your intake.', 'nutrition.coverage'));

  if (r?.signal === SIGNAL.POOR) out.push(line('Recovery was harder than usual this week.', 'recovery.systemic'));

  return out;
}

// ─── WHAT IT MEANS ──────────────────────────────────────────────────────────

/**
 * What the evidence supports, and what it does not.
 *
 * This is where "we don't have enough information to change this yet" gets
 * said out loud, because that is the sentence the founder singled out as
 * intelligence rather than failure.
 */
export function whatItMeans(context, limiters) {
  const out = [];
  const nut = limiters?.nutrition;
  const tr = limiters?.training;

  if (nut?.limiter === LIMITER.EXECUTION) {
    out.push(line('Your food target has not really been tried yet, so there is nothing to learn from changing it.', 'nutrition.intake'));
  } else if (nut?.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
    out.push(line(
      nut.because === 'weight_trend_unknown'
        ? 'We cannot judge your food target without a clearer weight trend.'
        : 'We cannot judge your food target without more logged days.',
      nut.because === 'weight_trend_unknown' ? 'weight.trend' : 'nutrition.coverage',
    ));
  } else if (nut?.onTarget === true) {
    out.push(line('Your food target is doing its job.', 'weight.trend'));
  } else if (nut?.limiter === LIMITER.PLAN) {
    // The week where the target IS changing had no line here at all, so the
    // most consequential decision on the screen was the one the account said
    // least about. Stated within the nutrition domain only - the evidence is
    // that the target was eaten and the scale still did not follow.
    out.push(line('Your target has had a fair run and your weight still is not moving as planned.', 'nutrition.intake'));
  }

  if (tr?.limiter === LIMITER.CONSTRAINED) {
    // D112 R7 (audit T2-14): the CONSTRAINED week gets its own truthful
    // line - before this branch existed the chain fell through and the
    // coach simply said nothing about training on most constrained
    // weeks. Calm, no blame, restriction named in the lane's own
    // vocabulary; the note beside the hold carries the specifics.
    out.push(line('Training worked around your temporary change this week, so nothing here is judged by it.', 'training.execution'));
  } else if (tr?.limiter === LIMITER.EXECUTION) {
    out.push(line('There were not enough sessions this block to judge the programme, so it stays as it is.', 'training.execution'));
  } else if (tr?.limiter === LIMITER.RECOVERY) {
    // SCOPE IS STATED (job 6). "Different scopes are allowed... but the
    // explanation must make the distinction truthful." This reading is
    // whole-body, and saying so is what stops it contradicting a
    // muscle-specific line elsewhere on the same screen.
    out.push(line('Recovery overall is the thing to respect this week, rather than the exercises themselves.', 'recovery.systemic'));
  } else if (tr?.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
    out.push(line('There is not enough training evidence yet to change anything.', 'training.execution'));
  } else if (tr?.progressing) {
    out.push(line('The programme is working, so it is worth leaving alone.', 'training.progress'));
  } else if (tr?.limiter === LIMITER.PLAN) {
    out.push(line('You have run the programme and recovered from it, so the lifts not moving is about the training itself.', 'training.progress'));
  }

  // MAY WE SAY ANYTHING ABOUT FOOD HERE? (job 5). Only where the evidence
  // genuinely exists. The qualifier returns 'unknown' whenever the diary
  // cannot support a claim, and that renders as SILENCE rather than as a
  // hedge - "we don't know about your food" beside a training stall reads as
  // an insinuation, which is worse than saying nothing.
  //
  // Even when it CAN be said, it is said as a co-observation and explicitly
  // not as a cause. Volyume sees a correlation; it does not see a mechanism.
  if (tr?.limiter === LIMITER.PLAN && !tr.progressing) {
    const q = nutritionQualifier(context);
    if (q.state === 'qualifies') {
      out.push(line(
        'Your logged intake was away from your target this week as well. Worth knowing alongside, though not something we can call the reason.',
        'nutrition.intake',
      ));
    }
  }

  return out;
}

// ─── WHAT IS CHANGING, AND WHAT IS NOT ──────────────────────────────────────

/**
 * The cross-domain change receipt (job 12).
 *
 * "No vague 'We've optimised your plan.' State exactly what changed." Each
 * change carries its OWN reason, so a week that legitimately changes two
 * things reads as two independent decisions rather than one vague sweep.
 *
 * @param {object} changes { calorieKcal, trainingNote, volumeNote,
 *   exerciseChanges, reintroductionNote }
 */
export function whatIsChanging(context, limiters, changes = {}) {
  const out = [];
  const kcal = Number(changes.calorieKcal) || 0;

  if (kcal !== 0) {
    out.push({
      domain: 'nutrition',
      text: `Your daily calorie target ${kcal > 0 ? 'goes up' : 'comes down'} by ${Math.abs(kcal)}.`,
      // Its own reason, never borrowed from the training side.
      why: 'Your weight is not moving at the rate we planned, and your logged intake shows you have been eating the target.',
      from: 'weight.trend',
    });
  }

  const exercises = Array.isArray(changes.exerciseChanges) ? changes.exerciseChanges : [];
  for (const ex of exercises) {
    out.push({
      domain: 'training',
      text: `${ex.name ?? 'One exercise'} is being replaced.`,
      why: ex.why ?? 'Your numbers on it have stopped moving.',
      from: 'training.progress',
    });
  }

  if (changes.volumeNote) {
    out.push({
      domain: 'training',
      text: changes.volumeNote,
      why: 'Recovery was harder this block, so this holds rather than adds.',
      from: 'recovery.systemic',
    });
  }

  // CC33 D112 R5 (closes audit T2-25's copy half): the reintroduction
  // ramp gets a DURABLE line for every week it is stepping, not only the
  // one toast at episode end. The sentence itself is built by
  // capability/reintroduction.js (reintroductionRampLine) from the
  // week's own planned rows stamped source 'reintroduction' - the screen
  // passes it ready-made, exactly as volumeNote arrives above, so this
  // module stays pure and the evidence key names the stamp it came from.
  if (changes.reintroductionNote) {
    out.push({
      domain: 'training',
      text: changes.reintroductionNote,
      why: 'Your temporary change has ended, so the sets it reduced build back towards your plan, one week at a time.',
      from: 'plan.reintroduction',
    });
  }

  return out;
}

/**
 * What stays the same, said explicitly.
 *
 * A user who is told only what changed cannot tell whether the other half of
 * their plan was considered or forgotten. Naming the untouched domain is the
 * difference between restraint and silence.
 */
export function whatStaysTheSame(context, limiters, changes = {}) {
  const out = [];
  const kcal = Number(changes.calorieKcal) || 0;
  // The reintroduction ramp counts as a training change here: "your
  // programme and your exercises stay as they are" beside "builds back
  // up to your plan" would read as a contradiction, so the blanket line
  // yields to the specific one on ramp weeks (T2-25).
  const trainingChanged = (Array.isArray(changes.exerciseChanges) && changes.exerciseChanges.length > 0)
    || !!changes.volumeNote || !!changes.reintroductionNote;

  if (kcal === 0) out.push(line('Your daily food target stays the same.', 'nutrition.coverage'));
  if (!trainingChanged) out.push(line('Your programme and your exercises stay as they are.', 'training.execution'));

  // MINIMUM EFFECTIVE INTERVENTION, SAID OUT LOUD (job 11). A domain that was
  // deliberately held is different from one that simply had nothing to do,
  // and the user cannot tell the two apart unless we say which it was. The
  // precedence layer decides; this only reports its holds.
  const plan = chooseInterventions(context, limiters);
  for (const hold of plan.holds) {
    const text = HOLD_COPY[hold.reason];
    if (text) out.push(line(text, hold.domain === 'nutrition' ? 'nutrition.intake' : 'training.execution'));
  }
  return out;
}

/**
 * Why a domain was deliberately left alone. Only the reasons a user can act
 * on or understand; an unmapped reason renders nothing rather than a code.
 */
const HOLD_COPY = Object.freeze({
  // D112 R7 (audit T2-14): chooseInterventions pushes exactly this
  // reason for every CONSTRAINED week; without the key the hold
  // rendered nothing.
  constraint_active: 'We are leaving your programme alone while training works around your temporary change.',
  target_not_eaten: 'We are leaving your target where it is until it has had a fair run.',
  sessions_missed: 'We are leaving your programme alone until there are enough sessions to judge it.',
  intake_coverage_unknown: 'We are leaving your target where it is until there is enough logging to read it.',
  intake_unknown: 'We are leaving your target where it is until there is enough to read.',
  weight_trend_unknown: 'We are leaving your target where it is until the weight trend is clearer.',
  execution_unknown: 'We are leaving your programme alone until there is a full week to judge.',
  progress_unknown: 'We are leaving your programme alone until there is more to go on.',
});

/**
 * What Volyume will watch next (elite-coach bar item 13).
 *
 * One sentence, and only where there is something specific to watch. A change
 * that was made has an outcome worth checking; a hold has the evidence that
 * would release it. Both are commitments the next week's run can be measured
 * against.
 */
export function whatWeWatchNext(context, limiters, changes = {}) {
  const kcal = Number(changes.calorieKcal) || 0;
  if (kcal !== 0) return line('We will see how your weight responds over the next couple of weeks before changing it again.', 'weight.trend');
  if (limiters?.nutrition?.limiter === LIMITER.EXECUTION) {
    return line('Give the current target a fair run and we will judge it on that.', 'nutrition.intake');
  }
  if (limiters?.nutrition?.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
    return line('A few more logged days would let us read this properly.', 'nutrition.coverage');
  }
  if (limiters?.training?.limiter === LIMITER.CONSTRAINED) {
    // D112 R7 (audit T2-14): the commitment on a constrained week is the
    // return path, never "get back on schedule".
    return line('When your temporary change ends, training builds back up and the programme is judged on full evidence again.', 'training.execution');
  }
  if (limiters?.training?.limiter === LIMITER.EXECUTION) {
    return line('Getting back to your full week is the thing that makes the rest readable.', 'training.execution');
  }
  if (limiters?.training?.limiter === LIMITER.RECOVERY) {
    return line('We will look at recovery again next week before adding anything.', 'recovery.systemic');
  }
  // A thin diary is worth naming even on a week where nothing is wrong: it is
  // the thing that would let the next decision be made properly. Stated as
  // what it would ENABLE, never as an instruction to log more.
  if (context?.nutrition?.coverage?.signal === SIGNAL.UNKNOWN) {
    return line('A few more logged days would let us read your intake properly.', 'nutrition.coverage');
  }
  return null;
}

// ─── THE WHOLE STORY ────────────────────────────────────────────────────────

/**
 * The week as one account.
 *
 * @param {object} args { context, limiters, changes }
 * @returns {{ happened, means, changing, staying, watching, isQuietWeek }}
 */
// NAMED buildCoachStory, not buildWeeklyStory. `weeklyStory.js` already owns
// that name for a different surface (the four-chapter train/eat/weigh/decision
// recap on WeeklyStoryScreen). Two exported functions with one name, producing
// two different "weekly stories", is exactly the confusion this campaign
// exists to remove - so this one is named for what it is: the coaching
// decision account.
export function buildCoachStory({ context = null, limiters = null, changes = {}, outcome = null } = {}) {
  if (!context) return null;
  const changing = whatIsChanging(context, limiters, changes);
  return {
    // CAMPAIGN 18 outcome follow-up. What came of the LAST accepted change
    // leads the account, because it is the thing the athlete has been waiting
    // to hear and because it frames everything under it. Null when there is
    // no accepted change to report - never a placeholder.
    outcome: outcome?.text ? line(outcome.text, 'intervention.outcome') : null,
    happened: whatHappened(context),
    means: whatItMeans(context, limiters),
    changing,
    staying: whatStaysTheSame(context, limiters, changes),
    watching: whatWeWatchNext(context, limiters, changes),
    // A week where nothing changes is a real coaching answer and the screen
    // should be able to say so plainly rather than rendering an empty list.
    isQuietWeek: changing.length === 0,
  };
}

/**
 * Every user-facing string the story produced, for checking.
 */
export function storyLines(story) {
  if (!story) return [];
  return [
    ...(story.outcome ? [story.outcome.text] : []),
    ...(story.happened ?? []).map((l) => l.text),
    ...(story.means ?? []).map((l) => l.text),
    ...(story.changing ?? []).flatMap((c) => [c.text, c.why]),
    ...(story.staying ?? []).map((l) => l.text),
    ...(story.watching ? [story.watching.text] : []),
  ].filter(Boolean);
}
