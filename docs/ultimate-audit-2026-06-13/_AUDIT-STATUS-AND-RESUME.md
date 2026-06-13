# Ultimate Audit 2026-06-13 — status & resume marker

Points to SOURCE files; not a substitute for them (founder rule 2026-06-13). A
resuming session READS the files named below — it does not synthesise from this note.

## Spec
Founder "ULTIMATE AUDIT" prompt (chat transcript, 2026-06-13), Phases 1–6.
Phase-1 agent brief: `phase1/_FORMAT.md`. Phase-2 brief: `phase2/_RESEARCH-FORMAT.md`.

## Model (verified)
- Fable 5 GLOBALLY DISABLED by US gov export-control directive (source fetched:
  anthropic.com/news/fable-mythos-access). All other models unaffected.
- FOUNDER DECISION: run on Opus 4.8 (`model:"opus"`) for all agents.
- FOUNDER INSTRUCTION: when Fable returns, RE-AUDIT + improve with Fable.

## Phase 1 — DONE & committed
`ultimate-audit-00-volyume-complete-inventory.md` (6.8k lines: 78 screens + 68
components, file:line-grounded) and `ultimate-audit-00-navigation-psychology.md`.
Fragments in `phase1/`.

## Phase 2 — research, DONE & committed (Opus, web)
14 of 15 fragments in `phase2/research-01..15-*.md`; **research-12-feature-gaps
RELAUNCHED** (original stalled) — verify it lands. Plus
`ultimate-audit-01-workout-screen-proposal.md` (Agent 1, code-grounded).
Each fragment: 30–55 apps, honest VERIFIED/PARTIAL/NOT-FOUND with source URLs.
LIMITATION (surfaced to founder, decision OPEN): **reddit.com is BLOCKED in this
environment** — confirmed by direct test + all 15 agents. Reddit-derived sentiment
is marked PARTIAL via secondary sources throughout; NO fabrication. Founder to
decide: accept PARTIAL Reddit sourcing, or top up Reddit verbatims later from an
allowed network. This does NOT block synthesis (PARTIAL flags carry through).

## Phases 3–6 — PENDING (do HANDS-ON, area-by-area, paced; this is the judgement work)
Read each source as you synthesise its section — do not hold all at once, do not skim.
3. `ultimate-audit-02-master-comparison.md` — per area: VOLYUME CURRENT (from the
   Phase-1 inventory section) vs BEST-IN-CLASS + TOP-50 RANGE + NEWBIE/ATHLETE
   verdicts + WHERE WE LEAD/LAG + MISSING + USER SENTIMENT + VERIFICATION STATUS,
   reading the matching `phase2/research-NN-*.md` for each.
4. `ultimate-audit-03-navigation-proposals.md` — from `ultimate-audit-00-navigation-
   psychology.md` + research-10 + research-13 + research-15.
5. `ultimate-audit-04-proposals-with-blueprints.md` — the precise blueprints
   (ULTIMATE-NNN), tiered, each traceable to a VERIFIED finding; "Claude Code cannot
   misinterpret" precision. Mark any PARTIAL/Reddit-only support explicitly.
6. `ultimate-audit-00-executive-summary.md` — written LAST.
NB Phases 3–6 are large; pace in committed installments + update THIS marker after
each section so it stays continuable across context compaction.

## Guardrails active (do not bypass)
Edit-gate `.claude/hooks/edit-gate.sh` + commit-gate `.githooks/pre-commit`: app-code
edits (src/, supabase/) need a grep-verified verbatim quote from a spec file in
`.claude/edit-gate`. This audit is READ-ONLY — no code changes.
