/**
 * src/lib/recovery/constants.js
 *
 * The per-muscle recovery ESTIMATE: every constant the model uses and the
 * evidence each one rests on. Register D201 (founder decision 2026-09-25),
 * spec docs/recovery-programme-2026-09-25/00-SPEC.md sections 2 and 3.
 *
 * WHAT THIS IS, AND IS NOT. Volyume has no biological recovery signal (no
 * HRV, no force test, no biopsy). What it has is the time since each
 * muscle's last session, how much that session did (working sets, direct
 * and 0.5-credited secondary, the same allocation the volume tracker
 * uses), the user's own "How's your recovery?" answer, how close to
 * failure the block's week trains, and the user's soreness, fatigue and
 * joint ratings when they give them. From those it ESTIMATES recovery of
 * function. Every surface that shows the result carries the word
 * "estimated" (RECOVERY_ESTIMATE_LABEL) and never calls it a measurement.
 * The factual layer (src/lib/trainingRecency.js, "Trained N days ago") is
 * separate and untouched: it states what a timestamp establishes and
 * nothing more; this module is the one sanctioned estimate layer.
 *
 * D219 (design 4.13 of docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md, evidence 03-SCIENCE.md Q5, Q5b, Q10 and F5) corrected
 * this table where the evidence said the D201 numbers were off: the lower
 * body's clocks (founder answer Q3 = A), the effort ladder, the first-week
 * factor (replaced by novelty), and three new multipliers (long length,
 * mostly indirect work, and a display band). Grades: the factors are
 * CONVENTION sized from B and C evidence, never measured per person.
 *
 * EVIDENCE (peer-reviewed unless marked consensus):
 *  - Goulart et al. 2021, Eur J Sport Sci 21(7):935-943. Five sets of
 *    8-10RM squat plus five of leg press, to failure (ten failure sets, 14
 *    trained men): volume load down at 24 h, first-set volume still down at
 *    48 h, jump and isometric strength back or above baseline at 72 h. The
 *    one trained-lifter anchor for the legs, and it implies 30 to 45 h for
 *    quads at an ordinary session (S Q5b, Table 2). D201 took the 72 h of a
 *    failure dose as the base for a six-set session and then scaled it up
 *    again by dose and effort, which counted that dose twice (the model
 *    predicted about 107 h for a dose measured at 48 to 72 h). ->
 *    BASE_RECOVERY_HOURS for the lower body, re-centred (Q3 = A): quads and
 *    glutes 54 h, hamstrings 60 h.
 *  - Moran-Navarro et al. 2017, Eur J Appl Physiol, and Pareja-Blanco et al.
 *    2020, J Strength Cond Res: sets to failure, especially high-repetition
 *    ones, leave mechanical function reduced up to 48 h; sets short of
 *    failure recover sooner (significantly, between 24 and 48 h). Vieira et
 *    al. 2022, Sports Med (meta-analysis of 20 studies): failure against
 *    non-failure, biomechanical drop SMD -0.96, damage SMD 0.76. Failure
 *    adds roughly 24 to 48 h on a 48 to 72 h clock, a far wider gap than
 *    D201's 10 to 15% spread. -> intensityFactor (RIR 0 1.25, RIR 1 1.10,
 *    RIR 2 1.00, RIR 3 or more 0.80; direction A/B, the sizes convention).
 *  - Ferreira et al. 2017, Physiol Behav (bench press, trained men): peak
 *    torque and the ability to repeat work recover on different clocks;
 *    after high-volume work, repeated best-effort sets were not possible
 *    within 96 h; perceived fitness recovered at 72 h while torque and
 *    soreness took 96 h, and subjective and objective measures agree
 *    poorly at the individual level, so they must be combined, not
 *    swapped. -> doseFactor scales with the session's sets; the user's
 *    ratings are a modifier that can only lengthen an estimate.
 *  - Soares et al. 2015, J Strength Cond Res (highly trained men): eight
 *    sets of 10RM on one arm's preacher curl and the other's seated row.
 *    Elbow flexor torque was still 8.4% down 24 h after the curls and back
 *    to baseline 24 h after the rows, where the elbow flexors work as
 *    synergists. A contrast between roles on ONE muscle, so it supports an
 *    exercise effect rather than a muscle effect: a muscle credited mostly
 *    by synergist work recovers sooner. -> INDIRECT_FACTOR.
 *  - Nosaka 1991, Eur J Appl Physiol; McHugh 2003; Hyldahl et al. 2017; and
 *    Coratella et al. 2025 (hamstring strength back in about 1 day on a
 *    repeat bout against about 3 days on the first): one bout protects
 *    against damage in later bouts, the protection is specific to the
 *    exercise and lasts weeks to months, and is lost for a new exercise or
 *    after a layoff. Damas et al. 2016, J Physiol: damage is highest in the
 *    first weeks of training and myofibrillar protein synthesis relates to
 *    hypertrophy only once it attenuates. Damas followed novices, so "week 1
 *    of a block" is not the supported effect: a NEW exercise or a layoff is.
 *    -> NOVELTY_FACTOR replaces the first-week factor; the model speaks of
 *    recovery of function, never of adaptation.
 *  - Nosaka and Sakamoto 2001; McMahon et al. 2024, J Appl Physiol (n = 8):
 *    work at a long muscle length is more damaging and recovers later, the
 *    same property that makes long-length exercises grow more (S Q12), so
 *    their recovery price is carried here. -> LONG_LENGTH_EXERCISE_NAMES.
 *  - Schoenfeld, Ogborn, Krieger 2016, Sports Med (each major muscle at
 *    least twice a week beats once) and Schoenfeld, Grgic, Krieger 2019,
 *    J Sports Sci (with weekly volume equal, frequency matters much less).
 *    -> the sequencing rule spaces sessions for recovery but never trades
 *    a muscle's weekly volume for spacing.
 *  - CONSENSUS (not measurement): Renaissance Periodization's
 *    stimulus-recovery-adaptation lengths (Israetel) order the muscles
 *    where the literature is silent per muscle: small, high-blood-flow
 *    muscles about 1.5-2.5 days; chest, back, triceps about 2-3 days;
 *    quads, hamstrings, glutes about 3-4 days.
 *
 * PURE. No I/O, no clock, no randomness: the same inputs give the same
 * outputs, every time (CLAUDE.md: the engine is deterministic).
 */

