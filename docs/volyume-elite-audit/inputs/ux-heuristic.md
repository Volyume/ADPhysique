# O1 — Whole-App UX/UI Heuristic Audit (Volyume Elite Audit)

**Date:** 2026-07-04 · **Auditor:** O1 (read-only) · **Method:** deep code
sampling across every tab world + 3 opus deep-read agents on the suspected
bolted-on areas (Progress Photos, Partners, cardio/check-ins/share).
**Prior art verified, not redone:** `docs/audit/guidance-audit-2026-07-03.md`
(guidance + page-scaffold), `docs/audit/bottom-inset-inventory-2026-07-03.md`.
This audit gathers evidence and proposes OPTIONS; the design lead decides.

---

## Executive summary (read this first)

1. The **design system is genuinely elite at the token layer**: `theme.js` is a
   658-line, WCAG-audited, dual-theme, CVD-safe system with a named haptic
   vocabulary (`haptics.js`), a motion grammar, and a state-colour grammar.
   Token discipline is near-total (only one documented hex exception).
2. But the **component layer is under-adopted**: `Card.js` calls itself "THE
   single base card surface" that replaced "~83 inline surface blocks" — yet
   only **15** files import it while **95** still hand-roll the same box. This
   is the structural root of "templated shell, not one product".
3. **Feel is split by domain.** Training/coaching core fires haptics and uses
   the branded `Skeleton` shimmer; Progress Photos and Partners fire **zero
   haptics** and Photos/Partners/Share/food all fall back to a bare
   `ActivityIndicator` spinner.
4. **The two founder-flagged features rank as suspected:** Progress Photos
   **5/10**, Partners **7/10** integrated. Share cards are the dark horse at
   **5/10** — two near-duplicate builders sharing only the Skia draw layer.
5. **Best-in-class references exist and should be the standard:** CoachOutput
   (8.5/10), WeeklyCheckIn state handling, NutritionTargets, Methodology,
   MesocycleBuilder, the Analytics empty state.
6. **Overlays are the worst area** (as suspected): raw `Modal`s that each
   re-implement Card + header chrome instead of `BottomSheet.js`/`BackHeader`.
7. **States:** empty states are strong (guidance audit fixed the map); **error
   states are largely absent** (explicit error handling in only ~3 screens);
   loading is inconsistent (Skeleton vs spinner vs flash-of-empty).
8. **Friction is generally low** — destructive actions are confirmed via a
   proper `AppAlert` destructive style in 33 screens; the coaching flows are
   best-in-class. Photos capture and share are the exceptions.
9. **Perceived-quality micro-tells:** a `code-outline` `</>` glyph used as a
   slider grip; filled vs outline icon drift in share/photos; a silent camera
   shutter; an en-dash date label breaking house style.
10. **Severity counts: P0 = 1 · P1 = 6 · P2 = 8 · P3 = 4.** The single highest-
    leverage move is rolling `Card.js` + a shared `ModalHeader` + the haptic
    vocabulary across the non-core surfaces — it closes most of the
    "bolted-on" gap at once.

---

## Integration ranking (founder's core question)

**Most integrated (reference standard) → least integrated:**

| Rank | Area | Score | Why |
|---|---|---|---|
| 1 | **Precision Coaching / CoachOutput** | 8.5/10 | Card throughout, Skeleton loading, receipt-style insufficient-data + retryable error, Reanimated staged entrances, haptic success beats. The bar. |
| 2 | **Weekly check-in** | 8.5/10 | Best-in-class gate states (wrong_day/too_soon/need_weights/load_error+retry), fast-path friction reduction. (Header dup drags it.) |
| 3 | **Nutrition targets / education / Methodology** | 8/10 | InfoTooltip, "set it for me" fast path, teaching, tokenised. |
| 4 | **Training core (Home, Plans, Active workout, Mesocycle)** | 8/10 | Haptics, Skeleton, entrance motion, PR celebration; the app's spine. |
| 5 | **Cardio (data model)** | 7/10 | Conceptually well-woven: est_kcal deliberately excluded from targets, feeds check-in/CoachOutput. Only the *chrome* is bolted. |
| … | | | |
| 5-from-bottom | **Cardio (chrome)** | — | `radius.md`+raw surfaces vs `Card`, hand-rolled headers, missing search-empty. |
| 4 | **Food logging modals** | — | Hand-rolled `close` headers (5×), spinner not Skeleton (guidance audit PART 2). |
| 3 | **Partners** | 7/10 | Correct BackHeader/BottomSheet/Card mostly, polished motion — but **zero haptics**, PendingCard hand-rolls Card, bespoke full-screen invite Modal, empty state re-implements Button, lives in Progress but entered from You. |
| 2 | **Progress Photos** | 5/10 | Gallery screen is native; the six supporting overlays ship a *parallel design system* (raw Modals, hand-rolled headers/Card), zero haptics, silent shutter. |
| 1 (least) | **Share cards** | 5/10 | Two near-duplicate builders (ShareCardScreen + BeforeAfterShareSheet) with divergent chrome, sharing only the Skia renderer; dead style code; title-case header. |

