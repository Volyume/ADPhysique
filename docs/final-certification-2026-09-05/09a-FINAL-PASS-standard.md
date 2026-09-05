# 09a — Final adversarial journey walk (standard journeys A, B, G)

Read-only pass, 2026-09-05, branch `claude/volyume-final-certification-w2xds1`
(clean tree, all wave-1/2 remediation landed). Authority: founder brief Part 42
(journeys A, B, G), Part 45 (stop-ship conditions), Part 37 (adversarial
questions). Method: each step follows the CURRENT code path a tap takes —
`RootNavigator` → screen → the lib it calls → the string it renders. Nothing
was edited. Copy in the tables is the literal string in the file.

---

## JOURNEY A — NEW STANDARD USER (email, Full gym, 3 days, beginner)

| # | Screen / route | What the user sees (exact copy) | Verdict |
|---|---|---|---|
| 1 | `WelcomeScreen` (via `renderNavigator` `if (!user)`) | "Everything you need to build your physique." / "Training, nutrition, progress and coaching, connected in one app." / "Completely free · No ads" / **Get started** / "Already have an account? Sign in" | clean; free claim true (`proGate.FULL_ACCESS_FOR_ALL`) |
| 2 | `components/auth/AuthSheet` email path | "Create your account" / "Keep your training, nutrition and progress synced across devices." / Email, Password, **Create account**, "Forgot your password?" | clean |
| 2b | same, failure paths | `authErrorCopy.AUTH_COPY` — network / rateLimited / badCredentials / duplicate / unconfirmed / weakPassword / fallback | clean; raw SDK string never reaches the user (`authErrorMessage`, pure map) |
| 3 | `Article9ConsentScreen` (gate fires on `healthConsent === false` **or** null-for-new-user) | "Health and nutrition data consent" / "What Volyume looks at:" / "What leaves your phone:" / "What we never do with it:" / "Where it lives:" / checkbox "I agree to Volyume using my health and nutrition data to coach me." / **Continue** / "What if I don't agree?" → Sign out / Delete my account | clean; un-skippable, fails closed, decline has a real exit |
| 4 | `ProOnboardingScreen` step 1 | auto-skipped for a signed-in non-local user (`useEffect` at :825) — displayed steps renumber 1..6 (`displayStepOf`) | clean, no orphan "create account" |
| 5 | step 2 "Baseline" | "Set your starting baseline" / "These details let the app set a safe starting baseline without guessing." — sex, age, height, weight | clean; sex gate blocks (`validateStep2`, no default) |
| 6 | step 3 "Body composition" | "Add your starting body composition" / "An honest estimate sharpens your first plan. Skip this if you are not sure." | clean |
| 7 | step 4 "Training week" | "Shape your training week" / "The plan should fit your real week, not the week you wish you had." — Experience, Session length, Days ("Two is enough to train everything, so pick the honest number rather than the ambitious one."), Equipment → **Full Gym** | see P2-3, P2-4 |
| 8 | step 5 "Injuries & limitations" | "Anything Volyume should build around?" / "If you have an injury, pain, a long-term health condition or a disability, set it up now and every plan starts compatible…" / **Yes, let's set that up** / **Skip for now** / "You can add this any time under Injuries & limitations, in the Coach tab or Settings." | clean; F-20 double-skip gone, one honest skip |
| 9 | step 6 "Targets" | "Set your training focus" / "Your goal sets the calorie direction, training bias and nutrition target." | clean |
| 10 | step 7 "Check-in rhythm" | "Recovery and reminders" / "Reminders keep coaching consistent." / "Pick a morning time and weekly check-in day. Your phone will ask to allow notifications when you continue." / pill "Part of your coaching" | clean; OS prompt is pre-announced |
| 11 | build sequence → payoff | "Building your first plan" / four stage lines / "Plan ready" · "Your plan is ready" · goal·phase / split·days / "N build weeks + 1 recovery week" / "Your targets and weekly check-in are ready too." / **See my plan** | clean; stages map to real phases, no completion tick on failure |
| 12 | landing | `seePlan` sets `postSetupLanding='PlansTab'` → Train tab | clean, matches "show me what you made" |
| 13 | Today, day 1 (`HomeScreen` hero branch 4) | eyebrow "PlanName · Day 1 of 3", session name, "N exercises", readiness chip, **Start workout** + **Options** | clean; single primary |
| 14 | first workout (`ActiveWorkoutScreen`) | log two sets → rest → overflow "Swap exercise" / "I can't do this" / "Add exercise" / "How logging works" | clean |
| 15 | finish | "Finish workout?" · "You've logged N sets across N exercises." → **Keep going** / **Finish workout**; failure → "Couldn't finish workout" · "Your sets are still saved, but the workout did not close on your device, so tap Finish workout again." | clean; no raw error text |
| 16 | `WorkoutSummaryScreen` | "Workout complete" / "Your block" / "How did the session feel?" / "Notes for next time" / "Save this workout to reuse" | clean, onward actions present |
| 17 | Nutrition tab, empty day | `EmptyDiary` with **Add food**; load failure gets its own "Couldn't load this day" · "Check your connection and try again. Nothing has been lost." | clean; a failure never reads as an empty day |
| 18 | first weigh-in | Today → `TodayStrip` cell "Morning weight" / "Not logged yet" → inline input → pill "Logged" | clean; entry is on Today, one tap |
| 19 | Progress with one weight | Body pillar state = `weightTrend.insight` = "Log your weight for 7 days and your trend appears here." (no rate, no maintenance) | clean; state 1 makes no claim |
| 20 | return next day | hero branch 4 again; Evidence panel rows "N of 3 morning weigh-ins this week", "Morning weight 84.0 kg" | clean |
| 21 | end of week 1, week complete | eyebrow "Week complete" / "Every session done this week" / "Your next session is {name}. Your new week starts on Monday {d MMM}." / no primary / quiet "Do another session" | clean — F-18 B-1 landed; `isWeekComplete` requires `nextSession == null && weekResolved` |
| 22 | first check-in, gated | "First check-in needs more data" · "Your coach needs at least 5 days of data … Right now there are N days of baseline data left. Volyume waits for your next {day} … Your first check-in opens on {date}. That first review sets your baseline, so your coach may hold your targets steady rather than change them." | see **A-1** (stop-ship class) |
| 23 | check-in, weights short | "A few more weight readings needed" · "You've logged N mornings in the last 7 days. Your coach needs at least 3 …" → **Log my weight first** (deep-links Today + opens the input) / **Check in anyway** | clean; named evidence, real action, escape hatch |
| 24 | first Coach result (HOLD) | `assessDataConfidence` → "Need morning weights from at least 3 different days for a reliable trend. Calories held this week. Log daily and the next check-in has clean data to act on."; `HOLD_COPY` names which domain was held and why | clean; names the missing evidence and what releases it |

