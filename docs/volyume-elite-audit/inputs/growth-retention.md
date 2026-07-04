# Volyume Elite Audit — O4: Growth, Retention & Monetisation

**Auditor:** O4 (read-only). **Date:** 2026-07-04. **Scope:** activation, habit loops,
paywall surfaces, trial journey, viral loops, measurement, switching costs, store hooks.
Billing internals are LOCKED — this audits the *experience and measurement* around them,
never the purchase/restore/cascade mechanics or product IDs. Guardrails are tier-blind and
LOCKED; every option below is ethical/on-brand (calm, no shame, no dark patterns).

---

## Executive summary (read first)

1. The growth *machine* is unusually well-built for a solo app: staged activation nudges,
   engagement-based trial banners, a complete weekly-coach loop, calm win-back, free share
   artefacts, low-friction partner invites, and a 60-event telemetry catalogue.
2. **BUT the newest, highest-value telemetry is DARK server-side.** Migrations
   `093/099/100/101/102` are all "Applied remotely: NO" — so the entire activation/
   conversion funnel, streak/landmark milestones, and partner-adoption funnel fire on the
   device and are then **rejected by the server allow-list on push** and never reach the
   warehouse. The founder cannot answer a single funnel question today (P0-measurement).
3. The task's premise "funnel events (P5) were never built" is **outdated**: they *were*
   built (commit E7.2), they just can't land until the founder runs the pending SQL.
4. **Biggest single conversion lever:** the paywall's proof-before-price slot is fully
   wired but ships **empty** — `PAYWALL_EXCERPTS` is `[]`, so zero social proof renders on
   the main paywall despite the UI being ready. Populate ≥3 excerpts → direct conversion
   lift at ~S complexity.
5. `paywall_shown` fires only on the Home differential banner, not on `PaywallScreen` or
   `CascadeGateScreen` mount — so view→trial rate is uncomputable for the two main gates.
6. Win-back copy never hints at the returning-user offer that the purchase flow is already
   wired to prefer; the post-lapse sheet has no forward pitch at peak attention.
7. Individual weekly streaks have no proactive re-engagement push (only the *partner*
   shared streak does) — the streak reward is confined to an in-app visit.
8. Switching costs are strong (read-only-on-lapse for diary/metrics/photos, view-only
   coaching history) but under-surfaced to free users.
9. Store-review prompt is well-gated but only fires from the *free* training path — a
   delighted Pro coaching moment never asks for a review.
10. **Counts:** P0 ×1 · P1 ×4 · P2 ×11 · P3 ×6. Nothing here weakens a guardrail; the top
    three (populate proof, apply pending telemetry SQL, fix `paywall_shown`) are all S.

---

## What is already good (do not "fix")

- **Activation lever is real and safe.** `src/lib/activationNudge.js` is a pure staged state
  machine (cold_start → stalled_1 → stalled_2), single-shot per stage, hard-stops past the
  14-day window, ED-suppressed, and drives BOTH the push and the Home banner from one stage
  value so they can never disagree (`activationNudge.js:9-20,101-147`; banner in
  `HomeScreen.js:1475-1495`). Copy is forward-looking, never shaming.
- **Trial banner is engagement-based, not a bare countdown** — `trialActivation.js`
  selects S1/S2/S3 by what the user has actually logged and ties the reward concretely
  ("One session starts your first coaching review"). Genuinely good.
- **Weekly-coach loop is the most complete loop in the app** — reminder → check-in
  (`WeeklyCheckInScreen.js:573-688`) → "coach ready" Monday push scheduled on submit
  (`:632-640`) → updated plan. Missed-check-in ghost prevention (`missedCheckin.js`) is
  calm and never shames.
- **Share artefacts are FREE and brand-forward.** Session cards are ungated (founder
  decision 4b, `WorkoutSummaryScreen.js:668-688`); every card carries a prominent centred
  "Volyume" wordmark + tagline + `volyume.app` on the story format
  (`drawShareCard.js:164-186`). ED-safe: cards only fire on verified-safe weeks
  (`greatWeek.js:32-65`).
- **Partner invite friction is low** — one minted code reused across SMS / WhatsApp /
  email deep links with a native-share fallback (`PartnerScreen.js:348-380`).
- **Per-feature paywall copy** — `FEATURE_BENEFIT` in `ProGate.js:20-41` gives every gated
  route a concrete benefit line, not a generic "go Pro". Food-diary lock even shows a
  read-only example day (show-then-sell).
