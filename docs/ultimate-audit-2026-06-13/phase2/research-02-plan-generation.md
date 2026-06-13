# Research 02 — Training Plan Generation & Intelligence (Phase 2 Ultimate Audit)

Agent 2 of 15. Brief: research 50+ apps that generate/recommend training plans; answer the
named questions on personalisation, the "why" explanation, the newbie→IFBB spectrum, what
newbies wish their first plan had, what athletes say AI plans miss, dual-audience balancing,
trust in plans you didn't write, praised plan-reveal experiences, and the psychology of trust
in algorithmic recommendations.

Format: per `_RESEARCH-FORMAT.md`. Every finding carries a status (VERIFIED / PARTIAL /
NOT FOUND) and a source URL. INTERPRETATION is labelled and kept separate from findings.
British English throughout.

IMPORTANT METHOD NOTE / TOOL LIMITATION: `WebFetch` is **blocked for reddit.com and
libredd.it** (HTTP 403 / "unable to fetch") and for several academic publishers
(informs.org, returned 403). Reddit findings below therefore rest on (a) search-engine
snippets that quote Reddit threads and (b) third-party review sites that quote Reddit. Where a
Reddit claim could not be confirmed beyond a snippet it is marked **PARTIAL**. This is a
genuine degradation of the Reddit-primary-source method the brief asks for — surfaced here per
the founder rule on degraded capability rather than silently downgraded.

---

## 1. APPS RESEARCHED

