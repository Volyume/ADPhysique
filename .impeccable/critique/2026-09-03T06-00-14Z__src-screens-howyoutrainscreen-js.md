---
target: How you train feature (HowYouTrainScreen + TrainingConsiderations + AvoidedMovements)
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 4
p1_count: 7
timestamp: 2026-09-03T06-00-14Z
slug: src-screens-howyoutrainscreen-js
---
# How you train — flow audit (2026-09-03)

**Founder brief, verbatim, in order.**
1. *"audit the How You Train feature fully ... I don't believe it's at all intuitive and easily understandable at the moment. It's not clear what's been done what is next and so on."*
2. *"It's when you click on one thing like Add Something, it's not clear what or if you have to do anything next. There's no clear understandable flow that a normal human will understand. It's not easy to comprehend. It doesn't flow right and that's in each of them."*
3. *"It was not a design review. It was flow, understood easily, easily led. Clear and easy for users to see what they have to do next and what happens next at each stage. It just seems bolted together."*

**What this document is.** A stage-by-stage trace of every flow in the feature, scored on whether a person can see what to do and what will happen next, with the evidence for why it feels bolted together. It is written for the session that will redesign the flows. It is not a design and it is not a heuristic critique; the heuristic material the method produced is kept in Appendix A as context only.

**Tree.** Commit `6fedf6a5` (main, 2026-09-02). Every claim carries `file:line`; lines drift, quoted strings do not, so search by string when a line has moved. Bare `:NNN` means `src/screens/HowYouTrainScreen.js`.

**Method.** Every state-bearing mechanism read hands-on by the lead; one isolated Opus design-review pass whose journey traces were verified against source before use; one Haiku pass for raw counts, routes and strings; one Sonnet pass extracting the prior audits and the original spec; two screen states rendered through the mirror harness. Every P0 and P1 claim below was checked against the source by the lead before inclusion.

---

## 0. The answer

### 0.1 In five lines

1. No flow in this feature tells the person that it has started, how long it is, where they are, when it ends, or what will happen after they act. Eleven of thirteen flows fail at least three of those five; the add flow fails all five (section 1.1).
2. Every transition is communicated by one of 13 modal dialogs or 28 transient toasts, and by nothing on the screen itself. The screen shows names of rules and a generic word ("Temporary change"); it does not show dates, applied-or-not, on-hold, or what changed in the plan (section 3).
3. It feels bolted together because it was: the screen carries 87 provenance comments naming 10 audit findings and 8 review rounds, and 25 separately-landed pieces, each closing one finding, are attached to a flow that no commit ever designed (section 0.2).
4. The original specification asked for a flow, with time remaining, a one-sentence readback with details, an edit action, a decaying badge and "never a modal ambush". Those were not built; the mechanisms beneath them were (section 0.3).
5. One of the bolts is a correctness defect: dismissing the "Apply this to your current plan?" dialog by tapping outside it or pressing Android Back records a decline against every rule of the change (HYT-01). Fix that first, alone.

### 0.2 Why it feels bolted together, provably

`HowYouTrainScreen.js` is 1,880 lines. Its own comments cite, by name, the campaign, review round or audit finding that added each piece: 87 such references, 10 distinct T1/T2 finding ids closed in this one file, and rounds 2, 3, 4, 5, 6, 7, 8 and 14 (counted 2026-09-03: `grep -c` over the provenance patterns). Each piece below was landed to close a specific finding. No commit in the history designed the flow they attach to; the add flow is the CC26 shape with everything since attached at its edges.

| Piece the person meets | Landed by | Attached where |
|---|---|---|
| Add flow: role → kind → axes → dates → readback → consent | CC26 (`:1-15`) | the original |
| Kind stage grows from 1 option to 4 (pattern, exercise, "always fine for me") | CC27, ruling CC-D27 (`:46`, `:127`) | inside the kind stage |
| "Which shoulder?" side stage | 2026-08-21 (`:127` "'side' added 2026-08-21") | between rule and dates, only for some axes |
| "Apply this to your current plan?" modal | CC29 §14 (`:420-427`) | fires after the save toast |
| The fail-safe information alert inside it | rounds 7 and 8, R7-4 / R8-2 (`:565-580`) | inside the modal |
| The clinician confirm with three wording frames | D112 R6 + round 5 Q-2 (`:462-495`) | inside the modal's decline |
| "Choose per exercise" third button and the review card | D112 R4, closes T2-23 (`:1493-1495`) | button in the modal; card at the top of the page |
| "Your plan and how you train" row and its six outcomes | D112 R4 (T2-23), then R3-2, R5-6, R5-9, R6-3, R7-4, R8-2, J4, C1 (`:908-1019`) | first row on the screen |
| The proposal firing by itself on screen focus | T1-06 (`:170-186`) | `refresh()` |
| "Update your plan to match?" modal for permanent rules | D112 R1a, closes T1-03 (`:430-434`) | after a permanent save |
| The same modal after "This is how I train now" | D112 R1b, closes T2-01 (`:1138-1149`) | after the promote confirm |
| "Hold my plan as-is" / "Start working around it again" | D112 R8, closes T2-26 (`:1652-1657`) | fourth pill on the episode card |
| "Still going for now" | §33.7's third option (`:1672-1673`) | third pill, awaiting only |
| "Start this again" on Past rows | CC31 §20 (`:1232`) | Past |
| The reintroduction ramp toast on ending | CC31 §23 (`:1103`) | inside the end confirm |
| Arriving pre-filled from Training considerations | gap-closure Phase D, GC-D1 (`:262-266`) | mounts the add flow at "role" |
| Arriving pre-filled from a workout ("Work around this") | D112 R4, closes T2-11 (`ActiveWorkoutScreen.js:1049`) | the same |
| Home's five quiet rows | D112 R5 (T1-14, T2-31, T1-15, T2-24, T2-25), review E1, round 9 B4 (`HomeScreen.js:2560-2661`) | Home |
| "My energy varies…" row | CC28 §33.12 + T2-27 (`:1691-1700`) | "More ways in" |
| "Movements you would rather not do" row | D112, closes T1-20 (`:1703-1712`) | "More ways in" |
| Named subjects in every toast and alert | natural coach-language order, 2026-08-21 (`:216-222`) | every dialog |
| "Leave it for now" wording on consent | round 14 R14-3 (`:1451-1455`) | consent card |
| Export | CAP-20 / R1 #22 (`:1175-1178`) | "Your data" |
| The intro paragraphs and both empty states | CC33 close-out (`:1557-1562`) | top of screen |
| The visual system (cards, rows, field, targets) | restyle 2026-09-02, commits `be4c7c7e`, `6fedf6a5` | everywhere |

