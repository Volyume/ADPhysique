// U-B-9 / U-F-5 / U-D-3 / U-E-1 / U-E-2 (M1): the single static, authored
// glossary for the jargon-translation layer. Tooltip-length, British English,
// founder-signed-off 2026-06-13 (_SPEC-006). NO dynamic generation, NO AI — a
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
    'The total work for a muscle — the hard sets you do for it in a week.',
  deload:
    'A lighter planned week so you recover — lighter loads, full recovery, no PRs.',
  maintenanceCalories:
    'The daily calories that keep your weight steady — the starting point a change is measured from.',
  refeed:
    'A planned higher-carb day on an aggressive cut, to ease fatigue.',
  macroCycle:
    'Alternating higher- and lower-carb days across the week.',
  estMax:
    'An estimate of the most you could lift once, worked out from your recent sets — you never have to test it.',
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
    'A training block — a few weeks that ease in, build, push, then recover.',
  rir:
    "Reps in reserve — how many reps you'd have left; “stop 2 short” = leave 2 in the tank.",
  strengthLevel:
    'Where your estimated max sits against typical lifters at your bodyweight.',
};
