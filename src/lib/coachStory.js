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
import { LIMITER } from './coachPrecedence';

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

  if (n?.signal === SIGNAL.GOOD) out.push(line(`You logged ${n.detail}.`, 'nutrition.coverage'));
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
  }

  if (tr?.limiter === LIMITER.EXECUTION) {
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
 * @param {object} changes { calorieKcal, trainingNote, volumeNote, exerciseChanges }
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
  const trainingChanged = (Array.isArray(changes.exerciseChanges) && changes.exerciseChanges.length > 0)
    || !!changes.volumeNote;

  if (kcal === 0) out.push(line('Your daily food target stays the same.', 'nutrition.coverage'));
  if (!trainingChanged) out.push(line('Your programme and your exercises stay as they are.', 'training.execution'));
  return out;
}

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
export function buildWeeklyStory({ context = null, limiters = null, changes = {} } = {}) {
  if (!context) return null;
  const changing = whatIsChanging(context, limiters, changes);
  return {
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
    ...(story.happened ?? []).map((l) => l.text),
    ...(story.means ?? []).map((l) => l.text),
    ...(story.changing ?? []).flatMap((c) => [c.text, c.why]),
    ...(story.staying ?? []).map((l) => l.text),
    ...(story.watching ? [story.watching.text] : []),
  ].filter(Boolean);
}
