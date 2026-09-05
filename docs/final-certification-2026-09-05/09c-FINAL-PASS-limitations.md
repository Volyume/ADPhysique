# 09c — Final adversarial journey walk: Injuries & limitations (E, F, Parts 15 + 43)

Authority: founder brief 2026-09-05 Parts 15, 42 (journeys E and F), 43, 45.
Read-only walk of the CURRENT tree on `claude/volyume-final-certification-w2xds1`
(clean, 865aa54). Context read, not treated as proof: `02-CAPABILITY-CONCEPT.md`,
`07-FINDINGS.md` F-01, decisions register D152. Every string below is quoted
verbatim from source at the cited file:line.

Rename state, verified mechanically: `grep -rin "how you train" src/ --include=*.js`
returns ONE file, `src/__tests__/capabilityVocabulary.d152.guard.test.js` (the guard
itself). No non-test source file — comment or string — still carries the old phrase.

**Verdict: NO stop-ship anomaly found in either journey.** Nine P2 notes below.

---

## PART 15 — DISCOVERABILITY (first-time user, has never heard of the feature)

| Surface | Visible top-level labels | file:line |
|---|---|---|
| **Today** | `Today` header; session hero + `Choose what's next` / `Options`; weight and meal strips; empty states `No active plan yet` / `Your plan has no sessions yet`. One-time card **`Anything Volyume should build your training around?`** (body: "Injuries, pain, long-term conditions or disabilities. Tell Volyume once and it takes them into account when choosing exercises and building your training. Entirely optional, and you can change it any time."), buttons `Set it up` / `No thanks`. Section label **`Injuries & limitations`** appears only once rows exist. | `HomeScreen.js:2219, 2363, 2493, 2533, 2553, 2763`; `HomeHowYouTrainOfferCard.js:29,31,36,37`; gate `HomeScreen.js:328-329` |
| **Train** | `Train` header; active-plan hero; `Plan tools` → **`Injuries & limitations`** (first row, always shown, live sub), `Training blocks`, `Avoided movements · N` (only when N>0), `Adjust training plan`, `Pick from the plan library`, `Create your own`; `Saved workouts` | `PlansScreen.js:1636,1698,1711,1721,1745,71-93,1975` |
| **Nutrition** | `Nutrition` header; day/meal surfaces (`Move to`, `Save as meal`, `Day tools`, `Copy from another day`). Nothing limitation-related. | `DiaryScreen.js:1422,1991,2011,2058,2099` |
| **Progress** | `Progress` header; pillars `Training`, `Body`, `Progress photos`; `Recent sessions`, `This week's volume`, `More stats` → `Consistency`, `Full history`, `Recaps`, `Year of Lifts`, `Partners`. Nothing limitation-related. | `AnalyticsScreen.js:256,279,288,302,355,416,459,466,467,481,507,519` |
| **Coach** | `Your body` → **`Injuries & limitations`** (live sub); `This week` → `Weekly check-in`, `Coaching decision`, `Your week`; `Setup` → `Update goal and phase`, `Nutrition targets`, `Coaching reminders`, `Volume targets`; `Support` → `Partners`; `Safety checks` → `Goal lock`, `Wellbeing check` | `YouScreen.js:510,514,525,537,551,558,568,572,578,584,595,605,609,628,632,638` |
| **Settings** | **`Injuries & limitations`** — "Injuries, pain, long-term conditions or disabilities that affect your training." (FIRST row); `Account`, `Profile`, `Coaching`, `Workout & units`, `Nutrition targets`, `Dietary needs`, `Notifications and reminders`, `Coaching reminders`, `Display and accessibility`, `Home screen widget`, `Your data`, `Privacy and legal`, `Help and about` | `SettingsScreen.js:42-47` then `:49-153` |

### Which label would I tap?

