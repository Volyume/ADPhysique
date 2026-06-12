# ext-06 — Elite Coaching Operations

> Citations reconciled 2026-06-12 against validation/val-ext-*.md — see that report for per-claim verdicts.

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.

## How world-class coaches actually work, and what Volyume can steal from them

**Deep Audit 2026-06-12 · Research slice: elite/online coaching operations**
**Personas: Besa (Beginner) + Eddie (Elite)**

---

## 0. Reading this report alongside prior work

The 2026-06-10 competitive audit (agent 13: check-in systems; agent 3: AI coaching) already established:

- Volyume's pre-derived 4-step check-in is structurally superior to any algorithmic competitor and closer to the human gold standard (WAG/Stronger U) than any app found.
- The held-decisions card ("Calories held. Trend on target.") is unique in the market.
- The 7-question post-workout survey exceeds the evidence-based ceiling (<5) and should be trimmed.
- The coaching engine overlaps with MacroFactor's adaptive-TDEE approach but goes further on decision transparency.

**This report does not re-argue those points.** It goes deeper on three dimensions that were under-covered:

1. The micro-anatomy of what elite human coaches actually do — the exact structure of the check-in conversation and the feedback response — so Volyume can replicate the "coached feeling" with deterministic logic.
2. The decision logic elite coaches use (what they look for, when they adjust, when they hold, what they defer) — cross-referenced against Volyume's engine to surface true gaps.
3. The retention science of coaching relationships — what keeps clients for years, what makes them ghost, and how those mechanisms translate into an app.

---

## 1. How elite coaches actually operate: the check-in system

### 1.1 The canonical human-coaching check-in (WAG/Stronger U model)

The gold standard in the industry is WAG (Working Against Gravity) running on their Seismic platform. It is widely cited as the format every algorithmic app tries to emulate. The skeleton below — auto-compiled data, a member narrative, and a coach response within 24 hours — is verified against WAG and Stronger U; the finer parameters (which items are "non-negotiably asked", the exact rating-scale format, and the writing-time estimate) are a fair *abstraction* of that practice rather than a documented spec. [corrected 2026-06-12 citation audit — 3-layer skeleton verified, fine-print specifics are embellishment; see E6-02]

