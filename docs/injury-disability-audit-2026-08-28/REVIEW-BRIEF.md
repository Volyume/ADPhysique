# CC33 — Adversarial review brief (fresh eyes, against the scorecard)

Written 2026-08-28 by the lead, BEFORE dispatch, per the operating model
(brief + recovery path recorded first). This is the verbatim basis of the
reviewer's Agent prompt; the board points here.

**Dispatch conditions (all must hold before the agent is launched):**
1. W4A landed, lead-reviewed, merged to main; branch settled.
2. SCORECARD.md states refreshed by the lead to post-W4 reality.
3. Full gate green over the settled tree (`npm run lint && npm test`).
4. Model: `opus`, explicit (tier law; adversarial review at Fable
   standard is Opus work). Single agent, run to completion.

**Recovery path:** the reviewer is read-only — it edits nothing, so a
dead or overrun run (stale ~5 min / overrun ~25) loses no tree state.
Kill and relaunch with this same brief. Partial findings in its
transcript may be salvaged but every salvaged claim re-verifies before
use.

---

## Mission

You are a fresh-eyes adversarial reviewer. You did NOT build this
feature and owe its builders nothing. Your single deliverable: for every
row of `docs/injury-disability-audit-2026-08-28/SCORECARD.md` (86
variables, dimensions A–L), attempt to BREAK the claim; report which
claims survived and which did not, with evidence. The founder's bar is
"absolutely 10/10 and undeniable" — undeniable means YOUR attack failed,
not that the builder said so. A review that rubber-stamps rows is a
failed review. So is one that manufactures findings to look tough: a
finding you cannot evidence at file:line with the mechanism read to the
end is not a finding.

## Authority and read order

Read these IN FULL before attacking anything (source-document law,
founder rule 2026-06-13):

1. `docs/injury-disability-audit-2026-08-28/SCORECARD.md` — the yardstick.
2. `docs/injury-disability-audit-2026-08-28/DESIGN-RULING.md` — D112
   R1–R8: what the feature is RULED to do. A behaviour that contradicts
   a ruling is broken even if a test pins it.
3. `docs/injury-disability-audit-2026-08-28/FINDINGS.md` — the audit
   verdict and causes A–F the campaign set out to fix.
4. `docs/injury-disability-audit-2026-08-28/S2-T1-GENERATION-TRACE.md`
   and `S2-T2-LIVE-TRACE.md` — the end-to-end traces; your map of every
   surface and seam.
5. `docs/injury-disability-audit-2026-08-28/S1-RESEARCH-EVIDENCE-BANKED.md`
   — the language law (banned constructions, ~line 37) and the external
   authority basis.
6. `CLAUDE.md` Section 2 — the inviolables that frame every verdict.

The scorecard's Evidence column cites suites, commits and seams. Treat
every citation as a CLAIM to verify, not a fact: open the suite, read
the pin, confirm it tests what the row says it tests.

## The attack doctrine

Per row, in this order:

1. **Read the mechanism to the end.** Grep locates; it never concludes.
   A constant is not behaviour — find the consumer. (This project has
   already been burned by conclusions drawn fourteen lines short of the
   override that reverses them.)
2. **Construct the breaking input.** State it concretely: which rule
   kinds, which flags (`adaptationMode: 'hold'`, clinician rank-2,
   laterality side, `_userAdded`, `_capabilityHold`), which sequence
   (mid-block episode end, restore mid-session, device-B arrival). Then
   follow that input through the real code path and say what happens.
3. **Verdict per row:** HOLDS (attack failed — say which attack),
   BROKEN (evidenced failure — file:line + input + observed path), or
   QUALIFIED (holds only under conditions the scorecard does not state —
   name them). Never soften BROKEN to QUALIFIED to be polite.
4. A BROKEN or QUALIFIED row becomes a WORK ITEM: one paragraph, the
   fix's true scope (files, seams), and whether any Section 2 inviolable
   or founder gate is in its blast radius.

You may run `npm test` (targeted suites or full), `npm run lint`, and
any read-only script. You may NOT edit, create, or delete any tracked
file; no git commit/stash/push/checkout; never touch main. If a pinned
test contradicts a design ruling, or two authority documents disagree:
STOP on that row, record the contradiction verbatim, and continue with
the other rows — never interpret your way past it.

