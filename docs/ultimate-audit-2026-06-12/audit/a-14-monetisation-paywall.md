# a-14 — Monetisation & paywall flow (internal audit, code-verified)

Audit only. No billing file was modified. All paths under `src/lib/payments/`
were read, never touched. Evidence is `file:line` against branch
`claude/admiring-bohr-2kb7pd`.

---

## 0. SCOPE & TL;DR

Volyume is a 2-tier app: **Free** (logbook + library + PBs + progress) vs
**Pro** (the coaching layer: weekly coach, food diary, nutrition targets, body
metrics, cardio). Gating is binary on `store.tier === 'pro'`
(`src/lib/proGate.js:28,39-53`; `PRO_BETA_ACTIVE = false` for production).
One purchasable product, two billing periods: **£4.99/month**, **£29.99/year**
(`src/lib/payments/catalogue.js:32-49`), product IDs `pro_monthly` /
`pro_annual` (unchanged, sacred). Annual is the honest ~50% saving
(`annualSavingsPct()` computes `round((1 − 29.99/59.88)×100) = 50`,
`catalogue.js:100-105`).

The monetisation surface is unusually **honest and low-pressure** for the
category — but three things ship **dark/inert** today (social-proof block,
win-back store offer, and the price figure until Play responds), and there is
**one free-tier honesty defect inherited from a-12** (the "Go Pro for up to
three [partners]" upsell sells a UI that is not built).

---

## 1. WHAT — the full free → trial → paid → lapsed lifecycle as implemented

### 1.1 Trial grant (14 cardless in-app days)
- The trial is granted at the **Article 9 health-consent step of onboarding**,
  not at any purchase surface: `Article9ConsentScreen.js:105-117` awaits
  `cascade.startCascade()`.
- `startCascade()` (`cascade.js:105-161`) calls the server `start_cascade` RPC,
  then mirrors `tier='pro'` + `trialState='pro_trial_active'` into the local
  store (`:125-136`) so the navigator routes the user into Pro setup, and lays
  the trial-end reminders + the COMP-023 day-3 value notification
  (`:146-158`). Idempotent (no-ops once started).
- Entitlement resolves from `trial_state` via `_resolveTier`
  (`proGate.js:39-53`): `pro_trial_active` / `paid_pro` (and legacy
  `complete_*`) → `pro`; `free` / `cascade_expired` / `unstarted` → `free`.
- `canStillTrial(profile)` is **true only when `trial_state === 'unstarted'`**
  (`cascade.js:436-439`) — the trial entitlement is one-time, which is what
  drives the honest "Try Pro free" vs "Get Pro" CTA fork everywhere.

### 1.2 Trial mechanics & cascade gates (D12 / D14)
- `daysRemaining(profile)` reads `proTrialEndsAt` and floors to whole days
  (`cascade.js:446-460`).
- Two **cascade-gate notifications** are scheduled off the real trial-end date
  (`scheduler.js:293-337`): one at **end − 2 days** and one **on the cutover
  day** at 10:00 local. Constants are legacy-named `NOTIF_ID_CASCADE_19/21`
  but anchored to the 14-day end, so they fire **≈ D12 and D14** — matching the
  mandate's "D12/D14" framing. They are top-priority pushes that evict lower
  pushes rather than be dropped (`:323-327`).
- Expiry is **server-cron driven** for trials. `autoDowngrade('free')`
  (`cascade.js:354-370`) is the only trial-end transition in the 2-tier model;
  the old Complete→Pro step is a stub returning an error (`skipToPro`,
  `:350-352`).
- The trial-end gate **can also be entered interactively** via
  `CascadeGateScreen` variant `day14` (legacy synonyms `day21`/`day28` all
  render the same surface, `CascadeGateScreen.js:62-75`): "Your Pro trial is
  winding down" → "Stay on Pro" (purchase) vs "Drop to Free".

### 1.3 Trial → paid conversion (the purchase)
- Three purchase surfaces share one path: **PaywallScreen**,
  **ProUpgradeScreen**, **CascadeGateScreen**. Each calls
  `playBilling.purchasePackage(sku.id)` → `cascade.payAt('pro', ref, surface)`
  (optimistic in-memory unlock, `cascade.js:170-185`) → **awaited**
  `cascade.confirmPurchase({ purchaseToken, subscriptionId })`
  (`cascade.js:211-242`) which invokes the server Edge Function
  (`play-billing-rtdn` on Android / `app-store-verify` on iOS) and pulls the
  authoritative tier. A confirm failure surfaces a "finishing activation"
  message rather than being swallowed (`PaywallScreen.js:87-93`,
  `ProUpgradeScreen.js:92-98`, `CascadeGateScreen.js:138-144`).
- The client **never self-grants paid** Pro: `payAt` is optimistic only; the
  server (RTDN after Play verification) writes the real tier
  (`cascade.js:163-169`).
- The **7-day Play intro free trial** is a separate store-subscription phase
  configured per-product in Play Console, selected at purchase time via
  `selectOfferToken` (prefers a free pricing phase, `playBilling.js:130-150`).
  So the journey is **14 cardless in-app days → (subscribe) → 7-day Play
  free trial → paid**. Purchase surfaces correctly disclose the **7-day**
  figure, never 21 (`PaywallScreen.js:152-172`, comment `:152-158`).

### 1.4 Paid → lapsed
- Authoritative revocation is the **Play RTDN Pub/Sub push** → server writes
  `free`. Until that is wired, a **client safety net** runs on launch for
  `paid_pro` users: `reconcilePaidEntitlement` (`cascade.js:274-330`) reads
  Play directly; an authoritative `active:false` → `cancel('client_reconcile')`
  downgrade. There is a 24-hour offline grace
  (`PAID_ENTITLEMENT_OFFLINE_GRACE_MS`, `:250`); past grace with no verifiable
  entitlement it locks down locally and self-heals on the next online launch.
- Lapse / cancel / refund all route through `upgrade_tier('free', reason)`
  (`cancel`/`graceLapsed`/`refunded`, `cascade.js:372-403`) and fan out
  `subscription_cancelled` telemetry (`:96-101`).

### 1.5 Lapsed → win-back / restore
- A **churn episode** opens on the first authoritative client-confirmed lapse
  (`lapseDetect.isAuthoritativeLapse`, `lapseDetect.js:31-36`; never on a stale
  lockdown or a trial downgrade). `winbackState.js` enforces **one win-back per
  episode** and an **absolute floor of one per 180 days**
  (`winbackState.js:38-68`).
- A single **+30-day win-back notification** is laid (or shifted to a stated
  break window of 30/75/60 days, `winbackState.js:42-58`). Copy is numbers-led,
  no fake urgency / discount / shame (`winbackContent.js:42-71`).
- **PostLapseSheet** (`PostLapseSheet.js`) surfaces once per episode on first
  open after lapse — a held-seat reassurance ("Everything you logged is
  saved… Training, plans and progress stay free.") plus the optional reason
  question if not already captured.
- **Restore purchases** re-reads Play and re-writes tier through the shared
  `restorePurchases()` module (`restore.js`), wired on PaywallScreen
  (`:113-137`) and SubscriptionScreen (`:88-114`). One implementation, no
  inline duplicate (M-1 note, `PaywallScreen.js:118-119`).

---

## 2. WHERE — every paywall trigger / entry point, with context & copy

| # | Surface | File:line | Trigger / placement | Copy / CTA |
|---|---------|-----------|---------------------|-----------|
| 1 | **ProLocked full-screen guard** | `ProGate.js:91-127`; wraps 11 routes in `RootNavigator.js:149-162` | Free user lands on any Pro route (Weekly check-in, Nutrition targets, Body metrics, Coach output, Pro goal setup, Plan update, Coaching reminders, **Food diary**, Cardio×2) | "{feature} is part of Pro" + held-seat line + "Upgrade to Pro" → `ProUpgrade` |
| 2 | **ProGate inline lock + sheet** | `ProGate.js:22-85` | Any Pro child wrapped inline; tap lock chip → bottom sheet | "This is part of Pro: weekly coaching, the food diary, and your body metrics." → `ProUpgrade` |
| 3 | **DifferentialBadge** (Move #4) | `DifferentialBadge.js`; rendered `CoachOutputScreen.js:1770-1796` | Free + 2-of-3 weeks off-target adherence + one of 4 locked engine contexts (`differentialPaywall.js:102-152`) | Context-specific, e.g. "Your bench has stalled for three weeks… Try Pro free for 7 days." → `Paywall` |
| 4 | **PaywallScreen** | `PaywallScreen.js` | Reached from DifferentialBadge "pay" tap | "Pro is the coach" + review block (dark) + annual-first toggle + "Try Pro free for 7 days" / "Get Pro for £X" |
| 5 | **ProUpgradeScreen** | `ProUpgradeScreen.js` | From Home (×2), You, Settings, ProGate, ProLocked | "Go Pro — Free is the logbook a coach would write in. Pro is the coach who writes back." 4 perks; account-create + trial/subscribe fork |
| 6 | **CascadeGateScreen** | `CascadeGateScreen.js` | Trial-end gate (`day14`), payment-failure overlay, first-time `upgrade` | "Your Pro trial is winding down" / "We couldn't take your payment" |
| 7 | **Home — free weekly coach card footer** | `HomeScreen.js:1098-1122` | Free user with a weekly coach one-liner | "Pro reads the full story" → `ProUpgrade` |
| 8 | **Home — Pro teaser card** | `HomeScreen.js:1440-1466` | Free + `totalSessions >= 3`; dynamic insight copy | e.g. "{lift} progressed this week. Pro builds on it." → `ProUpgrade` |
| 9 | **TodaysPlateTeaser** (show-then-sell) | `TodaysPlateTeaser.js`; mounted in `ProLocked` when `feature === 'Food diary'` (`ProGate.js:96-100`) | Free user hits the food-diary lock | Static example day "A DAY ON PRO / Your plate, sorted." — read-only, nothing tappable |
| 10 | **SubscriptionScreen** | `SubscriptionScreen.js` | You → Subscription | Plan state, Upgrade / Stay on Pro / Restore / Cancel |
| 11 | **You — ProBadge** | `YouScreen.js:21,93` | Inline Pro badge for a Pro user | badge only |

Trigger contexts for the differential badge are training/engine signals only —
the safety-adjacent distress contexts (`extreme_soreness`, `energy_crash`) were
**deliberately removed** so the app never monetises distress
(`differentialPaywall.js:21-28,68-76`).

---

## 3. FEEL — pressure, honesty, newbie vs athlete, value framing

**Pressure level: deliberately low.** No countdown timers, no fake discounts, no
"X people bought this", no manufactured scarcity anywhere in the purchase or
win-back copy (`winbackContent.js` header; `CancelReasonSheet.js:8-16`). The
cancel path is explicitly anti-dark-pattern: the store handoff is **always
enabled and never gated** on answering the reason question
(`CancelReasonSheet.js:5-9,136-142`), and the screen even surfaces Google Play's
**pause** option as an alternative to cancelling (`CancelReasonSheet.js:122-127`).

**Honesty: strong, with named exceptions.**
- The trial CTA forks on real entitlement: `try_pro_14d` → "Try Pro free for 7
  days"; once used → "Get Pro" (`differentialPaywall.js:145-151`,
  `DifferentialBadge.js:42-44`). The code comments repeatedly refuse to promise
  a 14-day length on a Play purchase surface where Google only honours 7
  (`differentialPaywall.js:42-47`, `DifferentialBadge.js:36-38`).
- Prices are **always Google Play's localised figure** via `usePlayPrices`;
  the catalogue's £4.99/£29.99 are reference-only and never shown
  (`catalogue.js:18-26`, `PaywallScreen.js:140-150`). Until Play responds the
  UI shows a "…" placeholder, never a hardcoded fallback — so a non-UK user is
  never quoted the wrong currency.

**Price-sensitive newbie experience:** Free is genuinely usable (training,
logging, library, PBs, progress all free). The first paywall a newbie meets is
soft (Home teaser only after 3 sessions, `HomeScreen.js:1442`), and the
food-diary lock leads with the **value-visible TodaysPlateTeaser** before the
ask (show-then-sell, `ProGate.js:96-100`). Annual is pre-selected and badged
"Save 50%" but **monthly stays fully visible as the escape hatch**
(anchor-don't-hide, `PaywallScreen.js:48-49,212-235`).

**Committed-athlete experience:** the differential badge is the athlete-grade
lever — it only fires on real plateau/deload/missing-TDEE/block-end signals from
their own data, with a specific written reason, not a generic nag
(`differentialPaywall.js:48-66`).

**Coach-in-your-pocket value framing is present and consistent:** "Pro is the
coach" (`PaywallScreen.js:185`), "Free is the logbook a coach would write in.
Pro is the coach who writes back." (`ProUpgradeScreen.js:338-340`), and the
core promise — *reads training + weight + food together, adjusts weekly, with a
written reason for every change* (`PaywallScreen.js:186-188`,
`ProUpgradeScreen.js:18-23`). This is the strongest, most differentiated part of
the monetisation copy.

---

## 4. GAPS / FRICTION (code-verified)

1. **Social-proof block ships DARK.** `PAYWALL_EXCERPTS` is an intentionally
   empty frozen array (`paywallExcerpts.js:37-41`); `pickPaywallExcerpt` returns
   `null`, so the review card never renders (`PaywallScreen.js:146,193-203`).
   The founder must fill ≥3 verified Play reviews against the honesty contract
   (`paywallExcerpts.js:10-32`) for "proof-before-price" to exist. **Current
   state: no social proof on the paywall.** This is the COMP-07 item flagged in
   the mandate — confirmed still empty.

2. **Win-back store offer (COMP-025-B) is INERT by fallback.** The resubscribe
   path asks for a Play offer tagged `winback` (`playBilling.js:97-101,
   130-150,622-636`), but `winbackOfferTokens` stays empty until the founder
   configures that offer in Play Console, so every win-back resubscribe is a
   **normal-price purchase** today (`ProUpgradeScreen.js:79-81`,
   `SubscriptionScreen.js:126-129`). Correct-by-design (can't break a normal
   purchase) but the win-back has **no actual incentive** until configured.

3. **Free-tier honesty defect — the 3-partner upsell (a-12 confirmed).**
   `PartnerScreen.js:211` tells Free users "You can have one partner on Free.
   **Go Pro for up to three.**" But a-12 verified the 3-partner UI is **not
   built**: `usePartners` only ever surfaces one primary partnership, so a Pro
   user with 2–3 partners can still only SEE one
   (a-12 §4, `a-12-partner-social.md:271-278`). This sells an unbuilt Pro
   capability — the one genuine upsell-honesty issue in the monetisation
   surface. Should be reworded or gated until the list UI exists.

4. **Price figure is absent on first paint** (PLAY-002, by design). Every
   purchase surface shows "…" for the price and a price-free CTA until Play
   Billing responds (`PaywallScreen.js:147-172`, `CascadeGateScreen.js:105-108`,
   `SubscriptionScreen.js:155`). Honest, but a momentary friction: the user sees
   a paywall with no number until the store round-trips. In the **stub/dev or
   native-module-missing** environment, prices never load and `purchasePackage`
   throws "provider not injected" (`playBilling.js:754-756`) — i.e. nothing is
   purchasable until a real build ships.

5. **CascadeGate period order is inconsistent with the others.** PaywallScreen
   and ProUpgradeScreen put **Annual first / pre-selected** (COMP-07,
   `PaywallScreen.js:212-235`), but CascadeGateScreen renders **Monthly first**
   and defaults to monthly (`CascadeGateScreen.js:98,239-263`). A user who
   reaches the trial-end gate sees the *less* revenue-optimal and
   inconsistent ordering. Minor, but a real divergence from the locked annual-
   first decision.

Lesser notes (mention, do not fix — billing is sacred):
- `CascadeGateScreen.handleSkip('pro')` still calls the **removed** `skipToPro`
  stub (`CascadeGateScreen.js:177-183` → `cascade.js:350-352` returns an error);
  dead branch in the 2-tier model, harmless because no live CTA targets it.
- The differential badge passes a legacy `pricingWindow`/`lockedInPriceTier`
  through (`CoachOutputScreen.js:1773`, `DifferentialBadge.js:20`) that is
  unused — leftover from the retired escalating-price windows.

---

## 5. SURFACE INVENTORY

**Paywall / monetisation surfaces: 11** (table in §2).
- Full-screen Pro locks: **1 guard wrapping 11 routes** (`RootNavigator.js:149-162`).
- Inline Pro lock + sheet: **1** (`ProGate.js`).
- In-context conversion cards: **3** (Home weekly-coach footer, Home Pro teaser,
  DifferentialBadge).
- Dedicated purchase screens: **3** (Paywall, ProUpgrade, CascadeGate).
- Show-then-sell value preview: **1** (TodaysPlateTeaser).
- Management / lifecycle: **1** (SubscriptionScreen) + **2 churn sheets**
  (CancelReasonSheet, PostLapseSheet) + **1 win-back notification**.
- Inline badge: **1** (ProBadge).

**Lifecycle states (cascade):** `unstarted` → `pro_trial_active` →
{`paid_pro` | `free`/`cascade_expired`} with legacy `complete_*` mapped to Pro
(`cascade.js:416-428`, `proGate.js:39-53`).

**Shipping dark / inert today: 3** — social-proof excerpts (empty array),
win-back store offer (unconfigured), live price figure (until Play responds /
real build).

**Honesty defects: 1** — the 3-partner Pro upsell (`PartnerScreen.js:211`)
sells an unbuilt UI.
