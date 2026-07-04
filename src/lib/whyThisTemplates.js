/**
 * whyThisTemplates.js
 * Plain-language template library for user-facing exercise and plan explanations.
 *
 * Voice rules from docs/COACHING_VOICE_SYNTHESIS_LOCKED.md:
 *   - Founder decision 2026-06-03: engine-action messages state the call
 *     plainly and do NOT name "Precision Coaching" in the body. The screen
 *     header carries the branding; the message reads like a coach talking,
 *     not the app narrating its own algorithm.
 *   - Descriptive strings (what an exercise does, what a week phase is for)
 *     likewise do not name the product, because no decision is attributed.
 *   - Every output passes the honesty test: "would this still be true if the
 *     user did nothing but kept logging?"
 *   - Numbers before narrative where applicable.
 *
 * JARGON BLOCKLIST -- these words must NEVER appear in any exported string:
 *   - Gym abbreviations: MEV, MAV, MRV, RIR, RPE, mesocycle, "junk volume"
 *   - Science jargon: "metabolic adaptation", "training stimulus",
 *     "stimulus-to-fatigue ratio"
 *   - Bare researcher surnames: Helms, Schoenfeld, Morton, Mountjoy, Eikey,
 *     Refalo, Trexler. Citations belong in InfoTooltip panels, not surface
 *     copy.
 *
 * Plain-language alternatives:
 *   metabolic adaptation     -> "your body has adjusted"
 *   training stimulus        -> "muscle growth signal"
 *   stimulus-to-fatigue ratio -> "training payoff"
 *
 * All explanations are short and plain English. No gym abbreviations, no
 * science jargon.
 */

// ---------------------------------------------------------------------------
// Internal jargon guard (development safety check)
// ---------------------------------------------------------------------------

// Word-boundary regex patterns. Word boundaries avoid false positives
// (e.g. "helmsman" does not match "Helms") while still catching surnames at
// start of string, after punctuation, or mid-sentence.
const JARGON_PATTERNS = [
  // Gym abbreviations
  { name: 'MEV', re: /\bMEV\b/ },
  { name: 'MAV', re: /\bMAV\b/ },
  { name: 'MRV', re: /\bMRV\b/ },
  { name: 'RIR', re: /\bRIR\b/ },
  { name: 'RPE', re: /\bRPE\b/ },
  { name: 'mesocycle', re: /\bmesocycle\b/i },
  { name: 'junk volume', re: /\bjunk volume\b/i },
  // Science jargon
  { name: 'metabolic adaptation', re: /\bmetabolic adaptation\b/i },
  { name: 'training stimulus', re: /\btraining stimulus\b/i },
  { name: 'stimulus-to-fatigue ratio', re: /\bstimulus-to-fatigue ratio\b/i },
  // Bare researcher surnames in surface copy. Citations belong in
  // InfoTooltip panels, not user-facing strings.
  { name: 'Helms', re: /\bHelms\b/ },
  { name: 'Schoenfeld', re: /\bSchoenfeld\b/ },
  { name: 'Morton', re: /\bMorton\b/ },
  { name: 'Mountjoy', re: /\bMountjoy\b/ },
  { name: 'Eikey', re: /\bEikey\b/ },
  { name: 'Refalo', re: /\bRefalo\b/ },
  { name: 'Trexler', re: /\bTrexler\b/ },
];

function assertNoJargon(str) {
  for (const { name, re } of JARGON_PATTERNS) {
    if (re.test(str)) {
      throw new Error(`Jargon detected in whyThis output: "${name}" in: "${str}"`);
    }
  }
  return str;
}

// Match the em/en-dash ban enforced in coachResponse.clean() and
// coachRegister (the house no-dash rule). Guards this older library so a
// dash can never ship from a "why this" string again.
function assertNoDash(str) {
  if (/[–—]/.test(str)) {
    throw new Error(`Em or en dash detected in whyThis output: "${str}"`);
  }
  return str;
}

function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    assertNoJargon(str);
    assertNoDash(str);
  }
  return str.trim();
}

// ---------------------------------------------------------------------------
// Exercise selection rationale templates
// Keyed by subregion tag; each returns a ≤ 25-word plain-English string.
// ---------------------------------------------------------------------------

