# 08 · Retention, Growth & Monetisation

**Author:** Fable, from O4 (growth/retention/monetisation audit). **Date:** 2026-07-04.
Full evidence: `inputs/growth-retention.md`. Billing internals are LOCKED — this
covers the *experience and measurement* around them, never the purchase/restore/
cascade mechanics or product IDs. Every option is ethical and on-brand.

---

## The headline

**The growth machine is unusually well-built for a solo app — and its most
valuable telemetry is switched off.** O4 found staged activation nudges, an
engagement-based trial banner, the complete weekly-coach loop, free
brand-forward share cards, low-friction partner invites, and a 60-event catalogue.
The problem is not that growth infrastructure is missing; it is that **the newest
funnel/conversion/partner telemetry is dark server-side, and the paywall's proof
slot ships empty** — two switched-off features, not two unbuilt ones.

---

## The measurement crisis (the P0)

**Migrations `092–102` are "Applied remotely: NO."** The client emitters all
exist and are wired (`first_workout_logged`, `first_plan_generated`,
`first_food_logged`, `onboarding_step_completed`, `trial_lapse_day1_return`, the
landmark events, the partner-adoption funnel). But the server allow-list rejects
them on push, so they fire on-device, get retried forever, and **never reach the
warehouse.** The founder cannot answer a single funnel question — activation rate,
step drop-off, paywall view→trial, partner-invite drop-off — despite the code
being complete.

**This reframes the P5 "funnel events" task entirely:** they were *built* (commit
E7.2). They just can't land until the SQL is applied. **The single highest-value
growth action in the entire audit is applying `092–102` to EU-Dublin** (P0-1). A
safeguard worth adding: a CI check that every non-deferred event has a
*remotely-applied* allow-list entry, so "instrumented but dark" can never recur
silently.

Secondary measurement gaps (all small):
- `paywall_shown` fires only on the Home banner, not on PaywallScreen or
  CascadeGate — the core view→trial KPI is uncomputable for the two main gates
  (P1-2).
- No `feature_locked_viewed` event — can't rank which gate drives upgrades (P1-3).
- Payment-decision taps live only in Sentry `audit()` breadcrumbs, not the
  warehouse — a founder reading `events.js` would think they're untracked (M4).

## The biggest conversion lever (the P1)

**`PAYWALL_EXCERPTS = []`.** The paywall's proof-before-price card is fully wired
but ships empty — zero social proof renders despite the UI being ready.
Proof-before-price is a well-evidenced lever; populating ≥3 genuine, consented,
on-brand excerpts is direct conversion lift at S complexity (P1-1). **⚖︎ The
founder fork:** real consented quotes / an honest mechanism-proof card ("adjusts
your plan every week with a written reason") / a lightweight in-app capture to
source quotes ethically over time. **Never fabricate reviews** — that would breach
the honest brand and store policy.

## The habit loops (which close, which are half-open)

- **Complete:** weekly check-in → coach-ready; missed-check-in ghost prevention;
  partner beats; morning/evening weigh-in; activation nudge; year-of-lifts recap.
- **Half-open — the retention gaps:**
  - **Solo weekly streak has no re-engagement push** (only the *partner* streak
    does) — the strongest solo habit surface has no return trigger, for the
    majority who have no partner (P1-9). Fix: a calm forward-framed milestone push
    ("Three weeks running"), ED/calm-suppressed, never loss-framed.
  - **Free users have no daily "why open" hook** — the daily brief is Pro-only, so
    free retention past the 14-day activation window is thin (P2-12). ⚖︎ a
    non-coaching free hook (today's session, streak, last PB), carefully right of
    the free/Pro line.

## Trial & win-back

- **The 14-day trial starts silently** at the consent tap (doc 03, P2-1) — one
  honest additive line fixes it.
- **Win-back undersells the wired offer:** `ProUpgradeScreen` is wired to prefer a
  returning-user offer, but the win-back copy never mentions it (P2-11). Signal it
  only when a real Play offer exists — never fabricated.
- **PostLapseSheet has no forward pitch** at peak attention (P2-11) — arguably the
  most on-brand omission (pure reassurance), but it leaves the moment un-monetised.

## Social / viral loops

- **Share is free and brand-forward** (every card carries the wordmark + tagline +
  `volyume.app`) — a genuine organic asset. But there's **no `first_share`
  telemetry** to size the loop, and no "train with me" invite hook on the share
  sheet (P3-8, SV1).
- **The partner invite loop is instrumented but its drop-off signal
  (`partner_invite_died_at_paywall`) is dark** until `102` is applied — you can't
  yet see how many invited friends bounce at the Pro gate. ⚖︎ whether an *invited*
  user should experience the partner bond during their trial before meeting the
  paywall (SV2) is a real strategic fork, best decided with the data `102`
  unlocks.

## Switching costs (strong, under-surfaced)

Read-only-on-lapse (diary, metrics, photos, coaching history) is real lock-in and
goodwill — but it only surfaces if the user navigates to the right row. A calm
one-time "your N weeks of data and M PBs are all still here" note to lapsed/free
users would make the latent switching cost visible (O4-RT1).

## Store presence

The review prompt is well-gated (10 sessions + 14 days, once) but only fires from
the *free training path* — a Pro user delighted by a great weekly coaching moment
never gets asked (P2-18). Extending the trigger to a Pro coaching high-moment
(same dedupe) captures ratings at the app's most positive beats.

## The ethical frame (non-negotiable)

Every option here is calm, honest, and on-brand. The audit explicitly does **not**
propose: manufactured urgency, streak-loss anxiety, fake testimonials, hidden
cancellation, or referral discount-bait. Growth for Volyume comes from *turning on
what's built, proving value honestly, and closing the loops that already exist* —
not from borrowing the market's resented tactics. The three top actions are all S
complexity: **apply the telemetry SQL, fire `paywall_shown`, populate the proof
slot.**
