# Coverage-gap audit — Aesthetic design-language craft

Status: **read-only audit, no source changed.** One of six coverage-gap
lanes commissioned in `DECISIONS-2026-07-09.md` D6 ("Coverage-gap audit
lanes: RUN ALL SIX"), filling the gap `00-MASTER-INDEX.md` section 5 named
explicitly: *"Lane 02 rigorously checks internal consistency (tokens, one
radius, one shadow policy) but nowhere assesses whether the resulting look
reads as 'best-in-class Silicon Valley', which is a taste/craft judgement
distinct from consistency."*

## Scope and method

Read in full before sweeping: `00-MASTER-INDEX.md` (format/severity/class
definitions, section 5 coverage table), `02-visual-consistency.md` (so
nothing already reported there is repeated here), `docs/rules/styling.md`,
`docs/DESIGN_SYSTEM.md`, `DECISIONS-2026-07-09.md` (D1-D6, the founder
decisions already made off the back of lane 02 — several lane-02 Severity-A
items, e.g. the Card radius default and the letter-spacing token gap, are
now **resolved in code** and are treated here as fixed, not re-reported).
Then read the full `src/styles/theme.js` token system and a representative
cross-section of components (`Card`, `Button`, `Chip`, `EmptyState`,
`TextField`, `Dropdown`, `Stepper`, `SectionLabel`, `InfoTooltip`,
`AttentionCard`, `BackHeader`, `ScreenHeader`) and screens spanning Home,
Food/Eat, Workout logging, Progress, Settings and Partners
(`HomeScreen.js`, `ActiveWorkoutScreen.js`, `WorkoutHistoryScreen.js`,
`DiaryScreen.js`, `AnalyticsScreen.js`, `WorkoutSummaryScreen.js`,
`NutritionTargetsScreen.js`, `BodyMetricsScreen.js`, `PaywallScreen.js`).

This lane deliberately does **not** re-open: Card radius (D1, fixed),
Pro-moment glow (D2, sanctioned), letter-spacing tokens (D3, fixed), the
840-raw-touchable / 155-hand-rolled-card counts (lane 02 B-1/B-2, already
tracked), or empty-state primitive adoption (verified during this pass to
have moved further since lane 02 — see "What's genuinely strong" below).
Every finding below was verified against currently-open files, not against
the prior audits' line numbers.

**Counts.** 7 findings (AC-1 through AC-7): Severity A: 1. Severity B: 4.
Severity C: 2. Class: SAFE: 4. JUDGEMENT: 3. GATED: 0 (nothing in this
lane touches an ED-safety, billing, consent or onboarding surface as a
*design-craft* matter; where a cited file is ED-safety-adjacent, the
finding is a pure visual-craft point that does not touch behaviour or
copy, so it stays SAFE/JUDGEMENT, not GATED).

---

## Findings

### AC-1. The single most-repeated icon in the app has no settled size or colour
**Severity B — JUDGEMENT**

