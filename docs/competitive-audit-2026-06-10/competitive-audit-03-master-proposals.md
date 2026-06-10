# Competitive Audit 2026-06-10 — Document 03: Master Proposals

Every meaningful gap from the 14 area reports, consolidated, deduplicated,
and scored. IMPACT (1-10) weighs retention, conversion, differentiation,
encounter frequency and emotional weight. EFFORT (1-10) weighs complexity,
risk, dependencies and infrastructure. PRIORITY = Impact ÷ Effort.

Hard constraints respected throughout: never expose Pro features to free
without founder sign-off; no billing changes without permission; the
coaching engine stays deterministic (no AI); the safety system is
untouchable (proposals extend around it, never through it); offline-first
and EU residency are non-negotiable.

---

## TIER 1 — HIGHEST PRIORITY (Priority > 3.0)

---
ID: COMP-001
AREA: Positioning / cross-cutting
TITLE: Market the invisible moats: safety stack, fairness charter, "no card for 14 days", offline-everything
CURRENT STATE: Volyume's strongest differentiators — category-unique ED/RED-S safety systems, a 21-day cardless trial, fully offline food search, no retro-paywall history — are built but never said. Store listing, paywall, and onboarding don't lead with any of them.
PROPOSED CHANGE: A copy-and-surfaces pass: (a) "No card needed for 14 days" on the Welcome and paywall screens; (b) a short "fairness charter" surface (no retro-paywalls, your data is always yours, works fully offline) on the paywall and store listing; (c) safety positioning ("the only coach with hard safety floors, built with UK signposting") in Pro onboarding and listing copy.
BEST REFERENCE: Caliber monetises "not AI bots"; Hevy's zero-resentment reputation; cardless-trial messaging lifted starts 71% in documented cases (RevenueCat/Superwall corpus).
USER EVIDENCE: MFP barcode-paywall backlash and Whoop's 2,400-upvote cancellation thread show trust IS the product; 73%-of-ED-patients finding against MFP's defaults makes safety a real differentiator; 42% AI-skeptic users (FlexAI) reward "we show our working".
IMPACT SCORE: 8 — touches conversion, retention and brand at once; zero product risk.
EFFORT SCORE: 2 — copy, store listing, and two screen surfaces.
PRIORITY SCORE: 4.0
IMPLEMENTATION NOTES: British English, voice-locked copy, jargon blocklist applies. Store listing changes are founder-side. No billing file changes needed.
---

---
ID: COMP-002
AREA: Reliability (perceived)
TITLE: Sync-trust indicator: "Everything backed up" / "N changes waiting"
CURRENT STATE: Watermarked sync and sign-out protection already neutralise the category's worst failure modes, but invisibly. Settings has a quiet "Last synced" line only.
PROPOSED CHANGE: A glanceable backed-up state on Profile/Settings (and a quiet line on workout summary): green "All backed up · just now" or amber "3 changes waiting to upload", plus a pre-sign-out and device-migration safety check ("Everything is safely in the cloud — you can move devices").
BEST REFERENCE: Hevy's no-data-loss reputation; inverse: Strong's standing "Lost Data" help articles define the failure narrative.
USER EVIDENCE: Reliability report: the dominant fitness-app failure is silent sync failure perceived as data loss (Strong, MFP, Fitbod, Whoop complaints corpus).
IMPACT SCORE: 7 — converts an engineering lead into perceived trust; pre-empts the single most reputation-fatal review narrative.
EFFORT SCORE: 2 — sync status APIs already exist (`getStatus`, pending counts surfaced in Settings).
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: Read-only over the existing sync layer; no schema change. Keep it quiet (no red alarm states unless genuinely stuck).
---