Twenty-five pieces. Read down the "attached where" column: a modal, a button inside a modal, a card at the top of the page, a row at the top of the screen, a pill on a card, a toast inside a confirm. That is the shape of a thing grown by closing findings, and the prior audit's definition of done was exactly that: "every finding raised is closed at mechanism level" (`docs/injury-disability-audit-2026-08-28/SCORECARD.md:41-45`). Nothing in that definition asked whether a person could follow the result. The founder's device walk (the item that scorecard marks X2 PENDING) is this complaint.

### 0.3 The spec asked for a flow and got mechanisms

From `docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md`, verbatim, against what is built:

| The specification says | Built | Gap |
|---|---|---|
| §12: "Active temporary restrictions with **time remaining / 'until you end it'**" | No date is rendered anywhere on the episode card (`:1537-1549`, `:1665-1667`) | HYT-05 |
| §12: "an expired-but-unconfirmed episode shows as **'waiting for you to confirm'**" | One clause appended to a muted 12px caption: "You thought this would be done by about now. Still need it?" (`:1546`) | HYT-05, HYT-09 |
| §12: "Baseline list (**edit** = supersede; end)" | End only. There is no edit; a rule is removed and re-entered (`:1206-1230`) | HYT-21 |
| §22: "the confirm prompt appears on Today/settings, **never a modal ambush**" | The apply proposal is a modal that fires 0–2 s after the save and again on screen focus (`:616`, `:180-186`) | HYT-01, HYT-04 |
| §33.7: "prompts appear at day 0 and day 7, then **decay to a settings badge** only" | No badge exists; the caption clause is permanent until answered | HYT-05 |
| §33.16: "the confirmation readback is **ONE grouped sentence + 'view details'**, never a rule recitation" | The readback is a rule recitation with no details: "Volyume will temporarily work around: a, b, c." (`:1478-1484`) | HYT-06 |
| §14: "Applies/Declines the diff as a whole **or per line**" | Built (D112 R4), as a third modal button and a card at the top of the page | HYT-04, HYT-13 |
| D112 coherence commitment 5: "**entry points live where the need shows**" | Built (Home, summary, picker, workout), and every one lands on the intro paragraph | HYT-14 |

### 0.4 What is law (not findings; the redesign keeps every one)

| Law | Pinned by |
|---|---|
| Long-term condition or disability = the user's normal BASELINE, open-ended. Temporary injury or limitation = an EPISODE. The two never blur. | `model.js:17-23`; `capabilityGuards.test.js` |
| *Injury*, *restricted*, *modified* never appear on a baseline row. Temporary framing only on episodes. | `:5-10`; `capabilityVocabulary.guard.test.js`; `capabilityCopyLeakage.guard.test.js` |
| Diagnosis and naming are optional. The directory is stateless discovery (GC-D1); the person still answers permanent-or-temporary, dates, consent and readback themselves. | `TrainingConsiderationsScreen.js:1-16`; `capabilityDirectoryDiscovery.test.js` |
| User intent is authoritative. Every plan effect is proposed and confirmed; declining leaves the affected rows visibly marked with a swap shortcut. | `:507-520`, `:616-685`; `sessionEffective.serveGuard.test.js` |
| Article 9 consent gates every write, fails closed, cannot be skipped. | `store.js:89-93`; `capabilityConsent.test.js` |
| Free tier (CAP-19). | `capabilityGuards.test.js`; `capabilityRoutesReachable.test.js` |
| One phrase per meaning: "Not now" only on the button that DECLINES; "Leave it as it is" is the no-op. | `:1010-1013`, `:1061-1065`; `HowYouTrainScreen.capabilityFlows.guard.test.js` |
| A failed read is told, never rendered as "nothing to do". | `:70`, `:163-169`; `HomeScreen.js:2656-2661` |
| The cross-lane sentence on Avoided movements: exact string, tap target and position. | `AvoidedMovementsScreen.crossLane.guard.test.js` |
| Every control on these surfaces ≥ 48dp, enumerated. | `capabilityTouchTargets.guard.test.js` |
| Deterministic engine; no AI. | `CLAUDE.md` §2 |

---

## 1. Stage by stage

Each stage is scored on the five things a person needs without knowing they need them:

- **Sees** — what is on screen (quoted).
- **Must do** — the action required.
- **Told what it does** — does the screen say, before the tap, what the action will do?
- **Told what's next** — does the screen say what comes after?
- **Stop / back** — can they cancel or step back from here?