| Scenario | Label I would tap | Predictable from the label alone? |
|---|---|---|
| (1) A bad shoulder | `Injuries & limitations` (Settings row 1, Coach `Your body`, Train `Plan tools` row 1) | YES — "injuries" is the word in my head |
| (2) Limited grip | `Injuries & limitations`; subtitle "…long-term conditions or disabilities that affect your training" catches me if I would not call it an injury | YES |
| (3) Long-term disability affecting exercise choice | `Injuries & limitations` — subtitle names "disabilities" explicitly, so no self-classification is needed at the door | YES |
| (4) Temporary knee problem, two weeks | `Injuries & limitations` — the wizard's WHEN step then asks "Is this long-term, or temporary?" | YES |

Also reachable without hunting: onboarding step 5 is labelled `Injuries & limitations`
(`ProOnboardingScreen.js:95`) with the question "Anything Volyume should build around?"
(`:2393`) and buttons `Yes, let's set that up` / `Skip for now` (`:2407,2417`); the
workout summary carries an onward link `Injuries & limitations`
(`WorkoutSummaryScreen.js:1637-1640`).

### Inverse test — a user wanting to change split, frequency, style or equipment

They tap **`Adjust training plan`** (Train tab): "Change schedule, equipment,
experience, division or weak points. Volyume previews the rebuild before it
replaces your active plan." (`PlansScreen.js:75-76`), which opens `Adjust training`
(`PlanUpdateScreen.js:401`) carrying `Experience`, `Training days per week`,
`Session length`, `Equipment`, `Recovery` (`:475,487,498,507,519`). Rest timers and
units are under `Workout & units`. Nothing in `Injuries & limitations` or its
subtitle names split, frequency, style or equipment, so the pull is one-way.
**PASS both directions.**

---

## PART 43 — COMPREHENSION PROOF

Line source: `src/lib/capability/summary.js:32-73`, run over fixtures via the scratch
probe at `/tmp/claude-0/-home-user-ADPhysique/eb71cbd7-…/scratchpad/__tests__/summaryProbe.test.js`
(outside `src/`, not committed). Output verbatim.

| State | Exact line the person reads | What is this for? | What does the count refer to? | Why would I tap it? | Verdict |
|---|---|---|---|---|---|
| Empty (nothing saved) | `Injuries, pain, long-term conditions or disabilities that affect your training.` | Telling Volyume about an injury/limitation | no count | To add mine | PASS |
| Loading | `Checking.` | It is reading my saved limitations | no count | n/a | PASS |
| Read failed | `Could not check just now.` | It could not read them | no count | To retry / see them | PASS |
| 1 nameable rule | `Leaves out overhead work` | Overhead work is being left out of my training | no count | To change or remove it | PASS |
| 1 nameable, sided | `Leaves out overhead work with your left shoulder` | Same, with the side named | no count | Same | PASS |
| 2 nameable | `Leaves out overhead work and gripping a bar` | Both are left out | no count | Same | PASS |
| 3 rules (count fallback) | `3 injuries or limitations saved. Used when Volyume picks exercises and builds your plan.` | Three saved limitations, and what they are used for | three saved injuries/limitations | To read the three and edit them | PASS |
| 1 rule + 1 allowance | `Leaves out overhead work` | The allowance is not counted as something left out | n/a | Same | PASS |
| Allowance only | `Set up. Nothing is left out.` | The feature is set up; nothing excluded | no count | To add something, or see the allowance | PASS (terse — P2-E5) |
| Episode, dated | `Working around jumping and impact work, until about 19 Sep` | A temporary limitation, and when it ends | no count | To end or extend it | PASS |
| Episode, open-ended | `Working around jumping and impact work, until you end it` | Same; ends only when I say | no count | Same | PASS |
| Episode overdue | `Working around jumping and impact work, still need it?` (attention) | It has run past its date and wants an answer | no count | To answer | PASS |
| Episode, 3+ rules | `Working around a temporary change, until about 19 Sep` | A temporary limitation being worked around until 19 Sep | no count | To see what it covers | PASS, weakest line (P2-F3) |
| Baseline + episode | `Working around jumping and impact work, until about 19 Sep · 2 long-term` | Both a temporary and two long-term limitations | two long-term limitations | To see both | PASS with reservation (P2-E1) |
| Two episodes | `Working around jumping and impact work, until about 19 Sep · 1 more` | One more temporary limitation exists | one further episode | To see the other | PASS |

