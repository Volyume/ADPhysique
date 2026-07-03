# R4 — ED-Safety Evidence for Progress Photos

**Research lead:** Safety research (VOLYUME)
**Date:** 2026-07-03
**Scope:** Evidence base for when progress photos and body-comparison surfaces help
vs. harm, and how careful products mitigate. This file is EVIDENCE ONLY — it
recommends, it does not change app code.

**Evidence tags:** `[DOCUMENTED]` = peer-reviewed / clinical / reputable-org
source cited. `[INFERRED]` = reasoned from the evidence and this app's
constitution, not a direct citation.

> **Headline:** The evidence does not say "progress photos are safe" or
> "progress photos are dangerous." It says the *design around* the photo decides
> which one you get. The same photo can be a neutral self-monitoring cue or a
> body-checking trigger depending on frequency, framing, comparison target, and
> whether it is welded to a number. VOLYUME's existing `ProgressPhotosScreen`
> already sits on the safe side of most of these lines; this document pins WHY,
> and where the remaining red lines are.

---

## Q1 — ADHERENCE / BENEFIT: when photos genuinely help

**Self-monitoring is one of the most robust behaviour-change tools we have.**
`[DOCUMENTED]` A systematic review of self-monitoring in weight management found a
"consistent and significant positive relationship between self-monitoring diet,
physical activity or weight and successful outcomes" (Burke et al., *Self-Monitoring
in Weight Loss: A Systematic Review*, PMC3268700). Photographic self-monitoring is
an established, lower-burden variant — reviews of dietary self-monitoring
explicitly note "simplification of recording through smartphone photo features" as
a way to reduce the tracking burden that otherwise erodes adherence (Public Health
Nutrition systematic review, PMC8928602).

**The benefit is mediated by *autonomous* motivation, not compulsion.**
`[DOCUMENTED]` Autonomous (self-chosen, internalised) motivation predicted adherence
to self-monitoring and subsequent weight change, with adherence mediating the
motivation→outcome link (Webber et al., PubMed 20138583; Teixeira et al.,
*Motivation, self-determination, and long-term weight control*, PMC3312817).
Self-Determination Theory is the key: monitoring that the user *chooses*, for
their own reasons, supports wellbeing; monitoring that is coerced, streak-driven,
or externally pressured does not.

**When photos genuinely help** `[INFERRED from the above]`:
- The user opts in and can stop with no penalty.
- The cadence is the user's (e.g. every few weeks), not the app's.
- The photo captures *change over a long arc* — recomposition, posture, muscle —
  that a scale cannot, which is precisely where photos beat weight for people
  whose weight is stable while body composition shifts.
- The comparison target is the user's OWN earlier self, not an ideal or another
  person.
- The photo is a qualitative record, not a numeric scoreboard.

**Why photos can be *safer* than the scale for some users** `[INFERRED]`: for a
recomposition or muscle-gain goal, weight is a noisy and often demoralising
signal. A neutral visual record can decouple progress from the number that most
strongly drives disordered restriction. This is a genuine argument *for* offering
photos as an alternative — provided the photo does not simply import the number
back onto itself (see Q4 red line: overlays).

---

## Q2 — HARM: when body-checking and photos harm vulnerable users

**Body-checking is a recognised maintaining mechanism of eating disorders.**
`[DOCUMENTED]` Body checking = "repetitive behaviour evaluating shape, size or
weight" — mirror-scrutiny, pinching, measuring, repeated weighing, and
photographing/examining specific body parts. A systematic review and meta-analysis
found people with eating disorders show significantly higher body-checking and
body-avoidance than controls, and that in *non-clinical* samples both correlate
with ED pathology (Nikodijevic et al., 2018, *Body checking and body avoidance in
eating disorders: Systematic review and meta-analysis*, University of Melbourne;
ScienceDirect S1471015318302071).

**It is causal, not just correlational, at least short-term.** `[DOCUMENTED]`
Experimentally *asking* non-clinical women to scrutinise their body in a mirror
increased fear of weight gain, body dissatisfaction, and feelings of fatness;
naturalistic (EMA) studies link greater body-checking to *subsequent* increases in
body dissatisfaction, dietary restriction, and binge eating (Nikodijevic 2018;
naturalistic AN study, PMC3733328). So the act of appearance-scrutiny itself can
worsen state body image, even in people without a diagnosis.

