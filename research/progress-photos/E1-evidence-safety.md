# E1 — Progress Photos: Evidence & Safety Review

**Author:** Safety research lead, VOLYUME progress-photo feature
**Date:** 2026-07-03
**Status:** Research (E-phase). No app code touched. Feeds the design phase directly.
**Scope:** When progress photos help, when they harm, how careful apps/clinicians
reduce harm, and precisely how a VOLYUME photo feature inherits calm-mode /
ED-flag suppression.

**Evidence tags:**
- `[DOCUMENTED]` = supported by peer-reviewed research, clinical guidance, or a
  reputable clinical/charity source (cited inline).
- `[INFERRED]` = reasoned extension from the documented evidence or from
  VOLYUME's own locked safety model. Not directly cited; flagged so the founder
  can weigh it as judgement rather than fact.

**Bottom line up front.** Progress photos sit on a KNOWN eating-disorder-risk
surface. The same act — looking at an image of your own body to assess change —
is *self-monitoring* (helpful) at low frequency with neutral framing, and
*body-checking* (harmful, ED-maintaining) at high frequency or with
appearance-evaluative framing. The line between them is not the feature; it is
**cadence, framing, and comparison**. VOLYUME can offer a photo feature only if
it is engineered to sit hard on the self-monitoring side of that line and to
fail closed for vulnerable users. The verdict table at the end is the operative
output.

---

## 1. BENEFIT — when progress photos genuinely help

### 1.1 Visual self-monitoring supports adherence and motivation
`[DOCUMENTED]` Self-monitoring is one of the most robust behavioural predictors
of successful weight/behaviour change. A 2016 meta-analysis and multiple
systematic reviews find that greater adherence to self-monitoring (diet,
activity, weight) is associated with better outcomes.
- Burke et al. (2011), *Self-Monitoring in Weight Loss: A Systematic Review of
  the Literature*, PMC3268700.
- Burke et al. (2025), *Adherence to self-monitoring and behavioral goals is
  associated with improved weight loss in an mHealth RCT*, Obesity / PMC11897847.
- Systematic review of dietary self-monitoring, PMC8928602.

### 1.2 Photos capture change the scale misses
`[DOCUMENTED]` Progress photos document **non-scale change** — body-recomposition,
muscle definition, posture, better-fitting clothes — that often precedes or
diverges from scale-weight change. For a recomposition or muscle-gain goal, a
photo can show progress on weeks the scale is flat or up.
- Rumen review of visual progress tracking, rumen.com.au (industry/clinical
  summary; treat the "dopamine" mechanism claim below as weaker).

`[INFERRED]` For VOLYUME specifically — a training-led app whose coaching engine
tracks MEV/MRV volume and body-recomposition, not just weight loss — a dated
photo record is arguably a *healthier* progress signal than the scale, because
it decouples "progress" from a single descending number. This is the strongest
pro-photo argument in this app's context.

### 1.3 Self-efficacy and autonomous motivation
`[DOCUMENTED]` Visible evidence of one's own effort supports **self-efficacy**
and **autonomous (internally driven) motivation**, both of which predict
sustained adherence better than external pressure.
- Webber et al. (2010), *Motivation and its relationship to adherence to
  self-monitoring and weight loss*, PubMed 20138583.
- Autonomous-motivation findings summarised in BMC Public Health (2024),
  10.1186/s12889-024-17848-9.

### 1.4 The benefit is conditional, not automatic
`[DOCUMENTED]` The benefit of monitoring apps is **moderated by user intent**.
Where fitness/diet apps are used for *health* reasons, harm signals are low;
where they are used primarily for *weight control or body-image* reasons, users
are significantly more likely to show eating-disorder symptoms. Frequency of use
also tracks with disordered-eating symptomatology.
- Systematic review, *The link between diet/fitness monitoring apps, body image
  and disordered eating*, ScienceDirect S174014452400158X.
- National Center for Health Research, *Fitness Tracking Apps and Eating
  Disorders*, center4research.org.

**Benefit summary.** Progress photos help a motivated, low-risk user monitor
non-scale change, reinforcing autonomous motivation and adherence — *provided*
the framing stays health/function-oriented and the cadence stays low. The same
feature offers no protection, and active risk, once intent shifts to appearance
control. The design must therefore assume some users will arrive with that
intent and must not amplify it.