The `chevron-forward` disclosure glyph (row is tappable, "there's more
here") is the app's single most repeated icon — hundreds of sites — and
carries no settled convention. A sweep of its call sites turns up at least
**nine different sizes** (12, 13, 14, 15, 16, 18, 20, 21, 22 — plus 26 in a
conditional branch) and **three different colours** (`colors.textMuted`,
`colors.textSecondary`, `colors.primary`) used interchangeably for the same
"this row opens something" affordance, often on the very same screen:

- `src/screens/HomeScreen.js:1361` (16, `primary`), `:1680` (12, `textMuted`
  — the readiness chip), `:1814` (20, `textMuted`), `:1827` (13,
  `textSecondary`), `:1952` (12, `primary`), `:2046` (16, `textMuted`).
  Six different treatments of the same glyph on one screen.
- `src/screens/DiaryScreen.js:1143` (21, `textSecondary`), `:1200` (13,
  `textSecondary`), `:1409` (18, `textSecondary`).
- `src/screens/WorkoutHistoryScreen.js:446` (14), `:598` (20, one screen,
  two sizes for the same "open this session" row).
- `src/screens/AthleteProfileScreen.js:219` (16), `:587` (18).
- `src/screens/LiftProgressScreen.js:289`, `:416` (18); `NutritionTargetsScreen.js:530`
  (16); `BodyMetricsScreen.js:815` (18); `AnalyticsScreen.js:879` (18),
  `:1023` (16); `NotificationSettingsScreen.js:630` (18), `:668,736,777,789`
  (16); `CoachOutputScreen.js:640` (15, `primary`); `FoodSearchScreen.js:757`
  (18).

Best-in-class list UIs (Linear, Stripe dashboard, Whoop) settle a
disclosure chevron at one fixed size and one muted colour so it reads as
punctuation, not a second signal. Here it silently varies row to row,
which is exactly the kind of "these two rows don't quite match" tell a
craft-level pass is meant to catch, distinct from lane 02's icon-*family*
check (which correctly found the family — Ionicons only — is clean; this
is size/colour *weight* within that one family, not raised there).

The `colors.primary` uses (`HomeScreen.js:1361,1952`, `CoachOutputScreen.js:640`)
are a second, sharper issue: `DESIGN_SYSTEM.md`'s own "Accent discipline"
rule says amber is spent only on primary actions, active navigation and
key data values, "do not amber-colour decorative icons — it dilutes the
affordance." A chevron that is amber in a banner CTA and muted-grey in an
identical-looking row two screens over dilutes exactly the signal the rule
protects.

**Proposed change.** Settle one size (16, the modal count, matches
`iconSize.sm`) and one colour (`colors.textMuted`) as the default disclosure
chevron, reserving `colors.primary` strictly for a chevron that sits inside
an already-amber CTA row (as `AttentionCard.js` does correctly). This is a
JUDGEMENT call, not a mechanical one: it means picking the canonical value
among several already-common ones, the same shape as lane 02's A-1 (Card
radius) and A-5 (letter-spacing) decisions that were resolved by the
founder in D1/D3.

### AC-2. Un-tokenised alpha values still produce inconsistent tint strength for the same visual role, including inside one component's own two sibling variants
**Severity B — SAFE**

`theme.js:519-540` documents seven named alpha stops (`ghost .08 · tint .12
· soft .19 · edge .25 · mid .33 · strong .40 · half .50`) precisely so a
tinted border/fill reads at one of seven intensities app-wide. `theme.js`'s
own comment admits ~29 old ad-hoc values survive as "mechanical hex-suffix
conversions... existing call sites migrate in later mechanical sweeps" —
that sweep has not happened. The clearest, most damning example is inside
one component's own two sibling code paths:

- `src/components/AttentionCard.js:147` — the `trialBanner` variant's
  border: `withAlpha(colors.primary, 0.314)`.
- `src/components/AttentionCard.js:188` — the `freeCoachCard` variant's
  border, 41 lines later in the same file, same "soft amber card, soft
  amber border" role: `withAlpha(colors.primary, 0.251)`.

Both variants render on Home in the same slot (`pickAttentionVariant`), so
a user who sees one in one session and the other next week is looking at
two different border intensities for what is meant to be one card class.
Neither value is a named stop (nearest: `mid .33` and `edge .25`
respectively — both within the sweep's own claimed "maximum delta 0.033"
tolerance, confirming these are exactly the un-migrated legacy literals the
comment describes, not a deliberate second design).

The same pattern recurs across at least 15 more files: `Dropdown.js:87`
(0.376), `TextField.js:115` (0.65, unusually far from any stop), `RestTimer.js:511`
(0.314), `ProgressSections.js:373` (0.376), `PRCelebration.js:316,322`
(0.376, 0.125), `ReadinessCards.js:230,323,324` (0.267/0.071, 0.251×2),
`coachOutput/CoachOutputCards.js:201` (0.314), `NutritionTargetsScreen.js:177,1766,1782,1821,1837,1960,1991,2042`
(mixed 0.125/0.251/0.314), `WeeklyCheckInScreen.js:1733,1820` (0.376,
0.251), `MesocycleBuilderScreen.js:466,485,495,507` (0.251/0.502/0.314/0.502),
`SettingsPrivacyScreen.js:52,66` (0.502), `CoachReviewScreen.js:194,818`
(0.133, 0.333), `ProGoalSetupScreen.js:676` (0.125).

**Proposed change.** A mechanical sweep (same shape as D3's letter-spacing
sweep): map each literal to its nearest named stop (`0.125→tint .12`,
`0.251→edge .25`, `0.314→mid .33`, `0.376→strong .40`, `0.502→half .50`,
etc.) and delete the raw numeric argument. `TextField.js:115`'s 0.65 is the
one outlier that isn't a near-miss of a stop and needs a human look (is a
focus ring meant to be stronger than `half .50`, the strongest named
stop?). Effort M (single mechanical pass across ~15 files); classified
SAFE because it mirrors the already-decided D3 pattern exactly, with one
JUDGEMENT sub-item (the `TextField` outlier).

