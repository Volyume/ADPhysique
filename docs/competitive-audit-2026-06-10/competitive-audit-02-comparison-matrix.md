# Competitive Audit 2026-06-10 — Phase 3: Comparison Matrix

> Synthesised from the Phase 1 codebase baseline
> (`competitive-audit-00-volyume-baseline.md`, the workout-screen deep
> audit) and the 14 Phase 2 research reports
> (`competitive-audit-01-*-research.md`). Each area below follows the
> brief's fixed format. Full evidence and citations live in the
> per-area research files; this matrix is the decision view.
>
> Method note carried from Phase 2: several agents had direct page
> fetches blocked (403) and relied on search-extracted content of the
> cited primary sources; Reddit was crawl-blocked and reached via
> secondary aggregators. Every research file flags this where it
> applies.

---

## AREA 1: Training plan generation and personalisation

**VOLYUME CURRENT STATE:** Deterministic engine; 12 goals incl. 8
physique divisions with division×days session matrices;
MEV/MAV/MRV landmarks individualised by experience/recovery/age/
nutrition; hard floors/caps; additive weak-point blocks; plain-English
"whyThis" rationale; weekly coach volume signal (-2…+3) applied across
muscles; per-session set targets from prior performance.

**TOP 10 COMPETITORS:** 1 JuggernautAI — expert system adapting on six
time-scales · 2 RP Hypertrophy — the hypertrophy benchmark, per-muscle
feedback loop · 3 MacroFactor Workouts — new (Jan 2026) rule-based
generator already rated "best auto program-generation in the App
Store" · 4 Alpha Progression — 4.9★ per-set prescriptions ·
5 Dr. Muscle — deepest per-set autoregulation, trust issues ·
6 Fitbod — ML at scale, "random" to serious lifters · 7 Sheiko Gold ·
8 Boostcamp — distribution of named programs · 9 Caliber — human
generation · 10 Evolve AI — cautionary entrant.

**WHERE VOLYUME LEADS:** Division-specific generation is uncontested
by any app (only human coaches offer it). whyThis transparency
directly answers the category's #1 trust failure (black-box
complaints). Offline generation. Engineered safety guarantees
(structural floors, delt cap, recovery-scaled systemic ceiling) have
no advertised equivalent. Honest session-duration estimates.

**WHERE VOLYUME MATCHES:** Per-set targets and weekly volume
progression match Alpha/Boostcamp mechanics; landmark
individualisation matches RP conceptually.

**WHERE VOLYUME LAGS:** No *visible* within-week autoregulation (the
post-workout survey feeds an adaptive engine, but next-session changes
aren't attributed to the user's answers per muscle). No visible
RIR-ramp/periodisation signal. Per-set recommendations undersold. No
named coach/brand authority behind the programming.

**BIGGEST GAP:** A per-session, per-muscle, *visible* autoregulation
loop — the shared engine of the top three. Achievable
deterministically as an extension of the existing adaptive engine
(`algorithms.js` already takes per-muscle stimulus ratings).

**BEST IN CLASS:** JuggernautAI — six adaptation time-scales from a
deterministic expert system; users describe it as a coach, not an app.