/** The one word every recovery figure carries on screen. */
export const RECOVERY_ESTIMATE_LABEL = 'estimated';

/**
 * Hours from the END of a standard-dose session to estimated full
 * recovery of function, per muscle key (the keys are VOLUME_LANDMARKS'
 * keys in src/lib/algorithms.js; the model must know every one of them).
 *
 * Every figure is an estimate with a band of plus or minus 25%
 * (RECOVERY_BAND), never a measured time: the evidence for differences
 * BETWEEN muscles is weak (S Q5b: three small comparisons that disagree in
 * direction, none for the lats, upper back, delts, glutes, calves, abs or
 * traps), so the order below is a prior, kept in its D201 order (small
 * before large, the founder's "biceps recover quicker than back"), with the
 * lower body re-centred by D219.
 */
export const BASE_RECOVERY_HOURS = Object.freeze({
  // Lower body, re-centred by D219 (design 4.13, founder answer Q3 = A).
  // The one trained-lifter anchor (Goulart 2021, ten failure sets, back at
  // 48 to 72 h) implies 30 to 45 h for quads at an ordinary six-set session,
  // and D201's 72 h counted that failure dose twice (see the header), so
  // quads sit at 54 h. Nothing is measured for the glutes; they travel with
  // the quads. The hamstrings take 60 h: a little longer on the one
  // eccentric-heavy anchor (Coratella 2025: Nordic strength down to day 3 on
  // a first bout) and by convention, not by measurement.
  quads: 54,
  hamstrings: 60,
  glutes: 54,
  // Between the glutes and the calves; consensus.
  adductors: 60,
  // Multi-joint trunk movers: 24-48 h at a moderate dose (Soares 2015),
  // 48-72 h at a high one (Ferreira 2017); consensus 2-3 days.
  back: 60,
  chest: 60,
  // Arms: single-joint work still down at 24 h (Soares 2015); consensus
  // 1.5-2.5 days.
  triceps: 48,
  biceps: 48,
  // Delts and traps: consensus.
  side_delts: 48,
  front_delts: 48,
  rear_delts: 48,
  traps: 48,
  // Small, high-blood-flow, low-damage muscles: consensus.
  forearms: 36,
  calves: 36,
  abs: 36,
  neck: 36,
  tibialis: 36,
});

/**
 * The per-session dose a baseline length is stated for: six working sets
 * on the muscle (direct 1.0 plus secondary 0.5 credit, as
 * allocateExerciseVolume counts them), the median per-session target the
 * plan generator itself emits (weekly target over sessions, capped at 8,
 * or 12 for a weak point).
 */
export const REFERENCE_SETS = 6;

/** doseFactor = clamp(0.7, 1.5, sqrt(sets / REFERENCE_SETS)). */
export const DOSE_FACTOR_MIN = 0.7;
export const DOSE_FACTOR_MAX = 1.5;