---

## JOURNEY B — EXPERIENCED BODYBUILDER (several blocks, active PPL)

| # | Screen / route | What the user sees (exact copy) | Verdict |
|---|---|---|---|
| 1 | Today | hero branch 4, eyebrow "{plan} · Day n of m"; `TodayLine` may carry "This week's coaching decision. See why." | clean |
| 2 | Train (`PlansScreen`) | active plan card + "Your coach reviews this plan each week and suggests changes for you to apply. Change training setup or switch plans from the options below." / **Start next workout** / **View plan** | clean — F-20 overclaim fixed ("suggests changes for you to apply") |
| 3 | workout → Swap | header "Swap exercise" + exercise name; note "Choose a close match for today. Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume." | clean — scope stated as session-only, explicitly |
| 3b | Swap, narrowed | "N movements left out for your limitations." / empty: "No close matches within your limitations." / "Showing {style} exercises" + **Show all exercises** | clean — D152 vocabulary throughout |
| 3c | "I can't do this" | "Can't do {name}?" · "Volyume will swap it for another exercise that works the same muscle group. Choose whether that is just for today, or from now on." → **Just for today** / **From now on** (→ Injuries & limitations, pre-filled) | clean — the two scopes are the two buttons |
| 4 | Nutrition with targets | rings + macro row; after a coach change, row "Targets updated. See why" → the decision that made it | clean — the current target is explained where it is shown |
| 5 | check-in | "How are you feeling?" / "This week's data" · "We pre-fill what we can from your logs. Correct anything that does not reflect the week, because this is what the weekly decision is measured against." / "Recovery and issues" / "Training performance" | clean |
| 6 | Coach decision with a training change | per-row **Apply** / **Keep as is**; after: chip "Applied" or "You chose to keep this as it is."; a hold renders its reason instead of a button; save failure → "Applied. We could not save the record of it, so it may be offered again next time." | clean — no silent apply, no silent decline |
| 7 | block completion, Today | eyebrow "Block complete" / "Every week of this block is done" / **Choose what's next** / quiet "Do another session" | see **P2-2** (said twice) |
| 8 | `BlockReflectionScreen` | "What's next" · "Your recovery week is done, so the next step is choosing your next block. Nothing starts on its own." → **Choose your next block** (single cross-tab call, F-07 landed) | clean |
| 9 | next block start (Train receipt) | "No longer in your plan" / "Your set targets" / "Your workouts stay exactly as they are. Only your set targets move." / **Start next block** / **Not yet**; volume rationale from `interBlock.composeRationale` ("the starting volume carries over unchanged" / "starts N sets higher") | clean — what carries and what moves is itemised |
| 10 | switching plan mid-block | "…Switching now starts a new block today on "{plan}", and this block's results will still appear under Past blocks. Your workout history and PRs are kept." | clean — history explicitly untouched |
| 11 | Adjust training on a style plan | form withheld: "This is a {label} plan from the Plan Library. Volyume builds adjusted plans from gym, dumbbell, home and bodyweight kit, so to change it choose another {label} plan." + **Browse {label} plans** | clean — F-16/F-15 landed |
| 12 | Adjust training with circuits | inline + pre-write confirm "Circuit rounds are not kept. Volyume will build straight sets from the same kind of exercises." → **Cancel** / **Rebuild anyway** | clean — nothing consequential changes silently |