---
ID: COMP-003
AREA: Progress / coaching connection
TITLE: Every insight ends with what Precision Coaching will do about it
CURRENT STATE: The insights engine reports (plateau, fatigue, volume trend) descriptively; the coach acts separately at the weekly review.
PROPOSED CHANGE: Append a deterministic action line to each insight ("Plateau on bench: your next review will propose a load reset" / "If this holds, Sunday's review will lower chest volume"), and give the plateau insight a constructive reframe.
BEST REFERENCE: MacroFactor's charts feed a visible decision loop; the category insult is "logs what you do, doesn't tell you what to do next" (Hevy/Strong/Gravitus user corpus).
USER EVIDENCE: Progress report: 80% churn within 3 months, typically at the first plateau; 2025 BJHP study — apps induce "shame, disappointment, futility"; nobody reframes plateaus constructively.
IMPACT SCORE: 7 — turns the dashboard into a coach touchpoint at the exact churn moment.
EFFORT SCORE: 2 — copy templates keyed off existing insight types + existing coach signals.
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: Pure template work in the insights engine; voice rules apply; must never promise an outcome the weekly coach might not deliver — phrase as "will review", not "will change".
---

---
ID: COMP-004
AREA: Exercise library and demonstrations
TITLE: Close the demo gap: MoveKit full-library licence + flagship filming day
CURRENT STATE: 2 licensed videos + frame loops across ~448 exercises — the weakest content area, lagging every ranked competitor (350-2,000 demos elsewhere).
PROPOSED CHANGE: (a) Founder executes the MoveKit full licence (~$99 one-time, 200+ consistent, offline-bundleable animations with muscle-highlight variants) — covers ~45% of the library in the already-integrated style; (b) one day of in-house filming for ~20 flagship barbell lifts; (c) half-speed playback toggle; (d) keep all demos free.
BEST REFERENCE: Fitbod (1,600+ videos, multi-angle, never interrupts logging) for delivery; MuscleWiki for breakthrough sentiment ("a game-changer for my beginner gym journey").
USER EVIDENCE: Exercise-library report: demo coverage is the first thing beginners notice; failure mode is bloat + paywalled demos (MuscleWiki backlash) — keep free.
IMPACT SCORE: 9 — the single biggest content deficit, hit by every new user.
EFFORT SCORE: 3 — the DemoCard video path is already proven end-to-end; bulk asset bundling + mapping is mechanical. Licence decision is founder-side.
PRIORITY SCORE: 3.0
IMPLEMENTATION NOTES: `demo_url` row-level override and bundled-video precedence already exist in `sampleDemos.js`/DemoCard. Watch APK size — consider per-exercise lazy bundles or a download-on-first-view cache (must still work offline after first fetch).
---

---
ID: COMP-005
AREA: Onboarding
TITLE: Make body fat optional with an estimate path, and trim pre-value asks
CURRENT STATE: Onboarding asks for body stats including body fat before any plan exists.
PROPOSED CHANGE: Body fat becomes optional with a "not sure? skip it" visual-estimate path (engine already handles absent body fat via the standard formula); audit every onboarding question against "does the answer change the plan?" and defer any that don't.
BEST REFERENCE: Fitbod — one high-signal question to first workout.
USER EVIDENCE: Onboarding report: users resent friction before value; quiz length is tolerated only after a felt moment of value.
IMPACT SCORE: 6 — lowers the highest-friction step of the funnel for every new user.
EFFORT SCORE: 2 — engine already degrades gracefully without body fat.
PRIORITY SCORE: 3.0
IMPLEMENTATION NOTES: Keep the lean-mass-adjusted path when body fat IS provided; onboarding sequence is a LOCKED doc surface — propose to founder before changing screen order (this item changes field optionality, not order).
---

## TIER 2 — HIGH IMPACT, HIGHER EFFORT (Impact ≥ 8, Effort ≥ 5)

