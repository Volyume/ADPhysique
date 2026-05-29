# 05 · Feedback, toasts, sheets, empty / loading / error states

Phase 3 assessment of the feedback layer: `Toast` (reference quality),
`EmptyState`, `EmptyDiary`, `FeedbackSheet`, `PRCelebration`,
`WhatsNewSheet`, `SyncStatusBadge`, `ProGate`/`DifferentialBadge`,
`HeldDecisionCard`, `RestTimer`, `Skeleton` adoption, plus the two
systemic feedback gaps: **Alert-driven errors** and **no loading-state
house rule**.

## Phase 2, best-in-class references

- **Toast vs snackbar:** toast = brief confirmation, no action; snackbar =
  action attached (undo). Never show more than one at a time; ~3s read
  time; full-width top or bottom, clear of nav. Volyume's Toast already
  supports variants + `undo` action + a queue, ahead of most.
- **Loading progression:** <100ms no indicator; 1–3s skeleton; 3s+
  full-screen with progress. Skeletons give ~60% faster *perceived* load.
- **Empty states:** one short line + a single clear next action; not a
  tutorial paragraph (matches CLAUDE.md's anti-fingerprint rule exactly).
- **Errors:** tie the message to what the user was doing, be specific,
  offer recovery; avoid modal Alert for routine failures.

What separates best-in-class: a *single* feedback vocabulary, one toast,
one sheet chrome, one skeleton rule, one error pattern, so the app
"speaks" consistently. Volyume has excellent individual pieces but two
competing error/loading strategies.

---

## Finding F0 (systemic): errors go through Alert, not Toast

**Evidence:** Most write paths surface failure via `Alert.alert(...)`
(ActiveWorkout l.870, BuildWorkout l.98-111, RoutineDetail, ManualBuilder,
PlanDetail handleSetActive, AddCustomFood override, etc.) or swallow it
(`.catch(() => {})` in HeldDecisionCard l.45, AddCustomFood, FoodInsights,
MyMeals/MyRecipes log paths). Meanwhile a capable `Toast` system with an
`error` variant and `undo` action already exists and is used in a few
places (WorkoutSummary, PlanDetail handleAddToMyPlans toast).

**Why it matters:** Two error languages. A modal `Alert` is heavyweight and
OS-styled (breaks the brand), interrupts the task, and can't offer inline
retry. Swallowed catches leave the user with no feedback at all (a tap that
silently did nothing). Best practice is a non-blocking toast/snackbar with
a specific message and, where possible, a retry/undo.

**Improvement:** Adopt a house rule: routine, recoverable failures →
`toast.show('Couldn\'t log.', { variant:'error', action:{label:'Retry'} })`
(copy per CLAUDE.md: short, no chatbot voice); reserve `Alert` for
genuinely destructive confirmations (delete account, archive) only.
Replace every `.catch(()=>{})` on a user-initiated action with a toast.

**Priority:** High (consistency + the silent-failure cases are real bugs in
UX terms).

---

## Finding F1 (systemic): no loading-state house rule

**Evidence:** Skeleton on Home + BlockReflection; ActivityIndicator on
ExerciseDetail + Import + several sheets; **nothing** on Plans, PlanLibrary,
Mesocycle, PlanDetail (they load on focus and pop in). Three strategies,
no rule.

**Why it matters:** Perceived performance is inconsistent, some screens
feel instant (skeleton), some feel broken (blank then pop). The Skeleton
primitive is good and underused.

**Improvement:** House rule keyed to the research's timing bands: any
screen that fetches on focus shows a `Skeleton` that *mirrors its loaded
layout*; sheets/buttons use the shared Button inline spinner; only 3s+
operations get a full-screen state. Apply skeletons to Plans, PlanLibrary,
Mesocycle, PlanDetail first.

**Priority:** High.

---

## Component: Toast (reference)

**File:** `src/components/Toast.js`

**Current state:** Excellent and best-in-class-shaped. Queue, variants
(success/error/warning/info/undo), optional action button, auto-dismiss,
`accessibilityRole='alert'` + liveRegion, reduceMotion-aware. Host z-index
hardcoded 9999 (l.205), harmless but off-token.

**Gap:** None of substance. It's underused (see F0). Confirm it never
stacks two at once (research: max one). Token the z-index.

**Improvement:** Make it the default error/confirmation channel app-wide;
add a `z` token; verify single-toast-at-a-time.

**Priority:** Low (component); the win is adoption (F0).

---

## Component: EmptyState

**File:** `src/components/EmptyState.js`

**Current state:** Good shared empty card: icon/title/text/primary+secondary
CTA, ghost preview, dismiss. a11y on dismiss. Uses `activeOpacity` (0.85/
0.7) rather than the PressableCard spring.

**Best-in-class reference:** Duolingo/Linear empty states, one short line +
one action, on-brand illustration.

**Gap:** Press feel differs from the rest of the app (activeOpacity vs
spring). It's a strong primitive but adoption is partial: several screens
roll their own empty markup (Plans inline, MyMeals, food screens) instead
of using it, so empty states aren't uniform. Risk of tutorial-voice copy
at call sites (must follow CLAUDE.md "one short line").

**Improvement:** Route its buttons through the shared `<Button>` (consistent
press + loading); make EmptyState the only way to render an empty state and
migrate the rollers; audit each call site's copy against the one-line rule.

**Coherence impact:** High positive, empty states are a brand surface.

**Priority:** Medium–High (adoption).

---

## Component: EmptyDiary

**File:** `src/components/food/EmptyDiary.js`

**Current state:** Fine. Locked copy block, `role='text'`. Slightly long
copy ("...Or use Scan to grab something from a barcode.") but within the
one-line spirit.

**Gap:** It's a one-off rather than an EmptyState instance, so diary's
empty state won't track changes to the shared empty pattern.

**Improvement:** Re-implement as an `<EmptyState>` with the locked copy, so
it inherits the shared chrome.

**Priority:** Low.

---

## Component: FeedbackSheet

**File:** `src/components/FeedbackSheet.js`

**Current state:** Strong. Global sentiment-chip feedback, shake-to-report,
auto-dismiss 12s, full a11y on chips/buttons, reduceMotion-aware. Backdrop
`#000` (l.349).

**Gap:** Backdrop off-token (scrim). Auto-dismiss at 12s is generous; fine.
It's one of three+ bottom-sheet chromes (FeedbackSheet, QuickAddSheet,
FoodDetailSheet, MacroBreakdownSheet, WhatsNewSheet, PeekMenu) that each
re-implement the sheet shell (backdrop + slide-up + handle). No shared
`<BottomSheet>`.