No line says "things". "Built around N thing(s) you told it" is gone from source and
banned by `src/__tests__/capabilityVocabulary.d152.guard.test.js`. On no line could a
normal person answer "my training style" — every populated line either names a
movement in plain words or says "injuries or limitations". **Part 43: PASS.**

---

## JOURNEY E — STABLE PHYSICAL REQUIREMENT (long-term left shoulder, no overhead)

| Step | What I see, verbatim | file:line |
|---|---|---|
| Find it | Settings row 1 `Injuries & limitations` / "Injuries, pain, long-term conditions or disabilities that affect your training." | `SettingsScreen.js:43-45` |
| Feature home | Title `Injuries & limitations`. "If you have an injury, pain, a long-term condition or a disability, tell Volyume about it here. It takes that into account when it picks exercises and builds your training." + "You do not need a diagnosis, or even a name for it. Just say what you cannot do. Volyume leaves those movements out and trains the same muscle groups another way." CTA `Add something`; hint "Takes about a minute. Whatever you add is either long-term, or a temporary change worked around for a while, and you can change or remove it here any time." | `HowYouTrainScreen.js:1247,1261-1267,1273,1278` |
| Wizard 1 — WHAT | "What is it about?" / "Pick the closest fit. Next, you choose exactly which." Options: `A movement or position` ("Standing work, overhead positions, gripping a bar, and so on."), `A movement pattern`, `A specific exercise`, `An exercise that is always fine for me` | `HowYouTrainAddScreen.js:807,830`; `addFlow.js:68-73` |
| Wizard 2 — WHICH | "Which of these?" / "Pick everything that applies. You never need to say why." Ten checkboxes incl. `Overhead positions`. Plus toggle `A clinician asked for this` — "Only changes how Volyume words things. It never contacts anyone." | `HowYouTrainAddScreen.js:809,833,637-641`; `model.js:59-73` |
| Wizard 3 — SIDE | "Which shoulder?" / "If it is one side, Volyume can still include movements you can do one side at a time. It plans them as normal, and how you work them is up to you." Options `Left shoulder` / `Right shoulder` / `Both shoulders` | `addFlow.js:238-249`; `HowYouTrainAddScreen.js:84,815` |
| Wizard 4 — WHEN | **"Is this long-term, or temporary?"** / "You can change this later. Next: a quick check of everything, then save." Options **`Long-term`** ("Part of your normal training. Full progression and coaching, no special labels.") and **`Temporary, for now`** ("Volyume takes it as a passing change and helps you build back up when it ends.") | `HowYouTrainAddScreen.js:816,833`; `addFlow.js:76-79` |
| Wizard 5 — CHECK | "Check and save" / "Tap Change on anything to go back to it. After you save, if this affects your current plan, Volyume shows you what would change and asks before doing anything." Rows: `A movement or position` = "Overhead work with your left shoulder"; `How long` = `Long-term`; `Side` = `Left shoulder`; `A clinician asked for this` = `No`. Card: "Volyume will build your training around overhead work with your left shoulder from now on." Button `Save`. | `HowYouTrainAddScreen.js:820,836-838,700-708,885`; `addFlow.js:264-336,381-392` |
| Consent (first save) | "One thing first" / "Volyume needs your agreement to keep what you have just chosen." Body: "To build training around your body, Volyume stores what you choose here: … That counts as health information, so it needs your explicit agreement. It is never used for anything else and never shared with anyone beyond the secure EU service that stores your Volyume data, and you can see, export or delete all of it here at any time. Deleting it does not touch your account." Buttons `Agree and save` / `Leave it for now`. | `HowYouTrainAddScreen.js:821,839,82,889-893` |
| Plan diff | **"Your current plan"** / "Your history is not rewritten either way." Sentence: "N exercises in your current plan clash with your injuries or limitations. Volyume can swap K for movements that fit; U have no close match and stay in place with a quiet note." Buttons `Update my plan` / `Leave it as it is`, hint "Leaving it means the affected exercises show a quiet note with a swap shortcut." | `HowYouTrainAddScreen.js:822,843,857-863,911-917` |
| Saved | "Saved" + the same sentence; "What happens next": "Your current plan is updated for this from your next session." / "Every new plan and workout is built around this." / "You can change or remove it any time under Injuries & limitations." | `HowYouTrainAddScreen.js:823,783-785`; `addFlow.js:401-411` |
| Generation respects it | `planAutoGen.js:578-586` sets `capabilityIneligible` from `baselineConflicts(...).some(c => !c.unknown)`; `generation.js:66-92` filters the pool. Post-build note: "1 movement clashed with an injury or limitation you've set, so your plan works without it." Rationale `planEngine.js:2801` "Built around your limitations." | `planAutoGen.js:578-586`; `ProGoalSetupScreen.js:101-105` |
| Plan Library | Badge `Fits your limitations`, else `N to swap`; same on plan detail; filter chip `Fits your limitations` | `PlanLibraryScreen.js:50,823,827`; `PlanDetailScreen.js:481,487` |
| Workout notice | Chip **`Limitation`**; body "This one involves overhead work with your left shoulder, which clashes with an injury or limitation you've set. Swap it when you're ready." + `Swap` action | `ActiveWorkoutScreen.js:4548,1075,1077,4556` |
| Swap / picker | Conflicting rows hidden by default; toggle `Show movements that clash with your limitations`. Shown, each row captions "Involves overhead positions, which you keep out under Injuries & limitations". Confirm sheet offers `Add anyway, just this plan` / `This one works for me`; clinician rules offer only `Open Injuries & limitations`. Conflict sheet reason "Clashes with an injury or limitation you've set". | `ExercisePickerModal.js:423-424,917-923,174,522-530,485-489`; `ExerciseConflictSheet.js:71,166` |
| Coach truthfulness | `CoachOutputScreen.js:1946` builds `physicalConstraint` from `r.role === 'episode'` ONLY — a long-term rule never reaches the weekly coach. No copy claims it does: the intro says "picks exercises and builds your training"; the offer card says "choosing exercises and building your training". Neither says coaching, notifications or Progress. | `CoachOutputScreen.js:1946,1977` |
| Edit later — Settings | Settings → `Injuries & limitations` → `Your setup` row "Overhead work with your left shoulder" / "Since 5 Sep · Part of your normal training" → sheet `Options for this limitation` → `Change what this covers` ("Opens it with every line filled in. Saving replaces it; your history is not rewritten.") or `Remove` ("Volyume plans and suggests it normally again from now on. Nothing in your history changes.") | `HowYouTrainScreen.js:1344,1350-1355,1508,1518-1522` |
| Edit later — Train | Train → `Plan tools` → `Injuries & limitations`, sub `Leaves out overhead work with your left shoulder` → same screen | `PlansScreen.js:1702-1712` |

