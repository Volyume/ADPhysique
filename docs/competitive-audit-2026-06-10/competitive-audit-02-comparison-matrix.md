# Competitive Audit 2026-06-10 — Document 02: Comparison Matrix

Synthesised from the 14 area research reports (documents 01-*) measured
against the Volyume baseline (document 00). Each area below follows the
same structure. Detailed per-app evidence and sources live in the
corresponding 01 report; this matrix is the decision-grade summary.

---

## AREA 1: Training plan generation and personalisation

**VOLYUME CURRENT STATE:** Deterministic generator with the richest input
set in the category (7 goals incl. V-taper/X-frame, 15 named weak points,
equipment, recovery), MEV/MAV/MRV landmarks, SFR-ranked selection,
per-exercise rationale. Plan reveal is a plain list.

**TOP 10:** RP Hypertrophy (elite hypertrophy autoregulation), JuggernautAI
(elite powerlifting AI), Dr. Muscle (set-by-set auto-progression), Alpha
Progression (value generator + animations), Fitbod (mass-market equipment-
aware generator), Caliber (human-coach hybrid, 4.9 Trustpilot), Boostcamp
(curated program library), Evolve AI, MyoAdapt, MacroFactor training module
(nascent).

**WHERE VOLYUME LEADS:** Goal taxonomy and weak-point specialisation (no
competitor has named weak-point programming); price (£4.99 vs RP/Juggernaut
$35-49/mo); offline-first (neither leader works offline); per-exercise
rationale text.
**WHERE VOLYUME MATCHES:** Volume autoregulation loop (conceptually
identical to RP's pump/soreness/effort → weekly volume, but Volyume's is
confirm-then-apply and explained, RP's is silent).
**WHERE VOLYUME LAGS:** Brand authority (RP has Israetel, Juggernaut has
elite athletes); post-generation plan editability; reveal experience.

**BIGGEST GAP:** The plan reveal squanders the richest input set in the
category — intelligence users never perceive.
**BEST IN CLASS:** RP Hypertrophy's feedback→volume loop (programming
reputation); Caliber for *perceived* personalisation (manufactured at
onboarding/reveal, proving perception is a presentation problem).
**USER SENTIMENT SUMMARY:** Users want plans that visibly respond to them
and say *why*; the category fails on "feels random", "crushed me with
volume", "no explanation". Nobody combines elite programming, explanation,
fair price, and offline.

---

## AREA 2: Workout logging and session experience

**VOLYUME CURRENT STATE:** Table-as-input logging (just shipped), prefill +
previous per row, deterministic targets, overload nudge, live Est. 1RM,
8 set types, slim rest timer + sticky notification, plate calculator,
SFR-ranked + discomfort-reactive swaps, crash recovery, offline-first.

**TOP 10:** Hevy, Strong, Jefit, Alpha Progression, Boostcamp, Setgraph,
RepCount, Gravitus, Lyfta, Liftin'.

**WHERE VOLYUME LEADS:** Only app combining fast table logging,
deterministic in-session targets, volume landmarks, intelligent
substitution and offline-first; only discomfort-reactive swap engine.
**WHERE VOLYUME MATCHES:** Tap-efficiency of the new table idiom (~Hevy/
Strong class); rest timer basics.
**WHERE VOLYUME LAGS:** No lock-screen rest-timer controls (Hevy ships
±15s/skip/complete-set on the lock screen, free, both platforms); no
Strong/Hevy CSV importers; no Wear OS surface.

**BIGGEST GAP:** Lock-screen/notification rest-timer controls — the most
visible logging differentiator Volyume lacks; compounded by Android
battery managers killing timers (the category's most universal complaint,
direct risk for a UK Android-first app).
**BEST IN CLASS:** Hevy — speed, prefill, lock-screen timer, reliability
reputation.
**USER SENTIMENT SUMMARY:** Loyalty = prefill + sub-10s logging +
accumulated history. "Hevy logs what you do; it doesn't tell you what to
do next" — guidance during logging is the unmet want Volyume already
serves. Paywalled export is hated; history is the retention moat, so
importers convert competitors' moat into an acquisition channel.