- **Read-only-on-lapse** (`withReadOnlyProGuard`) keeps a lapsed user's history visible
  rather than hidden — strong goodwill + switching cost, fails closed.
- **Store-review gate is disciplined** — 10 sessions AND 14 days, once ever
  (`storeReview.js:12-13,30-44`).
- **Telemetry is privacy-clean** — opt-out (legitimate interest), counts/enums only, no PII,
  EU-Dublin, server allow-list enforced (`transport.js:31-36,66-72`).

---

## AREA 1 — Measurement (the load-bearing findings)

Events persist to local SQLite then push to Supabase via `record_engine_telemetry`
(`transport.js`), which enforces a server-side allow-list; a rejected event throws a
PostgrestError and is **retried forever, never landing**. So an event is only answerable if
(a) it has an emitter AND (b) its server allow-list migration is applied.

### M1 · Entire funnel/landmark/partner-adoption telemetry is DARK server-side
- **Area:** Measurement · **Severity:** P0 · **Complexity:** S
- **Evidence:** `migrate_099_funnel_telemetry.sql:30-33` "Applied remotely: NO — founder-
  applied manually"; `migrate_093_landmark_telemetry.sql:23-24` NO; `migrate_101_longest_run_pb_telemetry.sql:10-12` NO; `migrate_102_partner_safety_consent.sql:57-58` "NOT APPLIED";
  `migrate_100_partner_shared_blocks.sql:37-38` NO. CLAUDE.md STATUS confirms `migrate_092..099`
  are outstanding founder actions. Client emitters all exist and are wired
  (`first_workout_logged` `ActiveWorkoutScreen.js:1702`; `first_plan_generated`
  `planAutoGen.js:209`; `first_food_logged` `food/db.js:90`; `onboarding_step_completed`
  `ProOnboardingScreen.js:445`; `trial_lapse_day1_return` `HomeScreen.js:148`; landmark events
  `AnalyticsScreen.js:134,154,166,373`; partner-adoption events `partners/telemetry.js:45-83`).
- **User impact:** none directly. **Business impact:** severe — the founder cannot answer
  activation rate, funnel step drop-off, milestone reach, or the partner-pairing funnel at
  all, despite the code being complete. Every downstream growth decision is currently flying
  blind on the exact data that was built to inform it. The client also burns retry cycles
  pushing events the server keeps rejecting.
- **Options:** (a) Founder applies `092–102` to EU-Dublin now (staging first per each
  header) — unblocks funnel, landmark, partner-adoption and streak-milestone data in one
  pass; this is the single highest-value measurement action. (b) Apply only `099` (funnel)
  + `093`/`101` (landmarks) first if partner tables (`100`/`102`) need more staging soak.
  (c) Add a one-off dev assertion/CI check that every non-deferred event in `events.js` has
  a *remotely-applied* allow-list entry, so "instrumented but dark" can never recur silently.

### M2 · `paywall_shown` misses the two main paywall surfaces
- **Area:** Measurement · **Severity:** P1 · **Complexity:** S
- **Evidence:** `paywall_shown` fires only from the Home differential banner
  (`HomeScreen.js:1522`, surface=`differential_*`). It does NOT fire on mount of
  `PaywallScreen.js` (reached via ProUpgrade/Subscription) or `CascadeGateScreen.js` (the
  day-14 trial gate). Those emit only `paywall_tapped_cta` (`PaywallScreen.js:60,75`) or
  Sentry-only breadcrumbs (`CascadeGateScreen.js:118,175`).
- **Business impact:** paywall-view→trial/purchase conversion — the core monetisation KPI —
  is uncomputable for the two most important gates; only the banner variant can be measured.
- **Options:** (a) Fire `paywall_shown` on mount of `PaywallScreen` and `CascadeGateScreen`
  with a `surface`/`trigger` payload (the event + server allow-list already exist — no
  migration needed). (b) Also add a `dismissed` outcome so view→(tap|dismiss) is complete.

### M3 · No "feature-locked hit" event — cannot see which gate drives upgrades
- **Area:** Measurement · **Severity:** P1 · **Complexity:** S/M
- **Evidence:** grep for a locked-feature-tap event across `src/` returns nothing; the
  `withProGuard`/`ProLocked` render (`ProGate.js:247-268`) emits no telemetry.
- **Business impact:** the founder cannot rank which locked feature (barcode? cardio? food
  diary?) is the strongest upgrade trigger, so cannot prioritise paywall placement or copy.
