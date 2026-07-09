# 08 — Conversion Funnel Audit (free discovery → Pro purchase)

**Date:** 2026-07-09. **Scope:** presentation layer only, per CLAUDE.md's
inviolable constraints (billing code, product IDs, purchase/restore/
entitlement/cascade mechanics, and the binary free/Pro line are all
out of scope for change; anything that would need to touch them is
marked **GATED** below). App version at audit time: 1.2.0 (build 27),
repo HEAD `069cd43`.

**Method:** every claim below is verified against the current source
(paths + line numbers cited), not against the design docs alone. Where
a locked/audit document's description has drifted from what actually
ships, that drift is called out explicitly — it is itself a finding.

**Context read first:** `docs/GROWTH_STRATEGY_SYNTHESIS_LOCKED.md`,
`docs/MOVE_4_DIFFERENTIAL_PAYWALL.md`, `docs/volyume-elite-audit/08-
retention-growth-and-monetisation.md`, `docs/s6-activation-nudge-
design-2026-07-03.md`. Several findings below independently confirm
(and in places sharpen) O4's 2026-07-04 elite audit; where that
overlaps it's noted, and where this audit goes further (new findings
not in that doc) it's flagged **NEW**.

**Headline architecture fact that changed since the growth docs were
written:** the product is no longer the two-tier Pro/Complete cascade
described in `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` §7 and
`MOVE_4_DIFFERENTIAL_PAYWALL.md`. Founder override 2026-06-06
collapsed it to **flat single-tier pricing**: Pro only, £2.99/month or
£19.99/year (`src/lib/payments/catalogue.js:1-50`), a 14-day cardless
in-app trial followed by the store's own 7-day intro offer
(`CascadeGateScreen.js:1-49`, "2-tier model (founder override
2026-05-25)"). The growth synthesis's pricing ladder (£0.99/£1.99
open-beta, £1.49/£3.49 founders, £2.99/£6.99 standard, a Complete
tier) is stale against shipped code. This doesn't change any audit
conclusion below, but any future reader treating those docs as current
pricing truth will be wrong.

---

## Severity A — actively losing conversions / confusing

### A1. The single highest-leverage conversion card contradicts itself on the free-trial length, on the same screen

`DifferentialBadge` is Move #4's "the conversion lever" — the inline
card a free user sees when the weekly coach detects a moment where
food data would change the read (stalled lift, deload, missing TDEE,
block summary). It renders two pieces of text stacked directly on top
of each other:

- **Body** = `differential.with_food_data_message`, sourced verbatim
  from `LOCKED_COPY` in `src/lib/differentialPaywall.js:48-53`, e.g.:
  > "Your bench has stalled for three weeks. With food data, we could
  > tell you if it's training or fuel. **Try Pro free for 7 days.**"
- **CTA button**, two lines below it, `src/components/
  DifferentialBadge.js:57-59`:
  ```js
  const ctaLabel = differential.paywall_cta === 'try_pro_14d'
    ? 'Try Pro free for 14 days'
    : pricingPriceText ? `Get Pro for ${pricingPriceText}` : 'Get Pro';
  ```
  renders **"Try Pro free for 14 days."**