**The dose is the poison — frequency and function flip a neutral check into
pathology.** `[DOCUMENTED]` Clinicians distinguish "occasionally checking … is a
typical part of life" from *compulsive, repeated* checking accompanied by
"consistent negative thoughts about appearance" (Medical News Today clinical
review of body checking). Body checking often serves short-term anxiety reduction
but "may worsen long-term negative feelings and body image" — the classic
reinforcement trap: it feels like it helps, and that is what entrenches it.

**Appearance-based comparison is the specific accelerant.** `[DOCUMENTED]`
Systematic reviews and meta-analyses tie appearance-focused social comparison —
especially against idealised or "fitspiration" imagery — to body dissatisfaction,
drive for thinness, negative mood, and disordered eating, with appearance
comparison the central mediating mechanism (systematic review/meta-analysis,
ScienceDirect S1740144524001633; fitspiration review, *Eating and Weight Disorders*,
Springer 10.1007/s40519-022-01505-4). The harm is strongest when the comparison
target is an idealised body.

**Fitness/diet apps specifically have a documented harm signature.**
`[DOCUMENTED]`
- ~73–83% of surveyed MyFitnessPal users *with eating disorders* believed the app
  contributed to their disorder, and those perceptions correlated with ED symptom
  severity (Levinson et al., *My Fitness Pal Calorie Tracker Usage in the Eating
  Disorders*, PMC5700836).
- A qualitative study of app users with EDs found the apps "gamified" eating and
  drove users into "unhealthy competition with themselves and the app to eat less
  each day"; streaks and logging reminders produced "app dependency" and anxiety
  on trying to stop; a single binary red/green cue applied "regardless of whether
  they exceed … by 1 or 1000 calories" (Eikey et al. / BJPsych Open qualitative
  study, PMC8485346).
- A 2025 systematic review confirmed consistent cross-sectional associations
  between fitness/diet-tracker use and disordered eating (dietary restraint,
  excessive exercise, muscularity-oriented behaviours), *strongest* when the
  tracking motive was weight/shape change rather than general health, and at
  *higher use frequency* (PMC12547374).

**Who is vulnerable** `[DOCUMENTED + INFERRED]`: those with a current or prior
eating disorder; those with high internalised weight bias / body dissatisfaction;
those tracking for appearance/weight-change rather than health; and — because the
causal mirror-exposure effect appeared in *non-clinical* women — anyone in a
vulnerable moment, not only the diagnosed. The direction of causation is debated
(trackers may partly be a *marker* of pre-existing risk), but the clinical
consensus is that for the already-vulnerable, appearance-scrutiny tools can
actively worsen symptoms.

**What turns healthy monitoring into harmful obsession** (synthesis) `[DOCUMENTED]`:
1. **High frequency** — daily/near-daily checking vs. occasional.
2. **Appearance framing** — evaluating how the body *looks* vs. what it *does*.
3. **Comparison to an ideal** — vs. comparison to one's own past self, or none.
4. **Numeric coupling** — the check produces a score to beat.
5. **Compulsion/anxiety-relief loop** — checking to relieve anxiety, which
   reinforces more checking.
6. **External pressure** — streaks, reminders, gamified "don't break the chain".

---

## Q3 — MITIGATIONS: how careful apps and clinicians reduce harm

**Clinical playbook — reduce checking, re-anchor on function.** `[DOCUMENTED]`
CBT for eating disorders and body image explicitly targets *reducing* body-checking
rituals (stimulus control, ritual prevention); meta-analysed CBT for body image
significantly reduces body dissatisfaction, appearance anxiety, and body-checking
(EatingDisorderHope CBT review; Medical News Today reduction strategies). The
therapeutic move is not "check better" — it is "check less, and shift attention
from appearance to function".

**Functionality > appearance is an evidence-backed reframe.** `[DOCUMENTED]`
Focusing on what the body *can do* (functionality appreciation) — rather than how
it looks — increases body appreciation and satisfaction and reduces
self-objectification. RCTs and the "Expand Your Horizon" programme show
experimental, causal improvements in body image from a functionality focus (Alleva
et al., ScienceDirect S1740144515000911; Cerea et al., *British Journal of Clinical
Psychology* 2025, 10.1111/bjc.12514). **Design implication:** frame progress
photos around capability, posture, training, and how the user *feels*, not around
appearance verdicts.

**App-specific safer-design moves** distilled from the ED-app literature
(PMC8485346, PMC12547374) `[DOCUMENTED]`:
- **Reduce quantification.** Do not attach numbers (weight/measurements/deltas) to
  the photo. Keep it qualitative.
