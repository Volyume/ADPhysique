# 04 — Alternative plan market research

Authority: founder brief 2026-09-05, Parts XI–XIV, XVI–XVIII. Research date 2026-09-05 (WebSearch/WebFetch). Every claim carries a source URL; where a page could not be verified live (403/402/parse failure), that is flagged rather than asserted. Cardio logging is out of scope; timer apps appear only as reference for timed-station mechanics.

## Method / honesty flags
- Fitbod's, Strong's and Kettlebell Kings' help-centre pages returned HTTP 403 on direct fetch; content for those is reconstructed from search-engine snippets of the same pages or from fetchable sibling blog pages — marked **[snippet]**.
- No official "Kettlebell Kings" mobile app exists in App Store/Play Store search results; their "workout plans" page is a paid PDF/web commerce page that returned HTTP 402 on fetch — its structure is **unverifiable live**.
- The ACSM 2009 position-stand PDF would not parse as text (binary layout); its circuit figures below are **[secondary]** characterisations, not a confirmed primary quote. Ramos-Campo 2021 (Section 4) is fully verified from its own full text and is the strongest circuit citation here.
- The reachable summary of the 2026 ACSM update does not differentiate circuit vs traditional prescription — flagged **not found**, not "ACSM says they're equivalent."

---

## 1. Matrix — plan style × product

Legend: **Cat** = programme category, **Filt** = equipment filter,
**Style** = training-style toggle, **Log** = manual logger, no auto-generation.

| Style | Fitbod | Hevy | JEFIT | Boostcamp | Caliber | Alpha Progression | Strong |
|---|---|---|---|---|---|---|---|
| Kettlebell | Filt¹ | Filt+library² | Filt+Cat³ | Folded into "Dumbbells Only"; named coach **Cat** "Rock The Bells"⁴ | Filt⁵, no KB category | Filt via per-"Gym" inventory⁶ | Log only⁷ |
| Circuit | Style toggle⁸ | Style (Superset ≥3)⁹ | Style + interval timers¹⁰ | Rides inside coach programmes, no filter | Not found | Weak fit, reviewer-reported¹¹ | Style (Superset ≥3, informal)¹² |
| Dumbbell-only | Filt | Cat | Filt | Cat (1 of 4 equipment tiers) | Filt | Filt | Log only |
| Bodyweight | Filt | Cat | Filt | Cat (a training *goal*, not just equipment) | Filt, explicit bodyweight-only | Filt | Log only |
| Resistance-band | Filt | Cat "Band"/"Suspension Band" | Filt | Not found as a tier | Not found | Not found | Log only |
| Home/minimal | Filt | Cat "At home" | Filt | Cat "Garage Gym" | Filt | Filt | Log only |
| Travel | Not found | Cat "Travel" (circuit-style per other sources) | Not found | Not found | Not found | Not found | Log only |
| Machine-only | Filt | Cat "Gym" | Filt | Cat "Full Gym" | Filt | Filt | Log only |

Sources (fetched/searched 2026-09-05): 1 fitbod.me/blog/what-fitness-app-is-best-for-you-how-fitbod-adapts-to-any-fitness-level-goal-or-gym-setup/
2 hevyapp.com/features/exercise-library/ 3 jefit.com/routines/workout-routine-database.php?id=24286
4 boostcamp.app/program-selector, boostcamp.app/coaches/rebecca-rouse/kb-beginner-program
5 barbend.com/caliber-fitness-app-review/ 6 hotelgyms.com/blog/how-to-use-alpha-progression
7 help.strongapp.io (no equipment-driven programming found for Strong in any source)
8 fitbod.me/blog/supersets-vs-circuits/ (help.fitbod.me equivalent 403 **[snippet]**)
9 hevyapp.com/features/what-are-supersets/ (help centre circuits article 403 **[snippet]**)
10 jefit.com/product-tips-faq/how-to-create-custom-workout-plans/
11 fitnessdrum.com/alpha-progression-app-review/
12 help.strongapp.io/article/98-supersets-and-circuits **[snippet]**

---

## 2. Per-product detail