---

## AREA 3: AI and intelligent coaching

**VOLYUME CURRENT STATE:** Deliberately deterministic weekly engine;
explained, capped, confirm-then-apply; data-hold honesty; hard safety
floors; no daily presence beyond a static one-line narrative.

**TOP 10:** MacroFactor, JuggernautAI, Future ($149/mo human), Carbon,
RP Hypertrophy, Caliber, Fitbod, Whoop Coach (LLM), Bevel, Dr. Muscle.

**WHERE VOLYUME LEADS:** The only product combining explainability,
adherence-forgiveness, confirm-then-apply, data-hold honesty AND safety
floors — no surveyed competitor has all five; no competitor has any
ED/RED-S system.
**WHERE VOLYUME MATCHES:** MacroFactor on adherence-neutral adjustment
philosophy.
**WHERE VOLYUME LAGS:** Between-check-in presence (Future's daily "someone
notices me" is the class retention winner); algorithm reputation/folklore
(MacroFactor's published algorithm is community-defended).

**BIGGEST GAP:** Between-check-in presence — weekly-only cadence risks
feeling transactional.
**BEST IN CLASS:** MacroFactor — adherence-neutral weekly adjustment,
published methodology, community trust.
**USER SENTIMENT SUMMARY:** 42% are AI-coaching skeptics; 55% have privacy
worries; one unexplained absurdity reclassifies an app from "coach" to
"random number generator". "Deterministic, explained, we show our working"
is a marketable position (Caliber already monetises "not AI bots") — frame
as benefit, not technology.

---

## AREA 4: Nutrition and macro management

**VOLYUME CURRENT STATE:** Deterministic targets with "Why these numbers?"
narrative; adaptive TDEE ±5% capped; safety floors; refeed engine and
high/low-day macros exist as dead/unbuilt code; cycle input dead.

**TOP 10:** MacroFactor, Carbon, RP Diet Coach, MFP Premium, Cronometer,
Lose It!, Avatar Nutrition, Noom, MacrosFirst, Stronger U (shutting down
31 March 2026 — an acquisition pool of pay-proven macro-coaching users).

**WHERE VOLYUME LEADS:** Safety (category-unique mechanistic ED safeguards;
MFP's 1200-kcal default carries a 73%-of-ED-patients clinical finding);
in-app target explanation (beats even MacroFactor, which explains via blog).
**WHERE VOLYUME MATCHES:** Adaptive TDEE concept; weekly adjustment cadence.
**WHERE VOLYUME LAGS:** Cycle-noise handling (MacroFactor's Expenditure
Modifiers absorb menstrual/creatine/fluid noise without period logging);
algorithm maturity/track record; periodisation affordances (refeeds, diet
breaks, calorie banking).

**BIGGEST GAP:** Refeed engine + high/low-day macros sitting as dead code —
the most-wished-for features that even the market leader lacks natively.
**BEST IN CLASS:** MacroFactor — adherence-neutral engine + expenditure
modifiers.
**USER SENTIMENT SUMMARY:** The dominant failure is the static, unexplained,
guilt-enforced target; >50% quit tracking within three weeks. Users wish
apps understood cycles, refeeds, diet breaks, social events.

---

## AREA 5: Food logging and diary UX

**VOLYUME CURRENT STATE:** UK-first curated waterfall (OFF UK ~25k bundled
+ CoFID + live OFF + USDA), offline search, free barcode, label OCR,
recipes/meals/favourites, copy-yesterday, sanity checks.

**TOP 10:** MacroFactor, Nutracheck (UK gold standard), Lose It!, MFP,
Cronometer, Yazio, FatSecret, Foodvisor, Lifesum, Cal AI/SnapCalorie.

**WHERE VOLYUME LEADS:** Data trust vs crowdsourced chaos (72% of MFP users
report database inaccuracies); free barcode (MFP/Lose It! retro-paywalled
theirs); fully offline search (no major competitor can claim it); on-device
OCR.
**WHERE VOLYUME MATCHES:** Logging mechanics (meals, favourites, recipes,
copy-yesterday) vs the mid-field.
**WHERE VOLYUME LAGS:** UK branded/chain-restaurant depth — ~25k vs
Nutracheck's 500k nutritionist-verified UK foods with photos (4.9
Trustpilot: "I can actually find the foods I eat"); MacroFactor's measured
tap-budget benchmark (24 actions vs MFP's 36); product photos.

**BIGGEST GAP:** First-search success for UK branded foods — the strongest
retention lever in the corpus.
**BEST IN CLASS:** MacroFactor (speed + verified data); Nutracheck (UK
depth).
**USER SENTIMENT SUMMARY:** ~80% of trackers quit within weeks, 73% citing
time burden; AI photo logging is overhyped (68-71% accuracy, worse on
non-American food) — validating Volyume's curated, no-AI stance.

---

## AREA 6: Progress tracking and analytics

**VOLYUME CURRENT STATE:** Lifts/est-1RM trends, strength standards, volume
heatmap, consistency, insights engine, recovery EMAs, Year of Lifts
(365-day), share cards, daily one-liner.

**TOP 10:** Whoop, Hevy, MacroFactor, Strava, Garmin Connect, Oura, Strong,
Apple Fitness, Gravitus, Boostcamp.

**WHERE VOLYUME LEADS:** Analytical substance vs 8 of 10 (volume landmarks,
plateau/fatigue insights, strength standards); insights connected to a
coach that can act.
**WHERE VOLYUME MATCHES:** Core lifting charts vs Hevy/Strong.
**WHERE VOLYUME LAGS:** Information architecture (Whoop's one-score →
trends → raw progressive disclosure); celebration cadence (Hevy: free
monthly report, annual recap unlocked at 10 workouts).

**BIGGEST GAP:** The retention dead-zone between the daily one-liner and
the 365-day unlock — the first real celebration arrives after the churn
window (80% churn within 3 months, typically at the first plateau).
**BEST IN CLASS:** Whoop — progressive-disclosure stack.
**USER SENTIMENT SUMMARY:** The category failure is the descriptive
dashboard; nobody reframes plateaus constructively (2025 BJHP: apps induce
"shame, disappointment, futility"). Never paywall a previously free recap
(Strava/Garmin revolts).

---

## AREA 7: Onboarding and first value

**VOLYUME CURRENT STATE:** Account → Article 9 consent → body stats (incl.
body fat) → goal setup before any plan exists; 14-day cardless trial
(under-marketed); strong rationale after the wall.

**TOP 10:** Fitbod, Duolingo (reference), Cal AI, MacroFactor, Hevy,
Caliber, Strong, Whoop, RP Hypertrophy, Noom (cautionary).

**WHERE VOLYUME LEADS:** Per-exercise rationale (the biggest unmet trust
need); 14-day cardless trial (rare).
**WHERE VOLYUME MATCHES:** Quiz quality/signal.
**WHERE VOLYUME LAGS:** Time-to-first-value — the pre-value commitment wall
is the exact pattern the category punishes hardest (Noom's 113-screen
quiz, Hevy's account wall, RP's pre-workout paywall are the canonical
failures).

**BIGGEST GAP:** No felt value before the account/consent/stats wall.
**BEST IN CLASS:** Fitbod — one high-signal question → complete first
workout in minutes; first-workout completion is its strongest retention
predictor.
**USER SENTIMENT SUMMARY:** Users tolerate almost any quiz or price AFTER a
felt moment of value, and resent almost any friction BEFORE it. Cardless
trial removal lifted starts 71% in documented cases — say "no card for 14
days" up front.

---

## AREA 8: Exercise library and demonstrations

**VOLYUME CURRENT STATE:** ~448 exercises with category-leading metadata
(SFR, fatigue cost, subregion, ranked substitutes); demos thin (2 licensed
videos + frame loops); MoveKit full licence undecided.

**TOP 10:** Fitbod (1,600+ filmed videos), Muscle & Motion (3D anatomy),
MuscleWiki, RP Hypertrophy (250 Israetel technique videos), Alpha
Progression (animations), Jefit, Hevy, Strong, Nike Training Club,
Freeletics.

**WHERE VOLYUME LEADS:** Metadata and substitute intelligence — no audited
competitor exposes stimulus-to-fatigue reasoning.
**WHERE VOLYUME MATCHES:** Library breadth (~448 is mid-field adequate).
**WHERE VOLYUME LAGS:** Visual demonstration coverage vs EVERY ranked app
(2 videos vs 350-2,000) — the first thing beginners notice.

**BIGGEST GAP:** Demo coverage. The MoveKit full licence (~$99 one-time,
200+ consistent offline-bundleable animations) covers ~45% of the library
in the already-integrated style; pair with one day of in-house filming for
~20 flagship lifts.
**BEST IN CLASS:** Fitbod for delivery (multi-angle, instant, never
interrupts logging); Muscle & Motion for depth.
**USER SENTIMENT SUMMARY:** Breakthrough quotes belong to MuscleWiki;
failure mode is bloat + shallow demos + intrusive monetisation. AI
form-check sentiment is sceptical-to-burned — no-AI is an asset. Keep
demos free.

---

## AREA 9: Subscription, paywall, and monetisation

**VOLYUME CURRENT STATE:** Free training core / Pro coaching+nutrition;
£4.99/mo, £29.99/yr; 21-day cardless-then-intro trial; differential
paywall triggers.

**TOP 10:** Hevy, Boostcamp, MacroFactor, Strong, Alpha Progression,
Caliber, Cronometer, Fitbod, MFP (cautionary), Whoop (cautionary).

**WHERE VOLYUME LEADS:** Price-to-scope (undercuts every coaching
comparator while bundling training + nutrition: MFP £49.99/yr UK,
MacroFactor ~£55/yr, Fitbod ~$96/yr, RP ~$300/yr); trial length (21 days
cardless beats MacroFactor's 7, Alpha's 14); free tier beats Strong's
3-routine cap.
**WHERE VOLYUME MATCHES:** Paywall compliance and presentation hygiene.
**WHERE VOLYUME LAGS:** No free-tier growth loop (Hevy grows through free
social, Boostcamp through 11,000 free programs); no lifetime/long-commit
answer to subscription fatigue (Hevy's never-discounted $74.99 lifetime).

**BIGGEST GAP:** Growth mechanics, not pricing — the most viral surface
(Training Partners) is Pro-only.
**BEST IN CLASS:** Hevy — generous free tier + cheap sub + lifetime, zero
resentment.
**USER SENTIMENT SUMMARY:** The category's defining failure is
retro-paywalling (MFP barcode; Peloton +85%; Whoop's broken upgrade
promise, 2,400-upvote cancellation thread). A "fairness charter" (no
retro-paywalls, data always yours, works offline) is uniquely credible
for Volyume.

---

## AREA 10: Design, UX, and visual quality

**VOLYUME CURRENT STATE:** Token-CI-enforced dark-only system, single amber
accent, tabular figures, skeletons, haptics map, reduce-motion gating,
PR-only celebrations.

**TOP 10:** Whoop, Oura, Gentler Streak, Bevel, Copilot Money, MacroFactor,
Athlytic, Hevy, Rise, Peloton/Strava (+ Linear, Craft, Monzo references).

**WHERE VOLYUME LEADS:** Token discipline and engineering culture (closer
to Linear/Monzo than to any fitness app); gamification restraint
(validated — fatigue is well documented).
**WHERE VOLYUME MATCHES:** Dark-mode quality; loading/empty-state practice
(skeletons-not-spinners is current best practice).
**WHERE VOLYUME LAGS:** The expressive layer — no distinctive numeric
display face (Whoop's DINPro numerals carry its brand), no signature
animated visualisation (Copilot's charts are its moat).

**BIGGEST GAP:** Hero-metric typography + one bespoke coaching-trajectory
chart — the cheapest path from "disciplined" to "premium".
**BEST IN CLASS:** Whoop — three-number home screen, three-tier IA, owned
numerals.
**USER SENTIMENT SUMMARY:** Premium = spacing discipline, type hierarchy,
motion language, restraint — not features. The canonical insult is
"spreadsheet of medical data"; the common failure is clutter creep and
redesigns that add taps (MFP 2026 backlash). Dark-only is defensible
(Whoop holds the line) with halation tuning and a published stance.

---

## AREA 11: Performance and reliability

**VOLYUME CURRENT STATE:** Offline-first, watermarked sync, crash recovery,
sign-out protection, 3,154 tests, Sentry scrubbed.

**TOP 10:** Hevy (best-in-class), MacroFactor, Cronometer, Strong
(cautionary), MFP (cautionary), Fitbod, Whoop, Garmin (outages), Strava
(outages), Jefit (cautionary).

**WHERE VOLYUME LEADS:** Architecture — the loss modes behind Strong's
standing "Lost Data" help articles are already neutralised; fully offline
food search (no major competitor can claim it).
**WHERE VOLYUME MATCHES:** Hevy-class logging reliability.
**WHERE VOLYUME LAGS:** Perceived trust — the reliability is invisible to
users; no device-migration safety check surface.

**BIGGEST GAP:** Surface the invisible: an "everything backed up / N
pending" indicator and migration check, before a Strong-style review
narrative can form.
**BEST IN CLASS:** Hevy — no data-loss reputation at scale.
**USER SENTIMENT SUMMARY:** The dominant failure is silent sync failure
perceived as data loss; benchmarks: 1.09% crash / 0.47% ANR Play
thresholds, ≤2s cold start expectation; Android battery managers killing
timers/syncs is endemic.

---

## AREA 12: Accountability and community

**VOLYUME CURRENT STATE:** Training Partners (just shipped, Pro-only):
private circles, QR/link invite, derived weekly signal, no feed/likes/
leaderboards.

**TOP 10:** Apple Activity Sharing, Whoop Teams, Duolingo friend streaks
(reference), Strava (cautionary at scale), Hevy social, Future (human),
Gentler Streak (anti-comparison), Peloton, Gravitus, pact micro-apps
(Sweatmates/StickK).

**WHERE VOLYUME LEADS:** Privacy posture — on the right side of every
documented failure line (an 83-study meta-analysis ties online social
comparison to body-image/ED symptoms; Strava heatmap/Flyby incidents;
MFP moderation debt).
**WHERE VOLYUME MATCHES:** Whoop Teams' derived-scores-not-raw-data
principle.
**WHERE VOLYUME LAGS:** Reciprocity — every winning implementation lets
partners ACT (Apple reply-to-rings, kudos' peer-reviewed activity lift,
Future check-ins ~95% goal-completion lift, Duolingo shared streaks with
forgiveness +D14 retention). Training Partners is passive and
one-directional.

**BIGGEST GAP:** No partner action: a rate-limited one-tap cheer + a shared
consistency streak with a protected "rest week".
**BEST IN CLASS:** Apple Activity Sharing — chosen circle, derived metric,
gentle nudges, reciprocal encouragement.
**USER SENTIMENT SUMMARY:** Users want small private circles and "someone
who notices", not another Instagram. Anti-features: leaderboards,
raw-metric comparison, stakes, feeds.

---

## AREA 13: Check-in and weekly review

**VOLYUME CURRENT STATE:** Weekly check-in prefilled from real logs;
deterministic coach; confirm-then-apply; held-decision history; safety
floors; static question set; review framed as adjustments, not discovery.

**TOP 10:** MacroFactor, Carbon, Stronger U (validates auto-compilation),
RP Diet Coach (cautionary spikes), Whoop assessments (show-only
cautionary), Noom weigh-ins, Future, Caliber, Fitbod recovery, Bodbot
(cautionary).

**WHERE VOLYUME LEADS:** Safety at check-in (unique); confirm-then-apply
for every change; held-decision history (unique); prefill-from-logs
(the Stronger U gold standard, automated).
**WHERE VOLYUME MATCHES:** MacroFactor on plain-English explanation and
data-holds.
**WHERE VOLYUME LAGS:** Narrative framing (MacroFactor leads with "your
expenditure changed" discovery); dynamic ask-only-when-it-matters modules
(partial-logging disambiguation, logging-break handling).

**BIGGEST GAP:** Discovery framing + conditional questions — copy/rules
changes inside the deterministic boundary that target the exact mechanisms
behind MacroFactor's trust advantage.
**BEST IN CLASS:** MacroFactor — adherence-neutral, dynamic modules,
graceful degradation.
**USER SENTIMENT SUMMARY:** Failure mode is the unintelligent interrogation
(30-minute forms users ghost; RP slashing macros off a one-day spike —
"felt cheated"; Bodbot asking then ignoring). Show-only reviews get
skimmed; reviews that decide get kept.

---

## AREA 14: Steps, cardio, and activity tracking

**VOLYUME CURRENT STATE:** NEAT-first step targets, MET kcal feedback-only,
stall-triggered cardio dosing, recovery-load line; pedometer/Health
Connect; no wearable HR (deferred); coach blind to step *trends*.

**TOP 10:** MacroFactor (Step-Informed Updates), Whoop, Garmin Connect,
Oura, Apple Fitness, Gentler Streak, Carbon, Strava (now logging strength),
Fitbit (cautionary), Cronometer.

**WHERE VOLYUME LEADS:** Philosophy vs 8 of 10 — avoids the
activity-calories-as-currency failure entirely (MFP "eat back calories"
confusion; wearable kcal ≥10% wrong over 80% of the time); training-aware
recovery (Whoop/Garmin readiness erases lifting fatigue).
**WHERE VOLYUME MATCHES:** Step display basics.
**WHERE VOLYUME LAGS:** MacroFactor's step-trend-informed expenditure
(v5.5.0) — converged on Volyume's philosophy and published the
methodology; wearable ecosystem breadth.

**BIGGEST GAP:** The coach can't distinguish a behavioural stall (NEAT
collapse) from a metabolic one — users feel unseen ("I walked more and
the app didn't care"). A deterministic step-trend modifier on weekly
adjustments is the highest-impact, lowest-risk fix.
**BEST IN CLASS:** MacroFactor — step trends inform expenditure without
crediting kcal.
**USER SENTIMENT SUMMARY:** Step tracking is a trust product (Fitbit→Google
migration backlash); Health Connect sentiment is rough, so pedometer-first
is defensible; watch-vs-phone discrepancy is the killer complaint.

---

## Cross-area synthesis

**Where Volyume genuinely leads the world:**
1. Safety systems (category-unique, clinically relevant, unmarketed).
2. Explained deterministic coaching with confirm-then-apply (no competitor
   has the full set).
3. Offline-first across training AND food search (no one else can claim
   the latter).
4. Plan-generation input richness (weak-point taxonomy unmatched).
5. Exercise metadata intelligence (SFR-ranked, discomfort-reactive swaps).
6. Price-to-scope and trial generosity.
7. Privacy-correct accountability shape.

**The three recurring deficits across all 14 areas:**
1. **Invisible intelligence** — the engine is smarter than it looks (plan
   reveal, sync trust, check-in framing, safety stack, trial terms all
   under-communicated).
2. **Mid-journey emotional dead-zone** — nothing celebrates or reacts
   between the daily one-liner and day 365; weekly-only coach presence.
3. **Content/coverage debts** — exercise demos, UK food depth, lock-screen
   surfaces: areas where rivals win on breadth rather than brains.