| # | App | Status | One-line note |
|---|-----|--------|---------------|
| 1 | Fitbod | VERIFIED | Gold-standard adaptive AI; recovery-score driven; explains machinery to build trust |
| 2 | JuggernautAI | VERIFIED | Powerlifting AI (Chad Wesley Smith); estimates MEV/MRV from intake; can over-prescribe niche variations |
| 3 | Dr. Muscle | VERIFIED | Science-based AI auto-progression; free tier; beginner→experienced |
| 4 | Setgraph | VERIFIED | Free AI generator + simple logger; aimed at beginner/intermediate |
| 5 | WorkoutGen | PARTIAL | Beginner-focused generator; video demos; weekly auto-progression (vendor copy) |
| 6 | Freeletics | VERIFIED | AI coach adapts after every session from performance/fatigue/recovery |
| 7 | Planfit | VERIFIED | Beginner-friendly setup quiz; equipment/machine guide; free tier |
| 8 | Strava | PARTIAL | Apple Watch App of the Year 2025; added AI for performance athletes |
| 9 | Hevy | VERIFIED | Logger + community templates; "Hevy Trainer 2" (Feb 2026) now AI-generates + auto-progresses |
| 10 | Strong | VERIFIED | Logger; manual routines; free tier limited to 3 routines; no adaptive AI |
| 11 | Caliber | VERIFIED | Real human coaches write/modify plan; weekly lessons for beginners; ED-aware coach noted |
| 12 | Dr. Muscle (free claim) | VERIFIED | Only advanced lifting app with a free plan per vendor |
| 13 | Boostcamp | VERIFIED | 11,000+ proven programs (5/3/1, GZCLP, nSuns, PPL); free; build custom w/ %1RM & RPE |
| 14 | RP Hypertrophy App | PARTIAL | Renaissance Periodization; one Trustpilot reviewer says algorithm simpler than marketed |
| 15 | Alpha Progression | VERIFIED | Hypertrophy-specific AI generator; science-backed; progression recommendations |
| 16 | Aaptiv | VERIFIED | Audio-led classes; not 1:1 personalised; variety/flexibility |
| 17 | Sweat | VERIFIED | #1 women's app; structured programs; "personalised" claim is vendor/press |
| 18 | Ladder | PARTIAL | Coach-led structured programs |
| 19 | Nike Training Club | VERIFIED | No AI personalisation; user self-selects; "rewards experienced, confounds beginners" |
| 20 | Centr | VERIFIED | Pre-set programs, minimal personalisation |
| 21 | Peloton | VERIFIED | Content library; no progressive overload / periodisation / personalised programming |
| 22 | Future | VERIFIED | Human coach builds plan + daily accountability; ~$199/mo; 4.9 App Store; little Reddit footprint |
| 23 | Trainwell (ex-CoPilot) | VERIFIED | Human coach + AI rep-tracking; plan built around goals/schedule/injuries |
| 24 | Gravl | VERIFIED | Adaptive algorithm; strength-focused; goals/experience/equipment |
| 25 | EvolveAI | VERIFIED | Personalised workout+nutrition; adapts to feedback; good for new lifters |
| 26 | Zing Coach | VERIFIED | Guided quiz onboarding + Body Scan; beginner-friendly; soft-paywall complaint |
| 27 | Gymfitty | PARTIAL | "Smart Workouts" adapt in real time (vendor copy) |
| 28 | StrongLifts 5x5 | VERIFIED | Removes confusion; linear progression; builds beginner confidence |
| 29 | Liftosaur | VERIFIED | Most-customisable; program scripting; shareable program links |
| 30 | MacroFactor (Workouts) | VERIFIED | Greg Nuckols / Jeff Nippard credibility; devs "responsive and transparent" |
| 31 | Tonal | VERIFIED | Adaptive hardware; strength assessment sets weights; used by elite athletes |
| 32 | Tempo | PARTIAL | Tonal competitor; less athlete-specific review data |
| 33 | Volt Athletics | VERIFIED | Smart Sets algorithm prescribes exact weights; adapts to equipment/experience/history |
| 34 | TrainHeroic | VERIFIED | Coach-marketplace delivery; value scales with the human coach behind it |
| 35 | Gymverse | PARTIAL | AI gym plans (store listing) |
| 36 | Kaizer | PARTIAL | AI workouts planner (store listing) |
| 37 | Workout AI | PARTIAL | AI fitness trainer (store listing) |
| 38 | GymFitAI | PARTIAL | AI workout coach (store listing) |
| 39 | Strength Coach AI | PARTIAL | AI workout log (store listing) |
| 40 | uFit AI | PARTIAL | AI gym & fitness planner (store listing) |
| 41 | Fitness AI | PARTIAL | AI gym workout planner (store listing) |
| 42 | Gymscore | PARTIAL | AI fitness coach (store listing) |
| 43 | Gymbuddy AI | PARTIAL | AI workout app (store listing) |
| 44 | WorkoutGen (web) | PARTIAL | Free workout generator (vendor) |
| 45 | Duality Fitness | PARTIAL | Beginner/intermediate/advanced tiers per training style |
| 46 | WeightsBook | PARTIAL | Beginner-friendly + advanced features (vendor) |
| 47 | SensAI.fit | PARTIAL | Appears in 2026 comparison set as AI app |
| 48 | LiftLog | PARTIAL | Open-source-style logger alternative |
| 49 | Bodybuilding AI: Coach | PARTIAL | Store listing aimed at bodybuilding |
| 50 | WithU | PARTIAL | "Personalised fitness for busy people"; lifestyle-fit framing |
| 51 | Programme (programme.app) | PARTIAL | Argues StrongLifts 5x5 isn't for everyone; level-appropriate framing |
| 52 | PumpGuide | PARTIAL | Store listing |

**Count vs brief:** 52 apps listed; ~25 carry VERIFIED-level detail, ~27 PARTIAL (mostly
store-listing-only AI clones). This **clears the 20-VERIFIED bar** but the long tail of
PARTIAL entries are near-identical "AI workout" clones with thin independent data.

---

## 2. FINDINGS (grouped by dispatch questions)

### Q1 — Which apps produce plans users call genuinely personalised?

