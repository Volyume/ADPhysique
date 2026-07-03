# E2 — Progress-Photo Anti-Pattern Catalogue ("do NOT build")

**Author:** Safety research lead, VOLYUME progress-photo feature
**Date:** 2026-07-03
**Status:** Research (E-phase). No app code touched. This is the definitive
"do NOT build" list for the design phase.
**Companion:** E1-evidence-safety.md (evidence base + verdict table).

Every mechanic below appears in real diet/fitness/photo apps and/or is named in
the clinical literature as harmful. Each entry gives: the **named pattern**, its
**harm mechanism**, the **evidence**, and **why VOLYUME must refuse it** against
the locked ED-safety mandate. Entries are grouped by the kind of harm they
produce. `[DOCUMENTED]` / `[INFERRED]` tags as in E1.

Two tiers of refusal:
- **NEVER BUILD** — unsafe for all users; gating cannot make it safe.
- **GATE (suppress under ED flag / calm mode, fail closed)** — has a legitimate
  low-risk use but must be suppressed for vulnerable users; listed here because
  the *unguarded* version is an anti-pattern.

The default posture is refusal. If any item is ever reconsidered, that is an
explicit founder decision surfaced in advance (CLAUDE.md §4 no-parking rule),
never a quiet build.

---

## A. Idealisation & comparison-to-a-standard

### A1. Goal-body / ideal-body / target-physique overlay — **NEVER BUILD**
**Mechanism.** Superimposing or displaying a target/"ideal" body against the
user's own photo makes every look a measurement of the *gap* to an external
ideal. This is textbook body-checking-by-comparison and encodes "your body is a
problem to be fixed."
`[DOCUMENTED]` Before/after & ideal-comparison harm — Psychology Today, *Before
and After Photos*; Cleveland Clinic, *Social Media and Body Image*; comparison
as ED accelerant — Nikodijevic et al. (2018).
**Why VOLYUME refuses.** Directly manufactures body dissatisfaction; irreconcilable
with body-neutral, no-shame coaching voice and the ED-safety mandate.

### A2. Auto-generated "transformation" / dramatic before-after reveal — **NEVER BUILD**
**Mechanism.** The app juxtaposes an early photo against a recent one as a
narrative "reveal." Before/after framing ties self-worth to changing the body,
rewards the visual drama, and is specifically triggering for people with
disordered eating or body dysmorphia.
`[DOCUMENTED]` Psychology Today (2025) *Before and After Photos* and *A Cultural
Obsession*; Within Health; Beyond the Push Fitness, *The Harm in Before and After
Photos*.
**Why VOLYUME refuses.** The app must never generate comparison the user did not
create. Let users view their own dated photos; never build the "reveal."

### A3. Body-fat / physique "rating" or scoring from a photo — **NEVER BUILD**
**Mechanism.** Assigning a number/grade/percentile to a body photo creates an
authoritative-seeming verdict that becomes a new target to chase and a new thing
to fail against.
`[DOCUMENTED]` AI body/attractiveness scoring harm — CU Anschutz; NewBeauty,
*Dangers of AI Attractiveness Scanners*; "looksmaxxing"/rating-app coverage.
**Why VOLYUME refuses.** Number-chasing on the body is exactly what the calorie-
floor / anti-obsession posture exists to prevent. See also C1.

---

## B. Numeric verdicts on the body

### B4. Bodyweight / body-fat / measurement overlay burned onto a photo — **GATE** (unguarded = anti-pattern)
**Mechanism.** Stamping a weight/measurement number onto a body image fuses
"how I look" with "the number," turning a photo into a weigh-in and inviting
day-over-day numeric comparison — a body-checking loop.
`[DOCUMENTED]` App numeric visualisations & guilt — BJPsych Open (PMC8485346);
body-checking (weighing/measuring) as ED-maintaining — Nikodijevic et al. (2018).
**Why VOLYUME refuses/gates.** Suppress entirely under ED flag / calm mode (E1
§4.1). Even for low-risk users it must never appear on a *shared* card (locked
rule: share cards exclude bodyweight/measurements). Prefer no numeric overlay at
all; if ever offered, off by default and gated.

### B5. "You're down Xkg — look how far you've come" delta call-out on a body — **GATE/NEVER (framing-dependent)**
**Mechanism.** Attaching a weight-delta narrative to a body image praises the
descending number and re-centres worth on weight change; harmful for a
recomposition user and triggering for a restrictive user.
`[DOCUMENTED]` Weight-loss praise & before/after messaging harm — Psychology
Today; guilt/competition dynamics — BJPsych Open.
**Why VOLYUME refuses.** No appearance/weight praise (COACHING_VOICE). Never on a
share card. Suppress any weight-linked call-out under the flag; keep date-neutral
labels only.

---

## C. Automated appearance judgement (AI)