/** The user's own "How's your recovery?" answer (poor | average | good). */
export const RATING_FACTOR = Object.freeze({ poor: 1.15, average: 1.0, good: 0.9 });

/**
 * NOVELTY (D219, design 4.13): a session's recovery runs 15% longer when the
 * muscle meets an exercise it has not been trained with before in the
 * history the model reads, and again for the next session (NOVELTY_SESSIONS
 * sessions in all, the one that meets it included), or when NOVELTY_LAYOFF_DAYS
 * days or more have passed since the muscle's last session. It replaces the
 * D201 first-week factor (1.10 for week 1 of every block, familiar
 * exercises included): the repeated-bout effect is specific to the exercise
 * and lasts weeks to months, so week 1 of a block is not what lengthens
 * recovery, an unaccustomed exercise or a layoff is (S Q5, Q10 row 4, F5;
 * grade C/D). muscleRecoveryModel.sessionMuscleTerms decides which sessions
 * are novel; recoveryHours takes the answer as `novel`.
 */
export const NOVELTY_FACTOR = 1.15;
export const NOVELTY_SESSIONS = 2;
export const NOVELTY_LAYOFF_DAYS = 21;

/**
 * LONG LENGTH (D219, design 4.13): an exercise built around a long muscle
 * length lengthens recovery by up to LONG_LENGTH_WEIGHT (10%), weighted by
 * the share of the muscle's DIRECT sets in the session that come from such
 * exercises: factor = 1 + LONG_LENGTH_WEIGHT x share (longLengthFactor).
 * Lengthened-position work is more damaging and recovers later (Nosaka and
 * Sakamoto 2001; McMahon 2024; S Q5, grade B/C), and the catalogue prefers
 * these exercises for growth, so the clock carries their cost.
 */
export const LONG_LENGTH_WEIGHT = 0.10;

/**
 * The exercises built around a long muscle length, by exact corpus name
 * (src/lib/exerciseCorpus; a test holds every name to a live row and every
 * live row of a named family to this list). Families, per the design:
 * overhead triceps extensions, the seated leg curl, Romanian deadlifts, the
 * deep squats (barbell back squat and hack squat machine), the full-stretch
 * standing calf raise (machine) and preacher curls. A frozen list, never a
 * guess from a name: a family not named here is not weighted.
 */
export const LONG_LENGTH_EXERCISE_NAMES = Object.freeze([
  // Overhead triceps extensions: the long head is stretched with the arm overhead.
  'Standing Barbell Overhead Tricep Extension',
  'Dumbbell Overhead Tricep Extension',
  'Single-Arm Overhead Dumbbell Tricep Extension',
  'Cable Overhead Tricep Extension',
  'Overhead Cable Tricep Extension (Bar)',
  'Overhead Cable Rope Extension',
  'Single-Arm Overhead Cable Extension',
  'Plate-Loaded Overhead Extension',
  'Band Overhead Tricep Extension',
  // Seated leg curl: the hips are flexed, so the hamstrings start long.
  'Seated Leg Curl',
  // Romanian deadlifts: the hamstrings (or glutes) are loaded at the bottom of the hinge.
  'Romanian Deadlift',
  'Romanian Deadlift (Barbell)',
  'Romanian Deadlift (Dumbbell)',
  'Romanian Deadlift (Glute)',
  'B-Stance Romanian Deadlift',
  'Snatch-Grip Romanian Deadlift',
  'Single-Leg Romanian Deadlift',
  'Single-Leg Romanian Deadlift (DB)',
  'Cable Romanian Deadlift',
  'Smith Machine Romanian Deadlift',
  'Kettlebell Romanian Deadlift',
  'Landmine Romanian Deadlift',
  'Band Romanian Deadlift (Bilateral)',
  'Band Romanian Deadlift (Single-Leg)',
  // Deep squats.
  'Barbell Back Squat',
  'Hack Squat Machine',
  // Full-stretch calf raise.
  'Standing Calf Raise (Machine)',
  // Preacher curls: the elbow flexors are loaded in the stretched position.
  'EZ Bar Preacher Curl',
  'Preacher Curl (Barbell)',
  'Preacher Curl (Dumbbell)',
  'Zottman Preacher Curl',
  'Plate-Loaded Preacher Curl',
  'Preacher Curl Machine',
]);
const LONG_LENGTH_NAME_SET = new Set(LONG_LENGTH_EXERCISE_NAMES);

/**
 * MOSTLY INDIRECT (D219, design 4.13): a muscle whose credit in a session is
 * more than half synergist credit (the volume tracker's 0.5 per set, as
 * rows give the elbow flexors) recovers sooner than the same credit from
 * prime-mover work: the elbow flexors were back to baseline 24 h after rows
 * (Soares 2015; grade C, one muscle). Exactly half does not count.
 */