---
ID: COMP-006
AREA: Food logging
TITLE: Curated UK supermarket and chain-restaurant food layer
CURRENT STATE: ~25k bundled OFF UK products + CoFID; OFF UK has documented coverage holes; Nutracheck's 500k nutritionist-verified UK foods set the bar.
PROPOSED CHANGE: A phased curated layer: top-1,000 UK supermarket own-brand staples and top chains (Greggs, Nando's, Costa, Pret) verified in-house and bundled; then ongoing curation driven by failed-search telemetry (`food_search_attempt` misses); product photos where licensable.
BEST REFERENCE: Nutracheck — "I can actually find the foods I eat" (4.9 Trustpilot) proves curated-UK-first beats global scale.
USER EVIDENCE: Food-logging report: first-search success is the strongest retention lever in the corpus; 72% of MFP users report database inaccuracies; 73% of quitters cite time burden.
IMPACT SCORE: 9 — daily-touch surface for every Pro user; direct retention lever.
EFFORT SCORE: 7 — sustained data-curation operation, not a code feature; licensing questions for photos.
PRIORITY SCORE: 1.29
IMPLEMENTATION NOTES: The waterfall + bundled-snapshot pipeline already exists; a curated source slots in above OFF in priority. Failed-search telemetry already fires. Quality bar: nutritionist-verified per 100g + per serving.
---

---
ID: COMP-007
AREA: Nutrition coaching
TITLE: Ship the refeed engine and high/low-day macros (safety-gated)
CURRENT STATE: Refeed recommendation code exists but is dead (`getPlanNutritionContext` never called); high/low-day macros don't exist; users of every competitor hand-edit days to simulate these.
PROPOSED CHANGE: Wire refeeds and diet breaks through the existing confirm-then-apply weekly review (coach proposes, explains, user applies); add high/low training-day macro splits as a deterministic layout over the existing weekly target. Gate availability behind cut-phase context and ALL existing safety floors.
BEST REFERENCE: No competitor ships this natively — even MacroFactor users hand-edit and lock days for refeeds/banking.
USER EVIDENCE: Nutrition report: refeeds/diet breaks/calorie banking are the most-wished-for features in r/MacroFactor and adjacent communities.
IMPACT SCORE: 9 — leapfrogs the #1 nutrition player on its users' top wish; deepens the periodisation moat.
EFFORT SCORE: 6 — engine scaffolding exists but the apply paths, diary surfaces and safety interactions need careful build + simulator scenarios.
PRIORITY SCORE: 1.5
IMPLEMENTATION NOTES: Must route through `coachApply` confirm-then-apply; `saveNutritionTargets` is a full-row write (known trap); RED-S/floor checks run on the LOW day, not the weekly average. Add locked simulator scenarios before shipping.
---

---
ID: COMP-008
AREA: Onboarding
TITLE: Value-first onboarding: plan preview before the account wall + "built for you" reveal
CURRENT STATE: Account → consent → stats → goal before any plan exists — the exact pre-value wall the category punishes hardest.
PROPOSED CHANGE: Generate and SHOW a preview plan (split, days, sample session, rationale highlights) from the quiz answers alone, locally, before account creation; the account/consent wall then "saves your plan" instead of preceding it. Pair with a dramatised reveal (see COMP-013).
BEST REFERENCE: Fitbod (first workout in minutes); Cal AI's quiz-then-instant-payoff (61 paywall experiments, 3x revenue); Duolingo's A/B-proven deferred sign-up.
USER EVIDENCE: Onboarding report: value-before-friction is the category law; Hevy's account wall and RP's pre-value paywall are the canonical complaints.
IMPACT SCORE: 9 — install-to-activation is the top of the whole funnel.
EFFORT SCORE: 7 — plan generation is already local/deterministic (works pre-auth), but the identity model ("no anonymous mode") is a LOCKED spec; needs a founder decision and careful state handoff into the post-auth account.
PRIORITY SCORE: 1.29
IMPLEMENTATION NOTES: Article 9 consent must still precede any health-data persistence — the preview must run in-memory from quiz answers only. This is the one Tier-2 item that needs explicit founder sign-off on the locked identity sequence before any work starts.
---

## TIER 3 — QUICK WINS (Effort ≤ 3, Impact ≥ 5)

---
ID: COMP-009
AREA: Plan generation
TITLE: Rationale-led plan reveal
CURRENT STATE: The richest input set in the category produces a plain list.
PROPOSED CHANGE: A staged reveal after generation: your goal → chosen split and why → weekly volume per priority muscle vs landmarks → weak-point allocations → per-exercise "why this" highlights → start CTA. Reuses existing rationale strings; one `hero` motion moment, reduce-motion gated.
BEST REFERENCE: Caliber proves perceived personalisation is manufactured at the reveal; every algorithmic competitor fails on "feels random, no explanation".
USER EVIDENCE: Plan-generation report: trust collapses when plans arrive unexplained; Volyume already owns the explanations.
IMPACT SCORE: 8 — converts existing engine intelligence into perceived personalisation at the moment of highest attention.
EFFORT SCORE: 3 — presentation layer over data the generator already returns.
PRIORITY SCORE: 2.67
---

---
ID: COMP-010
AREA: Check-in and weekly review
TITLE: Discovery framing + conditional check-in questions
CURRENT STATE: Static question set; review framed as adjustments.
PROPOSED CHANGE: Lead the review with the discovery ("Your expenditure is now ~2,840 kcal — it was 2,760"); make each check-in question conditional on whether its answer can change a coach decision this week (skip steps questions when no steps target, skip calorie-adherence when the diary already answers it); add a "logging was patchy this week" graceful-degradation path.
BEST REFERENCE: MacroFactor — adherence-neutral discovery framing + dynamic ask-only-when-it-matters modules.
USER EVIDENCE: Check-in report: the failure mode is the unintelligent interrogation; show-only reviews get skimmed; MacroFactor's framing is the mechanism behind its community trust.
IMPACT SCORE: 8 — the check-in is the weekly retention ritual for every Pro user.
EFFORT SCORE: 3 — copy + conditional rules inside the existing deterministic boundary.
PRIORITY SCORE: 2.67
---

---
ID: COMP-011
AREA: Coaching presence
TITLE: Reactive daily narrative (yesterday-aware home line)
CURRENT STATE: Static daily one-liner; coach is silent between weekly reviews.
PROPOSED CHANGE: Make the home narrative react deterministically to yesterday's specific data ("Bench moved +2.5kg yesterday — best this block" / "Two rest days banked; quads are fresh for tomorrow"), drawing only on existing local data and templates.
BEST REFERENCE: Future's daily "someone notices me" is the class retention winner; this captures a slice of it without humans or AI.
USER EVIDENCE: AI-coaching report: between-check-in presence is the single biggest gap; weekly-only cadence risks feeling transactional.
IMPACT SCORE: 7 — first-screen touchpoint, every open.
EFFORT SCORE: 3 — template expansion over `dailyNarrative.js` with existing queries.
PRIORITY SCORE: 2.33
---

---
ID: COMP-012
AREA: Activity tracking
TITLE: Step-trend modifier in the weekly coach
CURRENT STATE: Coach sets step targets but is blind to step *trends*; can't distinguish behavioural stalls (NEAT collapse) from metabolic ones.
PROPOSED CHANGE: A deterministic modifier: when the weekly step average shifts materially vs the user's baseline, the coach (a) names it in the review ("your daily movement dropped ~2,300 steps — that explains most of the stall") and (b) prefers restoring NEAT before cutting calories. Never credits kcal.
BEST REFERENCE: MacroFactor's Step-Informed Updates (v5.5.0) — published methodology, no calorie crediting.
USER EVIDENCE: Activity report: "I walked more and the app didn't care" — users feel unseen; highest-impact lowest-risk improvement named.
IMPACT SCORE: 8 — sharper coaching decisions + a felt "it sees me" moment, on existing data.
EFFORT SCORE: 3 — steps history already flows into the check-in; pure engine rule + copy.
PRIORITY SCORE: 2.67
IMPLEMENTATION NOTES: Stays inside the ±5% cap and all safety gates; add simulator scenario for NEAT-collapse-vs-metabolic-stall.
---

---
ID: COMP-013
AREA: Progress
TITLE: Monthly training report + 90-day "First Block" recap
CURRENT STATE: Celebration dead-zone between the daily line and the 365-day Year of Lifts.
PROPOSED CHANGE: A free monthly report (tonnage, PRs, consistency, volume vs landmarks, one coach observation) and a 90-day First Block recap with a share card. Commit publicly (fairness charter) that recaps stay free.
BEST REFERENCE: Hevy's free monthly report + annual recap unlocked at 10 workouts; Strava/Garmin recap-paywall revolts as the anti-pattern.
USER EVIDENCE: Progress report: first real celebration currently lands after the 3-month churn window closes.
IMPACT SCORE: 7 — a recurring retention ritual and an organic-share artefact.
EFFORT SCORE: 3 — aggregates and share-card pipeline already exist.
PRIORITY SCORE: 2.33
---

---
ID: COMP-014
AREA: Accountability
TITLE: Partner cheer + shared consistency streak (with protected rest week)
CURRENT STATE: Training Partners is passive and one-directional — partners can see, not act.
PROPOSED CHANGE: (a) A rate-limited one-tap cheer on a partner's weekly signal (push: "Sam sent you a cheer"); (b) an optional shared streak counted in training weeks with a deload/"resting" state that protects it (forgiveness built in); (c) plain-English privacy receipt on the invite sheet.
BEST REFERENCE: Apple Activity Sharing's reply-to-rings; Duolingo shared streaks with forgiveness (+D14 retention, +DAU); Strava kudos' peer-reviewed activity lift.
USER EVIDENCE: Accountability report: every winning implementation gives partners a way to act; ~95% goal-completion lift for scheduled check-ins (Future).
IMPACT SCORE: 7 — activates the just-shipped feature's retention loop.
EFFORT SCORE: 3 — signal pipeline + push infra exist; cheer is one new tiny synced entity.
PRIORITY SCORE: 2.33
IMPLEMENTATION NOTES: No feeds, no leaderboards, no raw metrics — derived signals only. Rate-limit cheers (1/partner/day) to keep them meaningful. Rest-week state must read as positive ("resting", never "broken").
---

---
ID: COMP-015
AREA: Logging acquisition
TITLE: Free CSV export + Strong/Hevy/Jefit importers
CURRENT STATE: Volyume has CSV export of workouts; no competitor importers. Competitors' accumulated history is their strongest retention moat.
PROPOSED CHANGE: First-class "Bring your history" import for Strong, Hevy and Jefit CSV exports (exercise-name mapping table + review screen), advertised on the store listing. Keep Volyume's own export free forever (charter item).
BEST REFERENCE: Hevy ships a Strong importer; paywalled export is one of the category's most-hated patterns.
USER EVIDENCE: Logging report: "accumulated history" is the #1 stay-reason; importers convert the rivals' moat into an acquisition channel.
IMPACT SCORE: 7 — directly unlocks switchers, the highest-intent acquisition segment.
EFFORT SCORE: 3 — CSV parsing + name-mapping against the ~448-exercise library; import pipeline (`importExternal.js`) already exists as a base.
PRIORITY SCORE: 2.33
---

---
ID: COMP-016
AREA: Design
TITLE: Hero numeric display face + one signature coaching chart
CURRENT STATE: Token-disciplined but expressively flat: system font everywhere, standard chart library output.
PROPOSED CHANGE: (a) License/bundle one distinctive numeric display face for hero metrics only (the `display`/`num` roles — weight, est-1RM, kcal, timer); (b) design one bespoke, beautifully animated signature visualisation: the coaching trajectory (weight trend + target corridor + coach interventions marked), used on Home and the weekly review.
BEST REFERENCE: Whoop's DINPro numerals carry its whole brand; Copilot Money's animated charts are its design moat.
USER EVIDENCE: Design report: premium = typography hierarchy + motion language; "spreadsheet of medical data" is the canonical insult; this is the named cheapest path from "disciplined" to "premium".
IMPACT SCORE: 7 — brand-level perceived-quality lift on every screen with a hero number.
EFFORT SCORE: 4 — font licensing + `type.num` swap is cheap; the bespoke chart is real design+motion work (reduce-motion gated).
PRIORITY SCORE: 1.75 (kept in Tier 3 as the font half alone is Effort 2 / Impact 6)
IMPLEMENTATION NOTES: Font licence is a founder decision (cost + licence terms); no new dependency without sign-off. Chart in Skia or Reanimated, must hold 60fps on mid-range Android.
---

## TIER 4 — LONGER TERM (Impact ≥ 7, complex dependencies)

---
ID: COMP-017
AREA: Logging
TITLE: Lock-screen / notification rest-timer controls (and the battery-manager war)
CURRENT STATE: Sticky in-workout notification exists; no actionable timer controls on the lock screen; Android battery managers can kill timers (the category's most universal complaint).
PROPOSED CHANGE: Actionable notification with live countdown + ±15s/skip/complete-set buttons; foreground-service-grade reliability; OEM battery-exemption onboarding (Samsung-specific guidance); later, iOS Live Activity when iOS ships.
BEST REFERENCE: Hevy — lock-screen timer controls free on both platforms; the most visible logging differentiator Volyume lacks.
USER EVIDENCE: Logging report: timer-killed-in-background is the most universal Android complaint; direct risk for a UK Android-first app.
IMPACT SCORE: 8 — in-set, every session, every user.
EFFORT SCORE: 6 — Expo managed-workflow notification actions + foreground service via config plugin; OEM testing matrix.
PRIORITY SCORE: 1.33
IMPLEMENTATION NOTES: Must stay within Expo managed workflow (config plugins only — sacred rule). Validate on Samsung first (worst offender, biggest UK share).
---

---
ID: COMP-018
AREA: Nutrition coaching
TITLE: Cycle-aware weight-noise handling (activate the dead input)
CURRENT STATE: `cycleOverride` is read by the coach but no UI sets it; weight noise from cycles can mislead trend interpretation for roughly half the user base.
PROPOSED CHANGE: Optional, privacy-gated cycle awareness: either explicit logging or MacroFactor-style noise absorption (expenditure modifier that widens tolerance bands around expected fluctuation windows) — deterministic, explained, fully optional, data stays local/EU.
BEST REFERENCE: MacroFactor's Expenditure Modifiers (Oct 2025) absorb cycle/creatine/fluid noise without period logging.
USER EVIDENCE: Nutrition report: cycle-noise handling is a named lag vs the leader and a frequent community wish.
IMPACT SCORE: 8 — materially better coaching for ~half of users; trust protection against "the app told me off for water weight".
EFFORT SCORE: 6 — onboarding field + privacy gate (Article 9 implications) + engine bands + simulator scenarios.
PRIORITY SCORE: 1.33
IMPLEMENTATION NOTES: Article 9 consent already covers health data, but add explicit per-feature opt-in; safety floors unaffected; needs founder sign-off on the onboarding question.
---

---
ID: COMP-019
AREA: Monetisation / growth
TITLE: Free-tier growth loop (founder decision required)
CURRENT STATE: The free tier is generous on training but has no viral surface; Training Partners (the most shareable feature) is Pro-only. The Free/Pro boundary is a sacred rule — this proposal is a decision brief, not a change.
PROPOSED CHANGE: Options for the founder: (a) a free "partner lite" (one partner, signal-only — invitee sees value, cheer/streak stay Pro); (b) invite-unlocks (inviter earns trial extension); (c) keep gating as-is and rely on share cards + monthly reports (COMP-013) as the organic surface.
BEST REFERENCE: Hevy (free social = growth engine), Boostcamp (11,000 free programs), Duolingo referral mechanics.
USER EVIDENCE: Monetisation report: "no free-tier growth loop" is Volyume's single biggest monetisation gap; invite loops are the cheapest CAC in the category.
IMPACT SCORE: 8 — compounding acquisition; the one gap pricing can't fix.
EFFORT SCORE: 5 — gating changes are small; the decision and its trial/billing interactions are the work.
PRIORITY SCORE: 1.6
IMPLEMENTATION NOTES: BLOCKED on explicit founder approval (Free/Pro gating is absolute per CLAUDE.md). No billing-file changes; tier logic only.
---

---
ID: COMP-020
AREA: Activity / wearables
TITLE: Wearable integration v1 (Health Connect depth first, HR later)
CURRENT STATE: Pedometer/Health Connect steps only; "wearable integration" is a listed Pro promise; HR/HRV deliberately deferred.
PROPOSED CHANGE: Phase 1: harden Health Connect (steps + workouts + body weight from watches; watch-vs-phone discrepancy resolution rules surfaced honestly). Phase 2: optional resting-HR trend as a quiet recovery input (never a readiness score). Avoid the Whoop/Garmin trap of HR-centric readiness erasing lifting fatigue.
BEST REFERENCE: MacroFactor's wearable-informed expenditure; Gentler Streak's honest activity framing; cautionary — Fitbit migration backlash (step continuity is a trust product).
USER EVIDENCE: Activity report: watch-vs-phone discrepancy is the killer complaint; Health Connect sentiment is rough — careful, staged integration wins.
IMPACT SCORE: 7 — closes a promised-feature gap and feeds the coach better data.
EFFORT SCORE: 8 — device matrix, Health Connect quirks, background reliability.
PRIORITY SCORE: 0.88
IMPLEMENTATION NOTES: Expo config-plugin constraint applies; recovery model must stay training-aware (the existing differentiator); no PII to external services.
---

---
ID: COMP-021
AREA: Reliability / platform
TITLE: Wear OS / watch logging surface
CURRENT STATE: None.
PROPOSED CHANGE: Deferred: a minimal watch tile (current set, tick, rest timer) once COMP-017's foreground reliability is proven. Hevy's flaky Wear OS sync shows the cost of doing this early and badly.
BEST REFERENCE: Hevy Wear OS (cautionary — data-loss complaints); Apple Watch Strong (also cautionary).
USER EVIDENCE: Logging report: watch logging is wished-for but the failure stories outnumber the success stories.
IMPACT SCORE: 6 — meaningful for a segment, not the majority.
EFFORT SCORE: 9 — new platform surface, sync edge cases.
PRIORITY SCORE: 0.67
---

---
ID: COMP-022
AREA: Acquisition (time-sensitive, founder-side)
TITLE: Targeted windows: Stronger U shutdown (31 March 2026 cohort) and MFP paywall refugees
CURRENT STATE: No targeted acquisition plays.
PROPOSED CHANGE: Founder-side marketing: (a) content + onboarding path for displaced Stronger U subscribers (pay-proven macro-coaching users who value check-ins — Volyume's exact shape); (b) standing "switch from MFP" content keyed to its next paywall move, leading with free barcode + fairness charter + importers (COMP-015).
BEST REFERENCE: Category history shows paywall-backlash moments are the biggest switching windows (MFP 2022 barcode exodus benefited MacroFactor et al.).
USER EVIDENCE: Nutrition + monetisation reports: both windows are named, evidenced, and time-boxed.
IMPACT SCORE: 7 — highest-intent cohorts available this year.
EFFORT SCORE: 4 — marketing + landing content; product work is COMP-015.
PRIORITY SCORE: 1.75
IMPLEMENTATION NOTES: Founder-side; no code dependency except importers.
---

## Priority order (all tiers, by score)

| Rank | ID | Title | I | E | Score | Tier |
|---|---|---|---|---|---|---|
| 1 | COMP-001 | Market the invisible moats | 8 | 2 | 4.00 | 1 |
| 2 | COMP-002 | Sync-trust indicator | 7 | 2 | 3.50 | 1 |
| 3 | COMP-003 | Insights end with coach action | 7 | 2 | 3.50 | 1 |
| 4 | COMP-004 | Demo gap: MoveKit + filming | 9 | 3 | 3.00 | 1 |
| 5 | COMP-005 | Optional body fat in onboarding | 6 | 2 | 3.00 | 1 |
| 6 | COMP-009 | Rationale-led plan reveal | 8 | 3 | 2.67 | 3 |
| 7 | COMP-010 | Check-in discovery framing | 8 | 3 | 2.67 | 3 |
| 8 | COMP-012 | Step-trend coach modifier | 8 | 3 | 2.67 | 3 |
| 9 | COMP-011 | Reactive daily narrative | 7 | 3 | 2.33 | 3 |
| 10 | COMP-013 | Monthly report + 90-day recap | 7 | 3 | 2.33 | 3 |
| 11 | COMP-014 | Partner cheer + shared streak | 7 | 3 | 2.33 | 3 |
| 12 | COMP-015 | Free export + competitor importers | 7 | 3 | 2.33 | 3 |
| 13 | COMP-016 | Display face + signature chart | 7 | 4 | 1.75 | 3 |
| 14 | COMP-022 | Acquisition windows (founder) | 7 | 4 | 1.75 | 4 |
| 15 | COMP-019 | Free-tier growth loop (decision) | 8 | 5 | 1.60 | 4 |
| 16 | COMP-007 | Refeeds + high/low days | 9 | 6 | 1.50 | 2 |
| 17 | COMP-017 | Lock-screen rest timer | 8 | 6 | 1.33 | 4 |
| 18 | COMP-018 | Cycle-aware noise handling | 8 | 6 | 1.33 | 4 |
| 19 | COMP-006 | Curated UK food layer | 9 | 7 | 1.29 | 2 |
| 20 | COMP-008 | Value-first onboarding | 9 | 7 | 1.29 | 2 |
| 21 | COMP-020 | Wearable integration v1 | 7 | 8 | 0.88 | 4 |
| 22 | COMP-021 | Wear OS surface | 6 | 9 | 0.67 | 4 |