Confirmed live: `AttentionCard.js:137-139` renders `DifferentialBadge`
directly with the engine's `differential` object; `HomeScreen.js:1305-
1307` gates it to free-tier users with `paywall_cta` defaulting to
`try_pro_14d`. So a real user sees "...free for 7 days" in the
sentence and "Try Pro free for 14 days" in the button beneath it, in
the same card, at the exact moment Move #4 was built to convert.

Both numbers are individually true for *different* surfaces (7 = the
store's intro offer once a purchase sheet opens; 14 = the in-app
cardless trial this CTA actually starts — `differentialPaywall.js:42-
47` explains the intended split), but the badge's own copy was never
updated when the CTA's destination moved from the store purchase
screen to the cardless-trial screen (see A2). The result reads as
either a typo or a bait-and-switch to a user who has no way to know
the internal distinction.

**Fix is copy-only**: make `LOCKED_COPY`'s embedded trial clause match
whatever `paywall_cta` actually resolves to (or drop the length from
the body sentence entirely and let the CTA button be the single source
of the number). **SAFE** — no billing code touched, pure string
content in `differentialPaywall.js` plus its locked-copy snapshot
test.

### A2. PaywallScreen — the richest, most carefully built paywall in the app — is dead code no user can reach

`src/screens/PaywallScreen.js` is fully built: proof-before-price
review card, `TierComparisonStrip`, `BillingPeriodSelector`, restore
purchases, subscription-terms and privacy links, full telemetry
(`paywall_shown`/`paywall_tapped_cta`). It is registered in the
navigator (`RootNavigator.js:104,498`).

`grep -rn "navigate(.Paywall.\|'Paywall'" src` returns exactly one
hit outside the screen and navigator themselves: a comment in
`src/lib/differentialPaywall.js:43`, describing a call site
(`CoachOutputScreen → navigate('Paywall')`) that **no longer exists in
the code**. The differential badge was re-homed to `HomeScreen`
("NAV-4", `HomeScreen.js:1523-1549`) and its CTA now navigates to
`'ProUpgrade'` (`HomeScreen.js:1541`), not `'Paywall'`. No other file
in `src/` calls `navigate('Paywall')`.

Practical effect: the screen carrying the app's only social-proof
block, its most complete side-by-side pricing/trial disclosure, and
its own dedicated telemetry is **unreachable from any live user flow**.
Every purchase in the shipped app instead goes through
`ProUpgradeScreen`, a different, less complete pitch (see A4, A5).

This is worth a founder decision, not a silent fix: either (a) wire a
real entry point to `PaywallScreen` (e.g. make the differential badge
route there again, now that it's the intended "lighter, single-
decision" surface per its own header comment), or (b) formally retire
it and fold anything worth keeping (the proof card, the excerpt
rotation) into `ProUpgradeScreen`. Either is a real product decision
about which screen a user should see, not a pure copy fix — **flagging
as founder-decision-needed, not GATED-for-billing** (no billing code
is implicated either way).

### A3. Proof-before-price ships empty regardless of A2

`PAYWALL_EXCERPTS = []` in `src/screens/paywallExcerpts.js:37-41` —
the review-excerpt block is coded to render nothing until ≥3 real,
curated Google Play reviews are added (the honesty contract in the
same file is well-designed: verbatim quotes only, ED-safe themes only,
founder-curated). Matches elite-audit P1-1. Compounds A2: even if
`PaywallScreen` were reachable, it has no proof to show today.
**SAFE**, content-only — needs founder sourcing from Play Console, no
code change.

### A4. The day-14 "must convert" gate uses fully generic copy with zero personalisation, despite the app already building the exact data needed

`CascadeGateScreen.js`, variant `'day14'` (the trial-end decision —
arguably the single highest-stakes screen in the funnel, since it is
where an already-engaged 14-day user decides to pay or not) shows:

```js
// CascadeGateScreen.js:72-82
subtitle: "Pro keeps the weekly coaching and the food log. Free keeps
your data and safety checks, but some features become view-only.",
```

This is **word-for-word the same subtitle** used by the `'upgrade'`
variant (`CascadeGateScreen.js:58-60`) for a user who has never
trialled anything. A user who has spent two weeks weighing in, logging
sessions and reading weekly coach decisions gets no callback to what
they actually did.

The app already has this exact recap machinery, built and shipping
elsewhere: `src/lib/coachLedger.js`'s `buildCoachLedger()` produces
lines like *"3 of 3 morning weigh-ins this week"*, *"N training
sessions logged"*, with an ED-safe neutral fallback already solved —
and it's rendered on `HomeScreen` via `AttentionCard`'s `'trial'`
variant (`AttentionCard.js:51-104`) during the trial itself. None of
that ledger data is passed into `CascadeGateScreen` at the point of
decision. The single highest-leverage moment in the funnel currently
sells worse than a random Tuesday banner earlier in the same trial.
**SAFE** — this is a props/copy wiring change (pass ledger data into
the existing screen), not a billing-logic change.

### A5. The 14-day trial starts in complete silence

`Article9ConsentScreen.js:122-139` fires `cascade.startCascade()`
(which grants the 14-day Pro trial) as a side effect of the health-
data consent tap, with **no UI acknowledgement of any kind** — no
toast, no "Your 14-day Pro trial has started" line, nothing. The
screen's entire visible purpose is the GDPR/Article 9 consent gate;
the trial start is invisible plumbing bolted onto it. A user who
consents and moves on may not register that a 14-day clock is running
at all, which undercuts the premise of every day-3/day-7/day-14
touchpoint built around that clock (`trialActivation.js`,
`coachLedger.js`, the day-14 gate). Matches elite-audit P2-1,
independently confirmed here at the exact call site. **SAFE** — one
honest additive toast/banner line, no billing logic touched.

---

## Severity B — below par

### B1. PaywallScreen and the two live purchase surfaces disagree on the default billing period

- `PaywallScreen.js:52` defaults to **annual** (comment cites "COMP-007:
  annual is the default... Health and fitness is the only category
  where annual dominates").
- `CascadeGateScreen.js:105` and `ProUpgradeScreen.js:92` default to
  **monthly**, per an explicit later founder decision: "Founder
  decision 2026-07-02 (supersedes COMP-007's annual anchor): monthly
  is the pre-selected period on every subscribe surface... so the two
  revenue surfaces never disagree." (`ProUpgradeScreen.js:88-91`).

`PaywallScreen` was never updated to match. Currently inert because of
A2 (nobody reaches it), but it is a live landmine: the moment anyone
wires a route back to it (a very plausible outcome of resolving A2),
the founder's own "never disagree" rule breaks on day one. **SAFE** —
one-line default change, matches the pattern already used on the two
live screens.

### B2. ProUpgradeScreen — the screen carrying essentially all purchase traffic — has zero telemetry

Confirmed by direct inspection of `src/screens/ProUpgradeScreen.js`:
no import of `engineTelemetry`, no `track(...)` call, no `audit(...)`
breadcrumb call anywhere in the file — compare to `PaywallScreen.js`
(`paywall_shown` on mount, `paywall_tapped_cta` on every decision) and
`CascadeGateScreen.js` (same). Every `ProGate` lock, every
`ProLocked` full-screen gate, the differential badge, and
`SubscriptionScreen`'s "Upgrade"/"Stay on Pro" button all funnel into
`ProUpgradeScreen` (`ProGate.js:84`, `ProGate.js:216,226`,
`HomeScreen.js:1541`, `SubscriptionScreen.js:130`). **NEW** — this
sharpens elite-audit P1-2 ("`paywall_shown` fires only on the Home
banner, not on PaywallScreen or CascadeGate"): the actual gap is
larger than that framing suggests, because the screen nearly all
traffic reaches has no impression or tap telemetry at all. Once
migrations 092-102 land (per CLAUDE.md's outstanding founder action),
the view→trial and view→purchase KPIs will still be uncomputable for
the majority of funnel traffic until this screen also fires
`paywall_shown`/`paywall_tapped_cta`. **SAFE** — telemetry calls only,
mirrors the pattern in the two sibling screens.

### B3. PostLapseSheet, the peak-attention moment right after a cancellation completes, makes no forward pitch at all

`src/components/PostLapseSheet.js` is pure reassurance: "Everything
you logged is saved... Training, plans and progress stay free," a
single "Got it"/"Done" button, no link to Subscription, no mention of
a win-back offer even when one is wired (see B4). This is the single
moment of highest attention post-cancellation and it is entirely
un-monetised — matches elite-audit P2-11, confirmed. On-brand
(reassurance without hard-sell is correct), but a single calm,
optional line — "Changed your mind? Pro is always one tap away in
Subscription." — with no urgency framing would not violate the
ED-safety/no-dark-pattern posture and would close the gap. **SAFE** —
copy + a tertiary navigation link only.

### B4. Win-back push copy never signals the win-back offer it may actually be carrying

`winbackContent.js:42-71`'s `winbackPush()` builds copy entirely from
the user's own logged activity ("Still lifting. 3 sessions since
March.") and deliberately omits any offer mention ("the store win-back
OFFER clause is deliberately omitted... a Phase-B... concern"). But
`ProUpgradeScreen.js:123-125` and `SubscriptionScreen.js:130` **do**
carry `fromWinback` through to prefer a real Play win-back offer when
one is configured (COMP-025-B). So a user who taps the win-back
notification may land on a better offer than the notification itself
ever mentioned — understating the pitch at the exact re-engagement
moment. Matches elite-audit P2-11's related point. **GATED** in part:
if a real Play offer is live, surfacing "there's a return offer
waiting" in the push body is presentation-only and **SAFE**; deciding
*whether* to reference pricing/offers in a push notification body at
all is a judgement call worth a quick founder read given the
no-manufactured-urgency house rule, even though it isn't billing code.

### B5. The generous trial structure is honestly disclosed but inconsistently worded, adding cognitive load

The real offer — 14 cardless days, then (if store-eligible) a further
7-day store intro trial, then billing — is accurate everywhere it
appears, but phrased differently on each screen:
- `ProUpgradeScreen.js:404-406`: "Pro's free for the next 14 days, and
  [store] adds another week free when you subscribe."
- `SubscriptionPolicyScreen.js:99-100`: "New accounts get Pro free for
  14 days... Your store adds a further 7 days free."
- `PaywallScreen.js:189-192` (unreachable, A2) states only the 7-day
  store figure, framed as if it were the entire offer.
- `ProUpgradeScreen.js:48-50}` FAQ answer never mentions the extra 7
  days at all, even though the banner directly above it does.

No dishonesty, but a genuinely generous 21-day total free run never
gets stated as a single plain number anywhere ("21 days free in
total"), which undersells what is actually a strong differentiator
versus MacroFactor/Whoop-style single 7-day trials. **SAFE** —
wording alignment only.

### B6. Store review prompt never fires from a Pro moment

`storeReview.js`'s `shouldPromptReview()`/`requestReview()` are only
called from `WorkoutSummaryScreen.js:678` (free training-log
completion) and manually from `SettingsAboutScreen.js:33` ("leave a
review" settings link). Never from a Pro-tier high moment (a clean
weekly coach decision on `CoachOutputScreen`, a completed check-in).
Matches elite-audit P2-18, confirmed independently via grep — no other
call site exists in `src/`. A Pro subscriber delighted by the coaching
loop, arguably the app's most differentiated and persuasive moment for
prospective buyers reading the store listing, is never asked.
**SAFE** — same dedupe key, new trigger call site, no billing
involvement.

---

## Severity C — polish

### C1. TierComparisonStrip's 3 rows never vary by context
Same generic 3-row Free/Pro comparison on every surface
(`TierComparisonStrip.js:24-28`), including directly beneath the
differential badge's trigger-specific copy. A user who arrived because
of a stalled bench sees no bench/lift-specific reinforcement in the
strip immediately below the personalised sentence that got them there.

### C2. "Show-then-sell" teaser exists for exactly one Pro-gated feature
`ProGate.js:167`: `showPlateTeaser = feature === 'Food diary' ||
feature === 'Nutrition'` — the only Pro lock with a live, read-only
preview (`TodaysPlateTeaser`) ahead of the CTA. The other ~20
`withProGuard`/`withReadOnlyProGuard` routes (cardio, body metrics,
weekly check-in, coaching decision, meal plan, recipes, etc. — full
list at `RootNavigator.js:178-222`) get the plain "held-seat" lock with
no preview. A cheap, already-proven pattern used once.

### C3. Free-tier "Pro reads the full story" link is visually weaker than the differential CTA one priority slot below it
`AttentionCard.js:122-132` renders the free-tier weekly line's Pro
link as a plain bordered text row; the differential badge directly
below it (in priority) uses a filled/outlined CTA button. Both lead to
the identical `ProUpgrade` screen but read as different levels of
invitation.

### C4. No persistent trial-countdown indicator
The only day-count visibility during the trial is the dismissible Home
banner (`AttentionCard` `'trial'` variant). Once dismissed, a user has
to open Subscription to see days remaining — no persistent chrome
(tab badge, profile row) surfaces it the way Whoop/Gentler Streak keep
trial state visible passively.

### C5. Benchmark gaps vs. calm subscription apps (Whoop, MacroFactor, Gentler Streak)
- **Live data preview before the ask**: MacroFactor shows a real macro
  ring before any paywall. Volyume's only equivalent (C2) covers one
  feature out of ~20 gated screens.
- **A single plain "21 days total" framing** (B5) — competitors that
  stack trial mechanics tend to headline the combined number, not make
  the user add it up.
- **Passive trial-state visibility** (C4).
- **Contextual proof at the point of the ask** (A3/A1) — Whoop and
  MacroFactor both lead with either a mechanism explanation or a
  concrete stat, never an empty or contradictory promise.

---

## Friction / tap-count notes (no severity issue found)

The purchase path itself is lean and well-handled: `ProGate`/
`ProLocked` → `ProUpgradeScreen` → native Play sheet → success screen
→ (if new) Pro setup wizard is roughly 3 in-app taps + 1 native
confirmation for an existing account holder. Loading states
(`busy`/`loading` props on `Button`), error toasts distinguishing
cancel vs timeout vs genuine failure (`CascadeGateScreen.js:173-190`),
and the "payment received, finishing activation" fallback toast when
server confirmation lags (`ProUpgradeScreen.js:139-142`,
`PaywallScreen.js:113-116`) are all present and calm — no dark
patterns found anywhere in the purchase, cancel, or restore paths.
`CancelReasonSheet.js` explicitly keeps the store-handoff CTA always
enabled regardless of whether the optional reason is answered
(anti-dark-pattern by design, DMCC-compliant). `SubscriptionPolicyScreen.js`
is a genuinely strong, honest "what happens to my data" reference —
best-practice quality, no changes suggested.

---

## Prioritised top-10 presentation-layer improvements

| # | Fix | Finding | Size | Flag |
|---|---|---|---|---|
| 1 | Make the differential badge's body copy and CTA button agree on one trial number (drop the embedded "N days" clause from `LOCKED_COPY` or match it to `paywall_cta`) | A1 | S | SAFE |
| 2 | Founder decision: re-wire a live entry point to `PaywallScreen`, or formally retire it and fold its proof card into `ProUpgradeScreen` | A2 | M | SAFE (decision, no billing code either way) |
| 3 | Source ≥3 real Play reviews into `PAYWALL_EXCERPTS` (founder task, Play Console) | A3 | S | SAFE |
| 4 | Pass the existing `coachLedger` trial-recap data into the day-14 `CascadeGateScreen` so the highest-stakes gate references what the user actually did | A4 | M | SAFE |
| 5 | Add a one-line "your 14-day Pro trial has started" acknowledgement at the Article 9 consent moment | A5 | S | SAFE |
| 6 | Add `paywall_shown`/`paywall_tapped_cta` telemetry to `ProUpgradeScreen`, mirroring `PaywallScreen`/`CascadeGateScreen` | B2 | S | SAFE |
| 7 | Fix `PaywallScreen`'s stale annual-default to match the 2026-07-02 monthly-default rule (do alongside #2) | B1 | S | SAFE |
| 8 | Add one calm, optional forward-link on `PostLapseSheet` ("Pro is one tap away in Subscription") | B3 | S | SAFE |
| 9 | State the win-back offer in `winbackPush()` copy when a real Play offer is configured for that send | B4 | S | GATED (offer-existence check touches payments code; copy itself is safe once gated behaviour confirmed) |
| 10 | Align the "14 + 7 days" trial wording to one consistent, single "21 days total" framing across `ProUpgradeScreen`, `SubscriptionPolicyScreen` and the FAQ | B5 | S | SAFE |

**Also worth a founder look, not in the top 10 by conversion leverage
but cheap:** extend the store-review trigger to a Pro coaching-review
moment (B6, S, SAFE); extend the food-diary "show-then-sell" teaser
pattern to 2-3 more high-traffic Pro locks such as body metrics or the
weekly check-in (C2, M, SAFE).