### AC-3. HomeScreen's "Continue workout" card uses the wrong ink token, reproducing a bug class the app already fixed once
**Severity A — SAFE**

`src/components/Button.js:44-46` documents, in its own code comment, a
real prior bug: text/icon colour on a filled card must use `colors.onPrimary`
(a fixed dark ink in both themes), never `colors.background` — because
`background` is `#0D0D0D` in dark but flips to a near-white `#FAFAF7` in
the light theme (`theme.js:162`), so text using it goes near-invisible on
a solid colour fill under the light palette ("audit U-F-1").

`HomeScreen.js`'s "Continue workout" card reproduces exactly that bug,
sitting one property away from its own correct sibling:

- `src/screens/HomeScreen.js:2379` — `continueCard: { backgroundColor:
  colors.success, ... }` (a solid green fill).
- `src/screens/HomeScreen.js:2390` — `continueTitle: { ...type.bodyStrong,
  color: colors.onPrimary }` — **correct**, dark ink, theme-safe.
- `src/screens/HomeScreen.js:2391` — `continueSub: { ...type.caption,
  color: withAlpha(colors.background, 0.8) }` — **wrong token**, one line
  below the correct one.
- `src/screens/HomeScreen.js:1643` — the row's trailing chevron:
  `<Ionicons name="chevron-forward" size={18} color={withAlpha(colors.background,
  0.8)} />` — same wrong token.

In dark theme this is invisible (background and onPrimary are both
`#0D0D0D`, a zero-visual-diff coincidence — likely why it was never
caught). In light theme, the title stays correctly dark on the green
card while the subtitle directly below it and the chevron beside it both
wash out to a near-white 80%-opacity text/icon on the same green fill —
a genuinely broken, low-contrast card on the app's own highest-traffic
screen (Home, "continue your workout"), and a direct regression against a
rule the codebase already wrote down and fixed elsewhere.