export const INDIRECT_FACTOR = 0.85;

/**
 * The band every clock is shown with (D219, design 4.13): plus or minus 25%
 * of the estimate, shown as a range ("about 2 to 3 days"). No study gives the
 * spread of recovery time in trained lifters (S Q5; convention). 0.75 of the
 * estimate is also where the model reads "nearly recovered".
 */
export const RECOVERY_BAND = 0.25;

/**
 * The user's ratings, COMBINED with the estimate (Ferreira 2017): they can
 * lengthen a session's recovery, never shorten it below the time-and-
 * volume baseline.
 */
export const FEEDBACK_FACTOR = Object.freeze({
  // Pre-session soreness 3/3 reported at the muscle's NEXT session, or
  // post-session fatigue 4-5 on the session itself.
  highSorenessOrFatigue: 1.20,
  // Joint discomfort 2-3 on the session, added on top.
  jointDiscomfortAdd: 0.10,
});

/** Every session's recovery length is clamped to this range. */
export const RECOVERY_HOURS_MIN = 24;
export const RECOVERY_HOURS_MAX = 168;

/** One session's fatigue unit (sets / REFERENCE_SETS), clamped. */
export const FATIGUE_UNIT_MIN = 0.25;
export const FATIGUE_UNIT_MAX = 2.0;

/** Sessions older than this contribute nothing; a muscle with none reads "no recent session". */
export const LOOKBACK_DAYS = 14;

/** Status bands on recoveredPercent. */
export const READY_PERCENT = 90;
export const NEARLY_PERCENT = 75;

/** Used when a session row carries no end time or duration. */
export const DEFAULT_SESSION_MINUTES = 60;

/** Used to project "your next session" when the habit gives a day but no time. */
export const DEFAULT_TRAINING_START_MINUTE = 18 * 60;

/*
 * PERSONAL RECOVERY LEARNING (register D210; spec
 * docs/recovery-programme-2026-09-25/14-PERSONAL-LEARNING-V2.md). The learner
 * is src/lib/recovery/personalRecovery.js; its numbers live here with the
 * rest of the model's. The learned figure is the person's own recovery
 * factor, which takes the place of the recovery answer's factor in
 * recoveryHours for every muscle; it starts at that answer's factor and
 * moves only when the athlete's own lifts clearly show a different recovery
 * time.
 */

/** Sessions older than this teach nothing (about three training blocks). */
export const PERSONAL_WINDOW_DAYS = 84;

/** A lift's earlier session counts as its baseline only inside this gap. */
export const PERSONAL_BASELINE_MAX_GAP_DAYS = 28;

/** Performance compares the first sets of a lift, matched in number: at most this many. */
export const PERSONAL_MATCHED_SETS = 3;

/** The factors the fit chooses from, 5% apart; every recovery answer's factor is on the grid. */
export const PERSONAL_FACTOR_MIN = 0.75;
export const PERSONAL_FACTOR_MAX = 1.4;
export const PERSONAL_FACTOR_GRID = Object.freeze(
  Array.from({ length: 14 }, (_, i) => Math.round((PERSONAL_FACTOR_MIN + i * 0.05) * 100) / 100),
);

/**
 * How much performance a muscle loses between fully fatigued and fully
 * recovered, as a fraction: a BOUNDED ASSUMPTION, not a measurement. A 4% to
 * 15% decrement right after a hard session spans Goulart 2021 (volume load
 * down at 24 h after squats and leg press to failure), Moran-Navarro 2017
 * (mechanical function reduced up to 48 h after sets to failure) and Ferreira
 * 2017 (repeated best efforts not possible within 96 h after high-volume
 * bench). The lower bound is what makes the question answerable: a factor
 * that predicts a drop the lifts never show must pay for it in the fit.
 */
export const PERFORMANCE_SENSITIVITY_MIN = 0.04;
export const PERFORMANCE_SENSITIVITY_MAX = 0.15;

/**
 * A change bigger than this between the two compared sessions of a lift
 * (as a log ratio, about 22%) is not read as recovery: the
 * model's own largest recovery effect is PERFORMANCE_SENSITIVITY_MAX, so a
 * jump past this is a logging slip (a weight typed as 1000), a changed
 * set-up or an unlogged injury, and least squares would let one such pair
 * outweigh a dozen honest ones.
 */
export const PERSONAL_MAX_CHANGE = 0.2;

/**
 * A lift whose comparisons repeat the same reps set for set at least this
 * share of the time is logged as planned (the prescription as filled in, or
 * a fixed 5 x 5), not as the day went, and teaches nothing about recovery.
 */