---

## 2. HARM — when photos and body-checking harm vulnerable users

### 2.1 Body-checking is a core ED-maintaining behaviour
`[DOCUMENTED]` Repetitive inspection/measurement/assessment of one's own body
("body-checking" — mirror scrutiny, pinching, measuring, weighing, comparison
to a past/target image) is a recognised maintaining factor for eating disorders
in cognitive-behavioural models. It reduces anxiety momentarily but deepens
preoccupation over time.
- Nikodijevic et al. (2018), *Body checking and body avoidance in eating
  disorders: systematic review and meta-analysis*, European Eating Disorders
  Review, 10.1002/erv.2585. ED cases vs controls: body-checking d = 1.26; body
  avoidance d = 1.88. In non-clinical samples body-checking correlated r = .60
  with ED pathology.

### 2.2 It is causal, not just correlational
`[DOCUMENTED]` Experimentally *inducing* body-checking (asking non-clinical
women to scrutinise their bodies in a mirror) causally increases body
dissatisfaction, fear of weight gain and "feelings of fatness." Naturalistic
studies show body-checking predicts subsequent increases in body
dissatisfaction, dietary restriction and binge eating.
- Naturalistic study of body-checking and dietary restriction in anorexia
  nervosa, PMC3733328.
- PLOS One (2024), *Longer-term consequences of increased body checking in women
  at risk for eating disorders*, 10.1371/journal.pone.0316190.
- Momentary study: people with anorexia nervosa were more likely to engage in
  dangerous weight-loss behaviours (skipping meals, purging) **in the moments
  after body-checking**, PMC10525023.

### 2.3 The frequency/framing line: monitoring → obsession
`[DOCUMENTED]` The literature is consistent that the harm is driven by
**frequency, rigidity, and evaluative framing**, not by the existence of a
body-image or the act of looking once.
- "The quantified-self movement... can lead to an obsession about logging, food,
  weight and exercise... health apps can shift mindful awareness into compulsive
  monitoring." (BJPsych Open qualitative study, PMC8485346.)
- Alliance for Eating Disorders, *From Tracking to Trapped*, and VICE *"A
  Twisted Comparison Game"* document the lived-experience version: scheduled or
  frequent checking becomes a compulsion the user cannot stop.

`[INFERRED]` Practical threshold for VOLYUME design: a **weekly-or-less** photo
cadence, chosen by the user with no app-side pressure to hit it, is defensible
as self-monitoring. Anything the app does to encourage **daily** photos, to
*remind/nag* toward a cadence, or to reward frequency (streaks) pushes users
across the line into checking. Cadence pressure is the single most dangerous
lever the app controls.

### 2.4 Comparison is the accelerant
`[DOCUMENTED]` Comparison — to a curated/idealised body, to a "before," or to a
target — is where photo features do their worst damage. Before/after and
transformation framing encodes "the "before" was a problem, the "after" is the
solution," ties self-worth to changing the body, and is specifically triggering
for people with body dysmorphia or disordered eating.
- Psychology Today (2025), *Before and After Photos*, and *Before and After
  Photos: A Cultural Obsession*.
- Cleveland Clinic, *How Social Media Can Harm Your Body Image*.
- Within Health, *Instagram's effects on body image and eating disorders*.

### 2.5 Photo-editing and appearance quantification worsen it
`[DOCUMENTED]` Editing one's own body images toward "thinner" is tied to more
negative body thoughts. AI appearance/body-fat/attractiveness scoring from a
photo introduces a fresh harm: it manufactures an authoritative-seeming *number*
about the body, trained on data "steeped in fatphobia, weight stigma and
preoccupations with youth and beauty," with no objective ground truth and
inconsistent outputs across tools.
- Aster Springs, *Photo Editing Apps and Eating Disorders*.
- CU Anschutz, *What Are the Dangers Around AI and Body Image?*
- ScienceDirect (2026), *Safety and ethical considerations for AI in body image
  and eating-disorder prevention*, S1740144526000136 / PubMed 41655362:
  "without rigorous oversight, AI systems may unintentionally reinforce
  vulnerability and exacerbate harm."

