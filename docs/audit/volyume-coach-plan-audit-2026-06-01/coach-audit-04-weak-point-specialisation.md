# Coach Plan Audit 04, Weak Point Specialisation

Status: COMPLETE | Timestamp: 2026-06-01 | Domain: Weak point specialisation

This document covers how lagging body parts are identified per physique
division and how specialisation volume is added without breaking
recovery. Documented numbers are cited to source. Numbers marked
[synthesis] are reasoned estimates for an app default, not lifted from a
single source.

---

## 1. Most common weak points per division

What follows is "what judges most penalise" and "what athletes most often
have to bring up". Sources are the division criteria pages and judge
commentary listed at the foot.

### Men's divisions

- **Men's Physique.** Judged on shoulder-to-waist ratio, V-taper, round
  delt caps, chest, arms and abs. NPC/IFBB now also look at how the legs
  fill the board shorts and at calf development, after a rule emphasis
  change. The most common bring-up areas are **side delts** (the cap that
  drives the illusion of a wide frame) and **upper back/lat width**.
  Over-muscularity is actively marked down, so the weak point is rarely
  "more mass everywhere", it is shape in the delts and taper.
  (12 Weeks Out NPC criteria; Prep Coach UK; IFBB Australia MP rules.)

- **Classic Physique.** Golden-era balance: broad shoulders, narrow
  waist, **muscular legs**, conditioning and symmetry. The classic
  bring-up is **legs** (quads sweep and hamstrings), because the weight
  caps reward proportion and a competitor with a thin lower body breaks
  the line. (Fitness Volt division guide; Generation Iron 2025 Classic
  Olympia analysis.)

- **Open Bodybuilding / 212.** Same poses and criteria; 212 simply caps
  bodyweight at 212 lb. Judging rewards maximum mass plus conditioning.
  The two areas that most often lose placings are **back detail and
  thickness** (rear-lat spread, erectors, christmas-tree) and
  **conditioning / glute-ham tie-in** in the rear poses. (BarBend judging
  guide; Fitness Volt division guide; Bodybuilding Wizard IFBB guide.)

### Women's divisions

- **Bikini.** Judges want full round glutes with a slight separation
  from the hamstrings, and a balanced top-to-bottom look. They penalise
  too much density (then "you look like Wellness"), striated or deeply
  etched hamstrings, and an X-frame created by flaring lats. The common
  bring-up is **glutes** (roundness and upper-glute fullness) held
  against a tight, not-too-developed thigh. (Tyler Manion judging
  commentary, Fitness Volt; Five Starr Physique Bikini guide.)

- **Wellness.** Greater emphasis on **glutes, hamstrings, quads and
  hips** than Bikini, with a controlled (not neglected) upper body. The
  frequent bring-up is **upper-lateral glute** and overall lower-body
  amplitude. Upper body must still show definition. (ANBF Wellness
  guidelines; OCB Wellness; RP female-division podcast page.)

- **Figure.** Built on the **V-taper from wide shoulders/lats to a tight
  waist**, small muscle separation, no striation. The common bring-up is
  **back width (lats) and capped delts**. (Julie Lohre Figure guides;
  12 Weeks Out criteria.)

- **Women's Physique.** More muscularity than Figure with a clear
  X-frame. Judges assess **front-to-back balance** and competitors often
  **neglect posterior development**, so the typical bring-up is **back
  thickness and rear delts/hamstrings**. (NPC News Online WP rules; ANBF
  WP guidelines; IFBB WA WP rules.)

