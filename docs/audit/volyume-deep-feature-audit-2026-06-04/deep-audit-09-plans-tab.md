# Deep Feature Audit — Item 8: Plans tab (PlansScreen)

**Document:** deep-audit-09-plans-tab.md
**Item:** 8 of master inventory (Group 2 — tab landings; `PlansTab` / title "Plans")
**File:** `src/screens/PlansScreen.js` (1054 lines), components `PeekMenu`, `PressableCard`, `AnimatedEntrance`, `ScreenHeader`, libs `blockAdvisor`, `planSwitch`
**Status:** IMPLEMENTED (approved 2026-06-04, "A" — resume audit and implement). Removed 23 verified-dead style keys (cardio cluster, screenHeader/pageTitle, goalsPointer, Pro-lock variant, training-days picker, sectionDeemphasised); added accessibilityRole/Label to the active-plan Start/View, the My-plans + archived footer links, the template Start, and the block-card buttons, plus expanded state on the archived header; de-duplicated the audience comment. No behaviour change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The Plans tab. Top to bottom: a block-advisor card (heads-up / early-deload /
in-recovery / post-recovery states, snoozeable), the active-plan hero (ACTIVE
badge, name, workout count, block week, a Pro coaching note, Start-Next +
View-Plan), or a "no active plan" row; then "My plans" cards (view / set-active /
options via `PeekMenu` + long-press), a collapsible "Archived plans" section,
"Workout templates" (start / edit / delete), a "Training blocks" row into the
mesocycle builder, and a Decision Hub whose cards adapt by tier (Pro: update-and-
rebuild / library / manual; Free: library / manual). Data loads via one
`Promise.all` on focus and on `cloudSyncVersion`; pull-to-refresh re-loads;
first load shows skeletons. Plan switching is guarded by `confirmPlanSwitchMidBlock`.

### Findings
1. **~23 orphaned style keys.** Same pattern as the Train tab: surfaces were
   removed but their styles remain. Verified unused (0 `styles.X` refs each):
   - the entire cardio card cluster `cardioCard`, `cardioHeader`, `cardioTitle`,
     `cardioHistoryLink`, `cardioSub`, `cardioBtn`, `cardioBtnText` — the comment
     at `:85-87` still describes a "Weekly cardio card on Plans" but the card was
     moved to Progress (founder 2026-06-03, comment `:752-753`);
   - `screenHeader`, `pageTitle` — superseded by the shared `ScreenHeader`;
   - `sectionDeemphasised`, `goalsPointer`, `goalsPointerText`, `goalsPointerLink`;
   - the Pro-lock variant `actionCardLocked`, `actionCardTitleLocked`,
     `lockBadge`, `lockBadgeText` (no locked card is rendered here);
   - the training-days picker `trainingDaysRow`, `dayChip`, `dayChipOn`,
     `dayChipLabel`, `dayChipLabelOn`, `trainingDaysHint` (no day picker in JSX).
2. **Accessibility gaps on the action controls.** The active-plan Start-Next
   (`:526`) and View-Plan (`:530`), the My-plans/archived footer links
   "View plan" / "Set as active" / "Restore" (`:580-591`, `:643-654`), the
   template Start (`:675`), the block-card buttons (`:446-491`), and the
   archived-section expand header (`:602`) are `TouchableOpacity`s with no
   `accessibilityRole`. The "more" (ellipsis) buttons and the `PressableCard`s
   DO have roles/labels — the gap is the inline text buttons. The archived header
   should also expose `accessibilityState={{ expanded }}`.