const EXERCISE_WHY_TEMPLATES = {
  // Back subregions
  vertical_pull:    (name) => `${name} pulls the elbows down towards your hips, which is the best position for back width and shoulder-blade retraction.`,
  horizontal_row:   (name) => `${name} pulls the elbows back along your body. This angle is where your mid-back and rear shoulders work hardest.`,
  lower_lat:        (name) => `${name} emphasises the lower portion of the back that creates the V-shape taper from shoulders to waist.`,

  // Chest subregions
  incline:          (name) => `${name} works your upper chest: the part most people under-train, and the one that gives the chest a full, 3D look.`,
  flat:             (name) => `${name} spreads load across the whole chest and is the most efficient mass-builder for this group.`,
  decline:          (name) => `${name} targets the lower chest with reduced shoulder stress, useful for fuller lower-pec development.`,

  // Shoulder subregions
  overhead_press:   (name) => `${name} builds overall shoulder size and pressing strength. It is the most efficient shoulder exercise for both mass and function.`,
  lateral_raise:    (name) => `${name} isolates the side shoulder head, which is responsible for visible width when viewed from the front.`,
  face_pull:        (name) => `${name} works the small rear shoulder muscles that rotate the shoulder joint. Healthy shoulders and better posture.`,
  horiz_abduction:  (name) => `${name} pulls the arms apart against resistance, directly targeting the rear shoulder muscles often missed by pressing.`,

  // Hamstring subregions
  hip_extension:    (name) => `${name} works the hamstrings where they attach to the hip, where the most muscle growth potential sits.`,
  knee_flexion:     (name) => `${name} works the hamstrings where they attach at the knee. Curling movements are essential to cover the full muscle.`,

  // Tricep subregions
  overhead:         (name) => `${name} works the longest head of the tricep, which is only reachable when the arm is raised overhead. Often skipped.`,
  pushdown:         (name) => `${name} targets the outer tricep heads in the most joint-friendly position, making it good for volume accumulation.`,

  // Calf subregions
  gastro:           (name) => `${name} works the larger, upper calf muscle. Best trained with the knee straight for peak contraction.`,
  soleus:           (name) => `${name} targets the deeper calf muscle that only activates when the knee is bent, so it is necessary for complete calf development.`,

  // Ab subregions
  flexion:          (name) => `${name} trains the abs through their primary job of curling the spine. It is the most direct way to build ab thickness.`,
  anti_extension:   (name) => `${name} teaches the core to resist extension forces. This functional strength transfers directly to every heavy compound lift.`,
  rotation:         (name) => `${name} works the obliques through rotational resistance. These are the side abs that shape the waist.`,

  // Bicep subregions
  supinated_curl:   (name) => `${name} curls with the palm facing up, which is the most effective position for peak bicep activation.`,
  neutral_curl:     (name) => `${name} curls with a neutral palm. This reduces elbow stress and shifts some load to the brachialis for arm thickness.`,

  // Generic fallback
  default:          (name) => `${name} is the best fit for your kit, the muscle you're training and the time you've got this session.`,
};

/**
 * Returns a plain-language explanation for why an exercise was selected
 * based on its subregion tag.
 *
 * @param {string} exerciseName
 * @param {string} subregion     - subregion tag (e.g. 'vertical_pull', 'hip_extension')
 * @returns {string}
 */
export function getExerciseWhyThis(exerciseName, subregion) {
  const templateFn = EXERCISE_WHY_TEMPLATES[subregion] ?? EXERCISE_WHY_TEMPLATES.default;
  return clean(templateFn(exerciseName));
}

// ---------------------------------------------------------------------------
// Volume status templates (replaces MEV/MRV language)
// ---------------------------------------------------------------------------

/**
 * Returns a plain-English volume status message for a muscle group.
 *
 * @param {'below_minimum'|'optimal'|'approaching_limit'|'over_limit'} status
 * @param {string} muscleDisplayName  - e.g. 'Chest', 'Back'
 * @param {number} currentSets
 * @returns {string}
 */