**Improvement:** Scrim token now; longer-term extract a `<BottomSheet>`
chrome (backdrop, slide, drag-handle, reduceMotion) that all sheets share,
see F2 below.

**Priority:** Medium.

---

## Finding F2: no shared BottomSheet chrome

**Evidence:** At least six surfaces hand-build the bottom-sheet pattern
(FeedbackSheet, QuickAddSheet, FoodDetailSheet, MacroBreakdownSheet,
WhatsNewSheet, PeekMenu), each with its own backdrop opacity, slide
animation, and (in)consistent drag handle.

**Why it matters:** Sheets are a primary interaction surface; six
implementations means six slightly different backdrops (the scrim
inconsistency lives largely here), animations, and dismiss behaviours.

**Improvement:** Extract `<BottomSheet>` (scrim, slide-up via `motion`
tokens, optional drag handle, swipe-to-dismiss, reduceMotion, a11y
`accessibilityViewIsModal`) and refactor the six onto it. This single
extraction fixes most of the scrim inconsistency and unifies sheet feel.

**Priority:** High.

---

## Component: PRCelebration

**File:** `src/components/PRCelebration.js`

**Current state:** Full-screen confetti + card reveal + haptics, `subdued`
toast mode, reduceMotion-aware. Particle colours hardcoded array (l.26);
backdrop `#000` (l.190); animated elements lack a11y.

**Best-in-class reference:** Duolingo streak/achievement moments, a
celebratory beat that's earned, brief, and accessible (announced to
assistive tech, skippable).

**Gap:** Particle palette off-token; backdrop off-token; the celebration
isn't announced to VoiceOver (a blind user gets haptics but no "New PR:
…"). Must stay rare/earned per CLAUDE.md (no unearned encouragement), it
is, since it's tied to real PRs.

**Improvement:** Token the particle palette (amber/gold family) and
backdrop (scrim); add an `accessibilityLiveRegion`/announcement of the PR;
ensure tap-to-dismiss is obvious.

**Coherence impact:** Medium positive.

**Priority:** Medium.

---

## Component: WhatsNewSheet

**File:** `src/components/WhatsNewSheet.js`

**Current state:** One-time release-notes sheet, versioned storage key,
reduceMotion-aware. Backdrop `#000` 0.55 (l.163); tint via `tint + '22'`
concat (l.123).

**Gap:** Off-token backdrop + alpha-concat; another bespoke sheet (F2).
Risk of three-bullet auto-generated feel in the item list, must follow the
copy rules.

**Improvement:** Onto `<BottomSheet>` + scrim + `withAlpha`; review item
copy against the anti-fingerprint rules.

**Priority:** Medium.

---

## Component: SyncStatusBadge

**File:** `src/components/SyncStatusBadge.js`

**Current state:** Good and important, header sync dot + status, tap →
diagnostics modal (queue depth, last sync, errors), 5s poll + NetInfo,
role+label. Backdrop `rgba(0,0,0,0.4)` (l.171); status colour map hardcoded
(l.26-32).