export const PERSONAL_MAX_FIXED_REPS_SHARE = 0.5;

/** Fewer comparable pairs than this, across the person's lifts: not yet. */
export const PERSONAL_MIN_PAIRS = 8;

/** A muscle's pairs count only from this many: its own drift (an offset
 * and a per-day gain) and sensitivity are fitted, three numbers, and fewer
 * pairs than this leave almost nothing to test them against. */
export const PERSONAL_MIN_MUSCLE_PAIRS = 5;

/** The pairs must sit at different predicted recovery once the drift is
 * taken out (the pooled standard deviation of the predicted change left
 * after its fit on the days between the sessions, as a fraction, for some
 * candidate): a steady schedule, or breaks too long to leave any fatigue,
 * carries no information about recovery time, and says so. */
export const PERSONAL_MIN_SPREAD = 0.1;

/** How clearly the best factor must beat the start before it is used:
 * workout days x ln(SSE at the start / SSE at the best), counting the days
 * the later sessions fell on, not the comparisons (comparisons from one day
 * share that day's form; D210 addendum 5). The full calibration on that
 * statistic (600 simulated athletes a case, 66 cases: the 32 of the plan
 * cells and the stress cases of two exercises a muscle, eight sets, pre-filled
 * reps and tiring through the sets, and 34 for the stronger learner of D219,
 * learner design 06: plan users logging as the screen fills in, sets typed or
 * kept as filled in, schedules the weekdays do and do not set, the time of
 * day, the day's sleep, a clock with novelty): at 10, a direction shown to at
 * most 9 in 600 whose recovery equals the start (the spec allows 5%, 30) and
 * the wrong one to at most 2 in 600 (1 in 60 allowed, 10); the smallest gate
 * meeting both is 8 (it was 5 before the stronger learner: pairing by slot is
 * what raises the tail, in the no-plan cells that log reps as prescribed).
 * Kept at 10: the stricter choice. The cost is reach: in twelve weeks it
 * almost never moves anyone, and the card says why. */
export const PERSONAL_LR_MIN = 10;

/**
 * PAIRING BY SLOT WHEN THE WEEKDAYS DO NOT SET THE GAP (D219, learner design
 * 06-LEARNER-SIGNAL-DESIGN.md section 2.3, founder answer 2026-10-05).
 *
 * The learner pairs a lift with its earlier session on the SAME WEEKDAY
 * because, on a weekly schedule, the weekday sets the break before a session,
 * so comparing across weekdays reads a steady weekday difference in strength
 * as recovery (D210 addendum 3: a lifter 2% stronger on Mondays was shown
 * "slower" for 12 of 60). The same rule throws away most of the evidence of a
 * person who does not train to a weekly pattern: on a varied schedule it is
 * the largest single loss of comparisons (36 of 128 lifts without a plan, 52
 * with one; 05-LEARNER-RECON.md section 2.4), and a plan block then gives
 * about 10 usable days instead of 23 (section 2.6). When the weekdays do not
 * set the gap the confound is not there, so the baseline is the lift's
 * previous session whenever it fell (its slot in the person's own rotation).
 *
 * The guard that says so is measured from the sessions themselves, so the
 * calibration simulation exercises exactly what a phone runs: of the gaps
 * between consecutive sessions (a break of more than a week, or two sessions
 * in one day, say nothing about the routine and are left out), how much of
 * their variation does the weekday of the later session explain? The share is
 * omega squared of a one-way analysis of variance (adjusted for the number of
 * weekdays, so a random schedule reads about 0, not a chance share). What the
 * calibration simulation's own schedules read (medians over 600 athletes each):
 * a fixed weekly schedule 0.99 to 1.00; a habit that moved from one fixed pattern
 * to another 0.89; a fixed one with a third of its sessions moved a day 0.66; one
 * that slipped a day every four weeks 0.53; three days of five with the weekend
 * always a gap 0.23 (0.05 to 0.44 across athletes); a random one -0.02. At 0.2
 * the guard opens for none of the 600 on any fixed, moved or slipping schedule,
 * for 45% of the weekend-bound ones and for 94% of the random ones (the
 * simulation holds every promise with it open; 05-LEARNER-RECON.md section 2.6
 * gives the cost of getting it wrong: any-weekday pairing on a fixed schedule
 * shows a false direction to 4% at gate 10 and the wrong direction to 2%). Too
 * few gaps, one weekday, or gaps that never differ read as coupled: the weekday
 * rule stands (today's behaviour). The habit read the app already has
 * (trainingHabitSchedule.deriveHabitualTrainingWeekdays) is not the guard: it
 * names a weekday habitual when it is trained in half the weeks, and 194 of 200
 * athletes on the simulation's varied schedule have at least one (2.9 on
 * average), so as the guard it would open for 3% where this one opens for 94%.
 */