export function getVolumeStatusMessage(status, muscleDisplayName, currentSets) {
  const messages = {
    below_minimum:     `${muscleDisplayName}: ${currentSets} sets this week. You can add a session or two if you want this muscle growing faster.`,
    optimal:           `${muscleDisplayName}: ${currentSets} sets this week, right in the range where muscle adapts best.`,
    approaching_limit: `${muscleDisplayName}: ${currentSets} sets this week, near the upper end. Good, but watch recovery. Volume pulls back if you get sore.`,
    over_limit:        `${muscleDisplayName}: ${currentSets} sets this week, more than your body can likely recover from. Next week's plan drops 2-3 sets.`,
  };
  return clean(messages[status] ?? `${muscleDisplayName}: ${currentSets} sets this week.`);
}

// ---------------------------------------------------------------------------
// Progression message templates
// ---------------------------------------------------------------------------

/**
 * Returns a plain-English progression suggestion message.
 *
 * @param {'add_weight'|'add_rep'|'hold'|'reduce'} action
 * @param {number|null} currentWeight
 * @param {number|null} suggestedWeight
 * @param {string} units  - 'kg' | 'lbs'
 * @returns {string}
 */
export function getProgressionMessage(action, currentWeight, suggestedWeight, units = 'kg') {
  const messages = {
    add_weight: suggestedWeight
      ? `Your next session moves to ${suggestedWeight}${units}. You completed every working set at the current weight.`
      : `Target weight goes up next session. Your current load is no longer challenging enough.`,
    add_rep:    `Weight stays the same, aim for one more rep next time.`,
    hold:       `Weight and reps stay steady. Match this performance before going heavier.`,
    reduce:     `Weight drops slightly to rebuild. Quality sets beat grinding reps.`,
  };
  return clean(messages[action] ?? `Continue as planned.`);
}

// ---------------------------------------------------------------------------
// Autoregulation message templates
// ---------------------------------------------------------------------------

/**
 * Returns a contextual plain-English message based on autoregulation action.
 *
 * @param {'continue'|'hold_volume'|'reduce_volume'|'deload_now'} action
 * @param {number} weeksInBlock - how many weeks into the current training block
 * @returns {string}
 */
export function getAutoRegMessage(action, weeksInBlock = 1) {
  const messages = {
    continue:      `Your recovery's holding. The plan stays as written.`,
    hold_volume:   `Your recovery scores dipped this week, so your session content stays the same. Sleep and protein are the levers.`,
    reduce_volume: `Your recovery's dropped. Next week loses 1-2 sets per exercise, so the next block starts fresher.`,
    deload_now:    `${weeksInBlock >= 4 ? `Good timing: you've been building for ${weeksInBlock} weeks.` : 'Your recovery is dropping.'} Next week is lighter: shorter sessions, same exercises, half the sets.`,
  };
  return clean(messages[action] ?? `Continue as planned.`);
}

// ---------------------------------------------------------------------------
// Week phase templates
// ---------------------------------------------------------------------------

/**
 * Returns a plain-language description of the current week's purpose.
 *
 * @param {'intro'|'build'|'peak'|'recovery'} phase
 * @param {number} week - 1-indexed
 * @returns {string}
 */
export function getWeekPhaseDescription(phase, week) {
  const descriptions = {
    intro:    `Week ${week}: Settle in. Focus on technique and finding the right weights. Don't push to your limit yet. The real work starts next week.`,
    build:    `Week ${week}: Time to push. You should finish most sets feeling like you could do 1 to 2 more reps but chose not to. That's the zone.`,
    peak:     `Week ${week}: Best effort. Give every set your full attention. This is the week where the most progress happens before the recovery week.`,
    recovery: `Week ${week}: Lighter week. Cut sets roughly in half, keep the same exercises and weights. Your muscles are rebuilding. Ease off and let them.`,
  };
  return clean(descriptions[phase] ?? `Week ${week}: Continue your training block.`);
}

// ---------------------------------------------------------------------------
// Split rationale templates
// ---------------------------------------------------------------------------

