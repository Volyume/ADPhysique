# Phase 5 proposal-agent brief — Volyume Ultimate Audit (2026-06-13)

You draft precise, buildable proposals for your cluster from ALREADY-PRODUCED,
already-sourced documents. No new web research. READ-ONLY (no code changes). The
goal: blueprints so precise Claude Code cannot misinterpret or guess.

## Sources (read all your dispatch names, in full)
- The Phase-3 comparison fragment(s) `phase3/compare-NN-*.md` for your cluster
  (the gaps/leads/lags, already status-carried).
- The Phase-1 inventory fragment(s) `phase1/*.md` for your cluster (file:line +
  resolved px — your blueprint cites these for the EXACT files/components/lines).
- (Optional, for a source URL) the matching `phase2/research-NN-*.md`.

## Traceability rules (non-negotiable)
- Every proposal must trace to a finding in the comparison/research. In THE
  EVIDENCE, give the source + its status. If a proposal rests on a PARTIAL or
  NOT-FOUND finding, SAY SO in VERIFICATION and mark it "evidence-thin".
- Every implementation detail must come from the Phase-1 inventory (cite the
  file:line), not from assumption. If you don't know an implementation fact,
  write "NOT DETERMINED IN CODE — confirm before building". Do NOT invent file
  names, components, or line numbers.
- Respect SACRED constraints: deterministic engine (no AI/LLM), ED-safety system
  untouched, billing unchanged without sign-off, free/Pro gating. If a proposal
  touches any of these, flag it "FOUNDER-GATE" and treat it as input only.
- British English. Dual-audience: NEWBIE and ATHLETE experience stated separately.

## Proposal block (use exactly; one per proposal)
```
ID: U-<CLUSTER>-<n>            (e.g. U-A-1 — the dispatcher renumbers to ULTIMATE-NNN later)
AREA:
TITLE:                        (one precise line)
SUGGESTED TIER: 1 Critical / 2 High / 3 Medium / 4 Enhancement   (dispatcher finalises globally)
IMPACT (1-10):                — justification from user-research evidence
EFFORT (1-10):                — justification from the code reality (cite Phase-1)
CURRENT STATE:                (what Volyume has now — Phase-1 file:line)
THE PROBLEM:                  (what's wrong/missing; newbie impact + athlete impact; evidence + status)
THE EVIDENCE:                 (sources + statuses; flag PARTIAL/NOT-FOUND)
BEST REFERENCE IMPLEMENTATION:(the app that does it best + why + source)
PROPOSED SOLUTION:            (the actual thing, not a direction)
NEWBIE EXPERIENCE:
ATHLETE EXPERIENCE:
IMPLEMENTATION BLUEPRINT:     (precise: exact screens/files/components from Phase-1 with file:line;
                               navigation placement; gating; empty/loaded/error states; edge cases;
                               nothing left to interpretation. Mark NOT DETERMINED items explicitly.)
VERIFICATION:                 (all-VERIFIED, or which parts are PARTIAL/NOT-FOUND/FOUNDER-GATE)
```

## Output
Write to the `phase5/proposals-<CLUSTER>-*.md` path your dispatch gives you.
Return ONLY a 3-line status: proposals written (n), any FOUNDER-GATE/evidence-thin
ones, any NOT-DETERMINED implementation facts flagged.