**Fitbod.** Setup: itemised equipment owned, goal, experience, session time (fitbod.me blog, above). Progression is autoregulated: a 0–100% "muscle recovery" score per muscle group, built from logged sets×reps×weight with a 48–72h decay, steers which muscles get volume next (fitbod.me/blog/muscle-recovery/, /fitbod-algorithm/). Circuits are an on/off "Training Format" toggle, reps-based (fitbod.me/blog/supersets-vs-circuits/). Rest timer auto-starts per set, syncs to watch haptics (fitbod.me/blog/how-long-should-you-rest-between-sets/). Kettlebell ballistic gating: exercise pages carry prose cautions (snatch page: master swing/clean first) but this is editorial copy, not a confirmed mechanical gate on what the generator can select for a self-declared beginner — **unverified**, flag as inference (fitbod.me/exercises/kettlebell-snatch). Equipment list is a confirmed hard filter on the generation pool.

**Hevy.** Filters: experience, goal, equipment (help.hevyapp.com library article). Routines are user/coach templates in Folders or the built-in 25+ programme library (hevyapp.com/features/gym-routines/, /gym-workout-routines/). Circuits = Superset primitive extended to 3+ exercises; Smart Superset Scrolling auto-advances on set completion (hevyapp.com/features/what-are-supersets/). No native timed-station (EMOM/AMRAP) mode found. "Previous" column shows prior set-by-set values for every exercise regardless of superset membership; weekly sets-per-muscle-group is the volume metric (hevyapp.com/features/track-exercises/, /sets-per-muscle-group-per-week/). **Not found:** any statement that circuit sets are excluded from that volume count either way. Fully user-editable.

**JEFIT.** Adaptive Plan setup: goal, level, days/week, equipment, injuries → generated mesocycle (jefit.com blog). 1,400+ exercise library tagged by muscle/equipment, incl. a dedicated kettlebell routine in the public routine DB. Supersets plus custom rest timer/stopwatch/countdown per exercise; "instant workout" builds from time+equipment+muscle focus (jefit.com/product-tips-faq/…). No documented load-progression algorithm and no evidence of ballistic-movement gating.

