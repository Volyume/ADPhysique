// U-B-9 / U-F-5 / U-D-3 / U-E-1 / U-E-2 (M1): the single static, authored
// glossary for the jargon-translation layer. Tooltip-length, British English,
// founder-signed-off 2026-06-13 (_SPEC-006). NO dynamic generation, NO AI; a
// deterministic map only. Each gloss is grounded in the Methodology page or a
// shipping tooltip where one existed; the rest are founder-authored.
//
// Surfaces read these via InfoTooltip / on-screen legends. The U-B-9 tone layer
// decides WHETHER to show a gloss (Supportive/free → show; Precise → native
// numbers), it does not change the strings.
export const GLOSSARY = {
  precisionCoaching:
    'Every week it reads your weight trend, check-in and training, compares what happened to what was expected, and explains the decision. Nothing is random.',
  volume:
    'The total work for a muscle: the working sets you do for it in a week.',
  deload:
    'A lighter planned week so you recover: lighter loads, full recovery, no PRs.',
  maintenanceCalories:
    'The daily calories that keep your weight steady: the starting point a change is measured from.',
  refeed:
    'A planned higher-carb day on an aggressive cut, to ease fatigue.',
  macroCycle:
    'Alternating higher- and lower-carb days across the week.',
  estMax:
    'An estimate of the most you could lift once, worked out from your recent sets. You never have to test it.',
  // D93 (Campaign 2, Phase 3): the app's most-repeated achievement term
  // finally gets its definition. One meaning everywhere: a PR is any of
  // the three record kinds, and never requires a max-out attempt.
  pr:
    'A personal record: a new best for you on an exercise. It can be your heaviest weight, your most reps at a weight, or a new estimated max. Any of the three counts, and it never needs a one-rep max attempt. PRs are the clearest sign your training is working.',
  effort:
    'How close to failure the set should feel: 5 = leave nothing, 0 = very easy.',
  volumeBands:
    "How much you've trained a muscle this week vs the helpful range. “Too much” = past the point of extra benefit, not dangerous.",
  repRegression:
    'Your average reps for a lift have trended down over recent weeks.',
  adaptiveTdee:
    'Our running estimate of the calories you burn a day, updated from your weight trend.',
  ewma:
    'A smoothed version of your weight that ignores day-to-day noise.',
  mesocycle:
    'A training block: a few weeks that ease in, build, push, then recover.',
  // D93 (Campaign 2, Phase 5): the why is the block's effort ladder - a
  // PRESCRIPTION, not a user report (per-set RIR entry is settled-removed),
  // so the gloss claims planning, never measurement.
  rir:
    "Reps in reserve: how many reps you'd have left; “stop 2 short” means finish the set when you believe you could still do about 2 good reps. Most weeks leave reps in reserve, building effort as the block goes on, so progress never depends on taking every set to failure.",
  strengthLevel:
    'Where your estimated max sits against typical lifters at your bodyweight.',
  // U-E-1 onboarding term (drafted 2026-06-13, grounded in the methods themselves;
  // founder reviewing wording per _SPEC-006).
  bodyFatMethod:
    'How a body fat % was measured: Visual (eyeballed), BIA (a bioelectrical scale or handheld), Caliper (a skinfold pinch), DEXA (a clinical scan, the most accurate).',
  // U-E-1 / U-D-3 / U-F-5 terms: founder approved drafts 2026-06-13 (_SPEC-006).
  engineLog:
    'A plain record of what Precision Coaching changed in your training, and why.',
  division:
    "The category you'd compete in (e.g. bodybuilding, classic physique, bikini); your plan is tailored to what that division is judged on.",
  phase:
    'Your current aim: lose fat (cut), gain muscle slowly (lean-gain) or hold steady (maintain).',
  macros:
    'Protein, carbs and fat: the three nutrients your daily calories are made of.',
  proteinTier:
    'How high your protein target is set: Standard, Optimised (the recommended balance) or Advanced (higher, for harder cuts and competitors). Based on your bodyweight, or your lean mass if you have logged a measured body-fat reading.',
  recomposition:
    'Your weight held steady while your shape or strength kept improving. A sign fat and muscle are both changing, even though the scale is not moving.',
  // Footer credential line ("volume landmarks, autoregulation, and RED-S
  // safety limits"): founder-approved copy, 2026-07-09.
  autoregulation:
    "Adjusting your training and targets week to week based on how you're actually recovering and performing, rather than following a fixed plan regardless.",
  redS:
    'Relative Energy Deficiency in Sport: when the body runs on too little energy, for too long, to fully support training and health. Your coach watches for the early signals so your plan stays safe.',
  // NV-2 (ux-world-class-audit-2026-07-09/cohesion-02-novice-psychology.md):
  // matches the live-session "Superset coming up" walkthrough
  // (ActiveWorkoutScreen.js's supersetHeadsUp modal) so the builder and the
  // session teach the same thing.
  superset:
    'Two or more exercises done back-to-back with no rest between them, then a full rest before repeating.',
  // NV-4: baseline vocabulary glosses for the "never lifted" persona, so the
  // two most foundational training words in the product are defined
  // somewhere. Self-naming (like rir/redS above) since these surface as a
  // standalone note rather than beside an already-labelled term.
  set:
    'A set is a number of reps done one after another, then a rest before the next set.',
  rep:
    'A rep is one full repetition of an exercise, like one push-up or one squat.',
  // O24 (comprehension-and-trust audit 2026-08-06): the streak criterion
  // (weekly target, deload weeks counting, the one forgiven week) is only
  // ever explained by ConsistencyEcho's one-time dismissable explainer, so
  // it becomes unlearnable after the first dismissal. Grounded in the real
  // rules in src/lib/streak.js (labelBase, applyRepair) and
  // src/hooks/useWeeklyStreak.js: a week is 'kept' when completed sessions
  // meet the target (plan-derived, or the user's own goal); an engine
  // deload week is 'resting' and keeps the run with zero sessions; a single
  // missed week is 'repaired' (forgiven) when the week before and the week
  // after both keep the run, capped at one repair per rolling six weeks.
  // Shared by ConsistencyEcho and WeeklyStreakStrip so the wording can never
  // diverge between the two surfaces.
  streakWeeks:
    'Your run counts weeks where you hit your weekly session target, from your plan or your own goal. Recovery weeks always count, since recovery is part of training. Miss a week and bounce back, and it is forgiven once every six weeks, so one off week never breaks your run.',
  // O2 (comprehension-and-trust audit 2026-08-06): the Volyume Score's
  // one-time meaning moment (ProgressScanMeaningMoment.js, exact copy in
  // progressScanResultsContract.js's MEANING_MOMENT_BODY) is shown once ever
  // and never reachable again, so a persistent InfoTooltip with the same
  // framing is needed on every surface that renders the score. Reused
  // verbatim across ProgressPhotosScreen's score grid, AthleteProfileScreen's
  // score tile and ProgressScanTrend's marker legend so the explanation can
  // never diverge. Body-image-adjacent: no praise/shame language, no
  // targets. The marker-shape clause matches ProgressScanTrend.js's real
  // encoding (markerShapeForTier in progressScanTrendViewModel.js): solid
  // for high/moderate confidence, hollow for low, dashed when there was not
  // enough to score.
  volyumeScore:
    'The Volyume Score is a progress read from your own photos, controlled for pose and lighting so scores can be compared set to set. The band shows your current range and the confidence tag shows how reliable this particular read is; on the trend view that becomes the marker shape, filled for high or moderate confidence, hollow for low confidence, dashed when there was not enough to score. It is not a body fat measurement, a medical assessment, or a comparison with anyone else.',
  // O22 (comprehension-and-trust audit 2026-08-06): BlockReflectionScreen's
  // stat row has zero tooltips on the one screen meant to summarise a block
  // in plain language. workingSets is deliberately NOT the "effort checked"
  // framing O27 flagged as wrong elsewhere (WorkoutSummaryScreen.js's own
  // Working Sets tooltip) -- counting is by set TYPE (warm-up vs not), never
  // by how a set felt.
  workingSets:
    'Every set you logged this block, not counting warm-ups.',
  // Distinct from GLOSSARY.volume (a muscle's weekly hard-set count): this is
  // the block's total weight moved, the same tonnage concept T24/O20 renamed
  // elsewhere to "Total lifted". BlockReflectionScreen keeps its own
  // "Volume" label (out of this finding's scope) but this tooltip stops it
  // being confused with the app's other Volume.
  tonnage:
    "The total weight moved: every set's weight times reps, added up across the block.",
};