---

## Deviation table (scaffold / surface / token)

Excludes deviations already tabled in the guidance audit PART 2 (bottom-edge
batch, food modal close-headers, CoachReview/CoachOutput double-header) — those
are verified still-open and incorporated by reference. New/expanded below.

| Screen / component | Deviation | Evidence | Sev |
|---|---|---|---|
| **95 files (systemic)** | Hand-roll the canonical card box (`backgroundColor: colors.surface` + radius + border) instead of importing `Card.js`; only 15 files import Card | `Card.js:6-8` (claims to replace ~83); importers = 15, hand-rollers = 95 | P1 |
| **ProgressGhostCapture.js** | **No SafeAreaView at all**; fakes status-bar inset with `paddingTop: spacing.xxl`; magic-number soup | root `View` `:279`, `:433`; sizes `:419,475,486,507,515,524` | P1 |
| ProgressPhotoCompare.js | `edges={['top']}` only (misses bottom); hand-rolled close header; inline surface panes; **`code-outline` `</>` glyph as slider grip** | `:428,453`, `:429-439`, `:603-655`, grip `:213` | P2 |
| ProgressPhotoViewer.js | Hand-rolls header (chevron-back) not BackHeader; note-editor raw Modal re-implements Card | `:332-342`, `:428-453`, `:511-514` | P2 |
| Photos overlays (Viewer/Compare/Details/DatePicker/GhostCapture) | Six raw `Modal`s re-implementing sheet chrome instead of `BottomSheet.js`; "sheets" are actually centre dialogs | see photos agent detail | P1 |
| BeforeAfterShareSheet.js | Full-screen overlay w/ own hand-rolled header; raw `fontSize`/`fontWeight` not `type` roles; hand-rolled primary/secondary buttons; **filled `checkmark-circle`** among outline icons | header `:445-450`, type `:597,620,638,645`, btns `:530-564`, icon `:471` | P2 |
| ShareCardScreen.js | Native **title-case** "Share Card" header (registered 3×); no Card/Button/SegmentedControl; off-token `letterSpacing:1.5`, `spacing.sm+1`; **4 dead style blocks** | RootNav `:370,434,476`; styles `:565,574`; dead `:609-621` | P2 |
| PartnerScreen.js | PendingCard hand-rolls Card; bespoke full-screen invite Modal w/ own header; empty state re-implements `primaryBtn` not shared Button | `:956-963`, `:721-799`, `:598,1018` | P2 |
| CardioPlanCard.js / LogCardioScreen.js | `radius.md` + raw `surface2/surface3` instead of `Card`(`radius.lg`); hand-rolled headers | Card `:65-68`, Log header `:153-159`, box `:282-294` | P2 |
| CoachReviewScreen.js | **En-dash** `–` in date label (house style = no dash, use "to"; inconsistent with CardioHistory's "to") | `:414` | P2 |
| WeeklyCheckInScreen.js | Same hand-rolled chevron header copy-pasted into **6 gate branches** | `:1244,1277,1310,1338,1380,1427` | P2 |
| AnalyticsScreen.js / DiaryScreen.js | Reference empty states are **hand-rolled**, not `EmptyState.js` (good copy, but the shared primitive is bypassed even by the exemplars) | Analytics `:546-565`; Diary EmptyDiary | P3 |

---

## Findings by area (contract format)

### F1 · Card.js is built but not rolled out · Consistency (whole app) · P1
- **Evidence:** `src/components/Card.js:6-8` documents it as THE base surface
  replacing "~83 inline `backgroundColor: colors.surface` card blocks"; grep:
  **15** files import it, **95** still declare a hand-rolled surface box
  (PlansScreen 14, NutritionTargets 12, WorkoutSummary/BodyMetrics 10 each,
  HomeScreen 9, DiaryScreen 7 …). Even Partners (`PendingCard :956-963`) and
  CoachDailyBrief (`:74-80`) hand-roll it.
- **User impact:** radius/border/padding drift box-to-box (Cardio uses
  `radius.md`, Card uses `radius.lg`); the app can't be restyled from one file
  as intended; reads as "templated" rather than one material.
- **Business impact:** the largest lever on the founder's "not one unified
  product" complaint; every future restyle costs 95× not 1×.
- **Complexity:** M (mechanical but wide; test = visual regression per screen).
- **Options:** (a) Big-bang codemod all 95 to `<Card>` in one reviewed sweep;
  (b) roll onto the bolted-on surfaces first (Photos, Partners, Cardio, Share)
  so the founder-flagged features converge, then backfill; (c) accept
  hand-rolled boxes and instead lint-ban new inline surface boxes to stop the
  bleed. **No option pre-selected.**

### F2 · Non-core surfaces are haptically silent · Perceived quality · P1
- **Evidence:** `haptics.js` is a rich named vocabulary wired into ~25 source
  files (Button, RestTimer, SetEntry, WorkoutSummary, tab bar, food sheets).
  **Zero** haptic calls across all 7 Progress Photos files and all Partners
  files. The camera shutter (`ProgressGhostCapture.js:200-222`), pair-accepted
  (`PartnerScreen.js:315`), cheer-sent (`:417`), code-minted (`:343`), and
  share-success are exactly the "moment" beats that buzz elsewhere.
- **User impact:** the two most emotive new features feel flat and cheaper than
  the core; the shutter — the single most tactile action in the app — is dead.
- **Business impact:** perceived-quality gap on the features shown off in
  marketing/retention (before/after, accountability).
- **Complexity:** S (add `haptics.*` calls at ~6 call sites; vocabulary exists).
- **Options:** (a) minimal — `press`/`success` on shutter, pair, cheer, share;
  (b) add a dedicated `shutter`/`paired` signature to `haptics.js` and a light
  capture animation; (c) leave Partners silent by design (quiet-accountability
  ethos) but fix Photos+Share. **Decide per-feature; note calm-mode must still
  gate.**

### F3 · Overlays ship a parallel design system · Consistency · P1
- **Evidence:** Photos uses six raw RN `Modal`s that each re-implement
  Card+header chrome; `PhotoDetailsSheet`/`PhotoDatePicker` are named "sheet"
  but are centre dialogs. None use `BottomSheet.js`. Guidance audit already
  tabled the 5 food modals' hand-rolled `close` headers. `BeforeAfterShareSheet`
  is a 7th bespoke overlay.
- **User impact:** sheets slide/anchor/dismiss inconsistently; backdrop and
  radius drift; the app's "one sheet" promise (BottomSheet.js doc) is broken.
- **Business impact:** compounds bolted-on feel; every new overlay re-pays the
  chrome cost.
- **Complexity:** M — extract `ModalHeader` (guidance audit rec) + migrate
  photo dialogs to `BottomSheet` where they are genuinely bottom sheets.
- **Options:** (a) full migration to BottomSheet+ModalHeader; (b) migrate only
  true bottom sheets, keep full-screen viewers on BackHeader; (c) document the
  immersive viewers as sanctioned exceptions and fix only the dialogs.

### F4 · Two share-card builders, one renderer · Bolted-on · P1
- **Evidence:** `ShareCardScreen.js` (native title-case header, registered 3×
  RootNav `:370,434,476`, no Card/Button/SegmentedControl, dead styles
  `:609-621`) and `BeforeAfterShareSheet.js` (full-screen overlay, own header
  `:445-450`, own `SegmentBtn`, filled-vs-outline primary mismatch) duplicate
  ~90% of the builder UI and unify only at `drawShareCard` (one Skia renderer).
- **User impact:** share feels like "several ad-hoc services"; primary button
  styling literally differs between the two share entry points.
- **Business impact:** share is the organic-growth surface; inconsistency there
  is directly visible to prospective users.
- **Complexity:** M/L — unify onto one builder component with a variant prop.
- **Options:** (a) merge into one `<ShareBuilder variant>`; (b) extract the
  shared toggle/segment/preview into primitives, keep two thin wrappers;
  (c) leave logic, first align chrome (header + primary button) as a quick win.

### F5 · Error states are largely absent · States · P1
- **Evidence:** explicit error/`loadError` handling appears in only ~3 screens
  (CoachOutput, CoachReview, PlanLibrary). Most focus-effect loaders
  `.catch(() => {})` and fall through to an empty state, so a *failed read*
  looks identical to *no data* (e.g. YouScreen `:77,84`; CardioHistory flashes
  the "No cardio yet" EmptyState before load resolves).
- **User impact:** transient failures read as "you have nothing", eroding
  trust; no retry affordance.
- **Business impact:** silent-failure churn; hard to distinguish bugs from
  empty accounts in support.
- **Complexity:** M — add a shared error/retry state (CoachOutput's
  `LoadErrorView` is the model) + a loading branch to focus-effect loaders.
- **Options:** (a) shared `<LoadState>` wrapper (loading/error/empty/content);
  (b) retrofit the top-10 traffic screens only; (c) at minimum add a loading
  guard so empty states never flash pre-load.

### F6 · Loading treatment split by domain · Perceived quality · P1
- **Evidence:** branded `Skeleton` in ~20 core screens (Analytics, Home,
  CoachOutput, WeeklyCheckIn, Plans, WorkoutHistory…); bare `ActivityIndicator`
  in Photos, Partners, Share, and the whole food domain (FoodSearch,
  FoodInsights, MealPlan, MyRecipes).
- **User impact:** core feels premium (content-shaped shimmer), Pro-nutrition
  and new features feel generic.
- **Business impact:** the spinner marks exactly the paid/new surfaces as
  lower-fidelity.
- **Complexity:** S/M — swap spinners for `Skeleton` shaped to each layout.
- **Options:** (a) blanket Skeleton adoption; (b) Skeleton on list/gallery
  loads, keep spinner for genuinely indeterminate camera/preview renders;
  (c) status quo.

### F7 · Partners lives in Progress, entered from You · Hierarchy/IA · P2
- **Evidence:** registered under ProgressTab (`RootNavigator.js:430`) but the
  primary door is `YouScreen.js:230-236` firing `navigateCrossTab(... 'ProgressTab','Partner')`.
- **User impact:** mental model split; the tab a feature "belongs to" isn't the
  tab you find it in.
- **Business impact:** discoverability of a retention feature.
- **Complexity:** S (re-home the row) / M (rethink IA).
- **Options:** (a) keep entry in You, drop it into a "Connections" grouping;
  (b) surface a Partner tile on the Progress root so the tab-home matches;
  (c) accept the cross-tab jump (works today).

### F8 · Camera shutter has no animation or haptic · Friction/quality · P2
- **Evidence:** `ProgressGhostCapture.js:200-222` capture handler — no motion,
  no haptic, no shutter feedback; plus no SafeAreaView on the screen (`:279`).
- **User impact:** the most physical action in the app gives no confirmation;
  users unsure the photo was taken.
- **Complexity:** S.
- **Options:** (a) flash + `haptics.press`; (b) full shutter animation + custom
  haptic; (c) haptic only.

### F9 · Micro-glyph and icon-variant drift · Perceived quality · P2/P3
- **Evidence:** `ProgressPhotoCompare.js:213` uses `code-outline` (a `</>`
  developer glyph) as the before/after **slider grip**; `BeforeAfterShareSheet`
  mixes filled `checkmark-circle` (`:471`) among outline icons; app-wide 262
  outline vs 157 filled glyph uses (mostly legit controls, but the new surfaces
  drift). PartnerRow uses raw `size={20/12/18}` not `iconSize` tokens.
- **User impact:** small cheapening cues on premium surfaces.
- **Complexity:** S (swap glyphs; adopt `iconSize`).
- **Options:** (a) fix the two wrong glyphs now (P2), sweep variants later;
  (b) full icon-variant pass; (c) glyph fix only.

### F10 · House-style copy break in a coaching surface · Voice · P2
- **Evidence:** `CoachReviewScreen.js:414` renders `d MMM – d MMM yyyy` with a
  U+2013 en-dash; CLAUDE.md bans dashes in user copy (lint targets em-dash, so
  this slipped). CardioHistory uses "to" (`:59-65`) for the same construct.
- **User impact:** minor, but it is the free user's first coaching surface.
- **Complexity:** S.
- **Options:** (a) change to "to"; (b) extend the lint to en-dash too and sweep;
  (c) leave (out of scope for UX).

### F11 · Reference empty states bypass EmptyState.js · Consistency · P3
- **Evidence:** the guidance audit's exemplar empties (AnalyticsScreen
  `:546-565`, DiaryScreen `EmptyDiary`) are hand-rolled; `EmptyState.js` (with
  the shared Button) is imported by relatively few. Good copy, but the pattern
  the design system consolidated is bypassed even by the best screens.