- **Women's Bodybuilding.** Most muscular female division: mass,
  symmetry, conditioning. Common bring-ups mirror open men: **back
  detail and lower-body conditioning / tie-ins**. (NaturalBodybuilding
  female categories; NFPT women's divisions.)

Implementation note for the app: the lagging-area picklist should be
**division-aware**. A Bikini athlete's default candidate is glutes; a
Classic athlete's is legs; a Figure/Women's Physique athlete's is back
width or rear delts. [synthesis, grounded in the criteria above.]

---

## 2. Adding specialisation volume without exceeding recovery capacity

Four approaches recur in the coaching literature. They are complementary,
not exclusive.

1. **Prioritise the lagging area early in the week and early in the
   session.** Train it when systemic and local fatigue are lowest, so the
   hardest sets land on the freshest tissue. This is standard RP / Mike
   Israetel mesocycle guidance and general body-part-priority practice.

2. **Run a discrete specialisation block, then deload.** Israetel's
   accumulation phase for the focused muscle runs and is then followed by
   a deload for that muscle, rather than holding peak volume open-ended.
   (Israetel, via Men's Fitness / Yahoo Lifestyle coverage.)

3. **Raise frequency rather than per-session volume.** Within a single
   session, roughly **6 to 8 hard sets** maximises the muscle-protein-
   synthesis response for that bout; pushing well past that in one
   sitting adds fatigue without extra growth ("junk volume"). The fix is
   to spread the extra weekly sets across **2 to 3 sessions** so each
   bout stays productive. (Junk-volume / per-session-ceiling synthesis,
   Strength Framework and Breaking Muscle; consistent with Schoenfeld
   frequency work.) Hany Rambod's FST-7 uses exactly this: to bring up a
   lagging muscle he adds a **second weekly session** for it, and the
   second session need not match the first in volume. (Rambod, FST-7
   guidance via Fitness Volt / Nutrition Monsters.)

4. **Buy recovery capacity by cutting elsewhere** (covered in section 4).
   Total weekly stress is the constraint, so extra sets on the priority
   muscle are funded by dropping non-priority muscles to maintenance.

---

## 3. Maximum additional volume a lagging area can take

The ceiling is the muscle's **Maximum Recoverable Volume (MRV)**, the
RP/Israetel landmark above which performance declines session to session.

Documented per-muscle landmarks (RP / Israetel framework, as reported
across RP Strength, FitnessRec, MesoStrength):

- MEV (start growing): around **6 to 8 sets/week** for most muscles;
  triceps cited as growing from ~6 to 8.
- MAV (best stimulus-to-fatigue): roughly **12 to 18 sets/week**; large
  muscles (chest, back, quads) sit ~12 to 16, smaller (biceps, triceps)
  ~8 to 12.
- MRV (ceiling): roughly **18 to 30 sets/week** depending on muscle and
  experience. Side delts and biceps tolerate notably high volume before
  MRV; **quads and hamstrings have lower ceilings** because heavy leg
  work carries heavier systemic fatigue.

Practical headroom for a specialisation push: take the muscle from its
current MAV toward its MRV. For most athletes already training a muscle at
~12 to 16 sets, that is roughly **+4 to +8 additional weekly sets** before
recovery is compromised, less for quads/hams, more for side delts/biceps.
Israetel's own framing during a specialisation phase is to **add a set at
a time over the weeks** once everything else is at maintenance, watching
performance and pump/soreness as the stop signal. (Israetel, Men's
Fitness / Yahoo.)

App default [synthesis, bounded by the landmarks above]:

- Large/lower-tolerance (quads, hams, chest, glutes): **+4 to +6
  sets/week**.
- Back: **+6 sets/week** (higher tolerance than other large muscles per
  RP).
- Small/high-tolerance (side delts, biceps, triceps, calves): **+6 to +8
  sets/week**.

---

## 4. What gets reduced elsewhere to hold total stress in check

The trade-off is the heart of recovery-aware specialisation: **maintenance
volume is much lower than growth volume**, so non-priority muscles can be
cut hard without losing size.

Israetel's worked example: a chest that needs **~18 sets/week to keep
growing may need only ~8 sets/week to maintain**. Dropping the
non-focused muscles to that maintenance band frees both recovery capacity
and session time for the priority muscle. (Israetel, via Men's Fitness /
Yahoo Lifestyle.)

Maintenance volume in the RP framework is broadly **about half of growth
volume**, often landing near MEV (~6 to 10 sets/week per muscle).
[Documented direction; the exact per-muscle maintenance number is
muscle-specific.]

Concrete offsetting reductions for a block [synthesis, applying the
half-of-growth rule]:

- Each **non-priority muscle** drops from its growth volume to **~6 to 9
  sets/week** (one to two sessions of maintenance work).
- Net weekly set total stays roughly flat: e.g. add +6 to the priority
  muscle, remove ~3 each from two non-priority muscles.
- Do **not** zero a muscle out. Maintenance, not deletion, protects the
  rest of the physique and keeps the change additive rather than
  destructive.

---

## 5. How long a specialisation phase should run before reassessment

- **Block length: 4 to 6 weeks**, then a **deload for the target muscle**.
  This matches Israetel's accumulation-phase length and the standard RP
  mesocycle (4 to 6 weeks of progressive volume, then deload). (Israetel
  via Men's Fitness / Yahoo; RP volume-landmarks framework.) General
  mesocycle length in Eric Helms' periodisation discussion is likewise
  ~4 to 6 weeks per accumulation phase. (Helms, Complementary Training /
  Swole Radio.)

- **Reassess after the block.** One 4 to 6 week block rarely closes a real
  imbalance. A meaningful specialisation campaign is usually **2 to 4
  consecutive blocks** (roughly **8 to 18 weeks** of cumulative emphasis,
  deloads included) before the lagging area visibly catches up. Reassess
  at each deload: if the gap has closed, return the muscle to normal
  programming; if not, run another block. [synthesis, built on the 4 to 6
  week block unit.]

- Off-season only. Specialisation needs a calorie surplus or at least
  maintenance and full recovery, so it belongs in the building phase, not
  in a deficit prep. [synthesis, standard practice.]

---

## 6. Frequency vs volume vs intensity specialisation by muscle

Where the evidence is strongest: **frequency is mostly a delivery vehicle
for volume.** Schoenfeld et al. (2016) found 2x/week beat 1x/week for
hypertrophy when volume was equated, but later, larger reviews concluded
frequency does **not** meaningfully change hypertrophy once weekly volume
is matched. The practical reading: raise frequency to **fit more weekly
volume per muscle without overloading any one session past ~6 to 8 sets**,
not because the extra session is magic. (Schoenfeld & Grgic 2016
meta-analysis; Stronger By Science frequency review; equal-volume
frequency trial, PMC8766679.)

Muscle-by-muscle [the split below is synthesis, grounded in the cited
fatigue and landmark data]:

- **Side delts, biceps, triceps, calves, rear delts.** High MRV, low
  systemic cost. Respond well to **frequency-based** specialisation:
  add a daily-ish or 3 to 4x/week sprinkling of sets. Frequency is the
  cleanest way to push their high ceiling.
- **Back.** High volume tolerance per RP. Responds to a **volume-based**
  push spread over 2 to 3 sessions.
- **Quads, hamstrings, glutes.** Lower ceilings and high systemic
  fatigue. Favour **moderate frequency (2x) with controlled per-session
  volume**, and lean on **intensity/effort and exercise selection** (e.g.
  upper-glute-biased work for the Bikini/Wellness gap judges flag) rather
  than piling on sets. (Lower-body fatigue point: RP landmarks. Selection
  point: RP female-division coaching.)
- **Chest.** Volume-based, 2x/week, watching shoulder/elbow recovery.

Intensity-based specialisation (more sets near or at failure, intensity
techniques like FST-7's stretch sets) is best treated as a way to extract
more stimulus from a **fixed** set count when adding raw volume would
break recovery, especially on the small high-frequency muscles. (FST-7,
Rambod.) [synthesis on placement.]

---

## 7. How body-part prioritisation (order and weekly placement) factors in

- **Session order.** Train the lagging muscle **first in the session**,
  before competing muscles fatigue it indirectly. Standard RP/priority
  practice.
- **Weekly placement.** Put its hardest session **early in the
  microcycle** (e.g. day 1), after the weekly rest, when recovery is
  highest. Israetel/RP priority guidance.
- **Separation from synergists.** Place the priority muscle's sessions so
  the muscles that pre-fatigue it are not trained the day before (e.g.
  don't bury a back-priority session behind a heavy biceps day).
  [synthesis, standard programming hygiene.]
- **Frequency placement.** When raising frequency, spread the sessions
  (e.g. day 1 and day 4) so local recovery completes between bouts rather
  than stacking back-to-back. [synthesis, from the per-session ceiling
  logic in section 2.]

---

## 8. Concrete recovery-aware specialisation framework for the app

Design goal: additive without being destructive. The priority muscle goes
up, non-priority muscles drop to maintenance, total weekly stress holds
roughly flat, and the block is time-boxed with a built-in deload.

**Inputs:** division, lagging muscle, current weekly sets per muscle,
training age.

**Block template (default 5 weeks: 4 build + 1 deload):**

| Element | Rule | Source basis |
| --- | --- | --- |
| Extra sets on priority muscle | +4 to +8/week vs current, by muscle tier (sec. 3) | RP MRV landmarks [tiering is synthesis] |
| Per-session cap | <= ~6 to 8 hard sets in any one session | per-session MPS ceiling, junk-volume sources |
| Frequency | 2x/week large/lower body; 3 to 4x/week small high-tolerance (delts, arms, calves) | FST-7 (Rambod); frequency reviews |
| Progression | start near current, add ~1 set/week to the priority muscle | Israetel accumulation |
| Non-priority muscles | drop to maintenance ~6 to 9 sets/week each | Israetel maintenance example (18 grow / 8 maintain) [exact number synthesis] |
| Block length | 4 to 6 weeks, then deload that muscle | Israetel / RP mesocycle; Helms |
| Reassess | at each deload; rerun up to ~2 to 4 blocks total | [synthesis] |

**Worked example, Bikini athlete, lagging glutes, currently 12 sets/wk:**

- Glutes 12 -> 18 sets/week (+6), split across 2 sessions (9 + 9, each
  session under the per-bout ceiling for a large muscle group), upper-
  glute-biased selection added. Glute session placed day 1, trained
  first.
- Offsets: back 12 -> 8, side delts 12 -> 8 (each to maintenance),
  recovering ~8 weekly sets, so net weekly load is roughly flat.
- Progression: week 1 start, add ~1 glute set/week to week 4, deload
  week 5.
- Reassess at the deload. Run a second block if the upper-glute gap the
  judges flag has not closed.

**Worked example, Classic Physique athlete, lagging quads, currently 14
sets/wk:**

- Quads 14 -> 18 (+4, lower because of leg systemic fatigue), 2x/week
  (9 + 9), priority session day 1.
- Offsets: chest 14 -> 8, biceps 10 -> 6.
- Same 4-build / 1-deload, reassess.

**Recovery-impact note (must surface in the UI):** the framework only
holds recovery if the non-priority cuts are actually applied. Adding the
extra sets **without** the offsets pushes total weekly stress up and risks
exceeding systemic recovery, which is the failure mode to guard against.
The app should refuse to add priority volume unless matching maintenance
reductions are set, and should never reduce a non-priority muscle below
its maintenance floor (~6 sets) so the rest of the physique is held, not
lost. Lower-body specialisation (quads/hams/glutes) carries the highest
systemic cost, so its extra-set defaults are deliberately smaller than for
delts/arms. [Recovery-impact framing is synthesis built on the RP MRV and
maintenance-volume data.]

---

## Sources

- [12 Weeks Out, NPC judging criteria explained](https://www.12weeksout.app/blog/npc-judging-criteria-explained)
- [Prep Coach UK, Men's Physique criteria](https://www.prepcoachuk.com/articles/the-mens-physique-criteria)
- [IFBB Australia, Men's Physique rules](https://www.ifbbaustralia.com.au/rules/men-s-physique-rules)
- [Fitness Volt, Understanding Men's, Classic, 212 and Open differences](https://fitnessvolt.com/27290/understanding-the-difference/)
- [Generation Iron, 2025 Classic Physique Olympia prejudging analysis](https://generationiron.com/2025-classic-physique-prejudging-report-analysis/)
- [BarBend, How bodybuilding is judged](https://barbend.com/news/how-bodybuilding-is-judged/)
- [Bodybuilding Wizard, Guide to men's IFBB Pro divisions](https://bodybuilding-wizard.com/a-guide-to-mens-ifbb-pro-league-bodybuilding-divisions/)
- [Fitness Volt, Tyler Manion on Bikini judging criteria](https://fitnessvolt.com/tyler-manion-judging-criteria-bikini/)
- [Five Starr Physique, What the judges want: Bikini](https://fivestarrphysique.com/bodybuilding-contest-prep/what-the-judges-want-bikini-division/)
- [ANBF, Wellness division guidelines](https://anbfnatural.com/wellness-guidelines/)
- [OCB, Women's Wellness guidelines](https://ocbonline.com/womens-wellness/)
- [RP Strength, Science of training female bodybuilders, division-specific strategies](https://rpstrength.com/blogs/podcasts/the-science-of-training-female-bodybuilders-division-specific-strategies)
- [Julie Lohre, Difference between physique divisions](https://julielohre.com/difference-between-physique-divisions/)
- [NPC News Online, Official NPC Women's Physique division](https://npcnewsonline.com/rules/official-npc-womens-physique-division/)
- [ANBF, Women's Physique guidelines](https://anbfnatural.com/womens-physique-guidelines/)
- [IFBB WA, Women's Physique rules](https://www.ifbbwa.com/womens-physique-rules/)
- [NaturalBodybuilding.com, Female categories](https://naturalbodybuilding.com/categories/female/)
- [NFPT, Women's bodybuilding divisions](https://nfpt.com/womens-bodybuilding-choosing-division/)
- [RP Strength, Training volume landmarks for muscle growth](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- [FitnessRec, Programming volume landmarks: MRV, MAV, MEV](https://fitnessrec.com/articles/how-to-program-volume-landmarks-mrv-mav-and-mev-explained-for-optimal-muscle-growth)
- [MesoStrength, MV, MEV, MAV, MRV explained](https://mesostrength.com/blog/mv-mev-mav-mrv-explained)
- [Men's Fitness, Mike Israetel on optimal working sets](https://www.mensfitness.com/training/mike-israetel-optimal-amount-of-working-sets-for-growing-bigger-muscles)
- [Yahoo Lifestyle, Mike Israetel reveals optimal working sets per week](https://www.yahoo.com/lifestyle/mike-israetel-reveals-optimal-amount-152600119.html)
- [Alpha Progression, Specialization cycles for better muscle growth](https://alphaprogression.com/en/blog/specialization-cycles-better-muscle-growth)
- [Fitness Volt, FST-7 workout guide (Hany Rambod)](https://fitnessvolt.com/fst-7-workout-guide/)
- [Nutrition Monsters, FST-7 tip: solving muscle imbalances with Hany Rambod](https://nutritionmonsters.com/en/blogs/news/fst-7-tip-hoe-spieronevenwichtigheden-op-te-lossen-met-hany-rambod)
- [Stronger By Science, Training frequency for muscle growth: what the data say](https://www.strongerbyscience.com/frequency-muscle/)
- [Schoenfeld & Grgic, Frequency meta-analysis (Semantic Scholar)](https://www.semanticscholar.org/paper/How-many-times-per-week-should-a-muscle-be-trained-Schoenfeld-Grgic/5f3b9845fdfd15200bdac0f7b9b36da457c48025)
- [Equal-volume frequency trial (PMC8766679)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8766679/)
- [Strength Framework, Junk volume](https://www.strengthframework.com/p/junk-volume-avoid-it-if-you-want-to-maximise-muscle-growth-and-strength)
- [Breaking Muscle, High frequency to avoid junk volume](https://breakingmuscle.com/use-high-frequency-bodybuilding-to-avoid-junk-volume/)
- [Complementary Training, Training periodisation for bodybuilders with Eric Helms](https://complementarytraining.com/training-periodisation-for-bodybuilders-linear-undulating-periodization-with-eric-helms/)
