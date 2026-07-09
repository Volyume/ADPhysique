# Facts: Paywall & settings

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

FACTS (read-only extraction, no edits made)

**1. PAYWALL**

Two purchase surfaces exist: `PaywallScreen.js` (triggered from `DifferentialBadge` taps / any "Upgrade to Pro" surface, single pay-or-dismiss decision) and `ProUpgradeScreen.js` (reached from Settings > Account > "Go Pro", fuller sales page with FAQ).

Locked-feature encounter: tapping a Pro feature either shows `ProGate` (inline content dimmed to opacity 0.35 behind a small "Pro" lock chip; tap opens a `BottomSheet` with per-feature benefit copy from `FEATURE_BENEFIT` map, an "Upgrade to Pro" button and "Maybe later") or, for full Pro routes, `ProLocked` (full-screen: lock icon, "{feature} is part of Pro" title, benefit line, optional `TodaysPlateTeaser` show-then-sell preview for Food diary/Nutrition, "Upgrade to Pro" button, "Not now" back link, "Restore purchases" link).

PaywallScreen layout order: ModalHeader "Upgrade" → title "Start the Coach" → subtitle → optional single Play-review excerpt card (stars/quote/name-source-date) → `TierComparisonStrip` (Free vs Pro, 3 rows only) → `BillingPeriodSelector` (annual pre-selected here, "COMP-007") → primary CTA ("Try Pro free for 7 days" or "Get Pro for {price}") + "Not now" → terms/disclosure text (auto-renew, price, cadence, cancel-in-store) → legal row (Restore purchases, Subscription terms, Privacy).

ProUpgradeScreen layout: icon → "Go Pro" title → subtitle → 4 perk rows with icons → credential note → `TierComparisonStrip` → (if has account) account note + optional `BillingPeriodSelector` (monthly pre-selected here per later founder override 2026-07-02, superseding COMP-007) + CTA ("Activate Pro" / "Start your free trial" / "Subscribe to Pro"); (if no account) OAuth buttons (Apple/Google only) → FAQ block (5 Q&A, plain headings, no collapse) → "What stays if you switch back to Free later" link → "Maybe later".

Price presentation: store-localised via `usePlayPrices()`; never hardcoded; shows "…" placeholder until loaded (PLAY-002/C-2). Annual shows "Save {pct}%" badge (from `annualSavingsPct()`).

Trial explanation: 14-day cardless in-app trial runs before any store purchase; the store subscription itself carries an additional 7-day intro free trial. PaywallScreen's terms text: e.g. "Free for 7 days, then {price}. Renews {monthly/yearly} until you cancel. Manage or cancel anytime in {store}." ProUpgradeScreen account note: "You're in. Pro's free for the next 14 days, and {store} adds another week free when you subscribe. After that, {price} a month."

Social proof: `paywallExcerpts.js` — a curated Play-review excerpt block, currently **shipped empty/dark** (`PAYWALL_EXCERPTS = []`); array length itself is the feature flag; launch bar is ≥3 verified excerpts. Strict "honesty contract": verbatim only, no weight/appearance content (ED-safety), 12-month recency, founder-curated from Play Console.

Restore purchases: present on PaywallScreen, ProLocked, and SubscriptionScreen, all routed through one shared `restorePurchases()` (M-1, no duplicate implementations).

**2. SUBSCRIPTION MANAGEMENT**

`SubscriptionScreen.js` ("You > Subscription"): current-plan card (tier + stage label + days remaining), price card (localised, billed monthly/yearly), action group: Upgrade/"Stay on Pro" button (free or in-trial), "Restore purchases" (always visible), "Cancel subscription" (Pro only, red text, tertiary variant). Footnote: "Billing is handled by {store}."

Cancel flow: tapping Cancel opens `CancelReasonSheet` (COMP-025-A Moment 1) — optional single reason question ("Before you go: what's the main reason?"), free-text via `ReasonPicker`, break-window follow-up chips ("In a month"/"2-3 months"/"Not sure") only if reason = temporary_break, disclosure ("You'll keep your features until the current billing period ends..."), then a **primary, always-enabled** "Continue to {store}" button that opens the OS subscription-management deep link (no server-side cancel possible), plus "Keep my subscription" secondary. Explicitly documented as anti-dark-pattern: the store handoff is never gated on answering.