✅ yes · ⚠️ partly or only after the tap · ❌ no.

### 1.1 Adding something (the main flow, 8 to 11 stages)

Temporary-shoulder path: 11 taps, 7 decisions (permanent-or-temporary, kind, which movement, which side, since when, how long, apply to plan) plus consent. Nothing in the flow states its length. Stages 4, 5, 9 and 10 are conditional and appear without warning.

| # | Stage | Sees | Must do | Told what it does | Told what's next | Stop / back | Verdict |
|---|---|---|---|---|---|---|---|
| 0 | The button | "Add something", a tinted pill (`:1689`), the fifth block on an empty screen after two paragraphs, two rows, "Your setup: Nothing here yet" and "Temporary, right now: No temporary changes" (`:1567-1651`) | tap | ❌ add what? | ❌ | – | ❌ the invitation is the fifth thing on the page |
| 1 | Permanent or temporary | The pill vanishes; a card asks "Is this about how you train generally, or something temporary right now?" with two pills and subs (`:1302-1306`) | pick one | ✅ the subs explain both ("Part of your normal setup…", "Volyume takes it as a passing change…") | ❌ | ❌ no back, no cancel | ⚠️ good question, no frame: no title, no "step 1 of", no way out |
| 2 | Kind | "What kind of thing is it?" with 3–4 pills (`:1314-1325`) | pick one | ⚠️ "A kind of movement or position" vs "A movement pattern" are not distinguishable by a lay reader; the subs help | ❌ | ❌ | ⚠️ |
| 3a | Which movements (kind = position) | "What should Volyume build around?" / "Pick anything that applies. You never need to say why." + 10 toggles + "A clinician asked for this: no" + Continue, disabled until one is on (`:1388-1402`) | toggle ≥ 1, Continue | ❌ no per-item explanation; the clinician toggle reads as a statement | ❌ | ❌ | ⚠️ 12 options |
| 3b | Which patterns (kind = pattern) | "Which movement patterns?" + 30 alphabetical toggles ("anti-extension core work", "brachialis work", "straight-arm pulldown work"…) + clinician + Continue (`:1328-1347` ← `movementFamily.js:283-319`) | toggle, Continue | ❌ | ❌ | ❌ | ❌ 32 options in the internal taxonomy |
| 3c | Which exercise (kind = exercise / always fine) | "Which exercise should Volyume build around?" + search field + chosen + matches + clinician + Continue (`:1350-1385`) | search, tap, Continue | ✅ the search is clear | ❌ | ❌ | ⚠️ Continue is disabled with no hint saying why |
| 4 | Which side (only for some movements) | "Which shoulder?" (or hand, wrist, arm, leg) + "If it is one side, Volyume can still include movements you can do one side at a time…" + Left / Right / Both (`:1405-1417`) | pick one | ✅ the best-explained stage | ❌ | ❌ | ⚠️ good stage, unannounced |
| 5 | Dates (temporary only) | "Since when?" 3 pills + "Roughly how long?" / "A rough guess is fine. Volyume will check with you rather than assume." 4 pills + Continue; Today and "Until I end it" pre-selected (`:85-95`, `:1420-1435`) | confirm or change, Continue | ✅ the hint is the ONE place in the flow that says what Volyume will do later | ❌ | ❌ | ⚠️ 8 pills on one card |
| 6 | Readback | "Volyume will temporarily work around: overhead work with your right shoulder." + Save + Back (`:1461-1489`) | Save | ⚠️ names the rules; does not restate temporary-or-permanent, the dates, the side or the clinician answer | ❌ Save is not the end, and nothing says so | ✅ the only stage with Back | ❌ the confirmation does not confirm the decisions |
| 7 | Consent (first save only) | "One thing first" + a paragraph + "I agree - store this information" + "Leave it for now" with sub (`:1438-1459`) | agree or leave | ❌ "agree" is also the save and does not say so (`:450-460`); "leave" discards everything just entered and does not say so (`:1457`) | ❌ | ⚠️ leave = discard, unstated | ❌ the person pressed Save and is asked a different question |
| 8 | After the save | The card vanishes. A toast for 2.5 s, three lines max, 182 characters (`:419-429`; `Toast.js:105-106`, `:261`). The new row appears two sections ABOVE, unhighlighted | nothing | ⚠️ the toast says it well and is gone | ⚠️ the toast's "end this here" is the only forward statement, and it truncates | – | ❌ the result lands out of view and in a transient |
| 9 | Apply to your plan (only if a plan exists and the change touches it) | 0–2 s later, unforeshadowed: "Apply this to your current plan?" + "While overhead work with your right shoulder is out, your sessions would show 2 exercises swapped…" + Not now / Apply while it lasts / Choose per exercise, two of them filled (`:616-685`; `AppAlert.js:167`) | pick one | ⚠️ the body is clear; "Not now" declines but reads as postpone; **tapping outside or Android Back declines** (`AppAlert.js:78-92` + `:626-632`) | ❌ | ❌ dismiss = decide | ❌ P0 |
| 9′ | Update your plan (permanent rules) | "Update your plan to match?" + Leave it as it is / Update my plan (`:1056-1087`), or an OK-only "Some of your plan sits outside this" (`:1053`) | pick one | ✅ well named | ❌ | ✅ cancel is a no-op | ⚠️ still an unannounced modal |
| 10 | Choose per exercise (if chosen) | A new card at the TOP of the page (`:1577`): "Choose per exercise" + hint + one line per exercise "{from} → {to}" with Apply / Keep + Save my choices / Cancel (`:1496-1535`) | flip lines, save | ✅ | ✅ Save my choices ends it | ✅ Cancel | ⚠️ the best-formed stage, in the wrong place |

