# Ultimate Audit 03 — Navigation & Psychology Proposals (Phase 4)

READ-ONLY proposals. No code changes. British English throughout.

Discipline (per `phase5/_PROPOSAL-FORMAT.md`): every proposal traces to a finding
in the Phase-3 comparison fragments with its **status** carried; every
implementation fact cites the Phase-1 navigation inventory `file:line`
(`ultimate-audit-00-navigation-psychology.md`) or is marked **NOT DETERMINED IN
CODE**. No file names, components or line numbers are invented.

**Sources used (read in full):**
- `ultimate-audit-00-navigation-psychology.md` — current nav, `RootNavigator.js`
  placements with file:line (the "audit §" references below).
- `phase3/compare-10-navigation.md` — nav/IA market evidence + statuses.
- `phase3/compare-13-newbie.md` — newbie/light-user evidence + statuses.
- `phase3/compare-15-scaling.md` — dual-audience / niche→mainstream evidence + statuses.

**Locked-doc / SACRED flags used below:**
- **FOUNDER-GATE** is raised on (a) any change to the tab set or root IA, because
  the tab structure is specified in a locked doc (`docs/UI_FLOWS_LOCKED.md` §
  "Navigation changes" defines a locked final tab order); (b) any change to
  trademarked/identity naming such as "Precision Coaching™" (governed by
  `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` and brand identity); (c) anything
  touching the Day-1 onboarding path (`docs/ONBOARDING_SEQUENCE_LOCKED.md`); (d)
  coaching-facing copy (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`).
- **SACRED, untouched here:** free/Pro gating (CLAUDE.md), the deterministic no-AI
  coaching engine, the ED-safety system, billing. Where a proposal brushes a tier
  line it is flagged and treated as input only — no gating is changed by any
  proposal below.

> **Cross-cutting caveat carried from `compare-15`:** the headline opportunity —
> "no single app cleanly serves the casual on-ramp AND expert depth in one
> product; closing it is Volyume's opportunity" — is flagged **INTERPRETATION,
> not a sourced finding** (compare-15 USER SENTIMENT + VERIFICATION). It is the
> spine of §4 below and is treated as a hypothesis to be founder-decided, not a
> proven requirement.

---

## Part A — Proposed restructured navigation map

### A.0 What does NOT change (deliberately)

The strongest sourced finding in the cluster is that Volyume's **visible 5-tab
bottom bar with no hamburger is already best-in-class** and must be preserved:
- Visible vs hidden nav: hidden menus 27% vs 48–50% visible, users 39% slower
  (compare-10 WHERE WE LEAD / BEST IN CLASS — **VERIFIED**, NN/g).
- 5 tabs sits inside the 3–5 consensus optimum and matches Spotify's deliberate
  reduction, +9% clicks (compare-10 — **VERIFIED**).
- Pro gating by screen, not by hiding tabs, keeps Diary discoverable to free users
  (compare-10 WHERE WE LEAD — **VERIFIED** interpretation of the visibility
  principle).

**Therefore no proposal below removes a tab, adds a tab, or introduces a drawer.**
Current placement cited: Tab.Navigator at `RootNavigator.js:412`; five tabs Train/
Plans/Diary/Progress/You titled at `:445-449` (audit §1). The whole of Part A
works *within* this 5-tab frame except where explicitly FOUNDER-GATEd.

### A.1 Proposed tab map (within the existing 5 tabs)

| Tab (current title, `RootNavigator.js`) | Keeps | Proposed change | Trace |
|---|---|---|---|
| **Train** (HomeTab, `:445`) | Today's session, start workout, build workout | De-clutter landing (U-NAV-1); make coaching guidance *reachable from here* via a labelled entry rather than only cross-jumping to You (U-NAV-5) | compare-10 WHERE WE LAG (clutter) **VERIFIED**; audit §6, §4 |
| **Plans** (PlansTab, `:446`) | Plans, Plan Library, Mesocycle/Training Blocks, builders | Consolidate the two split builders' *entry points* (U-NAV-2); rename "Training Blocks/Mesocycle" surface for newbies (U-NAV-7) | audit §2 (two builders), §7 (mesocycle term) |
| **Diary** (DiaryTab, `:447`) | Food diary, search, scan, meal plan, recipes, meals | Receive **Nutrition Targets** relocated in from You (U-NAV-3) | audit §2 (Nutrition Targets mismatch) |
| **Progress** (ProgressTab, `:448`) | Analytics, Lifts, Consistency, Volume, Year of Lifts, recaps | Become the **single canonical home for Cardio** (U-NAV-4); de-duplicate Body Metrics entry (U-NAV-6); rename Volume/MAV-MRV tile for newbies (U-NAV-7) | audit §2 (cardio 3 stacks; Body Metrics duplicated), §7 (Volume term) |
| **You** (ProfileTab, `:449`) | Settings, account, billing, privacy, data | Surface coaching as a labelled destination (U-NAV-5); shed the Nutrition-Targets entry to Diary (U-NAV-3) | audit §6 (You is densest with coaching+nutrition+settings); §7 (coaching buried) |

**Note on tab labels:** compare-10 NEWBIE VERDICT flags "You" as vaguer than
"Profile"/"More" (**VERIFIED** principle). A rename of the tab *label* is
**FOUNDER-GATE** (locked tab spec in `UI_FLOWS_LOCKED.md`) and is raised, not
decided, in U-NAV-8.

---

## Part B — Proposals

```
ID: U-NAV-1
AREA: Navigation, IA & findability
TITLE: De-clutter the Train (Home) landing so the core daily action stays first, depth moves one tap down
SUGGESTED TIER: 2 High
IMPACT: 8 — "cluttered dashboard pushing core data below the fold" is named the second-commonest fitness complaint (compare-10 WHERE WE LAG, VERIFIED); Home currently mixes ~11 destinations across training, coaching, nutrition, cardio and upsell (audit §6).
EFFORT: 5 — reorganising one landing screen's card stack; exact simultaneous card count is state-conditional (audit §6, NOT DETERMINED), so the change is presentational/ordering, not structural.
CURRENT STATE: HomeTab/HomeScreen exposes at least 11 distinct destinations: ActiveWorkout start (HomeScreen.js:821,855,1148), CoachOutput (:1008), CoachReview (:1071), WeeklyCheckIn cross-jump (:1046,1550), NutritionTargets cross-jump (:987), weight-trend cross-jump (:1436), LogCardio (:1435), ProUpgrade (:1114,1445), PlanLibrary cross-jump (:1356), BuildWorkout (:1292), FreeStarter (:1350), WorkoutHistory (:1472), Plans card (:1266) (audit §6).
THE PROBLEM: NEWBIE — a first-timer cannot tell which of 11 affordances is "the thing to do today"; the research's #1 newbie need is being told the next action, not shown a menu (compare-13 NEWBIE VERDICT, VERIFIED). ATHLETE — power users react loudest when the core daily action is pushed below the fold (compare-10 USER SENTIMENT, VERIFIED). Both audiences want the start-workout action to stay top and shallow.
THE EVIDENCE: compare-10 WHERE WE LAG "clutter on the home/landing screen … second-commonest fitness complaint" (VERIFIED); compare-13 NEWBIE VERDICT "told what to do next, not a menu" (VERIFIED); audit §6 density count (exact simultaneous count NOT DETERMINED IN CODE).
BEST REFERENCE IMPLEMENTATION: Garmin Connect v5.0 "At a Glance" customisable home cards — users opt into depth by adding cards rather than the app showing everything at once (compare-10 BEST IN CLASS, VERIFIED; execution caution noted — oversized graphs drew complaints).
PROPOSED SOLUTION: Keep "today's session" hero + primary start-workout action as the single above-the-fold focus on the Train landing; demote coaching, nutrition, cardio and upsell cards into clearly-labelled sections below the fold, ordered by daily-loop relevance (train → review → coach). Do NOT move them off the tab — only reorder/group. No tab change, no gating change.
NEWBIE EXPERIENCE: Opens Train, sees exactly one obvious next action (start today's pre-seeded session, audit §5 / RootNavigator.js:472-475); secondary depth is visibly present but not competing.
ATHLETE EXPERIENCE: Start-workout stays one tap from launch (the plan-start always routes to HomeTab/ActiveWorkout regardless of entry, audit §4); the analytics/coaching shortcuts they use remain on the same tab, just grouped.
IMPLEMENTATION BLUEPRINT: Edit HomeScreen card ordering only. Above fold: today's-session hero + start action (existing handlers HomeScreen.js:821,855,1148). Below fold, grouped: Coaching (CoachOutput :1008, CoachReview :1071, WeeklyCheckIn :1046), Nutrition (NutritionTargets :987 — but see U-NAV-3), Cardio (LogCardio :1435 — but see U-NAV-4). Empty state: planless free user still sees the "Not sure where to start?" → FreeStarter card (audit §7 counterweight). NO change to RootNavigator routes. Exact current card-render order and which cards are state-gated: NOT DETERMINED IN CODE — confirm against HomeScreen before building.
VERIFICATION: Evidence VERIFIED. Simultaneous on-screen count and current card order NOT DETERMINED IN CODE (audit §6). Not FOUNDER-GATE (no tab/locked-IA change, no gating change) provided coaching copy/labels are left verbatim; if any coaching card *wording* is altered, that part is FOUNDER-GATE (COACHING_VOICE).
```

```
ID: U-NAV-2
AREA: Navigation, IA & findability
TITLE: Unify the two split workout-builder entry points
SUGGESTED TIER: 3 Medium
IMPACT: 5 — two similar builders split across two tabs is a discoverability/consistency cost; not tied to a quantified market figure (internal IA gap).
EFFORT: 4 — re-pointing entry points, not merging the builder screens themselves.
CURRENT STATE: BuildWorkout lives in HomeTab (RootNavigator.js:294); ManualBuilder, a *similar* builder, lives in PlansTab (:324). The audit explicitly calls this "two builders split across two tabs" (audit §2).
THE PROBLEM: NEWBIE — a beginner who wants "make me a workout" cannot predict which tab holds the builder. ATHLETE — a self-programmer expects one canonical build surface. Both meet an inconsistent mental model.
THE EVIDENCE: audit §2 "two similar builders split across two tabs" (Phase-1 inventory finding — direct from code). Market source: compare-10 does not prescribe a fix for this internal gap (MISSING ENTIRELY notes the cardio-home equivalent is "an internal IA gap; the market research does not prescribe a fix"). EVIDENCE-THIN on external market support; rests on the code-level inventory finding only.
BEST REFERENCE IMPLEMENTATION: None prescribed by the research for builder-merging specifically; the general principle is the one-tab-one-intent labelling rule (compare-10, NN/g, VERIFIED).
PROPOSED SOLUTION: Pick ONE canonical builder home and make the other entry point a labelled link to it, OR present them as two clearly-named modes under one entry. Recommended: builder lives in Plans (the planning domain), with Train's "build a quick workout" linking across. Decide which builder is canonical — the two builders' feature overlap is NOT DETERMINED IN CODE; confirm before merging.
NEWBIE EXPERIENCE: One predictable "build a workout" destination.
ATHLETE EXPERIENCE: One canonical builder; no hunting between tabs.
IMPLEMENTATION BLUEPRINT: Both screens already cross-jump (ManualBuilderScreen.js:331 → PlansTab, :538 → HomeTab; RoutineDetailScreen.js:251 → HomeTab/BuildWorkout). Re-point Train's build entry to the Plans builder, or vice versa. Whether BuildWorkout and ManualBuilder are functionally redundant or intentionally distinct is NOT DETERMINED IN CODE — confirm before collapsing; if distinct, keep both but co-locate and label them. No gating change.
VERIFICATION: Evidence-thin (rests on the Phase-1 inventory §2; no external market prescription). Builder equivalence NOT DETERMINED IN CODE. Not FOUNDER-GATE (no tab/locked-IA change) — but confirm the builders are not differentiated by a locked spec before merging.
```

```
ID: U-NAV-3
AREA: Navigation, IA & findability — feature relocation
TITLE: Relocate Nutrition Targets from You → Diary (the food domain)
SUGGESTED TIER: 2 High
IMPACT: 7 — a food concept living in the profile tab forces a cross-tab jump and breaks the one-domain-per-tab model; relocation cost is communication, not capability.
EFFORT: 4 — re-register the route under DiaryStack and update the Home cross-jump target; gating must be preserved exactly.
CURRENT STATE: NutritionTargets is registered in ProfileStack as GatedNutritionTargets (RootNavigator.js:384), NOT in DiaryTab; Home reaches it by a cross-tab jump (HomeScreen.js:987 → ProfileTab/NutritionTargets) (audit §2, §4). It is Pro-gated via withProGuard (:150).
THE PROBLEM: NEWBIE — "where are my calorie/macro goals?" is not where food lives. ATHLETE — an extra cross-tab hop to adjust targets they tune regularly. The audit names it directly: "nutrition targets are a food/Diary concept but live in the You tab" (audit §2).
THE EVIDENCE: audit §2 (Nutrition Targets mismatch — Phase-1 finding); audit §4 (Home cross-jump :987). compare-10 WHERE WE LAG names cross-tab jumps to reach nutrition/coaching as risking the depth-2 cap (VERIFIED principle, NN/g progressive-disclosure).
BEST REFERENCE IMPLEMENTATION: The one-tab-one-intent / single-domain rule (compare-10, NN/g, VERIFIED).
PROPOSED SOLUTION: Move the Nutrition Targets entry point so it lives under the Diary tab alongside the food diary it governs. Keep the existing withProGuard gate intact (Pro feature — CLAUDE.md FREE/PRO list places nutrition targets/macros in Pro). Update HomeScreen.js:987 to navigate to DiaryTab/NutritionTargets.
NEWBIE EXPERIENCE: Targets sit with food; one mental model ("Diary = everything I eat and aim for").
ATHLETE EXPERIENCE: Targets reachable from the tab they nutrition-log in; no profile detour.
IMPLEMENTATION BLUEPRINT: Register GatedNutritionTargets under DiaryStack (currently DiaryStack spans RootNavigator.js:217-276); preserve withProGuard (:150). Re-point HomeScreen.js:987. Note CoachOutputScreen.js:1675 already cross-jumps to DiaryTab/MealPlan, so Diary is already an accepted coaching→nutrition target. Whether NutritionTargets is *also* referenced elsewhere by route name: NOT DETERMINED IN CODE — grep all navigate('NutritionTargets') callsites before moving so no entry point breaks. Gating UNCHANGED.
VERIFICATION: Evidence VERIFIED (audit §2/§4 + NN/g depth principle). Other callsites of the route NOT DETERMINED IN CODE. Touches a Pro-gated screen but does NOT change the gate → not a gating-FOUNDER-GATE; however the IA placement is route-level. Not a tab change, so not the locked-tab FOUNDER-GATE — but flag to founder that it edits registered IA.
```

```
ID: U-NAV-4
AREA: Navigation, IA & findability — feature relocation
TITLE: Give Cardio a single canonical home on Progress (keep return-to-origin links)
SUGGESTED TIER: 2 High
IMPACT: 7 — cardio currently has no canonical destination; discoverability depends on which card was tapped (audit §2). Internal IA gap, no quantified market figure.
EFFORT: 5 — cardio is deliberately registered in three stacks for return-to-origin; a canonical home must be added WITHOUT breaking that pattern.
CURRENT STATE: LogCardio/CardioHistory are registered in THREE stacks — HomeStack (RootNavigator.js:303), DiaryStack (:251,256), ProgressStack (:357,358) — deliberately (comments :301-302,355-356) so save/back returns to the originating tab. All cardio entries are Pro-gated (GatedLogCardio :161, GatedCardioHistory :162) (audit §2).
THE PROBLEM: NEWBIE — no single "where do I do cardio?" answer. ATHLETE — cardio has no home; they must remember which card opened it. The audit: "cardio has no single home … discoverability depends on which card the user tapped" (audit §2).
THE EVIDENCE: audit §2 (cardio in three stacks — Phase-1 finding). compare-10 MISSING ENTIRELY explicitly: "A single coherent home for cardio — cardio is registered across three stacks with no canonical destination … the market research does not prescribe a fix, so no external source." → EVIDENCE-THIN externally; rests on the inventory.
BEST REFERENCE IMPLEMENTATION: None external (compare-10 marks this an internal gap). Apply the single-canonical-destination principle (NN/g one-intent, VERIFIED).
PROPOSED SOLUTION: Designate Progress as cardio's canonical home (cardio is logged-activity data; it sits with analytics). Add a clearly-labelled "Cardio" entry on the Progress landing pointing to CardioHistory/LogCardio. KEEP the three-stack registration so return-to-origin still works (do not delete the Home/Diary registrations). This adds a findable home without removing the deliberate routing.
NEWBIE EXPERIENCE: A single visible "Cardio" tile on Progress answers "where's cardio?".
ATHLETE EXPERIENCE: One reliable destination, while quick-log from Home/Diary still returns them to where they were (pattern preserved).
IMPLEMENTATION BLUEPRINT: Progress already exposes LogCardio (:357) and CardioHistory (:358) and the Analytics landing already links LogCardio (AnalyticsScreen.js:300) and CardioHistory (:301). Make the canonical "Cardio" affordance prominent on the Progress landing tile grid (audit §6). Do NOT remove HomeStack:303 / DiaryStack:251,256 registrations (audit §2 deliberate). Gating UNCHANGED (GatedLogCardio/GatedCardioHistory remain). Whether a dedicated single "Cardio hub" screen exists vs only Log/History routes: NOT DETERMINED IN CODE — confirm; if none, this is a labelling/prominence change on the existing Analytics tile grid, not a new screen.
VERIFICATION: Evidence-thin externally (compare-10 MISSING ENTIRELY, no market source); inventory-grounded (audit §2). Cardio-hub-screen existence NOT DETERMINED IN CODE. Touches Pro-gated screens but changes no gate. Not FOUNDER-GATE for tabs.
```

```
ID: U-NAV-5
AREA: Navigation & psychology — coaching surfacing
TITLE: Make weekly coaching guidance reachable as a labelled destination, not only via cross-jumps into You
SUGGESTED TIER: 2 High
IMPACT: 8 — the weekly guidance a beginner most needs is buried in the You tab and split from the tab it is launched from (audit §7, §4); coaching is the highest-leverage retained-user feature (compare-13 instructiveness ranked #1 valued attribute, 24×, VERIFIED).
EFFORT: 5 — surfacing/labelling an existing destination; not building new coaching logic (engine untouched — SACRED).
CURRENT STATE: Coaching (WeeklyCheckIn, CoachOutput, Methodology, Held history, Reminders, Goal setup) is registered under ProfileTab (RootNavigator.js:387-398); CoachOutput is GatedCoachOutput (:152) titled "Precision Coaching™" (:388). Home cross-jumps into ProfileTab for coaching/nutrition at four sites (HomeScreen.js:1046,1550 WeeklyCheckIn; :987 NutritionTargets; CoachOutput is opened via You row YouScreen.js:128) (audit §4, §6, §7).
THE PROBLEM: NEWBIE — the guidance they most need is behind a profile tab and a trademarked term (audit §7). ATHLETE — coaching is split from the tab it launches from (4 cross-jumps), straining the model (compare-10 ATHLETE VERDICT, VERIFIED). The audit: "coaching is buried under the 'You'/profile tab rather than surfaced as its own destination" (audit §2, §7).
THE EVIDENCE: audit §2/§7 (coaching buried — Phase-1 finding); compare-10 ATHLETE VERDICT "coaching domain is split from the tab it is launched from (4 cross-jumps from Home into ProfileTab)" (VERIFIED); compare-13 instructiveness #1 valued (VERIFIED).
BEST REFERENCE IMPLEMENTATION: The visible-destination principle (Spotify five-tab, NN/g, VERIFIED) — make the high-value destination reachable without burying it.
PROPOSED SOLUTION: Surface the weekly coaching output as a labelled, prominent entry on the Train landing (where the user already starts their week) AND keep its home in You. Do NOT add a tab (would be FOUNDER-GATE). This is the "make the core action one tap shallower" fix (compare-10 NEWBIE note, VERIFIED). The engine, its determinism and its output are NOT touched — only where the entry point is shown.
NEWBIE EXPERIENCE: A plainly-labelled "This week's guidance" entry on Train, not a hunt through You.
ATHLETE EXPERIENCE: Coaching reachable from the training tab they live in; cross-jumps reduced.
IMPLEMENTATION BLUEPRINT: Add/relabel a coaching entry on HomeScreen (existing CoachOutput open path HomeScreen.js:1008; CoachReview :1071). Keep ProfileStack registration (:387-398). Preserve GatedCoachOutput (:152). Do NOT alter coaching output copy or the engine. The "Precision Coaching™" label itself is addressed separately in U-NAV-7. Gating UNCHANGED.
VERIFICATION: Evidence VERIFIED (audit §2/§7 + compare-10 ATHLETE + compare-13 #1). FOUNDER-GATE on any change to coaching-facing copy/labels (COACHING_VOICE_SYNTHESIS_LOCKED) — this proposal moves an *entry point*, not wording; if labels change, that part is gated. SACRED engine untouched.
```

```
ID: U-NAV-6
AREA: Navigation, IA & findability — de-duplication
TITLE: De-duplicate the Body Metrics entry point across Progress and You
SUGGESTED TIER: 3 Medium
IMPACT: 5 — duplicated gated entry points enlarge the route surface and confuse "where do I track my weight?"; modest but clean.
EFFORT: 3 — choosing one canonical entry, linking the other; gating preserved.
CURRENT STATE: BodyMetrics is registered in BOTH ProgressStack as GatedBodyMetrics (RootNavigator.js:347) and ProfileStack as GatedBodyMetrics (:386); both Pro-gated via withProGuard (:151) (audit §2, §7).
THE PROBLEM: NEWBIE — two doors to the same "track my weight" feature, both Pro-gated (and the gating itself is flagged below). ATHLETE — duplicated surface, no canonical home. The audit: "Body Metrics … Duplicated entry points; both GATED" (audit §2).
THE EVIDENCE: audit §2 (duplicated entry points — Phase-1 finding); audit §7 (Body Metrics gated + duplicated). compare-15 WHERE WE LAG raises the *gating* of "track my weight" separately (see note). Internal IA finding; external market does not prescribe de-dup specifically (evidence-thin externally).
BEST REFERENCE IMPLEMENTATION: One-canonical-destination principle (NN/g, VERIFIED).
PROPOSED SOLUTION: Make Progress the canonical Body Metrics home (it is body data → analytics); the You entry becomes a link, or is removed if redundant. Do NOT change the Pro gate in this proposal. (Whether "track my weight" should be gated at all is raised, not decided, in the note below — that is a tier/gating question = SACRED/founder.)
NEWBIE EXPERIENCE: One "Body" destination under Progress.
ATHLETE EXPERIENCE: Single canonical place for metrics.
IMPLEMENTATION BLUEPRINT: Keep ProgressStack GatedBodyMetrics (:347) as canonical; make ProfileStack (:386) a link to it or remove if no unique entry depends on it. Confirm all navigate('BodyMetrics') callsites before removing the You registration — callsite inventory NOT DETERMINED IN CODE. Preserve withProGuard (:151). Gating UNCHANGED by this proposal.
VERIFICATION: Evidence-thin externally; inventory-grounded (audit §2). Callsites NOT DETERMINED IN CODE. Gate not changed → not a gating-FOUNDER-GATE. Note (input only, not a proposal): compare-15 WHERE WE LAG (VERIFIED, MFP analogue) warns gating an expected-free behaviour like "track my weight" risks becoming "the most common complaint"; whether to move Body Metrics to Free is a SACRED tier decision = FOUNDER-GATE, raised here as input only.
```

```
ID: U-NAV-7
AREA: Navigation & psychology — terminology / newbie framing
TITLE: Add plain-language framing to athlete-term destinations (Precision Coaching™, Mesocycle/Training Blocks, Volume/MAV-MRV, Goal lock)
SUGGESTED TIER: 2 High
IMPACT: 8 — first-timer-relevant functions sit behind advanced/competitor terminology, the clearest beginner weakness (compare-13 NEWBIE VERDICT, VERIFIED) and the opposite of progressive disclosure (compare-15 WHERE WE LAG, VERIFIED).
EFFORT: 4 — labelling/inline-gloss and a simpler default framing; no engine or gating change. Several sub-items are FOUNDER-GATE (see below).
CURRENT STATE: "Precision Coaching™" titles CoachOutput (RootNavigator.js:388; You row YouScreen.js:128); "Training Blocks"/MesocycleBuilder (:326, opened from ConsistencyScreen.js:98, PlansScreen.js:759); "Volume"/VolumeHeatmap top-level tile (:298,345; MAV/MRV bands theme.js:485-492; AnalyticsScreen.js:288); "Goal lock"/GoalLockConsent in the new-user path (:395,513, fired ProOnboarding step 3 :510-513) (audit §7).
THE PROBLEM: NEWBIE — must recognise "mesocycle", "MAV/MRV", "goal lock", a trademarked coaching term before using the feature (audit §7; compare-13 jargon-without-inline-definition gap, VERIFIED F6.1). ATHLETE — jargon is expected working vocabulary and must be DISMISSIBLE, not removed (compare-13 ATHLETE VERDICT, F6.2 PARTIAL). So the fix is a simpler default LAYER plus the term, not deletion of the term.
THE EVIDENCE: audit §7 (each term with file:line — Phase-1 finding); compare-13 WHERE WE LAG "no inline tap-to-define glossary" (F6.1 VERIFIED; F6.2 ranking PARTIAL); compare-15 WHERE WE LAG "athlete terminology surfaced without a simpler default layer … Notion/NN/g default simple and reveal depth on request" (VERIFIED).
BEST REFERENCE IMPLEMENTATION: Notion "begins simple, complexity appears gradually"; NN/g progressive disclosure "show a few important options, offer specialised options on request" (compare-15 BEST IN CLASS, VERIFIED). Future-style in-context plain teaching at the moment of need (compare-13, VERIFIED).
PROPOSED SOLUTION: For each term, add a plain-English first-line framing or inline tap-to-define gloss the first time it is shown, WITHOUT removing the athlete term (so athletes keep their vocabulary):
- "Training Blocks (Mesocycle)" → lead with "A plan that changes over weeks".
- Volume/MAV-MRV → lead with "How hard each muscle is worked", MAV/MRV as the detail.
- "Goal lock" → lead with plain "Set and commit to your goal".
- "Precision Coaching™" → keep the trademark but pair with a plain descriptor on first encounter (e.g. "Your weekly guidance").
NEWBIE EXPERIENCE: Understands the destination from one familiar word; the advanced term is taught in context, not assumed.
ATHLETE EXPERIENCE: Their precise vocabulary is preserved and the gloss is unobtrusive/dismissible (F6.2 PARTIAL).
IMPLEMENTATION BLUEPRINT: Title/label and inline-gloss edits at the cited surfaces (RootNavigator titles :326,388,395; AnalyticsScreen volume tile :288; theme band labels theme.js:485-492 are colour tokens — confirm whether band *labels* are user-facing strings, NOT DETERMINED IN CODE). NO engine, gating or routing change.
VERIFICATION: Evidence VERIFIED for the gap (compare-13 F6.1, compare-15); F6.2 dismissibility PARTIAL. **FOUNDER-GATE (multiple):** "Precision Coaching™" naming is IDENTITY/brand-governed (IDENTITY_AND_OWNERSHIP_LOCKED) — do not alter the trademark; "Goal lock" sits in the locked onboarding path (ONBOARDING_SEQUENCE_LOCKED); any coaching-facing wording is COACHING_VOICE_SYNTHESIS_LOCKED. All copy here is INPUT for founder sign-off, not to be shipped unilaterally. Whether MAV/MRV band labels are user-facing NOT DETERMINED IN CODE.
```

```
ID: U-NAV-8
AREA: Navigation, IA & findability — tab label
TITLE: Consider renaming the "You" tab to a clearer label (raised as FOUNDER-GATE)
SUGGESTED TIER: 4 Enhancement
IMPACT: 3 — a single label clarity gain; "You" flagged vaguer than "Profile"/"More" (compare-10 NEWBIE VERDICT, VERIFIED principle).
EFFORT: 2 — a label string change — but the tab set/order is locked.
CURRENT STATE: ProfileTab titled "You" (RootNavigator.js:449) (audit §1).
THE PROBLEM: NEWBIE — "You" is vaguer than "Profile"/"More" (compare-10 NEWBIE VERDICT, VERIFIED). ATHLETE — minimal impact.
THE EVIDENCE: compare-10 NEWBIE VERDICT "'You' is vaguer than 'Profile'/'More'" (VERIFIED principle). All other tab labels meet the one-plain-word rule (VERIFIED).
BEST REFERENCE IMPLEMENTATION: NN/g plain-label rule (compare-10, VERIFIED).
PROPOSED SOLUTION: Raise (do not decide) a rename of the "You" tab label. The tab structure and labels are specified in `docs/UI_FLOWS_LOCKED.md` (§ "Navigation changes" defines the locked tab set including "You").
NEWBIE EXPERIENCE: Clearer destination label.
ATHLETE EXPERIENCE: Negligible.
IMPLEMENTATION BLUEPRINT: Single label at RootNavigator.js:449 — but DO NOT change without founder sign-off.
VERIFICATION: Evidence VERIFIED (principle). **FOUNDER-GATE** — tab labels/order are locked (UI_FLOWS_LOCKED). Input only.
```

---

## Part C — Progressive disclosure: Day 1 / Day 14 / Day 60

The brief requires this **grounded in the gates/unlocks that exist in code**
(audit §5), and **NOT DETERMINED** otherwise. Audit §5 is explicit that several
common tenure milestones do not exist as code gates.

### Day 1 — what a new user sees (grounded in code, audit §5)
- Routing: a brand-new signed-in account hits the **Article 9 consent gate**
  first (`RootNavigator.js:1134-1136`); the Article 9 step is where
  `start_cascade` grants the 14-day Pro trial, setting `tier='pro'`
  (`:1100-1103`). Then Pro path → `ProOnboardingStack` (`:1138`); free path →
  `FirstRunStack` (`:1138`).
- Free on-ramp: the **FreeStarter "three plain questions"** difficulty-0 quiz
  installs+activates a starter plan so the user "lands on Home with today's
  session already answered" (`RootNavigator.js:472-475`) + Home's pre-answered
  "today's session" hero (audit §5, §7 counterweight).
- **Proposal (Day 1):** preserve this exactly — it is the best-in-class on-ramp
  (compare-13 NEWBIE VERDICT, compare-15 NEWBIE VERDICT, VERIFIED). Apply U-NAV-1
  (one obvious action) and U-NAV-7 (plain framing) so Day-1 surfaces show **only**
  the start-session action plus plain language; athlete depth is present but below
  the fold. Any change to this path is **FOUNDER-GATE** (ONBOARDING_SEQUENCE_LOCKED).

### Day 14 — what a user sees (grounded in code, audit §5)
- The salient code event near here is the **end of the 14-day in-app trial**:
  `cascade.js:355` "only the end of the 14-day in-app trial transitions to free";
  the `cascade_gate` notification routes to ProfileTab/CascadeGate `{variant:'day14'}`
  (`notificationRoute.js:31-34`). A `trial_day3` value-moment notification also
  exists (`notificationRoute.js:58-65`).
- **Proposal (Day 14):** at the trial→free transition, the user should see a clear,
  non-punitive explanation of what stays Free vs what was Pro (CLAUDE.md FREE/PRO
  list), reachable in-app — note CascadeGate currently has **0 in-app navigate()
  callsites** and is reachable only via the `cascade_gate` notification
  (audit §3); with notifications denied it is "effectively unreachable in-app"
  (audit §3). **Recommend an in-app entry to the day-14 summary** so the
  transition is never silent. Whether any other surface opens CascadeGate is
  **NOT DETERMINED IN CODE** (audit §3, §items). This touches billing/trial
  framing → **FOUNDER-GATE** (SUBSCRIPTION_AND_PAYMENT, GROWTH_STRATEGY) and the
  cascade logic is SACRED-adjacent; input only.

### Day 60 — what a user sees
- **NOT DETERMINED IN CODE.** Audit §5 states plainly there is **no day-7-of-tenure
  and no day-30-of-tenure gate** in the files read, and no day-60 gate is present.
  The `winback` notification is a "+30-day win-back *after a lapse*", not a tenure
  event (`notificationRoute.js:39-44`, audit §5).
- The tenure-like gates that DO exist are **achievement-based, not calendar-based**:
  - **Monthly recap** unlocks at `RECAP_GATE = 10` logged sessions
    (`AnalyticsScreen.js:352`; locked tile "unlocks after 10 logged sessions" :363-366).
  - **Year of Lifts** unlocks at `YEAR_MS = 365 days` of history
    (`AnalyticsScreen.js:377-378`).
- **Proposal (progressive disclosure by milestone, not by calendar day):** because
  the codebase discloses depth by *achievement* (10 sessions → recap; 365 days →
  Year of Lifts), the honest progressive-disclosure model to build on is
  **achievement-gated reveals**, not invented Day-7/30/60 timers. Recommend
  surfacing the existing locked tiles' "unlocks after N sessions" messaging as the
  disclosure ladder (it already exists, AnalyticsScreen.js:363-366) and NOT
  introducing new tenure timers unless the founder defines them. Inventing a
  Day-60 reveal would violate the no-fabrication rule.

> **Summary of the disclosure ladder (code-grounded only):**
> Day 1 = pre-answered session + plain framing; 10 logged sessions = monthly recap
> tile unlocks; 365 days of history = Year of Lifts unlocks; ~Day 14 = trial→free
> transition. Everything between/after is **NOT DETERMINED IN CODE**.

---

## Part D — Dual-audience design system (the key finding)

**The key finding (compare-15 VOLYUME CURRENT, audit §7):** Volyume splits its two
audiences by **PAYMENT TIER (Free vs Pro)**, *not by ABILITY (newbie vs athlete)*.
The only `withProGuard` gates are WeeklyCheckIn, NutritionTargets, BodyMetrics,
CoachOutput, ProGoalSetup, PlanUpdate, CoachingReminders, Diary, LogCardio,
CardioHistory (`RootNavigator.js:149-162`). There is **no progressive disclosure by
ability** (compare-15 WHERE WE LAG, **VERIFIED** vs Notion/NN/g).

> **Status note:** the goal of "serve newbie AND athlete in one product without
> compromise" is the **INTERPRETATION**-flagged opportunity (compare-15 USER
> SENTIMENT/VERIFICATION). The design system below is therefore a proposed
> direction for founder decision, not a sourced requirement. The reference model
> is **CrossFit Rx/scaled** ("one named workout scaled to ability, not a forked
> product" — compare-15 BEST IN CLASS, **PARTIAL**) and **Reddit old.reddit.com**
> ("dual-track fallback that doesn't break experts" — **VERIFIED**).

### D.1 Principle: disclose by ability *on top of* tier, never instead of it
Tier gating is SACRED and unchanged. The proposal adds an **ability-aware
presentation layer** (default simple, depth on request) that sits *within* whatever
tier the user already has. This mirrors Notion/NN/g (default simple, reveal on
request — VERIFIED) and Reddit's preserved-dense-mode (VERIFIED).

### D.2 How each touchpoint serves both audiences (per surface)

| Touchpoint (file:line) | NEWBIE presentation | ATHLETE presentation | Mechanism (no compromise) |
|---|---|---|---|
| **Train landing** (HomeScreen) | One obvious "start today's session" (U-NAV-1); plain framing (U-NAV-7) | Depth (coaching, volume, history) grouped below, reachable in one tap (U-NAV-5) | Reorder by daily-loop; nothing removed (Garmin At-a-Glance pattern, VERIFIED) |
| **Coaching / CoachOutput** (`:388`) | Paired plain descriptor on first encounter (U-NAV-7) | Trademarked "Precision Coaching™" + full rationale ("why", not basics — compare-13 ATHLETE VERIFIED) | Plain lead line + dismissible detail; engine untouched. FOUNDER-GATE (IDENTITY/COACHING_VOICE) |
| **Plans / Training Blocks** (`:326`) | "A plan that changes over weeks" (U-NAV-7) | "Mesocycle/Training Blocks" working term retained | Lead-with-plain, term-in-detail |
| **Volume / MAV-MRV** (`:298,345`; theme `:485-492`) | "How hard each muscle is worked" | MAV/MRV bands as the precise read (compare-13 ATHLETE: jargon = expected vocabulary) | Plain label, advanced bands on the same tile |
| **Body Metrics** (`:347,386`) | One canonical "track my weight" door (U-NAV-6) | Single metrics home, no duplication | De-dup; (gating-to-Free is a separate FOUNDER-GATE input, U-NAV-6 note) |
| **FreeStarter on-ramp** (`:472-475`) | Three plain questions → answered session (best-in-class, VERIFIED) | "Browse all plans" escape to library (compare-13 ATHLETE VERDICT, VERIFIED) | Already dual-audience; preserve |

### D.3 What NOT to do (carried from FATAL/SURVIVABLE evidence)
- **Do not demote any currently-free feature to Pro** to "tier-simplify" — MFP's
  expected-free paywall became "the most common complaint" (compare-15 WHERE WE
  LAG, **VERIFIED**); Sonos/Digg show removing/relocating what users rely on is
  FATAL (compare-15 TOP 50 RANGE, **VERIFIED**).
- **Do not fork into two products.** The dual-audience model scales the *same*
  surfaces (CrossFit Rx, **PARTIAL**; Reddit dual-track, **VERIFIED**), it does not
  split newbie and athlete into separate apps.
- **Do not remove the athlete vocabulary** — make it dismissible/secondary
  (compare-13 F6.2 ATHLETE, **PARTIAL**), never delete it.

### D.4 Optional: a persisted "experience level" preference (raised, not specified)
compare-10 MISSING ENTIRELY / WHERE WE LAG calls for "opt-in *persistent*
personalisation … default casuals to minimal and reveal depth" (PARTIAL, userpilot
/ Fitbit/Garmin support). A saved "show me more detail" preference (not a
re-explained tutorial) would implement D.1 cleanly. **This is NOT DETERMINED IN
CODE** — no such preference exists in the Phase-1 nav inventory (compare-10 MISSING
ENTIRELY). Treat as a new capability for founder decision; do not assume a settings
hook exists.

---

## Part E — Psychological framing (welcoming, not condescending)

Grounded in compare-13 (newbie) and compare-15 (dual-audience). Principle from the
research: **"Teaching beats cheerleading"** — beginners want the *why* explained,
not streak confetti, and the "noisy casino of streaks/notifications/random
workouts" is what scares them off (compare-13 USER SENTIMENT, F1.2/F2.1,
**VERIFIED**). Instructiveness was the single most-mentioned valued attribute (24×,
ahead of personalisation — compare-13 F1.3, **VERIFIED**).

How each feature should be *introduced*:

1. **Start-session (Train):** frame as "Here's today" — the answer, not a menu
   (compare-13 NEWBIE VERDICT, VERIFIED). Keep FreeStarter's existing
   non-discouraging line "The first couple of weeks are for learning the
   movements. That counts as progress." (compare-13 VOLYUME CURRENT, 03-home.md:84-85)
   — this is the model tone; reuse it, do not re-write it (COACHING_VOICE locked).
2. **Coaching:** introduce as "Your weekly guidance" with a one-line *why* attached
   to the action (compare-13 F1.2/F4.1-F4.2, VERIFIED/PARTIAL); avoid leading with
   the trademark to a first-timer (audit §7). FOUNDER-GATE (IDENTITY/COACHING_VOICE).
3. **Volume / Training Blocks / Goal lock:** introduce with the plain outcome first,
   the term second (U-NAV-7); teach the term *in context at the moment of need*
   (Future-style, compare-13 F4.2 VERIFIED), never as an upfront lecture.
4. **Pro features behind a gate (Diary, Targets, Coaching, etc.):** the gate should
   *teach that the feature exists* (the current screen-level gate keeping Diary
   visible is already correct — compare-10 WHERE WE LEAD, VERIFIED) and explain the
   value plainly; the food lock's `TodaysPlateTeaser` (`ProGate.js:96,100`) is the
   right pattern. Never hide the tab. Never shame the free user — copy stays
   "welcoming, autonomy-preserving" like FreeStarter's "There's no wrong answer.
   You can change direction any time." (03-home.md:84). Gating UNCHANGED (SACRED).
5. **Avoid the disliked gamified register:** beginners explicitly disliked the
   streak/confetti pattern (compare-13 F2.1/MISSING, VERIFIED) — do not introduce
   it as the welcoming mechanism. Welcome via clarity and a real plan, not
   celebration noise.

All copy proposed here is **INPUT for founder sign-off** because coaching-facing and
onboarding-facing wording is locked (COACHING_VOICE_SYNTHESIS_LOCKED,
ONBOARDING_SEQUENCE_LOCKED). No wording is shipped by this document.

---

## Appendix — NOT DETERMINED IN CODE (carried, must confirm before building)
- Exact simultaneous on-screen affordance count and current card render order on
  Home/Progress/You (audit §6).
- Whether BuildWorkout and ManualBuilder are functionally redundant or distinct
  (U-NAV-2).
- All `navigate('NutritionTargets')` / `navigate('BodyMetrics')` callsites (U-NAV-3,
  U-NAV-6) before relocating/removing a registration.
- Whether a dedicated single "Cardio hub" screen exists vs only Log/History routes
  (U-NAV-4).
- Whether MAV/MRV band *labels* (`theme.js:485-492`) are user-facing strings
  (U-NAV-7).
- Whether any in-app surface besides the `cascade_gate` notification opens
  CascadeGate (audit §3; Day-14, Part C).
- Day-7/Day-30/Day-60-of-tenure milestones — none exist as code gates (audit §5);
  any such reveal would be a new, founder-defined capability.
- A persisted "experience level / show-more-detail" preference — not in the nav
  inventory (Part D.4; compare-10 MISSING ENTIRELY).
```
