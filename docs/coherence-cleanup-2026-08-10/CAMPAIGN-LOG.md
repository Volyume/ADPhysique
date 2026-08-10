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
- Peak-week deleted_at pull-applier fix — LANDED.
- Dead functions / copy / modules wave (invariant moves first) — LANDED.
- campaign4.boundaries.test.js — LANDED (14 pins incl. the behavioural
  cardio fixture).
- Cardio closure (UI/nav/lib/sync/health) — LANDED at 3e8ab0c6.
  Residuals: U14 public-HTML cardio promises (public/support,
  public/app-map) go to the docs-truth wave or founder; H4 store
  listings stay founder-side; the d16 guard's dead `|cardio` regex
  branch was fixed at landing.
- NEXT: routes/deferred/duplicates wave + docs-truth wave (the next
  two-agent pair, briefs from D95-RULINGS.md sections "Routes /
  deferred / duplicates" and "Docs truth").
- Then: Phase 30 censuses, three adversarial reviews (A reachability,
  B product boundaries, C repository truth), quality gates, register/
  taskboard/handover close, merge to main, 40-item handover, STOP.

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
