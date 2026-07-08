# 12 — Pricing & paywall — Hevy vs Volyume

> Competitive teardown, LEARNINGS ONLY. No Hevy code/assets are copied. This file
> is analysis; it proposes nothing that edits Volyume billing without founder
> sign-off. Hevy is RN/Hermes v3.1.0; all Hevy claims are corroborated from the
> packed bundle string table at
> `scratchpad/xapk/_b/assets/index.android.bundle` and the corpus greps.

## Pricing & paywall — Hevy vs Volyume

Both ship a single paid tier with monthly/annual billing on a free base. The
strategic difference is the **gating model**: Hevy gates by *quotas on free
features* (you keep using the app, you hit walls), whereas Volyume gates by
*whole feature families* (food/coaching/cardio are Pro-only, the rest is fully
free). Hevy monetises engagement friction; Volyume monetises a capability split.

---

## How Hevy does it

**Catalogue / billing periods.** Three price points, not two:
`paywall.priceCard.billed.yearly`, `paywall.priceCard.billed.lifetime`, and a
monthly. So Hevy sells **monthly + annual + a one-time LIFETIME** purchase
(`paywall.cta.title.lifetime`, `paywall.faq.lifetime.answer`,
`paywall.upgradeToLifetimeFromSubscriptionWarning.*` for the sub→lifetime
upgrade path). Annual is the hero CTA (`paywall.cta.title.yearly`) with an
explicit savings line (`paywall.priceCard.normalYearlySavingsVariable`,
`paywall.priceCard.promoYearlySavings`).

**What Hevy gates behind Pro (quota model).** The paywall i18n namespace
enumerates the gated surfaces exactly — each has a `freeLimit` / `limit.short`
key, i.e. a free quota with a hard cap, not a hidden feature:
- `paywall.routines.freeLimit` / `paywall.routines.limit.short` — **routines are
  capped on free** (the bundle carries a literal `limit of 4`; Hevy's public free
  tier is 4 routines). Folders/programs sit alongside (`isProgramRoutine`,
  `ShareFolderPress`).
- `paywall.exercises.freeLimit` — **custom exercises capped on free.**
- `paywall.history.freeLimit` — **workout history window capped** (older history
  is Pro; `promo.upsell.unlimitedGraphHistory`).
- `paywall.measurements.limit.short` — **body-measurement tracking capped.**
- `paywall.stats.limit.short` + `paywall.card.advancedStats` /
  `promo.upsell.advancedStats` — **advanced stats / analytics are Pro.**
- Warm-up + plate calculator (`paywall.card.warmupCalculator`,
  `warmupCalculator_paywallOpen`).
- `hevyTrainer.*` — a **separate AI-coach add-on** ("Hevy Trainer", real-human vs
  AI FAQ: `paywall.faq.hevyTrainer.AI.answer` /
  `paywall.faq.hevyTrainer.realHuman.answer`) sold on the same paywall.

  Crucially, **workout logging itself is unlimited and free** — Hevy never walls
  the core loop; it walls the *accumulation* (routines, history, stats) once the
  user is invested.

**Where/how it upsells (multiple surfaces, contextual).**
- `ShowPaywallModal` / `PaywallScreen` / `FactoryPaywallStack` — the full
  paywall, opened contextually (e.g. `warmupCalculator_paywallOpen`,
  `isProContentLocked`).
- **`LimitAlertOverlay`** (`SetLimitAlertOverlay` / `ResetLimitAlertOverlay`,
  with `.message.reps` / `.message.weight` / `.subtitle.exerciseAction`
  variants) — an inline "you've hit the free limit" nudge fired *at the moment of
  the wall*, distinct from the full paywall. This is the quota-trip upsell.
- **`PromoUpsellScreen` / `PromoUpsellModal` / `promo.upsell.*`** — a
  time-boxed discount campaign surface with a live **countdown**
  (`promo.upsell.days/hours/minutes/seconds`), a `discountChicklet`,
  `firstYear` intro price, and benefit bullets (`unlimitedRoutines`,
  `unlimitedExercises`, `unlimitedGraphHistory`, `advancedStats`,
  `measurements`, `userLove`). This is a *promotional* upsell layered on top of
  the standard paywall.
- `UpgradeToProModal` / `ToProModal` / `ProBadge` — lightweight upgrade prompts
  scattered through the UI.

