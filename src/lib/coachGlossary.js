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
    'The total work for a muscle: the hard sets you do for it in a week.',
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
  effort:
    'How close to failure the set should feel: 5 = leave nothing, 0 = very easy.',
  volumeBands:
    "How much you've trained a muscle this week vs the helpful range. “Over limit” = past the point of extra benefit, not dangerous.",
  repRegression:
    'Your average reps for a lift have trended down over recent weeks.',
  adaptiveTdee:
    'Our running estimate of the calories you burn a day, updated from your weight trend.',
  ewma:
    'A smoothed version of your weight that ignores day-to-day noise.',
  mesocycle:
    'A training block: a few weeks that ease in, build, push, then recover.',
  rir:
    "Reps in reserve: how many reps you'd have left; “stop 2 short” means leave 2 in the tank.",
  strengthLevel:
    'Where your estimated max sits against typical lifters at your bodyweight.',
  // U-E-1 onboarding term (drafted 2026-06-13, grounded in the methods themselves;
  // founder reviewing wording per _SPEC-006).
  bodyFatMethod:
    'How a body fat % was measured: Visual (eyeballed), BIA (a bioelectrical scale or handheld), Caliper (a skinfold pinch), DEXA (a clinical scan, the most accurate).',
  // U-E-1 / U-D-3 / U-F-5 terms: founder approved drafts 2026-06-13 (_SPEC-006).
  engineLog:
    'A plain record of what the Coach changed in your training, and why.',
  division:
    "The category you'd compete in (e.g. bodybuilding, classic physique, bikini); your plan is tailored to what that division is judged on.",
  phase:
    'Your current aim: lose fat (cut), gain muscle slowly (lean-gain) or hold steady (maintain).',
  macros:
    'Protein, carbs and fat: the three nutrients your daily calories are made of.',
  proteinTier:
    'How high your protein target is set per kilo of bodyweight: Standard, Optimised (the recommended balance) or Advanced (higher, for harder cuts and competitors).',
  recomposition:
    'Your weight held steady while your shape or strength kept improving. A sign fat and muscle are both changing, even though the scale is not moving.',
  // Footer credential line ("volume landmarks, autoregulation, and RED-S
  // safety limits"): founder-approved copy, 2026-07-09.
  autoregulation:
    "Adjusting your training and targets week to week based on how you're actually recovering and performing, rather than following a fixed plan regardless.",
  redS:
    'Relative Energy Deficiency in Sport: when the body runs on too little energy, for too long, to fully support training and health. Your coach watches for the early signals so your plan stays safe.',
};
