# Competitive Audit 2026-06-10 — Coverage Gaps (Round 3)

> Gap-finder pass over the two completed audit rounds (14 research
> areas + 26 implementation blueprints) and the full `docs/` corpus.
> Job: identify what the 42 agents did NOT cover. Every verdict below
> was verified against the repository on 2026-06-10 — existing locked
> docs were read before any area was declared a gap. This document
> proposes nothing that violates the standing rules (no LLM/AI in
> coaching; offline-first; no PII to external services; EU data
> residency; Expo managed workflow; free features never re-gated; ED
> safety system untouchable; British English).

---

## 1. Verdict table

| # | Area | Verdict | Evidence |
|---|------|---------|----------|
| 1 | ASO (keywords, screenshots, preview video, listing experiments) | **Partially covered — genuine gap on the Apple side + creative production** | Play-side keyword/listing research is deep (`docs/audit/volyume-aso-growth-research-2026-06-08.md`, `docs/PLAY_STORE_LISTING.md`); ASO is the locked primary channel (`GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` §2.5). But `docs/APP_STORE_CONNECT_LISTING.md` is STALE — header still says "iOS OUT OF SCOPE for v1 / no Apple Developer account" while build 14 sits in Beta App Review, and its proposed App Name is flagged over the 30-char limit with no resolution. Screenshot refresh, preview video, Custom Product Pages and Store Listing Experiments are all open founder actions with no creative spec anywhere. COMP-012 covers listing copy only. |
| 2 | Support & ops (review replies, support workflow, FAQ, refunds) | **Partially covered — genuine gap on the playbook** | Live support/FAQ page exists (`public/support/index.html`), `support@volyume.app`, and the growth synthesis sets targets (median response <24h, 15 founder-hours/week cap, "written triage policy"). But the written triage policy does not exist, there is no store-review reply playbook (review text is indexed for ASO; replies affect conversion), and no refund-handling process doc for Play Console / App Store refund requests. |
| 3 | Android-specific polish (Material You, predictive back, Samsung Health, widgets, Play Integrity) | **Mostly low-materiality gap** | Material You / themed icon / predictive back appear nowhere in docs or code. Edge-to-edge was fixed in the SDK 54 arc. Widgets are covered (COMP-019). Samsung Health is effectively covered via Health Connect (Samsung syncs into it). Play Integrity is not needed: billing is server-verified (RTDN + verify-at-purchase) and there is no competitive integrity surface. |
| 4 | iOS-specific beyond covered (App Intents/Siri, Spotlight, Shortcuts) | **Genuine gap — low materiality** | Only Live Activity (`LIVE_ACTIVITY_IOS.md`, COMP-019) and the watch (COMP-020) are covered. Siri/App Intents ("log my weight", "start my workout"), Spotlight indexing and Shortcuts appear nowhere. Nice-to-have for a small team; natural follow-on to COMP-019/020, not its own track. |
| 5 | Localisation / internationalisation | **Deliberately parked** | `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` explicitly lists "US market entry in year one" and "International expansion (US, EU)" as not-doing until UK retention is proven (lines ~607, ~725). UK en-GB overlay is covered in the ASO research (Tier E). Flag only: all strings are hardcoded en-GB, so future i18n cost compounds with every screen shipped — acceptable, but worth knowing it was a choice. |
| 6 | Web presence & SEO | **Deliberately parked (founder decision) / partially covered** | Full web-platform research exists (`docs/web-platform/`, 8 docs). A complete landing page was built and SHELVED by the founder as not good enough ("proper web build is a later session", CURRENT_STATUS 2026-06-08). The Next.js `web/` app is built but undeployed. Privacy + support pages are live. Programmatic SEO is banned by the growth lock. Do not re-open; the landing is a parked founder task. |
| 7 | Referral / invite mechanics | **Deliberately parked** | `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` line ~724: "Affiliate or referral programme. Deferred to v1.x." NEW-002 Training Partners is accountability, not referral — but its invite flow will organically drive installs, so instrument partner-invite → install → activation when it ships (one telemetry event, already deterministic). |
| 8 | Push notification strategy as a whole | **Partially covered — reconciliation gap** | `NOTIFICATIONS_LOCKED.md` (locked 2026-05-23) has the budget: one push per topic per day, quiet hours, per-category disable, ED flags never via push. But it PREDATES the blueprints, which add at least five new push types (day-3 trial moment, win-back, recap-ready, partner cheers, streak repair) plus the already-shipped training-day reminders. No single doc reconciles total volume against the budget. A user in week 3 of a trial with a partner could plausibly receive 4+ pushes in a day, each individually "within budget". |
| 9 | Accessibility beyond the 4 modes | **Partially covered — device pass owed** | Static audit complete (`appstore-07-accessibility-audit.md`): labels broad (106 files), reduce-motion honoured, contrast documented. Chart spoken summaries were finished 2026-06-09 ("the last chart-a11y gap"). Explicitly still owed: a real device VoiceOver/TalkBack pass, and the Dynamic Type decision (M3 — app uses a fixed scale plus its own 1.2× mode; system text-size is ignored). These are known, named, unfinished items — not undiscovered. |
| 10 | Security posture | **Partially covered — server-side audit explicitly flagged and never done** | Client-side: thorough (`playstore-06-security-audit.md`, master-audit 05, `DEPENDENCY_AUDIT_2026-05-26.md`, npm-audit survey). Certificate pinning: documented accepted trade-off — settled. NOT done, flagged in the audit itself: (a) per-policy RLS predicate review ("server-side task beyond client scope — flagged"); (b) deep-link handler input-validation trace; (c) **`public/.well-known/assetlinks.json` still contains the literal placeholder `REPLACE_WITH_SHA…` (verified today)** — App Links have been broken since flagged as H-1 on 2026-06-06, and any site could claim the link. |
| 11 | Performance (cold start, bundle size, SQLite at scale, memory) | **Partially covered — no measurement at scale** | Static analysis done (`appstore-06`, `playstore-05`); hot reads refactored (LB-7), exercise library cached (HP-9); 2.5s splash is deliberate. Nothing measures: cold-start time on a low-end Android, bundle/AAB size over time, or SQLite query latency with 2+ years of sets/food entries (the round-1 perf research only cites a MyFitnessPal data-cap anecdote). FINDING-L6 (large-dataset list spot-checks) is open. |
| 12 | Testing/QA infrastructure | **Genuine gap — locked strategy not implemented** | `TESTING_STRATEGY_LOCKED.md` promises Maestro E2E and k6 load tests. Reality: the last Maestro run was #16 on 2026-05-26, status FAILURE (`.ci-status/maestro-latest.md`), and no Maestro workflow exists in `.github/workflows/` today; no k6 anywhere. Jest is genuinely excellent (200 suites / 3,129 tests, engine simulator in `tests/simulator/`). `QA_TEST_PLAN.md` is stale (describes a 4-tab nav that no longer exists). No structured beta-tester programme doc (TestFlight groups exist, no feedback loop defined). |
| 13 | Analytics/telemetry completeness | **Partially covered — reconciliation needed at blueprint ship time** | `TELEMETRY_DASHBOARDS_LOCKED.md` + `OBSERVABILITY.md`: 36 events allow-listed, 33 emitting, 8 dashboard panels defined, all queryable in Supabase Studio. Every blueprint carries a "Measurement: 2–4 metrics" section (impl-00-shared-brief item 8). The gap is mechanical: new blueprint events need allowlist extensions (COMP-025 says so itself) and nobody owns checking that each shipped feature's metrics actually emit. |
| 14 | Onboarding retention / D0–D14 activation as a whole | **Partially covered — no unifying map** | The pieces exist: value timeline to first coaching adjustment (`TRIAL_CONVERSION_STRATEGY_2026-06-06.md`), reveal moment + starter session (COMP-013), day-3 moment (COMP-023), quiz-first (COMP-030), streak (COMP-018), recap (COMP-005). No single document lays out what a new user experiences each day from install to day 14 — which notifications fire, which aha moments land, what the failure branches are (no weigh-ins by day 5, no workout by day 3). Each blueprint optimises its own moment. |
| 15 | Content/education strategy | **Genuine gap — low materiality** | NutritionEducation screen exists; COMP-006 publishes the coaching methodology; growth synthesis covers founder marketing content (4–6 posts/week, human-written). No in-app education strategy for training/recovery/sleep. The coach explains decisions in context, which is the product's answer; a content library is a different product. Park unless retention data shows education-shaped churn. |
| 16 | B2B coach phase 2 | **Deliberately parked** | `B2B_COACH_PHASE_2_SCOPED.md` (locked 2026-05-23): fully scoped — pricing, schema, linking flow, web dashboard; phase 1 groundwork (`engine_overrides`, `coach_id`) already shipped. Growth synthesis carries month-12 coach targets. Settled; do not re-open. |
| 17 | Churn-risk detection beyond COMP-025 | **Partially covered** | COMP-025 covers cancel-intent capture, post-lapse sheet, win-back, and the lapse experience in depth. Uncovered: pre-cancel engagement decay for ACTIVE subscribers (logging frequency falling week over week while still paying — the silent-churn precursor). Detection is deterministic and local (session/diary counts already in SQLite); response must fit the notification budget (#8). Fold into COMP-025/COMP-018 rather than a new track. |
| 18 | Legal/compliance beyond the DPO gate | **Partially covered — Terms of Service missing** | Privacy is strong: policy live at volyume.app/privacy, Article 9 consent flow, `PRIVACY_CONSENT_LOCKED.md`, store privacy audits, COMP-030's DPO gate. In-app SubscriptionPolicyScreen exists. But there is NO Terms of Service / EULA anywhere — not in `public/`, not in-app, and CURRENT_STATUS notes the web app's missing `/terms` route. Apple's default EULA papers over iOS; Play has nothing. Age: privacy policy states a 13 floor and Pro onboarding validates 13–100, but the free path (name only) never asks — store age rating is the only control. Both belong in the already-planned COMP-030 legal/DPO session. |
| 19 | **(New) Production database backup / disaster recovery** | **GENUINE GAP — the most material finding of this pass** | `BUDGET_POSTURE_LOCKED.md` keeps Supabase on the FREE tier, which has no automated backups or PITR. No DR or restore runbook exists anywhere in `docs/`. Real users are paying. Offline-first mitigates per-user training/food data (the device is the source of truth) — but the server uniquely holds auth identities, `users_profile` tier/trial state, the trial-abuse ledger, `tier_history`, telemetry and sync watermarks. A Supabase project loss today would orphan every paid entitlement and break reinstall/multi-device restore with no recovery path. |
| 20 | **(New) App Links verification broken (H-1, still open)** | **Genuine gap — open known defect** | Verified today: `public/.well-known/assetlinks.json` ships the placeholder. `https://volyume.app` links do not open the app on Android; flagged H-1 on 2026-06-06, never fixed. Matters more soon: auth-confirm links, B2B coach invite URLs and NEW-002 partner invites all assume working universal links. One founder action (paste the Play App Signing SHA-256) + one commit. |

---

## 2. Genuine gaps ranked by materiality

### HIGH

**G1. Production database backup / disaster recovery (area 19).**
Nothing in two audit rounds or any locked doc covers losing the
Supabase project. The free tier has no backups; the server is the
sole holder of entitlements, trial ledger and identities for paying
customers. The exposure is small in probability and total in
consequence, and the fix is cheap (Supabase Pro at ~$25/mo with daily
backups, or a scheduled `pg_dump` workflow to EU-resident storage —
either respects Dublin residency).
*Action:* one decision brief — backup options within EU residency,
cost, and a tested restore runbook — then implement the chosen one.

**G2. Server-side RLS / Edge Function security audit (area 10).**
The client-side audit explicitly flagged "per-policy RLS predicate
review is a server-side task beyond client scope" and a deep-link
input-validation trace; neither has happened. 71 migrations, special-
category health data, server-authoritative billing RPCs and five Edge
Functions have never had a dedicated adversarial pass from the server
side. With paying users and Article 9 data this is the kind of audit
that is cheap before an incident and existential after one.
*Action:* dedicated audit agent — read every RLS policy and RPC
(`SECURITY DEFINER` paths especially), the Edge Function auth
checks, and trace all `Linking` handlers.

**G3. Store creative + Apple listing refresh (area 1).**
ASO is the locked primary acquisition channel, iOS launch is days
away, and the Apple listing doc still says iOS is out of scope — with
an over-limit App Name unresolved. No screenshot spec, no preview
video plan, no Custom Product Pages built, no listing-experiment
design, despite the growth lock calling Custom Product Pages "the
highest-leverage low-cost work".
*Action:* research agent — Apple keyword field strategy, screenshot
narrative spec for both stores (evidence-led, drawing on the trust
row + held-decisions positioning), preview-video feasibility, three
Custom Product Pages, and a Store Listing Experiments plan.

### MEDIUM

**G4. Testing strategy not implemented (area 12).** Maestro E2E dead
since 2026-05-26 and absent from CI; k6 never built; QA plan stale.
The Jest suite carries everything; one navigation regression that
unit tests can't see ships straight to production users.
*Action:* revive a minimal Maestro smoke flow (launch → log a set →
finish workout → diary add) in CI; rewrite `QA_TEST_PLAN.md` against
the real 5-tab nav. Build task, not research.

**G5. App Links assetlinks.json placeholder (area 20).** Known,
named, broken for four days, one-line fix gated on a founder console
lookup. *Action:* founder pastes the Play App Signing SHA-256; commit.

**G6. Notification budget reconciliation (area 8).** The locked
notification doc predates five new blueprint push types. *Action:*
one-page update to `NOTIFICATIONS_LOCKED.md` — full inventory, a
daily/weekly cap across categories, and priority rules when pushes
collide. Doc task; do it before any Phase B blueprint ships a push.

**G7. Support ops playbook (area 2).** The growth lock assumes a
written triage policy that doesn't exist; review replies (an ASO
factor) and refund handling are undocumented. *Action:* one-page
playbook — triage tiers, response templates in the product voice,
review-reply rules, refund policy aligned with Play/Apple mechanics.