const SPLIT_RATIONALE = {
  full_body: `Every session trains all your muscle groups. Frequent practice of each movement builds skill and strength faster, which suits your training frequency well.`,
  upper_lower: `Alternating upper and lower sessions means every muscle gets trained twice a week with 48 to 72 hours of recovery between. The most proven structure for consistent progress.`,
  ppl: `Grouping muscles by movement (Push, Pull, Legs) means each group is fully rested before it trains again. Clean separation of recovery windows.`,
  ppl_ab: `Two Push / Pull / Legs rotations per week with different exercise choices (A and B). Each muscle group gets trained twice a week with varied exercises, which keeps progress moving.`,
  upper_lower_wp: `Upper-Lower on 4 days covers all muscle groups twice per week. The fifth session focuses entirely on your weaker areas, giving them extra attention where it matters most.`,
};

/**
 * Returns the split rationale string for a given split type.
 *
 * @param {string} splitType - 'full_body' | 'upper_lower' | 'ppl' | 'ppl_ab' | 'upper_lower_wp'
 * @returns {string}
 */
export function getSplitRationale(splitType) {
  return clean(SPLIT_RATIONALE[splitType] ?? `Split selected to match your available days and training level.`);
}

// ---------------------------------------------------------------------------
// Setup-complete receipt line (COMP-013 reveal moment)
// One short "we built this for you" line shown directly under the reveal
// headline. For a competition division it leads with the division identity
// and the muscle groups the engine actually prioritises (DIVISION_MATRIX /
// applyGoalOverlay); for the general goal it echoes the days committed and any
// weak points the engine acted on. Every claim is derivable from the same
// inputs buildWhyThis used — nothing the plan did not act on.
// COPY: blueprint copy, founder voice review at PR before merge to main.
// ---------------------------------------------------------------------------

const RECEIPT_DIVISION = {
  mens_physique:       "Built for Men's Physique. Shoulders and back width lead, midsection stays tight.",
  classic_physique:    'Built for Classic Physique. Balanced mass and proportion, waist kept tight.',
  bodybuilding:        'Built for Bodybuilding. Full development across every muscle group.',
  bikini:              'Built for Bikini. Glutes and hamstrings lead, upper body stays lean.',
  wellness:            'Built for Wellness. Glutes and legs lead, upper body stays balanced.',
  figure:              'Built for Figure. Shoulders and back width lead, athletic symmetry throughout.',
  womens_physique:     "Built for Women's Physique. Full upper-body development with balanced legs.",
  womens_bodybuilding: "Built for Women's Bodybuilding. Maximum development across every muscle group.",
};