Ways out of the flow, in the whole file: successful save (`:418`), consent-save failure (`:457`), consent "Leave it for now" (`:1457`). Leaving the screen does not end it; the half-finished card is there on return (`useFocusEffect(refresh)` `:206` never resets `adding`).

### 1.2 Being asked "Still need it?" (the check-in card)

A card titled "Temporary change" (`:1665`). Everything that matters is in a muted 12px caption: the rule names, then when past its planned end "…You thought this would be done by about now. Still need it?", then when on hold "· Holding your plan as-is; adaptation is paused, not your training" (`:1537-1549`, `:1666`; rendered 2026-09-03: a three-line grey paragraph). Below it, up to five identically weighted pills (`:1669-1681`).

| Pill | Told what it does before the tap | What happens | Told after | Verdict |
|---|---|---|---|---|
| Done with it | ❌ | Confirm "Back to {subject}?" / "Everything comes back straight away, and training builds back up to your plan over the coming weeks. Nothing from this period is lost." → Yes, bring it back (`:1093-1126`) → card moves to Past → maybe a ramp toast | ✅ in the confirm | ⚠️ three phrasings for one act |
| A while longer | ❌ how much longer? | No confirm. Toast "Extended by two weeks. Volyume will check in about {subject} around then." (`:1670`). The card is unchanged, because it shows no dates | ⚠️ 2.5 s | ❌ |
| Still going for now (awaiting only) | ❌ | Toast "Noted. Volyume will keep {subject} out until you end it here." (`:1674`). The "Still need it?" clause disappears | ⚠️ | ⚠️ |
| Hold my plan as-is | ❌ what is a hold? | Toast "Volyume is holding your plan as-is for this. Adaptation is paused, not your training." (`:1679`). The pill relabels; the caption gains a clause | ⚠️ explained after | ❌ |
| This is how I train now | ❌ | Confirm "Make this part of how you train?" (`:1128-1153`) → card leaves "Temporary", a row appears in "Your setup" above → possibly a SECOND modal "Update your plan to match?" (`:1145-1149`) | ✅ then ❌ | ⚠️ two modals |

Three pills answer the caption's question, one changes a mode, one changes the person's permanent setup. No primary, no order, no consequence stated on any. The question they answer is not a heading; it is the last clause of the caption.

### 1.3 Looking at what Volyume has done ("Your plan and how you train")

The first row on the screen when there is anything to look at (`:1590-1597`): "Your plan and how you train" / "Review what Volyume works around in your current plan." with a chevron. A chevron promises a screen.

| Tap outcome (`revisitCapabilityPlan` `:908-1019`) | What the person sees | Verdict |
|---|---|---|
| Undecided rules exist | the stage-9 modal | ❌ came to look, asked to decide |
| Applied rules produce lines | "Keep working around {subject}?" / "Your sessions currently show 2 exercises swapped for something that works now, and 1 left out…" + Leave it as it is / Stop applying it (`:855-861`) | ❌ the only report of what was done is phrased as a question |
| More than one of the above | "More than one thing to look at" / "Each of these affects your current plan. Pick one to review. The others stay here for another time." + one button per item (`:1014-1018`) | ⚠️ |
| Permanent rules do not match the plan | "Update your plan to match?" (`:1056`) | ⚠️ |
| Nothing | toast "Nothing in your current plan needs a decision right now." (`:967`) | ⚠️ |
| Read failed | toast "Volyume could not read your plan just now…" (`:70`) | ✅ honest |

The row itself comes and goes between visits (`canRevisit`, `:186-191`) and is absent without an active plan (`sessionEffective.js:347-348`), so the one door to "what has it done" is sometimes not there.

### 1.4 Arriving from somewhere else

Twelve routes lead in (section B of the mechanical maps: Settings `SettingsScreen.js:46`; Home ×3 `HomeScreen.js:2588`, `:2606`, `:2624`; Pro onboarding `ProOnboardingScreen.js:2163`, `:1555`; Free starter `FreeStarterScreen.js:380`; Workout summary `WorkoutSummaryScreen.js:1629`; Active workout `ActiveWorkoutScreen.js:5243`; Conflict sheet `ExerciseConflictSheet.js:178`; Picker `ExercisePickerModal.js:439`; Avoided movements `:111`; Training considerations `TrainingConsiderationsScreen.js:85`). Every one lands at the top of the screen on the intro paragraph. There is no scroll-to, no highlight, and one accessibility announcement in the file, reserved for the fail-closed notice (`:163-169`).

| From | What was promised there | Where you land | Verdict |
|---|---|---|---|
| Training considerations, a question row | "Tapping one opens How you train with the answer filled in, ready for you to confirm, change or skip." (`TrainingConsiderationsScreen.js:151`) | The intro. The add card mounts at stage 1 (`:270-288`) BELOW the intro, the rows, both headers and any existing cards, off-screen, and asks "generally, or temporary?" with no mention of the condition just chosen (the preselect carries no role: `TrainingConsiderationsScreen.js:60-71`) | ❌ looks like nothing happened |
| Active workout, "Work around this" | a way to note the thing just hit mid-session | the same (`ActiveWorkoutScreen.js:5243`) | ❌ |
| Home, "You thought you'd be back to {subject} by about now. Still need it?" | an answer | The intro; the card with the answers is below the fold | ❌ |
| Home, "A change to how you train is waiting for your decision." | a decision | The intro; sometimes the modal fires on arrival (`:180-186`, keyed on `lastAutoProposedKeyRef`), sometimes the person must find the first row | ❌ non-deterministic |
| Home, "Training leaves {subject} out at the moment." | a statement | The intro | ⚠️ |
| Onboarding, "Yes, let's set that up" | setting up | The intro; "Add something" is fifth on the page | ⚠️ |
| Conflict sheet / picker, "Update How you train" | updating a rule | The intro; the rule is somewhere below | ⚠️ |
| Settings row / Avoided movements | the feature | The intro | ✅ correct for a general entry |