- **Complexity:** S/M.
- **Options:** (a) migrate exemplars to `EmptyState`; (b) leave (copy is good);
  (c) codify EmptyState in new work only.

### F12 · Friction check — mostly clean · Friction · P3
- **Evidence:** destructive actions use `AppAlert` destructive style across 33
  screens; CardioHistory delete is confirmed (`:150-159`). Coaching flows have
  exemplary gate states. No dead-end confirms found beyond the guidance audit's
  empty-state dead-ends (CoachReview, VolumeHeatmap, Consistency, MyMeals,
  BlockReflection — verified still open).
- **Options:** adopt the guidance audit Tier-1/Tier-2 backlog; no new friction
  defects to add.

---

## What is already good (the reference standard — protect and copy)

- **`src/styles/theme.js`** — elite. Dual-theme, WCAG-computed, CVD/HC modifier
  tables, named `alpha`/`radius`/`spacing`/`motion`/`stateColors`/`volumeColors`
  grammars, tabular-figure `num()` helper. Do not touch; make everything else
  live up to it.
- **`src/lib/haptics.js`** — an intent-named haptic vocabulary honouring
  reduce-motion. The model for how feel should be centralised. Roll it wider.
- **`CoachOutputScreen.js`** — the integration reference (8.5/10): Card
  throughout, Skeleton, receipt-style insufficient-data, retryable error,
  staged Reanimated entrances, haptic success beats.
