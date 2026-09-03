# How you train — usability audit (2026-09-03)

**Commissioned by:** founder, 2026-09-03. Verbatim brief: *"audit the How You Train feature fully ... I don't believe it's at all intuitive and easily understandable at the moment."* Clarified mid-audit, verbatim: *"It's when you click on one thing like Add Something, it's not clear what or if you have to do anything next. There's no clear understandable flow that a normal human will understand. It's not easy to comprehend. It doesn't flow right and that's in each of them."*

**Consumer:** the next session, which will use this to redesign the feature's usability. This document is evidence and diagnosis, not a design. Every claim carries a `file:line` from the tree at commit `6fedf6a5` (main, 2026-09-02). Line numbers drift with edits; the quoted strings do not, so search by string when a line has moved.

**Method:** impeccable critique, dual-agent (Assessment A design review: Opus; Assessment B detector and mechanical maps: Haiku; prior-audit history extraction: Sonnet), with the lead reading every state-bearing mechanism hands-on (`refresh`, `writeDraft`, `proposeEffectiveDiff`, `revisitCapabilityPlan`, `proposeCapabilityPlanRewrite`, the four confirms, Home's rows, the weekly check-in, the in-session notices) and rendering two screen states through the mirror harness. Detector result: zero findings on all five files, which is a known false negative for React Native (proven earlier in this session with an RN-shaped probe); it is recorded, not relied on.

---

## 0. Read me first

### 0.1 The diagnosis in one paragraph

The feature is a rigorously reasoned state machine (roles, kinds, sides, dates, consent, an apply/decline/undecided choice per rule, a hold/propose mode per episode, an active/awaiting/ended status, a plan-rewrite outcome, a reintroduction ramp) rendered through a generic Settings list. **Every transition in that machine is communicated by a modal alert or a 2.5-second toast, and none of it is communicated by the screen itself.** So after any tap, the person is left to infer from a vanished button, a replaced card, a dialog they did not expect, or a row that appeared somewhere they were not looking, whether a sequence has started, where they are in it, when it is finished, what it did, and whether anything is now expected of them. That is the founder's complaint, and it holds for all thirteen flows traced in section 2, not just the add flow. The resting screen's failure to show state (section 5) is the same defect seen from the other side: the flows do not leave a trace, so the screen cannot show one.

### 0.2 What this is not

- Not a copy problem. Individual sentences are unusually good (section 3.E). The problem is where they live and what surrounds them.
- Not a visual-system problem. The 2026-09-02 restyle put the surfaces on the shared primitives; this audit found no remaining off-system rectangles on the three screens. Layout is not what confuses.
- Not a logic problem. No product rule, persistence path or coaching rule is found wrong. The behaviour is correct and illegible.

### 0.3 What is law (not findings, and not to be redesigned away)

From `CLAUDE.md`, `docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md` and the CC33 ruling D112, restated so the redesign session does not trip them:

| Law | Where pinned |
|---|---|
| Long-term condition or disability = part of the user's normal BASELINE, open-ended. Temporary injury or limitation = EPISODE, a departure from normal. The two never blur. | `model.js:17-23`; `capabilityGuards.test.js` |
| The words *injury*, *restricted*, *modified* never appear on a baseline row. Temporary framing attaches only to episodes. | `HowYouTrainScreen.js:5-10`; `capabilityVocabulary.guard.test.js`; `capabilityCopyLeakage.guard.test.js` |
| Diagnosis and naming are always optional. The directory (Training considerations) is stateless discovery; selecting a profile writes nothing (GC-D1). The role question is asked even when the directory suggests one (the user "still walks durability, dates, consent and readback themselves"). | `TrainingConsiderationsScreen.js:1-16`; `capabilityDirectoryDiscovery.test.js` |
| User intent is authoritative. Nothing is silently changed: every plan effect is proposed and confirmed; declining leaves the affected rows visibly marked with a swap shortcut. | `HowYouTrainScreen.js:507-520` (comment), `:616-685`; `sessionEffective.serveGuard.test.js` |
| Article 9 consent ("One thing first") gates every write, fails closed, cannot be skipped. | `store.js:89-93`; `capabilityConsent.test.js` |
| Free tier. Nothing here is Pro-gated (CAP-19). | `capabilityGuards.test.js`; `capabilityRoutesReachable.test.js` |
| One phrase per meaning: "Not now" appears only on the button that DECLINES; "Leave it as it is" is the no-op cancel. | `HowYouTrainScreen.js:1010-1013`, `:1061-1065`; `HowYouTrainScreen.capabilityFlows.guard.test.js` |
| Failed reads are told, never rendered as "nothing to do" (A15). | `HowYouTrainScreen.js:70`, `:163-169`; `HomeScreen.js:2656-2661` |
| The cross-lane line on Avoided movements: exact string, exact tap target, exact position above every list branch. | `AvoidedMovementsScreen.crossLane.guard.test.js` |
| Every interactive control on these surfaces ≥ 48dp, enumerated. | `capabilityTouchTargets.guard.test.js` |
| Deterministic engine, no AI, no randomness. | `CLAUDE.md` section 2 |

A redesign can change any presentation, ordering, container, control, copy (outside the pinned strings) or information architecture. It cannot change any of the above without a founder decision, and several are pinned by source-regex tests that will fail loudly.

---

## 1. The feature as built

### 1.1 Surfaces

| Surface | File | Role | Lines |
|---|---|---|---|
| How you train (home + inline add flow + inline line review) | `src/screens/HowYouTrainScreen.js` | The lane's settings home and every write path | 1,880 |
| Training considerations | `src/screens/TrainingConsiderationsScreen.js` | Optional named-condition directory; stateless; routes back with a preselect | 275 |
| Avoided movements | `src/screens/AvoidedMovementsScreen.js` | The sibling PREFERENCE lane (read + remove), cross-linked both ways | 215 |
| Capability lib | `src/lib/capability/*.js`, `directory/*.js` | Model, store, resolver, phrasing, directory data | 4,554 |

### 1.2 Routes in (12) and out (3)

In: Settings row (`SettingsScreen.js:46`); Home rows ×3 (`HomeScreen.js:2588`, `:2606`, `:2624`); Pro onboarding step 5 (`ProOnboardingScreen.js:2163`) and its total-block alert (`:1555`); Free starter capability step (`FreeStarterScreen.js:380`); Workout summary (`WorkoutSummaryScreen.js:1629`); Active workout "Work around this" with a preselect (`ActiveWorkoutScreen.js:5243`); Exercise conflict sheet (`ExerciseConflictSheet.js:178`); Exercise picker (`ExercisePickerModal.js:439`); Avoided movements cross-lane line (`AvoidedMovementsScreen.js:111`); Training considerations questions with a preselect (`TrainingConsiderationsScreen.js:85`).

Out of How you train: Training considerations (`:1608`), Workout settings (`:1713`), Avoided movements (`:1728`). Every one of the twelve routes in lands at the TOP of How you train, on the intro paragraph, regardless of which row, card or decision the referring surface was talking about. There is no scroll-to, no highlight, and one accessibility announcement in the whole file, reserved for the fail-closed notice (`:163-169`; count from Assessment B).

### 1.3 Where the user sees consequences (the "what has it done" surfaces)

| Surface | What it says | File |
|---|---|---|
| Home, grouped under "How you train" | "Training leaves {subject} out at the moment." / "You thought you'd be back to {subject} by about now. Still need it?" / "A change to how you train is waiting for your decision." / ramp line / "Volyume could not check how you train just now." | `HomeScreen.js:2583-2661`; `homeCoachBrief.js:21-25` |
| Workout summary | "Today worked around your temporary change: 2 exercises swapped for ones that work right now." + a "What changed" disclosure | `WorkoutSummaryScreen.js:94-111`, `:1592-1600` |
| Active workout, per row | "This one involves {named}, which sits outside your temporary change. Swap it when you're ready." / "You're holding your plan as-is for this. Volyume changes nothing until you say so." / "Volyume doesn't know yet how this fits how you train, so it stays as planned." | `ActiveWorkoutScreen.js:978-1043`, `:4201-4225` |
| Exercise picker | "Involves overhead positions, which you keep out under how you train"; "Show what you have set aside" toggle | `ExercisePickerModal.js:169-176`, `:822-842` |
| Plan update / install conflict | "N slots have no match inside how you train."; the conflict sheet's "Update How you train" / "Keep it in this plan" | `PlanUpdateScreen.js:583`; `ExerciseConflictSheet.js:153-185` |
| Weekly check-in (Pro only) | "How did you get on training without {subject}?" with a hint when overdue | `WeeklyCheckInScreen.js:1280-1294`; gated at `RootNavigator.js:221` |

Note the shape: the consequences of what the user said are reported everywhere EXCEPT on the screen where they said it.

### 1.4 The state the user is expected to hold in their head

Per rule: role (baseline / episode), kind (demand / family / exercise / exercise_allow), side (left / right / none), source (self / clinician-reported), start, planned end, `effectiveChoice` (null / applied / declined), `adaptationMode` (propose / hold). Per episode group: status (active / awaiting_confirmation / ended), ended reason (expired / user_ended / superseded / promoted). Per plan: rewrite outcome (swapped / quiet-noted / no match), reintroduction ramp in progress. (`model.js:17-183`; `store.js:39-70`.)

Of these, the resting screen renders: the rule label, "Part of your normal training" or the clinician sentence on baseline rows, and on episode cards a generic "Temporary change" title with the rule names in a muted 12px sub-line, plus one appended clause when awaiting and one when held (`HowYouTrainScreen.js:1537-1549`, `:1665-1667`). Neither date is rendered anywhere on the screen. `effectiveChoice` is not rendered anywhere on the screen.

### 1.5 Census (Assessment B, raw)

| In `HowYouTrainScreen.js` | Count |
|---|---|
| `<Choice` pill buttons | 38 |
| `appAlert(` modal dialogs | 13 |
| `toast.show(` transient messages | 28 |
| `<SettingRow` | 9 |
| `<Card>` (add-flow and review steps) | 10 |
| Add-flow stages (`adding === '…'`) | 9 named + null |
| `setAdding(null)` (ways out of the add flow) | 3, all terminal: successful save `:418`, consent-save failure `:457`, consent card "Leave it for now" `:1457` |
| `AccessibilityInfo.announceForAccessibility` | 1 (the fail-closed notice) |
| Distinct app-invented phrases the user must learn | ≈ 25 (section 2.14) |

The ratio is the finding: 41 transient or modal communications against zero persistent status elements.

---

## 2. Flow legibility — the core finding

Each user-initiated flow is traced against five questions a normal person asks without knowing they are asking them:

- **Start** — do I know a sequence has begun, and roughly how long it is?
- **Place** — at each step, do I know where I am and what is being asked?
- **End** — do I know when I am finished?
- **Result** — can I see what it did, and will I still be able to see it in a minute?
- **Next** — do I know whether anything is now expected of me, and when?

Verdicts: ✅ clear · ⚠️ inferable with effort · ❌ not conveyed.

### 2.1 F1 — "Add something", first time, empty screen

**Trigger.** The "Add something" pill at `:1689`, reached below the intro (two paragraphs, `:1567-1574`), the entry rows, the "Your setup" header with its "Nothing here yet" empty state (`:1612-1617`) and the "Temporary, right now" header with its "No temporary changes" empty state (`:1646-1651`). The primary action is the fifth block on the page and is styled as a tinted `Choice` pill (`:1792`, `:1834-1843`), the same shape as every option it will later present.

**What happens.** The pill disappears; a `Card` renders in its place (`{adding ? renderAddFlow() : …}` `:1687`) titled with a question: "Is this about how you train generally, or something temporary right now?" (`:1302`).

| Q | Verdict | Evidence |
|---|---|---|
| Start | ❌ | No heading names the flow ("Add something"), no step count, no indication of length. The card is the same `Card` used for notes elsewhere. The only signal that a flow began is that the button vanished. |
| Place | ❌ | Nine stages (`role → kind → axes\|family\|exercise → [side] → [dates] → readback → [consent]`, transitions at `:295`, `:340`, `:334`, `:1346`, `:1384`, `:1401`, `:1434`, `:371`) with no progress indicator and no Back on eight of them. Back exists only on the readback (`:1486`). There is no Cancel at all until the consent card (`:1457`). Leaving the screen does not reset `adding`; the half-finished card is still there on return (`useFocusEffect(refresh)` `:206` never touches it). |
| End | ❌ | The readback ends in "Save" (`:1485`). On a first save that is not the end: the consent card "One thing first" replaces it (`saveDraft` `:371` → `setAdding('consent')`), and its "I agree - store this information" button is silently also the save (`onConsent` `:450-460`). The user tapped Save and was asked to agree to something; the button they then tap does not say it saves. |
| Result | ⚠️ | The card vanishes. A toast carries the best sentence in the feature ("Saved. Volyume will keep {subject} out of your training for now. When you're ready to bring it back, end this here and training builds back to your plan.", `:425`) for 2,500 ms clamped to three lines (`Toast.js:105-106`, `:261`); at 182 characters it truncates on a 393-wide device. The new row appears ABOVE where the user is looking, in "Your setup" or "Temporary, right now", and nothing points at it. |
| Next | ❌ | Between 0 and ~2 s later, unforeshadowed by the readback, a modal appears: "Apply this to your current plan?" (`:616-685`) with three buttons, two of them filled (`AppAlert.js:167`: `isPrimary = !isCancel && !isDestructive`). Tapping outside it, or Android Back, runs the cancel slot's handler (`AppAlert.js:78-92`) which is `declineNow()` (`:626-632`, `:609-615`) — a recorded decision made by trying to get back to the page. "Choose per exercise" opens a THIRD inline card at the TOP of the page (`{renderLineReview()}` `:1577`) while the user's eye is at the bottom. For a baseline rule the modal is instead "Update your plan to match?" (`:1056`) or the information-only "Some of your plan sits outside this" (`:1053`). |

**Taps and decisions on the temporary-shoulder path** (Assessment A): 11 taps, 7 decisions (role, kind, axis, side, start, duration, apply), plus consent. The readback restates only the rule labels (`:1462-1484`); it does not restate temporary-vs-permanent, the dates, the side, or the clinician flag, which are the four answers most worth confirming.

**Decision points by visible option count:** kind 3–4; axes 10 + toggle + Continue = 12 (`:1391-1401`); movement pattern 30 + toggle + Continue = 32 (`:1331-1346`, labels from `movementFamily.js:283-319` including "anti-extension core work", "straight-arm pulldown work", "brachialis work"); dates 3 + 4 + Continue = 8 on one card (`:85-95`, `:1420-1436`); apply alert 3.

### 2.2 F2 — "Add something", returning user with existing entries

Identical to F1 with one aggravation: the add card renders after the baseline list and every episode card (`:1687`), so on a populated screen it opens near the bottom, and on save the result lands two sections above it while the card is replaced by the "Add something" pill again. The user finishes at the bottom of the page looking at the button they started with and the "More ways in" heading; the thing they just made is off-screen above.

### 2.3 F3 — Arriving from Training considerations (preselect)

**Trigger.** A question row on a profile ("Tapping one opens How you train with the answer filled in, ready for you to confirm, change or skip.", `TrainingConsiderationsScreen.js:151`) → `navigation.navigate('HowYouTrain', { preselect })` (`:85`).

| Q | Verdict | Evidence |
|---|---|---|
| Start | ❌ | How you train mounts at the top on the intro paragraph. The `useEffect` (`HowYouTrainScreen.js:270-288`) sets `adding = 'role'`, so the add card renders at `:1687`, below the intro, the entry rows, both section headers and any existing cards. No scroll, no focus, no announcement. To the person it looks as though tapping the question did nothing. |
| Place | ❌ | The first question shown is "Is this about how you train generally, or something temporary right now?" — asked with no reference to the condition they came from. The preselect carries `kind`/`axes`/`families`/`exerciseNames` but not the profile's own kind (`preselectFor` `TrainingConsiderationsScreen.js:60-71`; `PROFILE_KIND` on the profile is not passed), so a person who just tapped a question under a long-term condition is asked, cold, whether this is temporary. Asking is law (GC-D1, section 0.3); asking with no context and no default is the defect. |
| End / Result / Next | as F1 | — |

The same path is used by Active workout's "Work around this" (`ActiveWorkoutScreen.js:5243`), so a person mid-session who taps it is dropped at the top of a settings page with the relevant card off-screen.

### 2.4 F4 — "Your plan and how you train"

**Trigger.** The first row on the screen when `canRevisit` (`:1590-1597`), sub "Review what Volyume works around in your current plan.", with a chevron. The chevron and the row shape promise navigation to a screen.

**What happens** (`revisitCapabilityPlan` `:908-1019`): one of six outcomes. (a) The apply proposal modal for undecided rules (`:616`); (b) "Keep working around {subject}?" with the indicative report inside a question (`:855-861`); (c) a chooser modal "More than one thing to look at" (`:1014`) then (a), (b) or (d); (d) "Update your plan to match?" / "Some of your plan sits outside this" (`:1053-1056`); (e) toast "Nothing in your current plan needs a decision right now." (`:967`); (f) the could-not-read toast (`:70`).

| Q | Verdict | Evidence |
|---|---|---|
| Start | ❌ | A settings row with a chevron opens a modal or a toast, never a screen. |
| Place | ❌ | The only report of what Volyume has done ("Your sessions currently show 2 exercises swapped…", `:861`) is phrased as a question ("Keep working around X?") whose buttons are "Leave it as it is" and "Stop applying it" — a person who came to LOOK is asked to DECIDE. |
| End | ⚠️ | Dismissing the modal is a no-op by design (`:873`, "looking is not deciding") — correct, and invisible. |
| Result | ❌ | Nothing persists. The row itself appears and disappears between visits depending on `canRevisit` (`:186-191`), and is absent entirely without an active plan (`sessionEffective.js:347-348`), so the one door to "what has it done" is sometimes not there. |
| Next | ❌ | The chooser's "The others stay here for another time." (`:1016`) is the only hint that more decisions are queued; nothing on the screen counts them. |

### 2.5 F5 — Episode card: the five actions

**Trigger.** A card titled "Temporary change" (`:1665`) whose meaning is entirely in a muted 12px sub-line (`SettingsPrimitives.js:59`; `episodeSub` `:1537-1549`), followed by a wrapping strip of up to five identically-weighted pills (`:1669-1681`, `choiceCompact` `:1845`): "Done with it", "A while longer", "Still going for now" (awaiting only), "Hold my plan as-is" or "Start working around it again", "This is how I train now". Three are answers to one question ("Still need it?"); one toggles an adaptation mode; one promotes the episode to the user's permanent setup. No primary, no default, no consequence stated on any of them before the tap. Rendered from the mirror harness on 2026-09-03: five pills, two on the first line and three stacked, under a three-line grey paragraph that fuses the subject, the question and the held-mode note with a middle dot.

| Action | Start | Place | End | Result | Next |
|---|---|---|---|---|---|
| Done with it → "Back to {subject}?" → "Yes, bring it back" (`:1093-1126`) | ⚠️ three phrasings of one act (pill, title, button) | ✅ the alert body reassures well | ✅ | ⚠️ card moves to "Past" as "Ended"; a ramp toast may fire (`:1117`) | ❌ nothing says the plan builds back "over the coming weeks" anywhere but the alert body |
| A while longer (`:1670`) | ❌ no confirm | — | — | ❌ toast "Extended by two weeks…" 2.5 s; the card is unchanged because it shows no dates | ❌ |
| Still going for now (`:1674`) | ❌ | — | — | ⚠️ the "Still need it?" clause vanishes from the sub | ❌ nothing says when it will ask again |
| Hold my plan as-is (`:1679`) | ❌ the pill does not say what a hold is | — | — | ⚠️ toast; the pill relabels; the sub gains "· Holding your plan as-is; adaptation is paused, not your training" | ❌ |
| This is how I train now → "Make this part of how you train?" (`:1128-1153`) | ⚠️ | ✅ | ⚠️ | ⚠️ the card vanishes from "Temporary", a row appears in "Your setup" above | ❌ a SECOND modal may follow immediately ("Update your plan to match?", `:1145-1149`) |

### 2.6 F6 — Baseline row "Remove"

Row `:1621-1636`, control `:1631-1636` → "Stop building around {subject}?" or, for an allowance, "Stop keeping {name} in?" (`:1206-1230`) → row disappears. Start ⚠️ (pill says Remove, alert says Stop), End ✅, Result ✅ (row gone), Next ✅ (none needed). The cleanest flow on the screen because it is one tap, one confirm, one visible change. It is also the only way to change a baseline rule: there is no edit, only remove and re-enter (F1 again).

### 2.7 F7 — Past → "Start this again"

`:1734-1750` → "Keep {subject} out again?" / "From today, until you end it here." (`:1234-1296`) → toast → a card appears in "Temporary, right now" ABOVE → possibly the apply modal (`:1285`). Start ⚠️, End ⚠️, Result ❌ (lands above; the Past row stays), Next ❌ (surprise modal, as F1). Past rows say "Ended" or "Became part of your setup" with no dates and no duration (`:1742-1745`).

### 2.8 F8 — "Your data": export and delete

Export `:1179-1204` → share sheet or toast. Delete → "Delete everything here?" with a full, honest body and "Keep it" as cancel (`:1155-1177`) → toast → every section disappears. Both ✅ across the five questions. Delete is the best-designed destructive moment in the feature.

### 2.9 F9 — The consent card

"One thing first" (`:1438-1459`) appears only on a first save and is reached at tap ~10, after every disclosure has been typed into the UI. Its body is the strongest copy in the feature. Its two problems are flow problems: "I agree - store this information" is also the save and does not say so (`onConsent` `:450-460`); "Leave it for now" abandons the whole draft (`setAdding(null); setDraft(null)` `:1457`) and its sub ("You can still avoid specific exercises from Plan tools, and set your equipment - neither needs this agreement.") does not say the answers just given will be discarded. Discarding is the only honest outcome without consent; not saying so is the defect.

### 2.10 F10 — The inline per-exercise review

`renderLineReview` (`:1496-1535`) is a second inline flow that renders at the TOP of the page (`:1577`), above the entry rows, while the add flow renders near the bottom (`:1687`). A person who chose "Choose per exercise" in the apply modal is returned to the page with a new card above the fold they were not looking at, listing "{from} → {to}" lines each with Apply/Keep pills, ending in "Save my choices" / "Cancel". This flow is internally the best structured (clear list, two states per line, a real Cancel) and the worst placed.

### 2.11 F11 — Training considerations (the directory)

Search → list → in-screen profile detail (local state; a custom back row `TrainingConsiderationsScreen.js:121-129` because the page's own back chevron would leave the feature) → notes, then "Set up what applies to you" rows, then more notes → tap a question → F3. Start ✅, Place ✅ (the in-screen back is labelled), End ✅. Its only flow defect is the hand-off (F3). One structural note: on the detail page the action rows sit fourth, after the variability intro, the professional note and the clinician boundary (`:131-173`); the guidance is good and the order buries the thing the person can do.

### 2.12 F12 — Avoided movements

Read + remove list with a cross-lane line at the top. Start ✅, End ✅, Result ✅ (row gone), Next ✅. Its defects were mechanical and were fixed on 2026-09-02 (no scroll container, invisible icon chip, sub-48 targets). Two lanes still differ in page chrome (`SafeAreaView` + `BackHeader` here vs `SettingsPage` on How you train) and the cross-lane sentence ("Things your body needs training built around live under How you train.") is the kind of abstraction a first-timer reads twice.

### 2.13 F13 — Arriving from Home

Home's rows (`HomeScreen.js:2583-2661`) are the feature's best "what's next" surface: "You thought you'd be back to {subject} by about now. Still need it?" is the right sentence in the right place. Tapping it lands at the top of How you train on the intro paragraph; the card with the five pills is below the fold. "A change to how you train is waiting for your decision." lands the same way, and what happens next depends on whether `refresh()`'s passive detector fires the apply modal on arrival (`HowYouTrainScreen.js:180-186`, keyed on `lastAutoProposedKeyRef`) — sometimes a modal opens immediately, sometimes the person must find and tap "Your plan and how you train". Same row, two arrival experiences.

### 2.14 The vocabulary tax

Phrases a person must learn, none defined on screen before use: *How I train generally · Temporary, for now · A kind of movement or position · A movement pattern · A specific exercise · An exercise that is always fine for me · A clinician asked for this: no · Until I end it · Apply while it lasts · Not now · Choose per exercise · Keep it out · Decline anyway · Leave it as it is · Update my plan · Done with it · A while longer · Still going for now · Hold my plan as-is · Start working around it again · This is how I train now · kept in · Working around {x} · Temporary change · Your setup · More ways in · Stop applying it.* Each is precise inside the model and opaque outside it. "Hold my plan as-is" in particular names a mode ("adaptation is paused, not your training") that is explained only in the toast after tapping it.

### 2.15 The pattern across all thirteen

| Legibility question | Flows that fail it | Root mechanism |
|---|---|---|
| Start | F1 F2 F3 F4 F5(4 of 5) F7 F13 | Flows begin by REPLACING the control that started them, or by opening a modal from a control shaped like navigation. No flow is titled. |
| Place | F1 F2 F3 F4 F5 | No progress, no Back, no Cancel on eight of nine add stages; two inline flows in two page positions. |
| End | F1 F2 F3 F5 F7 | "Save" is followed by consent; consent is followed by a toast; the toast by a modal; the modal possibly by a card at the top of the page. Five candidate endings. |
| Result | F1 F2 F3 F4 F5 F7 F13 | Results are toasts (28) or rows that appear above the point of attention. Nothing on the resting screen changes in a way that says "this is what you just did". |
| Next | F1 F2 F3 F4 F5 F7 F13 | Follow-up demands arrive as unforeshadowed modals (13) with 2–3 co-equal buttons, and one of them records a decision on dismissal. |

---

## 3. Heuristic critique (Assessment A, reconciled by the lead)

### 3.A Design-specificity verdict

A domain-specific, deeply reasoned state machine rendered through a generic settings list. The craft is at sentence level; the screen level was never designed. The founder's complaint is the absence of a flow model and a status model, not a copy problem.

### 3.B Nielsen's ten (Operate surface) — 18/40, "Poor" band

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 1 | Episode cards show no start, no planned end, no applied/declined/undecided state (`:1537-1549`, `:1665-1667`). |
| 2 | Match to the real world | 2 | Intro is excellent plain English (`:1568-1573`); the movement-pattern stage exposes 30 taxonomy labels (`:1336-1341` ← `movementFamily.js:283-319`). |
| 3 | User control and freedom | 1 | No Cancel and no Back on eight of nine add stages; `setAdding(null)` only at `:418`, `:457`, `:1457`. |
| 4 | Consistency and standards | 2 | Two filled buttons on one alert (`AppAlert.js:167`); a chevron row that opens a modal; three phrasings per action (pill / title / button). |
| 5 | Error prevention | 2 | One transaction per save (`:385-415`) and consent fails closed, but backdrop-dismiss of the apply proposal records a decline (`AppAlert.js:78-92` + `:626-632`). |
| 6 | Recognition rather than recall | 1 | The readback restates labels only (`:1462-1484`); every mode and status is explained after the tap, in a toast. |
| 7 | Flexibility and efficiency | 2 | "Start this again" re-mints a whole group in one confirm (`:1255-1281`); nothing can be edited, only removed and re-entered. |
| 8 | Aesthetic and minimalist design | 2 | Five co-equal pills per episode; two empty states above the primary action; a 32-option list. |
| 9 | Errors: recognise, diagnose, recover | 3 | Best in the app: one could-not-read constant (`:70`), "Nothing has changed" everywhere, fail-closed announced on both platforms (`:163-169`). |
| 10 | Help and documentation | 2 | The directory's sourced "Worth knowing" notes are strong (`TrainingConsiderationsScreen.js:175-187`); nothing on How you train explains a control before it is tapped. |

### 3.C Cognitive-load checklist — 6 of 8 fail

Fails: one primary action per screen; ≤ 7 options at a decision; progress visible in a multi-step flow; confirmation restates the decision; resting state readable without tapping; vocabulary needs no learning. Partial: reversibility obvious. Pass: one phrase per meaning (deliberately enforced, `:1010-1013`, `:1061-1065`).

### 3.D Emotional journey

- **Consent** — warm and honest, at the wrong moment (tap ~10) and doubling as the save without saying so.
- **First save** — the best sentence in the feature (`:425`) delivered for 2.5 s in three clamped lines, then gone.
- **The "still going?" check-in** — the coldest moment: a person whose injury has not healed reads "You thought this would be done by about now. Still need it?" in the smallest, most muted text on the page, then faces five buttons with no ordering and no reassurance that "still" is normal. The ENDING path reassures ("Nothing from this period is lost.", `:1097`); the continuing path does not.
- **Delete** — well handled (`:1156`, "Keep it" as cancel, honest failure copy `:1167`).

### 3.E Genuine strengths (preserve in any redesign)

1. **The honesty vocabulary.** A failed read is never rendered as "nothing to do": one shared constant, fail-closed announced on both platforms, a distinct Home line, `summary.checked` gating every vacuous write (`:591-596`). Most consumer apps fail open here.
2. **Named-subject phrasing.** `phrase.js` turns stored rules back into the user's own words and refuses to invent or invert a name (`phrase.js:140`, `:154`), so confirms read "Back to overhead work with your right shoulder?" rather than "Has it ended?".
3. **Cross-lane discipline.** Preference and capability never borrow each other's verbs and each points at the other in plain words (`:1725-1727`; `AvoidedMovementsScreen.js:116-118`; `ExercisePickerModal.js:171-176`).
4. **Delete and the per-line review** are correctly shaped flows (a real Cancel, a visible list, one confirm) and show the feature already knows how to do this.

### 3.F Persona red flags (specific)

- **Jordan (first-timer):** reaches "Add something" only after two "nothing here" cards; is asked the generally-vs-temporary question before being told why it matters; learns at tap 10 that this is health data; is asked "Apply this to your current plan?" about a plan he has not thought about, with two filled buttons and no default.
- **Sam (screen reader):** opening the add flow moves no focus and announces nothing; multi-select axes are `accessibilityRole="button"` with `selected` state, not checkboxes, and no count is announced on toggle (`:1783-1784`, `:1393-1396`); episode rows are a non-pressable `View` whose label is the generic "Temporary change" (`SettingsPrimitives.js:25-35`), so the caption that carries the meaning may or may not be reached depending on platform grouping; toast timing is not extended for screen readers except the `undo` variant (`Toast.js:161`). For a feature built for disabled users, this is the persona that fails worst.
- **Casey (one-handed, interrupted):** five wrapping pills make an accidental "This is how I train now" plausible; a stray backdrop tap during the apply alert silently declines; the 2.5 s toast is the only receipt.
- **Priya (long-term wheelchair user, first setup):** correctly never sees "injury" on her rows. Her natural entry (directory → "wheelchair") drops her at the top of a page with the question card off-screen (F3). Once saved, her rows offer only "Remove", and nothing persistent confirms her plan was ever rebuilt around her: `proposeCapabilityPlanRewrite` fires once as an alert (`:1056-1087`) and leaves nothing behind. For the person with the highest stake, the resting screen is the least informative.
- **Tom (mid-programme, fresh shoulder strain):** best served. The side question with its reassurance about one-sided work (`:1409-1413`) is excellent and the workout summary tells him what happened. His gaps are "when will it ask again?" (never shown), "A while longer" changing nothing visible, and the accidental-decline risk.

---

## 4. Findings register

Severity per the critique scale: P0 blocks or silently corrupts the task; P1 causes significant difficulty or confusion; P2 annoyance with a workaround; P3 polish. Each has a DIRECTION (one sentence, not a design) for the redesign session.

| ID | P | Finding | Evidence | Direction |
|---|---|---|---|---|
| HYT-01 | P0 | **Dismissing the apply proposal records a decline.** Backdrop tap or Android Back on "Apply this to your current plan?" runs the cancel slot's handler, which is `declineNow()`, writing `declined` against every rule of the new episode and toasting "Kept as recorded…". The person was trying to get back to the page. | `AppAlert.js:24-30` (`options ?? {}` → cancelable), `:78-92`; `HowYouTrainScreen.js:626-632`, `:609-615`. Contrast `:873` ("looking is not deciding") protecting the later dialogue. | Pass `{ cancelable: false }` on every proposal that records a choice, or move the recording action off the cancel slot. This is a one-line correctness fix that should land before any redesign. |
| HYT-02 | P0 | **No flow is titled, stepped, or cancellable.** The add flow replaces its own button with an untitled card; nine stages carry no progress, no Back on eight, no Cancel until consent; leaving the screen preserves the half-finished card. | `:1687`; transitions `:295-371`; `setAdding(null)` only at `:418`, `:457`, `:1457`; `:206`. | Give every multi-step flow a titled container with a step count, a persistent Back and Cancel, and a stated end ("Last step"). |
| HYT-03 | P0 | **Results land out of view and in transients.** The saved row appears two sections above the add card; the confirmation is a 2.5 s three-line toast (182 chars truncates); nothing on the screen changes in a way that says "this is what you just did". | `:418-429`; `Toast.js:105-106`, `:261`; render order `:1577-1760`. | End every flow on the thing it made: scroll to and highlight the new row, and write the save sentence onto that row as its persistent status line, with the toast as an echo. |
| HYT-04 | P0 | **Follow-up demands are unforeshadowed modals.** "Save" is followed by consent, then a toast, then possibly the apply modal (3 buttons, 2 filled), then possibly an inline review at the top of the page. Five candidate endings; the readback never says "next, Volyume will ask whether to apply this to your plan". | `:371`, `:450-460`, `:616-685`, `:1577`, `AppAlert.js:167`. | Fold the plan question INTO the flow as its last step (a titled card: "Apply to your current plan?" with one primary), and tell the person it is coming on the readback. |
| HYT-05 | P1 | **Episode and baseline cards carry no dates and no outcome.** `startsAt`, `endsAt`, `effectiveChoice`, `adaptationMode` exist in the model and none is rendered; every episode is titled "Temporary change"; two episodes are indistinguishable; "A while longer" changes nothing visible. | `:1537-1549`, `:1665-1667`, `:1670`; `model.js`; `store.js:39-70`. | A status card per entry: the subject as the title, "Since 20 Aug · you said about two weeks", one state chip (Working around it / Not applied / On hold / Checking with you), one line of what changed in the plan. |
| HYT-06 | P1 | **The readback does not read back the decision.** It lists rule labels only; permanent-vs-temporary, the dates, the side and the clinician flag are never confirmed. | `:1462-1484`. | A three-line summary (what · how long or permanent · who asked) with each line tappable to go back and change it. |
| HYT-07 | P1 | **Arriving with a preselect looks like nothing happened.** From the directory or Active workout, the page mounts at the top and the add card renders below the fold with no scroll, focus or announcement, and asks the role question with no reference to where the person came from. | `:270-288`, `:1687`; `TrainingConsiderationsScreen.js:60-71`, `:85`; `ActiveWorkoutScreen.js:5243`; one announcement in the file (`:163-169`). | Scroll the card into view, announce it, title it "From {condition}", and pre-select (not skip) the role the profile's kind suggests. |
| HYT-08 | P1 | **"Your plan and how you train" is a chevron row that opens one of six modals or toasts,** phrases its only report as a question, and disappears between visits. | `:908-1019`, `:1590-1597`, `:855-861`, `:1014`, `:967`; `sessionEffective.js:347-348`. | Make "what Volyume has done to your plan" a readable section or screen (indicative, no buttons required), with decisions offered from it rather than instead of it. |
| HYT-09 | P1 | **Five co-equal actions per episode card**, three answering one question, one a mode, one a promotion; no primary, no consequence stated before the tap. | `:1669-1681`, `:1845`; render 2026-09-03. | Two visible answers to the one question the card is asking ("Still going" / "Done with it"), the rest behind "More", each with a one-line consequence. |
| HYT-10 | P1 | **The consent button is also the save, and declining silently discards the draft.** | `:450-460`, `:1457`, `:1456`. | Say both: "Agree and save"; "Leave it for now — your answers here won't be kept". |
| HYT-11 | P1 | **Screen-reader users get no flow at all.** No focus management, no announcements for any step, multi-selects as buttons, the meaning-bearing caption on a non-pressable row. | `:163-169` (only announcement), `:1783-1784`, `:1393-1396`; `SettingsPrimitives.js:25-35`; `Toast.js:161`. | Announce each step's question on mount, set focus to the card, use checkbox roles for multi-select, put the subject in the row's accessible label. |
| HYT-12 | P2 | **"A movement pattern" exposes the internal taxonomy**: 30 alphabetical labels including "anti-extension core work", "straight-arm pulldown work", "brachialis work". | `:1331-1346` ← `movementFamily.js:283-319`. | Group under body areas and lead with the eight or so patterns a lay person would name. |
| HYT-13 | P2 | **Two inline flows in two page positions**: the add flow at the bottom, the per-line review at the top. | `:1577`, `:1687`. | One inline-flow slot, or a sheet. |
| HYT-14 | P2 | **Every route in lands on the intro paragraph**, twelve routes, none targeted; the passive detector sometimes fires a modal on arrival and sometimes does not. | section 1.2; `HowYouTrainScreen.js:180-186`. | Route to the relevant card and make arrival deterministic (never auto-open a modal on focus; show the pending decision as a card). |
| HYT-15 | P2 | **Past is a list of endings without a history**: "Ended" / "Became part of your setup", no dates, no duration. | `:1742-1745`. | "{subject} · 20 Aug to 12 Sep · you ended it". This is also the record a person would show a physio. |
| HYT-16 | P2 | **The primary action is fifth on an empty screen** and styled like every option pill. | `:1612-1617`, `:1646-1651`, `:1689`, `:1834-1843`. | Use the shared `Button`, directly under the intro when the screen is empty; collapse the two empty states into one invitation. |
| HYT-17 | P2 | **Three phrasings per action** (pill / alert title / confirm button): Done with it → Back to X? → Yes, bring it back; Remove → Stop building around X? → Remove; This is how I train now → Make this part of how you train? → This is how I train now. | `:1093-1153`, `:1206-1230`. | One phrase per action carried through pill, title and button. |
| HYT-18 | P2 | **Free users never get the follow-up.** The weekly "How did you get on training without X?" is inside the Pro-gated check-in, so a free user's only "what's next" is the awaiting caption. | `WeeklyCheckInScreen.js:1280-1294`; `RootNavigator.js:221`. | The episode card and Home's awaiting row must carry the whole follow-up for free users (they nearly do; see HYT-05). This touches free/Pro law only if the redesign proposes moving the question, which it need not. |
| HYT-19 | P3 | "More ways in" is a heading that means nothing to a user; "A clinician asked for this: no" is a stateful label used as a toggle. | `:1690`, `:1342`, `:1379`, `:1397`. | Rename the section ("Related"); make the clinician control a labelled switch. |
| HYT-20 | P3 | The two cross-linked lanes still differ in page chrome. | `AvoidedMovementsScreen.js:104-105` vs `HowYouTrainScreen.js:1552`. | Put Avoided movements on `SettingsPage` once its guard's `BackHeader` pin is re-anchored to intent. |

---

## 5. What the resting screen must be able to show

The secondary complaint, and the mirror of section 2: flows leave no trace because the screen has no vocabulary for state. Everything below is already in the model (`model.js`, `store.js:39-70`, `sessionEffective.js`) and none of it is rendered.

| Fact | Available as | Rendered today |
|---|---|---|
| What the rule is | `ruleLabel(row)`, `subjectPhrase` | ✅ baseline label; episode in a muted sub |
| Permanent or temporary | `row.role` | ⚠️ by section only |
| Since when | `row.startsAt` | ❌ |
| Planned end / "you said about two weeks" | `row.endsAt` | ❌ (used only for the awaiting clause) |
| Who asked (self / clinician-reported) | `row.source` | ✅ baseline sub; ❌ episodes |
| Applied to the plan / not applied / undecided | `row.effectiveChoice` | ❌ |
| On hold | `row.adaptationMode` | ⚠️ one appended clause |
| Checking with you (past planned end) | `ep.status` | ⚠️ one appended clause |
| What changed in the plan (N swapped, N left out) | `computePlanEffectiveSummary` | ❌ on this screen (Workout summary has it) |
| Plan rebuilt around a permanent rule / declined | `computeCapabilityPlanRewrite` outcome | ❌ (alert once, then nothing) |
| Building back up (ramp) | `reintroduction` | ❌ here (Home has a line) |
| Ended when, how long it lasted, why it ended | `endedAt`, `startsAt`, `endedReason` | ❌ ("Ended") |

---

## 6. Prior-audit reconciliation

_(populated from the history extraction; see 6.1–6.4 below)_

---

## 7. Constraints for the redesign session

1. Everything in section 0.3 is law. Several are pinned by source-regex tests that read exact strings and exact positions; changing a pinned string or moving a pinned element fails the suite, which is the intended signal to stop and ask.
2. The guard suites most likely to bite a UI redesign: `HowYouTrainScreen.capabilityFlows.guard.test.js` (27 tests), `HomeScreen.capabilityVisibility.guard.test.js` (20), `capabilityVocabulary.guard.test.js` (9), `capabilityCopyLeakage.guard.test.js` (7), `AvoidedMovementsScreen.crossLane.guard.test.js` (4), `capabilityTouchTargets.guard.test.js` (enumerated floors), `ActiveWorkoutScreen.workAroundPreselect.guard.test.js` (8), `ActiveWorkoutScreen.sideCarveNote.guard.test.js` (28). Read each header before touching its surface; re-anchor a guard to its INTENT (with a header note saying what changed and why) rather than deleting it.
3. HYT-01 is a correctness fix, not a design change. Land it first, alone, with its own test.
4. `appAlert` is a shared component; do not change its backdrop semantics globally. Pass options per call.
5. No new dependencies (a step indicator, a bottom sheet, a segmented control) without asking; the shared `Button`, `Card`, `SettingRow`, `TextField`, `EmptyState`, `Chip` and the existing sheet components are available.
6. British English, no em dash in user-facing copy, calm voice (`COACHING_VOICE_SYNTHESIS_LOCKED.md`).
7. Any change that touches weight, food or notifications is out of this lane. Nothing here does.
8. The founder device-walks from a phone on an EAS build; every landed change ships with a numbered device checklist.

---

## 8. Open questions for the founder

These are product forks the redesign will hit; none is pre-decided here.

1. **Container for flows.** (a) Keep the add flow inline on the page but titled, stepped and cancellable; (b) move it to its own screen (a wizard pushed onto the stack); (c) a bottom sheet. Inline was chosen in CC26 to avoid modal focus problems for screen readers (`HowYouTrainScreen.js:8-10`); a pushed screen has none of those problems and gives the flow a title, a back button and a place by construction.
2. **Where plan decisions live.** (a) Keep them as modals but foreshadowed and non-dismissable-into-a-decision; (b) make them the last step of the flow that caused them; (c) make them cards on the screen that sit until answered (no modals in this feature at all). The per-line review already proves (c) works.
3. **The episode card's question.** (a) Two visible answers ("Still going" / "Done with it") with the rest behind "More"; (b) all five visible but ranked; (c) the check-in becomes its own screen when it is due.
4. **Editing.** Today a baseline rule can only be removed and re-entered. Should the redesign add edit (tap a row → the readback with changeable lines), or is remove-and-re-add acceptable?
5. **Consent placement.** Keep it at the save (current law: consent gates the write) or move the same words to the door (first "Add something") so the person consents before disclosing? Both satisfy the fail-closed rule; the second changes when in the flow it is read.

---

## 9. Provenance

- Assessment A: Opus, isolated, 50 tool uses, journeys J1–J7, blind to prior audits by design.
- Assessment B: Haiku, isolated, detector + 11 mechanical extractions, raw.
- History extraction: Sonnet, read-only, sections 6.1–6.4.
- Lead: read every state-bearing mechanism in `HowYouTrainScreen.js` (lines 159–1298 and 1537–1760), `model.js`, `phrase.js`, `store.js:39-99`, `weekNote.js`, `HomeScreen.js:2560-2665`, `homeCoachBrief.js:21-25`, `ActiveWorkoutScreen.js:978-1043`, `AppAlert.js:24-92`, `:160-175`, `Toast.js:100-110`, `:255-265`; verified every P0/P1 claim from Assessment A against source before including it; rendered the empty and returning-user states with the mirror harness (`scratchpad/render/spec-hyt.cjs`, `spec-hyt-return.cjs`).
- Detector: `detect.mjs` returned `[]` on all five files; recorded as a known RN false negative, not as evidence of cleanliness.
- Not done: no device walk (no simulator; the founder walks from a phone), no real-user session. REAL-DISABLED-USER-VALIDATED remains as the campaign records it (section 6.4).