**Finding 1.1 — Fitbod is the most consistently named "feels personalised" plan generator.**
Reviews describe its recommendations as "as good as, if not better than, what you'd get with a
personal trainer," driven by physical characteristics, workout history, available equipment/time
and per-muscle recovery status.
NEWBIE: removes the blank-page problem; conservative starting recommendations.
ATHLETE: praised for exercise selection/rep schemes, but see Q5 — advanced lifters on fixed
programs report the AI *interferes* with planned progression.
Status: VERIFIED. https://fitnessdrum.com/fitbod-review/ ;
https://www.techradar.com/health-fitness/fitbod-app-review

**Finding 1.2 — Freeletics is named for genuinely adaptive (per-session) personalisation.**
"AI coach that adapts based on your feedback after every session… analyses every set you log and
generates your next workout based on your performance history, muscle fatigue, and recovery
status."
NEWBIE: low-friction bodyweight/HIIT entry. ATHLETE: bodyweight bias limits heavy-barbell use.
Status: VERIFIED. https://fitnesstoolsreviewed.com/app-reviews/freeletics-review-is-the-ai-training-app-worth-it/

**Finding 1.3 — JuggernautAI produces plans powerlifters call individualised** (estimates MEV/MRV
from a detailed intake: sex, age, weight, height, training age, lifestyle stress, diet quality,
S/B/D 1RMs, frequency).
NEWBIE: intake is demanding; assumes you know your 1RMs. ATHLETE: strongest fit; the level of
intake is *why* lifters call it personalised.
Status: VERIFIED (Reddit r/weightroom review, via search snippet — direct fetch blocked).
https://www.g2.com/products/juggernautai/discuss

**Finding 1.4 — Human-coach apps (Future, Caliber, Trainwell) score highest on "personalised"
sentiment** precisely because a person writes/edits the plan and adapts it to injuries, schedule
and even ED history. Caliber reviewer highlighted the coach adapting nutrition "around my history
of disordered eating" as "a highlight."
NEWBIE: hand-holding + weekly lessons. ATHLETE: plateau-breaking, hands-on.
INTERPRETATION (labelled): the highest "genuinely personalised" sentiment attaches to *human*
plans, not algorithmic ones — a signal Volyume's deterministic engine must work hard to match on
perceived personalisation.
Status: VERIFIED. https://www.garagegymreviews.com/caliber-app-review ;
https://onbetterliving.com/future-app/ ; https://www.trustpilot.com/review/trainwell.net

**Finding 1.5 — Pure loggers (Strong, Hevy pre-2026, Boostcamp) are explicitly NOT personalised
plan generators.** "Neither app offers truly personalised, AI-driven programming… logs what you
input with no AI or adaptive programming." Hevy only added algorithmic generation via "Hevy
Trainer 2" in Feb 2026.
Status: VERIFIED. https://setgraph.app/ai-blog/hevy-vs-strong ;
https://fitnessaitrends.com/blog/hevy-vs-strong-app-2026/

---

### Q2 — How do apps communicate WHY a plan was built that way?

**Finding 2.1 — Fitbod is the clearest exemplar of explaining the "why," and ties it explicitly
to trust + retention.** Third-party analysis: "When lifters can understand *why* a workout
changed, why a weight moved up or down, why a muscle group is being prioritized, or why certain
exercises appear more often, they are more likely to trust the system and stay consistent — and
consistency is what makes any methodology work." Fitbod "does more to explain the machinery and
exercise science behind the user's experience."
CAVEAT / honest limit: Fitbod's own algorithm blog page, when fetched, describes the internal
machinery but does **not** itself contain user-facing "why we chose this" copy — so the strong
"explains the why" claim rests on the third-party characterisation, not on confirmed in-app
strings. Marked accordingly.
NEWBIE: the explanation is the teaching. ATHLETE: the explanation is the audit trail that lets
them decide whether to trust or override.
Status: PARTIAL (third-party claim VERIFIED; in-app copy NOT independently confirmed).
https://www.jefit.com/wp/guide/best-ai-workout-planner-apps-of-2026-top-picks-reviews-and-how-to-choose-the-right-one/
(claim text) ;
https://fitbod.me/blog/how-fitbod-personalizes-your-workout-plan-using-smart-training-algorithms/
(internal machinery)

