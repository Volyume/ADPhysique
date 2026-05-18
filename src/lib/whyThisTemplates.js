/**
 * whyThisTemplates.js
 * Plain-language template library for user-facing exercise and plan explanations.
 *
 * JARGON BLOCKLIST — these words must NEVER appear in any exported string:
 *   MEV, MAV, MRV, RIR, RPE, mesocycle, deload (as noun), "junk volume"
 *
 * All explanations are ≤ 30 words unless the context specifically warrants more.
 * All explanations are in plain English — no gym abbreviations, no science jargon.
 */

// ---------------------------------------------------------------------------
// Internal jargon guard (development safety check)
// ---------------------------------------------------------------------------

const JARGON_BLOCKLIST = ['MEV', 'MAV', 'MRV', ' RIR', ' RPE', 'mesocycle', 'junk volume'];

function assertNoJargon(str) {
  for (const term of JARGON_BLOCKLIST) {
    if (str.includes(term)) {
      throw new Error(`Jargon detected in whyThis output: "${term}" in: "${str}"`);
    }
  }
  return str;
}

function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) assertNoJargon(str);
  return str.trim();
}

// ---------------------------------------------------------------------------
// Exercise selection rationale templates
// Keyed by subregion tag; each returns a ≤ 25-word plain-English string.
// ---------------------------------------------------------------------------

const EXERCISE_WHY_TEMPLATES = {
  // Back subregions
  vertical_pull:    (name) => `${name} pulls the elbows down toward your hips — the best position for back width and shoulder-blade retraction.`,
  horizontal_row:   (name) => `${name} pulls the elbows back along your body — this angle is where your mid-back and rear shoulders work hardest.`,
  lower_lat:        (name) => `${name} emphasises the lower portion of the back that creates the V-shape taper from shoulders to waist.`,

  // Chest subregions
  incline:          (name) => `${name} works your upper chest — the part most people under-train, and the one that gives the chest a full, 3-D look.`,
  flat:             (name) => `${name} spreads load across the whole chest and is the most efficient mass-builder for this group.`,
  decline:          (name) => `${name} targets the lower chest with reduced shoulder stress, useful for fuller lower-pec development.`,

  // Shoulder subregions
  overhead_press:   (name) => `${name} builds overall shoulder size and pressing strength — the most efficient shoulder exercise for both mass and function.`,
  lateral_raise:    (name) => `${name} isolates the side shoulder head — the one responsible for visible width when viewed from the front.`,
  face_pull:        (name) => `${name} works the small rear shoulder muscles that rotate the shoulder joint. Healthy shoulders and better posture.`,
  horiz_abduction:  (name) => `${name} pulls the arms apart against resistance — directly targeting the rear shoulder muscles often missed by pressing.`,

  // Hamstring subregions
  hip_extension:    (name) => `${name} works the hamstrings where they attach to the hip — this is where the most muscle growth potential sits.`,
  knee_flexion:     (name) => `${name} works the hamstrings where they attach at the knee — curling movements are essential to cover the full muscle.`,

  // Tricep subregions
  overhead:         (name) => `${name} works the longest head of the tricep — only reachable when the arm is raised overhead, often skipped.`,
  pushdown:         (name) => `${name} targets the outer tricep heads in the most joint-friendly position — good for volume accumulation.`,

  // Calf subregions
  gastro:           (name) => `${name} works the larger, upper calf muscle — best trained with the knee straight for peak contraction.`,
  soleus:           (name) => `${name} targets the deeper calf muscle that only activates when the knee is bent — necessary for complete calf development.`,

  // Ab subregions
  flexion:          (name) => `${name} trains the abs through their primary job of curling the spine — the most direct way to build ab thickness.`,
  anti_extension:   (name) => `${name} teaches the core to resist extension forces — functional strength that directly transfers to every heavy compound lift.`,
  rotation:         (name) => `${name} works the obliques through rotational resistance — the side abs that shape the waist.`,

  // Bicep subregions
  supinated_curl:   (name) => `${name} curls with the palm facing up — the most effective position for peak bicep activation.`,
  neutral_curl:     (name) => `${name} curls with a neutral palm — reduces elbow stress and shifts some load to the brachialis for arm thickness.`,

  // Generic fallback
  default:          (name) => `${name} was selected as the best match for your equipment, muscle group, and available time this session.`,
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
    below_minimum:     `${muscleDisplayName}: only ${currentSets} sets this week — add at least one or two more sessions to keep this muscle growing.`,
    optimal:           `${muscleDisplayName}: ${currentSets} sets this week — right in the range where muscle adapts best.`,
    approaching_limit: `${muscleDisplayName}: ${currentSets} sets this week — near the upper end. Good, but watch recovery. Reduce if soreness builds.`,
    over_limit:        `${muscleDisplayName}: ${currentSets} sets this week — more than your body can likely recover from. Cut 2–3 sets next week.`,
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
      ? `Move to ${suggestedWeight}${units} next session — you've earned the extra weight.`
      : `Add a little weight next session — your current load is no longer challenging enough.`,
    add_rep:    `Same weight, push for one more rep next time.`,
    hold:       `Keep the same weight and reps — match this performance before going heavier.`,
    reduce:     `Drop the weight slightly and rebuild — quality sets beat grinding reps.`,
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
    continue:      `You're recovering well — continue the plan as written. This is what good progress feels like.`,
    hold_volume:   `Training is feeling hard. Keep your session content the same this week — don't add anything new. Focus on sleep and protein.`,
    reduce_volume: `Your body is asking for less right now. Cut 1–2 sets per exercise this week and come back stronger next week.`,
    deload_now:    `${weeksInBlock >= 4 ? 'Good timing — you\'ve been building for a few weeks.' : 'Your body is telling you it needs a breather.'} Take a lighter week: shorter sessions, same exercises, half the sets.`,
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
    intro:    `Week ${week}: Settle in. Focus on technique and finding the right weights. Don't push to your limit yet — the real work starts next week.`,
    build:    `Week ${week}: Time to push. You should finish most sets feeling like you could do 1–2 more reps but chose not to. That's the zone.`,
    peak:     `Week ${week}: Best effort. Give every set your full attention. This is the week that earns the most adaptation before the rest week.`,
    recovery: `Week ${week}: Lighter week. Cut sets roughly in half, keep the same exercises and weights. Your muscles are rebuilding — trust the process.`,
  };
  return clean(descriptions[phase] ?? `Week ${week}: Continue your training block.`);
}

