# COMP-025 — Cancellation-reason capture + 30-day win-back

> Implementation blueprint, round 2 of the 2026-06-10 audit. Agent charter:
> `impl-00-shared-brief.md`. Approved seed: `../competitive-audit-03-master-proposals.md`
> (COMP-025, impact 5 / effort 3). Evidence base:
> `../competitive-audit-01-monetisation-research.md`. No code changed.

---

## 0. Constraint reality check — where cancellation actually happens

Subscriptions cancel **in the store, never in-app**. Verified against source:

| Moment | Code ground truth | What the app can do |
|---|---|---|
| **Cancel intent, in-app** | `src/screens/SubscriptionScreen.js` `handleCancel` (lines 67–91): confirm alert → `Linking.openURL` to Play/App Store subscription settings. The comment is explicit: "Apple + Google both require their own UI for actual cancellation. We can't cancel server-side." | The **only deterministic pre-cancellation touchpoint**. One optional question fits here, before the store handoff. |
| **Cancel with time remaining** | Play RTDN `SUBSCRIPTION_CANCELED (3)` → deliberate **no-op** (`supabase/functions/play-billing-rtdn/index.ts` line 19, 536); Apple `DID_CHANGE_RENEWAL_STATUS` → no-op (`app-store-notifications/index.ts` line 24). The app never learns auto-renew was switched off until expiry. | Nothing today. (Handling type 3 to pre-arm the win-back is a possible later extension; **not v1** — it adds server writes for no v1 behaviour change, since the entitlement is unchanged until expiry.) |
| **Lapse (entitlement ends)** | RTDN `SUBSCRIPTION_EXPIRED (13)` / Apple `EXPIRED` → `upgrade_tier_for_user('free','user_cancelled')` → **`tier_history` row** (reason `user_cancelled`, `occurred_at`) (migration 030 lines 63–77). Client learns at next launch/foreground: `refreshTierFromCloud` flips `store.tier` pro→free, or `reconcilePaidEntitlement` in `src/lib/payments/cascade.js` (lines 269–325) reads Play directly and calls `cancel('client_reconcile')`. | **Post-lapse first-app-open** is detectable client-side: tier transition pro→free where the previous `trial_state` was `paid_pro` (distinguishing it from the day-21 trial downgrade, which has its own notification pair in `scheduler.js` lines 248–331). |
| **Not a cancel** | `ON_HOLD`/`IN_GRACE` → payment-failure push only; `reconcilePaidEntitlement`'s **local stale lockdown** (`stale_no_provider` / `stale_read_failed`) is an *unverified* lapse that self-heals. | Neither may ever trigger the reason sheet or win-back. Only a **server-confirmed** `user_cancelled` counts. |

Consequence: reason capture needs **two moments** (in-app intent + post-lapse
open), because many users cancel directly in store settings and never pass
through `handleCancel` at all. The win-back anchors on the `tier_history`
`user_cancelled` row — the one authoritative churn timestamp the system has.

---

## 1. Best-in-market bar

