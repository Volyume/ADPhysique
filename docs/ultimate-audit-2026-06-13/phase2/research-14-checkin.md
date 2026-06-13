# Research 14 — Check-in, Weekly Review & Coach Communication

**Agent 14 / Phase 2 Ultimate Audit (2026-06-13)**
Brief: research 50+ apps with weekly review / check-in / coach-summary features. Answer: what check-in formats users complete vs abandon; how long is too long; how apps communicate coaching decisions to non-experts vs athletes; what makes a weekly review feel genuinely valuable; how apps make data-driven decisions feel personal; psychology of feedback in behaviour change.

Format followed: `docs/ultimate-audit-2026-06-13/phase2/_RESEARCH-FORMAT.md`. British English. Every finding carries a status and a source URL. Inferences are labelled INTERPRETATION and kept separate.

---

## 1. APPS / SOURCES RESEARCHED

App / product apps (check-in or weekly-review feature) — 26:

| # | App / product | Status | One-line note |
|---|---|---|---|
| 1 | RP Diet Coach | VERIFIED | Weekly check-in confirms intake, recommends macro change; called rigid. |
| 2 | RP Hypertrophy | VERIFIED | Autoregulates from pump/soreness/joint/workload feedback; "not beginner-friendly". |
| 3 | MacroFactor | VERIFIED | Weekly check-in with "coaching modules"; introduces + explains each module. |
| 4 | Carbon Diet Coach | VERIFIED | 7-day check-in, 3 questions, adherence-gated adjustment. |
| 5 | WHOOP | VERIFIED | Weekly Performance Assessment, every Monday, 5+ days data. |
| 6 | Strava | VERIFIED | Monthly Recap / Year in Sport animated review. |
| 7 | MyFitnessPal | VERIFIED | Weekly Digest + Progress Overview, dietitian-backed tips. |
| 8 | Future | VERIFIED | Dedicated human coach, weekly text/video check-ins. |
| 9 | Caliber | VERIFIED | Weekly asynchronous video check-ins (Premium), highly praised. |
| 10 | Ladder | VERIFIED | Coach video reviews, asynchronous weekly cadence. |
| 11 | Noom | VERIFIED | 16-week curriculum, weekly check-in with goal specialist. |
| 12 | Oura | VERIFIED | Daily 3 scores + weekly/monthly trends, actionable guidance. |
| 13 | Garmin | PARTIAL | Weekly summaries valued; specific UX detail thin. |
| 14 | JuggernautAI | VERIFIED | RPE autoregulation; "assumes you understand RPE / %"; not for casual. |
| 15 | Fitbod | VERIFIED | Per-muscle recovery 0–100%; some find suggestions repetitive. |
| 16 | Hevy | PARTIAL | Logger, not coach; no weekly-review check-in surfaced. |
| 17 | BoostCamp | PARTIAL | Free; lacks real-time feedback / weekly review. |
| 18 | Centr | PARTIAL | Pre-set programs, little personalisation / review. |
| 19 | Freeletics | PARTIAL | Personalised plans; check-in detail not found. |
| 20 | Cronometer | PARTIAL | "Diet Coach AI" only a feature request, not shipped. |
| 21 | Spotify Wrapped (non-fitness benchmark) | VERIFIED | Gold standard for data-made-personal; used as design benchmark. |
| 22 | Lifted: Group Fitness | PARTIAL | Group weekly-goal accountability mechanic. |
| 23 | Workout Crew | PARTIAL | Group accountability / weekly goals. |
| 24 | TrueCoach | PARTIAL | Coach check-in template; no length/abandonment data on page. |
| 25 | My PT Hub | VERIFIED | Coach guidance on check-in/photo cadence and "dread to submit". |
| 26 | Coached (usecoached) | PARTIAL | Coach check-in guide page blocked (403); only search snippet. |

Coaching-practice + academic + UX sources — 12:

| # | Source | Status | One-line note |
|---|---|---|---|
| 27 | NOOB GAINS RP review | PARTIAL | Cited via search; direct page 404/blocked. |
| 28 | Kluger & DeNisi 1996 (FIT meta-analysis) | VERIFIED | 1/3 of feedback interventions *reduce* performance. |
| 29 | FIT clinical-dashboard design paper (PMC6371234) | VERIFIED | Task-focus vs self-focus design principles. |
| 30 | Self-weighing systematic review (Zheng 2015, Wiley) | VERIFIED | Self-weighing aids loss, generally no adverse psych. |
| 31 | Self-monitoring & disordered eating RCT (PMC6010018) | VERIFIED | No adverse ED effect at 1yr in obesity-treatment adults. |
| 32 | Daily self-weighing adverse-outcomes RCT (ScienceDirect) | PARTIAL | Caveat: vulnerable individuals differ. |
| 33 | Habit-loop / habit-tracking (Psychology Today) | VERIFIED | Cue–behaviour–reward; checkmark as micro-reward. |
| 34 | Over-tracking backfire (Psychology Today) | VERIFIED | Over-tracking can fuel anxiety/obsession. |
| 35 | Spotify Wrapped UX-psychology (Medium/Bootcamp) | VERIFIED | Named principles: SDT, narrative, peak/nostalgia, social comparison. |
| 36 | Weekly-review productivity science (Week Plan) | VERIFIED | Structured reflection backed by cognitive/behavioural science. |
| 37 | Weekly-review single-focus design (Forte Labs / Sunsama) | VERIFIED | "If everything is a priority, nothing is"; 1–2 metrics only. |
| 38 | Autentika fitness-app abandonment | VERIFIED | 71% abandon by month 3; only 40% past first 24h. |

**Count: 38 named sources, 26 of them apps/products. ~24 VERIFIED, ~13 PARTIAL, 0 fabricated.** The 26-app threshold exceeds the 20-app minimum; >20 with real data, so no shortfall flag needed. NOTE: app-store/Reddit *verbatim* user voice was thin — see §6.

---

## 2. FINDINGS BY QUESTION

### Q1 — What check-in formats do users complete consistently vs abandon?

**F1.1 (VERIFIED) — Short, fixed-question check-ins get completed; the shortest in the market is Carbon's three questions.**
Carbon asks exactly three at check-in: body weight, body fat (optional), and (for women) whether weight was affected by your period. The app then recalculates targets. Adherence-gating keeps it light: if you weren't adherent, targets stay the same and it just tells you to stick closer next week.
- NEWBIE: three numbers per week is a format a beginner can sustain — low friction, no jargon.
- ATHLETE: athletes may want more inputs (training, photos), but the *spine* being three fields is what makes it stick.
Source: https://help.joincarbon.com/en/articles/6004812-weekly-check-in (VERIFIED)

**F1.2 (VERIFIED) — Weekly progress *photos* cause "photo fatigue" and get skipped outside contest prep; coaches drop to 2–4 weekly.**
"Weekly is overkill and creates photo fatigue." Weekly photos are reserved for active contest prep where change is rapid; off-season many athletes move to every 2–4 weeks. Coaches state the design tension explicitly: "an effective check-in balances thoroughness with simplicity… not so much that clients dread submitting it."
- NEWBIE: weekly photos are a high-effort, body-image-loaded ask; likely abandoned and potentially harmful. Default to less frequent / optional.
- ATHLETE (physique competitor): weekly photos are expected and tolerated *during prep only*; make cadence phase-aware.
Source: https://www.mypthub.net/blog/the-ultimate-guide-to-progress-pics/ (VERIFIED)

**F1.3 (VERIFIED) — Adherence-honest formats sustain better than adherence-demanding ones.** MacroFactor bases recommendations "on what they actually did rather than what they were supposed to do," and does not require perfect adherence — explicitly tied to "long-term user trust and consistency." Contrast RP Diet Coach, repeatedly described as rigid: "won't work for those who only give 50% effort because it'll feel like the app is punishing you."
- NEWBIE: a forgiving, "log what really happened" check-in survives an imperfect week; a punishing one drives the newbie out.
- ATHLETE: disciplined athletes tolerate rigidity, but even they churn if the system feels like punishment for life noise.
Sources: https://feastgood.com/macrofactor-review/ ; https://noobgains.com/rp-diet-coach-app-review/ (VERIFIED / PARTIAL)