**Walked clean:** discovery from three tab-level doors; every wizard question in plain
words; the WHEN step reads exactly "Is this long-term, or temporary?" with
`Long-term` / `Temporary, for now`; consent on first save; the plan diff states what
changes, what stays and that history is not rewritten, and asks before acting;
generation, picker, swap, plan-library compatibility and the live session all honour
the rule; the coach does not claim to.

---

## JOURNEY F — TEMPORARY LIMITATION (knee, two weeks, no impact/jumping)

| Step | What I see, verbatim | file:line |
|---|---|---|
| Find it | As journey E (Settings / Coach / Train / Today offer card) | — |
| WHEN → temporary | `Temporary, for now` — "Volyume takes it as a passing change and helps you build back up when it ends." | `addFlow.js:78` |
| SINCE | "Since when?" / "A rough guess is fine." Options `Today`, `About a week ago`, `About two weeks ago` | `HowYouTrainAddScreen.js:817,834`; `addFlow.js:81-85` |
| UNTIL | "Roughly how long?" / "A rough guess is fine. Volyume checks with you rather than assuming. Nothing ends until you say so." Options `Until I end it`, `About a week`, `About two weeks` ("Volyume checks with you around then."), `About a month` | `HowYouTrainAddScreen.js:818,835`; `addFlow.js:87-92` |
| Check | `How long` = "Temporary, about two weeks (around 19 Sep)"; `Since` = "Today". Card: "Volyume will keep jumping and impact work out of your training for now." | `addFlow.js:311-320,386-388` |
| Affected sessions | "Your current plan" → "While jumping and impact work is out, your sessions would show 3 exercises swapped for something that works now, and 1 left out with nothing forced in its place." Buttons `Apply while it lasts` / `Not now` (hint "Not now means your sessions keep showing these, each with a quiet note and a swap shortcut."); `Choose per exercise` expands per-row `Apply` / `Keep`. Fail-safe mode: "One of your sessions would be left with nothing to do, so Volyume keeps it as it is rather than serve an empty session." | `HowYouTrainAddScreen.js:854-859,919-925,714-745,87-89` |
| "Hold my plan" | `Options` → `Hold my plan as-is` — "Volyume changes nothing for this until you say so. Your plan runs exactly as it is."; card chip `On hold` + "Holding your plan as-is; adaptation is paused, not your training." | `HowYouTrainScreen.js:1562-1564,1213,1390` |
| Unaffected sessions | No notice: `constraintNotice` returns null with no conflicts on the row | `ActiveWorkoutScreen.js:1011,1096` |
| Today line | Grouped under `Injuries & limitations`: **"Training leaves jumping and impact work out at the moment."** (tappable, a11y adds "Open Injuries & limitations"). Coach/Train row concurrently reads "Working around jumping and impact work, until about 19 Sep". | `HomeScreen.js:2763,2769-2772`; `homeCoachBrief.js:21-25`; `summary.js:47-54` |
| Workout notice | Chip **`Temporary change`**; body "This one involves jumping and impact work, which sits outside your temporary change. Swap it when you're ready." Held rows instead: "You're holding your plan as-is for this. Volyume changes nothing until you say so." | `ActiveWorkoutScreen.js:4548,1061,1040` |
| Check-in question | "How did you get on training without jumping and impact work?" — `Fine` / `It got in the way more than expected` / `Mostly didn't come up`. Overdue hint: "You thought you'd be back to jumping and impact work by about now. When you're ready, you can end this under Injuries & limitations and everything comes back." | `WeeklyCheckInScreen.js:1303-1312,1316-1319` |
| Coach copy | "You said working around jumping and impact work got in the way more than expected. If that carries on, you can adjust things under **Injuries & limitations**." / "…you can end that under Injuries & limitations." / "You said this week went fine around jumping and impact work, so everything carries on as planned." | `weeklyCoach.js:2611,2617,2626` |
| Episode overdue | Card sub "Since 5 Sep · you said until about 19 Sep. You thought this would be done by about now. Still need it?"; chip `Checking with you`; heading "Still need this?" + "Nothing ends until you say so. Volyume keeps working around it either way."; buttons **`Still going`** / **`Done with it`**. Today shows "You thought you'd be back to jumping and impact work by about now. Still need it?" | `HowYouTrainScreen.js:1199-1213,1398-1406`; `HomeScreen.js:1861-1865` |
| Ending it | Dialog "Back to jumping and impact work?" / "Everything comes back straight away, and training builds back up to your plan over the coming weeks. Nothing from this period is lost." Buttons `Not yet` / `Yes, bring it back`. | `HowYouTrainScreen.js:945-952` |
| Plan builds back | Toast + durable Today line "Your quads work builds back up to your plan from here." (non-tappable, rendered for every week rows carry the `reintroduction` stamp) | `reintroduction.js:107-110,138-146`; `HomeScreen.js:2820-2825` |
| History truthful | `Past` section: "Jumping and impact work" / "Ended 19 Sep · lasted 2 weeks" (or "Became part of your setup 19 Sep" after promotion), with `Start this again`. Promotion dialog: "Volyume will keep building your training around jumping and impact work from now on, with full progression and coaching. **Your history is not rewritten.**" | `HowYouTrainScreen.js:1468,1475-1478,1221-1226,981-984` |