**Boostcamp.** Programme Selector is a strict sequential filter: Goal (Muscle/Strength/Women's/Athletics/Bodyweight Fitness) → Experience (Beginner/Novice/Intermediate/Advanced) → Equipment (Full Gym/Garage Gym/Dumbbells Only/At Home) → Frequency (2–6 days) (boostcamp.app/program-selector). No dedicated kettlebell filter — KB work sits inside "Dumbbells Only" plus named coach programmes. Confirmed programme: **"Rock The Bells"** (coach Rebecca Rouse) — 6 weeks, 3 days/week (Mon/Wed/Fri), ~45 min/session, mixes single- and double-kettlebell work. Structure: warm-up → strength supersets (2–3 sets × 6–8 reps, RPE tags like "@4"/"@6") → core as timed sets (4 × 20–30s). Progression: "auto-progression between sessions based on what you actually lifted," in a 2-baseline-weeks + 1-challenge-week repeating cycle (boostcamp.app/coaches/rebecca-rouse/kb-beginner-program) — the single most concrete kettlebell *product* programme found. 11,000+ unvetted community programmes exist alongside the 130+ coach ones.

**Caliber.** Equipment-availability question gates the exercise pool; supports pure bodyweight generation with zero equipment (barbend.com/caliber-fitness-app-review/). 500–800 exercises; 60–120+ coach-designed plans behind paid tiers, personalised to goal/experience/schedule. No dedicated circuit mode or kettlebell category found — reads as a straight-set strength/hypertrophy product with human-coach customisation.

**Alpha Progression.** Closest analogue to an owned-equipment model: users create named "Gyms," each with its own equipment + available weights; the *active* Gym drives the exercise pool, generator, and recommended loads (hotelgyms.com/blog/how-to-use-alpha-progression) — worth flagging to the lead, since it separates "equipment I own" from "equipment available at this session's location," which a flat equipment-owned list can't express. Progression: per-set RIR tracking feeding next-session targets, plus volume/progression graphs. Circuits: reviewer-reported weak fit ("isn't going to feel as intuitive to use"), optimised for straight sets (fitnessdrum.com/alpha-progression-app-review/) — a UX gap, not a documented exclusion policy.

**Strong.** Manual logger, not equipment-driven — no onboarding equipment inventory or auto-programming found. Superset = "group exercises… perform in parallel," 3+ informally called a Circuit, same mechanic, creation flow still differs iOS vs Android (help.strongapp.io/article/98… **[snippet]**). Default rest timer 2:00, auto-starts, per-exercise override (help.strongapp.io/article/231-rest-timer). **Not found:** how circuit-grouped sets are treated in history/progression views vs straight sets.

**Kettlebell-specific / circuit-reference apps.** StrongFirst App (strongfirst.com/training-app/): 25+ weeks of programming, 120+ video library, 7-day trial, ships "Simple & Sinister 2.0 — Timeless Simple" — the most credible dedicated kettlebell-methodology product found. No "Kettlebell Kings" mobile app was found (see flags above); other generic kettlebell apps (Kettlebell Training App, Kettlebell Home Workout, Lyfta, kettlebell.monster) surfaced in search but were not deep-dived — low-confidence, unverified in this pass. Seconds/SmartWOD/Simple EMOM Timer: pure timers supporting HIIT/Tabata/EMOM/AMRAP/rounds, no exercise library or progression model — cited only for "rounds = stations, work period = time per station" mechanics, per the brief's scope note.

---

## 3. Kettlebell — programming synthesis

**Ballistic gating (swing → clean/snatch)** comes from coaching sources, not from any app surveyed (none was found to enforce it mechanically):
- RKC/Dan John lineage: spend "at least a month" building competence in two-hand swing, front squat, press and get-up before one-arm swings; clean and snatch come "only after thousands of swings" and demonstrated fluency — a competence gate, not a calendar one (kettlebellfitness.com/2016/08/a-sensible-approach-to-rkc-prep/, breakingmuscle.com/the-wonderful-awful-rkc-snatch-test/). RKC's "Big Six": Swing, Get-up, Clean, Squat, Press, Snatch (strongandfit.com/blogs/news/russian-kettlebell-challenge).
- StrongFirst: the snatch is "essentially a swing that ends up overhead"; cited research found similar mechanical output between the two-hand swing and snatch, supporting interchangeable ballistic use once swing technique is solid (strongfirst.com/swing-versus-snatch/).
- Fitbod's exercise-page copy echoes this order informally but is not confirmed enforced by the generator (see Section 2).

**Single vs double bell.** Simple & Sinister is explicitly single-bell by design (strongfirst.com/kettlebell-simple-sinister-reviews/). General guidance (search-consensus, not a peer-reviewed claim): beginners start with one moderate bell for swings/goblet squats plus a lighter bell for presses; double-bell work follows once a *matched pair* is available. Boostcamp's "Rock The Bells" mixes single- and double-bell movements within one plan — the clearest product evidence that bell count varies by movement/week rather than committing a whole plan to one.

**Available-weight handling.** Alpha Progression's per-Gym equipment+weights model is the strongest example found of expressing "what loads can this movement use" beyond a flat equipment checkbox.

**Templates found:**
- **Minimal, single bell, 2 movements — Simple & Sinister:** 100 one-arm swings (10×10, one set of 10 every 30s for 5 min, switching arms each set) + 10 get-ups (1/min for 10 min), 6 days/week, 25–30 min/session. "Simple" standard: 100 one-arm swings/5min + 10 get-ups/10min at 32kg (men)/24kg swing+16kg get-up (women) (strongfirst.com/kettlebell-simple-sinister-reviews/). Progression: documented **step-loading** to the next bell size once standard is met, then **waved volume** for advanced trainees pushing toward "Sinister" (strongfirst.com/simple-sinister-progression-tactic/, /from-simple-to-sinister/).
- **3-day full body, mixed single/double — Boostcamp "Rock The Bells"** (structure above): superset + timed-core hybrid, 6 weeks.
- **RKC-style full-body rotations:** built on the Big Six, typically 2–4 days/week, progressing swing volume/one-arm competence before clean/snatch (kettlebellfitness.com "RKC Big Six Workout").
- **Autoregulated volume-first — Dan John "Easy Strength"/40 Day:** a 5-lift full-body template (hinge, upper push, upper pull, a ballistic move — swing or snatch, core/specialty) run daily up to 40 sessions at a fixed "always easy" load, increased only when it stops feeling hard; KB reps kept 15–25; weekly volume from up to 10 sets of a lift across the week, not single-session overload (t-nation.com/t/easy-strength-40-day-routine-dan-john-program/181158). A genuinely different progression *philosophy* — "still feels easy," not RIR or %1RM — worth the lead's attention as a distinct pattern.
- **Complexes:** referenced in passing across sources; no single credible worked example with sets/reps/rest was found — flag for a follow-up pass if in scope.

**Beginner vs experienced, synthesised:** a beginner programme is single-bell, 2–3 movements, technique-gated (swing/get-up mastered before ballistic overhead work), near-daily short sessions, progressing by a step-loading rule tied to a performance standard, not a calendar. An experienced programme adds clean/snatch, may add a matched second bell, waves volume across the week, and carries more movement variety per session without the same per-session technique gate.

---

## 4. Circuits — mechanics and evidence

**Round → A → B → C → round rest → repeat.** Every product surveyed (Fitbod, Hevy, JEFIT, Strong) implements this via one **grouping primitive** — a superset — rather than a purpose-built circuit object with its own round-count/round-rest fields; a 2-exercise group is a superset, the same primitive at 3+ is what docs call a "circuit." Round rest, where used, is just the rest timer on the group's last exercise.
**No product exposed a native timed-station (EMOM/AMRAP) mode** in its main logging flow — that exists only in pure-timer apps (Seconds, SmartWOD, Simple EMOM Timer), confirming these are a different product category from set/rep loggers.

**Reps vs time per station.** Fitbod, Hevy and Strong are reps-based by default (time can be typed into a reps field as a workaround, not a first-class mode). JEFIT is the only one with an explicit per-exercise custom rest/stopwatch/countdown, closer to genuine timed-station capability but still bolted onto a reps/sets model.

**Load handling.** All assign load per exercise as normal — a circuit's "weight" is just each station's own field, not a per-round value.

**Completion / previous performance.** Only Hevy has documented specifics: its "Previous" column shows prior values for every exercise regardless of superset/circuit membership. **No product was found to explicitly exclude circuit sets from volume/progression tracking** — not documented either way for Hevy, JEFIT or Strong. Alpha Progression is the closest to an exclusion, but only as a reviewer-reported UX gap, not a stated training-science or product policy.

**Evidence-based prescription:**
- **Ramos-Campo DJ, et al., "Effects of Resistance Circuit-Based Training on Body Composition, Strength and Cardiorespiratory Fitness: A Systematic Review and Meta-Analysis," Biology (Basel) 2021;10(5):377** (pmc.ncbi.nlm.nih.gov/articles/PMC8145598/, full text verified 2026-09-05). Intensity bands: low <60% 1RM, moderate 60–80%, high >80%; reps 12–15 at lower intensity, 6–12 at higher; 2–3 sets; 6–10 exercises/session; rest **between exercises** very short (~10–30s, largest fat-mass effects at the low end); 3 sessions/week gave the greatest effects; programmes reviewed spanned 4–28 weeks, >20 total sessions performed better; session length 20–60 min. Outcomes: fat mass ↓4.3%, muscle mass ↑1.9%, bench 1RM ↑~20%, leg-press 1RM ↑~23%, VO₂max ↑6.3%. Strongest, fully-verified circuit citation available.
- **NSCA-derived guidance [secondary]** (via ptpioneer.com "NSCA-CPT Chapter 15," not the primary NSCA text): a traditional circuit is commonly described as 10–15 exercises at 12–15 reps, 40–60% 1RM, ~30–40s work per station with 15–30s rest between stations, 1–3 rounds, ~30-minute session.
- **ACSM Position Stand 2009** (Kraemer/Ratamess et al., Med Sci Sports Exerc 41(3):687–708): general rest-interval guidance of 1–2 min for lower-rep/higher-load sets found via secondary sources; its own circuit-training text could not be extracted (PDF parse failure) — no primary quote asserted.
- **ACSM 2026 update** (Med Sci Sports Exerc, published April 2026, announced 2026-03-17; 137 systematic reviews, >30,000 participants, acsm.org/resistance-training-guidelines-update-2026/): nontraditional modalities (bands, bodyweight) called "highly effective"; general targets strength ~80% 1RM ×2–3 sets, hypertrophy ~10 sets/muscle/week, power 30–70% 1RM explosive — reachable summary did **not** contrast circuit vs traditional format, so none is asserted.

No source found an app or recognised body stating circuits should be excluded from volume/progression tracking.

---

## 5. Programme library organisation

**Hevy** is the clearest example (hevyapp.com/features/gym-workout-routines/), layering three independent facets over 25+ built-in programmes: Experience (Beginner/Intermediate/Advanced, 8/10/8 programmes), Goal (Muscle gain/Strength/Weight loss), and an 8-category equipment/style browse grouping: "At home, Travel, Dumbbells Only, Band, Cardio & HIIT, Gym, Bodyweight, and Suspension Band" (4–8 routines each). "Travel" sits as a *context* label, not an equipment tier — closer to "where you are" than "what you own," and other sources describe Hevy's travel routines as circuit-style.

**Boostcamp** uses a strict sequential filter instead of independent facets: Goal → Experience → Equipment (4 coarser buckets: Full Gym, Garage Gym, Dumbbells Only, At Home) → Frequency; kettlebell content is folded into "Dumbbells Only" rather than broken out.

**JEFIT** organises primarily by muscle group and equipment, with goal/level/days handled at custom-plan-creation time rather than as library browse facets.

**Caliber** filters its coach-plan library by goal/experience/schedule, and separately filters the exercise library by equipment type including a bodyweight-only option.

**Pattern worth naming to the lead:** every scheme found separates "what equipment do I have" from "what style of session is this" — none merge kettlebell into a flat equipment facet without also giving it (or its bucket) a place in the goal/style browse surface. That argues against building Volyume's kettlebell/circuit support as a pure equipment tag with no plan-style/category surface of its own.

---

## 6. Progression — best-in-class summary

**Kettlebell:** strongest model is StrongFirst's step-loading + waved-volume tied to a measurable performance standard (Section 3), not a fixed %1RM/RIR scheme. Strongest *product* statement: Boostcamp's Rock The Bells, "auto-progression between sessions based on what you actually lifted," inside a 2-baseline + 1-challenge repeating cycle.

**Circuit:** no product surveyed has a circuit-specific progression model distinct from its normal set/rep progression — circuits inherit whatever logic the product already applies to straight sets. The literature (Ramos-Campo 2021) progresses circuits by moving intensity bands (low→moderate→high %1RM) and/or adding total sessions, matching product behaviour rather than exposing a gap.

---

## 7. What NOT to copy

- **Calorie-burn dashboards for resistance/HIIT.** Independent sources note app calorie estimates rely on MET tables and are "less reliable" for resistance/HIIT than steady-state cardio — rough journaling approximations, not measurements (glptrackr.com/pages/fitness-app-calories-burned). Conflicts directly with Volyume's ED-safety/calm-voice constraints — do not add an "estimated calories burned" figure to any kettlebell/circuit screen.
- **HIIT/CrossFit-style leaderboards or "For Time" competitive scoring** from the timer-app category — gamifies intensity/competition against Volyume's shame-free coaching voice, and is out of scope per the founder brief's cardio exclusion.
- **Medical/safety claims language.** No product reviewed made a specific medical claim beyond generic "consult a professional" wording; none of it should be imported — Volyume's own ED-safety system (CLAUDE.md Section 2) governs this ground and takes precedence.
- **Treating kettlebell ballistics as ungated.** JEFIT and Caliber showed no technique/experience gate on swing→clean→snatch — a gap in those products, not a pattern to copy. Recognised coaching sources (Section 3) are unanimous this should be gated by demonstrated competence, not open exercise selection.

---

## 8. Unverifiable / needs follow-up

- Kettlebell Kings' actual programme structure (plans page paywalled at HTTP 402; no mobile app found).
- Whether Fitbod's generator mechanically enforces swing-before-snatch ordering, or that's only exercise-page copy.
- Whether Hevy, JEFIT or Strong include/exclude circuit-grouped sets from muscle-group volume/progression stats — undocumented either way.
- ACSM 2009's own circuit-training text (PDF would not parse) — only secondary characterisations cited above.
- Whether the full 2026 ACSM update (Med Sci Sports Exerc, April 2026 issue) contains circuit-specific guidance beyond its public summary — full article not reached.
- Worked kettlebell "complex" programmes (sets/reps/rest) — referenced in passing only, no credible full example found.