1. **RevenueCat Customer Center** — the codified version of exactly this
   pattern: in-app "manage subscription" → one-screen cancellation survey →
   (optionally) an answer-keyed promotional offer → clean handoff to the
   native store sheet. If no matching offer exists it "bypasses the survey
   and proceeds with the user's requested action" — never blocks the exit.
   ([RevenueCat Customer Center docs](https://www.revenuecat.com/docs/tools/customer-center),
   [promo-offer config](https://www.revenuecat.com/docs/tools/customer-center/customer-center-promo-offers-apple),
   [launch post](https://www.revenuecat.com/blog/company/introducing-customer-center/), accessed 2026-06-10.)
   **The single best reference**: it is the only widely deployed,
   store-policy-vetted implementation of pre-handoff reason capture.
2. **Apple native win-back offers** (WWDC 2024, iOS 18 / StoreKit 2) —
   eligibility configured in App Store Connect "based on how long they were
   paid subscribers and when their subscriptions ended"; surfaces
   automatically in the App Store, the user's Manage Subscriptions page
   (iOS 14.3+), and in-app via the StoreKit Message API / win-back sheet
   (iOS 18+). Zero-friction redemption because the system owns it.
   ([App Store Connect help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-win-back-offers/),
   [StoreKit docs](https://developer.apple.com/documentation/storekit/supporting-win-back-offers-in-your-app),
   [WWDC24 session 10061](https://developer.apple.com/videos/play/wwdc2024/10061/).)
3. **Google Play offer model + Resubscribe** — offers on a base plan with
   **developer-determined eligibility** ("you decide the eligibility logic in
   your app. Examples include… win-back offers for lapsed subscribers"),
   selected via offer tags through the Billing Library; plus the Play-native
   Resubscribe path within 12 months of expiry.
   ([Play Billing subscriptions docs](https://developer.android.com/google/play/billing/subscriptions),
   [Play Console help](https://support.google.com/googleplay/android-developer/answer/12154973),
   [Google Play win-back guidance](https://medium.com/googleplaydev/how-to-win-back-subscribers-who-cancel-9960731adeb) — direct fetch 403, search-extract only.)
4. **AllTrails' recovery playbook** (round-1 cited, monetisation research §2.4)
   — the tonal benchmark: acknowledge plainly, give generously, move on. No
   pleading.
5. **Play's native subscription pause** (RTDN type 10 already mapped in the
   webhook) — the structural answer to "temporary break": the store itself
   offers pause instead of cancel on Android
   ([Play Billing subscriptions docs](https://developer.android.com/google/play/billing/subscriptions)).

Category data the design must respect: annual reactivation is **5 %**,
monthly churners return at **4× that rate** (12 % within a year); targeted
win-back discounts produced **~25 % higher reactivation** for specific
segments ([RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/),
[9to5Mac summary](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/) —
report page 403s to direct fetch; figures triangulated, consistent with the
round-1 research). Fitness churn reasons are already benchmarked: motivation
38 %, free alternatives 25 %, cost 18 %, personalisation 12 %, technical 7 %
([RetentionCheck](https://retentioncheck.com/churn-benchmarks/fitness-apps),
round-1 cited) — the option set below maps onto these.

## 2. What fails — anti-patterns by name

- **The cancel maze / "roach motel".** FTC found 76 % of subscription
  services use at least one dark pattern to obstruct cancellation; Amazon's
  internal "Iliad" Prime cancel flow ended in a **$2.5 bn FTC settlement
  (September 2025)**. The FTC's click-to-cancel rule was vacated on
  procedural grounds (8th Cir., July 2025) but ROSCA/Section 5 enforcement
  continues ([FTC press release](https://www.ftc.gov/news-events/news/press-releases/2021/10/ftc-ramp-enforcement-against-illegal-dark-patterns-trick-or-trap-consumers-subscriptions),
  [TechCrunch on the FTC study](https://techcrunch.com/2024/07/10/ftc-study-finds-dark-patterns-used-by-a-majority-of-subscription-apps-and-websites/),
  [Coulson PC summary](https://www.coulsonpc.com/coulson-pc-blog/dark-patterns-ftc-click-to-cancel-rule)).
  **UK-specific and binding for Volyume:** the DMCC Act 2024 subscription
  regime (now expected in force **autumn 2026**) requires exit to be "as
  easy as to join" ([Hogan Lovells](https://www.hoganlovells.com/en/publications/uk-subscription-law-shakeup-new-rules-pushed-to-autumn-2026),
  [Bird & Bird](https://www.twobirds.com/en/insights/2026/uk/new-uk-legislation-to-mean-stricter-rules-for-subscription-services),
  [GOV.UK consultation response](https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version)).
  Apple and Google police the same boundary: both stores own the actual
  cancellation UI precisely so apps cannot gate it; an app that inserts
  mandatory steps before the store link invites rejection and regulator
  attention. **Design rule: the question is optional, skippable in one tap,
  and the store link is never conditional on answering.**
- **Confirmshaming.** Guilt-copy buttons ("No, I hate progress") are the
  most-named dark pattern in cancel flows. Duolingo's guilt voice works only
  as a brand character built over years and is the opposite of Volyume's
  locked coaching voice (no shame, no hype) — not transferable
  ([Deconstructor of Fun on Duolingo's push playbook](https://duolingo.deconstructoroffun.com/mechanics/notifications)).
- **Survey bloat.** Exit-survey practice converges on a single
  multiple-choice question with minimal options + free-text "other";
  cancelling customers abandon anything longer
  ([Chargebee exit-survey guide](https://www.chargebee.com/blog/customer-exit-surveys/),
  [Chargebee cancellation surveys](https://www.chargebee.com/blog/cancellation-survey/),
  [Funnelfox cancellation-flow examples](https://blog.funnelfox.com/cancellation-flow-examples/)).
  ProsperStack puts ~6 predefined reasons as the SaaS norm; mobile sheets
  should run leaner (5 + skip).
- **The desperate drip.** Repeated "we miss you" pushes fatigue the channel
  and brand: effective lifecycle messaging is intent-aligned and rationed
  (Headspace's Braze-driven re-engagement worked by sending *fewer, righter*
  messages — +109 % week-1 retention; Phiture's retention guidance says hold
  urgency back) ([Phiture](https://phiture.com/mobilegrowthstack/app-user-retention-strategies/)).
  One win-back, then silence, is the anti-desperation rule — and it is also
  what makes the one message credible.
- **Holding data hostage.** Oura/Whoop resentment (round-1) is about
  hostage-taking, not price. The lapse experience must visibly keep the
  user's data theirs.

## 3. User psychology

- **Moment of need:** a cancelling user wants *out*, fast. The respectful
  read: give them the door, ask one question on the way, thank them either
  way. A lapsed user opening the app weeks later wants to know *what still
  works* — that is the moment to say "everything you logged is safe", not to
  pitch.
- **Effort budget:** reason capture costs one tap (or zero — skip). The
  win-back costs nothing: it arrives once, pre-loaded with their own
  numbers.
- **Habit loop:** free-tier logging (workouts, PRs, weigh-ins) continues
  after lapse — the user keeps generating exactly the data that makes the
  win-back personal. Cue: the +30-day notification. Reward: their own
  numbers, instantly visible.
- **Emotional safety:** "Taking a break" must be a first-class answer, not a
  failure state. No guilt copy anywhere. Win-back suppressed entirely while
  an ED/wellbeing flag is open (silence is the respectful behaviour; see §5).
- **Trust mechanics:** the cancel sheet states plainly what happens
  ("features until period end, then Free; your data stays"). The win-back
  shows working: real counts, no manufactured urgency, no fake discounts.
- **Word-of-mouth surface:** "I cancelled and it just… let me. Then a month
  later it told me I'd logged 14 sessions since and everything was still
  there." Respectful exits are quietly tellable; the category's horror
  stories make courtesy remarkable.

## 4. The Volyume implementation

### 4a. Reason capture — two moments, one question, asked once per episode

**Moment 1 (primary): pre-store-handoff, SubscriptionScreen.**
Replace the `handleCancel` `appAlert` with a bottom sheet (house sheet
pattern, cf. `ProGate`'s upgrade sheet):

- Title: **"Before you go — what's the main reason?"**
- Sub-line: "Optional. It helps us decide what to build."
- Five option rows (single-select, 44pt, tap = select + immediately enables
  nothing extra — no second step):
  1. "It costs too much" → `price`
  2. "I wasn't using it enough" → `not_using`
  3. "It's missing something I need" → `missing_feature`
  4. "I'm switching to another app" → `switching`
  5. "I'm taking a break from training" → `temporary_break`
- Free-text: a single optional field appears only for `missing_feature` /
  `switching` ("What was missing?" / "Which one?" — 120 chars). Routed to the
  existing `user_feedback` table (migration 013), **never** to telemetry.
- Primary button (always enabled, always visible without scrolling):
  **"Continue to Google Play"** / **"Continue to the App Store"** → the
  existing `Linking.openURL`. Secondary: **"Keep my subscription"** (plain,
  no guilt). Answering is never required to proceed.
- Keep the current factual disclosure line: "You'll keep your features until
  the current billing period ends. Your training history, food log and
  check-ins all stay."
- **No counter-offer in the cancel path (v1).** Customer Center's
  answer-keyed offers are effective, but a discount surfaced only when
  someone tries to leave reads as a penalty for loyalty and is the top
  complaint pattern in cancel-flow teardowns ([Funnelfox](https://blog.funnelfox.com/cancellation-flow-examples/)).
  The win-back offer comes later, via the stores' own mechanisms (§4c).

**Moment 2 (secondary): post-lapse first-app-open sheet.**
Trigger: client observes `store.tier` transition pro→free where the prior
`trial_state` was `paid_pro` **and** the new state is server-confirmed
(`refreshTierFromCloud` read or `cancel('client_reconcile')` succeeded) —
never on the local stale lockdown. Hook point: the same RootNavigator
foreground path that already calls `_reconcilePaidEntitlement` (line 118).
One sheet, once (AsyncStorage episode flag):

- Title: **"Your Pro subscription has ended"**
- Body: "Everything you logged is saved — training history, PRs, weigh-ins,
  food diary. Training, plans and progress stay free. You can export or back
  up everything any time in You → Data."
- Then the same single question + skip, shown **only if** no reason was
  captured in this episode (Moment 1 sets the flag).
- This sheet is the chosen "post-downgrade" host — **not** a persistent Home
  banner. The integration map offered either; a one-time sheet respects
  COMP-027's "one big thing" Home hierarchy and avoids a nagging churn
  reminder on every open.

Why both: Moment 1 has the highest fidelity but only covers in-app-initiated
cancels; store-settings cancels (common — both stores surface "cancel" in
account settings and in every receipt email) bypass the app entirely. Moment
2 catches those. Cancel-flow surveys answered in-flow see materially higher
response than post-hoc emails (the premise of Chargebee/Brightback-class
products; [Chargebee cancellation-flow examples](https://www.chargebee.com/blog/cancellation-flow/)).

**Storage:** new telemetry event `cancel_reason_captured`, payload
`{ reason: <enum>, surface: 'pre_store_handoff' | 'post_lapse_sheet' }` —
enum only, no PII, through the standard allowlist machinery: add to
`src/lib/telemetry/events.js` (Panel 5) + migration 072 extending the
`record_engine_telemetry` CHECK list (exact pattern of migrations
029/034/063, which require client list and server CHECK to stay in
lock-step). Works offline: rows land in local SQLite and push later via the
existing transport.

**Edge cases:** tapping "Continue to store" then not actually cancelling is
fine — the reason row is intent-signal, keyed to `surface`, and no win-back
fires unless a real `user_cancelled` lapse follows. Offline post-lapse
detection cannot occur (lapse is inherently a connected event) — no special
case needed. Trial-end downgrades (`auto_downgrade`) keep their existing
day-19/21 flow and **never** see this sheet or the win-back.

### 4b. The lapse experience — verified, and one honest gap

Verified behaviour today: gating is binary (`proGate.js`); Pro routes render
`ProLocked` full-screen and `ProGate` dims content to 35 % opacity behind a
lock chip — **there are no read-only states**. A lapsed user's food diary,
body-metrics charts and coach history become invisible, not read-only. What
keeps this short of hostage-taking: `SettingsDataScreen` (free, You → Data)
offers full-database backup and workout CSV export — "Your data is always
yours. Export or back up any time."

V1 keeps the binary gate (a read-only diary is a real feature with real
effort, and it half-exposes a Pro feature to free users — a founder gating
call, flagged in §9, not smuggled in here). V1 does two cheap things:

1. The post-lapse sheet's data-safety + export line (above).
2. One added line in `ProLocked`'s body copy: *"Everything you logged is
   saved, and will be exactly as you left it if you come back."* — turning
   every lock screen from a wall into a held seat.

### 4c. The win-back — one message at +30 days, their data as the hero

**Timing:** +30 days from the lapse (`tier_history` `user_cancelled`
`occurred_at`, mirrored client-side at detection). 30 days clears the
"immediately resubscribed elsewhere" window, lands within Play's 12-month
Resubscribe window and typical Apple win-back eligibility windows, and is
short enough that the user's own data recap is still warm.

**Mechanism (v1): local one-shot notification**, laid when the post-lapse
state is first detected, using the exact `scheduleCascadeGateNotifications`
pattern (`scheduler.js` lines 271–326): DATE trigger, quiet-hours shift,
idempotent re-lay. Re-laid on each app open during the lapsed window so the
counts stay fresh (local notifications bake content at schedule time).
Honest limitation: a user who never opens the app post-lapse never gets it.
Accepted for v1 because (a) quiet hours and notification prefs live only on
device — a server push cannot respect them (stated in
`sendPaymentFailurePush`'s own comment), and (b) the never-returning segment
is where an unsolicited push reads most like spam. A server-side worker
(migration 031 pattern + `send-push` + the `winback` data type) is the v2
extension if capture rates justify it.

**Content (house voice, numerals the hero):**
- Title: *"Still lifting. 14 sessions since March."*
- Body: *"Your trend data never stopped. Pro picks up exactly where it left
  off — and there's a returning offer waiting if you want it."*
  (Offer clause included only when §4c-store eligibility is confirmed.)
- Counts come from existing free-tier data: sessions via `getAllWorkouts`,
  PRs via the personal-bests queries — the same windowed machinery COMP-005
  parameterises (`getYearOfLiftsData` by window). If the user logged nothing
  since lapse, the recap falls back to the held-seat framing: *"Your 212
  sessions are saved. Pro picks up where it left off."* Never a zero, never
  a shame state.
- Tap → SubscriptionScreen (which shows the win-back offer when eligible).

**Store win-back offer integration (Phase B — billing-permission gated):**
- **Console config (founder ops, no code):** App Store Connect win-back
  offer on the Pro subscription (eligibility: any paid duration, lapsed
  ≤ 12 months); Play Console offer on the `pro` base plan tagged `winback`
  with developer-determined eligibility. Discount framing: a short
  returning-member price (e.g. 3 months at a reduced rate), never a
  permanent cut — targeted win-back discounts showed ~25 % higher
  reactivation ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/));
  Volyume's £4.99/£29.99 is already under-market (round-1 §3), so the recap
  carries the message and the offer is a nudge, not the pitch.
- **App surfacing (code, touches billing files — explicit founder
  permission required per CLAUDE.md before any edit):** Android —
  `queryProductDetailsAsync`, filter `offerTags` for `winback`, show only
  when locally lapsed; iOS — Apple surfaces eligibility automatically in
  the App Store/Manage Subscriptions (iOS 14.3+) with no code, in-app
  win-back sheet is iOS 18+/StoreKit 2. Product IDs `volyume_pro_monthly` /
  `volyume_pro_annual` are untouched — offers attach to existing products.
- iOS note: Apple may also surface the win-back offer system-side to users
  who never reopen the app — partially covering v1's local-notification gap
  for free.

**Single-shot rule:** one win-back notification per churn episode (episode =
one `user_cancelled` occurrence), enforced by an AsyncStorage flag keyed to
the lapse timestamp, plus an absolute floor of one win-back per 180 days
across episodes. After it fires: silence. No follow-up, no escalation. A
returning user starts a fresh slate.

### 4d. The "temporary break" path

If the captured reason is `temporary_break`, one optional follow-up chip row
on the same sheet (no extra screen): **"When do you think you'll be back?"**
— `In a month` / `2–3 months` / `Not sure`. The single win-back is then
scheduled for their stated return (+30 / +75 / +60 days) instead of the
default +30, and its copy opens with *"You said you might be back around
now."* Respecting a stated pause is the cheapest trust win in the whole
loop. Android bonus line on the cancel sheet for this reason only:
*"Google Play also lets you pause your subscription instead — it's in the
same settings screen"* (pointing at the store's own pause feature, RTDN type
10 already handled as a no-op; [Play docs](https://developer.android.com/google/play/billing/subscriptions)).
The stated-return answer is stored locally only (scheduling input, not
telemetry — the enum already captured the reason).

### Accessibility

Sheet rows ≥ 44pt; single-select radios announced via `accessibilityRole`;
the store-handoff button is first in focus order (the exit is never buried);
free-text field optional and labelled; notification copy under 178 chars so
it is never truncated on Android.

## 5. Whole-package integration

- **ED/wellbeing flags:** if `getOpenEdPatternFlag` is open at schedule or
  re-lay time, the win-back is **not laid** (and an already-laid one is
  cancelled on next open). The post-lapse data-safety sheet still shows
  (transactional, factual), but its recap counts are session counts only —
  never weight or calorie figures. The cancel sheet is unaffected (no
  emotional content).
- **COMP-005 (recaps):** the win-back recap reuses the windowed
  `getYearOfLiftsData` parameterisation; no second recap engine.
- **COMP-023 (day-3 trial moment):** shares the scheduler one-shot pattern;
  COMP-023 is pre-conversion, this is post-churn — no surface overlap, and
  both respect the same quiet-hours/prefs machinery.
- **COMP-007 (paywall social proof):** a returning user tapping the
  win-back lands on SubscriptionScreen → ProUpgrade; COMP-007's improved
  paywall is the second touch — no duplication.
- **COMP-027 (Home hierarchy):** deliberately nothing lands on Home. The
  post-lapse moment is a one-time sheet, not a banner.
- **Streamlining:** net-new surfaces = one sheet (replacing an existing
  alert) + one one-time sheet + one notification. Nothing permanent is
  added to any tab.
- **Free/Pro gating:** untouched. Nothing here exposes Pro features to free
  users or gates free features.

## 6. Retention & word-of-mouth mechanics

The loop: respectful exit → data keeps accruing on the free tier → one
personal, numeric win-back → store-native one-tap return. Each stage feeds
the next: the cancel sheet's honesty earns the right to send the win-back;
the free tier's continued utility writes the win-back's content. The
tellable moment is the contrast with the category ("it just let me cancel,
kept my data, and asked me back once with my own numbers"). Reason data
feeds the roadmap (`missing_feature` free-text is a direct build-list) and
prices future decisions — the round-1 gap (§5.4) this closes.

## 7. Beating the benchmark

RevenueCat's Customer Center is the bar, and it stops at the survey-plus-
counter-offer: a generic discount at the moment of leaving. This design
declines the leaving-moment discount (the part users resent), and instead
spends the goodwill where the data says it pays: a single, personally
numeric win-back at +30 days, carried by the user's own free-tier activity —
something Customer Center cannot do because it has no product data, and no
audited competitor does because none of them keeps a free tier this useful
after lapse. Combined with store-native offers (Apple surfaces eligibility
even to users who never reopen the app) and a hard single-shot rule, it is
both more effective per message and structurally incapable of becoming the
desperate drip that defines the category's worst examples.

## 8. Measurement (telemetry allowlist)

1. **Reason distribution + capture rate:** `cancel_reason_captured` by
   `reason`/`surface`, over `subscription_cancelled` (already live, Panel 5).
   Target: ≥ 40 % of churn episodes carry a reason within a quarter.
2. **Win-back funnel:** `notification_sent`/`notification_tapped` with a new
   `winback` category (Panel 6, existing events) → `paid_converted` with
   `source_surface: 'winback_notification'` (existing event + the existing
   source-surface convention in `_trackTransition`).
3. **Reactivation rate vs baseline:** share of `user_cancelled` users with a
   later `user_paid` within 90 days, vs the 5 % annual / 12 % monthly
   category baselines ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/)).
4. **Break-respect check:** reactivation rate of `temporary_break`
   responders vs others — validates the deferred-timing path.

## 9. Build notes

**Touched:** `src/screens/SubscriptionScreen.js` (sheet replaces alert);
new `src/components/CancelReasonSheet.js` (one component, both moments);
RootNavigator post-lapse detection (beside the existing
`_reconcilePaidEntitlement` call site); `src/lib/notifications/scheduler.js`
(+ `scheduleWinbackNotification` on the cascade-gate pattern, +
`CATEGORY.WINBACK`); `src/lib/telemetry/events.js` + migration 072
(`cancel_reason_captured`); free text → existing `user_feedback` table;
AsyncStorage episode flags. **Not touched in Phase A:** billing files,
product catalogue, webhooks, cascade RPCs, safety system.

**Phasing vs the approved effort score (3):**
- *Phase A* (capture both moments, lapse-experience copy, local win-back,
  telemetry): matches effort 3. No billing-file edits, no server changes
  beyond one additive telemetry migration.
- *Phase B* (store win-back offers: console config + Billing Library
  offer-tag surfacing + StoreKit 2 sheet): roughly +1 effort, **gated on
  explicit founder billing permission** (CLAUDE.md sacred rule — Phase B
  edits `src/lib/payments/*` and store consoles; product IDs unchanged).
- *Deferred, named, not built:* read-only lapsed diary (founder gating
  call); RTDN type-3 early cancel signal; server-push win-back worker.

**Risks:** (1) the one failure mode — any hint of friction before the store
link converts a courtesy into a dark pattern; mitigation is structural
(skip-first layout, store CTA always enabled, no counter-offer in the cancel
path) and policy-watched (DMCC autumn 2026). (2) Local-only win-back misses
never-returning users — accepted v1 trade-off, partially offset by Apple's
system-side offer surfacing. (3) Double-capture across moments — episode
flag prevents it. (4) Mistaking the stale-entitlement local lockdown for a
real lapse — guarded by requiring a server-confirmed transition.

---

*All external claims cited inline; RevenueCat report pages and the Google
Play Medium post return 403 to direct fetch — those figures are
search-extract-only, flagged, and consistent with the round-1 research
agent's independent citations. Sources accessed 2026-06-10.*