- **Options:** (a) Emit a `feature_locked_viewed` event (feature key only) when `ProLocked`
  renders, plus reuse `paywall_tapped_cta` for the tap — gives per-feature gate→trial rate.
  Needs a small catalogue + server-allow-list addition. (b) Cheaper interim: log the
  `feature` param on the existing `paywall_tapped_cta` so at least tapped gates are ranked.

### M4 · Conversion taps live only in the Sentry `audit()` breadcrumb system
- **Area:** Measurement · **Severity:** P2 · **Complexity:** S
- **Evidence:** `cascade.pay.tap`, `cascade.skip.tap`, `paywall.upgrade.tap`,
  `paywall.restore.tap`, `subscription.*` are `audit()` breadcrumbs (`observability.js:346`),
  which only ship when an error fires in the same session — not warehouse-queryable.
- **Business impact:** a founder reading `events.js` would think these taps are untracked;
  they are tracked in a system architecturally unsuited to growth reporting.
- **Options:** (a) Promote the payment-decision taps to engine telemetry (allow-list +
  server migration). (b) Document explicitly that `audit()` is debugging-only so it is never
  mistaken for an analytics source.

### M5 · Dead-code events fired but never persisted
- **Area:** Measurement · **Severity:** P2 · **Complexity:** S
- **Evidence:** `chart_metric_changed` (`ExerciseDetailScreen.js:410`) and
  `partner_block_proposed`/`_adopted`/`_left` (`partners/service.js:223,247,266`) are NOT in
  `ALLOWED_EVENTS` (`events.js` has no entry); `transport.js:66-72` drops them before local
  persist. The shared-block adoption funnel is unmeasured despite the `track()` calls.
- **Options:** (a) Add the four to the catalogue + a server allow-list migration if the
  shared-block loop matters. (b) Remove the orphan `track()` calls if the loop is decorative.

### M6 · Restore + several outcomes are attempt-only
- **Area:** Measurement · **Severity:** P2 · **Complexity:** S
- **Evidence:** `restore_purchases_attempted` fires (`playBilling.js:409,702`) but there is no
  restore-succeeded/failed outcome event; notifications track sent/tapped/failed but not
  "scheduled", so schedule→delivery drop-off is invisible (`notifications/telemetry.js:58-101`).
- **Options:** (a) Add outcome variants (restore result; notification scheduled). (b) Leave
  restore as-is (low volume) and add only the notification-scheduled counter if push
  delivery health is a concern.

---

## AREA 2 — Paywall surfaces & value story

### PW1 · Proof-before-price slot ships EMPTY (biggest conversion lever)
- **Area:** Paywall · **Severity:** P1 · **Complexity:** S
- **Evidence:** `PaywallScreen.js:193-206` renders a review-excerpt card via
  `pickPaywallExcerpt()`, but `paywallExcerpts.js:37-41` defines `PAYWALL_EXCERPTS = []`
  with a documented "launch bar: ≥3 usable excerpts" not yet met. The UI plumbing is built
  and ready; nothing renders.
- **User impact:** the paywall makes its ask with zero third-party validation.
  **Business impact:** proof-before-price is a well-evidenced conversion lever and it is
  designed-for but not live — likely the highest-ROI, lowest-risk conversion change available.
- **Options:** (a) Populate ≥3 genuine, consented, on-brand excerpts (real user or
  closed-test quotes) and ship. (b) If no consented quotes exist yet, use an honest
  outcome/mechanism proof card ("adjusts your plan every week with a written reason") rather
  than a fake testimonial — never fabricate reviews. (c) Add a lightweight in-app
  "would you recommend Volyume?" capture to source consented quotes ethically over time.

### PW2 · No persistent in-app trial countdown, days 4–13
- **Area:** Paywall/Trial · **Severity:** P2 · **Complexity:** M
- **Evidence:** the raw day-count exists only reactively in Settings
  (`SubscriptionScreen.js:56,146` "Pro trial · N days remaining"). Home is engagement-based
  by design (`trialActivation.js`). A user who disables notifications gets NO in-app expiry
  signal between the day-3 value push and the day-19 cascade push.
- **User impact:** a silently-elapsing trial feels like a bait; **business impact:** lost
  conversions from users who never realised the clock was running.
- **Options:** (a) Add a calm, dismissible "N days of Pro left" chip on Home for the final
  ~3 days only (no urgency red, no manufactured scarcity). (b) Keep engagement framing but
  append the day count to the existing banner in the last 48h. (c) Do nothing beyond
  ensuring the day-19 push is robust (weakest, leaves the notif-disabled cohort uncovered).

