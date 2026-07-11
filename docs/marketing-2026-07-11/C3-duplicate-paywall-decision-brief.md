# C3 — Duplicate paywall architecture: founder decision brief

**Date:** 2026-07-11 · **Lane:** marketing sequence (C1→C2→C7→C8→**C3**→C5)
**Status:** READ-ONLY audit complete (Opus agent, lead-verified). NO code has
been changed. This brief exists to put a structured choice in front of the
founder; nothing is built until he rules.

---

## 1. What the audit found (lead-verified facts)

The app carries **three** store-purchase surfaces sharing one billing path
(`playBilling.purchasePackage` → `cascade.payAt`/`confirmPurchase`; product
IDs untouched everywhere):

| Surface | Role today |
|---|---|
| `src/screens/ProUpgradeScreen.js` | The live upgrade destination. Registered in five stacks (`RootNavigator.js:435/463/490/527/586`), reached by all eleven upgrade call sites (ProGate, Home ×3, differential badge, Diary, Body, Settings, Plans, You, Subscription win-back). State-aware (trial / buy / beta / OAuth / lapse), has a success state, freshly C2-instrumented with entry-source telemetry pinned by `src/__tests__/proUpgradeTelemetry.guard.test.js`. |
| `src/screens/PaywallScreen.js` | **Orphaned.** Registered once (`RootNavigator.js:584`, ProfileStack modal) but **zero navigation call sites in the whole of `src/`** (lead re-verified by direct grep: only the registration and the lazy import at `RootNavigator.js:128` exist). The one flow its own header claims to serve — the DifferentialBadge tap — provably routes to ProUpgrade instead (`HomeScreen.js:1672`), and a guard test actively enforces that (`differentialBanner.guard.test.js:148`). |
| `src/screens/CascadeGateScreen.js` | NOT part of the duplication. Live and reachable (`SubscriptionScreen.js:131`) for the day-14/day-28 cascade gates. Out of scope for this decision. |

**The orphan is not neutral.** PaywallScreen has drifted against standing
rulings and live copy:

- It still defaults to **annual** (`PaywallScreen.js:54`, COMP-007), which
  the founder's 2026-07-02 ruling explicitly superseded — monthly is the
  pre-selected period "on every subscribe surface"
  (`ProUpgradeScreen.js:95-99`). Moot only because nothing can reach it.
- It still frames the trial as "Try Pro free for 7 days"
  (`PaywallScreen.js:185-187`) — the exact 7-vs-14 contradiction class C1
  just cleaned out of the differential copy.
- Its telemetry is the pre-C2 coarse shape (`surface: 'paywall_screen'`, no
  entry source, route params no caller sets — `PaywallScreen.js:74-78`).
- Stale cross-references remain in live files: `PaywallScreen.js:4`,
  `DifferentialBadge.js:30`, `ProGate.js:178` and `:253` all still describe
  Paywall as wired into flows it no longer serves.

**But the orphan also holds two capabilities the live surface lacks:**

1. **Play-review social proof** — the excerpt card
   (`PaywallScreen.js:215-225`, backed by `src/screens/paywallExcerpts.js`,
   with its own passing test suite). ProUpgrade shows no social proof.
2. **Inline restore button** (`PaywallScreen.js:141-165`). On ProUpgrade
   there is no on-screen restore; restore lives on ProGate/lock surfaces.

Full evidence base (surface inventory, drift catalogue, ownership map,
test-pin costs, DifferentialBadge consumers): the audit report is reproduced
in section 4 below rather than summarised, per the source-documents rule.

## 2. Why this needs a founder ruling

The TASKBOARD entry for C3 explicitly gates this on a founder decision, and
any option that touches PaywallScreen touches a **purchase surface**: under
`docs/rules/billing.md` a refactor of purchase/restore flows needs a
dedicated written test plan, and deleting a surface is irreversible-feeling
work the lead won't pre-decide. D33 delegation does not apply where the
board explicitly reserved the fork.

## 3. The decision — one question, four shapes

**Q: What happens to PaywallScreen?**

**Option A — Delete the orphan, port nothing.**
Remove `PaywallScreen.js`, its registration and lazy import, retire its
orphan-only tests (`paywallTelemetry.test.js`, its three
`tier-screens-mount` cases, `paywallExcerpts.test.js` if the excerpt module
goes too), and fix the four stale cross-references. ProUpgrade is the single
upgrade surface. Consequence: the social-proof excerpt card and inline
restore button are deleted unused, not preserved. Smallest diff; loses the
two capabilities.