**Paywall content / conversion craft.** Apple endorsement block
(`paywall.appleEndorsement`), an "indie dev" trust card
(`paywall.card.indieDev`, `helloFromGuillem`), a **rotating ratings carousel**
(`paywall.rating.rating1..7` with named authors), a structured **FAQ**
(cancel / renewal / refund / switch / switching-platforms / intro-price /
lifetime), a full **comparison table** (`paywall.comparison.*` +
`paywall.table.header.whatYouGet`), and an interactive `paywall.slider`.

**Trial / intro structure.** Intro pricing is explained in-paywall
(`paywall.introPriceExplaination`, `promo.upsell.firstYear`,
`paywall.faq.introPrice.answer`) rather than a long cardless trial. Standard
store intro offer + promo discount windows.

**SDK stack (corroborated, `sdk_fingerprints.txt`).** RevenueCat (`revenueCat`,
`Offerings`, `REVENUECAT`) is the entitlement/paywall layer — it owns offerings,
price localisation, intro-offer eligibility and the lifetime SKU. **Statsig**
(2 hits) + **LaunchDarkly** (2) drive **paywall experiments / feature gates**
(`experiment_v…`, `gate_evaluation`) — i.e. Hevy A/B tests paywall variants and
quota thresholds server-side. Stripe (5) is the web/coach billing path. Heavy
analytics fan-out (Amplitude, Singular, Segment, Branch, AppsFlyer) instruments
every paywall/upsell impression.

---

## How Volyume does it today (file:line)

- **Gating is binary, all-or-nothing** — `src/lib/proGate.js:39` (`_resolveTier`),
  `:62` (`isPaidTier`); the granular per-feature map was built then deleted
  (`proGate.js:13-20`). Enforcement via `<ProGate>` checking `tier === 'pro'`
  (`src/components/ProGate.js:22`). Guardrails are tier-blind by mandate
  (`proGate.js:22-24`).
- **Catalogue: two SKUs, no lifetime** — `src/lib/payments/catalogue.js:32-49`
  (`pro_monthly` £2.99/mo, `pro_annual` £19.99/yr ≈ 44% off). Prices always from
  Play, never hardcoded (`catalogue.js:18-23`). `annualSavingsPct()`
  (`catalogue.js:100`).
- **Trial cascade (cardless 14-day → Play 7-day intro)** —
  `src/lib/payments/cascade.js:105` (`startCascade`), `:170` (`payAt`),
  `:436` (`canStillTrial`), `:446` (`daysRemaining`). Auto-downgrade worker at
  day 14 (`cascade.js:354`).
- **One paywall surface** — `src/screens/PaywallScreen.js`: annual-default toggle
  (`:50`), Play-localised price (`:144`), one rotating verified review
  (`:196`, `paywallExcerpts.js`), `TierComparisonStrip` (3 rows only,
  `src/components/TierComparisonStrip.js:24-28`), CTA + "Not now" + restore +
  legal. Triggered from `DifferentialBadge` taps (`PaywallScreen.js:11`).
- **Free vs Pro split (whole families, `CLAUDE.md`):** Free = plan library,
  training builder, **workout logging**, exercise library, PBs, progress stats.
  Pro = food diary, barcode, meal suggestions, nutrition targets, macros, cardio,
  steps, check-ins, Precision Coaching, division plans, safety, wearables.

---

## Gaps (Hevy does X, Volyume does not)

1. **No contextual limit-trip upsell.** Volyume's only paywall trigger is a
   `DifferentialBadge` tap. Hevy fires a `LimitAlertOverlay` *at the wall*, the
   highest-intent moment. Volyume gates whole families behind a screen the user
   may never reach, so a free user simply never sees the value of Pro features.
2. **No promotional / time-boxed upsell surface.** Hevy has a full
   `PromoUpsellScreen` with countdown, discount chicklet and intro-price
   framing. Volyume has flat pricing and no campaign mechanism at all — no lever
   for win-back, seasonal pushes, or first-year intro offers.
3. **No paywall experimentation.** Hevy A/B tests paywall copy, layout and quota
   thresholds via Statsig/LaunchDarkly. Volyume's paywall is static; there is no
   way to measure or improve conversion beyond shipping a new build.
4. **Thinner paywall conversion craft.** Volyume shows one review + a 3-row
   strip. Hevy stacks a ratings carousel, FAQ, comparison table, Apple
   endorsement and an indie-dev trust card — and explicitly sequences proof
   before price.
5. **No lifetime SKU / no anchor price.** Hevy's lifetime purchase both captures
   commitment-averse users and price-anchors the annual. Volyume has only
   monthly/annual.