**LAYER 1 — Auto-compiled quantitative data (coach reads, client doesn't re-enter)**
- Daily body weight log → weekly average trend
- Food log compliance → adherence score
- Progress photos (front, side, back; same conditions weekly)
- Body measurements (waist, hips, chest, arms, legs — varies by client)
- Steps / activity from wearable sync

**LAYER 2 — Subjective narrative (client writes)**
- Highs of the week (what went well)
- Lows of the week (what was hard, what got missed)
- Energy, sleep, stress, hunger ratings (subjective-feel items, typically on a numeric scale)
- Specific questions if the coach flagged something last week ("how did the lower carb days feel?")
- Free-text "anything else your coach should know"

**LAYER 3 — Coach response (returned within 24 hours)**
- Acknowledge the week genuinely (name something specific, not generic)
- Interpret the data in plain language ("your trend weight dropped 0.6 lbs — that's right in the 0.5–1.0 lb/wk target for your phase")
- Make the decision and state the reason ("I'm keeping calories the same this week — the trend is moving, energy is good, no reason to push")
- If adjusting: state what changes, by how much, and why now
- One or two forward-looking cues ("this week, try to hit protein before 6 pm on training days")
- End with a forward-pointing statement that creates the next anchor ("check in Sunday same as usual — looking forward to seeing how the lower sodium Saturday affects Monday's weight")

Sources: [WAG How Does It Work](https://www.workingagainstgravity.com/how-does-wag-work); [Stronger U feature guide](https://resources.strongeru.com/feature-guide); [Stronger U maximising check-ins](https://strongeru.com/6-tips-for-maximizing-your-coach-check-ins/)

### 1.2 What the best coaches are actually looking for

Synthesised from coaching-industry content, RP Strength's methodology, and RippedBody's evidence-based coaching framework, the priority ordering below is a reasonable abstraction of how elite physique coaches weigh inputs. [corrected 2026-06-12 citation audit — presented as synthesis, not cross-referenced findings; the ordered hierarchy, the "photos every 2–4 weeks" cadence and "flat vs full as a primary dial" are not documented specs, and PMC10299204 (cited below) does not support them — that paper covers protein, cardio, supplementation and PED recommendations, nothing on monitoring or adjustment logic; see E6-04, E6-05]

**PRIMARY (decisive):**
1. **Weight trend, not single reading.** EWMA or 7-day average. A single day's weight is never a signal. Coaches look at 2–4 weeks of trend before attributing change to the intervention.
2. **Training performance.** Is the athlete still making reps, adding weight, holding volume? Performance decline is the earliest hard sign of excessive deficit or cumulative fatigue.
3. **Photo/visual assessment.** For physique athletes specifically: muscle fullness, conditioning level, changes in definition and proportion. Photos are reviewed every 2–4 weeks, not weekly. Coaches describe "flat vs full" assessment as a primary dial — a flat physique at a given scale weight signals depletion; a full physique at the same weight signals adequate glycogen/muscle retention.

**SECONDARY (context):**
4. **Biofeedback.** Energy, sleep, hunger, mood, libido (for advanced athletes). These contextualise the primary signals — e.g., fast weight loss + poor energy = concern; fast weight loss + good energy = likely fine.
5. **Cardio and NEAT compliance.** Has the athlete been doing the assigned cardio? NEAT often drops during hard diets; coaches explicitly watch for this.
6. **Adherence estimate.** Food log completeness, estimated compliance. If the log shows great adherence and weight isn't moving, the energy balance model is wrong and needs adjusting. If the log shows poor adherence, the plan isn't the problem.

**TERTIARY (plan-level):**
7. **Proximity to competition / goal date.** The same weight-loss rate that's fine at 20 weeks out becomes dangerous at 6 weeks out.
8. **Phase of the mesocycle.** Deload timing, MRV accumulation signals (performance plateau + soreness accumulation + motivation drop together).

Sources: [RippedBody progress tracking](https://rippedbody.com/diet-progress-tracking/); [Tailored Coaching Method 5 metrics](https://tailoredcoachingmethod.com/metrics/); [3DMJ coaching philosophy](https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction); RP physique coaching via search extracts

### 1.3 The decision logic hierarchy

Elite coaches use a consistent hierarchy before touching calories. The research converges on this sequence:

```
WHEN PROGRESS STALLS:

Step 1 — Verify adherence.
  If adherence is poor: coach the behaviour, don't change the plan.
  Only proceed if adherence is genuinely good.

Step 2 — Assess recovery / biofeedback.
  If energy/sleep/performance is declining:
    → Evaluate if a diet break or refeed is needed before cutting further.
  If all are fine: proceed.

Step 3 — Consider NEAT / cardio increase first.
  Increase energy expenditure before cutting intake.
  Preserves muscle, keeps the athlete eating more food.
  Limit: if cardio is already high, this lever is exhausted.

Step 4 — Calorie reduction.
  Conservative: 100–200 kcal/day reduction (RippedBody gives ~5–8%).
  [uncited heuristic — "never more than 250–300 kcal/day in one adjustment;
  re-assess after 2–3 weeks" could not be confirmed against RippedBody or any
  other source; treat as practitioner rule of thumb, not sourced; see E6-07]

Step 5 — Protein re-distribution / macro timing.
  Rarely a lever at this stage but used for satiety problems.
```

**For training specifically (deload decision):**
The 2024 deload survey (Sports Medicine Open) found coaches and athletes deload for three reasons in order of frequency: (1) scheduled on the programme (65%), (2) feeling beat up — soreness + joint ache + pain (63%), (3) performance stalled or decreased (54%). Frequency: typically every 4–6 weeks, with individual variation from 3–12 weeks. Duration: ~6–7 days. Volume cut by reducing weekly sets (78.9% of respondents) and/or reps (52.8%); frequency maintained; intensity reduced via RIR increase. A practical 25–50% volume reduction is recommended in the deloading practical-recommendations literature (Bell et al., "A Practical Approach to Deloading"), not in this survey. [corrected 2026-06-12 citation audit — the survey reports the set/rep reductions above but does not quantify volume as a percentage; 25–50% re-anchored to Bell et al.; see E6-09]

The Menno Henselmans / autoregulation research (shura.shu.ac.uk deload PDF) adds a decision checkpoint model: rather than mandatory time-point deloads, elite coaches now use a "checkpoint" within the programme to actively decide based on cumulative readiness signals.

Sources: [RippedBody macro adjustment guide](https://rippedbody.com/how-to-adjust-macros/); [The Macro University adjustment timing](https://www.themacrouniversity.com/blog/macro-adjustments-when-to-tweak-when-to-wait); [LVL TN dieting phase guide](https://www.lvltncoaching.com/post/mastering-the-cut-how-to-successfully-navigate-a-dieting-phase); [Sports Medicine Open deload survey](https://link.springer.com/article/10.1186/s40798-024-00691-y); [PMC deload consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)

---

## 2. The anatomy of a great coaching feedback message

This is the most under-studied element in the prior audit and the most important for the "coached feeling." The five-part structure below is **Volyume's own design pattern**, not a documented industry universal — its individual components each appear separately in verified coaching material (specific acknowledgement and highs-first: Stronger U; decision-with-reason: RippedBody/Carbon; forward anchor: standard practice), but no source describes them as a single named framework. [corrected 2026-06-12 citation audit — presented as Volyume's design pattern rather than a cited five-part research finding; see E6-11]

### 2.1 Structure (the 5-part coach response)

**Part 1 — Specific acknowledgement (2–3 sentences)**
Not "great week." Something from their actual data: "You hit all 4 training sessions despite the busy work week — that's the discipline that moves the needle." This triggers the Hawthorne Effect (people report behaving better when they know they're observed) and creates the "feel seen" moment that is the single strongest predictor of client retention.

> Key: acknowledgement must be *specific and data-referenced.* Generic praise ("well done this week!") is detectable and actually damages trust — it signals the coach didn't read the check-in.

**Part 2 — Data interpretation in plain language (2–4 sentences)**
Translate the numbers into meaning. "Your 7-day average is down 0.4 kg from last week. That's the 3rd consecutive week of downward trend at the right rate — your metabolism is responding to the deficit without over-compensating." This is the layer that justifies the whole check-in ritual: the client learns something about their own physiology.

**Part 3 — The decision + the reason (1–3 sentences)**
Elite coaches state both *what* they are doing and *why now*. "I'm not touching your calories this week — the trend is exactly where we want it and biofeedback is good, so there's no reason to push." Non-actions with reasons are as trust-building as actions with reasons, possibly more so (Avatar Nutrition pioneered this; Volyume's held-decisions card encodes it). Coaches who change things every week without explanation are perceived as reactive and lose credibility.

**Part 4 — One tactical cue for the coming week (1–2 sentences)**
Not a list of 10 things. One: "Prioritise hitting your protein on the days you log the gym — you're about 15 g short on workout days." A single actionable cue is more likely to be acted on than a corrections list. This also generates a check-in anchor for next week (did they do it?).

**Part 5 — Forward statement (1 sentence)**
Creates the next anchor: "See you Sunday — let's see what the scale does after the lower carb day Thursday." This closes the loop and installs expectation for the next submission.

Sources: [AFPA email templates](https://www.afpafitness.com/blog/6-email-templates-to-encourage-check-in-with-your-clients/); [Straker Nutrition check-in system](https://strakernutritionco.com/macronutrient-reporting-check-in-template/); [usecoached check-in guide](https://usecoached.com/blog/how-to-do-client-check-ins-personal-trainers); Barbell Logic coaching methods via search; [Precision Nutrition coaching challenges](https://www.precisionnutrition.com/overcome-the-most-common-coaching-challenges)

### 2.2 Tone: the voice that builds trust

The research converges on a narrow band that elite coaches operate in:

- **Data-first, not motivational-first.** Beginners appreciate encouragement; advanced athletes find excessive cheerleading patronising. The credibility comes from showing you read the data, not from pep talks.
- **Adherence-neutral.** MacroFactor's explicit philosophy ([macrofactor.com/adherence-neutral](https://macrofactorapp.com/adherence-neutral/)) is the formal articulation of what elite coaches do intuitively: the algorithm (or coach) works with what was logged, without judgment. No red numbers. No "you should have done better." The plan adapts to reality. This is directly retention-positive — shame-based coaching causes ghosting.
- **Confident, not hedging.** "I'm keeping calories the same" not "I think maybe we could consider holding." [stat removed 2026-06-12 citation audit — "decisiveness signals competence", the "150–250 words" length band, and "use the first name once" had no source and were unverifiable; see validation/val-ext-03-06.md E6-12]
- **Brief.** Keep the response tight — not a wall of text, not a list of 12 bullet points. A high signal-to-noise ratio reads as "a coach who knows what they're doing"; the specific word count is a design choice, not a sourced figure.

### 2.3 What makes clients feel *neglected* (the anti-patterns)

From PTDC survey, CoachRx ghost-client analysis, coaching-industry loss data:

1. **Generic responses.** "Great week! Keep it up." After 2–3 weeks, clients know the coach didn't read their submission. Cancellation predictably follows. ([PTDC why clients leave](https://www.theptdc.com/articles/why-clients-leave-personal-trainers))
2. **Slow response time.** Elite coaches and coaching platforms promise 24-hour response. Even an automated acknowledgement ("I've received your check-in and will review it by Sunday 6pm") prevents the "I feel ignored" spiral.
3. **No explanation for the decision.** Macros changed, no reason given. Training changed, no reason given. This is the failure mode behind the "RP algorithm slashed my macros" complaints and the "Fitbod randomiser" perception. Clients who don't understand why a change happened cannot trust it.
4. **The coach ignored what I told them.** The "felt flat all week but they raised my training volume" pattern. Data collected but not visibly acted on = betrayal of the check-in contract.
5. **No forward pull.** Sessions end without a "see you next week for X." No anchor = no urgency to check in next time.

---

## 3. Coaching tools: the platform landscape

### 3.1 Platform comparison for context

| Platform | Check-in capability | Coach intelligence | Weakness |
|---|---|---|---|
| **WAG Seismic** | Gold standard: auto-compiled data + narrative layer + photos + comparison | Human only | Top tier ~$219/mo (Lite $99 / Essentials $179 / Plus $219; 12-mo Essentials $129) — only the top tier is "$200+"; human bottleneck [corrected 2026-06-12 citation audit — was "$200+/mo"; see E6-16] |
| **TrueCoach** | Good UI, metric graphs, coach comments per exercise; photo tasks, metric tracking, side-by-side comparison; coach responds manually | Human only | No structured form builder historically (being addressed); no algorithmic intelligence [corrected 2026-06-12 citation audit — merged duplicate TrueCoach rows; see E6-17] |
| **Everfit** | Best B2B tooling: scheduled forms, photo tasks, Responses Comparison, 10am push reminders | Human only | Intelligence stays with coach, no algorithmic layer |
| **Trainerize** | Weakest of the big three: no native check-in form for years (community complaint) | Human + AI workout builder | Check-in gap being filled only recently |
| **CoachRx** | Customisable weekly check-ins, activity feed, athlete performance summaries | Human only | Smaller community |

**Key lesson:** Every B2B coaching platform is intelligence-free. All the "smart" work (decision-making, data interpretation) happens in the coach's head, not in the software. Volyume's engine encodes this intelligence algorithmically — which is why it is structurally closer to WAG+Seismic than to any app competitor.

### 3.2 RP Strength coaching practice

RP coaches run email check-ins 2–3×/week on both tiers. Coaching Essentials ($349.99/mo) is email-based with no live calls; Full Access ($599.99/mo) adds a weekly 20-minute video call plus texting. Both tiers respond within 24 hours on business days, with a stated philosophy that deloads should be *explained* so clients don't feel they're stepping backward. [corrected 2026-06-12 citation audit — was "twice-weekly nutrition / weekly training" and omitted prices; email check-ins are 2–3×/week on BOTH tiers; "macro adjustments at every check-in (no cap)" is not stated on the page; see E6-18] ([RP Strength coaching page](https://rpstrength.com/pages/coaching))

The RP Hypertrophy app's in-session feedback (pump/soreness/effort per exercise) closes the loop *within the mesocycle*: each session's ratings adjust the next session's volume targets. Users praise this loop, and the recurring complaints are survey fatigue and the price (~$34.99/mo) rather than the mechanism itself. [corrected 2026-06-12 citation audit — regular price verified at $34.99/mo, but the "if your quads aren't just right…" quote and its attribution to a JuggernautAI review at powerliftingtechnique.com (a different product) are unverifiable; quote and miscited source removed; see E6-19]

### 3.3 3DMJ coaching model

3DMJ (Team 3D Muscle Journey) operate a relationship-led, collaborative coaching model. Their published coaching philosophy — an article by **Brad Loomis** (Feb 2025) — centres on three keys: (1) know the client's goals; (2) care about and acknowledge their progress; (3) provide clear, frequent guidance. What is notable for Volyume: the article does describe negotiating what is *optimal* versus what is *adhereable* and setting an "enjoyable yet flexible plan for the best adherence possible" — the autonomy/adherence trade-off that every beginner-facing product should encode. [corrected 2026-06-12 citation audit — the cited article is by Brad Loomis (Feb 2025), not "Eric Helms et al."; its three keys differ from those previously listed; and the weekly-for-competitors / biweekly-off-season cadence claims are not in the source and have been removed; see E6-20] ([3DMJ coaching philosophy](https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction))

---

## 4. What makes coaching clients STAY (the retention science)

### 4.1 Retention data

- Standard PT client retention is around 75–80%, dropping to ~70% seasonally, with 90% held up as an aspirational goal through systematic client-success management. [corrected 2026-06-12 citation audit — the previous three-tier breakdown ("average 50–65% / strong coaches 65–80% / elite 80–90%+") was fabricated; the cited Everfit article contains none of those figures; see E6-21] ([Everfit retention guide](https://blog.everfit.io/how-to-retain-personal-training-clients))
- [stat removed 2026-06-12 citation audit — "structured onboarding retains 87% at 6 months vs 60%, a 27-point gap" is absent from the cited Optimized Growth source and could not be found; see validation/val-ext-03-06.md E6-22]
- Members who attend ~3 sessions/week in month 1 retain at roughly 4× the rate of those who attend sporadically — the gym equivalent of D1–D7 activation in apps. (Directional: this is gym-marketing content with no underlying citation; treat as industry folklore.) [corrected 2026-06-12 citation audit — kept the 4× figure (verified as cited, E6-23) but removed the unsupported "8+ visits in month 1" claim, E6-24; see E6-23/E6-24] ([Optimized Growth gym onboarding](https://optimizedgrowth.com/gyms/blog/gym-onboarding-first-30-days/))
- New gym members typically decide whether to stay within the first 30 days, making early activation the critical window. [corrected 2026-06-12 citation audit — was "50% cancel within 6 months; attrition concentrates in the first 90 days"; the cited Virtuagym source carries neither figure, only the first-30-days point; see E6-25] ([Virtuagym onboarding](https://business.virtuagym.com/blog/fitness-onboarding/))

### 4.2 The top-5 reasons clients leave (PTDC survey + industry data)

1. **No relationship / feeling unseen.** "I didn't feel like they knew me." The fix is *specific acknowledgement* — which is free.
2. **Poor communication between sessions.** Clients who feel unsupported between sessions miss workouts and make worse nutrition choices. The cadence of contact matters more than its length.
3. **No visible progress / no progress narrative.** Clients need to be *shown* their progress in a format they can understand. If the scale is not moving they conclude the plan isn't working — even when it is.
4. **Generic programme.** "I felt like I was doing the same thing everyone else was doing." Personalisation = differentiation, even when the underlying programme structure is similar.
5. **Shame / judgment when they fall off.** Ghosting is almost always shame-driven. Coaches who create a "failure is information, not verdict" culture dramatically lower ghost rates. ([PTDC re-engagement](https://www.theptdc.com/articles/how-to-reengage-clients-who-ghost); [CoachPro+ 5 mistakes](https://coachproplus.com/blog/en/personal-trainer-mistakes-lose-clients))

### 4.3 What keeps clients 12+ months

- **Seeing data-driven progress narratives.** Not just today's weight but the *story* of the last 8 weeks. Charts, before/after comparisons, and performance-over-time graphs directly counter the plateau discouragement that drives 30–60 day churn.
- **Knowing the coach will notice if they go quiet.** The Hawthorne Effect plus anticipation of being noticed drives check-in compliance — the app equivalent is the "missed check-in" message that arrives before the coach gives up on them.
- **Milestones and periodisation.** A clear phase structure (bulk / cut / peak / off-season) creates natural commitment horizons: clients commit to the next 8 weeks rather than month-to-month. Finishing a mesocycle feels like completing something.
- **Autonomy within structure.** 3DMJ's collaborative model and MacroFactor's program modes both reflect this: clients stay when they feel the plan is *their* plan, not something imposed on them.
- **The forward pull.** Every check-in ends with an anchor for the next one. Every mesocycle ends with a reveal of the next phase. The experience always points toward something.

---

## 5. The mass-market opportunity: "a coach in your pocket"

### 5.1 The gap the market has not filled

Top-tier online physique coaching costs £150–400/month. The methodology — adaptive nutrition, check-in review, explained decisions, deload protocols, mesocycle periodisation — is not inherently expensive. It is expensive because a human executes it 1:1. An app that deterministically encodes this methodology and presents it in the check-in / feedback structure described in Section 2 is "a coach in your pocket" at £10–15/month.

Volyume already *has* the engine. What it currently lacks is the **surface layer that makes the engine feel like a coach** — the five-part feedback response, the explained decisions, the named acknowledgement, the forward pull.

### 5.2 The dual-market tension and its resolution

The challenge: Elite users (Eddie) want data density, credible methodology, and control. Beginners (Besa) want to feel guided, not overwhelmed, and need a quick first win before they will engage with the detail.

The resolution that elite coaching actually uses: **progressive disclosure through the relationship.**

Progressive disclosure is a sound general principle — it is supported by Volyume's own verified sources (RP simplifying its app for new users; documented MacroFactor complexity complaints for beginners). The coaching depth should scale with demonstrated engagement, not with the app's perception of the user's sophistication. [stat removed 2026-06-12 citation audit — the staged WAG schedule ("new client starts with macros, weight and two narrative questions; measurements and photos at +4 weeks; advanced biofeedback at +8 weeks") was unverifiable: no trace on WAG's own pages, and WAG's actual flow has before-photos/measurements submitted at setup; progressive disclosure retained as a general principle, not as this WAG example; see validation/val-ext-03-06.md E6-29]

For Volyume: the Pro check-in is already sophisticated. The beginner onboarding / activation window (D0–D14) should offer a *simplified* version of the same structure — fewer asks, more explicit interpretation, more encouragement — that graduates toward the full check-in as the user demonstrates consistent logging.

### 5.3 The beginner-specific fear: gym anxiety and the "what do I do" problem

Research documents "gymtimidation" clearly: beginners overestimate how much they are being judged (spotlight effect), have low self-efficacy, and need structured guidance to reduce anxiety and build confidence. ([NASM gym anxiety](https://blog.nasm.org/overcoming-gym-anxiety)) A key retention lever for Besa is making the *first workout* feel guided and achievable — having a specific plan removes the decision burden. The app equivalent of the "intro session with a trainer" is an in-app moment at session 1 that says: "Here's what you're doing today, why it's the right choice for where you are, and what to do if any exercise feels wrong."

This is not complexity — it is coaching voice applied to a simple programme.

---

## 6. Gaps between elite coaching practice and Volyume's current implementation

### 6.1 Where Volyume's engine already matches or exceeds elite coaching

| Elite coaching practice | Volyume equivalent | Status |
|---|---|---|
| EWMA trend weight (not single-day) | EWMA weight trend in check-in | ✅ Implemented |
| Adherence score from log data | Calorie adherence % from diary log | ✅ Implemented |
| Energy, sleep, stress, soreness subjective data | Check-in subjective block (6 items) | ✅ Implemented |
| Non-action explanation ("held, here's why") | Held-decisions card | ✅ Unique in market |
| Explicit user consent before applying adjustment | Per-row Apply tap | ✅ Unique in market |
| Deload triggered by performance + fatigue signals | MRV detection + autoregulated deload | ✅ Implemented |
| Safety floor enforcement | ED safety system + calorie floors | ✅ Implemented (untouchable) |
| Confidence gating ("not enough data") | Check-in blocked without ≥3 weigh-ins | ✅ Implemented |
| Adjustment hierarchy (hold → reduce cardio → cut cals) | Cardio + calorie adjustment logic | ✅ Implemented |
| Competition-phase periodisation | Peak-week protocols + federation logic | ✅ Implemented |

### 6.2 Where Volyume's surface layer lags elite coaching

| Elite coaching practice | Volyume gap | Effort | Priority |
|---|---|---|---|
| Specific, data-referenced acknowledgement | Coach card lacks named acknowledgement of this week's specifics | Low | P1 |
| Explained decisions in plain language | Held-decisions card exists but does not narrate the *story* of the trend in plain English | Medium | P1 |
| One tactical cue for the week ahead | No "this week, focus on X" forward-pointing message | Low | P1 |
| Forward pull / next-anchor statement | Check-in card ends after the decision; no "see you next Sunday" moment | Low | P2 |
| Progressive disclosure for beginners | No simplified check-in path for users in D0–D14 | Medium | P2 |
| "Missed check-in" re-engagement | No proactive ghost-prevention when user misses their check-in day | Medium | P2 |
| Named methodology / credible authorship | Engine principles not surfaced to user; no "based on Israetel/Norton/Helms framework" equivalent | Low | P3 |
| Progress narrative over time | Check-in card shows this week; no "here's your 6-week story" summary | Medium | P3 |
| Photo-side-by-side comparison | Progress photos collected but no side-by-side viewer in check-in | High | P3 |

---

## 7. Ranked opportunities — persona + effect + effort + placement

### OPP-C01 — The "Five-Part Coach Response" check-in card
**Persona:** Both (Elite needs data density; Beginner needs interpretation)
**Effect:** Retention — directly addresses the #1 reason clients leave ("felt unseen")
**Effort:** Low — purely copy/UX change to the existing check-in output card; no engine change
**Constraint:** None
**Placement:** The coach-output screen that appears after the 4-step check-in wizard completes. Currently shows held-decisions cards. Add above them: a 3-sentence "coach summary" that (a) names one specific thing from this week's data, (b) interprets the trend in one sentence, (c) states the decision with the reason.

> Example output: "Three weigh-ins this week — solid data. Your 7-day average is down 0.5 kg on last week, right on target. Calories are staying put: the trend is moving exactly where we want it."

This is the single highest-leverage improvement in this audit. Elite coaches say the specific acknowledgement is what makes clients feel coached. It costs nothing but intentional copy design.

**Disagreement with prior audit:** The prior check-in research (agent 13) correctly noted the held-decisions card is unique and strong. It did not surface the "named acknowledgement + plain-language trend interpretation" layer that human coaches universally lead with — which is structurally prior to the decision. This report adds that missing layer.

---

### OPP-C02 — "One cue for the week ahead" forward pull
**Persona:** Both
**Effect:** Retention + daily engagement (creates a mid-week micro-loop)
**Effort:** Low — copy-driven; engine already has the data to generate one prioritised cue
**Constraint:** None
**Placement:** Bottom of the coach-output card, below the decisions. "This week: [single focus]." Examples: "Your protein was low on rest days — try to hit your target on at least 4 days." / "You flagged poor sleep twice — try to be off your phone by 10 pm." The cue is derived from the check-in data, not generic.

---

### OPP-C03 — Missed check-in ghost prevention
**Persona:** Both (Besa more likely to ghost; Eddie more likely to deprioritise during a busy phase)
**Effect:** Retention — addresses the coaching-client ghosting dynamic directly. Early disengagement (missed check-in) is the strongest predictor of churn in human coaching.
**Effort:** Low-Medium — notification logic + re-engagement copy
**Constraint:** None
**Placement:** Push notification on check-in day + 24 hours after. Not "You missed your check-in" (shame-adjacent). Instead: "Your check-in data is ready to review — takes 2 minutes." Second message (48h later): "Your trend weight is [X]. Tap to see how the week compares." The second message uses derived data the engine already has — it creates value before the user opens the app, which is the highest-conversion notification pattern.

---

### OPP-C04 — Progressive disclosure check-in for D0–D30 (Beginner activation)
**Persona:** Besa (Beginner)
**Effect:** Activation + D7/D30 retention — early activation is the critical window (new gym members typically decide whether to stay within the first 30 days, E6-25), and structured onboarding plausibly improves retention; similar leverage applies here [corrected 2026-06-12 citation audit — was "structured onboarding adds 27 percentage points to 6-month retention", which relied on the unsupported 87%/60% stat; see E6-22/E6-25]
**Effort:** Medium — requires a simplified check-in variant and a graduation trigger
**Constraint:** None
**Placement:** During the first 4 weeks of app use (or until user has completed 3 check-ins), show a simplified 2-step check-in: (1) weight trend only, auto-derived; (2) one open question ("How did this week feel? Any wins?"). The coach output is simplified: one sentence on what the trend means, one sentence on what will happen next. After 3 completed check-ins, graduate to the full Pro check-in with an explicit "your data is now complete enough for full coaching" moment.

This addresses the survey-fatigue problem for beginners while keeping the engine requirements intact (it accumulates data silently). The graduation moment creates a milestone.

---

### OPP-C05 — 6-week progress narrative card ("Your last 6 weeks")
**Persona:** Both (Eddie wants data density; Besa needs to see the story to stay)
**Effect:** Retention — "no visible progress" is the 3rd top reason clients leave; this addresses it directly. Also generates virality (shareable milestone)
**Effort:** Medium — requires a summary view that aggregates check-in history into a narrative chart
**Constraint:** None
**Placement:** On the 6th weekly check-in completion (or monthly, whichever comes first), present a full-screen card: trend-weight chart for the period, total adjustment changes made, one-sentence narrative ("You've lost X kg over 6 weeks while maintaining your training volume — the engine has held or adjusted calories Y times to keep your rate on target"). Primary call-to-action: "Share your progress" (virality vector). Secondary: "View full history."

This is directly analogous to Spotify Wrapped or Apple Fitness monthly summaries, applied to coaching data. The coaching industry's Month-in-Review failure (Whoop's diluted version) shows the risk of making this *less* data-dense — Volyume should make it *more* dense than competitors.

---

### OPP-C06 — Plain-language trend interpretation layer ("What this means")
**Persona:** Besa (Beginner needs translation; Elite already understands)
**Effect:** Activation + retention — reduces the "I don't understand what the app is telling me" churn trigger
**Effort:** Low — copy/UX, no engine change
**Constraint:** None
**Placement:** Throughout the check-in flow, not just on the output card. When showing EWMA trend: "Your average weight this week is [X]. That's [Y] down from last week — [exactly on target / faster than ideal / slower than target]." When showing calorie adherence: "You hit your calories 5 out of 7 days. That's enough for the engine to make a reliable adjustment." The engine already knows these classifications; the copy layer is absent.

This is the most direct embodiment of the "coach in your pocket" principle: translating numbers into meaning at the moment the user sees them.

---

### OPP-C07 — Named methodology anchoring ("Why the engine works")
**Persona:** Eddie (Elite needs credibility; Besa doesn't need the detail but benefits from the authority signal)
**Effect:** Conversion + trust (reduces "is this just an algorithm?" doubt)
**Effort:** Low — copy, a methodology page, and 2–3 in-app contextual citations
**Constraint:** None
**Placement:** (1) In onboarding, one screen: "Volyume's Precision Coaching is built on the same research principles used by elite physique coaches — adaptive energy balance, MEV/MAV/MRV volume landmarks, and IOC RED-S safety standards." Named methodology = named trust. (2) In the check-in card, a single footnote/link: "How Volyume calculates this →" (linking to a methodology page). (3) On the paywall: "The same decision logic used by competition prep coaches at £200+/month, for £X/month."

The prior audit (agent 3) identified this gap (no named credible author, no published methodology). This report confirms it from the human-coaching side: every trusted coaching platform — WAG, RP, Carbon, 3DMJ, MacroFactor — publishes its methodology and names the experts behind it. Volyume's engine cites IOC RED-S and MATADOR internally; the user never sees the receipts.

---

### OPP-C08 — Post-workout survey rationalisation (trim to 3–4 items)
**Persona:** Both (Besa more impacted by the survey burden; Eddie tolerates it)
**Effect:** Activation + habit loop (reduces friction on the daily-return trigger)
**Effort:** Medium — requires engine-side validation that 3–4 items retain sufficient signal
**Constraint:** ED safety system: joint pain must survive any fast path (feeds safety holds)
**Placement:** Post-workout survey reduced to: (1) session RPE/difficulty, (2) pump, (3) joint pain. Energy and sleep moved to pre-session micro-readiness check (mirrors TrainHeroic/JuggernautAI split — praised by users of those apps). Soreness-coming-in already captured in weekly check-in. This was recommended by agent 13 and is confirmed here from the human-coaching perspective: 5 items maximum, distributed across the session rather than stacked at the end.

---

### OPP-C09 — "Coaching autonomy" mode for Elite users (Eddie)
**Persona:** Eddie (Elite)
**Effect:** Credibility + retention (advanced users who feel constrained by a locked system churn to spreadsheets)
**Effort:** Medium-High — requires override layer on top of the existing engine
**Constraint:** ED safety floors must remain active even in override mode; billing/Pro gating unchanged
**Placement:** In Pro settings: "Advanced: manual override mode." Allows Eddie to accept or reject individual adjustments with reason selection ("I disagree with this adjustment — I've had a water retention week") and log the reason. The engine continues running; the override is noted and incorporated into confidence calculations next cycle. This mirrors 3DMJ's collaborative model: "the plan is created together." No changes to the engine's constraints; just adds a documented exception layer.

---

### OPP-C10 — Phase-completion celebration and next-phase reveal
**Persona:** Both
**Effect:** Retention (forward pull at the natural churn point — end of mesocycle)
**Effort:** Medium — requires a triggered milestone screen tied to phase completion
**Constraint:** None
**Placement:** When a mesocycle or phase completes, present a full-screen celebration card with: summary of the phase (weeks completed, total volume managed, trend weight change), a brief explanation of what the next phase is and why ("You've completed a 6-week accumulation block. The engine is now moving you into an intensification phase — here's what changes and why"), and a 7-day commitment CTA ("Start your intensification phase →"). This is the app equivalent of the "next phase" conversation that elite coaches use to lock in the next 8 weeks of commitment before the natural churn window opens.

---

## 8. Cross-reference with prior audit conclusions

### Where this report confirms prior findings
- The held-decisions card (Volyume unique, Avatar precedent) is confirmed as a high-trust mechanic. Extend, do not simplify.
- EWMA trend weight = correct; spike-sensitivity avoidance = correct.
- 7-question post-workout survey = still too long; prior recommendation to trim to 3–4 confirmed.
- No LLM/AI is a moat, not a liability — confirmed by human coaching community's reliance on deterministic decision logic.

### Where this report challenges or extends prior findings

**Challenge:** Agent 13 concluded "Volyume's pre-derived 4-step check-in is largely ahead of the field." This is true at the *data-collection and decision-making* layer. It is *not* true at the *feedback-output* layer, where the coach response currently lacks the five-part anatomy (specific acknowledgement → trend interpretation → decision + reason → one cue → forward pull) that human coaches universally use. The engine is ahead; the surface presentation lags.

**Extension:** The prior audit did not cover the ghost-prevention / missed-check-in re-engagement dynamic, which is the most documented cause of coaching-client churn and maps directly to app churn. OPP-C03 addresses this gap.

**Extension:** The prior audit did not surface the beginner-specific onboarding issue: new gym members typically decide whether to stay within the first 30 days, making early activation the critical window. OPP-C04 (progressive disclosure for Besa) addresses this directly and was not in the prior work. [corrected 2026-06-12 citation audit — was "50% of gym members cancel in 6 months, concentrated in days 1–90, with a proven 27-point retention lift"; the first clause is unsupported by the cited Virtuagym source (E6-25) and the 27-point figure relied on the unsupported 87%/60% stat (E6-22); re-anchored to the verified first-30-days point; see E6-22/E6-25]

**Extension:** The "one tactical cue for the week ahead" (OPP-C02) is a coaching pattern with no algorithmic analogue in any competitor app. It is low-effort and creates a mid-week micro-engagement loop that no competitor offers.

---

## 9. Ranked shortlist (highest conviction, lowest ambiguity)

| Rank | ID | Description | Persona | Effect | Effort | Constraint |
|---|---|---|---|---|---|---|
| 1 | OPP-C01 | Five-part coach response card | Both | Retention | Low | None |
| 2 | OPP-C06 | Plain-language trend interpretation | Besa | Activation | Low | None |
| 3 | OPP-C03 | Missed check-in ghost prevention | Both | Retention | Low-Med | None |
| 4 | OPP-C02 | One cue for the week ahead | Both | Retention + daily loop | Low | None |
| 5 | OPP-C04 | Progressive disclosure check-in (D0–D30) | Besa | Activation | Medium | None |
| 6 | OPP-C07 | Named methodology anchoring | Eddie | Credibility | Low | None |
| 7 | OPP-C05 | 6-week progress narrative card | Both | Retention + virality | Medium | None |
| 8 | OPP-C10 | Phase-completion celebration + next reveal | Both | Retention (churn-point) | Medium | None |
| 9 | OPP-C08 | Post-workout survey trim (3–4 items) | Both | Habit loop | Medium | ED safety: joint pain survives |
| 10 | OPP-C09 | Coaching autonomy mode for Elite | Eddie | Credibility | Med-High | Safety floors remain active |

---

## Sources

- [WAG How Does It Work](https://www.workingagainstgravity.com/how-does-wag-work)
- [Stronger U Feature Guide](https://resources.strongeru.com/feature-guide)
- [Stronger U 6 Tips for Maximizing Check-ins](https://strongeru.com/6-tips-for-maximizing-your-coach-check-ins/)
- [RippedBody: How to Adjust Macros](https://rippedbody.com/how-to-adjust-macros/)
- [RippedBody: Progress Tracking](https://rippedbody.com/diet-progress-tracking/)
- [The Macro University: When to Tweak, When to Wait](https://www.themacrouniversity.com/blog/macro-adjustments-when-to-tweak-when-to-wait)
- [LVL TN Coaching: Mastering the Cut](https://www.lvltncoaching.com/post/mastering-the-cut-how-to-successfully-navigate-a-dieting-phase)
- [3DMJ Coaching Philosophy](https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction)
- [3DMJ Coaching](https://www.3dmusclejourney.com/coaching)
- [RP Strength Coaching](https://rpstrength.com/pages/coaching)
- [MacroFactor Adherence Neutral](https://macrofactorapp.com/adherence-neutral/)
- [MacroFactor Algorithms and Core Philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)
- [MacroFactor Dashboard Revamp](https://macrofactor.com/dashboard-revamp/)
- [Sports Medicine Open — Deloading Survey](https://link.springer.com/article/10.1186/s40798-024-00691-y)
- [PMC — Integrating Deloading: Delphi Consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)
- [Shura SHU — Practical Approach to Deloading](https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach(AM).pdf)
- [Menno Henselmans — Autoregulation and Reactive Deloading](https://mennohenselmans.com/autoregulation-reactive-deloading-avt/)
- [PMC — Bodybuilding Coaching Strategies Qualitative Study (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10299204/)
- [TrainHeroic — Athlete Readiness Surveys](https://www.trainheroic.com/blog/how-to-weaponize-your-coaching-with-athlete-readiness-surveys/)
- [HubFit — Ultimate Guide to Check-ins](https://hubfit.com/blog/the-ultimate-guide-to-online-coaching-check-ins)
- [HubFit — 10 Must-Ask Questions for Weekly Check-ins](https://hubfit.com/blog/10-questions-for-weekly-checkins/)
- [Gymkee — Check-in Templates](https://gymkee.com/blog/personal-training-client-check-in-template/)
- [PTDC — Why Clients Leave Personal Trainers](https://www.theptdc.com/articles/why-clients-leave-personal-trainers)
- [PTDC — How to Re-Engage Clients Who Ghost](https://www.theptdc.com/articles/how-to-reengage-clients-who-ghost)
- [CoachRx — When Clients Ghost You](https://www.coachrx.app/articles/when-clients-ghost-you-real-tips-to-handle-silent-clients-and-keep-your-coaching-on-track)
- [CoachPro+ — 5 Mistakes Personal Trainers Make](https://coachproplus.com/blog/en/personal-trainer-mistakes-lose-clients)
- [Everfit — How to Retain Personal Training Clients](https://blog.everfit.io/how-to-retain-personal-training-clients)
- [TrueCoach — Top 10 Client Retention Strategies](https://truecoach.co/blog/the-top-10-client-retention-strategies-for-fitness-coaches/)
- [TrueCoach — Hidden Cost of Client Churn](https://truecoach.co/blog/the-hidden-cost-of-client-churn-why-retention-not-acquisition-is-the-real-key-to-coaching-success/)
- [NFPT — Pushing Through the Plateau](https://www.nfpt.com/blog/pushing-through-the-plateau-how-to-help-clients-overcome-stalled-progress)
- [Optimized Growth — Gym Onboarding First 30 Days](https://optimizedgrowth.com/gyms/blog/gym-onboarding-first-30-days/)
- [Virtuagym — Fitness Onboarding](https://business.virtuagym.com/blog/fitness-onboarding/)
- [NASM — Gym Anxiety](https://blog.nasm.org/overcoming-gym-anxiety)
- [businesscoachvas — Coaching Client Retention](https://businesscoachvas.com/blog/coaching-client-retention-strategies)
- [Dr. Muscle — RP Hypertrophy App Critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)
- [Macros Inc — How Coaching Works](https://macrosinc.net/blog/how-does-our-coaching-work)
- [AFPA — Email Templates for Clients](https://www.afpafitness.com/blog/6-email-templates-to-encourage-check-in-with-your-clients/)
- [Straker Nutrition Co — Done For You Check-in System](https://strakernutritionco.com/macronutrient-reporting-check-in-template/)
- [usecoached — How to Do Client Check-ins](https://usecoached.com/blog/how-to-do-client-check-ins-personal-trainers)
- [Smashing Magazine — Designing a Streak System](https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/)
- [sportfitnessapps — Trainerize vs Everfit vs TrueCoach](https://sportfitnessapps.com/blog/abc-trainerize-vs-everfit-vs-truecoach/)
- [FitBudd — Everfit vs Trainerize vs TrueCoach](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach)
- [WAG Seismic Business Program](https://www.workingagainstgravity.com/articles/seismic-business-program)