**Best-in-class reference:** Linear/Things sync indicator, quiet when
synced, clear and reassuring when pending/offline, one-tap detail.

**Gap:** Backdrop off-token. Status colours hardcoded rather than mapped to
semantic tokens (success/warning/error). Only shows on stack headers (not
ScreenHeader tab roots), the visibility inconsistency flagged in
02-navigation. 5s polling is a minor battery/CPU cost vs an event-driven
update.

**Improvement:** Map status colours to semantic tokens; scrim token; render
in ScreenHeader too (consistent visibility); consider event-driven updates
over the 5s poll.

**Coherence impact:** High (visibility consistency).

**Priority:** Medium–High.

---

## Component: ProGate / ProLocked / ProBadge / DifferentialBadge

**Files:** `src/components/ProGate.js`, `src/components/DifferentialBadge.js`

**Current state:** ProGate dims locked content (0.35) → upgrade sheet; HOC
guard for routes; a11y on buttons; backdrop `rgba(0,0,0,0.65)` (l.173).
DifferentialBadge is the contextual paywall under coach output, fires
telemetry on mount, a11y label+role but no press state on CTA.

**Best-in-class reference:** Best paywall UX shows *value in context* (a
blurred preview of the real feature) rather than a generic lock; one
upgrade entry point styled consistently.

**Gap:** Backdrop off-token. Several upgrade entry points
(ProGate sheet, DifferentialBadge, PaywallScreen, ProUpgradeScreen,
CascadeGate), risk of inconsistent pricing/CTA presentation across them
(reviewed in 07-feature-specific). DifferentialBadge CTA lacks press
feedback.

**Improvement:** Scrim token; press state on the CTA (shared Button);
ensure all upgrade surfaces pull pricing/CTA copy from one source so they
never disagree.

**Priority:** Medium.

---

## Component: HeldDecisionCard

**File:** `src/components/food/HeldDecisionCard.js`

**Current state:** Important safety surface, explains a held coaching
decision (FFM floor / ED pattern / rapid loss) with a Why link and, for ED
pattern, a Get-support button. Good role/link a11y. `Linking.openURL`
error swallowed `.catch(()=>{})` (l.45).

**Best-in-class reference:** Calm/health-app safety messaging, plain,
non-alarming, with a clear support path; never minimised.

**Gap:** If the support link fails to open, the user (potentially in a
vulnerable moment) gets nothing, the one place a swallowed catch is least
acceptable. Otherwise strong and on-voice.

**Improvement:** On `openURL` failure, toast a fallback ("Couldn't open.
Support: [email]") so the support path never dead-ends. This is a
safety-critical fix, not cosmetic.

**Coherence impact:** N/A; correctness.

**Priority:** High (safety path).

---

## Component: RestTimer

**File:** `src/components/RestTimer.js`

**Current state:** Excellent. Countdown + progress bar + skip + ±15/±30,
haptic + audio cues, VoiceOver live region, reduceMotion-aware. countdownNum
fontSize hardcoded (l.261).

**Gap:** One off-token font size. Otherwise reference quality.

**Improvement:** Token the countdown size (it's display-scale; add a token
or use `fontSize.display`).

**Priority:** Low.

---

## Feedback summary

| Item | Gap | Priority |
| --- | --- | --- |
| Errors via Alert / swallowed catches | two error languages; silent failures | High |
| No loading-state house rule | inconsistent perceived perf | High |
| No shared `<BottomSheet>` (6 bespoke sheets) | scrim + animation drift | High |
| HeldDecisionCard support link swallow | safety path can dead-end | High |
| SyncStatusBadge tokens + visibility | semantic colours + show on roots | Medium–High |
| EmptyState/EmptyDiary adoption | empty states not uniform | Medium–High |
| PRCelebration/WhatsNew off-token + a11y | scrim, palette, announce | Medium |
| Toast/RestTimer off-token literals | z-index, font | Low |

Top feedback moves: **make Toast the single error/confirmation channel**
(retire routine Alerts, kill silent catches, including the safety-critical
HeldDecisionCard one), **set the skeleton loading rule**, and **extract one
`<BottomSheet>`**. The pieces are excellent; the job is making them the
*only* way the app gives feedback.

Sources:
- [Toast notifications UX best practices (LogRocket)](https://blog.logrocket.com/ux-design/toast-notifications/)
- [Snackbar vs toast (Design Bootcamp)](https://medium.com/design-bootcamp/ux-blueprint-01-snackbar-vs-toast-decoding-the-subtle-differences-in-design-systems-8ad82ff61115)
- [Error message UX & feedback (Pencil & Paper)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback)
- [Error state design patterns (2POINT)](https://www.2pointagency.com/glossary/error-state-design-patterns-a-comprehensive-guide/)
