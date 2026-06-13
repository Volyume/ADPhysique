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
All 15 fragments present in `phase2/research-01..15-*.md` (Phase 2 COMPLETE). Plus
`ultimate-audit-01-workout-screen-proposal.md` (Agent 1, code-grounded).
Each fragment: 30–55 apps, honest VERIFIED/PARTIAL/NOT-FOUND with source URLs.
LIMITATION (surfaced to founder, decision OPEN): **reddit.com is BLOCKED in this
environment** — confirmed by direct test + all 15 agents. Reddit-derived sentiment
is marked PARTIAL via secondary sources throughout; NO fabrication. Founder to
decide: accept PARTIAL Reddit sourcing, or top up Reddit verbatims later from an
allowed network. This does NOT block synthesis (PARTIAL flags carry through).

## Phases 3–6 — DONE & committed
3. `ultimate-audit-02-master-comparison.md` (2.3k lines, 15 areas reconciled).
4. `ultimate-audit-03-navigation-proposals.md` (nav restructure + Day1/14/60 + dual-audience).
5. `ultimate-audit-04-proposals-with-blueprints.md` (70 proposals, global Tier 1–4 index,
   cross-cluster merges M1–M8, build order). Source bodies in `phase5/proposals-*.md`.
6. `ultimate-audit-00-executive-summary.md`.
**AUDIT COMPLETE.** Built entirely on Opus 4.8 (Fable disabled); Reddit blocked → user
sentiment PARTIAL/secondary throughout; no fabrication (every claim status-tagged).

## What the FOUNDER now decides (nothing below builds autonomously)
- **FOUNDER-GATE proposals** (touch engine / `src/coaching/safety/` / billing / locked docs /
  no-AI): ULTIMATE-017,018,019,020,021,022 + several Tier-3/4 (U-A-5, U-C-3, U-G-3/5/6, U-D-8/9,
  nav locked-tab items). Route safety items to the safety owner, billing to billing.
- **Reddit top-up:** accept PARTIAL secondary sourcing, or re-run sentiment from a Reddit-reachable
  network and fold in.
- **Re-audit with Fable** when it is reinstated (standing founder instruction).
- **Build sequencing:** see the executive summary's recommended order (quick wins → Tier-1 on-ramp →
  founder-decision batch → rest). NOT-DETERMINED implementation facts in each blueprint must be
  confirmed in code before building (the edit-gate enforces a cited spec at build time).

## Guardrails active (do not bypass)
Edit-gate `.claude/hooks/edit-gate.sh` + commit-gate `.githooks/pre-commit`: app-code
edits (src/, supabase/) need a grep-verified verbatim quote from a spec file in
`.claude/edit-gate`. This audit is READ-ONLY — no code changes.