---

## JOURNEY G — LONG-TERM RETURNING USER (months of history, 3 weeks away)

| # | Screen / route | What the user sees (exact copy) | Verdict |
|---|---|---|---|
| 1 | Today, long absence | `TodayLine` rank 6 re-entry: "Welcome back" · "It's been a while since your last logged workout, so we want to check before using the same training targets." → **I've still been training** / **I haven't trained** / **Just continue** | clean; "It's been a while" is a fact about the LOG only |
| 1b | coach brief line | "It's been a while since your last session. Ease in. Don't try to catch up in one workout." | clean |
| 2 | Train | next-workout row from the same `resolveProgrammePosition` Today uses — the two cannot disagree | clean |
| 3 | Progress | pillars "Training" / "Body" / "Progress photos"; Body = `weightTrend.insight`, e.g. "Your smoothed weight trend is updated. Maintenance comes from your validated food and weight history."; maintenance labelled "~N kcal/day estimated maintenance" with provenance "From N weeks of weigh-ins and your logged food" / "Early estimate, from…" / ", assuming you ate to target" | clean — estimate vs observed is labelled, including the assumption |
| 3b | PRs / history | Training pillar → LiftProgress; "Full history", "Consistency", "Recaps", "Year of Lifts"; past blocks reachable from Train | clean |
| 4 | Coach after the gap | `HOLD_COPY.sessions_missed` "We are leaving your programme alone until there are enough sessions to judge it."; `whatWeWatchNext` "Getting back to your full week is the thing that makes the rest readable." | clean — the gap is named, not papered over |
| 5 | personalisation surfaces | swap memory tags, only where earned: "Your default here", "Last used here", "You've chosen this replacement several times", "Progressing consistently", "Used recently", "Previously used" (`lib/exercise/intent.js:714-741`) | clean — every tag corresponds to something the user actually did |
| 6 | learned volume | next-block start line composed from the FINAL clamped numbers (`interBlock.composeRationale`), never from the branch's intent | clean — the copy cannot claim a change a clamp reversed |
| 7 | next block | as journey B step 9 | clean |

