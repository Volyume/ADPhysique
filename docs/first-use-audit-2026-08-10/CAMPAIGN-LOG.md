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
- FOUNDER QUESTIONS FQ-1..FQ-8 open in D96-RULINGS.md - work continues
  on unblocked lanes.

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
