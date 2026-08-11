# Campaign 5 — first-use, onboarding and first-block journey (running log)

Branch `claude/campaign5-first-use` from main `1665f4ba` (9,626 tests
passing, lint clean, campaigns 1-4 complete D92-D95). Founder order
verbatim in the session scratchpad (`c5-CAMPAIGN5-ORDER.txt`),
summarised on docs/TASKBOARD.md. Rulings register as D96.

Binding: this is NOT a feature campaign. Three first-use laws:
(1) MINIMUM REQUIRED INFORMATION, MAXIMUM EARLY VALUE - every
onboarding input classified A-H, asked when needed, never front-loaded;
(2) DO NOT TEACH THE WHOLE PRODUCT BEFORE USE - do → see result →
explain when relevant; (3) NO FALSE PERSONALISATION - day 1 is
research + profile + choices; "learns from your training over time".

Hard constraints: no AI, no cardio (permanent boundary), no new
social/gamification/training/nutrition features, no advanced controls
in first use, ONBOARDING_QUIZ_FIRST stays off WITH its rollback
infrastructure intact, billing architecture locked (copy conflicts →
STOP for founder), Article 9 unweakened and fail-closed, ED/wellbeing
safety untouched, D92-11 unaltered, no auto block creation, migrations
132-135 + 049 unrun, no EAS, no returning-user work, no visual
redesign. FR-1..5, FR-C4-1..11, FR-PW-1, H4 carried unresolved
(recommendations may update on evidence). STOP after Campaign 5.

## Carried release issues (opening actions, done first)

- **H4 (RELEASE BLOCKER)**: published Play/App Store listings still
  promise cardio logging. The repo does NOT own the authoritative
  listing source (the consoles do); the in-repo source docs carry
  STALE-ON-CARDIO banners since C4. EXACT FOUNDER ACTION REQUIRED
  BEFORE RELEASE: in Play Console (Store presence → Main store
  listing) and App Store Connect (App Information / version metadata),
  remove every cardio-logging claim - the stale lines are enumerated
  in docs/PLAY_STORE_LISTING.md (:41,:44,:56,:149,:202-203) and
  docs/APP_STORE_CONNECT_LISTING.md (:326, Health-data declaration),
  and BOTH Data Safety / privacy declarations must drop cardio as a
  collected data type. Tracked on TASKBOARD §3; not clearable from
  code.
- **Peak-week wording**: RECONCILED in
  docs/coherence-cleanup-2026-08-10/D95-RULINGS.md (dated block):
  contest-countdown show-date data LIVE; automatic Peak Week
  prescription product ABSENT; 049 HELD. No behaviour change.

## Phase status

- Opening scaffold + reconciliation — LANDED (e25268cb).
- Phase 1-39 audit fan-out — LANDED (7cb30c72; twelve evidence files,
  ~190 findings).
- D96 rulings — LANDED (bf245c1c; wave assignments + eight founder
  questions FQ-1..FQ-8, all open).
- Wave A (lead spine: Step 1 trap, wellbeing merge-write, legacy pull
  consent gate, no invented biology, honest session ratings +
  campaign5.firstUse.test.js opening pins) — LANDED (ee2950c9; suite
  9,635 passing, lint clean).
- IN FLIGHT NEXT: Wave B (entry/account) + Wave C (plan/block/home/
  workout surfaces) as the next two-agent pair; then Wave D
  (week/check-in/nutrition/notifications) + Wave E (audiences/
  density/hierarchy); then the Phase 40 test matrix + Phase 41
  synthetic journey; then Reviews A/B/C; then the release-truth
  audit, gates, close, 64-item handover.