export const PERSONAL_SLOT_MAX_COUPLING = 0.2;
/** Fewer session gaps than this: the weekday rule stands (too little to say). */
export const PERSONAL_SLOT_MIN_GAPS = 12;
/** Gaps shorter than this (two sessions in a day) or longer than a week (a
 * break) are not the routine, and are not read by the guard. */
export const PERSONAL_SLOT_MIN_GAP_HOURS = 12;
export const PERSONAL_SLOT_MAX_GAP_HOURS = 168;

/**
 * THE DAY'S SLEEP AND ENERGY AS A DAY-EFFECT COVARIATE (D219, learner design
 * 06 section 2.3 and 05-LEARNER-RECON.md candidate E). The start sheet's sleep
 * chip (Poor 2, OK 3, Good 4) and energy chip (Low 2, OK 3, High 4) say how
 * the person walked in. They are NOT recovery markers: they are used to take
 * out of a comparison the part of the day's form they explain (the shared day
 * effect is about 31% of a comparison's noise variance in the calibration
 * simulation, 05-LEARNER-RECON.md section 2.5), so a poor night before the
 * later session no longer reads as a slow recoverer. Soreness is never used:
 * it is a mediator of recovery, and adjusting for it would remove the signal.
 *
 * Evidence for the direction and the size. Sleep loss lowers performance (mean
 * -7.56%, 95% CI -11.9 to -3.13, 69 publications, I-squared 98%, with about
 * 0.4% lost for each hour awake before the task; Craven et al. 2022, Sports
 * Med 52:2669-2690, PMID 35708888, grade A), and inadequate sleep impairs
 * maximal strength in compound movements, with little effect from total
 * deprivation (17 studies of moderate or weak quality; Knowles et al. 2018, J
 * Sci Med Sport 21:959-968, PMID 29422383, grade A). A three-level, optional,
 * self-reported chip explains far less than the whole decrement, so the term
 * is HELD: its sign cannot be negative (a better night never predicts a worse
 * session), and its size is capped at PERSONAL_DAY_EFFECT_MAX of the estimated
 * max for each chip step, so Poor against Good can move a comparison by at
 * most twice that. One term is fitted for the person (the day's form is shared
 * by every lift of the session), on a grid of PERSONAL_DAY_EFFECT_STEPS + 1
 * values from 0 to the cap, at each candidate factor; it is used only from
 * PERSONAL_DAY_EFFECT_MIN_PAIRS comparisons with both chips answered. A
 * comparison without both chips is read exactly as it was.
 */
export const PERSONAL_DAY_EFFECT_MAX = 0.02;
export const PERSONAL_DAY_EFFECT_STEPS = 4;
export const PERSONAL_DAY_EFFECT_MIN_PAIRS = 8;

const clamp = (lo, hi, v) => Math.min(hi, Math.max(lo, v));

/**
 * How a session's set count on a muscle scales its recovery length.
 * Square root, so half the reference dose gives 0.71 and double gives
 * 1.41 (diminishing), clamped to [0.7, 1.5]. Non-finite or non-positive
 * sets read as the reference dose.
 */
export function doseFactor(sets) {
  const s = Number(sets);
  if (!Number.isFinite(s) || s <= 0) return 1.0;
  return clamp(DOSE_FACTOR_MIN, DOSE_FACTOR_MAX, Math.sqrt(s / REFERENCE_SETS));
}

/** The user's recovery answer; anything unknown reads as average. */
export function ratingFactor(recoveryRating) {
  return RATING_FACTOR[recoveryRating] ?? RATING_FACTOR.average;
}

/**
 * How close to failure the block's week trains (its rir_target), on the D219
 * ladder (design 4.13, "effort factor"): RIR 0 lengthens most (1.25), RIR 1
 * lengthens (1.10), RIR 2 is neutral, RIR 3 or more shortens (0.80). The
 * rung edges are D201's: at most 0 is the failure rung, above 0 and at most 1
 * the RIR 1 rung, under 3 neutral. Unknown reads as neutral.
 *
 * Why wider than D201's 1.15 / 1.15 / 1.0 / 0.90: failure adds roughly 24 to
 * 48 h on a 48 to 72 h clock (Moran-Navarro 2017, Pareja-Blanco 2020, Vieira
 * 2022 [A]), so a 10 to 15% spread was far too narrow. The direction is A/B;
 * the sizes are convention.
 */