**Option B — Delete the orphan, but port its two unique capabilities into
ProUpgradeScreen first.**
Same removal as A, preceded by: (1) the Play-review excerpt card added to
ProUpgrade (module `paywallExcerpts.js` survives with its tests), (2) an
inline restore affordance added to ProUpgrade. Consequence: the live surface
gains social proof + restore; the diff touches the C2-instrumented screen,
so the telemetry guard suite gets re-anchored and, per billing rules, a
written test plan covers the restore addition. Most work; nothing of value
is lost.

**Option C — Rewire PaywallScreen as a live variant.**
Give it call sites again (e.g. as a deliberate lightweight "single
decision: pay or dismiss" surface for a specific flow), and bring it up to
current law first: monthly default per the 2026-07-02 ruling, C1 copy
shape, C2-grade telemetry. Consequence: the app deliberately runs two
upgrade surfaces; every future copy/pricing/telemetry change lands twice;
the audit found no flow currently asking for a second surface.

**Option D — Leave the code as-is; documentation-only cleanup.**
Fix only the four stale cross-references and the superseded-ruling comment.
Consequence: an unreachable purchase surface with superseded defaults and
contradictory trial copy stays in the tree indefinitely, mounting in tests
and costing every future sweep (theme, copy, telemetry, a11y) a duplicate
pass — the audit's git history shows it has been silently absorbing sweep
commits for weeks.

Per the standing rule, no option is framed as the recommendation and the
lighter options (A, D) are not the default. All four are buildable; B and C
carry a billing-rules test-plan obligation; A and B end the duplication.

## 4. Full audit evidence (verbatim agent report, lead-verified)

The complete file:line evidence base follows, unedited, so this brief is a
source document rather than a summary.

### 4.1 Surface inventory

**Three purchase surfaces exist**, not two. `src/lib/payments/cascade.js:208`
names them: "the purchase surfaces (ProUpgrade, Paywall, CascadeGate)".

**A. PaywallScreen — `src/screens/PaywallScreen.js`**
- Route registration: `src/navigation/RootNavigator.js:584` — `name="Paywall"`, modal, registered in ProfileStack only (single registration in the whole app). Lazy import: `RootNavigator.js:128`.
- Navigation call sites reaching it: NONE. A full-tree grep for `navigate('Paywall'` / `Paywall` finds only the registration (`:584`), the lazy import (`:128`), and doc/comment/test references.
- Renders: title "Start Precision Coaching" (`:207`); Google Play review excerpt card (`:215-225`, via `pickPaywallExcerpt`); `TierComparisonStrip` (`:228`); `BillingPeriodSelector` (`:235`); pay CTA + "Not now" (`:244-245`); store-terms disclosure (`:248`); restore + subscription-terms + privacy legal row (`:254-284`). No OAuth, no FAQ, no success state.
- Billing functions: `playBilling.purchasePackage` (`:105`), `cascade.payAt` (`:107`), `cascade.confirmPurchase` (`:115`), `restorePurchases` (`:148`), `skuFor('pro', period)` (`:95`), `usePlayPrices` (`:171`).
- Telemetry: `paywall_shown` once per mount, `surface: 'paywall_screen'` (`:74-78`); `paywall_tapped_cta` with `cta: 'dismiss'` (`:87`) and `cta: 'pay_pro'` (`:102`). Plus `audit()` breadcrumbs (`:85, :93, :143`).
- Copy: inline literals; only external copy source is `paywallExcerpts.js` (`:36`). Does not import `differentialPaywall.js`.

**B. ProUpgradeScreen — `src/screens/ProUpgradeScreen.js`**
- Route registration: five stacks — `RootNavigator.js:435` (Nutrition/gated), `:463` (HomeStack), `:490` (PlansStack), `:527` (ProgressStack), `:586` (ProfileStack). Lazy import `:133`.
- Navigation call sites (11 total): `ProGate.js:88` (`source: 'pro_gate'`), `:223` (`'pro_gate_teaser'`), `:233` (`'pro_gate'`); `HomeScreen.js:1434` (`'home'`), `:1662` (`'home_attention_card'`), `:1672` (`differential_${trigger}`); `YouScreen.js:399` (`'coach_pitch_card'`); `PlansScreen.js:686` (tier-gated, no source param — the one un-sourced live call); `SettingsAccountScreen.js:39` (`'settings_account'`); `BodyMetricsScreen.js:972` (`'body_metrics'`); `DiaryScreen.js:1384` (`'diary'`); `SubscriptionScreen.js:135` (`fromWinback` param, no source).
- Renders: icon + "Go Pro" (`:411-413`); `PRO_PERKS` 4-item feature list (`:26-31, :418-427`); credential note (`:429`); `TierComparisonStrip` (`:438`); branch on `hasAccount` → either `BillingPeriodSelector`+subscribe button (`:453-473`) or `OAuthButtons` Apple/Google (`:484-488`); `FAQ_ITEMS` 5-item FAQ (`:37-58, :495-503`); subscription-policy link (`:505-516`); "Maybe later" dismiss (`:522`). Full success/"You're Pro" state with Pro-onboarding routing (`:348-401`).
- Billing functions: `playBilling.purchasePackage` with `preferWinback` (`:163`), `cascade.payAt` (`:165`), `cascade.confirmPurchase` (`:174`), `cascade.canStillTrial` (`:81`), `cascade.startCascade` (`:230`), `skuFor` (`:154`), `usePlayPrices` (`:86`). Also `setTier` (`:143, :258`), `refreshTierFromCloud` (`:144`), `syncAll`/`bulkUploadLocalData`/`pullFromCloud` (`:137-141`).
- Telemetry: `paywall_shown` once per mount, `surface: 'pro_upgrade'`, carrying `source`, `can_trial`, `has_account` (`:114-119`); `paywall_tapped_cta` via one `trackCta` helper (`:125-130`) with ctas `select_period`, `start_trial`, `buy_pro`, `activate_beta`, `create_account`, `dismiss`, `sheet_cancelled` (`:455, :470, :485-486, :191, :407, :522`).

**C. CascadeGateScreen — `src/screens/CascadeGateScreen.js`** (third surface, distinct function)
- Registered `RootNavigator.js:583` (ProfileStack, modal). Handles day-14/day-28 trial-cascade gates (`:8, :103`), variants `day14`/`payment_failure` (`:17`). Calls `playBilling.purchasePackage` (`:160`), `cascade.payAt` (`:162`), `skuFor` (`:147`). Entered from `SubscriptionScreen.js:131` when `stage === 'pro_trial'`. PaywallScreen's own header (`PaywallScreen.js:5-8`) carves CascadeGate off as the "more branched" cascade decision vs Paywall's "single decision: pay or dismiss."

### 4.2 Drift catalogue (Paywall vs ProUpgrade)

| Dimension | PaywallScreen | ProUpgradeScreen | Evidence |
|---|---|---|---|
| Default billing period | `annual` (COMP-007) | `monthly` (founder 2026-07-02, "supersedes COMP-007") | `PaywallScreen.js:54` vs `ProUpgradeScreen.js:99` — direct documented contradiction |
| Trial framing | "Try Pro free for 7 days" (store intro offer) | "Pro's free for the next 14 days" cardless + "another week free" store (`:448`); CTA "Start your free trial" | `PaywallScreen.js:185-187` vs `ProUpgradeScreen.js:448-449, :465` |
| Trial start mechanism | none — pure purchase | `cascade.startCascade()` grants 14-day cardless trial (`:230`), server-authoritative branch | `ProUpgradeScreen.js:221-267` |
| OAuth / account creation | none | full `OAuthButtons` Apple/Google + session poll + `completeUpgrade` (`:290-334`) | `ProUpgradeScreen.js:441-490` |
| Feature list | via `TierComparisonStrip` only | `PRO_PERKS` (4) + `TierComparisonStrip` + `FAQ_ITEMS` (5) | `PaywallScreen.js:228` vs `ProUpgradeScreen.js:418-503` |
| Review social proof | Play excerpt card (`pickPaywallExcerpt`) | none | `PaywallScreen.js:215-225` |
| Restore path | inline button → `restorePurchases()` | none on-screen (restore lives on ProGate/lock screens) | `PaywallScreen.js:141-165` |
| Dismiss behaviour | `goBack()` + `cta:dismiss` | `goBack()` + `trackCta('dismiss')`; two dismiss affordances | `PaywallScreen.js:84-90` vs `ProUpgradeScreen.js:407, :522` |
| Entry-source telemetry | older/coarser — `surface: 'paywall_screen'`, no source/can_trial/has_account; trigger param no caller sets | C2-instrumented — source, can_trial, has_account on impression; one trackCta helper for 7 cta types | `PaywallScreen.js:74-78` vs `ProUpgradeScreen.js:114-119, :125-130` |
| Tier/cascade awareness | none — always renders buy/try regardless of state | reads `tier`, `canStillTrial`, `PRO_BETA_ACTIVE`; branches trial vs buy vs beta-activate | `ProUpgradeScreen.js:80-81, :204-268, :444-471` |
| Lapsed/win-back handling | none | `preferWinback` via `route.params.fromWinback` (`:163`); success routes to Pro onboarding | `ProUpgradeScreen.js:163, :348-401` |
| Success state | none (just `goBack`) | full "You're Pro" screen + `resetFirstRun` setup routing | `ProUpgradeScreen.js:348-401` |

Shared plumbing (not drifted): both use `TierComparisonStrip`, `BillingPeriodSelector`, `ModalHeader`, `usePlayPrices`, `skuFor`, `cascade.payAt`/`confirmPurchase`, `playBilling.purchasePackage`, the `SubscriptionPolicy` link, and the same `paywall_shown`/`paywall_tapped_cta` event names (`ProUpgradeScreen.js:148`: "Mirrors PaywallScreen.handlePay so there's one purchase path").

### 4.3 Ownership map

All live upgrade flows land on ProUpgrade; none land on PaywallScreen.
- Onboarding/first-run: ProUpgrade success state drives `resetFirstRun` into Pro setup (`ProUpgradeScreen.js:355-364, :204-267`).
- Pro-gated taps: ProGate sheet → `'pro_gate'` (`ProGate.js:88`); `ProLocked` → `'pro_gate'` (`:233`); food-diary teaser → `'pro_gate_teaser'` (`:223`). `withProGuard`/`withReadOnlyProGuard` (`ProGate.js:279, :315`) render `ProLocked`, never Paywall.
- Differential trigger: `differentialPaywall.js` → `DifferentialBadge` (via `AttentionCard.js:153`) → `HomeScreen.js:1672` → ProUpgrade with `differential_${trigger}` — despite `PaywallScreen.js:4` claiming the badge opens Paywall. Guard test pins this: `differentialBanner.guard.test.js:148`.
- Lapse/win-back/settings: `SubscriptionScreen.js:135` (lapsed) → ProUpgrade with `fromWinback`; `SubscriptionScreen.js:131` (mid pro-trial) → CascadeGate day14; `SettingsAccountScreen.js:39` → ProUpgrade.
- The only state fork is `SubscriptionScreen.handleUpgrade` (`:123-137`): `pro_trial` → CascadeGate, else → ProUpgrade. No flow forks toward Paywall.

### 4.4 Test surface (re-anchoring cost of any consolidation)

PaywallScreen pinned by: `src/__tests__/paywallTelemetry.test.js:82, :116-128` (mounts it; pins `paywall_shown` once per mount); `src/__tests__/tier-screens-mount.test.js:216-240` (three mount tests); `src/screens/__tests__/paywallExcerpts.test.js` (excerpt module, Paywall-only consumer); `shareCopyPolish.guard.test.js:65`; `cp10BatchGLane1LiveTheme.test.js:290`; `BillingPeriodSelector.test.js:53` (lists it among 3 surfaces sharing the selector); `differentialBanner.guard.test.js:148` (actively enforces Paywall's non-reachability from Home).

ProUpgradeScreen pinned by: `proUpgradeTelemetry.guard.test.js` (whole C2 file — impression shape, trackCta helper + 7 cta names, sheet-events-stay-in-playBilling, restore enrichment, no-new-event-names, per-file sourced-call-site counts); `ProUpgradeScreen.oauth.guard.test.js`; `tier-screens-mount.test.js`; `navigationTargets.guard.test.js:75-85` (pins registration in every stack); `differentialBanner.guard.test.js:139-148`; `AthleteProfileScreen.physiqueTile.guard.test.js:93`; `activationBanner.guard.test.js:46`; `cp10BatchGLane1LiveTheme.test.js`; `BillingPeriodSelector.test.js:53`.

### 4.5 DifferentialBadge.js

Consumed only by `AttentionCard.js:32/:153`, rendered by `HomeScreen.js:1654-1682` in the attention banner slot; a guard test confirms its removal from CoachOutputScreen (`differentialBanner.guard.test.js:53-55`). Its CTA routes to ProUpgrade (`HomeScreen.js:1671-1672`), not Paywall, though its doc comment (`:30`) and PaywallScreen's header (`:4`) still say otherwise (stale). CTA copy: `'Try Pro free for 14 days'` for `try_pro_14d`, else price CTA (`:61-63`); body copy from `LOCKED_COPY`/`LOCKED_COPY_NO_TRIAL` (`differentialPaywall.js:49-67`, C1-amended). Impression dedup via module-level Set (`:26, :40-48`); the `paywall_shown` emit happens in HomeScreen (`:1666-1670`, `surface: differential_${trigger}`). No other production consumer.

### 4.6 Dead weight

PaywallScreen is effectively unreachable in production: zero call sites (registration + lazy import only, lead re-verified); the flow its header claims (DifferentialBadge) provably routes elsewhere and a guard test enforces that; registered in only one of five stacks so even a rogue navigate from any other tab would be silently dropped (the F4 bug class, `RootNavigator.js:431-434`); not feature-flagged — simply orphaned; params all fall back to defaults (`:46-54`) because no caller supplies them. Git history shows only cross-cutting sweep commits (theme, haptics, dynamic-type, copy polish, shared selector) since the differential-paywall era. CascadeGate is NOT dead weight (reachable from `SubscriptionScreen.js:131`).