3. **Copy is strong and on-voice.** No em dashes (middots + commas), British-
   compatible, no AI tells. The Decision-Hub descriptions (especially "Update
   plan and rebuild", `:59`) run long, but they describe a consequential action
   (rebuild plan + nutrition; history/PRs kept) so the detail is earned, not
   filler. Nothing to rewrite.
4. **Minor comment tidy (non-shipping).** The audience comment at `:365-373`
   lists "Pro with an active plan" twice in its bullet list. Harmless, code-only.
5. **Planless-Pro framing is a documented trade-off, not a bug.** A Pro with no
   plan sees the "Start or build a plan" heading (since `isProWithPlan` is false)
   but the Pro action set whose first card is "Update plan and rebuild". The
   comment `:365-373` explains this is deliberate so a brand-new Pro can reach the
   coached builder. Acceptable; flagged for awareness only.

### Design assessment (values cited)
- On-system throughout: `surface`/`surface2`, amber `primary`/`primaryBg`,
  semantic `warning`/`success`/`error` only on the block-advisor states and
  signal chips (not decoration), scale spacing/radii. The active plan leads,
  which matches "Resume your plan" best practice. The Decision-Hub cards are
  parallel, but they are genuinely distinct routes (Library / Manual / Goals),
  so they pass the "earned, not balancing the page" test.

### Flow / integration assessment
- Start flows (active plan, template) build `initialExercises` with superset
  hydration and cross-navigate to `HomeTab/ActiveWorkout`; all wrapped in
  toast-guarded try/catch. Archive / restore / duplicate / delete go through the
  DB layer then `loadData`. Plan switching mid-block is gated. `PeekMenu` (a ref-
  driven sheet) backs the long-press / ellipsis menus. Solid, well-guarded.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Active plan first / "Resume your plan".** Best practice is to surface the
  active programme and an obvious resume/continue action; Volyume leads with the
  ACTIVE hero + Start-Next. [Stormotion; Zfort]
- **Categorised library + custom build.** A browsable plan library plus a
  build-your-own path is the recognised shape; Volyume offers both (Library +
  Manual) and a coached rebuild for Pro. [Easternpeak; MadAppGang]
- **Clutter-free, monochromatic, personalised.** A clean dark interface with
  clear hierarchy is endorsed; Volyume's locked dark/amber system fits. [Superside]

---

## STEP C — COMPARISON

### Where Volyume leads
- Active-plan-first with block-aware coaching (the advisor card's deload /
  recovery states), archive + templates, and a tier-adaptive decision hub. This
  is richer plan management than most apps, which offer a flat plan list. The
  block advisor in particular has no obvious competitor equivalent. [Stormotion]

### Where Volyume lags
- ~23 lines-worth of dead styles (finding 1).
- Inline text action buttons missing a11y roles (finding 2).

### Critical gaps
- None functional. Tidiness + a11y polish.

---

## STEP D — PROPOSAL

### Summary
Same low-risk shape as the Train tab: delete the verified dead styles, add roles
to the inline action buttons (and an expanded state to the archived header), and
tidy one duplicated comment line. No behaviour, data, or flow change.

### Specific changes — one by one

**1. Remove the ~23 verified-unused style keys. [Cleanup — Low, zero behaviour
risk] — styles block `:760-1054`**
- What: delete the orphaned keys in finding 1 (each grep-verified at 0
  `styles.X` references).

**2. Add a11y roles to the inline action controls. [A11y — Low]**
- What: `accessibilityRole="button"` + concise labels on the active-plan
  Start-Next / View-Plan, the My-plans / archived footer links, the template
  Start, and the block-card buttons; `accessibilityRole="button"` +
  `accessibilityState={{ expanded: archivedExpanded }}` on the archived header.

**3. (Tiny) De-duplicate the audience comment. [Code comment — trivial] —
`:365-373`**
- What: drop the repeated "Pro with an active plan" bullet. Non-shipping.

### COPY CHANGES
None. On-voice and human.

### What to keep (with evidence)
- Active-plan-first hierarchy + Start-Next ("Resume your plan"). [Stormotion]
- The block advisor (deload/recovery awareness), archive + templates, the tier-
  adaptive decision hub, skeletons, `PeekMenu`, and the mid-block switch guard.

### IMPACT / EFFORT
- **Impact:** Low (tidiness) / Low (a11y).
- **Effort:** Low. No behaviour, data, or navigation change.

### SOURCES
- Stormotion — Fitness app UX principles: https://stormotion.io/blog/fitness-app-ux/
- Zfort — Fitness app UX/UI for engagement & retention:
  https://www.zfort.com/blog/How-to-Design-a-Fitness-App-UX-UI-Best-Practices-for-Engagement-and-Retention
- Easternpeak — Fitness app design best practices:
  https://easternpeak.com/blog/fitness-app-design-best-practices/
- Superside — UX principles from top fitness apps:
  https://www.superside.com/blog/ux-design-principles-fitness-apps