6. **Binary gating gives no "land-and-expand" runway.** Hevy's quota model keeps
   free users engaged daily (logging is free, unlimited) and converts them on
   accumulation friction. Volyume's free tier is genuinely useful but gives the
   paid features zero in-app visibility to a free user.

---

## Recommendations (adopt / adapt, size, priority, why)

> NOTE: anything that adds an SKU, changes price, adds a trial/intro offer, or
> alters `src/lib/payments/*` or product IDs is a **billing change and needs
> explicit founder sign-off before any code is written** (CLAUDE.md sacred rule).
> The recommendations below are flagged accordingly; several are pure
> UX/telemetry and do NOT touch billing.

| # | Rec | Adopt/Adapt | Size | Pri | Why |
|---|-----|-------------|------|-----|-----|
| R1 | **Contextual upgrade prompt at the moment a free user opens a Pro family** (food diary, cardio, coaching). A `ProGate`-driven inline overlay → existing `PaywallScreen` with a `trigger` telemetry tag, instead of relying on a badge tap. *(No billing change — UX + routing + telemetry only.)* | Adapt (Hevy `LimitAlertOverlay`) | M | **P1** | Surfaces Pro value at highest intent; Volyume currently has no contextual trigger. Reuses existing paywall + `paywall_tapped_cta`/`surface` telemetry. |
| R2 | **Paywall conversion craft pass**: add a short FAQ (cancel/renewal/refund) and a small "what you get" comparison expansion below `TierComparisonStrip`; keep the single verified review (honesty bar already enforced in `paywallExcerpts.js`). *(No billing change.)* | Adapt | S | **P1** | Hevy's FAQ/comparison are proven conversion furniture; cheap, no billing exposure, must keep British-English + the existing honest-review bar. |
| R3 | **Trigger telemetry + funnel instrumentation per surface** so paywall opens, family-gate hits and dismissals are attributable. The cascade already emits `cascade_state_transition`/`paywall_tapped_cta` (`cascade.js:67`); extend the trigger taxonomy so we can see *which* gate drives intent. *(No billing change.)* | Adopt (Hevy event density) | S | **P1** | Without this we cannot evaluate R1/R4. Build before any pricing experiment. |
| R4 | **Founder decision: introduce a promotional/win-back surface** (time-boxed intro or annual discount). `winbackState.js`/`lapseDetect.js` scaffolding already exists in `payments/`. | Adapt (Hevy `PromoUpsell`) | M | **P2** | Lever for re-engaging cascade-expired/lapsed users. **Billing-adjacent — founder sign-off required**; do not build the offer mechanics unprompted. |
| R5 | **Founder decision: evaluate a lifetime SKU as a price anchor** for the annual. | Adopt | M | **P2** | Captures commitment-averse buyers and anchors annual. **Direct billing change — product IDs/SKUs — founder sign-off mandatory.** |
| R6 | **Founder decision: server-driven paywall config / A/B (feature-flag the paywall variant, not the price)** so copy/layout can be tuned without a build. Must respect EU residency + no-PII rules; a lightweight in-house flag is preferable to adding Statsig/LaunchDarkly (new dependency → needs approval). | Adapt | L | **P3** | High ceiling but heaviest; gated on a dependency + privacy decision. Only worth it once R3 funnel data justifies experiments. |

**Explicitly NOT recommended:** adopting Hevy's **quota model** (cap free
routines/history/exercises). It contradicts Volyume's locked architecture (free =
full workout logging + builder + stats) and the FREE/PRO split is a founder
decision (`proGate.js:6`). Do not gate a currently-free feature behind a quota.

## Quick wins

- **QW1 (S, P1, no billing):** Wire `ProGate`'s locked state to deep-link into
  `PaywallScreen` with a `trigger=<family>` param — turns every currently-dead
  Pro touchpoint (food/cardio/coaching) into an upsell entry. Pure routing.
- **QW2 (S, P1, no billing):** Add the FAQ accordion (cancel/renewal/refund) to
  `PaywallScreen` under the CTA stack — copy only, British English.
- **QW3 (S, P1, no billing):** Extend `paywall_tapped_cta` with a `trigger`
  dimension already passed in `route.params.trigger` (`PaywallScreen.js:42`) so
  surface-level conversion is measurable from day one.
- **QW4 (XS, P2, no billing):** Make the Pro column of `TierComparisonStrip`
  tappable everywhere it renders (the `onPickPro` prop already exists,
  `TierComparisonStrip.js`) so the comparison strip itself is a CTA.