### 1.5 Ending, extending, holding, making permanent, restarting

Covered in 1.2 for the card. Restarting from Past (`:1734-1750` → confirm "Keep {subject} out again?" / "From today, until you end it here." `:1234-1296`): told what it does ✅ in the confirm; result lands ABOVE in "Temporary" while the Past row stays ⚠️; then possibly the stage-9 modal ❌. Past rows read "Ended" or "Became part of your setup" with no date or duration (`:1742-1745`).

### 1.6 Removing a permanent rule; export; delete

Remove (`:1631-1636` → "Stop building around {subject}?" `:1206-1230` → row gone): ✅ across the board, and the only way to change a permanent rule (no edit; spec §12 asked for one). Export (`:1179-1204`): ✅. Delete (`:1155-1177`, "Delete everything here?" with "Keep it" as cancel): ✅ the best-shaped destructive moment in the feature. These three prove the feature already knows what a legible flow looks like: one tap, one confirm that says what will happen, one visible change.

### 1.7 Training considerations (the directory)

| Stage | Sees | Verdict |
|---|---|---|
| Search | field with a magnifier, "Search, for example MS, shoulder, wheelchair"; results as rows with an Injury / Long-term chip (`TrainingConsiderationsScreen.js:221-251`) | ✅ |
| Profile | an in-screen "All considerations" back row (`:121-129`), the variability intro, a professional-note card, a clinician-boundary card, THEN "Set up what applies to you" with "People differ, so nothing is assumed. Tapping one opens How you train with the answer filled in…" and the question rows, each with its question as the label and why-it-is-asked as the sub (`:131-173`), then "Worth knowing" and "Using Volyume" notes (`:175-196`) | ⚠️ told what a row does ✅; the rows sit fourth, after three paragraphs |
| Tap a question | section 1.4, first row | ❌ |

### 1.8 Avoided movements

Read and remove; the cross-lane sentence at the top (`AvoidedMovementsScreen.js:104-118`). ✅ on all five. Its mechanical defects (no scroll container, invisible chip, sub-48 targets) were fixed 2026-09-02. The sentence "Things your body needs training built around live under How you train." is the kind a first-timer reads twice.

### 1.9 The pattern

| Need | Flows that fail it | The one mechanism behind all of them |
|---|---|---|
| Know it started | 1.1, 1.2 (4 of 5), 1.3, 1.4 | Flows begin by replacing the control that started them, or by a modal from a row shaped like navigation. No flow has a title. |
| Know where you are | 1.1, 1.4 | No step count; no Back on 8 of 9 stages; no Cancel; two inline flows in two page positions. |
| Know it ended | 1.1, 1.2, 1.5 | Save → consent → toast → modal → card at the top. Five candidate endings. |
| See what it did | 1.1, 1.2, 1.3, 1.4, 1.5 | Results are toasts or rows that appear above the point of attention; the screen has no status vocabulary. |
| Know what's next | 1.1, 1.2, 1.3, 1.4, 1.5 | Follow-ups are unforeshadowed modals with 2–3 co-equal buttons, one of which decides on dismissal. |

---

## 2. Findings

P0 blocks or silently corrupts; P1 significant confusion; P2 annoyance with a workaround; P3 polish. Direction is one sentence, not a design.