- FOUNDER RULINGS FQ-1..FQ-8 RECEIVED and recorded (D96-RULINGS.md
  founder-rulings block + D96 interim block in DECISIONS-2026-07-09.md
  with the FQ-2 tier law: FREE DOES NOT HAVE COACHING; PRO owns
  adaptive coaching and Continue-with-adjustments). Integration plan,
  in sequence after Waves B/C land (side rulings; no re-scope):
  - FQ-2 wave (block-decision architecture: both options for Pro,
    advisor recommends-never-gates, ledger consumed, placeholder-row
    entitlement removed, Free truthfully Pro-gated) - dedicated lane
    over blockAdvisor/PlansScreen + tests, lead-reviewed.
  - FQ-3 + FQ-7 (session-difficulty as coarse effort evidence +
    per-exercise PR baseline) - LEAD HANDS-ON engine work with the
    dedicated test plans the rulings demand; resolves FR-C4-4.
  - FQ-4 (wire Apply end-to-end to session prescriptions; unapplied
    proposals change nothing) - LEAD HANDS-ON with the full pinned
    law and scenario matrix; the campaign's largest single item.
  - FQ-6.1/6.2/6.4 (trial-grant retry, trial end date, truthful
    Manage subscription) - LEAD HANDS-ON billing changes, each with
    its written test plan per billing discipline. FQ-6.3 HELD on the
    founder console check (now on TASKBOARD §3 beside H4).
  - FQ-1(c) - LANDED by the lead (abca7fad): hand-off calm pointer in
    the approved wording (named, not navigated - no tabs exist yet in
    that stack) + wellbeing.js header + ONBOARDING_SEQUENCE_LOCKED
    status banner; PRIVACY_CONSENT_LOCKED's line was corrected in the
    FQ-5 landing.
  - Wave B (entry/account) - LANDED at 0aa31e79 (11 files; all 12
    ruled items; lead review passed).
  - Wave C (plan/block/Home/workout) - LANDED at 7074f2ee (37 files;
    all ruled items; C5-P12-03 correctly routed to Wave E; two
    C5-P10-01 activation paths in Wave B files noted as remaining -
    FreeStarter and ProSetupComplete still lack the block sentence,
    carried to Wave E; 60 new pins + 12 same-meaning re-anchors).
    NOTE: Wave C was interrupted mid-flight by a foreground turn and
    resumed via SendMessage with context intact - the resume completed
    all work and the gate ran green three times. Diagnostic from the
    wave: a stale jest cache in /tmp/jest_0 caused an intermittent
    widgets/storage.test.js flake unrelated to any diff; cleared with
    npx jest --clearCache. If CI flakes on that suite, same cure.
  - Waves D + E - LANDED together at df77c3eb (55 files; all ruled
    items; lead carry-overs applied at landing: C5-P37-01 TodayStrip
    CTA weight with its pin re-anchored, C5-P21-01's true first-sight
    provenance line + PM-07's baseline clause on the hand-off screen,
    wellbeing copy tier-neutralised after the W-8 move). Ruled at
    landing: C5-P22-01 clause 3 RESOLVED BY ACCEPTANCE - the
    enrolment weight is a genuine user-entered reading and the
    promise-equals-gate invariant (trialActivation) outranks
    re-anchoring the 5-day clock; clauses 1+2 landed (honest day-0,
    labelled seed row). FM-04 premise no longer holds (ProLocked
    covers the never-Pro case) - closed. D's C5-P28-04 residual (the
    server-side day-15 trial→free transition is observed by nothing
    client-side) recorded under FR-C4-8. FQ-6.4 will rename both
    'Switch to Free' strings (SubscriptionPolicy + SettingsAccount).
  - FQ-2 - LANDED at db1df587 (both options always rendered for Pro,
    advisor recommends-never-gates, ledger rows tier-gated not
    recommendation-gated, evidence-free placeholder rows score null,
    entitlement from the real tier failing closed, Free's adjust
    option Pro-marked routing to upgrade with a second handler lock
    and the seed mapping carrying the entitlement; 14 new tests).
  - FQ-3 + FQ-7 - LANDED at 61ad6c1c (lead hands-on): fabricated
    rir:2 default removed; computeSetTargets' overload decision reads
    session-level difficulty (1-3 corroborates, 4-5 holds, null holds
    with the approved copy); FR-C4-4 RESOLVED in the live path
    (bodyweight sets can never receive micro-load instructions);
    per-exercise first-exposure PR baseline on log and edit paths
    with the first-lift acknowledgement re-keyed on exposure;
    dedicated twelve-pin test plan (computeSetTargets.fq3.test.js);
    six fixtures + three guards re-anchored same-meaning.
  - FQ-4 - LANDED at a3780afd (lead hands-on): pure allocator
    computeWeeklySessionAllocation carries this week's persisted
    planned_muscle_volume into session set counts (identity when rows
    absent); session assembly + logger + readiness trim all read the
    allocated base; unapplied proposals' volumeSignal gated on a
    persisted coach row for the week (safetyHold stays automatic);
    applyWiring.fq4.test.js pins the full law.
  - FQ-6.1/6.2/6.4 - LANDED at 17298b24 (lead hands-on, billing test
    plan fq6.billing.test.js, 12 pins): 6.1 pendingCascade retry
    queue (pendingConsent shape, drained by the sync runner, network
    vs definitive split, idempotent start_cascade, never invents a
    local entitlement, calm FirstRun note while queued); 6.2 one
    authoritative trial end date (cascade.trialEndsAtMs/
    trialEndsLabel; daysRemaining, Account row and Home banner all
    read it); 6.4 fake local "Switch to Free" (setTier('free'))
    replaced by truthful "Manage subscription" opening the platform
    subscription surface with the real expiry semantics stated;
    SubscriptionPolicy pointer matched. Product IDs and the
    founder-verified 14+7 trial shape pinned untouched. Gate: lint
    clean, 815/816 suites (widgets/storage env flake only, passes
    standalone).
  - REVIEW A (Phase 42) - DELIVERED and ACTIONED at eb374fba: 4
    defects (RA-1 quiz-days ignored, RA-2 unjudged-hold receipt
    claim, RA-3 Step-2-of-6 + dead step 1 paint, RA-4 unjustified
    required name) + 6 improvements (RA-5 hand-off reorder, RA-6/9
    glosses, RA-7 group title, RA-8 trial thread, RA-10 trial chip),
    all landed with 10 pins; rulings in D96-RULINGS.md Review A
    block. 5 CLEAN passes recorded.
  - REVIEW B (Phase 43) - DELIVERED and ACTIONED at 40a7e360: 5
    defects (RB-1 build-record early clear + hand-off Back exit, RB-2
    coach-ready push wiped by restores, RB-3 no synchronous
    activation guards + two-active-blocks interleave, RB-4 stale-tier
    decision-card repaint, RB-5 silent library activation throw) and
    latents RB-6/7/9/10/11/12 all landed with 6 pins; RB-8 accepted
    residual, RB-13 no-action, RB-14 recorded/narrowed - rationale in
    D96-RULINGS.md Review B block. 10 CLEAN passes; 11/14 matrix
    items verified closed, the other 3 closed by RB-1's landing.
  - NEXT: Review C in flight (REVIEW-C-experienced.md), then Phase 41
    synthetic journey, Phase 45 release-truth audit, gates, docs
    close, merge to main, 64-item handover.
  - FQ-5: APPROVED IN FULL by the founder ("Approve all") and LANDED
    by the lead - all six items as proposed, item 3 Option A, consent
    version stamp 2026-08-10 (stamp-only, no re-gating), locked
    record reconciled to the shipped screen. FQ-6.3: RESOLVED by
    founder console confirmation (billing.md carries the permanent
    record). FQ-8(b): no work.

## Wave recovery paths

- Wave B/C/D/E briefs derive from D96-RULINGS.md wave sections; every
  edit re-proves its finding's evidence (file:line) against the
  current tree first; agents never commit; uncommitted wave work is
  lead-reviewed against the ruling list before landing.

## Recovery path

Read this log + docs/TASKBOARD.md Campaign 5 block + D96 rulings (when
they exist); `git status`; audit evidence lands in this folder;
uncommitted work is lead-reviewed against the order before landing -
never discarded, never blind-committed. Implementation only ever
follows a recorded D96 ruling on written evidence.
