/**
 * whyThisTemplates.js
 * Plain-language template library for user-facing exercise and plan explanations.
 *
 * Voice rules from docs/COACHING_VOICE_SYNTHESIS_LOCKED.md:
 *   - Precision Coaching is the named decider for engine actions
 *     (volume holds, weight changes, scheduled deloads).
 *   - Descriptive strings (what an exercise does, what a week phase is for)
 *     do not name Precision Coaching because no decision is being attributed.
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
  vertical_pull:    (name) => `${name} pulls the elbows down toward your hips, which is the best position for back width and shoulder-blade retraction.`,
  horizontal_row:   (name) => `${name} pulls the elbows back along your body. This angle is where your mid-back and rear shoulders work hardest.`,
  lower_lat:        (name) => `${name} emphasises the lower portion of the back that creates the V-shape taper from shoulders to waist.`,

  // Chest subregions
  incline:          (name) => `${name} works your upper chest: the part most people under-train, and the one that gives the chest a full, 3-D look.`,
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
    below_minimum:     `${muscleDisplayName}: ${currentSets} sets this week. Precision Coaching can add a session or two if you want this muscle growing faster.`,
    optimal:           `${muscleDisplayName}: ${currentSets} sets this week, right in the range where muscle adapts best.`,
    approaching_limit: `${muscleDisplayName}: ${currentSets} sets this week, near the upper end. Good, but watch recovery. Precision Coaching will pull volume back if soreness builds.`,
    over_limit:        `${muscleDisplayName}: ${currentSets} sets this week, more than your body can likely recover from. Precision Coaching has cut 2-3 sets from next week's plan.`,
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
      ? `Precision Coaching has moved your next session to ${suggestedWeight}${units}. You completed every working set at the current weight.`
      : `Precision Coaching has lifted the target weight for next session. Your current load is no longer challenging enough.`,
    add_rep:    `Precision Coaching is holding the weight and asking for one more rep next time.`,
    hold:       `Precision Coaching is holding the weight and reps steady. Match this performance before going heavier.`,
    reduce:     `Precision Coaching has dropped the weight slightly to rebuild. Quality sets beat grinding reps.`,
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
    continue:      `Recovery scores are holding. Precision Coaching is keeping the plan as written. This is what good progress feels like.`,
    hold_volume:   `Training is showing strain. Precision Coaching is holding your session content the same this week. Focus on sleep and protein.`,
    reduce_volume: `Recovery scores have dropped. Precision Coaching has cut 1-2 sets per exercise this week. Come back stronger next week.`,
    deload_now:    `${weeksInBlock >= 4 ? `Good timing: you've been building for ${weeksInBlock} weeks.` : 'Recovery scores are flagging.'} Precision Coaching has scheduled a lighter week: shorter sessions, same exercises, half the sets.`,
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
    build:    `Week ${week}: Time to push. You should finish most sets feeling like you could do 1–2 more reps but chose not to. That's the zone.`,
    peak:     `Week ${week}: Best effort. Give every set your full attention. This is the week where the most progress happens before the recovery week.`,
    recovery: `Week ${week}: Lighter week. Cut sets roughly in half, keep the same exercises and weights. Your muscles are rebuilding. Trust the process.`,
  };
  return clean(descriptions[phase] ?? `Week ${week}: Continue your training block.`);
}

// ---------------------------------------------------------------------------
// Split rationale templates
// ---------------------------------------------------------------------------

const SPLIT_RATIONALE = {
  full_body: `Every session trains all your muscle groups. Frequent practice of each movement builds skill and strength faster, which suits your training frequency well.`,
  upper_lower: `Alternating upper and lower sessions means every muscle gets trained twice a week with 48–72 hours of recovery between. The most proven structure for consistent progress.`,
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
    return clean(`Precision Coaching has scheduled a lighter week. ${reason}`);
  }
  if (weeksUntilDeload === 1) {
    return clean(`Precision Coaching expects a lighter week next week. ${reason}`);
  }
  if (weeksUntilDeload != null) {
    return clean(`Precision Coaching expects your next lighter week in ${weeksUntilDeload} weeks. ${reason}`);
  }
  return clean(reason ?? `Continue building. Precision Coaching will schedule a lighter week when recovery scores call for it.`);
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
  const parts = [`Precision Coaching has cut rest by ${restPct}%.`];
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
      `With ${weeksToComp} weeks to the show, posing practice is non-negotiable. It is a skill that takes time to groove.`
    );
  }
  return clean(
    `${minutesPerSession}-minute low-impact cardio added after each session. ` +
    `This keeps you active and supports body-composition goals without eating into muscle recovery.`
  );
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
    "The signals that triggered the hold have settled for two weeks. We're back to the standard coach output. New calorie targets land at the next weekly run.\n\n" +
    "Take this gently. Energy recovery beats rushing back into a deep cut.",
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
  const violations = JARGON_PATTERNS.filter(({ re }) => re.test(str)).map(({ name }) => name);
  return { clean: violations.length === 0, violations };
}