Lapse/winback: `PostLapseSheet.js` (COMP-025-A Moment 2) shows once per churn episode on first app-open after lapse (cold start/foreground/in-session tier flip to free), catches cancels done directly in store settings. Body copy reassures data is saved; asks the same optional reason question only if not already captured this episode; single "Done"/"Got it" CTA, no store handoff (lapse already happened).

Cascade gate (`CascadeGateScreen.js`): 2-tier model, one real gate 'day14' (legacy 'day21'/'day28' synonyms accepted). Variants: `upgrade` (free user going Pro, no "Drop to Free"), `day14` (trial winding down: "Stay on Pro" primary, "Drop to Free" tertiary), `payment_failure` ("We couldn't take your payment" — 3-day grace, "Open billing settings" primary, "Decide later" tertiary). Uses `BillingPeriodSelector` for pay variants.

**3. SETTINGS IA**

`SettingsScreen.js` main list (sections: rows for Account, Profile, Coaching, Nutrition targets [Pro], Meal names [Pro], Per-day targets [Pro], Notifications and reminders, Coaching reminders [Pro], Display and accessibility, Home screen widget, Health integration (conditional), Your data, Privacy and legal, Help and about), then inline "Workout & units" section (body-weight unit segmented control st/kg/lbs — gym weights stay kg-only; default rest timer stepper 30-600s; auto-start rest timer switch; rest-finished alert switch; Android exact-alarm access row).

`SettingsAccountScreen.js`: Plan section (email/tier row, Subscription nav, "Go Pro"/"Switch to Free" toggle-nav with confirm alert), then isolated "Account access" section (Sign out, Delete account — both `destructive` styled, separated from routine actions).

`SettingsCoachingScreen.js`: Calmer coaching switch, Session readiness check switch, (Pro) Cardio logging switch, coaching-tone chip selector (Automatic/Supportive/Precise), "Show the science" switch (adds technical terms in brackets), conditional Cycle tracking switch (only if bioSex === 'female').

`SettingsDisplayScreen.js`: Appearance (Dark/Light/Match phone, requires app reload), Energy units (kcal/kJ, display-only), Home (show nutrition on Home switch), Nutrients shown (Fibre/Sugars/Sodium switches, display-only), accessibility block (Larger text, Higher contrast, Colour-blind safe palette — all reload-required; Reduce motion — immediate).

`SettingsDataScreen.js`: Cloud sync (manual sync-now + last-synced label), Refresh food library, (Pro) Skip name on label scans switch, Import from another app (Hevy/Strong), Back up app data (JSON), Restore from backup, Restore a snapshot, Export workout log (CSV), Coach handover report (PDF) — then isolated destructive "Clear history" section (Clear workout history). Bottom privacy note about data ownership.

`NotificationSettingsScreen.js`: granular by category — permission-denied banner; (Pro) cross-link card to dedicated "Coaching reminders" screen (morning weight + weekly check-in, "Always on for Pro", no toggle here); Training reminders (toggle + preset time picker, all tiers); Getting-started nudges (tier-blind, one-tap disable); Meal reminders (3 per-meal opt-in toggles + time pickers, default off, "No streaks and no pressure"); Quiet hours (toggle + start/end preset pickers, applies to every scheduled reminder). Persists to both AsyncStorage blob and SQLite mirror (migration 044) for sync. Footer: "Volyume never sends marketing notifications... no server involved."

**4. VERBATIM COPY (tone: consistently calm, no urgency/scarcity language, no countdown timers, no guilt)**