### 2.6 Gamification of the body multiplies harm
`[DOCUMENTED]` Streaks, guilt-inducing red/negative visualisations, competition
and reminders convert monitoring into compulsion. Users report guilt and shame
on breaking streaks or "failing" a goal, and "unhealthy competition with
themselves... to eat less and less." People with ED traits (perfectionism,
internalised shame) are the population most drawn in by gamified competition.
- BJPsych Open qualitative study, PMC8485346.
- *Nutrition apps... gaming features carry risks* (Washington Times / Philly
  Tribune, 2026).

**Harm summary.** A photo feature harms vulnerable users when it (a) invites or
pressures frequent checking, (b) enables comparison to a "before"/ideal/target,
(c) attaches numbers to the body (weight overlay, AI body-fat/rating), or (d)
gamifies any of the above (streaks, guilt, competition, sharing pressure). Every
one of these is a design choice VOLYUME controls and can refuse.

---

## 3. MITIGATIONS — how careful apps and clinicians reduce harm

Concrete, evidence-aligned design moves. Each is a lever VOLYUME can pull.

### 3.1 No cadence pressure — ever
`[DOCUMENTED/INFERRED]` Because frequency is the primary driver of checking
(§2.3), the feature must be **entirely user-paced**: no reminders to take a
photo, no "you haven't taken one in N days," no streaks, no completion rings on
photo-taking. The absence of pressure is itself the mitigation.
- Grounds: BJPsych Open (streaks/reminders → compulsion, guilt), PMC8485346.

### 3.2 Function-over-appearance / body-neutral framing
`[DOCUMENTED]` Clinicians and ethical-design researchers advocate shifting focus
from *how the body looks* to *what it does and what the person values*. Body
neutrality "helps cancel out the constant deluge of appearance-focused
messaging" and supports recovery.
- Equip Health, *How Body Neutrality Can Help in Eating Disorder Recovery*.
- ScienceDirect S1740144526000136 (ethical AI/design): prioritise function,
  move away from appearance-focused metrics, use body-neutral frameworks.