function joinWithAnd(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Returns the reveal receipt line, or null to fall back to the generic sub.
 *
 * @param {object} opts
 * @param {string} opts.trainingGoal    - division key or 'general'
 * @param {string[]} [opts.weakPointLabels] - muscle labels the engine prioritised
 * @param {number} [opts.daysPerWeek]
 * @returns {string|null}
 */
export function getSetupReceiptLine({ trainingGoal, weakPointLabels = [], daysPerWeek } = {}) {
  const divisionLine = RECEIPT_DIVISION[trainingGoal];
  if (divisionLine) return clean(divisionLine);

  // General / non-division goal: lead with the commitment, echo weak points.
  const days = Number.isFinite(daysPerWeek) ? daysPerWeek : null;
  const base = days ? `Built around your ${days} days.` : 'Built around your plan.';
  const labels = (weakPointLabels || []).filter(Boolean).map(l => l.toLowerCase());
  if (labels.length) {
    return clean(`${base} Extra work on ${joinWithAnd(labels)}, like you asked.`);
  }
  return clean(base);
}

// ---------------------------------------------------------------------------
// Deload prediction message
// ---------------------------------------------------------------------------

/**
 * Returns a plain-English deload prediction message.
 *
 * @param {number|null} weeksUntilDeload - null if unknown
 * @param {string}      reason
 * @returns {string}
 */
export function getDeloadPredictionMessage(weeksUntilDeload, reason) {
  if (weeksUntilDeload === 0) {
    return clean(`A lighter week is scheduled. ${reason}`);
  }
  if (weeksUntilDeload === 1) {
    return clean(`A lighter week is coming up next. ${reason}`);
  }
  if (weeksUntilDeload != null) {
    return clean(`Your next lighter week is about ${weeksUntilDeload} weeks away. ${reason}`);
  }
  return clean(reason ?? `Keep building. A lighter week gets scheduled when your recovery calls for it.`);
}

// ---------------------------------------------------------------------------
// Time crunch message
// ---------------------------------------------------------------------------

/**
 * Generates a user-facing message summarising time crunch adjustments.
 *
 * @param {string[]} droppedExercises - names of exercises removed
 * @param {number}   restReductionPct - fraction removed from rest (0.30 = 30%)
 * @param {number}   newEstimatedMins - estimated duration after trim
 * @returns {string}
 */
export function getTimeCrunchMessage(droppedExercises, restReductionPct, newEstimatedMins) {
  const restPct = Math.round(restReductionPct * 100);
  const parts = [`Rest cut by ${restPct}%.`];
  if (droppedExercises.length === 1) {
    parts.push(`${droppedExercises[0]} removed to fit your time.`);
  } else if (droppedExercises.length > 1) {
    parts.push(`${droppedExercises.join(' and ')} removed to fit your time.`);
  }
  parts.push(`Estimated session: ${newEstimatedMins} minutes.`);
  return clean(parts.join(' '));
}

/**
 * COMP-013 starter-session banner. The first session is a true subset of the
 * user's real Day 1 — same lifts and order, just the first few exercises at a
 * couple of sets each — framed as the smart first step, never remedial. The
 * "full session starts next time" line sets the honest expectation.
 * COPY: blueprint copy, founder voice review at PR before merge to main.
 *
 * @param {string} routineName  - the real routine/day name
 * @param {number} exerciseCount - exercises kept in the starter
 * @param {number} [setsEach]    - sets per kept exercise (default 2)
 * @returns {string}
 */
export function getStarterSessionMessage(routineName, exerciseCount, setsEach = 2) {
  const name = routineName || 'your plan';
  const ex = `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`;
  return clean(`Short version of ${name}: ${ex}, ${setsEach} sets each. The full session starts next time.`);
}

// ---------------------------------------------------------------------------
// Travel mode message
// ---------------------------------------------------------------------------

/**
 * Generates a user-facing message explaining the travel plan.
 *
 * @param {string}   equipmentLabel  - e.g. 'Bodyweight only', 'Dumbbells only'
 * @param {number}   weeks           - duration of travel plan
 * @returns {string}
 */
export function getTravelModeMessage(equipmentLabel, weeks = 1) {
  return clean(
    `${weeks === 1 ? 'One-week' : `${weeks}-week`} travel plan built around ${equipmentLabel}. ` +
    `Higher reps and shorter rest periods maintain your muscle while you're away from the gym.`
  );
}

// ---------------------------------------------------------------------------
// Posing / conditioning message
// ---------------------------------------------------------------------------

/**
 * Returns a plain-English description of a posing or conditioning block addition.
 *
 * @param {'posing'|'conditioning'} type
 * @param {number}                  minutesPerSession
 * @param {number}                  weeksToComp - weeks until competition
 * @returns {string}
 */
export function getPosingConditioningMessage(type, minutesPerSession, weeksToComp) {
  if (type === 'posing') {
    return clean(
      `${minutesPerSession}-minute posing practice added after each session. ` +
      `With ${weeksToComp} weeks to the show, posing practice is non-negotiable. It is a skill that takes time to groove.`
    );
  }
  return clean(
    `${minutesPerSession}-minute low-impact cardio added after each session. ` +
    `This keeps you active and supports body-composition goals without eating into muscle recovery.`
  );
}

// ---------------------------------------------------------------------------
// COMP-015 — session autoregulation ("Today, adjusted for you")
//
// FOUNDER GATE: the user-facing strings below (the `shown` reason codes) are
// the blueprint's §4.4 proposed copy and go to founder review before the
// visible UI (Stage 4) ships. They are jargon-guarded by clean() like every
// other template here. The logged-only codes carry a plain reason_text for the
// adaptation_events record; they are never rendered to the user in v1.
//
// Voice: [muscle] + [plain cause with a day anchor] + [what changed today].
// Cause first. Numerals as the hero. No jargon, British English, no em dashes.
// ---------------------------------------------------------------------------

// Closed enum of session-adjustment reason codes. Namespaced `session_*` so
// weekly consumers (deload evaluation) never confuse them with weekly events.
export const SESSION_REASON_CODES = {
  DROP_RESIDUAL_SORENESS: 'session_drop_residual_soreness',
  ADD_UNDER_STIMULUS: 'session_add_under_stimulus',
  HOLD_JOINT: 'session_hold_joint',
  HOLD_STALE_SORENESS: 'session_hold_stale_soreness',
  HOLD_WEEKLY_PRECEDENCE: 'session_hold_weekly_precedence',
  HOLD_SAFETY: 'session_hold_safety',
  HOLD_USER_PREF: 'session_hold_user_pref',
};

// Codes whose reasonText is shown on the exercise card by default. The two
// HOLD precedence codes are shown only after a "Sharp" pre-session answer
// (decided in computeSessionAdjustments, not here); HOLD_JOINT is shown only
// when the existing joint-guidance line is already up (a Stage-4 UI concern).
// Everything else is logged-only.
export const SESSION_SHOWN_CODES = new Set([
  SESSION_REASON_CODES.DROP_RESIDUAL_SORENESS,
  SESSION_REASON_CODES.ADD_UNDER_STIMULUS,
]);

// Check-in soreness chips use display names; the engine keys are lowercase.
// Shoulders fans out to the three delt heads, Core maps to abs, the rest are
// 1:1 lowercase. Exported and tested (one shared map, no duplicate elsewhere).
export const CHECKIN_MUSCLE_MAP = {
  Chest: ['chest'],
  Back: ['back'],
  Shoulders: ['side_delts', 'rear_delts', 'front_delts'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quads'],
  Hamstrings: ['hamstrings'],
  Glutes: ['glutes'],
  Calves: ['calves'],
  Core: ['abs'],
};

/**
 * Plain-English line for a session adjustment.
 *
 * @param {string} reasonCode    one of SESSION_REASON_CODES
 * @param {object} opts
 * @param {string} opts.muscleName  display name, e.g. "Rear delts"
 * @param {string} [opts.dayName]   weekday anchor for residual soreness, e.g. "Friday"
 * @param {'recent'|'checkin'} [opts.source]  drives the residual-soreness variant
 * @returns {string}
 */
export function getSessionAdjustmentMessage(reasonCode, opts = {}) {
  const { muscleName = 'This muscle', dayName, source } = opts;
  const lower = muscleName.toLowerCase();
  const C = SESSION_REASON_CODES;
  let msg;
  switch (reasonCode) {
    case C.DROP_RESIDUAL_SORENESS:
      msg = source === 'checkin'
        ? `You flagged sore ${lower} at check-in. 1 set fewer on ${lower} today.`
        : dayName
          ? `${muscleName} is still sore from ${dayName}. 1 set fewer today.`
          : `${muscleName} is still sore. 1 set fewer today.`;
      break;
    case C.ADD_UNDER_STIMULUS:
      msg = `${muscleName} recovered fast and last session was strong. 1 set added today.`;
      break;
    case C.HOLD_WEEKLY_PRECEDENCE:
      msg = `Feeling sharp, but this is a lighter week. Sets stay as planned.`;
      break;
    case C.HOLD_SAFETY:
      msg = `Feeling sharp, but recovery comes first this week. Sets stay as planned.`;
      break;
    // Logged-only codes: plain reason_text for the adaptation_events record.
    case C.HOLD_JOINT:
      msg = `${muscleName}: recent joint discomfort. Sets held as planned.`;
      break;
    case C.HOLD_STALE_SORENESS:
      msg = `${muscleName}: soreness looks systemic or stale. Holding sets; the weekly review owns this.`;
      break;
    case C.HOLD_USER_PREF:
      msg = `${muscleName}: you have overridden recent adjustments here, so sets stay as planned.`;
      break;
    default:
      msg = `${muscleName}: sets stay as planned.`;
  }
  return clean(msg);
}

// ---------------------------------------------------------------------------
// ED-pattern lockout copy (Move #2, locked verbatim in
// MOVE_2_ED_PATTERN_DETECTION.md). Both variants render inside the
// HeldDecisionsCard via a richer layout, not as a plain reason
// string, so we expose structured copy fields rather than a single
// sentence. Identical for free, pro, complete users.
// ---------------------------------------------------------------------------

export const ED_PATTERN_LOCKOUT_COPY = {
  header: 'Held this week',
  title: 'We\'ve held your calorie cut',
  body:
    "We've held your calorie cut. We've noticed a few signals together: your weight has been dropping faster than your intake suggests, your energy scores have been low, and your food log shows you eating less than your target for a few weeks running.\n\n" +
    "Even when a cut is going well in numbers, sustained low energy is a safety signal. We'd rather pause than push.\n\n" +
    "Once your fuelling and energy recover for two weeks, we'll suggest new targets.",
  bodyGoalLockExtension:
    "You set a goal lock for an aggressive cut, so we've held off until three signals stacked up instead of two. That happened this week.",
  ctaSupport: 'Get support',
  ctaReadMore: 'Read more about why',
  bottomNote:
    "You can keep using Volyume normally. Your weight log, food diary, training, and check-ins all continue. Only the calorie target stops shifting.",
  // Tooltip body for the "Read more about why" InfoTooltip.
  readMoreBody:
    "Low energy that sticks around alongside fast weight loss is the body's signal that fuel intake is too low for what training is demanding. The condition has a name in sports medicine: relative energy deficiency. It shows up first as low energy, then in training quality, then in hormones and bone health.\n\n" +
    "Volyume waits for two or more of these signals to stack before holding the cut. One signal on its own is normal: people have low-energy weeks. The pattern that worries us is the combination.\n\n" +
    "The hold is not a punishment. It's a pause while your numbers settle. Once your energy scores recover and your intake catches up for two weeks, the engine starts adjusting again.",
};

export const ED_PATTERN_CLEARED_COPY = {
  header: 'Hold lifted',
  title: 'Your numbers are looking better',
  body:
    "The signals that triggered the hold have settled for two weeks. Standard coach output resumes, and new calorie targets land at the next weekly run.\n\n" +
    "Energy recovery is more durable than a fast return to a deep cut.",
};

// Locked copy for Move #3 (upward gate compression). When weekly loss
// exceeds -1.5% AND energy is low (<= 2), Precision Coaching bypasses
// the standard two-week cooldown and applies an upward calorie
// correction immediately. The held-decision card surfaces the change
// to the user so the move isn't silent. Identical for free, pro,
// complete users -- safety output is tier-blind.
export const RAPID_LOSS_CORRECTED_COPY = {
  header: 'Acted this week',
  title: "We've added calories straight away",
  body:
    "Your weight dropped more than 1.5% this week and your energy is low. We're not waiting two weeks to react; we've bumped your daily target up immediately.\n\n" +
    "This isn't a punishment for hitting your goal too fast. It's a safety call. Steady is the goal.",
};

// Locale-appropriate eating disorder support links (locked).
export const ED_SUPPORT_LINKS = {
  'en-GB': { name: 'Beat',       url: 'https://www.beateatingdisorders.org.uk' },
  'en-US': { name: 'NEDA',       url: 'https://www.nationaleatingdisorders.org' },
  'en-AU': { name: 'Butterfly',  url: 'https://butterfly.org.au' },
  default: { name: 'Beat',       url: 'https://www.beateatingdisorders.org.uk' },
};

export function getEdSupportLink(locale) {
  if (!locale) return ED_SUPPORT_LINKS.default;
  if (ED_SUPPORT_LINKS[locale]) return ED_SUPPORT_LINKS[locale];
  // Fallback by language prefix.
  const lang = String(locale).split(/[-_]/)[0]?.toLowerCase();
  if (lang === 'en') return ED_SUPPORT_LINKS.default;
  return ED_SUPPORT_LINKS.default;
}

// ---------------------------------------------------------------------------
// Jargon blocklist check (for testing, call on any string before display)
// ---------------------------------------------------------------------------

/**
 * Returns true if the string contains no jargon from the blocklist.
 * Use in tests to validate all output strings.
 *
 * @param {string} str
 * @returns {{ clean: boolean, violations: string[] }}
 */
export function checkJargon(str) {
  const violations = JARGON_PATTERNS.filter(({ re }) => re.test(str)).map(({ name }) => name);
  return { clean: violations.length === 0, violations };
}