- "Start the Coach" (paywall headline)
- "Volyume reads your training, weight, food and check-ins together, then updates your plan and targets with a written reason for every change." (paywall subtitle)
- "Try Pro free for 7 days" (CTA)
- "Your Pro trial is winding down" (cascade gate title)
- "We couldn't take your payment" (payment-failure gate title)
- "Before you go: what's the main reason?" / "Optional. It helps us decide what to build." (cancel sheet)
- "You'll keep your features until the current billing period ends. Your training history, food log and check-ins all stay." (cancel disclosure)
- "Your Pro subscription has ended" / "Everything you logged is saved: training history, PRs, weigh-ins, and your food diary." (post-lapse sheet)
- "Everything you logged is saved, and will be exactly as you left it if you come back." (FAQ answer)
- "You're Pro." (success screen)
- "Switch to Free? Everything you've logged stays... You just won't get new weekly coaching adjustments until you re-enable Pro." (downgrade confirm alert)
- "No streaks and no pressure." (meal reminders)

**5. STATE COVERAGE**

- Purchase failure: distinguishes user-cancel (silent, no toast) vs `E_PURCHASE_TIMEOUT` ("Purchase did not finish. Try again.") vs genuine failure ("Purchase did not complete. Try again or pick a different option") — logged via `logError`/`logInfo` differently per case.
- Purchase pending/confirm-lag: server confirm is **awaited**, not fire-and-forget; on confirm failure shows "Payment received. Finishing activation, this can take a moment" — optimistic local unlock holds regardless, reconciled later by Play RTDN/cloud refresh (explicit design note against silently denying paid access).
- Restore failures: distinct messages for "no_client" (cloud unavailable), no active subscription found, already-current, vs success.
- SKU missing / prices not loaded: CTA/price falls back to placeholder text, never a hardcoded price; "Subscription unavailable" alert if SKU can't resolve.
- OAuth sign-in timeout/cancel: polls session for up to 3s (6×500ms), ambiguous cancel-vs-timeout both surface "Sign-in didn't finish. Try again when you're ready." (never a silent dead spinner — flagged as NAV-7 audit fix).
- Workout-in-progress guard: resetFirstRun for Pro setup can return `workout_in_progress` error, shown as a toast rather than yanking the user mid-set.

**6. STANDOUT (strong)**

1. Cancel flow is genuinely anti-dark-pattern: store handoff button is never gated behind answering the exit-survey question, matching DMCC 2024 "easy to leave as to join."
2. Purchase confirmation is awaited (not fire-and-forget) specifically so a failed server grant is surfaced rather than silently leaving a user thinking they're Pro when they aren't, while never revoking access already paid for.
3. Paywall review-excerpt feature is deliberately shipped dark until a strict, ED-safety-screened honesty bar is met (empty array = flag off), rather than faking/soft-launching social proof.
4. `ProGate`/`ProLocked` per-feature benefit copy (`FEATURE_BENEFIT` map, ~20 entries) means the lock explains exactly what was tapped, not a generic pitch.
5. Notification prefs granularity: quiet hours apply universally, meal reminders explicitly "no streaks," and a Pro-only "Coaching reminders" screen was split out because the generic settings screen was previously misleading users into thinking they could disable coaching-critical reminders.

**ROUGH EDGES (factual, not fixed)**

1. Two different billing-period defaults on two purchase surfaces: PaywallScreen defaults to annual (COMP-007), ProUpgradeScreen/CascadeGate default to monthly (later founder override 2026-07-02) — code comments flag this inconsistency explicitly as a deliberate but unreconciled override.
2. `NotificationSettingsScreen.js` retains a large dead/unreachable `scheduleApply` debounce function and related code explicitly called out in a comment as "currently only reachable via handlers removed in a half-finished refactor... not deleting on a guess."
3. `TierComparisonStrip` is capped at exactly 3 differentiator rows by a hard design lock ("list length kills conversion"), a comment notes a prior version of these rows referenced features that don't actually exist/were unverified.
4. Two parallel reminder scheduling stores (AsyncStorage blob NOTIF_PREFS_KEY vs SQLite mirror for sync) requiring manual back-fill/migration logic (`migrateFromLegacyBlob`) — added complexity/fragility surface.
5. `PaywallScreen` review-excerpt block ships empty (no live social proof currently shown to any user despite the UI being built for it).