**Walked clean:** temporary path asks since/until in plain words; adaptation is
proposed and never applied silently (`Apply while it lasts` / `Not now`, or per-row
`Apply`/`Keep`, or `Hold my plan as-is`); Today, the live session, the check-in and the
weekly coach all speak about the same episode consistently; the episode ends only on
the user's word; the ramp back is stated without promises; history is not rewritten.

---

## ANOMALIES

**Stop-ship (Part 45): NONE.** Specifically checked and cleared —
(a) the door is findable from Settings row 1, the Coach tab's first section, the Train
tab's first Plan-tools row, onboarding step 5 and the Today offer card;
(b) the label plus subtitle names all four causes, so no wording obscures purpose;
(c) no populated line is vague to the "what is this for / what does the count mean"
test (Part 43 table above);
(d) a limitation is honoured by generation (`planAutoGen.js:578-586`), the picker
(`ExercisePickerModal.js:423-424`), swaps (`ExerciseConflictSheet.js`), the live
session and library compatibility (`planCompat.js`);
(e) nothing changes silently — the wizard's PLAN step, the episode proposal and the
per-row chips all ask first.

### P2 — Journey E (5)

| # | Note | file:line |
|---|---|---|
| E-P2-1 | The combined tail `· 2 long-term` is a bare count with no noun, on the one line D152 rewrote everywhere else to carry one ("2 injuries or limitations saved…"). Decodable from the row label, but it is the last surviving countless count. | `summary.js:70` |
| E-P2-2 | "Every new plan and workout is built around this." over-claims for a hand-built plan: `ManualBuilderScreen` has no preflight and inherits filtering only through the picker, which fails OPEN on an unreadable state. | `addFlow.js:409`; `02-CAPABILITY-CONCEPT.md` §C.4 |
| E-P2-3 | Conflicting rows are hidden by default in the picker, and the `Show movements that clash with your limitations` toggle sits below the two other toggles and the filter chips — a first-timer may not learn why an exercise is absent. | `ExercisePickerModal.js:423-424,915-925` |
| E-P2-4 | The Settings row's subtitle is a static string; Coach and Train carry the live `hytSummary.sub`. Settings — the row most users return to — never reflects what is saved. | `SettingsScreen.js:44` vs `YouScreen.js:515`, `PlansScreen.js:1712` |
| E-P2-5 | `Set up. Nothing is left out.` (allowance-only) does not say what IS set up. Honest, but the shortest line on the surface. | `summary.js:66` |