- **`WeeklyCheckInScreen.js`** — best-in-class *state* handling: five distinct
  teaching gates plus a fail-closed retryable load error. (Only blemish: the
  6× duplicated header.)
- **`NutritionTargetsScreen` / `NutritionEducationScreen` / `MethodologyScreen`**
  — InfoTooltip, "set it for me" fast path, teaching-first, fully tokenised.
- **`MesocycleBuilderScreen`**, **`AnalyticsScreen` empty state**,
  **`PartnerScreen` how-it-works + privacy receipt + InviteJourney** — teaching
  done right (Partners is the most-explained feature in the app).
- **Cardio data model** (`cardioEngine.js`) — conceptually the *most* integrated
  new feature: est_kcal deliberately excluded from targets, feeds the weekly
  check-in and CoachOutput. Proof the team can weave a feature into the data
  model; the lesson is to give the chrome the same care.
- **`BackHeader.js` / `BottomSheet.js` / `Card.js` / `EmptyState.js` / `AppAlert.js`**
  — the right primitives exist and are well-written. The gap is adoption, not
  design.

---

## Scope cuts (explicit)

- Did **not** re-read the 22 screens the guidance audit already graded "Low /
  reference quality"; incorporated its PART 1/PART 2 tables by reference and
  spot-verified the still-open items (CoachReview en-dash, ShareCard 3× reg,
  bottom-edge batch).
- Did **not** deep-read onboarding wizards (Welcome/FirstRun/FreeStarter/
  ProOnboarding), Settings sub-screens, or policy screens beyond header/edge
  checks — flagged as consistent-enough by prior art; a targeted onboarding
  pass is a candidate follow-up.
- Did **not** run the app or verify on-device rendering (read-only static
  audit); double-header and double-inset risks (CoachReview/CoachOutput) need
  device verification per the guidance audit.
- Icon-variant analysis is a **grep-level** signal (262 outline / 157 filled),
  not a hand-classified per-icon pass; the two named wrong-glyphs (F9) are
  verified, the broader sweep is estimated.
- Accessibility (screen-reader labels, focus order, touch-target sizes) sampled
  only incidentally; not a dedicated a11y audit.