### C6. Any AI analysis of a body photo (body-fat estimate, "leanness", rating) — **NEVER BUILD**
**Mechanism.** AI trained on appearance data "steeped in fatphobia, weight
stigma and preoccupations with youth and beauty," with no objective ground truth
and inconsistent cross-tool outputs, produces a spurious authoritative verdict
that drives distress and ED behaviour. It also imports the exact thing VOLYUME's
constitution forbids: a non-deterministic, AI judgement about the user's body.
`[DOCUMENTED]` ScienceDirect (2026) AI/body-image ethics (PubMed 41655362);
CU Anschutz; NewBeauty. `[INFERRED]` also violates CLAUDE.md "no AI, ever" +
determinism mandate.
**Why VOLYUME refuses.** Double violation: ED-harm *and* the anti-AI /
deterministic-engine constitution. Categorical.

### C7. Photo "beautify" / slimming / auto-retouch tools — **NEVER BUILD**
**Mechanism.** Editing one's body image toward "thinner/better" is tied to more
negative body thoughts and distorts self-perception.
`[DOCUMENTED]` Aster Springs, *Photo Editing Apps and Eating Disorders*.
**Why VOLYUME refuses.** Actively manufactures body dissatisfaction; antithetical
to honest, neutral self-monitoring.

---

## D. Cadence pressure & gamification

### D8. Streaks / rings / "N-week photo streak" on photo-taking — **NEVER BUILD**
**Mechanism.** Streaks convert a paced record into a compulsion; breaking one
produces guilt and shame, and frequency itself is what turns monitoring into
body-checking.
`[DOCUMENTED]` BJPsych Open (streaks/reminders → compulsion, guilt);
*Nutrition apps... gaming features carry risks* (2026); frequency→checking —
PLOS One (2024).
**Why VOLYUME refuses.** Cadence pressure is the single most dangerous lever (E1
§2.3). No streaks, rings, or completion mechanics on photos, for anyone.

### D9. Reminders / nags to take a photo ("you haven't added one in N days") — **NEVER BUILD (as pressure)**
**Mechanism.** Scheduled prompts push toward a checking cadence the user didn't
choose and manufacture guilt on non-compliance.
`[DOCUMENTED]` BJPsych Open (reminders/notifications → guilt, failing-to-keep-up
feelings). `[INFERRED]` also collides with the locked rule that weight/food-
adjacent notifications suppress under an open ED flag.
**Why VOLYUME refuses.** The feature must be entirely user-paced (E1 §3.1). No
photo reminders; certainly none under an ED flag.

### D10. Guilt / "red" negative visualisation for missing a photo cadence — **NEVER BUILD**
**Mechanism.** Colour-coded "you failed" feedback produces shame; users report
guilt from red/negative app feedback, which can drive compensatory behaviour.
`[DOCUMENTED]` BJPsych Open (red visualisations → guilt/shame).
**Why VOLYUME refuses.** No-shame, no-guilt voice is locked. Never punish a photo
gap.

### D11. Progress-photo "goals"/targets ("take 12 photos this cycle") — **NEVER BUILD**
**Mechanism.** Turning photo-taking into a quantified goal invites the same
obsessive-logging spiral as calorie targets and rewards frequency.
`[DOCUMENTED]` Quantified-self → obsession — BJPsych Open.
**Why VOLYUME refuses.** Photos are a passive optional record, never a KPI.

---

## E. Social exposure & comparison to others

### E12. Social feed / leaderboard / ranking of bodies — **NEVER BUILD**
**Mechanism.** Public bodies invite upward social comparison, competition, and
validation-seeking — the strongest documented driver of body dissatisfaction and
ED symptoms, and the pattern that most draws in perfectionistic/shame-prone ED
profiles.
`[DOCUMENTED]` Instagram/social comparison harm — Within Health, Cleveland
Clinic; gamified competition & ED traits — ScienceDirect ethics review, BJPsych
Open.
**Why VOLYUME refuses.** No social layer on bodies, ever. Photos are private.

### E13. Share-card generation from a body photo — **GATE + constrained** (unguarded = anti-pattern)
**Mechanism.** Externalising a body image invites public comparison and
validation loops; a weight/measurement-bearing card additionally leaks sensitive
data.
`[DOCUMENTED]` Social-comparison harm (as E12). `[INFERRED]` locked rule: share
cards never include name/bodyweight/measurements/private notes.
**Why VOLYUME refuses/gates.** Suppress body-photo share-card generation under ED
flag / calm mode (E1 §4.1); any permitted card must carry no body metrics.
Default posture: do not build body-photo sharing at all.

### E14. Share-nagging / guilt to post or "show your progress" — **NEVER BUILD**
**Mechanism.** Prompting/guilting users to share their body compounds
validation-seeking and social-comparison exposure.
`[DOCUMENTED]` Social validation loops — Cleveland Clinic; guilt mechanics —
BJPsych Open.
**Why VOLYUME refuses.** No sharing pressure of any kind.

---

## F. Data / residency (sensitive-photo handling)