### P2 — Journey F (4)

| # | Note | file:line |
|---|---|---|
| F-P2-1 | Today says "Training leaves jumping and impact work out at the moment." with no end date, while Coach and Train say "…until about 19 Sep" the same day. Today is the surface seen most and the one without the date. | `homeCoachBrief.js:21-25` vs `summary.js:53` |
| F-P2-2 | The Today works-around line renders only when `activeConstraint && activePlan`. A temporary limitation held by someone with no active plan produces no Today line at all. | `HomeScreen.js:2765` |
| F-P2-3 | An episode of 3+ rules falls to "Working around a temporary change, …" — the same >2-phrase veto D152 fixed for baseline rules by adding a purpose clause; the episode branch got no equivalent. | `summary.js:52`; `phrase.js:150-160` |
| F-P2-4 | Same class in the check-in: "How did you get on training around your temporary change?" when the subject will not name. | `WeeklyCheckInScreen.js:1313` |

---

## SCRATCH ARTEFACT

`/tmp/claude-0/-home-user-ADPhysique/eb71cbd7-d231-5e8e-9a66-ecda3ee50d36/scratchpad/__tests__/summaryProbe.test.js`
— 17 fixtures through `howYouTrainSummary`, run with
`npx jest --roots <scratchpad> --runTestsByPath <file>` (node_modules symlinked into
the scratchpad). Outside `src/`, not committed, nothing under `src/` touched.