**G8. Terms of Service / EULA (area 18).** No terms anywhere; a
subscription health app should have them. *Action:* draft for legal
review and bolt onto the already-gated COMP-030 legal/DPO session —
include the under-13 free-path question while there.

### MEDIUM-LOW

**G9. D0–D14 activation map (area 14).** Pieces exist across five
blueprints + the trial memo; nobody owns the whole journey. *Action:*
one consolidation doc once Phase B blueprints are approved — day-by-
day user experience, notification schedule (feeds G6), failure
branches. Mostly synthesis of existing material.

**G10. Performance at scale (area 11).** No cold-start measurement,
no 2-year-dataset SQLite benchmark, no bundle-size tracking.
*Action:* a synthetic-data seeding script + a measured pass on a
low-end Android device; record baselines in CI artefacts. Build task.

**G11. Telemetry reconciliation at blueprint ship time (area 13).**
*Action:* add "allowlist extended + metrics verified emitting" to
each blueprint's definition of done; quarterly check of the 8 panels.

**G12. Pre-cancel engagement decay (area 17).** Deterministic, local,
fold into COMP-025/018 builds rather than a new track.

### LOW

**G13. Android polish (area 3):** themed icon / Material You /
predictive back — a half-day checklist when convenient.
**G14. iOS App Intents / Siri / Spotlight (area 4):** revisit after
COMP-019/020 ship; "start my workout" via Siri is the only one with
real gym value.
**G15. In-app education content (area 15):** park; the coach's
in-context explanations are the strategy.