- **De-gamify.** No streaks, no "chains", no logging reminders that pressure a
  cadence, no competition-with-self-or-others framing.
- **Treat breaks as healthy.** Explicitly permit stopping; "app abandonment can be
  beneficial for some users" is a stated finding, not a failure state.
- **No punishment framing / no binary verdicts.** Avoid red/green,
  pass/fail, "you slipped" copy.
- **Nuanced, calm feedback** over dramatic reveals.
- **Involve lived experience** in design; put mental health, not weight, at the
  centre.

**Signposting and calm-mode wrapping** `[DOCUMENTED via app constitution + Beat/NICE
convention]`: reputable ED orgs (Beat UK, NEDA, JED Foundation) and NICE-aligned
services treat repeated appearance-monitoring as a warning sign and route toward
support rather than more checking. In-product this means: neutral language, an easy
opt-out, and — under any distress signal — softening or withdrawing the surface and
signposting help, never nagging the user back into it. VOLYUME already has this
machinery (calm mode, ED-flag, Beat signposting); Q5 covers how photos inherit it.

**Concrete mitigation checklist** `[INFERRED, grounded in the above]`:
- Opt-in, off by default; one-tap opt-out with no penalty.
- User-chosen cadence; no app-imposed frequency, no streaks, no reminders that
  imply a "should".
- Comparison target = the user's own earlier photo ONLY; never an ideal, model,
  goal-body, or other user.
- No numeric overlays on photos (no weight, measurements, body-fat %, "deltas").
- Function-and-neutrality language ("your training", "how you feel"), not
  appearance verdicts ("leaner", "better", "before/after").
- Private and local by default; never social, never a leaderboard.
- Calm, non-celebratory tone; no dramatic transformation reveals.
- Under calm-mode / open ED flag: soften copy, add the "use only if it helps, skip
  if it doesn't" permission, and gate the comparison/number-adjacent affordances.

---

## Q4 — RED LINES: patterns to NEVER ship in a body-photo feature

Each is a direct consequence of the Q2 evidence. `[DOCUMENTED harm basis noted.]`

1. **Goal-body / ideal-body comparison.** Placing the user's photo beside a target
   physique, model, "after" ideal, or any body that isn't their own past self.
   *Basis:* appearance comparison to idealised imagery is the central driver of
   body dissatisfaction and disordered eating (S1740144524001633; fitspiration
   review). **NEVER.**
2. **Shame / gap framing.** Any copy implying the user has fallen short, "slipped",
   or is behind a target. *Basis:* punishment framing and negative
   appearance-thoughts entrench checking (PMC8485346; body-checking review).
   **NEVER.**
3. **Streaks / chains / photo-cadence pressure on body-checking.** "Don't break
   your streak", reminders to take today's photo, gamified consistency on
   *body* photos. *Basis:* gamification and streaks drove app-dependency and
   compulsion in ED users (PMC8485346). **NEVER.** (Training-consistency streaks
   elsewhere in the app are a separate question; the red line is streaks *on
   body-checking*.)
4. **Weight / measurement / body-fat overlays that turn a photo into a number to
   chase.** Deltas, "you're down X", body-fat estimates, measurement badges welded
   onto the image. *Basis:* quantification and the "number game" are named ED
   triggers; higher numeric focus → higher disordered eating (PMC8485346;
   PMC12547374). **NEVER.**
5. **Dramatic "transformation" reveals.** Before/after animations, slider wipes,
   celebratory fanfare on body change. *Basis:* this is fitspiration mechanics
   imported into the product; drives appearance comparison and drive-for-thinness
   (fitspiration review). **NEVER.**
6. **Social sharing / leaderboards / community feeds of body photos.** Any surface
   where one user's body photo is seen by another, ranked, or compared. *Basis:*
   social appearance comparison is the strongest documented harm pathway; share
   cards in this app already exclude body imagery per the constitution. **NEVER.**
7. **AI "body analysis" / physique scoring / rating.** Any automated judgement of
   the body in a photo. *Basis:* violates the deterministic-no-AI mandate AND
   manufactures an appearance verdict, the exact objectifying signal functionality
   interventions work to remove. **NEVER.**

---

## Q5 — HOW VOLYUME's EXISTING ED-SAFETY MODEL SHOULD EXTEND