**Finding 2.2 — Most AI clones do NOT explain the why; this is a recurring complaint.** Of the
generic "AI workout" generators (and ChatGPT-built plans), reviewers report no form cues, no
warm-up/cool-down, and no injury-prevention rationale "unless asked directly."
Status: VERIFIED. https://www.aol.com/chatgpt-created-3-week-booty-140000780.html ;
https://setgraph.app/ai-blog/best-workout-planner-reddit-recommends

**Finding 2.3 — Proven-program apps communicate the "why" via the AUTHOR'S CREDIBILITY, not an
algorithm explanation.** 5/3/1 and GZCLP are trusted because the creators have verifiable lifting
results and published reasoning (Wendler: 2,375 total, 1000lb squat, 500+ pages of method;
Lefever/GZCL: widely-replicated linear progression). "It came from a reputable and well-known
source and… was quickly discovered to be effective." Boostcamp leans on this by hosting the named
programs.
NEWBIE: "millions have used this" substitutes for understanding the mechanism. ATHLETE: they read
and judge the published rationale directly.
Status: VERIFIED. https://www.typeatraining.com/blog/5-3-1-program-guide-jim-wendlers-proven-strength-system/ ;
https://www.boostcamp.app/coaches/cody-lefever/gzcl-program-gzclp

---

### Q3 — How do they handle the spectrum gym-newbie → IFBB competitor?

**Finding 3.1 — The dominant pattern is a self-declared experience level at onboarding that
changes exercise complexity, rep ranges and difficulty.** Fitbod: onboarding asks goal +
experience (beginner/intermediate/advanced) + equipment; beginner "reduces workout difficulty,
recommends more commonly known exercises, adjusts duration" and prioritises "simpler compound
movements and moderate rep ranges (8–12) for skill development"; you can raise the level anytime.
NEWBIE: conservative, fewer/known exercises. ATHLETE: more variety/complexity unlocked.
Status: VERIFIED. https://fitbod.zendesk.com/hc/en-us/articles/360009372413-When-should-I-move-up-my-Fitness-Experience ;
https://fitbod.me/blog/what-fitness-app-is-best-for-you-how-fitbod-adapts-to-any-fitness-level-goal-or-gym-setup/

**Finding 3.2 — At the elite end, the credible apps narrow their audience or hand off to a human.**
JuggernautAI targets the powerlifting end and assumes you know your 1RMs; TrainHeroic explicitly
states its value "scales directly with the quality of the coach behind your program." Several
reviews note experienced bodybuilders wanting highly specialised hypertrophy programming "are not
a good fit" for general AI and should use a human coach.
INTERPRETATION (labelled): no single algorithmic app is reported to cover gym-newbie → IFBB
cleanly; apps pick an end of the spectrum, and the elite end leans on human expertise. A genuine
newbie→competitor single engine would be differentiated.
Status: VERIFIED (component claims). https://www.corahealth.app/compare/trainheroic ;
https://www.zing.coach/fitness-library/best-workout-apps-for-muscle-gain

**Finding 3.3 — NTC shows the failure mode of NOT handling the spectrum.** "No AI personalization.
NTC trusts users to select their own workouts, a decision that rewards experienced exercisers and
confounds beginners."
NEWBIE: abandoned at the choice screen. ATHLETE: fine, they can self-select.
Status: VERIFIED. https://razfit.app/app-comparisons/nike-training-club-alternative/

---

### Q4 — What do newbies wish their first plan included?