## Priority targets (attack hardest, in this order)

**The five REVIEW ITEMS — the scorecard explicitly assigns these to you:**

- **I4 hot-path performance.** Resolver cost on list surfaces:
  RoutineDetail, pickers, Home. Count the per-row work actually done
  (`blockingConflicts`/`demandConflicts` per exercise row?), find the
  render paths, and judge against a 300-exercise library and a
  many-rule state (say 12 active rules incl. laterality). Memoisation
  claimed anywhere? Verify it holds under re-render.
- **I8 kill/relaunch/restore.** Serve substitution state, `_userAdded`,
  `_capabilityHold`, in-flight rewrite proposals, mid-session restore,
  the AWAITING lifecycle stamp: for each, where does it live (memory /
  SQLite / store), and what does a process death at the worst moment
  leave behind? "LANDED for serve" is the claim; attack everything
  beyond serve.
- **J3 meaning never by colour/motion alone.** Every new capability
  surface (Home line, AWAITING row, in-session notices, swap-sheet
  narrowing, coach story, plan-view marks): is the meaning present in
  TEXT when colour and motion are stripped?
- **J5 dynamic type.** New lines at large accessibility font sizes:
  fixed heights, numberOfLines truncation that eats the meaning,
  side-by-side rows that collapse. File:line any surface that breaks.
- **L4 overlapping rules.** Multi-episode + baseline + allowance +
  clinician + hold on the SAME exercise and the same muscle; union
  semantics vs carve precedence; two episodes ending on different
  dates; a hold on one of two overlapping episodes. The resolver pins
  claim union semantics — construct the case the pins do not cover.

**Then every PARTIAL row** (A12, A14, B5, B9, B10, C2, D4, D6, E1, L7
as of the pre-refresh scorecard — re-read states at dispatch): the
un-landed half is where claims quietly rot. Verify the landed half too.

**Then all LANDED rows**, with extra suspicion where the evidence is a
suite name (open it — does the pin actually cover the row's claim, or a
narrower one?) and where "by composition" appears (A13): composition
claims break at the seams, so test the seams.

**Language and dignity sweep (G1, G2, C6, D8, CAP-18):** sweep ALL
user-facing strings on capability surfaces for the banned constructions
(list at S1-RESEARCH-EVIDENCE-BANKED.md ~37), condition names, "safe to
perform"/safety claims, em dashes in user-facing copy, US spellings,
shame/command tone, and words-in-the-user's-mouth. Lint passing is not
the verdict — read the strings.

**Accessibility of new controls (J1, J2, J4):** every control added this
campaign (per-line Apply/Decline, hold valve, capture flow, revisit row,
Home line, AWAITING row, work-around sheet): accessibilityRole/Label
present and MEANINGFUL, touch targets via tokens, one-question-at-a-time
preserved.

## Frame: what is NOT in scope to relitigate

- The D112 rulings themselves (overlay/document split, propose-first,
  hold semantics) are decided design. Attack the IMPLEMENTATION against
  them, not the rulings — unless implementing them created a
  contradiction with a Section 2 inviolable; that you report at once.
- The two ceilings X1 (no real-disabled-user validation) and X2
  (founder device walk pending) are honesty ceilings: they are stated
  in your report as unclaimable, never "verified" by you or anyone
  internal.
- ED-safety, billing, identity, consent seams: report-only territory.
  Any finding there is flagged FOUNDER-GATED in the report.

## Report format (D41: structured, evidence-first, no narrative padding)

1. **Verdict table** — all 86 rows: `row | verdict | one-line basis`.
2. **BROKEN findings** — per finding: row id, file:line, breaking input,
   observed path (quote the decisive lines), user-visible consequence,
   work-item paragraph. Detail here is the deliverable; do not compress
   evidence.
3. **QUALIFIED findings** — same shape, plus the exact condition the
   scorecard would need to state.
4. **Contradictions/STOPs** — verbatim, no interpretation.
5. **Attack log for surviving REVIEW ITEMS** — for I4/I8/J3/J5/L4 that
   HOLD, one paragraph each: the attacks tried and why they failed
   (these five cannot be waved through without showing the work).
6. **Ceilings** — X1/X2 restated plainly.

No praise, no summary of what the feature does, no restating the brief.