**What already exists (verified in code):** `src/screens/ProgressPhotosScreen.js`
already implements a notably safe baseline —
- **Local-only, never synced, never shared** ("Private to this device. Not synced,
  not shared.").
- **Fail-closed calm read**: raw `AsyncStorage.getItem(WELLBEING_KEY)` with a
  `'read_failed'` sentinel, treated as calm (`isCalm(mode) || mode === 'read_failed'`),
  matching the `wellbeingFailClosed.guard.test.js` invariant across the five swept
  screens.
- **Calm-mode copy softening**: under calm, the note adds "Use these only if they
  help you, and skip them if they do not." — the opt-out permission the evidence
  calls for.
- **Compare shows dates and photos ONLY** — "no deltas, measurements or judgements"
  (comment at lines 56–63, 320–321), i.e. red line #4 is already held.
- **No streaks, no reminders, no sharing, no goal-body** on this screen — red lines
  #1, #3, #5, #6 are already held by omission.
- **Read-only lapse handling** for non-Pro (view your own photos; can't add/delete),
  consistent with "viewing your own photos is fine".

**This is well-aligned with the evidence.** The recommendations below either pin
what must NOT regress, or extend the ED-flag inheritance one notch further.

**Recommended inheritance model** `[INFERRED, grounded in the code + evidence]`:

| Surface | Neutral state | Calm mode | Open ED flag |
|---|---|---|---|
| **Viewing your own photo grid** | available | available | available (with softened copy) — this is self-record, the least harmful use; withdrawing it entirely could feel punitive |
| **Adding a photo** | available (Pro) | available; keep the "skip if it doesn't help" permission copy | available but consider *not* nudging; never remind/prompt |
| **Compare (own past self, dates only)** | available | available; keep neutral | **soften or gate**: compare is the most checking-like affordance; at minimum keep it dates-only and add the "only if it helps" framing; a stricter option is to hide the Compare entry point under an open ED flag |
| **Any number/measurement overlay** | must not exist | must not exist | must not exist |
| **Transformation reveal / goal-body / sharing** | must not exist | must not exist | must not exist |
| **Reminders / streaks to take photos** | must not exist | must not exist | must not exist |

**Specific recommendations to the design phase:**
1. **Keep the fail-closed pattern exactly as is.** Any new photo affordance that is
   body-image-adjacent must read the wellbeing flag via the raw-AsyncStorage +
   `'read_failed'` sentinel and treat read failure as calm. Do not introduce
   `getWellbeingMode()` here — the guard test forbids it and the reason is
   fail-open leakage.
2. **Extend suppression to the ED flag, not just calm mode.** Calm mode is
   currently read; the open-ED-pattern flag (`getOpenEdPatternFlag`) is the
   stronger signal used elsewhere (YearOfLifts, weight/food notifications). A
   **founder decision** is warranted on whether an *open ED flag* should (a) simply
   soften copy like calm mode does today, or (b) additionally gate the **Compare**
   affordance. The evidence supports (b) as the safer default — compare is the
   closest thing on this screen to clinical body-checking — but gating a user's own
   photos is a real product trade-off and must be the founder's call, surfaced as a
   multiple-choice question, not pre-decided.
3. **Never let a number touch a photo.** Any future "annotate", "tag with weight",
   or "link to check-in measurement" request is red line #4 and must be refused or
   escalated as a founder decision, with the harm evidence attached.
4. **No cadence pressure, ever.** If a "remind me to take a monthly photo" feature
   is ever requested, treat it as body-checking-streak-adjacent (red line #3) and
   surface the evidence before building.
5. **Function-over-appearance in all copy.** Keep language neutral and
   capability-oriented; avoid "leaner/better/before-after". This is the one
   evidence-backed *positive* reframe (functionality appreciation) and costs
   nothing.
6. **Signposting reuse.** Under an open ED flag, the existing Beat UK / calm-mode
   signposting should be reachable from (or at least not contradicted by) the photo
   surface; never nag the user back toward taking/comparing photos while a flag is
   open.

---

## CRISP VERDICT — the table the design phase follows

| **BUILD THIS** (safe, evidence-supported) | **GATE THIS behind calm-mode / ED-flag** (conditional) | **NEVER BUILD THIS** (red line) |
|---|---|---|
| Opt-in, off-by-default private photo grid, **local-only, never synced/shared** | **Compare** (own past self, dates only) — soften copy under calm; consider hiding under an *open ED flag* (founder decision) | Goal-body / ideal-body / model / "after" comparison |
| **Viewing your own photos** in any wellbeing state (self-record is the least harmful use) | **Add-photo nudges/prompts** — never remind under calm/ED flag; adding stays available but un-nudged | Weight / measurement / body-fat / "delta" overlays on a photo |
| **User-chosen cadence**, no app-imposed frequency | Copy tone — plain in neutral state; add "use only if it helps, skip if it doesn't" under calm/ED flag | Streaks / chains / "don't break it" cadence pressure on body photos |
| **Comparison target = own earlier self only**, or none | Compare entry-point visibility — gate under open ED flag per founder decision | Dramatic before/after "transformation" reveals |
| **Function/neutral framing** (training, posture, how you feel) | — | Social sharing / feeds / leaderboards / ranking of body photos |
| **Fail-closed calm read** (raw AsyncStorage + `read_failed` sentinel) — keep exactly | — | AI / automated physique scoring, rating, or "body analysis" |
| **Easy one-tap opt-out**, no penalty; breaks framed as fine | — | Shame / gap / "you slipped / you're behind target" framing |
| Calm, non-celebratory tone; qualitative not numeric | — | Any numeric scoreboard the user is pushed to "beat" |

**Bottom line for design:** VOLYUME's current `ProgressPhotosScreen` already lands
in the BUILD/GATE columns and holds every NEVER line. The one open founder decision
is **whether an open ED flag should gate the Compare affordance** (evidence favours
yes; product cost is real) — surface it as a multiple-choice question, do not
pre-decide.

---

## Sources

**Self-monitoring / adherence / benefit**
- Burke et al. *Self-Monitoring in Weight Loss: A Systematic Review.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/
- *Systematic review of dietary self-monitoring in behavioural weight loss interventions.* Public Health Nutrition. https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/
- Webber et al. *Motivation and adherence to self-monitoring and weight loss.* https://pubmed.ncbi.nlm.nih.gov/20138583/
- Teixeira et al. *Motivation, self-determination, and long-term weight control.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3312817/

**Body-checking / body dissatisfaction (harm)**
- Nikodijevic et al. (2018). *Body checking and body avoidance in eating disorders: Systematic review and meta-analysis.* https://psychologicalsciences.unimelb.edu.au/__data/assets/pdf_file/0017/3522005/Nikodijevic-2018.pdf ; https://www.sciencedirect.com/science/article/abs/pii/S1471015318302071
- *Naturalistic Examination of Body Checking and Dietary Restriction in Women with Anorexia Nervosa.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3733328/
- Medical News Today. *What is body checking? Signs, how to reduce it.* https://www.medicalnewstoday.com/articles/body-checking

**Appearance comparison / social media / fitspiration**
- *Social comparison in social media, body image concerns and eating disorder symptoms: systematic review and meta-analysis.* https://www.sciencedirect.com/science/article/pii/S1740144524001633
- *Effects of fitspiration content on body image: a systematic review.* Eating and Weight Disorders. https://link.springer.com/article/10.1007/s40519-022-01505-4

**Fitness/diet apps and disordered eating**
- Levinson et al. *My Fitness Pal Calorie Tracker Usage in the Eating Disorders.* https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/
- Eikey et al. *Effects of diet and fitness apps on eating disorder behaviours: qualitative study.* BJPsych Open. https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
- *Associations Between the Use of Fitness and Diet Tracking Technology and Disordered Eating Behaviour: A Systematic Review* (2025). https://pmc.ncbi.nlm.nih.gov/articles/PMC12547374/

**Mitigations / functionality appreciation / CBT**
- Alleva et al. *Expand Your Horizon: focusing on body functionality to improve body image.* https://www.sciencedirect.com/science/article/abs/pii/S1740144515000911
- Cerea et al. (2025). *More than Body Appearance: functionality-focused intervention + psychoeducation, RCT.* British Journal of Clinical Psychology. https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjc.12514
- EatingDisorderHope. *How CBT Helps with Body Image.* https://www.eatingdisorderhope.com/treatment-for-eating-disorders/therapies/cognitive-behavioral-therapy-cbt/body-image
- JED Foundation. *Body Image and Eating Disorders.* https://jedfoundation.org/im-experiencing/body-image-and-eating-disorders/

**In-app grounding (this repo)**
- `src/screens/ProgressPhotosScreen.js` — existing local-only, calm-aware, dates-only-compare implementation.
- `src/screens/__tests__/wellbeingFailClosed.guard.test.js` — the fail-closed (`read_failed` sentinel) invariant.
- `src/lib/wellbeing.js` — `isCalm`, `WELLBEING_KEY`; `getOpenEdPatternFlag` (open ED flag).