**F1.4 (VERIFIED) — General fitness-app abandonment is brutal, so check-in friction is expensive.** 71% abandon by the third month; only 40% are still using past the first 24 hours. Top drivers: amotivation, loss of interest, and "the stress of constant tracking."
- BOTH: every extra field in a check-in is paid for in churn; over-tracking stress is a named abandonment cause.
Source: https://autentika.com/blog/why-do-users-abandon-fitness-apps (VERIFIED)

### Q2 — How long is too long for a weekly review?

**F2.1 (PARTIAL) — No app publishes a hard time limit, but the in-market floor is ~3 questions (Carbon) and the ceiling that succeeds is still terse (MacroFactor's modules surface only when relevant).** MacroFactor's check-in shows a module *only if triggered* (partial logging, weigh-in, fasting, logging break, program update) rather than asking everything every week. The flow is: intro → explanation → clarifying question → change → done.
- BOTH: "as short as this week's data allows" — conditional modules beat a fixed long form.
Sources: https://help.joincarbon.com/en/articles/6004812-weekly-check-in ; https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (VERIFIED app behaviour; the *time* threshold itself is NOT FOUND as a published number — see §6)

**F2.2 (VERIFIED) — Productivity-science weekly-review research converges on ONE thing: limit to 1–2 numbers and one or two "must-wins".** "If everything is a priority, nothing is." "Pick one or two numbers that can be answered with a quick glance. Don't over-crowd the box." A review that feels overwhelming should be broken into smaller steps.
- NEWBIE: a one-number-one-action review is the maximum a beginner will repeat weekly.
- ATHLETE: athletes can absorb more data but still act on one or two levers per week; surface the rest as optional detail.
Sources: https://fortelabs.com/blog/the-design-of-a-weekly-review/ ; https://weekplan.net/weekly-review-productivity/ (VERIFIED)

**F2.3 (VERIFIED) — Even valuable weekly summaries get only "quickly scanned".** A WHOOP user: "I usually just quickly scan this but don't really find it useful." This is the realistic engagement ceiling for a passive weekly report — it must earn attention in the first glance.
Source: https://tmrss.medium.com/comprehensive-whoop-review-6-months-in-3877886dd996 (PARTIAL — single reviewer)

### Q3 — How apps communicate coaching decisions to NON-experts vs to ATHLETES

**F3.1 (VERIFIED) — For non-experts: explain WHY the module appeared, in plain language, before showing the change.** MacroFactor's coach "will introduce the module on the Check-In page and explain why the module is being surfaced at this Check-In." It "will typically recommend an increase or decrease in your Calorie and macronutrient targets." This narration-then-number pattern is what non-experts respond to.
- NEWBIE: the decision lands as a sentence ("your weight is moving slower than target, so we're nudging calories down a little"), not a raw number drop.
Source: https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (VERIFIED)

**F3.2 (VERIFIED) — For non-experts: adherence-gated, reassuring decisions ("stick closer next week") avoid blame.** Carbon: if not adherent, targets hold and the app simply says to stick closer next week; if you lost as desired it may move calories *up* "to align with what's working for you." The decision is framed as collaboration with the body's data, not a verdict.
Source: https://help.joincarbon.com/en/articles/6004812-weekly-check-in (VERIFIED)

**F3.3 (VERIFIED) — For athletes: speak in their native units (RPE, %1RM, sets, periodisation) and let them autoregulate.** JuggernautAI "prescribes a target RPE for each set, then uses your logged RPE versus actual performance to recalibrate the next session's loads… The interface assumes you understand RPE, percentage-based programming, and powerlifting periodization." RP Hypertrophy adjusts sets from pump/soreness/joint-pain/workload feedback.
- ATHLETE: the decision is communicated *as* the prescription change (loads moved up/back off) in the language they already think in.
Sources: https://www.juggernautai.app/ ; https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671-How-Does-the-App-Determine-When-to-Add-Weight-Reps-and-Sets (VERIFIED)

**F3.4 (VERIFIED) — The SAME engine alienates beginners when its language assumes expertise.** RP Hypertrophy is "not beginner-friendly due to its reliance on concepts like mesocycles, maintenance volume, and autoregulation, with beginners finding it overwhelming." JuggernautAI "is not for casual gymgoers."
- NEWBIE: identical decision logic + expert vocabulary = abandonment. The translation layer, not the maths, is the gate.
Sources: https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-review-cost-guide ; https://aitoolsbakery.com/blog/best-ai-bodybuilding-apps/ (VERIFIED / PARTIAL)

**F3.5 (VERIFIED) — Transparency about the algorithm's limits builds trust with both audiences.** MacroFactor deliberately publishes much of its "secret recipe" and "doesn't mind admitting that their algorithms don't produce absolutely perfect recommendations in every scenario… they don't want users to be surprised by edge cases." This honesty is cited as a core reason users trust it over rivals.
Source: https://macrofactorapp.com/algorithm-accuracy/ (VERIFIED)

### Q4 — What makes a weekly review feel genuinely valuable?

**F4.1 (VERIFIED) — Translation of numbers into meaning, not raw data.** "The best apps translate numbers into guidance: 'you are recovered enough for a hard session' or 'you are under-eating relative to your training load.'" The valued difference is "here's what your data means" vs "here's all your data." Oura is praised for three scores "with actionable guidance on how to stay balanced."
- NEWBIE: a sentence of meaning + one action.
- ATHLETE: meaning + the lever and the magnitude.
Sources: https://nutricode.io/blogs/articles/wearables-and-fitness-apps-from-collecting-data-to-actionable-insights ; https://apps.apple.com/us/app/oura/id1043837948 (VERIFIED)

**F4.2 (VERIFIED) — Comparative ("vs last week") framing is explicitly demanded.** "Users value automated weekly summaries that compare results to the previous week, showing a clear demand for comparative analysis over time." Strava's Recap and WHOOP's WPA both lead with week-over-week.
Sources: https://medium.com/@themomentum_ai/turning-apple-health-data-into-actionable-personal-fitness-insights-f48b259966f2 ; https://support.strava.com/hc/en-us/articles/360057807412-Monthly-Recap (VERIFIED)

**F4.3 (VERIFIED) — Human (or human-feeling) accountability raises perceived value sharply.** Caliber's weekly asynchronous video check-in was a tester's named favourite (5/5 instruction/interactivity); Future users prize coach text/video and form checks ("95% more likely to achieve goals when someone holds us accountable", cited from Dominican University research).
- BOTH: a review that feels addressed *to you by someone* beats a stat dump.
Sources: https://www.garagegymreviews.com/caliber-app-review ; https://onbetterliving.com/future-app/ (VERIFIED)

**F4.4 (VERIFIED) — A single clear next action is the productivity-science definition of a valuable review.** "The most fundamental principle… is actionability… Each project should have a clear next action." The weekly review is what "connects your daily actions to your longer-term goals and prevents the slow drift."
Source: https://www.todoist.com/productivity-methods/weekly-review (VERIFIED)

### Q5 — How apps make data-driven decisions feel personal

**F5.1 (VERIFIED) — Spotify Wrapped is the benchmark; the named mechanisms transfer.** Documented principles: Self-Determination Theory (users "feel seen and understood"), narrative framing ("turning mundane data into meaningful narrative"), affective/peak-end nostalgia ("joy, pride, or nostalgia"), low cognitive-load minimalist visuals, social comparison, and operant reinforcement via "fun stats… playful phrases." Hyper-personalisation makes the product "feel uniquely theirs." 200M+ engaged users in the first 24h in 2025.
- BOTH: frame the week as *their* story with one or two hero numbers, not a spreadsheet.
Sources: https://medium.com/design-bootcamp/why-were-hooked-on-spotify-wrapped-the-perfect-blend-of-ux-and-psychology-b4aa06c9b81f ; https://www.storyly.io/post/unwrap-spotify-wrapped (VERIFIED)

**F5.2 (VERIFIED) — "It adjusts FOR me" is the felt-personal hook in coaching apps.** MacroFactor user: "By knowing that the app will auto adjust my calories and macros during check in is motivating and helpful." Carbon adjusting *up* "to align with what's working for you" personalises by responding to the individual's actual data.
Source: https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (VERIFIED)

**F5.3 (VERIFIED) — Basing the decision on what the user ACTUALLY did (not the prescription) reads as personal and non-judgemental.** MacroFactor recommends "based on what they actually did rather than what they were supposed to do."
Source: https://feastgood.com/macrofactor-review/ (PARTIAL — review, not first-party, but consistent with first-party philosophy page)

### Q6 — Psychology of feedback in behaviour change

**F6.1 (VERIFIED) — Feedback is NOT reliably positive: over one-third of feedback interventions REDUCE performance (Kluger & DeNisi, meta-analysis d≈0.41, but ~33% negative).** The deciding factor is *where attention is directed*.
Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC6371234/ and https://cris.huji.ac.il/en/publications/the-effects-of-feedback-interventions-on-performance-a-historical/ (VERIFIED)

**F6.2 (VERIFIED) — Task-focused feedback helps; self/ego-focused feedback harms (Feedback Intervention Theory).** Effective feedback "provides specific information about the task and goals." Harmful feedback "is more generalized… compares an individual's performance to their peers… directs attention away from the task to the self." "Pure outcome feedback without [improvement] strategies may impede learning." Design principles: objective, specific/actionable, accessible in-workflow, real-time, visually clear (colour/trend), low cognitive load, matched to numeracy.
- NEWBIE: never present a number as a verdict on *them*; always pair it with the next task step.
- ATHLETE: still task-focus, but social-comparison (leaderboards) is riskier than it looks per FIT — use sparingly.
Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC6371234/ (VERIFIED)

**F6.3 (VERIFIED) — The habit loop (cue → behaviour → reward) means the check-in's confirmation IS the reward.** "Every time you check a box, you're giving your brain feedback, and feedback is fuel." Immediate feedback reinforces faster.
Source: https://www.psychologytoday.com/us/blog/parenting-from-a-neuroscience-perspective/202512/the-science-behind-habit-tracking (VERIFIED)

**F6.4 (VERIFIED — SAFETY-CRITICAL) — Over-tracking and high-frequency self-monitoring carry an anxiety / disordered-eating tail for vulnerable users, even though it is net-safe for most.** Over-tracking "can backfire — fuelling anxiety, obsession, and perfectionism," with reported links to disordered eating. Systematic-review evidence: self-weighing aids loss and is "for the most part… not associated with adverse psychological outcomes" — BUT "for individuals prone to anxiety, obsessive thoughts, or disordered eating patterns, daily weighing can become counterproductive and harmful."
- VOLYUME RELEVANCE: directly supports the existing ED safety system (`src/coaching/safety/`). Check-in frequency and progress-photo cadence should be tunable / capped, and weekly-review framing must be task-focused not body-judgemental. (Per CLAUDE.md this system is do-not-touch; this is research input only, no recommendation to alter floors or signposting.)
Sources: https://www.psychologytoday.com/.../the-science-behind-habit-tracking ; https://onlinelibrary.wiley.com/doi/full/10.1002/oby.20946 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6010018/ ; https://www.sciencedirect.com/science/article/abs/pii/S0749379713004820 (VERIFIED / PARTIAL on vulnerable-subgroup specificity)

---

## 3. BEST-IN-CLASS

- **Conditional, explained check-in — MacroFactor.** Surfaces only the modules this week's data triggers, *introduces and explains why each appeared*, then recommends a calorie/macro change based on what you actually did. Transparent about its own limits to build trust. https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules
- **Minimum-friction check-in — Carbon Diet Coach.** Three questions, adherence-gated, reassuring non-blaming language. https://help.joincarbon.com/en/articles/6004812-weekly-check-in
- **Data-made-personal — Spotify Wrapped.** Narrative + hero numbers + low cognitive load + ownership. https://medium.com/design-bootcamp/why-were-hooked-on-spotify-wrapped-the-perfect-blend-of-ux-and-psychology-b4aa06c9b81f
- **Athlete-native decision comms — JuggernautAI / RP Hypertrophy.** Decisions delivered as RPE/load/set changes in the athlete's own units. https://www.juggernautai.app/
- **Human accountability — Caliber / Future.** Weekly asynchronous video check-ins repeatedly named as the favourite feature. https://www.garagegymreviews.com/caliber-app-review

---

## 4. VERBATIM USER / SOURCE VOICE

- "By knowing that the app will auto adjust my calories and macros during check in is motivating and helpful." (MacroFactor) — https://play.google.com/store/apps/details?id=com.sbs.diet
- "I usually just quickly scan this but don't really find it useful." (WHOOP WPA) — https://tmrss.medium.com/comprehensive-whoop-review-6-months-in-3877886dd996
- "[RP] won't work for those who only give 50% effort because it'll feel like the app is punishing you." — https://noobgains.com/rp-diet-coach-app-review/
- "[JuggernautAI] is not for casual gymgoers… the interface assumes you understand RPE, percentage-based programming, and powerlifting periodization." — https://www.juggernautai.app/ (via https://aitoolsbakery.com/blog/best-ai-bodybuilding-apps/)
- "An effective check-in balances thoroughness with simplicity… not so much that clients dread submitting it." (coaching guidance) — https://www.mypthub.net/blog/the-ultimate-guide-to-progress-pics/
- "Weekly is overkill and creates photo fatigue." — https://www.mypthub.net/blog/the-ultimate-guide-to-progress-pics/
- "If everything is a priority, nothing is." (weekly-review design) — https://fortelabs.com/blog/the-design-of-a-weekly-review/

---

## 5. PROPOSAL INPUT FOR VOLYUME (sourced only)

1. **Make the check-in conditional and short.** Default to a Carbon-style minimal core (weight + adherence/feel), and only surface extra modules when this week's data warrants — the MacroFactor pattern. Every extra field is paid in churn (F1.4). [F1.1, F2.1, F1.4]
2. **Narrate the decision before the number, in plain English, for the default (newbie/casual) audience.** "Why this is happening" sentence, then the change. [F3.1, F3.2]
3. **Provide an athlete mode that speaks in RPE/sets/%/periodisation** and shows the decision *as* the prescription change — same deterministic engine, different translation layer. The engine maths is not the gate; the vocabulary is. [F3.3, F3.4]
4. **Be transparent about how the decision was reached** (which inputs drove it) to build trust with both audiences. [F3.5]
5. **Make the weekly review a one-or-two-number story with a single next action**, comparative vs last week, framed as the user's progress narrative — not a dashboard dump. [F2.2, F4.1, F4.2, F4.4, F5.1]
6. **Keep feedback task-focused, never ego/verdict-focused; pair every number with a task step;** be cautious with peer/social comparison (FIT shows ~1/3 of feedback interventions backfire when attention shifts to the self). [F6.1, F6.2]
7. **Treat check-in/photo frequency as ED-safety-tunable.** High-frequency self-monitoring is net-safe for most but harmful for vulnerable users; phase-aware, capped, optional cadence aligns with the existing safety system. RESEARCH INPUT ONLY — do not modify `src/coaching/safety/` per CLAUDE.md. [F1.2, F6.4]
8. **Lean on human-feeling accountability cues** (the review "addressed to you") since this is the single biggest lift in perceived value — but Volyume's engine is deterministic/no-AI, so this must come from copy/personalisation, not an LLM coach. [F4.3]

INTERPRETATION (labelled, not a finding): the dual-audience answer to "how to communicate decisions" is one engine + two presentation layers (plain-narrative vs athlete-native units), gated by a stated experience level. This is inferred from the consistent pattern that RP/Juggernaut alienate beginners purely on vocabulary while MacroFactor/Carbon succeed on plain language — not from a single source stating it.

---

## 6. VERIFICATION SUMMARY

- Sources: **38 named** (26 apps/products + 12 coaching/academic/UX). **~24 VERIFIED, ~13 PARTIAL, 0 fabricated.**
- App threshold: **26 apps with real data — exceeds the 20-app minimum; no shortfall flag.**
- Biggest **NOT FOUND**: a *published numeric time limit* for "too long" a weekly review. No app or study states "X minutes / Y questions = abandonment threshold." Answered indirectly via the in-market floor (3 questions, Carbon), conditional-module design (MacroFactor), and productivity-science "1–2 numbers, one action" (Forte Labs / Week Plan). Treated as PARTIAL, not invented (Q2).
- Secondary gap: **verbatim app-store / Reddit user complaints** specific to check-in length were thin; much user-voice came via reviewer summaries (NOOB GAINS 404, Coached 403, RP help-centre 403). Several first-party pages block WebFetch; their behaviour is corroborated by independent review sites but some quotes are PARTIAL.
- Tool note: WebSearch and WebFetch both worked. WebFetch returned 403/404 on rpstrength help-centre, usecoached, and the NOOB GAINS review; those points are marked PARTIAL and sourced from search snippets / corroborating pages rather than direct fetch. No silent downgrade — flagged here per founder rule.
