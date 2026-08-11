# Campaign 7 — Workstream 10: known safety questions vs the next update

Assessment only. Nothing here was implemented; every item remains
founder-gated exactly as recorded in TRIAGE-2026-08-11.md and the D97
register. The question answered here is narrow: does the item prevent
shipping the NEXT UPDATE (the Campaigns 1-6 delta) over the live app?

## D92-11 — ED/open-safety flag is device-local

- CURRENT RISK: an open ED flag does not survive reinstall or reach a
  second device; the two cloud suppressions (partner-cheer,
  migrate_123 retention email) read a cloud table nothing writes. This
  is the standing state of the LIVE app today, not a regression the
  next update introduces: Campaigns 1-6 changed no ED-flag storage
  semantics, and every device-local suppression (notifications,
  coaching, trends, partner-cheer client-side, win-back) is intact and
  pinned.
- CAN NEXT VERSION SHIP? YES. The update leaves this exactly as the
  live version has it; withholding the update would not protect anyone
  the current version does not already fail to protect. The partner
  feature's client-side cheer suppression works on the flagged device;
  the cloud-side hole exists identically before and after the update.
- WHY: no new exposure surface ships. The one adjacent change (RC6-3
  tombstone carry on morning weights) strengthens, not weakens, the
  rapid-loss input chain.
- RECOMMENDED FOUNDER RULING: rule D92-11 as its own scheduled batch
  (cloud flag row + writer + the two cloud readers become real),
  sequenced AFTER the migration batch this release plan already
  stages, so the schema change rides an established process. Until
  then the release note for support should record the reinstall
  limitation.

## R-3 — Body-Metrics-only weigh-ins invisible to rapid-loss gates

- CURRENT RISK: false-negative gap for users who weigh in ONLY via
  Body Metrics. Locked record (dd67bbf4 revert + pinned guard) FORBIDS
  the merge without a founder ruling. Unchanged by Campaigns 1-6
  (R-8's Home-row edit path narrowed the gap's edge).
- CAN NEXT VERSION SHIP? YES — same posture as live; the update
  neither widens nor narrows the gap materially.
- RECOMMENDED FOUNDER RULING: rule the merge question on its own
  evidence (the D97-23 record); if ruled IN, it is a small client
  change safe for the release after next.

## R-18 — FFM-floor weight input can be enrolment-day stale

- CURRENT RISK: the floor computes from profile weight, which a user
  who gained weight may never have updated → floor set LOW (more
  conservative for losers, less for gainers). Unchanged by the delta.
- CAN NEXT VERSION SHIP? YES — identical behaviour to live. The floor
  itself (30 kcal/kg FFM) and both calorie floors are untouched and
  pinned by the full Campaign 1-6 suites.
- RECOMMENDED FOUNDER RULING: recommendation (a) from the triage —
  refresh the floor's weight input from recent morning weigh-ins.
  Floor INPUT is Section 2, so it stays founder-gated; it is a small,
  testable change once ruled.

## RB6-2 safety half — gap-spanning rapid-loss comparator

- CURRENT RISK: computeWeeklyTrendPct / rapid-loss / robust deltas
  still read a gap-spanning delta after a long absence (they treat the
  last comparator at ANY age as "a week ago"). Direction of error is
  MIXED but the protective reading (a large apparent drop over a gap
  still trips the rapid-loss gate) argues for leaving it until ruled -
  gating on freshness could SUPPRESS a real warning. That is exactly
  why Campaign 6 fixed only the claim wording and left the safety path
  to the founder.
- CAN NEXT VERSION SHIP? YES — the safety path is byte-identical to
  live; only the label wording changed (true at any age).
- RECOMMENDED FOUNDER RULING: the three-way fork recorded in the
  weeklyCoach s1 feeder comment; the lead's note: option (holding the
  s1 stage at data_hold when the comparator is stale) is the most
  conservative of the three and consistent with R-1's data-hold
  precedent, but it is the founder's call because it changes when the
  ED-adjacent stage runs.

## Verdict

None of the four blocks the next update. All four remain open founder
rulings, each with a concrete recommended shape. No stealth changes
were made.
