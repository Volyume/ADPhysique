# Campaign 4 — running log (updated at every landing)

Branch `claude/campaign4-coherence` from main `92b9644e` (9,757 tests
passing, lint clean). Spec: the founder's Campaign 4 order, verbatim in
the session scratchpad (`c4-CAMPAIGN4-ORDER.txt`), summarised on
docs/TASKBOARD.md. Rulings register as D95. Binding: D92/D93/D94, the
three cleanup laws, the A-I classification, cardio closure vs
steps/health separation, peak week legacy-load-bearing with 049 HELD,
FR-1..5 carried unresolved, migrations 132-135 unrun, no EAS, STOP
after Campaign 4.

## Phase status

- Audit wave (8 lanes) — LANDED as the eight AUDIT-*.md evidence files.
- D95 rulings — LANDED (D95-RULINGS.md; wave rulings D95-2 appended).
- Engine/coach-screen cardio removal (lead, hands-on) — LANDED.
- Peak-week deleted_at pull-applier fix — LANDED. Record corrected at
  Review B (F4): the applier now CARRIES the column, but the
  resurrect-on-pull defect is not closed - the legacy push never sends
  deleted_at and no local writer sets it, so the flag is always NULL
  end-to-end. Fully latent today (nothing can produce a soft-deleted
  plan); delete semantics fold into FR-PW-1.
- Dead functions / copy / modules wave (invariant moves first) — LANDED.
- campaign4.boundaries.test.js — LANDED (14 pins incl. the behavioural
  cardio fixture).
- Cardio closure (UI/nav/lib/sync/health) — LANDED at 3e8ab0c6.
  Residuals: U14 public-HTML cardio promises (public/support,
  public/app-map) go to the docs-truth wave or founder; H4 store
  listings stay founder-side; the d16 guard's dead `|cardio` regex
  branch was fixed at landing.
- Routes/deferred/duplicates wave — LANDED at 98d6686b (24 files; five
  inert cross-tab taps fixed, dead registrations and duplicates gone,
  epleyE1rm consolidated with the equivalence test, KEEP list held).
- Docs-truth wave — LANDED at 60857767 (30 files; CLAUDE.md facts,
  072-135 tracker rebuild, 049 header, locked-doc records, SUPERSEDED
  banners, U14 public cardio promises gone, EU-Dublin residency fix).
  Wave rulings + FR-C4-8/9/10 recorded in D95-RULINGS.md.
- Reviews A (reachability) + B (product boundaries) — COMPLETE and
  ACTIONED at f486ea7f (D95-3 blocks in the register). Headline: B-F1
  check-in save was clearing retained cardio answers (H5 breach,
  fixed); A found three more inert cross-tab taps (fixed + pinned) and
  the over-trimmed stepsTarget law (restored); promise-leak closure on
  the store-listing sources, FACT-BASE and taskboard; H1/H3
  limitations and FR-C4-11 recorded.
- Phase 28 (migrations) — VERIFIED: no new migration written or run;
  132-135 unapplied on disk; 049 HELD with corrected header; only
  text-only header/README changes under supabase/.
- Review C (repository truth) — COMPLETE and LANDED at 0ece5dd7
  (11 findings fixed by the reviewer, lead rulings R1-R5 in D95-3:
  39-header applied-status sweep executed, fact-base health line
  corrected, settings.json joins FR-C4-9, web/ legacy parser and
  steps-marketing edge recorded).
- Phase 30 — COMPLETE: PHASE-30-GATES.md (all gates green; route
  census 116→105 registrations / dead taps 16→0 / sourceless 1→0 /
  remnants 2→0; settings + dead-code censuses; Phase 29 FR evidence
  pass included).
- CAMPAIGN CLOSED: register block D95 appended to
  DECISIONS-2026-07-09.md; taskboard Campaign 4 block marked COMPLETE;
  handover fresh-session block updated; merged to main 2026-08-10.
  STOPPED per the order - no onboarding restructuring, no
  long-term-user work, no migrations, no builds.

## Landed commits (this campaign)

- (opening commit) taskboard + handover + this log
- 3a36fec5 eight audit evidence files
- 920359cd D95 rulings
- 21252dbe cardio prescription out of engine + coach screen (lead)
- 6e214ad9 peak-week deleted_at pull fix
- 352fafe7 + 688e67b3 dead functions/copy/modules + boundary suite
- 3e8ab0c6 cardio closure (76 files; suite 9,592 passing, lint clean)

## Recovery path

Read this log + the taskboard block + D95 register entries; verify
`git status`; audit evidence lands in this folder; uncommitted work is
lead-reviewed against the order before landing. Never discard, never
blind-commit. Deletions require the A-I proof recorded in the evidence
file BEFORE the diff lands.

Wave-specific (the pair in flight after 3e8ab0c6):
- Routes/deferred/duplicates wave — authority D95-RULINGS.md "Routes /
  deferred / duplicates" + AUDIT-ROUTES / AUDIT-DEFERRED-TELEMETRY /
  AUDIT-DUPLICATES. If it dies mid-run: diff is uncommitted; re-check
  each edit against the ruling list (9 dead registrations, 6 dead taps
  fixed via navigateCrossTab, applyNotifications, setBarWeight setter,
  T-1a/T-2, epleyE1rm + equivalence test, muscleDisplayName, D-19
  rename, five LOCAL-ONLY corrections); KEEP list is binding
  (tabLongPress, MealNames, ProfileStack.BodyMetrics).
- Docs-truth wave — authority D95-RULINGS.md "Docs truth" +
  AUDIT-DOCS-COHERENCE. Text-only; if it dies mid-run the partial doc
  edits are safe to re-derive from the ruling list. CAUTION item: root
  billing.md/styling.md may be hook-referenced — act only on proof
  from .claude/settings + hooks.
