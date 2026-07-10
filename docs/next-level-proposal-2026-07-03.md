⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# NEXT-LEVEL PROPOSAL — audit + deep research synthesis (2026-07-03)

Commissioned by the founder ("audit and deep research to suggest features,
or improves to move the app to the next level completely"). Built from two
scoped research passes run today:
- Market/competitive research (web, sourced): docs/research-notes-2026-07-03-market.md
- Internal state audit (code + audit corpus): summarised in section 1; every
  claim carries its file reference.

NOTHING in this document is approved. Every item is a proposal; the founder
decides per item, in his own words. The decision-gated Ultimate-Audit items
11-16 (named autonomy modes, raw/cooked toggle, mid-session-swap wording,
Core-Haptics dependency, timeline food logging, micronutrients/NRV) are NOT
re-proposed here — they already await structured founder decisions.

Hard constraints every item respects: deterministic engine, no AI ever; ED
floors + calm voice untouchable; free/Pro split locked; GDPR/EU-Dublin; no
new dependencies without approval (flagged where needed).

---

## 1. Where the app stands (the honest one-paragraph version)

The Wave 1-7 + Elevation programme cleared essentially the whole internal
audit backlog: the coaching engine with a written "why", the ED-safety
system with no category equivalent (audit/04-competitive.md section 3), a
logging tap economy verified faster than Hevy's, best-in-class food re-log +
FTS5 UK-first offline search, rest timers that reach the lock screen on both
platforms, a rebuilt Progress/CoachOutput presentation, 91%+ token adoption
with a11y lint wired, and a Maestro E2E net. What remains is not polish debt
— it is REACH (iOS store, watch, widgets), STORY (the trust positioning the
market research shows is newly valuable), a few RETENTION seams, and the
tail of infrastructure consolidation.

## 2. The strategic frame the research supports

Volyume's three inherent positions are exactly what the 2026 market is
turning towards, and none is currently told out loud:

- **No AI, ever** — deterministic, explainable, falsifiable. Duolingo's
  AI-first backlash and MacroFactor's anti-LLM marketing show trust is the
  emerging differentiator; AI-branded competitors cannot copy this claim.
- **Calm by design** — guilt streaks are now a documented failure mode; the
  ED-safety floors are ahead of where peer-reviewed literature says the
  market should be, and no certification exists yet to commoditise it.
- **UK-first data + EU residency** — even Cronometer admits UK food coverage
  lags; GDPR enforcement is tightening into 2027. Both moats widen on their
  own.

The proposal list below is ordered by expected impact within that frame.

---

## 3. PROPOSALS — founder decision requested per item

### Tier 1 — the story (mostly founder-side, S effort, days not weeks)

**P1. Lead everything with the no-AI trust claim.** Store listing headline,
onboarding line, one methodology-screen sentence. Falsifiable copy of the
shape: "Same inputs, same answer, every time. No AI, no randomness — a
coaching method you can check." The drafted listing
(docs/prompt12-store-listing-draft-2026-07-03.md) already carries "never
trains a public AI model"; this promotes the claim from footnote to
headline. Effort S. Risk: none (it is simply true).

**P2. Name the free barcode scanner in ASO copy** and (on iOS, when live)
a dedicated Custom Product Page targeting "MyFitnessPal alternative" /
"free barcode scanner" queries. The listing draft's slot 5 already makes
this beat; this extends it to keywords + CPP. Effort S, founder-side.

**P3. ED-safety floors as consumer trust copy (carefully).** One calm,
non-medicalising line in the listing/onboarding: "Safety floors that never
move, whoever you are" already exists in the draft — proposal is to add the
same register to the Play data-safety section and the website, and nothing
more without sign-off. Any wording change here is ED-adjacent: founder
approves exact words. Effort S.

**P4. Apply the Prompt 12 listing** (copy drafted, screenshots pending a
green EAS build) and watch the E7.2 funnel. Already founder-queued; listed
for completeness because it gates P1/P2.

### Tier 2 — reach (the growth ceiling levers)

**P5. iOS production App Store release.** The app ships TestFlight-only
today; half the UK market cannot install it. Code-wise the app is ready
(Live Activity shipped, EAS pipeline exists); the work is submission assets,
review compliance, and founder App Store Connect actions. Effort M
(process), highest single reach unlock available. Decision: greenlight the
submission run-up as its own tracked project.

**P6. Android widget family (C3).** Two widgets exist; the approved-scope
family (today's session, kcal remaining Pro widget, consistency, rest-timer
tile) was never built (docs/wave4-delivery-2026-07-02.md section 6). Phone
widgets reach MORE UK Android users than Wear OS (watchOS ~54% EU share).
Effort L. No new dependency (react-native-android-widget already in).

**P7. Wear OS 7 companion — scoped spike first.** Wear OS 7 (May 2026)
shipped standardised Wear Widgets + a Workout Tracker surface and NO
lifting logger has claimed the format yet: a real first-mover gap. Proposal
is a 2-3 day scoping memo (mirroring docs/e14-watchos-scoping-memo) on a
rest-timer + set-tick companion — NOT a build commitment. The E6B widget
target remains the cheap dress rehearsal for multi-target EAS. Effort:
memo S; build likely XL. Would need new dependencies — named before any go.

**P8. Year-in-review / shareable consistency stats.** Boostcamp-precedent
growth mechanic: PBs, tonnage, sessions, weeks consistent — NEVER weight,
body data, food (the share-card rule already enforces this). Calm framing,
no streak pressure, opt-in share. Effort M. ED-review before ship.

### Tier 3 — product depth

**P9. UK food-data coverage push.** Own the gap Cronometer admits: measure
hit-rate on top-500 UK supermarket barcodes, extend the OFF UK snapshot +
CoFID pipeline where it misses, and publish the hit-rate as a trust number
once it is good. Effort M-L, entirely within the existing pipeline. This is
the highest-leverage Pro-tier quality investment available.

**P10. Rest-day retention loop (calm).** Nothing brings a user back on a
rest day today (trainingReminders.js schedules training days only). One
calm, budgeted, quiet-hours-respecting surface: "Rest day. Your plan knows."
+ recovery insight from data the engine already computes. Notification
category addition = NOTIFICATIONS_LOCKED deviation, so it needs a founder-
recorded decision by design. ED gates as standard. Effort S-M.

**P11. Exercise media (gated reminder).** Still the largest visible content
gap vs Hevy (animated demo per exercise). XL + cost + CDN + asset
production; founder-gated already. Listed so the decision is not lost, with
one new option from research: license a set rather than produce (needs
licence approval by rule).

**P12. UK nano/micro coach partnerships.** 10k-50k-follower UK strength
coaches whose tone matches the calm voice; the partner feature (now with
shared training blocks) is the natural collaboration hook — coach and
client pair in-app. Founder-side outreach; product is ready. Effort S per
partnership to trial.

### Tier 4 — foundations (velocity + risk retirement)

**P13. E12 sync consolidation steps 2-3** (immutable families with tests
first, then plan-shaped families) per docs/e12-sync-consolidation-memo.
Steps 0-1 shipped today; each further step retires untested legacy sync
surface. The single biggest engineering-velocity unlock. Effort L spread
across releases.

**P14. Bundle cut 4** (formTips/seedRoutines/seedExercises -> .dat assets,
~275 KB): approved, not yet built — it touches first-run TRAINING seeding,
so it wants a dedicated window with a first-install device walk, not a
tail-end slot. Effort S-M.

**P15. Quick-win basket** (each under a day, from the internal audit):
getCoachOutputHistory deleted_at filter; RootNavigator deprecated `lazy`
prop -> screenOptions; verify PR-5 first-install food-import batching;
Play-vitals check cadence written into the release checklist; founder runs
the scripted on-device perf measurements so audit/perf-baseline.md stops
saying "RUN ON DEVICE".

### What NOT to do (explicit anti-recommendations, research-backed)

- Do NOT shorten the 14-day trial (RevenueCat 2026: long trials convert
  ~42.5% vs ~25.5% for <=4-day; the industry trend is data-contradicted).
- Do NOT add punitive streaks, red numbers, or guilt notifications — the
  research now shows this is bad BUSINESS, not just bad ethics.
- Do NOT chase the AI feature race in any form; the moat is the refusal.
- Do NOT build a social feed. The partner model (private, derived-only) is
  the differentiated social shape; a feed would import the shame dynamics
  the app exists to avoid.

## 4. Suggested sequencing if broadly approved

1. Tier 1 story items (P1-P4) ride the next release + listing refresh.
2. P5 iOS submission run-up starts as its own project immediately after.
3. P13 step 2 + P14 + P15 fill engineering windows between store work.
4. P6 widgets, then P9 UK food push, then P8 year-in-review.
5. P7 Wear OS memo whenever convenient (decision input, cheap); P10 rest-day
   loop after its notification-deviation decision; P12 partnerships once the
   listing tells the story they would be selling.

Every item awaits an explicit founder GO, per the working rules.