---

## 3. Recommended shortlist — gaps deserving a dedicated research agent

Ruthless filter: only where research would change what gets built.

1. **Server-side security audit (G2)** — audit agent over
   `supabase/` migrations, RPCs, Edge Functions, deep-link handlers.
   Output: findings + fixes. Research genuinely changes what gets
   built (or proves nothing needs building — equally valuable).
2. **Store creative + Apple listing (G3)** — research agent on Apple
   keyword strategy, screenshot/preview-video evidence, Custom
   Product Pages, listing experiments. Directly shapes the creative
   work the founder must commission for the locked primary channel.
3. **Backup/DR decision brief (G1)** — short agent: Supabase backup
   options under EU residency, cost ladder, restore runbook, tested
   restore. Small, but it changes an infrastructure decision that is
   currently "hope".
4. *(Optional fourth)* **D0–D14 activation map (G9)** — synthesis
   agent across the five blueprints + trial memo + notification
   budget. Only worth running once the founder approves which Phase B
   blueprints actually proceed; otherwise it maps a journey that may
   change.

Everything else above is a doc task, a build task, or a founder
console action — spawning research agents for those would produce
reports, not decisions.

---

## 4. Deliberately not doing (settled — do not re-open)

| Topic | Where settled |
|---|---|
| International expansion / US entry / localisation beyond en-GB | `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` — out of scope until UK retention proven |
| Referral / affiliate programme | Growth synthesis — "Deferred to v1.x" (NEW-002 partner invites are accountability, not referral) |
| Paid acquisition before £3–5k MRR | Growth synthesis §2.2 |
| Marketing landing page (current version) | Shelved by founder 2026-06-08; proper web build is a later session |
| Next.js `web/` user app deployment | Parallel/experimental track, does not gate mobile (founder, 2026-06-06) |
| B2B coach platform | `B2B_COACH_PHASE_2_SCOPED.md` — locked-but-deferred; phase 1 groundwork shipped |
| Certificate pinning | `playstore-06-security-audit.md` — accepted trade-off for this profile |
| Client-facing email channel at v1 | `NOTIFICATIONS_LOCKED.md` / `BUDGET_POSTURE_LOCKED.md` — push only until v1.1 |
| ML-optimised paywall timing | Growth synthesis §2.4 — deterministic six triggers stand until volume justifies |
| AI anywhere (coaching, content, support deflection) | CLAUDE.md + growth synthesis §2.3 — absolute |
| Plate calculator wiring (COMP-021) | Rejected by founder 2026-06-10 |
| Passive partner view (COMP-017 shape) | Rejected 2026-06-10; superseded by NEW-002 |
| Photos/licensed loops/self-filmed exercise media | Replaced by NEW-001 research gate |
| Feature flags service, RevenueCat-at-launch, paid hosting | `BUDGET_POSTURE_LOCKED.md` free-tier-first posture (note: the Supabase free-tier BACKUP consequence is G1 — the posture itself stands) |

---

*Round-3 coverage pass complete. Nothing in this document modifies
code, locked decisions, or the founder-approved action list; G1–G15
are inputs for the next planning session.*