export function intensityFactor(rirTarget) {
  // Number(null) is 0, not NaN (the same trap programmePosition.js's `int`
  // guards against), so an ABSENT target is checked before coercion or it
  // would read as RIR 0 and lengthen every unknown week.
  if (rirTarget === null || rirTarget === undefined || rirTarget === '') return 1.0;
  const r = Number(rirTarget);
  if (!Number.isFinite(r)) return 1.0;
  if (r <= 0) return 1.25;
  if (r <= 1) return 1.10;
  if (r < 3) return 1.0;
  return 0.8;
}

/**
 * The long-length factor for a muscle's session: 1 + LONG_LENGTH_WEIGHT x the
 * share (0 to 1) of the muscle's direct sets that came from
 * LONG_LENGTH_EXERCISE_NAMES. An absent or unreadable share is neutral.
 */
export function longLengthFactor(share) {
  if (share === null || share === undefined || share === '') return 1.0;
  const s = Number(share);
  if (!Number.isFinite(s)) return 1.0;
  return 1 + LONG_LENGTH_WEIGHT * clamp(0, 1, s);
}

/** True when the exercise is on the frozen long-length list (exact corpus name, nothing else). */
export function isLongLengthExercise(exercise) {
  const name = exercise?.name;
  return typeof name === 'string' && LONG_LENGTH_NAME_SET.has(name);
}

/**
 * The band to show beside a clock: { lowHours, highHours } at 0.75 and 1.25
 * of the estimate (RECOVERY_BAND), each kept inside the same clamp every
 * clock lives in, [RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX]. Null when the
 * estimate is absent, not a number or not positive. Display only: no model
 * decision reads it, and the estimate itself is unchanged.
 *
 * @param {number} hours - a clock as recoveryHours returns it
 * @returns {{ lowHours: number, highHours: number }|null}
 */
export function recoveryBandHours(hours) {
  if (hours === null || hours === undefined || hours === '') return null;
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return null;
  return {
    lowHours: clamp(RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX, h * (1 - RECOVERY_BAND)),
    highHours: clamp(RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX, h * (1 + RECOVERY_BAND)),
  };
}

/**
 * The user's own ratings as a modifier (never below 1.0).
 * @param {{ sorenessNext?: number|null, fatigue?: number|null, joint?: number|null }} ratings
 *   sorenessNext: the 1-3 soreness reported before the muscle's NEXT session;
 *   fatigue: the 1-5 post-session fatigue on this session;
 *   joint: the 0-3 joint discomfort on this session.
 */
export function feedbackFactor({ sorenessNext = null, fatigue = null, joint = null } = {}) {
  let f = 1.0;
  const soreHigh = Number(sorenessNext) >= 3;
  const fatigueHigh = Number(fatigue) >= 4;
  if (soreHigh || fatigueHigh) f = FEEDBACK_FACTOR.highSorenessOrFatigue;
  if (Number(joint) >= 2) f += FEEDBACK_FACTOR.jointDiscomfortAdd;
  return Math.max(1.0, f);
}

/**
 * A session's estimated recovery length for one muscle, in hours from the
 * session's end. Unknown muscle keys take the most conservative baseline
 * the table holds (the longest, 60 h since D219 re-centred the legs), so a
 * new library muscle is never under-estimated.
 *
 * The three D219 session terms (novel, longLengthShare, mostlyIndirect) are
 * what a HISTORY can say about one muscle's session; muscleRecoveryModel.
 * sessionMuscleTerms works them out. A caller with no history (the plan
 * builder judging a session it has not been done yet) leaves them out and
 * gets the neutral clock.
 *
 * @param {string} muscle - a VOLUME_LANDMARKS key
 * @param {object} [opts]
 * @param {number} [opts.sets] - working sets on the muscle this session
 * @param {string} [opts.recoveryRating] - poor | average | good
 * @param {number|null} [opts.rirTarget] - the block week's RIR target
 * @param {boolean} [opts.novel] - D219: the muscle met a new exercise (this
 *   session or the one before it) or came back after a layoff of 21 days or
 *   more: NOVELTY_FACTOR. Replaces the D201 first-week flag, which is no
 *   longer read (passing `firstWeek` changes nothing).
 * @param {number|null} [opts.longLengthShare] - D219: the share (0 to 1) of
 *   the muscle's direct sets in the session that come from long-length
 *   exercises: longLengthFactor.
 * @param {boolean} [opts.mostlyIndirect] - D219: more than half of the
 *   muscle's credit in the session is synergist credit: INDIRECT_FACTOR.
 * @param {object} [opts.ratings] - see feedbackFactor
 * @param {number|null} [opts.personalFactor] - register D210: the factor
 *   learned from the athlete's own lifts (personalRecovery.js). When given
 *   it takes the place of the recovery answer's factor (it started there),
 *   clamped to [PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX].
 * @returns {number} hours, clamped to [RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX]
 */