| ID | P | Stage | Finding | Evidence | Direction |
|---|---|---|---|---|---|
| HYT-01 | P0 | 1.1 s9 | **Dismissing the apply proposal records a decline.** Backdrop tap or Android Back runs the cancel slot's handler, which is `declineNow()`: `declined` is written against every rule of the new change and a toast says "Kept as recorded…". The person was trying to get back to the page. | `AppAlert.js:24-30` (`options ?? {}`), `:78-92`; `:626-632`, `:609-615`. Contrast `:873` ("looking is not deciding") on the later dialogue. | Pass `{ cancelable: false }` to every proposal that records a choice, or take the recording action off the cancel slot. One line; land it alone, first, with a test. |
| HYT-02 | P0 | 1.1 all | **No flow is titled, stepped or cancellable.** The add flow replaces its own button with an untitled card; 9 stages carry no progress, no Back on 8, no Cancel until consent; leaving the screen preserves the half-finished card. | `:1687`; `:295-371`; `:418`, `:457`, `:1457`; `:206`. | A titled container ("Add something · step 2 of 5"), a persistent Back and Cancel, and a stated last step. |
| HYT-03 | P0 | 1.1 s8 | **The result lands out of view and in a transient.** The saved row appears two sections above; the confirmation is a 2.5 s three-line toast that truncates at 182 characters; nothing on the screen says "this is what you just did". | `:418-429`; `Toast.js:105-106`, `:261`; render order `:1577-1760`. | End every flow on the thing it made: scroll to it, highlight it, and write the save sentence onto it as its status line. |
| HYT-04 | P0 | 1.1 s6–s10 | **What comes after Save is never said.** Save → consent → toast → an unforeshadowed modal with three buttons, two filled → possibly a card at the top of the page. The spec forbade the modal ambush (§22). | `:371`, `:450-460`, `:616-685`, `:1577`; `AppAlert.js:167`; `ARCHITECTURE.md` §22. | Make "apply to your plan" the flow's last step (a titled card with one primary), and say on the readback that it is coming. |
| HYT-05 | P1 | 1.2 | **The card shows no dates and no outcome.** `startsAt`, `endsAt`, `effectiveChoice`, `adaptationMode` exist and none is rendered; every episode is titled "Temporary change"; "A while longer" changes nothing visible. The spec asked for "time remaining" (§12) and a decaying badge (§33.7). | `:1537-1549`, `:1665-1667`, `:1670`; `model.js`; `store.js:39-70`; `ARCHITECTURE.md` §12, §33.7. | A status card: the subject as the title, "Since 20 Aug · you said about two weeks", one state chip (Working around it / Not applied / On hold / Checking with you), one line of what changed. |
| HYT-06 | P1 | 1.1 s6 | **The readback does not read back the decisions.** Labels only; not permanent-or-temporary, dates, side, clinician. The spec asked for one sentence plus details (§33.16). | `:1462-1484`; `ARCHITECTURE.md` §33.16. | Three lines (what · how long or permanent · who asked), each tappable to change. |
| HYT-07 | P1 | 1.4 | **Arriving pre-filled looks like nothing happened.** Top of page, card off-screen, no scroll, no focus, no announcement, no mention of where the person came from, and the role question has no default. | `:270-288`, `:1687`; `TrainingConsiderationsScreen.js:60-71`, `:85`; `ActiveWorkoutScreen.js:5243`; `:163-169`. | Scroll to and announce the card, title it "From {condition}", pre-select (never skip) the role the profile suggests. |
| HYT-08 | P1 | 1.3 | **The only report of what was done is a question behind a chevron**, with six possible outcomes, on a row that is sometimes absent. | `:908-1019`, `:1590-1597`, `:855-861`, `:967`; `sessionEffective.js:347-348`. | A readable "what Volyume has done to your plan" section in the indicative, with decisions offered from it, not instead of it. |
| HYT-09 | P1 | 1.2 | **Five co-equal pills**, three answering one caption-clause question, one a mode, one a promotion; no primary, no consequence before the tap. | `:1669-1681`, `:1845`; render 2026-09-03. | The question as a heading; two visible answers ("Still going" / "Done with it"); the rest behind "More", each with a one-line consequence. |
| HYT-10 | P1 | 1.1 s7 | **Consent's agree is also the save, and its decline discards the draft**, and neither says so. | `:450-460`, `:1457`, `:1456`. | "Agree and save"; "Leave it for now — your answers here won't be kept". |
| HYT-11 | P1 | all | **A screen-reader user gets no flow at all**: no focus moves, no step is announced, multi-selects are buttons with a selected state, the meaning-bearing caption sits on a non-pressable row. | `:163-169`, `:1783-1784`, `:1393-1396`; `SettingsPrimitives.js:25-35`; `Toast.js:161`. | Announce each stage's question and move focus to it; checkbox roles for multi-select; the subject in the row's accessible label. |
| HYT-12 | P2 | 1.1 s3b | **32 taxonomy labels** on one card. | `:1331-1346` ← `movementFamily.js:283-319`. | Group by body area; lead with the patterns a lay person would name. |
| HYT-13 | P2 | 1.1 s10 | **Two inline flows in two positions** (add at the bottom, review at the top). | `:1577`, `:1687`. | One slot, or a sheet. |
| HYT-14 | P2 | 1.4 | **Every route lands on the intro**, and arrival sometimes fires a modal. | section 1.4; `:180-186`. | Route to the relevant card; never auto-open a modal on focus; show a pending decision as a card. |
| HYT-15 | P2 | 1.5 | **Past is endings without history**: no dates, no duration. | `:1742-1745`. | "{subject} · 20 Aug to 12 Sep · you ended it". |
| HYT-16 | P2 | 1.1 s0 | **The primary action is fifth on an empty screen**, styled like every option. | `:1612-1617`, `:1646-1651`, `:1689`, `:1834-1843`. | The shared `Button`, under the intro, one invitation instead of two empty states. |
| HYT-17 | P2 | 1.2, 1.6 | **Three phrasings per action** across pill, confirm title and confirm button. | `:1093-1153`, `:1206-1230`. | One phrase per action, carried through. |
| HYT-18 | P2 | 1.5 | **Free users never get the follow-up question**; it lives in the Pro-gated check-in. | `WeeklyCheckInScreen.js:1280-1294`; `RootNavigator.js:221`. | The card and Home's row carry the whole follow-up (HYT-05 does this). Do not move the question. |
| HYT-19 | P3 | 1.1, s3 | "More ways in" means nothing; "A clinician asked for this: no" is a statement used as a toggle. | `:1690`, `:1342`, `:1379`, `:1397`. | Rename; make it a labelled switch. |
| HYT-20 | P3 | 1.8 | The two cross-linked lanes differ in page chrome. | `AvoidedMovementsScreen.js:104-105` vs `:1552`. | `SettingsPage` for both once the guard's `BackHeader` pin is re-anchored to intent. |
| HYT-21 | P2 | 1.6 | **No edit.** A permanent rule is removed and re-entered through the whole add flow. The spec specified edit (§12). | `:1206-1230`; `ARCHITECTURE.md` §12. | Tap a row → the readback with changeable lines → supersede. |

