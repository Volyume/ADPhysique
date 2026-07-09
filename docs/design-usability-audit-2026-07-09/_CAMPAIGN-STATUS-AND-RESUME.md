# World-class design campaign — status and resume

**Purpose.** Live state of the 2026-07-09 world-class design/usability
campaign so ANY fresh session can resume without the prior chat. Read this
file, then the SOURCE files it points to, in full, before continuing.
Updated at every phase boundary. Branch: `claude/codebase-audit-docs-pv6mjd`.

## Founder mandate (in-session, 2026-07-09)

- Goal: every area of the app world-class, "best Silicon Valley design
  team" level. Design, interface, usability, flow, ease of use,
  self-explanatory, consistent on all phone sizes, no AI tells even in
  design. Each component as good as the best competitor for that component.
- No user base yet: wholesale changes ARE allowed where they significantly
  improve the product. Do not defer big work to "version two".
- Main loop runs Fable 5 hands-on; dispatched agents run Sonnet, max 3-4
  agents at a time, each batch run to completion before the next (protects
  the founder's 5-hour usage window).
- **Standing delegation:** founder delegates all design/usability/end-user
  judgement calls to the session; every such decision is RECORDED in
  `DECISIONS-2026-07-09.md` (same folder), never made silently. NOT
  delegated: legal/safety/money — GDPR/Article 9 consent substance,
  ED-safety locked text beyond verbatim restoration, billing/trial
  mechanics, new dependencies, cloud migrations. Those go to the founder.
- Keep this file and all records current at each phase so a cleared chat
  can resume cleanly.

## Source documents (read in full before resuming work)

- `00-MASTER-INDEX.md` (same folder) — 137 consolidated findings across 8
  lanes, SAFE/JUDGEMENT/GATED classification, quick-win and decision lists,
  coverage gaps.
- Lane files `01`-`08` (same folder) — the detailed findings with file:line.
- `DECISIONS-2026-07-09.md` (same folder) — D1 card radius 16px; D2
  shadow.glow sanctioned; D3 letterSpacing overline/wordmark; D4 naming
  hybrid (Precision Coaching = branded surfaces, "your coach" = running
  prose, locked surfaces restored verbatim); plus the standing delegation.
- `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` — locked voice surfaces 1-8.
- `CLAUDE.md` — constitution; section 2 inviolables unchanged by this
  campaign.

## Campaign plan (batches)

- **Batch 1 (PARTIALLY LANDED, salvage pass committed `1b47687`; original
  agent scope below is NOT fully done — see gap list):** three Sonnet
  agents + hands-on work.
  - Agent A: lane-01 SAFE copy fixes + D4 naming sweep (excludes
    ED-safety/consent/billing files, src/lib safety modules, notifications).
  - Agent B: lane-03 layout fixes (FoodSearchScreen inset + ModalHeader +
    radius literal — B owns that whole file; ActiveWorkoutScreen navTab
    hitSlop; WorkoutHistory dayNum font cap; ManualBuilder reorderBtn;
    8 Dimensions.get → useWindowDimensions migrations).
  - Agent C: lane-02 visual fixes (PartnerScreen/MealPlanScreen skeletons;
    RecipeBuilder ModalHeader; shadow.glow applied at 3 sites; off-scale
    radius/padding literals; full letterSpacing sweep to tokens + new
    ESLint ban; header trio documented in styling.md/DESIGN_SYSTEM.md).
  - Hands-on (Fable): theme spine (DONE, committed `214b057`); locked-surface
    restorations DONE (`de9a165`): GoalLockConsent Surface 4, whyThisTemplates
    A14, weeklyCoach A15, differentialPaywall A21 + snapshot test, voice-doc
    D4 addendum.

  **What actually landed vs the scope above.** The three agents' work
  stalled mid-run; only a SUBSET of the scope above had reached the working
  tree as uncommitted changes across 16 files, and even that subset had a
  defect (YearOfLiftsScreen's `Dimensions.get -> useWindowDimensions`
  migration was half-finished: `useWindowDimensions` imported but unused,
  `SCREEN_W` undefined at three sites). A follow-up Sonnet session (this
  entry) did NOT re-run the agents or attempt their full original scope —
  per instructions it finished and verified only what was already in the
  tree: completed the YearOfLifts migration (SCREEN_W now read inside the
  component via useWindowDimensions; StoryCard takes a `width` prop applied
  inline since a hook value cannot live in StyleSheet.create at module
  scope), fixed five pre-existing test files whose expectations pinned
  copy/structure the sweep deliberately changed (each has an inline
  old -> new note: planPreview's em-dash removal, LiftProgress's
  e1RM -> "est. max" jargon fix, FoodSearchScreen's ModalHeader +
  sticky-plate-bar-inset adoption), then committed as `1b47687`. Lint clean;
  full suite green bar three pre-existing, unrelated failures left
  untouched: `weeklyCoach.ffmFloor.test.js` (ED-safety module, out of
  scope), `ActiveWorkoutScreen.usability.guard.test.js`'s cueCount assertion
  (pre-existing on HEAD before this campaign touched the file), and
  `progressScanVision.test.js` (environment-only).

  **Confirmed STILL OUTSTANDING (checked directly, 2026-07-09) — not in
  `1b47687`, not anywhere else on this branch:**
  - Agent C's PartnerScreen/MealPlanScreen skeleton loaders: no `Skeleton`
    reference in either screen.
  - Agent C's RecipeBuilderScreen ModalHeader adoption: no `ModalHeader`
    import in that screen.
  - Agent C's `shadow.glow` application at the three Pro-moment sites
    (WelcomeScreen/ProOnboardingScreen/ProUpgradeScreen): zero screens
    reference `shadow.glow`, even though the token itself exists in
    `theme.js` (theme-spine work, D2). D2 is authorised but not applied.
  - Agent C's full letterSpacing sweep + new ESLint ban: the `overline`/
    `wordmark` tokens exist in `theme.js`, and a few sites already route
    through `letterSpacing.caption` (PartnerScreen, PartnerPrivacyReceipt),
    but raw non-zero `letterSpacing` literals remain in at least
    CardioHistoryScreen, ImportScreen, MesocycleBuilderScreen (×2),
    PlanPreviewScreen, SettingsAboutScreen (×2, includes an unconverted
    wordmark candidate), and PRCelebration (unconverted wordmark
    candidate). No ESLint rule bans raw `letterSpacing` yet.
  - Agent C's header-trio documentation in styling.md/DESIGN_SYSTEM.md:
    neither doc mentions `letterSpacing`, "header trio" or `ModalHeader`.
  - Agent B's "8 Dimensions.get → useWindowDimensions migrations": only 4
    were found done anywhere on the branch (BodyMetrics, ExerciseDetail,
    FoodInsights, YearOfLifts). The other 4 sites Agent B was assigned are
    unidentified and unconverted.

  A fresh session resuming Batch 1 should treat the above as the real
  remaining backlog, NOT re-open the four items already confirmed
  complete (theme spine, locked-surface restorations, the 16-file salvage
  in `1b47687`, or FoodSearchScreen's inset+ModalHeader+radius-literal
  trio, which layout tests now pin).
- **Batch 2 (QUEUED):** Card adoption (155 hand-rolled blocks, heaviest:
  NutritionTargets 12, ActiveWorkout 12, WorkoutSummary 10,
  ExerciseDetail 10); Button adoption on true CTAs among ~840 raw
  touchables; EmptyState adoption (6 screens); uppercase section-label role
  consolidation (B-5, 25 sites — pairs with D3 overline token).
- **Batch 3 (QUEUED):** new audit lanes for the six coverage gaps
  (master index section 5): light-theme parity (app is dark-first — the
  LIGHT palette is the unaudited one), motion/animation quality, aesthetic
  design-language craft, accessibility (contrast/screen-reader), first-run
  emotional quality, competitive benchmarks for Home/Progress/Settings.
- **Batch 4+ (QUEUED):** elevation builds from batch-3 lanes; flow fixes
  from lane 04; meal-builder fixes from lane 05; partners fixes from lane
  06; workout-logger improvement list from lane 07 (hitSlop done in batch
  1; short-screen compact mode pending device-walk); founder-gated
  conversion-funnel decision set (lane 08 + master index section 4
  GATED 12) — needs a structured founder question round first.

## Founder decisions still OPEN (ask, do not start)

Master index section 4 GATED list, minus what D1-D4 resolved. Highlights:
conversion-funnel set (PaywallScreen dead code, trial-length contradiction,
silent trial start...), Partners consent-receipt options, RIR/RPE per-set
entry (coaching boundary), iOS Live Activity (gated item 14), drag-reorder
dependency, NT1/PDT1 additive migrations + sync registry, MN-1 STATUS-line
confirmation, ProOnboarding Step 2 split (onboarding-gated), en-dash
range carve-out.

## Completed so far (commit history is the ground truth)

- 8 audit lanes + master index committed (`7c03c2c`, `39db870`).
- Theme spine + drift repairs (`Card` radius 16px default;
  `letterSpacing.overline/wordmark`; `shadow.glow` + Materials Policy
  exception; workout logger chip back to "N notes" per U-A-1 contract;
  ProGate guard stale 'Your week' ban removed). Committed after `39db870`.
- Known environment-only test failure: `progressScanVision.test.js` needs
  `react-native-fast-tflite`, which is not installed in this container.
  NOT a code defect; do not chase.

## How to resume

1. Read this file, `00-MASTER-INDEX.md`, `DECISIONS-2026-07-09.md`.
2. `git log --oneline -15` on this branch to see what landed.
3. Continue the first unfinished batch item above; keep the batch
   discipline (max 3-4 Sonnet agents, complete before next batch).
4. Update this file + commit at every phase boundary.