### F15. Default cloud upload of body photos — **NEVER BUILD (as default)**
**Mechanism.** Body photos are among the most sensitive personal data. Silent
cloud sync creates breach/exposure risk and removes user control; combined with
any of the above it compounds harm.
`[DOCUMENTED]` `[INFERRED]` — VOLYUME GDPR/Article 9 + EU-Dublin residency +
data-minimisation + offline-first (local DB is device truth) constitution.
**Why VOLYUME refuses.** Body photos stay on-device / private by default (E1
§3.5). If any sync is ever offered it is explicit opt-in, EU-Dublin, encrypted,
and fully deletable — a separate founder decision, not a default.

### F16. Non-deletable / "locked-in" photo history — **NEVER BUILD**
**Mechanism.** A user in distress must be able to remove the surface instantly;
an undeletable history traps them with a body-checking trigger.
`[INFERRED]` extension of §3.6 mitigations + GDPR erasure rights.
**Why VOLYUME refuses.** One-tap delete of any/all photos must always work,
including any synced copy.

---

## G. Framing & language

### G17. Appearance praise / "looking leaner/shredded/better" copy — **NEVER BUILD**
**Mechanism.** Appearance-evaluative language centres worth on looks and
reinforces the thin/lean-ideal, harmful for restrictive and dysmorphic users.
`[DOCUMENTED]` body-neutrality guidance — Equip Health; ethics review —
ScienceDirect S1740144526000136. `[INFERRED]` COACHING_VOICE (no shame, no
appearance judgement).
**Why VOLYUME refuses.** Label photos by **date** (and optional neutral training
context) only. No adjectives about the body.

### G18. "Fix your problem areas" / deficiency framing — **NEVER BUILD**
**Mechanism.** Directing attention to "problem" body parts is precisely the
part-focused scrutiny that defines body-checking and deepens dissatisfaction.
`[DOCUMENTED]` part-focused body-checking — Nikodijevic et al. (2018);
Medical News Today, *What is body checking?*
**Why VOLYUME refuses.** Never guide the user's gaze to "flaws." Whole-person,
neutral, function-oriented only.

---

## Quick-reference: the refusal list

**NEVER BUILD (unsafe for everyone):** goal-body/ideal overlay (A1);
auto transformation reveal (A2); photo body-fat/physique rating (A3); any AI
photo analysis (C6); beautify/slimming edit (C7); photo streaks/rings (D8);
photo reminders/nags (D9); guilt/red-fail feedback (D10); photo goals/targets
(D11); social feed/leaderboard of bodies (E12); share-nagging/guilt (E14);
default cloud upload (F15); non-deletable history (F16); appearance-praise copy
(G17); "problem areas"/deficiency framing (G18).

**GATE — suppress under ED flag / calm mode, fail closed (unguarded version is an
anti-pattern):** comparison/side-by-side views; weight/measurement overlay (B4);
weight-delta call-out (B5); body-photo share-card generation (E13); add-a-photo
prompts/CTAs.

**The one rule:** if a mechanic scores, idealises, gamifies, ranks, broadcasts,
nags, or stamps a number on a body — VOLYUME does not build it. What remains is
a private, date-neutral, self-paced view of the user's own photos, with easy
delete and Beat UK signposting.

---

## Sources
- Nikodijevic et al. (2018), body checking/avoidance meta-analysis — https://onlinelibrary.wiley.com/doi/abs/10.1002/erv.2585
- PLOS One (2024), longer-term consequences of increased body checking — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0316190
- Medical News Today, What is body checking? — https://www.medicalnewstoday.com/articles/body-checking
- Effects of diet and fitness apps on ED behaviours (qualitative) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
- Nutrition apps gaming features carry risks (2026) — https://www.washingtontimes.com/news/2026/jun/30/nutrition-apps-help-build-healthy-habits-users-gaming-features-carry/
- Psychology Today, Before and After Photos — https://www.psychologytoday.com/us/blog/eating-disorder-recovery/202509/before-and-after-photos
- Psychology Today, Before and After: A Cultural Obsession — https://www.psychologytoday.com/ca/blog/body-image-and-stigma-bias/202505/before-and-after-photos-a-cultural-obsession
- Beyond the Push Fitness, The Harm in Before and After Photos — https://www.beyondthepushfitness.com/post/the-harm-in-before-and-after-photos-beyond-the-surface
- Cleveland Clinic, Social Media and Body Image — https://health.clevelandclinic.org/social-media-and-body-image
- Within Health, Instagram body image & EDs — https://withinhealth.com/learn/articles/instagrams-devastating-effects-on-body-image-and-eating-disorders
- Aster Springs, Photo Editing Apps and Eating Disorders — https://astersprings.com/blog/photo-editing-apps-and-eating-disorders-what-you-need-to-know
- ScienceDirect (2026), safety/ethics of AI in body image & ED prevention — https://www.sciencedirect.com/science/article/pii/S1740144526000136
- CU Anschutz, dangers around AI and body image — https://news.cuanschutz.edu/news-stories/what-are-the-dangers-around-ai-and-body-image
- NewBeauty, Dangers of AI Attractiveness Scanners — https://www.newbeauty.com/view/dangers-of-ai-attractiveness-scanners
- Equip Health, Body Neutrality in ED recovery — https://equip.health/articles/body-image/body-neutrality-eating-disorder-recovery