---

## ANOMALIES

### A-1 — P1, STOP-SHIP CLASS (internal / retired term in a main journey)
The product has no surface called **"Eat"**. Tab titles are Today / Train /
Nutrition / Progress / Coach (`RootNavigator.js:688-692`); the food screen's
header is "Nutrition" (`DiaryScreen.js:1422`). Three user-facing strings still
name a retired surface:

- `src/screens/WeeklyCheckInScreen.js:1706` — "Keep logging your morning weight each day, **and food if you use Eat**. Your first check-in opens on {date}." (journey A, step 22 — the gate a first-week user is sent to from the Coach tab)
- `src/screens/MethodologyScreen.js:35` — "…reads your logged training, your morning-weight trend, your food data **when you use Eat**, and your weekly check-in answers."
- `src/screens/MethodologyScreen.js:46` — "…your nutrition target and diary data **if you use Eat**…"

The same sentence is already written correctly elsewhere:
`src/screens/SettingsFaqScreen.js:42` — "your food data **if you use the food
diary**". Not caught by `03-COPY-SCAN.md` (grep of that folder for "Eat"
returns nothing). Fix is a three-string rename to "the food diary"; no logic.

### P2-2 — Block-complete is stated twice on Today, with the identical CTA
`todayLineArbiter.js:60-68` returns `"Block complete. Choose what's next."`
whenever `facts.blockComplete.eligible`, which `HomeScreen.js:2106-2108` wires
to `!!currentMesoWeek?.awaitingDecision` — the same condition as the hero's
`blockAwaitingDecision` (`HomeScreen.js:1656`). Both render: the line at
`HomeScreen.js:2228`, the hero at `:2352-2362` ("Block complete" / "Every week
of this block is done" / **Choose what's next**), and both `onPress` navigate
to `PlansTab → Plans`. F-18 made the hero the decision but left the rank-2 line
in place. Part 37 "is anything explained twice": yes, adjacently, with the same
words on the button. (When the athlete overrides the workout the line is the
only carrier, so the line itself is not redundant — only its co-occurrence with
the hero is.)

### P2-3 — A Kettlebells/Bands answer is not representable anywhere else
`ProOnboardingScreen.js:228-229` offers "Kettlebells" / "Bands"; the answer is
mapped away before storage — `equipment: generationEquipmentFor(equipment)` at
`:1581` (kettlebells → `home_gym`, bands → `bodyweight`). The two screens that
re-ask the question hold only the original six values
(`ProGoalSetupScreen.js` and `PlanUpdateScreen.js`, `EQUIPMENT_OPTIONS`), so
those users read their kit back as "Home gym" / "Bodyweight". Mitigated while
the installed library plan is style-locked (both screens withhold the training
fields entirely, `styleLockGoalNotice` / `styleLockRebuildNotice`); it bites
only after the athlete moves to a generated plan. Recorded, not stop-ship.

### P2-4 — The same question is labelled two ways
`ProOnboardingScreen.js:214-219` uses Title Case with ampersands ("Full Gym",
"Machines & Cables", "Dumbbells Only", "Barbell & Plates", "Home Gym");
`ProGoalSetupScreen.js` and `PlanUpdateScreen.js` use sentence case with "and"
("Full gym", "Machines and cables", …). Same values, same question, two
vocabularies — Part 37 "is any label unpredictable".

### P2-5 — Week-complete names the date on Today, not on Train
Today: "Your new week starts on Monday {d MMM}" (`planDisplay.weekCompleteLine`).
Train: "Week complete. Your next session is on Monday." (`PlansScreen.js:1334`).
Not contradictory; the weaker line simply drops the fact the other one has.

### Record note (not an anomaly)
`08-REMEDIATION.md` says the onboarding skip collapsed to one **"Not now"**.
Shipped copy is **"Skip for now"** — deliberately, because "Not now" is
reserved by the R8-3/R9 guard for the button that declines a capability change
(`ProOnboardingScreen.js:2411-2415` states this). The code is right; the
remediation row is stale.

---

## WALKED CLEAN — explicit confirmations

Checked and found **no** stop-ship condition in any of these:

- **Claim vs code.** Welcome "Completely free · No ads" (`FULL_ACCESS_FOR_ALL`); the D152 claim "picks exercises and builds your plan" (true of generated plans, picker, swaps, live session, library compatibility); "Your plan is not changed" on the swap sheet; "Your workout history and PRs are kept" on a plan switch; "Nothing starts on its own" on block end; `styleLockRebuildNotice` naming exactly the four kits generation can build from.
- **Dead ends.** Every terminal state walked carries a forward action: check-in gates (**Got it** / **Log my weight first** / **Check in anyway**), plan-with-no-sessions (F-18 B-2: "Your plan has no sessions yet" → **Open your plan** / **Choose a different plan**), no-plan (**Start with a plan** / **Browse plans**), Diary load failure (**Retry**), Coach load failure ("Couldn't refresh Coach" · "Your saved profile stays unchanged. Tap to try again."), block reflection (**Choose your next block**).
- **Routing to the wrong state.** Hero precedence is stated once (`HomeScreen.js:1640-1657`) and each branch is exclusive; `isWeekComplete` is derived in one place for Home and Train; F-05/F-06/F-07 cross-tab fixes are in the tree; deep links `active-workout`, `partner/:code`, `routine/:planId`, `diary/:date?` all resolve (`RootNavigator.js:826+`).
- **Silent consequential mutation.** Circuit flatten is disclosed inline and confirmed before any write; a style plan cannot be regenerated at all; Apply/Decline both write a record and both are visible afterwards; a failed apply says the record was not saved.
- **Raw error text.** No `appAlert`/`toast.show`/`Alert.alert` in `src/screens` or `src/components` passes `e.message` (grep, zero hits). Auth failures go through `authErrorCopy.authErrorMessage`.
- **Contradictory states.** Today line and hero disagree nowhere (the only overlap is P2-2, which is duplication, not contradiction); Train's week-complete mirrors Today's; the block-finished contradiction F-18 named is gone.
- **Stale Pro / trial / paywall.** No user-facing "Pro", "upgrade", "trial" or price string in Home, Train, Nutrition, Progress, Coach or the active workout. `differentialPaywall` is short-circuited in the engine (`weeklyCoach.js:2346`, `FULL_ACCESS_FOR_ALL ? { shown: false } : …`); `ProGate`, `ProUpgrade`, `Subscription*` and `CascadeGate` are not registered in any navigator.
- **US spelling / internal terms.** No "how you train" survives in a user-facing literal (case-insensitive grep of `src/`, excluding route ids, file names and comments: zero). No "mesocycle", "EWMA", "MEV/MRV/MAV", "capability", "watermark" or "upsert" in rendered copy on the walked screens. The only retired-vocabulary hit is **A-1**.
- **Unrecoverable interruption.** Onboarding draft survives process death per uid and restores `sex: null` as null (the gate cannot be bypassed by a restore); an unfinished workout is rehydrated on Today with "Workout in progress" · "Tap to return to your workout"; finish is one SQLite transaction (neither or both, never half).
- **ED-safety on the walked path.** Weight-trend card drops to direction-only with no rate and no maintenance under an open flag; the Evidence panel and the first-review line go neutral under the same OR-chain; the check-in "insufficient evidence" copy never counts weigh-ins at the user under `edSuppressed`; hold copy never blames.