---

## 3. What the screen must be able to show

The mirror of section 1: flows leave no trace because the screen has no words for state. Every fact below is in the model; almost none is rendered.

| Fact | Available as | Rendered today |
|---|---|---|
| What the rule is | `ruleLabel`, `subjectPhrase` | ✅ baseline label; episode in a muted caption |
| Permanent or temporary | `row.role` | ⚠️ by section only |
| Since when | `row.startsAt` | ❌ |
| "You said about two weeks" / time remaining | `row.endsAt` | ❌ (spec §12) |
| Who asked (self / clinician-reported) | `row.source` | ✅ baseline; ❌ episodes |
| Applied to the plan / not applied / undecided | `row.effectiveChoice` | ❌ |
| On hold | `row.adaptationMode` | ⚠️ one clause |
| Checking with you | `ep.status` | ⚠️ one clause |
| What changed in the plan (N swapped, N left out) | `computePlanEffectiveSummary` | ❌ here (the workout summary has it) |
| Plan rebuilt around a permanent rule, or declined | `computeCapabilityPlanRewrite` outcome | ❌ (one alert, then nothing) |
| Building back up | `reintroduction` | ❌ here (Home has a line) |
| Ended when, for how long, why | `endedAt`, `startsAt`, `endedReason` | ❌ ("Ended") |

---

## 4. Prior audits: closed, mechanism-closed, and contradictions

Extracted from `docs/capability-campaign-25-2026-08-20/` and `docs/injury-disability-audit-2026-08-28/` and the git log.