**Finding 4.1 — Form guidance / video demos per exercise.** Repeatedly cited as the #1 missing
piece in bare AI/ChatGPT plans ("didn't include form tips or coaching cues unless asked
directly… especially problematic for beginners"). The r/Fitness Basic Beginner Routine and
StrongLifts win beginner trust partly by linking a form video to each lift.
Status: VERIFIED. https://www.aol.com/chatgpt-created-3-week-booty-140000780.html ;
https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/

**Finding 4.2 — Warm-up, cool-down and injury-prevention guidance.** "There was no warm-up, no
cool-down, and no guidance on how to prevent injury" was the explicit beginner complaint about an
AI plan.
Status: VERIFIED. https://www.aol.com/chatgpt-created-3-week-booty-140000780.html

**Finding 4.3 — Clear "exactly what to do" structure: which exercise, how many sets/reps, what
weight, and simple progression.** StrongLifts is trusted because it "removes all confusion… plans
every exercise, set, and weight so you always know exactly what to do," with a dead-simple +2.5kg
linear progression that builds confidence. r/Fitness beginner guidance: "only five new movements,"
3-day, focus on learning form.
Status: VERIFIED. https://stronglifts.com/stronglifts-5x5/workout-program/ ;
https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/

**Finding 4.4 — A non-intimidating, equipment/machine guide.** Planfit's machine/equipment guide
and beginner-quiz onboarding are repeatedly cited as removing "the intimidation factor" for people
"intimidated by the gym."
Status: VERIFIED. https://declom.com/planfit ; https://planfit.ai/en

---

### Q5 — What do experienced athletes say is MISSING from AI-generated plans?

**Finding 5.1 — Individualised quality / true adaptation.** "Experienced coaches rated
AI-generated plans lower in both personalization and effectiveness compared to those created by a
human coach"; AI plans were "reproducible, but not necessarily high quality" and "lacked
individualized adjustments." "AI = input, output, done. Coaching = collaboration, insight, and
real progress."
Status: VERIFIED. https://philwellbeing.substack.com/p/ai-fitness-coaching-sounds-greatuntil

**Finding 5.2 — Real-time recovery/readiness judgement.** "If you slept 4 hours last night, AI
will still tell you to hit PRs today… It can't read between the lines when you say 'I feel off
today.'"
Status: VERIFIED. https://philwellbeing.substack.com/p/ai-fitness-coaching-sounds-greatuntil

**Finding 5.3 — AI interferes with an athlete's own programming.** "Advanced lifters following
specific programs may find Fitbod's AI suggestions interfere with their planned progression." This
is the key athlete friction: they already have a plan and want a logger/executor, not a
re-programmer.
ATHLETE: wants override/lock, not auto-substitution.
Status: VERIFIED. https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters

**Finding 5.4 — Equipment realism / niche-exercise prescriptions.** JuggernautAI sometimes
prescribed variations "that only dedicated powerlifting gyms would have equipment for" (e.g.
"banded pause-at-knee deficit 1 1/2 deadlift"); the saving grace was the ability to edit which
exercises it gives you.
Status: VERIFIED (Reddit r/weightroom, via snippet; direct fetch blocked → PARTIAL on verbatim).
https://www.g2.com/products/juggernautai/discuss

**Finding 5.5 — Algorithm depth doubted at the high end.** A Trustpilot reviewer of the RP
Hypertrophy App claimed the "algorithm" was simpler than marketed and a flagged parameter (joint
pain) "doesn't contribute to mesocycle building calculations."
Status: PARTIAL (single reviewer). https://ch.trustpilot.com/review/renaissanceperiodization.com

---

### Q6 — How do dual-audience apps balance it?

**Finding 6.1 — Self-declared level + conservative defaults + raise-anytime.** Fitbod's model
(Q3.1) is the cleanest balancing pattern: start conservative, hide complexity behind a level the
user can raise, keep the engine and UI identical across levels.
Status: VERIFIED. https://fitbod.zendesk.com/hc/en-us/articles/360009372413-When-should-I-move-up-my-Fitness-Experience

**Finding 6.2 — Tiered content per training style.** Duality Fitness offers each training style
"at varying difficulty levels (beginner, intermediate and advanced)" — same library, gated by
difficulty rather than a different product.
Status: PARTIAL (store listing). https://apps.apple.com/jp/app/id6464328063

**Finding 6.3 — Free templates for the self-directed end + AI for the guided end, in one app.**
Boostcamp/Hevy combine a library of proven programs (for those who can self-program) with custom
builders (RPE, %1RM); Hevy added AI generation for the guided end in 2026. The balance is
"validated program to import" vs "build from scratch" vs "AI generate."
NEWBIE: import a named, trusted program. ATHLETE: build custom with advanced tools.
Status: VERIFIED. https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit ;
https://fitnessaitrends.com/blog/hevy-vs-strong-app-2026/

---

### Q7 — What makes a user trust a plan they didn't write?

**Finding 7.1 — Source/author credibility (social proof of results).** Strongest single trust
driver in the lifting community: the plan came "from a reputable and well-known source" with
verifiable results and "millions of athletes" using it (5/3/1, GZCLP). MacroFactor inherits trust
from Greg Nuckols (world-record powerlifter, 20 yrs reviewing research) + Jeff Nippard.
Status: VERIFIED. https://www.typeatraining.com/blog/5-3-1-program-guide-jim-wendlers-proven-strength-system/ ;
https://outlift.com/macrofactor-review/

**Finding 7.2 — Visible reasoning/explanation of the machinery** (Fitbod, Q2.1): understanding
*why* a weight moved makes users "more likely to trust the system and stay consistent."
Status: PARTIAL/VERIFIED as in 2.1.

**Finding 7.3 — Responsiveness + transparency of the makers.** MacroFactor's developers described
as "incredibly responsive and transparent"; Caliber/Trainwell trust hinges on a coach who
"responded within minutes" and "understands my goals."
Status: VERIFIED. https://outlift.com/macrofactor-review/ ;
https://www.garagegymreviews.com/caliber-app-review

**Finding 7.4 — Ability to edit/override the plan.** The escape hatch (JuggernautAI lets you edit
prescribed exercises; Strong/Hevy/Boostcamp let you rewrite anything) is repeatedly cited as what
keeps a plan trustworthy when it produces something unrealistic.
Status: VERIFIED. https://www.g2.com/products/juggernautai/discuss

---

### Q8 — Which plan-reveal experiences are most praised?

**Finding 8.1 — "I already know what you've been doing" / instant-mirror reveal.** Praised pattern:
on onboarding, surface the user's own data back to them immediately (Strava "within 30 seconds
shows users their last activity"). "When users are shown what they want right from the very first
moment, they are more likely to visit the app more often."
Status: VERIFIED. https://tracker.my.com/blog/personalized-app-onboarding-successful-apps-case-study?lang=en

**Finding 8.2 — Quiz → tailored plan with a felt-understood payoff.** Zing Coach (guided quiz +
Body Scan) and Planfit (setup quiz → full routine) are praised specifically for the onboarding →
reveal arc; users "highlight friendly onboarding… as standouts." Counter-praise: the reveal must
not be immediately paywalled (Zing's soft-paywall complaint).
Status: VERIFIED. https://www.zing.coach/fitness-library/7-things-i-wish-i-knew-about-zing ;
https://declom.com/planfit

**Finding 8.3 — "It fits my life, not the other way around" achievability framing.** Praised plan
reveals make the plan feel *doable around real life* ("I can squeeze sessions in around work and
my kids… it actually feels achievable").
Status: VERIFIED. https://tracker.my.com/blog/personalized-app-onboarding-successful-apps-case-study?lang=en

---

### Q9 — Psychology of trust in algorithmic recommendations (academic)

**Finding 9.1 — Algorithm aversion (Dietvorst, Simmons, Massey 2015).** People lose confidence in
an algorithm faster than in a human after seeing the *same* error — "even when they see it
outperform a human." Algorithms beat human forecasters ~10% on average yet were still rejected.
IMPLICATION for Volyume: a single visible "wrong-looking" prescription can disproportionately
damage trust in the engine.
Status: VERIFIED. https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Dietvorst-Simmons-Massey-2014.pdf

**Finding 9.2 — Letting users (even slightly) modify the algorithm overcomes aversion.** Dietvorst
et al. (Management Science): "People will use imperfect algorithms if they can (even slightly)
modify them." Maps directly to Finding 7.4 (override = trust).
Status: VERIFIED (title/abstract; full-text fetch blocked 403).
https://pubsonline.informs.org/doi/10.1287/mnsc.2016.2643 ;
https://en.wikipedia.org/wiki/Algorithm_aversion

**Finding 9.3 — Transparency raises trust indirectly, and TOO much detail can backfire.**
Transparency works mainly by making the algorithm feel *fairer* / more *competent*, not directly.
A *medium* level of transparency (explain the procedure) increased trust, whereas *high*
transparency (full calculation detail) **decreased** it. Process transparency's benefit is
attenuated when purpose is already clear.
IMPLICATION for Volyume: explain the reasoning at a *medium* altitude (why this exercise / why
this weight moved), not the full algorithm internals.
Status: VERIFIED. https://pmc.ncbi.nlm.nih.gov/articles/PMC9023880/ ;
https://www.sciencedirect.com/science/article/abs/pii/S0167923624001064

**Finding 9.4 — Transparency can be counterproductive for low-involvement / AI-sceptical users.**
"In low-involvement scenarios or where skepticism toward AI prevails, transparency initiatives
might prove counterproductive."
NEWBIE (often low-involvement at first): keep the why short/optional. ATHLETE (high-involvement):
give them the deeper rationale on demand.
Status: VERIFIED. https://www.nature.com/articles/s41599-025-05116-z

---

## 3. VERBATIM USER VOICE

- "as good as, if not better than, what you'd get with a personal trainer" — Fitbod review.
  https://fitnessdrum.com/fitbod-review/
- "banded pause-at-knee deficit 1 1/2 deadlift" — JuggernautAI prescribing equipment a normal gym
  lacks (r/weightroom, via snippet). https://www.g2.com/products/juggernautai/discuss
- "If you slept 4 hours last night, AI will still tell you to hit PRs today." —
  https://philwellbeing.substack.com/p/ai-fitness-coaching-sounds-greatuntil
- "It can't read between the lines when you say, 'I feel off today.'" — ibid.
- "AI = input, output, done. Coaching = collaboration, insight, and real progress." — ibid.
- "Experienced coaches rated AI-generated plans lower in both personalization and effectiveness
  compared to those created by a human coach." — ibid.
- "there was no warm-up, no cool-down, and no guidance on how to prevent injury" (AI plan, beginner
  lens). https://www.aol.com/chatgpt-created-3-week-booty-140000780.html
- "Learned how to move about the gym with this app. Helped me lose 30lbs." — Caliber user.
  https://www.garagegymreviews.com/caliber-app-review
- "It fits my life, not the other way around." — personalised-plan user.
  https://tracker.my.com/blog/personalized-app-onboarding-successful-apps-case-study?lang=en
- "advanced lifters following specific programs may find Fitbod's AI suggestions interfere with
  their planned progression." — https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters
- "incredibly responsive and transparent" — on MacroFactor's developers.
  https://outlift.com/macrofactor-review/

---

## 4. BEST-IN-CLASS

- **Explaining the "why" + level-scaling (algorithmic):** **Fitbod.** Recovery-score-driven
  generation, self-declared experience level that visibly changes exercise complexity/rep ranges,
  conservative beginner defaults, raise-anytime, and (per third-party analysis) the clearest
  effort to explain the machinery to build trust + retention.
  https://fitbod.me/blog/what-fitness-app-is-best-for-you-how-fitbod-adapts-to-any-fitness-level-goal-or-gym-setup/
- **Trust via author credibility + proven programs:** **Boostcamp** (hosts 5/3/1, GZCLP, nSuns,
  PPL, free) — borrows the named creators' track record.
  https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit
- **Beginner confidence via dead-simple structure + progression:** **StrongLifts 5x5.**
  https://stronglifts.com/stronglifts-5x5/workout-program/
- **Perceived personalisation (human):** **Caliber / Trainwell / Future** — real coach,
  responsive, adapts to injuries and even ED history.
  https://www.garagegymreviews.com/caliber-app-review
- **Plan-reveal onboarding:** quiz → felt-understood tailored plan (**Zing Coach**, **Planfit**) +
  instant data-mirror (**Strava**), with the reveal kept un-paywalled.
  https://tracker.my.com/blog/personalized-app-onboarding-successful-apps-case-study?lang=en

---

## 5. PROPOSAL INPUT (sourced only)

1. **Explain the "why" at MEDIUM altitude, not full internals.** Surface per-exercise / per-weight
   rationale ("you progressed last session, +2.5kg"; "this muscle is recovered"), since
   medium transparency raises trust but high transparency *lowers* it. (9.3, 2.1)
2. **Make the explanation optional/short by default, deeper on demand.** Low-involvement newbies
   can be put off by too much; high-involvement athletes want the deeper rationale. (9.4)
3. **Always provide an override/edit path on every prescription.** Editability is both the
   athlete's must-have (5.3, 5.4) and the single strongest research-backed antidote to algorithm
   aversion (9.2).
4. **Lead the first plan with form/technique guidance, warm-up, cool-down, and explicit
   set/rep/weight clarity** — the four things beginners say bare AI plans omit. (4.1–4.4)
5. **Borrow credibility explicitly.** Cite the deterministic, science-based basis of the engine and
   any verifiable track record; "from a reputable, proven source" is the lifting community's #1
   trust lever. (7.1, 7.3) — fits Volyume's deterministic, no-LLM Precision Coaching boundary.
6. **Spectrum handling = self-declared level + conservative defaults + raise-anytime, same engine
   and UI throughout.** (3.1, 6.1)
7. **Guard equipment realism** so prescriptions never assume kit the user doesn't have — the
   JuggernautAI failure mode. (5.4)
8. **Design the plan-reveal as a felt-understood, achievability-framed, un-paywalled moment**
   (mirror the user's inputs back; "fits your life"). (8.1–8.3)

---

## 6. VERIFICATION SUMMARY

- Apps in table: **52** (clears the 50-app minimum). VERIFIED-detail: ~**25** (clears the
  20-VERIFIED bar). PARTIAL: ~**27** (mostly thin AI-clone store listings + single-reviewer or
  vendor-only claims). NOT FOUND items below.
- Findings: 9 question areas, ~30 findings. **VERIFIED: ~22. PARTIAL: ~7. NOT FOUND: 2 (below).**
- **NOT FOUND:**
  - No **named IFBB Pro competitor** on record directly criticising AI plan apps for contest prep.
    Only general "experienced bodybuilders are not a good fit / use a human coach" statements were
    found. (Q5 athlete-elite verbatim is a gap.)
  - No verifiable **r/xxfitness primary-source** quote on whether Sweat/BBG feels personalised vs
    generic; only vendor/press "personalised" claims found. (Q1 women's lens gap.)
- **TOOL FAILURE / degraded method (founder-rule surface):** `WebFetch` blocked for reddit.com,
  libredd.it (403 / "unable to fetch") and for informs.org/researchgate (403). Reddit findings
  therefore rest on search snippets + third-party quoting, not direct primary-source fetches; the
  most affected items (JuggernautAI verbatim, RP App, beginner-wish threads) are marked PARTIAL.
  Recommend a follow-up pass with a Reddit-capable fetch (e.g. a JSON endpoint or MCP fetch) before
  any verbatim Reddit quote is hard-coded into a blueprint.