- Copy implication (aligns with VOLYUME's locked COACHING_VOICE synthesis):
  neutral, calm, no praise/shame on appearance. Label a photo by **date and
  optional training context**, never "looking leaner/better."

### 3.3 Remove comparison-to-ideal and dramatic reveals
`[DOCUMENTED]` No target-body/goal-body overlay, no "ideal" reference image, no
auto-generated before/after or "transformation" reveal. These are the specific
mechanics the before/after literature names as harmful (§2.4). Let a user view
their *own* dated photos; do not manufacture juxtaposition or narrative.

### 3.4 Neutral language and no numeric verdicts on the body
`[DOCUMENTED/INFERRED]` No weight/body-fat/measurement number rendered *onto* a
body photo (§2.5). No AI scoring of any kind. If change is ever surfaced, keep
it in the user's own words or as neutral date labels, not app-assigned metrics.

### 3.5 Private by default; friction on anything that leaves the device
`[DOCUMENTED/INFERRED]` Body photos are among the most sensitive data a user can
hold. Careful apps keep them **on-device and private by default**, with no
social feed, no leaderboard, and no default cloud upload. This also aligns with
VOLYUME's own GDPR/Article 9 and EU-Dublin residency mandates and the locked
rule that share cards never include bodyweight/measurements.
- Grounds: within-app harm from social comparison (§2.4); VOLYUME CLAUDE.md
  GDPR/Article 9 constraints.

### 3.6 Opt-out, easy delete, no lock-in
`[INFERRED]` The feature must be genuinely optional (never part of a required
flow), with one-tap delete of any photo and of the whole set. A user in a bad
place must be able to remove the surface instantly. Deletion must be real (also
removes any synced copy) to honour the on-device/private posture.

### 3.7 Signposting, not gating of help
`[DOCUMENTED]` Eating-disorder guidance is that people distressed by
body-checking should be pointed to support. VOLYUME already ships Beat UK
signposting and calm mode; the photo surface should be able to route into the
same signposting, and that signposting must remain **tier-blind** (per proGate
mandate).
- Grounds: Beat / clinical guidance in §2; VOLYUME locked ED-safety system.

---

## 4. THIS APP'S MODEL — how a photo feature inherits calm-mode / ED-flag suppression

VOLYUME already owns the machinery needed to make photos safe. It has:
- an **ED flag** raised by `edPatternDetector.js` and the SCOFF screen;
- **calm mode** (`wellbeing.js`);
- a **fail-closed suppression pattern** used elsewhere for weight/food-adjacent
  surfaces — a *raw AsyncStorage read* with a `'read_failed'` sentinel so that a
  transient read error suppresses rather than exposes (as used in
  `useWeeklyStreak.js` and `ProgressPhotosScreen.js`), consistent with the
  CLAUDE.md rule that weight/food-adjacent notifications suppress under an open
  ED flag and that consent/safety reads fail CLOSED.

The photo feature should treat "an open ED flag OR calm mode active" as the
**suppression condition**, read via that same raw fail-closed pattern
(`'read_failed'` ⇒ treat as suppressed). Below is the precise inheritance.
`[INFERRED]` throughout this section (it is a design recommendation grounded in
§1–§3 and the app's locked model), with the underlying harm citations noted.

### 4.1 SUPPRESS entirely under suppression condition
These are the highest-risk mechanics; they should not render at all when an ED
flag is open or calm mode is on:
- **Comparison / side-by-side / before-after views** — the accelerant (§2.4).
- **Any "transformation" or auto-generated reveal.**
- **Bodyweight / body-fat / measurement overlays on a photo** — numeric verdict
  on the body (§2.5).
- **Share-card generation from a body photo** — removes the outward-comparison
  and social-validation loop (§2.4/§2.6), and independently mandated by the
  locked "share cards never include bodyweight/measurements" rule.
- **Any AI analysis of the photo** — categorically never built (§4.4), so
  nothing to suppress, but stated for completeness.

### 4.2 SOFTEN under suppression condition
- **Prompts/CTAs to add a photo** — remove any nudge; the surface becomes
  view-only / passive. No "add this week's photo."
- **Multi-photo grid density** — `[INFERRED]` consider collapsing a dense grid
  (which invites scanning/comparison) to a calmer single-dated view. Flagged as
  a design choice for the founder, not a settled recommendation.
- **Entry-point prominence** — de-emphasise the feature's placement/notification
  surface so it is not pushed at a vulnerable user.

### 4.3 STAYS AVAILABLE (do not lock a user out of their own record)
`[INFERRED]` Viewing one's **own, already-captured, date-labelled** photos is the
self-monitoring case (§1) and is likely fine to keep available even under the
flag — abruptly hiding a user's own images could read as punitive/shaming and
conflicts with the calm, non-clipped voice. Keep:
- viewing existing own photos, plainly, by date;
- deleting photos (must always work);
- reaching Beat UK signposting from the surface.

This mirrors how the app already keeps core self-view available while suppressing
the amplifying/comparative/notifying layers.

### 4.4 NEVER build (independent of any flag)
Some mechanics are unsafe for *all* users, so gating is not enough — they must
not exist. See E2 for the full catalogue. Headline: no AI body-fat/rating from a
photo, no goal-body/ideal overlay, no streaks/nags on photo cadence, no social
leaderboard of bodies, no default cloud upload, no share-nagging.

### 4.5 Fail-closed requirement (non-negotiable)
The suppression read must fail CLOSED: if the ED-flag / calm-mode state cannot be
read (`'read_failed'` sentinel), the surface behaves as **suppressed** (§4.1
mechanics hidden), never as safe. This matches the app's existing pattern and
the CLAUDE.md rule that safety reads fail closed. A transient error must never
expose comparison/overlay/share to a flagged user.

---

## 5. VERDICT TABLE

The design phase follows this directly. Every row is grounded in §1–§4.

| BUILD FREELY (safe for all users) | GATE BEHIND CALM+ED SUPPRESSION (suppress/soften when ED flag open OR calm mode on; fail closed) | NEVER BUILD (unsafe for everyone) |
|---|---|---|
| View your **own** dated photos, plainly labelled by date | **Comparison / side-by-side / before-after** views | **AI body-fat / body-rating / attractiveness score** from a photo |
| **User-paced** capture (no reminders, no cadence) | Auto-generated **"transformation" reveals** | **Goal-body / ideal-body / target overlay** or reference image |
| **On-device, private** storage by default | **Bodyweight / body-fat / measurement overlay** on a photo | **Streaks / nags / guilt** on photo cadence |
| **One-tap delete** of any/all photos (always works) | **Share-card generation** from a body photo | **Social feed / leaderboard / ranking** of bodies |
| **Function/date-neutral** framing and copy | **Prompts/CTAs** to add a photo (soften to view-only) | **Default cloud upload** of body photos (no opt-in, no residency control) |
| **Optional** feature, never in a required flow | Dense comparison **grid** density (soften — founder decision) | **Share-nagging / guilt** to post or compare |
| **Beat UK signposting** reachable from the surface (tier-blind) | Feature **entry-point prominence** (de-emphasise) | **Photo "beautify"/slimming edit** tools |

**One-line rule for the design phase:** *keep the user's private, date-neutral,
self-paced view of their own body; suppress every comparative, numeric,
sharing, or nudging layer for flagged/calm users and fail closed; and never
build anything that scores, idealises, gamifies, ranks, or broadcasts a body.*

---

## Sources
- Nikodijevic et al. (2018), body checking/avoidance meta-analysis — https://onlinelibrary.wiley.com/doi/abs/10.1002/erv.2585
- Naturalistic body-checking & dietary restriction in AN — https://pmc.ncbi.nlm.nih.gov/articles/PMC3733328/
- PLOS One (2024), longer-term consequences of increased body checking — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0316190
- Momentary body checking & ED symptoms in AN — https://pmc.ncbi.nlm.nih.gov/articles/PMC10525023/
- Diet/fitness monitoring apps, body image & disordered eating (systematic review) — https://www.sciencedirect.com/science/article/pii/S174014452400158X
- Effects of diet and fitness apps on ED behaviours (qualitative) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
- National Center for Health Research, fitness apps & EDs — https://www.center4research.org/fitness-tracking-apps-eating-disorders/
- Alliance for Eating Disorders, From Tracking to Trapped — https://www.allianceforeatingdisorders.com/health-tracking-apps-and-disordered-eating/
- VICE, "A Twisted Comparison Game" — https://www.vice.com/en/article/pammjn/a-twisted-comparison-game-how-fitness-apps-exacerbate-eating-disorders/
- Nutrition apps gaming features carry risks (2026) — https://www.washingtontimes.com/news/2026/jun/30/nutrition-apps-help-build-healthy-habits-users-gaming-features-carry/
- Burke et al. (2011), self-monitoring systematic review — https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/
- Burke et al. (2025), adherence to self-monitoring & weight loss (mHealth RCT) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11897847/
- Dietary self-monitoring systematic review — https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/
- Webber et al. (2010), motivation & adherence — https://pubmed.ncbi.nlm.nih.gov/20138583/
- BMC Public Health (2024), self-monitoring & autonomous motivation — https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-024-17848-9
- Psychology Today, Before and After Photos — https://www.psychologytoday.com/us/blog/eating-disorder-recovery/202509/before-and-after-photos
- Psychology Today, Before and After: A Cultural Obsession — https://www.psychologytoday.com/ca/blog/body-image-and-stigma-bias/202505/before-and-after-photos-a-cultural-obsession
- Cleveland Clinic, Social Media and Body Image — https://health.clevelandclinic.org/social-media-and-body-image
- Within Health, Instagram body image & EDs — https://withinhealth.com/learn/articles/instagrams-devastating-effects-on-body-image-and-eating-disorders
- Aster Springs, Photo Editing Apps and Eating Disorders — https://astersprings.com/blog/photo-editing-apps-and-eating-disorders-what-you-need-to-know
- Equip Health, Body Neutrality in ED recovery — https://equip.health/articles/body-image/body-neutrality-eating-disorder-recovery
- ScienceDirect (2026), safety/ethics of AI in body image & ED prevention — https://www.sciencedirect.com/science/article/pii/S1740144526000136
- CU Anschutz, dangers around AI and body image — https://news.cuanschutz.edu/news-stories/what-are-the-dangers-around-ai-and-body-image
- Rumen, visual progress tracking for weight loss (industry) — https://www.rumen.com.au/article/using-progress-photos-to-stay-motivated/