**4.1 Already fixed; not re-found here.** Four commits after CC33 closed, none on the task board: `b0829ba1` (Settings and onboarding entry rows reworded; primary action moved above cross-lane rows), `20cb3b66` (Home's five loose capability sentences grouped under one heading), `be4c7c7e` (bare rows grouped into sections; Training considerations on shared primitives), `6fedf6a5` (add-flow double inset removed; sub-48 controls floored; Avoided movements scroll container added). This audit treats every defect those commits name as closed.

**4.2 Closed at mechanism level, still open as experience.** CC33 marked each of these LANDED; the mechanism exists and the person still cannot follow it.

| CC33 finding | Mechanism landed | What a person meets now | Here |
|---|---|---|---|
| T2-11 "Work around this" went to a cold settings screen and created nothing | The tap now carries a preselect (D112 R4) | The same cold arrival at the top of the page with the card off-screen | HYT-07 |
| T2-23 Apply/Decline one-shot, no per-line control, no revisit | Per-line review + revisit row (D112 R4) | A modal with three buttons and a review card at the top of the page; a chevron row that opens a question | HYT-04, HYT-08, HYT-13 |
| T1-15/T2-24 AWAITING prompt absent from Today | Home row (D112 R5) | Tapping it lands on the intro; the answers are below the fold | HYT-14 |
| T2-25 reintroduction was "one toast" | Home ramp line (D112 R5) | Still a toast on this screen | HYT-03 class |
| T2-26 no way to hold the plan | Hold mode + pill (D112 R8) | A pill whose meaning is told after the tap | HYT-09 |
| FINDINGS §1.2 "the one decision… is a two-button alert" | A third button | A three-button alert, two filled, that decides on dismissal | HYT-01, HYT-04 |

**4.3 The prior audit's own words already named the shape.** `FINDINGS.md:29-36` ("Not easily understandable… a two-button alert whose preview over-promises"); `:45-52` ("reintroduction is one toast shown only if the user happens to be on the settings screen at that instant"). Each was closed by adding a mechanism. `SCORECARD.md` J4, "Cognitive load: one question at a time, low-choice steps", is marked "LANDED pattern" on the strength of the pattern's existence; the 32-option stage (1.1 s3b) and the five-pill card (1.2) were never measured against it.

**4.4 Contradictions to carry, not resolve.** `docs/TASKBOARD.md:772` heads the CC33 section "IN FLIGHT" while `:1212-1231` states "CC33 STATUS: CLOSED"; both stand in the live document. `GAP-CLOSURE-TRACKER.md` marks "D UX/discovery COMPLETE" (2026-08-21) for surfaces CC33 then scored with 60 fresh defects a week later; each is true of its own scope. The last edit to `TASKBOARD.md` was 2026-08-30 (`8050bc0b`); 38 commits have landed since without a board entry.

**4.5 Truth fields, unchanged.** REAL-DISABLED-USER-VALIDATED = NO (`VALIDATION-PACKAGE.md:6-7`; SCORECARD X1). X2, the founder device walk, was PENDING; this audit is prompted by its result. The 8–12 participant protocol is banked, not run.

---

## 5. Constraints for the redesign session

1. Section 0.4 is law. Several items are pinned by source-regex tests reading exact strings and positions; a failing guard is the intended signal to stop and ask, not to delete the guard. Re-anchor a guard to its intent with a header note.
2. Guards most likely to bite: `HowYouTrainScreen.capabilityFlows.guard.test.js` (27), `HomeScreen.capabilityVisibility.guard.test.js` (20), `capabilityVocabulary.guard.test.js` (9), `capabilityCopyLeakage.guard.test.js` (7), `AvoidedMovementsScreen.crossLane.guard.test.js` (4), `capabilityTouchTargets.guard.test.js`, `ActiveWorkoutScreen.workAroundPreselect.guard.test.js` (8), `ActiveWorkoutScreen.sideCarveNote.guard.test.js` (28).
3. HYT-01 is a correctness fix. Land it first, alone, with its own test, before any flow work.
4. `appAlert` is shared; do not change its backdrop semantics globally. Pass options per call.
5. No new dependencies without asking. `Button`, `Card`, `SettingRow`, `TextField`, `EmptyState`, `Chip` and the existing sheet components are available.
6. British English, no em dash in user-facing copy, calm voice (`COACHING_VOICE_SYNTHESIS_LOCKED.md`).
7. Nothing here touches weight, food or notifications.
8. Every landed change ships with a numbered device checklist for a physical Android EAS build; the founder walks from a phone.
9. Update `docs/TASKBOARD.md` at every landing; four commits on this feature already sit off the board (4.4).

---

## 6. Questions for the founder

Product forks the redesign will hit. None is decided here.

1. **Where a flow lives.** (a) Inline on the page, but titled, stepped and cancellable; (b) its own pushed screen (a wizard), which gives a title, a back button and a place by construction; (c) a bottom sheet. Inline was chosen in CC26 to avoid modal focus problems for screen readers (`:8-10`); a pushed screen has none of those and is the platform's own answer to "a sequence of questions".
2. **Where plan decisions live.** (a) Modals, but foreshadowed and non-dismissable-into-a-decision; (b) the last step of the flow that caused them; (c) cards on the screen that sit until answered, no modals in the feature at all. The per-line review already proves (c) works.
3. **The check-in card's question.** (a) Two visible answers ("Still going" / "Done with it"), the rest behind "More"; (b) all five, ranked; (c) a dedicated check-in screen when one is due.
4. **Editing.** Add edit (tap a row → the readback with changeable lines → supersede), as the spec specified, or keep remove-and-re-add?
5. **Consent placement.** At the save (current) or at the door, the first "Add something", before anything is disclosed? Both fail closed; they differ in when the words are read.

---

## Appendix A — Heuristic scores and personas (context only)

Produced by the isolated design-review pass and reconciled by the lead. Not the deliverable; kept because the numbers exist and the persona traces carry evidence.

| # | Heuristic | 0–4 | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 1 | No dates, no applied/declined, no hold on the card (`:1537-1549`, `:1665-1667`) |
| 2 | Match to the real world | 2 | Excellent intro; 30 taxonomy labels (`:1336-1341`) |
| 3 | User control and freedom | 1 | No Back on 8 of 9 stages, no Cancel (`:418`, `:457`, `:1457`) |
| 4 | Consistency | 2 | Two filled buttons per alert (`AppAlert.js:167`); chevron opens a modal; three phrasings per action |
| 5 | Error prevention | 2 | One transaction per save; dismiss records a decline (`AppAlert.js:78-92` + `:626-632`) |
| 6 | Recognition over recall | 1 | Readback lists labels; every mode explained after the tap |
| 7 | Flexibility | 2 | One-tap restart is good; nothing can be edited |
| 8 | Minimalism | 2 | Five pills per card; two empty states above the primary action |
| 9 | Error recovery | 3 | Best in the app: one could-not-read constant, fail-closed announced on both platforms |
| 10 | Help | 2 | The directory's sourced notes; nothing on the screen explains a control before use |
| | **Total** | **18/40** | Poor band |

Personas, specific red flags only. **Jordan (first-timer):** finds "Add something" fifth after two "nothing here" cards; asked permanent-or-temporary before being told why it matters; learns at tap 10 that this is health data; asked to apply to a plan he has not thought about, with two filled buttons. **Sam (screen reader):** no focus move and no announcement on any stage (`:163-169` is the only one); multi-selects are buttons with `selected` (`:1783-1784`); the card's meaning is in a caption on a non-pressable `View` labelled "Temporary change" (`SettingsPrimitives.js:25-35`); toast timing is extended only for the `undo` variant (`Toast.js:161`). **Casey (one-handed, interrupted):** an accidental "This is how I train now" is plausible among five wrapping pills; a stray backdrop tap declines; the toast is the only receipt. **Priya (long-term wheelchair user):** never sees "injury" on her rows, correctly; enters via the directory and lands with the card off-screen; once saved, her rows offer only Remove, and nothing persistent confirms the plan was rebuilt around her (`:1056-1087` fires once). **Tom (fresh shoulder strain):** best served (the side stage `:1409-1413`; the workout summary line); nothing tells him when Volyume will ask again, "A while longer" changes nothing visible, and a dismissed modal declines.

## Appendix B — Provenance

- Lead: `HowYouTrainScreen.js:159-1298` and `:1537-1760`; `model.js`; `phrase.js`; `store.js:39-99`; `weekNote.js`; `HomeScreen.js:2560-2665`; `homeCoachBrief.js:21-25`; `ActiveWorkoutScreen.js:978-1043`; `AppAlert.js:24-92`, `:160-175`; `Toast.js:100-110`, `:255-265`; `WeeklyCheckInScreen.js:1280-1294`; `RootNavigator.js:221`. Renders: `scratchpad/render/spec-hyt.cjs` (empty and populated), `spec-hyt-return.cjs` (awaiting + held).
- Design review: Opus, isolated, blind to prior audits by design; every citation it produced was spot-checked by the lead (two corrected by a few lines).
- Mechanical maps: Haiku, raw. Detector `detect.mjs` returned `[]` on all five files; recorded as a known React Native false negative, not as evidence.
- History: Sonnet, read-only, over ARCHITECTURE.md, the CC33 set, the gap-closure set, the A11Y audit, TASKBOARD.md, the validation package and `git log`.
- Not done: no device walk (no simulator; the founder walks from a phone); no real-user session.