**USER SENTIMENT SUMMARY:** Perceived adaptivity earns the "elite"
label ("updates weights and reps based on ratings of workload and
soreness… cheat code"); invisible logic kills trust ("Fitbod seems
random", "I don't know the rules of the game"). What no app provides:
division-aware programming with visible reasoning — Volyume's to own.

---

## AREA 2: Workout logging screen (priority area)

**VOLYUME CURRENT STATE:** Measured in the deep audit: world-class
input core (1-tap prefilled log, 52pt steppers, 56pt CTA, cluster
sets, superset auto-jump) wrapped in a desk-designed context layer
(five 11pt chips above the inputs, previous performance at 11pt
italic, 5-button action row, ~29 simultaneous interactive elements,
logged sets below the fold on ≤6.1").

**TOP 10 COMPETITORS:** 1 Hevy · 2 Strong · 3 Boostcamp · 4 Alpha
Progression · 5 FitNotes · 6 Progression · 7 Liftin' · 8 GymBook ·
9 Setgraph · 10 Jefit (worst logging screen of the set).

**WHERE VOLYUME LEADS:** Tap count (1 vs Hevy's 2 cold-path),
prefilled targets with coaching intent, stepper touch targets, cluster
set logging (structurally unique), superset education, crash/stale
recovery, accessibility labelling.

**WHERE VOLYUME MATCHES:** Rest-timer functionality (exceeds on
audio/haptic escalation), set-type breadth, exercise swap.

**WHERE VOLYUME LAGS:** Context density and hierarchy. Every
benchmark app renders previous performance at input size in the input
row; Volyume renders it smallest-on-screen. Hevy ships ~12–14
interactive elements mid-workout to Volyume's ~29. Logged work never
falls below the active row in Hevy/Strong; in Volyume it falls below
the fold.

**BIGGEST GAP:** The beat line — previous performance + target as one
strong, tappable, input-sized line replacing the chip stack.

**BEST IN CLASS:** Hevy's set row: one row = one set = one decision;
previous ("45kg × 9") grey, plain, same size as inputs, tappable to
prefill; checkmark logs AND starts the timer; exactly −15/+15/Skip.

**USER SENTIMENT SUMMARY:** Speed drives switching; small input
controls are punished by name (Jefit); "extra options during a
workout" is an explicit negative; **nobody anywhere complains a
logging screen shows too little context.** No app pairs Hevy-class
cleanliness with coaching intelligence — the redesign proposal
(`competitive-audit-01-workout-screen-proposal.md`) targets exactly
that gap.

### Workout screen side-by-side (vs top 3)

| Dimension | Volyume (today) | Hevy | Strong | Boostcamp |
|---|---|---|---|---|
| Taps to log a set (steady state) | **1** (prefilled) | 2 (tap prev → check) | 2 | 2 |
| Interactive elements mid-workout | ~29 | ~12–14 | ~13–15 | ~15 |
| Previous performance | 11pt italic muted chip | Input-size grey, in-row, tappable | Input-size, in-row | In-row |
| Logged sets position | Below CTA + 5-button row (below fold ≤6.1") | In place above active row | In place | In place |
| Rest-timer controls | 5 (±15/±30/Skip) | 3 (−15/+15/Skip) | 3 | 3 |
| Smallest interactive text | 11pt (action labels, chips) | ~15–17pt equivalents | ~15–17pt | ~13pt+ |
| Coaching context in-session | Targets, coach reason, stalled nudge, deload Rx (unique) | None | None | Program % targets |
| Set-type/intensity techniques | 6 types + cluster flows (unique) | Basic | Basic | RPE support |

---

## AREA 3: AI and intelligent coaching

**VOLYUME CURRENT STATE:** Deterministic no-LLM engine; held
decisions with reasons; explicit per-row Apply consent; pre-derived
check-in inputs; hard safety floors + ED lockout; honest, shame-free
voice.

**TOP 10 COMPETITORS:** 1 MacroFactor · 2 Future · 3 Caliber ·
4 JuggernautAI · 5 RP Hypertrophy · 6 Carbon · 7 Fitbod · 8 Dr.
Muscle · 9 Whoop Coach (GPT-4, "repetitive… generic") · 10 Zing.

**WHERE VOLYUME LEADS:** Held decisions (unique in the set; nearest
rival is shallower Carbon). Explicit Apply consent (none found).
Pre-derived inputs. Safety boundaries LLM coaches demonstrably fail.

**WHERE VOLYUME MATCHES:** Adherence-neutral tone (MacroFactor's
category-winning philosophy); deterministic adaptive maths.

**WHERE VOLYUME LAGS:** No published methodology (MacroFactor's
public algorithm essays are a trust asset). No named authorship or
in-app citations (the RED-S/MATADOR receipts sit in code comments).
Weekly-only *visible* reactivity. No "ask why" drill-down.

**BIGGEST GAP:** The transparency exists but isn't marketed or
interrogable. Publish "How Precision Coaching decides", surface
citations in-app, add a deterministic templated "why?" drill-down.

**BEST IN CLASS:** MacroFactor — proof a deterministic no-LLM engine
can lead the category when the philosophy is published and the tone is
judgment-free. Volyume is architecturally aligned with the winner.

**USER SENTIMENT SUMMARY:** "When users don't understand why the app
picked a movement, they treat the system like a randomizer." Opacity,
not algorithm quality, is the retention killer. Unprovided want:
a coach that explains non-changes — Volyume already builds this and
should say so: "Every change has a reason. Every non-change has a
reason too."

---

## AREA 4: Nutrition and macro management

**VOLYUME CURRENT STATE:** Phase-based targets with named protein
approaches; adaptive TDEE; gated, capped, Apply-consented weekly
adjustments; FFM floor refusing cuts; ED lockout; MATADOR diet breaks;
refeeds/carb cycles for advanced users; calculation breakdown screen.

**TOP 10 COMPETITORS:** 1 MacroFactor · 2 Carbon · 3 RP Diet Coach ·
4 Cronometer · 5 MyFitnessPal · 6 Lose It! · 7 Noom · 8 MacrosFirst ·
9 Stronger U (closing 2026 — human coaching fails at consumer prices) ·
10 Avatar Nutrition (heritage).

**WHERE VOLYUME LEADS:** Safety architecture (no comparable system
anywhere; the market's record is actively bad — 73% of MFP users with
EDs said the app contributed). Held decisions beyond even MacroFactor.
Coached diet breaks/refeeds (MacroFactor needs manual workarounds).
One engine seeing both training and nutrition.

**WHERE VOLYUME MATCHES:** Adaptive TDEE concept; calculation
transparency; honest floors.

**WHERE VOLYUME LAGS:** No continuously visible expenditure/trend
surface between coach days; 2–3-week gating *feels* unresponsive
without it; cycle handling opt-in vs MacroFactor's automatic
robustness; free users never see the coach working.

**BIGGEST GAP:** A persistent plain-English trend/expenditure surface.
Everything required is already computed — presentation work that also
defuses the slow-cadence perception.

**BEST IN CLASS:** MacroFactor — calculation → explanation →
adherence-neutral UI as one reinforcing trust loop, with an autonomy
spectrum (Coached/Collaborative/Manual).

**USER SENTIMENT SUMMARY:** Monetisation friction, not accuracy, is
the top resentment driver ("free-to-frustrating funnel"); feature
removal is the cardinal sin. Unprovided want: science with brakes —
an app that knows when *not* to cut. Volyume owns it silently.

---

## AREA 5: Food logging and diary UX

**VOLYUME CURRENT STATE:** Offline-first bundled UK database
(OFF snapshot + CoFID), 5-tab search, barcode + label-OCR, recipes,
saved meals, multi-select diary tools, water, insights, CSV export.

**TOP 10 COMPETITORS:** 1 MacroFactor (10 actions/log; 1.36M verified
foods; meal-slot memory) · 2 Nutracheck (UK gold standard, ~300k
verified UK items incl. chains) · 3 MyFitnessPal · 4 Lose It! ·
5 Cronometer · 6 Yazio · 7 FatSecret · 8 Lifesum · 9 Foodvisor ·
10 Cal AI.

**WHERE VOLYUME LEADS:** Offline logging (nobody else; Yazio can't at
all, Cronometer won't, MacroFactor is "limited"). Label-OCR fallback
near-unique. Diary power tools match/beat MFP. No ads, no
capture-tool bait-and-switch.

**WHERE VOLYUME MATCHES:** Barcode scanning stack (vision-camera =
the same family MFP/Cronometer use); saved meals/recipes/frequents.

**WHERE VOLYUME LAGS:** No per-meal-slot memory with last-used
portion pre-fill (MacroFactor's highest-leverage speed feature, fully
deterministic). No quick-add kcal/macros (in every top-5 app; the
"imperfect day" escape hatch). Barcode-miss → OCR → custom-save not
one chained flow.

**BIGGEST GAP:** Verified UK branded data. OFF is crowdsourced and
misses UK chains (Greggs/Nando's/Costa/Pret). Inaccurate-data
complaints jump to 24.1% after six months — users quit at month four
over trust. A hand-verified top 5–10k UK SKU layer is Nutracheck's
entire moat, and is data-ops, not engineering.

**BEST IN CLASS:** MacroFactor — treats logging speed as a measured
product metric and pairs it with a verified-only database.

**USER SENTIMENT SUMMARY:** Friction is quantifiably fatal (73% of
quitters cite time; >30s/item = 43% lower 90-day retention). Photo-AI
disappoints more than it retains — the no-AI rule currently costs
nothing if deterministic speed features ship.

---

## AREA 6: Progress tracking and analytics

**VOLYUME CURRENT STATE:** Insight stack, volume heatmap vs
individualised landmarks, strength standings, consistency suite,
EWMA weight trend, Year of Lifts (365-day lock), share cards; static
SVG charts.

**TOP 10 COMPETITORS:** 1 Strava · 2 Whoop · 3 MacroFactor · 4 Apple
Fitness · 5 Hevy (free Monthly Report + Year in Review) · 6 Garmin
Connect · 7 Oura · 8 Boostcamp · 9 Strong · 10 Jefit.

**WHERE VOLYUME LEADS:** Volume heatmap against *personal* landmarks
("what you did vs what you personally need") — no competitor has it.
Insight stack + held decisions = the explanation layer Garmin users
praise.

**WHERE VOLYUME MATCHES:** Trend-weight maths (MacroFactor concept);
strength standings (Boostcamp Pro's Strength Score).

**WHERE VOLYUME LAGS:** Celebration cadence (Hevy: monthly report
after 10 workouts; Boostcamp: weekly; Volyume: 365 days). Chart
interactivity (no windows-with-recomputed-takeaway, no comparison).
Consistency is tracked richly, celebrated never (no streak mechanic).

**BIGGEST GAP:** Celebration cadence — a FREE monthly recap plus a
block-end recap (mesocycle-tied; unreplicable by competitors). The
renderer, pipeline and data all exist.

**BEST IN CLASS:** Strava overall (Year in Sport = identity-level
value; weekly streaks = the forgiving cadence that fits lifting);
MacroFactor for chart interaction (windowing + period comparison
matter more than scrubbing).

**USER SENTIMENT SUMMARY:** The Strava paywalled-recap backlash
proves recaps are the most-valued progress artefact; streaks bind hard
but need pause/repair. Do not copy: daily readiness scores as the
front door (anxiety evidence conflicts with the ED-safety posture).

---

## AREA 7: Onboarding and first value

**VOLYUME CURRENT STATE:** Account + blocking Article 9 consent
before any value; Pro = 5-step wizard (~15 inputs, has progress
indicator) → plan + nutrition reveal; Free = name only; 14-day
cardless trial granted at consent.

**TOP 10 COMPETITORS:** 1 Runna · 2 Fitbod · 3 Flo · 4 Cal AI ·
5 Noom · 6 Hevy · 7 MacroFactor · 8 Strava · 9 Caliber · 10 Whoop.

**WHERE VOLYUME LEADS:** Cardless 14-day trial (82.1% of category
trials demand a card on day 0); price shown up front; Free path is
Hevy-class fast; ~15 inputs is mid-pack (Noom: 67 steps).

**WHERE VOLYUME MATCHES:** Wizard structure, progress indication,
plan reveal with rationale.

**WHERE VOLYUME LAGS:** The account+consent wall before any value is
the most aggressive front door in the comparison set (Flo — same
special-category data — quizzes first, asks sign-up last as "save
your progress"; soft walls lift DAU ~20% and improve later hard-wall
conversion). No "building your plan" labour-illusion moment (+17%
paying conversions in Adapty A/B evidence). No concrete finishable
first action immediately after the reveal.

**BIGGEST GAP:** Sequencing — quiz before account. Requires founder +
legal sign-off because the identity model and Article 9 gate are
locked decisions; the research outlines compliant variants (answers
held locally until account creation; consent at first health-data
collection).

**BEST IN CLASS:** Runna — a 12-minute quiz that *increases* trust
because every question visibly buys a better plan, ending in a plan
reveal plus a coach message. Fitbod owns fastest-to-value.

**USER SENTIMENT SUMMARY:** Length is punished only when value stays
illegible. Make each input visibly improve the plan; the
divisions/goal-lock step is a "feel seen" moment no competitor can
copy.

---

## AREA 8: Exercise library and demonstrations

**VOLYUME CURRENT STATE:** ~449 exercises, deep metadata, ranked swap
engine, charts/PRs/goals; 169 text tips; **zero visual content**.

**TOP 10 COMPETITORS:** 1 Fitbod (HD video on all 1,600+) ·
2 MuscleWiki (5-second loops + body map, free) · 3 Jefit · 4 Muscle &
Motion (3D anatomy) · 5 Gymshark Training (free, 700+ videos) ·
6 Gymaholic (3D/AR) · 7 Alpha Progression (621–690 indie-budget
videos) · 8 Ladder · 9 Peloton · 10 Hevy (custom exercises take user
media).

**WHERE VOLYUME LEADS:** Metadata depth, swap-with-reasons,
deterministic IDs, per-exercise analytics. Tip copy quality.

**WHERE VOLYUME MATCHES:** Library breadth for a logger (449 vs
Hevy's 400+).

**WHERE VOLYUME LAGS:** Only app in the cohort at 0% visual coverage;
even free competitors clear the bar. No inline demo at the moment of
logging; custom exercises can't carry user media.

**BIGGEST GAP:** Visual demonstrations — below the category floor.
Cheapest credible route is staged: free public-domain photos → a
perpetual-licence loop dataset bundled offline (~£100–500 + curation)
→ filming the top-100 logged exercises (~£2k–10k). Avoid streaming
APIs (breaks offline-first) and AI form check (breaks no-AI/no-PII).

**BEST IN CLASS:** Fitbod for trackers — a muted auto-looping clip in
the logging card, ignorable by experts, always there for novices.

**USER SENTIMENT SUMMARY:** Guidance demand is situational; the
winning format is the silent 5–10s loop with detail one tap away.
Nobody wants a 3-minute tutorial inside a logging flow.

---

## AREA 9: Subscription, paywall, and monetisation

**VOLYUME CURRENT STATE:** Free + Pro (£4.99/£29.99), cardless
14-day trial + ledger, contextual differential paywall, day-14
cascade gate, store-localised prices, generous free tier.

**TOP 10 COMPETITORS:** 1 Hevy · 2 MacroFactor · 3 Cronometer ·
4 AllTrails · 5 Alpha Progression · 6 Strava · 7 Runna · 8 Fitbod ·
9 Peloton App · 10 Strong. (Negative exemplars: Whoop, Oura.)

**WHERE VOLYUME LEADS:** Free-tier configuration is the
Hevy-pattern this niche rewards. Trial length sits in the
high-converting band (17–32-day trials convert 42.5% vs 25.5% under
4 days). Contextual coach-computed paywall triggers are ahead of all
ten. £29.99 annual sits on the category median for a bundle
MacroFactor alone sells at ~£57–72-equivalent.

**WHERE VOLYUME MATCHES:** Reverse-trial/day-14 gate (Strava/Ladder
pattern); store-priced honesty.

**WHERE VOLYUME LAGS:** No social proof on the paywall (the
best-evidenced lever found: testimonial-led paywalls doubled trial
starts at OMENA; Flo and YAZIO ship them). No renewal-moment value
reinforcement (first-renewal retention is 30.3% category-wide; the
recap that would carry it is locked for 365 days). No lapsed-user
win-back, no cancellation-reason capture, paywall not annual-first in
the only annual-dominant category (60.6–68%).

**BIGGEST GAP:** Paywall social proof + renewal-moment reinforcement.

**BEST IN CLASS:** Hevy — monetises through goodwill; the free tier
is the marketing.

**USER SENTIMENT SUMMARY:** Subscription anger is about broken
promises, not price (Whoopgate; Strava 2020). Volyume's "never gate a
free feature" rule is its most protective monetisation asset — keep
absolute.

---

## AREA 10: Design, UX, and visual quality

**VOLYUME CURRENT STATE:** Token-complete dark system (documented
WCAG contrast, tabular numerals, M3 motion, haptic vocabulary, 4
accessibility modes); static charts; dark-only; no widgets; Live
Activity built-but-disabled.

**TOP 10 COMPETITORS:** 1 Oura · 2 Whoop · 3 Gentler Streak (ADA
winner) · 4 Apple Fitness · 5 MacroFactor · 6 Bevel · 7 Strava ·
8 Runna · 9 Peloton · 10 Hevy. References: Linear, Craft, Monzo,
(Not Boring) Habits.

**WHERE VOLYUME LEADS:** Systems thinking (token rigour, motion
tokens, haptics vocabulary) is Linear-grade and absent from Hevy-tier
competitors; accessibility beats every fitness app surveyed; voice +
amber identity is the Monzo playbook done right.

**WHERE VOLYUME MATCHES:** Skeletons/empty states; dark-mode quality;
story-format share assets.

**WHERE VOLYUME LAGS:** Charts you can't touch (Skia idle);
"one big thing" hierarchy inverted on Home and ActiveWorkout; no
widgets (the #1 ask for comparable apps) and Live Activity off;
dark-only with no roadmap answer (Whoop's own community asks why a
$400/yr app has no light mode).

**BIGGEST GAP:** Interactive charts — every design leader makes
charts a touchable surface with recomputed takeaways; the product's
hero is data.

**BEST IN CLASS:** Oura — solved Volyume's exact problem (dense data,
dark UI) with glance → mid → deep architecture and one big thing per
screen.

**USER SENTIMENT SUMMARY:** Premium = legible, touchable, optional —
not more data or stricter aesthetics. Density without hierarchy reads
"overwhelming" by month 3.

---

## AREA 11: Performance and reliability

**VOLYUME CURRENT STATE:** Offline-first incl. bundled food DB;
crash/stale recovery; wall-clock timers; export + backup; Sentry +
200+ test files; 71 migrations.

**TOP 10 COMPETITORS:** 1 FitNotes · 2 Strong · 3 MacroFactor ·
4 Hevy · 5 Cronometer · 6 Garmin Connect · 7 Strava · 8 Whoop ·
9 Jefit (counter-example) · 10 MyFitnessPal (counter-example).

**WHERE VOLYUME LEADS:** Offline *nutrition* logging is a category
outlier (MFP can't search offline, Cronometer won't, MacroFactor is
"limited"). Session-loss protections address the angriest failure
mode. Export/backup already matches the FitNotes trust formula.

**WHERE VOLYUME MATCHES:** Crash-free expectations (category median
99.98% sessions; Play ceilings 1.09% crash / 0.47% ANR; cold start
<2s — hold these).

**WHERE VOLYUME LAGS (risks, not present failures):** No SSO
duplicate-account merge guard (Strong's #1 perceived-loss cause); no
pre-migration auto-snapshot (the MFP update-wipe class); wearable sync
will need idempotent imports + visible last-sync state.

**BIGGEST GAP:** Marketing, not engineering — reliability leaders
*advertise* offline/export/no-trackers; Volyume buries all three in
Settings.

**BEST IN CLASS:** FitNotes — local-first + visible export = a
decade of "never lost my data" reputation at zero marketing spend.

**USER SENTIMENT SUMMARY:** Perceived data loss is reputationally
fatal and usually sync/identity-caused, narrated publicly for years
("MFP lost 6 years of my data").

---

## AREA 12: Accountability and community

**VOLYUME CURRENT STATE:** None (deliberate). Share cards are the
only outward surface. Privacy-first brand; ED-safety system.

**TOP 10 COMPETITORS (implementations studied):** Whoop Teams (best
consent architecture) · Apple Activity Sharing · Strava
clubs/kudos/segments · Hevy feed · GymRats/Fitness Pact ·
TrueCoach/TrainHeroic/Hevy Coach (coach-view) · Fitbit Challenges
(killed 2023, revolt) · Peloton leaderboard · Gentler Streak (rest-
positive streaks) · MFP forums (cautionary).

**WHERE VOLYUME LEADS:** Nothing shipped — but the privacy-first
positioning is itself an asset no feed-bearing incumbent can claim.

**WHERE VOLYUME LAGS:** No accountability mechanic at all; the
evidence says a small, consented one drives retention (kudos increase
training frequency, peer-reviewed).

**BIGGEST GAP / OPPORTUNITY:** A 1:1 Training Partner / Coach View
link — pair by code, Whoop-style preview of exactly what's shared,
derived signals only (sessions done vs planned, streak, trained-today
tick + nudge), never weights/body/nutrition/location. Precursor that
ships first: a shame-free, rest-aware weekly adherence streak with
pause/repair.

**BEST IN CLASS:** Whoop Teams for consent architecture; Gentler
Streak for rest-positive streaks; Fitbit (RIP) proved small private
challenges were the loyalty engine.

**USER SENTIMENT SUMMARY:** The line: accountability = a small chosen
group sees whether you did what you said; social media = an
uncontrolled audience judges how well. Never build feeds, followers,
public leaderboards; never let body weight, calories or check-in data
onto a shared surface (MFP's 14-year pro-ana drift is the proof, and
it would put the ED-safety system at war with the social layer).

---

## AREA 13: Check-in and weekly review

**VOLYUME CURRENT STATE:** 4-step gated check-in with pre-derived
answers; coach card with Apply rows, why-line, held decisions +
history; separate 7-question post-workout survey.

**TOP 10 COMPETITORS:** 1 MacroFactor · 2 Working Against Gravity ·
3 Stronger U · 4 Carbon · 5 Avatar Nutrition (heritage) · 6 RP Diet
Coach · 7 Whoop WPA · 8 Everfit · 9 Oura Reports · 10 Noom.

**WHERE VOLYUME LEADS:** The pre-derive-then-confirm/override pattern
is unclaimed ground (MacroFactor derives silently with no override
moment; Carbon asks blind; human coaches do it manually). Held
decisions: the only precedent is defunct. EWMA gating avoids the
genre's loudest complaint (one-day-spike slashing).

**WHERE VOLYUME MATCHES:** Fail-closed data gates (Whoop ≥5 days,
Oura ≥2 weeks).

**WHERE VOLYUME LAGS:** Ask cost. MacroFactor's check-in is 0–2
questions with a one-tap Fast Check-In; Volyume asks ~6 subjective
items over 4 steps with no fast path. The 7-question post-workout
survey breaches the sports-science ceiling (<5) and exceeds every
competitor's stacked ask; 3 of 7 duplicate weekly constructs.

**BIGGEST GAP:** Survey cost — trim post-workout to 3–4 items, move
readiness items pre-session (the intent prompt already exists), add a
Fast Check-In for consistently-green weeks.

**BEST IN CLASS:** MacroFactor — ask-vs-show discipline ("only asking
questions when answers can meaningfully impact the trajectory").

**USER SENTIMENT SUMMARY:** Engaged users punish *dilution* of review
substance (Whoop's lighter Month in Review = "huge disappointment") —
cut question cost, never card density. "A short survey leads to really
good data that athletes consistently complete."

---

## AREA 14: Steps, cardio, and activity tracking

**VOLYUME CURRENT STATE:** Aggregator-deduped silent step reads;
phase-banded compliance-gated step targets; steps-before-cardio
escalation; cardio kcal shown but never added to food targets; weight
import; no watch app.

**TOP 10 COMPETITORS:** 1 MacroFactor · 2 Whoop · 3 Garmin Connect ·
4 Fitbod · 5 Carbon · 6 RP Diet Coach · 7 Hevy/Strong · 8 Apple
Fitness · 9 Cronometer · 10 Withings/Renpho. (MFP = the anti-pattern.)

**WHERE VOLYUME LEADS:** Energy-balance ownership of cardio kcal is
the validated category answer (MacroFactor and Carbon converged on
it; MFP's add-back model is the largest documented confusion source).
**No competitor ships automatic, phase-banded, compliance-gated step
targets.** Steps-before-cardio escalation encodes coaching practice
no app has. Aggregate-API dedupe pre-empts a whole bug class.

**WHERE VOLYUME MATCHES:** Health-platform integration breadth for a
logger.

**WHERE VOLYUME LAGS:** Shows a cardio kcal estimate it silently
ignores (one explanatory line missing); no sync self-service surface;
no watch app ("the integration question matters as much as the app
itself"); activity doesn't feed the recovery picture.

**BIGGEST GAP:** Transparency line + (later) MacroFactor-style
step-informed trend confidence (deterministic, no kcal assignment).

**BEST IN CLASS:** MacroFactor; runner-up Whoop Strength Trainer
(wrist-derived muscular load, 97% test–retest).

**USER SENTIMENT SUMMARY:** Lifters don't resent activity tracking —
they resent cardio-biased scoring of lifting. Never: add exercise
kcal to food targets; ingest wearable kcal; ship a cardio-driven
"training status" verdict on lifters.

---

*Next: `competitive-audit-03-master-proposals.md` consolidates every
gap above into scored, tiered proposals.*