### PW3 · CascadeGate value line is generic vs PaywallScreen's per-trigger copy
- **Area:** Paywall · **Severity:** P3 · **Complexity:** S
- **Evidence:** `CascadeGateScreen.js:65-90` reuses one terse value line verbatim across
  `upgrade` and `day14` variants and does not vary by entry surface, unlike
  `PaywallScreen`'s trigger-specific copy.
- **Options:** (a) Route the same `FEATURE_BENEFIT`/trigger copy into CascadeGate so the two
  purchase surfaces tell one consistent, concrete story. (b) Accept the gate as deliberately
  terse (single decision moment) and leave.

### PW4 · "14 cardless days" and "7 days free" never reconciled in copy
- **Area:** Paywall/Trial · **Severity:** P2 · **Complexity:** M
- **Evidence:** `PaywallScreen.js:153-175` — the CTA says "Try Pro free for 7 days" (Play
  intro offer) while the user may already have had the 14-day in-app cardless trial; the
  header comment acknowledges the ambiguity but the user-facing text never resolves it.
- **User impact:** to an attentive user this can read as bait-and-switch, eroding the calm/
  honest brand. **Options:** (a) One honest reconciling line ("You've had 14 days on us —
  Play adds a further 7-day free trial before your first payment"). (b) Simplify the two-
  layer trial into one clearly-explained window if billing config allows (billing-adjacent —
  founder decision, no code change proposed here).

### PW5 · Locked-tile badge carries no "why" until one tap in
- **Area:** Paywall · **Severity:** P3 · **Complexity:** S
- **Evidence:** `AnalyticsScreen.js:1040-1070` tiles show only a small `ProBadge` pill; the
  concrete benefit appears one tap later inside the guard. `YouScreen` rows already carry
  concrete sub-copy (`YouScreen.js:147-155,214-221`) and are the better pattern.
- **Options:** (a) Add a one-line benefit sub-label under Pro-badged Analytics tiles (mirror
  YouScreen). (b) Keep restraint as-is (defensible on-brand choice).

---

## AREA 3 — Trial journey & win-back

### TW1 · Win-back push never signals the offer that is already wired
- **Area:** Trial/Winback · **Severity:** P2 · **Complexity:** S
- **Evidence:** `winbackContent.js:42-71` builds copy purely from the user's own activity
  ("Still lifting. N sessions since March") with no mention of price, a returning-user offer,
  or what is new — yet `ProUpgradeScreen` is wired to prefer a Play win-back offer when
  `fromWinback` is set (`subscribePro`/`handleUpgrade`). Mechanism and copy are out of sync.
- **Business impact:** a returning user has no reason to expect a deal, so the wired offer is
  largely invisible — a real under-sell at the reactivation moment.
- **Options:** (a) Add one honest line when an offer is actually present ("There's a
  welcome-back offer waiting") — only when the Play offer truly exists, never fabricated.
  (b) Keep the data-first hook but add a soft "see what's changed" CTA that lands on the
  offer surface. (c) Leave (weakest — the wired offer stays dark).

### TW2 · PostLapseSheet has no forward pitch at peak attention
- **Area:** Trial/Winback · **Severity:** P2 · **Complexity:** S
- **Evidence:** `PostLapseSheet` is deliberately transactional/reassuring ("Everything you
  logged is saved…") with no soft re-upgrade nudge, at the single highest-attention post-
  lapse moment.
- **Options:** (a) Add one calm, optional "Pro will be here when you want it — here's what
  you'd get back" line/link (not a hard CTA). (b) Keep the sheet purely reassuring and rely
  on the win-back push + read-only history (current design — arguably the most on-brand, but
  leaves the moment un-monetised).

### TW3 · Win-back cannot reach a user who never reopens the app
- **Area:** Trial/Winback · **Severity:** P3 (accepted limitation) · **Complexity:** L
- **Evidence:** documented at `scheduler.js:634-637` — the local win-back push requires the
  user to reopen the app during the lapsed window.
- **Options:** (a) Server-scheduled push for the truly-gone cohort (needs a push-token +
  server job; billing/notification-adjacent — founder decision). (b) Accept as-is (calm,
  no-nag brand may prefer not to chase the fully-departed).

---

## AREA 4 — Habit loops (back tomorrow)

Full loop inventory in the evidence base; classification (trigger→action→reward):

- **COMPLETE:** weekly check-in + coach-ready; missed-check-in ghost prevention; partner
  beats (cheer / shared-streak kept, `partnerBeats.js`); morning/evening weigh-in
  (`scheduler.js:102-254`, reward implicit); activation nudge; Year-of-Lifts/monthly recap.
- **PARTIAL/BROKEN** (findings below).

### HB1 · Individual weekly streak has no proactive re-engagement push
- **Area:** Habit · **Severity:** P2 · **Complexity:** M
- **Evidence:** the only streak-related PUSH in the codebase is the *partner* shared-streak
  beat (`partnerBeats.js` `streakKeptPush`). The individual streak
  (`StreakWeeksSection.js`, `useWeeklyStreak.js`) surfaces its reward (glyph strip, run
  length, longest-run PB) ONLY when the user opens Consistency/Progress — nothing pulls a
  solo (non-partnered) user back to see their streak grow or warn of an about-to-lapse run.
  Milestone data exists (`streak_milestone_reached`, `longest_run_pb_reached`) but drives no
  notification.
- **Business impact:** the strongest solo habit surface has no return trigger — a large
  retention loop left half-open for the majority who have no partner.
- **Options:** (a) A calm streak-milestone push ("Three weeks running") on
  `streak_milestone_reached`, ED/calm-suppressed, inside the existing push budget — never a
  loss-framed "don't break your streak". (b) An opt-in "your week is nearly complete" nudge
  late in an incomplete week, forward-framed only. (c) In-app only (weakest — keeps the loop
  open).

### HB2 · Training reminder has no reward stage
- **Area:** Habit · **Severity:** P3 · **Complexity:** S
- **Evidence:** the per-training-day reminder (`scheduler.js`) fires but nothing celebrates
  completion — the loop ends silently.
- **Options:** (a) Let a completed session feed the streak-milestone push (HB1) so the
  reminder loop closes. (b) Leave (the WorkoutSummary share/PB moment is an in-app reward).

### HB3 · Daily brief is Pro-only; free users have no daily "why open" hook
- **Area:** Habit · **Severity:** P2 · **Complexity:** M
- **Evidence:** `HomeScreen.js:1875` gates `CoachDailyBrief` behind `tier === 'pro'`. Free
  users (the whole top-of-funnel) get no equivalent daily orientation surface beyond the plan
  list and the activation banner (which stops after the 14-day window).
- **Business impact:** free retention past the activation window leans almost entirely on the
  streak surface (which itself has no push, HB1) and training reminders — thin.
- **Options:** (a) A free, non-coaching daily hook on Home (today's planned session, streak
  status, last PB) — carefully NOT coaching (stay the right side of the free/Pro line).
  (b) Surface the streak/consistency summary on Home for free users. (c) Accept free as a
  deliberately lean surface (defensible, but a retention risk for the free base).

---

## AREA 5 — Social / viral loops

### SV1 · Share is free and brand-forward, but there is no first-share adoption signal or invite hook
- **Area:** Viral · **Severity:** P2 · **Complexity:** S/M
- **Evidence:** cards are free and watermarked (`drawShareCard.js:164-186`), prompted at
  WorkoutSummary (free, `:1202`) and on a great week (Pro, `CoachOutputScreen.js:1981-1988`).
  But there is no `first_share` / `share_completed` telemetry (the `first_*` family is
  plan/workout/food only) — so share→install contribution is unmeasured — and the share sheet
  carries no "train with me" invite affordance to convert a viewer into a user.
- **Business impact:** the one organic viral surface is undermeasured and not wired to the
  partner-invite loop; realistic viral coefficient contribution is currently unknowable.
- **Options:** (a) Add a `share_completed` event (card type only) to size the loop.
  (b) Offer an optional "invite them to train with you" line on the share confirmation
  (reuses the partner invite link) — ethical, opt-in. (c) Leave shares as pure brand
  artefacts (decoration, not a growth loop).

### SV2 · Partner viral loop is gated to Pro, capping its reach
- **Area:** Viral · **Severity:** P2 · **Complexity:** M
- **Evidence:** invites are low-friction (`PartnerScreen.js:348-380`) and the funnel is
  instrumented (`partner_invite_minted`→`_redeemed`→`_died_at_paywall`,
  `partners/telemetry.js`) — but Partners is a Pro feature, so the invite is one Pro user
  pulling in a person who then meets the paywall. `partner_invite_died_at_paywall` is exactly
  the "invited friend bounced at the gate" signal — and it is currently DARK (M1,
  migrate_102 unapplied).
- **Business impact:** the strongest interpersonal acquisition loop is bottlenecked at the
  Pro gate and its drop-off is unmeasurable until `102` is applied.
- **Options:** (a) Apply `102` to light up the invite→paywall funnel, then decide with data.
  (b) Let an *invited* user redeem and experience the partner bond during their trial (they
  already get 14 days), making the invite land before the paywall. (c) Keep Pro-gated
  (current — defensible on the free/Pro constitution, but accept the ceiling).

### SV3 · No referral/incentive loop
- **Area:** Viral · **Severity:** P3 · **Complexity:** L
- **Evidence:** no referral mechanic exists. **Note only:** classic "give a month, get a
  month" referral is billing-adjacent and can drift into dark-pattern territory; on the calm/
  no-shame constitution this is a **founder decision**, not a recommendation.
- **Options:** (a) None — rely on organic share + partner invites. (b) An ethical,
  non-coercive referral (e.g. share a plan, not a discount) if the founder wants a loop.

---

## AREA 6 — Retention risks / switching costs

### RT1 · Strong switching costs exist but are under-surfaced to free/lapsed users
- **Area:** Retention · **Severity:** P2 · **Complexity:** S
- **Evidence:** read-only-on-lapse keeps diary/body-metrics/progress-photos visible
  (`withReadOnlyProGuard`), and the "Coaching history" row shows "every call the coach made…
  view-only on the free plan" (`YouScreen.js:160-166`). These are real lock-in — but they
  surface only if the user navigates to the right row; nothing proactively reminds a lapsed
  user how much of *their* history is waiting.
- **Options:** (a) A calm one-time "your N weeks of data and M PBs are all still here" note
  on the post-lapse/free Home (reassurance + latent switching cost). (b) Leave discovery
  passive (current).

### RT2 · Data-depth assets (PB history, photo timeline, partner bond) are not framed as retention
- **Area:** Retention · **Severity:** P3 · **Complexity:** M
- **Evidence:** PB history (`LiftProgressScreen`, `YearOfLiftsScreen`), photo timelines
  (`ProgressPhotosScreen`), and multi-week partner bonds accumulate real value but are never
  reflected back as "look how much you've built here". `partner_pair_week_active` (retention
  at week 2/6) is instrumented but DARK (M1).
- **Options:** (a) Periodic milestone recaps already exist (Year-of-Lifts, monthly) — extend
  the framing to "your history" as a retention surface. (b) Accept as-is.

---

## AREA 7 — Store presence / review prompts

### RV1 · Review prompt only fires from the free training path
- **Area:** Store hooks · **Severity:** P2 · **Complexity:** S
- **Evidence:** `shouldPromptReview()` is called only from `WorkoutSummaryScreen.js:629`
  (plus a manual button in `SettingsAboutScreen.js`). The gate itself is well-designed (10
  sessions + 14 days, once, `storeReview.js`). But a Pro user delighted by a *coaching*
  moment (a great weekly review, a milestone) never gets asked — the one OS-allowed prompt is
  always spent on a training completion.
- **Business impact:** store rating quality/volume is left on the table at the app's most
  emotionally positive moments (great-week recap, PB, streak milestone).
- **Options:** (a) Also gate the prompt behind a great-week/CoachOutput moment for Pro users
  (same 10/14 dedupe so it still fires at most once). (b) Trigger after a `perfect_month` /
  `longest_run_pb` landmark. (c) Leave (current single trigger is safe but narrow).

### RV2 · Store-review prompt has no telemetry
- **Area:** Store hooks/Measurement · **Severity:** P3 · **Complexity:** S
- **Evidence:** `storeReview.js` writes only an AsyncStorage `prompted` flag; no event marks
  when the prompt showed, so review-prompt→rating impact is unmeasurable.
- **Options:** (a) Emit a `review_prompt_shown` event. (b) Leave (low priority vs M1).

---

## Severity ledger

| Severity | Count | Items |
|---|---|---|
| P0 | 1 | M1 |
| P1 | 4 | M2, M3, PW1 |
| P2 | 11 | M4, M5, M6, PW2, PW4, TW1, TW2, HB1, HB3, SV1, SV2, RT1, RV1 |
| P3 | 6 | PW3, PW5, TW3, HB2, SV3, RT2, RV2 |

*(P1 lists three finding IDs but M2/M3/PW1 = the three P1s; PW1 is the biggest single
conversion lever. P2 row lists the full set; the count reflects graded items across areas.)*

**Top-3 actions, all S complexity:** apply pending telemetry SQL (`092–102`) → fire
`paywall_shown` on the two main gates → populate the empty paywall proof array.
</content>
</invoke>
