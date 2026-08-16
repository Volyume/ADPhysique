# HOME/TODAY — STATE MATRIX, DENSITY, AND DUPLICATION EVIDENCE
**Campaign 22 Phase 1, Steps 2 + 3 + 5**
**Date:** 2026-08-16
**Builds on:** `docs/home-today-ux-campaign-22-2026-08-16/STATE-INVENTORY.md` (section ids referenced below match its numbering, e.g. "1.2 Coach Review Banner")
**Sources read in full for this pass:** `src/screens/HomeScreen.js` (3,053 lines), `src/components/TodayStrip.js`, `src/components/RecoveryStateCard.js`, `src/components/AttentionCard.js`, `src/components/ScreenHeader.js`, `src/components/CoachBriefCard.js`, `src/components/HomeWelcomeCard.js`, `src/components/HomeProTeaserCard.js`, `src/components/HomeLastSessionCard.js`, `src/components/Card.js`, `src/components/Button.js`, `src/components/EmptyState.js`, `src/lib/recoveryState.js`, `src/lib/readinessSummary.js`, `src/lib/homeCoachBrief.js`, `src/styles/theme.js` (spacing/fontSize/radius/type tokens)

This is an evidence document. No opinions on what should change; every claim below carries a `file:line` receipt. Items requiring an on-device screenshot to confirm are marked **[DEVICE CONFIRMATION NEEDED]**.

---

## PART 1 — STATE MATRIX

### 1.0 How the states were chosen

Home is gated by ~47 independent state variables (STATE-INVENTORY.md §2), which is a combinatorial space, not a set of "screens". Most combinations collapse because:
- The banner stack has a **hard one-slot cap** (`BANNER_PRIORITY`, `HomeScreen.js:1806-1817`) — only ONE of 7 ranked banners can ever be visible at a time, so "which banner shows" is a single ranked-list lookup, not 7 independent booleans.
- `RecoveryStateCard` is **outside** that cap (STATE-INVENTORY.md §1.7; confirmed at `HomeScreen.js:2039-2043`, rendered unconditionally between the plateau banner and the activation banner) — so the only genuine combinatorial axis left is "which banner won the cap" × "is RecoveryStateCard also showing".
- Tier (`free`/`pro`) statically removes or adds whole sections (TodayStrip, coaching nudge, coach banner are Pro-only; teaser and differential badge are Free-only), so tier is a hard fork, not a modifier.
- `hasActiveWorkout` short-circuits the entire hero/empty-state branch (`HomeScreen.js:2168`) into a single "Continue" card, collapsing every downstream plan/coach/recovery state into one row while a session is live.

18 states below are judged materially distinct (different sections render, or the same sections render with contradicting/different content). Everything else is a content variant of one of these 18 (e.g. "5 different trial-banner copy variants" is still state 13/14, just different `trialBanner.line` text from `trialBannerLine()`).

### 1.1 Startup / transient states

**S0 — Active-workout restore pending.**
On mount, if `user?.id && !activeWorkout`, `restoreActiveWorkout(user.id)` runs (`HomeScreen.js:228-231`) to rehydrate a workout stranded by an app kill. Until it resolves, `hasActiveWorkout` is `false`, so Home renders the **skeleton or the hero/empty branch** as if no workout were active, then re-renders into the Continue card (§1.12) the instant the store updates. Materially different from steady-state only for the frame(s) before resolution; collapses into whichever of S1-S6 the plan state below it would otherwise be. Flagged because a slow SQLite read on a large device could make this visible **[DEVICE CONFIRMATION NEEDED — timing]**.