export function recoveryHours(muscle, {
  sets = REFERENCE_SETS, recoveryRating = 'average', rirTarget = null, novel = false,
  longLengthShare = null, mostlyIndirect = false, ratings = null, personalFactor = null,
} = {}) {
  return hoursFrom(
    sessionTerms(muscle, {
      sets, rirTarget, novel, longLengthShare, mostlyIndirect, ratings,
    }),
    speedFactor(personalFactor, recoveryRating),
  );
}

/**
 * recoveryHours for one session at several learned factors. The personal
 * learner (personalRecovery.js, register D210) tries every candidate speed
 * on every session: entry i equals recoveryHours(muscle, { ...opts,
 * personalFactor: factors[i] }) exactly, and the session's own terms are
 * worked out once rather than once per factor.
 *
 * @param {string} muscle
 * @param {object} opts - as recoveryHours, without personalFactor
 * @param {number[]} factors
 * @returns {number[]}
 */
export function recoveryHoursAcross(muscle, {
  sets = REFERENCE_SETS, recoveryRating = 'average', rirTarget = null, novel = false,
  longLengthShare = null, mostlyIndirect = false, ratings = null,
} = {}, factors = []) {
  const terms = sessionTerms(muscle, {
    sets, rirTarget, novel, longLengthShare, mostlyIndirect, ratings,
  });
  return factors.map((f) => hoursFrom(terms, speedFactor(f, recoveryRating)));
}

/** The speed factor: the learned one when given (clamped), else the recovery answer's. */
function speedFactor(personalFactor, recoveryRating) {
  // The absent-value trap intensityFactor guards: Number(null) is 0.
  const learned = personalFactor === null || personalFactor === undefined || personalFactor === ''
    ? NaN : Number(personalFactor);
  return Number.isFinite(learned) && learned > 0
    ? clamp(PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX, learned)
    : ratingFactor(recoveryRating);
}

/** Everything in a session's recovery length except the speed factor. */
function sessionTerms(muscle, {
  sets, rirTarget, novel, longLengthShare, mostlyIndirect, ratings,
}) {
  const base = BASE_RECOVERY_HOURS[muscle] ?? Math.max(...Object.values(BASE_RECOVERY_HOURS));
  return {
    baseDose: base * doseFactor(sets),
    intensity: intensityFactor(rirTarget),
    novelty: novel ? NOVELTY_FACTOR : 1.0,
    longLength: longLengthFactor(longLengthShare),
    indirect: mostlyIndirect ? INDIRECT_FACTOR : 1.0,
    feedback: feedbackFactor(ratings ?? {}),
  };
}

/** The length, multiplied in the estimate's own order and clamped. */
function hoursFrom(terms, speed) {
  const hours = terms.baseDose
    * speed
    * terms.intensity
    * terms.novelty
    * terms.longLength
    * terms.indirect
    * terms.feedback;
  return clamp(RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX, hours);
}

/**
 * D201 addendum (lead ruling 3, sequencing residual): a spacing PRIOR for
 * PLAN GENERATION only, used to turn N sessions a week into hours between
 * them the way a real week actually spreads them, rather than assuming
 * N even slices of 168 hours. No weekday is ever assigned to a plan or a
 * session (D17: "user trains on the days they want and have lives"); this
 * table never reaches storage, a session object, or the UI. The runtime
 * next-workout logic (Section 4 of the spec) is separate and reads the
 * user's own habitual training days, never this table.
 *
 * Each row is hours from one session to the next for a typical week of
 * that many sessions, spread as evenly as habit allows, LAST entry is the
 * wrap (last session of the week back to the first of the next), always
 * the longest gap because a real week's rest days concentrate there
 * (Sat/Sun for most schedules). Each row sums to 168.
 */
/**
 * The RIR a block opens on (spec section 5.1: the scorer judges a plan's
 * recovery hours at the block's opening intensity, not at any one
 * exercise's own per-experience target). Mirrors the default week ladder
 * database.js writes for a new block (`Math.max(0, 3 - i)`, week 1 = 3).
 */
export const PLAN_OPENING_RIR = 3;

export const TYPICAL_WEEK_GAP_HOURS = Object.freeze({
  1: [168],
  2: [72, 96], // Mon, Thu
  3: [48, 48, 72], // Mon, Wed, Fri
  4: [24, 48, 24, 72], // Mon, Tue, Thu, Fri
  5: [24, 24, 24, 24, 72], // Mon-Fri
  6: [24, 24, 24, 24, 24, 48], // Mon-Sat
  7: [24, 24, 24, 24, 24, 24, 24],
});
