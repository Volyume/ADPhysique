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

- Opening scaffold + reconciliation — this commit.
- Phase 1-39 audit fan-out — NEXT (workflow lanes; evidence lands in
  this folder).
- Everything else — NOT STARTED.

## Recovery path

Read this log + docs/TASKBOARD.md Campaign 5 block + D96 rulings (when
they exist); `git status`; audit evidence lands in this folder;
uncommitted work is lead-reviewed against the order before landing -
never discarded, never blind-committed. Implementation only ever
follows a recorded D96 ruling on written evidence.