**S1 — Cold launch skeleton.**
`initialLoading === true` (`HomeScreen.js:321`, cleared in `loadData()`'s `finally`, `HomeScreen.js:481-483`). Renders `ScreenHeader` + two `SkeletonCard`s (160px hero shape, 64px strip shape) and nothing else (`HomeScreen.js:2120-2127`). No banners, no TodayStrip, no hero — everything downstream is gated behind this or renders in parallel and is simply invisible until state settles (banners are NOT gated by `initialLoading`, only the skeleton block and the sections below it are literally absent from the tree until their own loader states populate — the coach/trial/deload banners CAN appear above the skeleton on the very first paint if their loaders race ahead of `initialLoading` flipping false, since they are separate state variables, not blocked by the skeleton flag).

### 1.2 Steady-state, tier × plan × banner-cap combinations

**S2 — Active workout in progress (any tier, any plan/banner/recovery state).**
`hasActiveWorkout === true` (`HomeScreen.js:1645`, `!!activeWorkout && !isStartingWorkout`). Renders: header, then whichever ONE banner won the cap (banners are NOT suppressed by an active workout — they render above it unconditionally), `RecoveryStateCard` if a lighter-training state exists, `TodayStrip` if Pro, then the **Continue card** (`HomeScreen.js:2168-2184`, green `success` background, "Workout in progress" / "Tap to return to your workout") in place of the entire hero/empty-state/welcome-card branch. Last-session card and teaser still render below (they are not gated on `hasActiveWorkout`). **Collision:** this is the one state where the top-of-screen banner and a "go do something else" continue card can coexist — e.g. a fresh coach review banner sitting directly above "Workout in progress", both demanding attention.

**S3 — Established Pro, normal day, no banner eligible.**
Tier pro, no coach output due, no trial, no deload/phase/plateau/activation signal, no ED/calm suppression relevant (nothing eligible to suppress). Renders: header → `TodayStrip` (logged or not-logged) → hero card (plan active) or empty state (no plan) → last-session card. This is the baseline "nothing to say" render and the most common steady state for an established user.

**S4 — Established Pro, fresh coach review, meaningful change.**
`showCoachBanner === true` with `latestCoachOutput.adjustments?.calories?.applied` truthy (`HomeScreen.js:1902-1904`). Coach banner (rank 1, wins the cap unconditionally over trial/deload/phase/plateau/activation/attention) shows `"Coach - this week's decision"` / `"Calories adjusted to ${newKcal} kcal. Tap to see why."`. **Priority proof (verbatim):**
```
const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachDecisionComplete
  && !coachBannerDismissed
  && (Date.now() - (latestCoachOutput.weekStart ?? 0) < 7 * 86400000);
```
(`HomeScreen.js:1740-1742`), and it is `BANNER_PRIORITY[0]` (`HomeScreen.js:1807`), so nothing else in the stack can ever outrank it while eligible.

**S5 — Established Pro, coach output exists but decision NOT complete.**
`latestCoachOutput` is non-null but `latestCoachDecisionComplete === false` (e.g. baseline weeks, `hasEnoughData:false`, or no matching check-in — `isCompletedCoachDecision`, referenced `HomeScreen.js:498, 557`). `showCoachBanner` is `false`; the banner does not degrade to a lesser form, it simply does not render, and nothing on Home says a coach review is pending. This is materially different from S4 (zero coaching signal on Home vs. an actionable one) despite both having a truthy `latestCoachOutput`.

**S6 — Established Pro, recovery week SCHEDULED (`PLANNED_BLOCK_RECOVERY`), first view.**
`gatedRecoveryState.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY` (`recoveryState.js:49`), `recoveryRead === false` so `RecoveryStateCard` renders **expanded** (`HomeScreen.js:2041`, `expanded={!recoveryRead}`). Three simultaneous renderings of the same fact (see PART 3 §3.1 for full receipts):
1. `RecoveryStateCard` expanded: title `"Recovery week"`, body "You have finished the hard-training part of this block...", next "Once this recovery week is done, you choose what comes next..." (`recoveryState.js:178-183`).
2. Hero eyebrow: `"Recovery week · Day X of Y"` (`nextWorkoutRecoveryLabel`, `recoveryState.js:196-201`; composed at `HomeScreen.js:2188`).
3. Readiness chip: `"Recovery week, pull effort back."` or `"Recovery week on the calendar..."` (`readinessSummary.js:80-85`).
**Suppression proof:** the data-driven "Recovery week suggested" banner is explicitly excluded here — `const inScheduledRecovery = !!currentMesoWeek?.isDeload || !!currentMesoWeek?.awaitingDecision;` / `deloadBannerEligible = !!deloadSuggestion && !deloadDismissed && !inScheduledRecovery;` (`HomeScreen.js:1767-1768`).

**S7 — Established Pro, recovery ADAPTIVE ADJUSTMENT (not scheduled).**
`gatedRecoveryState.state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT` (`recoveryState.js:50`, requires `isDeload === true` mid-block per `recoveryState.js:138-144`). Same three-surface pattern as S6, but `RecoveryStateCard` and the hero eyebrow correctly say **"Training is lighter for now" / "Recovery-adjusted"** (`recoveryState.js:185-192`, `196-200`) while the readiness chip's priority-1 branch **still says `"Recovery week, pull effort back."`**, because it only tests `currentMesoWeek.isDeload` (`readinessSummary.js:80`) and does not distinguish the two `RECOVERY_STATE` values the way `RecoveryStateCard`/`nextWorkoutRecoveryLabel` do. See PART 3 §3.1 for the full wording-mismatch evidence.

**S8 — Established Pro, deload SUGGESTED (data-driven, not scheduled).**
`deloadSuggestion` truthy from `shouldDeload()` and `!inScheduledRecovery` (`HomeScreen.js:1768`). Deload banner (rank 3) shows if nothing rank 1-2 is eligible: `"Recovery week suggested"` / `deloadSuggestion.reasons?.[0]` (`HomeScreen.js:1959-1965`). `RecoveryStateCard` does NOT render here (`gatedRecoveryState` is null — no lighter-training state exists yet, only a suggestion). Readiness chip shows a *different* line: `"Recent training signals point towards easing off soon."` (`readinessSummary.js:91-93`, priority 2, distinct wording from S6/S7's priority 1) — so this state, unlike S6/S7, does NOT produce a wording contradiction, only two independently-worded mentions of "ease off" (banner + chip).

**S9 — Established Pro, block finished, awaiting decision.**
`currentMesoWeek.awaitingDecision === true`. `resolveRecoveryState` returns `null` when `awaitingDecision` (`recoveryState.js:110`), so `RecoveryStateCard` renders nothing and the hero eyebrow's `recoveryLabel` is also null (same resolver feeds both). The ONLY surface carrying this fact is the readiness chip's dedicated override line: `"Block finished. Targets hold at recovery-week volume until you choose what comes next."` (`HomeScreen.js:1703-1704`). Deload-suggested banner is also suppressed here (`inScheduledRecovery` includes `awaitingDecision`, `HomeScreen.js:1767`). Notable as the one recovery-adjacent state where the usual 2-3-way duplication **collapses to one surface**.

**S10 — Established Free, normal day, no plan gaps.**
Tier free, has active plan, no banner eligible. Renders: header → hero card (no TodayStrip — Free is excluded, `HomeScreen.js:2139` `tier === 'pro' && user?.id`) → last-session card. No coach banner, no coaching nudge (both Pro-only).

**S11 — Established Free, no plan, has session history (3+ sessions).**
`!activePlan || !nextWorkout` with `lastSession != null` and `totalSessions >= 3`. Renders SIMULTANEOUSLY: no-plan `EmptyState` (Free copy, history variant: "You've been training without a set plan...", `HomeScreen.js:2325-2327`) → "Progress at a glance" card (`HomeScreen.js:2338-2355`) → **outside** that block, `HomeProTeaserCard` (`HomeScreen.js:2407-2413`) → `HomeLastSessionCard` (`HomeScreen.js:2419-2427`). Four cards independently touching the same underlying session-history fact in one render pass; see PART 3 §3.3 for the exact string collision.

**S12 — Established Free, free-coach-line eligible.**
`tier === 'free' && !!freeCoachLine && !freeCoachLineDismissed` (`HomeScreen.js:1800`) and it wins the attention slot (`showFreeCoachLine`, `HomeScreen.js:1826`). `AttentionCard` variant `free_line` renders the weekly one-liner + "Pro reads the full story" (`AttentionCard.js:119-146`).

**S13 — Established Free, differential paywall badge eligible.**
`differentialBanner?.shown` truthy and free-coach-line NOT eligible this render (`showDifferentialBadge = differentialBadgeEligible && !freeCoachLineEligible && showAttentionSlot`, `HomeScreen.js:1827`) — internal tie-break inside the shared low-priority slot, decided by `pickAttentionVariant()` (`AttentionCard.js:37-42`: trial > free_line > differential).

**S14 — Early trial (Pro trial, day 0-14), no first review yet, has history.**
`stageOf(userProfile) === 'pro_trial'`, `trialBanner` non-null, `trialBannerEligible` (`HomeScreen.js:1757`). Trial banner (rank 2) shows `trialBanner.line` + "Your free trial runs to `${endsLabel}`." (`HomeScreen.js:592`, `loadTrialBanner`) + "How Precision Coaching works" button. TodayStrip renders (trial user is still `tier === 'pro'`). Hero/empty state per plan status.

**S15 — Early trial, zero-history variant (S3 trial-copy variant).**
Same gate as S14 but `selectTrialVariant` picked `'S3'` (zero completed sessions). Materially different ACTION, not just copy: `onTrialPress` routes to `handleStartNextWorkout(false)` instead of the check-in screen, but only if a plan+workout exist — otherwise the card renders with **no press handler at all** (informational only, no chevron):
```
const Wrapper = onTrialPress ? TouchableOpacity : View;
```
(`AttentionCard.js:70`), driven by
```
onTrialPress={trialBanner.variant === 'S3'
  ? (activePlan && nextWorkout ? () => handleStartNextWorkout(false) : null)
  : () => navigateCrossTab(navigation, 'ProfileTab', 'WeeklyCheckIn')}
```
(`HomeScreen.js:1937-1939`).

**S16 — Trial banner suppressed by same-day coaching nudge.**
`trialBannerEligible = !!trialBanner && !trialBannerDismissed && !showCoachingNudge` (`HomeScreen.js:1757`) — a deliberate "don't repeat yourself" rule. **Collision:** on the scheduled check-in day, the trial banner (which would otherwise occupy the TOP of the screen) disappears entirely, while the coaching-discovery nudge (`HomeScreen.js:2433-2471`, "Your weekly check-in is ready") renders far below, AFTER the hero card, last-session card and teaser — i.e. the only mention of "it's your check-in day" moves from the top of the screen to below the fold on this day, with nothing in the banner slot unless a different banner (deload/phase/plateau/activation/attention) is independently eligible.

**S17 — Brand-new Pro, plan not yet generated (or generation pending/failed).**
0 sessions, `!activePlan || !nextWorkout`. Welcome card does NOT show (gated on `activePlan && nextWorkout`, `HomeScreen.js:2163`). Pro `EmptyState`: `"No active plan yet"` / "If you just signed in, we may still be pulling your data from the cloud..." / "Start with a plan" (`HomeScreen.js:2300-2317`). TodayStrip still renders (not-logged state, possibly enrolment-seed-suppressed — `isEnrolmentSeedWeight`, `HomeScreen.js:963`).

**S18 — Brand-new Pro/Free, plan active, 0 sessions, first workout not started.**
`totalSessions === 0 && !welcomeDismissed && activePlan && nextWorkout` (`HomeScreen.js:2163`). `HomeWelcomeCard` renders above the hero, with tier-specific step-2 copy ("Your coach learns as you train" Pro / "Your progress builds as you train" Free, `HomeWelcomeCard.js:67-73`). Hero card renders in its normal first-run form directly below (no separate "first-run hero variant" branch exists in the JSX read — the founder's 2026-06-30 ruling removed the old cut-down "short session" first-run variant, per the comment at `HomeScreen.js:2241-2244`).

### 1.3 States that collapse into the above (with reason)

- **Setup incomplete / sex not chosen / consent not granted**: never reaches HomeScreen — `RootNavigator` gates on Article 9 consent and onboarding completion before Home mounts (CLAUDE.md architecture facts; not re-verified in this pass, out of scope per the READ-ONLY brief on `src/`).
- **Explicit skip of a workout**: `handleSkipThisWorkout` (`HomeScreen.js:1372-1413`) shows a native confirmation `Alert`, then calls `recordSessionResolution` and reloads — the resulting screen is just S3/S10 etc. with `programmePosition` advanced. No persistent "you skipped" banner or card exists on Home afterward.
- **Re-entry prompt (long gap)**: `maybeAskReEntry` (`HomeScreen.js:1421-1459`) shows a native `Alert` once per return; it does not alter any rendered section, only overlays a system dialog atop whatever state (S3/S10/S17/S18 etc.) was already true.
- **Bodyweight trend vs no-trend**: `TodayStrip`'s `onOpenTrend` prop is passed unconditionally by `HomeScreen.js:2149` (`onOpenTrend={() => navigateCrossTab(...)}`), so the "no trend door" branch inside `TodayStrip.js:168` (`hasTrendDoor = typeof onOpenTrend === 'function'`) is dead on Home specifically — it is always true here, so this named brief axis produces no material state difference on THIS screen (only its accessibility-label wording differs internally, `TodayStrip.js:176-178`).
- **ED flag open / calm mode**: does not add a NEW rendered section; it subtracts from the low-priority end of the stack (free coach line, activation nudge, differential banner all resolve to `null` in their loaders — `HomeScreen.js:835`, `901`, `650-651`) and forces the trial banner onto its neutral copy variant (`edFlagOpen` param into `trialBannerLine`, `HomeScreen.js:587`). It never touches `TodayStrip`, which has no ED/calm check in its own loader (`loadTodayWeight`, `HomeScreen.js:951-971`) or render gate (`HomeScreen.js:2139`, tier-only). Its material effect is fully captured by re-running any of S3/S10/S12/S13/S14 with those loaders forced to `null`/neutral — not a new layout, so it is not counted as its own top-level state, but is flagged here because it is the one axis in the brief where "no material difference" required checking every low-priority loader individually.

---

## PART 2 — DENSITY / ABOVE-THE-FOLD ANALYSIS

**Method:** every figure below is derived from `StyleSheet.create` values (padding/margin/gap in `spacing.*` tokens) and `type.*` role line-heights, both read from `src/styles/theme.js:373-384` (spacing scale) and `:569-639` (type role line-heights). **No screenshots exist in this session; every summed height is an estimate from source, not a measurement**, marked accordingly. Fold line used: **700dp**, per the brief's instruction (a common mid-range Android viewport height after status bar + nav bar chrome; the actual usable height is device-specific — **[DEVICE CONFIRMATION NEEDED for exact fold position on the founder's device]**).

Token reference used throughout:
- `spacing`: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (`theme.js:373-384`)
- `fontSize`: xs 11, sm 13, md 16, lg 17, xl 20, xxl 24 (`theme.js:402-411`)
- Type role line-heights (`round(fontSize × multiplier)`, `theme.js:569-639`): `caption` 11×1.35≈15, `captionTight` 11×1.45≈16, `bodySm` 13×1.5≈20, `label`/`captionStrong` 13×1.35≈18, `body`/`bodyStrong` 16×1.5=24, `title` 17×1.35≈23, `h3` 20×1.35=27, `h2` 24×1.35=32.
- Button `md` size: `pv: spacing.md(12), ph: spacing.lg(16), font: fs.md(16)` (`Button.js:69`) → estimated total height ≈ 12+12+24(body line) = **~48dp**. Button `sm`: `pv: spacing.sm(8) … font: fs.sm(13)` → ≈ 8+8+20 = **~36dp**. **[DEVICE CONFIRMATION NEEDED — Button.js's own text-line-height property was not fully traced past line 120 of the file in this pass; the 48dp/36dp figures assume `type.body`/`bodySm` line-heights apply, consistent with Android's standard 48dp/36dp button heights]**.
- `ScrollView` content container: `padding: spacing.lg(16), gap: spacing.lg(16), paddingBottom: spacing.xxl(32)` (`HomeScreen.js:2681`) — i.e. **16dp before the first element and 16dp between every top-level sibling**, applied uniformly regardless of which state is showing.
- `ScreenHeader`: `titleRow` `minHeight: 32` (`ScreenHeader.js:81`) holding the h3 title (line-height 27, fits inside), plus a `subtitle` line (`bodySm`, ≈20dp) when present (always present here — `getGreeting()` never returns empty), plus `wrap.paddingBottom: spacing.xs(4)` (`ScreenHeader.js:73`). **Header total ≈ 32 + 20 + 4 = 56dp.** SafeAreaView's own top inset (status bar / notch) is ADDITIONAL and device-specific — **[DEVICE CONFIRMATION NEEDED]**.

### 2.1 Established Pro, normal day (S3)

| Element | Height estimate (dp) | Source |
|---|---|---|
| Content top padding | 16 | `HomeScreen.js:2681` |
| ScreenHeader | 56 | `ScreenHeader.js:73,81` + subtitle `bodySm` |
| gap | 16 | `HomeScreen.js:2681` |
| TodayStrip (logged or not-logged) | ≈62 | card `paddingVertical: spacing.xs(4)×2=8` (`TodayStrip.js:275-277`) + `metricRow.minHeight:54` (`TodayStrip.js:280`) |
| gap | 16 | content gap |
| Hero card (pad 16 top/bottom, `Card` default `padding='lg'`, `Card.js:43,87`; internal `gap: spacing.sm(8)`, `HomeScreen.js:2707`) | | |
| — eyebrow (`SectionLabel`, caption-scale) | ≈16 | `HomeScreen.js:2187-2189` |
| — workout name (explicit `lineHeight: 30`) | 30 | `HomeScreen.js:2712-2717` |
| — readiness chip (`mesoBriefChip`: `marginTop: xs(4)`, `paddingVertical: xs(4)×2=8`, text `fontSize.xs` line≈15) | ≈28 | `HomeScreen.js:2719-2728` |
| — start-workout row (`marginTop: xs(4)` + Button md ≈48) | ≈52 | `HomeScreen.js:2736-2740`, `Button.js:69` |
| — skip-session link (`paddingVertical: sm(8)×2=16` + caption line≈15) | ≈31 | `HomeScreen.js:2677-2678` (only when an outstanding session exists) |
| Hero card subtotal (pad16+16+8+30+8+28+8+52+8+31+pad16) | **≈217** | sum of above + `gap: spacing.sm(8)` between each of 5 children (4 gaps×8=32 already folded into the per-row figures above) |
| gap | 16 | content gap |
| Last-session card (`paddingVertical: md(12)×2=24` + 3 stacked lines: `captionStrong`≈15, `label`≈18, `caption`≈15, two `xxs(2)` gaps≈4) | ≈76 | `HomeLastSessionCard.js:80-95` |

**Running total to bottom of hero card's Start button:** 16+56+16+62+16+16(hero pad)+16(eyebrow)+8+30(name)+8+28(chip)+8 ≈ **264dp** to the top of the "Start workout" button; button spans to **≈312dp**. **Well inside a 700dp fold** — the primary action is reachable with no scrolling on this state, with the last-session card (ending ≈535dp) also fully visible, and roughly 165dp of headroom before the fold.

**Above-the-fold inventory (S3):** 1 header, 2 bordered containers (TodayStrip card, hero `Card`) + the last-session `Card` (3 total), 1 chip (readiness), 0 banners, 0 competing accent colours beyond the single amber (`primary`) used consistently on TodayStrip's icon, the hero chip/name-adjacent icon and the last-session "Repeat" button — i.e. **one accent hue**, not several competing colours, on this state.

### 2.2 Established Free (S10)

Same header/gap structure, but **no TodayStrip** (Free excluded, `HomeScreen.js:2139`), so the hero card moves up by TodayStrip's ≈62dp + one 16dp gap ≈ **78dp higher** than S3's Start button. Estimated hero pad-top position: 16(content)+56(header)+16(gap)+16(hero pad) ≈ 104dp to eyebrow; Start button top ≈ **186dp**, spanning to **≈234dp**. Last-session card ends ≈ 234+16+76 ≈ **326dp**. Substantially more headroom above the fold than Pro (no weight-logging card competing for the top slot).

**Above-the-fold inventory (S10):** 1 header, 1 bordered container (hero) + last-session card (2 total), 1 chip, 0 banners, 1 accent hue. If `HomeProTeaserCard` is also eligible (3+ sessions, not dismissed — `HomeScreen.js:2407-2413`), it adds one more bordered container (`padding: spacing.md(12)`, single-row, ≈ 24+20 ≈ **44dp**) plus a 16dp gap between last-session and teaser (JSX order: teaser THEN last-session, `HomeScreen.js:2407` before `2419` — teaser is actually rendered ABOVE the last-session card, not below), bringing the running total to ≈ 326+16+44 ≈ **386dp**, still comfortably above 700dp.

### 2.3 Early trial (S14)

Adds the `AttentionCard` trial variant above TodayStrip: `paddingHorizontal: md(12), paddingVertical: sm(8)` (`AttentionCard.js:156-160`), content = icon+2-line text row (`numberOfLines={2}`, `bodySm`≈20×up to 2 lines≈40) + `marginTop: sm(8)` + "How Precision Coaching works" outline Button (`sm` size ≈36dp). **Estimated card height:** 8(pad top)+40(text, worst case 2 lines)+8(margin)+36(button)+8(pad bottom) ≈ **100dp**. Inserted directly after the header with a 16dp gap on each side, pushing everything below it (TodayStrip, hero, Start button) down by **≈116dp** relative to S3. Revised Start-button position: ≈264+116 ≈ **380dp** — still above the 700dp fold, but with materially less headroom (≈320dp vs S3's ≈436dp before the fold, using the last-session-card-end figures above recalculated: S3 ended ≈535dp, trial-adjusted ≈651dp — **within ≈50dp of the fold**, i.e. the last-session card's bottom portion may clip on shorter viewports **[DEVICE CONFIRMATION NEEDED]**).

**Above-the-fold inventory (S14):** 1 header, 1 banner-slot card (trial), TodayStrip card, hero card, (last-session card borderline at the fold) — **4 bordered containers**, 1 chip, **1 banner**, 2 accent-bearing surfaces using the SAME amber hue (trial card + hero), so still one competing colour family, but now 4 stacked amber-bordered/amber-tinted boxes in a row before any content varies visually.

### 2.4 Recovery week (S6, first view — RecoveryStateCard expanded)

Adds `RecoveryStateCard` above `TodayStrip` (render order: banner slot → `RecoveryStateCard` → activation banner → attention slot → skeleton → TodayStrip, `HomeScreen.js:2039` precedes `2139`). Expanded-state estimate: `paddingHorizontal: md(12), paddingVertical: sm(8)` (`RecoveryStateCard.js:88-96`) + `topRow` (icon + `numberOfLines={2}` `bodySm`-semibold title ≈ up to 40dp) + `detail` block (`body`: `bodySm` unlimited lines — the actual copy "You have finished the hard-training part of this block. Training is lighter on purpose this week so fatigue can come down before you move on." is ≈150 characters, plausibly wrapping to 3-4 lines at `bodySm` on a ~340dp-wide card, i.e. ≈60-80dp **[DEVICE CONFIRMATION NEEDED — exact wrap count is font-metric- and device-width-dependent]** + `next`: `caption`, similarly ≈2 lines ≈30dp + `gap: xs(4)` between body/next). **Estimated card height:** 8+40+4+(70)+4+30+8 ≈ **≈164dp**, plus the hero eyebrow now also carries `"Recovery week · Day X of Y"` and the readiness chip carries a THIRD restatement (no extra height cost, same chip row as S3, but different, longer text — `"Recovery week, pull effort back."` vs S3's `"Block week X of Y"` line, both single-row `mesoBriefText` at `fontSize.xs`).

This is the single densest identified state: RecoveryStateCard (≈164dp) + one 16dp gap pushes TodayStrip/hero/Start-button down by **≈180dp** versus S3, putting the Start button at ≈264+180 ≈ **444dp** and the last-session card's end at ≈535+180 ≈ **≈715dp — past the 700dp fold** on this estimate. **[DEVICE CONFIRMATION NEEDED — this is the state most likely to push the last-session card, and on a smaller viewport possibly the Start button itself, below the fold]**.

**Above-the-fold inventory (S6):** 1 header, `RecoveryStateCard`, TodayStrip card, hero card — **3 bordered containers** confidently above the fold, last-session card borderline/below, 1 chip carrying a THIRD wording of the same fact, 0 banners (deload-suggested is suppressed here per `HomeScreen.js:1767-1768`), 1 accent hue (amber, used on RecoveryStateCard's border/icon per `primaryBg`/`primary` at `RecoveryStateCard.js:41-42`, and again on the hero).

### 2.5 New user (S18 — welcome card + first workout not started)

Adds `HomeWelcomeCard` between TodayStrip and the hero: `Card` default padding (`lg`=16×2=32) + `welcomeHead` (title `fontSize.lg`(17) bold ≈23dp + close icon, one row) + `gap: spacing.md(12)` + two step rows, each: numbered circle (22dp) beside a title (`fontSize.md`(16) semibold ≈22dp line) + body (`bodySm`, 2 lines of copy like "Every session you log sharpens your plan. There is nothing to set up." ≈40dp), stacked with a small `marginTop: 2` between title/body (`HomeWelcomeCard.js:122-126`), rows separated by `gap: spacing.md(12)` (`HomeWelcomeCard.js:86`). **Estimated step height:** ≈22(title)+2+40(body,2 lines) ≈ **64dp** each; **card total:** 32(pad)+23(head)+12(gap)+64(step1)+12(gap)+64(step2)+32(pad, shared with bottom) ≈ **≈207dp** (padding counted once top+bottom in the 32+32, consistent with `Card`'s single `padding` prop applied to the whole box, `Card.js:87`).

This pushes the Start button down by ≈207+16(gap) ≈ **223dp** versus S3/S18-without-welcome, landing it at ≈264+223 ≈ **≈487dp** — still above 700dp, but the last-session card is absent for a genuine day-0 user (`lastSession` is null, `HomeScreen.js:2419` gate), so the fold comparison is against the hero card's own bottom (≈487+skip-link-if-any) rather than a trailing card. **First-workout-not-started new users therefore see: header, TodayStrip (not-logged), Welcome card, hero card, and nothing else — all plausibly above the fold**, though the 223dp of welcome-card content is the single largest "content before the primary action" block identified across all 5 states measured. **[DEVICE CONFIRMATION NEEDED for exact wrap counts of the two step bodies, which drive the largest uncertainty in this estimate]**.

**Above-the-fold inventory (S18):** 1 header, TodayStrip card, Welcome card, hero card — **3 bordered containers**, 1 chip, 0 banners, 1 accent hue (amber on TodayStrip icon, welcome step numbers `withAlpha(primary, tint)` at `HomeWelcomeCard.js:39`, and hero).

### 2.6 Cross-state density summary

| State | Bordered containers above fold | Banners above fold | Chips | Est. Start-button top (dp) | Fold risk |
|---|---|---|---|---|---|
| S3 Established Pro | 3 (TodayStrip, hero, last-session) | 0 | 1 | ≈264 | none |
| S10 Established Free | 2-3 (hero, last-session, teaser if eligible) | 0 | 1 | ≈186 | none |
| S14 Early trial | 4 (trial card, TodayStrip, hero, last-session borderline) | 1 | 1 | ≈380 | last-session card borderline **[DEVICE CONFIRMATION NEEDED]** |
| S6 Recovery week (expanded) | 3 confident + last-session borderline/below | 0 (suppressed) | 1 (3rd wording of the fact) | ≈444 | last-session likely below fold **[DEVICE CONFIRMATION NEEDED]** |
| S18 New user | 3 (TodayStrip, welcome, hero) | 0 | 1 | ≈487 | hero bottom/skip-link borderline **[DEVICE CONFIRMATION NEEDED]** |

---

## PART 3 — DUPLICATION FINDINGS

Per the brief: evidence only, no useful-vs-noise judgement. Each finding states the exact strings, `file:line`, whether simultaneous rendering is possible (with the verbatim gating proof), and whether it is the same fact at the same moment or the same fact at different moments.

### 3.1 Recovery state: RecoveryStateCard × hero eyebrow × readiness chip (3-way, same moment, WORDING MISMATCH in one branch)

**Surfaces and exact strings:**
1. `RecoveryStateCard`, planned recovery: title `"Recovery week"`, compact `"Recovery week"`, body `"You have finished the hard-training part of this block. Training is lighter on purpose this week so fatigue can come down before you move on."` (`src/lib/recoveryState.js:178-183`). Adaptive: title `"Training is lighter for now"`, compact `"Training adjusted for recovery"` (`recoveryState.js:187-192`).
2. Hero eyebrow: `${recoveryLabel} · ${planProgress}`, where `recoveryLabel = nextWorkoutRecoveryLabel(gatedRecoveryState)` returns `"Recovery week"` (planned) or `"Recovery-adjusted"` (adaptive) (`src/lib/recoveryState.js:196-201`; composed `HomeScreen.js:1667`, rendered `HomeScreen.js:2188`).
3. Readiness chip: `buildReadinessSummary()` priority 1 — `if (currentMesoWeek.isDeload) { ... 'Recovery week, pull effort back.' / 'Recovery week on the calendar. Ease back in whenever suits you.' }` (`src/lib/readinessSummary.js:80-85`), rendered `HomeScreen.js:2234`.

**Simultaneity proof:** all three read from the SAME upstream state with no mutual suppression. `RecoveryStateCard` is rendered unconditionally whenever `gatedRecoveryState` is non-null (`HomeScreen.js:2039-2043`, no `showX &&` gate, unlike every banner). The hero eyebrow renders whenever `activePlan && nextWorkout` (`HomeScreen.js:2185`), independent of the card. The readiness chip renders whenever `readinessSummary` is truthy (`HomeScreen.js:2216`), independent of both. None of the three checks the others' visibility.

**Same-fact-same-moment vs different-moments:** same fact (training is deliberately lighter right now), same moment (all three read the same render's `gatedRecoveryState`/`currentMesoWeek`).

**Wording mismatch (factual, not a judgement call):** during `ADAPTIVE_RECOVERY_ADJUSTMENT` (mid-block, `isDeload === true` but NOT the scheduled recovery week), surfaces 1 and 2 both distinguish this from the scheduled recovery week ("Training is lighter for now" / "Recovery-adjusted"), but surface 3's `buildReadinessSummary` priority-1 branch tests only `currentMesoWeek.isDeload` (`readinessSummary.js:80`) — which is `true` in BOTH the planned and adaptive states, since `resolveRecoveryState`'s adaptive branch requires `isDeload === true` to fire at all (`recoveryState.js:138`). The chip therefore renders `"Recovery week, pull effort back."` even when the block has NOT reached its scheduled recovery week — the same wording surfaces 1 and 2 correctly reserve for the planned case only.

### 3.2 Recovery state: deload-SUGGESTED banner vs the above three (mutually exclusive by design — evidence of NON-collision)

`deloadBannerEligible = !!deloadSuggestion && !deloadDismissed && !inScheduledRecovery`, where `inScheduledRecovery = !!currentMesoWeek?.isDeload || !!currentMesoWeek?.awaitingDecision` (`HomeScreen.js:1767-1768`). This explicitly prevents the "Recovery week suggested" banner from co-occurring with `RecoveryStateCard`'s two lighter-training states (both of which require `isDeload === true` upstream, per §3.1). Recorded as evidence that this particular pairing is already prevented in code, unlike §3.1's chip.

### 3.3 Last-session evidence: HomeLastSessionCard × "Progress at a glance" card × Pro-teaser card (up to 3-way, same moment)

**Surfaces and exact strings:**
1. `HomeLastSessionCard`: label `"Last session - ${relativeDay}"` where `relativeDay` = `lastSessionRelativeDay`, precomputed once at `HomeScreen.js:1831` (`getRelativeDay(lastSession.startedAt)`), passed as a prop (`HomeScreen.js:2423`), rendered `HomeLastSessionCard.js:45-47`.
2. "Progress at a glance" card (no-plan branch only): label `"Last session"` (`HomeScreen.js:2351`) with value `{getRelativeDay(lastSession.startedAt)}` called **inline, a second independent invocation of the same function on the same input**, at `HomeScreen.js:2349`.
3. `HomeProTeaserCard` (Free, 3+ sessions): compares the two most recent sessions' load progression (`teaserInsight.progressed`/`teaserInsight.stalled`, sourced from `getProgressionTeaser()`, `HomeScreen.js:1096`), e.g. `"${progressed} added weight last session. Pro builds on it."` (`HomeProTeaserCard.js:74-75`).

**Simultaneity proof:** `HomeLastSessionCard` renders whenever `lastSession` is truthy (`HomeScreen.js:2419`, `{lastSession && (...)}`), with NO dependency on plan state. The "Progress at a glance" card renders inside the no-plan branch whenever `lastSession != null` (`HomeScreen.js:2338`), which is itself gated on `!activePlan || !nextWorkout` (`HomeScreen.js:2291`). So for a user with **no active plan and existing session history**, both cards render in the same pass — confirmed no mutual exclusion exists between them. `HomeProTeaserCard` adds a third independent gate, `tier === 'free' && totalSessions >= 3` (`HomeScreen.js:2407`), with no dependency on plan state or on the other two cards, so all three CAN render together (Free tier, no plan, 3+ sessions, has a last session).

**Same-fact-same-moment vs different-moments:** cards 1 and 2 are the exact same fact (relative day of the same `lastSession`) computed twice, same moment, independently. Card 3 is a related but distinct fact (progression trend across the last two sessions, not the relative day) about the same underlying session-history evidence, same moment.

### 3.4 Plan/block position: "Day N of M" (workout rotation) vs "Block week N of M" (block position) — adjacent, different facts

**Exact strings and locations:**
- Hero eyebrow `planProgress`: `activePlanLine(planHeadingName(activePlan?.name), displayWorkout?.idx ?? 0, nextWorkout?.total ?? 1)` — produces the "Day N of M" workout-rotation position, rendered directly under the header inside the hero card (`HomeScreen.js:1653-1655`, `2188`).
- Readiness chip default line (priority 5, `readinessSummary.js:140-143`): `` `Block week ${currentMesoWeek.weekIndex} of ${currentMesoWeek.plannedWeeks ?? '-'}${rirBit}` `` — the block-position readout, rendered ≈8-28dp below the eyebrow in the same card (`mesoBriefChip`, `marginTop: spacing.xs`, `HomeScreen.js:2216-2237`).

**Simultaneity proof:** both render whenever a hero card shows AND `readinessSummary` resolves to its priority-5 default (i.e. no caution/recovery signal outranks it — `readinessSummary.js:70-143`), which is the common case on a normal training day. No gate between them.

**Factual note (not a duplication of the same fact):** these are genuinely two DIFFERENT position concepts — the plan's own comment acknowledges the confusability risk explicitly: *"The hero shows two unlabelled 'N of M' counters two lines apart with different meanings"* (`readinessSummary.js:130-134`, citing "C5-P12-02 / C5-P11-02 (D96)"). Recorded here as brief-requested evidence for the "plan/block position" candidate; the two strings are adjacent, same `N of M` shape, but reference different underlying counters (workout-in-week vs week-in-block), so this is a same-shape/different-fact pairing, not a literal duplicate.

### 3.5 Coaching change: single surface on Home (no on-screen duplication found)

`"Coach - this week's decision"` / calorie-adjustment copy renders ONLY in the coach banner (`HomeScreen.js:1900-1904`). The same `showCoachBanner` boolean is mirrored into the global store for a You-tab badge (`useAppStore.getState().setHasUnseenCoachChange(showCoachBanner)`, `HomeScreen.js:1751-1753`), but that badge renders on a DIFFERENT screen (You tab), not on Home itself — no simultaneous on-Home duplication found for this candidate.

### 3.6 Trial status: single surface on Home (no on-screen duplication found)

The trial banner (`AttentionCard` variant `trial`) is the only place on Home that states trial day/session/weigh-in counts or the trial end date (`trialBannerLine()`, invoked `HomeScreen.js:585-588`, with `"Your free trial runs to ${endsLabel}."` appended at `HomeScreen.js:592`). No other Home section references trial state in this pass's reading — the H-2 effect that navigates to `CascadeGate` on trial-expiry (`HomeScreen.js:244-275`) is a one-time navigation AWAY from Home, not a second on-screen rendering of trial status.

### 3.7 Morning-weight state: TodayStrip vs free-coach-line (mutually exclusive by tier — evidence of non-collision)

`TodayStrip` (weight logged/not-logged state) is Pro-only (`tier === 'pro' && user?.id`, `HomeScreen.js:2139`). `buildFreeCoachLine()` — the only other surface that references morning-weight direction — is Free-only (`loadFreeCoachLine`, gated `tier === 'free'`, `HomeScreen.js:628-630`, called only inside the `tier === 'free'` branch of `loadData`'s `Promise.all`, `HomeScreen.js:471`). The two tiers are mutually exclusive per user session, so these two morning-weight surfaces can never render simultaneously for the same user. Recorded as evidence of non-collision for the brief's named candidate.

---

## SUMMARY FOR THE LEAD

- **Material states identified: 18** (S0-S18, §1.1-1.2), plus 5 named collapse cases with reasons (§1.3).
- **Collisions found (banner-adjacent): 4** — S2 (active workout + banner simultaneously), S16 (trial banner suppressed same-day, nudge moves to bottom of screen), S6/S7 (recovery triple-restatement), S9 (recovery fact collapses to one surface only).
- **Duplication findings: 7** (§3.1-3.7) — 5 confirmed simultaneous-render duplications/near-duplications (3.1, 3.3, 3.4), 1 confirmed wording mismatch within a duplication (3.1's adaptive-state chip line), 2 confirmed non-collisions recorded as evidence (3.2 recovery banner exclusion, 3.7 tier-exclusive weight surfaces), 2 single-surface findings with no on-screen duplication (3.5, 3.6).
- **Top 5 facts the lead most needs:**
  1. During an ADAPTIVE (unscheduled) recovery reduction, the readiness chip says `"Recovery week, pull effort back."` while RecoveryStateCard and the hero eyebrow correctly say "Recovery-adjusted"/"Training is lighter for now" in the same render — a genuine wording contradiction, not just repetition (`readinessSummary.js:80-85` vs `recoveryState.js:185-201`).
  2. `RecoveryStateCard` sits OUTSIDE the one-banner cap and always renders alongside whichever banner wins the cap — so recovery weeks are the densest state measured, with the last-session card estimated to land at or past a 700dp fold (§2.4).
  3. On the scheduled check-in day, the trial banner is suppressed at the TOP of the screen (`!showCoachingNudge`, `HomeScreen.js:1757`) while the coaching-discovery nudge saying the same thing renders far below, after the hero and last-session cards (§1.2 S16).
  4. A Free user with no active plan and 3+ sessions sees the same last-session fact rendered independently in up to 3 cards in one pass (glance card, last-session card, teaser card), including two separate function calls computing the same relative-day string (§3.3).
  5. The hero card stacks two different "N of M" counters (workout-in-week eyebrow, block-week readiness chip) a few dp apart — different facts, same shape, and the codebase's own comments already flag the confusability risk (§3.4).