**Proposed change.** Swap both sites to `withAlpha(colors.onPrimary, 0.8)`
(or a plain `colors.onPrimary` at reduced weight via the `type.caption`
role, matching how the rest of the app handles "dim text on a coloured
fill"). Two-line, mechanical, matches the established sibling pattern one
line above it in the same file — SAFE.

### AC-4. The warm-up "flame" icon renders in two different weights for the identical meaning, in the same screen
**Severity C — SAFE**

- `src/screens/ActiveWorkoutScreen.js:151` — the logged-set row's warm-up
  marker: `<Ionicons name="flame" size={14} color={colors.warning}
  style={{ width: 22, textAlign: 'center' }} />` (filled).
- `src/screens/ActiveWorkoutScreen.js:2240` — the active set-entry card's
  warm-up banner, same file, same exact meaning ("warm-up, not counted in
  your totals"): `<Ionicons name="flame-outline" size={14}
  color={colors.warning} />` (outline).

Every other `flame` reference in the app (11 sites, e.g.
`NutritionTargetsScreen.js:1241`, `CoachOutputScreen.js:274,290`,
`ProSetupCompleteScreen.js:206,243`, `LogCardioScreen.js:224`) uses the
outline variant, making the one filled instance at line 151 the true
outlier, sitting a few hundred lines from its own outline sibling in the
same file. Small, but on the screen users open every gym session.

**Proposed change.** Change `ActiveWorkoutScreen.js:151` to
`flame-outline` to match its own sibling and every other flame use in the
app. One-line, mechanical — SAFE.

### AC-5. A fourth, undocumented "micro-label" type treatment coexists with the two documented small-text roles
**Severity B — JUDGEMENT**

`docs/DESIGN_SYSTEM.md:131` states the rule directly: *"Use the `type`
roles. Never hand-assemble `{ fontSize, fontWeight }`."* `theme.js` names
exactly two roles for this size band — `type.caption` (11/regular) and
`type.overline` (11/medium, uppercase, tracked) — plus `type.label`
(13/medium) one step up. In practice a **fourth, unnamed** combination
survives across roughly **29 files**: `fontSize.xs` (11) paired with a
hand-picked `fontWeight` that varies file to file, and inconsistent
line-height (several sites set none at all, falling back to React
Native's default ~1.2× rather than any of the token roles' documented
multipliers):

- `src/components/WeightTrendCard.js:143` — `{ fontSize: fontSize.xs,
  color: colors.textMuted }` (no weight, no lineHeight).
- `src/components/ReadinessCards.js:292,311` (no weight), `:338` —
  `fontWeight.medium`.
- `src/components/ExercisePickerModal.js:482` — `fontWeight.bold`.
- `src/components/Dropdown.js:77` — `fontWeight.semibold`.
- `src/components/TextField.js:104` — `fontWeight.semibold`.
- `src/screens/BodyMetricsScreen.js:1349` — `fontWeight.bold`; `:1392` —
  `fontWeight.medium`.
- `src/screens/PaywallScreen.js:310` — no weight at all.
- Further sites, same pattern, different weight each time:
  `components/food/MacroRings.js`, `food/EntryRow.js`,
  `food/FoodDetailSheet.js`, `food/MicronutrientPanel.js`,
  `food/CuratedMealSheet.js`, `food/QuickAddSheet.js`,
  `food/TodaysPlateTeaser.js`, `food/HeldDecisionCard.js`,
  `food/MacroBreakdownSheet.js`, `ProgressSections.js`, `PeekMenu.js`,
  `BlockProgressCard.js`, `ProgressPhotoPrompt.js`,
  `ActiveSessionMiniBar.js`, `RestTimer.js`, `StreakWeeksSection.js`,
  `VolyumeChart.js`, `ProGate.js`, `TierComparisonStrip.js`,
  `PRCelebration.js`, `EngineLog.js`, `WorkoutHistoryScreen.js`.

The visible effect: two form field labels that should read identically
(a `TextField` label and a `Dropdown` field label, for instance) happen to
match by coincidence (both landed on `semibold`), but a data-caption label
on a progress card and a metadata caption on a food row do not, because
each file guessed its own weight independently. This is a genuine type-
hierarchy weakness distinct from lane 02's B-5 (which is about *uppercase*
eyebrow labels specifically); this is the plain, non-uppercase small-label
role, and it has no name at all.

**Proposed change.** Either route every one of these sites through
`type.caption` (if 11/regular/1.35 line-height is close enough) or add a
fourth named role (e.g. `type.captionStrong`, 11/semibold) so the weight
stops being re-decided file by file — the same shape of decision as D3's
letter-spacing token. JUDGEMENT because it requires picking the canonical
weight/line-height, not a mechanical swap.

### AC-6. Home's stack of same-shaped tinted banner cards risks banner-blindness on the worst-case load, working against the app's own "calm precision instrument" position
**Severity B — JUDGEMENT**

`docs/DESIGN_SYSTEM.md` states the product-feeling bar explicitly: *"The
reference feeling is Whoop / Linear / Stripe — a calm, dense, exact tool"*
and *"Elite: nothing decorative that doesn't earn its place."*
`HomeScreen.js` can stack, above the primary "Start workout" card
(`:1628`), up to several conditionally-rendered banners that all share one
visual grammar (soft-tint card, small leading icon, one line of text, a
trailing chevron, a close "x"):

- `:1347` nutrition phase sync banner.
- `:1373` fresh coach update banner.
- `:1430` recovery week banner.
- The `AttentionCard` slot (trial ledger / free-tier line / differential
  badge, `:1842` region).
- `:1925` one-time coaching discovery nudge.

None of these are mutually exclusive in the code (each has its own gating
condition), so a realistic user — a Pro subscriber mid-recovery-week with
a fresh coach output and a stale nutrition phase — sees three or four
near-identical amber-tinted cards stacked before reaching the one card
that actually starts a workout. Each is well-built in isolation (this is
not a token-consistency finding, lane 02 already confirmed the tokens are
clean), but the *cumulative* effect of several structurally-identical
attention-seeking cards undermines the "one clear focal action" premium
feel the app is explicitly designed around, and risks the user learning to
scroll past all of them, including the ones that matter.

**Proposed change.** Not a mechanical fix — this needs a product decision
on banner priority/consolidation (e.g. cap to one visible banner at a time
with the rest queued, or fold the phase-sync and recovery-week notices
into the single `AttentionCard` priority ladder that already exists for
trial/free-line/differential). JUDGEMENT, flagged here as a craft/balance
finding rather than prescribed as a fix, per the brief's instruction not
to pre-decide product behaviour.

### AC-7. `ScreenHeader`'s brand-mark chip repurposes the camera-viewfinder colour token for a decorative backing
**Severity C — JUDGEMENT**

`src/components/ScreenHeader.js:75` — `brandMark: { ...,
backgroundColor: colors.camera }`. `colors.camera` (`theme.js:111-115`,
`docs/rules/styling.md:17`) is documented as reserved for "true black
behind a live viewfinder" and is deliberately the one colour that never
changes under the light-theme swap, alongside the Apple OAuth brand
colours. Using it here for the small V-wordmark chip on every tab screen
happens to produce the same visual result the author presumably wanted (a
black backing that stays black in both themes) but borrows a
narrowly-scoped, semantically-named token for an unrelated decorative
purpose — a latent trap if `colors.camera` is ever revisited for the
scanner screens specifically. Low severity (no visible defect today), but
worth naming a real token (e.g. `colors.chipInk` or similar) if a
theme-invariant black chip is genuinely intended everywhere, or confirming
it should track the surface ladder instead.

**Proposed change.** Confirm intent; if theme-invariant black is
deliberate, add a correctly-named token rather than reusing `camera`.
JUDGEMENT (a naming/intent call, not urgent).

---

## Safe quick wins (implementable now, no founder decision)

- **AC-2** (severity B, effort M) — sweep ~15 files' raw alpha literals
  onto the nearest named `alpha.*` stop; flag `TextField.js:115`'s 0.65
  outlier separately for a human look.
- **AC-3** (severity A, effort S) — two-line token swap,
  `HomeScreen.js:1643,2391`, from `colors.background` to `colors.onPrimary`.
- **AC-4** (severity C, effort S) — one-line icon-name swap,
  `ActiveWorkoutScreen.js:151`, `flame` → `flame-outline`.

## Needs a founder/design decision

- **AC-1** — settle one size + one colour for the app-wide disclosure
  chevron (recommend 16px / `textMuted`, reserving `colors.primary` for
  chevrons inside an already-amber CTA).
- **AC-5** — name the fourth micro-label role properly (route to
  `type.caption`, or add `type.captionStrong`) rather than leave ~29 files
  guessing their own weight.
- **AC-6** — a banner-priority/consolidation decision for Home so the
  worst-case stack of tinted cards doesn't read as several identical
  notices before the primary action.
- **AC-7** — confirm whether the brand-mark chip's theme-invariant black
  is intentional; if so, name its own token instead of borrowing `camera`.

---

## What is genuinely strong (verified, not assumed)

- **`Card`, `Button`, `Chip`, `EmptyState`, `BackHeader`, `ScreenHeader`**
  are all well-built, single-purpose primitives with real design rationale
  recorded in their own comments (press-model physics, reduce-motion
  fallbacks, WCAG-safe ink token choices, optical centring maths). This is
  the level of craft the rest of the app should be judged against, and in
  the primitives themselves it is already there.
- **Card radius drift (lane 02 A-1) is confirmed fixed in code**: `Card.js:57`
  now defaults to `radius: 'lg'` (16px) per `DECISIONS-2026-07-09.md` D1,
  matching the hand-rolled convention it used to clash with.
- **Empty-state adoption has moved further since lane 02's B-6**: of the
  six screens lane 02 named as still hand-rolling their own empty state,
  five (`WorkoutHistoryScreen`, `MesocycleBuilderScreen`, `FoodSearchScreen`,
  `YearOfLiftsScreen`, `ProgressPhotosScreen`) now import and use
  `EmptyState` at every checked call site; only `ActiveWorkoutScreen`
  (an in-session control surface, not really an empty-state-bearing
  screen) remains outside it. Not re-flagged as a finding here since it is
  already tracked and has genuinely improved.
- **Icon family and emoji discipline hold**: no mixed icon families, no
  emoji, confirmed consistent with lane 02's own clean bill on this point;
  this lane's icon findings (AC-1, AC-4) are about size/weight *within*
  the one family, a different and narrower craft question lane 02
  explicitly declined to answer.
- **`AttentionCard.js`** is a good structural pattern (one component, one
  priority function, three variants) even though its own two variants
  drifted apart on border alpha (AC-2) — the architecture is sound; the
  drift is a leftover literal, not a design flaw.