// ---------------------------------------------------------------------------
// Split rationale templates
// ---------------------------------------------------------------------------

const SPLIT_RATIONALE = {
  full_body: `Every session trains all your muscle groups. Frequent practice of each movement builds skill and strength faster — ideal for your training frequency.`,
  upper_lower: `Alternating upper and lower sessions means every muscle gets trained twice a week with 48–72 hours of recovery between. The most proven structure for consistent progress.`,
  ppl: `Grouping muscles by movement (Push, Pull, Legs) means each group is fully rested before it trains again. Clean separation of recovery windows.`,
  ppl_ab: `Two Push / Pull / Legs rotations per week with different exercise choices (A and B). Twice-weekly frequency with varied stimulus — needed for continued progress at your level.`,
  upper_lower_wp: `Upper-Lower on 4 days covers all muscle groups twice per week. The fifth session focuses entirely on your lagging muscles — targeted extra attention where it matters most.`,
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
    return clean(`Now is a good time for a lighter week. ${reason}`);
  }
  if (weeksUntilDeload === 1) {
    return clean(`A lighter week is likely coming up next week. ${reason}`);
  }
  if (weeksUntilDeload != null) {
    return clean(`You're ${weeksUntilDeload} weeks from your next lighter week. ${reason}`);
  }
  return clean(reason ?? `Continue building — a lighter week will come when your body needs it.`);
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
  const parts = [`Rest reduced by ${restPct}%.`];
  if (droppedExercises.length === 1) {
    parts.push(`${droppedExercises[0]} removed to fit your time.`);
  } else if (droppedExercises.length > 1) {
    parts.push(`${droppedExercises.join(' and ')} removed to fit your time.`);
  }
  parts.push(`Estimated session: ${newEstimatedMins} minutes.`);
  return clean(parts.join(' '));
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
      `With ${weeksToComp} weeks to the show, this is non-negotiable — posing is a skill that takes time to groove.`
    );
  }
  return clean(
    `${minutesPerSession}-minute low-impact cardio added after each session. ` +
    `This keeps you active and supports body-composition goals without eating into muscle recovery.`
  );
}

// ---------------------------------------------------------------------------
// Jargon blocklist check (for testing — call on any string before display)
// ---------------------------------------------------------------------------

/**
 * Returns true if the string contains no jargon from the blocklist.
 * Use in tests to validate all output strings.
 *
 * @param {string} str
 * @returns {{ clean: boolean, violations: string[] }}
 */
export function checkJargon(str) {
  const violations = JARGON_BLOCKLIST.filter(term => str.includes(term));
  return { clean: violations.length === 0, violations };
}
